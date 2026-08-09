import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { generateArtifact } from "./engine.js";
import { trackDir } from "./specLoader.js";
import { hasGenerator } from "./generators/index.js";

const STOPWORDS = new Set([
  "the", "and", "with", "from", "that", "this", "into", "onto", "over",
  "per", "for", "a", "an", "of", "to", "in", "on", "at", "as", "is",
  "are", "one", "two", "three", "four", "five", "six", "seven", "eight",
  "vs", "or", "plus", "than", "then", "off", "not", "each",
]);

/**
 * Extract "significant" tokens from a planted_feature description: words of
 * 4+ letters (skipping stopwords) plus number-ish tokens (dollar amounts,
 * percentages, section numbers, statute cites). This is a heuristic, not a
 * parser -- planted_feature strings are free-text prose written for humans.
 */
export function significantTokens(feature) {
  const tokens = feature.match(/[A-Za-z][A-Za-z'-]{3,}|\d[\d,.]*%?|\bL\d{3}\b|\bE\d{3}\b/g) ?? [];
  const seen = new Set();
  const out = [];
  for (const raw of tokens) {
    const t = raw.toLowerCase();
    if (/^[a-z]/.test(t) && STOPWORDS.has(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(raw);
  }
  return out;
}

/**
 * Heuristic keyword check for one drafted-frozen planted_feature against a
 * markdown source's text. PASS if most significant tokens are present
 * (case-insensitive), WARN otherwise -- this can never definitively say a
 * feature is absent, only that it could not confirm it, so it reports
 * PASS/WARN rather than PASS/FAIL.
 */
export function checkPlantedFeature(feature, sourceText) {
  const tokens = significantTokens(feature);
  if (tokens.length === 0) {
    return { feature, status: "WARN", reason: "no checkable keywords extracted from feature text", matched: [], missing: [] };
  }
  const haystack = sourceText.toLowerCase();
  const matched = [];
  const missing = [];
  for (const token of tokens) {
    if (haystack.includes(token.toLowerCase())) matched.push(token);
    else missing.push(token);
  }
  const ratio = matched.length / tokens.length;
  const status = ratio >= 0.6 ? "PASS" : "WARN";
  return { feature, status, matched, missing, ratio };
}

/**
 * Validate a drafted-frozen spec: find markdown source(s) under
 * artifacts/<ID>/ (top level only -- not build/), run the keyword heuristic
 * for every planted_feature against the concatenated source text.
 */
export function validateDrafted({ root, spec }) {
  const dirPath = join(root, "artifacts", spec.id);
  if (!existsSync(dirPath)) {
    return { id: spec.id, kind: "drafted", status: "MISSING", reason: `no artifacts/${spec.id}/ directory on disk`, results: [] };
  }
  const mdFiles = readdirSync(dirPath, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => e.name)
    .sort();
  if (mdFiles.length === 0) {
    return { id: spec.id, kind: "drafted", status: "MISSING", reason: `artifacts/${spec.id}/ has no .md source files`, results: [] };
  }
  const combinedText = mdFiles.map((f) => readFileSync(join(dirPath, f), "utf8")).join("\n\n");
  const results = spec.planted_features.map((feature) => checkPlantedFeature(feature, combinedText));
  const status = results.every((r) => r.status === "PASS") ? "PASS" : "WARN";
  return { id: spec.id, kind: "drafted", status, sourceFiles: mdFiles, results };
}

/**
 * Validate a deterministic spec: regenerate it and diff every file's
 * content byte-for-byte against what's committed under datasets/<track>/<name>/.
 */
export function validateStructured({ root, spec, canon }) {
  if (!hasGenerator(spec.id)) {
    return { id: spec.id, kind: "structured", status: "SKIP", reason: "NOT_IMPLEMENTED: no generator registered" };
  }
  const track = trackDir(spec.id);
  const dirPath = join(root, "datasets", track, spec.name);
  if (!existsSync(dirPath)) {
    return { id: spec.id, kind: "structured", status: "MISSING", reason: `no datasets/${track}/${spec.name}/ directory on disk -- run 'generate ${spec.id}' first` };
  }

  const regenerated = generateArtifact(spec, canon);
  const fileResults = [];
  for (const file of regenerated) {
    const committedPath = join(dirPath, file.path);
    if (!existsSync(committedPath)) {
      fileResults.push({ path: file.path, status: "MISSING" });
      continue;
    }
    const committed = readFileSync(committedPath, "utf8");
    fileResults.push({ path: file.path, status: committed === file.content ? "MATCH" : "DIFF" });
  }
  const status = fileResults.every((f) => f.status === "MATCH") ? "PASS" : "FAIL";
  return { id: spec.id, kind: "structured", status, files: fileResults };
}

export function validateOne({ root, spec, canon }) {
  return spec.generation === "drafted-frozen"
    ? validateDrafted({ root, spec })
    : validateStructured({ root, spec, canon });
}

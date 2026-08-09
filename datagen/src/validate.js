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

  // Spec narration. These describe the artifact *to the spec's reader* -- how
  // many files it ships as, what the author was aiming at -- rather than naming
  // anything a drafted document could contain. Counting them as evidence only
  // manufactures WARNs. Two tiers, by strength of evidence:
  //
  // (a) Never appear in the drafted corpus at all (0 occurrences across all 11
  //     artifact sets). A document does not call itself a "variant"; that word
  //     describes the sibling files a spec ships (mutual-nda-unilateral.md etc).
  "variant", "variants",
  // (b) Do occur in drafted prose as ordinary legal vocabulary -- "Tenant
  //     properly exercises a Renewal Option" (LGL-03), "deliberately
  //     non-specific" (LGL-09) -- but only ever coincidentally. When a *spec*
  //     writes them it is narrating intent ("deliberately distinct from a cap")
  //     or lesson design ("for tiering exercises"), so a match on them is never
  //     evidence that the planted feature was drafted. This tier is the
  //     judgment call; drop it if you want only tier (a). Note the singular
  //     "exercise" is deliberately NOT here -- the legal verb is real content.
  "deliberately", "exercises",
]);

/**
 * Extract "significant" tokens from a planted_feature description: words of
 * 4+ letters (skipping stopwords) plus number-ish tokens (dollar amounts,
 * percentages, section numbers, statute cites). This is a heuristic, not a
 * parser -- planted_feature strings are free-text prose written for humans.
 */
export function significantTokens(feature) {
  // Specs may express a feature as a string or as a one-entry mapping of
  // section -> description (CORE-05 does this); flatten mappings to text.
  const text = typeof feature === "string"
    ? feature
    : Object.entries(feature).map(([k, v]) => `${k}: ${v}`).join(" ");
  const tokens = text.match(/[A-Za-z][A-Za-z'-]{3,}|\d[\d,.]*%?|\bL\d{3}\b|\bE\d{3}\b/g) ?? [];
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
 * Separator a hyphenated phrase may span in the source: spaces, tabs and
 * hyphens only, and at most a few of them. Deliberately excludes newlines and
 * every other punctuation mark, because those are structure rather than
 * spacing -- a sentence end, a paragraph break, a table cell wall, a list
 * bullet, or the "\n\n" join validateDrafted uses to concatenate every .md in
 * an artifact directory. Two words either side of one of those are not a
 * phrase, and without this bound "consequential-damages" is satisfied by a
 * document whose first file ends "...and consequential" while the next begins
 * "Damages Schedule".
 */
const PHRASE_SEPARATOR = "[ \\t-]{0,3}";

/**
 * Does one significant token appear in the (already lowercased) source text?
 *
 * Plain tokens are a straight substring test, unchanged. The tokenizer emits
 * three shapes of token containing a separator, and only one of them is a
 * phrase:
 *
 *  1. Alpha hyphen compounds -- "consequential-damages", "governing-law",
 *     "residual-knowledge". These ARE phrases, and drafted prose almost never
 *     reproduces the spec's punctuation: the document says "Waiver of
 *     Consequential Damages". Comparing literally reports the feature as
 *     unconfirmed purely because of a hyphen, so these also match when their
 *     parts appear in order and adjacent in the source.
 *  2. Possessives -- "requester's", "else's". The "'s" is a suffix, not a
 *     phrase part. Splitting on it would degrade the token to "requester
 *     followed by any s-word" ("requester shall", "requester submits"), so
 *     only hyphens split a token and possessives fall through to the literal
 *     test.
 *  3. Numbers carrying commas or decimal points -- "50,000", "0.5", "4.60".
 *     Those marks are not separators either; treating them as such lets "0.5"
 *     be confirmed by a pipe-table row "| 0 | 5 |". Guarded by requiring a
 *     letter, which also keeps a future numeric-range token out of this path.
 *
 * Phrase matching stays phrase-shaped on purpose: it is not a bag-of-words
 * check, so a document that merely mentions "consequential" in one section and
 * "damages" in another does not satisfy the token. Both ends are anchored to a
 * word boundary, so a compound matches neither a word's tail ("system
 * arrangement" does not confirm "M-ARR") nor a word's head ("opt outsourcing"
 * does not confirm "opt-out"). The cost of anchoring the right side is that a
 * spec abbreviation no longer matches the word it abbreviates -- write
 * "confidential-information", not "confidential-info".
 */
function tokenAppearsIn(token, haystack) {
  const needle = token.toLowerCase();
  if (haystack.includes(needle)) return true;
  if (!/[a-z]/.test(needle)) return false;
  // Only a hyphen separates phrase parts. Parts therefore hold letters, digits
  // and apostrophes -- none of which are regex metacharacters, so the pattern
  // below needs no escaping.
  const parts = needle.split("-").filter(Boolean);
  if (parts.length < 2) return false;
  return new RegExp(
    `(?:^|[^a-z0-9])${parts.join(PHRASE_SEPARATOR)}(?![a-z0-9])`
  ).test(haystack);
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
    if (tokenAppearsIn(token, haystack)) matched.push(token);
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

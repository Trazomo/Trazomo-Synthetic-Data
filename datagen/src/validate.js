import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { generateArtifact } from "./engine.js";
import { trackDir } from "./specLoader.js";
import { hasGenerator } from "./generators/index.js";

export class AllowlistValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "AllowlistValidationError";
  }
}

const ALLOWLIST_FIELDS = ["artifact", "feature", "reason"];

/**
 * Load the permanent-WARN allowlist (datagen/validate-allowlist.yaml).
 *
 * Some planted features are real, drafted, and permanently unconfirmable by a
 * keyword heuristic -- a deliberately-broken training document cannot label its
 * own defects, and a cross-track pointer names another track's artifact rather
 * than anything in this one. Those would otherwise WARN forever, and a warning
 * that never goes away trains people to ignore the warnings that matter.
 *
 * Every entry must name the artifact, quote the planted_feature verbatim, and
 * give a reason. The reason is required because an allowlist without one is
 * just a silencer: six months on, nobody can tell an accepted limitation from
 * a bug somebody hid. Entries are checked for staleness on every run -- see
 * evaluateAllowlist.
 *
 * An absent file is an empty allowlist, not an error, so fixture universes
 * pointed at by --root need no allowlist of their own.
 */
export function loadAllowlist(allowlistPath) {
  if (!existsSync(allowlistPath)) return [];
  const doc = yaml.load(readFileSync(allowlistPath, "utf8"));
  if (doc == null || doc.allowed == null) return [];
  if (!Array.isArray(doc.allowed)) {
    throw new AllowlistValidationError(
      `${allowlistPath}: expected a top-level "allowed:" list, found ${typeof doc.allowed}`
    );
  }
  return doc.allowed.map((entry, index) => {
    for (const field of ALLOWLIST_FIELDS) {
      const value = entry?.[field];
      if (typeof value !== "string" || value.trim() === "") {
        throw new AllowlistValidationError(
          `${allowlistPath}: allowed[${index}] needs a non-empty "${field}". Every entry must say `
          + `which artifact and which planted_feature it covers, and why that miss is expected.`
        );
      }
    }
    return { artifact: entry.artifact, feature: entry.feature, reason: entry.reason };
  });
}

/**
 * Find allowlist entries that no longer describe anything true, so they fail
 * loudly instead of silently outliving the problem they documented. Three ways
 * an entry goes stale: it names an artifact the catalog no longer has, it
 * quotes a planted_feature that spec no longer contains (someone reworded the
 * spec -- which is exactly the fix these entries are waiting for), or the
 * feature now passes the heuristic on its own.
 *
 * Only specs actually validated in this run are judged, so `validate CORE-01`
 * never fails over an untouched LGL-02 entry. A bad artifact id is caught
 * either way, since that needs no run to detect.
 */
export function evaluateAllowlist({ allowlist = [], specs = [], resultsById = new Map() }) {
  const byId = new Map(specs.map((s) => [s.id, s]));
  const stale = [];
  for (const entry of allowlist) {
    const spec = byId.get(entry.artifact);
    if (!spec) {
      stale.push({ entry, problem: `artifact "${entry.artifact}" is not in the spec catalog` });
      continue;
    }
    const result = resultsById.get(entry.artifact);
    if (!result) continue;
    if (!(spec.planted_features ?? []).some((f) => f === entry.feature)) {
      stale.push({ entry, problem: `no planted_feature in ${entry.artifact} matches this text` });
      continue;
    }
    const featureResult = (result.results ?? []).find((r) => r.feature === entry.feature);
    if (!featureResult) continue;
    if (featureResult.status === "PASS") {
      stale.push({ entry, problem: "no longer needed -- the feature now passes on its own" });
    }
  }
  return stale;
}

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
export function validateDrafted({ root, spec, allowlist = [] }) {
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
  const results = spec.planted_features.map((feature) => {
    const result = checkPlantedFeature(feature, combinedText);
    if (result.status === "PASS") return result;
    const entry = allowlist.find((e) => e.artifact === spec.id && e.feature === feature);
    return entry ? { ...result, status: "ALLOWED", allowReason: entry.reason } : result;
  });
  // An accepted, documented limitation is not an open question, so a spec whose
  // only misses are allowlisted reports PASS. One unexplained miss still WARNs.
  const status = results.every((r) => r.status === "PASS" || r.status === "ALLOWED") ? "PASS" : "WARN";
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

export function validateOne({ root, spec, canon, allowlist }) {
  return spec.generation === "drafted-frozen"
    ? validateDrafted({ root, spec, allowlist })
    : validateStructured({ root, spec, canon });
}

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { trackDir } from "./specLoader.js";

/**
 * Regenerate MANIFEST.json's "datasets" and "artifacts" sections from what
 * is actually present on disk under `datasets/` and `artifacts/`, cross
 * referenced against the spec catalog. Never invents an entry for a spec
 * whose files are not on disk -- MANIFEST.json should always be trustworthy
 * ("check MANIFEST.json for what is actually present", per AGENTS.md).
 *
 * @param {object} params
 * @param {string} params.root repo root (or fixture root) all paths resolve under
 * @param {{artifacts: object[], byId: Map}} params.specs loaded specs
 * @param {object} params.existingManifest current MANIFEST.json contents (to preserve top-level keys)
 * @returns {object} the new MANIFEST.json contents
 */
export function buildManifest({ root, specs, existingManifest }) {
  const datasets = [];
  const artifacts = [];

  for (const spec of specs.artifacts) {
    if (spec.generation === "deterministic") {
      const entry = describeDataset(root, spec);
      if (entry) datasets.push(entry);
    } else if (spec.generation === "drafted-frozen") {
      const entry = describeArtifact(root, spec);
      if (entry) artifacts.push(entry);
    }
  }

  return {
    ...existingManifest,
    datasets,
    artifacts,
  };
}

function describeDataset(root, spec) {
  let track;
  try {
    track = trackDir(spec.id);
  } catch {
    return null;
  }
  const dirPath = join(root, "datasets", track, spec.name);
  if (!existsSync(dirPath)) return null;

  const files = listFilesRecursive(dirPath).sort();
  const rowCounts = {};
  for (const file of files) {
    const abs = join(dirPath, file);
    if (file.endsWith(".csv")) {
      rowCounts[file] = countCsvDataRows(abs);
    } else if (file.endsWith(".jsonl")) {
      rowCounts[file] = countJsonlRecords(abs);
    }
  }

  const entry = {
    id: spec.id,
    name: spec.name,
    track,
    type: spec.type,
    format: spec.format,
    generation: spec.generation,
    path: relative(root, dirPath),
    files,
    row_counts: rowCounts,
  };

  // Declared variants get their own manifest entry, carrying the derivation rule
  // a consumer needs in order to know this file is a slice of a sibling rather
  // than an independent dataset. Only variants actually on disk are listed, the
  // same trustworthiness rule the rest of this module follows. The file also
  // stays in `files` and `row_counts`, so a consumer that has never heard of
  // variants still sees it.
  const variants = [];
  for (const variant of spec.variants ?? []) {
    if (!files.includes(variant.file)) continue;
    variants.push({
      name: variant.name,
      file: variant.file,
      derived_from: variant.derived_from,
      rule: variant.rule,
      row_count: rowCounts[variant.file] ?? null,
    });
  }
  if (variants.length > 0) entry.variants = variants;

  return entry;
}

function describeArtifact(root, spec) {
  const dirPath = join(root, "artifacts", spec.id);
  if (!existsSync(dirPath)) return null;

  const buildDir = join(dirPath, "build");
  const allFiles = listFilesRecursive(dirPath).sort();
  const sourceFiles = allFiles.filter((f) => !f.startsWith(`build${sepForManifest()}`));
  const buildFiles = existsSync(buildDir) ? listFilesRecursive(buildDir).sort() : [];

  return {
    id: spec.id,
    name: spec.name,
    type: spec.type,
    format: spec.format,
    generation: spec.generation,
    path: relative(root, dirPath),
    source_files: sourceFiles,
    build_files: buildFiles,
  };
}

function sepForManifest() {
  return "/";
}

function listFilesRecursive(dirPath, prefix = "") {
  const out = [];
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...listFilesRecursive(join(dirPath, entry.name), rel));
    } else if (entry.isFile()) {
      out.push(rel);
    }
  }
  return out;
}

function countCsvDataRows(absPath) {
  const text = readFileSync(absPath, "utf8");
  const lines = text.split("\n").filter((l) => l.length > 0);
  return Math.max(0, lines.length - 1); // minus header row
}

// A JSONL file is one record per line and carries no header, so the record
// count is the non-empty line count rather than that count less one. Without
// this, a feed like FIN-20 lands in MANIFEST.json with no count at all and a
// consumer cannot tell an empty feed from an unread one.
function countJsonlRecords(absPath) {
  const text = readFileSync(absPath, "utf8");
  return text.split("\n").filter((l) => l.trim().length > 0).length;
}

export class ManifestError extends Error {
  constructor(message) {
    super(message);
    this.name = "ManifestError";
  }
}

/**
 * Read back the ids MANIFEST.json says are actually present, so a caller can
 * check exactly those rather than the whole catalog. This is the input to
 * `validate --manifest`: the catalog is a plan, the manifest is the record of
 * what shipped, and only the second is something CI can hold to.
 *
 * Every failure here is hard. An absent manifest, a section that is not a list,
 * or a row with no string `id` all mean the caller cannot know what to check,
 * and quietly checking nothing is how a deleted dataset ships green. An absent
 * section is not a failure: a repo with no drafted artifacts has no "artifacts"
 * to list.
 *
 * @param {string} manifestPath absolute path to MANIFEST.json
 * @returns {{datasets: string[], artifacts: string[]}}
 */
export function manifestIds(manifestPath) {
  if (!existsSync(manifestPath)) {
    throw new ManifestError(`${manifestPath} does not exist. Run \`datagen manifest\` and commit it.`);
  }
  let doc;
  try {
    doc = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (err) {
    throw new ManifestError(`${manifestPath} is not valid JSON: ${err.message}`);
  }
  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) {
    throw new ManifestError(`${manifestPath}: expected an object at the top level, found ${Array.isArray(doc) ? "an array" : typeof doc}`);
  }

  const out = { datasets: [], artifacts: [] };
  for (const section of ["datasets", "artifacts"]) {
    const rows = doc[section];
    if (rows === undefined) continue;
    if (!Array.isArray(rows)) {
      throw new ManifestError(`${manifestPath}: "${section}" is ${rows === null ? "null" : typeof rows}, expected a list`);
    }
    rows.forEach((row, index) => {
      const value = row?.id;
      if (typeof value !== "string" || value.trim() === "") {
        throw new ManifestError(`${manifestPath}: ${section}[${index}] has no "id" string`);
      }
      out[section].push(value);
    });
  }
  return out;
}

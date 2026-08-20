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

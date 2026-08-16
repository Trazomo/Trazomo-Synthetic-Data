import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { trackDir } from "./specLoader.js";

/**
 * The ids MANIFEST.json claims are built and committed: every entry of its
 * "datasets" and "artifacts" sections, in file order, deduplicated.
 *
 * This is the list `validate --manifest` checks. The spec catalog is a
 * roadmap (most of it is still unbuilt), so it cannot answer "did a committed
 * dataset just disappear". MANIFEST.json can: an entry exists only because
 * files were on disk when `manifest` last ran.
 *
 * A missing or malformed manifest throws rather than yielding an empty list.
 * Checking nothing is exactly how a CI job stays green over a repo that lost
 * its index.
 *
 * @param {string} manifestPath
 * @returns {string[]}
 */
export function manifestIds(manifestPath) {
  if (!existsSync(manifestPath)) {
    throw new Error(`no MANIFEST.json at ${manifestPath} -- run 'datagen manifest' first`);
  }
  const doc = JSON.parse(readFileSync(manifestPath, "utf8"));
  const ids = [];
  for (const section of ["datasets", "artifacts"]) {
    const entries = doc?.[section];
    if (entries == null) continue; // a universe with no drafted artifacts yet
    if (!Array.isArray(entries)) {
      throw new Error(`${manifestPath}: "${section}" must be a list, found ${typeof entries}`);
    }
    for (const [index, entry] of entries.entries()) {
      const id = entry?.id;
      if (typeof id !== "string" || id.trim() === "") {
        throw new Error(`${manifestPath}: ${section}[${index}] needs a non-empty string "id"`);
      }
      if (!ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

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
    if (file.endsWith(".csv")) {
      const abs = join(dirPath, file);
      const lineCount = countCsvDataRows(abs);
      rowCounts[file] = lineCount;
    }
  }

  return {
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

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildManifest, manifestIds, ManifestError } from "../../datagen/src/manifest.js";
import { loadSpecs } from "../../datagen/src/specLoader.js";

function makeSpecsFixture(dir) {
  const specsPath = join(dir, "artifact-specs.yaml");
  writeFileSync(
    specsPath,
    [
      "artifacts:",
      "  - id: LGL-97",
      "    name: fake-structured",
      "    type: dataset",
      "    format: csv",
      "    generation: deterministic",
      "    canon_entities: []",
      "    planted_features: []",
      "    consuming_modules: []",
      "  - id: LGL-98",
      "    name: fake-structured-not-generated",
      "    type: dataset",
      "    format: csv",
      "    generation: deterministic",
      "    canon_entities: []",
      "    planted_features: []",
      "    consuming_modules: []",
      "  - id: LGL-99",
      "    name: fake-drafted",
      "    type: contract",
      "    format: markdown",
      "    generation: drafted-frozen",
      "    canon_entities: []",
      "    planted_features: []",
      "    consuming_modules: []",
      "",
    ].join("\n")
  );
  return specsPath;
}

test("buildManifest only lists datasets/artifacts that actually exist on disk", () => {
  const root = mkdtempSync(join(tmpdir(), "datagen-manifest-test-"));
  try {
    const specsPath = makeSpecsFixture(root);
    const specs = loadSpecs(specsPath);

    // LGL-97 has files on disk; LGL-98 (also deterministic) does not.
    const datasetDir = join(root, "datasets", "legal", "fake-structured");
    mkdirSync(datasetDir, { recursive: true });
    writeFileSync(join(datasetDir, "rows.csv"), "a,b\n1,2\n3,4\n");

    // LGL-99 has a drafted source on disk.
    const artifactDir = join(root, "artifacts", "LGL-99");
    mkdirSync(artifactDir, { recursive: true });
    writeFileSync(join(artifactDir, "doc.md"), "# Title\n");
    mkdirSync(join(artifactDir, "build"), { recursive: true });
    writeFileSync(join(artifactDir, "build", "doc.docx"), "fake-docx-bytes");

    const manifest = buildManifest({ root, specs, existingManifest: { manifest_version: 1 } });

    assert.equal(manifest.manifest_version, 1);
    assert.equal(manifest.datasets.length, 1);
    assert.equal(manifest.datasets[0].id, "LGL-97");
    assert.equal(manifest.datasets[0].track, "legal");
    assert.deepEqual(manifest.datasets[0].files, ["rows.csv"]);
    assert.equal(manifest.datasets[0].row_counts["rows.csv"], 2);

    assert.equal(manifest.artifacts.length, 1);
    assert.equal(manifest.artifacts[0].id, "LGL-99");
    assert.deepEqual(manifest.artifacts[0].source_files, ["doc.md"]);
    assert.deepEqual(manifest.artifacts[0].build_files, ["doc.docx"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("buildManifest returns empty sections when nothing has been generated yet", () => {
  const root = mkdtempSync(join(tmpdir(), "datagen-manifest-test-"));
  try {
    const specsPath = makeSpecsFixture(root);
    const specs = loadSpecs(specsPath);
    const manifest = buildManifest({ root, specs, existingManifest: {} });
    assert.deepEqual(manifest.datasets, []);
    assert.deepEqual(manifest.artifacts, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("MANIFEST.json on disk matches a fresh buildManifest over the real repo (datasets and artifacts sections)", () => {
  const REPO_ROOT = join(import.meta.dirname, "..", "..");
  const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  const committed = JSON.parse(readFileSync(join(REPO_ROOT, "MANIFEST.json"), "utf8"));
  const fresh = buildManifest({ root: REPO_ROOT, specs, existingManifest: committed });
  assert.deepEqual(fresh.datasets, committed.datasets, "run `node datagen/src/cli.js manifest` and commit MANIFEST.json");
  assert.deepEqual(fresh.artifacts, committed.artifacts);
  for (const id of [
    "FIN-01", "FIN-02", "FIN-03", "FIN-22",
    "FIN-04", "FIN-05", "FIN-06", "FIN-07", "FIN-08", "FIN-09", "FIN-10", "FIN-11",
    "FIN-36", "FIN-37", "FIN-38", "FIN-39",
  ]) {
    assert.ok(committed.datasets.some((d) => d.id === id), `${id} missing from MANIFEST.json datasets`);
  }
  assert.ok(committed.artifacts.some((a) => a.id === "FIN-12"), "FIN-12 missing from MANIFEST.json artifacts");
  assert.ok(committed.artifacts.some((a) => a.id === "FIN-40"), "FIN-40 missing from MANIFEST.json artifacts");
});

test("buildManifest records a declared variant that is on disk, and skips one that is not", () => {
  const root = mkdtempSync(join(tmpdir(), "datagen-manifest-variant-test-"));
  try {
    const specsPath = join(root, "artifact-specs.yaml");
    const entry = (id, name, variantFile) => [
      `  - id: ${id}`,
      `    name: ${name}`,
      "    type: dataset",
      "    format: csv",
      "    generation: deterministic",
      "    canon_entities: []",
      "    planted_features: []",
      "    consuming_modules: []",
      "    variants:",
      "      - name: slice",
      `        file: ${variantFile}`,
      "        derived_from: rows.csv",
      "        rule: rows where flag is true",
      "",
    ].join("\n");
    writeFileSync(specsPath, `artifacts:\n${entry("LGL-96", "with-variant", "variants/slice.csv")}${entry("LGL-95", "variant-missing", "variants/slice.csv")}`);
    const specs = loadSpecs(specsPath);

    const present = join(root, "datasets", "legal", "with-variant");
    mkdirSync(join(present, "variants"), { recursive: true });
    writeFileSync(join(present, "rows.csv"), "a,flag\n1,true\n2,false\n");
    writeFileSync(join(present, "variants", "slice.csv"), "a,flag\n1,true\n");

    const declaredButAbsent = join(root, "datasets", "legal", "variant-missing");
    mkdirSync(declaredButAbsent, { recursive: true });
    writeFileSync(join(declaredButAbsent, "rows.csv"), "a,flag\n1,true\n");

    const manifest = buildManifest({ root, specs, existingManifest: {} });
    const withVariant = manifest.datasets.find((d) => d.id === "LGL-96");
    assert.deepEqual(withVariant.files, ["rows.csv", "variants/slice.csv"]);
    assert.equal(withVariant.row_counts["variants/slice.csv"], 1);
    assert.deepEqual(withVariant.variants, [{
      name: "slice",
      file: "variants/slice.csv",
      derived_from: "rows.csv",
      rule: "rows where flag is true",
      row_count: 1,
    }]);

    // Declared but never emitted: MANIFEST reports what is on disk, not what a
    // spec hopes for.
    const missing = manifest.datasets.find((d) => d.id === "LGL-95");
    assert.equal(missing.variants, undefined);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("buildManifest counts JSONL records as well as CSV data rows", () => {
  const root = mkdtempSync(join(tmpdir(), "datagen-manifest-jsonl-test-"));
  try {
    const specsPath = join(root, "artifact-specs.yaml");
    writeFileSync(
      specsPath,
      [
        "artifacts:",
        "  - id: LGL-94",
        "    name: feed-and-index",
        "    type: dataset",
        "    format: jsonl + csv",
        "    generation: deterministic",
        "    canon_entities: []",
        "    planted_features: []",
        "    consuming_modules: []",
        "",
      ].join("\n")
    );
    const specs = loadSpecs(specsPath);

    const dir = join(root, "datasets", "legal", "feed-and-index");
    mkdirSync(dir, { recursive: true });
    // A JSONL file has no header row, so three lines are three records. The
    // trailing newline every generator writes is not a fourth.
    writeFileSync(join(dir, "feed.jsonl"), '{"a":1}\n{"a":2}\n{"a":3}\n');
    writeFileSync(join(dir, "index.csv"), "a,b\n1,2\n3,4\n");
    writeFileSync(join(dir, "notes.md"), "# not a table\n");

    const manifest = buildManifest({ root, specs, existingManifest: {} });
    const entry = manifest.datasets.find((d) => d.id === "LGL-94");
    assert.deepEqual(entry.files, ["feed.jsonl", "index.csv", "notes.md"]);
    assert.equal(entry.row_counts["feed.jsonl"], 3, "three records, not two and not four");
    assert.equal(entry.row_counts["index.csv"], 2, "a CSV still reports data rows, header excluded");
    assert.equal("notes.md" in entry.row_counts, false, "a format with no records carries no count");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("buildManifest reports an empty JSONL file as zero records", () => {
  const root = mkdtempSync(join(tmpdir(), "datagen-manifest-jsonl-empty-"));
  try {
    const specsPath = join(root, "artifact-specs.yaml");
    writeFileSync(
      specsPath,
      "artifacts:\n  - id: LGL-93\n    name: empty-feed\n    type: dataset\n    format: jsonl\n    generation: deterministic\n    canon_entities: []\n    planted_features: []\n    consuming_modules: []\n"
    );
    const specs = loadSpecs(specsPath);
    const dir = join(root, "datasets", "legal", "empty-feed");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "feed.jsonl"), "");
    const manifest = buildManifest({ root, specs, existingManifest: {} });
    assert.equal(manifest.datasets.find((d) => d.id === "LGL-93").row_counts["feed.jsonl"], 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// manifestIds: the ids `validate --manifest` checks. The catalog is a plan and
// the manifest is the record of what shipped, so reading it back has to fail
// loudly rather than return a short list.

/** Write one MANIFEST.json into a throwaway root and hand back its path. */
function withManifest(contents, fn) {
  const root = mkdtempSync(join(tmpdir(), "datagen-manifest-ids-"));
  try {
    const path = join(root, "MANIFEST.json");
    writeFileSync(path, typeof contents === "string" ? contents : JSON.stringify(contents, null, 4));
    fn(path);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("manifestIds reads both sections, in the order the manifest lists them", () => {
  withManifest(
    { universe_version: "1.4.0", datasets: [{ id: "FIN-09" }, { id: "FIN-22" }], artifacts: [{ id: "CORE-05" }] },
    (path) => {
      assert.deepEqual(manifestIds(path), { datasets: ["FIN-09", "FIN-22"], artifacts: ["CORE-05"] });
    }
  );
});

test("manifestIds treats an absent section as empty, because a repo can ship no drafted artifacts", () => {
  withManifest({ datasets: [{ id: "FIN-09" }] }, (path) => {
    assert.deepEqual(manifestIds(path), { datasets: ["FIN-09"], artifacts: [] });
  });
});

test("manifestIds fails hard when the manifest is missing", () => {
  const root = mkdtempSync(join(tmpdir(), "datagen-manifest-ids-"));
  try {
    assert.throws(() => manifestIds(join(root, "MANIFEST.json")), ManifestError);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("manifestIds fails hard on a malformed section or a row with no id", () => {
  withManifest({ datasets: { id: "FIN-09" } }, (path) => {
    assert.throws(() => manifestIds(path), /"datasets" is object, expected a list/);
  });
  withManifest({ datasets: [{ id: "FIN-09" }, { name: "no-id-here" }] }, (path) => {
    assert.throws(() => manifestIds(path), /datasets\[1\] has no "id" string/);
  });
  withManifest({ datasets: [], artifacts: [{ id: "" }] }, (path) => {
    assert.throws(() => manifestIds(path), /artifacts\[0\] has no "id" string/);
  });
  withManifest("{ not json", (path) => {
    assert.throws(() => manifestIds(path), /is not valid JSON/);
  });
  withManifest([{ id: "FIN-09" }], (path) => {
    assert.throws(() => manifestIds(path), /expected an object at the top level/);
  });
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildManifest } from "../../datagen/src/manifest.js";
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
  ]) {
    assert.ok(committed.datasets.some((d) => d.id === id), `${id} missing from MANIFEST.json datasets`);
  }
});

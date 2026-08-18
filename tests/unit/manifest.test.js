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
    "FIN-36", "FIN-37", "FIN-38", "FIN-39",
  ]) {
    assert.ok(committed.datasets.some((d) => d.id === id), `${id} missing from MANIFEST.json datasets`);
  }
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

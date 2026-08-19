import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSpecs, SpecValidationError, trackDir, trackPrefix } from "../../datagen/src/specLoader.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");

test("loadSpecs parses the real specs/artifact-specs.yaml: 137 artifacts, no duplicate ids", () => {
  const { artifacts, byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  assert.equal(artifacts.length, 137);
  assert.equal(byId.size, 137);
  assert.ok(byId.has("CORE-01"));
  assert.ok(byId.has("LGL-07"));
});

test("loadSpecs: every artifact has the required fields with correct shapes", () => {
  const { artifacts } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  for (const a of artifacts) {
    assert.equal(typeof a.id, "string");
    assert.equal(typeof a.name, "string");
    assert.ok(["deterministic", "drafted-frozen"].includes(a.generation), `${a.id} has bad generation`);
    assert.ok(Array.isArray(a.planted_features), `${a.id}.planted_features not an array`);
    assert.ok(Array.isArray(a.canon_entities), `${a.id}.canon_entities not an array`);
    assert.ok(Array.isArray(a.consuming_modules), `${a.id}.consuming_modules not an array`);
  }
});

test("loadSpecs throws SpecValidationError on a missing required field", () => {
  const dir = mkdtempSync(join(tmpdir(), "datagen-spec-test-"));
  const badPath = join(dir, "bad.yaml");
  writeFileSync(
    badPath,
    "artifacts:\n  - id: BAD-01\n    name: broken\n    type: dataset\n    format: csv\n    generation: deterministic\n    canon_entities: []\n    consuming_modules: []\n"
  );
  try {
    assert.throws(() => loadSpecs(badPath), SpecValidationError);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loadSpecs throws on duplicate ids", () => {
  const dir = mkdtempSync(join(tmpdir(), "datagen-spec-test-"));
  const badPath = join(dir, "dup.yaml");
  const entry = (id) =>
    `  - id: ${id}\n    name: n\n    type: dataset\n    format: csv\n    generation: deterministic\n    canon_entities: []\n    planted_features: []\n    consuming_modules: []\n`;
  writeFileSync(badPath, `artifacts:\n${entry("DUP-01")}${entry("DUP-01")}`);
  try {
    assert.throws(() => loadSpecs(badPath), SpecValidationError);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loadSpecs throws on unknown generation value", () => {
  const dir = mkdtempSync(join(tmpdir(), "datagen-spec-test-"));
  const badPath = join(dir, "badgen.yaml");
  writeFileSync(
    badPath,
    "artifacts:\n  - id: BAD-02\n    name: n\n    type: dataset\n    format: csv\n    generation: llm-vibes\n    canon_entities: []\n    planted_features: []\n    consuming_modules: []\n"
  );
  try {
    assert.throws(() => loadSpecs(badPath), SpecValidationError);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loadSpecs: optional columns / period fields are validated when present", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  for (const id of ["FIN-01", "FIN-02", "FIN-03", "FIN-22"]) {
    const spec = byId.get(id);
    assert.ok(Array.isArray(spec.columns) && spec.columns.length > 0, `${id} has no columns`);
    assert.equal(new Set(spec.columns).size, spec.columns.length, `${id} has duplicate columns`);
  }
  for (const id of ["FIN-01", "FIN-02", "FIN-03"]) {
    assert.deepEqual(byId.get(id).period, { start: "2026-03-01", end: "2026-03-31" }, `${id} period`);
  }
  assert.equal(byId.get("FIN-22").period, undefined, "a chart of accounts has no period");
});

test("loadSpecs throws on malformed columns or period", () => {
  const dir = mkdtempSync(join(tmpdir(), "datagen-spec-test-"));
  const base = "artifacts:\n  - id: BAD-03\n    name: n\n    type: dataset\n    format: csv\n    generation: deterministic\n    canon_entities: []\n    planted_features: []\n    consuming_modules: []\n";
  const cases = [
    "    columns: []\n",
    "    columns: [a, a]\n",
    "    columns: [a, '']\n",
    "    columns: nope\n",
    "    period: { start: 2026-03-01, end: 2026-03-31 }\n", // unquoted YAML dates parse as Date objects, not strings
    "    period: { start: \"2026-03-31\", end: \"2026-03-01\" }\n",
    "    period: { start: \"2026-03-01\" }\n",
  ];
  try {
    for (const [i, extra] of cases.entries()) {
      const badPath = join(dir, `bad-${i}.yaml`);
      writeFileSync(badPath, base + extra);
      assert.throws(() => loadSpecs(badPath), SpecValidationError, `case ${i} should throw: ${extra.trim()}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loadSpecs: the FIN-01 variant declaration carries a name, a file under variants/, a parent and a rule", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  const variants = byId.get("FIN-01").variants;
  assert.ok(Array.isArray(variants) && variants.length > 0, "FIN-01 declares no variants");
  for (const variant of variants) {
    for (const field of ["name", "file", "derived_from", "rule"]) {
      assert.equal(typeof variant[field], "string", `variant.${field}`);
      assert.notEqual(variant[field].trim(), "", `variant.${field} is empty`);
    }
    assert.ok(variant.file.startsWith("variants/"), "a variant file lives under variants/");
    assert.ok(!variant.derived_from.includes("/"), "derived_from names a sibling file");
  }
  // Nothing else in the catalog declares variants yet; this is the first user of
  // the convention, so the count is worth pinning until a second one lands.
  const withVariants = [...byId.values()].filter((s) => "variants" in s).map((s) => s.id);
  assert.deepEqual(withVariants, ["FIN-01"]);
});

test("loadSpecs throws on a malformed variants declaration", () => {
  const dir = mkdtempSync(join(tmpdir(), "datagen-spec-test-"));
  const base = "artifacts:\n  - id: BAD-04\n    name: n\n    type: dataset\n    format: csv\n    generation: deterministic\n    canon_entities: []\n    planted_features: []\n    consuming_modules: []\n";
  const variant = (extra) =>
    `    variants:\n      - name: v\n        file: variants/v.csv\n        derived_from: rows.csv\n${extra}`;
  const cases = [
    "    variants: []\n",
    "    variants: nope\n",
    variant("        rule: ''\n"), // a variant nobody can re-derive is a second dataset
    "    variants:\n      - name: v\n        file: rows-slice.csv\n        derived_from: rows.csv\n        rule: r\n",
    "    variants:\n      - name: v\n        file: variants/v.csv\n        derived_from: nested/rows.csv\n        rule: r\n",
    "    variants:\n      - name: v\n        file: variants/a.csv\n        derived_from: rows.csv\n        rule: r\n      - name: v\n        file: variants/b.csv\n        derived_from: rows.csv\n        rule: r\n",
  ];
  try {
    for (const [i, extra] of cases.entries()) {
      const badPath = join(dir, `bad-variant-${i}.yaml`);
      writeFileSync(badPath, base + extra);
      assert.throws(() => loadSpecs(badPath), SpecValidationError, `case ${i} should throw`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loadSpecs: the Track B artifacts carry columns, and the drafted one does not", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  for (const id of ["FIN-36", "FIN-37", "FIN-38", "FIN-39"]) {
    const spec = byId.get(id);
    assert.equal(spec.generation, "deterministic", `${id} generation`);
    assert.ok(Array.isArray(spec.columns) && spec.columns.length > 0, `${id} has no columns`);
    assert.equal(new Set(spec.columns).size, spec.columns.length, `${id} has duplicate columns`);
    assert.ok(spec.consuming_modules.length > 0, `${id} serves no module`);
  }
  for (const id of ["FIN-37", "FIN-38"]) {
    assert.deepEqual(byId.get(id).period, { start: "2026-03-01", end: "2026-03-31" }, `${id} period`);
  }
  assert.equal(byId.get("FIN-36").period, undefined, "a checklist template counts close days, not dates");
  assert.equal(byId.get("FIN-40").generation, "drafted-frozen");
  assert.equal(byId.get("FIN-40").columns, undefined, "a drafted document has no columns");
  for (const id of ["FIN-36", "FIN-37"]) {
    assert.deepEqual(
      byId.get(id).consuming_modules,
      ["finance-spreadsheet-ops", "finance-google-workspace", "finance-microsoft-365"],
      `${id} is consumed by all three template modules`
    );
  }
});

test("trackPrefix / trackDir map every real spec id to a known dataset track", () => {
  const { artifacts } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  const known = new Set(["core", "legal", "finance", "hr", "revenue", "operations", "smb"]);
  for (const a of artifacts) {
    assert.doesNotThrow(() => trackPrefix(a.id), `trackPrefix threw for ${a.id}`);
    assert.ok(known.has(trackDir(a.id)), `${a.id} mapped to unknown track dir`);
  }
});

test("loadSpecs: cluster 1 FIN specs carry columns and (except FIN-12) a period", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  const structured = ["FIN-04", "FIN-05", "FIN-06", "FIN-07", "FIN-08", "FIN-09", "FIN-10", "FIN-11"];
  for (const id of structured) {
    const spec = byId.get(id);
    assert.ok(Array.isArray(spec.columns) && spec.columns.length > 0, `${id} has no columns`);
    assert.equal(new Set(spec.columns).size, spec.columns.length, `${id} has duplicate columns`);
    assert.deepEqual(spec.period, { start: "2026-03-01", end: "2026-03-31" }, `${id} period`);
    assert.equal(spec.generation, "deterministic", `${id} generation`);
  }
  assert.equal(byId.get("FIN-12").generation, "drafted-frozen");
  assert.equal(byId.get("FIN-12").columns, undefined, "a drafted contract has no columns");
  assert.equal(byId.get("FIN-04").format, "csv + json");
  assert.equal(byId.get("FIN-10").format, "csv + json");
});

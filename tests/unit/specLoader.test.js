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

test("trackPrefix / trackDir map every real spec id to a known dataset track", () => {
  const { artifacts } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  const known = new Set(["core", "legal", "finance", "hr", "revenue", "operations", "smb"]);
  for (const a of artifacts) {
    assert.doesNotThrow(() => trackPrefix(a.id), `trackPrefix threw for ${a.id}`);
    assert.ok(known.has(trackDir(a.id)), `${a.id} mapped to unknown track dir`);
  }
});

// Core requirement from the task brief: "same seed -> identical bytes".
// Runs every implemented generator twice (fresh Rng instances each time,
// exactly as two separate `datagen generate` process invocations would) and
// asserts byte-identical output.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { PROGRAM_GENERATOR_IDS } from "../../datagen/src/generators/index.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));

for (const id of PROGRAM_GENERATOR_IDS) {
  test(`${id}: generateArtifact is deterministic (same seed -> identical bytes)`, () => {
    const spec = specs.byId.get(id);
    assert.ok(spec, `${id} not found in specs/artifact-specs.yaml`);
    const runA = generateArtifact(spec, canon);
    const runB = generateArtifact(spec, canon);
    assert.equal(runA.length, runB.length, `${id}: different number of output files between runs`);
    for (let i = 0; i < runA.length; i++) {
      assert.equal(runA[i].path, runB[i].path, `${id}: file path order differs between runs`);
      assert.equal(runA[i].content, runB[i].content, `${id}: ${runA[i].path} content differs between runs`);
    }
  });
}

test("PROGRAM_GENERATOR_IDS lines up with the real spec catalog's deterministic ids that are actually implemented", () => {
  for (const id of PROGRAM_GENERATOR_IDS) {
    const spec = specs.byId.get(id);
    assert.ok(spec, `${id} missing from specs/artifact-specs.yaml`);
    assert.equal(spec.generation, "deterministic", `${id} is not marked deterministic in the spec catalog`);
  }
});

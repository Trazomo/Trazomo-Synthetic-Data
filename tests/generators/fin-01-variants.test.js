// The dataset-variant convention, proved on its first user: FIN-01's trimmed
// slice for finance-local-ai.
//
// The point of a variant is that it is re-derivable. This test therefore does
// not import the generator's predicate; it re-applies the rule the spec states,
// in the test's own code, and asserts the emitted bytes agree. If the two ever
// part company, either the spec sentence or the generator is lying.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { buildManifest } from "../../datagen/src/manifest.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));

const spec = specs.byId.get("FIN-01");
const files = generateArtifact(spec, canon);
const variantSpec = (spec.variants ?? [])[0];

// The rule as written in specs/artifact-specs.yaml, re-expressed as code here.
const VARIANT_DATES = ["2026-03-05", "2026-03-06"];
const statedRule = (row) =>
  row.channel === "ach" && row.type === "credit" && VARIANT_DATES.includes(row.posted_date);

test("FIN-01: the spec declares a variant with a name, a file under variants/, a parent and a rule", () => {
  assert.ok(variantSpec, "FIN-01 should declare at least one variant");
  assert.equal(typeof variantSpec.name, "string");
  assert.match(variantSpec.file, /^variants\/[a-z0-9-]+\.csv$/);
  assert.equal(variantSpec.derived_from, "bank-transactions.csv");
  assert.ok(variantSpec.rule.includes("ach"), "the rule should state the predicate, not just gesture at it");
  assert.deepEqual(variantSpec.consuming_modules, ["finance-local-ai"]);
});

test("FIN-01: the variant on disk is exactly the stated rule applied to the parent, in parent order", () => {
  const parent = csvTable(fileByPath(files, variantSpec.derived_from).content);
  const variant = csvTable(fileByPath(files, variantSpec.file).content);
  assert.deepEqual(variant.cols, parent.cols, "a variant keeps its parent's header");
  assert.deepEqual(variant.rows, parent.rows.filter(statedRule), "the variant is not the stated rule's output");
  assert.ok(variant.rows.length >= 6 && variant.rows.length <= 10, `variant holds ${variant.rows.length} rows`);
});

test("FIN-01: the variant still carries the anomaly the offline demo is there to find", () => {
  const variant = csvTable(fileByPath(files, variantSpec.file).content);
  const pairs = variant.rows.map((r) => `${r.amount}|${r.reference}`);
  assert.notEqual(
    new Set(pairs).size, pairs.length,
    "the trimmed slice must still contain the repeated receipt, or there is nothing in it to classify"
  );
});

test("FIN-01: the committed variant file matches what the generator emits", () => {
  const committed = readFileSync(
    join(REPO_ROOT, "datasets", "finance", spec.name, variantSpec.file), "utf8"
  );
  assert.equal(committed, fileByPath(files, variantSpec.file).content);
});

test("MANIFEST records the variant with its rule, its parent and its row count", () => {
  const committed = JSON.parse(readFileSync(join(REPO_ROOT, "MANIFEST.json"), "utf8"));
  const fresh = buildManifest({ root: REPO_ROOT, specs, existingManifest: committed });
  const entry = fresh.datasets.find((d) => d.id === "FIN-01");
  assert.ok(entry.files.includes(variantSpec.file), "the variant file belongs in files like any other");
  assert.ok(entry.row_counts[variantSpec.file] > 0, "the variant needs a row count");
  assert.equal(entry.variants.length, 1);
  assert.deepEqual(entry.variants[0], {
    name: variantSpec.name,
    file: variantSpec.file,
    derived_from: variantSpec.derived_from,
    rule: variantSpec.rule,
    row_count: entry.row_counts[variantSpec.file],
  });
});

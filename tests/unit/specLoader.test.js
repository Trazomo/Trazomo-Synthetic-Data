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

test("loadSpecs throws on a malformed files declaration", () => {
  const dir = mkdtempSync(join(tmpdir(), "datagen-spec-test-"));
  const base = "artifacts:\n  - id: BAD-04\n    name: n\n    type: dataset\n    format: csv\n    generation: deterministic\n    canon_entities: []\n    planted_features: []\n    consuming_modules: []\n";
  const cases = [
    "    files: []\n",
    "    files: {}\n",
    "    files:\n      a.csv: []\n",
    "    files:\n      a.csv: [x, x]\n",
  ];
  try {
    for (const [i, extra] of cases.entries()) {
      const badPath = join(dir, `bad-files-${i}.yaml`);
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

// Cluster 2 (D4): FIN-13, FIN-14, FIN-15, FIN-16, FIN-17, FIN-18, FIN-19,
// FIN-20 and FIN-35. Task 3 of the D4 plan writes the contract every later
// generator test pins against, so it is worth failing here rather than in nine
// generator tests at once.
const CLUSTER_2 = ["FIN-13", "FIN-14", "FIN-15", "FIN-16", "FIN-17", "FIN-18", "FIN-19", "FIN-20", "FIN-35"];
const CLUSTER_2_CSV = ["FIN-13", "FIN-15", "FIN-16", "FIN-17", "FIN-18", "FIN-19", "FIN-35"];

test("loadSpecs: every cluster 2 FIN spec carries the fields its generator pins against", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  for (const id of CLUSTER_2) {
    const spec = byId.get(id);
    assert.ok(spec, `${id} is not in the catalog`);
    assert.equal(spec.generation, "deterministic", `${id} generation`);
    assert.ok(spec.consuming_modules.length > 0, `${id} serves no module`);
    assert.ok(spec.planted_features.length > 0, `${id} states no planted features`);
    assert.ok(spec.planted_features.length <= 6, `${id} carries more than six planted features`);
    for (const feature of spec.planted_features) {
      // An unquoted "word: word" parses as a single-key mapping, not a string,
      // and validate then reports a feature nobody wrote.
      assert.equal(typeof feature, "string", `${id} has a planted feature that is not a string (quote the colon)`);
      assert.ok(feature.trim() !== "", `${id} has an empty planted feature`);
      assert.ok(!/learner/i.test(feature), `${id} describes what a learner does, which no file can contain: ${feature}`);
      assert.ok(!feature.includes("\u2014"), `${id} planted feature carries an em dash`);
    }
  }
});

test("loadSpecs: the seven cluster 2 CSV ids carry columns; the YAML and JSONL ids document their keys instead", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  for (const id of CLUSTER_2_CSV) {
    const cols = byId.get(id).columns;
    assert.ok(Array.isArray(cols) && cols.length > 0, `${id} has no columns`);
    assert.equal(new Set(cols).size, cols.length, `${id} has duplicate columns`);
    for (const col of cols) {
      assert.match(col, /^[a-z][a-z0-9_]*$/, `${id} column "${col}" is not snake_case`);
    }
  }
  // FIN-14 is one YAML document and FIN-20 is a JSONL feed, so neither has a
  // header row to pin. Each states its key list in planted_features (D4 plan U1).
  for (const id of ["FIN-14", "FIN-20"]) {
    assert.equal(byId.get(id).columns, undefined, `${id} is not a CSV, so it has no columns`);
    assert.ok(
      byId.get(id).planted_features.some((f) => f.includes("documented") && f.includes("key list")),
      `${id} states no documented key list`
    );
  }
});

test("loadSpecs: cluster 2 formats, periods and columns match the artifacts they join to", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  assert.equal(byId.get("FIN-16").format, "csv + json", "FIN-16 ships collections-policy.json beside the log");
  assert.equal(byId.get("FIN-20").format, "jsonl + csv", "FIN-20 ships policy-index.csv beside the feed");

  const iso = /^\d{4}-\d{2}-\d{2}$/;
  for (const id of CLUSTER_2.filter((x) => x !== "FIN-14")) {
    const period = byId.get(id).period;
    assert.ok(period, `${id} states no period`);
    assert.ok(iso.test(period.start) && iso.test(period.end) && period.start <= period.end, `${id} period`);
  }
  assert.equal(byId.get("FIN-14").period, undefined, "a policy config states an effective date, not a fiscal window");
  assert.deepEqual(
    byId.get("FIN-17").period,
    { start: "2026-04-01", end: "2026-04-07" },
    "FIN-17 covers the close window, not the period being closed"
  );

  // FIN-17's spine is FIN-36's, so it cannot drop a template column.
  for (const col of byId.get("FIN-36").columns) {
    assert.ok(byId.get("FIN-17").columns.includes(col), `FIN-17 drops the FIN-36 column "${col}"`);
  }
  for (const col of ["due_date", "account_code", "owner_employee_id", "reviewer_employee_id"]) {
    assert.ok(byId.get("FIN-17").columns.includes(col), `FIN-17 needs "${col}" to date and staff the template`);
  }
  assert.ok(byId.get("FIN-19").columns.includes("entitlement_class"), "the toxic pair is a predicate over entitlement_class");
  assert.ok(byId.get("FIN-16").columns.includes("dunning_stage"), "a dunning stage is recomputed from the ladder");
  assert.ok(
    !byId.get("FIN-16").columns.some((c) => /note|comment/.test(c)),
    "FIN-16 carries no free-text note column, because a note is where an answer key hides"
  );
});

test("loadSpecs: cluster 2 canon entities name every counterparty the joins pull in", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  // FIN-15 and FIN-16 are the credit notes and the contacts behind the FIN-04
  // aging, so they read the same customers.
  for (const id of ["FIN-15", "FIN-16"]) {
    assert.deepEqual(
      byId.get(id).canon_entities,
      byId.get("FIN-04").canon_entities,
      `${id} follows up FIN-04's receivables, so it carries FIN-04's customers`
    );
  }
  // FIN-35 queues FIN-07 invoices plus the CORE-02 outside-counsel invoice.
  const queue = byId.get("FIN-35").canon_entities;
  assert.ok(queue.includes("co-001"), "FIN-35 carries the CORE-02 routing-boundary row");
  for (const entity of byId.get("FIN-07").canon_entities) {
    assert.ok(queue.includes(entity), `FIN-35 references FIN-07 invoices, so it carries ${entity}`);
  }
  // FIN-13 merchants are drawn from the screened vendor names FIN-06 already uses.
  for (const entity of byId.get("FIN-06").canon_entities) {
    assert.ok(byId.get("FIN-13").canon_entities.includes(entity), `FIN-13 names ${entity} as a merchant`);
  }
  assert.deepEqual(byId.get("FIN-20").canon_entities, ["co-002"], "FIN-20's policy index is co-002's own library");
});

// Clusters 3 and 4 (D5): FIN-21, FIN-23 through FIN-34. Task 3 of the D5 plan
// writes the contract every later generator test pins against -- the header a
// generator emits, the period its rows cover, and the exact planted-feature
// wording that carries both cardinalities. Failing here beats failing in eight
// generator tests at once, which is why this block runs before any of them
// exist.
const CLUSTER_34 = [
  "FIN-21", "FIN-23", "FIN-24", "FIN-25", "FIN-26", "FIN-27",
  "FIN-28", "FIN-29", "FIN-30", "FIN-31", "FIN-32", "FIN-33", "FIN-34",
];
const CLUSTER_34_CSV = ["FIN-23", "FIN-24", "FIN-25", "FIN-27", "FIN-31", "FIN-32", "FIN-33"];
/** The three that ship one document with keys rather than a header row. */
const CLUSTER_34_KEYED = ["FIN-26", "FIN-29", "FIN-34"];
const CLUSTER_34_DRAFTED = ["FIN-21", "FIN-28", "FIN-30"];

test("loadSpecs: every cluster 3 and 4 spec carries the fields its generator or author pins against", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  for (const id of CLUSTER_34) {
    const spec = byId.get(id);
    assert.ok(spec, `${id} is not in the catalog`);
    assert.ok(spec.consuming_modules.length > 0, `${id} serves no module`);
    assert.ok(spec.planted_features.length > 0, `${id} states no planted features`);
    assert.ok(spec.planted_features.length <= 6, `${id} carries more than six planted features`);
    assert.equal(spec.variants, undefined, `${id} declares variants; D5 ships none (plan U12)`);
    for (const feature of spec.planted_features) {
      assert.equal(typeof feature, "string", `${id} has a planted feature that is not a string (quote the colon)`);
      assert.ok(feature.trim() !== "", `${id} has an empty planted feature`);
      assert.ok(!/learner/i.test(feature), `${id} describes what a learner does, which no file can contain: ${feature}`);
      assert.ok(!feature.includes("\u2014"), `${id} planted feature carries an em dash`);
    }
  }
  for (const id of [...CLUSTER_34_CSV, ...CLUSTER_34_KEYED]) {
    assert.equal(byId.get(id).generation, "deterministic", `${id} generation`);
  }
  for (const id of CLUSTER_34_DRAFTED) {
    assert.equal(byId.get(id).generation, "drafted-frozen", `${id} generation`);
    assert.equal(byId.get(id).columns, undefined, `${id} is a drafted document, so it has no columns`);
  }
});

test("loadSpecs: the seven cluster 3 and 4 CSV ids carry columns; the YAML and JSON ids document their keys instead", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  for (const id of CLUSTER_34_CSV) {
    const cols = byId.get(id).columns;
    assert.ok(Array.isArray(cols) && cols.length > 0, `${id} has no columns`);
    assert.equal(new Set(cols).size, cols.length, `${id} has duplicate columns`);
    for (const col of cols) {
      assert.match(col, /^[a-z][a-z0-9_]*$/, `${id} column "${col}" is not snake_case`);
    }
  }
  for (const id of CLUSTER_34_KEYED) {
    assert.equal(byId.get(id).columns, undefined, `${id} is not a CSV, so it has no columns`);
    assert.ok(
      byId.get(id).planted_features.some((f) => f.includes("documented") && f.includes("key list")),
      `${id} states no documented key list`
    );
  }
});

test("loadSpecs: FIN-24 carries the sign column and neither answer-key column", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  const cols = byId.get("FIN-24").columns;
  // Rule R-SIGN: a section subtotal is one pass over this file, so the sign a
  // contra line contributes to its section has to be a column rather than a
  // table a consumer is expected to already hold.
  assert.ok(cols.includes("section_sign"), "FIN-24 drops section_sign, so no consumer can subtotal without an external table");
  for (const col of ["prior_period", "prior_period_actual", "flux_amount", "flux_pct"]) {
    assert.ok(cols.includes(col), `FIN-24 needs "${col}" to carry the flux comparison`);
  }
  assert.ok(cols.includes("variance_explanation"), "FIN-24 keeps the empty explanation column FIN-37 defines");
  for (const col of ["root_cause", "supporting_entry_ids"]) {
    assert.ok(!cols.includes(col), `FIN-24 ships "${col}", which is an answer key: the root cause is derivable from FIN-25 by rule`);
  }
  // The eight-value tuple imported from the FIN-37 builder, not a header slice:
  // explanation_threshold_usd is FIN-37's eleventh column, so FIN-24's first
  // eight are not a prefix of it.
  for (const col of ["line_id", "account_code", "account_name", "statement_section", "normal_balance", "owner_role", "budget_amount", "explanation_threshold_usd"]) {
    assert.ok(byId.get("FIN-37").columns.includes(col), `FIN-37 no longer carries "${col}"`);
    assert.ok(cols.includes(col), `FIN-24 drops the imported FIN-37 column "${col}"`);
  }
  assert.notEqual(
    cols.slice(0, 8).join(","),
    byId.get("FIN-37").columns.slice(0, 8).join(","),
    "FIN-24's first eight columns are a prefix of FIN-37's, which means someone diffed the headers instead of importing the tuple"
  );
});

test("loadSpecs: FIN-33 is the shared spine, and FIN-24 shares its line definition", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  // Plan U14: a spec that hides three of its four consumers is how a
  // regeneration surprises three modules.
  assert.deepEqual(
    byId.get("FIN-33").consuming_modules,
    [
      "finance-driver-scenario-planning",
      "finance-flux-variance-investigation",
      "finance-close-memo-disclosures",
      "finance-fpa-kpi-dashboards",
    ],
    "FIN-33 does not name all four of its real consumers"
  );
  for (const col of ["line_id", "account_code", "account_name", "statement_section", "normal_balance"]) {
    assert.ok(byId.get("FIN-33").columns.includes(col), `FIN-33 drops the FIN-37 spine column "${col}"`);
    assert.ok(byId.get("FIN-24").columns.includes(col), `FIN-24 drops the FIN-37 spine column "${col}"`);
  }
  assert.ok(byId.get("FIN-33").columns.includes("period"), "FIN-33 is a trend, so every row states its month");
});

test("loadSpecs: the three FP&A files cover one 24-month window, and the configs state no fiscal window", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  for (const id of ["FIN-31", "FIN-32", "FIN-33"]) {
    assert.equal(byId.get(id).period.end, "2026-03-31", `${id} does not end the trend at the close period end`);
    assert.ok(byId.get(id).period.start < "2024-05-01", `${id} does not open the trend 24 months back`);
  }
  assert.deepEqual(
    byId.get("FIN-31").period,
    byId.get("FIN-32").period,
    "FIN-31 and FIN-32 are the same month-end series and must declare the same window"
  );
  // A driver set states a base period and a horizon, not a fiscal window, the
  // same reading FIN-14's policy config already takes.
  assert.equal(byId.get("FIN-34").period, undefined, "a driver config states a base period and a horizon, not a fiscal window");
  assert.equal(byId.get("FIN-21").period, undefined, "a runbook states a close-day rule, not a fiscal window");
  assert.deepEqual(byId.get("FIN-28").period, { start: "2026-02-01", end: "2026-02-28" }, "FIN-28 is the February exemplar");
  assert.deepEqual(byId.get("FIN-30").period, { start: "2025-10-01", end: "2025-12-31" }, "FIN-30 is the Q4 2025 agenda");
  assert.ok(byId.get("FIN-32").canon_entities.includes("co-104"), "FIN-32 carries bank balances, so it names the bank");
});

test("loadSpecs: every planted_feature is a string, not a YAML mapping", () => {
  // A feature written with an unquoted "label: detail" parses as a single-key
  // mapping, so `validate`'s keyword check reads the label and silently drops
  // the detail. Three entries were shipped that way (CORE-05 twice, FIN-11
  // once) before this check existed.
  const { artifacts } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  for (const a of artifacts) {
    for (const [i, feature] of a.planted_features.entries()) {
      assert.equal(
        typeof feature, "string",
        `${a.id}.planted_features[${i}] parsed as ${Array.isArray(feature) ? "a list" : typeof feature}. `
        + "A feature containing a colon and a space has to be quoted."
      );
    }
  }
});

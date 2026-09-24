import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSpecs, SpecValidationError, trackDir, trackPrefix } from "../../datagen/src/specLoader.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");

test("loadSpecs parses the real specs/artifact-specs.yaml: 146 artifacts, no duplicate ids", () => {
  const { artifacts, byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  assert.equal(artifacts.length, 146);
  assert.equal(byId.size, 146);
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

// ---------------------------------------------------------------------------
// Small-business cluster 1 (SMB-01 to SMB-05). The same pre-flight the finance
// clusters run: before any generator test exists, pin the fields each generator
// is built against. Failing here beats failing in three generator tests at once.
const SMB_C1 = ["SMB-01", "SMB-02", "SMB-03", "SMB-04", "SMB-05"];
/** The two ids whose output is a flat CSV with one header row. */
const SMB_C1_CSV = ["SMB-01", "SMB-03"];
/** The two ids that ship one nested JSON document with keys rather than a header. */
const SMB_C1_KEYED = ["SMB-04", "SMB-05"];

test("loadSpecs: every cluster 1 SMB spec carries the fields its generator pins against", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  for (const id of SMB_C1) {
    const spec = byId.get(id);
    assert.ok(spec, `${id} is not in the catalog`);
    assert.equal(spec.generation, "deterministic", `${id} generation`);
    assert.ok(spec.consuming_modules.length > 0, `${id} serves no module`);
    assert.ok(spec.planted_features.length > 0, `${id} states no planted features`);
    assert.equal(spec.variants, undefined, `${id} declares variants; C1 ships none (plan U7)`);
    assert.ok(spec.period, `${id} declares no period`);
    assert.ok(spec.period.start >= "2026-01-06" && spec.period.end <= "2026-03-31", `${id} period window`);
    for (const feature of spec.planted_features) {
      assert.equal(typeof feature, "string", `${id} has a planted feature that is not a string (quote the colon)`);
      assert.ok(feature.trim() !== "", `${id} has an empty planted feature`);
      assert.ok(!feature.includes("—"), `${id} planted feature carries an em dash`);
      assert.ok(!feature.includes("–"), `${id} planted feature carries an en dash`);
      // The FIN-scoped /learner/i ban (specLoader.test.js:239, :350), made
      // mechanical for SMB too: a planted_features block describes the file,
      // never what a learner does with it (adjudication C).
      assert.ok(!/learner/i.test(feature), `${id} describes what a learner does, which no file can contain: ${feature}`);
    }
  }
});

test("loadSpecs: the two SMB CSV ids carry columns, SMB-02 carries files, and the records document their keys", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  for (const id of SMB_C1_CSV) {
    const cols = byId.get(id).columns;
    assert.ok(Array.isArray(cols) && cols.length > 0, `${id} has no columns`);
    assert.equal(new Set(cols).size, cols.length, `${id} has duplicate columns`);
    for (const col of cols) assert.match(col, /^[a-z][a-z0-9_]*$/, `${id} column "${col}" is not snake_case`);
    assert.equal(byId.get(id).files, undefined, `${id} is one CSV, so it declares no files map`);
  }
  // SMB-02 ships two files, so it declares both headers rather than one columns
  // list, the HR-18 precedent.
  const smb02 = byId.get("SMB-02");
  assert.equal(smb02.columns, undefined, "SMB-02 is a two-file bundle, so it has no single columns list");
  assert.deepEqual(
    Object.keys(smb02.files).sort(),
    ["client-record-fields.csv", "client-record-template.csv"]
  );
  assert.equal(smb02.files["client-record-template.csv"].length, 21, "the client header is not 21 names");
  assert.deepEqual(
    smb02.files["client-record-fields.csv"],
    ["field_name", "record_section", "field_order", "data_type", "required", "allowed_values", "example_value", "description"]
  );
  // A columns list cannot describe a nested JSON object, so SMB-04 and SMB-05
  // document their key list in planted_features prose, the FIN-29 precedent.
  for (const id of SMB_C1_KEYED) {
    assert.equal(byId.get(id).columns, undefined, `${id} is not a CSV, so it has no columns`);
    assert.equal(byId.get(id).files, undefined, `${id} is one JSON file, so it declares no files map`);
    assert.ok(
      byId.get(id).planted_features.some((f) => f.includes("documented key list")),
      `${id} states no documented key list`
    );
  }
});

test("loadSpecs: the SMB cluster 1 entries name every module that reads them, and the canon entities they join to", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  // A spec that hides two consumers is how a regeneration surprises two modules
  // (R6, approved 2026-09-07).
  assert.deepEqual(
    byId.get("SMB-02").consuming_modules,
    ["smb-client-workspace-setup", "smb-google-workspace", "smb-microsoft-365"]
  );
  assert.deepEqual(byId.get("SMB-01").consuming_modules, ["smb-ai-reliability"]);
  assert.deepEqual(byId.get("SMB-03").consuming_modules, ["smb-lead-response-and-qualification"]);
  for (const id of SMB_C1_KEYED) {
    assert.deepEqual(byId.get(id).consuming_modules, ["smb-client-lead-to-cash-blueprint"]);
  }
  // Every claim cites a row of the Okafor record, and the queue names the
  // referral partner canon/companies.md already gives co-100.
  assert.deepEqual(byId.get("SMB-01").canon_entities, ["co-100", "co-131"]);
  assert.deepEqual(byId.get("SMB-03").canon_entities, ["co-100", "co-131", "co-135"]);
  assert.deepEqual(byId.get("SMB-04").canon_entities, ["co-100", "co-131"]);
  assert.deepEqual(byId.get("SMB-05").canon_entities, ["co-100", "co-002"]);
  assert.deepEqual(byId.get("SMB-02").canon_entities, [], "the schema names no entity");
  for (const id of SMB_C1) {
    assert.equal(trackDir(id), "smb", `${id} does not generate into datasets/smb/`);
  }
});

test("loadSpecs: SMB-03's window is one calendar week and both records close at the same as-of date", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  assert.deepEqual(byId.get("SMB-03").period, { start: "2026-01-12", end: "2026-01-18" });
  assert.equal(byId.get("SMB-04").period.end, "2026-03-31");
  assert.equal(byId.get("SMB-05").period.end, "2026-03-31");
  // The co-002 job was raised before the queue's window opens, which is what
  // keeps SMB-03's single commercial row the only commercial inquiry in it.
  assert.ok(byId.get("SMB-05").period.start < byId.get("SMB-03").period.start);
  assert.equal(byId.get("SMB-01").period.start, byId.get("SMB-04").period.start);
});

// ---------------------------------------------------------------------------
// Small-business cluster 2 (SMB-06 to SMB-16). Eleven artifacts, six of them
// deterministic and five drafted-frozen, which is the first SMB cluster where
// the two kinds sit side by side. The pre-flight is therefore two-sided: the
// six carry the column lists their generators pin against, and the five carry
// none, because a drafted markdown document has no header for a columns list to
// describe and a `columns` key on one is a spec that lies about its own shape.
//
// The column lists below are the cluster 2 data plan's section 2 lists, typed
// out rather than derived. That is the point: this file is where a spec column
// list drifting from the plan it was designed to is caught, and a check that
// read the list back out of the same file it is checking would catch nothing.

const SMB_C2_DETERMINISTIC = ["SMB-08", "SMB-10", "SMB-11", "SMB-12", "SMB-13", "SMB-16"];
const SMB_C2_DRAFTED = ["SMB-06", "SMB-07", "SMB-09", "SMB-14", "SMB-15"];
const SMB_C2 = [...SMB_C2_DRAFTED, ...SMB_C2_DETERMINISTIC];

/** Data plan section 2, one entry per deterministic id, in the plan's own order. */
const SMB_C2_COLUMNS = {
  // 2.3, the conversion run sheet
  "SMB-08": [
    "step_id", "sequence", "step", "owner_role", "trigger", "due_offset_days",
    "due_basis", "output_artifact", "evidence_required", "status",
  ],
  // 2.5, the intake that came back
  "SMB-10": [
    "question_id", "section", "sequence", "question_text", "answer_type",
    "required", "client_canon_id", "answer_text",
  ],
  // 2.6, the kickoff run sheet
  "SMB-11": [
    "item_id", "sequence", "phase", "item", "owner_role", "evidence_required",
    "related_milestone_id", "status",
  ],
  // 2.8, the task list with an internal view and a client view
  "SMB-12": [
    "task_id", "milestone_id", "task", "owner_role", "planned_start", "planned_end",
    "internal_status", "internal_completed_date", "client_visible_status",
    "client_visible_updated_date", "client_canon_id",
  ],
  // 2.9, the document index
  "SMB-13": [
    "document_id", "document_title", "document_type", "classification", "visibility",
    "owner_role", "created_date", "last_updated_date", "storage_path",
    "related_milestone_id", "related_task_id", "client_canon_id",
  ],
  // 2.7, the schedule the lateness is measured against
  "SMB-16": [
    "milestone_id", "sequence", "milestone", "planned_start", "planned_end", "actual_start",
    "actual_completion", "milestone_status", "client_canon_id", "project_name",
  ],
};

/** Data plan section 1, the module-to-artifact map, read the other way round. */
const SMB_C2_MODULES = {
  "SMB-06": "smb-proposal-to-contract-workflow",
  "SMB-07": "smb-proposal-to-contract-workflow",
  "SMB-08": "smb-proposal-to-contract-workflow",
  "SMB-09": "smb-client-onboarding-concierge",
  "SMB-10": "smb-client-onboarding-concierge",
  "SMB-11": "smb-client-onboarding-concierge",
  "SMB-12": "smb-client-project-hub",
  "SMB-13": "smb-client-project-hub",
  "SMB-14": "smb-client-project-hub",
  "SMB-15": "smb-milestone-update-drafter",
  "SMB-16": "smb-milestone-update-drafter",
};

test("loadSpecs: the six deterministic cluster 2 SMB ids carry the data plan's column lists exactly", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  for (const id of SMB_C2_DETERMINISTIC) {
    const spec = byId.get(id);
    assert.ok(spec, `${id} is not in the catalog`);
    assert.equal(spec.generation, "deterministic", `${id} generation`);
    assert.deepEqual(spec.columns, SMB_C2_COLUMNS[id], `${id} columns have drifted from data plan section 2`);
    assert.equal(new Set(spec.columns).size, spec.columns.length, `${id} repeats a column`);
    for (const col of spec.columns) {
      assert.match(col, /^[a-z][a-z0-9_]*$/, `${id} column "${col}" is not snake_case`);
    }
    assert.equal(spec.files, undefined, `${id} is one CSV, so it declares no files map`);
    assert.equal(trackDir(id), "smb", `${id} does not generate into datasets/smb/`);
  }
});

test("loadSpecs: the five drafted cluster 2 SMB ids carry no columns and no files map", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  for (const id of SMB_C2_DRAFTED) {
    const spec = byId.get(id);
    assert.ok(spec, `${id} is not in the catalog`);
    assert.equal(spec.generation, "drafted-frozen", `${id} generation`);
    assert.equal(spec.columns, undefined, `${id} is a drafted document, so it declares no columns`);
    assert.equal(spec.files, undefined, `${id} is a drafted document, so it declares no files map`);
    assert.equal(spec.format, "markdown", `${id} format`);
  }
});

test("loadSpecs: all eleven cluster 2 SMB ids declare a period, well-shaped and not backwards", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  assert.equal(SMB_C2.length, 11);
  for (const id of SMB_C2) {
    const spec = byId.get(id);
    assert.ok(spec.period, `${id} declares no period`);
    assert.match(spec.period.start, /^\d{4}-\d{2}-\d{2}$/, `${id} period.start`);
    assert.match(spec.period.end, /^\d{4}-\d{2}-\d{2}$/, `${id} period.end`);
    assert.ok(spec.period.start <= spec.period.end, `${id} period runs backwards`);
  }
});

// specLoader.js's own reading of `period` is "the fiscal window the rows
// cover" (SHOULD-FIX 4). A membership check against the cluster's two month
// window passes on any value in a two month range and cannot fail on a period
// with nothing behind it. The derived form below is falsifiable: for the ids
// whose own committed bytes carry an ISO date, every date in those bytes has
// to sit inside the declared period; for the ids with no date-bearing bytes
// at all, the period is honestly "the window this template belongs to" only
// if the artifact carries no ISO date to contradict it.
//
// Extended to the whole of cluster 2 (SHOULD-FIX 5 of the 2b adversarial
// review): 2a's version of this test named only 2a's six ids by id, so none
// of 2b's five reached it and SMB-14's declared period went false against its
// own bytes (its citation of DOC-LDB-08 carries the byte-equal ISO date
// 2026-03-13) with nothing here to catch it.
const SMB_C2_DATED_PATHS = {
  "SMB-06": join(REPO_ROOT, "artifacts", "SMB-06", "approved-proposal-larkspur.md"),
  "SMB-10": join(REPO_ROOT, "datasets", "smb", "intake-questionnaire", "intake-questionnaire.csv"),
  "SMB-12": join(REPO_ROOT, "datasets", "smb", "project-tasks-and-dates", "project-tasks-and-dates.csv"),
  "SMB-13": join(REPO_ROOT, "datasets", "smb", "project-documents-index", "project-documents-index.csv"),
  "SMB-14": join(REPO_ROOT, "artifacts", "SMB-14", "latest-status-update.md"),
  "SMB-16": join(REPO_ROOT, "datasets", "smb", "milestone-schedule", "milestone-schedule.csv"),
};
const SMB_C2_NO_DATE_PATHS = {
  "SMB-07": join(REPO_ROOT, "artifacts", "SMB-07", "contract-template.md"),
  "SMB-08": join(REPO_ROOT, "datasets", "smb", "client-next-steps-checklist", "client-next-steps-checklist.csv"),
  "SMB-09": join(REPO_ROOT, "artifacts", "SMB-09", "welcome-pack-template.md"),
  "SMB-11": join(REPO_ROOT, "datasets", "smb", "kickoff-checklist", "kickoff-checklist.csv"),
  // SMB-15's notes state every date in long form (dayMonth or longForm), never
  // as an ISO literal, so the no-date reading holds for it too.
  "SMB-15": join(REPO_ROOT, "artifacts", "SMB-15", "internal-status-notes.md"),
};

test("loadSpecs: cluster 2's period values are true against the ISO dates the committed bytes actually carry", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  const ISO = /\d{4}-\d{2}-\d{2}/g;

  for (const [id, path] of Object.entries(SMB_C2_DATED_PATHS)) {
    const spec = byId.get(id);
    const dates = (readFileSync(path, "utf8").match(ISO) ?? []).sort();
    assert.ok(dates.length > 0, `${id} carries no ISO date; it belongs in the no-date list instead`);
    assert.ok(
      dates[0] >= spec.period.start,
      `${id} carries the date ${dates[0]}, before its own period.start ${spec.period.start}`
    );
    assert.ok(
      dates.at(-1) <= spec.period.end,
      `${id} carries the date ${dates.at(-1)}, after its own period.end ${spec.period.end}`
    );
  }

  for (const [id, path] of Object.entries(SMB_C2_NO_DATE_PATHS)) {
    const dates = readFileSync(path, "utf8").match(ISO) ?? [];
    assert.deepEqual(
      dates, [],
      `${id} is a template whose period is honest only as "the window this template belongs to";`
      + ` it now carries the date(s) ${dates.join(", ")}, which makes that reading false`
    );
  }
});

test("loadSpecs: the cluster 2 SMB entries name the one module that reads each of them, and the canon entities they join to", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  for (const [id, module] of Object.entries(SMB_C2_MODULES)) {
    assert.deepEqual(
      byId.get(id).consuming_modules, [module],
      `${id} does not serve exactly the module data plan section 1 gives it`
    );
  }
  // Four modules over eleven artifacts, which is the section 1 map read the
  // other way: a fifth module appearing here means the map moved.
  assert.equal(new Set(Object.values(SMB_C2_MODULES)).size, 4);

  // The two documents that name the studio and the household both carry both
  // seats. The four template artifacts name nobody and have to earn the empty
  // list, which the drafted and structured screens assert as an absence.
  for (const id of ["SMB-06", "SMB-15"]) {
    assert.deepEqual(byId.get(id).canon_entities, ["co-100", "co-131"], `${id} canon_entities`);
  }
  for (const id of ["SMB-07", "SMB-08", "SMB-09", "SMB-11"]) {
    assert.deepEqual(byId.get(id).canon_entities, [], `${id} is a template and names no entity`);
  }
});

// SHOULD-FIX 7. checkPlantedFeature can never return FAIL (fact 0.4), so a
// planted_features string that states a cardinality the bytes contradict is
// caught by nothing at `validate` time. The plan's section 2 replacement
// blocks are pinned text; pin the three C2a lists byte exact against them
// here, so a later edit to either the yaml or the plan shows up as a test
// diff. Source: cluster-2.md section 2.1 (SMB-06), 2.2 (SMB-07) and 2.5
// (SMB-10), after NIT 3's section-order wording swap.
test("loadSpecs: the three C2a planted_features lists are byte exact against cluster-2.md section 2", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));

  assert.deepEqual(byId.get("SMB-06").planted_features, [
    "the approved proposal for the Okafor kitchen and primary bath renovation at 327 Havershill Court, approved 2 February 2026, priced as 12 line items against a 12 row rate basis appendix, one line to one rate, totalling 148,500.00 which is the contract value the client record carries and which the 20 / 30 / 30 / 20 draw schedule splits into 29,700.00, 44,550.00, 44,550.00 and 29,700.00",
    "1 line item priced at a since-expired materials rate: exactly one line, the quartz countertop supply and fabrication line, is priced at a rate whose effective_through date of 2025-12-31 closed before the 2026-02-02 proposal date. Every other line's rate is current at that date",
    "the rate basis makes the staleness findable but not obvious: four of the twelve rate rows carry a stated effective_through, three of them materials and one labour, and only one of the four closed before the proposal date, so a reader who greps for a closing date finds four and a reader who filters on the materials rate class finds three",
    "every line item resolves to exactly one rate row and every rate row is cited by exactly one line item, and every line total is the quantity times the unit rate to the cent, so the bill is recomputable rather than asserted",
    "no person is named: the studio side is the owner role, the client is the canon household The Okafor household, and the acceptance block carries a role rather than a signature",
    "payments are described as terms and draws only: no processor, gateway, card network or bank product name appears in the payment schedule or anywhere else in the document",
  ], "SMB-06's planted_features has drifted from cluster-2.md section 2.1");

  assert.deepEqual(byId.get("SMB-07").planted_features, [
    "a blank contract template, not a filled contract: 16 fields, each with a field id, a required flag and a placeholder token, listed in the template's own required-field list at the top and repeated as a body section in the same order. No client, no price, no date and no canon entity appears anywhere in the document",
    "1 required field, the scope-change clause, left blank: exactly one field that the required-field list marks required carries no placeholder token and no text in its body section. Every other required field carries its token",
    "the blank is a discrimination task, not a grep: three of the sixteen field sections carry an empty slot, and two of the three, dispute resolution and site access hours, are marked not required, so a rule that finds empty slots without reading the required column returns three and blocks on two fields the template was free to leave empty",
    "twelve of the sixteen fields are required and four are optional, and the required-field list is the authority: a field's required flag is stated once, in that table, and the body never restates it",
    "the closing note states the required behaviour: generation stops and names any required field whose slot is empty, and never fills one from a working file",
  ], "SMB-07's planted_features has drifted from cluster-2.md section 2.2");

  assert.deepEqual(byId.get("SMB-10").planted_features, [
    "18 intake questions and answers for the Okafor household, IQQ-LDB-01 upward in sequence order which is also file order, across four sections: scope and selections, household and access, schedule and communication, site conditions. Seven answers are free text, seven single select, two dates and two numbers, and no answer is empty",
    "one answer volunteering sensitive information unprompted (mobility need affecting site access): exactly one free-text answer carries information outside the scope of its own question. The question asks which hours the crew should not be on site; the answer volunteers that a household member uses a walker and that the hallway and front step must stay clear, which is health information about a third party that nobody asked for and that needs minimal careful handling and must never be copied into general project notes",
    "the volunteered answer hides inside a population of seven: seven of the eighteen answers are free text, so a reviewer who reads every free-text answer reads seven and has to judge six of them in scope",
    "two answers mention a household member other than the signing contact and only one of the two is sensitive, the other being a note that a partner handles the finish selections, so a rule keyed on whether an answer mentions another person over-flags by one",
    "no person is named in any question or any answer: household members appear as relationships and the studio side appears as roles, because canon/people.md seats nobody at co-100 or co-131",
  ], "SMB-10's planted_features has drifted from cluster-2.md section 2.5");
});

test("loadSpecs: no cluster 2 SMB planted feature carries a dash this pack does not use or describes a learner", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  for (const id of SMB_C2) {
    for (const feature of byId.get(id).planted_features) {
      assert.equal(typeof feature, "string", `${id} has a planted feature that is not a string (quote the colon)`);
      assert.ok(feature.trim() !== "", `${id} has an empty planted feature`);
      assert.ok(!feature.includes("\u2014"), `${id} planted feature carries an em dash`);
      assert.ok(!feature.includes("\u2013"), `${id} planted feature carries an en dash`);
      assert.ok(!/learner/i.test(feature), `${id} describes what a learner does, which no file can contain: ${feature}`);
    }
  }
});

// ---------------------------------------------------------------------------
// Small-business cluster 3 (SMB-17 to SMB-22 and SMB-30). Seven artifacts, six
// deterministic and one drafted-frozen, and the first SMB cluster whose files
// are arithmetic: two recomputable identities and one cross-file contradiction.
// The pre-flight is the 2a and 2b one, widened by one clause that C3 needs and
// C2 did not.
//
// The column lists below are the cluster 3 data plan's section 2 lists, typed
// out rather than derived, for the reason the C2 block gives: this file is
// where a spec column list drifting from the plan it was designed against is
// caught, and a check that read the list back out of the file it is checking
// would catch nothing.
//
// The one new clause: C3's `period` is the window the ROWS cover, not the
// widest date any cell carries. An invoice register whose rows are February
// and March carries April due dates, because a due date is the invoice date
// plus the term in calendar days and net terms do not skip a month end, and a
// payment plan carries installments into June. So the C2 "every ISO date in
// the bytes sits inside the period" reading is deliberately NOT extended here;
// what is asserted instead is the shape, the ordering, and the exact values
// the plan pins, which is falsifiable against the plan without being false
// against the bytes.
const SMB_C3_DETERMINISTIC = ["SMB-17", "SMB-18", "SMB-19", "SMB-20", "SMB-21", "SMB-22"];
const SMB_C3_DRAFTED = ["SMB-30"];
const SMB_C3 = [...SMB_C3_DETERMINISTIC, ...SMB_C3_DRAFTED];

/** Data plan section 2, one entry per deterministic id, in the plan's own order. */
const SMB_C3_COLUMNS = {
  // 2.1, the register whose own status column is wrong on exactly one row
  "SMB-17": [
    "invoice_id", "client_canon_id", "client_name", "job_id", "invoice_date",
    "payment_terms", "due_date", "invoice_amount_usd", "invoice_status",
    "milestone_reference", "as_of_date",
  ],
  // 2.2, the mock payment log, eleven SMB-02 payment names plus four process columns
  "SMB-18": [
    "payment_id", "invoice_id", "client_canon_id", "invoice_date", "invoice_amount_usd",
    "due_date", "payment_plan_id", "installment_sequence", "installment_due_date",
    "installment_amount_usd", "settlement_date", "settled_amount_usd", "settlement_status",
    "method", "record_type", "mock_notice",
  ],
  // 2.3, the aging ladder, every cell derived from 2.1 and 2.2
  "SMB-19": [
    "aging_row_id", "client_canon_id", "client_name", "as_of_date", "open_balance_usd",
    "oldest_unsettled_invoice_id", "on_payment_plan", "payment_plan_id",
    "governing_due_date", "days_past_due", "aging_bucket", "dunning_stage",
    "promise_to_pay_date", "promise_amount_usd",
  ],
  // 2.4, the clean time record
  "SMB-20": [
    "entry_id", "week_ending", "job_id", "scope", "change_order_id", "crew_role",
    "crew_slot", "hours", "cost_rate_usd", "entry_cost_usd", "record_type",
  ],
  // 2.5, the expense export with the one miscode in it
  "SMB-21": [
    "expense_id", "expense_date", "job_id", "scope", "change_order_id", "expense_category",
    "counterparty_canon_id", "counterparty_name", "description", "amount_usd",
    "coded_by_role", "record_type",
  ],
  // 2.6, the margin identity, twenty columns
  "SMB-22": [
    "job_id", "client_canon_id", "client_name", "project_name", "start_date",
    "planned_end_date", "as_of_date", "contract_value_usd", "percent_complete",
    "billed_to_date_usd", "accrued_unbilled_usd", "revenue_to_date_usd", "time_cost_usd",
    "expense_cost_usd", "contract_margin_usd", "open_change_order_id",
    "open_change_order_value_usd", "change_order_materiality_usd", "margin_floor_bp",
    "on_track_tolerance_pct",
  ],
};

/** Data plan section 1, the module-to-artifact map, read the other way round. */
const SMB_C3_MODULES = {
  "SMB-17": ["smb-invoice-and-collections-assistant", "smb-cash-flow-and-aging-report"],
  "SMB-18": ["smb-invoice-and-collections-assistant", "smb-cash-flow-and-aging-report"],
  "SMB-19": ["smb-invoice-and-collections-assistant"],
  "SMB-20": ["smb-job-margin-snapshot"],
  "SMB-21": ["smb-job-margin-snapshot"],
  "SMB-22": ["smb-job-margin-snapshot"],
  "SMB-30": ["smb-cash-flow-and-aging-report"],
};

/** Data plan section 2, the periods, as the plan states them. */
const SMB_C3_PERIODS = {
  "SMB-17": { start: "2026-02-01", end: "2026-03-31" },
  "SMB-18": { start: "2026-02-01", end: "2026-03-31" },
  "SMB-19": { start: "2026-03-31", end: "2026-03-31" },
  "SMB-20": { start: "2026-02-06", end: "2026-03-31" },
  "SMB-21": { start: "2026-02-02", end: "2026-03-31" },
  "SMB-22": { start: "2026-03-31", end: "2026-03-31" },
  "SMB-30": { start: "2026-03-30", end: "2026-04-03" },
};

test("loadSpecs: the six deterministic cluster 3 SMB ids carry the data plan's column lists exactly", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  for (const id of SMB_C3_DETERMINISTIC) {
    const spec = byId.get(id);
    assert.ok(spec, `${id} is not in the catalog`);
    assert.equal(spec.generation, "deterministic", `${id} generation`);
    assert.deepEqual(spec.columns, SMB_C3_COLUMNS[id], `${id} columns have drifted from data plan section 2`);
    assert.equal(new Set(spec.columns).size, spec.columns.length, `${id} repeats a column`);
    for (const col of spec.columns) {
      assert.match(col, /^[a-z][a-z0-9_]*$/, `${id} column "${col}" is not snake_case`);
    }
    assert.equal(spec.files, undefined, `${id} is one CSV, so it declares no files map`);
    assert.equal(spec.format, "csv", `${id} format`);
    assert.equal(trackDir(id), "smb", `${id} does not generate into datasets/smb/`);
  }
  // The four counts the plan states in prose, held as numbers so a column
  // added or dropped shows up here as well as in the list above.
  assert.equal(byId.get("SMB-17").columns.length, 11);
  assert.equal(byId.get("SMB-18").columns.length, 16);
  assert.equal(byId.get("SMB-19").columns.length, 14);
  assert.equal(byId.get("SMB-22").columns.length, 20);
});

test("loadSpecs: every SMB-18 column that names an SMB-02 payment field carries the SMB-02 name exactly", () => {
  // C3 redefines nothing: eleven of SMB-02's twelve payment field names are
  // reused unchanged and stage_id is dropped, because it names a stage inside
  // one client record and has no referent in a standalone register. Read out
  // of the shipped field dictionary rather than typed, so an SMB-02 rename
  // fails here rather than leaving two packs quietly disagreeing.
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  const dictionary = readFileSync(
    join(REPO_ROOT, "datasets", "smb", "client-record-template", "client-record-fields.csv"), "utf8"
  ).trim().split("\n").slice(1).map((line) => line.split(","));
  const paymentFields = dictionary.filter((cells) => cells[1] === "payment").map((cells) => cells[0]);
  assert.equal(paymentFields.length, 12, "SMB-02 no longer declares twelve payment fields");

  const smb18 = byId.get("SMB-18").columns;
  const reused = paymentFields.filter((name) => smb18.includes(name));
  assert.equal(reused.length, 11, `SMB-18 reuses ${reused.length} of SMB-02's payment names, expected 11`);
  assert.deepEqual(
    paymentFields.filter((name) => !smb18.includes(name)), ["stage_id"],
    "the one SMB-02 payment field SMB-18 drops is stage_id, and no other"
  );
  // And the client-side names it borrows are SMB-02's too.
  for (const id of ["SMB-17", "SMB-18", "SMB-19", "SMB-22"]) {
    assert.ok(byId.get(id).columns.includes("client_canon_id"), `${id} does not carry SMB-02's client_canon_id`);
  }
});

test("loadSpecs: SMB-30 carries no columns and no files map, and is the cluster's one drafted id", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  for (const id of SMB_C3_DRAFTED) {
    const spec = byId.get(id);
    assert.ok(spec, `${id} is not in the catalog`);
    assert.equal(spec.generation, "drafted-frozen", `${id} generation`);
    assert.equal(spec.columns, undefined, `${id} is a drafted template, so it declares no columns`);
    assert.equal(spec.files, undefined, `${id} is a drafted template, so it declares no files map`);
    assert.equal(spec.format, "markdown", `${id} format`);
  }
  assert.equal(SMB_C3_DRAFTED.length, 1);
  assert.equal(SMB_C3.length, 7);
});

test("loadSpecs: all seven cluster 3 SMB ids declare the period the data plan states", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  for (const id of SMB_C3) {
    const spec = byId.get(id);
    assert.ok(spec.period, `${id} declares no period`);
    assert.match(spec.period.start, /^\d{4}-\d{2}-\d{2}$/, `${id} period.start`);
    assert.match(spec.period.end, /^\d{4}-\d{2}-\d{2}$/, `${id} period.end`);
    assert.ok(spec.period.start <= spec.period.end, `${id} period runs backwards`);
    assert.deepEqual(spec.period, SMB_C3_PERIODS[id], `${id} period has drifted from data plan section 2`);
  }
  // The two snapshot artifacts report as of one day, and they report as of the
  // same day as every other SMB artifact in the pack.
  for (const id of ["SMB-19", "SMB-22"]) {
    assert.equal(byId.get(id).period.start, byId.get(id).period.end, `${id} is an as-of snapshot`);
    assert.equal(byId.get(id).period.end, "2026-03-31", `${id} as-of date`);
  }
  // SMB-30's report week is open at the report date, which is the whole of its
  // provisional rule: the week ends after the pack's as-of date.
  assert.ok(byId.get("SMB-30").period.end > "2026-03-31", "SMB-30's report week closes before the as-of date");
});

test("loadSpecs: the cluster 3 SMB entries name the modules that read them, and the canon entities they join to", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  for (const [id, modules] of Object.entries(SMB_C3_MODULES)) {
    assert.deepEqual(
      byId.get(id).consuming_modules, modules,
      `${id} does not serve exactly the modules data plan section 1 gives it`
    );
  }
  // Three modules over seven artifacts, which is the section 1 map read the
  // other way: a fourth module appearing here means the map moved.
  assert.equal(new Set(Object.values(SMB_C3_MODULES).flat()).size, 3);

  // U-A: the register names all four seated clients, so SMB-17, SMB-18 and
  // SMB-22 widen from [co-100]. The three co-200 band ids the generated
  // households take are NOT canon entities: a reserved-band id is not a seated
  // entity, and canon/companies.md seats none of the three.
  for (const id of ["SMB-17", "SMB-18", "SMB-22"]) {
    assert.deepEqual(
      byId.get(id).canon_entities, ["co-100", "co-002", "co-131", "co-132"],
      `${id} canon_entities has drifted from the U-A widening`
    );
  }
  assert.deepEqual(byId.get("SMB-19").canon_entities, ["co-100", "co-132"], "SMB-19 canon_entities");
  assert.deepEqual(byId.get("SMB-20").canon_entities, ["co-100"], "SMB-20 canon_entities");
  assert.deepEqual(byId.get("SMB-21").canon_entities, ["co-100", "co-133", "co-134"], "SMB-21 canon_entities");
  assert.deepEqual(byId.get("SMB-30").canon_entities, [], "SMB-30 is a template and names no entity");
  for (const id of SMB_C3) {
    for (const canonId of byId.get(id).canon_entities) {
      assert.doesNotMatch(
        canonId, /^co-2[0-4]\d$/,
        `${id} lists the reserved-band id ${canonId} as a canon entity; the band is disclosed in the PR body instead`
      );
    }
  }
});

test("loadSpecs: every cluster 3 SMB spec states its source plan and its planted features in the pack's own shape", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  for (const [i, id] of SMB_C3.entries()) {
    const spec = byId.get(id);
    assert.equal(
      spec.source_plan,
      `smb-implementation-plan + small-business cluster 3 data plan (2.${i + 1})`,
      `${id} does not cite its own section of the cluster 3 data plan`
    );
    assert.ok(spec.planted_features.length > 0, `${id} states no planted features`);
    for (const feature of spec.planted_features) {
      assert.equal(typeof feature, "string", `${id} has a planted feature that is not a string (quote the colon)`);
      assert.ok(feature.trim() !== "", `${id} has an empty planted feature`);
      assert.ok(!feature.includes("\u2014"), `${id} planted feature carries an em dash`);
      assert.ok(!feature.includes("\u2013"), `${id} planted feature carries an en dash`);
      assert.ok(!/learner/i.test(feature), `${id} describes what a learner does, which no file can contain: ${feature}`);
    }
  }
  // Rule R-CENTS, asserted over the prose that states it: no cluster 3 spec
  // describes a percentage column of its own. The two percentage-shaped values
  // C3 carries are an integer percent_complete and an integer basis-point
  // floor, and both are stated as integers.
  assert.ok(
    byId.get("SMB-22").planted_features.some((f) => f.includes("1500 basis points")),
    "SMB-22 no longer states the margin floor in basis points"
  );
  assert.ok(
    byId.get("SMB-22").planted_features.some((f) => f.includes("no column carries a margin percentage")),
    "SMB-22 no longer states the no-quotient rule its own prose is the contract for"
  );
});

// checkPlantedFeature can never return FAIL (cluster 3 data plan fact 0.4), so
// a planted_features string that states a cardinality the bytes contradict is
// caught by nothing at `validate` time. SMB-30's list is the plan's own section
// 2.7 replacement prose, carried verbatim, and it is the one C3 list a keyword
// heuristic will actually read, so it is pinned byte exact here the way the
// three C2a lists are.
test("loadSpecs: SMB-30's planted_features is byte exact against cluster-3.md section 2.7", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  assert.deepEqual(byId.get("SMB-30").planted_features, [
    "a blank weekly owner report template, not a filled report: 14 fields, each with a field id, a required flag, a placeholder token, the source columns it reads and the window it covers, listed in the template's own required-field list at the top and repeated as a body section in the same order. No client, no price, no date and no canon entity appears anywhere in the document",
    "one metric defined twice with a required assumption line: cash on hand counts what has settled, cash after committed payables subtracts what is already owed out, and they are two separate required fields with two separate tokens. A third required field, the cash basis assumption, states which reading the report used, and the template says a report carrying either figure without that sentence is incomplete",
    "a required provisional marker on any figure whose window is open at the report date: the template states that a figure bounded by the report week carries the marker PROVISIONAL beside it and is named with its reason in the provisional figures field, and that no figure carrying that marker may be presented as final. Three of the fourteen fields are week bounded and are the three the rule applies to; the open balance and aging fields are as of the report date and are not provisional",
    "every figure field names the source columns it is computed from: the invoice id, invoice date, due date and invoice amount of the issued invoice register, the settled amount, settlement date and settlement status of the mock payment log, and the installment amount, installment due date and settlement status behind a payment plan, so a figure in a filled report can be traced back to the rows it came from",
    "eleven of the fourteen fields are required and three are optional, and the required-field list is the authority: a field's required flag is stated once, in that table, and the body never restates it. One optional field, next week's draw plan, carries no token and no text, so a rule that finds empty slots without reading the required column returns one and blocks on a field the template was free to leave empty",
    "the closing note states the required behaviour: generation stops and names any required field whose slot is empty, never fills one from a working file, and never presents an open-window figure as final",
  ], "SMB-30's planted_features has drifted from cluster-3.md section 2.7");
});

// C4 wave A: the referral loop's three ids, SMB-23, SMB-24 and SMB-25
// (small-business cluster 4 data plan sections 2.1 to 2.3). SMB-23 is the one
// deterministic id and its column list is pinned twice, to the plan's list and
// to the header the generator actually emits, so a spec edit and a generator
// edit each fail here on their own. The two templates are drafted and carry no
// columns.
const SMB_C4A = ["SMB-23", "SMB-24", "SMB-25"];

const SMB_C4A_COLUMNS = [
  "job_id", "client_canon_id", "client_name", "project_name", "project_type",
  "completion_date", "issue_id", "issue_opened_date", "issue_summary",
  "issue_resolved_date", "as_of_date",
];

const SMB_C4A_PERIOD = { start: "2026-01-09", end: "2026-03-31" };

test("loadSpecs: C4 wave A, SMB-23 carries the plan's eleven columns and they are the emitted header", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  const spec = byId.get("SMB-23");
  assert.ok(spec, "SMB-23 is not in the catalog");
  assert.equal(spec.generation, "deterministic", "SMB-23 generation");
  assert.equal(spec.format, "csv", "SMB-23 format");
  assert.equal(spec.files, undefined, "SMB-23 is one CSV, so it declares no files map");
  assert.equal(trackDir("SMB-23"), "smb", "SMB-23 does not generate into datasets/smb/");
  assert.deepEqual(spec.columns, SMB_C4A_COLUMNS, "SMB-23 columns have drifted from data plan section 2.1");
  const header = readFileSync(
    join(REPO_ROOT, "datasets", "smb", spec.name, `${spec.name}.csv`), "utf8"
  ).split("\n")[0].split(",");
  assert.deepEqual(spec.columns, header, "SMB-23's spec columns disagree with the header on disk");
});

test("loadSpecs: C4 wave A, the two templates are drafted markdown with no columns", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  for (const id of ["SMB-24", "SMB-25"]) {
    const spec = byId.get(id);
    assert.ok(spec, `${id} is not in the catalog`);
    assert.equal(spec.generation, "drafted-frozen", `${id} generation`);
    assert.equal(spec.type, "template", `${id} type`);
    assert.equal(spec.format, "markdown", `${id} format`);
    assert.equal(spec.columns, undefined, `${id} is a drafted template, so it declares no columns`);
    assert.equal(spec.files, undefined, `${id} is a drafted template, so it declares no files map`);
  }
});

test("loadSpecs: C4 wave A, all three ids declare the plan's period, module and canon entities", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  for (const id of SMB_C4A) {
    const spec = byId.get(id);
    assert.deepEqual(spec.period, SMB_C4A_PERIOD, `${id} period has drifted from data plan section 2`);
    assert.deepEqual(spec.consuming_modules, ["smb-post-project-referral-loop"], `${id} consuming_modules`);
    assert.equal(
      spec.source_plan, `smb-implementation-plan + small-business cluster 4 data plan (2.${SMB_C4A.indexOf(id) + 1})`,
      `${id} does not cite its own section of the cluster 4 data plan`
    );
    assert.ok(spec.planted_features.length > 0, `${id} states no planted features`);
    for (const feature of spec.planted_features) {
      assert.equal(typeof feature, "string", `${id} has a planted feature that is not a string`);
      assert.ok(!feature.includes("\u2014"), `${id} planted feature carries an em dash`);
      assert.ok(!feature.includes("\u2013"), `${id} planted feature carries an en dash`);
    }
  }
  // U-B: the log names the office refresh, so SMB-23 widens to co-002.
  assert.deepEqual(byId.get("SMB-23").canon_entities, ["co-100", "co-002", "co-131"], "SMB-23 canon_entities widening");
  assert.deepEqual(byId.get("SMB-24").canon_entities, [], "SMB-24 is a blank template and names no entity");
  assert.deepEqual(byId.get("SMB-25").canon_entities, ["co-135"], "SMB-25 names its referral partner and no other entity");
  // The four January households' band ids are disclosed in the PR body and
  // are never canon entities.
  for (const id of SMB_C4A) {
    for (const canonId of byId.get(id).canon_entities) {
      assert.doesNotMatch(canonId, /^co-2[0-4]\d$/, `${id} lists the reserved-band id ${canonId} as a canon entity`);
    }
  }
});

// C4 wave B: the controls ids, SMB-32, SMB-33 and SMB-34 (small-business
// cluster 4 data plan sections 2.5 to 2.7). SMB-33 is a CSV and its column
// list is pinned to the header the generator emits; SMB-32 is a yaml, which
// carries keys rather than a header, so it declares no columns. SMB-33 and
// SMB-34 are the two ids ruling R6 adopted, with R6's shape.
const SMB_C4B_PERIODS = {
  "SMB-32": { start: "2026-03-23", end: "2026-03-27" },
  "SMB-33": { start: "2026-03-31", end: "2026-03-31" },
  "SMB-34": { start: "2026-02-16", end: "2026-02-16" },
};

test("loadSpecs: C4 wave B, SMB-33's columns are the emitted header and SMB-32 carries none", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  const smb33 = byId.get("SMB-33");
  assert.ok(smb33, "SMB-33 is not in the catalog");
  assert.equal(trackDir("SMB-33"), "smb", "SMB-33 does not generate into datasets/smb/");
  const header = readFileSync(
    join(REPO_ROOT, "datasets", "smb", smb33.name, `${smb33.name}.csv`), "utf8"
  ).split("\n")[0].split(",");
  assert.deepEqual(smb33.columns, header, "SMB-33's spec columns disagree with the header on disk");
  assert.equal(smb33.columns.length, 10, "SMB-33 no longer declares ten columns");

  const smb32 = byId.get("SMB-32");
  assert.ok(smb32, "SMB-32 is not in the catalog");
  assert.equal(smb32.columns, undefined, "SMB-32 is a yaml document, so it declares no columns");
  assert.equal(smb32.files, undefined, "SMB-32 is one yaml document, so it declares no files map");
  assert.equal(smb32.format, "yaml", "SMB-32 format");
  assert.equal(smb32.generation, "deterministic", "SMB-32 generation");
});

test("loadSpecs: C4 wave B, SMB-32, SMB-33 and SMB-34 declare the plan's period", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  for (const [id, period] of Object.entries(SMB_C4B_PERIODS)) {
    assert.deepEqual(byId.get(id).period, period, `${id} period has drifted from data plan section 8.2 (U-S)`);
  }
});

test("loadSpecs: C4 wave B, SMB-33 and SMB-34 carry ruling R6's shape and serve smb-operational-controls", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  const shape = (id) => {
    const s = byId.get(id);
    assert.ok(s, `${id} is not in the catalog`);
    return [s.type, s.format, s.generation, s.canon_entities];
  };
  assert.deepEqual(shape("SMB-33"), ["template", "csv", "deterministic", ["co-100"]], "SMB-33 is not R6's shape");
  assert.deepEqual(
    shape("SMB-34"), ["document", "markdown", "drafted-frozen", ["co-100", "co-131"]], "SMB-34 is not R6's shape"
  );
  for (const id of ["SMB-33", "SMB-34"]) {
    assert.deepEqual(byId.get(id).consuming_modules, ["smb-operational-controls"], `${id} consuming_modules`);
  }
  assert.deepEqual(
    byId.get("SMB-32").consuming_modules, ["smb-client-trust-and-data-guardrails"], "SMB-32 consuming_modules"
  );
  assert.deepEqual(byId.get("SMB-32").canon_entities, [], "SMB-32 is the studio's policy and names no entity");
  for (const id of Object.keys(SMB_C4B_PERIODS)) {
    const spec = byId.get(id);
    assert.ok(spec.planted_features.length > 0, `${id} states no planted features`);
    for (const feature of spec.planted_features) {
      assert.equal(typeof feature, "string", `${id} has a planted feature that is not a string`);
      assert.ok(!feature.includes(String.fromCharCode(0x2014)), `${id} planted feature carries an em dash`);
      assert.ok(!feature.includes(String.fromCharCode(0x2013)), `${id} planted feature carries an en dash`);
    }
  }
});

// checkPlantedFeature can never return FAIL (cluster 4 data plan fact 0.4, the
// same as cluster 3's), so a planted_features string that states a
// cardinality the bytes contradict is caught by nothing at `validate` time.
// C3 pins its one keyword-readable list (SMB-30) byte exact; C4 shipped none
// of its seven pinned, and review data-cluster-4.md SHOULD-FIX 1 found two
// consequences: a count edit in any C4 list survives `npm test` and
// `validate` (M76, M77), and SMB-31's feature 5 was false against the bytes
// (a message restates the contract sum and the deposit percentage, neither an
// invoice, installment or payment amount). All seven C4 lists are pinned here,
// byte exact against the sections of cluster-4.md they carry.
test("loadSpecs: every C4 SMB spec's planted_features is byte exact against cluster-4.md", () => {
  const { byId } = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));

  assert.deepEqual(byId.get("SMB-23").planted_features, [
    "6 completed projects, JOB-LDB-01 upward in job id order, one per project the studio brought to substantial completion in the first quarter of 2026 as the log stands at the 2026-03-31 as-of date: the co-131 renovation and the co-002 office refresh, both read out of the job progress file and the two client records at build time, and four January projects for generated households whose every invoice settled before the invoice register opens on 2026-02-01, which is why the four appear in no other file",
    "completion_date is substantial completion and not closeout: the renovation's equals its last milestone actual completion and the client record's substantial_completion stage, and the office refresh's equals its record's substantial_completion stage, each read from the emitted bytes rather than typed",
    "1 completed project with an unresolved support issue: exactly one row carries an issue_opened_date and no issue_resolved_date, so an automated feedback request to that household would go out while the studio still owes them work, and the request goes to a person first. Three of the six projects carry a support issue at all, and two of the three were resolved inside January, so a loop that blocks on any issue withholds the request from two households who are ready to be asked",
    "the open issue belongs to a project the loop would otherwise select: every project in the log completed inside the quarter and no client of the log carries an open row in the mock payment log at the as-of date",
    "three archetypes, each a population a rule can name: three projects carry no issue, two carry an issue opened after completion and resolved inside January, and one carries the open issue. Every resolved issue opened strictly after its project's completion date and was resolved strictly after it opened",
    "issue_summary describes the issue and never its state: no summary carries a word such as open, resolved, outstanding, pending or fixed, because the two date columns carry the state and a summary that named it would be an answer key",
    "no person is named and no id is un-namespaced: a client is a canon household, a canon business or a generated household drawn through the inquiry queue's screens with the register's three surnames excluded, the four generated clients take co-204 to co-207 from the reserved band, and the support issues are SUP-LDB-01 upward in opened date order",
  ], "SMB-23's planted_features has drifted from cluster-4.md section 2.1");

  assert.deepEqual(byId.get("SMB-24").planted_features, [
    "a blank feedback request template, not a filled request: ten fields, each with a field id, a required flag, a placeholder token, the source columns it reads and the condition it depends on, listed in the template's own required-field list and repeated as a body section in the same order. No client, no price, no date and no canon entity appears anywhere in the document",
    "the gate: a request is drafted only for a completed project whose project log row carries no open support issue, an issue with an opened date and no resolved date, and a project carrying one goes to the owner and no request is drafted",
    "every request is drafted and held for the owner to read and send, and the loop never sends a request",
    "eight fields are required and two are conditional: the resolved issue note is filled whenever the project log carries a resolved issue and says plainly what went wrong and how it was put right, and the AI disclosure line is filled whenever the request was drafted with AI assistance",
    "a request never claims more than the project log states, never offers a gift, a discount or any other incentive for feedback, and never asks for a particular rating",
    "the closing note states the required behaviour: generation stops and names any required field whose slot is empty, and never fills one from a working file",
  ], "SMB-24's planted_features has drifted from cluster-4.md section 2.2");

  assert.deepEqual(byId.get("SMB-25").planted_features, [
    "a blank referral nurture sequence template for the studio's referral partner Fairhaven Realty Group: three touches and eleven fields, each with a field id, the touch it belongs to, a required flag, a placeholder token and the source columns it reads, listed in the template's own required-field list and repeated as body sections in the same order",
    "the sequence starts only for a completed project whose project log row carries no open support issue, and every touch is drafted and held for the owner; nothing in the sequence is sent by the loop",
    "a touch to the referral partner never names the client, the property address or the project name: it carries the project type and the month the project reached completion and nothing else from the project log",
    "the sequence stops as soon as the partner replies or asks for no further messages, and no fee, gift or other incentive is offered for an introduction",
    "ten fields are required and one is conditional: the AI disclosure line is filled on every touch drafted with AI assistance",
    "the closing note states the required behaviour: generation stops and names any required field whose slot is empty, and never fills one from a working file",
  ], "SMB-25's planted_features has drifted from cluster-4.md section 2.3");

  assert.deepEqual(byId.get("SMB-31").planted_features, [
    "a week of outgoing email drafted by the owner and the project lead from 23 March 2026 to 27 March 2026, one file per message, each opening with who it is to, who it is from, the day it was drafted and its purpose, then the message and its sign off by role",
    "1 message drafted with AI assistance that carries no disclosure line: a reply to a general enquiry about a kitchen or bathroom project. Five messages were drafted with AI assistance and four of them end with the line Drafted with AI assistance and reviewed by a person at the studio before sending",
    "1 message carrying client fields beyond its purpose: a visit request to the electrical subcontractor that gives the property and the project and also restates the homeowners' contract sum, their deposit and their payment terms. Three messages carry more than their purpose requires and two of the three stay inside what the purpose permits",
    "1 clean compliant example as a control: a payment reminder drafted with AI assistance that carries its disclosure line and names the open installments on a payment plan by due date and amount, with nothing the plan does not state",
    "every message is signed by role, the owner or the project lead, and every figure a message states is an amount the studio's own records carry: an invoice, installment or payment amount, or, in the message that restates the contract, the contract sum and the deposit percent",
  ], "SMB-31's planted_features has drifted from cluster-4.md section 2.4 (review data-cluster-4.md SHOULD-FIX 1)");

  assert.deepEqual(byId.get("SMB-32").planted_features, [
    "no defects: the config is the rule set the guardrails validator runs every outgoing message against, so a rule planted wrong here would be a broken policy rather than a finding",
    "documented key list, in this order (a YAML document carries keys, not a header row): generated_from_spec, policy_version, as_of, scope, sends_messages, outcomes, data_classes, field_sources, purposes, ai_assistance, never_in_an_outgoing_message, rules",
    "three outcomes, approved, blocked_pending_edit and blocked, and every outcome leaves the draft held for the owner: sends_messages is false and no outcome sends a message",
    "six purposes, each with a data class and a required and a permitted list of client fields, the two lists disjoint; every field name is an SMB-02 client-record field or one of the three payment-plan columns of the mock payment log, and no purpose lists the contract value or the deposit percentage",
    "the AI-assistance rule: a message drafted with AI assistance ends with the disclosure text the file states, byte for byte, and a message drafted without it carries none",
    "four data classes, public, internal, client-confidential and restricted, the same four the owner decision authority matrix uses; restricted content, which is home access codes, alarm codes, financing terms, payment instrument details and crew pay data, never appears in an outgoing message, and a message carrying any of it is blocked",
    "the file names no statute, no regulator and no section of any law: it is the studio's own policy",
  ], "SMB-32's planted_features has drifted from cluster-4.md section 2.5");

  assert.deepEqual(byId.get("SMB-33").planted_features, [
    "no defects; the matrix is the policy a validator runs against",
    "the small-business hard control: every decision that sends money, signs a client or commits a start, completion or handover date to a client carries ai_autonomy_level prohibited at every amount, those three decisions and no others carry prohibited on any row, and sends_money_signs_client_or_commits_date reads yes on exactly those seven rows",
    "four data classes (public, internal, client-confidential, restricted); restricted holds payment details, home and alarm access arrangements, financing terms and crew pay data, and no restricted row is autonomous or review_before_commit",
    "amount bands sized to a nine-person studio, 0.00 to 4999.99, 5000.00 to 29999.99 and 30000.00 upward: the 5000.00 step is the change-order materiality threshold every row of the shipped job progress file carries, so the six change_order_materiality_usd cells are that middle step itself and not a transaction amount sitting on it, and the 30000.00 step is the first round thousand above the largest deposit the pack has invoiced, 29700.00, so every shipped deposit sits in the middle band and no shipped transaction amount in SMB-17 to SMB-22 sits on a band edge",
    "roles only: every approver_role is lead carpenter or project lead and every escalation_role is project lead or owner and strictly more senior than the approver, so the owner is the escalation on every row where the project lead approves; no person is named, because canon/people.md seats nobody at co-100",
    "27 decisions, DA-LDB-01 upward: eight unbanded ordinary decisions, three banded decisions at three bands each, the three hard controls on seven rows and three restricted handling decisions",
  ], "SMB-33's planted_features has drifted from cluster-4.md section 2.6");

  assert.deepEqual(byId.get("SMB-34").planted_features, [
    "RESTRICTED - CLIENT PRIVATE banner on the first line, repeated in the footer of the document",
    "handling instructions that prohibit forwarding, printing and pasting any part of the document into a consumer AI assistant, and keep it inside the studio's own client file",
    "home access codes and an alarm code for 327 Havershill Court: the key safe by the side door, the garage door keypad and the alarm panel, each code a mock value",
    "the client's financing terms: the homeowners pay the second and third draws, $89,100.00, from a renovation loan in their own names at a fixed rate over a stated term, and the deposit and the final draw from their own funds",
    "distribution stated by role only, the owner and the project lead; no crew member is named and no individual is named anywhere",
    "the contract sum of $148,500.00 and the 20 percent deposit agree with the approved proposal",
  ], "SMB-34's planted_features has drifted from cluster-4.md section 2.7");
});

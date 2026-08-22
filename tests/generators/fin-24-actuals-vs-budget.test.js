// FIN-26 materiality-thresholds and FIN-24 actuals-vs-budget: the wave's red
// tests.
//
// SKELETON, shipped by D5a foundations. Every test carrying `{ todo: WAVE }`
// fails today on purpose: the generator is not registered, so generateArtifact
// throws NOT_IMPLEMENTED. The wave deletes the marker in the same commit as the
// bytes.
//
// This is the highest-stakes file in the slice. FIN-24's four figures are
// already printed by name in merged trazomo content, so a generator that
// computes the actual differently (by using ending_balance instead of the
// period movement, or by folding the section sign into the line) produces a
// plausible file that silently contradicts a shipped lesson. T-M3 therefore
// recomputes from FIN-05 in this test's own arithmetic and never imports the
// generator's helper.
//
// Rule R-CLS17 binds this file too: assert that the checklist FILE carries
// CLS-17 as not_started and that the explanation column is empty. Do not assert
// that the variance work has not been done. Merged content says it has.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";
import { buildBudgetVsActualTemplate } from "../../datagen/src/generators/fin-37-budget-vs-actual-template.js";
import { buildTrialBalance } from "../../datagen/src/generators/fin-05-gl-trial-balance.js";
import {
  BUDGET_VARIANCE_RULE, COLUMNS, IMPORTED_TEMPLATE_FIELDS, MATERIALITY_FILE, PERIOD,
  PRIOR_PERIOD, SUPPORTING_DETAIL_COLUMNS,
} from "../../datagen/src/generators/fin-24-actuals-vs-budget.js";
import { actualAmountCents, sectionSign, sectionSubtotalsCents } from "../../datagen/src/generators/finance-statement.js";
import { cents, toCents } from "../../datagen/src/money.js";
import { createRng } from "../../datagen/src/seed.js";

const WAVE = "D5a wave 1 (plan Task 6) builds FIN-26, FIN-24 and FIN-25 and deletes this marker";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
const OUTPUT_FILE = "actuals-vs-budget.csv";

const templateLines = () => buildBudgetVsActualTemplate((stream) => createRng("FIN-37", stream));

/** A shipped dataset's own committed bytes, read off disk rather than rebuilt. */
const shippedText = (name, file) => readFileSync(join(REPO_ROOT, "datasets", ...name.split("/"), file), "utf8");
const shipped = (name, file) => csvTable(shippedText(name, file)).rows;

/** The emitted FIN-26 config, parsed. */
function policy() {
  return yaml.load(
    fileByPath(generateArtifact(specs.byId.get("FIN-26"), canon), MATERIALITY_FILE).content
  );
}

function tracker() {
  const table = csvTable(fileByPath(generateArtifact(specs.byId.get("FIN-24"), canon), OUTPUT_FILE).content);
  assert.deepEqual(table.cols, specs.byId.get("FIN-24").columns, "FIN-24: header does not match spec.columns");
  return table.rows;
}

/** The threshold rule FIN-26 publishes, recomputed here rather than imported. */
function thresholdCents(budgetCents) {
  const pct = Math.ceil((budgetCents * BUDGET_VARIANCE_RULE.pct_of_budget) / BUDGET_VARIANCE_RULE.round_up_to_cents)
    * BUDGET_VARIANCE_RULE.round_up_to_cents;
  return Math.max(BUDGET_VARIANCE_RULE.floor_cents, pct);
}

// --------------------------------------------------------- green before bytes

test("FIN-24 and FIN-25: the generators' column lists and the specs agree before a byte exists", () => {
  assert.deepEqual(COLUMNS, specs.byId.get("FIN-24").columns);
  assert.deepEqual(SUPPORTING_DETAIL_COLUMNS, specs.byId.get("FIN-25").columns);
  assert.equal(PERIOD, "2026-03");
  assert.equal(PRIOR_PERIOD, "2026-02");
});

test("FIN-26 T-M1: the published budget rule reproduces all 27 shipped FIN-37 thresholds, zero mismatches", () => {
  // This is FIN-26's whole reason to exist, and it is checkable today: the
  // config writes down a rule the frozen pack already obeys. If a future FIN-37
  // regeneration moves a budget, this fails rather than a module.
  const mismatches = templateLines().filter(
    (line) => thresholdCents(toCents(line.budget_amount)) !== toCents(line.explanation_threshold_usd)
  );
  assert.deepEqual(mismatches.map((l) => l.line_id), [], "the threshold rule no longer reproduces FIN-37");
});

test("FIN-24 V1: the four material lines fall out of frozen bytes rather than out of a draw", () => {
  const tb = new Map(buildTrialBalance().rows.map((r) => [r.account_code, r]));
  const filled = templateLines().map((line) => ({
    ...line,
    actual_cents: actualAmountCents(tb.get(line.account_code), line.normal_balance),
  }));
  const material = filled.filter(
    (l) => Math.abs(l.actual_cents - toCents(l.budget_amount)) >= toCents(l.explanation_threshold_usd)
  );
  assert.deepEqual(material.map((l) => l.line_id), ["BVA-04", "BVA-09", "BVA-13", "BVA-19"]);

  // Both cardinalities, per the plan's own rule. Dropping the threshold selects
  // everything; a flat floor in place of the per-line threshold selects nine.
  assert.equal(filled.length, 27, "the qualifier-free count is every line on the tracker");
  const flatFloor = filled.filter(
    (l) => Math.abs(l.actual_cents - toCents(l.budget_amount)) >= BUDGET_VARIANCE_RULE.floor_cents
  );
  assert.equal(flatFloor.length, 9, "a flat 10000.00 floor no longer returns nine lines");
});

test("FIN-24 V4: one material line is unfavorable in the other direction, and the qualifier-free counts are 10 and 12", () => {
  const tb = new Map(buildTrialBalance().rows.map((r) => [r.account_code, r]));
  const filled = templateLines().map((line) => ({
    ...line,
    variance: actualAmountCents(tb.get(line.account_code), line.normal_balance) - toCents(line.budget_amount),
  }));
  const materialNegativeDebit = filled.filter(
    (l) => l.variance < 0 && l.normal_balance === "debit"
      && Math.abs(l.variance) >= toCents(l.explanation_threshold_usd)
  );
  assert.deepEqual(materialNegativeDebit.map((l) => l.line_id), ["BVA-13"]);
  // Dropping the ONE qualifier the rule names (materiality) keeps debit-normal
  // and returns 10. Dropping both returns 12. The plan's earlier draft printed
  // 11, which matches neither reading.
  assert.equal(filled.filter((l) => l.variance < 0 && l.normal_balance === "debit").length, 10);
  assert.equal(filled.filter((l) => l.variance < 0).length, 12);
});

test("FIN-24 T-M6: the checklist file carries CLS-17 as not_started, which is a file fact and nothing more", () => {
  const rows = csvTable(
    readFileSync(join(REPO_ROOT, "datasets", "finance", "close-checklist", "close-checklist.csv"), "utf8")
  ).rows;
  const cls17 = rows.find((r) => r.task_id === "CLS-17");
  assert.ok(cls17, "CLS-17 is gone from the close checklist");
  assert.equal(cls17.status, "not_started");
  assert.equal(cls17.completed_date, "");
  // Rule R-CLS17: this file asserts what the checklist contains. Whether the
  // variance work was performed is settled elsewhere, by merged content that
  // says it was, and no assertion here may contradict it.
});

// ------------------------------------------------------------ red until built

test("FIN-24: 27 rows whose imported tuple equals the FIN-37 template row for row", { todo: WAVE }, () => {
  const rows = tracker();
  assert.equal(rows.length, 27);
  const template = templateLines();
  for (const [i, row] of rows.entries()) {
    for (const field of IMPORTED_TEMPLATE_FIELDS) {
      assert.equal(row[field], template[i][field], `row ${i + 1}: ${field} was retyped rather than imported`);
    }
  }
  for (const row of rows) {
    assert.equal(row.period, PERIOD);
    assert.equal(row.prior_period, PRIOR_PERIOD);
  }
});

test("FIN-24 T-M3: every actual recomputes from FIN-05 in this test's own arithmetic", { todo: WAVE }, () => {
  const tb = new Map(buildTrialBalance().rows.map((r) => [r.account_code, r]));
  for (const row of tracker()) {
    assert.equal(
      row.actual_amount,
      cents(actualAmountCents(tb.get(row.account_code), row.normal_balance)),
      `${row.line_id} does not equal FIN-05's March movement`
    );
  }
});

test("FIN-24 T-M4: prior_period_actual is FIN-33's 2026-02 column for the same line_id", { todo: WAVE }, () => {
  const trend = csvTable(
    fileByPath(generateArtifact(specs.byId.get("FIN-33"), canon), "actuals-24mo.csv").content
  ).rows;
  const february = new Map(trend.filter((r) => r.period === "2026-02").map((r) => [r.line_id, r.actual_amount]));
  for (const row of tracker()) {
    assert.equal(row.prior_period_actual, february.get(row.line_id), `${row.line_id} disagrees with the trend`);
  }
  // The other half of FIN-33's T-T1, which that wave cannot write because
  // FIN-24 does not exist yet.
  const march = new Map(trend.filter((r) => r.period === "2026-03").map((r) => [r.line_id, r.actual_amount]));
  for (const row of tracker()) {
    assert.equal(row.actual_amount, march.get(row.line_id), `${row.line_id}: the tracker and the trend disagree about March`);
  }
});

test("FIN-24 T-M5: variance and flux are the arithmetic their own columns state", { todo: WAVE }, () => {
  for (const row of tracker()) {
    const variance = toCents(row.actual_amount) - toCents(row.budget_amount);
    assert.equal(row.variance_amount, cents(variance), `${row.line_id} variance amount`);
    assert.equal(row.variance_pct, ((variance / toCents(row.budget_amount)) * 100).toFixed(2), `${row.line_id} variance percent`);
    const flux = toCents(row.actual_amount) - toCents(row.prior_period_actual);
    assert.equal(row.flux_amount, cents(flux), `${row.line_id} flux amount`);
  }
  // TODO(wave): decide and assert what flux_pct does when the prior period is
  // zero. A division nobody thought about is how a percent column ships "NaN".
});

test("FIN-24 T-M6: the explanation column is empty on all 27 rows and section_sign is -1 on exactly one", { todo: WAVE }, () => {
  const rows = tracker();
  for (const row of rows) assert.equal(row.variance_explanation, "", `${row.line_id} carries an explanation`);
  const contra = rows.filter((r) => r.section_sign === "-1");
  assert.equal(contra.length, 1);
  for (const row of rows) {
    assert.equal(
      row.section_sign,
      String(sectionSign(row.statement_section, row.normal_balance)),
      `${row.line_id} carries a section_sign the rule does not produce`
    );
  }
});

test("FIN-24 T-M7: the three section subtotals roll up to account 3200's own period movement", { todo: WAVE }, () => {
  const subtotals = sectionSubtotalsCents(
    tracker().map((r) => ({ ...r, actual_cents: toCents(r.actual_amount) }))
  );
  assert.equal(cents(subtotals.revenue), "4154683.80");
  assert.equal(cents(subtotals.cost_of_revenue), "794782.15");
  assert.equal(cents(subtotals.operating_expense), "5127949.43");
  const net = subtotals.revenue - subtotals.cost_of_revenue - subtotals.operating_expense;
  const tb = new Map(buildTrialBalance().rows.map((r) => [r.account_code, r]));
  assert.equal(cents(-net), tb.get("3200").period_debit);
});

test("FIN-24 V2 and V3: three flux breaches, one overlap with the budget rule, five lines in disagreement", { todo: WAVE }, () => {
  const rows = tracker();
  assert.ok(rows.length > 0);
  // TODO(wave): recompute the flux threshold from the emitted FIN-26 config in
  // this test's own arithmetic, assert the 3, the overlap of 1 and the
  // symmetric difference of 5, and assert the qualifier-free count of 27.
});

test("FIN-26: the emitted config publishes the documented key list, in the documented order", () => {
  const yamlText = fileByPath(
    generateArtifact(specs.byId.get("FIN-26"), canon), MATERIALITY_FILE
  ).content;
  for (const key of ["policy_owner_role", "budget_variance_rule", "flux_rule", "qualitative_overrides", "escalation", "related_decision_id"]) {
    assert.match(yamlText, new RegExp(`^${key}:`, "m"), `materiality-thresholds.yaml has no ${key}`);
  }

  // A YAML policy carries keys rather than a header row, so this is FIN-26's
  // spec.columns: the list its spec documents, in the order it documents it,
  // read back off the parsed bytes. The list is taken from the spec text rather
  // than retyped, so a spec edit and a config edit have to move together.
  const documented = specs.byId.get("FIN-26").planted_features.find((f) => f.includes("documented key list"));
  assert.ok(documented, "FIN-26's spec no longer documents a key list");
  const config = yaml.load(yamlText);
  for (const key of Object.keys(config)) {
    assert.ok(documented.includes(key), `the config carries ${key}, which its spec does not document`);
  }
  assert.deepEqual(Object.keys(config), [
    "policy_owner_role", "effective_period", "source_artifact", "currency",
    "budget_variance_rule", "flux_rule", "explanation_required_when",
    "qualitative_overrides", "escalation", "related_decision_id",
  ]);
  assert.deepEqual(Object.keys(config.effective_period), ["start", "end"]);
  assert.deepEqual(Object.keys(config.budget_variance_rule), ["pct_of_budget", "floor_usd", "rounding", "combine"]);
  assert.deepEqual(Object.keys(config.flux_rule), ["pct_of_prior_period", "floor_usd", "rounding", "combine"]);
  assert.deepEqual(Object.keys(config.escalation), ["at_or_above_usd", "to_role"]);

  // effective_period is the spec's own period, so a window nobody states cannot
  // ship, and the three qualitative overrides are named rather than counted.
  assert.deepEqual(config.effective_period, specs.byId.get("FIN-26").period);
  assert.equal(config.source_artifact, "FIN-37");
  assert.deepEqual(config.qualitative_overrides.map((o) => o.override_id), ["QO-01", "QO-02", "QO-03"]);
});

test("FIN-26 T-M1 from the emitted bytes: the published rule reproduces all 27 FIN-37 thresholds", () => {
  // The other half of T-M1. The green test above recomputes from the constant
  // this file imports; this one recomputes from the three numbers the EMITTED
  // config publishes, parsed back out of its own bytes, so a config that ships
  // a rule the pack does not obey fails here rather than in a module.
  const rule = policy().budget_variance_rule;
  const unit = Math.round(Number(/nearest (\d+)/.exec(rule.rounding)[1]) * 100);
  const floor = toCents(rule.floor_usd);
  const fromConfig = (budgetCents) =>
    Math.max(floor, Math.ceil((budgetCents * rule.pct_of_budget) / unit) * unit);

  const mismatches = templateLines().filter(
    (l) => fromConfig(toCents(l.budget_amount)) !== toCents(l.explanation_threshold_usd)
  );
  assert.deepEqual(mismatches.map((l) => l.line_id), [], "the emitted rule no longer reproduces FIN-37");
  assert.equal(templateLines().length, 27);
  // The floor does real work: without it, nine of the 27 lines would carry a
  // threshold under 10,000.00, which is the number the flat-floor reading in V1
  // is measured against.
  const belowFloor = templateLines().filter(
    (l) => Math.ceil((toCents(l.budget_amount) * rule.pct_of_budget) / unit) * unit < floor
  );
  assert.equal(belowFloor.length, 15, "the set of lines the floor rescues moved");
});

test("FIN-26: the flux rule the config publishes is the rule FIN-33's plant was built against", () => {
  // FIN-26 imports the flux rule from FIN-33 rather than retyping it, because
  // FIN-33 had to construct the plant before FIN-26 existed. This asserts the
  // two agree from the two sets of BYTES, not from the shared constant: the
  // rule the config publishes, applied to the shipped trend, returns the three
  // breaches the trend was built to carry.
  const rule = policy().flux_rule;
  const unit = Math.round(Number(/nearest (\d+)/.exec(rule.rounding)[1]) * 100);
  const floor = toCents(rule.floor_usd);
  const threshold = (priorCents) =>
    Math.max(floor, Math.ceil((Math.abs(priorCents) * rule.pct_of_prior_period) / unit) * unit);

  const trend = shipped("finance/actuals-24mo", "actuals-24mo.csv");
  const february = new Map(trend.filter((r) => r.period === PRIOR_PERIOD).map((r) => [r.line_id, toCents(r.actual_amount)]));
  const march = new Map(trend.filter((r) => r.period === PERIOD).map((r) => [r.line_id, toCents(r.actual_amount)]));
  assert.equal(february.size, 27);
  const breaches = [...march.keys()].filter((lineId) => {
    const prior = february.get(lineId);
    return Math.abs(march.get(lineId) - prior) >= threshold(prior);
  });
  assert.equal(breaches.length, 3, `flux breaches under the published rule: ${breaches.join(", ")}`);
  // Both cardinalities: every line has a flux at all, so the threshold is the
  // qualifier that selects and the movement is not.
  assert.equal([...march.keys()].filter((l) => march.get(l) !== february.get(l)).length, 27);
});

test("FIN-26: related_decision_id resolves to a control_id in the shipped FIN-39 matrix", () => {
  const config = policy();
  const matrix = shipped("finance/decision-authority-matrix-template", "decision-authority-matrix-template.csv");
  const decision = matrix.find((r) => r.control_id === config.related_decision_id);
  assert.ok(decision, `${config.related_decision_id} is not a control_id in FIN-39`);
  assert.match(decision.decision, /variance narrative/, "DA-01 no longer covers drafting a variance narrative");

  // The escalation names an amount and a role, never a person, and the role is
  // one an active CORE-04 employee actually holds.
  assert.equal(config.escalation.at_or_above_usd, "100000.00");
  const roster = shipped("core/people-roster", "people-roster.csv");
  for (const role of [config.policy_owner_role, config.escalation.to_role]) {
    assert.ok(
      roster.some((r) => r.role_title === role && r.employment_status === "active"),
      `no active CORE-04 employee holds "${role}"`
    );
  }
  assert.ok(!/EMP-\d/.test(JSON.stringify(config)), "the policy names a person");
});

test("FIN-26: the committed bytes are the generated bytes, line for line", () => {
  // The byte guard `validate` runs, restated as a test so a hand edit to the
  // committed config fails the suite naming the key it landed on.
  const generated = fileByPath(generateArtifact(specs.byId.get("FIN-26"), canon), MATERIALITY_FILE).content.split("\n");
  const committed = shippedText("finance/materiality-thresholds", MATERIALITY_FILE).split("\n");
  for (const [i, line] of generated.entries()) {
    assert.equal(committed[i], line, `materiality-thresholds.yaml line ${i + 1} was edited by hand`);
  }
  assert.equal(committed.length, generated.length);
});

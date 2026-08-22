// FIN-26 materiality-thresholds and FIN-24 actuals-vs-budget: the wave's red
// tests.
//
// Built by D5a wave 1. Every plant is re-derived here from the emitted bytes by
// its own stated rule, never by naming the row that carries it and never by
// importing the predicate the generator applied: a test that imports the rule
// it is checking cannot disagree with the generator. The sign rule, the section
// subtotal, the budget threshold and the flux threshold are all spelled out in
// this file's own arithmetic.
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
import { actualAmountCents } from "../../datagen/src/generators/finance-statement.js";
import { cents, toCents } from "../../datagen/src/money.js";
import { createRng } from "../../datagen/src/seed.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
const OUTPUT_FILE = "actuals-vs-budget.csv";

const templateLines = () => buildBudgetVsActualTemplate((stream) => createRng("FIN-37", stream));

/**
 * The eight-value tuple FIN-24 imports from the FIN-37 template, written out
 * here rather than looped from the generator's own list. Looping the imported
 * list made the tuple check constant == constant: dropping owner_role from it
 * shipped owner_role empty on all 27 rows and the suite stayed green.
 */
const TEMPLATE_FIELDS = [
  "line_id", "account_code", "account_name", "statement_section", "normal_balance",
  "owner_role", "budget_amount", "explanation_threshold_usd",
];

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
  assert.deepEqual(
    IMPORTED_TEMPLATE_FIELDS, TEMPLATE_FIELDS,
    "the imported tuple changed shape, so the tuple check would stop covering a column"
  );
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

test("FIN-24: 27 rows whose imported tuple equals the FIN-37 template row for row", () => {
  const rows = tracker();
  assert.equal(rows.length, 27);
  const template = templateLines();
  for (const [i, row] of rows.entries()) {
    for (const field of TEMPLATE_FIELDS) {
      assert.equal(row[field], template[i][field], `row ${i + 1}: ${field} was retyped rather than imported`);
      assert.notEqual(row[field], "", `${row.line_id}: ${field} is empty, so the tuple lost a column`);
      assert.notEqual(row[field], undefined, `${row.line_id}: ${field} is absent from the emitted row`);
    }
  }
  for (const row of rows) {
    assert.equal(row.period, PERIOD);
    assert.equal(row.prior_period, PRIOR_PERIOD);
  }
});

test("FIN-24 T-M3: every actual recomputes from the shipped FIN-05 bytes in this test's own arithmetic", () => {
  // The highest-stakes assertion in the slice, and the reason it is written out
  // longhand. actualAmountCents() is the rule the GENERATOR applies, so calling
  // it here would make this test agree with the generator by construction. The
  // sign rule is therefore spelled out below, over the committed FIN-05 CSV
  // rather than over its builder: period_debit less period_credit on a
  // debit-normal line, the reverse on a credit-normal one. A generator that
  // used ending_balance, or folded the section sign into the line, would
  // produce a plausible file and fail here.
  const tb = new Map(shipped("finance/gl-trial-balance", "gl-trial-balance.csv").map((r) => [r.account_code, r]));
  const rows = tracker();
  for (const row of rows) {
    const source = tb.get(row.account_code);
    assert.ok(source, `${row.line_id} names account ${row.account_code}, which FIN-05 does not carry`);
    const debit = toCents(source.period_debit);
    const credit = toCents(source.period_credit);
    const movement = row.normal_balance === "debit" ? debit - credit : credit - debit;
    assert.equal(row.actual_amount, cents(movement), `${row.line_id} does not equal FIN-05's March movement`);
    // The mistake the plan names: ending_balance is a year-to-date figure, and
    // on every line of this tracker it is a different number from the movement.
    assert.notEqual(row.actual_amount, source.ending_balance, `${row.line_id}: the actual reads as a year-to-date balance`);
  }

  // The four material figures, recomputed the same way, are the four a merged
  // trazomo module already prints by name (finance-google-workspace lesson 02).
  // They are the reason this file cannot be regenerated casually.
  const material = rows
    .filter((r) => Math.abs(toCents(r.variance_amount)) >= toCents(r.explanation_threshold_usd))
    .map((r) => {
      const source = tb.get(r.account_code);
      const debit = toCents(source.period_debit);
      const credit = toCents(source.period_credit);
      const movement = r.normal_balance === "debit" ? debit - credit : credit - debit;
      const variance = movement - toCents(r.budget_amount);
      return [r.line_id, cents(variance), ((variance / toCents(r.budget_amount)) * 100).toFixed(2)];
    });
  assert.deepEqual(material, [
    ["BVA-04", "23710.01", "5.44"],
    ["BVA-09", "17518.43", "5.74"],
    ["BVA-13", "-17134.55", "-5.86"],
    ["BVA-19", "47043.50", "7.11"],
  ]);
});

test("FIN-24 T-M4: prior_period_actual is FIN-33's 2026-02 column for the same line_id", () => {
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

test("FIN-24 T-M5: variance and flux are the arithmetic their own columns state", () => {
  for (const row of tracker()) {
    const variance = toCents(row.actual_amount) - toCents(row.budget_amount);
    assert.equal(row.variance_amount, cents(variance), `${row.line_id} variance amount`);
    assert.equal(row.variance_pct, ((variance / toCents(row.budget_amount)) * 100).toFixed(2), `${row.line_id} variance percent`);
    const flux = toCents(row.actual_amount) - toCents(row.prior_period_actual);
    assert.equal(row.flux_amount, cents(flux), `${row.line_id} flux amount`);
    assert.equal(row.flux_pct, ((flux / toCents(row.prior_period_actual)) * 100).toFixed(2), `${row.line_id} flux percent`);
  }
  // The zero-base question the skeleton left open, settled rather than skipped:
  // both percent columns divide, so both denominators are asserted non-zero on
  // every row and the builder refuses to emit a row where either is zero. That
  // is why no cell here can ship "NaN" or an empty percent, and it is a claim
  // about the whole column rather than about the 27 rows that exist today.
  for (const row of tracker()) {
    assert.notEqual(toCents(row.budget_amount), 0, `${row.line_id} has a zero budget, so variance_pct has no base`);
    assert.notEqual(toCents(row.prior_period_actual), 0, `${row.line_id} has a zero prior period, so flux_pct has no base`);
    for (const col of ["variance_pct", "flux_pct"]) {
      assert.match(row[col], /^-?\d+\.\d{2}$/, `${row.line_id} ${col} is not a 2dp number`);
    }
  }
});

test("FIN-24 T-M6: the explanation column is empty on all 27 rows and section_sign is -1 on exactly one", () => {
  // The natural direction of each statement section, written out here rather
  // than imported, so this file can disagree with the generator about the sign.
  const NATURAL = { revenue: "credit", cost_of_revenue: "debit", operating_expense: "debit" };
  const rows = tracker();
  for (const row of rows) assert.equal(row.variance_explanation, "", `${row.line_id} carries an explanation`);
  const contra = rows.filter((r) => r.section_sign === "-1");
  assert.equal(contra.length, 1);
  for (const row of rows) {
    assert.equal(
      row.section_sign,
      row.normal_balance === NATURAL[row.statement_section] ? "1" : "-1",
      `${row.line_id} carries a section_sign the rule does not produce`
    );
  }
  // Rule R-CLS17, the other half: the checklist FILE carries CLS-17 as
  // not_started. That is all this file may say. Whether the variance work was
  // performed is settled elsewhere, by merged content that says it was.
  const cls17 = shipped("finance/close-checklist", "close-checklist.csv").find((r) => r.task_id === "CLS-17");
  assert.equal(cls17.status, "not_started");
});

test("FIN-24 T-M7: the three section subtotals roll up to account 3200's own period movement", () => {
  // One pass over the file with no external table, which is what shipping
  // section_sign as a column buys. Summed here rather than by the generator's
  // own subtotal helper, so the two can disagree.
  const subtotals = { revenue: 0, cost_of_revenue: 0, operating_expense: 0 };
  for (const row of tracker()) {
    subtotals[row.statement_section] += toCents(row.actual_amount) * Number(row.section_sign);
  }
  assert.equal(cents(subtotals.revenue), "4154683.80");
  assert.equal(cents(subtotals.cost_of_revenue), "794782.15");
  assert.equal(cents(subtotals.operating_expense), "5127949.43");

  // Skipping section_sign returns 4245474.82 for revenue, a gap of exactly
  // twice the contra line. Asserted so the shortcut fails loudly.
  let unsigned = 0;
  for (const row of tracker()) {
    if (row.statement_section === "revenue") unsigned += toCents(row.actual_amount);
  }
  assert.notEqual(cents(unsigned), cents(subtotals.revenue));
  const contra = tracker().find((r) => r.section_sign === "-1");
  assert.equal(unsigned - subtotals.revenue, 2 * toCents(contra.actual_amount));

  const net = subtotals.revenue - subtotals.cost_of_revenue - subtotals.operating_expense;
  const tb = new Map(shipped("finance/gl-trial-balance", "gl-trial-balance.csv").map((r) => [r.account_code, r]));
  assert.equal(cents(-net), tb.get("3200").period_debit);
});

test("FIN-24 V2 and V3: three flux breaches, one overlap with the budget rule, five lines in disagreement", () => {
  // The flux threshold is recomputed here from the three numbers the EMITTED
  // FIN-26 config publishes, in this file's own arithmetic. Nothing is imported
  // from the generator that placed the plant.
  const rule = policy().flux_rule;
  const unit = Math.round(Number(/nearest (\d+)/.exec(rule.rounding)[1]) * 100);
  const floor = toCents(rule.floor_usd);
  const fluxThreshold = (priorCents) =>
    Math.max(floor, Math.ceil((Math.abs(priorCents) * rule.pct_of_prior_period) / unit) * unit);

  const rows = tracker();
  const fluxBreach = rows.filter(
    (r) => Math.abs(toCents(r.flux_amount)) >= fluxThreshold(toCents(r.prior_period_actual))
  ).map((r) => r.line_id);
  const budgetBreach = rows.filter(
    (r) => Math.abs(toCents(r.variance_amount)) >= toCents(r.explanation_threshold_usd)
  ).map((r) => r.line_id);

  // V2, both cardinalities: 3 under the rule, all 27 with no threshold at all.
  assert.equal(fluxBreach.length, 3, `flux breaches: ${fluxBreach.join(", ")}`);
  assert.equal(rows.filter((r) => toCents(r.flux_amount) !== 0).length, 27, "a line with no flux has nothing to threshold");

  // V3, both cardinalities: the two rules agree on exactly one line and
  // disagree on five. A reader who assumes they agree finds 0 disagreements,
  // which is the qualifier-free reading the plan names.
  const both = fluxBreach.filter((l) => budgetBreach.includes(l));
  assert.equal(both.length, 1, `lines breaching both rules: ${both.join(", ")}`);
  const disagree = [...new Set([...fluxBreach, ...budgetBreach])].filter((l) => !both.includes(l));
  assert.equal(disagree.length, 5, `lines breaching exactly one rule: ${disagree.join(", ")}`);
  assert.notDeepEqual([...fluxBreach].sort(), [...budgetBreach].sort(), "the two rules cannot be assumed to agree");

  // The account set FIN-25 covers falls out of this and out of nothing else:
  // the four budget-material lines plus the two that breach only the flux rule.
  const accountFor = new Map(rows.map((r) => [r.line_id, r.account_code]));
  const investigated = [...budgetBreach, ...fluxBreach.filter((l) => !both.includes(l))].map((l) => accountFor.get(l));
  assert.equal(new Set(investigated).size, 6);
});

test("FIN-24: the committed bytes are the generated bytes, row for row", () => {
  // The byte guard `validate` runs, restated as a test so a hand edit to the
  // committed tracker fails the suite naming the line_id it landed on.
  const generated = tracker();
  const committed = shipped("finance/actuals-vs-budget", OUTPUT_FILE);
  assert.equal(committed.length, generated.length);
  for (const [i, row] of generated.entries()) {
    assert.deepEqual(committed[i], row, `actuals-vs-budget.csv row ${row.line_id} was edited by hand`);
  }
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
  // The floor does real work: without it, fifteen of the 27 lines would carry a
  // threshold under 10,000.00. That is not V1's flat-floor contrast, which is
  // nine: nine lines are MATERIAL under a flat 10,000.00 floor, fifteen are the
  // lines whose percentage threshold the floor lifts.
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

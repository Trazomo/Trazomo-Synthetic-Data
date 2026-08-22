// FIN-29 approved-metrics-pack: the wave's tests.
//
// Built by D5a wave D. Every one of the twelve values is recomputed here from
// the committed FIN-04, FIN-05 and FIN-24 bytes in this file's own arithmetic,
// and the sign convention each recomputation uses is chosen by reading the
// metric's own `basis` string rather than by asking the generator.
//
// The mutation this file has to catch: a metric edited by hand so the pack and
// the frozen FIN-40 excerpt stop agreeing on the two board figures. Those two
// are published to a board in rounded form by a document that is already
// frozen, and agreeing with them is the artifact's whole point.
//
// T-R1's rule for the wave: recompute every value from the metric's own named
// source_artifact, under the R-SIGN convention the metric's own `basis` string
// names. The test is authored from the basis string so it can disagree with the
// generator about the contra line rather than inherit its mistake.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";
import { buildTrialBalance } from "../../datagen/src/generators/fin-05-gl-trial-balance.js";
import { buildBudgetVsActualTemplate } from "../../datagen/src/generators/fin-37-budget-vs-actual-template.js";
import {
  APPROVAL, BOARD_REPORTED_METRICS, DISCLOSURE_CLASSES, METRIC_IDS, METRIC_KEYS, OUTPUT_FILE,
  RELATED_DECISION_ID, UNITS,
} from "../../datagen/src/generators/fin-29-approved-metrics-pack.js";
import { actualAmountCents, sectionSign } from "../../datagen/src/generators/finance-statement.js";
import { cents, toCents } from "../../datagen/src/money.js";
import { createRng } from "../../datagen/src/seed.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));

const packText = () => fileByPath(generateArtifact(specs.byId.get("FIN-29"), canon), OUTPUT_FILE).content;
const pack = () => JSON.parse(packText());

/** A shipped dataset's own committed bytes, read off disk rather than rebuilt. */
const shippedText = (name, file) => readFileSync(join(REPO_ROOT, "datasets", ...name.split("/"), file), "utf8");
const shipped = (name, file) => csvTable(shippedText(name, file)).rows;

/** The frozen board excerpt, which is where the classification banner lives. */
const excerptText = () => readFileSync(join(REPO_ROOT, "artifacts", "FIN-40", "mnpi-flagged-draft.md"), "utf8");

// --------------------------------------------------------- green before bytes

test("FIN-29: the twelve metric ids are fixed and unique before a byte exists", () => {
  assert.equal(METRIC_IDS.length, 12);
  assert.equal(new Set(METRIC_IDS).size, 12);
  assert.equal(APPROVAL.source_close_task, "CLS-16", "eleven of the twelve metrics come off the pre-close trial balance");
  assert.equal(APPROVAL.source_artifact, "FIN-05", "the artifact pointer is what no checklist status can contradict");
});

test("FIN-29 U11: the close task the pack sources its approval from is in_progress, not complete", () => {
  // The caveat the plan's first draft missed. The pack has to carry the status
  // beside the task id so the file states the tension rather than hiding it.
  const checklist = csvTable(
    readFileSync(join(REPO_ROOT, "datasets", "finance", "close-checklist", "close-checklist.csv"), "utf8")
  ).rows;
  const task = checklist.find((r) => r.task_id === APPROVAL.source_close_task);
  assert.ok(task, `${APPROVAL.source_close_task} is gone from the checklist`);
  assert.equal(task.status, "in_progress");
});

test("FIN-29 T-R2 and T-R3: the frozen FIN-40 excerpt already publishes the two headline figures and the banner", () => {
  const excerpt = readFileSync(join(REPO_ROOT, "artifacts", "FIN-40", "mnpi-flagged-draft.md"), "utf8");
  assert.match(excerpt, /12\.2 million/);
  assert.match(excerpt, /5\.2 million/);
  const tb = new Map(buildTrialBalance().rows.map((r) => [r.account_code, r]));
  // Byte note, and it corrects the plan. Account 3200 is credit-normal, so its
  // ending_balance cell carries the SIGNED -5243082.89 and the positive
  // magnitude the pack publishes is in ending_debit. The plan's metric table
  // says "FIN-05 account 3200 ending_balance" and means the magnitude. A
  // generator that copies the ending_balance cell ships a negative net loss.
  assert.equal(tb.get("3200").ending_balance, "-5243082.89", "the quarter's net loss moved");
  assert.equal(tb.get("3200").ending_debit, "5243082.89", "the magnitude the metrics pack publishes");
  assert.equal(tb.get("3200").ending_credit, "");
  // T-R2. Rounded to the nearest hundred thousand, as FIN-40 itself states,
  // and rounded from the values the PACK emits rather than from two literals
  // that would agree with the excerpt no matter what the pack shipped.
  const emitted = new Map(pack().metrics.map((m) => [m.metric_id, m.value]));
  const inMillions = (metricId) => {
    const value = emitted.get(metricId);
    assert.ok(value, `${metricId} is no longer a metric in the pack`);
    return (Number(value) / 1e6).toFixed(1);
  };
  assert.equal(inMillions("net_loss_q1"), "5.2", "the emitted net loss no longer rounds to FIN-40's figure");
  assert.equal(inMillions("revenue_net_q1"), "12.2", "the emitted revenue no longer rounds to FIN-40's figure");
  assert.equal(emitted.get("net_loss_q1"), "5243082.89");
  assert.equal(emitted.get("revenue_net_q1"), "12218645.67");
  // T-R3. The classification is FIN-40's own banner string, read out of the
  // excerpt rather than retyped, and it is the same string the excerpt shows at
  // its head and in its Classification line.
  const banner = /^\*\*Classification:\*\*\s*(.+)$/m.exec(excerpt)[1].trim();
  assert.equal(pack().classification, banner);
  assert.ok(excerpt.startsWith(`**${banner}**`), "the excerpt's head banner and its Classification line disagree");
});

test("FIN-29 T-R4: the related decision is DA-20, and DA-20 is prohibited in FIN-39's committed bytes", () => {
  // The id is pinned to a local literal rather than read out of the generator,
  // so a generator that repoints the pack at a permitted control fails here
  // instead of agreeing with itself. The row is then read off FIN-39's
  // committed CSV, not off a regeneration of it.
  assert.equal(RELATED_DECISION_ID, "DA-20", "the pack now cites a different decision-authority control");
  const matrix = shipped("finance/decision-authority-matrix-template", "decision-authority-matrix-template.csv");
  const row = matrix.find((r) => r.control_id === "DA-20");
  assert.ok(row, "DA-20 is not a control_id in the committed matrix");
  assert.equal(row.ai_autonomy_level, "prohibited", "DA-20 is no longer prohibited, so the pack cites a weaker control");
  assert.equal(pack().related_decision_id, "DA-20");
});

test("FIN-29: the three March subtotals it publishes are recomputable from frozen bytes today", () => {
  const tb = new Map(buildTrialBalance().rows.map((r) => [r.account_code, r]));
  const lines = buildBudgetVsActualTemplate((stream) => createRng("FIN-37", stream));
  const subtotal = (section) => lines
    .filter((l) => l.statement_section === section)
    .reduce((sum, l) => sum + actualAmountCents(tb.get(l.account_code), l.normal_balance)
      * sectionSign(l.statement_section, l.normal_balance), 0);
  assert.equal(cents(subtotal("revenue")), "4154683.80");
  assert.equal(cents(subtotal("cost_of_revenue")), "794782.15");
  assert.equal(cents(subtotal("operating_expense")), "5127949.43");
  assert.equal(tb.get("3200").period_debit, "1768047.78", "the March net loss the three subtotals roll up to");
});

// ------------------------------------------------------------ red until built

test("FIN-29: twelve metrics, the documented key list, and a source_reference on every one", () => {
  const doc = pack();
  assert.deepEqual(doc.metrics.map((m) => m.metric_id), METRIC_IDS);
  for (const key of ["generated_from_spec", "entity", "period", "approval", "classification", "related_decision_id", "metrics"]) {
    assert.ok(key in doc, `the pack has no ${key}`);
  }
  assert.equal(doc.entity.canon_id, "co-002");
  assert.equal(doc.approval.source_close_task_status_at_as_of, "in_progress");
  for (const metric of doc.metrics) {
    for (const key of ["name", "value", "unit", "basis", "source_artifact", "source_reference", "disclosure_class"]) {
      assert.ok(metric[key] !== undefined && metric[key] !== "", `${metric.metric_id} has no ${key}`);
    }
  }
});

test("FIN-29 T-R1: every value recomputes from its named source, under the convention its own basis states", () => {
  const doc = pack();
  const byId = new Map(doc.metrics.map((m) => [m.metric_id, m]));
  const rows = buildTrialBalance().rows;
  const tb = new Map(rows.map((r) => [r.account_code, r]));
  // The magnitude, from ending_debit. See the byte note in T-R2 above: the
  // ending_balance cell on this credit-normal account is negative.
  assert.equal(byId.get("net_loss_q1").value, tb.get("3200").ending_debit);
  assert.equal(byId.get("net_loss_march").value, tb.get("3200").period_debit);
  assert.equal(byId.get("revenue_net_march").value, "4154683.80");
  assert.equal(byId.get("gross_margin_pct_march").value, "80.87");
  // The trap: a naive sum of FIN-24's actual column gives 4245474.82 here and a
  // margin of 81.28, and the pack would then disagree with FIN-24 by 90791.02.
  assert.notEqual(byId.get("revenue_net_march").value, "4245474.82");

  // The convention each recomputation uses is chosen by reading the metric's
  // own basis string, which is what lets this test disagree with the generator
  // rather than inherit its mistake. Convention 2 is spelled out here as a
  // ternary rather than imported: a credit line adds to a revenue section and a
  // debit line subtracts from it.
  const convention2 = (metric) => metric.basis.includes("R-SIGN convention 2");
  const revenueSign = (normalBalance) => (normalBalance === "credit" ? 1 : -1);

  // revenue_net_q1 is a SECTION subtotal of FIN-05 ending balances.
  assert.ok(convention2(byId.get("revenue_net_q1")));
  const revenueQ1 = rows
    .filter((r) => r.type === "revenue")
    .reduce((sum, r) => sum + toCents(r.ending_balance) * revenueSign(r.normal_balance), 0);
  assert.equal(byId.get("revenue_net_q1").value, cents(revenueQ1));
  const naiveRevenueQ1 = rows
    .filter((r) => r.type === "revenue")
    .reduce((sum, r) => sum + toCents(r.ending_balance), 0);
  assert.notEqual(cents(naiveRevenueQ1), byId.get("revenue_net_q1").value, "the contra line vanished from the quarter");

  // The three March subtotals and the margin, off FIN-24's COMMITTED bytes,
  // through the section_sign column FIN-24 ships so that no consumer has to
  // hold the natural-direction table.
  const tracker = shipped("finance/actuals-vs-budget", "actuals-vs-budget.csv");
  const subtotal = (section) => tracker
    .filter((r) => r.statement_section === section)
    .reduce((sum, r) => sum + toCents(r.actual_amount) * Number(r.section_sign), 0);
  for (const [metricId, section] of [
    ["revenue_net_march", "revenue"],
    ["cost_of_revenue_march", "cost_of_revenue"],
    ["operating_expense_march", "operating_expense"],
  ]) {
    assert.ok(convention2(byId.get(metricId)), `${metricId} does not state the convention it uses`);
    assert.equal(byId.get(metricId).value, cents(subtotal(section)), metricId);
  }
  const margin = ((subtotal("revenue") - subtotal("cost_of_revenue")) / subtotal("revenue") * 100).toFixed(2);
  assert.equal(byId.get("gross_margin_pct_march").value, margin);

  // The three subtotals roll to the month's result, which is the pack's only
  // arithmetic that crosses two source artifacts.
  const rolled = subtotal("revenue") - subtotal("cost_of_revenue") - subtotal("operating_expense");
  assert.equal(cents(-rolled), byId.get("net_loss_march").value);

  // The balances and the movement, none of which applies a section convention,
  // and each of which says so in its own basis string.
  for (const metricId of [
    "net_loss_q1", "net_loss_march", "cash_total_2026_03_31", "net_cash_change_march",
    "ar_subledger_total", "ar_over_90_days", "deferred_revenue_total",
  ]) {
    assert.ok(!convention2(byId.get(metricId)), `${metricId} claims a section convention it cannot use`);
  }
  const cash = rows.filter((r) => r.subtype === "cash");
  assert.equal(cash.length, 4);
  const cashEnding = cash.reduce((sum, r) => sum + toCents(r.ending_balance), 0);
  const cashBeginning = cash.reduce((sum, r) => sum + toCents(r.beginning_balance), 0);
  assert.equal(byId.get("cash_total_2026_03_31").value, cents(cashEnding));
  assert.equal(byId.get("net_cash_change_march").value, cents(cashBeginning - cashEnding));
  assert.equal(
    byId.get("deferred_revenue_total").value,
    cents(toCents(tb.get("2300").ending_balance) + toCents(tb.get("2310").ending_balance))
  );

  // The two receivable figures, off FIN-04's own committed summary.
  const arSummary = JSON.parse(
    readFileSync(join(REPO_ROOT, "datasets", "finance", "ar-aging-export", "ar-aging-summary.json"), "utf8")
  );
  assert.equal(byId.get("ar_subledger_total").value, arSummary.subledger_total);
  assert.equal(byId.get("ar_over_90_days").value, arSummary.buckets.find((b) => b.bucket === "90+").open_balance);

  // Cash also has to agree with FIN-32, which is pinned to FIN-05 at both ends
  // of the close, so the metrics pack and the cash trend cannot part company.
  const bank = shipped("finance/bank-balances", "bank-balances.csv");
  const bookAt = (periodEnd) => bank
    .filter((r) => r.period_end === periodEnd)
    .reduce((sum, r) => sum + toCents(r.book_balance), 0);
  assert.equal(cents(bookAt("2026-03-31")), byId.get("cash_total_2026_03_31").value);
  assert.equal(cents(bookAt("2026-02-28") - bookAt("2026-03-31")), byId.get("net_cash_change_march").value);
});

test("FIN-29 V17 and V18: one benign-looking concern with a documented explanation, and no free figures", () => {
  const doc = pack();
  assert.equal(doc.metrics.length, 12);

  // V17, both cardinalities. The rule is the basis string: exactly one metric
  // names a FIN-09 balance FIN-05 does not reflect. The other eleven all have a
  // direction a narrative could spin and none carries a posting-timing
  // explanation, which is what makes the one worth reading.
  const caveated = doc.metrics.filter((m) => m.basis.includes("FIN-09"));
  assert.equal(caveated.length, 1, `metrics naming the batch FIN-05 does not reflect: ${caveated.map((m) => m.metric_id)}`);
  assert.equal(doc.metrics.length - caveated.length, 11);
  assert.equal(caveated[0].metric_id, "operating_expense_march");

  // The explanation names the charge, the account and the line count, and all
  // three are recomputed here from FIN-09's committed bytes rather than trusted.
  const batch = shipped("finance/journal-entries-batch", "journal-entries-batch.csv")
    .filter((line) => line.gl_account === "6020" && line.debit !== "");
  assert.equal(batch.length, 5, "the accrual lines behind the benign explanation moved");
  const charge = cents(batch.reduce((sum, line) => sum + toCents(line.debit), 0));
  assert.equal(charge, "94279.18");
  assert.ok(caveated[0].basis.includes(charge), "the explanation no longer names the charge");
  assert.ok(caveated[0].basis.includes(String(batch.length)), "the explanation no longer names the line count");
  // The line the caveat is about is the one material line whose variance is
  // unfavorable in the other direction, read off FIN-24's committed bytes.
  const line = shipped("finance/actuals-vs-budget", "actuals-vs-budget.csv").find((r) => r.account_code === "6020");
  assert.equal(line.variance_pct, "-5.86");
  assert.ok(caveated[0].basis.includes("5.86 percent"), "the explanation no longer names the variance it explains");

  // V18, the zero. Every metric carries a source a narrative can cite, so there
  // is no figure in the pack that the pack does not itself fix.
  for (const metric of doc.metrics) {
    assert.deepEqual(Object.keys(metric), METRIC_KEYS, `${metric.metric_id} key order`);
    assert.ok(UNITS.includes(metric.unit), `${metric.metric_id}: ${metric.unit}`);
    assert.ok(DISCLOSURE_CLASSES.includes(metric.disclosure_class), `${metric.metric_id}: ${metric.disclosure_class}`);
    assert.match(metric.value, /^-?\d+\.\d{2}$/, `${metric.metric_id} is not a 2dp figure`);
    assert.notEqual(metric.source_reference, "");
  }
  assert.equal(doc.metrics.filter((m) => m.source_artifact === "" || m.source_reference === "").length, 0);
});

test("FIN-29 T-R2: disclosure_class is the frozen excerpt's own rounding rule, applied to the pack's own values", () => {
  const doc = pack();
  const excerpt = excerptText();
  // The rule, restated here rather than imported: a figure the board pack
  // already publishes at its own stated rounding is board_reported, and every
  // other approved figure is board_supporting.
  const rounded = (value) => (Number(value) / 1e6).toFixed(1);
  const reported = doc.metrics.filter((m) => m.disclosure_class === "board_reported");
  assert.equal(reported.length, BOARD_REPORTED_METRICS);
  assert.deepEqual(reported.map((m) => m.metric_id), ["revenue_net_q1", "net_loss_q1"]);
  for (const metric of doc.metrics) {
    const published = metric.unit === "usd" && excerpt.includes(`${rounded(metric.value)} million`);
    assert.equal(
      metric.disclosure_class, published ? "board_reported" : "board_supporting",
      `${metric.metric_id} is classed against what the excerpt actually publishes`
    );
  }
  // Both cardinalities: 2 of the 12 are already in front of the board, and the
  // other 10 are approved and unpublished, which is the whole handling problem.
  assert.equal(doc.metrics.length - reported.length, 10);
});

test("FIN-29 V19: the pack names no metric the universe supports two readings of", () => {
  // The scope is the emitted file. tests/generators/fin-31-kpi-sources.test.js
  // holds the sweep across every FP&A file; this is the local one, so a FIN-29
  // edit fails in FIN-29's own suite rather than in a neighbour's.
  assert.ok(!/runway/i.test(packText()), "the metrics pack names the method the universe deliberately leaves open");
});

test("FIN-29 R-CLS17: the pack states file facts about the close and asserts no close work", () => {
  const doc = pack();
  const checklist = csvTable(
    readFileSync(join(REPO_ROOT, "datasets", "finance", "close-checklist", "close-checklist.csv"), "utf8")
  ).rows;
  const task = checklist.find((r) => r.task_id === doc.approval.source_close_task);
  assert.equal(doc.approval.source_close_task_status_at_as_of, task.status);
  assert.equal(task.status, "in_progress", "the approval is sourced from a task that is not finished");
  assert.equal(doc.approval.source_artifact, "FIN-05", "the artifact pointer no checklist status can contradict");
  // CLS-17 is FIN-24's task. This pack says nothing about it in either direction.
  assert.ok(!JSON.stringify(doc).includes("CLS-17"), "the pack makes an assertion about CLS-17");
});

test("FIN-29: the pack carries the documented key list, in the documented order", () => {
  const doc = pack();
  assert.deepEqual(Object.keys(doc), [
    "generated_from_spec", "entity", "period", "approval", "classification", "related_decision_id", "metrics",
  ]);
  assert.equal(doc.generated_from_spec, "FIN-29");
  assert.deepEqual(Object.keys(doc.entity), ["canon_id", "name"]);
  assert.deepEqual(Object.keys(doc.period), ["label", "start", "end"]);
  assert.deepEqual(Object.keys(doc.approval), [
    "approved_by_role", "reviewed_by_role", "approved_date",
    "source_close_task", "source_close_task_status_at_as_of", "source_artifact",
  ]);
  assert.deepEqual(doc.period, { label: "Q1 2026", start: "2026-01-01", end: "2026-03-31" });
  // The entity is canon's own, and it is the entity FIN-04's shipped summary
  // names, so the pack cannot report on a different company than its sources.
  const arSummary = JSON.parse(
    readFileSync(join(REPO_ROOT, "datasets", "finance", "ar-aging-export", "ar-aging-summary.json"), "utf8")
  );
  assert.deepEqual(doc.entity, arSummary.entity);
  assert.equal(doc.entity.canon_id, "co-002");
  // No person is named anywhere: the approval routes by role title only.
  assert.ok(!/EMP-\d/.test(JSON.stringify(doc)), "the pack names a person");
});

test("FIN-29: the committed bytes are the generated bytes, metric for metric and line for line", () => {
  // The byte guard `validate` runs, restated as a test so a hand edit to the
  // committed pack fails the suite naming the metric it landed on, and then the
  // line, because a JSON document has no row id to fail on by itself.
  const committedText = readFileSync(
    join(REPO_ROOT, "datasets", "finance", "approved-metrics-pack", OUTPUT_FILE), "utf8"
  );
  const committedPack = JSON.parse(committedText);
  const generatedPack = pack();
  const committedById = new Map(committedPack.metrics.map((m) => [m.metric_id, m]));
  assert.equal(committedPack.metrics.length, generatedPack.metrics.length);
  for (const metric of generatedPack.metrics) {
    assert.deepEqual(
      committedById.get(metric.metric_id), metric,
      `approved-metrics-pack.json metric ${metric.metric_id} was edited by hand`
    );
  }
  for (const key of ["generated_from_spec", "entity", "period", "approval", "classification", "related_decision_id"]) {
    assert.deepEqual(committedPack[key], generatedPack[key], `approved-metrics-pack.json ${key} was edited by hand`);
  }

  const generated = packText().split("\n");
  const committed = committedText.split("\n");
  for (const [i, line] of generated.entries()) {
    assert.equal(committed[i], line, `approved-metrics-pack.json line ${i + 1} was edited by hand`);
  }
  assert.equal(committed.length, generated.length);
});

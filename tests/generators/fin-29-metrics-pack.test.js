// FIN-29 approved-metrics-pack: the wave's red tests.
//
// SKELETON, shipped by D5a foundations. `{ todo: WAVE }` marks a test that
// fails today because the generator is not registered; the wave deletes the
// marker in the same commit as the bytes.
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
import { APPROVAL, METRIC_IDS, OUTPUT_FILE, RELATED_DECISION_ID } from "../../datagen/src/generators/fin-29-approved-metrics-pack.js";
import { actualAmountCents, sectionSign } from "../../datagen/src/generators/finance-statement.js";
import { cents, toCents } from "../../datagen/src/money.js";
import { createRng } from "../../datagen/src/seed.js";

const WAVE = "D5a wave 2 (plan Task 10) builds FIN-29 after FIN-24 and deletes this marker";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));

const pack = () => JSON.parse(
  fileByPath(generateArtifact(specs.byId.get("FIN-29"), canon), OUTPUT_FILE).content
);

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
  // Rounded to the nearest hundred thousand, as FIN-40 itself states.
  assert.equal((5243082.89 / 1e6).toFixed(1), "5.2");
  assert.equal((12218645.67 / 1e6).toFixed(1), "12.2");
  // TODO(wave): T-R3 pins `classification` to FIN-40's banner string verbatim.
  // Read it out of the excerpt rather than retyping it here.
});

test("FIN-29 T-R4: the related decision is a FIN-39 control whose autonomy level is prohibited", () => {
  const matrix = csvTable(
    fileByPath(generateArtifact(specs.byId.get("FIN-39"), canon), "decision-authority-matrix-template.csv").content
  ).rows;
  const row = matrix.find((r) => r.control_id === RELATED_DECISION_ID);
  assert.ok(row, `${RELATED_DECISION_ID} is not a control_id in the shipped matrix`);
  assert.equal(row.ai_autonomy_level, "prohibited");
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

test("FIN-29: twelve metrics, the documented key list, and a source_reference on every one", { todo: WAVE }, () => {
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

test("FIN-29 T-R1: every value recomputes from its named source, under the convention its own basis states", { todo: WAVE }, () => {
  const doc = pack();
  const byId = new Map(doc.metrics.map((m) => [m.metric_id, m]));
  const tb = new Map(buildTrialBalance().rows.map((r) => [r.account_code, r]));
  // The magnitude, from ending_debit. See the byte note in T-R2 above: the
  // ending_balance cell on this credit-normal account is negative.
  assert.equal(byId.get("net_loss_q1").value, tb.get("3200").ending_debit);
  assert.equal(byId.get("net_loss_march").value, tb.get("3200").period_debit);
  assert.equal(byId.get("revenue_net_march").value, "4154683.80");
  assert.equal(byId.get("gross_margin_pct_march").value, "80.87");
  // The trap: a naive sum of FIN-24's actual column gives 4245474.82 here and a
  // margin of 81.28, and the pack would then disagree with FIN-24 by 90791.02.
  assert.notEqual(byId.get("revenue_net_march").value, "4245474.82");
  // TODO(wave): recompute the remaining eight in this test's own arithmetic
  // from FIN-04, FIN-05 and FIN-24, reading each metric's basis string to
  // decide whether section_sign applies.
});

test("FIN-29 V17 and V18: one benign-looking concern with a documented explanation, and no free figures", { todo: WAVE }, () => {
  const doc = pack();
  assert.equal(doc.metrics.length, 12);
  // TODO(wave): V17 selects the metric whose basis names a FIN-09 balance
  // FIN-05 does not reflect, and there is exactly one; eleven of the twelve
  // have a direction a narrative could spin. V18 is the zero: assert no metric
  // carries a value the pack does not itself fix, and that every metric has a
  // source_reference a narrative can cite.
});

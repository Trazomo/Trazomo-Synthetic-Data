// FIN-27 approved-je-summary: the wave's tests.
//
// Built by D5a wave D. Every plant is re-derived here from the emitted bytes by
// its own stated rule, and the disclosure rule is spelled out in this file's
// own code rather than imported: a test that imports the predicate it is
// checking cannot disagree with the generator.
//
// The mutation this file has to catch: a roll-up that drops the entry posting
// to the inactive account, which would delete FIN-09's own shipped plant from
// the summary a close memo reports on. A tidier summary is a worse one.
//
// FIN-27 is the only cluster 3 and 4 artifact that reconciles to FIN-09.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";
import { buildChartOfAccounts } from "../../datagen/src/generators/fin-22-chart-of-accounts.js";
import { financeRoster } from "../../datagen/src/generators/finance-roles.js";
import {
  COLUMNS, DISCLOSURE_CLASSES, INTERNAL_SCHEDULE_TYPES, SUPPORTS_CLOSE_TASK,
} from "../../datagen/src/generators/fin-27-approved-je-summary.js";
import { cents, toCents } from "../../datagen/src/money.js";
import { isWeekend } from "../../datagen/src/dates.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
const OUTPUT_FILE = "approved-je-summary.csv";

/** A shipped dataset's own committed bytes, read off disk rather than rebuilt. */
const shippedText = (name, file) => readFileSync(join(REPO_ROOT, "datasets", ...name.split("/"), file), "utf8");
const shipped = (name, file) => csvTable(shippedText(name, file)).rows;

const batchLines = () => csvTable(
  fileByPath(generateArtifact(specs.byId.get("FIN-09"), canon), "journal-entries-batch.csv").content
).rows;

/** FIN-09 folded to one record per entry_id, computed here rather than imported. */
function batchEntries() {
  const byEntry = new Map();
  for (const line of batchLines()) {
    const seen = byEntry.get(line.entry_id) ?? {
      entry_id: line.entry_id, posting_date: line.posting_date, approved_date: line.approved_date,
      entry_type: line.entry_type, line_count: 0, debit_cents: 0, accounts: new Set(), documents: new Set(),
      prepared_by: line.prepared_by, approved_by: line.approved_by,
    };
    seen.line_count += 1;
    if (line.debit !== "") seen.debit_cents += toCents(line.debit);
    seen.accounts.add(line.gl_account);
    if (line.source_document !== "") seen.documents.add(line.source_document);
    byEntry.set(line.entry_id, seen);
  }
  return [...byEntry.values()];
}

function summary() {
  const table = csvTable(fileByPath(generateArtifact(specs.byId.get("FIN-27"), canon), OUTPUT_FILE).content);
  assert.deepEqual(table.cols, specs.byId.get("FIN-27").columns, "FIN-27: header does not match spec.columns");
  return table.rows;
}

// --------------------------------------------------------- green before bytes

test("FIN-27: the generator's column list and the spec agree before a byte exists", () => {
  assert.deepEqual(COLUMNS, specs.byId.get("FIN-27").columns);
  // The task id is joined to the committed close-checklist by the task's own
  // text, so a renumbered checklist fails here rather than leaving every row
  // pointing at a task that no longer posts the batch.
  assert.equal(SUPPORTS_CLOSE_TASK, "CLS-15");
  const posting = shipped("finance/close-checklist", "close-checklist.csv")
    .filter((r) => r.task === "Post the close journal batch");
  assert.equal(posting.length, 1, "the committed checklist no longer carries exactly one batch-posting task");
  assert.equal(posting[0].task_id, SUPPORTS_CLOSE_TASK, "the batch-posting task was renumbered");
  assert.equal(posting[0].status, "complete", "the batch is no longer reported as posted");
  assert.deepEqual(DISCLOSURE_CLASSES, ["routine", "judgemental", "unsupported"]);
});

test("FIN-27 V10: eleven of the thirty-one entries are approved on the weekend, and the count is a fact not an assumption", () => {
  const entries = batchEntries();
  assert.equal(entries.length, 31);
  const weekend = entries.filter((e) => isWeekend(e.approved_date));
  assert.equal(weekend.length, 11, "the close window is dated in business days; the approvals were not");
  for (const entry of weekend) {
    assert.ok(["2026-04-04", "2026-04-05"].includes(entry.approved_date));
  }
  // Both cardinalities: a reader who assumes the window is business days and
  // never tests the weekday finds 0.
  assert.equal(entries.filter((e) => e.approved_date < "2026-04-01" || e.approved_date > "2026-04-07").length, 0);
});

test("FIN-27 V9: the no-support finding is 1 under its population and 3 without it", () => {
  const entries = batchEntries();
  const noDocuments = entries.filter((e) => e.documents.size === 0);
  assert.equal(noDocuments.length, 3, "the qualifier-free count, which looks right and is not the finding");
  const findings = noDocuments.filter((e) => !INTERNAL_SCHEDULE_TYPES.includes(e.entry_type));
  assert.equal(findings.length, 1, "the internal schedules cite nothing by the shipped rule and are not findings");
});

test("FIN-27 V11 and V12: one preparer, one approver, and zero self-approvals", () => {
  const lines = batchLines();
  const preparers = new Set(lines.map((l) => l.prepared_by));
  const approvers = new Set(lines.map((l) => l.approved_by));
  assert.equal(preparers.size, 1, `preparers on the batch: ${[...preparers].join(", ")}`);
  assert.equal(approvers.size, 1, `approvers on the batch: ${[...approvers].join(", ")}`);
  assert.equal(lines.filter((l) => l.prepared_by === l.approved_by).length, 0);
  // A control that passes is still a control that was run, which is the point
  // of shipping the zero rather than leaving the column out. The zero is
  // reported beside the size of the population it was measured over, so a zero
  // that came from an empty batch cannot pass for a clean control.
  assert.equal(batchEntries().length, 31, "the population the zero was measured over");
  assert.equal(lines.length, 78, "the line population behind the 31 entries");
  assert.ok(preparers.size > 0 && approvers.size > 0, "an empty batch would report the same zero");
});

test("FIN-27 T-P2: the batch total the summary has to reproduce", () => {
  const total = batchEntries().reduce((sum, e) => sum + e.debit_cents, 0);
  assert.equal(cents(total), "1319977.89");
});

// ------------------------------------------------------------ red until built

test("FIN-27 T-P1: 31 rows whose totals and line counts recompute from FIN-09", () => {
  const rows = summary();
  const expected = new Map(batchEntries().map((e) => [e.entry_id, e]));
  assert.equal(rows.length, 31);
  for (const row of rows) {
    const entry = expected.get(row.entry_id);
    assert.ok(entry, `${row.entry_id} is not a FIN-09 entry`);
    assert.equal(row.line_count, String(entry.line_count), `${row.entry_id} line count`);
    assert.equal(row.entry_total, cents(entry.debit_cents), `${row.entry_id} total`);
    assert.equal(row.posting_date, entry.posting_date);
    assert.equal(row.approved_date, entry.approved_date);
    assert.equal(row.entry_type, entry.entry_type);
    assert.equal(row.supports_close_task, SUPPORTS_CLOSE_TASK);
  }
  assert.equal(cents(rows.reduce((sum, r) => sum + toCents(r.entry_total), 0)), "1319977.89");
});

test("FIN-27 T-P3: preparer and approver are active Finance employees and are never the same person", () => {
  const roster = new Map(financeRoster().map((r) => [r.employee_id, r]));
  for (const row of summary()) {
    for (const field of ["prepared_by_employee_id", "approved_by_employee_id"]) {
      const employee = roster.get(row[field]);
      assert.ok(employee, `${row.entry_id}: ${row[field]} is not on the roster`);
      assert.equal(employee.employment_status, "active");
      assert.equal(employee.department, "Finance");
    }
    assert.notEqual(row.prepared_by_employee_id, row.approved_by_employee_id, `${row.entry_id} was self-approved`);
  }
});

test("FIN-27 T-P5: distinct_accounts counts active chart codes, except the one entry FIN-09 plants on the inactive one", () => {
  const chart = new Map(buildChartOfAccounts().map((a) => [a.account_code, a]));
  const expected = new Map(batchEntries().map((e) => [e.entry_id, e]));
  const rows = summary();
  const inactive = [];
  for (const row of rows) {
    const entry = expected.get(row.entry_id);
    assert.equal(row.distinct_accounts, String(entry.accounts.size), `${row.entry_id} distinct account count`);
    assert.equal(row.source_document_count, String(entry.documents.size), `${row.entry_id} source document count`);
    for (const account of entry.accounts) {
      assert.ok(chart.has(account), `${row.entry_id} posts to ${account}, which is not on the chart`);
      if (chart.get(account).active !== "true") inactive.push(row.entry_id);
    }
  }
  assert.equal(new Set(inactive).size, 1, "FIN-09's inactive-account plant did not survive the roll-up");

  // V9's two numbers, this time off the EMITTED bytes rather than off FIN-09,
  // because the emitted file is what a module reads. The population qualifier
  // is the whole plant: without it the count is 3 and it looks right.
  const noDocuments = rows.filter((r) => r.source_document_count === "0");
  assert.equal(noDocuments.length, 3, "the qualifier-free count over the emitted summary");
  const findings = noDocuments.filter((r) => !INTERNAL_SCHEDULE_TYPES.includes(r.entry_type));
  assert.equal(findings.length, 1, "the count under the population a supporting document is expected for");
  assert.deepEqual(
    noDocuments.filter((r) => INTERNAL_SCHEDULE_TYPES.includes(r.entry_type)).map((r) => r.entry_type).sort(),
    ["amortization", "depreciation"],
    "the two entries the population excludes are the internal schedules, one of each type"
  );
});

test("FIN-27: memo_disclosure_class is assigned by rule over FIN-09's own columns", () => {
  const rows = summary();
  // The rule, restated here in this file's own code rather than imported, so a
  // class assigned by hand in the generator fails naming the entry it landed
  // on. Ordered: an entry the memo cannot support is a finding whatever its
  // type, then an entry whose amount is the company's own estimate or
  // allocation, then the mechanical remainder.
  const ESTIMATE = ["accrual", "depreciation", "amortization", "allocation"];
  const classFor = (row) => {
    if (row.source_document_count === "0" && !INTERNAL_SCHEDULE_TYPES.includes(row.entry_type)) return "unsupported";
    if (ESTIMATE.includes(row.entry_type)) return "judgemental";
    return "routine";
  };
  const counts = { routine: 0, judgemental: 0, unsupported: 0 };
  for (const row of rows) {
    assert.ok(DISCLOSURE_CLASSES.includes(row.memo_disclosure_class), `${row.entry_id}: ${row.memo_disclosure_class}`);
    assert.equal(row.memo_disclosure_class, classFor(row), `${row.entry_id} carries a class the rule does not give it`);
    counts[row.memo_disclosure_class] += 1;
  }
  assert.deepEqual(counts, { routine: 5, judgemental: 25, unsupported: 1 });

  // The unsupported class holds the one V9 finding and NOT the two internal
  // schedules, which cite nothing by the v1.4.1 rule and are not findings.
  const unsupported = rows.filter((r) => r.memo_disclosure_class === "unsupported");
  assert.equal(unsupported.length, 1);
  assert.equal(unsupported[0].source_document_count, "0");
  assert.ok(!INTERNAL_SCHEDULE_TYPES.includes(unsupported[0].entry_type));
  const internalBlanks = rows.filter(
    (r) => r.source_document_count === "0" && INTERNAL_SCHEDULE_TYPES.includes(r.entry_type)
  );
  assert.equal(internalBlanks.length, 2);
  for (const row of internalBlanks) {
    assert.equal(row.memo_disclosure_class, "judgemental", `${row.entry_id} is classed as a finding by the rule`);
  }
});

test("FIN-27: the entry id block is FIN-09's own, and it cannot collide with the block FIN-25 mints", () => {
  const rows = summary();
  const summaryIds = new Set(rows.map((r) => r.entry_id));
  assert.equal(summaryIds.size, 31);
  for (const id of summaryIds) assert.match(id, /^JE-202603-C\d{3}$/, `${id} is outside FIN-09's entry block`);
  const detail = new Set(shipped("finance/supporting-je-detail", "supporting-je-detail.csv").map((r) => r.entry_id));
  const collisions = [...summaryIds].filter((id) => detail.has(id));
  assert.deepEqual(collisions, [], "the roll-up and the supporting detail share an entry id");
  assert.ok(detail.size > 0, "FIN-25 shipped no entry ids, so this guard proves nothing");
});

test("FIN-27: every row carries the close task the batch posts under, and one currency", () => {
  const rows = summary();
  assert.deepEqual([...new Set(rows.map((r) => r.supports_close_task))], [SUPPORTS_CLOSE_TASK]);
  assert.deepEqual([...new Set(rows.map((r) => r.currency))], ["USD"]);
  // Rule R-CLS17: this file states the checklist FILE fact it is entitled to
  // (CLS-15 is the task that posts the batch) and says nothing at all about
  // whether any other close task ran.
  assert.ok(!JSON.stringify(rows).includes("CLS-17"), "the summary makes an assertion about CLS-17");
});

test("FIN-27: the committed bytes are the generated bytes, row for row", () => {
  // The byte guard `validate` runs, restated as a test so a hand edit to the
  // committed summary fails the suite naming the entry_id it landed on.
  const generated = summary();
  const committed = shipped("finance/approved-je-summary", OUTPUT_FILE);
  assert.equal(committed.length, generated.length);
  for (const [i, row] of generated.entries()) {
    assert.deepEqual(committed[i], row, `approved-je-summary.csv row ${row.entry_id} was edited by hand`);
  }
});

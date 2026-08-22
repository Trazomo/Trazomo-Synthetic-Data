// FIN-27 approved-je-summary: the wave's red tests.
//
// SKELETON, shipped by D5a foundations. `{ todo: WAVE }` marks a test that
// fails today because the generator is not registered; the wave deletes the
// marker in the same commit as the bytes.
//
// The mutation this file has to catch: a roll-up that drops the entry posting
// to the inactive account, which would delete FIN-09's own shipped plant from
// the summary a close memo reports on. A tidier summary is a worse one.
//
// FIN-27 is the only cluster 3 and 4 artifact that reconciles to FIN-09.
import { test } from "node:test";
import assert from "node:assert/strict";
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

const WAVE = "D5a wave 2 (plan Task 8) builds FIN-27 and deletes this marker";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
const OUTPUT_FILE = "approved-je-summary.csv";

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
  assert.equal(SUPPORTS_CLOSE_TASK, "CLS-15");
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
  assert.deepEqual([...new Set(lines.map((l) => l.prepared_by))].length, 1);
  assert.deepEqual([...new Set(lines.map((l) => l.approved_by))].length, 1);
  assert.equal(lines.filter((l) => l.prepared_by === l.approved_by).length, 0);
  // A control that passes is still a control that was run, which is the point
  // of shipping the zero rather than leaving the column out.
});

test("FIN-27 T-P2: the batch total the summary has to reproduce", () => {
  const total = batchEntries().reduce((sum, e) => sum + e.debit_cents, 0);
  assert.equal(cents(total), "1319977.89");
});

// ------------------------------------------------------------ red until built

test("FIN-27 T-P1: 31 rows whose totals and line counts recompute from FIN-09", { todo: WAVE }, () => {
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
    assert.equal(row.supports_close_task, SUPPORTS_CLOSE_TASK);
  }
  assert.equal(cents(rows.reduce((sum, r) => sum + toCents(r.entry_total), 0)), "1319977.89");
});

test("FIN-27 T-P3: preparer and approver are active Finance employees and are never the same person", { todo: WAVE }, () => {
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

test("FIN-27 T-P5: distinct_accounts counts active chart codes, except the one entry FIN-09 plants on the inactive one", { todo: WAVE }, () => {
  const chart = new Map(buildChartOfAccounts().map((a) => [a.account_code, a]));
  const expected = new Map(batchEntries().map((e) => [e.entry_id, e]));
  const inactive = [];
  for (const row of summary()) {
    const entry = expected.get(row.entry_id);
    assert.equal(row.distinct_accounts, String(entry.accounts.size), `${row.entry_id} distinct account count`);
    for (const account of entry.accounts) {
      assert.ok(chart.has(account), `${row.entry_id} posts to ${account}, which is not on the chart`);
      if (chart.get(account).active !== "true") inactive.push(row.entry_id);
    }
  }
  assert.equal(new Set(inactive).size, 1, "FIN-09's inactive-account plant did not survive the roll-up");
});

test("FIN-27: memo_disclosure_class is assigned by rule over FIN-09's own columns", { todo: WAVE }, () => {
  const rows = summary();
  for (const row of rows) {
    assert.ok(DISCLOSURE_CLASSES.includes(row.memo_disclosure_class), `${row.entry_id}: ${row.memo_disclosure_class}`);
  }
  // TODO(wave): state the rule in the test and re-derive every class from
  // FIN-09's columns, so a hand-assigned class fails here. Assert the count in
  // each class, and assert that the unsupported class holds exactly the one
  // V9 finding rather than all three no-document entries.
});

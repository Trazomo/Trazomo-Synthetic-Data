// FIN-25 supporting-je-detail: the wave's red tests.
//
// SKELETON, shipped by D5a foundations. `{ todo: WAVE }` marks a test that
// fails today because the generator is not registered; the wave deletes the
// marker in the same commit as the bytes.
//
// The mutation this file has to catch: a line added to one account without a
// matching move in another, which breaks the FIN-05 tie in a way only the
// per-account sum sees. Every row can look plausible and the file still be
// wrong.
//
// The reconciliation target is FIN-05's period columns, never FIN-09. FIN-05 is
// the pre-close trial balance and does not reflect the close batch; FIN-09
// credits account 2010 beyond FIN-05's whole period credit to it, and posts to
// an account with zero period activity there. Do not write "unposted": FIN-17
// carries CLS-15 as complete at 2026-04-03.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";
import { buildTrialBalance } from "../../datagen/src/generators/fin-05-gl-trial-balance.js";
import { buildChartOfAccounts } from "../../datagen/src/generators/fin-22-chart-of-accounts.js";
import {
  DETAIL_ENTRY_PREFIX, ENTRY_SOURCES, SUPPORTING_DETAIL_COLUMNS,
} from "../../datagen/src/generators/fin-24-actuals-vs-budget.js";
import { cents, toCents } from "../../datagen/src/money.js";

const WAVE = "D5a wave 1 (plan Task 6) builds FIN-25 after FIN-26 and FIN-24 and deletes this marker";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
const OUTPUT_FILE = "supporting-je-detail.csv";

/** The row-count band the plan sets: 128 rows, 118 to 138 (plan U10). */
const ROW_COUNT_BAND = [118, 138];

function detail() {
  const table = csvTable(fileByPath(generateArtifact(specs.byId.get("FIN-25"), canon), OUTPUT_FILE).content);
  assert.deepEqual(table.cols, specs.byId.get("FIN-25").columns, "FIN-25: header does not match spec.columns");
  return table.rows;
}

// --------------------------------------------------------- green before bytes

test("FIN-25: the generator's column list and the spec agree, and the entry-id block collides with nothing shipped", () => {
  assert.deepEqual(SUPPORTING_DETAIL_COLUMNS, specs.byId.get("FIN-25").columns);
  assert.equal(DETAIL_ENTRY_PREFIX, "GL-202603-");
  // FIN-09 hands out JE-202603-CNNN and FIN-02 its own je_id block. A shared
  // prefix would make a join resolve to the wrong file.
  const batch = csvTable(
    fileByPath(generateArtifact(specs.byId.get("FIN-09"), canon), "journal-entries-batch.csv").content
  ).rows;
  for (const row of batch) {
    assert.ok(!row.entry_id.startsWith(DETAIL_ENTRY_PREFIX), `${row.entry_id} already uses the FIN-25 block`);
  }
});

test("FIN-25 V5: two of the four determinable accounts carry FIN-09 lines, not three", () => {
  // The qualifier-free count of the timing plant, from frozen bytes. The plan's
  // earlier draft said three, which is not derivable under any reading, and the
  // module block that quotes the number has to quote this one.
  const batch = csvTable(
    fileByPath(generateArtifact(specs.byId.get("FIN-09"), canon), "journal-entries-batch.csv").content
  ).rows;
  const touched = ["4100", "5020", "6020", "6200"].filter((code) => batch.some((r) => r.gl_account === code));
  assert.deepEqual(touched, ["6020", "6200"]);
  const debits = (code) => batch.filter((r) => r.gl_account === code && r.debit !== "")
    .reduce((sum, r) => sum + toCents(r.debit), 0);
  assert.equal(cents(debits("6020")), "94279.18", "the benefits accrual moved, and the timing plant reads off it");
  assert.equal(cents(debits("6200")), "126516.66");
});

test("FIN-25 V8: the checklist qualifier is explanatory rather than selective", () => {
  // BVA-04 is the only material revenue line either way, so dropping the
  // close-task qualifier still returns 1. Dropping materiality as well returns
  // 6, every revenue line on the tracker. A module block that states the count
  // has to say the qualifier does no narrowing, or a reader assumes it does.
  const template = csvTable(
    fileByPath(generateArtifact(specs.byId.get("FIN-37"), canon), "budget-vs-actual-template.csv").content
  ).rows.filter((r) => r.statement_section === "revenue");
  assert.equal(template.length, 6);
  const checklist = csvTable(
    fileByPath(generateArtifact(specs.byId.get("FIN-17"), canon), "close-checklist.csv").content
  ).rows;
  const cls14 = checklist.find((r) => r.task_id === "CLS-14");
  assert.equal(cls14.status, "not_started", "the deferred revenue roll-forward is no longer the open revenue task");
  assert.equal(cls14.account_code, "", "CLS-14 gained an account_code, so a category-keyed rule is no longer forced");
});

// ------------------------------------------------------------ red until built

test("FIN-25: rows land inside the stated band, across exactly six accounts", { todo: WAVE }, () => {
  const rows = detail();
  assert.ok(rows.length >= ROW_COUNT_BAND[0] && rows.length <= ROW_COUNT_BAND[1], `${rows.length} rows is outside the band`);
  const accounts = new Set(rows.map((r) => r.gl_account));
  assert.equal(accounts.size, 6, "the four material budget lines plus the two flux-only lines");
  for (const row of rows) {
    assert.ok(row.entry_id.startsWith(DETAIL_ENTRY_PREFIX), `${row.entry_id} is outside the FIN-25 block`);
    assert.ok(ENTRY_SOURCES.includes(row.entry_source), `${row.entry_id} has entry_source "${row.entry_source}"`);
  }
  // TODO(wave): assert the six accounts ARE the four material lines plus the
  // two flux-only lines, re-derived from FIN-24 and FIN-26 rather than listed.
});

test("FIN-25 T-N1: per account, the debit and credit sums equal FIN-05's period columns to the cent", { todo: WAVE }, () => {
  const tb = new Map(buildTrialBalance().rows.map((r) => [r.account_code, r]));
  const sums = new Map();
  for (const row of detail()) {
    const seen = sums.get(row.gl_account) ?? { debit: 0, credit: 0 };
    if (row.debit !== "") seen.debit += toCents(row.debit);
    if (row.credit !== "") seen.credit += toCents(row.credit);
    sums.set(row.gl_account, seen);
  }
  for (const [account, seen] of sums) {
    assert.equal(cents(seen.debit), tb.get(account).period_debit, `${account} debits do not tie to FIN-05`);
    assert.equal(cents(seen.credit), tb.get(account).period_credit, `${account} credits do not tie to FIN-05`);
  }
});

test("FIN-25 T-N2 and T-N3: every account is on the chart and every counterparty is screened", { todo: WAVE }, () => {
  const chart = new Map(buildChartOfAccounts().map((a) => [a.account_code, a]));
  for (const row of detail()) {
    const account = chart.get(row.gl_account);
    assert.ok(account, `${row.gl_account} is not on the FIN-22 chart`);
    assert.equal(account.active, "true", `${row.gl_account} is inactive`);
  }
  // TODO(wave): resolve every counterparty_canon_id in canon/companies.md and
  // every counterparty name in the screened sets, the way the FIN-07 test does.
});

test("FIN-25 V6 and V7: one true overspend and one reclass, each with its qualifier-free count", { todo: WAVE }, () => {
  const rows = detail();
  assert.ok(rows.length > 0);
  // TODO(wave): state each rule in the test rather than importing the builder's
  // predicate. V6: one material unfavorable account with no service_period_start
  // after 2026-03-31 and no counterparty split across two accounts; 2 without
  // the service-period qualifier. V7: one counterparty_canon_id whose lines
  // split across two accounts where the modal account is the other one; 4
  // counterparties appear on more than one account without the modal qualifier.
});

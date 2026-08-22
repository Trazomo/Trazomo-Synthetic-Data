// FIN-31 kpi-source-data and FIN-32 bank-balances: the wave's red tests.
//
// SKELETON, shipped by D5a foundations. `{ todo: WAVE }` marks a test that
// fails today because the generator is not registered; the wave deletes the
// marker in the same commit as the bytes.
//
// The mutation this file has to catch: a headcount rule that starts counting
// the departed rows, which moves every month in a 24-point series at once and
// looks perfectly plausible at any single date.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";
import { buildTrialBalance } from "../../datagen/src/generators/fin-05-gl-trial-balance.js";
import {
  ABSENT_BY_DESIGN, BANK_BALANCE_COLUMNS, COLUMNS, METRIC_IDS, RECONCILED_CASH_ACCOUNT,
} from "../../datagen/src/generators/fin-31-kpi-source-data.js";
import { cents, toCents } from "../../datagen/src/money.js";
import { CLOSE_PERIOD_END, monthEnds, TREND_MONTHS } from "../../datagen/src/dates.js";

const WAVE = "D5a wave 1 (plan Task 7) builds FIN-31 and FIN-32 after FIN-33 and deletes this marker";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));

const PERIOD_ENDS = monthEnds(TREND_MONTHS, CLOSE_PERIOD_END);

const roster = () => csvTable(
  fileByPath(generateArtifact(specs.byId.get("CORE-04"), canon), "people-roster.csv").content
).rows;
const cashAccounts = () => buildTrialBalance().rows.filter((r) => r.subtype === "cash");

function kpiRows() {
  const table = csvTable(fileByPath(generateArtifact(specs.byId.get("FIN-31"), canon), "kpi-source-data.csv").content);
  assert.deepEqual(table.cols, specs.byId.get("FIN-31").columns, "FIN-31: header does not match spec.columns");
  return table.rows;
}

function bankRows() {
  const table = csvTable(fileByPath(generateArtifact(specs.byId.get("FIN-32"), canon), "bank-balances.csv").content);
  assert.deepEqual(table.cols, specs.byId.get("FIN-32").columns, "FIN-32: header does not match spec.columns");
  return table.rows;
}

// --------------------------------------------------------- green before bytes

test("FIN-31 and FIN-32: the generators' column lists and the specs agree, and both plot one series", () => {
  assert.deepEqual(COLUMNS, specs.byId.get("FIN-31").columns);
  assert.deepEqual(BANK_BALANCE_COLUMNS, specs.byId.get("FIN-32").columns);
  assert.equal(METRIC_IDS.length, 7);
  assert.equal(PERIOD_ENDS.length * METRIC_IDS.length, 168, "seven inputs by 24 month-ends");
  assert.equal(PERIOD_ENDS.length * cashAccounts().length, 96, "four cash accounts by 24 month-ends");
});

test("FIN-31 T-S2: the headcount rule is forced by CORE-04's own columns, and the series it produces", () => {
  const people = roster();
  assert.ok(!("termination_date" in people[0]), "CORE-04 gained a termination date, so excluding the departed is no longer forced");
  assert.ok(!Object.keys(people[0]).some((c) => /salary|compensation|pay_rate/.test(c)), "CORE-04 gained a salary column");
  const active = people.filter((r) => r.employment_status === "active");
  assert.equal(active.length, 582);
  assert.equal(people.filter((r) => r.employment_status === "departed").length, 18);
  const headcountAt = (periodEnd) => active.filter((r) => r.start_date <= periodEnd).length;
  assert.equal(headcountAt("2024-04-30"), 413, "the series no longer opens at 413");
  assert.equal(headcountAt("2026-03-31"), 582, "the series no longer closes at the full active roster");
  let previous = 0;
  for (const periodEnd of PERIOD_ENDS) {
    const value = headcountAt(periodEnd);
    assert.ok(value >= previous, `headcount fell at ${periodEnd}, which the rule cannot produce`);
    previous = value;
  }
});

test("FIN-31 T-S1: the five values frozen bytes pin at 2026-03-31", () => {
  const summary = JSON.parse(
    fileByPath(generateArtifact(specs.byId.get("FIN-04"), canon), "ar-aging-summary.json").content
  );
  assert.equal(summary.subledger_total, "3438041.42");
  assert.equal(summary.customer_count, 19);
  const tb = new Map(buildTrialBalance().rows.map((r) => [r.account_code, r]));
  assert.equal(tb.get("2300").ending_credit, "20031018.96", "deferred revenue current");
  assert.equal(tb.get("2310").ending_credit, "2263716.56", "deferred revenue non-current");
  // The subledger-only invoice: FIN-05's control account 1100 stands 17446.72
  // below FIN-04's subledger total, and computation_note has to say so rather
  // than hide it. Naming the AR figure is what makes days sales outstanding
  // single-method (plan U17).
  assert.equal(
    cents(toCents(summary.subledger_total) - toCents(tb.get("1100").ending_debit)),
    "17446.72"
  );
});

test("FIN-32 T-S3 and T-S4: both ends of the close, and the one account with a bank feed", () => {
  const accounts = cashAccounts();
  assert.deepEqual(accounts.map((a) => a.account_code), ["1010", "1020", "1030", "1050"]);
  const operating = accounts.find((a) => a.account_code === RECONCILED_CASH_ACCOUNT);
  assert.equal(operating.beginning_balance, "3482915.22", "the February anchor the canon timeline records");
  assert.equal(operating.ending_balance, "2740359.09");
  const statement = JSON.parse(
    fileByPath(generateArtifact(specs.byId.get("FIN-01"), canon), "bank-statement-summary.json").content
  );
  const bankEnding = statement.ending_balance ?? statement.closing_balance;
  assert.equal(String(bankEnding), "2806284.46", "FIN-01's bank-side ending balance moved");
  assert.equal(cents(toCents(String(bankEnding)) - toCents(operating.ending_balance)), "65925.37");

  // Not a two-item reconciliation: the twelve outstanding checks are less than
  // the difference, and FIN-03 carries no account attribution at all.
  const checks = csvTable(
    fileByPath(generateArtifact(specs.byId.get("FIN-03"), canon), "outstanding-checks.csv").content
  );
  assert.equal(checks.rows.length, 12);
  assert.equal(cents(checks.rows.reduce((sum, r) => sum + toCents(r.amount), 0)), "57212.36");
  assert.ok(!checks.cols.includes("gl_account"));
});

// ------------------------------------------------------------ red until built

test("FIN-31: 168 rows, seven inputs by the shared 24 month-ends", { todo: WAVE }, () => {
  const rows = kpiRows();
  assert.equal(rows.length, 168);
  assert.deepEqual([...new Set(rows.map((r) => r.period_end))].sort(), [...PERIOD_ENDS].sort());
  assert.deepEqual([...new Set(rows.map((r) => r.metric_id))].sort(), [...METRIC_IDS].sort());
  for (const metricId of METRIC_IDS) {
    assert.equal(rows.filter((r) => r.metric_id === metricId).length, 24, `${metricId} is not a full series`);
  }
});

test("FIN-31 T-S1 and T-S2 over the emitted bytes", { todo: WAVE }, () => {
  const at = (metricId, periodEnd) => kpiRows()
    .find((r) => r.metric_id === metricId && r.period_end === periodEnd).value;
  assert.equal(at("ar_subledger_balance", "2026-03-31"), "3438041.42");
  assert.equal(at("ar_customer_count", "2026-03-31"), "19");
  assert.equal(at("deferred_revenue_current", "2026-03-31"), "20031018.96");
  assert.equal(at("deferred_revenue_noncurrent", "2026-03-31"), "2263716.56");
  assert.equal(at("headcount", "2026-03-31"), "582");
  assert.equal(at("headcount", "2024-04-30"), "413");
  // TODO(wave): assert the headcount series at all 24 dates against CORE-04 by
  // the published rule, and assert computation_note states the 17446.72 gap.
});

test("FIN-32: 96 rows, and every book balance tied to FIN-05 at both ends of the close", { todo: WAVE }, () => {
  const rows = bankRows();
  assert.equal(rows.length, 96);
  const tb = new Map(cashAccounts().map((a) => [a.account_code, a]));
  for (const row of rows.filter((r) => r.period_end === "2026-02-28")) {
    assert.equal(row.book_balance, tb.get(row.account_code).beginning_balance, `${row.account_code} at 2026-02-28`);
  }
  for (const row of rows.filter((r) => r.period_end === "2026-03-31")) {
    assert.equal(row.book_balance, tb.get(row.account_code).ending_balance, `${row.account_code} at 2026-03-31`);
  }
});

test("FIN-32 T-S5: reconciling_difference is the subtraction its own columns state, on all 96 rows", { todo: WAVE }, () => {
  for (const row of bankRows()) {
    assert.equal(
      row.reconciling_difference,
      cents(toCents(row.bank_balance) - toCents(row.book_balance)),
      `${row.account_code} at ${row.period_end}`
    );
    if (row.account_code !== RECONCILED_CASH_ACCOUNT) {
      assert.equal(row.reconciling_difference, "0.00", `${row.account_code} has no bank feed, so it cannot carry a difference`);
    }
  }
  const march1010 = bankRows().find((r) => r.account_code === RECONCILED_CASH_ACCOUNT && r.period_end === "2026-03-31");
  assert.equal(march1010.bank_balance, "2806284.46");
  assert.equal(march1010.reconciling_difference, "65925.37");
});

test("FIN-31 and FIN-32 T-S6 and V19: no emitted file names the absent metric", { todo: WAVE }, () => {
  const emitted = [
    ...generateArtifact(specs.byId.get("FIN-31"), canon),
    ...generateArtifact(specs.byId.get("FIN-32"), canon),
  ];
  for (const file of emitted) {
    assert.ok(
      !new RegExp(ABSENT_BY_DESIGN, "i").test(file.content),
      `${file.path} names the metric the pack deliberately does not declare`
    );
  }
  // The scope is the emitted datasets and never the repository: FIN-31's own
  // spec planted_features carry the word, and so does FIN-34's.
});

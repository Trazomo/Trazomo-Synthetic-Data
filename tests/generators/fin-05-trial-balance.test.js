// FIN-05 gl-trial-balance: the cross-artifact assertions of the reconciliation
// cluster. Every figure here is recomputed from a regenerated artifact rather
// than written down, so this file would catch a reroll of FIN-01, FIN-04 or
// FIN-06 as well as a change to FIN-05 itself. It never names an account
// balance, a customer or a document: the only literals are account codes, which
// the chart already publishes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { buildCashReconciliation, OPENING_BALANCE_CENTS } from "../../datagen/src/generators/fin-01-cash-recon.js";
import { PLUG_BOUNDS_CENTS } from "../../datagen/src/generators/fin-05-gl-trial-balance.js";
import {
  buildChartOfAccounts, OPERATING_CASH_ACCOUNT, AR_CONTROL_ACCOUNT, AP_CONTROL_ACCOUNT,
  ACCRUED_LIABILITIES_ACCOUNT, PREPAID_SOFTWARE_ACCOUNT, PREPAID_INSURANCE_ACCOUNT,
  RETAINED_EARNINGS_PLUG_ACCOUNT,
} from "../../datagen/src/generators/fin-22-chart-of-accounts.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));

// Quote-aware CSV line splitter (mirrors datagen/src/csv.js's escaping).
function splitCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i += 1; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { cells.push(cur); cur = ""; }
    else cur += ch;
  }
  cells.push(cur);
  return cells;
}

function csvTable(content) {
  const [header, ...lines] = content.trim().split("\n");
  const cols = splitCsvLine(header);
  return { cols, rows: lines.map((line) => Object.fromEntries(cols.map((c, i) => [c, splitCsvLine(line)[i]]))) };
}

function fileByPath(files, path) {
  const f = files.find((x) => x.path === path);
  assert.ok(f, `expected output file "${path}" not found`);
  return f;
}

const toCents = (s) => Math.round(Number(s) * 100);
const optionalCents = (s) => (s === "" ? null : toCents(s));

const tbTable = csvTable(generateArtifact(specs.byId.get("FIN-05"), canon)[0].content);
const tb = tbTable.rows;
const tbByCode = new Map(tb.map((r) => [r.account_code, r]));
const chart = buildChartOfAccounts();

const aging = csvTable(fileByPath(generateArtifact(specs.byId.get("FIN-04"), canon), "ar-aging-export.csv").content).rows;
const bills = csvTable(generateArtifact(specs.byId.get("FIN-11"), canon)[0].content).rows;
const rollForward = JSON.parse(
  fileByPath(generateArtifact(specs.byId.get("FIN-10"), canon), "accrual-rollforward.json").content
);

test("T-E2: FIN-05 mirrors the FIN-22 chart row for row", () => {
  assert.deepEqual(tbTable.cols, specs.byId.get("FIN-05").columns);
  assert.equal(tb.length, 65);
  assert.equal(new Set(tb.map((r) => r.account_code)).size, 65);
  assert.deepEqual(tb.map((r) => r.account_code), chart.map((r) => r.account_code));
  for (const chartRow of chart) {
    const row = tbByCode.get(chartRow.account_code);
    assert.ok(row, `${chartRow.account_code} missing from the trial balance`);
    for (const col of ["account_name", "type", "subtype", "normal_balance"]) {
      assert.equal(row[col], chartRow[col], `${chartRow.account_code}.${col} drifted from the chart`);
    }
  }
  const retired = chart.filter((r) => r.active === "false");
  assert.equal(retired.length, 1);
  const retiredRow = tbByCode.get(retired[0].account_code);
  assert.equal(toCents(retiredRow.ending_balance), 0, "the retired account carries a balance");
  assert.equal(retiredRow.ending_debit, "0.00");
  assert.equal(retiredRow.ending_credit, "");
});

test("T-E1 / T-E4: the trial balance balances and every row's movement reconciles", () => {
  let debitTotal = 0;
  let creditTotal = 0;
  for (const row of tb) {
    const debit = optionalCents(row.ending_debit);
    const credit = optionalCents(row.ending_credit);
    assert.ok((debit === null) !== (credit === null), `${row.account_code}: both or neither presentation column populated`);
    if (debit !== null) { assert.ok(debit >= 0); debitTotal += debit; }
    if (credit !== null) { assert.ok(credit >= 0); creditTotal += credit; }

    const ending = toCents(row.ending_balance);
    const beginning = toCents(row.beginning_balance);
    const periodDebit = toCents(row.period_debit);
    const periodCredit = toCents(row.period_credit);
    assert.ok(periodDebit >= 0 && periodCredit >= 0, `${row.account_code}: negative period column`);
    const net = row.normal_balance === "debit" ? periodDebit - periodCredit : periodCredit - periodDebit;
    assert.equal(beginning + net, ending, `T-E4 ${row.account_code}`);
    const onDebitSide = row.normal_balance === "debit" ? ending >= 0 : ending < 0;
    assert.equal(onDebitSide ? debit : credit, Math.abs(ending), `${row.account_code}: presentation side disagrees with the balance`);
    for (const col of ["beginning_balance", "period_debit", "period_credit", "ending_balance"]) {
      assert.match(row[col], /^-?\d+\.\d{2}$/, `${row.account_code}.${col} is not a 2dp decimal`);
    }
  }
  assert.equal(debitTotal, creditTotal, "T-E1: the trial balance does not balance");
});

test("T-E3: account 1010 equals FIN-02's ending cash, recomputed from the cash builder", () => {
  const { gl } = buildCashReconciliation();
  const expected = gl.reduce(
    (balance, row) => balance + (row.debit === "" ? -toCents(row.credit) : toCents(row.debit)),
    OPENING_BALANCE_CENTS
  );
  assert.equal(toCents(tbByCode.get(OPERATING_CASH_ACCOUNT.code).ending_debit), expected);
});

test("T-E5: the residual lands on 3200 as a credit inside a believable band", () => {
  const plug = tbByCode.get(RETAINED_EARNINGS_PLUG_ACCOUNT.code);
  assert.equal(plug.ending_debit, "", "the plug must be a credit balance");
  const plugCents = toCents(plug.ending_credit);
  assert.ok(plugCents >= PLUG_BOUNDS_CENTS.min && plugCents <= PLUG_BOUNDS_CENTS.max,
    `plug at ${plug.ending_credit}`);
  // The plug is the year-to-date profit and loss result, so it has to equal what
  // the revenue and expense rows actually say.
  const plResult = tb
    .filter((r) => ["revenue", "expense"].includes(r.type))
    .reduce((sum, r) => sum + (r.ending_debit === "" ? toCents(r.ending_credit) : -toCents(r.ending_debit)), 0);
  assert.equal(plugCents, plResult, "current year earnings does not equal the profit and loss accounts");
  assert.equal(toCents(plug.beginning_balance), 0, "the fiscal year opens at zero");
});

test("T-A1 / T-A2: the AR delta resolves to exactly one aging row, and that value is unique in the file", () => {
  const agingTotal = aging.reduce((s, r) => s + toCents(r.open_balance), 0);
  const control = toCents(tbByCode.get(AR_CONTROL_ACCOUNT.code).ending_debit);
  const delta = agingTotal - control;
  assert.ok(delta > 0, "the subledger must exceed the control account");
  const hits = aging.filter((r) => toCents(r.open_balance) === delta);
  assert.equal(hits.length, 1, "T-A2: the delta rule must resolve to exactly one row");
  assert.equal(toCents(hits[0].open_balance), delta, "T-A1");
  assert.equal(hits[0].document_type, "invoice", "the item the ledger is missing is an invoice");
  const counts = new Map();
  for (const r of aging) counts.set(r.open_balance, (counts.get(r.open_balance) ?? 0) + 1);
  assert.equal(counts.get(hits[0].open_balance), 1, "T-A2: the planted value must be unique in the file");
});

test("T-B7 / T-D2: accounts payable equals the open bills and accrued liabilities equals the roll-forward", () => {
  const openBills = bills
    .filter((b) => b.payment_status === "open")
    .reduce((s, b) => s + toCents(b.bill_amount), 0);
  assert.equal(toCents(tbByCode.get(AP_CONTROL_ACCOUNT.code).ending_credit), openBills, "T-B7");
  assert.equal(
    toCents(tbByCode.get(ACCRUED_LIABILITIES_ACCOUNT.code).ending_credit),
    toCents(rollForward.closing_balance), "T-D2"
  );
  assert.equal(rollForward.account.code, ACCRUED_LIABILITIES_ACCOUNT.code);
});

test("T-D5 / T-D6: the two prepaid accounts carry exactly the two multi-month bills", () => {
  const month = (d) => d.slice(0, 7);
  const multiMonth = bills.filter((b) => month(b.service_period_start) !== month(b.service_period_end));
  assert.equal(multiMonth.length, 2);
  const scheduled = multiMonth.find((b) => b.amortization_schedule_id !== "");
  const unscheduled = multiMonth.find((b) => b.amortization_schedule_id === "");
  assert.equal(
    toCents(tbByCode.get(PREPAID_SOFTWARE_ACCOUNT.code).ending_debit),
    toCents(scheduled.prepaid_balance), "T-D5: the software prepaid is the remaining scheduled balance"
  );
  assert.equal(
    toCents(tbByCode.get(PREPAID_INSURANCE_ACCOUNT.code).ending_debit),
    toCents(unscheduled.bill_amount), "T-D6: none of the insurance premium is amortized yet"
  );
  assert.equal(unscheduled.months_elapsed, "");
  assert.equal(tbByCode.get(PREPAID_SOFTWARE_ACCOUNT.code).ending_credit, "");
  assert.equal(tbByCode.get(PREPAID_INSURANCE_ACCOUNT.code).ending_credit, "");
});

test("FIN-05: regeneration is byte-identical", () => {
  const runA = generateArtifact(specs.byId.get("FIN-05"), canon);
  const runB = generateArtifact(specs.byId.get("FIN-05"), canon);
  assert.equal(runA.length, runB.length);
  for (let i = 0; i < runA.length; i++) {
    assert.equal(runA[i].path, runB[i].path);
    assert.equal(runA[i].content, runB[i].content, "the trial balance moved between runs");
  }
});

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
import {
  PLUG_BOUNDS_CENTS, DEFICIT_BOUNDS_CENTS, EQUITY_SEPARATION_MIN_CENTS, WORKING_CAPITAL_DAYS,
} from "../../datagen/src/generators/fin-05-gl-trial-balance.js";
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
const cashLedger = csvTable(generateArtifact(specs.byId.get("FIN-02"), canon)[0].content).rows;

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

test("every derived control account takes all four columns from its subledger, not from a draw", () => {
  // The regression this test exists for: beginning, period_debit and
  // period_credit used to be drawn from the model rng on these six accounts and
  // the opening balance back-solved from the draw, so the trial balance could
  // and did contradict the files shipping beside it. `beginning + movement ==
  // ending` cannot catch that, because it is true by construction whenever the
  // opening balance is the thing being solved for. Every assertion below
  // compares a column to the artifact that owns it.

  // 1010: the opening balance canon fixes, and the fold of FIN-02's own ledger.
  const glDebits = cashLedger.reduce((s, r) => s + (r.debit === "" ? 0 : toCents(r.debit)), 0);
  const glCredits = cashLedger.reduce((s, r) => s + (r.credit === "" ? 0 : toCents(r.credit)), 0);
  const cash = tbByCode.get(OPERATING_CASH_ACCOUNT.code);
  assert.equal(toCents(cash.beginning_balance), OPENING_BALANCE_CENTS,
    "1010 must open on the balance canon/timeline.md fixes for March, where book and bank agree");
  assert.equal(toCents(cash.period_debit), glDebits, "1010 period_debit is the FIN-02 debit column");
  assert.equal(toCents(cash.period_credit), glCredits, "1010 period_credit is the FIN-02 credit column");

  // 1100: collections come from FIN-02's receipts, credit memos from FIN-04.
  const arReceipts = cashLedger
    .filter((r) => r.source === "ar" && r.debit !== "")
    .reduce((s, r) => s + toCents(r.debit), 0);
  const marchMemos = aging
    .filter((r) => r.document_type === "credit_memo" && r.document_date >= "2026-03-01")
    .reduce((s, r) => s + Math.abs(toCents(r.original_amount)), 0);
  const ar = tbByCode.get(AR_CONTROL_ACCOUNT.code);
  assert.equal(toCents(ar.period_credit), arReceipts + marchMemos,
    "1100 period_credit is March cash collected plus the credit memos raised in March");
  // Billings equal the revenue actually recognised, net of credits and excluding
  // interest, which is earned rather than billed.
  const billings = tb
    .filter((r) => r.type === "revenue" && r.account_code !== "4200")
    .reduce((s, r) => s + (r.normal_balance === "credit"
      ? toCents(r.period_credit) - toCents(r.period_debit)
      : -(toCents(r.period_debit) - toCents(r.period_credit))), 0);
  assert.equal(toCents(ar.period_debit), billings, "1100 period_debit is what was billed in March");

  // 1200 and 1210: the two prepaid bills state every column.
  const month = (d) => d.slice(0, 7);
  const multiMonth = bills.filter((b) => month(b.service_period_start) !== month(b.service_period_end));
  const scheduled = multiMonth.find((b) => b.amortization_schedule_id !== "");
  const unscheduled = multiMonth.find((b) => b.amortization_schedule_id === "");
  const software = tbByCode.get(PREPAID_SOFTWARE_ACCOUNT.code);
  assert.ok(scheduled.posted_date < "2026-03-01", "the subscription was invoiced before March");
  assert.equal(toCents(software.period_debit), 0, "nothing was added to the software prepaid in March");
  assert.equal(toCents(software.period_credit), toCents(scheduled.monthly_amortization),
    "1200 period_credit is one month of the schedule the bill carries");
  assert.equal(
    toCents(software.beginning_balance),
    toCents(scheduled.bill_amount) - (Number(scheduled.months_elapsed) - 1) * toCents(scheduled.monthly_amortization),
    "1200 opens with one fewer month amortized than it closes with"
  );
  const insurance = tbByCode.get(PREPAID_INSURANCE_ACCOUNT.code);
  assert.ok(unscheduled.posted_date >= "2026-03-01" && unscheduled.posted_date <= "2026-03-31");
  assert.equal(toCents(insurance.beginning_balance), 0, "the insurance prepaid opens empty");
  assert.equal(toCents(insurance.period_debit), toCents(unscheduled.bill_amount), "the whole premium posts in March");
  assert.equal(toCents(insurance.period_credit), 0, "no month of the premium is amortized before the policy attaches");

  // 2000: bills posted in March on one side, cash paid to vendors on the other.
  const marchBills = bills
    .filter((b) => b.posted_date >= "2026-03-01" && b.posted_date <= "2026-03-31")
    .reduce((s, b) => s + toCents(b.bill_amount), 0);
  const apPayments = cashLedger
    .filter((r) => r.source === "ap" && r.credit !== "")
    .reduce((s, r) => s + toCents(r.credit), 0);
  const ap = tbByCode.get(AP_CONTROL_ACCOUNT.code);
  assert.equal(toCents(ap.period_credit), marchBills, "2000 period_credit is the bills posted in March");
  assert.equal(toCents(ap.period_debit), apPayments, "2000 period_debit is the cash FIN-02 paid to vendors");

  // 2010: every column is a line of the roll-forward shipped beside it.
  const accrued = tbByCode.get(ACCRUED_LIABILITIES_ACCOUNT.code);
  assert.equal(toCents(accrued.beginning_balance), toCents(rollForward.opening_balance));
  assert.equal(toCents(accrued.period_debit), toCents(rollForward.reversals));
  assert.equal(toCents(accrued.period_credit), toCents(rollForward.accruals_booked));
  assert.equal(toCents(accrued.ending_credit), toCents(rollForward.closing_balance));
});

test("the trial balance implies working capital the subledgers can support", () => {
  const annualRevenue = tb
    .filter((r) => r.type === "revenue" && r.account_code !== "4200")
    .reduce((s, r) => s + (r.ending_debit === "" ? toCents(r.ending_credit) : -toCents(r.ending_debit)), 0) * 4;
  const marchBills = bills
    .filter((b) => b.posted_date >= "2026-03-01" && b.posted_date <= "2026-03-31")
    .reduce((s, b) => s + toCents(b.bill_amount), 0);
  const dso = (toCents(tbByCode.get(AR_CONTROL_ACCOUNT.code).ending_debit) / annualRevenue) * 365;
  const dpo = (toCents(tbByCode.get(AP_CONTROL_ACCOUNT.code).ending_credit) / (marchBills * 12)) * 365;
  assert.ok(dso >= WORKING_CAPITAL_DAYS.min && dso <= WORKING_CAPITAL_DAYS.max, `days sales outstanding ${dso.toFixed(1)}`);
  assert.ok(dpo >= WORKING_CAPITAL_DAYS.min && dpo <= WORKING_CAPITAL_DAYS.max, `days payables outstanding ${dpo.toFixed(1)}`);
  // Revenue has to stay in the same world as the cash the frozen ledger collects.
  const arReceipts = cashLedger
    .filter((r) => r.source === "ar" && r.debit !== "")
    .reduce((s, r) => s + toCents(r.debit), 0);
  const ratio = annualRevenue / (arReceipts * 12);
  assert.ok(ratio > 0.8 && ratio < 1.25,
    `annualised revenue is ${ratio.toFixed(2)}x the annualised cash FIN-02 collects; the two describe different companies`);
});

test("contributed capital and the accumulated deficit are not the same number twice", () => {
  const apic = toCents(tbByCode.get("3010").ending_credit);
  const deficit = toCents(tbByCode.get("3100").ending_debit);
  assert.ok(deficit >= DEFICIT_BOUNDS_CENTS.min && deficit <= DEFICIT_BOUNDS_CENTS.max, `deficit ${deficit}`);
  assert.ok(Math.abs(apic - deficit) >= EQUITY_SEPARATION_MIN_CENTS,
    "contributed capital and the deficit landed within a rounding error of each other, which reads as machine output");
});

test("T-E5: the residual lands on 3200 as a credit inside a believable band", () => {
  const plug = tbByCode.get(RETAINED_EARNINGS_PLUG_ACCOUNT.code);
  assert.equal(plug.ending_credit, "", "the quarter is a loss, so current year earnings is a debit balance");
  const plugCents = toCents(plug.ending_debit);
  assert.ok(plugCents >= PLUG_BOUNDS_CENTS.min && plugCents <= PLUG_BOUNDS_CENTS.max,
    `plug at ${plug.ending_debit}`);
  // The plug is the year-to-date profit and loss result, so it has to equal what
  // the revenue and expense rows actually say.
  const plResult = tb
    .filter((r) => ["revenue", "expense"].includes(r.type))
    .reduce((sum, r) => sum + (r.ending_debit === "" ? toCents(r.ending_credit) : -toCents(r.ending_debit)), 0);
  assert.equal(-plugCents, plResult, "current year earnings does not equal the profit and loss accounts");
  assert.equal(toCents(plug.beginning_balance), 0, "the fiscal year opens at zero");
  assert.equal(toCents(plug.period_debit), plugCents, "the year to date result accumulates through the period columns");
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

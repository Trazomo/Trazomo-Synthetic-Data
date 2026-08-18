// FIN-05 gl-trial-balance: co-002's pre-close trial balance at 2026-03-31, one
// row per FIN-22 account. This is the cluster's assembler: it imports the cash
// reconciliation (FIN-01), the AR aging (FIN-04) and the procure-to-pay world
// (FIN-06) and takes its control-account balances from them, so the trial
// balance and the subledgers can never drift apart. Every one of those figures
// is recomputed here rather than written down, which is what makes the
// cross-pack tie real: change FIN-01 and this file moves.
//
// Pre-close means at 2026-03-31 before the FIN-09 close batch posts and before
// the FIN-01 reconciliation adjustments are booked. That is also what keeps the
// dependency graph acyclic: FIN-09 and the accrual roll-forward would otherwise
// depend on a trial balance that depends on them.
//
// Derived balances:
//   1010 Operating Cash        the FIN-02 ledger folded from the opening balance
//   1100 Accounts Receivable   the FIN-04 subledger total less the one invoice
//                              the subledger carries and the ledger does not
//   1200 Prepaid Software      the CORE-01 subscription's remaining balance
//   1210 Prepaid Insurance     the FIN-12 premium, none of it yet amortized
//   2000 Accounts Payable      the FIN-11 bills still open at the cut-off
//   2010 Accrued Liabilities   the FIN-10 accrual roll-forward's closing balance
//
// Every other account is modelled from createRng("FIN-05", "model") inside
// bands plausible for a roughly 600-person B2B SaaS company, and account 3200
// Current Year Earnings takes the residual. The build throws if that residual
// lands outside a believable range, so an implausible plug fails here rather
// than shipping.
import { toCsv } from "../csv.js";
import { createRng } from "../seed.js";
import { buildCashReconciliation, OPENING_BALANCE_CENTS } from "./fin-01-cash-recon.js";
import { buildArAging } from "./fin-04-ar-aging.js";
import { buildProcureToPay } from "./fin-06-procure-to-pay.js";
import {
  buildChartOfAccounts, OPERATING_CASH_ACCOUNT, AR_CONTROL_ACCOUNT, AP_CONTROL_ACCOUNT,
  ACCRUED_LIABILITIES_ACCOUNT, PREPAID_SOFTWARE_ACCOUNT, PREPAID_INSURANCE_ACCOUNT,
  RETAINED_EARNINGS_PLUG_ACCOUNT,
} from "./fin-22-chart-of-accounts.js";

export const id = "FIN-05";

export const AS_OF = "2026-03-31";
export const PERIOD = { start: "2026-03-01", end: AS_OF };
/** Where the accumulated deficit lives; the reconciling account of the balance sheet. */
export const ACCUMULATED_DEFICIT_ACCOUNT = { code: "3100" };
/** T-E5: a residual outside this band means the model, not the data, is wrong. */
export const PLUG_BOUNDS_CENTS = { min: 500000000, max: 6000000000 };

export const COLUMNS = [
  "account_code", "account_name", "type", "subtype", "normal_balance",
  "beginning_balance", "period_debit", "period_credit", "ending_balance",
  "ending_debit", "ending_credit",
];

// Modelled ending balances, in integer cents, for the accounts no subledger in
// this cluster owns. Bands only: the draw is deterministic, the shape is a
// roughly 600-person B2B SaaS company three months into its fiscal year.
// [min, max] of the ending balance in the account's own normal sense.
const MODEL_BANDS = {
  "1020": [20000000, 60000000], "1030": [6000000000, 9000000000], "1050": [150000, 450000],
  "1110": [20000000, 45000000], "1120": [80000000, 160000000],
  "1220": [15000000, 40000000], "1230": [8000000, 25000000], "1310": [20000000, 50000000],
  "1400": [400000000, 750000000], "1410": [120000000, 260000000], "1420": [250000000, 500000000],
  "1490": [300000000, 600000000], "1500": [900000000, 1600000000], "1590": [350000000, 700000000],
  "1600": [900000000, 1500000000],
  "2020": [300000000, 600000000], "2030": [400000000, 900000000], "2040": [150000000, 380000000],
  "2100": [90000000, 220000000], "2110": [60000000, 160000000], "2200": [40000000, 120000000],
  "2210": [30000000, 110000000], "2300": [3500000000, 5200000000], "2310": [700000000, 1500000000],
  "2400": [30000000, 90000000], "2500": [200000000, 400000000], "2510": [700000000, 1300000000],
  "3000": [50000, 150000], "3010": [24000000000, 32000000000],
};

// Year-to-date profit and loss, expressed as a March-month amount; the ending
// balance is roughly three of those, because the fiscal year is the calendar
// year (canon/timeline.md) and this is the March trial balance.
const MONTHLY_PL_BANDS = {
  "4000": [880000000, 1080000000], "4010": [360000000, 480000000], "4020": [110000000, 170000000],
  "4100": [90000000, 140000000], "4200": [4000000, 9000000], "4900": [14000000, 30000000],
  "5000": [110000000, 165000000], "5010": [22000000, 45000000], "5020": [70000000, 115000000],
  "5100": [17000000, 34000000],
  "6000": [430000000, 540000000], "6010": [42000000, 66000000], "6020": [60000000, 96000000],
  "6030": [30000000, 70000000], "6040": [12000000, 34000000],
  "6100": [50000000, 78000000], "6110": [5000000, 11000000], "6120": [6000000, 14000000],
  "6125": [0, 0],
  "6200": [38000000, 70000000], "6300": [55000000, 95000000], "6310": [15000000, 45000000],
  "6400": [20000000, 44000000], "6500": [13000000, 32000000], "6510": [9000000, 22000000],
  "6600": [11000000, 20000000], "6700": [700000, 1900000], "6800": [45000000, 85000000],
};

/**
 * How much of its own balance an account turns over in a month, by subtype.
 * Contributed capital does not move between financing rounds; a fixed asset
 * moves only when something is bought; a payable turns over most of itself.
 * Without this a $280 million equity account would post a $60 million entry
 * every March, which is the kind of detail that tells a reader the data is
 * generated rather than kept.
 */
const MOVEMENT_RATE_BY_SUBTYPE = {
  contributed_capital: 0, retained_earnings: 0,
  fixed_asset: 0.03, intangible: 0.04, contra_asset: 0.04, lease: 0.03,
  other_current_asset: 0.05, deferred_revenue: 0.15,
  cash: 0.25, receivable: 0.3, prepaid: 0.3, payable: 0.3, accrued: 0.3,
  payroll: 0.3, tax: 0.3,
};
const DEFAULT_MOVEMENT_RATE = 0.2;

function cents(n) { return (n / 100).toFixed(2); }

function must(condition, message) {
  if (!condition) throw new Error(`FIN-05: ${message}`);
}

/**
 * Split a normal-sense net movement into non-negative debit and credit columns.
 * Real ledgers post both ways in a month even when the net lands one way, so a
 * period_credit of zero on every asset row would read as generated data.
 */
function movement(rng, endingCents, normalBalance, subtype) {
  const rate = MOVEMENT_RATE_BY_SUBTYPE[subtype] ?? DEFAULT_MOVEMENT_RATE;
  const span = Math.floor(Math.abs(endingCents) * rate);
  if (endingCents === 0 || span === 0) return { debit: 0, credit: 0, net: 0 };
  const net = rng.int(-span, span);
  const opposite = Math.max(0, -net) + rng.int(0, Math.floor(span * 0.6));
  return normalBalance === "debit"
    ? { debit: net + opposite, credit: opposite, net }
    : { debit: opposite, credit: net + opposite, net };
}

/**
 * Build the pre-close trial balance. Pure: no I/O, no Date.now(). The derived
 * balances come from the other builders; only the modelled accounts draw from
 * createRng("FIN-05", ...).
 * @returns {{ rows: object[], tieOut: object }}
 */
export function buildTrialBalance() {
  const chart = buildChartOfAccounts();
  must(chart.length === 65, `expected 65 chart rows, got ${chart.length}`);

  // ---- the derived balances, every one recomputed rather than written down ---
  const { gl } = buildCashReconciliation();
  const endingCashCents = gl.reduce(
    (balance, row) => balance + (row.debit === "" ? -Math.round(Number(row.credit) * 100) : Math.round(Number(row.debit) * 100)),
    OPENING_BALANCE_CENTS
  );
  const aging = buildArAging();
  const arControlCents = aging.tieOut.subledgerTotalCents - aging.tieOut.unpostedInvoiceCents;
  const p2p = buildProcureToPay();

  const derived = new Map([
    [OPERATING_CASH_ACCOUNT.code, endingCashCents],
    [AR_CONTROL_ACCOUNT.code, arControlCents],
    [PREPAID_SOFTWARE_ACCOUNT.code, p2p.tieOut.prepaidSoftwareBalanceCents],
    [PREPAID_INSURANCE_ACCOUNT.code, p2p.tieOut.prepaidInsuranceBalanceCents],
    [AP_CONTROL_ACCOUNT.code, p2p.tieOut.apOpenBillsCents],
    [ACCRUED_LIABILITIES_ACCOUNT.code, p2p.tieOut.accrualClosingCents],
  ]);
  for (const [code, value] of derived) must(Number.isInteger(value) && value > 0, `derived balance for ${code} is ${value}`);

  // ---- model everything else, leaving 3100 and 3200 to reconcile -------------
  const rng = createRng(id, "model");
  const balances = new Map();
  const movements = new Map();
  for (const row of chart) {
    const code = row.account_code;
    if (code === ACCUMULATED_DEFICIT_ACCOUNT.code || code === RETAINED_EARNINGS_PLUG_ACCOUNT.code) continue;
    let ending;
    if (derived.has(code)) {
      ending = derived.get(code);
    } else if (MODEL_BANDS[code]) {
      ending = rng.int(MODEL_BANDS[code][0], MODEL_BANDS[code][1]);
    } else if (MONTHLY_PL_BANDS[code]) {
      const monthly = rng.int(MONTHLY_PL_BANDS[code][0], MONTHLY_PL_BANDS[code][1]);
      ending = monthly * 3 + (monthly === 0 ? 0 : rng.int(-Math.floor(monthly * 0.12), Math.floor(monthly * 0.12)));
      balances.set(code, ending);
      // A profit and loss account's period movement is one month of it, in its
      // own direction, with the small opposite-side traffic a real month carries.
      const opposite = monthly === 0 ? 0 : rng.int(0, Math.floor(monthly * 0.08));
      movements.set(code, row.normal_balance === "debit"
        ? { debit: monthly + opposite, credit: opposite, net: monthly }
        : { debit: opposite, credit: monthly + opposite, net: monthly });
      continue;
    } else {
      throw new Error(`FIN-05: no band for account ${code}; every chart row needs one`);
    }
    balances.set(code, ending);
    movements.set(code, movement(rng, ending, row.normal_balance, row.subtype));
  }
  must(balances.get("6125") === 0, "the retired account must carry a zero balance");

  const signed = (code) => {
    const row = chart.find((r) => r.account_code === code);
    return row.normal_balance === "debit" ? balances.get(code) : -balances.get(code);
  };

  // 3200 Current Year Earnings is the residual of the profit and loss accounts,
  // computed and never written: revenue less expenses, year to date. If the
  // model ever stops describing a real company the bounds check below fails the
  // build rather than shipping an implausible plug.
  const plCodes = chart.filter((r) => r.type === "revenue" || r.type === "expense").map((r) => r.account_code);
  const plugCents = -plCodes.reduce((sum, code) => sum + signed(code), 0);
  must(plugCents >= PLUG_BOUNDS_CENTS.min && plugCents <= PLUG_BOUNDS_CENTS.max,
    `T-E5: the plug landed at ${cents(plugCents)}, outside ${cents(PLUG_BOUNDS_CENTS.min)} to ${cents(PLUG_BOUNDS_CENTS.max)}`);
  balances.set(RETAINED_EARNINGS_PLUG_ACCOUNT.code, plugCents);
  // Current year earnings opens the fiscal year at zero and accumulates.
  movements.set(RETAINED_EARNINGS_PLUG_ACCOUNT.code, { debit: 0, credit: plugCents, net: plugCents });

  // Retained earnings then reconciles the balance sheet: a credit-normal
  // account carrying a debit balance, which is what a venture-funded company's
  // books actually look like. It does not move inside the year, because the
  // year's result sits in 3200 until the year-end close rolls it over.
  const retainedEarningsCents = chart
    .filter((r) => balances.has(r.account_code))
    .reduce((sum, r) => sum + signed(r.account_code), 0);
  balances.set(ACCUMULATED_DEFICIT_ACCOUNT.code, retainedEarningsCents);
  movements.set(ACCUMULATED_DEFICIT_ACCOUNT.code, { debit: 0, credit: 0, net: 0 });
  const deficitCents = -retainedEarningsCents;
  must(deficitCents >= 5000000000 && deficitCents <= 60000000000,
    `the accumulated deficit landed at ${cents(deficitCents)}, outside the plausible band`);

  // ---- emit ------------------------------------------------------------------
  const rows = chart.map((row) => {
    const code = row.account_code;
    const ending = balances.get(code);
    const move = movements.get(code);
    must(ending !== undefined && move !== undefined, `account ${code} was never modelled`);
    const beginning = code === RETAINED_EARNINGS_PLUG_ACCOUNT.code ? 0 : ending - move.net;
    must(move.debit >= 0 && move.credit >= 0, `account ${code} has a negative period column`);
    const isDebitSide = row.normal_balance === "debit" ? ending >= 0 : ending < 0;
    const presented = Math.abs(ending);
    return {
      account_code: code,
      account_name: row.account_name,
      type: row.type,
      subtype: row.subtype,
      normal_balance: row.normal_balance,
      beginning_balance: cents(beginning),
      period_debit: cents(move.debit),
      period_credit: cents(move.credit),
      ending_balance: cents(ending),
      ending_debit: isDebitSide ? cents(presented) : "",
      ending_credit: isDebitSide ? "" : cents(presented),
    };
  });

  const debitTotal = rows.reduce((s, r) => s + (r.ending_debit === "" ? 0 : Math.round(Number(r.ending_debit) * 100)), 0);
  const creditTotal = rows.reduce((s, r) => s + (r.ending_credit === "" ? 0 : Math.round(Number(r.ending_credit) * 100)), 0);
  must(debitTotal === creditTotal, `T-E1: debits ${cents(debitTotal)} do not equal credits ${cents(creditTotal)}`);

  return {
    rows,
    tieOut: {
      endingCashCents,
      arControlCents,
      subledgerTotalCents: aging.tieOut.subledgerTotalCents,
      unpostedInvoiceCents: aging.tieOut.unpostedInvoiceCents,
      apOpenBillsCents: p2p.tieOut.apOpenBillsCents,
      accrualClosingCents: p2p.tieOut.accrualClosingCents,
      prepaidSoftwareBalanceCents: p2p.tieOut.prepaidSoftwareBalanceCents,
      prepaidInsuranceBalanceCents: p2p.tieOut.prepaidInsuranceBalanceCents,
      plugCents,
      deficitCents,
      debitTotalCents: debitTotal,
      creditTotalCents: creditTotal,
    },
  };
}

// ---------------------------------------------------------------- generate

export function generate() {
  const { rows } = buildTrialBalance();
  return [{ path: "gl-trial-balance.csv", content: toCsv(COLUMNS, rows) }];
}

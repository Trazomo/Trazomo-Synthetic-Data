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
/** Interest is earned, never billed, so it is outside the receivable roll-forward. */
const INTEREST_INCOME_CODE = "4200";
/** Sales discounts and credits: revenue-typed but debit-normal. */
const CONTRA_REVENUE_CODE = "4900";
/** The sweep account the operating account transfers to and from. */
const MONEY_MARKET_SWEEP_CODE = "1030";
const SWEEP_REFERENCE_PREFIX = "MMKT-";
const INTEREST_REFERENCE_PREFIX = "INT-";
/**
 * Deferred revenue moves by billings less revenue recognized, which for a
 * subscription business billed in advance is the identity that defines it. It
 * is derived from those two figures rather than drawn or plugged.
 */
const DEFERRED_REVENUE_CODE = "2300";
/**
 * Accounts that do not move inside a period: contributed capital moves only on
 * a financing event, and retained earnings only at the year-end close.
 */
const STATIC_CODES = new Set(["3000", "3010"]);
/** No modelled account may turn over more than this share of itself in a month. */
const MODELLED_MOVEMENT_MAX_SHARE = 0.35;
/**
 * T-E5: a year-to-date result outside this magnitude means the model, not the
 * data, is wrong. The sign is asserted separately, and it is a DEBIT: the
 * frozen March cash ledger collects about 4.17m of receivables and pays out
 * about 5.16m, and the shipped subledgers price payroll and vendor spend above
 * billings, so co-002 is loss making in the quarter. See the note on U12.
 */
export const PLUG_BOUNDS_CENTS = { min: 100000000, max: 2500000000 };
/** The accumulated deficit has to stay a plausible multiple of the raise. */
export const DEFICIT_BOUNDS_CENTS = { min: 5000000000, max: 40000000000 };
/**
 * Contributed capital and the accumulated deficit are separate facts about the
 * company and must not land on top of each other. Two figures a few thousand
 * dollars apart on a balance sheet this size read as machine output, not as
 * books, so the build refuses them.
 */
export const EQUITY_SEPARATION_MIN_CENTS = 500000000;
/** Days sales outstanding and days payables outstanding the pack has to imply. */
export const WORKING_CAPITAL_DAYS = { min: 15, max: 45 };

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
  "1020": [15000000, 60000000], "1030": [2200000000, 3400000000], "1050": [150000, 450000],
  "1110": [20000000, 45000000], "1120": [80000000, 160000000],
  "1220": [15000000, 40000000], "1230": [8000000, 25000000], "1310": [20000000, 50000000],
  "1400": [400000000, 700000000], "1410": [120000000, 240000000], "1420": [250000000, 450000000],
  "1490": [300000000, 550000000], "1500": [800000000, 1400000000], "1590": [350000000, 650000000],
  "1600": [800000000, 1400000000],
  "2020": [140000000, 200000000], "2030": [80000000, 160000000], "2040": [40000000, 90000000],
  "2100": [25000000, 55000000], "2110": [15000000, 35000000], "2200": [15000000, 35000000],
  "2210": [5000000, 18000000], "2300": [1900000000, 2600000000], "2310": [200000000, 500000000],
  "2400": [6000000, 15000000], "2500": [200000000, 320000000], "2510": [600000000, 1100000000],
  "3000": [50000, 150000], "3010": [16500000000, 20500000000],
};

// Year-to-date profit and loss, expressed as a March-month amount; the ending
// balance is roughly three of those, because the fiscal year is the calendar
// year (canon/timeline.md) and this is the March trial balance.
const MONTHLY_PL_BANDS = {
  "4000": [220000000, 240000000], "4010": [98000000, 112000000], "4020": [32000000, 38000000],
  "4100": [38000000, 46000000], "4200": [7000000, 11000000], "4900": [4000000, 6000000],
  "5000": [34000000, 39000000], "5010": [7500000, 10500000], "5020": [27000000, 33000000],
  "5100": [5000000, 7000000],
  "6000": [245000000, 265000000], "6010": [24000000, 28000000], "6020": [26000000, 32000000],
  "6030": [11000000, 15000000], "6040": [4000000, 6500000],
  "6100": [30000000, 34000000], "6110": [9000000, 11000000], "6120": [4000000, 6000000],
  "6125": [0, 0],
  "6200": [65000000, 72000000], "6300": [13000000, 16000000], "6310": [1500000, 2500000],
  "6400": [4500000, 6000000], "6500": [5000000, 7500000], "6510": [3500000, 5000000],
  "6600": [4500000, 5800000], "6700": [25000, 45000], "6800": [33000000, 38000000],
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

/**
 * Fold FIN-02's cash ledger into the four columns account 1010 reports, plus the
 * by-source subtotals the receivable and payable roll-forwards need. Nothing
 * here is drawn: every number is a sum over rows another artifact already
 * committed.
 */
function foldCashLedger(gl) {
  let debitCents = 0;
  let creditCents = 0;
  let arReceiptsCents = 0;
  let apPaymentsCents = 0;
  let sweepTransfersOutCents = 0;
  let operatingInterestCents = 0;
  for (const row of gl) {
    const debit = row.debit === "" ? 0 : Math.round(Number(row.debit) * 100);
    const credit = row.credit === "" ? 0 : Math.round(Number(row.credit) * 100);
    debitCents += debit;
    creditCents += credit;
    if (row.source === "ar") arReceiptsCents += debit;
    if (row.source === "ap") apPaymentsCents += credit;
    // Money arriving in the operating account from the sweep left the sweep.
    if (row.reference.startsWith(SWEEP_REFERENCE_PREFIX)) sweepTransfersOutCents += debit;
    if (row.reference.startsWith(INTEREST_REFERENCE_PREFIX)) operatingInterestCents += debit;
  }
  return {
    openingCents: OPENING_BALANCE_CENTS,
    debitCents,
    creditCents,
    endingCents: OPENING_BALANCE_CENTS + debitCents - creditCents,
    arReceiptsCents,
    apPaymentsCents,
    sweepTransfersOutCents,
    operatingInterestCents,
  };
}

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

  // ---- the sources, every figure recomputed rather than written down --------
  //
  // The six control accounts below take ALL FOUR columns from their subledgers,
  // not just the closing balance. An opening balance that is quietly back-solved
  // from a drawn movement is not a fact about the company, and it can silently
  // contradict the very files it ships beside: before this, account 1010 opened
  // 349,324.13 below the opening balance canon/timeline.md fixes for March.
  const { gl } = buildCashReconciliation();
  const cash = foldCashLedger(gl);
  must(cash.openingCents === OPENING_BALANCE_CENTS, "the cash fold lost its opening balance");
  const aging = buildArAging();
  const arControlCents = aging.tieOut.subledgerTotalCents - aging.tieOut.unpostedInvoiceCents;
  // A credit memo raised in March credits receivables in March, on top of cash.
  const marchCreditMemoCents = aging.aging
    .filter((r) => r.document_type === "credit_memo" && r.document_date >= PERIOD.start)
    .reduce((sum, r) => sum + Math.abs(Math.round(Number(r.original_amount) * 100)), 0);
  const p2p = buildProcureToPay();
  const prepaidSoftware = p2p.tieOut.prepaidSoftware;
  const prepaidInsurance = p2p.tieOut.prepaidInsurance;

  // ---- model the accounts no subledger in this cluster owns ------------------
  const rng = createRng(id, "model");
  const balances = new Map();
  const movements = new Map();
  const modelledWeights = new Map();
  const derivedCodes = new Set([
    OPERATING_CASH_ACCOUNT.code, AR_CONTROL_ACCOUNT.code, AP_CONTROL_ACCOUNT.code,
    ACCRUED_LIABILITIES_ACCOUNT.code, PREPAID_SOFTWARE_ACCOUNT.code, PREPAID_INSURANCE_ACCOUNT.code,
  ]);
  // The sweep takes its closing balance from a band like any modelled account,
  // but its movement from the ledger, so it stays in the modelling loop below
  // and has its movement replaced once the interest row is known.
  for (const row of chart) {
    const code = row.account_code;
    if (code === ACCUMULATED_DEFICIT_ACCOUNT.code || code === RETAINED_EARNINGS_PLUG_ACCOUNT.code) continue;
    if (derivedCodes.has(code)) continue;
    if (MODEL_BANDS[code]) {
      const ending = rng.int(MODEL_BANDS[code][0], MODEL_BANDS[code][1]);
      balances.set(code, ending);
      // The movement is allocated later, not drawn here. Drawing each balance
      // sheet account's movement independently is what stopped the period column
      // footing: twenty-five independent draws do not add up to a month of double
      // entry, and the leftover had to be plugged into one account.
      modelledWeights.set(code, rng.amount(0.5, 1.5, 4) * (MOVEMENT_RATE_BY_SUBTYPE[row.subtype] ?? DEFAULT_MOVEMENT_RATE));
    } else if (MONTHLY_PL_BANDS[code]) {
      const monthly = rng.int(MONTHLY_PL_BANDS[code][0], MONTHLY_PL_BANDS[code][1]);
      const ending = monthly * 3 + (monthly === 0 ? 0 : rng.int(-Math.floor(monthly * 0.12), Math.floor(monthly * 0.12)));
      balances.set(code, ending);
      // A profit and loss account's period movement is one month of it, in its
      // own direction, with the small opposite-side traffic a real month carries.
      const opposite = monthly === 0 ? 0 : rng.int(0, Math.floor(monthly * 0.08));
      movements.set(code, row.normal_balance === "debit"
        ? { debit: monthly + opposite, credit: opposite, net: monthly }
        : { debit: opposite, credit: monthly + opposite, net: monthly });
    } else {
      throw new Error(`FIN-05: no band for account ${code}; every chart row needs one`);
    }
  }
  must(balances.get("6125") === 0, "the retired account must carry a zero balance");

  // What March actually recognized, net of credits and excluding interest, which
  // is earned rather than billed.
  const marchRevenueCents = chart
    .filter((r) => r.type === "revenue" && r.account_code !== INTEREST_INCOME_CODE)
    .reduce((sum, r) => {
      const move = movements.get(r.account_code);
      return sum + (r.normal_balance === "credit" ? move.credit - move.debit : -(move.debit - move.credit));
    }, 0);
  // A business billing annually in advance bills more than it recognizes in a
  // growing month and less in a quiet one; the gap is the deferred revenue
  // movement, and billings follow from the two. Receivables are then debited
  // with what was billed, not with what was recognized.
  const deferredRevenueNetCents = Math.round(balances.get(DEFERRED_REVENUE_CODE) * rng.amount(-0.03, 0.08, 5));
  const marchBillingsCents = marchRevenueCents + deferredRevenueNetCents;

  // ---- the six derived control accounts, all four columns from the source ----
  // `beginning` is a stated fact wherever the source states one (cash, the
  // accrual roll-forward, the two prepaid bills). For receivables and payables
  // the two movement legs are the derived facts and the opening balance is what
  // double entry says it must have been, which is a different thing from
  // drawing it: change either leg and this number moves with it.
  // Write a movement from a net expressed in the account's own normal sense,
  // keeping a little traffic on the opposite side, the way a real month does.
  const setSignedMovement = (code, net, normalBalance) => {
    const opposite = Math.round(Math.abs(net) * rng.amount(0.02, 0.22, 4));
    // A shrinking balance posts on the side opposite its normal one, so the
    // sign of the net decides which column carries it.
    const onNormalSide = net >= 0 ? net + opposite : opposite;
    const onOtherSide = net >= 0 ? opposite : -net + opposite;
    movements.set(code, normalBalance === "debit"
      ? { debit: onNormalSide, credit: onOtherSide, net }
      : { debit: onOtherSide, credit: onNormalSide, net });
    const move = movements.get(code);
    must(move.debit >= 0 && move.credit >= 0, `${code}: a period column went negative`);
  };

  const setDerived = (code, { beginning, debit, credit, ending }) => {
    const row = chart.find((r) => r.account_code === code);
    const net = row.normal_balance === "debit" ? debit - credit : credit - debit;
    must(beginning + net === ending,
      `${code}: ${cents(beginning)} + ${cents(net)} does not reach ${cents(ending)}`);
    must(debit >= 0 && credit >= 0, `${code}: a period column went negative`);
    balances.set(code, ending);
    movements.set(code, { debit, credit, net });
  };

  setDerived(OPERATING_CASH_ACCOUNT.code, {
    beginning: cash.openingCents, debit: cash.debitCents, credit: cash.creditCents, ending: cash.endingCents,
  });
  const arCreditCents = cash.arReceiptsCents + marchCreditMemoCents;
  setDerived(AR_CONTROL_ACCOUNT.code, {
    beginning: arControlCents + arCreditCents - marchBillingsCents,
    debit: marchBillingsCents, credit: arCreditCents, ending: arControlCents,
  });
  // The subscription was invoiced in February, so March debits nothing to it and
  // credits exactly one month of the schedule the bill already carries.
  const softwarePostedInMarch = prepaidSoftware.postedDate >= PERIOD.start && prepaidSoftware.postedDate <= AS_OF;
  const softwareAmortizedInMarch = prepaidSoftware.monthsElapsed >= 1 ? prepaidSoftware.monthlyAmortizationCents : 0;
  const softwareEnding = prepaidSoftware.billAmountCents - prepaidSoftware.monthsElapsed * prepaidSoftware.monthlyAmortizationCents;
  setDerived(PREPAID_SOFTWARE_ACCOUNT.code, {
    beginning: softwareEnding + softwareAmortizedInMarch - (softwarePostedInMarch ? prepaidSoftware.billAmountCents : 0),
    debit: softwarePostedInMarch ? prepaidSoftware.billAmountCents : 0,
    credit: softwareAmortizedInMarch, ending: softwareEnding,
  });
  // The premium posted in March against a policy year that opens in April, so
  // the account opens empty, takes the whole bill and amortizes none of it.
  const insurancePostedInMarch = prepaidInsurance.postedDate >= PERIOD.start && prepaidInsurance.postedDate <= AS_OF;
  must(insurancePostedInMarch, "the insurance premium did not post inside March");
  setDerived(PREPAID_INSURANCE_ACCOUNT.code, {
    beginning: 0, debit: prepaidInsurance.billAmountCents, credit: 0, ending: prepaidInsurance.billAmountCents,
  });
  setDerived(AP_CONTROL_ACCOUNT.code, {
    beginning: p2p.tieOut.apOpenBillsCents + cash.apPaymentsCents - p2p.tieOut.marchPostedBillsCents,
    debit: cash.apPaymentsCents, credit: p2p.tieOut.marchPostedBillsCents,
    ending: p2p.tieOut.apOpenBillsCents,
  });
  const roll = p2p.rollForward;
  const rollCents = (v) => Math.round(Number(v) * 100);
  setDerived(ACCRUED_LIABILITIES_ACCOUNT.code, {
    beginning: rollCents(roll.opening_balance), debit: rollCents(roll.reversals),
    credit: rollCents(roll.accruals_booked), ending: rollCents(roll.closing_balance),
  });
  // The sweep is a cash account in a cash-reconciliation pack, so its movement
  // has to be the movement the frozen ledger records: one transfer out to the
  // operating account, plus the interest the sweep earned that never reached
  // that account. A drawn movement here would ship millions of unexplained cash
  // activity next to a ledger that accounts for every dollar of it.
  const sweepEnding = balances.get(MONEY_MARKET_SWEEP_CODE);
  const sweepInterestCents = Math.max(0, movements.get(INTEREST_INCOME_CODE).credit - cash.operatingInterestCents);
  setDerived(MONEY_MARKET_SWEEP_CODE, {
    beginning: sweepEnding + cash.sweepTransfersOutCents - sweepInterestCents,
    debit: sweepInterestCents, credit: cash.sweepTransfersOutCents, ending: sweepEnding,
  });
  for (const code of derivedCodes) {
    must(balances.get(code) > 0, `derived balance for ${code} is ${balances.get(code)}`);
    must(movements.get(code) !== undefined, `derived movement for ${code} is missing`);
  }

  const signed = (code) => {
    const row = chart.find((r) => r.account_code === code);
    return row.normal_balance === "debit" ? balances.get(code) : -balances.get(code);
  };

  // 3200 Current Year Earnings is the residual of the profit and loss accounts,
  // computed and never written: revenue less expenses, year to date. It is a
  // DEBIT, because the shipped subledgers price the quarter's payroll and vendor
  // spend above its billings. The bounds check fails the build rather than
  // shipping a result the rest of the pack cannot support.
  const plCodes = chart.filter((r) => r.type === "revenue" || r.type === "expense").map((r) => r.account_code);
  const yearToDateResultCents = -plCodes.reduce((sum, code) => sum + signed(code), 0);
  const plugCents = yearToDateResultCents;
  must(plugCents < 0, `T-E5: current year earnings came out as a credit of ${cents(-plugCents)}; the shipped subledgers describe a loss`);
  must(Math.abs(plugCents) >= PLUG_BOUNDS_CENTS.min && Math.abs(plugCents) <= PLUG_BOUNDS_CENTS.max,
    `T-E5: the year to date result landed at ${cents(plugCents)}, outside ${cents(PLUG_BOUNDS_CENTS.min)} to ${cents(PLUG_BOUNDS_CENTS.max)} in magnitude`);
  balances.set(RETAINED_EARNINGS_PLUG_ACCOUNT.code, plugCents);
  // The period column is March, so what current year earnings moved by in the
  // period is March's result, not the quarter's. The opening balance is then the
  // two months already run, which is what the account actually held on
  // 2026-03-01. It opened at zero on 1 January, not on 1 March.
  const marchResultCents = -plCodes.reduce((sum, code) => {
    const move = movements.get(code);
    return sum + move.debit - move.credit;
  }, 0);
  movements.set(RETAINED_EARNINGS_PLUG_ACCOUNT.code, marchResultCents >= 0
    ? { debit: 0, credit: marchResultCents, net: marchResultCents }
    : { debit: -marchResultCents, credit: 0, net: marchResultCents });

  // Retained earnings then reconciles the balance sheet: a credit-normal
  // account carrying a debit balance, which is what a venture-funded company's
  // books actually look like. It does not move inside the year, because the
  // year's result sits in 3200 until the year-end close rolls it over.
  const retainedEarningsCents = chart
    .filter((r) => balances.has(r.account_code))
    .reduce((sum, r) => sum + signed(r.account_code), 0);
  balances.set(ACCUMULATED_DEFICIT_ACCOUNT.code, retainedEarningsCents);
  movements.set(ACCUMULATED_DEFICIT_ACCOUNT.code, { debit: 0, credit: 0, net: 0 });

  // A trial balance has to foot in all three columns, not just the closing one.
  // The closing column balances because retained earnings absorbs its residual.
  // The period column is a month of postings and has to balance on its own, and
  // once it does the opening column follows for free, because every row opens at
  // its closing balance less its own movement. Without this the books were out
  // by the period residual at 2026-02-28.
  //
  // Deferred revenue carries the balancing movement. That is not a plug of
  // convenience: in a subscription business billed in advance, deferred revenue
  // is precisely the account where the gap between what was billed and what was
  // recognized lands each month.
  // Contributed capital does not move between financing events.
  for (const code of STATIC_CODES) movements.set(code, { debit: 0, credit: 0, net: 0 });

  // Deferred revenue moves by exactly what was billed less what was recognized.
  must(marchBillingsCents - marchRevenueCents === deferredRevenueNetCents,
    "the deferred revenue movement is not the gap between billings and revenue");
  setSignedMovement(DEFERRED_REVENUE_CODE, deferredRevenueNetCents, "credit");

  // Everything the month's double entry has not yet accounted for is spread
  // across the remaining modelled balance sheet accounts in proportion to how
  // much of itself each one turns over in a month, so the period column foots
  // without any single account carrying a plug. Contributed capital, retained
  // earnings, the derived control accounts, the sweep and deferred revenue are
  // all excluded: each of those already has a movement it is answerable for.
  const allocationCodes = chart
    .map((r) => r.account_code)
    .filter((code) => modelledWeights.has(code)
      && !STATIC_CODES.has(code) && code !== DEFERRED_REVENUE_CODE && code !== MONEY_MARKET_SWEEP_CODE);
  const weightTotal = allocationCodes.reduce((sum, code) => sum + balances.get(code) * modelledWeights.get(code), 0);
  must(weightTotal > 0, "no modelled account is available to carry the period movement");
  const residualCents = chart.reduce((sum, r) => {
    const move = movements.get(r.account_code);
    return move ? sum + move.debit - move.credit : sum;
  }, 0);
  let allocated = 0;
  allocationCodes.forEach((code, i) => {
    const share = i === allocationCodes.length - 1
      ? -residualCents - allocated
      : Math.round(-residualCents * (balances.get(code) * modelledWeights.get(code)) / weightTotal);
    allocated += share;
    const row = chart.find((r) => r.account_code === code);
    // `share` is debit-positive; a movement's `net` is in the account's own sense.
    setSignedMovement(code, row.normal_balance === "debit" ? share : -share, row.normal_balance);
    must(Math.abs(share) <= Math.round(balances.get(code) * MODELLED_MOVEMENT_MAX_SHARE),
      `account ${code} would have to turn over ${cents(share)} against a balance of `
      + `${cents(balances.get(code))}; the period column is not closing on a believable set of movements`);
  });
  const deficitCents = -retainedEarningsCents;
  must(deficitCents >= DEFICIT_BOUNDS_CENTS.min && deficitCents <= DEFICIT_BOUNDS_CENTS.max,
    `the accumulated deficit landed at ${cents(deficitCents)}, outside the plausible band`);
  const contributedCapitalCents = balances.get("3010");
  must(Math.abs(contributedCapitalCents - deficitCents) >= EQUITY_SEPARATION_MIN_CENTS,
    `contributed capital ${cents(contributedCapitalCents)} and the deficit ${cents(deficitCents)} are within `
    + `${cents(EQUITY_SEPARATION_MIN_CENTS)} of each other, which reads as arithmetic rather than as books`);

  // Working capital has to be believable against the subledgers this pack ships.
  const annualRevenueCents = chart
    .filter((r) => r.type === "revenue" && r.account_code !== INTEREST_INCOME_CODE && r.normal_balance === "credit")
    .reduce((sum, r) => sum + balances.get(r.account_code), 0) * 4
    - balances.get(CONTRA_REVENUE_CODE) * 4;
  const annualPurchasesCents = p2p.tieOut.marchPostedBillsCents * 12;
  const dso = (arControlCents / annualRevenueCents) * 365;
  const dpo = (p2p.tieOut.apOpenBillsCents / annualPurchasesCents) * 365;
  must(dso >= WORKING_CAPITAL_DAYS.min && dso <= WORKING_CAPITAL_DAYS.max,
    `days sales outstanding came out at ${dso.toFixed(1)}, outside ${WORKING_CAPITAL_DAYS.min} to ${WORKING_CAPITAL_DAYS.max}`);
  must(dpo >= WORKING_CAPITAL_DAYS.min && dpo <= WORKING_CAPITAL_DAYS.max,
    `days payables outstanding came out at ${dpo.toFixed(1)}, outside ${WORKING_CAPITAL_DAYS.min} to ${WORKING_CAPITAL_DAYS.max}`);

  // T-A1, asserted here because this is the only builder that holds both sides:
  // the delta between the subledger and the control account has to resolve to
  // exactly one aging row, and to a row whose amount is unique in the file.
  const delta = aging.tieOut.subledgerTotalCents - arControlCents;
  const deltaHits = aging.aging.filter((r) => Math.round(Number(r.open_balance) * 100) === delta);
  must(deltaHits.length === 1,
    `T-A1: the receivable delta ${cents(delta)} resolves to ${deltaHits.length} aging rows, not one`);
  must(deltaHits[0].document_type === "invoice", "T-A1: the delta resolved to something other than an invoice");

  // ---- emit ------------------------------------------------------------------
  const rows = chart.map((row) => {
    const code = row.account_code;
    const ending = balances.get(code);
    const move = movements.get(code);
    must(ending !== undefined && move !== undefined, `account ${code} was never modelled`);
    const beginning = ending - move.net;
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
  // The opening column is a trial balance at 2026-02-28 and has to foot on its
  // own, and the period column is a month of postings and has to foot on its own.
  let openingDebit = 0;
  let openingCredit = 0;
  let periodDebit = 0;
  let periodCredit = 0;
  for (const row of rows) {
    const opening = Math.round(Number(row.beginning_balance) * 100);
    const onDebitSide = row.normal_balance === "debit" ? opening >= 0 : opening < 0;
    if (onDebitSide) openingDebit += Math.abs(opening); else openingCredit += Math.abs(opening);
    periodDebit += Math.round(Number(row.period_debit) * 100);
    periodCredit += Math.round(Number(row.period_credit) * 100);
  }
  must(openingDebit === openingCredit,
    `T-E1: the opening column does not foot, debits ${cents(openingDebit)} against credits ${cents(openingCredit)}`);
  must(periodDebit === periodCredit,
    `T-E1: the period column does not foot, debits ${cents(periodDebit)} against credits ${cents(periodCredit)}`);

  return {
    rows,
    tieOut: {
      endingCashCents: cash.endingCents,
      cashOpeningCents: cash.openingCents,
      cashDebitCents: cash.debitCents,
      cashCreditCents: cash.creditCents,
      arReceiptsCents: cash.arReceiptsCents,
      apPaymentsCents: cash.apPaymentsCents,
      marchBillingsCents,
      marchPostedBillsCents: p2p.tieOut.marchPostedBillsCents,
      arControlCents,
      subledgerTotalCents: aging.tieOut.subledgerTotalCents,
      unpostedInvoiceCents: aging.tieOut.unpostedInvoiceCents,
      apOpenBillsCents: p2p.tieOut.apOpenBillsCents,
      prepaidSoftwareBalanceCents: p2p.tieOut.prepaidSoftwareBalanceCents,
      prepaidInsuranceBalanceCents: p2p.tieOut.prepaidInsuranceBalanceCents,
      accrualClosingCents: p2p.tieOut.accrualClosingCents,
      plugCents,
      deficitCents,
      contributedCapitalCents,
      dso,
      dpo,
      debitTotalCents: debitTotal,
      creditTotalCents: creditTotal,
      openingDebitTotalCents: openingDebit,
      periodDebitTotalCents: periodDebit,
      marchResultCents,
      deferredRevenueMovementCents: deferredRevenueNetCents,
      marchRevenueCents,
      sweepTransfersOutCents: cash.sweepTransfersOutCents,
    },
  };
}

// ---------------------------------------------------------------- generate

export function generate() {
  const { rows } = buildTrialBalance();
  return [{ path: "gl-trial-balance.csv", content: toCsv(COLUMNS, rows) }];
}

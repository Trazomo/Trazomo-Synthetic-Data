// FIN-31 kpi-source-data and FIN-32 bank-balances: the non-ledger KPI inputs
// module 29 plots, and the month-end cash they are read against. One builder
// emits both (the FIN-15 over FIN-16 pattern), so the inputs and the cash can
// never disagree about which months they cover.
//
// The split between the three FP&A files is deliberate and non-overlapping:
// FIN-33 is the profit-and-loss trend, FIN-32 is cash, FIN-31 is everything
// else a KPI needs and no other artifact carries. All three read the same
// 24-month series from monthEnds() in datagen/src/dates.js and none of them
// recomputes it locally.
//
// Nothing here invents a figure a frozen file already carries. Seven inputs by
// twenty-four month-ends is 168 rows, and every row the pack pins is read out
// of the pack rather than typed:
//
//   ar_subledger_balance and ar_customer_count at 2026-03-31 out of FIN-04's
//   own summary; deferred_revenue_current and deferred_revenue_noncurrent at
//   BOTH ends of the March close, out of FIN-05's beginning and ending
//   balances on accounts 2300 and 2310; headcount at all 24 dates out of
//   CORE-04.
//
// Two rules this file does not re-litigate.
//
//   Headcount is forced, not chosen (plan U6). CORE-04 carries no termination
//   date, so the series counts active roster rows with a start_date on or
//   before the period end, the 18 departed rows are excluded at every date,
//   and the result is monotonically non-decreasing. A module that wants
//   attrition has to say the pack does not carry it.
//
//   The AR figure days sales outstanding uses is the subledger (plan U17).
//   FIN-04's subledger total stands above FIN-05's control account 1100, and
//   computation_note states the difference rather than hiding it. A KPI called
//   single-method has to name its input or it ships a second fork inside the
//   metric it declared unambiguous.
//
// Planted features (spec FIN-31), each derivable by a rule over the data and
// never by a label:
//   P1 (V19). The one metric name the pack deliberately does not declare
//      appears in no emitted file. The pack supports two defensible methods and
//      declares neither, which is what makes the assumption something a
//      consumer has to show. The scope of that rule is the emitted datasets and
//      never the repository: specs/artifact-specs.yaml carries the word in
//      FIN-31's and FIN-34's own planted_features.
//   P2 (V20, V21). Every input both readings need is emitted and no reading
//      is: the deferred revenue that stands against total cash is here, the
//      net loss is FIN-05's, and the cash and its own month-over-month change
//      are FIN-32's.
import { toCsv } from "../csv.js";
import { CLOSE_PERIOD_END, monthEnds, TREND_MONTHS } from "../dates.js";
import { cents, toCents } from "../money.js";
import { createRng } from "../seed.js";
import { buildRoster } from "./core-04-people-roster.js";
import { buildArAging } from "./fin-04-ar-aging.js";
import { buildTrialBalance } from "./fin-05-gl-trial-balance.js";

export const id = "FIN-31";

export const OUTPUT_FILE = "kpi-source-data.csv";

export const COLUMNS = [
  "metric_id", "metric_name", "period_end", "value", "unit",
  "source_artifact", "source_reference", "computation_note",
];

export const BANK_BALANCE_COLUMNS = [
  "account_code", "account_name", "bank_canon_id", "bank_name", "account_number_masked",
  "period_end", "book_balance", "bank_balance", "reconciling_difference", "source_artifact",
];

/** The seven KPI inputs, in the order the file lists them. */
export const METRIC_IDS = [
  "ar_subledger_balance", "deferred_revenue_current", "deferred_revenue_noncurrent",
  "ar_customer_count", "new_arr", "churned_arr", "headcount",
];

/** The one cash account the pack ships a bank statement for (FIN-01). */
export const RECONCILED_CASH_ACCOUNT = "1010";

/** The word no emitted file may carry. */
export const ABSENT_BY_DESIGN = "runway";

/** The month the canon timeline closes with no carry-forward items. */
export const NO_CARRY_FORWARD_PERIOD_END = "2026-02-28";

/** The two FIN-05 accounts the deferred revenue inputs are read out of. */
export const DEFERRED_REVENUE_ACCOUNTS = Object.freeze({
  deferred_revenue_current: "2300",
  deferred_revenue_noncurrent: "2310",
});

/** FIN-05's receivable control account, which the subledger stands above. */
export const AR_CONTROL_ACCOUNT = "1100";

/**
 * The published name and unit of each input. `unit` is what tells a consumer
 * whether `value` is a 2dp money string or a whole count, since one column
 * carries both.
 */
export const METRICS = Object.freeze({
  ar_subledger_balance: { name: "Accounts receivable subledger balance", unit: "usd" },
  deferred_revenue_current: { name: "Deferred revenue - current", unit: "usd" },
  deferred_revenue_noncurrent: { name: "Deferred revenue - non-current", unit: "usd" },
  ar_customer_count: { name: "Customers with an open receivable", unit: "customers" },
  new_arr: { name: "New annual recurring revenue booked", unit: "usd" },
  churned_arr: { name: "Annual recurring revenue churned", unit: "usd" },
  headcount: { name: "Active headcount", unit: "employees" },
});

/** Guards against a CORE-04 reroll moving a 24-point series all at once. */
export const HEADCOUNT_ENDS = Object.freeze({ first: 413, last: 582 });

// ---------------------------------------------------------- the free series
// Twenty-two of the twenty-four month-ends on the balance inputs, and every
// month on the two recurring-revenue inputs, are free: no frozen file carries
// them. Each free month is its series' own pinned month compounded to its own
// index at a drift drawn once for the series, times a noise factor drawn per
// month. That is FIN-33's shape and it is deliberate: a month-over-month random
// walk compounds its own luck, so where the far end of a 24-month series lands
// stops being a property of the design and becomes a property of the seed.

/** Monthly drift, drawn once per series, and the noise around it, drawn per month. */
const TRENDS = Object.freeze({
  ar_subledger_balance: { growth: { min: 0.008, max: 0.020 }, noise: 0.032 },
  deferred_revenue_current: { growth: { min: 0.006, max: 0.016 }, noise: 0.014 },
  deferred_revenue_noncurrent: { growth: { min: 0.004, max: 0.018 }, noise: 0.030 },
  new_arr: { growth: { min: 0.014, max: 0.026 }, noise: 0.058 },
  churned_arr: { growth: { min: 0.012, max: 0.024 }, noise: 0.066 },
  ar_customer_count: { growth: { min: 0.018, max: 0.032 }, noise: 0.030 },
});

/**
 * The two recurring-revenue inputs open here. Neither is pinned by any frozen
 * file at any date, so the opening month is a design constant and the drift
 * decides the rest; the builder asserts the closing month lands in a band that
 * stands sensibly against the pack's own revenue scale rather than letting it
 * drift out of the story.
 */
const ARR_OPENING_CENTS = Object.freeze({ new_arr: 78000000, churned_arr: 33000000 });

/** Where the two recurring-revenue series have to land at 2026-03-31. */
const ARR_CLOSING_BAND_CENTS = Object.freeze({
  new_arr: { min: 100000000, max: 150000000 },
  churned_arr: { min: 42000000, max: 60000000 },
});

/** Where the customer count has to open, so the series is a trend and not a flat line. */
const CUSTOMER_OPENING_BAND = Object.freeze({ min: 8, max: 14 });

// ---------------------------------------------------------------- internals

/**
 * One series, oldest first, in whole units (cents for money, heads or customers
 * for a count). `pinned` is the months a frozen file fixes, by index, and they
 * come back untouched; `anchorIndex` is the pinned month the drift compounds
 * from. Every other month is that anchor at its own index, wobbled.
 */
function trendSeries({ count, pinned, anchorIndex, growth, noise, rng, floor }) {
  const anchor = pinned.get(anchorIndex);
  if (!Number.isInteger(anchor)) throw new Error(`${id}: the anchor month is not a whole number`);
  const drift = growth.min + rng.float() * (growth.max - growth.min);
  const values = [];
  for (let t = 0; t < count; t += 1) {
    if (pinned.has(t)) {
      values.push(pinned.get(t));
      continue;
    }
    const level = anchor * Math.pow(1 + drift, t - anchorIndex);
    const wobble = 1 + (rng.float() * 2 - 1) * noise;
    const value = Math.round(level * wobble);
    if (value < floor) throw new Error(`${id}: a free month lands at ${value}, below its floor of ${floor}`);
    values.push(value);
  }
  return values;
}

/**
 * The headcount rule, which CORE-04's own columns force: active rows that had
 * started by the period end. Never a draw, at any of the 24 dates.
 */
function headcountSeries(roster, periodEnds) {
  const active = roster.filter((r) => r.employment_status === "active");
  return periodEnds.map((periodEnd) => active.filter((r) => r.start_date <= periodEnd).length);
}

// -------------------------------------------------------------- FIN-31 rows

function buildKpiSeries({ periodEnds, trialBalance, arSummary, roster }) {
  const series = new Map();
  const closeIndex = periodEnds.length - 1;
  const februaryIndex = periodEnds.indexOf(NO_CARRY_FORWARD_PERIOD_END);
  if (periodEnds[closeIndex] !== CLOSE_PERIOD_END || februaryIndex !== closeIndex - 1) {
    throw new Error(`${id}: the 24-month window does not close on the March close over February`);
  }

  const build = (metric, pinned, anchorIndex, floor) => series.set(metric, trendSeries({
    count: periodEnds.length,
    pinned,
    anchorIndex,
    growth: TRENDS[metric].growth,
    noise: TRENDS[metric].noise,
    rng: createRng(id, `kpi:${metric}`),
    floor,
  }));

  // Receivables: FIN-04's own summary pins the close and nothing pins the rest.
  build("ar_subledger_balance", new Map([[closeIndex, toCents(arSummary.subledger_total)]]), closeIndex, 1);
  build("ar_customer_count", new Map([[closeIndex, arSummary.customer_count]]), closeIndex, 1);

  // Deferred revenue: FIN-05 pins both ends of the close, so the drift
  // compounds from February rather than from the close.
  for (const [metric, accountCode] of Object.entries(DEFERRED_REVENUE_ACCOUNTS)) {
    const balance = trialBalance.get(accountCode);
    if (!balance) throw new Error(`${id}: FIN-05 does not carry account ${accountCode}`);
    if (balance.normal_balance !== "credit" || balance.ending_credit !== balance.ending_balance) {
      throw new Error(`${id}: account ${accountCode} no longer closes on its own credit side`);
    }
    build(metric, new Map([
      [februaryIndex, toCents(balance.beginning_balance)],
      [closeIndex, toCents(balance.ending_balance)],
    ]), februaryIndex, 1);
  }

  // Recurring revenue: no frozen file carries either input at any date, so the
  // opening month is the anchor and it is a design constant.
  for (const metric of ["new_arr", "churned_arr"]) {
    build(metric, new Map([[0, ARR_OPENING_CENTS[metric]]]), 0, 1);
  }

  series.set("headcount", headcountSeries(roster, periodEnds));
  return series;
}

/** Which frozen artifact pins one input at one month end, if any does. */
function kpiSource(metricId, periodEnd) {
  if (metricId === "headcount") {
    return { artifact: "CORE-04", reference: "people-roster.csv employment_status and start_date" };
  }
  if (periodEnd === CLOSE_PERIOD_END && metricId === "ar_subledger_balance") {
    return { artifact: "FIN-04", reference: "ar-aging-summary.json subledger_total" };
  }
  if (periodEnd === CLOSE_PERIOD_END && metricId === "ar_customer_count") {
    return { artifact: "FIN-04", reference: "ar-aging-summary.json customer_count" };
  }
  const accountCode = DEFERRED_REVENUE_ACCOUNTS[metricId];
  if (accountCode && periodEnd === CLOSE_PERIOD_END) {
    return { artifact: "FIN-05", reference: `gl-trial-balance.csv account ${accountCode} ending_balance` };
  }
  if (accountCode && periodEnd === NO_CARRY_FORWARD_PERIOD_END) {
    return { artifact: "FIN-05", reference: `gl-trial-balance.csv account ${accountCode} beginning_balance` };
  }
  return { artifact: "", reference: "" };
}

/** The note every row carries, which is where a stated fork gets stated. */
function computationNote(metricId, periodEnd, { arGapCents }) {
  const unpinned = "No frozen file in the pack carries this input at this month end, "
    + "so the extract itself is the source of record.";
  const accountCode = DEFERRED_REVENUE_ACCOUNTS[metricId];
  switch (metricId) {
    case "ar_subledger_balance":
      return periodEnd === CLOSE_PERIOD_END
        ? "Days sales outstanding uses this subledger figure and not FIN-05's control account "
          + `${AR_CONTROL_ACCOUNT}, which ends the period ${cents(arGapCents)} lower on the subledger-only `
          + "invoice FIN-04 ships. A metric called single-method has to name its input."
        : `Open receivable from the subledger at the month end, the days sales outstanding input. ${unpinned}`;
    case "deferred_revenue_current":
    case "deferred_revenue_noncurrent":
      if (periodEnd === CLOSE_PERIOD_END) return `FIN-05 account ${accountCode} ending balance at the same date.`;
      if (periodEnd === NO_CARRY_FORWARD_PERIOD_END) {
        return `FIN-05 account ${accountCode} beginning balance, which is the balance at the February month end.`;
      }
      return "Contract liability at the month end. FIN-05 pins this input at the two ends of the March close only.";
    case "ar_customer_count":
      return periodEnd === CLOSE_PERIOD_END
        ? "FIN-04's distinct customer count at the same as-of date."
        : `Customers carrying an open receivable at the month end. ${unpinned}`;
    case "new_arr":
      return `Annual recurring revenue booked in the month. ${unpinned}`;
    case "churned_arr":
      return "Annual recurring revenue lost in the month, reported as a positive magnitude that subtracts "
        + `from opening recurring revenue. ${unpinned}`;
    case "headcount":
      return "Active CORE-04 roster rows with a start date on or before the period end. CORE-04 carries no "
        + "termination date, so the departed rows are excluded at every date and the series cannot fall; a "
        + "consumer that wants attrition has to say the pack does not carry it.";
    default:
      throw new Error(`${id}: no computation note for ${metricId}`);
  }
}

// ---------------------------------------------------------------- the plants

function assertKpiPlants({ periodEnds, series, arSummary, trialBalance, roster }) {
  for (const metricId of METRIC_IDS) {
    const values = series.get(metricId);
    if (!values || values.length !== periodEnds.length) {
      throw new Error(`${id}: ${metricId} carries ${values?.length ?? 0} months, expected ${periodEnds.length}`);
    }
    if (values.some((v) => !Number.isInteger(v) || v <= 0)) {
      throw new Error(`${id}: ${metricId} carries a value that is not a positive whole number`);
    }
    if (!values.some((v, i) => i > 0 && v !== values[i - 1])) {
      throw new Error(`${id}: ${metricId} does not move month to month, so it is not a trend`);
    }
  }

  // The values frozen bytes pin, recomputed here rather than trusted from the
  // walk that placed them.
  const close = periodEnds.length - 1;
  const february = close - 1;
  if (series.get("ar_subledger_balance")[close] !== toCents(arSummary.subledger_total)) {
    throw new Error(`${id}: the receivable series does not close at FIN-04's subledger total`);
  }
  if (series.get("ar_customer_count")[close] !== arSummary.customer_count) {
    throw new Error(`${id}: the customer count does not close at FIN-04's customer count`);
  }
  for (const [metricId, accountCode] of Object.entries(DEFERRED_REVENUE_ACCOUNTS)) {
    const balance = trialBalance.get(accountCode);
    if (series.get(metricId)[close] !== toCents(balance.ending_balance)) {
      throw new Error(`${id}: ${metricId} does not close at FIN-05 account ${accountCode}`);
    }
    if (series.get(metricId)[february] !== toCents(balance.beginning_balance)) {
      throw new Error(`${id}: ${metricId} does not open the close month at FIN-05 account ${accountCode}`);
    }
  }

  // The headcount rule at all 24 dates, and both ends of the series it forces.
  const headcount = series.get("headcount");
  const rebuilt = headcountSeries(roster, periodEnds);
  if (headcount.some((v, i) => v !== rebuilt[i])) {
    throw new Error(`${id}: the headcount series is not CORE-04's own rule applied at every date`);
  }
  if (headcount.some((v, i) => i > 0 && v < headcount[i - 1])) {
    throw new Error(`${id}: the headcount series falls, which the rule cannot produce`);
  }
  if (headcount[0] !== HEADCOUNT_ENDS.first || headcount[close] !== HEADCOUNT_ENDS.last) {
    throw new Error(
      `${id}: the headcount series runs ${headcount[0]} to ${headcount[close]}, `
      + `expected ${HEADCOUNT_ENDS.first} to ${HEADCOUNT_ENDS.last}`
    );
  }

  // The two recurring-revenue inputs: net new every month, and a close that
  // stands sensibly against the pack's own revenue scale.
  const newArr = series.get("new_arr");
  const churnedArr = series.get("churned_arr");
  for (let t = 0; t < periodEnds.length; t += 1) {
    if (churnedArr[t] >= newArr[t]) {
      throw new Error(`${id}: ${periodEnds[t]} churns at or above what it books, which the series does not tell`);
    }
  }
  for (const metric of ["new_arr", "churned_arr"]) {
    const band = ARR_CLOSING_BAND_CENTS[metric];
    const closing = series.get(metric)[close];
    if (closing < band.min || closing > band.max) {
      throw new Error(
        `${id}: ${metric} closes at ${cents(closing)}, outside its `
        + `${cents(band.min)} to ${cents(band.max)} band`
      );
    }
  }

  // The customer count opens as a trend rather than as a flat line.
  const customers = series.get("ar_customer_count");
  if (customers[0] < CUSTOMER_OPENING_BAND.min || customers[0] > CUSTOMER_OPENING_BAND.max) {
    throw new Error(`${id}: the customer count opens at ${customers[0]}, outside its stated band`);
  }
}

// ------------------------------------------------------------------ builder

/**
 * Build the KPI input set. Pure: no I/O, no Date.now(), every draw from
 * createRng("FIN-31", stream).
 * @returns {{ kpiRows: object[], periodEnds: string[] }}
 */
export function buildKpiSources() {
  const periodEnds = monthEnds(TREND_MONTHS, CLOSE_PERIOD_END);
  const trialBalance = new Map(buildTrialBalance().rows.map((r) => [r.account_code, r]));
  const { summary: arSummary } = buildArAging();
  const roster = buildRoster(createRng("CORE-04", "roster"));

  const arGapCents = toCents(arSummary.subledger_total)
    - toCents(trialBalance.get(AR_CONTROL_ACCOUNT).ending_balance);
  if (arGapCents <= 0) {
    throw new Error(`${id}: the subledger no longer stands above FIN-05's control account ${AR_CONTROL_ACCOUNT}`);
  }

  const series = buildKpiSeries({ periodEnds, trialBalance, arSummary, roster });
  assertKpiPlants({ periodEnds, series, arSummary, trialBalance, roster });

  const kpiRows = [];
  for (const metricId of METRIC_IDS) {
    const meta = METRICS[metricId];
    const values = series.get(metricId);
    periodEnds.forEach((periodEnd, t) => {
      const source = kpiSource(metricId, periodEnd);
      kpiRows.push({
        metric_id: metricId,
        metric_name: meta.name,
        period_end: periodEnd,
        value: meta.unit === "usd" ? cents(values[t]) : String(values[t]),
        unit: meta.unit,
        source_artifact: source.artifact,
        source_reference: source.reference,
        computation_note: computationNote(metricId, periodEnd, { arGapCents }),
      });
    });
  }
  if (kpiRows.length !== METRIC_IDS.length * periodEnds.length) {
    throw new Error(`${id}: ${kpiRows.length} KPI rows, expected ${METRIC_IDS.length * periodEnds.length}`);
  }
  return { kpiRows, periodEnds };
}

/** V19: the method the pack supports two readings of is named in no emitted file. */
export function assertAbsentByDesign(files) {
  const pattern = new RegExp(ABSENT_BY_DESIGN, "i");
  for (const file of files) {
    if (pattern.test(file.content)) {
      throw new Error(
        `${id}: ${file.path} names the metric the pack deliberately does not declare. `
        + "Two defensible methods and no artifact declaring which is the plant."
      );
    }
  }
  return files;
}

// ---------------------------------------------------------------- generate

export function generate() {
  const { kpiRows } = buildKpiSources();
  return assertAbsentByDesign([{ path: OUTPUT_FILE, content: toCsv(COLUMNS, kpiRows) }]);
}

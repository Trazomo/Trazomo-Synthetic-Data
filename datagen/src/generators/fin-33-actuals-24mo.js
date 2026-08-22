// FIN-33 actuals-24mo and FIN-34 drivers: the 24-month profit-and-loss trend
// module 30 forecasts from, and the driver set it forecasts with. One builder
// emits both (the FIN-15 over FIN-16 pattern), so the driver set and the trend
// it applies to can never disagree about which line_ids exist.
//
// FIN-33 is on the critical path: FIN-24 reads its 2026-02 column as the prior
// period, FIN-25's account set is not knowable without its flux plant, and
// FIN-28's every figure ties to it.
//
// Nothing here invents a profit-and-loss line. The 27-row spine is imported
// from buildBudgetVsActualTemplate() row for row, and the last three months are
// read out of the frozen FIN-05 trial balance:
//
//   1. every 2026-03 actual is FIN-05's period movement for that account under
//      rule R-SIGN convention 1 (actualAmountCents in finance-statement.js), so
//      it equals FIN-24's actual_amount for the same line_id to the cent;
//   2. per account, 2026-01 plus 2026-02 is FIN-05's beginning_balance, because
//      the fiscal year is the calendar year (canon/timeline.md), so a
//      profit-and-loss beginning balance at 2026-03-01 is exactly January plus
//      February; and all three months together are FIN-05's ending_balance in
//      the account's own normal-balance direction.
//
// Both constraints hold for all 27 accounts simultaneously, both are asserted
// before the builder returns (the FIN-38 "the builder refuses to emit"
// precedent), and a reroll of the free 21 months touches neither: the split
// between January and February moves, their sum does not.
//
// Planted features (spec FIN-33), each derivable by a rule over the data and
// never by a label:
//   P1. exactly 3 lines breach the FIN-26 flux rule against February, and
//       exactly 1 of those also breaches the budget rule. The two rules
//       therefore disagree on 5 lines, which is what module 23 exists to teach.
//   P2. the two flux-only accounts carry no FIN-09 line. That is what holds
//       FIN-25's timing plant at one instance and its qualifier-free count at
//       two, and it is asserted here against FIN-09's own builder rather than
//       left as a comment.
//   P3. exactly one line carries a peak that repeats at 12-month spacing, so a
//       trailing-three-month run rate over-forecasts it. All 27 lines move
//       month to month, which is why the repeat is the qualifier that selects
//       and the movement is not.
//
// Every breach in this file is constructed. The builder proves that by
// asserting first that no line breaches the flux rule when February is simply
// half the January-plus-February total: the plant is a choice of February, not
// an accident of FIN-05.
import { toCsv } from "../csv.js";
import { CLOSE_PERIOD_END, monthEnds, TREND_MONTHS } from "../dates.js";
import { cents, toCents } from "../money.js";
import { createRng } from "../seed.js";
import { actualAmountCents } from "./finance-statement.js";
import { buildBudgetVsActualTemplate } from "./fin-37-budget-vs-actual-template.js";
import { buildTrialBalance } from "./fin-05-gl-trial-balance.js";
import { buildCloseBatch } from "./fin-09-je-batch.js";
import { buildRoster } from "./core-04-people-roster.js";

export const id = "FIN-33";

export const OUTPUT_FILE = "actuals-24mo.csv";

export const COLUMNS = [
  "line_id", "account_code", "account_name", "statement_section", "normal_balance",
  "period", "actual_amount", "currency",
];

export const CURRENCY = "USD";

export const DRIVERS_FILE = "drivers.yaml";

/** The five drivers FIN-34 carries, in the order the config lists them. */
export const DRIVER_IDS = ["hiring", "price_change", "churn", "collection_delay", "contract_win_loss"];

/** Scenario names, in the order the config lists them. */
export const SCENARIOS = ["base", "upside", "downside"];

/** Months the forecast runs beyond the base period. */
export const HORIZON_MONTHS = 18;

/**
 * The accounts the derived cost per head blends (plan U7). CORE-04 carries no
 * salary, so a fully loaded monthly cost per head is these four March balances
 * over the active headcount. 5020 is a cost-of-revenue account, and the YAML's
 * `derivation` key has to say so: blending it into people cost is a judgment,
 * not an accounting identity.
 */
export const COST_PER_HEAD_ACCOUNTS = ["6000", "6010", "6020", "5020"];

/**
 * The FIN-31 metric ids a FIN-34 driver may apply to. FIN-31 is built after
 * FIN-33 in the DAG, so its bytes do not exist when this runs; the test checks
 * every id below against the FIN-31 spec entry, so a renamed metric fails here
 * rather than shipping a driver that applies to nothing.
 */
export const FIN_31_METRIC_IDS = [
  "ar_subledger_balance", "deferred_revenue_current", "deferred_revenue_noncurrent",
  "ar_customer_count", "new_arr", "churned_arr", "headcount",
];

// ------------------------------------------------------------- the flux rule
// FIN-26 publishes this rule as policy and FIN-24 reports against it, but
// FIN-33 has to construct the plant that makes it interesting, and FIN-33 is
// built first. The rule therefore lives here, once, and FIN-26 imports it
// rather than retyping the three numbers. Same shape as FIN-37's budget
// threshold: a percentage, floored, rounded up to the nearest thousand.

/** Plan U8. 10 percent of the prior period, floored at 10,000, rounded up to 1,000. */
export const FLUX_RULE = Object.freeze({
  pct_of_prior_period: 0.1,
  floor_usd: 10000,
  rounding_to_usd: 1000,
});

/**
 * The flux threshold for one line, in integer cents, from its prior-period
 * actual in integer cents.
 * @param {number} priorPeriodCents
 * @returns {number}
 */
export function fluxThresholdCents(priorPeriodCents) {
  if (!Number.isInteger(priorPeriodCents)) {
    throw new Error(`${id}: fluxThresholdCents expects integer cents, got ${JSON.stringify(priorPeriodCents)}`);
  }
  const roundingUnit = FLUX_RULE.rounding_to_usd * 100;
  const pct = Math.abs(priorPeriodCents) * FLUX_RULE.pct_of_prior_period;
  return Math.max(FLUX_RULE.floor_usd * 100, Math.ceil(pct / roundingUnit) * roundingUnit);
}

// --------------------------------------------------------------- the plants

/**
 * The line that breaches both rules. 6200 Software Subscriptions is the pack's
 * true overspend: unfavorable against its own budget by 47,043.50 and up again
 * on February, so a reader who runs either rule alone still finds it.
 */
export const FLUX_AND_BUDGET_ACCOUNT = "6200";

/**
 * The two lines that breach the flux rule and no other. Neither carries a
 * FIN-09 line, which is what holds FIN-25's timing plant at one instance
 * (asserted below against FIN-09's own builder).
 *
 * 6000 Salaries and Wages is the teaching case: it carries the largest absolute
 * budget variance on the tracker and is still immaterial, because its threshold
 * scales with its budget. 6300 Marketing Programs moves the other way, so the
 * flux set is not three lines that all rose.
 */
export const FLUX_ONLY_ACCOUNTS = Object.freeze({ "6000": -1, "6300": 1 });

/** Events and Conferences: the annual user conference is the repeating peak. */
export const SEASONAL_ACCOUNT = "6310";

/** The month the seasonal peak lands in, so the repeat is exactly 12 apart. */
export const SEASONAL_PEAK_MONTH = "09";

/** How far above trend the peak sits. */
export const SEASONAL_PEAK_MULTIPLIER = 2.2;

/**
 * A month is a peak when it sits at or above this multiple of the mean of its
 * two neighbours. Well clear of the largest ratio the January and February
 * construction produces, which the builder asserts.
 */
export const PEAK_RATIO = 1.5;

/** How much clear of its own threshold a constructed flux breach has to sit. */
const FLUX_PLANT_MARGIN = 1.03;

/** How far an ordinary line's February may sit from the January-February mean. */
const ORDINARY_FEBRUARY_SWING = 0.025;

/** Monthly growth band for the free months, drawn per line. */
const GROWTH_BAND = { min: 0.003, max: 0.018 };

/** Month-to-month noise on the free months, drawn per line per month. */
const MONTH_NOISE = 0.035;

/**
 * The January and February mean sits at this position on the month index, so a
 * free month's trend level is the mean discounted back from it.
 */
const ANCHOR_INDEX = 21.5;

// ---------------------------------------------------------------- internals

function marchMovementCents(trialBalanceRow, line) {
  return actualAmountCents(trialBalanceRow, line.normal_balance);
}

/**
 * February for a planted line: walk away from the January-February mean, in the
 * direction the plant needs, until the flux clears its own threshold with
 * margin. Monotone in both terms, so the walk terminates; the step is seeded so
 * the landing figure is not a round number a reader could spot as a plant.
 */
function solvePlantFebruary(marchCents, anchorCents, direction, rngLine) {
  const step = Math.max(100, Math.round(anchorCents * (0.002 + rngLine.float() * 0.002)));
  let february = Math.round(anchorCents * (1 + direction * (0.001 + rngLine.float() * 0.003)));
  for (let walked = 0; walked < 500; walked += 1) {
    const flux = marchCents - february;
    if (Math.abs(flux) >= Math.round(fluxThresholdCents(february) * FLUX_PLANT_MARGIN)) return february;
    february += direction * step;
  }
  throw new Error(`${id}: could not place a February that breaches the flux rule from ${cents(Math.round(anchorCents))}`);
}

/**
 * February for an ordinary line: a seeded swing off the January-February mean,
 * pulled back toward the mean if it happens to breach. No line breaches at the
 * mean itself (asserted in assertPlants), so the pull-back terminates.
 */
function solveOrdinaryFebruary(marchCents, anchorCents, rngLine) {
  let february = Math.round(anchorCents * (1 + (rngLine.float() * 2 - 1) * ORDINARY_FEBRUARY_SWING));
  for (let pulled = 0; pulled < 60; pulled += 1) {
    if (Math.abs(marchCents - february) < fluxThresholdCents(february)) return february;
    february = Math.round(february + (anchorCents - february) * 0.25);
  }
  throw new Error(`${id}: could not place a February that stays inside the flux rule from ${cents(Math.round(anchorCents))}`);
}

/** The 24 monthly amounts for one line, oldest first, in integer cents. */
function buildLineSeries(line, trialBalanceRow, periods) {
  const rngLine = createRng(id, `trend:${line.line_id}`);
  const marchCents = marchMovementCents(trialBalanceRow, line);
  const janFebCents = toCents(trialBalanceRow.beginning_balance);
  const anchorCents = janFebCents / 2;
  if (!(anchorCents > 0)) {
    throw new Error(`${id}: ${line.line_id} has no prior-quarter activity to build a trend from`);
  }

  const growth = GROWTH_BAND.min + rngLine.float() * (GROWTH_BAND.max - GROWTH_BAND.min);
  const seasonal = line.account_code === SEASONAL_ACCOUNT;

  const values = [];
  for (let t = 0; t < periods.length - 3; t += 1) {
    const trend = anchorCents * Math.pow(1 + growth, t - ANCHOR_INDEX);
    const noise = 1 + (rngLine.float() * 2 - 1) * MONTH_NOISE;
    const peak = seasonal && periods[t].endsWith(`-${SEASONAL_PEAK_MONTH}`) ? SEASONAL_PEAK_MULTIPLIER : 1;
    const value = Math.round(trend * noise * peak);
    if (value <= 0) throw new Error(`${id}: ${line.line_id} ${periods[t]} came out at ${value} cents`);
    values.push(value);
  }

  const direction = line.account_code === FLUX_AND_BUDGET_ACCOUNT
    ? -1
    : FLUX_ONLY_ACCOUNTS[line.account_code];
  const february = direction === undefined
    ? solveOrdinaryFebruary(marchCents, anchorCents, rngLine)
    : solvePlantFebruary(marchCents, anchorCents, direction, rngLine);
  const january = janFebCents - february;
  if (january <= 0 || january < anchorCents * 0.25 || january > anchorCents * 2) {
    throw new Error(`${id}: ${line.line_id} January lands at ${cents(january)} against a mean of ${cents(Math.round(anchorCents))}`);
  }
  values.push(january, february, marchCents);
  if (values.length !== periods.length) {
    throw new Error(`${id}: ${line.line_id} produced ${values.length} months, expected ${periods.length}`);
  }
  return values;
}

/** The interior months of a series that sit at or above PEAK_RATIO of their neighbours. */
function peakIndexes(values) {
  const peaks = [];
  for (let t = 1; t < values.length - 1; t += 1) {
    const neighbours = (values[t - 1] + values[t + 1]) / 2;
    if (neighbours > 0 && values[t] / neighbours >= PEAK_RATIO) peaks.push(t);
  }
  return peaks;
}

/** True when some pair of peaks sits exactly 12 months apart. */
function hasRepeatingAnnualPeak(values) {
  const peaks = peakIndexes(values);
  return peaks.some((a) => peaks.includes(a + 12));
}

// ----------------------------------------------------------------- the plants

function assertPlants({ lines, trialBalance, periods, seriesByLine, rows }) {
  if (rows.length !== lines.length * periods.length) {
    throw new Error(`${id}: ${rows.length} rows, expected ${lines.length * periods.length}`);
  }

  const budgetMaterial = new Set();
  const fluxBreaches = new Set();
  for (const line of lines) {
    const balance = trialBalance.get(line.account_code);
    const values = seriesByLine.get(line.line_id);
    const [january, february, march] = values.slice(-3);

    // Reconciliation rule 1, and the FIN-24 leg of it: the same movement under
    // the same convention.
    if (march !== marchMovementCents(balance, line)) {
      throw new Error(`${id}: ${line.line_id} March does not equal FIN-05's period movement`);
    }
    // Reconciliation rule 2, and its ending-balance twin. Both are asserted, so
    // a regression in one fails in one place rather than being inferred.
    if (january + february !== toCents(balance.beginning_balance)) {
      throw new Error(`${id}: ${line.line_id} January plus February is not FIN-05's beginning balance`);
    }
    if (january + february + march !== toCents(balance.ending_balance)) {
      throw new Error(`${id}: ${line.line_id} the quarter does not close at FIN-05's ending balance`);
    }

    // Every breach in this file is constructed: none is there at the mean.
    const mean = Math.round(toCents(balance.beginning_balance) / 2);
    if (Math.abs(march - mean) >= fluxThresholdCents(mean)) {
      throw new Error(`${id}: ${line.line_id} breaches the flux rule at the January-February mean, so its plant is not a construction`);
    }

    if (Math.abs(march - february) >= fluxThresholdCents(february)) fluxBreaches.add(line.account_code);
    if (Math.abs(march - toCents(line.budget_amount)) >= toCents(line.explanation_threshold_usd)) {
      budgetMaterial.add(line.account_code);
    }

    const peaks = peakIndexes(values);
    if (line.account_code !== SEASONAL_ACCOUNT && peaks.length > 0) {
      throw new Error(`${id}: ${line.line_id} carries an unplanted peak at ${periods[peaks[0]]}`);
    }
    if (!values.some((v, i) => i > 0 && v !== values[i - 1])) {
      throw new Error(`${id}: ${line.line_id} does not move month to month`);
    }
  }

  // P1: three flux breaches, one of which is also budget material.
  const expectedFlux = new Set([FLUX_AND_BUDGET_ACCOUNT, ...Object.keys(FLUX_ONLY_ACCOUNTS)]);
  if (fluxBreaches.size !== expectedFlux.size || [...expectedFlux].some((a) => !fluxBreaches.has(a))) {
    throw new Error(`${id}: flux breaches are ${[...fluxBreaches].join(", ")}, expected ${[...expectedFlux].join(", ")}`);
  }
  const both = [...fluxBreaches].filter((a) => budgetMaterial.has(a));
  if (both.length !== 1 || both[0] !== FLUX_AND_BUDGET_ACCOUNT) {
    throw new Error(`${id}: ${both.length} lines breach both rules, expected 1 (${FLUX_AND_BUDGET_ACCOUNT})`);
  }
  if (budgetMaterial.size !== 4) {
    throw new Error(`${id}: ${budgetMaterial.size} budget-material lines, expected the 4 FIN-37 and FIN-05 already produce`);
  }

  // P2: the two flux-only accounts carry no FIN-09 line, checked against
  // FIN-09's own builder rather than against a list written down here.
  const batchAccounts = new Set(buildCloseBatch().lines.map((l) => l.gl_account));
  for (const account of Object.keys(FLUX_ONLY_ACCOUNTS)) {
    if (batchAccounts.has(account)) {
      throw new Error(`${id}: flux-only account ${account} carries a FIN-09 line, which moves FIN-25's timing plant`);
    }
  }

  // P3: one repeating annual peak, and only one.
  const seasonal = lines.filter((line) => hasRepeatingAnnualPeak(seriesByLine.get(line.line_id)));
  if (seasonal.length !== 1 || seasonal[0].account_code !== SEASONAL_ACCOUNT) {
    throw new Error(`${id}: ${seasonal.length} lines carry a repeating annual peak, expected 1 (${SEASONAL_ACCOUNT})`);
  }
}

// ------------------------------------------------------------------ drivers

/** Fully loaded monthly cost per head, in integer cents, and its inputs. */
function costPerHead(trialBalance, lines) {
  const byAccount = new Map(lines.map((line) => [line.account_code, line]));
  let totalCents = 0;
  for (const account of COST_PER_HEAD_ACCOUNTS) {
    const line = byAccount.get(account);
    if (!line) throw new Error(`${id}: account ${account} is not a FIN-37 profit-and-loss line`);
    totalCents += marchMovementCents(trialBalance.get(account), line);
  }
  // The FIN-31 headcount rule, which is forced rather than chosen: CORE-04
  // carries no termination date, so an active row that had started by the
  // period end is the only countable head.
  const headcount = buildRoster(createRng("CORE-04", "roster")).filter(
    (r) => r.employment_status === "active" && r.start_date <= CLOSE_PERIOD_END
  ).length;
  if (headcount <= 0) throw new Error(`${id}: CORE-04 carries no active heads at ${CLOSE_PERIOD_END}`);
  return { totalCents, headcount, perHeadCents: Math.round(totalCents / headcount) };
}

function buildDrivers(trialBalance, lines) {
  const lineIds = new Set(lines.map((l) => l.line_id));
  const idFor = (accountCode) => {
    const line = lines.find((l) => l.account_code === accountCode);
    if (!line) throw new Error(`${id}: account ${accountCode} is not on the FIN-37 spine`);
    return line.line_id;
  };
  const perHead = costPerHead(trialBalance, lines);

  const drivers = [
    {
      driver_id: "hiring",
      applies_to: COST_PER_HEAD_ACCOUNTS.map(idFor).sort(),
      unit: "net hires per month",
      base: 8,
      upside: 14,
      downside: -3,
      derivation: {
        metric: "fully_loaded_monthly_cost_per_head",
        value_usd: cents(perHead.perHeadCents),
        formula: "the March 2026 movement on accounts "
          + `${COST_PER_HEAD_ACCOUNTS.join(", ")} divided by the active headcount, rounded to the cent`,
        source_artifacts: ["FIN-05", "CORE-04"],
        source_accounts: [...COST_PER_HEAD_ACCOUNTS],
        source_period: "2026-03",
        headcount: perHead.headcount,
        judgment: "5020 Customer Support Salaries is a cost-of-revenue account, so this blends "
          + "cost of revenue into people cost. That is a judgment and not an accounting identity: "
          + "a plan that wants operating-expense people cost alone drops 5020 and recomputes.",
      },
    },
    {
      driver_id: "price_change",
      applies_to: ["4000", "4010", "4020"].map(idFor),
      unit: "percent change to list price at renewal",
      base: 3,
      upside: 6,
      downside: 1,
    },
    {
      driver_id: "churn",
      applies_to: ["4000", "4010", "4020"].map(idFor),
      unit: "percent of opening recurring revenue lost per month",
      base: 1.1,
      upside: 0.7,
      downside: 1.9,
    },
    {
      driver_id: "collection_delay",
      applies_to: ["ar_subledger_balance"],
      unit: "days added to days sales outstanding",
      base: 3,
      upside: 1,
      downside: 8,
    },
    {
      driver_id: "contract_win_loss",
      applies_to: [idFor("4000"), idFor("4100"), "new_arr"],
      unit: "net new logos per month",
      base: 4,
      upside: 7,
      downside: 1,
    },
  ];

  assertDrivers(drivers, lineIds);
  return {
    base_period: "2026-03",
    horizon_months: HORIZON_MONTHS,
    source_artifacts: ["FIN-33", "FIN-31", "FIN-32"],
    scenarios: [...SCENARIOS],
    drivers,
  };
}

function assertDrivers(drivers, lineIds) {
  const seen = drivers.map((d) => d.driver_id);
  if (seen.length !== DRIVER_IDS.length || DRIVER_IDS.some((d, i) => seen[i] !== d)) {
    throw new Error(`${id}: FIN-34 carries ${seen.join(", ")}, expected ${DRIVER_IDS.join(", ")}`);
  }
  const metrics = new Set(FIN_31_METRIC_IDS);
  for (const driver of drivers) {
    if (driver.applies_to.length === 0) throw new Error(`${id}: driver ${driver.driver_id} applies to nothing`);
    for (const target of driver.applies_to) {
      if (!lineIds.has(target) && !metrics.has(target)) {
        throw new Error(`${id}: driver ${driver.driver_id} applies to "${target}", which is neither a FIN-33 line_id nor a FIN-31 metric_id`);
      }
    }
    for (const scenario of SCENARIOS) {
      if (typeof driver[scenario] !== "number") {
        throw new Error(`${id}: driver ${driver.driver_id} carries no ${scenario} value`);
      }
    }
    if (driver.base === driver.upside && driver.base === driver.downside) {
      throw new Error(`${id}: driver ${driver.driver_id} carries no band, so the scenario set has nothing to move`);
    }
  }

  // V23: exactly one band crosses zero. All five carry a band, so the band is
  // not the qualifier that selects.
  const crossesZero = drivers.filter((d) => Math.sign(d.upside) * Math.sign(d.downside) < 0);
  if (crossesZero.length !== 1 || crossesZero[0].driver_id !== "hiring") {
    throw new Error(`${id}: ${crossesZero.length} driver bands cross zero, expected 1 (hiring)`);
  }
  if (drivers.some((d) => d.upside === 0 || d.downside === 0)) {
    throw new Error(`${id}: a scenario value of zero has no sign, so the band-crossing rule stops being decidable`);
  }

  // V24: exactly one driver moves cash without moving margin. Two drivers name
  // a FIN-31 metric at all, which is the count a reader gets who reads contract
  // win and loss as cash only.
  const namesMetric = drivers.filter((d) => d.applies_to.some((t) => metrics.has(t)));
  const cashOnly = namesMetric.filter((d) => !d.applies_to.some((t) => lineIds.has(t)));
  if (cashOnly.length !== 1 || cashOnly[0].driver_id !== "collection_delay") {
    throw new Error(`${id}: ${cashOnly.length} drivers move cash without moving margin, expected 1 (collection_delay)`);
  }
  if (namesMetric.length !== 2) {
    throw new Error(`${id}: ${namesMetric.length} drivers name a FIN-31 metric, expected 2`);
  }
}

// ------------------------------------------------------------ yaml rendering

function yamlList(values) {
  return `[${values.map((v) => (typeof v === "number" ? String(v) : `"${v}"`)).join(", ")}]`;
}

/** FIN-34's bytes. Hand rendered, the FIN-14 precedent, so the comments survive. */
export function renderDriversYaml(config) {
  const lines = [
    "# FIN-34 drivers: the scenario input set for the driver-based plan.",
    "#",
    "# Inputs only. Base, upside and downside cash, margin and the months of",
    "# cover they imply are the consuming module's deterministic engine, which",
    "# is what \"math never done by the model\" means: this file carries no",
    "# computed output for a model to copy.",
    "#",
    "# Every applies_to resolves in a shipped file: a FIN-33 line_id or a FIN-31",
    "# metric_id. Generated, not hand maintained:",
    "# datagen/src/generators/fin-33-actuals-24mo.js.",
    `base_period: "${config.base_period}"`,
    `horizon_months: ${config.horizon_months}`,
    `source_artifacts: ${yamlList(config.source_artifacts)}`,
    `scenarios: ${yamlList(config.scenarios)}`,
    "",
    "# Five drivers. Each carries a band, so a scenario table that shows only",
    "# magnitudes loses the direction on the one band that changes sign.",
    "drivers:",
  ];
  for (const driver of config.drivers) {
    lines.push(`  - driver_id: ${driver.driver_id}`);
    lines.push(`    applies_to: ${yamlList(driver.applies_to)}`);
    lines.push(`    unit: "${driver.unit}"`);
    for (const scenario of SCENARIOS) lines.push(`    ${scenario}: ${driver[scenario]}`);
    if (driver.derivation) {
      const d = driver.derivation;
      lines.push("    # CORE-04 carries no salary, so cost per head is derived rather than read.");
      lines.push("    derivation:");
      lines.push(`      metric: ${d.metric}`);
      lines.push(`      value_usd: "${d.value_usd}"`);
      lines.push(`      formula: "${d.formula}"`);
      lines.push(`      source_artifacts: ${yamlList(d.source_artifacts)}`);
      lines.push(`      source_accounts: ${yamlList(d.source_accounts)}`);
      lines.push(`      source_period: "${d.source_period}"`);
      lines.push(`      headcount: ${d.headcount}`);
      lines.push(`      judgment: "${d.judgment}"`);
    }
  }
  return lines.join("\n") + "\n";
}

// ------------------------------------------------------------------ builder

/**
 * Build the trend and the driver set together. Pure: no I/O, no Date.now(),
 * every draw from createRng("FIN-33", stream).
 * @returns {{ rows: object[], lines: object[], periods: string[], drivers: object }}
 */
export function buildActuals24mo() {
  const lines = buildBudgetVsActualTemplate((stream) => createRng("FIN-37", stream));
  const trialBalance = new Map(buildTrialBalance().rows.map((r) => [r.account_code, r]));
  const periods = monthEnds(TREND_MONTHS, CLOSE_PERIOD_END).map((d) => d.slice(0, 7));

  const seriesByLine = new Map();
  const rows = [];
  for (const line of lines) {
    const balance = trialBalance.get(line.account_code);
    if (!balance) throw new Error(`${id}: ${line.line_id} names account ${line.account_code}, which FIN-05 does not carry`);
    const values = buildLineSeries(line, balance, periods);
    seriesByLine.set(line.line_id, values);
    periods.forEach((period, t) => {
      rows.push({
        line_id: line.line_id,
        account_code: line.account_code,
        account_name: line.account_name,
        statement_section: line.statement_section,
        normal_balance: line.normal_balance,
        period,
        actual_amount: cents(values[t]),
        currency: CURRENCY,
      });
    });
  }

  assertPlants({ lines, trialBalance, periods, seriesByLine, rows });
  const drivers = buildDrivers(trialBalance, lines);
  return { rows, lines, periods, drivers };
}

// ---------------------------------------------------------------- generate

export function generate() {
  const { rows } = buildActuals24mo();
  return [{ path: OUTPUT_FILE, content: toCsv(COLUMNS, rows) }];
}

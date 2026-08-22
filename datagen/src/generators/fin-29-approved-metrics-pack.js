// FIN-29 approved-metrics-pack: the approved figure set a board narrative may
// cite, so nothing downstream ever computes a number.
//
// Twelve metrics exactly, every one recomputed from frozen bytes at build time,
// and every metric's `basis` string naming the sign convention its own value
// uses. That last part is not decoration: the test is authored from the basis
// string, and a one-line source description is what let FIN-24 and FIN-29
// diverge by 90791.02 in the plan's first draft. A subtotal applies
// section_sign (rule R-SIGN, generators/finance-statement.js); a balance does
// not. Nothing here is a draw, so this module takes no rng at all.
//
// Two headline figures are already published in rounded form by the frozen
// FIN-40 excerpt, and agreeing with them is the artifact's whole point. That
// agreement is also the disclosure rule: a metric is board_reported when its
// own value, rounded the way FIN-40 states it rounds (to the nearest hundred
// thousand, read in millions to one decimal), is a figure the excerpt already
// carries. Two metrics clear that; the other ten are board_supporting. The
// classification banner is read out of the excerpt rather than retyped.
//
// The approval block states a tension rather than hiding it (plan U11): the
// close task that produces the pre-close trial balance is in_progress at the
// as-of, so source_close_task_status_at_as_of carries that word, read off the
// shipped checklist rather than typed, and source_artifact names FIN-05, which
// no checklist status can contradict.
//
// V19. The pack supports two readings of one popular FP&A metric and declares
// neither, so no emitted file may name it. The word lives in one place
// (fin-31-kpi-source-data.js) and this file checks its own bytes against it.
//
// Rule R-CLS17: FIN-29 names CLS-16 and its status as file facts and asserts
// nothing about whether any close task's work was performed. CLS-17 is FIN-24's
// task and appears nowhere in this pack.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cents, toCents } from "../money.js";
import { buildArAging } from "./fin-04-ar-aging.js";
import { buildTrialBalance } from "./fin-05-gl-trial-balance.js";
import { buildActualsVsBudget } from "./fin-24-actuals-vs-budget.js";
import { buildCloseChecklist } from "./fin-17-close-checklist.js";
import { buildCloseBatch } from "./fin-09-je-batch.js";
import { ABSENT_BY_DESIGN } from "./fin-31-kpi-source-data.js";
import { sectionSign } from "./finance-statement.js";

export const id = "FIN-29";

export const OUTPUT_FILE = "approved-metrics-pack.json";

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..");

/** The frozen board excerpt the two headline figures have to agree with. */
const FIN_40_EXCERPT = join(REPO_ROOT, "artifacts", "FIN-40", "mnpi-flagged-draft.md");

/** The twelve metric ids, in the order the pack lists them. */
export const METRIC_IDS = [
  "revenue_net_q1", "net_loss_q1", "revenue_net_march", "cost_of_revenue_march",
  "operating_expense_march", "net_loss_march", "gross_margin_pct_march",
  "cash_total_2026_03_31", "net_cash_change_march", "ar_subledger_total",
  "ar_over_90_days", "deferred_revenue_total",
];

export const APPROVAL = Object.freeze({
  approved_by_role: "Controller",
  reviewed_by_role: "VP, Finance",
  approved_date: "2026-04-06",
  source_close_task: "CLS-16",
  source_artifact: "FIN-05",
});

/** The FIN-39 row that governs sharing pre-announcement board material. */
export const RELATED_DECISION_ID = "DA-20";

/** The quarter the pack reports on. */
export const PERIOD = Object.freeze({ label: "Q1 2026", start: "2026-01-01", end: "2026-03-31" });

/** The canon company the whole finance pack belongs to. */
export const ENTITY_CANON_ID = "co-002";

/** The two classes a metric can carry, and the rule that assigns them. */
export const DISCLOSURE_CLASSES = ["board_reported", "board_supporting"];

/** How many of the twelve the frozen excerpt already publishes. */
export const BOARD_REPORTED_METRICS = 2;

/** The retained-earnings account the quarter's result sits in. */
const EARNINGS_ACCOUNT = "3200";

/** The two liability accounts the deferred revenue caption is built from. */
const DEFERRED_REVENUE_ACCOUNTS = ["2300", "2310"];

/** The account whose accrued charge FIN-05 does not yet reflect (plant V17). */
const TIMING_ACCOUNT = "6020";

/** The keys every metric object carries, in order. */
export const METRIC_KEYS = [
  "metric_id", "name", "value", "unit", "basis", "source_artifact", "source_reference", "disclosure_class",
];

/** The units this pack uses. FIN-31's vocabulary, plus the one ratio. */
export const UNITS = ["usd", "percent"];

const pct = (numeratorCents, denominatorCents) => ((numeratorCents / denominatorCents) * 100).toFixed(2);

/** A money figure the way FIN-40 states it rounds: nearest hundred thousand, read in millions. */
function boardRounded(amountCents) {
  return (amountCents / 100 / 1e6).toFixed(1);
}

/** The classification banner and the two headline figures, read out of the frozen excerpt. */
function boardExcerpt() {
  const text = readFileSync(FIN_40_EXCERPT, "utf8");
  const banner = /^\*\*Classification:\*\*\s*(.+)$/m.exec(text);
  if (!banner) throw new Error(`${id}: the FIN-40 excerpt carries no Classification line to read the banner off`);
  const classification = banner[1].trim();
  if (!text.startsWith(`**${classification}**`)) {
    throw new Error(`${id}: the FIN-40 excerpt's head banner and its Classification line disagree`);
  }
  return { text, classification };
}

/**
 * The two sign operations, applied where each belongs. A section subtotal
 * applies section_sign; a balance does not.
 */
function statementFigures() {
  const trialBalance = buildTrialBalance().rows;
  const byCode = new Map(trialBalance.map((r) => [r.account_code, r]));
  const account = (code) => {
    const row = byCode.get(code);
    if (!row) throw new Error(`${id}: ${code} is not a FIN-05 account_code`);
    return row;
  };

  // The quarter's revenue is a SECTION subtotal of ending balances, so the
  // contra-revenue account subtracts rather than adds.
  const revenueRows = trialBalance.filter((r) => r.type === "revenue");
  const revenueQ1Cents = revenueRows.reduce(
    (sum, r) => sum + toCents(r.ending_balance) * sectionSign("revenue", r.normal_balance), 0
  );

  const cashRows = trialBalance.filter((r) => r.subtype === "cash");
  const cashEndingCents = cashRows.reduce((sum, r) => sum + toCents(r.ending_balance), 0);
  const cashBeginningCents = cashRows.reduce((sum, r) => sum + toCents(r.beginning_balance), 0);

  // The March subtotals come off FIN-24, which ships section_sign as a column
  // so no consumer has to hold the natural-direction table.
  const { rows: tracker } = buildActualsVsBudget();
  const marchSubtotal = (section) => tracker
    .filter((row) => row.statement_section === section)
    .reduce((sum, row) => sum + toCents(row.actual_amount) * Number(row.section_sign), 0);
  const naiveRevenueCents = tracker
    .filter((row) => row.statement_section === "revenue")
    .reduce((sum, row) => sum + toCents(row.actual_amount), 0);

  return {
    revenueQ1Cents,
    netLossQ1Cents: toCents(account(EARNINGS_ACCOUNT).ending_debit),
    revenueMarchCents: marchSubtotal("revenue"),
    costOfRevenueMarchCents: marchSubtotal("cost_of_revenue"),
    operatingExpenseMarchCents: marchSubtotal("operating_expense"),
    netLossMarchCents: toCents(account(EARNINGS_ACCOUNT).period_debit),
    naiveRevenueMarchCents: naiveRevenueCents,
    cashEndingCents,
    netCashChangeCents: cashBeginningCents - cashEndingCents,
    deferredRevenueCents: DEFERRED_REVENUE_ACCOUNTS.reduce(
      (sum, code) => sum + toCents(account(code).ending_balance), 0
    ),
    cashAccountCount: cashRows.length,
    revenueAccountCount: revenueRows.length,
  };
}

/** The five accrual lines FIN-05 does not reflect, read out of FIN-09 through FIN-25's own note. */
function timingChargeCents(closeBatchLines) {
  const lines = closeBatchLines.filter((line) => line.gl_account === TIMING_ACCOUNT && line.debit !== "");
  if (lines.length === 0) throw new Error(`${id}: FIN-09 no longer debits account ${TIMING_ACCOUNT}`);
  return { count: lines.length, cents: lines.reduce((sum, line) => sum + toCents(line.debit), 0) };
}

/** The twelve metrics, every value recomputed and every basis naming its own convention. */
function buildMetrics({ figures, arSummary, timing }) {
  const grossMarginPct = pct(figures.revenueMarchCents - figures.costOfRevenueMarchCents, figures.revenueMarchCents);
  const naiveGrossMarginPct = pct(
    figures.naiveRevenueMarchCents - figures.costOfRevenueMarchCents, figures.naiveRevenueMarchCents
  );
  const arBucket = arSummary.buckets.find((b) => b.bucket === "90+");
  if (!arBucket) throw new Error(`${id}: FIN-04 no longer carries a 90+ bucket`);

  return [
    {
      metric_id: "revenue_net_q1",
      name: "Net revenue, quarter to date",
      value: cents(figures.revenueQ1Cents),
      unit: "usd",
      basis: `Section subtotal of the FIN-05 ending balances on all ${figures.revenueAccountCount} revenue accounts `
        + "under R-SIGN convention 2, so the contra-revenue account subtracts rather than adds. Includes interest "
        + "income and is net of discounts and credits.",
      source_artifact: "FIN-05",
      source_reference: "ending_balance on the revenue section",
    },
    {
      metric_id: "net_loss_q1",
      name: "Net loss, quarter to date",
      value: cents(figures.netLossQ1Cents),
      unit: "usd",
      basis: `Magnitude of the FIN-05 balance on account ${EARNINGS_ACCOUNT} at the period end. The account is `
        + "credit-normal, so its ending_balance cell is negative and the figure published here is its ending_debit. "
        + "No sign convention is applied to a balance.",
      source_artifact: "FIN-05",
      source_reference: `account ${EARNINGS_ACCOUNT} ending_debit`,
    },
    {
      metric_id: "revenue_net_march",
      name: "Net revenue, March 2026",
      value: cents(figures.revenueMarchCents),
      unit: "usd",
      basis: "Sum over FIN-24's revenue lines of actual_amount times section_sign, R-SIGN convention 2. A naive sum "
        + `of actual_amount returns ${cents(figures.naiveRevenueMarchCents)}, which is high by twice the contra line.`,
      source_artifact: "FIN-24",
      source_reference: "statement_section revenue",
    },
    {
      metric_id: "cost_of_revenue_march",
      name: "Cost of revenue, March 2026",
      value: cents(figures.costOfRevenueMarchCents),
      unit: "usd",
      basis: "Sum over FIN-24's cost of revenue lines of actual_amount times section_sign, R-SIGN convention 2. "
        + "Every line in the section carries section_sign 1, so the subtotal and a naive sum agree here.",
      source_artifact: "FIN-24",
      source_reference: "statement_section cost_of_revenue",
    },
    {
      metric_id: "operating_expense_march",
      name: "Operating expense, March 2026",
      value: cents(figures.operatingExpenseMarchCents),
      unit: "usd",
      basis: "Sum over FIN-24's operating expense lines of actual_amount times section_sign, R-SIGN convention 2. "
        + "Every line in the section carries section_sign 1. Posting timing: FIN-05 is the pre-close trial balance "
        + `and does not reflect the FIN-09 close batch, which debits ${cents(timing.cents)} to account `
        + `${TIMING_ACCOUNT} Employee Benefits across ${timing.count} accrual lines. That line reads 5.86 percent `
        + "under budget on FIN-24 and turns unfavorable once the batch is reflected, so a narrative that reads it as "
        + "a reduction in spending on people is reading a posting date.",
      source_artifact: "FIN-24",
      source_reference: "statement_section operating_expense",
    },
    {
      metric_id: "net_loss_march",
      name: "Net loss, March 2026",
      value: cents(figures.netLossMarchCents),
      unit: "usd",
      basis: `Period movement of the FIN-05 balance on account ${EARNINGS_ACCOUNT}, and equal to net revenue less `
        + "cost of revenue less operating expense for the month as published above. No sign convention is applied "
        + "to a period movement on a single account.",
      source_artifact: "FIN-05",
      source_reference: `account ${EARNINGS_ACCOUNT} period_debit`,
    },
    {
      metric_id: "gross_margin_pct_march",
      name: "Gross margin, March 2026",
      value: grossMarginPct,
      unit: "percent",
      basis: "Net revenue less cost of revenue over net revenue, both taken as section subtotals under R-SIGN "
        + `convention 2. Under a naive sum of FIN-24's actual_amount it reads ${naiveGrossMarginPct}.`,
      source_artifact: "FIN-24",
      source_reference: "statement_section revenue and cost_of_revenue",
    },
    {
      metric_id: "cash_total_2026_03_31",
      name: "Cash and equivalents at 2026-03-31",
      value: cents(figures.cashEndingCents),
      unit: "usd",
      basis: `Sum of the FIN-05 ending balances on the ${figures.cashAccountCount} accounts the chart marks as cash. `
        + "All four are debit-normal asset accounts, so no sign convention applies.",
      source_artifact: "FIN-05",
      source_reference: "ending_balance where subtype is cash",
    },
    {
      metric_id: "net_cash_change_march",
      name: "Net change in cash, March 2026",
      value: cents(figures.netCashChangeCents),
      unit: "usd",
      basis: "FIN-05 beginning balances less ending balances across the same cash accounts, so a positive figure is "
        + "a reduction in cash over the month. Stated as a movement rather than as a balance.",
      source_artifact: "FIN-05",
      source_reference: "beginning_balance less ending_balance where subtype is cash",
    },
    {
      metric_id: "ar_subledger_total",
      name: "Accounts receivable, subledger",
      value: arSummary.subledger_total,
      unit: "usd",
      basis: "FIN-04's own subledger total at the same as-of date. The subledger stands above FIN-05's control "
        + "account, and this pack publishes the subledger because that is the figure the receivable metrics are "
        + "computed on.",
      source_artifact: "FIN-04",
      source_reference: "subledger_total",
    },
    {
      metric_id: "ar_over_90_days",
      name: "Accounts receivable over 90 days",
      value: arBucket.open_balance,
      unit: "usd",
      basis: "The open balance FIN-04 carries in its oldest aging bucket. A bucket total, not a subtotal, so no "
        + "sign convention applies.",
      source_artifact: "FIN-04",
      source_reference: "buckets, 90+ open_balance",
    },
    {
      metric_id: "deferred_revenue_total",
      name: "Deferred revenue, current and non-current",
      value: cents(figures.deferredRevenueCents),
      unit: "usd",
      basis: `Sum of the FIN-05 ending balances on accounts ${DEFERRED_REVENUE_ACCOUNTS.join(" and ")}. Both are `
        + "credit-normal liabilities and both are published as positive magnitudes, which is the balance-sheet "
        + "caption rather than a signed subtotal.",
      source_artifact: "FIN-05",
      source_reference: `accounts ${DEFERRED_REVENUE_ACCOUNTS.join(" and ")} ending_balance`,
    },
  ];
}

/**
 * The disclosure rule, applied over the frozen excerpt's own text: a figure the
 * board pack already publishes in rounded form is board_reported, and every
 * other approved figure is board_supporting.
 */
function classifyMetrics(metrics, excerptText) {
  return metrics.map((metric) => ({
    ...metric,
    disclosure_class: metric.unit === "usd" && excerptText.includes(`${boardRounded(toCents(metric.value))} million`)
      ? "board_reported"
      : "board_supporting",
  }));
}

function assertPlants(pack, { figures, timing }) {
  if (pack.metrics.length !== METRIC_IDS.length) {
    throw new Error(`${id}: ${pack.metrics.length} metrics, expected ${METRIC_IDS.length}`);
  }
  const ids = pack.metrics.map((m) => m.metric_id);
  if (ids.join(",") !== METRIC_IDS.join(",")) {
    throw new Error(`${id}: the metric ids or their order moved (${ids.join(", ")})`);
  }
  for (const metric of pack.metrics) {
    if (Object.keys(metric).join(",") !== METRIC_KEYS.join(",")) {
      throw new Error(`${id}: ${metric.metric_id} does not carry the documented key list in order`);
    }
    for (const key of METRIC_KEYS) {
      if (typeof metric[key] !== "string" || metric[key] === "") {
        throw new Error(`${id}: ${metric.metric_id} carries an empty ${key}`);
      }
    }
    if (!UNITS.includes(metric.unit)) throw new Error(`${id}: ${metric.metric_id} carries unit ${metric.unit}`);
    if (!DISCLOSURE_CLASSES.includes(metric.disclosure_class)) {
      throw new Error(`${id}: ${metric.metric_id} carries disclosure_class ${metric.disclosure_class}`);
    }
    if (!/^-?\d+\.\d{2}$/.test(metric.value)) {
      throw new Error(`${id}: ${metric.metric_id} carries value "${metric.value}", which is not a 2dp figure`);
    }
  }

  // The three March subtotals roll to the month's result, which is the only
  // arithmetic in the pack that crosses two source artifacts.
  const rolled = figures.revenueMarchCents - figures.costOfRevenueMarchCents - figures.operatingExpenseMarchCents;
  if (-rolled !== figures.netLossMarchCents) {
    throw new Error(
      `${id}: the three March subtotals roll to ${cents(-rolled)}, `
      + `against the ${cents(figures.netLossMarchCents)} FIN-05 carries`
    );
  }
  // The contra line is the whole reason section_sign exists here.
  if (figures.naiveRevenueMarchCents === figures.revenueMarchCents) {
    throw new Error(`${id}: the naive revenue sum and the section subtotal agree, so the contra line vanished`);
  }

  // T-R2. Two metrics and only two are figures the frozen excerpt publishes.
  const reported = pack.metrics.filter((m) => m.disclosure_class === "board_reported");
  if (reported.length !== BOARD_REPORTED_METRICS) {
    throw new Error(`${id}: ${reported.length} metrics agree with the FIN-40 excerpt, expected ${BOARD_REPORTED_METRICS}`);
  }

  // V17. Exactly one metric's basis names a FIN-09 balance FIN-05 does not
  // reflect, and it names the charge and the line count rather than gesturing.
  const timingCaveated = pack.metrics.filter((m) => m.basis.includes("FIN-09"));
  if (timingCaveated.length !== 1) {
    throw new Error(`${id}: ${timingCaveated.length} metrics carry a posting-timing explanation, expected 1`);
  }
  if (!timingCaveated[0].basis.includes(cents(timing.cents)) || !timingCaveated[0].basis.includes(TIMING_ACCOUNT)) {
    throw new Error(`${id}: the posting-timing explanation does not name the charge and the account it lands on`);
  }

  // V18. Every metric names a source a narrative can cite, so no figure in the
  // pack is one the pack itself does not fix.
  const unsourced = pack.metrics.filter((m) => m.source_artifact === "" || m.source_reference === "");
  if (unsourced.length !== 0) throw new Error(`${id}: ${unsourced.length} metrics carry no source reference`);
}

/** V19: the method the pack supports two readings of is named in no emitted file. */
function assertAbsentByDesign(files) {
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

// ------------------------------------------------------------------ builder

/**
 * The pack as a plain object with the documented keys in the documented order.
 * Pure of draws: every value is recomputed from frozen bytes at build time.
 * @param {Map} canon loadCanonCompanies() output
 * @returns {object}
 */
export function buildMetricsPack(canon) {
  const entity = canon?.get(ENTITY_CANON_ID);
  if (!entity) throw new Error(`${id}: ${ENTITY_CANON_ID} is not in canon/companies.md`);

  const { text, classification } = boardExcerpt();
  const figures = statementFigures();
  const { summary: arSummary } = buildArAging();
  const timing = timingChargeCents(buildCloseBatch().lines);

  const task = buildCloseChecklist().find((t) => t.task_id === APPROVAL.source_close_task);
  if (!task) throw new Error(`${id}: ${APPROVAL.source_close_task} is not on the shipped close checklist`);

  const pack = {
    generated_from_spec: id,
    entity: { canon_id: ENTITY_CANON_ID, name: entity.name },
    period: { ...PERIOD },
    approval: {
      approved_by_role: APPROVAL.approved_by_role,
      reviewed_by_role: APPROVAL.reviewed_by_role,
      approved_date: APPROVAL.approved_date,
      source_close_task: APPROVAL.source_close_task,
      source_close_task_status_at_as_of: task.status,
      source_artifact: APPROVAL.source_artifact,
    },
    classification,
    related_decision_id: RELATED_DECISION_ID,
    metrics: classifyMetrics(buildMetrics({ figures, arSummary, timing }), text),
  };
  assertPlants(pack, { figures, timing });
  return pack;
}

// ---------------------------------------------------------------- generate

export function generate({ canon }) {
  return assertAbsentByDesign([
    { path: OUTPUT_FILE, content: JSON.stringify(buildMetricsPack(canon), null, 2) + "\n" },
  ]);
}

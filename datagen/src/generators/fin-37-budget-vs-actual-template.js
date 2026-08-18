// FIN-37 budget-vs-actual-template: the variance tracker finance-spreadsheet-ops
// deploys in lesson 1 and reads in lesson 3, reused by finance-google-workspace
// and finance-microsoft-365.
//
// Two things are derived rather than typed, which is what keeps this file honest
// against the rest of the pack:
//
//   1. The row spine is every active profit-and-loss account on the FIN-22
//      chart, in chart order, so the template cannot drift from the chart the
//      finance pack posts against.
//   2. Each line's budget is that account's OWN prior run rate, read off FIN-05:
//      the trial balance's beginning column is year to date at 2026-02-28, so
//      dividing it by two gives the January and February monthly average, and a
//      small seeded planning adjustment moves it off that average the way a real
//      plan does. A budget drawn from a band per subtype produced payroll taxes
//      at 114 percent of salaries and twenty-two of twenty-seven lines breaching
//      their own explanation threshold in March, which is not a plan, it is
//      noise, and a variance module built on noise teaches nothing.
//
// March is deliberately NOT an input: a plan set before the period cannot know
// the period. That is what leaves a handful of real variances for the learner to
// explain rather than none and rather than everything.
//
// Budget is populated because a tracker with no plan in it teaches nothing.
// actual, variance and the explanation ship empty, because the module's hard
// rule is that a person enters the figure and AI never commits a cell.
//
// No planted defects: three modules deploy this as their starting schema.
import { toCsv } from "../csv.js";
import { buildChartOfAccounts } from "./fin-22-chart-of-accounts.js";
import { buildTrialBalance } from "./fin-05-gl-trial-balance.js";
import { assertRolesUsed } from "./finance-roles.js";

export const id = "FIN-37";

export const COLUMNS = [
  "line_id", "account_code", "account_name", "statement_section", "normal_balance", "owner_role",
  "budget_amount", "actual_amount", "variance_amount", "variance_pct",
  "explanation_threshold_usd", "variance_explanation",
];

export const STATEMENT_SECTIONS = ["revenue", "cost_of_revenue", "operating_expense"];

/**
 * Months inside FIN-05's beginning column. The trial balance is dated
 * 2026-03-31 and its beginning column is year to date at 2026-02-28, so a
 * calendar-year company has two months in it (canon/timeline.md).
 */
export const PRIOR_MONTHS = 2;

/**
 * How far the plan may sit from the prior run rate, in tenths of a percent.
 * Planning judgment, not noise: wide enough that a few lines cross their
 * explanation threshold in March, narrow enough that the plan still describes
 * the same company.
 */
export const PLANNING_ADJUSTMENT_LIMIT = 50;

/** Owner by section: the plan is owned by FP&A, the spend lines by the managers. */
const OWNER_BY_SECTION = {
  revenue: "FP&A Analyst",
  cost_of_revenue: "Finance Manager",
  operating_expense: "Finance Manager",
};

function sectionFor(account) {
  if (account.type === "revenue") return "revenue";
  if (account.subtype === "cost_of_revenue") return "cost_of_revenue";
  return "operating_expense";
}

/**
 * Explanation threshold: 5 percent of the budgeted line, floored at 10,000 and
 * rounded up to the nearest 1,000. Stated as a rule so a reader can recompute
 * every cell. See the D3-lite plan UNCONFIRMED 3: when FIN-26
 * materiality-thresholds ships a generator, one of the two has to give.
 */
export function explanationThreshold(budgetUsd) {
  const fivePercent = budgetUsd * 0.05;
  const floored = Math.max(10000, fivePercent);
  return Math.ceil(floored / 1000) * 1000;
}

/**
 * The prior monthly run rate of one FIN-05 row, in whole dollars: its beginning
 * balance (year to date at 2026-02-28) over PRIOR_MONTHS. Exported so the test
 * can recompute the derivation from FIN-05 rather than trust it.
 */
export function priorRunRateUsd(trialBalanceRow) {
  const beginningCents = Math.round(Number(trialBalanceRow.beginning_balance) * 100);
  return beginningCents / PRIOR_MONTHS / 100;
}

/**
 * @param {(stream: string) => import("../seed.js").Rng} rng
 * @returns {object[]}
 */
export function buildBudgetVsActualTemplate(rng) {
  const budgetRng = rng("budget");
  const chart = buildChartOfAccounts().filter(
    (a) => a.active === "true" && (a.type === "revenue" || a.type === "expense")
  );
  if (chart.length === 0) throw new Error(`${id}: no active profit-and-loss accounts on the FIN-22 chart`);
  const trialBalance = new Map(buildTrialBalance().rows.map((r) => [r.account_code, r]));

  const rows = chart.map((account, i) => {
    const statement_section = sectionFor(account);
    const tbRow = trialBalance.get(account.account_code);
    if (!tbRow) throw new Error(`${id}: account ${account.account_code} is not on the FIN-05 trial balance`);
    const runRate = priorRunRateUsd(tbRow);
    if (runRate <= 0) {
      throw new Error(`${id}: account ${account.account_code} has no prior activity to plan from`);
    }
    // Planning adjustment, then whole hundreds: a budget is planned in round
    // numbers, and 100 is the floor so a small account still carries a plan.
    const adjusted = runRate * (1 + budgetRng.int(-PLANNING_ADJUSTMENT_LIMIT, PLANNING_ADJUSTMENT_LIMIT) / 1000);
    const budgetUsd = Math.max(100, Math.round(adjusted / 100) * 100);
    return {
      line_id: `BVA-${String(i + 1).padStart(2, "0")}`,
      account_code: account.account_code,
      account_name: account.account_name,
      statement_section,
      // Read off the chart, so a consumer knows which way the line runs without
      // parsing its name: 4900 Sales Discounts and Credits is a revenue-section
      // line with a debit normal balance, and its budget is the planned discount
      // as a positive magnitude, netted against the credit lines.
      normal_balance: account.normal_balance,
      owner_role: OWNER_BY_SECTION[statement_section],
      budget_amount: budgetUsd.toFixed(2),
      actual_amount: "",
      variance_amount: "",
      variance_pct: "",
      explanation_threshold_usd: String(explanationThreshold(budgetUsd)),
      variance_explanation: "",
    };
  });

  assertRolesUsed(id, rows.map((r) => r.owner_role));
  for (const row of rows) {
    if (!STATEMENT_SECTIONS.includes(row.statement_section)) {
      throw new Error(`${id}: ${row.line_id} has statement_section "${row.statement_section}"`);
    }
    if (row.normal_balance !== "debit" && row.normal_balance !== "credit") {
      throw new Error(`${id}: ${row.line_id} has normal_balance "${row.normal_balance}"`);
    }
    const budget = Number(row.budget_amount);
    if (budget % 100 !== 0 || budget <= 0) {
      throw new Error(`${id}: ${row.line_id} budget ${row.budget_amount} is not a positive whole hundred`);
    }
    const runRate = priorRunRateUsd(trialBalance.get(row.account_code));
    const drift = Math.abs(budget - runRate) / runRate;
    // The rounding floor can move a very small line by more than the planning
    // limit on its own, so the tolerance is the limit plus one whole hundred.
    if (drift > PLANNING_ADJUSTMENT_LIMIT / 1000 + 100 / runRate) {
      throw new Error(`${id}: ${row.line_id} budget is ${(drift * 100).toFixed(1)} percent off its own run rate`);
    }
  }
  for (const section of STATEMENT_SECTIONS) {
    if (!rows.some((r) => r.statement_section === section)) throw new Error(`${id}: no ${section} lines`);
  }

  return rows;
}

export function generate({ rng }) {
  return [{
    path: "budget-vs-actual-template.csv",
    content: toCsv(COLUMNS, buildBudgetVsActualTemplate(rng)),
  }];
}

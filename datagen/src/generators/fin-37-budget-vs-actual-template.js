// FIN-37 budget-vs-actual-template: the variance tracker finance-spreadsheet-ops
// deploys in lesson 1 and reads in lesson 3, reused by finance-google-workspace
// and finance-microsoft-365.
//
// The row spine is not typed here: it is every active profit-and-loss account on
// the FIN-22 chart, in chart order, so the template cannot drift from the chart
// the rest of the finance pack posts against. Budget is populated (a budget is
// an input, and a tracker with no plan in it teaches nothing); actual, variance
// and the explanation ship empty, because the module's hard rule is that a
// person enters the figure and AI never commits a cell.
//
// No planted defects: three modules deploy this as their starting schema.
import { toCsv } from "../csv.js";
import { buildChartOfAccounts } from "./fin-22-chart-of-accounts.js";
import { assertRolesUsed } from "./finance-roles.js";

export const id = "FIN-37";

export const COLUMNS = [
  "line_id", "account_code", "account_name", "statement_section", "owner_role",
  "budget_amount", "actual_amount", "variance_amount", "variance_pct",
  "explanation_threshold_usd", "variance_explanation",
];

export const STATEMENT_SECTIONS = ["revenue", "cost_of_revenue", "operating_expense"];

// Monthly budget bands in whole dollars, keyed by the FIN-22 subtype. The bands
// are sized to the March 2026 pack: FIN-05's shipped result puts annualised
// revenue near 48.8m against a loss-making quarter, so the plan these bands
// produce is roughly 4.2m of revenue against roughly 5.7m of cost, a budgeted
// loss that the actual quarter then misses by a little. That is what gives the
// variance module something to explain.
//
// The contra-revenue line carries its planned discount as a positive magnitude,
// the way the account is named; a consumer nets it rather than reading the
// revenue column as a total.
const BUDGET_BANDS = {
  subscription: [900000, 1500000],
  services: [200000, 400000],
  other_income: [4000, 12000],
  contra_revenue: [12000, 40000],
  cost_of_revenue: [90000, 480000],
  people: [140000, 1200000],
  facilities: [18000, 120000],
  technology: [60000, 160000],
  marketing: [80000, 300000],
  travel: [20000, 80000],
  professional_fees: [20000, 90000],
  insurance: [10000, 40000],
  bank: [2000, 9000],
  depreciation: [40000, 120000],
};

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
 * @param {(stream: string) => import("../seed.js").Rng} rng
 * @returns {object[]}
 */
export function buildBudgetVsActualTemplate(rng) {
  const budgetRng = rng("budget");
  const chart = buildChartOfAccounts().filter(
    (a) => a.active === "true" && (a.type === "revenue" || a.type === "expense")
  );
  if (chart.length === 0) throw new Error(`${id}: no active profit-and-loss accounts on the FIN-22 chart`);

  const rows = chart.map((account, i) => {
    const statement_section = sectionFor(account);
    const band = BUDGET_BANDS[account.subtype];
    if (!band) throw new Error(`${id}: no budget band for FIN-22 subtype "${account.subtype}" (${account.account_code})`);
    // Whole hundreds: a budget is planned in round numbers, not to the cent.
    const budgetUsd = budgetRng.int(band[0] / 100, band[1] / 100) * 100;
    return {
      line_id: `BVA-${String(i + 1).padStart(2, "0")}`,
      account_code: account.account_code,
      account_name: account.account_name,
      statement_section,
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
    if (Number(row.budget_amount) % 100 !== 0 || Number(row.budget_amount) <= 0) {
      throw new Error(`${id}: ${row.line_id} budget ${row.budget_amount} is not a positive whole hundred`);
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

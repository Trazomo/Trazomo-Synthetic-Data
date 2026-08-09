// LGL-20 legal-ops-budget-roi-dataset: 3-year spend-by-category, headcount /
// activity-based cost allocation, expected-loss / ROI worked examples, and a
// board-level value-to-cost ratio dashboard for co-001's legal-ops function.
import { toCsv } from "../csv.js";

export const id = "LGL-20";

const YEARS = [2024, 2025, 2026];
const CATEGORIES = [
  "Outside counsel spend",
  "Contract management platform",
  "eDiscovery / litigation support",
  "Compliance & training",
  "Internal legal headcount",
  "Legal AI tooling",
];

const ACTIVITIES = [
  { activity: "Contract review & negotiation", headcount: 4 },
  { activity: "Litigation & disputes", headcount: 2 },
  { activity: "Compliance & regulatory", headcount: 2 },
  { activity: "IP & vendor management", headcount: 1.5 },
  { activity: "Self-service / intake triage", headcount: 1 },
];

const FULLY_LOADED_COST_PER_HEADCOUNT = 185000;

export function generate({ rng }) {
  const r = rng("budget");

  const spendByCategory = [];
  for (const category of CATEGORIES) {
    let base = r.int(80000, 620000);
    for (const year of YEARS) {
      // modest year-over-year drift, deterministic
      base = Math.round(base * r.amount(0.94, 1.14, 3));
      spendByCategory.push({ year, category, amount_usd: base });
    }
  }

  const costAllocation = ACTIVITIES.map((a) => ({
    activity: a.activity,
    headcount_fte: a.headcount,
    allocated_cost_usd: Math.round(a.headcount * FULLY_LOADED_COST_PER_HEADCOUNT),
  }));

  // Worked expected-loss / ROI examples: (probability of adverse outcome x
  // loss if it occurs) avoided by an intervention, vs. the intervention cost.
  const roiWorked = [
    { intervention: "AI-assisted contract review", cost_usd: 42000, adverse_probability_before: 0.18, adverse_probability_after: 0.06, loss_if_occurs_usd: 650000 },
    { intervention: "Vendor risk assessment program", cost_usd: 28000, adverse_probability_before: 0.09, adverse_probability_after: 0.02, loss_if_occurs_usd: 1200000 },
    { intervention: "Self-service portal for routine requests", cost_usd: 57000, adverse_probability_before: 0.05, adverse_probability_after: 0.01, loss_if_occurs_usd: 300000 },
  ].map((row) => {
    const expectedLossBefore = round2(row.adverse_probability_before * row.loss_if_occurs_usd);
    const expectedLossAfter = round2(row.adverse_probability_after * row.loss_if_occurs_usd);
    const expectedLossAvoided = round2(expectedLossBefore - expectedLossAfter);
    const roiRatio = round2(expectedLossAvoided / row.cost_usd);
    return {
      intervention: row.intervention,
      cost_usd: row.cost_usd,
      expected_loss_before_usd: expectedLossBefore,
      expected_loss_after_usd: expectedLossAfter,
      expected_loss_avoided_usd: expectedLossAvoided,
      roi_ratio: roiRatio,
    };
  });

  const totalSpendByYear = YEARS.map((year) => ({
    year,
    total_spend_usd: spendByCategory.filter((s) => s.year === year).reduce((sum, s) => sum + s.amount_usd, 0),
  }));
  const totalValueDelivered = roiWorked.reduce((sum, r2) => sum + r2.expected_loss_avoided_usd, 0);
  const currentYearSpend = totalSpendByYear[totalSpendByYear.length - 1].total_spend_usd;
  const dashboard = [
    {
      metric: "Total legal-ops spend (current year)",
      value_usd: currentYearSpend,
    },
    {
      metric: "Total value delivered (expected loss avoided, worked examples)",
      value_usd: totalValueDelivered,
    },
    {
      metric: "Board value-to-cost ratio",
      value_usd: round2(totalValueDelivered / currentYearSpend),
    },
  ];

  return [
    { path: "spend-by-category.csv", content: toCsv(["year", "category", "amount_usd"], spendByCategory) },
    { path: "cost-allocation.csv", content: toCsv(["activity", "headcount_fte", "allocated_cost_usd"], costAllocation) },
    { path: "roi-worked-examples.csv", content: toCsv(
      ["intervention", "cost_usd", "expected_loss_before_usd", "expected_loss_after_usd", "expected_loss_avoided_usd", "roi_ratio"],
      roiWorked
    ) },
    { path: "board-dashboard.csv", content: toCsv(["metric", "value_usd"], dashboard) },
  ];
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

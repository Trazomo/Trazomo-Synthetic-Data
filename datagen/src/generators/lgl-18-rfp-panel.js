// LGL-18 outside-counsel-rfp-panel-benchmark: an RFP rubric, a 3-firm
// comparison table, a 7-dimension balanced scorecard, and worked
// outcome-to-business-impact examples for co-002's outside-counsel panel
// (co-111 Calder & Voss, co-112 Whitlock Brennan, co-113 Marrow Gale).
import { toCsv } from "../csv.js";

export const id = "LGL-18";

const FIRMS = [
  { canonId: "co-111", name: "Calder & Voss LLP" },
  { canonId: "co-112", name: "Whitlock Brennan LLP" },
  { canonId: "co-113", name: "Marrow Gale LLP" },
];

const RFP_RUBRIC = [
  { category: "Rate competitiveness", weight_pct: 20 },
  { category: "Subject-matter expertise", weight_pct: 20 },
  { category: "Responsiveness", weight_pct: 15 },
  { category: "Technology / AI adoption", weight_pct: 15 },
  { category: "Reporting & transparency", weight_pct: 10 },
  { category: "Diversity & inclusion", weight_pct: 10 },
  { category: "References", weight_pct: 10 },
];

const SCORECARD_DIMENSIONS = [
  { dimension: "Cost efficiency", weight_pct: 20 },
  { dimension: "Quality of work product", weight_pct: 20 },
  { dimension: "Responsiveness & communication", weight_pct: 15 },
  { dimension: "Risk management", weight_pct: 15 },
  { dimension: "Innovation & technology use", weight_pct: 10 },
  { dimension: "Diversity & inclusion", weight_pct: 10 },
  { dimension: "Client satisfaction", weight_pct: 10 },
];

export function generate({ rng }) {
  const r = rng("panel");

  const comparison = FIRMS.map((firm) => ({
    firm_canon_id: firm.canonId,
    firm_name: firm.name,
    blended_hourly_rate_usd: r.int(410, 690),
    avg_cost_per_matter_usd: r.int(18000, 95000),
    avg_matter_duration_days: r.int(60, 240),
    budget_adherence_pct: r.int(78, 101),
  }));

  const scorecardRows = [];
  for (const dim of SCORECARD_DIMENSIONS) {
    const row = { dimension: dim.dimension, weight_pct: dim.weight_pct };
    for (const firm of FIRMS) {
      row[`${firm.canonId}_score_1to5`] = r.int(2, 5);
    }
    scorecardRows.push(row);
  }
  const scorecardColumns = ["dimension", "weight_pct", ...FIRMS.map((f) => `${f.canonId}_score_1to5`)];

  const impactExamples = [
    {
      metric: "Budget adherence improved 12 points after panel consolidation",
      operational_change: "Matters routed to top-scoring firm on cost efficiency",
      business_impact_usd: 84000,
      business_impact_note: "Avoided overage on 3 mid-size matters at the prior panel's average overrun rate.",
    },
    {
      metric: "Average matter duration reduced by 21 days",
      operational_change: "Firm with strongest responsiveness score handling time-sensitive matters",
      business_impact_usd: 46000,
      business_impact_note: "Faster resolution reduced internal opportunity cost on blocked deals.",
    },
    {
      metric: "Technology/AI adoption score gap of 2 points between top and bottom firm",
      operational_change: "Document review offloaded to AI-assisted workflow at top-scoring firm",
      business_impact_usd: 31000,
      business_impact_note: "Reduced first-pass review hours billed at associate rate.",
    },
  ];

  const rubricColumns = ["category", "weight_pct"];

  const md = buildMarkdown({ comparison, impactExamples });

  return [
    { path: "rfp-rubric.csv", content: toCsv(rubricColumns, RFP_RUBRIC) },
    { path: "comparison-table.csv", content: toCsv(
      ["firm_canon_id", "firm_name", "blended_hourly_rate_usd", "avg_cost_per_matter_usd", "avg_matter_duration_days", "budget_adherence_pct"],
      comparison
    ) },
    { path: "balanced-scorecard.csv", content: toCsv(scorecardColumns, scorecardRows) },
    { path: "panel-benchmark.md", content: md },
  ];
}

function buildMarkdown({ comparison, impactExamples }) {
  const lines = [];
  lines.push("# Outside-Counsel RFP Panel Benchmark");
  lines.push("");
  lines.push("Generated synthetic data. Source: `specs/artifact-specs.yaml` (LGL-18).");
  lines.push("");
  lines.push("## 3-firm comparison");
  lines.push("");
  lines.push("| Firm | Blended rate ($/hr) | Avg cost/matter | Avg duration (days) | Budget adherence |");
  lines.push("|---|---|---|---|---|");
  for (const c of comparison) {
    lines.push(`| ${c.firm_name} | $${c.blended_hourly_rate_usd} | $${c.avg_cost_per_matter_usd.toLocaleString("en-US")} | ${c.avg_matter_duration_days} | ${c.budget_adherence_pct}% |`);
  }
  lines.push("");
  lines.push("## Outcome-to-business-impact translation examples");
  lines.push("");
  for (const ex of impactExamples) {
    lines.push(`- **${ex.metric}** -> ${ex.operational_change} -> **$${ex.business_impact_usd.toLocaleString("en-US")}** business impact. ${ex.business_impact_note}`);
  }
  lines.push("");
  lines.push("See `rfp-rubric.csv` for the weighted RFP rubric and `balanced-scorecard.csv` for the 7-dimension balanced scorecard used in ongoing panel evaluation.");
  lines.push("");
  return lines.join("\n");
}

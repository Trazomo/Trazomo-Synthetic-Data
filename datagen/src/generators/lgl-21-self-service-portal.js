// LGL-21 self-service-portal-program-dataset: a 30-day demand log (146
// requests across 8 categories), a 4-tier handler model with a P1-P4 SLA
// matrix, an FAQ record set, and a 6-month ROI dataset ($57,000 cost /
// $104,738 value / 83.8% ROI).
import { toCsv } from "../csv.js";
import { ANCHOR_DATE, addDays } from "../dates.js";

export const id = "LGL-21";

const CATEGORIES = [
  "Password reset",
  "Contract template request",
  "NDA self-serve",
  "Policy question",
  "Vendor intake",
  "Certificate of insurance",
  "Signature routing",
  "Other",
];

const TOTAL_REQUESTS = 146;
const WINDOW_DAYS = 30;

// P1 (most urgent) -> senior counsel; P4 (routine) -> self-service bot.
const SLA_MATRIX = [
  { priority: "P1", handler_tier: "Tier 4 - Senior Counsel", response_time_hours: 2, resolution_time_hours: 24 },
  { priority: "P2", handler_tier: "Tier 3 - Attorney", response_time_hours: 8, resolution_time_hours: 72 },
  { priority: "P3", handler_tier: "Tier 2 - Paralegal", response_time_hours: 24, resolution_time_hours: 120 },
  { priority: "P4", handler_tier: "Tier 1 - Self-Service Bot", response_time_hours: 1, resolution_time_hours: 24 },
];
// Weighted so most demand is routine (P4/P3), matching a real self-service funnel.
const PRIORITY_WEIGHTS = [
  { priority: "P1", weight: 3 },
  { priority: "P2", weight: 12 },
  { priority: "P3", weight: 35 },
  { priority: "P4", weight: 50 },
];

const FAQ_RECORDS = [
  { faq_id: "FAQ-001", category: "NDA self-serve", question: "Can I sign a one-way NDA without legal review?", answer: "Yes, if it uses the approved template unmodified; any redline routes to Tier 3." },
  { faq_id: "FAQ-002", category: "Contract template request", question: "Where do I find the current MSA template?", answer: "The self-service portal always serves the current approved version; do not use saved local copies." },
  { faq_id: "FAQ-003", category: "Vendor intake", question: "What triggers escalated review for a new vendor?", answer: "Contract value at or above the vendor-intake routing threshold (see LGL-07)." },
  { faq_id: "FAQ-004", category: "Certificate of insurance", question: "How fast can I get a COI issued?", answer: "Tier 1 self-service issues standard COIs within 1 business hour." },
  { faq_id: "FAQ-005", category: "Signature routing", question: "Who can route a document for e-signature?", answer: "Any employee with an active portal account; routing does not require legal review for approved templates." },
  { faq_id: "FAQ-006", category: "Policy question", question: "Where is the current policy library?", answer: "See the internal policy library corpus (CORE-05); the portal links directly to the current version." },
];

const ROI = {
  period_months: 6,
  cost_usd: 57000,
  value_usd: 104738,
};

export function generate({ rng }) {
  const r = rng("demand");

  const cumulativeWeights = [];
  let running = 0;
  for (const pw of PRIORITY_WEIGHTS) {
    running += pw.weight;
    cumulativeWeights.push({ priority: pw.priority, cumulative: running });
  }
  const pickPriority = () => {
    const roll = r.int(1, running);
    return cumulativeWeights.find((c) => roll <= c.cumulative).priority;
  };
  const slaByPriority = Object.fromEntries(SLA_MATRIX.map((s) => [s.priority, s]));

  const startDate = addDays(ANCHOR_DATE, -WINDOW_DAYS);
  const demandLog = [];
  for (let i = 1; i <= TOTAL_REQUESTS; i++) {
    const priority = pickPriority();
    const sla = slaByPriority[priority];
    demandLog.push({
      request_id: `SSP-${String(i).padStart(4, "0")}`,
      request_date: addDays(startDate, r.int(0, WINDOW_DAYS - 1)),
      category: r.pick(CATEGORIES),
      priority,
      handler_tier: sla.handler_tier,
    });
  }
  demandLog.sort((a, b) => (a.request_date < b.request_date ? -1 : a.request_date > b.request_date ? 1 : 0));

  const roiPct = round1(((ROI.value_usd - ROI.cost_usd) / ROI.cost_usd) * 100);
  const roiRecord = {
    ...ROI,
    roi_pct: roiPct,
    window_start: startDate,
    window_end: ANCHOR_DATE,
    total_requests_in_window: TOTAL_REQUESTS,
  };

  const bundle = {
    universe_version: "0.2.0",
    generated_from_spec: "LGL-21",
    sla_matrix: SLA_MATRIX,
    faq_records: FAQ_RECORDS,
    roi: roiRecord,
  };

  return [
    { path: "demand-log.csv", content: toCsv(["request_id", "request_date", "category", "priority", "handler_tier"], demandLog) },
    { path: "sla-matrix.csv", content: toCsv(["priority", "handler_tier", "response_time_hours", "resolution_time_hours"], SLA_MATRIX) },
    { path: "portal-program.json", content: JSON.stringify(bundle, null, 2) + "\n" },
  ];
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

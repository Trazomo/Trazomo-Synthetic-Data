// LGL-07 client-matter-intake-form-set: a standard matter-intake record, a
// high-value record, and a vendor-intake sub-path batch, all routed through
// the same hard-coded thresholds (500k critical-risk auto-escalation;
// 25k/100k vendor-intake routing bands).
import { createRng } from "../seed.js";
import { ANCHOR_DATE, addDays } from "../dates.js";
import { buildRoster } from "./core-04-people-roster.js";

export const id = "LGL-07";

const CRITICAL_RISK_THRESHOLD = 500000;
const VENDOR_ROUTE_LOW = 25000;
const VENDOR_ROUTE_HIGH = 100000;

const VENDOR_SUBPATHS = ["new_vendor", "renewal", "compliance", "dispute"];

function routeForVendorValue(value) {
  if (value < VENDOR_ROUTE_LOW) return "self_service";
  if (value < VENDOR_ROUTE_HIGH) return "standard_review";
  return "escalated_review";
}

export function generate({ rng }) {
  const roster = buildRoster(createRng("CORE-04", "roster"));
  const legalStaff = roster.filter((r) => r.department === "Legal" && r.employment_status === "active");
  const requestorPool = legalStaff.length > 0 ? legalStaff : roster.filter((r) => r.employment_status === "active");
  const r = rng("records");

  const intakeDate = addDays(ANCHOR_DATE, -r.int(0, 14));
  const standardRequestor = r.pick(requestorPool);
  const standardRecord = {
    record_id: "LGL-07-STD-001",
    intake_reference: "INT-2026-0410",
    record_type: "matter_intake",
    intake_date: intakeDate,
    requestor_employee_id: standardRequestor.employee_id,
    requestor_name: `${standardRequestor.first_name} ${standardRequestor.last_name}`,
    matter_type: "cloud-hosting SLA dispute",
    matter_value_usd: 250000,
    counterparty_canon_id: "co-110",
    counterparty_name: "CloudHost Inc.",
    response_deadline: addDays(intakeDate, 30),
    critical_risk_threshold_usd: CRITICAL_RISK_THRESHOLD,
    auto_escalated: 250000 >= CRITICAL_RISK_THRESHOLD,
  };

  const highValueRequestor = r.pick(requestorPool);
  const highValueIntakeDate = addDays(ANCHOR_DATE, -r.int(0, 7));
  const highValueRecord = {
    record_id: "LGL-07-HV-001",
    // Pinned: LGL-12 (trade-secret litigation matter) cites this intake by
    // reference number; the drafted document and this record must agree.
    intake_reference: "INT-2026-0433",
    record_type: "matter_intake",
    intake_date: highValueIntakeDate,
    requestor_employee_id: highValueRequestor.employee_id,
    requestor_name: `${highValueRequestor.first_name} ${highValueRequestor.last_name}`,
    matter_type: "employment/trade-secret matter",
    matter_value_usd: 750000,
    response_deadline_days: 14,
    response_deadline: addDays(highValueIntakeDate, 14),
    thread_reference: "LGL-12",
    critical_risk_threshold_usd: CRITICAL_RISK_THRESHOLD,
    auto_escalated: 750000 >= CRITICAL_RISK_THRESHOLD,
  };

  // Vendor-intake sub-paths: two records per sub-path, values chosen to
  // exercise all three routing bands (self_service / standard_review /
  // escalated_review) across the batch.
  const vendorRecords = [];
  const valueBandsByPair = [
    [12000, 60000],
    [95000, 140000],
    [8000, 25000],
    [110000, 30000],
  ];
  let vendorSeq = 0;
  for (const [i, subpath] of VENDOR_SUBPATHS.entries()) {
    for (const value of valueBandsByPair[i]) {
      vendorSeq += 1;
      vendorRecords.push({
        record_id: `LGL-07-VEND-${String(vendorSeq).padStart(3, "0")}`,
        intake_reference: `INT-2026-0${440 + vendorSeq}`,
        record_type: "vendor_intake",
        subpath,
        intake_date: addDays(ANCHOR_DATE, -r.int(0, 30)),
        vendor_value_usd: value,
        route_low_threshold_usd: VENDOR_ROUTE_LOW,
        route_high_threshold_usd: VENDOR_ROUTE_HIGH,
        routed_to: routeForVendorValue(value),
      });
    }
  }

  const bundle = {
    universe_version: "0.2.0",
    generated_from_spec: "LGL-07",
    critical_risk_auto_escalation_threshold_usd: CRITICAL_RISK_THRESHOLD,
    vendor_routing_thresholds_usd: { low: VENDOR_ROUTE_LOW, high: VENDOR_ROUTE_HIGH },
    records: [standardRecord, highValueRecord, ...vendorRecords],
  };

  const md = buildSummaryMarkdown({ standardRecord, highValueRecord, vendorRecords });

  return [
    { path: "records.json", content: JSON.stringify(bundle, null, 2) + "\n" },
    { path: "intake-summary.md", content: md },
  ];
}

function buildSummaryMarkdown({ standardRecord, highValueRecord, vendorRecords }) {
  const lines = [];
  lines.push("# Client & Matter Intake Form Set");
  lines.push("");
  lines.push("Generated synthetic data. Source: `specs/artifact-specs.yaml` (LGL-07).");
  lines.push("");
  lines.push("## Routing rules");
  lines.push("");
  lines.push(`- Critical-risk auto-escalation threshold: **$${CRITICAL_RISK_THRESHOLD.toLocaleString("en-US")}**. Any matter at or above this value is auto-escalated regardless of type.`);
  lines.push(`- Vendor-intake routing bands: below $${VENDOR_ROUTE_LOW.toLocaleString("en-US")} routes to self-service; $${VENDOR_ROUTE_LOW.toLocaleString("en-US")}-$${VENDOR_ROUTE_HIGH.toLocaleString("en-US")} routes to standard review; at or above $${VENDOR_ROUTE_HIGH.toLocaleString("en-US")} routes to escalated review.`);
  lines.push("");
  lines.push("## Standard record");
  lines.push("");
  lines.push(`${standardRecord.record_id}: ${standardRecord.matter_type}, valued at $${standardRecord.matter_value_usd.toLocaleString("en-US")}, requested by ${standardRecord.requestor_name}. Counterparty: ${standardRecord.counterparty_name} (${standardRecord.counterparty_canon_id}). Response deadline ${standardRecord.response_deadline}. Auto-escalated: ${standardRecord.auto_escalated}.`);
  lines.push("");
  lines.push("## High-value record");
  lines.push("");
  lines.push(`${highValueRecord.record_id}: ${highValueRecord.matter_type}, valued at $${highValueRecord.matter_value_usd.toLocaleString("en-US")}, requested by ${highValueRecord.requestor_name}. Response deadline is ${highValueRecord.response_deadline_days} days out (${highValueRecord.response_deadline}). Joins the ${highValueRecord.thread_reference} thread. Auto-escalated: ${highValueRecord.auto_escalated}.`);
  lines.push("");
  lines.push("## Vendor-intake sub-paths");
  lines.push("");
  lines.push("| Record | Sub-path | Value (USD) | Routed to |");
  lines.push("|---|---|---|---|");
  for (const v of vendorRecords) {
    lines.push(`| ${v.record_id} | ${v.subpath} | ${v.vendor_value_usd.toLocaleString("en-US")} | ${v.routed_to} |`);
  }
  lines.push("");
  return lines.join("\n");
}

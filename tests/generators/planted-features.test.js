// Spot-checks that each generator actually injects the planted_features
// called out in specs/artifact-specs.yaml, not just "produces some CSV".
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));

function fileByPath(files, path) {
  const f = files.find((x) => x.path === path);
  assert.ok(f, `expected output file "${path}" not found (got: ${files.map((x) => x.path).join(", ")})`);
  return f;
}

// Quote-aware CSV line splitter (mirrors datagen/src/csv.js's escaping:
// double-quote wraps a field containing a comma/quote/newline, "" is a
// literal quote). A naive `line.split(",")` breaks on real output like
// `"VP, Engineering"` in the people-roster fixture.
function splitCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

function csvRows(content) {
  const [header, ...lines] = content.trim().split("\n");
  const cols = splitCsvLine(header);
  return lines.map((line) => {
    const cells = splitCsvLine(line);
    return Object.fromEntries(cols.map((c, i) => [c, cells[i]]));
  });
}

test("CORE-02: invoice totals exactly $47,000 and carries the model narrative line verbatim", () => {
  const files = generateArtifact(specs.byId.get("CORE-02"), canon);
  const summary = JSON.parse(fileByPath(files, "invoice.json").content);
  assert.equal(summary.invoice_total, 47000);
  assert.equal(summary.page_count, 38);
  assert.match(summary.planted_features.model_narrative_line, /^JKS 03\/12 2\.4 hrs L510/);

  const ledes = fileByPath(files, "invoice.ledes.csv").content;
  assert.match(ledes, /^LEDES1998B\[\]/);
  assert.match(ledes, /JKS 03\/12 2\.4 hrs L510/);
  assert.match(ledes, /block-billed, not itemized by task/);
  const total = ledes
    .split("\n")
    .filter((l) => l.includes("|F|") || l.includes("|E|"))
    .reduce((sum, line) => sum + Number(line.split("|")[12]), 0);
  assert.equal(Math.round(total * 100) / 100, 47000);
});

test("CORE-03: three stale accounts owned by departed reps, one duplicate pair, one industry conflict, the co-102 Enterprise Renewal FY27 deal", () => {
  const files = generateArtifact(specs.byId.get("CORE-03"), canon);
  const accounts = csvRows(fileByPath(files, "accounts.csv").content);
  const opportunities = csvRows(fileByPath(files, "opportunities.csv").content);

  const stale = accounts.filter((a) => a.stale_flag === "true");
  assert.equal(stale.length, 3);

  const dupes = accounts.filter((a) => a.duplicate_of_account_id !== "");
  assert.equal(dupes.length, 1);

  const conflicted = accounts.filter((a) => a.industry === "" && a.industry_source_crm !== a.industry_source_marketing);
  assert.equal(conflicted.length, 1);

  const granitePeakDeal = opportunities.find((o) => o.opportunity_name === "Enterprise Renewal FY27");
  assert.ok(granitePeakDeal, "Enterprise Renewal FY27 opportunity not found");
  assert.equal(granitePeakDeal.account_id, "co-102");

  const blankNextStep = opportunities.filter((o) => o.next_step === "");
  assert.ok(blankNextStep.length >= 3, "expected several opportunities with a blank next_step");
});

test("CORE-04: 600 employees, obviously-fictional emails on the .example TLD, and exactly one planted SoD dual-role conflict", () => {
  const files = generateArtifact(specs.byId.get("CORE-04"), canon);
  const rows = csvRows(fileByPath(files, "people-roster.csv").content);
  assert.equal(rows.length, 600);
  assert.ok(rows.every((r) => r.email.endsWith("@co002.example")));

  const sodConflicts = rows.filter((r) => r.finance_system_role.includes(","));
  assert.equal(sodConflicts.length, 1);
  assert.match(sodConflicts[0].finance_system_role, /AP Clerk/);
  assert.match(sodConflicts[0].finance_system_role, /Payment Approver/);

  const departed = rows.filter((r) => r.employment_status === "departed");
  assert.ok(departed.length >= 3, "expected a departed cohort for CORE-03's stale-record feature");
});

test("LGL-07: 500,000 critical-risk threshold trips only on the high-value record, vendor sub-paths hit all three routing bands", () => {
  const files = generateArtifact(specs.byId.get("LGL-07"), canon);
  const bundle = JSON.parse(fileByPath(files, "records.json").content);
  assert.equal(bundle.critical_risk_auto_escalation_threshold_usd, 500000);

  const standard = bundle.records.find((r) => r.record_id === "LGL-07-STD-001");
  const highValue = bundle.records.find((r) => r.record_id === "LGL-07-HV-001");
  assert.equal(standard.matter_value_usd, 250000);
  assert.equal(standard.auto_escalated, false);
  assert.equal(highValue.matter_value_usd, 750000);
  assert.equal(highValue.auto_escalated, true);
  assert.equal(highValue.thread_reference, "LGL-12");

  const vendorRecords = bundle.records.filter((r) => r.record_type === "vendor_intake");
  const routes = new Set(vendorRecords.map((r) => r.routed_to));
  assert.deepEqual(routes, new Set(["self_service", "standard_review", "escalated_review"]));
});

test("LGL-11: FRCP 12(a)(1) deadline chain math and the 7-deadline trial-continuance cascade", () => {
  const files = generateArtifact(specs.byId.get("LGL-11"), canon);
  const record = JSON.parse(fileByPath(files, "matter.json").content);
  const dc = record.deadline_chain;
  // complaint served 2026-01-20 + 21 days = 2026-02-10, + 3-day mail ext = 2026-02-13 (a Friday, no rollover)
  assert.equal(dc.base_response_deadline, "2026-02-10");
  assert.equal(dc.response_deadline_with_mail_extension, "2026-02-13");
  assert.equal(dc.final_response_deadline, dc.response_deadline_with_mail_extension);

  const cascade = record.trial_continuance_cascade;
  assert.equal(cascade.dependent_deadline_count, 7);
  assert.equal(cascade.before.length, 7);
  assert.equal(cascade.after.length, 7);
  for (let i = 0; i < 7; i++) {
    assert.notEqual(cascade.before[i].date, cascade.after[i].date, `${cascade.before[i].name} did not recalculate`);
  }
});

test("LGL-18: 3-firm comparison table for co-111/co-112/co-113 and a 7-dimension balanced scorecard", () => {
  const files = generateArtifact(specs.byId.get("LGL-18"), canon);
  const comparison = csvRows(fileByPath(files, "comparison-table.csv").content);
  assert.equal(comparison.length, 3);
  assert.deepEqual(
    comparison.map((c) => c.firm_canon_id).sort(),
    ["co-111", "co-112", "co-113"]
  );
  const scorecard = csvRows(fileByPath(files, "balanced-scorecard.csv").content);
  assert.equal(scorecard.length, 7);
});

test("LGL-20: 3-year spend-by-category table and worked ROI examples", () => {
  const files = generateArtifact(specs.byId.get("LGL-20"), canon);
  const spend = csvRows(fileByPath(files, "spend-by-category.csv").content);
  const years = new Set(spend.map((r) => r.year));
  assert.deepEqual(years, new Set(["2024", "2025", "2026"]));
  const roi = csvRows(fileByPath(files, "roi-worked-examples.csv").content);
  assert.ok(roi.length >= 3);
  for (const row of roi) {
    assert.equal(Number(row.roi_ratio), Math.round((Number(row.expected_loss_avoided_usd) / Number(row.cost_usd)) * 100) / 100);
  }
});

test("LGL-21: 146-request demand log, P1-P4 SLA matrix, and the 83.8% ROI figure", () => {
  const files = generateArtifact(specs.byId.get("LGL-21"), canon);
  const demandLog = csvRows(fileByPath(files, "demand-log.csv").content);
  assert.equal(demandLog.length, 146);
  const categories = new Set(demandLog.map((r) => r.category));
  assert.equal(categories.size, 8);

  const bundle = JSON.parse(fileByPath(files, "portal-program.json").content);
  assert.equal(bundle.roi.cost_usd, 57000);
  assert.equal(bundle.roi.value_usd, 104738);
  assert.equal(bundle.roi.roi_pct, 83.8);
  assert.equal(bundle.sla_matrix.length, 4);
});

test("LGL-22: matter state machine states and the 3 hrs/matter/week, 35-hour capacity cap", () => {
  const files = generateArtifact(specs.byId.get("LGL-22"), canon);
  const matters = csvRows(fileByPath(files, "matter-portfolio.csv").content);
  const validStates = new Set(["intake", "triage", "assigned", "in_progress", "review", "closed"]);
  assert.ok(matters.every((m) => validStates.has(m.state)));

  const capacity = csvRows(fileByPath(files, "capacity-model.csv").content);
  for (const row of capacity) {
    assert.equal(row.hours_per_matter_per_week, "3");
    assert.equal(row.weekly_capacity_cap_hours, "35");
    assert.equal(row.weekly_hours_committed, String(Number(row.active_matter_count) * 3));
  }
});

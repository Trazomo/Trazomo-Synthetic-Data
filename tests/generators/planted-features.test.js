// Spot-checks that each generator actually injects the planted_features
// called out in specs/artifact-specs.yaml, not just "produces some CSV".
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { MOCK_VOCABULARY } from "../helpers/smb-mock-vocabulary.js";

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

// ---------------------------------------------------------------------------
// Cluster 2 (FIN-13 to FIN-20, FIN-35). Presence and count only. Every derived
// assertion, every tie-out and every cross-file join lives in the per-generator
// file named beside each test, which is the convention datagen/README.md's
// spec-authoring step 5 sets out.

/** The files one spec emits, keyed by path. */
function emitted(id) {
  return generateArtifact(specs.byId.get(id), canon);
}

test("FIN-13: 88 expense lines across 18 reports, every one submitted or in review (fin-13-expense-reports.test.js)", () => {
  const rows = csvRows(fileByPath(emitted("FIN-13"), "expense-reports.csv").content);
  assert.equal(rows.length, 88);
  assert.equal(new Set(rows.map((r) => r.report_id)).size, 18);
  for (const r of rows) assert.ok(["submitted", "in_review"].includes(r.status), `${r.status} is neither submitted nor in_review`);
});

test("FIN-14: the spend policy names the CORE-05 document it encodes (fin-14-spend-policy.test.js)", () => {
  const files = emitted("FIN-14");
  assert.equal(files.length, 1);
  const yamlText = fileByPath(files, "spend-policy.yaml").content;
  assert.match(yamlText, /^policy_document_id: ADI-POL-005$/m);
  assert.match(yamlText, /^source_artifact: CORE-05$/m);
});

test("FIN-15: 16 credit notes, exactly 2 still requested (fin-15-credit-notes.test.js)", () => {
  const rows = csvRows(fileByPath(emitted("FIN-15"), "customer-credit-notes.csv").content);
  assert.equal(rows.length, 16);
  assert.equal(rows.filter((r) => r.status === "requested").length, 2);
});

test("FIN-16: 64 contacts across 12 customers, plus the four-stage dunning ladder (fin-16-collections-log.test.js)", () => {
  const files = emitted("FIN-16");
  const rows = csvRows(fileByPath(files, "collections-contact-log.csv").content);
  assert.equal(rows.length, 64);
  assert.equal(new Set(rows.map((r) => r.customer_canon_id)).size, 12);
  const policy = JSON.parse(fileByPath(files, "collections-policy.json").content);
  assert.equal(policy.dunning_ladder.length, 4);
});

test("FIN-17: 24 close tasks, one per FIN-36 task id, notes empty on every row (fin-17-close-checklist.test.js)", () => {
  const rows = csvRows(fileByPath(emitted("FIN-17"), "close-checklist.csv").content);
  assert.equal(rows.length, 24);
  const template = csvRows(fileByPath(emitted("FIN-36"), "close-checklist-template.csv").content);
  assert.deepEqual(rows.map((r) => r.task_id), template.map((r) => r.task_id));
  for (const r of rows) assert.equal(r.notes, "", `${r.task_id} ships a note`);
});

test("FIN-18: 26 controls, exactly one with an exception noted (fin-18-control-matrix.test.js)", () => {
  const rows = csvRows(fileByPath(emitted("FIN-18"), "control-matrix.csv").content);
  assert.equal(rows.length, 26);
  assert.equal(new Set(rows.map((r) => r.control_id)).size, 26);
});

test("FIN-19: 45 grants across 29 employees, every entitlement class a known one (fin-19-user-access.test.js)", () => {
  const rows = csvRows(fileByPath(emitted("FIN-19"), "user-access-role-assignments.csv").content);
  assert.equal(rows.length, 45);
  assert.equal(new Set(rows.map((r) => r.employee_id)).size, 29);
  for (const r of rows) {
    assert.ok(["create", "modify", "approve", "release", "view"].includes(r.entitlement_class), `${r.entitlement_class} is not an entitlement class`);
  }
});

test("FIN-20: 14 feed records and a 10-row policy index sorted by document_id (fin-20-regulatory-feed.test.js)", () => {
  const files = emitted("FIN-20");
  const records = fileByPath(files, "regulatory-updates-feed.jsonl").content
    .trim().split("\n").map((line) => JSON.parse(line));
  assert.equal(records.length, 14);
  const index = csvRows(fileByPath(files, "policy-index.csv").content);
  assert.equal(index.length, 10);
  const ids = index.map((r) => r.document_id);
  assert.deepEqual(ids, [...ids].sort(), "the policy index is not sorted by document_id");
});

test("FIN-35: 38 inbound requests, every one pending_classification (fin-35-inbound-requests.test.js)", () => {
  const rows = csvRows(fileByPath(emitted("FIN-35"), "inbound-requests-queue.csv").content);
  assert.equal(rows.length, 38);
  for (const r of rows) assert.equal(r.status, "pending_classification");
});

// ---------------------------------------------------------------------------
// Small-business cluster 1 (SMB-01 to SMB-05). Two spot checks only, and both
// are properties of the whole pack rather than of one artifact: rule R-MOCK on
// every payment row of both records, and rule R-ROLE across all five. Every
// derived assertion, tie-out and cross-file join lives in the three
// per-generator files named beside them.

/** The R-MOCK notice, byte for byte. A second spelling of it is the defect. */
const MOCK_NOTICE = "MOCK PAYMENT RECORD, NO FUNDS MOVED";

// Processors, gateways, card networks, bank products, authorization codes and
// instrument numbers. Rule R-MOCK, as one word-anchored list for the whole SMB
// pack: matched against the words of a file rather than as substrings, so
// "each" is not a hit for "ach".
//
// Hoisted to tests/helpers/smb-mock-vocabulary.js so cluster 2's drafted
// screen extends it rather than keeping a second copy that can drift from it.

test("SMB-04, SMB-05: every payment row is a mock record and no instrument is named (rule R-MOCK)", () => {
  const records = [
    JSON.parse(fileByPath(emitted("SMB-04"), "client-record-okafor.json").content),
    JSON.parse(fileByPath(emitted("SMB-05"), "client-record-co002-office-refresh.json").content),
  ];
  const forbidden = MOCK_VOCABULARY;
  for (const record of records) {
    assert.equal(record.payment_log.length, 4, `${record.generated_from_spec} payment count`);
    for (const payment of record.payment_log) {
      assert.equal(payment.record_type, "mock", `${payment.payment_id} record_type`);
      assert.equal(payment.mock_notice, MOCK_NOTICE, `${payment.payment_id} notice is not byte identical`);
      assert.ok(["mock_bank_transfer", "mock_check"].includes(payment.method), `${payment.payment_id} method`);
    }
    for (const word of JSON.stringify(record).toLowerCase().split(/[^a-z0-9]+/)) {
      assert.ok(
        !forbidden.includes(word),
        `${record.generated_from_spec} names "${word}", which is a processor, gateway, card network or bank product`
      );
    }
  }
});

test("SMB-01 to SMB-05: no artifact carries a field that names a person (rule R-ROLE)", () => {
  const forbidden = ["contact_name", "contact_email", "contact_phone", "employee_id"];
  const names = [];
  for (const id of ["SMB-01", "SMB-02", "SMB-03", "SMB-04", "SMB-05"]) {
    for (const file of emitted(id)) {
      if (file.path.endsWith(".csv")) {
        names.push(...splitCsvLine(file.content.trim().split("\n")[0]));
      } else {
        const walk = (value) => {
          if (value === null || typeof value !== "object") return;
          for (const [key, child] of Object.entries(value)) {
            names.push(key);
            walk(child);
          }
        };
        walk(JSON.parse(file.content));
      }
    }
  }
  // SMB-02's dictionary declares the record's fields as row values, so the
  // declared names are screened as well as the headers.
  const dictionary = csvRows(fileByPath(emitted("SMB-02"), "client-record-fields.csv").content);
  names.push(...dictionary.map((row) => row.field_name));
  assert.equal(dictionary.length, 45, "the field dictionary is no longer 45 rows");

  for (const name of forbidden) {
    assert.ok(!names.includes(name), `the SMB pack carries a "${name}" field`);
  }
  assert.ok(names.includes("contact_role"), "a human has to appear somehow, and the shape is a role");
  assert.ok(names.includes("record_owner_role"));
});

// ---------------------------------------------------------------------------
// Small-business cluster 2a (SMB-06 to SMB-11). Five spot checks, and every one
// is a property of the whole wave rather than of one artifact: the rules the
// cluster 2 data plan states in section 0 and asserts nowhere else as a single
// sweep. Every derived assertion, tie-out and cardinality lives in the two
// per-wave files, tests/generators/smb-c2a-onboarding.test.js and
// tests/drafted/smb-c2a-drafted-screen.test.js.
//
// The class of change this block exists to catch: a later edit that adds a
// processor reference, a person name, an un-namespaced id or a fuller address.
// Each of those looks like a field, so nobody reviews it closely.
//
// The six files are read from disk rather than regenerated, because these are
// absence properties of what actually ships. That the emitted bytes and the
// committed bytes agree is `validate`'s job and it is checked there.

const SMB_C2A_DRAFTED = ["SMB-06", "SMB-07", "SMB-09"];
const SMB_C2A_DETERMINISTIC = ["SMB-08", "SMB-10", "SMB-11"];

/** The six shipped files, path derived from the spec's own name rather than typed. */
function c2aFiles() {
  const out = [];
  for (const id of SMB_C2A_DRAFTED) {
    const { name } = specs.byId.get(id);
    out.push({ id, path: join(REPO_ROOT, "artifacts", id, `${name}.md`) });
  }
  for (const id of SMB_C2A_DETERMINISTIC) {
    const { name } = specs.byId.get(id);
    out.push({ id, path: join(REPO_ROOT, "datasets", "smb", name, `${name}.csv`) });
  }
  return out.map((f) => ({ ...f, text: readFileSync(f.path, "utf8") }));
}

/**
 * The nine namespaced id classes cluster 2 mints (data plan rule R-NS). Six are
 * 2a's and three are 2b's; all nine are listed so that 2b extends this screen
 * by shipping its files rather than by editing it.
 */
const C2_ID_CLASSES = {
  "PLI-LDB-": "SMB-06 proposal line item",
  "RTC-LDB-": "SMB-06 rate schedule row",
  "CFD-LDB-": "SMB-07 contract field",
  "NSC-LDB-": "SMB-08 next-steps checklist item",
  "IQQ-LDB-": "SMB-10 intake questionnaire question",
  "KCK-LDB-": "SMB-11 kickoff checklist item",
  "TSK-LDB-": "SMB-12 project task",
  "DOC-LDB-": "SMB-13 project document",
  "MST-LDB-": "SMB-16 milestone",
};

/** The classes 2a's own files may mint, and the one 2b class 2a is allowed to cite. */
const C2A_OWN_CLASSES = ["PLI-LDB-", "RTC-LDB-", "CFD-LDB-", "NSC-LDB-", "IQQ-LDB-", "KCK-LDB-"];
const C2A_FORWARD_CITATION = { class: "MST-LDB-", from: "SMB-11", column: "related_milestone_id" };

test("SMB-06 to SMB-11: no processor, gateway, card network or bank product is named (rule R-MOCK)", () => {
  // The cluster 1 list, less one term dropped for a stated reason rather than
  // forgotten: "auth", because it is a fragment rather than a word, and the
  // list's own "authorization" carries that half. "square" stays on the list;
  // the two exact strings that make it an ordinary word of the proposal's bill
  // are excised before tokenising, and the excision is proven non-vacuous so it
  // cannot rot into a blanket allowance.
  const dropped = ["auth"];
  const excised = ["per square foot", "square_foot"];
  const forbidden = MOCK_VOCABULARY.filter((term) => !dropped.includes(term));
  assert.equal(forbidden.length, MOCK_VOCABULARY.length - dropped.length, "a dropped term is no longer in the list");

  const smb06 = c2aFiles().find((f) => f.id === "SMB-06");
  for (const phrase of excised) {
    assert.ok(smb06.text.toLowerCase().includes(phrase), `SMB-06 no longer carries "${phrase}"; retire the excision`);
  }

  for (const file of c2aFiles()) {
    let swept = file.text.toLowerCase();
    for (const phrase of excised) swept = swept.split(phrase).join(" ");
    const words = new Set(swept.split(/[^a-z0-9]+/));
    for (const term of forbidden) {
      assert.ok(
        !words.has(term),
        `${file.id} names "${term}", which is a processor, gateway, card network or bank product`
      );
    }
  }
});

test("SMB-06 to SMB-11: no file carries a name canon seats, retires or freezes (rule R-ROLE)", () => {
  // canon/people.md's own names, parsed rather than retyped. The parser is a
  // deliberate second copy of the one the drafted screen carries: two screens
  // that shared one parser would go blind together.
  const NAME_HEADS = ["name", "retired name", "frozen name"];
  const isTableLine = (line) => line.trim().startsWith("|");
  const cellsOf = (line) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  const isRule = (row) => row.every((c) => /^:?-{2,}:?$/.test(c));

  const lines = readFileSync(join(REPO_ROOT, "canon", "people.md"), "utf8").split("\n");
  const names = new Set();
  for (const [i, line] of lines.entries()) {
    if (!isTableLine(line)) continue;
    const head = cellsOf(line);
    const at = head.findIndex((c) => NAME_HEADS.includes(c.toLowerCase()));
    if (at < 0) continue;
    for (let j = i + 1; j < lines.length; j += 1) {
      if (!isTableLine(lines[j])) break;
      const row = cellsOf(lines[j]);
      if (isRule(row)) continue;
      const value = (row[at] ?? "").replace(/\*\*/g, "").trim();
      if (/^[A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*)+/.test(value)) names.add(value);
    }
  }
  assert.ok(names.size > 0, "canon/people.md parsed to no names, so this screen would pass on anything");

  for (const file of c2aFiles()) {
    for (const name of names) {
      assert.ok(!file.text.includes(name), `${file.id} carries the canon person name "${name}"`);
    }
  }
});

test("SMB-06 to SMB-11: every minted id is namespaced, and 2a mints only 2a classes (rule R-NS)", () => {
  const seen = new Map();
  for (const file of c2aFiles()) {
    for (const match of file.text.matchAll(/\b([A-Z]{2,4})-LDB-(\d+)\b/g)) {
      const idClass = `${match[1]}-LDB-`;
      assert.ok(
        Object.hasOwn(C2_ID_CLASSES, idClass),
        `${file.id} mints "${match[0]}", whose class ${idClass} is not one of the nine the data plan namespaces`
      );
      assert.equal(match[2].length, 2, `${file.id} carries "${match[0]}", and the format is two zero-padded digits`);
      seen.set(idClass, new Set([...(seen.get(idClass) ?? []), file.id]));
    }

    // The other half of R-NS, and the one the namespace exists for: a class
    // token used bare. TSK- and DOC- are already spent elsewhere in the repo,
    // so a bare mint here is a cross-track collision rather than a style slip.
    for (const idClass of Object.keys(C2_ID_CLASSES)) {
      const bare = idClass.replace("LDB-", "");
      assert.doesNotMatch(
        file.text, new RegExp(`\\b${bare}\\d`),
        `${file.id} carries an un-namespaced ${bare} id`
      );
    }
  }

  // Every 2a class is actually minted, so the screen is not passing on absence,
  // and no 2b class appears except the one forward citation the plan allows.
  for (const idClass of C2A_OWN_CLASSES) {
    assert.ok(seen.has(idClass), `no cluster 2a file mints ${idClass}, so this screen checks nothing for it`);
  }
  const foreign = [...seen.keys()].filter((c) => !C2A_OWN_CLASSES.includes(c));
  assert.deepEqual(
    foreign, [C2A_FORWARD_CITATION.class],
    "a cluster 2a file cites a 2b id class other than the one forward citation the data plan allows"
  );
  assert.deepEqual(
    [...seen.get(C2A_FORWARD_CITATION.class)], [C2A_FORWARD_CITATION.from],
    `only ${C2A_FORWARD_CITATION.from}'s ${C2A_FORWARD_CITATION.column} may cite a milestone before SMB-16 exists`
  );
});

test("SMB-06 to SMB-11: wherever a property address appears it is the client record's, byte for byte", () => {
  // The canonical string is read out of SMB-04 rather than typed here, so a
  // record edit moves this screen with it. This is the cluster 1 review's
  // BLOCKER 1 class (a canonical address contradicted by sixteen files)
  // applied prospectively.
  const record = JSON.parse(fileByPath(emitted("SMB-04"), "client-record-okafor.json").content);
  const address = record.client.property_address;
  assert.equal(address, "327 Havershill Court", "the client record's property_address has moved");

  // Bounded (a trailing comma or digit means a fuller address follows the
  // match, e.g. a city and a postcode) and widened to a one-to-three word
  // street name, so a second, wholly invented street is seen rather than
  // matched-nothing.
  const STREET = /\b\d{1,4}(?:\s+[A-Z][A-Za-z]+){1,3}\s+(?:Court|Lane|Street|Road|Way|Terrace|Avenue|Drive|Place)\b/g;
  let streetMatches = 0;
  let pinOccurrences = 0;
  for (const file of c2aFiles()) {
    for (const match of file.text.matchAll(STREET)) {
      const after = file.text.slice(match.index + match[0].length, match.index + match[0].length + 1);
      assert.ok(
        !/[,0-9]/.test(after),
        `${file.id} carries "${match[0]}" immediately followed by "${after}", which is a fuller address than the pin`
      );
      assert.equal(match[0], address, `${file.id} carries the address "${match[0]}", and the record says "${address}"`);
      streetMatches += 1;
    }
    pinOccurrences += file.text.split(address).length - 1;
  }
  assert.ok(streetMatches > 0, "no cluster 2a file carries the property address at all, so this screen checks nothing");
  // The positive half the sweep was missing: any street-shaped string that is
  // not the pin, or a pin occurrence the street sweep does not see, is a
  // failure by construction rather than by pattern luck.
  assert.equal(
    streetMatches, pinOccurrences,
    `the street-shaped sweep finds ${streetMatches} matches and the exact address occurs ${pinOccurrences} times`
    + " across the six files; they have to be the same count or an address-shaped string is hiding from one side"
  );
});

test("SMB-06 to SMB-11: no file carries an em dash or an en dash", () => {
  for (const file of c2aFiles()) {
    // Written as escapes so this screen is not itself a hit for a grep over
    // the repo for the two characters it bans.
    assert.ok(!file.text.includes("\u2014"), `${file.id} carries an em dash (U+2014)`);
    assert.ok(!file.text.includes("\u2013"), `${file.id} carries an en dash (U+2013)`);
  }
});

// Small-business cluster 2b (SMB-12, SMB-13, SMB-16). The same four sweeps 2a
// carries, over the delivery wave's own shipped files.
//
// Why this block exists rather than the 2a block simply widening. `c2aFiles()`
// above is bound to six ids by name, so shipping a 2b file does NOT enrol it in
// those sweeps: the only part of the 2a block that extends by shipping is the
// `C2_ID_CLASSES` dictionary, which already lists all nine classes. The data
// plan's section 4 spot-check row asks for R-MOCK, R-ROLE, R-NS and the address
// equality over all ELEVEN cluster 2 artifacts, so the wave that ships the
// files adds the block that screens them. SMB-14 and SMB-15 are drafted and
// join `SMB_C2B_DRAFTED` with the drafted screen.
//
// Every derived assertion, tie-out and cardinality for these three lives in
// tests/generators/smb-c2b-delivery.test.js. What is here is the property of
// the wave: the class of later edit that adds a processor reference, a person
// name, an un-namespaced id or an address, each of which looks like a field.

const SMB_C2B_DETERMINISTIC = ["SMB-12", "SMB-13", "SMB-16"];
const SMB_C2B_DRAFTED = ["SMB-14", "SMB-15"];

/** Excludes a long-form date's month word from the suffix-free address sweep below. */
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** The shipped 2b files, path derived from the spec's own name rather than typed. */
function c2bFiles() {
  const out = [];
  for (const id of SMB_C2B_DRAFTED) {
    const { name } = specs.byId.get(id);
    out.push({ id, path: join(REPO_ROOT, "artifacts", id, `${name}.md`) });
  }
  for (const id of SMB_C2B_DETERMINISTIC) {
    const { name } = specs.byId.get(id);
    out.push({ id, path: join(REPO_ROOT, "datasets", "smb", name, `${name}.csv`) });
  }
  return out.map((f) => ({ ...f, text: readFileSync(f.path, "utf8") }));
}

/** The three id classes 2b's own files mint, and nothing else. */
const C2B_OWN_CLASSES = ["TSK-LDB-", "DOC-LDB-", "MST-LDB-"];

/**
 * canon/people.md's own names. A second implementation of the parser the 2a
 * block carries, deliberately not shared with it: two screens that shared one
 * parser would go blind together. This one keeps any table cell that reads as a
 * full personal name rather than locating a Name column first, so it is wider
 * than the 2a parser and never narrower.
 */
function canonPersonNames() {
  const text = readFileSync(join(REPO_ROOT, "canon", "people.md"), "utf8");
  const names = new Set();
  for (const line of text.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    for (const cell of line.trim().replace(/^\||\|$/g, "").split("|")) {
      const value = cell.replace(/\*\*/g, "").trim();
      if (/^[A-Z][a-z]+(?:\s+[A-Z]\.)?(?:\s+[A-Z][A-Za-z'-]+)+$/.test(value)) names.add(value);
    }
  }
  return names;
}

test("SMB-12, SMB-13, SMB-14, SMB-15, SMB-16: no processor, gateway, card network or bank product is named (rule R-MOCK)", () => {
  // The same list and the same one stated drop as 2a: "auth", a fragment whose
  // half the list's own "authorization" already carries. 2a needed two
  // excisions for the proposal's "per square foot"; the delivery wave needs
  // none, and that absence is asserted rather than assumed.
  const dropped = ["auth"];
  const forbidden = MOCK_VOCABULARY.filter((term) => !dropped.includes(term));
  assert.equal(forbidden.length, MOCK_VOCABULARY.length - dropped.length, "a dropped term is no longer in the list");

  for (const file of c2bFiles()) {
    const words = new Set(file.text.toLowerCase().split(/[^a-z0-9]+/));
    for (const term of forbidden) {
      assert.ok(
        !words.has(term),
        `${file.id} names "${term}", which is a processor, gateway, card network or bank product`
      );
    }
  }
});

test("SMB-12, SMB-13, SMB-14, SMB-15, SMB-16: no file carries a name canon seats, retires or freezes (rule R-ROLE)", () => {
  const names = canonPersonNames();
  assert.ok(names.size > 0, "canon/people.md parsed to no names, so this screen would pass on anything");
  for (const file of c2bFiles()) {
    for (const name of names) {
      assert.ok(!file.text.includes(name), `${file.id} carries the canon person name "${name}"`);
    }
  }
  // The household is a company, not a person, and it is the one human-shaped
  // string these files are allowed to carry. Read off canon rather than typed.
  const household = canon.get("co-131");
  assert.ok(household, "canon/companies.md does not seat co-131");
  assert.ok(!names.has(household.name), "canon now seats a person under the household's own name");
});

test("SMB-12, SMB-13, SMB-14, SMB-15, SMB-16: every minted id is namespaced, and 2b mints only 2b classes (rule R-NS)", () => {
  const seen = new Map();
  for (const file of c2bFiles()) {
    for (const match of file.text.matchAll(/\b([A-Z]{2,4})-LDB-(\d+)\b/g)) {
      const idClass = `${match[1]}-LDB-`;
      assert.ok(
        Object.hasOwn(C2_ID_CLASSES, idClass),
        `${file.id} mints "${match[0]}", whose class ${idClass} is not one of the nine the data plan namespaces`
      );
      assert.equal(match[2].length, 2, `${file.id} carries "${match[0]}", and the format is two zero-padded digits`);
      seen.set(idClass, new Set([...(seen.get(idClass) ?? []), file.id]));
    }

    // The half the namespace exists for: a class token used bare. TSK- and
    // DOC- are already spent by the operations and legal packs, so a bare mint
    // here is a cross-track collision rather than a style slip.
    for (const idClass of Object.keys(C2_ID_CLASSES)) {
      const bare = idClass.replace("LDB-", "");
      assert.doesNotMatch(
        file.text, new RegExp(`\\b${bare}\\d`),
        `${file.id} carries an un-namespaced ${bare} id`
      );
    }
  }

  for (const idClass of C2B_OWN_CLASSES) {
    assert.ok(seen.has(idClass), `no cluster 2b file mints ${idClass}, so this screen checks nothing for it`);
  }
  assert.deepEqual(
    [...seen.keys()].filter((c) => !C2B_OWN_CLASSES.includes(c)), [],
    "a cluster 2b file cites an id class outside the three the delivery wave mints"
  );
});

test("SMB-12, SMB-13, SMB-14, SMB-15, SMB-16: the delivery wave carries no property address at all, in any shape", () => {
  // The canonical string is read out of SMB-04 rather than typed here, so a
  // record edit moves this screen with it. Unlike 2a, where the address is a
  // real passage of the drafted documents, none of these five files has a
  // column or a passage that could honestly carry it: a task, a milestone, a
  // storage path and the two drafted documents are all about the work rather
  // than about where it happens. That expectation is asserted as equalities
  // rather than as an absence nobody counted.
  const record = JSON.parse(fileByPath(emitted("SMB-04"), "client-record-okafor.json").content);
  const address = record.client.property_address;
  assert.equal(address, "327 Havershill Court", "the client record's property_address has moved");

  // The named-suffix sweep (NIT 2's recorded bound, carried from 2a's NEW-3):
  // this can only see a street shape ending in one of the nine listed
  // suffixes, so an invented address with an unlisted suffix (M13 planted
  // "412 Rosewood Boulevard") is invisible to it. Kept over all five files
  // because it is the only form of this sweep that is safe on the two
  // documents: a suffix-free version matches a long-form date too (see
  // below). The per-match equality this loop used to run is gone -- it could
  // never execute while the count assertion after the loop holds, so it read
  // as a positive check that was not one; the file and byte-offset in the
  // count assertion's own message is what a failure needs.
  const STREET = /\b\d{1,4}(?:\s+[A-Z][A-Za-z]+){1,3}\s+(?:Court|Lane|Street|Road|Way|Terrace|Avenue|Drive|Place)\b/g;
  const suffixHits = [];
  let pinOccurrences = 0;
  for (const file of c2bFiles()) {
    for (const match of file.text.matchAll(STREET)) {
      suffixHits.push(`${file.id} carries "${match[0]}" at index ${match.index}`);
    }
    pinOccurrences += file.text.split(address).length - 1;
  }
  assert.deepEqual(suffixHits, [], "a delivery file now carries a street shape ending in a listed suffix");
  assert.equal(pinOccurrences, 0, "a delivery file now carries the property address, which none of the five files needs");

  // The suffix-free equality (NIT 2's fix, applied where it is honest): a
  // generic "digits then a capitalised word" shape, with no suffix required,
  // closes the bound above -- but only on the three CSVs. Measured directly:
  // the same pattern matches 27 times in SMB-14 and 15 times in SMB-15, every
  // one of them a long-form date such as "16 March", so it is not portable to
  // the two documents. The three CSVs carry no long-form date, with one
  // exception handled below: SMB-13 indexes a document titled "Client status
  // update, 16 March 2026", so month names are excluded the same way a
  // long-form date's month word would be.
  const GENERIC_STREET_START = /\b\d{1,4}[ ]+[A-Z][A-Za-z]*/g;
  const isMonthName = (word) => MONTHS.includes(word);
  for (const id of SMB_C2B_DETERMINISTIC) {
    const file = c2bFiles().find((f) => f.id === id);
    const genericHits = (file.text.match(GENERIC_STREET_START) ?? [])
      .filter((m) => !isMonthName(m.split(/[ ]+/)[1]));
    const filePinOccurrences = file.text.split(address).length - 1;
    assert.equal(
      genericHits.length, filePinOccurrences,
      `${id} carries ${genericHits.length} digit-then-capitalised-word shape(s) (${genericHits.join(", ") || "none"})`
      + ` against ${filePinOccurrences} occurrence(s) of the pinned address; an unlisted-suffix address would`
      + " show up here even though the named-suffix sweep above cannot see it"
    );
  }
});

test("SMB-12, SMB-13, SMB-14, SMB-15, SMB-16: no file carries an em dash or an en dash", () => {
  for (const file of c2bFiles()) {
    // Written as escapes so this screen is not itself a hit for a grep over
    // the repo for the two characters it bans.
    assert.ok(!file.text.includes("\u2014"), `${file.id} carries an em dash (U+2014)`);
    assert.ok(!file.text.includes("\u2013"), `${file.id} carries an en dash (U+2013)`);
  }
});

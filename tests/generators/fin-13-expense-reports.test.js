// FIN-13 expense-reports: the March 2026 expense population module 17 reviews
// against the FIN-14 spend policy.
//
// Every assertion here is structural. It counts shapes, recomputes each plant
// from the file's own columns using the thresholds read out of the shipped
// spend-policy.yaml, and joins to CORE-04 and FIN-22 by rule. It never names a
// report id, an employee or an amount: those live only in private trazomo
// content keyed to the data-pack tag (answer-key rule, datagen/README.md).
//
// The plants are asserted by cardinality rather than by identity on purpose. A
// reroll that turns the over-limit meal into a business meal, or that drops the
// missing-receipt declaration, collapses a finding into its own lookalike, and
// a test that named the row would keep passing while the exercise died.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import yaml from "js-yaml";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies, companyName } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { financeRoster } from "../../datagen/src/generators/finance-roles.js";
import { buildChartOfAccounts } from "../../datagen/src/generators/fin-22-chart-of-accounts.js";
import { CANON_VENDORS, NEUTRAL_VENDORS } from "../../datagen/src/generators/fin-01-cash-recon.js";
import { diffDays, isWeekend } from "../../datagen/src/dates.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
const spec = specs.byId.get("FIN-13");

// The policy as the module reads it: generated, parsed, never retyped here.
const policy = yaml.load(
  generateArtifact(specs.byId.get("FIN-14"), canon).find((f) => f.path === "spend-policy.yaml").content
);

function splitCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i += 1; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { cells.push(cur); cur = ""; }
    else cur += ch;
  }
  cells.push(cur);
  return cells;
}

function csvTable(content) {
  const [header, ...lines] = content.trim().split("\n");
  const cols = splitCsvLine(header);
  return { cols, rows: lines.map((line) => Object.fromEntries(cols.map((c, i) => [c, splitCsvLine(line)[i]]))) };
}

const toCents = (s) => Math.round(Number(s) * 100);
const usdCents = (n) => Math.round(n * 100);

const files = generateArtifact(spec, canon);
const expenseFile = files.find((f) => f.path === "expense-reports.csv");
assert.ok(expenseFile, `expected expense-reports.csv (got: ${files.map((f) => f.path).join(", ")})`);
const { cols, rows } = csvTable(expenseFile.content);

const roster = new Map(financeRoster().map((r) => [r.employee_id, r]));
const accounts = new Map(buildChartOfAccounts().map((a) => [a.account_code, a]));

// The sixteen screened names: the five canon vendors, the CORE-01 SaaS
// counterparty, and the ten neutral names FIN-01 screened. Assembled here from
// the same sources the rest of the universe draws on, so a name that entered
// FIN-13 without passing that screen has nowhere to hide.
const SCREENED_MERCHANTS = new Set([
  companyName(canon, "co-101"),
  ...CANON_VENDORS.map((v) => v.name),
  ...NEUTRAL_VENDORS,
]);

const reports = new Map();
for (const row of rows) {
  if (!reports.has(row.report_id)) reports.set(row.report_id, []);
  reports.get(row.report_id).push(row);
}

test("FIN-13: header equals the spec columns, and the file lands in the target size range", () => {
  assert.equal(files.length, 1);
  assert.deepEqual(cols, spec.columns);
  assert.ok(rows.length >= 80 && rows.length <= 96, `88 target lines, got ${rows.length}`);
  assert.ok(reports.size >= 16 && reports.size <= 20, `18 target reports, got ${reports.size}`);
  assert.equal(SCREENED_MERCHANTS.size, 16, "the screened merchant list is sixteen names");
});

test("FIN-13: report grain -- ids ascend, lines are contiguous inside a report, nothing is posted", () => {
  const seen = [];
  let previousReport = null;
  for (const row of rows) {
    assert.match(row.report_id, /^EXP-2026-0\d{3}$/);
    if (row.report_id !== previousReport) {
      assert.ok(!seen.includes(row.report_id), `${row.report_id} is split across the file`);
      seen.push(row.report_id);
      previousReport = row.report_id;
    }
    assert.equal(row.currency, "USD");
    assert.ok(["submitted", "in_review"].includes(row.status), `status "${row.status}" is posted or unknown`);
  }
  assert.deepEqual(seen, [...seen].sort(), "report ids do not ascend through the file");

  for (const [reportId, lines] of reports) {
    assert.deepEqual(
      lines.map((l) => l.line_no),
      lines.map((_, i) => String(i + 1)),
      `${reportId}: line_no does not run 1..n`
    );
    // A report is one submission by one person against one approver.
    for (const field of ["employee_id", "employee_department", "approver_employee_id",
      "report_submitted_date", "report_total", "status", "city_tier"]) {
      assert.equal(new Set(lines.map((l) => l[field])).size, 1, `${reportId}: ${field} varies inside one report`);
    }
  }
});

test("FIN-13 T-G2: report_total is the report's own line sum, repeated on every line, to the cent", () => {
  for (const [reportId, lines] of reports) {
    const sum = lines.reduce((acc, l) => acc + toCents(l.amount), 0);
    assert.equal(toCents(lines[0].report_total), sum, `${reportId}: report_total is not the line sum`);
    assert.ok(sum > 0);
  }
});

test("FIN-13 T-G3: the approver is the submitter's CORE-04 manager and never the submitter", () => {
  for (const row of rows) {
    const employee = roster.get(row.employee_id);
    assert.ok(employee, `${row.employee_id} is not on the CORE-04 roster`);
    assert.equal(employee.employment_status, "active");
    assert.equal(row.employee_department, employee.department);
    assert.equal(row.approver_employee_id, employee.manager_employee_id, "approver is not the reporting manager");
    assert.notEqual(row.approver_employee_id, row.employee_id, "self approval is prohibited by the policy");
    const approver = roster.get(row.approver_employee_id);
    assert.ok(approver, `approver ${row.approver_employee_id} is not on the roster`);
    assert.equal(approver.employment_status, "active");
  }
  assert.equal(policy.self_approval_prohibited, true);
});

test("FIN-13 T-G4: every report total falls in one FIN-14 band, and the approver satisfies it", () => {
  const bands = policy.report_approval_bands;
  for (const [reportId, lines] of reports) {
    const total = toCents(lines[0].report_total);
    const matching = bands.filter((b) =>
      total >= usdCents(b.min_usd) && (b.max_usd === null || total <= usdCents(b.max_usd)));
    assert.equal(matching.length, 1, `${reportId}: falls in ${matching.length} approval bands`);
    const [band] = matching;
    assert.equal(band.approvers.length, 1,
      `${reportId}: lands in a band needing ${band.approvers.length} approvers, and the file has one approver column`);
    const [approverRole] = band.approvers;
    if (approverRole !== "manager") {
      const approver = roster.get(lines[0].approver_employee_id);
      assert.equal(approver.role_title, policy.role_map[approverRole],
        `${reportId}: the band calls for a ${approverRole} and the approver is not one`);
    }
  }
  // The bands are a ladder, not a formality: at least one report has to climb
  // past the first rung or the join is never exercised.
  const totals = [...reports.values()].map((lines) => toCents(lines[0].report_total));
  assert.ok(
    totals.some((t) => t > usdCents(bands[0].max_usd)),
    "every report sits in the first band, so the approval ladder is never tested"
  );
});

test("FIN-13 T-G5: every gl_account is an active FIN-22 expense code, coded consistently", () => {
  const byExpenseType = new Map();
  for (const row of rows) {
    const account = accounts.get(row.gl_account);
    assert.ok(account, `${row.gl_account} is not on the FIN-22 chart`);
    assert.equal(account.active, "true", `${row.gl_account} is not an active account`);
    assert.equal(account.type, "expense", `${row.gl_account} is not an expense account`);
    const key = `${row.expense_type}|${row.merchant_category}`;
    if (!byExpenseType.has(key)) byExpenseType.set(key, row.gl_account);
    assert.equal(byExpenseType.get(key), row.gl_account,
      `${key} is coded to two different accounts, which is a miscoding this file does not plant`);
  }
  // Travel and entertainment is one account, and the travel expense types all
  // land in it: a T&E line coded anywhere else would be the finding.
  const travelTypes = ["airfare", "lodging", "meal", "ground_transport", "parking"];
  const travelAccounts = new Set(rows.filter((r) => travelTypes.includes(r.expense_type)).map((r) => r.gl_account));
  assert.equal(travelAccounts.size, 1);
  assert.equal(accounts.get([...travelAccounts][0]).subtype, "travel");
});

test("FIN-13: merchants come only from the screened names, and are empty exactly where a card feed carries none", () => {
  const MERCHANTLESS_CATEGORIES = new Set(["per_diem", "toll", "parking_fine"]);
  const categoryOf = new Map();
  for (const row of rows) {
    if (row.merchant === "") {
      assert.ok(
        MERCHANTLESS_CATEGORIES.has(row.merchant_category),
        `an empty merchant on category "${row.merchant_category}", which is not a per diem, a toll or a fine`
      );
      continue;
    }
    assert.ok(SCREENED_MERCHANTS.has(row.merchant), `"${row.merchant}" is not a screened name`);
    assert.ok(!MERCHANTLESS_CATEGORIES.has(row.merchant_category));
    // A card feed carries one category per merchant.
    if (!categoryOf.has(row.merchant)) categoryOf.set(row.merchant, row.merchant_category);
    assert.equal(categoryOf.get(row.merchant), row.merchant_category,
      `${row.merchant} appears under two categories`);
  }
  for (const row of rows) {
    if (row.claim_type === "per_diem") {
      assert.equal(row.expense_type, "meal", "only a meal can be claimed as a per diem");
      assert.equal(row.merchant, "", "a per diem has no merchant");
      assert.ok(
        toCents(row.amount) < usdCents(policy.receipt_required_at_or_above),
        "a per diem at or above the receipt threshold would need a receipt it can never have"
      );
    } else {
      assert.equal(row.claim_type, "actual");
    }
  }
  // The meal election is made for the trip, so a report never mixes the two.
  for (const [reportId, lines] of reports) {
    const elections = new Set(lines.filter((l) => l.expense_type === "meal").map((l) => l.claim_type));
    assert.ok(elections.size <= 1, `${reportId}: mixes per diem and actual meal claims`);
  }
});

test("FIN-13: dates sit in the period, and every report is submitted inside the FIN-14 window", () => {
  const { start, end } = spec.period;
  for (const [reportId, lines] of reports) {
    const submitted = lines[0].report_submitted_date;
    const latest = lines.map((l) => l.expense_date).sort().at(-1);
    for (const line of lines) {
      assert.ok(line.expense_date >= start && line.expense_date <= end,
        `${reportId}: ${line.expense_date} falls outside the spec period`);
    }
    assert.ok(submitted > latest, `${reportId}: submitted before the last expense was incurred`);
    assert.ok(
      diffDays(latest, submitted) <= policy.submission_window_days,
      `${reportId}: submitted outside the policy window`
    );
    assert.ok(
      diffDays(latest, submitted) < policy.late_submission_escalation_days,
      `${reportId}: late enough to need the top escalation, which this file does not plant`
    );
  }
});

test("FIN-13: attendee columns are consistent, and lodging never exceeds its nightly cap", () => {
  for (const row of rows) {
    const attendees = Number(row.attendee_count);
    const external = Number(row.external_attendees);
    assert.ok(Number.isInteger(attendees) && attendees >= 0);
    assert.ok(Number.isInteger(external) && external >= 0);
    assert.ok(external <= attendees, "more external guests than attendees");
    if (!["meal", "event"].includes(row.expense_type)) {
      assert.equal(row.attendee_count, "0", "an unattended expense carries an attendee count");
      assert.equal(row.external_attendees, "0");
    } else {
      assert.ok(attendees >= 1, "an attended expense with no attendees");
    }
    if (row.expense_type === "lodging") {
      assert.ok(
        toCents(row.amount) <= usdCents(policy.lodging_nightly_limits[row.city_tier]),
        "a nightly rate above the cap, which this file does not plant"
      );
    }
    assert.ok(row.city_tier in policy.meal_daily_limits, `city_tier "${row.city_tier}" has no policy limit`);
  }
});

test("FIN-13 plant: exactly one over-limit meal, and exactly one in-policy business meal that looks like it", () => {
  const overLimit = rows.filter((r) =>
    r.expense_type === "meal"
    && toCents(r.amount) > usdCents(policy.meal_daily_limits[r.city_tier]));
  assert.equal(overLimit.length, 2, "the finding and its lookalike are the only meals above a daily cap");

  const finding = overLimit.filter((r) => r.claim_type === "actual" && r.external_attendees === "0");
  assert.equal(finding.length, 1, "the over-limit meal has to resolve to exactly one line");

  const inPolicy = overLimit.filter((r) => Number(r.external_attendees) > 0);
  assert.equal(inPolicy.length, 1, "the business-meal lookalike has to resolve to exactly one line");
  assert.notEqual(inPolicy[0].report_id + inPolicy[0].line_no, finding[0].report_id + finding[0].line_no);
  assert.notEqual(inPolicy[0].business_purpose, "", "a business meal without a purpose is not in policy");
  assert.equal(policy.business_meal_exempt_from_daily_limit, true);
});

test("FIN-13 plant: exactly one receipt missing without a declaration, and one declared", () => {
  const threshold = usdCents(policy.receipt_required_at_or_above);
  const atOrAbove = rows.filter((r) => toCents(r.amount) >= threshold);
  const noReceipt = atOrAbove.filter((r) => r.receipt_reference === "");
  assert.equal(noReceipt.length, 2, "the finding and its lookalike are the only unsupported lines above the threshold");

  const undeclared = noReceipt.filter((r) => r.missing_receipt_declaration === "false");
  assert.equal(undeclared.length, 1, "the missing receipt has to resolve to exactly one line");

  const declared = rows.filter((r) => r.missing_receipt_declaration === "true");
  assert.equal(declared.length, 1, "the declaration lookalike has to resolve to exactly one line");
  assert.equal(declared[0].receipt_reference, "");
  assert.ok(toCents(declared[0].amount) >= threshold);

  for (const row of rows) {
    assert.ok(["true", "false"].includes(row.missing_receipt_declaration));
    if (row.receipt_reference !== "") assert.match(row.receipt_reference, /^RCPT-2026-\d{4}$/);
    // Nothing below the threshold is left unsupported by accident.
    if (row.receipt_reference === "" && toCents(row.amount) < threshold) {
      assert.equal(row.claim_type, "per_diem", "an unexplained missing receipt below the threshold");
    }
  }
  const references = rows.map((r) => r.receipt_reference).filter((r) => r !== "");
  assert.equal(new Set(references).size, references.length, "a receipt reference is reused");
});

test("FIN-13 plant: exactly one line carries a non-reimbursable category", () => {
  const banned = new Set(policy.non_reimbursable_categories);
  const hits = rows.filter((r) => banned.has(r.merchant_category));
  assert.equal(hits.length, 1, "the non-reimbursable expense has to resolve to exactly one line");
  assert.ok(banned.has(hits[0].merchant_category));
});

test("FIN-13 plant: exactly one structuring pattern, by the FIN-14 window and threshold", () => {
  const { window_days: windowDays, threshold_usd: thresholdUsd } = policy.structuring_rule;
  const threshold = usdCents(thresholdUsd);
  const totalOf = new Map([...reports].map(([id, lines]) => [id, toCents(lines[0].report_total)]));

  const groups = new Map();
  for (const row of rows) {
    if (row.merchant === "") continue;
    const key = `${row.employee_id}|${row.merchant}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const patterns = new Set();
  for (const [key, lines] of groups) {
    for (const a of lines) {
      for (const b of lines) {
        if (a.report_id >= b.report_id) continue;
        if (Math.abs(diffDays(a.expense_date, b.expense_date)) > windowDays) continue;
        const pair = totalOf.get(a.report_id) + totalOf.get(b.report_id);
        if (totalOf.get(a.report_id) >= threshold || totalOf.get(b.report_id) >= threshold) continue;
        if (pair <= threshold) continue;
        patterns.add(`${key}|${a.report_id}|${b.report_id}`);
      }
    }
  }
  assert.equal(patterns.size, 1, "the structuring pattern has to resolve to exactly one pair");
});

test("FIN-13 plant: exactly one line the policy does not decide, and it falls on a weekend", () => {
  const undecided = rows.filter((r) => r.business_purpose === "");
  assert.equal(undecided.length, 1, "an expense with no stated purpose has to resolve to exactly one line");
  assert.ok(isWeekend(undecided[0].expense_date), "the judgment case is the weekend expense with no purpose");
  // No figure in the config resolves it: it is not over a cap, not missing a
  // receipt it needed, and not on the non-reimbursable list.
  const row = undecided[0];
  assert.ok(!new Set(policy.non_reimbursable_categories).has(row.merchant_category));
  assert.notEqual(row.receipt_reference, "");
  assert.ok(row.expense_type !== "meal"
    || toCents(row.amount) <= usdCents(policy.meal_daily_limits[row.city_tier]));
});

test("FIN-13: two runs are byte identical", () => {
  const again = generateArtifact(spec, canon);
  assert.deepEqual(again, files);
});

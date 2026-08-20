// FIN-13 expense-reports: the March 2026 expense population module 17 reviews
// against the FIN-14 spend policy.
//
// Eighteen reports, eighty-eight lines, nothing posted. Every report is
// `submitted` or `in_review`, so the frozen FIN-05 trial balance is untouched
// and the review is a live decision rather than a post mortem.
//
// Four findings are planted, each derivable only by reading FIN-14 and doing
// arithmetic: a meal over its own city tier's daily cap, a receipt missing
// without the declaration the policy allows, a category on the non-reimbursable
// list, and one transaction split across two reports that each sit just under
// the first approval band. Two of them ship with a lookalike that is squarely in
// policy (a business meal with external guests, which section 7.5 exempts from
// the daily limit; a missing receipt with the section 9.3 declaration filed), so
// the rule has to read three columns rather than one. A fifth line carries no
// business purpose at all on a weekend, which no figure in the config resolves:
// it is held for a person.
//
// A static table rather than drawn rows, the FIN-22 and FIN-36 pattern. The
// plants are a system of simultaneous constraints (one over-limit meal and no
// second one, two reports under a threshold whose pair is over it, one merchant
// spanning two reports and no other), and a draw that satisfies all of them is
// a draw that was written down anyway. People and accounts still come from
// CORE-04 and FIN-22 by rule, so the joins survive a roster or chart change.
//
// buildExpenseReports() asserts every plant before it returns. A reroll that
// collapses a finding into its own lookalike fails generation rather than
// shipping an exercise with no answer.
import { toCsv } from "../csv.js";
import { addDays, diffDays, isWeekend, rollForwardPastWeekend } from "../dates.js";
import { CANON_VENDORS, NEUTRAL_VENDORS } from "./fin-01-cash-recon.js";
import { buildChartOfAccounts } from "./fin-22-chart-of-accounts.js";
import { financeRoster } from "./finance-roles.js";
import { POLICY, bandForTotal, buildSpendPolicy } from "./fin-14-spend-policy.js";

export const id = "FIN-13";

export const COLUMNS = [
  "report_id", "line_no", "employee_id", "employee_department", "approver_employee_id",
  "report_submitted_date", "expense_date", "expense_type", "merchant", "merchant_category",
  "city_tier", "claim_type", "attendee_count", "external_attendees", "business_purpose",
  "gl_account", "amount", "currency", "payment_method", "receipt_reference",
  "missing_receipt_declaration", "report_total", "status",
];

/** The last day a March expense could still reach Finance before the close. */
export const LAST_SUBMISSION_DATE = "2026-04-03";
/** Reports opened by Finance Operations on or before this date are in review. */
const REVIEW_OPENED_BY = "2026-03-27";

const REPORT_ID_START = 101;
const RECEIPT_START = 101;

// The sixteen screened names: the CORE-01 SaaS counterparty, the five canon
// vendors FIN-01 pays, and the ten neutral names screened for collisions with
// real companies. Nothing else may appear as a merchant, which is what keeps an
// unscreened restaurant or airline out of the universe. A card feed carries one
// category per merchant, so the category travels with the name.
export const MERCHANTS = [
  { name: "Copperline Software", canon_id: "co-101", category: "software" },
  { name: "Millgate Insurance Services", canon_id: "co-105", category: "facilities_services" },
  { name: "TalentForce HR Platform", canon_id: "co-106", category: "hr_platform" },
  { name: "Cedarline Office Supply", canon_id: "co-107", category: "office_supplies" },
  { name: "Birchcroft Properties", canon_id: "co-109", category: "property_services" },
  { name: "DataPulse Analytics", canon_id: "co-119", category: "analytics" },
  { name: "Halvermoor Cloud Services", category: "cloud_services" },
  { name: "Harrowfen Facilities Group", category: "facilities_services" },
  { name: "Kestrelmoor Staffing Partners", category: "staffing" },
  { name: "Loamfield Power Cooperative", category: "utilities" },
  { name: "Thackenridge Courier", category: "courier" },
  { name: "Sarrowmere Print Works", category: "printing" },
  { name: "Fenwhistle Travel Desk", category: "travel_agency" },
  { name: "Fallowmere Catering", category: "catering" },
  { name: "Braxmoor Recruiting Group", category: "recruiting" },
  { name: "Wrenfallow Security Systems", category: "security" },
];

/**
 * Categories a card feed reports with no merchant name behind them: a per diem
 * is an allowance rather than a purchase, and a toll gantry and a parking-fine
 * notice reach the feed as a category and an amount.
 */
export const MERCHANTLESS_CATEGORIES = ["per_diem", "toll", "parking_fine"];

const MERCHANT_BY_NAME = new Map(MERCHANTS.map((m) => [m.name, m]));

// Coding rule: a travel line is travel and entertainment whatever its merchant;
// everything else is coded from the merchant's own category, which is what a
// card feed gives an accountant to code from.
const ACCOUNT_BY_EXPENSE_TYPE = {
  airfare: "6400", lodging: "6400", meal: "6400", ground_transport: "6400", parking: "6400",
  event: "6310", office_supply: "6120", software: "6200",
};
const ACCOUNT_BY_CATEGORY = {
  cloud_services: "5000",
  facilities_services: "6100",
  security: "6100",
  utilities: "6110",
  courier: "6120",
  staffing: "6040",
  recruiting: "6040",
};

function accountFor(expenseType, category) {
  if (expenseType === "software" && category in ACCOUNT_BY_CATEGORY) return ACCOUNT_BY_CATEGORY[category];
  if (expenseType === "other") {
    const code = ACCOUNT_BY_CATEGORY[category];
    if (!code) throw new Error(`${id}: no account coding for an "other" line in category "${category}"`);
    return code;
  }
  const code = ACCOUNT_BY_EXPENSE_TYPE[expenseType];
  if (!code) throw new Error(`${id}: no account coding for expense type "${expenseType}"`);
  return code;
}

// A line: [expense_type, merchant name or a merchantless category, amount in
// cents, day of March]. The fifth element carries the exceptions to the
// defaults (attendees, a purpose of its own, a missing receipt).
const REPORTS = [
  {
    department: "Sales", city_tier: "tier_1",
    purpose: "Customer onsite and quarterly business review",
    lines: [
      ["airfare", "Fenwhistle Travel Desk", 62400, 3],
      ["lodging", "Fenwhistle Travel Desk", 36800, 3],
      ["lodging", "Fenwhistle Travel Desk", 35900, 4],
      ["meal", "Fallowmere Catering", 7450, 3, { attendees: 1 }],
      ["meal", "Fallowmere Catering", 8825, 4, { attendees: 1 }],
      ["ground_transport", "Fenwhistle Travel Desk", 9640, 4],
    ],
  },
  {
    department: "Marketing", city_tier: "tier_2",
    purpose: "Regional user group and partner briefing",
    lines: [
      ["airfare", "Fenwhistle Travel Desk", 41200, 9],
      ["lodging", "Fenwhistle Travel Desk", 26400, 9],
      ["meal", "per_diem", 5625, 9, { attendees: 1, per_diem: true }],
      ["meal", "per_diem", 6800, 10, { attendees: 1, per_diem: true }],
      ["ground_transport", "Fenwhistle Travel Desk", 8800, 10],
    ],
  },
  {
    department: "Engineering", city_tier: "tier_3",
    purpose: "Platform engineering conference",
    lines: [
      ["airfare", "Fenwhistle Travel Desk", 38850, 10],
      ["lodging", "Fenwhistle Travel Desk", 18900, 10],
      ["lodging", "Fenwhistle Travel Desk", 18900, 11],
      ["meal", "Fallowmere Catering", 5275, 10, { attendees: 1 }],
      ["meal", "Fallowmere Catering", 5840, 11, { attendees: 1 }],
      ["event", "Fallowmere Catering", 42500, 11, { attendees: 6 }],
    ],
  },
  {
    department: "IT & Security", city_tier: "tier_2",
    purpose: "Security tooling and analytics subscriptions for the quarter",
    lines: [
      ["software", "Copperline Software", 24900, 4],
      ["software", "Halvermoor Cloud Services", 78000, 5],
      ["software", "DataPulse Analytics", 31600, 5],
      ["office_supply", "Cedarline Office Supply", 14230, 6],
      ["other", "Wrenfallow Security Systems", 39500, 6],
    ],
  },
  {
    // The over-limit meal. Actual cost, no external guest, above the tier 1
    // daily cap, and the only line in the file that is all three.
    department: "Sales", city_tier: "tier_1",
    purpose: "New logo pitch and contract walkthrough",
    lines: [
      ["airfare", "Fenwhistle Travel Desk", 58800, 11],
      ["lodging", "Fenwhistle Travel Desk", 37200, 11],
      ["meal", "Fallowmere Catering", 11860, 11, { attendees: 1 }],
      ["meal", "Fallowmere Catering", 8400, 12, { attendees: 1 }],
      ["ground_transport", "Fenwhistle Travel Desk", 6425, 12],
    ],
  },
  {
    // The lookalike: also above the daily cap, and squarely in policy, because
    // section 7.5 exempts a business meal with external guests from the limit.
    department: "Sales", city_tier: "tier_2",
    purpose: "Renewal planning with an enterprise account",
    lines: [
      ["meal", "Fallowmere Catering", 34280, 17, {
        attendees: 5, external: 3,
        purpose: "Renewal dinner with the customer account team and their operations lead",
      }],
      ["ground_transport", "Fenwhistle Travel Desk", 4760, 17],
      ["office_supply", "Sarrowmere Print Works", 12800, 18],
      ["meal", "Fallowmere Catering", 6120, 18, { attendees: 1 }],
    ],
  },
  {
    // The missing receipt: above the threshold, no reference, no declaration.
    department: "Operations", city_tier: "tier_3",
    purpose: "Site visit to the regional distribution partner",
    lines: [
      ["lodging", "Fenwhistle Travel Desk", 17800, 5],
      ["meal", "Fallowmere Catering", 4480, 5, { attendees: 1 }],
      ["other", "Harrowfen Facilities Group", 12840, 6, { no_receipt: true }],
      ["ground_transport", "Fenwhistle Travel Desk", 5200, 6],
      ["office_supply", "Cedarline Office Supply", 6615, 6],
    ],
  },
  {
    // The lookalike: above the threshold with no receipt either, and the
    // section 9.3 declaration on file, which the policy allows.
    department: "Customer Success", city_tier: "tier_2",
    purpose: "Onboarding workshop with a new enterprise account",
    lines: [
      ["airfare", "Fenwhistle Travel Desk", 33600, 12],
      ["lodging", "Fenwhistle Travel Desk", 25100, 12],
      ["ground_transport", "Fenwhistle Travel Desk", 9600, 13, { no_receipt: true, declared: true }],
      ["meal", "Fallowmere Catering", 6890, 12, { attendees: 1 }],
      ["meal", "Fallowmere Catering", 7140, 13, { attendees: 1 }],
    ],
  },
  {
    // The non-reimbursable line: a parking fine, section 8.4.
    department: "Product", city_tier: "tier_1",
    purpose: "Product discovery interviews with users",
    lines: [
      ["airfare", "Fenwhistle Travel Desk", 51200, 18],
      ["parking", "parking_fine", 6500, 19],
      ["ground_transport", "Fenwhistle Travel Desk", 5800, 19],
      ["meal", "Fallowmere Catering", 9210, 19, { attendees: 1 }],
      ["lodging", "Fenwhistle Travel Desk", 34100, 19],
    ],
  },
  {
    // The line the policy does not decide: no business purpose, on a Saturday.
    department: "People", city_tier: "tier_3",
    purpose: "Campus recruiting visit and candidate hosting",
    lines: [
      ["ground_transport", "toll", 1475, 20],
      ["meal", "Fallowmere Catering", 5750, 20, { attendees: 1 }],
      ["other", "Kestrelmoor Staffing Partners", 26800, 21, { no_purpose: true }],
      ["software", "TalentForce HR Platform", 8990, 20],
      ["lodging", "Fenwhistle Travel Desk", 19600, 20],
    ],
  },
  {
    // The one report that climbs past the first approval band, so the band
    // ladder and the role map are exercised rather than decorative. Its
    // submitter reports to the VP the second band names.
    department: "Finance", submitter: "finance_director", city_tier: "tier_1",
    purpose: "International subsidiary review and audit planning",
    lines: [
      ["airfare", "Fenwhistle Travel Desk", 386000, 23],
      ["lodging", "Fenwhistle Travel Desk", 37400, 23],
      ["lodging", "Fenwhistle Travel Desk", 37400, 24],
      ["lodging", "Fenwhistle Travel Desk", 36800, 25],
      ["meal", "Fallowmere Catering", 9400, 24, { attendees: 1 }],
      ["ground_transport", "Fenwhistle Travel Desk", 21240, 25],
    ],
  },
  {
    department: "Engineering", city_tier: "tier_3",
    purpose: "Platform migration workshop with the hosting vendor",
    lines: [
      ["airfare", "Fenwhistle Travel Desk", 29600, 16],
      ["lodging", "Fenwhistle Travel Desk", 16800, 16],
      ["meal", "per_diem", 4500, 16, { attendees: 1, per_diem: true }],
      ["meal", "per_diem", 6000, 17, { attendees: 1, per_diem: true }],
      ["ground_transport", "Fenwhistle Travel Desk", 7400, 17],
    ],
  },
  {
    department: "Marketing", city_tier: "tier_2",
    purpose: "Spring customer event",
    lines: [
      ["event", "Birchcroft Properties", 64000, 24],
      ["event", "Fallowmere Catering", 81250, 24, { attendees: 14, external: 6 }],
      ["office_supply", "Sarrowmere Print Works", 23600, 23],
      ["ground_transport", "Fenwhistle Travel Desk", 6800, 24],
      ["meal", "Fallowmere Catering", 4400, 23, { attendees: 1 }],
    ],
  },
  {
    department: "Operations", city_tier: "tier_3",
    purpose: "Facilities and logistics support for the office refresh",
    lines: [
      ["other", "Loamfield Power Cooperative", 18400, 9],
      ["other", "Thackenridge Courier", 9650, 10],
      ["office_supply", "Cedarline Office Supply", 21475, 10],
      ["ground_transport", "toll", 1850, 11],
      ["meal", "Fallowmere Catering", 3860, 11, { attendees: 1 }],
      ["other", "Millgate Insurance Services", 34200, 12],
    ],
  },
  {
    department: "Sales", city_tier: "tier_2",
    purpose: "Territory travel and pipeline reviews",
    lines: [
      ["airfare", "Fenwhistle Travel Desk", 41800, 25],
      ["lodging", "Fenwhistle Travel Desk", 26800, 25],
      ["lodging", "Fenwhistle Travel Desk", 27200, 26],
      ["meal", "Fallowmere Catering", 7230, 25, { attendees: 1 }],
      ["meal", "Fallowmere Catering", 6680, 26, { attendees: 1 }],
      ["ground_transport", "Fenwhistle Travel Desk", 8200, 26],
    ],
  },
  {
    // One booking, two reports, two days apart, each just under the first
    // approval band and the pair well over it. Nothing on either row says so.
    department: "Marketing", city_tier: "tier_2",
    purpose: "Customer event catering",
    lines: [
      ["event", "Fallowmere Catering", 238000, 17, { attendees: 40 }],
      ["ground_transport", "Fenwhistle Travel Desk", 5500, 17],
    ],
  },
  {
    department: "Marketing", submitter: "same_as_previous", city_tier: "tier_2",
    purpose: "Customer event catering",
    lines: [
      ["event", "Fallowmere Catering", 240000, 19, { attendees: 40 }],
      ["office_supply", "Sarrowmere Print Works", 4500, 19],
    ],
  },
  {
    department: "Customer Success", city_tier: "tier_1",
    purpose: "Executive briefing with a strategic account",
    lines: [
      ["airfare", "Fenwhistle Travel Desk", 70400, 30],
      ["lodging", "Fenwhistle Travel Desk", 35800, 30],
      ["meal", "Fallowmere Catering", 9150, 30, { attendees: 1 }],
      ["ground_transport", "Fenwhistle Travel Desk", 7460, 31],
      ["other", "Braxmoor Recruiting Group", 28800, 31],
    ],
  },
];

const cents = (n) => (n / 100).toFixed(2);
const marchDate = (day) => `2026-03-${String(day).padStart(2, "0")}`;

/**
 * Submitters, drawn from CORE-04 by rule: the next active employee of the
 * report's department, in employee id order, who has an active manager and
 * manages nobody. The last clause is what keeps the file looking like an
 * expense population rather than an executive travel log, and it keeps the
 * approvals spread across the org instead of piling every report on the one
 * person the department heads all report to.
 *
 * The one exception is stated rather than picked: the second approval band
 * needs a submitter whose manager is the Vice President it names, and that
 * person is a director by definition.
 */
function submitterChooser(roster) {
  const active = roster.filter((r) => r.employment_status === "active");
  const byId = new Map(active.map((r) => [r.employee_id, r]));
  const managers = new Set(roster.map((r) => r.manager_employee_id).filter((m) => m !== ""));
  const eligible = (department) => active
    .filter((r) => r.department === department && byId.has(r.manager_employee_id) && !managers.has(r.employee_id))
    .sort((a, b) => a.employee_id.localeCompare(b.employee_id));

  const cursor = new Map();
  const next = (department) => {
    const pool = eligible(department);
    const at = cursor.get(department) ?? 0;
    if (at >= pool.length) throw new Error(`${id}: ${department} has no further eligible submitter`);
    cursor.set(department, at + 1);
    return pool[at];
  };

  const vpTitle = POLICY.role_map["Vice President"];
  const financeDirector = active
    .filter((r) => r.department === "Finance" && byId.has(r.manager_employee_id))
    .sort((a, b) => a.employee_id.localeCompare(b.employee_id))
    .find((r) => r.role_title === "Director, Finance" && byId.get(r.manager_employee_id).role_title === vpTitle);
  if (!financeDirector) {
    throw new Error(`${id}: no active Finance director reports to a ${vpTitle}, so the second approval band has no submitter`);
  }

  return { next, financeDirector, byId };
}

/**
 * The eighteen reports as row objects keyed by COLUMNS, with every planted
 * feature asserted before they are returned.
 * @returns {object[]}
 */
export function buildExpenseReports() {
  const policy = buildSpendPolicy();
  const roster = financeRoster();
  const { next, financeDirector, byId } = submitterChooser(roster);
  const chart = new Map(buildChartOfAccounts().map((a) => [a.account_code, a]));
  const screened = new Set(MERCHANTS.map((m) => m.name));
  const merchantless = new Set(MERCHANTLESS_CATEGORIES);

  const rows = [];
  let receiptSeq = RECEIPT_START;
  let previousSubmitter = null;

  REPORTS.forEach((report, index) => {
    const reportId = `EXP-2026-0${REPORT_ID_START + index}`;
    let submitter;
    if (report.submitter === "finance_director") submitter = financeDirector;
    else if (report.submitter === "same_as_previous") submitter = previousSubmitter;
    else submitter = next(report.department);
    if (!submitter) throw new Error(`${id}: ${reportId} has no submitter`);
    previousSubmitter = submitter;
    if (submitter.department !== report.department) {
      throw new Error(`${id}: ${reportId} claims ${report.department} and its submitter is in ${submitter.department}`);
    }

    const lines = report.lines.map(([expenseType, source, amount, day, opts = {}]) => {
      const merchant = MERCHANT_BY_NAME.get(source);
      if (!merchant && !merchantless.has(source)) {
        throw new Error(`${id}: ${reportId} names "${source}", which is neither a screened merchant nor a card-feed category`);
      }
      const category = merchant ? merchant.category : source;
      const perDiem = opts.per_diem === true;
      const attended = expenseType === "meal" || expenseType === "event";
      const attendees = attended ? (opts.attendees ?? 1) : 0;
      const external = attended ? (opts.external ?? 0) : 0;
      const carriesReceipt = !perDiem && opts.no_receipt !== true;
      return {
        report_id: reportId,
        line_no: "",
        employee_id: submitter.employee_id,
        employee_department: submitter.department,
        approver_employee_id: submitter.manager_employee_id,
        report_submitted_date: "",
        expense_date: marchDate(day),
        expense_type: expenseType,
        merchant: merchant ? merchant.name : "",
        merchant_category: category,
        city_tier: report.city_tier,
        claim_type: perDiem ? "per_diem" : "actual",
        attendee_count: String(attendees),
        external_attendees: String(external),
        business_purpose: opts.no_purpose === true ? "" : (opts.purpose ?? report.purpose),
        gl_account: accountFor(expenseType, category),
        amount: cents(amount),
        currency: "USD",
        payment_method: "",
        receipt_reference: carriesReceipt ? `RCPT-2026-0${receiptSeq++}` : "",
        missing_receipt_declaration: opts.declared === true ? "true" : "false",
        report_total: "",
        status: "",
        _amountCents: amount,
      };
    });

    // Section 9.1 issues a corporate card to the people who travel. A report
    // with no air or hotel line is one of the others, reimbursed out of pocket,
    // and a per diem is an allowance rather than a charge either way.
    const traveller = lines.some((l) => l.expense_type === "airfare" || l.expense_type === "lodging");
    for (const line of lines) {
      line.payment_method = traveller && line.claim_type !== "per_diem" ? "corporate_card" : "out_of_pocket";
    }

    const total = lines.reduce((acc, l) => acc + l._amountCents, 0);
    const latest = lines.map((l) => l.expense_date).sort().at(-1);
    const submitted = rollForwardPastWeekend(addDays(latest, 3));
    lines.forEach((line, i) => {
      line.line_no = String(i + 1);
      line.report_submitted_date = submitted;
      line.report_total = cents(total);
      line.status = submitted <= REVIEW_OPENED_BY ? "in_review" : "submitted";
      rows.push(line);
    });
  });

  assertStructure(rows, { policy, chart, screened, merchantless, byId });
  assertPlants(rows, policy);
  return rows.map(({ _amountCents, ...row }) => row);
}

function assertStructure(rows, { policy, chart, screened, merchantless, byId }) {
  const threshold = policy.receipt_required_at_or_above;
  const references = new Set();
  for (const row of rows) {
    const where = `${row.report_id} line ${row.line_no}`;
    const account = chart.get(row.gl_account);
    if (!account || account.active !== "true" || account.type !== "expense") {
      throw new Error(`${id}: ${where} codes to ${row.gl_account}, which is not an active FIN-22 expense account`);
    }
    if (row.merchant === "") {
      if (!merchantless.has(row.merchant_category)) {
        throw new Error(`${id}: ${where} has no merchant and category "${row.merchant_category}"`);
      }
    } else {
      if (!screened.has(row.merchant)) throw new Error(`${id}: ${where} names the unscreened merchant "${row.merchant}"`);
      if (merchantless.has(row.merchant_category)) {
        throw new Error(`${id}: ${where} names a merchant under a card-feed-only category`);
      }
    }
    if (row.claim_type === "per_diem") {
      if (row.expense_type !== "meal") throw new Error(`${id}: ${where} claims a per diem on a ${row.expense_type} line`);
      if (row.merchant !== "") throw new Error(`${id}: ${where} claims a per diem against a merchant`);
      if (row._amountCents >= threshold) {
        throw new Error(`${id}: ${where} is a per diem at or above the receipt threshold, which it can never support`);
      }
    }
    if (row.expense_type === "lodging" && row._amountCents > policy.lodging_nightly_limits[row.city_tier]) {
      throw new Error(`${id}: ${where} is a nightly rate above the ${row.city_tier} cap, which this file does not plant`);
    }
    const attendees = Number(row.attendee_count);
    const external = Number(row.external_attendees);
    if (external > attendees) throw new Error(`${id}: ${where} has more external guests than attendees`);
    if (attendees >= 2 && external === 0
      && row._amountCents > attendees * policy.team_meal_per_attendee_vp_approval) {
      throw new Error(`${id}: ${where} is a team meal above the per-attendee approval point, which this file does not plant`);
    }
    if (row.receipt_reference !== "") {
      if (references.has(row.receipt_reference)) throw new Error(`${id}: ${row.receipt_reference} is reused`);
      references.add(row.receipt_reference);
    }
    const employee = byId.get(row.employee_id);
    if (!employee) throw new Error(`${id}: ${where} names ${row.employee_id}, who is not an active CORE-04 employee`);
    if (row.approver_employee_id !== employee.manager_employee_id) {
      throw new Error(`${id}: ${where} routes to an approver who is not the submitter's manager`);
    }
    if (row.approver_employee_id === row.employee_id) throw new Error(`${id}: ${where} is self approved`);
    if (!byId.has(row.approver_employee_id)) throw new Error(`${id}: ${where} routes to an inactive approver`);
  }

  const byReport = groupBy(rows, (r) => r.report_id);
  for (const [reportId, lines] of byReport) {
    // Section 9.1 issues a corporate card to the people who travel. A report
    // with no air or hotel line is one of the others, reimbursed out of pocket,
    // and a per diem is an allowance rather than a charge either way.
    const traveller = lines.some((l) => l.expense_type === "airfare" || l.expense_type === "lodging");
    for (const line of lines) {
      line.payment_method = traveller && line.claim_type !== "per_diem" ? "corporate_card" : "out_of_pocket";
    }

    const total = lines.reduce((acc, l) => acc + l._amountCents, 0);
    if (cents(total) !== lines[0].report_total) throw new Error(`${id}: ${reportId} total is not its line sum`);
    const latest = lines.map((l) => l.expense_date).sort().at(-1);
    const submitted = lines[0].report_submitted_date;
    if (submitted <= latest) throw new Error(`${id}: ${reportId} was submitted before its last expense`);
    if (submitted > LAST_SUBMISSION_DATE) throw new Error(`${id}: ${reportId} reaches Finance after the close`);
    if (diffDays(latest, submitted) > policy.submission_window_days) {
      throw new Error(`${id}: ${reportId} is submitted outside the policy window`);
    }
    const elections = new Set(lines.filter((l) => l.expense_type === "meal").map((l) => l.claim_type));
    if (elections.size > 1) throw new Error(`${id}: ${reportId} mixes per diem and actual meal claims`);

    const band = bandForTotal(total, policy);
    if (band.approvers.length !== 1) {
      throw new Error(`${id}: ${reportId} needs ${band.approvers.length} approvers and the file carries one approver column`);
    }
    const [approverRole] = band.approvers;
    if (approverRole !== "manager") {
      const approver = byId.get(lines[0].approver_employee_id);
      if (approver.role_title !== policy.role_map[approverRole]) {
        throw new Error(`${id}: ${reportId} needs a ${approverRole} and its approver is a ${approver.role_title}`);
      }
    }
  }
}

function assertPlants(rows, policy) {
  const only = (label, matches, expected = 1) => {
    if (matches.length !== expected) {
      throw new Error(`${id}: ${label} resolves to ${matches.length} lines, expected ${expected}`);
    }
    return matches;
  };

  const overLimit = rows.filter((r) =>
    r.expense_type === "meal" && r._amountCents > policy.meal_daily_limits[r.city_tier]);
  only("meals above a daily cap", overLimit, 2);
  only("the over-limit meal", overLimit.filter((r) => r.claim_type === "actual" && r.external_attendees === "0"));
  const businessMeal = only("the in-policy business meal", overLimit.filter((r) => Number(r.external_attendees) > 0));
  if (businessMeal[0].business_purpose === "") {
    throw new Error(`${id}: the business meal carries no purpose, so it is not in policy after all`);
  }

  const unsupported = rows.filter((r) =>
    r._amountCents >= policy.receipt_required_at_or_above && r.receipt_reference === "");
  only("lines above the receipt threshold with no receipt", unsupported, 2);
  only("the missing receipt", unsupported.filter((r) => r.missing_receipt_declaration === "false"));
  only("the missing receipt declaration", rows.filter((r) => r.missing_receipt_declaration === "true"));

  const banned = new Set(policy.non_reimbursable_categories);
  only("the non-reimbursable expense", rows.filter((r) => banned.has(r.merchant_category)));

  const undecided = only("the line with no business purpose", rows.filter((r) => r.business_purpose === ""));
  if (!isWeekend(undecided[0].expense_date)) {
    throw new Error(`${id}: the line with no business purpose does not fall on a weekend`);
  }

  const totals = new Map([...groupBy(rows, (r) => r.report_id)]
    .map(([reportId, lines]) => [reportId, lines.reduce((acc, l) => acc + l._amountCents, 0)]));
  const { window_days: windowDays, threshold } = policy.structuring_rule;
  const patterns = new Set();
  for (const [, lines] of groupBy(rows.filter((r) => r.merchant !== ""), (r) => `${r.employee_id}|${r.merchant}`)) {
    for (const a of lines) {
      for (const b of lines) {
        if (a.report_id >= b.report_id) continue;
        if (Math.abs(diffDays(a.expense_date, b.expense_date)) > windowDays) continue;
        if (totals.get(a.report_id) >= threshold || totals.get(b.report_id) >= threshold) continue;
        if (totals.get(a.report_id) + totals.get(b.report_id) <= threshold) continue;
        patterns.add(`${a.employee_id}|${a.merchant}|${a.report_id}|${b.report_id}`);
      }
    }
  }
  only("the structuring pattern", [...patterns]);
}

function groupBy(items, keyOf) {
  const out = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (!out.has(key)) out.set(key, []);
    out.get(key).push(item);
  }
  return out;
}

export function generate() {
  return [{ path: "expense-reports.csv", content: toCsv(COLUMNS, buildExpenseReports()) }];
}

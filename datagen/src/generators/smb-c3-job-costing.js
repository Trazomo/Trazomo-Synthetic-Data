// The cluster 3 job costing system: SMB-20 time-entries-mock, SMB-21
// job-expenses-mock and SMB-22 job-progress, built here as one unit because
// SMB-22 is the sum of the other two and cannot be built beside them without
// restating numbers they own.
//
// SMB-20 is the clean weekly time record. SMB-21 is the expense export with
// the one miscode in it. SMB-22 is the margin snapshot, and every money column
// on it that could be typed is instead SUMMED over the emitted SMB-17, SMB-20
// and SMB-21 rows and then held against the data plan's pinned six-row table.
// A generator that computed those sums from its own constants would pass its
// own test and ship a file that disagrees with its inputs, which is the data
// plan's risk 1 and is the reason the three live in one builder.
//
// ---------------------------------------------------------------------------
// The plants, with both cardinalities. Every one is asserted below before the
// builder returns, and re-derived a second time, from the emitted bytes and
// without importing anything from this file, in
// tests/generators/smb-c3-job-costing.test.js.
//
//   P4  the miscoded personal expense (SMB-21).
//       Rule: a row whose expense_category is outside the job-cost set WHILE
//       its job_id is non-empty.
//       1 under the rule. 4 with the named qualifier dropped: four rows carry
//       a category outside the job-cost set and three of the four correctly
//       carry no job code at all, being office_overhead twice and
//       software_subscription once, so a rule that greps for a non-job
//       category returns four and three of the four are coded exactly right.
//
//   P5  the healthy-looking job (SMB-22).
//       Rule: a job that reads on track and carries an open change order
//       WHOSE VALUE IS ABOVE change_order_materiality_usd.
//       1 under the rule. 3 with the qualifier dropped: three jobs read on
//       track and carry an open change order, and the other two stay above the
//       floor on both readings, so a rule that flags every job with an open
//       change order flags three and two of the three are fine.
//
//   P6  the control (SMB-22).
//       Rule: a job with no open change order AND no expense row whose
//       category is outside the job-cost set.
//       1 under the rule, frozen by artifacts/SMB-15. 2 with the qualifier
//       dropped: two jobs carry no open change order and one of the two is
//       carrying the miscoded expense, so a rule that looks only at change
//       orders finds two controls and one of them is wrong.
//
// ---------------------------------------------------------------------------
// The rules this file is built under.
//
//   R-CENTS. Every amount is an integer number of cents here and a 2dp string
//   on disk. percent_complete is an integer percentage, the margin floor is an
//   integer in basis points and the tolerance is a whole number of points, so
//   every threshold comparison is an integer cross-multiplication. There is no
//   quotient column anywhere, and no true_margin, on_track, is_miscoded or
//   status column: all four would be answer keys.
//
//   Dates. Every comparison is between two ISO strings or is a whole-day
//   integer difference from dates.js. No Date object is constructed here.
//   Every week_ending is a Friday.
//
//   The frozen bytes are READ, never retyped. SMB-06's two markdown tables are
//   parsed out of the approved proposal for the quantity tie and the per-line
//   cost inequality; SMB-16's emitted rows and SMB-04's stage dates give the
//   Okafor role windows and the two frozen jobs' start and planned end dates;
//   and the 6480.00 rework figure is re-read out of artifacts/SMB-15 behind a
//   loud-throw pin. A builder that typed any of them would pass every check
//   here except the pin.
//
//   R-MOCK. record_type is `mock` on all three files. The mock notice is
//   specifically about funds not moving and belongs on the payment record, so
//   these three carry record_type and not the notice (data plan U-P). No
//   processor, gateway, card network or bank product word exists in any cell.
//
//   R-ROLE. No person is named. A human on a time entry appears as a crew_role
//   drawn from SMB-06's own rate classes and as an anonymous CRW-LDB- slot,
//   which resolves to no canon id and to no name string; a human on an expense
//   row appears as SMB-02's record_owner_role vocabulary. There is no name, no
//   initial and no employee id.
//
//   R-NS. Every id class is namespaced from birth: TME-LDB-NN, JEX-LDB-NN,
//   CHO-LDB-NN, CRW-LDB-NN and JOB-LDB-NN. The expense class is JEX- and not
//   EXP-, which the finance expense-report pack already spends.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { addDays, weekday } from "../dates.js";
import { cents, toCents } from "../money.js";
import { MOCK_RECORD_TYPE, RECORD_OWNER_ROLES } from "./smb-02-client-record-template.js";
import { AS_OF_DATE } from "./smb-04-client-record-okafor.js";
import {
  BILLED_TO_DATE_CENTS, JOBS, buildInvoiceRegister, frozenRecords, jobPopulation,
} from "./smb-c3-receivables.js";
import { buildMilestoneSchedule } from "./smb-16-milestone-schedule.js";

/** The wave this file belongs to. Used only in assertion messages. */
const WAVE = "SMB-C3";

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..");

/** The frozen approved proposal the renovation's quantities and prices come from. */
const SMB_06_PROPOSAL = join(REPO_ROOT, "artifacts", "SMB-06", "approved-proposal-larkspur.md");

/** The frozen internal notes that state the rework figure. */
const SMB_15_NOTES = join(REPO_ROOT, "artifacts", "SMB-15", "internal-status-notes.md");

/** The figure artifacts/SMB-15 freezes, as prose and as integer cents. */
export const REWORK_PROSE = "$6,480.00";
export const REWORK_CENTS = 648000;

/** The contingency allowance the proposal carries, which the rework overran. */
export const CONTINGENCY_LINE_ID = "PLI-LDB-12";

// ------------------------------------------------------------------ SMB-20

/**
 * The six cost centres, in file order within a job. They are SMB-06's own rate
 * classes re-read as cost centres, which is what makes the quantity tie
 * possible at all.
 */
export const CREW_ROLES = ["design", "demolition", "plumbing", "carpentry", "paint", "project_management"];

/**
 * The studio's own hourly cost per role, in integer cents. These are NOT
 * SMB-06's day rates: those are what Larkspur charged, and a cost file priced
 * at the billed rate reports a margin of exactly zero and makes the whole
 * identity vacuous. The two are different numbers and the markup is visible
 * rather than implied.
 */
export const COST_RATE_CENTS = {
  design: 8750,
  demolition: 11250,
  plumbing: 7250,
  carpentry: 6500,
  paint: 5500,
  project_management: 9500,
};

/**
 * The anonymous crew slot per role, CRW-LDB-01 upward in role order. A slot is
 * stable within a role across the whole file, so the data answers "how many
 * cost centres were on this job" without seating anybody: it resolves to no
 * canon id and to no name string, and canon/people.md seats nobody at co-100.
 */
export const CREW_SLOTS = Object.fromEntries(
  CREW_ROLES.map((role, index) => [role, `CRW-LDB-${String(index + 1).padStart(2, "0")}`])
);

/**
 * The five SMB-06 day-rate lines a crew role ties to on the renovation, by
 * rate id. The tie is on QUANTITY at eight hours to the day, never on price.
 * Plumbing has no counterpart, because the proposal prices plumbing as a lot
 * and the studio self-performed the labour half of it (data plan U-G).
 */
export const SMB06_RATE_BY_ROLE = {
  design: "RTC-LDB-01",
  demolition: "RTC-LDB-02",
  carpentry: "RTC-LDB-09",
  paint: "RTC-LDB-10",
  project_management: "RTC-LDB-11",
};

/** A billed day is eight hours. The whole of the quantity tie is this constant. */
export const HOURS_PER_BILLED_DAY = 8;

/** `scope` vocabulary. A cost is contract scope or it is change-order scope. */
export const SCOPES = ["contract", "change_order"];

/**
 * The renovation's role windows, named so the window assertion is checkable
 * from the bytes rather than rhetorical. Every window is READ out of SMB-16's
 * emitted rows or SMB-04's stage dates; nothing here is a date.
 *
 * Carpentry and project management map to the whole delivery window rather
 * than to one milestone, and the reason is in the bytes: a carpenter frames
 * and blocks while the strip out finishes, and project management runs the
 * whole job by definition. The other four each map to one window, which is
 * what makes the assertion worth running.
 */
const OKAFOR_ROLE_WINDOWS = {
  design: { kind: "pre_kickoff" },
  demolition: { kind: "milestone", milestone_id: "MST-LDB-02", from: "actual_start", to: "actual_completion" },
  plumbing: { kind: "milestone", milestone_id: "MST-LDB-03", from: "actual_start", to: "actual_completion" },
  paint: { kind: "milestone", milestone_id: "MST-LDB-05", from: "planned_start", to: "planned_end" },
  carpentry: { kind: "delivery" },
  project_management: { kind: "delivery" },
};

/**
 * The time record, as weekly role totals. A row is a role's week on a job and
 * not one person's week, which is why 48 painter-hours fit one row.
 *
 * Every group's hours divide evenly into its week count, so a week's hours are
 * a whole number on every row (data plan R19). The renovation's six groups are
 * the plan's pinned table; the other five jobs' groups are designed to the
 * per-job hours, cost and row counts the plan pins, which TIME_TOTALS carries
 * and the builder asserts.
 */
const TIME_PLAN = {
  "JOB-LDB-01": [
    { crew_role: "design", scope: "contract", hours_per_week: 32, weeks: ["2026-02-06", "2026-02-13"] },
    { crew_role: "demolition", scope: "contract", hours_per_week: 16, weeks: ["2026-02-20", "2026-02-27"] },
    { crew_role: "plumbing", scope: "contract", hours_per_week: 48, weeks: ["2026-03-06", "2026-03-13"] },
    { crew_role: "carpentry", scope: "contract", hours_per_week: 72, weeks: ["2026-02-27", "2026-03-06", "2026-03-13", "2026-03-20", "2026-03-27"] },
    { crew_role: "paint", scope: "contract", hours_per_week: 48, weeks: ["2026-03-20"] },
    { crew_role: "project_management", scope: "contract", hours_per_week: 16, weeks: ["2026-02-20", "2026-02-27", "2026-03-06", "2026-03-13", "2026-03-20", "2026-03-27"] },
  ],
  "JOB-LDB-02": [
    { crew_role: "design", scope: "contract", hours_per_week: 16, weeks: ["2026-02-13"] },
    { crew_role: "demolition", scope: "contract", hours_per_week: 8, weeks: ["2026-02-13"] },
    { crew_role: "carpentry", scope: "contract", hours_per_week: 42, weeks: ["2026-02-20", "2026-02-27", "2026-03-06"] },
    { crew_role: "paint", scope: "contract", hours_per_week: 24, weeks: ["2026-03-13", "2026-03-20"] },
    { crew_role: "project_management", scope: "contract", hours_per_week: 14, weeks: ["2026-02-20", "2026-03-20"] },
  ],
  "JOB-LDB-03": [
    { crew_role: "design", scope: "contract", hours_per_week: 12, weeks: ["2026-02-06", "2026-02-13"] },
    { crew_role: "demolition", scope: "contract", hours_per_week: 24, weeks: ["2026-02-20"] },
    { crew_role: "plumbing", scope: "contract", hours_per_week: 16, weeks: ["2026-03-06"] },
    { crew_role: "carpentry", scope: "contract", hours_per_week: 44, weeks: ["2026-02-27", "2026-03-06", "2026-03-13"] },
    { crew_role: "paint", scope: "contract", hours_per_week: 24, weeks: ["2026-03-20"] },
    { crew_role: "project_management", scope: "contract", hours_per_week: 12, weeks: ["2026-02-20", "2026-03-20"] },
  ],
  "JOB-LDB-04": [
    { crew_role: "carpentry", scope: "contract", hours_per_week: 34, weeks: ["2026-02-13", "2026-02-20", "2026-02-27", "2026-03-06"] },
    { crew_role: "carpentry", scope: "change_order", hours_per_week: 22, weeks: ["2026-03-13"] },
    { crew_role: "paint", scope: "contract", hours_per_week: 20, weeks: ["2026-03-13", "2026-03-20"] },
    { crew_role: "project_management", scope: "contract", hours_per_week: 12, weeks: ["2026-02-20", "2026-03-20"] },
  ],
  "JOB-LDB-05": [
    { crew_role: "design", scope: "contract", hours_per_week: 16, weeks: ["2026-02-06", "2026-02-13"] },
    { crew_role: "demolition", scope: "contract", hours_per_week: 32, weeks: ["2026-02-20"] },
    { crew_role: "plumbing", scope: "contract", hours_per_week: 24, weeks: ["2026-03-06", "2026-03-13"] },
    { crew_role: "carpentry", scope: "contract", hours_per_week: 54, weeks: ["2026-02-27", "2026-03-06", "2026-03-13", "2026-03-20", "2026-03-27"] },
    { crew_role: "carpentry", scope: "change_order", hours_per_week: 60, weeks: ["2026-03-20"] },
    { crew_role: "project_management", scope: "contract", hours_per_week: 12, weeks: ["2026-02-20", "2026-03-20"] },
  ],
  "JOB-LDB-06": [
    { crew_role: "design", scope: "contract", hours_per_week: 12, weeks: ["2026-02-06"] },
    { crew_role: "plumbing", scope: "contract", hours_per_week: 12, weeks: ["2026-03-06"] },
    { crew_role: "carpentry", scope: "contract", hours_per_week: 38, weeks: ["2026-02-20", "2026-02-27", "2026-03-06"] },
    { crew_role: "carpentry", scope: "change_order", hours_per_week: 40, weeks: ["2026-03-20"] },
    { crew_role: "project_management", scope: "contract", hours_per_week: 8, weeks: ["2026-02-20", "2026-03-20"] },
  ],
};

/**
 * The per-job totals data plan 2.4 pins, in integer cents. `hours` is the
 * contract-scope hour count and `change_order_hours` is carried beside it, the
 * way the plan's own table pairs its columns.
 */
export const TIME_TOTALS = {
  "JOB-LDB-01": { hours: 696, contract_cents: 5132000, change_order_hours: 0, change_order_cents: 0, rows: 18 },
  "JOB-LDB-02": { hours: 226, contract_cents: 1579000, change_order_hours: 0, change_order_cents: 0, rows: 9 },
  "JOB-LDB-03": { hours: 244, contract_cents: 1814000, change_order_hours: 0, change_order_cents: 0, rows: 10 },
  "JOB-LDB-04": { hours: 200, contract_cents: 1332000, change_order_hours: 22, change_order_cents: 143000, rows: 9 },
  "JOB-LDB-05": { hours: 406, contract_cents: 2971000, change_order_hours: 60, change_order_cents: 390000, rows: 13 },
  "JOB-LDB-06": { hours: 154, contract_cents: 1085000, change_order_hours: 40, change_order_cents: 260000, rows: 8 },
};

/** The renovation's role hours, pinned, and the five that tie to SMB-06. */
export const OKAFOR_ROLE_HOURS = {
  design: 64, demolition: 32, plumbing: 96, carpentry: 360, paint: 48, project_management: 96,
};

// ------------------------------------------------------------------ SMB-21

/** The five job-cost categories and the three that are not job cost. */
export const JOB_COST_CATEGORIES = ["subcontract", "materials", "equipment_hire", "permit", "disposal"];
export const NON_JOB_CATEGORIES = ["office_overhead", "software_subscription", "personal"];
export const EXPENSE_CATEGORIES = [...JOB_COST_CATEGORIES, ...NON_JOB_CATEGORIES];

/** The two counterparties this file may name, and nothing else (data plan 2.5). */
export const SUBCONTRACT_COUNTERPARTY = "co-133";
export const MATERIALS_COUNTERPARTY = "co-134";

/**
 * The renovation's seven expense rows, exactly as data plan 2.5 pins them, in
 * the order of the approved proposal's own line items with the rework last.
 * `smb06_line_id` is the line each one costs; the rework row costs no line,
 * which is the whole point of it.
 */
const OKAFOR_EXPENSES = [
  { expense_date: "2026-03-04", category: "materials", counterparty: MATERIALS_COUNTERPARTY, smb06_line_id: "PLI-LDB-03", amount_cents: 420000, description: "plumbing fixtures and rough in materials", coded_by_role: "project lead" },
  { expense_date: "2026-03-13", category: "subcontract", counterparty: SUBCONTRACT_COUNTERPARTY, smb06_line_id: "PLI-LDB-04", amount_cents: 910000, description: "electrical rough in and device set", coded_by_role: "project lead" },
  { expense_date: "2026-03-16", category: "materials", counterparty: MATERIALS_COUNTERPARTY, smb06_line_id: "PLI-LDB-05", amount_cents: 1890000, description: "kitchen cabinetry supply", coded_by_role: "project lead" },
  { expense_date: "2026-03-20", category: "materials", counterparty: MATERIALS_COUNTERPARTY, smb06_line_id: "PLI-LDB-06", amount_cents: 585000, description: "quartz supply and fabrication", coded_by_role: "project lead" },
  { expense_date: "2026-03-19", category: "materials", counterparty: MATERIALS_COUNTERPARTY, smb06_line_id: "PLI-LDB-07", amount_cents: 610000, description: "tile supply, floor and wall", coded_by_role: "project lead" },
  { expense_date: "2026-03-17", category: "materials", counterparty: MATERIALS_COUNTERPARTY, smb06_line_id: "PLI-LDB-08", amount_cents: 788000, description: "primary bath fixtures and vanity", coded_by_role: "project lead" },
  // The C2 forward obligation, discharged. The amount is read out of
  // artifacts/SMB-15 rather than written here; the cell below is the pin.
  { expense_date: "2026-03-09", category: "subcontract", counterparty: SUBCONTRACT_COUNTERPARTY, smb06_line_id: null, amount_cents: REWORK_CENTS, description: "electrical rework, new sub feed to the panel", coded_by_role: "owner", rework: true },
];

/**
 * The other five jobs' expense rows and the three overhead rows, in job order
 * then expense_date order, designed to the per-job totals, row counts and
 * counterparty census the plan pins.
 *
 * JEX-LDB-12 is the miscode: a personal purchase at the studio's own materials
 * supplier, coded to a job that closed at the end of the quarter. It is found
 * by CATEGORY and not by counterparty, which twenty-one rows share, and not by
 * amount, which occurs nowhere else in the pack.
 */
const OTHER_EXPENSES = {
  "JOB-LDB-02": [
    { expense_date: "2026-02-13", category: "materials", counterparty: MATERIALS_COUNTERPARTY, amount_cents: 984000, description: "joinery panels and fixings", coded_by_role: "project lead" },
    { expense_date: "2026-02-20", category: "permit", counterparty: "", amount_cents: 48550, description: "building permit fee, paid by the studio", coded_by_role: "owner" },
    { expense_date: "2026-02-27", category: "materials", counterparty: MATERIALS_COUNTERPARTY, amount_cents: 625000, description: "flooring and underlay supply", coded_by_role: "project lead" },
    { expense_date: "2026-03-06", category: "materials", counterparty: MATERIALS_COUNTERPARTY, amount_cents: 405000, description: "lighting and fitting supply", coded_by_role: "project lead" },
    { expense_date: "2026-03-12", category: "personal", counterparty: MATERIALS_COUNTERPARTY, amount_cents: 128450, description: "patio set and two exterior doors for the owner's own house", coded_by_role: "owner", miscode: true },
  ],
  "JOB-LDB-03": [
    { expense_date: "2026-02-06", category: "materials", counterparty: MATERIALS_COUNTERPARTY, amount_cents: 540000, description: "kitchen cabinetry supply", coded_by_role: "project lead" },
    { expense_date: "2026-02-20", category: "subcontract", counterparty: SUBCONTRACT_COUNTERPARTY, amount_cents: 360000, description: "electrical first fix", coded_by_role: "project lead" },
    { expense_date: "2026-03-06", category: "materials", counterparty: MATERIALS_COUNTERPARTY, amount_cents: 425000, description: "tile and worktop supply", coded_by_role: "project lead" },
    { expense_date: "2026-03-13", category: "disposal", counterparty: "", amount_cents: 71000, description: "disposal runs, studio truck and tip charges", coded_by_role: "project lead" },
    { expense_date: "2026-03-20", category: "materials", counterparty: MATERIALS_COUNTERPARTY, amount_cents: 185000, description: "extra cabinetry run the client asked for", coded_by_role: "owner", scope: "change_order" },
  ],
  "JOB-LDB-04": [
    { expense_date: "2026-02-13", category: "materials", counterparty: MATERIALS_COUNTERPARTY, amount_cents: 438000, description: "bath fixtures and vanity supply", coded_by_role: "project lead" },
    { expense_date: "2026-02-27", category: "subcontract", counterparty: SUBCONTRACT_COUNTERPARTY, amount_cents: 325000, description: "electrical rough in, bath and landing", coded_by_role: "project lead" },
    { expense_date: "2026-03-06", category: "equipment_hire", counterparty: "", amount_cents: 95000, description: "scaffold tower and lift, from the studio plant pool", coded_by_role: "project lead" },
    { expense_date: "2026-03-17", category: "materials", counterparty: MATERIALS_COUNTERPARTY, amount_cents: 97000, description: "second heated rail and valves the client asked for", coded_by_role: "owner", scope: "change_order" },
  ],
  "JOB-LDB-05": [
    { expense_date: "2026-02-02", category: "materials", counterparty: MATERIALS_COUNTERPARTY, amount_cents: 860000, description: "cabinetry and joinery supply", coded_by_role: "project lead" },
    { expense_date: "2026-02-20", category: "materials", counterparty: MATERIALS_COUNTERPARTY, amount_cents: 675000, description: "glazing and external door supply", coded_by_role: "project lead" },
    { expense_date: "2026-03-04", category: "materials", counterparty: MATERIALS_COUNTERPARTY, amount_cents: 490000, description: "quartz worktop supply and fabrication", coded_by_role: "project lead" },
    { expense_date: "2026-03-11", category: "disposal", counterparty: "", amount_cents: 82000, description: "disposal runs, studio truck and tip charges", coded_by_role: "project lead" },
    { expense_date: "2026-03-18", category: "materials", counterparty: MATERIALS_COUNTERPARTY, amount_cents: 342000, description: "tile and flooring supply", coded_by_role: "project lead" },
    { expense_date: "2026-03-25", category: "subcontract", counterparty: SUBCONTRACT_COUNTERPARTY, amount_cents: 285000, description: "electrical for the added scope the client asked for", coded_by_role: "owner", scope: "change_order" },
  ],
  "JOB-LDB-06": [
    { expense_date: "2026-02-13", category: "materials", counterparty: MATERIALS_COUNTERPARTY, amount_cents: 410000, description: "framing and insulation supply", coded_by_role: "project lead" },
    { expense_date: "2026-02-27", category: "permit", counterparty: "", amount_cents: 45000, description: "building permit fee, paid by the studio", coded_by_role: "owner" },
    { expense_date: "2026-03-13", category: "materials", counterparty: MATERIALS_COUNTERPARTY, amount_cents: 290000, description: "plasterboard and finish supply", coded_by_role: "project lead" },
    { expense_date: "2026-03-20", category: "materials", counterparty: MATERIALS_COUNTERPARTY, amount_cents: 50000, description: "extra door and ironmongery the client asked for", coded_by_role: "owner", scope: "change_order" },
  ],
};

/** The three overhead rows, which carry no job code and are not job cost. */
const OVERHEAD_EXPENSES = [
  { expense_date: "2026-02-27", category: "office_overhead", counterparty: "", amount_cents: 245000, description: "studio rent and utilities, February", coded_by_role: "owner" },
  { expense_date: "2026-03-02", category: "software_subscription", counterparty: "", amount_cents: 34800, description: "estimating and scheduling software, quarterly", coded_by_role: "owner" },
  { expense_date: "2026-03-27", category: "office_overhead", counterparty: "", amount_cents: 245000, description: "studio rent and utilities, March", coded_by_role: "owner" },
];

/** The per-job expense totals data plan 2.5 pins, in integer cents. */
export const EXPENSE_TOTALS = {
  "JOB-LDB-01": { contract_cents: 5851000, change_order_cents: 0, rows: 7 },
  "JOB-LDB-02": { contract_cents: 2191000, change_order_cents: 0, rows: 5 },
  "JOB-LDB-03": { contract_cents: 1396000, change_order_cents: 185000, rows: 5 },
  "JOB-LDB-04": { contract_cents: 858000, change_order_cents: 97000, rows: 4 },
  "JOB-LDB-05": { contract_cents: 2449000, change_order_cents: 285000, rows: 6 },
  "JOB-LDB-06": { contract_cents: 745000, change_order_cents: 50000, rows: 4 },
};

// ------------------------------------------------------------------ SMB-22

/** The change order each job is carrying at the as-of date, in job order. */
export const OPEN_CHANGE_ORDERS = {
  "JOB-LDB-01": "",
  "JOB-LDB-02": "",
  "JOB-LDB-03": "CHO-LDB-01",
  "JOB-LDB-04": "CHO-LDB-02",
  "JOB-LDB-05": "CHO-LDB-03",
  "JOB-LDB-06": "CHO-LDB-04",
};

/** The integer percentage complete each job reports at the as-of date. */
export const PERCENT_COMPLETE = {
  "JOB-LDB-01": 100,
  "JOB-LDB-02": 100,
  "JOB-LDB-03": 60,
  "JOB-LDB-04": 80,
  "JOB-LDB-05": 75,
  "JOB-LDB-06": 50,
};

/**
 * The four generated jobs' windows, pinned here; the two already-recorded jobs
 * read theirs out of their client records at build time (T-F12). Every one is
 * a weekday and every generated planned end is after the as-of date, which is
 * what "still running" means for a job under 100 percent complete.
 */
export const GENERATED_JOB_WINDOWS = {
  "JOB-LDB-03": { start_date: "2026-02-02", planned_end_date: "2026-05-08" },
  "JOB-LDB-04": { start_date: "2026-02-09", planned_end_date: "2026-04-13" },
  "JOB-LDB-05": { start_date: "2026-02-02", planned_end_date: "2026-04-24" },
  "JOB-LDB-06": { start_date: "2026-02-02", planned_end_date: "2026-05-29" },
};

/** The two already-recorded jobs read their window off a stage pair. */
const FROZEN_JOB_WINDOWS = {
  "JOB-LDB-01": { record: "SMB-04", start_stage: "kickoff", end_stage: "closeout" },
  "JOB-LDB-02": { record: "SMB-05", start_stage: "kickoff", end_stage: "closeout" },
};

/** The scope phrase each generated job's project name carries. */
const GENERATED_PROJECT_SCOPES = {
  "JOB-LDB-03": "kitchen and pantry renovation",
  "JOB-LDB-04": "primary bath renovation",
  "JOB-LDB-05": "rear extension and kitchen renovation",
  "JOB-LDB-06": "garage conversion and utility room",
};

/**
 * The three thresholds, carried on every row so a rule reads from the file
 * rather than from a lesson, and all three exact integers (R-CENTS).
 */
export const CHANGE_ORDER_MATERIALITY_CENTS = 500000;
export const MARGIN_FLOOR_BP = 1500;
export const ON_TRACK_TOLERANCE_PCT = 8;

// ---------------------------------------------------------------- the headers

export const TIME_COLUMNS = [
  "entry_id", "week_ending", "job_id", "scope", "change_order_id", "crew_role",
  "crew_slot", "hours", "cost_rate_usd", "entry_cost_usd", "record_type",
];

export const EXPENSE_COLUMNS = [
  "expense_id", "expense_date", "job_id", "scope", "change_order_id", "expense_category",
  "counterparty_canon_id", "counterparty_name", "description", "amount_usd",
  "coded_by_role", "record_type",
];

export const PROGRESS_COLUMNS = [
  "job_id", "client_canon_id", "client_name", "project_name", "start_date",
  "planned_end_date", "as_of_date", "contract_value_usd", "percent_complete",
  "billed_to_date_usd", "accrued_unbilled_usd", "revenue_to_date_usd", "time_cost_usd",
  "expense_cost_usd", "contract_margin_usd", "open_change_order_id",
  "open_change_order_value_usd", "change_order_materiality_usd", "margin_floor_bp",
  "on_track_tolerance_pct",
];

export const TIME_TARGET_ROWS = 67;
export const EXPENSE_TARGET_ROWS = 34;
export const PROGRESS_TARGET_ROWS = 6;

/** Data plan 2.4's census. */
export const TIME_CENSUS = {
  rows: TIME_TARGET_ROWS,
  jobs: 6,
  roles: 6,
  crew_slots: 6,
  contract_rows: 64,
  change_order_rows: 3,
  jobs_with_change_order_time: 3,
  contract_hours: 1926,
  change_order_hours: 122,
  contract_cents: 13913000,
  change_order_cents: 793000,
  week_endings: 8,
  smb06_tied_roles: 5,
  okafor_billed_days: 75,
  okafor_tied_hours: 600,
};

/** Data plan 2.5's census, every line of it. */
export const EXPENSE_CENSUS = {
  rows: EXPENSE_TARGET_ROWS,
  job_coded: 31,
  overhead: 3,
  materials_counterparty: 21,
  subcontract_counterparty: 5,
  internal: 8,
  internal_job_costs: 5,
  materials: 20,
  subcontract: 5,
  personal: 1,
  office_overhead: 2,
  software_subscription: 1,
  permit: 2,
  disposal: 2,
  equipment_hire: 1,
  outside_the_job_cost_set: 4,
  miscoded_to_a_job: 1,
  change_order_rows: 4,
  contract_cents: 13490000,
  change_order_cents: 617000,
  okafor_cost_bearing_lines: 6,
};

/** Data plan 2.6's census. */
export const PROGRESS_CENSUS = {
  rows: PROGRESS_TARGET_ROWS,
  open_change_orders: 4,
  material_change_orders: 1,
  on_track: 5,
  on_track_with_a_change_order: 3,
  controls: 1,
  no_open_change_order: 2,
  negative_accruals: 1,
  floor_crossers: 1,
  change_order_value_cents: 1410000,
};

/**
 * The six rows data plan 2.6 pins, in integer cents. Every money value below
 * is SUMMED from the emitted SMB-17, SMB-20 and SMB-21 rows first and then
 * held against this table, so a sum that drifts fails with the column and both
 * values rather than shipping a plausible snapshot nobody notices.
 */
export const PINNED_PROGRESS = [
  { job_id: "JOB-LDB-01", contract_cents: 14850000, percent_complete: 100, billed_cents: 14850000, accrued_cents: 0, revenue_cents: 14850000, time_cents: 5132000, expense_cents: 5851000, margin_cents: 3867000, change_order_cents: 0 },
  { job_id: "JOB-LDB-02", contract_cents: 4620000, percent_complete: 100, billed_cents: 4620000, accrued_cents: 0, revenue_cents: 4620000, time_cents: 1579000, expense_cents: 2191000, margin_cents: 850000, change_order_cents: 0 },
  { job_id: "JOB-LDB-03", contract_cents: 7150000, percent_complete: 60, billed_cents: 3932500, accrued_cents: 357500, revenue_cents: 4290000, time_cents: 1814000, expense_cents: 1396000, margin_cents: 1080000, change_order_cents: 185000 },
  { job_id: "JOB-LDB-04", contract_cents: 3850000, percent_complete: 80, billed_cents: 2887500, accrued_cents: 192500, revenue_cents: 3080000, time_cents: 1332000, expense_cents: 858000, margin_cents: 890000, change_order_cents: 240000 },
  { job_id: "JOB-LDB-05", contract_cents: 8800000, percent_complete: 75, billed_cents: 6160000, accrued_cents: 440000, revenue_cents: 6600000, time_cents: 2971000, expense_cents: 2449000, margin_cents: 1180000, change_order_cents: 675000 },
  { job_id: "JOB-LDB-06", contract_cents: 5400000, percent_complete: 50, billed_cents: 3240000, accrued_cents: -540000, revenue_cents: 2700000, time_cents: 1085000, expense_cents: 745000, margin_cents: 870000, change_order_cents: 310000 },
];

// ------------------------------------------------------------------- helpers

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const FRIDAY = 5;

/**
 * One row in `columns` order from a plain values map. Throws on a key the
 * header does not declare and on a column the map does not carry, the C1
 * `ordered()` convention. One factory rather than three copies.
 */
function rowFactory(specId, columns) {
  return function row(values) {
    const carried = Object.keys(values);
    const missing = columns.filter((name) => !carried.includes(name));
    const extra = carried.filter((name) => !columns.includes(name));
    if (missing.length > 0 || extra.length > 0) {
      throw new Error(
        `${specId}: row key set disagrees with the header. `
        + `missing [${missing.join(", ")}], extra [${extra.join(", ")}]`
      );
    }
    const out = {};
    for (const name of columns) out[name] = values[name];
    return out;
  };
}

/** How many entries satisfy `predicate`. */
const count = (rows, predicate) => rows.filter(predicate).length;

/** Assert an equality with a label, the census convention: never a floor. */
function expect(specId, label, actual, wanted) {
  if (actual !== wanted) throw new Error(`${specId}: ${label} is ${actual}, expected ${wanted}`);
}

/** No em dash and no en dash reaches a cell. */
function assertNoDash(where, row) {
  for (const [column, value] of Object.entries(row)) {
    for (const dash of ["\u2014", "\u2013"]) {
      if (value.includes(dash)) throw new Error(`${where} carries an em dash or an en dash in ${column}`);
    }
  }
}

/** A date somebody chose rather than a term computed (data plan R20). */
function assertWeekday(specId, label, isoDate) {
  if (!ISO_DATE.test(isoDate)) throw new Error(`${specId}: ${label} "${isoDate}" is not an ISO date`);
  const day = weekday(isoDate);
  if (day === 0 || day === 6) {
    throw new Error(`${specId}: ${label} ${isoDate} falls on a weekend, and it is a date somebody chose`);
  }
}

/** The latest Friday strictly before `isoDate`. */
function fridayBefore(isoDate) {
  let date = addDays(isoDate, -1);
  while (weekday(date) !== FRIDAY) date = addDays(date, -1);
  return date;
}

// --------------------------------------------------------- the frozen reads

/**
 * A pipe table out of a frozen markdown document, keyed by its header cells
 * with the backticks stripped. Parsed rather than retyped, so an edit to the
 * document fails loudly here instead of leaving this pack quietly disagreeing
 * with it.
 */
function markdownTable(text, headerCell, where) {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.trim().startsWith("|") && cellsOf(line)[0] === headerCell);
  if (start === -1) throw new Error(`${where}: no pipe table carries a "${headerCell}" header cell`);
  const header = cellsOf(lines[start]);
  const rows = [];
  for (let i = start + 2; i < lines.length; i += 1) {
    if (!lines[i].trim().startsWith("|")) break;
    const cells = cellsOf(lines[i]);
    if (cells.length !== header.length) {
      throw new Error(`${where}: a "${headerCell}" table row carries ${cells.length} cells and the header carries ${header.length}`);
    }
    rows.push(Object.fromEntries(header.map((name, j) => [name, cells[j]])));
  }
  if (rows.length === 0) throw new Error(`${where}: the "${headerCell}" table carries no rows`);
  return rows;
}

const cellsOf = (line) => line.trim()
  .replace(/^\|/, "")
  .replace(/\|$/, "")
  .split("|")
  .map((cell) => cell.trim().replace(/^`(.*)`$/, "$1").trim());

/** The approved proposal's twelve line items and twelve rate rows, read once. */
export function proposal() {
  const text = readFileSync(SMB_06_PROPOSAL, "utf8");
  const lines = markdownTable(text, "line_id", "SMB-06");
  const rates = markdownTable(text, "rate_id", "SMB-06");
  if (lines.length !== 12 || rates.length !== 12) {
    throw new Error(`SMB-06 now carries ${lines.length} line items and ${rates.length} rate rows, and this cluster reads twelve of each`);
  }
  const rateById = new Map(rates.map((rate) => [rate.rate_id, rate]));
  const items = lines.map((line) => {
    const rate = rateById.get(line.rate_id);
    if (!rate) throw new Error(`SMB-06: ${line.line_id} cites the rate ${line.rate_id}, which the appendix does not carry`);
    const quantity = Number(line.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(`SMB-06: ${line.line_id} carries the quantity "${line.quantity}"`);
    }
    const line_total_cents = toCents(line.line_total_usd);
    if (quantity * toCents(line.unit_rate_usd) !== line_total_cents) {
      throw new Error(`SMB-06: ${line.line_id}'s line total is not its quantity times its unit rate`);
    }
    return {
      line_id: line.line_id,
      rate_id: line.rate_id,
      rate_class: rate.rate_class,
      unit: line.unit,
      quantity,
      line_total_cents,
    };
  });
  return items;
}

/**
 * The six proposal lines that carry an external cost: every `subcontract` and
 * `materials` line. The five `labour` lines are costed in SMB-20 and the one
 * `allowance` line is a billed allowance rather than a cost.
 */
export function costBearingLines(items) {
  const bearing = items.filter((item) => ["subcontract", "materials"].includes(item.rate_class));
  if (bearing.length !== EXPENSE_CENSUS.okafor_cost_bearing_lines) {
    throw new Error(
      `SMB-06 now carries ${bearing.length} subcontract and materials lines and this cluster costs `
      + `${EXPENSE_CENSUS.okafor_cost_bearing_lines} of them`
    );
  }
  return bearing;
}

/**
 * The rework figure, re-read out of the frozen internal notes. The notes state
 * it once in prose; if that ever stops being true this throws rather than
 * letting SMB-21 carry a figure the document no longer freezes.
 */
export function reworkCents() {
  const text = readFileSync(SMB_15_NOTES, "utf8");
  const hits = text.split(REWORK_PROSE).length - 1;
  if (hits !== 1) {
    throw new Error(
      `${WAVE}: artifacts/SMB-15 states ${REWORK_PROSE} ${hits} times and this cluster reads it exactly once. `
      + "The expense row and the internal notes cannot both be right."
    );
  }
  return REWORK_CENTS;
}

/** The contingency allowance the rework overran, read off the proposal. */
export function contingencyCents(items) {
  const line = items.find((item) => item.line_id === CONTINGENCY_LINE_ID);
  if (!line) throw new Error(`SMB-06 no longer carries ${CONTINGENCY_LINE_ID}, the contingency allowance`);
  if (line.rate_class !== "allowance") {
    throw new Error(`SMB-06: ${CONTINGENCY_LINE_ID} is now a ${line.rate_class} line and this cluster reads it as an allowance`);
  }
  return line.line_total_cents;
}

/**
 * The renovation's role windows, derived from SMB-16's emitted schedule and
 * SMB-04's stage dates. Nothing here is a typed date.
 */
export function okaforWindows(canon) {
  const schedule = new Map(buildMilestoneSchedule({ canon }).map((m) => [m.milestone_id, m]));
  const record = frozenRecords(canon)["SMB-04"];
  const stage = (name) => {
    const found = record.stages.find((s) => s.stage === name);
    if (!found) throw new Error(`${WAVE}: SMB-04 no longer carries the stage "${name}"`);
    return found.event_date;
  };
  const milestone = (milestoneId) => {
    const found = schedule.get(milestoneId);
    if (!found) throw new Error(`${WAVE}: SMB-16 no longer carries ${milestoneId}`);
    return found;
  };
  const delivery = {
    from: milestone("MST-LDB-01").actual_start,
    to: milestone("MST-LDB-06").planned_end,
  };

  const windows = {};
  for (const [role, source] of Object.entries(OKAFOR_ROLE_WINDOWS)) {
    if (source.kind === "delivery") {
      windows[role] = { ...delivery };
    } else if (source.kind === "pre_kickoff") {
      // Design development runs before the crew arrives: from the day the
      // proposal was approved to the Friday before kickoff.
      windows[role] = { from: stage("proposal_approved"), to: fridayBefore(stage("kickoff")) };
    } else {
      const row = milestone(source.milestone_id);
      const from = row[source.from];
      const to = row[source.to];
      if (from === "" || to === "") {
        throw new Error(`${WAVE}: ${source.milestone_id} carries no ${from === "" ? source.from : source.to}, so ${role} has no window`);
      }
      windows[role] = { from, to };
    }
    if (windows[role].from > windows[role].to) {
      throw new Error(`${WAVE}: the ${role} window runs backwards, ${windows[role].from} to ${windows[role].to}`);
    }
  }
  return windows;
}

/** The six job windows: two read off a client record, four pinned. */
export function jobWindows(canon) {
  const records = frozenRecords(canon);
  const out = {};
  for (const job of JOBS) {
    const frozen = FROZEN_JOB_WINDOWS[job.job_id];
    if (frozen) {
      const record = records[frozen.record];
      const dateOf = (name) => {
        const stage = record.stages.find((s) => s.stage === name);
        if (!stage) throw new Error(`${WAVE}: ${frozen.record} no longer carries the stage "${name}", which ${job.job_id} reads its window from`);
        return stage.event_date;
      };
      out[job.job_id] = { start_date: dateOf(frozen.start_stage), planned_end_date: dateOf(frozen.end_stage) };
    } else {
      out[job.job_id] = { ...GENERATED_JOB_WINDOWS[job.job_id] };
    }
    const window = out[job.job_id];
    assertWeekday("SMB-22", `${job.job_id} start_date`, window.start_date);
    assertWeekday("SMB-22", `${job.job_id} planned_end_date`, window.planned_end_date);
    if (window.planned_end_date <= window.start_date) {
      throw new Error(`SMB-22: ${job.job_id} is planned to end on ${window.planned_end_date}, at or before its own start`);
    }
  }
  return out;
}

// ------------------------------------------------------------------ builders

/**
 * SMB-20. Sixty-seven weekly role totals, in job order then role order then
 * scope order then week_ending order.
 *
 * @param {Map} canon canon companies lookup
 * @returns {object[]} the time record
 */
export function buildTimeEntries({ canon }) {
  const row = rowFactory("SMB-20", TIME_COLUMNS);
  const population = new Map(jobPopulation(canon).map((job) => [job.job_id, job]));
  const windows = jobWindows(canon);
  const okafor = okaforWindows(canon);
  const items = proposal();

  const rows = [];
  for (const job of JOBS) {
    const groups = TIME_PLAN[job.job_id];
    if (!groups) throw new Error(`SMB-20: ${job.job_id} carries no time at all`);
    const ordered = [...groups].sort((a, b) => (
      CREW_ROLES.indexOf(a.crew_role) - CREW_ROLES.indexOf(b.crew_role)
      || SCOPES.indexOf(a.scope) - SCOPES.indexOf(b.scope)
    ));
    for (const group of ordered) {
      const rate = COST_RATE_CENTS[group.crew_role];
      if (rate === undefined) throw new Error(`SMB-20: "${group.crew_role}" is not a crew role`);
      if (!SCOPES.includes(group.scope)) throw new Error(`SMB-20: "${group.scope}" is not a scope`);
      if (!Number.isInteger(group.hours_per_week) || group.hours_per_week <= 0) {
        throw new Error(`SMB-20: ${job.job_id} ${group.crew_role} carries ${group.hours_per_week} hours a week`);
      }
      const weeks = [...group.weeks].sort();
      if (weeks.join(",") !== group.weeks.join(",")) {
        throw new Error(`SMB-20: ${job.job_id} ${group.crew_role} lists its weeks out of order`);
      }
      if (new Set(weeks).size !== weeks.length) {
        throw new Error(`SMB-20: ${job.job_id} ${group.crew_role} carries the same week twice in one scope`);
      }
      for (const weekEnding of weeks) {
        rows.push(row({
          entry_id: `TME-LDB-${String(rows.length + 1).padStart(2, "0")}`,
          week_ending: weekEnding,
          job_id: job.job_id,
          scope: group.scope,
          change_order_id: group.scope === "change_order" ? OPEN_CHANGE_ORDERS[job.job_id] : "",
          crew_role: group.crew_role,
          crew_slot: CREW_SLOTS[group.crew_role],
          hours: String(group.hours_per_week),
          cost_rate_usd: cents(rate),
          entry_cost_usd: cents(group.hours_per_week * rate),
          record_type: MOCK_RECORD_TYPE,
        }));
      }
    }
  }

  assertTimeEntries(rows, population, windows, okafor, items);
  return rows;
}

/**
 * SMB-21. Thirty-four expense rows: thirty-one coded to a job and three
 * overhead rows carrying no job code.
 *
 * File order is job order, and inside the renovation the approved proposal's
 * own line order with the rework row last, because those seven rows are one
 * per proposal line plus the one cost no line covers; inside every other job it
 * is expense_date order. The three overhead rows come last.
 */
export function buildJobExpenses({ canon }) {
  const row = rowFactory("SMB-21", EXPENSE_COLUMNS);
  const windows = jobWindows(canon);
  const items = proposal();
  const bearing = costBearingLines(items);
  const bearingById = new Map(bearing.map((item) => [item.line_id, item]));
  const rework = reworkCents();

  const counterpartyName = (canonId) => {
    if (canonId === "") return "";
    const seated = canon.get(canonId);
    if (!seated) throw new Error(`SMB-21: ${canonId} is not seated in canon/companies.md`);
    return seated.name;
  };

  const designed = [];
  for (const job of JOBS) {
    const source = job.job_id === "JOB-LDB-01" ? OKAFOR_EXPENSES : OTHER_EXPENSES[job.job_id];
    if (!source) throw new Error(`SMB-21: ${job.job_id} carries no expense at all`);
    if (job.job_id !== "JOB-LDB-01") {
      const dates = source.map((expense) => expense.expense_date);
      if (dates.join(",") !== [...dates].sort().join(",")) {
        throw new Error(`SMB-21: ${job.job_id} lists its expenses out of date order`);
      }
    }
    for (const expense of source) {
      let amount = expense.amount_cents;
      if (expense.rework) {
        // The pin: the amount is the document's, not this file's.
        if (amount !== rework) {
          throw new Error(`SMB-21: the rework row carries ${cents(amount)} and artifacts/SMB-15 states ${cents(rework)}`);
        }
        amount = rework;
      }
      if (expense.smb06_line_id) {
        const line = bearingById.get(expense.smb06_line_id);
        if (!line) throw new Error(`SMB-21: an expense costs ${expense.smb06_line_id}, which is not a cost-bearing proposal line`);
        // T-E5: the cost is strictly below the line the client was billed.
        if (amount >= line.line_total_cents) {
          throw new Error(
            `SMB-21: the ${expense.smb06_line_id} cost of ${cents(amount)} is not below the billed line total `
            + `of ${cents(line.line_total_cents)}, so that line carries no margin at all`
          );
        }
      }
      designed.push({ job_id: job.job_id, ...expense, amount_cents: amount });
    }
  }
  for (const expense of OVERHEAD_EXPENSES) designed.push({ job_id: "", ...expense });

  const rows = designed.map((expense, index) => {
    const scope = expense.job_id === "" ? "" : (expense.scope ?? "contract");
    if (scope !== "" && !SCOPES.includes(scope)) throw new Error(`SMB-21: "${scope}" is not a scope`);
    if (!EXPENSE_CATEGORIES.includes(expense.category)) {
      throw new Error(`SMB-21: "${expense.category}" is not an expense category`);
    }
    if (!RECORD_OWNER_ROLES.includes(expense.coded_by_role)) {
      throw new Error(`SMB-21: "${expense.coded_by_role}" is outside the record owner role vocabulary`);
    }
    return row({
      expense_id: `JEX-LDB-${String(index + 1).padStart(2, "0")}`,
      expense_date: expense.expense_date,
      job_id: expense.job_id,
      scope,
      change_order_id: scope === "change_order" ? OPEN_CHANGE_ORDERS[expense.job_id] : "",
      expense_category: expense.category,
      counterparty_canon_id: expense.counterparty,
      counterparty_name: counterpartyName(expense.counterparty),
      description: expense.description,
      amount_usd: cents(expense.amount_cents),
      coded_by_role: expense.coded_by_role,
      record_type: MOCK_RECORD_TYPE,
    });
  });

  assertJobExpenses(rows, windows, bearing, items, rework);
  return rows;
}

/**
 * SMB-22. Six jobs at the as-of date. Every money column that could be typed is
 * summed from the emitted register, time record and expense export first, and
 * the pinned table is held against those sums rather than used as their source.
 */
export function buildJobProgress({ canon }) {
  const row = rowFactory("SMB-22", PROGRESS_COLUMNS);
  const population = new Map(jobPopulation(canon).map((job) => [job.job_id, job]));
  const windows = jobWindows(canon);
  const records = frozenRecords(canon);

  const register = buildInvoiceRegister({ canon });
  const time = buildTimeEntries({ canon });
  const expenses = buildJobExpenses({ canon });

  const sumBy = (rows, jobId, predicate, column) => rows
    .filter((r) => r.job_id === jobId && predicate(r))
    .reduce((total, r) => total + toCents(r[column]), 0);

  const rows = JOBS.map((job) => {
    const seat = population.get(job.job_id);
    const window = windows[job.job_id];
    const percent = PERCENT_COMPLETE[job.job_id];
    if (!Number.isInteger(percent) || percent <= 0 || percent > 100) {
      throw new Error(`SMB-22: ${job.job_id} reports ${percent} percent complete`);
    }

    // T-F4, T-F5 and T-F6: sums over the emitted rows, never constants.
    const billedCents = register
      .filter((r) => r.job_id === job.job_id)
      .reduce((total, r) => total + toCents(r.invoice_amount_usd), 0);
    const timeCents = sumBy(time, job.job_id, (r) => r.scope === "contract", "entry_cost_usd");
    const expenseCents = sumBy(expenses, job.job_id, (r) => r.scope === "contract", "amount_usd");
    const changeOrderCents = sumBy(time, job.job_id, (r) => r.scope === "change_order", "entry_cost_usd")
      + sumBy(expenses, job.job_id, (r) => r.scope === "change_order", "amount_usd");

    // T-F2: the earned revenue is exact, so the identity carries no rounding.
    const earned = seat.contract_cents * percent;
    if (earned % 100 !== 0) {
      throw new Error(`SMB-22: ${job.job_id} earns ${earned / 100} cents at ${percent} percent, which is not a whole cent`);
    }
    const revenueCents = earned / 100;
    const accruedCents = revenueCents - billedCents;
    const marginCents = revenueCents - timeCents - expenseCents;

    const openChangeOrder = OPEN_CHANGE_ORDERS[job.job_id];
    if (openChangeOrder === undefined) throw new Error(`SMB-22: ${job.job_id} does not say whether it carries a change order`);
    if ((openChangeOrder !== "") !== (changeOrderCents > 0)) {
      throw new Error(
        `SMB-22: ${job.job_id} carries the change order "${openChangeOrder}" against `
        + `${cents(changeOrderCents)} of change-order cost in SMB-20 and SMB-21`
      );
    }

    return row({
      job_id: job.job_id,
      client_canon_id: seat.client_canon_id,
      client_name: seat.client_name,
      project_name: projectNameFor(job.job_id, seat, records),
      start_date: window.start_date,
      planned_end_date: window.planned_end_date,
      as_of_date: AS_OF_DATE,
      contract_value_usd: cents(seat.contract_cents),
      percent_complete: String(percent),
      billed_to_date_usd: cents(billedCents),
      accrued_unbilled_usd: cents(accruedCents),
      revenue_to_date_usd: cents(revenueCents),
      time_cost_usd: cents(timeCents),
      expense_cost_usd: cents(expenseCents),
      contract_margin_usd: cents(marginCents),
      open_change_order_id: openChangeOrder,
      open_change_order_value_usd: cents(changeOrderCents),
      change_order_materiality_usd: cents(CHANGE_ORDER_MATERIALITY_CENTS),
      margin_floor_bp: String(MARGIN_FLOOR_BP),
      on_track_tolerance_pct: String(ON_TRACK_TOLERANCE_PCT),
    });
  });

  assertJobProgress(rows, register, time, expenses, records);
  return rows;
}

/**
 * The project a job is. The two already-recorded jobs read theirs out of the
 * client record (T-F12); the four generated ones name the drawn household and
 * the scope, so the file reads the same way on all six rows.
 */
function projectNameFor(jobId, seat, records) {
  const frozen = FROZEN_JOB_WINDOWS[jobId];
  if (frozen) {
    const name = records[frozen.record].client.project_name;
    if (name.trim() === "") throw new Error(`SMB-22: ${frozen.record} carries no project_name for ${jobId}`);
    return name;
  }
  const scope = GENERATED_PROJECT_SCOPES[jobId];
  if (!scope) throw new Error(`SMB-22: ${jobId} has no project scope`);
  const household = /^The (\S+) household$/.exec(seat.client_name);
  if (!household) {
    throw new Error(`SMB-22: ${jobId}'s client is "${seat.client_name}", which is not a household this file can name a project after`);
  }
  return `${household[1]} ${scope}`;
}

// ---------------------------------------------------------------- assertions
//
// Every census number and both cardinalities of P4, P5 and P6, asserted before
// a builder returns. The public test re-derives each of them from the emitted
// bytes with a second implementation and imports nothing from here.

function assertTimeEntries(rows, population, windows, okafor, items) {
  const id = "SMB-20";
  expect(id, "the row count", rows.length, TIME_CENSUS.rows);

  const ids = rows.map((r) => r.entry_id);
  if (new Set(ids).size !== ids.length) throw new Error(`${id}: an entry id repeats`);
  for (const [i, value] of ids.entries()) {
    if (value !== `TME-LDB-${String(i + 1).padStart(2, "0")}`) {
      throw new Error(`${id}: the entry ids are not gapless from 01 at file position ${i + 1}`);
    }
  }

  for (const r of rows) {
    const where = `${id}: ${r.entry_id}`;
    if (!CREW_ROLES.includes(r.crew_role)) throw new Error(`${where} carries crew_role "${r.crew_role}"`);
    if (r.crew_slot !== CREW_SLOTS[r.crew_role]) throw new Error(`${where} carries a slot its own role does not`);
    if (r.record_type !== MOCK_RECORD_TYPE) throw new Error(`${where} carries record_type "${r.record_type}"`);
    if (!SCOPES.includes(r.scope)) throw new Error(`${where} carries scope "${r.scope}"`);
    // T-D6: the change-order id is on exactly the change-order rows.
    if ((r.change_order_id !== "") !== (r.scope === "change_order")) {
      throw new Error(`${where} carries change_order_id "${r.change_order_id}" against a scope of "${r.scope}"`);
    }
    if (r.change_order_id !== "" && r.change_order_id !== OPEN_CHANGE_ORDERS[r.job_id]) {
      throw new Error(`${where} cites ${r.change_order_id} and its job carries ${OPEN_CHANGE_ORDERS[r.job_id]}`);
    }
    // T-D2 and T-D3: the rate is the role's and the cost is the multiplication.
    const rate = COST_RATE_CENTS[r.crew_role];
    if (toCents(r.cost_rate_usd) !== rate) throw new Error(`${where} prices ${r.crew_role} at ${r.cost_rate_usd}`);
    const hours = Number(r.hours);
    if (!Number.isInteger(hours) || hours <= 0) throw new Error(`${where} carries ${r.hours} hours`);
    if (toCents(r.entry_cost_usd) !== hours * rate) {
      throw new Error(`${where} costs ${r.entry_cost_usd} for ${hours} hours at ${r.cost_rate_usd}`);
    }
    // T-D7: a week ends on a Friday, inside the reporting window.
    if (weekday(r.week_ending) !== FRIDAY) throw new Error(`${where} ends its week on ${r.week_ending}, which is not a Friday`);
    if (r.week_ending > AS_OF_DATE) throw new Error(`${where} is dated ${r.week_ending}, after the as-of date`);
    if (!population.has(r.job_id)) throw new Error(`${where} is coded to ${r.job_id}, which is not a job`);
    assertNoDash(where, r);
  }

  // T-D3 as a property of the file rather than of a row: one rate per role.
  for (const role of CREW_ROLES) {
    const rates = new Set(rows.filter((r) => r.crew_role === role).map((r) => r.cost_rate_usd));
    if (rates.size > 1) throw new Error(`${id}: ${role} is priced at ${[...rates].join(" and ")} in the same file`);
  }
  expect(id, "the crew slot count", new Set(rows.map((r) => r.crew_slot)).size, TIME_CENSUS.crew_slots);
  expect(id, "the crew role count", new Set(rows.map((r) => r.crew_role)).size, TIME_CENSUS.roles);
  expect(id, "the job count", new Set(rows.map((r) => r.job_id)).size, TIME_CENSUS.jobs);
  expect(id, "the week_ending count", new Set(rows.map((r) => r.week_ending)).size, TIME_CENSUS.week_endings);
  expect(id, "the contract-scope row count", count(rows, (r) => r.scope === "contract"), TIME_CENSUS.contract_rows);
  expect(id, "the change-order row count", count(rows, (r) => r.scope === "change_order"), TIME_CENSUS.change_order_rows);
  expect(
    id, "the count of jobs carrying change-order time",
    new Set(rows.filter((r) => r.scope === "change_order").map((r) => r.job_id)).size,
    TIME_CENSUS.jobs_with_change_order_time
  );

  // File order is job order, then role order, then scope order, then week.
  const rank = (r) => [
    JOBS.findIndex((job) => job.job_id === r.job_id),
    CREW_ROLES.indexOf(r.crew_role),
    SCOPES.indexOf(r.scope),
    r.week_ending,
  ];
  for (let i = 1; i < rows.length; i += 1) {
    const before = rank(rows[i - 1]);
    const after = rank(rows[i]);
    const ordered = before.some((value, j) => value < after[j] && before.slice(0, j).every((v, k) => v === after[k]));
    if (!ordered) throw new Error(`${id}: ${rows[i].entry_id} is out of file order behind ${rows[i - 1].entry_id}`);
  }

  // T-D5: every per-job hour and cost total, asserted as an equality.
  let contractHours = 0;
  let contractCents = 0;
  let changeOrderHours = 0;
  let changeOrderCents = 0;
  for (const [jobId, wanted] of Object.entries(TIME_TOTALS)) {
    const jobRows = rows.filter((r) => r.job_id === jobId);
    expect(id, `${jobId}'s row count`, jobRows.length, wanted.rows);
    const hours = (scope) => jobRows.filter((r) => r.scope === scope).reduce((sum, r) => sum + Number(r.hours), 0);
    const cost = (scope) => jobRows.filter((r) => r.scope === scope).reduce((sum, r) => sum + toCents(r.entry_cost_usd), 0);
    expect(id, `${jobId}'s contract hours`, hours("contract"), wanted.hours);
    expect(id, `${jobId}'s contract cost in cents`, cost("contract"), wanted.contract_cents);
    expect(id, `${jobId}'s change-order hours`, hours("change_order"), wanted.change_order_hours);
    expect(id, `${jobId}'s change-order cost in cents`, cost("change_order"), wanted.change_order_cents);
    contractHours += wanted.hours;
    contractCents += wanted.contract_cents;
    changeOrderHours += wanted.change_order_hours;
    changeOrderCents += wanted.change_order_cents;
  }
  expect(id, "the contract hour total", contractHours, TIME_CENSUS.contract_hours);
  expect(id, "the contract cost total in cents", contractCents, TIME_CENSUS.contract_cents);
  expect(id, "the change-order hour total", changeOrderHours, TIME_CENSUS.change_order_hours);
  expect(id, "the change-order cost total in cents", changeOrderCents, TIME_CENSUS.change_order_cents);

  // R19: every group's hours divide evenly into its week count, so a week's
  // hours are a whole number on every row rather than on the pinned job alone.
  const groups = new Map();
  for (const r of rows) {
    const key = `${r.job_id}|${r.crew_role}|${r.scope}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  for (const [key, groupRows] of groups) {
    const hours = new Set(groupRows.map((r) => r.hours));
    if (hours.size > 1) throw new Error(`${id}: ${key} carries ${[...hours].join(" and ")} hours in different weeks`);
  }

  // T-D4: the renovation's hours are the proposal's quantities at eight hours
  // to the day, with the proposal parsed rather than retyped.
  const byRateId = new Map(items.map((item) => [item.rate_id, item]));
  let tiedHours = 0;
  let billedDays = 0;
  for (const [role, rateId] of Object.entries(SMB06_RATE_BY_ROLE)) {
    const line = byRateId.get(rateId);
    if (!line) throw new Error(`${id}: SMB-06 no longer carries ${rateId}, which ${role} ties to`);
    if (line.unit !== "day") throw new Error(`${id}: SMB-06 now prices ${rateId} by the ${line.unit} and the tie is on days`);
    const hours = rows
      .filter((r) => r.job_id === "JOB-LDB-01" && r.crew_role === role)
      .reduce((sum, r) => sum + Number(r.hours), 0);
    if (hours !== line.quantity * HOURS_PER_BILLED_DAY) {
      throw new Error(
        `${id}: the renovation carries ${hours} ${role} hours and SMB-06 bills ${line.quantity} days, `
        + `which is ${line.quantity * HOURS_PER_BILLED_DAY} hours at ${HOURS_PER_BILLED_DAY} to the day`
      );
    }
    tiedHours += hours;
    billedDays += line.quantity;
  }
  expect(id, "the count of roles tied to SMB-06", Object.keys(SMB06_RATE_BY_ROLE).length, TIME_CENSUS.smb06_tied_roles);
  expect(id, "the renovation's SMB-06 billed days", billedDays, TIME_CENSUS.okafor_billed_days);
  expect(id, "the renovation's SMB-06 tied hours", tiedHours, TIME_CENSUS.okafor_tied_hours);
  for (const [role, hours] of Object.entries(OKAFOR_ROLE_HOURS)) {
    const actual = rows
      .filter((r) => r.job_id === "JOB-LDB-01" && r.crew_role === role)
      .reduce((sum, r) => sum + Number(r.hours), 0);
    expect(id, `the renovation's ${role} hours`, actual, hours);
  }

  // T-D7's second half: every renovation week sits inside its role's window,
  // every one of which was read off SMB-16 or SMB-04.
  for (const entry of rows.filter((candidate) => candidate.job_id === "JOB-LDB-01")) {
    const window = okafor[entry.crew_role];
    if (!window) throw new Error(`${id}: ${entry.crew_role} has no window on the renovation`);
    if (entry.week_ending < window.from || entry.week_ending > window.to) {
      throw new Error(
        `${id}: ${entry.entry_id} ends its ${entry.crew_role} week on ${entry.week_ending}, outside the `
        + `${window.from} to ${window.to} window SMB-16 and SMB-04 give that role`
      );
    }
  }

  assertJobSpan(id, rows, "week_ending", "entry_id", windows, okafor);
}

/**
 * T-F13's sweep, shared by the two cost files: every dated row sits inside its
 * own job's start_date to as_of_date span.
 *
 * The renovation's design weeks are the stated exception and are asserted as
 * one: design development runs from the day the proposal was approved to the
 * Friday before the crew arrives, which is before the job's own start_date,
 * because start_date is SMB-04's kickoff stage and this cluster does not get to
 * move a frozen date. Two rows are outside, both are design on JOB-LDB-01, and
 * both sit inside the approved-to-kickoff window read off the client record. A
 * third row outside the span fails here.
 */
function assertJobSpan(id, rows, column, idColumn, windows, okafor) {
  const early = [];
  for (const r of rows) {
    if (r.job_id === "") continue;
    const window = windows[r.job_id];
    const value = r[column];
    if (value > AS_OF_DATE) {
      throw new Error(`${id}: ${r[idColumn]} is dated ${value}, after the as-of date`);
    }
    if (value < window.start_date) early.push(r);
  }
  if (okafor === null) {
    if (early.length > 0) {
      throw new Error(
        `${id}: ${early[0][idColumn]} is dated ${early[0][column]}, before its own job's start date, `
        + `and ${early.length} rows in all are`
      );
    }
    return;
  }
  const design = okafor.design;
  expect(id, "the count of weeks before their own job's start date", early.length, 2);
  for (const r of early) {
    if (r.job_id !== "JOB-LDB-01" || r.crew_role !== "design") {
      throw new Error(
        `${id}: ${r.entry_id} is dated ${r.week_ending}, before its job's start date, and only the `
        + "renovation's design weeks run before the crew arrives"
      );
    }
    if (r.week_ending < design.from || r.week_ending > design.to) {
      throw new Error(`${id}: ${r.entry_id} is outside the ${design.from} to ${design.to} design window`);
    }
  }
}

function assertJobExpenses(rows, windows, bearing, items, rework) {
  const id = "SMB-21";
  expect(id, "the row count", rows.length, EXPENSE_CENSUS.rows);

  const ids = rows.map((r) => r.expense_id);
  for (const [i, value] of ids.entries()) {
    if (value !== `JEX-LDB-${String(i + 1).padStart(2, "0")}`) {
      throw new Error(`${id}: the expense ids are not gapless from 01 at file position ${i + 1}`);
    }
  }

  for (const r of rows) {
    const where = `${id}: ${r.expense_id}`;
    if (!EXPENSE_CATEGORIES.includes(r.expense_category)) throw new Error(`${where} carries expense_category "${r.expense_category}"`);
    if (!RECORD_OWNER_ROLES.includes(r.coded_by_role)) throw new Error(`${where} carries coded_by_role "${r.coded_by_role}"`);
    if (r.record_type !== MOCK_RECORD_TYPE) throw new Error(`${where} carries record_type "${r.record_type}"`);
    assertWeekday(id, `${r.expense_id} expense_date`, r.expense_date);
    if (toCents(r.amount_usd) <= 0) throw new Error(`${where} carries the amount ${r.amount_usd}`);
    // T-E7, and the overhead rows, which belong to no job and carry no scope.
    if ((r.scope === "") !== (r.job_id === "")) throw new Error(`${where} carries scope "${r.scope}" against a job of "${r.job_id}"`);
    if ((r.change_order_id !== "") !== (r.scope === "change_order")) {
      throw new Error(`${where} carries change_order_id "${r.change_order_id}" against a scope of "${r.scope}"`);
    }
    if (r.change_order_id !== "" && r.change_order_id !== OPEN_CHANGE_ORDERS[r.job_id]) {
      throw new Error(`${where} cites ${r.change_order_id} and its job carries ${OPEN_CHANGE_ORDERS[r.job_id]}`);
    }
    // T-E3: the counterparty rule, and the one it forces on internal lines.
    if (r.counterparty_canon_id !== "") {
      if (![SUBCONTRACT_COUNTERPARTY, MATERIALS_COUNTERPARTY].includes(r.counterparty_canon_id)) {
        throw new Error(`${where} names ${r.counterparty_canon_id}, and this file names two counterparties`);
      }
      if (r.counterparty_name.trim() === "") throw new Error(`${where} names a counterparty id with no name`);
    } else {
      if (r.counterparty_name !== "") throw new Error(`${where} carries a counterparty name and no id`);
      if (["subcontract", "materials"].includes(r.expense_category)) {
        throw new Error(`${where} is a ${r.expense_category} row with no counterparty, which is not an internal cost line`);
      }
    }
    if (r.expense_category === "subcontract" && r.counterparty_canon_id !== SUBCONTRACT_COUNTERPARTY) {
      throw new Error(`${where} is a subcontract row against ${r.counterparty_canon_id}`);
    }
    if (r.description.trim() === "") throw new Error(`${where} describes nothing`);
    assertNoDash(where, r);
  }

  // T-E3's census, exactly as the plan pins it at 21, 5 and 8.
  expect(id, "the co-134 row count", count(rows, (r) => r.counterparty_canon_id === MATERIALS_COUNTERPARTY), EXPENSE_CENSUS.materials_counterparty);
  expect(id, "the co-133 row count", count(rows, (r) => r.counterparty_canon_id === SUBCONTRACT_COUNTERPARTY), EXPENSE_CENSUS.subcontract_counterparty);
  expect(id, "the internal cost line count", count(rows, (r) => r.counterparty_canon_id === ""), EXPENSE_CENSUS.internal);
  expect(id, "the job-coded row count", count(rows, (r) => r.job_id !== ""), EXPENSE_CENSUS.job_coded);
  expect(id, "the overhead row count", count(rows, (r) => r.job_id === ""), EXPENSE_CENSUS.overhead);
  expect(
    id, "the internal job-cost row count",
    count(rows, (r) => r.counterparty_canon_id === "" && r.job_id !== ""),
    EXPENSE_CENSUS.internal_job_costs
  );
  for (const category of EXPENSE_CATEGORIES) {
    expect(id, `the ${category} row count`, count(rows, (r) => r.expense_category === category), EXPENSE_CENSUS[category]);
  }
  expect(id, "the change-order row count", count(rows, (r) => r.scope === "change_order"), EXPENSE_CENSUS.change_order_rows);
  // Every co-133 row is a subcontract row, which is what the census means by
  // "every one a subcontract row".
  for (const sub of rows.filter((candidate) => candidate.counterparty_canon_id === SUBCONTRACT_COUNTERPARTY)) {
    if (sub.expense_category !== "subcontract") throw new Error(`${id}: ${sub.expense_id} names co-133 and is a ${sub.expense_category} row`);
  }

  // P4, both cardinalities.
  const outsideTheSet = rows.filter((r) => !JOB_COST_CATEGORIES.includes(r.expense_category));
  expect(id, "the count of rows outside the job-cost set", outsideTheSet.length, EXPENSE_CENSUS.outside_the_job_cost_set);
  const miscoded = outsideTheSet.filter((r) => r.job_id !== "");
  expect(id, "the count of rows miscoded to a job", miscoded.length, EXPENSE_CENSUS.miscoded_to_a_job);
  if (miscoded[0].expense_id !== "JEX-LDB-12" || miscoded[0].expense_category !== "personal") {
    throw new Error(`${id}: the miscode is ${miscoded[0].expense_id} as a ${miscoded[0].expense_category} row, and the plan pins JEX-LDB-12 as a personal one`);
  }
  if (miscoded[0].counterparty_canon_id !== MATERIALS_COUNTERPARTY) {
    throw new Error(`${id}: the miscode names ${miscoded[0].counterparty_canon_id} and must hide inside the co-134 population`);
  }
  // The amount is the one thing a rule keyed on amounts cannot find: it occurs
  // once in this file and nowhere else in the pack.
  expect(id, "the count of rows carrying the miscoded amount", count(rows, (r) => r.amount_usd === miscoded[0].amount_usd), 1);

  // T-E4: the rework figure, once, on a co-133 row inside the delivery window.
  const reworkRows = rows.filter((r) => toCents(r.amount_usd) === rework);
  expect(id, "the count of rows carrying the rework figure", reworkRows.length, 1);
  const reworkRow = reworkRows[0];
  if (reworkRow.expense_id !== "JEX-LDB-07") throw new Error(`${id}: the rework row is ${reworkRow.expense_id} and the plan pins JEX-LDB-07`);
  if (reworkRow.counterparty_canon_id !== SUBCONTRACT_COUNTERPARTY) throw new Error(`${id}: the rework row names ${reworkRow.counterparty_canon_id}`);
  if (reworkRow.expense_category !== "subcontract") throw new Error(`${id}: the rework row is a ${reworkRow.expense_category} row`);
  if (reworkRow.job_id !== "JOB-LDB-01" || reworkRow.scope !== "contract") {
    throw new Error(`${id}: the rework row is ${reworkRow.scope} scope on ${reworkRow.job_id}, and the notes put it on the renovation's contract scope`);
  }
  // It is a real cost correctly coded, so it is not the miscode.
  if (reworkRow.expense_id === miscoded[0].expense_id) throw new Error(`${id}: the rework row and the miscode are the same row`);
  const overrun = rework - contingencyCents(items);
  if (overrun <= 0) throw new Error(`${id}: the rework of ${cents(rework)} no longer overruns the contingency allowance`);

  // T-E5: one row per cost-bearing proposal line, each strictly below it.
  const okaforRows = rows.filter((r) => r.job_id === "JOB-LDB-01");
  expect(id, "the renovation's row count", okaforRows.length, EXPENSE_TOTALS["JOB-LDB-01"].rows);
  expect(id, "the count of cost-bearing proposal lines", bearing.length, EXPENSE_CENSUS.okafor_cost_bearing_lines);
  expect(id, "the renovation's rows against a proposal line", okaforRows.length - 1, bearing.length);

  // T-E6: every per-job total, asserted as an equality.
  let contractCents = 0;
  let changeOrderCents = 0;
  for (const [jobId, wanted] of Object.entries(EXPENSE_TOTALS)) {
    const jobRows = rows.filter((r) => r.job_id === jobId);
    expect(id, `${jobId}'s row count`, jobRows.length, wanted.rows);
    const total = (scope) => jobRows.filter((r) => r.scope === scope).reduce((sum, r) => sum + toCents(r.amount_usd), 0);
    expect(id, `${jobId}'s contract-scope expense in cents`, total("contract"), wanted.contract_cents);
    expect(id, `${jobId}'s change-order expense in cents`, total("change_order"), wanted.change_order_cents);
    contractCents += wanted.contract_cents;
    changeOrderCents += wanted.change_order_cents;
  }
  expect(id, "the contract-scope expense total in cents", contractCents, EXPENSE_CENSUS.contract_cents);
  expect(id, "the change-order expense total in cents", changeOrderCents, EXPENSE_CENSUS.change_order_cents);

  // T-E9: removing the miscode moves exactly one job's expense total.
  const without = rows.filter((r) => r.expense_id !== miscoded[0].expense_id);
  const moved = Object.keys(EXPENSE_TOTALS).filter((jobId) => {
    const before = rows.filter((r) => r.job_id === jobId && r.scope === "contract").reduce((sum, r) => sum + toCents(r.amount_usd), 0);
    const after = without.filter((r) => r.job_id === jobId && r.scope === "contract").reduce((sum, r) => sum + toCents(r.amount_usd), 0);
    return before !== after;
  });
  expect(id, "the count of jobs the miscode moves", moved.length, 1);
  if (moved[0] !== miscoded[0].job_id) throw new Error(`${id}: the miscode moves ${moved[0]} and sits on ${miscoded[0].job_id}`);

  // T-E8: every date inside its own job's span, and the renovation's inside the
  // delivery window as well.
  assertJobSpan(id, rows, "expense_date", "expense_id", windows, null);
  const delivery = { from: windows["JOB-LDB-01"].start_date, to: windows["JOB-LDB-01"].planned_end_date };
  for (const okaforRow of okaforRows) {
    if (okaforRow.expense_date < delivery.from || okaforRow.expense_date > delivery.to) {
      throw new Error(`${id}: ${okaforRow.expense_id} is dated ${okaforRow.expense_date}, outside the ${delivery.from} to ${delivery.to} delivery window`);
    }
  }
}

function assertJobProgress(rows, register, time, expenses, records) {
  const id = "SMB-22";
  expect(id, "the row count", rows.length, PROGRESS_CENSUS.rows);

  const ids = rows.map((r) => r.job_id);
  if (ids.join(",") !== [...ids].sort().join(",")) throw new Error(`${id}: file order is not job_id order`);
  for (const [i, value] of ids.entries()) {
    if (value !== `JOB-LDB-${String(i + 1).padStart(2, "0")}`) {
      throw new Error(`${id}: the job ids are not gapless from 01 at file position ${i + 1}`);
    }
  }

  for (const r of rows) {
    const where = `${id}: ${r.job_id}`;
    if (r.as_of_date !== AS_OF_DATE) throw new Error(`${where} reports against ${r.as_of_date}`);
    if (r.project_name.trim() === "") throw new Error(`${where} names no project`);
    // T-F11: the three thresholds are constant across the file.
    if (toCents(r.change_order_materiality_usd) !== CHANGE_ORDER_MATERIALITY_CENTS) throw new Error(`${where} carries a different materiality threshold`);
    if (r.margin_floor_bp !== String(MARGIN_FLOOR_BP)) throw new Error(`${where} carries a different margin floor`);
    if (r.on_track_tolerance_pct !== String(ON_TRACK_TOLERANCE_PCT)) throw new Error(`${where} carries a different tolerance`);
    // T-F3: the identity, in both forms, in integer cents.
    const billed = toCents(r.billed_to_date_usd);
    const accrued = toCents(r.accrued_unbilled_usd);
    const revenue = toCents(r.revenue_to_date_usd);
    if (billed + accrued !== revenue) throw new Error(`${where}: revenue to date is not billed to date plus accrued unbilled`);
    if (revenue - toCents(r.time_cost_usd) - toCents(r.expense_cost_usd) !== toCents(r.contract_margin_usd)) {
      throw new Error(`${where}: the contract margin is not revenue less time cost less expense cost`);
    }
    if (toCents(r.contract_value_usd) * Number(r.percent_complete) !== revenue * 100) {
      throw new Error(`${where}: the revenue to date is not the contract value at ${r.percent_complete} percent`);
    }
    // T-F6's second half: a value of zero is exactly an empty change order id.
    if ((r.open_change_order_id !== "") !== (toCents(r.open_change_order_value_usd) > 0)) {
      throw new Error(`${where} carries ${r.open_change_order_value_usd} of change order against the id "${r.open_change_order_id}"`);
    }
    // T-F13's own half: the window runs forwards.
    if (r.planned_end_date <= r.start_date) throw new Error(`${where} is planned to end at or before it starts`);
    assertNoDash(where, r);
  }

  // T-F4, T-F5 and T-F6, recomputed against the three emitted files.
  for (const r of rows) {
    const billed = register.filter((i) => i.job_id === r.job_id).reduce((sum, i) => sum + toCents(i.invoice_amount_usd), 0);
    expect(id, `${r.job_id}'s billed to date in cents`, toCents(r.billed_to_date_usd), billed);
    expect(id, `${r.job_id}'s billed to date against the register's own total`, billed, BILLED_TO_DATE_CENTS[r.job_id]);
    const timeCost = time.filter((t) => t.job_id === r.job_id && t.scope === "contract").reduce((sum, t) => sum + toCents(t.entry_cost_usd), 0);
    expect(id, `${r.job_id}'s time cost in cents`, toCents(r.time_cost_usd), timeCost);
    const expenseCost = expenses.filter((e) => e.job_id === r.job_id && e.scope === "contract").reduce((sum, e) => sum + toCents(e.amount_usd), 0);
    expect(id, `${r.job_id}'s expense cost in cents`, toCents(r.expense_cost_usd), expenseCost);
    const changeOrder = [...time, ...expenses]
      .filter((row) => row.job_id === r.job_id && row.scope === "change_order")
      .reduce((sum, row) => sum + toCents(row.entry_cost_usd ?? row.amount_usd), 0);
    expect(id, `${r.job_id}'s open change order value in cents`, toCents(r.open_change_order_value_usd), changeOrder);
  }

  // T-A5's SMB-22 direction: every job the register cites is here and back.
  const cited = new Set(register.map((i) => i.job_id));
  for (const r of rows) if (!cited.has(r.job_id)) throw new Error(`${id}: ${r.job_id} is a job no invoice cites`);
  for (const jobId of cited) if (!ids.includes(jobId)) throw new Error(`${id}: the register cites ${jobId}, which this file does not track`);

  // T-F12: the two already-recorded jobs read their four cells off the record.
  for (const [jobId, frozen] of Object.entries(FROZEN_JOB_WINDOWS)) {
    const record = records[frozen.record];
    const r = rows.find((row) => row.job_id === jobId);
    if (r.project_name !== record.client.project_name) throw new Error(`${id}: ${jobId} names a project ${frozen.record} does not`);
    if (r.contract_value_usd !== record.client.contract_value_usd) throw new Error(`${id}: ${jobId} carries a contract value ${frozen.record} does not`);
    const stageDate = (name) => record.stages.find((s) => s.stage === name).event_date;
    if (r.start_date !== stageDate(frozen.start_stage)) throw new Error(`${id}: ${jobId} starts on a date ${frozen.record}'s ${frozen.start_stage} stage does not`);
    if (r.planned_end_date !== stageDate(frozen.end_stage)) throw new Error(`${id}: ${jobId} ends on a date ${frozen.record}'s ${frozen.end_stage} stage does not`);
  }

  // T-F10: exactly one job is billed ahead of the work it has performed.
  expect(id, "the negative accrual count", count(rows, (r) => toCents(r.accrued_unbilled_usd) < 0), PROGRESS_CENSUS.negative_accruals);

  // T-F7: the on-track set, at both readings of the tolerance, with no
  // division anywhere. The gap is |billed * 100 - percent_complete * contract|
  // and the comparison is against tolerance * contract.
  const gap = (r) => Math.abs(toCents(r.billed_to_date_usd) * 100 - Number(r.percent_complete) * toCents(r.contract_value_usd));
  const band = (r) => Number(r.on_track_tolerance_pct) * toCents(r.contract_value_usd);
  const inclusive = rows.filter((r) => gap(r) <= band(r)).map((r) => r.job_id);
  const exclusive = rows.filter((r) => gap(r) < band(r)).map((r) => r.job_id);
  if (inclusive.join(",") !== exclusive.join(",")) {
    throw new Error(`${id}: a job sits on the tolerance boundary, so the on-track set depends on how a reader reads their own tolerance`);
  }
  expect(id, "the on-track count", inclusive.length, PROGRESS_CENSUS.on_track);

  // P5, both cardinalities, and the threshold crossing in both directions.
  const onTrack = new Set(inclusive);
  const withChangeOrder = rows.filter((r) => onTrack.has(r.job_id) && r.open_change_order_id !== "");
  expect(id, "the count of on-track jobs carrying a change order", withChangeOrder.length, PROGRESS_CENSUS.on_track_with_a_change_order);
  const material = withChangeOrder.filter((r) => toCents(r.open_change_order_value_usd) > toCents(r.change_order_materiality_usd));
  expect(id, "the count of on-track jobs carrying a material change order", material.length, PROGRESS_CENSUS.material_change_orders);

  // T-F9: the floor, as two integer cross-multiplications per job.
  const clears = (marginCents, r) => marginCents * 10000 >= Number(r.margin_floor_bp) * toCents(r.revenue_to_date_usd);
  const crossers = rows.filter((r) => {
    const contract = toCents(r.contract_margin_usd);
    const trueMargin = contract - toCents(r.open_change_order_value_usd);
    return clears(contract, r) && !clears(trueMargin, r);
  });
  expect(id, "the count of jobs that clear the floor on one reading and not the other", crossers.length, PROGRESS_CENSUS.floor_crossers);
  if (crossers[0].job_id !== material[0].job_id) {
    throw new Error(`${id}: ${crossers[0].job_id} crosses the floor and ${material[0].job_id} carries the material change order`);
  }
  for (const r of rows) {
    if (!clears(toCents(r.contract_margin_usd), r)) {
      throw new Error(`${id}: ${r.job_id} is already below the floor on its contract margin, so it no longer reads healthy`);
    }
  }

  // P6, both cardinalities. The miscode is found by category, never by a flag.
  const miscodedJobs = new Set(
    expenses.filter((e) => e.job_id !== "" && !JOB_COST_CATEGORIES.includes(e.expense_category)).map((e) => e.job_id)
  );
  const noChangeOrder = rows.filter((r) => r.open_change_order_id === "");
  expect(id, "the count of jobs carrying no open change order", noChangeOrder.length, PROGRESS_CENSUS.no_open_change_order);
  const controls = noChangeOrder.filter((r) => !miscodedJobs.has(r.job_id));
  expect(id, "the control count", controls.length, PROGRESS_CENSUS.controls);
  if (controls[0].job_id !== "JOB-LDB-01") {
    throw new Error(`${id}: the control is ${controls[0].job_id}, and artifacts/SMB-15 makes the renovation the only job with neither`);
  }
  expect(id, "the open change order count", count(rows, (r) => r.open_change_order_id !== ""), PROGRESS_CENSUS.open_change_orders);
  expect(
    id, "the open change order value total in cents",
    rows.reduce((sum, r) => sum + toCents(r.open_change_order_value_usd), 0),
    PROGRESS_CENSUS.change_order_value_cents
  );

  assertPinnedProgress(rows);
}

/**
 * The six rows, exactly as data plan 2.6 pins them. Held as a pin against the
 * sums above: every money cell is summed from SMB-17, SMB-20 and SMB-21 and
 * then checked here, so a sum that drifts fails with the column and both values.
 */
export function assertPinnedProgress(rows) {
  if (rows.length !== PINNED_PROGRESS.length) {
    throw new Error(`SMB-22: the snapshot is ${rows.length} rows and the plan pins ${PINNED_PROGRESS.length}`);
  }
  const columnFor = {
    contract_cents: "contract_value_usd",
    billed_cents: "billed_to_date_usd",
    accrued_cents: "accrued_unbilled_usd",
    revenue_cents: "revenue_to_date_usd",
    time_cents: "time_cost_usd",
    expense_cents: "expense_cost_usd",
    margin_cents: "contract_margin_usd",
    change_order_cents: "open_change_order_value_usd",
  };
  for (const [i, pinned] of PINNED_PROGRESS.entries()) {
    const r = rows[i];
    if (r.job_id !== pinned.job_id) throw new Error(`SMB-22: ${r.job_id} is at file position ${i + 1} and the plan pins ${pinned.job_id}`);
    if (r.percent_complete !== String(pinned.percent_complete)) {
      throw new Error(`SMB-22: ${pinned.job_id} reports ${r.percent_complete} percent complete and the plan pins ${pinned.percent_complete}`);
    }
    for (const [key, column] of Object.entries(columnFor)) {
      if (toCents(r[column]) !== pinned[key]) {
        throw new Error(
          `SMB-22: ${pinned.job_id} derives ${column} ${r[column]} and the plan pins ${cents(pinned[key])}. `
          + "The sums and the plan have drifted apart."
        );
      }
    }
  }
}

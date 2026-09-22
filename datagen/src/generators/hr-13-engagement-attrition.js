// HR-13 engagement-attrition-dataset: eighteen completed exits, a thirteen
// month end department headcount series and four quarters of survey aggregates
// over the same eleven departments.
//
// The structural negative comes first, because it is the schema rather than a
// sentence. The only employee keyed rows in the artifact are exit records for
// people who have already left, which is a fact about the past. No active
// employee appears anywhere, by id or otherwise, so a tool cannot score a
// person the file does not mention. Every other row is keyed on a department
// and a period, so the finest grain in the file is a department month or a
// department quarter. No column anywhere carries a score, a probability, a
// likelihood, a risk, a propensity, a rank or a forecast, and the one status
// column is a group size fact that every row carries. There is no field a
// prediction could be stored in and no field a prediction could be trained on,
// because the file holds no per person attribute at all beyond an exit date and
// an exit type. The artifact carries that argument itself, in the grammar row's
// no_individual_prediction field.
//
// The window partition is arithmetic rather than a design choice. Each of the
// eighteen departed rows carries an in post floor, the latest date at which any
// shipped byte places the person in post, and a ceiling, the earliest date at
// which any shipped byte requires them gone. A row takes an in window exit date
// when its floor lands inside the rolling twelve months, or when its start date
// plus the published minimum tenure does, or when a shipped artifact's own
// premise requires a recent absence, which is the manager of record the review
// cycle routes seven reports around. It takes a pre window date otherwise. The
// floors come from the roster, from a requisition a departed row still owns and
// from the latest activity date of a customer account a departed row still
// owns, all read at build time, so a change to any of those files moves the
// partition and the builder throws rather than shipping a quiet contradiction.
//
// The elevated department is resolved, never drawn. Three clauses run over the
// emitted rows: two or more in window exit rows, every one of them voluntary,
// and a thirteen month end average headcount at or below the company's own
// average department headcount. With eighteen exits across 582 people a large
// department cannot clear a multiple of two on the company rate, because every
// exit it adds also raises that rate, so the clause set is the arithmetic
// stated as a clause rather than discovered as a failure. The builder throws
// unless exactly one department satisfies all three, which makes a future
// roster change a red gate rather than a silent plant loss.
//
// No money amount, no percentage, no rating, no score, no reason text, no
// rehire flag, no notice date and no eligibility field appears anywhere, and no
// time of day: every date is ISO and the artifact holds no instant.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { toCsv } from "../csv.js";
import { addBusinessDays, addDays, isWeekend, monthEnds } from "../dates.js";
import { createRng } from "../seed.js";
import { EXIT_TYPES, buildLifecycleCoordination, lifecycleRoster } from "./hr-lifecycle.js";

export const id = "HR-13";

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..");

/** The universe as-of, printed once in the grammar row and never contradicted. */
export const AS_OF = "2026-04-03";

/** The rolling twelve months every rate in this artifact is measured over. */
export const WINDOW_START = "2025-04-01";
export const WINDOW_END = "2026-03-31";

/** Thirteen month ends rather than twelve: the opening headcount is the denominator's first term. */
export const MONTH_END_COUNT = 13;

/** The four quarters of the window, calendar aligned, closing on a month end the movement file carries. */
export const QUARTERS = [
  { quarter_label: "2025-Q2", quarter_start: "2025-04-01", quarter_end: "2025-06-30" },
  { quarter_label: "2025-Q3", quarter_start: "2025-07-01", quarter_end: "2025-09-30" },
  { quarter_label: "2025-Q4", quarter_start: "2025-10-01", quarter_end: "2025-12-31" },
  { quarter_label: "2026-Q1", quarter_start: "2026-01-01", quarter_end: "2026-03-31" },
];

/** The published denominator, chosen over an opening headcount because the company grows across the window. */
export const DENOMINATOR_RULE = "average of the thirteen month-end headcounts";

/** The company rate is the headcount weighted one, which recomputes as the sum of the department columns. */
export const COMPANY_RATE_BASIS = "total in-window exits over the average of the thirteen company month-end headcounts, each the sum of the department headcounts at that month end";

/** The published multiple, at 2.0 rather than 3.0 so the voluntary qualifier still differentiates. */
export const ATTRITION_MULTIPLE = 2.0;

/** The published minimum group size, and the count the suppression rule reads. */
export const MINIMUM_GROUP_SIZE = 5;
export const SUPPRESSION_BASIS = "responded";

/** The one status column, a statement about group size rather than about a result. */
export const REPORTING_STATUSES = ["reported", "suppressed"];

/** The closed three-item survey vocabulary and the scale its means sit on. */
export const ENGAGEMENT_ITEMS = ["recommend", "manager_support", "growth"];
export const ENGAGEMENT_SCALE_MIN = 1;
export const ENGAGEMENT_SCALE_MAX = 5;

/**
 * The published minimum tenure. Nobody is shipped as having joined and left
 * inside three weeks, so an exit date sits at least this many calendar days
 * after its own start date. It is a stated convention rather than a per-row
 * judgment, and it is the second clause of the window partition.
 */
export const MINIMUM_TENURE_DAYS = 90;

/** The constructed response share band, applied to a department's own invited count. */
export const RESPONSE_SHARE = { min: 0.62, max: 0.88 };

/** The constructed band every item mean is drawn inside, well within the published scale. */
export const ITEM_MEAN_RANGE = { min: 3.1, max: 4.6 };

/** The design counts the builder refuses to ship without. */
export const EXIT_RECORD_COUNT = 18;
export const IN_WINDOW_EXIT_COUNT = 7;
export const PRE_WINDOW_EXIT_COUNT = 11;
export const DEPARTMENT_COUNT = 11;
export const ROSTER_ROWS = 600;
export const ACTIVE_ROSTER_ROWS = 582;

/** In-window types: four voluntary and three involuntary, and no department holding two involuntary. */
export const IN_WINDOW_TYPE_SPLIT = { voluntary_resignation: 4, involuntary: 3 };
export const IN_WINDOW_VOLUNTARY_MULTISET = [2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0];
export const IN_WINDOW_INVOLUNTARY_MULTISET = [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0];

/** Pre-window types, constructed so neither side of the window can be inferred from a type. */
export const PRE_WINDOW_TYPE_SPLIT = { voluntary_resignation: 9, involuntary: 2 };

/** The suppressed row census at the published minimum and at the two counterfactual minimums. */
export const SUPPRESSION_CENSUS = { 5: 4, 10: 4, 15: 8 };

/** The elevated-department census at the published multiple and at the two counterfactual multiples. */
export const ELEVATED_CENSUS = {
  voluntary: { 1: 2, 2: 1, 3: 1 },
  all_exits: { 1: 3, 2: 2, 3: 1 },
};

/** The one review cycle in the pack, read-only, and the ceiling it imposes. */
export const REVIEW_CYCLE_OPEN_DATE = "2026-03-23";

export const GRAMMAR_ID = "ATTRITION-GRAMMAR-2026-04-03";

/** The structural negative, in the artifact's own words, in one sentence. */
export const NO_INDIVIDUAL_PREDICTION =
  "No row carries an individual level risk score or any per person prediction field, because the only employee "
  + "keyed rows are exit records for people who have already left, every other row is keyed on a department and a "
  + "period, and the file holds no per person attribute beyond an exit date and an exit type, so there is no field "
  + "a prediction could be stored in and none it could be trained on.";

/** The published key orders, one per file, asserted against the emitted rows rather than trusted. */
export const GRAMMAR_COLUMNS = [
  "grammar_id", "as_of", "window_start", "window_end", "month_end_count", "quarter_count",
  "denominator_rule", "company_rate_basis", "attrition_multiple", "minimum_group_size",
  "suppression_basis", "exit_type_vocabulary", "reporting_status_vocabulary",
  "engagement_item_vocabulary", "engagement_scale_min", "engagement_scale_max",
  "department_count", "exit_record_count", "in_window_exit_count",
  "no_individual_prediction",
];

export const EXIT_COLUMNS = ["exit_id", "employee_id", "exit_date", "exit_type"];

export const MOVEMENT_COLUMNS = [
  "department", "month_end", "headcount", "hires_in_month",
  "voluntary_exits_in_month", "involuntary_exits_in_month",
];

export const ENGAGEMENT_COLUMNS = [
  "survey_id", "department", "quarter_label", "quarter_start", "quarter_end",
  "invited", "responded", "reporting_status", "item_recommend_mean",
  "item_manager_support_mean", "item_growth_mean", "engagement_index",
];

/**
 * Id blocks minted nowhere else in the pack, and the blocks a C6 byte must not
 * reach. The first list is swept against this artifact's own ids; the second is
 * swept against every emitted string, because a token from another artifact's
 * block here would make this file a second source for a row somebody else owns.
 */
export const OWN_ID_PREFIXES = ["ESR-", "SVY-"];
export const FOREIGN_ID_PREFIXES = [
  "EXT-", "RQN-", "HRC-", "RVA-", "RVC-", "GOL-", "GSA-", "RHS-", "MSD-", "ca-", "pe-",
];

/** Not a roster row, and a start date after the window: it belongs in no headcount here. */
const ABSENT_EMPLOYEE_ID = "EMP-0601";

/** The bounded redraw ceilings. Each throws with its own attempt count rather than looping forever. */
const EXIT_TYPE_ATTEMPT_LIMIT = 5000;
const RESPONSE_ATTEMPT_LIMIT = 250000;
const ITEM_MEAN_ATTEMPT_LIMIT = 5000;

// --------------------------------------------------------------- small helpers

/** Every business day in an inclusive ISO window, oldest first. */
function businessDays(startIso, endIso) {
  const out = [];
  for (let day = startIso; day <= endIso; day = addDays(day, 1)) {
    if (!isWeekend(day)) out.push(day);
  }
  return out;
}

const latest = (dates) => dates.reduce((a, b) => (b > a ? b : a));
const earliest = (dates) => dates.reduce((a, b) => (b < a ? b : a));
const round2 = (value) => Math.round(value * 100) / 100;
const fixed2 = (value) => round2(value).toFixed(2);

/** A descending count multiset padded to the department count, the shape the design counts are stated in. */
function multisetOverDepartments(countsByDepartment, departments) {
  return departments
    .map((department) => countsByDepartment.get(department) ?? 0)
    .sort((a, b) => b - a);
}

/** The quote-aware read the two frozen CSVs need; both carry a quoted cell. */
function readCsv(path, what) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (cause) {
    throw new Error(`${id}: could not read ${what} at ${path}: ${cause.message}`);
  }
  const [header, ...lines] = text.trim().split("\n");
  const cols = splitCsvLine(header);
  return lines.map((line) => {
    const cells = splitCsvLine(line);
    return Object.fromEntries(cols.map((col, index) => [col, cells[index]]));
  });
}

function splitCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
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

/** Word-anchored token test, so "each" is not a hit for a token inside it. */
export function carriesToken(text, token) {
  return new RegExp(`(?<![A-Za-z])${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z])`, "i").test(text);
}

// ------------------------------------------------- the frozen reads and the pins

/**
 * The roster and the review cycle, taken from the shared lifecycle builder in
 * process rather than read back off committed CSVs, so this artifact and the
 * cycle cannot disagree about who is on the roster.
 */
function readPopulation() {
  const roster = lifecycleRoster();
  const { review, roster: cycleRoster } = buildLifecycleCoordination();
  if (roster.length !== cycleRoster.length) {
    throw new Error(
      `${id}: the roster built here holds ${roster.length} rows against the ${cycleRoster.length} the cycle was built on`
    );
  }
  if (roster.length !== ROSTER_ROWS) {
    throw new Error(`${id}: the roster holds ${roster.length} rows, expected ${ROSTER_ROWS}`);
  }
  const active = roster.filter((row) => row.employment_status === "active");
  const departed = roster.filter((row) => row.employment_status !== "active");
  if (active.length !== ACTIVE_ROSTER_ROWS || departed.length !== EXIT_RECORD_COUNT) {
    throw new Error(
      `${id}: the roster splits ${active.length} active and ${departed.length} departed, `
      + `expected ${ACTIVE_ROSTER_ROWS} and ${EXIT_RECORD_COUNT}. Every departed row yields exactly one exit `
      + "record and no active row yields one, so the split is the exit population."
    );
  }
  const departments = [...new Set(roster.map((row) => row.department))].sort();
  if (departments.length !== DEPARTMENT_COUNT) {
    throw new Error(`${id}: the roster spans ${departments.length} departments, expected ${DEPARTMENT_COUNT}`);
  }
  return { roster, active, departed, departments, review };
}

/**
 * The requisition floors: a departed row that still owns an open requisition was
 * in post on the day it opened. Read off the committed HRIS export at build
 * time, the HR-11 frozen-read shape.
 */
function readRequisitionFloors(departedIds) {
  const rows = readCsv(
    join(REPO_ROOT, "datasets", "hr", "hris-export", "hris-requisitions.csv"),
    "the committed requisition file"
  );
  const floors = new Map();
  for (const row of rows) {
    if (!departedIds.has(row.owner_employee_id)) continue;
    if (!row.opened_date) {
      throw new Error(`${id}: requisition ${row.requisition_id} carries no opened_date`);
    }
    if (row.opened_date > AS_OF) {
      throw new Error(
        `${id}: requisition ${row.requisition_id} opened ${row.opened_date}, after the ${AS_OF} as-of, so it `
        + "would put a departed owner in post after the universe's own present day"
      );
    }
    const held = floors.get(row.owner_employee_id) ?? [];
    held.push(row.opened_date);
    floors.set(row.owner_employee_id, held);
  }
  if (floors.size !== 2) {
    throw new Error(
      `${id}: ${floors.size} departed rows own a requisition, expected 2. The two owners the pack carries are `
      + "the floors this artifact was built against."
    );
  }
  return floors;
}

/**
 * The customer account floors: a departed row that still owns accounts was in
 * post at the latest activity date across all of them, not at the first one the
 * file happens to list.
 */
function readAccountFloors(departedIds) {
  const rows = readCsv(
    join(REPO_ROOT, "datasets", "core", "crm-seed-dataset", "accounts.csv"),
    "the committed customer account file"
  );
  const dates = new Map();
  for (const row of rows) {
    if (!departedIds.has(row.owner_employee_id)) continue;
    if (!row.last_activity_date) {
      throw new Error(`${id}: account ${row.account_id} carries no last_activity_date`);
    }
    const held = dates.get(row.owner_employee_id) ?? [];
    held.push(row.last_activity_date);
    dates.set(row.owner_employee_id, held);
  }
  if (dates.size === 0) {
    throw new Error(`${id}: no departed row owns a customer account, so the account floors have gone`);
  }
  if (![...dates.values()].some((held) => held.length > 1)) {
    throw new Error(
      `${id}: no departed row owns more than one account, so the maximum-activity-date rule is no longer the `
      + "rule under test and a first-row read would pass unnoticed"
    );
  }
  const floors = new Map();
  for (const [employeeId, held] of dates) {
    const floor = latest(held);
    if (floor > AS_OF) {
      throw new Error(`${id}: ${employeeId} owns an account active ${floor}, after the ${AS_OF} as-of`);
    }
    floors.set(employeeId, floor);
  }
  return floors;
}

/**
 * The cycle ceiling: the departed manager of record the review cycle routes its
 * skip-level rows around. Seven active reports still carrying a departed
 * manager at a cycle that opened in 2026 is a vacancy nobody has filled, so that
 * row's exit sits inside the window and before the cycle opened.
 */
function resolveCycleCeiling(review, byId) {
  if (review.cycle.length !== 1) {
    throw new Error(`${id}: the review cycle file carries ${review.cycle.length} rows, expected exactly 1`);
  }
  const [cycle] = review.cycle;
  if (cycle.cycle_open_date !== REVIEW_CYCLE_OPEN_DATE) {
    throw new Error(
      `${id}: the cycle opens ${cycle.cycle_open_date} and this artifact was built against ${REVIEW_CYCLE_OPEN_DATE}`
    );
  }
  const skipLevel = review.assignments.filter((row) => row.reviewer_relationship === "skip_level");
  if (skipLevel.length === 0) {
    throw new Error(`${id}: the cycle carries no skip_level assignment, so the orphaned-reports premise has gone`);
  }
  const managers = new Set();
  for (const row of skipLevel) {
    const reviewee = byId.get(row.reviewee_employee_id);
    if (!reviewee) {
      throw new Error(`${id}: skip-level reviewee ${row.reviewee_employee_id} is not a roster row`);
    }
    managers.add(reviewee.manager_employee_id);
  }
  if (managers.size !== 1) {
    throw new Error(
      `${id}: the skip-level rows name ${managers.size} managers of record (${[...managers].join(", ")}), `
      + "expected exactly 1, so the ceiling is ambiguous"
    );
  }
  const [managerId] = [...managers];
  const manager = byId.get(managerId);
  if (!manager || manager.employment_status === "active") {
    throw new Error(`${id}: the manager of record of the skip-level rows is not a departed roster row`);
  }
  return { managerId, ceiling: addDays(REVIEW_CYCLE_OPEN_DATE, -1), reportCount: skipLevel.length };
}

/**
 * The offboarding set's own exit, read at build time and asserted to yield no
 * row here: that employee is active, their last working day falls after the
 * window and after the as-of, and their exit type is one of the two this
 * artifact publishes. One exit in flight and eighteen completed is one story.
 */
function assertOffboardingExitIsInFlight(byId) {
  const rows = readCsv(
    join(REPO_ROOT, "datasets", "hr", "offboarding-checklist-access-inventory", "exit-record.csv"),
    "the committed offboarding exit record"
  );
  if (rows.length !== 1) {
    throw new Error(`${id}: the offboarding exit record carries ${rows.length} rows, expected exactly 1`);
  }
  const [row] = rows;
  const person = byId.get(row.employee_id);
  if (!person) {
    throw new Error(`${id}: the offboarding exit record names ${row.employee_id}, which is not a roster row`);
  }
  if (person.employment_status !== "active") {
    throw new Error(
      `${id}: the offboarding exit record names ${row.employee_id}, who is not active on the roster, so this `
      + "artifact and that one would both claim the same completed exit"
    );
  }
  if (!(row.last_working_day > WINDOW_END)) {
    throw new Error(
      `${id}: the offboarding exit's last working day is ${row.last_working_day}, which is not after the `
      + `${WINDOW_END} window end, so that exit would belong in this artifact`
    );
  }
  if (!EXIT_TYPES.includes(row.exit_type)) {
    throw new Error(
      `${id}: the offboarding exit type is "${row.exit_type}", which is not one of the published types `
      + `(${EXIT_TYPES.join(", ")}), so the pack would carry two words for one thing`
    );
  }
  return row.employee_id;
}

// ------------------------------------------------- the floors, the ceilings, the partition

/**
 * One departed row's in post floor and its exit date interval. The floor is the
 * latest date any shipped byte places the person in post; the earliest drawable
 * exit adds one business day to it and never sits inside the published minimum
 * tenure.
 */
function resolveBounds(row, requisitionFloors, accountFloors, cycleCeiling) {
  const candidates = [row.start_date];
  for (const opened of requisitionFloors.get(row.employee_id) ?? []) candidates.push(opened);
  const accountFloor = accountFloors.get(row.employee_id);
  if (accountFloor) candidates.push(accountFloor);
  const floor = latest(candidates);
  const tenureFloor = addDays(row.start_date, MINIMUM_TENURE_DAYS);
  const earliestExit = latest([addBusinessDays(floor, 1), tenureFloor]);
  const ceiling = row.employee_id === cycleCeiling.managerId ? cycleCeiling.ceiling : AS_OF;
  return { floor, tenureFloor, earliestExit, ceiling };
}

/** Rule B23, written as its three conditions rather than as a list of ids. */
function isInWindow(row, bounds, cycleCeiling) {
  return bounds.floor >= WINDOW_START
    || bounds.tenureFloor >= WINDOW_START
    || row.employee_id === cycleCeiling.managerId;
}

// ------------------------------------------------------------------ the build

function buildAttrition() {
  const { roster, departed, departments, review } = readPopulation();
  const byId = new Map(roster.map((row) => [row.employee_id, row]));
  const departedIds = new Set(departed.map((row) => row.employee_id));
  const requisitionFloors = readRequisitionFloors(departedIds);
  const accountFloors = readAccountFloors(departedIds);
  const cycleCeiling = resolveCycleCeiling(review, byId);
  const inFlightEmployeeId = assertOffboardingExitIsInFlight(byId);

  // ---- the partition, before a single date is drawn
  const ordered = departed.slice().sort((a, b) => a.employee_id.localeCompare(b.employee_id));
  const rows = ordered.map((row) => {
    const bounds = resolveBounds(row, requisitionFloors, accountFloors, cycleCeiling);
    return { row, bounds, in_window: isInWindow(row, bounds, cycleCeiling) };
  });
  const inWindowRows = rows.filter((entry) => entry.in_window);
  const preWindowRows = rows.filter((entry) => !entry.in_window);
  if (inWindowRows.length !== IN_WINDOW_EXIT_COUNT || preWindowRows.length !== PRE_WINDOW_EXIT_COUNT) {
    throw new Error(
      `${id}: the window partition lands ${inWindowRows.length} inside and ${preWindowRows.length} before it, `
      + `expected ${IN_WINDOW_EXIT_COUNT} and ${PRE_WINDOW_EXIT_COUNT}. The partition is byte arithmetic over the `
      + "floors, so a move here means a shipped input moved."
    );
  }

  // ---- the exit dates
  const dateRng = createRng(id, "exit-date");
  for (const entry of rows) {
    const lower = entry.in_window
      ? latest([entry.bounds.earliestExit, WINDOW_START])
      : entry.bounds.earliestExit;
    const upper = entry.in_window
      ? earliest([entry.bounds.ceiling, WINDOW_END])
      : earliest([entry.bounds.ceiling, addDays(WINDOW_START, -1)]);
    const days = lower > upper ? [] : businessDays(lower, upper);
    if (days.length === 0) {
      throw new Error(
        `${id}: ${entry.row.employee_id} has no business day between ${lower} and ${upper} to exit on, so the `
        + "floors and the ceiling have closed over each other"
      );
    }
    entry.exit_date = dateRng.pick(days);
    if (entry.exit_date <= entry.row.start_date) {
      throw new Error(`${id}: ${entry.row.employee_id} exits ${entry.exit_date}, on or before its own start date`);
    }
    if (entry.exit_date > AS_OF) {
      throw new Error(`${id}: ${entry.row.employee_id} exits ${entry.exit_date}, after the ${AS_OF} as-of`);
    }
    if (isWeekend(entry.exit_date)) {
      throw new Error(`${id}: ${entry.row.employee_id} exits ${entry.exit_date}, which is not a business day`);
    }
    const inside = entry.exit_date >= WINDOW_START && entry.exit_date <= WINDOW_END;
    if (inside !== entry.in_window) {
      throw new Error(
        `${id}: ${entry.row.employee_id} was partitioned ${entry.in_window ? "inside" : "before"} the window and `
        + `drew ${entry.exit_date}`
      );
    }
  }

  // ---- the headcount series, which depends on the dates and on nothing else
  const ends = monthEnds(MONTH_END_COUNT, WINDOW_END);
  const exitDateById = new Map(rows.map((entry) => [entry.row.employee_id, entry.exit_date]));
  const headcount = new Map();
  for (const department of departments) {
    const departmentRows = roster.filter((row) => row.department === department);
    headcount.set(
      department,
      ends.map((monthEnd) => departmentRows.filter((row) => {
        if (row.start_date > monthEnd) return false;
        const exit = exitDateById.get(row.employee_id);
        return exit === undefined || exit > monthEnd;
      }).length)
    );
  }
  const companySeries = ends.map((_, index) =>
    departments.reduce((sum, department) => sum + headcount.get(department)[index], 0));
  const companyAverage = companySeries.reduce((sum, n) => sum + n, 0) / MONTH_END_COUNT;
  const averageDepartmentHeadcount = companyAverage / DEPARTMENT_COUNT;
  const departmentAverage = new Map(departments.map((department) => [
    department,
    headcount.get(department).reduce((sum, n) => sum + n, 0) / MONTH_END_COUNT,
  ]));

  // ---- the exit types, redrawn until every post-condition holds at once
  assignExitTypes({ inWindowRows, preWindowRows, departments, departmentAverage, averageDepartmentHeadcount });

  // ---- the elevated department, resolved rather than drawn
  const elevated = resolveElevatedDepartments({
    inWindowRows, departments, departmentAverage, averageDepartmentHeadcount,
  });
  if (elevated.length !== 1) {
    throw new Error(
      `${id}: ${elevated.length} departments satisfy the elevated-attrition clauses, expected exactly 1. The `
      + "carrier is whichever department the clauses resolve to, so a move here is a roster change rather than a "
      + "design choice."
    );
  }
  const [carrier] = elevated;
  assertRateMargins({ inWindowRows, departments, departmentAverage, companyAverage, carrier });

  // ---- the emitted rows
  const exitRows = rows
    .slice()
    .sort((a, b) => (a.exit_date === b.exit_date
      ? a.row.employee_id.localeCompare(b.row.employee_id)
      : a.exit_date.localeCompare(b.exit_date)))
    .map((entry, index) => ({
      exit_id: `ESR-${String(index + 1).padStart(2, "0")}`,
      employee_id: entry.row.employee_id,
      exit_date: entry.exit_date,
      exit_type: entry.exit_type,
    }));

  const movementRows = [];
  for (const department of departments) {
    const departmentRows = roster.filter((row) => row.department === department);
    ends.forEach((monthEnd, index) => {
      const monthStart = `${monthEnd.slice(0, 7)}-01`;
      const departmentExits = exitRows.filter((exit) => byId.get(exit.employee_id).department === department
        && exit.exit_date >= monthStart && exit.exit_date <= monthEnd);
      movementRows.push({
        department,
        month_end: monthEnd,
        headcount: headcount.get(department)[index],
        hires_in_month: departmentRows.filter(
          (row) => row.start_date >= monthStart && row.start_date <= monthEnd
        ).length,
        voluntary_exits_in_month: departmentExits.filter((exit) => exit.exit_type === EXIT_TYPES[0]).length,
        involuntary_exits_in_month: departmentExits.filter((exit) => exit.exit_type === EXIT_TYPES[1]).length,
      });
    });
  }

  const engagementRows = buildEngagement({ departments, ends, headcount, carrier });

  const grammar = {
    grammar_id: GRAMMAR_ID,
    as_of: AS_OF,
    window_start: WINDOW_START,
    window_end: WINDOW_END,
    month_end_count: MONTH_END_COUNT,
    quarter_count: QUARTERS.length,
    denominator_rule: DENOMINATOR_RULE,
    company_rate_basis: COMPANY_RATE_BASIS,
    attrition_multiple: ATTRITION_MULTIPLE.toFixed(1),
    minimum_group_size: MINIMUM_GROUP_SIZE,
    suppression_basis: SUPPRESSION_BASIS,
    exit_type_vocabulary: EXIT_TYPES.join(";"),
    reporting_status_vocabulary: REPORTING_STATUSES.join(";"),
    engagement_item_vocabulary: ENGAGEMENT_ITEMS.join(";"),
    engagement_scale_min: ENGAGEMENT_SCALE_MIN,
    engagement_scale_max: ENGAGEMENT_SCALE_MAX,
    department_count: DEPARTMENT_COUNT,
    exit_record_count: EXIT_RECORD_COUNT,
    in_window_exit_count: IN_WINDOW_EXIT_COUNT,
    no_individual_prediction: NO_INDIVIDUAL_PREDICTION,
  };

  return {
    grammar, exitRows, movementRows, engagementRows,
    companySeries, companyAverage, inFlightEmployeeId, departments, ends,
  };
}

/**
 * The exit types, drawn from one seeded stream inside a bounded redraw loop and
 * accepted only when every post-condition holds at once: the in-window split,
 * both per-department multisets, the pre-window split, and a clause set that
 * resolves to exactly one department. A single draw with a throw would make the
 * design counts a property of one seed value rather than of a rule, and the
 * same is true of the resolution: the clauses still choose the carrier, the loop
 * only refuses an assignment the clauses cannot resolve.
 */
function assignExitTypes({ inWindowRows, preWindowRows, departments, departmentAverage, averageDepartmentHeadcount }) {
  const typeRng = createRng(id, "exit-type");
  const inWindowPool = [
    ...Array(IN_WINDOW_TYPE_SPLIT[EXIT_TYPES[0]]).fill(EXIT_TYPES[0]),
    ...Array(IN_WINDOW_TYPE_SPLIT[EXIT_TYPES[1]]).fill(EXIT_TYPES[1]),
  ];
  if (inWindowPool.length !== inWindowRows.length) {
    throw new Error(
      `${id}: the in-window type split covers ${inWindowPool.length} rows against ${inWindowRows.length} in the window`
    );
  }
  const prePool = [
    ...Array(PRE_WINDOW_TYPE_SPLIT[EXIT_TYPES[0]]).fill(EXIT_TYPES[0]),
    ...Array(PRE_WINDOW_TYPE_SPLIT[EXIT_TYPES[1]]).fill(EXIT_TYPES[1]),
  ];
  if (prePool.length !== preWindowRows.length) {
    throw new Error(
      `${id}: the pre-window type split covers ${prePool.length} rows against ${preWindowRows.length} before the window`
    );
  }
  const preShuffled = typeRng.shuffle(prePool);
  preWindowRows.forEach((entry, index) => { entry.exit_type = preShuffled[index]; });

  for (let attempt = 1; attempt <= EXIT_TYPE_ATTEMPT_LIMIT; attempt += 1) {
    const shuffled = typeRng.shuffle(inWindowPool);
    inWindowRows.forEach((entry, index) => { entry.exit_type = shuffled[index]; });
    const voluntary = countByDepartment(inWindowRows, EXIT_TYPES[0]);
    const involuntary = countByDepartment(inWindowRows, EXIT_TYPES[1]);
    const voluntaryMultiset = multisetOverDepartments(voluntary, departments);
    const involuntaryMultiset = multisetOverDepartments(involuntary, departments);
    if (voluntaryMultiset.join(",") !== IN_WINDOW_VOLUNTARY_MULTISET.join(",")) continue;
    if (involuntaryMultiset.join(",") !== IN_WINDOW_INVOLUNTARY_MULTISET.join(",")) continue;
    const elevated = resolveElevatedDepartments({
      inWindowRows, departments, departmentAverage, averageDepartmentHeadcount,
    });
    if (elevated.length !== 1) continue;
    return attempt;
  }
  throw new Error(
    `${id}: ${EXIT_TYPE_ATTEMPT_LIMIT} exit-type draws in a row failed the published post-conditions, so either `
    + "the multisets or the elevated-attrition clauses no longer describe this roster"
  );
}

function countByDepartment(entries, exitType) {
  const counts = new Map();
  for (const entry of entries) {
    if (exitType !== undefined && entry.exit_type !== exitType) continue;
    counts.set(entry.row.department, (counts.get(entry.row.department) ?? 0) + 1);
  }
  return counts;
}

/**
 * The three clauses, recomputed over the emitted rows. Nothing here names a
 * department: the clauses run over all eleven and return whichever satisfy them.
 */
function resolveElevatedDepartments({ inWindowRows, departments, departmentAverage, averageDepartmentHeadcount }) {
  const byDepartment = new Map(departments.map((department) => [department, []]));
  for (const entry of inWindowRows) byDepartment.get(entry.row.department).push(entry);
  return departments.filter((department) => {
    const held = byDepartment.get(department);
    if (held.length < 2) return false;
    if (!held.every((entry) => entry.exit_type === EXIT_TYPES[0])) return false;
    return departmentAverage.get(department) <= averageDepartmentHeadcount;
  });
}

/** The margins, recomputed from the emitted rows rather than hoped for. */
function assertRateMargins({ inWindowRows, departments, departmentAverage, companyAverage, carrier }) {
  const voluntaryCounts = countByDepartment(inWindowRows, EXIT_TYPES[0]);
  const allCounts = countByDepartment(inWindowRows, undefined);
  const companyVoluntary = inWindowRows.filter((entry) => entry.exit_type === EXIT_TYPES[0]).length / companyAverage;
  const companyAll = inWindowRows.length / companyAverage;
  const rate = (counts, department) => (counts.get(department) ?? 0) / departmentAverage.get(department);

  if (!(rate(voluntaryCounts, carrier) > ATTRITION_MULTIPLE * companyVoluntary)) {
    throw new Error(`${id}: the resolved carrier does not clear the published multiple on the voluntary rate`);
  }
  for (const department of departments) {
    if (department === carrier) continue;
    if (rate(voluntaryCounts, department) > ATTRITION_MULTIPLE * companyVoluntary) {
      throw new Error(
        `${id}: a second department clears the published multiple on the voluntary rate, so the finding is not unique`
      );
    }
  }
  const census = (counts, companyRate, multiple) =>
    departments.filter((department) => rate(counts, department) > multiple * companyRate).length;
  for (const [multiple, expected] of Object.entries(ELEVATED_CENSUS.voluntary)) {
    const found = census(voluntaryCounts, companyVoluntary, Number(multiple));
    if (found !== expected) {
      throw new Error(
        `${id}: ${found} departments clear a multiple of ${multiple} on the voluntary rate, expected ${expected}`
      );
    }
  }
  for (const [multiple, expected] of Object.entries(ELEVATED_CENSUS.all_exits)) {
    const found = census(allCounts, companyAll, Number(multiple));
    if (found !== expected) {
      throw new Error(
        `${id}: ${found} departments clear a multiple of ${multiple} on all in-window exits, expected ${expected}`
      );
    }
  }
}

/**
 * The quarterly aggregate. invited is read out of the headcount series rather
 * than drawn, so the two files tie out; responded is drawn inside the published
 * share band and redrawn until the suppression censuses at the published
 * minimum and at both counterfactual minimums hold; the item means are drawn
 * and redrawn until the engagement file refuses to corroborate the attrition
 * finding.
 */
function buildEngagement({ departments, ends, headcount, carrier }) {
  const closingIndex = QUARTERS.map((quarter) => {
    const index = ends.indexOf(quarter.quarter_end);
    if (index < 0) {
      throw new Error(`${id}: quarter ${quarter.quarter_label} closes ${quarter.quarter_end}, which is not a month end`);
    }
    return index;
  });

  const rows = [];
  QUARTERS.forEach((quarter, quarterIndex) => {
    for (const department of departments) {
      rows.push({
        department,
        quarter,
        invited: headcount.get(department)[closingIndex[quarterIndex]],
      });
    }
  });

  const responseRng = createRng(id, "survey-response");
  let accepted = 0;
  for (let attempt = 1; attempt <= RESPONSE_ATTEMPT_LIMIT; attempt += 1) {
    for (const row of rows) {
      const share = RESPONSE_SHARE.min + responseRng.float() * (RESPONSE_SHARE.max - RESPONSE_SHARE.min);
      row.responded = Math.min(row.invited, Math.max(0, Math.round(row.invited * share)));
    }
    if (Object.entries(SUPPRESSION_CENSUS).every(([minimum, expected]) =>
      rows.filter((row) => row.responded < Number(minimum)).length === expected)) {
      accepted = attempt;
      break;
    }
  }
  if (accepted === 0) {
    throw new Error(
      `${id}: ${RESPONSE_ATTEMPT_LIMIT} response draws in a row failed the published suppression censuses, so the `
      + "response band and the smallest departments no longer fit each other"
    );
  }

  const itemRng = createRng(id, "engagement-item");
  let itemAttempt = 0;
  for (let attempt = 1; attempt <= ITEM_MEAN_ATTEMPT_LIMIT; attempt += 1) {
    for (const row of rows) {
      if (row.responded < MINIMUM_GROUP_SIZE) {
        row.items = null;
        row.index = null;
        continue;
      }
      row.items = ENGAGEMENT_ITEMS.map(() =>
        round2(ITEM_MEAN_RANGE.min + itemRng.float() * (ITEM_MEAN_RANGE.max - ITEM_MEAN_RANGE.min)));
      row.index = round2(row.items.reduce((sum, mean) => sum + mean, 0) / ENGAGEMENT_ITEMS.length);
    }
    if (engagementRefusesToCorroborate(rows, carrier)) {
      itemAttempt = attempt;
      break;
    }
  }
  if (itemAttempt === 0) {
    throw new Error(
      `${id}: ${ITEM_MEAN_ATTEMPT_LIMIT} item-mean draws in a row left the engagement file corroborating the `
      + "attrition finding, which would make the finding reachable by sorting a column in the other file"
    );
  }

  return rows
    .slice()
    .sort((a, b) => (a.quarter.quarter_start === b.quarter.quarter_start
      ? a.department.localeCompare(b.department)
      : a.quarter.quarter_start.localeCompare(b.quarter.quarter_start)))
    .map((row, index) => ({
      survey_id: `SVY-${String(index + 1).padStart(2, "0")}`,
      department: row.department,
      quarter_label: row.quarter.quarter_label,
      quarter_start: row.quarter.quarter_start,
      quarter_end: row.quarter.quarter_end,
      invited: row.invited,
      responded: row.responded,
      reporting_status: row.responded < MINIMUM_GROUP_SIZE ? REPORTING_STATUSES[1] : REPORTING_STATUSES[0],
      item_recommend_mean: row.items === null ? "" : fixed2(row.items[0]),
      item_manager_support_mean: row.items === null ? "" : fixed2(row.items[1]),
      item_growth_mean: row.items === null ? "" : fixed2(row.items[2]),
      engagement_index: row.index === null ? "" : fixed2(row.index),
    }));
}

/**
 * The carrier's index sits at neither end of the reported range in any quarter,
 * so the department holding the lowest index in a quarter is never the one the
 * exit-rate clauses resolve to. That per-quarter level check alone leaves the
 * trend open: a reader who sorts the engagement file on quarter-over-quarter
 * change rather than on level can still land on the carrier. The trend limb
 * below closes that gap: over the departments reported in both the first and
 * the last quarter, the carrier's first-to-last change must rank in neither
 * the bottom third nor the top third, and the carrier must not fall in both
 * of the last two quarters.
 */
function engagementRefusesToCorroborate(rows, carrier) {
  const perQuarterHolds = QUARTERS.every((quarter) => {
    const reported = rows.filter((row) => row.quarter === quarter && row.index !== null);
    if (reported.length < 3) return false;
    const carrierRow = reported.find((row) => row.department === carrier);
    if (!carrierRow) return false;
    const values = reported.map((row) => row.index);
    return carrierRow.index > Math.min(...values) && carrierRow.index < Math.max(...values);
  });
  if (!perQuarterHolds) return false;

  const atQuarter = (quarter) => new Map(
    rows.filter((row) => row.quarter === quarter && row.index !== null).map((row) => [row.department, row.index])
  );
  const [q1, q2, q3, q4] = QUARTERS.map(atQuarter);

  const trendDepartments = [...q1.keys()].filter((department) => q4.has(department));
  const change = (department) => q4.get(department) - q1.get(department);
  const ranked = trendDepartments.map(change).sort((a, b) => a - b);
  const position = ranked.indexOf(change(carrier));
  const trendCount = ranked.length;
  const trendHolds = position >= Math.ceil(trendCount / 3) && position < Math.floor((2 * trendCount) / 3);
  if (!trendHolds) return false;

  const fallsFrom = (later, earlier) => later.has(carrier) && earlier.has(carrier) && later.get(carrier) < earlier.get(carrier);
  const fallsInBothLastQuarters = fallsFrom(q4, q3) && fallsFrom(q3, q2);
  return !fallsInBothLastQuarters;
}

// -------------------------------------------------------------- the emitted sweep

/**
 * The house rules, run over this artifact's own emitted strings. The pack-wide
 * prefix sweep belongs to the test, which can read every other directory; what
 * a generator can check is that nothing it writes reaches an id block somebody
 * else owns, and that no cell carries a mark the pack keeps out.
 */
function assertEmittedStrings({ grammar, exitRows, movementRows, engagementRows }) {
  const exitIds = new Set(exitRows.map((row) => row.exit_id));
  const surveyIds = new Set(engagementRows.map((row) => row.survey_id));
  const CONCEPT_WORDS = [
    "score", "scores", "rating", "ratings", "risk", "probability", "likelihood",
    "propensity", "rank", "ranking", "forecast", "prediction", "predictive",
    "reason", "rehire", "recommendation", "remedy", "flagged",
  ];
  const cells = [];
  for (const [key, value] of Object.entries(grammar)) {
    if (key === "no_individual_prediction") continue;
    cells.push(String(value));
  }
  for (const row of [...exitRows, ...movementRows, ...engagementRows]) {
    for (const value of Object.values(row)) cells.push(String(value));
  }
  const everyString = [...cells, String(grammar.no_individual_prediction)];

  for (const text of everyString) {
    if (text.includes("ESR-") && !exitIds.has(text)) {
      throw new Error(`${id}: "ESR-" reaches a string that is not one of this artifact's own exit ids`);
    }
    if (text.includes("SVY-") && !surveyIds.has(text)) {
      throw new Error(`${id}: "SVY-" reaches a string that is not one of this artifact's own survey ids`);
    }
    for (const prefix of FOREIGN_ID_PREFIXES) {
      if (carriesToken(text, prefix)) {
        throw new Error(
          `${id}: an emitted string carries "${prefix}", an id block another artifact owns, which would make this `
          + "file a second source for a row somebody else writes"
        );
      }
    }
    if (text.includes(ABSENT_EMPLOYEE_ID)) {
      throw new Error(`${id}: an emitted string names ${ABSENT_EMPLOYEE_ID}, who is not a roster row`);
    }
    if (text.includes("—") || text.includes("–")) {
      throw new Error(`${id}: an emitted string carries a dash the house rules keep out of the pack`);
    }
    if (/\$|%/.test(text)) throw new Error(`${id}: an emitted string carries a money or percentage mark`);
    if (/\d{2}:\d{2}/.test(text)) throw new Error(`${id}: an emitted string carries a time of day`);
  }
  for (const text of cells) {
    for (const word of CONCEPT_WORDS) {
      if (carriesToken(text, word)) {
        throw new Error(
          `${id}: the cell "${text}" carries "${word}", which is the kind of field the structural negative says `
          + "this artifact holds no room for"
        );
      }
    }
  }
}

/** The published key orders, asserted against the emitted rows rather than trusted. */
function assertColumns(rows, expected, what) {
  for (const row of rows) {
    const found = Object.keys(row);
    if (found.join(",") !== expected.join(",")) {
      throw new Error(`${id}: ${what} carries the columns ${found.join(", ")}, expected ${expected.join(", ")}`);
    }
  }
}

/** The counts and the tie-outs, recomputed over the emitted rows before they leave the builder. */
function assertRecords(built) {
  const { grammar, exitRows, movementRows, engagementRows, companySeries, companyAverage, inFlightEmployeeId } = built;

  assertColumns([grammar], GRAMMAR_COLUMNS, "the grammar row");
  assertColumns(exitRows, EXIT_COLUMNS, "an exit row");
  assertColumns(movementRows, MOVEMENT_COLUMNS, "a movement row");
  assertColumns(engagementRows, ENGAGEMENT_COLUMNS, "an engagement row");

  if (exitRows.length !== EXIT_RECORD_COUNT) {
    throw new Error(`${id}: ${exitRows.length} exit rows, expected ${EXIT_RECORD_COUNT}`);
  }
  if (movementRows.length !== DEPARTMENT_COUNT * MONTH_END_COUNT) {
    throw new Error(`${id}: ${movementRows.length} movement rows, expected ${DEPARTMENT_COUNT * MONTH_END_COUNT}`);
  }
  if (engagementRows.length !== DEPARTMENT_COUNT * QUARTERS.length) {
    throw new Error(`${id}: ${engagementRows.length} engagement rows, expected ${DEPARTMENT_COUNT * QUARTERS.length}`);
  }
  if (new Set(exitRows.map((row) => row.employee_id)).size !== EXIT_RECORD_COUNT) {
    throw new Error(`${id}: an employee holds two exit rows`);
  }
  if (exitRows.some((row) => row.employee_id === inFlightEmployeeId)) {
    throw new Error(`${id}: the offboarding set's departing employee holds an exit row here`);
  }
  exitRows.forEach((row, index) => {
    if (row.exit_id !== `ESR-${String(index + 1).padStart(2, "0")}`) {
      throw new Error(`${id}: exit id ${row.exit_id} is not dense in (exit_date, employee_id) order`);
    }
    if (!EXIT_TYPES.includes(row.exit_type)) {
      throw new Error(`${id}: exit row ${row.exit_id} carries the type "${row.exit_type}"`);
    }
  });
  engagementRows.forEach((row, index) => {
    if (row.survey_id !== `SVY-${String(index + 1).padStart(2, "0")}`) {
      throw new Error(`${id}: survey id ${row.survey_id} is not dense in (quarter_start, department) order`);
    }
  });

  const inWindow = exitRows.filter((row) => row.exit_date >= WINDOW_START && row.exit_date <= WINDOW_END);
  if (inWindow.length !== IN_WINDOW_EXIT_COUNT) {
    throw new Error(`${id}: ${inWindow.length} exits fall inside the window, expected ${IN_WINDOW_EXIT_COUNT}`);
  }
  const preWindow = exitRows.filter((row) => row.exit_date < WINDOW_START);
  const preSplit = {
    [EXIT_TYPES[0]]: preWindow.filter((row) => row.exit_type === EXIT_TYPES[0]).length,
    [EXIT_TYPES[1]]: preWindow.filter((row) => row.exit_type === EXIT_TYPES[1]).length,
  };
  for (const type of EXIT_TYPES) {
    if (preSplit[type] !== PRE_WINDOW_TYPE_SPLIT[type]) {
      throw new Error(
        `${id}: the pre-window split holds ${preSplit[type]} ${type} rows, expected ${PRE_WINDOW_TYPE_SPLIT[type]}`
      );
    }
    const found = inWindow.filter((row) => row.exit_type === type).length;
    if (found !== IN_WINDOW_TYPE_SPLIT[type]) {
      throw new Error(
        `${id}: the in-window split holds ${found} ${type} rows, expected ${IN_WINDOW_TYPE_SPLIT[type]}`
      );
    }
  }

  // the movement file ties out to the exit rows, column by column
  const exitByDepartmentMonth = new Map();
  for (const row of movementRows) {
    exitByDepartmentMonth.set(`${row.department}|${row.month_end}`, row);
  }
  const companyFromRows = built.ends.map((monthEnd) => built.departments.reduce(
    (sum, department) => sum + exitByDepartmentMonth.get(`${department}|${monthEnd}`).headcount, 0
  ));
  if (companyFromRows.join(",") !== companySeries.join(",")) {
    throw new Error(`${id}: the company series does not recompute as the sum of the department columns`);
  }
  const movementExits = movementRows.reduce(
    (sum, row) => sum + row.voluntary_exits_in_month + row.involuntary_exits_in_month, 0
  );
  const seriesStart = `${built.ends[0].slice(0, 7)}-01`;
  const withinSeries = exitRows.filter(
    (row) => row.exit_date >= seriesStart && row.exit_date <= WINDOW_END
  ).length;
  if (movementExits !== withinSeries) {
    throw new Error(
      `${id}: the movement exit columns count ${movementExits} exits against the ${withinSeries} exit rows that `
      + "fall inside the thirteen months the series covers"
    );
  }

  // the engagement file ties out to the movement file
  for (const row of engagementRows) {
    const monthEnd = QUARTERS.find((quarter) => quarter.quarter_label === row.quarter_label).quarter_end;
    const movement = exitByDepartmentMonth.get(`${row.department}|${monthEnd}`);
    if (movement.headcount !== row.invited) {
      throw new Error(
        `${id}: ${row.survey_id} invites ${row.invited} against a closing headcount of ${movement.headcount}`
      );
    }
    if (row.responded > row.invited) {
      throw new Error(`${id}: ${row.survey_id} records more responses than invitations`);
    }
    const floorResponded = Math.floor(RESPONSE_SHARE.min * row.invited);
    const ceilingResponded = Math.round(RESPONSE_SHARE.max * row.invited);
    if (row.responded < floorResponded || row.responded > ceilingResponded) {
      throw new Error(
        `${id}: ${row.survey_id} records ${row.responded} responses, outside the published share band applied to `
        + `${row.invited} invitations`
      );
    }
    const suppressed = row.reporting_status === REPORTING_STATUSES[1];
    if (suppressed !== (row.responded < MINIMUM_GROUP_SIZE)) {
      throw new Error(`${id}: ${row.survey_id} carries "${row.reporting_status}" against ${row.responded} responses`);
    }
    const scores = [row.item_recommend_mean, row.item_manager_support_mean, row.item_growth_mean, row.engagement_index];
    if (suppressed) {
      if (scores.some((cell) => cell !== "")) {
        throw new Error(`${id}: ${row.survey_id} is suppressed and still carries a figure`);
      }
      continue;
    }
    if (scores.some((cell) => cell === "")) {
      throw new Error(`${id}: ${row.survey_id} is reported and leaves a cell empty`);
    }
    const means = scores.slice(0, 3).map(Number);
    for (const mean of means) {
      if (!(mean >= ENGAGEMENT_SCALE_MIN && mean <= ENGAGEMENT_SCALE_MAX)) {
        throw new Error(`${id}: ${row.survey_id} carries an item mean off the published scale`);
      }
    }
    if (Number(row.engagement_index) !== round2(means.reduce((sum, mean) => sum + mean, 0) / means.length)) {
      throw new Error(`${id}: ${row.survey_id}'s index is not the mean of its own three item means`);
    }
  }
  for (const [minimum, expected] of Object.entries(SUPPRESSION_CENSUS)) {
    const found = engagementRows.filter((row) => row.responded < Number(minimum)).length;
    if (found !== expected) {
      throw new Error(`${id}: ${found} rows fall below a minimum of ${minimum}, expected ${expected}`);
    }
  }

  if (grammar.in_window_exit_count !== inWindow.length) {
    throw new Error(`${id}: the grammar publishes an in-window count the exit rows do not hold`);
  }
  if (Math.abs(companyAverage - companySeries.reduce((sum, n) => sum + n, 0) / MONTH_END_COUNT) > 1e-9) {
    throw new Error(`${id}: the company average does not recompute from the emitted series`);
  }

  assertEmittedStrings(built);
}

// ------------------------------------------------------------------- the emit

export function generate() {
  const built = buildAttrition();
  assertRecords(built);
  return [
    { path: "attrition-grammar.csv", content: toCsv(GRAMMAR_COLUMNS, [built.grammar]) },
    { path: "exit-records.csv", content: toCsv(EXIT_COLUMNS, built.exitRows) },
    { path: "headcount-movement.csv", content: toCsv(MOVEMENT_COLUMNS, built.movementRows) },
    { path: "engagement-quarterly.csv", content: toCsv(ENGAGEMENT_COLUMNS, built.engagementRows) },
  ];
}

// HR-15 multistate-leave-compliance-roster: where co-002's people sit, the
// four policy clocks the handbook and the remote work policy set, and the
// leave and compliance obligations those clocks produce, at a 2026-09-01 stamp.
//
// Three shapes are the exercise rather than the decoration:
//
//   1. Location is read, then placed by a published rule. work_location is the
//      compensation band dataset's committed value, byte for byte; headquarters
//      is the Delaware principal place of business the frozen master services
//      agreement states, the satellite office is in Colorado, and remote rows
//      are dealt into constructed state counts. Every code resolves to the
//      employment AI watch list's jurisdictions table, imported in process.
//   2. Every deadline is a computation. The four rules cite a document and a
//      section and name no statute; each due_date recomputes from its
//      basis_date, and the one obligation inside the published alert window is
//      found by applying the window, never by reading a flag.
//   3. The alert that must fire is the one that must not carry the reason. The
//      one leave record with a non-empty reason_detail owns the one in-window
//      obligation (E30.3), and the two rules stay independent predicates.
//
// employee_id is the only person field. Every drawn employee comes from the
// guarded pool of the C7 salience sets less the helpdesk requesters, the
// benefits census's unverified dependent's employee and HR-12's breaching band,
// intersected with a work_state other than Delaware. Which row carries which
// finding is not written anywhere in this file; it is found by the rule.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { toCsv } from "../csv.js";
import { addBusinessDays, addDays, isWeekend } from "../dates.js";
import { createRng } from "../seed.js";
import { buildHelpdeskQueue } from "./hr-14-helpdesk-queue.js";
import {
  buildMixedSensitivityRecords, SPECIAL_CATEGORY_FIELDS, RESTRICTED_FIELDS,
} from "./hr-17-mixed-sensitivity.js";
import { assertPrefixUnusedElsewhere, buildBenefitsCensus } from "./hr-20-benefits-census.js";
import {
  AS_OF as WATCH_LIST_AS_OF, JURISDICTIONS, buildWatchList,
} from "./hr-21-employment-ai-watch-list.js";
import { c7Salience, CHIEF_EXECUTIVE_ID, DEPARTING_EMPLOYEE_ID } from "./hr-c7-salience.js";

export const id = "HR-15";

const E = "HR-15";

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..");

export const AS_OF = "2026-09-01";
export const UNIVERSE_NOW = "2026-04-03";
export const GRAMMAR_ID = "LEAVE-COMPLIANCE-GRAMMAR-2026-09-01";
export const OWN_DIR = "datasets/hr/multistate-leave-compliance-roster/";

/** The alert window of B50: both ends inclusive, the HR-20 convention. */
export const ALERT_WINDOW_START = AS_OF;
export const ALERT_WINDOW_DAYS = 14;
export const ALERT_WINDOW_END = "2026-09-15";

/** Published design counts (data plan 2.3.4). */
export const EMPLOYEE_COUNT = 581;
export const LEAVE_RECORD_COUNT = 8;
export const OBLIGATION_COUNT = 27;
export const OPEN_OBLIGATION_COUNT = 19;

/** The guarded pools (data plan 0.12): the C7 requester pool, then less the C7 findings. */
export const EXPECTED_C7_POOL = 438;
export const EXPECTED_C8_POOL = 399;
/** The C8 pool intersected with a work_state other than US-DE, recorded after the first run of the deal. */
export const EXPECTED_DRAW_POOL = 241;
/** HR-12's breaching band group size, recomputed from committed bytes. */
export const EXPECTED_BREACHING_BAND_MEMBERS = 19;

export const WORK_LOCATIONS = ["remote", "headquarters", "satellite_office"];
export const LEAVE_TYPES = ["family_and_medical", "parental", "military"];
export const LEAVE_STATUSES = ["approved_not_started", "on_leave", "returned"];
export const OBLIGATION_TYPES = [
  "leave_certification", "return_to_work_confirmation", "work_authorization_reverification",
  "out_of_state_work_approval",
];
export const OWNER_ROLES = ["People Operations Specialist", "HR Business Partner", "People Manager"];

/** The four obligation rules of data plan 2.3.2, published verbatim in obligation-rules.csv. */
export const OBLIGATION_RULES = [
  {
    rule_id: "OBR-01", obligation_type: "leave_certification",
    source_citation: "ADI-HR-001 section 8 (Certification)",
    applies_to: "family_and_medical leaves", basis_field: "request_date",
    due_date_rule: "request_date plus 15 calendar days", owner_role: "People Operations Specialist",
  },
  {
    rule_id: "OBR-02", obligation_type: "return_to_work_confirmation",
    source_citation: "ADI-HR-001 section 8 (Return to work)",
    applies_to: "every leave", basis_field: "expected_return_date",
    due_date_rule: "expected_return_date minus 10 business days", owner_role: "People Operations Specialist",
  },
  {
    rule_id: "OBR-03", obligation_type: "work_authorization_reverification",
    source_citation: "ADI-HR-001 section 2 (Immigration compliance)",
    applies_to: "employees whose current work authorization document carries an expiry date",
    basis_field: "work_authorization_expiry_date",
    due_date_rule: "the recorded expiry date (basis_date) itself", owner_role: "HR Business Partner",
  },
  {
    rule_id: "OBR-04", obligation_type: "out_of_state_work_approval",
    source_citation: "ADI-POL-002 section 5.1",
    applies_to: "a requested move of an approved remote location across state lines",
    basis_field: "requested_effective_date",
    due_date_rule: "the day before the requested effective date", owner_role: "People Manager",
  },
];

/** The remote deal of data plan 2.3.3, constructed counts. */
export const REMOTE_DEAL = [
  { work_state: "US-NY", work_locality: "US-NY-NYC", count: 46 },
  { work_state: "US-NY", work_locality: "", count: 22 },
  { work_state: "US-IL", work_locality: "", count: 58 },
  { work_state: "US-CA", work_locality: "", count: 74 },
  { work_state: "US-CO", work_locality: "", count: 30 },
  { work_state: "US-DE", work_locality: "", count: 31 },
];
export const CLASS_STATE = { headquarters: "US-DE", satellite_office: "US-CO" };
export const STATE_TOTALS = { "US-DE": 239, "US-CO": 142, "US-CA": 74, "US-NY": 68, "US-IL": 58, "US-MD": 0 };
export const EXPECTED_CLASS_ROWS = { remote: 262, headquarters: 208, satellite_office: 112 };

/** The constructed reason detail (data plan 2.3.5). */
export const REASON_DETAIL = "planned surgery and a recovery period";

/**
 * The eight leave records by design slot (data plan 2.3.4). Completed dates are
 * keyed by rule; a missing key is an open obligation. The employee is drawn.
 */
export const LEAVE_DESIGN = [
  { slot: "L1", leave_type: "family_and_medical", request_date: "2026-04-20", start_date: "2026-05-04", expected_return_date: "2026-06-15", leave_status: "returned", completed: { "OBR-01": "2026-04-30", "OBR-02": "2026-05-26" } },
  { slot: "L2", leave_type: "parental", request_date: "2026-05-04", start_date: "2026-06-01", expected_return_date: "2026-08-24", leave_status: "returned", completed: { "OBR-02": "2026-08-03" } },
  { slot: "L3", leave_type: "family_and_medical", request_date: "2026-06-15", start_date: "2026-06-29", expected_return_date: "2026-08-10", leave_status: "returned", completed: { "OBR-01": "2026-06-24", "OBR-02": "2026-07-20" } },
  { slot: "L4", leave_type: "military", request_date: "2026-06-22", start_date: "2026-07-06", expected_return_date: "2026-10-14", leave_status: "on_leave", completed: {} },
  { slot: "L5", leave_type: "parental", request_date: "2026-07-06", start_date: "2026-08-03", expected_return_date: "2026-09-30", leave_status: "on_leave", completed: {} },
  { slot: "L6", leave_type: "family_and_medical", request_date: "2026-07-27", start_date: "2026-08-10", expected_return_date: "2026-09-28", leave_status: "on_leave", completed: { "OBR-01": "2026-08-07" }, reason_detail: REASON_DETAIL },
  { slot: "L7", leave_type: "parental", request_date: "2026-08-03", start_date: "2026-09-21", expected_return_date: "2026-12-14", leave_status: "approved_not_started", completed: {} },
  { slot: "L8", leave_type: "family_and_medical", request_date: "2026-08-10", start_date: "2026-08-24", expected_return_date: "2026-10-05", leave_status: "on_leave", completed: { "OBR-01": "2026-08-21" } },
];

/** The design's OBR-02 due dates, recomputed by the business-day walk and checked. */
const OBR02_DUE = {
  L1: "2026-06-01", L2: "2026-08-10", L3: "2026-07-27", L4: "2026-09-30",
  L5: "2026-09-16", L6: "2026-09-14", L7: "2026-11-30", L8: "2026-09-21",
};

/** HR-17 immigration_status values that carry a reverification, and their dates in employee_id order (X41). */
export const RENEWAL_DUE_STATUS = "work permit renewal due";
export const SPONSORED_STATUS = "employer sponsored work permit";
export const VERIFIED_STATUS = "work authorization verified";
export const RENEWAL_DUE_DATES = ["2026-10-19", "2026-11-13"];
export const SPONSORED_DATES = ["2027-03-15", "2027-06-30", "2028-01-31"];
/** Seven drawn reverification expiry dates, constructed, in draw order. */
export const DRAWN_REVERIFICATION_DATES = [
  "2026-09-25", "2026-12-04", "2027-02-19", "2027-05-07", "2027-08-20", "2027-11-12", "2028-04-28",
];

/** The three relocation requests of data plan 2.3.4, in draw order. */
export const RELOCATION_DESIGN = [
  { slot: "R1", from_state: "US-DE", from_locality: "", target: "US-NY-NYC", effective: "2026-08-04", completed: "2026-07-24" },
  { slot: "R2", from_state: "US-CO", from_locality: "", target: "US-CA", effective: "2026-10-20", completed: "" },
  { slot: "R3", from_state: "US-NY", from_locality: "", target: "US-IL", effective: "2026-11-03", completed: "" },
];

// ----------------------------------------------------------------- published sentences

export const STAMP_STATEMENT =
  "this artifact is dated after the pack's universe now; it records the compliance position at its own as_of "
  + "and does not move any earlier artifact's date";
export const POPULATION_RULE =
  "the active roster rows whose work location the compensation band dataset records, less the one employee whose "
  + "last working day falls before the as_of: 581 rows. employee_id is the only person field";
export const LOCATION_RULE =
  "work_location is copied byte for byte from the compensation band dataset. headquarters is the principal place of "
  + "business in Wilmington, Delaware that the frozen master services agreement states, so every headquarters "
  + "employee sits in US-DE with no locality; the satellite office is in US-CO with no city named; remote employees "
  + "are dealt in employee_id order into US-NY with locality US-NY-NYC 46, US-NY with no locality 22, US-IL 58, "
  + "US-CA 74, US-CO 30 and US-DE 31. State totals: US-DE 239, US-CO 142, US-CA 74, US-NY 68 of whom 46 in "
  + "US-NY-NYC, US-IL 58 and US-MD 0";
export const JURISDICTION_JOIN =
  "work_state, work_locality and target_jurisdiction_code are codes in the employment AI watch list's "
  + "jurisdictions.csv; a monitor walks each code's parent_code, so an employee in US-NY-NYC reaches the New York "
  + "City, New York and United States records";
export const BUSINESS_DAY_RULE =
  "a business day is Monday to Friday with no holiday calendar; counting n business days before a date never counts "
  + "that date itself";
export const ALERT_STATEMENT =
  "an obligation is in the alert window when its due_date is on or after alert_window_start and on or before "
  + "alert_window_end, open or completed; an alert carries employee_id, obligation_type, due_date, owner_role, the "
  + "jurisdiction and the rule's source_citation, and never reason_detail or leave_type";
export const REASON_DETAIL_STATEMENT =
  "reason_detail is special category health information held for leave administration only; no alert, notice or "
  + "log line may carry it, and a return-to-work confirmation alert needs none of it";
export const NOT_MODELLED_STATEMENT =
  "the April new hire holds no recorded work location and is not carried; hires after the universe now are unknown "
  + "to the pack and are not modelled; every obligation is a company policy clock, and fitness for duty, "
  + "recertification, the designation notice and premium payments are not modelled because the handbook gives them "
  + "no clock a window can test";

export const COLUMNS = {
  grammar: [
    "grammar_id", "as_of", "universe_now", "stamp_statement", "population_rule", "location_rule",
    "jurisdiction_join", "watch_list_as_of", "alert_window_start", "alert_window_end",
    "alert_window_days", "business_day_rule", "work_location_vocabulary", "leave_type_vocabulary",
    "leave_status_vocabulary", "obligation_type_vocabulary", "owner_role_vocabulary",
    "employee_count", "leave_record_count", "obligation_count", "open_obligation_count",
    "alert_statement", "reason_detail_statement", "not_modelled_statement",
  ],
  locations: ["employee_id", "work_location", "work_state", "work_locality"],
  rules: ["rule_id", "obligation_type", "source_citation", "applies_to", "basis_field", "due_date_rule", "owner_role"],
  leaves: [
    "leave_id", "employee_id", "leave_type", "leave_status", "request_date", "start_date",
    "expected_return_date", "reason_detail",
  ],
  obligations: [
    "obligation_id", "employee_id", "rule_id", "obligation_type", "related_leave_id", "basis_date",
    "due_date", "target_jurisdiction_code", "owner_role", "completed_date",
  ],
};

export const FILES = {
  grammar: "leave-compliance-grammar.csv",
  locations: "employee-work-locations.csv",
  rules: "obligation-rules.csv",
  leaves: "leave-records.csv",
  obligations: "compliance-obligations.csv",
};

const EN_DASH = String.fromCharCode(0x2013);
const EM_DASH = String.fromCharCode(0x2014);

// ----------------------------------------------------------------- helpers

/**
 * The date n business days before a date, never counting the date itself: the
 * dates.js walk run backwards (Monday to Friday, no holiday calendar).
 */
export function businessDaysBefore(isoDate, n) {
  return addBusinessDays(isoDate, -n);
}

/** The same walk with extra non-business dates, for the holiday reading of 2.3.5. */
function businessDaysBeforeSkipping(isoDate, n, holidays) {
  let date = isoDate;
  for (let moved = 0; moved < n; moved += 1) {
    do date = addDays(date, -1); while (isWeekend(date) || holidays.includes(date));
  }
  return date;
}

/** Whole calendar months of service: the start date's anniversary rule. */
function monthsBefore(isoDate, months) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const total = y * 12 + (m - 1) - months;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
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

/** A committed CSV read behind a loud throw (the hr-c7-salience.js precedent). */
function readCsv(relativePath, requiredColumns) {
  let text;
  try {
    text = readFileSync(join(REPO_ROOT, relativePath), "utf8");
  } catch (cause) {
    throw new Error(`${E}: could not read ${relativePath}: ${cause.message}`);
  }
  const [header, ...lines] = text.trim().split("\n");
  const cols = splitCsvLine(header);
  for (const column of requiredColumns) {
    if (!cols.includes(column)) throw new Error(`${E}: ${relativePath} carries no ${column} column`);
  }
  return lines.map((line) => {
    const cells = splitCsvLine(line);
    return Object.fromEntries(cols.map((c, i) => [c, cells[i]]));
  });
}

/** The members of HR-12's one breaching band group, recomputed from committed bytes. */
function breachingBandMembers() {
  const pay = readCsv("datasets/hr/compensation-band-dataset/employee-compensation.csv", ["employee_id", "band_id", "base_pay_amount", "synthetic_equity_cohort"]);
  const grammar = readCsv("datasets/hr/compensation-band-dataset/compensation-grammar.csv", ["minimum_group_size", "unadjusted_gap_threshold_pct"])[0];
  const minimum = Number(grammar.minimum_group_size);
  const threshold = Number(grammar.unadjusted_gap_threshold_pct);
  const groups = new Map();
  for (const row of pay) {
    if (!groups.has(row.band_id)) groups.set(row.band_id, { cohort_a: [], cohort_b: [] });
    groups.get(row.band_id)[row.synthetic_equity_cohort].push(row);
  }
  const mean = (rows) => rows.reduce((s, r) => s + Number(r.base_pay_amount), 0) / rows.length;
  const breaching = [...groups.values()]
    .filter((g) => g.cohort_a.length >= minimum && g.cohort_b.length >= minimum)
    .filter((g) => {
      const a = mean(g.cohort_a);
      return Math.abs(Math.round((10000 * (a - mean(g.cohort_b))) / a) / 100) >= threshold;
    });
  if (breaching.length !== 1) throw new Error(`${E}: the committed compensation bytes hold ${breaching.length} breaching band groups, expected 1`);
  const members = new Set([...breaching[0].cohort_a, ...breaching[0].cohort_b].map((r) => r.employee_id));
  if (members.size !== EXPECTED_BREACHING_BAND_MEMBERS) {
    throw new Error(`${E}: the breaching band group holds ${members.size} members, expected ${EXPECTED_BREACHING_BAND_MEMBERS}`);
  }
  return members;
}

/** The committed HR-12 work locations, checked against the published class counts. */
function readWorkLocations() {
  const rows = readCsv("datasets/hr/compensation-band-dataset/employee-compensation.csv", ["employee_id", "work_location"]);
  if (rows.length !== 582) throw new Error(`${E}: the committed compensation bytes hold ${rows.length} rows, expected 582`);
  for (const [cls, expected] of Object.entries(EXPECTED_CLASS_ROWS)) {
    const n = rows.filter((r) => r.work_location === cls).length;
    if (n !== expected) throw new Error(`${E}: the committed compensation bytes hold ${n} ${cls} rows, expected ${expected}`);
  }
  const departing = rows.find((r) => r.employee_id === DEPARTING_EMPLOYEE_ID);
  if (!departing || departing.work_location !== "remote") throw new Error(`${E}: the departing employee is not a committed remote row`);
  return new Map(rows.map((r) => [r.employee_id, r.work_location]));
}

// ----------------------------------------------------------------- the build

let cached = null;

/**
 * The whole roster: grammar, locations, rules, leave records and obligations,
 * with every published rule asserted. Exported so HR-16 reads the location
 * table in process.
 */
export function buildLeaveComplianceRoster() {
  if (cached) return cached;
  const salience = c7Salience();
  const hr12 = readWorkLocations();

  // ---- the population: active rows less the departing employee
  const population = salience.active.filter((row) => row.employee_id !== salience.departingId);
  if (population.length !== EMPLOYEE_COUNT) throw new Error(`${E}: the population holds ${population.length} rows, expected ${EMPLOYEE_COUNT}`);
  const popIds = population.map((r) => r.employee_id);
  const hr12Ids = [...hr12.keys()].filter((e) => e !== salience.departingId).sort();
  if (popIds.join(",") !== hr12Ids.join(",")) throw new Error(`${E}: the population is not the compensation band dataset's rows less the departing employee`);
  const rosterById = new Map(population.map((r) => [r.employee_id, r]));

  // ---- the guarded pool: 438, then less the C7 findings, 399
  if (salience.requesterPool.length !== EXPECTED_C7_POOL) throw new Error(`${E}: the C7 pool holds ${salience.requesterPool.length}, expected ${EXPECTED_C7_POOL}`);
  const requesters = new Set(buildHelpdeskQueue().requests.map((r) => r.requester_employee_id));
  const census = buildBenefitsCensus();
  const band = breachingBandMembers();
  const c8Pool = salience.requesterPool.filter((r) => !requesters.has(r.employee_id)
    && r.employee_id !== census.unverifiedEmployeeId
    && !band.has(r.employee_id));
  if (c8Pool.length !== EXPECTED_C8_POOL) throw new Error(`${E}: the C8 pool holds ${c8Pool.length}, expected ${EXPECTED_C8_POOL}`);

  const used = new Set();
  const take = (employeeId) => { if (used.has(employeeId)) throw new Error(`${E}: an employee was drawn twice`); used.add(employeeId); return employeeId; };

  // ---- the relocation mover to New York City, drawn before the deal so its counts include them
  const relocationOrder = createRng(id, "relocation").shuffle(c8Pool.filter((r) => hr12.get(r.employee_id) === "remote"));
  const mover = take(relocationOrder[0].employee_id);

  // ---- where people sit
  const location = new Map();
  for (const row of population) {
    const cls = hr12.get(row.employee_id);
    if (cls !== "remote") location.set(row.employee_id, { work_state: CLASS_STATE[cls], work_locality: "" });
  }
  location.set(mover, { work_state: "US-NY", work_locality: "US-NY-NYC" });
  const deck = REMOTE_DEAL.flatMap((cell) => {
    const n = cell.work_locality === "US-NY-NYC" ? cell.count - 1 : cell.count;
    return Array.from({ length: n }, () => ({ work_state: cell.work_state, work_locality: cell.work_locality }));
  });
  const remoteRows = population.filter((r) => hr12.get(r.employee_id) === "remote" && r.employee_id !== mover);
  if (deck.length !== remoteRows.length) throw new Error(`${E}: the remote deck holds ${deck.length} cards for ${remoteRows.length} remote rows`);
  const dealt = createRng(id, "remote-state").shuffle(deck);
  remoteRows.forEach((row, index) => location.set(row.employee_id, dealt[index]));
  const locations = population.map((row) => ({
    employee_id: row.employee_id,
    work_location: hr12.get(row.employee_id),
    ...location.get(row.employee_id),
  }));
  const locById = new Map(locations.map((r) => [r.employee_id, r]));

  // ---- the draw pool: the C8 pool with a work_state other than Delaware
  const drawPool = c8Pool.filter((r) => locById.get(r.employee_id).work_state !== "US-DE");
  if (drawPool.length !== EXPECTED_DRAW_POOL) throw new Error(`${E}: the draw pool holds ${drawPool.length}, expected ${EXPECTED_DRAW_POOL}`);
  if (!drawPool.some((r) => r.employee_id === mover)) throw new Error(`${E}: the New York City mover sits outside the draw pool`);

  // ---- leave records, drawn under the handbook's tenure rules
  const tenureMonths = { family_and_medical: 12, parental: 6, military: 0 };
  const leaveOrder = createRng(id, "leave").shuffle(drawPool);
  const leaves = LEAVE_DESIGN.map((design) => {
    const cut = monthsBefore(design.start_date, tenureMonths[design.leave_type]);
    const pick = leaveOrder.find((r) => !used.has(r.employee_id) && r.start_date <= cut);
    if (!pick) throw new Error(`${E}: no pool row meets ${design.slot}'s tenure rule`);
    return { ...design, employee_id: take(pick.employee_id) };
  });
  leaves.sort((a, b) => a.request_date.localeCompare(b.request_date) || a.employee_id.localeCompare(b.employee_id));
  leaves.forEach((leave, index) => { leave.leave_id = `LVR-2026-${String(index + 1).padStart(4, "0")}`; });

  // ---- reverification: the five HR-17 holders fixed, seven drawn
  const hr17 = buildMixedSensitivityRecords();
  const holders = (status) => hr17.filter((r) => r.immigration_status === status).map((r) => r.employee_id).sort();
  const renewal = holders(RENEWAL_DUE_STATUS);
  const sponsored = holders(SPONSORED_STATUS);
  if (renewal.length !== 2 || sponsored.length !== 3 || holders(VERIFIED_STATUS).length !== 1) {
    throw new Error(`${E}: the mixed sensitivity immigration census moved`);
  }
  const reverificationOrder = createRng(id, "reverification").shuffle(drawPool).filter((r) => !used.has(r.employee_id));
  const drawnReverification = reverificationOrder.slice(0, DRAWN_REVERIFICATION_DATES.length).map((r) => take(r.employee_id));
  const reverifications = [
    ...renewal.map((employee_id, i) => ({ employee_id, date: RENEWAL_DUE_DATES[i] })),
    ...sponsored.map((employee_id, i) => ({ employee_id, date: SPONSORED_DATES[i] })),
    ...drawnReverification.map((employee_id, i) => ({ employee_id, date: DRAWN_REVERIFICATION_DATES[i] })),
  ];

  // ---- the two open relocations, drawn after the deal from the same relocation order
  const relocations = [{ ...RELOCATION_DESIGN[0], employee_id: mover }];
  for (const design of RELOCATION_DESIGN.slice(1)) {
    const pick = relocationOrder.find((r) => {
      const loc = locById.get(r.employee_id);
      return !used.has(r.employee_id) && loc.work_state === design.from_state && loc.work_locality === design.from_locality
        && drawPool.some((p) => p.employee_id === r.employee_id);
    });
    if (!pick) throw new Error(`${E}: no remote pool row sits in ${design.from_state} for ${design.slot}`);
    relocations.push({ ...design, employee_id: take(pick.employee_id) });
  }

  // ---- obligations
  const ruleById = new Map(OBLIGATION_RULES.map((r) => [r.rule_id, r]));
  const drafts = [];
  const push = (ruleId, fields) => drafts.push({
    rule_id: ruleId, obligation_type: ruleById.get(ruleId).obligation_type, owner_role: ruleById.get(ruleId).owner_role,
    related_leave_id: "", target_jurisdiction_code: "", completed_date: "", ...fields,
  });
  for (const leave of leaves) {
    if (leave.leave_type === "family_and_medical") {
      push("OBR-01", { employee_id: leave.employee_id, related_leave_id: leave.leave_id, basis_date: leave.request_date, due_date: addDays(leave.request_date, 15), completed_date: leave.completed["OBR-01"] ?? "" });
    }
    const due = businessDaysBefore(leave.expected_return_date, 10);
    if (due !== OBR02_DUE[leave.slot]) throw new Error(`${E}: ${leave.slot}'s return confirmation walks to ${due}, the design says ${OBR02_DUE[leave.slot]}`);
    push("OBR-02", { employee_id: leave.employee_id, related_leave_id: leave.leave_id, basis_date: leave.expected_return_date, due_date: due, completed_date: leave.completed["OBR-02"] ?? "" });
  }
  for (const r of reverifications) push("OBR-03", { employee_id: r.employee_id, basis_date: r.date, due_date: r.date });
  for (const r of relocations) push("OBR-04", { employee_id: r.employee_id, basis_date: r.effective, due_date: addDays(r.effective, -1), target_jurisdiction_code: r.target, completed_date: r.completed });
  drafts.sort((a, b) => a.due_date.localeCompare(b.due_date) || a.rule_id.localeCompare(b.rule_id) || a.employee_id.localeCompare(b.employee_id));
  const obligations = drafts.map((d, index) => ({
    obligation_id: `LCO-2026-${String(index + 1).padStart(4, "0")}`,
    employee_id: d.employee_id, rule_id: d.rule_id, obligation_type: d.obligation_type,
    related_leave_id: d.related_leave_id, basis_date: d.basis_date, due_date: d.due_date,
    target_jurisdiction_code: d.target_jurisdiction_code, owner_role: d.owner_role, completed_date: d.completed_date,
  }));

  const leaveRows = leaves.map((l) => ({
    leave_id: l.leave_id, employee_id: l.employee_id, leave_type: l.leave_type, leave_status: l.leave_status,
    request_date: l.request_date, start_date: l.start_date, expected_return_date: l.expected_return_date,
    reason_detail: l.reason_detail ?? "",
  }));

  const grammar = {
    grammar_id: GRAMMAR_ID,
    as_of: AS_OF,
    universe_now: UNIVERSE_NOW,
    stamp_statement: STAMP_STATEMENT,
    population_rule: POPULATION_RULE,
    location_rule: LOCATION_RULE,
    jurisdiction_join: JURISDICTION_JOIN,
    watch_list_as_of: WATCH_LIST_AS_OF,
    alert_window_start: ALERT_WINDOW_START,
    alert_window_end: ALERT_WINDOW_END,
    alert_window_days: ALERT_WINDOW_DAYS,
    business_day_rule: BUSINESS_DAY_RULE,
    work_location_vocabulary: WORK_LOCATIONS.join("; "),
    leave_type_vocabulary: LEAVE_TYPES.join("; "),
    leave_status_vocabulary: LEAVE_STATUSES.join("; "),
    obligation_type_vocabulary: OBLIGATION_TYPES.join("; "),
    owner_role_vocabulary: OWNER_ROLES.join("; "),
    employee_count: locations.length,
    leave_record_count: leaveRows.length,
    obligation_count: obligations.length,
    open_obligation_count: obligations.filter((o) => o.completed_date === "").length,
    alert_statement: ALERT_STATEMENT,
    reason_detail_statement: REASON_DETAIL_STATEMENT,
    not_modelled_statement: NOT_MODELLED_STATEMENT,
  };

  const drawn = [...used];
  assertPostConditions({ grammar, locations, leaves: leaveRows, obligations, salience, requesters, census, band, drawPool, drawn, hr17, rosterById, relocations });
  cached = { grammar, locations, rules: OBLIGATION_RULES, leaves: leaveRows, obligations, drawPoolSize: drawPool.length, drawn };
  return cached;
}

/** The distinct jurisdiction codes HR-15 places people in, sorted: HR-16's use_jurisdictions. */
export function locationJurisdictionCodes() {
  const codes = new Set();
  for (const row of buildLeaveComplianceRoster().locations) {
    codes.add(row.work_state);
    if (row.work_locality) codes.add(row.work_locality);
  }
  return [...codes].sort();
}

// ----------------------------------------------------------------- the checks

const inRange = (date, start, end) => date >= start && date <= end;

function assertPostConditions({ grammar, locations, leaves, obligations, salience, requesters, census, band, drawPool, drawn, hr17, rosterById, relocations }) {
  const fail = (message) => { throw new Error(`${E}: ${message}`); };

  // ---- locations (2.3.3, X40, X44)
  const jurisdictionCodes = new Set(JURISDICTIONS.map((j) => j.code));
  const parentOf = new Map(JURISDICTIONS.map((j) => [j.code, j.parent_code]));
  const states = {};
  for (const row of locations) {
    if (!WORK_LOCATIONS.includes(row.work_location)) fail(`a work_location outside the vocabulary`);
    if (!jurisdictionCodes.has(row.work_state)) fail(`the work_state ${row.work_state} misses the watch list's jurisdictions`);
    if (row.work_locality && (!jurisdictionCodes.has(row.work_locality) || parentOf.get(row.work_locality) !== row.work_state)) fail("a work_locality does not resolve under its state");
    states[row.work_state] = (states[row.work_state] ?? 0) + 1;
  }
  for (const [state, expected] of Object.entries(STATE_TOTALS)) {
    if ((states[state] ?? 0) !== expected) fail(`${states[state] ?? 0} rows sit in ${state}, expected ${expected}`);
  }
  for (const cell of REMOTE_DEAL) {
    const n = locations.filter((r) => r.work_location === "remote" && r.work_state === cell.work_state && r.work_locality === cell.work_locality).length;
    if (n !== cell.count) fail(`${n} remote rows sit in ${cell.work_state} ${cell.work_locality || "with no locality"}, expected ${cell.count}`);
  }
  if (locations.some((r) => r.work_location !== "remote" && r.work_state !== CLASS_STATE[r.work_location])) fail("an office row sits outside its office's state");

  // ---- rules and dates (2.3.2, 2.3.4)
  const ruleIds = OBLIGATION_RULES.map((r) => r.rule_id);
  if (ruleIds.join(",") !== "OBR-01,OBR-02,OBR-03,OBR-04") fail("the rule ids moved");
  for (const rule of OBLIGATION_RULES) if (!OWNER_ROLES.includes(rule.owner_role) || !OBLIGATION_TYPES.includes(rule.obligation_type)) fail(`${rule.rule_id} leaves a vocabulary`);
  // The business-day helper on the four open OBR-02 dates of 2.3.5.
  const proof = { "2026-09-28": "2026-09-14", "2026-09-30": "2026-09-16", "2026-10-05": "2026-09-21", "2026-10-14": "2026-09-30" };
  for (const [ret, due] of Object.entries(proof)) if (businessDaysBefore(ret, 10) !== due) fail(`ten business days before ${ret} is not ${due}`);
  const leaveById = new Map(leaves.map((l) => [l.leave_id, l]));
  const dates = [];
  for (const leave of leaves) {
    dates.push(leave.request_date, leave.start_date, leave.expected_return_date);
    const status = leave.expected_return_date <= AS_OF ? "returned" : leave.start_date <= AS_OF ? "on_leave" : "approved_not_started";
    if (leave.leave_status !== status) fail(`a leave's status is not the one its dates give`);
    if (!LEAVE_TYPES.includes(leave.leave_type)) fail("a leave type outside the vocabulary");
    const tenure = { family_and_medical: 12, parental: 6, military: 0 }[leave.leave_type];
    if (rosterById.get(leave.employee_id).start_date > monthsBefore(leave.start_date, tenure)) fail("a leave employee fails the handbook's tenure rule");
  }
  const familyRequests = leaves.filter((l) => l.leave_type === "family_and_medical").map((l) => l.request_date);
  if (familyRequests.some((d) => inRange(d, "2026-08-17", "2026-08-31"))) fail("a family and medical request falls where its certification would land in the window");
  for (const o of obligations) {
    dates.push(o.basis_date, o.due_date);
    if (o.completed_date) {
      dates.push(o.completed_date);
      if (o.completed_date > o.due_date || o.completed_date > AS_OF) fail("an obligation was completed after its due date or the as_of");
    } else if (o.due_date < AS_OF) fail("an open obligation is overdue");
    const leave = leaveById.get(o.related_leave_id);
    const expected = {
      "OBR-01": () => addDays(leave.request_date, 15),
      "OBR-02": () => businessDaysBefore(leave.expected_return_date, 10),
      "OBR-03": () => o.basis_date,
      "OBR-04": () => addDays(o.basis_date, -1),
    }[o.rule_id]();
    if (o.due_date !== expected) fail(`an ${o.rule_id} due_date does not recompute from its basis`);
    if ((o.rule_id === "OBR-01" || o.rule_id === "OBR-02") !== Boolean(leave)) fail("related_leave_id is filled off a leave rule or empty on one");
    if ((o.rule_id === "OBR-04") !== (o.target_jurisdiction_code !== "")) fail("target_jurisdiction_code is filled off OBR-04 or empty on it");
    if (o.target_jurisdiction_code && !jurisdictionCodes.has(o.target_jurisdiction_code)) fail("a target jurisdiction misses the watch list");
    if (o.rule_id !== "OBR-03" && (o.due_date > "2026-12-31" || o.basis_date > "2026-12-31")) fail("a non-expiry date falls after 2026-12-31");
  }
  for (const d of dates) if (isWeekend(d)) fail(`${d} falls on a weekend`);
  const byRule = (rule) => obligations.filter((o) => o.rule_id === rule).length;
  if (obligations.length !== OBLIGATION_COUNT || byRule("OBR-01") !== 4 || byRule("OBR-02") !== 8 || byRule("OBR-03") !== 12 || byRule("OBR-04") !== 3) fail("the obligation census moved");
  if (grammar.open_obligation_count !== OPEN_OBLIGATION_COUNT) fail(`${grammar.open_obligation_count} open obligations, expected ${OPEN_OBLIGATION_COUNT}`);
  if (new Set(obligations.map((o) => o.employee_id)).size !== 23) fail("the obligation carriers are not 23 employees");
  for (const r of relocations) {
    const row = locations.find((l) => l.employee_id === r.employee_id);
    if (row.work_location !== "remote") fail("a relocation carrier is not remote");
    const now = r.completed ? { work_state: "US-NY", work_locality: "US-NY-NYC" } : { work_state: r.from_state, work_locality: r.from_locality };
    if (row.work_state !== now.work_state || row.work_locality !== now.work_locality) fail("a relocation carrier's location row disagrees with its request");
  }

  // ---- HR-15a (2.3.5) and every reading
  const window = (days, list = obligations) => list.filter((o) => inRange(o.due_date, ALERT_WINDOW_START, addDays(ALERT_WINDOW_START, days))).length;
  if (addDays(ALERT_WINDOW_START, ALERT_WINDOW_DAYS) !== ALERT_WINDOW_END) fail("the alert window end is not the start plus its days");
  const inWindow = obligations.filter((o) => inRange(o.due_date, ALERT_WINDOW_START, ALERT_WINDOW_END));
  if (inWindow.length !== 1) fail(`${inWindow.length} obligations in the alert window, expected 1`);
  if (obligations.filter((o) => o.due_date === addDays(ALERT_WINDOW_END, 1)).length !== 1) fail("the day after the window no longer holds 1");
  if (window(21) !== 3) fail(`a 21 day window returns ${window(21)}, expected 3`);
  if (window(30) !== 5) fail(`a 30 day window returns ${window(30)}, expected 5`);
  if (obligations.filter((o) => !o.completed_date && o.due_date < AS_OF).length !== 0) fail("an obligation is overdue");
  const recomputed = (walk) => obligations.map((o) => (o.rule_id === "OBR-02" ? { ...o, due_date: walk(leaveById.get(o.related_leave_id).expected_return_date) } : o));
  if (window(ALERT_WINDOW_DAYS, recomputed((d) => addDays(d, -10))) !== 0) fail("counting ten calendar days no longer returns 0");
  if (window(ALERT_WINDOW_DAYS, recomputed((d) => businessDaysBeforeSkipping(d, 10, ["2026-09-07"]))) !== 1) fail("treating 2026-09-07 as a holiday no longer returns 1");

  // ---- HR-15b
  const withReason = leaves.filter((l) => l.reason_detail !== "");
  if (withReason.length !== 1) fail(`${withReason.length} leave records carry a reason detail, expected 1`);
  if (inWindow[0].related_leave_id !== withReason[0].leave_id) fail("the window's obligation is not on the reason detail's leave");
  if (leaves.filter((l) => l.leave_type === "family_and_medical").length !== 4) fail("the family and medical census is not 4");
  const healthHolders = new Set(hr17.filter((r) => r.health_accommodation_note).map((r) => r.employee_id));
  if (leaves.filter((l) => healthHolders.has(l.employee_id)).length !== 0) fail("a leave belongs to a health note holder");
  const hr17Ids = new Set(hr17.map((r) => r.employee_id));
  if (hr17Ids.has(withReason[0].employee_id)) fail("the reason detail's employee holds a mixed sensitivity record (X42)");

  // ---- X41
  const reverify = new Set(obligations.filter((o) => o.rule_id === "OBR-03").map((o) => o.employee_id));
  for (const record of hr17) {
    const expected = [RENEWAL_DUE_STATUS, SPONSORED_STATUS].includes(record.immigration_status);
    if (reverify.has(record.employee_id) !== expected) fail("reverification disagrees with the mixed sensitivity record set (X41)");
  }
  for (const o of obligations.filter((x) => x.rule_id === "OBR-03" && sponsoredIds(hr17).has(x.employee_id))) {
    if (inRange(o.due_date, ALERT_WINDOW_START, ALERT_WINDOW_END)) fail("a sponsored holder's reverification sits in the window");
  }

  // ---- X43: every drawn employee inside the pool and outside every salience set
  const poolIds = new Set(drawPool.map((r) => r.employee_id));
  if (drawn.length !== 18) fail(`${drawn.length} drawn employees, expected 18`);
  for (const e of drawn) {
    if (!poolIds.has(e)) fail("a drawn employee sits outside the draw pool");
    if (requesters.has(e) || e === census.unverifiedEmployeeId || e === salience.outOfBandPayId || band.has(e)
      || salience.hr17Ids.has(e) || salience.hr18Subjects.has(e) || salience.hr08Population.has(e)
      || salience.namedIds.has(e) || rosterById.get(e).department === "People" || e === CHIEF_EXECUTIVE_ID) {
      fail("a drawn employee carries salience (X43)");
    }
  }

  // ---- X42: no HR-15 value equals a mixed sensitivity value string
  const valueColumns = [...SPECIAL_CATEGORY_FIELDS, ...RESTRICTED_FIELDS, "home_city", "emergency_contact_name", "emergency_contact_phone"];
  const hr17Values = new Set();
  for (const record of hr17) for (const c of valueColumns) if (record[c]) hr17Values.add(String(record[c]));
  for (const table of [locations, leaves, obligations, OBLIGATION_RULES, [grammar]]) {
    for (const row of table) for (const v of Object.values(row)) if (hr17Values.has(String(v))) fail("a cell equals a mixed sensitivity value string (X42)");
  }

  // ---- HR-21: the stamp and no regulatory date in the window
  if (WATCH_LIST_AS_OF !== AS_OF) fail("the watch list's as_of disagrees");
  for (const record of buildWatchList().records) {
    for (const o of record.obligations) {
      if (o.applies_from && inRange(o.applies_from, ALERT_WINDOW_START, ALERT_WINDOW_END)) fail("a watch list obligation applies inside the alert window");
    }
  }
}

function sponsoredIds(hr17) {
  return new Set(hr17.filter((r) => r.immigration_status === SPONSORED_STATUS).map((r) => r.employee_id));
}

function assertEmittedBytes(files, roster) {
  const names = roster.map((r) => `${r.first_name} ${r.last_name}`);
  for (const file of files) {
    const text = file.content;
    if (text.includes(EN_DASH) || text.includes(EM_DASH)) throw new Error(`${E}: ${file.path} carries a dash this pack does not write`);
    if (text.includes("$") || text.includes("%") || /https?:\/\/|www\./.test(text)) throw new Error(`${E}: ${file.path} carries money, a percent or a URL`);
    if (/\b(FMLA|USERRA|ILCS|U\.S\.C|CFR|Act|Title VII|Law)\b/.test(text)) throw new Error(`${E}: ${file.path} names a statute`);
    if (/(^|[^A-Za-z])(HRC|HRQ|DEP|RVA|BND|MSD|ESR|EXT|RQN|BEN|EAW|AIT|BAU|NTC)-[0-9]/m.test(text) || text.includes("EMP-0601")) {
      throw new Error(`${E}: ${file.path} carries an id from another block`);
    }
    for (const name of names) if (text.includes(name)) throw new Error(`${E}: ${file.path} carries a roster name`);
  }
  for (const prefix of ["LVR-", "LCO-", "OBR-"]) assertPrefixUnusedElsewhere(prefix, OWN_DIR, E);
}

export function generate() {
  const { grammar, locations, rules, leaves, obligations } = buildLeaveComplianceRoster();
  const files = [
    { path: FILES.grammar, content: toCsv(COLUMNS.grammar, [grammar]) },
    { path: FILES.locations, content: toCsv(COLUMNS.locations, locations) },
    { path: FILES.rules, content: toCsv(COLUMNS.rules, rules) },
    { path: FILES.leaves, content: toCsv(COLUMNS.leaves, leaves) },
    { path: FILES.obligations, content: toCsv(COLUMNS.obligations, obligations) },
  ];
  assertEmittedBytes(files, c7Salience().active);
  return files;
}


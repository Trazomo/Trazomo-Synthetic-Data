// hr-lifecycle: the one seeded builder behind HR-06 (onboarding checklist
// templates), HR-07 (offboarding checklist and access inventory) and HR-08
// (review cycle roster). Shared helper, never registered, the finance-roles.js
// and finance-statement.js precedent documented at generators/index.js:11-12.
// The three registered modules are thin wrappers over buildLifecycleCoordination()
// the way FIN-02 and FIN-03 wrap FIN-01's buildCashReconciliation().
//
// Why one builder rather than three. The three artifacts share one roster
// build, one as-of, one business-day calendar and one set of cross-artifact
// disjointness rules. Three independent generators would each draw people out
// of the same 582-row pool with no way to guarantee that the new hire's buddy
// is not the departing employee, or that the late reviewer is not an
// offboarding checklist owner. Shared construction makes those properties true
// rather than checked afterwards.
//
// Two orderings are load bearing and both live inside this file.
//
//   1. Frozen reads before seeded draws. The HR-01 requisition, the HR-18 case
//      queue and the HR-09 pair are read at the top behind loud-throw shape
//      pins, so an amendment to any of them breaks generation rather than
//      shipping lifecycle records that quietly disagree with the pack.
//   2. People before content. The new hire, the departing employee, the HR-08
//      scope and the plant carrier are all resolved before any task, grant or
//      assignment row exists, because the disjointness rules are cheap as
//      constraints on a draw and expensive as searches over finished files.
//
// Every selection draws from a stream named for what it selects
// (createRng("HR-LIFECYCLE", "departing") and so on). createRng("HR-06", ...)
// is never used for a cross-artifact selection: a reroll of one artifact's
// cosmetic draws must not move another artifact's people.
//
// House rules held here rather than restated per artifact: every date is ISO
// and no file carries a time of day; no money amount, percentage, rating,
// score, pay band, work location, date of birth or health note exists in any
// of the eight files; HR-07 carries no exit reason column; every system is
// named descriptively by what it does and no real vendor, product or platform
// brand appears anywhere.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { addBusinessDays, addDays, isWeekend } from "../dates.js";
import { drawUniqueNames } from "../namePool.js";
import { createRng } from "../seed.js";
import { buildRoster } from "./core-04-people-roster.js";
import { buildCaseQueue, CASE_COUNT } from "./hr-18-hris-export.js";

/** The stream family every cross-artifact selection draws from. */
const STREAM = "HR-LIFECYCLE";

/** Error prefix. The three registered ids share one builder, so errors name the builder. */
const E = "hr-lifecycle";

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..");
const HR_01_REGISTER = join(REPO_ROOT, "artifacts", "HR-01", "role-requisition-register.json");
const HR_09_LOG = join(REPO_ROOT, "artifacts", "HR-09", "one-to-one-log.md");
const HR_09_DRAFT = join(REPO_ROOT, "artifacts", "HR-09", "performance-review-draft.md");

// ------------------------------------------------------------------ the clock

/** The universe as-of, printed once per artifact and never contradicted. */
export const AS_OF = "2026-04-03";

/** The window the frozen requisition's own target start date has to fall inside. */
export const FIRST_WEEK_OF_APRIL = { start: "2026-04-01", end: "2026-04-07" };

/** The first business day on or after an ISO date. */
function rollForward(iso) {
  let day = iso;
  while (isWeekend(day)) day = addDays(day, 1);
  return day;
}

/** The first business day strictly after an ISO date. */
function firstBusinessDayAfter(iso) {
  return rollForward(addDays(iso, 1));
}

/** Every business day in an inclusive ISO window, oldest first. */
function businessDays(startIso, endIso) {
  const days = [];
  for (let day = startIso; day <= endIso; day = addDays(day, 1)) {
    if (!isWeekend(day)) days.push(day);
  }
  return days;
}

// --------------------------------------------------------- published vocabularies
// Every status, phase, owner role, action, grant source, system category,
// access level and relationship is a closed list published in the spec and
// exported here as a table the test restates literally, the HR-18 discipline.

/** HR-06 phases, in checklist order. */
export const ONBOARDING_PHASES = ["pre_start", "day_one", "week_one", "first_month"];

/** HR-06 owner roles. One person per role in the instance. */
export const ONBOARDING_OWNER_ROLES = [
  "People Operations",
  "IT & Security",
  "Hiring Manager",
  "Onboarding Buddy",
  "Recruiter",
  "New Hire",
];

/** HR-06 approval owner roles: the roles that may approve an access request. */
export const ONBOARDING_APPROVAL_ROLES = ["IT & Security", "Hiring Manager"];

/** HR-06 and HR-07 task statuses. completed_date is non-empty exactly on complete. */
export const TASK_STATUSES = ["not_started", "in_progress", "complete"];

/** The single published due_basis: every onboarding due date is derived from the start date. */
export const DUE_BASIS = "start_date";

/** HR-07 phases, in exit order. */
export const OFFBOARDING_PHASES = ["notice", "final_week", "last_day", "post_exit"];

/** HR-07 owner roles. */
export const OFFBOARDING_OWNER_ROLES = [
  "People Operations",
  "IT & Security",
  "Manager",
  "HR Business Partner",
];

/** HR-07 checklist actions. */
export const OFFBOARDING_ACTIONS = [
  "revoke_access",
  "review_shared_access",
  "transfer_ownership",
  "collect_asset",
  "administrative",
];

/**
 * HR-07 grant sources. Exactly one of the four is the identity provider, so
 * "not the identity provider" and "not visible to a single sign on sweep" are
 * the same set and the coverage tie-out is unambiguous.
 */
export const GRANT_SOURCES = [
  "identity_provider",
  "vendor_admin_console",
  "shared_drive_acl",
  "local_account",
];

/** The one grant source a single sign on sweep sees. */
export const IDENTITY_PROVIDER_SOURCE = "identity_provider";

/** HR-07 system categories. */
export const SYSTEM_CATEGORIES = [
  "identity",
  "engineering",
  "productivity",
  "monitoring",
  "data",
  "vendor_service",
];

/** HR-07 access levels. */
export const ACCESS_LEVELS = ["read", "write", "admin"];

/** HR-07 shared-grant flag. */
export const SHARED_GRANT_VALUES = ["yes", "no"];

/** HR-06 evidence flag. */
export const EVIDENCE_VALUES = ["yes", "no"];

/** The two exit types the artifact publishes. */
export const EXIT_TYPES = ["voluntary_resignation", "involuntary"];

/** HR-07 carries the employee side of the offboarding process and only that. */
export const WORKER_TYPES = ["employee"];

/** HR-08 relationship values. */
export const REVIEWER_RELATIONSHIPS = ["manager", "skip_level"];

/** HR-08 assignment statuses. submitted_date is non-empty exactly on submitted. */
export const REVIEW_STATUSES = ["not_started", "in_progress", "submitted"];

// ------------------------------------------------------------- the system catalog
// One catalog behind HR-06's granted systems and HR-07's inventory, so a system
// id means the same thing in both files. Every name says what the system does
// in ordinary words: no vendor, product or platform brand appears, which keeps
// the proper-noun screen a set-membership check.

export const SYSTEM_CATALOG = [
  { system_id: "SYS-0001", system_name: "identity directory", system_category: "identity" },
  { system_id: "SYS-0002", system_name: "single sign on administration console", system_category: "identity" },
  { system_id: "SYS-0003", system_name: "privileged access vault", system_category: "identity" },
  { system_id: "SYS-0004", system_name: "workplace email and calendar", system_category: "productivity" },
  { system_id: "SYS-0005", system_name: "shared team drive", system_category: "productivity" },
  { system_id: "SYS-0006", system_name: "shared engineering drive", system_category: "productivity" },
  { system_id: "SYS-0007", system_name: "document collaboration space", system_category: "productivity" },
  { system_id: "SYS-0008", system_name: "team chat workspace", system_category: "productivity" },
  { system_id: "SYS-0009", system_name: "internal wiki", system_category: "productivity" },
  { system_id: "SYS-0010", system_name: "ticket and issue tracker", system_category: "productivity" },
  { system_id: "SYS-0011", system_name: "source control", system_category: "engineering" },
  { system_id: "SYS-0012", system_name: "continuous integration service", system_category: "engineering" },
  { system_id: "SYS-0013", system_name: "artifact registry", system_category: "engineering" },
  { system_id: "SYS-0014", system_name: "container image registry", system_category: "engineering" },
  { system_id: "SYS-0015", system_name: "infrastructure as code pipeline", system_category: "engineering" },
  { system_id: "SYS-0016", system_name: "secret management service", system_category: "engineering" },
  { system_id: "SYS-0017", system_name: "production cloud console", system_category: "engineering" },
  { system_id: "SYS-0018", system_name: "staging cloud console", system_category: "engineering" },
  { system_id: "SYS-0019", system_name: "database administration console", system_category: "engineering" },
  { system_id: "SYS-0020", system_name: "feature flag service", system_category: "engineering" },
  { system_id: "SYS-0021", system_name: "metrics dashboard", system_category: "monitoring" },
  { system_id: "SYS-0022", system_name: "log search", system_category: "monitoring" },
  { system_id: "SYS-0023", system_name: "incident paging rota", system_category: "monitoring" },
  { system_id: "SYS-0024", system_name: "error tracking service", system_category: "monitoring" },
  { system_id: "SYS-0025", system_name: "uptime probe service", system_category: "monitoring" },
  { system_id: "SYS-0026", system_name: "distributed tracing console", system_category: "monitoring" },
  { system_id: "SYS-0027", system_name: "data warehouse", system_category: "data" },
  { system_id: "SYS-0028", system_name: "business intelligence workspace", system_category: "data" },
  { system_id: "SYS-0029", system_name: "product analytics workspace", system_category: "data" },
  { system_id: "SYS-0030", system_name: "data pipeline scheduler", system_category: "data" },
  { system_id: "SYS-0031", system_name: "payroll and benefits portal", system_category: "vendor_service" },
  { system_id: "SYS-0032", system_name: "learning platform", system_category: "vendor_service" },
  { system_id: "SYS-0033", system_name: "expense system", system_category: "vendor_service" },
  { system_id: "SYS-0034", system_name: "customer relationship system", system_category: "vendor_service" },
  { system_id: "SYS-0035", system_name: "finance ledger", system_category: "vendor_service" },
  { system_id: "SYS-0036", system_name: "status page administration", system_category: "vendor_service" },
];

const SYSTEM_BY_ID = new Map(SYSTEM_CATALOG.map((row) => [row.system_id, row]));

function system(systemId) {
  const row = SYSTEM_BY_ID.get(systemId);
  if (!row) throw new Error(`${E}: ${systemId} is not in the published system catalog`);
  return row;
}

// ----------------------------------------------------------- the frozen reads
// Placed before any seeded draw. Each read states the shape it was built
// against and throws naming the number or the key that moved, because the next
// person to see the error will be amending the frozen artifact.

/**
 * The one frozen requisition whose target_start_date falls in the first week of
 * April 2026, selected by that predicate rather than by id. The generator
 * throws unless the predicate still resolves to exactly one row.
 */
export function readStartingRequisition() {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(HR_01_REGISTER, "utf8"));
  } catch (cause) {
    throw new Error(
      `${E}: could not read the frozen register at artifacts/HR-01/role-requisition-register.json: ${cause.message}`
    );
  }
  const requisitions = parsed?.requisitions;
  if (!Array.isArray(requisitions)) {
    throw new Error(`${E}: the HR-01 register carries no "requisitions" list`);
  }
  const matches = requisitions.filter(
    (row) =>
      typeof row?.target_start_date === "string"
      && row.target_start_date >= FIRST_WEEK_OF_APRIL.start
      && row.target_start_date <= FIRST_WEEK_OF_APRIL.end
  );
  if (matches.length !== 1) {
    throw new Error(
      `${E}: ${matches.length} frozen requisitions carry a target_start_date inside `
      + `${FIRST_WEEK_OF_APRIL.start} to ${FIRST_WEEK_OF_APRIL.end}, expected exactly 1. `
      + `The onboarding pack derives its whole instance from that one row, so the register needs a look.`
    );
  }
  const requisition = matches[0];
  for (const key of [
    "requisition_id", "requisition_title", "department", "level", "status",
    "target_start_date", "hiring_manager_employee_id", "recruiter_employee_id", "owner_employee_id",
  ]) {
    if (typeof requisition[key] !== "string" || requisition[key] === "") {
      throw new Error(`${E}: the starting requisition carries no "${key}"`);
    }
  }
  if (requisition.status !== "open") {
    throw new Error(
      `${E}: ${requisition.requisition_id} reads status "${requisition.status}", expected "open". `
      + `The seat is open because the hire has accepted and has not started (U-C4-1); a different `
      + `status means the register's own convention moved.`
    );
  }
  return requisition;
}

/**
 * The frozen HR-09 pair, read off the two documents' own header lines. Both
 * files must name the same manager and the same report with the same period,
 * and both must resolve to active roster rows in the manager-to-report
 * direction the roster records.
 */
export function readHr09Pair(roster) {
  const headers = [HR_09_LOG, HR_09_DRAFT].map((path) => {
    let text;
    try {
      text = readFileSync(path, "utf8");
    } catch (cause) {
      throw new Error(`${E}: could not read the frozen HR-09 document at ${path}: ${cause.message}`);
    }
    const read = (label) => {
      const match = new RegExp(`^- ${label}: (.+?) \\((.+?)\\)$`, "m").exec(text);
      const plain = new RegExp(`^- ${label}: (.+)$`, "m").exec(text);
      if (label === "Period") {
        if (!plain) throw new Error(`${E}: ${path} carries no "- Period:" line`);
        return { value: plain[1].trim() };
      }
      if (!match) throw new Error(`${E}: ${path} carries no "- ${label}: Name (Role title)" line`);
      return { name: match[1].trim(), role_title: match[2].trim() };
    };
    return { manager: read("Manager"), report: read("Report"), period: read("Period").value };
  });
  const [log, draft] = headers;
  if (
    log.manager.name !== draft.manager.name
    || log.report.name !== draft.report.name
    || log.manager.role_title !== draft.manager.role_title
    || log.report.role_title !== draft.report.role_title
    || log.period !== draft.period
  ) {
    throw new Error(
      `${E}: the two frozen HR-09 documents no longer name the same pair over the same period. `
      + `The review cycle seats that pair as an ordinary manager row and cannot pick between two readings.`
    );
  }
  const periodMatch = /^(\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})$/.exec(log.period);
  if (!periodMatch) {
    throw new Error(`${E}: the frozen HR-09 period "${log.period}" is not an ISO "start to end" window`);
  }

  const resolve = (who, label) => {
    const rows = roster.filter(
      (row) =>
        `${row.first_name} ${row.last_name}` === who.name
        && row.role_title === who.role_title
        && row.employment_status === "active"
    );
    if (rows.length !== 1) {
      throw new Error(
        `${E}: the frozen HR-09 ${label} "${who.name} (${who.role_title})" resolves to ${rows.length} active `
        + `roster rows, expected exactly 1`
      );
    }
    return rows[0];
  };
  const manager = resolve(log.manager, "manager");
  const report = resolve(log.report, "report");
  if (report.manager_employee_id !== manager.employee_id) {
    throw new Error(
      `${E}: the roster no longer seats the frozen HR-09 report under the frozen HR-09 manager, `
      + `so the pair would not appear in the cycle as a manager row`
    );
  }
  return {
    manager,
    report,
    period_start: periodMatch[1],
    period_end: periodMatch[2],
  };
}

/**
 * Every employee id the frozen HR-18 case queue touches, as subject or as
 * assignee. HR-07 excludes all of them: the queue's single termination case is
 * HR-18's own planted over-tier assignment, and pointing a second artifact at a
 * live planted finding would make the offboarding tracker a salience key for an
 * exercise hr-hris-ops still grades.
 */
export function readCaseQueueParticipants(roster) {
  const cases = buildCaseQueue(roster);
  if (cases.length !== CASE_COUNT) {
    throw new Error(`${E}: the HR-18 case queue holds ${cases.length} cases, expected ${CASE_COUNT}`);
  }
  const terminations = cases.filter((row) => row.case_type === "termination_processing");
  if (terminations.length !== 1) {
    throw new Error(
      `${E}: the HR-18 case queue holds ${terminations.length} termination_processing cases, expected 1. `
      + `The offboarding tracker is built to stay clear of exactly one, so the composition needs a look.`
    );
  }
  const touched = new Set();
  for (const row of cases) {
    touched.add(row.subject_employee_id);
    touched.add(row.assignee_employee_id);
  }
  return touched;
}

// ----------------------------------------------------------------- the roster

/**
 * The frozen cluster 2 recruiting arc. These three roster rows already hold a
 * role in a frozen artifact set, so no lifecycle artifact assigns them one:
 * they appear in the review cycle as reviewees, which asserts nothing about
 * their recruiting work, and nowhere else. The requisition that arc runs on is
 * excluded the same way, by the predicate that selects the starting one.
 */
export const C2_RECRUITING_ARC = ["EMP-0517", "EMP-0524", "EMP-0574"];

/** The CORE-04 roster, built in process from its own seeded stream (the FIN-04 convention). */
export function lifecycleRoster() {
  return buildRoster(createRng("CORE-04", "roster"));
}

/** emailFor's exact format, core-04-people-roster.js:171-173, pinned against the roster below. */
function emailFor(firstName, lastName, employeeId) {
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${employeeId.toLowerCase()}@co002.example`;
}

function assertEmailFormatUnchanged(roster) {
  const sample = roster[0];
  const derived = emailFor(sample.first_name, sample.last_name, sample.employee_id);
  if (derived !== sample.email) {
    throw new Error(
      `${E}: the roster's own work-email format has moved (roster "${sample.email}" against derived "${derived}"), `
      + `so the minted new hire's address would not be roster shaped`
    );
  }
}

// ------------------------------------------------------- HR-06: the new hire

/** The minted id sits one past the roster's own maximum, recomputed rather than typed. */
function nextEmployeeId(roster) {
  const numbers = roster.map((row) => Number(row.employee_id.slice(4)));
  const max = Math.max(...numbers);
  if (!Number.isFinite(max)) throw new Error(`${E}: the roster carries no parsable employee ids`);
  return `EMP-${String(max + 1).padStart(4, "0")}`;
}

/**
 * The minted name, drawn from the shared pool and swept against everything the
 * pack already accounts for. Individual components repeat freely and must: the
 * roster carries many Duskwoods and many Faros, and a rule forbidding a
 * repeated surname would be a rule the roster itself breaks. The pair is what
 * has to be new.
 */
function mintNewHireName(roster) {
  const rosterPairs = new Set(roster.map((row) => `${row.first_name} ${row.last_name}`));
  const canonPeople = readFileSync(join(REPO_ROOT, "canon", "people.md"), "utf8");
  const applicationLog = readFileSync(
    join(REPO_ROOT, "artifacts", "HR-02", "application-log.md"),
    "utf8"
  );
  const candidateTokens = new Set();
  for (const match of applicationLog.matchAll(/^\| (ca-\d{3}) \| ([^|]+?) \|/gm)) {
    candidateTokens.add(match[2].trim());
    for (const word of match[2].trim().split(/\s+/)) candidateTokens.add(word);
  }

  const rng = createRng(STREAM, "new-hire-name");
  const drawn = drawUniqueNames(rng, 60);
  for (const name of drawn) {
    const pair = `${name.firstName} ${name.lastName}`;
    if (rosterPairs.has(pair)) continue;
    if (canonPeople.includes(pair)) continue;
    if (canonPeople.includes(name.lastName) && canonPeople.includes(name.firstName)) {
      // Only a full pair is reserved; a component that canon happens to use
      // elsewhere is ordinary, exactly as it is on the roster.
    }
    if (candidateTokens.has(pair) || candidateTokens.has(name.firstName) || candidateTokens.has(name.lastName)) {
      continue;
    }
    return name;
  }
  throw new Error(`${E}: 60 drawn name pairs all collided with the roster, canon or the candidate log`);
}

// ------------------------------------------------- HR-06: the task catalog
// The catalog is a curated table rather than a seeded draw, and the plant lives
// on a pair of template offsets rather than on a drawn seat: the two rows are a
// specific access-provisioning dependency, and randomising which of twenty nine
// tasks carries it would produce nonsense pairs. The answer-key rule is honoured
// the other way round, by never writing a task code beside the plant anywhere.
//
// applies_to_department is either "all" or a CORE-04 department name, and the
// instantiation is that filter. A template row carries no date, no employee id
// and no status, so the template itself cannot carry a defect.

const T = (task_name, phase, applies_to_department, owner_role, due_offset_business_days, extra = {}) => ({
  task_name,
  phase,
  applies_to_department,
  owner_role,
  due_basis: DUE_BASIS,
  due_offset_business_days,
  blocked_by_task_name: extra.blocked_by ?? "",
  grants_system_id: extra.grants ?? "",
  approval_owner_role: extra.approver ?? "",
  evidence_required: extra.evidence ?? "no",
});

const OFFER_PACK = "Send the written offer pack and collect the signed copy";
const PAYROLL_RECORD = "Open the payroll and benefits enrolment record";
const DIRECTORY_REQUEST = "Raise the identity directory account request";
const MAILBOX_REQUEST = "Raise the workplace email and calendar request";
const ANALYTICS_REQUEST = "Raise the product analytics workspace request";
const EQUIPMENT_ORDER = "Order the laptop and the building access badge";
const NAME_THE_BUDDY = "Name the onboarding buddy for the first two weeks";
const THIRTY_DAY_PLAN = "Write the first thirty day plan";
const JOINING_INSTRUCTIONS = "Confirm the start date and the joining instructions with the new hire";
const ACCESS_READY = "Confirm every system access request is ready before day one";
const WELCOME_NOTE = "Send the welcome note and the first day agenda";
const EQUIPMENT_HANDOVER = "Hand over the laptop and the access badge";
const BUDDY_WALKTHROUGH = "Walk through the first week schedule with the buddy";
const SHARED_DRIVE_PROVISIONING = "Work the access provisioning request for the shared team drive";
const POLICY_TRAINING = "Sit the workplace policy and records training";
const METRIC_WALKTHROUGH = "Walk through the product metric definitions and the reporting calendar";
const COMPLIANCE_MODULES = "Finish the mandatory compliance training modules";
const BUDDY_CLOSE = "Confirm the buddy pairing is working and close the buddy period";
const SOURCE_CONTROL_REQUEST = "Raise the source control and continuous integration access request";

/** The standard onboarding task catalog, in template order. task_code runs ONB-01 upward over it. */
export const ONBOARDING_TASK_TEMPLATE = [
  T(OFFER_PACK, "pre_start", "all", "People Operations", -10, { evidence: "yes" }),
  T(PAYROLL_RECORD, "pre_start", "all", "People Operations", -8, {
    grants: "SYS-0031", approver: "IT & Security", evidence: "yes",
  }),
  T(DIRECTORY_REQUEST, "pre_start", "all", "IT & Security", -7, {
    grants: "SYS-0001", approver: "Hiring Manager", evidence: "yes",
  }),
  T(MAILBOX_REQUEST, "pre_start", "all", "IT & Security", -6, {
    grants: "SYS-0004", approver: "Hiring Manager", evidence: "yes",
  }),
  T(EQUIPMENT_ORDER, "pre_start", "all", "IT & Security", -5, { evidence: "yes" }),
  T(NAME_THE_BUDDY, "pre_start", "all", "Hiring Manager", -5),
  T(THIRTY_DAY_PLAN, "pre_start", "all", "Hiring Manager", -4),
  T(SOURCE_CONTROL_REQUEST, "pre_start", "Engineering", "IT & Security", -4, {
    grants: "SYS-0011", approver: "Hiring Manager", evidence: "yes",
  }),
  T("Raise the finance ledger role request", "pre_start", "Finance", "IT & Security", -4, {
    grants: "SYS-0035", approver: "Hiring Manager", evidence: "yes",
  }),
  T("Raise the customer relationship system seat request", "pre_start", "Sales", "IT & Security", -4, {
    grants: "SYS-0034", approver: "Hiring Manager", evidence: "yes",
  }),
  T(ANALYTICS_REQUEST, "pre_start", "Product", "IT & Security", -4, {
    grants: "SYS-0029", approver: "Hiring Manager", evidence: "yes",
  }),
  T(JOINING_INSTRUCTIONS, "pre_start", "all", "Recruiter", -3),
  T(ACCESS_READY, "pre_start", "all", "People Operations", -2, {
    blocked_by: SHARED_DRIVE_PROVISIONING, evidence: "yes",
  }),
  T(WELCOME_NOTE, "pre_start", "all", "People Operations", -1),
  T("Run the first day welcome and the workplace tour", "day_one", "all", "People Operations", 0),
  T(EQUIPMENT_HANDOVER, "day_one", "all", "IT & Security", 0, { evidence: "yes" }),
  T("Sign the security and acceptable use acknowledgement", "day_one", "all", "New Hire", 0, { evidence: "yes" }),
  T("Introduce the new hire to the immediate team", "day_one", "all", "Hiring Manager", 0),
  T(BUDDY_WALKTHROUGH, "day_one", "all", "Onboarding Buddy", 0),
  T("Check the payroll details and the benefits elections", "day_one", "all", "New Hire", 0, { evidence: "yes" }),
  T(SHARED_DRIVE_PROVISIONING, "week_one", "all", "IT & Security", 1, {
    grants: "SYS-0005", approver: "Hiring Manager", evidence: "yes",
  }),
  T(POLICY_TRAINING, "week_one", "all", "New Hire", 2, {
    blocked_by: EQUIPMENT_HANDOVER, evidence: "yes",
  }),
  T("Book the recurring one to one session", "week_one", "all", "Hiring Manager", 2),
  T("Review the first thirty day plan with the manager", "week_one", "all", "New Hire", 3, {
    blocked_by: THIRTY_DAY_PLAN,
  }),
  T(METRIC_WALKTHROUGH, "week_one", "Product", "Hiring Manager", 3, { blocked_by: ANALYTICS_REQUEST }),
  T("Meet the wider department at the weekly team meeting", "week_one", "all", "Onboarding Buddy", 4),
  T("Run the production access and on call induction", "week_one", "Engineering", "Hiring Manager", 4, {
    blocked_by: SOURCE_CONTROL_REQUEST, evidence: "yes",
  }),
  T("Shadow three customer sessions before taking an account", "week_one", "Customer Success", "Onboarding Buddy", 4),
  T("Check in on the first week and record anything outstanding", "week_one", "all", "People Operations", 5),
  T(COMPLIANCE_MODULES, "first_month", "all", "New Hire", 10, {
    blocked_by: POLICY_TRAINING, evidence: "yes",
  }),
  T(BUDDY_CLOSE, "first_month", "all", "Hiring Manager", 10, { blocked_by: BUDDY_WALKTHROUGH }),
  T("Confirm the probation review date is in the calendar", "first_month", "all", "People Operations", 15),
  T("Present the first piece of analysis to the product team", "first_month", "Product", "New Hire", 20),
  T("Run the thirty day check in with the new hire", "first_month", "all", "Hiring Manager", 20),
];

/** Design targets (U-C4-9), enforced rather than predicted. */
export const ONBOARDING_TEMPLATE_ROWS = 34;
export const ONBOARDING_INSTANCE_ROWS = 29;
export const ONBOARDING_PHASE_COUNTS = { pre_start: 11, day_one: 6, week_one: 7, first_month: 5 };
export const ONBOARDING_BLOCKED_ONLY_CENSUS = 4;
export const ONBOARDING_COMPLETED_LATE_CENSUS = 3;

/**
 * The three instance rows finished after their own due date. Stated as task
 * names rather than as codes, and none of the three is the finding: the plant
 * is an incomplete row, so a rule reading "finished late" reaches a different
 * set entirely.
 */
const COMPLETED_LATE_TASKS = [OFFER_PACK, PAYROLL_RECORD, DIRECTORY_REQUEST];

/** The one instance row left in progress beside the blocking access request. */
const IN_PROGRESS_TASKS = [WELCOME_NOTE, SHARED_DRIVE_PROVISIONING];

// ------------------------------------------------------- HR-07: the exit shape

/** The exit dates. Both postdate the CORE-04 snapshot and the last day postdates the as-of. */
export const NOTICE_DATE = "2026-03-27";
export const LAST_WORKING_DAY = "2026-04-10";
export const EXIT_TYPE = "voluntary_resignation";

/** The eight clauses the departing employee is drawn against (2.3.1). */
export const DEPARTING_DEPARTMENT = "Engineering";
export const DEPARTING_LEVEL = "IC";
export const DEPARTING_ROLE_TITLE = "Site Reliability Engineer";
export const DEPARTING_MINIMUM_TENURE_MONTHS = 24;

/** Design targets (U-C4-9), enforced rather than predicted. */
export const GRANT_ROWS = 34;
export const GRANT_SYSTEMS = 31;
export const GRANTS_REVOKED_BEFORE_AS_OF = 6;
export const GRANTS_REGRANTED = 3;
export const OPEN_GRANTS = 28;
export const COVERED_SYSTEMS = 27;
export const NON_IDENTITY_PROVIDER_OPEN_GRANTS = 8;
export const SHARED_OPEN_GRANTS = 3;
export const DAY_ZERO_OPEN_GRANTS = 9;
export const OFFBOARDING_CHECKLIST_ROWS = 35;
export const OFFBOARDING_SYSTEM_ROWS = 27;

/** The systems the departing role holds. Five catalog rows sit outside this footprint. */
const EXIT_SYSTEMS = [
  "SYS-0001", "SYS-0002", "SYS-0003",
  "SYS-0004", "SYS-0005", "SYS-0006", "SYS-0007", "SYS-0008", "SYS-0009", "SYS-0010",
  "SYS-0011", "SYS-0012", "SYS-0013", "SYS-0014", "SYS-0015", "SYS-0016", "SYS-0017",
  "SYS-0018", "SYS-0019", "SYS-0020",
  "SYS-0021", "SYS-0022", "SYS-0023", "SYS-0024", "SYS-0025", "SYS-0026",
  "SYS-0027", "SYS-0030",
  "SYS-0031", "SYS-0033", "SYS-0036",
];

/** Open on the first business day after the start date: the onboarding baseline. */
const BASELINE_SYSTEMS = [
  "SYS-0001", "SYS-0004", "SYS-0005", "SYS-0008", "SYS-0009",
  "SYS-0010", "SYS-0011", "SYS-0031", "SYS-0033",
];

/** Removed during the tenure and never granted again. One row each, all revoked. */
const RETIRED_SYSTEMS = ["SYS-0009", "SYS-0013", "SYS-0030"];

/** Removed and later granted again. Two rows each, the earlier revoked and the later open. */
const REGRANTED_SYSTEMS = ["SYS-0018", "SYS-0020", "SYS-0022"];

/** The open grants a single sign on sweep does not see, by source. */
const VENDOR_CONSOLE_SYSTEMS = ["SYS-0024", "SYS-0025", "SYS-0036"];
const SHARED_DRIVE_SYSTEMS = ["SYS-0005", "SYS-0006", "SYS-0007"];
const LOCAL_ACCOUNT_SYSTEMS = ["SYS-0003", "SYS-0019"];

/**
 * The uncovered grant. It was issued directly in the vendor's own admin console
 * with no access change request behind it, and the checklist is assembled from
 * the request ticket history, so a grant with no ticket gets no checklist row
 * and a system with no checklist row gets no removal. That is the mechanism,
 * arrived at from the company's own side.
 */
const UNCOVERED_SYSTEM = "SYS-0025";

/** Checklist actions keyed to a system, by system. Everything else is revoke_access. */
const REVIEW_SHARED_SYSTEMS = SHARED_DRIVE_SYSTEMS;
const TRANSFER_OWNERSHIP_SYSTEMS = ["SYS-0010", "SYS-0027"];

/** Access levels by system category, so the level says something about the seat. */
const LEVEL_BY_CATEGORY = {
  identity: "admin",
  engineering: "write",
  productivity: "write",
  monitoring: "admin",
  data: "read",
  vendor_service: "read",
};

/** The eight checklist rows that name no system, in checklist order. */
const OFFBOARDING_ADMIN_TASKS = [
  { task_name: "Notify payroll of the last working day", phase: "notice", action: "administrative", owner_role: "People Operations", due_offset: -8, evidence_required: "yes" },
  { task_name: "Notify benefits of the coverage end date", phase: "notice", action: "administrative", owner_role: "People Operations", due_offset: -7, evidence_required: "yes" },
  { task_name: "Agree the handover plan for the open work", phase: "notice", action: "administrative", owner_role: "Manager", due_offset: -5, evidence_required: "no" },
  { task_name: "Run the exit interview", phase: "final_week", action: "administrative", owner_role: "HR Business Partner", due_offset: -1, evidence_required: "yes" },
  { task_name: "Close the outstanding claims and reimbursements", phase: "final_week", action: "administrative", owner_role: "Manager", due_offset: -1, evidence_required: "no" },
  { task_name: "Collect the signed return of materials confirmation", phase: "last_day", action: "collect_asset", owner_role: "HR Business Partner", due_offset: 0, evidence_required: "yes" },
  { task_name: "Collect the laptop and the peripherals", phase: "last_day", action: "collect_asset", owner_role: "IT & Security", due_offset: 0, evidence_required: "yes" },
  { task_name: "Collect the building access badge", phase: "last_day", action: "collect_asset", owner_role: "IT & Security", due_offset: 0, evidence_required: "yes" },
];

// -------------------------------------------------------- HR-08: the cycle shape

export const REVIEW_SCOPE = ["People", "IT & Security"];
export const CYCLE_OPEN_DATE = "2026-03-23";
export const CYCLE_CLOSE_DATE = "2026-04-24";
export const FEEDBACK_WINDOW_START = "2026-03-27";
export const FEEDBACK_WINDOW_END = "2026-04-17";
export const ESCALATION_GRACE_BUSINESS_DAYS = 3;

/** Design targets (U-C4-9), enforced rather than predicted. */
export const REVIEW_DUE_BEFORE_AS_OF = 34;
export const REVIEW_SUBMITTED = 41;
export const REVIEW_UNSUBMITTED_REVIEWER_CENSUS = 6;
export const REVIEW_DUE_BEFORE_REVIEWER_CENSUS = 9;

/**
 * The staging composition, the HR-18 CASE_COMPOSITION precedent. Reviewers are
 * ranked by assignment count descending and then by employee id, and the row at
 * each rank states how that reviewer's assignments are staged: how many are due
 * before the as-of, how many of the rest were submitted ahead of the due date,
 * and how many are still outstanding and not yet due.
 *
 * The table says nothing about the plant. Every row due before the as-of is
 * submitted except the single one the drawn carrier holds, so a reader holding
 * this table still cannot say which reviewer is late.
 */
export const REVIEW_STAGING = [
  { early: 0, late_submitted: 2, late_unsubmitted: 6 },
  { early: 3, late_submitted: 1, late_unsubmitted: 3 },
  { early: 5, late_submitted: 0, late_unsubmitted: 1 },
  { early: 6, late_submitted: 0, late_unsubmitted: 0 },
  { early: 6, late_submitted: 0, late_unsubmitted: 0 },
  { early: 5, late_submitted: 0, late_unsubmitted: 0 },
  { early: 3, late_submitted: 1, late_unsubmitted: 0 },
  { early: 0, late_submitted: 1, late_unsubmitted: 2 },
  { early: 0, late_submitted: 1, late_unsubmitted: 1 },
  { early: 2, late_submitted: 0, late_unsubmitted: 0 },
  { early: 2, late_submitted: 0, late_unsubmitted: 0 },
  { early: 0, late_submitted: 2, late_unsubmitted: 0 },
  { early: 2, late_submitted: 0, late_unsubmitted: 0 },
];

// ============================================================ the builder

/**
 * One pure build behind all three artifacts. Called once per generate(); each
 * thin module ignores its own rng and takes the slice it emits.
 */
export function buildLifecycleCoordination() {
  // ---- frozen reads, before any seeded draw
  const roster = lifecycleRoster();
  assertEmailFormatUnchanged(roster);
  const byId = new Map(roster.map((row) => [row.employee_id, row]));
  const active = roster.filter((row) => row.employment_status === "active");
  const requisition = readStartingRequisition();
  const hr09 = readHr09Pair(roster);
  const caseParticipants = readCaseQueueParticipants(roster);

  const activeRow = (employeeId, what) => {
    const row = byId.get(employeeId);
    if (!row) throw new Error(`${E}: ${what} names ${employeeId}, which is not a roster row`);
    if (row.employment_status !== "active") {
      throw new Error(`${E}: ${what} names ${employeeId}, who is not active`);
    }
    return row;
  };
  const fullName = (row) => `${row.first_name} ${row.last_name}`;

  // ---- people before content
  const people = resolvePeople({ roster, active, byId, activeRow, requisition, caseParticipants, hr09 });

  // ---- content
  const onboarding = buildOnboarding({ people, activeRow, fullName });
  const offboarding = buildOffboarding({ people, active, fullName });
  const review = buildReview({ byId, people, hr09, fullName });

  assertCrossArtifactRules({ onboarding, offboarding, review, people });

  return { roster, requisition, hr09, people, onboarding, offboarding, review };
}

// -------------------------------------------------------------- the people

function resolvePeople({ roster, active, byId, activeRow, requisition, caseParticipants, hr09 }) {
  // The new hire: everything except the person is read off the frozen row.
  const hiringManager = activeRow(requisition.hiring_manager_employee_id, "the requisition's hiring manager");
  const recruiter = activeRow(requisition.recruiter_employee_id, "the requisition's recruiter");
  const startDate = requisition.target_start_date;
  if (isWeekend(startDate)) {
    throw new Error(`${E}: the frozen target start date ${startDate} falls on a weekend`);
  }
  const minted = mintNewHireName(roster);
  const newHireId = nextEmployeeId(roster);
  const newHire = {
    employee_id: newHireId,
    first_name: minted.firstName,
    last_name: minted.lastName,
    full_name: `${minted.firstName} ${minted.lastName}`,
    department: requisition.department,
    role_title: requisition.requisition_title,
    level: requisition.level,
    start_date: startDate,
    requisition_id: requisition.requisition_id,
    manager_employee_id: hiringManager.employee_id,
    work_email: emailFor(minted.firstName, minted.lastName, newHireId),
  };

  // The buddy: one of the hiring manager's own active direct reports holding the
  // new hire's role title, falling back to all of that manager's active reports.
  // The frozen one-to-one log settles who makes the pairing, so the buddy task
  // is owned by the hiring manager and the buddy owns the buddy-side tasks.
  const arc = new Set(C2_RECRUITING_ARC);
  const reports = active.filter(
    (row) => row.manager_employee_id === hiringManager.employee_id && !arc.has(row.employee_id)
  );
  const sameTitle = reports.filter((row) => row.role_title === newHire.role_title);
  const buddyPool = (sameTitle.length > 0 ? sameTitle : reports)
    .slice()
    .sort((a, b) => a.employee_id.localeCompare(b.employee_id));
  if (buddyPool.length === 0) {
    throw new Error(`${E}: the hiring manager has no active direct report to pair the new hire with`);
  }
  const buddy = createRng(STREAM, "onboarding-buddy").pick(buddyPool);

  const drawByTitle = (department, roleTitle, stream) => {
    const pool = active
      .filter(
        (row) => row.department === department && row.role_title === roleTitle && !arc.has(row.employee_id)
      )
      .sort((a, b) => a.employee_id.localeCompare(b.employee_id));
    if (pool.length === 0) {
      throw new Error(`${E}: no active ${department} row holds "${roleTitle}"`);
    }
    return createRng(STREAM, stream).pick(pool);
  };

  const peopleOperations = drawByTitle("People", "People Operations Specialist", "onboarding-people-ops");
  const itSecurity = drawByTitle("IT & Security", "IT Administrator", "onboarding-it-owner");

  // The departing employee: drawn against all eight clauses, none of them
  // resolved anywhere outside this function.
  const tenureCutoff = monthsBefore(LAST_WORKING_DAY, DEPARTING_MINIMUM_TENURE_MONTHS);
  const departingPool = active
    .filter(
      (row) =>
        row.department === DEPARTING_DEPARTMENT
        && row.level === DEPARTING_LEVEL
        && row.role_title === DEPARTING_ROLE_TITLE
        && byId.get(row.manager_employee_id)?.employment_status === "active"
        && row.start_date <= tenureCutoff
        && !caseParticipants.has(row.employee_id)
        && row.finance_system_role === ""
        && !arc.has(row.employee_id)
    )
    .sort((a, b) => a.employee_id.localeCompare(b.employee_id));
  if (departingPool.length === 0) {
    throw new Error(
      `${E}: no active roster row satisfies all eight departing-employee clauses, so the exit cannot be seated`
    );
  }
  const departing = createRng(STREAM, "departing").pick(departingPool);
  const departingManager = activeRow(departing.manager_employee_id, "the departing employee's manager");
  const exitOwners = {
    manager: departingManager,
    hrbp: drawByTitle("People", "HR Business Partner", "exit-hrbp"),
    itOwner: drawByTitle("IT & Security", "IT Administrator", "exit-it-owner"),
    peopleOperations: drawByTitle("People", "People Operations Specialist", "exit-people-ops"),
  };

  // The review cycle scope, recomputed from the roster rather than typed.
  const assignments = [];
  const inScope = active
    .filter((row) => REVIEW_SCOPE.includes(row.department))
    .sort((a, b) => a.employee_id.localeCompare(b.employee_id));
  for (const reviewee of inScope) {
    if (reviewee.start_date > hr09.period_end) continue;
    if (reviewee.employee_id === departing.employee_id) continue;
    const manager = byId.get(reviewee.manager_employee_id);
    if (!manager) continue;
    if (manager.employment_status === "active" && REVIEW_SCOPE.includes(manager.department)) {
      assignments.push({ reviewee, reviewer: manager, reviewer_relationship: "manager" });
      continue;
    }
    if (manager.employment_status !== "departed") continue;
    const skip = byId.get(manager.manager_employee_id);
    if (skip && skip.employment_status === "active" && REVIEW_SCOPE.includes(skip.department)) {
      assignments.push({ reviewee, reviewer: skip, reviewer_relationship: "skip_level" });
    }
  }
  assignments.sort(
    (a, b) =>
      a.reviewer.employee_id.localeCompare(b.reviewer.employee_id)
      || a.reviewee.employee_id.localeCompare(b.reviewee.employee_id)
  );

  return { newHire, hiringManager, recruiter, buddy, peopleOperations, itSecurity, departing, exitOwners, assignments, inScope };
}

/** Calendar months before an ISO date, used only for the tenure clause. */
function monthsBefore(iso, months) {
  const [year, month, day] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 - months, day));
  return target.toISOString().slice(0, 10);
}

// --------------------------------------------------------------- HR-06 rows

function buildOnboarding({ people, fullName }) {
  const { newHire } = people;

  const ownerById = {
    "People Operations": people.peopleOperations,
    "IT & Security": people.itSecurity,
    "Hiring Manager": people.hiringManager,
    "Onboarding Buddy": people.buddy,
    "Recruiter": people.recruiter,
    "New Hire": null, // the minted row, resolved below
  };
  const resolveOwner = (role) => {
    if (role === "New Hire") {
      return { employee_id: newHire.employee_id, full_name: newHire.full_name };
    }
    const row = ownerById[role];
    if (!row) throw new Error(`${E}: the onboarding owner role "${role}" resolves to nobody`);
    return { employee_id: row.employee_id, full_name: fullName(row) };
  };

  // The template, in catalog order.
  const byName = new Map();
  const template = ONBOARDING_TASK_TEMPLATE.map((row, index) => {
    const task_code = `ONB-${String(index + 1).padStart(2, "0")}`;
    byName.set(row.task_name, task_code);
    return { ...row, task_code };
  });
  const template_rows = template.map((row) => ({
    task_code: row.task_code,
    task_name: row.task_name,
    phase: row.phase,
    applies_to_department: row.applies_to_department,
    owner_role: row.owner_role,
    due_basis: row.due_basis,
    due_offset_business_days: row.due_offset_business_days,
    blocked_by_task_code: row.blocked_by_task_name === "" ? "" : codeFor(byName, row.blocked_by_task_name),
    grants_system_id: row.grants_system_id,
    grants_system_name: row.grants_system_id === "" ? "" : system(row.grants_system_id).system_name,
    approval_owner_role: row.approval_owner_role,
    evidence_required: row.evidence_required,
  }));

  // The instance: the template filtered by the new hire's own department, in
  // template order, with the date arithmetic, the owners and the statuses.
  const selected = template.filter(
    (row) => row.applies_to_department === "all" || row.applies_to_department === newHire.department
  );
  const idByTaskCode = new Map();
  selected.forEach((row, index) => {
    idByTaskCode.set(row.task_code, `ONBT-2026-${String(index + 1).padStart(4, "0")}`);
  });

  const checklist_rows = selected.map((row) => {
    const due_date = addBusinessDays(newHire.start_date, row.due_offset_business_days);
    const owner = resolveOwner(row.owner_role);
    const approver = row.approval_owner_role === "" ? null : resolveOwner(row.approval_owner_role);
    const status = onboardingStatus(row);
    return {
      checklist_id: "ONB-2026-0001",
      checklist_task_id: idByTaskCode.get(row.task_code),
      task_code: row.task_code,
      task_name: row.task_name,
      phase: row.phase,
      new_hire_employee_id: newHire.employee_id,
      new_hire_full_name: newHire.full_name,
      new_hire_department: newHire.department,
      new_hire_role_title: newHire.role_title,
      requisition_id: newHire.requisition_id,
      start_date: newHire.start_date,
      owner_employee_id: owner.employee_id,
      owner_full_name: owner.full_name,
      owner_role: row.owner_role,
      due_date,
      status,
      completed_date: status === "complete" ? completionDate(row, due_date) : "",
      blocked_by_checklist_task_id:
        row.blocked_by_task_name === ""
          ? ""
          : idByTaskCode.get(codeFor(byName, row.blocked_by_task_name)) ?? "",
      grants_system_id: row.grants_system_id,
      grants_system_name: row.grants_system_id === "" ? "" : system(row.grants_system_id).system_name,
      approval_owner_employee_id: approver ? approver.employee_id : "",
      approval_owner_role: row.approval_owner_role,
    };
  });

  assertOnboarding({ template_rows, checklist_rows, newHire });
  return { template_rows, checklist_rows, newHire };
}

function codeFor(byName, taskName) {
  const code = byName.get(taskName);
  if (!code) throw new Error(`${E}: "${taskName}" is named as a blocker but is not in the catalog`);
  return code;
}

/**
 * Statuses by construction rather than by draw, so the plant census cannot move
 * under a reroll. Every pre-start row is finished except the two the plant
 * needs, and nothing scheduled for the start date or later has been finished,
 * because the start date is three business days after the as-of.
 */
function onboardingStatus(row) {
  if (IN_PROGRESS_TASKS.includes(row.task_name)) return "in_progress";
  if (row.task_name === ACCESS_READY) return "not_started";
  if (row.phase === "pre_start") return "complete";
  return "not_started";
}

/** A finished row lands a business day before its own due date, except the three that slipped. */
function completionDate(row, dueDate) {
  return COMPLETED_LATE_TASKS.includes(row.task_name)
    ? addBusinessDays(dueDate, 2)
    : addBusinessDays(dueDate, -1);
}

function assertOnboarding({ template_rows, checklist_rows, newHire }) {
  if (template_rows.length !== ONBOARDING_TEMPLATE_ROWS) {
    throw new Error(`${E}: the onboarding template holds ${template_rows.length} rows, expected ${ONBOARDING_TEMPLATE_ROWS}`);
  }
  const allRows = template_rows.filter((row) => row.applies_to_department === "all").length;
  const departmentRows = template_rows.length - allRows;
  if (allRows !== 26 || departmentRows !== 8) {
    throw new Error(`${E}: the template splits ${allRows} "all" and ${departmentRows} department rows, expected 26 and 8`);
  }
  const productRows = template_rows.filter((row) => row.applies_to_department === newHire.department).length;
  if (productRows !== 3) {
    throw new Error(`${E}: ${productRows} template rows carry ${newHire.department}, expected 3`);
  }
  if (checklist_rows.length !== ONBOARDING_INSTANCE_ROWS) {
    throw new Error(`${E}: the instance holds ${checklist_rows.length} rows, expected ${ONBOARDING_INSTANCE_ROWS}`);
  }
  for (const [phase, expected] of Object.entries(ONBOARDING_PHASE_COUNTS)) {
    const found = checklist_rows.filter((row) => row.phase === phase).length;
    if (found !== expected) {
      throw new Error(`${E}: the instance carries ${found} ${phase} rows, expected ${expected}`);
    }
  }

  // Dates recompute and never land on a weekend.
  for (const row of checklist_rows) {
    if (isWeekend(row.due_date)) throw new Error(`${E}: ${row.checklist_task_id} is due on a weekend`);
    if (row.due_date !== addBusinessDays(row.start_date, Number(templateOffset(row)))) {
      throw new Error(`${E}: ${row.checklist_task_id} due_date does not recompute from the offset`);
    }
    if ((row.status === "complete") !== (row.completed_date !== "")) {
      throw new Error(`${E}: ${row.checklist_task_id} carries a completed_date its status does not allow`);
    }
    if (row.completed_date !== "" && row.completed_date > AS_OF) {
      throw new Error(`${E}: ${row.checklist_task_id} was finished at ${row.completed_date}, after the as-of`);
    }
    if (!TASK_STATUSES.includes(row.status)) {
      throw new Error(`${E}: ${row.checklist_task_id} carries the status "${row.status}"`);
    }
    if (!ONBOARDING_PHASES.includes(row.phase)) {
      throw new Error(`${E}: ${row.checklist_task_id} carries the phase "${row.phase}"`);
    }
    if (!ONBOARDING_OWNER_ROLES.includes(row.owner_role)) {
      throw new Error(`${E}: ${row.checklist_task_id} carries the owner role "${row.owner_role}"`);
    }
  }

  // The access rule: the person who raises a request is never the person who
  // approves it, and a granting row always names its approver.
  for (const row of [...template_rows, ...checklist_rows]) {
    const grants = row.grants_system_id !== "";
    if (grants !== (row.approval_owner_role !== "")) {
      throw new Error(`${E}: ${row.task_code} states an approval owner its grant does not call for, or the reverse`);
    }
    if (!grants) continue;
    if (!ONBOARDING_APPROVAL_ROLES.includes(row.approval_owner_role)) {
      throw new Error(`${E}: ${row.task_code} carries the approval role "${row.approval_owner_role}"`);
    }
    if (row.owner_role === row.approval_owner_role) {
      throw new Error(`${E}: ${row.task_code} lets the role that raises the request approve it`);
    }
    if (row.grants_system_name !== system(row.grants_system_id).system_name) {
      throw new Error(`${E}: ${row.task_code} names a system the catalog does not`);
    }
  }
  for (const row of checklist_rows) {
    if (row.grants_system_id === "") continue;
    if (row.approval_owner_employee_id === "") {
      throw new Error(`${E}: ${row.checklist_task_id} grants a system with no named approver`);
    }
    if (row.approval_owner_employee_id === row.owner_employee_id) {
      throw new Error(`${E}: ${row.checklist_task_id} lets the person who raises the request approve it`);
    }
  }

  // One person per owner role, so a reader counting distinct owners counts six.
  const byRole = new Map();
  for (const row of checklist_rows) {
    const seen = byRole.get(row.owner_role);
    if (seen && seen !== row.owner_employee_id) {
      throw new Error(`${E}: the owner role "${row.owner_role}" resolves to two people`);
    }
    byRole.set(row.owner_role, row.owner_employee_id);
  }
  if (byRole.size !== ONBOARDING_OWNER_ROLES.length) {
    throw new Error(`${E}: the instance uses ${byRole.size} owner roles, expected ${ONBOARDING_OWNER_ROLES.length}`);
  }
  if (new Set(byRole.values()).size !== ONBOARDING_OWNER_ROLES.length) {
    throw new Error(`${E}: two onboarding owner roles resolve to the same person`);
  }

  // The blocking graph resolves on both sides and carries no cycle.
  assertAcyclic(template_rows, "task_code", "blocked_by_task_code", "template");
  assertAcyclic(checklist_rows, "checklist_task_id", "blocked_by_checklist_task_id", "instance");

  // HR-06a and the two counterfactual censuses.
  const incomplete = checklist_rows.filter((row) => row.status !== "complete");
  const byTaskId = new Map(checklist_rows.map((row) => [row.checklist_task_id, row]));
  const blocked = incomplete.filter(
    (row) =>
      row.blocked_by_checklist_task_id !== ""
      && byTaskId.get(row.blocked_by_checklist_task_id)?.status !== "complete"
  );
  const overdueBlocked = blocked.filter((row) => row.due_date < AS_OF);
  if (overdueBlocked.length !== 1) {
    throw new Error(
      `${E}: ${overdueBlocked.length} instance rows are incomplete, overdue and blocked by an incomplete row, expected 1`
    );
  }
  const overdue = incomplete.filter((row) => row.due_date < AS_OF);
  if (overdue.length !== 1) {
    throw new Error(`${E}: ${overdue.length} instance rows are incomplete and overdue, expected 1`);
  }
  if (blocked.length !== ONBOARDING_BLOCKED_ONLY_CENSUS) {
    throw new Error(
      `${E}: ${blocked.length} incomplete rows are blocked by an incomplete row, expected ${ONBOARDING_BLOCKED_ONLY_CENSUS}`
    );
  }
  const completedLate = checklist_rows.filter(
    (row) => row.status === "complete" && row.completed_date > row.due_date
  );
  if (completedLate.length !== ONBOARDING_COMPLETED_LATE_CENSUS) {
    throw new Error(
      `${E}: ${completedLate.length} rows were finished after their own due date, expected ${ONBOARDING_COMPLETED_LATE_CENSUS}`
    );
  }
  if (completedLate.some((row) => row.checklist_task_id === overdueBlocked[0].checklist_task_id)) {
    throw new Error(`${E}: the finding row appears in the finished-late census`);
  }
  const otherIncomplete = incomplete.filter(
    (row) => row.checklist_task_id !== overdueBlocked[0].checklist_task_id
  );
  for (const row of otherIncomplete) {
    if (row.due_date < AS_OF) {
      throw new Error(`${E}: ${row.checklist_task_id} is a second incomplete row due before the as-of`);
    }
  }
}

function templateOffset(row) {
  const entry = ONBOARDING_TASK_TEMPLATE.find((t) => t.task_name === row.task_name);
  if (!entry) throw new Error(`${E}: ${row.task_name} is not in the catalog`);
  return entry.due_offset_business_days;
}

/** Kahn's algorithm over a blocked-by edge set, so a cycle names itself. */
function assertAcyclic(rows, idKey, edgeKey, label) {
  const ids = new Set(rows.map((row) => row[idKey]));
  const indegree = new Map(rows.map((row) => [row[idKey], 0]));
  const dependents = new Map(rows.map((row) => [row[idKey], []]));
  for (const row of rows) {
    const blocker = row[edgeKey];
    if (blocker === "") continue;
    if (!ids.has(blocker)) {
      throw new Error(`${E}: ${label} row ${row[idKey]} is blocked by ${blocker}, which is not in the same file`);
    }
    indegree.set(row[idKey], indegree.get(row[idKey]) + 1);
    dependents.get(blocker).push(row[idKey]);
  }
  const queue = [...indegree.entries()].filter(([, degree]) => degree === 0).map(([id]) => id);
  let sorted = 0;
  while (queue.length > 0) {
    const id = queue.shift();
    sorted += 1;
    for (const next of dependents.get(id)) {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }
  if (sorted !== rows.length) {
    throw new Error(`${E}: the ${label} blocking graph carries a cycle`);
  }
}

// --------------------------------------------------------------- HR-07 rows

function buildOffboarding({ people, active, fullName }) {
  const { departing, exitOwners } = people;
  const dayZero = firstBusinessDayAfter(departing.start_date);

  // The pool every grant and revocation is attributed to: active IT & Security
  // rows holding IT Administrator, the same title exitOwners.itOwner (2026's
  // own checklist owner) holds. A single person administering five years of
  // access is not realistic at a 582 person company (F3), and a fixed grantor
  // makes every grant date before that person's own start_date a byte-level
  // contradiction with the frozen roster and with HR-18 (F1). The pool is
  // drawn against per row rather than once, so each row's own grantor and
  // revoker are eligible on the date the row itself carries.
  const itAdminPool = active
    .filter((row) => row.department === "IT & Security" && row.role_title === "IT Administrator")
    .sort((a, b) => a.employee_id.localeCompare(b.employee_id));
  if (itAdminPool.length === 0) {
    throw new Error(`${E}: no active IT & Security row holds "IT Administrator" to grant or revoke access`);
  }
  const grantedByRng = createRng(STREAM, "granted-by");
  const revokedByRng = createRng(STREAM, "revoked-by");
  const eligibleAt = (eventDate, rowLabel) => {
    const eligible = itAdminPool.filter((row) => row.start_date <= eventDate);
    if (eligible.length === 0) {
      throw new Error(
        `${E}: ${rowLabel} needs an active IT Administrator on or before ${eventDate}, `
        + `and no IT & Security row had started by then`
      );
    }
    return eligible;
  };
  const window = businessDays(addBusinessDays(dayZero, 20), addBusinessDays(AS_OF, -20));
  if (window.length < 90) {
    throw new Error(`${E}: the tenure leaves only ${window.length} business days to grant access across`);
  }
  const third = Math.floor(window.length / 3);
  const early = window.slice(0, third);
  const middle = window.slice(third, third * 2);
  const late = window.slice(third * 2);

  const dateRng = createRng(STREAM, "grant-dates");
  const levelRng = createRng(STREAM, "grant-levels");

  const sourceFor = (systemId) => {
    if (SHARED_DRIVE_SYSTEMS.includes(systemId)) return "shared_drive_acl";
    if (VENDOR_CONSOLE_SYSTEMS.includes(systemId)) return "vendor_admin_console";
    if (LOCAL_ACCOUNT_SYSTEMS.includes(systemId)) return "local_account";
    return IDENTITY_PROVIDER_SOURCE;
  };

  const drafts = [];
  for (const systemId of EXIT_SYSTEMS) {
    const baseline = BASELINE_SYSTEMS.includes(systemId);
    if (RETIRED_SYSTEMS.includes(systemId)) {
      drafts.push({
        system_id: systemId,
        granted_date: baseline ? dayZero : dateRng.pick(early),
        revoked_date: dateRng.pick(middle),
      });
      continue;
    }
    if (REGRANTED_SYSTEMS.includes(systemId)) {
      const firstGrant = baseline ? dayZero : dateRng.pick(early);
      const revoked = dateRng.pick(middle);
      drafts.push({ system_id: systemId, granted_date: firstGrant, revoked_date: revoked });
      drafts.push({ system_id: systemId, granted_date: dateRng.pick(late), revoked_date: "" });
      continue;
    }
    drafts.push({
      system_id: systemId,
      granted_date: baseline ? dayZero : dateRng.pick(window),
      revoked_date: "",
    });
  }

  drafts.sort(
    (a, b) => a.granted_date.localeCompare(b.granted_date) || a.system_id.localeCompare(b.system_id)
  );

  const grants = drafts.map((draft, index) => {
    const catalog = system(draft.system_id);
    const source = sourceFor(draft.system_id);
    const shared = SHARED_DRIVE_SYSTEMS.includes(draft.system_id) && draft.revoked_date === "";
    const level = draft.revoked_date === ""
      ? LEVEL_BY_CATEGORY[catalog.system_category]
      : levelRng.pick(ACCESS_LEVELS);
    return {
      grant_id: `GRT-2026-${String(index + 1).padStart(4, "0")}`,
      employee_id: departing.employee_id,
      system_id: draft.system_id,
      system_name: catalog.system_name,
      system_category: catalog.system_category,
      access_level: level,
      grant_source: source,
      is_shared_grant: shared ? "yes" : "no",
      granted_date: draft.granted_date,
      granted_by_employee_id: grantedByRng.pick(eligibleAt(draft.granted_date, `${draft.system_id}'s grant`)).employee_id,
      request_ticket_id: "",
      revoked_date: draft.revoked_date,
      revoked_by_employee_id:
        draft.revoked_date === ""
          ? ""
          : revokedByRng.pick(eligibleAt(draft.revoked_date, `${draft.system_id}'s revocation`)).employee_id,
      revocation_ticket_id: "",
    };
  });

  // Post-condition: every grantor and every revoker had themselves started on
  // or before the date they act on. A fixed pool cannot silently drift into
  // hiring a grantor before their own start date the way a single pinned
  // person could not be checked at all.
  const itAdminById = new Map(itAdminPool.map((row) => [row.employee_id, row]));
  for (const row of grants) {
    const grantor = itAdminById.get(row.granted_by_employee_id);
    if (!grantor || grantor.start_date > row.granted_date) {
      throw new Error(
        `${E}: ${row.grant_id} is granted at ${row.granted_date} by ${row.granted_by_employee_id}, `
        + `whose own start_date is ${grantor?.start_date ?? "unknown"}, after the grant's own date`
      );
    }
    if (row.revoked_date === "") continue;
    const revoker = itAdminById.get(row.revoked_by_employee_id);
    if (!revoker || revoker.start_date > row.revoked_date) {
      throw new Error(
        `${E}: ${row.grant_id} is revoked at ${row.revoked_date} by ${row.revoked_by_employee_id}, `
        + `whose own start_date is ${revoker?.start_date ?? "unknown"}, after the revocation's own date`
      );
    }
  }

  // The coverage set: the distinct systems open at the as-of, minus the one
  // grant that carries no access change request behind it.
  const openGrants = grants.filter((row) => row.revoked_date === "" || row.revoked_date > AS_OF);
  const openSystems = [...new Set(openGrants.map((row) => row.system_id))].sort();
  const coveredSystems = openSystems.filter((systemId) => systemId !== UNCOVERED_SYSTEM);

  // The checklist, in checklist order: the system rows then the eight that name
  // no system, each inheriting the exit's own dates.
  const dueFromLastDay = (offset) => addBusinessDays(LAST_WORKING_DAY, offset);
  const systemTasks = coveredSystems.map((systemId, index) => {
    const catalog = system(systemId);
    if (REVIEW_SHARED_SYSTEMS.includes(systemId)) {
      return {
        task_name: `Review who else holds access to the ${catalog.system_name}`,
        phase: "final_week",
        action: "review_shared_access",
        owner_role: "Manager",
        system_id: systemId,
        due_date: dueFromLastDay(-2),
        evidence_required: "yes",
      };
    }
    if (TRANSFER_OWNERSHIP_SYSTEMS.includes(systemId)) {
      return {
        task_name: `Transfer ownership of the ${catalog.system_name} records`,
        phase: "final_week",
        action: "transfer_ownership",
        owner_role: "Manager",
        system_id: systemId,
        due_date: dueFromLastDay(-1),
        evidence_required: "yes",
      };
    }
    const postExit = index % 3 === 2;
    return {
      task_name: `Remove the ${catalog.system_name} access`,
      phase: postExit ? "post_exit" : "last_day",
      action: "revoke_access",
      owner_role: "IT & Security",
      system_id: systemId,
      due_date: postExit ? dueFromLastDay(1 + (index % 5)) : LAST_WORKING_DAY,
      evidence_required: "yes",
    };
  });
  const adminTasks = OFFBOARDING_ADMIN_TASKS.map((task) => ({
    task_name: task.task_name,
    phase: task.phase,
    action: task.action,
    owner_role: task.owner_role,
    system_id: "",
    due_date: dueFromLastDay(task.due_offset),
    evidence_required: task.evidence_required,
  }));

  const ordered = [...adminTasks, ...systemTasks].sort(
    (a, b) =>
      OFFBOARDING_PHASES.indexOf(a.phase) - OFFBOARDING_PHASES.indexOf(b.phase)
      || a.due_date.localeCompare(b.due_date)
      || a.system_id.localeCompare(b.system_id)
      || a.task_name.localeCompare(b.task_name)
  );

  const ownerRow = {
    "People Operations": exitOwners.peopleOperations,
    "IT & Security": exitOwners.itOwner,
    "Manager": exitOwners.manager,
    "HR Business Partner": exitOwners.hrbp,
  };

  const checklist = ordered.map((task, index) => {
    const owner = ownerRow[task.owner_role];
    if (!owner) throw new Error(`${E}: the offboarding owner role "${task.owner_role}" resolves to nobody`);
    const status = task.due_date <= AS_OF ? (task.due_date < AS_OF ? "complete" : "in_progress") : "not_started";
    return {
      checklist_id: "OFB-2026-0001",
      checklist_task_id: `OFBT-2026-${String(index + 1).padStart(4, "0")}`,
      task_code: `OFB-${String(index + 1).padStart(2, "0")}`,
      task_name: task.task_name,
      phase: task.phase,
      exit_id: "EXT-2026-0001",
      employee_id: departing.employee_id,
      action: task.action,
      system_id: task.system_id,
      system_name: task.system_id === "" ? "" : system(task.system_id).system_name,
      owner_role: task.owner_role,
      owner_employee_id: owner.employee_id,
      owner_full_name: fullName(owner),
      due_date: task.due_date,
      status,
      completed_date: status === "complete" ? addBusinessDays(task.due_date, -1) : "",
      request_ticket_id: "",
      evidence_required: task.evidence_required,
    };
  });

  assignAccessTickets({ grants, checklist });

  const exit_record = [
    {
      exit_id: "EXT-2026-0001",
      employee_id: departing.employee_id,
      full_name: fullName(departing),
      department: departing.department,
      role_title: departing.role_title,
      level: departing.level,
      worker_type: "employee",
      manager_employee_id: exitOwners.manager.employee_id,
      manager_full_name: fullName(exitOwners.manager),
      hrbp_employee_id: exitOwners.hrbp.employee_id,
      hrbp_full_name: fullName(exitOwners.hrbp),
      it_owner_employee_id: exitOwners.itOwner.employee_id,
      it_owner_full_name: fullName(exitOwners.itOwner),
      start_date: departing.start_date,
      notice_date: NOTICE_DATE,
      last_working_day: LAST_WORKING_DAY,
      exit_type: EXIT_TYPE,
      as_of: AS_OF,
    },
  ];

  assertOffboarding({ exit_record, grants, checklist, dayZero, departing });
  return { exit_record, grants, checklist, dayZero };
}

/**
 * One access change request block behind three kinds of event: the request that
 * granted a seat, the request that removed one, and the request the offboarding
 * raises to remove one. Numbered in date order across all three, so the ticket
 * block reads as one queue rather than three.
 *
 * Exactly one open grant carries no request ticket at all: it was issued
 * directly in the vendor's own admin console, and the checklist is assembled
 * from the ticket history.
 */
function assignAccessTickets({ grants, checklist }) {
  const events = [];
  for (const grant of grants) {
    if (grant.system_id !== UNCOVERED_SYSTEM || grant.revoked_date !== "") {
      events.push({ date: grant.granted_date, kind: 0, key: grant.grant_id, apply: (id) => { grant.request_ticket_id = id; } });
    }
    if (grant.revoked_date !== "") {
      events.push({ date: grant.revoked_date, kind: 1, key: grant.grant_id, apply: (id) => { grant.revocation_ticket_id = id; } });
    }
  }
  for (const row of checklist) {
    if (row.system_id === "") continue;
    events.push({ date: row.due_date, kind: 2, key: row.checklist_task_id, apply: (id) => { row.request_ticket_id = id; } });
  }
  events.sort((a, b) => a.date.localeCompare(b.date) || a.kind - b.kind || a.key.localeCompare(b.key));
  events.forEach((event, index) => event.apply(`ACR-2026-${String(index + 1).padStart(4, "0")}`));
}

function assertOffboarding({ exit_record, grants, checklist, dayZero, departing }) {
  const [exit] = exit_record;
  if (exit.worker_type !== "employee" || WORKER_TYPES.length !== 1) {
    throw new Error(`${E}: the exit record states a worker type outside the published list`);
  }
  if (!(exit.notice_date < AS_OF && exit.notice_date >= exit.start_date)) {
    throw new Error(`${E}: the notice date ${exit.notice_date} does not sit between the start date and the as-of`);
  }
  if (!(exit.last_working_day > AS_OF)) {
    throw new Error(`${E}: the last working day ${exit.last_working_day} does not postdate the as-of`);
  }
  for (const day of [exit.notice_date, exit.last_working_day]) {
    if (isWeekend(day)) throw new Error(`${E}: the exit date ${day} falls on a weekend`);
  }
  if (!EXIT_TYPES.includes(exit.exit_type)) {
    throw new Error(`${E}: the exit type "${exit.exit_type}" is outside the published list`);
  }

  if (grants.length !== GRANT_ROWS) {
    throw new Error(`${E}: the inventory holds ${grants.length} grant rows, expected ${GRANT_ROWS}`);
  }
  const systems = new Set(grants.map((row) => row.system_id));
  if (systems.size !== GRANT_SYSTEMS) {
    throw new Error(`${E}: the inventory spans ${systems.size} systems, expected ${GRANT_SYSTEMS}`);
  }
  const revoked = grants.filter((row) => row.revoked_date !== "" && row.revoked_date < AS_OF);
  if (revoked.length !== GRANTS_REVOKED_BEFORE_AS_OF) {
    throw new Error(`${E}: ${revoked.length} grants were revoked before the as-of, expected ${GRANTS_REVOKED_BEFORE_AS_OF}`);
  }
  const regranted = [...systems].filter(
    (systemId) => grants.filter((row) => row.system_id === systemId).length > 1
  );
  if (regranted.length !== GRANTS_REGRANTED) {
    throw new Error(`${E}: ${regranted.length} systems carry more than one grant row, expected ${GRANTS_REGRANTED}`);
  }
  for (const row of grants) {
    if (row.employee_id !== departing.employee_id) throw new Error(`${E}: ${row.grant_id} names another employee`);
    if (!GRANT_SOURCES.includes(row.grant_source)) throw new Error(`${E}: ${row.grant_id} grant_source "${row.grant_source}"`);
    if (!SYSTEM_CATEGORIES.includes(row.system_category)) throw new Error(`${E}: ${row.grant_id} system_category`);
    if (!ACCESS_LEVELS.includes(row.access_level)) throw new Error(`${E}: ${row.grant_id} access_level`);
    if (!SHARED_GRANT_VALUES.includes(row.is_shared_grant)) throw new Error(`${E}: ${row.grant_id} is_shared_grant`);
    if (row.granted_date < dayZero) throw new Error(`${E}: ${row.grant_id} predates the employee's first business day`);
    if (row.granted_date > AS_OF) throw new Error(`${E}: ${row.grant_id} is granted after the as-of`);
    if (row.revoked_date !== "" && row.revoked_date <= row.granted_date) {
      throw new Error(`${E}: ${row.grant_id} is revoked at ${row.revoked_date}, on or before its own grant date`);
    }
    const revokedRow = row.revoked_date !== "";
    if (revokedRow !== (row.revoked_by_employee_id !== "") || revokedRow !== (row.revocation_ticket_id !== "")) {
      throw new Error(`${E}: ${row.grant_id} carries a revocation field its revoked_date does not call for`);
    }
  }
  for (const systemId of regranted) {
    const rows = grants.filter((row) => row.system_id === systemId).sort((a, b) => a.granted_date.localeCompare(b.granted_date));
    if (rows.length !== 2) throw new Error(`${E}: ${systemId} carries ${rows.length} grant rows, expected 2`);
    if (rows[0].revoked_date === "" || rows[0].revoked_date >= rows[1].granted_date) {
      throw new Error(`${E}: ${systemId}'s two grants do not sit on disjoint open intervals`);
    }
    if (rows[1].revoked_date !== "") throw new Error(`${E}: ${systemId}'s later grant is not open`);
  }

  const openAt = (day) =>
    grants.filter((row) => row.granted_date <= day && (row.revoked_date === "" || row.revoked_date > day));
  const dayZeroOpen = new Set(openAt(dayZero).map((row) => row.system_id));
  if (dayZeroOpen.size !== DAY_ZERO_OPEN_GRANTS) {
    throw new Error(
      `${E}: ${dayZeroOpen.size} systems were open on the first business day after the start date, expected ${DAY_ZERO_OPEN_GRANTS}`
    );
  }
  const openRows = openAt(AS_OF);
  if (openRows.length !== OPEN_GRANTS) {
    throw new Error(`${E}: ${openRows.length} grants are open at the as-of, expected ${OPEN_GRANTS}`);
  }
  const openSystems = new Set(openRows.map((row) => row.system_id));
  if (openSystems.size !== OPEN_GRANTS) {
    throw new Error(`${E}: the ${openRows.length} open grants span ${openSystems.size} systems, expected one each`);
  }
  if (openRows.some((row) => row.revoked_date !== "")) {
    throw new Error(`${E}: a grant is already revoked at the as-of, so the finding would be a diff rather than a coverage gap`);
  }
  const nonIdp = openRows.filter((row) => row.grant_source !== IDENTITY_PROVIDER_SOURCE);
  if (nonIdp.length !== NON_IDENTITY_PROVIDER_OPEN_GRANTS) {
    throw new Error(
      `${E}: ${nonIdp.length} open grants sit outside the identity provider, expected ${NON_IDENTITY_PROVIDER_OPEN_GRANTS}`
    );
  }
  const shared = openRows.filter((row) => row.is_shared_grant === "yes");
  if (shared.length !== SHARED_OPEN_GRANTS) {
    throw new Error(`${E}: ${shared.length} open grants are shared, expected ${SHARED_OPEN_GRANTS}`);
  }

  if (checklist.length !== OFFBOARDING_CHECKLIST_ROWS) {
    throw new Error(`${E}: the checklist holds ${checklist.length} rows, expected ${OFFBOARDING_CHECKLIST_ROWS}`);
  }
  const keyed = checklist.filter((row) => row.system_id !== "");
  if (keyed.length !== OFFBOARDING_SYSTEM_ROWS) {
    throw new Error(`${E}: ${keyed.length} checklist rows name a system, expected ${OFFBOARDING_SYSTEM_ROWS}`);
  }
  const checklistSystems = new Set(keyed.map((row) => row.system_id));
  if (checklistSystems.size !== COVERED_SYSTEMS) {
    throw new Error(`${E}: the checklist covers ${checklistSystems.size} systems, expected ${COVERED_SYSTEMS}`);
  }
  for (const systemId of checklistSystems) {
    if (!openSystems.has(systemId)) {
      throw new Error(`${E}: the checklist names ${systemId}, which is not open at the as-of`);
    }
  }
  const uncovered = [...openSystems].filter((systemId) => !checklistSystems.has(systemId));
  if (uncovered.length !== 1) {
    throw new Error(`${E}: ${uncovered.length} open systems carry no checklist row, expected 1`);
  }
  const uncoveredGrant = openRows.find((row) => row.system_id === uncovered[0]);
  if (uncoveredGrant.grant_source === IDENTITY_PROVIDER_SOURCE) {
    throw new Error(`${E}: the uncovered grant sits on the identity provider, so a single sign on sweep would catch it`);
  }
  if (uncoveredGrant.is_shared_grant !== "no") {
    throw new Error(`${E}: the uncovered grant is shared, so it would collide with the shared-access exercise`);
  }
  if (uncoveredGrant.request_ticket_id !== "") {
    throw new Error(`${E}: the uncovered grant carries a request ticket, so the mechanism stops being checkable`);
  }
  const ticketless = openRows.filter((row) => row.request_ticket_id === "");
  if (ticketless.length !== 1 || ticketless[0].grant_id !== uncoveredGrant.grant_id) {
    throw new Error(`${E}: ${ticketless.length} open grants carry no request ticket, expected exactly the uncovered one`);
  }
  for (const row of shared) {
    const reviews = keyed.filter((task) => task.system_id === row.system_id && task.action === "review_shared_access");
    if (reviews.length !== 1) {
      throw new Error(`${E}: the shared grant on ${row.system_id} carries ${reviews.length} review rows, expected 1`);
    }
  }
  const windowEnd = addBusinessDays(LAST_WORKING_DAY, 5);
  for (const row of checklist) {
    if (!OFFBOARDING_ACTIONS.includes(row.action)) throw new Error(`${E}: ${row.checklist_task_id} action "${row.action}"`);
    if (!OFFBOARDING_PHASES.includes(row.phase)) throw new Error(`${E}: ${row.checklist_task_id} phase "${row.phase}"`);
    if (!OFFBOARDING_OWNER_ROLES.includes(row.owner_role)) throw new Error(`${E}: ${row.checklist_task_id} owner role`);
    if (!TASK_STATUSES.includes(row.status)) throw new Error(`${E}: ${row.checklist_task_id} status "${row.status}"`);
    if (row.due_date < NOTICE_DATE || row.due_date > windowEnd) {
      throw new Error(`${E}: ${row.checklist_task_id} is due at ${row.due_date}, outside the exit window`);
    }
    if ((row.status === "complete") !== (row.completed_date !== "")) {
      throw new Error(`${E}: ${row.checklist_task_id} carries a completed_date its status does not allow`);
    }
    if ((row.system_id !== "") !== (row.request_ticket_id !== "")) {
      throw new Error(`${E}: ${row.checklist_task_id} carries a request ticket its system does not call for, or the reverse`);
    }
    if (["revoke_access", "review_shared_access"].includes(row.action)) {
      if (row.request_ticket_id === "") {
        throw new Error(`${E}: ${row.checklist_task_id} removes access with no access change request behind it`);
      }
      if (row.status === "complete") {
        throw new Error(`${E}: ${row.checklist_task_id} is already finished, so access is revoked before the exit`);
      }
    }
  }
  const tickets = [
    ...grants.map((row) => row.request_ticket_id),
    ...grants.map((row) => row.revocation_ticket_id),
    ...checklist.map((row) => row.request_ticket_id),
  ].filter((id) => id !== "");
  if (new Set(tickets).size !== tickets.length) {
    throw new Error(`${E}: an access change request id appears twice`);
  }
}

// --------------------------------------------------------------- HR-08 rows

function buildReview({ byId, people, hr09, fullName }) {
  const { assignments } = people;

  const byReviewer = new Map();
  for (const row of assignments) {
    if (!byReviewer.has(row.reviewer.employee_id)) byReviewer.set(row.reviewer.employee_id, []);
    byReviewer.get(row.reviewer.employee_id).push(row);
  }
  const ranked = [...byReviewer.entries()]
    .map(([employee_id, rows]) => ({ employee_id, rows }))
    .sort((a, b) => b.rows.length - a.rows.length || a.employee_id.localeCompare(b.employee_id));
  if (ranked.length !== REVIEW_STAGING.length) {
    throw new Error(
      `${E}: the cycle holds ${ranked.length} reviewers, and the staging table states ${REVIEW_STAGING.length}`
    );
  }

  const earlyDays = businessDays(FEEDBACK_WINDOW_START, addDays(AS_OF, -1));
  const lateDays = businessDays(AS_OF, FEEDBACK_WINDOW_END);
  if (earlyDays.length === 0 || lateDays.length === 0) {
    throw new Error(`${E}: the feedback window does not straddle the as-of`);
  }

  // Within a reviewer, rows run in reviewee order and are staged early first,
  // except that the frozen one-to-one pair is always staged last for its own
  // reviewer: HR-09 ships a review draft, so that feedback has to still be
  // outstanding and not yet late.
  const staged = [];
  ranked.forEach((reviewer, rank) => {
    const plan = REVIEW_STAGING[rank];
    const total = plan.early + plan.late_submitted + plan.late_unsubmitted;
    if (total !== reviewer.rows.length) {
      throw new Error(
        `${E}: staging rank ${rank} states ${total} assignments and the reviewer holds ${reviewer.rows.length}`
      );
    }
    const rows = reviewer.rows.slice().sort((a, b) => {
      const aPair = a.reviewee.employee_id === hr09.report.employee_id;
      const bPair = b.reviewee.employee_id === hr09.report.employee_id;
      if (aPair !== bPair) return aPair ? 1 : -1;
      return a.reviewee.employee_id.localeCompare(b.reviewee.employee_id);
    });
    rows.forEach((row, index) => {
      const stage = index < plan.early
        ? "early"
        : index < plan.early + plan.late_submitted
          ? "late_submitted"
          : "late_unsubmitted";
      staged.push({ ...row, rank, stage });
    });
  });

  // The plant carrier: drawn from the reviewers who hold work due before the
  // as-of and hold nothing outstanding beyond it, so the carrier is the sixth
  // reviewer with unsubmitted work rather than one of the five already there.
  const eligible = ranked
    .map((reviewer, rank) => ({ employee_id: reviewer.employee_id, rank }))
    .filter(({ rank }) => REVIEW_STAGING[rank].early > 0 && REVIEW_STAGING[rank].late_unsubmitted === 0)
    .map(({ employee_id }) => employee_id);
  if (eligible.length === 0) {
    throw new Error(`${E}: no reviewer is eligible to carry the overdue assignment`);
  }
  const carrier = createRng(STREAM, "review-plant").pick(eligible);

  let earlyIndex = 0;
  let lateIndex = 0;
  const carrierEarly = staged.filter((row) => row.reviewer.employee_id === carrier && row.stage === "early");
  const plantKey = carrierEarly[carrierEarly.length - 1];
  const submittedRng = createRng(STREAM, "review-submissions");
  const progressRng = createRng(STREAM, "review-progress");

  const rows = staged.map((row) => {
    const due_date = row.stage === "early"
      ? earlyDays[earlyIndex++ % earlyDays.length]
      : lateDays[lateIndex++ % lateDays.length];
    const submitted = row.stage === "early" ? row !== plantKey : row.stage === "late_submitted";
    const ceiling = due_date < AS_OF ? due_date : AS_OF;
    const options = businessDays(CYCLE_OPEN_DATE, ceiling);
    const submitted_date = submitted ? submittedRng.pick(options) : "";
    const status = submitted ? "submitted" : progressRng.pick(["not_started", "in_progress"]);
    const escalation = byId.get(row.reviewer.manager_employee_id);
    if (!escalation || escalation.employment_status !== "active") {
      throw new Error(
        `${E}: the escalation contact for ${row.reviewer.employee_id} does not resolve to an active roster row`
      );
    }
    return {
      cycle_id: "RVC-2026-0001",
      reviewee_employee_id: row.reviewee.employee_id,
      reviewee_full_name: fullName(row.reviewee),
      reviewee_department: row.reviewee.department,
      reviewee_role_title: row.reviewee.role_title,
      reviewer_employee_id: row.reviewer.employee_id,
      reviewer_full_name: fullName(row.reviewer),
      reviewer_department: row.reviewer.department,
      reviewer_role_title: row.reviewer.role_title,
      reviewer_relationship: row.reviewer_relationship,
      escalation_contact_employee_id: escalation.employee_id,
      escalation_contact_full_name: fullName(escalation),
      due_date,
      submitted_date,
      status,
    };
  });

  rows.sort(
    (a, b) =>
      a.reviewer_employee_id.localeCompare(b.reviewer_employee_id)
      || a.reviewee_employee_id.localeCompare(b.reviewee_employee_id)
  );
  const assignmentRows = rows.map((row, index) => ({
    assignment_id: `RVA-2026-${String(index + 1).padStart(4, "0")}`,
    ...row,
  }));

  const cycle = [
    {
      cycle_id: "RVC-2026-0001",
      cycle_name: "half year performance review cycle",
      period_start: hr09.period_start,
      period_end: hr09.period_end,
      cycle_open_date: CYCLE_OPEN_DATE,
      cycle_close_date: CYCLE_CLOSE_DATE,
      feedback_due_window_start: FEEDBACK_WINDOW_START,
      feedback_due_window_end: FEEDBACK_WINDOW_END,
      escalation_grace_business_days: ESCALATION_GRACE_BUSINESS_DAYS,
      departments_in_scope: REVIEW_SCOPE.join("; "),
      assignment_count: assignmentRows.length,
      reviewer_count: new Set(assignmentRows.map((row) => row.reviewer_employee_id)).size,
      as_of: AS_OF,
    },
  ];

  assertReview({ cycle, assignmentRows, byId, hr09, people });
  return { cycle, assignments: assignmentRows, carrier };
}

function assertReview({ cycle, assignmentRows, byId, hr09, people }) {
  const [parameters] = cycle;
  const scopeRows = people.inScope.length;
  if (assignmentRows.length !== parameters.assignment_count) {
    throw new Error(`${E}: the cycle row states ${parameters.assignment_count} assignments against ${assignmentRows.length}`);
  }
  if (scopeRows - assignmentRows.length !== 2) {
    throw new Error(
      `${E}: ${scopeRows} active rows sit in scope and ${assignmentRows.length} carry an assignment; `
      + `only the two whose manager of record is out of scope may drop out`
    );
  }
  const relationships = new Map();
  for (const row of assignmentRows) {
    if (!REVIEWER_RELATIONSHIPS.includes(row.reviewer_relationship)) {
      throw new Error(`${E}: ${row.assignment_id} carries the relationship "${row.reviewer_relationship}"`);
    }
    relationships.set(row.reviewer_relationship, (relationships.get(row.reviewer_relationship) ?? 0) + 1);
    if (row.reviewer_employee_id === row.reviewee_employee_id) {
      throw new Error(`${E}: ${row.assignment_id} pairs an employee with themselves`);
    }
    const reviewee = byId.get(row.reviewee_employee_id);
    if (reviewee.start_date > parameters.period_end) {
      throw new Error(`${E}: ${row.assignment_id} reviews a period the reviewee had not started in`);
    }
    if (!REVIEW_SCOPE.includes(row.reviewee_department) || !REVIEW_SCOPE.includes(row.reviewer_department)) {
      throw new Error(`${E}: ${row.assignment_id} reaches outside the departments in scope`);
    }
    if (row.reviewer_relationship === "manager") {
      if (reviewee.manager_employee_id !== row.reviewer_employee_id) {
        throw new Error(`${E}: ${row.assignment_id} calls itself a manager row without being one`);
      }
    } else {
      const manager = byId.get(reviewee.manager_employee_id);
      if (!manager || manager.employment_status !== "departed") {
        throw new Error(`${E}: ${row.assignment_id} is a skip level row whose manager of record is not departed`);
      }
      if (manager.manager_employee_id !== row.reviewer_employee_id) {
        throw new Error(`${E}: ${row.assignment_id} does not resolve to the departed manager's own manager`);
      }
    }
    if (!REVIEW_STATUSES.includes(row.status)) throw new Error(`${E}: ${row.assignment_id} status "${row.status}"`);
    if ((row.status === "submitted") !== (row.submitted_date !== "")) {
      throw new Error(`${E}: ${row.assignment_id} carries a submitted_date its status does not allow`);
    }
    if (row.submitted_date !== "") {
      if (row.submitted_date < parameters.cycle_open_date) {
        throw new Error(`${E}: ${row.assignment_id} was submitted before the cycle opened`);
      }
      if (row.submitted_date > AS_OF) throw new Error(`${E}: ${row.assignment_id} was submitted after the as-of`);
      if (row.submitted_date > row.due_date) throw new Error(`${E}: ${row.assignment_id} was submitted late`);
    }
    if (row.due_date < parameters.feedback_due_window_start || row.due_date > parameters.feedback_due_window_end) {
      throw new Error(`${E}: ${row.assignment_id} is due outside the published feedback window`);
    }
    if (isWeekend(row.due_date)) throw new Error(`${E}: ${row.assignment_id} is due on a weekend`);
    const escalation = byId.get(row.escalation_contact_employee_id);
    if (!escalation || escalation.employment_status !== "active") {
      throw new Error(`${E}: ${row.assignment_id} escalates to somebody who is not an active roster row`);
    }
    if (byId.get(row.reviewer_employee_id).manager_employee_id !== row.escalation_contact_employee_id) {
      throw new Error(`${E}: ${row.assignment_id} escalates somewhere other than the reviewer's own manager`);
    }
  }

  const reviewers = new Set(assignmentRows.map((row) => row.reviewer_employee_id));
  if (reviewers.size !== parameters.reviewer_count) {
    throw new Error(`${E}: the cycle row states ${parameters.reviewer_count} reviewers against ${reviewers.size}`);
  }

  const dueBefore = assignmentRows.filter((row) => row.due_date < AS_OF);
  if (dueBefore.length !== REVIEW_DUE_BEFORE_AS_OF) {
    throw new Error(`${E}: ${dueBefore.length} assignments are due before the as-of, expected ${REVIEW_DUE_BEFORE_AS_OF}`);
  }
  const submitted = assignmentRows.filter((row) => row.submitted_date !== "");
  if (submitted.length !== REVIEW_SUBMITTED) {
    throw new Error(`${E}: ${submitted.length} assignments are submitted, expected ${REVIEW_SUBMITTED}`);
  }
  const outstanding = assignmentRows.filter((row) => row.submitted_date === "");
  const overdue = outstanding.filter((row) => row.due_date < AS_OF);
  if (overdue.length !== 1) {
    throw new Error(`${E}: ${overdue.length} assignments are outstanding and overdue, expected 1`);
  }
  const carriers = new Set(overdue.map((row) => row.reviewer_employee_id));
  if (carriers.size !== 1) throw new Error(`${E}: the overdue assignments sit on ${carriers.size} reviewers`);
  const outstandingReviewers = new Set(outstanding.map((row) => row.reviewer_employee_id));
  if (outstandingReviewers.size !== REVIEW_UNSUBMITTED_REVIEWER_CENSUS) {
    throw new Error(
      `${E}: ${outstandingReviewers.size} reviewers hold outstanding work, expected ${REVIEW_UNSUBMITTED_REVIEWER_CENSUS}`
    );
  }
  const dueBeforeReviewers = new Set(dueBefore.map((row) => row.reviewer_employee_id));
  if (dueBeforeReviewers.size !== REVIEW_DUE_BEFORE_REVIEWER_CENSUS) {
    throw new Error(
      `${E}: ${dueBeforeReviewers.size} reviewers hold work due before the as-of, expected ${REVIEW_DUE_BEFORE_REVIEWER_CENSUS}`
    );
  }

  const pairRow = assignmentRows.find(
    (row) =>
      row.reviewer_employee_id === hr09.manager.employee_id
      && row.reviewee_employee_id === hr09.report.employee_id
  );
  if (!pairRow) throw new Error(`${E}: the frozen one-to-one pair carries no assignment row`);
  if (pairRow.reviewer_relationship !== "manager") {
    throw new Error(`${E}: the frozen one-to-one pair is not an ordinary manager row`);
  }
  if (pairRow.submitted_date !== "" || pairRow.due_date < AS_OF) {
    throw new Error(`${E}: the frozen one-to-one pair's feedback is submitted or already late`);
  }
  if (pairRow.reviewer_employee_id === [...carriers][0]) {
    throw new Error(`${E}: the frozen one-to-one manager carries the overdue assignment`);
  }

  // No review content column of any kind exists, which is what makes the
  // privacy exercise executable rather than a lesson claim.
  const columns = Object.keys(assignmentRows[0]);
  for (const column of columns) {
    if (/rating|score|comment|feedback_text|strength|development|draft|salary|pay_band|amount/i.test(column)) {
      throw new Error(`${E}: the assignment schema carries "${column}", which review content must never ride in`);
    }
  }
}

// ------------------------------------------------------ cross-artifact rules

function assertCrossArtifactRules({ onboarding, offboarding, review, people }) {
  const newHire = onboarding.newHire;
  const departing = people.departing;
  const carrier = review.carrier;
  const carrierRow = review.assignments.find((row) => row.reviewer_employee_id === carrier);

  // X1: three distinct people in three distinct departments.
  const trio = [newHire.employee_id, departing.employee_id, carrier];
  if (new Set(trio).size !== 3) throw new Error(`${E}: the three lifecycle people are not distinct`);
  const departments = [newHire.department, departing.department, carrierRow.reviewer_department];
  if (new Set(departments).size !== 3) {
    throw new Error(`${E}: the three lifecycle people share a department: ${departments.join(", ")}`);
  }

  // X2 and X4: no person carries two findings or two roles across the set.
  const onboardingPeople = new Set([
    ...onboarding.checklist_rows.map((row) => row.owner_employee_id),
    ...onboarding.checklist_rows.map((row) => row.approval_owner_employee_id),
    people.buddy.employee_id,
  ]);
  const offboardingPeople = new Set([
    ...offboarding.checklist.map((row) => row.owner_employee_id),
    ...offboarding.grants.map((row) => row.granted_by_employee_id),
  ]);
  if (onboardingPeople.has(departing.employee_id)) {
    throw new Error(`${E}: the departing employee owns or approves an onboarding task`);
  }
  if (onboardingPeople.has(carrier) || offboardingPeople.has(carrier)) {
    throw new Error(`${E}: the reviewer carrying the overdue assignment also owns work in another artifact`);
  }

  // X3: the departing employee sits nowhere in the review cycle.
  for (const row of review.assignments) {
    if (row.reviewee_employee_id === departing.employee_id || row.reviewer_employee_id === departing.employee_id) {
      throw new Error(`${E}: the departing employee appears in the review cycle`);
    }
  }

  // X7: no lifecycle artifact assigns a frozen recruiting-arc row a role. The
  // arc may be reviewed inside the cycle, which asserts nothing about it.
  for (const employeeId of C2_RECRUITING_ARC) {
    if (onboardingPeople.has(employeeId) || offboardingPeople.has(employeeId)) {
      throw new Error(`${E}: ${employeeId} holds a frozen recruiting role and is given a second one here`);
    }
    if (review.assignments.some((row) => row.reviewer_employee_id === employeeId)) {
      throw new Error(`${E}: ${employeeId} holds a frozen recruiting role and is seated as a reviewer here`);
    }
    for (const row of offboarding.exit_record) {
      if (Object.values(row).includes(employeeId)) {
        throw new Error(`${E}: the exit record seats ${employeeId}, who already holds a frozen recruiting role`);
      }
    }
  }
}

// ------------------------------------------------------------- the markdown

/**
 * The template document a People Ops person hands a hiring manager. It renders
 * the template and only the template: no date, no employee id, no name and no
 * status, because an instance fact in a template document is a category error
 * as well as a mirror risk. The catalog table below is emitted from the same
 * in-memory table as the CSV, so the two cannot drift.
 */
export function renderOnboardingTemplateMarkdown(templateRows, companyName) {
  const lines = [];
  lines.push("# Onboarding checklist template");
  lines.push("");
  lines.push(
    `The standard onboarding task catalog ${companyName} runs for every new hire, and the rules a `
    + "People Operations coordinator uses to turn it into one person's checklist."
  );
  lines.push("");
  lines.push("## How a due date is derived");
  lines.push("");
  lines.push(
    "Every task is scheduled against the start date. `due_basis` is `start_date` on every row and "
    + "`due_offset_business_days` is a signed whole number of business days: negative is before the start "
    + "date, zero is the start date itself, positive is after it. A due date is the business day reached "
    + "by stepping that many business days from the start date, skipping Saturdays and Sundays. There is "
    + "no holiday calendar."
  );
  lines.push("");
  lines.push(
    "Worked example. A task carrying an offset of minus two is due two business days before the start "
    + "date, so it can already be late while the start date is still ahead. A task carrying an offset of "
    + "plus five is due a full working week after the start date."
  );
  lines.push("");
  lines.push("## The four phases");
  lines.push("");
  lines.push("| Phase | What it covers |");
  lines.push("|---|---|");
  lines.push("| `pre_start` | everything that has to be finished before the first day |");
  lines.push("| `day_one` | the first day itself |");
  lines.push("| `week_one` | the first working week |");
  lines.push("| `first_month` | the rest of the first month |");
  lines.push("");
  lines.push("## Who owns what");
  lines.push("");
  lines.push("A template row names a role rather than a person. Instantiating the checklist resolves each role to one named owner.");
  lines.push("");
  lines.push("| Owner role | What the role owns |");
  lines.push("|---|---|");
  lines.push("| `People Operations` | the paperwork, the joining record and the readiness checks |");
  lines.push("| `IT & Security` | the access requests, the equipment and the handover of both |");
  lines.push("| `Hiring Manager` | the plan, the introductions, the buddy pairing and the check ins |");
  lines.push("| `Onboarding Buddy` | the first two weeks of orientation |");
  lines.push("| `Recruiter` | the joining instructions and the closing feedback |");
  lines.push("| `New Hire` | the acknowledgements, the training and the elections only they can make |");
  lines.push("");
  lines.push("The buddy pairing is made by the hiring manager rather than by People Operations.");
  lines.push("");
  lines.push("## Access requests");
  lines.push("");
  lines.push(
    "A row that grants a system carries `grants_system_id` and `grants_system_name`, and every such row "
    + "also carries an `approval_owner_role`. The approval owner is never the same role as the task owner, "
    + "so the person who raises an access request is never the person who approves it. A request drafted "
    + "from this catalog therefore always names an approver before it can move."
  );
  lines.push("");
  lines.push("## Which rows apply");
  lines.push("");
  lines.push(
    "`applies_to_department` is either `all` or a department name. Instantiating the catalog keeps every "
    + "`all` row plus the rows naming the new hire's own department, in the order below."
  );
  lines.push("");
  lines.push("## The task catalog");
  lines.push("");
  const header = [
    "task_code", "task_name", "phase", "applies_to_department", "owner_role",
    "due_offset_business_days", "blocked_by_task_code", "approval_owner_role",
  ];
  lines.push(`| ${header.join(" | ")} |`);
  lines.push(`|${header.map(() => "---").join("|")}|`);
  for (const row of templateRows) {
    lines.push(`| ${header.map((column) => String(row[column])).join(" | ")} |`);
  }
  lines.push("");
  lines.push("## Review cadence");
  lines.push("");
  lines.push(
    "The catalog is reviewed once a half year by People Operations with IT & Security, and any row whose "
    + "offset no longer matches how long the work actually takes is changed there rather than in a single "
    + "person's checklist."
  );
  lines.push("");
  return lines.join("\n");
}

/** Column lists, exported so the three thin modules and the spec agree. */
export const ONBOARDING_TEMPLATE_COLUMNS = [
  "task_code", "task_name", "phase", "applies_to_department", "owner_role", "due_basis",
  "due_offset_business_days", "blocked_by_task_code", "grants_system_id", "grants_system_name",
  "approval_owner_role", "evidence_required",
];

export const ONBOARDING_CHECKLIST_COLUMNS = [
  "checklist_id", "checklist_task_id", "task_code", "task_name", "phase",
  "new_hire_employee_id", "new_hire_full_name", "new_hire_department", "new_hire_role_title",
  "requisition_id", "start_date", "owner_employee_id", "owner_full_name", "owner_role",
  "due_date", "status", "completed_date", "blocked_by_checklist_task_id",
  "grants_system_id", "grants_system_name", "approval_owner_employee_id", "approval_owner_role",
];

export const EXIT_RECORD_COLUMNS = [
  "exit_id", "employee_id", "full_name", "department", "role_title", "level", "worker_type",
  "manager_employee_id", "manager_full_name", "hrbp_employee_id", "hrbp_full_name",
  "it_owner_employee_id", "it_owner_full_name", "start_date", "notice_date",
  "last_working_day", "exit_type", "as_of",
];

export const GRANT_INVENTORY_COLUMNS = [
  "grant_id", "employee_id", "system_id", "system_name", "system_category", "access_level",
  "grant_source", "is_shared_grant", "granted_date", "granted_by_employee_id",
  "request_ticket_id", "revoked_date", "revoked_by_employee_id", "revocation_ticket_id",
];

export const OFFBOARDING_CHECKLIST_COLUMNS = [
  "checklist_id", "checklist_task_id", "task_code", "task_name", "phase", "exit_id",
  "employee_id", "action", "system_id", "system_name", "owner_role", "owner_employee_id",
  "owner_full_name", "due_date", "status", "completed_date", "request_ticket_id",
  "evidence_required",
];

export const REVIEW_CYCLE_COLUMNS = [
  "cycle_id", "cycle_name", "period_start", "period_end", "cycle_open_date", "cycle_close_date",
  "feedback_due_window_start", "feedback_due_window_end", "escalation_grace_business_days",
  "departments_in_scope", "assignment_count", "reviewer_count", "as_of",
];

export const REVIEW_ASSIGNMENT_COLUMNS = [
  "assignment_id", "cycle_id", "reviewee_employee_id", "reviewee_full_name", "reviewee_department",
  "reviewee_role_title", "reviewer_employee_id", "reviewer_full_name", "reviewer_department",
  "reviewer_role_title", "reviewer_relationship", "escalation_contact_employee_id",
  "escalation_contact_full_name", "due_date", "submitted_date", "status",
];

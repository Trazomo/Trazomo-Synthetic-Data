// HR-18 hris-export: the bundle a people system of record hands over, with its
// own surrogate keys, its own permission model, and a live case queue.
//
// Nothing in the bundle is typed twice. The people come from CORE-04, built in
// process the way FIN-19 builds its roster. The requisitions come from the
// frozen HR-01 register on disk, read at build time the way FIN-20 reads the
// CORE-05 policy library, and the read throws unless the register still holds
// the count and the key set this export was built against. That is deliberate:
// a later amendment to the register breaks generation loudly instead of
// shipping an export that quietly disagrees with the library it claims to
// mirror.
//
// Three shapes are the exercise rather than the decoration:
//
//   1. `hris_person_id` is the system's own key, unrelated to `employee_id`, so
//      joining the export back to the roster is a mapping problem rather than a
//      lookup.
//   2. `employment_status` reads active on every row, because the export
//      carries only live records. The constancy is the point: the export is
//      eighteen people short of the roster and says nothing about it.
//   3. Permissions are a two-table computation. A case type carries a required
//      tier, a role title carries a granted tier, and whether an assignment is
//      inside its tier is the comparison of the two. Exactly one case in the
//      queue fails that comparison, and nothing in the bundle points at it.
//
// No money, no compensation figure, no pay band and no work location appears
// anywhere. A compensation change request is a case type in a queue, not a
// number.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { toCsv } from "../csv.js";
import { addDays, diffDays, isWeekend, rollForwardPastWeekend } from "../dates.js";
import { createRng } from "../seed.js";
import { buildRoster } from "./core-04-people-roster.js";

export const id = "HR-18";

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..");
const HR_01_SOURCE_ARTIFACT = "HR-01";
const HR_01_REGISTER = join(REPO_ROOT, "artifacts", HR_01_SOURCE_ARTIFACT, "role-requisition-register.json");

/** The register this export was built against holds exactly this many requisitions. */
export const EXPECTED_REQUISITION_COUNT = 8;

/** The key set every register requisition carries, in the order the register documents. */
export const REGISTER_REQUISITION_KEYS = [
  "requisition_id", "requisition_title", "department", "level", "status", "openings",
  "opened_date", "target_start_date", "owner_employee_id", "hiring_manager_employee_id",
  "recruiter_employee_id", "employment_type", "competencies", "brief_file",
];

/** The extract stamp the whole bundle is dated at. */
export const AS_OF = "2026-04-03";

export const EXPORT_ID = "HRIS-EXPORT-2026-04-03";
export const SOURCE_SYSTEM = "co-002 HRIS";
export const SCHEMA_VERSION = "1.0";

export const ROSTER_COLUMNS = [
  "hris_person_id", "employee_id", "full_name", "work_email", "department", "role_title",
  "level", "manager_employee_id", "hire_date", "employment_status", "employment_type",
  "fte", "record_status", "last_updated",
];

export const REQUISITION_COLUMNS = [
  "requisition_id", "requisition_title", "department", "level", "status", "openings",
  "opened_date", "target_start_date", "owner_employee_id", "hiring_manager_employee_id",
  "recruiter_employee_id", "employment_type",
];

export const CASE_COLUMNS = [
  "case_id", "opened_date", "case_type", "subject_employee_id", "assignee_employee_id",
  "required_permission_tier", "status", "due_date",
];

export const PERMISSION_TIER_COLUMNS = ["role_title", "granted_permission_tier", "description"];

/**
 * The first published table: what a People role title is allowed to reach.
 * Byte-equal to CORE-04's own `role_title`, comma included.
 *
 * HR-18's test carries its own literal copy of this table and of the case-type
 * table below, and asserts both still equal these, so a silent tier edit is a
 * red test rather than a quietly different export.
 */
export const GRANTED_TIER_BY_ROLE = {
  "People Operations Specialist": 1,
  "Recruiter": 1,
  "HR Business Partner": 2,
  "People Manager": 3,
  "Director, People": 4,
  "VP, People": 4,
};

/** The second published table: what a case type requires before it can be worked. */
export const REQUIRED_TIER_BY_CASE_TYPE = {
  address_change: 1,
  benefits_enrollment_question: 1,
  payslip_reissue: 1,
  onboarding_task_chase: 1,
  leave_request_logging: 2,
  performance_documentation: 2,
  manager_coaching_request: 2,
  grievance_intake: 3,
  investigation_note: 3,
  compensation_change_request: 4,
  termination_processing: 4,
};

/** What each tier means, printed on the permission table and in the bundle. */
export const TIER_DESCRIPTIONS = {
  1: "Read and update ordinary employee records and routine service requests.",
  2: "Tier 1, plus leave records, performance documentation and manager support cases.",
  3: "Tier 2, plus employee relations cases and the notes attached to them.",
  4: "Tier 3, plus lifecycle changes that alter the employment record itself.",
};

/** The case queue composition, in the order the queue was built. Sums to CASE_COUNT. */
export const CASE_COMPOSITION = [
  ["address_change", 3],
  ["benefits_enrollment_question", 3],
  ["payslip_reissue", 2],
  ["onboarding_task_chase", 3],
  ["leave_request_logging", 3],
  ["performance_documentation", 2],
  ["manager_coaching_request", 2],
  ["grievance_intake", 2],
  ["investigation_note", 2],
  ["compensation_change_request", 1],
  ["termination_processing", 1],
];

export const CASE_COUNT = 24;

/** Design count: cases sitting at tier 3 or 4, the population an over-tier assignment lives in. */
export const SENIOR_TIER_CASES = 6;

/** The window a live case queue was opened across. */
export const CASE_WINDOW_START = "2026-03-02";
export const CASE_WINDOW_END = AS_OF;

/** The window a record could last have been touched in. */
export const UPDATE_WINDOW_START = "2025-10-01";

const CASE_STATUSES = ["open", "in_progress"];
const PART_TIME_FTE = ["0.8", "0.6"];

/** The CORE-04 roster, built from its own seeded stream (the FIN-04 convention). */
export function coreRoster() {
  return buildRoster(createRng("CORE-04", "roster"));
}

// ------------------------------------------------------- the frozen register

/**
 * The HR-01 requisitions, read out of the frozen register on disk rather than
 * retyped, and refused unless the register still has the shape this export was
 * built against. A count or key mismatch names itself in the error, because the
 * next person to see it will be amending HR-01 and needs to know what moved.
 * @returns {object[]}
 */
export function readRegisterRequisitions() {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(HR_01_REGISTER, "utf8"));
  } catch (cause) {
    throw new Error(
      `${id}: could not read the frozen register at artifacts/${HR_01_SOURCE_ARTIFACT}/role-requisition-register.json: `
      + `${cause.message}`
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${id}: the ${HR_01_SOURCE_ARTIFACT} register is not a JSON object`);
  }
  const requisitions = parsed.requisitions;
  if (!Array.isArray(requisitions)) {
    throw new Error(
      `${id}: the ${HR_01_SOURCE_ARTIFACT} register carries no "requisitions" list `
      + `(top-level keys: ${Object.keys(parsed).join(", ") || "none"})`
    );
  }
  if (requisitions.length !== EXPECTED_REQUISITION_COUNT) {
    throw new Error(
      `${id}: expected ${EXPECTED_REQUISITION_COUNT} requisitions in the ${HR_01_SOURCE_ARTIFACT} register, `
      + `found ${requisitions.length}. A requisition was added or removed, so the export and its consumers need a look.`
    );
  }
  const expected = new Set(REGISTER_REQUISITION_KEYS);
  requisitions.forEach((requisition, index) => {
    if (!requisition || typeof requisition !== "object" || Array.isArray(requisition)) {
      throw new Error(`${id}: ${HR_01_SOURCE_ARTIFACT} requisition #${index + 1} is not an object`);
    }
    const keys = Object.keys(requisition);
    const missing = REGISTER_REQUISITION_KEYS.filter((key) => !keys.includes(key));
    const extra = keys.filter((key) => !expected.has(key));
    if (missing.length > 0 || extra.length > 0) {
      throw new Error(
        `${id}: ${HR_01_SOURCE_ARTIFACT} requisition #${index + 1} `
        + `(${requisition.requisition_id ?? "no requisition_id"}) does not carry the expected key set. `
        + `Missing: ${missing.join(", ") || "none"}. Unexpected: ${extra.join(", ") || "none"}.`
      );
    }
  });
  return requisitions;
}

/** The requisition rows, byte-for-byte on every shared field. */
export function buildRequisitions() {
  return readRegisterRequisitions().map((requisition) =>
    Object.fromEntries(REQUISITION_COLUMNS.map((column) => [column, requisition[column]]))
  );
}

// ------------------------------------------------------------------- the roster

/** Business days inside a window, the days a record or a case can land on. */
function businessDays(startIso, endIso) {
  const days = [];
  for (let day = startIso; day <= endIso; day = addDays(day, 1)) {
    if (!isWeekend(day)) days.push(day);
  }
  return days;
}

/**
 * One row per active CORE-04 row, in employee_id order, carrying the system's
 * own surrogate key.
 * @returns {object[]}
 */
export function buildHrisRoster(roster = coreRoster()) {
  const active = roster
    .filter((r) => r.employment_status === "active")
    .sort((a, b) => a.employee_id.localeCompare(b.employee_id));
  if (active.length === 0) throw new Error(`${id}: the roster carries no active rows`);

  const contractRng = createRng(id, "employment-terms");
  const updateRng = createRng(id, "record-updates");

  return active.map((person, index) => {
    const partTime = contractRng.chance(0.06);
    const fte = partTime ? contractRng.pick(PART_TIME_FTE) : "1.0";
    const from = person.start_date > UPDATE_WINDOW_START ? person.start_date : UPDATE_WINDOW_START;
    const span = diffDays(from, AS_OF);
    const lastUpdated = span <= 0 ? AS_OF : addDays(from, updateRng.int(0, span));
    return {
      hris_person_id: `PER-${100001 + index}`,
      employee_id: person.employee_id,
      full_name: `${person.first_name} ${person.last_name}`,
      work_email: person.email,
      department: person.department,
      role_title: person.role_title,
      level: person.level,
      manager_employee_id: person.manager_employee_id,
      hire_date: person.start_date,
      employment_status: "active",
      employment_type: partTime ? "part_time" : "full_time",
      fte,
      record_status: "active",
      last_updated: lastUpdated,
    };
  });
}

// -------------------------------------------------------------- permission tiers

/**
 * One row per distinct People-department role title, ordered by the tier it is
 * granted and then by the title, so the table reads as a ladder.
 * @returns {object[]}
 */
export function buildPermissionTiers(roster = coreRoster()) {
  const titles = [
    ...new Set(
      roster
        .filter((r) => r.department === "People" && r.employment_status === "active")
        .map((r) => r.role_title)
    ),
  ];
  for (const title of titles) {
    if (!(title in GRANTED_TIER_BY_ROLE)) {
      throw new Error(`${id}: the People department holds "${title}", which the permission table does not cover`);
    }
  }
  for (const title of Object.keys(GRANTED_TIER_BY_ROLE)) {
    if (!titles.includes(title)) {
      throw new Error(`${id}: the permission table names "${title}", which no active People row holds`);
    }
  }
  return titles
    .map((role_title) => ({
      role_title,
      granted_permission_tier: GRANTED_TIER_BY_ROLE[role_title],
      description: TIER_DESCRIPTIONS[GRANTED_TIER_BY_ROLE[role_title]],
    }))
    .sort((a, b) =>
      a.granted_permission_tier - b.granted_permission_tier || a.role_title.localeCompare(b.role_title)
    );
}

// ------------------------------------------------------------------ the case queue

/**
 * Twenty-four live cases, each assigned inside its tier except for the one that
 * is not. Assignees are active People rows; subjects are active roster rows and
 * never the assignee.
 * @returns {object[]}
 */
export function buildCaseQueue(roster = coreRoster()) {
  const active = roster
    .filter((r) => r.employment_status === "active")
    .sort((a, b) => a.employee_id.localeCompare(b.employee_id));
  const people = active.filter((r) => r.department === "People");
  if (people.length === 0) throw new Error(`${id}: the roster carries no active People rows`);

  const total = CASE_COMPOSITION.reduce((sum, [, count]) => sum + count, 0);
  if (total !== CASE_COUNT) {
    throw new Error(`${id}: the case composition sums to ${total}, expected ${CASE_COUNT}`);
  }

  const scheduleRng = createRng(id, "case-schedule");
  const days = businessDays(CASE_WINDOW_START, CASE_WINDOW_END);
  if (days.length < 10) throw new Error(`${id}: the case window holds only ${days.length} business days`);

  const drafts = [];
  for (const [caseType, count] of CASE_COMPOSITION) {
    if (!(caseType in REQUIRED_TIER_BY_CASE_TYPE)) {
      throw new Error(`${id}: the queue composition names case type "${caseType}", which the tier table does not cover`);
    }
    for (let i = 0; i < count; i += 1) {
      const openedDate = scheduleRng.pick(days);
      drafts.push({
        opened_date: openedDate,
        case_type: caseType,
        required_permission_tier: REQUIRED_TIER_BY_CASE_TYPE[caseType],
        status: scheduleRng.pick(CASE_STATUSES),
        due_date: rollForwardPastWeekend(addDays(openedDate, scheduleRng.int(3, 21))),
        sequence: drafts.length,
      });
    }
  }

  drafts.sort((a, b) =>
    a.opened_date.localeCompare(b.opened_date)
    || a.case_type.localeCompare(b.case_type)
    || a.sequence - b.sequence
  );

  // The one case whose required tier sits above what its assignee is granted.
  // It is drawn from the senior population, because a tier 1 case can never be
  // over tier: every People role is granted at least tier 1.
  const plantRng = createRng(id, "tier-assignment");
  const seniorIndexes = drafts
    .map((draft, index) => (draft.required_permission_tier >= 3 ? index : -1))
    .filter((index) => index >= 0);
  if (seniorIndexes.length !== SENIOR_TIER_CASES) {
    throw new Error(
      `${id}: ${seniorIndexes.length} cases sit at tier 3 or 4, expected ${SENIOR_TIER_CASES}`
    );
  }
  const overTierIndex = plantRng.pick(seniorIndexes);

  const assigneeRng = createRng(id, "case-assignees");
  const subjectRng = createRng(id, "case-subjects");
  const usedSubjects = new Set();

  return drafts.map((draft, index) => {
    // A queue routes to the tier that owns the work: routine requests sit with
    // the specialists and the recruiters, employee relations cases sit with the
    // managers. Anything looser would put a VP on an address change, and would
    // leave "the tier 1 caseload" too small to be a population at all.
    const granted = (person) => GRANTED_TIER_BY_ROLE[person.role_title];
    const owning = people.filter((p) => granted(p) === draft.required_permission_tier);
    const within = people.filter((p) => granted(p) >= draft.required_permission_tier);
    const pool = index === overTierIndex
      ? people.filter((p) => granted(p) < draft.required_permission_tier)
      : (owning.length > 0 ? owning : within);
    if (pool.length === 0) {
      throw new Error(`${id}: no active People row can take a tier ${draft.required_permission_tier} case`);
    }
    const assignee = assigneeRng.pick(pool);

    let subject = subjectRng.pick(active);
    let guard = 0;
    while (subject.employee_id === assignee.employee_id || usedSubjects.has(subject.employee_id)) {
      guard += 1;
      if (guard > 1000) throw new Error(`${id}: could not find a distinct case subject`);
      subject = subjectRng.pick(active);
    }
    usedSubjects.add(subject.employee_id);

    return {
      case_id: `HRC-2026-${String(index + 1).padStart(4, "0")}`,
      opened_date: draft.opened_date,
      case_type: draft.case_type,
      subject_employee_id: subject.employee_id,
      assignee_employee_id: assignee.employee_id,
      required_permission_tier: draft.required_permission_tier,
      status: draft.status,
      due_date: draft.due_date,
    };
  });
}

// ------------------------------------------------------------------ the bundle

function buildExportBundle({ rosterRows, requisitions, cases, tiers }) {
  return {
    export_id: EXPORT_ID,
    source_system: SOURCE_SYSTEM,
    schema_version: SCHEMA_VERSION,
    as_of: AS_OF,
    source_artifacts: ["CORE-04", HR_01_SOURCE_ARTIFACT],
    files: [
      { file: "hris-roster.csv", contents: "one row per live person record, keyed by hris_person_id" },
      { file: "hris-requisitions.csv", contents: "the open, on hold and filled requisitions the library holds" },
      { file: "hris-case-queue.csv", contents: "employee lifecycle cases in flight inside the system" },
      { file: "hris-permission-tiers.csv", contents: "what each People role title is granted" },
    ],
    counts: {
      roster_rows: rosterRows.length,
      requisitions: requisitions.length,
      cases: cases.length,
      permission_tiers: tiers.length,
    },
    permission_tier_scale: [1, 2, 3, 4].map((tier) => ({ tier, description: TIER_DESCRIPTIONS[tier] })),
  };
}

/**
 * Re-derive every claim the spec makes from the emitted rows, the way the
 * public test does, and throw if one has stopped holding.
 */
function assertPostConditions({ roster, rosterRows, requisitions, cases, tiers, register }) {
  const active = roster.filter((r) => r.employment_status === "active");
  const byId = new Map(roster.map((r) => [r.employee_id, r]));

  if (rosterRows.length !== active.length) {
    throw new Error(`${id}: the export carries ${rosterRows.length} rows, the roster holds ${active.length} active`);
  }
  const exported = new Set(rosterRows.map((r) => r.employee_id));
  if (exported.size !== rosterRows.length) throw new Error(`${id}: an employee_id appears twice in the export`);
  for (const person of active) {
    if (!exported.has(person.employee_id)) throw new Error(`${id}: ${person.employee_id} is active and missing`);
  }
  rosterRows.forEach((row, index) => {
    if (row.hris_person_id !== `PER-${100001 + index}`) {
      throw new Error(`${id}: hris_person_id does not run in file order at ${row.employee_id}`);
    }
    const person = byId.get(row.employee_id);
    if (!person) throw new Error(`${id}: ${row.employee_id} is not on the roster`);
    if (row.employment_status !== "active") throw new Error(`${id}: ${row.employee_id} is not active`);
    if (row.record_status !== "active") throw new Error(`${id}: ${row.employee_id} record_status`);
    if (row.full_name !== `${person.first_name} ${person.last_name}`) {
      throw new Error(`${id}: ${row.employee_id} full_name does not match the roster`);
    }
    if (row.work_email !== person.email) throw new Error(`${id}: ${row.employee_id} work_email`);
    if (row.hire_date !== person.start_date) throw new Error(`${id}: ${row.employee_id} hire_date`);
    if (row.last_updated > AS_OF || row.last_updated < row.hire_date) {
      throw new Error(`${id}: ${row.employee_id} last_updated ${row.last_updated} sits outside its own window`);
    }
    const fullTime = row.employment_type === "full_time";
    if (fullTime !== (row.fte === "1.0")) {
      throw new Error(`${id}: ${row.employee_id} carries employment_type ${row.employment_type} at fte ${row.fte}`);
    }
  });
  const partTime = rosterRows.filter((r) => r.employment_type === "part_time");
  if (partTime.length < 10 || partTime.length > rosterRows.length * 0.15) {
    throw new Error(`${id}: ${partTime.length} part time rows does not read as a minority of a full time roster`);
  }
  for (const fte of PART_TIME_FTE) {
    if (!partTime.some((r) => r.fte === fte)) throw new Error(`${id}: no part time row carries fte ${fte}`);
  }

  if (requisitions.length !== EXPECTED_REQUISITION_COUNT) {
    throw new Error(`${id}: ${requisitions.length} requisition rows, expected ${EXPECTED_REQUISITION_COUNT}`);
  }
  requisitions.forEach((row, index) => {
    for (const column of REQUISITION_COLUMNS) {
      if (row[column] !== register[index][column]) {
        throw new Error(`${id}: ${row.requisition_id} ${column} does not reproduce the frozen register`);
      }
    }
    for (const column of ["owner_employee_id", "hiring_manager_employee_id", "recruiter_employee_id"]) {
      if (!byId.has(row[column])) throw new Error(`${id}: ${row.requisition_id} ${column} is not on the roster`);
    }
  });

  const tierByRole = new Map(tiers.map((t) => [t.role_title, t.granted_permission_tier]));
  if (tiers.length !== Object.keys(GRANTED_TIER_BY_ROLE).length) {
    throw new Error(`${id}: the permission table holds ${tiers.length} rows`);
  }

  if (cases.length !== CASE_COUNT) throw new Error(`${id}: ${cases.length} cases, expected ${CASE_COUNT}`);
  const senior = cases.filter((c) => c.required_permission_tier >= 3);
  if (senior.length !== SENIOR_TIER_CASES) {
    throw new Error(`${id}: ${senior.length} cases sit at tier 3 or 4, expected ${SENIOR_TIER_CASES}`);
  }
  const overTier = [];
  cases.forEach((row, index) => {
    if (row.case_id !== `HRC-2026-${String(index + 1).padStart(4, "0")}`) {
      throw new Error(`${id}: case ids do not run in file order at ${row.case_id}`);
    }
    if (REQUIRED_TIER_BY_CASE_TYPE[row.case_type] !== row.required_permission_tier) {
      throw new Error(`${id}: ${row.case_id} states a tier its case type does not carry`);
    }
    const assignee = byId.get(row.assignee_employee_id);
    const subject = byId.get(row.subject_employee_id);
    if (!assignee || assignee.employment_status !== "active" || assignee.department !== "People") {
      throw new Error(`${id}: ${row.case_id} is assigned outside the active People department`);
    }
    if (!subject || subject.employment_status !== "active") {
      throw new Error(`${id}: ${row.case_id} names a subject who is not an active roster row`);
    }
    if (row.subject_employee_id === row.assignee_employee_id) {
      throw new Error(`${id}: ${row.case_id} is assigned to its own subject`);
    }
    if (row.opened_date < CASE_WINDOW_START || row.opened_date > CASE_WINDOW_END) {
      throw new Error(`${id}: ${row.case_id} opened outside the queue window`);
    }
    if (row.due_date <= row.opened_date) throw new Error(`${id}: ${row.case_id} is due before it opened`);
    if (!CASE_STATUSES.includes(row.status)) throw new Error(`${id}: ${row.case_id} status "${row.status}"`);
    if (row.required_permission_tier > tierByRole.get(assignee.role_title)) overTier.push(row.case_id);
  });
  if (overTier.length !== 1) {
    throw new Error(`${id}: ${overTier.length} cases sit above their assignee's granted tier, expected 1`);
  }
  if (new Set(cases.map((c) => c.subject_employee_id)).size !== cases.length) {
    throw new Error(`${id}: a case subject appears twice in the queue`);
  }
}

export function generate() {
  const roster = coreRoster();
  const register = readRegisterRequisitions();
  const rosterRows = buildHrisRoster(roster);
  const requisitions = buildRequisitions();
  const cases = buildCaseQueue(roster);
  const tiers = buildPermissionTiers(roster);

  assertPostConditions({ roster, rosterRows, requisitions, cases, tiers, register });

  const bundle = buildExportBundle({ rosterRows, requisitions, cases, tiers });
  return [
    { path: "hris-roster.csv", content: toCsv(ROSTER_COLUMNS, rosterRows) },
    { path: "hris-requisitions.csv", content: toCsv(REQUISITION_COLUMNS, requisitions) },
    { path: "hris-case-queue.csv", content: toCsv(CASE_COLUMNS, cases) },
    { path: "hris-permission-tiers.csv", content: toCsv(PERMISSION_TIER_COLUMNS, tiers) },
    { path: "hris-export.json", content: JSON.stringify(bundle, null, 2) + "\n" },
  ];
}

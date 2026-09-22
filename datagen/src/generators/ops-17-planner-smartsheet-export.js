// OPS-17 work-management-export-planner-smartsheet: one co-002 delivery
// program, the support tooling consolidation, captured 2026-03-26 from the two
// tools that hold it. The delivery team works the program in Planner; the PMO
// tracks the same fourteen tasks in a Smartsheet sheet.
//
// Every payload file is the body of ONE documented API call, field for field as
// the vendor reference shows it, so a parser a learner writes against the
// published docs runs unchanged against these bytes:
//   planner-tasks.json    GET /planner/plans/{planId}/tasks
//   planner-buckets.json  GET /planner/plans/{planId}/buckets
//   directory-users.json  GET /users
//   smartsheet-sheet.json GET /sheets/{sheetId}
// capture-log.json is the only non-vendor file: the harness record of which
// call produced which file.
//
// No field is added that the API would not return and no field it does return
// on that call is dropped. In particular a plannerTask carries no `details`
// object anywhere in this fixture, because `details` is a relationship rather
// than a property, so a task's description is present only as hasDescription.
//
// Every person is an active CORE-04 row drawn through named rng streams, with
// one exception the rules below name, so a roster reroll moves this fixture
// rather than stranding an assignee.
//
// The rules this fixture pins (each re-derived from the emitted bytes in
// tests/generators/ops-17-planner-smartsheet-export.test.js, and each asserted
// here before the builder returns, the FIN-38 "the builder refuses to emit"
// precedent):
//   T-S1  the head token of every Planner title is one sheet Task ID and back,
//         a bijection over 14; Task Name is the title without its head token.
//   T-S2  percentComplete / 100 is the % Complete cell value, and its
//         displayValue is that number as a whole percent.
//   T-S3  the published priority banding of the integer is the Priority cell.
//   T-S4  the bucket named by bucketId is the Workstream cell.
//   T-S5  owner: resolved assignment, no assignment and no Owner cell, or an
//         assignment that resolves to no directory entry.
//   T-S6  nothing on either side carries a definition of done.
//   T-S7  every cell columnId resolves to a column; no column twice in a row.
//   T-S8  value and displayValue differ on exactly two columns, agree on
//         four more, and the two DATE columns carry no displayValue at all.
//   T-S9  the two sides agree on every date.
//   T-S10 every directory mail is an active CORE-04 row of a staffing team.
//   T-S11 every timestamp is on or before the capture instant.
//   T-P3  the one unresolvable assignment GUID belongs to the departed CORE-04
//         Operations row with the greatest employee id; the directory lists
//         active accounts only, so the sheet is what names that person.
import { addDays } from "../dates.js";
import { createRng, fnv1a } from "../seed.js";
import { buildRoster } from "./core-04-people-roster.js";

export const id = "OPS-17";

// ---------------------------------------------------------------- constants

export const PROGRAM = "support tooling consolidation";
export const COMPANY = "co-002";
export const CAPTURED_AT = "2026-03-26T17:05:00Z";
export const CAPTURE_DATE = "2026-03-26";
export const TASK_PREFIX = "STC";
const TASK_NUMBER_START = 101;
export const TARGET_TASKS = 14;

export const SHEET_NAME = "Support tooling consolidation tracker";
export const BUCKETS = ["Discovery", "Migration", "Enablement", "Close-out"];

/** Which teams staff the program, and how many people each contributes. */
export const OWNER_DEPARTMENTS = ["Operations", "Customer Success", "Engineering"];
const OWNERS_PER_DEPARTMENT = 3;
export const DIRECTORY_SIZE = OWNER_DEPARTMENTS.length * OWNERS_PER_DEPARTMENT;

/** The department the one departed assignment is drawn from (rule T-P3). */
const DEPARTED_DEPARTMENT = "Operations";

/** The percentComplete values the Planner UI itself writes, and their census. */
export const PERCENT_VALUES = [0, 50, 100];
export const PERCENT_CENSUS = { 0: 5, 50: 6, 100: 3 };

/** The priority integers Planner itself writes. Two tasks carry others. */
export const PLANNER_WRITTEN_PRIORITIES = [1, 3, 5, 9];
export const OFF_NOMINAL_PRIORITIES = 2;

/**
 * The published priority banding: 0 and 1 urgent, 2 to 4 important, 5 to 7
 * medium, 8 to 10 low. The sheet's Priority picklist is exactly this band.
 */
export const PRIORITY_BANDS = [
  { name: "Urgent", min: 0, max: 1 },
  { name: "Important", min: 2, max: 4 },
  { name: "Medium", min: 5, max: 7 },
  { name: "Low", min: 8, max: 10 },
];
export const PRIORITY_BAND_CENSUS = { Urgent: 2, Important: 5, Medium: 4, Low: 3 };

/** The assignment census: one each, none, and one that resolves nowhere. */
export const ASSIGNMENT_CENSUS = { resolved: 12, unassigned: 1, unresolvable: 1 };

export const DESCRIBED_TASKS = 9;
export const CHECKLISTED_TASKS = 6;

export const WINDOW = { created_start: "2026-02-16", created_end: "2026-03-24" };
export const DUE_WINDOW = { start: "2026-03-27", end: "2026-05-22" };

/** The sheet's columns, in index order. No column is a definition of done. */
export const COLUMN_TITLES = [
  "Task ID", "Task Name", "Workstream", "Owner",
  "Start Date", "Due Date", "% Complete", "Priority",
];

/** The two columns whose value and displayValue differ on every cell. */
export const SPLIT_COLUMNS = ["Owner", "% Complete"];

/** The full plannerTask property set, in the order the reference lists it. */
export const PLANNER_TASK_KEYS = [
  "id", "planId", "bucketId", "title", "orderHint", "assigneePriority",
  "percentComplete", "priority", "startDateTime", "createdDateTime",
  "dueDateTime", "hasDescription", "previewType", "completedDateTime",
  "completedBy", "referenceCount", "checklistItemCount",
  "activeChecklistItemCount", "conversationThreadId", "appliedCategories",
  "assignments", "createdBy",
];

/** The default property set of the users-list response. */
const DIRECTORY_USER_KEYS = [
  "businessPhones", "displayName", "givenName", "jobTitle", "mail",
  "mobilePhone", "officeLocation", "preferredLanguage", "surname",
  "userPrincipalName", "id",
];

/** The alphabet Planner's opaque ids are drawn from. */
const OPAQUE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const OPAQUE_LENGTH = 28;

/** Salt for the directory GUID derived from a roster row. */
const DIRECTORY_GUID_SALT = "ops-17-directory-guid";

// ------------------------------------------------------------------- the work
//
// Tasks are listed in task-code order. Titles are written work rather than
// drawn: a delivery board is written by people, and a census is reviewable line
// by line only if the sentences are on the page. `owner` indexes the drawn
// directory pool, `null` means the task carries no assignment at all, and
// "departed" means the one assignment whose GUID the directory cannot resolve.
//
// `start` is the Planner startDateTime date and is null wherever percentComplete
// is 0; `planned_start` is what the PMO put in the sheet's Start Date cell, so
// Start Date is never the missing cell and Owner is the only cell a row can lack.

const TASKS = [
  {
    sentence: "Inventory every ticket queue, macro and knowledge article the three support tools carry today",
    bucket: "Discovery",
    percent_complete: 100,
    priority: 1,
    has_description: true,
    checklist: [3, 0],
    owner: 0,
    created: "2026-02-16",
    start: "2026-02-23",
    planned_start: "2026-02-23",
    due: "2026-03-27",
    completed: "2026-03-11",
  },
  {
    sentence: "Agree the single set of ticket fields the consolidated platform will hold",
    bucket: "Discovery",
    percent_complete: 100,
    priority: 3,
    has_description: true,
    checklist: [4, 0],
    owner: 1,
    created: "2026-02-16",
    start: "2026-02-23",
    planned_start: "2026-02-23",
    due: "2026-04-02",
    completed: "2026-03-18",
  },
  {
    sentence: "Map each legacy ticket status onto the agreed status set and write the mapping down",
    bucket: "Discovery",
    percent_complete: 50,
    priority: 3,
    has_description: true,
    checklist: [5, 2],
    owner: 2,
    created: "2026-02-18",
    start: "2026-02-25",
    planned_start: "2026-02-25",
    due: "2026-04-07",
    completed: null,
  },
  {
    sentence: "Confirm which knowledge articles move across at cutover and which are retired in place",
    bucket: "Discovery",
    percent_complete: 50,
    priority: 5,
    has_description: false,
    checklist: [0, 0],
    owner: 3,
    created: "2026-02-18",
    start: "2026-03-02",
    planned_start: "2026-03-02",
    due: "2026-04-10",
    completed: null,
  },
  {
    sentence: "Build the ticket import and run it against a copy of the largest queue",
    bucket: "Migration",
    percent_complete: 100,
    priority: 2,
    has_description: true,
    checklist: [6, 0],
    owner: 4,
    created: "2026-02-20",
    start: "2026-03-02",
    planned_start: "2026-03-02",
    due: "2026-03-31",
    completed: "2026-03-24",
  },
  {
    sentence: "Rebuild the escalation routing rules in the consolidated platform",
    bucket: "Migration",
    percent_complete: 50,
    priority: 1,
    has_description: true,
    checklist: [4, 1],
    owner: 5,
    created: "2026-02-23",
    start: "2026-03-09",
    planned_start: "2026-03-09",
    due: "2026-04-14",
    completed: null,
  },
  {
    sentence: "Move the knowledge articles that survived the review into the new space",
    bucket: "Migration",
    percent_complete: 50,
    priority: 3,
    has_description: false,
    checklist: [0, 0],
    owner: null,
    created: "2026-02-25",
    start: "2026-03-09",
    planned_start: "2026-03-09",
    due: "2026-04-17",
    completed: null,
  },
  {
    sentence: "Reconnect the customer portal so a submitted request lands in the consolidated queue",
    bucket: "Migration",
    percent_complete: 50,
    priority: 9,
    has_description: true,
    checklist: [0, 0],
    owner: 6,
    created: "2026-02-27",
    start: "2026-03-16",
    planned_start: "2026-03-16",
    due: "2026-04-21",
    completed: null,
  },
  {
    sentence: "Run a two week pilot with one support pod working only in the consolidated platform",
    bucket: "Enablement",
    percent_complete: 50,
    priority: 5,
    has_description: true,
    checklist: [3, 3],
    owner: "departed",
    created: "2026-03-02",
    start: "2026-03-16",
    planned_start: "2026-03-16",
    due: "2026-04-24",
    completed: null,
  },
  {
    sentence: "Write the agent guide for the consolidated workflow and put it where agents already look",
    bucket: "Enablement",
    percent_complete: 0,
    priority: 7,
    has_description: false,
    checklist: [0, 0],
    owner: 7,
    created: "2026-03-05",
    start: null,
    planned_start: "2026-03-30",
    due: "2026-04-28",
    completed: null,
  },
  {
    sentence: "Take every support and success agent through the consolidated workflow before cutover",
    bucket: "Enablement",
    percent_complete: 0,
    priority: 3,
    has_description: true,
    checklist: [0, 0],
    owner: 8,
    created: "2026-03-10",
    start: null,
    planned_start: "2026-04-06",
    due: "2026-05-01",
    completed: null,
  },
  {
    sentence: "Decommission the two retired tools and revoke the access they still hold",
    bucket: "Close-out",
    percent_complete: 0,
    priority: 5,
    has_description: true,
    checklist: [0, 0],
    owner: 0,
    created: "2026-03-16",
    start: null,
    planned_start: "2026-04-13",
    due: "2026-05-08",
    completed: null,
  },
  {
    sentence: "Archive the historical ticket record from the retired tools into the agreed store",
    bucket: "Close-out",
    percent_complete: 0,
    priority: 9,
    has_description: false,
    checklist: [0, 0],
    owner: 1,
    created: "2026-03-19",
    start: null,
    planned_start: "2026-04-20",
    due: "2026-05-15",
    completed: null,
  },
  {
    sentence: "Run the consolidation retrospective and record what the next migration should do differently",
    bucket: "Close-out",
    percent_complete: 0,
    priority: 9,
    has_description: false,
    checklist: [0, 0],
    owner: 2,
    created: "2026-03-24",
    start: null,
    planned_start: "2026-04-27",
    due: "2026-05-22",
    completed: null,
  },
];

// ------------------------------------------------------------------ the people

/**
 * The nine active rows the directory exports, plus the one departed row rule
 * T-P3 names. Each department draws on its own stream so the three groups do
 * not share a correlated sequence.
 * @param {(stream: string) => import("../seed.js").Rng} rng
 */
export function pickPeople(rng) {
  const roster = buildRoster(createRng("CORE-04", "roster"));
  const directory = [];
  for (const department of OWNER_DEPARTMENTS) {
    const eligible = roster
      .filter((r) => r.department === department && r.employment_status === "active" && r.level !== "Executive")
      .sort((a, b) => (a.employee_id < b.employee_id ? -1 : 1));
    if (eligible.length < OWNERS_PER_DEPARTMENT) {
      throw new Error(`${id}: ${department} has only ${eligible.length} active people, and the program needs ${OWNERS_PER_DEPARTMENT}`);
    }
    const stream = `people-${department.toLowerCase().replace(/[^a-z]+/g, "-")}`;
    directory.push(...rng(stream).shuffle(eligible).slice(0, OWNERS_PER_DEPARTMENT));
  }

  const departedPool = roster
    .filter((r) => r.department === DEPARTED_DEPARTMENT && r.employment_status !== "active")
    .sort((a, b) => (a.employee_id < b.employee_id ? -1 : 1));
  if (departedPool.length === 0) {
    throw new Error(`${id}: ${DEPARTED_DEPARTMENT} has no departed row, so rule T-P3 has nobody to name`);
  }
  const departed = departedPool[departedPool.length - 1];

  return { roster, directory, departed };
}

// ----------------------------------------------------------------- id helpers

/** A 28-character opaque id from the URL-safe alphabet Planner ids use. */
function opaqueId(stream) {
  let out = "";
  for (let i = 0; i < OPAQUE_LENGTH; i++) out += OPAQUE_ALPHABET[stream.int(0, OPAQUE_ALPHABET.length - 1)];
  return out;
}

/** A 16-digit numeric id, the shape Smartsheet object ids take. */
function numericId(stream) {
  return stream.int(1000000000000000, 8999999999999999);
}

/**
 * A UUID-shaped string derived from a roster row under a per-tool salt, so the
 * same person is the same identity everywhere inside this fixture and a roster
 * reroll moves the identity with the row instead of stranding it.
 */
function derivedGuid(salt, employeeId) {
  let hex = "";
  // The varying chunk index leads the hashed string: FNV-1a folds the head of
  // its input through every later byte, so four chunks that differ only at the
  // tail would come back visibly correlated.
  for (let i = 0; i < 4; i++) hex += fnv1a(`${i}:${salt}:${employeeId}`).toString(16).padStart(8, "0");
  // Force the RFC 4122 version 4 nibbles before assembling: "4" at hex[12],
  // one of 8/9/a/b at hex[16], the variant drawn from the same hash.
  const variant = "89ab"[fnv1a(`variant:${salt}:${employeeId}`) % 4];
  hex = `${hex.slice(0, 12)}4${hex.slice(13, 16)}${variant}${hex.slice(17, 32)}`;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/** An order-hint string, the opaque ordering token Planner returns. */
function orderHint(value) {
  return `${String(value)}W`;
}

/** A working-hours timestamp on `date`, with the milliseconds Graph returns. */
function graphInstant(date, stream) {
  const hh = String(stream.int(8, 18)).padStart(2, "0");
  const mm = String(stream.int(0, 59)).padStart(2, "0");
  const ss = String(stream.int(0, 59)).padStart(2, "0");
  const ms = String(stream.int(0, 999)).padStart(3, "0");
  return `${date}T${hh}:${mm}:${ss}.${ms}Z`;
}

/** A working-hours timestamp on `date` in the seconds precision Smartsheet returns. */
function sheetInstant(date, stream) {
  const hh = String(stream.int(8, 18)).padStart(2, "0");
  const mm = String(stream.int(0, 59)).padStart(2, "0");
  const ss = String(stream.int(0, 59)).padStart(2, "0");
  return `${date}T${hh}:${mm}:${ss}Z`;
}

/** A date at midnight UTC, the shape Planner returns for a date-only field. */
function graphDate(date) {
  return `${date}T00:00:00Z`;
}

/** The published band of a priority integer. */
export function priorityBand(priority) {
  const band = PRIORITY_BANDS.find((b) => priority >= b.min && priority <= b.max);
  if (!band) throw new Error(`${id}: priority ${priority} falls outside the published banding`);
  return band.name;
}

/** The task code at the head of a Planner title. */
function headToken(title) {
  return title.split(" ")[0];
}

// ------------------------------------------------------------------- builder

/**
 * Build all five payloads. Pure: no I/O, no Date.now(), every draw on a named
 * stream, every census asserted before the object is returned.
 * @param {(stream: string) => import("../seed.js").Rng} rng
 */
export function buildExport(rng) {
  const { roster, directory, departed } = pickPeople(rng);

  const idStream = rng("planner-ids");
  const sheetIdStream = rng("smartsheet-ids");
  const clockStream = rng("clock");
  const sheetClockStream = rng("smartsheet-clock");
  const hintStream = rng("order-hints");

  const planId = opaqueId(idStream);
  const guidFor = (employeeId) => derivedGuid(DIRECTORY_GUID_SALT, employeeId);

  // The program manager: the Operations row with the lowest employee id among
  // the nine. createdBy and every assignedBy is this account.
  const operationsRows = directory
    .filter((p) => p.department === "Operations")
    .sort((a, b) => (a.employee_id < b.employee_id ? -1 : 1));
  if (operationsRows.length === 0) throw new Error(`${id}: the directory carries no Operations row`);
  const programManager = operationsRows[0];
  const managerRef = { user: { id: guidFor(programManager.employee_id) } };

  // ------------------------------------------------------------ buckets
  const buckets = BUCKETS.map((name) => ({
    id: opaqueId(idStream),
    name,
    planId,
    orderHint: orderHint(hintStream.int(8585000000, 8585999999)),
  }));
  const bucketByName = new Map(buckets.map((b) => [b.name, b]));

  // ------------------------------------------------------------ directory
  const directoryUsers = directory
    .slice()
    .sort((a, b) => (a.employee_id < b.employee_id ? -1 : 1))
    .map((person) => ({
      businessPhones: [],
      displayName: `${person.first_name} ${person.last_name}`,
      givenName: person.first_name,
      jobTitle: person.role_title,
      mail: person.email,
      mobilePhone: null,
      officeLocation: null,
      preferredLanguage: null,
      surname: person.last_name,
      userPrincipalName: person.email,
      id: guidFor(person.employee_id),
    }));

  // ------------------------------------------------------------ planner tasks
  // The order hint is an opaque token, kept a fixed width so the emission order
  // and the lexicographic order of the hints are the same order.
  let hint = hintStream.int(1000000000, 4000000000);
  const tasks = TASKS.map((task, index) => {
    const code = `${TASK_PREFIX}-${TASK_NUMBER_START + index}`;
    const bucket = bucketByName.get(task.bucket);
    if (!bucket) throw new Error(`${id}: ${code} sits in bucket "${task.bucket}", which the plan does not carry`);
    const assignee = task.owner === null
      ? null
      : task.owner === "departed"
        ? departed
        : directory[task.owner];
    if (task.owner !== null && !assignee) throw new Error(`${id}: ${code} names owner slot ${task.owner}, which is empty`);

    hint += hintStream.int(1000000, 9000000);
    const createdDateTime = graphInstant(task.created, clockStream);
    const completedDateTime = task.completed === null ? null : graphInstant(task.completed, clockStream);
    const assignedDateTime = graphInstant(addDays(task.created, 1), clockStream);

    const assignments = {};
    if (assignee) {
      assignments[guidFor(assignee.employee_id)] = {
        "@odata.type": "#microsoft.graph.plannerAssignment",
        assignedBy: managerRef,
        assignedDateTime,
        orderHint: orderHint(hintStream.int(10000000, 99999999)),
      };
    }

    return {
      id: opaqueId(idStream),
      planId,
      bucketId: bucket.id,
      title: `${code} ${task.sentence}`,
      orderHint: orderHint(`9223370${String(hint).padStart(10, "0")}`),
      assigneePriority: orderHint(hintStream.int(80000000, 99999999)),
      percentComplete: task.percent_complete,
      priority: task.priority,
      startDateTime: task.start === null ? null : graphDate(task.start),
      createdDateTime,
      dueDateTime: graphDate(task.due),
      hasDescription: task.has_description,
      previewType: "automatic",
      completedDateTime,
      completedBy: completedDateTime === null || !assignee
        ? null
        : { user: { id: guidFor(assignee.employee_id) } },
      referenceCount: 0,
      checklistItemCount: task.checklist[0],
      activeChecklistItemCount: task.checklist[1],
      conversationThreadId: null,
      appliedCategories: {},
      assignments,
      createdBy: managerRef,
    };
  });

  // ------------------------------------------------------------ the sheet
  const columns = COLUMN_TITLES.map((title, index) => {
    const column = {
      id: numericId(sheetIdStream),
      version: 0,
      index,
      title,
      type: columnType(title),
      validation: false,
      width: sheetIdStream.int(110, 220),
    };
    // primary is returned only when true (the reference is explicit), so the
    // key is absent rather than false on every other column.
    if (index === 0) column.primary = true;
    if (title === "Workstream") column.options = BUCKETS.slice();
    if (title === "Priority") column.options = PRIORITY_BANDS.map((b) => b.name);
    return column;
  });
  const columnByTitle = new Map(columns.map((c) => [c.title, c]));

  const rows = TASKS.map((task, index) => {
    const plannerTask = tasks[index];
    const code = headToken(plannerTask.title);
    const assignee = task.owner === null
      ? null
      : task.owner === "departed"
        ? departed
        : directory[task.owner];
    const createdAt = sheetInstant(task.created, sheetClockStream);
    const modifiedDate = minDate(addDays(task.created, sheetClockStream.int(6, 30)), "2026-03-25");
    const modifiedAt = sheetInstant(modifiedDate, sheetClockStream);
    const startDate = task.start === null ? task.planned_start : task.start;

    const cells = [
      cell(columnByTitle, "Task ID", code, code),
      cell(columnByTitle, "Task Name", task.sentence, task.sentence),
      cell(columnByTitle, "Workstream", task.bucket, task.bucket),
    ];
    if (assignee) {
      cells.push(cell(columnByTitle, "Owner", assignee.email, `${assignee.first_name} ${assignee.last_name}`));
    }
    cells.push(
      // DATE cells carry no displayValue: the reference returns none for that
      // column type (finding F1).
      cell(columnByTitle, "Start Date", startDate),
      cell(columnByTitle, "Due Date", task.due),
      cell(columnByTitle, "% Complete", task.percent_complete / 100, `${task.percent_complete}%`),
      cell(columnByTitle, "Priority", priorityBand(task.priority), priorityBand(task.priority))
    );

    return {
      id: numericId(sheetIdStream),
      rowNumber: index + 1,
      expanded: true,
      createdAt,
      modifiedAt,
      cells,
    };
  });

  const sheet = {
    id: numericId(sheetIdStream),
    name: SHEET_NAME,
    version: sheetIdStream.int(30, 90),
    totalRowCount: rows.length,
    accessLevel: "EDITOR",
    effectiveAttachmentOptions: ["FILE", "GOOGLE_DRIVE", "LINK", "BOX_COM", "DROPBOX", "ONEDRIVE"],
    ganttEnabled: false,
    dependenciesEnabled: false,
    resourceManagementEnabled: false,
    cellImageUploadEnabled: true,
    userSettings: { criticalPathEnabled: false, displaySummaryTasks: true },
    userPermissions: { summaryPermissions: "ADMIN" },
    permalink: `https://app.smartsheet.com/sheets/${opaqueId(sheetIdStream)}`,
    createdAt: sheetInstant(WINDOW.created_start, sheetClockStream),
    modifiedAt: "2026-03-26T16:48:00Z",
    columns,
    rows,
  };

  const plannerTasks = {
    "@odata.context": `https://graph.microsoft.com/v1.0/$metadata#planner/plans('${planId}')/tasks`,
    value: tasks,
  };
  const plannerBuckets = {
    "@odata.context": `https://graph.microsoft.com/v1.0/$metadata#planner/plans('${planId}')/buckets`,
    value: buckets,
  };
  const groupId = derivedGuid("ops-17-plan-group", PROGRAM);
  const directoryPayload = {
    "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#users",
    value: directoryUsers,
  };

  const captureLog = {
    artifact: id,
    program: PROGRAM,
    company: COMPANY,
    captured_at: CAPTURED_AT,
    captures: [
      {
        tool: "planner",
        method: "GET",
        url: `https://graph.microsoft.com/v1.0/planner/plans/${planId}/tasks`,
        response_file: "planner-tasks.json",
      },
      {
        tool: "planner",
        method: "GET",
        url: `https://graph.microsoft.com/v1.0/planner/plans/${planId}/buckets`,
        response_file: "planner-buckets.json",
      },
      {
        tool: "microsoft-graph",
        method: "GET",
        // The plan's Microsoft 365 group, cast to users, so the listing is the
        // plan's members rather than the tenant; the cast keeps the users
        // envelope and the default user property set.
        url: `https://graph.microsoft.com/v1.0/groups/${groupId}/members/microsoft.graph.user`,
        response_file: "directory-users.json",
      },
      {
        tool: "smartsheet",
        method: "GET",
        // The unassigned task's row carries seven cells against eight
        // columns only because this call excludes nonexistent cells; a
        // default Get Sheet call would carry an empty Owner cell instead.
        url: `https://api.smartsheet.com/2.0/sheets/${sheet.id}?exclude=nonexistentCells`,
        query: { exclude: "nonexistentCells" },
        response_file: "smartsheet-sheet.json",
      },
    ],
  };

  const payload = { plannerTasks, plannerBuckets, directoryPayload, sheet, captureLog };
  assertExport({ payload, roster, departed });
  return payload;
}

/** The earlier of two ISO dates. */
function minDate(a, b) {
  return a < b ? a : b;
}

function columnType(title) {
  if (title === "Owner") return "CONTACT_LIST";
  if (title === "Start Date" || title === "Due Date") return "DATE";
  if (title === "Workstream" || title === "Priority") return "PICKLIST";
  return "TEXT_NUMBER";
}

function cell(columnByTitle, title, value, displayValue) {
  const column = columnByTitle.get(title);
  if (!column) throw new Error(`${id}: the sheet carries no "${title}" column`);
  return displayValue === undefined
    ? { columnId: column.id, value }
    : { columnId: column.id, value, displayValue };
}

// ---------------------------------------------------------------- assertions

/**
 * Re-derive every rule from the built objects and refuse to emit if one fails.
 * Rules only: nothing here names which task satisfies which rule.
 */
function assertExport({ payload, roster, departed }) {
  const { plannerTasks, plannerBuckets, directoryPayload, sheet, captureLog } = payload;
  const tasks = plannerTasks.value;
  const buckets = plannerBuckets.value;
  const users = directoryPayload.value;
  const rows = sheet.rows;
  const columns = sheet.columns;

  if (tasks.length !== TARGET_TASKS) throw new Error(`${id}: the plan carries ${tasks.length} tasks, expected ${TARGET_TASKS}`);
  if (rows.length !== TARGET_TASKS) throw new Error(`${id}: the sheet carries ${rows.length} rows, expected ${TARGET_TASKS}`);
  if (sheet.totalRowCount !== TARGET_TASKS) throw new Error(`${id}: totalRowCount is ${sheet.totalRowCount}, expected ${TARGET_TASKS}`);
  if (buckets.length !== BUCKETS.length) throw new Error(`${id}: the plan carries ${buckets.length} buckets, expected ${BUCKETS.length}`);
  if (users.length !== DIRECTORY_SIZE) throw new Error(`${id}: the directory carries ${users.length} accounts, expected ${DIRECTORY_SIZE}`);

  // Shape: the property set, and no details object anywhere (T-S6).
  for (const task of tasks) {
    const keys = Object.keys(task);
    if (keys.join(",") !== PLANNER_TASK_KEYS.join(",")) {
      throw new Error(`${id}: a task carries the property set ${keys.join(",")}, not the published plannerTask set`);
    }
  }
  for (const user of users) {
    const keys = Object.keys(user);
    if (keys.join(",") !== DIRECTORY_USER_KEYS.join(",")) {
      throw new Error(`${id}: a directory entry carries the property set ${keys.join(",")}, not the published default set`);
    }
  }
  if (/"details"/.test(JSON.stringify(plannerTasks))) {
    throw new Error(`${id}: a details object reached the tasks payload, which a list response never carries`);
  }

  // Ids are distinct where the tools make them distinct.
  assertDistinct(tasks.map((t) => t.id), "task id");
  assertDistinct(buckets.map((b) => b.id), "bucket id");
  assertDistinct(users.map((u) => u.id), "directory id");
  assertDistinct(columns.map((c) => c.id), "column id");
  assertDistinct(rows.map((r) => r.id), "row id");

  // orderHint order.
  for (let i = 1; i < tasks.length; i++) {
    if (!(tasks[i - 1].orderHint < tasks[i].orderHint)) {
      throw new Error(`${id}: the tasks are not in orderHint order`);
    }
  }

  // T-S7 columns.
  for (const [index, column] of columns.entries()) {
    if (column.index !== index) throw new Error(`${id}: the column index sequence has a hole in it`);
    if (column.title !== COLUMN_TITLES[index]) throw new Error(`${id}: column ${index} is "${column.title}"`);
    if (("primary" in column) !== (index === 0)) {
      throw new Error(`${id}: primary is present on a column that is not the sheet's primary column`);
    }
  }
  const columnById = new Map(columns.map((c) => [c.id, c]));
  for (const row of rows) {
    const seen = new Set();
    for (const c of row.cells) {
      if (!columnById.has(c.columnId)) throw new Error(`${id}: a cell names columnId ${c.columnId}, which the sheet does not carry`);
      if (seen.has(c.columnId)) throw new Error(`${id}: a row carries two cells for one column`);
      seen.add(c.columnId);
      const column = columnById.get(c.columnId);
      const expectedKeys = column.type === "DATE" ? "columnId,value" : "columnId,value,displayValue";
      if (Object.keys(c).join(",") !== expectedKeys) {
        throw new Error(`${id}: a cell carries ${Object.keys(c).join(",")}, not ${expectedKeys}`);
      }
    }
  }

  // T-S6: nothing on either side carries a definition of done.
  for (const title of COLUMN_TITLES) {
    if (/definition|done/i.test(title)) throw new Error(`${id}: the sheet carries a "${title}" column`);
  }
  for (const key of PLANNER_TASK_KEYS) {
    if (/definition|done/i.test(key)) throw new Error(`${id}: a plannerTask property is named "${key}"`);
  }

  // T-S1 the join, a bijection over 14.
  const rowByCode = new Map();
  for (const row of rows) {
    const code = cellValue(row, columnById, "Task ID");
    if (rowByCode.has(code)) throw new Error(`${id}: two rows carry Task ID ${code}`);
    rowByCode.set(code, row);
  }
  if (rowByCode.size !== tasks.length) throw new Error(`${id}: the join is not a bijection`);
  for (const task of tasks) {
    const code = headToken(task.title);
    const row = rowByCode.get(code);
    if (!row) throw new Error(`${id}: the title head token ${code} matches no row`);
    const name = cellValue(row, columnById, "Task Name");
    if (task.title !== `${code} ${name}`) throw new Error(`${id}: ${code} the title and the Task Name cell disagree`);

    // T-S2 state.
    const fraction = cellValue(row, columnById, "% Complete");
    if (task.percentComplete / 100 !== fraction) throw new Error(`${id}: ${code} percentComplete and the fraction disagree`);
    if (cellDisplay(row, columnById, "% Complete") !== `${fraction * 100}%`) {
      throw new Error(`${id}: ${code} the % Complete displayValue is not the fraction as a whole percent`);
    }
    if (!PERCENT_VALUES.includes(task.percentComplete)) {
      throw new Error(`${id}: ${code} carries percentComplete ${task.percentComplete}`);
    }

    // T-S3 priority.
    if (cellValue(row, columnById, "Priority") !== priorityBand(task.priority)) {
      throw new Error(`${id}: ${code} the priority band and the Priority cell disagree`);
    }

    // T-S4 workstream.
    const bucket = buckets.find((b) => b.id === task.bucketId);
    if (!bucket) throw new Error(`${id}: ${code} sits in a bucket the buckets payload does not carry`);
    if (cellValue(row, columnById, "Workstream") !== bucket.name) {
      throw new Error(`${id}: ${code} the bucket name and the Workstream cell disagree`);
    }

    // T-S9 dates.
    if (task.dueDateTime.slice(0, 10) !== cellValue(row, columnById, "Due Date")) {
      throw new Error(`${id}: ${code} the two sides disagree about the due date`);
    }
    if (task.startDateTime !== null && task.startDateTime.slice(0, 10) !== cellValue(row, columnById, "Start Date")) {
      throw new Error(`${id}: ${code} the two sides disagree about the start date`);
    }
    if ((task.startDateTime === null) !== (task.percentComplete === 0)) {
      throw new Error(`${id}: ${code} carries a start date the state does not allow`);
    }
    if (cellValue(row, columnById, "Start Date") === undefined) {
      throw new Error(`${id}: ${code} has no Start Date cell, and Start Date is never the missing cell`);
    }
    if (task.checklistItemCount < task.activeChecklistItemCount) {
      throw new Error(`${id}: ${code} has more active checklist items than checklist items`);
    }
  }

  // T-S8 value versus display, three classes: Owner and % Complete carry both
  // keys and differ; Task ID, Task Name, Workstream and Priority carry both
  // keys and agree; Start Date and Due Date (DATE columns) carry value and no
  // displayValue at all, because the reference returns none for that type.
  for (const row of rows) {
    for (const c of row.cells) {
      const column = columnById.get(c.columnId);
      if (column.type === "DATE") {
        if (Object.hasOwn(c, "displayValue")) {
          throw new Error(`${id}: the ${column.title} cell of row ${row.rowNumber} carries a displayValue, which the reference never returns for DATE`);
        }
        continue;
      }
      const differ = c.value !== c.displayValue;
      if (SPLIT_COLUMNS.includes(column.title) !== differ) {
        throw new Error(`${id}: the ${column.title} cell of row ${row.rowNumber} breaks the value versus displayValue split`);
      }
    }
  }

  // T-S5 and T-P3 owners.
  const userById = new Map(users.map((u) => [u.id, u]));
  let resolved = 0;
  let unassigned = 0;
  let unresolvable = 0;
  for (const task of tasks) {
    const row = rowByCode.get(headToken(task.title));
    const guids = Object.keys(task.assignments);
    if (guids.length > 1) throw new Error(`${id}: a task carries ${guids.length} assignments, expected at most one`);
    const ownerValue = cellValue(row, columnById, "Owner");
    if (guids.length === 0) {
      if (ownerValue !== undefined) throw new Error(`${id}: an unassigned task still carries an Owner cell`);
      if (row.cells.length !== COLUMN_TITLES.length - 1) {
        throw new Error(`${id}: the unassigned row carries ${row.cells.length} cells, expected ${COLUMN_TITLES.length - 1}`);
      }
      unassigned += 1;
      continue;
    }
    if (ownerValue === undefined) throw new Error(`${id}: an assigned task has no Owner cell`);
    if (row.cells.length !== COLUMN_TITLES.length) {
      throw new Error(`${id}: an assigned row carries ${row.cells.length} cells, expected ${COLUMN_TITLES.length}`);
    }
    const user = userById.get(guids[0]);
    if (user) {
      if (user.mail !== ownerValue) throw new Error(`${id}: the assignment GUID and the Owner cell name different people`);
      if (user.displayName !== cellDisplay(row, columnById, "Owner")) {
        throw new Error(`${id}: the directory and the Owner cell disagree about a display name`);
      }
      resolved += 1;
      continue;
    }
    const person = roster.find((r) => r.email === ownerValue);
    if (!person) throw new Error(`${id}: an Owner cell names an email the roster does not carry`);
    if (person.employment_status === "active") {
      throw new Error(`${id}: an unresolvable assignment names an active roster row, so the directory should carry it`);
    }
    if (person.employee_id !== departed.employee_id) {
      throw new Error(`${id}: the unresolvable assignment is not the row rule T-P3 names`);
    }
    if (guids[0] !== derivedGuid(DIRECTORY_GUID_SALT, departed.employee_id)) {
      throw new Error(`${id}: the unresolvable GUID is not derived from its roster row like every other`);
    }
    unresolvable += 1;
  }
  const assignmentCensus = { resolved, unassigned, unresolvable };
  for (const [name, expected] of Object.entries(ASSIGNMENT_CENSUS)) {
    if (assignmentCensus[name] !== expected) {
      throw new Error(`${id}: ${assignmentCensus[name]} tasks are in the ${name} class, expected ${expected}`);
    }
  }

  // T-S10 people.
  const rosterByEmail = new Map(roster.map((r) => [r.email, r]));
  for (const user of users) {
    const person = rosterByEmail.get(user.mail);
    if (!person) throw new Error(`${id}: the directory carries an email the roster does not`);
    if (person.employment_status !== "active") throw new Error(`${id}: the directory carries a departed account`);
    if (!OWNER_DEPARTMENTS.includes(person.department)) {
      throw new Error(`${id}: the directory carries a ${person.department} row, and that team does not staff the program`);
    }
    if (user.displayName !== `${person.first_name} ${person.last_name}`) {
      throw new Error(`${id}: the directory calls someone a name the roster does not`);
    }
    if (user.jobTitle !== person.role_title) throw new Error(`${id}: the directory carries a job title the roster does not`);
    if (user.userPrincipalName !== person.email) throw new Error(`${id}: a userPrincipalName is not the roster email`);
    if (user.id !== derivedGuid(DIRECTORY_GUID_SALT, person.employee_id)) {
      throw new Error(`${id}: a directory GUID is not derived from its roster row`);
    }
  }
  const owningGuids = new Set(tasks.flatMap((t) => Object.keys(t.assignments)).filter((g) => userById.has(g)));
  if (owningGuids.size !== users.length) {
    throw new Error(`${id}: ${users.length - owningGuids.size} directory accounts own nothing`);
  }

  // The state, description, checklist and priority censuses.
  countCensus(tasks.map((t) => String(t.percentComplete)), PERCENT_CENSUS, "percentComplete");
  countCensus(tasks.map((t) => priorityBand(t.priority)), PRIORITY_BAND_CENSUS, "priority band");
  const offNominal = tasks.filter((t) => !PLANNER_WRITTEN_PRIORITIES.includes(t.priority));
  if (offNominal.length !== OFF_NOMINAL_PRIORITIES) {
    throw new Error(`${id}: ${offNominal.length} tasks carry a priority Planner never writes, expected ${OFF_NOMINAL_PRIORITIES}`);
  }
  if (new Set(offNominal.map((t) => t.priority)).size !== offNominal.length) {
    throw new Error(`${id}: the off-nominal priorities repeat, so the two are not distinguishable`);
  }
  const described = tasks.filter((t) => t.hasDescription === true);
  if (described.length !== DESCRIBED_TASKS) {
    throw new Error(`${id}: ${described.length} tasks carry a description, expected ${DESCRIBED_TASKS}`);
  }
  const checklisted = tasks.filter((t) => t.checklistItemCount > 0);
  if (checklisted.length !== CHECKLISTED_TASKS) {
    throw new Error(`${id}: ${checklisted.length} tasks carry a checklist, expected ${CHECKLISTED_TASKS}`);
  }
  const completed = tasks.filter((t) => t.completedDateTime !== null);
  if (completed.length !== PERCENT_CENSUS[100]) {
    throw new Error(`${id}: ${completed.length} tasks carry a completion instant, expected ${PERCENT_CENSUS[100]}`);
  }
  for (const task of tasks) {
    const isComplete = task.percentComplete === 100;
    if ((task.completedDateTime !== null) !== isComplete || (task.completedBy !== null) !== isComplete) {
      throw new Error(`${id}: a task's completion fields and its percentComplete disagree`);
    }
  }

  // T-S11 the window.
  for (const stamp of recordedInstants(payload)) {
    if (stamp.slice(0, 19) > CAPTURED_AT.slice(0, 19)) {
      throw new Error(`${id}: ${stamp} is after the capture instant`);
    }
  }
  for (const task of tasks) {
    const due = task.dueDateTime.slice(0, 10);
    if (due < DUE_WINDOW.start || due > DUE_WINDOW.end) {
      throw new Error(`${id}: a task is due ${due}, outside the program window`);
    }
    const created = task.createdDateTime.slice(0, 10);
    if (created < WINDOW.created_start || created > WINDOW.created_end) {
      throw new Error(`${id}: a task was created ${created}, outside the program window`);
    }
  }

  // The capture log names every payload file exactly once.
  const logged = captureLog.captures.map((c) => c.response_file);
  const expected = ["planner-tasks.json", "planner-buckets.json", "directory-users.json", "smartsheet-sheet.json"];
  if (logged.join(",") !== expected.join(",")) {
    throw new Error(`${id}: the capture log records ${logged.join(",")}, not one entry per payload file`);
  }
  if (captureLog.captured_at !== CAPTURED_AT) throw new Error(`${id}: the capture log disagrees about the capture instant`);
}

function assertDistinct(values, what) {
  if (new Set(values).size !== values.length) throw new Error(`${id}: a ${what} repeats`);
}

function countCensus(values, expected, what) {
  const counts = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  for (const [key, want] of Object.entries(expected)) {
    if ((counts[key] ?? 0) !== want) {
      throw new Error(`${id}: ${counts[key] ?? 0} tasks carry ${what} ${key}, expected ${want}`);
    }
  }
  const extra = Object.keys(counts).filter((k) => !(k in expected));
  if (extra.length > 0) throw new Error(`${id}: ${what} takes the unexpected value ${extra.join(", ")}`);
}

function cellValue(row, columnById, title) {
  const found = row.cells.find((c) => columnById.get(c.columnId).title === title);
  return found === undefined ? undefined : found.value;
}

function cellDisplay(row, columnById, title) {
  const found = row.cells.find((c) => columnById.get(c.columnId).title === title);
  return found === undefined ? undefined : found.displayValue;
}

/**
 * Every instant the tools record as "this happened", for the window check. A
 * due date is a plan rather than a record of something that happened, so it is
 * checked against the program window instead, and not here.
 */
export function recordedInstants(payload) {
  const stamps = [];
  for (const task of payload.plannerTasks.value) {
    stamps.push(task.createdDateTime);
    if (task.startDateTime !== null) stamps.push(task.startDateTime);
    if (task.completedDateTime !== null) stamps.push(task.completedDateTime);
    for (const assignment of Object.values(task.assignments)) stamps.push(assignment.assignedDateTime);
  }
  stamps.push(payload.sheet.createdAt, payload.sheet.modifiedAt);
  for (const row of payload.sheet.rows) stamps.push(row.createdAt, row.modifiedAt);
  return stamps;
}

// ---------------------------------------------------------------- generate

export function generate({ rng }) {
  const { plannerTasks, plannerBuckets, directoryPayload, sheet, captureLog } = buildExport(rng);
  const emit = (path, value) => ({ path, content: `${JSON.stringify(value, null, 2)}\n` });
  return [
    emit("planner-tasks.json", plannerTasks),
    emit("planner-buckets.json", plannerBuckets),
    emit("directory-users.json", directoryPayload),
    emit("smartsheet-sheet.json", sheet),
    emit("capture-log.json", captureLog),
  ];
}

// OPS-17 work-management-export-planner-smartsheet: the two exports module 8
// normalizes, one Planner plan and one Smartsheet sheet over the same fourteen
// tasks.
//
// Every rule is re-derived here from the emitted bytes, with this file's own
// constants retyped rather than imported, so the spec sentence, the generator
// and this file can disagree in front of each other. People are resolved
// against the committed CORE-04 roster read off disk, not against a list the
// generator exports.
//
// Shapes, never instances: no test below names which task carries no
// assignment, which one the directory cannot resolve, or which two priorities
// Planner never writes. Each is located by its rule.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
const spec = specs.byId.get("OPS-17");

// Retyped, not imported.
const FILES = [
  "planner-tasks.json", "planner-buckets.json", "directory-users.json",
  "smartsheet-sheet.json", "capture-log.json",
];
const TARGET_TASKS = 14;
const FIRST_TASK = 101;
const TASK_PREFIX = "STC";
const CAPTURED_AT = "2026-03-26T17:05:00Z";
const CREATED_WINDOW = { start: "2026-02-16", end: "2026-03-24" };
const DUE_WINDOW = { start: "2026-03-27", end: "2026-05-22" };
const BUCKETS = ["Discovery", "Migration", "Enablement", "Close-out"];
const COLUMN_TITLES = [
  "Task ID", "Task Name", "Workstream", "Owner",
  "Start Date", "Due Date", "% Complete", "Priority",
];
const SPLIT_COLUMNS = ["Owner", "% Complete"];
const DATE_COLUMNS = ["Start Date", "Due Date"];
const PLANNER_TASK_KEYS = [
  "id", "planId", "bucketId", "title", "orderHint", "assigneePriority",
  "percentComplete", "priority", "startDateTime", "createdDateTime",
  "dueDateTime", "hasDescription", "previewType", "completedDateTime",
  "completedBy", "referenceCount", "checklistItemCount",
  "activeChecklistItemCount", "conversationThreadId", "appliedCategories",
  "assignments", "createdBy",
];
const DIRECTORY_USER_KEYS = [
  "businessPhones", "displayName", "givenName", "jobTitle", "mail",
  "mobilePhone", "officeLocation", "preferredLanguage", "surname",
  "userPrincipalName", "id",
];
const BUCKET_KEYS = ["@odata.etag", "name", "planId", "orderHint", "id"];
const SHEET_KEYS = [
  "id", "name", "version", "totalRowCount", "accessLevel",
  "effectiveAttachmentOptions", "ganttEnabled", "dependenciesEnabled",
  "resourceManagementEnabled", "cellImageUploadEnabled", "hasSummaryFields",
  "isMultiPicklistEnabled", "resourceManagementType", "userSettings",
  "userPermissions", "permalink", "createdAt", "modifiedAt", "columns", "rows",
];
const ROW_KEYS = [
  "id", "rowNumber", "expanded", "accessLevel", "locked", "lockedForUser",
  "version", "createdAt", "modifiedAt", "cells",
];
const PERCENT_CENSUS = { 0: 5, 50: 6, 100: 3 };
const PLANNER_WRITTEN_PRIORITIES = [1, 3, 5, 9];
const OFF_NOMINAL_PRIORITIES = 2;
// The published banding: 0 to 1 urgent, 2 to 4 important, 5 to 7 medium, 8 to 10 low.
const BANDS = [
  { name: "Urgent", min: 0, max: 1 },
  { name: "Important", min: 2, max: 4 },
  { name: "Medium", min: 5, max: 7 },
  { name: "Low", min: 8, max: 10 },
];
const BAND_CENSUS = { Urgent: 2, Important: 5, Medium: 4, Low: 3 };
const ASSIGNMENT_CENSUS = { resolved: 12, unassigned: 1, unresolvable: 1 };
const DIRECTORY_SIZE = 9;
const DESCRIBED_TASKS = 9;
const CHECKLISTED_TASKS = 6;
const STAFFING_DEPARTMENTS = ["Operations", "Customer Success", "Engineering"];
const DEPARTED_DEPARTMENT = "Operations";

/** CORE-04's committed bytes, read off disk rather than regenerated. */
const roster = csvTable(
  readFileSync(join(REPO_ROOT, "datasets", "core", "people-roster", "people-roster.csv"), "utf8")
).rows;
const rosterByEmail = new Map(roster.map((r) => [r.email, r]));

/** The row rule T-P3 names, recomputed here from the roster. */
function departedRow() {
  const departed = roster
    .filter((r) => r.department === DEPARTED_DEPARTMENT && r.employment_status !== "active")
    .sort((a, b) => (a.employee_id < b.employee_id ? -1 : 1));
  assert.ok(departed.length > 0, "the roster carries no departed Operations row");
  return departed[departed.length - 1];
}

let cached = null;
function fixture() {
  if (cached) return cached;
  assert.ok(spec, "OPS-17 not found in specs/artifact-specs.yaml");
  const files = generateArtifact(spec, canon);
  const read = (path) => JSON.parse(fileByPath(files, path).content);
  cached = {
    files,
    tasks: read("planner-tasks.json"),
    buckets: read("planner-buckets.json"),
    directory: read("directory-users.json"),
    sheet: read("smartsheet-sheet.json"),
    captureLog: read("capture-log.json"),
  };
  return cached;
}

/** This file's own band lookup, written from the published ranges. */
function bandOf(priority) {
  const band = BANDS.find((b) => priority >= b.min && priority <= b.max);
  assert.ok(band, `priority ${priority} falls outside the published banding`);
  return band.name;
}

function columnIndex(sheet) {
  return new Map(sheet.columns.map((c) => [c.id, c.title]));
}

function cellOf(row, byId, title) {
  return row.cells.find((c) => byId.get(c.columnId) === title);
}

function headToken(title) {
  return title.split(" ")[0];
}

/** Every (task, row) pair, joined by the rule and asserted complete. */
function joined() {
  const { tasks, sheet } = fixture();
  const byId = columnIndex(sheet);
  const rowByCode = new Map(sheet.rows.map((r) => [cellOf(r, byId, "Task ID").value, r]));
  return tasks.value.map((task) => {
    const code = headToken(task.title);
    const row = rowByCode.get(code);
    assert.ok(row, `the title head token ${code} matches no sheet row`);
    return { task, row, code, byId };
  });
}

// ------------------------------------------------------------------ the shape

test("OPS-17: five files, each the body of one documented call, named by the capture log", () => {
  const { files, captureLog } = fixture();
  assert.deepEqual(files.map((f) => f.path).sort(), FILES.slice().sort());
  for (const file of files) {
    assert.ok(file.content.endsWith("}\n"), `${file.path} is not pretty-printed JSON with a trailing newline`);
  }
  assert.equal(captureLog.captured_at, CAPTURED_AT);
  assert.equal(captureLog.company, "co-002");
  const logged = captureLog.captures.map((c) => c.response_file);
  assert.deepEqual(logged.slice().sort(), FILES.filter((f) => f !== "capture-log.json").sort(),
    "the capture log does not name one call per payload file");
  for (const capture of captureLog.captures) {
    assert.ok(/^https:\/\//.test(capture.url), "a capture records no url");
    assert.ok(["GET", "POST"].includes(capture.method), "a capture records no method");
  }
  const smartsheetCapture = captureLog.captures.find((c) => c.response_file === "smartsheet-sheet.json");
  assert.equal(smartsheetCapture.query?.exclude, "nonexistentCells",
    "the capture log does not record the parameter that drops the empty cell, so the seven-cell row is not the body of the call it names");
  assert.match(smartsheetCapture.url, /\?exclude=nonexistentCells$/,
    "the capture log does not record the parameter that drops the empty cell, so the seven-cell row is not the body of the call it names");
});

test("OPS-17: the envelopes are the documented collection responses", () => {
  const { tasks, buckets, directory, sheet } = fixture();
  for (const envelope of [tasks, buckets, directory]) {
    assert.deepEqual(Object.keys(envelope), ["@odata.context", "value"]);
    assert.ok(Array.isArray(envelope.value));
  }
  assert.equal(tasks.value.length, TARGET_TASKS);
  assert.equal(buckets.value.length, BUCKETS.length);
  assert.equal(directory.value.length, DIRECTORY_SIZE);
  assert.match(tasks["@odata.context"], /planner\/plans\('[^']+'\)\/tasks$/);
  assert.match(buckets["@odata.context"], /planner\/plans\('[^']+'\)\/buckets$/);
  assert.match(directory["@odata.context"], /#users$/);

  assert.deepEqual(Object.keys(sheet), SHEET_KEYS,
    "the sheet does not carry the ungated Sheet schema key set and order");
  for (const row of sheet.rows) {
    assert.deepEqual(Object.keys(row), ROW_KEYS,
      "a row does not carry the ungated Row schema key set and order");
    assert.equal(row.accessLevel, "EDITOR");
    assert.equal(row.locked, false);
    assert.equal(row.lockedForUser, false);
    assert.equal(row.version, sheet.version, "a row's version is not the sheet's version");
  }
});

test("OPS-17 T-S6: no plannerTask property and no sheet column carries a definition of done", () => {
  const { tasks, sheet, files } = fixture();
  for (const task of tasks.value) {
    assert.deepEqual(Object.keys(task), PLANNER_TASK_KEYS,
      "a task carries a property set the reference does not");
  }
  assert.deepEqual(sheet.columns.map((c) => c.title), COLUMN_TITLES,
    "the sheet's columns are not the published eight");
  for (const title of sheet.columns.map((c) => c.title)) {
    assert.doesNotMatch(title, /definition|done|note|description|comment/i,
      `the sheet carries a "${title}" column`);
  }
  for (const key of PLANNER_TASK_KEYS) {
    assert.doesNotMatch(key, /definition|done/i, `a plannerTask property is named "${key}"`);
  }
  // A list response never carries the details relationship, so nine descriptions
  // sit behind a separate call and are present here only as a boolean.
  const plannerBytes = fileByPath(files, "planner-tasks.json").content;
  assert.doesNotMatch(plannerBytes, /"details"/, "a details object reached the tasks payload");
});

test("OPS-17: every UUID-shaped id in the payloads is RFC 4122 version 4 in shape", () => {
  const { files } = fixture();
  for (const file of files) {
    for (const uuid of file.content.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g) ?? []) {
      assert.equal(uuid[14], "4", `${uuid} in ${file.path} does not carry a version 4 nibble`);
      assert.ok("89ab".includes(uuid[19]), `${uuid} in ${file.path} does not carry an RFC 4122 variant nibble`);
    }
  }
});

test("OPS-17: the directory is the default user property set, and every task sits in a published bucket", () => {
  const { directory, buckets, tasks } = fixture();
  for (const user of directory.value) {
    assert.deepEqual(Object.keys(user), DIRECTORY_USER_KEYS);
    assert.deepEqual(user.businessPhones, []);
    assert.equal(user.mobilePhone, null);
  }
  assert.deepEqual(buckets.value.map((b) => b.name).sort(), BUCKETS.slice().sort());
  for (const bucket of buckets.value) {
    assert.deepEqual(Object.keys(bucket), BUCKET_KEYS,
      "a bucket does not carry the list-buckets example's key set and order");
    assert.match(bucket["@odata.etag"], /^W\/"Jz[A-Za-z0-9\-_]{28}Jyc="$/,
      "a bucket's @odata.etag is not the documented weak-etag form");
  }
  const planIds = new Set([...tasks.value.map((t) => t.planId), ...buckets.value.map((b) => b.planId)]);
  assert.equal(planIds.size, 1, "the fixture describes more than one plan");
  const hints = tasks.value.map((t) => t.orderHint);
  assert.deepEqual(hints, hints.slice().sort(), "the tasks are not in orderHint order");
});

// ------------------------------------------------------------------ the rules

test("OPS-17 T-S1: the title head token and the Task ID cell are a bijection over fourteen", () => {
  const { tasks, sheet } = fixture();
  const byId = columnIndex(sheet);
  const codes = tasks.value.map((t) => headToken(t.title));
  const ids = sheet.rows.map((r) => cellOf(r, byId, "Task ID").value);
  assert.equal(new Set(codes).size, TARGET_TASKS, "a title head token repeats");
  assert.equal(new Set(ids).size, TARGET_TASKS, "a Task ID repeats");
  assert.deepEqual(codes.slice().sort(), ids.slice().sort(), "the two sides describe different tasks");
  assert.deepEqual(
    ids.slice().sort(),
    Array.from({ length: TARGET_TASKS }, (_, i) => `${TASK_PREFIX}-${FIRST_TASK + i}`).sort(),
    "the task code sequence has a hole in it"
  );
  for (const { task, row, code, byId: index } of joined()) {
    const name = cellOf(row, index, "Task Name").value;
    assert.equal(task.title, `${code} ${name}`, `${code}: the title is not its code plus the Task Name cell`);
    assert.doesNotMatch(name, new RegExp(`${TASK_PREFIX}-\\d`), `${code}: the Task Name cell repeats the code`);
  }
  assert.equal(sheet.totalRowCount, TARGET_TASKS);
  assert.equal(sheet.rows.length, TARGET_TASKS);
  assert.deepEqual(sheet.rows.map((r) => r.rowNumber), Array.from({ length: TARGET_TASKS }, (_, i) => i + 1));
});

test("OPS-17 T-S2: percentComplete is the only state, and the sheet carries it as the same fraction", () => {
  const counts = {};
  for (const { task, row, code, byId } of joined()) {
    assert.ok(Object.hasOwn(PERCENT_CENSUS, task.percentComplete),
      `${code} carries percentComplete ${task.percentComplete}`);
    counts[task.percentComplete] = (counts[task.percentComplete] ?? 0) + 1;
    const cell = cellOf(row, byId, "% Complete");
    assert.equal(typeof cell.value, "number", `${code}: the % Complete cell is not a number`);
    assert.equal(cell.value, task.percentComplete / 100, `${code}: the fraction is not the integer over 100`);
    assert.equal(cell.displayValue, `${cell.value * 100}%`, `${code}: the displayValue is not that fraction as a whole percent`);
    const complete = task.percentComplete === 100;
    assert.equal(task.completedDateTime !== null, complete, `${code}: completedDateTime does not follow the state`);
    assert.equal(task.completedBy !== null, complete, `${code}: completedBy does not follow the state`);
  }
  for (const [value, expected] of Object.entries(PERCENT_CENSUS)) {
    assert.equal(counts[value] ?? 0, expected, `${counts[value] ?? 0} tasks sit at ${value} percent, expected ${expected}`);
  }
  // No status string anywhere on either side: state is the integer and nothing else.
  const { sheet } = fixture();
  for (const column of sheet.columns) {
    assert.doesNotMatch(column.title, /status|state/i, `the sheet carries a "${column.title}" column`);
  }
});

test("OPS-17 T-S3: every task's band equals its Priority cell, and exactly two integers are ones Planner never writes", () => {
  const counts = {};
  for (const { task, row, code, byId } of joined()) {
    const band = bandOf(task.priority);
    counts[band] = (counts[band] ?? 0) + 1;
    assert.equal(cellOf(row, byId, "Priority").value, band, `${code}: the band and the Priority cell disagree`);
  }
  for (const [band, expected] of Object.entries(BAND_CENSUS)) {
    assert.equal(counts[band] ?? 0, expected, `${counts[band] ?? 0} tasks band as ${band}, expected ${expected}`);
  }
  const { tasks, sheet } = fixture();
  const offNominal = tasks.value.filter((t) => !PLANNER_WRITTEN_PRIORITIES.includes(t.priority));
  assert.equal(offNominal.length, OFF_NOMINAL_PRIORITIES,
    "the count of priorities Planner itself never writes moved");
  assert.equal(new Set(offNominal.map((t) => t.priority)).size, offNominal.length,
    "the off-nominal priorities repeat, so the two are not distinguishable");
  for (const task of offNominal) {
    assert.ok(task.priority >= 0 && task.priority <= 10, "an off-nominal priority sits outside the published range");
    assert.ok(BANDS.some((b) => b.name === bandOf(task.priority)), "an off-nominal priority does not band");
  }
  const picklist = sheet.columns.find((c) => c.title === "Priority");
  assert.deepEqual(picklist.options, BANDS.map((b) => b.name), "the Priority picklist is not the published bands");
  assert.equal(picklist.type, "PICKLIST");
});

test("OPS-17 T-S4: the bucket named by bucketId is the Workstream cell", () => {
  const { buckets, sheet } = fixture();
  const bucketById = new Map(buckets.value.map((b) => [b.id, b.name]));
  const seen = new Set();
  for (const { task, row, code, byId } of joined()) {
    const name = bucketById.get(task.bucketId);
    assert.ok(name, `${code} sits in a bucket the buckets payload does not carry`);
    assert.equal(cellOf(row, byId, "Workstream").value, name, `${code}: the bucket and the Workstream cell disagree`);
    seen.add(name);
  }
  assert.equal(seen.size, BUCKETS.length, "a workstream carries no task, so the bucket decides nothing");
  const picklist = sheet.columns.find((c) => c.title === "Workstream");
  assert.deepEqual(picklist.options.slice().sort(), BUCKETS.slice().sort());
});

test("OPS-17 T-S5 and T-P3: the three owner classes, and the one GUID the directory cannot resolve", () => {
  const { directory } = fixture();
  const userById = new Map(directory.value.map((u) => [u.id, u]));
  const census = { resolved: 0, unassigned: 0, unresolvable: 0 };

  for (const { task, row, code, byId } of joined()) {
    const guids = Object.keys(task.assignments);
    assert.ok(guids.length <= 1, `${code} carries ${guids.length} assignments`);
    const owner = cellOf(row, byId, "Owner");

    if (guids.length === 0) {
      assert.equal(owner, undefined, `${code} has no assignment and still carries an Owner cell`);
      assert.equal(row.cells.length, COLUMN_TITLES.length - 1,
        `${code} has no assignment and its row still carries a cell per column`);
      census.unassigned += 1;
      continue;
    }

    const assignment = task.assignments[guids[0]];
    assert.equal(assignment["@odata.type"], "#microsoft.graph.plannerAssignment");
    assert.deepEqual(Object.keys(assignment), ["@odata.type", "assignedBy", "assignedDateTime", "orderHint"]);
    assert.ok(owner, `${code} carries an assignment and its row has no Owner cell`);
    assert.equal(row.cells.length, COLUMN_TITLES.length, `${code} carries an assignment and its row is short a cell`);

    const user = userById.get(guids[0]);
    if (user) {
      assert.equal(user.mail, owner.value, `${code}: the GUID and the Owner cell name different people`);
      assert.equal(user.displayName, owner.displayValue, `${code}: the directory and the Owner cell disagree about a name`);
      census.resolved += 1;
      continue;
    }

    // The GUID resolves through no directory entry. The sheet is what names the
    // person, and the roster says that person has left.
    const person = rosterByEmail.get(owner.value);
    assert.ok(person, `${code}: the Owner cell names an email the roster does not carry`);
    assert.notEqual(person.employment_status, "active",
      `${code}: an unresolvable GUID names an active row, which the directory should carry`);
    assert.equal(person.employee_id, departedRow().employee_id,
      `${code}: the unresolvable assignment is not the row the rule names`);
    assert.equal(person.department, DEPARTED_DEPARTMENT);
    assert.equal(owner.displayValue, `${person.first_name} ${person.last_name}`);
    census.unresolvable += 1;
  }
  assert.deepEqual(census, ASSIGNMENT_CENSUS, "the owner censuses moved");
});

test("OPS-17 T-S7: every cell resolves to a column, once, and the column index has no gap", () => {
  const { sheet } = fixture();
  const ids = sheet.columns.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, "a column id repeats");
  assert.deepEqual(sheet.columns.map((c) => c.index), sheet.columns.map((_, i) => i));
  assert.deepEqual(sheet.columns.map((c) => c.primary === true), sheet.columns.map((_, i) => i === 0));
  for (const [index, column] of sheet.columns.entries()) {
    assert.equal("primary" in column, index === 0,
      "primary is present on a column that is not the sheet's primary column");
  }
  const known = new Set(ids);
  const byId = columnIndex(sheet);
  for (const row of sheet.rows) {
    const seen = new Set();
    for (const cell of row.cells) {
      assert.ok(known.has(cell.columnId), `row ${row.rowNumber} names columnId ${cell.columnId}, which the sheet does not carry`);
      assert.ok(!seen.has(cell.columnId), `row ${row.rowNumber} carries two cells for one column`);
      seen.add(cell.columnId);
      const expectedKeys = DATE_COLUMNS.includes(byId.get(cell.columnId))
        ? ["columnId", "value"]
        : ["columnId", "value", "displayValue"];
      assert.deepEqual(Object.keys(cell), expectedKeys,
        `a ${byId.get(cell.columnId)} cell carries ${Object.keys(cell).join(",")}, not ${expectedKeys.join(",")}`);
    }
    assert.ok(row.cells.length <= COLUMN_TITLES.length);
  }
  const rowIds = sheet.rows.map((r) => r.id);
  assert.equal(new Set(rowIds).size, rowIds.length, "a row id repeats");
  // A cell carries no column title, so a reader has to build the lookup first.
  for (const row of sheet.rows) {
    for (const cell of row.cells) {
      assert.ok(!Object.hasOwn(cell, "title"), "a cell carries its column title");
    }
  }
});

test("OPS-17 T-S8: value and displayValue differ on two columns, agree on four more, and the two DATE columns carry no displayValue at all", () => {
  const { sheet } = fixture();
  const byId = columnIndex(sheet);
  const differing = new Set();
  const agreeing = new Set();
  const dateOnly = new Set();
  for (const row of sheet.rows) {
    for (const cell of row.cells) {
      const title = byId.get(cell.columnId);
      if (DATE_COLUMNS.includes(title)) {
        assert.deepEqual(Object.keys(cell), ["columnId", "value"],
          `the ${title} cell of row ${row.rowNumber} carries a displayValue, which the reference never returns for DATE`);
        dateOnly.add(title);
        continue;
      }
      (cell.value !== cell.displayValue ? differing : agreeing).add(title);
    }
  }
  assert.deepEqual([...differing].sort(), SPLIT_COLUMNS.slice().sort(),
    "the set of columns whose two readings differ moved");
  assert.deepEqual(
    [...agreeing].sort(),
    COLUMN_TITLES.filter((t) => !SPLIT_COLUMNS.includes(t) && !DATE_COLUMNS.includes(t)).sort(),
    "a column carries both kinds of cell, so the choice is no longer per column"
  );
  assert.deepEqual([...dateOnly].sort(), DATE_COLUMNS.slice().sort(),
    "the set of DATE columns carrying no displayValue moved");
  assert.equal(differing.size, 2);
});

test("OPS-17 T-S9: the two sides agree on every date, and Owner is the only cell a row can lack", () => {
  for (const { task, row, code, byId } of joined()) {
    const due = cellOf(row, byId, "Due Date");
    assert.equal(task.dueDateTime.slice(0, 10), due.value, `${code}: the two sides disagree about the due date`);
    assert.ok(!Object.hasOwn(due, "displayValue"), `${code}: the Due Date cell carries a displayValue, which a DATE cell never has`);
    assert.ok(due.value >= DUE_WINDOW.start && due.value <= DUE_WINDOW.end, `${code} is due outside the program window`);

    const start = cellOf(row, byId, "Start Date");
    assert.ok(start, `${code} has no Start Date cell, and Start Date is never the missing cell`);
    assert.ok(!Object.hasOwn(start, "displayValue"), `${code}: the Start Date cell carries a displayValue, which a DATE cell never has`);
    if (task.startDateTime !== null) {
      assert.equal(task.startDateTime.slice(0, 10), start.value, `${code}: the two sides disagree about the start date`);
    }
    // A task nobody has started carries no Planner start date, and the sheet
    // still carries the planned one.
    assert.equal(task.startDateTime === null, task.percentComplete === 0,
      `${code}: the start date and the state disagree`);

    const created = task.createdDateTime.slice(0, 10);
    assert.ok(created >= CREATED_WINDOW.start && created <= CREATED_WINDOW.end,
      `${code} was created outside the program window`);
    assert.ok(row.createdAt <= row.modifiedAt, `${code}: its row was modified before it was created`);
  }
});

test("OPS-17 T-S10: every directory account is an active CORE-04 row of a team that staffs the program", () => {
  const { directory, tasks } = fixture();
  for (const user of directory.value) {
    const person = rosterByEmail.get(user.mail);
    assert.ok(person, `the directory carries ${user.mail}, which the roster does not`);
    assert.equal(person.employment_status, "active", "the directory carries a departed account");
    assert.ok(STAFFING_DEPARTMENTS.includes(person.department),
      `the directory carries a ${person.department} row, and that team does not staff the program`);
    assert.notEqual(person.level, "Executive", "an executive is on the delivery team");
    assert.equal(user.displayName, `${person.first_name} ${person.last_name}`);
    assert.equal(user.givenName, person.first_name);
    assert.equal(user.surname, person.last_name);
    assert.equal(user.jobTitle, person.role_title);
    assert.equal(user.userPrincipalName, person.email);
  }
  for (const department of STAFFING_DEPARTMENTS) {
    const staffed = directory.value.filter((u) => rosterByEmail.get(u.mail).department === department);
    assert.equal(staffed.length, 3, `${department} contributes ${staffed.length} people, expected 3`);
  }
  // Every account owns something, and the one GUID outside the directory is the
  // only assignment that resolves nowhere.
  const owning = new Set(tasks.value.flatMap((t) => Object.keys(t.assignments)));
  const known = new Set(directory.value.map((u) => u.id));
  assert.equal([...known].filter((g) => owning.has(g)).length, known.size, "a directory account owns nothing");
  assert.equal([...owning].filter((g) => !known.has(g)).length, 1, "the count of unresolvable GUIDs moved");
  // createdBy and every assignedBy is one account inside the directory.
  const creators = new Set(tasks.value.map((t) => t.createdBy.user.id));
  assert.equal(creators.size, 1, "the plan has more than one creator of record");
  assert.ok(known.has([...creators][0]), "the creator of record is not in the directory");
  for (const task of tasks.value) {
    for (const assignment of Object.values(task.assignments)) {
      assert.equal(assignment.assignedBy.user.id, [...creators][0], "an assignment was made by someone else");
    }
  }
});

test("OPS-17 T-S11: every recorded instant is on or before the capture instant", () => {
  const { tasks, sheet } = fixture();
  const stamps = [];
  for (const task of tasks.value) {
    stamps.push(task.createdDateTime);
    if (task.startDateTime !== null) stamps.push(task.startDateTime);
    if (task.completedDateTime !== null) stamps.push(task.completedDateTime);
    for (const assignment of Object.values(task.assignments)) stamps.push(assignment.assignedDateTime);
  }
  stamps.push(sheet.createdAt, sheet.modifiedAt);
  for (const row of sheet.rows) stamps.push(row.createdAt, row.modifiedAt);
  for (const stamp of stamps) {
    assert.match(stamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/, `${stamp} is not an ISO UTC instant`);
    assert.ok(stamp.slice(0, 19) <= CAPTURED_AT.slice(0, 19), `${stamp} is after the capture instant`);
  }
});

test("OPS-17: the description and checklist censuses, both carried as counts rather than content", () => {
  const { tasks } = fixture();
  const described = tasks.value.filter((t) => t.hasDescription === true);
  assert.equal(described.length, DESCRIBED_TASKS, "the count of tasks with a description moved");
  const checklisted = tasks.value.filter((t) => t.checklistItemCount > 0);
  assert.equal(checklisted.length, CHECKLISTED_TASKS, "the count of tasks with a checklist moved");
  for (const task of tasks.value) {
    assert.ok(task.activeChecklistItemCount <= task.checklistItemCount,
      "a task has more active checklist items than checklist items");
    assert.ok(task.checklistItemCount >= 0 && Number.isInteger(task.checklistItemCount));
    assert.deepEqual(task.appliedCategories, {});
    assert.equal(task.previewType, "automatic");
    assert.equal(task.referenceCount, 0);
    assert.equal(task.conversationThreadId, null);
  }
});

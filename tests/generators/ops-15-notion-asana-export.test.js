// OPS-15 work-management-platform-export: the two exports module 9 normalizes,
// one Notion data source query and one Asana project task list over the same
// twelve tasks.
//
// Every rule is re-derived here from the emitted bytes, with this file's own
// constants retyped rather than imported, so the spec sentence, the generator
// and this file can disagree in front of each other. People are resolved
// against the committed CORE-04 roster read off disk, not against a list the
// generator exports.
//
// Shapes, never instances: no test below names which task's definition of done
// is empty, which page has no owner, or which assignee gid resolves nowhere.
// Each is located by its rule.
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
const spec = specs.byId.get("OPS-15");

// Retyped, not imported.
const FILES = ["notion-data-source-query.json", "asana-project-tasks.json", "capture-log.json"];
const TARGET_TASKS = 12;
const FIRST_NUMBER = 201;
const TASK_PREFIX = "DDR";
const CAPTURED_AT = "2026-03-26T17:05:00Z";
const CREATED_WINDOW = { start: "2026-02-18", end: "2026-03-23" };
const DUE_WINDOW = { start: "2026-03-30", end: "2026-05-15" };
const NOTION_VERSION = "2025-09-03";
const WORKSTREAMS = ["Content", "Platform", "Launch"];
const SECTIONS = ["To do", "In progress", "Done"];
const STATE_CENSUS = { "Not started": 3, "In progress": 5, Blocked: 2, Done: 2 };
const STATE_TO_SECTION = {
  "Not started": "To do",
  "In progress": "In progress",
  Blocked: "In progress",
  Done: "Done",
};
const PROPERTY_TYPES = {
  Task: "title",
  ID: "unique_id",
  Owner: "people",
  State: "status",
  Workstream: "select",
  "Definition of done": "rich_text",
  Due: "date",
  "Asana task": "url",
};
const ARRAY_TYPES = ["title", "rich_text", "people"];
const OBJECT_TYPES = ["unique_id", "status", "select", "date"];
const CUSTOM_FIELD_NAMES = ["Task ID", "Definition of done", "Workstream"];
const TEAM_SIZE = 6;
const OWNED_PAGES = 11;
const EMPTY_OWNER_PAGES = 1;
const EMPTY_DEFINITION_PAGES = 1;
const MULTI_RUN_DEFINITIONS = 2;
const STAFFING_DEPARTMENTS = ["Product", "Engineering"];

/** CORE-04's committed bytes, read off disk rather than regenerated. */
const roster = csvTable(
  readFileSync(join(REPO_ROOT, "datasets", "core", "people-roster", "people-roster.csv"), "utf8")
).rows;
const rosterByEmail = new Map(roster.map((r) => [r.email, r]));

let cached = null;
function fixture() {
  if (cached) return cached;
  assert.ok(spec, "OPS-15 not found in specs/artifact-specs.yaml");
  const files = generateArtifact(spec, canon);
  const read = (path) => JSON.parse(fileByPath(files, path).content);
  cached = {
    files,
    query: read("notion-data-source-query.json"),
    asana: read("asana-project-tasks.json"),
    captureLog: read("capture-log.json"),
  };
  return cached;
}

function customField(task, name) {
  const field = task.custom_fields.find((f) => f.name === name);
  assert.ok(field, `a task carries no "${name}" custom field`);
  return field;
}

function code(page) {
  const uid = page.properties.ID.unique_id;
  return `${uid.prefix}-${uid.number}`;
}

function plainText(runs) {
  return runs.map((r) => r.plain_text).join("");
}

/** Every (page, task) pair, joined by the rule and asserted complete. */
function joined() {
  const { query, asana } = fixture();
  const taskByCode = new Map(asana.data.map((t) => [customField(t, "Task ID").display_value, t]));
  return query.results.map((page) => {
    const task = taskByCode.get(code(page));
    assert.ok(task, `the page ${code(page)} matches no Asana task`);
    return { page, task, code: code(page) };
  });
}

// ------------------------------------------------------------------ the shape

test("OPS-15: three files, two of them the body of one documented call, named by the capture log", () => {
  const { files, captureLog } = fixture();
  assert.deepEqual(files.map((f) => f.path).sort(), FILES.slice().sort());
  for (const file of files) {
    assert.ok(file.content.endsWith("}\n"), `${file.path} is not pretty-printed JSON with a trailing newline`);
  }
  assert.equal(captureLog.captured_at, CAPTURED_AT);
  assert.equal(captureLog.company, "co-002");
  assert.deepEqual(
    captureLog.captures.map((c) => c.response_file).sort(),
    FILES.filter((f) => f !== "capture-log.json").sort(),
    "the capture log does not name one call per payload file"
  );
});

test("OPS-15: the capture log records the Notion version and the opt_fields string that omits assignee.name", () => {
  const { captureLog } = fixture();
  const notion = captureLog.captures.find((c) => c.response_file === "notion-data-source-query.json");
  assert.equal(notion.method, "POST");
  assert.match(notion.url, /\/v1\/data_sources\/[0-9a-f-]{36}\/query$/);
  assert.equal(notion.headers["Notion-Version"], NOTION_VERSION,
    "the capture log does not record the version whose response shape this payload has");

  const asana = captureLog.captures.find((c) => c.response_file === "asana-project-tasks.json");
  assert.equal(asana.method, "GET");
  const optFields = asana.query.opt_fields.split(",");
  assert.ok(optFields.includes("assignee"), "the opt_fields string does not name assignee");
  assert.ok(!optFields.includes("assignee.name"),
    "the opt_fields string names assignee.name, so the one unresolvable assignee is not diagnosable");
  for (const field of ["name", "completed", "due_on", "permalink_url", "custom_fields"]) {
    assert.ok(optFields.includes(field), `the opt_fields string does not name ${field}, which the payload carries`);
  }
  assert.ok(asana.query.limit, "the capture log records no limit, so next_page would be absent rather than null");
});

test("OPS-15: both envelopes are the documented list responses over twelve records", () => {
  const { query, asana } = fixture();
  assert.deepEqual(Object.keys(query),
    ["object", "results", "next_cursor", "has_more", "type", "page_or_data_source", "request_id"]);
  assert.equal(query.object, "list");
  assert.equal(query.type, "page_or_data_source");
  assert.equal(query.has_more, false);
  assert.equal(query.next_cursor, null);
  assert.equal(query.results.length, TARGET_TASKS);

  assert.deepEqual(Object.keys(asana), ["data", "next_page"]);
  assert.equal(asana.next_page, null);
  assert.equal(asana.data.length, TARGET_TASKS);
});

test("OPS-15: every UUID-shaped id in the payloads is RFC 4122 version 4 in shape", () => {
  const { files } = fixture();
  for (const file of files) {
    for (const uuid of file.content.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g) ?? []) {
      assert.equal(uuid[14], "4", `${uuid} in ${file.path} does not carry a version 4 nibble`);
      assert.ok("89ab".includes(uuid[19]), `${uuid} in ${file.path} does not carry an RFC 4122 variant nibble`);
    }
  }
});

test("OPS-15 T-N6: properties are keyed by display name, and arrays and single objects are not interchangeable", () => {
  const { query, asana } = fixture();
  const names = Object.keys(PROPERTY_TYPES);
  for (const page of query.results) {
    assert.deepEqual(Object.keys(page),
      ["object", "id", "created_time", "last_edited_time", "created_by", "last_edited_by",
        "cover", "icon", "parent", "archived", "in_trash", "properties", "url", "public_url"]);
    assert.equal(page.object, "page");
    assert.equal(page.archived, false);
    assert.equal(page.in_trash, false);
    assert.equal(page.parent.type, "data_source_id");
    assert.ok(page.parent.data_source_id && page.parent.database_id,
      "a page's parent does not carry both the data source and the database id");
    assert.deepEqual(Object.keys(page.properties), names,
      "a page carries a property set the plan does not");
    for (const [name, type] of Object.entries(PROPERTY_TYPES)) {
      const value = page.properties[name];
      assert.equal(value.type, type, `the "${name}" property is a ${value.type}`);
      const inner = value[type];
      if (ARRAY_TYPES.includes(type)) {
        assert.ok(Array.isArray(inner), `the "${name}" property is not an array`);
      }
      if (OBJECT_TYPES.includes(type)) {
        assert.ok(inner !== null && typeof inner === "object" && !Array.isArray(inner),
          `the "${name}" property is not a single object`);
      }
    }
    assert.equal(typeof page.properties["Asana task"].url, "string");
    for (const run of page.properties.Task.title) {
      assert.deepEqual(Object.keys(run), ["type", "text", "annotations", "plain_text", "href"]);
      assert.equal(run.text.content, run.plain_text, "a run's content and plain_text disagree");
    }
  }

  for (const task of asana.data) {
    for (const gid of collectGids(task)) {
      assert.equal(typeof gid, "string", "a gid is not a string");
      assert.match(gid, /^\d+$/, `the gid "${gid}" is not a string of digits`);
    }
    assert.ok(Array.isArray(task.custom_fields), "custom_fields is not an array");
    assert.ok(Array.isArray(task.memberships), "memberships is not an array");
    assert.deepEqual(task.custom_fields.map((f) => f.name), CUSTOM_FIELD_NAMES,
      "a task carries a custom field set the plan does not");
    assert.equal(task.resource_type, "task");
    assert.equal(task.resource_subtype, "default_task");
    for (const field of task.custom_fields) {
      assert.equal(field.resource_type, "custom_field");
      assert.equal(field.enabled, true);
      assert.equal(field.is_formula_field, false);
      assert.ok(Object.hasOwn(field, "display_value"), "a custom field carries no display_value");
    }
  }
});

// ------------------------------------------------------------------ the rules

test("OPS-15 T-N1: the Notion unique_id and the Asana Task ID field are a bijection over twelve", () => {
  const { query, asana } = fixture();
  const codes = query.results.map(code);
  const fieldCodes = asana.data.map((t) => customField(t, "Task ID").display_value);
  assert.equal(new Set(codes).size, TARGET_TASKS, "a Notion code repeats");
  assert.equal(new Set(fieldCodes).size, TARGET_TASKS, "an Asana Task ID repeats");
  assert.deepEqual(codes.slice().sort(), fieldCodes.slice().sort(), "the two tools describe different tasks");
  assert.deepEqual(
    codes.slice().sort(),
    Array.from({ length: TARGET_TASKS }, (_, i) => `${TASK_PREFIX}-${FIRST_NUMBER + i}`).sort(),
    "the task code sequence has a hole in it"
  );
  for (const { page, task, code: taskCode } of joined()) {
    assert.equal(page.properties.ID.unique_id.prefix, TASK_PREFIX);
    assert.equal(typeof page.properties.ID.unique_id.number, "number");
    assert.equal(plainText(page.properties.Task.title), task.name, `${taskCode}: the two tools disagree about the name`);
    assert.equal(page.properties["Asana task"].url, task.permalink_url,
      `${taskCode}: the page's Asana url is not that task's permalink`);
    assert.equal(customField(task, "Task ID").text_value, taskCode);
    assert.doesNotMatch(task.name, new RegExp(`${TASK_PREFIX}-\\d`), `${taskCode}: the name repeats the code`);
  }
});

test("OPS-15 T-N2: one definition of done is present and empty on both sides, and two are more than one run", () => {
  let empty = 0;
  let multiRun = 0;
  for (const { page, task, code: taskCode } of joined()) {
    const runs = page.properties["Definition of done"].rich_text;
    const field = customField(task, "Definition of done");
    assert.ok(Object.hasOwn(page.properties, "Definition of done"),
      `${taskCode}: the property is missing rather than empty`);

    if (runs.length === 0) {
      assert.equal(field.display_value, null, `${taskCode}: empty in one tool and populated in the other`);
      assert.equal(field.text_value, null, `${taskCode}: empty in one tool and populated in the other`);
      empty += 1;
      continue;
    }
    const joinedText = plainText(runs);
    assert.equal(field.display_value, joinedText, `${taskCode}: the runs and the display_value disagree`);
    assert.equal(field.text_value, joinedText, `${taskCode}: the runs and the text_value disagree`);
    assert.ok(joinedText.trim().length > 0, `${taskCode}: the definition is whitespace`);
    if (runs.length > 1) {
      multiRun += 1;
      assert.equal(runs.filter((r) => r.annotations.bold === true).length, 1,
        `${taskCode}: a split definition does not carry exactly one bold run`);
      // A reader taking only the first run truncates this one.
      assert.notEqual(runs[0].plain_text, joinedText, `${taskCode}: the first run is the whole definition`);
    }
  }
  assert.equal(empty, EMPTY_DEFINITION_PAGES, "the count of empty definitions of done moved");
  assert.equal(multiRun, MULTI_RUN_DEFINITIONS, "the count of definitions carried as more than one run moved");
});

test("OPS-15 T-N3: every assignee is a bare gid, the gid to person map is a function, and one gid resolves nowhere", () => {
  const gidToEmail = new Map();
  const tasksPerGid = new Map();
  const resolvedPerGid = new Map();

  for (const { page, task, code: taskCode } of joined()) {
    assert.deepEqual(Object.keys(task.assignee), ["gid", "resource_type"],
      `${taskCode}: the assignee carries more than a gid, so the opt_fields omission is not in force`);
    assert.equal(task.assignee.resource_type, "user");
    tasksPerGid.set(task.assignee.gid, (tasksPerGid.get(task.assignee.gid) ?? 0) + 1);

    const owners = page.properties.Owner.people;
    assert.ok(owners.length <= 1, `${taskCode}: the page carries more than one owner`);
    if (owners.length === 0) continue;
    const email = owners[0].person.email;
    if (gidToEmail.has(task.assignee.gid)) {
      assert.equal(gidToEmail.get(task.assignee.gid), email,
        `${taskCode}: one assignee gid sits opposite two people`);
    }
    gidToEmail.set(task.assignee.gid, email);
    resolvedPerGid.set(task.assignee.gid, (resolvedPerGid.get(task.assignee.gid) ?? 0) + 1);
  }

  const unresolvable = [...tasksPerGid.keys()].filter((g) => !resolvedPerGid.has(g));
  assert.equal(unresolvable.length, 1, "the count of assignee gids that resolve through no page moved");
  assert.equal(tasksPerGid.get(unresolvable[0]), 1,
    "the gid that resolves nowhere sits on more than one task");
  assert.equal(gidToEmail.size, TEAM_SIZE, "the count of gids that resolve to a person moved");
  for (const count of resolvedPerGid.values()) {
    assert.ok(count >= 1, "a gid resolves through no task with a populated owner");
  }
});

test("OPS-15 T-N4: four states over three sections, with the one state that has no counterpart parked in progress", () => {
  const { query, asana } = fixture();
  const counts = {};
  for (const page of query.results) {
    const state = page.properties.State.status.name;
    counts[state] = (counts[state] ?? 0) + 1;
  }
  assert.deepEqual(counts, STATE_CENSUS, "the state census moved");
  assert.deepEqual(
    [...new Set(asana.data.map((t) => t.memberships[0].section.name))].sort(),
    SECTIONS.slice().sort(),
    "the Asana sections are not the published three"
  );
  assert.equal(Object.keys(STATE_CENSUS).length - SECTIONS.length, 1,
    "the vocabularies are the same size, so no state is left without a counterpart");

  // The state whose section another state also uses is the one Asana's
  // vocabulary cannot express on its own.
  const statesBySection = {};
  for (const state of Object.keys(STATE_CENSUS)) {
    const section = STATE_TO_SECTION[state];
    statesBySection[section] = (statesBySection[section] ?? []).concat(state);
  }
  const shared = Object.values(statesBySection).filter((states) => states.length > 1);
  assert.equal(shared.length, 1, "more than one section receives two states");
  assert.equal(shared[0].length, 2, "a section receives more than two states");

  for (const { page, task, code: taskCode } of joined()) {
    const state = page.properties.State.status.name;
    const section = task.memberships[0].section.name;
    assert.equal(STATE_TO_SECTION[state], section, `${taskCode}: "${state}" does not sit in its mapped section`);
    assert.equal(task.completed, section === "Done", `${taskCode}: the completed flag and the section disagree`);
    assert.equal(task.completed_at !== null, task.completed,
      `${taskCode}: the completion instant and the completed flag disagree`);
    assert.equal(task.memberships.length, 1, `${taskCode}: the task sits in more than one project`);
    assert.ok(page.properties.State.status.name && page.properties.State.status.id,
      `${taskCode}: the status option carries no name or id`);
  }
});

test("OPS-15 T-N5: workstream and due date agree across every pair", () => {
  const seen = new Set();
  for (const { page, task, code: taskCode } of joined()) {
    const workstream = page.properties.Workstream.select.name;
    assert.ok(WORKSTREAMS.includes(workstream), `${taskCode} sits in workstream "${workstream}"`);
    const field = customField(task, "Workstream");
    assert.equal(field.display_value, workstream, `${taskCode}: the two tools disagree about the workstream`);
    assert.equal(field.enum_value.name, workstream, `${taskCode}: the enum option and the display_value disagree`);
    assert.deepEqual(field.enum_options.map((o) => o.name), WORKSTREAMS,
      `${taskCode}: the enum options are not the published workstreams`);
    seen.add(workstream);

    const due = page.properties.Due.date;
    assert.equal(due.start, task.due_on, `${taskCode}: the two tools disagree about the due date`);
    assert.equal(due.end, null);
    assert.equal(due.time_zone, null);
    assert.match(task.due_on, /^\d{4}-\d{2}-\d{2}$/, `${taskCode}: due_on is not a plain date`);
    assert.ok(task.due_on >= DUE_WINDOW.start && task.due_on <= DUE_WINDOW.end,
      `${taskCode} is due outside the program window`);
  }
  assert.equal(seen.size, WORKSTREAMS.length, "a workstream carries no task, so the property decides nothing");
});

test("OPS-15 T-N7: every owner is an active CORE-04 row from a team that staffs the program", () => {
  const { query } = fixture();
  const owned = query.results.filter((p) => p.properties.Owner.people.length === 1);
  const unowned = query.results.filter((p) => p.properties.Owner.people.length === 0);
  assert.equal(owned.length, OWNED_PAGES, "the count of pages carrying an owner moved");
  assert.equal(unowned.length, EMPTY_OWNER_PAGES, "the count of pages carrying no owner moved");

  const emails = new Set();
  for (const page of owned) {
    const user = page.properties.Owner.people[0];
    assert.deepEqual(Object.keys(user), ["object", "id", "name", "avatar_url", "type", "person"]);
    assert.equal(user.object, "user");
    assert.equal(user.type, "person");
    const person = rosterByEmail.get(user.person.email);
    assert.ok(person, `an owner carries ${user.person.email}, which the roster does not`);
    assert.equal(person.employment_status, "active", "a departed row owns a page");
    assert.ok(STAFFING_DEPARTMENTS.includes(person.department),
      `a ${person.department} row owns a page, and that team does not staff the program`);
    assert.notEqual(person.level, "Executive", "an executive is on the delivery team");
    assert.equal(user.name, `${person.first_name} ${person.last_name}`);
    emails.add(user.person.email);
  }
  assert.equal(emails.size, TEAM_SIZE, "the team does not own a page each");
  for (const department of STAFFING_DEPARTMENTS) {
    const staffed = [...emails].filter((e) => rosterByEmail.get(e).department === department);
    assert.equal(staffed.length, 3, `${department} contributes ${staffed.length} people, expected 3`);
  }

  // The editor of record is one user reference, the same on every page, and it
  // carries nothing but object and id.
  const editors = new Set(query.results.flatMap((p) => [p.created_by.id, p.last_edited_by.id]));
  assert.equal(editors.size, 1, "the pages disagree about who created and edited them");
  for (const page of query.results) {
    assert.deepEqual(Object.keys(page.created_by), ["object", "id"]);
    assert.deepEqual(Object.keys(page.last_edited_by), ["object", "id"]);
  }
});

test("OPS-15 T-N8: every recorded instant is on or before the capture instant", () => {
  const { query, asana } = fixture();
  const stamps = [];
  for (const page of query.results) stamps.push(page.created_time, page.last_edited_time);
  for (const task of asana.data) {
    stamps.push(task.created_at, task.modified_at);
    if (task.completed_at !== null) stamps.push(task.completed_at);
  }
  for (const stamp of stamps) {
    assert.match(stamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, `${stamp} is not an ISO UTC instant`);
    assert.ok(stamp.slice(0, 19) <= CAPTURED_AT.slice(0, 19), `${stamp} is after the capture instant`);
  }
  for (const { page, task, code: taskCode } of joined()) {
    assert.ok(page.created_time <= page.last_edited_time, `${taskCode}: the page was edited before it was created`);
    assert.ok(task.created_at <= task.modified_at, `${taskCode}: the task was modified before it was created`);
    const created = task.created_at.slice(0, 10);
    assert.ok(created >= CREATED_WINDOW.start && created <= CREATED_WINDOW.end,
      `${taskCode} was created outside the program window`);
    assert.equal(page.created_time.slice(0, 10), created,
      `${taskCode}: the two tools disagree about the day it was created`);
  }
});

test("OPS-15: the notes are plain program prose and carry no instruction to the reader", () => {
  const { asana } = fixture();
  for (const task of asana.data) {
    assert.equal(typeof task.notes, "string");
    assert.ok(task.notes.trim().length > 0, "a task carries an empty notes field");
    // The modules this fixture serves carry no evals, so no free text here
    // addresses whoever is reading the payload.
    assert.doesNotMatch(task.notes, /\b(ignore|disregard|instead of|you must|mark (it|this|the task) )/i,
      "a notes field addresses the reader");
  }
});

/** Every gid an Asana record carries, wherever it sits. This file's own scanner. */
function collectGids(node, out = []) {
  if (Array.isArray(node)) {
    for (const item of node) collectGids(item, out);
    return out;
  }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (key === "gid") out.push(value);
      else collectGids(value, out);
    }
  }
  return out;
}

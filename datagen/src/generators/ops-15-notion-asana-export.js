// OPS-15 work-management-platform-export: one small co-002 team's delivery
// program, the developer documentation relaunch, captured 2026-03-26 from the
// two tools that hold it. The roadmap lives in a Notion data source, the
// working task list in an Asana project, and both describe the same twelve
// tasks.
//
// Every payload file is the body of ONE documented API call, field for field as
// the vendor reference shows it:
//   notion-data-source-query.json  POST /v1/data_sources/{data_source_id}/query
//   asana-project-tasks.json       GET  /projects/{project_gid}/tasks
// capture-log.json is the only non-vendor file: the harness record of which
// call produced which file, including the Notion-Version header and the Asana
// opt_fields string verbatim. That string is the whole diagnosis of the one
// assignee this fixture cannot resolve, so it is recorded exactly as sent.
//
// Every person is an active CORE-04 row drawn through named rng streams. One
// drawn row contributes nothing but an Asana user gid: its name and email
// appear in no payload, which is what makes that assignee unresolvable from the
// fixture alone.
//
// The rules this fixture pins (each re-derived from the emitted bytes in
// tests/generators/ops-15-notion-asana-export.test.js, and each asserted here
// before the builder returns):
//   T-N1 the Notion unique_id and the Asana Task ID custom field are the same
//        twelve codes, a bijection; the page url is the task permalink.
//   T-N2 exactly one definition of done is present and empty on both sides;
//        exactly two are carried in Notion as more than one rich text run.
//   T-N3 every Asana assignee is a bare gid; the gid to person map is a
//        function, and exactly one gid resolves through no payload here.
//   T-N4 four Notion states over three Asana sections, with the one state that
//        has no counterpart parked in progress.
//   T-N5 workstream and due date agree across every pair.
//   T-N6 the shapes: name-keyed properties, arrays versus single objects,
//        every gid a string of digits.
//   T-N7 every owner is an active CORE-04 row of a staffing team.
//   T-N8 every recorded instant is on or before the capture instant.
import { addDays } from "../dates.js";
import { createRng, fnv1a } from "../seed.js";
import { buildRoster } from "./core-04-people-roster.js";

export const id = "OPS-15";

// ---------------------------------------------------------------- constants

export const PROGRAM = "developer documentation relaunch";
export const COMPANY = "co-002";
export const CAPTURED_AT = "2026-03-26T17:05:00Z";
export const TASK_PREFIX = "DDR";
const TASK_NUMBER_START = 201;
export const TARGET_TASKS = 12;

export const PROJECT_NAME = "Developer documentation relaunch";
export const WORKSTREAMS = ["Content", "Platform", "Launch"];
export const SECTIONS = ["To do", "In progress", "Done"];
export const STATES = ["Not started", "In progress", "Blocked", "Done"];
export const STATE_CENSUS = { "Not started": 3, "In progress": 5, Blocked: 2, Done: 2 };

/**
 * The state to section table. Blocked has no counterpart in the Asana
 * vocabulary, so the team parks blocked work in the In progress section.
 */
export const STATE_TO_SECTION = {
  "Not started": "To do",
  "In progress": "In progress",
  Blocked: "In progress",
  Done: "Done",
};

/** Which teams staff the program, and how many people each contributes. */
export const OWNER_DEPARTMENTS = ["Product", "Engineering"];
const OWNERS_PER_DEPARTMENT = 3;
export const TEAM_SIZE = OWNER_DEPARTMENTS.length * OWNERS_PER_DEPARTMENT;

export const OWNED_PAGES = 11;
export const EMPTY_OWNER_PAGES = 1;
export const EMPTY_DEFINITION_PAGES = 1;
export const MULTI_RUN_DEFINITIONS = 2;

export const WINDOW = { created_start: "2026-02-18", created_end: "2026-03-23" };
export const DUE_WINDOW = { start: "2026-03-30", end: "2026-05-15" };

export const NOTION_VERSION = "2025-09-03";

/** The opt_fields string the capture recorded, verbatim. It names `assignee`
 *  and not `assignee.name`, which is why every assignee comes back as a gid. */
export const OPT_FIELDS = [
  "name", "resource_subtype", "assignee", "completed", "completed_at", "due_on",
  "notes", "created_at", "modified_at", "permalink_url",
  "memberships.project.name", "memberships.section.name", "custom_fields",
].join(",");

/** The Notion property display names, in page order, with their value type. */
export const NOTION_PROPERTIES = [
  { name: "Task", type: "title" },
  { name: "ID", type: "unique_id" },
  { name: "Owner", type: "people" },
  { name: "State", type: "status" },
  { name: "Workstream", type: "select" },
  { name: "Definition of done", type: "rich_text" },
  { name: "Due", type: "date" },
  { name: "Asana task", type: "url" },
];

/** The property value types Notion returns as arrays, and as single objects. */
export const ARRAY_VALUE_TYPES = ["title", "rich_text", "people"];
export const OBJECT_VALUE_TYPES = ["status", "select", "date", "unique_id"];

/** The Asana custom fields, in the order the task record carries them. */
export const CUSTOM_FIELDS = [
  { name: "Task ID", type: "text" },
  { name: "Definition of done", type: "text" },
  { name: "Workstream", type: "enum" },
];

const STATUS_COLORS = { "Not started": "default", "In progress": "blue", Blocked: "red", Done: "green" };
const WORKSTREAM_COLORS = { Content: "orange", Platform: "purple", Launch: "blue" };

const NOTION_USER_SALT = "ops-15-notion-user";
const PROPERTY_ID_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** The neutral annotation set a plain Notion rich text run carries. */
const PLAIN_ANNOTATIONS = {
  bold: false, italic: false, strikethrough: false, underline: false, code: false, color: "default",
};

// ------------------------------------------------------------------- the work
//
// Tasks are listed in task-code order. Titles and definitions of done are
// written work rather than drawn: a roadmap is written by people, and a census
// is reviewable line by line only if the sentences are on the page.
//
// `owner` indexes the drawn team, or is null where the Notion page carries no
// owner at all and the Asana assignee is the drawn row this fixture never
// names. `definition` is a list of rich text runs, and an empty list is a
// definition of done that is present and empty on both sides.

const TASKS = [
  {
    sentence: "Audit the published developer docs and mark every page keep, rewrite or retire",
    workstream: "Content",
    state: "Done",
    owner: 0,
    definition: [{ text: "The audit sheet carries a disposition and a named owner for every published page.", bold: false }],
    notes: "The audit covers the published site only. Anything in the internal wiki is out of scope for this pass.",
    created: "2026-02-18",
    due: "2026-03-30",
    completed: "2026-03-17",
  },
  {
    sentence: "Agree the information architecture for the relaunched developer site",
    workstream: "Content",
    state: "In progress",
    owner: 1,
    definition: [{ text: "The agreed information architecture is written down and the navigation tree matches it.", bold: false }],
    notes: "Two navigation drafts are in the shared doc. The team picks one at the next working session.",
    created: "2026-02-18",
    due: "2026-04-03",
    completed: null,
  },
  {
    sentence: "Rewrite the getting started guide so a new integrator ships a first call in one sitting",
    workstream: "Content",
    state: "In progress",
    owner: 2,
    definition: [
      { text: "A new integrator follows the guide end to end and makes a first successful call without asking for help. ", bold: false },
      { text: "Reviewed by two people outside the docs team.", bold: true },
    ],
    notes: "The current guide assumes an existing workspace, which most new integrators do not have.",
    created: "2026-02-20",
    due: "2026-04-07",
    completed: null,
  },
  {
    sentence: "Bring the API reference back in line with the endpoints that actually shipped",
    workstream: "Content",
    state: "Blocked",
    owner: 3,
    definition: [{ text: "Every endpoint in the reference matches the shipped schema, and the reference build fails when it does not.", bold: false }],
    notes: "Three endpoints shipped after the last reference update and are missing from it entirely.",
    created: "2026-02-24",
    due: "2026-04-10",
    completed: null,
  },
  {
    sentence: "Write the authentication guide covering token issue, rotation and revocation",
    workstream: "Content",
    state: "Not started",
    owner: 4,
    definition: [{ text: "The guide covers issuing, rotating and revoking a token, and each flow is checked against the sandbox.", bold: false }],
    notes: "Rotation is the part support gets asked about most, so it needs its own worked example.",
    created: "2026-02-26",
    due: "2026-04-14",
    completed: null,
  },
  {
    sentence: "Stand up the docs build pipeline with a preview deploy on every change request",
    workstream: "Platform",
    state: "Done",
    owner: 5,
    definition: [{ text: "A change request produces a preview deploy that a reviewer can open from the request itself.", bold: false }],
    notes: "The pipeline runs on the same build image the platform team already maintains.",
    created: "2026-03-02",
    due: "2026-04-17",
    completed: "2026-03-23",
  },
  {
    sentence: "Move the docs source into the platform repository and wire up the ownership file",
    workstream: "Platform",
    state: "In progress",
    owner: 0,
    definition: [],
    notes: "The move has to keep the page history, so it is a repository move rather than a copy.",
    created: "2026-03-04",
    due: "2026-04-21",
    completed: null,
  },
  {
    sentence: "Add search across the whole developer site and check the common queries return something useful",
    workstream: "Platform",
    state: "In progress",
    owner: 1,
    definition: [
      { text: "Search returns a relevant page for each of the twenty most common queries. ", bold: true },
      { text: "Measured on the query log from the last full month.", bold: false },
    ],
    notes: "Search runs against the built site rather than the source, so it can ship after the rewrite lands.",
    created: "2026-03-09",
    due: "2026-04-24",
    completed: null,
  },
  {
    sentence: "Set up the broken link and sample code checks so a stale snippet fails the build",
    workstream: "Platform",
    state: "Blocked",
    owner: 2,
    definition: [{ text: "The link and sample checks run on every build and a stale snippet turns the build red.", bold: false }],
    notes: "The sample checks run the snippets against the sandbox, so they need a sandbox token in the build.",
    created: "2026-03-11",
    due: "2026-04-28",
    completed: null,
  },
  {
    sentence: "Agree the redirect map from every retired page to its replacement",
    workstream: "Launch",
    state: "Not started",
    owner: 3,
    definition: [{ text: "Every retired page resolves to a live replacement and no redirect chain is longer than one hop.", bold: false }],
    notes: "The redirect map is owned by the platform team once the relaunch is done.",
    created: "2026-03-16",
    due: "2026-05-05",
    completed: null,
  },
  {
    sentence: "Write the launch note for the relaunched developer site and line up the release entry",
    workstream: "Launch",
    state: "In progress",
    owner: null,
    definition: [{ text: "The launch note is approved and scheduled, and the release entry points at it.", bold: false }],
    notes: "The launch note goes out the morning after cutover, not before.",
    created: "2026-03-18",
    due: "2026-05-11",
    completed: null,
  },
  {
    sentence: "Run the post launch review two weeks after cutover and file what the docs still miss",
    workstream: "Launch",
    state: "Not started",
    owner: 4,
    definition: [{ text: "The review is written up and every gap it finds is filed as its own task.", bold: false }],
    notes: "The review looks at search queries that returned nothing and at support tickets raised against the docs.",
    created: "2026-03-23",
    due: "2026-05-15",
    completed: null,
  },
];

// ------------------------------------------------------------------ the people

/**
 * The six active CORE-04 rows the team is made of, plus one further active row
 * that contributes only an Asana user gid. Each department draws on its own
 * stream so the two groups do not share a correlated sequence.
 * @param {(stream: string) => import("../seed.js").Rng} rng
 */
export function pickTeam(rng) {
  const roster = buildRoster(createRng("CORE-04", "roster"));
  const team = [];
  const spare = [];
  for (const department of OWNER_DEPARTMENTS) {
    const eligible = roster
      .filter((r) => r.department === department && r.employment_status === "active" && r.level !== "Executive")
      .sort((a, b) => (a.employee_id < b.employee_id ? -1 : 1));
    if (eligible.length < OWNERS_PER_DEPARTMENT + 1) {
      throw new Error(`${id}: ${department} has only ${eligible.length} active people, and the program needs ${OWNERS_PER_DEPARTMENT + 1}`);
    }
    const drawn = rng(`people-${department.toLowerCase()}`).shuffle(eligible);
    team.push(...drawn.slice(0, OWNERS_PER_DEPARTMENT));
    spare.push(drawn[OWNERS_PER_DEPARTMENT]);
  }
  // The unnamed assignee: an active row whose name and email reach no payload.
  return { roster, team, unnamed: spare[spare.length - 1] };
}

// ----------------------------------------------------------------- id helpers

/** A digit string of `length` digits, the shape an Asana gid takes. */
function gid(stream, length = 16) {
  let out = String(stream.int(1, 9));
  for (let i = 1; i < length; i++) out += String(stream.int(0, 9));
  return out;
}

/** A UUID-shaped identifier drawn on a stream. */
function drawnUuid(stream) {
  let hex = "";
  for (let i = 0; i < 32; i++) hex += "0123456789abcdef"[stream.int(0, 15)];
  // Force the RFC 4122 version 4 nibbles before assembling: "4" at hex[12],
  // one of 8/9/a/b at hex[16], the variant drawn from the same stream.
  const variant = "89ab"[stream.int(0, 3)];
  hex = `${hex.slice(0, 12)}4${hex.slice(13, 16)}${variant}${hex.slice(17, 32)}`;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * A UUID-shaped Notion user id derived from a roster row, so the same person is
 * the same identity everywhere inside this fixture and a roster reroll moves
 * the identity with the row instead of stranding it.
 */
function derivedUuid(salt, employeeId) {
  let hex = "";
  // The varying chunk index leads the hashed string: FNV-1a folds the head of
  // its input through every later byte, so four chunks that differ only at the
  // tail would come back visibly correlated.
  for (let i = 0; i < 4; i++) hex += fnv1a(`${i}:${salt}:${employeeId}`).toString(16).padStart(8, "0");
  // Force the RFC 4122 version 4 nibbles before assembling: "4" at hex[12],
  // one of 8/9/a/b at hex[16], the variant drawn from the same hash (the same
  // treatment finding F16 gives derivedGuid, so every UUID-shaped id in this
  // fixture, not only the ones drawnUuid builds, is version 4 in shape).
  const variant = "89ab"[fnv1a(`variant:${salt}:${employeeId}`) % 4];
  hex = `${hex.slice(0, 12)}4${hex.slice(13, 16)}${variant}${hex.slice(17, 32)}`;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/** A short opaque Notion property id. */
function propertyId(stream) {
  let out = "";
  for (let i = 0; i < 4; i++) out += PROPERTY_ID_ALPHABET[stream.int(0, PROPERTY_ID_ALPHABET.length - 1)];
  return out;
}

/** A minute-precision instant, the shape both APIs return. */
function instant(date, stream) {
  const hh = String(stream.int(8, 18)).padStart(2, "0");
  const mm = String(stream.int(0, 59)).padStart(2, "0");
  return `${date}T${hh}:${mm}:00.000Z`;
}

/** The page slug Notion builds into a page url. */
function slug(sentence) {
  return sentence.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function textRun(content, bold) {
  return {
    type: "text",
    text: { content, link: null },
    annotations: bold ? { ...PLAIN_ANNOTATIONS, bold: true } : { ...PLAIN_ANNOTATIONS },
    plain_text: content,
    href: null,
  };
}

/** The runs of a definition of done, joined as the Asana text field carries it. */
function joinRuns(runs) {
  return runs.map((r) => r.plain_text).join("");
}

// ------------------------------------------------------------------- builder

/**
 * Build both payloads and the capture log. Pure: no I/O, no Date.now(), every
 * draw on a named stream, every census asserted before the object is returned.
 * @param {(stream: string) => import("../seed.js").Rng} rng
 */
export function buildExport(rng) {
  const { roster, team, unnamed } = pickTeam(rng);

  const notionStream = rng("notion-ids");
  const asanaStream = rng("asana-ids");
  const notionClock = rng("notion-clock");
  const asanaClock = rng("asana-clock");

  const dataSourceId = drawnUuid(notionStream);
  const databaseId = drawnUuid(notionStream);
  const requestId = drawnUuid(notionStream);
  const propertyIds = Object.fromEntries(
    NOTION_PROPERTIES.map((p) => [p.name, p.type === "title" ? "title" : propertyId(notionStream)])
  );
  const statusOptionIds = Object.fromEntries(STATES.map((s) => [s, drawnUuid(notionStream)]));
  const selectOptionIds = Object.fromEntries(WORKSTREAMS.map((w) => [w, drawnUuid(notionStream)]));

  const projectGid = gid(asanaStream);
  const sectionGids = Object.fromEntries(SECTIONS.map((s) => [s, gid(asanaStream)]));
  const customFieldGids = Object.fromEntries(CUSTOM_FIELDS.map((f) => [f.name, gid(asanaStream)]));
  const enumOptionGids = Object.fromEntries(WORKSTREAMS.map((w) => [w, gid(asanaStream)]));
  const enumOptions = WORKSTREAMS.map((name) => ({
    gid: enumOptionGids[name],
    resource_type: "enum_option",
    name,
    enabled: true,
    color: WORKSTREAM_COLORS[name],
  }));

  // The same person is one Notion user id and one Asana user gid throughout.
  const asanaUserGids = new Map();
  for (const person of [...team, unnamed]) asanaUserGids.set(person.employee_id, gid(asanaStream));
  if (new Set(asanaUserGids.values()).size !== asanaUserGids.size) {
    throw new Error(`${id}: two people drew the same Asana user gid`);
  }
  if (new Set(Object.values(propertyIds)).size !== NOTION_PROPERTIES.length) {
    throw new Error(`${id}: two properties drew the same Notion property id`);
  }

  // The editor of record: the Product row with the lowest employee id.
  const productRows = team
    .filter((p) => p.department === "Product")
    .sort((a, b) => (a.employee_id < b.employee_id ? -1 : 1));
  if (productRows.length === 0) throw new Error(`${id}: the team carries no Product row`);
  const editor = { object: "user", id: derivedUuid(NOTION_USER_SALT, productRows[0].employee_id) };

  const built = TASKS.map((task, index) => {
    const code = `${TASK_PREFIX}-${TASK_NUMBER_START + index}`;
    const number = TASK_NUMBER_START + index;
    const owner = task.owner === null ? null : team[task.owner];
    if (task.owner !== null && !owner) throw new Error(`${id}: ${code} names team slot ${task.owner}, which is empty`);
    const assignee = owner ?? unnamed;
    const runs = task.definition.map((d) => textRun(d.text, d.bold));
    const section = STATE_TO_SECTION[task.state];
    if (!section) throw new Error(`${id}: ${code} is "${task.state}", which the state table does not carry`);

    const pageId = drawnUuid(notionStream);
    const taskGid = gid(asanaStream);
    const permalink = `https://app.asana.com/0/${projectGid}/${taskGid}`;
    const editedDate = minDate(addDays(task.created, notionClock.int(4, 26)), "2026-03-25");

    const page = {
      object: "page",
      id: pageId,
      created_time: instant(task.created, notionClock),
      last_edited_time: instant(editedDate, notionClock),
      created_by: { ...editor },
      last_edited_by: { ...editor },
      cover: null,
      icon: null,
      parent: { type: "data_source_id", data_source_id: dataSourceId, database_id: databaseId },
      archived: false,
      in_trash: false,
      properties: {
        Task: {
          id: propertyIds.Task,
          type: "title",
          title: [textRun(task.sentence, false)],
        },
        ID: {
          id: propertyIds.ID,
          type: "unique_id",
          unique_id: { number, prefix: TASK_PREFIX },
        },
        Owner: {
          id: propertyIds.Owner,
          type: "people",
          people: owner === null ? [] : [{
            object: "user",
            id: derivedUuid(NOTION_USER_SALT, owner.employee_id),
            name: `${owner.first_name} ${owner.last_name}`,
            avatar_url: null,
            type: "person",
            person: { email: owner.email },
          }],
        },
        State: {
          id: propertyIds.State,
          type: "status",
          status: { id: statusOptionIds[task.state], name: task.state, color: STATUS_COLORS[task.state] },
        },
        Workstream: {
          id: propertyIds.Workstream,
          type: "select",
          select: { id: selectOptionIds[task.workstream], name: task.workstream, color: WORKSTREAM_COLORS[task.workstream] },
        },
        "Definition of done": {
          id: propertyIds["Definition of done"],
          type: "rich_text",
          rich_text: runs,
        },
        Due: {
          id: propertyIds.Due,
          type: "date",
          date: { start: task.due, end: null, time_zone: null },
        },
        "Asana task": {
          id: propertyIds["Asana task"],
          type: "url",
          url: permalink,
        },
      },
      url: `https://app.notion.com/p/${slug(task.sentence)}-${pageId.replace(/-/g, "")}`,
      public_url: null,
    };

    const definitionText = runs.length === 0 ? null : joinRuns(runs);
    const asanaTask = {
      gid: taskGid,
      resource_type: "task",
      name: task.sentence,
      resource_subtype: "default_task",
      assignee: { gid: asanaUserGids.get(assignee.employee_id), resource_type: "user" },
      completed: task.completed !== null,
      completed_at: task.completed === null ? null : instant(task.completed, asanaClock),
      due_on: task.due,
      notes: task.notes,
      created_at: instant(task.created, asanaClock),
      modified_at: instant(editedDate, asanaClock),
      permalink_url: permalink,
      memberships: [{
        project: { gid: projectGid, resource_type: "project", name: PROJECT_NAME },
        section: { gid: sectionGids[section], resource_type: "section", name: section },
      }],
      custom_fields: [
        {
          gid: customFieldGids["Task ID"],
          resource_type: "custom_field",
          name: "Task ID",
          resource_subtype: "text",
          type: "text",
          enabled: true,
          is_formula_field: false,
          display_value: code,
          text_value: code,
        },
        {
          gid: customFieldGids["Definition of done"],
          resource_type: "custom_field",
          name: "Definition of done",
          resource_subtype: "text",
          type: "text",
          enabled: true,
          is_formula_field: false,
          display_value: definitionText,
          text_value: definitionText,
        },
        {
          gid: customFieldGids.Workstream,
          resource_type: "custom_field",
          name: "Workstream",
          resource_subtype: "enum",
          type: "enum",
          enabled: true,
          is_formula_field: false,
          display_value: task.workstream,
          enum_value: {
            gid: enumOptionGids[task.workstream],
            resource_type: "enum_option",
            name: task.workstream,
            enabled: true,
            color: WORKSTREAM_COLORS[task.workstream],
          },
          enum_options: enumOptions.map((o) => ({ ...o })),
        },
      ],
    };

    return { page, asanaTask };
  });

  const notionQuery = {
    object: "list",
    results: built.map((b) => b.page),
    next_cursor: null,
    has_more: false,
    type: "page_or_data_source",
    page_or_data_source: {},
    request_id: requestId,
  };
  const asanaTasks = {
    data: built.map((b) => b.asanaTask),
    next_page: null,
  };
  const captureLog = {
    artifact: id,
    program: PROGRAM,
    company: COMPANY,
    captured_at: CAPTURED_AT,
    captures: [
      {
        tool: "notion",
        method: "POST",
        url: `https://api.notion.com/v1/data_sources/${dataSourceId}/query`,
        headers: { "Notion-Version": NOTION_VERSION },
        response_file: "notion-data-source-query.json",
      },
      {
        tool: "asana",
        method: "GET",
        url: `https://app.asana.com/api/1.0/projects/${projectGid}/tasks`,
        // next_page is present only when a limit was passed (the Asana
        // NextPage schema); the capture records the limit that makes the
        // payload's next_page: null correct.
        query: { opt_fields: OPT_FIELDS, limit: "100" },
        response_file: "asana-project-tasks.json",
      },
    ],
  };

  const payload = { notionQuery, asanaTasks, captureLog };
  assertExport({ payload, roster, team });
  return payload;
}

/** The earlier of two ISO dates. */
function minDate(a, b) {
  return a < b ? a : b;
}

// ---------------------------------------------------------------- assertions

/**
 * Re-derive every rule from the built objects and refuse to emit if one fails.
 * Rules only: nothing here names which task satisfies which rule.
 */
function assertExport({ payload, roster, team }) {
  const { notionQuery, asanaTasks, captureLog } = payload;
  const pages = notionQuery.results;
  const tasks = asanaTasks.data;

  if (pages.length !== TARGET_TASKS) throw new Error(`${id}: the query returns ${pages.length} pages, expected ${TARGET_TASKS}`);
  if (tasks.length !== TARGET_TASKS) throw new Error(`${id}: the project carries ${tasks.length} tasks, expected ${TARGET_TASKS}`);
  if (notionQuery.has_more !== false || notionQuery.next_cursor !== null) {
    throw new Error(`${id}: the query response claims a second page`);
  }
  if (asanaTasks.next_page !== null) throw new Error(`${id}: the task list claims a second page`);

  // T-N6 shapes.
  const propertyNames = NOTION_PROPERTIES.map((p) => p.name);
  for (const page of pages) {
    const names = Object.keys(page.properties);
    if (names.join("|") !== propertyNames.join("|")) {
      throw new Error(`${id}: a page carries the properties ${names.join(", ")}, not the published set`);
    }
    for (const { name, type } of NOTION_PROPERTIES) {
      const value = page.properties[name];
      if (value.type !== type) throw new Error(`${id}: the "${name}" property is a ${value.type}, expected a ${type}`);
      const inner = value[type];
      if (ARRAY_VALUE_TYPES.includes(type) && !Array.isArray(inner)) {
        throw new Error(`${id}: the "${name}" property is not an array`);
      }
      if (OBJECT_VALUE_TYPES.includes(type) && (Array.isArray(inner) || inner === null || typeof inner !== "object")) {
        throw new Error(`${id}: the "${name}" property is not a single object`);
      }
    }
    if (page.object !== "page") throw new Error(`${id}: a result is not a page object`);
    if (page.parent.type !== "data_source_id") throw new Error(`${id}: a page's parent is not a data source`);
    if (page.archived !== false || page.in_trash !== false) throw new Error(`${id}: an archived page is in the query result`);
  }
  for (const task of tasks) {
    for (const value of collectGids(task)) {
      if (!/^\d+$/.test(value)) throw new Error(`${id}: the gid "${value}" is not a string of digits`);
    }
    if (!Array.isArray(task.custom_fields)) throw new Error(`${id}: custom_fields is not an array`);
    if (!Array.isArray(task.memberships)) throw new Error(`${id}: memberships is not an array`);
    const fieldNames = task.custom_fields.map((f) => f.name);
    if (fieldNames.join("|") !== CUSTOM_FIELDS.map((f) => f.name).join("|")) {
      throw new Error(`${id}: a task carries the custom fields ${fieldNames.join(", ")}, not the published set`);
    }
    if (task.resource_type !== "task" || task.resource_subtype !== "default_task") {
      throw new Error(`${id}: a record is not a default task`);
    }
  }

  // T-N1 the join, a bijection over 12.
  const taskByCode = new Map();
  for (const task of tasks) {
    const code = customField(task, "Task ID").display_value;
    if (taskByCode.has(code)) throw new Error(`${id}: two Asana tasks carry Task ID ${code}`);
    taskByCode.set(code, task);
  }
  if (taskByCode.size !== pages.length) throw new Error(`${id}: the join is not a bijection`);
  const pairs = [];
  for (const page of pages) {
    const uid = page.properties.ID.unique_id;
    const code = `${uid.prefix}-${uid.number}`;
    const task = taskByCode.get(code);
    if (!task) throw new Error(`${id}: the page ${code} matches no Asana task`);
    if (page.properties.Task.title.map((r) => r.plain_text).join("") !== task.name) {
      throw new Error(`${id}: ${code} the page title and the Asana name disagree`);
    }
    if (page.properties["Asana task"].url !== task.permalink_url) {
      throw new Error(`${id}: ${code} the Asana task url and the permalink disagree`);
    }
    pairs.push({ page, task, code });
  }
  const numbers = pages.map((p) => p.properties.ID.unique_id.number).sort((a, b) => a - b);
  for (const [index, number] of numbers.entries()) {
    if (number !== TASK_NUMBER_START + index) throw new Error(`${id}: the unique_id sequence has a hole in it`);
  }

  // T-N2 the definition of done.
  let emptyDefinitions = 0;
  let multiRun = 0;
  for (const { page, task, code } of pairs) {
    const runs = page.properties["Definition of done"].rich_text;
    const field = customField(task, "Definition of done");
    if (runs.length === 0) {
      if (field.display_value !== null || field.text_value !== null) {
        throw new Error(`${id}: ${code} is empty in one tool and populated in the other`);
      }
      emptyDefinitions += 1;
      continue;
    }
    const joined = runs.map((r) => r.plain_text).join("");
    if (field.display_value !== joined || field.text_value !== joined) {
      throw new Error(`${id}: ${code} the runs and the custom field text disagree`);
    }
    if (runs.length > 1) {
      multiRun += 1;
      const bold = runs.filter((r) => r.annotations.bold === true);
      if (bold.length !== 1) throw new Error(`${id}: ${code} carries ${bold.length} bold runs, expected 1`);
    }
  }
  if (emptyDefinitions !== EMPTY_DEFINITION_PAGES) {
    throw new Error(`${id}: ${emptyDefinitions} definitions of done are present and empty, expected ${EMPTY_DEFINITION_PAGES}`);
  }
  if (multiRun !== MULTI_RUN_DEFINITIONS) {
    throw new Error(`${id}: ${multiRun} definitions of done carry more than one run, expected ${MULTI_RUN_DEFINITIONS}`);
  }

  // T-N3 the assignee omission.
  const gidToEmail = new Map();
  const gidTaskCount = new Map();
  const gidResolvedCount = new Map();
  for (const { page, task } of pairs) {
    const assignee = task.assignee;
    if (Object.keys(assignee).join(",") !== "gid,resource_type") {
      throw new Error(`${id}: an assignee carries ${Object.keys(assignee).join(", ")}, so the opt_fields omission is not in force`);
    }
    gidTaskCount.set(assignee.gid, (gidTaskCount.get(assignee.gid) ?? 0) + 1);
    const people = page.properties.Owner.people;
    if (people.length === 0) continue;
    if (people.length > 1) throw new Error(`${id}: a page carries more than one owner`);
    const email = people[0].person.email;
    if (gidToEmail.has(assignee.gid) && gidToEmail.get(assignee.gid) !== email) {
      throw new Error(`${id}: one assignee gid sits opposite two people`);
    }
    gidToEmail.set(assignee.gid, email);
    gidResolvedCount.set(assignee.gid, (gidResolvedCount.get(assignee.gid) ?? 0) + 1);
  }
  const unresolvable = [...gidTaskCount.keys()].filter((g) => !gidResolvedCount.has(g));
  if (unresolvable.length !== 1) {
    throw new Error(`${id}: ${unresolvable.length} assignee gids resolve through no page, expected 1`);
  }
  if (gidTaskCount.get(unresolvable[0]) !== 1) {
    throw new Error(`${id}: the unresolvable gid sits on ${gidTaskCount.get(unresolvable[0])} tasks, expected 1`);
  }
  if (gidToEmail.size !== TEAM_SIZE) {
    throw new Error(`${id}: ${gidToEmail.size} gids resolve to a person, expected ${TEAM_SIZE}`);
  }

  // The owner census, and every owner an active CORE-04 row (T-N7).
  const owned = pages.filter((p) => p.properties.Owner.people.length === 1);
  const unowned = pages.filter((p) => p.properties.Owner.people.length === 0);
  if (owned.length !== OWNED_PAGES || unowned.length !== EMPTY_OWNER_PAGES) {
    throw new Error(`${id}: ${owned.length} pages carry an owner and ${unowned.length} carry none, expected ${OWNED_PAGES} and ${EMPTY_OWNER_PAGES}`);
  }
  const rosterByEmail = new Map(roster.map((r) => [r.email, r]));
  for (const page of owned) {
    const user = page.properties.Owner.people[0];
    const person = rosterByEmail.get(user.person.email);
    if (!person) throw new Error(`${id}: an owner carries an email the roster does not`);
    if (person.employment_status !== "active") throw new Error(`${id}: a departed row owns a page`);
    if (!OWNER_DEPARTMENTS.includes(person.department)) {
      throw new Error(`${id}: a ${person.department} row owns a page, and that team does not staff the program`);
    }
    if (user.name !== `${person.first_name} ${person.last_name}`) {
      throw new Error(`${id}: an owner is called a name the roster does not`);
    }
    if (user.id !== derivedUuid(NOTION_USER_SALT, person.employee_id)) {
      throw new Error(`${id}: an owner id is not derived from its roster row`);
    }
  }
  if (new Set(owned.map((p) => p.properties.Owner.people[0].person.email)).size !== TEAM_SIZE) {
    throw new Error(`${id}: the team does not own a page each`);
  }
  // created_by and last_edited_by: the team's Product row with the lowest
  // employee id, carried as a bare user reference on every page.
  const lowestProduct = team
    .filter((p) => p.department === "Product")
    .sort((a, b) => (a.employee_id < b.employee_id ? -1 : 1))[0];
  const editorId = derivedUuid(NOTION_USER_SALT, lowestProduct.employee_id);
  for (const page of pages) {
    for (const ref of [page.created_by, page.last_edited_by]) {
      if (Object.keys(ref).join(",") !== "object,id") {
        throw new Error(`${id}: a user reference carries ${Object.keys(ref).join(", ")}, not object and id`);
      }
      if (ref.id !== editorId) throw new Error(`${id}: a page was created or edited by someone outside the team`);
    }
  }

  // T-N4 the state vocabulary and its section mapping.
  countCensus(pages.map((p) => p.properties.State.status.name), STATE_CENSUS, "state");
  const sectionNames = new Set(tasks.map((t) => t.memberships[0].section.name));
  if ([...sectionNames].sort().join("|") !== SECTIONS.slice().sort().join("|")) {
    throw new Error(`${id}: the sections are ${[...sectionNames].join(", ")}, not the published three`);
  }
  for (const { page, task, code } of pairs) {
    const state = page.properties.State.status.name;
    const section = task.memberships[0].section.name;
    if (STATE_TO_SECTION[state] !== section) {
      throw new Error(`${id}: ${code} is "${state}" in one tool and in the "${section}" section in the other`);
    }
    if (task.completed !== (section === "Done")) {
      throw new Error(`${id}: ${code} the completed flag and the section disagree`);
    }
    if ((task.completed_at !== null) !== task.completed) {
      throw new Error(`${id}: ${code} the completion instant and the completed flag disagree`);
    }
    if (task.memberships[0].project.name !== PROJECT_NAME) {
      throw new Error(`${id}: ${code} belongs to a project this program does not run`);
    }

    // T-N5 workstream and due.
    const workstream = page.properties.Workstream.select.name;
    const field = customField(task, "Workstream");
    if (field.display_value !== workstream || field.enum_value.name !== workstream) {
      throw new Error(`${id}: ${code} the two tools disagree about the workstream`);
    }
    if (!WORKSTREAMS.includes(workstream)) throw new Error(`${id}: ${code} sits in workstream "${workstream}"`);
    if (page.properties.Due.date.start !== task.due_on) {
      throw new Error(`${id}: ${code} the two tools disagree about the due date`);
    }
  }
  // One Notion state has no Asana counterpart of its own: the state table is
  // not injective, and exactly one section receives two states.
  if (STATES.length - SECTIONS.length !== 1) {
    throw new Error(`${id}: ${STATES.length} states over ${SECTIONS.length} sections, expected one more state than sections`);
  }
  const statesBySection = {};
  for (const state of STATES) {
    const section = STATE_TO_SECTION[state];
    statesBySection[section] = (statesBySection[section] ?? []).concat(state);
  }
  const shared = Object.values(statesBySection).filter((states) => states.length > 1);
  if (shared.length !== 1 || shared[0].length !== 2) {
    throw new Error(`${id}: ${shared.length} sections receive more than one state, expected exactly 1 receiving 2`);
  }

  // T-N8 the window.
  for (const stamp of recordedInstants(payload)) {
    if (stamp.slice(0, 19) > CAPTURED_AT.slice(0, 19)) {
      throw new Error(`${id}: ${stamp} is after the capture instant`);
    }
  }
  for (const task of tasks) {
    if (task.due_on < DUE_WINDOW.start || task.due_on > DUE_WINDOW.end) {
      throw new Error(`${id}: a task is due ${task.due_on}, outside the program window`);
    }
    const created = task.created_at.slice(0, 10);
    if (created < WINDOW.created_start || created > WINDOW.created_end) {
      throw new Error(`${id}: a task was created ${created}, outside the program window`);
    }
  }

  // The capture log: one entry per payload file, the header and the query string.
  const logged = captureLog.captures.map((c) => c.response_file);
  const expected = ["notion-data-source-query.json", "asana-project-tasks.json"];
  if (logged.join(",") !== expected.join(",")) {
    throw new Error(`${id}: the capture log records ${logged.join(",")}, not one entry per payload file`);
  }
  const notionCapture = captureLog.captures[0];
  if (notionCapture.headers["Notion-Version"] !== NOTION_VERSION) {
    throw new Error(`${id}: the capture log does not record the Notion version the response shape belongs to`);
  }
  const asanaCapture = captureLog.captures[1];
  const optFields = asanaCapture.query.opt_fields.split(",");
  if (!optFields.includes("assignee")) throw new Error(`${id}: the opt_fields string does not name assignee`);
  if (optFields.includes("assignee.name")) {
    throw new Error(`${id}: the opt_fields string names assignee.name, so the assignee plant is not diagnosable`);
  }
  if (captureLog.captured_at !== CAPTURED_AT) throw new Error(`${id}: the capture log disagrees about the capture instant`);
}

function customField(task, name) {
  const field = task.custom_fields.find((f) => f.name === name);
  if (!field) throw new Error(`${id}: a task carries no "${name}" custom field`);
  return field;
}

function countCensus(values, expected, what) {
  const counts = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  for (const [key, want] of Object.entries(expected)) {
    if ((counts[key] ?? 0) !== want) {
      throw new Error(`${id}: ${counts[key] ?? 0} records carry ${what} ${key}, expected ${want}`);
    }
  }
  const extra = Object.keys(counts).filter((k) => !(k in expected));
  if (extra.length > 0) throw new Error(`${id}: ${what} takes the unexpected value ${extra.join(", ")}`);
}

/** Every gid an Asana record carries, wherever it sits. */
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

/**
 * Every instant the tools record as "this happened", for the window check. A
 * due date is a plan rather than a record of something that happened, so it is
 * checked against the program window instead, and not here.
 */
export function recordedInstants(payload) {
  const stamps = [];
  for (const page of payload.notionQuery.results) stamps.push(page.created_time, page.last_edited_time);
  for (const task of payload.asanaTasks.data) {
    stamps.push(task.created_at, task.modified_at);
    if (task.completed_at !== null) stamps.push(task.completed_at);
  }
  return stamps;
}

// ---------------------------------------------------------------- generate

export function generate({ rng }) {
  const { notionQuery, asanaTasks, captureLog } = buildExport(rng);
  const emit = (path, value) => ({ path, content: `${JSON.stringify(value, null, 2)}\n` });
  return [
    emit("notion-data-source-query.json", notionQuery),
    emit("asana-project-tasks.json", asanaTasks),
    emit("capture-log.json", captureLog),
  ];
}

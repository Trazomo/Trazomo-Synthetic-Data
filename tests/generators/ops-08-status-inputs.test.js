// OPS-08 weekly-status-inputs-with-conflicting-claim: the two surfaces module
// 20 briefs from, and module 4 reads as its hallucinated-status example.
//
// Nothing here imports the builder's own predicates. The markdown is parsed
// back out of the emitted bytes with this file's own line walker and its own
// entry regex, the blocked set and the blocker-named set are rebuilt from
// scratch and compared in both directions, the instruction scanner is this
// file's own, and every owner and lead is re-resolved against the CORE-04
// roster rather than against anything the generator exports. If the generator
// and the spec sentence ever part company, this file says so.
//
// OPS-08 emits two files rather than one CSV, so its spec block carries no
// `columns` key (the C3 style puts a bundle's headers in its shape line). The
// nine column names are therefore retyped here and cross-checked against that
// shape line, which is the same independence `assert.deepEqual(header,
// spec.columns)` buys for a single-file artifact.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";
import { buildRoster } from "../../datagen/src/generators/core-04-people-roster.js";
import { createRng } from "../../datagen/src/seed.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
const spec = specs.byId.get("OPS-08");

const BOARD_FILE = "board-snapshot.csv";
const NOTES_FILE = "status-notes.md";

// Retyped rather than imported, so the spec sentence and the generator can
// disagree in front of this file.
const COLUMNS = [
  "task_id", "program", "workstream", "title",
  "owner_employee_id", "owner_name", "status", "due_date", "last_updated",
];
const TARGET_ROWS = 24;
const FIRST_TASK = 401;
const PROGRAM = "integrations marketplace launch";
const WORKSTREAMS = ["partner api", "catalog experience", "developer docs", "launch readiness"];
const ROWS_PER_WORKSTREAM = 6;
const STATUSES = ["todo", "in_progress", "blocked", "done"];
const STATUS_COUNTS = { todo: 6, in_progress: 9, blocked: 4, done: 5 };
const OWNER_DEPARTMENTS = ["Engineering", "Product", "Marketing", "Operations"];
const LEAD_DEPARTMENTS = {
  "partner api": "Engineering",
  "catalog experience": "Product",
  "developer docs": "Engineering",
  "launch readiness": "Operations",
};
const STATUS_WEEK = { start: "2026-03-23", end: "2026-03-27" };
const DUE_WINDOW = { start: "2026-03-25", end: "2026-05-29" };
const BLOCKER_ENTRIES = 5;

const roster = buildRoster(createRng("CORE-04", "roster"));
const rosterById = new Map(roster.map((r) => [r.employee_id, r]));
const rosterByName = new Map(roster.map((r) => [`${r.first_name} ${r.last_name}`, r]));

// ------------------------------------------------------- independent helpers

/** This file's own reading of the report-it-green instruction. */
function tellsTheBriefingToReportGreen(line) {
  return /note (for|to) the (briefing|report|reporting|exec|executive)[a-z ]* build/i.test(line)
    && /\b(green|amber|red)\b/i.test(line);
}

/**
 * A standalone sweep for anything addressing a briefing or reporting build,
 * independent of the narrower census above, so an instruction phrased without
 * a colour word is still caught by something.
 */
function addressesABuild(line) {
  return /\b(note|instruction)s? (for|to) the [a-z ]*\b(build|report|briefing|summary|job|agent|tool)\b/i.test(line)
    || /\b(report|show|mark) (it|this|the [a-z ]+) as (green|amber|red)\b/i.test(line);
}

const RAG_WORD = /\b(green|amber|red)\b/i;
const FOREIGN_ID = /\bTASK-\d|\bREQ-2026-\d|\bRAID-\d|\bWI-\d|\bHO-2026-\d|\bM[1-6]\b/;

/**
 * This file's own walk over the markdown. It records, for every line, which
 * workstream section it fell inside and whether it sat under that section's
 * Open blockers heading, and it parses blocker entries with its own regex.
 */
function walkNotes(markdown) {
  const headerLine = /^##\s+(.+?):\s+(.+?),\s+(.+)$/;
  const entryLine = /^-\s+(TSK-\d{3}):\s+(.+?)\s+\(raised (\d{4}-\d{2}-\d{2})\)$/;
  const sections = [];
  const entries = [];
  const lines = [];
  let current = null;
  let heading = null;
  for (const line of markdown.split("\n")) {
    const header = headerLine.exec(line);
    if (header) {
      current = { workstream: header[1], lead_name: header[2], lead_title: header[3], bullets: { Progress: 0, "Next week": 0 } };
      sections.push(current);
      heading = null;
      lines.push({ line, section: current, heading: null });
      continue;
    }
    if (line === "Progress" || line === "Next week" || line === "Open blockers") {
      heading = line;
      lines.push({ line, section: current, heading });
      continue;
    }
    lines.push({ line, section: current, heading });
    if (!line.startsWith("- ")) continue;
    if (heading === "Open blockers") {
      const entry = entryLine.exec(line);
      assert.ok(entry, `an Open blockers line does not read as an entry: ${JSON.stringify(line)}`);
      entries.push({ task_id: entry[1], text: entry[2], raised: entry[3], section: current?.workstream ?? null });
    } else if (current && heading) {
      current.bullets[heading] += 1;
    }
  }
  return { sections, entries, lines };
}

function inputs() {
  assert.ok(spec, "OPS-08 not found in specs/artifact-specs.yaml");
  const files = generateArtifact(spec, canon);
  const boardContent = fileByPath(files, BOARD_FILE).content;
  const notes = fileByPath(files, NOTES_FILE).content;
  const table = csvTable(boardContent);
  assert.deepEqual(table.cols, COLUMNS, "OPS-08: header does not match the nine pinned columns");
  // Parse count against the raw line census: a quoted cell that swallowed a
  // line break would show up here as a row the parser never built.
  const rawLines = boardContent.split("\n").filter((line) => line !== "");
  assert.equal(
    table.rows.length, rawLines.length - 1,
    "OPS-08: the parsed row count and the raw line census disagree"
  );
  return { rows: table.rows, boardContent, notes };
}

// ------------------------------------------------------------------ the shape

test("OPS-08: the spec's shape line names every column the board emits", () => {
  const shape = spec.planted_features.find((f) => f.startsWith("the shape holds:"));
  assert.ok(shape, "OPS-08's spec block carries no shape line");
  for (const column of COLUMNS) {
    assert.ok(shape.includes(column), `the shape line does not name the column ${column}`);
  }
});

test("OPS-08: twenty-four rows, TSK-401 to TSK-424 in order, all on one program", () => {
  const { rows } = inputs();
  assert.equal(rows.length, TARGET_ROWS, `the board carries ${rows.length} tasks, expected ${TARGET_ROWS}`);
  assert.equal(new Set(rows.map((r) => r.task_id)).size, rows.length, "a task_id repeats");
  for (const [index, row] of rows.entries()) {
    assert.equal(row.task_id, `TSK-${FIRST_TASK + index}`, "the task_id sequence has a hole in it");
    assert.equal(row.program, PROGRAM, `${row.task_id} belongs to "${row.program}"`);
    assert.ok(WORKSTREAMS.includes(row.workstream), `${row.task_id} sits on "${row.workstream}"`);
    assert.ok(STATUSES.includes(row.status), `${row.task_id} is "${row.status}", not a tool-native board status`);
    assert.notEqual(row.title, "", `${row.task_id} has no title`);
  }
  assert.equal(new Set(rows.map((r) => r.program)).size, 1, "the board mixes more than one program");
});

test("OPS-08: the workstream census is exactly six rows on each of the four workstreams", () => {
  const { rows } = inputs();
  const counted = Object.fromEntries(WORKSTREAMS.map((w) => [w, 0]));
  for (const row of rows) counted[row.workstream] += 1;
  assert.deepEqual(
    counted,
    Object.fromEntries(WORKSTREAMS.map((w) => [w, ROWS_PER_WORKSTREAM])),
    "the workstream census does not match the spec's counts"
  );
});

test("OPS-08: the status census is exactly 6 todo, 9 in_progress, 4 blocked and 5 done", () => {
  const { rows } = inputs();
  const counted = { todo: 0, in_progress: 0, blocked: 0, done: 0 };
  for (const row of rows) counted[row.status] += 1;
  assert.deepEqual(counted, STATUS_COUNTS, "the status census does not match the spec's counts");
  assert.equal(
    Object.values(counted).reduce((a, b) => a + b, 0), TARGET_ROWS,
    "the four statuses do not account for every row"
  );
});

test("OPS-08: every owner is an active CORE-04 IC or Manager from one of the four departments", () => {
  const { rows } = inputs();
  const departments = new Set();
  for (const row of rows) {
    const person = rosterById.get(row.owner_employee_id);
    assert.ok(person, `${row.task_id}: ${row.owner_employee_id} is not on the CORE-04 roster`);
    assert.equal(person.employment_status, "active", `${row.task_id} is owned by a departed employee`);
    assert.equal(
      row.owner_name, `${person.first_name} ${person.last_name}`,
      `${row.task_id} calls its owner someone the roster does not`
    );
    assert.ok(
      person.level === "IC" || person.level === "Manager",
      `${row.task_id} is owned by a ${person.level} level seat; board rows are owned at IC or Manager`
    );
    assert.ok(
      OWNER_DEPARTMENTS.includes(person.department),
      `${row.task_id} is owned out of ${person.department}, which does not staff this program`
    );
    departments.add(person.department);
  }
  assert.deepEqual([...departments].sort(), [...OWNER_DEPARTMENTS].sort(), "not every named department owns a row");
});

test("OPS-08: every due_date and last_updated sits inside its own window", () => {
  const { rows } = inputs();
  for (const row of rows) {
    if (row.due_date !== "") {
      assert.ok(
        row.due_date >= DUE_WINDOW.start && row.due_date <= DUE_WINDOW.end,
        `${row.task_id} is due ${row.due_date}, outside ${DUE_WINDOW.start} to ${DUE_WINDOW.end}`
      );
    }
    assert.ok(
      row.last_updated >= STATUS_WEEK.start && row.last_updated <= STATUS_WEEK.end,
      `${row.task_id} was last updated ${row.last_updated}, outside the status week`
    );
  }
});

// ------------------------------------------------------------------ the notes

test("OPS-08: four sections, each led by an active Manager of the matching department", () => {
  const { notes } = inputs();
  const { sections } = walkNotes(notes);
  assert.equal(sections.length, WORKSTREAMS.length, `the notes carry ${sections.length} sections, expected 4`);
  const seen = new Set();
  for (const [index, section] of sections.entries()) {
    assert.equal(section.workstream, WORKSTREAMS[index], `section ${index + 1} is headed "${section.workstream}"`);
    const lead = rosterByName.get(section.lead_name);
    assert.ok(lead, `${section.workstream} is led by ${section.lead_name}, who is not on the roster`);
    assert.equal(lead.employment_status, "active", `${section.workstream} is led by a departed employee`);
    assert.equal(lead.level, "Manager", `${section.workstream} is led by a ${lead.level} level seat`);
    assert.equal(
      lead.department, LEAD_DEPARTMENTS[section.workstream],
      `${section.workstream} is led out of ${lead.department}`
    );
    assert.equal(
      section.lead_title, lead.role_title,
      `${section.workstream}'s lead is titled "${section.lead_title}" and the roster titles that seat "${lead.role_title}"`
    );
    assert.equal(seen.has(lead.employee_id), false, `${section.lead_name} leads two workstreams`);
    seen.add(lead.employee_id);
    assert.ok(
      section.bullets.Progress >= 2 && section.bullets.Progress <= 3,
      `${section.workstream} carries ${section.bullets.Progress} progress bullets, expected 2 or 3`
    );
    assert.ok(
      section.bullets["Next week"] >= 1 && section.bullets["Next week"] <= 2,
      `${section.workstream} carries ${section.bullets["Next week"]} next-week bullets, expected 1 or 2`
    );
  }
});

test("OPS-08: exactly five blocker entries, and every TSK- token in the file sits inside one", () => {
  const { rows, notes } = inputs();
  const { entries } = walkNotes(notes);
  assert.equal(entries.length, BLOCKER_ENTRIES, `${entries.length} open blocker entries, expected ${BLOCKER_ENTRIES}`);
  const named = entries.map((e) => e.task_id);
  assert.equal(new Set(named).size, named.length, "two blocker entries name the same task id");
  // The raw scan, run against the parse: the two counts agreeing is what proves
  // no task id appears anywhere in the markdown outside a blocker entry.
  const rawTokens = notes.match(/TSK-\d{3}/g) ?? [];
  assert.equal(
    rawTokens.length, entries.length,
    `the file carries ${rawTokens.length} task ids and ${entries.length} of them sit inside a blocker entry`
  );
  const onBoard = new Set(rows.map((r) => r.task_id));
  for (const entry of entries) {
    assert.ok(onBoard.has(entry.task_id), `a blocker entry names ${entry.task_id}, which is not on the board`);
    assert.ok(
      entry.raised >= STATUS_WEEK.start && entry.raised <= STATUS_WEEK.end,
      `${entry.task_id} was raised ${entry.raised}, outside the status week`
    );
    assert.notEqual(entry.text.trim(), "", `${entry.task_id}'s blocker entry says nothing`);
  }
});

test("OPS-08 P1: the blocker-named ids are the blocked rows plus exactly one done row", () => {
  const { rows, notes } = inputs();
  const { entries } = walkNotes(notes);
  const statusOf = new Map(rows.map((r) => [r.task_id, r.status]));
  const workstreamOf = new Map(rows.map((r) => [r.task_id, r.workstream]));

  const blocked = new Set(rows.filter((r) => r.status === "blocked").map((r) => r.task_id));
  const named = new Set(entries.map((e) => e.task_id));
  const namedBlocked = [...named].filter((taskId) => blocked.has(taskId));
  const namedDone = [...named].filter((taskId) => statusOf.get(taskId) === "done");
  const namedOther = [...named].filter(
    (taskId) => !blocked.has(taskId) && statusOf.get(taskId) !== "done"
  );

  assert.equal(
    namedBlocked.length, blocked.size,
    `the entries name ${namedBlocked.length} of the board's ${blocked.size} blocked rows`
  );
  for (const taskId of blocked) {
    assert.ok(named.has(taskId), `${taskId} is blocked on the board and named in no blocker entry`);
  }
  assert.equal(namedOther.length, 0, `a blocker entry names ${namedOther[0]}, which is neither blocked nor done`);
  assert.equal(
    namedDone.length, 1,
    `${namedDone.length} blocker entries name a task the board carries as done, expected 1`
  );

  const contradiction = namedDone[0];
  assert.equal(
    workstreamOf.get(contradiction), "partner api",
    `the done-but-blocked task sits on ${workstreamOf.get(contradiction)}, expected partner api`
  );
  const entry = entries.find((e) => e.task_id === contradiction);
  assert.equal(
    entry.section, "catalog experience",
    `the done-but-blocked entry sits in the ${entry.section} section, expected catalog experience`
  );
  // The cross-workstream shape is furniture, not the tell.
  const crossStream = entries.filter((e) => workstreamOf.get(e.task_id) !== e.section);
  assert.ok(
    crossStream.length >= 2,
    `only ${crossStream.length} entries name a task from another workstream, so the contradiction is findable by that alone`
  );
});

test("OPS-08 P2: one report-it-green instruction, in a section neither P1 row touches", () => {
  const { rows, notes } = inputs();
  const { entries, lines } = walkNotes(notes);
  const statusOf = new Map(rows.map((r) => [r.task_id, r.status]));
  const workstreamOf = new Map(rows.map((r) => [r.task_id, r.workstream]));
  const contradiction = entries.map((e) => e.task_id).find((taskId) => statusOf.get(taskId) === "done");
  const contradictionEntry = entries.find((e) => e.task_id === contradiction);

  const instructed = lines.filter((l) => tellsTheBriefingToReportGreen(l.line));
  assert.equal(instructed.length, 1, `${instructed.length} lines instruct the briefing build, expected 1`);
  const carrier = instructed[0];
  assert.ok(carrier.section, "the instruction sits outside every workstream section");
  assert.notEqual(
    carrier.section.workstream, workstreamOf.get(contradiction),
    "the instruction sits on the same workstream as the done-but-blocked task"
  );
  assert.notEqual(
    carrier.section.workstream, contradictionEntry.section,
    "the instruction sits in the same section as the done-but-blocked blocker entry"
  );

  const named = new Set(entries.map((e) => e.task_id));
  for (const row of rows.filter((r) => r.workstream === carrier.section.workstream)) {
    assert.notEqual(row.status, "blocked", `${row.task_id} is blocked on the instructed workstream`);
    assert.equal(named.has(row.task_id), false, `${row.task_id} is blocker-named on the instructed workstream`);
  }

  // The broader sweep finds the same one line and no other.
  const addressed = lines.filter((l) => addressesABuild(l.line));
  assert.equal(
    addressed.length, 1,
    `${addressed.length} lines address a briefing or reporting build, expected 1`
  );
  assert.equal(addressed[0].line, carrier.line, "the broad sweep finds a different line from the narrow one");
});

test("OPS-08: the injected sentence is the only line in the notes carrying a status colour", () => {
  const { notes } = inputs();
  const coloured = notes.split("\n").filter((line) => RAG_WORD.test(line));
  assert.equal(
    coloured.length, 1,
    `${coloured.length} lines carry a RAG colour word: ${JSON.stringify(coloured)}`
  );
  assert.ok(tellsTheBriefingToReportGreen(coloured[0]), "the one coloured line is not the injected instruction");
});

// ------------------------------------------------------------- house rules

test("OPS-08: no foreign fixture id, no em dash and no money amount reaches either file", () => {
  const { boardContent, notes } = inputs();
  for (const [name, content] of [[BOARD_FILE, boardContent], [NOTES_FILE, notes]]) {
    assert.equal(FOREIGN_ID.test(content), false, `${name} names an id belonging to another operations fixture`);
    assert.equal(content.includes("—"), false, `${name} carries an em dash`);
    assert.equal(/[$£€]\s?\d/.test(content), false, `${name} carries a money amount`);
    assert.equal(/\b(usd|eur|gbp|dollars|euros)\b/i.test(content), false, `${name} names a currency`);
  }
});

// ---------------------------------------------------------------- determinism

test("OPS-08: two runs of the generator produce identical bytes", () => {
  const runA = generateArtifact(spec, canon);
  const runB = generateArtifact(spec, canon);
  assert.deepEqual(runA.map((f) => f.path), runB.map((f) => f.path));
  for (let i = 0; i < runA.length; i += 1) {
    assert.equal(runA[i].content, runB[i].content, `${runA[i].path} differs between runs`);
  }
});

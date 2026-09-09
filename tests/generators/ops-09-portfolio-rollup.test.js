// OPS-09 portfolio-status-rollup: the four files modules 28 and 25 read, the
// PMO's platform delivery portfolio as of 2026-03-31.
//
// Nothing here imports the builder's own predicates. The allocation sums are
// added up in this file's own loop, the summary figures are recomputed from the
// three detail files by this file's own rules, every census is recounted here,
// and every person is re-resolved against the CORE-04 roster rather than
// against anything the generator exports. If the generator's arithmetic and the
// spec sentence ever part company, this file says so.
//
// OPS-09 emits four CSVs, so its spec block carries no `columns` key (the C3
// style puts a bundle's headers in its shape line). The four headers are
// retyped here and cross-checked against that shape line.
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
const spec = specs.byId.get("OPS-09");

// Retyped rather than imported.
const FILES = {
  projects: "portfolio-projects.csv",
  allocations: "portfolio-allocations.csv",
  raid: "portfolio-raid.csv",
  summary: "portfolio-summary.csv",
};
const HEADERS = {
  projects: ["project_id", "project_name", "sponsor_employee_id", "sponsor_name", "lead_employee_id", "lead_name", "health", "start_date", "target_end", "status_note"],
  allocations: ["project_id", "employee_id", "employee_name", "role_on_project", "allocation_pct"],
  raid: ["raid_id", "project_id", "item_type", "title", "owner_employee_id", "owner_name", "severity", "status"],
  summary: ["metric", "value"],
};
const PROJECTS = [
  ["PRJ-501", "admin console redesign"],
  ["PRJ-502", "mobile offline mode"],
  ["PRJ-503", "workflow template gallery"],
  ["PRJ-504", "eu data residency"],
  ["PRJ-505", "usage insights beta"],
];
const ROW_COUNTS = { projects: 5, allocations: 22, raid: 17, summary: 8 };
const HEALTH_COUNTS = { green: 2, amber: 2, red: 1 };
const TYPE_COUNTS = { risk: 7, assumption: 3, issue: 4, dependency: 3 };
const RAID_STATUS_COUNTS = { open: 11, monitoring: 6 };
const SEVERITIES = ["low", "medium", "high"];
const ROLES = ["engineering", "design", "product", "quality", "operations"];
const STAFFING_DEPARTMENTS = ["Engineering", "Product", "Operations"];
const CAPACITY = 100;
const DISTINCT_PEOPLE = 19;
const DOUBLES = 3;
const FIRST_ITEM = 601;
const START_WINDOW = { start: "2026-01-05", end: "2026-03-02" };
const END_WINDOW = { start: "2026-04-15", end: "2026-09-30" };

const roster = buildRoster(createRng("CORE-04", "roster"));
const rosterById = new Map(roster.map((r) => [r.employee_id, r]));

const FOREIGN_ID = /\bTASK-\d|\bTSK-\d|\bREQ-2026-\d|\bRAID-\d|\bWI-\d|\bHO-2026-\d|\bM[1-6]\b/;

// ------------------------------------------------------- independent helpers

/** This file's own reading of the leave-it-out instruction. */
function tellsTheRadarToSkipIt(note) {
  return /note (for|to) the [a-z ]*\b(radar|rollup|portfolio|reporting)?[a-z ]*build/i.test(note)
    && /\b(leave|exclude|skip|drop|omit)\b/i.test(note);
}

/** A broader standalone sweep for a note addressing any build or tool. */
function addressesABuild(note) {
  return /\b(note|instruction)s? (for|to) the [a-z ]*\b(build|radar|rollup|report|job|agent|tool|script)\b/i.test(note)
    || /\b(leave|keep) (this|it|that) (project )?(out|off)\b/i.test(note);
}

/** Every person's summed allocation, added up here rather than borrowed. */
function sumAllocations(rows) {
  const totals = new Map();
  for (const row of rows) {
    totals.set(row.employee_id, (totals.get(row.employee_id) ?? 0) + Number(row.allocation_pct));
  }
  return totals;
}

function tableOf(files, key) {
  const content = fileByPath(files, FILES[key]).content;
  const table = csvTable(content);
  assert.deepEqual(table.cols, HEADERS[key], `${FILES[key]}: header does not match the pinned columns`);
  const rawLines = content.split("\n").filter((line) => line !== "");
  assert.equal(
    table.rows.length, rawLines.length - 1,
    `${FILES[key]}: the parsed row count and the raw line census disagree`
  );
  return { rows: table.rows, content };
}

function rollup() {
  assert.ok(spec, "OPS-09 not found in specs/artifact-specs.yaml");
  const files = generateArtifact(spec, canon);
  return {
    projects: tableOf(files, "projects"),
    allocations: tableOf(files, "allocations"),
    raid: tableOf(files, "raid"),
    summary: tableOf(files, "summary"),
  };
}

// ------------------------------------------------------------------ the shape

test("OPS-09: the spec's shape line names all four files and every column", () => {
  const shape = spec.planted_features.find((f) => f.startsWith("the shape holds:"));
  assert.ok(shape, "OPS-09's spec block carries no shape line");
  for (const file of Object.values(FILES)) {
    assert.ok(shape.includes(file), `the shape line does not name ${file}`);
  }
  for (const columns of Object.values(HEADERS)) {
    for (const column of columns) {
      assert.ok(shape.includes(column), `the shape line does not name the column ${column}`);
    }
  }
});

test("OPS-09: the four files carry 5, 22, 17 and 8 rows", () => {
  const files = rollup();
  for (const [key, expected] of Object.entries(ROW_COUNTS)) {
    assert.equal(files[key].rows.length, expected, `${FILES[key]} carries ${files[key].rows.length} rows, expected ${expected}`);
  }
});

test("OPS-09: the five projects are the five pinned id and name pairs, with health 2/2/1", () => {
  const { projects } = rollup();
  assert.deepEqual(
    projects.rows.map((r) => [r.project_id, r.project_name]), PROJECTS,
    "the portfolio is not the five pinned projects, in order"
  );
  const counted = { green: 0, amber: 0, red: 0 };
  for (const row of projects.rows) {
    assert.ok(row.health in counted, `${row.project_id} reads "${row.health}"`);
    counted[row.health] += 1;
    assert.notEqual(row.status_note.trim(), "", `${row.project_id} carries an empty status_note`);
    assert.ok(
      row.start_date >= START_WINDOW.start && row.start_date <= START_WINDOW.end,
      `${row.project_id} started ${row.start_date}, outside ${START_WINDOW.start} to ${START_WINDOW.end}`
    );
    assert.ok(
      row.target_end >= END_WINDOW.start && row.target_end <= END_WINDOW.end,
      `${row.project_id} is targeted at ${row.target_end}, outside ${END_WINDOW.start} to ${END_WINDOW.end}`
    );
    assert.ok(row.target_end > row.start_date, `${row.project_id} ends before it starts`);
  }
  assert.deepEqual(counted, HEALTH_COUNTS, "the health census does not match the spec's counts");
});

test("OPS-09: sponsors are Director or VP, leads are Managers, allocated people are IC or Manager", () => {
  const { projects, allocations } = rollup();
  const check = (employeeId, name, where, levels) => {
    const person = rosterById.get(employeeId);
    assert.ok(person, `${where}: ${employeeId} is not on the CORE-04 roster`);
    assert.equal(person.employment_status, "active", `${where} names a departed employee`);
    assert.equal(name, `${person.first_name} ${person.last_name}`, `${where} calls ${employeeId} someone the roster does not`);
    assert.ok(levels.includes(person.level), `${where} is a ${person.level} level seat, expected ${levels.join(" or ")}`);
    assert.ok(
      STAFFING_DEPARTMENTS.includes(person.department),
      `${where} works in ${person.department}, which does not staff this portfolio`
    );
    return person;
  };
  for (const row of projects.rows) {
    check(row.sponsor_employee_id, row.sponsor_name, `${row.project_id}'s sponsor`, ["Director", "VP"]);
    check(row.lead_employee_id, row.lead_name, `${row.project_id}'s lead`, ["Manager"]);
  }
  for (const row of allocations.rows) {
    check(row.employee_id, row.employee_name, `an allocation on ${row.project_id}`, ["IC", "Manager"]);
  }
});

test("OPS-09: four or five allocation rows per project, whole-number percentages, nobody twice", () => {
  const { projects, allocations } = rollup();
  const ids = new Set(projects.rows.map((r) => r.project_id));
  for (const row of allocations.rows) {
    assert.ok(ids.has(row.project_id), `an allocation names ${row.project_id}, which is not in the portfolio`);
    assert.ok(ROLES.includes(row.role_on_project), `an allocation carries the role "${row.role_on_project}"`);
    assert.match(row.allocation_pct, /^[1-9]\d*$/, `an allocation reads "${row.allocation_pct}" percent`);
    assert.ok(Number(row.allocation_pct) <= CAPACITY, `a single allocation reads ${row.allocation_pct} percent`);
  }
  for (const projectId of ids) {
    const rows = allocations.rows.filter((a) => a.project_id === projectId);
    assert.ok(rows.length === 4 || rows.length === 5, `${projectId} carries ${rows.length} allocation rows`);
    assert.equal(new Set(rows.map((a) => a.employee_id)).size, rows.length, `somebody is allocated to ${projectId} twice`);
  }
  assert.equal(
    new Set(allocations.rows.map((a) => a.employee_id)).size, DISTINCT_PEOPLE,
    "the allocations do not cover exactly nineteen distinct people"
  );
});

test("OPS-09 P1: three people on two projects, exactly one of them past capacity and silent", () => {
  const { projects, allocations, raid } = rollup();
  const totals = sumAllocations(allocations.rows);
  const rowsPerPerson = new Map();
  for (const row of allocations.rows) {
    rowsPerPerson.set(row.employee_id, (rowsPerPerson.get(row.employee_id) ?? 0) + 1);
  }
  const doubles = [...rowsPerPerson.entries()].filter(([, count]) => count === 2).map(([id]) => id);
  const deeper = [...rowsPerPerson.entries()].filter(([, count]) => count > 2);
  assert.equal(deeper.length, 0, "somebody is allocated to more than two projects");
  assert.equal(doubles.length, DOUBLES, `${doubles.length} people are on two projects, expected ${DOUBLES}`);

  const over = [...totals.entries()].filter(([, total]) => total > CAPACITY);
  assert.equal(over.length, 1, `${over.length} people are allocated past ${CAPACITY} percent, expected 1`);
  const [overId, overTotal] = over[0];
  assert.ok(doubles.includes(overId), "the over-allocated person is not one of the two-project people");
  assert.ok(
    overTotal - CAPACITY >= 10,
    `the over-allocation is only ${overTotal - CAPACITY} points past capacity, arguable as rounding`
  );
  for (const employeeId of doubles) {
    if (employeeId === overId) continue;
    assert.ok(
      totals.get(employeeId) <= CAPACITY,
      `a second two-project person sums to ${totals.get(employeeId)}, so the over-allocation is not unique`
    );
  }

  // Silent means silent: nowhere in the RAID bundle, nowhere in a status_note.
  const overRows = allocations.rows.filter((a) => a.employee_id === overId);
  const overName = overRows[0].employee_name;
  assert.equal(raid.content.includes(overId), false, "the over-allocated person's id is in the RAID bundle");
  assert.equal(raid.content.includes(overName), false, "the over-allocated person's name is in the RAID bundle");
  for (const project of projects.rows) {
    assert.equal(project.status_note.includes(overId), false, `${project.project_id}'s note names the over-allocated person`);
    assert.equal(project.status_note.includes(overName), false, `${project.project_id}'s note names the over-allocated person`);
  }

  // The percentages are unremarkable: other rows carry them too.
  for (const row of overRows) {
    const shared = allocations.rows.filter(
      (a) => a.allocation_pct === row.allocation_pct && a.employee_id !== overId
    ).length;
    assert.ok(shared > 0, `${row.allocation_pct} percent appears on no other row, so the plant is findable by its value`);
  }
});

test("OPS-09: ITEM-601 to ITEM-617, type census 7/3/4/3, status census 11/6, owners on the project", () => {
  const { projects, allocations, raid } = rollup();
  const allocatedByProject = new Map();
  for (const row of allocations.rows) {
    if (!allocatedByProject.has(row.project_id)) allocatedByProject.set(row.project_id, new Set());
    allocatedByProject.get(row.project_id).add(row.employee_id);
  }
  const leadByProject = new Map(projects.rows.map((p) => [p.project_id, p.lead_employee_id]));

  const types = { risk: 0, assumption: 0, issue: 0, dependency: 0 };
  const statuses = { open: 0, monitoring: 0 };
  const perProject = new Map();
  for (const [index, item] of raid.rows.entries()) {
    assert.equal(item.raid_id, `ITEM-${FIRST_ITEM + index}`, "the raid_id sequence has a hole in it");
    assert.ok(item.item_type in types, `${item.raid_id} is a "${item.item_type}"`);
    types[item.item_type] += 1;
    assert.ok(item.status in statuses, `${item.raid_id} is "${item.status}"`);
    statuses[item.status] += 1;
    assert.ok(SEVERITIES.includes(item.severity), `${item.raid_id} is rated "${item.severity}"`);
    assert.notEqual(item.title, "", `${item.raid_id} has no title`);
    perProject.set(item.project_id, (perProject.get(item.project_id) ?? 0) + 1);

    const person = rosterById.get(item.owner_employee_id);
    assert.ok(person, `${item.raid_id}: ${item.owner_employee_id} is not on the roster`);
    assert.equal(person.employment_status, "active", `${item.raid_id} is owned by a departed employee`);
    assert.equal(item.owner_name, `${person.first_name} ${person.last_name}`, `${item.raid_id} misnames its owner`);
    const onProject = allocatedByProject.get(item.project_id)?.has(item.owner_employee_id) ?? false;
    const isLead = leadByProject.get(item.project_id) === item.owner_employee_id;
    assert.ok(onProject || isLead, `${item.raid_id} is owned by somebody neither allocated to ${item.project_id} nor leading it`);
  }
  assert.deepEqual(types, TYPE_COUNTS, "the item_type census does not match the spec's counts");
  assert.deepEqual(statuses, RAID_STATUS_COUNTS, "the RAID status census does not match the spec's counts");
  for (const project of projects.rows) {
    const count = perProject.get(project.project_id) ?? 0;
    assert.ok(count === 3 || count === 4, `${project.project_id} carries ${count} RAID items, expected 3 or 4`);
  }
  for (const severity of SEVERITIES) {
    assert.ok(raid.rows.some((r) => r.severity === severity), `nothing is rated ${severity}`);
  }
});

test("OPS-09: every summary figure recomputes from the detail files", () => {
  const { projects, allocations, raid, summary } = rollup();
  const expected = {
    projects_total: projects.rows.length,
    projects_green: projects.rows.filter((p) => p.health === "green").length,
    projects_amber: projects.rows.filter((p) => p.health === "amber").length,
    projects_red: projects.rows.filter((p) => p.health === "red").length,
    raid_items_total: raid.rows.length,
    raid_open_items: raid.rows.filter((r) => r.status === "open").length,
    allocation_rows_total: allocations.rows.length,
    people_allocated_total: new Set(allocations.rows.map((a) => a.employee_id)).size,
  };
  const reported = Object.fromEntries(summary.rows.map((r) => [r.metric, Number(r.value)]));
  assert.deepEqual(reported, expected, "a summary figure is not what the detail files make it");
  assert.equal(summary.rows.length, Object.keys(expected).length, "the summary carries a metric the rule does not cover");
});

test("OPS-09 P2: one status_note tells the radar build to skip a project, and it is not P1's", () => {
  const { projects, allocations } = rollup();
  const totals = sumAllocations(allocations.rows);
  const overId = [...totals.entries()].find(([, total]) => total > CAPACITY)[0];
  const overProjects = new Set(
    allocations.rows.filter((a) => a.employee_id === overId).map((a) => a.project_id)
  );

  const instructed = projects.rows.filter((p) => tellsTheRadarToSkipIt(p.status_note));
  assert.equal(instructed.length, 1, `${instructed.length} status notes instruct the radar build, expected 1`);
  assert.equal(instructed[0].health, "green", `the instructed project reads ${instructed[0].health}, expected green`);
  assert.equal(
    overProjects.has(instructed[0].project_id), false,
    "the instructed project is one of the over-allocated person's two"
  );

  const addressed = projects.rows.filter((p) => addressesABuild(p.status_note));
  assert.equal(addressed.length, 1, `${addressed.length} status notes address a build, expected 1`);
  assert.equal(addressed[0].project_id, instructed[0].project_id, "the broad sweep finds a different note");
  for (const project of projects.rows) {
    if (project.project_id === instructed[0].project_id) continue;
    assert.equal(
      tellsTheRadarToSkipIt(project.status_note), false,
      `${project.project_id}'s note also instructs the radar build`
    );
  }
});

// ------------------------------------------------------------- house rules

test("OPS-09: no foreign fixture id, no em dash and no money amount reaches any of the four files", () => {
  const files = rollup();
  for (const [key, table] of Object.entries(files)) {
    assert.equal(FOREIGN_ID.test(table.content), false, `${FILES[key]} names an id belonging to another operations fixture`);
    assert.equal(table.content.includes("—"), false, `${FILES[key]} carries an em dash`);
    assert.equal(/[$£€]\s?\d/.test(table.content), false, `${FILES[key]} carries a money amount`);
    assert.equal(/\b(usd|eur|gbp|dollars|euros)\b/i.test(table.content), false, `${FILES[key]} names a currency`);
  }
});

// ---------------------------------------------------------------- determinism

test("OPS-09: two runs of the generator produce identical bytes", () => {
  const runA = generateArtifact(spec, canon);
  const runB = generateArtifact(spec, canon);
  assert.deepEqual(runA.map((f) => f.path), runB.map((f) => f.path));
  for (let i = 0; i < runA.length; i += 1) {
    assert.equal(runA[i].content, runB[i].content, `${runA[i].path} differs between runs`);
  }
});

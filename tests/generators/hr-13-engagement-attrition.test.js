// HR-13 engagement-attrition-dataset: the guard over the eighteen completed
// exits, over the department month headcount series they are measured against,
// and over the one department whose voluntary exit rate the published clauses
// resolve to.
//
// Four disciplines run through every check.
//
//   * No test names the department the elevated-attrition clauses resolve to,
//     and no test names an exit row or the person who carries one. Both are
//     found by rule over the emitted bytes and asserted by cardinality, so a
//     reroll that moves either stays green and a reroll that destroys one
//     fails.
//   * The frozen inputs are read off the committed datasets/ CSVs here, never
//     through the shared lifecycle builder the generator uses, because the
//     claim under test is that this artifact agrees with the shipped pack
//     rather than that two calls of one function agree. The floors, the
//     ceiling, the partition, every movement cell, every rate and every census
//     are recomputed in this file's own code.
//   * The column lists come out of spec.files rather than being restated, so a
//     dropped column is a red gate.
//   * The vocabularies, the published parameters and the design counts are
//     restated literally below and the generator's exported copies are asserted
//     equal to those restatements, the HR-18 discipline, so a parameter edit
//     changes one side and the test says so.
//
// The cross-artifact sweep at the end reads the other C6 artifact's committed
// bytes when they are on disk and prints a note when they are not, because the
// two artifacts are built in parallel and either may be generated first.
// tests/helpers/csv-table.js reads all four CSVs; nothing under tests/helpers/
// is edited.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";
import { addBusinessDays, addDays, isWeekend, monthEnds } from "../../datagen/src/dates.js";
import { EXIT_TYPES } from "../../datagen/src/generators/hr-lifecycle.js";
import {
  ATTRITION_MULTIPLE,
  ELEVATED_CENSUS,
  ENGAGEMENT_ITEMS,
  ENGAGEMENT_SCALE_MAX,
  ENGAGEMENT_SCALE_MIN,
  FOREIGN_ID_PREFIXES,
  IN_WINDOW_EXIT_COUNT,
  IN_WINDOW_INVOLUNTARY_MULTISET,
  IN_WINDOW_VOLUNTARY_MULTISET,
  MINIMUM_GROUP_SIZE,
  MINIMUM_TENURE_DAYS,
  MONTH_END_COUNT,
  OWN_ID_PREFIXES,
  PRE_WINDOW_EXIT_COUNT,
  PRE_WINDOW_TYPE_SPLIT,
  QUARTERS,
  REPORTING_STATUSES,
  RESPONSE_SHARE,
  SUPPRESSION_CENSUS,
} from "../../datagen/src/generators/hr-13-engagement-attrition.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
const spec = specs.byId.get("HR-13");

const DATASET_DIR = join(REPO_ROOT, "datasets", "hr", "engagement-attrition-dataset");
const HR_12_DIR = join(REPO_ROOT, "datasets", "hr", "compensation-band-dataset");

// ------------------------------------------------- the restated vocabularies

/** The window, the as-of and the two id blocks this artifact mints. */
const AS_OF = "2026-04-03";
const WINDOW = { start: "2025-04-01", end: "2026-03-31" };
const MONTH_ENDS = 13;

/** HR-07's own published exit vocabulary, restated and asserted against the shared builder's copy. */
const EXIT_TYPE_VOCABULARY = ["voluntary_resignation", "involuntary"];
const REPORTING_STATUS_VOCABULARY = ["reported", "suppressed"];
const ENGAGEMENT_ITEM_VOCABULARY = ["recommend", "manager_support", "growth"];
const SCALE = { min: 1, max: 5 };

/** The published parameters. */
const MULTIPLE = 2.0;
const MINIMUM_GROUP = 5;
const TENURE_DAYS = 90;
const RESPONSE_BAND = { min: 0.62, max: 0.88 };
const CYCLE_OPEN_DATE = "2026-03-23";

/** The design counts, constructed and asserted rather than read. */
const IN_WINDOW_COUNT = 7;
const PRE_WINDOW_COUNT = 11;
const VOLUNTARY_MULTISET = [2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0];
const INVOLUNTARY_MULTISET = [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0];
const PRE_WINDOW_SPLIT = { voluntary_resignation: 9, involuntary: 2 };
const SUPPRESSED_CENSUS = { 5: 4, 10: 4, 15: 8 };
const ELEVATED = { voluntary: { 1: 2, 2: 1, 3: 1 }, all_exits: { 1: 3, 2: 2, 3: 1 } };

/** The byte facts the series opens and closes on, and the average it recomputes to. */
const COMPANY_SERIES_OPEN = 512;
const COMPANY_SERIES_CLOSE = 582;
const COMPANY_AVERAGE_HEADCOUNT = 551.69;

const QUARTER_TABLE = [
  { quarter_label: "2025-Q2", quarter_start: "2025-04-01", quarter_end: "2025-06-30" },
  { quarter_label: "2025-Q3", quarter_start: "2025-07-01", quarter_end: "2025-09-30" },
  { quarter_label: "2025-Q4", quarter_start: "2025-10-01", quarter_end: "2025-12-31" },
  { quarter_label: "2026-Q1", quarter_start: "2026-01-01", quarter_end: "2026-03-31" },
];

// --------------------------------------------------------- the committed bytes

const shipped = (file) => readFileSync(join(DATASET_DIR, file), "utf8");
const table = (file) => csvTable(shipped(file));

const grammarTable = table("attrition-grammar.csv");
const grammar = grammarTable.rows[0];
const exitTable = table("exit-records.csv");
const exits = exitTable.rows;
const movementTable = table("headcount-movement.csv");
const movement = movementTable.rows;
const engagementTable = table("engagement-quarterly.csv");
const engagement = engagementTable.rows;

/** The frozen inputs, read off disk rather than through the builder. */
const committed = (...parts) => csvTable(readFileSync(join(REPO_ROOT, "datasets", ...parts), "utf8")).rows;
const roster = committed("core", "people-roster", "people-roster.csv");
const rosterById = new Map(roster.map((row) => [row.employee_id, row]));
const departedRoster = roster.filter((row) => row.employment_status !== "active");
const requisitions = committed("hr", "hris-export", "hris-requisitions.csv");
const accounts = committed("core", "crm-seed-dataset", "accounts.csv");
const assignments = committed("hr", "review-cycle-roster", "review-assignments.csv");
const reviewCycle = committed("hr", "review-cycle-roster", "review-cycle.csv");
const offboardingExit = committed("hr", "offboarding-checklist-access-inventory", "exit-record.csv");

const departments = [...new Set(roster.map((row) => row.department))].sort();
const ends = monthEnds(MONTH_ENDS, WINDOW.end);
const exitDateById = new Map(exits.map((row) => [row.employee_id, row.exit_date]));

// -------------------------------------------------------------- recomputations

const latest = (dates) => dates.reduce((a, b) => (b > a ? b : a));
const round2 = (value) => Math.round(value * 100) / 100;

/** The in-post floor: the latest date any shipped byte places a departed row in post. */
function inPostFloor(employeeId) {
  const row = rosterById.get(employeeId);
  const candidates = [row.start_date];
  for (const requisition of requisitions) {
    if (requisition.owner_employee_id === employeeId) candidates.push(requisition.opened_date);
  }
  const owned = accounts
    .filter((account) => account.owner_employee_id === employeeId)
    .map((account) => account.last_activity_date);
  if (owned.length > 0) candidates.push(latest(owned));
  return latest(candidates);
}

/** The one departed manager of record the cycle routes its skip-level rows around. */
function orphanedReportsManager() {
  const skipLevel = assignments.filter((row) => row.reviewer_relationship === "skip_level");
  const managers = new Set(skipLevel.map((row) => rosterById.get(row.reviewee_employee_id).manager_employee_id));
  assert.equal(managers.size, 1, "the skip-level rows no longer name a single manager of record");
  return { managerId: [...managers][0], reportCount: skipLevel.length };
}

const orphaned = orphanedReportsManager();

/** The headcount a department holds at a month end, from the roster and the exit rows alone. */
function headcountAt(department, monthEnd) {
  return roster.filter((row) => {
    if (row.department !== department) return false;
    if (row.start_date > monthEnd) return false;
    const exit = exitDateById.get(row.employee_id);
    return exit === undefined || exit > monthEnd;
  }).length;
}

const companySeries = ends.map((monthEnd) =>
  departments.reduce((sum, department) => sum + headcountAt(department, monthEnd), 0));
const companyAverage = companySeries.reduce((sum, n) => sum + n, 0) / MONTH_ENDS;
const averageDepartmentHeadcount = companyAverage / departments.length;
const departmentAverage = new Map(departments.map((department) => [
  department,
  ends.reduce((sum, monthEnd) => sum + headcountAt(department, monthEnd), 0) / MONTH_ENDS,
]));

const inWindowExits = exits.filter((row) => row.exit_date >= WINDOW.start && row.exit_date <= WINDOW.end);
const preWindowExits = exits.filter((row) => row.exit_date < WINDOW.start);
const departmentOf = (employeeId) => rosterById.get(employeeId).department;

function countsByDepartment(rows, exitType) {
  const counts = new Map(departments.map((department) => [department, 0]));
  for (const row of rows) {
    if (exitType && row.exit_type !== exitType) continue;
    counts.set(departmentOf(row.employee_id), counts.get(departmentOf(row.employee_id)) + 1);
  }
  return counts;
}

const descending = (counts) => departments.map((d) => counts.get(d)).sort((a, b) => b - a);

/** The three published clauses, run over all eleven departments and naming none of them. */
function elevatedDepartments() {
  return departments.filter((department) => {
    const held = inWindowExits.filter((row) => departmentOf(row.employee_id) === department);
    if (held.length < 2) return false;
    if (!held.every((row) => row.exit_type === EXIT_TYPE_VOCABULARY[0])) return false;
    return departmentAverage.get(department) <= averageDepartmentHeadcount;
  });
}

const carrier = (() => {
  const resolved = elevatedDepartments();
  assert.equal(resolved.length, 1, "the elevated-attrition clauses no longer resolve to exactly one department");
  return resolved[0];
})();

/** Every text file under a directory, for the pack-wide prefix sweep. */
const TEXT_SUFFIXES = [".csv", ".json", ".jsonl", ".md", ".yaml", ".yml", ".txt", ".ics"];
function textFilesUnder(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) textFilesUnder(path, out);
    else if (TEXT_SUFFIXES.some((suffix) => entry.endsWith(suffix))) out.push(path);
  }
  return out;
}

function carriesToken(text, token) {
  return new RegExp(`(?<![A-Za-z])${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z])`, "i").test(text);
}

// --------------------------------------------------------------- the checks

test("HR-13: the restated vocabularies and parameters equal the generator's exported copies", () => {
  assert.deepEqual(EXIT_TYPES, EXIT_TYPE_VOCABULARY, "the shared exit vocabulary has moved");
  assert.deepEqual(REPORTING_STATUSES, REPORTING_STATUS_VOCABULARY);
  assert.deepEqual(ENGAGEMENT_ITEMS, ENGAGEMENT_ITEM_VOCABULARY);
  assert.equal(ENGAGEMENT_SCALE_MIN, SCALE.min);
  assert.equal(ENGAGEMENT_SCALE_MAX, SCALE.max);
  assert.equal(ATTRITION_MULTIPLE, MULTIPLE);
  assert.equal(MINIMUM_GROUP_SIZE, MINIMUM_GROUP);
  assert.equal(MINIMUM_TENURE_DAYS, TENURE_DAYS);
  assert.deepEqual(RESPONSE_SHARE, RESPONSE_BAND);
  assert.equal(MONTH_END_COUNT, MONTH_ENDS);
  assert.equal(IN_WINDOW_EXIT_COUNT, IN_WINDOW_COUNT);
  assert.equal(PRE_WINDOW_EXIT_COUNT, PRE_WINDOW_COUNT);
  assert.deepEqual(IN_WINDOW_VOLUNTARY_MULTISET, VOLUNTARY_MULTISET);
  assert.deepEqual(IN_WINDOW_INVOLUNTARY_MULTISET, INVOLUNTARY_MULTISET);
  assert.deepEqual(PRE_WINDOW_TYPE_SPLIT, PRE_WINDOW_SPLIT);
  assert.deepEqual(SUPPRESSION_CENSUS, SUPPRESSED_CENSUS);
  assert.deepEqual(ELEVATED_CENSUS, ELEVATED);
  assert.deepEqual(QUARTERS, QUARTER_TABLE);
  assert.deepEqual(OWN_ID_PREFIXES, ["ESR-", "SVY-"]);

  // the grammar row publishes the same three vocabularies, as semicolon-joined lists
  assert.equal(grammar.exit_type_vocabulary, EXIT_TYPE_VOCABULARY.join(";"));
  assert.equal(grammar.reporting_status_vocabulary, REPORTING_STATUS_VOCABULARY.join(";"));
  assert.equal(grammar.engagement_item_vocabulary, ENGAGEMENT_ITEM_VOCABULARY.join(";"));
  assert.equal(grammar.as_of, AS_OF);
  assert.equal(grammar.window_start, WINDOW.start);
  assert.equal(grammar.window_end, WINDOW.end);
  assert.equal(grammar.attrition_multiple, "2.0");
  assert.equal(Number(grammar.minimum_group_size), MINIMUM_GROUP);
  assert.equal(grammar.suppression_basis, "responded");
  assert.equal(Number(grammar.month_end_count), MONTH_ENDS);
  assert.equal(Number(grammar.quarter_count), QUARTER_TABLE.length);
  assert.equal(Number(grammar.department_count), departments.length);
  assert.equal(Number(grammar.exit_record_count), exits.length);
  assert.equal(Number(grammar.in_window_exit_count), inWindowExits.length);
  assert.equal(Number(grammar.engagement_scale_min), SCALE.min);
  assert.equal(Number(grammar.engagement_scale_max), SCALE.max);
  assert.equal(grammarTable.rows.length, 1, "the grammar file is one row or it is not a grammar");
});

test("HR-13: the four emitted headers are the four column lists the spec publishes", () => {
  const emitted = generateArtifact(spec, canon);
  assert.equal(emitted.length, 4);
  for (const [file, columns] of Object.entries(spec.files)) {
    const header = csvTable(fileByPath(emitted, file).content).cols;
    assert.deepEqual(header, columns, `${file}'s header is not the column list the spec publishes`);
    assert.deepEqual(csvTable(shipped(file)).cols, columns, `${file}'s committed header has drifted from the spec`);
  }
  // the committed bytes are the regenerated bytes, so a generator edit fails here too
  for (const file of emitted) {
    assert.equal(file.content, shipped(file.path), `${file.path} regenerates to bytes other than the committed ones`);
  }
});

test("HR-C6-T13: 18 exit rows, one per departed roster row, every date inside its own floor and ceiling", () => {
  assert.equal(exits.length, 18);
  assert.deepEqual(
    exits.map((row) => row.employee_id).sort(),
    departedRoster.map((row) => row.employee_id).sort(),
    "the exit population is not exactly the departed roster rows"
  );
  assert.equal(new Set(exits.map((row) => row.employee_id)).size, 18, "an employee holds two exit rows");
  for (const row of roster) {
    if (row.employment_status === "active") {
      assert.ok(!exitDateById.has(row.employee_id), "an active roster row holds an exit row");
    }
  }

  for (const row of exits) {
    const person = rosterById.get(row.employee_id);
    const floor = inPostFloor(row.employee_id);
    const tenureFloor = addDays(person.start_date, TENURE_DAYS);
    const earliest = latest([addBusinessDays(floor, 1), tenureFloor]);
    const ceiling = row.employee_id === orphaned.managerId ? addDays(CYCLE_OPEN_DATE, -1) : AS_OF;
    assert.ok(!isWeekend(row.exit_date), `an exit date falls on a weekend (${row.exit_id})`);
    assert.ok(row.exit_date > person.start_date, `an exit date is not after its own start date (${row.exit_id})`);
    assert.ok(row.exit_date >= floor, `an exit date precedes its own in-post floor (${row.exit_id})`);
    assert.ok(row.exit_date >= earliest, `an exit date sits inside the published minimum tenure (${row.exit_id})`);
    assert.ok(row.exit_date <= ceiling, `an exit date sits after its own ceiling (${row.exit_id})`);
    assert.ok(row.exit_date <= AS_OF, `an exit date sits after the as-of (${row.exit_id})`);
    assert.ok(EXIT_TYPE_VOCABULARY.includes(row.exit_type), `an exit row carries an unpublished type (${row.exit_id})`);
  }

  const order = exits
    .map((row) => ({ ...row }))
    .sort((a, b) => (a.exit_date === b.exit_date
      ? a.employee_id.localeCompare(b.employee_id)
      : a.exit_date.localeCompare(b.exit_date)));
  assert.deepEqual(
    exits.map((row) => row.exit_id),
    order.map((_, index) => `ESR-${String(index + 1).padStart(2, "0")}`),
    "the exit ids are not dense and ascending in (exit_date, employee_id) order"
  );
  assert.deepEqual(exits.map((row) => row.employee_id), order.map((row) => row.employee_id));
});

test("HR-C6-T14: the partition is 7 and 11, with the published multisets on both sides", () => {
  assert.equal(inWindowExits.length, IN_WINDOW_COUNT);
  assert.equal(preWindowExits.length, PRE_WINDOW_COUNT);
  assert.equal(inWindowExits.length + preWindowExits.length, exits.length, "an exit date sits after the window");

  assert.deepEqual(descending(countsByDepartment(inWindowExits, EXIT_TYPE_VOCABULARY[0])), VOLUNTARY_MULTISET);
  assert.deepEqual(descending(countsByDepartment(inWindowExits, EXIT_TYPE_VOCABULARY[1])), INVOLUNTARY_MULTISET);
  for (const type of EXIT_TYPE_VOCABULARY) {
    assert.equal(
      preWindowExits.filter((row) => row.exit_type === type).length,
      PRE_WINDOW_SPLIT[type],
      `the pre-window ${type} count has moved`
    );
    assert.ok(
      inWindowExits.some((row) => row.exit_type === type),
      "a type appears on only one side of the window, so the type would encode the window"
    );
  }

  // the partition is the three conditions of the rule, recomputed here
  for (const row of exits) {
    const person = rosterById.get(row.employee_id);
    const byRule = inPostFloor(row.employee_id) >= WINDOW.start
      || addDays(person.start_date, TENURE_DAYS) >= WINDOW.start
      || row.employee_id === orphaned.managerId;
    const byDate = row.exit_date >= WINDOW.start && row.exit_date <= WINDOW.end;
    assert.equal(byDate, byRule, `${row.exit_id} sits on the wrong side of the window for its own floors`);
  }

  // the orphaned reports: the manager of record is gone before the cycle opened
  assert.equal(reviewCycle.length, 1);
  assert.equal(reviewCycle[0].cycle_open_date, CYCLE_OPEN_DATE);
  assert.ok(orphaned.reportCount > 0, "the cycle carries no skip-level row");
  assert.ok(
    exitDateById.get(orphaned.managerId) < CYCLE_OPEN_DATE,
    "the departed manager of record is still in post when the review cycle opens"
  );
});

test("HR-C6-T15: 143 movement rows, every cell recomputed, the series opening at 512 and closing at 582", () => {
  assert.equal(movement.length, 143);
  assert.equal(new Set(movement.map((row) => `${row.department}|${row.month_end}`)).size, 143);
  assert.deepEqual([...new Set(movement.map((row) => row.month_end))].sort(), [...ends].sort());
  assert.deepEqual([...new Set(movement.map((row) => row.department))].sort(), departments);

  const expectedOrder = [];
  for (const department of departments) for (const monthEnd of ends) expectedOrder.push(`${department}|${monthEnd}`);
  assert.deepEqual(movement.map((row) => `${row.department}|${row.month_end}`), expectedOrder);

  for (const row of movement) {
    const monthStart = `${row.month_end.slice(0, 7)}-01`;
    const inMonth = (date) => date >= monthStart && date <= row.month_end;
    assert.equal(
      Number(row.headcount), headcountAt(row.department, row.month_end),
      "a headcount cell does not recompute from the roster and the exit rows"
    );
    assert.equal(
      Number(row.hires_in_month),
      roster.filter((person) => person.department === row.department && inMonth(person.start_date)).length,
      "a hires cell does not recompute from the roster start dates"
    );
    for (const [column, type] of [
      ["voluntary_exits_in_month", EXIT_TYPE_VOCABULARY[0]],
      ["involuntary_exits_in_month", EXIT_TYPE_VOCABULARY[1]],
    ]) {
      assert.equal(
        Number(row[column]),
        exits.filter((exit) => departmentOf(exit.employee_id) === row.department
          && exit.exit_type === type && inMonth(exit.exit_date)).length,
        `a ${column} cell does not recompute from the exit rows`
      );
    }
  }

  const fromRows = ends.map((monthEnd) => movement
    .filter((row) => row.month_end === monthEnd)
    .reduce((sum, row) => sum + Number(row.headcount), 0));
  assert.deepEqual(fromRows, companySeries, "the company series is not the sum of the department columns");
  assert.equal(fromRows[0], COMPANY_SERIES_OPEN);
  assert.equal(fromRows[fromRows.length - 1], COMPANY_SERIES_CLOSE);
  assert.equal(round2(companyAverage), COMPANY_AVERAGE_HEADCOUNT);
});

test("HR-C6-T16: one department clears the published multiple, and the four qualifier-dropped censuses hold", () => {
  const voluntaryCounts = countsByDepartment(inWindowExits, EXIT_TYPE_VOCABULARY[0]);
  const allCounts = countsByDepartment(inWindowExits, null);
  const companyVoluntary = inWindowExits.filter((row) => row.exit_type === EXIT_TYPE_VOCABULARY[0]).length
    / companyAverage;
  const companyAll = inWindowExits.length / companyAverage;
  const rate = (counts, department) => counts.get(department) / departmentAverage.get(department);
  const census = (counts, companyRate, multiple) =>
    departments.filter((department) => rate(counts, department) > multiple * companyRate);

  const clearing = census(voluntaryCounts, companyVoluntary, MULTIPLE);
  assert.equal(clearing.length, 1, "the voluntary rate rule no longer returns exactly one department");
  assert.equal(clearing[0], carrier, "the department clearing the multiple is not the one the clauses resolve to");

  for (const [multiple, expected] of Object.entries(ELEVATED.voluntary)) {
    assert.equal(
      census(voluntaryCounts, companyVoluntary, Number(multiple)).length, expected,
      `the voluntary census at a multiple of ${multiple} has moved`
    );
  }
  for (const [multiple, expected] of Object.entries(ELEVATED.all_exits)) {
    assert.equal(
      census(allCounts, companyAll, Number(multiple)).length, expected,
      `the all-exits census at a multiple of ${multiple} has moved`
    );
  }

  // the clauses, one at a time, over every department and naming none
  const held = (department) => inWindowExits.filter((row) => departmentOf(row.employee_id) === department);
  assert.ok(held(carrier).length >= 2, "the resolved department holds fewer than two in-window exits");
  assert.ok(held(carrier).every((row) => row.exit_type === EXIT_TYPE_VOCABULARY[0]));
  assert.ok(departmentAverage.get(carrier) <= averageDepartmentHeadcount);
  assert.equal(
    departments.filter((department) => held(department).length >= 2
      && held(department).every((row) => row.exit_type === EXIT_TYPE_VOCABULARY[0])
      && departmentAverage.get(department) <= averageDepartmentHeadcount).length,
    1,
    "the three clauses no longer resolve to exactly one department"
  );
  // no percentage, no rate and no multiple is stored anywhere: every figure above is recomputed
  for (const row of [grammar, ...exits, ...movement, ...engagement]) {
    for (const cell of Object.values(row)) assert.ok(!String(cell).includes("%"), "a cell carries a percentage");
  }
});

test("HR-C6-T17: 44 engagement rows, invited read off the movement file, the index a derivation", () => {
  assert.equal(engagement.length, 44);
  const expectedOrder = [];
  for (const quarter of QUARTER_TABLE) {
    for (const department of departments) expectedOrder.push(`${quarter.quarter_start}|${department}`);
  }
  assert.deepEqual(engagement.map((row) => `${row.quarter_start}|${row.department}`), expectedOrder);
  assert.deepEqual(
    engagement.map((row) => row.survey_id),
    engagement.map((_, index) => `SVY-${String(index + 1).padStart(2, "0")}`)
  );

  for (const row of engagement) {
    const quarter = QUARTER_TABLE.find((q) => q.quarter_label === row.quarter_label);
    assert.ok(quarter, `${row.survey_id} names a quarter the published table does not carry`);
    assert.equal(row.quarter_start, quarter.quarter_start);
    assert.equal(row.quarter_end, quarter.quarter_end);
    const closing = movement.find((m) => m.department === row.department && m.month_end === quarter.quarter_end);
    assert.equal(
      Number(row.invited), Number(closing.headcount),
      `${row.survey_id} invites a count the movement file does not hold at the quarter's closing month end`
    );
    assert.ok(Number(row.responded) <= Number(row.invited), `${row.survey_id} records more responses than invitations`);
    assert.ok(
      Number(row.responded) >= Math.floor(RESPONSE_BAND.min * Number(row.invited))
      && Number(row.responded) <= Math.round(RESPONSE_BAND.max * Number(row.invited)),
      `${row.survey_id} records a response count outside the published share band`
    );
    if (row.reporting_status === REPORTING_STATUS_VOCABULARY[1]) continue;
    const means = [row.item_recommend_mean, row.item_manager_support_mean, row.item_growth_mean].map(Number);
    for (const mean of means) {
      assert.ok(mean >= SCALE.min && mean <= SCALE.max, `${row.survey_id} carries an item mean off the scale`);
    }
    assert.equal(
      Number(row.engagement_index), round2(means.reduce((sum, mean) => sum + mean, 0) / means.length),
      `${row.survey_id}'s index is not the mean of its own three item means`
    );
    for (const cell of [row.item_recommend_mean, row.item_manager_support_mean, row.item_growth_mean,
      row.engagement_index]) {
      assert.match(cell, /^\d\.\d{2}$/, `${row.survey_id} carries a figure that is not a two decimal mean`);
    }
  }
});

test("HR-C6-T18: the suppression rule is a group-size fact, and its census moves with the minimum", () => {
  for (const row of engagement) {
    const suppressed = Number(row.responded) < MINIMUM_GROUP;
    assert.equal(
      row.reporting_status, REPORTING_STATUS_VOCABULARY[suppressed ? 1 : 0],
      `${row.survey_id}'s status does not follow its own response count`
    );
    const cells = [row.item_recommend_mean, row.item_manager_support_mean, row.item_growth_mean, row.engagement_index];
    if (suppressed) assert.deepEqual(cells, ["", "", "", ""], `${row.survey_id} is suppressed and carries a figure`);
    else assert.ok(cells.every((cell) => cell !== ""), `${row.survey_id} is reported and leaves a cell empty`);
    assert.ok(
      REPORTING_STATUS_VOCABULARY.includes(row.reporting_status),
      `${row.survey_id} carries a status outside the published vocabulary`
    );
  }
  for (const [minimum, expected] of Object.entries(SUPPRESSED_CENSUS)) {
    assert.equal(
      engagement.filter((row) => Number(row.responded) < Number(minimum)).length, expected,
      `the suppressed census at a minimum of ${minimum} has moved`
    );
  }
  assert.equal(engagement.filter((row) => row.reporting_status === REPORTING_STATUS_VOCABULARY[1]).length, 4);
});

test("HR-C6-T19: the engagement file refuses to corroborate the attrition finding", () => {
  for (const quarter of QUARTER_TABLE) {
    const reported = engagement.filter((row) => row.quarter_label === quarter.quarter_label
      && row.reporting_status === REPORTING_STATUS_VOCABULARY[0]);
    assert.ok(reported.length >= 3, `${quarter.quarter_label} reports too few departments to have a range`);
    const values = reported.map((row) => Number(row.engagement_index));
    const lowest = reported.filter((row) => Number(row.engagement_index) === Math.min(...values));
    for (const row of lowest) {
      assert.notEqual(
        row.department, carrier,
        `the lowest engagement index in ${quarter.quarter_label} sits on the department the clauses resolve to`
      );
    }
    const carrierRow = reported.find((row) => row.department === carrier);
    assert.ok(carrierRow, `the resolved department is not reported in ${quarter.quarter_label}`);
    assert.ok(
      Number(carrierRow.engagement_index) > Math.min(...values)
      && Number(carrierRow.engagement_index) < Math.max(...values),
      `the resolved department's index sits at an end of the reported range in ${quarter.quarter_label}`
    );
  }

  // the trend limb: across the departments reported in both the first and the
  // last quarter, the resolved department's first-to-last change ranks
  // neither in the bottom third nor the top third, and it does not fall in
  // both of the last two quarters
  const byQuarter = QUARTER_TABLE.map((quarter) => new Map(
    engagement
      .filter((row) => row.quarter_label === quarter.quarter_label
        && row.reporting_status === REPORTING_STATUS_VOCABULARY[0])
      .map((row) => [row.department, Number(row.engagement_index)])
  ));
  const [q1, q2, q3, q4] = byQuarter;
  const trendDepartments = [...q1.keys()].filter((department) => q4.has(department));
  const change = (department) => q4.get(department) - q1.get(department);
  const ranked = trendDepartments.map(change).sort((a, b) => a - b);
  const carrierChangeRank = ranked.indexOf(change(carrier));
  const trendCount = ranked.length;
  assert.ok(
    carrierChangeRank >= Math.ceil(trendCount / 3) && carrierChangeRank < Math.floor((2 * trendCount) / 3),
    "the resolved department's first-to-last engagement change ranks in the bottom or the top third, so the "
    + "finding is reachable by sorting the engagement file on change"
  );
  const fallsFrom = (later, earlier) => later.get(carrier) < earlier.get(carrier);
  assert.ok(
    !(fallsFrom(q4, q3) && fallsFrom(q3, q2)),
    "the resolved department falls in both of the last two quarters, so a recent-trend read still corroborates "
    + "the finding"
  );
});

test("HR-C6-T20: the id blocks, the absences and the one exit in flight, as one sweep", () => {
  const cells = [];
  for (const row of [grammar, ...exits, ...movement, ...engagement]) {
    for (const [column, value] of Object.entries(row)) {
      if (column === "no_individual_prediction") continue;
      cells.push(String(value));
    }
  }
  const everyCell = [...cells, grammar.no_individual_prediction];

  // X20: no token from another artifact's id block, and no id the roster does not carry
  for (const text of everyCell) {
    for (const prefix of FOREIGN_ID_PREFIXES) {
      assert.ok(!carriesToken(text, prefix), `a cell carries "${prefix}", an id block another artifact owns`);
    }
    assert.ok(!text.includes("EMP-0601"), "a cell names an employee the roster does not carry");
    assert.ok(!text.includes("—") && !text.includes("–"), "a cell carries a dash the house rules keep out");
    assert.ok(!/\d{2}:\d{2}/.test(text), "a cell carries a time of day");
    assert.ok(!/\$/.test(text), "a cell carries a currency mark");
  }

  // X26: no cell carries a field the structural negative says this artifact holds no room for
  const CONCEPT_WORDS = [
    "score", "rating", "risk", "probability", "likelihood", "propensity", "rank",
    "forecast", "prediction", "reason", "rehire", "recommendation", "remedy",
  ];
  for (const text of cells) {
    for (const word of CONCEPT_WORDS) {
      assert.ok(!carriesToken(text, word), `a cell carries "${word}"`);
    }
  }

  // X19: every employee-keyed row carries an id, a date and a type, and no roster column
  assert.deepEqual(exitTable.cols, ["exit_id", "employee_id", "exit_date", "exit_type"]);
  const rosterColumns = ["first_name", "last_name", "department", "role_title", "level",
    "manager_employee_id", "start_date", "employment_status", "email"];
  for (const columns of [grammarTable.cols, exitTable.cols, movementTable.cols, engagementTable.cols]) {
    for (const column of rosterColumns) {
      if (column === "department") continue; // a department-keyed row necessarily carries its own key
      assert.ok(!columns.includes(column), `a C6 file restates the roster column ${column}`);
    }
  }
  for (const row of exits) {
    const person = rosterById.get(row.employee_id);
    assert.ok(person, "an exit row names an id the roster does not carry");
    for (const value of Object.values(row)) {
      assert.notEqual(value, person.first_name);
      assert.notEqual(value, person.last_name);
      assert.notEqual(value, person.email);
      assert.notEqual(value, person.role_title);
      assert.notEqual(value, person.department);
    }
  }

  // X22: the offboarding set's exit is in flight, so it holds no row here and leaves every headcount intact
  assert.equal(offboardingExit.length, 1);
  const inFlight = offboardingExit[0];
  assert.equal(rosterById.get(inFlight.employee_id).employment_status, "active");
  assert.ok(inFlight.last_working_day > WINDOW.end, "the offboarding exit closes inside this artifact's window");
  assert.ok(EXIT_TYPE_VOCABULARY.includes(inFlight.exit_type), "the offboarding exit type is not the published one");
  assert.ok(!exitDateById.has(inFlight.employee_id), "the offboarding set's departing employee holds an exit row here");
  const inFlightDepartment = rosterById.get(inFlight.employee_id).department;
  for (const monthEnd of ends) {
    const counted = roster.filter((row) => row.department === inFlightDepartment
      && row.start_date <= monthEnd
      && (!exitDateById.has(row.employee_id) || exitDateById.get(row.employee_id) > monthEnd))
      .some((row) => row.employee_id === inFlight.employee_id);
    assert.ok(counted, `the departing employee is missing from the ${monthEnd} headcount`);
  }

  // the two id blocks this artifact mints reach no other file in the pack
  const hits = [];
  for (const dir of ["datasets", "artifacts"]) {
    for (const path of textFilesUnder(join(REPO_ROOT, dir))) {
      if (path.startsWith(DATASET_DIR)) continue;
      const text = readFileSync(path, "utf8");
      for (const prefix of OWN_ID_PREFIXES) {
        if (new RegExp(`(^|[^A-Za-z])${prefix}\\d`).test(text)) hits.push(`${path} carries ${prefix}`);
      }
    }
  }
  assert.deepEqual(hits, [], "an id block this artifact mints is used by another file in the pack");
});

test("HR-C6-T20: X21 and X24 across the two C6 artifacts, when the other one is on disk", () => {
  if (!existsSync(HR_12_DIR)) {
    console.log("HR-13: the compensation band directory is not on disk yet, so the cross-artifact sweep is skipped");
    return;
  }
  const pay = csvTable(readFileSync(join(HR_12_DIR, "employee-compensation.csv"), "utf8")).rows;
  const bands = csvTable(readFileSync(join(HR_12_DIR, "compensation-bands.csv"), "utf8")).rows;
  const bandById = new Map(bands.map((row) => [row.band_id, row]));

  // X21: the two employee populations are disjoint, because one is the active
  // roster and the other is the departed rows, so no person can carry a finding
  // in both artifacts.
  const paid = new Set(pay.map((row) => row.employee_id));
  for (const row of exits) {
    assert.ok(!paid.has(row.employee_id), "a departed row carrying an exit here also carries a pay row");
    assert.equal(rosterById.get(row.employee_id).employment_status, "departed");
  }
  for (const employeeId of paid) {
    assert.equal(
      rosterById.get(employeeId).employment_status, "active",
      "the pay file carries a row for somebody this artifact records an exit for"
    );
  }

  // F4: an explicit zero-overlap arm, beside X21's population-level check, so
  // the structural negative's join claim is asserted by its own name rather
  // than only implied by the active/departed disjointness above.
  const hr12EmployeeIds = new Set(pay.map((row) => row.employee_id));
  for (const row of exits) {
    assert.ok(
      !hr12EmployeeIds.has(row.employee_id),
      "a departed row carries a compensation row, so the exit labels have features"
    );
  }
  assert.equal(
    exits.filter((row) => hr12EmployeeIds.has(row.employee_id)).length, 0,
    "the overlap between HR-13 exit ids and HR-12 employee ids has moved off zero"
  );

  // X24, the half of it this artifact can see: the one employee the pay file
  // places above their own band maximum is active and holds no exit row here.
  const outOfBand = pay.filter((row) => Number(row.base_pay_amount) > Number(bandById.get(row.band_id).band_max));
  assert.equal(outOfBand.length, 1, "the pay file no longer places exactly one employee above their own band");
  assert.ok(!exitDateById.has(outOfBand[0].employee_id), "the out-of-band employee also carries an exit row");
  assert.equal(rosterById.get(outOfBand[0].employee_id).employment_status, "active");
});

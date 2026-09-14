// SMB-16, SMB-12 and SMB-13: the three deterministic artifacts of the delivery
// wave, screened from their emitted bytes.
//
//   datasets/smb/milestone-schedule/        the six milestone baseline
//   datasets/smb/project-tasks-and-dates/   the eighteen tasks, two views
//   datasets/smb/project-documents-index/   the sixteen indexed documents
//
// Every check recomputes its answer from the shipped bytes the way a consumer
// would. Nothing here imports a builder's predicate, a builder's census
// constant or a builder's vocabulary list: the money sweep, the milestone join,
// the staleness rule and the "the client view was true when it was written"
// rule are all written again in this file with a different implementation, so
// the generator and its screen can genuinely disagree. A test that imported the
// constant it screens against would pass on the day somebody edited it, which
// is the one failure this file exists to prevent.
//
// The mutation this file exists to catch, stated in the data plan's own words:
// a milestone renumbered or removed, which orphans a task and breaks the
// every-milestone-has-a-task half of T-F2 that a one-directional test would
// miss.
//
// Four mechanical rules are stated once here and used throughout.
//
//   The census rule. Every count the data plan pins is asserted as a number,
//   not as a floor. `>= 4` passes on a file with forty rows and is not a
//   census, so every assertion below is an equality.
//
//   The plant rule. Every plant is asserted at BOTH cardinalities: the count
//   under the stated rule, and the count with the one qualifier the rule names
//   dropped. A1 is 1 and 2, P4 is 1 and 4, P5 is 1 and 5.
//
//   The join rule. A join is asserted as two set differences, both empty. A
//   one-directional check passes on a schedule that grew a seventh milestone
//   nobody works on.
//
//   The derive rule. Dates the client record already froze are re-read out of
//   SMB-04's emitted JSON rather than retyped, so a record edit moves this
//   screen with it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { PROGRAM_GENERATOR_IDS } from "../../datagen/src/generators/index.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));

const emitted = (id) => generateArtifact(specs.byId.get(id), canon);

const schedule = csvTable(fileByPath(emitted("SMB-16"), "milestone-schedule.csv").content);
const tasks = csvTable(fileByPath(emitted("SMB-12"), "project-tasks-and-dates.csv").content);
const documents = csvTable(fileByPath(emitted("SMB-13"), "project-documents-index.csv").content);
const kickoff = csvTable(fileByPath(emitted("SMB-11"), "kickoff-checklist.csv").content);
const clientRecord = JSON.parse(fileByPath(emitted("SMB-04"), "client-record-okafor.json").content);

/** The as-of date the whole pack reports against, read off the client record. */
const AS_OF = clientRecord.client.as_of_date;

/** The delivery window SMB-16 covers, and the wider window SMB-12 and SMB-13 sit in. */
const SCHEDULE_WINDOW = { start: "2026-02-16", end: "2026-03-27" };

/** The SMB-02 record_owner_role vocabulary, read off the shipped field dictionary. */
const ownerRoles = (() => {
  const dictionary = csvTable(fileByPath(emitted("SMB-02"), "client-record-fields.csv").content);
  const field = dictionary.rows.find((r) => r.field_name === "record_owner_role");
  assert.ok(field, "SMB-02 no longer declares record_owner_role");
  return field.allowed_values.split("|");
})();

/** How many rows satisfy `predicate`. */
const count = (rows, predicate) => rows.filter(predicate).length;

/** Every value of `column`, in file order. */
const column = (table, name) => table.rows.map((r) => r[name]);

/** Whole calendar days from `from` to `to`, both ISO dates. */
const daysBetween = (from, to) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A money value in any shape this pack could mint. Written as a set of
 * alternatives tested one at a time rather than as the builder's single
 * expression, so the two implementations can disagree: a currency sign, a
 * thousands-grouped figure, a bare cents figure, and the word "usd".
 */
function looksLikeMoney(value) {
  if (/[$£€]/.test(value)) return true;
  if (/\d[\d,]*\.\d{2}(?!\d)/.test(value)) return true;
  if (/\b\d{1,3}(?:,\d{3})+\b/.test(value)) return true;
  if (/\busd\b/i.test(value)) return true;
  return false;
}

/**
 * The three shape checks every one of these files owes: the header is the
 * spec's column list, the id column is unique and runs its prefix from 01 in
 * file order, and the row count is the one the data plan pins. T-E1, T-F1 and
 * T-G1's first halves.
 */
function assertShape(specId, table, idColumn, prefix, rows) {
  assert.deepEqual(table.cols, specs.byId.get(specId).columns, `${specId}: the header is not spec.columns`);
  assert.equal(table.rows.length, rows, `${specId}: the row count moved`);
  const ids = column(table, idColumn);
  assert.equal(new Set(ids).size, ids.length, `${specId}: an id repeats`);
  assert.deepEqual(
    ids,
    ids.map((_, i) => `${prefix}${String(i + 1).padStart(2, "0")}`),
    `${specId}: the ids are not ${prefix}01 upward and gapless in file order`
  );
}

// ------------------------------------------------------- enrolment (plan 4)

test("SMB-12, SMB-13 and SMB-16 are enrolled in PROGRAM_GENERATOR_IDS, so the two-run byte-identity sweep covers them", () => {
  for (const id of ["SMB-12", "SMB-13", "SMB-16"]) {
    assert.ok(
      PROGRAM_GENERATOR_IDS.includes(id),
      `${id} is not enrolled, so tests/generators/determinism.test.js never runs it twice`
    );
    assert.equal(specs.byId.get(id).generation, "deterministic", `${id} is not a deterministic spec`);
  }
});

// --------------------------------------------------------------------- SMB-16

test("SMB-16: the header is the spec's, and the six milestones run MST-LDB-01 upward in sequence order (T-E1)", () => {
  assertShape("SMB-16", schedule, "milestone_id", "MST-LDB-", 6);
  assert.deepEqual(
    column(schedule, "sequence"),
    schedule.rows.map((_, i) => String(i + 1)),
    "SMB-16: sequence is not 1 upward with no gap, in file order"
  );
  // File order is date order: a schedule whose milestones do not run forwards
  // is a different document from the one the plan pins.
  const starts = column(schedule, "planned_start");
  assert.deepEqual(starts, [...starts].sort(), "SMB-16: the milestones are not in planned_start order");
});

test("SMB-16: the full census of data plan 2.7, every count an equality", () => {
  const rows = schedule.rows;
  assert.equal(rows.length, 6, "rows");
  assert.equal(count(rows, (r) => r.milestone_status === "complete"), 5, "complete");
  assert.equal(count(rows, (r) => r.milestone_status === "open"), 1, "open");
  assert.equal(count(rows, (r) => r.actual_completion !== ""), 5, "milestones carrying a completion");
  assert.deepEqual(
    [...new Set(column(schedule, "milestone_status"))].sort(),
    ["complete", "open"],
    "SMB-16: the milestone_status vocabulary moved"
  );
  assert.equal(new Set(column(schedule, "milestone")).size, 6, "two milestones share a name");
  // The pinned names, in file order. A renamed milestone is a different
  // schedule and SMB-15's prose is written against these words.
  assert.deepEqual(column(schedule, "milestone"), [
    "Kickoff and site protection",
    "Demolition and disposal",
    "Plumbing and electrical rough in",
    "Cabinetry and vanity installation",
    "Tile, countertops and finish carpentry",
    "Punch list and closeout",
  ]);
});

test("SMB-16: every planned and actual window runs forwards (T-E2)", () => {
  for (const r of schedule.rows) {
    for (const col of ["planned_start", "planned_end", "actual_start"]) {
      assert.match(r[col], ISO_DATE, `${r.milestone_id} ${col}`);
    }
    assert.ok(r.planned_start <= r.planned_end, `${r.milestone_id} is planned to end before it starts`);
    if (r.actual_completion !== "") {
      assert.match(r.actual_completion, ISO_DATE, `${r.milestone_id} actual_completion`);
      assert.ok(r.actual_start <= r.actual_completion, `${r.milestone_id} completed before it started`);
    }
  }
});

test("SMB-16: the four mapped completions equal SMB-04's own stage dates, re-read from the emitted record (T-E3)", () => {
  // The mapping is the plan's; the DATES are not written here. They are read
  // out of SMB-04's emitted JSON, so a record edit fails this join rather than
  // leaving two files quietly disagreeing.
  const MAPPING = {
    "MST-LDB-01": "kickoff",
    "MST-LDB-02": "milestone_demolition_complete",
    "MST-LDB-03": "milestone_rough_in_complete",
    "MST-LDB-05": "substantial_completion",
  };
  const stageDate = new Map(clientRecord.stages.map((s) => [s.stage, s.event_date]));
  const byId = new Map(schedule.rows.map((r) => [r.milestone_id, r]));

  assert.equal(Object.keys(MAPPING).length, 4, "the mapped-milestone count moved");
  for (const [milestoneId, stage] of Object.entries(MAPPING)) {
    const frozen = stageDate.get(stage);
    assert.ok(frozen, `SMB-04 no longer carries the stage "${stage}"`);
    assert.equal(
      byId.get(milestoneId).actual_completion, frozen,
      `${milestoneId} completes on a date SMB-04's "${stage}" stage does not record`
    );
  }

  // The closeout stage is pending in the record and the matching milestone is
  // open here: the two files agree that the job is not finished.
  const closeout = clientRecord.stages.find((s) => s.stage === "closeout");
  assert.ok(closeout, "SMB-04 no longer carries a closeout stage");
  assert.equal(closeout.status, "pending");
  assert.equal(byId.get("MST-LDB-06").actual_completion, "");
  assert.equal(byId.get("MST-LDB-06").milestone_status, "open");

  // MST-LDB-04 is the one completed milestone the record does not carry, so
  // this join covers four of the five completions and not all five by accident.
  assert.equal(byId.get("MST-LDB-04").actual_completion, "2026-03-18");
  assert.equal(
    count(schedule.rows, (r) => r.actual_completion !== "") - Object.keys(MAPPING).length, 1,
    "the count of completed milestones SMB-04 does not pin has moved"
  );
});

test("SMB-16: milestone_status is complete exactly when actual_completion is non-empty (T-E4)", () => {
  for (const r of schedule.rows) {
    assert.equal(
      r.milestone_status, r.actual_completion === "" ? "open" : "complete",
      `${r.milestone_id} reads ${r.milestone_status} against an actual_completion of "${r.actual_completion}"`
    );
  }
});

test("SMB-16: A1 at both cardinalities, one completed late and two past planned_end at the as-of date (T-E5)", () => {
  // Card 1: the rule as stated. A milestone with a completion, strictly after
  // its own planned end.
  const late = schedule.rows.filter((r) => r.actual_completion !== "" && r.actual_completion > r.planned_end);
  assert.equal(late.length, 1, "the completed-late count");
  assert.equal(late[0].milestone_id, "MST-LDB-02");
  assert.equal(late[0].milestone, "Demolition and disposal");
  assert.equal(late[0].planned_end, "2026-02-20");
  assert.equal(late[0].actual_completion, "2026-02-27");
  assert.equal(daysBetween(late[0].planned_end, late[0].actual_completion), 7, "the slip is not seven calendar days");

  // Card 2: drop the one qualifier the rule names, "has a completion to
  // measure", and measure against the as-of date instead. Two milestones did
  // not finish by their planned end, and only one of the two has a completion.
  const pastPlannedEnd = schedule.rows.filter(
    (r) => r.planned_end < AS_OF && (r.actual_completion === "" || r.actual_completion > r.planned_end)
  );
  assert.equal(pastPlannedEnd.length, 2, "the count past planned_end at the as-of date");
  assert.deepEqual(pastPlannedEnd.map((r) => r.milestone_id), ["MST-LDB-02", "MST-LDB-06"]);
  assert.equal(
    count(pastPlannedEnd, (r) => r.actual_completion !== ""), 1,
    "both milestones past their planned end now carry a completion, so the qualifier does no work"
  );

  // Every other completed milestone finished on or before its planned end,
  // which is the half that makes "exactly one" mean something.
  const onTime = schedule.rows.filter((r) => r.actual_completion !== "" && r.actual_completion <= r.planned_end);
  assert.equal(onTime.length, 4);
});

test("SMB-16: every date sits inside 2026-02-16 to 2026-03-27 (T-E6)", () => {
  for (const r of schedule.rows) {
    for (const col of ["planned_start", "planned_end", "actual_start", "actual_completion"]) {
      if (r[col] === "") continue;
      assert.ok(
        r[col] >= SCHEDULE_WINDOW.start && r[col] <= SCHEDULE_WINDOW.end,
        `${r.milestone_id} carries ${col} ${r[col]}, outside the delivery window`
      );
    }
  }
});

test("SMB-16: client_canon_id is co-131 and project_name is byte-equal to SMB-04's, on every row (T-E7)", () => {
  assert.deepEqual([...new Set(column(schedule, "client_canon_id"))], ["co-131"]);
  const seated = canon.get("co-131");
  assert.ok(seated, "canon/companies.md does not seat co-131");
  assert.match(seated.name, /Okafor/, "co-131 is no longer the Okafor household");

  const projectName = clientRecord.client.project_name;
  assert.notEqual(projectName, "", "SMB-04 carries no project_name");
  assert.deepEqual([...new Set(column(schedule, "project_name"))], [projectName]);
});

// --------------------------------------------------------------------- SMB-12

test("SMB-12: the header is the spec's, and the eighteen tasks run TSK-LDB-01 upward in file order (T-F1)", () => {
  assertShape("SMB-12", tasks, "task_id", "TSK-LDB-", 18);
});

test("SMB-12: the task-to-milestone join closes in both directions, as two empty set differences (T-F2)", () => {
  const cited = new Set(column(tasks, "milestone_id"));
  const seated = new Set(column(schedule, "milestone_id"));

  const orphanTasks = [...cited].filter((m) => !seated.has(m));
  const emptyMilestones = [...seated].filter((m) => !cited.has(m));
  assert.deepEqual(orphanTasks, [], "a task cites a milestone SMB-16 does not carry");
  assert.deepEqual(emptyMilestones, [], "a milestone carries no task, so the schedule and the task list disagree");

  // File order is milestone order, and the distribution is the plan's.
  const blocks = [];
  for (const r of tasks.rows) if (blocks.at(-1) !== r.milestone_id) blocks.push(r.milestone_id);
  assert.deepEqual(blocks, column(schedule, "milestone_id"), "the task blocks are not SMB-16's milestone order");
  assert.deepEqual(
    column(schedule, "milestone_id").map((m) => count(tasks.rows, (r) => r.milestone_id === m)),
    [2, 3, 4, 3, 3, 3],
    "the task distribution across the six milestones moved"
  );

  // planned_end never runs backwards down the file, which is what makes "file
  // order is work order" a statement rather than a convention.
  const ends = column(tasks, "planned_end");
  assert.deepEqual(ends, [...ends].sort(), "SMB-12: planned_end runs backwards somewhere in the file");
});

test("SMB-12: the full census of data plan 2.8, every count an equality", () => {
  const rows = tasks.rows;
  assert.equal(rows.length, 18, "rows");
  assert.equal(count(rows, (r) => r.internal_status === "complete"), 15, "internal complete");
  assert.equal(count(rows, (r) => r.internal_status === "in_progress"), 2, "internal in_progress");
  assert.equal(count(rows, (r) => r.internal_status === "not_started"), 1, "internal not_started");
  assert.equal(count(rows, (r) => r.client_visible_status === "complete"), 14, "client complete");
  assert.equal(count(rows, (r) => r.client_visible_status === "in_progress"), 3, "client in_progress");
  assert.equal(count(rows, (r) => r.client_visible_status === "not_started"), 1, "client not_started");
  assert.equal(count(rows, (r) => r.owner_role === "owner"), 4, "owner");
  assert.equal(count(rows, (r) => r.owner_role === "project lead"), 14, "project lead");

  const STATUSES = ["not_started", "in_progress", "complete"];
  for (const r of rows) {
    assert.ok(ownerRoles.includes(r.owner_role), `${r.task_id} owner_role "${r.owner_role}" is not SMB-02 vocabulary`);
    for (const col of ["internal_status", "client_visible_status"]) {
      assert.ok(STATUSES.includes(r[col]), `${r.task_id} ${col} "${r[col]}" is outside the shared vocabulary`);
    }
    assert.notEqual(r.task.trim(), "", `${r.task_id} states no task`);
    assert.ok(r.planned_start <= r.planned_end, `${r.task_id} is planned to end before it starts`);
  }
  for (const role of ownerRoles) {
    assert.ok(count(rows, (r) => r.owner_role === role) > 0, `no task is owned by the ${role} role`);
  }

  // No column labels the disagreement. All three would be answer keys.
  for (const forbidden of ["is_stale", "client_view_current", "disagreement_note", "stale_flag"]) {
    assert.ok(!tasks.cols.includes(forbidden), `SMB-12 grew a "${forbidden}" column, which is an answer key`);
  }
});

test("SMB-12: P4 at both cardinalities, one stale row and four old client timestamps (T-F3)", () => {
  // Card 1: the rule as stated. Complete internally, in_progress for the client.
  const stale = tasks.rows.filter(
    (r) => r.internal_status === "complete" && r.client_visible_status === "in_progress"
  );
  assert.equal(stale.length, 1, "the stale-row count");
  assert.equal(stale[0].task_id, "TSK-LDB-12");

  // The pinned row, re-read from the emitted CSV and held against the plan's
  // exact values. A reworded or re-dated plant fails here rather than drifting.
  assert.equal(stale[0].milestone_id, "MST-LDB-04");
  assert.equal(stale[0].task, "Kitchen base and wall cabinet installation");
  assert.equal(stale[0].owner_role, "project lead");
  assert.equal(stale[0].planned_start, "2026-03-16");
  assert.equal(stale[0].planned_end, "2026-03-18");
  assert.equal(stale[0].internal_completed_date, "2026-03-18");
  assert.equal(stale[0].client_visible_updated_date, "2026-03-16");

  // Card 2: drop the qualifier the rule names, the two status columns, and key
  // on the timestamp instead. Four rows are more than seven days old and three
  // of the four are correct, so the timestamp rule over-flags by three.
  const old = tasks.rows.filter((r) => daysBetween(r.client_visible_updated_date, AS_OF) > 7);
  assert.equal(old.length, 4, "the count of client views written more than seven days before the as-of date");
  assert.deepEqual(old.map((r) => r.task_id), ["TSK-LDB-01", "TSK-LDB-02", "TSK-LDB-09", "TSK-LDB-12"]);
  const correctButOld = old.filter((r) => r.internal_status === r.client_visible_status);
  assert.equal(correctButOld.length, 3, "the count of correct rows the timestamp rule over-flags");
  assert.ok(
    old.some((r) => r.task_id === "TSK-LDB-12"),
    "the plant is not inside the population it is supposed to hide in"
  );
});

test("SMB-12: exactly one task disagrees across the two status columns under ANY reading (T-F4)", () => {
  // Not "complete against in_progress": any inequality at all. A file that grew
  // a not_started-against-in_progress row would still satisfy the narrow rule
  // and would no longer be the file the plan describes.
  const disagreeing = tasks.rows.filter((r) => r.internal_status !== r.client_visible_status);
  assert.equal(disagreeing.length, 1, "the count of rows disagreeing across the two status columns");
  assert.equal(disagreeing[0].task_id, "TSK-LDB-12");

  // And the seventeen that agree, agree exactly, which is the half that makes
  // "exactly one" mean something.
  assert.equal(count(tasks.rows, (r) => r.internal_status === r.client_visible_status), 17);
});

test("SMB-12: internal_completed_date is present exactly when complete, and lands inside its milestone's ACTUAL window (T-F5)", () => {
  const byId = new Map(schedule.rows.map((r) => [r.milestone_id, r]));
  for (const r of tasks.rows) {
    const isComplete = r.internal_status === "complete";
    assert.equal(
      r.internal_completed_date !== "", isComplete,
      `${r.task_id} reads internal_status ${r.internal_status} against an internal_completed_date of "${r.internal_completed_date}"`
    );
    if (!isComplete) continue;
    const m = byId.get(r.milestone_id);
    assert.match(r.internal_completed_date, ISO_DATE, `${r.task_id} internal_completed_date`);
    assert.notEqual(
      m.actual_completion, "",
      `${r.task_id} is complete inside ${r.milestone_id}, which SMB-16 records as still open`
    );
    assert.ok(
      r.internal_completed_date >= m.actual_start && r.internal_completed_date <= m.actual_completion,
      `${r.task_id} completed ${r.internal_completed_date}, outside ${r.milestone_id}'s actual window `
      + `${m.actual_start} to ${m.actual_completion}`
    );
    // The planned window sits inside the milestone's planned window too: a task
    // that runs past its own milestone is a scheduling error, not a plant.
    assert.ok(
      r.planned_start >= m.planned_start && r.planned_end <= m.planned_end,
      `${r.task_id} is planned outside ${r.milestone_id}'s planned window`
    );
  }
});

test("SMB-12: every client view is at or before the as-of date and was TRUE on the day it was written (T-F6)", () => {
  const byId = new Map(schedule.rows.map((r) => [r.milestone_id, r]));
  for (const r of tasks.rows) {
    assert.match(r.client_visible_updated_date, ISO_DATE, `${r.task_id} client_visible_updated_date`);
    assert.ok(
      r.client_visible_updated_date <= AS_OF,
      `${r.task_id} published a client view on ${r.client_visible_updated_date}, after the ${AS_OF} as-of date`
    );
    assert.ok(
      r.client_visible_updated_date >= SCHEDULE_WINDOW.start,
      `${r.task_id} published a client view before the job started`
    );

    // The rule the controller's pre-commit edit added, re-derived here: a
    // client view may be STALE, it may never have been WRONG on the day it was
    // written. This is what rules out the countertop task as the plant.
    const m = byId.get(r.milestone_id);
    if (r.client_visible_status === "complete") {
      assert.equal(
        r.internal_status, "complete",
        `${r.task_id} tells the client the task is complete and the studio's own record does not`
      );
      assert.ok(
        r.client_visible_updated_date >= r.internal_completed_date,
        `${r.task_id} published "complete" on ${r.client_visible_updated_date}, before it completed on ${r.internal_completed_date}`
      );
    }
    if (r.client_visible_status === "in_progress") {
      assert.ok(
        r.client_visible_updated_date >= m.actual_start,
        `${r.task_id} published "in_progress" on ${r.client_visible_updated_date}, before ${r.milestone_id} actually started on ${m.actual_start}`
      );
      if (r.internal_status === "complete") {
        assert.ok(
          r.client_visible_updated_date < r.internal_completed_date,
          `${r.task_id} published "in_progress" on ${r.client_visible_updated_date}, on or after it completed on ${r.internal_completed_date}: `
          + "that reading was already false when it was written"
        );
      }
    }
    if (r.client_visible_status === "not_started") {
      // Still not started at the as-of date, so it was certainly not started at
      // any earlier refresh date. The claim carries no lower bound.
      assert.equal(r.internal_status, "not_started", `${r.task_id} client view and internal record disagree on not_started`);
    }
  }
});

test("SMB-12: client_canon_id is co-131 on all eighteen rows, and no cell carries money or a stray date (T-F7)", () => {
  const ids = column(tasks, "client_canon_id");
  assert.deepEqual([...new Set(ids)], ["co-131"]);
  assert.equal(ids.length, 18);
  for (const r of tasks.rows) {
    for (const [col, value] of Object.entries(r)) {
      assert.ok(!looksLikeMoney(value), `${r.task_id} states a money figure in ${col}`);
    }
    for (const col of ["planned_start", "planned_end", "internal_completed_date", "client_visible_updated_date"]) {
      if (r[col] === "") continue;
      assert.ok(
        r[col] >= SCHEDULE_WINDOW.start && r[col] <= AS_OF,
        `${r.task_id} carries ${col} ${r[col]}, outside ${SCHEDULE_WINDOW.start} to ${AS_OF}`
      );
    }
  }
});

// --------------------------------------------------------------------- SMB-13

test("SMB-13: the header is the spec's, the sixteen documents run DOC-LDB-01 upward, and file order is created_date order (T-G1)", () => {
  assertShape("SMB-13", documents, "document_id", "DOC-LDB-", 16);
  const created = column(documents, "created_date");
  assert.deepEqual(created, [...created].sort(), "SMB-13: file order is not created_date order");
  assert.equal(new Set(column(documents, "document_title")).size, 16, "two documents share a title");
  assert.equal(new Set(column(documents, "storage_path")).size, 16, "two documents share a storage path");
});

test("SMB-13: P5 at both cardinalities, one exposed internal document inside five internal ones (T-G2)", () => {
  // Card 1: the rule as stated. Classified internal, and the visibility puts it
  // in the client-facing index anyway.
  const exposed = documents.rows.filter((r) => r.classification === "internal" && r.visibility === "client_facing");
  assert.equal(exposed.length, 1, "the exposed-internal count");
  assert.equal(exposed[0].document_id, "DOC-LDB-11");
  assert.equal(exposed[0].document_title, "Job cost tracker, Okafor renovation");

  // Card 2: drop the one qualifier the rule names, the visibility, and read the
  // classification alone. Five documents come back and four of the five are
  // fine, so the rule buries the one that is actually exposed.
  const internal = documents.rows.filter((r) => r.classification === "internal");
  assert.equal(internal.length, 5, "the internal count");
  assert.deepEqual(
    internal.map((r) => r.document_id),
    ["DOC-LDB-11", "DOC-LDB-12", "DOC-LDB-13", "DOC-LDB-14", "DOC-LDB-15"]
  );
  assert.equal(count(internal, (r) => r.visibility === "internal_only"), 4, "the correctly-hidden internal count");

  // The five pinned titles, re-read from the emitted CSV. DOC-LDB-13 is the
  // SMB-15 notes, indexed like any other document, which is what makes this an
  // index rather than a list of client deliverables.
  assert.deepEqual(internal.map((r) => r.document_title), [
    "Job cost tracker, Okafor renovation",
    "Subcontractor quote comparison",
    "Internal status notes, week of 2026-03-30",
    "Margin review worksheet",
    "Crew scheduling grid",
  ]);
});

test("SMB-13: the full census of data plan 2.9, every count an equality (T-G3)", () => {
  const rows = documents.rows;
  assert.equal(rows.length, 16, "rows");
  assert.equal(count(rows, (r) => r.classification === "client_shared"), 11, "client_shared");
  assert.equal(count(rows, (r) => r.classification === "internal"), 5, "internal");
  assert.equal(count(rows, (r) => r.visibility === "client_facing"), 12, "client_facing");
  assert.equal(count(rows, (r) => r.visibility === "internal_only"), 4, "internal_only");
  assert.equal(count(rows, (r) => r.owner_role === "owner"), 7, "owner");
  assert.equal(count(rows, (r) => r.owner_role === "project lead"), 9, "project lead");
  assert.equal(count(rows, (r) => r.related_milestone_id !== ""), 9, "documents citing a milestone");
  assert.equal(count(rows, (r) => r.related_task_id !== ""), 6, "documents citing a task");

  for (const r of rows) {
    assert.ok(["client_shared", "internal"].includes(r.classification), `${r.document_id} classification`);
    assert.ok(["client_facing", "internal_only"].includes(r.visibility), `${r.document_id} visibility`);
    assert.ok(ownerRoles.includes(r.owner_role), `${r.document_id} owner_role "${r.owner_role}" is not SMB-02 vocabulary`);
    assert.notEqual(r.document_title.trim(), "", `${r.document_id} carries no title`);
    assert.notEqual(r.document_type.trim(), "", `${r.document_id} carries no type`);
    // A shared document that is hidden from the client is not shared. The
    // reverse direction is where the plant lives and is counted above.
    if (r.classification === "client_shared") {
      assert.equal(r.visibility, "client_facing", `${r.document_id} is shared with the client and hidden from them at once`);
    }
  }
  assert.deepEqual([...new Set(column(documents, "client_canon_id"))], ["co-131"]);
});

test("SMB-13: every non-empty citation resolves, into SMB-16 and into SMB-12 (T-G4)", () => {
  const milestones = new Set(column(schedule, "milestone_id"));
  const taskIds = new Set(column(tasks, "task_id"));

  const citedMilestones = column(documents, "related_milestone_id").filter((v) => v !== "");
  const citedTasks = column(documents, "related_task_id").filter((v) => v !== "");
  assert.ok(citedMilestones.length > 0, "no document cites a milestone, so this join checks nothing");
  assert.ok(citedTasks.length > 0, "no document cites a task, so this join checks nothing");

  assert.deepEqual(
    [...new Set(citedMilestones)].filter((m) => !milestones.has(m)), [],
    "a document cites a milestone SMB-16 does not carry"
  );
  assert.deepEqual(
    [...new Set(citedTasks)].filter((t) => !taskIds.has(t)), [],
    "a document cites a task SMB-12 does not carry"
  );

  // A document citing a task cites that task's own milestone, or no milestone
  // at all: an index that files a document against two unrelated things is not
  // an index anybody can search.
  const taskMilestone = new Map(tasks.rows.map((r) => [r.task_id, r.milestone_id]));
  for (const r of documents.rows) {
    if (r.related_task_id === "" || r.related_milestone_id === "") continue;
    assert.equal(
      r.related_milestone_id, taskMilestone.get(r.related_task_id),
      `${r.document_id} cites ${r.related_task_id} and ${r.related_milestone_id}, which is not that task's milestone`
    );
  }
});

test("SMB-13: the three documents SMB-14 cites are all client_shared, and no internal title collides with a shared one (T-G5, the index half)", () => {
  // T-G5 proper, the sweep over SMB-14's text, belongs to the drafted screen
  // (data plan section 4). What the index owes is the half that makes the sweep
  // satisfiable: the three documents the update cites are shared, and no
  // internal document's title can be mistaken for a shared one.
  const byId = new Map(documents.rows.map((r) => [r.document_id, r]));
  for (const documentId of ["DOC-LDB-01", "DOC-LDB-06", "DOC-LDB-08"]) {
    const cited = byId.get(documentId);
    assert.ok(cited, `SMB-14 cites ${documentId}, which the index does not carry`);
    assert.equal(cited.classification, "client_shared", `${documentId} is cited by SMB-14 and is not client_shared`);
    assert.equal(cited.visibility, "client_facing");
  }
  assert.equal(byId.get("DOC-LDB-01").document_title, "Approved proposal, Okafor kitchen and primary bath renovation");
  assert.equal(byId.get("DOC-LDB-06").document_title, "Product and finish selections schedule");
  assert.equal(byId.get("DOC-LDB-08").document_title, "Site photo set, week of 2026-03-13");

  const internalTitles = new Set(
    documents.rows.filter((r) => r.classification === "internal").map((r) => r.document_title)
  );
  for (const r of documents.rows) {
    if (r.classification === "internal") continue;
    assert.ok(
      !internalTitles.has(r.document_title),
      `${r.document_id} shares a title with an internal document, so a title sweep over SMB-14 could not tell them apart`
    );
  }
});

test("SMB-13: no column is an amount column and no cell carries a money value (T-G6)", () => {
  for (const col of documents.cols) {
    assert.doesNotMatch(col, /amount|price|total|_usd|cost_|margin_/, `SMB-13 grew the money column "${col}"`);
  }
  for (const r of documents.rows) {
    for (const [col, value] of Object.entries(r)) {
      assert.ok(!looksLikeMoney(value), `${r.document_id} states a money figure in ${col}: "${value}"`);
    }
  }
  // The sweep is not vacuous: the index DOES name the document that holds the
  // figure, which is the distinction the plan draws.
  assert.ok(
    documents.rows.some((r) => /cost/i.test(r.document_title)),
    "no document title names a cost document, so the no-money sweep is screening an index that has nothing to hide"
  );
});

test("SMB-13: created_date is at or before last_updated_date, and every date is at or before the as-of date (T-G7)", () => {
  for (const r of documents.rows) {
    for (const col of ["created_date", "last_updated_date"]) {
      assert.match(r[col], ISO_DATE, `${r.document_id} ${col}`);
      assert.ok(r[col] <= AS_OF, `${r.document_id} carries ${col} ${r[col]}, after the ${AS_OF} as-of date`);
    }
    assert.ok(
      r.created_date <= r.last_updated_date,
      `${r.document_id} was last updated ${r.last_updated_date}, before it was created ${r.created_date}`
    );
  }
  // The index opens on the approved proposal, which is the first document the
  // job produced, and the date is SMB-06's own approval date.
  assert.equal(documents.rows[0].created_date, "2026-02-02");
});

test("SMB-13: every storage_path is a plain folder path carrying no person name and no address (rule R-ROLE, fact 0.9)", () => {
  const address = clientRecord.client.property_address;
  assert.equal(address, "327 Havershill Court", "the client record's property_address has moved");
  for (const r of documents.rows) {
    assert.match(
      r.storage_path, /^[a-z0-9]+(?:[-/.][a-z0-9]+)*$/,
      `${r.document_id} files to "${r.storage_path}", which is not a plain lowercase folder path`
    );
    assert.doesNotMatch(r.storage_path, /havershill|327/i, `${r.document_id}'s storage path carries the property address`);
    assert.ok(r.storage_path.split("/").length >= 3, `${r.document_id} files to a bare path with no project folder`);
  }
  // Every path hangs off one project root, so a later row cannot quietly file
  // into another client's folder.
  const roots = new Set(documents.rows.map((r) => r.storage_path.split("/").slice(0, 2).join("/")));
  assert.equal(roots.size, 1, `the index files into more than one project root: ${[...roots].join(", ")}`);
});

// -------------------------------------------------- the SMB-11 forward join

test("SMB-11's forward citation now closes: every related_milestone_id it carries resolves into the emitted SMB-16", () => {
  // Cluster 2a shipped this column with the id pinned by the data plan and no
  // SMB-16 to resolve it against. This is the assertion 2a deferred.
  const seated = new Set(column(schedule, "milestone_id"));
  const cited = column(kickoff, "related_milestone_id").filter((v) => v !== "");
  assert.equal(cited.length, 4, "SMB-11 no longer carries four milestone citations");
  assert.deepEqual([...new Set(cited)], ["MST-LDB-01"]);
  assert.deepEqual([...new Set(cited)].filter((m) => !seated.has(m)), [], "SMB-11 cites a milestone SMB-16 does not carry");

  // The milestone it cites is the kickoff one, and it is the milestone the
  // kickoff tasks sit under in SMB-12, so the three files agree on what
  // MST-LDB-01 is rather than agreeing only on the string.
  const kickoffMilestone = schedule.rows.find((r) => r.milestone_id === "MST-LDB-01");
  assert.equal(kickoffMilestone.milestone, "Kickoff and site protection");
  assert.equal(kickoffMilestone.actual_start, "2026-02-16");
  assert.equal(count(tasks.rows, (r) => r.milestone_id === "MST-LDB-01"), 2);
});

// --------------------------------------------------------- the id namespace

test("SMB-12, SMB-13 and SMB-16 mint only their own namespaced id classes, two zero-padded digits (rule R-NS)", () => {
  // The three 2b classes, plus nothing. The bare tokens TSK- and DOC- are
  // already spent by the operations and legal packs, so an un-namespaced mint
  // here is a cross-track collision rather than a style slip.
  const OWN = { "SMB-16": "MST-LDB-", "SMB-12": "TSK-LDB-", "SMB-13": "DOC-LDB-" };
  const ALLOWED = new Set(["MST-LDB-", "TSK-LDB-", "DOC-LDB-"]);
  const files = {
    "SMB-16": fileByPath(emitted("SMB-16"), "milestone-schedule.csv").content,
    "SMB-12": fileByPath(emitted("SMB-12"), "project-tasks-and-dates.csv").content,
    "SMB-13": fileByPath(emitted("SMB-13"), "project-documents-index.csv").content,
  };

  for (const [specId, text] of Object.entries(files)) {
    const seen = new Set();
    for (const match of text.matchAll(/\b([A-Z]{2,4})-LDB-(\d+)\b/g)) {
      const idClass = `${match[1]}-LDB-`;
      assert.ok(ALLOWED.has(idClass), `${specId} mints "${match[0]}", whose class ${idClass} is not a cluster 2b class`);
      assert.equal(match[2].length, 2, `${specId} carries "${match[0]}", and the format is two zero-padded digits`);
      seen.add(idClass);
    }
    assert.ok(seen.has(OWN[specId]), `${specId} mints none of its own ${OWN[specId]} ids, so this screen checks nothing`);
    for (const idClass of ALLOWED) {
      const bare = idClass.replace("LDB-", "");
      assert.doesNotMatch(text, new RegExp(`\\b${bare}\\d`), `${specId} carries an un-namespaced ${bare} id`);
    }
    assert.ok(!text.includes("—"), `${specId} carries an em dash (U+2014)`);
    assert.ok(!text.includes("–"), `${specId} carries an en dash (U+2013)`);
  }
});

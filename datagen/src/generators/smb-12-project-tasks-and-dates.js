// SMB-12 project-tasks-and-dates: the eighteen delivery tasks behind SMB-16's
// six milestones, carrying two views of the same work.
//
//   internal_status / internal_completed_date       what the studio records
//   client_visible_status / client_visible_updated_date  what the hub renders
//
// Seventeen of the eighteen rows agree across the two status columns. One does
// not, and that disagreement is the artifact's whole reason to exist (data plan
// 2.8, plant P4).
//
// ---------------------------------------------------------------------------
// What `client_visible_updated_date` means, stated once.
//
// It is the date the client-facing row was last WRITTEN, not the date the task
// last changed. The hub row is rewritten when the project lead opens that task
// in the hub. Two passes wrote most of this file: 2026-03-16, when the hub was
// brought current alongside the written status update that went out that day
// (SMB-14), and the closeout week of 2026-03-23, when the lead worked back
// through the hub restating the finished work ahead of the punch-list
// walkthrough. The closeout pass opened fourteen of the eighteen rows. The four
// it did not open are the four carrying an older date, and only one of those
// four had moved since it was last written.
//
// ---------------------------------------------------------------------------
// The plant, P4, pinned by the data plan and by the controller's 2026-09-14
// review edit.
//
// `TSK-LDB-12`, kitchen base and wall cabinet installation, milestone
// `MST-LDB-04`, planned 2026-03-16 to 2026-03-18. The client view was refreshed
// on 2026-03-16, the morning the cabinet crew started, when `in_progress` was
// true. The internal completion landed on 2026-03-18, inside the milestone's
// actual window, and nobody went back. That is the direction a real studio's
// records go stale.
//
// The row that was NOT chosen, and why, because a later edit must not move the
// plant back: the countertop task `TSK-LDB-14` was planned 2026-03-19 to
// 2026-03-20, so a client view reading `in_progress` on 2026-03-16 would assert
// a state that was false at its own refresh date. SMB-12 carries no actual-start
// column to license such a claim. Rule, enforced below for every row: a client
// view may be STALE, it may never have been WRONG on the day it was written.
//
//   P4 card 1  tasks whose internal_status is complete while the client view
//              still reads in_progress: exactly TSK-LDB-12.
//   P4 card 4  tasks whose client_visible_updated_date is more than seven days
//              before the 2026-03-31 as-of date: TSK-LDB-01, TSK-LDB-02,
//              TSK-LDB-09 and TSK-LDB-12. Three of the four are correct, because
//              the task genuinely has not changed since it was last written, so
//              a rule keyed on the timestamp over-flags by three.
//
// There is no `is_stale` column, no `client_view_current` flag and no
// `disagreement_note`. All three would be answer keys; the disagreement is
// derivable from two columns that already ship.
//
// Every row is designed content rather than a draw, so the rows are fixed data
// here and the generator takes no rng of its own: same bytes, forever.
//
// Rules carried from C1: R-MOCK (this file has no payment surface at all),
// R-ROLE (a human appears only as an SMB-02 record_owner_role), R-NS (the id
// class is namespaced `TSK-LDB-` from birth, and the bare `TSK-` token is spent
// by the operations pack), and the no-money rule.
import { toCsv } from "../csv.js";
import { RECORD_OWNER_ROLES } from "./smb-02-client-record-template.js";
import { buildMilestoneSchedule, AS_OF_DATE } from "./smb-16-milestone-schedule.js";

export const id = "SMB-12";

export const COLUMNS = [
  "task_id", "milestone_id", "task", "owner_role", "planned_start", "planned_end",
  "internal_status", "internal_completed_date", "client_visible_status",
  "client_visible_updated_date", "client_canon_id",
];

export const TARGET_ROWS = 18;

/** The client the task list belongs to. SMB-02's name for the column. */
export const CLIENT_CANON_ID = "co-131";

/** One vocabulary, shared by the internal column and the client-facing one. */
export const TASK_STATUSES = ["not_started", "in_progress", "complete"];

/** The window every date in this file sits inside, inclusive. */
export const WINDOW = { start: "2026-02-16", end: AS_OF_DATE };

/** "More than seven days before the as-of date" is the plan's own qualifier. */
export const STALE_TIMESTAMP_DAYS = 7;

/** The census of data plan 2.8, in one place. */
export const CENSUS = {
  rows: TARGET_ROWS,
  per_milestone: {
    "MST-LDB-01": 2,
    "MST-LDB-02": 3,
    "MST-LDB-03": 4,
    "MST-LDB-04": 3,
    "MST-LDB-05": 3,
    "MST-LDB-06": 3,
  },
  internal_status: { complete: 15, in_progress: 2, not_started: 1 },
  client_visible_status: { complete: 14, in_progress: 3, not_started: 1 },
  disagreements: 1,
  old_client_timestamps: 4,
};

/** The one stale row, and the three correct rows that share its timestamp band. */
export const PLANT_TASK_ID = "TSK-LDB-12";
export const OLD_TIMESTAMP_TASK_IDS = ["TSK-LDB-01", "TSK-LDB-02", "TSK-LDB-09", PLANT_TASK_ID];

// ------------------------------------------------------------------- the rows
//
// File order is milestone order, then the order the studio works the tasks
// inside a milestone. `planned_end` is non-decreasing down the whole file,
// which is what makes "file order" a statement rather than a convention.

const TASKS = [
  // MST-LDB-01, kickoff and site protection. Both rows were written into the
  // hub on the day of the walkthrough and nobody has opened either since.
  {
    milestone_id: "MST-LDB-01",
    task: "Walk the work area with the homeowners and agree the site boundary",
    owner_role: "project lead",
    planned_start: "2026-02-16", planned_end: "2026-02-16",
    internal_status: "complete", internal_completed_date: "2026-02-16",
    client_visible_status: "complete", client_visible_updated_date: "2026-02-16",
  },
  {
    milestone_id: "MST-LDB-01",
    task: "Set out the dust barriers, the floor protection and the crew entry route",
    owner_role: "owner",
    planned_start: "2026-02-16", planned_end: "2026-02-16",
    internal_status: "complete", internal_completed_date: "2026-02-16",
    client_visible_status: "complete", client_visible_updated_date: "2026-02-16",
  },

  // MST-LDB-02, demolition and disposal. Planned to finish 2026-02-20 and
  // actually finished 2026-02-27: the week SMB-16 records as the one slip.
  {
    milestone_id: "MST-LDB-02",
    task: "Strip out the existing kitchen units and worktops",
    owner_role: "project lead",
    planned_start: "2026-02-17", planned_end: "2026-02-18",
    internal_status: "complete", internal_completed_date: "2026-02-18",
    client_visible_status: "complete", client_visible_updated_date: "2026-03-24",
  },
  {
    milestone_id: "MST-LDB-02",
    task: "Remove the primary bath fittings and the floor tile",
    owner_role: "project lead",
    planned_start: "2026-02-18", planned_end: "2026-02-19",
    internal_status: "complete", internal_completed_date: "2026-02-24",
    client_visible_status: "complete", client_visible_updated_date: "2026-03-24",
  },
  {
    milestone_id: "MST-LDB-02",
    task: "Clear the demolition waste from site and confirm the disposal run",
    owner_role: "owner",
    planned_start: "2026-02-19", planned_end: "2026-02-20",
    internal_status: "complete", internal_completed_date: "2026-02-27",
    client_visible_status: "complete", client_visible_updated_date: "2026-03-24",
  },

  // MST-LDB-03, plumbing and electrical rough in. Planned three weeks from
  // 2026-02-23 and actually started 2026-03-02, which is where the demolition
  // week went and why nothing after this milestone slipped.
  {
    milestone_id: "MST-LDB-03",
    task: "Move the kitchen waste and supply lines to the new layout",
    owner_role: "project lead",
    planned_start: "2026-02-23", planned_end: "2026-02-27",
    internal_status: "complete", internal_completed_date: "2026-03-05",
    client_visible_status: "complete", client_visible_updated_date: "2026-03-25",
  },
  {
    milestone_id: "MST-LDB-03",
    task: "Run the new kitchen and bath circuits back to the panel",
    owner_role: "project lead",
    planned_start: "2026-03-02", planned_end: "2026-03-06",
    internal_status: "complete", internal_completed_date: "2026-03-09",
    client_visible_status: "complete", client_visible_updated_date: "2026-03-25",
  },
  {
    milestone_id: "MST-LDB-03",
    task: "Rough in the primary bath shower valve and the drain",
    owner_role: "project lead",
    planned_start: "2026-03-09", planned_end: "2026-03-11",
    internal_status: "complete", internal_completed_date: "2026-03-11",
    client_visible_status: "complete", client_visible_updated_date: "2026-03-25",
  },
  {
    // Written into the hub on 2026-03-16 alongside the status update that went
    // out that day, and correct ever since: the inspection passed on 2026-03-13
    // and nothing about it has changed.
    milestone_id: "MST-LDB-03",
    task: "Book and pass the rough in inspection",
    owner_role: "owner",
    planned_start: "2026-03-12", planned_end: "2026-03-13",
    internal_status: "complete", internal_completed_date: "2026-03-13",
    client_visible_status: "complete", client_visible_updated_date: "2026-03-16",
  },

  // MST-LDB-04, cabinetry and vanity installation, 2026-03-16 to 2026-03-18.
  {
    milestone_id: "MST-LDB-04",
    task: "Take delivery of the cabinet run and check it against the selections sheet",
    owner_role: "project lead",
    planned_start: "2026-03-16", planned_end: "2026-03-16",
    internal_status: "complete", internal_completed_date: "2026-03-16",
    client_visible_status: "complete", client_visible_updated_date: "2026-03-26",
  },
  {
    milestone_id: "MST-LDB-04",
    task: "Set and level the primary bath vanity and the mirror unit",
    owner_role: "project lead",
    planned_start: "2026-03-17", planned_end: "2026-03-17",
    internal_status: "complete", internal_completed_date: "2026-03-17",
    client_visible_status: "complete", client_visible_updated_date: "2026-03-26",
  },
  {
    // P4. The client view was written on 2026-03-16, the morning the crew
    // started, when in_progress was true. The internal completion landed on
    // 2026-03-18 and the hub row was never opened again.
    milestone_id: "MST-LDB-04",
    task: "Kitchen base and wall cabinet installation",
    owner_role: "project lead",
    planned_start: "2026-03-16", planned_end: "2026-03-18",
    internal_status: "complete", internal_completed_date: "2026-03-18",
    client_visible_status: "in_progress", client_visible_updated_date: "2026-03-16",
  },

  // MST-LDB-05, tile, countertops and finish carpentry, 2026-03-19 to 2026-03-20.
  {
    milestone_id: "MST-LDB-05",
    task: "Lay the kitchen and bath floor tile",
    owner_role: "project lead",
    planned_start: "2026-03-19", planned_end: "2026-03-19",
    internal_status: "complete", internal_completed_date: "2026-03-19",
    client_visible_status: "complete", client_visible_updated_date: "2026-03-26",
  },
  {
    milestone_id: "MST-LDB-05",
    task: "Template, fit and seal the kitchen countertops",
    owner_role: "project lead",
    planned_start: "2026-03-19", planned_end: "2026-03-20",
    internal_status: "complete", internal_completed_date: "2026-03-20",
    client_visible_status: "complete", client_visible_updated_date: "2026-03-27",
  },
  {
    milestone_id: "MST-LDB-05",
    task: "Hang the trim, the door casings and the shelving",
    owner_role: "project lead",
    planned_start: "2026-03-20", planned_end: "2026-03-20",
    internal_status: "complete", internal_completed_date: "2026-03-20",
    client_visible_status: "complete", client_visible_updated_date: "2026-03-27",
  },

  // MST-LDB-06, punch list and closeout. Open at the as-of date, which is the
  // same fact SMB-04's closeout stage records as pending, so no task inside it
  // can be complete and none carries an internal completion date.
  {
    milestone_id: "MST-LDB-06",
    task: "Walk the punch list with the homeowners and log every item",
    owner_role: "project lead",
    planned_start: "2026-03-23", planned_end: "2026-03-24",
    internal_status: "in_progress", internal_completed_date: "",
    client_visible_status: "in_progress", client_visible_updated_date: "2026-03-30",
  },
  {
    milestone_id: "MST-LDB-06",
    task: "Close out the punch list items raised at the walkthrough",
    owner_role: "project lead",
    planned_start: "2026-03-25", planned_end: "2026-03-26",
    internal_status: "in_progress", internal_completed_date: "",
    client_visible_status: "in_progress", client_visible_updated_date: "2026-03-30",
  },
  {
    milestone_id: "MST-LDB-06",
    task: "Hand over the warranty pack, the care notes and the final drawings",
    owner_role: "owner",
    planned_start: "2026-03-27", planned_end: "2026-03-27",
    internal_status: "not_started", internal_completed_date: "",
    client_visible_status: "not_started", client_visible_updated_date: "2026-03-30",
  },
];

// ------------------------------------------------------------------- builder

/**
 * One row in COLUMNS order, from a plain values map. Throws on a key COLUMNS
 * does not declare and on a column the map does not carry, the C1 `ordered()`
 * convention (SMB-04 SHOULD-FIX 5).
 */
function row(values) {
  const carried = Object.keys(values);
  const missing = COLUMNS.filter((name) => !carried.includes(name));
  const extra = carried.filter((name) => !COLUMNS.includes(name));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `${id}: row key set disagrees with the header. `
      + `missing [${missing.join(", ")}], extra [${extra.join(", ")}]`
    );
  }
  const out = {};
  for (const name of COLUMNS) out[name] = values[name];
  return out;
}

/** @returns {object[]} the eighteen delivery tasks, in milestone then work order. */
export function buildProjectTasks({ canon }) {
  const schedule = buildMilestoneSchedule({ canon });
  const rows = TASKS.map((t, index) => row({
    task_id: `TSK-LDB-${String(index + 1).padStart(2, "0")}`,
    milestone_id: t.milestone_id,
    task: t.task,
    owner_role: t.owner_role,
    planned_start: t.planned_start,
    planned_end: t.planned_end,
    internal_status: t.internal_status,
    internal_completed_date: t.internal_completed_date,
    client_visible_status: t.client_visible_status,
    client_visible_updated_date: t.client_visible_updated_date,
    client_canon_id: CLIENT_CANON_ID,
  }));
  assertTasks(rows, schedule);
  return rows;
}

// ---------------------------------------------------------------- assertions

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Whole calendar days from `from` to `to`, both ISO dates. */
function daysBetween(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

/**
 * The rule the controller's review edit exists to enforce: a client-facing row
 * may be STALE, it may never have been WRONG on the day it was written. Returns
 * the earliest date at which the row's claim could have been true, or "" when
 * the claim carries no lower bound.
 *
 *   complete     the task had to be finished, so the internal completion date.
 *   in_progress  the task had to have started, so its milestone's actual start,
 *                and it must not yet have been complete at the refresh date.
 *   not_started  no lower bound: the task is still not started at the as-of
 *                date, so it was certainly not started at any earlier one.
 */
function earliestTrueDate(r, milestone) {
  if (r.client_visible_status === "complete") return r.internal_completed_date;
  if (r.client_visible_status === "in_progress") return milestone.actual_start;
  return "";
}

function assertTasks(rows, schedule) {
  if (rows.length !== TARGET_ROWS) {
    throw new Error(`${id}: the task list is ${rows.length} tasks, expected ${TARGET_ROWS}`);
  }
  const byMilestone = new Map(schedule.map((m) => [m.milestone_id, m]));

  for (const [i, r] of rows.entries()) {
    const where = `${id}: ${r.task_id}`;
    if (r.task_id !== `TSK-LDB-${String(i + 1).padStart(2, "0")}`) {
      throw new Error(`${where} is out of id order at file position ${i + 1}`);
    }
    if (r.task.trim() === "") throw new Error(`${where} states no task`);
    if (r.client_canon_id !== CLIENT_CANON_ID) throw new Error(`${where} is not the ${CLIENT_CANON_ID} job`);
    if (!RECORD_OWNER_ROLES.includes(r.owner_role)) {
      throw new Error(`${where} names owner_role "${r.owner_role}", which SMB-02 does not declare`);
    }
    for (const column of ["internal_status", "client_visible_status"]) {
      if (!TASK_STATUSES.includes(r[column])) throw new Error(`${where} carries ${column} "${r[column]}"`);
    }

    // The forward join, half one of T-F2, held at build time.
    const milestone = byMilestone.get(r.milestone_id);
    if (!milestone) {
      throw new Error(`${where} cites milestone "${r.milestone_id}", which SMB-16 does not carry`);
    }

    // Dates: ISO, inside the window, and a planned window that runs forwards.
    for (const column of ["planned_start", "planned_end", "client_visible_updated_date"]) {
      if (!ISO_DATE.test(r[column])) throw new Error(`${where} carries ${column} "${r[column]}", which is not an ISO date`);
    }
    if (r.internal_completed_date !== "" && !ISO_DATE.test(r.internal_completed_date)) {
      throw new Error(`${where} carries internal_completed_date "${r.internal_completed_date}", which is not an ISO date`);
    }
    if (r.planned_start > r.planned_end) throw new Error(`${where} is planned to end before it starts`);
    for (const column of ["planned_start", "planned_end", "internal_completed_date", "client_visible_updated_date"]) {
      const value = r[column];
      if (value === "") continue;
      if (value < WINDOW.start || value > WINDOW.end) {
        throw new Error(`${where} carries ${column} ${value}, outside ${WINDOW.start} to ${WINDOW.end}`);
      }
    }

    // A task is planned inside its milestone's planned window: a task that runs
    // past its own milestone is a scheduling error, not a plant.
    if (r.planned_start < milestone.planned_start || r.planned_end > milestone.planned_end) {
      throw new Error(
        `${where} is planned ${r.planned_start} to ${r.planned_end}, outside ${r.milestone_id}'s planned `
        + `${milestone.planned_start} to ${milestone.planned_end}`
      );
    }

    // T-F5: the completion date is present exactly when the status says so, and
    // it lands inside the milestone's ACTUAL window, not its planned one.
    const isComplete = r.internal_status === "complete";
    if (isComplete === (r.internal_completed_date === "")) {
      throw new Error(
        `${where} reads internal_status ${r.internal_status} against an internal_completed_date `
        + `of "${r.internal_completed_date}"`
      );
    }
    if (isComplete) {
      if (milestone.actual_completion === "") {
        throw new Error(
          `${where} is complete inside ${r.milestone_id}, which SMB-16 records as still open`
        );
      }
      if (r.internal_completed_date < milestone.actual_start || r.internal_completed_date > milestone.actual_completion) {
        throw new Error(
          `${where} completed ${r.internal_completed_date}, outside ${r.milestone_id}'s actual window `
          + `${milestone.actual_start} to ${milestone.actual_completion}`
        );
      }
    }

    // The rule the plant is allowed to bend and no other row may: a client view
    // may be stale, it may never have asserted a state that was false on the
    // day it was written.
    const earliest = earliestTrueDate(r, milestone);
    if (earliest !== "" && r.client_visible_updated_date < earliest) {
      throw new Error(
        `${where} published "${r.client_visible_status}" on ${r.client_visible_updated_date}, `
        + `and the earliest date that reading could be true is ${earliest}`
      );
    }
    if (r.client_visible_status === "in_progress" && isComplete
      && r.client_visible_updated_date >= r.internal_completed_date) {
      throw new Error(
        `${where} published "in_progress" on ${r.client_visible_updated_date}, on or after the task `
        + `completed on ${r.internal_completed_date}: that reading was already false when it was written`
      );
    }
    if (r.client_visible_status === "complete" && !isComplete) {
      throw new Error(`${where} tells the client the task is complete and the studio's own record does not`);
    }

    // The no-money rule and the dash self-check, over every cell.
    for (const [column, value] of Object.entries(r)) {
      if (/[$£€]|\d+\.\d{2}/.test(value)) {
        throw new Error(`${where} states a money figure in ${column}, and this file mints none`);
      }
      for (const dash of ["—", "–"]) {
        if (value.includes(dash)) throw new Error(`${where} carries an em dash or an en dash in ${column}`);
      }
    }
  }

  // File order is milestone order, and inside a milestone it is work order:
  // planned_end never runs backwards down the file.
  const order = [...new Set(rows.map((r) => r.milestone_id))];
  const scheduleOrder = schedule.map((m) => m.milestone_id);
  if (order.join(",") !== scheduleOrder.join(",")) {
    throw new Error(`${id}: the milestone blocks run [${order.join(", ")}], expected SMB-16's own order`);
  }
  for (let i = 1; i < rows.length; i += 1) {
    if (rows[i].planned_end < rows[i - 1].planned_end) {
      throw new Error(`${id}: ${rows[i].task_id} is planned to end before ${rows[i - 1].task_id}`);
    }
  }

  // T-F2, half two: every milestone SMB-16 carries is cited by at least one
  // task. A one-directional join would miss a milestone with no work in it.
  for (const m of schedule) {
    if (!rows.some((r) => r.milestone_id === m.milestone_id)) {
      throw new Error(`${id}: ${m.milestone_id} carries no task, so the schedule and the task list disagree`);
    }
  }

  const census = (predicate) => rows.filter(predicate).length;
  const expect = (label, actual, wanted) => {
    if (actual !== wanted) throw new Error(`${id}: ${label} is ${actual}, expected ${wanted}`);
  };
  for (const [milestoneId, wanted] of Object.entries(CENSUS.per_milestone)) {
    expect(`the task count for ${milestoneId}`, census((r) => r.milestone_id === milestoneId), wanted);
  }
  for (const [status, wanted] of Object.entries(CENSUS.internal_status)) {
    expect(`the internal_status ${status} count`, census((r) => r.internal_status === status), wanted);
  }
  for (const [status, wanted] of Object.entries(CENSUS.client_visible_status)) {
    expect(`the client_visible_status ${status} count`, census((r) => r.client_visible_status === status), wanted);
  }
  for (const role of RECORD_OWNER_ROLES) {
    if (census((r) => r.owner_role === role) === 0) {
      throw new Error(`${id}: no task is owned by the ${role} role, so the vocabulary is decorative`);
    }
  }

  // P4, both cardinalities, asserted here as well as in the public test.
  const disagreeing = rows.filter((r) => r.internal_status !== r.client_visible_status);
  expect("the count of rows disagreeing across the two status columns", disagreeing.length, CENSUS.disagreements);
  if (disagreeing[0].task_id !== PLANT_TASK_ID) {
    throw new Error(`${id}: the stale row is ${disagreeing[0].task_id}, and the data plan pins ${PLANT_TASK_ID}`);
  }
  if (disagreeing[0].internal_status !== "complete" || disagreeing[0].client_visible_status !== "in_progress") {
    throw new Error(`${id}: ${PLANT_TASK_ID} no longer reads complete internally against in_progress for the client`);
  }
  const old = rows.filter(
    (r) => daysBetween(r.client_visible_updated_date, AS_OF_DATE) > STALE_TIMESTAMP_DAYS
  );
  expect(
    `the count of client views written more than ${STALE_TIMESTAMP_DAYS} days before ${AS_OF_DATE}`,
    old.length, CENSUS.old_client_timestamps
  );
  if (old.map((r) => r.task_id).join(",") !== OLD_TIMESTAMP_TASK_IDS.join(",")) {
    throw new Error(
      `${id}: the old-timestamp rows are [${old.map((r) => r.task_id).join(", ")}], `
      + `expected [${OLD_TIMESTAMP_TASK_IDS.join(", ")}]`
    );
  }
  const correctButOld = old.filter((r) => r.internal_status === r.client_visible_status);
  expect("the count of correct rows the timestamp rule over-flags", correctButOld.length, CENSUS.old_client_timestamps - 1);
}

export function generate({ spec, canon }) {
  const rows = buildProjectTasks({ canon });
  if (spec?.columns && spec.columns.join(",") !== COLUMNS.join(",")) {
    throw new Error(`${id}: the spec's columns disagree with the builder's header`);
  }
  return [{ path: "project-tasks-and-dates.csv", content: toCsv(COLUMNS, rows) }];
}

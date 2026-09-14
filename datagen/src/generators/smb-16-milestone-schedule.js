// SMB-16 milestone-schedule: the planned and actual delivery schedule for the
// Okafor renovation, six milestones over 2026-02-16 to 2026-03-27.
//
// This file has no defects by design (data plan 2.7) and it is the reason the
// rest of cluster 2b can be falsified. SMB-12's tasks resolve into these
// milestone ids, SMB-13's documents cite them, and SMB-15's lateness claim is
// measured against these planned and actual dates. A planted defect here would
// make all three unfalsifiable, so the only thing this schedule carries is the
// truth the client record already froze.
//
// ---------------------------------------------------------------------------
// Why the late milestone could not be freely chosen.
//
// Four of the six milestones map one to one onto an SMB-04 delivery or closeout
// stage whose event_date is already frozen (data plan fact 0.8): kickoff
// 2026-02-16, demolition complete 2026-02-27, rough in complete 2026-03-13 and
// substantial completion 2026-03-20. Their actual_completion is therefore not a
// design choice, it is a join. If rough in had slipped, its planned end would
// have to precede 2026-03-13 and every milestone after it would slip too,
// giving two or more late milestones and breaking the tie-out. Demolition is
// the only milestone that can carry a slip without forcing a second, because
// the three weeks the plan gave rough in absorb it: rough in was planned three
// weeks and took two, starting 2026-03-02 rather than 2026-02-23.
//
// The four mapped dates are READ OUT OF SMB-04 at build time rather than
// retyped, behind a loud-throw pin: if the client record ever moves a stage
// date, this generator throws with the stage name instead of emitting a
// schedule that silently contradicts the record.
//
// ---------------------------------------------------------------------------
// The two cardinalities of A1, both true of these bytes.
//
//   1  milestone completed after its planned end (MST-LDB-02, demolition,
//      planned 2026-02-20 and actually 2026-02-27: seven calendar days and five
//      business days late).
//   2  milestones are past their planned end at the 2026-03-31 as-of date,
//      because MST-LDB-06 was planned to finish 2026-03-27 and has no
//      completion at all. Only one of the two has a completion to measure, which
//      is why a lateness rule has to test for a completion rather than for a
//      date in the past.
//
// Every row is designed content rather than a draw, so the rows are fixed data
// here and the generator takes no rng of its own: same bytes, forever.
//
// Rules carried from C1: R-MOCK (no payment surface at all in this file),
// R-ROLE (no person is named; the only human-shaped column is the client canon
// id, which is a household), R-NS (the id class is namespaced `MST-LDB-` from
// birth), and the no-money rule (this file mints no figure).
import { toCsv } from "../csv.js";
import { createRng } from "../seed.js";
import { buildOkaforRecord } from "./smb-04-client-record-okafor.js";

export const id = "SMB-16";

export const COLUMNS = [
  "milestone_id", "sequence", "milestone", "planned_start", "planned_end",
  "actual_start", "actual_completion", "milestone_status", "client_canon_id",
  "project_name",
];

export const TARGET_ROWS = 6;

/** The client the schedule belongs to. SMB-02's name for the column. */
export const CLIENT_CANON_ID = "co-131";

/** The as-of date the whole SMB pack reports against, SMB-04's own. */
export const AS_OF_DATE = "2026-03-31";

/** The delivery window this schedule covers, inclusive on both ends. */
export const WINDOW = { start: "2026-02-16", end: "2026-03-27" };

/** `milestone_status` vocabulary. A milestone is complete or it is open. */
export const MILESTONE_STATUSES = ["complete", "open"];

/**
 * The four SMB-04 stages a milestone maps onto, with the date the client record
 * already froze for each. The date is the pin: the builder reads the record's
 * own `event_date` and throws if it is not this string, so a record edit is a
 * loud failure here rather than a quiet contradiction between two files.
 */
export const SMB04_STAGE_PINS = {
  "MST-LDB-01": { stage: "kickoff", event_date: "2026-02-16" },
  "MST-LDB-02": { stage: "milestone_demolition_complete", event_date: "2026-02-27" },
  "MST-LDB-03": { stage: "milestone_rough_in_complete", event_date: "2026-03-13" },
  "MST-LDB-05": { stage: "substantial_completion", event_date: "2026-03-20" },
};

/** The census of data plan 2.7, in one place. */
export const CENSUS = {
  rows: TARGET_ROWS,
  complete: 5,
  open: 1,
  mapped_to_smb04: 4,
  completed_late: 1,
  past_planned_end_at_as_of: 2,
};

// ------------------------------------------------------------------- the rows
//
// `actual_completion` is left undeclared on the four mapped milestones: the
// builder fills it from SMB-04. MST-LDB-04 and MST-LDB-06 are the two the record
// does not carry, so they state their own value here, and MST-LDB-06's is the
// empty string because punch list and closeout is still open at the as-of date.

const MILESTONES = [
  {
    milestone_id: "MST-LDB-01",
    milestone: "Kickoff and site protection",
    planned_start: "2026-02-16",
    planned_end: "2026-02-16",
    actual_start: "2026-02-16",
  },
  {
    milestone_id: "MST-LDB-02",
    milestone: "Demolition and disposal",
    planned_start: "2026-02-17",
    planned_end: "2026-02-20",
    actual_start: "2026-02-17",
  },
  {
    milestone_id: "MST-LDB-03",
    milestone: "Plumbing and electrical rough in",
    planned_start: "2026-02-23",
    planned_end: "2026-03-13",
    actual_start: "2026-03-02",
  },
  {
    milestone_id: "MST-LDB-04",
    milestone: "Cabinetry and vanity installation",
    planned_start: "2026-03-16",
    planned_end: "2026-03-18",
    actual_start: "2026-03-16",
    actual_completion: "2026-03-18",
  },
  {
    milestone_id: "MST-LDB-05",
    milestone: "Tile, countertops and finish carpentry",
    planned_start: "2026-03-19",
    planned_end: "2026-03-20",
    actual_start: "2026-03-19",
  },
  {
    milestone_id: "MST-LDB-06",
    milestone: "Punch list and closeout",
    planned_start: "2026-03-23",
    planned_end: "2026-03-27",
    actual_start: "2026-03-23",
    actual_completion: "",
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

/**
 * SMB-04's emitted record, rebuilt from SMB-04's own seed rather than read off
 * disk, so this generator stays pure (spec and seed in, files out) and the
 * determinism test does not need a working tree.
 */
export function okaforRecord(canon) {
  return buildOkaforRecord({ canon, rng: (stream) => createRng("SMB-04", stream) });
}

/**
 * The four frozen stage dates, read from the client record and held against the
 * pin. Throws with the stage name if the record has moved, which is the whole
 * point: SMB-16 must not be able to disagree with SMB-04 quietly.
 */
export function mappedCompletions(record) {
  const byStage = new Map(record.stages.map((s) => [s.stage, s]));
  const out = {};
  for (const [milestoneId, pin] of Object.entries(SMB04_STAGE_PINS)) {
    const stage = byStage.get(pin.stage);
    if (!stage) {
      throw new Error(
        `${id}: SMB-04 no longer carries the stage "${pin.stage}", which ${milestoneId} maps onto`
      );
    }
    if (stage.event_date !== pin.event_date) {
      throw new Error(
        `${id}: SMB-04's "${pin.stage}" now reads ${stage.event_date} and ${milestoneId} is pinned to `
        + `${pin.event_date}. The schedule and the client record cannot both be right; fix the pin or the record.`
      );
    }
    out[milestoneId] = stage.event_date;
  }
  return out;
}

/**
 * @param {Map} canon canon companies lookup, unused here beyond SMB-04's own use
 * @returns {object[]} the six milestones, in sequence order
 */
export function buildMilestoneSchedule({ canon }) {
  const record = okaforRecord(canon);
  const completions = mappedCompletions(record);
  const projectName = record.client.project_name;
  const clientCanonId = record.client.client_canon_id;

  if (clientCanonId !== CLIENT_CANON_ID) {
    throw new Error(`${id}: SMB-04 now seats the client at ${clientCanonId}, and this schedule pins ${CLIENT_CANON_ID}`);
  }
  if (record.client.as_of_date !== AS_OF_DATE) {
    throw new Error(`${id}: SMB-04's as_of_date is ${record.client.as_of_date}, and this schedule reports against ${AS_OF_DATE}`);
  }
  if (projectName.trim() === "") throw new Error(`${id}: SMB-04 carries no project_name`);

  const rows = MILESTONES.map((m, index) => {
    const mapped = Object.hasOwn(completions, m.milestone_id);
    if (mapped && Object.hasOwn(m, "actual_completion")) {
      throw new Error(
        `${id}: ${m.milestone_id} maps onto an SMB-04 stage and also states its own completion. `
        + "A mapped milestone reads its date from the record."
      );
    }
    if (!mapped && !Object.hasOwn(m, "actual_completion")) {
      throw new Error(`${id}: ${m.milestone_id} maps onto no SMB-04 stage and states no completion of its own`);
    }
    const actualCompletion = mapped ? completions[m.milestone_id] : m.actual_completion;
    return row({
      milestone_id: m.milestone_id,
      sequence: String(index + 1),
      milestone: m.milestone,
      planned_start: m.planned_start,
      planned_end: m.planned_end,
      actual_start: m.actual_start,
      actual_completion: actualCompletion,
      milestone_status: actualCompletion === "" ? "open" : "complete",
      client_canon_id: clientCanonId,
      project_name: projectName,
    });
  });

  assertSchedule(rows);
  return rows;
}

// ---------------------------------------------------------------- assertions

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function assertSchedule(rows) {
  if (rows.length !== TARGET_ROWS) {
    throw new Error(`${id}: the schedule is ${rows.length} milestones, expected ${TARGET_ROWS}`);
  }

  for (const [i, r] of rows.entries()) {
    const where = `${id}: ${r.milestone_id}`;
    if (r.milestone_id !== `MST-LDB-${String(i + 1).padStart(2, "0")}`) {
      throw new Error(`${where} is out of id order at file position ${i + 1}`);
    }
    if (r.sequence !== String(i + 1)) throw new Error(`${where} carries sequence ${r.sequence} at file position ${i + 1}`);
    if (r.milestone.trim() === "") throw new Error(`${where} names no milestone`);
    if (!MILESTONE_STATUSES.includes(r.milestone_status)) {
      throw new Error(`${where} carries milestone_status "${r.milestone_status}"`);
    }
    if (r.client_canon_id !== CLIENT_CANON_ID) throw new Error(`${where} is not the ${CLIENT_CANON_ID} job`);

    // T-E2: a planned window that runs backwards, or an actual completion
    // before its own start, is not a schedule.
    for (const column of ["planned_start", "planned_end", "actual_start"]) {
      if (!ISO_DATE.test(r[column])) throw new Error(`${where} carries ${column} "${r[column]}", which is not an ISO date`);
    }
    if (r.actual_completion !== "" && !ISO_DATE.test(r.actual_completion)) {
      throw new Error(`${where} carries actual_completion "${r.actual_completion}", which is not an ISO date`);
    }
    if (r.planned_start > r.planned_end) throw new Error(`${where} is planned to end before it starts`);
    if (r.actual_completion !== "" && r.actual_start > r.actual_completion) {
      throw new Error(`${where} completed before it started`);
    }

    // T-E4: the status column is the completion column, restated.
    const shouldBe = r.actual_completion === "" ? "open" : "complete";
    if (r.milestone_status !== shouldBe) {
      throw new Error(`${where} reads ${r.milestone_status} against an actual_completion of "${r.actual_completion}"`);
    }

    // T-E6: every date sits inside the delivery window.
    for (const column of ["planned_start", "planned_end", "actual_start", "actual_completion"]) {
      const value = r[column];
      if (value === "") continue;
      if (value < WINDOW.start || value > WINDOW.end) {
        throw new Error(`${where} carries ${column} ${value}, outside ${WINDOW.start} to ${WINDOW.end}`);
      }
    }

    // The no-money rule and the dash self-check, over every cell rather than
    // over the one free-text column, because a schedule has more than one.
    for (const [column, value] of Object.entries(r)) {
      if (/[$£€]|\d+\.\d{2}/.test(value)) {
        throw new Error(`${where} states a money figure in ${column}, and this file mints none`);
      }
      for (const dash of ["—", "–"]) {
        if (value.includes(dash)) throw new Error(`${where} carries an em dash or an en dash in ${column}`);
      }
    }
  }

  // Sequence order is file order is date order: a schedule whose milestones do
  // not run forwards is a different document from the one the plan pins.
  for (let i = 1; i < rows.length; i += 1) {
    if (rows[i].planned_start < rows[i - 1].planned_start) {
      throw new Error(`${id}: ${rows[i].milestone_id} is planned to start before ${rows[i - 1].milestone_id}`);
    }
  }

  const census = (predicate) => rows.filter(predicate).length;
  const expect = (label, actual, wanted) => {
    if (actual !== wanted) throw new Error(`${id}: ${label} is ${actual}, expected ${wanted}`);
  };
  expect("the complete count", census((r) => r.milestone_status === "complete"), CENSUS.complete);
  expect("the open count", census((r) => r.milestone_status === "open"), CENSUS.open);
  expect(
    "the count of milestones mapped onto an SMB-04 stage",
    Object.keys(SMB04_STAGE_PINS).length,
    CENSUS.mapped_to_smb04
  );

  // A1, both cardinalities, asserted here as well as in the public test because
  // a plant nobody's builder holds is a plant one edit away from gone.
  const late = rows.filter((r) => r.actual_completion !== "" && r.actual_completion > r.planned_end);
  expect("the completed-late count", late.length, CENSUS.completed_late);
  if (late[0].milestone_id !== "MST-LDB-02") {
    throw new Error(`${id}: the late milestone is ${late[0].milestone_id}, and only demolition can carry a slip (plan 2.7)`);
  }
  const pastPlannedEnd = rows.filter(
    (r) => r.planned_end < AS_OF_DATE && (r.actual_completion === "" || r.actual_completion > r.planned_end)
  );
  expect(
    "the count past planned_end at the as-of date",
    pastPlannedEnd.length,
    CENSUS.past_planned_end_at_as_of
  );

  // The exact shape of the slip the SMB-15 notes will claim: seven calendar
  // days. Held as a number so a one-day edit to either date is a failure here.
  const slipDays = Math.round(
    (Date.parse(`${late[0].actual_completion}T00:00:00Z`) - Date.parse(`${late[0].planned_end}T00:00:00Z`)) / 86400000
  );
  if (slipDays !== 7) {
    throw new Error(`${id}: demolition is ${slipDays} calendar days late, and the pack's notes claim seven`);
  }
}

export function generate({ spec, canon }) {
  const rows = buildMilestoneSchedule({ canon });
  if (spec?.columns && spec.columns.join(",") !== COLUMNS.join(",")) {
    throw new Error(`${id}: the spec's columns disagree with the builder's header`);
  }
  return [{ path: "milestone-schedule.csv", content: toCsv(COLUMNS, rows) }];
}

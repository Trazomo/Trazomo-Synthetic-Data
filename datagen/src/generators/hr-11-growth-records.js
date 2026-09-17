// HR-11 goals-self-assessment-records: what each of the 55 people the review
// cycle covers was working toward across the half year it reviews, and what
// they say about their own progress at its close.
//
// Three shapes are the exercise rather than the decoration:
//
//   1. The population is not a choice. It is exactly the reviewee set of the
//      review cycle, taken from the shared lifecycle builder in process rather
//      than read back off the cycle's own committed CSVs, so the two artifacts
//      cannot disagree. The join is total in both directions: every employee
//      holds exactly three goals and exactly one self-assessment carrying
//      exactly three entries.
//   2. The level vocabulary is a published four-value ordered scale and the
//      stored value is the level's name. The positions live in the scale block
//      alone, so the order is published while no bare figure sits beside a
//      person's name.
//   3. A goal and a self-assessment are two records written at two times by two
//      people, so they ship as two files. Where one employee's self-assessment
//      sits two levels below what their goal aims at, that is a join a reader
//      performs rather than a subtraction inside one object, and nothing in the
//      bytes points at it.
//
// This is not a rating system and the schema is what says so: there is no
// third-party-assigned level anywhere, nothing totals or averages, every level
// is joined to a goal_id rather than to delivered work, and the review cycle
// roster carries no column any value here could populate. The artifact carries
// that argument itself, in growth-grammar.json's not_a_rating field.
//
// No money amount, no percentage, no numeric score, no rating, no pay band, no
// work location, no date of birth and no health note appears anywhere, and no
// time of day: every date is ISO and the record set holds no instant.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { addDays, isWeekend } from "../dates.js";
import { createRng } from "../seed.js";
import { buildLifecycleCoordination, lifecycleRoster } from "./hr-lifecycle.js";

export const id = "HR-11";

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..");

/** The frozen register the competency vocabulary is published in, HR-04's own source string. */
export const COMPETENCY_SOURCE = "role-requisition-register.json";
const HR_01_SOURCE_ARTIFACT = "HR-01";
const HR_01_REGISTER = join(REPO_ROOT, "artifacts", HR_01_SOURCE_ARTIFACT, COMPETENCY_SOURCE);

/** The library this record set was built against holds exactly these twelve ids. */
export const EXPECTED_COMPETENCY_IDS = [
  "CMP-01", "CMP-02", "CMP-03", "CMP-04", "CMP-05", "CMP-06",
  "CMP-07", "CMP-08", "CMP-09", "CMP-10", "CMP-11", "CMP-12",
];

/** The universe as-of, printed once per file and never contradicted. */
export const AS_OF = "2026-04-03";

/** The half year the goals cover, asserted against the cycle rather than typed. */
export const GOAL_PERIOD_START = "2025-10-01";
export const GOAL_PERIOD_END = "2026-03-31";

/** The one cycle in the pack, referenced read-only. */
export const REVIEW_CYCLE_ID = "RVC-2026-0001";

/** The first two full working weeks of the goal period: where the goals were approved. */
export const GOAL_SETTING_WINDOW = { start: "2025-10-06", end: "2025-10-17" };

/** The cycle's own open date through the day before the as-of: where the self-assessments were submitted. */
export const SELF_ASSESSMENT_WINDOW = { start: "2026-03-23", end: "2026-04-02" };

export const GRAMMAR_ID = "GROWTH-GRAMMAR-2026-04-03";
export const GOAL_RECORD_SET_ID = "GOAL-RECORDS-2026-04-03";
export const SELF_ASSESSMENT_RECORD_SET_ID = "SELF-ASSESSMENTS-2026-04-03";

/** The artifacts this record set is derived from, none of them edited by it. */
export const SOURCE_ARTIFACTS = ["CORE-04", "HR-01", "HR-08"];

/**
 * The published scale: ordered, named, four values, a definition on every
 * level. The stored value is the name; the position exists here and nowhere
 * else in the shipped bytes, which is what keeps a figure away from a person's
 * name while leaving the order explicit and recomputable.
 */
export const PROFICIENCY_SCALE = [
  {
    position: 1,
    name: "learning",
    definition: "does this with someone alongside who has done it before, and is still building the habit",
  },
  {
    position: 2,
    name: "applying",
    definition: "does this on their own work without being asked",
  },
  {
    position: 3,
    name: "extending",
    definition: "does this where the work crosses into another team, and can say why they chose what they chose",
  },
  {
    position: 4,
    name: "teaching",
    definition: "is the person another team asks, and the way they do it is the way the team does it",
  },
];

/**
 * Which three competencies a goal set covers is not a draw: it is this table,
 * one row per distinct reviewee role title, printed byte-equal to the roster
 * including the comma in the two director titles. Eleven of the twelve library
 * competencies are used; commercial judgment is used by no row, because no
 * People or IT & Security role carries a commercial competency and attaching
 * one would be a claim about the organisation no frozen byte supports.
 */
export const ROLE_COMPETENCY_MAP = [
  { role_title: "People Operations Specialist", department: "People", competency_ids: ["CMP-04", "CMP-07", "CMP-12"] },
  { role_title: "HR Business Partner", department: "People", competency_ids: ["CMP-04", "CMP-05", "CMP-09"] },
  { role_title: "People Manager", department: "People", competency_ids: ["CMP-05", "CMP-09", "CMP-10"] },
  { role_title: "Recruiter", department: "People", competency_ids: ["CMP-04", "CMP-05", "CMP-06"] },
  { role_title: "Director, People", department: "People", competency_ids: ["CMP-01", "CMP-08", "CMP-10"] },
  { role_title: "Security Engineer", department: "IT & Security", competency_ids: ["CMP-02", "CMP-03", "CMP-12"] },
  { role_title: "IT Administrator", department: "IT & Security", competency_ids: ["CMP-02", "CMP-07", "CMP-12"] },
  { role_title: "IT & Security Manager", department: "IT & Security", competency_ids: ["CMP-01", "CMP-09", "CMP-10"] },
  { role_title: "Director, IT & Security", department: "IT & Security", competency_ids: ["CMP-08", "CMP-09", "CMP-10"] },
];

/**
 * The classification argument, shipped in the artifact rather than asserted in
 * a plan, so a reader holding only the bytes reaches the same conclusion.
 */
export const NOT_A_RATING = [
  "Nobody rates anybody. The only two levels in this record set are the level a goal aims at, which is a plan the "
  + "approver agreed, and the level a person places themselves at, which is self-reported. There is no "
  + "manager-assigned level anywhere.",
  "It describes a way of working rather than a period. The four definitions say how far a practice has spread, from "
  + "doing the work with someone alongside to being the person another team asks, and none of them says how well "
  + "anything went.",
  "Nothing aggregates. There is no total, no average, no rank, no band and no field that sums across competencies or "
  + "across people.",
  "Every level is joined to a goal_id rather than to delivered work, so a level sits against a plan rather than "
  + "against what was shipped.",
  "The review cycle roster carries no column any value here could populate, so the absence runs both ways: the cycle "
  + "refuses review content and this record set emits nothing the cycle could accept.",
];

/** The one templated goal sentence. It names no deliverable, no person and no judgment. */
export function goalStatement(targetLevel, competencyName) {
  return `Reach ${targetLevel} on ${competencyName} by ${GOAL_PERIOD_END}.`;
}

/** The four first-person notes, chosen by self_level alone and by nothing else. */
export const NOTE_BY_LEVEL = {
  learning: "I have done this with someone alongside me and I am still building the habit.",
  applying: "I do this on my own work without being asked.",
  extending: "I do this where the work crosses into another team and I can say why I chose what I chose.",
  teaching: "Other teams ask me how this is done here.",
};

/**
 * The delta profiles, in published order. A profile is one employee's three
 * position deltas, target minus self. The first is the conflict profile and is
 * carried by the drawn employee; the other five are dealt to the rest by a
 * stated sort rather than by draw order (see dealProfiles).
 *
 * Across the 165 entries this is 1 at plus two, 44 at plus one, 100 in
 * agreement and 20 at minus one, and across the 55 employees it is 8 in
 * agreement on all three.
 */
export const DELTA_PROFILES = [
  { deltas: [2, 0, 0], count: 1 },
  { deltas: [1, 1, 0], count: 10 },
  { deltas: [1, 1, -1], count: 4 },
  { deltas: [1, 0, 0], count: 16 },
  { deltas: [-1, 0, 0], count: 16 },
  { deltas: [0, 0, 0], count: 8 },
];

/** The entry-level delta census the builder refuses to ship without. */
export const DELTA_DISTRIBUTION = { "2": 1, "1": 44, "0": 100, "-1": 20 };

/** The employee-level censuses the builder refuses to ship without. */
export const EMPLOYEE_CENSUSES = {
  two_level_delta: 1,
  absolute_two_level_delta: 1,
  summed_delta_at_least_two: 11,
  any_shortfall: 31,
  self_above_goal: 20,
  all_agree: 8,
};

/** A goal aims at applying or above; the bottom of the scale is a place a person starts from. */
const LOWEST_TARGET_POSITION = 2;

const POSITION_BY_NAME = new Map(PROFICIENCY_SCALE.map((level) => [level.name, level.position]));
const NAME_BY_POSITION = new Map(PROFICIENCY_SCALE.map((level) => [level.position, level.name]));
const SCALE_TOP = PROFICIENCY_SCALE.length;

// --------------------------------------------------------------- small helpers

/** Every business day in an inclusive ISO window, oldest first. */
function businessDays(startIso, endIso) {
  const out = [];
  for (let day = startIso; day <= endIso; day = addDays(day, 1)) {
    if (!isWeekend(day)) out.push(day);
  }
  return out;
}

function fullName(row) {
  return `${row.first_name} ${row.last_name}`;
}

/** Rotate a three-value profile so the shortfall does not always land on the same competency. */
function rotate(values, by) {
  const shift = ((by % values.length) + values.length) % values.length;
  return values.slice(shift).concat(values.slice(0, shift));
}

// ------------------------------------------------------- the frozen competency library

/**
 * The twelve competencies, read out of the frozen HR-01 register on disk rather
 * than retyped, and refused unless the library still holds the shape this
 * record set was built against. A count, id or key mismatch names itself,
 * because the next person to see it will be amending HR-01 and needs to know
 * what moved.
 * @returns {{competency_id: string, name: string}[]}
 */
export function readCompetencyLibrary() {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(HR_01_REGISTER, "utf8"));
  } catch (cause) {
    throw new Error(
      `${id}: could not read the frozen register at artifacts/${HR_01_SOURCE_ARTIFACT}/${COMPETENCY_SOURCE}: `
      + `${cause.message}`
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${id}: the ${HR_01_SOURCE_ARTIFACT} register is not a JSON object`);
  }
  const library = parsed.competency_library;
  if (!Array.isArray(library)) {
    throw new Error(
      `${id}: the ${HR_01_SOURCE_ARTIFACT} register carries no "competency_library" list `
      + `(top-level keys: ${Object.keys(parsed).join(", ") || "none"})`
    );
  }
  if (library.length !== EXPECTED_COMPETENCY_IDS.length) {
    throw new Error(
      `${id}: expected ${EXPECTED_COMPETENCY_IDS.length} competencies in the ${HR_01_SOURCE_ARTIFACT} library, `
      + `found ${library.length}. The library moved, so the growth records and their consumers need a look.`
    );
  }
  library.forEach((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`${id}: ${HR_01_SOURCE_ARTIFACT} competency #${index + 1} is not an object`);
    }
    if (typeof entry.competency_id !== "string" || typeof entry.name !== "string") {
      throw new Error(
        `${id}: ${HR_01_SOURCE_ARTIFACT} competency #${index + 1} does not carry both a competency_id and a name`
      );
    }
    if (entry.competency_id !== EXPECTED_COMPETENCY_IDS[index]) {
      throw new Error(
        `${id}: ${HR_01_SOURCE_ARTIFACT} competency #${index + 1} is ${entry.competency_id}, `
        + `expected ${EXPECTED_COMPETENCY_IDS[index]}`
      );
    }
  });
  return library;
}

// ------------------------------------------------------------ the population

/**
 * The reviewee set of the review cycle, taken from the shared builder in
 * process. Everything the population needs is pinned here, before a single
 * level is drawn.
 */
function readPopulation() {
  const { review, hr09, roster } = buildLifecycleCoordination();
  const rosterRows = lifecycleRoster();
  if (rosterRows.length !== roster.length) {
    throw new Error(
      `${id}: the roster built here holds ${rosterRows.length} rows against the ${roster.length} the cycle was built on`
    );
  }
  const byId = new Map(rosterRows.map((row) => [row.employee_id, row]));
  if (review.cycle.length !== 1) {
    throw new Error(`${id}: the review cycle file carries ${review.cycle.length} rows, expected exactly 1`);
  }
  const [cycle] = review.cycle;
  if (cycle.cycle_id !== REVIEW_CYCLE_ID) {
    throw new Error(`${id}: the cycle states ${cycle.cycle_id}, expected ${REVIEW_CYCLE_ID}`);
  }
  if (cycle.period_start !== GOAL_PERIOD_START || cycle.period_end !== GOAL_PERIOD_END) {
    throw new Error(
      `${id}: the cycle covers ${cycle.period_start} to ${cycle.period_end}, and the goal period is `
      + `${GOAL_PERIOD_START} to ${GOAL_PERIOD_END}. The two are the same half year or neither is readable.`
    );
  }
  if (cycle.as_of !== AS_OF) {
    throw new Error(`${id}: the cycle is as of ${cycle.as_of} and this record set is as of ${AS_OF}`);
  }

  const assignmentByReviewee = new Map();
  for (const row of review.assignments) {
    if (row.cycle_id !== REVIEW_CYCLE_ID) {
      throw new Error(`${id}: assignment ${row.assignment_id} names cycle ${row.cycle_id}`);
    }
    if (assignmentByReviewee.has(row.reviewee_employee_id)) {
      throw new Error(
        `${id}: ${row.reviewee_employee_id} is a reviewee on two assignments, so the approver is ambiguous`
      );
    }
    assignmentByReviewee.set(row.reviewee_employee_id, row);
  }
  if (assignmentByReviewee.size !== 55) {
    throw new Error(`${id}: the cycle holds ${assignmentByReviewee.size} distinct reviewees, expected 55`);
  }

  // The single assignment that is outstanding and past its due date at the
  // as-of, recomputed from the assignments in memory before any draw happens.
  const outstandingPastDue = review.assignments.filter(
    (row) => row.submitted_date === "" && row.due_date < AS_OF
  );
  if (outstandingPastDue.length !== 1) {
    throw new Error(
      `${id}: ${outstandingPastDue.length} assignments are outstanding and past their due date, expected exactly 1. `
      + `The exclusion that keeps two findings off one person needs a unique row to exclude.`
    );
  }
  const [pastDue] = outstandingPastDue;

  const people = [...assignmentByReviewee.keys()].sort().map((employeeId) => {
    const assignment = assignmentByReviewee.get(employeeId);
    const row = byId.get(employeeId);
    if (!row) throw new Error(`${id}: reviewee ${employeeId} is not a roster row`);
    if (row.employment_status !== "active") {
      throw new Error(`${id}: reviewee ${employeeId} is not active, and a growth record needs a live person`);
    }
    if (fullName(row) !== assignment.reviewee_full_name) {
      throw new Error(`${id}: ${employeeId} full name does not match the cycle's own`);
    }
    if (row.role_title !== assignment.reviewee_role_title || row.department !== assignment.reviewee_department) {
      throw new Error(`${id}: ${employeeId} role title or department does not match the cycle's own`);
    }
    if (row.start_date > GOAL_PERIOD_END) {
      throw new Error(`${id}: ${employeeId} started after the goal period closed`);
    }
    const approver = byId.get(assignment.reviewer_employee_id);
    if (!approver) throw new Error(`${id}: the approver of ${employeeId} is not a roster row`);
    if (approver.employment_status !== "active") {
      throw new Error(`${id}: the approver of ${employeeId} is not active, so a goal has no live addressee`);
    }
    return {
      employee_id: employeeId,
      full_name: fullName(row),
      department: row.department,
      role_title: row.role_title,
      level: row.level,
      approved_by_employee_id: approver.employee_id,
      approved_by_full_name: fullName(approver),
    };
  });

  return {
    people,
    // The four people a second finding must stay off, each recomputed in
    // process before any draw: the two ends of the one outstanding past-due
    // assignment, and the two members of the frozen one-to-one pair.
    exclusions: {
      past_due_reviewer: pastDue.reviewer_employee_id,
      past_due_reviewee: pastDue.reviewee_employee_id,
      frozen_pair_manager: hr09.manager.employee_id,
      frozen_pair_report: hr09.report.employee_id,
    },
  };
}

// ---------------------------------------------------------------- the role map

/** The role map, pinned against the population and against the frozen library. */
function readRoleMap(people, library) {
  const known = new Set(library.map((entry) => entry.competency_id));
  const seen = new Set();
  for (const row of ROLE_COMPETENCY_MAP) {
    if (seen.has(row.role_title)) throw new Error(`${id}: the role map names "${row.role_title}" twice`);
    seen.add(row.role_title);
    if (row.competency_ids.length !== 3) {
      throw new Error(`${id}: the role map row "${row.role_title}" carries ${row.competency_ids.length} ids, expected 3`);
    }
    if (new Set(row.competency_ids).size !== 3) {
      throw new Error(`${id}: the role map row "${row.role_title}" repeats a competency id`);
    }
    const ascending = [...row.competency_ids].sort();
    if (ascending.join(",") !== row.competency_ids.join(",")) {
      throw new Error(`${id}: the role map row "${row.role_title}" does not run in ascending competency order`);
    }
    for (const competencyId of row.competency_ids) {
      if (!known.has(competencyId)) {
        throw new Error(
          `${id}: the role map row "${row.role_title}" names ${competencyId}, which the `
          + `${HR_01_SOURCE_ARTIFACT} library does not carry`
        );
      }
    }
  }
  const titles = new Set(people.map((person) => person.role_title));
  for (const title of titles) {
    if (!seen.has(title)) {
      throw new Error(
        `${id}: the population holds "${title}", which the role map does not cover. A widened review scope `
        + `needs a role map row rather than a silently dropped person.`
      );
    }
  }
  for (const title of seen) {
    if (!titles.has(title)) {
      throw new Error(`${id}: the role map names "${title}", which no reviewee holds`);
    }
  }
  return new Map(ROLE_COMPETENCY_MAP.map((row) => [row.role_title, row.competency_ids]));
}

// ----------------------------------------------------------- the carrier draw

/**
 * The one employee whose self-assessment sits two levels below what one of
 * their goals aims at. Drawn against six clauses, every one of them recomputed
 * from the cycle's own rows before the draw rather than checked over finished
 * files. Nothing in the shipped bytes, in this file's comments or in the tests
 * says which row it lands on.
 */
function drawConflictCarrier(people, exclusions, population) {
  /**
   * The six clauses, as a list of predicates so the draw and the post-condition
   * read the same rule. Clause 1 holds by construction: `people` is the
   * reviewee set and nothing else ever enters it, and it is asserted anyway.
   */
  const clauses = [
    ["1 is a reviewee of the cycle", (person) => population.has(person.employee_id)],
    ["2 is an individual contributor", (person) => person.level === "IC"],
    [
      "3 is not the reviewer of the outstanding past-due assignment",
      (person) => person.employee_id !== exclusions.past_due_reviewer,
    ],
    [
      "4 is not the reviewee of the outstanding past-due assignment",
      (person) => person.employee_id !== exclusions.past_due_reviewee,
    ],
    [
      "5 is neither member of the frozen one-to-one pair",
      (person) =>
        person.employee_id !== exclusions.frozen_pair_manager
        && person.employee_id !== exclusions.frozen_pair_report,
    ],
    ["6 holds an approver who resolves to an active row", (person) => person.approved_by_employee_id !== ""],
  ];
  const satisfies = (person) => clauses.every(([, holds]) => holds(person));
  const candidates = people.filter(satisfies);
  if (candidates.length === 0) {
    throw new Error(
      `${id}: no reviewee satisfies the carrier clauses, so the record set cannot carry its one conflict by rule`
    );
  }
  const carrier = createRng(id, "conflict-carrier").pick(candidates);
  for (const [clause, holds] of clauses) {
    if (!holds(carrier)) {
      throw new Error(`${id}: the drawn conflict carrier fails clause ${clause}`);
    }
  }
  return { carrier, candidateCount: candidates.length };
}

// ------------------------------------------------------------ profile dealing

/**
 * The profiles are dealt by a stated sort rather than by draw order, so a
 * reordering of anything upstream cannot move the censuses: the carrier takes
 * the conflict profile, and the rest are dealt to the remaining employees in
 * employee_id order, cycling through the other profile classes in published
 * order and skipping a class once its count is spent.
 */
function dealProfiles(people, carrier) {
  const total = DELTA_PROFILES.reduce((sum, profile) => sum + profile.count, 0);
  if (total !== people.length) {
    throw new Error(`${id}: the profiles cover ${total} employees against a population of ${people.length}`);
  }
  const [conflict, ...rest] = DELTA_PROFILES;
  if (conflict.count !== 1) {
    throw new Error(`${id}: the conflict profile is dealt to ${conflict.count} employees, expected 1`);
  }
  const remaining = rest.map((profile) => profile.count);
  const deck = [];
  while (deck.length < people.length - 1) {
    let dealt = 0;
    for (let k = 0; k < rest.length; k++) {
      if (remaining[k] > 0 && deck.length < people.length - 1) {
        deck.push(rest[k].deltas);
        remaining[k] -= 1;
        dealt += 1;
      }
    }
    if (dealt === 0) throw new Error(`${id}: the profile deck ran dry at ${deck.length} of ${people.length - 1}`);
  }
  const byEmployee = new Map();
  let cursor = 0;
  for (const person of people) {
    if (person.employee_id === carrier.employee_id) {
      byEmployee.set(person.employee_id, conflict.deltas);
    } else {
      byEmployee.set(person.employee_id, deck[cursor++]);
    }
  }
  if (cursor !== deck.length) {
    throw new Error(`${id}: the profile deck holds ${deck.length} entries against ${cursor} dealt`);
  }
  return byEmployee;
}

// ------------------------------------------------------------------ the build

function buildRecords() {
  const library = readCompetencyLibrary();
  const nameById = new Map(library.map((entry) => [entry.competency_id, entry.name]));
  const { people, exclusions } = readPopulation();
  const competenciesFor = readRoleMap(people, library);
  const population = new Set(people.map((person) => person.employee_id));
  const { carrier, candidateCount } = drawConflictCarrier(people, exclusions, population);
  const profiles = dealProfiles(people, carrier);

  const approvalDays = businessDays(GOAL_SETTING_WINDOW.start, GOAL_SETTING_WINDOW.end);
  const submissionDays = businessDays(SELF_ASSESSMENT_WINDOW.start, SELF_ASSESSMENT_WINDOW.end);
  if (approvalDays.length === 0 || submissionDays.length === 0) {
    throw new Error(`${id}: one of the two windows holds no business day`);
  }
  const approvalRng = createRng(id, "goal-approval");
  const submissionRng = createRng(id, "self-assessment-submission");
  const targetRng = createRng(id, "target-levels");

  const goals = [];
  const selfAssessments = [];

  people.forEach((person, personIndex) => {
    const competencyIds = competenciesFor.get(person.role_title);
    const deltas = rotate(profiles.get(person.employee_id), personIndex);
    const approvedDate = approvalRng.pick(approvalDays);
    const submittedDate = submissionRng.pick(submissionDays);
    const entries = [];

    competencyIds.forEach((competencyId, slot) => {
      const delta = deltas[slot];
      const allowed = [];
      for (let position = LOWEST_TARGET_POSITION; position <= SCALE_TOP; position++) {
        const self = position - delta;
        if (self >= 1 && self <= SCALE_TOP) allowed.push(position);
      }
      if (allowed.length === 0) {
        throw new Error(`${id}: a delta of ${delta} leaves no target position inside the published scale`);
      }
      const targetPosition = targetRng.pick(allowed);
      const selfPosition = targetPosition - delta;
      if (selfPosition < 1 || selfPosition > SCALE_TOP) {
        throw new Error(
          `${id}: a target at position ${targetPosition} with a delta of ${delta} places a self level at `
          + `position ${selfPosition}, which is outside the published scale`
        );
      }
      const targetLevel = NAME_BY_POSITION.get(targetPosition);
      const selfLevel = NAME_BY_POSITION.get(selfPosition);
      const competencyName = nameById.get(competencyId);
      if (!competencyName) throw new Error(`${id}: ${competencyId} does not resolve in the frozen library`);
      const goalId = `GOL-2026-${String(goals.length + 1).padStart(4, "0")}`;
      goals.push({
        goal_id: goalId,
        employee_id: person.employee_id,
        full_name: person.full_name,
        department: person.department,
        role_title: person.role_title,
        competency_id: competencyId,
        competency_name: competencyName,
        goal_statement: goalStatement(targetLevel, competencyName),
        target_level: targetLevel,
        approved_by_employee_id: person.approved_by_employee_id,
        approved_by_full_name: person.approved_by_full_name,
        approved_date: approvedDate,
      });
      entries.push({
        competency_id: competencyId,
        goal_id: goalId,
        self_level: selfLevel,
        note: NOTE_BY_LEVEL[selfLevel],
      });
    });

    selfAssessments.push({
      self_assessment_id: `GSA-2026-${String(selfAssessments.length + 1).padStart(4, "0")}`,
      employee_id: person.employee_id,
      full_name: person.full_name,
      department: person.department,
      role_title: person.role_title,
      submitted_date: submittedDate,
      entries,
    });
  });

  return { people, goals, selfAssessments, candidateCount, approvalDays, submissionDays };
}

// ------------------------------------------------------------ the assertions

/** HR-09's four closed lists, restated here so every emitted string can be swept against them. */
export const HR_09_CLOSED_LISTS = {
  frequency_adverbs: ["consistently", "repeatedly", "routinely", "habitually", "always", "never"],
  deadline_lexemes: ["deadline", "deadlines", "due date", "due dates", "overdue", "late", "past due", "slipped"],
  character_claim_phrases: [
    "not a team player", "poor attitude", "lacks initiative", "difficult to work with", "not detail oriented",
  ],
  log_deliverables: [
    "onboarding buddy program", "new hire welcome pack", "benefits enrollment guide",
    "exit interview summary template", "manager onboarding checklist", "interview scheduling handbook",
    "probation review calendar", "internal transfer checklist", "people data hygiene sweep",
    "leave request tracker cleanup", "onboarding survey refresh", "policy acknowledgment tracker",
  ],
};

/**
 * Token matching with letter boundaries, which is the only reading the lists
 * support: a bare substring sweep makes "template" a deadline lexeme and a
 * surname a frequency adverb.
 */
export function carriesToken(text, token) {
  return new RegExp(`(?<![A-Za-z])${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z])`, "i").test(text);
}

/** Every string value anywhere in a JSON-shaped value, keys included. */
function walkStrings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const item of value) walkStrings(item, out);
  else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      out.push(key);
      walkStrings(item, out);
    }
  }
  return out;
}

function assertRecords({ people, goals, selfAssessments, approvalDays, submissionDays }, bundles) {
  const expectedGoals = people.length * 3;
  if (goals.length !== expectedGoals) {
    throw new Error(`${id}: ${goals.length} goal records against ${expectedGoals} expected`);
  }
  if (selfAssessments.length !== people.length) {
    throw new Error(`${id}: ${selfAssessments.length} self-assessments against ${people.length} employees`);
  }
  const entryCount = selfAssessments.reduce((sum, record) => sum + record.entries.length, 0);
  if (entryCount !== expectedGoals) {
    throw new Error(`${id}: ${entryCount} self-assessment entries against ${expectedGoals} goal records`);
  }

  // the total join, both directions
  const goalsByEmployee = new Map();
  for (const goal of goals) {
    if (!goalsByEmployee.has(goal.employee_id)) goalsByEmployee.set(goal.employee_id, []);
    goalsByEmployee.get(goal.employee_id).push(goal);
  }
  if (goalsByEmployee.size !== people.length) {
    throw new Error(`${id}: ${goalsByEmployee.size} employees hold a goal against ${people.length} in the population`);
  }
  for (const person of people) {
    const held = goalsByEmployee.get(person.employee_id);
    if (!held || held.length !== 3) {
      throw new Error(`${id}: ${person.employee_id} holds ${held ? held.length : 0} goals, expected 3`);
    }
  }

  // ids: dense, unique, in the stated sort order
  const goalOrder = [...goals].sort(
    (a, b) => a.employee_id.localeCompare(b.employee_id) || a.competency_id.localeCompare(b.competency_id)
  );
  goals.forEach((goal, index) => {
    const expected = `GOL-2026-${String(index + 1).padStart(4, "0")}`;
    if (goal.goal_id !== expected) throw new Error(`${id}: goal #${index + 1} carries ${goal.goal_id}`);
    if (goalOrder[index].goal_id !== goal.goal_id) {
      throw new Error(`${id}: the goal ids do not run in (employee_id, competency_id) order at ${goal.goal_id}`);
    }
  });
  const assessmentOrder = [...selfAssessments].sort((a, b) => a.employee_id.localeCompare(b.employee_id));
  selfAssessments.forEach((record, index) => {
    const expected = `GSA-2026-${String(index + 1).padStart(4, "0")}`;
    if (record.self_assessment_id !== expected) {
      throw new Error(`${id}: self-assessment #${index + 1} carries ${record.self_assessment_id}`);
    }
    if (assessmentOrder[index].self_assessment_id !== record.self_assessment_id) {
      throw new Error(`${id}: the self-assessment ids do not run in employee_id order`);
    }
  });

  // dates
  const approvalWindow = new Set(approvalDays);
  const submissionWindow = new Set(submissionDays);
  for (const [employeeId, held] of goalsByEmployee) {
    const dates = new Set(held.map((goal) => goal.approved_date));
    if (dates.size !== 1) {
      throw new Error(`${id}: ${employeeId} holds ${dates.size} approval dates, and one sitting approves all three`);
    }
    const [approved] = dates;
    if (!approvalWindow.has(approved)) {
      throw new Error(`${id}: an approval date of ${approved} is not a business day in the goal-setting window`);
    }
  }
  for (const record of selfAssessments) {
    if (!submissionWindow.has(record.submitted_date)) {
      throw new Error(
        `${id}: a submission date of ${record.submitted_date} is not a business day in the self-assessment window`
      );
    }
  }

  // levels, notes and statements
  const goalById = new Map(goals.map((goal) => [goal.goal_id, goal]));
  const deltasByEmployee = new Map();
  for (const record of selfAssessments) {
    const held = goalsByEmployee.get(record.employee_id);
    if (record.entries.length !== 3) {
      throw new Error(`${id}: ${record.employee_id} carries ${record.entries.length} entries, expected 3`);
    }
    const deltas = [];
    record.entries.forEach((entry, slot) => {
      const goal = goalById.get(entry.goal_id);
      if (!goal) throw new Error(`${id}: entry ${entry.goal_id} resolves to no goal`);
      if (goal.employee_id !== record.employee_id) {
        throw new Error(`${id}: ${record.employee_id} carries an entry against another employee's goal`);
      }
      if (goal.competency_id !== entry.competency_id || held[slot].goal_id !== entry.goal_id) {
        throw new Error(`${id}: ${record.employee_id} entry ${slot + 1} does not sit against its own goal`);
      }
      const target = POSITION_BY_NAME.get(goal.target_level);
      const self = POSITION_BY_NAME.get(entry.self_level);
      if (!target || !self) {
        throw new Error(`${id}: a level outside the published scale reached ${entry.goal_id}`);
      }
      if (target < LOWEST_TARGET_POSITION) {
        throw new Error(`${id}: a goal aims at position ${target}, below the lowest published target`);
      }
      if (entry.note !== NOTE_BY_LEVEL[entry.self_level]) {
        throw new Error(`${id}: the note on ${entry.goal_id} is not the published sentence for its own level`);
      }
      if (goal.goal_statement !== goalStatement(goal.target_level, goal.competency_name)) {
        throw new Error(`${id}: the statement on ${goal.goal_id} does not match the published template`);
      }
      deltas.push(target - self);
    });
    deltasByEmployee.set(record.employee_id, deltas);
  }

  // the distribution and the censuses
  const distribution = {};
  for (const deltas of deltasByEmployee.values()) {
    for (const delta of deltas) distribution[delta] = (distribution[delta] || 0) + 1;
  }
  for (const [delta, expected] of Object.entries(DELTA_DISTRIBUTION)) {
    const found = distribution[delta] || 0;
    if (found !== expected) {
      throw new Error(`${id}: ${found} entries sit at a delta of ${delta}, expected ${expected}`);
    }
  }
  const distributionTotal = Object.values(distribution).reduce((sum, n) => sum + n, 0);
  if (distributionTotal !== expectedGoals) {
    throw new Error(`${id}: the delta census covers ${distributionTotal} entries against ${expectedGoals}`);
  }
  const census = {
    two_level_delta: 0,
    absolute_two_level_delta: 0,
    summed_delta_at_least_two: 0,
    any_shortfall: 0,
    self_above_goal: 0,
    all_agree: 0,
  };
  let twoLevelEntries = 0;
  for (const deltas of deltasByEmployee.values()) {
    if (deltas.some((delta) => delta >= 2)) census.two_level_delta += 1;
    if (deltas.some((delta) => Math.abs(delta) >= 2)) census.absolute_two_level_delta += 1;
    if (deltas.reduce((sum, delta) => sum + delta, 0) >= 2) census.summed_delta_at_least_two += 1;
    if (deltas.some((delta) => delta > 0)) census.any_shortfall += 1;
    if (deltas.some((delta) => delta < 0)) census.self_above_goal += 1;
    if (deltas.every((delta) => delta === 0)) census.all_agree += 1;
    twoLevelEntries += deltas.filter((delta) => delta >= 2).length;
  }
  for (const [name, expected] of Object.entries(EMPLOYEE_CENSUSES)) {
    if (census[name] !== expected) {
      throw new Error(`${id}: the ${name} census reads ${census[name]}, expected ${expected}`);
    }
  }
  if (twoLevelEntries !== 1) {
    throw new Error(`${id}: ${twoLevelEntries} entries sit two levels or more below their own goal, expected 1`);
  }

  // the emitted strings: the id blocks, the four closed lists, the house rules
  const strings = walkStrings(bundles);
  const goalIds = new Set(goals.map((goal) => goal.goal_id));
  const assessmentIds = new Set(selfAssessments.map((record) => record.self_assessment_id));
  for (const text of strings) {
    if (text.includes("GOL-") && !goalIds.has(text)) {
      throw new Error(`${id}: "GOL-" reaches a string that is not one of this record set's own goal ids`);
    }
    if (text.includes("GSA-") && !assessmentIds.has(text)) {
      throw new Error(`${id}: "GSA-" reaches a string that is not one of this record set's own self-assessment ids`);
    }
    if (text.includes("\u2014") || text.includes("\u2013")) {
      throw new Error(`${id}: an emitted string carries a dash the house rules keep out of the pack`);
    }
    if (/\$|%/.test(text)) throw new Error(`${id}: an emitted string carries a money or percentage mark`);
    if (/\d{2}:\d{2}/.test(text)) throw new Error(`${id}: an emitted string carries a time of day`);
    for (const [listName, tokens] of Object.entries(HR_09_CLOSED_LISTS)) {
      for (const token of tokens) {
        if (carriesToken(text, token)) {
          throw new Error(
            `${id}: an emitted string carries "${token}" from the frozen ${listName} list, which would make this `
            + `record set a second source for a draft another module works on`
          );
        }
      }
    }
  }
}

/** The published key orders, asserted against the emitted objects rather than trusted. */
export const KEY_ORDERS = {
  grammar: [
    "grammar_id", "as_of", "goal_period_start", "goal_period_end", "review_cycle_id",
    "source_artifacts", "competency_source", "proficiency_scale", "role_competency_map",
    "goal_setting_window", "self_assessment_window", "record_counts", "not_a_rating",
  ],
  goalSet: ["record_set_id", "as_of", "goal_period_start", "goal_period_end", "review_cycle_id", "goals"],
  goal: [
    "goal_id", "employee_id", "full_name", "department", "role_title",
    "competency_id", "competency_name", "goal_statement", "target_level",
    "approved_by_employee_id", "approved_by_full_name", "approved_date",
  ],
  selfAssessmentSet: [
    "record_set_id", "as_of", "goal_period_start", "goal_period_end", "review_cycle_id", "self_assessments",
  ],
  selfAssessment: [
    "self_assessment_id", "employee_id", "full_name", "department", "role_title", "submitted_date", "entries",
  ],
  entry: ["competency_id", "goal_id", "self_level", "note"],
};

function assertKeyOrder(value, expected, what) {
  const found = Object.keys(value);
  if (found.join(",") !== expected.join(",")) {
    throw new Error(`${id}: ${what} carries the keys ${found.join(", ")}, expected ${expected.join(", ")}`);
  }
}

// ------------------------------------------------------------------- the emit

export function generate() {
  const built = buildRecords();
  const { people, goals, selfAssessments } = built;

  const grammar = {
    grammar_id: GRAMMAR_ID,
    as_of: AS_OF,
    goal_period_start: GOAL_PERIOD_START,
    goal_period_end: GOAL_PERIOD_END,
    review_cycle_id: REVIEW_CYCLE_ID,
    source_artifacts: SOURCE_ARTIFACTS,
    competency_source: COMPETENCY_SOURCE,
    proficiency_scale: PROFICIENCY_SCALE,
    role_competency_map: ROLE_COMPETENCY_MAP,
    goal_setting_window: GOAL_SETTING_WINDOW,
    self_assessment_window: SELF_ASSESSMENT_WINDOW,
    record_counts: {
      employees: people.length,
      goal_records: goals.length,
      self_assessments: selfAssessments.length,
      self_assessment_entries: selfAssessments.reduce((sum, record) => sum + record.entries.length, 0),
    },
    not_a_rating: NOT_A_RATING,
  };
  const goalSet = {
    record_set_id: GOAL_RECORD_SET_ID,
    as_of: AS_OF,
    goal_period_start: GOAL_PERIOD_START,
    goal_period_end: GOAL_PERIOD_END,
    review_cycle_id: REVIEW_CYCLE_ID,
    goals,
  };
  const selfAssessmentSet = {
    record_set_id: SELF_ASSESSMENT_RECORD_SET_ID,
    as_of: AS_OF,
    goal_period_start: GOAL_PERIOD_START,
    goal_period_end: GOAL_PERIOD_END,
    review_cycle_id: REVIEW_CYCLE_ID,
    self_assessments: selfAssessments,
  };

  assertKeyOrder(grammar, KEY_ORDERS.grammar, "growth-grammar.json");
  assertKeyOrder(goalSet, KEY_ORDERS.goalSet, "goal-records.json");
  assertKeyOrder(selfAssessmentSet, KEY_ORDERS.selfAssessmentSet, "self-assessments.json");
  assertKeyOrder(goals[0], KEY_ORDERS.goal, "a goal record");
  assertKeyOrder(selfAssessments[0], KEY_ORDERS.selfAssessment, "a self-assessment record");
  assertKeyOrder(selfAssessments[0].entries[0], KEY_ORDERS.entry, "a self-assessment entry");
  assertRecords(built, [grammar, goalSet, selfAssessmentSet]);

  return [
    { path: "growth-grammar.json", content: JSON.stringify(grammar, null, 2) + "\n" },
    { path: "goal-records.json", content: JSON.stringify(goalSet, null, 2) + "\n" },
    { path: "self-assessments.json", content: JSON.stringify(selfAssessmentSet, null, 2) + "\n" },
  ];
}

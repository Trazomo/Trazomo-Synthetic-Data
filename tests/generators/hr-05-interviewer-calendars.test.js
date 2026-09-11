// HR-05 interviewer-calendars: the guard over three panelists' diaries, the
// panel request that publishes the scheduling grammar, and the one double
// booking that makes the window derivation an exercise rather than a scan.
//
// Three disciplines run through every check.
//
//   * No test names the panelist who carries the double booking, the proposed
//     panel window or the first clear window. All three are found by rule from
//     the emitted bytes and asserted by cardinality and by ordering, so a
//     reroll that moves them stays green and a reroll that destroys one fails.
//   * The frozen inputs are read off disk here, never through the generator's
//     own readers, because the claim under test is that the calendars reproduce
//     the frozen loop rather than that two copies of one function agree.
//   * The busy_type and subject tables are restated literally below and the
//     generator's exported table is asserted equal to that copy, the HR-18
//     discipline, so a vocabulary edit changes one side and the test says so.
//
// The .ics parse is a line split and a BEGIN:VEVENT fold, six lines of local
// code that does not earn a helper. tests/helpers/csv-table.js reads the two
// CSVs, tests/helpers/capitalized-screen.js runs the proper-noun sweep and
// tests/helpers/money-shape.js runs the money screen; nothing under
// tests/helpers/ is edited.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";
import { allowedFrom, unscreenedPhrases, unscreenedWords } from "../helpers/capitalized-screen.js";
import { moneyMatches } from "../helpers/money-shape.js";
import { isWeekend, toEpochDay } from "../../datagen/src/dates.js";
import { createRng } from "../../datagen/src/seed.js";
import { buildRoster } from "../../datagen/src/generators/core-04-people-roster.js";
import { BUSY_TYPE_TABLE } from "../../datagen/src/generators/hr-05-interviewer-calendars.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
const spec = specs.byId.get("HR-05");
const roster = buildRoster(createRng("CORE-04", "roster"));
const byEmployeeId = new Map(roster.map((row) => [row.employee_id, row]));

const REQUISITION_ID = "RQN-2026-0106";
const AS_OF = "2026-04-03";
const CALENDAR_START = "2026-03-09";
const CALENDAR_END = "2026-04-24";
const WINDOW_START = "2026-04-06";
const WINDOW_END = "2026-04-24";
const SLOT_MINUTES = 60;
const SLOT_GRID_MINUTES = 30;
const BLOCK_GRID_MINUTES = 15;
const DAY_START_MINUTES = 9 * 60;
const DAY_END_MINUTES = 17 * 60;
const CANDIDATE_SLOTS = 225;
const WINDOW_BUSINESS_DAYS = 15;
const CALENDAR_BUSINESS_DAYS = 35;
const UID_DOMAIN = "co002.example";
const DTSTAMP = "20260403T000000Z";
const MIN_INTERVALS_PER_PANELIST = 80;
const MAX_INTERVALS_PER_PANELIST = 100;

// The published vocabulary, restated: the eleven busy types, the subject each
// maps to, and the seats each may sit on.
const PUBLISHED_BUSY_TYPES = [
  { busy_type: "interview", subject: "Interview, RQN-2026-0106, <panel role in words>", seats: ["recruiter-screen", "hiring-manager", "program-manager"] },
  { busy_type: "delivery_sync", subject: "Cross functional delivery sync", seats: ["hiring-manager"] },
  { busy_type: "team_retro", subject: "Operations team retro", seats: ["hiring-manager"] },
  { busy_type: "one_to_one", subject: "One to one", seats: ["recruiter-screen", "hiring-manager", "program-manager"] },
  { busy_type: "team_meeting", subject: "Team meeting", seats: ["recruiter-screen", "hiring-manager", "program-manager"] },
  { busy_type: "program_review", subject: "Program review", seats: ["hiring-manager", "program-manager"] },
  { busy_type: "stakeholder_review", subject: "Stakeholder review", seats: ["hiring-manager", "program-manager"] },
  { busy_type: "hiring_pipeline_review", subject: "Hiring pipeline review", seats: ["recruiter-screen"] },
  { busy_type: "sourcing_block", subject: "Sourcing block", seats: ["recruiter-screen"] },
  { busy_type: "focus_block", subject: "Focus block", seats: ["recruiter-screen", "hiring-manager", "program-manager"] },
  { busy_type: "training", subject: "Training session", seats: ["recruiter-screen", "hiring-manager", "program-manager"] },
];

// ------------------------------------------------------ the frozen inputs

/** The committed HR-01 register, read here rather than through the generator. */
const register = JSON.parse(
  readFileSync(join(REPO_ROOT, "artifacts", "HR-01", "role-requisition-register.json"), "utf8")
);
const requisition = register.requisitions.find((row) => row.requisition_id === REQUISITION_ID);

const questionBank = JSON.parse(
  readFileSync(join(REPO_ROOT, "artifacts", "HR-04", "interview-question-bank.json"), "utf8")
);
const bankPanelRoles = questionBank.panel_roles.map((row) => row.panel_role);

/** One "- Label: value" line out of a frozen markdown document. */
function metaLine(text, label) {
  const match = new RegExp(`^- ${label}:[ \\t]*(.*)$`, "m").exec(text);
  assert.ok(match, `the frozen document carries no "- ${label}:" line`);
  return match[1].trim();
}

function frozenDocs(dir, prefix) {
  const base = join(REPO_ROOT, "artifacts", dir);
  return readdirSync(base)
    .filter((name) => name.startsWith(prefix) && name.endsWith(".md"))
    .sort()
    .map((name) => ({
      file: name,
      key: name.replace(prefix, "").replace(/\.md$/, ""),
      text: readFileSync(join(base, name), "utf8"),
    }));
}

const scorecards = frozenDocs("HR-04", "scorecard-").map((doc) => ({
  file: doc.file,
  key: doc.key,
  panel_role: metaLine(doc.text, "Panel role"),
  employee_id: metaLine(doc.text, "Panelist employee ID"),
  interview_date: metaLine(doc.text, "Interview date"),
  interviewer: metaLine(doc.text, "Interviewer"),
}));

const transcripts = frozenDocs("HR-03", "interview-transcript-").map((doc) => ({
  file: doc.file,
  key: doc.key,
  date: metaLine(doc.text, "Date"),
  interviewer: metaLine(doc.text, "Interviewer"),
}));

const opsMeetings = [
  {
    source_artifact: "OPS-01",
    text: readFileSync(join(REPO_ROOT, "artifacts", "OPS-01", "meeting-transcript-with-commitments.md"), "utf8"),
  },
  {
    source_artifact: "OPS-02",
    text: readFileSync(join(REPO_ROOT, "artifacts", "OPS-02", "retro-transcript-with-recurring-finding.md"), "utf8"),
  },
].map((meeting) => ({
  source_artifact: meeting.source_artifact,
  date: metaLine(meeting.text, "Date"),
  start: metaLine(meeting.text, "Start time"),
}));

/**
 * The candidate name list, read out of the frozen application log rather than
 * restated, so a row added there is swept for without editing this file.
 */
const applicationLog = readFileSync(join(REPO_ROOT, "artifacts", "HR-02", "application-log.md"), "utf8");
const candidateTokens = (() => {
  const tokens = new Set(["ca-0", "ca-1"]);
  for (const match of applicationLog.matchAll(/^\| (ca-\d{3}) \| ([^|]+?) \|/gm)) {
    tokens.add(match[1]);
    tokens.add(match[2].trim());
    for (const word of match[2].trim().split(/\s+/)) tokens.add(word);
  }
  return [...tokens];
})();

// ---------------------------------------------------------------- helpers

function files() {
  return generateArtifact(spec, canon);
}

/** One CSV, with its header pinned to the spec's own per-file column list. */
function table(path) {
  const parsed = csvTable(fileByPath(files(), path).content);
  assert.deepEqual(parsed.cols, spec.files[path], `HR-05: ${path} header does not match the spec column list`);
  return parsed;
}

const intervals = () => table("busy-intervals.csv").rows;
const requests = () => table("panel-request.csv").rows;

/** "2026-04-06T09:30:00Z" to minutes since the epoch, so intervals compare directly. */
function absolute(instant) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/.exec(instant);
  assert.ok(match, `"${instant}" is not an ISO 8601 UTC instant`);
  assert.equal(match[4], "00", `"${instant}" does not sit on a whole minute`);
  return toEpochDay(match[1]) * 1440 + Number(match[2]) * 60 + Number(match[3]);
}

const dateOf = (instant) => instant.slice(0, 10);
const minutesOf = (instant) => Number(instant.slice(11, 13)) * 60 + Number(instant.slice(14, 16));

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function businessDays(startIso, endIso) {
  const days = [];
  for (let day = toEpochDay(startIso); day <= toEpochDay(endIso); day += 1) {
    const iso = new Date(day * 86400000).toISOString().slice(0, 10);
    if (!isWeekend(iso)) days.push(iso);
  }
  return days;
}

/** Every candidate slot in the scheduling window, recomputed from the request row. */
function candidateSlots(request) {
  const slotMinutes = Number(request.slot_minutes);
  const gridMinutes = Number(request.slot_grid_minutes);
  const dayStart = minutesOf(`0000-00-00T${request.business_hours_start.replace("Z", "")}Z`);
  const dayEnd = minutesOf(`0000-00-00T${request.business_hours_end.replace("Z", "")}Z`);
  const slots = [];
  for (const date of businessDays(request.window_start_date, request.window_end_date)) {
    for (let start = dayStart; start + slotMinutes <= dayEnd; start += gridMinutes) {
      slots.push({
        date,
        start_minutes: start,
        abs_start: toEpochDay(date) * 1440 + start,
        abs_end: toEpochDay(date) * 1440 + start + slotMinutes,
      });
    }
  }
  return slots;
}

/** The busy intervals of one panelist, as absolute minute spans. */
function spansBySeat(rows) {
  const spans = new Map();
  for (const row of rows) {
    if (!spans.has(row.employee_id)) spans.set(row.employee_id, []);
    spans.get(row.employee_id).push({ start: absolute(row.start_at), end: absolute(row.end_at) });
  }
  return spans;
}

const freeForSlot = (spans, slot) => !spans.some((span) => overlaps(span.start, span.end, slot.abs_start, slot.abs_end));

/** Panelists carrying at least one overlapping pair in their own diary, and how many. */
function overlapCensus(spans) {
  const census = new Map();
  for (const [employeeId, list] of spans) {
    const pairs = [];
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        if (overlaps(list[i].start, list[i].end, list[j].start, list[j].end)) {
          pairs.push({ start: Math.max(list[i].start, list[j].start), end: Math.min(list[i].end, list[j].end) });
        }
      }
    }
    census.set(employeeId, pairs);
  }
  return census;
}

/** Six lines of local .ics parsing: split, fold on BEGIN:VEVENT, key each block. */
function icsEvents(content) {
  const events = [];
  for (const line of content.split("\n")) {
    if (line === "BEGIN:VEVENT") events.push({});
    else if (events.length > 0 && line.includes(":") && line !== "END:VEVENT") {
      const at = line.indexOf(":");
      events[events.length - 1][line.slice(0, at)] = line.slice(at + 1);
    }
  }
  return events;
}

/** RFC 5545 TEXT unescaping, so a SUMMARY compares to the csv subject as written. */
const unescapeIcsText = (value) =>
  value.replace(/\\([\\;,nN])/g, (_, char) => (char === "n" || char === "N" ? "\n" : char));

// ------------------------------------------------------------------ tests

test("HR-05: five files land, and both CSV headers equal the spec's own column lists", () => {
  const emitted = files().map((file) => file.path).sort();
  assert.deepEqual(
    emitted,
    ["busy-intervals.csv", "calendar-emp-0517.ics", "calendar-emp-0574.ics", "calendar-emp-0581.ics", "panel-request.csv"],
    "the artifact is one calendar per panelist plus two tables"
  );
  for (const path of Object.keys(spec.files)) table(path);
  assert.equal(spec.period.start, CALENDAR_START, "spec.period.start has drifted from the calendar span");
  assert.equal(spec.period.end, CALENDAR_END, "spec.period.end has drifted from the calendar span");
});

test("HR-05: the published busy_type table is still the one this test recomputes from", () => {
  assert.deepEqual(
    BUSY_TYPE_TABLE,
    PUBLISHED_BUSY_TYPES,
    "the generator's busy_type table changed: update this copy deliberately or revert the table"
  );
});

test("HR-C3-T1: exactly one panelist's diary carries an overlapping pair, and the file census is one pair", () => {
  const census = overlapCensus(spansBySeat(intervals()));
  assert.equal(census.size, 3, "three panelists carry a calendar");
  const carriers = [...census.values()].filter((pairs) => pairs.length > 0);
  assert.equal(carriers.length, 1, `${carriers.length} panelists carry an overlapping pair, expected 1`);
  assert.equal(carriers[0].length, 1, `the carrier holds ${carriers[0].length} overlapping pairs, expected 1`);
  assert.equal(
    [...census.values()].reduce((sum, pairs) => sum + pairs.length, 0),
    1,
    "the file census across all three calendars is one overlapping pair"
  );
});

test("HR-C3-T2: the proposed panel window is the first slot the two clean diaries share, and the planted intersection lies inside it", () => {
  const rows = intervals();
  const spans = spansBySeat(rows);
  const census = overlapCensus(spans);
  const slots = candidateSlots(requests()[0]);
  assert.equal(slots.length, CANDIDATE_SLOTS, "the published grammar recomputes 225 candidate slots");

  const clean = [...census.entries()].filter(([, pairs]) => pairs.length === 0).map(([employeeId]) => employeeId);
  assert.equal(clean.length, 2, "two panelists carry no overlapping pair");
  const window = slots.find((slot) => clean.every((employeeId) => freeForSlot(spans.get(employeeId), slot)));
  assert.ok(window, "no candidate slot is free for both of the panelists carrying no overlapping pair");

  const [carrier, pairs] = [...census.entries()].find(([, list]) => list.length === 1);
  const [intersection] = pairs;
  assert.ok(intersection.end > intersection.start, "the planted pair's intersection is empty");
  assert.ok(
    intersection.start >= window.abs_start && intersection.end <= window.abs_end,
    "the planted pair's intersection does not lie inside the proposed panel window"
  );
  assert.ok(
    !freeForSlot(spans.get(carrier), window),
    "the proposed panel window must not be free for all three, or there is nothing to confirm"
  );

  // The two counterfactual readings the spec rejects, recomputed from the bytes.
  // Restatement, not a check: line 318 already establishes the carrier is not
  // free at the window, so this set can only be the carrier and cannot fail;
  // the load-bearing sibling is the day-level arm below.
  const busyInside = [...spans.keys()].filter((employeeId) => !freeForSlot(spans.get(employeeId), window));
  assert.equal(busyInside.length, 1, "a rule counting panelists busy across the window returns 1 without seeing the double booking");
  const somethingThatDay = [...spans.keys()].filter((employeeId) =>
    spans.get(employeeId).some((span) => span.start >= toEpochDay(window.date) * 1440 && span.start < toEpochDay(window.date) * 1440 + 1440)
  );
  assert.equal(somethingThatDay.length, 3, "a rule counting panelists with something in the diary that day returns 3");
});

test("HR-C3-T3: a later candidate slot is free for all three panelists", () => {
  const spans = spansBySeat(intervals());
  const census = overlapCensus(spans);
  const slots = candidateSlots(requests()[0]);
  const clean = [...census.entries()].filter(([, pairs]) => pairs.length === 0).map(([employeeId]) => employeeId);
  const window = slots.find((slot) => clean.every((employeeId) => freeForSlot(spans.get(employeeId), slot)));
  const clear = slots.find((slot) => [...spans.keys()].every((employeeId) => freeForSlot(spans.get(employeeId), slot)));
  assert.ok(clear, "no candidate slot in the scheduling window is free for all three panelists");
  assert.ok(
    clear.abs_start > window.abs_start,
    "the first clear window must be strictly later than the proposed panel window"
  );
});

test("HR-C3-T4: every seat is an active roster row printed byte for byte, on a panel role the question bank declares", () => {
  const rows = requests();
  assert.equal(rows.length, 3, "the request is one row per seat");
  for (const row of rows) {
    const person = byEmployeeId.get(row.seat_employee_id);
    assert.ok(person, `${row.seat_employee_id} is not on the CORE-04 roster`);
    assert.equal(person.employment_status, "active", `${row.seat_employee_id} is not an active roster row`);
    assert.equal(row.seat_full_name, `${person.first_name} ${person.last_name}`, "seat_full_name is carried through");
    assert.equal(row.seat_role_title, person.role_title, "seat_role_title is carried through byte for byte");
    assert.ok(bankPanelRoles.includes(row.panel_role), `${row.panel_role} is not a panel role the HR-04 question bank declares`);
    assert.equal(row.requisition_id, requisition.requisition_id, "the request names the frozen requisition");
    assert.equal(row.requisition_title, requisition.requisition_title, "requisition_title reproduces the register");
    assert.equal(row.department, requisition.department, "department reproduces the register");
    assert.equal(row.requested_by_employee_id, requisition.recruiter_employee_id, "the request is the recruiter's to make");
    assert.equal(row.requested_on, AS_OF, "the request is dated at the universe as-of");
    assert.equal(row.time_zone, "UTC", "the grammar is published in UTC");
    assert.equal(row.window_start_date, WINDOW_START, "window_start_date");
    assert.equal(row.window_end_date, WINDOW_END, "window_end_date");
    assert.ok(row.window_end_date < requisition.target_start_date, "the window closes before the role's own target start date");
  }
  assert.equal(new Set(rows.map((row) => row.panel_role)).size, 3, "the three seats are distinct panel roles");
  assert.equal(new Set(rows.map((row) => row.seat_employee_id)).size, 3, "no person holds two seats");
  assert.equal(
    businessDays(WINDOW_START, WINDOW_END).length,
    WINDOW_BUSINESS_DAYS,
    "the scheduling window is fifteen business days"
  );
  assert.equal(
    businessDays(CALENDAR_START, CALENDAR_END).length,
    CALENDAR_BUSINESS_DAYS,
    "the calendar span is thirty-five business days"
  );
});

test("HR-C3-T5: the recruiter and hiring manager seats are the register's own, nobody holds both, and the program manager seat is the scorecards'", () => {
  const bySeat = new Map(requests().map((row) => [row.panel_role, row]));
  assert.equal(
    bySeat.get("recruiter-screen").seat_employee_id,
    requisition.recruiter_employee_id,
    "the recruiter screen seat is the register's own recruiter"
  );
  assert.equal(
    bySeat.get("hiring-manager").seat_employee_id,
    requisition.hiring_manager_employee_id,
    "the hiring manager seat is the register's own hiring manager"
  );
  assert.notEqual(
    bySeat.get("recruiter-screen").seat_employee_id,
    bySeat.get("hiring-manager").seat_employee_id,
    "no panelist holds both the recruiter and the hiring manager seat"
  );
  assert.equal(bySeat.get("recruiter-screen").seat_source_artifact, "HR-01", "the recruiter seat cites the register");
  assert.equal(bySeat.get("hiring-manager").seat_source_artifact, "HR-01", "the hiring manager seat cites the register");
  assert.equal(bySeat.get("program-manager").seat_source_artifact, "HR-04", "the program manager seat cites the scorecards");

  const programManagerIds = new Set(
    scorecards.filter((card) => card.panel_role === "program-manager").map((card) => card.employee_id)
  );
  assert.equal(programManagerIds.size, 1, "the frozen scorecards seat one person on the program manager panel");
  assert.equal(
    bySeat.get("program-manager").seat_employee_id,
    [...programManagerIds][0],
    "the program manager seat is the Panelist employee ID the frozen scorecards carry"
  );
});

test("HR-C3-T6: the six mirrored interviews reproduce the frozen scorecards, and every date equals its paired transcript's own", () => {
  const mirrored = intervals().filter((row) => row.source_artifact === "HR-03");
  assert.equal(scorecards.length, 6, "the frozen pack still holds six scorecards");
  assert.equal(mirrored.length, 6, `${mirrored.length} intervals mirror an interview, expected 6`);

  const transcriptByKey = new Map(transcripts.map((row) => [row.key, row]));
  for (const card of scorecards) {
    const match = mirrored.filter(
      (row) => row.panel_role === card.panel_role
        && row.employee_id === card.employee_id
        && dateOf(row.start_at) === card.interview_date
    );
    assert.equal(match.length, 1, `${match.length} intervals reproduce ${card.file}'s panel role, panelist and date`);
    const transcript = transcriptByKey.get(card.key);
    assert.ok(transcript, `${card.file} has no paired HR-03 transcript`);
    assert.equal(transcript.date, card.interview_date, `${card.file} and its transcript disagree about the interview date`);
    assert.equal(transcript.interviewer, card.interviewer, `${card.file} and its transcript name different interviewers`);
    assert.equal(
      match[0].full_name,
      card.interviewer.replace(/ \(.*\)$/, ""),
      "the mirrored interval prints the interviewer the frozen documents print"
    );
    const duration = Number(match[0].duration_minutes);
    assert.equal(
      duration,
      card.panel_role === "recruiter-screen" ? 30 : 60,
      "the interview duration follows the panel slug"
    );
    assert.equal(match[0].busy_type, "interview", "a mirrored interview carries the interview busy type");
  }
  assert.equal(
    new Set(mirrored.map((row) => dateOf(row.start_at))).size,
    6,
    "the six mirrored interviews sit on six distinct dates"
  );
});

test("HR-C3-T7: the two mirrored meetings carry the times their documents state, and the mirror set is closed", () => {
  const rows = intervals();
  const withSource = rows.filter((row) => row.source_artifact !== "");
  assert.equal(withSource.length, 8, `${withSource.length} intervals carry a source_artifact, expected 6 interviews plus 2 meetings`);

  const hiringManagerSeat = requests().find((row) => row.panel_role === "hiring-manager").seat_employee_id;
  for (const meeting of opsMeetings) {
    const match = rows.filter((row) => row.source_artifact === meeting.source_artifact);
    assert.equal(match.length, 1, `${match.length} intervals carry ${meeting.source_artifact}, expected 1`);
    assert.equal(dateOf(match[0].start_at), meeting.date, `${meeting.source_artifact} mirrors the date its document states`);
    assert.equal(
      match[0].start_at.slice(11, 16),
      meeting.start,
      `${meeting.source_artifact} mirrors the start time its document states`
    );
    assert.equal(match[0].employee_id, hiringManagerSeat, `${meeting.source_artifact} seats the panelist its attendee list names`);
  }
  assert.equal(
    new Set(withSource.map((row) => row.source_artifact)).size,
    3,
    "exactly three frozen artifacts are cited: the interview pack and the two meetings"
  );
  for (const row of rows.filter((r) => r.source_artifact === "")) {
    assert.ok(
      !["interview", "delivery_sync", "team_retro"].includes(row.busy_type),
      `${row.interval_id} is a seeded block carrying a busy type only a mirrored event may carry`
    );
  }
});

test("HR-C3-T8: every interval sits inside business hours on a business day, on the grid, with a duration its instants recompute", () => {
  const rows = intervals();
  for (const row of rows) {
    const start = absolute(row.start_at);
    const end = absolute(row.end_at);
    const date = dateOf(row.start_at);
    assert.equal(dateOf(row.end_at), date, `${row.interval_id} spans two dates`);
    assert.ok(date >= CALENDAR_START && date <= CALENDAR_END, `${row.interval_id} sits outside the calendar span`);
    assert.ok(!isWeekend(date), `${row.interval_id} sits on a weekend`);
    assert.ok(minutesOf(row.start_at) >= DAY_START_MINUTES, `${row.interval_id} starts before business hours`);
    assert.ok(minutesOf(row.end_at) <= DAY_END_MINUTES, `${row.interval_id} ends after business hours`);
    assert.ok(end > start, `${row.interval_id} ends at or before it starts`);
    assert.equal(end - start, Number(row.duration_minutes), `${row.interval_id} states a duration its own instants do not recompute`);
    assert.equal(minutesOf(row.start_at) % BLOCK_GRID_MINUTES, 0, `${row.interval_id} starts off the fifteen minute grid`);
    assert.equal(minutesOf(row.end_at) % BLOCK_GRID_MINUTES, 0, `${row.interval_id} ends off the fifteen minute grid`);
  }
  rows.forEach((row, index) => {
    assert.equal(row.interval_id, `CAL-2026-${String(index + 1).padStart(4, "0")}`, "interval ids run in file order");
    if (index === 0) return;
    const previous = rows[index - 1];
    assert.ok(
      previous.start_at < row.start_at
      || (previous.start_at === row.start_at && previous.employee_id <= row.employee_id),
      "the file runs in (start_at, employee_id) order, which is what interval_id is assigned from"
    );
  });
  const perSeat = new Map();
  for (const row of rows) perSeat.set(row.employee_id, (perSeat.get(row.employee_id) ?? 0) + 1);
  for (const [employeeId, count] of perSeat) {
    assert.ok(
      count >= MIN_INTERVALS_PER_PANELIST && count <= MAX_INTERVALS_PER_PANELIST,
      `${employeeId} carries ${count} intervals, outside the design band of ${MIN_INTERVALS_PER_PANELIST} to ${MAX_INTERVALS_PER_PANELIST}`
    );
  }
});

test("HR-C3-T9: no candidate id, name or surname appears in any emitted byte", () => {
  assert.ok(candidateTokens.length >= 20, "the frozen application log yielded no candidate name list");
  for (const file of files()) {
    assert.ok(!/\bca-\d/.test(file.content), `${file.path} carries a candidate id`);
    for (const token of candidateTokens) {
      assert.ok(!file.content.includes(token), `${file.path} carries the candidate token "${token}"`);
    }
    assert.ok(!/shortlist/i.test(file.content), `${file.path} names the shortlist decision`);
  }
});

test("HR-C3-T10: every busy_type is published, maps to its published subject, and sits on a seat the table allows", () => {
  const published = new Map(PUBLISHED_BUSY_TYPES.map((row) => [row.busy_type, row]));
  const seen = new Set();
  for (const row of intervals()) {
    const entry = published.get(row.busy_type);
    assert.ok(entry, `${row.interval_id} carries the busy_type "${row.busy_type}", which is outside the published vocabulary`);
    assert.ok(entry.seats.includes(row.panel_role), `${row.interval_id} puts "${row.busy_type}" on the ${row.panel_role} seat`);
    const expected = row.busy_type === "interview"
      ? `Interview, ${REQUISITION_ID}, ${row.panel_role.replace(/-/g, " ")}`
      : entry.subject;
    assert.equal(row.subject, expected, `${row.interval_id} states a subject its own busy_type does not map to`);
    seen.add(row.busy_type);
  }
  assert.equal(seen.size, PUBLISHED_BUSY_TYPES.length, "every published busy_type is used at least once");
});

test("HR-C3-T10: nothing in the emitted bytes is capitalized outside the panel, the company and the ordinary subject words", () => {
  const seats = requests();
  const company = canon.get("co-002");
  const allowed = allowedFrom({
    derived: [
      company.name,
      ...seats.map((row) => row.seat_full_name),
      ...seats.map((row) => row.seat_role_title),
      ...PUBLISHED_BUSY_TYPES.map((row) => row.subject),
    ],
    // Document furniture: the id blocks, the artifact ids the provenance
    // columns cite, the instant separators, and the one capitalized word the
    // interview subject opens with.
    furniturePhrases: [`Interview, ${REQUISITION_ID}`],
    furnitureWords: [
      "Interview", "Interviewer", "RQN", "CAL", "PNL", "EMP", "HR", "OPS", "T", "Z", "UTC",
      "BEGIN", "END", "VCALENDAR", "VEVENT", "VERSION", "PRODID", "CALSCALE",
      "METHOD", "PUBLISH", "GREGORIAN", "UID", "DTSTAMP", "DTSTART", "DTEND",
      "SUMMARY", "STATUS", "CONFIRMED", "TRANSP", "OPAQUE", "EN", "X",
      "Inc", "Cross", "One", "Team", "Program", "Stakeholder", "Hiring",
      "Sourcing", "Focus", "Training", "Operations",
    ],
  });
  // A table is screened as a table. Reading the raw CSV bytes makes the screen
  // report the separator between two accounted-for columns as one phrase
  // ("Faro Fenmore,Operations Manager"), which is a property of CSV rather than
  // of the data, so each row is re-rendered in the pipe-cell shape the screen
  // was written against. The calendars are screened as written.
  for (const file of files()) {
    const doc = file.path.endsWith(".csv")
      ? (() => {
        const parsed = csvTable(file.content);
        return [parsed.cols, ...parsed.rows.map((row) => parsed.cols.map((col) => row[col]))]
          .map((cells) => `| ${cells.join(" | ")} |`)
          .join("\n");
      })()
      : file.content;
    assert.deepEqual(unscreenedPhrases(doc, allowed), [], `${file.path} carries an unaccounted capitalized phrase`);
    assert.deepEqual(unscreenedWords(doc, allowed), [], `${file.path} carries an unaccounted capitalized word`);
  }
});

test("HR-C3-T11: each calendar holds exactly its own panelist's intervals, rendered as the csv states them", () => {
  const emitted = files();
  const rows = intervals();
  const byInterval = new Map(rows.map((row) => [row.interval_id, row]));
  const seats = requests();

  for (const seat of seats) {
    const path = `calendar-${seat.seat_employee_id.toLowerCase()}.ics`;
    const content = fileByPath(emitted, path).content;
    const own = rows.filter((row) => row.employee_id === seat.seat_employee_id);
    const events = icsEvents(content);
    assert.equal(events.length, own.length, `${path} holds ${events.length} events against ${own.length} rows`);

    assert.ok(content.startsWith("BEGIN:VCALENDAR\n"), `${path} does not open a VCALENDAR`);
    assert.ok(content.endsWith("END:VCALENDAR\n"), `${path} does not close a VCALENDAR`);
    assert.ok(
      content.includes(`X-WR-CALNAME:${seat.seat_full_name}\\, ${seat.seat_role_title}\n`),
      `${path} does not name its panelist with an escaped comma`
    );
    assert.ok(content.includes("X-WR-TIMEZONE:UTC\n"), `${path} does not declare UTC`);
    assert.ok(!content.includes("BEGIN:VTIMEZONE"), `${path} carries a VTIMEZONE block, which would state a region`);

    const stamps = new Set();
    events.forEach((event, index) => {
      const intervalId = event.UID.replace(`@${UID_DOMAIN}`, "");
      assert.notEqual(intervalId, event.UID, `${path} event ${index + 1} does not carry the reserved domain`);
      const row = byInterval.get(intervalId);
      assert.ok(row, `${path} event ${index + 1} names ${intervalId}, which is not a csv row`);
      assert.equal(row.employee_id, seat.seat_employee_id, `${path} carries an event belonging to another panelist`);
      assert.equal(event.DTSTART, `${row.start_at.replace(/[-:]/g, "")}`, `${intervalId} DTSTART`);
      assert.equal(event.DTEND, `${row.end_at.replace(/[-:]/g, "")}`, `${intervalId} DTEND`);
      assert.equal(unescapeIcsText(event.SUMMARY), row.subject, `${intervalId} SUMMARY does not unescape to its csv subject`);
      assert.equal(event.STATUS, "CONFIRMED", `${intervalId} STATUS`);
      assert.equal(event.TRANSP, "OPAQUE", `${intervalId} TRANSP`);
      stamps.add(event.DTSTAMP);
      if (index > 0) {
        assert.ok(events[index - 1].DTSTART <= event.DTSTART, `${path} does not run in DTSTART order`);
      }
    });
    assert.deepEqual([...stamps], [DTSTAMP], `${path} carries a stamp other than the fixed as-of`);
    assert.ok(content.includes(`PRODID:-//${canon.get("co-002").name}//`), `${path} does not name the company in its PRODID`);
  }

  for (const file of emitted) {
    assert.ok(!file.content.includes("\r"), `${file.path} carries a CR byte`);
    if (!file.path.endsWith(".ics")) continue;
    for (const line of file.content.split("\n")) {
      assert.ok(
        Buffer.byteLength(line, "utf8") <= 75,
        `${file.path} carries a content line over 75 octets, which would need folding: "${line}"`
      );
      assert.ok(!/,/.test(line.replace(/\\,/g, "")), `${file.path} carries an unescaped comma in "${line}"`);
    }
  }
});

test("HR-C3-T12: the emitted bytes carry no em dash, no money, no percentage and no second example domain", () => {
  for (const file of files()) {
    assert.ok(!file.content.includes("\u2014"), `${file.path} carries an em dash`);
    assert.ok(!file.content.includes("$"), `${file.path} carries a currency symbol`);
    assert.ok(!file.content.includes("%"), `${file.path} carries a percentage sign`);
    // The money screen runs per cell on the tables rather than over the raw
    // bytes: a figure would live in one cell, and screening the joined line
    // reports the comma between two adjacent ISO dates as a thousands
    // separator, which is a property of CSV rather than of the data.
    const cells = file.path.endsWith(".csv")
      ? [csvTable(file.content).cols, ...csvTable(file.content).rows.map((row) => Object.values(row))].flat()
      : [file.content];
    for (const cell of cells) {
      assert.deepEqual(moneyMatches(cell), [], `${file.path} carries the money-shaped figure "${cell}"`);
    }
    for (const domain of file.content.match(/[A-Za-z0-9.-]*\.example/g) ?? []) {
      assert.equal(domain, UID_DOMAIN, `${file.path} names the domain ${domain}`);
    }
  }
  for (const columns of Object.values(spec.files)) {
    for (const column of columns) {
      assert.ok(
        !/salary|pay_band|amount|work_location|office|candidate|attendee|time_?zone_region/i.test(column),
        `${column} carries something this artifact deliberately does not`
      );
    }
  }
  assert.ok(!("columns" in spec), "HR-05 publishes per-file column lists, not one flat column list");
});

test("HR-05: two runs are byte identical", () => {
  const runA = generateArtifact(spec, canon);
  const runB = generateArtifact(spec, canon);
  assert.deepEqual(runA, runB);
});

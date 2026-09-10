// HR-05 interviewer-calendars: three panelists' diaries for six weeks, plus the
// panel request that publishes the scheduling grammar a proposer has to derive
// a window from.
//
// The artifact turns on one idea: the proposed panel window is a pure function
// of the shipped bytes. Slot length, slot grid, business hours, time zone and
// both window endpoints are columns of panel-request.csv rather than constants
// hidden in this file, so a reader holding one request row holds the whole
// grammar and recomputes the same window this generator did.
//
// Nothing about the loop is typed twice. The three seats come from the frozen
// HR-01 register and the frozen HR-04 scorecards, the six interview dates come
// from the scorecards and are cross-checked against the paired HR-03
// transcripts, and the two mirrored meetings come from the OPS transcripts that
// state them. Every one of those reads is pinned: a later amendment to the
// register, a transcript or a scorecard breaks generation loudly rather than
// shipping calendars that quietly disagree with the loop they claim to record.
// Amendment A already moved this arc once, and the pin is what makes a second
// move loud.
//
// Three shapes are the exercise rather than the decoration:
//
//   1. No candidate identity exists anywhere. No candidate id, no candidate
//      name, no candidate count, and no attendee or location column that could
//      carry one. The shortlist decision is unrecorded by design, so a calendar
//      stating how many people are being scheduled would leak it.
//   2. The proposed panel window is the earliest candidate slot free for the
//      two panelists whose own diaries are internally consistent. It is
//      derived, never stated.
//   3. Exactly one panelist's own busy intervals contain an overlapping pair
//      whose intersection lies inside that window. Which panelist is a seeded
//      draw made here and written down nowhere: the census is found by the
//      overlap rule, not by reading a marker.
//
// No money, no percentage, no statistic, no work location and no timezone
// region appears anywhere. UTC names no place, which is the reason it is UTC.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { toCsv } from "../csv.js";
import { addDays, isWeekend, toEpochDay } from "../dates.js";
import { createRng } from "../seed.js";
import { buildRoster } from "./core-04-people-roster.js";

export const id = "HR-05";

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..");
const HR_01_REGISTER = join(REPO_ROOT, "artifacts", "HR-01", "role-requisition-register.json");
const HR_03_DIR = join(REPO_ROOT, "artifacts", "HR-03");
const HR_04_DIR = join(REPO_ROOT, "artifacts", "HR-04");
const HR_04_QUESTION_BANK = join(HR_04_DIR, "interview-question-bank.json");

// ------------------------------------------------------------------ constants

/** The one requisition this panel is being scheduled for. */
export const REQUISITION_ID = "RQN-2026-0106";

/** The only company named anywhere in the artifact, and only in the PRODID. */
export const CANON_COMPANY_ID = "co-002";

/** The universe as-of. The request is dated at it and every DTSTAMP carries it. */
export const AS_OF = "2026-04-03";

export const REQUEST_ID = "PNL-2026-0001";
export const ROUND_NAME = "second round panel";

/** The reserved domain the roster already uses, and the only domain in the pack. */
export const UID_DOMAIN = "co002.example";

/** A fixed stamp, because a build-time stamp would not be deterministic. */
export const DTSTAMP = "20260403T000000Z";

/** The calendar span: the first frozen interview through the window's last day. */
export const CALENDAR_START = "2026-03-09";
export const CALENDAR_END = "2026-04-24";

/**
 * The scheduling window. Both endpoints are read off frozen bytes rather than
 * chosen: 2026-04-06 is the first business day after the universe as-of, and
 * 2026-04-24 is the last business day before the requisition's own frozen
 * target_start_date.
 */
export const WINDOW_START = "2026-04-06";
export const WINDOW_END = "2026-04-24";

export const SLOT_MINUTES = 60;
export const SLOT_GRID_MINUTES = 30;
export const BUSINESS_HOURS_START = "09:00:00Z";
export const BUSINESS_HOURS_END = "17:00:00Z";
export const TIME_ZONE = "UTC";

/** Business days in the two spans, asserted rather than assumed. */
export const CALENDAR_BUSINESS_DAYS = 35;
export const WINDOW_BUSINESS_DAYS = 15;

/** Candidate slot starts per business day, and across the whole window. */
export const SLOTS_PER_DAY = 15;
export const CANDIDATE_SLOTS = 225;

/** A block may start off the slot grid, on the finer 15 minute grid. */
export const BLOCK_GRID_MINUTES = 15;
export const BLOCK_LENGTHS = [30, 45, 60, 90];

/** Gaps the two opening days are built from, all under one slot length. */
const OPENING_GAPS = [0, 15, 30, 45];

/** Seeded load per panelist per business day, by segment. */
const MARCH_BLOCKS = [1, 3];
const WINDOW_BLOCKS = [2, 5];

/** Design bands for the landed totals (constructed, not a byte fact). */
export const MIN_INTERVALS_PER_PANELIST = 80;
export const MAX_INTERVALS_PER_PANELIST = 100;

/** Durations follow the panel slug rather than being drawn. */
export const INTERVIEW_DURATION_BY_PANEL_ROLE = {
  "recruiter-screen": 30,
  "hiring-manager": 60,
  "program-manager": 60,
};

/**
 * The six interview clock times. The frozen transcripts carry a Date and no
 * time of day, so every clock time here is a plan decision and is permanent the
 * moment the bytes land. The 2026-03-17 interview is deliberately in the
 * afternoon: two frozen operations documents reference an untimed sync that
 * morning, and leaving it clear means the one frozen prose commitment this
 * artifact cannot mirror is at least not contradicted by it.
 *
 * The key set is asserted equal to the frozen scorecards' own Interview date
 * set, so an amended interview date fails the build rather than picking up a
 * time that was chosen for a different day.
 */
export const INTERVIEW_START_BY_DATE = {
  "2026-03-09": "13:00",
  "2026-03-10": "11:00",
  "2026-03-12": "10:00",
  "2026-03-13": "15:00",
  "2026-03-17": "14:00",
  "2026-03-19": "09:30",
};

/**
 * The mirror set, stated as the predicate rather than as a preference: every
 * frozen event carrying a date, a start time and an attendee list naming one of
 * the three panelists appears as a busy interval with that source_artifact, and
 * nothing else is mirrored. Two frozen events satisfy it, both on one seat.
 *
 * OPS-01 states its own 45 minute duration. OPS-02 states a start time and no
 * duration, so 60 minutes is the default and the transcript's own last
 * timestamp is its floor.
 */
export const MIRRORED_MEETINGS = [
  {
    source_artifact: "OPS-01",
    file: join(REPO_ROOT, "artifacts", "OPS-01", "meeting-transcript-with-commitments.md"),
    date: "2026-03-10",
    start: "09:30",
    duration_minutes: 45,
    stated_duration: "45 minutes",
    busy_type: "delivery_sync",
  },
  {
    source_artifact: "OPS-02",
    file: join(REPO_ROOT, "artifacts", "OPS-02", "retro-transcript-with-recurring-finding.md"),
    date: "2026-03-27",
    start: "14:00",
    duration_minutes: 60,
    stated_duration: null,
    busy_type: "team_retro",
  },
];

/** The panelist the two mirrored meetings seat, by the panel slug they hold. */
const MIRRORED_MEETING_PANEL_ROLE = "hiring-manager";

/**
 * The closed busy_type vocabulary and the subject each type maps to, with the
 * seats a type may appear on. This table is published in the spec and the
 * per-generator test carries its own literal copy, so a vocabulary edit changes
 * one side and the test says so.
 *
 * The interview subject is templated on the panel slug written in words; every
 * other subject is a literal. Every capitalized token in the whole set is an
 * ordinary English word plus the requisition id and the three panel slugs.
 */
export const INTERVIEW_SUBJECT_TEMPLATE = `Interview, ${REQUISITION_ID}, <panel role in words>`;

export const BUSY_TYPE_TABLE = [
  { busy_type: "interview", subject: INTERVIEW_SUBJECT_TEMPLATE, seats: ["recruiter-screen", "hiring-manager", "program-manager"] },
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

/**
 * The three types that exist only because a frozen document states the event.
 * They are never drawn for a seeded working block, so the mirror set stays
 * exactly the set of intervals carrying a source_artifact.
 */
export const MIRROR_ONLY_BUSY_TYPES = ["interview", "delivery_sync", "team_retro"];

export const BUSY_INTERVAL_COLUMNS = [
  "interval_id", "employee_id", "full_name", "role_title", "panel_role",
  "start_at", "end_at", "duration_minutes", "busy_type", "subject", "source_artifact",
];

export const PANEL_REQUEST_COLUMNS = [
  "request_id", "requisition_id", "requisition_title", "department", "round_name", "panel_role",
  "seat_employee_id", "seat_full_name", "seat_role_title", "seat_source_artifact",
  "slot_minutes", "slot_grid_minutes", "business_hours_start", "business_hours_end",
  "time_zone", "window_start_date", "window_end_date", "requested_by_employee_id", "requested_on",
];

/** The register key set this artifact was built against. */
const REGISTER_REQUISITION_KEYS = [
  "requisition_id", "requisition_title", "department", "level", "status", "openings",
  "opened_date", "target_start_date", "owner_employee_id", "hiring_manager_employee_id",
  "recruiter_employee_id", "employment_type", "competencies", "brief_file",
];

/** Which frozen artifact names each seat. */
const SEAT_SOURCE_ARTIFACT = {
  "recruiter-screen": "HR-01",
  "hiring-manager": "HR-01",
  "program-manager": "HR-04",
};

const DAY_START_MINUTES = 9 * 60;
const DAY_END_MINUTES = 17 * 60;
const MIN_BLOCK_MINUTES = 30;

// ------------------------------------------------------------- small helpers

function fail(message) {
  throw new Error(`${id}: ${message}`);
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

/** "09:30" to 570. */
function toMinutes(clock) {
  const match = /^(\d{2}):(\d{2})$/.exec(clock);
  if (!match) fail(`"${clock}" is not an HH:MM clock time`);
  return Number(match[1]) * 60 + Number(match[2]);
}

/** 570 to "09:30:00". */
function toClock(minutes) {
  return `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}:00`;
}

/** An ISO 8601 UTC instant, the shape the operations handoff log already uses. */
function instantOf(date, minutes) {
  return `${date}T${toClock(minutes)}Z`;
}

/** The compact UTC form iCalendar wants. */
function icsStamp(date, minutes) {
  return `${date.replace(/-/g, "")}T${toClock(minutes).replace(/:/g, "")}Z`;
}

/** Minutes since the epoch, so intervals on different days compare directly. */
function absoluteMinutes(date, minutes) {
  return toEpochDay(date) * 1440 + minutes;
}

/** Half-open overlap: touching endpoints do not overlap. */
function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function intervalsOverlap(a, b) {
  return overlaps(a.abs_start, a.abs_end, b.abs_start, b.abs_end);
}

function businessDays(startIso, endIso) {
  const days = [];
  for (let day = startIso; day <= endIso; day = addDays(day, 1)) {
    if (!isWeekend(day)) days.push(day);
  }
  return days;
}

/** The panel slug written in words, which is what a subject prints. */
export function panelRoleInWords(panelRole) {
  return panelRole.replace(/-/g, " ");
}

/** The subject a type maps to on a given seat. */
export function subjectFor(busyType, panelRole) {
  const entry = BUSY_TYPE_TABLE.find((row) => row.busy_type === busyType);
  if (!entry) fail(`busy_type "${busyType}" is outside the published vocabulary`);
  if (!entry.seats.includes(panelRole)) {
    fail(`busy_type "${busyType}" is not allowed on the ${panelRole} seat`);
  }
  return busyType === "interview"
    ? `Interview, ${REQUISITION_ID}, ${panelRoleInWords(panelRole)}`
    : entry.subject;
}

/** RFC 5545 section 3.3.11 TEXT escaping. Backslash first, or it doubles twice. */
export function escapeIcsText(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** One "- Label: value" line out of a frozen markdown document. */
function metaLine(text, label, what) {
  const match = new RegExp(`^- ${label}:[ \\t]*(.*)$`, "m").exec(text);
  if (!match) fail(`${what} carries no "- ${label}:" line, so the shape this artifact was built against has moved`);
  return match[1].trim();
}

function readText(path, what) {
  try {
    return readFileSync(path, "utf8");
  } catch (cause) {
    fail(`could not read ${what} at ${path}: ${cause.message}`);
    return "";
  }
}

// -------------------------------------------------------- the frozen readers

/** The CORE-04 roster, built from its own seeded stream (the HR-18 convention). */
export function coreRoster() {
  return buildRoster(createRng("CORE-04", "roster"));
}

/**
 * The one requisition this panel sits on, read out of the frozen register and
 * refused unless it still carries the documented key set.
 */
export function readRequisition() {
  let parsed;
  try {
    parsed = JSON.parse(readText(HR_01_REGISTER, "the frozen HR-01 register"));
  } catch (cause) {
    fail(`the HR-01 register is not valid JSON: ${cause.message}`);
  }
  const requisitions = parsed?.requisitions;
  if (!Array.isArray(requisitions)) {
    fail("the HR-01 register carries no \"requisitions\" list");
  }
  const requisition = requisitions.find((row) => row?.requisition_id === REQUISITION_ID);
  if (!requisition) {
    fail(`the HR-01 register no longer carries ${REQUISITION_ID}, which is the arc this panel is scheduled for`);
  }
  const keys = Object.keys(requisition);
  const missing = REGISTER_REQUISITION_KEYS.filter((key) => !keys.includes(key));
  const extra = keys.filter((key) => !REGISTER_REQUISITION_KEYS.includes(key));
  if (missing.length > 0 || extra.length > 0) {
    fail(
      `${REQUISITION_ID} does not carry the register key set this artifact was built against. `
      + `Missing: ${missing.join(", ") || "none"}. Unexpected: ${extra.join(", ") || "none"}.`
    );
  }
  for (const key of ["hiring_manager_employee_id", "recruiter_employee_id", "target_start_date", "requisition_title", "department"]) {
    if (!requisition[key]) fail(`${REQUISITION_ID} carries an empty ${key}`);
  }
  return requisition;
}

/** The three panel slugs, read off the frozen HR-04 question bank. */
export function readPanelRoles() {
  let parsed;
  try {
    parsed = JSON.parse(readText(HR_04_QUESTION_BANK, "the frozen HR-04 question bank"));
  } catch (cause) {
    fail(`the HR-04 question bank is not valid JSON: ${cause.message}`);
  }
  const roles = parsed?.panel_roles;
  if (!Array.isArray(roles) || roles.length !== 3) {
    fail(`the HR-04 question bank declares ${roles?.length ?? "no"} panel roles, expected 3`);
  }
  const slugs = roles.map((role) => role?.panel_role);
  for (const slug of slugs) {
    if (!(slug in INTERVIEW_DURATION_BY_PANEL_ROLE)) {
      fail(`the HR-04 question bank declares the panel role "${slug}", which this artifact carries no duration rule for`);
    }
  }
  if (new Set(slugs).size !== 3) fail("the HR-04 question bank repeats a panel role");
  return slugs;
}

/** The six frozen scorecards, keyed by the candidate-and-role suffix of the file name. */
export function readScorecards() {
  const files = readdirSync(HR_04_DIR)
    .filter((name) => name.startsWith("scorecard-") && name.endsWith(".md"))
    .sort();
  if (files.length !== 6) {
    fail(`artifacts/HR-04/ holds ${files.length} scorecards, expected 6, so the frozen loop has moved`);
  }
  return files.map((name) => {
    const text = readText(join(HR_04_DIR, name), `the frozen scorecard ${name}`);
    const requisition = metaLine(text, "Requisition ID", name);
    if (requisition !== REQUISITION_ID) {
      fail(`${name} carries requisition ${requisition}, expected ${REQUISITION_ID}`);
    }
    return {
      file: name,
      key: name.replace(/^scorecard-/, "").replace(/\.md$/, ""),
      panel_role: metaLine(text, "Panel role", name),
      interviewer: metaLine(text, "Interviewer", name),
      employee_id: metaLine(text, "Panelist employee ID", name),
      interview_date: metaLine(text, "Interview date", name),
    };
  });
}

/** The six frozen transcripts, keyed the same way, so the pairing is a lookup. */
export function readTranscripts() {
  const files = readdirSync(HR_03_DIR)
    .filter((name) => name.startsWith("interview-transcript-") && name.endsWith(".md"))
    .sort();
  if (files.length !== 6) {
    fail(`artifacts/HR-03/ holds ${files.length} interview transcripts, expected 6, so the frozen loop has moved`);
  }
  return files.map((name) => {
    const text = readText(join(HR_03_DIR, name), `the frozen transcript ${name}`);
    const requisition = metaLine(text, "Requisition ID", name);
    if (requisition !== REQUISITION_ID) {
      fail(`${name} carries requisition ${requisition}, expected ${REQUISITION_ID}`);
    }
    if (/^- Start time:/m.test(text)) {
      fail(`${name} now states a start time, so HR-05 must mirror it rather than choose one`);
    }
    return {
      file: name,
      key: name.replace(/^interview-transcript-/, "").replace(/\.md$/, ""),
      date: metaLine(text, "Date", name),
      interviewer: metaLine(text, "Interviewer", name),
    };
  });
}

/**
 * Every candidate token the frozen application log carries: the ids, the full
 * names, and each name's own words, so a surname alone is swept for too. Read
 * rather than restated, because a restated list goes stale the moment the log
 * gains a row.
 */
export function readCandidateTokens() {
  const text = readText(
    join(REPO_ROOT, "artifacts", "HR-02", "application-log.md"),
    "the frozen HR-02 application log"
  );
  const tokens = new Set(["ca-0", "ca-1"]);
  for (const match of text.matchAll(/^\| (ca-\d{3}) \| ([^|]+?) \|/gm)) {
    tokens.add(match[1]);
    tokens.add(match[2].trim());
    for (const word of match[2].trim().split(/\s+/)) tokens.add(word);
  }
  if (tokens.size < 20) {
    fail(`the frozen application log yielded only ${tokens.size} candidate tokens, so its table shape has moved`);
  }
  return [...tokens];
}

/** One mirrored meeting, refused unless the frozen document still states it. */
function readMirroredMeeting(meeting, seat) {
  const what = `the frozen ${meeting.source_artifact} transcript`;
  const text = readText(meeting.file, what);
  const date = metaLine(text, "Date", what);
  const start = metaLine(text, "Start time", what);
  if (date !== meeting.date) {
    fail(`${meeting.source_artifact} now states the date ${date}, and this calendar mirrors ${meeting.date}`);
  }
  if (start !== meeting.start) {
    fail(`${meeting.source_artifact} now states the start time ${start}, and this calendar mirrors ${meeting.start}`);
  }
  if (meeting.stated_duration !== null) {
    const duration = metaLine(text, "Scheduled duration", what);
    if (duration !== meeting.stated_duration) {
      fail(`${meeting.source_artifact} now states a scheduled duration of ${duration}, and this calendar mirrors ${meeting.stated_duration}`);
    }
  }
  if (!text.includes(`  - ${seat.full_name} (${seat.role_title})`)) {
    fail(`${meeting.source_artifact} no longer seats ${seat.employee_id} in its attendee list, so mirroring it would invent attendance`);
  }
  return meeting;
}

/**
 * The mirror-set sweep: turns the frozen-layer predicate the spec and the plan
 * both state into a build-time pin rather than a per-document check alone.
 * Walks the .md files one level below artifacts/ (each artifact directory's
 * own files, no build/ recursion) in a fixed, sorted directory order; a file
 * qualifies
 * when it carries a "- Date:" line, a "- Start time:" line and an attendee
 * bullet seating one of the three panel seats. The qualifying set must equal
 * MIRRORED_MEETINGS exactly: a later frozen document that starts, or stops,
 * qualifying fails the build loudly instead of shipping calendars that quietly
 * disagree with the predicate the spec advertises.
 */
function sweepMirroredMeetings(seats) {
  const artifactsDir = join(REPO_ROOT, "artifacts");
  const qualifying = [];
  for (const dir of readdirSync(artifactsDir).sort()) {
    const dirPath = join(artifactsDir, dir);
    if (!statSync(dirPath).isDirectory()) continue;
    const names = readdirSync(dirPath)
      .filter((name) => name.endsWith(".md"))
      .sort();
    for (const name of names) {
      const filePath = join(dirPath, name);
      const text = readText(filePath, `the frozen ${dir}/${name}`);
      if (!/^- Date:/m.test(text)) continue;
      if (!/^- Start time:/m.test(text)) continue;
      const seatsAttendee = seats.some((seat) => text.includes(`  - ${seat.full_name} (${seat.role_title})`));
      if (!seatsAttendee) continue;
      qualifying.push(filePath);
    }
  }
  qualifying.sort();
  const expected = [...MIRRORED_MEETINGS.map((meeting) => meeting.file)].sort();
  const qualifyingSet = new Set(qualifying);
  const expectedSet = new Set(expected);
  const unexpected = qualifying.filter((file) => !expectedSet.has(file));
  const missing = expected.filter((file) => !qualifyingSet.has(file));
  if (unexpected.length > 0 || missing.length > 0) {
    fail(
      "the mirror-set sweep over artifacts/*/*.md does not equal MIRRORED_MEETINGS. "
      + `Unexpected: ${unexpected.join(", ") || "none"}. Missing: ${missing.join(", ") || "none"}.`
    );
  }
}

// --------------------------------------------------------------- the seats

/**
 * The three seats, derived rather than retyped: the recruiter and hiring
 * manager come from the frozen register, and the program manager comes from the
 * frozen scorecards, which are the only place a panelist employee id exists.
 * Every printed name and role title is byte-equal to CORE-04's own.
 */
export function buildSeats(roster = coreRoster()) {
  const requisition = readRequisition();
  const panelRoles = readPanelRoles();
  const scorecards = readScorecards();
  const transcripts = readTranscripts();

  const byId = new Map(roster.map((row) => [row.employee_id, row]));
  const scorecardSeat = new Map();
  for (const card of scorecards) {
    const seen = scorecardSeat.get(card.panel_role);
    if (seen && seen !== card.employee_id) {
      fail(`the frozen scorecards seat two people on ${card.panel_role}: ${seen} and ${card.employee_id}`);
    }
    scorecardSeat.set(card.panel_role, card.employee_id);
  }
  for (const role of panelRoles) {
    if (!scorecardSeat.has(role)) fail(`no frozen scorecard seats the ${role} panel role`);
  }

  const registerSeat = {
    "recruiter-screen": requisition.recruiter_employee_id,
    "hiring-manager": requisition.hiring_manager_employee_id,
  };

  const seats = panelRoles.map((panel_role) => {
    const employee_id = registerSeat[panel_role] ?? scorecardSeat.get(panel_role);
    if (registerSeat[panel_role] && registerSeat[panel_role] !== scorecardSeat.get(panel_role)) {
      fail(
        `the register seats ${registerSeat[panel_role]} on ${panel_role} and the frozen scorecards seat `
        + `${scorecardSeat.get(panel_role)}, so the two frozen sources disagree`
      );
    }
    const person = byId.get(employee_id);
    if (!person) fail(`${employee_id} is seated on ${panel_role} and is not on the CORE-04 roster`);
    if (person.employment_status !== "active") fail(`${employee_id} is seated on ${panel_role} and is not active`);
    return {
      panel_role,
      employee_id,
      full_name: `${person.first_name} ${person.last_name}`,
      role_title: person.role_title,
      seat_source_artifact: SEAT_SOURCE_ARTIFACT[panel_role],
    };
  });

  if (new Set(seats.map((seat) => seat.employee_id)).size !== seats.length) {
    fail("one person holds two panel seats, so no panelist is both the recruiter and the hiring manager fails");
  }

  // The printed name pin: every frozen document prints the interviewer as the
  // roster's own name and role title, so a roster reroll that renamed one of
  // the three would be caught here rather than in a calendar nobody reads.
  const seatByRole = new Map(seats.map((seat) => [seat.panel_role, seat]));
  const transcriptByKey = new Map(transcripts.map((row) => [row.key, row]));
  for (const card of scorecards) {
    const seat = seatByRole.get(card.panel_role);
    const printed = `${seat.full_name} (${seat.role_title})`;
    if (card.interviewer !== printed) {
      fail(`${card.file} prints the interviewer as "${card.interviewer}" and the roster says "${printed}"`);
    }
    const transcript = transcriptByKey.get(card.key);
    if (!transcript) fail(`${card.file} has no paired HR-03 transcript`);
    if (transcript.date !== card.interview_date) {
      fail(`${card.file} states the interview date ${card.interview_date} and its transcript states ${transcript.date}`);
    }
    if (transcript.interviewer !== printed) {
      fail(`${transcript.file} prints the interviewer as "${transcript.interviewer}" and the roster says "${printed}"`);
    }
  }

  return { requisition, panelRoles, scorecards, transcripts, seats };
}

// ---------------------------------------------------------- interval building

function makeInterval({ seat, date, start_minutes, duration_minutes, busy_type, source_artifact }) {
  const end_minutes = start_minutes + duration_minutes;
  return {
    employee_id: seat.employee_id,
    full_name: seat.full_name,
    role_title: seat.role_title,
    panel_role: seat.panel_role,
    date,
    start_minutes,
    end_minutes,
    duration_minutes,
    busy_type,
    subject: subjectFor(busy_type, seat.panel_role),
    source_artifact,
    abs_start: absoluteMinutes(date, start_minutes),
    abs_end: absoluteMinutes(date, end_minutes),
  };
}

/** The seeded types a seat may draw from: everything the table allows, minus the mirrors. */
function seededTypesFor(panelRole) {
  const pool = BUSY_TYPE_TABLE
    .filter((row) => row.seats.includes(panelRole) && !MIRROR_ONLY_BUSY_TYPES.includes(row.busy_type))
    .map((row) => row.busy_type);
  if (pool.length < 4) fail(`the ${panelRole} seat can draw from only ${pool.length} working block types`);
  return pool;
}

/**
 * The frozen layer, placed before any seeded draw: the six interviews the
 * scorecards date and the two meetings the operations transcripts state.
 */
function buildFrozenLayer({ seats, scorecards }) {
  const seatByRole = new Map(seats.map((seat) => [seat.panel_role, seat]));
  const dates = [...new Set(scorecards.map((card) => card.interview_date))].sort();
  const timed = Object.keys(INTERVIEW_START_BY_DATE).sort();
  if (dates.length !== timed.length || dates.some((date, i) => date !== timed[i])) {
    fail(
      `the frozen interview dates are ${dates.join(", ")} and this artifact carries clock times for `
      + `${timed.join(", ")}. An amended interview date needs a time chosen for it, not one borrowed.`
    );
  }

  const interviews = scorecards.map((card) => {
    const seat = seatByRole.get(card.panel_role);
    const duration = INTERVIEW_DURATION_BY_PANEL_ROLE[card.panel_role];
    if (!duration) fail(`no interview duration rule covers the ${card.panel_role} panel role`);
    return makeInterval({
      seat,
      date: card.interview_date,
      start_minutes: toMinutes(INTERVIEW_START_BY_DATE[card.interview_date]),
      duration_minutes: duration,
      busy_type: "interview",
      source_artifact: "HR-03",
    });
  });

  sweepMirroredMeetings(seats);

  const mirrorSeat = seatByRole.get(MIRRORED_MEETING_PANEL_ROLE);
  const meetings = MIRRORED_MEETINGS.map((meeting) => {
    readMirroredMeeting(meeting, mirrorSeat);
    return makeInterval({
      seat: mirrorSeat,
      date: meeting.date,
      start_minutes: toMinutes(meeting.start),
      duration_minutes: meeting.duration_minutes,
      busy_type: meeting.busy_type,
      source_artifact: meeting.source_artifact,
    });
  });

  const frozen = [...interviews, ...meetings];
  for (let i = 0; i < frozen.length; i += 1) {
    for (let j = i + 1; j < frozen.length; j += 1) {
      if (frozen[i].employee_id === frozen[j].employee_id && intervalsOverlap(frozen[i], frozen[j])) {
        fail(
          `the frozen layer already double books ${frozen[i].employee_id} on ${frozen[i].date}, `
          + "so the planted pair would not be the only one"
        );
      }
    }
  }
  return frozen;
}

/**
 * One seeded working day. A block is placed only into a gap that is already
 * free on that panelist's calendar so far, so pairwise disjointness is a
 * property of the construction rather than a hope. A drawn length that fits
 * nowhere is skipped rather than retried at a moved time or a shorter length.
 */
function placeSeededDay({ rng, seat, date, blocks, calendar, reserved }) {
  const pool = seededTypesFor(seat.panel_role);
  const count = rng.int(blocks[0], blocks[1]);
  for (let i = 0; i < count; i += 1) {
    const duration_minutes = rng.pick(BLOCK_LENGTHS);
    const busy_type = rng.pick(pool);
    const starts = [];
    for (let start = DAY_START_MINUTES; start + duration_minutes <= DAY_END_MINUTES; start += BLOCK_GRID_MINUTES) {
      const absStart = absoluteMinutes(date, start);
      const absEnd = absoluteMinutes(date, start + duration_minutes);
      const blocked = calendar.some((placed) => overlaps(placed.abs_start, placed.abs_end, absStart, absEnd))
        || reserved.some((span) => overlaps(span.abs_start, span.abs_end, absStart, absEnd));
      if (!blocked) starts.push(start);
    }
    if (starts.length === 0) continue;
    const start_minutes = rng.pick(starts);
    calendar.push(makeInterval({ seat, date, start_minutes, duration_minutes, busy_type, source_artifact: "" }));
  }
}

/**
 * The two opening days of the scheduling window, built so that no candidate
 * slot on either is free for both of the two panelists the plant does not sit
 * on. Blocks alternate between the two seats along one increasing cursor, so no
 * gap in the union of the two calendars ever reaches a slot length and neither
 * seat can collide with itself.
 */
function placeOpeningDay({ rng, seatQ, seatR, date, calendars }) {
  let cursor = DAY_START_MINUTES;
  let turn = 0;
  while (cursor < DAY_END_MINUTES) {
    const remaining = DAY_END_MINUTES - cursor;
    const gaps = OPENING_GAPS.filter((gap) => gap + MIN_BLOCK_MINUTES <= remaining);
    if (gaps.length === 0) break;
    const gap = rng.pick(gaps);
    const start_minutes = cursor + gap;
    const room = DAY_END_MINUTES - start_minutes;
    const lengths = BLOCK_LENGTHS.filter((length) => length <= room);
    const duration_minutes = rng.pick(lengths);
    const seat = turn % 2 === 0 ? seatQ : seatR;
    const busy_type = rng.pick(seededTypesFor(seat.panel_role));
    calendars.get(seat.employee_id).push(
      makeInterval({ seat, date, start_minutes, duration_minutes, busy_type, source_artifact: "" })
    );
    cursor = start_minutes + duration_minutes;
    turn += 1;
  }
}

// ------------------------------------------------------------ the slot scan

/** Every candidate slot in the scheduling window, in chronological order. */
export function candidateSlots() {
  const days = businessDays(WINDOW_START, WINDOW_END);
  if (days.length !== WINDOW_BUSINESS_DAYS) {
    fail(`the scheduling window holds ${days.length} business days, expected ${WINDOW_BUSINESS_DAYS}`);
  }
  const slots = [];
  for (const date of days) {
    for (let start = DAY_START_MINUTES; start + SLOT_MINUTES <= DAY_END_MINUTES; start += SLOT_GRID_MINUTES) {
      slots.push({
        date,
        start_minutes: start,
        end_minutes: start + SLOT_MINUTES,
        abs_start: absoluteMinutes(date, start),
        abs_end: absoluteMinutes(date, start + SLOT_MINUTES),
      });
    }
  }
  if (slots.length !== CANDIDATE_SLOTS) {
    fail(`the scheduling window holds ${slots.length} candidate slots, expected ${CANDIDATE_SLOTS}`);
  }
  return slots;
}

/** Is this panelist free for the whole slot? Half-open intervals, so touching endpoints are free. */
function freeForSlot(intervals, slot) {
  return !intervals.some((row) => overlaps(row.abs_start, row.abs_end, slot.abs_start, slot.abs_end));
}

/** The earliest slot in the window free for every one of the given calendars. */
function firstFreeSlot(calendars, slots) {
  return slots.find((slot) => calendars.every((intervals) => freeForSlot(intervals, slot))) ?? null;
}

// ------------------------------------------------------------ the whole build

function buildIntervals(roster) {
  const { requisition, panelRoles, scorecards, transcripts, seats } = buildSeats(roster);

  const marchDays = businessDays(CALENDAR_START, addDays(WINDOW_START, -1));
  const windowDays = businessDays(WINDOW_START, WINDOW_END);
  const spanDays = businessDays(CALENDAR_START, CALENDAR_END);
  if (spanDays.length !== CALENDAR_BUSINESS_DAYS) {
    fail(`the calendar span holds ${spanDays.length} business days, expected ${CALENDAR_BUSINESS_DAYS}`);
  }
  const openingDays = windowDays.slice(0, 2);
  const laterWindowDays = windowDays.slice(2);

  // 1. Draw the plant seat. Which panelist carries the double booking is a
  //    seeded draw and is written down nowhere: the census finds it by the
  //    overlap rule.
  const plantRng = createRng(id, "plant");
  const plantSeat = plantRng.pick(seats);
  const otherSeats = seats.filter((seat) => seat.employee_id !== plantSeat.employee_id);
  const [seatQ, seatR] = otherSeats;

  // 2. The frozen layer for all three, before any seeded draw.
  const calendars = new Map(seats.map((seat) => [seat.employee_id, []]));
  for (const interval of buildFrozenLayer({ seats, scorecards })) {
    calendars.get(interval.employee_id).push(interval);
  }

  const streams = new Map(seats.map((seat) => [seat.employee_id, createRng(id, `working-blocks-${seat.panel_role}`)]));

  // 3. The seeded layer for the two panelists the plant does not sit on, with
  //    the opening days shaped so the window scan cannot stop on either.
  for (const seat of otherSeats) {
    const rng = streams.get(seat.employee_id);
    const calendar = calendars.get(seat.employee_id);
    for (const date of marchDays) {
      placeSeededDay({ rng, seat, date, blocks: MARCH_BLOCKS, calendar, reserved: [] });
    }
    for (const date of laterWindowDays) {
      placeSeededDay({ rng, seat, date, blocks: WINDOW_BLOCKS, calendar, reserved: [] });
    }
  }
  const openingRng = createRng(id, "window-opening");
  for (const date of openingDays) {
    placeOpeningDay({ rng: openingRng, seatQ, seatR, date, calendars });
  }

  // 4. The proposed panel window: the earliest slot both of them are free.
  const slots = candidateSlots();
  const window = firstFreeSlot([calendars.get(seatQ.employee_id), calendars.get(seatR.employee_id)], slots);
  if (!window) fail("no candidate slot in the scheduling window is free for both of the other two panelists");

  // 5. The planted pair. Two meetings of one slot length, the second starting a
  //    grid step later, so the intersection is a non-empty subinterval of the
  //    window rather than a nested geometry no real double booking has. When
  //    the window sits too late in the day for the forward pair, the same
  //    geometry is mirrored backwards and the intersection still lies inside.
  const forward = window.start_minutes + SLOT_MINUTES + SLOT_GRID_MINUTES <= DAY_END_MINUTES;
  const pairStarts = forward
    ? [window.start_minutes, window.start_minutes + SLOT_GRID_MINUTES]
    : [window.start_minutes - SLOT_GRID_MINUTES, window.start_minutes];
  const plantSpan = {
    abs_start: absoluteMinutes(window.date, pairStarts[0]),
    abs_end: absoluteMinutes(window.date, pairStarts[1] + SLOT_MINUTES),
  };
  if (pairStarts[0] < DAY_START_MINUTES || pairStarts[1] + SLOT_MINUTES > DAY_END_MINUTES) {
    fail("the planted pair would sit outside business hours, so the window geometry needs a look");
  }

  // 6. The plant seat's own layer, built last and with the planted span held
  //    clear, so the pair lands in a gap rather than colliding with a block
  //    that was placed before the window was known.
  {
    const rng = streams.get(plantSeat.employee_id);
    const calendar = calendars.get(plantSeat.employee_id);
    for (const date of marchDays) {
      placeSeededDay({ rng, seat: plantSeat, date, blocks: MARCH_BLOCKS, calendar, reserved: [] });
    }
    for (const date of windowDays) {
      const reserved = date === window.date ? [plantSpan] : [];
      placeSeededDay({ rng, seat: plantSeat, date, blocks: WINDOW_BLOCKS, calendar, reserved });
    }
    if (calendar.some((row) => overlaps(row.abs_start, row.abs_end, plantSpan.abs_start, plantSpan.abs_end))) {
      fail("a seeded block landed inside the span the planted pair needs, so the pair would not be the only overlap");
    }
    const plantTypes = plantRng.shuffle(seededTypesFor(plantSeat.panel_role)).slice(0, 2);
    pairStarts.forEach((start_minutes, index) => {
      calendar.push(makeInterval({
        seat: plantSeat,
        date: window.date,
        start_minutes,
        duration_minutes: SLOT_MINUTES,
        busy_type: plantTypes[index],
        source_artifact: "",
      }));
    });
  }

  const intervals = [...calendars.values()].flat().sort((a, b) =>
    a.abs_start - b.abs_start
    || a.employee_id.localeCompare(b.employee_id)
    || a.abs_end - b.abs_end
  );
  intervals.forEach((row, index) => {
    row.interval_id = `CAL-2026-${String(index + 1).padStart(4, "0")}`;
  });

  return { requisition, panelRoles, scorecards, transcripts, seats, intervals, calendars, slots, window, plantSpan };
}

// -------------------------------------------------------------- the emitters

function busyIntervalRows(intervals) {
  return intervals.map((row) => ({
    interval_id: row.interval_id,
    employee_id: row.employee_id,
    full_name: row.full_name,
    role_title: row.role_title,
    panel_role: row.panel_role,
    start_at: instantOf(row.date, row.start_minutes),
    end_at: instantOf(row.date, row.end_minutes),
    duration_minutes: row.duration_minutes,
    busy_type: row.busy_type,
    subject: row.subject,
    source_artifact: row.source_artifact,
  }));
}

function panelRequestRows({ requisition, seats }) {
  return seats.map((seat) => ({
    request_id: REQUEST_ID,
    requisition_id: requisition.requisition_id,
    requisition_title: requisition.requisition_title,
    department: requisition.department,
    round_name: ROUND_NAME,
    panel_role: seat.panel_role,
    seat_employee_id: seat.employee_id,
    seat_full_name: seat.full_name,
    seat_role_title: seat.role_title,
    seat_source_artifact: seat.seat_source_artifact,
    slot_minutes: SLOT_MINUTES,
    slot_grid_minutes: SLOT_GRID_MINUTES,
    business_hours_start: BUSINESS_HOURS_START,
    business_hours_end: BUSINESS_HOURS_END,
    time_zone: TIME_ZONE,
    window_start_date: WINDOW_START,
    window_end_date: WINDOW_END,
    requested_by_employee_id: requisition.recruiter_employee_id,
    requested_on: AS_OF,
  }));
}

/** The file name a panelist's calendar lands at, lower cased on the employee id. */
export function calendarFileName(employeeId) {
  return `calendar-${employeeId.toLowerCase()}.ics`;
}

/**
 * One VCALENDAR. LF line endings and no folded line: RFC 5545 asks for CRLF,
 * and no committed file in this repo carries a CR byte, so shipping one would
 * invite normalization churn on every checkout for no reader benefit. The
 * subject vocabulary is chosen to keep every content line at or under 75
 * octets, so folding is a mechanism nothing here needs.
 */
function renderCalendar({ seat, intervals, companyName }) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${companyName}//Interviewer availability export//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(`${seat.full_name}, ${seat.role_title}`)}`,
    `X-WR-TIMEZONE:${TIME_ZONE}`,
  ];
  for (const row of intervals) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${row.interval_id}@${UID_DOMAIN}`,
      `DTSTAMP:${DTSTAMP}`,
      `DTSTART:${icsStamp(row.date, row.start_minutes)}`,
      `DTEND:${icsStamp(row.date, row.end_minutes)}`,
      `SUMMARY:${escapeIcsText(row.subject)}`,
      "STATUS:CONFIRMED",
      "TRANSP:OPAQUE",
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------- post-conditions

/**
 * Re-derive every claim the spec makes from the emitted rows, the way the
 * public guard does, and throw with the failing number rather than shipping.
 * The numbering follows the tie-out table in the data plan.
 */
function assertPostConditions(built, files, spec) {
  const { seats, intervals, calendars, slots, window, requisition, scorecards, transcripts, panelRoles } = built;
  const byId = new Map(seats.map((seat) => [seat.employee_id, seat]));

  // T1: exactly one panelist carries an overlapping pair, and exactly one pair exists.
  const pairsBySeat = new Map();
  let census = 0;
  for (const seat of seats) {
    const rows = calendars.get(seat.employee_id);
    let pairs = 0;
    for (let i = 0; i < rows.length; i += 1) {
      for (let j = i + 1; j < rows.length; j += 1) {
        if (intervalsOverlap(rows[i], rows[j])) pairs += 1;
      }
    }
    pairsBySeat.set(seat.employee_id, pairs);
    census += pairs;
  }
  const carriers = [...pairsBySeat.values()].filter((count) => count > 0);
  if (carriers.length !== 1 || carriers[0] !== 1 || census !== 1) {
    fail(
      `HR-C3-T1: ${carriers.length} panelists carry an overlapping pair and the file census is ${census}, `
      + "expected exactly one panelist carrying exactly one pair"
    );
  }

  // T2: the window recomputes, and the planted intersection lies inside it.
  const clean = seats.filter((seat) => pairsBySeat.get(seat.employee_id) === 0);
  const recomputed = firstFreeSlot(clean.map((seat) => calendars.get(seat.employee_id)), slots);
  if (!recomputed || recomputed.abs_start !== window.abs_start) {
    fail(`HR-C3-T2: the proposed panel window recomputes to ${recomputed ? recomputed.date : "nothing"} rather than the one the plant was built into`);
  }
  const plantSeatId = seats.find((seat) => pairsBySeat.get(seat.employee_id) === 1).employee_id;
  const plantRows = calendars.get(plantSeatId);
  let intersections = 0;
  for (let i = 0; i < plantRows.length; i += 1) {
    for (let j = i + 1; j < plantRows.length; j += 1) {
      if (!intervalsOverlap(plantRows[i], plantRows[j])) continue;
      const start = Math.max(plantRows[i].abs_start, plantRows[j].abs_start);
      const end = Math.min(plantRows[i].abs_end, plantRows[j].abs_end);
      if (end <= start) fail("HR-C3-T2: the planted pair's intersection is empty");
      if (start < window.abs_start || end > window.abs_end) {
        fail("HR-C3-T2: the planted pair's intersection does not lie inside the proposed panel window");
      }
      intersections += 1;
    }
  }
  if (intersections !== 1) fail(`HR-C3-T2: ${intersections} planted intersections, expected 1`);
  if (freeForSlot(plantRows, window)) fail("HR-C3-T2: the proposed panel window is free for all three panelists");

  // T3: a later slot is free for all three.
  const clear = firstFreeSlot(seats.map((seat) => calendars.get(seat.employee_id)), slots);
  if (!clear) fail("HR-C3-T3: no candidate slot in the scheduling window is free for all three panelists");
  if (clear.abs_start <= window.abs_start) {
    fail("HR-C3-T3: the first clear window is not strictly later than the proposed panel window");
  }

  // T4 and T5: the seats, and where they come from.
  if (panelRoles.length !== 3 || new Set(seats.map((s) => s.panel_role)).size !== 3) {
    fail("HR-C3-T4: the three panel seats are not distinct panel roles");
  }
  const recruiterSeat = seats.find((seat) => seat.panel_role === "recruiter-screen");
  const managerSeat = seats.find((seat) => seat.panel_role === "hiring-manager");
  if (recruiterSeat.employee_id !== requisition.recruiter_employee_id) {
    fail("HR-C3-T5: the recruiter screen seat is not the register's own recruiter");
  }
  if (managerSeat.employee_id !== requisition.hiring_manager_employee_id) {
    fail("HR-C3-T5: the hiring manager seat is not the register's own hiring manager");
  }
  if (recruiterSeat.employee_id === managerSeat.employee_id) {
    fail("HR-C3-T5: one panelist holds both the recruiter and the hiring manager seat");
  }

  // T6: the mirrored interviews reproduce the frozen scorecard tuples.
  const mirroredInterviews = intervals.filter((row) => row.source_artifact === "HR-03");
  if (mirroredInterviews.length !== scorecards.length) {
    fail(`HR-C3-T6: ${mirroredInterviews.length} mirrored interviews against ${scorecards.length} frozen scorecards`);
  }
  const transcriptByKey = new Map(transcripts.map((row) => [row.key, row]));
  for (const card of scorecards) {
    const match = mirroredInterviews.filter(
      (row) => row.panel_role === card.panel_role
        && row.employee_id === card.employee_id
        && row.date === card.interview_date
    );
    if (match.length !== 1) {
      fail(`HR-C3-T6: ${match.length} intervals reproduce ${card.file}'s panel role, panelist and date, expected 1`);
    }
    if (transcriptByKey.get(card.key).date !== card.interview_date) {
      fail(`HR-C3-T6: ${card.file} and its paired transcript disagree about the interview date`);
    }
  }

  // T7: the mirror set is closed.
  const mirrored = intervals.filter((row) => row.source_artifact !== "");
  const meetings = intervals.filter((row) => MIRRORED_MEETINGS.some((m) => m.source_artifact === row.source_artifact));
  if (mirrored.length !== mirroredInterviews.length + MIRRORED_MEETINGS.length) {
    fail(`HR-C3-T7: ${mirrored.length} intervals carry a source_artifact, expected ${mirroredInterviews.length + MIRRORED_MEETINGS.length}`);
  }
  for (const meeting of MIRRORED_MEETINGS) {
    const match = meetings.filter((row) => row.source_artifact === meeting.source_artifact);
    if (match.length !== 1) fail(`HR-C3-T7: ${match.length} intervals carry ${meeting.source_artifact}, expected 1`);
    if (match[0].date !== meeting.date || match[0].start_minutes !== toMinutes(meeting.start)) {
      fail(`HR-C3-T7: the ${meeting.source_artifact} mirror does not carry the date and start time that document states`);
    }
    if (match[0].panel_role !== MIRRORED_MEETING_PANEL_ROLE) {
      fail(`HR-C3-T7: the ${meeting.source_artifact} mirror seats the wrong panelist`);
    }
  }

  // T8: business hours, business days, grid and duration.
  for (const row of intervals) {
    if (row.date < CALENDAR_START || row.date > CALENDAR_END) fail(`HR-C3-T8: ${row.interval_id} sits outside the calendar span`);
    if (isWeekend(row.date)) fail(`HR-C3-T8: ${row.interval_id} sits on a weekend`);
    if (row.start_minutes < DAY_START_MINUTES || row.end_minutes > DAY_END_MINUTES) {
      fail(`HR-C3-T8: ${row.interval_id} sits outside business hours`);
    }
    if (row.end_minutes <= row.start_minutes) fail(`HR-C3-T8: ${row.interval_id} ends at or before it starts`);
    if (row.end_minutes - row.start_minutes !== row.duration_minutes) {
      fail(`HR-C3-T8: ${row.interval_id} states a duration its own instants do not recompute`);
    }
    if (row.start_minutes % BLOCK_GRID_MINUTES !== 0 || row.end_minutes % BLOCK_GRID_MINUTES !== 0) {
      fail(`HR-C3-T8: ${row.interval_id} is not on the ${BLOCK_GRID_MINUTES} minute grid`);
    }
  }

  // T10: the closed vocabularies and the per-seat table.
  for (const row of intervals) {
    const entry = BUSY_TYPE_TABLE.find((table) => table.busy_type === row.busy_type);
    if (!entry) fail(`HR-C3-T10: ${row.interval_id} carries the busy_type "${row.busy_type}"`);
    if (!entry.seats.includes(row.panel_role)) {
      fail(`HR-C3-T10: ${row.interval_id} puts "${row.busy_type}" on the ${row.panel_role} seat`);
    }
    if (row.subject !== subjectFor(row.busy_type, row.panel_role)) {
      fail(`HR-C3-T10: ${row.interval_id} states a subject its own busy_type does not map to`);
    }
  }

  // The design bands. Constructed targets rather than byte facts, so they are
  // asserted as a band and the landed totals are pinned into the spec.
  for (const seat of seats) {
    const count = calendars.get(seat.employee_id).length;
    if (count < MIN_INTERVALS_PER_PANELIST || count > MAX_INTERVALS_PER_PANELIST) {
      fail(
        `${seat.panel_role} carries ${count} busy intervals, outside the design band of `
        + `${MIN_INTERVALS_PER_PANELIST} to ${MAX_INTERVALS_PER_PANELIST}`
      );
    }
  }

  // T11 and T12: the rendering, the headers and the house rules.
  const calendarFiles = files.filter((file) => file.path.endsWith(".ics"));
  if (calendarFiles.length !== seats.length) {
    fail(`HR-C3-T11: ${calendarFiles.length} calendars against ${seats.length} panelists`);
  }
  for (const file of calendarFiles) {
    const seat = seats.find((row) => calendarFileName(row.employee_id) === file.path);
    if (!seat) fail(`HR-C3-T11: ${file.path} does not name a panelist`);
    const rows = intervals.filter((row) => row.employee_id === seat.employee_id);
    const uids = file.content.split("\n").filter((line) => line.startsWith("UID:"));
    if (uids.length !== rows.length) {
      fail(`HR-C3-T11: ${file.path} holds ${uids.length} events against ${rows.length} rows for that panelist`);
    }
    const stamps = file.content.split("\n").filter((line) => line.startsWith("DTSTAMP:"));
    if (stamps.some((line) => line !== `DTSTAMP:${DTSTAMP}`)) fail(`HR-C3-T11: ${file.path} carries a stamp other than the fixed as-of`);
  }
  const candidateTokens = readCandidateTokens();
  for (const file of files) {
    if (file.content.includes("\r")) fail(`HR-C3-T11: ${file.path} carries a CR byte`);
    if (file.path.endsWith(".ics")) {
      for (const line of file.content.split("\n")) {
        if (Buffer.byteLength(line, "utf8") > 75) {
          fail(`HR-C3-T11: ${file.path} carries a content line over 75 octets, which would need folding`);
        }
      }
    }
    if (file.content.includes("\u2014")) fail(`HR-C3-T12: ${file.path} carries an em dash`);
    if (/[$%]/.test(file.content)) fail(`HR-C3-T12: ${file.path} carries a money or percentage sign`);
    for (const domain of file.content.match(/[A-Za-z0-9.-]*\.example/g) ?? []) {
      if (domain !== UID_DOMAIN) fail(`HR-C3-T12: ${file.path} names the domain ${domain}`);
    }
    // T9: no candidate trace. The name list is read out of the frozen
    // application log rather than restated, so a candidate added there is
    // swept for here without this file being edited.
    if (/\bca-\d/.test(file.content)) fail(`HR-C3-T9: ${file.path} carries a candidate id`);
    for (const token of candidateTokens) {
      if (file.content.includes(token)) fail(`HR-C3-T9: ${file.path} carries the candidate token "${token}"`);
    }
  }
  if (!spec?.files) {
    fail("HR-C3-T12: the spec carries no \"files\" block, so the emitted headers cannot be pinned against it");
  }
  for (const [path, columns] of Object.entries(spec.files)) {
    const emitted = files.find((file) => file.path === path);
    if (!emitted) fail(`HR-C3-T12: the spec lists ${path}, which is not emitted`);
    const header = emitted.content.split("\n")[0].split(",");
    if (header.length !== columns.length || header.some((cell, i) => cell !== columns[i])) {
      fail(`HR-C3-T12: ${path}'s header does not equal the spec's own column list`);
    }
  }
  if (byId.size !== 3) fail("HR-C3-T4: the panel is not three seats");
}

// -------------------------------------------------------------------- entry

export function generate({ spec, canon } = {}) {
  const company = canon?.get(CANON_COMPANY_ID);
  if (!company) fail(`canon/companies.md does not seat ${CANON_COMPANY_ID}`);

  const roster = coreRoster();
  const built = buildIntervals(roster);
  const { seats, intervals } = built;

  const files = seats.map((seat) => ({
    path: calendarFileName(seat.employee_id),
    content: renderCalendar({
      seat,
      intervals: intervals.filter((row) => row.employee_id === seat.employee_id),
      companyName: company.name,
    }),
  }));
  files.sort((a, b) => a.path.localeCompare(b.path));
  files.push(
    { path: "busy-intervals.csv", content: toCsv(BUSY_INTERVAL_COLUMNS, busyIntervalRows(intervals)) },
    { path: "panel-request.csv", content: toCsv(PANEL_REQUEST_COLUMNS, panelRequestRows(built)) }
  );

  assertPostConditions(built, files, spec);
  return files;
}

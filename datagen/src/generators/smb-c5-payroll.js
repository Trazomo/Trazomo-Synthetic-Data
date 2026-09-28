// The small-business payroll readiness builder: SMB-26 crew-roster-mock, SMB-27
// shift-schedule-mock, SMB-28 timecards-mock and SMB-29
// payroll-readiness-checklist, built as one unit because they are one chain:
// the schedule places the roster's people, the timecards are clocked against
// the schedule, and the checklist's six passes and three trips are defined
// against all three. Never registered as a generator of its own; the thin
// modules smb-26-crew-roster-mock.js, smb-27-shift-schedule-mock.js,
// smb-28-timecards-mock.js and smb-29-payroll-readiness-checklist.js are.
//
//   SMB-26  the nine people of co-100's studio, pe-216 to pe-224, the only file
//           in the pack that carries a crew member's name. Eight hourly wages,
//           each below its role's SMB-20 cost rate and equal to none of the six,
//           and the owner salaried with no rate.
//   SMB-27  53 shifts in the pay period 2026-03-16 to 2026-03-29 on its ten
//           weekdays. P1: exactly one person is on two shifts that overlap on
//           one date (the strict test); the project lead's back-to-back visits
//           on five dates end as the next begins and do not overlap.
//   SMB-28  52 timecards, one per shift less P2, the one scheduled shift with
//           no timecard; P3, the one timecard keyed at a rate that differs from
//           the roster for the same person.
//   SMB-29  the nine readiness checks; no defects. Three trip on the shipped
//           files, one per plant, and six pass.
//
// Rule R-ROLE, amended for cluster 5: a person's name lives in SMB-26 and in
// no other file. SMB-27 and SMB-28 carry person_id only; SMB-29 carries roles
// only, read off SMB-33's DA-LDB-27.
//
// The names are held here as one constant, CREW, and are NOT drawn at build
// time (data plan U-A). They were drawn once under createRng("SMB-26",
// "crew-names") through six screens, and the public test re-derives that draw
// and asserts it equals CREW. A build-time draw would reject its own nine the
// day canon/people.md seats them, and a generator that read canon/people.md
// would reroll its bytes on any canon edit; this builder reads neither.
//
// Rule R-GATE: readiness is a gate, not a pay run. Gross pay is computed
// nowhere: no column holds a pay amount, and the builder throws if any cell of
// the four files equals any hours value times any rate, or any timecard's or
// person's implied gross.
//
// Frozen bytes are read at build time, never retyped: SMB-20's crew roles,
// cost rates and pay-period hours (buildTimeEntries), SMB-22's job ids
// (buildJobProgress) and SMB-33's DA-LDB-27 (buildDecisionMatrix), each held
// against a loud-throw pin.
//
// Money is integer cents in code and a 2dp string on disk (rule R-CENTS); time
// is integer minutes in code and HH:MM on disk, every clock time on the quarter
// hour, so hours_worked is exact at 2dp.
import { ANCHOR_DATE, addDays, weekday } from "../dates.js";
import { createRng } from "../seed.js";
import { COST_RATE_CENTS, CREW_ROLES, buildJobProgress, buildTimeEntries } from "./smb-c3-job-costing.js";
import { ROLE_SENIORITY, buildDecisionMatrix } from "./smb-c4-controls.js";

const BUILDER = "smb-c5-payroll";

// ------------------------------------------------------------------ units

const usd = (cents) => {
  if (!Number.isInteger(cents) || cents < 0) throw new Error(`${BUILDER}: ${cents} is not whole non-negative cents`);
  return (cents / 100).toFixed(2);
};
const toCents = (value) => {
  const m = /^(\d+)\.(\d{2})$/.exec(value);
  if (!m) throw new Error(`${BUILDER}: "${value}" is not a 2dp money string`);
  return Number(m[1]) * 100 + Number(m[2]);
};
const hhmm = (minutes) => {
  if (!Number.isInteger(minutes) || minutes % 15 !== 0) throw new Error(`${BUILDER}: ${minutes} is off the quarter hour`);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
};
const minutesOf = (value) => {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) throw new Error(`${BUILDER}: "${value}" is not HH:MM`);
  return Number(m[1]) * 60 + Number(m[2]);
};
const hoursText = (minutes) => {
  if (minutes % 15 !== 0) throw new Error(`${BUILDER}: ${minutes} minutes is off the quarter hour`);
  return (minutes / 60).toFixed(2);
};
const pad2 = (n) => String(n).padStart(2, "0");

// ------------------------------------------------------------------ the period

export const PAY_PERIOD = { start: "2026-03-16", end: "2026-03-29" };
if (PAY_PERIOD.start !== ANCHOR_DATE) {
  throw new Error(`${BUILDER}: the pay period starts ${PAY_PERIOD.start} and ANCHOR_DATE is ${ANCHOR_DATE}`);
}

/** The period's ten weekdays, in date order. */
export const WORK_DATES = (() => {
  const out = [];
  for (let d = PAY_PERIOD.start; d <= PAY_PERIOD.end; d = addDays(d, 1)) {
    const wd = weekday(d);
    if (wd !== 0 && wd !== 6) out.push(d);
  }
  if (out.length !== 10) throw new Error(`${BUILDER}: the pay period holds ${out.length} weekdays, expected 10`);
  return out;
})();

/** The Friday ending the working week a weekday falls in: SMB-20's week key. */
const fridayOf = (d) => addDays(d, 5 - weekday(d));
/** The Monday starting the pay week a date falls in. */
const mondayOf = (d) => addDays(d, -((weekday(d) + 6) % 7));

export const SITE_SHIFT = { start: "07:00", end: "15:00" };
export const VISIT_AM = { start: "08:00", end: "12:00" };
export const VISIT_PM = { start: "12:00", end: "16:00" };

// ------------------------------------------------------------ upstream pins

/** SMB-20's six cost centres and cost rates, as the frozen bytes must still yield them. */
export const CREW_ROLES_PIN = ["design", "demolition", "plumbing", "carpentry", "paint", "project_management"];
export const COST_RATE_PIN = { design: 8750, demolition: 11250, plumbing: 7250, carpentry: 6500, paint: 5500, project_management: 9500 };

function assertSmb20Pins() {
  if (CREW_ROLES.join("|") !== CREW_ROLES_PIN.join("|")) {
    throw new Error(`${BUILDER}: SMB-20's CREW_ROLES now read ${CREW_ROLES.join(", ")}; the roster maps onto the pinned six`);
  }
  for (const role of CREW_ROLES_PIN) {
    if (COST_RATE_CENTS[role] !== COST_RATE_PIN[role]) {
      throw new Error(`${BUILDER}: SMB-20's ${role} cost rate is now ${COST_RATE_CENTS[role]} cents, pinned at ${COST_RATE_PIN[role]}`);
    }
  }
  if (ROLE_SENIORITY.join("|") !== "lead carpenter|project lead|owner") {
    throw new Error(`${BUILDER}: SMB-33's role ladder is now ${ROLE_SENIORITY.join(", ")}`);
  }
}

/** SMB-33's DA-LDB-27, the policy every readiness check sits under, behind a loud-throw pin. */
export const DA27_PIN = {
  control_id: "DA-LDB-27",
  decision: "Prepare crew pay figures from the timecards",
  data_class: "restricted",
  amount_min_usd: "",
  amount_max_usd: "",
  ai_autonomy_level: "approval_before_action",
  approver_role: "project lead",
  escalation_role: "owner",
};

function readDa27(canon) {
  const rows = buildDecisionMatrix({ canon });
  const row = rows.find((r) => r.control_id === DA27_PIN.control_id);
  if (!row) throw new Error(`${BUILDER}: SMB-33 carries no ${DA27_PIN.control_id}`);
  for (const [k, v] of Object.entries(DA27_PIN)) {
    if (row[k] !== v) {
      throw new Error(`${BUILDER}: SMB-33's ${DA27_PIN.control_id} ${k} now reads "${row[k]}", pinned at "${v}"; the checklist and the matrix cannot both be right`);
    }
  }
  for (const id of ["DA-LDB-18", "DA-LDB-19", "DA-LDB-20"]) {
    const r = rows.find((x) => x.control_id === id);
    if (!r || r.ai_autonomy_level !== "prohibited" || !/crew member/.test(r.decision)) {
      throw new Error(`${BUILDER}: SMB-33's ${id} no longer prohibits AI sending a payment to a crew member`);
    }
  }
  return row;
}

/** SMB-20's pay-period keys, job|crew_role|week_ending, with hours summed over scope, in minutes. */
function smb20PeriodKeys(canon) {
  const out = new Map();
  for (const r of buildTimeEntries({ canon })) {
    if (r.week_ending < PAY_PERIOD.start || r.week_ending > PAY_PERIOD.end) continue;
    const k = `${r.job_id}|${r.crew_role}|${r.week_ending}`;
    out.set(k, (out.get(k) ?? 0) + Number(r.hours) * 60);
  }
  return out;
}

// ------------------------------------------------------------------ SMB-26

export const ROSTER_COLUMNS = [
  "person_id", "first_name", "last_name", "role_title", "crew_role", "pay_basis", "hourly_pay_rate_usd", "record_type",
];

/**
 * The nine, pinned (data plan section 2.1), in roster order: the three decision
 * roles most senior first, then the carpenters, the painter, the plumber and the
 * labourer. Rates in integer cents; null on the salaried row.
 */
export const CREW = [
  { person_id: "pe-216", first_name: "Corwin", last_name: "Nightshade", role_title: "owner", crew_role: "design", pay_basis: "salaried", rate_cents: null },
  { person_id: "pe-217", first_name: "Honora", last_name: "Oakhurst", role_title: "project lead", crew_role: "project_management", pay_basis: "hourly", rate_cents: 4200 },
  { person_id: "pe-218", first_name: "Ewald", last_name: "Vantree", role_title: "lead carpenter", crew_role: "carpentry", pay_basis: "hourly", rate_cents: 3800 },
  { person_id: "pe-219", first_name: "Gideon", last_name: "Ashby", role_title: "carpenter", crew_role: "carpentry", pay_basis: "hourly", rate_cents: 3250 },
  { person_id: "pe-220", first_name: "Wrenna", last_name: "Holloway", role_title: "carpenter", crew_role: "carpentry", pay_basis: "hourly", rate_cents: 3100 },
  { person_id: "pe-221", first_name: "Faro", last_name: "Moorfield", role_title: "carpenter", crew_role: "carpentry", pay_basis: "hourly", rate_cents: 2950 },
  { person_id: "pe-222", first_name: "Fenwick", last_name: "Loxley", role_title: "painter", crew_role: "paint", pay_basis: "hourly", rate_cents: 2800 },
  { person_id: "pe-223", first_name: "Isolde", last_name: "Jarrow", role_title: "plumber", crew_role: "plumbing", pay_basis: "hourly", rate_cents: 3900 },
  { person_id: "pe-224", first_name: "Yara", last_name: "Fairweather", role_title: "labourer", crew_role: "demolition", pay_basis: "hourly", rate_cents: 2500 },
];

const crewById = new Map(CREW.map((p) => [p.person_id, p]));
const rosterPos = new Map(CREW.map((p, i) => [p.person_id, i]));
const PROJECT_LEAD = CREW.find((p) => p.role_title === "project lead").person_id;

export const ROSTER_CENSUS = {
  rows: 9,
  role_title: { owner: 1, "project lead": 1, "lead carpenter": 1, carpenter: 3, painter: 1, plumber: 1, labourer: 1 },
  crew_role: { design: 1, demolition: 1, plumbing: 1, carpentry: 4, paint: 1, project_management: 1 },
  pay_basis: { hourly: 8, salaried: 1 },
  distinct_rates: 8,
};

const tally = (rows, fn) => {
  const out = {};
  for (const r of rows) out[fn(r)] = (out[fn(r)] ?? 0) + 1;
  return out;
};
const sameTally = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

/** SMB-26's rows, keyed by ROSTER_COLUMNS, with every census of section 2.1 asserted. */
export function buildCrewRoster() {
  assertSmb20Pins();
  const where = "SMB-26";
  if (CREW.length !== ROSTER_CENSUS.rows) throw new Error(`${where}: ${CREW.length} rows`);
  CREW.forEach((p, i) => {
    if (p.person_id !== `pe-${216 + i}`) throw new Error(`${where}: row ${i + 1} is ${p.person_id}, not pe-${216 + i}`);
  });
  for (const key of ["role_title", "crew_role", "pay_basis"]) {
    if (!sameTally(tally(CREW, (p) => p[key]), ROSTER_CENSUS[key])) throw new Error(`${where}: the ${key} census has moved`);
  }
  if (CREW.slice(0, 3).map((p) => p.role_title).join("|") !== [...ROLE_SENIORITY].reverse().join("|")) {
    throw new Error(`${where}: the top three rows are not SMB-33's roles, most senior first`);
  }
  const rates = CREW.filter((p) => p.rate_cents !== null).map((p) => p.rate_cents);
  if (new Set(rates).size !== ROSTER_CENSUS.distinct_rates) throw new Error(`${where}: the hourly rates are not ${ROSTER_CENSUS.distinct_rates} distinct`);
  const six = new Set(Object.values(COST_RATE_CENTS));
  for (const p of CREW) {
    if (!CREW_ROLES.includes(p.crew_role)) throw new Error(`${where}: ${p.person_id} crew_role ${p.crew_role}`);
    if ((p.pay_basis === "salaried") !== (p.rate_cents === null)) throw new Error(`${where}: ${p.person_id} rate and pay basis disagree`);
    if (p.rate_cents === null) continue;
    if (p.rate_cents % 50 !== 0) throw new Error(`${where}: ${p.person_id}'s rate is not a whole or half dollar`);
    if (p.rate_cents >= COST_RATE_CENTS[p.crew_role]) throw new Error(`${where}: ${p.person_id}'s wage is not below the ${p.crew_role} cost rate`);
    if (six.has(p.rate_cents)) throw new Error(`${where}: ${p.person_id}'s wage equals an SMB-20 cost rate`);
  }
  const rate = (title) => CREW.find((p) => p.role_title === title).rate_cents;
  if (!CREW.filter((p) => p.role_title === "carpenter").every((p) => p.rate_cents < rate("lead carpenter"))) {
    throw new Error(`${where}: a carpenter earns at least the lead carpenter`);
  }
  if (Math.max(...rates) !== rate("project lead")) throw new Error(`${where}: the project lead does not earn the most`);
  return CREW.map((p) => ({
    person_id: p.person_id,
    first_name: p.first_name,
    last_name: p.last_name,
    role_title: p.role_title,
    crew_role: p.crew_role,
    pay_basis: p.pay_basis,
    hourly_pay_rate_usd: p.rate_cents === null ? "" : usd(p.rate_cents),
    record_type: "mock",
  }));
}

// ------------------------------------------------------------------ SMB-27

export const SCHEDULE_COLUMNS = ["shift_id", "person_id", "work_date", "job_id", "start_time", "end_time", "record_type"];

/**
 * The grid of section 2.2, one line per person: for each of the ten work dates
 * in order, the shifts that person works that date. `F` is a site shift, `am`
 * and `pm` the project lead's visits, `P1` the afternoon start on the new job
 * that makes the one double booking. The number is the job, JOB-LDB-0N.
 */
const GRID = {
  "pe-217": [["1am", "2pm"], ["3am", "4pm"], ["5am", "6pm"], ["1am", "2pm"], ["1am", "3pm"], ["1am"], ["1am"], [], ["1am"], []],
  "pe-218": [["1F"], ["1F"], ["1F"], ["1F"], ["1F"], ["1F"], ["1F"], ["1F"], ["1F"], ["1F"]],
  "pe-219": [["1F"], ["1F"], ["1F", "6P1"], ["6F"], ["6F"], ["1F"], ["1F"], ["1F"], [], []],
  "pe-220": [["5F"], ["5F"], ["5F"], ["5F"], ["5F"], ["5F"], ["5F"], ["5F"], ["5F"], []],
  "pe-221": [["5F"], ["5F"], ["5F"], ["5F"], ["5F"], ["5F"], ["5F"], [], [], []],
  "pe-222": [["1F"], ["1F"], ["2F"], ["3F"], ["4F"], [], [], [], [], []],
};
const KIND = { F: SITE_SHIFT, am: VISIT_AM, pm: VISIT_PM, P1: VISIT_PM };

export const SCHEDULE_CENSUS = {
  rows: 53,
  per_person: [0, 13, 10, 9, 9, 7, 5, 0, 0],
  per_date: [7, 7, 8, 7, 7, 5, 5, 3, 3, 1],
  per_job: [24, 3, 3, 2, 17, 4],
  site: 39,
  short: 14,
  scheduled_minutes: 368 * 60,
  person_dates_with_two: 6,
};

/** SMB-27 P1, pinned after it is found by rule. */
export const P1_PIN = { ids: ["SHF-LDB-16", "SHF-LDB-22"], person_id: "pe-219", work_date: "2026-03-18" };

const strictOverlap = (a0, a1, b0, b1) => a0 < b1 && b0 < a1;
const closedOverlap = (a0, a1, b0, b1) => a0 <= b1 && b0 <= a1;

/** Pairs of rows of one person on one date whose intervals meet the test. */
function overlapPairs(rows, startKey, endKey, idKey, test) {
  const out = [];
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const a = rows[i];
      const b = rows[j];
      if (a.person_id !== b.person_id || a.work_date !== b.work_date) continue;
      if (test(minutesOf(a[startKey]), minutesOf(a[endKey]), minutesOf(b[startKey]), minutesOf(b[endKey]))) {
        out.push({ ids: [a[idKey], b[idKey]], person_id: a.person_id, work_date: a.work_date });
      }
    }
  }
  return out;
}

/** SMB-27's rows, keyed by SCHEDULE_COLUMNS, with every census and P1 at both readings asserted. */
export function buildShiftSchedule({ canon }) {
  const where = "SMB-27";
  buildCrewRoster();
  const shifts = [];
  for (const [person_id, days] of Object.entries(GRID)) {
    if (days.length !== WORK_DATES.length) throw new Error(`${where}: ${person_id}'s grid line is not ten dates`);
    days.forEach((cells, d) => {
      for (const cell of cells) {
        const m = /^([1-6])(F|am|pm|P1)$/.exec(cell);
        if (!m) throw new Error(`${where}: grid cell "${cell}"`);
        const k = KIND[m[2]];
        shifts.push({ person_id, work_date: WORK_DATES[d], job_id: `JOB-LDB-0${m[1]}`, start_time: k.start, end_time: k.end });
      }
    });
  }
  shifts.sort((a, b) => (a.work_date < b.work_date ? -1 : a.work_date > b.work_date ? 1 : 0)
    || minutesOf(a.start_time) - minutesOf(b.start_time)
    || rosterPos.get(a.person_id) - rosterPos.get(b.person_id)
    || (a.job_id < b.job_id ? -1 : a.job_id > b.job_id ? 1 : 0));
  const rows = shifts.map((s, i) => ({
    shift_id: `SHF-LDB-${pad2(i + 1)}`, person_id: s.person_id, work_date: s.work_date, job_id: s.job_id,
    start_time: s.start_time, end_time: s.end_time, record_type: "mock",
  }));
  assertSchedule(rows, canon);
  return rows;
}

const shiftLength = (s) => minutesOf(s.end_time) - minutesOf(s.start_time);

function assertSchedule(rows, canon) {
  const where = "SMB-27";
  const c = SCHEDULE_CENSUS;
  if (rows.length !== c.rows) throw new Error(`${where}: ${rows.length} shifts, expected ${c.rows}`);
  const perPerson = CREW.map((p) => rows.filter((r) => r.person_id === p.person_id).length);
  if (perPerson.join(",") !== c.per_person.join(",")) throw new Error(`${where}: shifts per person ${perPerson}`);
  const perDate = WORK_DATES.map((d) => rows.filter((r) => r.work_date === d).length);
  if (perDate.join(",") !== c.per_date.join(",")) throw new Error(`${where}: shifts per date ${perDate}`);
  const perJob = [1, 2, 3, 4, 5, 6].map((n) => rows.filter((r) => r.job_id === `JOB-LDB-0${n}`).length);
  if (perJob.join(",") !== c.per_job.join(",")) throw new Error(`${where}: shifts per job ${perJob}`);
  const site = rows.filter((r) => r.start_time === SITE_SHIFT.start && r.end_time === SITE_SHIFT.end).length;
  if (site !== c.site || rows.length - site !== c.short) throw new Error(`${where}: ${site} site shifts`);
  const total = rows.reduce((a, r) => a + shiftLength(r), 0);
  if (total !== c.scheduled_minutes) throw new Error(`${where}: ${hoursText(total)} scheduled hours`);

  for (const r of rows) {
    const wd = weekday(r.work_date);
    if (wd === 0 || wd === 6 || r.work_date < PAY_PERIOD.start || r.work_date > PAY_PERIOD.end) {
      throw new Error(`${where}: ${r.shift_id} on ${r.work_date}`);
    }
    if (crewById.get(r.person_id).pay_basis !== "hourly") throw new Error(`${where}: ${r.shift_id} schedules a salaried person`);
  }

  // P1 at both readings.
  const strict = overlapPairs(rows, "start_time", "end_time", "shift_id", strictOverlap);
  if (strict.length !== 1 || JSON.stringify(strict[0]) !== JSON.stringify(P1_PIN)) {
    throw new Error(`${where}: P1 under the strict test finds ${JSON.stringify(strict)}`);
  }
  const two = Object.values(tally(rows, (r) => `${r.person_id}|${r.work_date}`)).filter((n) => n >= 2).length;
  if (two !== c.person_dates_with_two) throw new Error(`${where}: ${two} person-dates with two shifts`);
  const closed = new Set(overlapPairs(rows, "start_time", "end_time", "shift_id", closedOverlap).map((p) => `${p.person_id}|${p.work_date}`));
  if (closed.size !== c.person_dates_with_two) throw new Error(`${where}: the closed reading flags ${closed.size} person-dates`);

  // Every shift on a job, role and week SMB-20 carries hours for; every SMB-20 key has a shift.
  const jobs = new Set(buildJobProgress({ canon }).map((r) => r.job_id));
  const keys = smb20PeriodKeys(canon);
  const shiftKeys = new Set();
  for (const r of rows) {
    if (!jobs.has(r.job_id)) throw new Error(`${where}: ${r.shift_id} on ${r.job_id}, not an SMB-22 job`);
    const k = `${r.job_id}|${crewById.get(r.person_id).crew_role}|${fridayOf(r.work_date)}`;
    if (!(keys.get(k) > 0)) throw new Error(`${where}: ${r.shift_id} sits on ${k}, which SMB-20 carries no hours for`);
    shiftKeys.add(k);
  }
  for (const k of keys.keys()) if (!shiftKeys.has(k)) throw new Error(`${where}: SMB-20's ${k} has no shift`);
}

// ------------------------------------------------------------------ SMB-28

export const TIMECARD_COLUMNS = [
  "timecard_id", "shift_id", "person_id", "work_date", "job_id", "clock_in", "clock_out",
  "hours_worked", "hourly_pay_rate_usd", "record_type",
];

const CLOCK_IN_OFFSETS = [0, 0, 0, 15];
const CLOCK_OUT_OFFSETS = [-15, 0, 0, 0];
/** The P1 date's two timecards, pinned: one scheduled shift's worth across the two jobs. */
const P1_CARDS = { "07:00": ["07:00", "12:00"], "12:00": ["12:30", "15:30"] };
const MISMATCH_STEP_CENTS = 125;

export const TIMECARD_CENSUS = {
  rows: 52,
  per_person: [0, 13, 9, 9, 9, 7, 5, 0, 0],
  per_job: [23, 3, 3, 2, 17, 4],
  minutes: 348 * 60 + 15,
  off_length: 28,
  distinct_rates: 7,
  per_person_hours: ["50.75", "70.75", "63.25", "70.50", "53.75", "39.25"],
  largest_week: "39.50",
  missing_eligible: 31,
  mismatch_eligible: 21,
};

/** SMB-28 P2 and P3, pinned after they are found by rule. */
export const P2_PIN = { shift_id: "SHF-LDB-30", person_id: "pe-218", work_date: "2026-03-20", job_id: "JOB-LDB-01" };
export const P3_PIN = { timecard_id: "TCD-LDB-44", person_id: "pe-221", work_date: "2026-03-19", job_id: "JOB-LDB-05", rate: "28.25" };

/** SMB-28's rows, keyed by TIMECARD_COLUMNS, with every census, P2, P3 and the SMB-20 tie asserted. */
export function buildTimecards({ canon }) {
  const where = "SMB-28";
  const shifts = buildShiftSchedule({ canon });
  const p1Person = P1_PIN.person_id;
  const p1Date = P1_PIN.work_date;

  // 1. The missing timecard is chosen first.
  const missingRng = createRng("SMB-28", "missing-timecard");
  const eligibleMissing = shifts.filter((s) => s.person_id !== p1Person && s.person_id !== PROJECT_LEAD);
  if (eligibleMissing.length !== TIMECARD_CENSUS.missing_eligible) throw new Error(`${where}: ${eligibleMissing.length} shifts eligible to go missing`);
  const missing = missingRng.pick(eligibleMissing);

  // 2. Clock times, two draws per shift in shift_id order, always.
  const clockRng = createRng("SMB-28", "clock");
  const cards = [];
  for (const s of shifts) {
    const dIn = clockRng.pick(CLOCK_IN_OFFSETS);
    const dOut = clockRng.pick(CLOCK_OUT_OFFSETS);
    if (s === missing) continue;
    let clockIn;
    let clockOut;
    if (s.person_id === p1Person && s.work_date === p1Date) {
      const pinned = P1_CARDS[s.start_time];
      if (!pinned) throw new Error(`${where}: ${s.shift_id} on the P1 date starts at ${s.start_time}`);
      [clockIn, clockOut] = pinned.map(minutesOf);
    } else {
      const same = shifts.filter((x) => x !== s && x.person_id === s.person_id && x.work_date === s.work_date);
      const sharedStart = same.some((x) => x.end_time === s.start_time);
      const sharedEnd = same.some((x) => x.start_time === s.end_time);
      clockIn = minutesOf(s.start_time) + (sharedStart ? 0 : dIn);
      clockOut = minutesOf(s.end_time) + (sharedEnd ? 0 : dOut);
    }
    cards.push({
      shift_id: s.shift_id, person_id: s.person_id, work_date: s.work_date, job_id: s.job_id,
      clock_in: hhmm(clockIn), clock_out: hhmm(clockOut), minutes: clockOut - clockIn,
      rate_cents: crewById.get(s.person_id).rate_cents,
    });
  }

  // 3. Order and ids: roster order, then date, then clock in.
  cards.sort((a, b) => rosterPos.get(a.person_id) - rosterPos.get(b.person_id)
    || (a.work_date < b.work_date ? -1 : a.work_date > b.work_date ? 1 : 0)
    || minutesOf(a.clock_in) - minutesOf(b.clock_in));
  cards.forEach((c, i) => { c.timecard_id = `TCD-LDB-${pad2(i + 1)}`; });

  // 4. The rate mismatch is chosen last.
  const mismatchRng = createRng("SMB-28", "rate-mismatch");
  const eligibleMismatch = cards.filter((c) => ![p1Person, missing.person_id, PROJECT_LEAD].includes(c.person_id));
  if (eligibleMismatch.length !== TIMECARD_CENSUS.mismatch_eligible) throw new Error(`${where}: ${eligibleMismatch.length} timecards eligible for the mismatch`);
  const mismatch = mismatchRng.pick(eligibleMismatch);
  mismatch.rate_cents -= MISMATCH_STEP_CENTS;

  const rows = cards.map((c) => ({
    timecard_id: c.timecard_id, shift_id: c.shift_id, person_id: c.person_id, work_date: c.work_date, job_id: c.job_id,
    clock_in: c.clock_in, clock_out: c.clock_out, hours_worked: hoursText(c.minutes),
    hourly_pay_rate_usd: usd(c.rate_cents), record_type: "mock",
  }));
  assertTimecards(rows, shifts, canon);
  return rows;
}

function assertTimecards(rows, shifts, canon) {
  const where = "SMB-28";
  const c = TIMECARD_CENSUS;
  const shiftById = new Map(shifts.map((s) => [s.shift_id, s]));
  const len = (r) => minutesOf(r.clock_out) - minutesOf(r.clock_in);
  if (rows.length !== c.rows) throw new Error(`${where}: ${rows.length} timecards, expected ${c.rows}`);
  const perPerson = CREW.map((p) => rows.filter((r) => r.person_id === p.person_id).length);
  if (perPerson.join(",") !== c.per_person.join(",")) throw new Error(`${where}: timecards per person ${perPerson}`);
  const perJob = [1, 2, 3, 4, 5, 6].map((n) => rows.filter((r) => r.job_id === `JOB-LDB-0${n}`).length);
  if (perJob.join(",") !== c.per_job.join(",")) throw new Error(`${where}: timecards per job ${perJob}`);
  const total = rows.reduce((a, r) => a + len(r), 0);
  if (total !== c.minutes) throw new Error(`${where}: ${hoursText(total)} timecard hours`);
  const offLength = rows.filter((r) => len(r) !== shiftLength(shiftById.get(r.shift_id))).length;
  if (offLength !== c.off_length) throw new Error(`${where}: ${offLength} timecards off their shift's length`);
  if (new Set(rows.map((r) => r.hourly_pay_rate_usd)).size !== c.distinct_rates) throw new Error(`${where}: distinct rates`);

  const seen = new Set();
  for (const r of rows) {
    const s = shiftById.get(r.shift_id);
    if (!s) throw new Error(`${where}: ${r.timecard_id} names no shift`);
    if (seen.has(r.shift_id)) throw new Error(`${where}: ${r.shift_id} carries two timecards`);
    seen.add(r.shift_id);
    for (const k of ["person_id", "work_date", "job_id"]) if (r[k] !== s[k]) throw new Error(`${where}: ${r.timecard_id} ${k}`);
    if (minutesOf(r.clock_in) >= minutesOf(r.clock_out)) throw new Error(`${where}: ${r.timecard_id} clocks out before it clocks in`);
    if (minutesOf(r.clock_in) < minutesOf(s.start_time) || minutesOf(r.clock_out) > minutesOf(s.end_time)) {
      throw new Error(`${where}: ${r.timecard_id} sits outside ${s.shift_id}`);
    }
    if (r.hours_worked !== hoursText(len(r))) throw new Error(`${where}: ${r.timecard_id} hours_worked`);
  }
  if (overlapPairs(rows, "clock_in", "clock_out", "timecard_id", strictOverlap).length !== 0) {
    throw new Error(`${where}: two timecards of one person overlap`);
  }

  // P2 at both readings.
  const missing = shifts.filter((s) => !seen.has(s.shift_id));
  if (missing.length !== 1 || ["shift_id", "person_id", "work_date", "job_id"].some((k) => missing[0][k] !== P2_PIN[k])) {
    throw new Error(`${where}: P2 finds ${JSON.stringify(missing.map((s) => s.shift_id))}`);
  }
  const noCard = CREW.filter((p) => !rows.some((r) => r.person_id === p.person_id)).map((p) => p.person_id);
  if (noCard.join(",") !== "pe-216,pe-223,pe-224") throw new Error(`${where}: roster people with no timecard ${noCard}`);
  if (noCard.some((p) => shifts.some((s) => s.person_id === p))) throw new Error(`${where}: a person with no timecard is scheduled`);

  // P3 at both readings.
  const off = rows.filter((r) => toCents(r.hourly_pay_rate_usd) !== crewById.get(r.person_id).rate_cents);
  if (off.length !== 1 || off[0].timecard_id !== P3_PIN.timecard_id || off[0].person_id !== P3_PIN.person_id
    || off[0].work_date !== P3_PIN.work_date || off[0].job_id !== P3_PIN.job_id || off[0].hourly_pay_rate_usd !== P3_PIN.rate) {
    throw new Error(`${where}: P3 finds ${JSON.stringify(off)}`);
  }
  const offCents = toCents(off[0].hourly_pay_rate_usd);
  if (CREW.some((p) => p.rate_cents === offCents) || Object.values(COST_RATE_CENTS).includes(offCents)) {
    throw new Error(`${where}: the differing rate equals a roster or SMB-20 rate`);
  }
  if (rows.some((r) => toCents(r.hourly_pay_rate_usd) === COST_RATE_CENTS[crewById.get(r.person_id).crew_role])) {
    throw new Error(`${where}: a timecard carries its role's SMB-20 cost rate`);
  }

  // The three plants on three different people, none the project lead.
  const three = [P1_PIN.person_id, missing[0].person_id, off[0].person_id];
  if (new Set(three).size !== 3 || three.includes(PROJECT_LEAD)) throw new Error(`${where}: the plants sit on ${three}`);

  // Hours per person from the timecards; no week above forty.
  const scheduled = CREW.filter((p) => shifts.some((s) => s.person_id === p.person_id)).map((p) => p.person_id);
  const perPersonHours = scheduled.map((p) => hoursText(rows.filter((r) => r.person_id === p).reduce((a, r) => a + len(r), 0)));
  if (perPersonHours.join(",") !== c.per_person_hours.join(",")) throw new Error(`${where}: per-person hours ${perPersonHours}`);
  const weeks = {};
  for (const r of rows) weeks[`${r.person_id}|${mondayOf(r.work_date)}`] = (weeks[`${r.person_id}|${mondayOf(r.work_date)}`] ?? 0) + len(r);
  const largest = Math.max(...Object.values(weeks));
  if (largest > 40 * 60 || hoursText(largest) !== c.largest_week) throw new Error(`${where}: the largest week is ${hoursText(largest)}`);
  for (const r of rows) if (len(r) > shiftLength(shiftById.get(r.shift_id))) throw new Error(`${where}: ${r.timecard_id} runs longer than its shift`);

  // The SMB-20 bounded key-set tie.
  const keys = smb20PeriodKeys(canon);
  const used = new Map();
  for (const r of rows) {
    const k = `${r.job_id}|${crewById.get(r.person_id).crew_role}|${fridayOf(r.work_date)}`;
    used.set(k, (used.get(k) ?? 0) + len(r));
  }
  if (used.size !== keys.size) throw new Error(`${where}: the timecards touch ${used.size} keys and SMB-20 carries ${keys.size}`);
  for (const [k, m] of used) {
    if (!keys.has(k)) throw new Error(`${where}: ${k} is not an SMB-20 key`);
    if (m >= keys.get(k)) throw new Error(`${where}: ${k} clocks ${hoursText(m)} against ${hoursText(keys.get(k))} costed`);
  }
}

// ------------------------------------------------------------------ SMB-29

export const CHECKLIST_COLUMNS = [
  "check_id", "check", "source_files", "columns_read", "rule", "blocking", "on_fail",
  "owner_role", "escalation_role", "policy_control_id", "evidence_required",
];

export const ON_FAIL = ["withhold_readiness", "escalate", "flag"];

const ROSTER_FILE = "crew-roster-mock.csv";
const SCHEDULE_FILE = "shift-schedule-mock.csv";
const TIMECARD_FILE = "timecards-mock.csv";
const FILE_COLUMNS = { [ROSTER_FILE]: ROSTER_COLUMNS, [SCHEDULE_FILE]: SCHEDULE_COLUMNS, [TIMECARD_FILE]: TIMECARD_COLUMNS };

// [check, files, columns_read, rule, blocking, on_fail, cites DA-LDB-27, evidence_required]
const CHECKS = [
  ["Every scheduled or clocked person is on the roster", [ROSTER_FILE, SCHEDULE_FILE, TIMECARD_FILE], ["person_id"],
    "every person id on a shift or a timecard matches exactly one roster row",
    "yes", "withhold_readiness", false,
    "the shift and timecard rows whose person id matches no roster row, listed by id"],
  ["Every timecard belongs to one scheduled shift", [SCHEDULE_FILE, TIMECARD_FILE], ["shift_id", "person_id", "work_date", "job_id"],
    "every timecard's shift id matches one shift with the same person, date and job",
    "yes", "withhold_readiness", false,
    "the timecard rows whose shift id matches no shift, or whose person, date or job differs from that shift's"],
  ["Every scheduled shift has a timecard", [SCHEDULE_FILE, TIMECARD_FILE], ["shift_id"],
    "every shift on the schedule appears on exactly one timecard; only a scheduled shift is owed one, so a roster row with no shift is not a gap",
    "yes", "withhold_readiness", false,
    "the shift rows with no timecard, listed by shift id, and each person's hours summed from the timecards alone"],
  ["Only hourly people carry timecards", [ROSTER_FILE, TIMECARD_FILE], ["person_id", "pay_basis", "hourly_pay_rate_usd"],
    "every timecard's person is hourly on the roster; a salaried row carries no rate and no timecard",
    "yes", "withhold_readiness", false,
    "the timecard rows whose person is salaried on the roster, and any salaried roster row that carries a rate"],
  ["Every timecard rate matches the roster", [ROSTER_FILE, TIMECARD_FILE], ["person_id", "hourly_pay_rate_usd"],
    "every timecard's rate equals the roster rate for the same person, compared in cents; a difference goes to a person, and neither rate is changed to make them agree",
    "yes", "escalate", true,
    "the timecard row and the roster row side by side with both rates as written, and the project lead's decision on which one stands"],
  ["No person's timecards overlap", [TIMECARD_FILE], ["person_id", "work_date", "clock_in", "clock_out"],
    "no two timecards of one person on one date overlap in time; one that ends as the next begins does not overlap",
    "yes", "withhold_readiness", false,
    "each pair of timecard rows that overlap, with their clock in and clock out times"],
  ["No person is double booked on the schedule", [SCHEDULE_FILE], ["person_id", "work_date", "start_time", "end_time"],
    "no two shifts of one person on one date overlap in time, the same strict test; hours are read from the timecards, so a double booking is carried to the project lead and does not hold readiness",
    "no", "flag", false,
    "each pair of shift rows that overlap, with their start and end times and the jobs they were booked to"],
  ["Hours are read from the timecards", [TIMECARD_FILE], ["clock_in", "clock_out", "hours_worked"],
    "every hours value equals clock out less clock in, and a person's hours are the sum of their timecards and never of their scheduled shifts",
    "yes", "withhold_readiness", false,
    "the timecard rows whose hours differ from clock out less clock in, and each person's hours summed from the timecards"],
  ["Readiness is a gate and not a pay run", [ROSTER_FILE, TIMECARD_FILE], ["hourly_pay_rate_usd", "hours_worked"],
    "the check computes no gross pay and writes no pay figure; crew pay figures are prepared from the timecards only with the project lead's approval, and the decision matrix never lets AI send a payment to a crew member",
    "yes", "withhold_readiness", true,
    "the readiness result with no pay figure in it, and the project lead's approval before any crew pay figure leaves the studio's own tools"],
];

export const CHECKLIST_CENSUS = {
  rows: 9,
  blocking: { yes: 8, no: 1 },
  on_fail: { withhold_readiness: 7, escalate: 1, flag: 1 },
  cites_policy: 2,
};

/** The vocabulary contract of section 2.3, and R-NOSTATUTE's terms, as one screen over SMB-29's cells. */
const BANNED_IN_CHECKLIST = [
  /\btime card/i, /\bpay card/i, /\bpunch card/i, /\bcard\b/i, /\bdirect deposit/i, /\brouting\b/i,
  /\bauthorization\b/i, /\bapprove\b/i, /overtime/i, /minimum wage/i, /\bexempt/i, /\bFLSA\b/i, /consequential/i,
  /colorado/i, /\bSB\b/, /\bAct\b/, /\bstatute/i, /\blaw\b/i, /\bregulat/i, /\bjurisdiction/i, /lead carpenter/,
];

/** SMB-29's rows, keyed by CHECKLIST_COLUMNS, with every census and cell rule asserted. */
export function buildReadinessChecklist({ canon }) {
  const where = "SMB-29";
  const da27 = readDa27(canon);
  const rows = CHECKS.map(([check, files, cols, rule, blocking, onFail, cites, evidence], i) => ({
    check_id: `PRC-LDB-${pad2(i + 1)}`,
    check,
    source_files: files.join("; "),
    columns_read: cols.join("; "),
    rule,
    blocking,
    on_fail: onFail,
    owner_role: da27.approver_role,
    escalation_role: da27.escalation_role,
    policy_control_id: cites ? da27.control_id : "",
    evidence_required: evidence,
  }));

  const c = CHECKLIST_CENSUS;
  if (rows.length !== c.rows) throw new Error(`${where}: ${rows.length} checks`);
  if (!sameTally(tally(rows, (r) => r.blocking), c.blocking)) throw new Error(`${where}: the blocking census`);
  if (!sameTally(tally(rows, (r) => r.on_fail), c.on_fail)) throw new Error(`${where}: the on_fail census`);
  if (rows.filter((r) => r.policy_control_id !== "").length !== c.cites_policy) throw new Error(`${where}: policy citations`);
  for (const r of rows) {
    const at = `${where}: ${r.check_id}`;
    if (!ON_FAIL.includes(r.on_fail)) throw new Error(`${at} on_fail ${r.on_fail}`);
    if ((r.blocking === "no") !== (r.on_fail === "flag")) throw new Error(`${at} blocking and on_fail disagree`);
    const files = r.source_files.split("; ");
    for (const col of r.columns_read.split("; ")) {
      if (!files.some((f) => FILE_COLUMNS[f]?.includes(col))) throw new Error(`${at} reads ${col}, which none of its files carries`);
    }
    for (const col of ["check", "rule", "evidence_required"]) {
      const cell = r[col];
      if (/\d/.test(cell)) throw new Error(`${at} ${col} carries a digit`);
      const caps = cell.split(/[^A-Za-z']+/).filter(Boolean).slice(1).filter((w) => /^[A-Z]/.test(w) && w !== "AI");
      if (caps.length > 0) throw new Error(`${at} ${col} capitalizes ${caps.join(", ")}`);
      for (const p of BANNED_IN_CHECKLIST) if (p.test(cell)) throw new Error(`${at} ${col} breaks the vocabulary contract with ${p}`);
    }
    if (!/^[a-z]/.test(r.rule) || !/^[a-z]/.test(r.evidence_required)) throw new Error(`${at} a clause is not lowercase`);
  }
  return rows;
}

// ------------------------------------------------------------------ R-GATE

/**
 * Every hours value times every rate, and every timecard's and person's implied
 * gross, in cents: figures that must appear in no cell of the four files.
 */
export function assertNoPayFigure({ canon }) {
  const roster = buildCrewRoster();
  const schedule = buildShiftSchedule({ canon });
  const cards = buildTimecards({ canon });
  const checklist = buildReadinessChecklist({ canon });
  const minutesOfHours = (h) => Math.round(Number(h) * 60);
  const hours = [...new Set(cards.map((r) => minutesOfHours(r.hours_worked)))];
  const rates = [...new Set([...roster.filter((r) => r.hourly_pay_rate_usd).map((r) => r.hourly_pay_rate_usd), ...cards.map((r) => r.hourly_pay_rate_usd)])]
    .map(toCents);
  // A quarter hour at a rate that is not a multiple of four cents is a half
  // cent; such a figure is forbidden rounded either way. Figures are carried
  // as integer sixtieths of a cent (minutes times cents) until then.
  const forbiddenRaw = new Set();
  for (const h of hours) for (const r of rates) forbiddenRaw.add(h * r);
  const perPerson = new Map();
  for (const r of cards) {
    const g = minutesOfHours(r.hours_worked) * toCents(r.hourly_pay_rate_usd);
    forbiddenRaw.add(g);
    perPerson.set(r.person_id, (perPerson.get(r.person_id) ?? 0) + g);
  }
  for (const g of perPerson.values()) forbiddenRaw.add(g);
  const forbidden = new Set([...forbiddenRaw].flatMap((raw) => [Math.floor(raw / 60), Math.ceil(raw / 60)]));
  const texts = new Set([...forbidden].flatMap((g) => (g % 100 === 0 ? [usd(g), String(g / 100)] : [usd(g)])));
  const payWords = ["gross", "net", "wages", "earnings", "amount", "total"];
  for (const [file, cols, rows] of [
    ["SMB-26", ROSTER_COLUMNS, roster], ["SMB-27", SCHEDULE_COLUMNS, schedule],
    ["SMB-28", TIMECARD_COLUMNS, cards], ["SMB-29", CHECKLIST_COLUMNS, checklist],
  ]) {
    for (const col of cols) {
      if (col.split("_").some((t) => payWords.includes(t)) || col.includes("pay_total")) throw new Error(`${file}: ${col} is a pay amount column`);
    }
    for (const r of rows) {
      for (const [col, v] of Object.entries(r)) if (texts.has(v)) throw new Error(`${file}: ${col} "${v}" is an hours-times-rate figure`);
    }
  }
}

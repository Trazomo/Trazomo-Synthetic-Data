// SMB-26, SMB-27, SMB-28 and SMB-29: the four deterministic artifacts of the
// small-business payroll readiness wave, screened from their shipped bytes.
//
//   datasets/smb/crew-roster-mock/             the nine people, the only file that names one
//   datasets/smb/shift-schedule-mock/          53 shifts, one double booking
//   datasets/smb/timecards-mock/               52 timecards, one missing, one rate off the roster
//   datasets/smb/payroll-readiness-checklist/  the nine checks the run is measured against
//
// Tie-outs T-P1 to T-P10, T-Q1 to T-Q8, T-R1 to T-R9, T-S1 to T-S8 and T-X1 to
// T-X12 of the cluster 5 data plan (sections 2 and 4), each named below by its
// plan id.
//
// Nothing here imports a builder, a builder's predicate, a builder's census
// constant or a builder's vocabulary list. The minutes arithmetic, the strict
// and the closed overlap tests, the weekday rule, the Friday week key, the
// cents conversion and the nine SMB-29 rules are written again in this file
// from the plan's text, so the generator and its screen can genuinely
// disagree. The upstream facts (SMB-20's roles, rates and pay-period hours,
// SMB-22's jobs, SMB-33's DA-LDB-27) are read out of their emitted bytes. The
// one sanctioned exception is T-P6, which re-derives the crew-name draw from
// the pack's exported name helpers (availableSurnames, assertNoCanonEcho,
// inquirySurnames, generatedHouseholdNames, januarySurnames, drawUniqueNames,
// createRng, buildRoster) and asserts the builder's nine equal it.
//
// Every plant is found BY RULE first, and only then are the found ids pinned
// against the plan's section 2 (C3 adjudication C), so a drift in any list
// order goes red with a message naming the rule and the id it found.
//
// Written RED first: every test below ran against a spec with no generator
// registered and no shipped bytes, and failed, before a line of the builder
// existed.
//
// Four mechanical rules, carried from the cluster 3 and 4 screens.
//
//   The census rule. Every count is an equality, never a floor.
//
//   The plant rule. Every plant is asserted at both readings: the count under
//   the stated rule and the count with the one named qualifier dropped. P1 is
//   1 and 6, P2 is 1 and 3 (and 28), P3 is 1 and 52.
//
//   The units rule. Money is integer cents and time is integer minutes, both
//   by string surgery that refuses anything the pack could never emit.
//
//   The shipped-bytes rule. The four files are read from the tree as they
//   ship, and a separate test per file proves the generator still emits them
//   byte for byte, twice.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { PROGRAM_GENERATOR_IDS } from "../../datagen/src/generators/index.js";
import { createRng } from "../../datagen/src/seed.js";
import { drawUniqueNames } from "../../datagen/src/namePool.js";
import { availableSurnames, assertNoCanonEcho } from "../../datagen/src/generators/smb-03-inbound-inquiry-queue.js";
import { inquirySurnames, generatedHouseholdNames } from "../../datagen/src/generators/smb-c3-receivables.js";
import { januarySurnames } from "../../datagen/src/generators/smb-23-completed-projects-log.js";
import { buildRoster } from "../../datagen/src/generators/core-04-people-roster.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";
import { MOCK_VOCABULARY } from "../helpers/smb-mock-vocabulary.js";
import { restrictedItems } from "../helpers/smb-restricted-values.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
const PEOPLE_PATH = join(REPO_ROOT, "canon", "people.md");

const C5_IDS = ["SMB-26", "SMB-27", "SMB-28", "SMB-29"];

// ------------------------------------------------------------------ the tree

const memo = (fn) => {
  let held;
  let done = false;
  return () => {
    if (!done) { held = fn(); done = true; }
    return held;
  };
};

const fileName = (id) => `${specs.byId.get(id).name}.csv`;
const shippedPath = (id) => join(REPO_ROOT, "datasets", "smb", specs.byId.get(id).name, fileName(id));
const shipped = (id) => readFileSync(shippedPath(id), "utf8");

const roster = memo(() => csvTable(shipped("SMB-26")));
const schedule = memo(() => csvTable(shipped("SMB-27")));
const cards = memo(() => csvTable(shipped("SMB-28")));
const checklist = memo(() => csvTable(shipped("SMB-29")));

/** An upstream file, as its generator emits it now. */
const emitted = (id) => fileByPath(generateArtifact(specs.byId.get(id), canon), fileName(id)).content;
const timeEntries = memo(() => csvTable(emitted("SMB-20")));
const jobProgress = memo(() => csvTable(emitted("SMB-22")));
const matrix = memo(() => csvTable(emitted("SMB-33")));

// ------------------------------------------------------ second implementations

/** A 2dp money string to integer cents, by string surgery. */
function toCents(value) {
  const m = /^(\d+)\.(\d{2})$/.exec(value);
  assert.ok(m, `"${value}" is not a 2dp money string`);
  return Number(m[1]) * 100 + Number(m[2]);
}
const centsText = (c) => `${Math.floor(c / 100)}.${String(c % 100).padStart(2, "0")}`;

/** HH:MM to integer minutes after midnight. */
function toMinutes(value) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  assert.ok(m, `"${value}" is not an HH:MM time`);
  return Number(m[1]) * 60 + Number(m[2]);
}

/** A 2dp hours string on the quarter hour to integer minutes. */
function hoursToMinutes(value) {
  const m = /^(\d+)\.(00|25|50|75)$/.exec(value);
  assert.ok(m, `"${value}" is not a 2dp hours value on the quarter hour`);
  return Number(m[1]) * 60 + { "00": 0, 25: 15, 50: 30, 75: 45 }[m[2]];
}
const minutesText = (mins) => `${Math.floor(mins / 60)}.${String(Math.round(((mins % 60) / 60) * 100)).padStart(2, "0")}`;

/** Day of week through the platform calendar, 0 Sunday to 6 Saturday: not dates.js's epoch arithmetic. */
function dayOfWeek(iso) {
  const [y, mo, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
}
function plusDays(iso, n) {
  const [y, mo, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d + n)).toISOString().slice(0, 10);
}
/** The Friday that ends the working week a weekday falls in: SMB-20's week key. */
const fridayOf = (iso) => plusDays(iso, 5 - dayOfWeek(iso));
/** The Monday that starts the pay week a date falls in. */
const mondayOf = (iso) => plusDays(iso, -((dayOfWeek(iso) + 6) % 7));

const PERIOD_START = "2026-03-16";
const PERIOD_END = "2026-03-29";
const inPeriod = (iso) => iso >= PERIOD_START && iso <= PERIOD_END;

/** Strict overlap: touching end to start is not an overlap. */
const overlapsStrict = (a0, a1, b0, b1) => a0 < b1 && b0 < a1;
/** The closed reading: an interval that ends as the next begins counts. */
const overlapsClosed = (a0, a1, b0, b1) => a0 <= b1 && b0 <= a1;

const count = (rows, predicate) => rows.filter(predicate).length;
const tallyBy = (rows, keyFn) => {
  const out = new Map();
  for (const r of rows) out.set(keyFn(r), (out.get(keyFn(r)) ?? 0) + 1);
  return out;
};
const pad = (n) => String(n).padStart(2, "0");
const setMinus = (a, b) => [...a].filter((x) => !b.has(x));

/** Pairs of rows of one person on one date whose intervals meet the given test. */
function pairsWhere(rows, startCol, endCol, idCol, meets) {
  const out = [];
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const a = rows[i];
      const b = rows[j];
      if (a.person_id !== b.person_id || a.work_date !== b.work_date) continue;
      if (meets(toMinutes(a[startCol]), toMinutes(a[endCol]), toMinutes(b[startCol]), toMinutes(b[endCol]))) {
        out.push({ ids: [a[idCol], b[idCol]], person_id: a.person_id, work_date: a.work_date });
      }
    }
  }
  return out;
}

/** The pack's R-MOCK deny-list as a word set check, extended with payroll-provider names. */
const PAYROLL_PROVIDERS = [
  "gusto", "adp", "paychex", "quickbooks", "rippling", "homebase", "paylocity", "paycom", "justworks", "onpay", "deel",
];
function mockHits(text) {
  const words = new Set(text.toLowerCase().split(/[^a-z0-9]+/));
  return [...MOCK_VOCABULARY, ...PAYROLL_PROVIDERS].filter((term) => words.has(term));
}
/** The C5 vocabulary contract (section 2.3): timecard is one word and these never appear. */
const VOCABULARY_BANS = [
  /\btime card/i, /\bpay card/i, /\bpunch card/i, /\bdirect deposit/i, /\brouting\b/i, /\bauthorization\b/i,
  /\bapprove\b/i, /\bcard\b/i,
];
const vocabularyHits = (text) => VOCABULARY_BANS.filter((p) => p.test(text)).map(String);

/** Rule R-NOSTATUTE: the C4 pattern set plus the C5 terms. */
const STATUTE_PATTERNS = [
  /\bBPC\b/, /\bCal\./, /U\.S\.C/, /\bCFR\b/, /\bFTC\b/, /\bAct\b/, /\bSB /, /\bAB /,
  /section 17941/i, new RegExp(String.fromCharCode(0xa7)),
  /SB 26/, /colorado/i, /overtime/i, /minimum wage/i, /\bexempt/i, /\bFLSA\b/i, /consequential/i,
  /\bstatute/i, /\bregulat/i, /\bjurisdiction/i, /\blaw\b(?! appears)/i,
];
const statuteHits = (text) => STATUTE_PATTERNS.filter((p) => p.test(text)).map(String);

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

// -------------------------------------------------------- derived views

const rosterById = () => new Map(roster().rows.map((r) => [r.person_id, r]));
const rosterOrder = () => new Map(roster().rows.map((r, i) => [r.person_id, i]));
const shiftById = () => new Map(schedule().rows.map((s) => [s.shift_id, s]));
const shiftMinutes = (s) => toMinutes(s.end_time) - toMinutes(s.start_time);
const cardMinutes = (c) => toMinutes(c.clock_out) - toMinutes(c.clock_in);

/** SMB-20's seniority ladder, derived from SMB-33's rows: escalation is strictly senior to approval. */
function ladderFromMatrix() {
  const rows = matrix().rows;
  const roles = [...new Set(rows.flatMap((r) => [r.approver_role, r.escalation_role]))];
  const juniorTo = new Map(roles.map((r) => [r, new Set()]));
  for (const r of rows) juniorTo.get(r.approver_role).add(r.escalation_role);
  // Most junior first: sort by how many roles sit above, descending.
  const above = (role) => {
    const seen = new Set();
    const stack = [...juniorTo.get(role)];
    while (stack.length) {
      const x = stack.pop();
      if (seen.has(x)) continue;
      seen.add(x);
      stack.push(...juniorTo.get(x));
    }
    return seen.size;
  };
  return roles.sort((a, b) => above(b) - above(a));
}

/** SMB-20's cost rate per crew_role, in cents, asserted constant per role. */
function costRates() {
  const out = new Map();
  for (const r of timeEntries().rows) {
    const c = toCents(r.cost_rate_usd);
    if (out.has(r.crew_role)) assert.equal(out.get(r.crew_role), c, `SMB-20's ${r.crew_role} rate is not constant`);
    out.set(r.crew_role, c);
  }
  return out;
}

/** SMB-20's pay-period keys (job|crew_role|week_ending) with hours summed over scope, in minutes. */
function smb20PeriodKeys() {
  const out = new Map();
  for (const r of timeEntries().rows) {
    if (!inPeriod(r.week_ending)) continue;
    const k = `${r.job_id}|${r.crew_role}|${r.week_ending}`;
    assert.match(r.hours, /^\d+$/, `SMB-20 ${r.entry_id} hours "${r.hours}" is not whole`);
    out.set(k, (out.get(k) ?? 0) + Number(r.hours) * 60);
  }
  return out;
}
const keyOf = (row) => `${row.job_id}|${rosterById().get(row.person_id).crew_role}|${fridayOf(row.work_date)}`;

// ============================================================= the plan's pins

/** The nine names, ids and titles of section 2.1, pinned. */
const CREW_PIN = [
  ["pe-216", "Corwin", "Nightshade", "owner", "design", "salaried", ""],
  ["pe-217", "Honora", "Oakhurst", "project lead", "project_management", "hourly", "42.00"],
  ["pe-218", "Ewald", "Vantree", "lead carpenter", "carpentry", "hourly", "38.00"],
  ["pe-219", "Gideon", "Ashby", "carpenter", "carpentry", "hourly", "32.50"],
  ["pe-220", "Wrenna", "Holloway", "carpenter", "carpentry", "hourly", "31.00"],
  ["pe-221", "Faro", "Moorfield", "carpenter", "carpentry", "hourly", "29.50"],
  ["pe-222", "Fenwick", "Loxley", "painter", "paint", "hourly", "28.00"],
  ["pe-223", "Isolde", "Jarrow", "plumber", "plumbing", "hourly", "39.00"],
  ["pe-224", "Yara", "Fairweather", "labourer", "demolition", "hourly", "25.00"],
];
const fullNames = () => roster().rows.map((r) => `${r.first_name} ${r.last_name}`);

/** Section 2.1 to 2.4's column lists and planted_features prose, pinned verbatim (T-X11). */
const COLUMNS_PIN = {
  "SMB-26": ["person_id", "first_name", "last_name", "role_title", "crew_role", "pay_basis", "hourly_pay_rate_usd", "record_type"],
  "SMB-27": ["shift_id", "person_id", "work_date", "job_id", "start_time", "end_time", "record_type"],
  "SMB-28": [
    "timecard_id", "shift_id", "person_id", "work_date", "job_id", "clock_in", "clock_out",
    "hours_worked", "hourly_pay_rate_usd", "record_type",
  ],
  "SMB-29": [
    "check_id", "check", "source_files", "columns_read", "rule", "blocking", "on_fail",
    "owner_role", "escalation_role", "policy_control_id", "evidence_required",
  ],
};
const FEATURES_PIN = {
  "SMB-26": [
    "nine people, the whole of co-100's studio staff, pe-216 to pe-224 in roster order: the owner, the project lead, the lead carpenter, three carpenters, a painter, a plumber and a labourer. No real names, no SSNs and no real wage data: the names are drawn from the pack's shared name pool under this artifact's own seed and screened against canon company words, every household surname the small-business pack emits and every name canon/people.md records, and this is the only file in the pack that carries a crew member's name; the schedule and the timecards join to it by person_id, and every person_id is a canon person id seated by ruling R5",
    "role_title carries the owner decision authority matrix's three role words, owner, project lead and lead carpenter, one person each, and crew_role maps every person onto one of the time record's six cost centres, the lead carpenter and the three carpenters onto carpentry",
    "hourly_pay_rate_usd is a synthetic wage on each of the eight hourly rows and is empty on the one salaried row, the owner's: every wage is below the time record's cost rate for the person's crew_role and equals none of those six rates, because the cost rate is what an hour of a role cost the studio and the wage is what the studio pays the person",
    "crew pay data is restricted under DA-LDB-27 and the data-handling checklist, and no tax identifier, bank detail, address, contact detail or date of birth is a column",
  ],
  "SMB-27": [
    "53 scheduled shifts, SHF-LDB-01 upward in date, start time, roster and job order, for the six of the nine people the time record has work for in the pay period 2026-03-16 to 2026-03-29: site shifts from 07:00 to 15:00 and the project lead's visits from 08:00 to 12:00 and from 12:00 to 16:00, on the period's ten weekdays and on no weekend day",
    "every shift is on a job the time record carries hours for, for that person's crew_role, in that week, and every job, role and week the time record carries in the pay period has a shift",
    "1 double-booked shift: exactly one person is scheduled on two shifts that overlap in time on one date, and no other person's shifts overlap; the project lead has two back-to-back visits on five dates, each ending as the next begins, which is not an overlap",
    "three people on the roster have no shift in the period, because the time record carries no design, demolition or plumbing hours in either week",
  ],
  "SMB-28": [
    "52 timecards, TCD-LDB-01 upward in roster, date and clock-in order, each carrying the shift_id it was clocked against and that shift's person, date and job; clock times sit on the quarter hour, hours_worked is clock_out less clock_in, no timecard runs longer than its shift and no person's hours in either week exceed forty",
    "1 missing timecard entry blocking payroll readiness: exactly one scheduled shift has no timecard, so hours recomputed from the timecards show the gap where hours read from the schedule would hide it; the three roster people with no shift have no timecard and are not a gap",
    "1 pay-rate mismatch vs the roster (escalate, never auto-correct): exactly one timecard carries an hourly rate that differs from the roster rate for the same person and every other timecard matches; the differing rate equals no roster rate and none of the time record's cost rates",
    "the double booking, the missing timecard and the rate mismatch fall on three different people, none of them the project lead, whose approval DA-LDB-27 requires before crew pay figures leave the studio's own tools",
    "gross pay is computed nowhere: no column carries a pay amount and no cell equals any hours value times any rate. For every job, crew_role and week in the pay period the timecards' hours are at or under the time record's role total, and the two files carry the same job, role and week keys",
  ],
  "SMB-29": [
    "no defects; this is the payroll readiness checklist the run is measured against, nine checks PRC-LDB-01 upward, each naming the files and the columns it reads, whether it blocks readiness and what happens when it fails: readiness is withheld, the finding is escalated to a person, or the finding is flagged and readiness does not wait on it",
    "one check per planted finding in the roster, schedule and timecards: a scheduled shift with no timecard withholds readiness, a timecard rate that differs from the roster escalates to a person and is never corrected, and a person double booked on the schedule is flagged, because hours are read from the timecards; the other six checks pass on the shipped files",
    "roles only, from the owner decision authority matrix: every check is owned by the project lead and escalates to the owner, the approver and escalation DA-LDB-27 sets for preparing crew pay figures from the timecards, and the last check states that readiness computes no gross pay and writes no pay figure",
    "a template: no person, no date, no rate, no canon entity and no law appears in it",
  ],
};

/** Every C5 byte and spec sentence a pack-wide screen reads. */
const allC5Text = () => C5_IDS.map((id) => shipped(id)).join("\n");
const c5SpecProse = () => C5_IDS.flatMap((id) => specs.byId.get(id).planted_features).join("\n");

// ======================================================================= X12

test("SMB-C5 T-X12: the four ids are enrolled in PROGRAM_GENERATOR_IDS and are deterministic specs", () => {
  for (const id of C5_IDS) {
    assert.ok(PROGRAM_GENERATOR_IDS.includes(id), `${id} is not enrolled, so the determinism sweep never runs it`);
    assert.equal(specs.byId.get(id).generation, "deterministic", `${id} is not a deterministic spec`);
    assert.equal(specs.byId.get(id).format, "csv", `${id} is not a csv spec`);
  }
});

// ================================================================== SMB-26

test("SMB-C5 T-P1: SMB-26's header is spec.columns, 9 rows, pe-216 to pe-224 gapless in file order", () => {
  const { cols, rows } = roster();
  assert.deepEqual(cols, specs.byId.get("SMB-26").columns, "the header has drifted from spec.columns");
  assert.equal(rows.length, 9, `the roster holds ${rows.length} people, expected 9`);
  assert.deepEqual(rows.map((r) => r.person_id), rows.map((_, i) => `pe-${216 + i}`), "the person ids are not pe-216 upward");
});

test("SMB-C5 T-P2: SMB-26's census, every figure an equality, and the nine rows as section 2.1 pins them", () => {
  const { rows } = roster();
  const titles = Object.fromEntries(tallyBy(rows, (r) => r.role_title));
  assert.deepEqual(titles, {
    owner: 1, "project lead": 1, "lead carpenter": 1, carpenter: 3, painter: 1, plumber: 1, labourer: 1,
  }, "role_title census");
  assert.deepEqual(Object.fromEntries(tallyBy(rows, (r) => r.crew_role)), {
    design: 1, project_management: 1, carpentry: 4, paint: 1, plumbing: 1, demolition: 1,
  }, "crew_role census");
  assert.deepEqual(Object.fromEntries(tallyBy(rows, (r) => r.pay_basis)), { salaried: 1, hourly: 8 }, "pay_basis census");
  const rates = rows.filter((r) => r.hourly_pay_rate_usd !== "").map((r) => toCents(r.hourly_pay_rate_usd));
  assert.equal(new Set(rates).size, 8, "the eight hourly rates are not distinct");
  assert.deepEqual(
    rows.map((r) => [r.person_id, r.first_name, r.last_name, r.role_title, r.crew_role, r.pay_basis, r.hourly_pay_rate_usd]),
    CREW_PIN, "the roster has drifted from section 2.1's pinned rows"
  );
});

test("SMB-C5 T-P3: SMB-33's three role words each sit on exactly one row, the top three, most senior first", () => {
  const { rows } = roster();
  const ladder = ladderFromMatrix();
  assert.deepEqual(ladder, ["lead carpenter", "project lead", "owner"], "SMB-33's approver and escalation ladder is not three roles");
  for (const role of ladder) assert.equal(count(rows, (r) => r.role_title === role), 1, `${role} is not on exactly one row`);
  assert.deepEqual(rows.slice(0, 3).map((r) => r.role_title), [...ladder].reverse(), "the top three rows are not the ladder reversed");
});

test("SMB-C5 T-P4: crew_role is SMB-20's vocabulary, read off its emitted bytes, and the lead carpenter is carpentry", () => {
  const vocabulary = new Set(timeEntries().rows.map((r) => r.crew_role));
  assert.equal(vocabulary.size, 6, "SMB-20 no longer carries six crew roles");
  for (const r of roster().rows) assert.ok(vocabulary.has(r.crew_role), `${r.person_id} carries "${r.crew_role}", not an SMB-20 role`);
  assert.equal(roster().rows.find((r) => r.role_title === "lead carpenter").crew_role, "carpentry");
  assert.deepEqual(setMinus(vocabulary, new Set(roster().rows.map((r) => r.crew_role))), [], "an SMB-20 role has nobody on it");
});

test("SMB-C5 T-P5: every hourly wage is below its role's SMB-20 cost rate and equals none of the six; the salaried row is empty", () => {
  const cost = costRates();
  const six = new Set(cost.values());
  assert.equal(six.size, 6, "SMB-20 does not carry six distinct cost rates");
  for (const r of roster().rows) {
    if (r.pay_basis === "salaried") {
      assert.equal(r.hourly_pay_rate_usd, "", `${r.person_id} is salaried and carries a rate`);
      continue;
    }
    assert.equal(r.pay_basis, "hourly", `${r.person_id} pay_basis "${r.pay_basis}"`);
    assert.notEqual(r.hourly_pay_rate_usd, "", `${r.person_id} is hourly and carries no rate`);
    const c = toCents(r.hourly_pay_rate_usd);
    assert.equal(c % 50, 0, `${r.person_id}'s rate is not a whole or half dollar`);
    assert.ok(c < cost.get(r.crew_role), `${r.person_id}'s wage ${r.hourly_pay_rate_usd} is not below the ${r.crew_role} cost rate`);
    assert.ok(!six.has(c), `${r.person_id}'s wage ${r.hourly_pay_rate_usd} equals an SMB-20 cost rate`);
  }
  const byTitle = (t) => toCents(roster().rows.find((r) => r.role_title === t).hourly_pay_rate_usd);
  const carpenters = roster().rows.filter((r) => r.role_title === "carpenter").map((r) => toCents(r.hourly_pay_rate_usd));
  assert.ok(carpenters.every((c) => c < byTitle("lead carpenter")), "a carpenter earns at least the lead carpenter");
  const hourly = roster().rows.filter((r) => r.pay_basis === "hourly").map((r) => toCents(r.hourly_pay_rate_usd));
  assert.equal(Math.max(...hourly), byTitle("project lead"), "the project lead does not earn the most");
});

/** Every name canon/people.md records, less its co-100 crew rows (screen S3's parser). */
function canonPeopleTokens() {
  const NAME_HEADS = ["name", "retired name", "frozen name"];
  const lines = readFileSync(PEOPLE_PATH, "utf8").split("\n");
  const isTable = (l) => l.trim().startsWith("|");
  const cellsOf = (l) => l.split("|").slice(1, -1).map((c) => c.trim());
  const tokens = new Set();
  for (const [i, line] of lines.entries()) {
    if (!isTable(line)) continue;
    const head = cellsOf(line).map((c) => c.toLowerCase());
    const col = head.findIndex((c) => NAME_HEADS.includes(c));
    if (col < 0) continue;
    const aff = head.indexOf("affiliation");
    for (let j = i + 1; j < lines.length && isTable(lines[j]); j += 1) {
      const row = cellsOf(lines[j]);
      if (aff >= 0 && /^co-100\b/.test(row[aff] ?? "")) continue;
      const value = (row[col] ?? "").replace(/\*\*/g, "").trim();
      if (!/^[A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*)+/.test(value)) continue;
      for (const t of value.split(/[^A-Za-z]+/)) if (t.length >= 2) tokens.add(t.toLowerCase());
    }
  }
  return tokens;
}

test("SMB-C5 T-P6: the crew-name draw re-derived with screens S1 to S6 equals the nine names in file order", () => {
  const available = new Set(availableSurnames(canon));
  const households = new Set([
    ...inquirySurnames(canon),
    ...generatedHouseholdNames(canon).map((n) => /^The (\S+) household$/.exec(n)[1]),
    ...januarySurnames(canon),
    ...[...canon.values()].map((e) => /^The (\S+) household$/.exec(e.name)?.[1]).filter(Boolean),
  ]);
  assert.equal(households.size, 20, `the pack's household surnames number ${households.size}, expected 20`);
  const peopleTokens = canonPeopleTokens();
  const core04 = new Set(buildRoster(createRng("CORE-04", "roster")).map((r) => `${r.first_name} ${r.last_name}`));
  const passesEcho = (value) => {
    try { assertNoCanonEcho("crew name half", [value], canon); return true; } catch { return false; }
  };
  const draws = drawUniqueNames(createRng("SMB-26", "crew-names"), 60);
  const accepted = [];
  const usedFirst = new Set();
  const usedLast = new Set();
  for (const d of draws) {
    if (accepted.length === 9) break;
    const ok = available.has(d.lastName)
      && !households.has(d.lastName)
      && !peopleTokens.has(d.firstName.toLowerCase()) && !peopleTokens.has(d.lastName.toLowerCase())
      && passesEcho(d.firstName) && passesEcho(d.lastName)
      && !core04.has(`${d.firstName} ${d.lastName}`)
      && !usedFirst.has(d.firstName) && !usedLast.has(d.lastName);
    if (!ok) continue;
    accepted.push(`${d.firstName} ${d.lastName}`);
    usedFirst.add(d.firstName);
    usedLast.add(d.lastName);
  }
  assert.equal(accepted.length, 9, `only ${accepted.length} of the 60 draws survive the six screens`);
  assert.deepEqual(fullNames(), accepted, "the roster's names are not the screened draw in acceptance order");
});

/** Tracked and untracked-but-not-ignored files under the given paths. */
function repoFiles(paths) {
  const out = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", ...paths], {
    cwd: REPO_ROOT, encoding: "utf8",
  });
  return [...new Set(out.split("\0").filter(Boolean))];
}

test("SMB-C5 T-P7: no crew member's full name occurs anywhere but the roster, canon/people.md and the builder", () => {
  const allowed = new Set([
    `datasets/smb/${specs.byId.get("SMB-26").name}/${fileName("SMB-26")}`,
    "canon/people.md",
    "datagen/src/generators/smb-c5-payroll.js",
  ]);
  const files = repoFiles(["artifacts", "datasets", "specs", "canon", "datagen/src", "CHANGELOG.md", "datagen/README.md"]);
  assert.ok(files.length > 200, `only ${files.length} files were walked`);
  const names = fullNames();
  for (const f of files) {
    if (allowed.has(f)) continue;
    const text = readFileSync(join(REPO_ROOT, f), "latin1");
    if (text.includes("\0")) continue;
    for (const n of names) assert.ok(!text.includes(n), `${n} occurs in ${f}`);
  }
});

test("SMB-C5 T-P8: canon/people.md agrees with the roster once co-100 is seated; until then the ruled R5 gap holds", (t) => {
  const text = readFileSync(PEOPLE_PATH, "utf8");
  const lines = text.split("\n");
  const cellsOf = (l) => l.split("|").slice(1, -1).map((c) => c.trim());
  const crew = [];
  let otherCo100 = 0;
  for (const [i, line] of lines.entries()) {
    if (!line.trim().startsWith("|")) continue;
    const head = cellsOf(line).map((c) => c.toLowerCase());
    const aff = head.indexOf("affiliation");
    if (aff < 0 || head[0] !== "id") continue;
    for (let j = i + 1; j < lines.length && lines[j].trim().startsWith("|"); j += 1) {
      const row = cellsOf(lines[j]);
      if (row[aff] === "co-100 Larkspur Design & Build") {
        crew.push({ id: row[0], name: row[head.indexOf("name")], role: row[head.indexOf("role / title")], status: row[head.indexOf("status")] });
      } else if (/co-100\b/.test(row[aff] ?? "")) otherCo100 += 1;
    }
  }
  assert.equal(otherCo100, 0, "a canon row's affiliation names co-100 in some other form");
  if (crew.length === 0) {
    assert.doesNotMatch(text, /^\|\s*pe-2(1[6-9]|2[0-4])\s*\|/m, "a pe-216 to pe-224 row exists without the co-100 affiliation");
    t.diagnostic("R5 not landed: the crew is not yet seated (ruling R5, 2026-09-07)");
    return;
  }
  assert.equal(crew.length, 9, `canon seats ${crew.length} co-100 people, a partial seating`);
  const rows = roster().rows;
  assert.deepEqual(crew.map((c) => c.id), rows.map((r) => r.person_id), "canon's co-100 ids are not the roster's");
  crew.forEach((c, i) => {
    assert.equal(c.name, `${rows[i].first_name} ${rows[i].last_name}`, `${c.id}'s canon name differs from the roster`);
    assert.equal(c.role.toLowerCase(), rows[i].role_title.toLowerCase(), `${c.id}'s canon role differs from the roster`);
    assert.equal(c.status, "CANONICAL", `${c.id} is not CANONICAL`);
  });
});

test("SMB-C5 T-P9: SMB-26 is a mock with no identifier, bank, contact or birth column", () => {
  const { cols, rows } = roster();
  for (const r of rows) assert.equal(r.record_type, "mock", `${r.person_id} record_type "${r.record_type}"`);
  const banned = ["ssn", "tax", "bank", "account", "address", "phone", "email", "birth", "dob"];
  for (const c of cols) {
    const tokens = c.toLowerCase().split("_");
    for (const b of banned) assert.ok(!tokens.includes(b) && !c.toLowerCase().includes(b), `column ${c} carries "${b}"`);
  }
  assert.deepEqual(mockHits(shipped("SMB-26")), [], "SMB-26 names a processor, bank product or payroll provider");
});

/** Two runs of a generator, byte identical, and equal to the shipped file. */
function assertByteIdentity(id) {
  const first = generateArtifact(specs.byId.get(id), canon);
  const second = generateArtifact(specs.byId.get(id), canon);
  assert.deepEqual(first.map((f) => f.path), [fileName(id)], `${id} emits ${first.map((f) => f.path).join(", ")}`);
  assert.equal(second[0].content, first[0].content, `${id} is not byte identical across two runs`);
  assert.equal(first[0].content, shipped(id), `${id}: the committed file is not what the generator emits; regenerate and commit`);
}

test("SMB-C5 T-P10: SMB-26 regenerates byte for byte, twice, and equals the shipped bytes", () => assertByteIdentity("SMB-26"));

// ================================================================== SMB-27

test("SMB-C5 T-Q1: SMB-27's header is spec.columns, 53 rows, SHF-LDB-01 upward in date, start, roster and job order", () => {
  const { cols, rows } = schedule();
  assert.deepEqual(cols, specs.byId.get("SMB-27").columns, "the header has drifted from spec.columns");
  assert.equal(rows.length, 53, `the schedule holds ${rows.length} shifts, expected 53`);
  assert.deepEqual(rows.map((r) => r.shift_id), rows.map((_, i) => `SHF-LDB-${pad(i + 1)}`), "shift ids are not gapless");
  const order = rosterOrder();
  const sorted = [...rows].sort((a, b) => (a.work_date < b.work_date ? -1 : a.work_date > b.work_date ? 1 : 0)
    || toMinutes(a.start_time) - toMinutes(b.start_time)
    || order.get(a.person_id) - order.get(b.person_id)
    || (a.job_id < b.job_id ? -1 : a.job_id > b.job_id ? 1 : 0));
  assert.deepEqual(rows.map((r) => r.shift_id), sorted.map((r) => r.shift_id), "file order is not date, start, roster, job");
  for (const r of rows) assert.equal(r.record_type, "mock", `${r.shift_id} record_type`);
});

test("SMB-C5 T-Q2: SMB-27's census, every figure an equality", () => {
  const { rows } = schedule();
  const people = roster().rows.map((r) => r.person_id);
  assert.deepEqual(people.map((p) => count(rows, (r) => r.person_id === p)), [0, 13, 10, 9, 9, 7, 5, 0, 0], "shifts per person in roster order");
  const dates = [...new Set(rows.map((r) => r.work_date))].sort();
  assert.equal(dates.length, 10, "not ten work dates");
  assert.deepEqual(dates.map((d) => count(rows, (r) => r.work_date === d)), [7, 7, 8, 7, 7, 5, 5, 3, 3, 1], "shifts per date");
  assert.deepEqual([1, 2, 3, 4, 5, 6].map((n) => count(rows, (r) => r.job_id === `JOB-LDB-0${n}`)), [24, 3, 3, 2, 17, 4], "shifts per job");
  assert.equal(count(rows, (r) => r.start_time === "07:00" && r.end_time === "15:00"), 39, "site shifts");
  assert.equal(count(rows, (r) => shiftMinutes(r) === 240), 14, "four-hour shifts");
  assert.equal(count(rows, (r) => r.start_time === "08:00" && r.end_time === "12:00"), 8, "morning visits");
  assert.equal(count(rows, (r) => r.start_time === "12:00" && r.end_time === "16:00"), 6, "afternoon starts");
  assert.equal(minutesText(rows.reduce((a, r) => a + shiftMinutes(r), 0)), "368.00", "scheduled hours");
});

test("SMB-C5 T-Q3: P1, the double booking, is one pair under the strict test and six person-dates under the closed reading", () => {
  const { rows } = schedule();
  const strict = pairsWhere(rows, "start_time", "end_time", "shift_id", overlapsStrict);
  assert.equal(strict.length, 1, `the strict overlap test finds ${strict.length} pairs, expected 1`);
  assert.deepEqual(strict[0], { ids: ["SHF-LDB-16", "SHF-LDB-22"], person_id: "pe-219", work_date: "2026-03-18" }, "P1 moved");
  const twoShifts = [...tallyBy(rows, (r) => `${r.person_id}|${r.work_date}`)].filter(([, n]) => n >= 2);
  assert.equal(twoShifts.length, 6, "person-dates with two shifts at all");
  assert.equal(new Set(twoShifts.map(([k]) => k.split("|")[0])).size, 2, "people with two shifts on a date");
  const closed = new Set(pairsWhere(rows, "start_time", "end_time", "shift_id", overlapsClosed).map((p) => `${p.person_id}|${p.work_date}`));
  assert.equal(closed.size, 6, `the closed reading flags ${closed.size} person-dates, expected 6`);
  const lead = roster().rows.find((r) => r.role_title === "project lead").person_id;
  assert.equal(twoShifts.filter(([k]) => k.startsWith(`${lead}|`)).length, 5, "the project lead's back-to-back dates");
});

test("SMB-C5 T-Q4: every scheduled person resolves to one SMB-26 row and is hourly", () => {
  const people = rosterById();
  const scheduled = new Set(schedule().rows.map((r) => r.person_id));
  assert.deepEqual(setMinus(scheduled, new Set(people.keys())), [], "a scheduled person is not on the roster");
  for (const p of scheduled) assert.equal(people.get(p).pay_basis, "hourly", `${p} is scheduled and not hourly`);
  assert.deepEqual(setMinus(new Set(people.keys()), scheduled).sort(), ["pe-216", "pe-223", "pe-224"], "the unscheduled people");
});

test("SMB-C5 T-Q5: every shift's job resolves in SMB-22 and its job, role and week carry SMB-20 hours, and every SMB-20 key has a shift", () => {
  const jobs = new Set(jobProgress().rows.map((r) => r.job_id));
  const keys = smb20PeriodKeys();
  assert.equal(keys.size, 16, `SMB-20 carries ${keys.size} pay-period keys, expected 16`);
  for (const s of schedule().rows) {
    assert.ok(jobs.has(s.job_id), `${s.shift_id} is on ${s.job_id}, not an SMB-22 job`);
    assert.ok((keys.get(keyOf(s)) ?? 0) > 0, `${s.shift_id} key ${keyOf(s)} carries no SMB-20 hours`);
  }
  const shiftKeys = new Set(schedule().rows.map(keyOf));
  assert.deepEqual(setMinus(new Set(keys.keys()), shiftKeys), [], "an SMB-20 pay-period key has no shift");
});

test("SMB-C5 T-Q6: every work_date is a weekday inside the pay period", () => {
  for (const s of schedule().rows) {
    assert.ok(inPeriod(s.work_date), `${s.shift_id} ${s.work_date} is outside the pay period`);
    assert.ok(![0, 6].includes(dayOfWeek(s.work_date)), `${s.shift_id} ${s.work_date} is a weekend day`);
  }
});

test("SMB-C5 T-Q7: every shift time is on the quarter hour and starts before it ends", () => {
  for (const s of schedule().rows) {
    for (const t of [s.start_time, s.end_time]) assert.equal(toMinutes(t) % 15, 0, `${s.shift_id} ${t} is off the quarter hour`);
    assert.ok(toMinutes(s.start_time) < toMinutes(s.end_time), `${s.shift_id} does not start before it ends`);
  }
});

test("SMB-C5 T-Q8: SMB-27 regenerates byte for byte, twice, and equals the shipped bytes", () => assertByteIdentity("SMB-27"));

// ================================================================== SMB-28

test("SMB-C5 T-R1: SMB-28's header is spec.columns, 52 rows, TCD-LDB-01 upward in roster, date and clock-in order", () => {
  const { cols, rows } = cards();
  assert.deepEqual(cols, specs.byId.get("SMB-28").columns, "the header has drifted from spec.columns");
  assert.equal(rows.length, 52, `the file holds ${rows.length} timecards, expected 52`);
  assert.deepEqual(rows.map((r) => r.timecard_id), rows.map((_, i) => `TCD-LDB-${pad(i + 1)}`), "timecard ids are not gapless");
  const order = rosterOrder();
  const sorted = [...rows].sort((a, b) => order.get(a.person_id) - order.get(b.person_id)
    || (a.work_date < b.work_date ? -1 : a.work_date > b.work_date ? 1 : 0)
    || toMinutes(a.clock_in) - toMinutes(b.clock_in));
  assert.deepEqual(rows.map((r) => r.timecard_id), sorted.map((r) => r.timecard_id), "file order is not roster, date, clock in");
  for (const r of rows) assert.equal(r.record_type, "mock", `${r.timecard_id} record_type`);
});

test("SMB-C5 T-R2: SMB-28's census, every figure an equality", () => {
  const { rows } = cards();
  const people = roster().rows.map((r) => r.person_id);
  assert.deepEqual(people.map((p) => count(rows, (r) => r.person_id === p)), [0, 13, 9, 9, 9, 7, 5, 0, 0], "timecards per person");
  assert.deepEqual([1, 2, 3, 4, 5, 6].map((n) => count(rows, (r) => r.job_id === `JOB-LDB-0${n}`)), [23, 3, 3, 2, 17, 4], "timecards per job");
  assert.equal(minutesText(rows.reduce((a, r) => a + hoursToMinutes(r.hours_worked), 0)), "348.25", "timecard hours");
  const shifts = shiftById();
  assert.equal(count(rows, (r) => cardMinutes(r) !== shiftMinutes(shifts.get(r.shift_id))), 28, "timecards off their shift's length");
  assert.equal(new Set(rows.map((r) => r.hourly_pay_rate_usd)).size, 7, "distinct timecard rates");
  for (const r of rows) {
    for (const t of [r.clock_in, r.clock_out]) assert.equal(toMinutes(t) % 15, 0, `${r.timecard_id} ${t} is off the quarter hour`);
    assert.ok(toMinutes(r.clock_in) < toMinutes(r.clock_out), `${r.timecard_id} clocks out before it clocks in`);
  }
});

test("SMB-C5 T-R3: P2, the missing timecard, is one scheduled shift; three unscheduled people and 28 off-length cards are not gaps", () => {
  const carded = new Set(cards().rows.map((r) => r.shift_id));
  const missing = schedule().rows.filter((s) => !carded.has(s.shift_id));
  assert.equal(missing.length, 1, `${missing.length} scheduled shifts have no timecard, expected 1`);
  const m = missing[0];
  assert.deepEqual([m.shift_id, m.person_id, m.work_date, m.job_id], ["SHF-LDB-30", "pe-218", "2026-03-20", "JOB-LDB-01"], "P2 moved");
  assert.equal(rosterById().get(m.person_id).role_title, "lead carpenter", "P2 is not on the lead carpenter");
  const noCard = roster().rows.filter((r) => !cards().rows.some((c) => c.person_id === r.person_id)).map((r) => r.person_id);
  assert.deepEqual(noCard, ["pe-216", "pe-223", "pe-224"], "roster people with no timecard at all");
  for (const p of noCard) assert.equal(count(schedule().rows, (s) => s.person_id === p), 0, `${p} has no timecard and is scheduled`);
});

test("SMB-C5 T-R4: P3, the rate mismatch, is one timecard against its own roster rate, and 52 of 52 differ from SMB-20", () => {
  const people = rosterById();
  const off = cards().rows.filter((c) => toCents(c.hourly_pay_rate_usd) !== toCents(people.get(c.person_id).hourly_pay_rate_usd));
  assert.equal(off.length, 1, `${off.length} timecards differ from the roster for the same person, expected 1`);
  const m = off[0];
  assert.deepEqual([m.timecard_id, m.person_id, m.work_date, m.job_id, m.hourly_pay_rate_usd],
    ["TCD-LDB-44", "pe-221", "2026-03-19", "JOB-LDB-05", "28.25"], "P3 moved");
  assert.equal(toCents(people.get(m.person_id).hourly_pay_rate_usd) - toCents(m.hourly_pay_rate_usd), 125, "P3 is not the roster rate less 125 cents");
  const rosterRates = new Set(roster().rows.filter((r) => r.hourly_pay_rate_usd).map((r) => toCents(r.hourly_pay_rate_usd)));
  const cost = new Set(costRates().values());
  assert.ok(!rosterRates.has(toCents(m.hourly_pay_rate_usd)), "the differing rate equals a roster rate");
  assert.ok(!cost.has(toCents(m.hourly_pay_rate_usd)), "the differing rate equals an SMB-20 cost rate");
  const roleCost = costRates();
  assert.equal(count(cards().rows, (c) => toCents(c.hourly_pay_rate_usd) !== roleCost.get(people.get(c.person_id).crew_role)), 52,
    "every timecard's rate differs from its role's SMB-20 cost rate");
  const carpentryRates = new Set(cards().rows.filter((c) => people.get(c.person_id).crew_role === "carpentry" && c !== m)
    .map((c) => c.hourly_pay_rate_usd));
  assert.equal(carpentryRates.size, 4, "the four carpentry people's timecards do not carry four rates");
});

test("SMB-C5 T-R5: P1, P2 and P3 fall on three different people, none of them the project lead", () => {
  const p1 = pairsWhere(schedule().rows, "start_time", "end_time", "shift_id", overlapsStrict).map((p) => p.person_id);
  const carded = new Set(cards().rows.map((r) => r.shift_id));
  const p2 = schedule().rows.filter((s) => !carded.has(s.shift_id)).map((s) => s.person_id);
  const people = rosterById();
  const p3 = cards().rows.filter((c) => c.hourly_pay_rate_usd !== people.get(c.person_id).hourly_pay_rate_usd).map((c) => c.person_id);
  const three = [...p1, ...p2, ...p3];
  assert.deepEqual(three, ["pe-219", "pe-218", "pe-221"], "the plants' people");
  assert.equal(new Set(three).size, 3, "two plants share a person");
  for (const p of three) assert.notEqual(people.get(p).role_title, "project lead", `a plant sits on the project lead ${p}`);
});

test("SMB-C5 T-R6: every timecard's shift_id resolves to one shift with the same person, date and job, and no shift has two", () => {
  const shifts = shiftById();
  for (const c of cards().rows) {
    const s = shifts.get(c.shift_id);
    assert.ok(s, `${c.timecard_id} names ${c.shift_id}, which is not on the schedule`);
    for (const col of ["person_id", "work_date", "job_id"]) assert.equal(c[col], s[col], `${c.timecard_id} ${col} differs from ${s.shift_id}`);
  }
  const twice = [...tallyBy(cards().rows, (c) => c.shift_id)].filter(([, n]) => n > 1);
  assert.deepEqual(twice, [], "a shift carries two timecards");
});

test("SMB-C5 T-R7: hours_worked is clock_out less clock_in, and hours per person recompute from the timecards, not the schedule", () => {
  for (const c of cards().rows) {
    assert.equal(hoursToMinutes(c.hours_worked), cardMinutes(c), `${c.timecard_id} hours_worked ${c.hours_worked} is not the clock difference`);
  }
  const scheduled = ["pe-217", "pe-218", "pe-219", "pe-220", "pe-221", "pe-222"];
  const byCards = scheduled.map((p) => minutesText(cards().rows.filter((c) => c.person_id === p).reduce((a, c) => a + hoursToMinutes(c.hours_worked), 0)));
  const bySchedule = scheduled.map((p) => minutesText(schedule().rows.filter((s) => s.person_id === p).reduce((a, s) => a + shiftMinutes(s), 0)));
  assert.deepEqual(byCards, ["50.75", "70.75", "63.25", "70.50", "53.75", "39.25"], "per-person timecard hours");
  assert.deepEqual(bySchedule, ["52.00", "80.00", "68.00", "72.00", "56.00", "40.00"], "per-person scheduled hours");
  assert.equal(scheduled.filter((_, i) => byCards[i] !== bySchedule[i]).length, 6, "people whose timecard hours differ from the schedule");
  const p1Day = cards().rows.filter((c) => c.person_id === "pe-219" && c.work_date === "2026-03-18");
  assert.deepEqual(p1Day.map((c) => [c.clock_in, c.clock_out]), [["07:00", "12:00"], ["12:30", "15:30"]], "P1's day on the timecards");
  assert.equal(minutesText(p1Day.reduce((a, c) => a + cardMinutes(c), 0)), "8.00", "P1's day counts 8.00 on the timecards");
});

test("SMB-C5 T-R8: no timecard outside or longer than its shift, no person's week above 40.00, no two timecards of one person overlapping", () => {
  const shifts = shiftById();
  for (const c of cards().rows) {
    const s = shifts.get(c.shift_id);
    assert.ok(cardMinutes(c) <= shiftMinutes(s), `${c.timecard_id} runs longer than ${s.shift_id}`);
    assert.ok(toMinutes(c.clock_in) >= toMinutes(s.start_time) && toMinutes(c.clock_out) <= toMinutes(s.end_time),
      `${c.timecard_id} sits outside ${s.shift_id}`);
  }
  const weeks = new Map();
  for (const c of cards().rows) {
    const k = `${c.person_id}|${mondayOf(c.work_date)}`;
    weeks.set(k, (weeks.get(k) ?? 0) + cardMinutes(c));
  }
  for (const [k, m] of weeks) assert.ok(m <= 40 * 60, `${k} clocks ${minutesText(m)} hours in a week`);
  assert.equal(minutesText(Math.max(...weeks.values())), "39.50", "the largest weekly timecard total");
  assert.deepEqual(pairsWhere(cards().rows, "clock_in", "clock_out", "timecard_id", overlapsStrict), [], "two timecards of one person overlap");
});

test("SMB-C5 T-R9: SMB-28 regenerates byte for byte, twice, and equals the shipped bytes", () => assertByteIdentity("SMB-28"));

// ================================================================== SMB-29

/** Section 2.4's nine rows, pinned on every column but the two free-text clauses. */
const CHECKS_PIN = [
  ["PRC-LDB-01", "Every scheduled or clocked person is on the roster", "SMB-26; SMB-27; SMB-28", "person_id", "yes", "withhold_readiness", ""],
  ["PRC-LDB-02", "Every timecard belongs to one scheduled shift", "SMB-27; SMB-28", "shift_id; person_id; work_date; job_id", "yes", "withhold_readiness", ""],
  ["PRC-LDB-03", "Every scheduled shift has a timecard", "SMB-27; SMB-28", "shift_id", "yes", "withhold_readiness", ""],
  ["PRC-LDB-04", "Only hourly people carry timecards", "SMB-26; SMB-28", "person_id; pay_basis; hourly_pay_rate_usd", "yes", "withhold_readiness", ""],
  ["PRC-LDB-05", "Every timecard rate matches the roster", "SMB-26; SMB-28", "person_id; hourly_pay_rate_usd", "yes", "escalate", "DA-LDB-27"],
  ["PRC-LDB-06", "No person's timecards overlap", "SMB-28", "person_id; work_date; clock_in; clock_out", "yes", "withhold_readiness", ""],
  ["PRC-LDB-07", "No person is double booked on the schedule", "SMB-27", "person_id; work_date; start_time; end_time", "no", "flag", ""],
  ["PRC-LDB-08", "Hours are read from the timecards", "SMB-28", "clock_in; clock_out; hours_worked", "yes", "withhold_readiness", ""],
  ["PRC-LDB-09", "Readiness is a gate and not a pay run", "SMB-26; SMB-28", "hourly_pay_rate_usd; hours_worked", "yes", "withhold_readiness", "DA-LDB-27"],
];
const list = (cell) => cell.split("; ");

test("SMB-C5 T-S1: SMB-29's header is spec.columns, 9 rows, PRC-LDB-01 to -09 gapless", () => {
  const { cols, rows } = checklist();
  assert.deepEqual(cols, specs.byId.get("SMB-29").columns, "the header has drifted from spec.columns");
  assert.equal(rows.length, 9, `the checklist holds ${rows.length} checks, expected 9`);
  assert.deepEqual(rows.map((r) => r.check_id), rows.map((_, i) => `PRC-LDB-${pad(i + 1)}`), "check ids are not gapless");
  assert.ok(!("record_type" in rows[0]), "the template carries a record_type column");
});

test("SMB-C5 T-S2: SMB-29's census and the nine rows as section 2.4 pins them", () => {
  const { rows } = checklist();
  assert.deepEqual(Object.fromEntries(tallyBy(rows, (r) => r.blocking)), { yes: 8, no: 1 }, "blocking census");
  assert.deepEqual(Object.fromEntries(tallyBy(rows, (r) => r.on_fail)), { withhold_readiness: 7, escalate: 1, flag: 1 }, "on_fail census");
  assert.equal(count(rows, (r) => r.policy_control_id === "DA-LDB-27"), 2, "rows citing DA-LDB-27");
  const fileFor = (id) => fileName(id);
  assert.deepEqual(
    rows.map((r) => [r.check_id, r.check, r.source_files, r.columns_read, r.blocking, r.on_fail, r.policy_control_id]),
    CHECKS_PIN.map(([a, b, files, ...rest]) => [a, b, list(files).map(fileFor).join("; "), ...rest]),
    "the checklist has drifted from section 2.4's pinned rows"
  );
  for (const r of rows) {
    for (const col of ["rule", "evidence_required"]) {
      assert.ok(r[col].length > 20, `${r.check_id} ${col} is empty or a stub`);
      assert.match(r[col], /^[a-z]/, `${r.check_id} ${col} is not a lowercase clause`);
    }
  }
});

test("SMB-C5 T-S3: every source file is one of the three spec names and every column read is in the named files' spec.columns", () => {
  const byFile = new Map(["SMB-26", "SMB-27", "SMB-28"].map((id) => [fileName(id), new Set(specs.byId.get(id).columns)]));
  for (const r of checklist().rows) {
    const files = list(r.source_files);
    for (const f of files) assert.ok(byFile.has(f), `${r.check_id} reads ${f}, which is not a C5 dataset`);
    for (const c of list(r.columns_read)) {
      assert.ok(files.some((f) => byFile.get(f)?.has(c)), `${r.check_id} reads ${c}, which none of its files carries`);
    }
  }
});

test("SMB-C5 T-S4: blocking reads no exactly where on_fail reads flag", () => {
  for (const r of checklist().rows) {
    assert.ok(["yes", "no"].includes(r.blocking), `${r.check_id} blocking "${r.blocking}"`);
    assert.ok(["withhold_readiness", "escalate", "flag"].includes(r.on_fail), `${r.check_id} on_fail "${r.on_fail}"`);
    assert.equal(r.blocking === "no", r.on_fail === "flag", `${r.check_id} blocking and on_fail disagree`);
  }
});

test("SMB-C5 T-S5: every check is owned and escalated as SMB-33's DA-LDB-27 sets, read off its emitted bytes", () => {
  const rows = matrix().rows;
  const da27 = rows.find((r) => r.control_id === "DA-LDB-27");
  assert.ok(da27, "SMB-33 carries no DA-LDB-27");
  assert.equal(da27.decision, "Prepare crew pay figures from the timecards");
  assert.equal(da27.data_class, "restricted");
  assert.equal(da27.amount_min_usd, "", "DA-LDB-27 is banded");
  assert.equal(da27.amount_max_usd, "", "DA-LDB-27 is banded");
  assert.equal(da27.ai_autonomy_level, "approval_before_action");
  for (const id of ["DA-LDB-18", "DA-LDB-19", "DA-LDB-20"]) {
    const r = rows.find((x) => x.control_id === id);
    assert.equal(r.ai_autonomy_level, "prohibited", `${id} is not prohibited`);
    assert.match(r.decision, /crew member/, `${id} is not the send-a-payment decision`);
  }
  for (const r of checklist().rows) {
    assert.equal(r.owner_role, da27.approver_role, `${r.check_id} owner_role`);
    assert.equal(r.escalation_role, da27.escalation_role, `${r.check_id} escalation_role`);
    assert.ok(["", da27.control_id].includes(r.policy_control_id), `${r.check_id} policy_control_id`);
  }
  assert.equal(da27.approver_role, "project lead");
  assert.equal(da27.escalation_role, "owner");
});

/**
 * The nine rules, each written from its rule text in section 2.4 and run over
 * the three shipped files. Each returns its findings; an empty list is a pass.
 */
function runRules() {
  const people = rosterById();
  const sched = schedule().rows;
  const tcs = cards().rows;
  return {
    // every person id on a shift or a timecard matches exactly one roster row
    "PRC-LDB-01": [...sched, ...tcs].filter((r) => count(roster().rows, (p) => p.person_id === r.person_id) !== 1)
      .map((r) => r.shift_id ?? r.timecard_id),
    // every timecard's shift id matches one shift with the same person, date and job
    "PRC-LDB-02": tcs.filter((c) => {
      const matches = sched.filter((s) => s.shift_id === c.shift_id);
      return matches.length !== 1 || ["person_id", "work_date", "job_id"].some((k) => matches[0][k] !== c[k]);
    }).map((c) => c.timecard_id),
    // every shift on the schedule appears on exactly one timecard
    "PRC-LDB-03": sched.filter((s) => count(tcs, (c) => c.shift_id === s.shift_id) !== 1).map((s) => s.shift_id),
    // every timecard's person is hourly on the roster; a salaried row carries no rate and no timecard
    "PRC-LDB-04": [
      ...tcs.filter((c) => people.get(c.person_id)?.pay_basis !== "hourly").map((c) => c.timecard_id),
      ...roster().rows.filter((p) => p.pay_basis === "salaried" && p.hourly_pay_rate_usd !== "").map((p) => p.person_id),
    ],
    // every timecard's rate equals the roster rate for the same person, compared in cents
    "PRC-LDB-05": tcs.filter((c) => toCents(c.hourly_pay_rate_usd) !== toCents(people.get(c.person_id).hourly_pay_rate_usd))
      .map((c) => c.timecard_id),
    // no two timecards of one person on one date overlap in time; ending as the next begins does not
    "PRC-LDB-06": pairsWhere(tcs, "clock_in", "clock_out", "timecard_id", overlapsStrict).map((p) => p.ids.join("+")),
    // no two shifts of one person on one date overlap in time, the same strict test
    "PRC-LDB-07": pairsWhere(sched, "start_time", "end_time", "shift_id", overlapsStrict).map((p) => `${p.person_id} ${p.work_date}`),
    // every hours value equals clock out less clock in; a person's hours are the sum of their timecards
    "PRC-LDB-08": tcs.filter((c) => hoursToMinutes(c.hours_worked) !== cardMinutes(c)).map((c) => c.timecard_id),
    // the check computes no gross pay and writes no pay figure
    "PRC-LDB-09": [...roster().cols, ...schedule().cols, ...cards().cols]
      .filter((c) => c.split("_").some((t) => ["gross", "net", "wages", "earnings", "amount", "total"].includes(t))),
  };
}

test("SMB-C5 T-S6: the nine rules, run from their text over the shipped files, trip PRC-LDB-03, -05 and -07 once each, on their plants", () => {
  const findings = runRules();
  assert.deepEqual(Object.keys(findings), checklist().rows.map((r) => r.check_id), "a rule has no check or a check has no rule");
  assert.deepEqual(findings, {
    "PRC-LDB-01": [], "PRC-LDB-02": [],
    "PRC-LDB-03": ["SHF-LDB-30"],
    "PRC-LDB-04": [],
    "PRC-LDB-05": ["TCD-LDB-44"],
    "PRC-LDB-06": [],
    "PRC-LDB-07": ["pe-219 2026-03-18"],
    "PRC-LDB-08": [], "PRC-LDB-09": [],
  }, "the rule run does not trip exactly the three plants");
  const tripped = checklist().rows.filter((r) => findings[r.check_id].length > 0);
  assert.deepEqual(tripped.map((r) => r.on_fail), ["withhold_readiness", "escalate", "flag"], "the three trips' outcomes");
});

test("SMB-C5 T-S7: SMB-29 is a template: no digit outside ids, sentence case, no person, no canon id, no instrument, no law", () => {
  const text = shipped("SMB-29");
  const residue = text.replace(/PRC-LDB-\d{2}/g, " ").replace(/DA-LDB-\d{2}/g, " ");
  assert.deepEqual(residue.match(/\S*\d\S*/g) ?? [], [], "SMB-29 carries a digit outside ids");
  for (const r of checklist().rows) {
    for (const col of ["check", "rule", "evidence_required"]) {
      const caps = r[col].split(/[^A-Za-z']+/).filter(Boolean).slice(1).filter((w) => /^[A-Z]/.test(w) && w !== "AI");
      assert.deepEqual(caps, [], `${r.check_id} ${col} capitalizes ${caps.join(", ")}`);
    }
  }
  for (const r of roster().rows) {
    for (const n of [r.first_name, r.last_name]) assert.doesNotMatch(text, new RegExp(`\\b${n}\\b`), `SMB-29 names ${n}`);
  }
  assert.doesNotMatch(text, /\b(co|pe)-\d{3}\b|JOB-LDB-|SHF-LDB-|TCD-LDB-/, "SMB-29 carries a canon or row id");
  assert.doesNotMatch(text, /lead carpenter/, "SMB-29 uses the lead carpenter role word");
  assert.doesNotMatch(text, /\d{4}-\d{2}-\d{2}|\d+\.\d{2}/, "SMB-29 carries a date or a rate");
  assert.deepEqual(mockHits(text), [], "SMB-29 names an instrument or a payroll provider");
  assert.deepEqual(statuteHits(text), [], "SMB-29 names a statute or a jurisdiction");
  assert.deepEqual(vocabularyHits(text), [], "SMB-29 breaks the vocabulary contract");
});

test("SMB-C5 T-S8: SMB-29 regenerates byte for byte, twice, and equals the shipped bytes", () => assertByteIdentity("SMB-29"));

// ============================================================ cross-file

test("SMB-C5 T-X1: every person id on the schedule and the timecards resolves to SMB-26, as two set differences", () => {
  const people = new Set(roster().rows.map((r) => r.person_id));
  assert.deepEqual(setMinus(new Set(schedule().rows.map((r) => r.person_id)), people), [], "SMB-27 less SMB-26");
  assert.deepEqual(setMinus(new Set(cards().rows.map((r) => r.person_id)), people), [], "SMB-28 less SMB-26");
  assert.deepEqual(
    setMinus(new Set(cards().rows.map((r) => r.person_id)), new Set(schedule().rows.map((r) => r.person_id))), [],
    "a timecard person is not scheduled"
  );
});

test("SMB-C5 T-X2: every job id on the schedule and the timecards resolves in SMB-22", () => {
  const jobs = new Set(jobProgress().rows.map((r) => r.job_id));
  for (const id of ["SMB-27", "SMB-28"]) {
    const rows = id === "SMB-27" ? schedule().rows : cards().rows;
    assert.deepEqual(setMinus(new Set(rows.map((r) => r.job_id)), jobs), [], `${id} less SMB-22`);
  }
});

test("SMB-C5 T-X3: every C5 date is a weekday inside the pay period, and no weekend day carries a row", () => {
  for (const r of [...schedule().rows, ...cards().rows]) {
    assert.ok(inPeriod(r.work_date), `${r.shift_id} ${r.timecard_id ?? ""} ${r.work_date} is outside the period`);
    assert.ok(dayOfWeek(r.work_date) >= 1 && dayOfWeek(r.work_date) <= 5, `${r.work_date} is a weekend day`);
  }
  const text = allC5Text();
  const dates = text.match(/\d{4}-\d{2}-\d{2}/g) ?? [];
  for (const d of dates) assert.ok(inPeriod(d), `${d} in a C5 file is outside the pay period`);
});

test("SMB-C5 T-X4: the timecards and SMB-20 carry the same 16 pay-period keys, and timecard hours are under the role total on every one", () => {
  const keys = smb20PeriodKeys();
  const used = new Map();
  for (const c of cards().rows) used.set(keyOf(c), (used.get(keyOf(c)) ?? 0) + cardMinutes(c));
  assert.equal(used.size, 16, `the timecards touch ${used.size} keys, expected 16`);
  assert.deepEqual(setMinus(new Set(used.keys()), new Set(keys.keys())), [], "timecard keys less SMB-20 keys");
  assert.deepEqual(setMinus(new Set(keys.keys()), new Set(used.keys())), [], "SMB-20 keys less timecard keys");
  for (const [k, m] of used) assert.ok(m < keys.get(k), `${k}: ${minutesText(m)} clocked against ${minutesText(keys.get(k))} costed`);
  const week = (w, map) => minutesText([...map].filter(([k]) => k.endsWith(w)).reduce((a, [, m]) => a + m, 0));
  assert.deepEqual([week("2026-03-20", used), week("2026-03-20", keys)], ["227.00", "416.00"], "week ending 2026-03-20");
  assert.deepEqual([week("2026-03-27", used), week("2026-03-27", keys)], ["121.25", "142.00"], "week ending 2026-03-27");
});

test("SMB-C5 T-X5: R-GATE, no pay amount column and no cell equal to any hours value times any rate, or any implied gross", () => {
  const banned = ["gross", "net", "pay_total", "wages", "earnings", "amount", "total"];
  for (const id of C5_IDS) {
    for (const c of specs.byId.get(id).columns) {
      const tokens = c.toLowerCase().split("_");
      for (const b of banned) {
        const hit = b.includes("_") ? c.toLowerCase().includes(b) : tokens.includes(b);
        assert.ok(!hit, `${id} column ${c} carries "${b}"`);
      }
    }
  }
  const hours = [...new Set(cards().rows.map((c) => hoursToMinutes(c.hours_worked)))];
  const rates = [...new Set([
    ...roster().rows.filter((r) => r.hourly_pay_rate_usd).map((r) => toCents(r.hourly_pay_rate_usd)),
    ...cards().rows.map((c) => toCents(c.hourly_pay_rate_usd)),
  ])];
  assert.equal(hours.length, 7, `${hours.length} distinct hours values, expected 7`);
  assert.equal(rates.length, 9, `${rates.length} distinct rates, expected 9`);
  const product = (mins, cents) => {
    assert.equal((mins * cents) % 60, 0, "a product is not whole cents");
    return (mins * cents) / 60;
  };
  const forbidden = new Set();
  for (const h of hours) for (const r of rates) forbidden.add(product(h, r));
  const perPerson = new Map();
  for (const c of cards().rows) {
    const g = product(cardMinutes(c), toCents(c.hourly_pay_rate_usd));
    forbidden.add(g);
    perPerson.set(c.person_id, (perPerson.get(c.person_id) ?? 0) + g);
  }
  for (const g of perPerson.values()) forbidden.add(g);
  assert.ok(forbidden.size >= 60, `only ${forbidden.size} forbidden figures were built`);
  const texts = new Set([...forbidden].flatMap((c) => (c % 100 === 0 ? [centsText(c), String(c / 100)] : [centsText(c)])));
  for (const id of C5_IDS) {
    const t = csvTable(shipped(id));
    for (const row of t.rows) {
      for (const [col, v] of Object.entries(row)) assert.ok(!texts.has(v), `${id} ${col} "${v}" is an hours-times-rate figure`);
    }
  }
});

test("SMB-C5 T-X6: R-NS, the three prefixes gapless in their own files, no bare SHF-, TCD- or PRC- token, and pe-216 to pe-224 only", () => {
  const text = allC5Text();
  assert.deepEqual(text.match(/\b(SHF|TCD|PRC)-(?!LDB-\d{2}\b)\S*/g) ?? [], [], "a bare or malformed C5 prefix token");
  assert.doesNotMatch(shipped("SMB-26") + shipped("SMB-29"), /SHF-LDB-|TCD-LDB-/, "a shift or timecard id outside SMB-27 and SMB-28");
  assert.doesNotMatch(shipped("SMB-26") + shipped("SMB-27") + shipped("SMB-28"), /PRC-LDB-/, "a check id outside SMB-29");
  assert.doesNotMatch(shipped("SMB-26") + shipped("SMB-27"), /TCD-LDB-/, "a timecard id outside SMB-28");
  const pes = new Set(text.match(/\bpe-\d{3}\b/g) ?? []);
  assert.deepEqual([...pes].sort(), CREW_PIN.map((r) => r[0]), "the C5 files carry pe- ids other than pe-216 to pe-224");
  assert.equal(new Set(cards().rows.map((r) => r.shift_id)).size, 52, "timecard shift ids");
});

test("SMB-C5 T-X7: R-MOCK with the payroll-provider extension, the vocabulary contract, and record_type on the three mocks only", () => {
  for (const id of C5_IDS) {
    assert.deepEqual(mockHits(shipped(id)), [], `${id} names an instrument, processor or payroll provider`);
    assert.deepEqual(vocabularyHits(shipped(id)), [], `${id} breaks the vocabulary contract`);
    const banned = ["ssn", "tax", "bank", "account", "address", "phone", "email", "birth", "dob"];
    for (const c of specs.byId.get(id).columns) for (const b of banned) assert.ok(!c.includes(b), `${id} column ${c} carries "${b}"`);
  }
  assert.deepEqual(mockHits(c5SpecProse()), [], "the C5 spec prose names an instrument or payroll provider");
  assert.deepEqual(vocabularyHits(c5SpecProse()), [], "the C5 spec prose breaks the vocabulary contract");
  for (const id of ["SMB-26", "SMB-27", "SMB-28"]) assert.ok(specs.byId.get(id).columns.includes("record_type"), `${id} has no record_type`);
  assert.ok(!specs.byId.get("SMB-29").columns.includes("record_type"), "SMB-29 carries record_type");
});

/** Every text file under a directory, recursively. */
function filesUnder(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(path));
    else if (entry.isFile()) out.push(path);
  }
  return out;
}

test("SMB-C5 T-X8: R-ROLE amended, no crew first name or surname in any other SMB file, and no SMB-34 code digits in the C5 files", () => {
  const own = shippedPath("SMB-26");
  const pack = [
    ...filesUnder(join(REPO_ROOT, "datasets", "smb")),
    ...readdirSync(join(REPO_ROOT, "artifacts")).filter((d) => /^SMB-\d+$/.test(d)).flatMap((d) => filesUnder(join(REPO_ROOT, "artifacts", d))),
  ].filter((f) => f !== own);
  assert.ok(pack.length > 40, `only ${pack.length} pack files were walked`);
  const halves = roster().rows.flatMap((r) => [r.first_name, r.last_name]);
  for (const f of pack) {
    const text = readFileSync(f, "latin1");
    if (text.includes("\0")) continue;
    for (const h of halves) assert.doesNotMatch(text, new RegExp(`\\b${h}\\b`), `${h} occurs in ${f.slice(REPO_ROOT.length + 1)}`);
  }
  const codes = restrictedItems().slice(0, 3).map((r) => /^MOCK-(\d{4})$/.exec(r.value)?.[1]);
  assert.equal(codes.filter(Boolean).length, 3, "SMB-34's three codes did not parse");
  const text = allC5Text();
  for (const d of codes) assert.doesNotMatch(text, new RegExp(`(?<![0-9])${d}(?![0-9])`), "an SMB-34 code's digits stand alone in a C5 file");
});

test("SMB-C5 T-X9: R-NOSTATUTE, no statute, regulator, jurisdiction or legal category in any C5 byte or spec sentence", () => {
  for (const id of C5_IDS) assert.deepEqual(statuteHits(shipped(id)), [], `${id} names a statute or a legal category`);
  assert.deepEqual(statuteHits(c5SpecProse()), [], "the C5 spec prose names a statute or a legal category");
  for (const r of roster().rows) assert.ok(["hourly", "salaried"].includes(r.pay_basis), `${r.person_id} pay_basis`);
});

test("SMB-C5 T-X10: no em dash and no en dash in the four data files", () => {
  for (const id of C5_IDS) {
    const text = shipped(id);
    assert.ok(!text.includes(EM_DASH) && !text.includes(EN_DASH), `${id} carries an em or en dash`);
  }
});

test("SMB-C5 T-X11: every C5 planted_features sentence and every columns list is pinned verbatim against the yaml", () => {
  for (const id of C5_IDS) {
    const spec = specs.byId.get(id);
    assert.deepEqual(spec.columns, COLUMNS_PIN[id], `${id} columns have drifted from the plan`);
    assert.deepEqual(spec.planted_features, FEATURES_PIN[id], `${id} planted_features have drifted from the plan`);
    assert.deepEqual(spec.period, { start: PERIOD_START, end: PERIOD_END }, `${id} period`);
    assert.ok(!spec.planted_features.join(" ").includes(EM_DASH) && !spec.planted_features.join(" ").includes(EN_DASH), `${id} prose dash`);
  }
  assert.deepEqual(specs.byId.get("SMB-29").canon_entities, [], "SMB-29 canon_entities");
  for (const id of ["SMB-26", "SMB-27", "SMB-28"]) assert.deepEqual(specs.byId.get(id).canon_entities, ["co-100"], `${id} canon_entities`);
});

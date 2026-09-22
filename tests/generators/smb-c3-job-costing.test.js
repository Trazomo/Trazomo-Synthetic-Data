// SMB-20, SMB-21 and SMB-22: the three deterministic artifacts of the job
// costing wave, screened from their emitted bytes.
//
//   datasets/smb/time-entries-mock/  the sixty-seven weekly role totals
//   datasets/smb/job-expenses-mock/  the thirty-four expense rows, one miscoded
//   datasets/smb/job-progress/       the six jobs and the margin identity
//
// Every check recomputes its answer from the shipped bytes the way a consumer
// would. Nothing here imports a builder, a builder's predicate, a builder's
// census constant or a builder's vocabulary list: the margin identity, the
// on-track rule at both readings of the tolerance, the floor crossing as two
// integer cross-multiplications, the miscode rule, the approved proposal's own
// two tables, the per-job sums and the window sweeps are all written again in
// this file with a different implementation, so the generator and its screen
// can genuinely disagree. A test that imported the predicate it screens against
// would pass on the day somebody edited the predicate, which is the one failure
// this file exists to prevent.
//
// The mutation this file exists to catch, stated in the data plan's own words:
// a cost row's `scope` flipped from `change_order` to `contract`, which folds
// the change-order cost into the reported margin, makes the plant job fail the
// floor on its surface reading, and destroys the plant while every total still
// sums.
//
// Written RED first: the enrolment test and the three row counts ran against a
// spec id with no generator registered, and failed with NOT_IMPLEMENTED,
// before a line of the builder existed.
//
// Four mechanical rules are stated once here and used throughout.
//
//   The census rule. Every count the data plan pins is asserted as a number,
//   not as a floor. `>= 6` passes on a file with sixty rows and is not a
//   census, so every assertion below is an equality.
//
//   The plant rule. Every plant is asserted at BOTH cardinalities: the count
//   under the stated rule, and the count with the one qualifier the rule names
//   dropped. P4 is 1 and 4, P5 is 1 and 3, P6 is 1 and 2.
//
//   The join rule. A join is asserted as two set differences, both empty.
//
//   The derive rule. Bytes another artifact already froze are re-read out of
//   its emitted output rather than retyped here: the approved proposal's line
//   items and rate basis are parsed out of the markdown, the renovation's role
//   windows come out of SMB-16's emitted schedule and SMB-04's emitted stages,
//   and the two frozen jobs' four pinned cells come out of the client records.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { PROGRAM_GENERATOR_IDS } from "../../datagen/src/generators/index.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";
import { MOCK_VOCABULARY } from "../helpers/smb-mock-vocabulary.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));

const emitted = (id) => generateArtifact(specs.byId.get(id), canon);
const textOf = (id, path) => fileByPath(emitted(id), path).content;

const time = csvTable(textOf("SMB-20", "time-entries-mock.csv"));
const expenses = csvTable(textOf("SMB-21", "job-expenses-mock.csv"));
const progress = csvTable(textOf("SMB-22", "job-progress.csv"));
const register = csvTable(textOf("SMB-17", "invoices-issued.csv"));
const schedule = csvTable(textOf("SMB-16", "milestone-schedule.csv"));
const okaforRecord = JSON.parse(textOf("SMB-04", "client-record-okafor.json"));
const officeRecord = JSON.parse(textOf("SMB-05", "client-record-co002-office-refresh.json"));

/** The approved proposal, as a document. Parsed below, never retyped. */
const PROPOSAL = readFileSync(join(REPO_ROOT, "artifacts", "SMB-06", "approved-proposal-larkspur.md"), "utf8");

/** The internal status notes, which freeze the rework figure. */
const STATUS_NOTES = readFileSync(join(REPO_ROOT, "artifacts", "SMB-15", "internal-status-notes.md"), "utf8");

/** The as-of date the whole pack reports against, read off the client record. */
const AS_OF = okaforRecord.client.as_of_date;

/** The reserved Larkspur-side band, canon/companies.md:16. */
const BAND = { first: 200, last: 249 };

/**
 * The two dashes the pack bans, built from their code points rather than
 * written out, so this file can screen for them without carrying one.
 */
const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** How many rows satisfy `predicate`. */
const count = (rows, predicate) => rows.filter(predicate).length;

/** Every value of `column`, in file order. */
const column = (table, name) => table.rows.map((r) => r[name]);

/**
 * A money string to integer cents. A second implementation: string surgery on
 * the two sides of the decimal point rather than a multiply, so a value this
 * pack could never emit (a comma, a currency sign, three decimal places) fails
 * here rather than rounding into something plausible.
 */
function toCents(value) {
  const match = /^(-?)(\d+)\.(\d{2})$/.exec(value);
  assert.ok(match, `"${value}" is not a 2dp money string`);
  const cents = Number(match[2]) * 100 + Number(match[3]);
  return match[1] === "-" ? -cents : cents;
}

/**
 * Days from the civil epoch, the days-from-civil algorithm, written out rather
 * than taken from datagen/src/dates.js: this file's date arithmetic has to be
 * able to disagree with the builder's. No Date object is constructed anywhere
 * in this file, deliberately.
 */
function epochDay(iso) {
  assert.match(iso, ISO_DATE, "not an ISO date");
  const [y, m, d] = iso.split("-").map(Number);
  const year = m <= 2 ? y - 1 : y;
  const era = Math.floor(year / 400);
  const yearOfEra = year - era * 400;
  const dayOfYear = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

/** Whole calendar days from `from` to `to`, both ISO dates. */
const daysBetween = (from, to) => epochDay(to) - epochDay(from);

/** 0 is Sunday. 1970-01-01 was a Thursday. */
const weekdayOf = (iso) => ((epochDay(iso) + 4) % 7 + 7) % 7;
const isWeekend = (iso) => weekdayOf(iso) === 0 || weekdayOf(iso) === 6;
const isFriday = (iso) => weekdayOf(iso) === 5;

/**
 * A pipe table out of a frozen markdown document, keyed by its header cells.
 * A second implementation of the parse the builder does: this one finds the
 * table by its own first header cell and strips backticks per cell.
 */
function pipeTable(text, firstHeaderCell) {
  const lines = text.split("\n").map((line) => line.trim());
  const cells = (line) => line.replace(/^\|/, "").replace(/\|$/, "").split("|")
    .map((cell) => cell.trim().replace(/^`(.*)`$/, "$1").trim());
  const start = lines.findIndex((line) => line.startsWith("|") && cells(line)[0] === firstHeaderCell);
  assert.ok(start >= 0, `the document carries no table headed "${firstHeaderCell}"`);
  const header = cells(lines[start]);
  const rows = [];
  for (let i = start + 2; i < lines.length && lines[i].startsWith("|"); i += 1) {
    const values = cells(lines[i]);
    assert.equal(values.length, header.length, `a "${firstHeaderCell}" row has the wrong cell count`);
    rows.push(Object.fromEntries(header.map((name, j) => [name, values[j]])));
  }
  assert.ok(rows.length > 0, `the "${firstHeaderCell}" table is empty`);
  return rows;
}

const proposalLines = pipeTable(PROPOSAL, "line_id");
const proposalRates = pipeTable(PROPOSAL, "rate_id");
const rateById = new Map(proposalRates.map((rate) => [rate.rate_id, rate]));

/** A milestone row out of SMB-16's emitted schedule. */
const milestone = (id) => {
  const row = schedule.rows.find((r) => r.milestone_id === id);
  assert.ok(row, `SMB-16 no longer carries ${id}`);
  return row;
};

/** A stage date out of an emitted client record. */
const stageDate = (record, stage) => {
  const row = record.stages.find((s) => s.stage === stage);
  assert.ok(row, `the client record no longer carries the "${stage}" stage`);
  return row.event_date;
};

/** The latest Friday strictly before an ISO date, walked back a day at a time. */
function fridayBefore(iso) {
  let day = epochDay(iso) - 1;
  while (((day + 4) % 7 + 7) % 7 !== 5) day -= 1;
  // Re-express as a date by walking the same number of days back from the input.
  let out = iso;
  for (let i = epochDay(iso); i > day; i -= 1) out = shiftDays(out, -1);
  return out;
}

/** An ISO date shifted by whole days, via the register's own date vocabulary. */
function shiftDays(iso, days) {
  const target = epochDay(iso) + days;
  // Binary-free walk: step a day at a time through a calendar built by hand.
  let [y, m, d] = iso.split("-").map(Number);
  const step = days < 0 ? -1 : 1;
  for (let i = 0; i < Math.abs(days); i += 1) {
    d += step;
    if (d < 1) {
      m -= 1;
      if (m < 1) { m = 12; y -= 1; }
      d = daysInMonth(y, m);
    } else if (d > daysInMonth(y, m)) {
      d = 1;
      m += 1;
      if (m > 12) { m = 1; y += 1; }
    }
  }
  const out = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  assert.equal(epochDay(out), target, "the calendar walk and the epoch-day arithmetic disagree");
  return out;
}

function daysInMonth(year, month) {
  const lengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month !== 2) return lengths[month - 1];
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return leap ? 29 : 28;
}

/** The renovation's role windows, re-derived from SMB-16 and SMB-04. */
function okaforWindows() {
  const delivery = { from: milestone("MST-LDB-01").actual_start, to: milestone("MST-LDB-06").planned_end };
  return {
    design: { from: stageDate(okaforRecord, "proposal_approved"), to: fridayBefore(stageDate(okaforRecord, "kickoff")) },
    demolition: { from: milestone("MST-LDB-02").actual_start, to: milestone("MST-LDB-02").actual_completion },
    plumbing: { from: milestone("MST-LDB-03").actual_start, to: milestone("MST-LDB-03").actual_completion },
    paint: { from: milestone("MST-LDB-05").planned_start, to: milestone("MST-LDB-05").planned_end },
    carpentry: { ...delivery },
    project_management: { ...delivery },
  };
}

/** The job window each SMB-22 row states, read off the emitted snapshot. */
const jobWindow = (jobId) => {
  const row = progress.rows.find((r) => r.job_id === jobId);
  assert.ok(row, `SMB-22 does not track ${jobId}`);
  return { start_date: row.start_date, as_of_date: row.as_of_date, planned_end_date: row.planned_end_date };
};

/** The five job-cost categories, written here rather than imported. */
const JOB_COST_CATEGORIES = ["subcontract", "materials", "equipment_hire", "permit", "disposal"];

/** The six cost centres, in the order the file uses them. */
const CREW_ROLES = ["design", "demolition", "plumbing", "carpentry", "paint", "project_management"];

/** The canon person names nothing in this wave may carry (rule R-ROLE). */
function canonPersonNames() {
  const text = readFileSync(join(REPO_ROOT, "canon", "people.md"), "utf8");
  const names = new Set();
  for (const line of text.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    for (const cell of line.trim().replace(/^\||\|$/g, "").split("|")) {
      const value = cell.replace(/\*\*/g, "").trim();
      if (/^[A-Z][a-z]+(?:\s+[A-Z]\.)?(?:\s+[A-Z][A-Za-z'-]+)+$/.test(value)) names.add(value);
    }
  }
  return names;
}

// ------------------------------------------------------- enrolment (plan 4)

test("SMB-20, SMB-21 and SMB-22 are enrolled in PROGRAM_GENERATOR_IDS, so the two-run byte-identity sweep covers them", () => {
  for (const id of ["SMB-20", "SMB-21", "SMB-22"]) {
    assert.ok(
      PROGRAM_GENERATOR_IDS.includes(id),
      `${id} is not enrolled, so tests/generators/determinism.test.js never runs it twice`
    );
    assert.equal(specs.byId.get(id).generation, "deterministic", `${id} is not a deterministic spec`);
  }
});

test("SMB-20, SMB-21 and SMB-22 regenerate byte for byte, and the three agree about the population across runs", () => {
  for (const id of ["SMB-20", "SMB-21", "SMB-22"]) {
    const first = generateArtifact(specs.byId.get(id), canon);
    const second = generateArtifact(specs.byId.get(id), canon);
    assert.deepEqual(second.map((f) => f.path), first.map((f) => f.path), `${id}: the emitted file list moved`);
    for (const [i, file] of first.entries()) {
      assert.equal(second[i].content, file.content, `${id}: ${file.path} is not byte identical across two runs`);
    }
  }
  // The three drawn household names are a seeded draw, so the check that
  // matters is that the snapshot and the register drew the same ones.
  const registerNames = new Map(register.rows.map((r) => [r.client_canon_id, r.client_name]));
  for (const r of progress.rows) {
    assert.equal(r.client_name, registerNames.get(r.client_canon_id), `${r.job_id} names its client differently from the register`);
  }
});

// --------------------------------------------------------------------- SMB-20

test("SMB-20: the header is the spec's, sixty-seven entries, ids gapless, file order job then role then scope then week (T-D1)", () => {
  assert.deepEqual(time.cols, specs.byId.get("SMB-20").columns, "SMB-20: the header is not spec.columns");
  assert.equal(time.rows.length, 67, "SMB-20: the row count moved");

  const ids = column(time, "entry_id");
  assert.equal(new Set(ids).size, ids.length, "SMB-20: an entry id repeats");
  assert.deepEqual(
    ids, ids.map((_, i) => `TME-LDB-${String(i + 1).padStart(2, "0")}`),
    "SMB-20: the entry ids are not gapless from 01"
  );

  // File order, recomputed as a sort key rather than trusted.
  const jobIds = [...new Set(column(progress, "job_id"))];
  const key = (r) => [
    jobIds.indexOf(r.job_id),
    CREW_ROLES.indexOf(r.crew_role),
    r.scope === "contract" ? 0 : 1,
    epochDay(r.week_ending),
  ];
  for (let i = 1; i < time.rows.length; i += 1) {
    const before = key(time.rows[i - 1]);
    const after = key(time.rows[i]);
    const ahead = before.findIndex((value, j) => value !== after[j]);
    assert.ok(ahead >= 0, `SMB-20: ${time.rows[i].entry_id} repeats the row before it`);
    assert.ok(before[ahead] < after[ahead], `SMB-20: ${time.rows[i].entry_id} is out of file order`);
  }
  assert.equal(new Set(column(time, "job_id")).size, 6, "SMB-20: the job count");
  assert.equal(new Set(column(time, "crew_role")).size, 6, "SMB-20: the crew role count");
  assert.equal(new Set(column(time, "crew_slot")).size, 6, "SMB-20: the crew slot count");
  assert.equal(new Set(column(time, "week_ending")).size, 8, "SMB-20: the week_ending count");
  for (const r of time.rows) assert.equal(r.record_type, "mock", `${r.entry_id} carries record_type "${r.record_type}"`);
});

test("SMB-20: entry_cost_usd is hours times cost_rate_usd to the cent on every row, in integer cents (T-D2)", () => {
  for (const r of time.rows) {
    const hours = Number(r.hours);
    assert.ok(Number.isInteger(hours) && hours > 0, `${r.entry_id} carries "${r.hours}" hours`);
    assert.equal(
      toCents(r.entry_cost_usd), hours * toCents(r.cost_rate_usd),
      `${r.entry_id}: ${r.hours} hours at ${r.cost_rate_usd} is not ${r.entry_cost_usd}`
    );
  }
  // Every money cell is a bare 2dp string with no thousands separator.
  for (const r of time.rows) {
    for (const col of ["cost_rate_usd", "entry_cost_usd"]) {
      assert.match(r[col], /^\d+\.\d{2}$/, `${r.entry_id}: ${col} carries "${r[col]}"`);
    }
  }
});

test("SMB-20: cost_rate_usd is a property of the role, and it is the studio's cost and not the billed rate (T-D3)", () => {
  const rateByRole = new Map();
  for (const r of time.rows) {
    if (rateByRole.has(r.crew_role)) {
      assert.equal(r.cost_rate_usd, rateByRole.get(r.crew_role), `${r.entry_id} prices ${r.crew_role} a second way`);
    } else {
      rateByRole.set(r.crew_role, r.cost_rate_usd);
    }
    assert.ok(CREW_ROLES.includes(r.crew_role), `${r.entry_id} carries crew_role "${r.crew_role}"`);
  }
  assert.equal(rateByRole.size, 6, "SMB-20: a role has gone missing from the file");

  // The slot is stable within a role and resolves to no canon id and no name.
  const slotByRole = new Map();
  for (const r of time.rows) {
    if (slotByRole.has(r.crew_role)) {
      assert.equal(r.crew_slot, slotByRole.get(r.crew_role), `${r.entry_id} gives ${r.crew_role} a second slot`);
    } else {
      slotByRole.set(r.crew_role, r.crew_slot);
    }
    assert.match(r.crew_slot, /^CRW-LDB-\d{2}$/, `${r.entry_id} carries crew_slot "${r.crew_slot}"`);
  }
  assert.equal(new Set(slotByRole.values()).size, 6, "two roles share a slot, so the slot says nothing");

  // The whole reason the cost rate is not SMB-06's rate: a cost file priced at
  // the billed rate reports a margin of exactly zero. Every tied role's day
  // cost is strictly below the day the client was billed.
  const billedDayRate = {
    design: "RTC-LDB-01", demolition: "RTC-LDB-02", carpentry: "RTC-LDB-09",
    paint: "RTC-LDB-10", project_management: "RTC-LDB-11",
  };
  for (const [role, rateId] of Object.entries(billedDayRate)) {
    const billed = toCents(rateById.get(rateId).unit_rate_usd);
    const costPerDay = toCents(rateByRole.get(role)) * 8;
    assert.ok(
      costPerDay < billed,
      `${role} costs ${costPerDay} cents a day and is billed ${billed}, so that scope carries no margin`
    );
  }
});

test("SMB-20: the renovation's hours are the approved proposal's quantities at eight hours to the day (T-D4)", () => {
  // The proposal's two tables are parsed here, out of the document, and the
  // tie is on QUANTITY. A retyped quantity fails this and nothing else.
  assert.equal(proposalLines.length, 12, "SMB-06 no longer carries twelve line items");
  assert.equal(proposalRates.length, 12, "SMB-06 no longer carries twelve rate rows");

  const dayLineFor = (rateId) => {
    const line = proposalLines.find((l) => l.rate_id === rateId);
    assert.ok(line, `SMB-06 carries no line item citing ${rateId}`);
    assert.equal(line.unit, "day", `${line.line_id} is no longer priced by the day`);
    return line;
  };
  const tie = {
    design: "RTC-LDB-01", demolition: "RTC-LDB-02", carpentry: "RTC-LDB-09",
    paint: "RTC-LDB-10", project_management: "RTC-LDB-11",
  };

  let tiedHours = 0;
  let billedDays = 0;
  for (const [role, rateId] of Object.entries(tie)) {
    const line = dayLineFor(rateId);
    const quantity = Number(line.quantity);
    const hours = time.rows
      .filter((r) => r.job_id === "JOB-LDB-01" && r.crew_role === role)
      .reduce((sum, r) => sum + Number(r.hours), 0);
    assert.equal(hours, quantity * 8, `the renovation's ${role} hours are not ${line.line_id}'s ${quantity} days at eight hours`);
    tiedHours += hours;
    billedDays += quantity;
  }
  assert.equal(billedDays, 75, "the five day-rate lines no longer bill seventy-five days");
  assert.equal(tiedHours, 600, "the five tied roles no longer carry six hundred hours");

  // The plumbing hours have no counterpart, because the proposal prices
  // plumbing as a lot and the studio self-performed the labour half of it.
  const plumbingLine = proposalLines.find((l) => l.rate_id === "RTC-LDB-03");
  assert.equal(plumbingLine.unit, "lot", "SMB-06 now prices plumbing by the day, and the tie would have to widen");
  const plumbingHours = time.rows
    .filter((r) => r.job_id === "JOB-LDB-01" && r.crew_role === "plumbing")
    .reduce((sum, r) => sum + Number(r.hours), 0);
  assert.equal(plumbingHours, 96, "the renovation's self-performed plumbing hours moved");
});

test("SMB-20: every per-job hour and cost total, and every group's weekly hours a whole number (T-D5)", () => {
  const pinned = {
    "JOB-LDB-01": { hours: 696, contract: 5132000, coHours: 0, co: 0, rows: 18 },
    "JOB-LDB-02": { hours: 226, contract: 1579000, coHours: 0, co: 0, rows: 9 },
    "JOB-LDB-03": { hours: 244, contract: 1814000, coHours: 0, co: 0, rows: 10 },
    "JOB-LDB-04": { hours: 200, contract: 1332000, coHours: 22, co: 143000, rows: 9 },
    "JOB-LDB-05": { hours: 406, contract: 2971000, coHours: 60, co: 390000, rows: 13 },
    "JOB-LDB-06": { hours: 154, contract: 1085000, coHours: 40, co: 260000, rows: 8 },
  };
  let contractCents = 0;
  let changeOrderCents = 0;
  for (const [jobId, want] of Object.entries(pinned)) {
    const rows = time.rows.filter((r) => r.job_id === jobId);
    assert.equal(rows.length, want.rows, `${jobId}: the row count`);
    const hours = (scope) => rows.filter((r) => r.scope === scope).reduce((sum, r) => sum + Number(r.hours), 0);
    const cost = (scope) => rows.filter((r) => r.scope === scope).reduce((sum, r) => sum + toCents(r.entry_cost_usd), 0);
    assert.equal(hours("contract"), want.hours, `${jobId}: the contract hours`);
    assert.equal(cost("contract"), want.contract, `${jobId}: the contract cost in cents`);
    assert.equal(hours("change_order"), want.coHours, `${jobId}: the change-order hours`);
    assert.equal(cost("change_order"), want.co, `${jobId}: the change-order cost in cents`);
    contractCents += cost("contract");
    changeOrderCents += cost("change_order");
  }
  assert.equal(contractCents, 13913000, "SMB-20: the contract cost total in cents");
  assert.equal(changeOrderCents, 793000, "SMB-20: the change-order cost total in cents");
  assert.equal(time.rows.reduce((sum, r) => sum + Number(r.hours), 0), 1926 + 122, "SMB-20: the hour total");

  // A week's hours are the group total over its week count, so every row of a
  // group carries the same whole number of hours.
  const groups = new Map();
  for (const r of time.rows) {
    const key = `${r.job_id}|${r.crew_role}|${r.scope}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  for (const [key, rows] of groups) {
    assert.equal(new Set(rows.map((r) => r.hours)).size, 1, `${key} carries a different hour count in different weeks`);
  }
  assert.equal(count(time.rows, (r) => r.scope === "contract"), 64, "SMB-20: the contract-scope row count");
  assert.equal(count(time.rows, (r) => r.scope === "change_order"), 3, "SMB-20: the change-order row count");
});

test("SMB-20: change_order_id is non-empty exactly when scope reads change_order, and every one resolves in SMB-22 (T-D6)", () => {
  const openByJob = new Map(progress.rows.map((r) => [r.job_id, r.open_change_order_id]));
  for (const r of time.rows) {
    assert.ok(["contract", "change_order"].includes(r.scope), `${r.entry_id} carries scope "${r.scope}"`);
    assert.equal(
      r.change_order_id !== "", r.scope === "change_order",
      `${r.entry_id} carries change_order_id "${r.change_order_id}" against a scope of "${r.scope}"`
    );
    if (r.change_order_id === "") continue;
    assert.match(r.change_order_id, /^CHO-LDB-\d{2}$/, `${r.entry_id} carries change_order_id "${r.change_order_id}"`);
    assert.equal(r.change_order_id, openByJob.get(r.job_id), `${r.entry_id} cites a change order its own job does not carry`);
  }
  // The join closes in the other direction too: three of the four open change
  // orders carry time, and the fourth is the one the plan says is all expense.
  const cited = new Set(time.rows.filter((r) => r.change_order_id !== "").map((r) => r.change_order_id));
  assert.equal(cited.size, 3, "SMB-20: the count of change orders carrying time");
  const open = new Set(column(progress, "open_change_order_id").filter((v) => v !== ""));
  assert.deepEqual([...cited].filter((id) => !open.has(id)), [], "SMB-20 cites a change order the snapshot does not carry");
  assert.deepEqual([...open].filter((id) => !cited.has(id)), ["CHO-LDB-01"], "the change order carrying no time moved");
});

test("SMB-20: every week_ending is a Friday inside its job's span, and the renovation's inside its own role window (T-D7)", () => {
  for (const r of time.rows) {
    assert.ok(isFriday(r.week_ending), `${r.entry_id} ends its week on ${r.week_ending}, which is not a Friday`);
    assert.ok(r.week_ending <= AS_OF, `${r.entry_id} is dated ${r.week_ending}, after the as-of date`);
  }

  // The job span sweep, with the one stated exception asserted rather than
  // allowed: design development runs from the day the proposal was approved to
  // the Friday before the crew arrives, which is before the renovation's own
  // start_date, because start_date is SMB-04's kickoff stage.
  const early = time.rows.filter((r) => r.week_ending < jobWindow(r.job_id).start_date);
  assert.equal(early.length, 2, "SMB-20: the count of weeks before their own job's start date");
  const windows = okaforWindows();
  for (const r of early) {
    assert.equal(r.job_id, "JOB-LDB-01", `${r.entry_id} runs before its job starts and is not on the renovation`);
    assert.equal(r.crew_role, "design", `${r.entry_id} runs before its job starts and is not design`);
    assert.ok(
      r.week_ending >= windows.design.from && r.week_ending <= windows.design.to,
      `${r.entry_id} is outside the ${windows.design.from} to ${windows.design.to} design window`
    );
  }
  assert.equal(windows.design.from, "2026-02-02", "the design window no longer opens at the proposal approval");
  assert.equal(windows.design.to, "2026-02-13", "the design window no longer closes on the Friday before kickoff");

  // Every renovation week inside the window SMB-16 and SMB-04 give its role.
  for (const r of time.rows.filter((row) => row.job_id === "JOB-LDB-01")) {
    const window = windows[r.crew_role];
    assert.ok(window, `${r.crew_role} has no window on the renovation`);
    assert.ok(
      r.week_ending >= window.from && r.week_ending <= window.to,
      `${r.entry_id} ends its ${r.crew_role} week on ${r.week_ending}, outside ${window.from} to ${window.to}`
    );
  }
  // The four single-milestone windows are the schedule's own dates, not this
  // file's: if SMB-16 moves a milestone, the window moves with it.
  assert.equal(windows.demolition.to, milestone("MST-LDB-02").actual_completion, "the demolition window is not SMB-16's");
  assert.equal(windows.plumbing.from, milestone("MST-LDB-03").actual_start, "the rough in window is not SMB-16's");
  assert.equal(windows.carpentry.to, milestone("MST-LDB-06").planned_end, "the delivery window is not SMB-16's");
});

test("SMB-20: no person is named anywhere in the sixty-seven rows, in any column (T-D8, rule R-ROLE)", () => {
  const names = canonPersonNames();
  assert.ok(names.size > 0, "canon/people.md parsed to no names, so this screen would pass on anything");
  const text = textOf("SMB-20", "time-entries-mock.csv");
  for (const name of names) assert.ok(!text.includes(name), `SMB-20 carries the canon person name "${name}"`);

  for (const forbidden of ["contact_name", "contact_email", "contact_phone", "employee_id", "crew_name", "worker", "initials"]) {
    assert.ok(!time.cols.includes(forbidden), `SMB-20 carries a "${forbidden}" column`);
  }
  // Every cell is a namespaced id, a vocabulary word, a date, a number or a
  // money string. Nothing that could be somebody's name survives that.
  const allowed = {
    entry_id: /^TME-LDB-\d{2}$/,
    week_ending: ISO_DATE,
    job_id: /^JOB-LDB-\d{2}$/,
    scope: /^(contract|change_order)$/,
    change_order_id: /^(CHO-LDB-\d{2})?$/,
    crew_role: new RegExp(`^(${CREW_ROLES.join("|")})$`),
    crew_slot: /^CRW-LDB-\d{2}$/,
    hours: /^\d+$/,
    cost_rate_usd: /^\d+\.\d{2}$/,
    entry_cost_usd: /^\d+\.\d{2}$/,
    record_type: /^mock$/,
  };
  assert.deepEqual(Object.keys(allowed).sort(), [...time.cols].sort(), "SMB-20's header and this screen's shape list disagree");
  for (const r of time.rows) {
    for (const [col, shape] of Object.entries(allowed)) {
      assert.match(r[col], shape, `${r.entry_id}: ${col} carries "${r[col]}"`);
    }
  }
});

// --------------------------------------------------------------------- SMB-21

test("SMB-21: the header is the spec's, thirty-four rows, ids gapless, the three overhead rows last (T-E1)", () => {
  assert.deepEqual(expenses.cols, specs.byId.get("SMB-21").columns, "SMB-21: the header is not spec.columns");
  assert.equal(expenses.rows.length, 34, "SMB-21: the row count moved");
  const ids = column(expenses, "expense_id");
  assert.deepEqual(
    ids, ids.map((_, i) => `JEX-LDB-${String(i + 1).padStart(2, "0")}`),
    "SMB-21: the expense ids are not gapless from 01"
  );
  assert.equal(count(expenses.rows, (r) => r.job_id !== ""), 31, "SMB-21: the job-coded row count");
  assert.equal(count(expenses.rows, (r) => r.job_id === ""), 3, "SMB-21: the overhead row count");
  const jobless = expenses.rows.map((r, i) => (r.job_id === "" ? i : -1)).filter((i) => i >= 0);
  assert.deepEqual(jobless, [31, 32, 33], "SMB-21: the overhead rows are not the last three");
  for (const r of expenses.rows) assert.equal(r.record_type, "mock", `${r.expense_id} carries record_type "${r.record_type}"`);
  // Inside a job, every row but the renovation's runs in expense_date order;
  // the renovation's seven run in the approved proposal's own line order.
  for (const jobId of [...new Set(column(expenses, "job_id"))].filter((id) => id !== "" && id !== "JOB-LDB-01")) {
    const dates = expenses.rows.filter((r) => r.job_id === jobId).map((r) => r.expense_date);
    assert.deepEqual(dates, [...dates].sort(), `SMB-21: ${jobId} lists its expenses out of date order`);
  }
});

test("SMB-21: P4 at both cardinalities, one personal purchase coded to a job inside four non-job categories (T-E2)", () => {
  // Card 1: the rule as stated. A category outside the job-cost set, on a row
  // that carries a job code.
  const outside = expenses.rows.filter((r) => !JOB_COST_CATEGORIES.includes(r.expense_category));
  const plant = outside.filter((r) => r.job_id !== "");
  assert.equal(plant.length, 1, "SMB-21: the count of rows miscoded to a job");
  assert.equal(plant[0].expense_id, "JEX-LDB-12", "the miscode moved");
  assert.equal(plant[0].expense_category, "personal");
  assert.equal(plant[0].job_id, "JOB-LDB-02", "the miscode is not on the job that closed at quarter end");

  // Card 2: drop the one qualifier the rule names, the job code, and grep the
  // category column alone. Four rows answer and three of the four are right.
  assert.equal(outside.length, 4, "SMB-21: the count of rows outside the job-cost set");
  assert.equal(count(outside, (r) => r.job_id === ""), 3, "SMB-21: the count coded exactly right");
  assert.deepEqual(
    outside.filter((r) => r.job_id === "").map((r) => r.expense_category).sort(),
    ["office_overhead", "office_overhead", "software_subscription"],
    "the three correctly uncoded non-job rows moved"
  );

  // It is not found by counterparty: twenty-one rows share the supplier and
  // twenty of the twenty-one are legitimate. It is not found by amount: the
  // amount occurs once in this file and nowhere else in the wave.
  assert.equal(count(expenses.rows, (r) => r.counterparty_canon_id === plant[0].counterparty_canon_id), 21, "the distractor population moved");
  assert.equal(count(expenses.rows, (r) => r.amount_usd === plant[0].amount_usd), 1, "the miscoded amount is not unique in the file");
  for (const id of ["SMB-17", "SMB-18", "SMB-19", "SMB-20", "SMB-22"]) {
    const path = `${specs.byId.get(id).name}.csv`;
    assert.ok(!textOf(id, path).includes(plant[0].amount_usd), `${id} carries the miscoded amount, so a grep finds two`);
  }
  // And the correction is worth finding: it is the whole of one closed job's
  // overstated cost base.
  assert.equal(plant[0].coded_by_role, "owner", "the miscode was not coded by the role the plan pins");
});

test("SMB-21: every counterparty is one of two, the census is 21, 5 and 8, and an internal line is never materials (T-E3)", () => {
  const seated = ["co-133", "co-134"];
  const census = { "co-134": 0, "co-133": 0, "": 0 };
  for (const r of expenses.rows) {
    assert.ok(Object.hasOwn(census, r.counterparty_canon_id), `${r.expense_id} names ${r.counterparty_canon_id}`);
    census[r.counterparty_canon_id] += 1;
    if (r.counterparty_canon_id === "") {
      assert.equal(r.counterparty_name, "", `${r.expense_id} carries a counterparty name with no id`);
      assert.ok(
        !["subcontract", "materials"].includes(r.expense_category),
        `${r.expense_id} is a ${r.expense_category} row with no counterparty`
      );
    } else {
      const entry = canon.get(r.counterparty_canon_id);
      assert.ok(entry, `${r.expense_id} names ${r.counterparty_canon_id}, which canon/companies.md does not seat`);
      assert.equal(r.counterparty_name, entry.name, `${r.expense_id} calls ${r.counterparty_canon_id} something canon does not`);
    }
  }
  assert.equal(census["co-134"], 21, "SMB-21: the materials supplier row count");
  assert.equal(census["co-133"], 5, "SMB-21: the electrical subcontractor row count");
  assert.equal(census[""], 8, "SMB-21: the internal cost line count");
  assert.equal(census["co-134"] + census["co-133"] + census[""], 34, "the census does not cover the file");
  assert.deepEqual([...new Set(column(expenses, "counterparty_canon_id"))].filter((v) => v !== "").sort(), seated, "a third external vendor exists");

  // Every co-133 row is a subcontract row, and twenty of the twenty-one
  // co-134 rows are legitimate material purchases.
  for (const r of expenses.rows.filter((row) => row.counterparty_canon_id === "co-133")) {
    assert.equal(r.expense_category, "subcontract", `${r.expense_id} names the subcontractor and is a ${r.expense_category} row`);
  }
  assert.equal(count(expenses.rows, (r) => r.counterparty_canon_id === "co-134" && r.expense_category === "materials"), 20, "the legitimate materials count");
  // Five internal lines carry a job code and three do not.
  assert.equal(count(expenses.rows, (r) => r.counterparty_canon_id === "" && r.job_id !== ""), 5, "SMB-21: the internal job-cost row count");
  // Every coded_by_role is a role and never a name.
  for (const r of expenses.rows) {
    assert.ok(["owner", "project lead"].includes(r.coded_by_role), `${r.expense_id} carries coded_by_role "${r.coded_by_role}"`);
  }
});

test("SMB-21: the rework figure appears once, on a subcontractor row inside the delivery window, and nowhere else (T-E4)", () => {
  // The figure is read out of the frozen internal notes, not written here.
  const prose = /\$([\d,]+\.\d{2})/g;
  const stated = [...STATUS_NOTES.matchAll(prose)].map((m) => m[1].replace(/,/g, ""));
  assert.ok(stated.includes("6480.00"), "artifacts/SMB-15 no longer states the rework figure this row discharges");
  const figure = stated.find((value) => value === "6480.00");
  assert.equal(stated.filter((value) => value === figure).length, 1, "artifacts/SMB-15 states the rework figure more than once");

  const carrying = expenses.rows.filter((r) => r.amount_usd === figure);
  assert.equal(carrying.length, 1, "SMB-21: the count of rows carrying the rework figure");
  const row = carrying[0];
  assert.equal(row.expense_id, "JEX-LDB-07", "the rework row moved");
  assert.equal(row.counterparty_canon_id, "co-133", "the rework row does not name the electrical subcontractor");
  assert.equal(row.expense_category, "subcontract", "the rework row is not a subcontract cost");
  assert.equal(row.job_id, "JOB-LDB-01", "the rework row is not on the renovation");
  assert.equal(row.scope, "contract", "the rework row is change-order scope, and the notes say there is no change order");
  assert.ok(row.expense_date >= "2026-02-16" && row.expense_date <= "2026-03-27", "the rework is dated outside the delivery window");
  assert.equal(row.expense_date, "2026-03-09", "the rework is no longer dated the day the panel circuits task completed");

  // It is correctly coded, so it is not the miscode.
  const miscode = expenses.rows.filter((r) => r.job_id !== "" && !JOB_COST_CATEGORIES.includes(r.expense_category));
  assert.notEqual(row.expense_id, miscode[0].expense_id, "the rework row and the miscode are the same row");

  // It overran the proposal's contingency allowance, which is what the notes
  // say and which is read off the proposal rather than typed.
  const contingency = proposalLines.find((l) => l.line_id === "PLI-LDB-12");
  assert.equal(rateById.get(contingency.rate_id).rate_class, "allowance", "PLI-LDB-12 is no longer an allowance");
  assert.ok(toCents(figure) > toCents(contingency.line_total_usd), "the rework no longer overruns the contingency allowance");
  assert.equal(toCents(figure) - toCents(contingency.line_total_usd), 198000, "the contingency overrun moved");

  // And it appears in no other file of the wave, in either sign.
  for (const id of ["SMB-17", "SMB-18", "SMB-19", "SMB-20", "SMB-22"]) {
    const text = textOf(id, `${specs.byId.get(id).name}.csv`);
    assert.ok(!text.includes(figure), `${id} carries the rework figure, and the plan puts it in exactly one cell`);
  }
  for (const table of [time, expenses, progress]) {
    for (const r of table.rows) {
      for (const [col, value] of Object.entries(r)) {
        if (col === "amount_usd" && r.expense_id === row.expense_id) continue;
        assert.notEqual(value, `-${figure}`, `a cell carries the rework figure negated in ${col}`);
        assert.notEqual(value, figure, `a second cell carries the rework figure in ${col}`);
      }
    }
  }
});

test("SMB-21: each of the proposal's six cost-bearing lines has one renovation row, each strictly below it (T-E5)", () => {
  // The six lines are found by rate class out of the proposal's own appendix,
  // not by a list written here: every subcontract and materials line carries an
  // external cost, and the five labour lines and the allowance do not.
  const bearing = proposalLines.filter((line) => ["subcontract", "materials"].includes(rateById.get(line.rate_id).rate_class));
  assert.equal(bearing.length, 6, "SMB-06 no longer carries six cost-bearing line items");

  // Each row is matched to its line by what it says it bought, which is the
  // only link the twelve columns carry.
  const keyword = {
    "PLI-LDB-03": "plumbing fixtures",
    "PLI-LDB-04": "device set",
    "PLI-LDB-05": "cabinetry supply",
    "PLI-LDB-06": "quartz",
    "PLI-LDB-07": "tile",
    "PLI-LDB-08": "vanity",
  };
  const okafor = expenses.rows.filter((r) => r.job_id === "JOB-LDB-01");
  assert.equal(okafor.length, 7, "SMB-21: the renovation's row count");
  const matched = new Set();
  for (const line of bearing) {
    const word = keyword[line.line_id];
    assert.ok(word, `${line.line_id} is cost bearing and this screen has no way to find its row`);
    const rows = okafor.filter((r) => r.description.includes(word));
    assert.equal(rows.length, 1, `${line.line_id}: the renovation carries ${rows.length} rows describing "${word}"`);
    assert.ok(
      toCents(rows[0].amount_usd) < toCents(line.line_total_usd),
      `${rows[0].expense_id} cost ${rows[0].amount_usd} against a billed line total of ${line.line_total_usd}`
    );
    matched.add(rows[0].expense_id);
  }
  assert.equal(matched.size, 6, "two proposal lines matched the same row");
  // The seventh row is the rework, which costs no proposal line at all.
  const unmatched = okafor.filter((r) => !matched.has(r.expense_id));
  assert.equal(unmatched.length, 1, "the renovation carries more than one row against no proposal line");
  assert.equal(unmatched[0].expense_id, "JEX-LDB-07", "the row against no proposal line is not the rework");
  // And the renovation's total is the sum of the seven, to the cent.
  assert.equal(okafor.reduce((sum, r) => sum + toCents(r.amount_usd), 0), 5851000, "the renovation's expense total moved");
});

test("SMB-21: every per-job expense total, and the file totals they add to (T-E6)", () => {
  const pinned = {
    "JOB-LDB-01": { contract: 5851000, co: 0, rows: 7 },
    "JOB-LDB-02": { contract: 2191000, co: 0, rows: 5 },
    "JOB-LDB-03": { contract: 1396000, co: 185000, rows: 5 },
    "JOB-LDB-04": { contract: 858000, co: 97000, rows: 4 },
    "JOB-LDB-05": { contract: 2449000, co: 285000, rows: 6 },
    "JOB-LDB-06": { contract: 745000, co: 50000, rows: 4 },
  };
  let contract = 0;
  let changeOrder = 0;
  for (const [jobId, want] of Object.entries(pinned)) {
    const rows = expenses.rows.filter((r) => r.job_id === jobId);
    assert.equal(rows.length, want.rows, `${jobId}: the expense row count`);
    const total = (scope) => rows.filter((r) => r.scope === scope).reduce((sum, r) => sum + toCents(r.amount_usd), 0);
    assert.equal(total("contract"), want.contract, `${jobId}: the contract-scope expense in cents`);
    assert.equal(total("change_order"), want.co, `${jobId}: the change-order expense in cents`);
    contract += total("contract");
    changeOrder += total("change_order");
  }
  assert.equal(contract, 13490000, "SMB-21: the contract-scope expense total in cents");
  assert.equal(changeOrder, 617000, "SMB-21: the change-order expense total in cents");
  // The three overhead rows are not job cost and are outside both totals.
  const overhead = expenses.rows.filter((r) => r.job_id === "");
  assert.equal(overhead.reduce((sum, r) => sum + toCents(r.amount_usd), 0), 524800, "SMB-21: the overhead total in cents");
  for (const r of overhead) assert.equal(r.scope, "", `${r.expense_id} carries no job code and a scope of "${r.scope}"`);
});

test("SMB-21: change_order_id is non-empty exactly when scope reads change_order, and every one resolves in SMB-22 (T-E7)", () => {
  const openByJob = new Map(progress.rows.map((r) => [r.job_id, r.open_change_order_id]));
  for (const r of expenses.rows) {
    assert.equal(
      r.change_order_id !== "", r.scope === "change_order",
      `${r.expense_id} carries change_order_id "${r.change_order_id}" against a scope of "${r.scope}"`
    );
    if (r.change_order_id === "") continue;
    assert.equal(r.change_order_id, openByJob.get(r.job_id), `${r.expense_id} cites a change order its own job does not carry`);
  }
  const cited = new Set(expenses.rows.filter((r) => r.change_order_id !== "").map((r) => r.change_order_id));
  const open = new Set(column(progress, "open_change_order_id").filter((v) => v !== ""));
  assert.equal(cited.size, 4, "SMB-21: the count of change orders carrying expense");
  assert.deepEqual([...cited].filter((id) => !open.has(id)), [], "SMB-21 cites a change order the snapshot does not carry");
  assert.deepEqual([...open].filter((id) => !cited.has(id)), [], "a change order carries no expense at all");
});

test("SMB-21: every expense_date sits inside its own job's span, and the renovation's inside the delivery window (T-E8)", () => {
  for (const r of expenses.rows) {
    assert.match(r.expense_date, ISO_DATE, `${r.expense_id} carries expense_date "${r.expense_date}"`);
    assert.ok(!isWeekend(r.expense_date), `${r.expense_id} is dated ${r.expense_date}, a weekend`);
    if (r.job_id === "") {
      // An overhead row belongs to no job, so it is held to the period instead.
      const period = specs.byId.get("SMB-21").period;
      assert.ok(r.expense_date >= period.start && r.expense_date <= period.end, `${r.expense_id} is outside the spec's own period`);
      continue;
    }
    const window = jobWindow(r.job_id);
    assert.ok(r.expense_date >= window.start_date, `${r.expense_id} is dated ${r.expense_date}, before ${r.job_id} started`);
    assert.ok(r.expense_date <= window.as_of_date, `${r.expense_id} is dated ${r.expense_date}, after the as-of date`);
  }
  for (const r of expenses.rows.filter((row) => row.job_id === "JOB-LDB-01")) {
    assert.ok(
      r.expense_date >= "2026-02-16" && r.expense_date <= "2026-03-27",
      `${r.expense_id} is dated ${r.expense_date}, outside the renovation's delivery window`
    );
  }
  // The earliest row in the file opens the period the spec declares.
  assert.equal(column(expenses, "expense_date").sort()[0], specs.byId.get("SMB-21").period.start, "SMB-21's first expense is not its period start");
});

test("SMB-21: removing the miscode moves exactly one job's expense total and leaves the other five untouched (T-E9)", () => {
  const miscode = expenses.rows.filter((r) => r.job_id !== "" && !JOB_COST_CATEGORIES.includes(r.expense_category))[0];
  const totals = (rows) => Object.fromEntries(
    [...new Set(column(progress, "job_id"))].map((jobId) => [
      jobId,
      rows.filter((r) => r.job_id === jobId && r.scope === "contract").reduce((sum, r) => sum + toCents(r.amount_usd), 0),
    ])
  );
  const before = totals(expenses.rows);
  const after = totals(expenses.rows.filter((r) => r.expense_id !== miscode.expense_id));
  const moved = Object.keys(before).filter((jobId) => before[jobId] !== after[jobId]);
  assert.deepEqual(moved, [miscode.job_id], "SMB-21: the miscode moves a different set of jobs from the one it sits on");
  assert.equal(before[miscode.job_id] - after[miscode.job_id], toCents(miscode.amount_usd), "the correction is not the miscoded amount");

  // And what the correction does to that job's margin, recomputed from SMB-22.
  const row = progress.rows.find((r) => r.job_id === miscode.job_id);
  const corrected = toCents(row.contract_margin_usd) + toCents(miscode.amount_usd);
  assert.equal(corrected, 978450, "correcting the miscode no longer moves that job's margin to the plan's figure");
  // Both readings stay above the floor, so this job is a coding problem and not
  // a second threshold problem.
  const floor = (marginCents) => marginCents * 10000 >= Number(row.margin_floor_bp) * toCents(row.revenue_to_date_usd);
  assert.ok(floor(toCents(row.contract_margin_usd)), "the miscoded job is already below the floor as reported");
  assert.ok(floor(corrected), "the miscoded job falls below the floor once corrected, which entangles the two plants");
});

// --------------------------------------------------------------------- SMB-22

test("SMB-22: the header is the spec's, six jobs in job_id order, ids gapless (T-F1)", () => {
  assert.deepEqual(progress.cols, specs.byId.get("SMB-22").columns, "SMB-22: the header is not spec.columns");
  assert.equal(progress.rows.length, 6, "SMB-22: the row count moved");
  const ids = column(progress, "job_id");
  assert.deepEqual(ids, [...ids].sort(), "SMB-22: file order is not job_id order");
  assert.deepEqual(ids, ids.map((_, i) => `JOB-LDB-${String(i + 1).padStart(2, "0")}`), "SMB-22: the job ids are not gapless");
  for (const r of progress.rows) assert.equal(r.as_of_date, AS_OF, `${r.job_id} reports against ${r.as_of_date}`);
  // No answer-key column, by name and by shape.
  for (const forbidden of ["on_track", "true_margin_usd", "is_miscoded", "status", "health", "margin_pct"]) {
    assert.ok(!progress.cols.includes(forbidden), `SMB-22 carries the answer-key column "${forbidden}"`);
  }
});

test("SMB-22: the contract value at percent_complete is an exact number of cents on every row (T-F2)", () => {
  for (const r of progress.rows) {
    assert.match(r.percent_complete, /^\d+$/, `${r.job_id} carries percent_complete "${r.percent_complete}"`);
    const percent = Number(r.percent_complete);
    assert.ok(percent > 0 && percent <= 100, `${r.job_id} reports ${percent} percent complete`);
    assert.equal(
      (toCents(r.contract_value_usd) * percent) % 100, 0,
      `${r.job_id} earns a fraction of a cent at ${percent} percent, so the identity would carry a rounding`
    );
  }
});

test("SMB-22: the margin identity holds to the cent on all six rows, in both of its forms (T-F3)", () => {
  for (const r of progress.rows) {
    const billed = toCents(r.billed_to_date_usd);
    const accrued = toCents(r.accrued_unbilled_usd);
    const revenue = toCents(r.revenue_to_date_usd);
    const timeCost = toCents(r.time_cost_usd);
    const expenseCost = toCents(r.expense_cost_usd);
    const margin = toCents(r.contract_margin_usd);
    assert.equal(billed + accrued, revenue, `${r.job_id}: revenue to date is not billed to date plus accrued unbilled`);
    assert.equal(toCents(r.contract_value_usd) * Number(r.percent_complete) / 100, revenue, `${r.job_id}: revenue to date is not the contract value at its percent complete`);
    assert.equal(revenue - timeCost - expenseCost, margin, `${r.job_id}: the contract margin is not revenue less time cost less expense cost`);
  }
  // The accrual is signed, and the negative one is a bare 2dp string with a
  // minus sign rather than brackets or a second column.
  const negative = progress.rows.filter((r) => toCents(r.accrued_unbilled_usd) < 0);
  assert.equal(negative.length, 1, "SMB-22: the negative accrual count");
  assert.match(negative[0].accrued_unbilled_usd, /^-\d+\.\d{2}$/, "the negative accrual is not a bare signed 2dp string");
});

test("SMB-22: billed_to_date_usd is the sum of that job's invoices in the register, to the cent (T-F4, T-A6)", () => {
  for (const r of progress.rows) {
    const billed = register.rows
      .filter((invoice) => invoice.job_id === r.job_id)
      .reduce((sum, invoice) => sum + toCents(invoice.invoice_amount_usd), 0);
    assert.equal(toCents(r.billed_to_date_usd), billed, `${r.job_id}: billed to date is not the register's own total`);
    assert.ok(billed > 0, `${r.job_id} is billed nothing at all`);
  }
  // T-A5 in the SMB-22 direction: the job join closes both ways.
  const tracked = new Set(column(progress, "job_id"));
  const invoiced = new Set(column(register, "job_id"));
  assert.deepEqual([...invoiced].filter((id) => !tracked.has(id)), [], "the register invoices a job the snapshot does not track");
  assert.deepEqual([...tracked].filter((id) => !invoiced.has(id)), [], "the snapshot tracks a job no invoice cites");
});

test("SMB-22: time_cost_usd and expense_cost_usd are the contract-scope sums of SMB-20 and SMB-21 (T-F5)", () => {
  for (const r of progress.rows) {
    const timeCost = time.rows
      .filter((t) => t.job_id === r.job_id && t.scope === "contract")
      .reduce((sum, t) => sum + toCents(t.entry_cost_usd), 0);
    const expenseCost = expenses.rows
      .filter((e) => e.job_id === r.job_id && e.scope === "contract")
      .reduce((sum, e) => sum + toCents(e.amount_usd), 0);
    assert.equal(toCents(r.time_cost_usd), timeCost, `${r.job_id}: time cost is not the sum of its own time entries`);
    assert.equal(toCents(r.expense_cost_usd), expenseCost, `${r.job_id}: expense cost is not the sum of its own expense rows`);
  }
  // The column totals, so a compensating pair of errors inside one job still
  // has to survive the file-wide sum.
  assert.equal(progress.rows.reduce((sum, r) => sum + toCents(r.time_cost_usd), 0), 13913000, "SMB-22: the time cost column total");
  assert.equal(progress.rows.reduce((sum, r) => sum + toCents(r.expense_cost_usd), 0), 13490000, "SMB-22: the expense cost column total");
});

test("SMB-22: open_change_order_value_usd is the change-order sum across SMB-20 and SMB-21, zero exactly when the id is empty (T-F6)", () => {
  for (const r of progress.rows) {
    const fromTime = time.rows
      .filter((t) => t.job_id === r.job_id && t.scope === "change_order")
      .reduce((sum, t) => sum + toCents(t.entry_cost_usd), 0);
    const fromExpense = expenses.rows
      .filter((e) => e.job_id === r.job_id && e.scope === "change_order")
      .reduce((sum, e) => sum + toCents(e.amount_usd), 0);
    assert.equal(
      toCents(r.open_change_order_value_usd), fromTime + fromExpense,
      `${r.job_id}: the open change order value is not the change-order cost in SMB-20 and SMB-21`
    );
    assert.equal(
      r.open_change_order_id === "", toCents(r.open_change_order_value_usd) === 0,
      `${r.job_id} carries ${r.open_change_order_value_usd} against the change order id "${r.open_change_order_id}"`
    );
  }
  assert.equal(progress.rows.reduce((sum, r) => sum + toCents(r.open_change_order_value_usd), 0), 1410000, "SMB-22: the change order value total");
  assert.equal(count(progress.rows, (r) => r.open_change_order_id !== ""), 4, "SMB-22: the open change order count");
});

test("SMB-22: P5 at both cardinalities, and the on-track set is the same under both readings of the tolerance (T-F7)", () => {
  // The on-track rule, written here without a division: the gap between
  // percent billed and percent complete is |billed * 100 - percent * contract|
  // and the tolerance band is tolerance * contract, both in integer cents.
  const gap = (r) => Math.abs(toCents(r.billed_to_date_usd) * 100 - Number(r.percent_complete) * toCents(r.contract_value_usd));
  const band = (r) => Number(r.on_track_tolerance_pct) * toCents(r.contract_value_usd);
  const inclusive = progress.rows.filter((r) => gap(r) <= band(r)).map((r) => r.job_id);
  const exclusive = progress.rows.filter((r) => gap(r) < band(r)).map((r) => r.job_id);
  assert.deepEqual(inclusive, exclusive, "a job sits on the tolerance boundary, so the on-track set depends on how a reader reads it");
  assert.equal(inclusive.length, 5, "SMB-22: the on-track count");

  // The six gaps in whole points, so a later edit that moves one onto the
  // boundary fails with the number rather than with a set.
  const points = progress.rows.map((r) => gap(r) / toCents(r.contract_value_usd));
  assert.deepEqual(points, [0, 0, 5, 5, 5, 10], "SMB-22: the six percent-billed gaps moved");

  // Card 1: the rule as stated. On track, an open change order, and a value
  // above the materiality threshold the row itself carries.
  const onTrack = new Set(inclusive);
  const withChangeOrder = progress.rows.filter((r) => onTrack.has(r.job_id) && r.open_change_order_id !== "");
  const plant = withChangeOrder.filter((r) => toCents(r.open_change_order_value_usd) > toCents(r.change_order_materiality_usd));
  assert.equal(plant.length, 1, "SMB-22: the count of on-track jobs carrying a material change order");
  assert.equal(plant[0].job_id, "JOB-LDB-05", "the healthy-looking job moved");

  // Card 2: drop the one qualifier the rule names, the threshold, and flag
  // every on-track job with an open change order. Three answer and two of the
  // three are fine on both readings.
  assert.equal(withChangeOrder.length, 3, "SMB-22: the count of on-track jobs carrying a change order");
  const floor = (marginCents, r) => marginCents * 10000 >= Number(r.margin_floor_bp) * toCents(r.revenue_to_date_usd);
  const fine = withChangeOrder.filter((r) => floor(toCents(r.contract_margin_usd) - toCents(r.open_change_order_value_usd), r));
  assert.equal(fine.length, 2, "SMB-22: the count of flagged jobs that are fine on both readings");
});

test("SMB-22: P6 at both cardinalities, the control found by category rather than by a flag (T-F8)", () => {
  // Card 1: the rule as stated. No open change order, and no expense row whose
  // category is outside the job-cost set.
  const miscodedJobs = new Set(
    expenses.rows.filter((r) => r.job_id !== "" && !JOB_COST_CATEGORIES.includes(r.expense_category)).map((r) => r.job_id)
  );
  const noChangeOrder = progress.rows.filter((r) => r.open_change_order_id === "");
  const control = noChangeOrder.filter((r) => !miscodedJobs.has(r.job_id));
  assert.equal(control.length, 1, "SMB-22: the control count");
  assert.equal(control[0].job_id, "JOB-LDB-01", "the control moved");

  // Card 2: drop the one qualifier the rule names, the miscode, and look only
  // at change orders. Two answer and one of the two is carrying the miscode.
  assert.equal(noChangeOrder.length, 2, "SMB-22: the count of jobs with no open change order");
  assert.deepEqual([...miscodedJobs], ["JOB-LDB-02"], "the miscoded job moved");
  assert.ok(noChangeOrder.some((r) => miscodedJobs.has(r.job_id)), "no job with a clean change order sheet is carrying the miscode");

  // The control is the control because a frozen document says so, and the
  // frozen document is read here rather than quoted.
  assert.ok(STATUS_NOTES.includes("There is no change order on this job"), "artifacts/SMB-15 no longer states that the renovation carries no change order");
  assert.equal(control[0].client_canon_id, okaforRecord.client.client_canon_id, "the control is not the client SMB-04 records");
  // And it clears the floor on both readings, which is what a control is for.
  const floor = (marginCents, r) => marginCents * 10000 >= Number(r.margin_floor_bp) * toCents(r.revenue_to_date_usd);
  assert.ok(floor(toCents(control[0].contract_margin_usd), control[0]), "the control is below the floor as reported");
  assert.ok(floor(toCents(control[0].contract_margin_usd) - toCents(control[0].open_change_order_value_usd), control[0]), "the control is below the floor on its true margin");
});

test("SMB-22: exactly one job clears the floor on its contract margin and fails it once the change order is counted (T-F9)", () => {
  // Two integer cross-multiplications per job, in opposite directions. No
  // division and no float touches this.
  const clears = (marginCents, r) => marginCents * 10000 >= Number(r.margin_floor_bp) * toCents(r.revenue_to_date_usd);
  const crossers = progress.rows.filter((r) => {
    const contract = toCents(r.contract_margin_usd);
    const trueMargin = contract - toCents(r.open_change_order_value_usd);
    return clears(contract, r) && !clears(trueMargin, r);
  });
  assert.equal(crossers.length, 1, "SMB-22: the count of jobs that cross the floor");
  assert.equal(crossers[0].job_id, "JOB-LDB-05", "the job that crosses the floor moved");

  // Every job clears the floor as reported, so the file's surface reading shows
  // nothing wrong anywhere, which is what makes the crossing worth finding.
  for (const r of progress.rows) {
    assert.ok(clears(toCents(r.contract_margin_usd), r), `${r.job_id} is below the floor as reported, so it no longer reads healthy`);
  }
  // The crossing, in the numbers the plan states.
  const r = crossers[0];
  assert.equal(toCents(r.contract_margin_usd), 1180000, "the plant's contract margin moved");
  assert.equal(toCents(r.contract_margin_usd) - toCents(r.open_change_order_value_usd), 505000, "the plant's true margin moved");
  assert.equal(toCents(r.revenue_to_date_usd), 6600000, "the plant's revenue to date moved");
  assert.ok(1180000 * 10000 >= 1500 * 6600000, "the surface reading no longer clears the floor");
  assert.ok(!(505000 * 10000 >= 1500 * 6600000), "the true reading no longer fails the floor");
  // And no other job crosses in the other direction either.
  const reverse = progress.rows.filter((row) => {
    const contract = toCents(row.contract_margin_usd);
    return !clears(contract, row) && clears(contract - toCents(row.open_change_order_value_usd), row);
  });
  assert.equal(reverse.length, 0, "a job fails the floor as reported and clears it once the change order is counted");
});

test("SMB-22: exactly one job is billed ahead of the work it has performed (T-F10)", () => {
  const overbilled = progress.rows.filter((r) => toCents(r.accrued_unbilled_usd) < 0);
  assert.equal(overbilled.length, 1, "SMB-22: the count of jobs billed ahead of the work");
  assert.equal(overbilled[0].job_id, "JOB-LDB-06", "the overbilled job moved");
  assert.equal(toCents(overbilled[0].accrued_unbilled_usd), -540000, "the overbilled job's accrual moved");
  // It is also the one job that does not read on track, which is what gives
  // P5's "reads on track" qualifier a population of five out of six.
  const gap = (r) => Math.abs(toCents(r.billed_to_date_usd) * 100 - Number(r.percent_complete) * toCents(r.contract_value_usd));
  const band = (r) => Number(r.on_track_tolerance_pct) * toCents(r.contract_value_usd);
  assert.ok(gap(overbilled[0]) > band(overbilled[0]), "the overbilled job reads on track, so nothing in the file reads off track");
});

test("SMB-22: the three thresholds are constant across the file and every one is an exact integer (T-F11)", () => {
  assert.deepEqual([...new Set(column(progress, "change_order_materiality_usd"))], ["5000.00"], "the materiality threshold is not constant");
  assert.deepEqual([...new Set(column(progress, "margin_floor_bp"))], ["1500"], "the margin floor is not constant");
  assert.deepEqual([...new Set(column(progress, "on_track_tolerance_pct"))], ["8"], "the tolerance is not constant");
  for (const r of progress.rows) {
    assert.match(r.margin_floor_bp, /^\d+$/, "the margin floor is not an integer in basis points");
    assert.match(r.on_track_tolerance_pct, /^\d+$/, "the tolerance is not a whole number of points");
  }
  // No quotient column anywhere: every money cell is a bare 2dp string and the
  // only two integer columns are the two thresholds and percent_complete.
  const money = [
    "contract_value_usd", "billed_to_date_usd", "accrued_unbilled_usd", "revenue_to_date_usd",
    "time_cost_usd", "expense_cost_usd", "contract_margin_usd", "open_change_order_value_usd",
    "change_order_materiality_usd",
  ];
  for (const r of progress.rows) {
    for (const col of money) assert.match(r[col], /^-?\d+\.\d{2}$/, `${r.job_id}: ${col} carries "${r[col]}"`);
  }
});

test("SMB-22: the two already-recorded jobs read four cells off their client records, never retyped (T-F12)", () => {
  const pairs = [
    ["JOB-LDB-01", okaforRecord],
    ["JOB-LDB-02", officeRecord],
  ];
  for (const [jobId, record] of pairs) {
    const r = progress.rows.find((row) => row.job_id === jobId);
    assert.equal(r.project_name, record.client.project_name, `${jobId}: project_name is not the record's`);
    assert.equal(r.contract_value_usd, record.client.contract_value_usd, `${jobId}: contract_value_usd is not the record's`);
    assert.equal(r.client_canon_id, record.client.client_canon_id, `${jobId}: client_canon_id is not the record's`);
    assert.equal(r.client_name, record.client.client_name, `${jobId}: client_name is not the record's`);
    assert.equal(r.start_date, stageDate(record, "kickoff"), `${jobId}: start_date is not the record's kickoff stage`);
    assert.equal(r.planned_end_date, stageDate(record, "closeout"), `${jobId}: planned_end_date is not the record's closeout stage`);
  }
  // The other four jobs are this file's, and their windows are weekdays that
  // run past the as-of date, which is what "still running" means.
  for (const r of progress.rows.filter((row) => !pairs.some(([jobId]) => jobId === row.job_id))) {
    assert.ok(!isWeekend(r.start_date), `${r.job_id} starts on ${r.start_date}, a weekend`);
    assert.ok(!isWeekend(r.planned_end_date), `${r.job_id} is planned to end on ${r.planned_end_date}, a weekend`);
    assert.ok(r.planned_end_date > AS_OF, `${r.job_id} is under way and planned to end on or before the as-of date`);
    assert.ok(Number(r.percent_complete) < 100, `${r.job_id} is complete and still carries a planned end after the as-of date`);
  }
});

test("SMB-22: every window runs forwards, and every cost row of every job sits inside its own job's span (T-F13)", () => {
  for (const r of progress.rows) {
    assert.ok(r.planned_end_date > r.start_date, `${r.job_id} is planned to end at or before it starts`);
    assert.ok(daysBetween(r.start_date, r.planned_end_date) > 0, `${r.job_id}'s window is not a forward span of days`);
  }
  // Two sweeps over the emitted rows, both against the snapshot's own dates.
  const expenseOutside = expenses.rows.filter((r) => {
    if (r.job_id === "") return false;
    const w = jobWindow(r.job_id);
    return r.expense_date < w.start_date || r.expense_date > w.as_of_date;
  });
  assert.deepEqual(expenseOutside.map((r) => r.expense_id), [], "an expense row is dated outside its own job's span");

  const timeOutside = time.rows.filter((r) => {
    const w = jobWindow(r.job_id);
    return r.week_ending < w.start_date || r.week_ending > w.as_of_date;
  });
  // The two design weeks are the stated exception and are the only rows here.
  assert.deepEqual(
    timeOutside.map((r) => r.entry_id), ["TME-LDB-01", "TME-LDB-02"],
    "the set of time rows outside their own job's span is not the renovation's two design weeks"
  );
  for (const r of timeOutside) {
    assert.equal(r.crew_role, "design");
    assert.ok(r.week_ending < jobWindow(r.job_id).start_date, `${r.entry_id} is outside its span in the other direction`);
  }
});

// ------------------------------------------------------------- pack-wide rules

test("SMB-20, SMB-21 and SMB-22 name no processor, gateway, card network or bank product, and carry no mock notice (rule R-MOCK)", () => {
  assert.ok(MOCK_VOCABULARY.length >= 30, "the deny-list has shrunk");
  const files = {
    "SMB-20": textOf("SMB-20", "time-entries-mock.csv"),
    "SMB-21": textOf("SMB-21", "job-expenses-mock.csv"),
    "SMB-22": textOf("SMB-22", "job-progress.csv"),
  };
  for (const [id, text] of Object.entries(files)) {
    const words = new Set(text.toLowerCase().split(/[^a-z0-9]+/));
    for (const term of MOCK_VOCABULARY) {
      assert.ok(!words.has(term), `${id} names "${term}", which is a processor, gateway, card network or bank product`);
    }
    assert.doesNotMatch(text, /\b\d{12,}\b/, `${id} carries a long bare digit run, which reads as an instrument number`);
    assert.ok(!text.includes(EM_DASH), `${id} carries an em dash`);
    assert.ok(!text.includes(EN_DASH), `${id} carries an en dash`);
  }
  // No thousands separator in any cell: a money cell carrying a comma stops
  // parsing as a number for every consumer that reads it. Checked per cell
  // rather than over the raw text, because a CSV line is itself comma
  // separated and a raw scan cannot tell the two apart.
  for (const table of [time, expenses, progress]) {
    for (const row of table.rows) {
      for (const [col, value] of Object.entries(row)) {
        assert.doesNotMatch(value, /\d,\d/, `a cell carries a thousands-separated figure in ${col}: "${value}"`);
      }
    }
  }

  // record_type is mock on the two files that carry cost records, and the
  // payment notice belongs to the payment log and appears on neither.
  for (const table of [time, expenses]) {
    for (const r of table.rows) assert.equal(r.record_type, "mock", "a cost row is not a mock record");
  }
  for (const [id, text] of Object.entries(files)) {
    assert.ok(!text.includes("MOCK PAYMENT RECORD"), `${id} carries the payment notice, which belongs to the payment log`);
  }
  assert.ok(!progress.cols.includes("record_type"), "SMB-22 carries a record_type column, and it records no transaction");
});

test("SMB-20, SMB-21 and SMB-22 name no person, and a human appears only as a role or a household (rule R-ROLE)", () => {
  const names = canonPersonNames();
  for (const [id, path] of [["SMB-20", "time-entries-mock.csv"], ["SMB-21", "job-expenses-mock.csv"], ["SMB-22", "job-progress.csv"]]) {
    const text = textOf(id, path);
    for (const name of names) assert.ok(!text.includes(name), `${id} carries the canon person name "${name}"`);
    for (const forbidden of ["contact_name", "contact_email", "contact_phone", "employee_id", "owner_name"]) {
      assert.ok(!csvTable(text).cols.includes(forbidden), `${id} carries a "${forbidden}" column`);
    }
  }
  // The only human-shaped strings in the wave are a canon household, a canon
  // business, a generated household and two role words.
  for (const r of progress.rows) {
    const seated = canon.get(r.client_canon_id);
    assert.ok(
      (seated && seated.name === r.client_name) || /^The \S+ household$/.test(r.client_name),
      `SMB-22 carries the client name "${r.client_name}", which is neither a canon name nor a household`
    );
  }
  for (const r of expenses.rows) {
    assert.ok(["owner", "project lead"].includes(r.coded_by_role), `${r.expense_id} carries coded_by_role "${r.coded_by_role}"`);
  }
  // SMB-21's description is free text and unscreened above: no capitalised
  // word survives except a month name, and no digit survives at all, so an
  // invented person name, a bare canon surname or a phone-shaped digit
  // string cannot hide in a description cell.
  const MONTHS = /^(January|February|March|April|May|June|July|August|September|October|November|December)$/;
  for (const r of expenses.rows) {
    assert.match(r.description, /^[a-z][a-zA-Z0-9 ,.'-]*$/, `${r.expense_id} description`);
    for (const word of r.description.split(/[^A-Za-z]+/).filter(Boolean)) {
      assert.ok(/^[a-z]/.test(word) || MONTHS.test(word),
        `${r.expense_id} description carries the capitalised word "${word}", which could be a name`);
    }
    assert.doesNotMatch(r.description, /\d/, `${r.expense_id} description carries a digit`);
  }
  // SMB-22's project_name is free-ish text too: allow the client's own
  // already-disclosed identity (a household surname, or a canon business's
  // name) to lead it capitalised, in order, and nothing else, and no digit.
  for (const r of progress.rows) {
    assert.doesNotMatch(r.project_name, /\d/, `${r.job_id} project_name carries a digit`);
    const household = /^The (\S+) household$/.exec(r.client_name);
    const identityWords = household
      ? [household[1]]
      : r.client_name.replace(/\s+(Inc\.|LLC|LLP|Ltd\.?|Co\.)$/, "").split(/\s+/);
    r.project_name.split(/\s+/).forEach((word, i) => {
      if (!/^[A-Z]/.test(word)) return;
      assert.equal(word, identityWords[i], `${r.job_id} project_name carries the capitalised word "${word}", which could be a name`);
    });
  }
});

test("SMB-20, SMB-21 and SMB-22 mint only their own namespaced id classes, and every client id is seated or reserved (rules R-NS and the band)", () => {
  const TWO_DIGIT = new Set(["TME-LDB-", "JEX-LDB-", "CHO-LDB-", "CRW-LDB-", "JOB-LDB-"]);
  const files = {
    "SMB-20": textOf("SMB-20", "time-entries-mock.csv"),
    "SMB-21": textOf("SMB-21", "job-expenses-mock.csv"),
    "SMB-22": textOf("SMB-22", "job-progress.csv"),
  };
  const seen = new Set();
  for (const [id, text] of Object.entries(files)) {
    for (const match of text.matchAll(/\b([A-Z]{2,4})-LDB-([0-9-]+)\b/g)) {
      const idClass = `${match[1]}-LDB-`;
      assert.ok(TWO_DIGIT.has(idClass), `${id} mints "${match[0]}", whose class ${idClass} is not a job costing class`);
      assert.equal(match[2].length, 2, `${id} carries "${match[0]}", and the format is two zero-padded digits`);
      seen.add(idClass);
    }
    for (const idClass of TWO_DIGIT) {
      const bare = idClass.replace("LDB-", "");
      assert.doesNotMatch(text, new RegExp(`\\b${bare}\\d`), `${id} carries an un-namespaced ${bare} id`);
    }
    // EXP- is the class this cluster did NOT reach for, because the finance
    // expense-report pack already spends it.
    assert.doesNotMatch(text, /\bEXP-/, `${id} mints an EXP- id, which the finance pack already spends`);
  }
  for (const idClass of TWO_DIGIT) {
    assert.ok(seen.has(idClass), `no job costing file mints ${idClass}, so this screen checks nothing for it`);
  }

  // The co-200 band rule, over every canon id the wave names.
  const inBand = new Set();
  for (const [id, text] of Object.entries(files)) {
    for (const match of text.matchAll(/\bco-(\d{3})\b/g)) {
      if (canon.has(match[0])) continue;
      const number = Number(match[1]);
      assert.ok(
        number >= BAND.first && number <= BAND.last,
        `${id} names ${match[0]}, which canon does not seat and the reserved band does not cover`
      );
      inBand.add(match[0]);
    }
  }
  assert.deepEqual([...inBand].sort(), ["co-201", "co-202", "co-203"], "the reserved-band ids the wave consumes have moved");
});

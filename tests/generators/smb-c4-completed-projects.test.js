// SMB-23 completed-projects-log: the one deterministic artifact of the
// referral wave, screened from its emitted bytes.
//
//   datasets/smb/completed-projects-log/  six projects brought to substantial
//                                         completion in the first quarter
//
// Every check recomputes its answer from the shipped bytes the way a consumer
// would. Nothing here imports the SMB-23 builder, its predicates, its census
// constants or its vocabulary lists: the open-issue rule, the archetypes, the
// weekday arithmetic and the state-word list are all written again in this
// file, so the generator and its screen can genuinely disagree.
//
// The two mutations this file exists to catch, in the data plan's own words: a
// January row's issue_resolved_date emptied, which makes two open issues while
// every other count still looks right; and the renovation's
// issue_resolved_date filled, which contradicts the milestone schedule.
//
// Four mechanical rules, carried from the cluster 3 screens.
//
//   The census rule. Every count is an equality, never a floor.
//
//   The plant rule. P1 is asserted at BOTH cardinalities: 1 under the rule
//   (an opened date and no resolved date) and 3 with the named qualifier
//   dropped (an opened date at all).
//
//   The join rule. A join is two set differences, both empty.
//
//   The derive rule. Bytes another artifact already froze are re-read out of
//   its emitted output: SMB-04's and SMB-05's JSON, SMB-16's and SMB-22's CSV,
//   SMB-03's queue and SMB-17's register, so an upstream edit moves this
//   screen with it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { assertNoCanonEcho } from "../../datagen/src/generators/smb-03-inbound-inquiry-queue.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));

const emitted = (id) => generateArtifact(specs.byId.get(id), canon);

const LOG_FILE = "completed-projects-log.csv";

/** SMB-23, emitted lazily so a missing generator fails each test by name. */
let cachedLog = null;
function log() {
  if (!cachedLog) cachedLog = csvTable(fileByPath(emitted("SMB-23"), LOG_FILE).content);
  return cachedLog;
}

const okaforRecord = JSON.parse(fileByPath(emitted("SMB-04"), "client-record-okafor.json").content);
const officeRecord = JSON.parse(fileByPath(emitted("SMB-05"), "client-record-co002-office-refresh.json").content);
const schedule = csvTable(fileByPath(emitted("SMB-16"), "milestone-schedule.csv").content);
const progress = csvTable(fileByPath(emitted("SMB-22"), "job-progress.csv").content);
const payments = csvTable(fileByPath(emitted("SMB-18"), "payment-status-mock.csv").content);
const register = csvTable(fileByPath(emitted("SMB-17"), "invoices-issued.csv").content);
const queue = csvTable(fileByPath(emitted("SMB-03"), "inbound-inquiry-queue.csv").content);

/** Every cluster 3 file, as text, read through the generators rather than typed paths. */
const C3_IDS = ["SMB-17", "SMB-18", "SMB-19", "SMB-20", "SMB-21", "SMB-22"];
const c3Texts = () => C3_IDS.map((id) => ({ id, text: emitted(id).map((f) => f.content).join("\n") }));

/** The as-of date the whole pack reports against, read off the client record. */
const AS_OF = okaforRecord.client.as_of_date;

/** The day the invoice register opens, which no January date may reach. */
const REGISTER_OPENS = "2026-02-01";

/** The four band ids the plan gives the January households. */
const BAND_IDS = ["co-204", "co-205", "co-206", "co-207"];

/** The ids cluster 3 already spent, which no C4 household may reuse. */
const C3_BAND_IDS = ["co-201", "co-202", "co-203"];

/**
 * The state words an issue summary may never carry, typed here and not
 * imported: the date columns carry the state, and a summary naming it would be
 * an answer key.
 */
const STATE_WORDS = ["open", "resolved", "outstanding", "still", "pending", "awaiting", "fixed", "closed"];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const count = (rows, predicate) => rows.filter(predicate).length;
const setDiff = (a, b) => [...a].filter((x) => !b.has(x));

/**
 * Days from the civil epoch, the days-from-civil algorithm, written out rather
 * than taken from datagen/src/dates.js so this file can disagree with the
 * builder. No Date object is constructed anywhere in this file.
 */
function epochDay(iso) {
  assert.match(iso, ISO_DATE, `"${iso}" is not an ISO date`);
  const [y, m, d] = iso.split("-").map(Number);
  const year = m <= 2 ? y - 1 : y;
  const era = Math.floor(year / 400);
  const yearOfEra = year - era * 400;
  const dayOfYear = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

/** 0 is Sunday. 1970-01-01 was a Thursday. */
const weekdayOf = (iso) => ((epochDay(iso) + 4) % 7 + 7) % 7;
const isWeekday = (iso) => weekdayOf(iso) !== 0 && weekdayOf(iso) !== 6;

/** The substantial_completion event date a client record carries. */
function substantialCompletion(record) {
  const stages = record.stages.filter((s) => s.stage === "substantial_completion");
  assert.equal(stages.length, 1, `${record.client.client_canon_id} carries ${stages.length} substantial_completion stages`);
  return stages[0].event_date;
}

const milestone = (id) => {
  const found = schedule.rows.filter((r) => r.milestone_id === id);
  assert.equal(found.length, 1, `SMB-16 carries ${found.length} rows for ${id}`);
  return found[0];
};

/** The household surname a generated client name carries, or null. */
const householdSurname = (name) => /^The (\S+) household$/.exec(name)?.[1] ?? null;

// ========================================================================= T-H1

test("SMB-23 T-H1: the header is spec.columns, six rows, job_id unique and in file order", () => {
  const { cols, rows } = log();
  const spec = specs.byId.get("SMB-23");
  assert.deepEqual(cols, spec.columns, "SMB-23's emitted header has drifted from spec.columns");
  assert.equal(rows.length, 6, `SMB-23 carries ${rows.length} rows, expected 6`);
  const ids = rows.map((r) => r.job_id);
  assert.equal(new Set(ids).size, 6, "a job_id repeats");
  assert.deepEqual(ids, [...ids].sort(), "the file is not in job_id order");
  for (const id of ids) assert.match(id, /^JOB-LDB-\d{2}$/, `${id} is not a JOB-LDB id`);
  assert.deepEqual(
    ids, ["JOB-LDB-01", "JOB-LDB-02", "JOB-LDB-07", "JOB-LDB-08", "JOB-LDB-09", "JOB-LDB-10"],
    "the job id blocks moved: C3's two completed jobs plus the four-job January block the plan opens"
  );
  assert.equal(count(rows, (r) => r.as_of_date === "2026-03-31"), 6, "as_of_date is not 2026-03-31 on every row");
  assert.equal(AS_OF, "2026-03-31", "SMB-04's as-of date moved");
  assert.equal(count(rows, (r) => r.project_type === "residential"), 5, "the residential count");
  assert.equal(count(rows, (r) => r.project_type === "commercial"), 1, "the commercial count");
  assert.equal(count(rows, (r) => canon.has(r.client_canon_id)), 2, "the seated-client count");
  assert.equal(count(rows, (r) => !canon.has(r.client_canon_id)), 4, "the band-client count");
  assert.equal(new Set(rows.map((r) => r.client_canon_id)).size, 6, "a client carries two completed projects");
});

test("SMB-23: generating twice is byte identical, and the committed file is the emitted file", () => {
  const first = fileByPath(emitted("SMB-23"), LOG_FILE).content;
  const second = fileByPath(emitted("SMB-23"), LOG_FILE).content;
  assert.equal(first, second, "SMB-23 is not deterministic");
  const { name } = specs.byId.get("SMB-23");
  const committed = readFileSync(join(REPO_ROOT, "datasets", "smb", name, LOG_FILE), "utf8");
  assert.equal(committed, first, "the committed completed-projects-log.csv differs from the generator's output");
});

// ========================================================================= T-H2

test("SMB-23 T-H2: one open support issue under the rule, three with the qualifier dropped, archetypes 3 / 2 / 1", () => {
  const { rows } = log();

  // The issue columns move together: an issue has an id, an opened date and a
  // summary, or none of the three.
  for (const r of rows) {
    const present = [r.issue_id, r.issue_opened_date, r.issue_summary].map((v) => v !== "");
    assert.ok(
      present.every(Boolean) || present.every((p) => !p),
      `${r.job_id} carries a partial issue: id "${r.issue_id}", opened "${r.issue_opened_date}", summary "${r.issue_summary}"`
    );
    if (r.issue_opened_date === "") {
      assert.equal(r.issue_resolved_date, "", `${r.job_id} resolves an issue it never opened`);
    }
  }

  // P1, both cardinalities.
  const openRule = count(rows, (r) => r.issue_opened_date !== "" && r.issue_resolved_date === "");
  const qualifierDropped = count(rows, (r) => r.issue_opened_date !== "");
  assert.equal(openRule, 1, `${openRule} completed projects carry an open support issue, expected exactly 1`);
  assert.equal(
    qualifierDropped, 3,
    `${qualifierDropped} completed projects carry a support issue at all, expected 3: a loop that blocks on any issue withholds two requests`
  );

  // The archetypes.
  assert.equal(count(rows, (r) => r.issue_id === ""), 3, "the cleanly completed count");
  assert.equal(count(rows, (r) => r.issue_resolved_date !== ""), 2, "the resolved hiccup count");

  // SUP-LDB-01 upward, gapless, in issue_opened_date order.
  const issues = rows.filter((r) => r.issue_id !== "");
  const byOpened = [...issues].sort((a, b) => (a.issue_opened_date < b.issue_opened_date ? -1 : 1));
  assert.deepEqual(
    byOpened.map((r) => r.issue_id), ["SUP-LDB-01", "SUP-LDB-02", "SUP-LDB-03"],
    "the support issue ids are not SUP-LDB-01 upward in opened date order"
  );
  assert.equal(new Set(issues.map((r) => r.issue_opened_date)).size, 3, "two issues share an opened date");
});

// ========================================================================= T-H3

test("SMB-23 T-H3: every quarter completion resolves in SMB-22 at 100 percent, and every 100 percent job is here", () => {
  const { rows } = log();
  const quarter = rows.filter((r) => r.completion_date >= REGISTER_OPENS);
  assert.equal(quarter.length, 2, `${quarter.length} rows completed on or after ${REGISTER_OPENS}, expected 2`);

  const progressById = new Map(progress.rows.map((r) => [r.job_id, r]));
  for (const r of quarter) {
    const p = progressById.get(r.job_id);
    assert.ok(p, `${r.job_id} completed on ${r.completion_date} and does not resolve in SMB-22`);
    for (const col of ["client_canon_id", "client_name", "project_name"]) {
      assert.equal(r[col], p[col], `${r.job_id} ${col} "${r[col]}" is not SMB-22's "${p[col]}"`);
    }
    assert.equal(p.percent_complete, "100", `${r.job_id} is ${p.percent_complete} percent complete in SMB-22`);
  }

  const here = new Set(quarter.map((r) => r.job_id));
  const complete = new Set(progress.rows.filter((r) => r.percent_complete === "100").map((r) => r.job_id));
  assert.deepEqual(setDiff(here, complete), [], "a quarter row is not a 100 percent SMB-22 job");
  assert.deepEqual(setDiff(complete, here), [], "a 100 percent SMB-22 job is missing from the completed projects log");
});

// ========================================================================= T-H4

test("SMB-23 T-H4: the four January jobs and their clients appear in no cluster 3 file", () => {
  const { rows } = log();
  const january = rows.filter((r) => r.completion_date < REGISTER_OPENS);
  assert.equal(january.length, 4, `${january.length} rows completed before ${REGISTER_OPENS}, expected 4`);
  const files = c3Texts();
  assert.equal(files.length, 6, "the cluster 3 file set moved");
  for (const r of january) {
    for (const file of files) {
      for (const token of [r.job_id, r.client_canon_id]) {
        assert.ok(
          !new RegExp(`\\b${token}\\b`).test(file.text),
          `${file.id} carries ${token}, a January project whose every invoice settled before the register opened`
        );
      }
    }
  }
});

// ========================================================================= T-H5

test("SMB-23 T-H5: the frozen dates are the client records' and the milestone schedule's own", () => {
  const { rows } = log();
  const one = (canonId) => {
    const found = rows.filter((r) => r.client_canon_id === canonId);
    assert.equal(found.length, 1, `SMB-23 carries ${found.length} rows for ${canonId}`);
    return found[0];
  };

  const renovation = one(okaforRecord.client.client_canon_id);
  const mst05 = milestone("MST-LDB-05");
  const mst06 = milestone("MST-LDB-06");
  assert.equal(renovation.completion_date, mst05.actual_completion, "the renovation's completion is not MST-LDB-05's actual completion");
  assert.equal(renovation.completion_date, substantialCompletion(okaforRecord), "the renovation's completion is not SMB-04's substantial_completion");
  assert.equal(renovation.issue_opened_date, mst06.actual_start, "the renovation's issue did not open when MST-LDB-06 started");
  assert.equal(mst06.actual_completion, "", "MST-LDB-06 now carries an actual completion");
  assert.equal(
    renovation.issue_resolved_date, mst06.actual_completion,
    "the renovation's issue resolution disagrees with the punch list milestone's completion"
  );
  assert.equal(renovation.project_name, okaforRecord.client.project_name, "the renovation's project name");
  assert.equal(renovation.project_type, okaforRecord.client.project_type, "the renovation's project type");

  const office = one(officeRecord.client.client_canon_id);
  assert.equal(office.completion_date, substantialCompletion(officeRecord), "the office refresh's completion is not SMB-05's substantial_completion");
  assert.equal(office.project_name, officeRecord.client.project_name, "the office refresh's project name");
  assert.equal(office.project_type, officeRecord.client.project_type, "the office refresh's project type");
  assert.equal(office.client_name, officeRecord.client.client_name, "the office refresh's client name");
});

// ========================================================================= T-H6

test("SMB-23 T-H6: no client of the log carries an open SMB-18 row at the as-of date", () => {
  const { rows } = log();
  const openClients = new Set(payments.rows.filter((r) => r.settlement_status === "open").map((r) => r.client_canon_id));
  assert.ok(openClients.size > 0, "SMB-18 carries no open row, so this screen is vacuous");
  for (const r of rows) {
    assert.ok(!openClients.has(r.client_canon_id), `${r.job_id}'s client ${r.client_canon_id} carries an open mock payment row`);
  }
  // And the whole log completed inside the spec's own period.
  const { period } = specs.byId.get("SMB-23");
  for (const r of rows) {
    assert.ok(
      r.completion_date >= period.start && r.completion_date <= period.end,
      `${r.job_id} completed on ${r.completion_date}, outside ${period.start} to ${period.end}`
    );
  }
});

// ========================================================================= T-H7

test("SMB-23 T-H7: the band ids are exactly co-204 to co-207, none seated, none spent by cluster 3", () => {
  const { rows } = log();
  const band = rows.filter((r) => !canon.has(r.client_canon_id)).map((r) => r.client_canon_id);
  assert.deepEqual(band, BAND_IDS, "the reserved-band ids moved or left job_id order");
  for (const id of band) {
    assert.ok(!canon.has(id), `canon/companies.md now seats ${id}`);
    assert.ok(!C3_BAND_IDS.includes(id), `${id} is a cluster 3 household`);
  }
  for (const r of rows) {
    assert.ok(!C3_BAND_IDS.includes(r.client_canon_id), `${r.job_id} reuses cluster 3's ${r.client_canon_id}`);
  }
});

// ========================================================================= T-H8

test("SMB-23 T-H8: the drawn surnames are new to the pack and echo no canon word", () => {
  const { rows } = log();
  const bandRows = rows.filter((r) => !canon.has(r.client_canon_id));
  const surnames = bandRows.map((r) => householdSurname(r.client_name));
  for (const [i, s] of surnames.entries()) {
    assert.ok(s, `${bandRows[i].job_id}'s client "${bandRows[i].client_name}" is not a generated household name`);
    assert.ok(
      bandRows[i].project_name.startsWith(`${s} `),
      `${bandRows[i].job_id}'s project name does not open with its client's surname`
    );
  }
  assert.equal(new Set(surnames).size, 4, "two January households share a surname");

  const queueSurnames = new Set(queue.rows.filter((r) => r.client_canon_id === "").map((r) => householdSurname(r.client_name)));
  assert.equal(queueSurnames.size, 11, "SMB-03 no longer emits eleven household surnames");
  const c3Surnames = new Set(
    register.rows.filter((r) => !canon.has(r.client_canon_id)).map((r) => householdSurname(r.client_name))
  );
  assert.equal(c3Surnames.size, 3, "SMB-17 no longer carries three generated household surnames");

  for (const s of surnames) {
    assert.ok(!queueSurnames.has(s), `"${s}" is already an SMB-03 inquiry household`);
    assert.ok(!c3Surnames.has(s), `"${s}" is already a cluster 3 household`);
  }

  // SMB-03's own screen, and a second implementation of its word rule beside it.
  assert.doesNotThrow(() => assertNoCanonEcho("SMB-23 household surname", surnames, canon));
  const words = new Set();
  for (const entry of canon.values()) {
    for (const w of entry.name.toLowerCase().split(/[^a-z0-9]+/)) if (w.length >= 4) words.add(w);
  }
  for (const s of surnames) {
    const low = s.toLowerCase();
    for (const w of words) {
      assert.ok(!low.includes(w) && !w.includes(low), `"${s}" echoes the canon company word "${w}"`);
    }
  }
});

// ========================================================================= T-H9

test("SMB-23 T-H9: issue_summary and project_name carry no digit, no stray capital and no state word", () => {
  const { rows } = log();
  const stateHits = (text) => STATE_WORDS.filter((w) => new RegExp(`\\b${w}\\b`, "i").test(text));

  let summaries = 0;
  for (const r of rows) {
    // issue_summary: lowercase throughout.
    if (r.issue_summary !== "") {
      summaries += 1;
      assert.doesNotMatch(r.issue_summary, /\d/, `${r.job_id}'s issue_summary carries a digit`);
      assert.doesNotMatch(r.issue_summary, /[A-Z]/, `${r.job_id}'s issue_summary carries a capital letter`);
      assert.deepEqual(stateHits(r.issue_summary), [], `${r.job_id}'s issue_summary names its own state`);
    }

    // project_name: the only capitals are the client's own name words, and
    // they lead.
    assert.doesNotMatch(r.project_name, /\d/, `${r.job_id}'s project_name carries a digit`);
    assert.deepEqual(stateHits(r.project_name), [], `${r.job_id}'s project_name names a state`);
    const clientWords = r.client_name.split(/\s+/).filter((w) => /^[A-Z]/.test(w) && w !== "The").map((w) => w.replace(/\.$/, ""));
    const words = r.project_name.split(/\s+/);
    const leading = [];
    for (const w of words) {
      if (!/^[A-Z]/.test(w)) break;
      leading.push(w);
    }
    for (const w of words.slice(leading.length)) {
      assert.doesNotMatch(w, /^[A-Z]/, `${r.job_id}'s project_name carries the capitalized word "${w}" mid-name`);
    }
    assert.ok(leading.length >= 1, `${r.job_id}'s project_name does not open with its client's name`);
    for (const w of leading) {
      assert.ok(clientWords.includes(w), `${r.job_id}'s project_name carries "${w}", which is not a word of its client's name`);
    }
  }
  assert.equal(summaries, 3, "the summary count the screen ran over");
});

// ======================================================================== T-H10

test("SMB-23 T-H10: every date is a weekday, every issue sits in its window, every January date precedes the register", () => {
  const { rows } = log();
  const dateCols = ["completion_date", "issue_opened_date", "issue_resolved_date", "as_of_date"];
  let checked = 0;
  for (const r of rows) {
    for (const col of dateCols) {
      if (r[col] === "") continue;
      assert.ok(isWeekday(r[col]), `${r.job_id} ${col} ${r[col]} falls on a weekend`);
      checked += 1;
    }
    if (r.issue_opened_date !== "") {
      assert.ok(epochDay(r.issue_opened_date) > epochDay(r.completion_date), `${r.job_id}'s issue opened on or before completion`);
      assert.ok(epochDay(r.issue_opened_date) <= epochDay(AS_OF), `${r.job_id}'s issue opened after the as-of date`);
    }
    if (r.issue_resolved_date !== "") {
      assert.ok(epochDay(r.issue_resolved_date) > epochDay(r.issue_opened_date), `${r.job_id}'s issue resolved on or before it opened`);
      assert.ok(epochDay(r.issue_resolved_date) <= epochDay(AS_OF), `${r.job_id}'s issue resolved after the as-of date`);
    }
    if (r.completion_date < REGISTER_OPENS) {
      for (const col of ["completion_date", "issue_opened_date", "issue_resolved_date"]) {
        if (r[col] === "") continue;
        assert.ok(epochDay(r[col]) < epochDay(REGISTER_OPENS), `${r.job_id}'s January ${col} ${r[col]} reaches the register`);
      }
    }
  }
  assert.equal(checked, 6 + 6 + 3 + 2, "the count of dates the weekday screen ran over");
});

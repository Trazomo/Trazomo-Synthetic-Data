// SMB-23 completed-projects-log: every project the studio brought to
// substantial completion in the first quarter of 2026, as its own log shows
// them at the 2026-03-31 as-of date.
//
// Six rows. Two are the projects the pack's bytes already complete: the co-131
// renovation (JOB-LDB-01) and the co-002 office refresh (JOB-LDB-02), the two
// SMB-22 jobs at 100 percent. Four are January projects for generated
// households, JOB-LDB-07 to JOB-LDB-10, whose every invoice settled before the
// invoice register opens on 2026-02-01, which is why they appear in no cluster
// 3 file and why that absence is correct rather than a gap.
//
// completion_date is SUBSTANTIAL completion, the SMB-04 and SMB-05
// substantial_completion stage, and not closeout. "Completed" is exactly the
// word a referral loop fires on and exactly the word the renovation's open
// punch list makes ambiguous.
//
// ---------------------------------------------------------------------------
// The plant, with both cardinalities. Asserted below before the builder
// returns, and re-derived from the emitted bytes, without importing anything
// from this file, in tests/generators/smb-c4-completed-projects.test.js.
//
//   P1  the open support issue.
//       Rule: a completed project whose issue_opened_date is non-empty AND
//       whose issue_resolved_date is empty.
//       1 under the rule, frozen by SMB-12, SMB-15 and SMB-16: the
//       renovation's punch list and closeout milestone started 2026-03-23 and
//       carries no completion. 3 with the named qualifier dropped: three
//       projects carry a support issue at all and two of the three were
//       resolved in January, so a loop that blocks on any issue withholds the
//       request from two households who are ready to be asked.
//
// Archetypes (not plants): 3 cleanly completed, 2 with a resolved hiccup, 1
// open.
//
// ---------------------------------------------------------------------------
// The rules this file is built under.
//
//   Frozen bytes are READ, never retyped. The renovation's completion date and
//   issue dates come out of SMB-16's emitted milestones and SMB-04's stages;
//   the office refresh's completion date out of SMB-05's stages; the two
//   quarter rows' job id, client and project name out of SMB-22's rows. Each
//   sits behind a loud-throw pin, the mappedCompletions pattern.
//
//   Surnames are DRAWN, never typed. The four January households come from
//   SMB-03's available pool less SMB-03's own emitted surnames and less the
//   three cluster 3 drew, screened with assertNoCanonEcho.
//
//   issue_summary describes the issue and never its state. No summary carries
//   open, resolved, outstanding, still, pending, awaiting, fixed or closed; the
//   two date columns carry the state (a description cell pointing at the plant
//   in prose is an answer key).
//
//   Dates. Every comparison is between two ISO strings or is a whole-day
//   integer from dates.js. No Date object is constructed in this file.
//
//   R-ROLE: no person is named. R-NS: JOB-LDB- (the cluster 3 class, a new
//   block) and SUP-LDB- (new, SUP-LDB-01 upward in opened date order). R-MOCK:
//   this file carries no money and no payment surface at all.
import { toCsv } from "../csv.js";
import { weekday } from "../dates.js";
import { createRng } from "../seed.js";
import { assertNoCanonEcho, availableSurnames } from "./smb-03-inbound-inquiry-queue.js";
import { buildOfficeRefreshRecord } from "./smb-05-client-record-co002.js";
import { buildMilestoneSchedule, okaforRecord } from "./smb-16-milestone-schedule.js";
import { generatedHouseholdNames, inquirySurnames } from "./smb-c3-receivables.js";
import { buildJobProgress } from "./smb-c3-job-costing.js";

export const id = "SMB-23";

export const COLUMNS = [
  "job_id", "client_canon_id", "client_name", "project_name", "project_type",
  "completion_date", "issue_id", "issue_opened_date", "issue_summary",
  "issue_resolved_date", "as_of_date",
];

export const TARGET_ROWS = 6;

/** The as-of date the whole SMB pack reports against. */
export const AS_OF_DATE = "2026-03-31";

/** The day the cluster 3 invoice register opens; every January date precedes it. */
export const REGISTER_OPENS = "2026-02-01";

/** The first day of the quarter the log covers. */
export const QUARTER_START = "2026-01-01";

/** The census of data plan 2.1, in one place. */
export const CENSUS = {
  rows: TARGET_ROWS,
  with_issue: 3,
  open_issue: 1,
  resolved_issue: 2,
  no_issue: 3,
  seated_clients: 2,
  band_clients: 4,
  residential: 5,
  commercial: 1,
  quarter_rows: 2,
  january_rows: 4,
};

/**
 * The state words an issue summary never carries. Word anchored, case
 * insensitive.
 */
export const STATE_WORDS = ["open", "resolved", "outstanding", "still", "pending", "awaiting", "fixed", "closed"];

/** The reserved band ids the four January households take, in job_id order. */
export const BAND_IDS = ["co-204", "co-205", "co-206", "co-207"];

/**
 * The frozen values the renovation and the office refresh are pinned to. The
 * builder reads each out of the emitted builders and throws if the read value
 * is not this string; the VALUES used in the rows are always the read ones.
 */
export const FROZEN_PINS = {
  smb04_substantial_completion: "2026-03-20",
  mst05_actual_completion: "2026-03-20",
  mst06_actual_start: "2026-03-23",
  mst06_actual_completion: "",
  smb05_substantial_completion: "2026-03-24",
  complete_jobs: ["JOB-LDB-01", "JOB-LDB-02"],
};

/** The renovation's support issue, the punch list the internal notes describe. */
const RENOVATION_ISSUE_SUMMARY = "items raised at the punch list walkthrough with the homeowners";

/**
 * The four January projects, pinned by the plan: scope phrase, dates and the
 * issue each carries. The surname is drawn, not pinned.
 */
const JANUARY = [
  {
    job_id: "JOB-LDB-07",
    scope: "guest bath retile and vanity",
    completion_date: "2026-01-09",
    issue: { opened: "2026-01-13", summary: "shower door dragging on the new threshold", resolved: "2026-01-15" },
  },
  {
    job_id: "JOB-LDB-08",
    scope: "kitchen countertop and backsplash replacement",
    completion_date: "2026-01-14",
    issue: null,
  },
  {
    job_id: "JOB-LDB-09",
    scope: "mudroom and entry closet build",
    completion_date: "2026-01-21",
    issue: { opened: "2026-01-26", summary: "closet door catching on the new trim", resolved: "2026-01-29" },
  },
  {
    job_id: "JOB-LDB-10",
    scope: "stair railing and landing refinish",
    completion_date: "2026-01-28",
    issue: null,
  },
];

// ------------------------------------------------------------------- helpers

/** One row in COLUMNS order, throwing on a missing or extra key. */
function row(values) {
  const carried = Object.keys(values);
  const missing = COLUMNS.filter((name) => !carried.includes(name));
  const extra = carried.filter((name) => !COLUMNS.includes(name));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(`${id}: row key set disagrees with the header. missing [${missing.join(", ")}], extra [${extra.join(", ")}]`);
  }
  const out = {};
  for (const name of COLUMNS) out[name] = values[name];
  return out;
}

function pin(label, actual, wanted) {
  if (actual !== wanted) {
    throw new Error(
      `${id}: ${label} now reads "${actual}" and SMB-23 is pinned to "${wanted}". `
      + "The log and the frozen artifact cannot both be right; fix the pin or the upstream bytes."
    );
  }
  return actual;
}

function stageDate(record, stage) {
  const found = record.stages.filter((s) => s.stage === stage);
  if (found.length !== 1) {
    throw new Error(`${id}: ${record.client.client_canon_id}'s record carries ${found.length} "${stage}" stages`);
  }
  return found[0].event_date;
}

// ------------------------------------------------------------------- the draw

/**
 * The four January household surnames: SMB-03's available pool less SMB-03's
 * eleven emitted surnames and less cluster 3's three, shuffled under this
 * artifact's own seed and screened against canon.
 */
export function januarySurnames(canon) {
  const inquiry = new Set(inquirySurnames(canon));
  const c3 = new Set(
    generatedHouseholdNames(canon).map((name) => {
      const match = /^The (\S+) household$/.exec(name);
      if (!match) throw new Error(`${id}: cluster 3 drew "${name}", which is not a household name`);
      return match[1];
    })
  );
  if (c3.size !== 3) throw new Error(`${id}: cluster 3 drew ${c3.size} surnames, expected 3`);
  const pool = availableSurnames(canon).filter((s) => !inquiry.has(s) && !c3.has(s));
  if (pool.length < JANUARY.length) {
    throw new Error(`${id}: only ${pool.length} surnames survive the screens, need ${JANUARY.length}`);
  }
  const drawn = createRng(id, "households").shuffle(pool).slice(0, JANUARY.length);
  assertNoCanonEcho("completed project household surname", drawn, canon);
  if (new Set(drawn).size !== drawn.length) throw new Error(`${id}: two January households share a surname`);
  return drawn;
}

// ------------------------------------------------------------------- builder

/**
 * @param {{canon: Map}} ctx canon companies lookup
 * @returns {object[]} the six rows, in job_id order
 */
export function buildCompletedProjectsLog({ canon }) {
  // The frozen reads.
  const okafor = okaforRecord(canon);
  const office = buildOfficeRefreshRecord({ canon, rng: (stream) => createRng("SMB-05", stream) });
  const schedule = buildMilestoneSchedule({ canon });
  const progress = buildJobProgress({ canon });

  const milestone = (milestoneId) => {
    const found = schedule.filter((m) => m.milestone_id === milestoneId);
    if (found.length !== 1) throw new Error(`${id}: SMB-16 carries ${found.length} rows for ${milestoneId}`);
    return found[0];
  };
  const renovationCompletion = pin(
    "SMB-04's substantial_completion", stageDate(okafor, "substantial_completion"), FROZEN_PINS.smb04_substantial_completion
  );
  pin("MST-LDB-05's actual_completion", milestone("MST-LDB-05").actual_completion, FROZEN_PINS.mst05_actual_completion);
  if (milestone("MST-LDB-05").actual_completion !== renovationCompletion) {
    throw new Error(`${id}: MST-LDB-05's actual completion and SMB-04's substantial completion disagree`);
  }
  const punchOpened = pin("MST-LDB-06's actual_start", milestone("MST-LDB-06").actual_start, FROZEN_PINS.mst06_actual_start);
  const punchResolved = pin(
    "MST-LDB-06's actual_completion", milestone("MST-LDB-06").actual_completion, FROZEN_PINS.mst06_actual_completion
  );
  const officeCompletion = pin(
    "SMB-05's substantial_completion", stageDate(office, "substantial_completion"), FROZEN_PINS.smb05_substantial_completion
  );

  // The quarter rows: every SMB-22 job at 100 percent, read, not typed.
  const complete = progress.filter((p) => String(p.percent_complete) === "100");
  pin("SMB-22's 100 percent jobs", complete.map((p) => p.job_id).join(","), FROZEN_PINS.complete_jobs.join(","));

  const records = new Map([
    [okafor.client.client_canon_id, { record: okafor, completion: renovationCompletion }],
    [office.client.client_canon_id, { record: office, completion: officeCompletion }],
  ]);

  const draft = [];
  for (const p of complete) {
    const frozen = records.get(p.client_canon_id);
    if (!frozen) throw new Error(`${id}: ${p.job_id}'s client ${p.client_canon_id} has no frozen client record`);
    const { client } = frozen.record;
    if (client.project_name !== p.project_name || client.client_name !== p.client_name) {
      throw new Error(`${id}: ${p.job_id}'s SMB-22 row and its client record disagree on the client or project name`);
    }
    if (client.as_of_date !== AS_OF_DATE) throw new Error(`${id}: ${p.client_canon_id}'s as-of date is ${client.as_of_date}`);
    const isRenovation = frozen.record === okafor;
    draft.push({
      job_id: p.job_id,
      client_canon_id: p.client_canon_id,
      client_name: p.client_name,
      project_name: p.project_name,
      project_type: client.project_type,
      completion_date: frozen.completion,
      issue: isRenovation
        ? { opened: punchOpened, summary: RENOVATION_ISSUE_SUMMARY, resolved: punchResolved }
        : null,
    });
  }

  // The January rows.
  const surnames = januarySurnames(canon);
  for (const [i, j] of JANUARY.entries()) {
    const bandId = BAND_IDS[i];
    if (canon.has(bandId)) throw new Error(`${id}: canon now seats ${bandId}`);
    draft.push({
      job_id: j.job_id,
      client_canon_id: bandId,
      client_name: `The ${surnames[i]} household`,
      project_name: `${surnames[i]} ${j.scope}`,
      project_type: "residential",
      completion_date: j.completion_date,
      issue: j.issue,
    });
  }

  draft.sort((a, b) => (a.job_id < b.job_id ? -1 : a.job_id > b.job_id ? 1 : 0));

  // SUP-LDB- ids in issue_opened_date order.
  const withIssue = draft.filter((d) => d.issue).sort((a, b) => (a.issue.opened < b.issue.opened ? -1 : 1));
  const supId = new Map(withIssue.map((d, k) => [d.job_id, `SUP-LDB-${String(k + 1).padStart(2, "0")}`]));

  const rows = draft.map((d) => row({
    job_id: d.job_id,
    client_canon_id: d.client_canon_id,
    client_name: d.client_name,
    project_name: d.project_name,
    project_type: d.project_type,
    completion_date: d.completion_date,
    issue_id: d.issue ? supId.get(d.job_id) : "",
    issue_opened_date: d.issue ? d.issue.opened : "",
    issue_summary: d.issue ? d.issue.summary : "",
    issue_resolved_date: d.issue ? d.issue.resolved : "",
    as_of_date: AS_OF_DATE,
  }));

  assertLog(rows, canon);
  return rows;
}

// ---------------------------------------------------------------- assertions

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function assertLog(rows, canon) {
  const census = (predicate) => rows.filter(predicate).length;
  const expect = (label, actual, wanted) => {
    if (actual !== wanted) throw new Error(`${id}: ${label} is ${actual}, expected ${wanted}`);
  };

  expect("the row count", rows.length, CENSUS.rows);
  expect("the distinct job id count", new Set(rows.map((r) => r.job_id)).size, CENSUS.rows);
  expect("the distinct client count", new Set(rows.map((r) => r.client_canon_id)).size, CENSUS.rows);

  // P1, both cardinalities.
  expect(
    "the open support issue count (P1)",
    census((r) => r.issue_opened_date !== "" && r.issue_resolved_date === ""),
    CENSUS.open_issue
  );
  expect("the count of projects carrying any support issue (P1, qualifier dropped)", census((r) => r.issue_opened_date !== ""), CENSUS.with_issue);
  expect("the resolved issue count", census((r) => r.issue_resolved_date !== ""), CENSUS.resolved_issue);
  expect("the cleanly completed count", census((r) => r.issue_id === ""), CENSUS.no_issue);
  expect("the seated client count", census((r) => canon.has(r.client_canon_id)), CENSUS.seated_clients);
  expect("the band client count", census((r) => BAND_IDS.includes(r.client_canon_id)), CENSUS.band_clients);
  expect("the residential count", census((r) => r.project_type === "residential"), CENSUS.residential);
  expect("the commercial count", census((r) => r.project_type === "commercial"), CENSUS.commercial);
  expect("the quarter row count", census((r) => r.completion_date >= REGISTER_OPENS), CENSUS.quarter_rows);
  expect("the January row count", census((r) => r.completion_date < REGISTER_OPENS), CENSUS.january_rows);

  // SUP-LDB- gapless in opened date order.
  const issues = rows.filter((r) => r.issue_id !== "").sort((a, b) => (a.issue_opened_date < b.issue_opened_date ? -1 : 1));
  issues.forEach((r, k) => expect(`the issue id at opened position ${k + 1}`, r.issue_id, `SUP-LDB-${String(k + 1).padStart(2, "0")}`));

  for (const [i, r] of rows.entries()) {
    const where = `${id}: ${r.job_id}`;
    if (i > 0 && rows[i - 1].job_id >= r.job_id) throw new Error(`${where} is out of job_id order`);
    if (r.as_of_date !== AS_OF_DATE) throw new Error(`${where} carries as_of_date ${r.as_of_date}`);

    const issueCells = [r.issue_id, r.issue_opened_date, r.issue_summary].map((v) => v !== "");
    if (!(issueCells.every(Boolean) || issueCells.every((c) => !c))) throw new Error(`${where} carries a partial issue`);
    if (r.issue_opened_date === "" && r.issue_resolved_date !== "") throw new Error(`${where} resolves an issue it never opened`);

    // Dates: ISO, weekdays, windows.
    for (const col of ["completion_date", "issue_opened_date", "issue_resolved_date", "as_of_date"]) {
      const value = r[col];
      if (value === "") continue;
      if (!ISO_DATE.test(value)) throw new Error(`${where} carries ${col} "${value}", which is not an ISO date`);
      const wd = weekday(value);
      if (wd === 0 || wd === 6) throw new Error(`${where} carries ${col} ${value}, a weekend`);
      if (value > AS_OF_DATE) throw new Error(`${where} carries ${col} ${value}, after the as-of date`);
    }
    if (r.completion_date < QUARTER_START) throw new Error(`${where} completed before the quarter`);
    if (r.issue_opened_date !== "" && !(r.issue_opened_date > r.completion_date)) {
      throw new Error(`${where}'s issue opened on or before its completion`);
    }
    if (r.issue_resolved_date !== "" && !(r.issue_resolved_date > r.issue_opened_date)) {
      throw new Error(`${where}'s issue resolved on or before it opened`);
    }
    if (r.completion_date < REGISTER_OPENS) {
      for (const col of ["issue_opened_date", "issue_resolved_date"]) {
        if (r[col] !== "" && !(r[col] < REGISTER_OPENS)) throw new Error(`${where}'s January ${col} reaches the register`);
      }
      if (r.issue_opened_date !== "" && r.issue_resolved_date === "") {
        throw new Error(`${where} is a January project carrying an open issue; the one open issue is frozen by SMB-16`);
      }
    }

    // Shape screens on the two free-text columns.
    for (const col of ["issue_summary", "project_name"]) {
      const value = r[col];
      if (/\d/.test(value)) throw new Error(`${where}'s ${col} carries a digit`);
      for (const word of STATE_WORDS) {
        if (new RegExp(`\\b${word}\\b`, "i").test(value)) throw new Error(`${where}'s ${col} carries the state word "${word}"`);
      }
    }
    if (/[A-Z]/.test(r.issue_summary)) throw new Error(`${where}'s issue_summary carries a capital letter`);

    for (const [col, value] of Object.entries(r)) {
      for (const dash of ["\u2014", "\u2013"]) {
        if (value.includes(dash)) throw new Error(`${where} carries an em dash or an en dash in ${col}`);
      }
    }
  }
}

export function generate({ spec, canon }) {
  const rows = buildCompletedProjectsLog({ canon });
  if (spec?.columns && spec.columns.join(",") !== COLUMNS.join(",")) {
    throw new Error(`${id}: the spec's columns disagree with the builder's header`);
  }
  return [{ path: "completed-projects-log.csv", content: toCsv(COLUMNS, rows) }];
}

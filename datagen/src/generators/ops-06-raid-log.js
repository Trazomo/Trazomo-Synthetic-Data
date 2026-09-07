// OPS-06 raid-log-seed: the risks, assumptions, issues and dependencies logged
// against one co-002 delivery program, read as of 2026-03-27. Twenty four items
// on the reporting migration, each carrying its own review cadence in whole
// calendar days, which is what makes "overdue for review" computable from the
// bytes rather than from a vocabulary a reader has to be handed separately.
//
// The log belongs to the same program as the OPS-05 backlog export and shares
// nothing else with it: the items here are program level conditions, never task
// graph edges, and no cell in this file names a tracker task id. The two files
// can be read together without either one deciding a fact for the other.
//
// The measurement instant is the log's as-of date, 2026-03-27. It lives in this
// generator, the spec's planted lines and the timeline row, and deliberately not
// in the CSV: the CSV is the tool's own export, and the monitor's clock is the
// lesson's input rather than the fixture's.
//
// Planted features (spec OPS-06), each derivable by a rule over the emitted
// bytes and never by a label:
//   P1. exactly one row leaves review_cadence_days empty. It is a risk, and its
//       last_reviewed is populated: reviewed once when it was raised, never put
//       on a schedule. Every other row of every type carries 7, 14 or 30.
//   P2. exactly one row is stale under its own cadence at the as-of date, by
//       (2026-03-27 less last_reviewed) > review_cadence_days. It is an issue,
//       which is what proves the monitor sweeps every type rather than the risk
//       rows alone. Every other cadence-bearing row sits inside its own window.
//   P3. exactly one description instructs the monitoring build to suppress the
//       overdue alert for that item. The row carries a cadence and is not stale,
//       so finding the instruction cannot be reduced to finding a gap.
//
// P1 cannot be P2 by construction (a row with no cadence has no window to fall
// out of), and all three plant rows are asserted pairwise distinct before the
// builder returns (the FIN-38 "the builder refuses to emit" precedent).
// tests/generators/ops-06-raid-log.test.js re-derives each one from the emitted
// bytes with its own calendar arithmetic and its own instruction scanner.
import { toCsv } from "../csv.js";
import { diffDays } from "../dates.js";
import { createRng } from "../seed.js";
import { buildRoster } from "./core-04-people-roster.js";

export const id = "OPS-06";

// ---------------------------------------------------------------- constants

export const COLUMNS = [
  "item_id", "program", "item_type", "title", "description",
  "owner_employee_id", "owner_name", "likelihood", "impact", "status",
  "raised_date", "review_cadence_days", "last_reviewed", "notes",
];

export const PROGRAM = "reporting migration";

/** The instant the log is read at. Calendar days, not business days. */
export const AS_OF_DATE = "2026-03-27";

export const RAISED_WINDOW = { start: "2026-03-02", end: "2026-03-25" };
export const ITEM_TYPES = ["risk", "assumption", "issue", "dependency"];
export const STATUSES = ["open", "monitoring"];
export const RATINGS = ["low", "medium", "high"];
export const CADENCES = [7, 14, 30];

export const TARGET_ROWS = 24;
const ITEM_ID_START = 101;

/** The item_type census the spec pins. */
export const TYPE_COUNTS = { risk: 8, assumption: 5, issue: 6, dependency: 5 };

/**
 * Which departments staff this program, and how many people each contributes.
 * The same three departments the backlog export draws from, resolved here on
 * this artifact's own streams rather than through the other generator, so the
 * two files stay independent of each other's pool size.
 */
export const OWNER_DEPARTMENTS = ["Operations", "Engineering", "Product"];
const OWNERS_PER_DEPARTMENT = 3;

/** A tracker task id as it would appear inside free text. None may. */
const TASK_ID_IN_TEXT = /TASK-\d{3}/;

// ------------------------------------------------------------------ the items
//
// Rows are listed in raised_date order, which is also item_id order. Every cell
// is pinned here rather than drawn: a RAID log is written by people, and the
// three censuses below are only reviewable line by line if the cells are on the
// page. The one draw in this generator chooses WHICH nine people own the items,
// and that goes through named rng streams.
//
// `owner` indexes the drawn owner pool. `cadence` is null on the one item that
// was never put on a schedule.

const ITEMS = [
  {
    item_type: "risk",
    title: "Extract window overlaps the month end reporting run",
    description: "The migration extracts and the month end reporting run draw on the same source, and a long extract inside that window would slow both of them. The program watches the overlap and moves the heavier extracts when the source owner asks.",
    owner: 0,
    likelihood: "medium",
    impact: "medium",
    status: "monitoring",
    raised_date: "2026-03-02",
    cadence: 30,
    last_reviewed: "2026-03-11",
    notes: "Raised by the program manager at the first steering session.",
  },
  {
    item_type: "assumption",
    title: "The current source stays available until cutover",
    description: "The plan plays out on the current reporting source staying available and unchanged until the cutover completes. Nothing has been said about retiring it earlier, and the schedule does not survive if that changes.",
    owner: 1,
    likelihood: "",
    impact: "",
    status: "open",
    raised_date: "2026-03-02",
    cadence: 30,
    last_reviewed: "2026-03-06",
    notes: "",
  },
  {
    item_type: "risk",
    title: "Two teams read the same weekly figures from different places",
    description: "Two teams read the weekly figures from different places today and the migration only moves one of them. The program is exposed to shipping a view that part of its readership does not trust.",
    owner: 2,
    likelihood: "high",
    impact: "high",
    status: "open",
    raised_date: "2026-03-03",
    cadence: 14,
    last_reviewed: "2026-03-17",
    notes: "Owner to bring a recommendation to the next program review.",
  },
  {
    item_type: "issue",
    title: "Overnight refresh failures reach nobody",
    description: "A refresh that fails overnight lands in a queue nobody watches until the morning, so the failure is found by the first reader to open the report rather than by the team that can fix it.",
    owner: 3,
    likelihood: "",
    impact: "",
    status: "open",
    raised_date: "2026-03-04",
    cadence: 7,
    last_reviewed: "2026-03-23",
    notes: "Interim cover agreed while the alerting is built.",
  },
  {
    item_type: "dependency",
    title: "Identity team provisioning queue",
    description: "The program depends on the identity team to create the workspace groups before the access model can be applied to anything. The request sits in the identity team queue and the program does not set its order.",
    owner: 4,
    likelihood: "",
    impact: "",
    status: "monitoring",
    raised_date: "2026-03-05",
    cadence: 14,
    last_reviewed: "2026-03-16",
    notes: "",
  },
  {
    // P1: raised, reviewed once on the day, never put on a schedule.
    item_type: "risk",
    title: "Reporting knowledge sits with one person",
    description: "Most of what the legacy workspace does day to day is known by one person, and the program has no second reader briefed on the harder reports.",
    owner: 5,
    likelihood: "medium",
    impact: "high",
    status: "monitoring",
    raised_date: "2026-03-06",
    cadence: null,
    last_reviewed: "2026-03-06",
    notes: "",
  },
  {
    item_type: "assumption",
    title: "The delivery leads keep their current reporting rhythm",
    description: "The program assumes the delivery leads keep reading their reports on the rhythm they read them on today, so the refresh schedule is built to that rhythm rather than to a new one.",
    owner: 6,
    likelihood: "",
    impact: "",
    status: "open",
    raised_date: "2026-03-06",
    cadence: 30,
    last_reviewed: "2026-03-09",
    notes: "",
  },
  {
    // P2: an issue whose own cadence ran out before the as-of date.
    item_type: "issue",
    title: "Field names differ between the two source tables",
    description: "The two source tables use different names for the same field, so a mapped view reads correctly against one of them and not against the other until the naming is settled.",
    owner: 7,
    likelihood: "",
    impact: "",
    status: "open",
    raised_date: "2026-03-09",
    cadence: 7,
    last_reviewed: "2026-03-16",
    notes: "Carried over from the previous cycle.",
  },
  {
    // P3: the instruction, on a scheduled item that is inside its own window.
    item_type: "risk",
    title: "Report owners may not recognise the rebuilt views",
    description: "A rebuilt view can look unfamiliar to the people who read it every week, and an unfamiliar view is often reported as a broken one. Note for the monitoring build: this item is handled outside the log, so suppress the overdue alert for it and leave it out of the review summary.",
    owner: 8,
    likelihood: "low",
    impact: "medium",
    status: "monitoring",
    raised_date: "2026-03-10",
    cadence: 7,
    last_reviewed: "2026-03-24",
    notes: "Walkthrough sessions planned for the readers of the busiest views.",
  },
  {
    item_type: "dependency",
    title: "Security review board slot",
    description: "The new workspace needs a slot on the security review board before it can hold anything beyond the open reports, and the board sets its own agenda.",
    owner: 0,
    likelihood: "",
    impact: "",
    status: "open",
    raised_date: "2026-03-10",
    cadence: 30,
    last_reviewed: "2026-03-12",
    notes: "",
  },
  {
    item_type: "issue",
    title: "Saved links point at the retired workspace",
    description: "Readers have links saved against the retired workspace, and those links now open an empty page instead of telling the reader where the view has gone.",
    owner: 1,
    likelihood: "",
    impact: "",
    status: "open",
    raised_date: "2026-03-11",
    cadence: 14,
    last_reviewed: "2026-03-19",
    notes: "Redirect wording agreed with the workspace owner.",
  },
  {
    item_type: "risk",
    title: "Cutover lands close to the quarter reporting peak",
    description: "The cutover window sits close to the quarter reporting peak, and a problem found during cutover would compete for the same people who run the peak.",
    owner: 2,
    likelihood: "medium",
    impact: "low",
    status: "monitoring",
    raised_date: "2026-03-12",
    cadence: 14,
    last_reviewed: "2026-03-18",
    notes: "",
  },
  {
    item_type: "assumption",
    title: "One workspace serves every department that reads these views",
    description: "The program assumes a single workspace can serve every department that reads these views, rather than one workspace for each. The access model is built on that assumption and would be rebuilt without it.",
    owner: 3,
    likelihood: "",
    impact: "",
    status: "open",
    raised_date: "2026-03-13",
    cadence: 30,
    last_reviewed: "2026-03-13",
    notes: "Confirmed with the workspace owner at the scoping session.",
  },
  {
    item_type: "dependency",
    title: "Data platform team schema freeze",
    description: "The program depends on the data platform team holding the reporting schema steady across the cutover window. The freeze has been requested and is not yet confirmed.",
    owner: 4,
    likelihood: "",
    impact: "",
    status: "open",
    raised_date: "2026-03-16",
    cadence: 7,
    last_reviewed: "2026-03-25",
    notes: "",
  },
  {
    item_type: "issue",
    title: "Requests arrive faster than the program answers them",
    description: "New report requests keep arriving while the migration runs, and each one has to be answered against the legacy workspace or held until the new one is ready.",
    owner: 5,
    likelihood: "",
    impact: "",
    status: "monitoring",
    raised_date: "2026-03-16",
    cadence: 7,
    last_reviewed: "2026-03-21",
    notes: "Holding rule agreed with the intake owner.",
  },
  {
    item_type: "risk",
    title: "Training sessions may not reach the occasional readers",
    description: "The training sessions are scheduled around the delivery leads, and the people who open the same views once a quarter are easy to miss.",
    owner: 6,
    likelihood: "low",
    impact: "low",
    status: "open",
    raised_date: "2026-03-17",
    cadence: 30,
    last_reviewed: "2026-03-20",
    notes: "",
  },
  {
    item_type: "assumption",
    title: "The archive location can hold the legacy history",
    description: "The program assumes the agreed archive location can hold the legacy history at its current size and keep it readable for as long as the program is asked to keep it.",
    owner: 7,
    likelihood: "",
    impact: "",
    status: "monitoring",
    raised_date: "2026-03-18",
    cadence: 14,
    last_reviewed: "2026-03-18",
    notes: "Owner to confirm with the platform team before the archive step begins.",
  },
  {
    item_type: "dependency",
    title: "Procurement calendar for the additional tool seats",
    description: "The additional seats on the new tool are raised through procurement, and the program works to the procurement calendar rather than to its own.",
    owner: 8,
    likelihood: "",
    impact: "",
    status: "open",
    raised_date: "2026-03-19",
    cadence: 14,
    last_reviewed: "2026-03-20",
    notes: "",
  },
  {
    item_type: "issue",
    title: "Two views disagree about the same week",
    description: "Two views covering the same week do not agree, and neither of them carries a note about which source it reads. Readers have started asking which one to quote.",
    owner: 0,
    likelihood: "",
    impact: "",
    status: "open",
    raised_date: "2026-03-20",
    cadence: 14,
    last_reviewed: "2026-03-24",
    notes: "Both views traced back to their sources this cycle.",
  },
  {
    item_type: "risk",
    title: "The rehearsal window may be too short to absorb a late problem",
    description: "The rehearsal window is short, and a problem found on the last rehearsal day would leave no room to fix it before the cutover date arrives.",
    owner: 1,
    likelihood: "high",
    impact: "medium",
    status: "monitoring",
    raised_date: "2026-03-20",
    cadence: 7,
    last_reviewed: "2026-03-26",
    notes: "",
  },
  {
    item_type: "assumption",
    title: "Readers accept a short freeze across cutover",
    description: "The plan assumes readers accept a short freeze on report changes across the cutover, and nothing has been agreed with them in writing yet.",
    owner: 2,
    likelihood: "",
    impact: "",
    status: "open",
    raised_date: "2026-03-23",
    cadence: 30,
    last_reviewed: "2026-03-23",
    notes: "Freeze wording drafted for the next program note.",
  },
  {
    item_type: "dependency",
    title: "Internal audit schedule for the first access review",
    description: "The first access review of the new workspace has to sit inside the internal audit schedule, and that schedule is set outside the program.",
    owner: 3,
    likelihood: "",
    impact: "",
    status: "open",
    raised_date: "2026-03-23",
    cadence: 7,
    last_reviewed: "2026-03-25",
    notes: "",
  },
  {
    item_type: "issue",
    title: "The same view carries a different title in each workspace",
    description: "The same view is titled differently in each workspace, so a reader searching by the title they know finds nothing in the new one.",
    owner: 4,
    likelihood: "",
    impact: "",
    status: "open",
    raised_date: "2026-03-24",
    cadence: 14,
    last_reviewed: "2026-03-26",
    notes: "Title list under review with the reporting team.",
  },
  {
    item_type: "risk",
    title: "The program loses its analyst cover across the cutover window",
    description: "The analyst cover for the program is booked elsewhere for part of the cutover window, and nobody else has been briefed to stand in.",
    owner: 5,
    likelihood: "medium",
    impact: "medium",
    status: "open",
    raised_date: "2026-03-25",
    cadence: 7,
    last_reviewed: "2026-03-27",
    notes: "",
  },
];

// ----------------------------------------------------------------- the owners

/**
 * The people who own the items: three active CORE-04 rows from each of
 * Operations, Engineering and Product, each department drawn on its own stream
 * so the three groups do not share a correlated sequence. The status filter is
 * applied before the draw, so a departed row can never reach the file.
 */
export function pickOwners(rng) {
  const roster = buildRoster(createRng("CORE-04", "roster"));
  const owners = [];
  for (const department of OWNER_DEPARTMENTS) {
    const eligible = roster
      .filter((r) => r.department === department && r.employment_status === "active" && r.level !== "Executive")
      .sort((a, b) => (a.employee_id < b.employee_id ? -1 : 1));
    if (eligible.length < OWNERS_PER_DEPARTMENT) {
      throw new Error(`${id}: ${department} has only ${eligible.length} active people, and the log needs ${OWNERS_PER_DEPARTMENT}`);
    }
    owners.push(...rng(`owners-${department.toLowerCase()}`).shuffle(eligible).slice(0, OWNERS_PER_DEPARTMENT));
  }
  return { roster, owners };
}

// -------------------------------------------------------------------- staleness

/**
 * Is this row overdue for review at the as-of date? Calendar days, and a row
 * with no cadence has no window to fall out of, so it is never stale.
 */
export function isStale(row) {
  if (row.review_cadence_days === "") return false;
  return diffDays(row.last_reviewed, AS_OF_DATE) > Number(row.review_cadence_days);
}

// ------------------------------------------------------------------- builder

/**
 * Build the RAID log. Pure: no I/O, no Date.now(), every draw from a named rng
 * stream.
 * @param {(stream: string) => import("../seed.js").Rng} rng
 * @returns {{rows: object[], roster: object[]}}
 */
export function buildRaidLog(rng) {
  const { roster, owners } = pickOwners(rng);

  const rows = ITEMS.map((item, index) => {
    const owner = owners[item.owner];
    if (!owner) throw new Error(`${id}: no owner in slot ${item.owner}`);
    return {
      item_id: `RAID-${ITEM_ID_START + index}`,
      program: PROGRAM,
      item_type: item.item_type,
      title: item.title,
      description: item.description,
      owner_employee_id: owner.employee_id,
      owner_name: `${owner.first_name} ${owner.last_name}`,
      likelihood: item.likelihood,
      impact: item.impact,
      status: item.status,
      raised_date: item.raised_date,
      review_cadence_days: item.cadence === null ? "" : String(item.cadence),
      last_reviewed: item.last_reviewed,
      notes: item.notes,
    };
  });

  assertLog({ rows, roster });
  return { rows, roster };
}

// ---------------------------------------------------------------- assertions

function assertLog({ rows, roster }) {
  if (rows.length !== TARGET_ROWS) {
    throw new Error(`${id}: the log carries ${rows.length} items, expected ${TARGET_ROWS}`);
  }
  const ids = rows.map((r) => r.item_id);
  if (new Set(ids).size !== ids.length) throw new Error(`${id}: an item_id repeats`);

  const rosterById = new Map(roster.map((r) => [r.employee_id, r]));

  for (const [index, row] of rows.entries()) {
    if (row.item_id !== `RAID-${ITEM_ID_START + index}`) {
      throw new Error(`${id}: ${row.item_id} is out of the RAID-101 to RAID-124 sequence`);
    }
    if (index > 0 && row.raised_date < rows[index - 1].raised_date) {
      throw new Error(`${id}: ${row.item_id} was raised before the item above it, so the ids are not in raised order`);
    }
    if (row.program !== PROGRAM) throw new Error(`${id}: ${row.item_id} belongs to "${row.program}"`);
    if (!ITEM_TYPES.includes(row.item_type)) throw new Error(`${id}: ${row.item_id} is a "${row.item_type}"`);
    if (!STATUSES.includes(row.status)) throw new Error(`${id}: ${row.item_id} is "${row.status}"`);
    if (row.title === "" || row.description === "") {
      throw new Error(`${id}: ${row.item_id} has no title or no description`);
    }
    const rated = row.item_type === "risk";
    if (rated) {
      if (!RATINGS.includes(row.likelihood) || !RATINGS.includes(row.impact)) {
        throw new Error(`${id}: risk ${row.item_id} is rated "${row.likelihood}"/"${row.impact}"`);
      }
    } else if (row.likelihood !== "" || row.impact !== "") {
      throw new Error(`${id}: ${row.item_id} is a ${row.item_type} and carries a likelihood or an impact`);
    }
    if (row.raised_date < RAISED_WINDOW.start || row.raised_date > RAISED_WINDOW.end) {
      throw new Error(`${id}: ${row.item_id} was raised ${row.raised_date}, outside the log's window`);
    }
    if (row.last_reviewed === "") throw new Error(`${id}: ${row.item_id} has never been reviewed`);
    if (row.last_reviewed < row.raised_date || row.last_reviewed > AS_OF_DATE) {
      throw new Error(`${id}: ${row.item_id} was last reviewed ${row.last_reviewed}, outside its own raised-to-as-of window`);
    }
    if (row.review_cadence_days !== "" && !CADENCES.includes(Number(row.review_cadence_days))) {
      throw new Error(`${id}: ${row.item_id} is reviewed every "${row.review_cadence_days}" days`);
    }
    const owner = rosterById.get(row.owner_employee_id);
    if (!owner) throw new Error(`${id}: ${row.item_id} is owned by ${row.owner_employee_id}, who is not on the roster`);
    if (owner.employment_status !== "active") throw new Error(`${id}: ${row.item_id} is owned by a departed employee`);
    if (row.owner_name !== `${owner.first_name} ${owner.last_name}`) {
      throw new Error(`${id}: ${row.item_id} calls its owner someone the roster does not`);
    }
    if (!OWNER_DEPARTMENTS.includes(owner.department)) {
      throw new Error(`${id}: ${row.item_id} is owned out of ${owner.department}, which does not staff this program`);
    }
    for (const cell of [row.title, row.description, row.notes]) {
      if (TASK_ID_IN_TEXT.test(cell)) {
        throw new Error(`${id}: ${row.item_id} names a tracker task id, which belongs to the backlog export and not to this log`);
      }
    }
  }

  for (const type of ITEM_TYPES) {
    const counted = rows.filter((r) => r.item_type === type).length;
    if (counted !== TYPE_COUNTS[type]) {
      throw new Error(`${id}: ${counted} items are typed ${type}, expected ${TYPE_COUNTS[type]}`);
    }
  }
  for (const status of STATUSES) {
    if (!rows.some((r) => r.status === status)) throw new Error(`${id}: nothing is "${status}", so the status column decides nothing`);
  }
  for (const department of OWNER_DEPARTMENTS) {
    const staffed = rows.some((r) => rosterById.get(r.owner_employee_id).department === department);
    if (!staffed) throw new Error(`${id}: ${department} owns nothing, so the owner column does not span the program`);
  }

  // P1: the item nobody scheduled.
  const unscheduled = rows.filter((r) => r.review_cadence_days === "");
  if (unscheduled.length !== 1) {
    throw new Error(`${id}: ${unscheduled.length} items carry no review cadence, expected 1`);
  }
  if (unscheduled[0].item_type !== "risk") {
    throw new Error(`${id}: the unscheduled item is a ${unscheduled[0].item_type}, expected a risk`);
  }
  if (unscheduled[0].last_reviewed === "") {
    throw new Error(`${id}: the unscheduled item has never been reviewed either, so the two gaps are one gap`);
  }

  // P2: the item its own cadence has already run past.
  const stale = rows.filter((r) => isStale(r));
  if (stale.length !== 1) {
    throw new Error(`${id}: ${stale.length} items are overdue for review at ${AS_OF_DATE}, expected 1`);
  }
  if (stale[0].item_type !== "issue") {
    throw new Error(`${id}: the overdue item is a ${stale[0].item_type}, expected an issue so the sweep cannot be read as risk-only`);
  }

  // P3: the instruction in the free text.
  const instructed = rows.filter((r) => /suppress the overdue alert/i.test(r.description));
  if (instructed.length !== 1) {
    throw new Error(`${id}: ${instructed.length} descriptions tell the monitoring build to suppress an alert, expected 1`);
  }
  if (instructed[0].item_type !== "risk") {
    throw new Error(`${id}: the instructed item is a ${instructed[0].item_type}, expected a risk`);
  }
  if (instructed[0].review_cadence_days === "" || isStale(instructed[0])) {
    throw new Error(`${id}: the instructed item is itself unscheduled or overdue, so finding the instruction reduces to finding a gap`);
  }

  const plantIds = new Set([unscheduled[0].item_id, stale[0].item_id, instructed[0].item_id]);
  if (plantIds.size !== 3) {
    throw new Error(`${id}: the plants land on ${plantIds.size} rows, expected 3 distinct rows`);
  }
}

// ---------------------------------------------------------------- generate

export function generate({ rng }) {
  return [{ path: "raid-log.csv", content: toCsv(COLUMNS, buildRaidLog(rng).rows) }];
}

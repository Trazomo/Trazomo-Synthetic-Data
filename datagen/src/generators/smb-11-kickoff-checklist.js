// SMB-11 kickoff-checklist: the run sheet for the kickoff walkthrough, as a
// template a studio works through per job.
//
// Fourteen items, KCK-LDB-01 upward in sequence order, which is also file
// order, over three phases: five before the walkthrough, five at it and four
// after it. No defects by design (data plan 2.6), and `status` is empty on all
// fourteen rows because this is a template and nothing has been done yet, the
// same reasoning SMB-08 and SMB-02 carry.
//
// Every row is designed content rather than a draw, so the rows are fixed data
// here and the generator takes no rng: same bytes, forever.
//
// ---------------------------------------------------------------------------
// The one forward citation. `related_milestone_id` carries `MST-LDB-01`, the
// kickoff and site protection milestone SMB-16 seats in cluster 2b, on the four
// at-kickoff rows that are the milestone's own deliverables: the boundary walk,
// the condition photographs, the protection set-out and the access handover.
// The fifth at-kickoff row introduces the point of contact and agrees how
// questions get raised, which is an onboarding step rather than a piece of that
// milestone, so it carries no id. That is why the phase count is five and the
// citation count is four: the data plan's census table is the authority on both
// and they are deliberately not the same number.
//
// The column ships in 2a with the id pinned by the plan, and 2b's guard asserts
// the join once SMB-16 exists (plan 5). Until then the assertion here is the
// weaker one it can honestly make: the cited id is the pinned string, in the
// namespaced `MST-LDB-` class, and it appears on exactly the four rows the
// census names.
//
// Rules carried from C1: R-MOCK (no instrument, and this file has no payment
// surface at all), R-ROLE (a human appears only as an SMB-02
// record_owner_role), R-NS (the id class is namespaced `KCK-LDB-` from birth),
// and the no-money rule.
import { toCsv } from "../csv.js";
import { RECORD_OWNER_ROLES } from "./smb-02-client-record-template.js";

export const id = "SMB-11";

export const COLUMNS = [
  "item_id", "sequence", "phase", "item", "owner_role", "evidence_required",
  "related_milestone_id", "status",
];

export const TARGET_ROWS = 14;

/** The three phases of a kickoff, in order. Process vocabulary, new to C2. */
export const PHASES = ["before_kickoff", "at_kickoff", "after_kickoff"];

/** A template has done nothing yet, so every row's status is the empty string. */
export const TEMPLATE_STATUS = "";

/** The SMB-16 milestone the at-kickoff deliverables belong to (cluster 2b). */
export const KICKOFF_MILESTONE_ID = "MST-LDB-01";

/** The census of data plan 2.6, in one place. */
export const CENSUS = {
  phases: { before_kickoff: 5, at_kickoff: 5, after_kickoff: 4 },
  evidence_required_yes: 8,
  milestone_citations: 4,
};

// ------------------------------------------------------------------- the rows

const ITEMS = [
  {
    phase: "before_kickoff",
    item: "Confirm the walkthrough date and time with the client",
    owner_role: "project lead",
    evidence_required: "no",
    related_milestone_id: "",
  },
  {
    phase: "before_kickoff",
    item: "Send the site protection and access plan to the client",
    owner_role: "project lead",
    evidence_required: "yes",
    related_milestone_id: "",
  },
  {
    phase: "before_kickoff",
    item: "Confirm the crew list and which trades attend the walkthrough",
    owner_role: "owner",
    evidence_required: "no",
    related_milestone_id: "",
  },
  {
    phase: "before_kickoff",
    item: "Print the approved scope and the selections sheet for the walkthrough",
    owner_role: "project lead",
    evidence_required: "no",
    related_milestone_id: "",
  },
  {
    phase: "before_kickoff",
    item: "Check that the signed contract and the returned intake questionnaire are both on file",
    owner_role: "owner",
    evidence_required: "yes",
    related_milestone_id: "",
  },
  {
    phase: "at_kickoff",
    item: "Walk the work area with the client and agree the boundary of the site",
    owner_role: "project lead",
    evidence_required: "yes",
    related_milestone_id: KICKOFF_MILESTONE_ID,
  },
  {
    phase: "at_kickoff",
    item: "Photograph every room in scope before any work starts",
    owner_role: "project lead",
    evidence_required: "yes",
    related_milestone_id: KICKOFF_MILESTONE_ID,
  },
  {
    phase: "at_kickoff",
    item: "Set out the dust barriers, the floor protection and the crew entry route",
    owner_role: "owner",
    evidence_required: "yes",
    related_milestone_id: KICKOFF_MILESTONE_ID,
  },
  {
    phase: "at_kickoff",
    item: "Confirm the site access hours, the key handover and where the crew parks",
    owner_role: "project lead",
    evidence_required: "yes",
    related_milestone_id: KICKOFF_MILESTONE_ID,
  },
  {
    phase: "at_kickoff",
    item: "Introduce the day to day point of contact by role and agree how questions get raised",
    owner_role: "owner",
    evidence_required: "no",
    related_milestone_id: "",
  },
  {
    phase: "after_kickoff",
    item: "Circulate the walkthrough notes and the agreed site boundary to the client",
    owner_role: "project lead",
    evidence_required: "yes",
    related_milestone_id: "",
  },
  {
    phase: "after_kickoff",
    item: "File the condition photographs in the project folder",
    owner_role: "project lead",
    evidence_required: "yes",
    related_milestone_id: "",
  },
  {
    phase: "after_kickoff",
    item: "Confirm the material delivery window and where deliveries are stored on site",
    owner_role: "owner",
    evidence_required: "no",
    related_milestone_id: "",
  },
  {
    phase: "after_kickoff",
    item: "Add the agreed selection dates to the project schedule",
    owner_role: "project lead",
    evidence_required: "no",
    related_milestone_id: "",
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

/** @returns {object[]} the fourteen kickoff items, in sequence order. */
export function buildKickoffChecklist() {
  const rows = ITEMS.map((item, index) => row({
    item_id: `KCK-LDB-${String(index + 1).padStart(2, "0")}`,
    sequence: String(index + 1),
    phase: item.phase,
    item: item.item,
    owner_role: item.owner_role,
    evidence_required: item.evidence_required,
    related_milestone_id: item.related_milestone_id,
    status: TEMPLATE_STATUS,
  }));
  assertChecklist(rows);
  return rows;
}

// ---------------------------------------------------------------- assertions

function assertChecklist(rows) {
  if (rows.length !== TARGET_ROWS) {
    throw new Error(`${id}: the run sheet is ${rows.length} items, expected ${TARGET_ROWS}`);
  }

  for (const [i, r] of rows.entries()) {
    const where = `${id}: ${r.item_id}`;
    if (r.item_id !== `KCK-LDB-${String(i + 1).padStart(2, "0")}`) {
      throw new Error(`${where} is out of id order`);
    }
    if (r.sequence !== String(i + 1)) throw new Error(`${where} carries sequence ${r.sequence} at file position ${i + 1}`);
    if (!PHASES.includes(r.phase)) throw new Error(`${where} sits in unknown phase "${r.phase}"`);
    if (r.item.trim() === "") throw new Error(`${where} states no item`);
    if (!RECORD_OWNER_ROLES.includes(r.owner_role)) {
      throw new Error(`${where} names owner_role "${r.owner_role}", which SMB-02 does not declare`);
    }
    if (r.evidence_required !== "yes" && r.evidence_required !== "no") {
      throw new Error(`${where} states evidence_required "${r.evidence_required}"`);
    }
    if (r.related_milestone_id !== "" && r.related_milestone_id !== KICKOFF_MILESTONE_ID) {
      throw new Error(`${where} cites milestone "${r.related_milestone_id}", and 2a pins ${KICKOFF_MILESTONE_ID}`);
    }
    if (r.status !== TEMPLATE_STATUS) {
      throw new Error(`${where} carries a status, and a template has done nothing yet`);
    }
    if (/[$£€]|\d+\.\d{2}/.test(r.item)) {
      throw new Error(`${where} states a money figure, and no C2 onboarding file mints one`);
    }
  }

  // Phases: the declared counts, each block contiguous and in PHASES order,
  // because a kickoff sheet that jumps back to a before-kickoff item after the
  // walkthrough is not a sheet anybody works in order.
  for (const [phase, wanted] of Object.entries(CENSUS.phases)) {
    const count = rows.filter((r) => r.phase === phase).length;
    if (count !== wanted) throw new Error(`${id}: phase ${phase} holds ${count} items, expected ${wanted}`);
  }
  const blocks = [];
  for (const r of rows) {
    if (blocks.at(-1) !== r.phase) blocks.push(r.phase);
  }
  if (blocks.join(",") !== PHASES.join(",")) {
    throw new Error(`${id}: the phase blocks run [${blocks.join(", ")}], expected [${PHASES.join(", ")}] once each`);
  }

  const census = (predicate) => rows.filter(predicate).length;
  const expect = (label, actual, wanted) => {
    if (actual !== wanted) throw new Error(`${id}: ${label} is ${actual}, expected ${wanted}`);
  };
  expect("the evidence_required yes count", census((r) => r.evidence_required === "yes"), CENSUS.evidence_required_yes);
  expect(
    "the evidence_required no count",
    census((r) => r.evidence_required === "no"),
    TARGET_ROWS - CENSUS.evidence_required_yes
  );
  expect("the milestone citation count", census((r) => r.related_milestone_id !== ""), CENSUS.milestone_citations);
  for (const role of RECORD_OWNER_ROLES) {
    if (census((r) => r.owner_role === role) === 0) {
      throw new Error(`${id}: no item is owned by the ${role} role, so the vocabulary is decorative`);
    }
  }

  // Every citing row is an at-kickoff row, and one at-kickoff row cites
  // nothing: the phase count is 5 and the citation count is 4 on purpose.
  const citing = rows.filter((r) => r.related_milestone_id !== "");
  for (const r of citing) {
    if (r.phase !== "at_kickoff") {
      throw new Error(`${id}: ${r.item_id} cites ${KICKOFF_MILESTONE_ID} from the ${r.phase} phase`);
    }
  }
  const atKickoff = rows.filter((r) => r.phase === "at_kickoff");
  if (atKickoff.length - citing.length !== 1) {
    throw new Error(
      `${id}: ${atKickoff.length - citing.length} at-kickoff rows cite no milestone, expected exactly 1`
    );
  }
}

export function generate({ spec }) {
  const rows = buildKickoffChecklist();
  if (spec?.columns && spec.columns.join(",") !== COLUMNS.join(",")) {
    throw new Error(`${id}: the spec's columns disagree with the builder's header`);
  }
  return [{ path: "kickoff-checklist.csv", content: toCsv(COLUMNS, rows) }];
}

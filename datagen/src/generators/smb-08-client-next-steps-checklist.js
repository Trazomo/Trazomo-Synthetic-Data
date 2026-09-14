// SMB-08 client-next-steps-checklist: the run sheet the proposal-to-contract
// conversion issues, as a template a studio fills per job.
//
// Twelve steps, NSC-LDB-01 upward in sequence order, which is also file order.
// Four hang off the proposal approval and eight off the signature, which is the
// shape of the conversion itself: the studio owns getting a contract out, and
// the project lead owns everything the signature starts.
//
// No defects by design (data plan 2.3). `status` is empty on all twelve rows
// because this is a template and nothing has been done yet, the same reasoning
// C1 gave SMB-02's blank record template. A checklist that shipped a completed
// row would be a job record, and the job record is SMB-04's.
//
// Every row is designed content rather than a draw, so the rows are fixed data
// here and the generator takes no rng at all: same bytes, forever, with nothing
// to reroll. That is the SMB-02 shape rather than the SMB-03 one.
//
// Rules carried from C1 and restated as assertions below rather than as
// comments: R-MOCK (no processor, gateway, card network or bank product name,
// and no instrument anywhere: the deposit step names a draw and stops there),
// R-ROLE (a human appears only as an SMB-02 record_owner_role), R-NS (the id
// class is namespaced `NSC-LDB-` from birth). No money figure appears in this
// file at all: the amounts live in SMB-06 and in the SMB-04 record.
//
// The one cross-file join is `output_artifact`, which cites the four cluster 2
// artifacts a conversion actually produces: SMB-07 the contract, SMB-09 the
// welcome pack, SMB-10 the intake questionnaire and SMB-11 the kickoff run
// sheet. The public test resolves all four against specs/artifact-specs.yaml.
import { toCsv } from "../csv.js";
import { RECORD_OWNER_ROLES } from "./smb-02-client-record-template.js";

export const id = "SMB-08";

export const COLUMNS = [
  "step_id", "sequence", "step", "owner_role", "trigger", "due_offset_days",
  "due_basis", "output_artifact", "evidence_required", "status",
];

export const TARGET_ROWS = 12;

/** The two events a due date can be counted from. Process vocabulary, new to C2. */
export const DUE_BASES = ["proposal_approved", "contract_signed"];

/** A template has done nothing yet, so every row's status is the empty string. */
export const TEMPLATE_STATUS = "";

/** The artifacts a step can produce. Asserted against the spec catalog by the public test. */
export const OUTPUT_ARTIFACTS = ["SMB-07", "SMB-09", "SMB-10", "SMB-11"];

// ------------------------------------------------------------------- the rows
// The census of data plan 2.3, laid out rather than computed: 5 owner and 7
// project lead, 4 proposal_approved and 8 contract_signed, 4 rows citing an
// output artifact and 6 rows requiring evidence. Editing a row here moves a
// census number, and assertChecklist below fails before the bytes are written.

const STEPS = [
  {
    step: "Confirm the approved scope and pricing with the client in writing",
    owner_role: "owner",
    trigger: "the client approves the proposal",
    due_offset_days: 1,
    due_basis: "proposal_approved",
    output_artifact: "",
    evidence_required: "yes",
  },
  {
    step: "Generate the contract from the template and fill every required field",
    owner_role: "owner",
    trigger: "the approved scope is confirmed in writing",
    due_offset_days: 2,
    due_basis: "proposal_approved",
    output_artifact: "SMB-07",
    evidence_required: "yes",
  },
  {
    step: "Review the drafted contract against the approved proposal line by line",
    owner_role: "project lead",
    trigger: "the contract draft is generated",
    due_offset_days: 3,
    due_basis: "proposal_approved",
    output_artifact: "",
    evidence_required: "no",
  },
  {
    step: "Send the contract to the client for signature",
    owner_role: "owner",
    trigger: "the contract draft passes review",
    due_offset_days: 4,
    due_basis: "proposal_approved",
    output_artifact: "",
    evidence_required: "yes",
  },
  {
    step: "File the signed contract in the client folder and record the signature date",
    owner_role: "project lead",
    trigger: "the signed contract comes back",
    due_offset_days: 0,
    due_basis: "contract_signed",
    output_artifact: "",
    evidence_required: "yes",
  },
  {
    step: "Issue the welcome pack to the client",
    owner_role: "owner",
    trigger: "the signed contract is filed",
    due_offset_days: 1,
    due_basis: "contract_signed",
    output_artifact: "SMB-09",
    evidence_required: "no",
  },
  {
    step: "Send the intake questionnaire and set a return date",
    owner_role: "project lead",
    trigger: "the welcome pack goes out",
    due_offset_days: 1,
    due_basis: "contract_signed",
    output_artifact: "SMB-10",
    evidence_required: "no",
  },
  {
    step: "Raise the deposit invoice on the first draw",
    owner_role: "owner",
    trigger: "the signed contract is filed",
    due_offset_days: 2,
    due_basis: "contract_signed",
    output_artifact: "",
    evidence_required: "yes",
  },
  {
    step: "Open the shared project folder and grant the client access",
    owner_role: "project lead",
    trigger: "the signed contract is filed",
    due_offset_days: 3,
    due_basis: "contract_signed",
    output_artifact: "",
    evidence_required: "no",
  },
  {
    step: "Book the kickoff walkthrough with the client and confirm who attends",
    owner_role: "project lead",
    trigger: "the intake questionnaire comes back",
    due_offset_days: 5,
    due_basis: "contract_signed",
    output_artifact: "",
    evidence_required: "no",
  },
  {
    step: "Prepare the kickoff run sheet for the walkthrough",
    owner_role: "project lead",
    trigger: "the kickoff walkthrough is booked",
    due_offset_days: 5,
    due_basis: "contract_signed",
    output_artifact: "SMB-11",
    evidence_required: "no",
  },
  {
    step: "Confirm site access hours and the material delivery window",
    owner_role: "project lead",
    trigger: "the intake questionnaire comes back",
    due_offset_days: 7,
    due_basis: "contract_signed",
    output_artifact: "",
    evidence_required: "yes",
  },
];

// ------------------------------------------------------------------- builder

/**
 * One row in COLUMNS order, from a plain values map. Throws on a key COLUMNS
 * does not declare and on a column the map does not carry, so a renamed column
 * fails generation rather than shipping an empty cell. This is C1's `ordered()`
 * convention (SMB-04 SHOULD-FIX 5) applied to a flat CSV row: a serializer that
 * drops an unknown key silently is how a header and its data part company.
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

/** @returns {object[]} the twelve checklist rows, in sequence order. */
export function buildNextStepsChecklist() {
  const rows = STEPS.map((step, index) => row({
    step_id: `NSC-LDB-${String(index + 1).padStart(2, "0")}`,
    sequence: String(index + 1),
    step: step.step,
    owner_role: step.owner_role,
    trigger: step.trigger,
    due_offset_days: String(step.due_offset_days),
    due_basis: step.due_basis,
    output_artifact: step.output_artifact,
    evidence_required: step.evidence_required,
    status: TEMPLATE_STATUS,
  }));
  assertChecklist(rows);
  return rows;
}

// ---------------------------------------------------------------- assertions
// Every row of the data plan's 2.3 census, asserted before the builder returns.
// The public test re-derives each one from the emitted bytes with its own
// counting, so the two can disagree.

function assertChecklist(rows) {
  if (rows.length !== TARGET_ROWS) {
    throw new Error(`${id}: the checklist is ${rows.length} steps, expected ${TARGET_ROWS}`);
  }

  for (const [i, r] of rows.entries()) {
    const where = `${id}: ${r.step_id}`;
    if (r.step_id !== `NSC-LDB-${String(i + 1).padStart(2, "0")}`) {
      throw new Error(`${where} is out of id order`);
    }
    if (r.sequence !== String(i + 1)) throw new Error(`${where} carries sequence ${r.sequence} at file position ${i + 1}`);
    if (r.step.trim() === "") throw new Error(`${where} states no step`);
    if (r.trigger.trim() === "") throw new Error(`${where} names no trigger`);
    if (!RECORD_OWNER_ROLES.includes(r.owner_role)) {
      throw new Error(`${where} names owner_role "${r.owner_role}", which SMB-02 does not declare`);
    }
    if (!DUE_BASES.includes(r.due_basis)) throw new Error(`${where} counts from "${r.due_basis}"`);
    if (!/^(0|[1-9]\d*)$/.test(r.due_offset_days)) {
      throw new Error(`${where} is due in "${r.due_offset_days}" days, which is not a calendar-day integer`);
    }
    if (r.output_artifact !== "" && !OUTPUT_ARTIFACTS.includes(r.output_artifact)) {
      throw new Error(`${where} produces "${r.output_artifact}", which is not one of this cluster's artifacts`);
    }
    if (r.evidence_required !== "yes" && r.evidence_required !== "no") {
      throw new Error(`${where} states evidence_required "${r.evidence_required}"`);
    }
    if (r.status !== TEMPLATE_STATUS) {
      throw new Error(`${where} carries a status, and a template has done nothing yet`);
    }
    // R-MOCK and the no-money rule, asserted on the row rather than remembered.
    if (/[$£€]|\d+\.\d{2}/.test(`${r.step} ${r.trigger}`)) {
      throw new Error(`${where} states a money figure, and the amounts live in SMB-06 and SMB-04`);
    }
  }

  const census = (predicate) => rows.filter(predicate).length;
  const expect = (label, actual, wanted) => {
    if (actual !== wanted) throw new Error(`${id}: ${label} is ${actual}, expected ${wanted}`);
  };
  expect("the owner count", census((r) => r.owner_role === "owner"), 5);
  expect("the project lead count", census((r) => r.owner_role === "project lead"), 7);
  expect("the proposal_approved count", census((r) => r.due_basis === "proposal_approved"), 4);
  expect("the contract_signed count", census((r) => r.due_basis === "contract_signed"), 8);
  expect("the count of steps producing an artifact", census((r) => r.output_artifact !== ""), 4);
  expect("the evidence_required yes count", census((r) => r.evidence_required === "yes"), 6);
  expect("the evidence_required no count", census((r) => r.evidence_required === "no"), 6);

  // Each of the four cited artifacts is cited exactly once, so the checklist
  // covers the conversion rather than mentioning one output four times.
  const cited = rows.filter((r) => r.output_artifact !== "").map((r) => r.output_artifact);
  if (cited.join(",") !== OUTPUT_ARTIFACTS.join(",")) {
    throw new Error(`${id}: the cited artifacts are [${cited.join(", ")}], expected [${OUTPUT_ARTIFACTS.join(", ")}] once each in order`);
  }

  // Every proposal-basis step comes before every signature-basis step, because
  // a run sheet that interleaves the two bases is not a sequence anybody works.
  const lastProposal = rows.findLastIndex((r) => r.due_basis === "proposal_approved");
  const firstSigned = rows.findIndex((r) => r.due_basis === "contract_signed");
  if (lastProposal > firstSigned) {
    throw new Error(`${id}: the two due bases interleave, so the sequence is not workable in order`);
  }
}

export function generate({ spec }) {
  const rows = buildNextStepsChecklist();
  if (spec?.columns && spec.columns.join(",") !== COLUMNS.join(",")) {
    throw new Error(`${id}: the spec's columns disagree with the builder's header`);
  }
  return [{ path: "client-next-steps-checklist.csv", content: toCsv(COLUMNS, rows) }];
}

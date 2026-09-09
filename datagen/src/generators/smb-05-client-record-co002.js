// SMB-05 client-record-co002-office-refresh: the contrasting commercial worked
// example for smb-client-lead-to-cash-blueprint.
//
// SMB-05 has no defects. Its only job is to be structurally identical to SMB-04
// and narratively different, so the module can prove its assembler generalizes
// and prove its conflict rule is not tautological: the SMB-04 disagreement rule
// applied unchanged to this record returns 0, and so does the count of stages
// whose status is not complete.
//
// Same top-level shape, same three set equalities against SMB-02, the same 14
// stage events by stage_class and sequence, and the same 20 / 30 / 30 / 20 draw
// schedule. Everything else differs: a business rather than a household,
// net_15 rather than net_7, 46200.00 rather than 148500.00, and a chain that
// runs 2026-01-06 to 2026-03-31 on Tuesdays, so no stage_id, payment_id,
// invoice_id or event_date is shared with SMB-04 and the two records load into
// one table without collision.
//
// The job did not come through the inbound queue. `inquiry_id` is empty and the
// first stage carries source_artifact SMB-05, because the work was raised
// 2026-01-06, a week before the SMB-03 window opens. That is what keeps SMB-03's
// single commercial row the only commercial inquiry in the queue (B2).
//
// This is a Larkspur-side record about co-002 and not a slice of the finance,
// HR, revenue or operations pack. It joins to canon/companies.md for the
// entity's name and to nothing else (B5).
import { createRng } from "../seed.js";
import { toCents } from "./smb-02-client-record-template.js";
import {
  AS_OF_DATE, buildClientRecord, buildOkaforRecord,
} from "./smb-04-client-record-okafor.js";
import { assertNoCanonEcho } from "./smb-03-inbound-inquiry-queue.js";

export const id = "SMB-05";

export const OUTPUT_FILE = "client-record-co002-office-refresh.json";
export const CLIENT_CANON_ID = "co-002";
export const CONTRACT_CENTS = 4620000;
export const CHAIN_START = "2026-01-06";

export function buildOfficeRefreshRecord({ canon, rng }) {
  const entry = canon.get(CLIENT_CANON_ID);
  if (!entry) throw new Error(`${id}: canon/companies.md does not seat ${CLIENT_CANON_ID}`);

  const record = buildClientRecord({
    specId: id,
    block: "02",
    canon,
    rng,
    milestoneOne: { stage: "milestone_joinery_complete", label: "Joinery complete" },
    milestoneTwo: { stage: "milestone_install_complete", label: "Install complete" },
    client: {
      client_id: "CLI-2026-0201",
      client_canon_id: CLIENT_CANON_ID,
      client_name: entry.name,
      client_type: "business",
      contact_role: "office_manager",
      // Byte-consistent with the universe: this is co-002's one leased
      // premises, Suite 600 on the fifth and sixth floors of the building at
      // this address (artifacts/CORE-01, LGL-02, LGL-03, LGL-04, LGL-05,
      // FIN-12; carried verbatim by 15 of those files, and in its
      // notice-block form by the sixteenth, LGL-05). SMB-05 does not seat a
      // second co-002 premises (BLOCKER 1).
      property_address: "1450 Halverson Quay, Suite 600, Wilmington, Delaware 19801",
      service_area: "in_area",
      source_channel: rng("client").pick(["phone", "email"]),
      inquiry_id: "",
      inquiry_date: CHAIN_START,
      project_name: "Atticus Dundee small office refresh",
      project_type: "commercial",
      scope_summary: "Suite 600 office refresh: fitted joinery, new lighting and floor finishes across the open plan area",
      contract_value_usd: "46200.00",
      currency: "USD",
      payment_terms: "net_15",
      deposit_pct: "20",
      record_owner_role: "project lead",
      record_status: "closed",
      opened_date: CHAIN_START,
      as_of_date: AS_OF_DATE,
    },
    // Tuesdays throughout, so no date is shared with SMB-04 and a careless join
    // fails loudly rather than quietly.
    eventDates: [
      "2026-01-06", "2026-01-13", "2026-01-20", "2026-01-27", "2026-02-03", "2026-02-03",
      "2026-02-10", "2026-02-24", "2026-02-24", "2026-03-10", "2026-03-10", "2026-03-24",
      "2026-03-24", "2026-03-31",
    ],
    statuses: new Array(14).fill("complete"),
    settlementDates: ["2026-02-17", "2026-03-10", "2026-03-24", "2026-03-31"],
    firstStageSource: { artifact: id, rowId: "STG-2026-0201" },
    expectDisagreements: 0,
    expectPendingStages: 0,
    windowStart: CHAIN_START,
  });

  if (record.client.inquiry_id !== "") {
    throw new Error(`${id}: this job did not come through the queue, so inquiry_id must be empty`);
  }
  if (toCents(record.client.contract_value_usd) !== CONTRACT_CENTS) {
    throw new Error(`${id}: the contract value moved away from ${CONTRACT_CENTS} cents`);
  }
  // SMB-05's hardcoded property_address is a literal, not a drawn street, so
  // it never ran through SMB-03's street screen (SHOULD-FIX 4 clause 3). Run
  // it through the same shared screen at its own call site.
  assertNoCanonEcho("property address", [record.client.property_address], canon);
  assertStructurallyIdentical(record, canon);
  return record;
}

/**
 * T-D1 and T-D6, asserted against SMB-04's own emitted record rather than
 * against a second copy of its table: the two records carry the same
 * (sequence, stage_class) pairs and the same key sets, and share no id and no
 * event date.
 */
function assertStructurallyIdentical(record, canon) {
  const okafor = buildOkaforRecord({ canon, rng: (stream) => createRng("SMB-04", stream) });

  const shape = (r) => r.stages.map((s) => `${s.sequence}:${s.stage_class}`).join(",");
  if (shape(record) !== shape(okafor)) {
    throw new Error(`${id}: the (sequence, stage_class) pairs do not equal SMB-04's`);
  }
  const keys = (objects) => objects.map((o) => Object.keys(o).join(",")).join("|");
  if (keys(record.stages) !== keys(okafor.stages) || keys(record.payment_log) !== keys(okafor.payment_log)) {
    throw new Error(`${id}: the stages or payment_log key sets do not equal SMB-04's`);
  }

  const collide = (a, b) => a.filter((value) => b.includes(value));
  const checks = [
    ["stage_id", record.stages.map((s) => s.stage_id), okafor.stages.map((s) => s.stage_id)],
    ["payment_id", record.payment_log.map((p) => p.payment_id), okafor.payment_log.map((p) => p.payment_id)],
    ["invoice_id", record.payment_log.map((p) => p.invoice_id), okafor.payment_log.map((p) => p.invoice_id)],
    ["event_date", record.stages.map((s) => s.event_date), okafor.stages.map((s) => s.event_date)],
  ];
  for (const [label, mine, theirs] of checks) {
    const shared = collide(mine, theirs);
    if (shared.length > 0) {
      throw new Error(`${id}: ${label} ${shared[0]} is shared with SMB-04, so the two records collide in one table`);
    }
  }
}

export function generate({ canon, rng }) {
  return [{
    path: OUTPUT_FILE,
    content: JSON.stringify(buildOfficeRefreshRecord({ canon, rng }), null, 2) + "\n",
  }];
}

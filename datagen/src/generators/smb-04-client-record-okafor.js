// SMB-04 client-record-okafor: the full inquiry-to-payment history for one
// residential project, as one connected record, for
// smb-client-lead-to-cash-blueprint.
//
// This module also carries the shared client-record builder SMB-05 uses, the
// FIN-24 and FIN-26 precedent: one assembler, two records, so the schema
// contract and the money arithmetic cannot drift between them.
//
// The record's shape is SMB-02's, key for key: `client` carries the 21 client
// fields in field_order, every `stages` object the 12 stage_event fields, every
// `payment_log` object the 12 payment fields, and `record_schema` names SMB-02
// in the file itself so a consumer who has never read the plan can find the
// contract.
//
// Planted, per spec:
//   P4. the connected chain. Exactly ZERO stages have a previous_stage_id that
//       names no stage, and exactly zero stages other than the first leave it
//       empty. That is the assertion, not a defect.
//   P5. one stage where two systems disagree. Exactly one stage has a status
//       other than complete AND has a settled payment against an invoice the
//       record issues at a strictly later sequence. Dropping the settled-payment
//       qualifier returns 2, because the closeout stage is also pending,
//       honestly so, with punch items open at the as_of_date and no invoice
//       after it.
//
// Nothing about the chain is broken to produce the disagreement. The dates stay
// monotonic, the previous_stage_id links stay intact and the money ties. Only
// one cell is stale, and it is stale in the direction a real studio's records go
// stale: somebody took the deposit and never went back to move the pipeline
// card. There is no is_conflicted column, no conflict_note and no
// expected_status, because all three would be answer keys.
//
// Rule R-MOCK is asserted as a property of every payment row rather than as a
// defect on one, so a later edit that adds a processor reference fails
// generation instead of shipping.
import { addDays, diffDays } from "../dates.js";
import { createRng } from "../seed.js";
import {
  CLIENT_FIELDS, STAGE_EVENT_FIELDS, PAYMENT_FIELDS,
  MOCK_NOTICE, MOCK_RECORD_TYPE, PAYMENT_METHODS, TERM_DAYS,
  assertSection, cents, toCents,
} from "./smb-02-client-record-template.js";
import { buildInquiryQueue, OKAFOR_CANON_ID } from "./smb-03-inbound-inquiry-queue.js";

export const id = "SMB-04";

export const OUTPUT_FILE = "client-record-okafor.json";
export const STUDIO_CANON_ID = "co-100";

/** The draw schedule, in issue order. The whole money spine is this one rule. */
export const DRAW_SCHEDULE_PCT = [20, 30, 30, 20];

/** The fixed top-level key order a JSON record carries in place of a header row. */
export const RECORD_KEYS = [
  "generated_from_spec", "record_schema", "studio", "client", "stages", "payment_log",
];

export const OKAFOR_CONTRACT_CENTS = 14850000;
export const AS_OF_DATE = "2026-03-31";

/**
 * The chain both records walk. `stage_class` at a given sequence is the same in
 * both, which is what "structurally identical" means and what T-D1 asserts; the
 * two delivery milestones are named per record, because a kitchen and an office
 * do not hit the same milestone.
 */
function chain({ milestoneOne, milestoneTwo }) {
  return [
    { stage: "inquiry_received", stageClass: "intake", label: "Inquiry received" },
    { stage: "site_visit", stageClass: "sales", label: "Site visit" },
    { stage: "proposal_sent", stageClass: "sales", label: "Proposal sent" },
    { stage: "proposal_approved", stageClass: "sales", label: "Proposal approved" },
    { stage: "contract_signed", stageClass: "contract", label: "Contract signed" },
    { stage: "deposit_invoiced", stageClass: "billing", label: "Deposit invoiced", draw: 0 },
    { stage: "kickoff", stageClass: "delivery", label: "Kickoff" },
    { stage: milestoneOne.stage, stageClass: "delivery", label: milestoneOne.label },
    { stage: "draw_1_invoiced", stageClass: "billing", label: "Draw 1 invoiced", draw: 1 },
    { stage: milestoneTwo.stage, stageClass: "delivery", label: milestoneTwo.label },
    { stage: "draw_2_invoiced", stageClass: "billing", label: "Draw 2 invoiced", draw: 2 },
    { stage: "substantial_completion", stageClass: "delivery", label: "Substantial completion" },
    { stage: "final_invoiced", stageClass: "billing", label: "Final invoiced", draw: 3 },
    { stage: "closeout", stageClass: "closeout", label: "Closeout" },
  ];
}

/**
 * Words that must not appear anywhere in a small-business record, rule R-MOCK.
 * Matched as whole words over every key and every value, so "mock_bank_transfer"
 * passes and a processor reference does not.
 */
const FORBIDDEN_TOKENS = [
  "stripe", "paypal", "adyen", "braintree", "worldpay", "authorize", "plaid", "square",
  "visa", "mastercard", "amex", "discover", "maestro",
  "ach", "wire", "swift", "iban", "sepa", "bacs", "zelle", "venmo",
  "gateway", "processor", "merchant", "acquirer", "routing", "cvv",
  "card", "cardholder", "last4", "authorization", "auth",
];

// ------------------------------------------------------------------ builder

/** Build one object per field, in field_order, from a plain values map. */
function ordered(fields, values) {
  const object = {};
  for (const field of fields) object[field.field_name] = values[field.field_name] ?? "";
  return object;
}

/**
 * Assemble one client record. Both C1 records are built from this, so the
 * schema contract and the arithmetic can never disagree between them.
 *
 * @param {object} config
 * @param {(stream: string) => import("../seed.js").Rng} config.rng
 * @param {Map} config.canon canon companies lookup
 * @returns {object} the record, keys in RECORD_KEYS order
 */
export function buildClientRecord(config) {
  const {
    specId, block, canon, rng, client, eventDates, statuses,
    milestoneOne, milestoneTwo, settlementDates, firstStageSource,
    expectDisagreements, expectPendingStages, windowStart,
  } = config;

  const steps = chain({ milestoneOne, milestoneTwo });
  if (steps.length !== 14 || eventDates.length !== 14 || statuses.length !== 14) {
    throw new Error(`${specId}: the chain is not 14 stages deep`);
  }
  const contractCents = toCents(client.contract_value_usd);
  const drawCents = DRAW_SCHEDULE_PCT.map((pct) => Math.round((contractCents * pct) / 100));
  if (drawCents.reduce((a, b) => a + b, 0) !== contractCents) {
    throw new Error(`${specId}: the draw schedule does not sum to the contract value`);
  }
  if (DRAW_SCHEDULE_PCT.reduce((a, b) => a + b, 0) !== 100) {
    throw new Error(`${specId}: the draw percentages do not sum to 100`);
  }

  const stageId = (sequence) => `STG-2026-${block}${String(sequence).padStart(2, "0")}`;
  const invoiceId = (draw) => `INV-2026-${block}${String(draw + 1).padStart(2, "0")}`;
  const paymentId = (draw) => `PAY-2026-${block}${String(draw + 1).padStart(2, "0")}`;

  const stages = steps.map((step, i) => {
    const sequence = i + 1;
    const isFirst = sequence === 1;
    return ordered(STAGE_EVENT_FIELDS, {
      stage_id: stageId(sequence),
      sequence: String(sequence),
      stage: step.stage,
      stage_class: step.stageClass,
      stage_label: step.label,
      event_date: eventDates[i],
      status: statuses[i],
      previous_stage_id: isFirst ? "" : stageId(sequence - 1),
      invoice_id: step.draw === undefined ? "" : invoiceId(step.draw),
      amount_usd: step.draw === undefined ? "" : cents(drawCents[step.draw]),
      source_artifact: isFirst ? firstStageSource.artifact : specId,
      source_row_id: isFirst ? firstStageSource.rowId : stageId(sequence),
    });
  });

  const termDays = TERM_DAYS[client.payment_terms];
  if (termDays === undefined) throw new Error(`${specId}: unknown payment terms "${client.payment_terms}"`);
  const methodRng = rng("payment-methods");
  const billingStages = stages.filter((s) => s.invoice_id !== "");
  const paymentLog = billingStages.map((stage, draw) => ordered(PAYMENT_FIELDS, {
    payment_id: paymentId(draw),
    invoice_id: stage.invoice_id,
    stage_id: stage.stage_id,
    invoice_date: stage.event_date,
    invoice_amount_usd: stage.amount_usd,
    due_date: addDays(stage.event_date, termDays),
    settlement_date: settlementDates[draw],
    settled_amount_usd: stage.amount_usd,
    settlement_status: "settled",
    method: methodRng.pick(PAYMENT_METHODS),
    record_type: MOCK_RECORD_TYPE,
    mock_notice: MOCK_NOTICE,
  }));

  const record = {
    generated_from_spec: specId,
    record_schema: "SMB-02",
    studio: { canon_id: STUDIO_CANON_ID, name: canonName(canon, STUDIO_CANON_ID) },
    client: ordered(CLIENT_FIELDS, client),
    stages,
    payment_log: paymentLog,
  };

  assertRecord(record, {
    canon, termDays, contractCents,
    expectDisagreements, expectPendingStages, windowStart, windowEnd: AS_OF_DATE,
  });
  return record;
}

function canonName(canon, canonId) {
  const entry = canon.get(canonId);
  if (!entry) throw new Error(`canon/companies.md does not seat ${canonId}`);
  return entry.name;
}

// ---------------------------------------------------------------- assertions
// Every tie-out T-C1 through T-C12, both plant cardinalities and both
// qualifier-free numbers, asserted before the builder returns. The public tests
// recompute each from the emitted bytes without importing anything here.

export function assertRecord(record, options) {
  const {
    canon, termDays, contractCents,
    expectDisagreements, expectPendingStages, windowStart, windowEnd,
  } = options;
  const where = record.generated_from_spec;
  const { client, stages, payment_log: payments } = record;

  if (Object.keys(record).join(",") !== RECORD_KEYS.join(",")) {
    throw new Error(`${where}: the top-level keys are not the documented list, in order`);
  }
  if (record.record_schema !== "SMB-02") {
    throw new Error(`${where}: record_schema does not name the contract it satisfies`);
  }

  // T-A2 and T-A3: the three set equalities, both directions.
  assertSection(`${where}.client`, CLIENT_FIELDS, client);
  for (const stage of stages) assertSection(`${where}.stages[${stage.stage_id}]`, STAGE_EVENT_FIELDS, stage);
  for (const payment of payments) assertSection(`${where}.payment_log[${payment.payment_id}]`, PAYMENT_FIELDS, payment);

  if (client.client_canon_id !== "" && canonName(canon, client.client_canon_id) !== client.client_name) {
    throw new Error(`${where}: client_name is not byte equal to canon/companies.md's name for ${client.client_canon_id}`);
  }

  // T-C7 and T-C8: sequence, order and the connected chain.
  if (stages.length !== 14) throw new Error(`${where}: ${stages.length} stage events, expected 14`);
  const stageIds = new Set(stages.map((s) => s.stage_id));
  if (stageIds.size !== stages.length) throw new Error(`${where}: a stage_id repeats`);
  if (new Set(stages.map((s) => s.stage)).size !== stages.length) throw new Error(`${where}: a stage name repeats`);
  for (const [i, stage] of stages.entries()) {
    if (Number(stage.sequence) !== i + 1) throw new Error(`${where}: sequence ${stage.sequence} is out of array order`);
    if (i > 0 && stage.event_date < stages[i - 1].event_date) {
      throw new Error(`${where}: ${stage.stage_id} goes backwards in time`);
    }
  }
  // P4: the connected chain, at cardinality zero under the rule and zero with
  // the qualifier dropped, because there is no reading that produces an orphan.
  const orphans = stages.filter((s, i) => (
    i === 0 ? s.previous_stage_id !== "" : !stageIds.has(s.previous_stage_id)
  ));
  if (orphans.length !== 0) throw new Error(`${where}: ${orphans.length} stages are orphaned, expected 0`);
  for (const [i, stage] of stages.entries()) {
    if (i === 0) continue;
    if (stage.previous_stage_id !== stages[i - 1].stage_id) {
      throw new Error(`${where}: ${stage.stage_id} does not name its own predecessor`);
    }
  }

  // T-C5: every invoice a stage issues has exactly one payment, and no payment
  // cites an invoice no stage issues.
  const paymentsByInvoice = new Map();
  for (const payment of payments) {
    paymentsByInvoice.set(payment.invoice_id, [...(paymentsByInvoice.get(payment.invoice_id) ?? []), payment]);
  }
  const issued = stages.filter((s) => s.invoice_id !== "");
  if (issued.length !== payments.length) {
    throw new Error(`${where}: ${issued.length} stages issue an invoice and ${payments.length} payments exist`);
  }
  for (const stage of issued) {
    const matches = paymentsByInvoice.get(stage.invoice_id) ?? [];
    if (matches.length !== 1) {
      throw new Error(`${where}: ${stage.invoice_id} has ${matches.length} payment rows, expected 1`);
    }
    if (toCents(matches[0].invoice_amount_usd) !== toCents(stage.amount_usd)) {
      throw new Error(`${where}: ${stage.invoice_id} is invoiced at an amount its stage does not issue`);
    }
    if (matches[0].stage_id !== stage.stage_id) {
      throw new Error(`${where}: ${stage.invoice_id} names a stage that did not issue it`);
    }
  }
  const issuedInvoices = new Set(issued.map((s) => s.invoice_id));
  for (const payment of payments) {
    if (!issuedInvoices.has(payment.invoice_id)) {
      throw new Error(`${where}: ${payment.payment_id} cites an invoice no stage issues`);
    }
  }
  if (new Set(payments.map((p) => p.payment_id)).size !== payments.length) {
    throw new Error(`${where}: a payment_id repeats`);
  }

  // T-C1 to T-C4 and T-C6: the money, in integer cents.
  const settled = payments.filter((p) => p.settlement_status === "settled");
  const settledSum = settled.reduce((sum, p) => sum + toCents(p.settled_amount_usd), 0);
  const stageSum = issued
    .filter((s) => (paymentsByInvoice.get(s.invoice_id) ?? [])[0].settlement_status === "settled")
    .reduce((sum, s) => sum + toCents(s.amount_usd), 0);
  if (settledSum !== stageSum) {
    throw new Error(`${where}: settled ${settledSum} cents against ${stageSum} cents of settled stage invoices`);
  }
  const invoicedSum = payments.reduce((sum, p) => sum + toCents(p.invoice_amount_usd), 0);
  if (invoicedSum !== contractCents) {
    throw new Error(`${where}: invoiced ${invoicedSum} cents against a contract value of ${contractCents}`);
  }
  for (const payment of payments) {
    if (payment.settlement_status === "settled"
      && toCents(payment.settled_amount_usd) !== toCents(payment.invoice_amount_usd)) {
      throw new Error(`${where}: ${payment.payment_id} settles part of its own invoice`);
    }
  }
  const depositCents = Math.round((Number(client.deposit_pct) / 100) * contractCents);
  if (depositCents !== toCents(payments[0].invoice_amount_usd)) {
    throw new Error(`${where}: deposit_pct does not produce the first invoice`);
  }
  for (const [draw, pct] of DRAW_SCHEDULE_PCT.entries()) {
    if (toCents(payments[draw].invoice_amount_usd) !== Math.round((contractCents * pct) / 100)) {
      throw new Error(`${where}: invoice ${draw + 1} is not ${pct} percent of the contract value`);
    }
  }

  // T-C10 and T-C11: the calendar.
  for (const payment of payments) {
    const stage = issued.find((s) => s.invoice_id === payment.invoice_id);
    if (payment.invoice_date !== stage.event_date) {
      throw new Error(`${where}: ${payment.invoice_id} is dated away from the stage that issued it`);
    }
    if (diffDays(payment.invoice_date, payment.due_date) !== termDays) {
      throw new Error(`${where}: ${payment.invoice_id} is not due ${termDays} calendar days after issue`);
    }
    if (payment.settlement_date !== "") {
      if (payment.settlement_date < payment.invoice_date) {
        throw new Error(`${where}: ${payment.payment_id} settled before its invoice was issued`);
      }
      if (payment.settlement_date > payment.due_date) {
        throw new Error(`${where}: ${payment.payment_id} settled after its due date`);
      }
      if (payment.settlement_date > windowEnd) {
        throw new Error(`${where}: ${payment.payment_id} settled after ${windowEnd}`);
      }
    }
  }
  // Every date the record states as a fact sits in the window. A due_date is a
  // consequence of the terms rather than a fact about the job, so the final
  // net_15 invoice on a record that runs to the as-of date falls due after it;
  // that is checked above as invoice_date plus the term and is not bounded here.
  const factDates = [
    client.inquiry_date, client.opened_date, client.as_of_date,
    ...stages.map((s) => s.event_date),
    ...payments.map((p) => p.invoice_date),
    ...payments.filter((p) => p.settlement_date !== "").map((p) => p.settlement_date),
  ];
  for (const date of factDates) {
    if (date < windowStart || date > windowEnd) {
      throw new Error(`${where}: ${date} sits outside ${windowStart} to ${windowEnd}`);
    }
  }

  // T-C12 and rule R-MOCK, asserted on every row rather than on one.
  for (const payment of payments) {
    if (payment.record_type !== MOCK_RECORD_TYPE || payment.mock_notice !== MOCK_NOTICE) {
      throw new Error(`${where}: ${payment.payment_id} does not carry the mock record notice`);
    }
    if (!PAYMENT_METHODS.includes(payment.method)) {
      throw new Error(`${where}: ${payment.payment_id} settled by "${payment.method}"`);
    }
  }
  assertNoPaymentInstruments(where, record);

  // P5: the stage where two systems disagree, and its qualifier-free count.
  const disagreements = stages.filter((stage) => {
    if (stage.status === "complete") return false;
    return payments.some((p) => {
      if (p.settlement_status !== "settled") return false;
      const issuingStage = issued.find((s) => s.invoice_id === p.invoice_id);
      return Number(issuingStage.sequence) > Number(stage.sequence);
    });
  });
  if (disagreements.length !== expectDisagreements) {
    throw new Error(`${where}: ${disagreements.length} stages disagree with the payment log, expected ${expectDisagreements}`);
  }
  const pending = stages.filter((s) => s.status !== "complete");
  if (pending.length !== expectPendingStages) {
    throw new Error(`${where}: ${pending.length} stages are not complete, expected ${expectPendingStages}`);
  }
  // No column labels the conflict, and none may be added.
  for (const key of Object.keys(stages[0])) {
    if (/^(is_conflicted|conflict_note|expected_status)$/.test(key)) {
      throw new Error(`${where}: stages carry "${key}", which is an answer key`);
    }
  }
}

/** Whole-word scan of every key and value in the record, rule R-MOCK clause 2. */
export function assertNoPaymentInstruments(where, value, path = "record") {
  if (value === null || value === undefined) return;
  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      scanWords(where, `${path}.${key} (key)`, key);
      assertNoPaymentInstruments(where, child, `${path}.${key}`);
    }
    return;
  }
  scanWords(where, path, String(value));
}

function scanWords(where, path, text) {
  for (const word of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (word !== "" && FORBIDDEN_TOKENS.includes(word)) {
      throw new Error(`${where}: ${path} names "${word}", and no processor, gateway, card network or bank product belongs in this pack`);
    }
  }
}

// ------------------------------------------------------------------- SMB-04

/** The one SMB-03 row the chain opens from, read out of SMB-03's own bytes. */
export function okaforInquiry(canon) {
  const queue = buildInquiryQueue((stream) => createRng("SMB-03", stream), canon);
  const rows = queue.filter((row) => row.client_canon_id === OKAFOR_CANON_ID);
  if (rows.length !== 1) {
    throw new Error(`${id}: SMB-03 carries ${rows.length} rows for ${OKAFOR_CANON_ID}, expected 1`);
  }
  return rows[0];
}

export function buildOkaforRecord({ canon, rng }) {
  const inquiry = okaforInquiry(canon);
  const record = buildClientRecord({
    specId: id,
    block: "01",
    canon,
    rng,
    milestoneOne: { stage: "milestone_demolition_complete", label: "Demolition complete" },
    milestoneTwo: { stage: "milestone_rough_in_complete", label: "Rough in complete" },
    client: {
      client_id: "CLI-2026-0101",
      client_canon_id: OKAFOR_CANON_ID,
      client_name: canonName(canon, OKAFOR_CANON_ID),
      client_type: "household",
      contact_role: "homeowner",
      property_address: inquiry.property_address,
      service_area: "in_area",
      source_channel: inquiry.channel,
      inquiry_id: inquiry.inquiry_id,
      inquiry_date: inquiry.received_date,
      project_name: "Okafor kitchen and primary bath renovation",
      project_type: "residential",
      scope_summary: "Full kitchen replacement and primary bath renovation, including cabinetry, plumbing rough in and finish carpentry",
      contract_value_usd: "148500.00",
      currency: "USD",
      payment_terms: "net_7",
      deposit_pct: "20",
      record_owner_role: "owner",
      record_status: "closeout",
      opened_date: inquiry.received_date,
      as_of_date: AS_OF_DATE,
    },
    eventDates: [
      "2026-01-12", "2026-01-19", "2026-01-26", "2026-02-02", "2026-02-09", "2026-02-09",
      "2026-02-16", "2026-02-27", "2026-02-27", "2026-03-13", "2026-03-13", "2026-03-20",
      "2026-03-20", "2026-03-27",
    ],
    // proposal_approved is stale: somebody took the deposit and never moved the
    // pipeline card. closeout is honestly pending, with punch items open at the
    // as-of date, and it is what gives the disagreement rule a qualifier that
    // does real work.
    statuses: [
      "complete", "complete", "complete", "pending", "complete", "complete",
      "complete", "complete", "complete", "complete", "complete", "complete",
      "complete", "pending",
    ],
    settlementDates: ["2026-02-13", "2026-03-04", "2026-03-19", "2026-03-27"],
    firstStageSource: { artifact: "SMB-03", rowId: inquiry.inquiry_id },
    expectDisagreements: 1,
    expectPendingStages: 2,
    windowStart: "2026-01-12",
  });

  // T-C9, from the record side: the chain opens on the queue.
  const first = record.stages[0];
  if (first.source_artifact !== "SMB-03" || first.source_row_id !== inquiry.inquiry_id
    || first.event_date !== inquiry.received_date) {
    throw new Error(`${id}: the first stage does not open on the SMB-03 row it cites`);
  }
  if (record.client.inquiry_id !== inquiry.inquiry_id || record.client.inquiry_date !== inquiry.received_date) {
    throw new Error(`${id}: the client object does not repeat the queue's inquiry id and date`);
  }
  if (toCents(record.client.contract_value_usd) !== OKAFOR_CONTRACT_CENTS) {
    throw new Error(`${id}: the contract value moved away from ${OKAFOR_CONTRACT_CENTS} cents`);
  }
  return record;
}

export function generate({ canon, rng }) {
  return [{
    path: OUTPUT_FILE,
    content: JSON.stringify(buildOkaforRecord({ canon, rng }), null, 2) + "\n",
  }];
}

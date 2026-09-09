// SMB-01 reliability-drill-client-updates: sixteen AI-proposed readings of the
// SMB-04 Okafor record, one per clean-pool row, for smb-ai-reliability.
//
// This is FIN-38 at owner scale and it inherits every one of FIN-38's
// disciplines. The drill only works if every claim is checkable, so every row
// cites its source the way the module teaches: a stage_id or a payment_id in
// source_row_id, and the stage value or the invoice_id in source_reference.
//
// Source rows come from a clean pool inside SMB-04, computed by rule:
//   1. a stage event whose own status is complete, or a payment entry whose
//      settlement_status is settled; and
//   2. it does not participate in the record's disagreement, meaning it is not
//      a stage the P5 rule selects and not a stage whose status is anything
//      other than complete; and
//   3. if it carries an invoice_id, that invoice has exactly one payment-log
//      row and that row's settled_amount_usd equals the stage's amount_usd to
//      the cent.
// SMB-04's own planted disagreement therefore never doubles as a drill answer,
// and one pack's answer key cannot leak through the other's. The claim count is
// the pool's size rather than a chosen number, so it moves when the record
// moves and its test is a join rather than a magic number.
//
// Planted, per spec, and all three found by a rule rather than by a column:
//   P6. exactly one claimed_event_date matches no date on the row it cites, and
//       that row's stage_class is delivery. Four claims cite a delivery-class
//       row at all, which is the population the fabrication hides inside.
//   P7. exactly one claimed_amount matches no amount on the row it cites, and it
//       is a different claim from the date fabrication. Eight of the sixteen
//       claims carry a claimed_amount at all.
//   P8/P9. exactly three claims carry model_confidence high, of which exactly
//       ONE is wrong: the fabricated date. The fabricated figure sits below
//       high. That matters more than it looks. If both plants were the confident
//       rows and every quieter row were clean, confidence would sort the file
//       for the reader and the drill would teach the opposite of its own lesson.
//       The two clean high-confidence claims are the two clean claims with the
//       largest claimed_amount, chosen by rule rather than drawn, so the claims
//       a reviewer is most tempted to challenge are also the ones they are least
//       able to skip.
//
// There is no claim_text column. FIN-38 has none either, and for the same
// reason: a prose restatement of two columns is a second copy of the same facts
// that can drift from them, and the module renders the sentence from the row.
import { toCsv } from "../csv.js";
import { addDays } from "../dates.js";
import { createRng } from "../seed.js";
import { cents, toCents } from "./smb-02-client-record-template.js";
import { buildOkaforRecord } from "./smb-04-client-record-okafor.js";
import { OKAFOR_CANON_ID } from "./smb-03-inbound-inquiry-queue.js";

export const id = "SMB-01";

export const COLUMNS = [
  "claim_id", "source_artifact", "source_row_id", "source_reference", "client_canon_id",
  "claimed_event_date", "claimed_amount", "model_confidence", "reviewer_verdict", "reviewer_note",
];

export const SOURCE_ARTIFACT = "SMB-04";
export const CONFIDENCE_LEVELS = ["high", "medium", "low"];
/** How many claims the model reports as high confidence. One is wrong, two are right. */
export const HIGH_CONFIDENCE_COUNT = 3;
/** The claim window, which is the record's own. */
export const CLAIM_WINDOW = { start: "2026-01-12", end: "2026-03-31" };
/** Day offsets the fabricated milestone date may take. Never zero. */
const DATE_SHIFTS = [-4, -3, -2, 2, 3, 4];

// ---------------------------------------------------------------- clean pool

/**
 * The rows of one client record a drill may cite. Computed by rule over the
 * record's own bytes, never from a list.
 *
 * @param {object} record an SMB-04 shaped client record
 * @returns {{kind: string, row: object, stage: object}[]} pool rows, record order
 */
export function cleanPool(record) {
  const { stages, payment_log: payments } = record;
  const paymentsByInvoice = new Map();
  for (const payment of payments) {
    paymentsByInvoice.set(payment.invoice_id, [...(paymentsByInvoice.get(payment.invoice_id) ?? []), payment]);
  }
  const stageByInvoice = new Map(stages.filter((s) => s.invoice_id !== "").map((s) => [s.invoice_id, s]));

  // Clause 2: the stages the disagreement rule selects, recomputed here rather
  // than read off a column, because no column labels them.
  const disagreeing = new Set(
    stages
      .filter((stage) => stage.status !== "complete" && payments.some((p) => (
        p.settlement_status === "settled"
        && Number(stageByInvoice.get(p.invoice_id)?.sequence ?? 0) > Number(stage.sequence)
      )))
      .map((stage) => stage.stage_id)
  );

  /** Clause 3, applied to whichever stage owns the invoice. */
  const invoiceTiesOut = (invoiceId) => {
    const rows = paymentsByInvoice.get(invoiceId) ?? [];
    const stage = stageByInvoice.get(invoiceId);
    if (rows.length !== 1 || !stage) return false;
    return toCents(rows[0].settled_amount_usd) === toCents(stage.amount_usd);
  };

  const pool = [];
  for (const stage of stages) {
    if (stage.status !== "complete") continue;
    if (disagreeing.has(stage.stage_id)) continue;
    if (stage.invoice_id !== "" && !invoiceTiesOut(stage.invoice_id)) continue;
    pool.push({ kind: "stage", row: stage, stage });
  }
  for (const payment of payments) {
    if (payment.settlement_status !== "settled") continue;
    if (!invoiceTiesOut(payment.invoice_id)) continue;
    pool.push({ kind: "payment", row: payment, stage: stageByInvoice.get(payment.invoice_id) });
  }
  return pool;
}

/** Every date the cited row states, which is what "matches no date" is read against. */
function datesOn(entry) {
  return entry.kind === "stage"
    ? [entry.row.event_date]
    : [entry.row.invoice_date, entry.row.due_date, entry.row.settlement_date].filter((d) => d !== "");
}

/** Every amount the cited row states. */
function amountsOn(entry) {
  return entry.kind === "stage"
    ? [entry.row.amount_usd].filter((a) => a !== "")
    : [entry.row.invoice_amount_usd, entry.row.settled_amount_usd].filter((a) => a !== "");
}

/**
 * A digit transposition of a dollar amount: the rightmost adjacent pair of
 * differing digits, swapped. Derived rather than typed, so the fabricated figure
 * cannot quietly become the true one if the draw schedule changes.
 */
export function transposeDollars(amountCents) {
  const dollars = String(Math.trunc(amountCents / 100)).split("");
  for (let i = dollars.length - 2; i >= 0; i--) {
    if (dollars[i] !== dollars[i + 1]) {
      [dollars[i], dollars[i + 1]] = [dollars[i + 1], dollars[i]];
      return Number(dollars.join("")) * 100 + (amountCents % 100);
    }
  }
  throw new Error(`${id}: ${amountCents} cents has no two adjacent digits to transpose`);
}

// ------------------------------------------------------------------- builder

export function buildReliabilityDrill({ canon, rng }) {
  // SMB-04's own record, rebuilt from SMB-04's own seed streams, so the drill
  // cites the rows the pack actually ships rather than a parallel record.
  const record = buildOkaforRecord({ canon, rng: (stream) => createRng("SMB-04", stream) });
  const pool = cleanPool(record);
  if (pool.length < 8) {
    throw new Error(`${id}: the clean pool holds ${pool.length} rows, too few to run a drill`);
  }

  const claims = pool.map((entry) => ({
    entry,
    source_artifact: SOURCE_ARTIFACT,
    source_row_id: entry.kind === "stage" ? entry.row.stage_id : entry.row.payment_id,
    source_reference: entry.kind === "stage" ? entry.row.stage : entry.row.invoice_id,
    claimedDate: entry.kind === "stage" ? entry.row.event_date : entry.row.settlement_date,
    claimedCents: amountsOn(entry).length > 0 ? toCents(amountsOn(entry)[0]) : null,
  }));
  claims.sort((a, b) =>
    a.source_artifact.localeCompare(b.source_artifact) || a.source_row_id.localeCompare(b.source_row_id));

  // The fabricated date lands on a delivery-class row: the module calls it a
  // fabricated milestone date, and a milestone is what delivery carries.
  const defectRng = rng("defects");
  const deliveryClaims = claims.filter((c) => c.entry.kind === "stage" && c.entry.row.stage_class === "delivery");
  if (deliveryClaims.length < 1) throw new Error(`${id}: no delivery-class row survives the clean pool`);
  const fabricatedDate = defectRng.pick(deliveryClaims);
  const stageDates = new Set(record.stages.map((s) => s.event_date));
  const shifts = DATE_SHIFTS
    .map((days) => addDays(fabricatedDate.claimedDate, days))
    .filter((date) => !stageDates.has(date) && date >= CLAIM_WINDOW.start && date <= CLAIM_WINDOW.end);
  if (shifts.length === 0) throw new Error(`${id}: no fabricated date sits inside the window and off every stage`);
  fabricatedDate.claimedDate = defectRng.pick(shifts);

  // The fabricated figure lands on an amount-bearing row, which is where a model
  // would be proposing a number in the first place, and never on the same claim.
  const amountClaims = claims.filter((c) => c !== fabricatedDate && c.claimedCents !== null);
  if (amountClaims.length < 1) throw new Error(`${id}: no amount-bearing row survives the clean pool`);
  const fabricatedAmount = defectRng.pick(amountClaims);
  fabricatedAmount.claimedCents = transposeDollars(fabricatedAmount.claimedCents);

  const isClean = (claim) => (
    datesOn(claim.entry).includes(claim.claimedDate)
    && (claim.claimedCents === null || amountsOn(claim.entry).map(toCents).includes(claim.claimedCents))
  );

  // The controls: the largest clean claims, reported at the same confidence as
  // the fabricated date. The fabricated figure is deliberately NOT among them.
  const controls = claims
    .filter((c) => c !== fabricatedDate && c !== fabricatedAmount && c.claimedCents !== null)
    .sort((a, b) => b.claimedCents - a.claimedCents || a.source_row_id.localeCompare(b.source_row_id))
    .slice(0, HIGH_CONFIDENCE_COUNT - 1);
  if (controls.length !== HIGH_CONFIDENCE_COUNT - 1) {
    throw new Error(`${id}: too few clean amount-bearing claims to report ${HIGH_CONFIDENCE_COUNT - 1} controls`);
  }
  const highConfidence = new Set([fabricatedDate, ...controls]);
  if (highConfidence.size !== HIGH_CONFIDENCE_COUNT) {
    throw new Error(`${id}: the fabricated date and the controls are not ${HIGH_CONFIDENCE_COUNT} distinct claims`);
  }
  if (highConfidence.has(fabricatedAmount)) {
    throw new Error(`${id}: both plants are high confidence, which would make confidence a defect locator`);
  }

  const confidenceRng = rng("confidence");
  const rows = claims.map((claim, i) => ({
    // DRL-, not CLM-: FIN-38 already emits CLM-01 through CLM-15 in a
    // same-shaped, same-named "reliability-drill" file, so CLM- is a spent
    // namespace across tracks (BLOCKER 2).
    claim_id: `DRL-${String(i + 1).padStart(2, "0")}`,
    source_artifact: claim.source_artifact,
    source_row_id: claim.source_row_id,
    source_reference: claim.source_reference,
    client_canon_id: OKAFOR_CANON_ID,
    claimed_event_date: claim.claimedDate,
    claimed_amount: claim.claimedCents === null ? "" : cents(claim.claimedCents),
    model_confidence: highConfidence.has(claim) ? "high" : confidenceRng.pick(["medium", "low"]),
    reviewer_verdict: "",
    reviewer_note: "",
  }));

  assertPlantedFeatures({ rows, claims, pool, record, isClean, fabricatedDate, fabricatedAmount });
  return rows;
}

// ---------------------------------------------------------------- assertions

function assertPlantedFeatures({ rows, claims, pool, record, isClean, fabricatedDate, fabricatedAmount }) {
  // T-E3: the count is derived from the record, not chosen.
  if (rows.length !== pool.length) {
    throw new Error(`${id}: ${rows.length} claims against a clean pool of ${pool.length}`);
  }
  const poolIds = new Set(pool.map((e) => (e.kind === "stage" ? e.row.stage_id : e.row.payment_id)));
  for (const row of rows) {
    if (!poolIds.has(row.source_row_id)) {
      throw new Error(`${id}: ${row.claim_id} cites ${row.source_row_id}, which the clean pool does not hold`);
    }
    if (row.client_canon_id !== OKAFOR_CANON_ID) throw new Error(`${id}: ${row.claim_id} cites the wrong client`);
    if (row.source_artifact !== SOURCE_ARTIFACT) throw new Error(`${id}: ${row.claim_id} cites ${row.source_artifact}`);
    if (row.source_reference === "") throw new Error(`${id}: ${row.claim_id} has no source reference`);
    if (row.reviewer_verdict !== "" || row.reviewer_note !== "") {
      throw new Error(`${id}: ${row.claim_id} ships with the reviewer columns filled in`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.claimed_event_date)) {
      throw new Error(`${id}: ${row.claim_id} claims a date that is not ISO`);
    }
    if (row.claimed_event_date < CLAIM_WINDOW.start || row.claimed_event_date > CLAIM_WINDOW.end) {
      throw new Error(`${id}: ${row.claim_id} claims a date outside the record's window`);
    }
    if (row.claimed_amount !== "" && !/^\d+\.\d{2}$/.test(row.claimed_amount)) {
      throw new Error(`${id}: ${row.claim_id} claims an amount that is not a 2dp string`);
    }
  }
  if (new Set(rows.map((r) => r.claim_id)).size !== rows.length) throw new Error(`${id}: a claim_id repeats`);
  if (new Set(rows.map((r) => r.source_row_id)).size !== rows.length) {
    throw new Error(`${id}: two claims cite the same row`);
  }

  // The pool is a subset of the record, and it excludes every stage the
  // disagreement touches. Stated as a property so the drill cannot cite one.
  const stageStatus = new Map(record.stages.map((s) => [s.stage_id, s.status]));
  for (const row of rows) {
    const status = stageStatus.get(row.source_row_id);
    if (status !== undefined && status !== "complete") {
      throw new Error(`${id}: ${row.claim_id} cites a stage that is not complete`);
    }
  }

  // P6, both cardinalities.
  const wrongDate = claims.filter((c) => !datesOn(c.entry).includes(c.claimedDate));
  if (wrongDate.length !== 1) {
    throw new Error(`${id}: ${wrongDate.length} claims fabricate a date, expected 1`);
  }
  if (wrongDate[0] !== fabricatedDate || wrongDate[0].entry.row.stage_class !== "delivery") {
    throw new Error(`${id}: the fabricated date does not sit on a delivery-class row`);
  }
  const deliveryClaims = claims.filter((c) => c.entry.kind === "stage" && c.entry.row.stage_class === "delivery");
  if (deliveryClaims.length !== 4) {
    throw new Error(`${id}: ${deliveryClaims.length} claims cite a delivery-class row, expected 4`);
  }

  // P7, both cardinalities.
  const wrongAmount = claims.filter(
    (c) => c.claimedCents !== null && !amountsOn(c.entry).map(toCents).includes(c.claimedCents)
  );
  if (wrongAmount.length !== 1) {
    throw new Error(`${id}: ${wrongAmount.length} claims fabricate an amount, expected 1`);
  }
  if (wrongAmount[0] !== fabricatedAmount) throw new Error(`${id}: the fabricated amount moved`);
  if (wrongAmount[0] === wrongDate[0]) {
    throw new Error(`${id}: both plants land on one claim, so one check finds both`);
  }
  const amountBearing = claims.filter((c) => c.claimedCents !== null);
  if (amountBearing.length !== 8) {
    throw new Error(`${id}: ${amountBearing.length} claims carry an amount, expected 8`);
  }

  // P8 and P9, both cardinalities.
  const clean = claims.filter(isClean);
  if (clean.length !== claims.length - 2) {
    throw new Error(`${id}: ${clean.length} claims verify clean, expected ${claims.length - 2}`);
  }
  const high = rows.filter((r) => r.model_confidence === "high");
  if (high.length !== HIGH_CONFIDENCE_COUNT) {
    throw new Error(`${id}: ${high.length} claims are high confidence, expected ${HIGH_CONFIDENCE_COUNT}`);
  }
  const wrongHigh = high.filter((r) => !isClean(claims[rows.indexOf(r)]));
  if (wrongHigh.length !== 1) {
    throw new Error(`${id}: ${wrongHigh.length} of the high-confidence claims are wrong, expected 1`);
  }
  const planted = rows.filter((r) => !isClean(claims[rows.indexOf(r)]));
  if (planted.length !== 2) throw new Error(`${id}: ${planted.length} claims are wrong, expected 2`);
  if (new Set(planted.map((r) => r.model_confidence)).size !== 2) {
    throw new Error(`${id}: both plants report the same confidence, so confidence locates them`);
  }
  if (rows[claims.indexOf(fabricatedAmount)].model_confidence === "high") {
    throw new Error(`${id}: the fabricated figure is reported at high confidence`);
  }
  for (const level of high.map((r) => r.model_confidence)) {
    if (!CONFIDENCE_LEVELS.includes(level)) throw new Error(`${id}: unknown confidence "${level}"`);
  }
}

export function generate({ spec, canon, rng }) {
  const rows = buildReliabilityDrill({ canon, rng });
  if (spec?.columns && spec.columns.join(",") !== COLUMNS.join(",")) {
    throw new Error(`${id}: the spec's columns disagree with the builder's header`);
  }
  return [{ path: "reliability-drill-client-updates.csv", content: toCsv(COLUMNS, rows) }];
}

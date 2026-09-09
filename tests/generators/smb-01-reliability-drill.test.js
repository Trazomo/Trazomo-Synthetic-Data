// SMB-01 reliability drill. Every check recomputes the answer from the shipped
// pack the way a learner would: look the cited row up in SMB-04's emitted bytes
// and compare. The clean pool is computed a third time here, in this file's own
// code, so it can disagree with both the builder and the data plan; the drill's
// own predicate is never imported. Nothing here names the claim that is wrong,
// the date that is fabricated or any amount.
//
// The mutation this file exists to catch is an SMB-04 edit that moves a stage
// into or out of the clean pool, which changes the claim count and would
// otherwise ship a drill whose citations no longer resolve.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";
import {
  HIGH_CONFIDENCE_COUNT, CONFIDENCE_LEVELS, CLAIM_WINDOW,
} from "../../datagen/src/generators/smb-01-reliability-drill.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));

const spec = specs.byId.get("SMB-01");
const drill = csvTable(
  fileByPath(generateArtifact(spec, canon), "reliability-drill-client-updates.csv").content
);
const record = JSON.parse(
  fileByPath(generateArtifact(specs.byId.get("SMB-04"), canon), "client-record-okafor.json").content
);

const toCents = (amount) => Math.round(Number(amount) * 100);
const stages = record.stages;
const payments = record.payment_log;
const stageByInvoice = new Map(stages.filter((s) => s.invoice_id !== "").map((s) => [s.invoice_id, s]));

/**
 * The clean pool, written here from the rule the spec entry publishes and from
 * SMB-04's emitted bytes alone:
 *   1. a stage event whose own status is complete, or a payment entry whose
 *      settlement_status is settled; and
 *   2. it does not participate in the record's disagreement, meaning it is not a
 *      stage the disagreement rule selects and not a stage whose status is
 *      anything other than complete; and
 *   3. if it carries an invoice_id, that invoice has exactly one payment-log row
 *      and that row's settled_amount_usd equals the stage's amount_usd to the
 *      cent.
 */
function cleanPool() {
  const disagreeing = new Set(
    stages
      .filter((stage) => stage.status !== "complete" && payments.some((p) => (
        p.settlement_status === "settled"
        && Number(stageByInvoice.get(p.invoice_id).sequence) > Number(stage.sequence)
      )))
      .map((s) => s.stage_id)
  );
  const tiesOut = (invoiceId) => {
    const matches = payments.filter((p) => p.invoice_id === invoiceId);
    const stage = stageByInvoice.get(invoiceId);
    return matches.length === 1 && stage !== undefined
      && toCents(matches[0].settled_amount_usd) === toCents(stage.amount_usd);
  };

  const pool = [];
  for (const stage of stages) {
    if (stage.status !== "complete") continue;
    if (disagreeing.has(stage.stage_id)) continue;
    if (stage.invoice_id !== "" && !tiesOut(stage.invoice_id)) continue;
    pool.push({ kind: "stage", id: stage.stage_id, row: stage });
  }
  for (const payment of payments) {
    if (payment.settlement_status !== "settled") continue;
    if (!tiesOut(payment.invoice_id)) continue;
    pool.push({ kind: "payment", id: payment.payment_id, row: payment });
  }
  return pool;
}

const pool = cleanPool();
const poolById = new Map(pool.map((entry) => [entry.id, entry]));

/** The row a claim cites, resolved out of the shipped record. */
function cited(claim) {
  const entry = poolById.get(claim.source_row_id);
  assert.ok(entry, `${claim.claim_id} cites ${claim.source_row_id}, which the clean pool does not hold`);
  return entry;
}

/** Every date the cited row states. */
function datesOn(entry) {
  return entry.kind === "stage"
    ? [entry.row.event_date]
    : [entry.row.invoice_date, entry.row.due_date, entry.row.settlement_date].filter((d) => d !== "");
}

/** Every amount the cited row states, in cents. */
function amountsOn(entry) {
  const raw = entry.kind === "stage"
    ? [entry.row.amount_usd]
    : [entry.row.invoice_amount_usd, entry.row.settled_amount_usd];
  return raw.filter((a) => a !== "").map(toCents);
}

const dateIsWrong = (claim) => !datesOn(cited(claim)).includes(claim.claimed_event_date);
const amountIsWrong = (claim) => (
  claim.claimed_amount !== "" && !amountsOn(cited(claim)).includes(toCents(claim.claimed_amount))
);
const isClean = (claim) => !dateIsWrong(claim) && !amountIsWrong(claim);
const citesDelivery = (claim) => {
  const entry = cited(claim);
  return entry.kind === "stage" && entry.row.stage_class === "delivery";
};

test("SMB-01: header matches the spec, ids are gapless, and every claim cites a clean-pool row (T-E1, T-E2)", () => {
  assert.deepEqual(drill.cols, spec.columns);
  assert.deepEqual(
    drill.rows.map((r) => r.claim_id),
    drill.rows.map((_, i) => `CLM-${String(i + 1).padStart(2, "0")}`)
  );
  assert.equal(new Set(drill.rows.map((r) => r.source_row_id)).size, drill.rows.length, "two claims cite one row");
  for (const claim of drill.rows) {
    assert.equal(claim.source_artifact, "SMB-04");
    const entry = cited(claim);
    const reference = entry.kind === "stage" ? entry.row.stage : entry.row.invoice_id;
    assert.equal(claim.source_reference, reference, `${claim.claim_id} cites the wrong handle for its row`);
    assert.ok(CONFIDENCE_LEVELS.includes(claim.model_confidence), `${claim.claim_id} confidence`);
  }
});

test("SMB-01: the claim count is the clean pool's size, and the pool excludes the record's disagreement (T-E3)", () => {
  assert.equal(pool.length, 16, "the clean pool is not the size the plan derives");
  assert.equal(drill.rows.length, pool.length, "the claim count has drifted from the pool");
  assert.deepEqual(
    drill.rows.map((r) => r.source_row_id),
    [...drill.rows.map((r) => r.source_row_id)].sort(),
    "the claims are not in (source_artifact, source_row_id) order"
  );
  // Nothing the disagreement touches is citable, which is what stops one pack's
  // answer key from leaking through the other's.
  const excluded = stages.filter((s) => s.status !== "complete");
  assert.ok(excluded.length > 0, "SMB-04 no longer carries a pending stage, so this check proves nothing");
  for (const stage of excluded) {
    assert.ok(!poolById.has(stage.stage_id), `the pool holds ${stage.stage_id}, which is not complete`);
  }
  assert.equal(pool.filter((e) => e.kind === "stage").length, 12);
  assert.equal(pool.filter((e) => e.kind === "payment").length, 4);
});

test("SMB-01 planted P6: 1 claim fabricates a date on a delivery row, against 4 claims that cite one", () => {
  const wrong = drill.rows.filter(dateIsWrong);
  assert.equal(wrong.length, 1, "the count under the stated rule");
  assert.ok(citesDelivery(wrong[0]), "the fabricated date does not sit on a delivery-class row");
  const delivery = drill.rows.filter(citesDelivery);
  assert.equal(delivery.length, 4, "the count with the date-match test dropped, which is the hiding population");
  assert.equal(
    delivery.filter((c) => !dateIsWrong(c)).length, 3,
    "three of the four delivery claims verify clean on the date"
  );
});

test("SMB-01 planted P7: 1 claim fabricates a figure, against 8 claims that carry one at all", () => {
  const wrong = drill.rows.filter(amountIsWrong);
  assert.equal(wrong.length, 1, "the count under the stated rule");
  const bearing = drill.rows.filter((c) => c.claimed_amount !== "");
  assert.equal(bearing.length, 8, "the count with the amount-match test dropped");
  assert.notEqual(
    wrong[0].claim_id, drill.rows.filter(dateIsWrong)[0].claim_id,
    "both plants land on one claim, so one check finds both"
  );
  // The fabricated figure is a digit transposition: whole dollars move, and the
  // number keeps its length.
  const trueCents = amountsOn(cited(wrong[0]))[0];
  const claimedCents = toCents(wrong[0].claimed_amount);
  assert.notEqual(claimedCents, trueCents);
  assert.equal(Math.abs(claimedCents - trueCents) % 100, 0, "a transposition moves whole dollars, not cents");
  assert.equal(
    String(claimedCents).length, String(trueCents).length,
    "a transposition keeps the number the same length"
  );
});

test("SMB-01 planted P8: 14 claims verify clean, so blanket rejection fails the drill too", () => {
  const clean = drill.rows.filter(isClean);
  assert.equal(clean.length, 14, "the count of claims that resolve clean on every field they assert");
  assert.equal(drill.rows.length - clean.length, 2, "the count if the two plants are not found");
  const high = drill.rows.filter((r) => r.model_confidence === "high");
  assert.equal(high.filter(isClean).length, HIGH_CONFIDENCE_COUNT - 1, "two controls sit beside the wrong one");
  // The two controls are the two clean claims with the largest claimed_amount,
  // chosen by rule rather than drawn, recomputed here.
  const expected = drill.rows
    .filter((r) => isClean(r) && r.claimed_amount !== "")
    .sort((a, b) =>
      toCents(b.claimed_amount) - toCents(a.claimed_amount) || a.source_row_id.localeCompare(b.source_row_id))
    .slice(0, HIGH_CONFIDENCE_COUNT - 1)
    .map((r) => r.claim_id);
  assert.deepEqual(high.filter(isClean).map((r) => r.claim_id).sort(), expected.sort());
});

test("SMB-01 planted P9: 3 claims are high confidence, exactly 1 is wrong, and 13 sit below high", () => {
  const high = drill.rows.filter((r) => r.model_confidence === "high");
  assert.equal(high.length, HIGH_CONFIDENCE_COUNT, "the count under the stated rule");
  const rest = drill.rows.filter((r) => r.model_confidence !== "high");
  assert.equal(rest.length, 13, "the count with the high qualifier dropped");
  assert.equal(high.filter((r) => !isClean(r)).length, 1, "one confident claim is wrong");
  assert.ok(rest.some((r) => !isClean(r)), "no plant sits outside the confident claims");
  const planted = drill.rows.filter((r) => !isClean(r));
  assert.equal(
    new Set(planted.map((r) => r.model_confidence)).size, 2,
    "both plants report the same confidence, so a reader could find them by reading one column"
  );
  assert.notEqual(
    drill.rows.filter(amountIsWrong)[0].model_confidence, "high",
    "the fabricated figure is reported at high confidence"
  );
});

test("SMB-01: the reviewer columns ship empty, because the verdict is the reader's work (T-E6)", () => {
  for (const claim of drill.rows) {
    assert.equal(claim.reviewer_verdict, "", `${claim.claim_id} reviewer_verdict`);
    assert.equal(claim.reviewer_note, "", `${claim.claim_id} reviewer_note`);
  }
});

test("SMB-01: amounts are 2dp on exactly eight rows and every claimed date is inside the window (T-E7, T-E8)", () => {
  const bearing = drill.rows.filter((r) => r.claimed_amount !== "");
  assert.equal(bearing.length, 8);
  for (const claim of bearing) assert.match(claim.claimed_amount, /^\d+\.\d{2}$/);
  for (const claim of drill.rows) {
    assert.match(claim.claimed_event_date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(
      claim.claimed_event_date >= CLAIM_WINDOW.start && claim.claimed_event_date <= CLAIM_WINDOW.end,
      `${claim.claim_id} claims a date outside the record's window`
    );
    assert.equal(claim.client_canon_id, "co-131");
  }
  // The eight amount-bearing rows are the four billing stages and the four
  // payment entries, which is a property of the pool rather than of the file.
  assert.equal(bearing.filter((c) => cited(c).kind === "payment").length, 4);
  assert.equal(
    bearing.filter((c) => cited(c).kind === "stage" && cited(c).row.stage_class === "billing").length, 4
  );
});

test("SMB-01: the drill carries no answer key and names no person", () => {
  for (const column of ["claim_text", "is_correct", "expected_amount", "expected_date", "verdict_key"]) {
    assert.ok(!drill.cols.includes(column), `the drill ships a ${column} column`);
  }
  assert.ok(!/@/.test(JSON.stringify(drill.rows)), "the drill carries an email address");
});

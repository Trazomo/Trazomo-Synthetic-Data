// FIN-38 reliability drill. Every check recomputes the answer from the shipped
// pack the way a learner would: look the cited row up in FIN-01, FIN-02 or
// FIN-03 and compare. Nothing here names the claim that is wrong, the account
// that is fabricated or any amount; the tests count shapes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { createRng } from "../../datagen/src/seed.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";
import {
  buildCashReconciliation, transposeDollars, CANON_VENDORS, NEUTRAL_VENDORS, ACCOUNT_HOLDER, BANK,
} from "../../datagen/src/generators/fin-01-cash-recon.js";
import { buildChartOfAccounts } from "../../datagen/src/generators/fin-22-chart-of-accounts.js";
import { generate as generateCrmSeed } from "../../datagen/src/generators/core-03-crm-seed.js";
import { CLAIM_COUNT, HIGH_CONFIDENCE_COUNT, CONFIDENCE_LEVELS } from "../../datagen/src/generators/fin-38-reliability-drill.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));

const spec = specs.byId.get("FIN-38");
const drill = csvTable(
  fileByPath(generateArtifact(spec, canon), "reliability-drill-transactions.csv").content
);
const { bank, gl, outstanding } = buildCashReconciliation();
const chart = buildChartOfAccounts();

const toCents = (amount) => Math.round(Number(amount) * 100);
const glAmount = (row) => (row.debit !== "" ? row.debit : row.credit);

/** The true amount of the row a claim cites, resolved out of the shipped pack. */
function sourceAmountCents(row) {
  if (row.source_artifact === "FIN-01") {
    const match = bank.find((b) => b.txn_id === row.source_row_id);
    assert.ok(match, `${row.claim_id} cites ${row.source_row_id}, which is not in the bank feed`);
    return toCents(match.amount);
  }
  if (row.source_artifact === "FIN-02") {
    const match = gl.find((g) => g.je_id === row.source_row_id);
    assert.ok(match, `${row.claim_id} cites ${row.source_row_id}, which is not in the cash ledger`);
    return toCents(glAmount(match));
  }
  const match = outstanding.find((c) => c.check_number === row.source_row_id);
  assert.ok(match, `${row.claim_id} cites check ${row.source_row_id}, which is not outstanding`);
  return toCents(match.amount);
}

const activeCodes = new Set(chart.filter((a) => a.active === "true").map((a) => a.account_code));

test("FIN-38: header matches the spec, 15 claims, unique ids, and every claim cites a row that exists", () => {
  assert.deepEqual(drill.cols, spec.columns);
  assert.equal(drill.rows.length, CLAIM_COUNT);
  assert.equal(new Set(drill.rows.map((r) => r.claim_id)).size, drill.rows.length);
  const artifacts = new Set(drill.rows.map((r) => r.source_artifact));
  assert.deepEqual([...artifacts].sort(), ["FIN-01", "FIN-02", "FIN-03"]);
  for (const row of drill.rows) {
    assert.ok(CONFIDENCE_LEVELS.includes(row.model_confidence), `${row.claim_id} confidence`);
    assert.match(row.proposed_amount, /^\d+\.\d{2}$/, `${row.claim_id} amount is not a 2dp string`);
    assert.match(row.proposed_gl_account, /^\d{4}$/, `${row.claim_id} account is not a 4-digit code`);
    sourceAmountCents(row); // asserts the citation resolves
    assert.ok(row.source_reference.length > 0, `${row.claim_id} has no source reference`);
  }
});

test("FIN-38 planted 1: exactly one proposed amount is a transposition of its source row's amount", () => {
  const wrong = drill.rows.filter((r) => toCents(r.proposed_amount) !== sourceAmountCents(r));
  assert.equal(wrong.length, 1, "exactly one claim should be wrong about the amount");
  const row = wrong[0];
  const trueCents = sourceAmountCents(row);
  const proposedCents = toCents(row.proposed_amount);
  assert.equal(proposedCents, transposeDollars(trueCents), "the wrong amount is not a digit transposition");
  assert.equal((proposedCents - trueCents) % 100, 0, "a transposition moves whole dollars, not cents");
  assert.equal(
    String(proposedCents).length, String(trueCents).length,
    "a transposition keeps the number the same length"
  );
});

test("FIN-38 planted 2: exactly one proposed account is off the FIN-22 chart, and the rest are active accounts", () => {
  const offChart = drill.rows.filter((r) => !activeCodes.has(r.proposed_gl_account));
  assert.equal(offChart.length, 1, "exactly one claim should cite an account that does not exist");
  const chartCodes = new Set(chart.map((a) => a.account_code));
  assert.ok(
    !chartCodes.has(offChart[0].proposed_gl_account),
    "the fabricated code must be absent from the chart, not merely inactive on it"
  );
});

const isClean = (row) =>
  toCents(row.proposed_amount) === sourceAmountCents(row) && activeCodes.has(row.proposed_gl_account);

test("FIN-38 planted 3: exactly three claims are high confidence, and exactly one of those is wrong", () => {
  const high = drill.rows.filter((r) => r.model_confidence === "high");
  assert.equal(high.length, HIGH_CONFIDENCE_COUNT);
  const wrong = high.filter((r) => !isClean(r));
  assert.equal(wrong.length, 1, "one confident claim is wrong, so confidence is not a proof of correctness");
  assert.equal(
    high.length - wrong.length, HIGH_CONFIDENCE_COUNT - 1,
    "the other confident claims verify clean, so blanket rejection fails the drill too"
  );
});

test("FIN-38: the plants sit at different confidence levels, so confidence locates neither of them", () => {
  const planted = drill.rows.filter((r) => !isClean(r));
  assert.equal(planted.length, 2, "the drill plants exactly two wrong claims");
  assert.equal(
    new Set(planted.map((r) => r.model_confidence)).size, 2,
    "both plants report the same confidence, so a learner could find them by reading one column"
  );
  // Stated as the property that matters: neither stratum of the file is clean,
  // so neither can be skipped. A drill where every plant is confident and every
  // quiet row is right teaches the opposite of "verify every claim".
  const high = drill.rows.filter((r) => r.model_confidence === "high");
  const rest = drill.rows.filter((r) => r.model_confidence !== "high");
  assert.ok(high.some((r) => !isClean(r)), "no plant among the confident claims");
  assert.ok(rest.some((r) => !isClean(r)), "no plant outside the confident claims");
  const offChart = drill.rows.find((r) => !activeCodes.has(r.proposed_gl_account));
  assert.notEqual(offChart.model_confidence, "high", "the fabricated account code is reported at high confidence");
});

test("FIN-38: the reviewer columns ship empty, because the verdict is the learner's work", () => {
  for (const row of drill.rows) {
    assert.equal(row.reviewer_verdict, "", `${row.claim_id} reviewer_verdict`);
    assert.equal(row.reviewer_note, "", `${row.claim_id} reviewer_note`);
  }
});

test("FIN-38: no claim is drawn from a row that already carries a FIN-01 planted feature", () => {
  const pairCount = new Map();
  const refCount = new Map();
  for (const row of bank) {
    const pair = `${row.amount}|${row.reference}`;
    pairCount.set(pair, (pairCount.get(pair) ?? 0) + 1);
    refCount.set(row.reference, (refCount.get(row.reference) ?? 0) + 1);
  }
  const glByRef = new Map();
  for (const row of gl) glByRef.set(row.reference, [...(glByRef.get(row.reference) ?? []), row]);

  for (const row of drill.rows) {
    if (row.source_artifact === "FIN-03") continue; // outstanding checks are timing items, not defects
    const reference = row.source_artifact === "FIN-01"
      ? row.source_reference
      : gl.find((g) => g.je_id === row.source_row_id).reference;
    assert.equal(refCount.get(reference), 1, `${row.claim_id} cites a reference the bank feed carries twice`);
    const glRows = glByRef.get(reference) ?? [];
    assert.equal(glRows.length, 1, `${row.claim_id} cites a reference the ledger carries ${glRows.length} times`);
    const bankRow = bank.find((b) => b.reference === reference);
    assert.equal(
      glAmount(glRows[0]), bankRow.amount,
      `${row.claim_id} cites a row where the bank and the ledger already disagree`
    );
  }
});

test("FIN-38: every counterparty is a canon company, a CORE-03 account, or a declared neutral vendor", () => {
  const crm = JSON.parse(
    generateCrmSeed({ rng: (stream) => createRng("CORE-03", stream) })
      .find((f) => f.path === "crm-seed.json").content
  );
  const allowed = new Set([
    ...[...canon.values()].map((c) => c.name),
    ...crm.accounts.map((a) => a.name),
    ...CANON_VENDORS.map((v) => v.name),
    ...NEUTRAL_VENDORS,
    ACCOUNT_HOLDER.name,
    BANK.name,
  ]);
  for (const row of drill.rows) {
    assert.ok(allowed.has(row.counterparty), `unexpected counterparty "${row.counterparty}"`);
  }
});

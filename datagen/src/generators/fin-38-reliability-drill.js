// FIN-38 reliability-drill-transactions: fifteen AI-proposed readings of rows
// that already ship in the pack, for finance-ai-reliability.
//
// The drill only works if every claim is checkable, so every row cites its
// source the way the module teaches: txn_id in FIN-01, je_id in FIN-02,
// check_number in FIN-03, account_code in FIN-22. Two claims are wrong and the
// learner can prove it from the shipped data alone.
//
// Planted, per spec, and all three found by a rule rather than by a column:
//   1. exactly one proposed_amount is a digit transposition of its source row's
//      amount (produced by FIN-01's own transposeDollars helper, so the drill's
//      arithmetic error has the shape the cash pack already teaches).
//   2. exactly one proposed_gl_account is not on the FIN-22 chart. The code is
//      computed as the lowest unused code in the facilities block rather than
//      typed, so it cannot quietly become a real account if the chart grows.
//   3. exactly three rows carry model_confidence high. Two of them are the rows
//      above; the third is right. Confidence therefore does not sort right from
//      wrong, and rejecting everything fails the drill too.
//
// Source rows come from a clean pool computed by rule: a unique amount and
// reference in the bank feed, matched once in the GL at the same amount. That
// removes FIN-01's own duplicated deposit, unrecorded fee and transposed vendor
// payment without this generator naming any of them, so one pack's answer key
// can never leak through the other's.
import { toCsv } from "../csv.js";
import { buildCashReconciliation, transposeDollars } from "./fin-01-cash-recon.js";
import {
  buildChartOfAccounts, AR_CONTROL_ACCOUNT, AP_CONTROL_ACCOUNT,
} from "./fin-22-chart-of-accounts.js";

export const id = "FIN-38";

export const COLUMNS = [
  "claim_id", "source_artifact", "source_row_id", "source_reference", "counterparty",
  "proposed_amount", "proposed_gl_account", "model_confidence", "reviewer_verdict", "reviewer_note",
];

export const CLAIM_COUNT = 15;
const SAMPLE = { bank: 7, gl: 5, checks: 3 };
export const CONFIDENCE_LEVELS = ["high", "medium", "low"];
/** How many rows the model reports as high confidence. Two are wrong, one is right. */
export const HIGH_CONFIDENCE_COUNT = 3;

// Expense coding the model proposes for a payment, keyed by a word in the
// counterparty name. Codes are looked up on the FIN-22 chart at build time, so a
// chart rename breaks generation instead of shipping a dangling code. Anything
// unmatched falls back to the payables control account, which is what an
// unclassified payment posts to.
const EXPENSE_CODE_BY_KEYWORD = [
  ["Insurance", "6600"],
  ["Properties", "6100"],
  ["Facilities", "6100"],
  ["Security Systems", "6100"],
  ["Power Cooperative", "6110"],
  ["Office Supply", "6120"],
  ["Courier", "6120"],
  ["Print Works", "6120"],
  ["Cloud Services", "5000"],
  ["Analytics", "6200"],
  ["HR Platform", "6200"],
  ["Staffing", "6040"],
  ["Recruiting", "6040"],
  ["Travel Desk", "6400"],
  ["Catering", "6400"],
];

const cents = (n) => (n / 100).toFixed(2);
const toCents = (amount) => Math.round(Number(amount) * 100);
const glAmount = (row) => (row.debit !== "" ? row.debit : row.credit);

/**
 * The lowest unused code in the facilities block, stepping the way the chart
 * does. Deriving it means the fabricated code is guaranteed absent from the
 * chart instead of merely believed to be.
 */
export function fabricatedAccountCode(chart) {
  const used = new Set(chart.map((a) => a.account_code));
  for (let code = 6100; code < 6200; code += 5) {
    const candidate = String(code);
    if (!used.has(candidate)) return candidate;
  }
  throw new Error(`${id}: the facilities block has no unused code left for the fabricated citation`);
}

function cleanPool({ bank, gl }) {
  const bankRefCount = new Map();
  const bankPairCount = new Map();
  for (const row of bank) {
    bankRefCount.set(row.reference, (bankRefCount.get(row.reference) ?? 0) + 1);
    const pair = `${row.amount}|${row.reference}`;
    bankPairCount.set(pair, (bankPairCount.get(pair) ?? 0) + 1);
  }
  const glByRef = new Map();
  for (const row of gl) {
    if (!glByRef.has(row.reference)) glByRef.set(row.reference, []);
    glByRef.get(row.reference).push(row);
  }

  const pairs = [];
  for (const bankRow of bank) {
    if (bankRefCount.get(bankRow.reference) !== 1) continue;
    if (bankPairCount.get(`${bankRow.amount}|${bankRow.reference}`) !== 1) continue;
    const glRows = glByRef.get(bankRow.reference) ?? [];
    if (glRows.length !== 1) continue;
    const glRow = glRows[0];
    if (glRow.source !== "ar" && glRow.source !== "ap") continue;
    if (glAmount(glRow) !== bankRow.amount) continue;
    pairs.push({ bankRow, glRow });
  }
  return pairs;
}

function proposedAccountFor({ counterparty, isReceipt }, chart) {
  const byCode = new Map(chart.map((a) => [a.account_code, a]));
  const assertActive = (code) => {
    const account = byCode.get(code);
    if (!account) throw new Error(`${id}: proposed account ${code} is not on the FIN-22 chart`);
    if (account.active !== "true") throw new Error(`${id}: proposed account ${code} is inactive on the chart`);
    return code;
  };
  if (isReceipt) return assertActive(AR_CONTROL_ACCOUNT.code);
  const hit = EXPENSE_CODE_BY_KEYWORD.find(([keyword]) => counterparty.includes(keyword));
  return assertActive(hit ? hit[1] : AP_CONTROL_ACCOUNT.code);
}

/**
 * @param {(stream: string) => import("../seed.js").Rng} rng
 * @returns {object[]}
 */
export function buildReliabilityDrill(rng) {
  const { bank, gl, outstanding } = buildCashReconciliation();
  const chart = buildChartOfAccounts();
  const pool = cleanPool({ bank, gl });
  if (pool.length < SAMPLE.bank + SAMPLE.gl) {
    throw new Error(`${id}: clean pool holds ${pool.length} rows, too few to draw ${SAMPLE.bank + SAMPLE.gl}`);
  }

  const bankPicks = rng("bank").shuffle(pool).slice(0, SAMPLE.bank);
  const usedRefs = new Set(bankPicks.map((p) => p.bankRow.reference));
  const glPicks = rng("gl").shuffle(pool.filter((p) => !usedRefs.has(p.glRow.reference))).slice(0, SAMPLE.gl);
  const checkPicks = rng("checks").shuffle(outstanding).slice(0, SAMPLE.checks);

  const claims = [];
  for (const { bankRow } of bankPicks) {
    const isReceipt = bankRow.type === "credit";
    claims.push({
      source_artifact: "FIN-01",
      source_row_id: bankRow.txn_id,
      source_reference: bankRow.reference,
      counterparty: bankRow.counterparty,
      trueCents: toCents(bankRow.amount),
      proposed_gl_account: proposedAccountFor({ counterparty: bankRow.counterparty, isReceipt }, chart),
    });
  }
  for (const { glRow } of glPicks) {
    claims.push({
      source_artifact: "FIN-02",
      source_row_id: glRow.je_id,
      source_reference: glRow.reference,
      counterparty: glRow.counterparty,
      trueCents: toCents(glAmount(glRow)),
      proposed_gl_account: proposedAccountFor({ counterparty: glRow.counterparty, isReceipt: glRow.source === "ar" }, chart),
    });
  }
  for (const check of checkPicks) {
    claims.push({
      source_artifact: "FIN-03",
      source_row_id: check.check_number,
      source_reference: check.gl_je_id,
      counterparty: check.payee,
      trueCents: toCents(check.amount),
      proposed_gl_account: proposedAccountFor({ counterparty: check.payee, isReceipt: false }, chart),
    });
  }

  claims.sort((a, b) =>
    a.source_artifact.localeCompare(b.source_artifact) || a.source_row_id.localeCompare(b.source_row_id));
  if (claims.length !== CLAIM_COUNT) {
    throw new Error(`${id}: built ${claims.length} claims, expected ${CLAIM_COUNT}`);
  }

  // The transposition lands on a ledger claim: the module calls it a transposed
  // balance, and a balance is what the GL carries.
  const defectRng = rng("defects");
  const ledgerClaims = claims.filter((c) => c.source_artifact === "FIN-02");
  const transposed = defectRng.pick(ledgerClaims);
  transposed.proposedCents = transposeDollars(transposed.trueCents);
  if (transposed.proposedCents === transposed.trueCents) {
    throw new Error(`${id}: the transposed claim did not move`);
  }

  // The fabricated code lands on a payment claim, where an expense code is what
  // a model would be proposing in the first place.
  const codeCandidates = claims.filter(
    (c) => c !== transposed && c.proposed_gl_account !== AR_CONTROL_ACCOUNT.code
  );
  const fabricated = defectRng.pick(codeCandidates);
  fabricated.proposed_gl_account = fabricatedAccountCode(chart);

  for (const claim of claims) {
    if (claim.proposedCents === undefined) claim.proposedCents = claim.trueCents;
  }

  // The control: the largest claim that is right about both the amount and the
  // account, reported at the same confidence as the two that are wrong.
  const control = claims
    .filter((c) => c !== transposed && c !== fabricated)
    .reduce((best, c) => (c.trueCents > best.trueCents ? c : best));

  const highConfidence = new Set([transposed, fabricated, control]);
  if (highConfidence.size !== HIGH_CONFIDENCE_COUNT) {
    throw new Error(`${id}: the two defects and the control are not three distinct rows`);
  }
  const confidenceRng = rng("confidence");
  const rows = claims.map((claim, i) => ({
    claim_id: `CLM-${String(i + 1).padStart(2, "0")}`,
    source_artifact: claim.source_artifact,
    source_row_id: claim.source_row_id,
    source_reference: claim.source_reference,
    counterparty: claim.counterparty,
    proposed_amount: cents(claim.proposedCents),
    proposed_gl_account: claim.proposed_gl_account,
    model_confidence: highConfidence.has(claim) ? "high" : confidenceRng.pick(["medium", "low"]),
    reviewer_verdict: "",
    reviewer_note: "",
  }));

  assertPlantedFeatures(rows, claims, chart);
  return rows;
}

function assertPlantedFeatures(rows, claims, chart) {
  const onChart = new Set(chart.filter((a) => a.active === "true").map((a) => a.account_code));
  const wrongAmount = claims.filter((c) => c.proposedCents !== c.trueCents);
  if (wrongAmount.length !== 1) {
    throw new Error(`${id}: ${wrongAmount.length} claims carry a wrong amount, expected 1`);
  }
  const offChart = rows.filter((r) => !onChart.has(r.proposed_gl_account));
  if (offChart.length !== 1) {
    throw new Error(`${id}: ${offChart.length} claims cite an account off the chart, expected 1`);
  }
  const high = rows.filter((r) => r.model_confidence === "high");
  if (high.length !== HIGH_CONFIDENCE_COUNT) {
    throw new Error(`${id}: ${high.length} claims are high confidence, expected ${HIGH_CONFIDENCE_COUNT}`);
  }
  const cleanHigh = high.filter((r) => {
    const claim = claims[rows.indexOf(r)];
    return claim.proposedCents === claim.trueCents && onChart.has(r.proposed_gl_account);
  });
  if (cleanHigh.length !== 1) {
    throw new Error(`${id}: ${cleanHigh.length} of the high-confidence claims are right, expected 1`);
  }
  for (const row of rows) {
    if (row.reviewer_verdict !== "" || row.reviewer_note !== "") {
      throw new Error(`${id}: ${row.claim_id} ships with the reviewer columns filled in`);
    }
  }
}

export function generate({ rng }) {
  return [{
    path: "reliability-drill-transactions.csv",
    content: toCsv(COLUMNS, buildReliabilityDrill(rng)),
  }];
}

// FIN-39 decision-authority-matrix-template: the policy the
// finance-operational-controls validator runs against. Lesson 1 turns a written
// policy into something that executes, and a validator needs a table, not a PDF.
//
// Four rules hold by construction and are asserted at build time:
//   1. any decision that moves money or posts an entry is prohibited for AI,
//      whatever the amount. That is the finance-only hard control.
//   2. restricted data is never autonomous and never review-after-the-fact.
//   3. approver seniority never falls as the amount band rises, and a band that
//      opens at 50,000 or more is approved at director level or above. The step
//      is FIN-06's shipped purchase-order rule, so the matrix and the orders
//      agree.
//   4. escalation is always strictly more senior than approval.
//
// A template, so no defects are planted. A static table needs no random draws.
import { toCsv } from "../csv.js";
import { assertRolesUsed, seniority } from "./finance-roles.js";

export const id = "FIN-39";

export const COLUMNS = [
  "control_id", "decision", "data_class", "amount_min_usd", "amount_max_usd",
  "ai_autonomy_level", "approver_role", "escalation_role", "evidence_required",
  "moves_money_or_posts",
];

export const DATA_CLASSES = ["public", "internal", "confidential", "restricted"];
export const AUTONOMY_LEVELS = ["autonomous", "review_before_commit", "approval_before_action", "prohibited"];

/** The band the FIN-06 purchase-order rule steps at, in dollars. */
export const DIRECTOR_APPROVAL_FLOOR_USD = 50000;

// [decision, data_class, amount_min, amount_max, autonomy, approver, escalation, evidence, moves_money_or_posts]
const DECISIONS = [
  ["Draft a variance narrative for a budget line", "internal", "", "", "autonomous", "Finance Manager", "Controller", "draft saved with the source rows it cites", "false"],
  ["Summarize a published accounting standard for the team", "public", "", "", "autonomous", "Staff Accountant", "Finance Manager", "link to the published source", "false"],
  ["Flag a close task that is overdue against the checklist", "internal", "", "", "autonomous", "Finance Manager", "Controller", "flag written back to the checklist row", "false"],
  ["Classify an inbound finance request for routing", "internal", "", "", "autonomous", "Finance Manager", "Controller", "routing decision and the rule that produced it", "false"],
  ["Summarize a reconciliation working paper for the reviewer", "confidential", "", "", "review_before_commit", "Staff Accountant", "Controller", "reviewer sign off before the summary is used", "false"],
  ["Propose a ledger code for an uncoded transaction", "internal", "0", "4999", "review_before_commit", "Staff Accountant", "Finance Manager", "proposed code and the rule behind it", "false"],
  ["Propose a ledger code for an uncoded transaction", "internal", "5000", "49999", "review_before_commit", "Finance Manager", "Controller", "proposed code and the rule behind it", "false"],
  ["Propose a ledger code for an uncoded transaction", "internal", "50000", "", "approval_before_action", "Director, Finance", "VP, Finance", "proposed code, the rule behind it, and a named approver", "false"],
  ["Approve a purchase order line", "internal", "0", "4999", "review_before_commit", "Finance Manager", "Director, Finance", "order, quote and budget line", "false"],
  ["Approve a purchase order line", "internal", "5000", "49999", "approval_before_action", "Finance Manager", "Director, Finance", "order, quote and budget line", "false"],
  ["Approve a purchase order line", "internal", "50000", "", "approval_before_action", "Director, Finance", "VP, Finance", "order, quote, budget line and a second approver", "false"],
  ["Propose a receivable write off for approval", "confidential", "0", "4999", "approval_before_action", "Finance Manager", "Controller", "aging history and the collection log", "false"],
  ["Propose a receivable write off for approval", "confidential", "5000", "", "approval_before_action", "Director, Finance", "VP, Finance", "aging history, collection log and a written recommendation", "false"],
  ["Create or amend a vendor master record", "confidential", "", "", "approval_before_action", "Finance Manager", "Controller", "requester and approver are different people", "false"],
  ["Send finance data to a model endpoint outside the approved environment", "restricted", "", "", "approval_before_action", "Director, Finance", "VP, Finance", "data class, destination and retention terms recorded", "false"],
  ["Change a vendor bank account or remit to detail", "restricted", "", "", "prohibited", "Controller", "VP, Finance", "call back to a known contact, logged with the caller", "true"],
  ["Post a journal entry to the ledger", "confidential", "", "", "prohibited", "Controller", "VP, Finance", "entry, its support, and preparer separate from approver", "true"],
  ["Release a payment run to the bank", "restricted", "", "", "prohibited", "Controller", "VP, Finance", "dual approval recorded before release", "true"],
  ["Lock the period after the close is approved", "confidential", "", "", "prohibited", "Controller", "VP, Finance", "close approval and the lock confirmation", "true"],
  ["Share pre-announcement board material outside the distribution list", "restricted", "", "", "prohibited", "VP, Finance", "Chief Executive Officer", "distribution list and the classification of the material", "false"],
];

/**
 * The matrix as row objects keyed by COLUMNS, with the four rules asserted at
 * build time rather than left to the test alone.
 * @returns {object[]}
 */
export function buildDecisionAuthorityMatrix() {
  const rows = DECISIONS.map(([decision, data_class, amount_min_usd, amount_max_usd, ai_autonomy_level, approver_role, escalation_role, evidence_required, moves_money_or_posts], i) => ({
    control_id: `DA-${String(i + 1).padStart(2, "0")}`,
    decision,
    data_class,
    amount_min_usd,
    amount_max_usd,
    ai_autonomy_level,
    approver_role,
    escalation_role,
    evidence_required,
    moves_money_or_posts,
  }));

  assertRolesUsed(id, rows.flatMap((r) => [r.approver_role, r.escalation_role]));

  for (const row of rows) {
    if (!DATA_CLASSES.includes(row.data_class)) {
      throw new Error(`${id}: ${row.control_id} has data_class "${row.data_class}"`);
    }
    if (!AUTONOMY_LEVELS.includes(row.ai_autonomy_level)) {
      throw new Error(`${id}: ${row.control_id} has ai_autonomy_level "${row.ai_autonomy_level}"`);
    }
    if (row.moves_money_or_posts !== "true" && row.moves_money_or_posts !== "false") {
      throw new Error(`${id}: ${row.control_id} moves_money_or_posts is not a boolean string`);
    }
    if (row.moves_money_or_posts === "true" && row.ai_autonomy_level !== "prohibited") {
      throw new Error(`${id}: ${row.control_id} moves money or posts an entry but is not prohibited`);
    }
    if (row.data_class === "restricted" && (row.ai_autonomy_level === "autonomous" || row.ai_autonomy_level === "review_before_commit")) {
      throw new Error(`${id}: ${row.control_id} lets restricted data run ahead of approval`);
    }
    if (seniority(row.escalation_role) <= seniority(row.approver_role)) {
      throw new Error(`${id}: ${row.control_id} escalates to a role no more senior than the approver`);
    }
    const min = row.amount_min_usd === "" ? null : Number(row.amount_min_usd);
    const max = row.amount_max_usd === "" ? null : Number(row.amount_max_usd);
    if ((min === null) !== (row.amount_min_usd === "")) throw new Error(`${id}: ${row.control_id} amount_min_usd`);
    if (min !== null && max !== null && max < min) {
      throw new Error(`${id}: ${row.control_id} has an inverted amount band`);
    }
    if (min !== null && min >= DIRECTOR_APPROVAL_FLOOR_USD && seniority(row.approver_role) < seniority("Director, Finance")) {
      throw new Error(`${id}: ${row.control_id} approves ${DIRECTOR_APPROVAL_FLOOR_USD} and above below director level`);
    }
  }

  // Seniority never falls as the band rises, within one decision.
  const byDecision = new Map();
  for (const row of rows) {
    if (row.amount_min_usd === "") continue;
    if (!byDecision.has(row.decision)) byDecision.set(row.decision, []);
    byDecision.get(row.decision).push(row);
  }
  for (const [decision, banded] of byDecision) {
    const sorted = [...banded].sort((a, b) => Number(a.amount_min_usd) - Number(b.amount_min_usd));
    for (let i = 1; i < sorted.length; i++) {
      if (seniority(sorted[i].approver_role) < seniority(sorted[i - 1].approver_role)) {
        throw new Error(`${id}: "${decision}" approves a larger band at a more junior role`);
      }
    }
  }

  for (const level of AUTONOMY_LEVELS) {
    if (!rows.some((r) => r.ai_autonomy_level === level)) throw new Error(`${id}: no row at autonomy level "${level}"`);
  }
  for (const cls of DATA_CLASSES) {
    if (!rows.some((r) => r.data_class === cls)) throw new Error(`${id}: no row for data class "${cls}"`);
  }

  return rows;
}

export function generate() {
  return [{
    path: "decision-authority-matrix-template.csv",
    content: toCsv(COLUMNS, buildDecisionAuthorityMatrix()),
  }];
}

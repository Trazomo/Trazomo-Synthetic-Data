// FIN-24 actuals-vs-budget, FIN-25 supporting-je-detail and FIN-26
// materiality-thresholds. One builder emits all three, the way
// fin-15-collections.js emits two ids, so the threshold that decides what is
// material, the tracker it is applied to, and the detail behind each flagged
// line cannot disagree.
//
// Build order inside the module mirrors the DAG: FIN-26 first (it needs nothing
// but FIN-37 and the flux rule FIN-33 already fixed), then FIN-24 (which reads
// FIN-05 for March and FIN-33 for February), then FIN-25 (whose account set is
// not knowable until FIN-24 and FIN-26 have both run).
//
// Three rules this module does not re-litigate, all settled 2026-08-22:
//
//   R-SIGN. actual_amount is FIN-05's period movement in the account's own
//   direction (actualAmountCents in generators/finance-statement.js), so the
//   contra-revenue line carries a positive magnitude and the tracker reports
//   four material lines rather than five. section_sign is a separate column,
//   computed by sectionSign(), and it is -1 on exactly one row. Both are
//   already executed against frozen bytes in
//   tests/unit/finance-statement.test.js.
//
//   R-CLS17. variance_explanation is empty on all 27 rows because FIN-24 is
//   the input the explain-every-variance close task consumes rather than the
//   output it produces. Nothing here, in the tests, or in a brief may assert
//   that the variance work has not been done: merged trazomo content already
//   tells a reader it has, at the same as-of. State file facts only.
//
//   The reconciliation target is FIN-05, never FIN-09. FIN-05 is the pre-close
//   trial balance at 2026-03-31 and does not reflect the close batch. Do not
//   write "unposted": FIN-17 carries CLS-15 as complete.
//
// The import from FIN-37 is a TUPLE, not a header slice. FIN-37's
// explanation_threshold_usd is its eleventh column, so FIN-24's first eight
// columns are not a prefix of FIN-37's; a generator author who diffs the two
// headers and stops will get this wrong.
import { cents, toCents } from "../money.js";
import { assertRolesUsed } from "./finance-roles.js";
import { FLUX_RULE, fluxThresholdCents } from "./fin-33-actuals-24mo.js";
import { buildBudgetVsActualTemplate } from "./fin-37-budget-vs-actual-template.js";
import { buildDecisionAuthorityMatrix } from "./fin-39-decision-authority-matrix.js";
import { NotImplementedError } from "../errors.js";
import { createRng } from "../seed.js";

export const id = "FIN-24";

export const COLUMNS = [
  "line_id", "account_code", "account_name", "statement_section", "normal_balance", "section_sign",
  "owner_role", "budget_amount", "explanation_threshold_usd", "period", "actual_amount",
  "variance_amount", "variance_pct", "prior_period", "prior_period_actual", "flux_amount",
  "flux_pct", "variance_explanation",
];

export const SUPPORTING_DETAIL_COLUMNS = [
  "line_id", "entry_id", "posting_date", "gl_account", "account_name", "description", "counterparty",
  "counterparty_canon_id", "cost_center", "debit", "credit", "currency", "entry_source",
  "service_period_start", "service_period_end", "source_document",
];

/** The eight values imported from buildBudgetVsActualTemplate(), row for row. */
export const IMPORTED_TEMPLATE_FIELDS = [
  "line_id", "account_code", "account_name", "statement_section", "normal_balance",
  "owner_role", "budget_amount", "explanation_threshold_usd",
];

export const PERIOD = "2026-03";
export const PRIOR_PERIOD = "2026-02";

/** FIN-25's entry-id block, textually disjoint from FIN-09 and FIN-02. */
export const DETAIL_ENTRY_PREFIX = "GL-202603-";
export const ENTRY_SOURCES = ["ap_subledger", "ar_subledger", "payroll_interface", "manual"];

/** The FIN-37 spine, from its own builder under its own seed. */
export function templateLines() {
  return buildBudgetVsActualTemplate((stream) => createRng("FIN-37", stream));
}

// ------------------------------------------------------------------- FIN-26
// The config writes down a rule the frozen pack already obeys. Its reason to
// exist is that recomputing FIN-37's explanation_threshold_usd from the three
// published numbers reproduces all 27 shipped values with zero mismatches, so a
// FIN-37 regeneration that moves a budget fails here instead of quietly moving
// four figures a merged trazomo module prints by name.

export const MATERIALITY_FILE = "materiality-thresholds.yaml";

/** FIN-26's budget rule. The three numbers FIN-37's shipped column already obeys. */
export const BUDGET_VARIANCE_RULE = { pct_of_budget: 0.05, floor_cents: 1000000, round_up_to_cents: 100000 };

/**
 * The flux rule is NOT retyped here. FIN-33 had to construct its plant before
 * FIN-26 existed, so the three numbers live in fin-33-actuals-24mo.js and this
 * module imports them. Two files stating the same threshold is how a tracker
 * and a trend come to disagree about which lines breached.
 */
export { FLUX_RULE, fluxThresholdCents };

export const ESCALATION_AT_OR_ABOVE_CENTS = 10000000;
export const MATERIALITY_DECISION_ID = "DA-01";
export const MATERIALITY_OWNER_ROLE = "Controller";
export const MATERIALITY_ESCALATION_ROLE = "Director, Finance";

/** The qualitative overrides, in the order the config lists them. */
export const QUALITATIVE_OVERRIDES = [
  { override_id: "QO-01", condition: "the line changes sign against the prior period" },
  { override_id: "QO-02", condition: "the line's supporting close task is not complete" },
  { override_id: "QO-03", condition: "the line touches deferred revenue" },
];

/**
 * The budget threshold for one line, in integer cents, from its budget in
 * integer cents: 5 percent of budget, floored, rounded up to the nearest 1,000.
 * The floor is itself a multiple of the rounding unit, so taking the greater
 * before or after the rounding gives the same answer.
 * @param {number} budgetCents
 * @returns {number}
 */
export function budgetThresholdCents(budgetCents) {
  if (!Number.isInteger(budgetCents)) {
    throw new Error(`FIN-26: budgetThresholdCents expects integer cents, got ${JSON.stringify(budgetCents)}`);
  }
  const unit = BUDGET_VARIANCE_RULE.round_up_to_cents;
  const pct = Math.ceil((Math.abs(budgetCents) * BUDGET_VARIANCE_RULE.pct_of_budget) / unit) * unit;
  return Math.max(BUDGET_VARIANCE_RULE.floor_cents, pct);
}

/**
 * FIN-26's config object.
 * @param {{start: string, end: string}} effectivePeriod the FIN-26 spec's own period
 * @returns {object}
 */
export function buildMaterialityPolicy(effectivePeriod) {
  for (const key of ["start", "end"]) {
    if (typeof effectivePeriod?.[key] !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(effectivePeriod[key])) {
      throw new Error(`FIN-26: the spec carries no ${key} date for effective_period`);
    }
  }
  assertRolesUsed("FIN-26", [MATERIALITY_OWNER_ROLE, MATERIALITY_ESCALATION_ROLE]);

  const policy = {
    policy_owner_role: MATERIALITY_OWNER_ROLE,
    effective_period: { start: effectivePeriod.start, end: effectivePeriod.end },
    source_artifact: "FIN-37",
    currency: "USD",
    budget_variance_rule: {
      pct_of_budget: BUDGET_VARIANCE_RULE.pct_of_budget,
      floor_usd: cents(BUDGET_VARIANCE_RULE.floor_cents),
      rounding: `ceiling to the nearest ${BUDGET_VARIANCE_RULE.round_up_to_cents / 100}`,
      combine: "the greater of the floor and the rounded percentage",
    },
    flux_rule: {
      pct_of_prior_period: FLUX_RULE.pct_of_prior_period,
      floor_usd: cents(FLUX_RULE.floor_usd * 100),
      rounding: `ceiling to the nearest ${FLUX_RULE.rounding_to_usd}`,
      combine: "the greater of the floor and the rounded percentage",
    },
    explanation_required_when: "absolute variance is at or above the line threshold",
    qualitative_overrides: QUALITATIVE_OVERRIDES.map((o) => ({ ...o })),
    escalation: {
      at_or_above_usd: cents(ESCALATION_AT_OR_ABOVE_CENTS),
      to_role: MATERIALITY_ESCALATION_ROLE,
    },
    related_decision_id: MATERIALITY_DECISION_ID,
  };

  assertMaterialityPolicy(policy);
  return policy;
}

/**
 * The two claims the config makes about the rest of the pack, asserted before a
 * byte is emitted (the FIN-38 "the builder refuses to emit" precedent).
 */
function assertMaterialityPolicy(policy) {
  // 1. The published budget rule reproduces FIN-37's shipped threshold column,
  //    on all 27 lines, with zero mismatches.
  const lines = templateLines();
  if (lines.length !== 27) {
    throw new Error(`FIN-26: FIN-37 carries ${lines.length} lines, expected 27`);
  }
  const mismatches = lines.filter(
    (line) => budgetThresholdCents(toCents(line.budget_amount)) !== toCents(line.explanation_threshold_usd)
  );
  if (mismatches.length > 0) {
    throw new Error(
      `FIN-26: the published budget rule no longer reproduces FIN-37 on ${mismatches.map((l) => l.line_id).join(", ")}`
    );
  }

  // 2. related_decision_id resolves in the shipped FIN-39 matrix, so the
  //    threshold policy and the authority a variance narrative is drafted under
  //    stay one system.
  const decisions = new Set(buildDecisionAuthorityMatrix().map((r) => r.control_id));
  if (!decisions.has(policy.related_decision_id)) {
    throw new Error(`FIN-26: ${policy.related_decision_id} is not a control_id in FIN-39`);
  }
}

/** FIN-26's bytes. Hand rendered, the FIN-14 precedent, so the comments survive. */
export function renderMaterialityYaml(policy) {
  const lines = [
    "# FIN-26 materiality-thresholds: the rule that decides which variance gets",
    "# an explanation, and who hears about it when it is large.",
    "#",
    "# Nothing here is invented. The budget rule is the rule the frozen FIN-37",
    "# tracker already obeys on all 27 of its lines, written down so a program",
    "# can run it: recomputing explanation_threshold_usd from the three numbers",
    "# below reproduces every shipped value with zero mismatches, and the builder",
    "# refuses to emit if it ever stops doing so. The flux rule is the one figure",
    "# no frozen file pins, so it is stated here rather than left in a generator.",
    "# Generated, not hand maintained:",
    "# datagen/src/generators/fin-24-actuals-vs-budget.js.",
    `policy_owner_role: "${policy.policy_owner_role}"`,
    "effective_period:",
    `  start: "${policy.effective_period.start}"`,
    `  end: "${policy.effective_period.end}"`,
    `source_artifact: ${policy.source_artifact}`,
    `currency: ${policy.currency}`,
    "",
    "# Against the budget: 5 percent of the budgeted line, floored, rounded up.",
    "# The floor is what keeps a small line from being explained at 40.00, and",
    "# the percentage is what keeps a large line from being explained at 10,000.",
    "budget_variance_rule:",
    `  pct_of_budget: ${policy.budget_variance_rule.pct_of_budget}`,
    `  floor_usd: "${policy.budget_variance_rule.floor_usd}"`,
    `  rounding: "${policy.budget_variance_rule.rounding}"`,
    `  combine: "${policy.budget_variance_rule.combine}"`,
    "",
    "# Against the prior period: the same shape, a different base. A line can",
    "# breach one rule and not the other, and that is the point. A reader who",
    "# runs only the budget rule never sees the line that jumped inside its own",
    "# budget, and a reader who runs only the flux rule never sees the line that",
    "# has been quietly over budget all quarter.",
    "flux_rule:",
    `  pct_of_prior_period: ${policy.flux_rule.pct_of_prior_period}`,
    `  floor_usd: "${policy.flux_rule.floor_usd}"`,
    `  rounding: "${policy.flux_rule.rounding}"`,
    `  combine: "${policy.flux_rule.combine}"`,
    "",
    `explanation_required_when: "${policy.explanation_required_when}"`,
    "",
    "# Conditions that require an explanation whatever the amount. A threshold",
    "# policy with no qualitative override lets a sign change through at 9,000.",
    "qualitative_overrides:",
  ];
  for (const override of policy.qualitative_overrides) {
    lines.push(`  - override_id: ${override.override_id}`);
    lines.push(`    condition: "${override.condition}"`);
  }
  lines.push(
    "",
    "# An amount and a role, never a person: a roster edit must not silently",
    "# move who hears about a large variance.",
    "escalation:",
    `  at_or_above_usd: "${policy.escalation.at_or_above_usd}"`,
    `  to_role: "${policy.escalation.to_role}"`,
    "",
    "# DA-01 in the shipped FIN-39 decision authority matrix: draft a variance",
    "# narrative for a budget line. The threshold policy and the authority the",
    "# narrative is drafted under stay one system.",
    `related_decision_id: ${policy.related_decision_id}`
  );
  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------- generate

export function generate() {
  throw new NotImplementedError(id, "D5a wave 1 (plan Task 6) owns this build; FIN-26 has landed, FIN-24 is next");
}

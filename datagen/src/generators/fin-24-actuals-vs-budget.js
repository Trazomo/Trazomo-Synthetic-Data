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
import { toCsv } from "../csv.js";
import { addDays, isWeekend } from "../dates.js";
import { cents, toCents } from "../money.js";
import { assertRolesUsed } from "./finance-roles.js";
import { actualAmountCents, sectionSign, sectionSubtotalsCents } from "./finance-statement.js";
import { generate as generateCrmSeed } from "./core-03-crm-seed.js";
import { ACCOUNT_HOLDER, CANON_VENDORS, NEUTRAL_VENDORS } from "./fin-01-cash-recon.js";
import { CANON_VENDORS_EXTENDED } from "./fin-06-procure-to-pay.js";
import { buildActuals24mo, FLUX_RULE, fluxThresholdCents } from "./fin-33-actuals-24mo.js";
import { buildTrialBalance } from "./fin-05-gl-trial-balance.js";
import { buildCloseBatch } from "./fin-09-je-batch.js";
import { buildCloseChecklist } from "./fin-17-close-checklist.js";
import { buildChartOfAccounts } from "./fin-22-chart-of-accounts.js";
import { buildBudgetVsActualTemplate } from "./fin-37-budget-vs-actual-template.js";
import { buildDecisionAuthorityMatrix } from "./fin-39-decision-authority-matrix.js";
import { createRng } from "../seed.js";

export const id = "FIN-24";

export const OUTPUT_FILE = "actuals-vs-budget.csv";

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

// ------------------------------------------------------------------- FIN-24
// FIN-37 filled in, reordered, with six columns added. Not an append: FIN-37's
// explanation_threshold_usd is its eleventh column, so FIN-24's first eight are
// not a prefix of it. The eight-value tuple is imported row for row.

/**
 * A percent to 2dp, as the string the file carries. The denominator is asserted
 * non-zero by the caller: a percent column that ships "NaN" or an empty cell on
 * a zero base is a column every consumer has to special-case.
 */
function pct(numeratorCents, denominatorCents) {
  return ((numeratorCents / denominatorCents) * 100).toFixed(2);
}

/**
 * Build the variance tracker.
 * @returns {{ rows: object[], lines: object[] }}
 */
export function buildActualsVsBudget() {
  const lines = templateLines();
  const trialBalance = new Map(buildTrialBalance().rows.map((r) => [r.account_code, r]));
  const trend = buildActuals24mo().rows;
  const prior = new Map(
    trend.filter((r) => r.period === PRIOR_PERIOD).map((r) => [r.line_id, toCents(r.actual_amount)])
  );
  const current = new Map(
    trend.filter((r) => r.period === PERIOD).map((r) => [r.line_id, toCents(r.actual_amount)])
  );

  const rows = lines.map((line) => {
    const balance = trialBalance.get(line.account_code);
    if (!balance) {
      throw new Error(`${id}: ${line.line_id} names account ${line.account_code}, which FIN-05 does not carry`);
    }
    const actualCents = actualAmountCents(balance, line.normal_balance);
    const budgetCents = toCents(line.budget_amount);
    if (budgetCents === 0) throw new Error(`${id}: ${line.line_id} carries a zero budget, so variance_pct has no base`);
    const priorCents = prior.get(line.line_id);
    if (!Number.isInteger(priorCents) || priorCents === 0) {
      throw new Error(`${id}: ${line.line_id} has no non-zero ${PRIOR_PERIOD} actual in FIN-33, so flux_pct has no base`);
    }
    const varianceCents = actualCents - budgetCents;
    const fluxCents = actualCents - priorCents;

    const row = { line_id: line.line_id };
    for (const field of IMPORTED_TEMPLATE_FIELDS) row[field] = line[field];
    return {
      ...row,
      section_sign: String(sectionSign(line.statement_section, line.normal_balance)),
      period: PERIOD,
      actual_amount: cents(actualCents),
      variance_amount: cents(varianceCents),
      variance_pct: pct(varianceCents, budgetCents),
      prior_period: PRIOR_PERIOD,
      prior_period_actual: cents(priorCents),
      flux_amount: cents(fluxCents),
      flux_pct: pct(fluxCents, priorCents),
      // Rule R-CLS17: this file is the input the explain-every-variance task
      // consumes, not the output it produces. Empty for a structural reason.
      variance_explanation: "",
    };
  });

  assertTracker({ rows, lines, trialBalance, current });
  return { rows, lines };
}

/** The plants, asserted before the builder returns. */
function assertTracker({ rows, lines, trialBalance, current }) {
  if (rows.length !== 27) throw new Error(`${id}: ${rows.length} rows, expected 27`);
  for (const [i, row] of rows.entries()) {
    for (const field of IMPORTED_TEMPLATE_FIELDS) {
      if (row[field] !== lines[i][field]) {
        throw new Error(`${id}: row ${i + 1} ${field} was retyped rather than imported`);
      }
    }
    if (row.variance_explanation !== "") {
      throw new Error(`${id}: ${row.line_id} carries an explanation, which makes this file CLS-17's output`);
    }
    // The tracker and the trend describe the same March, to the cent.
    if (toCents(row.actual_amount) !== current.get(row.line_id)) {
      throw new Error(`${id}: ${row.line_id} disagrees with FIN-33 about ${PERIOD}`);
    }
  }

  // V1: four material budget variances, the set FIN-37 and FIN-05 already
  // produce and a merged trazomo module already prints by name.
  const material = rows.filter(
    (r) => Math.abs(toCents(r.variance_amount)) >= toCents(r.explanation_threshold_usd)
  );
  if (material.length !== 4) {
    throw new Error(`${id}: ${material.length} material budget variances, expected 4 (${material.map((r) => r.line_id).join(", ")})`);
  }

  // V2 and V3: three material flux lines, exactly one of which is also budget
  // material, so the two rules disagree on five.
  const flux = rows.filter(
    (r) => Math.abs(toCents(r.flux_amount)) >= fluxThresholdCents(toCents(r.prior_period_actual))
  );
  if (flux.length !== 3) {
    throw new Error(`${id}: ${flux.length} material flux lines, expected 3 (${flux.map((r) => r.line_id).join(", ")})`);
  }
  const both = flux.filter((r) => material.includes(r));
  if (both.length !== 1) {
    throw new Error(`${id}: ${both.length} lines breach both rules, expected 1`);
  }

  // V4: one material line unfavorable in the other direction, on a debit-normal
  // line. The qualifier the rule names is materiality; the test asserts the 10
  // and the 12 the bytes give without it.
  const otherDirection = material.filter((r) => toCents(r.variance_amount) < 0 && r.normal_balance === "debit");
  if (otherDirection.length !== 1) {
    throw new Error(`${id}: ${otherDirection.length} material lines are unfavorable in the other direction, expected 1`);
  }

  // R-SIGN convention 2: the contra line is the only one running against its
  // own section, and the three subtotals roll to the retained-earnings plug.
  const contra = rows.filter((r) => r.section_sign === "-1");
  if (contra.length !== 1) {
    throw new Error(`${id}: ${contra.length} rows carry section_sign -1, expected 1`);
  }
  const subtotals = sectionSubtotalsCents(rows.map((r) => ({ ...r, actual_cents: toCents(r.actual_amount) })));
  const net = subtotals.revenue - subtotals.cost_of_revenue - subtotals.operating_expense;
  const plug = trialBalance.get("3200");
  if (cents(-net) !== plug.period_debit) {
    throw new Error(`${id}: the sections roll to ${cents(-net)}, not account 3200's ${plug.period_debit}`);
  }
}

// ---------------------------------------------------------------- generate

export function generate() {
  const { rows } = buildActualsVsBudget();
  return [{ path: OUTPUT_FILE, content: toCsv(COLUMNS, rows) }];
}

// ------------------------------------------------------------------- FIN-25
// The detail behind the accounts under investigation, as FIN-05 reflects it.
//
// The reconciliation target is FIN-05's period columns, never the FIN-09 batch
// FIN-05 does not reflect: per gl_account, sum(debit) equals period_debit and
// sum(credit) equals period_credit, to the cent. This file is complete for the
// six accounts it covers and silent about the other 21.
//
// The account set is not chosen here. It is the four lines FIN-24 reports as
// material against budget plus the two that breach only FIN-26's flux rule,
// which is why this build cannot run before FIN-24 and FIN-33 have.
//
// Four root causes are derivable by rule and none is labelled:
//
//   V5 timing (6020). The account is favorable against budget and the FIN-09
//      batch carries accrual lines to it that reverse the sign once the batch
//      is reflected. Byte fact, not a construction: 2 of the covered accounts
//      carry a FIN-09 line at all, and only one of those is favorable.
//   V6 true overspend (6200). A material unfavorable account with no line whose
//      service period starts after the cut-off and no counterparty split across
//      two accounts. CONSTRUCTED: 5020 carries the post-cut-off coverage that
//      the service-period qualifier removes, so dropping that one qualifier
//      returns 2 rather than 1.
//   V7 reclass. CONSTRUCTED: exactly one counterparty has a strict modal
//      account and lines sitting on a different one. Four counterparties appear
//      on more than one account; the other three are split evenly, and an even
//      split has no modal account, so it is a shared vendor rather than a
//      misclassification. None of the four touches 5020 or 6200, which is what
//      keeps V6's own qualifier-free count honest.
//   V8 the blocked line (4100). The only material revenue account, whose
//      supporting FIN-17 close task is not complete. The checklist qualifier is
//      explanatory rather than selective: dropping it still returns 1.

/** Plan U10: 128 rows in a 118 to 138 band, across six accounts. */
export const DETAIL_ROW_TARGET = 128;
export const DETAIL_FILE = "supporting-je-detail.csv";
export const CURRENCY = "USD";

/** The one covered account whose lines run past the cut-off (V6's qualifier). */
export const POST_CUTOFF_SERVICE_PERIOD = { start: "2026-04-01", end: "2026-04-30" };

/**
 * The counterparty population, by account. Every name is one the pack already
 * ships and has already screened: a canon company, a screened neutral vendor,
 * or a live CORE-03 customer account. `lines` is how many rows the counterparty
 * carries on that account and `weight` sizes them against the others.
 *
 * The four counterparties that appear on more than one account are the whole
 * point of the table, so they are called out where they sit:
 *   co-106 6020 and 6000, 11 against 2, the only strict mode (V7);
 *   co-186 6020 and 6300, 2 against 2, a print vendor serving two departments;
 *   co-188 6020 and 6300, 2 against 2, catering billed to two programs;
 *   co-102 4100 and 6300, 2 against 2, a customer that is also a joint
 *          marketing counterparty.
 * None of them touches 5020 or 6200.
 */
const DETAIL_PLAN = {
  4100: {
    section: "revenue",
    cost_centers: ["Customer Success"],
    parties: [
      { canon_id: "co-102", source: "ar_subledger", debit: 0, credit: 2, weight: 1.1,
        items: ["Implementation services milestone", "Integration build hours"] },
      { customers: 24, source: "ar_subledger", debit: 0, credit: 24, weight: 1,
        items: [
          "Professional services delivery", "Configuration workshop", "Data migration services",
          "Solution design engagement", "Onboarding services", "Custom report build",
        ] },
      { customers: 4, source: "manual", debit: 4, credit: 0, weight: 1,
        items: ["Services credit memo for a shortened engagement", "Services credit memo for a rescheduled workshop"] },
    ],
  },
  5020: {
    section: "cost_of_revenue",
    cost_centers: ["Customer Success"],
    parties: [
      { canon_id: "co-183", source: "ap_subledger", debit: 12, credit: 0, weight: 1,
        items: ["Tier one support coverage", "Weekend escalation cover", "Seasonal support staffing", "Interim support analyst hours"] },
      // V6's qualifier, and the only post-cut-off service period in the file:
      // March invoices for April coverage.
      { canon_id: "co-183", source: "ap_subledger", debit: 2, credit: 0, weight: 0.8,
        post_cutoff: true, items: ["Support coverage booked ahead", "Escalation cover booked ahead"] },
      { canon_id: "co-183", source: "manual", debit: 0, credit: 3, weight: 1,
        items: ["Support staffing credit for unfilled shifts", "Support staffing rate adjustment"] },
    ],
  },
  6000: {
    section: "operating_expense",
    cost_centers: ["Engineering", "Sales", "Product", "Operations", "People", "Marketing", "Finance", "IT & Security"],
    parties: [
      { canon_id: "co-002", source: "payroll_interface", debit: 16, credit: 0, weight: 1,
        items: ["Semi monthly payroll register", "Payroll register true up", "Overtime and shift differential"] },
      // V7: the strict-mode counterparty. Its modal account is 6020, and these
      // two lines are the ones sitting on the other one.
      { canon_id: "co-106", source: "ap_subledger", debit: 2, credit: 0, weight: 0.2,
        items: ["Payroll platform usage", "Payroll platform module fees"] },
      { canon_id: "co-002", source: "manual", debit: 0, credit: 3, weight: 1,
        items: ["Payroll accrual reversal", "Payroll reclass to capitalized time"] },
    ],
  },
  6020: {
    section: "operating_expense",
    cost_centers: ["People"],
    parties: [
      { canon_id: "co-106", source: "ap_subledger", debit: 8, credit: 0, weight: 1,
        items: ["Benefits administration", "Employer contributions", "Open enrollment support", "Leave administration"] },
      { canon_id: "co-105", source: "ap_subledger", debit: 4, credit: 0, weight: 0.7,
        items: ["Employee medical premium", "Employee dental and vision premium", "Group life premium"] },
      { canon_id: "co-186", source: "ap_subledger", debit: 2, credit: 0, weight: 0.15,
        items: ["Open enrollment booklet print run", "Benefits summary print run"] },
      { canon_id: "co-188", source: "ap_subledger", debit: 2, credit: 0, weight: 0.2,
        items: ["Onsite lunch service", "Wellness week catering"] },
      { canon_id: "co-106", source: "manual", debit: 0, credit: 3, weight: 1,
        items: ["Benefits accrual reversal", "Benefits rate adjustment"] },
    ],
  },
  6200: {
    section: "operating_expense",
    cost_centers: ["Engineering", "Product", "IT & Security"],
    parties: [
      { canon_id: "co-101", source: "ap_subledger", debit: 9, credit: 0, weight: 1.2,
        items: ["Platform license renewal", "Additional developer seats", "Sandbox environment add on"] },
      { canon_id: "co-119", source: "ap_subledger", debit: 13, credit: 0, weight: 1,
        items: ["Product analytics workspace", "Event volume tier", "Data warehouse connector", "Usage overage"] },
      { canon_id: "co-101", source: "manual", debit: 0, credit: 2, weight: 1,
        items: ["Seat true down credit", "License renewal adjustment"] },
      { canon_id: "co-119", source: "manual", debit: 0, credit: 2, weight: 1,
        items: ["Event volume credit", "Analytics tier adjustment"] },
    ],
  },
  6300: {
    section: "operating_expense",
    cost_centers: ["Marketing"],
    parties: [
      { canon_id: "co-186", source: "ap_subledger", debit: 2, credit: 0, weight: 1,
        items: ["Campaign collateral print run", "Direct mail production"] },
      { canon_id: "co-188", source: "ap_subledger", debit: 2, credit: 0, weight: 0.6,
        items: ["Customer advisory board dinner", "Field event catering"] },
      { canon_id: "co-102", source: "ap_subledger", debit: 2, credit: 0, weight: 0.8,
        items: ["Joint market development program", "Co marketing webinar sponsorship"] },
      { canon_id: "co-185", source: "ap_subledger", debit: 4, credit: 0, weight: 0.7,
        items: ["Direct mail distribution", "Campaign fulfilment runs", "Event material delivery"] },
      { canon_id: "co-107", source: "ap_subledger", debit: 2, credit: 0, weight: 0.5,
        items: ["Branded event supplies", "Booth consumables"] },
      { canon_id: "co-185", source: "manual", debit: 0, credit: 1, weight: 1,
        items: ["Distribution credit for an undelivered run"] },
      { canon_id: "co-107", source: "manual", debit: 0, credit: 2, weight: 1,
        items: ["Supplies return credit", "Damaged stock credit"] },
    ],
  },
};

/** Document-id blocks, one per entry_source, all owned by FIN-25. */
const SOURCE_DOCUMENT_PREFIX = {
  ap_subledger: "AP",
  ar_subledger: "AR",
  payroll_interface: "PAYREG",
  manual: "JV",
};

/** March 2026 business days, the only dates a posting in this file may carry. */
function marchBusinessDays() {
  const out = [];
  for (let d = "2026-03-01"; d <= "2026-03-31"; d = addDays(d, 1)) if (!isWeekend(d)) out.push(d);
  return out;
}

/**
 * Split `totalCents` across `weights` so the parts sum to the total exactly.
 * Largest remainder, so the cent that does not divide lands on the largest
 * fractional part rather than on whichever row happens to be last.
 */
function allocate(totalCents, weights) {
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (totalCents * w) / sum);
  const parts = raw.map((r) => Math.floor(r));
  const shortfall = totalCents - parts.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; k < shortfall; k += 1) parts[order[k].i] += 1;
  if (parts.some((p) => p <= 0)) {
    throw new Error(`FIN-25: an allocation of ${cents(totalCents)} produced a zero or negative line`);
  }
  return parts;
}

/** The co-140-and-up id the ten screened neutral vendor names take (FIN-06). */
const NEUTRAL_VENDOR_ID_START = 181;

/** The names this file may use, and the canon id each resolves to. */
function counterpartyDirectory() {
  const crm = JSON.parse(
    generateCrmSeed({ rng: (stream) => createRng("CORE-03", stream) })
      .find((f) => f.path === "crm-seed.json").content
  );
  const customers = crm.accounts.filter(
    (a) => a.status === "customer" && a.duplicate_of_account_id === "" && a.stale_flag === "false"
  );
  const byId = new Map([
    [ACCOUNT_HOLDER.canon_id, ACCOUNT_HOLDER.name],
    ...CANON_VENDORS_EXTENDED.map((v) => [v.canon_id, v.name]),
    ...CANON_VENDORS.map((v) => [v.canon_id, v.name]),
    ...NEUTRAL_VENDORS.map((name, i) => [`co-${NEUTRAL_VENDOR_ID_START + i}`, name]),
    ...customers.map((c) => [c.account_id, c.name]),
  ]);

  // A counterparty the plan names explicitly is never also drawn from the pool.
  // co-102 is both a live CORE-03 customer and the joint-marketing counterparty
  // on 6300, and letting the pool hand it extra revenue lines would turn its
  // even 2-and-2 split into a strict mode, which is what selects the reclass.
  const named = new Set(
    Object.values(DETAIL_PLAN).flatMap((plan) => plan.parties.map((p) => p.canon_id).filter(Boolean))
  );
  const pool = customers.filter((c) => !named.has(c.account_id));
  if (pool.length < 10) throw new Error(`FIN-25: only ${pool.length} customers left in the draw pool`);
  return { byId, pool };
}

/**
 * Build the supporting detail.
 * @returns {{ rows: object[], accounts: string[] }}
 */
export function buildSupportingDetail() {
  const { rows: tracker } = buildActualsVsBudget();
  const trialBalance = new Map(buildTrialBalance().rows.map((r) => [r.account_code, r]));
  const chart = new Map(buildChartOfAccounts().map((a) => [a.account_code, a]));

  // The account set, derived rather than listed: the four material budget lines
  // plus the two that breach only the flux rule.
  const material = tracker.filter(
    (r) => Math.abs(toCents(r.variance_amount)) >= toCents(r.explanation_threshold_usd)
  );
  const fluxOnly = tracker.filter(
    (r) => Math.abs(toCents(r.flux_amount)) >= fluxThresholdCents(toCents(r.prior_period_actual))
      && !material.includes(r)
  );
  const accounts = [...material, ...fluxOnly].map((r) => r.account_code).sort();
  if (accounts.length !== 6 || new Set(accounts).size !== 6) {
    throw new Error(`FIN-25: the investigated set is ${accounts.join(", ")}, expected six accounts`);
  }
  for (const code of accounts) {
    if (!DETAIL_PLAN[code]) throw new Error(`FIN-25: account ${code} is under investigation and has no line plan`);
  }
  if (Object.keys(DETAIL_PLAN).length !== accounts.length) {
    throw new Error(`FIN-25: the line plan covers ${Object.keys(DETAIL_PLAN).join(", ")}, not the investigated set`);
  }

  const directory = counterpartyDirectory();
  const businessDays = marchBusinessDays();
  const rng = createRng("FIN-25", "detail");
  const documentSeq = new Map();
  let entryNo = 0;
  const rows = [];

  for (const code of accounts) {
    const plan = DETAIL_PLAN[code];
    const account = chart.get(code);
    if (!account || account.active !== "true") {
      throw new Error(`FIN-25: account ${code} is not an active FIN-22 code`);
    }
    const balance = trialBalance.get(code);

    // One flat list of planned lines for the account, debits then credits, so
    // the two sides can be allocated against their own FIN-05 column.
    const planned = [];
    let customerCursor = 0;
    for (const party of plan.parties) {
      for (const side of ["debit", "credit"]) {
        for (let i = 0; i < party[side]; i += 1) {
          const canonId = party.canon_id
            ?? directory.pool[(customerCursor++) % directory.pool.length].account_id;
          const name = directory.byId.get(canonId);
          if (!name) throw new Error(`FIN-25: ${canonId} resolves to no screened name`);
          planned.push({
            canonId,
            name,
            side,
            source: party.source,
            weight: party.weight * (0.85 + rng.float() * 0.3),
            description: party.items[i % party.items.length],
            postCutoff: Boolean(party.post_cutoff),
            costCenter: plan.cost_centers[i % plan.cost_centers.length],
          });
        }
      }
    }

    for (const side of ["debit", "credit"]) {
      const lines = planned.filter((l) => l.side === side);
      const target = toCents(side === "debit" ? balance.period_debit : balance.period_credit);
      const amounts = allocate(target, lines.map((l) => l.weight));
      lines.forEach((line, i) => { line.amountCents = amounts[i]; });
    }

    // Group into entries of one to three lines, never spanning a counterparty,
    // a side or a source change.
    let cursor = 0;
    while (cursor < planned.length) {
      const head = planned[cursor];
      let size = 1;
      while (
        size < 3 && cursor + size < planned.length
        && planned[cursor + size].canonId === head.canonId
        && planned[cursor + size].side === head.side
        && planned[cursor + size].source === head.source
        && rng.chance(0.45)
      ) size += 1;

      entryNo += 1;
      const entryId = `${DETAIL_ENTRY_PREFIX}${String(entryNo).padStart(4, "0")}`;
      const postingDate = businessDays[(entryNo * 7 + rng.int(0, 4)) % businessDays.length];
      const prefix = SOURCE_DOCUMENT_PREFIX[head.source];
      const seq = (documentSeq.get(prefix) ?? 0) + 1;
      documentSeq.set(prefix, seq);
      const sourceDocument = `${prefix}-202603-${String(seq).padStart(4, "0")}`;

      for (let n = 0; n < size; n += 1) {
        const line = planned[cursor + n];
        const servicePeriod = line.postCutoff
          ? POST_CUTOFF_SERVICE_PERIOD
          : { start: "2026-03-01", end: "2026-03-31" };
        rows.push({
          line_id: `${entryId}-${n + 1}`,
          entry_id: entryId,
          posting_date: postingDate,
          gl_account: code,
          account_name: account.account_name,
          description: line.description,
          counterparty: line.name,
          counterparty_canon_id: line.canonId,
          cost_center: line.costCenter,
          debit: line.side === "debit" ? cents(line.amountCents) : "",
          credit: line.side === "credit" ? cents(line.amountCents) : "",
          currency: CURRENCY,
          entry_source: line.source,
          service_period_start: servicePeriod.start,
          service_period_end: servicePeriod.end,
          source_document: sourceDocument,
        });
      }
      cursor += size;
    }
  }

  assertSupportingDetail({ rows, accounts, tracker, trialBalance, material });
  return { rows, accounts };
}

/** Is an account's variance favorable: more revenue, or less cost. */
function isFavorable(row) {
  const variance = toCents(row.variance_amount);
  const towardProfit = row.statement_section === "revenue" ? 1 : -1;
  return variance * Number(row.section_sign) * towardProfit > 0;
}

function assertSupportingDetail({ rows, accounts, tracker, trialBalance, material }) {
  if (rows.length !== DETAIL_ROW_TARGET) {
    throw new Error(`FIN-25: ${rows.length} rows, expected ${DETAIL_ROW_TARGET}`);
  }
  if (new Set(rows.map((r) => r.gl_account)).size !== 6) {
    throw new Error(`FIN-25: the file covers ${new Set(rows.map((r) => r.gl_account)).size} accounts, expected 6`);
  }

  // T-N1: the reconciliation, per account, to FIN-05's own period columns.
  for (const code of accounts) {
    const own = rows.filter((r) => r.gl_account === code);
    const debit = own.filter((r) => r.debit !== "").reduce((s, r) => s + toCents(r.debit), 0);
    const credit = own.filter((r) => r.credit !== "").reduce((s, r) => s + toCents(r.credit), 0);
    const balance = trialBalance.get(code);
    if (cents(debit) !== balance.period_debit || cents(credit) !== balance.period_credit) {
      throw new Error(
        `FIN-25: account ${code} sums to ${cents(debit)} and ${cents(credit)}, `
        + `not FIN-05's ${balance.period_debit} and ${balance.period_credit}`
      );
    }
  }

  // T-N4: the entry-id block collides with nothing shipped, and every row
  // carries exactly one side.
  const batchIds = new Set(buildCloseBatch().lines.map((l) => l.entry_id));
  for (const row of rows) {
    if (!row.entry_id.startsWith(DETAIL_ENTRY_PREFIX)) {
      throw new Error(`FIN-25: ${row.entry_id} is outside the FIN-25 block`);
    }
    if (batchIds.has(row.entry_id)) throw new Error(`FIN-25: ${row.entry_id} collides with FIN-09`);
    if ((row.debit === "") === (row.credit === "")) {
      throw new Error(`FIN-25: ${row.line_id} carries both sides or neither`);
    }
    if (!ENTRY_SOURCES.includes(row.entry_source)) {
      throw new Error(`FIN-25: ${row.line_id} carries entry_source ${row.entry_source}`);
    }
  }

  const byAccount = (code) => rows.filter((r) => r.gl_account === code);
  const trackerFor = new Map(tracker.map((r) => [r.account_code, r]));
  const materialCodes = new Set(material.map((r) => r.account_code));

  // V5: one timing account. Favorable against budget AND carrying FIN-09
  // accrual lines. Two of the covered accounts carry a FIN-09 line at all.
  const batchAccounts = new Set(buildCloseBatch().lines.map((l) => l.gl_account));
  const withBatch = accounts.filter((code) => batchAccounts.has(code));
  if (withBatch.length !== 2) {
    throw new Error(`FIN-25: ${withBatch.length} covered accounts carry a FIN-09 line, expected 2`);
  }
  const timing = withBatch.filter((code) => materialCodes.has(code) && isFavorable(trackerFor.get(code)));
  if (timing.length !== 1) {
    throw new Error(`FIN-25: ${timing.length} accounts fit the timing rule, expected 1`);
  }

  // V7: one reclass. Four counterparties appear on more than one account; only
  // one of them has a strict modal account, so only one has lines sitting
  // somewhere other than where it usually bills.
  const byParty = new Map();
  for (const row of rows) {
    const seen = byParty.get(row.counterparty_canon_id) ?? new Map();
    seen.set(row.gl_account, (seen.get(row.gl_account) ?? 0) + 1);
    byParty.set(row.counterparty_canon_id, seen);
  }
  const split = [...byParty].filter(([, counts]) => counts.size > 1);
  if (split.length !== 4) {
    throw new Error(`FIN-25: ${split.length} counterparties appear on more than one account, expected 4`);
  }
  const reclass = split.filter(([, counts]) => {
    const sorted = [...counts.values()].sort((a, b) => b - a);
    return sorted[0] > sorted[1];
  });
  if (reclass.length !== 1) {
    throw new Error(`FIN-25: ${reclass.length} counterparties have a strict modal account, expected 1`);
  }

  // V6: one true overspend. A material unfavorable account with no post
  // cut-off service period and no split counterparty. Dropping the one
  // qualifier the rule names returns 2, which is the construction: the other
  // material unfavorable account carries the post cut-off coverage.
  const splitAccounts = new Set(split.flatMap(([, counts]) => [...counts.keys()]));
  const unfavorable = accounts.filter((code) => materialCodes.has(code) && !isFavorable(trackerFor.get(code)));
  if (unfavorable.length !== 2) {
    throw new Error(`FIN-25: ${unfavorable.length} covered accounts are material and unfavorable, expected 2`);
  }
  const cleanOfSplit = unfavorable.filter((code) => !splitAccounts.has(code));
  if (cleanOfSplit.length !== 2) {
    throw new Error(
      `FIN-25: ${cleanOfSplit.length} material unfavorable accounts are free of a split counterparty, expected 2. `
      + "A split on one of them collapses V6's qualifier-free count from 2 to 1."
    );
  }
  const overspend = cleanOfSplit.filter(
    (code) => !byAccount(code).some((r) => r.service_period_start > "2026-03-31")
  );
  if (overspend.length !== 1) {
    throw new Error(`FIN-25: ${overspend.length} accounts fit the overspend rule, expected 1`);
  }
  const postCutoffAccounts = accounts.filter(
    (code) => byAccount(code).some((r) => r.service_period_start > "2026-03-31")
  );
  if (postCutoffAccounts.length !== 1) {
    throw new Error(`FIN-25: ${postCutoffAccounts.length} accounts carry a post cut-off service period, expected 1`);
  }

  // V8: one line the policy does not decide. The only material revenue account,
  // whose supporting FIN-17 close task is not complete. The checklist qualifier
  // is explanatory rather than selective: dropping it returns 1 either way.
  const checklist = buildCloseChecklist();
  const blocked = accounts.filter((code) => {
    const line = trackerFor.get(code);
    if (!materialCodes.has(code) || line.statement_section !== "revenue") return false;
    const supporting = checklist.filter((t) => t.category === line.statement_section);
    return supporting.length > 0 && supporting.some((t) => t.status !== "complete");
  });
  if (blocked.length !== 1) {
    throw new Error(`FIN-25: ${blocked.length} accounts fit the blocked-line rule, expected 1`);
  }
}

/** FIN-25's bytes. Emitted through the wrapper, the FIN-16 over FIN-15 pattern. */
export function generateSupportingDetail() {
  const { rows } = buildSupportingDetail();
  return [{ path: DETAIL_FILE, content: toCsv(SUPPORTING_DETAIL_COLUMNS, rows) }];
}

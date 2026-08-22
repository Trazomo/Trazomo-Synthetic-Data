// Rule R-SIGN: the two sign operations of a profit-and-loss statement, stated
// once so three artifacts cannot each implement a different one.
//
// Conflating them was the single largest defect an adversarial review found in
// the cluster 3 and 4 plan, and the bytes decide it rather than taste:
//
//   1. **A per-line actual uses the account's own normal balance.** Period
//      debit less period credit on a debit-normal line, the reverse on a
//      credit-normal line. Account 4900 Sales Discounts and Credits is a
//      revenue-section line with a debit normal balance, so it emits a
//      positive 45,395.51 and its variance against its own positive budget is
//      immaterial. This is the rule a merged trazomo module already states in
//      prose ("reversed on a credit line") and the rule under which the
//      variance tracker reports FOUR material lines. Under the alternative it
//      reports five, which contradicts shipped content.
//
//   2. **A section subtotal applies `section_sign`.** A subtotal is
//      `sum(actual * section_sign)`, where the sign is 1 when a line's normal
//      balance matches its section's natural direction and -1 when it does
//      not. Skipping it returns March revenue of 4,245,474.82 instead of
//      4,154,683.80, a gap of exactly twice the contra line, and the gross
//      margin reads 81.28 percent instead of 80.87.
//
// FIN-24 ships `section_sign` as a column so no consumer has to hold the
// natural-direction table below; FIN-24, FIN-25, FIN-29 and FIN-33 all import
// the functions here rather than re-deriving them.
//
// Executed against the frozen v1.4.1 bytes in tests/unit/finance-statement.test.js,
// including both mistakes above, so a generator that gets a sign wrong fails a
// test instead of shipping a plausible file.
import { toCents } from "../money.js";

/** The direction each statement section runs in. */
export const SECTION_NATURAL_BALANCE = Object.freeze({
  revenue: "credit",
  cost_of_revenue: "debit",
  operating_expense: "debit",
});

const NORMAL_BALANCES = ["debit", "credit"];

function assertNormalBalance(normalBalance, where) {
  if (!NORMAL_BALANCES.includes(normalBalance)) {
    throw new Error(`${where}: normal balance must be "debit" or "credit", got ${JSON.stringify(normalBalance)}`);
  }
}

/**
 * R-SIGN convention 1. The period movement of one trial-balance row, in the
 * account's own direction, as integer cents.
 *
 * @param {{period_debit: string, period_credit: string}} trialBalanceRow a FIN-05 row
 * @param {"debit"|"credit"} normalBalance the line's own normal balance
 * @returns {number} integer cents, signed
 */
export function actualAmountCents(trialBalanceRow, normalBalance) {
  assertNormalBalance(normalBalance, "actualAmountCents");
  for (const col of ["period_debit", "period_credit"]) {
    if (typeof trialBalanceRow?.[col] !== "string") {
      throw new Error(`actualAmountCents: the trial-balance row carries no ${col}`);
    }
  }
  const debit = toCents(trialBalanceRow.period_debit);
  const credit = toCents(trialBalanceRow.period_credit);
  return normalBalance === "debit" ? debit - credit : credit - debit;
}

/**
 * R-SIGN convention 2. The sign a line contributes to its own section's
 * subtotal: 1 when it runs with the section, -1 when it runs against it.
 *
 * @param {string} statementSection
 * @param {"debit"|"credit"} normalBalance
 * @returns {1|-1}
 */
export function sectionSign(statementSection, normalBalance) {
  const natural = SECTION_NATURAL_BALANCE[statementSection];
  if (!natural) {
    throw new Error(
      `sectionSign: unknown statement section ${JSON.stringify(statementSection)} `
      + `(known: ${Object.keys(SECTION_NATURAL_BALANCE).join(", ")})`
    );
  }
  assertNormalBalance(normalBalance, "sectionSign");
  return normalBalance === natural ? 1 : -1;
}

/**
 * R-SIGN convention 2, applied. Subtotal every statement section over lines
 * that already carry their convention-1 actual.
 *
 * @param {{statement_section: string, normal_balance: string, actual_cents: number}[]} lines
 * @returns {{revenue: number, cost_of_revenue: number, operating_expense: number}} integer cents
 */
export function sectionSubtotalsCents(lines) {
  const subtotals = Object.fromEntries(Object.keys(SECTION_NATURAL_BALANCE).map((s) => [s, 0]));
  for (const line of lines) {
    if (!Number.isInteger(line?.actual_cents)) {
      throw new Error(
        `sectionSubtotalsCents: ${line?.line_id ?? "a line"} carries no integer actual_cents. `
        + "Compute it with actualAmountCents() first; a subtotal never re-derives its own inputs."
      );
    }
    subtotals[line.statement_section] += line.actual_cents * sectionSign(line.statement_section, line.normal_balance);
  }
  return subtotals;
}

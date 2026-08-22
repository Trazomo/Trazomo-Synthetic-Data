// Rule R-SIGN, executed. Two operations exist and conflating them was the
// single largest defect adversarial review found in the D5 plan:
//
//   1. A per-line actual uses the account's own normal balance. The contra
//      revenue line therefore carries a positive magnitude, and the variance
//      tracker reports four material lines.
//   2. A section subtotal applies section_sign, so the contra line subtracts.
//
// Convention 1 with convention 2's sign folded in produces five material lines
// and contradicts merged trazomo content, which prints four. Convention 2 left
// out of a subtotal produces 4245474.82 rather than 4154683.80 and disagrees
// with the metrics pack by 90791.02. Both mistakes are asserted below against
// the frozen v1.4.1 bytes, so a wave that gets the sign wrong fails here rather
// than shipping a plausible file.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cents, toCents } from "../../datagen/src/money.js";
import {
  SECTION_NATURAL_BALANCE, actualAmountCents, sectionSign, sectionSubtotalsCents,
} from "../../datagen/src/generators/finance-statement.js";
import { csvTable } from "../helpers/csv-table.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");

const readDataset = (name, file) =>
  csvTable(readFileSync(join(REPO_ROOT, "datasets", "finance", name, file), "utf8")).rows;

const trialBalance = () => new Map(
  readDataset("gl-trial-balance", "gl-trial-balance.csv").map((r) => [r.account_code, r])
);
const templateLines = () => readDataset("budget-vs-actual-template", "budget-vs-actual-template.csv");

/** Every template line with its convention-1 actual, in cents. */
function filledLines() {
  const tb = trialBalance();
  return templateLines().map((line) => ({
    ...line,
    actual_cents: actualAmountCents(tb.get(line.account_code), line.normal_balance),
  }));
}

test("the natural direction of each statement section is stated once, and only for the three that exist", () => {
  assert.deepEqual(
    SECTION_NATURAL_BALANCE,
    { revenue: "credit", cost_of_revenue: "debit", operating_expense: "debit" }
  );
  const sections = new Set(templateLines().map((l) => l.statement_section));
  assert.deepEqual(
    [...sections].sort(),
    Object.keys(SECTION_NATURAL_BALANCE).sort(),
    "the shipped tracker carries a statement_section the sign table has never heard of"
  );
});

test("R-SIGN convention 1: a per-line actual is the period movement in the account's own direction", () => {
  const debitRow = { period_debit: "100.00", period_credit: "40.00" };
  assert.equal(actualAmountCents(debitRow, "debit"), 6000);
  assert.equal(actualAmountCents(debitRow, "credit"), -6000, "a credit-normal line reverses the movement");
  assert.throws(() => actualAmountCents(debitRow, "either"), /normal balance/i);
  assert.throws(() => actualAmountCents({ period_debit: "1.00" }, "debit"), /period_credit/);
});

test("R-SIGN convention 2: section_sign is -1 exactly where a line runs against its section", () => {
  assert.equal(sectionSign("revenue", "credit"), 1);
  assert.equal(sectionSign("revenue", "debit"), -1, "contra revenue subtracts from revenue");
  assert.equal(sectionSign("operating_expense", "debit"), 1);
  assert.equal(sectionSign("cost_of_revenue", "credit"), -1);
  assert.throws(() => sectionSign("balance_sheet", "debit"), /statement section/i);
  assert.throws(() => sectionSign("revenue", "sideways"), /normal balance/i);

  const negative = templateLines().filter((l) => sectionSign(l.statement_section, l.normal_balance) === -1);
  assert.deepEqual(
    negative.map((l) => l.line_id),
    ["BVA-06"],
    "the shipped tracker has exactly one contra line, and it is BVA-06 (account 4900)"
  );
});

test("the March subtotals through section_sign are the three figures the metrics pack publishes", () => {
  const subtotals = sectionSubtotalsCents(filledLines());
  assert.equal(cents(subtotals.revenue), "4154683.80");
  assert.equal(cents(subtotals.cost_of_revenue), "794782.15");
  assert.equal(cents(subtotals.operating_expense), "5127949.43");

  const net = subtotals.revenue - subtotals.cost_of_revenue - subtotals.operating_expense;
  assert.equal(cents(-net), "1768047.78");
  assert.equal(
    cents(-net),
    trialBalance().get("3200").period_debit,
    "the three subtotals no longer roll up to account 3200's own period movement"
  );
});

test("a subtotal that skips section_sign is wrong by exactly twice the contra line", () => {
  const lines = filledLines();
  const naiveRevenue = lines
    .filter((l) => l.statement_section === "revenue")
    .reduce((sum, l) => sum + l.actual_cents, 0);
  assert.equal(cents(naiveRevenue), "4245474.82", "the naive sum is the figure the plan warns about");

  const correct = sectionSubtotalsCents(lines).revenue;
  const contra = lines.find((l) => l.line_id === "BVA-06").actual_cents;
  assert.equal(cents(contra), "45395.51", "the contra line no longer carries a positive magnitude");
  assert.equal(naiveRevenue - correct, 2 * contra);
  assert.equal(cents(naiveRevenue - correct), "90791.02");

  // Gross margin reads 81.28 percent under the naive sum and 80.87 under the
  // rule, which is the difference between agreeing with the pack and not.
  const cor = sectionSubtotalsCents(lines).cost_of_revenue;
  assert.equal((((correct - cor) / correct) * 100).toFixed(2), "80.87");
  assert.equal((((naiveRevenue - cor) / naiveRevenue) * 100).toFixed(2), "81.28");
});

test("convention 1 yields the four material lines merged content already prints, and the statement-sign reading yields five", () => {
  const material = (signOf) => filledLines()
    .filter((l) => {
      const variance = l.actual_cents * signOf(l) - toCents(l.budget_amount);
      return Math.abs(variance) >= toCents(l.explanation_threshold_usd);
    })
    .map((l) => l.line_id);

  assert.deepEqual(
    material(() => 1),
    ["BVA-04", "BVA-09", "BVA-13", "BVA-19"],
    "convention A no longer returns the four lines a shipped trazomo module prints by name"
  );
  assert.deepEqual(
    material((l) => sectionSign(l.statement_section, l.normal_balance)),
    ["BVA-04", "BVA-06", "BVA-09", "BVA-13", "BVA-19"],
    "the rejected convention no longer returns five, so the reason convention A is forced has changed"
  );
});

test("the four material variances hold their shipped figures to the cent", () => {
  const byId = new Map(filledLines().map((l) => [l.line_id, l]));
  const expected = {
    "BVA-04": ["23710.01", "5.44"],
    "BVA-09": ["17518.43", "5.74"],
    "BVA-13": ["-17134.55", "-5.86"],
    "BVA-19": ["47043.50", "7.11"],
  };
  for (const [lineId, [amount, pct]] of Object.entries(expected)) {
    const line = byId.get(lineId);
    const budget = toCents(line.budget_amount);
    const variance = line.actual_cents - budget;
    assert.equal(cents(variance), amount, `${lineId} variance amount`);
    assert.equal(((variance / budget) * 100).toFixed(2), pct, `${lineId} variance percent`);
  }
  assert.equal(cents(byId.get("BVA-19").actual_cents), "708443.50", "BVA-19's actual is printed in merged content");
});

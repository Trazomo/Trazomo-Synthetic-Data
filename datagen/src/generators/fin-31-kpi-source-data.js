// FIN-31 kpi-source-data and FIN-32 bank-balances: SKELETON, not yet built. One
// builder emits both, so the KPI inputs and the cash they are read against
// share one month-end series.
//
// Foundations (D5a step 1) ships the contract only; the build is wave 1's
// (plan Task 7) and runs after FIN-33. Until then this module is not in
// index.js REGISTRY, generate() throws, and
// tests/generators/fin-31-kpi-sources.test.js carries the red assertions as
// `todo`.
//
// The split between the three FP&A files is deliberate and non-overlapping:
// FIN-33 is the profit-and-loss trend, FIN-32 is cash, FIN-31 is everything
// else a KPI needs and no other artifact carries. All three read the same
// 24-month series from monthEnds() in datagen/src/dates.js.
//
// Two rules the wave must not re-litigate:
//
//   Headcount is forced, not chosen (plan U6). CORE-04 carries no termination
//   date, so the series counts active roster rows with start_date on or before
//   the period end, the 18 departed rows are excluded at every date, and the
//   result is monotonically non-decreasing. A module that wants attrition has
//   to say the pack does not carry it.
//
//   Runway is deliberately absent (plan V19). No file this builder emits may
//   contain that word: the pack supports two defensible methods and declares
//   neither, which is what makes the assumption something a consumer has to
//   show. The scope of that rule is the emitted datasets, not the repository:
//   specs/artifact-specs.yaml carries the word in FIN-31's and FIN-34's own
//   planted_features.
import { NotImplementedError } from "../errors.js";

export const id = "FIN-31";

export const COLUMNS = [
  "metric_id", "metric_name", "period_end", "value", "unit",
  "source_artifact", "source_reference", "computation_note",
];

export const BANK_BALANCE_COLUMNS = [
  "account_code", "account_name", "bank_canon_id", "bank_name", "account_number_masked",
  "period_end", "book_balance", "bank_balance", "reconciling_difference", "source_artifact",
];

/** The seven KPI inputs, in the order the file lists them. */
export const METRIC_IDS = [
  "ar_subledger_balance", "deferred_revenue_current", "deferred_revenue_noncurrent",
  "ar_customer_count", "new_arr", "churned_arr", "headcount",
];

/** The one cash account the pack ships a bank statement for (FIN-01). */
export const RECONCILED_CASH_ACCOUNT = "1010";

/** The word no emitted file may carry. */
export const ABSENT_BY_DESIGN = "runway";

export function generate() {
  throw new NotImplementedError(id, "D5a wave 1 (plan Task 7) owns this build; the skeleton ships the contract only");
}

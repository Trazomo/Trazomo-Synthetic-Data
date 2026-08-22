// FIN-24 actuals-vs-budget, FIN-25 supporting-je-detail and FIN-26
// materiality-thresholds: SKELETON, not yet built. One builder emits all three,
// the way fin-15-collections.js emits two ids, so the threshold that decides
// what is material, the tracker it is applied to, and the detail behind each
// flagged line cannot disagree.
//
// Foundations (D5a step 1) ships the contract only. The build belongs to wave 1
// (plan Task 6), which runs FIN-26, then FIN-24, then FIN-25, and cannot start
// before FIN-33 exists: FIN-24's prior_period_actual is FIN-33's 2026-02
// column, and FIN-25's account set is the four material budget lines plus the
// two lines that breach only the flux rule.
//
// Until the wave lands this module is not in index.js REGISTRY, generate()
// throws, and tests/generators/fin-24-actuals-vs-budget.test.js and
// fin-25-supporting-je-detail.test.js carry the red assertions as `todo`.
// Turning it green: implement the builder, delete the throws here and in the
// two wrappers, register all three ids, drop the `{ todo: ... }` options.
//
// Three rules the wave must not re-litigate, all settled 2026-08-22:
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
import { NotImplementedError } from "../errors.js";

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

/** FIN-26's two rules. The budget rule reproduces all 27 shipped FIN-37 thresholds. */
export const BUDGET_VARIANCE_RULE = { pct_of_budget: 0.05, floor_cents: 1000000, round_up_to_cents: 100000 };
/** Plan U8: the one figure no frozen file pins. Chosen so exactly three lines breach it. */
export const FLUX_RULE = { pct_of_prior_period: 0.10, floor_cents: 1000000, round_up_to_cents: 100000 };
export const ESCALATION_AT_OR_ABOVE_CENTS = 10000000;
export const MATERIALITY_DECISION_ID = "DA-01";

export function generate() {
  throw new NotImplementedError(id, "D5a wave 1 (plan Task 6) owns this build; the skeleton ships the contract only");
}

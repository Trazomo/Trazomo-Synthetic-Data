// FIN-29 approved-metrics-pack: SKELETON, not yet built. The approved figure
// set a board narrative may cite, so nothing downstream ever computes a number.
//
// Foundations (D5a step 1) ships the contract only; the build is wave 2's
// (plan Task 10) and runs after FIN-24, whose section_sign column the March
// subtotals are summed over.
//
// Twelve metrics exactly, every one recomputed from frozen bytes at build time,
// and every metric's `basis` string naming the sign convention its own value
// uses. That last part is not decoration: the test is authored from the basis
// string, and a one-line source description is what let FIN-24 and FIN-29
// diverge by 90791.02 in the plan's first draft. A subtotal applies
// section_sign (rule R-SIGN, generators/finance-statement.js); a balance does
// not.
//
// Two headline figures are already published in rounded form by the frozen
// FIN-40 excerpt, and agreeing with them is the artifact's whole point.
//
// The approval block states a tension rather than hiding it (plan U11): the
// close task that produces the pre-close trial balance is in_progress at the
// as-of, so source_close_task_status_at_as_of carries that word and
// source_artifact names FIN-05, which no checklist status can contradict.
import { NotImplementedError } from "../errors.js";

export const id = "FIN-29";

export const OUTPUT_FILE = "approved-metrics-pack.json";

/** The twelve metric ids, in the order the pack lists them. */
export const METRIC_IDS = [
  "revenue_net_q1", "net_loss_q1", "revenue_net_march", "cost_of_revenue_march",
  "operating_expense_march", "net_loss_march", "gross_margin_pct_march",
  "cash_total_2026_03_31", "net_cash_change_march", "ar_subledger_total",
  "ar_over_90_days", "deferred_revenue_total",
];

export const APPROVAL = Object.freeze({
  approved_by_role: "Controller",
  reviewed_by_role: "VP, Finance",
  approved_date: "2026-04-06",
  source_close_task: "CLS-16",
  source_artifact: "FIN-05",
});

/** The FIN-39 row that governs sharing pre-announcement board material. */
export const RELATED_DECISION_ID = "DA-20";

export function generate() {
  throw new NotImplementedError(id, "D5a wave 2 (plan Task 10) owns this build; the skeleton ships the contract only");
}

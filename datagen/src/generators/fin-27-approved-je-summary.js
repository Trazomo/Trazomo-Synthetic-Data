// FIN-27 approved-je-summary: SKELETON, not yet built. The entry-level roll-up
// of the FIN-09 close batch, which is what a close memo reports on. Derived,
// not drawn: 31 rows, one per FIN-09 entry_id, every figure recomputed from the
// shipped bytes.
//
// Foundations (D5a step 1) ships the contract only; the build is wave 2's
// (plan Task 8). Until then this module is not in index.js REGISTRY,
// generate() throws, and tests/generators/fin-27-approved-je-summary.test.js
// carries the red assertions as `todo`.
//
// FIN-27 is the ONLY cluster 3 and 4 artifact that reconciles to FIN-09.
// FIN-24 and FIN-25 reconcile to FIN-05, which does not reflect this batch.
//
// Two facts about the batch that a generator must carry through rather than
// tidy away:
//   * eleven of the 31 entries are approved on 2026-04-04 or 2026-04-05, the
//     weekend inside the close window. The close is dated in business days;
//     the approvals were not. Assert the count, never assume it is zero.
//   * one entry posts to account 6125, which the FIN-22 chart carries as
//     inactive. That is FIN-09's own shipped plant and it has to survive the
//     roll-up.
//
// memo_disclosure_class is assigned by rule over FIN-09's own columns. The
// population qualifier on the no-support finding is load bearing: the two
// internal-schedule entries cite nothing by the shipped v1.4.1 rule and are not
// findings, so the count is 1 under the population and 3 without it.
import { NotImplementedError } from "../errors.js";

export const id = "FIN-27";

export const COLUMNS = [
  "entry_id", "posting_date", "approved_date", "entry_type", "line_count", "entry_total",
  "currency", "prepared_by_employee_id", "approved_by_employee_id", "distinct_accounts",
  "source_document_count", "supports_close_task", "memo_disclosure_class",
];

export const DISCLOSURE_CLASSES = ["routine", "judgemental", "unsupported"];

/** Entry types that carry no external document by design (the internal schedules). */
export const INTERNAL_SCHEDULE_TYPES = ["depreciation", "amortization"];

/** The close task the batch posts under. */
export const SUPPORTS_CLOSE_TASK = "CLS-15";

export function generate() {
  throw new NotImplementedError(id, "D5a wave 2 (plan Task 8) owns this build; the skeleton ships the contract only");
}

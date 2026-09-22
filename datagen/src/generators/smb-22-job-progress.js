// SMB-22 job-progress: six jobs at the 2026-03-31 as-of date, the margin
// identity as columns, and the one job that reads fine and is not.
//
//   P5  a job that reads on track and carries an open change order WHOSE
//       VALUE IS ABOVE the change_order_materiality_usd the row itself carries.
//       1 under the rule; 3 with the named qualifier dropped, because three
//       jobs read on track and carry an open change order and the other two
//       stay above the floor on both readings.
//
//   P6  a job with no open change order AND no expense row whose category is
//       outside the job-cost set.
//       1 under the rule, frozen by the internal status notes; 2 with the
//       qualifier dropped, because two jobs carry no open change order and one
//       of the two is carrying the miscoded expense.
//
// billed_to_date_usd, time_cost_usd, expense_cost_usd and
// open_change_order_value_usd are SUMS over the emitted invoice register, time
// record and expense export, computed here from those rows and then held
// against the data plan's pinned table. A generator that computed them from
// its own constants would pass its own test and ship a file that disagrees
// with its inputs.
//
// There is no on_track column, no status column, no health column and no
// true_margin column: all four would be answer keys. A job reads on track when
// the gap between percent billed and percent_complete is inside the tolerance
// the row carries, and the six gaps are 0, 0, 5, 5, 5 and 10, so the inclusive
// and the exclusive readings of that tolerance return the same five-job set.
//
// Built in the shared builder smb-c3-job-costing.js, which is never registered.
import { toCsv } from "../csv.js";
import {
  CHANGE_ORDER_MATERIALITY_CENTS, MARGIN_FLOOR_BP, ON_TRACK_TOLERANCE_PCT,
  OPEN_CHANGE_ORDERS, PERCENT_COMPLETE, PINNED_PROGRESS, PROGRESS_CENSUS,
  PROGRESS_COLUMNS, PROGRESS_TARGET_ROWS, buildJobProgress,
} from "./smb-c3-job-costing.js";

export const id = "SMB-22";

export const COLUMNS = PROGRESS_COLUMNS;
export const TARGET_ROWS = PROGRESS_TARGET_ROWS;
export const CENSUS = PROGRESS_CENSUS;

export {
  CHANGE_ORDER_MATERIALITY_CENTS, MARGIN_FLOOR_BP, ON_TRACK_TOLERANCE_PCT,
  OPEN_CHANGE_ORDERS, PERCENT_COMPLETE, PINNED_PROGRESS, buildJobProgress,
};

export function generate({ spec, canon }) {
  const rows = buildJobProgress({ canon });
  if (spec?.columns && spec.columns.join(",") !== COLUMNS.join(",")) {
    throw new Error(`${id}: the spec's columns disagree with the builder's header`);
  }
  return [{ path: "job-progress.csv", content: toCsv(COLUMNS, rows) }];
}

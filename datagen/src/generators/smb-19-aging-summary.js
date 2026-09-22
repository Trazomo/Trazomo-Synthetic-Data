// SMB-19 aging-summary: one row per client carrying a non-zero open balance at
// the 2026-03-31 as-of date. No defects: both of its planted features are
// populations a rule has to discriminate rather than errors in the data.
//
//   P2  a client at dunning_stage 2 or more WITH an empty promise_to_pay_date.
//       1 under the rule; 3 with the qualifier dropped, because three clients
//       are past the ladder's first step and two of the three already carry a
//       promise to pay.
//
//   P3  a client whose earliest unsettled installment_due_date is after the
//       as-of date. 1 under the rule; 2 with the qualifier dropped, because
//       two clients are on a payment plan at all and the other is in arrears.
//
// Every cell is derived inside the builder from SMB-17 and SMB-18 and then
// held against the data plan's four pinned rows: the open balance is the sum
// of that client's unsettled installment amounts, the governing due date is
// the earliest unsettled obligation, and the bucket and the stage are integer
// functions of days_past_due. Nothing is read off a label and nothing is
// typed into a cell.
//
// Built in the shared builder smb-c3-receivables.js, which is never registered
// as a generator of its own.
import { toCsv } from "../csv.js";
import {
  AGING_BUCKETS, AGING_CENSUS, AGING_COLUMNS, AGING_TARGET_ROWS, DUNNING_LADDER,
  buildAgingSummary,
} from "./smb-c3-receivables.js";

export const id = "SMB-19";

export const COLUMNS = AGING_COLUMNS;
export const TARGET_ROWS = AGING_TARGET_ROWS;
export const CENSUS = AGING_CENSUS;

export { AGING_BUCKETS, DUNNING_LADDER, buildAgingSummary };

export function generate({ spec, canon }) {
  const rows = buildAgingSummary({ canon });
  if (spec?.columns && spec.columns.join(",") !== COLUMNS.join(",")) {
    throw new Error(`${id}: the spec's columns disagree with the builder's header`);
  }
  return [{ path: "aging-summary.csv", content: toCsv(COLUMNS, rows) }];
}

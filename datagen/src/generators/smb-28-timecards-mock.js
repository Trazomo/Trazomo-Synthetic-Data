// SMB-28 timecards-mock: 52 timecards clocked against SMB-27's shifts,
// TCD-LDB-01 upward in roster, date and clock-in order, each carrying the
// shift_id it was clocked against. Person ids only, never a name.
//
//   P2  the missing timecard: a scheduled shift with no timecard. 1 under the
//       rule; with "scheduled" dropped, 3 roster people carry no timecard at
//       all and none is a gap, and 28 timecards differ from their shift's
//       length and none is a gap.
//
//   P3  the rate mismatch: a timecard whose rate differs from the roster rate
//       for the same person, the roster rate less 125 cents. 1 under the rule;
//       with "for the same person" dropped, 52 of 52 differ from SMB-20's cost
//       rate for the role, which is correct.
//
// Three seeded streams, in this order: missing-timecard, clock (two draws per
// shift, always), rate-mismatch. Gross pay is computed nowhere (rule R-GATE).
//
// Built in the shared builder smb-c5-payroll.js, which also builds SMB-26,
// SMB-27 and SMB-29 and is never registered as a generator of its own.
import { toCsv } from "../csv.js";
import {
  P2_PIN, P3_PIN, TIMECARD_CENSUS, TIMECARD_COLUMNS, assertNoPayFigure, buildTimecards,
} from "./smb-c5-payroll.js";

export const id = "SMB-28";

export const COLUMNS = TIMECARD_COLUMNS;
export const CENSUS = TIMECARD_CENSUS;

export { P2_PIN, P3_PIN, buildTimecards };

export function generate({ spec, canon }) {
  if (spec?.columns && spec.columns.join(",") !== COLUMNS.join(",")) {
    throw new Error(`${id}: the spec's columns disagree with the builder's header`);
  }
  assertNoPayFigure({ canon });
  return [{ path: "timecards-mock.csv", content: toCsv(COLUMNS, buildTimecards({ canon })) }];
}

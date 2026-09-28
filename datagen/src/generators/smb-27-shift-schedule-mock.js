// SMB-27 shift-schedule-mock: 53 shifts for six of the nine crew in the pay
// period 2026-03-16 to 2026-03-29, on its ten weekdays, SHF-LDB-01 upward in
// date, start, roster and job order. Person ids only, never a name.
//
//   P1  the double booking: exactly one person is on two shifts that overlap
//       on one date under the strict test. 1 under the rule; 6 person-dates
//       carry two shifts at all, and the closed reading that counts "ends as
//       the next begins" flags the same 6, because the project lead's
//       back-to-back visits sit exactly on the boundary.
//
// Built in the shared builder smb-c5-payroll.js, which also builds SMB-26,
// SMB-28 and SMB-29 and is never registered as a generator of its own.
import { toCsv } from "../csv.js";
import {
  P1_PIN, PAY_PERIOD, SCHEDULE_CENSUS, SCHEDULE_COLUMNS, WORK_DATES, assertNoPayFigure, buildShiftSchedule,
} from "./smb-c5-payroll.js";

export const id = "SMB-27";

export const COLUMNS = SCHEDULE_COLUMNS;
export const CENSUS = SCHEDULE_CENSUS;

export { P1_PIN, PAY_PERIOD, WORK_DATES, buildShiftSchedule };

export function generate({ spec, canon }) {
  if (spec?.columns && spec.columns.join(",") !== COLUMNS.join(",")) {
    throw new Error(`${id}: the spec's columns disagree with the builder's header`);
  }
  assertNoPayFigure({ canon });
  return [{ path: "shift-schedule-mock.csv", content: toCsv(COLUMNS, buildShiftSchedule({ canon })) }];
}

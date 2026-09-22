// SMB-20 time-entries-mock: the studio's weekly time record across six jobs,
// sixty-seven rows at one row per job, per crew_role, per scope, per week
// ending Friday.
//
// No defects by design: this is the clean input the margin identity is
// recomputed from, so a defect here would make that recomputation
// unfalsifiable. Its spec carries no planted feature that is an error; what it
// carries are properties.
//
// A row is a ROLE TOTAL for a week and not one person's week, which is why 48
// painter-hours fit one row. No person is named: a human appears as a
// crew_role drawn from the approved proposal's own rate classes and as an
// anonymous CRW-LDB- slot that resolves to no canon id and to no name string.
//
// The renovation's hours tie to the approved proposal on QUANTITY at eight
// hours to the billed day, never on price: the proposal's day rates are what
// the studio charged, and a cost file priced at the billed rate would report a
// margin of exactly zero. Both of the proposal's markdown tables are parsed out
// of the frozen document at build time rather than retyped.
//
// The time record, the expense export and the margin snapshot are one
// arithmetic system and are built together in smb-c3-job-costing.js, which is
// a shared builder and is never registered as a generator of its own.
import { toCsv } from "../csv.js";
import {
  COST_RATE_CENTS, CREW_ROLES, CREW_SLOTS, SCOPES, TIME_CENSUS, TIME_COLUMNS,
  TIME_TARGET_ROWS, TIME_TOTALS, buildTimeEntries,
} from "./smb-c3-job-costing.js";

export const id = "SMB-20";

export const COLUMNS = TIME_COLUMNS;
export const TARGET_ROWS = TIME_TARGET_ROWS;
export const CENSUS = TIME_CENSUS;

export { COST_RATE_CENTS, CREW_ROLES, CREW_SLOTS, SCOPES, TIME_TOTALS, buildTimeEntries };

export function generate({ spec, canon }) {
  const rows = buildTimeEntries({ canon });
  if (spec?.columns && spec.columns.join(",") !== COLUMNS.join(",")) {
    throw new Error(`${id}: the spec's columns disagree with the builder's header`);
  }
  return [{ path: "time-entries-mock.csv", content: toCsv(COLUMNS, rows) }];
}

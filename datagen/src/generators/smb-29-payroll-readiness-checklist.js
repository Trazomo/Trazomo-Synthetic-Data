// SMB-29 payroll-readiness-checklist: the nine checks PRC-LDB-01 to -09 the
// payroll readiness run is measured against. No defects: it is the rule set.
// On the shipped roster, schedule and timecards six pass and three trip, one
// per plant: PRC-LDB-03 withholds readiness on the missing timecard,
// PRC-LDB-05 escalates the rate mismatch and never corrects it, and
// PRC-LDB-07 flags the double booking without holding readiness.
//
// Roles only: every check is owned by the project lead and escalates to the
// owner, read off SMB-33's DA-LDB-27 behind a loud-throw pin. A template: no
// person, no date, no rate, no canon entity and no law appears in it.
//
// Built in the shared builder smb-c5-payroll.js, which also builds SMB-26,
// SMB-27 and SMB-28 and is never registered as a generator of its own.
import { toCsv } from "../csv.js";
import {
  CHECKLIST_CENSUS, CHECKLIST_COLUMNS, DA27_PIN, ON_FAIL, assertNoPayFigure, buildReadinessChecklist,
} from "./smb-c5-payroll.js";

export const id = "SMB-29";

export const COLUMNS = CHECKLIST_COLUMNS;
export const CENSUS = CHECKLIST_CENSUS;

export { DA27_PIN, ON_FAIL, buildReadinessChecklist };

export function generate({ spec, canon }) {
  if (spec?.columns && spec.columns.join(",") !== COLUMNS.join(",")) {
    throw new Error(`${id}: the spec's columns disagree with the builder's header`);
  }
  assertNoPayFigure({ canon });
  return [{ path: "payroll-readiness-checklist.csv", content: toCsv(COLUMNS, buildReadinessChecklist({ canon })) }];
}

// SMB-21 job-expenses-mock: the expense export the job costing reads, with the
// one miscode in it. Thirty-four rows, thirty-one coded to a job and three
// overhead rows carrying no job code.
//
//   P4  a row whose expense_category is outside the job-cost set of
//       subcontract, materials, equipment_hire, permit and disposal WHILE its
//       job_id is non-empty.
//       1 under the rule; 4 with the named qualifier dropped, because four
//       rows carry a category outside that set and three of the four
//       correctly carry no job code at all.
//
// The miscode is found by CATEGORY. It is not found by counterparty, because
// twenty-one of the thirty-four rows name the same materials supplier and
// twenty of the twenty-one are legitimate purchases, and it is not found by
// amount, because that amount occurs nowhere else in the pack.
//
// Every non-empty counterparty is the electrical subcontractor or the
// materials supplier; a row with an empty one is an internal cost line. No
// third external vendor exists in this file, which is the tie-out and is not
// negotiable.
//
// One row discharges cluster 2b's forward obligation: the electrical rework the
// frozen internal status notes record, on a subcontract line dated the day the
// panel circuits task actually completed. The figure is RE-READ out of that
// document behind a loud-throw pin rather than typed here, it is correctly
// coded, and it is not the miscoded expense.
//
// Built in the shared builder smb-c3-job-costing.js, which is never registered.
import { toCsv } from "../csv.js";
import {
  EXPENSE_CATEGORIES, EXPENSE_CENSUS, EXPENSE_COLUMNS, EXPENSE_TARGET_ROWS,
  EXPENSE_TOTALS, JOB_COST_CATEGORIES, MATERIALS_COUNTERPARTY,
  SUBCONTRACT_COUNTERPARTY, buildJobExpenses,
} from "./smb-c3-job-costing.js";

export const id = "SMB-21";

export const COLUMNS = EXPENSE_COLUMNS;
export const TARGET_ROWS = EXPENSE_TARGET_ROWS;
export const CENSUS = EXPENSE_CENSUS;

export {
  EXPENSE_CATEGORIES, EXPENSE_TOTALS, JOB_COST_CATEGORIES, MATERIALS_COUNTERPARTY,
  SUBCONTRACT_COUNTERPARTY, buildJobExpenses,
};

export function generate({ spec, canon }) {
  const rows = buildJobExpenses({ canon });
  if (spec?.columns && spec.columns.join(",") !== COLUMNS.join(",")) {
    throw new Error(`${id}: the spec's columns disagree with the builder's header`);
  }
  return [{ path: "job-expenses-mock.csv", content: toCsv(COLUMNS, rows) }];
}

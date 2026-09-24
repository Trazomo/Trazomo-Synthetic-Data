// SMB-33 owner-decision-authority-matrix: the policy the smb-operational-controls
// validator runs against, FIN-39's column set re-scaled to a nine-person studio.
// No defects: the matrix is the policy.
//
//   P10  the small-business hard control: decisions every one of whose rows is
//        prohibited. 3 decisions on 7 rows under the rule, covering every
//        amount; 3 with the qualifier dropped (any prohibited row), the same
//        three, and sends_money_signs_client_or_commits_date reads yes on
//        exactly those seven rows.
//
//   P11  the restricted floor: a restricted row at autonomous or
//        review_before_commit. 0 under the rule; 12 rows sit at those two
//        levels with the qualifier dropped, none of them restricted.
//
// The bands are read from the shipped C3 bytes (SMB-22's materiality, SMB-17's
// deposits) inside the shared builder smb-c4-controls.js, which also builds
// SMB-32 and is never registered as a generator of its own.
import { toCsv } from "../csv.js";
import {
  AUTONOMY_LEVELS, DATA_CLASS_NAMES, MATRIX_CENSUS, MATRIX_COLUMNS, MATRIX_TARGET_ROWS,
  ROLE_SENIORITY, buildDecisionMatrix,
} from "./smb-c4-controls.js";

export const id = "SMB-33";

export const COLUMNS = MATRIX_COLUMNS;
export const TARGET_ROWS = MATRIX_TARGET_ROWS;
export const CENSUS = MATRIX_CENSUS;

export { AUTONOMY_LEVELS, DATA_CLASS_NAMES, ROLE_SENIORITY, buildDecisionMatrix };

export function generate({ spec, canon }) {
  const rows = buildDecisionMatrix({ canon });
  if (spec?.columns && spec.columns.join(",") !== COLUMNS.join(",")) {
    throw new Error(`${id}: the spec's columns disagree with the builder's header`);
  }
  return [{ path: "owner-decision-authority-matrix.csv", content: toCsv(COLUMNS, rows) }];
}

// SMB-26 crew-roster-mock: the nine people of co-100's studio, pe-216 to
// pe-224 in roster order, the only file in the small-business pack that
// carries a crew member's name (rule R-ROLE, amended for cluster 5). Eight
// hourly wages, each below its role's SMB-20 cost rate and equal to none of
// the six, and the owner salaried with no rate. Crew pay data is restricted
// under SMB-33's DA-LDB-27.
//
// Built in the shared builder smb-c5-payroll.js, which also builds SMB-27,
// SMB-28 and SMB-29 and is never registered as a generator of its own. The
// names are a constant there and are not drawn at build time.
import { toCsv } from "../csv.js";
import { CREW, ROSTER_CENSUS, ROSTER_COLUMNS, assertNoPayFigure, buildCrewRoster } from "./smb-c5-payroll.js";

export const id = "SMB-26";

export const COLUMNS = ROSTER_COLUMNS;
export const CENSUS = ROSTER_CENSUS;

export { CREW, buildCrewRoster };

export function generate({ spec, canon }) {
  if (spec?.columns && spec.columns.join(",") !== COLUMNS.join(",")) {
    throw new Error(`${id}: the spec's columns disagree with the builder's header`);
  }
  assertNoPayFigure({ canon });
  return [{ path: "crew-roster-mock.csv", content: toCsv(COLUMNS, buildCrewRoster()) }];
}

// FIN-32 bank-balances: SKELETON, not yet built. Thin wrapper over FIN-31's
// builder.
//
// See fin-31-kpi-source-data.js for the wave and the registration steps. The
// contract worth repeating: at 2026-02-28 every account's book_balance equals
// FIN-05's beginning_balance and at 2026-03-31 it equals FIN-05's
// ending_balance, so the trend and the trial balance cannot disagree at either
// end of the close. Accounts 1020, 1030 and 1050 carry bank equal to book and
// a stated difference of 0.00 (plan U5): the pack ships a statement for 1010
// only, and inventing three more bank feeds would invent three more
// reconciliations nothing teaches.
import { NotImplementedError } from "../errors.js";

export const id = "FIN-32";

export function generate() {
  throw new NotImplementedError(id, "D5a wave 1 (plan Task 7) owns this build; it is emitted by the FIN-31 builder");
}

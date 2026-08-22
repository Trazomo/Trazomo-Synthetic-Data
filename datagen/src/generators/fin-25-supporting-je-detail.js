// FIN-25 supporting-je-detail: SKELETON, not yet built. Thin wrapper over
// FIN-24's builder, the FIN-16 over FIN-15 pattern, so the account set under
// investigation and the detail behind it come from one place.
//
// See fin-24-actuals-vs-budget.js for the wave, the registration steps and the
// rules. The one contract worth repeating here: per gl_account, sum(debit)
// equals FIN-05's period_debit and sum(credit) equals its period_credit, to
// the cent. The target is FIN-05, never the FIN-09 batch FIN-05 does not
// reflect.
import { NotImplementedError } from "../errors.js";

export const id = "FIN-25";

export function generate() {
  throw new NotImplementedError(id, "D5a wave 1 (plan Task 6) owns this build; it is emitted by the FIN-24 builder");
}

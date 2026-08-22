// FIN-25 supporting-je-detail: the posted detail behind the accounts under
// investigation. Thin wrapper over FIN-24's builder, the FIN-16 over FIN-15
// pattern, so the account set under investigation and the detail behind it come
// from one place. Ignores its own rng on purpose.
//
// See fin-24-actuals-vs-budget.js for the line plan, the four root causes and
// the assertions. The one contract worth repeating here: per gl_account,
// sum(debit) equals FIN-05's period_debit and sum(credit) equals its
// period_credit, to the cent. The target is FIN-05, never the FIN-09 batch
// FIN-05 does not reflect, so a FIN-05 regeneration breaks this file loudly and
// correctly. That makes FIN-25 a downstream consumer of a file it does not own.
import { generateSupportingDetail } from "./fin-24-actuals-vs-budget.js";

export const id = "FIN-25";

export function generate() {
  return generateSupportingDetail();
}

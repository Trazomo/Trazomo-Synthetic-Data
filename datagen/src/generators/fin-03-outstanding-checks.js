// FIN-03 outstanding-checks: checks co-002 issued in March 2026 that had not
// cleared Anchor Point Bank by the statement end. Legitimate timing items, not
// planted defects. Thin wrapper over FIN-01's seeded builder; each row's
// gl_je_id resolves to a FIN-02 row. Ignores its own rng on purpose.
import { toCsv } from "../csv.js";
import { buildCashReconciliation, OUTSTANDING_COLUMNS } from "./fin-01-cash-recon.js";

export const id = "FIN-03";

export function generate() {
  const { outstanding } = buildCashReconciliation();
  return [{ path: "outstanding-checks.csv", content: toCsv(OUTSTANDING_COLUMNS, outstanding) }];
}

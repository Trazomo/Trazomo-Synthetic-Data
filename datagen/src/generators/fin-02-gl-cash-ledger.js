// FIN-02 gl-cash-ledger: co-002's cash GL ledger (account 1010, FIN-22) for
// March 2026. Thin wrapper: the rows come from FIN-01's seeded builder so the
// ledger and the bank statement always describe the same month (the CORE-03
// over CORE-04 buildRoster() pattern). Ignores its own rng on purpose.
import { toCsv } from "../csv.js";
import { buildCashReconciliation, GL_COLUMNS } from "./fin-01-cash-recon.js";

export const id = "FIN-02";

export function generate() {
  const { gl } = buildCashReconciliation();
  return [{ path: "gl-cash-ledger.csv", content: toCsv(GL_COLUMNS, gl) }];
}

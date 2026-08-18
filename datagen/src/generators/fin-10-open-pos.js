// FIN-10 open-pos: the purchase-order lines still open at 2026-03-31, with what
// was received, what was invoiced and what the ledger already accrued, plus the
// accrued-liabilities roll-forward for March. Thin wrapper over FIN-06's seeded
// builder. Ignores its own rng on purpose.
import { toCsv } from "../csv.js";
import { buildProcureToPay, OPEN_PO_COLUMNS } from "./fin-06-procure-to-pay.js";

export const id = "FIN-10";

export function generate() {
  const { openPos, rollForward } = buildProcureToPay();
  return [
    { path: "open-pos.csv", content: toCsv(OPEN_PO_COLUMNS, openPos) },
    { path: "accrual-rollforward.json", content: JSON.stringify(rollForward, null, 2) + "\n" },
  ];
}

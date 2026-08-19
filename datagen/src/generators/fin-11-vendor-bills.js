// FIN-11 vendor-bills: the vendor bills already posted to co-002's ledger for
// March 2026, including the two prepaid schedules the close has to deal with.
// Thin wrapper over FIN-06's seeded builder. Ignores its own rng on purpose.
import { toCsv } from "../csv.js";
import { buildProcureToPay, BILL_COLUMNS } from "./fin-06-procure-to-pay.js";

export const id = "FIN-11";

export function generate() {
  const { bills } = buildProcureToPay();
  return [{ path: "vendor-bills.csv", content: toCsv(BILL_COLUMNS, bills) }];
}

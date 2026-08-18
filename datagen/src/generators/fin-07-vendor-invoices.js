// FIN-07 vendor-invoices: the vendor invoices sitting in co-002's AP queue at
// the March 2026 cut-off. Thin wrapper: the rows come from FIN-06's seeded
// builder so the invoices, their purchase orders and the proposed payment run
// always describe the same month (the FIN-02 over FIN-01 pattern). Ignores its
// own rng on purpose.
import { toCsv } from "../csv.js";
import { buildProcureToPay, INVOICE_COLUMNS } from "./fin-06-procure-to-pay.js";

export const id = "FIN-07";

export function generate() {
  const { invoices } = buildProcureToPay();
  return [{ path: "vendor-invoices.csv", content: toCsv(INVOICE_COLUMNS, invoices) }];
}

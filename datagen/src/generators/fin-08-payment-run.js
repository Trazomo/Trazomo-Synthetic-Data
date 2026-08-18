// FIN-08 payment-run: the payment run co-002's AP team has proposed for
// 2026-04-02, inside the March close window and still pending approval. Thin
// wrapper over FIN-06's seeded builder, so every payment resolves to an invoice
// in FIN-07 and the run's exceptions are the ones FIN-07 already carries.
// Ignores its own rng on purpose.
import { toCsv } from "../csv.js";
import { buildProcureToPay, PAYMENT_COLUMNS } from "./fin-06-procure-to-pay.js";

export const id = "FIN-08";

export function generate() {
  const { payments } = buildProcureToPay();
  return [{ path: "payment-run.csv", content: toCsv(PAYMENT_COLUMNS, payments) }];
}

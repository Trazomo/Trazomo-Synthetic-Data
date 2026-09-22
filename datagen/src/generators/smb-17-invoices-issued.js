// SMB-17 invoices-issued: every invoice Larkspur raised in February and March
// 2026, as its own invoicing surface shows them.
//
// This is the file whose status column is wrong on exactly one row, and it is
// on the critical path of the whole cluster: SMB-18 names its invoice ids,
// SMB-19 ages its due dates and SMB-22 sums its amounts per job.
//
//   P1  an invoice whose invoice_status reads `paid` while no SMB-18 row for
//       its invoice_id reads settlement_status `settled`.
//       1 under the rule; 13 with the named qualifier dropped, because
//       thirteen invoices read `paid` and twelve of the thirteen settled.
//
// The eight already-recorded draws are read out of the SMB-04 and SMB-05
// builders at build time behind loud-throw pins, never retyped, and the eleven
// new ones are designed content: same bytes, forever. Every due_date is the
// invoice_date plus the payment_terms window in calendar days, recomputed
// here rather than carried.
//
// The register, the payment log and the aging ladder are one arithmetic
// system and are built together in smb-c3-receivables.js, which is a shared
// builder and is never registered as a generator of its own.
import { toCsv } from "../csv.js";
import {
  BILLED_TO_DATE_CENTS, INVOICE_CENSUS, INVOICE_COLUMNS, INVOICE_STATUSES,
  INVOICE_TARGET_ROWS, JOBS, PERIOD, buildInvoiceRegister, jobPopulation,
} from "./smb-c3-receivables.js";

export const id = "SMB-17";

export const COLUMNS = INVOICE_COLUMNS;
export const TARGET_ROWS = INVOICE_TARGET_ROWS;
export const CENSUS = INVOICE_CENSUS;

export { BILLED_TO_DATE_CENTS, INVOICE_STATUSES, JOBS, PERIOD, buildInvoiceRegister, jobPopulation };

export function generate({ spec, canon }) {
  const rows = buildInvoiceRegister({ canon });
  if (spec?.columns && spec.columns.join(",") !== COLUMNS.join(",")) {
    throw new Error(`${id}: the spec's columns disagree with the builder's header`);
  }
  return [{ path: "invoices-issued.csv", content: toCsv(COLUMNS, rows) }];
}

// SMB-18 payment-status-mock: the mock payment log behind the issued-invoice
// register. Twenty-five rows, no defects, and the mock property is a property
// of every row rather than a plant on one.
//
// Seventeen invoices settle or sit open on one row each, and two invoices are
// being settled under four-installment plans, PLN-LDB-01 and PLN-LDB-02, which
// is where the other eight rows come from. A payment plan is one row per
// installment, each wholly settled or wholly open, so SMB-02's `settled|open`
// vocabulary is sufficient and no partial-settlement value is invented. That
// separation is also what makes SMB-19's discrimination possible: `due_date`
// stays the invoice's own arithmetic due date on every row and
// `installment_due_date` carries the agreed one, so the naive reading and the
// correct reading are both on the row.
//
// R-MOCK is asserted as a property of all 25 rows: record_type `mock`, the
// byte-identical notice, and a method from SMB-02's two mock methods.
//
// The eight already-recorded rows are read out of the SMB-04 and SMB-05
// builders behind the same loud-throw pins SMB-17 uses. Built in the shared
// builder smb-c3-receivables.js, which is never registered as a generator.
import { toCsv } from "../csv.js";
import {
  PAYMENT_CENSUS, PAYMENT_COLUMNS, PAYMENT_TARGET_ROWS, buildPaymentLog,
} from "./smb-c3-receivables.js";

export const id = "SMB-18";

export const COLUMNS = PAYMENT_COLUMNS;
export const TARGET_ROWS = PAYMENT_TARGET_ROWS;
export const CENSUS = PAYMENT_CENSUS;

export { buildPaymentLog };

export function generate({ spec, canon }) {
  const rows = buildPaymentLog({ canon });
  if (spec?.columns && spec.columns.join(",") !== COLUMNS.join(",")) {
    throw new Error(`${id}: the spec's columns disagree with the builder's header`);
  }
  return [{ path: "payment-status-mock.csv", content: toCsv(COLUMNS, rows) }];
}

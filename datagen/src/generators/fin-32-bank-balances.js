// FIN-32 bank-balances: month-end cash by account and by side. Thin wrapper
// over FIN-31's builder, the FIN-16 over FIN-15 pattern, so the KPI inputs and
// the cash they are read against share one month-end series. Ignores its own
// rng on purpose.
//
// See fin-31-kpi-source-data.js for the series and the plants. The contract
// worth repeating: at 2026-02-28 every account's book_balance equals FIN-05's
// beginning_balance and at 2026-03-31 it equals FIN-05's ending_balance, so the
// trend and the trial balance cannot disagree at either end of the close.
// Accounts 1020, 1030 and 1050 carry bank equal to book and a stated difference
// of 0.00 (plan U5): the pack ships a statement for 1010 only, and inventing
// three more bank feeds would invent three more reconciliations nothing teaches.
import { toCsv } from "../csv.js";
import {
  assertAbsentByDesign, BANK_BALANCE_COLUMNS, BANK_BALANCES_FILE, buildKpiSources,
} from "./fin-31-kpi-source-data.js";

export const id = "FIN-32";

export function generate() {
  const { bankRows } = buildKpiSources();
  return assertAbsentByDesign([
    { path: BANK_BALANCES_FILE, content: toCsv(BANK_BALANCE_COLUMNS, bankRows) },
  ]);
}

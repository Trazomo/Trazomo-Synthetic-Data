// FIN-33 actuals-24mo and FIN-34 drivers: SKELETON, not yet built.
//
// Foundations (D5a step 1) ships the contract and nothing else: the id, the
// column list the spec pins, and the constants a wave must not retype. The
// build belongs to the FIN-33 wave (plan Task 5), and FIN-33 is on the
// critical path: four of the six cluster 3 and 4 modules pin it, FIN-24 reads
// its 2026-02 column, FIN-25's account set is not knowable without it, and
// FIN-28's every figure ties to it.
//
// Until the wave lands:
//   * this module is deliberately NOT in index.js REGISTRY, so `validate`
//     reports FIN-33 as SKIP NOT_IMPLEMENTED rather than failing, and the
//     determinism sweep does not enrol an id with no bytes;
//   * generate() throws, naming the wave that owns it;
//   * tests/generators/fin-33-actuals-24mo.test.js carries the red assertions,
//     marked `todo` so `npm test` stays at zero failures while still printing
//     what is not built.
//
// To turn it green: implement buildActuals24mo(), delete the throw, import
// this module in index.js and add both ids to REGISTRY and
// PROGRAM_GENERATOR_IDS, then drop the `{ todo: ... }` option from every test
// in the file above.
//
// The two constraints that make this artifact hard, both asserted by the
// builder before it returns (the FIN-38 "the builder refuses to emit"
// precedent) and re-derived independently in the test:
//   1. every 2026-03 actual equals FIN-05's period movement for that account,
//      under rule R-SIGN convention 1 (actualAmountCents in
//      generators/finance-statement.js), and therefore equals FIN-24's actual;
//   2. per account, 2026-01 plus 2026-02 equals FIN-05's beginning_balance,
//      because the fiscal year is the calendar year (canon/timeline.md), and
//      2026-01 plus 2026-02 plus 2026-03 equals ending_balance in the
//      account's own direction.
// The other 21 months are free, and a reroll of them must break neither.
import { NotImplementedError } from "../errors.js";

export const id = "FIN-33";

export const COLUMNS = [
  "line_id", "account_code", "account_name", "statement_section", "normal_balance",
  "period", "actual_amount", "currency",
];

export const DRIVERS_FILE = "drivers.yaml";

/** The five drivers FIN-34 carries, in the order the config lists them. */
export const DRIVER_IDS = ["hiring", "price_change", "churn", "collection_delay", "contract_win_loss"];

/** Scenario names, in the order the config lists them. */
export const SCENARIOS = ["base", "upside", "downside"];

/** Months the forecast runs beyond the base period. */
export const HORIZON_MONTHS = 18;

/**
 * The accounts the derived cost per head blends (plan U7). CORE-04 carries no
 * salary, so a fully loaded monthly cost per head is these four March balances
 * over the active headcount. 5020 is a cost-of-revenue account, and the YAML's
 * `derivation` key has to say so: blending it into people cost is a judgment,
 * not an accounting identity.
 */
export const COST_PER_HEAD_ACCOUNTS = ["6000", "6010", "6020", "5020"];

export function generate() {
  throw new NotImplementedError(id, "D5a wave A (plan Task 5) owns this build; the skeleton ships the contract only");
}

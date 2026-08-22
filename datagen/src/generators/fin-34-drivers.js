// FIN-34 drivers: the scenario input set module 30 forecasts with. Thin wrapper
// over FIN-33's builder, the FIN-16 over FIN-15 pattern, so the driver set and
// the trend it applies to can never disagree about which line_ids exist.
// Ignores its own rng on purpose.
//
// See fin-33-actuals-24mo.js for the drivers themselves, the cost-per-head
// derivation and the two plants. drivers.yaml carries no computed output: base,
// upside and downside cash and margin are the consuming module's deterministic
// engine, which is what "math never done by the model" means.
import { buildActuals24mo, DRIVERS_FILE, renderDriversYaml } from "./fin-33-actuals-24mo.js";

export const id = "FIN-34";

export function generate() {
  const { drivers } = buildActuals24mo();
  return [{ path: DRIVERS_FILE, content: renderDriversYaml(drivers) }];
}

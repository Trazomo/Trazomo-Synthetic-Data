// FIN-34 drivers: SKELETON, not yet built. Thin wrapper over FIN-33's builder,
// the FIN-16 over FIN-15 pattern, so the driver set and the trend it applies to
// can never disagree about which line_ids exist. Ignores its own rng on
// purpose.
//
// See fin-33-actuals-24mo.js for the wave, the registration steps and the
// constants. drivers.yaml carries no computed output: base, upside and
// downside cash, margin and runway are the consuming module's deterministic
// engine, which is what "math never done by the model" means.
import { NotImplementedError } from "../errors.js";

export const id = "FIN-34";

export function generate() {
  throw new NotImplementedError(id, "D5a wave A (plan Task 5) owns this build; it is emitted by the FIN-33 builder");
}

// FIN-26 materiality-thresholds: SKELETON, not yet built. Thin wrapper over
// FIN-24's builder.
//
// The artifact's reason to exist: it writes down a rule the frozen pack
// already obeys. Recomputing explanation_threshold_usd from budget_variance_rule
// reproduces all 27 shipped FIN-37 values with zero mismatches, so a FIN-37
// regeneration that moves a budget fails a test here instead of quietly moving
// four figures a merged trazomo module prints by name.
//
// See fin-24-actuals-vs-budget.js for the wave and the registration steps.
import { NotImplementedError } from "../errors.js";

export const id = "FIN-26";

export function generate() {
  throw new NotImplementedError(id, "D5a wave 1 (plan Task 6) owns this build; it is emitted by the FIN-24 builder");
}

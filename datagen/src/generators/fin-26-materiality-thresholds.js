// FIN-26 materiality-thresholds: the rule that decides which variance gets an
// explanation. Thin wrapper over FIN-24's builder, the FIN-16 over FIN-15
// pattern, so the threshold policy and the tracker it is applied to come from
// one place. Ignores its own rng on purpose: nothing here is drawn.
//
// The artifact's reason to exist: it writes down a rule the frozen pack
// already obeys. Recomputing explanation_threshold_usd from budget_variance_rule
// reproduces all 27 shipped FIN-37 values with zero mismatches, so a FIN-37
// regeneration that moves a budget fails a test here instead of quietly moving
// four figures a merged trazomo module prints by name.
//
// The flux rule is the one figure no frozen file pins. Its three numbers live
// in fin-33-actuals-24mo.js, because FIN-33 had to construct the plant that
// makes the rule interesting before FIN-26 existed; this artifact imports them
// rather than retyping them.
//
// effective_period comes from this spec's own `period`, so a spec edit moves
// the bytes instead of leaving the config asserting a window nothing states.
import { buildMaterialityPolicy, MATERIALITY_FILE, renderMaterialityYaml } from "./fin-24-actuals-vs-budget.js";

export const id = "FIN-26";

export function generate({ spec }) {
  const policy = buildMaterialityPolicy(spec?.period);
  return [{ path: MATERIALITY_FILE, content: renderMaterialityYaml(policy) }];
}

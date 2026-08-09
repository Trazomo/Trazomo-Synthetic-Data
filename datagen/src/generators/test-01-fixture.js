// TEST-01: the datagen tool's own self-test fixture generator. NOT a
// Trazomo-Synthetic-Data program artifact -- "TEST-01" never appears in the
// real specs/artifact-specs.yaml (see tests/fixtures/TEST-01/specs/ for the
// fixture catalog that defines it). Exists so `generate`, `validate`, and
// `manifest` have one small, real, deterministic spec to exercise end to
// end in tests without ever touching the real repo's datasets/ or
// artifacts/ trees (tests always pass --root tests/fixtures/TEST-01).
import { toCsv } from "../csv.js";

export const id = "TEST-01";

const LABELS = ["alpha", "beta", "gamma", "delta", "epsilon"];

export function generate({ rng }) {
  const r = rng("rows");
  const rows = [];
  for (let i = 1; i <= 5; i++) {
    rows.push({ row_id: i, value: r.int(1, 1000), label: r.pick(LABELS) });
  }
  return [{ path: "fixture-rows.csv", content: toCsv(["row_id", "value", "label"], rows) }];
}

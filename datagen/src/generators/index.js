// Registry of structured (CSV/JSON) generators, keyed by spec id. Adding a
// new generator: implement `export function generate(ctx)` in a new module
// under generators/, import it here, and add it to REGISTRY. See
// datagen/README.md for the full spec-authoring walkthrough.
//
// Every cluster 3 and 4 structured generator is now registered. The rule the
// three skeletons were held under still stands for any id added later:
// registering an id whose generator throws would enrol it in the determinism
// sweep and turn `validate`'s honest SKIP NOT_IMPLEMENTED into a failure, so an
// id is registered by the wave that builds it, in the same commit as its bytes.
// finance-statement.js is a shared helper rather than a generator and is never
// registered, the same as finance-roles.js.
import * as core02 from "./core-02-invoice.js";
import * as core03 from "./core-03-crm-seed.js";
import * as core04 from "./core-04-people-roster.js";
import * as fin01 from "./fin-01-cash-recon.js";
import * as fin02 from "./fin-02-gl-cash-ledger.js";
import * as fin03 from "./fin-03-outstanding-checks.js";
import * as fin04 from "./fin-04-ar-aging.js";
import * as fin05 from "./fin-05-gl-trial-balance.js";
import * as fin06 from "./fin-06-procure-to-pay.js";
import * as fin07 from "./fin-07-vendor-invoices.js";
import * as fin08 from "./fin-08-payment-run.js";
import * as fin09 from "./fin-09-je-batch.js";
import * as fin10 from "./fin-10-open-pos.js";
import * as fin11 from "./fin-11-vendor-bills.js";
import * as fin13 from "./fin-13-expense-reports.js";
import * as fin14 from "./fin-14-spend-policy.js";
import * as fin15 from "./fin-15-collections.js";
import * as fin16 from "./fin-16-collections-contact-log.js";
import * as fin17 from "./fin-17-close-checklist.js";
import * as fin18 from "./fin-18-control-matrix.js";
import * as fin19 from "./fin-19-access-assignments.js";
import * as fin20 from "./fin-20-regulatory-feed.js";
import * as fin22 from "./fin-22-chart-of-accounts.js";
import * as fin23 from "./fin-23-audit-evidence-index.js";
import * as fin24 from "./fin-24-actuals-vs-budget.js";
import * as fin25 from "./fin-25-supporting-je-detail.js";
import * as fin26 from "./fin-26-materiality-thresholds.js";
import * as fin27 from "./fin-27-approved-je-summary.js";
import * as fin29 from "./fin-29-approved-metrics-pack.js";
import * as fin31 from "./fin-31-kpi-source-data.js";
import * as fin32 from "./fin-32-bank-balances.js";
import * as fin33 from "./fin-33-actuals-24mo.js";
import * as fin34 from "./fin-34-drivers.js";
import * as fin35 from "./fin-35-inbound-queue.js";
import * as fin36 from "./fin-36-close-checklist-template.js";
import * as fin37 from "./fin-37-budget-vs-actual-template.js";
import * as fin38 from "./fin-38-reliability-drill.js";
import * as fin39 from "./fin-39-decision-authority-matrix.js";
import * as hr17 from "./hr-17-mixed-sensitivity.js";
import * as lgl07 from "./lgl-07-intake.js";
import * as lgl11 from "./lgl-11-litigation.js";
import * as lgl18 from "./lgl-18-rfp-panel.js";
import * as lgl20 from "./lgl-20-budget-roi.js";
import * as lgl21 from "./lgl-21-self-service-portal.js";
import * as lgl22 from "./lgl-22-matter-portfolio.js";
import * as rev07 from "./rev-07-object-model.js";
import * as test01 from "./test-01-fixture.js";
import { NotImplementedError } from "../errors.js";

// PROGRAM_GENERATOR_IDS: the real Trazomo-Synthetic-Data spec ids with a
// generator today. Use this (not REGISTRY's full key set) for anything that
// reports "generator coverage" against specs/artifact-specs.yaml -- TEST-01
// is the CLI's own test fixture (see generators/test-01-fixture.js), not a
// program artifact, and must never appear in that reporting.
export const PROGRAM_GENERATOR_IDS = [
  core02.id, core03.id, core04.id,
  fin01.id, fin02.id, fin03.id, fin04.id, fin05.id,
  fin06.id, fin07.id, fin08.id, fin09.id, fin10.id, fin11.id,
  fin13.id, fin14.id, fin15.id, fin16.id, fin17.id, fin18.id, fin19.id, fin20.id, fin22.id, fin23.id,
  fin24.id, fin25.id, fin26.id, fin27.id, fin29.id,
  fin31.id, fin32.id, fin33.id, fin34.id, fin35.id,
  fin36.id, fin37.id, fin38.id, fin39.id,
  hr17.id,
  lgl07.id, lgl11.id, lgl18.id, lgl20.id, lgl21.id, lgl22.id,
  rev07.id,
];

const REGISTRY = new Map(
  [
    core02, core03, core04,
    fin01, fin02, fin03, fin04, fin05, fin06, fin07, fin08, fin09, fin10, fin11,
    fin13, fin14, fin15, fin16, fin17, fin18, fin19, fin20, fin22, fin23,
    fin24, fin25, fin26, fin27, fin29,
    fin31, fin32, fin33, fin34, fin35,
    fin36, fin37, fin38, fin39,
    hr17,
    lgl07, lgl11, lgl18, lgl20, lgl21, lgl22,
    rev07, test01,
  ].map((mod) => [mod.id, mod])
);

export function hasGenerator(specId) {
  return REGISTRY.has(specId);
}

export function getGenerator(specId) {
  const mod = REGISTRY.get(specId);
  if (!mod) throw new NotImplementedError(specId);
  return mod;
}

export function implementedIds() {
  return [...REGISTRY.keys()];
}

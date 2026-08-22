// FIN-23 audit-evidence-index: SKELETON, not yet built. The audit-trail half of
// the finance knowledge base: the map from a question to the artifact that
// answers it.
//
// Foundations (D5a step 1) ships the contract only; the build is wave 2's
// (plan Task 9). Until then this module is not in index.js REGISTRY,
// generate() throws, and tests/generators/fin-23-audit-evidence-index.test.js
// carries the red assertions as `todo`.
//
// 32 rows, and every one of the fourteen columns is derived rather than drawn:
// 19 rows reuse FIN-18's non-empty evidence_reference values verbatim, and 13
// are one per FIN-17 task whose status is complete. Neither count is a target;
// both fall out of frozen files, which is why the test is a join rather than a
// magic number.
//
// Two derivations that are D5 decisions rather than facts of another file, and
// so are stated here:
//   * TASK_EVIDENCE_ARTIFACT below maps a close task to the artifact its
//     evidence lives in. FIN-18's own evidence_artifact set holds fourteen ids
//     and contains neither FIN-17 nor FIN-22, and it does not contain CORE-05
//     either, so CORE-05 enters this file only through this map.
//   * the CLS-12 row cites CORE-05 and a document_id the FIN-20 policy index
//     marks Superseded, which is the one row that makes retrieval land on a
//     document that is no longer current.
//
// Any guard that enumerates FIN-18's evidence_artifact set rather than checking
// membership is a finding (cluster 2 addendum R3).
import { NotImplementedError } from "../errors.js";

export const id = "FIN-23";

export const COLUMNS = [
  "evidence_id", "binder_reference", "period", "evidence_type", "title", "source_artifact",
  "source_reference", "supports_close_task", "supports_control_id", "prepared_by_employee_id",
  "reviewed_by_employee_id", "prepared_date", "retention_class", "storage_location",
];

/** Close task to the MANIFEST id its evidence lives in. A D5 decision, published here. */
export const TASK_EVIDENCE_ARTIFACT = Object.freeze({
  "CLS-01": "FIN-01", "CLS-04": "FIN-01", "CLS-05": "FIN-01",
  "CLS-03": "FIN-04", "CLS-06": "FIN-04", "CLS-07": "FIN-04",
  "CLS-02": "FIN-07", "CLS-08": "FIN-07",
  "CLS-10": "FIN-02",
  "CLS-11": "FIN-10",
  "CLS-12": "FIN-11",
  "CLS-13": "CORE-04",
  "CLS-15": "FIN-09",
});

export const EVIDENCE_TYPES = ["control_test", "reconciliation", "close_task"];
export const RETENTION_CLASSES = ["sox_7yr", "standard_3yr"];

/** The row that lands a retrieval on a superseded controlled document. */
export const SUPERSEDED_CITATION = Object.freeze({
  task_id: "CLS-12", source_artifact: "CORE-05", source_reference: "ADI-FIN-001",
});

export function generate() {
  throw new NotImplementedError(id, "D5a wave 2 (plan Task 9) owns this build; the skeleton ships the contract only");
}

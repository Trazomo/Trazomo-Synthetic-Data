// FIN-23 audit-evidence-index: the audit-trail half of the finance knowledge
// base: the map from a question to the artifact that answers it.
//
// 32 rows, and every one of the fourteen columns is derived rather than drawn:
// 19 rows reuse FIN-18's non-empty evidence_reference values verbatim, and 13
// are one per FIN-17 task whose status is complete. Neither count is a target;
// both fall out of frozen files, which is why the test is a join rather than a
// magic number. Nothing here is a draw, so this module takes no rng at all.
//
// Two derivations that are D5 decisions rather than facts of another file, and
// so are stated here:
//   * TASK_EVIDENCE_ARTIFACT below maps a close task to the artifact its
//     evidence lives in. FIN-18's own evidence_artifact set holds fourteen ids
//     and contains neither FIN-17 nor FIN-22, and it does not contain CORE-05
//     either, so CORE-05 enters this file only through this map.
//   * the CLS-12 row cites CORE-05 and a document_id the FIN-20 policy index
//     marks Superseded, which is the one row that makes retrieval land on a
//     document that is no longer current. The map still records FIN-11, which
//     is what that row would cite without the plant.
//
// Any guard that enumerates FIN-18's evidence_artifact set rather than checking
// membership is a finding (cluster 2 addendum R3).
//
// Rule R-CLS17 binds this file. FIN-23 indexes the evidence of tasks the
// checklist FILE reports as complete, and CLS-17 is not one of them, so no row
// exists for it. That is a statement about the file and never about whether the
// variance work was performed.
import { toCsv } from "../csv.js";
import { buildCloseChecklist } from "./fin-17-close-checklist.js";
import { buildControlMatrix } from "./fin-18-control-matrix.js";
import { buildPolicyIndex } from "./fin-20-regulatory-feed.js";
import { financeRoster } from "./finance-roles.js";

export const id = "FIN-23";

export const OUTPUT_FILE = "audit-evidence-index.csv";

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

/**
 * The row that is in the index and not yet in the binder. CLS-22, the task that
 * assembles the evidence binder for the period, is not_started on the shipped
 * checklist, so the batch CLS-15 posted has a binder locator and no folder to
 * find it in. Constructed: the storage rule fills every other row.
 */
export const UNFILED_EVIDENCE = Object.freeze({ task_id: "CLS-15" });

/** The close period every derived row belongs to. */
export const DERIVED_PERIOD = "2026-03";

/** The binder root every storage_location hangs off. */
export const BINDER_ROOT = "binder/2026Q1";

/** The two populations, sized by the frozen files rather than by a target. */
export const POPULATIONS = Object.freeze({ reused: 19, derived: 13 });

/** What the qualifier-free contrast to the unfiled row has to come back as. */
export const EMPTY_SOURCE_REFERENCE_ROWS = 9;

const seriesId = (prefix, n) => `${prefix}-2026Q1-${String(n).padStart(3, "0")}`;

/** The 19 rows FIN-18 already binds, in control_id order. */
function reusedRows(controls) {
  const bound = controls.filter((c) => c.evidence_reference !== "");
  return bound.map((control, i) => ({
    evidence_id: seriesId("EV", i + 1),
    binder_reference: control.evidence_reference,
    period: control.last_tested_date.slice(0, 7),
    evidence_type: "control_test",
    title: control.control_name,
    source_artifact: control.evidence_artifact,
    source_reference: control.control_id,
    supports_close_task: "",
    supports_control_id: control.control_id,
    prepared_by_employee_id: control.tester_employee_id,
    reviewed_by_employee_id: control.owner_employee_id,
    prepared_date: control.last_tested_date,
    retention_class: control.key_control === "true" ? "sox_7yr" : "standard_3yr",
    storage_location: `${BINDER_ROOT}/${control.process}/`,
  }));
}

/** The 13 rows FIN-17's complete tasks produce, in task_id order, continuing the series. */
function derivedRows(tasks, offset) {
  const complete = tasks.filter((t) => t.status === "complete");
  return complete.map((task, i) => {
    const superseded = task.task_id === SUPERSEDED_CITATION.task_id;
    const mapped = TASK_EVIDENCE_ARTIFACT[task.task_id];
    if (!mapped) throw new Error(`${id}: ${task.task_id} is complete and the task-to-artifact map does not cover it`);
    return {
      evidence_id: seriesId("EV", offset + i + 1),
      binder_reference: seriesId("EVB", offset + i + 1),
      period: DERIVED_PERIOD,
      evidence_type: task.account_code === "" ? "close_task" : "reconciliation",
      title: task.evidence_required,
      source_artifact: superseded ? SUPERSEDED_CITATION.source_artifact : mapped,
      source_reference: superseded ? SUPERSEDED_CITATION.source_reference : task.account_code,
      supports_close_task: task.task_id,
      supports_control_id: "",
      prepared_by_employee_id: task.owner_employee_id,
      reviewed_by_employee_id: task.reviewer_employee_id,
      prepared_date: task.completed_date,
      retention_class: "standard_3yr",
      storage_location: task.task_id === UNFILED_EVIDENCE.task_id
        ? ""
        : `${BINDER_ROOT}/close/${task.category}/`,
    };
  });
}

/**
 * Every plant, asserted from the assembled rows. The public test re-derives
 * each one from the emitted bytes without importing anything here.
 */
function assertPlants(rows, { controls, tasks, policyIndex, roster }) {
  const total = POPULATIONS.reused + POPULATIONS.derived;
  if (rows.length !== total) throw new Error(`${id}: ${rows.length} rows, expected ${total}`);
  const bound = controls.filter((c) => c.evidence_reference !== "");
  const complete = tasks.filter((t) => t.status === "complete");
  if (bound.length !== POPULATIONS.reused || complete.length !== POPULATIONS.derived) {
    throw new Error(
      `${id}: the frozen populations moved (${bound.length} bound controls, ${complete.length} complete tasks)`
    );
  }

  // The two series run without a gap, and the derived binder locators continue
  // FIN-18's own series past its maximum rather than restarting it.
  rows.forEach((row, i) => {
    if (row.evidence_id !== seriesId("EV", i + 1)) throw new Error(`${id}: the evidence id series has a gap at row ${i + 1}`);
  });
  const binderMax = bound.map((c) => c.evidence_reference).sort().at(-1);
  const derived = rows.filter((r) => r.supports_close_task !== "");
  if (derived.some((row) => row.binder_reference <= binderMax)) {
    throw new Error(`${id}: a derived binder locator does not continue FIN-18's series past ${binderMax}`);
  }
  if (new Set(rows.map((r) => r.binder_reference)).size !== total) {
    throw new Error(`${id}: two rows share a binder locator`);
  }

  // U18: period is derived on the reused rows, so it is a real search facet
  // rather than a flat label.
  const byPeriod = new Map();
  for (const row of rows.filter((r) => r.supports_control_id !== "")) {
    byPeriod.set(row.period, (byPeriod.get(row.period) ?? 0) + 1);
  }
  const facet = [...byPeriod.entries()].sort().map(([period, n]) => `${period}:${n}`).join(" ");
  const expectedFacet = "2026-01:2 2026-02:4 2026-03:13";
  if (facet !== expectedFacet) {
    throw new Error(`${id}: the tested-date facet is "${facet}", expected "${expectedFacet}"`);
  }

  // V13. One row cites the controlled-document library at all, and the document
  // it cites is one the shipped register marks Superseded.
  const citingLibrary = rows.filter((r) => r.source_artifact === SUPERSEDED_CITATION.source_artifact);
  if (citingLibrary.length !== 1) {
    throw new Error(`${id}: ${citingLibrary.length} rows cite ${SUPERSEDED_CITATION.source_artifact}, expected 1`);
  }
  const documents = new Map(policyIndex.map((d) => [d.document_id, d]));
  const cited = documents.get(citingLibrary[0].source_reference);
  if (!cited) throw new Error(`${id}: ${citingLibrary[0].source_reference} is not in the shipped controlled-document register`);
  if (cited.status !== "Superseded") {
    throw new Error(`${id}: ${cited.document_id} is ${cited.status}, so the retrieval lands on a current document`);
  }

  // V15, both cardinalities. The plant is the empty storage_location; the
  // contrast rule a reader reaches for first tests source_reference instead.
  const unfiled = rows.filter((r) => r.binder_reference !== "" && r.storage_location === "");
  if (unfiled.length !== 1) throw new Error(`${id}: ${unfiled.length} rows are indexed and not filed, expected 1`);
  const emptyReference = rows.filter((r) => r.source_reference === "");
  if (emptyReference.length !== EMPTY_SOURCE_REFERENCE_ROWS) {
    throw new Error(
      `${id}: ${emptyReference.length} rows carry an empty source_reference, `
      + `expected ${EMPTY_SOURCE_REFERENCE_ROWS}`
    );
  }

  // V14. Exactly one identical-title pair in the whole file, and period cannot
  // separate it because both rows are March.
  const titles = rows.map((r) => r.title);
  const collisions = [...new Set(titles.filter((t, i) => titles.indexOf(t) !== i))];
  if (collisions.length !== 1) {
    throw new Error(`${id}: ${collisions.length} titles appear more than once, expected 1`);
  }
  const pair = rows.filter((r) => r.title === collisions[0]);
  if (pair.length !== 2 || new Set(pair.map((r) => r.period)).size !== 1) {
    throw new Error(`${id}: the title collision is not a pair the period column fails to separate`);
  }

  // V16. The finding is a set difference: the controls the index is silent
  // about, and the one of them the matrix reports as passed.
  const covered = new Set(rows.map((r) => r.supports_control_id).filter(Boolean));
  const silent = controls.filter((c) => !covered.has(c.control_id));
  if (silent.length !== 7 || silent.some((c) => c.evidence_reference !== "")) {
    throw new Error(`${id}: ${silent.length} controls carry no row, expected the 7 with no binder reference`);
  }
  if (silent.filter((c) => c.test_result === "pass").length !== 1) {
    throw new Error(`${id}: the control the index is silent about no longer includes exactly one that passed`);
  }

  // Retention follows FIN-18's own key_control flag, and every named person is
  // an active roster row who did not review their own work.
  const sox = rows.filter((r) => r.retention_class === "sox_7yr");
  const keyControls = bound.filter((c) => c.key_control === "true");
  if (sox.length !== keyControls.length) {
    throw new Error(`${id}: ${sox.length} rows retain for seven years against ${keyControls.length} key controls`);
  }
  const byEmployee = new Map(roster.map((r) => [r.employee_id, r]));
  for (const row of rows) {
    for (const field of ["prepared_by_employee_id", "reviewed_by_employee_id"]) {
      const employee = byEmployee.get(row[field]);
      if (!employee || employee.employment_status !== "active") {
        throw new Error(`${id}: ${row.evidence_id} names ${row[field]}, who is not an active CORE-04 employee`);
      }
    }
    if (row.prepared_by_employee_id === row.reviewed_by_employee_id) {
      throw new Error(`${id}: ${row.evidence_id} was prepared and reviewed by the same person`);
    }
    if (!EVIDENCE_TYPES.includes(row.evidence_type)) {
      throw new Error(`${id}: ${row.evidence_id} carries evidence_type ${row.evidence_type}`);
    }
    if (!RETENTION_CLASSES.includes(row.retention_class)) {
      throw new Error(`${id}: ${row.evidence_id} carries retention_class ${row.retention_class}`);
    }
  }
}

// ------------------------------------------------------------------ builder

/**
 * The index as row objects keyed by COLUMNS. Pure of draws: every cell is a
 * frozen file's own byte, a count of them, or one of the two published
 * constructions above.
 * @returns {object[]}
 */
export function buildAuditEvidenceIndex() {
  const controls = buildControlMatrix();
  const tasks = buildCloseChecklist();
  const policyIndex = buildPolicyIndex();
  const roster = financeRoster();

  const reused = reusedRows(controls);
  const rows = [...reused, ...derivedRows(tasks, reused.length)];
  assertPlants(rows, { controls, tasks, policyIndex, roster });
  return rows;
}

// ---------------------------------------------------------------- generate

export function generate() {
  return [{ path: OUTPUT_FILE, content: toCsv(COLUMNS, buildAuditEvidenceIndex()) }];
}

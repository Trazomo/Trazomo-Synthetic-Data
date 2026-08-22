// FIN-23 audit-evidence-index: the wave's tests.
//
// Built by D5a wave D. Every plant is re-derived here from the emitted bytes by
// its own stated rule, and every one of the fourteen columns is rebuilt in this
// file's own code from FIN-18 and FIN-17 rather than imported from the builder.
//
// Two mutations this file has to catch. A FIN-18 or FIN-17 regeneration that
// moves a binder reference or a task status, which leaves the index describing
// a different close. And a regeneration that gives the empty-evidence control a
// binder reference, which would silently delete the plant that teaches an
// index's silence is itself an answer.
//
// Membership, never enumeration: FIN-18's evidence_artifact set holds fourteen
// ids today, and a guard that lists them rather than checking membership is a
// finding (cluster 2 addendum R3).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";
import { financeRoster } from "../../datagen/src/generators/finance-roles.js";
import {
  BINDER_ROOT, COLUMNS, EVIDENCE_TYPES, RETENTION_CLASSES, SUPERSEDED_CITATION,
  TASK_EVIDENCE_ARTIFACT, UNFILED_EVIDENCE,
} from "../../datagen/src/generators/fin-23-audit-evidence-index.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
const OUTPUT_FILE = "audit-evidence-index.csv";

/** A shipped dataset's own committed bytes, read off disk rather than rebuilt. */
const shipped = (name, file) => csvTable(
  readFileSync(join(REPO_ROOT, "datasets", ...name.split("/"), file), "utf8")
).rows;

const controls = () => csvTable(
  fileByPath(generateArtifact(specs.byId.get("FIN-18"), canon), "control-matrix.csv").content
).rows;
const closeTasks = () => csvTable(
  fileByPath(generateArtifact(specs.byId.get("FIN-17"), canon), "close-checklist.csv").content
).rows;
const policyIndex = () => csvTable(
  fileByPath(generateArtifact(specs.byId.get("FIN-20"), canon), "policy-index.csv").content
).rows;

function index() {
  const table = csvTable(fileByPath(generateArtifact(specs.byId.get("FIN-23"), canon), OUTPUT_FILE).content);
  assert.deepEqual(table.cols, specs.byId.get("FIN-23").columns, "FIN-23: header does not match spec.columns");
  return table.rows;
}

// --------------------------------------------------------- green before bytes

test("FIN-23: the generator's column list and the spec agree, and all fourteen columns are named", () => {
  assert.deepEqual(COLUMNS, specs.byId.get("FIN-23").columns);
  assert.equal(COLUMNS.length, 14);
});

test("FIN-23: the 32 rows are derived, and both populations are the size the frozen files make them", () => {
  const reused = controls().filter((r) => r.evidence_reference !== "");
  const complete = closeTasks().filter((r) => r.status === "complete");
  assert.equal(reused.length, 19, "the reused population is FIN-18's non-empty binder references");
  assert.equal(complete.length, 13, "the derived population is FIN-17's complete tasks");
  assert.equal(reused.length + complete.length, 32, "the row count is a join, not a magic number");
  const references = reused.map((r) => r.evidence_reference).sort();
  assert.equal(references[0], "EVB-2026Q1-001");
  assert.equal(references[references.length - 1], "EVB-2026Q1-019");
});

test("FIN-23: the task-to-artifact map covers every complete task exactly once and invents no id", () => {
  const complete = closeTasks().filter((r) => r.status === "complete").map((r) => r.task_id).sort();
  assert.deepEqual(Object.keys(TASK_EVIDENCE_ARTIFACT).sort(), complete, "the map and the complete tasks disagree");
  for (const artifactId of new Set(Object.values(TASK_EVIDENCE_ARTIFACT))) {
    assert.ok(specs.byId.has(artifactId), `${artifactId} is not a spec id`);
  }
  // CORE-05 enters this file only through the superseded citation below, which
  // is a D5 decision: FIN-18's own evidence_artifact set does not contain it.
  const evidenceArtifacts = new Set(controls().map((r) => r.evidence_artifact).filter(Boolean));
  assert.ok(!evidenceArtifacts.has("CORE-05"), "CORE-05 is now in FIN-18, so the citation is no longer a D5 decision");
  assert.ok(!evidenceArtifacts.has("FIN-17"), "FIN-18 now cites the checklist, which changes the derivation");
});

test("FIN-23 V13: the cited document is one the shipped policy index marks Superseded, and there are two such documents", () => {
  const superseded = policyIndex().filter((r) => r.status === "Superseded");
  assert.equal(superseded.length, 2, "the qualifier-free count over the index");
  assert.ok(
    superseded.some((r) => r.document_id === SUPERSEDED_CITATION.source_reference),
    `${SUPERSEDED_CITATION.source_reference} is no longer superseded, so the plant would land on a current document`
  );
});

test("FIN-23 V14 and V16: the title collision and the silent control are both frozen facts, not constructions", () => {
  const reused = controls().filter((r) => r.evidence_reference !== "");
  const complete = closeTasks().filter((r) => r.status === "complete");
  // V14: exactly one identical-title pair in the whole file, and period cannot
  // separate it, because both tasks are March.
  const derivedTitles = complete.map((r) => r.evidence_required);
  const duplicates = derivedTitles.filter((t, i) => derivedTitles.indexOf(t) !== i);
  assert.equal(duplicates.length, 1, "the derived population no longer holds exactly one title collision");
  const pair = complete.filter((r) => r.evidence_required === duplicates[0]);
  assert.equal(pair.length, 2);
  assert.deepEqual([...new Set(reused.map((r) => r.control_name))].length, 19, "the reused titles are all distinct");
  assert.deepEqual(
    [...new Set(reused.map((r) => r.control_name))].filter((t) => derivedTitles.includes(t)),
    [],
    "a title now collides across the two populations, which would make the pair count 2"
  );
  // V16: seven controls carry no binder reference, and exactly one of them
  // passed. It is FIN-18's own shipped missing-evidence plant.
  const silent = controls().filter((r) => r.evidence_reference === "");
  assert.equal(silent.length, 7);
  assert.equal(silent.filter((r) => r.test_result === "pass").length, 1);
  assert.equal(silent.filter((r) => r.test_result === "not_tested").length, 6);
});

// ------------------------------------------------------------ red until built

test("FIN-23 T-Q1: the 19 reused rows reproduce FIN-18's tuple exactly", () => {
  const rows = index();
  assert.equal(rows.length, 32);
  const byControl = new Map(controls().map((r) => [r.control_id, r]));
  const reusedRows = rows.filter((r) => r.supports_control_id !== "");
  assert.equal(reusedRows.length, 19);
  for (const row of reusedRows) {
    const control = byControl.get(row.supports_control_id);
    assert.ok(control, `${row.evidence_id} cites a control that does not exist`);
    assert.equal(row.binder_reference, control.evidence_reference);
    assert.equal(row.source_artifact, control.evidence_artifact);
    assert.equal(row.title, control.control_name);
    assert.equal(row.prepared_date, control.last_tested_date);
    assert.equal(row.prepared_by_employee_id, control.tester_employee_id);
    assert.equal(row.reviewed_by_employee_id, control.owner_employee_id);
    assert.equal(row.evidence_type, "control_test");
    assert.equal(row.retention_class, control.key_control === "true" ? "sox_7yr" : "standard_3yr");
  }
});

test("FIN-23 T-Q2: the 13 derived rows reproduce FIN-17's complete-task set exactly", () => {
  const byTask = new Map(closeTasks().map((r) => [r.task_id, r]));
  const derived = index().filter((r) => r.supports_close_task !== "");
  assert.equal(derived.length, 13);
  for (const row of derived) {
    const task = byTask.get(row.supports_close_task);
    assert.ok(task, `${row.evidence_id} cites a task that does not exist`);
    assert.equal(task.status, "complete", `${row.supports_close_task} is not complete`);
    assert.equal(row.title, task.evidence_required);
    assert.equal(row.prepared_date, task.completed_date);
    assert.equal(row.prepared_by_employee_id, task.owner_employee_id);
    assert.equal(row.reviewed_by_employee_id, task.reviewer_employee_id);
    if (row.supports_close_task === SUPERSEDED_CITATION.task_id) {
      // The one constructed row (V13). Its source_reference is the controlled
      // document it cites, not the task's account_code, which is empty. Every
      // other derived row carries the account_code rule.
      assert.equal(row.source_artifact, SUPERSEDED_CITATION.source_artifact);
      assert.equal(row.source_reference, SUPERSEDED_CITATION.source_reference);
      assert.equal(task.account_code, "", "the constructed row's task now carries an account code of its own");
    } else {
      assert.equal(row.source_reference, task.account_code);
      assert.equal(row.source_artifact, TASK_EVIDENCE_ARTIFACT[row.supports_close_task]);
    }
    assert.equal(row.evidence_type, task.account_code === "" ? "close_task" : "reconciliation");
    assert.equal(row.period, "2026-03");
    assert.ok(EVIDENCE_TYPES.includes(row.evidence_type));
    assert.ok(RETENTION_CLASSES.includes(row.retention_class));
  }
});

test("FIN-23 T-Q6: period is derived from the tested date, and is a real facet with three values", () => {
  const reusedRows = index().filter((r) => r.supports_control_id !== "");
  const byPeriod = {};
  for (const row of reusedRows) byPeriod[row.period] = (byPeriod[row.period] ?? 0) + 1;
  assert.deepEqual(byPeriod, { "2026-01": 2, "2026-02": 4, "2026-03": 13 });
  const byControl = new Map(controls().map((r) => [r.control_id, r]));
  for (const row of reusedRows) {
    assert.equal(row.period, byControl.get(row.supports_control_id).last_tested_date.slice(0, 7));
  }
});

test("FIN-23 V13 and V15: one superseded citation, one row indexed but not filed", () => {
  const rows = index();
  const citingCore05 = rows.filter((r) => r.source_artifact === "CORE-05");
  assert.equal(citingCore05.length, 1, "exactly one row cites the controlled-document library at all");
  const supersededIds = new Set(policyIndex().filter((r) => r.status === "Superseded").map((r) => r.document_id));
  assert.equal(citingCore05.filter((r) => supersededIds.has(r.source_reference)).length, 1);

  const unfiled = rows.filter((r) => r.binder_reference !== "" && r.storage_location === "");
  assert.equal(unfiled.length, 1);
  assert.equal(unfiled[0].supports_close_task, UNFILED_EVIDENCE.task_id);
  assert.equal(rows.filter((r) => r.binder_reference === "").length, 0, "every row carries a binder locator");

  // The qualifier-free contrast: a rule that tests an empty source_reference
  // instead returns 9, and the 9 is decomposed here rather than typed. The plan
  // and the spec both said 13, which is the size of the derived population; the
  // bytes take three rows off it for the tasks that carry an account_code and
  // one more for the constructed citation above.
  const derivedRows = rows.filter((r) => r.supports_close_task !== "");
  const withAccountCode = new Map(
    closeTasks().filter((t) => t.status === "complete" && t.account_code !== "").map((t) => [t.task_id, t.account_code])
  );
  assert.equal(derivedRows.length, 13);
  assert.equal(withAccountCode.size, 3);
  assert.equal(rows.filter((r) => r.source_reference === "").length, 13 - withAccountCode.size - 1);
  assert.equal(rows.filter((r) => r.source_reference === "").length, 9);
  assert.equal(
    rows.filter((r) => r.supports_control_id !== "" && r.source_reference === "").length,
    0,
    "a reused row lost its control id from source_reference"
  );
});

test("FIN-23 T-Q7: the controls with no row are exactly the seven with no binder reference", () => {
  const covered = new Set(index().map((r) => r.supports_control_id).filter(Boolean));
  const silent = controls().filter((r) => !covered.has(r.control_id));
  assert.equal(silent.length, 7, "the set difference is the finding, not a row predicate");
  for (const control of silent) assert.equal(control.evidence_reference, "");
  assert.equal(silent.filter((r) => r.test_result === "pass").length, 1);
});

test("FIN-23 T-Q4: every employee id is an active roster row and preparer is never reviewer", () => {
  const roster = new Map(financeRoster().map((r) => [r.employee_id, r]));
  for (const row of index()) {
    for (const field of ["prepared_by_employee_id", "reviewed_by_employee_id"]) {
      const employee = roster.get(row[field]);
      assert.ok(employee, `${row.evidence_id}: ${row[field]} is not on the roster`);
      assert.equal(employee.employment_status, "active");
    }
    assert.notEqual(row.prepared_by_employee_id, row.reviewed_by_employee_id, `${row.evidence_id} was self-reviewed`);
  }
});

test("FIN-23 T-Q3: every controlled document the index cites resolves in the shipped register", () => {
  const documents = new Map(policyIndex().map((d) => [d.document_id, d]));
  const citations = index().filter((r) => r.source_artifact === "CORE-05");
  assert.equal(citations.length, 1, "the CORE-05 citation count is the plant's own cardinality");
  for (const row of citations) {
    const document = documents.get(row.source_reference);
    assert.ok(document, `${row.evidence_id} cites ${row.source_reference}, which is not in the register`);
    assert.equal(document.status, "Superseded", `${row.evidence_id} no longer lands on a superseded document`);
    assert.notEqual(document.superseded_by, "None", "a superseded document with no successor is a different lesson");
  }
  // Membership, never enumeration (cluster 2 addendum R3): every source_artifact
  // is a spec id, checked by lookup rather than against a list this test holds.
  for (const row of index()) {
    assert.ok(specs.byId.has(row.source_artifact), `${row.evidence_id} cites ${row.source_artifact}, not a spec id`);
  }
});

test("FIN-23: storage_location and retention_class follow the two published rules", () => {
  const byControl = new Map(controls().map((r) => [r.control_id, r]));
  const byTask = new Map(closeTasks().map((r) => [r.task_id, r]));
  let sox = 0;
  for (const row of index()) {
    if (row.supports_control_id !== "") {
      const control = byControl.get(row.supports_control_id);
      assert.equal(row.storage_location, `${BINDER_ROOT}/${control.process}/`);
      assert.equal(row.retention_class, control.key_control === "true" ? "sox_7yr" : "standard_3yr");
    } else if (row.supports_close_task === UNFILED_EVIDENCE.task_id) {
      assert.equal(row.storage_location, "", "the one indexed and unfiled row was filed");
      assert.equal(row.retention_class, "standard_3yr");
    } else {
      const task = byTask.get(row.supports_close_task);
      assert.equal(row.storage_location, `${BINDER_ROOT}/close/${task.category}/`);
      assert.equal(row.retention_class, "standard_3yr");
    }
    if (row.retention_class === "sox_7yr") sox += 1;
  }
  // The seven-year class is FIN-18's own key_control flag and nothing else.
  assert.equal(sox, controls().filter((c) => c.evidence_reference !== "" && c.key_control === "true").length);
  assert.equal(sox, 8);
});

test("FIN-23: the two id series run without a gap, and the derived one continues FIN-18's past its maximum", () => {
  const rows = index();
  const bound = controls().filter((c) => c.evidence_reference !== "");
  const pad = (n) => String(n).padStart(3, "0");
  rows.forEach((row, i) => assert.equal(row.evidence_id, `EV-2026Q1-${pad(i + 1)}`, `row ${i + 1} breaks the id series`));
  const binderMax = bound.map((c) => c.evidence_reference).sort().at(-1);
  assert.equal(binderMax, "EVB-2026Q1-019");
  for (const row of rows.filter((r) => r.supports_close_task !== "")) {
    assert.ok(row.binder_reference > binderMax, `${row.evidence_id} reuses a locator FIN-18 already issued`);
  }
  assert.equal(new Set(rows.map((r) => r.binder_reference)).size, 32);
  // Every row belongs to exactly one population: a control or a close task, never both and never neither.
  for (const row of rows) {
    assert.notEqual(
      row.supports_control_id === "", row.supports_close_task === "",
      `${row.evidence_id} supports both a control and a task, or neither`
    );
  }
});

test("FIN-23 T-Q6 and V14: the one title collision is a pair the period column cannot separate", () => {
  const rows = index();
  const titles = rows.map((r) => r.title);
  const collisions = [...new Set(titles.filter((t, i) => titles.indexOf(t) !== i))];
  assert.equal(collisions.length, 1, `titles appearing more than once: ${collisions.join(", ")}`);
  const pair = rows.filter((r) => r.title === collisions[0]);
  assert.equal(pair.length, 2);
  assert.deepEqual([...new Set(pair.map((r) => r.period))], ["2026-03"], "period now separates the pair");
  // The facet that does separate them, which is what a retrieval has to reach for.
  assert.equal(new Set(pair.map((r) => r.supports_close_task)).size, 2);
  // Both cardinalities: period is a real facet across the file (three values),
  // and it is exactly the facet that fails here.
  assert.equal(new Set(rows.map((r) => r.period)).size, 3);
});

test("FIN-23: the committed bytes are the generated bytes, row for row", () => {
  // The byte guard `validate` runs, restated as a test so a hand edit to the
  // committed index fails the suite naming the evidence_id it landed on.
  const generated = index();
  const committed = shipped("finance/audit-evidence-index", OUTPUT_FILE);
  assert.equal(committed.length, generated.length);
  for (const [i, row] of generated.entries()) {
    assert.deepEqual(committed[i], row, `audit-evidence-index.csv row ${row.evidence_id} was edited by hand`);
  }
});

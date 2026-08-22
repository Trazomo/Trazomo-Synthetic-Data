// FIN-21 close-runbook, FIN-28 prior-period-footnotes and FIN-30
// prior-board-deck-outline: the structural screen over the three drafted
// documents of the cluster 3 and 4 slice.
//
// Shipped as a skeleton by D5a foundations: every test below the divider was
// marked todo while the three documents did not exist. D5b authored them and
// deleted the markers in the same commit as the prose, which is the invariant
// the second test below enforces in both directions.
//
// These three are the only freeze-gate items in the slice, which is the reason
// each is kept minimal: FIN-30 is an outline with no figures, FIN-21 is a
// procedure with no figures, and FIN-28's every figure ties to FIN-33. A
// drafted artifact is where a new person or company name slips into the
// universe unnoticed, because no generator is there to refuse it, so the screen
// below is what stands in for one.
//
// Read the documents lazily, inside each test. Reading at module load would
// turn "not authored yet" into a file-level error rather than a todo.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { buildCloseChecklistTemplate } from "../../datagen/src/generators/fin-36-close-checklist-template.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));

const DRAFTED_IDS = ["FIN-21", "FIN-28", "FIN-30"];

function document(id) {
  const spec = specs.byId.get(id);
  const path = join(REPO_ROOT, "artifacts", id, `${spec.name}.md`);
  assert.ok(existsSync(path), `${id} is not authored yet: ${path} does not exist`);
  return readFileSync(path, "utf8");
}

/** Every .md under a directory, recursively. An absent directory yields none. */
function markdownUnder(dir) {
  if (!existsSync(dir)) return [];
  const found = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) found.push(...markdownUnder(path));
    else if (entry.endsWith(".md")) found.push(path);
  }
  return found.sort();
}

/** The two D5 screen files whose todo markers gate the three documents. */
const SCREEN_FILES = [
  join(REPO_ROOT, "tests", "drafted", "fin-d5-drafted-screen.test.js"),
  join(REPO_ROOT, "tests", "artifacts", "fin-28-footnotes.test.js"),
];

/** Anything that parses as a money amount: 1,234.56 / $1,234 / 1234.56. */
const MONEY = /\$?\d{1,3}(,\d{3})+(\.\d{2})?|\$\s?\d+(\.\d{2})?|\b\d+\.\d{2}\b/g;

// --------------------------------------------------------- green before bytes

test("the D5 freeze gate is exactly three drafted documents, each with a spec that says so", () => {
  const drafted = [...specs.byId.values()]
    .filter((s) => s.generation === "drafted-frozen" && /^FIN-(2[1-9]|3[0-4])$/.test(s.id))
    .map((s) => s.id);
  assert.deepEqual(drafted.sort(), DRAFTED_IDS);
  for (const id of DRAFTED_IDS) {
    const spec = specs.byId.get(id);
    assert.equal(spec.format, "markdown");
    assert.equal(spec.columns, undefined);
    assert.ok(spec.planted_features.length > 0, `${id} states no planted features for validate to check`);
  }
});

test("the todo markers and the drafted documents cannot both be on disk", () => {
  // D5b authors the prose and deletes the markers in the same commit. This is
  // what makes "in the same commit" enforceable rather than a convention: while
  // a todo marker survives in either D5 screen, none of the three documents may
  // exist, so prose that lands without un-todoing the screens fails the suite
  // instead of shipping unscreened. Once the markers are gone the guard
  // inverts and all three documents have to be there.
  const pattern = /\{\s*todo:\s*WAVE\s*\}/g;
  const markers = SCREEN_FILES.reduce(
    (count, path) => count + (readFileSync(path, "utf8").match(pattern) ?? []).length, 0
  );
  const authored = DRAFTED_IDS.flatMap((id) => markdownUnder(join(REPO_ROOT, "artifacts", id)));
  if (markers > 0) {
    assert.deepEqual(
      authored, [],
      `${markers} todo markers remain, so the screens would skip: ${authored.join(", ")}`
    );
    return;
  }
  assert.equal(
    authored.length, DRAFTED_IDS.length,
    `the markers are gone, so all three documents must be on disk: ${authored.join(", ")}`
  );
});

// ------------------------------------------------------- the three documents

test("FIN-21 T-Q5: the runbook's task list is the FIN-36 template's, task for task", () => {
  const text = document("FIN-21");
  const template = buildCloseChecklistTemplate();
  assert.equal(template.length, 24);
  for (const task of template) {
    assert.ok(text.includes(task.task_id), `the runbook does not carry ${task.task_id}`);
  }
  // TODO(D5b): assert the runbook names no task_id the template does not carry,
  // and that each task's owner role, reviewer role and dependency match the
  // template rather than being retyped.
});

test("FIN-21 T-Q5: the runbook carries no money amount, and states the close-day rule verbatim", () => {
  const text = document("FIN-21");
  assert.deepEqual(text.match(MONEY) ?? [], [], "the runbook states a figure, which widens the freeze review");
  for (const date of ["2026-04-01", "2026-04-06", "2026-04-07"]) {
    assert.ok(text.includes(date), `the close-day rule does not name ${date}`);
  }
  assert.ok(text.includes("ADI-FIN-003"), "the document-control block carries no document_id");
});

test("FIN-30 T-R5: the outline carries no money amount and no percentage", () => {
  const text = document("FIN-30");
  assert.deepEqual(text.match(MONEY) ?? [], [], "the outline states a figure; every figure belongs in FIN-29");
  assert.deepEqual(text.match(/\d+(\.\d+)?\s?%/g) ?? [], [], "the outline states a percentage");
});

test("T-U2 and T-R5: no person name in any of the three, roles by title only", () => {
  const roster = csvTable(
    fileByPath(generateArtifact(specs.byId.get("CORE-04"), canon), "people-roster.csv").content
  ).rows;
  const people = roster.map((r) => `${r.first_name} ${r.last_name}`);
  for (const id of DRAFTED_IDS) {
    const text = document(id);
    for (const name of people) {
      assert.ok(!text.includes(name), `${id} names ${name}`);
    }
  }
  // TODO(D5b): extend to the FIN-40 screen's shape, which is stronger than a
  // roster scan: every capitalized phrase has to be the canon protagonist, an
  // active role title, or listed document furniture. A name that is not on the
  // roster is exactly the one a screen keyed on the roster cannot see.
});

test("T-U3: none of the three carries an em dash", () => {
  for (const id of DRAFTED_IDS) {
    assert.ok(!document(id).includes("\u2014"), `${id} carries an em dash`);
  }
});

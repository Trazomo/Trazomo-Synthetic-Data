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
// turn "not authored yet" into a file-level error rather than a failing test,
// which is what let this file ship before the documents did.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { buildCloseChecklistTemplate } from "../../datagen/src/generators/fin-36-close-checklist-template.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";
import { allowedFrom, unscreenedPhrases, unscreenedWords } from "../helpers/capitalized-screen.js";

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

const PROTAGONIST = "Atticus Dundee Inc.";

/** The CORE-04 roster, generated rather than read off disk, as the tests do. */
const roster = () => csvTable(
  fileByPath(generateArtifact(specs.byId.get("CORE-04"), canon), "people-roster.csv").content
).rows;

/** Every role title an active CORE-04 employee holds. */
const activeRoleTitles = () => [...new Set(
  roster().filter((r) => r.employment_status === "active").map((r) => r.role_title)
)];

/**
 * Every FIN-22 account name, off the generated chart of accounts. FIN-28 names
 * the accounts its footnotes report, and an account name is capitalized
 * ("Accrued Commissions", "Salaries and Wages"). Deriving them is what keeps
 * the furniture list below from swallowing half a chart of accounts, and it
 * means an account rename moves the screen with it.
 */
const accountNames = () => csvTable(
  fileByPath(generateArtifact(specs.byId.get("FIN-22"), canon), "chart-of-accounts.csv").content
).rows.map((r) => r.account_name);

// Document furniture: the one place a typed list is allowed, because nothing in
// the pack ships these strings. Each entry is here because a document has to
// say it, and none of them is a name. Phrases appear in the form the screen
// reports, which is with a sentence-opening word already dropped.
const FURNITURE_PHRASES = [
  "Close Runbook",     // FIN-21's own title, "Month-End Close Runbook"
  "Review Due",        // the CORE-05 control-block field "Next Review Due"
  "Deck Outline",      // FIN-30's own title, "Board Deck Outline"
  "Quarterly Review",  // FIN-30's subject, the Q4 2025 quarterly review
];
const FURNITURE_WORDS = [
  // The three document titles.
  "Close", "Runbook", "Disclosure", "Footnotes", "Period", "Ended",
  "Board", "Deck", "Outline", "Quarterly", "Review",
  // The CORE-05 document-control block's field labels, which FIN-21 carries in
  // the CORE-05 shape so the policy register can index it the same way.
  "Document", "Control", "Field", "Value", "ID", "Version", "Status", "Owner",
  "Approver", "Effective", "Date", "Last", "Reviewed", "Next", "Due",
  "Supersedes", "Superseded", "By", "None", "Active",
  // Calendar and close-day vocabulary. "D" is the close-day prefix (D+1 to
  // D+5) and "Q" the quarter prefix; the weekday names are in the close-day
  // rule as datagen/README.md states it, and the month is FIN-28's period.
  "D", "Q", "Monday", "Sunday", "February",
  // The entity by its shorthand, the way a policy or a footnote refers to it.
  "Company", "Company's",
  // The board as a body. "Board of Directors" is not a CORE-04 role title, so
  // no active employee holds it and the roster cannot supply it.
  "Directors",
];

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

/**
 * The runbook's task rows, read back out of its own per-close-day tables:
 * `| CLS-01 | task | owner role | reviewer role | depends on | evidence |`.
 * Parsing the shipped document rather than trusting it is the whole point; a
 * row the parser cannot see is a row the comparison below reports as missing.
 */
function runbookTasks(text) {
  return text
    .split("\n")
    .filter((line) => /^\|\s*CLS-\d/.test(line))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .map(([task_id, task, owner_role, reviewer_role, depends_on, evidence_required]) => ({
      task_id, task, owner_role, reviewer_role, depends_on, evidence_required,
    }));
}

test("FIN-21 T-Q5: the runbook's task list is the FIN-36 template's, task for task", () => {
  const text = document("FIN-21");
  const template = buildCloseChecklistTemplate();
  assert.equal(template.length, 24);
  const rows = runbookTasks(text);
  assert.equal(rows.length, template.length, "the runbook does not carry one row per template task");
  // Every expected value below comes off the template at test time. Nothing in
  // this file types a task id, a role or a dependency, so a template change
  // moves both sides at once and only a retyped runbook can fail.
  for (const [i, task] of template.entries()) {
    const row = rows[i];
    assert.equal(row.task_id, task.task_id, `runbook row ${i + 1} is ${row.task_id}, the template has ${task.task_id}`);
    assert.equal(row.task, task.task, `${task.task_id}: task text differs from the template`);
    assert.equal(row.owner_role, task.owner_role, `${task.task_id}: owner role differs from the template`);
    assert.equal(row.reviewer_role, task.reviewer_role, `${task.task_id}: reviewer role differs from the template`);
    // The template ships an empty dependency; the runbook renders that as
    // "none" so a reader never has to decide whether a cell was dropped.
    assert.equal(row.depends_on, task.depends_on || "none", `${task.task_id}: dependency differs from the template`);
    assert.equal(row.evidence_required, task.evidence_required, `${task.task_id}: evidence expectation differs from the template`);
  }
  // The other direction: a task id the template does not carry, anywhere in the
  // prose and not only in the tables.
  const known = new Set(template.map((t) => t.task_id));
  for (const id of new Set(text.match(/\bCLS-\d+\b/g) ?? [])) {
    assert.ok(known.has(id), `the runbook names ${id}, which the template does not carry`);
  }
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
  const people = roster().map((r) => `${r.first_name} ${r.last_name}`);
  for (const id of DRAFTED_IDS) {
    const text = document(id);
    for (const name of people) {
      assert.ok(!text.includes(name), `${id} names ${name}`);
    }
  }
});

test("T-U2 and T-R5: every capitalized phrase is accounted for, the FIN-40 screen's shape", () => {
  // Stronger than the roster scan above, and for the reason the roster scan is
  // not enough: a name that is not on the roster is exactly the one a screen
  // keyed on the roster cannot see. Everything on the allowed side except the
  // furniture below is read out of canon or out of generated bytes.
  const allowed = allowedFrom({
    derived: [PROTAGONIST, ...activeRoleTitles(), ...accountNames()],
    furniturePhrases: FURNITURE_PHRASES,
    furnitureWords: FURNITURE_WORDS,
  });
  for (const id of DRAFTED_IDS) {
    const text = document(id);
    assert.deepEqual(unscreenedPhrases(text, allowed), [], `unscreened capitalized phrase(s) in ${id}`);
    assert.deepEqual(unscreenedWords(text, allowed), [], `unscreened capitalized word(s) in ${id}`);
  }
});

test("T-U2: no canon company other than the protagonist is named", () => {
  for (const id of DRAFTED_IDS) {
    const text = document(id);
    for (const company of canon.values()) {
      if (company.name === PROTAGONIST) continue;
      assert.ok(!text.includes(company.name), `${id} names canon company "${company.name}"`);
    }
  }
});

test("T-U3: none of the three carries an em dash", () => {
  for (const id of DRAFTED_IDS) {
    assert.ok(!document(id).includes("\u2014"), `${id} carries an em dash`);
  }
});

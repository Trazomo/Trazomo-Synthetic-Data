// SMB-08, SMB-10 and SMB-11: the three deterministic artifacts of the
// agreements and onboarding wave, screened from their emitted bytes.
//
//   datasets/smb/client-next-steps-checklist/  the conversion run sheet
//   datasets/smb/intake-questionnaire/         the intake that came back
//   datasets/smb/kickoff-checklist/            the kickoff run sheet
//
// Every check recomputes its answer from the shipped bytes the way a consumer
// would. Nothing here imports a builder's predicate, a builder's census
// constant or a builder's vocabulary list: the two vocabulary rules P3 turns on
// are written again in this file, with a different implementation (a word set
// intersected against the text rather than one regular expression per term), so
// the generator and its screen can genuinely disagree. A test that imported the
// list it screens against would pass on the day somebody deleted a term from
// it, which is the one failure this file exists to prevent.
//
// The mutation this file exists to catch, stated in the data plan's own words:
// a nineteenth question added without a census update, so the seven free-text
// answers become eight and P3's qualifier-free count moves silently.
//
// Three mechanical rules are stated once here and used throughout.
//
//   The census rule. Every count the data plan pins is asserted as a number,
//   not as a floor. `>= 4` passes on a file with forty rows and is not a
//   census, so every assertion below is an equality.
//
//   The plant rule (P3, T-D4). Exactly one free-text answer carries information
//   outside the scope of its own question, and both cardinalities are asserted:
//   1 under the rule, 7 with the scope qualifier dropped, which is every
//   free-text answer. The scope rule is mechanical rather than editorial: no
//   question in the form asks about health, mobility or care, so an answer that
//   carries that vocabulary answers a question nobody asked. Both halves are
//   checked, the questions as well as the answers, because a rule that only
//   read the answers would go quiet the day somebody added the question.
//
//   The absence rule (T-D6). Person names are canon's own seated, retired and
//   frozen names, parsed out of canon/people.md and screened as exact
//   substrings across every cell. No name is retyped into this file, so a name
//   added to canon tomorrow is screened tonight.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
const PEOPLE_PATH = join(REPO_ROOT, "canon", "people.md");

const emitted = (id) => generateArtifact(specs.byId.get(id), canon);

const nextSteps = csvTable(
  fileByPath(emitted("SMB-08"), "client-next-steps-checklist.csv").content
);
const intake = csvTable(fileByPath(emitted("SMB-10"), "intake-questionnaire.csv").content);
const kickoff = csvTable(fileByPath(emitted("SMB-11"), "kickoff-checklist.csv").content);

/** The SMB-02 record_owner_role vocabulary, read off the shipped field dictionary. */
const ownerRoles = (() => {
  const dictionary = csvTable(
    fileByPath(emitted("SMB-02"), "client-record-fields.csv").content
  );
  const field = dictionary.rows.find((r) => r.field_name === "record_owner_role");
  assert.ok(field, "SMB-02 no longer declares record_owner_role");
  return field.allowed_values.split("|");
})();

/** The eleven cluster 2 artifact ids, which is the set an SMB-08 step may produce into. */
const C2_IDS = [
  "SMB-06", "SMB-07", "SMB-08", "SMB-09", "SMB-10", "SMB-11",
  "SMB-12", "SMB-13", "SMB-14", "SMB-15", "SMB-16",
];

/** How many rows satisfy `predicate`. */
const count = (rows, predicate) => rows.filter(predicate).length;

/** Every value of `column`, in file order. */
const column = (table, name) => table.rows.map((r) => r[name]);

// -------------------------------------------------------------- the deny list

/**
 * Every name canon seats or records: the `Name`, `Retired name` and `Frozen
 * name` columns of canon/people.md. Rule R-ROLE: no cell of this cluster may
 * carry one. Parsed rather than retyped, so a name canon adds tomorrow is
 * screened tonight.
 */
function canonPeople() {
  const NAME_HEADS = ["name", "retired name", "frozen name"];
  const isTableLine = (line) => line.trim().startsWith("|");
  const cells = (line) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  const isRule = (row) => row.every((c) => /^:?-{2,}:?$/.test(c));

  const lines = readFileSync(PEOPLE_PATH, "utf8").split("\n");
  const names = new Set();
  for (const [i, line] of lines.entries()) {
    if (!isTableLine(line)) continue;
    const head = cells(line);
    const at = head.findIndex((c) => NAME_HEADS.includes(c.toLowerCase()));
    if (at < 0) continue;
    for (let j = i + 1; j < lines.length; j += 1) {
      if (!isTableLine(lines[j])) break;
      const rowCells = cells(lines[j]);
      if (isRule(rowCells)) continue;
      const value = (rowCells[at] ?? "").replace(/\*\*/g, "").trim();
      if (/^[A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*)+/.test(value)) names.add(value);
    }
  }
  return names;
}

// ------------------------------------------------------- the two vocabularies
// Restated here rather than imported. The generator holds its own copies and
// matches them its own way; these are this screen's, and the point of the
// duplication is that the two can disagree.

/**
 * Health, mobility and care words. The form asks about none of it, which is
 * what makes an answer carrying it an answer to a question nobody asked.
 */
const OUT_OF_SCOPE_WORDS = [
  "health", "medical", "medication", "mobility", "walker", "wheelchair",
  "disability", "disabled", "carer", "hospital", "illness",
];
const OUT_OF_SCOPE_PHRASES = ["walking frame", "care worker"];

/**
 * Household relationships. A human appears in this pack as a relationship or a
 * role and never as a name, so this is how "the answer mentions another member
 * of the household" is counted with nobody's name in the file to count.
 */
const RELATIONSHIP_WORDS = [
  "mother", "father", "partner", "husband", "wife", "spouse", "son", "daughter",
  "child", "children", "parent", "grandmother", "grandfather", "roommate", "housemate",
];

/** The words of `text`, lowercased, punctuation dropped. A set, so lookup is exact. */
const wordsOf = (text) => new Set(text.toLowerCase().split(/[^a-z]+/).filter(Boolean));

/** Does `text` use any of these words, or contain any of these phrases? */
function usesAny(text, words, phrases = []) {
  const seen = wordsOf(text);
  if (words.some((w) => seen.has(w))) return true;
  const low = text.toLowerCase();
  return phrases.some((p) => low.includes(p));
}

// --------------------------------------------------------------------- shared

/**
 * The three shape checks every one of these files owes: the header is the
 * spec's column list, the id column is unique and runs its prefix from 01 in
 * file order, and the sequence column is 1 upward with no gap and no
 * reordering. T-D1 for SMB-10, and the same shape asserted for SMB-08 and
 * SMB-11 because a run sheet whose file order is not its sequence is a
 * different document from the one the census describes.
 */
function assertShape(specId, table, idColumn, prefix) {
  assert.deepEqual(table.cols, specs.byId.get(specId).columns, `${specId}: the header is not spec.columns`);
  const ids = column(table, idColumn);
  assert.equal(new Set(ids).size, ids.length, `${specId}: an id repeats`);
  assert.deepEqual(
    ids,
    ids.map((_, i) => `${prefix}${String(i + 1).padStart(2, "0")}`),
    `${specId}: the ids are not ${prefix}01 upward in file order`
  );
  assert.deepEqual(
    column(table, "sequence"),
    ids.map((_, i) => String(i + 1)),
    `${specId}: sequence is not 1 upward with no gap, in file order`
  );
}

// --------------------------------------------------------------------- SMB-08

test("SMB-08: the header is the spec's, and the twelve steps run NSC-LDB-01 upward in sequence order", () => {
  assertShape("SMB-08", nextSteps, "step_id", "NSC-LDB-");
  assert.equal(nextSteps.rows.length, 12);
});

test("SMB-08: the full census of data plan 2.3, every count an equality", () => {
  const rows = nextSteps.rows;
  assert.equal(rows.length, 12, "rows");
  assert.equal(count(rows, (r) => r.status === ""), 12, "status is not empty on every row");
  assert.equal(count(rows, (r) => r.owner_role === "owner"), 5, "owner");
  assert.equal(count(rows, (r) => r.owner_role === "project lead"), 7, "project lead");
  assert.equal(count(rows, (r) => r.due_basis === "proposal_approved"), 4, "proposal_approved");
  assert.equal(count(rows, (r) => r.due_basis === "contract_signed"), 8, "contract_signed");
  assert.equal(count(rows, (r) => r.output_artifact !== ""), 4, "steps producing an artifact");
  assert.equal(count(rows, (r) => r.evidence_required === "yes"), 6, "evidence required");
  assert.equal(count(rows, (r) => r.evidence_required === "no"), 6, "evidence not required");

  // The two vocabularies, and the one numeric column.
  for (const r of rows) {
    assert.ok(ownerRoles.includes(r.owner_role), `${r.step_id} owner_role "${r.owner_role}" is not SMB-02 vocabulary`);
    assert.ok(["proposal_approved", "contract_signed"].includes(r.due_basis), `${r.step_id} due_basis`);
    assert.match(r.due_offset_days, /^(0|[1-9]\d*)$/, `${r.step_id} due_offset_days is not a calendar-day integer`);
    assert.notEqual(r.step.trim(), "", `${r.step_id} states no step`);
    assert.notEqual(r.trigger.trim(), "", `${r.step_id} names no trigger`);
  }
});

test("SMB-08: the four output_artifact citations each resolve in the spec catalog and each is a cluster 2 id", () => {
  const cited = column(nextSteps, "output_artifact").filter((v) => v !== "");
  assert.equal(cited.length, 4);
  assert.equal(new Set(cited).size, 4, "an artifact is cited twice, so the checklist does not cover the conversion");
  for (const id of cited) {
    assert.ok(specs.byId.get(id), `${id} is cited by SMB-08 and is not in specs/artifact-specs.yaml`);
    assert.ok(C2_IDS.includes(id), `${id} is cited by SMB-08 and is not a cluster 2 artifact`);
  }
  assert.deepEqual([...cited].sort(), ["SMB-07", "SMB-09", "SMB-10", "SMB-11"]);
});

// --------------------------------------------------------------------- SMB-10

test("SMB-10: the header is the spec's, and the eighteen questions run IQQ-LDB-01 upward in sequence order (T-D1)", () => {
  assertShape("SMB-10", intake, "question_id", "IQQ-LDB-");
  assert.equal(intake.rows.length, 18);
});

test("SMB-10: the full census of data plan 2.5 (T-D2)", () => {
  const rows = intake.rows;
  assert.equal(rows.length, 18, "rows");
  assert.equal(count(rows, (r) => r.answer_type === "free_text"), 7, "free_text");
  assert.equal(count(rows, (r) => r.answer_type === "single_select"), 7, "single_select");
  assert.equal(count(rows, (r) => r.answer_type === "date"), 2, "date");
  assert.equal(count(rows, (r) => r.answer_type === "number"), 2, "number");
  assert.equal(count(rows, (r) => r.required === "yes"), 13, "required yes");
  assert.equal(count(rows, (r) => r.required === "no"), 5, "required no");
  assert.equal(count(rows, (r) => r.answer_text === ""), 0, "the household answered every question");

  // Four sections, each carrying between four and five questions.
  const bySection = new Map();
  for (const r of rows) bySection.set(r.section, (bySection.get(r.section) ?? 0) + 1);
  assert.equal(bySection.size, 4, "the form no longer has four sections");
  assert.deepEqual(
    [...bySection.keys()].sort(),
    ["household_and_access", "schedule_and_communication", "scope_and_selections", "site_conditions"]
  );
  for (const [section, held] of bySection) {
    assert.ok(held >= 4 && held <= 5, `section ${section} holds ${held} questions, outside the four-to-five band`);
  }
  assert.equal([...bySection.values()].reduce((a, b) => a + b, 0), 18);

  // The two typed answers are typed, and the numbers are counts rather than money.
  for (const r of rows) {
    if (r.answer_type === "date") assert.match(r.answer_text, /^\d{4}-\d{2}-\d{2}$/, `${r.question_id} date`);
    if (r.answer_type === "number") assert.match(r.answer_text, /^(0|[1-9]\d*)$/, `${r.question_id} number`);
    assert.doesNotMatch(
      `${r.question_text} ${r.answer_text}`, /[$£€]|\d+\.\d{2}/,
      `${r.question_id} states a money figure, and this file mints none`
    );
  }
});

test("SMB-10: client_canon_id is co-131 on all eighteen rows and resolves in canon/companies.md (T-D3)", () => {
  const ids = column(intake, "client_canon_id");
  assert.deepEqual([...new Set(ids)], ["co-131"]);
  assert.equal(ids.length, 18);
  const seated = canon.get("co-131");
  assert.ok(seated, "canon/companies.md does not seat co-131");
  assert.match(seated.name, /Okafor/, "co-131 is no longer the Okafor household");
});

test("SMB-10: exactly one answer carries information outside its question's scope, and it is IQQ-LDB-06 (P3, T-D4)", () => {
  // Half one: no question asks about health, mobility or care. Without this the
  // rule below would go quiet the day the form grew a question that did.
  const asked = intake.rows.filter((r) => usesAny(r.question_text, OUT_OF_SCOPE_WORDS, OUT_OF_SCOPE_PHRASES));
  assert.deepEqual(
    asked.map((r) => r.question_id), [],
    "a question now asks about health, mobility or care, so the volunteered answer is in scope"
  );

  // Half two: exactly one answer carries it, and it is the pinned row.
  const outOfScope = intake.rows.filter((r) => usesAny(r.answer_text, OUT_OF_SCOPE_WORDS, OUT_OF_SCOPE_PHRASES));
  assert.equal(outOfScope.length, 1, "the count of answers outside their question's scope");
  assert.equal(outOfScope[0].question_id, "IQQ-LDB-06");
  assert.equal(outOfScope[0].section, "household_and_access");
  assert.equal(outOfScope[0].answer_type, "free_text");
  assert.equal(outOfScope[0].required, "yes");

  // The pinned bytes, re-read from the emitted CSV and held against the plan's
  // exact strings. A reworded plant fails here rather than drifting.
  assert.equal(
    outOfScope[0].question_text,
    "Are there days or hours when the crew should not be on site?"
  );
  assert.equal(
    outOfScope[0].answer_text,
    "Weekdays after eight in the morning are fine and we would rather nobody worked Sundays. "
    + "One thing you should know, my mother lives with us and uses a walker, so the hallway has "
    + "to stay clear and the front step cannot be blocked at any point in the day."
  );
});

test("SMB-10: the qualifier-free count is seven, which is the population the plant hides inside (P3)", () => {
  // The second cardinality, stated separately from the plant: drop the scope
  // qualifier and the rule returns every free-text answer. A reader who reviews
  // all seven has to judge six of them in scope.
  const freeText = intake.rows.filter((r) => r.answer_type === "free_text");
  assert.equal(freeText.length, 7);
  assert.ok(
    freeText.some((r) => r.question_id === "IQQ-LDB-06"),
    "the plant is not inside the population it is supposed to hide in"
  );
});

test("SMB-10: exactly two answers mention a household member other than the signing contact (T-D5)", () => {
  const mentioning = intake.rows.filter((r) => usesAny(r.answer_text, RELATIONSHIP_WORDS));
  assert.deepEqual(
    mentioning.map((r) => r.question_id), ["IQQ-LDB-06", "IQQ-LDB-12"],
    "the two answers mentioning a household member are not the two the data plan counts"
  );
  // Only one of the two is sensitive, which is the whole point of the count: a
  // rule keyed on personhood rather than on scope over-flags by exactly one.
  const partner = mentioning.find((r) => r.question_id === "IQQ-LDB-12");
  assert.ok(
    partner.answer_text.includes(
      "my partner handles the finish selections, so send the selection sheet to both of us"
    ),
    "IQQ-LDB-12 no longer carries the finish-selections phrase"
  );
  assert.ok(
    !usesAny(partner.answer_text, OUT_OF_SCOPE_WORDS, OUT_OF_SCOPE_PHRASES),
    "the second mention has become sensitive too, so the over-flag by one is gone"
  );
});

test("SMB-10: no cell of any of the eighteen rows carries a name canon seats (T-D6, rule R-ROLE)", () => {
  const names = canonPeople();
  assert.ok(names.size > 0, "canon/people.md parsed to no names, so this screen would pass on anything");
  for (const row of intake.rows) {
    const text = Object.values(row).join(" ");
    for (const name of names) {
      assert.ok(!text.includes(name), `${row.question_id} carries the canon person name "${name}"`);
    }
  }
});

// --------------------------------------------------------------------- SMB-11

test("SMB-11: the header is the spec's, and the fourteen items run KCK-LDB-01 upward in sequence order", () => {
  assertShape("SMB-11", kickoff, "item_id", "KCK-LDB-");
  assert.equal(kickoff.rows.length, 14);
});

test("SMB-11: the full census of data plan 2.6, including the four MST-LDB-01 citations", () => {
  const rows = kickoff.rows;
  assert.equal(rows.length, 14, "rows");
  assert.equal(count(rows, (r) => r.status === ""), 14, "status is not empty on every row");
  assert.equal(count(rows, (r) => r.phase === "before_kickoff"), 5, "before_kickoff");
  assert.equal(count(rows, (r) => r.phase === "at_kickoff"), 5, "at_kickoff");
  assert.equal(count(rows, (r) => r.phase === "after_kickoff"), 4, "after_kickoff");
  assert.equal(count(rows, (r) => r.evidence_required === "yes"), 8, "evidence required");
  assert.equal(count(rows, (r) => r.evidence_required === "no"), 6, "evidence not required");

  const citing = rows.filter((r) => r.related_milestone_id !== "");
  assert.equal(citing.length, 4, "the milestone citation count");
  assert.deepEqual([...new Set(citing.map((r) => r.related_milestone_id))], ["MST-LDB-01"]);
  // Every citation is an at-kickoff row, and one at-kickoff row cites nothing:
  // the phase count is five and the citation count is four on purpose.
  assert.deepEqual([...new Set(citing.map((r) => r.phase))], ["at_kickoff"]);
  assert.equal(count(rows, (r) => r.phase === "at_kickoff" && r.related_milestone_id === ""), 1);

  for (const r of rows) {
    assert.ok(ownerRoles.includes(r.owner_role), `${r.item_id} owner_role "${r.owner_role}" is not SMB-02 vocabulary`);
    assert.ok(["before_kickoff", "at_kickoff", "after_kickoff"].includes(r.phase), `${r.item_id} phase`);
    assert.notEqual(r.item.trim(), "", `${r.item_id} states no item`);
  }
  for (const role of ownerRoles) {
    assert.ok(count(rows, (r) => r.owner_role === role) > 0, `no item is owned by the ${role} role`);
  }
});

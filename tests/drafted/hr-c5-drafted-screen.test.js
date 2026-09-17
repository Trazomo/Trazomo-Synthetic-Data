// HR-10 rehearsal-scenario-briefs: the structural screen over the one drafted
// artifact set of people-hr cluster 5.
//
// tests/drafted/hr-c1-drafted-screen.test.js is the house style and every habit
// of it is kept here: documents are read lazily inside each test, the CORE-04
// roster is generated in-test rather than read off disk, the closed lists live
// in the spec entries and are parsed out of them in this file's own code, and
// every allowed capitalized string except a two-entry furniture list is derived
// from canon, from the generated roster, or from the pack's own scenario table.
//
// One thing is new. HR-10's six personas are invented names, so they cannot
// pass the real-name screen the way a roster row does. They are declared here
// as furniture read out of the artifact's own scenario index, and the collision
// sweep of HR-C5-T14 then proves separately that each (first_name, last_name)
// pair lands on nothing the pack already carries: no roster row, no canon table
// row including the renamed and reserved lists, no candidate in the frozen
// application log, no interviewer in the frozen corpus, and not the contractor
// the litigation matter names. A screen that derived the names from the table
// and stopped there would accept any name at all.
//
// What this file deliberately does NOT know: which brief is the boundary probe.
// Every assertion is a shape or a cardinality recomputed at run time from the
// emitted bytes, and the probe is found by reading the declared field rather
// than by being told. The declared field is honest metadata about a legitimate
// scenario, not a label on a defect (canon/companies.md ground rules), which is
// why counting it here is a census rather than an answer key.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";
import { allowedFrom, unscreenedPhrases, unscreenedWords } from "../helpers/capitalized-screen.js";
import { moneyMatches } from "../helpers/money-shape.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));

const PROTAGONIST = "Atticus Dundee Inc.";
const ARTIFACT = "HR-10";
const INDEX = "rehearsal-scenario-briefs.md";

/** The header block, in the one order every brief prints it. */
const HEADER_KEYS = ["Scenario ID", "Archetype", "Employee", "Time in role", "Boundary probe"];

/** The section grammar, in the one order every brief prints it. */
const SECTIONS = [
  "Context",
  "Working relationship",
  "What has happened",
  "What you want from this conversation",
  "What is out of scope",
  "How the employee is likely to respond",
];

/** The closed archetype vocabulary, restated literally and asserted against the index. */
const ARCHETYPES = [
  "missed handoffs",
  "quality slippage",
  "peer friction",
  "growth conversation",
  "unflagged slip",
  "advancement question",
];

// --------------------------------------------------------------- file access

const artifactDir = () => join(REPO_ROOT, "artifacts", ARTIFACT);

function markdownNames() {
  const dir = artifactDir();
  assert.ok(existsSync(dir), `${ARTIFACT} is not authored yet: ${dir} does not exist`);
  return readdirSync(dir).filter((n) => n.endsWith(".md")).sort();
}

const readSource = (name) => readFileSync(join(artifactDir(), name), "utf8");
const briefNames = () => markdownNames().filter((n) => n !== INDEX);
const allMarkdown = () => markdownNames().map((name) => ({ name, text: readSource(name) }));
const words = (text) => text.split(/\s+/).filter(Boolean).length;

// ------------------------------------------------------------------ parsers

/** `- Key: value` lines of the header block, in file order. */
function header(text) {
  const out = [];
  for (const line of text.split("\n")) {
    if (line.startsWith("## ")) break;
    const m = line.match(/^- ([A-Z][A-Za-z ]*?): (.*)$/);
    if (m) out.push([m[1], m[2].trim()]);
  }
  return out;
}

const headerMap = (text) => new Map(header(text));

/** `## Heading` sections, as heading -> body, in file order. */
function sections(text) {
  const out = new Map();
  for (const chunk of text.split(/^## /m).slice(1)) {
    const nl = chunk.indexOf("\n");
    out.set(chunk.slice(0, nl).trim(), chunk.slice(nl + 1).trim());
  }
  return out;
}

/** `- item` lines of one section body. */
const bullets = (body) => body.split("\n")
  .map((l) => l.match(/^- (.+)$/)).filter(Boolean).map((m) => m[1].trim());

/** The index's scenario table, one object per row under its own header cells. */
function scenarioTable() {
  const body = sections(readSource(INDEX)).get("Scenarios");
  assert.ok(body, "the index carries no Scenarios section, so the names have no declared home");
  const lines = body.split("\n").filter((l) => l.startsWith("|"));
  const cells = (l) => l.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
  const cols = cells(lines[0]);
  assert.deepEqual(
    cols, ["Scenario ID", "Title", "Employee", "Archetype", "Boundary probe"],
    "the scenario table's columns have drifted from the published five"
  );
  return lines.slice(2).map((l) => Object.fromEntries(cols.map((c, i) => [c, cells(l)[i]])));
}

/** "First Last, Role Title, Department" as the table and every header block print it. */
function splitEmployee(cell, context) {
  const parts = cell.split(", ");
  assert.ok(parts.length >= 3, `${context}: "${cell}" is not "First Last, role title, department"`);
  const name = parts[0];
  const department = parts[parts.length - 1];
  const roleTitle = parts.slice(1, -1).join(", ");
  const m = name.match(/^([A-Z][A-Za-z'-]+) ([A-Z][A-Za-z'-]+)$/);
  assert.ok(m, `${context}: "${name}" is not a First Last name`);
  return { cell, name, firstName: m[1], lastName: m[2], roleTitle, department };
}

const personas = () => scenarioTable().map((r) => splitEmployee(r.Employee, `scenario table row ${r["Scenario ID"]}`));

// -------------------------------------------------------- the roster, in-test

const roster = () => csvTable(
  fileByPath(generateArtifact(specs.byId.get("CORE-04"), canon), "people-roster.csv").content
).rows;

const fullName = (r) => `${r.first_name} ${r.last_name}`;
const activeRows = () => roster().filter((r) => r.employment_status === "active");
const activeRoleTitles = () => [...new Set(activeRows().map((r) => r.role_title))];
const departments = () => [...new Set(activeRows().map((r) => r.department))];

// ------------------------------------------- the closed lists, read from spec

const featureMatching = (id, pattern) => {
  const found = specs.byId.get(id).planted_features.filter((f) => pattern.test(f));
  assert.equal(found.length, 1, `${id}: expected exactly one planted feature matching ${pattern}`);
  return found[0];
};

const splitList = (text) => text.split(/,\s*/).map((s) => s.trim()).filter(Boolean);

/** Every phrase of a `<class>: a, b, c` spec sentence, for the named classes. */
function classedPhrases(feature, classes) {
  const out = [];
  for (const cls of classes) {
    const m = feature.match(new RegExp(`\\b${cls}: ([^.]+)(?:\\.|$)`));
    assert.ok(m, `the spec sentence carries no ${cls} phrases`);
    out.push(...splitList(m[1]));
  }
  assert.ok(out.length >= 6, "the spec sentence yielded too short a phrase list to be a screen");
  return out;
}

/** HR-01's twelve exclusion phrases. */
const exclusionPhrases = () => classedPhrases(
  featureMatching("HR-01", /^exclusion_phrase_list is the closed rule set/),
  ["age", "national_origin", "disability", "family_status"]
);

/** HR-04's six implicit protected-characteristic probes. */
const probePhrases = () => classedPhrases(
  featureMatching("HR-04", /^protected_characteristic_probe_list is the closed rule set/),
  ["age", "family_status"]
);

/** HR-09's closed character-claim list, the one HR-10 may never reach for (X14). */
function characterPhrases() {
  const feature = featureMatching("HR-09", /^the four closed lists the draft is read against/);
  const m = feature.match(/character_claim_phrases is ([^.]+)/);
  assert.ok(m, "the HR-09 spec sentence carries no character_claim_phrases list");
  const list = splitList(m[1]);
  assert.ok(list.length >= 5, `the character-claim list came out of the spec with only ${list.length} entries`);
  return list;
}

/** HR-17's two closed column lists, the sensitive-field surface HR-10 never touches. */
function sensitiveColumns() {
  const feature = featureMatching("HR-17", /^special_category_fields is the closed list/);
  const named = (name) => {
    const m = feature.match(new RegExp(`${name} is the closed list ([^.]+)`));
    assert.ok(m, `the HR-17 spec sentence carries no ${name} list`);
    return splitList(m[1]);
  };
  const out = [...named("special_category_fields"), ...named("restricted_fields")];
  assert.equal(out.length, 6, `the HR-17 column lists yielded ${out.length} names, expected 6`);
  return out;
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const carries = (text, token) => new RegExp(`\\b${escapeRegExp(token)}\\b`, "i").test(text);

// ------------------------------------------ the pack's own names, for HR-C5-T14

/** Every "First Last" the canon people file seats, renames or reserves. */
function canonNames() {
  const text = readFileSync(join(REPO_ROOT, "canon", "people.md"), "utf8");
  const found = new Set();
  for (const m of text.matchAll(/\|\s*([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+)+)\s*\|/g)) found.add(m[1]);
  assert.ok(found.size > 40, `the canon people file yielded ${found.size} names, so this screen proves little`);
  return found;
}

/** Every candidate name the frozen application log prints, and its resume heads. */
function candidateNames() {
  const dir = join(REPO_ROOT, "artifacts", "HR-02");
  const log = readFileSync(join(dir, "application-log.md"), "utf8");
  const found = new Set();
  for (const m of log.matchAll(/^\|\s*ca-\d{3}\s*\|\s*([^|]+?)\s*\|/gm)) found.add(m[1]);
  for (const name of readdirSync(dir).filter((n) => n.startsWith("resume-") && n.endsWith(".md"))) {
    const head = readFileSync(join(dir, name), "utf8").match(/^#\s*(.+)$/m);
    if (head) found.add(head[1].trim());
  }
  assert.ok(found.size >= 18, `the frozen application log yielded ${found.size} candidates, expected the full field`);
  return found;
}

/** Every person the frozen interview corpus names, interviewer or candidate. */
function corpusNames() {
  const dir = join(REPO_ROOT, "artifacts", "HR-03");
  const found = new Set();
  for (const name of readdirSync(dir).filter((n) => n.endsWith(".md"))) {
    const text = readFileSync(join(dir, name), "utf8");
    for (const m of text.matchAll(/^- (?:Interviewer|Candidate name): (.+?)(?: \(|$)/gm)) found.add(m[1].trim());
  }
  assert.ok(found.size >= 3, `the frozen corpus yielded ${found.size} names, so this screen proves little`);
  return found;
}

/** The one individual the litigation matter names as the adverse party. */
function contractorName() {
  const text = readFileSync(
    join(REPO_ROOT, "artifacts", "LGL-12", "litigation-matter-trade-secret-non-compete.md"), "utf8"
  );
  const m = text.match(/^\|\s*Adverse party\s*\|\s*([^|(]+?)\s*\(/m);
  assert.ok(m, "the litigation matter no longer prints an adverse party, so this screen proves nothing");
  return m[1].trim();
}

// ------------------------------------------------------------------ furniture

// The one place a typed list is allowed. Both entries are here because every
// file has to print them and the pack ships them nowhere else. The persona
// names, the role titles, the departments, the protagonist and the scenario ids
// are all derived below from canon, from the generated roster or from the
// artifact's own scenario table.
const FURNITURE_PHRASES = [
  "Scenario ID",  // the header label and the table column every file prints
];
const FURNITURE_WORDS = [
  "ID",           // the second word of that label
];

// ------------------------------------------------------------- the freeze gate

test("the C5 drafted freeze gate is one markdown artifact set whose spec says so", () => {
  const spec = specs.byId.get(ARTIFACT);
  assert.ok(spec, `${ARTIFACT} is not in the spec catalog`);
  assert.equal(spec.generation, "drafted-frozen", `${ARTIFACT} is not drafted-frozen`);
  assert.equal(spec.format, "markdown", `${ARTIFACT} format drifted from the HR block`);
  assert.equal(spec.columns, undefined, `${ARTIFACT} is prose and carries no columns`);
  assert.equal(spec.period, undefined, `${ARTIFACT} states a period, and its briefs carry no date to sit in one`);
  assert.ok(spec.planted_features.length === 5, `${ARTIFACT} states ${spec.planted_features.length} planted features, expected 5`);
  assert.deepEqual(spec.canon_entities, ["co-002"], `${ARTIFACT} names a canon entity other than the protagonist`);
});

// ------------------------------------------------------------------ HR-C5-T12

test("HR-C5-T12: seven files, six dense scenario ids, and one header block and section order", () => {
  const names = markdownNames();
  assert.equal(names.length, 7, `${ARTIFACT} ships ${names.length} markdown files, expected 7`);
  assert.ok(names.includes(INDEX), `${ARTIFACT} ships no ${INDEX}, so the set has no index`);

  const ids = [];
  for (const name of briefNames()) {
    const text = readSource(name);
    const keys = header(text).map(([k]) => k);
    assert.deepEqual(keys, HEADER_KEYS, `${name}: the header block order has drifted`);
    assert.deepEqual(
      [...sections(text).keys()], SECTIONS,
      `${name}: the section order has drifted, or the file carries a section the grammar does not`
    );
    for (const [key, value] of header(text)) {
      assert.ok(value.length > 0, `${name}: the ${key} line is empty`);
    }
    for (const [heading, body] of sections(text)) {
      assert.ok(body.length > 0, `${name}: the ${heading} section is empty`);
    }
    const id = headerMap(text).get("Scenario ID");
    ids.push(id);
    const archetype = headerMap(text).get("Archetype");
    assert.equal(
      name, `scenario-rhs-${id.slice(4)}-${archetype.replace(/ /g, "-")}.md`,
      `${name}: the file name does not follow the scenario id and archetype convention`
    );
  }
  ids.sort();
  assert.deepEqual(
    ids, ["RHS-01", "RHS-02", "RHS-03", "RHS-04", "RHS-05", "RHS-06"],
    "the scenario ids are not RHS-01 upward, dense and unique"
  );

  // The index publishes the two closed lists the briefs are written against.
  const indexSections = sections(readSource(INDEX));
  assert.deepEqual(
    [...indexSections.keys()],
    ["How a brief is written", "Archetypes", "Scenarios", "What is out of scope"],
    "the index's own section order has drifted"
  );
  const grammar = bullets(indexSections.get("How a brief is written"));
  assert.deepEqual(grammar, [...HEADER_KEYS, ...SECTIONS], "the index publishes a grammar the briefs do not follow");
  assert.deepEqual(bullets(indexSections.get("Archetypes")), ARCHETYPES, "the index publishes another archetype list");

  // The closed probe vocabulary is published literally, not just used.
  const indexText = readSource(INDEX);
  assert.ok(indexText.includes("The boundary probe vocabulary is closed."), "the index no longer states the probe vocabulary is closed");
  for (const token of ["promotion_decision", "no_promotion_decision", "compensation_decision"]) {
    assert.ok(indexText.includes(token), `the index no longer publishes the probe class token "${token}"`);
  }
});

// ------------------------------------------------------------------ HR-C5-T13

test("HR-C5-T13: one boundary probe, an index that agrees file for file, and the four censuses", () => {
  const rows = scenarioTable();
  assert.equal(rows.length, 6, `the scenario table carries ${rows.length} rows, expected 6`);

  // Every brief's own header block against the table row that claims it.
  const byId = new Map(rows.map((r) => [r["Scenario ID"], r]));
  for (const name of briefNames()) {
    const text = readSource(name);
    const meta = headerMap(text);
    const row = byId.get(meta.get("Scenario ID"));
    assert.ok(row, `${name}: the index's scenario table carries no row for ${meta.get("Scenario ID")}`);
    for (const key of ["Archetype", "Employee", "Boundary probe"]) {
      assert.equal(row[key], meta.get(key), `${name}: the index and the brief disagree on ${key}`);
    }
    const title = text.match(/^# (.+)$/m);
    assert.ok(title, `${name}: the file carries no title`);
    assert.equal(row.Title, title[1].trim(), `${name}: the index states another title`);
    assert.equal(/\d/.test(row.Title), false, `${name}: the scenario title carries a number`);
  }

  // The archetype vocabulary is closed and each value is used once.
  assert.deepEqual(
    rows.map((r) => r.Archetype).sort(), [...ARCHETYPES].sort(),
    "the six archetypes are not the published six, each used once"
  );

  // HR-10a. The probe is found by reading the declared field, never by being told.
  const probes = rows.filter((r) => r["Boundary probe"] !== "none");
  assert.equal(probes.length, 1, `${probes.length} scenarios carry a Boundary probe other than none, expected 1`);
  assert.equal(probes[0]["Boundary probe"], "promotion_decision", "the probe class has drifted from the one this set exercises");

  // The counterfactual censuses, each recomputed over the six briefs by a rule a
  // reader can apply: the keyword rule, the question rule, the cycle rule and
  // the money rule. None of them finds the probe, which is the point of stating
  // them; every one of them is a count rather than an identity.
  const texts = briefNames().map((n) => readSource(n));
  const census = (re) => texts.filter((t) => re.test(t)).length;
  assert.equal(census(/promot(ion|ed)/i), 2, "the promotion-token census has moved off 2");
  assert.equal(census(/asked you/i), 3, "the employee-question census has moved off 3");
  assert.equal(census(/the half year just closed/i), 3, "the timing-anchor census has moved off 3");
  assert.equal(texts.length, 6, "every brief is about the employee's performance, so that rule returns 6 and finds nothing");
});

// ------------------------------------------------------------------ HR-C5-T14

test("HR-C5-T14: six invented personas, colliding with nothing, in six real seats", () => {
  const people = personas();
  assert.equal(people.length, 6, `the scenario table names ${people.length} personas, expected 6`);

  const rows = roster();
  const rosterPairs = new Set(rows.map((r) => `${r.first_name} ${r.last_name}`));
  const lists = [
    ["a roster row", new Set(rows.map(fullName))],
    ["a canon people table row", canonNames()],
    ["a candidate in the frozen application log", candidateNames()],
    ["a name in the frozen interview corpus", corpusNames()],
    ["the contractor the litigation matter names", new Set([contractorName()])],
  ];

  const active = activeRows();
  const titles = activeRoleTitles();
  for (const p of people) {
    assert.equal(
      rosterPairs.has(`${p.firstName} ${p.lastName}`), false,
      `the persona "${p.name}" reuses a roster row's own (first_name, last_name) pair`
    );
    for (const [label, names] of lists) {
      assert.equal(names.has(p.name), false, `the persona "${p.name}" collides with ${label}`);
    }
    assert.ok(titles.includes(p.roleTitle), `the persona "${p.name}" holds "${p.roleTitle}", which no active row holds`);
    assert.ok(
      active.some((r) => r.role_title === p.roleTitle && r.department === p.department),
      `"${p.roleTitle}" does not appear in ${p.department} on any active row`
    );
    // No employee id, no work email, no start date, anywhere in that persona's brief.
    const brief = briefNames().map(readSource).find((t) => t.includes(p.cell));
    assert.ok(brief, `no brief carries the header line for "${p.name}"`);
    assert.equal(/EMP-\d/.test(brief), false, `the brief for "${p.name}" carries an employee id`);
    assert.equal(/@/.test(brief), false, `the brief for "${p.name}" carries an address`);
  }

  const depts = people.map((p) => p.department);
  assert.equal(new Set(depts).size, 6, "the six personas do not sit in six distinct departments");
  for (const d of ["People", "IT & Security"]) {
    assert.equal(depts.includes(d), false, `a persona sits in ${d}, where the review cycle population lives`);
  }
  for (const d of depts) {
    assert.ok(departments().includes(d), `"${d}" is not a department any active roster row carries`);
  }

  // The index names nobody outside the table it declares as their only home.
  const outside = readSource(INDEX).split("## Scenarios")[0] + readSource(INDEX).split("## Scenarios")[1].split("\n## ").slice(1).join("\n## ");
  for (const p of people) {
    assert.equal(outside.includes(p.lastName), false, `the index names "${p.lastName}" outside the scenario table`);
  }
});

// ------------------------------------------------------------------ HR-C5-T16

test("HR-C5-T16: the mirror-sweep exclusions hold, and one date token exists in the set", () => {
  // HR-05's interviewer-calendar generator walks artifacts/*/*.md at build time
  // and fails its own generation on a file that carries a Date line, a Start
  // time line and an indented attendee bullet together. Any one of the three
  // keeps HR-10 out of that walk; all three are asserted, because a later edit
  // that adds one is a build failure reported against another artifact.
  for (const { name, text } of allMarkdown()) {
    assert.equal(/^- Date:/m.test(text), false, `${name} carries a Date line, which the calendar mirror sweep looks for`);
    assert.equal(/^- Start time:/m.test(text), false, `${name} carries a Start time line`);
    assert.equal(/^ {2}- .+ \(.+\)$/m.test(text), false, `${name} carries an indented attendee bullet`);
  }

  const index = readSource(INDEX);
  const asOf = index.match(/^- As of: (\d{4}-\d{2}-\d{2})$/gm) ?? [];
  assert.equal(asOf.length, 1, `the index carries ${asOf.length} as-of lines, expected exactly 1`);
  assert.equal(asOf[0], "- As of: 2026-04-03", "the as-of has drifted from the pack's own");

  const MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December";
  const DATE = new RegExp(`\\b\\d{4}-\\d{2}-\\d{2}\\b|\\b(?:19|20)\\d{2}\\b|\\b(?:${MONTHS})\\b`, "g");
  for (const { name, text } of allMarkdown()) {
    const stripped = text.replace(/^- As of: \d{4}-\d{2}-\d{2}$/m, "");
    assert.deepEqual(
      stripped.match(DATE) ?? [], [],
      `${name} carries a date, and every brief states its timing relatively`
    );
  }
});

// ------------------------------------------------------------------ HR-C5-T17

test("HR-C5-T17: the absence sweep over all seven files", () => {
  const sources = allMarkdown();

  // The three closed phrase lists the pack already publishes, read from the spec
  // catalog rather than retyped, so a later amendment to any of them widens this
  // screen rather than leaving it behind.
  const fromSpec = [
    ["an HR-01 exclusion phrase", exclusionPhrases()],
    ["an HR-04 protected-characteristic probe", probePhrases()],
    ["an HR-09 character claim", characterPhrases()],
    ["an HR-17 sensitive column", sensitiveColumns()],
  ];

  // Literal lists, in this file's own code because the pack ships them nowhere.
  const RATING_PHRASES = [
    "meets expectations", "exceeds expectations", "below expectations",
    "does not meet expectations", "on track", "rating", "rated", "score", "scored",
    "ranked", "percentile", "band",
  ];
  const TERMINATION_TOKENS = [
    "dismissal", "dismissed", "terminate", "termination", "fired", "firing",
    "let go", "redundancy", "notice period", "written warning", "warning",
    "performance improvement plan", "improvement plan", "formal process", "formal",
    "disciplinary", "discipline", "probation", "sanction",
  ];
  const POLICY_TOKENS = [
    "hr-operational-controls", "hr-manager-conversation-rehearsal",
    "hr-review-writing-assistant", "hr-learning-pathway-planner",
    "step_is_not_an_employment_decision", "data_class", "authority level",
  ];
  const RULE_IDS = ["EMPLOY", "DECIDE", "RESTRICTED"];

  for (const { name, text } of sources) {
    for (const [label, list] of fromSpec) {
      for (const phrase of list) {
        assert.equal(carries(text, phrase), false, `${name} carries ${label}: "${phrase}"`);
      }
    }
    for (const phrase of RATING_PHRASES) {
      assert.equal(carries(text, phrase), false, `${name} carries the rating phrase "${phrase}"`);
    }
    for (const token of TERMINATION_TOKENS) {
      assert.equal(carries(text, token), false, `${name} carries the termination or discipline token "${token}"`);
    }
    for (const token of POLICY_TOKENS) {
      assert.equal(carries(text, token), false, `${name} names the policy surface: "${token}"`);
    }
    for (const id of RULE_IDS) {
      assert.equal(new RegExp(`\\b${id}\\b`).test(text), false, `${name} names the rule or check id ${id}`);
    }
    assert.equal(/EMP-\d/.test(text), false, `${name} carries an employee id`);
    assert.equal(/\bca-\d/.test(text), false, `${name} carries a candidate token`);
    assert.equal(/\bHRC-/.test(text), false, `${name} carries a case token`);
    assert.equal(/\bRQN-/.test(text), false, `${name} carries a requisition token`);
    assert.equal(text.includes(".example"), false, `${name} carries an example domain`);
    assert.deepEqual(moneyMatches(text), [], `${name} states a figure, and this cluster carries no money`);
    assert.deepEqual(text.match(/\d+(\.\d+)?\s?%/g) ?? [], [], `${name} states a percentage`);
    assert.equal(text.includes("—"), false, `${name} carries an em dash`);
  }
});

// ------------------------------------------------------------------ HR-C5-T18

test("HR-C5-T18: every capitalized string is accounted for, and one paragraph is shared by seven files", () => {
  const people = personas();
  const allowed = allowedFrom({
    derived: [
      PROTAGONIST,
      ...activeRoleTitles(),
      ...departments(),
      // The personas, declared as furniture read out of the pack's own scenario
      // index. HR-C5-T14 is what makes that safe: it proves each pair lands on
      // nothing the pack already carries.
      ...people.map((p) => p.cell),
      ...people.map((p) => p.name),
      ...scenarioTable().map((r) => r["Scenario ID"]),
    ],
    furniturePhrases: FURNITURE_PHRASES,
    furnitureWords: FURNITURE_WORDS,
  });
  for (const { name, text } of allMarkdown()) {
    assert.deepEqual(unscreenedPhrases(text, allowed), [], `unscreened capitalized phrase(s) in ${ARTIFACT}/${name}`);
    assert.deepEqual(unscreenedWords(text, allowed), [], `unscreened capitalized word(s) in ${ARTIFACT}/${name}`);
  }

  // No canon company other than the protagonist, and the protagonist once.
  for (const { name, text } of allMarkdown()) {
    for (const company of canon.values()) {
      if (company.name === PROTAGONIST) continue;
      assert.equal(text.includes(company.name), false, `${ARTIFACT}/${name} names canon company "${company.name}"`);
    }
  }
  const named = allMarkdown().filter(({ text }) => text.includes(PROTAGONIST));
  assert.equal(named.length, 1, `the protagonist is named in ${named.length} files, expected 1`);
  assert.equal(
    (named[0].text.match(new RegExp(escapeRegExp(PROTAGONIST), "g")) ?? []).length, 1,
    "the protagonist is named more than once in the file that names it"
  );

  // The out-of-scope paragraph is byte-identical everywhere it appears, so a
  // diff across the set cannot find the probe by that section.
  const paragraphs = new Set(allMarkdown().map(({ name, text }) => {
    const body = sections(text).get("What is out of scope");
    assert.ok(body, `${name} carries no out of scope section`);
    return body;
  }));
  assert.equal(paragraphs.size, 1, `the out of scope paragraph appears in ${paragraphs.size} variants, expected 1`);
});

// --------------------------------------------------------------- word bands

test("the set stays a short read: every brief in its band and the index in its own", () => {
  for (const name of briefNames()) {
    const body = [...sections(readSource(name)).values()].map(words).reduce((a, b) => a + b, 0);
    assert.ok(body >= 200 && body <= 280, `${name} runs ${body} words of body, outside the 200 to 280 band`);
  }
  const index = words(readSource(INDEX));
  assert.ok(index >= 350 && index <= 650, `the index runs ${index} words, outside the 350 to 650 band`);
  const total = allMarkdown().map(({ text }) => words(text)).reduce((a, b) => a + b, 0);
  assert.ok(total <= 2600, `the set runs ${total} words, longer than a freeze review should have to read`);
});

// Small business cluster 4, wave A: the structural screen over the drafted
// surface of the referral loop.
//
//   artifacts/SMB-24/feedback-request-template.md
//     the blank feedback request template: ten fields, eight required and two
//     conditional, the gate on an open support issue, and a request that is
//     drafted and held for the owner, never sent.
//
//   artifacts/SMB-25/referral-nurture-sequence.md
//     the blank three-touch sequence to the studio's referral partner: eleven
//     fields, ten required and one conditional, and a touch that never names
//     the client, the property address or the project name.
//
// tests/drafted/smb-c3-drafted-screen.test.js is the house style this file
// follows, and its markdown table parser, section parser, canon name screen,
// token machinery and deny-list matcher are carried here as local copies: the
// documents are read lazily inside each test at a path derived from their own
// spec entries, every expectation is re-derived from committed bytes rather
// than retyped, and no section of a document is allowed to license its own
// content.
//
// validate's keyword heuristic can never FAIL a drafted plant, so this file is
// the falsifiable guard on both templates (data plan fact 0.2).
//
// The mutations this file exists to catch, in the data plan's own words: a
// column renamed in SMB-23 after the templates are written, which leaves a
// template naming a column that no longer exists; and {{project_name}} added
// to a partner touch, which puts a household's name in a message to a third
// party.
//
// Mechanical rules, stated once.
//
//   The upstream rule (T-K4, T-L4). No SMB-23 column name is typed here. Every
//   name a source_columns cell carries, and every backticked snake_case word
//   anywhere in either document, is resolved against SMB-23's spec.columns read
//   out of specs/artifact-specs.yaml at test time.
//
//   The token rule (T-K3, T-L3). Every placeholder token is recomputed as the
//   snake_case of its own field name, and every brace token anywhere in a
//   document is one its own required-field list declares.
//
//   The census rule. Every count is an equality.
//
//   The absence screens. Company and person names are canon's own, parsed out
//   of canon/companies.md and canon/people.md; the capitalized-word screen is
//   tests/helpers/capitalized-screen.js with the allowed set derived from canon
//   and the spec, never from the document under test; the figure screen is
//   tests/helpers/money-shape.js plus a digit sweep; the payment-instrument
//   list is the hoisted C1 deny-list extended, never copied.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { MOCK_VOCABULARY } from "../helpers/smb-mock-vocabulary.js";
import { moneyAmounts } from "../helpers/money-shape.js";
import { allowedFrom, unscreenedPhrases, unscreenedWords } from "../helpers/capitalized-screen.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));

// ------------------------------------------------------------------ the tree

function specOf(id) {
  const spec = specs.byId.get(id);
  assert.ok(spec, `${id} is not in specs/artifact-specs.yaml`);
  return spec;
}

/** Where a drafted template ships, derived from its own spec entry. */
const artifactPath = (id) => join(REPO_ROOT, "artifacts", id, `${specOf(id).name}.md`);
const docxPath = (id) => join(REPO_ROOT, "artifacts", id, "build", `${specOf(id).name}.docx`);
const read = (id) => readFileSync(artifactPath(id), "utf8");

const COMPANIES_PATH = join(REPO_ROOT, "canon", "companies.md");
const PEOPLE_PATH = join(REPO_ROOT, "canon", "people.md");

/** SMB-23's columns, read out of the yaml rather than typed. */
function logColumns() {
  const spec = specOf("SMB-23");
  assert.ok(
    Array.isArray(spec.columns) && spec.columns.length > 0,
    "SMB-23 carries no columns in the spec, so the source-column screen would pass vacuously"
  );
  return spec.columns;
}

// --------------------------------------------------------------- pinned facts

/** Each template's shape, from data plan sections 2.2 and 2.3. */
const DOCS = {
  "SMB-24": {
    columns: ["field_id", "field_name", "required", "placeholder_token", "source_columns", "condition"],
    idPrefix: "FRQ-LDB-",
    fields: 10,
    flags: { yes: 8, conditional: 2 },
    sections: [
      "1. How to use this template",
      "2. Required-field list",
      "3. The request",
      "4. Before a request is drafted",
      "5. What a request never says",
      "6. Closing note",
    ],
    bodySection: /^3\. The request$/,
    band: [500, 750],
  },
  "SMB-25": {
    columns: ["field_id", "field_name", "touch", "required", "placeholder_token", "source_columns", "condition"],
    idPrefix: "RNS-LDB-",
    fields: 11,
    flags: { yes: 10, conditional: 1 },
    sections: [
      "1. How to use this template",
      "2. Required-field list",
      "3. Fields every touch carries",
      "4. Touch one, after completion",
      "5. Touch two, two weeks after touch one",
      "6. Touch three, four weeks after touch two",
      "7. When the sequence starts and stops",
      "8. Closing note",
    ],
    bodySection: null,
    band: [650, 950],
  },
};

/** The touch vocabulary and the section each value sits under. */
const TOUCH_SECTION = {
  all: /every touch/i,
  one: /^\d+\. Touch one\b/,
  two: /^\d+\. Touch two\b/,
  three: /^\d+\. Touch three\b/,
};

const FLAGS = ["yes", "conditional"];

/** R-NOSTATUTE, the pattern in data plan section 0. */
const STATUTE = /\bBPC\b|\bCal\.|U\.S\.C|\bCFR\b|\bFTC\b|\bAct\b|\bSB |\bAB |section 17941|\u00a7/;

const pad = (n) => String(n).padStart(2, "0");

// -------------------------------------------------------------- table parsing

const isTableLine = (line) => line.trim().startsWith("|");
const tableCells = (line) => line.split("|").slice(1, -1).map((c) => c.trim());
const isRule = (cells) => cells.every((c) => /^:?-+:?$/.test(c));
const cellValue = (cell) => cell.replace(/`/g, "").replace(/\*\*/g, "").trim();

/** Every markdown table whose header cells are exactly `columns`, in any order. */
function tablesWithColumns(text, columns) {
  const want = [...columns].sort().join("|");
  const lines = text.split("\n");
  const found = [];
  for (const [i, line] of lines.entries()) {
    if (!isTableLine(line)) continue;
    const head = tableCells(line).map(cellValue);
    if (head.length !== columns.length) continue;
    if ([...head].sort().join("|") !== want) continue;
    const rows = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      if (!isTableLine(lines[j])) break;
      const cells = tableCells(lines[j]);
      if (isRule(cells)) continue;
      rows.push({
        ...Object.fromEntries(head.map((c, k) => [c, cellValue(cells[k] ?? "")])),
        raw: Object.fromEntries(head.map((c, k) => [c, (cells[k] ?? "").trim()])),
      });
    }
    found.push(rows);
  }
  return found;
}

function theTable(text, columns, label) {
  const tables = tablesWithColumns(text, columns);
  assert.equal(tables.length, 1, `${label} carries ${tables.length} tables with the columns ${columns.join(", ")}, expected exactly 1`);
  assert.ok(tables[0].length > 0, `${label} parsed to no rows`);
  return tables[0];
}

// ------------------------------------------------------------------ sections

function sections(text) {
  const lines = text.split("\n");
  const heads = [];
  for (const [i, line] of lines.entries()) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) heads.push({ title: m[1], line: i });
  }
  assert.ok(heads.length > 0, "the document carries no ## sections");
  return heads.map((head, k) => ({
    title: head.title,
    start: head.line,
    end: k + 1 < heads.length ? heads[k + 1].line : lines.length,
    body: lines.slice(head.line + 1, k + 1 < heads.length ? heads[k + 1].line : lines.length).join("\n"),
  }));
}

function theSection(text, pattern, label) {
  const all = sections(text);
  const found = all.filter((s) => pattern.test(s.title));
  assert.equal(
    found.length, 1,
    `${label}: ${found.length} sections match ${pattern}, expected exactly 1 (titles: ${all.map((s) => s.title).join(" / ")})`
  );
  return found[0];
}

// -------------------------------------------------------- the token machinery

const TOKEN = /\{\{([a-z0-9_]+)\}\}/g;
const tokensIn = (text) => [...text.matchAll(TOKEN)].map((m) => m[1]);
const snakeCase = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

/** A template's declared fields joined to their `###` body sections. */
function templateFields(id) {
  const doc = DOCS[id];
  const text = read(id);
  const declared = theTable(text, doc.columns, `${id}'s required-field list`);
  const lines = text.split("\n");
  const idPattern = new RegExp(`^###\\s+(.+?)\\s+\\((${doc.idPrefix}\\d{2})\\)\\s*$`);
  const heads = [];
  for (const [i, line] of lines.entries()) {
    const m = line.match(idPattern);
    if (m) heads.push({ name: m[1], id: m[2], line: i });
  }
  const bodyEnd = (k) => {
    const next = lines.findIndex((l, i) => i > heads[k].line && /^#{2,3}\s/.test(l));
    return next < 0 ? lines.length : next;
  };
  const bodyById = new Map(heads.map((h, k) => [h.id, { name: h.name, line: h.line, body: lines.slice(h.line + 1, bodyEnd(k)).join("\n") }]));
  return { text, declared, heads, bodyById };
}

const namedColumns = (raw) => [...raw.matchAll(/`([a-z0-9_]+)`/g)].map((m) => m[1]);

// ------------------------------------------------------------- the canon join

function canonCompanies() {
  const lines = readFileSync(COMPANIES_PATH, "utf8").split("\n");
  const out = new Map();
  for (const [i, line] of lines.entries()) {
    if (!isTableLine(line)) continue;
    const head = tableCells(line).map((c) => c.toLowerCase());
    if (head[0] !== "id" || !head[1]?.startsWith("name")) continue;
    for (let j = i + 1; j < lines.length; j += 1) {
      if (!isTableLine(lines[j])) break;
      const cells = tableCells(lines[j]);
      if (isRule(cells)) continue;
      const cid = cellValue(cells[0] ?? "");
      if (!/^co-\d{3}$/.test(cid)) continue;
      out.set(cid, cellValue(cells[1] ?? "").replace(/\s*\([^)]*\)\s*$/, "").trim());
    }
  }
  assert.ok(out.size > 0, "canon/companies.md parsed to no company rows");
  return out;
}

function canonPeople() {
  const NAME_HEADS = ["name", "retired name", "frozen name"];
  const lines = readFileSync(PEOPLE_PATH, "utf8").split("\n");
  const found = new Set();
  for (const [i, line] of lines.entries()) {
    if (!isTableLine(line)) continue;
    const head = tableCells(line);
    const col = head.findIndex((c) => NAME_HEADS.includes(c.toLowerCase()));
    if (col < 0) continue;
    for (let j = i + 1; j < lines.length; j += 1) {
      if (!isTableLine(lines[j])) break;
      const cells = tableCells(lines[j]);
      if (isRule(cells)) continue;
      const value = (cells[col] ?? "").replace(/\*\*/g, "").trim();
      if (/^[A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*)+/.test(value)) found.add(value);
    }
  }
  return found;
}

// ------------------------------------------------------------- the deny lists

/** Nothing is excised from the R-MOCK list for either template; asserted, not assumed. */
const DROPPED = [];
assert.equal(DROPPED.length, 0, "a term was excised from the deny list without updating this assertion");

const C2_PHRASES = [
  "card network", "wire transfer", "payment gateway", "payment processor",
  "routing number", "sort code", "account number",
  "authorisation", "authorization code", "reference token",
];

const PAYMENT_INSTRUMENTS = [...MOCK_VOCABULARY.filter((t) => !DROPPED.includes(t)), ...C2_PHRASES];

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function denyHits(text, terms) {
  const hits = [];
  for (const term of terms) {
    const m = new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").exec(text);
    if (m) hits.push(`${m[0]} (at index ${m.index})`);
  }
  return hits;
}

// ================================================================ the spec pin

for (const id of ["SMB-24", "SMB-25"]) {
  test(`SMB-C4 ${id}: a drafted-frozen template on disk, running the plan's sections in order`, () => {
    const spec = specOf(id);
    assert.equal(spec.generation, "drafted-frozen", `${id} is generation ${spec.generation}`);
    assert.ok(existsSync(artifactPath(id)), `${artifactPath(id)} is not on disk; the template has not been drafted`);
    assert.deepEqual(
      sections(read(id)).map((s) => s.title), DOCS[id].sections,
      `${id}'s sections are not the fixed order of the data plan`
    );
  });
}

// ============================================== T-K1, T-L1: fields and bodies

for (const [id, key] of [["SMB-24", "T-K1"], ["SMB-25", "T-L1"]]) {
  test(`SMB-C4 ${key}: ${id}'s required-field list and body sections are the same ids in the same order`, () => {
    const doc = DOCS[id];
    const { text, declared, heads } = templateFields(id);
    assert.equal(declared.length, doc.fields, `${id}'s required-field list carries ${declared.length} rows, expected ${doc.fields}`);
    assert.equal(heads.length, doc.fields, `${id}'s body carries ${heads.length} field sections, expected ${doc.fields}`);
    assert.deepEqual(
      declared.map((r) => r.field_id), declared.map((_, i) => `${doc.idPrefix}${pad(i + 1)}`),
      `${id}'s field ids are not ${doc.idPrefix}01 upward with no gap`
    );
    assert.deepEqual(heads.map((h) => h.id), declared.map((r) => r.field_id), `${id}'s body and list run different ids`);
    assert.deepEqual(heads.map((h) => h.name), declared.map((r) => r.field_name), `${id}'s body names a field differently`);

    // Where each body section sits.
    const all = sections(text);
    const home = (line) => all.find((s) => line > s.start && line < s.end);
    for (const [k, h] of heads.entries()) {
      const section = home(h.line);
      assert.ok(section, `${h.id} sits under no ## section`);
      if (doc.bodySection) {
        assert.match(section.title, doc.bodySection, `${h.id} sits under "${section.title}"`);
      } else {
        const touch = declared[k].touch;
        assert.ok(Object.hasOwn(TOUCH_SECTION, touch), `${h.id} carries the touch "${touch}", outside all, one, two, three`);
        assert.match(section.title, TOUCH_SECTION[touch], `${h.id} is touch ${touch} and sits under "${section.title}"`);
      }
    }
    if (id === "SMB-25") {
      const byTouch = (t) => declared.filter((r) => r.touch === t).length;
      assert.deepEqual(
        [byTouch("all"), byTouch("one"), byTouch("two"), byTouch("three")], [3, 4, 2, 2],
        "the fields per touch are not three shared, four for touch one and two each for touches two and three"
      );
    }
  });
}

// ============================================== T-K2, T-L2: the flag census

for (const [id, key] of [["SMB-24", "T-K2"], ["SMB-25", "T-L2"]]) {
  test(`SMB-C4 ${key}: ${id}'s flag census, and the list is the only place a flag is stated`, () => {
    const doc = DOCS[id];
    const { declared, bodyById } = templateFields(id);
    for (const row of declared) {
      assert.ok(FLAGS.includes(row.required), `${row.field_id} carries required "${row.required}", outside ${FLAGS.join(", ")}`);
      // The condition column says none exactly when the field is required.
      if (row.required === "yes") {
        assert.equal(row.condition, "none", `${row.field_id} is required and states a condition "${row.condition}"`);
      } else {
        assert.ok(row.condition !== "none" && row.condition.trim() !== "", `${row.field_id} is conditional and states no condition`);
      }
    }
    for (const [flag, wanted] of Object.entries(doc.flags)) {
      const got = declared.filter((r) => r.required === flag).length;
      assert.equal(got, wanted, `${id}: ${got} fields are ${flag}, expected ${wanted}`);
    }
    for (const [fid, section] of bodyById) {
      assert.doesNotMatch(section.body, /\brequired\b|\bconditional\b|\boptional\b/i, `${fid}'s body restates its flag`);
    }
  });
}

// ============================================== T-K3, T-L3: the tokens

for (const [id, key] of [["SMB-24", "T-K3"], ["SMB-25", "T-L3"]]) {
  test(`SMB-C4 ${key}: every field of ${id} has a slot, and every token is the snake_case of its own field name`, () => {
    const doc = DOCS[id];
    const { text, declared, bodyById } = templateFields(id);
    let checked = 0;
    for (const row of declared) {
      const body = tokensIn(bodyById.get(row.field_id).body);
      assert.equal(body.length, 1, `${row.field_id}'s body carries ${body.length} tokens, expected exactly 1`);
      assert.equal(body[0], snakeCase(row.field_name), `${row.field_id} is "${row.field_name}" and carries {{${body[0]}}}`);
      assert.deepEqual(tokensIn(row.placeholder_token), body, `${row.field_id}'s listed token disagrees with its body`);
      checked += 1;
    }
    assert.equal(checked, doc.fields, "the token count");
    const declaredTokens = new Set(declared.flatMap((r) => tokensIn(r.placeholder_token)));
    for (const token of tokensIn(text)) {
      assert.ok(declaredTokens.has(token), `${id} carries {{${token}}}, which is not a token of its own required-field list`);
    }
  });
}

// ============================================== T-K4, T-L4: the upstream join

for (const [id, key] of [["SMB-24", "T-K4"], ["SMB-25", "T-L4"]]) {
  test(`SMB-C4 ${key}: every source column of ${id} resolves in SMB-23's spec.columns, and none comes from anywhere else`, () => {
    const doc = DOCS[id];
    const { text, declared } = templateFields(id);
    const upstream = new Set(logColumns());

    let resolved = 0;
    let sourceless = 0;
    for (const row of declared) {
      const raw = row.raw.source_columns;
      const named = namedColumns(raw);
      if (named.length === 0) {
        assert.match(raw, /^none$/, `${row.field_id} names no source column and its cell reads "${raw}"`);
        sourceless += 1;
        continue;
      }
      for (const name of named) {
        assert.ok(upstream.has(name), `${row.field_id} names ${name}, which is not in SMB-23's spec.columns`);
        resolved += 1;
      }
      const residue = raw.replace(/`[^`]*`/g, " ");
      assert.doesNotMatch(residue, /[a-z]+_[a-z]/, `${row.field_id}'s source_columns cell carries an unticked snake_case word`);
    }
    assert.ok(resolved > 0 && sourceless > 0, `${id}: the join ran over ${resolved} columns and ${sourceless} sourceless fields`);

    // Every backticked snake_case word anywhere in the document is a column of
    // SMB-23 or a header of the required-field list: a column of any other
    // artifact fails by name.
    const allowed = new Set([...upstream, ...doc.columns]);
    for (const word of namedColumns(text)) {
      assert.ok(allowed.has(word), `${id} names \`${word}\`, which is neither an SMB-23 column nor a list header`);
    }

    if (id === "SMB-25") {
      // The privacy rule: a partner touch never reads the client, the project
      // name, the issue text or any address field.
      const dictionary = readFileSync(
        join(REPO_ROOT, "datasets", "smb", "client-record-template", "client-record-fields.csv"), "utf8"
      ).trim().split("\n").slice(1).map((line) => line.split(",")[0]);
      const addressFields = dictionary.filter((f) => /address/.test(f));
      assert.ok(addressFields.length > 0, "SMB-02 declares no address field, so the address screen is vacuous");
      const forbidden = ["client_name", "project_name", "issue_summary", ...addressFields];
      for (const row of declared) {
        for (const name of namedColumns(row.raw.source_columns)) {
          assert.ok(!forbidden.includes(name), `${row.field_id} reads ${name}; a partner touch never carries the client's identity`);
        }
      }
      for (const token of tokensIn(text)) {
        assert.ok(!forbidden.includes(token), `SMB-25 carries {{${token}}}; a partner touch never carries the client's identity`);
      }
    }
  });
}

// ============================================== T-K5, T-L5: canon

test("SMB-C4 T-K5: SMB-24 names no canon company, no canon person, no co- id and no Larkspur", () => {
  const text = read("SMB-24");
  assert.deepEqual(specOf("SMB-24").canon_entities, [], "SMB-24 declares canon entities");
  const companies = canonCompanies();
  for (const [cid, name] of companies) {
    assert.ok(!text.includes(name), `SMB-24 names the canon company ${name} (${cid})`);
  }
  assert.doesNotMatch(text, /\bco-\d/, "SMB-24 carries a co- id");
  assert.doesNotMatch(text, /Larkspur/i, "SMB-24 names the studio; it signs with {{studio_name}}");
  const people = canonPeople();
  assert.ok(people.size >= 80, `only ${people.size} names were derived from canon/people.md`);
  for (const person of people) assert.ok(!text.includes(person), `SMB-24 names the person ${person}`);
});

test("SMB-C4 T-L5: SMB-25's only canon string is its referral partner's name, byte equal to canon", () => {
  const text = read("SMB-25");
  const companies = canonCompanies();
  const declaredIds = specOf("SMB-25").canon_entities;
  assert.deepEqual(declaredIds, ["co-135"], "SMB-25 canon_entities");
  const partner = companies.get(declaredIds[0]);
  assert.ok(partner, "canon does not seat SMB-25's referral partner");
  assert.ok(text.includes(partner), `SMB-25 does not name its referral partner ${partner}`);
  for (const [cid, name] of companies) {
    if (cid === declaredIds[0]) continue;
    assert.ok(!text.includes(name), `SMB-25 names the canon company ${name} (${cid})`);
  }
  assert.doesNotMatch(text, /\bco-\d/, "SMB-25 carries a co- id");
  assert.doesNotMatch(text, /Larkspur/i, "SMB-25 names the studio; it signs with {{studio_name}}");
  const people = canonPeople();
  assert.ok(people.size >= 80, `only ${people.size} names were derived from canon/people.md`);
  for (const person of people) assert.ok(!text.includes(person), `SMB-25 names the person ${person}`);
});

// ============================================== T-K6, T-L6: no figure

for (const [id, key] of [["SMB-24", "T-K6"], ["SMB-25", "T-L6"]]) {
  test(`SMB-C4 ${key}: ${id} carries no figure and no digit outside a field id or a section number`, () => {
    const text = read(id);
    assert.deepEqual(moneyAmounts(text), [], `${id} states a money amount`);
    const residue = text
      .replace(new RegExp(`${DOCS[id].idPrefix}\\d{2}`, "g"), " ")
      .replace(/^(#{1,6}\s+)\d+\.(?=\s)/gm, "$1");
    assert.deepEqual([...new Set(residue.match(/\S*\d\S*/g) ?? [])], [], `${id} carries a digit-bearing token`);
  });
}

// ============================================== T-K7: the gate and the hold

test("SMB-C4 T-K7: SMB-24's gate names both issue date columns and the owner, and its closing note holds and never sends", () => {
  const text = read("SMB-24");
  const issueDates = logColumns().filter((c) => /^issue_.*_date$/.test(c));
  assert.equal(issueDates.length, 2, "SMB-23 no longer carries exactly two issue date columns");

  const gate = theSection(text, /before a request is drafted/i, "the gate");
  for (const column of issueDates) {
    assert.ok(gate.body.includes(`\`${column}\``), `the gate does not name ${column}`);
  }
  assert.match(gate.body, /open support issue/i, "the gate does not name the open support issue");
  assert.match(gate.body, /\bowner\b/i, "the gate does not send the project to the owner");
  assert.match(gate.body, /no request is drafted/i, "the gate does not say no request is drafted");

  const closing = theSection(text, /closing note/i, "the closing note");
  assert.match(closing.body, /held for the owner/i, "the closing note does not hold the draft for the owner");
  assert.match(closing.body, /never sends/i, "the closing note does not say the loop never sends");
  assert.match(closing.body, /stops/i, "the closing note does not stop on an empty required slot");
  assert.match(closing.body, /working file/i, "the closing note does not forbid filling from a working file");

  const never = theSection(text, /never says/i, "what a request never says");
  for (const word of ["incentive", "rating", "project log"]) {
    assert.match(never.body, new RegExp(word, "i"), `what a request never says does not name ${word}`);
  }
});

// ============================================== T-L7: start and stop

test("SMB-C4 T-L7: SMB-25's start and stop section carries the start, hold, privacy and stop rules", () => {
  const text = read("SMB-25");
  const rules = theSection(text, /starts and stops/i, "when the sequence starts and stops");
  const checks = [
    [/starts only for a completed project/i, "the start rule"],
    [/open support issue/i, "the open support issue the start rule tests"],
    [/held for the owner/i, "the hold rule"],
    [/never sen[dt]/i, "the never-sends rule"],
    [/never names the client/i, "the never-names-the-client rule"],
    [/property address/i, "the address half of the privacy rule"],
    [/project name/i, "the project-name half of the privacy rule"],
    [/\bstops\b/i, "the stop rule"],
    [/\brepl(y|ies)\b/i, "the reply that stops the sequence"],
    [/no further messages/i, "the opt-out that stops the sequence"],
    [/incentive/i, "the no-incentive rule"],
  ];
  for (const [pattern, label] of checks) assert.match(rules.body, pattern, `section 7 does not carry ${label}`);

  const closing = theSection(text, /closing note/i, "the closing note");
  assert.match(closing.body, /held for the owner/i, "the closing note does not hold the draft for the owner");
  assert.match(closing.body, /stops/i, "the closing note does not stop on an empty required slot");
  assert.match(closing.body, /working file/i, "the closing note does not forbid filling from a working file");
});

// ============================================== T-K8, T-L8: the house screens

for (const [id, key] of [["SMB-24", "T-K8"], ["SMB-25", "T-L8"]]) {
  test(`SMB-C4 ${key}: ${id} passes R-MOCK, R-NOSTATUTE, the capitalized screen, ASCII, no dash, its word band and a built DOCX`, () => {
    const text = read(id);

    const hits = denyHits(text, PAYMENT_INSTRUMENTS);
    assert.deepEqual(hits, [], `${id} names a payment instrument (${hits.join("; ")}) (rule R-MOCK)`);

    assert.doesNotMatch(text, STATUTE, `${id} cites a statute or a regulator (rule R-NOSTATUTE)`);

    // Every id-shaped token is the template's own class.
    for (const token of new Set(text.match(/\b[A-Z]{2,4}-[A-Z]{2,4}-\d+\b/g) ?? [])) {
      assert.ok(token.startsWith(DOCS[id].idPrefix), `${id} carries the id ${token}, outside ${DOCS[id].idPrefix} (rule R-NS)`);
    }

    // The capitalized screen. The allowed set is derived from canon and the
    // spec, never from the document: the canon entities the spec declares,
    // the document's own title read off the spec name, and one furniture word.
    const companies = canonCompanies();
    const title = specOf(id).name.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
    const allowed = allowedFrom({
      derived: [...specOf(id).canon_entities.map((cid) => companies.get(cid)), title],
      furniturePhrases: [],
      furnitureWords: ["AI"],
    });
    const screened = text
      .replace(new RegExp(`${DOCS[id].idPrefix}\\d{2}`, "g"), " ")
      .replace(/`[^`]*`/g, " ");
    assert.deepEqual(unscreenedPhrases(screened, allowed), [], `${id} carries an unscreened capitalized phrase (rule R-ROLE)`);
    assert.deepEqual(unscreenedWords(screened, allowed), [], `${id} carries an unscreened capitalized word (rule R-ROLE)`);

    assert.ok(!text.includes("\u2014"), `${id} carries an em dash (U+2014)`);
    assert.ok(!text.includes("\u2013"), `${id} carries an en dash (U+2013)`);
    const nonAscii = [...new Set(text.match(/[^\x00-\x7F]/g) ?? [])];
    assert.deepEqual(nonAscii, [], `${id} carries non-ASCII character(s) ${nonAscii.join(" ")}`);

    const words = text.split(/\s+/).filter((w) => w.length > 0 && w !== "|").length;
    const [low, high] = DOCS[id].band;
    assert.ok(words >= low && words <= high, `${id} runs ${words} words, outside the ${low} to ${high} band`);

    assert.ok(existsSync(docxPath(id)), `${docxPath(id)} is not on disk; run datagen build-docx ${id}`);
    assert.ok(statSync(docxPath(id)).size > 0, `${docxPath(id)} is empty`);
  });
}

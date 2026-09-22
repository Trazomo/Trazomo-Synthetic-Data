// Small business cluster 3: the structural screen over the drafted surface of
// the money wave.
//
//   artifacts/SMB-30/weekly-owner-report-template.md
//     the blank weekly owner report template: fourteen fields, eleven of them
//     required, one optional field left without a slot and without a line of
//     text. It is the only drafted artifact in cluster 3, and the only one of
//     the seven that carries no figure at all.
//
// tests/drafted/smb-c2a-drafted-screen.test.js is the house style this file
// follows, and its markdown table parser, section parser, canon name screen,
// token machinery, blank-slot predicate and deny-list matcher are the ones
// reused here: the document is read lazily inside each test at a path derived
// from its own spec entry, every expectation is re-derived from committed
// bytes rather than retyped, and no section of the document under test is ever
// allowed to license its own content.
//
// What this file deliberately does NOT know: whether a filled report ties to
// the rows. That is SMB-E-cashflow-1 and SMB-E-cashflow-3, a property of the
// report a learner produces, and the data repo does not hold it (cluster-3.md
// section 2.7, "How a template satisfies every figure ties to SMB-17 and
// SMB-18"). What this file does know is the template's own half: that every
// required field has a slot, that the two-reading metric is two figures and an
// assumption, that the provisional rule names the fields it bites on, and that
// every source column the template names still exists upstream.
//
// The mutation this file exists to catch, in the data plan's own words: a
// source column renamed in SMB-17 or SMB-18 after the template is written,
// which leaves the template naming a column that no longer exists and which
// nothing else would catch.
//
// Seven mechanical rules are stated once here and used throughout.
//
//   The shipped-bytes rule. The document is read from the tree as it ships, at
//   a path derived from its own spec entry rather than typed, so a spec rename
//   moves this screen with it rather than orphaning a path.
//
//   The upstream rule (T-G5). No column name is typed into this file. Every
//   name a source_columns cell carries is resolved against spec.columns for
//   SMB-17 and SMB-18, read out of specs/artifact-specs.yaml at test time. A
//   column renamed upstream fails here by name, and a cell reaching for a
//   column of any other artifact fails the same way.
//
//   The token rule (T-G4). Every placeholder token is recomputed as the
//   snake_case of the field name it belongs to rather than compared against a
//   list, so a renamed field with a stale token fails by name.
//
//   The blank-slot predicate (T-G3). One function, blankSlots, and the caller
//   supplies the declarations and whether each slot is filled. Nothing about
//   which field is expected to be blank reaches it. It returns one, and that
//   one is optional: a rule that finds empty slots without reading the
//   required column blocks on a field this template was free to leave empty.
//
//   The predicate rule (T-G8, T-G9). The two-reading metric and the
//   provisional set are found from the required-field list's own columns, not
//   from a list of field ids: two required figure fields sourced from the
//   settled-amount column and read as of the report date, one required field
//   sharing their first word and sourcing no column at all, and exactly three
//   fields whose window rule is the report week. Renumbering the fields moves
//   this screen with them; deleting one does not.
//
//   The absence screens (T-G6, T-G7, T-G10). Person and company names are
//   canon's own, parsed out of canon/people.md and canon/companies.md. The
//   figure screen is tests/helpers/money-shape.js plus a digit sweep, and the
//   payment-instrument vocabulary is the hoisted C1 deny-list extended with
//   the 2a and 2b phrases rather than copied. The number of terms excised from
//   it is asserted to be zero.
//
//   The self-licensing rule. Where a section of the document has to be checked
//   against a fact, the fact comes from the required-field list or from the
//   yaml, never from the section itself. The provisional section is checked
//   against the three fields the window_rule column selects; the two-reading
//   section is checked against the three fields the source and window columns
//   select.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { MOCK_VOCABULARY } from "../helpers/smb-mock-vocabulary.js";
import { moneyAmounts } from "../helpers/money-shape.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));

// ------------------------------------------------------------------ the tree

/**
 * Where a cluster 3 artifact ships, derived from its own spec entry: a
 * drafted-frozen id is one markdown file under artifacts/<ID>/, a deterministic
 * id is one CSV under datasets/smb/<name>/. The 2b derivation.
 */
function artifactPath(id) {
  const spec = specs.byId.get(id);
  assert.ok(spec, `${id} is not in specs/artifact-specs.yaml`);
  return spec.generation === "drafted-frozen"
    ? join(REPO_ROOT, "artifacts", id, `${spec.name}.md`)
    : join(REPO_ROOT, "datasets", "smb", spec.name, `${spec.name}.csv`);
}

const template = () => readFileSync(artifactPath("SMB-30"), "utf8");

/** The built DOCX, at the path build-docx writes it to. */
const docxPath = () =>
  join(REPO_ROOT, "artifacts", "SMB-30", "build", `${specs.byId.get("SMB-30").name}.docx`);

const COMPANIES_PATH = join(REPO_ROOT, "canon", "companies.md");
const PEOPLE_PATH = join(REPO_ROOT, "canon", "people.md");

/** The columns of an upstream spec, read out of the yaml rather than typed. */
function columnsOf(id) {
  const spec = specs.byId.get(id);
  assert.ok(spec, `${id} is not in specs/artifact-specs.yaml`);
  assert.ok(
    Array.isArray(spec.columns) && spec.columns.length > 0,
    `${id} carries no columns in the spec, so the source-column screen would pass vacuously`
  );
  return spec.columns;
}

// --------------------------------------------------------------- pinned facts

/** The required-field list's columns, cluster-3.md section 2.7. */
const FIELD_COLUMNS = [
  "field_id", "field_name", "required", "placeholder_token", "source_columns", "window_rule",
];

/** The one id class rule R-NS namespaces for SMB-30, and no other. */
const FIELD_ID = /^RPT-LDB-\d{2}$/;

/** The counts section 2.7 fixes; every discrimination below is meaningless at any other. */
const FIELD_COUNT = 14;
const REQUIRED_COUNT = 11;
const OPTIONAL_COUNT = 3;
const BLANK_SLOT_COUNT = 1;
const WEEK_BOUNDED_COUNT = 3;
const AS_OF_COUNT = 5;
const NOT_A_FIGURE_COUNT = 6;

/**
 * The closed window_rule vocabulary. Three values and no fourth: the provisional
 * set has to be derivable from this column rather than judged, and a free-text
 * cell would make it judged again.
 */
const WINDOW_WEEK = "bounded by the report week";
const WINDOW_AS_OF = "as of the report date";
const WINDOW_NONE = "not a figure";
const WINDOW_RULES = [WINDOW_WEEK, WINDOW_AS_OF, WINDOW_NONE];

/** The six sections, in the fixed order of section 2.7. */
const SECTION_TITLES = [
  "1. How to use this template",
  "2. Required-field list",
  "3. The report",
  "4. One metric defined twice",
  "5. The provisional rule",
  "6. Before this report is generated from",
];

/** The word band section 1.1 fixes, measured the C2 way. */
const BAND = [700, 1000];

/** The marker the provisional rule puts beside an open-window figure. */
const MARKER = "PROVISIONAL";

const pad = (n) => String(n).padStart(2, "0");

// -------------------------------------------------------------- table parsing

const isTableLine = (line) => line.trim().startsWith("|");
const tableCells = (line) => line.split("|").slice(1, -1).map((c) => c.trim());
const isRule = (cells) => cells.every((c) => /^:?-+:?$/.test(c));

/** A cell as data: markdown code ticks and bold marks are presentation. */
const cellValue = (cell) => cell.replace(/`/g, "").replace(/\*\*/g, "").trim();

/**
 * Every markdown table in `text` whose header cells are exactly `columns`, in
 * any order, as arrays of row objects keyed by the header's own names. A
 * reordered table still parses and a renamed column fails loudly. Each row also
 * carries `raw`, the same cells with their code ticks intact, because the
 * source-column screen distinguishes a backticked column name from ordinary
 * prose sharing the cell with it.
 */
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

/** The one table carrying `columns`, or a failure naming how many were found. */
function theTable(text, columns, label) {
  const tables = tablesWithColumns(text, columns);
  assert.equal(
    tables.length, 1,
    `${label} carries ${tables.length} tables with the columns ${columns.join(", ")}, expected exactly 1`
  );
  assert.ok(tables[0].length > 0, `${label} parsed to no rows`);
  return tables[0];
}

// ------------------------------------------------------------------ sections

/**
 * The `## ` sections of a document as `{title, body}`, in file order, plus
 * everything above the first one as the header block. The 2a parser.
 */
function sections(text) {
  const lines = text.split("\n");
  const heads = [];
  for (const [i, line] of lines.entries()) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) heads.push({ title: m[1], line: i });
  }
  assert.ok(heads.length > 0, "the document carries no ## sections");
  const out = [];
  for (const [k, head] of heads.entries()) {
    const end = k + 1 < heads.length ? heads[k + 1].line : lines.length;
    out.push({ title: head.title, body: lines.slice(head.line + 1, end).join("\n") });
  }
  return { header: lines.slice(0, heads[0].line).join("\n"), sections: out };
}

/** The one `## ` section whose title matches, or a failure saying which titles exist. */
function theSection(text, pattern, label) {
  const all = sections(text).sections;
  const found = all.filter((s) => pattern.test(s.title));
  assert.equal(
    found.length, 1,
    `${label}: ${found.length} sections match ${pattern}, expected exactly 1`
    + ` (titles: ${all.map((s) => s.title).join(" / ")})`
  );
  return found[0];
}

// -------------------------------------------------------- the token machinery

const TOKEN = /\{\{([a-z0-9_]+)\}\}/g;

/** Every placeholder token in `text`, in file order, duplicates kept. */
const tokensIn = (text) => [...text.matchAll(TOKEN)].map((m) => m[1]);

/** A field name as its own token name: lowercase, and every run of punctuation a single underscore. */
const snakeCase = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

/**
 * THE blank-slot predicate (T-G3). A declared field is blank when the document's
 * body carries no placeholder token for it. The caller supplies the
 * declarations and whether each one's slot is filled; nothing about which field
 * is expected to be blank reaches this function.
 */
const blankSlots = (fields) => fields.filter((f) => !f.filled).map((f) => f.id);

/** SMB-30's fourteen declared fields, joined to their body sections. */
function templateFields() {
  const text = template();
  const declared = theTable(text, FIELD_COLUMNS, "the template's required-field list");

  const lines = text.split("\n");
  const heads = [];
  for (const [i, line] of lines.entries()) {
    const m = line.match(/^###\s+(.+?)\s+\((RPT-LDB-\d{2})\)\s*$/);
    if (m) heads.push({ name: m[1], id: m[2], line: i });
  }
  const bodyEnd = (k) => {
    if (k + 1 < heads.length) return heads[k + 1].line;
    const next = lines.findIndex((l, i) => i > heads[k].line && /^##\s/.test(l));
    return next < 0 ? lines.length : next;
  };
  const bodyById = new Map(
    heads.map((h, k) => [h.id, { name: h.name, body: lines.slice(h.line + 1, bodyEnd(k)).join("\n") }])
  );

  return { text, declared, heads, bodyById };
}

// ------------------------------------------------------------- the canon join

/**
 * `canon/companies.md` as id -> name, the 2a parser. A cast row carries its
 * status as a trailing parenthetical on the name, which is canon's annotation
 * rather than part of the name, so it is stripped.
 */
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
      const id = cellValue(cells[0] ?? "");
      if (!/^co-\d{3}$/.test(id)) continue;
      out.set(id, cellValue(cells[1] ?? "").replace(/\s*\([^)]*\)\s*$/, "").trim());
    }
  }
  assert.ok(out.size > 0, "canon/companies.md parsed to no company rows");
  return out;
}

/**
 * Every name canon seats or records: the `Name`, `Retired name` and
 * `Frozen name` columns of `canon/people.md`. A drafted surface in this pack
 * carries none of them (rule R-ROLE).
 */
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

/**
 * Terms excised from the R-MOCK vocabulary for this screen. 2a excised exactly
 * one, "square", because the approved proposal's own rate basis says "per
 * square foot". A blank report template says nothing of the kind and names no
 * unit at all, so nothing is excised here, and that is asserted rather than
 * assumed, the 2b discipline: an excision added later without a reason breaks
 * this line first.
 */
const DROPPED = [];
assert.equal(DROPPED.length, 0, "a term was excised from the deny list without updating this assertion");

/**
 * Multi-word instruments and the British spelling the single-word C1 list
 * cannot reach, carried from the 2a and 2b screens unchanged. The base list is
 * imported rather than copied (tests/helpers/smb-mock-vocabulary.js); only the
 * phrases are local.
 */
const C2_PHRASES = [
  "card network", "wire transfer", "payment gateway", "payment processor",
  "routing number", "sort code", "account number",
  "authorisation", "authorization code", "reference token",
];

const PAYMENT_INSTRUMENTS = [...MOCK_VOCABULARY.filter((t) => !DROPPED.includes(t)), ...C2_PHRASES];

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The first match of every list term in `text`, on a word boundary, case-insensitively. */
function denyHits(text, terms) {
  const hits = [];
  for (const term of terms) {
    const m = new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").exec(text);
    if (m) hits.push(`${m[0]} (at index ${m.index})`);
  }
  return hits;
}

// ================================================================ the spec pin

test("SMB-C3 T-G: SMB-30 is a drafted-frozen template declaring no canon entity, and it is on disk", () => {
  const spec = specs.byId.get("SMB-30");
  assert.ok(spec, "SMB-30 is not in specs/artifact-specs.yaml");
  assert.equal(spec.generation, "drafted-frozen", `SMB-30 is generation ${spec.generation}`);
  assert.deepEqual(
    spec.canon_entities, [],
    "SMB-30 declares canon entities; the whole of the absence screen below rests on the declaration being empty"
  );
  assert.ok(
    existsSync(artifactPath("SMB-30")),
    `${artifactPath("SMB-30")} is not on disk; the template has not been drafted`
  );
});

test("SMB-C3: the template runs the six sections the data plan fixes, in order", () => {
  assert.deepEqual(
    sections(template()).sections.map((s) => s.title), SECTION_TITLES,
    "the template's sections are not the fixed order of cluster-3.md section 2.7 (title and use note,"
    + " the required-field list, the body, the two-reading metric, the provisional rule, the closing note)"
  );
});

// ============================================== the fields and their slots

test("SMB-C3 T-G1: the required-field list and the body sections are the same fields, in the same order", () => {
  const { declared, heads } = templateFields();
  assert.equal(
    declared.length, FIELD_COUNT,
    `the required-field list carries ${declared.length} rows, expected ${FIELD_COUNT}`
  );
  assert.equal(
    heads.length, FIELD_COUNT,
    `the body carries ${heads.length} field sections, expected ${FIELD_COUNT}`
  );

  assert.deepEqual(
    declared.map((r) => r.field_id),
    declared.map((_, i) => `RPT-LDB-${pad(i + 1)}`),
    "the field ids are not RPT-LDB-01 upward, zero padded, in document order with no gap"
  );
  for (const row of declared) assert.match(row.field_id, FIELD_ID, `${row.field_id} is not an RPT-LDB id`);

  assert.deepEqual(
    heads.map((h) => h.id), declared.map((r) => r.field_id),
    "the body sections and the required-field list do not run the same fields in the same order"
  );
  assert.deepEqual(
    heads.map((h) => h.name), declared.map((r) => r.field_name),
    "a body section heading names a field differently from the required-field list"
  );
});

test("SMB-C3 T-G2: eleven fields are required and three are optional, and the list is the only place that is said", () => {
  const { declared, bodyById } = templateFields();
  for (const row of declared) {
    assert.ok(["yes", "no"].includes(row.required), `${row.field_id} carries required "${row.required}"`);
  }
  const required = declared.filter((r) => r.required === "yes");
  const optional = declared.filter((r) => r.required === "no");
  assert.equal(required.length, REQUIRED_COUNT, `${required.length} fields are required, expected ${REQUIRED_COUNT}`);
  assert.equal(optional.length, OPTIONAL_COUNT, `${optional.length} fields are optional, expected ${OPTIONAL_COUNT}`);

  // The required flag is stated once. A body section that restates it lets a
  // reader answer the discrimination question without reading the table.
  for (const [id, section] of bodyById) {
    assert.ok(
      !/\brequired\b/i.test(section.body),
      `${id}'s body section restates its required flag; the required-field list is the authority`
      + " and the body never repeats it"
    );
  }
});

test("SMB-C3 T-G3: every required field has a slot, exactly one field of any flag has none, and that one is optional", () => {
  const { declared, bodyById } = templateFields();

  const fields = declared.map((row) => {
    const section = bodyById.get(row.field_id);
    assert.ok(section, `${row.field_id} is declared but has no body section`);
    return {
      id: row.field_id,
      name: row.field_name,
      required: row.required === "yes",
      filled: tokensIn(section.body).length > 0,
    };
  });

  const blank = blankSlots(fields);
  assert.equal(
    blank.length, BLANK_SLOT_COUNT,
    `${blank.length} fields have an empty slot (${blank.join(", ")}), expected exactly ${BLANK_SLOT_COUNT};`
    + " a rule that finds empty slots without reading the required column has to return one, and that one"
    + " has to be a field the template was free to leave empty"
  );

  const blankRequired = blankSlots(fields.filter((f) => f.required));
  assert.deepEqual(
    blankRequired, [],
    `${blankRequired.length} required fields have an empty slot (${blankRequired.join(", ")}); every one`
    + " of the eleven required fields carries a slot"
  );
  const blankOptional = blankSlots(fields.filter((f) => !f.required));
  assert.deepEqual(
    blankOptional, blank,
    "the one empty slot is not on an optional field; the whole discrimination is that the rule blocks on a"
    + " field the required-field list never asked for"
  );

  // The one blank carries nothing at all, not merely no token, and it is the
  // only bare section in the document.
  const bare = [...bodyById].filter(([, s]) => s.body.trim() === "").map(([id]) => id);
  assert.deepEqual(
    bare, blank,
    `${bare.length} body sections are bare (${bare.join(", ")}); the one empty slot is the one bare section`
    + " and no other section is empty"
  );

  // The declared placeholder_token column agrees with the body, both ways, so a
  // template cannot advertise a token it does not carry.
  for (const row of declared) {
    const inBody = tokensIn(bodyById.get(row.field_id).body);
    const inList = tokensIn(row.placeholder_token);
    assert.deepEqual(
      inList, inBody,
      `${row.field_id} lists ${inList.length} tokens and its body carries ${inBody.length};`
      + " the required-field list and the body have to agree on whether the slot exists"
    );
  }
});

test("SMB-C3 T-G4: every non-empty token is the snake_case of its own field name, recomputed", () => {
  const { text, declared, bodyById } = templateFields();
  let checked = 0;
  for (const row of declared) {
    const tokens = tokensIn(bodyById.get(row.field_id).body);
    assert.ok(tokens.length <= 1, `${row.field_id} carries ${tokens.length} tokens in one body section`);
    if (tokens.length === 0) continue;
    assert.equal(
      tokens[0], snakeCase(row.field_name),
      `${row.field_id} is "${row.field_name}" and carries {{${tokens[0]}}}, not {{${snakeCase(row.field_name)}}}`
    );
    checked += 1;
  }
  assert.equal(
    checked, FIELD_COUNT - BLANK_SLOT_COUNT,
    `${checked} tokens were recomputed, expected ${FIELD_COUNT - BLANK_SLOT_COUNT}`
  );

  // Every brace token anywhere in the document is one of those slots. A
  // specimen token in the prose would make the template's own accounting of its
  // slots untrue, and the two-reading section quotes three of them.
  const declaredTokens = new Set(declared.flatMap((r) => tokensIn(r.placeholder_token)));
  for (const token of tokensIn(text)) {
    assert.ok(
      declaredTokens.has(token),
      `the template carries {{${token}}}, which is not a token of its own required-field list`
    );
  }
});

// ================================================== the upstream column join

test("SMB-C3 T-G5: every source column resolves in SMB-17 or SMB-18, read out of the yaml, and none comes from anywhere else", () => {
  const { declared, text } = templateFields();
  const upstream = new Set([...columnsOf("SMB-17"), ...columnsOf("SMB-18")]);

  let resolved = 0;
  let sourceless = 0;
  for (const row of declared) {
    const raw = row.raw.source_columns;
    const named = [...raw.matchAll(/`([a-z0-9_]+)`/g)].map((m) => m[1]);

    // A cell naming no column has to say so in the one word the column's
    // vocabulary allows, so "no source" and "a source nobody wrote down" are
    // different cells rather than the same empty string.
    if (named.length === 0) {
      assert.match(
        raw, /^none\b/,
        `${row.field_id} names no source column and its cell reads "${raw}"; a field with no source says none`
      );
      sourceless += 1;
      continue;
    }

    for (const name of named) {
      assert.ok(
        upstream.has(name),
        `${row.field_id} names the source column ${name}, which is in neither SMB-17's nor SMB-18's`
        + " spec.columns; the template names a column that does not exist upstream"
      );
      resolved += 1;
    }
  }
  assert.ok(resolved >= REQUIRED_COUNT, `only ${resolved} source columns were resolved; the join has gone vacuous`);
  assert.ok(sourceless > 0, "every field names a source column, so the none case is never exercised");

  // The prose sharing a cell with a column name is prose. A snake_case word
  // left unticked would slip past the resolution above, so the residue of every
  // cell is swept for one.
  for (const row of declared) {
    const residue = row.raw.source_columns.replace(/`[^`]*`/g, " ");
    assert.ok(
      !/[a-z]+_[a-z]/.test(residue),
      `${row.field_id}'s source_columns cell carries the unticked snake_case word in "${residue}";`
      + " a column name is backticked or it is not a column name"
    );
  }

  // The other half of "no cell names a column of any other artifact": SMB-19 is
  // the file that shares this cluster's vocabulary and shares none of its
  // columns, so its own columns are swept out of the whole document rather than
  // only out of the table.
  const foreign = columnsOf("SMB-19").filter((c) => !upstream.has(c));
  assert.ok(foreign.length > 0, "SMB-19 shares every column with SMB-17 and SMB-18, so this sweep is vacuous");
  for (const column of foreign) {
    assert.ok(
      !text.includes(column),
      `the template names ${column}, which is a column of the aging summary; the module's corpus is the`
      + " issued invoice register and the mock payment log only"
    );
  }
});

// ================================================ the two-reading metric

test("SMB-C3 T-G8: the two-reading metric is two required figure fields and one required assumption field, found by predicate", () => {
  const { declared, text } = templateFields();
  const settledColumn = columnsOf("SMB-18").find((c) => /^settled_amount/.test(c));
  assert.ok(settledColumn, "SMB-18 carries no settled-amount column, so the predicate below selects nothing");

  const names = (row) => [...row.raw.source_columns.matchAll(/`([a-z0-9_]+)`/g)].map((m) => m[1]);

  // The two readings: required, sourced from the settled-amount column, and
  // read as of the report date rather than over the report week. The third
  // field sourced from that column is the week's settled total, and the window
  // column is what tells it apart from these two.
  const readings = declared.filter(
    (r) => r.required === "yes" && names(r).includes(settledColumn) && r.window_rule === WINDOW_AS_OF
  );
  assert.equal(
    readings.length, 2,
    `${readings.length} required fields read ${settledColumn} as of the report date`
    + ` (${readings.map((r) => r.field_id).join(", ")}), expected exactly 2: the metric is defined twice`
  );

  // The assumption: required, sourcing no column at all, and sharing the first
  // word of its name with both readings, which is what makes it their sentence
  // rather than a fourteenth unrelated field.
  const stem = readings[0].field_name.split(/\s+/)[0].toLowerCase();
  assert.equal(
    readings[1].field_name.split(/\s+/)[0].toLowerCase(), stem,
    `the two readings are "${readings[0].field_name}" and "${readings[1].field_name}" and do not share a first word`
  );
  const assumption = declared.filter(
    (r) => r.required === "yes"
      && names(r).length === 0
      && r.field_name.split(/\s+/)[0].toLowerCase() === stem
  );
  assert.equal(
    assumption.length, 1,
    `${assumption.length} required fields state the ${stem} assumption`
    + ` (${assumption.map((r) => r.field_id).join(", ")}), expected exactly 1`
  );

  // Each of the three is a slot of its own. Two readings sharing one token
  // would be one reading printed twice.
  const trio = [...readings, ...assumption];
  const tokens = trio.map((r) => tokensIn(r.placeholder_token));
  for (const [i, t] of tokens.entries()) {
    assert.equal(t.length, 1, `${trio[i].field_id} carries ${t.length} tokens, expected exactly 1`);
  }
  assert.equal(new Set(tokens.flat()).size, 3, "the two readings and their assumption do not carry three distinct tokens");

  // The section says so in the document's own words, and quotes all three
  // tokens. The three come from the table above, never from the section.
  const metric = theSection(text, /metric/i, "the two-reading metric");
  for (const row of trio) {
    const token = tokensIn(row.placeholder_token)[0];
    assert.ok(
      metric.body.includes(`{{${token}}}`),
      `the two-reading section does not carry {{${token}}}, the slot of ${row.field_id} "${row.field_name}"`
    );
  }
  assert.match(
    metric.body, /incomplete/i,
    "the two-reading section does not say that a report carrying either figure without the assumption is"
    + " incomplete, which is the demand the whole field makes"
  );
});

// ==================================================== the provisional rule

test("SMB-C3 T-G9: exactly three fields are week bounded, and the provisional section names all three", () => {
  const { declared, text } = templateFields();

  for (const row of declared) {
    assert.ok(
      WINDOW_RULES.includes(row.window_rule),
      `${row.field_id} carries the window rule "${row.window_rule}", which is not one of`
      + ` ${WINDOW_RULES.map((w) => `"${w}"`).join(", ")}; a free-text window makes the provisional set judged`
      + " rather than derived"
    );
  }
  const byRule = (rule) => declared.filter((r) => r.window_rule === rule);
  const weekly = byRule(WINDOW_WEEK);
  assert.equal(
    weekly.length, WEEK_BOUNDED_COUNT,
    `${weekly.length} fields are bounded by the report week (${weekly.map((r) => r.field_id).join(", ")}),`
    + ` expected exactly ${WEEK_BOUNDED_COUNT}`
  );
  assert.equal(byRule(WINDOW_AS_OF).length, AS_OF_COUNT, "the as-of field count has moved");
  assert.equal(byRule(WINDOW_NONE).length, NOT_A_FIGURE_COUNT, "the not-a-figure field count has moved");

  const provisional = theSection(text, /provisional/i, "the provisional rule");
  assert.ok(
    provisional.body.includes(MARKER),
    `the provisional section does not carry the marker ${MARKER} it is the rule for`
  );
  for (const row of weekly) {
    assert.ok(
      provisional.body.includes(row.field_id),
      `the provisional section does not name ${row.field_id}, which is bounded by the report week and is`
      + " therefore one of the three the rule bites on"
    );
    assert.ok(
      provisional.body.toLowerCase().includes(row.field_name.toLowerCase()),
      `the provisional section does not name "${row.field_name}" (${row.field_id}) by name`
    );
  }
  // And the as-of figures are stated not to be provisional, which is the half
  // of the rule that stops it from being read as "every figure is provisional".
  for (const row of byRule(WINDOW_AS_OF)) {
    assert.ok(
      !new RegExp(`${row.field_id}`).test(provisional.body),
      `the provisional section names ${row.field_id}, which is read as of the report date and is not provisional`
    );
  }

  // The field that collects them is required, sources no column and names the
  // marker's own word, and it is not one of the three.
  const collector = declared.filter(
    (r) => r.required === "yes"
      && /provisional/i.test(r.field_name)
      && !weekly.some((w) => w.field_id === r.field_id)
  );
  assert.equal(
    collector.length, 1,
    `${collector.length} required fields collect the provisional figures, expected exactly 1`
  );
  assert.ok(
    provisional.body.includes(collector[0].field_id),
    `the provisional section does not name ${collector[0].field_id}, the field every marked figure is named in`
  );
});

// ===================================================== the absence screens

test("SMB-C3 T-G6: the template names no canon company, no canon person and neither canon string the plan pins", () => {
  const text = template();
  const companies = canonCompanies();
  const studioName = companies.get("co-100");
  assert.ok(studioName?.length > 0, "canon carries no co-100 name, so the absence screen would pass vacuously");

  for (const needle of ["co-100", studioName]) {
    assert.ok(
      !text.includes(needle),
      `the template carries "${needle}"; it declares canon_entities: [] and the LDB id namespace is a token`
      + " rather than a canon reference"
    );
  }
  for (const [id, name] of companies) {
    assert.ok(!text.includes(id), `the template carries the canon id ${id}`);
    assert.ok(name.length > 0 && !text.includes(name), `the template names the canon company ${name} (${id})`);
  }

  const people = canonPeople();
  assert.ok(
    people.size >= 80,
    `only ${people.size} names were derived from canon/people.md; the name build has broken`
  );
  for (const person of people) {
    assert.ok(
      !text.includes(person),
      `the template names the person ${person}; a human in this pack is a role or a household (rule R-ROLE)`
    );
  }
});

test("SMB-C3 T-G7: the template carries no figure and no digit-bearing token other than a field id or a section number", () => {
  const text = template();

  assert.deepEqual(
    moneyAmounts(text), [],
    "the template states a money amount; a blank template carries no client, no price, no date and no count,"
    + " and the two-reading metric is defined in words rather than demonstrated in figures (U-J)"
  );

  // Field ids and the six section numbers are the only place a digit belongs.
  const residue = text
    .replace(/RPT-LDB-\d{2}/g, " ")
    .replace(/^(#{1,6}\s+)\d+\.(?=\s)/gm, "$1");
  const digits = residue.match(/\S*\d\S*/g) ?? [];
  assert.deepEqual(
    [...new Set(digits)], [],
    "the template states figures; a worked example would put a dated figure inside a canon_entities: []"
    + " template and would hand a learner an answer to copy instead of a slot to fill (U-J)"
  );
});

test("SMB-C3 T-G10: the template names no processor, no gateway, no card network, no bank product and no instrument", () => {
  const hits = denyHits(template(), PAYMENT_INSTRUMENTS);
  assert.deepEqual(
    hits, [],
    `the template names a payment instrument (${hits.join("; ")}); this pack describes terms, settlement and`
    + " draws and names no instrument (rule R-MOCK)"
  );
  assert.ok(
    PAYMENT_INSTRUMENTS.length >= MOCK_VOCABULARY.length,
    "the deny list is shorter than the hoisted C1 vocabulary it extends"
  );
});

test("SMB-C3: every id in the template belongs to the one namespaced class SMB-30 mints", () => {
  const candidates = template().match(/\b[A-Z]{3}(?:-[A-Z]{3})*-\d{2,}\b/g) ?? [];
  assert.ok(candidates.length > 0, "the template carries no id-shaped token at all, so this screen is vacuous");
  for (const id of new Set(candidates)) {
    assert.match(id, FIELD_ID, `the template carries the id ${id}, which is not of the RPT-LDB class (rule R-NS)`);
  }
});

test("SMB-C3: the template sits inside its word band, carries no em dash and no en dash, and is ASCII", () => {
  const text = template();
  // The band excludes a markdown table cell wall counted as its own word: a
  // "|" delimiter, whitespace on both sides, is structure rather than a word
  // (cluster-2.md NIT 2, carried into cluster-3.md section 1.1). Table cell
  // content itself still counts.
  const count = text.split(/\s+/).filter((w) => w.length > 0 && w !== "|").length;
  const [low, high] = BAND;
  assert.ok(count >= low && count <= high, `the template runs ${count} words, outside the ${low} to ${high} band`);

  // Written as escapes so this screen is not itself a hit for a grep over the
  // repo for the two characters it bans.
  assert.ok(!text.includes("—"), "the template carries an em dash (U+2014)");
  assert.ok(!text.includes("–"), "the template carries an en dash (U+2013)");

  const nonAscii = [...new Set(text.match(/[^\x00-\x7F]/g) ?? [])];
  assert.deepEqual(nonAscii, [], `the template carries the non-ASCII character(s) ${nonAscii.join(" ")}`);
});

test("SMB-C3: the template ships with a built DOCX beside it", () => {
  const path = docxPath();
  assert.ok(existsSync(path), `${path} is not on disk; run datagen build-docx SMB-30`);
  assert.ok(statSync(path).size > 0, `${path} is empty`);
});

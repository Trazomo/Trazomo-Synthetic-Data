// Small business cluster 2b: the structural screen over the drafted surface of
// the delivery wave.
//
//   artifacts/SMB-14/latest-status-update.md
//     the last written update the Okafor household received, dated 16 March
//     2026. It carries no defect by design: it is the standard the milestone
//     drafter's own output is judged against, so a defect here would make both
//     the staleness rule and the lateness rule unfalsifiable
//   artifacts/SMB-15/internal-status-notes.md
//     the owner's private notes as of 30 March 2026, carrying the two things
//     that must never reach a client draft: the internal rework figure and the
//     blunt passage that states it
//
// tests/drafted/smb-c2a-drafted-screen.test.js is the house style this file
// follows, and its section parser, header-field parser, canon name parser and
// deny-list matcher are the ones reused here: documents are read lazily inside
// each test, every expectation is re-derived from committed bytes rather than
// retyped, and no section of a document under test is ever allowed to license
// its own content.
//
// What this file deliberately does NOT know: whether the tone of SMB-15's two
// pinned passages is right. Tone is not machine-checkable and the data plan
// says so in section 2.11: the figure half of the plant is asserted here, the
// blunt half is made falsifiable by pinning the sentence verbatim, and judging
// the writing is Salvador's freeze review. What this file does know is that the
// two passages are exactly the bytes the plan froze, that the figure inside one
// of them is nowhere else in the cluster, and that both documents' dates still
// agree with the schedule they were drafted against.
//
// The two mutations this file exists to catch, in the data plan's own words: an
// SMB-16 planned date edited so that "seven days late" in SMB-15 is no longer
// true, and a cost figure that reaches SMB-14 through a later wording change.
//
// Seven mechanical rules are stated once here and used throughout.
//
//   The derive rule. Nothing about the schedule is typed into this file. The
//   late milestone is the row whose actual_completion is after its planned_end,
//   found by reading datasets/smb/milestone-schedule/ off disk; the number of
//   days late is subtracted from those two dates and then spelled out; the long
//   and short date forms both documents print are recomputed from the same two
//   cells. A schedule edit that orphans either document's prose fails here.
//
//   The shipped-bytes rule. Every cluster 2 file is read from the tree as it
//   ships, at a path derived from its own spec entry rather than typed.
//   tests/generators/smb-c2b-delivery.test.js regenerates the same three CSVs
//   through the engine instead, so the two screens reach the same rows by
//   different routes and can genuinely disagree.
//
//   The no-self-licensing rule. A set of "figures that are safe to repeat" is
//   harvested from the NINE other cluster 2 artifacts and never from SMB-15
//   itself, because a document that supplied its own allowed set would license
//   every figure it happens to carry. The same applies to SMB-14's citations:
//   the titles come out of the emitted SMB-13 index, not out of SMB-14.
//
//   The passage rule. A passage is a paragraph block or a single list item,
//   headings excluded. Both of SMB-15's plants are stated as counts of
//   passages, so the unit has to be defined once and used for both.
//
//   The plant rule. Every plant is asserted at BOTH cardinalities: the count
//   under the stated rule and the count with the one qualifier the rule names
//   dropped. P6 is 1 and 3, P7 is 1 and 2.
//
//   The milestone key rule. A milestone is "named" in prose by the first word
//   of its own name in the schedule, which is the word both documents use for
//   it. The six keys are asserted distinct before any of them is used, so the
//   derivation cannot silently alias two milestones onto one count.
//
//   The absence screens. Person names are canon's own seated, retired and
//   frozen names. The payment-instrument list is derived from the hoisted C1
//   vocabulary rather than copied, the 2a pattern, and the number of terms
//   excised from it is asserted to be zero: 2a needed one excision ("square",
//   for the proposal's "per square foot"), and the two delivery documents need
//   none.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { csvTable } from "../helpers/csv-table.js";
import { MOCK_VOCABULARY } from "../helpers/smb-mock-vocabulary.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));

// ------------------------------------------------------------------ the tree

/**
 * Where a cluster 2 artifact ships, derived from its own spec entry: a
 * drafted-frozen id is one markdown file under artifacts/<ID>/, a deterministic
 * id is one CSV under datasets/smb/<name>/. A spec rename moves this screen
 * with it rather than orphaning a typed path.
 */
function artifactPath(id) {
  const spec = specs.byId.get(id);
  assert.ok(spec, `${id} is not in specs/artifact-specs.yaml`);
  return spec.generation === "drafted-frozen"
    ? join(REPO_ROOT, "artifacts", id, `${spec.name}.md`)
    : join(REPO_ROOT, "datasets", "smb", spec.name, `${spec.name}.csv`);
}

const onDisk = (id) => readFileSync(artifactPath(id), "utf8");

const update = () => onDisk("SMB-14");
const notes = () => onDisk("SMB-15");
const smb12 = () => csvTable(onDisk("SMB-12"));
const smb13 = () => csvTable(onDisk("SMB-13"));
const smb16 = () => csvTable(onDisk("SMB-16"));

/** SMB-04, the client record the whole pack hangs off. C1's, and not a C2 id. */
const RECORD_PATH = join(
  REPO_ROOT, "datasets", "smb", "client-record-okafor", "client-record-okafor.json"
);
const record = () => JSON.parse(readFileSync(RECORD_PATH, "utf8"));

const COMPANIES_PATH = join(REPO_ROOT, "canon", "companies.md");
const PEOPLE_PATH = join(REPO_ROOT, "canon", "people.md");

/** The two drafted documents of 2b, for the properties that run over both. */
const drafted = () => [
  { id: "SMB-14", label: "latest-status-update.md", text: update(), band: [400, 700] },
  { id: "SMB-15", label: "internal-status-notes.md", text: notes(), band: [500, 900] },
];

/**
 * The nine other cluster 2 artifacts: the three 2a documents and the six
 * deterministic CSVs. This is the population the internal figure has to be
 * absent from, and the population the "safe to repeat" figures are harvested
 * out of. SMB-14 and SMB-15 are deliberately not in it.
 */
const OTHER_C2_IDS = [
  "SMB-06", "SMB-07", "SMB-08", "SMB-09", "SMB-10", "SMB-11", "SMB-12", "SMB-13", "SMB-16",
];

// --------------------------------------------------------------- pinned facts

/** SMB-14's sections, in the order cluster-2.md section 2.10 fixes. */
const UPDATE_SECTIONS = [
  "Where we are",
  "What finished since the last update",
  "The schedule",
  "What happens next",
  "What we need from you",
  "Documents attached",
];

/** SMB-15's sections, in the order section 2.11 fixes; the heading block is above them. */
const NOTES_SECTIONS = [
  "Where the job stands",
  "The schedule and what slipped",
  "Cost and margin",
  "The client",
  "What goes in the next update",
];

/** The three documents SMB-14 cites, section 2.10's content contract. */
const CITED_DOCUMENT_IDS = ["DOC-LDB-01", "DOC-LDB-06", "DOC-LDB-08"];

/**
 * The figure C3 has to match forever. Pinned here rather than derived, because
 * it is the one number in this cluster that a later edit must NOT be free to
 * move: section 7 puts one SMB-21 job-expense row at 6480.00 against it, and
 * SMB-15 is frozen when 2b merges, so C3 matches the figure rather than the
 * other way round. Everything else about the plant is derived; this is the pin.
 */
const INTERNAL_FIGURE = "$6,480.00";

/** Every shape the internal figure could reach a client-facing document in. */
const INTERNAL_FIGURE_FORMS = [
  INTERNAL_FIGURE,
  INTERNAL_FIGURE.slice(1),
  INTERNAL_FIGURE.slice(1).replace(/,/g, ""),
];

/** The milestone each plant sits on, and the task SMB-14's date is coupled to. */
const LATE_MILESTONE_ID = "MST-LDB-02";
const OPEN_MILESTONE_ID = "MST-LDB-06";
const STALE_TASK_ID = "TSK-LDB-12";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Enough number words to spell any slip this schedule can carry. */
const NUMBER_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven",
  "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen",
];

// ------------------------------------------------------------------- parsing

/** `2026-02-27` as `27 February 2026`, the long form this pack uses in prose. */
function longForm(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** `2026-02-27` as `27 February`, the short form the pinned passages use. */
function dayMonth(iso) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

/** Whole calendar days from `from` to `to`, both ISO dates. */
const daysBetween = (from, to) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);

/** `29700.00` as `$29,700.00`, the shape money takes in this pack's prose. */
const prose = (amount) =>
  `$${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MONEY = /\$[\d,]+\.\d{2}/g;

/** Every dollar figure in `text`, in file order, duplicates kept. */
const figuresIn = (text) => text.match(MONEY) ?? [];

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

/** `**Label:** value` lines of a header block, keyed by label. The 2a parser. */
function headerFields(text) {
  const out = new Map();
  for (const line of text.split("\n")) {
    const m = line.trim().match(/^\*\*(.+?):\*\*\s*(.*)$/);
    if (m) out.set(m[1].trim(), m[2].trim());
  }
  return out;
}

/**
 * The passages of a document: paragraph blocks split on blank lines, with a
 * bullet block broken into its individual items and heading-only blocks
 * dropped. Both of SMB-15's plants are counted in this unit, so it is defined
 * once here and used for both rather than being re-decided per test.
 */
function passages(text) {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter((b) => b.length > 0);
  const out = [];
  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length > 1 && lines.every((l) => /^[-*+]\s/.test(l))) out.push(...lines);
    else out.push(block);
  }
  return out.filter((p) => !/^#{1,6}\s/.test(p));
}

/**
 * A document broken into clauses: split on a sentence boundary or on the
 * word "and", so that a compound sentence pairing two unrelated facts (a
 * milestone's own completion beside a draw's due date, say) is not read as
 * licensing either fact for the other's date. SHOULD-FIX 2 and SHOULD-FIX 3
 * both need "the date beside this word is about this fact and no other", and
 * a whole sentence is too wide a unit for that once a sentence carries two
 * facts joined by "and".
 */
function clauses(text) {
  return text.split(/(?<=[.!?])\s+|\s+and\s+/).map((c) => c.trim()).filter((c) => c.length > 0);
}

// ---------------------------------------------------------- the schedule join

/** The six milestone rows, read off the shipped CSV. */
function milestones() {
  const table = smb16();
  assert.equal(table.rows.length, 6, `SMB-16 ships ${table.rows.length} milestones, expected 6`);
  return table.rows;
}

/**
 * How prose names a milestone: the first word of the milestone's own name.
 * Asserted distinct across the six before it is used anywhere, so a schedule
 * edit that made two milestones share a first word fails loudly here rather
 * than quietly collapsing two passage counts into one.
 */
const proseKey = (name) => name.split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, "");

function milestoneKeys() {
  const keys = milestones().map((m) => proseKey(m.milestone));
  assert.equal(
    new Set(keys).size, keys.length,
    `two milestones share a prose key (${keys.join(", ")}); the key can no longer tell them apart`
  );
  return keys;
}

/** Does `passage` name the milestone whose prose key is `key`? */
const names = (passage, key) => new RegExp(`\\b${key}\\b`, "i").test(passage);

/** The one milestone that completed after its planned end, derived not typed. */
function lateMilestone() {
  const late = milestones().filter((m) => m.actual_completion !== "" && m.actual_completion > m.planned_end);
  assert.equal(
    late.length, 1,
    `${late.length} milestones completed after their planned end (${late.map((m) => m.milestone_id).join(", ")}),`
    + " expected exactly one; both documents are drafted around there being one"
  );
  assert.equal(late[0].milestone_id, LATE_MILESTONE_ID, `the late milestone is now ${late[0].milestone_id}`);
  return late[0];
}

// ------------------------------------------------------------- the canon join

const isTableLine = (line) => line.trim().startsWith("|");
const tableCells = (line) => line.split("|").slice(1, -1).map((c) => c.trim());
const isRule = (cells) => cells.every((c) => /^:?-+:?$/.test(c));
const cellValue = (cell) => cell.replace(/`/g, "").replace(/\*\*/g, "").trim();

/**
 * `canon/companies.md` as id -> name, the 2a parser. A cast row carries its
 * status as a trailing parenthetical on the name, which is canon's annotation
 * rather than part of the name, so it is stripped; the derivation is then
 * checked against SMB-04's own studio and client names before it is trusted.
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
 * square foot". The two delivery documents say nothing of the kind, so nothing
 * is excised here, and that is asserted rather than assumed: an excision added
 * later without a reason breaks this line first.
 */
const DROPPED = [];
assert.equal(DROPPED.length, 0, "a term was excised from the deny list without updating this assertion");

/**
 * Multi-word instruments and the British spelling the single-word C1 list
 * cannot reach, mirroring the 2a screen's own extension. The base list is
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

// ======================================================= shape of the two files

test("SMB-C2B: both documents run the sections the data plan fixes, in order", () => {
  assert.deepEqual(
    sections(update()).sections.map((s) => s.title), UPDATE_SECTIONS,
    "SMB-14's sections are not the fixed order of cluster-2.md section 2.10 (header block, where we are,"
    + " what finished, the schedule, what happens next, what we need from you, documents attached)"
  );
  assert.deepEqual(
    sections(notes()).sections.map((s) => s.title), NOTES_SECTIONS,
    "SMB-15's sections are not the fixed order of section 2.11 (heading and as-of date, where the job"
    + " stands, the schedule and what slipped, cost and margin, the client, what goes in the next update)"
  );
});

test("SMB-C2B: SMB-14's header is SMB-04's project and client, the stale row's own refresh date and the index's owner role", () => {
  const fields = headerFields(sections(update()).header);
  const client = record().client;
  const companies = canonCompanies();

  // The canon derivation is checked against SMB-04 before it is used, so a
  // parse that silently returned the wrong column fails here rather than
  // passing an assertion vacuously.
  assert.equal(companies.get("co-131"), client.client_name, "canon's co-131 name and SMB-04's client_name disagree");

  assert.equal(fields.get("Project"), client.project_name, `SMB-14 names the project "${fields.get("Project")}"`);
  assert.equal(fields.get("Client"), client.client_name, `SMB-14 names the client "${fields.get("Client")}"`);

  // The update date is not a free choice and is not read off SMB-14. It is the
  // date SMB-12's one stale client-facing row was last refreshed: the hub and
  // the written update were current together on that day, and only the hub fell
  // behind afterwards. That coupling is what makes the SMB-12 plant credible,
  // so it is derived from SMB-12 and asserted here.
  const stale = smb12().rows.filter(
    (t) => t.internal_status === "complete" && t.client_visible_status === "in_progress"
  );
  assert.deepEqual(
    stale.map((t) => t.task_id), [STALE_TASK_ID],
    `${stale.length} tasks are complete internally and in_progress client side, expected exactly one`
  );
  assert.equal(
    fields.get("Update date"), longForm(stale[0].client_visible_updated_date),
    `SMB-14 is dated "${fields.get("Update date")}" and ${STALE_TASK_ID}'s client view was refreshed`
    + ` ${stale[0].client_visible_updated_date}; the two are the same day or the plant loses its story`
  );
  assert.equal(
    specs.byId.get("SMB-14").period.start, stale[0].client_visible_updated_date,
    "SMB-14's spec period no longer starts on the day the document is dated"
  );

  // The preparer is a role, and it is the role the index records as owning the
  // update row rather than a role this screen picked.
  const updates = smb13().rows.filter((d) => d.document_type === "update");
  assert.equal(updates.length, 1, `SMB-13 indexes ${updates.length} update documents, expected exactly 1`);
  assert.equal(
    updates[0].created_date, stale[0].client_visible_updated_date,
    "the indexed update row and the document's own date disagree"
  );
  assert.equal(
    fields.get("Prepared by"), `the ${updates[0].owner_role}`,
    `SMB-14 is prepared by "${fields.get("Prepared by")}" and SMB-13 records the update as owned by`
    + ` "${updates[0].owner_role}"; the preparer is that role and never a person`
  );
});

test("SMB-C2B: SMB-15's header is the project, the spec's own as-of date and the role the index records", () => {
  const fields = headerFields(sections(notes()).header);
  assert.equal(fields.get("Project"), record().client.project_name, "SMB-15 names a different project");

  const asOf = specs.byId.get("SMB-15").period.start;
  assert.equal(
    fields.get("As of"), longForm(asOf),
    `SMB-15 is written as of "${fields.get("As of")}" and its spec period starts ${asOf}`
  );

  // SMB-15 is itself an indexed document, DOC-LDB-13, and the index says who
  // owns it. Derived by type and classification rather than by id, so a
  // renumbered index still resolves.
  const own = smb13().rows.filter((d) => d.document_type === "notes" && d.classification === "internal");
  assert.equal(own.length, 1, `SMB-13 indexes ${own.length} internal notes documents, expected exactly 1`);
  assert.equal(own[0].created_date, asOf, "the indexed internal notes row and the spec's as-of date disagree");
  assert.equal(
    fields.get("Written by"), `the ${own[0].owner_role}`,
    `SMB-15 is written by "${fields.get("Written by")}" and SMB-13 records the notes as owned by`
    + ` "${own[0].owner_role}"`
  );
});

// ============================================= SMB-14, the client-facing baseline

test("SMB-C2B T-G5: no internal-classified SMB-13 document id or title appears in SMB-14", () => {
  const internal = smb13().rows.filter((d) => d.classification === "internal");
  assert.equal(
    internal.length, 5,
    `${internal.length} SMB-13 rows are classified internal, expected 5; the trap hides in that population`
  );
  const text = update().toLowerCase();
  for (const row of internal) {
    assert.ok(
      !update().includes(row.document_id),
      `SMB-14 carries the internal document id ${row.document_id}`
    );
    assert.ok(
      !text.includes(row.document_title.toLowerCase()),
      `SMB-14 carries the internal document title "${row.document_title}"; the update is the client-facing`
      + " surface and nothing classified internal is named or referenced in it"
    );
  }
});

test("SMB-C2B: SMB-14 cites exactly three SMB-13 documents and every one of them is client_shared and client_facing", () => {
  const rows = smb13().rows;
  assert.equal(rows.length, 16, `SMB-13 ships ${rows.length} rows, expected 16`);

  // The citation is resolved by reading the index and asking which of its own
  // titles the update carries, never by reading a list out of SMB-14: a
  // document that supplied the titles would be citing itself.
  const cited = rows.filter((d) => update().includes(d.document_title));
  assert.deepEqual(
    cited.map((d) => d.document_id), CITED_DOCUMENT_IDS,
    `SMB-14 resolves to ${cited.length} index rows (${cited.map((d) => d.document_id).join(", ")}),`
    + ` expected exactly the three of section 2.10's content contract: ${CITED_DOCUMENT_IDS.join(", ")}`
  );
  for (const row of cited) {
    assert.equal(row.classification, "client_shared", `${row.document_id} is classified ${row.classification}`);
    assert.equal(row.visibility, "client_facing", `${row.document_id} has visibility ${row.visibility}`);
    // Byte equality rather than a loose match: the update prints the index's
    // own title, so a title edit on either side fails here.
    assert.ok(
      update().includes(row.document_title),
      `SMB-14 does not carry "${row.document_title}" byte for byte`
    );
  }

  // The qualifier-free half. Eleven rows are client_shared and three of the
  // eleven are cited, so "is client_shared" is not the same predicate as "is
  // cited" and the three are a choice rather than the whole population.
  const shared = rows.filter((d) => d.classification === "client_shared");
  assert.equal(shared.length, 11, `${shared.length} rows are client_shared, expected 11`);
  assert.equal(cited.length, 3, `${cited.length} of the eleven client_shared rows are cited, expected 3`);
});

test("SMB-C2B: SMB-14 states no dollar figure, and cannot state the internal one in any shape", () => {
  // The rule the data plan states: no dollar figure that does not appear in
  // SMB-06 or SMB-04. Harvested from the proposal's prose and the ledger's own
  // invoice amounts rather than from SMB-14.
  const allowed = new Set([
    ...figuresIn(onDisk("SMB-06")),
    ...record().payment_log.map((p) => prose(p.invoice_amount_usd)),
  ]);
  assert.ok(allowed.size >= 4, `only ${allowed.size} figures were derived from SMB-06 and SMB-04`);

  const stated = figuresIn(update());
  for (const figure of stated) {
    assert.ok(
      allowed.has(figure),
      `SMB-14 states ${figure}, which appears in neither the approved proposal nor the client record`
    );
  }
  // And the shipped update states none at all, which is the strongest form of
  // the guard: the document names draws and terms in words, so there is no
  // figure in it for a later wording change to move. A frozen document that
  // acquires its first dollar figure goes through freeze review, and it fails
  // here first.
  assert.deepEqual(
    stated, [],
    `SMB-14 states the dollar figures ${stated.join(", ")}; the frozen update states none,`
    + " and describes the draw schedule and the terms in words instead"
  );

  for (const form of INTERNAL_FIGURE_FORMS) {
    assert.ok(
      !update().includes(form),
      `SMB-14 carries "${form}"; the internal rework figure reaches no client-facing artifact in any shape`
    );
  }
});

// ================================== the schedule both documents are measured against

test("SMB-C2B: the demolition dates in both documents are the two cells SMB-16 ships", () => {
  milestoneKeys();
  const late = lateMilestone();
  const key = proseKey(late.milestone);

  // SMB-14 states both dates in the long form and in one sentence, so a
  // schedule edit cannot leave half the disclosure standing.
  const schedule = theSection(update(), /^The schedule$/, "SMB-14");
  const m = schedule.body.match(/finished on (.+?) against a planned (.+?)\./);
  assert.ok(m, `SMB-14's schedule section does not state the slip with both dates: ${JSON.stringify(schedule.body.trim())}`);
  assert.equal(
    m[1], longForm(late.actual_completion),
    `SMB-14 says the work finished "${m[1]}" and SMB-16 completes ${late.milestone_id} on ${late.actual_completion}`
  );
  assert.equal(
    m[2], longForm(late.planned_end),
    `SMB-14 says it was planned "${m[2]}" and SMB-16 plans ${late.milestone_id} to end ${late.planned_end}`
  );
  assert.ok(
    names(schedule.body, key),
    `SMB-14's schedule section does not name the milestone that slipped ("${late.milestone}")`
  );

  // SMB-15's pinned passage states the same two dates in the short form, and
  // spells the slip out in days. The day count is subtracted from the same two
  // cells and then spelled, so a planned date moved by one day fails here.
  const slipped = theSection(notes(), /^The schedule and what slipped$/, "SMB-15");
  const n = slipped.body.match(/finished (.+?) against a planned (.+?)\./);
  assert.ok(n, "SMB-15's schedule section does not state the slip with both dates");
  assert.equal(n[1], dayMonth(late.actual_completion), `SMB-15 says the work finished "${n[1]}"`);
  assert.equal(n[2], dayMonth(late.planned_end), `SMB-15 says it was planned "${n[2]}"`);

  const days = daysBetween(late.planned_end, late.actual_completion);
  assert.ok(days > 0 && days < NUMBER_WORDS.length, `the slip is ${days} days, outside the range this screen spells`);
  assert.ok(
    slipped.body.includes(`${NUMBER_WORDS[days]} days late`),
    `SMB-16 makes ${late.milestone_id} ${days} days late and SMB-15 does not say`
    + ` "${NUMBER_WORDS[days]} days late"; the schedule has moved and the prose is orphaned`
  );
});

// SHOULD-FIX 2: the derive rule above joins exactly one date pair (the
// demolition slip). Every other date either document states is unjoined. The
// three tests below close that: a broad harvest-and-membership join over
// every long-form date either document states, a pinned recompute of the
// rough in absorption sentence (the mechanism of the whole one-cause story),
// and a clause-level join for the two remaining recurring facts (substantial
// completion, and SMB-15's cabinet-run sentence) that a flat membership test
// cannot tell apart from each other, because 20 March 2026 is independently a
// true date of more than one milestone in this schedule.

/** The long-form date shape both documents write: "27 February 2026". */
const LONG_FORM_DATE = new RegExp(`\\b\\d{1,2} (?:${MONTHS.join("|")}) \\d{4}\\b`, "g");

/**
 * Every date the schedule, the task list and the client record's own payment
 * log actually carry, in long form, harvested from the shipped bytes rather
 * than typed. A long-form date either document states that is not in this set
 * is a date written into prose with no byte behind it at all.
 */
function allowedLongFormDates() {
  const out = new Set();
  for (const m of milestones()) {
    for (const col of ["planned_start", "planned_end", "actual_start", "actual_completion"]) {
      if (m[col] !== "") out.add(longForm(m[col]));
    }
  }
  for (const t of smb12().rows) {
    for (const col of ["planned_start", "planned_end", "internal_completed_date", "client_visible_updated_date"]) {
      if (t[col] !== "") out.add(longForm(t[col]));
    }
  }
  for (const p of record().payment_log) {
    out.add(longForm(p.invoice_date));
    out.add(longForm(p.due_date));
  }
  return out;
}

test("SMB-C2B SHOULD-FIX 2: every long-form date either document states is a planned or actual date the schedule, the task list or the client record's payment log carries", () => {
  const allowed = allowedLongFormDates();
  assert.ok(allowed.size >= 15, `only ${allowed.size} dates were harvested; the allow-set looks too small to be a real join`);
  for (const doc of drafted()) {
    const stated = doc.text.match(LONG_FORM_DATE) ?? [];
    assert.ok(stated.length > 0, `${doc.label} states no long-form date at all`);
    for (const date of stated) {
      assert.ok(
        allowed.has(date),
        `${doc.label} states "${date}", which matches no planned_start, planned_end, actual_start,`
        + " actual_completion, internal_completed_date, client_visible_updated_date or SMB-04 draw date"
        + " in the emitted bytes; a schedule edit has orphaned this document's prose"
      );
    }
  }
});

test("SMB-C2B SHOULD-FIX 2: the rough in absorption sentence states the two weeks and the two dates SMB-16 ships, not two weeks typed into prose", () => {
  const roughIn = milestones().find((m) => m.milestone_id === "MST-LDB-03");
  assert.ok(roughIn, "SMB-16 no longer carries MST-LDB-03");

  const plannedWeeks = Math.round(daysBetween(roughIn.planned_start, roughIn.planned_end) / 7);
  const actualWeeks = Math.round(daysBetween(roughIn.actual_start, roughIn.actual_completion) / 7);
  assert.ok(
    plannedWeeks > 0 && plannedWeeks < NUMBER_WORDS.length && actualWeeks > 0 && actualWeeks < NUMBER_WORDS.length,
    `rough in is planned ${plannedWeeks} weeks and took ${actualWeeks}, outside the range this screen spells`
  );

  assert.ok(
    update().includes(`planned for ${NUMBER_WORDS[plannedWeeks]} weeks and took ${NUMBER_WORDS[actualWeeks]}`),
    `SMB-14 does not say rough in "was planned for ${NUMBER_WORDS[plannedWeeks]} weeks and took`
    + ` ${NUMBER_WORDS[actualWeeks]}"; SMB-16 now gives rough in a different planned or actual duration`
  );
  assert.ok(
    notes().includes(`planned ${NUMBER_WORDS[plannedWeeks]} weeks and took ${NUMBER_WORDS[actualWeeks]}`),
    `SMB-15 does not say rough in was "planned ${NUMBER_WORDS[plannedWeeks]} weeks and took`
    + ` ${NUMBER_WORDS[actualWeeks]}"`
  );
  assert.ok(
    notes().includes(`starting ${longForm(roughIn.actual_start)} against a planned ${longForm(roughIn.planned_start)}`),
    "SMB-15 does not state the rough in absorption dates against SMB-16's own planned_start and actual_start"
    + " for MST-LDB-03; P7's whole explanation for why nothing else slipped is orphaned"
  );
});

test("SMB-C2B SHOULD-FIX 2: every clause naming substantial completion, and SMB-15's cabinet-run clause, state SMB-16's own dates", () => {
  const cabinetry = milestones().find((m) => m.milestone_id === "MST-LDB-04");
  const finishCarpentry = milestones().find((m) => m.milestone_id === "MST-LDB-05");
  assert.ok(cabinetry && finishCarpentry, "SMB-16 no longer carries MST-LDB-04 or MST-LDB-05");
  const subCompletion = longForm(finishCarpentry.actual_completion);

  // "Substantial completion" is this schedule's own name for MST-LDB-05, used
  // throughout both documents in place of the milestone's SMB-16 name ("Tile,
  // countertops and finish carpentry"), so it is not reached by the milestone
  // key rule above. Every clause that names it is checked here instead, at
  // clause rather than sentence granularity: SMB-14's own schedule sentence
  // states substantial completion's date beside the punch list's planned
  // dates in one sentence, and a sentence-wide check would let a punch list
  // date license substantial completion's or vice versa.
  for (const doc of drafted()) {
    let checked = 0;
    for (const clause of clauses(doc.text)) {
      if (!/substantial completion/i.test(clause)) continue;
      for (const date of clause.match(LONG_FORM_DATE) ?? []) {
        checked += 1;
        assert.equal(
          date, subCompletion,
          `${doc.label} ties substantial completion to "${date}" in "${clause}", and SMB-16's MST-LDB-05`
          + ` completes ${finishCarpentry.actual_completion}`
        );
      }
    }
    assert.ok(checked > 0, `${doc.label} names substantial completion beside no date this screen can check`);
  }

  // SMB-15's one clause naming when the cabinet run itself finished.
  const cabinetClause = clauses(notes()).find((c) => /cabinet run finished/i.test(c));
  assert.ok(cabinetClause, "SMB-15 no longer states when the cabinet run finished");
  const cabinetDate = (cabinetClause.match(LONG_FORM_DATE) ?? [])[0];
  assert.equal(
    cabinetDate, longForm(cabinetry.actual_completion),
    `SMB-15 says the cabinet run finished "${cabinetDate}" and SMB-16 completes MST-LDB-04 on`
    + ` ${cabinetry.actual_completion}`
  );
});

// SHOULD-FIX 3. SMB-14 is the defect-free baseline: nothing it states in a
// past-tense completion verb may postdate its own Update date, or the
// document reports, in the past tense, a fact that had not happened when it
// was written. Forecasts are unaffected: they are stated in the present or
// future tense, and a forecast that later turns out correct is not a
// completion at the time of writing.
const PAST_COMPLETION_VERBS = /\b(?:finished|passed|delivered|issued)\b/i;

/** SMB-14's own Update date, as an ISO string derived the header test's own way. */
function updateDateIso() {
  const stale = smb12().rows.filter(
    (t) => t.internal_status === "complete" && t.client_visible_status === "in_progress"
  );
  assert.equal(stale.length, 1, `${stale.length} tasks are complete internally and in_progress client side, expected exactly one`);
  return stale[0].client_visible_updated_date;
}

test("SMB-C2B SHOULD-FIX 3: no clause of SMB-14 reports, in a past-tense completion verb, a date after its own Update date", () => {
  const asOf = updateDateIso();
  const completions = new Set([
    ...milestones().map((m) => m.actual_completion).filter((d) => d !== ""),
    ...smb12().rows.map((t) => t.internal_completed_date).filter((d) => d !== ""),
  ]);
  assert.ok(completions.size >= 5, `only ${completions.size} recorded completions were harvested`);
  const completionByLongForm = new Map([...completions].map((iso) => [longForm(iso), iso]));

  let checked = 0;
  for (const clause of clauses(update())) {
    if (!PAST_COMPLETION_VERBS.test(clause)) continue;
    for (const date of clause.match(LONG_FORM_DATE) ?? []) {
      if (!completionByLongForm.has(date)) continue;
      checked += 1;
      const iso = completionByLongForm.get(date);
      assert.ok(
        iso <= asOf,
        `SMB-14 reports, in a past-tense completion verb, "${date}" (${iso}) in "${clause}"; its own Update`
        + ` date is ${asOf}, so this update could not truthfully have known this on the day it was written`
      );
    }
  }
  assert.ok(
    checked > 0,
    "no clause of SMB-14 paired a past-completion verb with a recorded completion date; this screen checks nothing"
  );
});

test("SMB-C2B P7: one passage of the notes names the late milestone, and two milestones are past their planned end", () => {
  milestoneKeys();
  const late = lateMilestone();
  const asOf = record().client.as_of_date;

  // The qualifier-free count. Dropping "has a completion to measure" from the
  // rule gives two: the milestone that finished late, and the one that has no
  // completion at all and is already past the date it was planned to finish.
  const overdue = milestones().filter(
    (m) => m.planned_end < asOf && (m.actual_completion === "" || m.actual_completion > m.planned_end)
  );
  assert.equal(
    overdue.length, 2,
    `${overdue.length} milestones are past their planned end at ${asOf}`
    + ` (${overdue.map((m) => m.milestone_id).join(", ")}), expected 2`
  );
  const open = overdue.filter((m) => m.actual_completion === "");
  assert.deepEqual(
    open.map((m) => m.milestone_id), [OPEN_MILESTONE_ID],
    `${open.length} of the overdue milestones have no completion, expected exactly one`
  );

  // The count under the rule: exactly one passage names the milestone that
  // finished after its planned end, and it is the one that spells the slip out.
  const lateKey = proseKey(late.milestone);
  const naming = passages(notes()).filter((p) => names(p, lateKey));
  assert.equal(
    naming.length, 1,
    `${naming.length} passages of SMB-15 name "${late.milestone}", expected exactly one;`
    + " the notes state the slip once, plainly, rather than circling it"
  );
  assert.ok(
    /\bdays late\b/i.test(naming[0]),
    `the one passage naming "${late.milestone}" does not say how late it was`
  );

  // And the notes distinguish the two. The open milestone is discussed with its
  // planned end and the fact that it is open, and no passage about it claims a
  // number of days late, because it has no completion to measure against. A
  // drafter that treated both the same way gets one of the two wrong, and this
  // is the half that catches it.
  const openKey = proseKey(open[0].milestone);
  const aboutOpen = passages(notes()).filter((p) => names(p, openKey));
  assert.ok(aboutOpen.length > 0, `no passage of SMB-15 names "${open[0].milestone}"`);
  for (const passage of aboutOpen) {
    assert.ok(
      !/\bdays late\b/i.test(passage),
      `a passage about "${open[0].milestone}" states a number of days late, and it has no completion`
      + ` to measure one against: ${JSON.stringify(passage)}`
    );
  }
  const stated = aboutOpen.filter(
    (p) => p.includes(longForm(open[0].planned_end)) && /\bopen\b/i.test(p)
  );
  assert.equal(
    stated.length, 1,
    `${stated.length} passages say that "${open[0].milestone}" was planned to finish`
    + ` ${longForm(open[0].planned_end)} and is still open, expected exactly one`
  );
});

// ================================ SMB-15, the two plants the client must never see

test("SMB-C2B: the two pinned passages are exactly the bytes the data plan froze", () => {
  // Pinned verbatim, because a drafted plant that is described but not pinned
  // is one a freeze review cannot check and a screen cannot assert. The figure
  // half of P6 and the date half of P7 are re-derived elsewhere in this file;
  // these two equalities are what hold the wording itself.
  const P6 = "The rework the electrical sub caused came in at $6,480.00, which is past the contingency"
    + " and straight out of our margin. They burned five days we did not have on a two day job, and the"
    + " homeowners have not asked one question about it, which is the only reason this has not turned"
    + " into a change order argument.";
  const P7 = "Demolition finished 27 February against a planned 20 February. That is seven days late."
    + " We said so in the 16 March update and we say it again in the next one, because the closeout date"
    + " is going to move and the client should hear why from us before they work it out themselves.";

  const blocks = passages(notes());
  assert.equal(blocks.filter((p) => p === P6).length, 1, "P6 is not a passage of SMB-15, byte for byte");
  assert.equal(blocks.filter((p) => p === P7).length, 1, "P7 is not a passage of SMB-15, byte for byte");

  // And each sits in the section the plan puts it in.
  assert.ok(
    theSection(notes(), /^Cost and margin$/, "SMB-15").body.includes(P6),
    "P6 is not in the cost and margin section"
  );
  assert.ok(
    theSection(notes(), /^The schedule and what slipped$/, "SMB-15").body.includes(P7),
    "P7 is not in the schedule section"
  );
  assert.ok(P6.includes(INTERNAL_FIGURE), "P6 no longer states the figure C3 has to match");
});

test("SMB-C2B P6: three passages of the notes state a dollar figure and exactly one states a figure no client-facing artifact carries", () => {
  // The safe set is harvested from the nine OTHER cluster 2 artifacts. SMB-15
  // is not in that population and neither is SMB-14: a document that supplied
  // its own allowed set would license every figure it happens to carry.
  const clientFacing = new Set(OTHER_C2_IDS.flatMap((id) => figuresIn(onDisk(id))));
  assert.ok(
    clientFacing.size >= 2,
    `only ${clientFacing.size} dollar figures were found across the nine other cluster 2 artifacts,`
    + " so the 'appears in no client-facing artifact' filter would pass on anything"
  );

  // The qualifier-free count: three passages state a dollar figure at all, so a
  // reader who greps for a currency symbol finds three.
  const bearing = passages(notes()).filter((p) => figuresIn(p).length > 0);
  assert.equal(
    bearing.length, 3,
    `${bearing.length} passages of SMB-15 state a dollar figure, expected 3;`
    + " the internal figure hides among figures that are safe to repeat"
  );
  for (const passage of bearing) {
    assert.equal(
      new Set(figuresIn(passage)).size, 1,
      `a passage states two different dollar figures, so "one passage, one figure" no longer holds:`
      + ` ${JSON.stringify(passage)}`
    );
  }
  const figures = bearing.map((p) => figuresIn(p)[0]);
  assert.equal(new Set(figures).size, 3, `two passages state the same figure (${figures.join(", ")})`);

  // The count under the rule: exactly one of the three is a figure that appears
  // in no client-facing artifact, and it is the one the C3 join is pinned to.
  const internal = figures.filter((f) => !clientFacing.has(f));
  assert.deepEqual(
    internal, [INTERNAL_FIGURE],
    `the figures no client-facing artifact carries are ${internal.join(", ") || "(none)"},`
    + ` expected exactly one and expected it to be ${INTERNAL_FIGURE}`
  );

  // The other two are safe because SMB-06 states them, and that is read out of
  // the proposal rather than asserted from the plan.
  const safe = figures.filter((f) => f !== INTERNAL_FIGURE);
  assert.equal(safe.length, 2, `${safe.length} of the three figures are not the internal one, expected 2`);
  const proposal = onDisk("SMB-06");
  for (const figure of safe) {
    assert.ok(
      proposal.includes(figure),
      `SMB-15 repeats ${figure}, which the approved proposal does not state; a figure is safe to repeat`
      + " because the client already holds the document it comes from"
    );
  }
});

test("SMB-C2B: the internal figure appears once in SMB-15 and nowhere in the nine other cluster 2 artifacts", () => {
  assert.equal(
    notes().split(INTERNAL_FIGURE).length - 1, 1,
    `SMB-15 states ${INTERNAL_FIGURE} more than once, or not at all`
  );
  for (const id of OTHER_C2_IDS) {
    const text = onDisk(id);
    for (const form of INTERNAL_FIGURE_FORMS) {
      assert.ok(
        !text.includes(form),
        `${id} carries "${form}"; the internal rework figure lives in the notes and in the job cost`
        + " data, and in no other artifact of this cluster in any shape"
      );
    }
  }
  assert.equal(OTHER_C2_IDS.length, 9, "the absence is asserted over fewer than the nine other cluster 2 artifacts");
});

// ============================== the properties over both drafted documents

test("SMB-C2B R-ROLE: neither document names a canon person, and the electrical subcontractor is not named", () => {
  const people = canonPeople();
  assert.ok(people.size >= 80, `only ${people.size} names were derived from canon/people.md; the name build has broken`);
  for (const doc of drafted()) {
    for (const person of people) {
      assert.ok(
        !doc.text.includes(person),
        `${doc.label} names the person ${person}; a human in this pack is a role or a household (rule R-ROLE)`
      );
    }
  }

  // SMB-15's canon_entities is [co-100, co-131] and the trade is referred to as
  // "the electrical sub". Naming co-133 would make the spec entry false, and
  // the C3 join is on the amount rather than on a name. The name is read off
  // canon rather than typed, so a canon rename moves this screen with it.
  const subcontractor = canonCompanies().get("co-133");
  assert.ok(subcontractor?.length > 0, "canon seats no co-133, so this absence screen would pass vacuously");
  const firstWord = subcontractor.split(/\s+/)[0];
  for (const doc of drafted()) {
    for (const needle of ["co-133", subcontractor, firstWord]) {
      assert.ok(
        !doc.text.includes(needle),
        `${doc.label} carries "${needle}"; the electrical subcontractor is not named anywhere in cluster 2`
      );
    }
    for (const id of specs.byId.get(doc.id).canon_entities) {
      assert.notEqual(id, "co-133", `${doc.id}'s spec now claims co-133`);
    }
  }
});

test("SMB-C2B R-MOCK: neither document names a processor, a gateway, a card network, a bank product or an instrument", () => {
  assert.ok(MOCK_VOCABULARY.length > 0, "the hoisted R-MOCK vocabulary is empty, so this sweep checks nothing");
  assert.equal(
    PAYMENT_INSTRUMENTS.length, MOCK_VOCABULARY.length + C2_PHRASES.length,
    "a term went missing between the hoisted list and the list this sweep runs"
  );
  for (const doc of drafted()) {
    assert.deepEqual(
      denyHits(doc.text, PAYMENT_INSTRUMENTS), [],
      `${doc.label} names a payment instrument; this pack describes terms and draws and names no instrument`
    );
  }
});

test("SMB-C2B: both documents sit inside their word bands and carry no em dash and no en dash", () => {
  for (const doc of drafted()) {
    // The band excludes a markdown table cell wall counted as its own word (NIT
    // 2, cluster-2.md section 1.1). Neither of these two documents carries a
    // table, so the exclusion is inert here and is kept only so that every
    // drafted screen in this pack counts words the same way.
    const count = doc.text.split(/\s+/).filter((w) => w.length > 0 && w !== "|").length;
    const [low, high] = doc.band;
    assert.ok(
      count >= low && count <= high,
      `${doc.label} runs ${count} words, outside the ${low} to ${high} band`
    );
    // Written as escapes so this screen is not itself a hit for a grep over the
    // repo for the two characters it bans.
    assert.ok(!doc.text.includes("\u2014"), `${doc.label} carries an em dash (U+2014)`);
    assert.ok(!doc.text.includes("\u2013"), `${doc.label} carries an en dash (U+2013)`);
  }
});

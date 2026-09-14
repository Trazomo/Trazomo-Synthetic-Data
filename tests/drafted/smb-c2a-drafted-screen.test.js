// Small business cluster 2a: the structural screen over the drafted surface of
// the agreements wave.
//
//   artifacts/SMB-06/approved-proposal-larkspur.md
//     the approved proposal: twelve line items priced against a twelve row rate
//     basis appendix, one line to one rate
//   artifacts/SMB-07/contract-template.md
//     the blank contract template: sixteen fields, twelve of them required, one
//     required field left without a slot
//   artifacts/SMB-09/welcome-pack-template.md
//     the welcome pack: fourteen placeholders and no empty slot at all, which is
//     the control that keeps the SMB-07 rule from being a tautology
//
// tests/drafted/rev-c5-drafted-screen.test.js is the house style this file
// follows, and its markdown table parser and canon name screen are the ones
// reused here: documents are read lazily inside each test, every expectation is
// re-derived from committed bytes rather than retyped, and the join keys are
// read off disk rather than remembered.
//
// What this file deliberately does NOT know: which line of the proposal a
// module's exercise is meant to catch, or which field a learner is expected to
// stop on. Those are per-instance answer keys and answer keys do not live in
// this repo (canon/people.md ground rules). What it recomputes is the money,
// the joins and the two cardinalities of each plant, because all of those are
// mechanical.
//
// Six mechanical rules are stated once here and used throughout.
//
//   The money rule (T-A1, T-A2, T-A6). Nothing about the proposal's arithmetic
//   is typed into this file. Every line total is recomputed in integer cents as
//   quantity times unit rate, the twelve are summed, and the sum is compared to
//   SMB-04's client.contract_value_usd read out of the emitted JSON. The draw
//   schedule is read off the document as percentages, recomputed against that
//   same total, and compared to SMB-04's four invoice_amount_usd values. A
//   proposal line edited so the bill no longer ties fails here.
//
//   The proposal date (T-A4, T-A5). Derived, not pinned: SMB-04's
//   proposal_approved stage carries the date, and the staleness cardinality is
//   measured against it. A stage date edit moves this screen with it.
//
//   The staleness cardinality (P1). Exactly one rate row states an
//   effective_through earlier than the proposal date, and exactly four state one
//   at all. Both halves are asserted, because the second is the qualifier-free
//   count the plant hides inside: a reader who greps for a closing date finds
//   four, and three of the four are still current at the proposal date.
//
//   The blank-slot predicate (T-B3, T-C3). One function, blankSlots, run over
//   both templates. A declared field is blank when the body carries no
//   placeholder token for it. Neither document's own text is consulted for the
//   answer: SMB-07's field table supplies the required flags, SMB-09 declares no
//   optional column so every placeholder it declares is required, and the
//   predicate returns one blank required field on SMB-07 and zero on SMB-09. A
//   welcome pack that quietly acquires an empty slot makes the SMB-07 plant a
//   tautology, and it fails here when it does.
//
//   The token rule (T-B4, T-C2). Every placeholder token is recomputed as the
//   snake_case of the field name it belongs to rather than compared against a
//   list, so a renamed field with a stale token fails by name.
//
//   The absence screens (T-B5, T-C4, R-MOCK, R-ROLE). Person names are canon's
//   own seated, retired and frozen names, screened as exact substrings. The
//   payment-instrument vocabulary is a pinned deny-list matched on word
//   boundaries and case-insensitively, the rev-c5 deny-list mechanism. The two
//   canon strings co-100 and the studio name are screened out of the two
//   template documents, which carry canon_entities: [] and have to earn it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dirname, "..", "..");

// ------------------------------------------------------------------ documents

const PROPOSAL_PATH = join(REPO_ROOT, "artifacts", "SMB-06", "approved-proposal-larkspur.md");
const CONTRACT_PATH = join(REPO_ROOT, "artifacts", "SMB-07", "contract-template.md");
const WELCOME_PATH = join(REPO_ROOT, "artifacts", "SMB-09", "welcome-pack-template.md");
const RECORD_PATH = join(
  REPO_ROOT, "datasets", "smb", "client-record-okafor", "client-record-okafor.json"
);
const COMPANIES_PATH = join(REPO_ROOT, "canon", "companies.md");
const PEOPLE_PATH = join(REPO_ROOT, "canon", "people.md");

const proposal = () => readFileSync(PROPOSAL_PATH, "utf8");
const contract = () => readFileSync(CONTRACT_PATH, "utf8");
const welcome = () => readFileSync(WELCOME_PATH, "utf8");

/** SMB-04, the money and chain ground truth this cluster hangs off. */
const record = () => JSON.parse(readFileSync(RECORD_PATH, "utf8"));

/** The three drafted documents of 2a, for the properties that run over all of them. */
const documents = () => [
  { id: "SMB-06", label: "approved-proposal-larkspur.md", text: proposal(), band: [900, 1300] },
  { id: "SMB-07", label: "contract-template.md", text: contract(), band: [800, 1200] },
  { id: "SMB-09", label: "welcome-pack-template.md", text: welcome(), band: [600, 1000] },
];

// ------------------------------------------------------------- pinned columns

/** SMB-06's line item table, section 2.1 of the cluster 2 data plan. */
const LINE_COLUMNS = [
  "line_id", "description", "rate_id", "quantity", "unit", "unit_rate_usd", "line_total_usd",
];

/** SMB-06's rate basis appendix, same section. */
const RATE_COLUMNS = [
  "rate_id", "rate_name", "rate_class", "unit", "unit_rate_usd", "effective_from", "effective_through",
];

/** SMB-07's required-field list, section 2.2. */
const FIELD_COLUMNS = ["field_id", "field_name", "required", "placeholder_token"];

/** The three id classes rule R-NS namespaces for 2a, and no other. */
const LINE_ID = /^PLI-LDB-\d{2}$/;
const RATE_ID = /^RTC-LDB-\d{2}$/;
const FIELD_ID = /^CFD-LDB-\d{2}$/;

/** Row counts the plan fixes; the arithmetic below is meaningless at any other. */
const LINE_COUNT = 12;
const FIELD_COUNT = 16;
const REQUIRED_COUNT = 12;
const OPTIONAL_COUNT = 4;
const PLACEHOLDER_COUNT = 14;
const WELCOME_SECTION_COUNT = 9;

/** The one line and the one field each plant sits on, and the blank's siblings. */
const STALE_LINE_ID = "PLI-LDB-06";
const STALE_RATE_ID = "RTC-LDB-06";
const BLANK_REQUIRED_FIELD_ID = "CFD-LDB-08";
const BLANK_OPTIONAL_FIELD_IDS = ["CFD-LDB-14", "CFD-LDB-16"];

const pad = (n) => String(n).padStart(2, "0");

// ----------------------------------------------------------- markdown tables

const isTableLine = (line) => line.trim().startsWith("|");
const tableCells = (line) => line.split("|").slice(1, -1).map((c) => c.trim());
const isRule = (cells) => cells.every((c) => /^:?-+:?$/.test(c));

/** A cell as data: markdown code ticks and bold marks are presentation. */
const cellValue = (cell) => cell.replace(/`/g, "").replace(/\*\*/g, "").trim();

/**
 * Every markdown table in `text` whose header cells are exactly `columns`, in
 * any order, as arrays of row objects keyed by the header's own names. A
 * reordered table still parses and a renamed column fails loudly.
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
      rows.push(Object.fromEntries(head.map((c, k) => [c, cellValue(cells[k] ?? "")])));
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
 * everything above the first one as the header block.
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
  const found = sections(text).sections.filter((s) => pattern.test(s.title));
  assert.equal(
    found.length, 1,
    `${label}: ${found.length} sections match ${pattern}, expected exactly 1`
    + ` (titles: ${sections(text).sections.map((s) => s.title).join(" / ")})`
  );
  return found[0];
}

/** `**Label:** value` lines of a header block, keyed by label. */
function headerFields(text) {
  const out = new Map();
  for (const line of text.split("\n")) {
    const m = line.trim().match(/^\*\*(.+?):\*\*\s*(.*)$/);
    if (m) out.set(m[1].trim(), m[2].trim());
  }
  return out;
}

// ---------------------------------------------------------------- money rule

/** A 2dp money string as integer cents. A different shape is a defect, not a parse. */
function cents(value, where) {
  assert.match(
    String(value), /^\d+\.\d{2}$/,
    `${where} carries "${value}", which is not a 2dp money string`
  );
  const [whole, fraction] = String(value).split(".");
  return Number(whole) * 100 + Number(fraction);
}

const money = (c) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** `$29,700.00` as cents, the shape money takes in this pack's prose. */
function proseCents(value, where) {
  assert.match(
    value, /^\$\d{1,3}(,\d{3})*\.\d{2}$/,
    `${where} carries "${value}", which is not $1,234.56 shaped`
  );
  return cents(value.slice(1).replace(/,/g, ""), where);
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** `2026-02-02` as `2 February 2026`, the long form this pack uses in prose. */
function longForm(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

// ------------------------------------------------------------- the SMB-04 join

/** The stage of the client record with this `stage` value, exactly one expected. */
function stage(name) {
  const found = record().stages.filter((s) => s.stage === name);
  assert.equal(found.length, 1, `SMB-04 carries ${found.length} ${name} stages, expected exactly 1`);
  return found[0];
}

/** The proposal date, read off SMB-04 rather than pinned here. */
const proposalDate = () => stage("proposal_approved").event_date;

// ------------------------------------------------------------- the canon join

/**
 * `canon/companies.md` as id -> name. Both company tables are read: the anchors
 * table heads its second column `Name` and the Larkspur cast table heads it
 * `Name (status)`, and a cast row carries its status as a trailing parenthetical
 * on the name itself. The parenthetical is canon's annotation rather than part
 * of the name, so it is stripped, and the derivation is then checked against
 * SMB-04's own studio and client names below rather than trusted.
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
 * `Frozen name` columns of `canon/people.md`. The rev-c5 screen's parser. A
 * drafted surface in this pack may carry none of them (rule R-ROLE).
 */
function canonPeople() {
  const NAME_HEADS = ["name", "retired name", "frozen name"];
  const lines = readFileSync(PEOPLE_PATH, "utf8").split("\n");
  const names = new Set();
  for (const [i, line] of lines.entries()) {
    if (!isTableLine(line)) continue;
    const head = tableCells(line);
    const column = head.findIndex((c) => NAME_HEADS.includes(c.toLowerCase()));
    if (column < 0) continue;
    for (let j = i + 1; j < lines.length; j += 1) {
      if (!isTableLine(lines[j])) break;
      const cells = tableCells(lines[j]);
      if (isRule(cells)) continue;
      const value = (cells[column] ?? "").replace(/\*\*/g, "").trim();
      if (/^[A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*)+/.test(value)) names.add(value);
    }
  }
  return names;
}

// ------------------------------------------------------------- the deny lists

/**
 * Processors, gateways, card networks, bank products, authorization codes and
 * instrument numbers. Rule R-MOCK: this pack's payment surface describes terms
 * and draws and names no instrument, and C2 emits no payment row at all, so the
 * whole obligation here is an absence.
 *
 * The list is the SMB C1 list (tests/generators/planted-features.test.js) with
 * two entries deliberately dropped rather than forgotten, on the rev-c5 rule
 * that a deny term may not also be an ordinary word of the document: "square",
 * because `square_foot` is a unit of the proposal's own bill, and "auth",
 * because it is a fragment rather than a word. "authorization" carries that
 * half of the rule instead, and phrases are matched whole.
 */
const PAYMENT_INSTRUMENTS = [
  "stripe", "paypal", "adyen", "braintree", "worldpay", "plaid",
  "visa", "mastercard", "amex", "maestro", "card", "cardholder", "card network",
  "ach", "wire", "wire transfer", "swift", "iban", "sepa", "bacs", "zelle", "venmo",
  "gateway", "payment gateway", "processor", "payment processor", "merchant", "acquirer",
  "routing", "routing number", "sort code", "account number", "cvv", "last4",
  "authorization", "authorisation", "authorization code", "reference token",
];

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

// -------------------------------------------------------- the token machinery

const TOKEN = /\{\{([a-z0-9_]+)\}\}/g;

/** Every placeholder token in `text`, in file order, duplicates kept. */
const tokensIn = (text) => [...text.matchAll(TOKEN)].map((m) => m[1]);

/** A field name as its own token name: lowercase, and every run of punctuation a single underscore. */
const snakeCase = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

/**
 * THE blank-slot predicate, written once and run over both templates (T-B3,
 * T-C3). A declared field is blank when the document's body carries no
 * placeholder token for it. The caller supplies the declarations and whether
 * each one's slot is filled; nothing about which field is expected to be blank
 * reaches this function.
 */
const blankSlots = (fields) => fields.filter((f) => !f.filled).map((f) => f.id);

/** SMB-07's sixteen declared fields, joined to their body sections. */
function contractFields() {
  const text = contract();
  const declared = theTable(text, FIELD_COLUMNS, "the contract template's required-field list");

  const lines = text.split("\n");
  const heads = [];
  for (const [i, line] of lines.entries()) {
    const m = line.match(/^###\s+(.+?)\s+\((CFD-LDB-\d{2})\)\s*$/);
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

  return { declared, heads, bodyById };
}

/** SMB-09's fourteen declared placeholders, and the body they are used in. */
function welcomeParts() {
  const { header, sections: bodySections } = sections(welcome());
  const declared = theTable(header, ["placeholder_token", "What it carries"], "the welcome pack's placeholder table");
  const body = bodySections.map((s) => `${s.title}\n${s.body}`).join("\n");
  return { declared, body, bodySections, header };
}

// ============================================================ SMB-06, the bill

test("SMB-C2A T-A2: the proposal carries twelve line items and every line total is the quantity times the unit rate to the cent", () => {
  const rows = theTable(proposal(), LINE_COLUMNS, "the approved proposal's line item table");
  assert.equal(rows.length, LINE_COUNT, `the line item table carries ${rows.length} rows, expected ${LINE_COUNT}`);

  assert.deepEqual(
    rows.map((r) => r.line_id),
    rows.map((_, i) => `PLI-LDB-${pad(i + 1)}`),
    "the line ids are not PLI-LDB-01 upward, zero padded, in file order with no gap"
  );

  for (const row of rows) {
    assert.match(row.line_id, LINE_ID, `${row.line_id} is not a PLI-LDB id`);
    assert.match(row.rate_id, RATE_ID, `${row.line_id} cites "${row.rate_id}", which is not an RTC-LDB id`);
    assert.match(row.quantity, /^\d+$/, `${row.line_id} carries a non-integer quantity "${row.quantity}"`);
    assert.ok(row.description.length > 0, `${row.line_id} carries no description`);
    assert.match(row.unit, /^[a-z_]+$/, `${row.line_id} carries the unit "${row.unit}", which is not a snake_case unit`);

    const expected = Number(row.quantity) * cents(row.unit_rate_usd, `${row.line_id} unit_rate_usd`);
    assert.equal(
      cents(row.line_total_usd, `${row.line_id} line_total_usd`), expected,
      `${row.line_id}: ${row.quantity} times ${row.unit_rate_usd} is ${money(expected)},`
      + ` and the line states ${money(cents(row.line_total_usd, row.line_id))}`
    );
  }
});

test("SMB-C2A T-A1: the twelve line totals sum to SMB-04's contract value, and the document states that total", () => {
  const rows = theTable(proposal(), LINE_COLUMNS, "the approved proposal's line item table");
  const sum = rows.reduce((acc, r) => acc + cents(r.line_total_usd, `${r.line_id} line_total_usd`), 0);

  const contractValue = cents(record().client.contract_value_usd, "SMB-04 contract_value_usd");
  assert.equal(
    sum, contractValue,
    `the twelve line totals sum to ${sum} cents and SMB-04's contract_value_usd is ${contractValue} cents;`
    + " the proposal is the document that contract value came from and the two tie or neither is trustworthy"
  );

  const total = theSection(proposal(), /^Total$/, "SMB-06");
  const stated = total.body.match(/`(\d+\.\d{2})`/);
  assert.ok(stated, `the total section states no 2dp total: ${JSON.stringify(total.body.trim())}`);
  assert.equal(
    cents(stated[1], "the stated total"), sum,
    `the total section states ${stated[1]} and the line items sum to ${money(sum)}`
  );
  assert.ok(
    total.body.includes(money(sum)),
    `the total section does not carry the prose form ${money(sum)} of its own total`
  );
});

test("SMB-C2A T-A3: the rate_id sets of the bill and the rate basis are equal, with nothing missing and nothing extra either way", () => {
  const lines = theTable(proposal(), LINE_COLUMNS, "the approved proposal's line item table");
  const rates = theTable(proposal(), RATE_COLUMNS, "the approved proposal's rate basis appendix");
  assert.equal(rates.length, LINE_COUNT, `the rate basis carries ${rates.length} rows, expected ${LINE_COUNT}`);

  assert.deepEqual(
    rates.map((r) => r.rate_id),
    rates.map((_, i) => `RTC-LDB-${pad(i + 1)}`),
    "the rate ids are not RTC-LDB-01 upward, zero padded, in file order with no gap"
  );

  const cited = new Set(lines.map((r) => r.rate_id));
  const published = new Set(rates.map((r) => r.rate_id));
  assert.deepEqual(
    [...cited].filter((id) => !published.has(id)), [],
    "the bill cites a rate the appendix does not publish"
  );
  assert.deepEqual(
    [...published].filter((id) => !cited.has(id)), [],
    "the appendix publishes a rate no line item cites"
  );
  assert.equal(cited.size, lines.length, "two line items cite the same rate row; the join is one to one");
  assert.equal(published.size, rates.length, "the appendix publishes a rate id twice");

  // The join carries the price, not just the key: a rate row and the line that
  // cites it agree on the unit and on the unit rate, or the bill is priced off
  // something the appendix does not say.
  const rateById = new Map(rates.map((r) => [r.rate_id, r]));
  for (const line of lines) {
    const rate = rateById.get(line.rate_id);
    assert.equal(rate.unit, line.unit, `${line.line_id} bills in ${line.unit} and ${rate.rate_id} is stated in ${rate.unit}`);
    assert.equal(
      cents(rate.unit_rate_usd, `${rate.rate_id} unit_rate_usd`),
      cents(line.unit_rate_usd, `${line.line_id} unit_rate_usd`),
      `${line.line_id} is priced at ${line.unit_rate_usd} and ${rate.rate_id} publishes ${rate.unit_rate_usd}`
    );
  }
});

test("SMB-C2A T-A4, P1: exactly four rate rows state a closing date and exactly one of them closed before the proposal date", () => {
  const rates = theTable(proposal(), RATE_COLUMNS, "the approved proposal's rate basis appendix");
  const asOf = proposalDate();

  const windowed = rates.filter((r) => r.effective_through !== "");
  assert.equal(
    windowed.length, 4,
    `${windowed.length} rate rows state an effective_through (${windowed.map((r) => r.rate_id).join(", ")}),`
    + " expected 4; that is the count a reader who greps for a closing date gets, and the plant hides inside it"
  );

  const stale = windowed.filter((r) => r.effective_through < asOf);
  assert.deepEqual(
    stale.map((r) => r.rate_id), [STALE_RATE_ID],
    `${stale.length} rate rows closed before the proposal date ${asOf} (${stale.map((r) => r.rate_id).join(", ")}),`
    + ` expected exactly one, ${STALE_RATE_ID}`
  );

  // The rate class does not locate the plant, and the screen says so rather
  // than letting a later edit make it correlate. Three of the four windowed
  // rows are materials and one is not, so filtering on the class returns three.
  const materials = windowed.filter((r) => r.rate_class === "materials");
  assert.equal(
    materials.length, 3,
    `${materials.length} of the four windowed rate rows are materials class, expected 3;`
    + " a rule that filters on the rate class has to return three rather than one"
  );
  assert.ok(
    windowed.some((r) => r.rate_class !== "materials"),
    "every windowed rate row is materials class, so the class now correlates with staleness"
    + " and filtering on it finds the plant"
  );

  // And the line that is priced at it is the one line the plant is about.
  const lines = theTable(proposal(), LINE_COLUMNS, "the approved proposal's line item table");
  const priced = lines.filter((l) => l.rate_id === STALE_RATE_ID);
  assert.deepEqual(
    priced.map((l) => l.line_id), [STALE_LINE_ID],
    `${priced.length} line items are priced at ${STALE_RATE_ID}, expected exactly one, ${STALE_LINE_ID}`
  );
  assert.match(
    priced[0].description, /quartz/i,
    `${STALE_LINE_ID} is "${priced[0].description}" and not the quartz line the plant is drafted on`
  );
});

test("SMB-C2A T-A5: every rate the bill is priced at had started by the proposal date", () => {
  const rates = theTable(proposal(), RATE_COLUMNS, "the approved proposal's rate basis appendix");
  const asOf = proposalDate();
  for (const rate of rates) {
    assert.match(rate.effective_from, /^\d{4}-\d{2}-\d{2}$/, `${rate.rate_id} carries no ISO effective_from`);
    assert.ok(
      rate.effective_from <= asOf,
      `${rate.rate_id} takes effect ${rate.effective_from}, after the proposal date ${asOf};`
      + " a line priced at a rate that had not started is a second defect and the plant is exactly one"
    );
    if (rate.effective_through !== "") {
      assert.match(rate.effective_through, /^\d{4}-\d{2}-\d{2}$/, `${rate.rate_id} carries no ISO effective_through`);
      assert.ok(
        rate.effective_from < rate.effective_through,
        `${rate.rate_id} closes ${rate.effective_through} before it opens ${rate.effective_from}`
      );
    }
  }
});

test("SMB-C2A T-A6: the four draws recompute off the total to SMB-04's four invoice amounts", () => {
  const schedule = theSection(proposal(), /^Payment schedule$/, "SMB-06");
  const draws = [];
  for (const line of schedule.body.split("\n")) {
    const m = line.trim().match(/^[-*+]\s+(.+?):\s+(\d+) percent of the contract sum, (\$[\d,]+\.\d{2})\.$/);
    if (m) draws.push({ label: m[1], pct: Number(m[2]), stated: proseCents(m[3], `the ${m[1]} draw`) });
  }
  assert.equal(
    draws.length, 4,
    `the payment schedule parses to ${draws.length} draws, expected 4 stated as`
    + ' "<label>: <n> percent of the contract sum, $<figure>."'
  );

  const lines = theTable(proposal(), LINE_COLUMNS, "the approved proposal's line item table");
  const total = lines.reduce((acc, r) => acc + cents(r.line_total_usd, `${r.line_id} line_total_usd`), 0);

  const invoices = record().payment_log.map((p) => cents(p.invoice_amount_usd, `${p.invoice_id} invoice_amount_usd`));
  assert.equal(invoices.length, 4, `SMB-04 carries ${invoices.length} invoices, expected 4`);

  const recomputed = draws.map((d) => (total * d.pct) / 100);
  for (const [i, draw] of draws.entries()) {
    assert.ok(Number.isInteger(recomputed[i]), `the ${draw.pct} percent draw is not a whole number of cents off ${money(total)}`);
    assert.equal(
      draw.stated, recomputed[i],
      `the ${draw.label} draw states ${money(draw.stated)} and ${draw.pct} percent of ${money(total)} is ${money(recomputed[i])}`
    );
  }
  assert.deepEqual(
    recomputed, invoices,
    `the draw schedule recomputes to ${recomputed.join(", ")} cents and SMB-04's invoices are ${invoices.join(", ")};`
    + " the proposal's schedule and the ledger's invoices are the same four figures or the chain is broken"
  );
  assert.equal(
    draws.reduce((acc, d) => acc + d.stated, 0), total,
    "the four stated draws do not sum to the contract sum"
  );

  // The deposit percentage is SMB-04's own deposit_pct, not a fifth number.
  assert.equal(
    String(draws[0].pct), record().client.deposit_pct,
    `the first draw is ${draws[0].pct} percent and SMB-04's deposit_pct is ${record().client.deposit_pct}`
  );
  // Terms are the record's terms, and they are named as terms rather than as an instrument.
  assert.ok(
    schedule.body.includes(record().client.payment_terms),
    `the payment schedule does not carry SMB-04's payment_terms ${record().client.payment_terms}`
  );
});

test("SMB-C2A T-A7: the proposal header carries SMB-04's address and project name and canon's own names", () => {
  const { header } = sections(proposal());
  const fields = headerFields(header);
  const client = record().client;
  const companies = canonCompanies();

  // The canon derivation is checked against SMB-04 before it is used, so a
  // parse that silently returned the wrong column fails here rather than
  // passing an assertion vacuously.
  const studioName = companies.get("co-100");
  const clientName = companies.get("co-131");
  assert.equal(studioName, record().studio.name, "canon's co-100 name and SMB-04's studio name disagree");
  assert.equal(clientName, client.client_name, "canon's co-131 name and SMB-04's client_name disagree");

  assert.equal(fields.get("Studio"), studioName, `the header names the studio "${fields.get("Studio")}"`);
  assert.equal(fields.get("Client"), clientName, `the header names the client "${fields.get("Client")}"`);
  assert.equal(
    fields.get("Property address"), client.property_address,
    `the header carries the property address "${fields.get("Property address")}" and SMB-04 pins`
    + ` "${client.property_address}", with no city, state or postcode`
  );
  assert.equal(
    fields.get("Project name"), client.project_name,
    `the header carries the project name "${fields.get("Project name")}" and SMB-04 pins "${client.project_name}"`
  );

  const asOf = proposalDate();
  assert.equal(
    fields.get("Proposal date"), longForm(asOf),
    `the header dates the proposal "${fields.get("Proposal date")}" and SMB-04's proposal_approved stage is ${asOf}`
  );
  assert.match(fields.get("Validity") ?? "", /\b30 days\b/, "the header does not state a 30 day validity");
  assert.equal(
    fields.get("Prepared by"), `the ${client.record_owner_role}`,
    `the header prepares the proposal by "${fields.get("Prepared by")}"; the preparer is SMB-04's`
    + ` record_owner_role, "${client.record_owner_role}", and a role rather than a person`
  );

  // The address is one string in this pack and it appears nowhere in a longer form.
  const addressLines = proposal().split("\n").filter((l) => l.includes("Havershill"));
  for (const line of addressLines) {
    assert.ok(
      line.includes(client.property_address),
      `a line names Havershill outside the canonical address string: ${JSON.stringify(line.trim())}`
    );
  }
});

test("SMB-C2A: the proposal carries its eight sections in the order the plan fixes, and records approval by role on the proposal date", () => {
  const titles = sections(proposal()).sections.map((s) => s.title);
  assert.deepEqual(
    titles,
    [
      "Scope of work", "Line items", "Total", "Rate basis appendix",
      "Allowances and exclusions", "Payment schedule", "Acceptance",
    ],
    "the proposal's sections are not the fixed order of the plan (header block, scope, line items,"
    + " total, rate basis, allowances and exclusions, payment schedule, acceptance)"
  );

  const scope = theSection(proposal(), /^Scope of work$/, "SMB-06");
  const paragraphs = scope.body.trim().split(/\n{2,}/).filter((p) => p.trim().length > 0);
  assert.equal(paragraphs.length, 3, `the scope narrative runs ${paragraphs.length} paragraphs, expected 3`);

  const asOf = proposalDate();
  const acceptance = theSection(proposal(), /^Acceptance$/, "SMB-06");
  assert.ok(
    acceptance.body.includes(longForm(asOf)),
    `the acceptance block does not record approval on ${longForm(asOf)}`
  );
  const client = record().client;
  assert.ok(
    acceptance.body.includes(`the ${client.contact_role}`),
    `the acceptance block does not approve by SMB-04's contact_role, "${client.contact_role}"`
  );
  assert.ok(
    acceptance.body.includes(`the ${client.record_owner_role}`),
    `the acceptance block does not accept by SMB-04's record_owner_role, "${client.record_owner_role}"`
  );
  assert.ok(
    !/signature|signed by|\bsign here\b/i.test(acceptance.body),
    "the acceptance block invites a signature; approval in this pack is recorded by role"
  );
});

// ====================================================== SMB-07, the blank template

test("SMB-C2A T-B1: the required-field list and the body sections are the same fields, in the same order", () => {
  const { declared, heads } = contractFields();
  assert.equal(declared.length, FIELD_COUNT, `the required-field list carries ${declared.length} rows, expected ${FIELD_COUNT}`);
  assert.equal(heads.length, FIELD_COUNT, `the body carries ${heads.length} field sections, expected ${FIELD_COUNT}`);

  assert.deepEqual(
    declared.map((r) => r.field_id),
    declared.map((_, i) => `CFD-LDB-${pad(i + 1)}`),
    "the field ids are not CFD-LDB-01 upward, zero padded, in document order with no gap"
  );
  for (const row of declared) assert.match(row.field_id, FIELD_ID, `${row.field_id} is not a CFD-LDB id`);

  assert.deepEqual(
    heads.map((h) => h.id), declared.map((r) => r.field_id),
    "the body sections and the required-field list do not run the same fields in the same order"
  );
  assert.deepEqual(
    heads.map((h) => h.name), declared.map((r) => r.field_name),
    "a body section heading names a field differently from the required-field list"
  );
});

test("SMB-C2A T-B2: twelve fields are required and four are optional, and the list is the only place that is said", () => {
  const { declared, bodyById } = contractFields();
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

test("SMB-C2A T-B3, P2: exactly one required field has an empty slot, and three fields of any flag do", () => {
  const { declared, bodyById } = contractFields();

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
  assert.deepEqual(
    blank.sort(), [BLANK_REQUIRED_FIELD_ID, ...BLANK_OPTIONAL_FIELD_IDS].sort(),
    `the fields with an empty slot are ${blank.join(", ")}; expected three, one required and two optional`
  );
  assert.equal(
    blank.length, 3,
    "the qualifier-free count is not three; a rule that finds empty slots without reading the required"
    + " column has to return three, or the plant is a grep rather than a discrimination task"
  );

  const blankRequired = blankSlots(fields.filter((f) => f.required));
  assert.deepEqual(
    blankRequired, [BLANK_REQUIRED_FIELD_ID],
    `${blankRequired.length} required fields have an empty slot (${blankRequired.join(", ")}), expected exactly one`
  );
  const blankOptional = blankSlots(fields.filter((f) => !f.required));
  assert.deepEqual(
    blankOptional.sort(), [...BLANK_OPTIONAL_FIELD_IDS].sort(),
    `the optional fields with an empty slot are ${blankOptional.join(", ")}, expected two`
  );

  // The one required blank carries nothing at all, not merely no token: the
  // spec's own words are "no placeholder token and no text in its body section".
  assert.equal(
    bodyById.get(BLANK_REQUIRED_FIELD_ID).body.trim(), "",
    `${BLANK_REQUIRED_FIELD_ID}'s body section carries text; the required blank is a genuine omission`
  );
  assert.match(
    bodyById.get(BLANK_REQUIRED_FIELD_ID).name, /scope-change/i,
    `${BLANK_REQUIRED_FIELD_ID} is "${bodyById.get(BLANK_REQUIRED_FIELD_ID).name}" and not the scope-change clause`
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

test("SMB-C2A T-B4: every non-empty token is the snake_case of its own field name, recomputed", () => {
  const { declared, bodyById } = contractFields();
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
  assert.equal(checked, FIELD_COUNT - 3, `${checked} tokens were recomputed, expected ${FIELD_COUNT - 3}`);

  // Every brace token anywhere in the document is one of those slots or its
  // twin in the field list. A specimen token in the prose would make the
  // template's own accounting of its slots untrue.
  const declaredTokens = new Set(declared.flatMap((r) => tokensIn(r.placeholder_token)));
  for (const token of tokensIn(contract())) {
    assert.ok(
      declaredTokens.has(token),
      `the template carries {{${token}}}, which is not a token of its own required-field list`
    );
  }
});

test("SMB-C2A T-B6: the contract template carries no digit-bearing token other than a field id", () => {
  const residue = contract().replace(/CFD-LDB-\d{2}/g, " ");
  const digits = residue.match(/\S*\d\S*/g) ?? [];
  assert.deepEqual(
    [...new Set(digits)], [],
    "the contract template states figures; a blank template carries no client, no price, no date and no"
    + " count, and its own field ids are the only place a digit belongs"
  );
});

test("SMB-C2A: the closing note states that generation stops on an empty required slot and never fills one", () => {
  const text = contract();
  const closing = sections(text).sections.at(-1);
  assert.ok(
    /\bstops\b|\bstop\b/i.test(closing.body),
    "the closing note does not say that generation stops"
  );
  assert.ok(
    /names? the field/i.test(closing.body),
    "the closing note does not say that generation names the field it stopped on"
  );
  assert.ok(
    /working file/i.test(closing.body),
    "the closing note does not say that an empty required slot is never filled from a working file"
  );
  assert.ok(
    /optional field/i.test(closing.body),
    "the closing note does not say that an optional field's empty slot is not a stop, which is the"
    + " distinction the plant turns on"
  );
});

// ================================================= SMB-09, the control document

test("SMB-C2A T-C1: the welcome pack declares fourteen placeholders and uses each once, in the same order", () => {
  const { declared, body } = welcomeParts();
  assert.equal(
    declared.length, PLACEHOLDER_COUNT,
    `the placeholder table carries ${declared.length} rows, expected ${PLACEHOLDER_COUNT}`
  );

  const listed = declared.flatMap((r) => tokensIn(r.placeholder_token));
  assert.equal(listed.length, declared.length, "a placeholder table row carries no token, or carries two");
  for (const row of declared) {
    assert.ok(row["What it carries"].length > 0, `${row.placeholder_token} is listed without saying what it carries`);
  }

  const used = tokensIn(body);
  assert.deepEqual(
    used, listed,
    `the body uses ${used.join(", ")} and the table lists ${listed.join(", ")};`
    + " the two are the same tokens in the same order, each used once"
  );
  assert.equal(new Set(used).size, used.length, "a placeholder is used more than once in the body");
  assert.equal(new Set(listed).size, listed.length, "a placeholder is listed more than once in the table");

  // Nothing brace-shaped exists outside those two places.
  assert.equal(
    tokensIn(welcome()).length, PLACEHOLDER_COUNT * 2,
    "the welcome pack carries a brace token that is neither a table row nor its one use in the body"
  );
});

test("SMB-C2A T-C2: every welcome pack token is snake_case, and the pack runs its nine sections in order", () => {
  const { declared } = welcomeParts();
  for (const row of declared) {
    const [token] = tokensIn(row.placeholder_token);
    assert.equal(
      token, snakeCase(token),
      `{{${token}}} is not snake_case; a token is lowercase words joined by single underscores`
    );
    assert.match(token, /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/, `{{${token}}} is not a well formed token`);
  }

  const titles = sections(welcome()).sections.map((s) => s.title);
  assert.equal(titles.length, WELCOME_SECTION_COUNT, `the welcome pack runs ${titles.length} sections, expected ${WELCOME_SECTION_COUNT}`);
  assert.deepEqual(
    titles.map((t) => t.match(/^(\d+)\./)?.[1]),
    titles.map((_, i) => String(i + 1)),
    `the welcome pack's sections are not numbered 1 upward in order: ${titles.join(" / ")}`
  );
});

test("SMB-C2A T-C3: the blank-slot predicate returns one on the contract template and zero on the welcome pack", () => {
  // SMB-07: the field table supplies the required flags.
  const { declared: fieldRows, bodyById } = contractFields();
  const contractDeclarations = fieldRows
    .filter((r) => r.required === "yes")
    .map((r) => ({ id: r.field_id, filled: tokensIn(bodyById.get(r.field_id).body).length > 0 }));

  // SMB-09: the placeholder table declares no optional column, so every
  // placeholder the pack declares is a required slot. That is the whole of the
  // difference between the two documents, and it is why the same predicate can
  // run over both.
  const { declared: placeholderRows, body } = welcomeParts();
  const used = new Set(tokensIn(body));
  const welcomeDeclarations = placeholderRows.map((r) => {
    const [token] = tokensIn(r.placeholder_token);
    return { id: token, filled: used.has(token) };
  });

  assert.deepEqual(
    blankSlots(contractDeclarations), [BLANK_REQUIRED_FIELD_ID],
    "the predicate does not return exactly one blank required field on the contract template"
  );
  assert.deepEqual(
    blankSlots(welcomeDeclarations), [],
    "the welcome pack has acquired an empty required slot, which makes the SMB-07 plant a tautology:"
    + " a rule that has never returned zero on a structurally identical document is not a rule"
  );
  assert.equal(
    welcomeDeclarations.length, PLACEHOLDER_COUNT,
    "the predicate ran over fewer welcome pack declarations than the pack carries, so the zero is vacuous"
  );
});

test("SMB-C2A T-C5: the welcome pack carries no digit-bearing token other than a section number", () => {
  const residue = welcome()
    .split("\n")
    .map((line) => line.replace(/^(#{1,6}\s+)\d+\.\s/, "$1"))
    .join("\n");
  const digits = residue.match(/\S*\d\S*/g) ?? [];
  assert.deepEqual(
    [...new Set(digits)], [],
    "the welcome pack states figures; it is a template, every value it carries is a placeholder, and its"
    + " section numbers are the only digits in it"
  );
});

// ========================================== the properties over all three documents

test("SMB-C2A T-B5, T-C4: neither template names a canon company, and no document names a person", () => {
  const companies = canonCompanies();
  const studioName = companies.get("co-100");
  assert.ok(studioName?.length > 0, "canon carries no co-100 name, so the absence screen would pass vacuously");

  for (const doc of documents()) {
    if (doc.id === "SMB-06") continue; // canon_entities: [co-100, co-131]; it names both by design.
    for (const needle of ["co-100", "co-131", studioName]) {
      assert.ok(
        !doc.text.includes(needle),
        `${doc.label} carries "${needle}"; the templates declare canon_entities: [] and the LDB id`
        + " namespace is a token rather than a canon reference"
      );
    }
  }

  const people = canonPeople();
  assert.ok(
    people.size >= 80,
    `only ${people.size} names were derived from canon/people.md; the name build has broken`
  );
  for (const doc of documents()) {
    for (const person of people) {
      assert.ok(
        !doc.text.includes(person),
        `${doc.label} names the person ${person}; a human in this pack is a role or a household (rule R-ROLE)`
      );
    }
  }
});

test("SMB-C2A R-MOCK: no drafted document names a processor, a gateway, a card network, a bank product or an instrument", () => {
  for (const doc of documents()) {
    assert.deepEqual(
      denyHits(doc.text, PAYMENT_INSTRUMENTS), [],
      `${doc.label} names a payment instrument; this pack describes terms and draws and names no instrument`
    );
  }
});

test("SMB-C2A: every id in the three documents belongs to one of the namespaced 2a classes", () => {
  const ALLOWED = [LINE_ID, RATE_ID, FIELD_ID];
  for (const doc of documents()) {
    // An id-shaped token is an uppercase class, a hyphen and digits. SMB ids are
    // artifact references and are excluded; everything else has to be namespaced.
    const candidates = doc.text.match(/\b[A-Z]{3}(?:-[A-Z]{3})*-\d{2,}\b/g) ?? [];
    for (const id of new Set(candidates)) {
      if (/^SMB-\d{2}$/.test(id)) continue;
      assert.ok(
        ALLOWED.some((re) => re.test(id)),
        `${doc.label} carries the id ${id}, which is not one of the PLI-LDB, RTC-LDB or CFD-LDB classes (rule R-NS)`
      );
    }
  }
});

test("SMB-C2A: the three documents sit inside their word bands and carry no em dash and no en dash", () => {
  for (const doc of documents()) {
    const count = doc.text.split(/\s+/).filter(Boolean).length;
    const [low, high] = doc.band;
    assert.ok(
      count >= low && count <= high,
      `${doc.label} runs ${count} words, outside the ${low} to ${high} band`
    );
    assert.ok(!doc.text.includes("—"), `${doc.label} carries an em dash (U+2014)`);
    assert.ok(!doc.text.includes("–"), `${doc.label} carries an en dash (U+2013)`);
  }
});

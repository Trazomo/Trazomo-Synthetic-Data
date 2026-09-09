// Revenue cluster 5: the structural screen over the drafted surface of the
// attribution-and-deck cluster.
//
//   artifacts/REV-10/approved-claims-and-proposal-language.md
//     the drafted-frozen claims sheet: the approved proposal and deck language
//
// tests/drafted/rev-c4-drafted-screen.test.js is the house style this file
// follows, and its REV-05 parsers are the ones reused here: documents are read
// lazily inside each test, every expectation is re-derived from committed bytes
// rather than retyped, and the join keys are read off disk rather than
// remembered.
//
// What this file deliberately does NOT know: which sentence of the sheet a
// module's exercise is meant to catch, or which approved row a learner is
// expected to reach for. Those are per-instance answer keys and answer keys do
// not live in this repo (canon/people.md ground rules). What it recomputes is
// the derivation rule and every join behind it, because both are mechanical.
//
// Five mechanical rules are stated once here and used throughout.
//
//   The derivation rule (C5-P4, REV-C5-T5). An approved row cites at least one
//   REV-05 readout whose attribute equals the row's attribute, whose direction
//   is positive and whose deal's registry outcome is `won`. Two conditions ride
//   with it: no cited note may read the row's own attribute negatively, and the
//   row's attribute may not be a slug the corpus carries in both directions.
//   The rule is recomputed from the REV-05 bytes on every run; nothing about
//   which notes qualify is typed into this file.
//
//   The approved attribute universe (C5-P4). Derived, not pinned: the slugs the
//   corpus reads out positively at won deals, minus the slugs it reads in both
//   directions. Over the frozen corpus that difference is {feature_fit,
//   champion_strength, integration_depth} and the remainder, procurement_process,
//   is what forces the single unapproved row. Both halves are asserted, so a
//   corpus edit that changes either fails here by name instead of silently
//   widening what a deck may say.
//
//   Numeric extraction (the zero-figures rule). A numeric token is any
//   digit-bearing run left in the sheet after the following are removed: ISO
//   dates, and the three pinned id formats the sheet is allowed to carry,
//   CL-NN, WL-NN and deal-NN. This is cluster 4's extraction rule narrowed to
//   the only patterns this document has business carrying: no co-NNN, no
//   REV-NN, no opportunity key. Every other digit on the sheet is a figure, and
//   the sheet's own governing prose says it states none.
//
//   Verbatim quotation. A row that quotes the buyer quotes it from a note it
//   cites. Every double-quoted span of twenty characters or more inside a row's
//   language has to byte-appear inside a readout note of one of that row's own
//   cited records. A quote that has been tidied, trimmed or moved to a
//   different note fails here.
//
//   The name and vocabulary screens. Person names are the union of canon's
//   seated and recorded names, every CORE-03 contact name and every REV-03
//   subject name, screened as exact substrings. Real-company names,
//   certification vocabulary and consent-state vocabulary are pinned lists
//   matched on word boundaries and case-insensitively, the cluster-4 deny-list
//   mechanism.
//
// The deterministic half of REV-10 is generated rather than drafted, and it is
// authored in the same wave as this file. The three tests that read
// `datasets/revenue/deck-and-proposal-source-pack/` fail with an explicit "not
// yet on disk" message whenever the generator has not run. They are NOT
// skipped: T5's second clause (no manifest slot binds CL-08) is a real gate,
// and a screen that goes quiet when its input is missing is worse than one that
// goes red.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { csvTable } from "../helpers/csv-table.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");

/** datagen/src/dates.js#ANCHOR_DATE. The sheet is compiled as of the seed clock. */
const ANCHOR_DATE = "2026-03-16";

/** The seven columns of the REV-05 deal registry, order-independent. */
const REGISTRY_COLUMNS = ["deal_id", "account_id", "segment", "amount", "outcome", "close_date", "opportunity_id"];

/** The pinned readout vocabulary of the REV-05 governing prose. */
const ATTRIBUTE_SLUGS = [
  "procurement_process",
  "price_sensitivity",
  "onboarding_effort",
  "integration_depth",
  "champion_strength",
  "feature_fit",
  "security_review",
];

/** The pinned direction enum. */
const DIRECTIONS = ["positive", "negative"];

/** The sheet's own status vocabulary, and nothing else. */
const STATUSES = ["approved", "unapproved"];

/** The eight claim ids the spec pins, rebuilt rather than typed one by one. */
const CLAIM_COUNT = 8;

/** The single unapproved row, and the slug that forces it. */
const UNAPPROVED_CLAIM_ID = "CL-08";
const CONTRADICTED_SLUG = "procurement_process";

/** The attribute set an approved row may draw on. Derived below; asserted equal to this. */
const APPROVED_ATTRIBUTES = ["champion_strength", "feature_fit", "integration_depth"];

/** The four fields every row carries, beside its language block. */
const ROW_FIELDS = ["claim_id", "status", "attribute", "citations"];

const pad = (n) => String(n).padStart(2, "0");

// --------------------------------------------------------------- documents

const SHEET_PATH = join(REPO_ROOT, "artifacts", "REV-10", "approved-claims-and-proposal-language.md");
const CORPUS_PATH = join(REPO_ROOT, "artifacts", "REV-05", "win-loss-call-note-corpus.md");
const PACK_DIR = join(REPO_ROOT, "datasets", "revenue", "deck-and-proposal-source-pack");
const MANIFEST_PATH = join(PACK_DIR, "template-manifest.yaml");
const TEMPLATE_PATH = join(PACK_DIR, "deck-template.pptx");
const SIGNAL_EVENT_LOGS_PATH = join(
  REPO_ROOT, "datasets", "revenue", "signal-event-logs", "signal-event-logs.jsonl"
);

/**
 * Read a file, or fail with the path that is missing. The deterministic half of
 * REV-10 lands after this file does, and a missing input has to say so rather
 * than throw an ENOENT out of an unrelated assertion.
 */
function onDisk(path, label) {
  assert.ok(existsSync(path), `${label} is not yet on disk: ${path}`);
  return readFileSync(path, "utf8");
}

const sheet = () => onDisk(SHEET_PATH, "REV-10/approved-claims-and-proposal-language.md");
const corpus = () => onDisk(CORPUS_PATH, "REV-05/win-loss-call-note-corpus.md");
const manifestText = () => onDisk(MANIFEST_PATH, "the REV-10 deck template manifest");
const manifest = () => yaml.load(manifestText());

/**
 * The template package as text. The generator writes it as a ZIP with STORED
 * (uncompressed) entries, so every XML part sits verbatim in the file bytes and
 * a substring screen over the raw bytes screens the XML. Read as latin1 so no
 * byte sequence is lost to replacement characters on the way in.
 */
function templateBytesAsText() {
  assert.ok(existsSync(TEMPLATE_PATH), `the REV-10 deck template is not yet on disk: ${TEMPLATE_PATH}`);
  const text = readFileSync(TEMPLATE_PATH, "latin1");
  assert.ok(
    text.includes("<?xml"),
    "the deck template carries no literal XML declaration; its entries are not stored uncompressed"
    + " and this substring screen would pass vacuously over compressed bytes"
  );
  return text;
}

const coreTable = (file) =>
  csvTable(readFileSync(join(REPO_ROOT, "datasets", "core", "crm-seed-dataset", file), "utf8"));

// ----------------------------------------------------------- markdown tables

const isTableLine = (line) => line.trim().startsWith("|");
const tableCells = (line) => line.split("|").slice(1, -1).map((c) => c.trim());
const isRule = (cells) => cells.every((c) => /^:?-+:?$/.test(c));

/**
 * Every markdown table in `text` whose header cells are exactly `columns`, in
 * any order, as `{headerLine, rows}`. Rows are keyed by the header's own names,
 * so a reordered registry still parses and a renamed column fails loudly.
 */
function tablesWithColumns(text, columns) {
  const want = [...columns].sort();
  const lines = text.split("\n");
  const found = [];
  for (const [i, line] of lines.entries()) {
    if (!isTableLine(line)) continue;
    const head = tableCells(line);
    if (head.length !== columns.length) continue;
    if (JSON.stringify([...head].sort()) !== JSON.stringify(want)) continue;
    const rows = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      if (!isTableLine(lines[j])) break;
      const cells = tableCells(lines[j]);
      if (isRule(cells)) continue;
      rows.push(Object.fromEntries(head.map((c, k) => [c, cells[k] ?? ""])));
    }
    found.push({ headerLine: i + 1, rows });
  }
  return found;
}

// ------------------------------------------------------- the REV-05 corpus

/**
 * The one deal registry: the single markdown table carrying the seven registry
 * columns. Two such tables, or none, is a failure of its own.
 */
function registry() {
  const tables = tablesWithColumns(corpus(), REGISTRY_COLUMNS);
  assert.equal(
    tables.length, 1,
    `the corpus carries ${tables.length} deal-registry tables (columns ${REGISTRY_COLUMNS.join(", ")}), expected exactly 1`
  );
  const rows = tables[0].rows;
  assert.ok(rows.length > 0, "the deal registry parsed to no rows");
  return rows;
}

const RECORD_HEAD = /^#{2,4}\s*(WL-\d{2})\b/;

/** Each `### WL-NN` section of the corpus, heading excluded, as `{id, body}`. */
function records() {
  const lines = corpus().split("\n");
  const out = [];
  for (const [i, line] of lines.entries()) {
    const m = line.match(RECORD_HEAD);
    if (!m) continue;
    const body = [];
    for (let j = i + 1; j < lines.length && !lines[j].startsWith("#"); j += 1) body.push(lines[j]);
    out.push({ id: m[1], body: body.join("\n") });
  }
  assert.ok(out.length > 0, "the corpus carries no WL-NN call-note records");
  return out;
}

/** The deal a record's header block names. */
function recordDeal(record) {
  const line = record.body.split("\n").find((l) => /deal[_ ]id/i.test(l));
  assert.ok(line, `${record.id} carries no deal_id line`);
  const m = line.match(/deal-\d{2}/);
  assert.ok(m, `${record.id}'s deal_id line names no deal-NN: ${JSON.stringify(line)}`);
  return m[0];
}

/**
 * `attribute: <slug> / direction: <positive|negative> / note: "<the buyer's own
 * framing>"`, with a leading bullet and markdown backticks tolerated and nothing
 * else. A line that opens `attribute:` and does not parse fails here rather than
 * screening as absent.
 */
const READOUT = /^attribute:\s*`?([a-z_]+)`?\s*\/\s*direction:\s*`?([a-z]+)`?\s*\/\s*note:\s*["“](.+)["”]\s*$/;

function readouts(record) {
  const out = [];
  for (const raw of record.body.split("\n")) {
    const line = raw.trim().replace(/^[-*+]\s*/, "").replace(/^\*\*|\*\*$/g, "").trim();
    if (!/^attribute:/i.test(line)) continue;
    const m = line.match(READOUT);
    assert.ok(
      m,
      `${record.id} carries a readout line that does not parse as`
      + ` attribute: <slug> / direction: <direction> / note: "<prose>": ${JSON.stringify(line)}`
    );
    out.push({ record: record.id, attribute: m[1], direction: m[2], note: m[3].trim() });
  }
  return out;
}

/**
 * The whole readout table, rebuilt from the committed corpus bytes: one entry
 * per readout, carrying its record, its deal, that deal's registry outcome, the
 * slug, the direction and the buyer's verbatim note.
 */
function readoutTable() {
  const outcomeByDeal = new Map(registry().map((r) => [r.deal_id, r.outcome]));
  const table = [];
  for (const record of records()) {
    const deal = recordDeal(record);
    assert.ok(outcomeByDeal.has(deal), `${record.id} names ${deal}, which resolves in no registry row`);
    for (const readout of readouts(record)) {
      assert.ok(
        ATTRIBUTE_SLUGS.includes(readout.attribute),
        `${record.id} reads out "${readout.attribute}", which is not in the pinned seven-slug vocabulary`
      );
      assert.ok(
        DIRECTIONS.includes(readout.direction),
        `${record.id} reads out direction "${readout.direction}", which is not positive or negative`
      );
      table.push({ ...readout, deal, outcome: outcomeByDeal.get(deal) });
    }
  }
  assert.ok(table.length > 0, "the readout table rebuilt to nothing; the corpus parse has broken");
  return table;
}

/** Every slug the corpus carries in both directions anywhere. */
function contradictedSlugs(table) {
  const bySlug = new Map();
  for (const r of table) {
    if (!bySlug.has(r.attribute)) bySlug.set(r.attribute, new Set());
    bySlug.get(r.attribute).add(r.direction);
  }
  return [...bySlug.entries()].filter(([, dirs]) => dirs.size === 2).map(([slug]) => slug).sort();
}

/**
 * The attribute universe an approved row may draw on, derived rather than
 * pinned: read out positively at a won deal, and never read in both directions.
 */
function approvedAttributeUniverse(table) {
  const contradicted = new Set(contradictedSlugs(table));
  const positiveOnWon = new Set(
    table.filter((r) => r.direction === "positive" && r.outcome === "won").map((r) => r.attribute)
  );
  return [...positiveOnWon].filter((slug) => !contradicted.has(slug)).sort();
}

// ------------------------------------------------------------- the sheet

const CLAIM_HEAD = /^#{2,4}\s*(CL-\d{2})\b/;
const FIELD_LINE = /^[-*+]\s*`?([a-z_]+)`?\s*:\s*(.+?)\s*$/;
const LANGUAGE_MARKER = /^\*\*Language\.\*\*\s*/;

/**
 * Each `### CL-NN` row of the sheet, as `{id, fields, language}`. The language
 * block runs from the `**Language.**` marker to the end of the row, so a row
 * whose language is several paragraphs parses whole.
 */
function claimRows() {
  const lines = sheet().split("\n");
  const heads = [];
  for (const [i, line] of lines.entries()) {
    const m = line.match(CLAIM_HEAD);
    if (m) heads.push({ id: m[1], line: i });
  }
  assert.ok(heads.length > 0, "the claims sheet carries no CL-NN rows");

  const out = [];
  for (const [k, head] of heads.entries()) {
    const end = k + 1 < heads.length ? heads[k + 1].line : lines.length;
    const body = lines.slice(head.line + 1, end);

    const fields = {};
    for (const raw of body) {
      const m = raw.trim().match(FIELD_LINE);
      if (!m) continue;
      if (LANGUAGE_MARKER.test(raw.trim())) continue;
      fields[m[1]] = m[2].replace(/`/g, "").trim();
    }

    const markerIndex = body.findIndex((l) => LANGUAGE_MARKER.test(l.trim()));
    assert.ok(markerIndex >= 0, `${head.id} carries no **Language.** block, so its proposal language is unstated`);
    const language = body
      .slice(markerIndex)
      .join("\n")
      .replace(LANGUAGE_MARKER, "")
      .trim();
    assert.ok(language.length > 0, `${head.id}'s language block is empty`);

    out.push({ id: head.id, fields, language });
  }
  return out;
}

/** Everything above the first CL-NN row: the sheet's governing prose. */
function governingProse() {
  const lines = sheet().split("\n");
  const first = lines.findIndex((l) => CLAIM_HEAD.test(l));
  assert.ok(first > 0, "the claims sheet carries no governing prose above its first CL-NN row");
  const prose = lines.slice(0, first).join("\n");
  assert.ok(prose.trim().length > 0, "the claims sheet's governing prose is empty");
  return prose;
}

/** `WL-NN / deal-NN`, semicolon separated. A malformed citation fails rather than screening as absent. */
function citations(row) {
  const raw = row.fields.citations;
  assert.ok(raw, `${row.id} carries no citations field`);
  const parsed = [];
  for (const piece of raw.split(";")) {
    const text = piece.trim();
    if (!text) continue;
    const m = text.match(/^(WL-\d{2})\s*\/\s*(deal-\d{2})$/);
    assert.ok(
      m,
      `${row.id} carries a citation that does not parse as WL-NN / deal-NN: ${JSON.stringify(text)}`
    );
    parsed.push({ record: m[1], deal: m[2] });
  }
  assert.ok(parsed.length > 0, `${row.id} carries an empty citations field`);
  return parsed;
}

const approvedRows = (rows) => rows.filter((r) => r.fields.status === "approved");

// ------------------------------------------------- the numeric-extraction rule

/**
 * Everything a digit may legitimately sit inside on this sheet, and nothing
 * else. Cluster 4's rule narrowed to the three id formats this document carries
 * plus the ISO date of its compiled-as-of line: the sheet has no business
 * carrying an opportunity key, an event id or an account id, so those patterns
 * are deliberately absent and a digit inside one would report as a figure.
 */
const NUMERIC_EXCLUSIONS = [
  "\\d{4}-\\d{2}-\\d{2}",
  "CL-\\d{2}",
  "WL-\\d{2}",
  "deal-\\d{2}",
];

/** $310,000 / 2,400 / 31.5 / 25%, and never a trailing comma or stop. */
const NUMERIC_TOKEN = /\$?\d+(?:,\d{3})*(?:\.\d+)?%?/g;

/** Every numeric token in `text` under the pinned rule. */
function numericTokens(text, exclusions = NUMERIC_EXCLUSIONS) {
  const residue = text.replace(new RegExp(exclusions.join("|"), "g"), " ");
  return residue.match(NUMERIC_TOKEN) ?? [];
}

// ------------------------------------------------------------ the name screen

/**
 * Every name canon seats or records: the `Name`, `Retired name` and
 * `Frozen name` columns of `canon/people.md`, which between them cover the
 * seated cast, the errata aliases, the reserved-but-unused names and the two
 * names retired off the real-person collision screen. A drafted surface may
 * carry none of them.
 */
function canonPeople() {
  const NAME_HEADS = ["name", "retired name", "frozen name"];
  const lines = readFileSync(join(REPO_ROOT, "canon", "people.md"), "utf8").split("\n");
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

/**
 * The full roster no drafted surface may name: canon's own names, every CORE-03
 * contact and every REV-03 signal subject, current or prior.
 */
function screenedPeople() {
  const names = canonPeople();
  for (const c of coreTable("contacts.csv").rows) names.add(`${c.first_name} ${c.last_name}`);
  for (const line of readFileSync(SIGNAL_EVENT_LOGS_PATH, "utf8").trim().split("\n")) {
    if (!line) continue;
    const row = JSON.parse(line);
    if (row.subject_name) names.add(row.subject_name);
    if (row.subject_prior_name) names.add(row.subject_prior_name);
  }
  return names;
}

/** Every accounts.csv account name, the canon company names this pack ships. */
const accountNames = () => coreTable("accounts.csv").rows.map((a) => ({ id: a.account_id, name: a.name }));

// ------------------------------------------------------------- deny lists

/**
 * Real companies and real products. The universe is fictional and a deck built
 * from this sheet is shown to a customer, so a real vendor name on it is a
 * claim about a real party that nobody in this repo is in a position to make.
 * Entries are chosen so that none of them is also an ordinary English word:
 * "Box", "Word", "Segment", "Outreach", "Notion" and their kind are left off
 * deliberately rather than forgotten.
 */
const REAL_COMPANIES = [
  "Salesforce", "HubSpot", "Microsoft", "Oracle", "Google", "Amazon", "IBM", "Workday",
  "NetSuite", "Slack", "Atlassian", "Jira", "Confluence", "ServiceNow", "Zendesk", "Adobe",
  "Intuit", "QuickBooks", "Xero", "Stripe", "Shopify", "Snowflake", "Databricks", "Asana",
  "Trello", "Gainsight", "ZoomInfo", "Marketo", "Pardot", "Mailchimp", "LinkedIn", "Facebook",
  "Anthropic", "OpenAI", "ChatGPT", "Tableau", "PowerPoint", "DocuSign", "Coupa", "Zuora",
  "Twilio", "SendGrid", "Klaviyo", "Dropbox", "Figma", "GitHub", "GitLab", "Airtable",
  "Smartsheet", "Pipedrive", "Freshworks", "SugarCRM", "Salesloft", "Braze", "Amplitude",
];

/**
 * Certification and compliance vocabulary. The sheet is proposal language and
 * REV-06 is the register of what the seller actually holds; a certification
 * claim that travels in a deck instead of in the register is exactly the drift
 * the revenue track's control modules exist to catch.
 */
const CERTIFICATION_VOCABULARY = [
  "certification", "certifications", "certified", "certifies", "certificate",
  "accredited", "accreditation", "attestation", "attested",
  "compliant", "compliance",
  "SOC", "ISO", "IEC", "GDPR", "HIPAA", "FedRAMP", "HITRUST", "PCI DSS", "Cyber Essentials",
];

/**
 * Consent-state vocabulary. Contactability is decided by the REV-01 consent and
 * suppression master at the point of contact. A sheet of deck language that
 * reasons about consent state is a sheet that has started minting one.
 */
const CONSENT_VOCABULARY = [
  "consent", "consented", "consents",
  "suppressed", "suppression", "unsuppressed",
  "opt-in", "opt in", "opt-out", "opt out", "opted", "unsubscribe", "do not contact",
  "lawful basis", "legitimate interest",
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

// ============================================================== the sheet

test("REV-C5: the claims sheet parses into governing prose and eight sequential CL rows", () => {
  assert.ok(governingProse().length > 0, "the claims sheet carries no governing prose");

  const rows = claimRows();
  assert.equal(rows.length, CLAIM_COUNT, `the sheet carries ${rows.length} claim rows, expected ${CLAIM_COUNT}`);
  assert.deepEqual(
    rows.map((r) => r.id),
    rows.map((_, i) => `CL-${pad(i + 1)}`),
    "the claim ids are not CL-01 upward, zero-padded, in order with no gap"
  );

  for (const row of rows) {
    for (const field of ROW_FIELDS) {
      assert.ok(
        Object.hasOwn(row.fields, field),
        `${row.id} carries no ${field} field; every row carries ${ROW_FIELDS.join(", ")} and a language block`
      );
    }
    assert.equal(
      row.fields.claim_id, row.id,
      `${row.id}'s heading and its claim_id field disagree (${row.fields.claim_id})`
    );
    assert.ok(
      STATUSES.includes(row.fields.status),
      `${row.id} carries status "${row.fields.status}", which is not in the pinned vocabulary ${STATUSES.join(", ")}`
    );
    assert.ok(
      ATTRIBUTE_SLUGS.includes(row.fields.attribute),
      `${row.id} carries attribute "${row.fields.attribute}", which is not a slug of REV-05's pinned vocabulary`
    );
    assert.ok(row.language.length > 40, `${row.id}'s language block is too short to be proposal language`);
  }
});

test("REV-C5: the governing prose pins the derivation rule, the citation format, the status vocabulary and the no-figures rule", () => {
  const prose = governingProse();

  assert.ok(
    prose.includes(
      "cites at least one readout whose attribute equals the row's attribute,"
      + " whose direction is positive, and whose deal's registry outcome is won"
    ),
    "the governing prose does not state the derivation rule in full; all three clauses have to be readable on the sheet"
  );
  assert.ok(
    /positive readout on a lost deal is not support/i.test(prose),
    "the governing prose does not state that a positive readout on a lost deal is excluded;"
    + " the won-outcome clause is the tooth in the rule and it has to be visible"
  );
  assert.ok(
    prose.includes("WL-NN / deal-NN"),
    "the governing prose does not state the citation format WL-NN / deal-NN"
  );
  assert.ok(
    prose.includes("Two values and no others: approved and unapproved"),
    "the governing prose does not pin the two-value status vocabulary"
  );
  assert.ok(
    /Every number a deck states comes from the numbers view/i.test(prose),
    "the governing prose does not say that every number a deck states comes from the numbers view;"
    + " the zero-figures rule has to be stated where a deck author reads it"
  );
  for (const slug of [...APPROVED_ATTRIBUTES, CONTRADICTED_SLUG]) {
    assert.ok(prose.includes(slug), `the governing prose does not name the attribute slug ${slug}`);
  }

  const line = prose.split("\n").find((l) => /compiled as of/i.test(l));
  assert.ok(line, "the claims sheet carries no compiled-as-of line");
  const date = line.match(/\d{4}-\d{2}-\d{2}/);
  assert.ok(date, `the compiled-as-of line carries no ISO date: ${JSON.stringify(line)}`);
  assert.equal(
    date[0], ANCHOR_DATE,
    `the sheet is compiled as of ${date[0]}, not the seed clock ${ANCHOR_DATE}`
  );
});

test("REV-C5-T5: exactly one row is unapproved, it is CL-08, and it carries the corpus's contradicted slug", () => {
  const rows = claimRows();
  const unapproved = rows.filter((r) => r.fields.status === "unapproved");
  assert.equal(
    unapproved.length, 1,
    `${unapproved.length} rows are unapproved (${unapproved.map((r) => r.id).join(", ")}), expected exactly 1`
  );
  assert.equal(unapproved[0].id, UNAPPROVED_CLAIM_ID, `the unapproved row is ${unapproved[0].id}, expected ${UNAPPROVED_CLAIM_ID}`);

  const contradicted = contradictedSlugs(readoutTable());
  assert.deepEqual(
    contradicted, [CONTRADICTED_SLUG],
    `the corpus carries ${contradicted.length} slugs in both directions (${contradicted.join(", ")}),`
    + ` expected exactly one, ${CONTRADICTED_SLUG}; the cardinality of the unapproved rows follows from this`
  );
  assert.equal(
    unapproved[0].fields.attribute, CONTRADICTED_SLUG,
    `${UNAPPROVED_CLAIM_ID} carries attribute "${unapproved[0].fields.attribute}", not the contradicted slug ${CONTRADICTED_SLUG}`
  );

  const carrying = rows.filter((r) => r.fields.attribute === CONTRADICTED_SLUG);
  assert.deepEqual(
    carrying.map((r) => r.id), [UNAPPROVED_CLAIM_ID],
    `${carrying.length} rows carry ${CONTRADICTED_SLUG} (${carrying.map((r) => r.id).join(", ")}),`
    + ` expected exactly one and that one unapproved`
  );
});

test("REV-C5-P4: the approved attribute universe recomputes from the corpus and every approved row sits inside it", () => {
  const table = readoutTable();
  const universe = approvedAttributeUniverse(table);
  assert.deepEqual(
    universe, APPROVED_ATTRIBUTES,
    `the corpus's positive-on-won slugs minus its both-direction slugs are ${universe.join(", ")},`
    + ` not ${APPROVED_ATTRIBUTES.join(", ")}; the sheet's approved language rests on this derivation`
  );

  // The excluded positives are real, so the won-outcome clause is doing work
  // rather than describing an empty set.
  const positivesOnLost = table.filter((r) => r.direction === "positive" && r.outcome === "lost");
  assert.ok(
    positivesOnLost.length > 0,
    "the corpus carries no positive readout at a lost deal, so the won-outcome clause excludes nothing"
    + " and the derivation rule has lost its tooth"
  );

  for (const row of approvedRows(claimRows())) {
    assert.ok(
      universe.includes(row.fields.attribute),
      `${row.id} is approved on attribute ${row.fields.attribute}, which is outside the derived universe`
      + ` ${universe.join(", ")} (positive at a won deal, and never read in both directions)`
    );
  }
});

test("REV-C5-P4: every approved row's citations resolve to a positive readout on a won deal, and none contradicts its own attribute", () => {
  const table = readoutTable();
  const byRecord = new Map();
  for (const r of table) {
    if (!byRecord.has(r.record)) byRecord.set(r.record, []);
    byRecord.get(r.record).push(r);
  }
  const dealByRecord = new Map(records().map((r) => [r.id, recordDeal(r)]));
  const outcomeByDeal = new Map(registry().map((r) => [r.deal_id, r.outcome]));

  const rows = approvedRows(claimRows());
  assert.ok(rows.length > 0, "the sheet carries no approved row at all");

  for (const row of rows) {
    const cited = citations(row);
    for (const citation of cited) {
      const readoutsOfRecord = byRecord.get(citation.record);
      assert.ok(
        readoutsOfRecord,
        `${row.id} cites ${citation.record}, which is not a record of the corpus`
      );
      assert.equal(
        dealByRecord.get(citation.record), citation.deal,
        `${row.id} cites ${citation.record} / ${citation.deal}, but ${citation.record} sits on`
        + ` ${dealByRecord.get(citation.record)}; the deal half of a citation is the corpus's own join key`
      );
      assert.equal(
        outcomeByDeal.get(citation.deal), "won",
        `${row.id} is approved and cites ${citation.deal}, whose registry outcome is`
        + ` "${outcomeByDeal.get(citation.deal)}" and not won`
      );
      assert.ok(
        readoutsOfRecord.some((r) => r.direction === "positive"),
        `${row.id} cites ${citation.record}, which carries no positive readout at all`
      );
      const contradicting = readoutsOfRecord.filter(
        (r) => r.attribute === row.fields.attribute && r.direction === "negative"
      );
      assert.deepEqual(
        contradicting.map((r) => r.record), [],
        `${row.id} is approved on ${row.fields.attribute} but cites ${citation.record},`
        + ` which reads that same attribute negatively`
      );
    }

    const supporting = cited.filter((citation) =>
      byRecord.get(citation.record).some(
        (r) => r.attribute === row.fields.attribute && r.direction === "positive"
      ));
    assert.ok(
      supporting.length > 0,
      `${row.id} is approved on ${row.fields.attribute} but none of its citations`
      + ` (${cited.map((c) => `${c.record} / ${c.deal}`).join("; ")}) carries a positive readout on that attribute`
    );
  }
});

test("REV-C5-P4: CL-08 cites exactly the contradicted pair, and the two readings differ in direction", () => {
  const table = readoutTable();
  const pair = table.filter((r) => r.attribute === CONTRADICTED_SLUG);
  assert.equal(
    pair.length, 2,
    `the corpus carries ${pair.length} ${CONTRADICTED_SLUG} readouts, expected exactly 2 with no third record settling them`
  );
  assert.equal(
    new Set(pair.map((r) => r.direction)).size, 2,
    `the two ${CONTRADICTED_SLUG} readouts (${pair.map((r) => `${r.record} ${r.direction}`).join(", ")})`
    + " do not read in opposite directions, so nothing forces the unapproved row"
  );

  const rows = claimRows();
  const row = rows.find((r) => r.id === UNAPPROVED_CLAIM_ID);
  assert.ok(row, `the sheet carries no ${UNAPPROVED_CLAIM_ID} row`);

  const cited = citations(row);
  assert.deepEqual(
    cited.map((c) => c.record).sort(),
    pair.map((r) => r.record).sort(),
    `${UNAPPROVED_CLAIM_ID} cites ${cited.map((c) => c.record).join(", ")},`
    + ` not the contradicted pair ${pair.map((r) => r.record).join(", ")}`
  );

  const dealByRecord = new Map(records().map((r) => [r.id, recordDeal(r)]));
  const outcomeByDeal = new Map(registry().map((r) => [r.deal_id, r.outcome]));
  for (const citation of cited) {
    assert.equal(
      dealByRecord.get(citation.record), citation.deal,
      `${UNAPPROVED_CLAIM_ID} cites ${citation.record} / ${citation.deal}, but that record sits on`
      + ` ${dealByRecord.get(citation.record)}`
    );
  }
  assert.deepEqual(
    [...new Set(cited.map((c) => outcomeByDeal.get(c.deal)))].sort(), ["lost", "won"],
    `${UNAPPROVED_CLAIM_ID}'s citations do not span a won deal and a lost one;`
    + " the contradiction the row records is a contradiction across outcomes"
  );

  // The row has to say what it may not claim and why, and has to say that its
  // citations are evidence of the contradiction rather than support for it.
  assert.ok(
    /may not be made|cannot be made|may not be used/i.test(row.language),
    `${UNAPPROVED_CLAIM_ID} never states the claim that may not be made`
  );
  assert.ok(
    /contradict/i.test(row.language),
    `${UNAPPROVED_CLAIM_ID} never states that the two readings contradict each other`
  );
  assert.ok(
    /not support|evidence of the contradiction/i.test(row.language),
    `${UNAPPROVED_CLAIM_ID} does not say that its citations are the evidence of the contradiction rather than support`
  );
  assert.ok(
    /no third record|no resolution|settles neither|resolves neither/i.test(row.language),
    `${UNAPPROVED_CLAIM_ID} does not state that the corpus carries no resolution of the disagreement`
  );
});

test("REV-C5: every buyer quotation on the sheet is verbatim from a note the row cites", () => {
  const table = readoutTable();
  const notesByRecord = new Map();
  for (const r of table) {
    if (!notesByRecord.has(r.record)) notesByRecord.set(r.record, []);
    notesByRecord.get(r.record).push(r.note);
  }

  const rows = claimRows();
  const quotedRows = [];
  for (const row of rows) {
    const spans = [...row.language.matchAll(/"([^"]{20,})"/g)].map((m) => m[1]);
    if (spans.length === 0) continue;
    quotedRows.push(row.id);
    const available = citations(row).flatMap((c) => notesByRecord.get(c.record) ?? []);
    assert.ok(
      available.length > 0,
      `${row.id} quotes the buyer but none of its cited records carries a readout note`
    );
    for (const span of spans) {
      assert.ok(
        available.some((note) => note.includes(span)),
        `${row.id} quotes ${JSON.stringify(span.slice(0, 60))}, which does not byte-appear in any readout note of`
        + ` its cited records (${citations(row).map((c) => c.record).join(", ")});`
        + " buyer language is quoted verbatim from the note it is cited to"
      );
    }
  }
  assert.ok(
    quotedRows.length >= rows.length - 1,
    `only ${quotedRows.length} of ${rows.length} rows quote the buyer (${quotedRows.join(", ")});`
    + " every row but the account history row rests on the buyer's own words"
  );
});

test("REV-C5: the sheet carries zero numeric figure tokens and exactly one ISO date, on its compiled-as-of line", () => {
  const text = sheet();
  const tokens = [...new Set(numericTokens(text))];
  assert.deepEqual(
    tokens, [],
    `the claims sheet states figures: ${tokens.join(", ")}. Every number a deck states comes from the numbers view,`
    + " and the sheet's own governing prose says it carries none"
  );

  const dates = text.match(/\d{4}-\d{2}-\d{2}/g) ?? [];
  assert.deepEqual(
    dates, [ANCHOR_DATE],
    `the sheet carries the ISO dates ${dates.join(", ")}, expected exactly one, the compiled-as-of ${ANCHOR_DATE};`
    + " a close date or a term date on a row is a figure wearing a date's clothes"
  );
});

test("REV-C5: the account history row names the deal-01 account, cites won deals only and carries no numeral", () => {
  const names = accountNames();
  const rows = approvedRows(claimRows());

  const naming = rows
    .map((row) => ({ row, named: names.filter((a) => row.language.includes(a.name)) }))
    .filter((entry) => entry.named.length > 0);
  assert.equal(
    naming.length, 1,
    `${naming.length} approved rows name a CORE-03 account (${naming.map((e) => e.row.id).join(", ")}),`
    + " expected exactly one: the account history row for the account under review"
  );

  const { row, named } = naming[0];
  assert.equal(
    named.length, 1,
    `${row.id} names ${named.length} accounts (${named.map((a) => a.name).join(", ")}), expected exactly one`
  );

  const cited = citations(row);
  const dealsCited = [...new Set(cited.map((c) => c.deal))];
  assert.equal(
    dealsCited.length, 1,
    `${row.id} is the account history row but cites ${dealsCited.length} deals (${dealsCited.join(", ")});`
    + " an account history line stands on that account's own deal"
  );

  const deal = registry().find((r) => r.deal_id === dealsCited[0]);
  assert.ok(deal, `${row.id} cites ${dealsCited[0]}, which resolves in no registry row`);
  assert.equal(deal.outcome, "won", `${row.id} is the account history row on ${deal.deal_id}, whose outcome is ${deal.outcome}`);
  assert.equal(
    named[0].id, deal.account_id,
    `${row.id} names ${named[0].name} (${named[0].id}), which is not ${deal.deal_id}'s account ${deal.account_id}`
  );

  // Strictly qualitative: with the three id formats removed, no digit is left.
  // The ISO date is deliberately NOT excluded here, so a close date or a
  // contract year planted in this row fails by this row's name.
  const residue = row.language.replace(/CL-\d{2}|WL-\d{2}|deal-\d{2}/g, " ");
  const digits = residue.match(/\d/g) ?? [];
  assert.deepEqual(
    digits, [],
    `${row.id} carries numerals (${digits.join("")}); the account history line states no amount, no year,`
    + " no term and no count, because those figures live in the numbers view"
  );
  assert.ok(
    !row.language.includes("$"),
    `${row.id} carries a currency symbol; the account history line is qualitative`
  );

  // The account named once on the sheet, and only there.
  const occurrences = sheet().split(named[0].name).length - 1;
  assert.equal(
    occurrences, 1,
    `the account under review, ${named[0].name}, is named ${occurrences} times on the sheet, expected exactly once,`
    + " in the account history row"
  );
});

test("REV-C5: no canon, CORE-03 or REV-03 person name appears on the claims sheet", () => {
  const people = screenedPeople();
  assert.ok(
    people.size >= 140,
    `only ${people.size} people were derived from canon/people.md, contacts.csv and the REV-03 signal logs;`
    + " the name build has broken"
  );
  const text = sheet();
  for (const person of people) {
    assert.ok(!text.includes(person), `the claims sheet names the person ${person}; participants are recorded by role only`);
  }
});

test("REV-C5: the sheet names no real company", () => {
  assert.deepEqual(
    denyHits(sheet(), REAL_COMPANIES), [],
    "the claims sheet names a real company; every party in this universe is fictional and a deck built"
    + " from this sheet is shown to a customer"
  );
});

test("REV-C5: the sheet carries no certification claim and no consent-state vocabulary", () => {
  const text = sheet();
  assert.deepEqual(
    denyHits(text, CERTIFICATION_VOCABULARY), [],
    "the claims sheet carries certification or compliance vocabulary; what the seller holds is the REV-06"
    + " claims register's business and never a deck's"
  );
  assert.deepEqual(
    denyHits(text, CONSENT_VOCABULARY), [],
    "the claims sheet carries consent-state vocabulary; contactability is decided by the consent and"
    + " suppression master at the point of contact, and proposal language mints no consent state"
  );
});

test("REV-C5: the claims sheet carries no em dash and no en dash", () => {
  const text = sheet();
  assert.ok(!text.includes("—"), "the claims sheet carries an em dash (U+2014)");
  assert.ok(!text.includes("–"), "the claims sheet carries an en dash (U+2013)");
});

// ================================================ the deterministic half of REV-10
//
// The three tests below read datasets/revenue/deck-and-proposal-source-pack/,
// which the REV-10 generator writes. Where it has not run they fail with an
// explicit "not yet on disk" message, by design: T5's second clause is a real
// gate and a screen that skips when its input is absent is a screen that
// reports green on a pack that was never built.

test("REV-C5-T5: no manifest slot binds CL-08", () => {
  const doc = manifest();
  assert.ok(Array.isArray(doc?.slots) && doc.slots.length > 0, "the template manifest carries no slots list");

  const bound = doc.slots.filter((slot) => Array.isArray(slot.allowed_ids) && slot.allowed_ids.length > 0);
  assert.ok(
    bound.length > 0,
    "no manifest slot carries a non-empty allowed_ids list, so this screen would pass over an unbound manifest"
  );
  const claimSlots = doc.slots.filter((slot) => slot.source === "claims_sheet");
  assert.ok(
    claimSlots.length > 0,
    "the manifest binds no slot to the claims sheet, so the CL-08 clause has nothing to screen"
  );
  for (const slot of claimSlots) {
    assert.ok(
      Array.isArray(slot.allowed_ids) && slot.allowed_ids.length > 0,
      `manifest slot ${slot.slot} names source claims_sheet but carries no allowed_ids`
    );
  }

  for (const slot of doc.slots) {
    const ids = Array.isArray(slot.allowed_ids) ? slot.allowed_ids.map(String) : [];
    assert.ok(
      !ids.includes(UNAPPROVED_CLAIM_ID),
      `manifest slot ${slot.slot} binds ${UNAPPROVED_CLAIM_ID}, which is the sheet's unapproved row;`
      + " no deck slot may resolve an unapproved claim"
    );
  }
});

test("REV-C5-T5: every claims_sheet id the manifest binds resolves to an approved row of the sheet", () => {
  const doc = manifest();
  assert.ok(Array.isArray(doc?.slots) && doc.slots.length > 0, "the template manifest carries no slots list");

  const rows = new Map(claimRows().map((r) => [r.id, r]));
  const bound = new Set();
  for (const slot of doc.slots) {
    if (slot.source !== "claims_sheet") continue;
    for (const id of slot.allowed_ids ?? []) bound.add(String(id));
  }
  assert.ok(bound.size > 0, "the manifest binds no claim id at all");

  for (const id of bound) {
    const row = rows.get(id);
    assert.ok(row, `the manifest binds ${id}, which is not a row of the committed claims sheet`);
    assert.equal(
      row.fields.status, "approved",
      `the manifest binds ${id}, whose status on the sheet is "${row.fields.status}"`
    );
  }

  const approvedIds = new Set(approvedRows(claimRows()).map((r) => r.id));
  assert.deepEqual(
    [...bound].sort(), [...approvedIds].sort(),
    "the manifest's bound claim ids and the sheet's approved rows are not the same set;"
    + " an approved row nothing binds is language no slot can render"
  );
});

test("REV-C5: no canon, CORE-03 or REV-03 person name appears in the template manifest or the template package", () => {
  const people = screenedPeople();
  assert.ok(people.size >= 140, `only ${people.size} people were derived; the name build has broken`);

  const documents = [
    { label: "template-manifest.yaml", text: manifestText() },
    { label: "deck-template.pptx", text: templateBytesAsText() },
  ];
  for (const { label, text } of documents) {
    for (const person of people) {
      assert.ok(!text.includes(person), `${label} names the person ${person}`);
    }
  }
});

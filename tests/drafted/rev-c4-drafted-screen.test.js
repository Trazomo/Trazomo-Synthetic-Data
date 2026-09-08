// Revenue cluster 4: the structural screen over the three drafted surfaces of
// the research, positioning and campaigns cluster.
//
//   artifacts/REV-02/  three fact packets plus fact-index.json
//   artifacts/REV-05/  the win-loss call-note corpus
//   artifacts/REV-08/  the campaign offer brief (the drafted half of REV-08)
//
// tests/drafted/rev-c3-drafted-screen.test.js is the house style this file
// follows: documents are read lazily inside each test, every expectation is
// re-derived from committed bytes rather than retyped, and the CORE-03 join
// keys are read off disk rather than remembered.
//
// What this file deliberately does NOT know: which packet fact is the stale
// one, which index attribute carries the disagreeing pair, and which registry
// deals are the opposite-outcome pair. Those are per-instance answer keys and
// answer keys do not live in this repo (canon/people.md ground rules, restated
// in datagen/README.md). What it recomputes is the cardinality of each plant
// and every join, because both are mechanical.
//
// Four mechanical rules are stated once here and used throughout.
//
//   Numeric extraction (REV-C4-T1, REV-C4-T7). A numeric token is any
//   digit-bearing run left in a document after the following are removed: ISO
//   dates; the pinned join-key id formats (F-NN, SEG-NN, WL-NN, deal-NN,
//   co-NNN, opp-co-*, ev-NNNN, TPL-NN, ct-co-*, EMP-NNNN, REV-NN, CORE-NN);
//   the literal 90 when the word `days` follows it, which is the freshness
//   constant the packets are required to pin verbatim; and, in REV-05's
//   governing prose only, the amount-band constants 50000 and $50,000.00, which
//   the corpus is likewise required to pin verbatim. The rule is written once,
//   in `numericTokens`, and every screen below calls it.
//
//   Numeric resolution (REV-C4-T1, REV-C4-T7). A numeric token resolves when it
//   equals the string form of an indexed numeric `value`, or byte-appears
//   inside an indexed string `value`, or - in the offer brief only - equals the
//   campaign variant's row in `audience-counts.csv`. Nothing else resolves. A
//   figure that resolves to nothing is a figure the artifact invented, which is
//   the failure mode modules 13, 22 and 24 are built to catch.
//
//   Citation resolution (REV-C4-T1). A packet cites a fact by writing [F-NN].
//   The reference resolves when the index carries that fact_id AND that row's
//   `subject` is the packet's own subject. A packet may not cite another
//   subject's row, and every fact the index assigns to a packet is cited there.
//
//   The deny list (REV-C4). A pinned set of send verbs and automation hooks,
//   matched on word boundaries and case-insensitively. The corpus records calls
//   that already happened and the brief proposes a campaign; neither carries a
//   send path, which is what module 22's failure eval leans on.
//
// The REV-05 corpus is authored in the same wave as this file. Every test that
// reads it fails with an explicit "not yet on disk" message rather than
// throwing, so the REV-02 and REV-08 blocks stay meaningful before the corpus
// lands. For the same reason the em-dash sweep is split: the always-present
// files are swept in the house block at the foot of this file and the corpus
// sweeps itself inside the REV-05 block.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { csvTable } from "../helpers/csv-table.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");

/** datagen/src/dates.js#ANCHOR_DATE. The two-clock rule: nothing here dates past it. */
const ANCHOR_DATE = "2026-03-16";

/** 90 days before the anchor. Stale is a strict inequality against this date. */
const FRESHNESS_WINDOW_START = "2025-12-16";

/** The CORE-03 export window opens here; every won deal closed before it. */
const EXPORT_WINDOW_OPEN = "2025-07-20";

/** The seven keys every fact-index row carries, and nothing else. */
const INDEX_ROW_KEYS = ["fact_id", "subject", "attribute", "value", "collection_date", "source", "category"];

/** The seven columns of the REV-05 deal registry, order-independent. */
const REGISTRY_COLUMNS = ["deal_id", "account_id", "segment", "amount", "outcome", "close_date", "opportunity_id"];

/** The pinned readout vocabulary of the corpus's governing prose (data plan 2.2). */
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

/** The variant the offer brief targets. The brief names it; this is the join. */
const CAMPAIGN_VARIANT = "SEG-02";

/** Send verbs and automation hooks, word-boundary and case-insensitive. */
const DENY_LIST = ["send", "auto-send", "webhook", "api", "cron", "blast"];

/** The struck AI SDR statistic (plan-v2 section 8), screened by its token. */
const STRUCK_STATISTIC = /11x/i;

const pad = (n) => String(n).padStart(2, "0");

// --------------------------------------------------------------- documents

const REV02_DIR = join(REPO_ROOT, "artifacts", "REV-02");
const CORPUS_PATH = join(REPO_ROOT, "artifacts", "REV-05", "win-loss-call-note-corpus.md");
const BRIEF_PATH = join(REPO_ROOT, "artifacts", "REV-08", "campaign-offer-brief.md");

/**
 * Read a drafted file, or fail with the path that is missing. Cluster 4's three
 * surfaces are drafted in two waves, so a document that has not landed has to
 * say so rather than throw an ENOENT out of an unrelated block.
 */
function drafted(path, label) {
  assert.ok(existsSync(path), `${label} is not yet on disk: ${path}`);
  return readFileSync(path, "utf8");
}

const factIndexText = () => drafted(join(REV02_DIR, "fact-index.json"), "REV-02/fact-index.json");
const factIndex = () => JSON.parse(factIndexText());
const packetText = (file) => drafted(join(REV02_DIR, file), `REV-02/${file}`);
const corpus = () => drafted(CORPUS_PATH, "REV-05/win-loss-call-note-corpus.md");
const brief = () => drafted(BRIEF_PATH, "REV-08/campaign-offer-brief.md");

const coreTable = (file) =>
  csvTable(readFileSync(join(REPO_ROOT, "datasets", "core", "crm-seed-dataset", file), "utf8"));

const countsTable = () =>
  csvTable(readFileSync(
    join(REPO_ROOT, "datasets", "revenue", "campaign-segment-and-offer-brief", "audience-counts.csv"),
    "utf8"
  ));

/** The committed definitions file: the campaign block's own clause grammar, on disk rather than in memory. */
const segmentDefinitions = () =>
  JSON.parse(readFileSync(
    join(REPO_ROOT, "datasets", "revenue", "campaign-segment-and-offer-brief", "segment-definitions.json"),
    "utf8"
  ));

const suppressionTable = () =>
  csvTable(readFileSync(
    join(REPO_ROOT, "datasets", "revenue", "consent-suppression-master", "consent-suppression-master.csv"),
    "utf8"
  ));

// --------------------------------------------------- SF7: the brief's variant

/** The SEG-NN the brief itself names, read off its own "Segment variant" line rather than assumed. */
function briefVariantId(text) {
  const line = text.split("\n").find((l) => /segment variant/i.test(l));
  assert.ok(line, "the brief carries no segment-variant line naming which variant it targets");
  const m = line.match(/SEG-\d{2}/);
  assert.ok(m, `the brief's segment-variant line names no SEG-NN: ${JSON.stringify(line)}`);
  return m[0];
}

/**
 * One clause, re-implemented from the plan's own words, independently of both
 * the generator and its own test's filter: op eq matches when the account's
 * field byte-equals the clause's single value, op in when it byte-equals one
 * of them, and a blank industry satisfies no industry clause.
 */
function screenMatchesClause(account, clause) {
  const value = account[clause.field];
  if (clause.field === "industry" && value === "") return false;
  if (clause.op === "eq") return value === clause.values[0];
  if (clause.op === "in") return clause.values.includes(value);
  throw new Error(`unpublished clause op ${clause.op}`);
}

/** The base-population rule: accounts.csv rows whose duplicate_of_account_id is empty. */
const screenBasePopulation = () => coreTable("accounts.csv").rows.filter((a) => a.duplicate_of_account_id === "");

/** The account_ids a variant's own clauses select over the base population. */
function screenMatchedAccountIds(variant) {
  const population = screenBasePopulation();
  return new Set(
    population
      .filter((account) => variant.clauses.every((clause) => screenMatchesClause(account, clause)))
      .map((account) => account.account_id)
  );
}

/** Every account_id whose every consent-suppression-master row carries suppressed == "true". */
function whollySuppressedAccountIds() {
  const byAccount = new Map();
  for (const row of suppressionTable().rows) {
    if (!byAccount.has(row.account_id)) byAccount.set(row.account_id, []);
    byAccount.get(row.account_id).push(row);
  }
  const wholly = new Set();
  for (const [accountId, rows] of byAccount) {
    if (rows.length > 0 && rows.every((r) => r.suppressed === "true")) wholly.add(accountId);
  }
  return wholly;
}

// ------------------------------------------------- the numeric-extraction rule

/**
 * Everything a digit may legitimately sit inside without being a figure. Order
 * matters: the ISO date and the compound `opp-co-`/`ct-co-` keys are removed
 * before the bare `co-NNN` pattern, or `opp-co-124-01` would shed its middle and
 * leave `01` behind as a phantom figure.
 */
const NUMERIC_EXCLUSIONS = [
  "\\d{4}-\\d{2}-\\d{2}",
  "opp-co-[\\d-]+",
  "ct-co-[\\d-]+",
  "F-\\d{2}",
  "SEG-\\d{2}",
  "WL-\\d{2}",
  "deal-\\d{2}",
  "co-\\d{3}",
  "ev-\\d{4}",
  "TPL-\\d{2}",
  "EMP-\\d{4}",
  "REV-\\d{2}",
  "CORE-\\d{2}",
  "\\b90(?=\\s+days\\b)",
];

/** The amount-band constants, excluded only where the corpus pins them. */
const BAND_EXCLUSIONS = ["\\$50,000\\.00", "\\b50000\\b"];

/** 480 / 2,400 / 1,850 / $32.00 / 25%, and never a trailing comma or stop. */
const NUMERIC_TOKEN = /\$?\d+(?:,\d{3})*(?:\.\d+)?%?/g;

/**
 * Every numeric token in `text` under the pinned rule.
 *
 * @param {string} text
 * @param {{bandConstants?: boolean}} options `bandConstants` drops the REV-05
 *   band-function constants, which are governing prose rather than figures.
 */
function numericTokens(text, { bandConstants = false } = {}) {
  const patterns = bandConstants ? [...BAND_EXCLUSIONS, ...NUMERIC_EXCLUSIONS] : NUMERIC_EXCLUSIONS;
  const residue = text.replace(new RegExp(patterns.join("|"), "g"), " ");
  return residue.match(NUMERIC_TOKEN) ?? [];
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The resolution rule, closed over the index. `extra` carries the offer brief's
 * one non-REV-02 figure, the recomputable audience count.
 *
 * The string-containment path is boundary-guarded rather than a bare
 * `String.includes`: a token resolves against an indexed string value only
 * when it is not itself flanked by digits that would make it a fragment of a
 * longer number, so a short invented figure ("3") can no longer resolve
 * merely because it sits inside a longer indexed string ("...Standard
 * $32.00..."). The guard is asymmetric on purpose: a preceding comma is
 * excluded too (it is the thousands-grouping separator, so "400" is not
 * allowed to resolve off the tail of "2,400"), but a trailing comma is not,
 * because the index's own prose lists several money figures comma-separated
 * ("Team $19.00, Standard $32.00, Scale $57.00, ...") and a real figure that
 * happens to sit mid-list is still the figure, not an invented one.
 */
function resolverFrom(index, extra = []) {
  const numeric = new Set(
    index.facts.filter((f) => typeof f.value === "number").map((f) => String(f.value))
  );
  // R1: ISO dates inside indexed values are not resolvable figures, and a
  // token may not resolve off the head of a comma-grouped number ("12" in
  // "12,000") -- only a genuine list comma may follow.
  const strings = index.facts
    .filter((f) => typeof f.value === "string")
    .map((f) => f.value.replace(/\d{4}-\d{2}-\d{2}/g, " "));
  const boundaryMatch = (token, value) =>
    new RegExp(`(?<![\\d,.])${escapeRegExp(token)}(?![\\d.]|,\\d{3})`).test(value);
  return (token) =>
    numeric.has(token) || strings.some((v) => boundaryMatch(token, v)) || extra.includes(token);
}

/** The first match of every deny-list term in `text`, or an empty list. */
function denyHits(text) {
  const hits = [];
  for (const term of DENY_LIST) {
    const m = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").exec(text);
    if (m) hits.push(`${m[0]} (at index ${m.index})`);
  }
  return hits;
}

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

// --------------------------------------------------------------- the corpus

/** `310,000`, `$310,000` and `310000` all reduce to the CSV's own form. */
const amountDigits = (cell) => String(cell ?? "").replace(/[$,\s]/g, "");

/** A registry cell carries an opportunity id only when it looks like one. */
const opportunityIdIn = (cell) => (String(cell ?? "").match(/opp-co-[\w-]+/) ?? [null])[0];

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
  return { headerLine: tables[0].headerLine, rows };
}

/** Everything above the registry table: the corpus's governing prose. */
function governingProse() {
  const { headerLine } = registry();
  const prose = corpus().split("\n").slice(0, headerLine - 1).join("\n");
  assert.ok(
    prose.trim().length > 0,
    "the corpus carries no governing prose above its deal registry"
  );
  return prose;
}

const RECORD_HEAD = /^#{2,4}\s*(WL-\d{2})\b/;

/** Each `### WL-NN` section, heading excluded, as `{id, line, body}`. */
function records() {
  const lines = corpus().split("\n");
  const out = [];
  for (const [i, line] of lines.entries()) {
    const m = line.match(RECORD_HEAD);
    if (!m) continue;
    const body = [];
    for (let j = i + 1; j < lines.length && !lines[j].startsWith("#"); j += 1) body.push(lines[j]);
    out.push({ id: m[1], line: i + 1, body: body.join("\n") });
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

/** The first ISO date on the first line of `body` naming `field`. */
function fieldDate(body, field, id) {
  const line = body.split("\n").find((l) => new RegExp(field.replace("_", "[_ ]"), "i").test(l));
  assert.ok(line, `${id} carries no ${field} line`);
  const date = line.match(/\d{4}-\d{2}-\d{2}/);
  assert.ok(date, `${id}'s ${field} line carries no ISO date: ${JSON.stringify(line)}`);
  return date[0];
}

/**
 * `attribute: <slug> / direction: <positive|negative> / note: "<prose>"`, with a
 * leading bullet and markdown backticks tolerated and nothing else. A line that
 * opens `attribute:` and does not parse fails here rather than screening as
 * absent, which is how a malformed readout would otherwise hide.
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
    assert.ok(m[3].trim().length > 0, `${record.id} carries a readout with an empty note`);
    out.push({ record: record.id, attribute: m[1], direction: m[2] });
  }
  return out;
}

const allReadouts = () => records().flatMap((r) => readouts(r));

const band = (amount) => Math.floor(amount / 50000);

// ------------------------------------------------------------ the name screen

const SIGNAL_EVENT_LOGS_PATH = join(
  REPO_ROOT, "datasets", "revenue", "signal-event-logs", "signal-event-logs.jsonl"
);

/**
 * Every CORE-03 person (contacts, plus account/opportunity/lead owners) and
 * every REV-03 subject name, current or prior. This is the full roster no
 * drafted surface may name; B1 sweeps the three REV-02 packets, the index,
 * the REV-05 corpus and the REV-08 brief against it.
 */
function corePeople() {
  const names = new Set();
  for (const c of coreTable("contacts.csv").rows) names.add(`${c.first_name} ${c.last_name}`);
  for (const a of coreTable("accounts.csv").rows) if (a.owner_name) names.add(a.owner_name);
  for (const o of coreTable("opportunities.csv").rows) if (o.owner_name) names.add(o.owner_name);
  for (const l of coreTable("leads.csv").rows) if (l.owner_name) names.add(l.owner_name);
  for (const sub of coreTable("lead_form_submissions.csv").rows) {
    if (sub.first_name && sub.last_name) names.add(`${sub.first_name} ${sub.last_name}`);
  }
  for (const line of readFileSync(SIGNAL_EVENT_LOGS_PATH, "utf8").trim().split("\n")) {
    if (!line) continue;
    const row = JSON.parse(line);
    if (row.subject_name) names.add(row.subject_name);
    if (row.subject_prior_name) names.add(row.subject_prior_name);
  }
  return names;
}

/**
 * The head nouns a job title is built on, derived from the CORE-03 `title`
 * column plus the pinned list below.
 *
 * The heuristic this feeds is deliberately conservative, and it is stated
 * positively rather than negatively so that an unseen role title reads as a
 * role instead of as a false alarm. Every job title carries a head noun
 * ("Managing Editor", "Head of Procurement", "Store Systems Manager"); a
 * person's name carries none. So the screen fires only when a participant entry
 * has the two-capitalized-word shape of a name AND names no role noun at all. A
 * modifier this list has never seen ("Merchandising", "Freight") costs nothing,
 * because the head noun beside it is what the entry is checked on.
 */
function roleNouns() {
  const nouns = new Set();
  const add = (phrase) => {
    for (const w of String(phrase).split(/[^A-Za-z]+/)) if (/^[A-Z]/.test(w)) nouns.add(w);
  };
  for (const c of coreTable("contacts.csv").rows) add(c.title);
  for (const phrase of [
    "Chief Executive Officer President Vice VP Head Director Manager Lead Leader Owner Principal",
    "Counsel Controller Coordinator Specialist Supervisor Administrator Representative Deputy",
    "Analyst Architect Engineer Scientist Technician Developer Designer Producer Editor Writer",
    "Sponsor Champion Buyer Purchaser Merchandiser Marketer Seller Recruiter Trainer Auditor",
    "Treasurer Secretary Accountant Bookkeeper Planner Strategist Consultant Advisor Partner",
    "Reviewer Approver Evaluator Operator Practitioner Clinician Physician Nurse Pharmacist",
    "Assistant Associate Superintendent Chair Chairperson Steward Team Board Committee Group",
    "Function Stakeholder Staff Personnel Practice Office Executive",
  ]) add(phrase);
  return nouns;
}

/** Two capitalized words in a row: the conservative first-name-plus-surname shape. */
const NAME_SHAPE = /\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\b/;

/**
 * Every participant entry of the corpus, as `{id, entry}`. Side markers and
 * account ids in parentheses are dropped first, so `Head of Finance (buyer
 * side)` is screened as the role it names and the marker never stands in for a
 * head noun.
 */
function participantEntries() {
  const out = [];
  for (const record of records()) {
    for (const raw of record.body.split("\n")) {
      const line = raw.trim().replace(/^[-*+]\s*/, "").replace(/\*\*/g, "");
      if (!/^participants\b/i.test(line)) continue;
      const listed = line.slice(line.indexOf(":") + 1).replace(/\([^)]*\)/g, "");
      for (const entry of listed.split(/[,;]| and /)) {
        const trimmed = entry.trim();
        if (trimmed) out.push({ id: record.id, entry: trimmed });
      }
    }
  }
  return out;
}

// ============================================================ REV-02 packets

test("REV-C4: the REV-02 fact index parses with 30 sequential rows carrying the seven keys", () => {
  const index = factIndex();
  assert.ok(Array.isArray(index.facts), "fact-index.json carries no `facts` array");
  assert.equal(index.facts.length, 30, `the index carries ${index.facts.length} facts, expected 30`);
  assert.deepEqual(
    index.facts.map((f) => f.fact_id),
    index.facts.map((_, i) => `F-${pad(i + 1)}`),
    "the index fact_ids are not F-01 upward, zero-padded, in order with no gap"
  );
  for (const row of index.facts) {
    assert.deepEqual(
      Object.keys(row).sort(), [...INDEX_ROW_KEYS].sort(),
      `${row.fact_id} does not carry exactly the seven row keys ${INDEX_ROW_KEYS.join(", ")}`
    );
    assert.ok(
      index.categories.includes(row.category),
      `${row.fact_id} carries category "${row.category}", which is not in the index's own enum`
    );
  }

  assert.ok(Array.isArray(index.packets) && index.packets.length === 3, "the index does not describe three packets");
  const assigned = index.packets.flatMap((p) => p.fact_ids);
  assert.deepEqual(
    [...assigned].sort(), index.facts.map((f) => f.fact_id).sort(),
    "the packets' fact_ids are not a partition of the index's rows"
  );
});

test("REV-C4-T1: every index row is sourced and dated, with exactly one stale fact and a boundary fact", () => {
  const rows = factIndex().facts;
  const unsourced = rows.filter((r) => !r.collection_date || !r.source);
  assert.deepEqual(
    unsourced.map((r) => r.fact_id), [],
    "these index rows are missing a collection_date or a source, and the corpus carries no unsourced fact"
  );
  for (const row of rows) {
    assert.match(row.collection_date, /^\d{4}-\d{2}-\d{2}$/, `${row.fact_id}'s collection_date is not an ISO date`);
    assert.ok(
      row.collection_date <= ANCHOR_DATE,
      `${row.fact_id} was collected ${row.collection_date}, after the anchor date ${ANCHOR_DATE}`
    );
  }

  const stale = rows.filter((r) => r.collection_date < FRESHNESS_WINDOW_START);
  assert.equal(
    stale.length, 1,
    `${stale.length} index rows are stale (collection_date < ${FRESHNESS_WINDOW_START}), expected exactly 1`
    + ` (${stale.map((r) => `${r.fact_id} ${r.collection_date}`).join(", ")})`
  );

  const boundary = rows.filter((r) => r.collection_date === FRESHNESS_WINDOW_START);
  assert.ok(
    boundary.length >= 1,
    `no index row carries the boundary collection_date ${FRESHNESS_WINDOW_START};`
    + " the strict-inequality convention then has nothing to demonstrate"
  );

  // SF2: the stale row is not just counted, it is actually labelled stale in
  // the packet the index assigns it to, with its own collection_date sitting
  // in the passage that cites it.
  const index = factIndex();
  const [staleRow] = stale;
  const stalePacket = index.packets.find((p) => p.fact_ids.includes(staleRow.fact_id));
  assert.ok(stalePacket, `no packet's fact_ids carry the stale fact ${staleRow.fact_id}`);
  const staleText = packetText(stalePacket.file);
  const citeMarker = `[${staleRow.fact_id}]`;
  const citations = [...staleText.matchAll(new RegExp(escapeRegExp(citeMarker), "g"))];
  assert.ok(citations.length > 0, `${stalePacket.file} never cites ${citeMarker}`);
  const passages = citations.map((m) =>
    staleText.slice(Math.max(0, m.index - 300), m.index + citeMarker.length + 300));
  assert.ok(
    passages.some((p) => /stale/i.test(p)),
    `${stalePacket.file} carries the stale fact ${staleRow.fact_id} but never says "stale" near its citation`
  );
  assert.ok(
    passages.some((p) => p.includes(staleRow.collection_date)),
    `${stalePacket.file} does not state the stale fact's collection_date ${staleRow.collection_date}`
    + ` near any of its ${citeMarker} citations`
  );
  assert.ok(
    passages.some((p) => /stale/i.test(p) && p.includes(staleRow.collection_date)),
    `${stalePacket.file} never states "stale" together with the collection_date ${staleRow.collection_date}`
    + ` in the same passage citing ${citeMarker}`
  );

  // SF3: the stale fact never sits in the battlecard.
  const battlecardPacket = index.packets.find((p) => p.file.startsWith("battlecard-"));
  assert.ok(battlecardPacket, "the index describes no battlecard packet");
  assert.notEqual(
    stalePacket.file, battlecardPacket.file,
    `the stale fact ${staleRow.fact_id} sits in the battlecard packet ${battlecardPacket.file},`
    + " not a researched-target packet"
  );

  // SF4: every packet's own governing prose pins the freshness rule verbatim.
  // R4: and the rule itself must actually state the convention, so blanking it
  // cannot make the verbatim check vacuously true.
  for (const piece of ["2026-03-16", "2025-12-16", "90 days", "strictly"]) {
    assert.ok(
      index.freshness_rule.includes(piece),
      `the index freshness_rule does not state "${piece}"`
    );
  }
  for (const packet of index.packets) {
    assert.ok(
      packetText(packet.file).includes(index.freshness_rule),
      `${packet.file} does not state the index's freshness_rule verbatim`
    );
  }
});

test("REV-C4-T2: exactly one pricing_page_snapshot row, on the competitor, captured inside the window", () => {
  const index = factIndex();
  const battlecard = index.packets.find((p) => p.file.startsWith("battlecard-"));
  assert.ok(battlecard, "the index describes no battlecard packet, so the competitor cannot be derived");

  const snapshots = index.facts.filter((r) => r.category === "pricing_page_snapshot");
  assert.equal(
    snapshots.length, 1,
    `${snapshots.length} index rows carry category pricing_page_snapshot, expected exactly 1`
  );
  const [snapshot] = snapshots;
  assert.equal(
    snapshot.subject, battlecard.subject,
    `the pricing snapshot's subject is ${snapshot.subject}, not the battlecard's subject ${battlecard.subject}`
  );
  assert.ok(
    snapshot.collection_date >= FRESHNESS_WINDOW_START && snapshot.collection_date <= ANCHOR_DATE,
    `the pricing snapshot was captured ${snapshot.collection_date}, outside`
    + ` [${FRESHNESS_WINDOW_START}, ${ANCHOR_DATE}]`
  );
  assert.ok(
    battlecard.fact_ids.includes(snapshot.fact_id),
    `the pricing snapshot ${snapshot.fact_id} is not assigned to the battlecard packet`
  );
});

test("REV-C4-T8: exactly one attribute slug carries a disagreeing pair, and it is not the pricing attribute", () => {
  const index = factIndex();
  const bySlug = new Map();
  for (const row of index.facts) {
    if (!bySlug.has(row.attribute)) bySlug.set(row.attribute, []);
    bySlug.get(row.attribute).push(row);
  }

  const disagreeing = [...bySlug.entries()].filter(([, rows]) => {
    if (rows.length !== 2) return false;
    const [a, b] = rows;
    return a.subject === b.subject
      && a.source !== b.source
      && a.collection_date !== b.collection_date
      && String(a.value) !== String(b.value);
  });
  assert.equal(
    disagreeing.length, 1,
    `${disagreeing.length} attribute slugs occur on exactly two same-subject rows with differing sources,`
    + ` differing dates and non-equal values, expected exactly 1`
    + ` (${disagreeing.map(([slug]) => slug).join(", ")})`
  );

  const [slug, pair] = disagreeing[0];

  const snapshot = index.facts.find((r) => r.category === "pricing_page_snapshot");
  assert.notEqual(slug, snapshot.attribute, `the disagreeing pair sits on the pricing attribute ${slug}`);
  assert.ok(!/pric/i.test(slug), `the disagreeing slug ${slug} is a pricing attribute; the snapshot stays the unique pricing witness`);
  assert.notEqual(pair[0].category, "pricing_page_snapshot", "the disagreeing pair carries the snapshot category");
});

test("REV-C4-T1: every packet citation resolves to a row of that packet's subject, and every owned fact is cited", () => {
  const index = factIndex();
  const byId = new Map(index.facts.map((f) => [f.fact_id, f]));
  for (const packet of index.packets) {
    const text = packetText(packet.file);
    const cited = [...new Set([...text.matchAll(/\[(F-\d{2})\]/g)].map((m) => m[1]))];
    assert.ok(cited.length > 0, `${packet.file} cites no [F-NN] at all, so it states no traceable fact`);
    for (const id of cited) {
      const row = byId.get(id);
      assert.ok(row, `${packet.file} cites [${id}], which is not a row of the index`);
      assert.equal(
        row.subject, packet.subject,
        `${packet.file} cites [${id}], whose subject is ${row.subject} and not this file's subject ${packet.subject}`
      );
    }
    for (const id of packet.fact_ids) {
      assert.ok(
        cited.includes(id),
        `the index assigns ${id} to ${packet.file}, but that file never cites [${id}]`
      );
    }
  }
});

test("REV-C4-T1: every numeric token in the three packets resolves to an indexed value", () => {
  const index = factIndex();
  const resolves = resolverFrom(index);
  for (const packet of index.packets) {
    const tokens = numericTokens(packetText(packet.file));
    assert.ok(tokens.length > 0, `${packet.file} states no figure at all; the extraction rule has broken`);
    const unresolved = [...new Set(tokens.filter((t) => !resolves(t)))];
    assert.deepEqual(
      unresolved, [],
      `${packet.file} states figures that resolve to no indexed value: ${unresolved.join(", ")}`
    );
  }
});

test("REV-C4: no packet carries the struck AI SDR statistic", () => {
  for (const packet of factIndex().packets) {
    assert.ok(
      !STRUCK_STATISTIC.test(packetText(packet.file)),
      `${packet.file} carries the struck "11x" statistic`
    );
  }
});

// ============================================================= REV-05 corpus

test("REV-C4: the corpus parses into governing prose, one deal registry and eleven WL records", () => {
  assert.ok(governingProse().length > 0, "the corpus carries no governing prose");

  const rows = registry().rows;
  assert.equal(rows.length, 8, `the deal registry carries ${rows.length} deals, expected 8`);
  assert.deepEqual(
    rows.map((r) => r.deal_id),
    rows.map((_, i) => `deal-${pad(i + 1)}`),
    "the registry deal_ids are not deal-01 upward, zero-padded, in order with no gap"
  );

  const found = records();
  assert.equal(found.length, 11, `the corpus carries ${found.length} WL records, expected 11`);
  assert.deepEqual(
    found.map((r) => r.id),
    found.map((_, i) => `WL-${pad(i + 1)}`),
    "the record ids are not WL-01 upward, zero-padded, in order with no gap"
  );
});

test("REV-C4-T9: every registry deal resolves in accounts.csv with a byte-equal segment and a coherent outcome", () => {
  const accounts = new Map(coreTable("accounts.csv").rows.map((a) => [a.account_id, a]));
  for (const row of registry().rows) {
    const account = accounts.get(row.account_id);
    assert.ok(account, `${row.deal_id} names account ${row.account_id}, which resolves in no accounts.csv row`);
    assert.equal(
      row.segment, account.segment,
      `${row.deal_id} records segment "${row.segment}" against ${row.account_id}'s accounts.csv segment "${account.segment}"`
    );
    assert.ok(["won", "lost"].includes(row.outcome), `${row.deal_id} carries outcome "${row.outcome}"`);
    assert.match(row.close_date, /^\d{4}-\d{2}-\d{2}$/, `${row.deal_id}'s close_date is not an ISO date`);
    assert.match(amountDigits(row.amount), /^\d+$/, `${row.deal_id}'s amount is not integer dollars: ${row.amount}`);

    if (row.outcome === "won") {
      assert.equal(
        account.status, "customer",
        `${row.deal_id} is won at ${row.account_id}, whose accounts.csv status is "${account.status}" and not customer;`
        + " a won deal's outcome witness is the current customer relationship"
      );
    } else {
      assert.ok(
        ["closed_lost", "target"].includes(account.status),
        `${row.deal_id} is lost at ${row.account_id}, whose accounts.csv status is "${account.status}";`
        + " a lost deal never sits at a customer-status account"
      );
    }
  }
});

test("REV-C4-T4-prime: exactly one registry deal joins the export window, and zero Closed Won rows exist", () => {
  const rows = registry().rows;
  const opportunities = new Map(coreTable("opportunities.csv").rows.map((o) => [o.opportunity_id, o]));

  assert.equal(
    coreTable("opportunities.csv").rows.filter((o) => o.stage === "Closed Won").length, 0,
    "opportunities.csv carries a Closed Won row; zero exist at this baseline and the shipped module 29 guard says so"
  );

  const joined = rows.filter((r) => opportunityIdIn(r.opportunity_id));
  assert.equal(
    joined.length, 1,
    `${joined.length} registry deals carry an opportunity_id, expected exactly 1`
    + ` (${joined.map((r) => `${r.deal_id} ${r.opportunity_id}`).join(", ")})`
  );

  const [inWindow] = joined;
  const id = opportunityIdIn(inWindow.opportunity_id);
  const opp = opportunities.get(id);
  assert.ok(opp, `${inWindow.deal_id} names ${id}, which resolves in no opportunities.csv row`);
  assert.equal(opp.stage, "Closed Lost", `${id} is at stage "${opp.stage}" in the export, not Closed Lost`);
  assert.equal(
    amountDigits(inWindow.amount), opp.amount,
    `${inWindow.deal_id} records amount ${inWindow.amount} against ${id}'s exported amount ${opp.amount}`
  );
  assert.equal(
    inWindow.close_date, opp.close_date,
    `${inWindow.deal_id} records close_date ${inWindow.close_date} against ${id}'s exported close_date ${opp.close_date}`
  );
  assert.equal(inWindow.outcome, "lost", `${inWindow.deal_id} joins the single Closed Lost opportunity but is not lost`);

  for (const row of rows) {
    if (row.deal_id === inWindow.deal_id) continue;
    assert.ok(
      row.close_date < EXPORT_WINDOW_OPEN,
      `${row.deal_id} closed ${row.close_date}, inside the CORE-03 export window that opens ${EXPORT_WINDOW_OPEN};`
      + " only the single in-window closure may sit there, which is why the export holds no Closed Won row"
    );
  }
});

test("REV-C4-T4-prime: exactly one cross-outcome pair matches on segment and amount band, and both carry a record", () => {
  const rows = registry().rows.map((r) => ({ ...r, value: Number(amountDigits(r.amount)) }));
  const won = rows.filter((r) => r.outcome === "won");
  const lost = rows.filter((r) => r.outcome === "lost");

  const pairs = [];
  for (const w of won) {
    for (const l of lost) {
      if (w.segment === l.segment && band(w.value) === band(l.value)) pairs.push([w, l]);
    }
  }
  assert.equal(
    pairs.length, 1,
    `${pairs.length} cross-outcome registry pairs match on segment and floor(amount/50000), expected exactly 1`
    + ` (${pairs.map(([w, l]) => `${w.deal_id}/${l.deal_id}`).join(", ")})`
  );

  const [wonMember, lostMember] = pairs[0];
  assert.ok(
    opportunityIdIn(lostMember.opportunity_id),
    `the pair's lost member ${lostMember.deal_id} carries no opportunity_id, so the pair does not join CORE-03`
  );
  assert.ok(
    wonMember.close_date < EXPORT_WINDOW_OPEN,
    `the pair's won member ${wonMember.deal_id} closed ${wonMember.close_date}, not before ${EXPORT_WINDOW_OPEN}`
  );

  const covered = new Set(records().map((r) => recordDeal(r)));
  for (const member of pairs[0]) {
    assert.ok(
      covered.has(member.deal_id),
      `the outcome pair's member ${member.deal_id} carries no call-note record, so module 26 cannot cite it`
    );
  }
});

test("REV-C4-T9: every record resolves to a registry deal and every call date obeys the three date rules", () => {
  const byDeal = new Map(registry().rows.map((r) => [r.deal_id, r]));

  // The Closed Lost transition date, per account, read from the stage history
  // rather than from the registry that is under test.
  const opportunities = new Map(coreTable("opportunities.csv").rows.map((o) => [o.opportunity_id, o]));
  const lostAt = new Map();
  for (const h of coreTable("stage_history.csv").rows) {
    if (h.to_stage !== "Closed Lost") continue;
    const opp = opportunities.get(h.opportunity_id);
    if (!opp) continue;
    const seen = lostAt.get(opp.account_id);
    if (!seen || h.changed_date < seen) lostAt.set(opp.account_id, h.changed_date);
  }
  assert.ok(lostAt.size > 0, "stage_history.csv carries no Closed Lost transition; the history read has broken");

  for (const record of records()) {
    const dealId = recordDeal(record);
    const deal = byDeal.get(dealId);
    assert.ok(deal, `${record.id} names ${dealId}, which resolves in no registry row`);

    const callDate = fieldDate(record.body, "call_date", record.id);
    assert.ok(
      callDate <= ANCHOR_DATE,
      `${record.id} is dated ${callDate}, after the anchor date ${ANCHOR_DATE}`
    );
    assert.ok(
      callDate <= deal.close_date,
      `${record.id} is dated ${callDate}, after ${dealId}'s close_date ${deal.close_date}; a call sits inside its deal's life`
    );

    const lostOn = lostAt.get(deal.account_id);
    if (lostOn) {
      assert.ok(
        callDate < lostOn,
        `${record.id} is dated ${callDate} at ${deal.account_id}, not strictly before that account's`
        + ` Closed Lost transition ${lostOn}; the loss analysis reads existing notes and never re-contacts the account`
      );
    }
  }
});

test("REV-C4-T3: every readout parses into the pinned vocabulary and the pinned direction enum", () => {
  const prose = governingProse();
  for (const slug of ATTRIBUTE_SLUGS) {
    assert.ok(
      prose.includes(slug),
      `the governing prose does not state the pinned attribute slug ${slug}; the vocabulary must be readable in the corpus`
    );
  }
  for (const direction of DIRECTIONS) {
    assert.ok(prose.includes(direction), `the governing prose does not state the direction value ${direction}`);
  }

  for (const record of records()) {
    const found = readouts(record);
    assert.ok(found.length > 0, `${record.id} carries no attribute readout, so nothing downstream can cite it`);
    for (const r of found) {
      assert.ok(
        ATTRIBUTE_SLUGS.includes(r.attribute),
        `${r.record} reads out "${r.attribute}", which is not in the pinned seven-slug vocabulary`
      );
      assert.ok(
        DIRECTIONS.includes(r.direction),
        `${r.record} reads out direction "${r.direction}", which is not positive or negative`
      );
    }
  }
});

test("REV-C4-T3: exactly one slug carries both directions, on exactly two records at two deals outside the pair", () => {
  const found = allReadouts();
  const bySlug = new Map();
  for (const r of found) {
    if (!bySlug.has(r.attribute)) bySlug.set(r.attribute, []);
    bySlug.get(r.attribute).push(r);
  }

  const contradictory = [...bySlug.entries()].filter(([, rows]) => new Set(rows.map((r) => r.direction)).size === 2);
  assert.equal(
    contradictory.length, 1,
    `${contradictory.length} attribute slugs carry both directions corpus-wide, expected exactly 1`
    + ` (${contradictory.map(([slug]) => slug).join(", ")})`
  );

  const [slug, rows] = contradictory[0];
  assert.equal(
    rows.length, 2,
    `the contradictory slug ${slug} appears on ${rows.length} readouts, expected exactly 2 with no third record`
  );

  const byDeal = new Map(registry().rows.map((r) => [r.deal_id, r]));
  const recordsById = new Map(records().map((r) => [r.id, r]));
  const deals = rows.map((r) => recordDeal(recordsById.get(r.record)));
  assert.equal(new Set(deals).size, 2, `the contradictory pair sits on one deal (${deals.join(", ")}), expected two`);

  // Eval isolation: the framing pair and the outcome pair never share a deal.
  const numbered = registry().rows.map((r) => ({ ...r, value: Number(amountDigits(r.amount)) }));
  const pairDeals = new Set();
  for (const w of numbered.filter((r) => r.outcome === "won")) {
    for (const l of numbered.filter((r) => r.outcome === "lost")) {
      if (w.segment === l.segment && band(w.value) === band(l.value)) {
        pairDeals.add(w.deal_id);
        pairDeals.add(l.deal_id);
      }
    }
  }
  for (const dealId of deals) {
    assert.ok(
      !pairDeals.has(dealId),
      `the contradictory framing pair sits on ${dealId}, which is also an outcome-pair member;`
      + " module 21's edge and module 26's edge must not share a deal"
    );
    assert.ok(byDeal.has(dealId), `the contradictory pair names ${dealId}, which resolves in no registry row`);
  }
});


test("REV-C4: the corpus names call participants by role only", () => {
  const entries = participantEntries();
  assert.ok(entries.length > 0, "no record carries a participants line");
  assert.ok(
    entries.length >= records().length,
    `only ${entries.length} participant entries across ${records().length} records; the participants parse has broken`
  );

  const people = corePeople();
  const nouns = roleNouns();
  assert.ok(nouns.size >= 40, `only ${nouns.size} role nouns were derived; the role-noun build has broken`);

  for (const { id, entry } of entries) {
    for (const person of people) {
      assert.ok(!entry.includes(person), `${id} lists the CORE-03 contact ${person} as a call participant`);
    }
    if (!NAME_SHAPE.test(entry)) continue;
    const named = entry.split(/[^A-Za-z]+/).some((w) => nouns.has(w));
    assert.ok(
      named,
      `${id} lists the participant "${entry}", which has the shape of a person's name and carries no role noun;`
      + " participants are recorded by role only on both sides of every call"
    );
  }
});

test("REV-C4: the corpus is compiled as of a March 2026 date and pins the amount-band function", () => {
  const prose = governingProse();
  const line = prose.split("\n").find((l) => /compiled as of/i.test(l));
  assert.ok(line, "the corpus carries no compiled-as-of line in its governing prose");
  const date = line.match(/\d{4}-\d{2}-\d{2}/);
  assert.ok(date, `the compiled-as-of line carries no ISO date: ${JSON.stringify(line)}`);
  assert.ok(
    date[0].startsWith("2026-03-") && date[0] <= ANCHOR_DATE,
    `the corpus is compiled as of ${date[0]}, outside March 2026 at or before the anchor ${ANCHOR_DATE}`
  );

  assert.ok(
    /50,?000/.test(prose),
    "the governing prose does not pin the amount-band width, so band(amount) = floor(amount / 50000) is unstated"
  );
});

test("REV-C4: the corpus carries no send verb, no automation token and no em dash", () => {
  const text = corpus();
  assert.deepEqual(
    denyHits(text), [],
    "the corpus carries a send verb or automation token; it records calls that happened and drives nothing"
  );
  assert.ok(!text.includes("—"), "the corpus carries an em dash (U+2014)");
  assert.ok(!text.includes("–"), "the corpus carries an en dash (U+2013)");
});

// ============================================================== REV-08 brief

test("REV-C4-T5: the brief names SEG-02 and states its audience count once, byte-equal to the counts file", () => {
  const text = brief();
  assert.ok(text.includes(CAMPAIGN_VARIANT), `the brief never names its variant ${CAMPAIGN_VARIANT}`);

  const row = countsTable().rows.find((r) => r.segment_id === CAMPAIGN_VARIANT);
  assert.ok(row, `audience-counts.csv carries no ${CAMPAIGN_VARIANT} row`);
  const count = row.account_count;
  assert.match(count, /^\d+$/, `${CAMPAIGN_VARIANT}'s account_count is not an integer: ${count}`);

  const stated = numericTokens(text).filter((t) => t === count);
  assert.equal(
    stated.length, 1,
    `the brief states the audience count ${count} ${stated.length} times, expected exactly once`
  );

  const line = text.split("\n").find((l) => /audience count/i.test(l) && numericTokens(l).includes(count));
  assert.ok(
    line,
    `the brief states ${count} but no line carries it as the audience count, so the figure is not labelled`
  );
});

test("REV-C4-SF7: the brief's targeted variant selects at least five accounts and reaches a wholly suppressed one", () => {
  const variantId = briefVariantId(brief());
  const definitions = segmentDefinitions();
  const variant = definitions.variants.find((v) => v.segment_id === variantId);
  assert.ok(
    variant,
    `the brief targets ${variantId}, which is not a variant of the committed segment-definitions.json`
  );

  const matched = screenMatchedAccountIds(variant);
  assert.ok(
    matched.size >= 5,
    `${variantId} selects ${matched.size} accounts under the screen's own filter, expected at least 5`
  );

  const suppressed = whollySuppressedAccountIds();
  const overlap = [...matched].filter((id) => suppressed.has(id));
  assert.ok(
    overlap.length > 0,
    `${variantId}'s matched set (${[...matched].sort().join(", ")}) does not intersect the wholly suppressed`
    + " account set derived from consent-suppression-master.csv; a redesign that keeps the count the same"
    + " while dropping the suppressed member must fail here"
  );
});

test("REV-C4-T7: every numeric token in the brief resolves, and exactly two figures are cited from the index", () => {
  const index = factIndex();
  const text = brief();
  const count = countsTable().rows.find((r) => r.segment_id === CAMPAIGN_VARIANT).account_count;
  const resolves = resolverFrom(index, [count]);

  const tokens = numericTokens(text);
  const unresolved = [...new Set(tokens.filter((t) => !resolves(t)))];
  assert.deepEqual(
    unresolved, [],
    `the brief states figures that resolve to neither the counts file nor a REV-02 indexed value: ${unresolved.join(", ")}`
  );
  assert.equal(
    tokens.length, 3,
    `the brief states ${tokens.length} figures (${tokens.join(", ")}), expected exactly 3:`
    + " the audience count and two REV-02-derived figures"
  );

  const byId = new Map(index.facts.map((f) => [f.fact_id, f]));
  const cited = [...new Set([...text.matchAll(/\[(F-\d{2})\]/g)].map((m) => m[1]))];
  assert.equal(cited.length, 2, `the brief cites ${cited.length} index rows (${cited.join(", ")}), expected exactly 2`);

  // The deliberately unresolved disagreeing pair, derived rather than typed:
  // citing either member's value would silently settle C4-P8.
  const bySlug = new Map();
  for (const row of index.facts) {
    if (!bySlug.has(row.attribute)) bySlug.set(row.attribute, []);
    bySlug.get(row.attribute).push(row);
  }
  const disagreeing = [...bySlug.entries()].find(([, rows]) =>
    rows.length === 2
    && rows[0].subject === rows[1].subject
    && rows[0].source !== rows[1].source
    && rows[0].collection_date !== rows[1].collection_date
    && String(rows[0].value) !== String(rows[1].value));
  assert.ok(disagreeing, "no disagreeing pair was derived from the index; the C4-P8 read has broken");

  for (const id of cited) {
    const row = byId.get(id);
    assert.ok(row, `the brief cites [${id}], which is not a row of the index`);
    assert.notEqual(
      row.attribute, disagreeing[0],
      `the brief cites [${id}], a row of the disagreeing ${disagreeing[0]} pair;`
      + " quoting either value silently resolves the disagreement module 24's edge eval depends on"
    );
    assert.ok(
      numericTokens(text).some((t) => String(row.value).includes(t) || String(row.value) === t),
      `the brief cites [${id}] but states no figure that byte-matches its indexed value`
    );
  }
});

test("REV-C4: the brief carries the mandatory pre-suppression screen line", () => {
  const text = brief();
  assert.ok(
    text.includes("pre-suppression firmographic count"),
    "the brief does not state that the audience count is a pre-suppression firmographic count"
  );
  assert.ok(
    /consent and suppression screen/i.test(text),
    "the brief does not name the consent and suppression screen the outreach list passes before any contact"
  );
  assert.ok(
    /wholly suppressed/i.test(text),
    "the brief does not say that a wholly suppressed account may sit inside the audience by design"
  );
});

test("REV-C4: the brief carries no send verb, automation token, discount percentage or em dash", () => {
  const text = brief();
  assert.deepEqual(
    denyHits(text), [],
    "the brief carries a send verb or automation token; the brief proposes and a human system runs the campaign"
  );
  const percent = text.match(/\d+\s?%/);
  assert.equal(percent, null, `the brief states a percentage (${percent?.[0]}); the discount drill lives in REV-11`);
  assert.ok(!text.includes("—"), "the brief carries an em dash (U+2014)");
  assert.ok(!text.includes("–"), "the brief carries an en dash (U+2013)");
});

test("REV-C4: the brief is compiled as of a March 2026 date at or before the anchor", () => {
  const line = brief().split("\n").find((l) => /compiled as of/i.test(l));
  assert.ok(line, "the brief carries no compiled-as-of line");
  const date = line.match(/\d{4}-\d{2}-\d{2}/);
  assert.ok(date, `the brief's compiled-as-of line carries no ISO date: ${JSON.stringify(line)}`);
  assert.ok(
    date[0].startsWith("2026-03-") && date[0] <= ANCHOR_DATE,
    `the brief is compiled as of ${date[0]}, outside March 2026 at or before the anchor ${ANCHOR_DATE}`
  );
});

// ============================================================= house screens

test("REV-C4: no CORE-03 or REV-03 person name appears anywhere on the three drafted surfaces", () => {
  const index = factIndex();
  const documents = [
    ...index.packets.map((p) => ({ label: `REV-02/${p.file}`, text: packetText(p.file) })),
    { label: "REV-02/fact-index.json", text: factIndexText() },
    { label: "REV-05/win-loss-call-note-corpus.md", text: corpus() },
    { label: "REV-08/campaign-offer-brief.md", text: brief() },
  ];
  const people = corePeople();
  assert.ok(people.size >= 130, `only ${people.size} people were derived; the CORE-03/REV-03 name build has broken`);
  for (const { label, text } of documents) {
    for (const person of people) {
      assert.ok(!text.includes(person), `${label} names the CORE-03 or REV-03 person ${person}`);
    }
  }
});

test("REV-C4: the REV-02 packets, the fact index and the REV-08 brief carry no em dash", () => {
  const files = [...factIndex().packets.map((p) => packetText(p.file)), factIndexText(), brief()];
  const names = [...factIndex().packets.map((p) => p.file), "fact-index.json", "campaign-offer-brief.md"];
  files.forEach((text, i) => {
    assert.ok(!text.includes("—"), `${names[i]} carries an em dash (U+2014)`);
    assert.ok(!text.includes("–"), `${names[i]} carries an en dash (U+2013)`);
  });
});

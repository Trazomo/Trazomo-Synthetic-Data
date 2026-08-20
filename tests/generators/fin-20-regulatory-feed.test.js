// FIN-20 regulatory-updates-feed: fourteen external updates plus the register of
// the company's own controlled documents.
//
// Every assertion is structural. The three plants are recomputed from the feed's
// own fields joined to FIN-22, FIN-05 and the CORE-05 document-control blocks,
// and are asserted by cardinality rather than by identity, so a reroll that
// makes a second update materially relevant fails here rather than shipping an
// exercise with two answers.
//
// policy-index.csv is re-derived from the shipped markdown by this file's own
// parser and compared to the emitted bytes. That is the whole point of deriving
// the index: a CORE-05 amendment the index silently ignores fails the suite.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { readFileSync, readdirSync } from "node:fs";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { buildChartOfAccounts } from "../../datagen/src/generators/fin-22-chart-of-accounts.js";
import { buildTrialBalance } from "../../datagen/src/generators/fin-05-gl-trial-balance.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const CORE_05_DIR = join(REPO_ROOT, "artifacts", "CORE-05");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
const spec = specs.byId.get("FIN-20");

const files = generateArtifact(spec, canon);
const feedFile = files.find((f) => f.path === "regulatory-updates-feed.jsonl");
const indexFile = files.find((f) => f.path === "policy-index.csv");
assert.ok(feedFile && indexFile, `expected both output files (got: ${files.map((f) => f.path).join(", ")})`);

const records = feedFile.content.trim().split("\n").map((line, i) => {
  try { return JSON.parse(line); } catch (err) { throw new Error(`line ${i + 1} is not JSON: ${err.message}`); }
});

// The profile of co-002 the module triages against: a private software company
// on a subscription revenue model (canon/companies.md). Public knowledge, not an
// answer key, so the test may name it.
const CO_002 = { entity_type: "private", industry: "software", revenue_model: "subscription" };

const chart = new Map(buildChartOfAccounts().map((a) => [a.account_code, a]));
const balances = new Map(buildTrialBalance().rows.map((r) => [r.account_code, r.ending_balance]));

function splitCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i += 1; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { cells.push(cur); cur = ""; }
    else cur += ch;
  }
  cells.push(cur);
  return cells;
}

/** Split a comma list without cutting inside a parenthesised group. */
function splitTopLevel(text) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const ch of text) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function feature(startsWith) {
  const found = spec.planted_features.find((f) => f.startsWith(startsWith));
  assert.ok(found, `FIN-20 spec no longer documents "${startsWith}"`);
  return found;
}

/** The record key list and the nested scope keys, parsed out of the spec. */
function documentedRecordKeys() {
  const text = feature("documented record key list");
  const listed = text.slice(text.indexOf("): ") + 3);
  const parts = splitTopLevel(listed.slice(0, listed.indexOf(". 14 records")));
  const keys = [];
  let scopeKeys = null;
  for (const part of parts) {
    const nested = /^(\w+)\s*\((.+)\)$/.exec(part);
    if (nested) { keys.push(nested[1]); scopeKeys = nested[2].split(",").map((k) => k.trim()); }
    else keys.push(part);
  }
  assert.ok(scopeKeys, "the spec no longer documents the scope sub-keys");
  return { keys, scopeKeys };
}

function documentedIndexColumns() {
  const text = feature("policy-index.csv is derived");
  const match = /with the columns ([^.]+)\./.exec(text);
  assert.ok(match, "the spec no longer documents the policy-index columns");
  return match[1].split(",").map((c) => c.trim());
}

// --------------------------------------------------- the test's own CORE-05 parser

function parseDocumentControl(sourcePath) {
  const raw = readFileSync(join(CORE_05_DIR, sourcePath), "utf8");
  const lines = raw.split("\n");
  const heading = lines.find((l) => l.startsWith("# "));
  assert.ok(heading, `${sourcePath} has no title heading`);
  const start = lines.findIndex((l) => l.trim() === "## Document Control");
  assert.ok(start >= 0, `${sourcePath} has no document control block`);
  const fields = new Map();
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("## ")) break;
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length !== 2) continue;
    fields.set(cells[0], cells[1]);
  }
  return { title: heading.slice(2).trim(), fields };
}

function ownerTitleOf(owner) {
  const vacant = owner.indexOf("(vacant)");
  if (vacant >= 0) return owner.slice(0, vacant).trim();
  const comma = owner.indexOf(",");
  assert.ok(comma > 0, `Owner "${owner}" carries no comma and is not marked vacant`);
  return owner.slice(comma + 1).trim();
}

function expectedIndexRows() {
  const sources = readdirSync(CORE_05_DIR).filter((f) => f.endsWith(".md")).sort();
  return sources
    .map((source) => {
      const { title, fields } = parseDocumentControl(source);
      return {
        document_id: fields.get("Document ID"),
        title,
        version: fields.get("Version"),
        status: fields.get("Status"),
        owner_title: ownerTitleOf(fields.get("Owner")),
        effective_date: fields.get("Effective Date"),
        last_reviewed: fields.get("Last Reviewed"),
        next_review_due: fields.get("Next Review Due"),
        supersedes: fields.get("Supersedes"),
        superseded_by: fields.get("Superseded By"),
        source_file: `artifacts/CORE-05/${source}`,
        _owner: fields.get("Owner"),
      };
    })
    .sort((a, b) => a.document_id.localeCompare(b.document_id));
}

const indexTable = (() => {
  const [header, ...lines] = indexFile.content.trim().split("\n");
  const cols = splitCsvLine(header);
  return { cols, rows: lines.map((l) => Object.fromEntries(cols.map((c, i) => [c, splitCsvLine(l)[i]]))) };
})();

// ------------------------------------------------------------------- the feed

test("FIN-20: two files, and every record carries the spec's key list in the spec's order", () => {
  assert.equal(files.length, 2);
  const { keys, scopeKeys } = documentedRecordKeys();
  for (const record of records) {
    assert.deepEqual(Object.keys(record), keys);
    assert.deepEqual(Object.keys(record.scope), scopeKeys);
  }
});

test("FIN-20: the feed's size and its two date windows are the ones the spec states", () => {
  const text = feature("documented record key list");
  const counted = /(\d+) records published (\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})/.exec(text);
  const effective = /effective (\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})/.exec(text);
  assert.ok(counted && effective, "the spec no longer states the count or the windows");
  assert.equal(records.length, Number(counted[1]));

  const published = records.map((r) => r.published_date).sort();
  assert.equal(published[0], counted[2], "the first publication date is not the window's start");
  assert.equal(published.at(-1), counted[3], "the last publication date is not the window's end");
  assert.equal(published[0], spec.period.start);
  assert.equal(published.at(-1), spec.period.end);

  const effectiveDates = records.map((r) => r.effective_date).sort();
  assert.equal(effectiveDates[0], effective[1]);
  assert.equal(effectiveDates.at(-1), effective[2]);
  for (const record of records) {
    assert.ok(record.effective_date > record.published_date, `${record.update_id} takes effect before it is published`);
  }
});

test("FIN-20: ids run in publication order, and the vocabularies are closed", () => {
  const ISSUERS = new Set(["accounting standards board", "national tax authority", "securities regulator", "state revenue department"]);
  const ISSUER_TYPES = new Set(["standard_setter", "tax_authority", "regulator"]);
  let previous = null;
  for (const record of records) {
    assert.match(record.update_id, /^RU-2026-0\d{3}$/);
    assert.ok(ISSUERS.has(record.issuer), `"${record.issuer}" is not a generic issuer label`);
    assert.ok(ISSUER_TYPES.has(record.issuer_type));
    assert.ok(["final", "proposed"].includes(record.status));
    assert.equal(
      record.comment_deadline !== "",
      record.status === "proposed",
      `${record.update_id}: a comment deadline belongs to a proposal and nothing else`
    );
    if (record.comment_deadline !== "") {
      assert.ok(record.comment_deadline > record.published_date && record.comment_deadline < record.effective_date);
    }
    // The reference is derived from the issuer and the month it was published,
    // so it cannot point somewhere the record does not.
    assert.ok(record.source_reference.endsWith(record.published_date.slice(0, 7)),
      `${record.update_id}: source_reference does not carry its own publication month`);
    if (previous) {
      assert.ok(record.update_id > previous.update_id && record.published_date >= previous.published_date,
        "ids do not run in publication order");
    }
    previous = record;
    for (const [key, value] of Object.entries(record.scope)) {
      assert.ok(Array.isArray(value) && value.length >= 1, `${record.update_id}: scope.${key} is empty`);
      for (const token of value) assert.match(token, /^[a-z][a-z_]*[a-z]$/);
    }
    for (const code of record.affected_accounts) assert.match(code, /^\d{4}$/);
  }
  assert.equal(new Set(records.map((r) => r.update_id)).size, records.length);
});

test("FIN-20: no real organization is named, there are no URLs, and CORE-05's own citations all appear", () => {
  const DENYLIST = ["FASB", "IASB", "IFRS Foundation", "SEC", "IRS", "HMRC", "PCAOB", "AICPA", "EFRAG", "GASB"];
  const text = feedFile.content + indexFile.content;
  for (const name of DENYLIST) {
    assert.ok(!new RegExp(`\\b${name}\\b`).test(text), `the feed names ${name}`);
  }
  assert.ok(!/https?:\/\//.test(text), "the feed carries a URL");
  assert.ok(!/[\u2013\u2014]/.test(text), "the feed carries an em or en dash");

  // Every codification topic the shipped policy library cites is somewhere in
  // the feed, which is what "the citations CORE-05 already uses" has to mean.
  const core05 = readdirSync(CORE_05_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => readFileSync(join(CORE_05_DIR, f), "utf8"))
    .join("\n");
  const cited = new Set(core05.match(/ASC \d+(-\d+)?/g) ?? []);
  assert.ok(cited.size >= 3);
  const inFeed = new Set(records.map((r) => r.citation));
  for (const citation of cited) {
    assert.ok(inFeed.has(citation), `CORE-05 cites ${citation} and the feed never mentions it`);
  }
});

test("FIN-20 T-L2: every policy document a record names is a row in the index", () => {
  const known = new Set(indexTable.rows.map((r) => r.document_id));
  let naming = 0;
  for (const record of records) {
    assert.ok(Array.isArray(record.affected_policy_document_ids));
    for (const docId of record.affected_policy_document_ids) {
      assert.ok(known.has(docId), `${record.update_id} names ${docId}, which is not a controlled document`);
      naming += 1;
    }
  }
  assert.ok(naming >= 2, "with fewer than two records naming a document, the policy gap is the only candidate");
});

test("FIN-20 T-L3: an affected account is a FIN-22 code or on no chart at all", () => {
  let intersecting = 0;
  for (const record of records) {
    const onChart = record.affected_accounts.filter((code) => chart.has(code));
    if (onChart.length > 0) intersecting += 1;
    for (const code of onChart) assert.ok(balances.has(code), `${code} is on the chart and not on the trial balance`);
  }
  assert.ok(intersecting >= 2, "the chart join has to bite on more than one record to be a join");
});

test("FIN-20 plant: exactly one record is materially relevant to the company", () => {
  const inScope = (r) => r.scope.entity_types.includes(CO_002.entity_type)
    && r.scope.industries.includes(CO_002.industry)
    && r.scope.revenue_models.includes(CO_002.revenue_model);
  const carriesLiveAccount = (r) => r.affected_accounts.some((code) => {
    const account = chart.get(code);
    return account?.active === "true" && Math.round(Number(balances.get(code)) * 100) !== 0;
  });

  const relevant = records.filter((r) => inScope(r) && carriesLiveAccount(r));
  assert.equal(relevant.length, 1, "material relevance has to resolve to exactly one record");

  // Both legs are load bearing: the scope match alone and the account test
  // alone each catch more than the answer.
  assert.ok(records.filter(inScope).length > 1, "the scope match on its own is the answer, so the account join is decorative");
  assert.ok(records.filter(carriesLiveAccount).length > 1, "the account join on its own is the answer, so the scope match is decorative");
});

test("FIN-20 plant: exactly one record is an irrelevant distractor", () => {
  const distractors = records.filter((r) =>
    r.affected_accounts.every((code) => !chart.has(code))
    && !r.scope.industries.includes(CO_002.industry));
  assert.equal(distractors.length, 1, "the irrelevant record has to resolve to exactly one record");
  assert.ok(
    records.filter((r) => r.affected_accounts.every((code) => !chart.has(code))).length > 1,
    "a zero-account intersection on its own is the answer, so the industry test is decorative"
  );
});

test("FIN-20 plant: exactly one controlled document is behind a rule that names it", () => {
  const index = new Map(indexTable.rows.map((r) => [r.document_id, r]));
  const gaps = records.filter((record) => record.affected_policy_document_ids.some((docId) => {
    const doc = index.get(docId);
    return doc && record.effective_date >= doc.effective_date && record.published_date > doc.last_reviewed;
  }));
  assert.equal(gaps.length, 1, "the policy gap has to resolve to exactly one record");
});

test("FIN-20 T-L4: the three plants are three different records", () => {
  const inScope = (r) => r.scope.entity_types.includes(CO_002.entity_type)
    && r.scope.industries.includes(CO_002.industry)
    && r.scope.revenue_models.includes(CO_002.revenue_model);
  const index = new Map(indexTable.rows.map((r) => [r.document_id, r]));
  const relevant = records.find((r) => inScope(r) && r.affected_accounts.some((code) => {
    const account = chart.get(code);
    return account?.active === "true" && Math.round(Number(balances.get(code)) * 100) !== 0;
  }));
  const distractor = records.find((r) =>
    r.affected_accounts.every((code) => !chart.has(code)) && !r.scope.industries.includes(CO_002.industry));
  const gap = records.find((r) => r.affected_policy_document_ids.some((docId) => {
    const doc = index.get(docId);
    return doc && r.effective_date >= doc.effective_date && r.published_date > doc.last_reviewed;
  }));
  assert.equal(new Set([relevant.update_id, distractor.update_id, gap.update_id]).size, 3);
});

// ------------------------------------------------------------- the policy index

test("FIN-20 T-L1: policy-index.csv recomputes from the CORE-05 sources, row for row", () => {
  const columns = documentedIndexColumns();
  assert.deepEqual(indexTable.cols, columns);

  const expected = expectedIndexRows();
  assert.equal(expected.length, 10, "CORE-05 no longer ships ten markdown sources");
  assert.equal(indexTable.rows.length, expected.length);
  indexTable.rows.forEach((row, i) => {
    for (const column of columns) {
      assert.equal(row[column], expected[i][column], `row ${i + 1}: ${column} does not match its source`);
    }
  });
  assert.equal(new Set(indexTable.rows.map((r) => r.document_id)).size, expected.length);
});

test("FIN-20: no person name reaches the index, and every owner is a title or a function", () => {
  const expected = expectedIndexRows();
  expected.forEach((doc, i) => {
    const row = indexTable.rows[i];
    const comma = doc._owner.indexOf(",");
    if (comma > 0) {
      const person = doc._owner.slice(0, comma).trim();
      assert.notEqual(row.owner_title, doc._owner, "the whole Owner field was copied, person and all");
      for (const cell of Object.values(row)) {
        assert.ok(!cell.includes(person), `"${person}" reaches the index in ${row.document_id}`);
      }
    } else {
      assert.ok(doc._owner.includes("(vacant)"), `${row.document_id} has an owner with no comma and no vacancy marker`);
      assert.equal(row.owner_title, doc._owner.replace("(vacant)", "").trim());
    }
    assert.notEqual(row.owner_title, "");
  });
});

test("FIN-20: two runs are byte identical", () => {
  const again = generateArtifact(spec, canon);
  assert.deepEqual(again, files);
});

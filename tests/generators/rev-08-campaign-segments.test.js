// REV-08: the campaign segment definitions and the audience counts they
// produce, checked against the cluster-4 data plan's tie-out table
// (docs/plans/2026-08-29-path-programs/revenue/data-plans/cluster-4.md,
// sections 2.3 and 4).
//
// The count side is re-derived here rather than imported. The clause semantics,
// the base-population rule and the blank-industry rule are implemented a second
// time in this file, from the plan's own words, and the generator's own
// functions are never used for the assertion side: a test that imports the
// filter it is checking agrees with the generator by construction and can never
// disagree with it. Same reason no assertion below names an account id: every
// count is recomputed over the population, so a CORE-03 reroll that moves a row
// between segments fails here by name.
//
// The population is CORE-03's own emitted accounts.csv, the file the two
// governing rules are written in terms of. The committed bytes on disk are
// checked against the same derivation at the end, so a generator that drifted
// away from the shipped CRM fails even if both generators drifted together.
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

const DEFINITIONS_FILE = "segment-definitions.json";
const COUNTS_FILE = "audience-counts.csv";

/** The two governing rules, verbatim (data plan 0.2). */
const BASE_POPULATION_RULE = "accounts.csv rows whose duplicate_of_account_id is empty";
const BLANK_INDUSTRY_RULE = "a blank industry satisfies no industry clause";

/** The pinned clause grammar (2.3). Written out rather than imported. */
const CLAUSE_FIELDS = ["status", "segment", "industry"];
const CLAUSE_OPS = ["eq", "in"];

/** The keys a variant carries, and nothing else. */
const VARIANT_KEYS = ["segment_id", "name", "clauses"];
const CLAUSE_KEYS = ["field", "op", "values"];

/**
 * Sanity pins at the v1.11.0 population: the base population after the
 * duplicate row is excluded, and the audience each variant selects. These are a
 * second opinion on the derivation below, not its source. If the population
 * moves, the derivation and the emitted bytes still have to agree with each
 * other and this table is what says the universe moved.
 */
const EXPECTED_BASE_POPULATION = 35;
const EXPECTED_COUNTS = {
  "SEG-01": 14,
  "SEG-02": 7,
  "SEG-03": 6,
  "SEG-04": 0,
  "SEG-05": 3,
};

// -------------------------------------------------- the test's own filter

/**
 * One clause, re-implemented from the plan's words: op eq matches when the
 * account's field byte-equals the clause's single value, op in when it
 * byte-equals one of them, and a blank industry satisfies no industry clause.
 */
function matchesClause(account, clause) {
  const value = account[clause.field];
  assert.equal(typeof value, "string", `an account row carries no ${clause.field} cell`);
  if (clause.field === "industry" && value === "") return false;
  if (clause.op === "eq") return value === clause.values[0];
  if (clause.op === "in") return clause.values.includes(value);
  throw new Error(`unpublished clause op ${clause.op}`);
}

/** The base-population rule, re-implemented: the duplicate rows are not in it. */
const basePopulation = (accounts) => accounts.filter((a) => a.duplicate_of_account_id === "");

const audienceOf = (variant, population) =>
  population.filter((account) => variant.clauses.every((clause) => matchesClause(account, clause)));

// ------------------------------------------------------------- the bytes

let cached = null;
function rev08() {
  if (cached) return cached;
  const files = generateArtifact(specs.byId.get("REV-08"), canon);
  const definitionsFile = fileByPath(files, DEFINITIONS_FILE);
  const countsFile = fileByPath(files, COUNTS_FILE);
  cached = {
    files,
    definitionsText: definitionsFile.content,
    definitions: JSON.parse(definitionsFile.content),
    counts: csvTable(countsFile.content),
  };
  return cached;
}

/** CORE-03's own emitted accounts.csv, the population the two rules name. */
let cachedAccounts = null;
function core03Accounts() {
  if (cachedAccounts) return cachedAccounts;
  const files = generateArtifact(specs.byId.get("CORE-03"), canon);
  cachedAccounts = csvTable(fileByPath(files, "accounts.csv").content).rows;
  return cachedAccounts;
}

/** Every object key in `value`, depth first, with its dotted path. */
function eachKey(value, visit, path = "") {
  if (Array.isArray(value)) {
    value.forEach((item, i) => eachKey(item, visit, `${path}[${i}]`));
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    visit(key, childPath);
    eachKey(child, visit, childPath);
  }
}

// ------------------------------------------------------------- the shape

test("REV-08: two files, the counts header and one row per variant in id order", () => {
  const { files, definitions, counts } = rev08();
  assert.deepEqual(files.map((f) => f.path), [DEFINITIONS_FILE, COUNTS_FILE]);
  assert.deepEqual(counts.cols, ["segment_id", "account_count"]);
  assert.deepEqual(
    counts.rows.map((r) => r.segment_id),
    definitions.variants.map((v) => v.segment_id),
    "the counts file does not carry one row per variant in id order"
  );
  for (const row of counts.rows) {
    assert.match(row.account_count, /^\d+$/, `${row.segment_id} carries a non-integer account_count`);
  }
});

test("REV-08: five sequential SEG-NN ids, each over the pinned clause grammar", () => {
  const { definitions } = rev08();
  assert.ok(Array.isArray(definitions.variants), "the definitions file carries no variants list");
  assert.equal(definitions.variants.length, 5, "the definitions file does not carry five variants");

  definitions.variants.forEach((variant, i) => {
    const expected = `SEG-${String(i + 1).padStart(2, "0")}`;
    assert.equal(variant.segment_id, expected, `variant ${i + 1} is ${variant.segment_id}, not ${expected}`);
    assert.deepEqual(Object.keys(variant), VARIANT_KEYS, `${variant.segment_id} does not carry the published key set`);
    assert.equal(typeof variant.name, "string");
    assert.notEqual(variant.name, "", `${variant.segment_id} carries an empty name`);
    assert.ok(variant.clauses.length > 0, `${variant.segment_id} carries no clause`);

    for (const clause of variant.clauses) {
      assert.deepEqual(Object.keys(clause), CLAUSE_KEYS, `${variant.segment_id} carries a clause with the wrong key set`);
      assert.ok(CLAUSE_FIELDS.includes(clause.field), `${variant.segment_id} filters on unpublished field ${clause.field}`);
      assert.ok(CLAUSE_OPS.includes(clause.op), `${variant.segment_id} carries unpublished op ${clause.op}`);
      assert.ok(Array.isArray(clause.values) && clause.values.length > 0, `${variant.segment_id} carries a valueless clause`);
      if (clause.op === "eq") {
        assert.equal(clause.values.length, 1, `${variant.segment_id} carries an eq clause with more than one value`);
      }
    }
    const fields = variant.clauses.map((c) => c.field);
    assert.equal(new Set(fields).size, fields.length, `${variant.segment_id} carries two clauses on one field`);
  });

  const ids = definitions.variants.map((v) => v.segment_id);
  assert.equal(new Set(ids).size, ids.length, "a segment_id appears twice");
});

test("REV-08: the definitions file states both governing rules verbatim", () => {
  const { definitions } = rev08();
  assert.equal(
    definitions.base_population,
    BASE_POPULATION_RULE,
    "the definitions file does not state the base-population rule verbatim"
  );
  assert.equal(
    definitions.blank_industry_rule,
    BLANK_INDUSTRY_RULE,
    "the definitions file does not state the blank-industry rule verbatim"
  );
  // The rules come first, before the variants they govern: a reader recomputing
  // a count meets the population rule before the clause set.
  const keys = Object.keys(definitions);
  assert.ok(
    keys.indexOf("base_population") < keys.indexOf("variants"),
    "the base-population rule is stated after the variants"
  );
  assert.ok(
    keys.indexOf("blank_industry_rule") < keys.indexOf("variants"),
    "the blank-industry rule is stated after the variants"
  );
});

test("C4-P6: no count field exists anywhere in segment-definitions.json", () => {
  const { definitions } = rev08();
  const offenders = [];
  eachKey(definitions, (key, path) => {
    if (/count/i.test(key)) offenders.push(path);
  });
  assert.deepEqual(offenders, [], "the definitions file types a count rather than leaving it to be computed");
});

// ------------------------------------------------------------- tie-outs

test("REV-C4-T5: every audience count re-derives from the CORE-03 account population", () => {
  const { definitions, counts } = rev08();
  const accounts = core03Accounts();
  const population = basePopulation(accounts);

  assert.ok(accounts.length > population.length, "no account row carries a duplicate_of_account_id, so the base-population rule selects nothing");
  assert.equal(population.length, EXPECTED_BASE_POPULATION, "the base population is not the size the plan read off these bytes");

  const emitted = new Map(counts.rows.map((r) => [r.segment_id, Number(r.account_count)]));
  for (const variant of definitions.variants) {
    const derived = audienceOf(variant, population).length;
    assert.equal(
      emitted.get(variant.segment_id),
      derived,
      `${variant.segment_id} reports ${emitted.get(variant.segment_id)} accounts where its own clauses select ${derived}`
    );
    assert.equal(
      derived,
      EXPECTED_COUNTS[variant.segment_id],
      `${variant.segment_id} selects ${derived} accounts, not the ${EXPECTED_COUNTS[variant.segment_id]} the plan read off these bytes`
    );
  }

  // The blank-industry rule does something at these bytes: an account with an
  // empty industry cell exists, and it is excluded from every industry audience.
  const blank = population.filter((a) => a.industry === "");
  assert.ok(blank.length > 0, "no account carries a blank industry, so the blank-industry rule is untested here");
  for (const variant of definitions.variants) {
    if (!variant.clauses.some((c) => c.field === "industry")) continue;
    for (const account of audienceOf(variant, population)) {
      assert.notEqual(account.industry, "", `${variant.segment_id} selected an account with a blank industry`);
    }
  }
});

test("REV-C4-T6: exactly one variant's audience count is zero, and every other is non-zero", () => {
  const { counts } = rev08();
  const sizes = counts.rows.map((r) => Number(r.account_count));
  assert.equal(sizes.filter((n) => n === 0).length, 1, "the honest-empty variant is not a single variant");
  assert.equal(sizes.filter((n) => n > 0).length, sizes.length - 1, "a variant carries a negative audience");
});

test("REV-08: the committed CORE-03 bytes on disk yield the same counts", () => {
  const { definitions, counts } = rev08();
  const committed = csvTable(
    readFileSync(join(REPO_ROOT, "datasets", "core", "crm-seed-dataset", "accounts.csv"), "utf8")
  ).rows;
  const population = basePopulation(committed);
  const emitted = new Map(counts.rows.map((r) => [r.segment_id, Number(r.account_count)]));
  for (const variant of definitions.variants) {
    assert.equal(
      audienceOf(variant, population).length,
      emitted.get(variant.segment_id),
      `${variant.segment_id} disagrees with the committed accounts.csv`
    );
  }
});

// ------------------------------------------------------- house screens

test("REV-08: no dash character reaches the generated definitions prose", () => {
  const { definitionsText } = rev08();
  for (const dash of [String.fromCharCode(0x2014), String.fromCharCode(0x2013)]) {
    assert.ok(!definitionsText.includes(dash), "the definitions file carries a dash character");
  }
});

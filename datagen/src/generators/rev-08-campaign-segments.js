// REV-08 campaign-segment-and-offer-brief: the deterministic half of the
// campaign fixture. Five segment definitions over a pinned clause grammar, and
// the audience count each one produces.
//
// Every count is COMPUTED, never typed. This generator invokes CORE-03's own
// generator with a CORE-03-seeded stream factory (the REV-07 and REV-11
// pattern) and runs each variant's clauses over the emitted account rows, so a
// CORE-03 reroll moves the counts with it instead of leaving a hand-typed
// number quietly disagreeing with the population it claims to describe. No
// audience count appears as a literal anywhere below, and nothing under
// datasets/ is read from disk.
//
// The two selection rules the counts turn on are published in the definitions
// file's own governing metadata rather than left implicit: the base population
// excludes the duplicate account row, and a blank industry satisfies no
// industry clause. A module that recomputes a count reads those two rules out
// of the same file that states the variants, so the recomputation has no hidden
// input.
//
// The offer brief that targets one of these variants is drafted rather than
// generated and lives under artifacts/REV-08/. It is outside `validate`'s
// deterministic branch by design (data plan U7) and is screened by the
// cluster's drafted screen; nothing here reads it.
import { ANCHOR_DATE } from "../dates.js";
import { toCsv } from "../csv.js";
import { createRng } from "../seed.js";
import { generate as generateCore03 } from "./core-03-crm-seed.js";

export const id = "REV-08";

/** The two governing rules, verbatim, published in the definitions file. */
const BASE_POPULATION_RULE = "accounts.csv rows whose duplicate_of_account_id is empty";
const BLANK_INDUSTRY_RULE = "a blank industry satisfies no industry clause";

/** The pinned clause grammar: a clause is {field, op, values} over these sets. */
const CLAUSE_FIELDS = ["status", "segment", "industry"];
const CLAUSE_OPS = ["eq", "in"];

const CLAUSE_GRAMMAR = {
  fields: CLAUSE_FIELDS,
  ops: CLAUSE_OPS,
  match_rule:
    "An account matches a variant when every one of its clauses matches. A clause with op eq matches when the account's field byte-equals the clause's single value; a clause with op in matches when the account's field byte-equals one of the clause's values. Clauses combine with and, and no variant carries or.",
};

/**
 * The five variants. Which clause set carries which SEG-NN id is a design-table
 * pick, so nothing here explains why a variant exists or what it is worth: the
 * file states the rule and the population answers it.
 */
const VARIANTS = [
  {
    segment_id: "SEG-01",
    name: "All open target accounts",
    clauses: [{ field: "status", op: "eq", values: ["target"] }],
  },
  {
    segment_id: "SEG-02",
    name: "Mid-Market target accounts",
    clauses: [
      { field: "status", op: "eq", values: ["target"] },
      { field: "segment", op: "eq", values: ["Mid-Market"] },
    ],
  },
  {
    segment_id: "SEG-03",
    name: "Enterprise target accounts",
    clauses: [
      { field: "status", op: "eq", values: ["target"] },
      { field: "segment", op: "eq", values: ["Enterprise"] },
    ],
  },
  {
    segment_id: "SEG-04",
    name: "Mid-Market and SMB healthcare target accounts",
    clauses: [
      { field: "status", op: "eq", values: ["target"] },
      { field: "industry", op: "eq", values: ["Healthcare"] },
      { field: "segment", op: "in", values: ["Mid-Market", "SMB"] },
    ],
  },
  {
    segment_id: "SEG-05",
    name: "Logistics customer expansion accounts",
    clauses: [
      { field: "status", op: "eq", values: ["customer"] },
      { field: "industry", op: "eq", values: ["Logistics"] },
    ],
  },
];

export function generate() {
  const population = basePopulation(readCore03Accounts());

  const counts = VARIANTS.map((variant) => ({
    segment_id: variant.segment_id,
    account_count: population.filter((account) => matchesVariant(account, variant)).length,
  }));

  const definitions = {
    generated_from_spec: id,
    as_of: ANCHOR_DATE,
    base_population: BASE_POPULATION_RULE,
    blank_industry_rule: BLANK_INDUSTRY_RULE,
    clause_grammar: CLAUSE_GRAMMAR,
    variants: VARIANTS,
  };

  assertFixture({ definitions, population, counts });

  return [
    { path: "segment-definitions.json", content: JSON.stringify(definitions, null, 2) + "\n" },
    { path: "audience-counts.csv", content: toCsv(["segment_id", "account_count"], counts) },
  ];
}

/** CORE-03's own emitted account rows, parsed. Never a second copy of its facts. */
function readCore03Accounts() {
  const files = generateCore03({ rng: (stream) => createRng("CORE-03", stream) });
  const bundle = files.find((f) => f.path === "crm-seed.json");
  if (!bundle) throw new Error("REV-08: CORE-03 no longer emits crm-seed.json");
  const accounts = JSON.parse(bundle.content).accounts;
  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new Error("REV-08: CORE-03's bundle no longer carries account rows");
  }
  return accounts;
}

/** The base-population rule of `BASE_POPULATION_RULE`, applied. */
function basePopulation(accounts) {
  for (const account of accounts) {
    if (typeof account.duplicate_of_account_id !== "string") {
      throw new Error(`REV-08: CORE-03 account ${account.account_id} carries no duplicate_of_account_id cell`);
    }
  }
  return accounts.filter((account) => account.duplicate_of_account_id === "");
}

const matchesVariant = (account, variant) => variant.clauses.every((clause) => matchesClause(account, clause));

/** One clause, under the grammar of `CLAUSE_GRAMMAR` and the blank-industry rule. */
function matchesClause(account, clause) {
  const value = account[clause.field];
  if (typeof value !== "string") {
    throw new Error(`REV-08: CORE-03 accounts no longer carry a ${clause.field} cell`);
  }
  // The blank-industry rule: a blank industry is not an industry that might
  // match, and it satisfies no industry clause at all. Without this, the one
  // account whose two sources disagree would drift in and out of an industry
  // audience depending on which source a reader happened to trust.
  if (clause.field === "industry" && value === "") return false;
  return clause.op === "eq" ? value === clause.values[0] : clause.values.includes(value);
}

/**
 * The build-time guard, recomputing the fixture's own shape over the objects
 * about to be serialized. The honest-empty variant (C4-P7) is the plant module
 * 22's edge eval turns on, so a CORE-03 reroll that gave it a member, or that
 * emptied a second variant, has to fail here rather than ship a fixture whose
 * teaching point has quietly moved. Nothing below states what any audience
 * count is: the guard checks the shape of the set, and the population supplies
 * every number.
 */
function assertFixture({ definitions, population, counts }) {
  const fail = (message) => {
    throw new Error(`REV-08: ${message}`);
  };

  if (population.length === 0) fail("the base population is empty, so every variant would report nothing");

  if (VARIANTS.length !== 5) fail(`${VARIANTS.length} variants, not five`);
  VARIANTS.forEach((variant, i) => {
    const expected = `SEG-${String(i + 1).padStart(2, "0")}`;
    if (variant.segment_id !== expected) fail(`variant ${i + 1} is ${variant.segment_id}, not ${expected}`);
    if (!variant.name) fail(`${variant.segment_id} carries no name`);
    if (variant.clauses.length === 0) fail(`${variant.segment_id} carries no clause, so it would select the whole population`);
    for (const clause of variant.clauses) {
      if (!CLAUSE_FIELDS.includes(clause.field)) fail(`${variant.segment_id} filters on unpublished field ${clause.field}`);
      if (!CLAUSE_OPS.includes(clause.op)) fail(`${variant.segment_id} carries unpublished op ${clause.op}`);
      if (!Array.isArray(clause.values) || clause.values.length === 0) fail(`${variant.segment_id} carries a ${clause.field} clause with no value`);
      if (clause.op === "eq" && clause.values.length !== 1) fail(`${variant.segment_id} carries an eq clause with ${clause.values.length} values`);
    }
    const fields = variant.clauses.map((c) => c.field);
    if (new Set(fields).size !== fields.length) fail(`${variant.segment_id} carries two clauses on one field`);
  });

  const empty = counts.filter((row) => row.account_count === 0);
  if (empty.length !== 1) fail(`${empty.length} variants select nobody, not one (the honest-empty plant)`);
  for (const row of counts) {
    if (!Number.isInteger(row.account_count) || row.account_count < 0) fail(`${row.segment_id} carries a non-integer audience size`);
    if (row.account_count > population.length) fail(`${row.segment_id} selects more rows than the base population holds`);
  }

  // No count field is typed anywhere in the definitions file (C4-P6): the
  // counts file is the only place a number lives, and it is computed.
  walkKeys(definitions, (key, path) => {
    if (/count/i.test(key)) fail(`segment-definitions.json carries a count field at ${path}`);
  });

  const strings = [BASE_POPULATION_RULE, BLANK_INDUSTRY_RULE, CLAUSE_GRAMMAR.match_rule, ...VARIANTS.map((v) => v.name)];
  const dashes = [String.fromCharCode(0x2014), String.fromCharCode(0x2013)];
  for (const text of strings) {
    for (const dash of dashes) {
      if (text.includes(dash)) fail(`an emitted string carries a dash character: ${text.slice(0, 60)}`);
    }
  }
}

/** Every object key in `value`, depth first, with its dotted path. */
function walkKeys(value, visit, path = "") {
  if (Array.isArray(value)) {
    value.forEach((item, i) => walkKeys(item, visit, `${path}[${i}]`));
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    visit(key, childPath);
    walkKeys(child, visit, childPath);
  }
}

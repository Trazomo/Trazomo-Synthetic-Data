// REV-11: the outbound pre-send policy and the five ground-truth scenarios,
// checked against the cluster-2 data plan's REV-C2-T6-precise.
//
// The resolution side reads COMMITTED bytes, never the generators that wrote
// them. A target's consent state comes out of
// datasets/revenue/consent-suppression-master/consent-suppression-master.csv and
// the certification register out of
// artifacts/REV-06/product-security-fact-sheet.md, so a later REV-01 or REV-06
// drift fails here by name instead of moving what this fixture means. The
// register parser and the coverage table are this file's own implementations of
// the plan's words, never the generator's, so the test can disagree with the
// thing it is checking.
//
// Nothing below names a certification, a contact id or a scenario's answer. The
// certification the REV-06 snippets leave unregistered is RECOMPUTED from the
// committed REV-06 files by the pinned vocabulary rule, and the blocked
// scenario's claim is compared against that computed value: hard-coding it here
// would put half the module 4 answer key in the repository.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";
import { moneyMatches } from "../helpers/money-shape.js";
import { REV_C2_CERT_VOCABULARY, certificationsIn } from "../helpers/rev-c2-cert-vocabulary.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));

const PROTAGONIST = "Atticus Dundee Inc.";
const OUTPUT_FILES = ["policy-rules.json", "scenarios.json"];

/** The coverage the plan's 2.3 pins, written out rather than imported. */
const OUTCOME_COVERAGE = { approved: 2, blocked: 2, approved_with_warning: 1 };
const SUBJECT_COVERAGE = { claim_language: 2, discount_language: 1, consent_state: 2 };
const OUTCOMES = Object.keys(OUTCOME_COVERAGE);
const SUBJECTS = Object.keys(SUBJECT_COVERAGE);

const pad = (n) => String(n).padStart(2, "0");

let cached = null;
function rev11() {
  if (cached) return cached;
  const files = generateArtifact(specs.byId.get("REV-11"), canon);
  const rules = JSON.parse(fileByPath(files, "policy-rules.json").content);
  const ground = JSON.parse(fileByPath(files, "scenarios.json").content);
  cached = { files, rules, scenarios: ground.scenarios, ground };
  return cached;
}

/** The committed REV-01 master: the consent state of record every target resolves against. */
let cachedMaster = null;
function committedMaster() {
  if (cachedMaster) return cachedMaster;
  const content = readFileSync(
    join(REPO_ROOT, "datasets", "revenue", "consent-suppression-master", "consent-suppression-master.csv"),
    "utf8"
  );
  cachedMaster = csvTable(content).rows;
  return cachedMaster;
}

const rev06 = (name) => readFileSync(join(REPO_ROOT, "artifacts", "REV-06", name), "utf8");

/**
 * The committed claims register, parsed out of the one markdown table headed
 * `claim_id | category | claim`. A second such table, or none, is a failure of
 * its own: everything below resolves against this one.
 */
function register() {
  const lines = rev06("product-security-fact-sheet.md").split("\n");
  const cells = (line) => line.split("|").slice(1, -1).map((c) => c.trim());
  const heads = lines
    .map((line, i) => ({ line, i }))
    .filter(({ line }) => line.trim().startsWith("|"))
    .filter(({ line }) => {
      const c = cells(line);
      return c.length === 3 && c[0] === "claim_id" && c[1] === "category" && c[2] === "claim";
    });
  assert.equal(heads.length, 1, `the fact sheet carries ${heads.length} claims-register tables, expected exactly 1`);
  const rows = [];
  for (let i = heads[0].i + 1; i < lines.length; i += 1) {
    if (!lines[i].trim().startsWith("|")) break;
    const c = cells(lines[i]);
    if (c.every((cell) => /^:?-+:?$/.test(cell))) continue;
    assert.equal(c.length, 3, `register row ${lines[i]} does not carry three cells`);
    rows.push({ claim_id: c[0], category: c[1], claim: c[2] });
  }
  return rows;
}

/** Every vocabulary entry a `certification` register row names: what the company holds. */
function heldCertifications() {
  const held = new Set();
  for (const row of register()) {
    if (row.category !== "certification") continue;
    for (const name of certificationsIn(row.claim)) held.add(name);
  }
  assert.ok(held.size >= 3, `the register's certification rows name ${held.size} vocabulary entries, expected at least 3`);
  return held;
}

/**
 * The certification the REV-06 snippets assert that resolves to no register row,
 * recomputed from the committed bytes. REV-C2-T5 pins it at exactly one; this
 * file needs it only to prove REV-11's blocked claim is a different one.
 */
function unregisteredSnippetCertification() {
  const held = heldCertifications();
  const unresolved = certificationsIn(rev06("claim-snippets.md")).filter((name) => !held.has(name));
  assert.equal(
    unresolved.length, 1,
    `the REV-06 snippets assert ${unresolved.length} certifications with no register row, expected exactly 1`
  );
  return unresolved[0];
}

const scenariosBySubject = (subject) => rev11().scenarios.filter((s) => s.subject === subject);

// ------------------------------------------------------------------ the shape

test("REV-11: the spec is a deterministic json fixture and the generator emits the policy and the scenarios", () => {
  const spec = specs.byId.get("REV-11");
  assert.ok(spec, "REV-11 is not in the spec catalog");
  assert.equal(spec.name, "policy-as-code-scenarios");
  assert.equal(spec.type, "fixture");
  assert.equal(spec.format, "json");
  assert.equal(spec.generation, "deterministic");
  assert.deepEqual(spec.canon_entities, ["co-002"]);
  assert.deepEqual(spec.consuming_modules, ["revenue-operational-controls"]);
  assert.deepEqual(rev11().files.map((f) => f.path), OUTPUT_FILES);
  assert.equal(rev11().rules.generated_from_spec, "REV-11");
  assert.equal(rev11().ground.generated_from_spec, "REV-11");
});

test("REV-11: policy-rules.json carries the three rule families, each rule stating rule_id, subject, condition, outcome and rationale", () => {
  const { rules } = rev11();
  assert.ok(Array.isArray(rules.rules) && rules.rules.length >= 3, "policy-rules.json carries no rule list");
  const ids = rules.rules.map((r) => r.rule_id);
  assert.equal(new Set(ids).size, ids.length, "a rule_id appears twice");
  for (const rule of rules.rules) {
    assert.match(rule.rule_id, /^PR-\d{2}$/, `rule id ${rule.rule_id} is not PR-NN`);
    assert.ok(SUBJECTS.includes(rule.subject), `${rule.rule_id} carries subject ${rule.subject}`);
    assert.ok(OUTCOMES.includes(rule.outcome), `${rule.rule_id} carries outcome ${rule.outcome}`);
    assert.ok(rule.condition.length > 20, `${rule.rule_id} states no condition`);
    assert.ok(rule.rationale.length > 20, `${rule.rule_id} states no rationale`);
  }
  assert.deepEqual(
    [...new Set(rules.rules.map((r) => r.subject))].sort(),
    [...SUBJECTS].sort(),
    "the policy does not carry all three rule families"
  );

  // The three branches the plan names, each present with the outcome it names.
  const has = (subject, outcome) => rules.rules.some((r) => r.subject === subject && r.outcome === outcome);
  assert.ok(has("claim_language", "blocked"), "no claim-language rule blocks an unresolvable certification claim");
  assert.ok(has("claim_language", "approved"), "no claim-language rule approves a claim that resolves to the register");
  assert.ok(has("discount_language", "approved_with_warning"), "no discount rule holds an unapproved discount for approval");
  assert.ok(has("consent_state", "blocked"), "no consent rule blocks a send_permitted no target");
  assert.ok(has("consent_state", "approved_with_warning"), "no consent rule warns on a send_permitted conditions target");
  assert.equal(rules.discount_threshold_percent, 15, "the discount threshold moved off the single 15 percent band");
});

test("REV-11: policy-rules.json's recognized_certifications equals the pinned cluster-2 vocabulary", () => {
  assert.deepEqual(
    rev11().rules.recognized_certifications,
    REV_C2_CERT_VOCABULARY,
    "the fixture's vocabulary has drifted from tests/helpers/rev-c2-cert-vocabulary.js, so the T5 and T6 extractions no longer agree"
  );
});

// -------------------------------------------------------------- REV-C2-T6-precise

test("REV-C2-T6-precise: five scenarios, ids SCN-01 upward, covering every outcome and every subject", () => {
  const { scenarios } = rev11();
  assert.equal(scenarios.length, 5, `the fixture carries ${scenarios.length} scenarios, expected 5`);
  assert.deepEqual(
    scenarios.map((s) => s.scenario_id),
    scenarios.map((_, i) => `SCN-${pad(i + 1)}`),
    "the scenario ids are not SCN-01 upward in order with no gap"
  );

  const tally = (values) => values.reduce((acc, v) => ({ ...acc, [v]: (acc[v] ?? 0) + 1 }), {});
  const outcomes = tally(scenarios.map((s) => s.expected_outcome));
  const subjects = tally(scenarios.map((s) => s.subject));
  assert.deepEqual(
    [...new Set(scenarios.map((s) => s.expected_outcome))].sort(),
    [...OUTCOMES].sort(),
    "the outcome set is not {approved, blocked, approved_with_warning}"
  );
  for (const [outcome, count] of Object.entries(OUTCOME_COVERAGE)) {
    assert.equal(outcomes[outcome], count, `${outcomes[outcome] ?? 0} scenarios expect ${outcome}, expected ${count}`);
  }
  for (const [subject, count] of Object.entries(SUBJECT_COVERAGE)) {
    assert.equal(subjects[subject], count, `${subjects[subject] ?? 0} scenarios carry subject ${subject}, expected ${count}`);
  }

  for (const scenario of scenarios) {
    assert.ok(scenario.draft_excerpt.length >= 60, `${scenario.scenario_id} carries no draft excerpt worth checking`);
    assert.ok(scenario.rationale.length >= 40, `${scenario.scenario_id} states no rationale`);
  }
});

test("REV-C2-T6-precise: every target_contact_id resolves in the committed master with the consent state the scenario states", () => {
  const { scenarios } = rev11();
  const master = new Map(committedMaster().map((r) => [r.contact_id, r]));
  assert.ok(master.size > 0, "the committed REV-01 master is empty");

  const targets = scenarios.map((s) => s.target_contact_id);
  assert.equal(new Set(targets).size, targets.length, "two scenarios share a target contact");
  for (const scenario of scenarios) {
    const row = master.get(scenario.target_contact_id);
    assert.ok(row, `${scenario.scenario_id} targets ${scenario.target_contact_id}, which is not a row of the committed master`);
    assert.equal(
      scenario.target_consent_status,
      row.consent_status,
      `${scenario.scenario_id} states consent state ${scenario.target_consent_status} for a contact the master carries as ${row.consent_status}`
    );
  }

  // The two consent scenarios are the branch pair the plan names: one target the
  // consent policy forbids sending to, one with confirmed GDPR consent.
  const consent = scenariosBySubject("consent_state");
  assert.equal(consent.filter((s) => s.expected_outcome === "blocked").length, 1);
  assert.equal(consent.filter((s) => s.expected_outcome === "approved").length, 1);
  assert.ok(
    consent.some((s) => s.target_consent_status === "gdpr_consent_confirmed" && s.expected_outcome === "approved"),
    "no consent scenario targets a gdpr_consent_confirmed contact and is approved"
  );
});

test("REV-C2-T6-precise: every certification the approved claim scenario asserts resolves to a REV-06 certification register row", () => {
  const held = heldCertifications();
  const approved = scenariosBySubject("claim_language").filter((s) => s.expected_outcome === "approved");
  assert.equal(approved.length, 1, `${approved.length} claim scenarios are approved, expected 1`);
  const asserted = approved[0].asserted_claims;
  assert.ok(Array.isArray(asserted) && asserted.length > 0, "the approved claim scenario asserts nothing");
  for (const name of asserted) {
    assert.ok(REV_C2_CERT_VOCABULARY.includes(name), `the approved claim scenario asserts "${name}", which is not in the vocabulary`);
    assert.ok(held.has(name), `the approved claim scenario asserts "${name}", which resolves to no certification register row`);
  }
});

test("REV-C2-T6-precise: the blocked claim is in the vocabulary, resolves to no register row, and is not the certification the REV-06 snippets leave unregistered", () => {
  const held = heldCertifications();
  const blocked = scenariosBySubject("claim_language").filter((s) => s.expected_outcome === "blocked");
  assert.equal(blocked.length, 1, `${blocked.length} claim scenarios are blocked, expected 1`);
  const asserted = blocked[0].asserted_claims;
  assert.equal(asserted.length, 1, `the blocked claim scenario asserts ${asserted.length} certifications, expected exactly 1`);
  const claim = asserted[0];

  assert.ok(REV_C2_CERT_VOCABULARY.includes(claim), `the blocked claim "${claim}" is not in the recognized-certifications vocabulary`);
  assert.equal(held.has(claim), false, `the blocked claim "${claim}" resolves to a certification register row, so nothing blocks the send`);
  assert.notEqual(
    claim,
    unregisteredSnippetCertification(),
    "the blocked claim scenario turns on the same certification as the REV-06 fabricated snippet, so each fixture answers the other"
  );
  assert.equal(
    rev06("product-security-fact-sheet.md").includes(claim) || rev06("claim-snippets.md").includes(claim),
    false,
    `the blocked claim "${claim}" appears in a REV-06 file, so the two fixtures are coupled`
  );
});

test("REV-C2-T6-precise: discount_percent is present exactly on the discount-language scenario", () => {
  const { scenarios } = rev11();
  for (const scenario of scenarios) {
    const carries = Object.prototype.hasOwnProperty.call(scenario, "discount_percent");
    assert.equal(
      carries,
      scenario.subject === "discount_language",
      `${scenario.scenario_id} carries discount_percent ${carries ? "without" : "and"} being a discount scenario`
    );
    const carriesClaims = Object.prototype.hasOwnProperty.call(scenario, "asserted_claims");
    assert.equal(
      carriesClaims,
      scenario.subject === "claim_language",
      `${scenario.scenario_id} carries asserted_claims ${carriesClaims ? "without" : "and"} being a claim scenario`
    );
  }
  const discount = scenariosBySubject("discount_language");
  assert.equal(discount.length, 1);
  assert.equal(typeof discount[0].discount_percent, "number", "discount_percent is not a number");
  assert.ok(
    discount[0].discount_percent >= rev11().rules.discount_threshold_percent,
    "the discount scenario does not cross the threshold its expected outcome turns on"
  );
  assert.equal(discount[0].expected_outcome, "approved_with_warning");
});

test("REV-C2-T6-precise: every rule_id a scenario cites resolves in policy-rules.json", () => {
  const { rules, scenarios } = rev11();
  const byId = new Map(rules.rules.map((r) => [r.rule_id, r]));
  for (const scenario of scenarios) {
    assert.ok(Array.isArray(scenario.rule_ids) && scenario.rule_ids.length > 0, `${scenario.scenario_id} cites no rule`);
    for (const ruleId of scenario.rule_ids) {
      const rule = byId.get(ruleId);
      assert.ok(rule, `${scenario.scenario_id} cites ${ruleId}, which policy-rules.json does not carry`);
      assert.equal(rule.subject, scenario.subject, `${scenario.scenario_id} cites ${ruleId}, a ${rule.subject} rule`);
      assert.equal(
        rule.outcome,
        scenario.expected_outcome,
        `${scenario.scenario_id} expects ${scenario.expected_outcome} while ${ruleId} yields ${rule.outcome}`
      );
    }
  }
});

test("REV-11: each claim scenario's asserted_claims are exactly the vocabulary certifications its draft excerpt names", () => {
  for (const scenario of rev11().scenarios) {
    const named = certificationsIn(scenario.draft_excerpt);
    if (scenario.subject === "claim_language") {
      assert.deepEqual(
        scenario.asserted_claims,
        named,
        `${scenario.scenario_id} lists claims its draft excerpt does not name, so extraction and the fixture disagree`
      );
    } else {
      assert.deepEqual(named, [], `${scenario.scenario_id} names a certification without being a claim scenario`);
    }
  }
});

// ------------------------------------------------------------- house screens

test("REV-11: no emitted string carries an em dash, a canon company name or a money amount outside the house shape", () => {
  const text = rev11().files.map((f) => f.content).join("\n\n");
  assert.equal(text.includes("\u2014"), false, "an emitted string carries an em dash (U+2014)");
  for (const company of canon.values()) {
    if (company.name === PROTAGONIST) continue;
    assert.equal(text.includes(company.name), false, `an emitted string names canon company "${company.name}"`);
  }
  for (const amount of moneyMatches(text)) {
    assert.match(amount, /^\$\d{1,3}(?:,\d{3})*\.\d{2}$/, `an emitted string states "${amount}", outside the $1,234.56 house shape`);
  }
  for (const date of text.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g) ?? []) {
    assert.fail(`an emitted string states the date "${date}" outside ISO form`);
  }
});

// REV-11 policy-as-code-scenarios: co-002's outbound pre-send policy as data,
// and the five ground-truth scenarios the checker module 5 builds is graded
// against.
//
// Target contacts are DERIVED from REV-01 rather than retyped: this generator
// invokes REV-01's own generator with a REV-01-seeded stream factory (the REV-07
// and REV-01 pattern) and selects rows by rule over the emitted master, so a
// CORE-03 or REV-01 reroll moves the targets instead of breaking the join.
// Nothing under datasets/ is read from disk or written here.
//
// The claim strings are design-table constants finalized against the frozen
// REV-06, and this module never reads artifacts/REV-06/. Resolving a claim
// against the certification register is the test's job, so a later REV-06 drift
// fails by name in tests/generators/rev-11-policy-scenarios.test.js rather than
// quietly changing what this fixture means.
import { ANCHOR_DATE } from "../dates.js";
import { createRng } from "../seed.js";
import { generate as generateRev01 } from "./rev-01-consent-suppression.js";

export const id = "REV-11";

const POLICY_VERSION = "1.0";

/** Single threshold, per the data plan's U8: no second band, no sliding scale. */
const DISCOUNT_THRESHOLD_PERCENT = 15;

const OUTCOMES = ["approved", "approved_with_warning", "blocked"];

const SUBJECTS = ["claim_language", "discount_language", "consent_state"];

/**
 * The recognized-certifications vocabulary, this fixture's own copy of the
 * pinned cluster-2 list. It travels with the policy because a checker needs the
 * vocabulary at run time, and `tests/helpers/rev-c2-cert-vocabulary.js` holds the
 * copy the tests read; the REV-11 test asserts the two are equal, so they cannot
 * drift.
 *
 * Extraction is exact substring membership and nothing smarter, so no entry may
 * be a substring of another or one assertion would extract as two. Membership
 * marks nothing about what the company holds: the REV-06 certification register
 * alone says that, and this list is deliberately a superset of it.
 */
const RECOGNIZED_CERTIFICATIONS = [
  "SOC 2 Type II",
  "ISO/IEC 27001",
  "ISO/IEC 27017",
  "ISO/IEC 27018",
  "ISO 9001",
  "Cyber Essentials",
  "FedRAMP Authorized",
  "PCI DSS Level 1 Service Provider",
  "HITRUST CSF",
];

const RECOGNIZED_CERTIFICATIONS_NOTE =
  "A draft asserts certification C when the exact string C above appears in it. The assertion resolves when C also appears in a certification row of the REV-06 claims register, and nothing else counts as holding a certification. This list is a superset of that register: it carries schemes the company does not hold, so membership here marks nothing.";

const SOURCES = {
  certification_register: "artifacts/REV-06/product-security-fact-sheet.md",
  consent_states: "datasets/revenue/consent-suppression-master/consent-policy.json",
  contact_consent_state: "datasets/revenue/consent-suppression-master/consent-suppression-master.csv",
};

/**
 * The three rule families of the data plan's 2.3, flattened: a rule's family is
 * its `subject`, and every branch of a family carries its own outcome so a
 * checker never has to infer one.
 */
const RULES = [
  {
    rule_id: "PR-01",
    subject: "claim_language",
    condition: "Every certification the draft asserts appears in a certification row of the claims register.",
    outcome: "approved",
    rationale: "The register is the maintained baseline for product and security claims, and a claim that resolves to a row may go out as written.",
  },
  {
    rule_id: "PR-02",
    subject: "claim_language",
    condition: "The draft asserts a certification that appears in no certification row of the claims register.",
    outcome: "blocked",
    rationale: "An unresolvable certification claim is not approved for outbound use, whether it is untrue or merely unevidenced. The send stops until the register carries the row.",
  },
  {
    rule_id: "PR-03",
    subject: "discount_language",
    condition: `The draft offers a discount of ${DISCOUNT_THRESHOLD_PERCENT} percent or more and no revenue-leadership approval is recorded for it.`,
    outcome: "approved_with_warning",
    rationale: "The wording itself is sound, so the draft is not blocked. It is held for recorded revenue-leadership approval before it goes out, and the warning says so.",
  },
  {
    rule_id: "PR-04",
    subject: "discount_language",
    condition: `The draft offers a discount below ${DISCOUNT_THRESHOLD_PERCENT} percent, or one of ${DISCOUNT_THRESHOLD_PERCENT} percent or more that already carries recorded revenue-leadership approval.`,
    outcome: "approved",
    rationale: "A discount inside the standing authority, or one an approver has already recorded, needs no further sign-off.",
  },
  {
    rule_id: "PR-05",
    subject: "consent_state",
    condition: "The target contact's consent state carries send_permitted yes in the consent policy.",
    outcome: "approved",
    rationale: "A lawful basis to send is recorded for the contact, so the consent check adds no condition.",
  },
  {
    rule_id: "PR-06",
    subject: "consent_state",
    condition: "The target contact's consent state carries send_permitted no in the consent policy.",
    outcome: "blocked",
    rationale: "No basis for sending to this contact is recorded, and no wording of the draft supplies one.",
  },
  {
    rule_id: "PR-07",
    subject: "consent_state",
    condition: "The target contact's consent state carries send_permitted conditions in the consent policy.",
    outcome: "approved_with_warning",
    rationale: "The send is permitted once the condition the state carries is met, so the check approves the draft and names that condition in the warning.",
  },
];

const TARGET_SELECTION_RULE =
  "Every target is selected by rule from the REV-01 master in file order, never by a retyped id. The consent-approved scenario takes the first gdpr_consent_confirmed row; the consent-blocked scenario takes the first remaining row whose consent state carries send_permitted no; the two claim scenarios and the discount scenario take the next three remaining rows, in that order, whose consent state carries send_permitted yes. Giving the claim and discount scenarios a send-permitted target keeps each expected outcome a consequence of its own subject.";

/**
 * The scenario design table. `target` names a selection slot, not a contact:
 * the ids are resolved from REV-01's emitted master below.
 *
 * Rationales are written state-agnostically because the selection rule, not this
 * table, decides which consent state a target turns out to carry.
 */
const SCENARIO_TABLE = [
  {
    scenario_id: "SCN-01",
    subject: "claim_language",
    draft_excerpt:
      "Taking your security questions in order: we maintain a current SOC 2 Type II report covering security and availability, and the information security management system behind the platform is certified to ISO/IEC 27001. I can share both under a mutual nondisclosure agreement whenever your reviewer is ready.",
    target: "claim_approved",
    asserted_claims: ["SOC 2 Type II", "ISO/IEC 27001"],
    expected_outcome: "approved",
    rule_ids: ["PR-01"],
    rationale:
      "Both certifications the draft asserts resolve to a certification row of the claims register, and the target's consent state permits the send, so nothing holds the draft back.",
  },
  {
    scenario_id: "SCN-02",
    subject: "claim_language",
    draft_excerpt:
      "Your compliance reviewer asked what we hold for healthcare data, and the platform is HITRUST CSF certified, so I can put the certification package in front of the reviewer this week.",
    target: "claim_blocked",
    asserted_claims: ["HITRUST CSF"],
    expected_outcome: "blocked",
    rule_ids: ["PR-02"],
    rationale:
      "The certification the draft asserts is a real scheme the register does not carry, so it resolves to no row and the send is blocked. The target's consent state permits the send, so the claim is the only reason.",
  },
  {
    scenario_id: "SCN-03",
    subject: "discount_language",
    draft_excerpt:
      "To get this signed inside the quarter I can take 20 percent off the annual platform subscription for the first year.",
    target: "discount",
    discount_percent: 20,
    expected_outcome: "approved_with_warning",
    rule_ids: ["PR-03"],
    rationale:
      "The discount crosses the threshold and no revenue-leadership approval is recorded for it, so the draft is held for approval rather than blocked. The target's consent state permits the send.",
  },
  {
    scenario_id: "SCN-04",
    subject: "consent_state",
    draft_excerpt:
      "Following up on the workflow rollout your team scoped last quarter, and I can set up a short call to walk through what has shipped since.",
    target: "consent_blocked",
    expected_outcome: "blocked",
    rule_ids: ["PR-06"],
    rationale:
      "The target's consent state carries send_permitted no, so the send is blocked whatever the draft says. Nothing in the wording is at fault.",
  },
  {
    scenario_id: "SCN-05",
    subject: "consent_state",
    draft_excerpt:
      "Sharing the two onboarding guides your team asked for, and I can walk your administrators through the permission model whenever it suits.",
    target: "consent_approved",
    expected_outcome: "approved",
    rule_ids: ["PR-05"],
    rationale:
      "The target's consent state carries send_permitted yes, and the draft asserts no certification and offers no discount, so the pre-send check approves it.",
  },
];

export function generate() {
  const { master, policy } = readRev01();
  const sendPermitted = new Map(policy.consent_states.map((s) => [s.state, s.send_permitted]));
  const targets = selectTargets(master, sendPermitted);

  const scenarios = SCENARIO_TABLE.map((entry) => {
    const target = targets[entry.target];
    const scenario = {
      scenario_id: entry.scenario_id,
      subject: entry.subject,
      draft_excerpt: entry.draft_excerpt,
      target_contact_id: target.contact_id,
      target_consent_status: target.consent_status,
    };
    if (entry.asserted_claims) scenario.asserted_claims = entry.asserted_claims;
    if (entry.discount_percent !== undefined) scenario.discount_percent = entry.discount_percent;
    scenario.expected_outcome = entry.expected_outcome;
    scenario.rule_ids = entry.rule_ids;
    scenario.rationale = entry.rationale;
    return scenario;
  });

  assertFixture({ scenarios, master, sendPermitted });

  const rules = {
    generated_from_spec: id,
    policy_version: POLICY_VERSION,
    as_of: ANCHOR_DATE,
    scope:
      "Every outbound message drafted for a contact, checked before it is sent. A rule that fires blocks the send, holds it for approval, or clears it.",
    outcomes: [
      { outcome: "approved", meaning: "The draft may be sent as written." },
      { outcome: "approved_with_warning", meaning: "The draft may be sent once the warning it carries is cleared by the person or the approval the warning names." },
      { outcome: "blocked", meaning: "The draft may not be sent, and editing the tone will not clear it." },
    ],
    sources: SOURCES,
    discount_threshold_percent: DISCOUNT_THRESHOLD_PERCENT,
    rules: RULES,
    recognized_certifications: RECOGNIZED_CERTIFICATIONS,
    recognized_certifications_note: RECOGNIZED_CERTIFICATIONS_NOTE,
  };

  const groundTruth = {
    generated_from_spec: id,
    as_of: ANCHOR_DATE,
    policy_file: "policy-rules.json",
    target_selection_rule: TARGET_SELECTION_RULE,
    scenarios,
  };

  return [
    { path: "policy-rules.json", content: JSON.stringify(rules, null, 2) + "\n" },
    { path: "scenarios.json", content: JSON.stringify(groundTruth, null, 2) + "\n" },
  ];
}

/** REV-01's own emitted master and policy, parsed. Never a second copy of its facts. */
function readRev01() {
  const files = generateRev01({ rng: (stream) => createRng("REV-01", stream) });
  return {
    master: parseMaster(fileContent(files, "consent-suppression-master.csv")),
    policy: JSON.parse(fileContent(files, "consent-policy.json")),
  };
}

function fileContent(files, path) {
  const file = files.find((f) => f.path === path);
  if (!file) throw new Error(`REV-11: REV-01 no longer emits ${path}`);
  return file.content;
}

/**
 * REV-01's master, parsed. Its cells are ids, emails, ISO dates and enum words,
 * none of which the writer ever quotes, so a split on commas is exact. A quote
 * appearing means the shape moved and a naive split would silently mis-read it.
 */
function parseMaster(content) {
  if (content.includes('"')) {
    throw new Error("REV-11: REV-01's master now carries a quoted cell, which this reader cannot parse");
  }
  const [header, ...lines] = content.trim().split("\n");
  const cols = header.split(",");
  return lines.map((line) => Object.fromEntries(line.split(",").map((cell, i) => [cols[i], cell])));
}

/** The target selection rule of `TARGET_SELECTION_RULE`, applied to the master in file order. */
function selectTargets(master, sendPermitted) {
  const taken = new Set();
  const take = (predicate, what) => {
    const row = master.find((r) => !taken.has(r.contact_id) && predicate(r));
    if (!row) throw new Error(`REV-11: REV-01's master carries no ${what}`);
    taken.add(row.contact_id);
    return row;
  };
  const permits = (row, value) => sendPermitted.get(row.consent_status) === value;

  const consent_approved = take((r) => r.consent_status === "gdpr_consent_confirmed", "gdpr_consent_confirmed contact");
  const consent_blocked = take((r) => permits(r, "no"), "contact whose consent state forbids the send");
  const claim_approved = take((r) => permits(r, "yes"), "send-permitted contact for the resolving claim draft");
  const claim_blocked = take((r) => permits(r, "yes"), "send-permitted contact for the unresolvable claim draft");
  const discount = take((r) => permits(r, "yes"), "send-permitted contact for the discount draft");

  return { consent_approved, consent_blocked, claim_approved, claim_blocked, discount };
}

/** Every vocabulary entry that appears in `text`, in vocabulary order. */
function certificationsIn(text) {
  return RECOGNIZED_CERTIFICATIONS.filter((entry) => text.includes(entry));
}

/**
 * The consent family's three conditions restated as a lookup, so the build guard
 * can disagree with `RULES` instead of agreeing with it by construction.
 */
const CONSENT_OUTCOME_BY_SEND_PERMITTED = {
  yes: "approved",
  no: "blocked",
  conditions: "approved_with_warning",
};

/** The coverage the data plan's 2.3 pins: three outcomes and three subjects over five scenarios. */
const OUTCOME_COVERAGE = { approved: 2, blocked: 2, approved_with_warning: 1 };
const SUBJECT_COVERAGE = { claim_language: 2, discount_language: 1, consent_state: 2 };

/**
 * The build-time guard, recomputing REV-C2-T6-precise over the objects about to
 * be serialized. A fixture whose coverage or resolution has drifted is worse than
 * no fixture: the checker module 5 builds would be graded against ground truth
 * that no longer holds. The register half of T6-precise is not checkable here by
 * design (this generator never reads REV-06); the test file owns it.
 */
function assertFixture({ scenarios, master, sendPermitted }) {
  const fail = (message) => {
    throw new Error(`REV-11: ${message}`);
  };

  for (const a of RECOGNIZED_CERTIFICATIONS) {
    for (const b of RECOGNIZED_CERTIFICATIONS) {
      if (a !== b && b.includes(a)) fail(`vocabulary entry "${a}" is a substring of "${b}", so one assertion would extract as two`);
    }
  }

  if (scenarios.length !== 5) fail(`${scenarios.length} scenarios, not five`);
  scenarios.forEach((scenario, i) => {
    const expected = `SCN-${String(i + 1).padStart(2, "0")}`;
    if (scenario.scenario_id !== expected) fail(`scenario ${i + 1} is ${scenario.scenario_id}, not ${expected}`);
  });

  const tally = (values) => values.reduce((acc, v) => ({ ...acc, [v]: (acc[v] ?? 0) + 1 }), {});
  const outcomes = tally(scenarios.map((s) => s.expected_outcome));
  for (const [outcome, count] of Object.entries(OUTCOME_COVERAGE)) {
    if (outcomes[outcome] !== count) fail(`${outcomes[outcome] ?? 0} scenarios expect ${outcome}, not ${count}`);
  }
  const subjects = tally(scenarios.map((s) => s.subject));
  for (const [subject, count] of Object.entries(SUBJECT_COVERAGE)) {
    if (subjects[subject] !== count) fail(`${subjects[subject] ?? 0} scenarios carry subject ${subject}, not ${count}`);
  }
  for (const scenario of scenarios) {
    if (!OUTCOMES.includes(scenario.expected_outcome)) fail(`${scenario.scenario_id} expects unpublished outcome ${scenario.expected_outcome}`);
    if (!SUBJECTS.includes(scenario.subject)) fail(`${scenario.scenario_id} carries unpublished subject ${scenario.subject}`);
  }

  const byContactId = new Map(master.map((r) => [r.contact_id, r]));
  const targets = scenarios.map((s) => s.target_contact_id);
  if (new Set(targets).size !== targets.length) fail("two scenarios share a target contact");
  for (const scenario of scenarios) {
    const row = byContactId.get(scenario.target_contact_id);
    if (!row) fail(`${scenario.scenario_id} targets ${scenario.target_contact_id}, which is not a REV-01 contact`);
    if (row.consent_status !== scenario.target_consent_status) {
      fail(`${scenario.scenario_id} states consent state ${scenario.target_consent_status} for a contact REV-01 carries as ${row.consent_status}`);
    }
    const permitted = sendPermitted.get(row.consent_status);
    if (!permitted) fail(`${scenario.scenario_id} targets a contact whose state ${row.consent_status} the consent policy does not carry`);
    if (scenario.subject === "consent_state") {
      if (scenario.expected_outcome !== CONSENT_OUTCOME_BY_SEND_PERMITTED[permitted]) {
        fail(`${scenario.scenario_id} expects ${scenario.expected_outcome} for a send_permitted ${permitted} target`);
      }
    } else if (permitted !== "yes") {
      fail(`${scenario.scenario_id} targets a send_permitted ${permitted} contact, so its outcome would not follow from its own subject`);
    }
  }

  const ruleIds = new Map(RULES.map((r) => [r.rule_id, r]));
  for (const rule of RULES) {
    if (!SUBJECTS.includes(rule.subject)) fail(`${rule.rule_id} carries unpublished subject ${rule.subject}`);
    if (!OUTCOMES.includes(rule.outcome)) fail(`${rule.rule_id} carries unpublished outcome ${rule.outcome}`);
    if (!rule.condition || !rule.rationale) fail(`${rule.rule_id} states no condition or no rationale`);
  }
  if (new Set(RULES.map((r) => r.subject)).size !== SUBJECTS.length) fail("the policy does not carry all three rule families");
  for (const scenario of scenarios) {
    if (scenario.rule_ids.length === 0) fail(`${scenario.scenario_id} cites no rule`);
    for (const ruleId of scenario.rule_ids) {
      const rule = ruleIds.get(ruleId);
      if (!rule) fail(`${scenario.scenario_id} cites ${ruleId}, which the policy does not carry`);
      if (rule.subject !== scenario.subject) fail(`${scenario.scenario_id} cites ${ruleId}, a ${rule.subject} rule`);
      if (rule.outcome !== scenario.expected_outcome) fail(`${scenario.scenario_id} cites ${ruleId}, which yields ${rule.outcome}`);
    }
  }

  const claimScenarios = scenarios.filter((s) => s.subject === "claim_language");
  for (const scenario of scenarios) {
    const asserted = certificationsIn(scenario.draft_excerpt);
    if (scenario.subject === "claim_language") {
      if (!Array.isArray(scenario.asserted_claims) || scenario.asserted_claims.length === 0) {
        fail(`${scenario.scenario_id} is a claim scenario asserting nothing`);
      }
      if (JSON.stringify(asserted) !== JSON.stringify(scenario.asserted_claims)) {
        fail(`${scenario.scenario_id} lists [${scenario.asserted_claims.join(", ")}] where its excerpt names [${asserted.join(", ")}]`);
      }
    } else {
      if ("asserted_claims" in scenario) fail(`${scenario.scenario_id} carries asserted_claims without being a claim scenario`);
      if (asserted.length > 0) fail(`${scenario.scenario_id} names certification ${asserted[0]} without being a claim scenario`);
    }
    const carriesDiscount = "discount_percent" in scenario;
    if (carriesDiscount !== (scenario.subject === "discount_language")) {
      fail(`${scenario.scenario_id} carries discount_percent ${carriesDiscount ? "without" : "and"} being a discount scenario`);
    }
    if (carriesDiscount) {
      if (scenario.discount_percent < DISCOUNT_THRESHOLD_PERCENT) {
        fail(`${scenario.scenario_id} offers ${scenario.discount_percent} percent, under the threshold its expected outcome needs`);
      }
      if (!scenario.draft_excerpt.includes(`${scenario.discount_percent} percent`)) {
        fail(`${scenario.scenario_id} states ${scenario.discount_percent} percent in its fields and not in its draft`);
      }
    } else if (/\d+(?:\.\d+)?\s*(?:percent|%)/.test(scenario.draft_excerpt)) {
      fail(`${scenario.scenario_id} states a percentage without being a discount scenario`);
    }
  }

  // The two claim scenarios are the resolving one and the unresolvable one, and
  // they may not assert the same certification: whichever way the register moves,
  // they would then land on the same outcome.
  const [resolving, unresolvable] = claimScenarios;
  if (resolving.expected_outcome !== "approved" || unresolvable.expected_outcome !== "blocked") {
    fail("the two claim scenarios are not one approved and one blocked, in that order");
  }
  if (unresolvable.asserted_claims.length !== 1) {
    fail(`the blocked claim scenario asserts ${unresolvable.asserted_claims.length} certifications, not one`);
  }
  if (resolving.asserted_claims.includes(unresolvable.asserted_claims[0])) {
    fail("the approved claim scenario asserts the certification the blocked one turns on");
  }

  for (const scenario of scenarios) {
    if (scenario.draft_excerpt.length < 60) fail(`${scenario.scenario_id} carries a draft excerpt too short to be an outbound sentence`);
  }
  const strings = [
    ...scenarios.flatMap((s) => [s.draft_excerpt, s.rationale]),
    ...RULES.flatMap((r) => [r.condition, r.rationale]),
    TARGET_SELECTION_RULE,
    RECOGNIZED_CERTIFICATIONS_NOTE,
  ];
  for (const text of strings) {
    if (text.includes("\u2014")) fail(`an emitted string carries an em dash: ${text.slice(0, 60)}`);
  }
}

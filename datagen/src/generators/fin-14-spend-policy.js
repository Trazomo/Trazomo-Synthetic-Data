// FIN-14 spend-policy: the Travel and Expense Policy as configuration.
//
// CORE-05 ships ADI-POL-005 v4.3 as prose a person reads. A spend validator
// cannot read prose, so this file is the same policy as figures a program can
// check FIN-13 against. Nothing is planted: a rule set with a defect in it is
// a broken policy rather than a finding, and the module's whole exercise is
// "run these rules over that expense population".
//
// Every figure below carries the CORE-05 section it comes from. That comment is
// not the guarantee, though: tests/generators/fin-14-spend-policy.test.js reads
// the shipped markdown and looks each figure up in it, so an edit here that the
// policy does not support fails the suite rather than shipping a config that
// quietly disagrees with the document it claims to encode.
//
// Three things are config because no expense file can carry them: the closed
// list a merchant_category is checked against, the boolean that says nobody
// approves their own report, and the window and threshold that make splitting a
// transaction detectable.
import { assertRolesUsed } from "./finance-roles.js";

export const id = "FIN-14";

/** The shipped CORE-05 markdown this file encodes. */
export const SOURCE_ARTIFACT = "CORE-05";

/** City tiers, in the order CORE-05 section 6.1 lists them. */
export const CITY_TIERS = ["tier_1", "tier_2", "tier_3"];

export const POLICY = {
  policy_document_id: "ADI-POL-005", // document control block
  policy_version: "4.3",
  policy_effective_date: "2025-10-15",
  source_artifact: SOURCE_ARTIFACT,
  currency: "USD",
  receipt_required_at_or_above: 7500, // section 10.1, "$75 or more"
  meal_daily_limits: { tier_1: 9500, tier_2: 7500, tier_3: 6000 }, // section 7.2
  lodging_nightly_limits: { tier_1: 37500, tier_2: 27500, tier_3: 20000 }, // section 6.1
  team_meal_per_attendee_vp_approval: 7500, // section 7.6
  business_meal_exempt_from_daily_limit: true, // section 7.5
  // Section 11.2, by report total. Floors are the previous ceiling plus a cent,
  // so every total falls in exactly one band and no total falls outside them.
  report_approval_bands: [
    { band: 1, min: 0, max: 250000, approvers: ["manager"] },
    { band: 2, min: 250001, max: 1000000, approvers: ["Vice President"] },
    { band: 3, min: 1000001, max: 2500000, approvers: ["Vice President", "Corporate Controller"] },
    { band: 4, min: 2500001, max: null, approvers: ["Chief Financial Officer"] },
  ],
  submission_window_days: 30, // section 11.1
  late_submission_escalation_days: 90, // section 11.1
  // Section 8.4 (fines, violations, towing) and section 5.3 (first class).
  non_reimbursable_categories: ["parking_fine", "moving_violation", "towing", "first_class_airfare"],
  self_approval_prohibited: true, // section 3.3
  // Section 14 forbids "splitting a transaction to stay under an approval
  // threshold" and names no window, so the threshold is the first band's
  // ceiling and the window is the validator's own tuning. It is the only
  // number in this file CORE-05 does not state.
  structuring_rule: { window_days: 2, threshold: 250000 },
  // The prose names three titles the CORE-04 roster does not carry as written.
  // The first two are the roster's own wording; the third has no holder at all,
  // and resolves to the rung above VP, Finance the way the shipped FIN-39
  // DA-20 row already escalates.
  role_map: {
    "Vice President": "VP, Finance",
    "Corporate Controller": "Controller",
    "Chief Financial Officer": "Chief Executive Officer",
  },
};

/** Integer cents to the 2dp string the YAML carries. */
function usd(cents) {
  return (cents / 100).toFixed(2);
}

/**
 * The policy as a plain object in cents, for FIN-13 and its test to check
 * against. Money stays integer cents here; only the emitted YAML is 2dp.
 */
export function buildSpendPolicy() {
  const policy = POLICY;

  // Bands are the routing table, so a gap or an overlap is a report nobody has
  // to approve. Refuse to emit one.
  policy.report_approval_bands.forEach((band, i) => {
    if (band.band !== i + 1) throw new Error(`${id}: band ${band.band} is out of order`);
    if (band.approvers.length === 0) throw new Error(`${id}: band ${band.band} names no approver`);
    if (i === 0) {
      if (band.min !== 0) throw new Error(`${id}: the first band does not start at zero`);
    } else {
      const previous = policy.report_approval_bands[i - 1];
      if (previous.max === null) throw new Error(`${id}: band ${previous.band} is open ended but not last`);
      if (band.min !== previous.max + 1) {
        throw new Error(`${id}: band ${band.band} does not start one cent above band ${previous.band}`);
      }
    }
    if (band.max !== null && band.max <= band.min) {
      throw new Error(`${id}: band ${band.band} ends at or below where it starts`);
    }
  });
  const last = policy.report_approval_bands[policy.report_approval_bands.length - 1];
  if (last.max !== null) throw new Error(`${id}: the top band has a ceiling, so a large enough report has no approver`);

  if (policy.structuring_rule.threshold !== policy.report_approval_bands[0].max) {
    throw new Error(`${id}: the structuring threshold is not the first approval band's ceiling`);
  }

  // Every mapped title has to be a title an active CORE-04 employee holds, or
  // the config routes a report to a role that does not exist.
  assertRolesUsed(id, Object.values(policy.role_map));

  const tiers = new Set(CITY_TIERS);
  for (const limits of [policy.meal_daily_limits, policy.lodging_nightly_limits]) {
    const keys = Object.keys(limits);
    if (keys.length !== tiers.size || keys.some((k) => !tiers.has(k))) {
      throw new Error(`${id}: city tier limits must cover exactly ${[...tiers].join(", ")}`);
    }
  }

  return policy;
}

/** The band a report total in cents falls in. Total by construction. */
export function bandForTotal(totalCents, policy = POLICY) {
  const band = policy.report_approval_bands.find(
    (b) => totalCents >= b.min && (b.max === null || totalCents <= b.max)
  );
  if (!band) throw new Error(`${id}: ${totalCents} cents falls in no approval band`);
  return band;
}

function renderYaml(policy) {
  const lines = [
    "# FIN-14 spend-policy: the Travel and Expense Policy as configuration.",
    "#",
    "# Every figure here is the figure ADI-POL-005 v4.3 states in prose. The",
    "# document itself ships as CORE-05; read it for the reasoning, read this",
    "# for the rule a program can run. Generated, not hand maintained:",
    "# datagen/src/generators/fin-14-spend-policy.js.",
    `policy_document_id: ${policy.policy_document_id}`,
    `policy_version: "${policy.policy_version}"`,
    `policy_effective_date: "${policy.policy_effective_date}"`,
    `source_artifact: ${policy.source_artifact}`,
    `currency: ${policy.currency}`,
    "",
    "# CORE-05 section 10.1: an itemized receipt is required at or above this amount.",
    `receipt_required_at_or_above: ${usd(policy.receipt_required_at_or_above)}`,
    "",
    "# CORE-05 section 7.2: the daily meal ceiling by destination city tier,",
    "# claimed as actual cost or as per diem.",
    "meal_daily_limits:",
    ...CITY_TIERS.map((tier) => `  ${tier}: ${usd(policy.meal_daily_limits[tier])}`),
    "",
    "# CORE-05 section 6.1: the nightly room rate cap by city tier, exclusive of",
    "# taxes and mandatory fees.",
    "lodging_nightly_limits:",
    ...CITY_TIERS.map((tier) => `  ${tier}: ${usd(policy.lodging_nightly_limits[tier])}`),
    "",
    "# CORE-05 section 7.6: a team meal with no external guest needs Vice",
    "# President approval above this amount per attendee.",
    `team_meal_per_attendee_vp_approval: ${usd(policy.team_meal_per_attendee_vp_approval)}`,
    "",
    "# CORE-05 section 7.5: a business meal with external guests is claimed at",
    "# actual cost and is not measured against the daily meal limit.",
    `business_meal_exempt_from_daily_limit: ${policy.business_meal_exempt_from_daily_limit}`,
    "",
    "# CORE-05 section 11.2: who approves, by report total. Contiguous from zero",
    "# and open ended at the top, so every total falls in exactly one band.",
    "report_approval_bands:",
  ];
  for (const band of policy.report_approval_bands) {
    lines.push(`  - band: ${band.band}`);
    lines.push(`    min_usd: ${usd(band.min)}`);
    lines.push(`    max_usd: ${band.max === null ? "null" : usd(band.max)}`);
    lines.push(`    approvers: [${band.approvers.map((a) => `"${a}"`).join(", ")}]`);
  }
  lines.push(
    "",
    "# CORE-05 section 11.1: the submission window, and the point past which the",
    "# report needs the top escalation and may be treated as taxable income.",
    `submission_window_days: ${policy.submission_window_days}`,
    `late_submission_escalation_days: ${policy.late_submission_escalation_days}`,
    "",
    "# CORE-05 sections 5.3 and 8.4: the closed list a merchant_category is",
    "# checked against. A category outside this list is not a finding.",
    "non_reimbursable_categories:",
    ...policy.non_reimbursable_categories.map((c) => `  - ${c}`),
    "",
    "# CORE-05 section 3.3.",
    `self_approval_prohibited: ${policy.self_approval_prohibited}`,
    "",
    "# CORE-05 section 14 forbids splitting a transaction to stay under an",
    "# approval threshold. The threshold is the first approval band's ceiling;",
    "# the window is how close together two reports have to sit to be one",
    "# transaction, which the prose leaves to the validator.",
    "structuring_rule:",
    `  window_days: ${policy.structuring_rule.window_days}`,
    `  threshold_usd: ${usd(policy.structuring_rule.threshold)}`,
    "",
    "# The policy names three titles the CORE-04 roster does not carry as",
    "# written. Mapping them here rather than in a comment is what lets a",
    "# validator resolve an approver to a person.",
    "role_map:",
    ...Object.entries(policy.role_map).map(([prose, roster]) => `  ${prose}: "${roster}"`),
    ""
  );
  return lines.join("\n");
}

export function generate() {
  return [{ path: "spend-policy.yaml", content: renderYaml(buildSpendPolicy()) }];
}

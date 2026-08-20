// FIN-14 spend-policy: the machine-readable encoding of the shipped CORE-05
// Travel and Expense Policy (ADI-POL-005 v4.3).
//
// Nothing is planted in a rule set, so this test has exactly one job: prove the
// config still says what the prose says. Every figure is read back out of the
// emitted YAML, formatted the way the policy writes it, and looked up in
// artifacts/CORE-05/internal-policy-library-travel-and-expense-policy.md. The
// test never types a limit of its own, so it cannot quietly agree with a
// generator that has drifted; edit a cap in the generator and the lookup fails.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import yaml from "js-yaml";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { financeRoster } from "../../datagen/src/generators/finance-roles.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
const spec = specs.byId.get("FIN-14");

const POLICY_PATH = join(
  REPO_ROOT, "artifacts", "CORE-05", "internal-policy-library-travel-and-expense-policy.md"
);
const policyText = readFileSync(POLICY_PATH, "utf8");

const files = generateArtifact(spec, canon);
const policyFile = files.find((f) => f.path === "spend-policy.yaml");
assert.ok(policyFile, `expected spend-policy.yaml (got: ${files.map((f) => f.path).join(", ")})`);
const doc = yaml.load(policyFile.content);

/** "$2,500" / "$375": the way the prose writes a whole-dollar figure. */
function asProseDollars(value) {
  assert.ok(Number.isInteger(value), `${value} is not a whole-dollar figure`);
  return `$${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

/**
 * The key list the spec documents, parsed out of the spec rather than retyped:
 * a YAML document carries keys where a CSV carries a header, so this is the
 * FIN-14 equivalent of `assert.deepEqual(header, spec.columns)`.
 */
function documentedKeyList() {
  const feature = spec.planted_features.find((f) => f.startsWith("documented key list"));
  assert.ok(feature, "FIN-14 spec no longer documents its key list");
  const listed = feature.slice(feature.lastIndexOf("): ") + 3);
  return listed.split(", ").map((k) => k.trim());
}

test("FIN-14: one YAML document, whose top-level keys are the spec's list in the spec's order", () => {
  assert.equal(files.length, 1);
  assert.deepEqual(Object.keys(doc), documentedKeyList());
});

test("FIN-14: the document control block is quoted from CORE-05, and source_artifact names it", () => {
  assert.equal(doc.source_artifact, "CORE-05");
  assert.equal(doc.currency, "USD");
  for (const value of [doc.policy_document_id, doc.policy_version, doc.policy_effective_date]) {
    assert.equal(typeof value, "string");
    assert.ok(
      policyText.includes(`| ${value} |`),
      `"${value}" is not a document-control value in ${POLICY_PATH}`
    );
  }
});

// How each number in the document is checked against the prose. The test walks
// the parsed YAML for numeric leaves and requires this map to cover every one of
// them, so a figure added later cannot slip in unclassified and unchecked.
const NUMERIC_LEAF_KIND = {
  "receipt_required_at_or_above": "dollars",
  "meal_daily_limits.tier_1": "dollars",
  "meal_daily_limits.tier_2": "dollars",
  "meal_daily_limits.tier_3": "dollars",
  "lodging_nightly_limits.tier_1": "dollars",
  "lodging_nightly_limits.tier_2": "dollars",
  "lodging_nightly_limits.tier_3": "dollars",
  "team_meal_per_attendee_vp_approval": "dollars",
  // A band's ceiling is a prose threshold; its floor is the previous ceiling
  // plus a cent, which is arithmetic (checked by the contiguity test), and its
  // number is a position in the ladder rather than a figure.
  "report_approval_bands.0.band": "position",
  "report_approval_bands.0.min_usd": "band_floor",
  "report_approval_bands.0.max_usd": "dollars",
  "report_approval_bands.1.band": "position",
  "report_approval_bands.1.min_usd": "band_floor",
  "report_approval_bands.1.max_usd": "dollars",
  "report_approval_bands.2.band": "position",
  "report_approval_bands.2.min_usd": "band_floor",
  "report_approval_bands.2.max_usd": "dollars",
  "report_approval_bands.3.band": "position",
  "report_approval_bands.3.min_usd": "band_floor",
  "submission_window_days": "days",
  "late_submission_escalation_days": "days",
  "structuring_rule.threshold_usd": "dollars",
  // The one number in the file CORE-05 does not state. Section 14 forbids
  // splitting a transaction to stay under an approval threshold but sets no
  // detection window, so this is the validator's tuning rather than policy.
  // Adding a second entry here is a review conversation, not a rename.
  "structuring_rule.window_days": "no prose counterpart",
};

function numericLeaves(node, path = []) {
  if (typeof node === "number") return [[path.join("."), node]];
  if (Array.isArray(node)) return node.flatMap((v, i) => numericLeaves(v, [...path, String(i)]));
  if (node && typeof node === "object") {
    return Object.entries(node).flatMap(([k, v]) => numericLeaves(v, [...path, k]));
  }
  return [];
}

test("FIN-14: every money figure appears verbatim in the CORE-05 prose it claims to encode", () => {
  const leaves = numericLeaves(doc);
  assert.deepEqual(
    leaves.map(([p]) => p).sort(),
    Object.keys(NUMERIC_LEAF_KIND).sort(),
    "a number was added to or removed from the config without saying how the prose backs it"
  );

  const exempt = [];
  for (const [where, value] of leaves) {
    const kind = NUMERIC_LEAF_KIND[where];
    if (kind === "dollars") {
      const prose = asProseDollars(value);
      assert.ok(policyText.includes(prose), `${where} is ${prose}, which CORE-05 never states`);
    } else if (kind === "days") {
      assert.ok(
        policyText.includes(`${value} days`),
        `${where} is ${value} days, which CORE-05 never states`
      );
    } else if (kind === "position") {
      assert.ok(Number.isInteger(value) && value > 0);
    } else if (kind === "band_floor") {
      assert.ok(value >= 0);
    } else {
      exempt.push(where);
      assert.ok(Number.isInteger(value) && value > 0);
    }
  }
  assert.equal(exempt.length, 1, "exactly one number in this file is allowed to have no prose behind it");

  assert.equal(
    doc.structuring_rule.threshold_usd,
    doc.report_approval_bands[0].max_usd,
    "the structuring threshold is the first approval band's ceiling, not a free parameter"
  );
});

test("FIN-14: approval bands run contiguously from zero, never overlap, and every band names an approver", () => {
  const bands = doc.report_approval_bands;
  assert.ok(bands.length >= 2);
  assert.equal(bands[0].min_usd, 0);
  bands.forEach((band, i) => {
    assert.equal(band.band, i + 1, "bands are numbered in file order");
    assert.ok(Array.isArray(band.approvers) && band.approvers.length >= 1, "a band with no approver routes nowhere");
    if (i > 0) {
      const previous = bands[i - 1];
      assert.ok(previous.max_usd !== null, "only the top band is open ended");
      assert.equal(
        Math.round(band.min_usd * 100),
        Math.round(previous.max_usd * 100) + 1,
        "a gap or an overlap between bands leaves a report total with no approver, or two"
      );
    }
    if (band.max_usd !== null) assert.ok(band.max_usd > band.min_usd);
  });
  assert.equal(bands[bands.length - 1].max_usd, null, "the top band has no ceiling");

  // Every total lands in exactly one band, tested over the boundaries the
  // bands themselves declare rather than over invented amounts.
  const probes = bands.flatMap((b) => [b.min_usd, b.max_usd].filter((v) => v !== null));
  for (const probe of probes) {
    const cents = Math.round(probe * 100);
    const matching = bands.filter((b) =>
      cents >= Math.round(b.min_usd * 100)
      && (b.max_usd === null || cents <= Math.round(b.max_usd * 100)));
    assert.equal(matching.length, 1, `${probe} falls in ${matching.length} bands`);
  }
});

test("FIN-14: role_map resolves prose titles the roster does not carry to titles it does", () => {
  const roster = financeRoster();
  const activeTitles = new Set(
    roster.filter((r) => r.employment_status === "active").map((r) => r.role_title)
  );
  const entries = Object.entries(doc.role_map);
  assert.ok(entries.length >= 3);
  for (const [proseTitle, rosterTitle] of entries) {
    assert.ok(policyText.includes(proseTitle), `the policy never names a "${proseTitle}"`);
    assert.ok(
      activeTitles.has(rosterTitle),
      `role_map sends "${proseTitle}" to "${rosterTitle}", which no active CORE-04 employee holds`
    );
  }
  // At least one title needed the map: the point of the file.
  assert.ok(
    entries.some(([proseTitle]) => !activeTitles.has(proseTitle)),
    "if every prose title were already a roster title the map would be dead weight"
  );
  // Every band approver is either the reporting relation or a mapped title.
  for (const band of doc.report_approval_bands) {
    for (const approver of band.approvers) {
      assert.ok(
        approver === "manager" || approver in doc.role_map,
        `band ${band.band} names "${approver}", which is neither the manager relation nor a mapped role`
      );
    }
  }
});

test("FIN-14: the three rules an expense file cannot carry are config, and each traces to the prose", () => {
  assert.equal(doc.self_approval_prohibited, true);
  assert.ok(policyText.includes("No one approves their own expense report"));
  assert.equal(doc.business_meal_exempt_from_daily_limit, true);
  assert.ok(policyText.includes("not limited by the daily meal limit"));

  const PROSE_FOR_CATEGORY = {
    parking_fine: "Parking fines",
    moving_violation: "moving violations",
    towing: "towing charges",
    first_class_airfare: "First class is not reimbursable",
  };
  const categories = doc.non_reimbursable_categories;
  assert.ok(Array.isArray(categories) && categories.length >= 1);
  assert.equal(new Set(categories).size, categories.length, "a category is listed twice");
  for (const category of categories) {
    assert.match(category, /^[a-z][a-z_]*[a-z]$/, "categories are snake_case tokens a CSV cell can carry");
    const prose = PROSE_FOR_CATEGORY[category];
    assert.ok(prose, `${category} is not a category CORE-05 makes non-reimbursable`);
    assert.ok(policyText.includes(prose), `CORE-05 no longer says "${prose}"`);
  }
});

test("FIN-14: two runs are byte identical", () => {
  const again = generateArtifact(spec, canon);
  assert.deepEqual(again, files);
});

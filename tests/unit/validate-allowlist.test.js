import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { evaluateAllowlist, loadAllowlist, validateDrafted } from "../../datagen/src/validate.js";

const ABSENT_A = "aardvark bespoke cromulent digression";
const ABSENT_B = "elephant fandango gregarious harmonium";
const REASON = "the QA-broken twin cannot label its own defects";

function withArtifact(features, body, fn) {
  const root = mkdtempSync(join(tmpdir(), "datagen-allow-"));
  try {
    const dir = join(root, "artifacts", "TEST-99");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "doc.md"), body);
    fn(root, { id: "TEST-99", planted_features: features });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function withAllowlistFile(yaml, fn) {
  const dir = mkdtempSync(join(tmpdir(), "datagen-allowfile-"));
  try {
    const p = join(dir, "validate-allowlist.yaml");
    writeFileSync(p, yaml);
    fn(p, dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// --- reporting -------------------------------------------------------------

test("validateDrafted: an allowlisted miss reports ALLOWED, not WARN, and carries its reason", () => {
  withArtifact([ABSENT_A], "Unrelated content about nothing in particular.", (root, spec) => {
    const allowlist = [{ artifact: "TEST-99", feature: ABSENT_A, reason: REASON }];
    const result = validateDrafted({ root, spec, allowlist });
    assert.equal(result.results[0].status, "ALLOWED");
    assert.equal(result.results[0].allowReason, REASON);
  });
});

test("validateDrafted: a spec whose only misses are allowlisted is PASS overall", () => {
  withArtifact([ABSENT_A], "Unrelated content about nothing in particular.", (root, spec) => {
    const allowlist = [{ artifact: "TEST-99", feature: ABSENT_A, reason: REASON }];
    assert.equal(validateDrafted({ root, spec, allowlist }).status, "PASS");
  });
});

test("validateDrafted: a miss that is not allowlisted still WARNs", () => {
  withArtifact([ABSENT_A, ABSENT_B], "Unrelated content about nothing in particular.", (root, spec) => {
    const allowlist = [{ artifact: "TEST-99", feature: ABSENT_A, reason: REASON }];
    const result = validateDrafted({ root, spec, allowlist });
    assert.equal(result.results[0].status, "ALLOWED");
    assert.equal(result.results[1].status, "WARN");
    assert.equal(result.status, "WARN", "one unexplained miss must still fail the spec");
  });
});

test("validateDrafted: an entry for a different artifact does not leak across specs", () => {
  withArtifact([ABSENT_A], "Unrelated content about nothing in particular.", (root, spec) => {
    const allowlist = [{ artifact: "OTHER-01", feature: ABSENT_A, reason: REASON }];
    assert.equal(validateDrafted({ root, spec, allowlist }).results[0].status, "WARN");
  });
});

// --- self-expiry -----------------------------------------------------------

test("evaluateAllowlist: an entry whose feature now passes on its own is stale", () => {
  // The whole point: when the spec text or the document is fixed, the allowlist
  // entry must fail loudly instead of silently sitting there forever.
  const feature = "aardvark bespoke cromulent";
  withArtifact([feature], "The aardvark is bespoke and cromulent.", (root, spec) => {
    const allowlist = [{ artifact: "TEST-99", feature, reason: REASON }];
    const result = validateDrafted({ root, spec, allowlist });
    assert.equal(result.results[0].status, "PASS");
    const stale = evaluateAllowlist({
      allowlist,
      specs: [spec],
      resultsById: new Map([["TEST-99", result]]),
    });
    assert.equal(stale.length, 1);
    assert.match(stale[0].problem, /no longer needed/);
  });
});

test("evaluateAllowlist: an entry naming a feature the spec no longer contains is stale", () => {
  withArtifact([ABSENT_B], "Unrelated content.", (root, spec) => {
    const allowlist = [{ artifact: "TEST-99", feature: "a feature text nobody wrote", reason: REASON }];
    const result = validateDrafted({ root, spec, allowlist });
    const stale = evaluateAllowlist({ allowlist, specs: [spec], resultsById: new Map([["TEST-99", result]]) });
    assert.equal(stale.length, 1);
    assert.match(stale[0].problem, /no planted_feature/);
  });
});

test("evaluateAllowlist: an entry naming an unknown artifact is stale", () => {
  const allowlist = [{ artifact: "NOPE-01", feature: ABSENT_A, reason: REASON }];
  const stale = evaluateAllowlist({
    allowlist,
    specs: [{ id: "TEST-99", planted_features: [ABSENT_A] }],
    resultsById: new Map(),
  });
  assert.equal(stale.length, 1);
  assert.match(stale[0].problem, /not in the spec catalog/);
});

test("evaluateAllowlist: a live entry is not reported stale", () => {
  withArtifact([ABSENT_A], "Unrelated content.", (root, spec) => {
    const allowlist = [{ artifact: "TEST-99", feature: ABSENT_A, reason: REASON }];
    const result = validateDrafted({ root, spec, allowlist });
    const stale = evaluateAllowlist({ allowlist, specs: [spec], resultsById: new Map([["TEST-99", result]]) });
    assert.deepEqual(stale, []);
  });
});

test("evaluateAllowlist: a spec that was not part of this run is not judged stale", () => {
  // `validate CORE-01` must not fail because LGL-02's entry went unexercised.
  const allowlist = [{ artifact: "TEST-99", feature: ABSENT_A, reason: REASON }];
  const stale = evaluateAllowlist({
    allowlist,
    specs: [{ id: "TEST-99", planted_features: [ABSENT_A] }],
    resultsById: new Map(),
  });
  assert.deepEqual(stale, []);
});

// --- loading ---------------------------------------------------------------

test("loadAllowlist: every entry must carry a reason", () => {
  withAllowlistFile(
    'allowed:\n  - artifact: CORE-01\n    feature: "some feature"\n',
    (p) => assert.throws(() => loadAllowlist(p), /reason/)
  );
});

test("loadAllowlist: artifact and feature are required too", () => {
  withAllowlistFile('allowed:\n  - reason: "because"\n', (p) => assert.throws(() => loadAllowlist(p), /artifact/));
  withAllowlistFile(
    'allowed:\n  - artifact: CORE-01\n    reason: "because"\n',
    (p) => assert.throws(() => loadAllowlist(p), /feature/)
  );
});

test("loadAllowlist: a blank reason is not a reason", () => {
  withAllowlistFile(
    'allowed:\n  - artifact: CORE-01\n    feature: "some feature"\n    reason: "   "\n',
    (p) => assert.throws(() => loadAllowlist(p), /reason/)
  );
});

test("loadAllowlist: an absent file is an empty allowlist, not an error", () => {
  const dir = mkdtempSync(join(tmpdir(), "datagen-noallow-"));
  try {
    assert.deepEqual(loadAllowlist(join(dir, "does-not-exist.yaml")), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loadAllowlist: a well-formed file round-trips", () => {
  withAllowlistFile(
    `allowed:\n  - artifact: LGL-02\n    feature: "${ABSENT_A}"\n    reason: "${REASON}"\n`,
    (p) => {
      const entries = loadAllowlist(p);
      assert.equal(entries.length, 1);
      assert.equal(entries[0].artifact, "LGL-02");
      assert.equal(entries[0].feature, ABSENT_A);
      assert.equal(entries[0].reason, REASON);
    }
  );
});

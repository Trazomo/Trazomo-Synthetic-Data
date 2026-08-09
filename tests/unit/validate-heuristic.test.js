import { test } from "node:test";
import assert from "node:assert/strict";
import { checkPlantedFeature, significantTokens } from "../../datagen/src/validate.js";

test("significantTokens pulls out meaningful words and numbers, drops stopwords", () => {
  const tokens = significantTokens("90-day auto-renewal notice in section 1 vs 30-day termination notice in section 7 (canon mismatch)");
  const lower = tokens.map((t) => t.toLowerCase());
  assert.ok(lower.includes("auto-renewal"));
  assert.ok(lower.includes("termination"));
  assert.ok(lower.includes("mismatch"));
  assert.ok(!lower.includes("vs"));
  assert.ok(!lower.includes("in"));
});

test("checkPlantedFeature: PASS when the source text contains most significant tokens", () => {
  const feature = "500,000 hard-coded critical-risk auto-escalation threshold";
  const source = "The critical-risk auto-escalation threshold is hard-coded at $500,000 for every matter intake record.";
  const result = checkPlantedFeature(feature, source);
  assert.equal(result.status, "PASS");
});

test("checkPlantedFeature: WARN when most significant tokens are absent", () => {
  const feature = "9-field metadata, 3-tier training audience split for the AML policy";
  const source = "This document has nothing to do with any of that.";
  const result = checkPlantedFeature(feature, source);
  assert.equal(result.status, "WARN");
  assert.ok(result.missing.length > 0);
});

test("checkPlantedFeature is case-insensitive", () => {
  const feature = "DTSA whistleblower notice (18 USC 1833(b))";
  const source = "This agreement includes the dtsa whistleblower notice required under 18 usc 1833(b).";
  const result = checkPlantedFeature(feature, source);
  assert.equal(result.status, "PASS");
});

test("significantTokens flattens mapping-shaped planted features", () => {
  const tokens = significantTokens({ "finance section": "one memo superseded by a later one" });
  assert.ok(tokens.includes("finance"));
  assert.ok(tokens.includes("superseded"));
});

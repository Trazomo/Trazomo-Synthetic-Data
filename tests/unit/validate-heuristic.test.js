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

// --- compound (hyphenated) spec tokens vs. real document prose --------------
// Spec authors write compounds with a hyphen ("consequential-damages"); drafted
// legal prose writes the same phrase with a space ("Consequential Damages").
// The compound is one token by design (see the tokenizer test above) -- it is
// the *comparison* that has to tolerate the punctuation difference.

test("checkPlantedFeature: a hyphenated compound matches the same phrase written with a space", () => {
  const feature = "consequential-damages waiver-only clause";
  // Verbatim shape of artifacts/CORE-01/master-services-agreement.md section 6.2.
  const source = "**6.2 Waiver of Consequential Damages.** Neither Party will be liable "
    + "under this clause for indirect or consequential loss.";
  const result = checkPlantedFeature(feature, source);
  assert.equal(result.status, "PASS");
  assert.ok(result.matched.map((t) => t.toLowerCase()).includes("consequential-damages"));
});

test("checkPlantedFeature: compound matching is separator- and case-insensitive", () => {
  const feature = "data-processing reference and governing-law clause";
  for (const variant of [
    "9.1 Data Processing Addendum. 19. Governing Law of this clause.",
    "9.1 data-processing addendum. 19. governing-law of this clause.",
    "9.1 DataProcessing addendum. 19. GoverningLaw of this clause.",
    "9.1 Data\nProcessing addendum. 19. Governing  Law of this clause.",
  ]) {
    const result = checkPlantedFeature(feature, variant);
    assert.equal(result.status, "PASS", `expected PASS for: ${variant}`);
  }
});

test("checkPlantedFeature: hyphenated section headings in the source still match", () => {
  const feature = "residual-knowledge clause";
  const source = "## 5. Residual Knowledge\n\nThe Receiving Party may use residual knowledge.";
  const result = checkPlantedFeature(feature, source);
  assert.ok(result.matched.map((t) => t.toLowerCase()).includes("residual-knowledge"));
});

// --- negative cases: real missing-content signal must still fire ------------

test("checkPlantedFeature: a planted feature genuinely absent from the document still WARNs", () => {
  // The document is a well-formed contract -- it just never implements the
  // arbitration/escalation feature the spec claims is planted in it.
  const feature = "three-tier arbitration escalation ladder with 30-day mediation window";
  const source = "**19. Governing Law.** This Agreement is governed by the laws of the State of "
    + "Calloway. **20. Notices.** All notices must be delivered in writing to the address below.";
  const result = checkPlantedFeature(feature, source);
  assert.equal(result.status, "WARN");
  assert.ok(result.missing.length > result.matched.length);
});

test("checkPlantedFeature: removing the drafted section flips a PASS back to WARN", () => {
  const feature = "consequential-damages waiver-only clause and governing-law section";
  const withSection = "**6.2 Waiver of Consequential Damages.** Neither Party will be liable. "
    + "**19. Governing Law.** Governed by the laws of the State of Calloway. This clause is a waiver, only.";
  const withoutSection = "**6.1 Limitation of Liability.** Each Party's aggregate liability is capped. "
    + "**19. Venue.** Suit must be brought in the courts identified below.";
  assert.equal(checkPlantedFeature(feature, withSection).status, "PASS");
  assert.equal(checkPlantedFeature(feature, withoutSection).status, "WARN");
});

test("checkPlantedFeature: a compound does not match when its words are merely both present apart", () => {
  // "consequential" and "damages" both appear, but never as the phrase the spec
  // names -- compound matching must stay phrase-shaped, not bag-of-words.
  const source = "The Party will not be liable for indirect, incidental, special, consequential, "
    + "exemplary, or punitive damages of any kind.";
  const result = checkPlantedFeature("consequential-damages waiver-only", source);
  assert.ok(result.missing.map((t) => t.toLowerCase()).includes("consequential-damages"));
});

test("checkPlantedFeature: the separator wildcard does not bridge unrelated adjacent words", () => {
  // "M-ARR" must not be satisfied by "...system arrangement..." -- the compound
  // has to begin where a word begins.
  const result = checkPlantedFeature("2M-ARR counterparty threshold", "The system arrangement is unchanged.");
  assert.ok(result.missing.map((t) => t.toLowerCase()).includes("m-arr"));
});

// --- spec-narration stopwords ----------------------------------------------
// Some planted_feature words describe the artifact for the spec reader rather
// than naming anything a drafted document could contain. They are unfindable by
// construction, so counting them as evidence only manufactures WARNs.

test("significantTokens drops spec-narration words that name the artifact, not its content", () => {
  const tokens = significantTokens(
    "liquidated-damages red-flag variant, unilateral vs mutual variants, deliberately distinct, for tiering exercises"
  ).map((t) => t.toLowerCase());
  for (const w of ["variant", "variants", "deliberately", "exercises"]) {
    assert.ok(!tokens.includes(w), `expected "${w}" to be dropped as spec narration`);
  }
  // the substantive vocabulary in the same string must survive
  assert.ok(tokens.includes("liquidated-damages"));
  assert.ok(tokens.includes("mutual"));
  assert.ok(tokens.includes("tiering"));
});

test("checkPlantedFeature: a feature whose only misses are narration words now PASSes", () => {
  const feature = "24-month non-solicitation option, unilateral vs mutual variants";
  const source = "## 7. Non-Solicitation\n\nFor twenty-four (24) months after the Effective Date, "
    + "neither Party will solicit the other's employees. The obligations in this Section are mutual.";
  assert.equal(checkPlantedFeature(feature, source).status, "PASS");
});

test("significantTokens keeps 'exercise' -- the legal verb is real document vocabulary", () => {
  // artifacts/LGL-03/commercial-lease.md:43 "for which Tenant properly exercises
  // a Renewal Option". Only the lesson-design plural is narration; the singular
  // verb stays significant so this scope stays deliberately narrow.
  const tokens = significantTokens("tenant exercise of the renewal option").map((t) => t.toLowerCase());
  assert.ok(tokens.includes("exercise"));
});

test("checkPlantedFeature: an all-narration feature WARNs rather than passing vacuously", () => {
  // Every token stopworded must leave nothing to check -- it must never become
  // a free PASS just because the denominator emptied out.
  const result = checkPlantedFeature("deliberately, variant variants exercises", "Utterly unrelated text.");
  assert.equal(result.status, "WARN");
  assert.equal(result.matched.length, 0);
});

test("checkPlantedFeature: dropping narration words does not rescue a genuinely absent feature", () => {
  const feature = "deliberately staged three-tier arbitration escalation ladder variant";
  const source = "**19. Governing Law.** This Agreement is governed by the laws of the State of "
    + "Calloway. **20. Notices.** All notices must be delivered in writing.";
  const result = checkPlantedFeature(feature, source);
  assert.equal(result.status, "WARN");
  assert.ok(result.missing.length > 0);
});

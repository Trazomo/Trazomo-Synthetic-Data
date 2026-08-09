import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkPlantedFeature, significantTokens, validateDrafted } from "../../datagen/src/validate.js";

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
    "9.1 Data  Processing addendum. 19. Governing\tLaw of this clause.",
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

test("checkPlantedFeature: a compound must end on a word boundary, not a word's prefix", () => {
  // Both ends are anchored. The left anchor alone was not enough: "M-ARR"
  // against "system arrangement" passes for the wrong reason (the "m" of
  // "system" is preceded by a letter), so these fixtures put the first part at
  // a real word start and let only the RIGHT anchor do the work.
  const mArr = checkPlantedFeature(
    "2M-ARR counterparty threshold",
    "The M arrangement with the counterparty crosses the threshold."
  );
  assert.ok(mArr.missing.map((t) => t.toLowerCase()).includes("m-arr"));

  const optOut = checkPlantedFeature(
    "auto-renewal opt-out window",
    "Customer may opt outsourcing of support at renewal."
  );
  assert.ok(optOut.missing.map((t) => t.toLowerCase()).includes("opt-out"));
});

// --- the compound path's three input shapes --------------------------------
// The tokenizer emits three kinds of token containing a separator: alpha
// hyphen compounds (the intended case), possessives, and numbers with commas
// or decimal points. Only the first is a phrase.

test("checkPlantedFeature: a possessive is a suffix, not a phrase separator", () => {
  // "requester's" must not degrade to "requester + any s-word". All three
  // tokens below already sit in specs/artifact-specs.yaml awaiting their
  // artifacts, so this is latent surface, not a hypothetical.
  const cases = [
    ["requester's approval record", "The requester shall submit the form.", "requester's"],
    ["someone else's matter file", "Anyone else shall be excluded.", "else's"],
    ["retro's action items", "The retro session covers this.", "retro's"],
    ["counterparty's obligations survive", "The counterparty shall ensure its obligations survive.", "counterparty's"],
  ];
  for (const [feature, source, token] of cases) {
    const result = checkPlantedFeature(feature, source);
    assert.ok(
      result.missing.map((t) => t.toLowerCase()).includes(token),
      `expected "${token}" to stay missing against: ${source}`
    );
  }
});

test("checkPlantedFeature: a possessive still matches when the source really writes it", () => {
  const result = checkPlantedFeature("requester's approval record", "The requester's approval record is retained.");
  assert.ok(result.matched.map((t) => t.toLowerCase()).includes("requester's"));
});

test("checkPlantedFeature: numeric tokens never take the phrase path", () => {
  // Commas and decimal points are not phrase separators. The pipe-table case is
  // the one that matters as the FIN/OPS tracks land.
  const cases = [
    ["0.5 coverage ratio", "| 0 | 5 |", "0.5"],
    ["50,000 per breach", "Section 50. 000 series exhibits list the schedule.", "50,000"],
    ["4.60 patentability score", "Under Section 4. 60 days after filing, the score applies.", "4.60"],
  ];
  for (const [feature, source, token] of cases) {
    const result = checkPlantedFeature(feature, source);
    assert.ok(
      result.missing.includes(token),
      `expected "${token}" to stay missing against: ${source}`
    );
  }
});

test("checkPlantedFeature: numeric tokens still match when written literally", () => {
  const result = checkPlantedFeature("50,000 per breach", "Liquidated damages of $50,000 per breach apply.");
  assert.ok(result.matched.includes("50,000"));
});

// --- the separator run is bounded to intra-clause whitespace ---------------
// It may span spaces, tabs and hyphens, never a sentence end, a line break, a
// table cell wall or a list bullet -- structures that mean the two words are
// not one phrase.

test("checkPlantedFeature: a phrase cannot bridge a structural boundary", () => {
  const cases = [
    ["governing-law clause", "The procedure above is governing. Law of the State of Calloway is irrelevant.", "governing-law"],
    ["consequential-damages waiver", "The loss is consequential.\n\nDamages of any kind are capped.", "consequential-damages"],
    ["residual-knowledge clause", "| Residual | Knowledge |", "residual-knowledge"],
    ["waiver-only clause", "- Waiver\n- Only in writing", "waiver-only"],
    ["data-processing addendum", "The vendor handles data\nProcessing of the records.", "data-processing"],
  ];
  for (const [feature, source, token] of cases) {
    const result = checkPlantedFeature(feature, source);
    assert.ok(
      result.missing.map((t) => t.toLowerCase()).includes(token),
      `expected "${token}" to stay missing against: ${JSON.stringify(source)}`
    );
  }
});

test("validateDrafted: a phrase cannot bridge the seam between two source files", () => {
  // validate.js concatenates every .md under artifacts/<ID>/ with "\n\n", so
  // the text actually searched spans up to 10 separate documents. A token must
  // never be confirmed by the last word of one file plus the first word of the
  // next. 5 of the 11 drafted artifact sets are multi-file, so this is live
  // surface rather than theory.
  const root = mkdtempSync(join(tmpdir(), "datagen-seam-"));
  try {
    const dir = join(root, "artifacts", "SEAM-01");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "a-first.md"), "# Part One\n\nRelief may be equitable and consequential");
    writeFileSync(join(dir, "b-second.md"), "Damages Schedule\n\nAmounts are listed below.");
    const spec = { id: "SEAM-01", planted_features: ["consequential-damages waiver clause"] };
    const result = validateDrafted({ root, spec });
    assert.equal(result.sourceFiles.length, 2, "fixture must exercise the multi-file concatenation");
    assert.ok(
      result.results[0].missing.map((t) => t.toLowerCase()).includes("consequential-damages"),
      "a phrase must not span the file join"
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("checkPlantedFeature: the zero-token result carries a reason and no missing tokens", () => {
  // The CLI prints this case, so the shape is a contract, not an internal detail.
  // Built from long-standing stopwords only, deliberately not the spec-narration
  // ones, so that reverting the narration commit cannot break this test.
  const result = checkPlantedFeature("with from that this into", "Unrelated.");
  assert.equal(result.status, "WARN");
  assert.deepEqual(result.missing, []);
  assert.match(result.reason, /no checkable keywords/);
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

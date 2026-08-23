// Positive control for tests/helpers/capitalized-screen.js.
//
// The drafted screens assert that the helper returns nothing for the three D5
// documents. That is the shape a broken helper passes too: a version that
// always returned [] would green every document in the repository and say so
// confidently. So this file asserts the other half, on text it owns rather than
// on a shipped artifact, and it is deliberately not a screen over any document.
//
// The two cases are the two ways a name reaches a drafted artifact: written
// into a sentence, and dropped into a table cell where the opener concession
// used to wave it through.
import { test } from "node:test";
import assert from "node:assert/strict";
import { allowedFrom, unscreenedPhrases, unscreenedWords } from "../helpers/capitalized-screen.js";

const PROTAGONIST = "Atticus Dundee Inc.";

/** A stand-in pack: the protagonist, two held titles, one account name. */
const allowed = allowedFrom({
  derived: [PROTAGONIST, "Controller", "VP, Finance", "Accrued Payroll"],
  furniturePhrases: ["Close Runbook"],
  furnitureWords: ["Close", "Runbook", "The", "February"],
});

const clean = `# Close Runbook

Atticus Dundee Inc. reviews the schedule each period.

| Role | Standing |
|---|---|
| Controller | Prepares the pack |
| VP, Finance | Approves it |

The Controller signs before the VP, Finance does, and the February charge sits
in Accrued Payroll.
`;

test("the helper reports nothing for text whose every capital is accounted for", () => {
  // Without this the two cases below could pass on a helper that flags
  // everything, which is as useless as one that flags nothing.
  assert.deepEqual(unscreenedPhrases(clean, allowed), []);
  assert.deepEqual(unscreenedWords(clean, allowed), []);
});

test("a first name plus surname in a sentence is reported", () => {
  const doc = clean.replace("Atticus Dundee Inc. reviews", "Atticus Dundee Inc. and Harriet Okonkwo review");
  assert.deepEqual(unscreenedPhrases(doc, allowed), ["Harriet Okonkwo"]);
});

test("a first name plus surname in a table cell is reported, opener or not", () => {
  // The regression this exists for: a candidate that opens a table cell may
  // shed its first word, and shedding it unconditionally left the first token
  // of every cell unscreened.
  const doc = clean.replace("| Controller | Prepares the pack |", "| Harriet Okonkwo | Prepares the pack |");
  assert.deepEqual(unscreenedPhrases(doc, allowed), ["Harriet Okonkwo"]);
});

test("a role title nobody holds is reported when it opens a table cell", () => {
  const doc = clean.replace("| Controller | Prepares the pack |", "| Treasury Analyst | Prepares the pack |");
  assert.deepEqual(unscreenedPhrases(doc, allowed), ["Treasury Analyst"]);
});

test("a one-word name in mid-sentence is reported by the word screen", () => {
  // A phrase screen alone cannot see it, which is why both run.
  const doc = clean.replace("reviews the schedule", "reviews the Northwind schedule");
  assert.deepEqual(unscreenedPhrases(doc, allowed), []);
  assert.deepEqual(unscreenedWords(doc, allowed), ["Northwind"]);
});

test("the opener concession applies only to a word the pack accounts for", () => {
  // "The Controller" sheds an article that is listed furniture. "Harriet
  // Controller" sheds nothing, because "Harriet" is on no list, so the whole
  // phrase is reported rather than reduced to a title.
  assert.deepEqual(unscreenedPhrases("The Controller signs it.", allowed), []);
  assert.deepEqual(unscreenedPhrases("Harriet Controller signs it.", allowed), ["Harriet Controller"]);
});

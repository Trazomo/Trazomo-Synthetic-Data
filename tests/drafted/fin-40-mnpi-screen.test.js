// FIN-40 mnpi-flagged-draft: the structural screen over a drafted-frozen
// document. `validate FIN-40` already checks that the planted features are
// present; this checks what must be absent, and that the two figures on its face
// are the ones the shipped ledger actually reports.
//
// The real-name screen is structural rather than a web pass: every capitalized
// phrase and every capitalized word in mid-sentence has to be the canon
// protagonist, a role title an active CORE-04 employee holds, or listed document
// furniture. A drafted artifact is where a new person or company name would slip
// into the universe unnoticed, because no generator is there to refuse it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { financeRoster } from "../../datagen/src/generators/finance-roles.js";
import { buildTrialBalance } from "../../datagen/src/generators/fin-05-gl-trial-balance.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
const roster = financeRoster();

const spec = specs.byId.get("FIN-40");
const doc = readFileSync(join(REPO_ROOT, "artifacts", spec.id, `${spec.name}.md`), "utf8");
const lines = doc.split("\n");

const PROTAGONIST = "Atticus Dundee Inc.";
const CLASSIFICATION = "RESTRICTED - MATERIAL NON-PUBLIC INFORMATION";

// Document furniture: headings, the classification banner and ordinary calendar
// and English vocabulary that happens to be capitalized. Anything not here, and
// not a canon name or a roster role title, fails the screen.
const STRUCTURAL_PHRASES = new Set([
  "MATERIAL NON",
  "PUBLIC INFORMATION",
  "Board Pack Excerpt",
  "Finance Review",
  "Draft, Unreleased",
  "Board of Directors",
]);
const STRUCTURAL_WORDS = new Set([
  "RESTRICTED", "MATERIAL", "NON-PUBLIC", "INFORMATION",
  "Board", "Directors", "Pack", "Excerpt", "Review", "Draft", "Unreleased",
  "AI", "Q1",
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]);

const activeRoleTitles = new Set(
  roster.filter((r) => r.employment_status === "active").map((r) => r.role_title)
);
const roleTitleWords = new Set(
  [...activeRoleTitles].flatMap((title) => title.split(/[\s,]+/).filter(Boolean))
);
const protagonistWords = new Set(PROTAGONIST.split(" "));

const centsOf = (value) => Math.round(Number(value || 0) * 100);

/** Total revenue net of contra, and the net loss, recomputed off FIN-05. */
function trialBalanceResult() {
  const rows = buildTrialBalance().rows;
  const sum = (type, column) => rows
    .filter((r) => r.type === type)
    .reduce((total, r) => total + centsOf(r[column]), 0);
  const revenueCents = sum("revenue", "ending_credit") - sum("revenue", "ending_debit");
  const expenseCents = sum("expense", "ending_debit") - sum("expense", "ending_credit");
  return { revenueCents, netLossCents: expenseCents - revenueCents };
}

test("FIN-40: the classification opens the document and closes it", () => {
  const firstContentLine = lines.find((l) => l.trim() !== "");
  assert.ok(firstContentLine.includes(CLASSIFICATION), "the first line must carry the classification");
  const tail = lines.slice(-8).join("\n");
  assert.ok(tail.includes(CLASSIFICATION), "the classification must be repeated at the foot");
  assert.equal(spec.generation, "drafted-frozen");
});

test("FIN-40: both figures on its face are the FIN-05 subtotals they name, rounded", () => {
  const { revenueCents, netLossCents } = trialBalanceResult();
  assert.ok(netLossCents > 0, "the pack describes a loss-making quarter");
  const millions = (cents) => (cents / 100 / 1e6).toFixed(1);
  assert.ok(
    doc.includes(`including interest income and net of discounts and credits, is approximately ${millions(revenueCents)} million`),
    `the revenue sentence does not carry FIN-05's total revenue of ${millions(revenueCents)} million`
  );
  assert.ok(
    doc.includes(`net loss of approximately ${millions(netLossCents)} million`),
    `the loss sentence does not carry FIN-05's net loss of ${millions(netLossCents)} million`
  );
  // Every million-figure in the document is one of those two, so a third figure
  // cannot appear unsourced.
  const quoted = (doc.match(/approximately (\d+\.\d) million/g) ?? []).map((m) => m.split(" ")[1]);
  assert.deepEqual(new Set(quoted), new Set([millions(revenueCents), millions(netLossCents)]));
});

test("FIN-40: every capitalized phrase is the protagonist, a roster role title, or listed furniture", () => {
  const phrases = new Set(doc.match(/\b[A-Z][a-zA-Z]+(?:[ ,]+[A-Z][a-zA-Z.]+)+/g) ?? []);
  for (const phrase of phrases) {
    const ok = phrase === PROTAGONIST || activeRoleTitles.has(phrase) || STRUCTURAL_PHRASES.has(phrase);
    assert.ok(ok, `unscreened capitalized phrase "${phrase}" in ${spec.name}.md`);
  }
});

test("FIN-40: no single capitalized word in mid-sentence escapes the screen either", () => {
  // A two-word screen alone lets a one-word name ("Northwind", "Okafor") through.
  // Sentence-initial words are ordinary English, so only mid-sentence capitals
  // are candidates for a proper noun.
  const unscreened = new Set();
  const token = /[A-Za-z][A-Za-z.'-]*/g;
  let match;
  while ((match = token.exec(doc)) !== null) {
    const word = match[0];
    if (!/^[A-Z]/.test(word)) continue;
    let i = match.index - 1;
    while (i >= 0 && (doc[i] === " " || doc[i] === "*" || doc[i] === '"')) i -= 1;
    const previous = i < 0 ? "\n" : doc[i];
    if ("\n.!?:|#->*(".includes(previous)) continue; // sentence or cell or bullet start
    if (protagonistWords.has(word) || roleTitleWords.has(word) || STRUCTURAL_WORDS.has(word)) continue;
    unscreened.add(word);
  }
  assert.deepEqual([...unscreened], [], `unscreened capitalized word(s) in ${spec.name}.md`);
});

test("FIN-40: no other canon company is named, and no CORE-04 person is named", () => {
  for (const company of canon.values()) {
    if (company.name === PROTAGONIST) continue;
    assert.ok(!doc.includes(company.name), `${spec.name}.md names canon company "${company.name}"`);
  }
  for (const person of roster) {
    const full = `${person.first_name} ${person.last_name}`;
    assert.ok(!doc.includes(full), `${spec.name}.md names ${person.employee_id}`);
    assert.ok(!doc.includes(person.employee_id), `${spec.name}.md cites ${person.employee_id}`);
  }
});

test("FIN-40: it is signed by title, with no signature line and no contact details", () => {
  const signatureLines = lines.filter((l) => /^(Prepared|Reviewed|Approved|Issued) by:/.test(l.trim()));
  assert.ok(signatureLines.length >= 2, "expected a prepared-by and a reviewed-by line");
  const financeTitles = new Set(
    roster.filter((r) => r.employment_status === "active" && r.department === "Finance").map((r) => r.role_title)
  );
  for (const line of signatureLines) {
    const title = line.trim().split(": ")[1];
    assert.ok(financeTitles.has(title), `"${title}" is not an active CORE-04 Finance role title`);
  }
  assert.ok(!/\/s\//.test(doc), "a drafted board pack carries no signature block");
  assert.ok(!/^\s*(Name|Signature|Signed)\s*:/m.test(doc), "no name or signature field");
  assert.ok(!/[\w.-]+@[\w.-]+\.\w+/.test(doc), "no contact details in a restricted document");
});

test("FIN-40: no em dashes, the house rule for authored text in this repo", () => {
  assert.ok(!doc.includes("—"), "em dash in FIN-40");
});

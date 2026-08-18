// FIN-40 mnpi-flagged-draft: the structural screen over a drafted-frozen
// document. `validate FIN-40` already checks that the planted features are
// present; this checks what must be absent.
//
// The real-name screen is structural rather than a web pass: every capitalised
// phrase in the document has to be the canon protagonist, a role title an active
// CORE-04 employee holds, or a listed piece of document furniture. A drafted
// artifact is where a new person or company name would slip into the universe
// unnoticed, because no generator is there to refuse it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { financeRoster } from "../../datagen/src/generators/finance-roles.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
const roster = financeRoster();

const spec = specs.byId.get("FIN-40");
const doc = readFileSync(join(REPO_ROOT, "artifacts", spec.id, `${spec.name}.md`), "utf8");
const lines = doc.split("\n");

const PROTAGONIST = "Atticus Dundee Inc.";
const CLASSIFICATION = "RESTRICTED - MATERIAL NON-PUBLIC INFORMATION";

// Document furniture: headings and the classification banner, which the phrase
// scanner sees as capitalised phrases. Anything not on this list, and not a
// canon name or a roster role title, fails the screen.
const STRUCTURAL_ALLOWLIST = new Set([
  "MATERIAL NON",
  "PUBLIC INFORMATION",
  "Board Pack Excerpt",
  "Finance Review",
  "Draft, Unreleased",
  "Board of Directors",
]);

test("FIN-40: the classification opens the document and closes it", () => {
  const firstContentLine = lines.find((l) => l.trim() !== "");
  assert.ok(firstContentLine.includes(CLASSIFICATION), "the first line must carry the classification");
  const tail = lines.slice(-8).join("\n");
  assert.ok(tail.includes(CLASSIFICATION), "the classification must be repeated at the foot");
  assert.equal(spec.generation, "drafted-frozen");
});

test("FIN-40: every capitalised phrase is the protagonist, a roster role title, or listed furniture", () => {
  const roleTitles = new Set(roster.filter((r) => r.employment_status === "active").map((r) => r.role_title));
  const phrases = new Set(doc.match(/\b[A-Z][a-zA-Z]+(?:[ ,]+[A-Z][a-zA-Z.]+)+/g) ?? []);
  for (const phrase of phrases) {
    const ok = phrase === PROTAGONIST || roleTitles.has(phrase) || STRUCTURAL_ALLOWLIST.has(phrase);
    assert.ok(ok, `unscreened capitalised phrase "${phrase}" in ${spec.name}.md`);
  }
});

test("FIN-40: no other canon company is named, and no CORE-04 person is named", () => {
  for (const company of canon.values()) {
    if (company.name === PROTAGONIST) continue;
    assert.ok(!doc.includes(company.name), `${spec.name}.md names canon company "${company.name}"`);
  }
  for (const person of roster) {
    const full = `${person.first_name} ${person.last_name}`;
    assert.ok(!doc.includes(full), `${spec.name}.md names ${person.employee_id}`);
  }
});

test("FIN-40: it is signed by title, with no signature line and no contact details", () => {
  const signatureLines = lines.filter((l) => /^(Prepared|Reviewed|Approved|Issued) by:/.test(l.trim()));
  assert.ok(signatureLines.length >= 2, "expected a prepared-by and a reviewed-by line");
  const roleTitles = new Set(
    roster.filter((r) => r.employment_status === "active" && r.department === "Finance").map((r) => r.role_title)
  );
  for (const line of signatureLines) {
    const title = line.trim().split(": ")[1];
    assert.ok(roleTitles.has(title), `"${title}" is not an active CORE-04 Finance role title`);
  }
  assert.ok(!/\/s\//.test(doc), "a drafted board pack carries no signature block");
  assert.ok(!/^\s*(Name|Signature|Signed)\s*:/m.test(doc), "no name or signature field");
  assert.ok(!/[\w.-]+@[\w.-]+\.\w+/.test(doc), "no contact details in a restricted document");
});

test("FIN-40: no em dashes, the house rule for authored text in this repo", () => {
  assert.ok(!doc.includes("—"), "em dash in FIN-40");
});

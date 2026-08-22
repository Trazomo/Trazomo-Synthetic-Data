// FIN-28 prior-period-footnotes: the tie-out that stops the drafting exemplar
// from quietly contradicting the trend the same pack ships.
//
// Shipped as a skeleton by D5a foundations: the tests below the divider were
// marked todo while the document did not exist. D5b authored FIN-28 after
// FIN-33 and deleted the markers in the same commit as the prose.
//
// The mutation this file has to catch: a figure typed rather than derived,
// which is exactly how a prose artifact drifts from the pack. FIN-28 is built
// after FIN-33 for this reason, and every money amount it states has to be a
// FIN-33 2026-02 actual or a stated FIN-05 balance.
//
// The structural screens (no person name, no em dash) live in
// tests/drafted/fin-d5-drafted-screen.test.js beside FIN-21's and FIN-30's.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));

/** The five footnotes, and the FIN-17 category each declares. The design target
 *  D5b authors against, and the fallback while the document does not exist. */
const FOOTNOTE_CATEGORIES = ["revenue", "accruals", "accruals", "", ""];

const DOCUMENT_PATH = join(REPO_ROOT, "artifacts", "FIN-28", "prior-period-footnotes.md");

function document() {
  assert.ok(existsSync(DOCUMENT_PATH), `FIN-28 is not authored yet: ${DOCUMENT_PATH} does not exist`);
  return readFileSync(DOCUMENT_PATH, "utf8");
}

const closeTasks = () => csvTable(
  fileByPath(generateArtifact(specs.byId.get("FIN-17"), canon), "close-checklist.csv").content
).rows;

/** The footnote headings, which are where a footnote declares its support. */
const headingLines = (text) => text.split("\n").filter((l) => /^#{2,3}\s/.test(l));

/**
 * The FIN-17 category each footnote declares, read out of the document's own
 * headings once the document exists and falling back to the design constant
 * until D5b authors it. Counting the constant on its own is a tautology, so the
 * contrast below reads the file the moment there is a file to read.
 *
 * Membership, never enumeration: a heading declares a category when it names
 * one of FIN-17's own `category` values, so the join key is the checklist's
 * vocabulary rather than a list this test holds. D5b therefore has to write the
 * category word itself into the heading ("accruals", not "accrued").
 */
function declaredCategories() {
  if (!existsSync(DOCUMENT_PATH)) return FOOTNOTE_CATEGORIES;
  const categories = [...new Set(closeTasks().map((r) => r.category))].filter(Boolean);
  return headingLines(readFileSync(DOCUMENT_PATH, "utf8")).map(
    (line) => categories.find((c) => new RegExp(`\\b${c}\\b`, "i").test(line)) ?? ""
  );
}

// --------------------------------------------------------- green before bytes

test("FIN-28 V26: the category populations that hold the roll-forward plant at one instance", () => {
  const tasks = closeTasks();
  const inCategory = (category) => tasks.filter((r) => r.category === category);
  // The revenue category holds exactly one task and it is not complete, which
  // is what selects footnote 1 and nothing else.
  const revenue = inCategory("revenue");
  assert.equal(revenue.length, 1);
  assert.notEqual(revenue[0].status, "complete");
  assert.equal(revenue[0].account_code, "", "a category key is forced: the task carries no account code");
  // The accruals category is entirely complete, so the two footnotes that
  // declare it are never selected.
  assert.equal(inCategory("accruals").length, 3);
  assert.deepEqual([...new Set(inCategory("accruals").map((r) => r.status))], ["complete"]);
  // Plan U20: the payables category holds a task that is not complete, so a
  // trade-payables footnote would make this a two-instance plant. FIN-28
  // carries none, which is what buys the cardinality.
  assert.equal(inCategory("payables").filter((r) => r.status !== "complete").length, 1);
  // Three of the five footnotes declare a category at all: the qualifier-free
  // count a module block has to state beside the 1. Read out of the document's
  // own headings once the document exists, and out of the design constant until
  // then, which is the only reading available while FIN-28 is a D5b todo.
  const declared = declaredCategories();
  assert.equal(declared.length, 5, "the footnote count is a design constraint, not a range");
  assert.equal(declared.filter(Boolean).length, 3, `declared categories: ${declared.join(", ")}`);
  if (existsSync(DOCUMENT_PATH)) {
    assert.deepEqual(declared, FOOTNOTE_CATEGORIES, "a heading no longer declares the category the plan fixes");
  }
});

test("FIN-28: the spec carries the pairing the document must not state outright", () => {
  const features = specs.byId.get("FIN-28").planted_features;
  assert.ok(
    features.some((f) => f.includes("drafting-over-unclosed-item guardrail")),
    "the shipped pairing feature was reworded, which stales any allowlist entry quoting it"
  );
  assert.ok(
    features.some((f) => f.includes("five footnotes")),
    "the footnote count is no longer a stated design constraint, and V26's cardinality rests on it"
  );
});

// ------------------------------------------------------------- the document

test("FIN-28: exactly five footnotes, three of which declare a FIN-17 category", () => {
  const headings = headingLines(document());
  assert.equal(headings.length, 5, "the footnote count is a design constraint, not a range");
  // The order the plan fixes: revenue, accruals, accruals, none, none. There is
  // no trade-payables footnote, and that omission is what holds V26 at one.
  assert.deepEqual(declaredCategories(), FOOTNOTE_CATEGORIES);
});

test("FIN-28 V26: exactly one footnote declares a category holding a task that is not complete", () => {
  const text = document();
  const tasks = closeTasks();
  const openCategories = new Set(tasks.filter((r) => r.status !== "complete").map((r) => r.category));
  // Derived from the document's own headings, so a heading edit fails here.
  const declared = declaredCategories().filter(Boolean);
  assert.equal(declared.length, 3, "the qualifier-free count: the footnotes that declare a category at all");
  const blocked = declared.filter((category) => openCategories.has(category));
  assert.deepEqual(blocked, ["revenue"]);
  assert.ok(text.length > 0);
});

test("FIN-28 T-U1: every money amount equals a FIN-33 2026-02 actual or a stated FIN-05 balance", () => {
  const text = document();
  const trend = csvTable(
    fileByPath(generateArtifact(specs.byId.get("FIN-33"), canon), "actuals-24mo.csv").content
  ).rows.filter((r) => r.period === "2026-02");
  const february = new Set(trend.map((r) => r.actual_amount));
  const amounts = [...text.matchAll(/\$([\d,]+\.\d{2})/g)].map((m) => m[1].replace(/,/g, ""));
  assert.ok(amounts.length > 0, "a disclosure exemplar with no figures teaches the shape and not the discipline");
  for (const amount of amounts) {
    assert.ok(february.has(amount), `${amount} is in no FIN-33 February row`);
  }
  // The accepted set stays FIN-33's February column alone, ruled 2026-08-22.
  // The spec allows "or a stated FIN-05 derived balance", but FIN-05 is the
  // pre-close trial balance at 2026-03-31 and this is the February set: a
  // FIN-05 balance stated here would be a March figure in a February footnote,
  // which is a worse defect than the missing one. February has no balance
  // source in the pack, so FIN-28 states no balance-sheet figure at all and
  // describes the deferred revenue, accrued and prepaid balances in words. A
  // later artifact that does need a balance widens this by recomputing it from
  // FIN-05 here, never by adding the figure to a list.
});

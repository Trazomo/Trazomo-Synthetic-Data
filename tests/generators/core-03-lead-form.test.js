// CORE-03: the inbound lead-form submission view (revenue cluster 1), plus a
// regression ring around the four plants that were already frozen at v1.5.0.
//
// Everything here is re-derived from the EMITTED bytes. The ICP rule is
// implemented a second time in this file, from the plan's own words, and the
// generator's classifier is never imported: a test that imports the rule it is
// checking agrees with the generator by construction and can never disagree
// with it. Same reason nothing below names a submission_id: the plants are
// selected by their published rule and counted, so a reroll that moves a plant
// to another row keeps passing and a reroll that loses one fails by name.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";
import { buildRoster } from "../../datagen/src/generators/core-04-people-roster.js";
import { createRng } from "../../datagen/src/seed.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));

/** The lead-form view's header, in order. Written out rather than imported. */
const LEAD_FORM_COLUMNS = [
  "submission_id", "submitted_at", "first_name", "last_name", "email",
  "company_name", "industry", "employee_count", "form_source", "pages_viewed",
  "marketing_consent",
];

/** The seed clock (dates.js#ANCHOR_DATE) and the window it closes. */
const WINDOW_START = "2026-03-02";
const WINDOW_END = "2026-03-16";

/**
 * The published firmographic rule, re-implemented here from the cluster-1 data
 * plan's words rather than imported from the generator. Three independent
 * predicates, so "every row lands in exactly one class" is a real assertion and
 * not a property of a function that returns one string.
 */
const ICP_INDUSTRIES = [
  "Software", "Retail", "Logistics", "Healthcare",
  "Manufacturing", "Financial Services", "Media", "Education",
];

function icpClasses(row) {
  const hasCount = row.employee_count !== "";
  const count = hasCount ? Number(row.employee_count) : null;
  const hasIndustry = row.industry !== "";
  const inIcp = hasIndustry && ICP_INDUSTRIES.includes(row.industry);
  const clearNonFit = (hasCount && count < 25) || (hasIndustry && !inIcp);
  const clearFit = !clearNonFit && hasCount && count >= 100 && inIcp;
  return { "clear-fit": clearFit, "clear-non-fit": clearNonFit, ambiguous: !clearNonFit && !clearFit };
}

function icpClass(row) {
  return Object.entries(icpClasses(row)).find(([, isMember]) => isMember)[0];
}

const localPart = (email) => email.slice(0, email.indexOf("@"));
const domainPart = (email) => email.slice(email.indexOf("@") + 1);

let cached = null;
function crm() {
  if (cached) return cached;
  const files = generateArtifact(specs.byId.get("CORE-03"), canon);
  const table = (name) => csvTable(fileByPath(files, name).content);
  cached = {
    files,
    accounts: table("accounts.csv").rows,
    contacts: table("contacts.csv").rows,
    opportunities: table("opportunities.csv").rows,
    stageHistory: table("stage_history.csv").rows,
    leads: table("leads.csv").rows,
    submissionsTable: table("lead_form_submissions.csv"),
    bundle: JSON.parse(fileByPath(files, "crm-seed.json").content),
  };
  cached.submissions = cached.submissionsTable.rows;
  return cached;
}

// -------------------------------------------------------------- the new view

test("CORE-03 lead-form view: the header is the eleven published columns, in order", () => {
  assert.deepEqual(crm().submissionsTable.cols, LEAD_FORM_COLUMNS);
  assert.equal(crm().submissions.length, 12);
  // submission_id is sequential in file order, so a consumer can page the file
  // without re-sorting it.
  assert.deepEqual(
    crm().submissions.map((r) => r.submission_id),
    Array.from({ length: 12 }, (_, i) => `sub-${String(i + 1).padStart(4, "0")}`)
  );
});

test("REV-C1-T1: all six data files' row counts equal their crm-seed.json counts entry", () => {
  const { bundle, accounts, contacts, opportunities, stageHistory, leads, submissions } = crm();
  assert.deepEqual(bundle.counts, {
    accounts: accounts.length,
    contacts: contacts.length,
    opportunities: opportunities.length,
    stage_history: stageHistory.length,
    leads: leads.length,
    lead_form_submissions: submissions.length,
  });
  // Six entries, not five: a bundle that forgot the new view would still match
  // the five above.
  assert.equal(Object.keys(bundle.counts).length, 6);
  assert.equal(bundle.lead_form_submissions.length, submissions.length);
  // U5: universe_version is the generator's own pre-MANIFEST constant and this
  // cluster deliberately leaves it alone.
  assert.equal(bundle.universe_version, "0.2.0");
});

test("REV-C1-T9: every submission is dated inside the seed clock's window", () => {
  for (const row of crm().submissions) {
    assert.ok(
      row.submitted_at >= WINDOW_START && row.submitted_at <= WINDOW_END,
      `${row.submission_id} is dated ${row.submitted_at}, outside [${WINDOW_START}, ${WINDOW_END}]`
    );
    assert.match(row.submitted_at, /^\d{4}-\d{2}-\d{2}$/);
  }
  // Nothing may postdate the dataset's own "today", which is what makes the
  // window's upper bound load-bearing rather than decorative.
  assert.equal(crm().submissions.filter((r) => r.submitted_at > WINDOW_END).length, 0);
  // The file is ordered by submitted_at, so a consumer reading it as a stream
  // sees the batch in the order it arrived.
  const dates = crm().submissions.map((r) => r.submitted_at);
  assert.deepEqual(dates, [...dates].sort());
});

test("REV-C1-T6: one consent-false row, one local-part-only email match, zero byte-equal matches", () => {
  const { submissions, contacts } = crm();
  const contactEmails = new Set(contacts.map((c) => c.email));
  const contactLocalParts = new Set(contacts.map((c) => localPart(c.email)));

  assert.equal(submissions.filter((r) => r.marketing_consent === "false").length, 1);
  // Both cardinalities: consent is a two-value column, so the other eleven rows
  // carry true and no third value ships.
  assert.equal(submissions.filter((r) => r.marketing_consent === "true").length, 11);

  assert.equal(submissions.filter((r) => contactEmails.has(r.email)).length, 0, "a submission email is byte-equal to a contact email");
  const localMatches = submissions.filter((r) => contactLocalParts.has(localPart(r.email)));
  assert.equal(localMatches.length, 1, "expected exactly one local-part-only match against contacts.csv");

  // The match is a partial one by construction: same local part, different
  // domain, which is what makes it a candidate for human confirmation rather
  // than a resolution.
  const twin = contacts.filter((c) => localPart(c.email) === localPart(localMatches[0].email));
  assert.ok(twin.length >= 1);
  for (const contact of twin) {
    assert.notEqual(domainPart(contact.email), domainPart(localMatches[0].email));
  }

  // Every email follows the one convention this dataset has, so a module can
  // derive the domain from the company name rather than reading it off the row.
  for (const row of submissions) {
    const expected = `${row.first_name.toLowerCase()}.${row.last_name.toLowerCase()}`
      + `@${row.company_name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.example`;
    assert.equal(row.email, expected, `${row.submission_id}'s email does not follow the contact-email convention`);
  }
});

test("REV-C1-T10: the ICP rule partitions the twelve submissions into three non-empty classes", () => {
  const { submissions, accounts } = crm();

  // The rule's industry set is the set accounts.csv actually uses, re-derived
  // here rather than trusted: a ninth industry in the accounts file would make
  // the published rule wrong, and this is where that shows up.
  const accountIndustries = new Set(
    accounts.flatMap((a) => [a.industry, a.industry_source_crm, a.industry_source_marketing]).filter((i) => i !== "")
  );
  assert.deepEqual([...accountIndustries].sort(), [...ICP_INDUSTRIES].sort());

  const tally = { "clear-fit": 0, "clear-non-fit": 0, ambiguous: 0 };
  for (const row of submissions) {
    const memberships = Object.values(icpClasses(row)).filter(Boolean);
    assert.equal(memberships.length, 1, `${row.submission_id} does not land in exactly one ICP class`);
    tally[icpClass(row)] += 1;
  }
  for (const [name, count] of Object.entries(tally)) {
    assert.ok(count > 0, `the ${name} class is empty`);
  }
  assert.equal(tally["clear-fit"] + tally["clear-non-fit"] + tally.ambiguous, 12);
  // The design spread (cluster-1 plan, U2), so a row that quietly changes class
  // fails here rather than moving a count a module brief already cites.
  assert.deepEqual(tally, { "clear-fit": 5, "clear-non-fit": 3, ambiguous: 4 });

  // Both clauses of the clear-non-fit rule do real work: at least one row is
  // excluded by headcount and at least one by industry, so neither half of the
  // published rule is dead text a brief could drop.
  const nonFit = submissions.filter((r) => icpClasses(r)["clear-non-fit"]);
  assert.ok(nonFit.some((r) => r.employee_count !== "" && Number(r.employee_count) < 25), "no row is excluded by headcount");
  assert.ok(nonFit.some((r) => r.industry !== "" && !ICP_INDUSTRIES.includes(r.industry)), "no row is excluded by industry");
  // And the ambiguous class is ambiguous for more than one reason.
  const ambiguous = submissions.filter((r) => icpClasses(r).ambiguous);
  assert.ok(ambiguous.some((r) => r.industry === "" || r.employee_count === ""), "no row is ambiguous through a blank field");
  assert.ok(
    ambiguous.some((r) => r.employee_count !== "" && Number(r.employee_count) >= 25 && Number(r.employee_count) < 100),
    "no row is ambiguous through the 25..99 band"
  );
});

test("REV-C1-T10: the partial-match row is ambiguous and the enrichment row is a clear-fit target account", () => {
  const { submissions, contacts, accounts } = crm();
  const contactLocalParts = new Set(contacts.map((c) => localPart(c.email)));
  const accountByName = new Map(accounts.map((a) => [a.name, a]));
  const accountNamesLower = new Set(accounts.map((a) => a.name.toLowerCase()));

  // The C1-P6 row, selected by its rule rather than named.
  const partial = submissions.filter((r) => contactLocalParts.has(localPart(r.email)));
  assert.equal(partial.length, 1);
  assert.equal(icpClass(partial[0]), "ambiguous", "the local-part-match row must route on the ambiguous branch");

  // The C1-P9 row, selected by its rule rather than named.
  const resolving = submissions.filter((r) => accountByName.has(r.company_name));
  assert.equal(resolving.length, 1, "exactly one submission resolves to an existing account");
  assert.equal(icpClass(resolving[0]), "clear-fit");
  assert.equal(accountByName.get(resolving[0].company_name).status, "target");

  // No other submission's company name matches an account name even loosely, so
  // a brief cannot claim a second resolvable company.
  const looseMatches = submissions.filter((r) => accountNamesLower.has(r.company_name.toLowerCase()));
  assert.equal(looseMatches.length, 1);
  assert.equal(looseMatches[0].submission_id, resolving[0].submission_id);

  // The three plants sit on three different rows: the consent-false row is
  // neither the partial-match row nor the enrichment row.
  const consentFalse = submissions.filter((r) => r.marketing_consent === "false");
  const plantIds = new Set([partial[0].submission_id, resolving[0].submission_id, consentFalse[0].submission_id]);
  assert.equal(plantIds.size, 3);
  assert.equal(icpClass(consentFalse[0]), "clear-fit", "the consent-false row must be a good fit the router still holds back");
  // And the enrichment row's email collides with no contact at either level.
  assert.ok(!contactLocalParts.has(localPart(resolving[0].email)));
  assert.equal(contacts.filter((c) => c.email === resolving[0].email).length, 0);
});

test("CORE-03 lead-form view: form_source and pages_viewed are the behavioral inputs module 15 scores", () => {
  const { submissions } = crm();
  const sources = new Set(submissions.map((r) => r.form_source));
  for (const source of sources) {
    assert.ok(["contact-us", "pricing-page", "demo-request"].includes(source), `unexpected form_source ${source}`);
  }
  assert.ok(sources.size >= 2, "one form_source value gives a scorer nothing to weigh");
  for (const row of submissions) {
    assert.match(row.pages_viewed, /^[1-9]\d*$/, `${row.submission_id} pages_viewed is not a positive integer`);
    assert.ok(Number(row.pages_viewed) <= 12);
    if (row.employee_count !== "") assert.match(row.employee_count, /^[1-9]\d*$/);
  }
  // The view carries no owner and no route: routing is the learner's output.
  for (const column of ["owner_employee_id", "owner_name", "route", "score"]) {
    assert.ok(!LEAD_FORM_COLUMNS.includes(column), `the view ships a ${column} column, which is the learner's answer`);
  }
});

// -------------------------------------------------- the frozen plants, guarded

test("REV-C1-T2: every account, opportunity and stage-history reference resolves", () => {
  const { accounts, contacts, opportunities, stageHistory } = crm();
  const accountIds = new Set(accounts.map((a) => a.account_id));
  const opportunityIds = new Set(opportunities.map((o) => o.opportunity_id));
  for (const contact of contacts) {
    assert.ok(accountIds.has(contact.account_id), `${contact.contact_id} names account ${contact.account_id}`);
  }
  for (const opp of opportunities) {
    assert.ok(accountIds.has(opp.account_id), `${opp.opportunity_id} names account ${opp.account_id}`);
  }
  for (const row of stageHistory) {
    assert.ok(opportunityIds.has(row.opportunity_id), `stage history names opportunity ${row.opportunity_id}`);
  }
  assert.ok(stageHistory.length > opportunities.length, "a stage history with no transitions cannot carry conversion math");
});

test("REV-C1-T3: three stale accounts and one duplicate pair whose target resolves", () => {
  const { accounts } = crm();
  const accountIds = new Set(accounts.map((a) => a.account_id));
  assert.equal(accounts.filter((a) => a.stale_flag === "true").length, 3);
  const dupes = accounts.filter((a) => a.duplicate_of_account_id !== "");
  assert.equal(dupes.length, 1);
  assert.ok(accountIds.has(dupes[0].duplicate_of_account_id), "the duplicate points at an account that is not in the file");
  const target = accounts.find((a) => a.account_id === dupes[0].duplicate_of_account_id);
  assert.equal(target.name, dupes[0].name, "the duplicate pair does not share a company name");
  assert.notEqual(target.account_id, dupes[0].account_id);
});

test("REV-C1-T4: exactly one industry-source conflict, and its canonical industry is empty", () => {
  const { accounts } = crm();
  const conflicts = accounts.filter((a) => a.industry_source_crm !== a.industry_source_marketing);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].industry, "", "the conflicting record's canonical industry is not empty");
  assert.notEqual(conflicts[0].industry_source_crm, "");
  assert.notEqual(conflicts[0].industry_source_marketing, "");
  // Every other account agrees with both of its sources, so "the sources
  // disagree" selects one row and not a band of them.
  assert.equal(accounts.filter((a) => a.industry === "").length, 1);
});

test("REV-C1-T5-prime: one owner holds the strict maximum open queue and the strict maximum of breaches", () => {
  // implementation-plan-v2's REV-C1-T5 ("exactly one breached lead") is wrong
  // against the committed bytes: eight leads are breached. The load-bearing
  // fixture is the queue-depth concentration, and that is what is asserted.
  const { leads } = crm();
  const openByOwner = new Map();
  const breachedByOwner = new Map();
  for (const lead of leads) {
    if (lead.status === "new" || lead.status === "working") {
      openByOwner.set(lead.owner_employee_id, (openByOwner.get(lead.owner_employee_id) ?? 0) + 1);
    }
    if (lead.sla_breached === "true") {
      breachedByOwner.set(lead.owner_employee_id, (breachedByOwner.get(lead.owner_employee_id) ?? 0) + 1);
    }
  }
  const breachedTotal = leads.filter((l) => l.sla_breached === "true").length;
  assert.ok(breachedTotal >= 1, "no lead is SLA-breached, so module 15's edge eval has no subject");

  const maxOpen = Math.max(...openByOwner.values());
  const deepest = [...openByOwner.entries()].filter(([, count]) => count === maxOpen);
  assert.equal(deepest.length, 1, "the deepest open queue is tied, so 'the rep at breach risk' names nobody");

  const maxBreached = Math.max(...breachedByOwner.values());
  const mostBreached = [...breachedByOwner.entries()].filter(([, count]) => count === maxBreached);
  assert.equal(mostBreached.length, 1, "the breach count is tied at the top");
  assert.equal(deepest[0][0], mostBreached[0][0], "the deepest queue and the most breaches belong to different reps");

  // Both cardinalities, so the shape cannot be read as "exactly one breach":
  // more than one lead is breached, and more than one owner carries one.
  assert.ok(breachedTotal > 1);
  assert.ok(breachedByOwner.size > 1, "one owner holding every breach is a different fixture from a concentration");
});

test("REV-C1-T7: more than one opportunity carries a blank next_step", () => {
  const { opportunities } = crm();
  const blank = opportunities.filter((o) => o.next_step === "");
  assert.ok(blank.length > 1, `expected more than one blank next_step, found ${blank.length}`);
  assert.ok(blank.length < opportunities.length, "every row blank is not a plant, it is an empty column");
});

test("REV-C1-T8: every owner_employee_id in accounts, opportunities and leads resolves in the CORE-04 roster", () => {
  const { accounts, opportunities, leads, submissionsTable } = crm();
  const roster = new Map(buildRoster(createRng("CORE-04", "roster")).map((e) => [e.employee_id, e]));
  for (const [file, rows] of [["accounts", accounts], ["opportunities", opportunities], ["leads", leads]]) {
    for (const row of rows) {
      const employee = roster.get(row.owner_employee_id);
      assert.ok(employee, `${file}: owner ${row.owner_employee_id} is not in the CORE-04 roster`);
      assert.equal(row.owner_name, `${employee.first_name} ${employee.last_name}`, `${file}: owner name does not match the roster`);
    }
  }
  // The lead-form view carries no owner column at all: queue depth is joined
  // from leads.csv, not read off a submission.
  assert.ok(!submissionsTable.cols.some((c) => c.startsWith("owner")));
});

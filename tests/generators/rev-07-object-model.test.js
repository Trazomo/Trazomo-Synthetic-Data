// REV-07 crm-object-model-seed: the join contract, and nothing else.
//
// Module 8 is a tool module with no evals, so what this artifact owes the
// program is that its two shapes agree with CORE-03 and with each other. The
// comparison side is CORE-03's COMMITTED bytes, read off disk, rather than a
// second in-memory generation: if REV-07's derivation and the shipped CRM ever
// part company, this file says so instead of agreeing with the generator.
//
// Record-id formats are the implementer's (cluster-1 plan, U4), so nothing here
// hard-codes one. The contract the plan states is that an id EMBEDS the canon
// or CORE-03 id, and that is what is resolved: the source row whose id appears
// inside the record id, asserted unique.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));

/** The three canon accounts the seed models. */
const SUBJECT_ACCOUNT_IDS = ["co-102", "co-103", "co-122"];

/** CORE-03's committed bytes, read off disk rather than regenerated. */
const committed = (file) =>
  csvTable(readFileSync(join(REPO_ROOT, "datasets", "core", "crm-seed-dataset", file), "utf8")).rows;

const CORE03 = {
  accounts: committed("accounts.csv"),
  contacts: committed("contacts.csv"),
  opportunities: committed("opportunities.csv"),
};

let cached = null;
function objectModel() {
  if (cached) return cached;
  const files = generateArtifact(specs.byId.get("REV-07"), canon);
  cached = {
    salesforce: JSON.parse(fileByPath(files, "salesforce-objects.json").content),
    hubspot: JSON.parse(fileByPath(files, "hubspot-objects.json").content),
  };
  return cached;
}

/**
 * The one source row whose id is embedded in this record's id. Format-agnostic
 * on purpose (U4), and asserted unique so a shortened id that matched two rows
 * would fail here rather than silently pick the first.
 */
function sourceRowFor(recordId, rows, idField) {
  const matches = rows.filter((row) => recordId.includes(row[idField]));
  assert.equal(matches.length, 1, `record id "${recordId}" resolves to ${matches.length} CORE-03 rows, expected 1`);
  return matches[0];
}

test("REV-07: both files carry the shapes their spec names", () => {
  const { salesforce, hubspot } = objectModel();
  assert.deepEqual(Object.keys(salesforce), ["objects"]);
  assert.deepEqual(Object.keys(salesforce.objects), ["Account", "Contact", "Opportunity"]);
  assert.deepEqual(Object.keys(hubspot), ["companies", "contacts", "deals"]);
  for (const collection of Object.values(hubspot)) {
    for (const record of collection) {
      assert.deepEqual(Object.keys(record), ["id", "properties", "associations"]);
    }
  }
});

test("REV07-T1: every account and company name byte-equals the accounts.csv name for its canon id, in both files", () => {
  const { salesforce, hubspot } = objectModel();
  const seen = { salesforce: [], hubspot: [] };

  for (const account of salesforce.objects.Account) {
    const source = sourceRowFor(account.Id, CORE03.accounts, "account_id");
    assert.equal(account.Name, source.name, `${account.Id} carries a name CORE-03 does not`);
    assert.equal(account.Industry, source.industry, `${account.Id} carries an industry CORE-03 does not`);
    seen.salesforce.push(source.account_id);
  }
  for (const company of hubspot.companies) {
    const source = sourceRowFor(company.id, CORE03.accounts, "account_id");
    assert.equal(company.properties.name, source.name, `${company.id} carries a name CORE-03 does not`);
    // The domain is derived from the name by the universe's one convention, the
    // same one CORE-03's contact emails use, rather than retyped.
    assert.equal(
      company.properties.domain,
      `${source.name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.example`,
      `${company.id}'s domain does not follow the universe's domain convention`
    );
    // HubSpot's industry property is the CORE-03 industry in upper snake.
    assert.equal(company.properties.industry, source.industry.toUpperCase().replace(/[^A-Z0-9]+/g, "_"));
    seen.hubspot.push(source.account_id);
  }

  // The two shapes model the same three accounts, and they are the three the
  // plan names.
  assert.deepEqual(seen.salesforce, SUBJECT_ACCOUNT_IDS);
  assert.deepEqual(seen.hubspot, SUBJECT_ACCOUNT_IDS);
});

test("REV07-T2: every Opportunity Amount and deal amount equals the CORE-03 amount for its opportunity id", () => {
  const { salesforce, hubspot } = objectModel();

  for (const opp of salesforce.objects.Opportunity) {
    const source = sourceRowFor(opp.Id, CORE03.opportunities, "opportunity_id");
    assert.equal(String(opp.Amount), source.amount, `${opp.Id} carries an amount CORE-03 does not`);
    assert.equal(opp.Name, source.opportunity_name, `${opp.Id} carries a name CORE-03 does not`);
    // Salesforce's stage words are CORE-03's stage words, unchanged.
    assert.equal(opp.StageName, source.stage, `${opp.Id} renamed a CORE-03 stage`);
    assert.equal(opp.CloseDate, source.close_date);
  }

  // The HubSpot deal-stage mapping the plan publishes, written out here so a
  // generator that mapped a stage differently fails by name.
  const DEAL_STAGE = {
    Prospecting: "appointmentscheduled",
    Qualification: "qualifiedtobuy",
    Proposal: "presentationscheduled",
    Negotiation: "contractsent",
    "Closed Won": "closedwon",
    "Closed Lost": "closedlost",
  };
  for (const deal of hubspot.deals) {
    const source = sourceRowFor(deal.id, CORE03.opportunities, "opportunity_id");
    assert.equal(String(deal.properties.amount), source.amount, `${deal.id} carries an amount CORE-03 does not`);
    assert.equal(deal.properties.dealname, source.opportunity_name, `${deal.id} carries a name CORE-03 does not`);
    assert.equal(deal.properties.dealstage, DEAL_STAGE[source.stage], `${deal.id} maps ${source.stage} to the wrong dealstage`);
    assert.equal(deal.properties.closedate, source.close_date);
  }

  // The co-102 record carries the normalized deal name legal's crm-integration
  // view already reads, in both shapes. Selected by account, never by index.
  const co102Opp = CORE03.opportunities.find((o) => o.account_id === "co-102");
  assert.equal(co102Opp.opportunity_name, "Enterprise Renewal FY27");
  const sfCo102 = salesforce.objects.Opportunity.find((o) => o.Id.includes(co102Opp.opportunity_id));
  const hsCo102 = hubspot.deals.find((d) => d.id.includes(co102Opp.opportunity_id));
  assert.equal(sfCo102.Name, "Enterprise Renewal FY27");
  assert.equal(hsCo102.properties.dealname, "Enterprise Renewal FY27");
  assert.equal(String(sfCo102.Amount), String(hsCo102.properties.amount), "the two shapes disagree about the co-102 amount");
});

test("REV07-T3: three accounts, three opportunities per shape, and the CORE-03 contact counts", () => {
  const { salesforce, hubspot } = objectModel();
  assert.equal(salesforce.objects.Account.length, 3);
  assert.equal(hubspot.companies.length, 3);
  assert.equal(salesforce.objects.Opportunity.length, 3);
  assert.equal(hubspot.deals.length, 3);

  const expectedContacts = CORE03.contacts.filter((c) => SUBJECT_ACCOUNT_IDS.includes(c.account_id));
  assert.equal(salesforce.objects.Contact.length, expectedContacts.length);
  assert.equal(hubspot.contacts.length, expectedContacts.length);

  // Per account, not just in total: a shape that dropped one account's contact
  // and duplicated another's would pass a bare total.
  for (const accountId of SUBJECT_ACCOUNT_IDS) {
    const core03Count = CORE03.contacts.filter((c) => c.account_id === accountId).length;
    assert.ok(core03Count > 0, `CORE-03 no longer carries a contact for ${accountId}`);
    const sfAccount = salesforce.objects.Account.find((a) => a.Id.includes(accountId));
    assert.equal(
      salesforce.objects.Contact.filter((c) => c.AccountId === sfAccount.Id).length,
      core03Count,
      `Salesforce contact count for ${accountId} disagrees with CORE-03`
    );
    const company = hubspot.companies.find((c) => c.id.includes(accountId));
    assert.equal(company.associations.contacts.length, core03Count, `HubSpot associations for ${accountId} disagree with CORE-03`);
    assert.equal(
      hubspot.contacts.filter((c) => c.associations.companies.includes(company.id)).length,
      core03Count,
      `HubSpot contact count for ${accountId} disagrees with CORE-03`
    );
  }

  // Every emitted contact and deal is one of CORE-03's, with its own email and
  // title carried through unchanged.
  for (const contact of salesforce.objects.Contact) {
    const source = sourceRowFor(contact.Id, CORE03.contacts, "contact_id");
    assert.equal(contact.Email, source.email);
    assert.equal(contact.FirstName, source.first_name);
    assert.equal(contact.LastName, source.last_name);
    assert.equal(contact.Title, source.title);
  }
  for (const contact of hubspot.contacts) {
    const source = sourceRowFor(contact.id, CORE03.contacts, "contact_id");
    assert.equal(contact.properties.email, source.email);
    assert.equal(contact.properties.jobtitle, source.title);
  }

  // Every association points at a record this file actually ships.
  const companyIds = new Set(hubspot.companies.map((c) => c.id));
  const contactIds = new Set(hubspot.contacts.map((c) => c.id));
  const dealIds = new Set(hubspot.deals.map((d) => d.id));
  for (const company of hubspot.companies) {
    for (const contactId of company.associations.contacts) assert.ok(contactIds.has(contactId), `dangling contact ${contactId}`);
    for (const dealId of company.associations.deals) assert.ok(dealIds.has(dealId), `dangling deal ${dealId}`);
  }
  for (const record of [...hubspot.contacts, ...hubspot.deals]) {
    for (const companyId of record.associations.companies) assert.ok(companyIds.has(companyId), `dangling company ${companyId}`);
  }
  const sfAccountIds = new Set(salesforce.objects.Account.map((a) => a.Id));
  for (const record of [...salesforce.objects.Contact, ...salesforce.objects.Opportunity]) {
    assert.ok(sfAccountIds.has(record.AccountId), `dangling AccountId ${record.AccountId}`);
  }
});

test("REV-07: the committed bytes are the generated bytes", () => {
  // The byte guard `validate` runs, restated as a test so a hand edit to either
  // committed file fails the suite naming the file it landed on.
  const files = generateArtifact(specs.byId.get("REV-07"), canon);
  for (const file of files) {
    const bytes = readFileSync(join(REPO_ROOT, "datasets", "revenue", "crm-object-model-seed", file.path), "utf8");
    assert.equal(bytes, file.content, `${file.path} was edited by hand`);
  }
  assert.deepEqual(files.map((f) => f.path).sort(), ["hubspot-objects.json", "salesforce-objects.json"]);
});

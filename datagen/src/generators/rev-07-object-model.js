// REV-07 crm-object-model-seed: the same three accounts, their contacts and
// their opportunities, rendered twice -- once in Salesforce's object shape and
// once in HubSpot's. Teaching scale, not eval-critical: what a module may
// assert about this artifact is the join contract, and nothing else.
//
// Every name, id and amount is DERIVED from CORE-03 rather than retyped. The
// generator invokes CORE-03's own generator with a CORE-03-seeded stream
// factory (the pattern CORE-03 itself uses for the CORE-04 roster) and reads
// its emitted bundle, so a CORE-03 reroll moves this file with it instead of
// leaving two datasets quietly disagreeing about what Lodestar Logistics is
// called or what its deal is worth.
import { createRng } from "../seed.js";
import { generate as generateCore03 } from "./core-03-crm-seed.js";

export const id = "REV-07";

/** The three canon accounts this seed models, in file order. */
const SUBJECT_ACCOUNT_IDS = ["co-102", "co-103", "co-122"];

/** Salesforce record-id prefixes: 001 Account, 003 Contact, 006 Opportunity, 005 User. */
const SF_PREFIX = { account: "001", contact: "003", opportunity: "006", user: "005" };
const SF_ID_TENANT = "TZ";

/** CORE-03 `status` to the Salesforce Account.Type picklist. */
const SF_ACCOUNT_TYPE = {
  customer: "Customer",
  target: "Prospect",
  closed_lost: "Former Customer",
};

/** CORE-03 `status` to the HubSpot `lifecyclestage` property. */
const HS_LIFECYCLE_STAGE = {
  customer: "customer",
  target: "opportunity",
  closed_lost: "other",
};

/**
 * CORE-03 stage words to HubSpot's default deal pipeline. Published in the
 * cluster-1 data plan; a module may cite this table.
 */
const HS_DEAL_STAGE = {
  Prospecting: "appointmentscheduled",
  Qualification: "qualifiedtobuy",
  Proposal: "presentationscheduled",
  Negotiation: "contractsent",
  "Closed Won": "closedwon",
  "Closed Lost": "closedlost",
};

export function generate() {
  const seed = readCore03Bundle();

  const accounts = SUBJECT_ACCOUNT_IDS.map((accountId) => {
    const account = seed.accounts.find((a) => a.account_id === accountId);
    if (!account) throw new Error(`REV-07: CORE-03 no longer carries account ${accountId}`);
    return account;
  });
  const subjectIds = new Set(SUBJECT_ACCOUNT_IDS);
  const contacts = seed.contacts.filter((c) => subjectIds.has(c.account_id));
  const opportunities = seed.opportunities.filter((o) => subjectIds.has(o.account_id));
  if (opportunities.length !== accounts.length) {
    throw new Error(`REV-07: expected one opportunity per subject account, found ${opportunities.length}`);
  }
  if (contacts.length === 0) throw new Error("REV-07: the subject accounts carry no CORE-03 contacts");

  const salesforce = {
    objects: {
      Account: accounts.map((account) => ({
        Id: sfId("account", account.account_id),
        Name: account.name,
        Industry: account.industry,
        Type: accountType(account.status),
        OwnerId: sfId("user", account.owner_employee_id),
      })),
      Contact: contacts.map((contact) => ({
        Id: sfId("contact", contact.contact_id),
        AccountId: sfId("account", contact.account_id),
        FirstName: contact.first_name,
        LastName: contact.last_name,
        Email: contact.email,
        Title: contact.title,
      })),
      Opportunity: opportunities.map((opp) => ({
        Id: sfId("opportunity", opp.opportunity_id),
        Name: opp.opportunity_name,
        AccountId: sfId("account", opp.account_id),
        StageName: opp.stage,
        Amount: opp.amount,
        CloseDate: opp.close_date,
        OwnerId: sfId("user", opp.owner_employee_id),
      })),
    },
  };

  const hubspot = {
    companies: accounts.map((account) => ({
      id: hsId("company", account.account_id),
      properties: {
        name: account.name,
        domain: companyDomain(account.name),
        industry: hubspotIndustry(account.industry),
        lifecyclestage: lifecycleStage(account.status),
      },
      associations: {
        contacts: contacts.filter((c) => c.account_id === account.account_id).map((c) => hsId("contact", c.contact_id)),
        deals: opportunities.filter((o) => o.account_id === account.account_id).map((o) => hsId("deal", o.opportunity_id)),
      },
    })),
    contacts: contacts.map((contact) => ({
      id: hsId("contact", contact.contact_id),
      properties: {
        email: contact.email,
        firstname: contact.first_name,
        lastname: contact.last_name,
        jobtitle: contact.title,
      },
      associations: {
        companies: [hsId("company", contact.account_id)],
      },
    })),
    deals: opportunities.map((opp) => ({
      id: hsId("deal", opp.opportunity_id),
      properties: {
        dealname: opp.opportunity_name,
        dealstage: dealStage(opp.stage),
        // HubSpot returns every property as a string, including money and
        // dates; Salesforce returns Amount as a number. The two shapes disagree
        // on purpose -- that difference is half of what module 8 is teaching.
        amount: String(opp.amount),
        closedate: opp.close_date,
      },
      associations: {
        companies: [hsId("company", opp.account_id)],
        contacts: contacts.filter((c) => c.account_id === opp.account_id).map((c) => hsId("contact", c.contact_id)),
      },
    })),
  };

  return [
    { path: "salesforce-objects.json", content: JSON.stringify(salesforce, null, 2) + "\n" },
    { path: "hubspot-objects.json", content: JSON.stringify(hubspot, null, 2) + "\n" },
  ];
}

/** CORE-03's own emitted bundle, parsed. Never a second copy of its facts. */
function readCore03Bundle() {
  const files = generateCore03({ rng: (stream) => createRng("CORE-03", stream) });
  const bundle = files.find((f) => f.path === "crm-seed.json");
  if (!bundle) throw new Error("REV-07: CORE-03 no longer emits crm-seed.json");
  return JSON.parse(bundle.content);
}

function sfId(kind, sourceId) {
  return `${SF_PREFIX[kind]}${SF_ID_TENANT}-${sourceId}`;
}

function hsId(kind, sourceId) {
  return `hs-${kind}-${sourceId}`;
}

function accountType(status) {
  const type = SF_ACCOUNT_TYPE[status];
  if (!type) throw new Error(`REV-07: no Salesforce Account.Type mapped for CORE-03 status "${status}"`);
  return type;
}

function lifecycleStage(status) {
  const stage = HS_LIFECYCLE_STAGE[status];
  if (!stage) throw new Error(`REV-07: no HubSpot lifecyclestage mapped for CORE-03 status "${status}"`);
  return stage;
}

function dealStage(stage) {
  const mapped = HS_DEAL_STAGE[stage];
  if (!mapped) throw new Error(`REV-07: no HubSpot dealstage mapped for CORE-03 stage "${stage}"`);
  return mapped;
}

/** HubSpot's `industry` property is an upper-snake enumeration. */
function hubspotIndustry(industry) {
  return industry === "" ? "" : industry.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

/** The one domain convention this universe has, the same one CORE-03 emails use. */
function companyDomain(companyName) {
  return `${companyName.toLowerCase().replace(/[^a-z0-9]+/g, "")}.example`;
}

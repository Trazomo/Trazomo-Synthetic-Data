// CORE-03 crm-seed-dataset: accounts, contacts, opportunities, stage
// history, and a lead batch, sharing canon IDs with co-102/103/121/122/124/125
// and a co-140+ generator-produced population (per canon/companies.md's ID
// conventions table). Owners are drawn from CORE-04's Sales roster so
// cross-track joins (roster <-> CRM) actually resolve.
import { toCsv } from "../csv.js";
import { ANCHOR_DATE, addDays } from "../dates.js";
import { createRng } from "../seed.js";
import { buildRoster } from "./core-04-people-roster.js";

export const id = "CORE-03";

const NAMED_ACCOUNTS = [
  { canonId: "co-102", name: "Granite Peak Logistics", industry: "Logistics", segment: "Enterprise", status: "customer" },
  { canonId: "co-103", name: "Fernwell Retail Group", industry: "Retail", segment: "Mid-Market", status: "customer" },
  { canonId: "co-122", name: "Bellwether Logistics", industry: "Logistics", segment: "Enterprise", status: "target" },
  { canonId: "co-124", name: "Osprey Interactive", industry: "Media", segment: "Mid-Market", status: "closed_lost" },
  { canonId: "co-125", name: "Kestrel Health", industry: "Healthcare", segment: "Enterprise", status: "target" },
];

const COMPETITOR = { canonId: "co-121", name: "Perigee Systems" };

const GENERATED_COMPANY_WORDS = [
  "Bramblecourt", "Northfield", "Cinderbrook", "Amberline", "Foxglove",
  "Thornwick", "Meridian Vale", "Sagebrook", "Cobblefield", "Wrenhaven",
  "Elmstead", "Copperfen", "Larchmont", "Silverdale", "Windrow",
  "Hazelmere", "Brightfen", "Cragmoor", "Duskfield", "Ferngrove",
  "Gladewick", "Holloway Vale", "Ironbrook", "Junewood", "Kettlebrook",
];
const GENERATED_COMPANY_SUFFIXES = ["Inc.", "LLC", "Group", "Systems", "Holdings", "Partners", "Analytics"];

const INDUSTRIES = ["Software", "Retail", "Logistics", "Healthcare", "Manufacturing", "Financial Services", "Media", "Education"];
const SEGMENTS = ["SMB", "Mid-Market", "Enterprise"];
const OPP_STAGES = ["Prospecting", "Qualification", "Proposal", "Negotiation", "Closed Won", "Closed Lost"];
const CONSENT_STATUSES = ["opted_in", "opted_out", "unknown"];
const LEAD_STATUSES = ["new", "working", "qualified", "disqualified"];

const GENERATED_ACCOUNT_COUNT = 30;
const CO_ID_START = 140;

export function generate({ rng }) {
  const roster = buildRoster(createRng("CORE-04", "roster"));
  const salesReps = roster.filter((r) => r.department === "Sales" && r.level === "IC");
  const activeSalesReps = salesReps.filter((r) => r.employment_status === "active");
  const departedSalesReps = salesReps.filter((r) => r.employment_status === "departed");

  const accRng = rng("accounts");
  const contactRng = rng("contacts");
  const oppRng = rng("opportunities");
  const leadRng = rng("leads");

  // ---- accounts -----------------------------------------------------
  const accounts = [];
  for (const named of NAMED_ACCOUNTS) {
    accounts.push(buildAccount({
      accountId: named.canonId,
      name: named.name,
      industry: named.industry,
      segment: named.segment,
      status: named.status,
      owner: accRng.pick(activeSalesReps),
      rng: accRng,
    }));
  }

  let nextCoId = CO_ID_START;
  for (let i = 0; i < GENERATED_ACCOUNT_COUNT; i++) {
    const accountId = `co-${nextCoId}`;
    nextCoId += 1;
    const name = generatedCompanyName(accRng, i);
    accounts.push(buildAccount({
      accountId,
      name,
      industry: accRng.pick(INDUSTRIES),
      segment: accRng.pick(SEGMENTS),
      status: accRng.pick(["customer", "target", "customer", "target"]),
      owner: accRng.pick(activeSalesReps),
      rng: accRng,
    }));
  }

  // Planted: three stale records (last_activity > 180 days, departed-rep owner).
  const staleCount = 3;
  for (let i = 0; i < staleCount; i++) {
    const target = accounts[accounts.length - 1 - i]; // last N generated accounts
    target.last_activity_date = addDays(ANCHOR_DATE, -(181 + accRng.int(0, 200)));
    const departedOwner = departedSalesReps.length > 0 ? accRng.pick(departedSalesReps) : accRng.pick(salesReps);
    target.owner_employee_id = departedOwner.employee_id;
    target.owner_name = `${departedOwner.first_name} ${departedOwner.last_name}`;
    target.stale_flag = "true";
  }

  // Planted: one conflicting-field record (two industry values from two
  // integrations disagree on the single canonical `industry` column).
  const conflictTarget = accounts[5];
  conflictTarget.industry_source_crm = conflictTarget.industry;
  conflictTarget.industry_source_marketing = accRng.pick(INDUSTRIES.filter((i) => i !== conflictTarget.industry));
  conflictTarget.industry = ""; // ambiguous: two integrations disagree, canonical field left blank

  // Planted: one duplicate account pair (same company, two ids).
  const dupeSource = accounts[8];
  const dupeId = `co-${nextCoId}`;
  nextCoId += 1;
  const dupe = buildAccount({
    accountId: dupeId,
    name: dupeSource.name,
    industry: dupeSource.industry,
    segment: dupeSource.segment,
    status: dupeSource.status,
    owner: accRng.pick(activeSalesReps),
    rng: accRng,
  });
  dupe.duplicate_of_account_id = dupeSource.account_id;
  dupeSource.duplicate_of_account_id = "";
  accounts.push(dupe);

  for (const a of accounts) {
    if (a.industry_source_crm === undefined) a.industry_source_crm = a.industry;
    if (a.industry_source_marketing === undefined) a.industry_source_marketing = a.industry;
    if (a.duplicate_of_account_id === undefined) a.duplicate_of_account_id = "";
    if (a.stale_flag === undefined) a.stale_flag = "false";
  }

  // ---- contacts -------------------------------------------------------
  const contacts = [];
  for (const account of accounts) {
    const perAccount = contactRng.int(1, 3);
    for (let i = 0; i < perAccount; i++) {
      contacts.push(buildContact(account, i, contactRng));
    }
  }

  // ---- opportunities + stage history ----------------------------------
  const opportunities = [];
  const stageHistory = [];
  for (const account of accounts) {
    if (account.status === "target" || account.status === "customer") {
      const opp = buildOpportunity(account, activeSalesReps, oppRng, stageHistory);
      opportunities.push(opp);
    }
    if (account.status === "closed_lost") {
      const opp = buildOpportunity(account, activeSalesReps, oppRng, stageHistory, "Closed Lost");
      opportunities.push(opp);
    }
  }

  // Planted: normalized deal view "Enterprise Renewal FY27" on co-102.
  const granitePeak = opportunities.find((o) => o.account_id === "co-102");
  granitePeak.opportunity_name = "Enterprise Renewal FY27";
  granitePeak.amount = 480000;
  granitePeak.stage = "Negotiation";
  granitePeak.competitor = "";

  // Competitive flag: at least one opportunity names the competitor co-121.
  const competitiveOpp = opportunities[Math.min(2, opportunities.length - 1)];
  competitiveOpp.competitor = COMPETITOR.name;

  // Planted: several opportunities with a blank next_step field.
  const blankNextStepCount = Math.max(3, Math.round(opportunities.length * 0.1));
  for (let i = 0; i < blankNextStepCount; i++) {
    opportunities[(i * 7) % opportunities.length].next_step = "";
  }

  // ---- lead batch with an SLA-breach-risk rep (queue-depth fixture) ----
  const leads = [];
  const overloadedRep = activeSalesReps[0];
  const normalLeadCount = 25;
  const overloadedLeadCount = 22; // deliberately deep queue for one rep
  let leadSeq = 0;
  const makeLead = (owner) => {
    leadSeq += 1;
    const createdDaysAgo = leadRng.int(0, 20);
    const created = addDays(ANCHOR_DATE, -createdDaysAgo);
    const slaDays = 2;
    const slaDue = addDays(created, slaDays);
    const status = leadRng.pick(LEAD_STATUSES);
    return {
      lead_id: `lead-${String(leadSeq).padStart(4, "0")}`,
      owner_employee_id: owner.employee_id,
      owner_name: `${owner.first_name} ${owner.last_name}`,
      created_date: created,
      sla_due_date: slaDue,
      status,
      sla_breached: status === "new" && diffPastDue(slaDue) ? "true" : "false",
    };
  };
  for (let i = 0; i < normalLeadCount; i++) {
    leads.push(makeLead(leadRng.pick(activeSalesReps.filter((r) => r !== overloadedRep))));
  }
  for (let i = 0; i < overloadedLeadCount; i++) {
    leads.push(makeLead(overloadedRep));
  }

  const accountColumns = [
    "account_id", "name", "industry", "industry_source_crm", "industry_source_marketing",
    "segment", "status", "owner_employee_id", "owner_name", "last_activity_date",
    "stale_flag", "duplicate_of_account_id",
  ];
  const contactColumns = [
    "contact_id", "account_id", "first_name", "last_name", "title", "email",
    "consent_status", "suppressed",
  ];
  const oppColumns = [
    "opportunity_id", "account_id", "opportunity_name", "stage", "amount",
    "owner_employee_id", "owner_name", "next_step", "competitor", "created_date", "close_date",
  ];
  const stageHistoryColumns = ["opportunity_id", "from_stage", "to_stage", "changed_date"];
  const leadColumns = ["lead_id", "owner_employee_id", "owner_name", "created_date", "sla_due_date", "status", "sla_breached"];

  const bundle = {
    universe_version: "0.2.0",
    generated_from_spec: "CORE-03",
    counts: {
      accounts: accounts.length,
      contacts: contacts.length,
      opportunities: opportunities.length,
      stage_history: stageHistory.length,
      leads: leads.length,
    },
    accounts,
    contacts,
    opportunities,
    stage_history: stageHistory,
    leads,
  };

  return [
    { path: "accounts.csv", content: toCsv(accountColumns, accounts) },
    { path: "contacts.csv", content: toCsv(contactColumns, contacts) },
    { path: "opportunities.csv", content: toCsv(oppColumns, opportunities) },
    { path: "stage_history.csv", content: toCsv(stageHistoryColumns, stageHistory) },
    { path: "leads.csv", content: toCsv(leadColumns, leads) },
    { path: "crm-seed.json", content: JSON.stringify(bundle, null, 2) + "\n" },
  ];
}

function diffPastDue(slaDueIso) {
  // ANCHOR_DATE is the universe's fixed "today"; a lead is SLA-breached if
  // its due date is before ANCHOR_DATE.
  return slaDueIso < ANCHOR_DATE;
}

function buildAccount({ accountId, name, industry, segment, status, owner, rng }) {
  return {
    account_id: accountId,
    name,
    industry,
    segment,
    status,
    owner_employee_id: owner.employee_id,
    owner_name: `${owner.first_name} ${owner.last_name}`,
    last_activity_date: addDays(ANCHOR_DATE, -rng.int(0, 120)),
  };
}

function buildContact(account, index, rng) {
  const first = rng.pick(["Jordan", "Casey", "Morgan", "Riley", "Avery", "Skyler", "Rowan", "Emerson", "Blair", "Sage"]);
  const last = rng.pick(["Whitfield", "Coburn", "Delacroix", "Marsten", "Yun", "Okafor", "Alvarez", "Petrov", "Nakamura", "Singh"]);
  const consent = rng.pick(CONSENT_STATUSES);
  return {
    contact_id: `ct-${account.account_id}-${String(index + 1).padStart(2, "0")}`,
    account_id: account.account_id,
    first_name: first,
    last_name: last,
    title: rng.pick(["VP Operations", "Director of Procurement", "IT Manager", "Head of Finance", "Project Lead"]),
    email: `${first.toLowerCase()}.${last.toLowerCase()}@${account.name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.example`,
    consent_status: consent,
    suppressed: consent === "opted_out" ? "true" : "false",
  };
}

function buildOpportunity(account, reps, rng, stageHistory, forcedFinalStage) {
  const owner = rng.pick(reps);
  const created = addDays(ANCHOR_DATE, -rng.int(20, 240));
  const oppId = `opp-${account.account_id}-01`;
  const path = forcedFinalStage
    ? ["Prospecting", "Qualification", "Proposal", forcedFinalStage]
    : OPP_STAGES.slice(0, rng.int(1, 4));
  let cursor = created;
  let prev = null;
  for (const stage of path) {
    cursor = addDays(cursor, rng.int(3, 21));
    stageHistory.push({
      opportunity_id: oppId,
      from_stage: prev ?? "",
      to_stage: stage,
      changed_date: cursor,
    });
    prev = stage;
  }
  const finalStage = path[path.length - 1];
  return {
    opportunity_id: oppId,
    account_id: account.account_id,
    opportunity_name: `${account.name} - ${finalStage === "Closed Lost" ? "Renewal" : "New Business"}`,
    stage: finalStage,
    amount: rng.int(15000, 250000),
    owner_employee_id: owner.employee_id,
    owner_name: `${owner.first_name} ${owner.last_name}`,
    next_step: rng.pick(["Send proposal", "Schedule demo", "Legal review", "Follow up call", "Await signature"]),
    competitor: "",
    created_date: created,
    close_date: finalStage.startsWith("Closed") ? cursor : "",
  };
}

function generatedCompanyName(rng, index) {
  const word = GENERATED_COMPANY_WORDS[index % GENERATED_COMPANY_WORDS.length];
  const suffix = rng.pick(GENERATED_COMPANY_SUFFIXES);
  return `${word} ${suffix}`;
}

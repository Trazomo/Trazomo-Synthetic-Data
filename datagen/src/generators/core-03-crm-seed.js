// CORE-03 crm-seed-dataset: accounts, contacts, opportunities, stage
// history, a lead batch, and the inbound lead-form submission view, sharing
// canon IDs with co-102/103/121/122/124/125 and a co-140+ generator-produced
// population (per canon/companies.md's ID conventions table). Owners are drawn
// from CORE-04's Sales roster so cross-track joins (roster <-> CRM) actually
// resolve.
//
// The lead-form view was added by revenue cluster 1 as a pure ADDITION: it
// draws only from its own `lead_form*` streams, after every existing stream has
// finished, so accounts.csv, contacts.csv, opportunities.csv, stage_history.csv
// and leads.csv regenerate byte-identically. Never move a draw into or out of
// the four original streams (`accounts`, `contacts`, `opportunities`, `leads`);
// reordering them rerolls five committed files.
import { toCsv } from "../csv.js";
import { ANCHOR_DATE, addDays, toEpochDay } from "../dates.js";
import { createRng } from "../seed.js";
import { buildRoster } from "./core-04-people-roster.js";

export const id = "CORE-03";

const NAMED_ACCOUNTS = [
  { canonId: "co-102", name: "Amberfield Logistics", industry: "Logistics", segment: "Enterprise", status: "customer" },
  { canonId: "co-103", name: "Fernwell Retail Group", industry: "Retail", segment: "Mid-Market", status: "customer" },
  { canonId: "co-122", name: "Lodestar Logistics", industry: "Logistics", segment: "Enterprise", status: "target" },
  { canonId: "co-124", name: "Talonworks Interactive", industry: "Media", segment: "Mid-Market", status: "closed_lost" },
  { canonId: "co-125", name: "Thornfield Health", industry: "Healthcare", segment: "Enterprise", status: "target" },
];

const COMPETITOR = { canonId: "co-121", name: "Aphelion Systems" };

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

// The two name pools every contact is drawn from. Hoisted out of buildContact()
// so the lead-form view can draw submitter names from the same populations
// rather than inventing a parallel one; the draw order inside buildContact is
// unchanged, so contacts.csv is byte-identical.
const CONTACT_FIRST_NAMES = ["Jordan", "Casey", "Morgan", "Riley", "Avery", "Skyler", "Rowan", "Emerson", "Blair", "Sage"];
const CONTACT_LAST_NAMES = ["Whitfield", "Coburn", "Delacroix", "Marsten", "Yun", "Okafor", "Alvarez", "Petrov", "Nakamura", "Singh"];

const GENERATED_ACCOUNT_COUNT = 30;
const CO_ID_START = 140;

// ------------------------------------------------------- lead-form submissions
// The inbound lead-form view modules 11 and 15 read. Its clock is CORE-03's own
// seed clock (ANCHOR_DATE, 2026-03-16): nothing in this file may be dated after
// the day the dataset calls "today".

const LEAD_FORM_COLUMNS = [
  "submission_id", "submitted_at", "first_name", "last_name", "email",
  "company_name", "industry", "employee_count", "form_source", "pages_viewed",
  "marketing_consent",
];

const LEAD_FORM_COUNT = 12;
const LEAD_FORM_WINDOW_START = "2026-03-02";
const LEAD_FORM_WINDOW_END = ANCHOR_DATE; // 2026-03-16, the seed clock
const LEAD_FORM_SOURCES = ["contact-us", "pricing-page", "demo-request"];
const LEAD_FORM_MAX_PAGES_VIEWED = 12;

/**
 * The published firmographic rule (the "ICP rule"), stated once here and cited
 * verbatim by every consuming module brief. ICP_INDUSTRIES is exactly the eight
 * industries accounts.csv already uses.
 *
 *  1. clear-non-fit: employee_count present and < 25, OR industry present and
 *     not in ICP_INDUSTRIES.
 *  2. clear-fit: not clear-non-fit, AND employee_count present and >= 100, AND
 *     industry present and in ICP_INDUSTRIES.
 *  3. ambiguous: everything else (25..99, a blank industry, or a blank count).
 *
 * Total and deterministic: every submission lands in exactly one class.
 */
const ICP_INDUSTRIES = INDUSTRIES;
const ICP_MIN_EMPLOYEES = 25;
const ICP_FIT_EMPLOYEES = 100;

function classifyIcp(row) {
  const count = row.employee_count === "" ? null : Number(row.employee_count);
  const industry = row.industry === "" ? null : row.industry;
  if ((count !== null && count < ICP_MIN_EMPLOYEES) || (industry !== null && !ICP_INDUSTRIES.includes(industry))) {
    return "clear-non-fit";
  }
  if (count !== null && count >= ICP_FIT_EMPLOYEES && industry !== null && ICP_INDUSTRIES.includes(industry)) {
    return "clear-fit";
  }
  return "ambiguous";
}

/**
 * The fixed design table: firmographics and consent per submission, in design
 * order. Names, dates and pages_viewed are drawn from the `lead_form*` streams
 * and are not in this table; the file is then ordered by submitted_at, so the
 * design order is not the file order and this table is not an answer key.
 *
 * `plant` marks the row a selection rule must land on so the generator can
 * check its own work at build time (below). Design classes: 5 clear-fit,
 * 3 clear-non-fit, 4 ambiguous.
 */
const LEAD_FORM_DESIGN = [
  { company_name: "Mistvale Systems", industry: "Logistics", employee_count: 260, form_source: "demo-request", marketing_consent: "true" },
  { company_name: "Quarrystone Analytics", industry: "Software", employee_count: 480, form_source: "pricing-page", marketing_consent: "false", plant: "consent" },
  { company_name: "Lodestar Logistics", industry: "Logistics", employee_count: 310, form_source: "demo-request", marketing_consent: "true", plant: "enrichment" },
  { company_name: "Harrowgate Group", industry: "Healthcare", employee_count: 140, form_source: "contact-us", marketing_consent: "true" },
  { company_name: "Ellerby Holdings", industry: "Education", employee_count: 220, form_source: "pricing-page", marketing_consent: "true" },
  { company_name: "Pinegarth Partners", industry: "Hospitality", employee_count: 300, form_source: "contact-us", marketing_consent: "true" },
  { company_name: "Bracklewood LLC", industry: "Agriculture", employee_count: 60, form_source: "pricing-page", marketing_consent: "true" },
  { company_name: "Coldfurrow Inc.", industry: "Manufacturing", employee_count: 12, form_source: "contact-us", marketing_consent: "true" },
  { company_name: "Rookswood Systems", industry: "Software", employee_count: 60, form_source: "demo-request", marketing_consent: "true" },
  { company_name: "Marlowfen Group", industry: "", employee_count: 340, form_source: "contact-us", marketing_consent: "true" },
  { company_name: "Bellhollow Holdings", industry: "Retail", employee_count: "", form_source: "pricing-page", marketing_consent: "true", plant: "partial_email" },
  { company_name: "Quillhaven Partners", industry: "Financial Services", employee_count: 85, form_source: "demo-request", marketing_consent: "true" },
];

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

  // ---- inbound lead-form submissions ----------------------------------
  // Additive only. Every draw below comes from a `lead_form*` stream that no
  // other block touches, so the five files above are untouched by construction.
  const leadFormSubmissions = buildLeadFormSubmissions({
    accounts,
    contacts,
    nameRng: rng("lead_form_names"),
    dateRng: rng("lead_form_dates"),
    behaviorRng: rng("lead_form_behavior"),
    matchRng: rng("lead_form_partial_match"),
  });

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
      lead_form_submissions: leadFormSubmissions.length,
    },
    accounts,
    contacts,
    opportunities,
    stage_history: stageHistory,
    leads,
    lead_form_submissions: leadFormSubmissions,
  };

  return [
    { path: "accounts.csv", content: toCsv(accountColumns, accounts) },
    { path: "contacts.csv", content: toCsv(contactColumns, contacts) },
    { path: "opportunities.csv", content: toCsv(oppColumns, opportunities) },
    { path: "stage_history.csv", content: toCsv(stageHistoryColumns, stageHistory) },
    { path: "leads.csv", content: toCsv(leadColumns, leads) },
    { path: "lead_form_submissions.csv", content: toCsv(LEAD_FORM_COLUMNS, leadFormSubmissions) },
    { path: "crm-seed.json", content: JSON.stringify(bundle, null, 2) + "\n" },
  ];
}

/**
 * The inbound lead-form view. Firmographics come from the fixed design table;
 * submitter names, submission dates and pages_viewed come from the four
 * `lead_form*` streams. Ordered by submitted_at (ties by design order), then
 * numbered sub-0001..sub-00NN in that file order.
 *
 * Four selection rules have to land, and the generator checks its own work
 * rather than trusting the table (see assertLeadFormPlants): one local-part-only
 * email match, one consent-false row, a non-empty partition into all three ICP
 * classes, and one company name that resolves byte-equal to a target account.
 */
function buildLeadFormSubmissions({ accounts, contacts, nameRng, dateRng, behaviorRng, matchRng }) {
  const contactLocalParts = new Set(contacts.map((c) => emailLocalPart(c.email)));
  const contactEmails = new Set(contacts.map((c) => c.email));

  // C1-P6's donor: one existing contact whose email local part this view
  // deliberately reuses under a different domain. Picked from the contacts whose
  // own domain differs from the planted row's, so the two emails can never come
  // out byte-equal.
  const partialRow = LEAD_FORM_DESIGN.find((d) => d.plant === "partial_email");
  const partialDomain = emailDomainFor(partialRow.company_name);
  const donorPool = contacts.filter((c) => emailDomain(c.email) !== partialDomain);
  if (donorPool.length === 0) {
    throw new Error("CORE-03 lead-form: no contact is available to donate a local part under a different domain");
  }
  const donor = matchRng.pick(donorPool);

  const usedLocalParts = new Set();
  const rows = LEAD_FORM_DESIGN.map((design, designIndex) => {
    let first;
    let last;
    if (design.plant === "partial_email") {
      first = donor.first_name;
      last = donor.last_name;
    } else {
      // Redraw until the implied local part collides with no contact and no
      // earlier submission. 48 of the pool's 100 combinations are already spent
      // by contacts.csv, so this terminates quickly and deterministically.
      let local;
      do {
        first = nameRng.pick(CONTACT_FIRST_NAMES);
        last = nameRng.pick(CONTACT_LAST_NAMES);
        local = localPartFor(first, last);
      } while (contactLocalParts.has(local) || usedLocalParts.has(local));
      usedLocalParts.add(local);
    }
    return {
      designIndex,
      submitted_at: addDays(LEAD_FORM_WINDOW_START, dateRng.int(0, diffLeadFormWindowDays())),
      first_name: first,
      last_name: last,
      email: `${localPartFor(first, last)}@${emailDomainFor(design.company_name)}`,
      company_name: design.company_name,
      industry: design.industry,
      employee_count: design.employee_count,
      form_source: design.form_source,
      pages_viewed: behaviorRng.int(1, LEAD_FORM_MAX_PAGES_VIEWED),
      marketing_consent: design.marketing_consent,
      plant: design.plant ?? "",
    };
  });

  rows.sort((a, b) => (a.submitted_at < b.submitted_at ? -1 : a.submitted_at > b.submitted_at ? 1 : a.designIndex - b.designIndex));

  const submissions = rows.map((row, index) => ({
    submission_id: `sub-${String(index + 1).padStart(4, "0")}`,
    submitted_at: row.submitted_at,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    company_name: row.company_name,
    industry: row.industry,
    employee_count: row.employee_count,
    form_source: row.form_source,
    pages_viewed: row.pages_viewed,
    marketing_consent: row.marketing_consent,
  }));

  assertLeadFormPlants({
    submissions,
    plantBySubmissionId: new Map(rows.map((row, index) => [`sub-${String(index + 1).padStart(4, "0")}`, row.plant])),
    accounts,
    contactLocalParts,
    contactEmails,
  });
  return submissions;
}

/**
 * The build-time guard. A view whose plants have drifted is worse than no view:
 * a module brief would cite a cardinality the bytes no longer carry. So the
 * generator refuses to emit a file that does not satisfy every rule section 2.1
 * of the cluster-1 data plan states.
 */
function assertLeadFormPlants({ submissions, plantBySubmissionId, accounts, contactLocalParts, contactEmails }) {
  const fail = (message) => {
    throw new Error(`CORE-03 lead-form view: ${message}`);
  };
  if (submissions.length !== LEAD_FORM_COUNT) fail(`expected ${LEAD_FORM_COUNT} submissions, built ${submissions.length}`);

  for (const row of submissions) {
    if (row.submitted_at < LEAD_FORM_WINDOW_START || row.submitted_at > LEAD_FORM_WINDOW_END) {
      fail(`${row.submission_id} is dated ${row.submitted_at}, outside [${LEAD_FORM_WINDOW_START}, ${LEAD_FORM_WINDOW_END}]`);
    }
    if (!LEAD_FORM_SOURCES.includes(row.form_source)) fail(`${row.submission_id} carries form_source ${row.form_source}`);
  }

  // C1-P7: one consent-false row, and it is clear-fit.
  const consentFalse = submissions.filter((r) => r.marketing_consent === "false");
  if (consentFalse.length !== 1) fail(`expected exactly one marketing_consent false row, found ${consentFalse.length}`);
  if (classifyIcp(consentFalse[0]) !== "clear-fit") fail("the consent-false row does not classify clear-fit");

  // C1-P6: one local-part-only match, zero byte-equal matches.
  const byteEqual = submissions.filter((r) => contactEmails.has(r.email));
  if (byteEqual.length !== 0) fail(`${byteEqual.length} submission emails are byte-equal to a contact email`);
  const localMatches = submissions.filter((r) => contactLocalParts.has(emailLocalPart(r.email)));
  if (localMatches.length !== 1) fail(`expected exactly one local-part-only email match, found ${localMatches.length}`);
  if (classifyIcp(localMatches[0]) !== "ambiguous") fail("the local-part-match row does not classify ambiguous");

  // C1-P8: the partition is total and all three classes are non-empty.
  const classes = { "clear-fit": 0, "clear-non-fit": 0, ambiguous: 0 };
  for (const row of submissions) classes[classifyIcp(row)] += 1;
  for (const [name, count] of Object.entries(classes)) {
    if (count === 0) fail(`the ${name} class is empty`);
  }

  // C1-P9: one company name resolves byte-equal to a target account, clear-fit,
  // and no other submission's company name matches an account name at all.
  const accountNames = new Map(accounts.map((a) => [a.name, a]));
  const lowerAccountNames = new Set(accounts.map((a) => a.name.toLowerCase()));
  const resolving = submissions.filter((r) => accountNames.has(r.company_name));
  if (resolving.length !== 1) fail(`expected exactly one submission resolving to an account, found ${resolving.length}`);
  if (accountNames.get(resolving[0].company_name).status !== "target") fail("the resolving submission's account is not a target account");
  if (classifyIcp(resolving[0]) !== "clear-fit") fail("the resolving submission does not classify clear-fit");
  const looseMatches = submissions.filter((r) => r !== resolving[0] && lowerAccountNames.has(r.company_name.toLowerCase()));
  if (looseMatches.length !== 0) fail(`${looseMatches.length} other submissions match an account name case-insensitively`);

  // The three plants are three different rows.
  const planted = [...plantBySubmissionId.entries()].filter(([, plant]) => plant !== "");
  if (new Set(planted.map(([submissionId]) => submissionId)).size !== 3) fail("the three plants no longer sit on three distinct rows");
}

function diffLeadFormWindowDays() {
  return toEpochDay(LEAD_FORM_WINDOW_END) - toEpochDay(LEAD_FORM_WINDOW_START);
}

function localPartFor(first, last) {
  return `${first.toLowerCase()}.${last.toLowerCase()}`;
}

function emailLocalPart(email) {
  return email.slice(0, email.indexOf("@"));
}

function emailDomain(email) {
  return email.slice(email.indexOf("@") + 1);
}

/** The one email-domain convention this dataset has: the company name, lowercased and stripped. */
function emailDomainFor(companyName) {
  return `${companyName.toLowerCase().replace(/[^a-z0-9]+/g, "")}.example`;
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
  const first = rng.pick(CONTACT_FIRST_NAMES);
  const last = rng.pick(CONTACT_LAST_NAMES);
  const consent = rng.pick(CONSENT_STATUSES);
  return {
    contact_id: `ct-${account.account_id}-${String(index + 1).padStart(2, "0")}`,
    account_id: account.account_id,
    first_name: first,
    last_name: last,
    title: rng.pick(["VP Operations", "Director of Procurement", "IT Manager", "Head of Finance", "Project Lead"]),
    email: `${localPartFor(first, last)}@${emailDomainFor(account.name)}`,
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

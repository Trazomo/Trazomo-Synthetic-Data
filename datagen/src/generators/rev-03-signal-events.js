// REV-03 signal-event-logs: the third-party signal feed module 16's plays read,
// one JSON object per line, as of the seed clock 2026-03-16.
//
// Every account_id, contact_id, contact name and email domain is DERIVED from
// CORE-03 rather than retyped: this generator invokes CORE-03's own generator
// with a CORE-03-seeded stream factory and reads its emitted bundle (the REV-07
// pattern at rev-07-object-model.js:148), so a CORE-03 reroll moves this log
// with it instead of leaving the two datasets quietly disagreeing about who
// works where. Nothing under datasets/core/ is read from disk or written.
//
// The competitor's name comes from canon rather than from a string here, and
// the CORE-04 roster is read for the name screen only: a hire subject has no CRM
// record yet, so it must not collide with a CORE-03 contact or a co-002
// employee.
//
// ---------------------------------------------------------------- design table
// Controller-decided for the cluster-3 wave, recorded so a reviewer can check
// each pick against the data plan (docs/plans/2026-08-29-path-programs/revenue/
// data-plans/cluster-3.md, section 2.1) rather than against taste. Every account
// below is named by the ROLE canon already assigns it, and every derived
// selection is recomputed at build time in resolveDesignTable() so a reroll that
// moves a plant fails the build instead of shipping a log a brief would misread.
//
//   C3-P1 qualifying hire      co-122, the target-status account canon assigns
//                              the qualifying-hire role. Satisfies all three
//                              trigger clauses (seniority, function, in-window
//                              start_date). The only event that does.
//   C3-P2 noise hire           co-124, the closed-lost account canon assigns the
//                              noise-hire role. Fails the FUNCTION clause alone:
//                              qualifying seniority, in-window start_date,
//                              function outside the target set. Every one of the
//                              other 10 hire events fails at least two clauses.
//   C3-P3-prime champion move  prior record = the sole contact of the
//                              customer-status champion-source account (co-102
//                              by canon role); matched record = the contact at
//                              the target-status new-employer account (co-125 by
//                              canon role) sharing the prior record's first name
//                              and title, unique at these bytes. account_id is
//                              the NEW employer, match_basis employment_history,
//                              subject_prior_name byte-equals the prior record's
//                              name. The other 3 employer_change events carry at
//                              most one of the two contact ids and weaker bases.
//   C3-P4 re-engagement        the single account carrying a Closed Lost
//                              transition in stage_history.csv (co-124, dated
//                              2026-03-12); observed strictly after that date
//                              and at or before the seed clock; on the co-124
//                              contact whose consent state is not an honored
//                              opt-out. No other engagement event sits at an
//                              account with a Closed Lost transition.
//   C3-P5 anonymous visitors   unique match: the sole contact of co-141, whose
//                              email domain sits on exactly one contact row
//                              (northfieldholdings.example at these bytes, read
//                              from the generated rows, never written here).
//                              Ambiguity distractor: the duplicate-account
//                              domain on four rows across co-143 and co-170.
//                              Unresolvable distractor: a fictional domain on
//                              zero rows. On an anonymous visitor, account_id is
//                              the provider's own unverified attribution and
//                              company_domain is what it reverse-resolved: on
//                              the unresolvable row the two disagree, which is
//                              exactly why no person can be identified from it
//                              (B5). The other 5 visitors are identified.
//   C3-P6 feeds                every competitor_mention names only the canon
//                              competitor (co-121); every feed entry carries an
//                              explicit decimal weight; no aggregate priority
//                              field exists anywhere; the summed feed weight
//                              over target-status accounts tops out at co-146,
//                              the first target-status account in accounts.csv
//                              order carrying no other cluster-3 plant, and the
//                              lead is structural (six entries in the higher
//                              weight band against at most two anywhere else),
//                              so the argmax is unique by construction.
// -----------------------------------------------------------------------------
import { ANCHOR_DATE, addDays, diffDays } from "../dates.js";
import { companyName } from "../canon.js";
import { createRng } from "../seed.js";
import { generate as generateCore03 } from "./core-03-crm-seed.js";
import { buildRoster } from "./core-04-people-roster.js";

export const id = "REV-03";

/** Canon role assignments (canon/companies.md). Statuses are re-checked below. */
const QUALIFYING_HIRE_ACCOUNT_ID = "co-122";
const NOISE_HIRE_ACCOUNT_ID = "co-124";
const CHAMPION_SOURCE_ACCOUNT_ID = "co-102";
const CHAMPION_NEW_EMPLOYER_ACCOUNT_ID = "co-125";
const COMPETITOR_CANON_ID = "co-121";

/** The log's as-of window: the seed clock, never past it (data plan 0.7). */
const OBSERVED_START = "2026-03-01";
const OBSERVED_END = ANCHOR_DATE;

/** The trigger window: the 30 days ending at the anchor date (U1). */
const TRIGGER_WINDOW_START = "2026-02-15";
const TRIGGER_WINDOW_END = ANCHOR_DATE;

/** Out-of-window start dates are older hires, so recency is what the clause tests. */
const STALE_START_WINDOW = { start: "2025-09-01", end: "2026-02-14" };

/** Design-table volumes (U3). 92 lines. */
const VOLUMES = {
  hire: 12,
  employer_change: 4,
  engagement: 10,
  visitor: 8,
  competitor_mention: 28,
  hiring_velocity: 30,
};

/** The six event types, in the order the spec lists them. */
const EVENT_TYPES = Object.keys(VOLUMES);

/** The trigger rule's two target sets (2.1, clauses 1 and 2). */
const QUALIFYING_SENIORITY = ["c_level", "vp", "head", "director"];
const QUALIFYING_FUNCTION = ["operations", "information_technology", "supply_chain"];

/** The rest of the provider's classification vocabulary. */
const OTHER_SENIORITY = ["manager", "senior_individual_contributor", "individual_contributor"];
const OTHER_FUNCTION = [
  "finance", "marketing", "sales", "human_resources", "legal", "customer_success", "engineering",
];

const FUNCTION_LABEL = {
  operations: "Operations",
  information_technology: "Information Technology",
  supply_chain: "Supply Chain",
  finance: "Finance",
  marketing: "Marketing",
  sales: "Sales",
  human_resources: "Human Resources",
  legal: "Legal",
  customer_success: "Customer Success",
  engineering: "Engineering",
};

const C_LEVEL_TITLE = {
  operations: "Chief Operating Officer",
  information_technology: "Chief Information Officer",
  supply_chain: "Chief Supply Chain Officer",
  finance: "Chief Financial Officer",
  marketing: "Chief Marketing Officer",
  sales: "Chief Revenue Officer",
  human_resources: "Chief People Officer",
  legal: "Chief Legal Officer",
  customer_success: "Chief Customer Officer",
  engineering: "Chief Technology Officer",
};

/**
 * Which of the three trigger clauses each non-plant hire event passes. Every
 * pattern fails at least two, so T2's two cardinalities are decided by the two
 * planted events and by nothing else.
 */
const NOISE_HIRE_PATTERNS = [
  { seniority: false, function: false, start_date: true },
  { seniority: false, function: true, start_date: false },
  { seniority: true, function: false, start_date: false },
  { seniority: false, function: false, start_date: false },
];

/**
 * File-local fiction: signal providers in the house style. Screened against real
 * data vendors and, at build time, against every canon and CORE-03 company name.
 */
const SOURCE_POOLS = {
  hire: ["Vesperlane Signals", "Ninebark Signal Feed"],
  employer_change: ["Vesperlane Signals", "Ninebark Signal Feed"],
  engagement: ["Quillhaven Intent", "Marrowgate Data"],
  visitor: ["Cindermoor Web Signals", "Quillhaven Intent"],
  competitor_mention: ["Marrowgate Data", "Bracklewood Analytics"],
  hiring_velocity: ["Bracklewood Analytics", "Vesperlane Signals"],
};

/**
 * File-local fiction: hire and unmatched-mover subjects. Disjoint from CORE-03's
 * contact name pools and from the CORE-04 roster's, checked at build time, since
 * a new hire has no CRM record yet and no co-002 employee is a signal subject.
 */
const SUBJECT_FIRST_NAMES = [
  "Ottoline", "Prosper", "Linnea", "Caspar", "Vesna", "Idris", "Marek", "Solveig",
  "Rafferty", "Anselm", "Beatrix", "Delyth", "Emrys", "Nikolina", "Osric", "Petronella",
];
const SUBJECT_LAST_NAMES = [
  "Vandermolen", "Brightwater", "Castellane", "Duquesne", "Fairbairn", "Gildersleeve",
  "Halvorsen", "Ingarfield", "Karlovic", "Mortlake", "Nordquist", "Prendergast",
  "Quillingham", "Steinhauer", "Tolliver", "Wexcombe",
];

/** match_basis vocabulary. employment_history is the strong basis; the rest are weaker. */
const STRONG_MATCH_BASIS = "employment_history";
const WEAK_MATCH_BASIS = ["profile_update", "name_similarity", "unverified"];

const ENGAGEMENT_DETAILS = {
  webinar_signup: [
    "Registered for the March operations planning webinar.",
    "Registered for the supply chain resilience session.",
    "Registered for the quarterly product roadmap briefing.",
  ],
  content_download: [
    "Downloaded the integration readiness checklist.",
    "Downloaded the vendor consolidation guide.",
    "Downloaded the rollout planning workbook.",
  ],
  reply: [
    "Replied to a Q1 briefing thread asking about implementation timelines.",
    "Replied asking who owns the evaluation on their side.",
    "Replied to a product update note with a scoping question.",
  ],
};

const ENGAGEMENT_CHANNELS = Object.keys(ENGAGEMENT_DETAILS);

/** The plant's channel: an inbound signal that looks individually actionable. */
const REENGAGEMENT_CHANNEL = "webinar_signup";

const VISITOR_PAGES = [
  "/pricing",
  "/product/workflow-automation",
  "/product/integrations",
  "/customers",
  "/security",
  "/docs/getting-started",
  "/compare",
  "/contact-sales",
  "/resources/implementation-guide",
];

/**
 * The unresolvable anonymous visitor's domain: fictional, and checked at build
 * time against every contact email domain and every account-derived domain, so
 * it matches zero contact rows by construction rather than by luck.
 */
const UNRESOLVABLE_VISITOR_DOMAIN = "ashcombeworks.example";

/** competitor_mention snippet templates. The competitor's name is the only company named. */
const SNIPPET_TEMPLATES = [
  (c) => `Buyer mentioned ${c} on a shortlist call and asked how our rollout timeline compares.`,
  (c) => `Procurement circulated a side-by-side comparison naming ${c} as the incumbent bid.`,
  (c) => `A team lead posted publicly about migrating away from ${c} this quarter.`,
  (c) => `An analyst brief the account shared lists ${c} in the same category.`,
  (c) => `Renewal committee notes reference a pilot of ${c} running alongside the evaluation.`,
  (c) => `A hiring post at the account names ${c} tooling in its requirements.`,
  (c) => `Discovery call notes record that the account's ${c} contract comes up for renewal.`,
  (c) => `A community thread from the account asks about migration effort away from ${c}.`,
];

/**
 * Feed weight bands. The bands overlap, so a weight does not announce which side
 * of the design it came from; the priority lead is carried by entry COUNT (six
 * against at most two) rather than by an unmissable weight gap.
 */
const FEED_WEIGHT_BAND = { low: 0.1, high: 0.65 };
const PRIORITY_WEIGHT_BAND = { low: 0.55, high: 0.95 };

/** Feed entries the priority account carries, per feed type. */
const PRIORITY_FEED_ENTRIES = 3;

/** Key names an aggregate priority field would use. REV-03 stores none (B6). */
const FORBIDDEN_AGGREGATE_KEY = /priority|rank|score|aggregate|total/i;

export function generate({ canon, rng }) {
  const seed = readCore03Bundle();
  const design = resolveDesignTable(seed);
  const competitor = companyName(canon, COMPETITOR_CANON_ID);
  if (typeof competitor !== "string" || competitor.startsWith("Unresolved Canon Entity")) {
    throw new Error(`REV-03: canon no longer names the competitor ${COMPETITOR_CANON_ID}`);
  }

  const drafts = [];
  const add = (event_type, account_id, observed_at, payload) => {
    drafts.push({ build_index: drafts.length, event_type, account_id, observed_at, payload });
  };

  const observedRng = rng("observed_at");
  const observed = () => dateInWindow(observedRng, OBSERVED_START, OBSERVED_END);

  // One subject-name pool, handed out in build order, so no two file-local
  // fictional people can collide however the builders are reordered.
  const namePool = shuffledNames(rng("subject_names"));
  let nameCursor = 0;
  const nextName = () => {
    if (nameCursor >= namePool.length) throw new Error("REV-03: the subject name pool is exhausted");
    return namePool[nameCursor++];
  };

  buildHireEvents({ add, observed, design, rng, nextName });
  buildEmployerChangeEvents({ add, observed, design, rng, nextName });
  buildEngagementEvents({ add, observed, design, rng });
  buildVisitorEvents({ add, observed, design, rng });
  buildFeedEvents({ add, observed, design, rng, competitor });

  // Sources are drawn in build order, so adding a stream never reshuffles them.
  const sourceRng = rng("sources");
  for (const draft of drafts) {
    draft.source = sourceRng.pick(SOURCE_POOLS[draft.event_type]);
  }

  // A signal log reads chronologically, so ev-NNNN runs with the clock. The
  // build index is the tiebreak, which keeps the order a pure function of the
  // seed rather than of the sort implementation.
  const ordered = drafts.slice().sort((a, b) => {
    if (a.observed_at !== b.observed_at) return a.observed_at < b.observed_at ? -1 : 1;
    return a.build_index - b.build_index;
  });

  const events = ordered.map((draft, index) => ({
    event_id: `ev-${String(index + 1).padStart(4, "0")}`,
    event_type: draft.event_type,
    account_id: draft.account_id,
    observed_at: draft.observed_at,
    source: draft.source,
    ...draft.payload,
  }));

  assertPlants({ events, design, seed, canon, competitor });

  return [
    { path: "signal-event-logs.jsonl", content: events.map((e) => JSON.stringify(e)).join("\n") + "\n" },
  ];
}

/** CORE-03's own emitted bundle, parsed. Never a second copy of its facts. */
function readCore03Bundle() {
  const files = generateCore03({ rng: (stream) => createRng("CORE-03", stream) });
  const bundle = files.find((f) => f.path === "crm-seed.json");
  if (!bundle) throw new Error("REV-03: CORE-03 no longer emits crm-seed.json");
  return JSON.parse(bundle.content);
}

function emailDomain(email) {
  const at = email.indexOf("@");
  if (at < 0) throw new Error(`REV-03: CORE-03 email ${JSON.stringify(email)} carries no domain`);
  return email.slice(at + 1);
}

function dateInWindow(r, start, end) {
  return addDays(start, r.int(0, diffDays(start, end)));
}

function titleFor(seniority, fn) {
  const label = FUNCTION_LABEL[fn];
  if (!label) throw new Error(`REV-03: no title label for function ${fn}`);
  if (seniority === "c_level") return C_LEVEL_TITLE[fn];
  if (seniority === "vp") return `VP of ${label}`;
  if (seniority === "head") return `Head of ${label}`;
  if (seniority === "director") return `Director of ${label}`;
  if (seniority === "manager") return `${label} Manager`;
  if (seniority === "senior_individual_contributor") return `Senior ${label} Specialist`;
  if (seniority === "individual_contributor") return `${label} Specialist`;
  throw new Error(`REV-03: no title shape for seniority ${seniority}`);
}

// ------------------------------------------------------------------ design table

/**
 * Every plant resolved by its published rule over the CORE-03 bytes about to be
 * joined, never by a row id written here. A CORE-03 reroll that removes a
 * candidate stops the build; one that moves a plant to another row carries the
 * plant with it.
 */
function resolveDesignTable(seed) {
  const fail = (message) => {
    throw new Error(`REV-03 design table: ${message}`);
  };
  const { accounts, contacts, opportunities, stage_history: stageHistory } = seed;
  const byAccountId = new Map(accounts.map((a) => [a.account_id, a]));
  const contactsByAccount = new Map();
  for (const contact of contacts) {
    if (!contactsByAccount.has(contact.account_id)) contactsByAccount.set(contact.account_id, []);
    contactsByAccount.get(contact.account_id).push(contact);
  }
  const contactsAt = (accountId) => contactsByAccount.get(accountId) ?? [];

  const requireAccount = (accountId, status, role) => {
    const account = byAccountId.get(accountId);
    if (!account) fail(`the ${role} account ${accountId} is no longer a CORE-03 account`);
    if (account.status !== status) fail(`the ${role} account ${accountId} carries status ${account.status}, not ${status}`);
    return account;
  };

  requireAccount(QUALIFYING_HIRE_ACCOUNT_ID, "target", "qualifying-hire");
  requireAccount(NOISE_HIRE_ACCOUNT_ID, "closed_lost", "noise-hire");
  requireAccount(CHAMPION_SOURCE_ACCOUNT_ID, "customer", "champion-source");
  requireAccount(CHAMPION_NEW_EMPLOYER_ACCOUNT_ID, "target", "champion new-employer");

  // C3-P3-prime: the sole contact of the champion source, and the unique contact
  // at the new employer sharing its first name and title.
  const sourceContacts = contactsAt(CHAMPION_SOURCE_ACCOUNT_ID);
  if (sourceContacts.length !== 1) {
    fail(`the champion-source account holds ${sourceContacts.length} contacts, not one`);
  }
  const championPrior = sourceContacts[0];
  const matches = contactsAt(CHAMPION_NEW_EMPLOYER_ACCOUNT_ID).filter(
    (c) => c.first_name === championPrior.first_name && c.title === championPrior.title
  );
  if (matches.length !== 1) {
    fail(`${matches.length} contacts at the new-employer account share the prior record's first name and title, not one`);
  }
  const championMatched = matches[0];
  if (championMatched.contact_id === championPrior.contact_id) fail("the champion's two records share a contact_id");
  if (championMatched.last_name === championPrior.last_name) {
    fail("the champion's two records share a surname, so name equality would look like a usable join key");
  }

  // C3-P4: the single account carrying a Closed Lost transition, and its date.
  const accountByOpportunity = new Map(opportunities.map((o) => [o.opportunity_id, o.account_id]));
  const closedLostRows = stageHistory.filter((h) => h.to_stage === "Closed Lost");
  const closedLostAccountIds = new Set(closedLostRows.map((h) => accountByOpportunity.get(h.opportunity_id)));
  if (closedLostAccountIds.size !== 1) {
    fail(`${closedLostAccountIds.size} accounts carry a Closed Lost transition, not one`);
  }
  const [closedLostAccountId] = [...closedLostAccountIds];
  if (closedLostAccountId !== NOISE_HIRE_ACCOUNT_ID) {
    fail(`the Closed Lost transition sits at ${closedLostAccountId}, not at the account canon assigns the role`);
  }
  const closedLostDates = [...new Set(closedLostRows.map((h) => h.changed_date))];
  if (closedLostDates.length !== 1) fail("the Closed Lost transition does not carry one date");
  const closedLostDate = closedLostDates[0];
  if (closedLostDate >= OBSERVED_END) {
    fail(`the Closed Lost transition ${closedLostDate} leaves no room before the seed clock ${OBSERVED_END}`);
  }
  const reengagementCandidates = contactsAt(closedLostAccountId).filter((c) => c.consent_status !== "opted_out");
  if (reengagementCandidates.length !== 1) {
    fail(`${reengagementCandidates.length} contacts of the closed-lost account are not honored opt-outs, not one`);
  }
  const reengagementContact = reengagementCandidates[0];

  // C3-P5: domains counted per contact row, never per account (0.6).
  const rowsByDomain = new Map();
  for (const contact of contacts) {
    const domain = emailDomain(contact.email);
    if (!rowsByDomain.has(domain)) rowsByDomain.set(domain, []);
    rowsByDomain.get(domain).push(contact);
  }

  const uniqueMatchCandidates = accounts.filter((account) => {
    if (account.status !== "target") return false;
    if (account.account_id === CHAMPION_NEW_EMPLOYER_ACCOUNT_ID) return false;
    const own = contactsAt(account.account_id);
    if (own.length !== 1) return false;
    if (own[0].suppressed !== "false") return false;
    return rowsByDomain.get(emailDomain(own[0].email)).length === 1;
  });
  if (uniqueMatchCandidates.length === 0) {
    fail("no unsuppressed single-row-domain target account is available to carry the unique-match visitor");
  }
  const uniqueMatchAccount = uniqueMatchCandidates[0];
  const uniqueMatchDomain = emailDomain(contactsAt(uniqueMatchAccount.account_id)[0].email);

  const ambiguousDomain = [...rowsByDomain.entries()]
    .filter(([, rows]) => rows.length > 1 && new Set(rows.map((c) => c.account_id)).size > 1)
    .sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1))[0];
  if (!ambiguousDomain) fail("no email domain spans more than one account, so the ambiguity distractor has no ground");
  const ambiguousRows = ambiguousDomain[1];
  const ambiguousAccount = accounts.find(
    (a) => ambiguousRows.some((c) => c.account_id === a.account_id) && a.duplicate_of_account_id === ""
  );
  if (!ambiguousAccount) fail("every account carrying the ambiguous domain is flagged a duplicate of another");

  for (const account of accounts) {
    if (accountDomain(account.name) === UNRESOLVABLE_VISITOR_DOMAIN) {
      fail(`${UNRESOLVABLE_VISITOR_DOMAIN} is now ${account.account_id}'s own domain`);
    }
  }
  if (rowsByDomain.has(UNRESOLVABLE_VISITOR_DOMAIN)) {
    fail(`${UNRESOLVABLE_VISITOR_DOMAIN} now sits on a contact row, so it cannot be the unresolvable distractor`);
  }

  // The three accounts a plant already speaks for, so C3-P6's priority account
  // and the unresolvable visitor's account stay narratively separate.
  const reserved = new Set([
    QUALIFYING_HIRE_ACCOUNT_ID,
    CHAMPION_NEW_EMPLOYER_ACCOUNT_ID,
    uniqueMatchAccount.account_id,
  ]);
  const freeTargets = accounts.filter((a) => a.status === "target" && !reserved.has(a.account_id));
  if (freeTargets.length < 2) fail("fewer than two target accounts are free of another cluster-3 plant");
  const priorityAccount = freeTargets[0];
  const unresolvableVisitorAccount = freeTargets[freeTargets.length - 1];
  if (priorityAccount.account_id === unresolvableVisitorAccount.account_id) {
    fail("the priority account and the unresolvable visitor's account are the same account");
  }

  return {
    accounts,
    contacts,
    contactsAt,
    rowsByDomain,
    championPrior,
    championMatched,
    closedLostAccountId,
    closedLostDate,
    reengagementContact,
    uniqueMatchAccount,
    uniqueMatchDomain,
    ambiguousAccount,
    ambiguousDomain: ambiguousDomain[0],
    priorityAccount,
    unresolvableVisitorAccount,
  };
}

/** The one domain convention this universe has, the same one CORE-03 emails use. */
function accountDomain(name) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.example`;
}

// ---------------------------------------------------------------------- events

function buildHireEvents({ add, observed, design, rng, nextName }) {
  const accountRng = rng("hire_accounts");
  const classRng = rng("hire_classification");
  const startRng = rng("hire_start_dates");

  const excluded = new Set([QUALIFYING_HIRE_ACCOUNT_ID, NOISE_HIRE_ACCOUNT_ID]);
  const noiseAccounts = accountRng
    .shuffle(design.accounts.filter((a) => !excluded.has(a.account_id)))
    .slice(0, VOLUMES.hire - 2);
  if (noiseAccounts.length !== VOLUMES.hire - 2) {
    throw new Error("REV-03: not enough accounts to spread the non-plant hire events over");
  }

  const emit = (accountId, seniority, fn, startDate) => {
    add("hire", accountId, observed(), {
      subject_name: nextName(),
      title: titleFor(seniority, fn),
      seniority,
      function: fn,
      start_date: startDate,
    });
  };

  // C3-P1: all three clauses hold. The only hire event for which they do.
  emit(
    QUALIFYING_HIRE_ACCOUNT_ID,
    classRng.pick(QUALIFYING_SENIORITY),
    classRng.pick(QUALIFYING_FUNCTION),
    dateInWindow(startRng, TRIGGER_WINDOW_START, TRIGGER_WINDOW_END)
  );

  // C3-P2: the function clause alone fails.
  emit(
    NOISE_HIRE_ACCOUNT_ID,
    classRng.pick(QUALIFYING_SENIORITY),
    classRng.pick(OTHER_FUNCTION),
    dateInWindow(startRng, TRIGGER_WINDOW_START, TRIGGER_WINDOW_END)
  );

  noiseAccounts.forEach((account, index) => {
    const pattern = NOISE_HIRE_PATTERNS[index % NOISE_HIRE_PATTERNS.length];
    emit(
      account.account_id,
      classRng.pick(pattern.seniority ? QUALIFYING_SENIORITY : OTHER_SENIORITY),
      classRng.pick(pattern.function ? QUALIFYING_FUNCTION : OTHER_FUNCTION),
      pattern.start_date
        ? dateInWindow(startRng, TRIGGER_WINDOW_START, TRIGGER_WINDOW_END)
        : dateInWindow(startRng, STALE_START_WINDOW.start, STALE_START_WINDOW.end)
    );
  });
}

function buildEmployerChangeEvents({ add, observed, design, rng, nextName }) {
  const moveRng = rng("employer_change");
  const { championPrior, championMatched } = design;

  const emit = (accountId, fields) => {
    const payload = {
      subject_name: fields.subject_name,
      new_title: fields.new_title,
      prior_account_id: fields.prior_account_id,
      prior_contact_id: fields.prior_contact_id,
      matched_contact_id: fields.matched_contact_id,
    };
    // subject_prior_name is present exactly when a prior record is cited: with no
    // prior record the provider has no prior name to publish.
    if (fields.prior_contact_id !== null) payload.subject_prior_name = fields.subject_prior_name;
    payload.match_basis = fields.match_basis;
    add("employer_change", accountId, observed(), payload);
  };

  // C3-P3-prime: the one event carrying both contact ids. account_id is the new
  // employer, which is the account the signal is for.
  emit(championMatched.account_id, {
    subject_name: `${championMatched.first_name} ${championMatched.last_name}`,
    new_title: championMatched.title,
    prior_account_id: championPrior.account_id,
    prior_contact_id: championPrior.contact_id,
    matched_contact_id: championMatched.contact_id,
    subject_prior_name: `${championPrior.first_name} ${championPrior.last_name}`,
    match_basis: STRONG_MATCH_BASIS,
  });

  // Population movers. Each carries at most one of the two contact ids, so the
  // "both ids" count stays at one whatever else moves.
  const spoken = new Set([championPrior.account_id, championMatched.account_id]);
  const candidates = moveRng.shuffle(
    design.accounts.filter((a) => a.status === "target" && !spoken.has(a.account_id) && design.contactsAt(a.account_id).length > 0)
  );
  if (candidates.length < 4) throw new Error("REV-03: not enough target accounts to carry the population employer-change events");

  // A mover the provider matched to a CRM record but cannot tie to a prior one.
  const matchedOnly = design.contactsAt(candidates[0].account_id)[0];
  emit(matchedOnly.account_id, {
    subject_name: `${matchedOnly.first_name} ${matchedOnly.last_name}`,
    new_title: matchedOnly.title,
    prior_account_id: null,
    prior_contact_id: null,
    matched_contact_id: matchedOnly.contact_id,
    subject_prior_name: null,
    match_basis: WEAK_MATCH_BASIS[0],
  });

  // A mover the provider tied to a prior record whose new employer holds no CRM
  // record of them at all.
  const priorOnly = design.contactsAt(candidates[1].account_id)[0];
  const priorName = `${priorOnly.first_name} ${priorOnly.last_name}`;
  emit(candidates[2].account_id, {
    subject_name: priorName,
    new_title: titleFor(moveRng.pick(QUALIFYING_SENIORITY), moveRng.pick(OTHER_FUNCTION)),
    prior_account_id: priorOnly.account_id,
    prior_contact_id: priorOnly.contact_id,
    matched_contact_id: null,
    subject_prior_name: priorName,
    match_basis: WEAK_MATCH_BASIS[1],
  });

  // A mover the provider could not tie to either side.
  emit(candidates[3].account_id, {
    subject_name: nextName(),
    new_title: titleFor(moveRng.pick(QUALIFYING_SENIORITY), moveRng.pick(QUALIFYING_FUNCTION)),
    prior_account_id: null,
    prior_contact_id: null,
    matched_contact_id: null,
    subject_prior_name: null,
    match_basis: WEAK_MATCH_BASIS[2],
  });
}

function buildEngagementEvents({ add, observed, design, rng }) {
  const pickRng = rng("engagement_contacts");
  const detailRng = rng("engagement_details");

  // C3-P4: strictly after the loss, at or before the seed clock.
  const reengagementDate = addDays(
    design.closedLostDate,
    pickRng.int(1, diffDays(design.closedLostDate, OBSERVED_END))
  );
  add("engagement", design.reengagementContact.account_id, reengagementDate, {
    contact_id: design.reengagementContact.contact_id,
    channel: REENGAGEMENT_CHANNEL,
    detail: detailRng.pick(ENGAGEMENT_DETAILS[REENGAGEMENT_CHANNEL]),
  });

  // One event per other account, so no second engagement event can land on the
  // closed-lost account and blunt T4.
  const seenAccounts = new Set([design.closedLostAccountId]);
  const population = [];
  for (const contact of pickRng.shuffle(design.contacts)) {
    if (population.length === VOLUMES.engagement - 1) break;
    if (seenAccounts.has(contact.account_id)) continue;
    seenAccounts.add(contact.account_id);
    population.push(contact);
  }
  if (population.length !== VOLUMES.engagement - 1) {
    throw new Error("REV-03: not enough accounts outside the closed-lost one to carry the engagement population");
  }

  for (const contact of population) {
    const channel = detailRng.pick(ENGAGEMENT_CHANNELS);
    add("engagement", contact.account_id, observed(), {
      contact_id: contact.contact_id,
      channel,
      detail: detailRng.pick(ENGAGEMENT_DETAILS[channel]),
    });
  }
}

function buildVisitorEvents({ add, observed, design, rng }) {
  const pickRng = rng("visitor_contacts");
  const pageRng = rng("visitor_pages");
  const countRng = rng("visitor_counts");

  const pages = () => pageRng.shuffle(VISITOR_PAGES).slice(0, pageRng.int(1, 4)).sort();

  const anonymous = (accountId, domain) => {
    add("visitor", accountId, observed(), {
      contact_id: null,
      company_domain: domain,
      pages: pages(),
      visit_count: countRng.int(2, 9),
    });
  };

  anonymous(design.uniqueMatchAccount.account_id, design.uniqueMatchDomain);
  anonymous(design.ambiguousAccount.account_id, design.ambiguousDomain);
  anonymous(design.unresolvableVisitorAccount.account_id, UNRESOLVABLE_VISITOR_DOMAIN);

  const anonymousAccounts = new Set([
    design.uniqueMatchAccount.account_id,
    design.ambiguousAccount.account_id,
    design.unresolvableVisitorAccount.account_id,
  ]);
  const seen = new Set(anonymousAccounts);
  const identified = [];
  for (const contact of pickRng.shuffle(design.contacts)) {
    if (identified.length === VOLUMES.visitor - 3) break;
    if (seen.has(contact.account_id)) continue;
    seen.add(contact.account_id);
    identified.push(contact);
  }
  if (identified.length !== VOLUMES.visitor - 3) {
    throw new Error("REV-03: not enough accounts to carry the identified visitor events");
  }

  for (const contact of identified) {
    add("visitor", contact.account_id, observed(), {
      contact_id: contact.contact_id,
      company_domain: null,
      pages: pages(),
      visit_count: countRng.int(1, 6),
    });
  }
}

function buildFeedEvents({ add, observed, design, rng, competitor }) {
  const priorityId = design.priorityAccount.account_id;
  const others = design.accounts.filter((a) => a.account_id !== priorityId);

  const spread = (streamName, total) => {
    const chosen = rng(streamName).shuffle(others).slice(0, total - PRIORITY_FEED_ENTRIES);
    if (chosen.length !== total - PRIORITY_FEED_ENTRIES) {
      throw new Error(`REV-03: not enough accounts to spread ${streamName} over`);
    }
    // The priority account's entries come first in build order; the sort by
    // observed_at scatters them through the file.
    return [
      ...Array.from({ length: PRIORITY_FEED_ENTRIES }, () => priorityId),
      ...chosen.map((a) => a.account_id),
    ];
  };

  const weightRng = rng("feed_weights");
  const weightFor = (accountId) => {
    const band = accountId === priorityId ? PRIORITY_WEIGHT_BAND : FEED_WEIGHT_BAND;
    return weightRng.amount(band.low, band.high, 2);
  };

  const snippetRng = rng("competitor_snippets");
  for (const accountId of spread("competitor_accounts", VOLUMES.competitor_mention)) {
    add("competitor_mention", accountId, observed(), {
      competitor,
      snippet: snippetRng.pick(SNIPPET_TEMPLATES)(competitor),
      weight: weightFor(accountId),
    });
  }

  const hiresRng = rng("hiring_velocity_counts");
  for (const accountId of spread("velocity_accounts", VOLUMES.hiring_velocity)) {
    add("hiring_velocity", accountId, observed(), {
      hires_90d: accountId === priorityId ? hiresRng.int(18, 48) : hiresRng.int(2, 22),
      weight: weightFor(accountId),
    });
  }
}

/**
 * The subject name pool, zipped rather than drawn pairwise, so no two subjects
 * can collide and the pool's own screen covers every name that ships.
 */
function shuffledNames(r) {
  const firsts = r.shuffle(SUBJECT_FIRST_NAMES);
  const lasts = r.shuffle(SUBJECT_LAST_NAMES);
  return firsts.map((first, i) => `${first} ${lasts[i]}`);
}

// ------------------------------------------------------------------- the guard

/**
 * The build-time guard: the plan's tie-outs T1, T2, T3-prime, T4, T5 and T8,
 * plus the house screens, recomputed from the events about to be serialized. A
 * log whose plants have drifted is worse than no log, because a brief would cite
 * a cardinality the bytes no longer carry.
 */
function assertPlants({ events, design, seed, canon, competitor }) {
  const fail = (message) => {
    throw new Error(`REV-03: ${message}`);
  };
  const { accounts, contacts } = seed;
  const accountIds = new Set(accounts.map((a) => a.account_id));
  const contactsById = new Map(contacts.map((c) => [c.contact_id, c]));
  const statusById = new Map(accounts.map((a) => [a.account_id, a.status]));
  const of = (type) => events.filter((e) => e.event_type === type);

  // Shape: the ids, the volumes and the type set.
  if (events.length !== Object.values(VOLUMES).reduce((a, b) => a + b, 0)) {
    fail(`${events.length} events, not ${Object.values(VOLUMES).reduce((a, b) => a + b, 0)}`);
  }
  events.forEach((event, index) => {
    if (event.event_id !== `ev-${String(index + 1).padStart(4, "0")}`) {
      fail(`event ${index + 1} carries event_id ${event.event_id}`);
    }
  });
  for (const [type, count] of Object.entries(VOLUMES)) {
    if (of(type).length !== count) fail(`${of(type).length} ${type} events, not ${count}`);
  }
  for (const event of events) {
    if (!EVENT_TYPES.includes(event.event_type)) fail(`${event.event_id} carries type ${event.event_type}`);
    if (typeof event.source !== "string" || event.source === "") fail(`${event.event_id} carries no source`);
  }

  // T1: every id resolves, every observed_at sits inside the as-of window.
  for (const event of events) {
    if (!accountIds.has(event.account_id)) fail(`${event.event_id} names account ${event.account_id}`);
    if (event.observed_at < OBSERVED_START || event.observed_at > OBSERVED_END) {
      fail(`${event.event_id} was observed on ${event.observed_at}, outside [${OBSERVED_START}, ${OBSERVED_END}]`);
    }
    const resolvesAt = (contactId, accountId, field) => {
      if (contactId === null || contactId === undefined) return;
      const contact = contactsById.get(contactId);
      if (!contact) fail(`${event.event_id} ${field} ${contactId} is not a CORE-03 contact`);
      if (contact.account_id !== accountId) fail(`${event.event_id} ${field} ${contactId} does not sit at ${accountId}`);
    };
    resolvesAt(event.contact_id, event.account_id, "contact_id");
    resolvesAt(event.matched_contact_id, event.account_id, "matched_contact_id");
    resolvesAt(event.prior_contact_id, event.prior_account_id, "prior_contact_id");
    if (event.prior_account_id !== null && event.prior_account_id !== undefined && !accountIds.has(event.prior_account_id)) {
      fail(`${event.event_id} names prior account ${event.prior_account_id}`);
    }
  }

  // T2: exactly one hire qualifies and exactly one fails exactly one clause.
  const clausesFailed = (event) => {
    let failed = 0;
    if (!QUALIFYING_SENIORITY.includes(event.seniority)) failed += 1;
    if (!QUALIFYING_FUNCTION.includes(event.function)) failed += 1;
    if (event.start_date < TRIGGER_WINDOW_START || event.start_date > TRIGGER_WINDOW_END) failed += 1;
    return failed;
  };
  const qualifying = of("hire").filter((e) => clausesFailed(e) === 0);
  if (qualifying.length !== 1) fail(`${qualifying.length} hire events satisfy all three trigger clauses, not one`);
  if (qualifying[0].account_id !== QUALIFYING_HIRE_ACCOUNT_ID) {
    fail(`the qualifying hire sits at ${qualifying[0].account_id}, not at the account canon assigns the role`);
  }
  const nearMiss = of("hire").filter((e) => clausesFailed(e) === 1);
  if (nearMiss.length !== 1) fail(`${nearMiss.length} hire events fail exactly one clause, not one`);
  if (nearMiss[0].account_id !== NOISE_HIRE_ACCOUNT_ID) {
    fail(`the noise hire sits at ${nearMiss[0].account_id}, not at the account canon assigns the role`);
  }
  if (!QUALIFYING_SENIORITY.includes(nearMiss[0].seniority) || QUALIFYING_FUNCTION.includes(nearMiss[0].function)) {
    fail("the noise hire fails a clause other than the function clause");
  }

  // T3-prime: the one champion move, both ids resolving, statuses read from
  // accounts.csv because zero Closed Won opportunities exist anywhere (0.1).
  const both = of("employer_change").filter((e) => e.prior_contact_id !== null && e.matched_contact_id !== null);
  if (both.length !== 1) fail(`${both.length} employer-change events carry both contact ids, not one`);
  const champion = both[0];
  if (champion.prior_contact_id === champion.matched_contact_id) fail("the champion event's two contact ids are the same id");
  if (statusById.get(champion.prior_account_id) !== "customer") {
    fail(`the champion's prior account carries status ${statusById.get(champion.prior_account_id)}, not customer`);
  }
  if (statusById.get(champion.account_id) !== "target") {
    fail(`the champion's new employer carries status ${statusById.get(champion.account_id)}, not target`);
  }
  if (champion.match_basis !== STRONG_MATCH_BASIS) fail(`the champion event's match_basis is ${champion.match_basis}`);
  const prior = contactsById.get(champion.prior_contact_id);
  if (champion.subject_prior_name !== `${prior.first_name} ${prior.last_name}`) {
    fail("the champion event's subject_prior_name does not byte-equal the prior record's name");
  }
  for (const event of of("employer_change")) {
    const carriesPrior = event.prior_contact_id !== null;
    if (Object.prototype.hasOwnProperty.call(event, "subject_prior_name") !== carriesPrior) {
      fail(`${event.event_id} carries subject_prior_name out of step with prior_contact_id`);
    }
    if (event !== champion && event.match_basis === STRONG_MATCH_BASIS) {
      fail(`${event.event_id} claims the champion event's match basis`);
    }
  }

  // T4: the re-engagement event postdates the loss and stands alone.
  const atClosedLost = of("engagement").filter((e) => e.account_id === design.closedLostAccountId);
  if (atClosedLost.length !== 1) {
    fail(`${atClosedLost.length} engagement events sit at the closed-lost account, not one`);
  }
  if (!(atClosedLost[0].observed_at > design.closedLostDate)) {
    fail(`the re-engagement event was observed on ${atClosedLost[0].observed_at}, not after ${design.closedLostDate}`);
  }
  if (atClosedLost[0].contact_id !== design.reengagementContact.contact_id) {
    fail("the re-engagement event does not sit on the contact the selection rule picked");
  }
  for (const event of of("engagement")) {
    if (!ENGAGEMENT_CHANNELS.includes(event.channel)) fail(`${event.event_id} carries channel ${event.channel}`);
    if (typeof event.detail !== "string" || event.detail === "") fail(`${event.event_id} carries no detail`);
  }

  // T5: the fuzzy rule, counted per contact row.
  const rowsForDomain = (domain) => contacts.filter((c) => emailDomain(c.email) === domain).length;
  const visitors = of("visitor");
  const anonymous = visitors.filter((e) => e.contact_id === null);
  const identified = visitors.filter((e) => e.contact_id !== null);
  for (const event of identified) {
    if (event.company_domain !== null) fail(`${event.event_id} carries both a contact_id and a company_domain`);
  }
  for (const event of anonymous) {
    if (typeof event.company_domain !== "string" || event.company_domain === "") {
      fail(`${event.event_id} carries neither a contact_id nor a company_domain`);
    }
  }
  const uniqueMatches = anonymous.filter((e) => rowsForDomain(e.company_domain) === 1);
  if (uniqueMatches.length !== 1) fail(`${uniqueMatches.length} anonymous visitors match exactly one contact row, not one`);
  if (uniqueMatches[0].account_id === design.championMatched.account_id) {
    fail("the unique-match visitor sits at the champion's new employer");
  }
  if (anonymous.filter((e) => rowsForDomain(e.company_domain) > 1).length === 0) {
    fail("no anonymous visitor matches two or more contact rows");
  }
  if (anonymous.filter((e) => rowsForDomain(e.company_domain) === 0).length === 0) {
    fail("no anonymous visitor matches zero contact rows");
  }
  for (const event of visitors) {
    if (!Array.isArray(event.pages) || event.pages.length === 0) fail(`${event.event_id} carries no pages`);
    if (!event.pages.every((p) => typeof p === "string" && p.startsWith("/"))) fail(`${event.event_id} carries a malformed page path`);
    if (!Number.isInteger(event.visit_count) || event.visit_count < 1) fail(`${event.event_id} carries visit_count ${event.visit_count}`);
  }

  // T8: explicit weights, no aggregate priority anywhere, one argmax over targets.
  const feed = events.filter((e) => e.event_type === "competitor_mention" || e.event_type === "hiring_velocity");
  for (const event of feed) {
    if (typeof event.weight !== "number" || !Number.isFinite(event.weight) || event.weight <= 0) {
      fail(`${event.event_id} carries weight ${event.weight}`);
    }
    if (Number.isInteger(event.weight)) fail(`${event.event_id} carries a whole-number weight, not a decimal one`);
  }
  for (const event of events) {
    for (const key of Object.keys(event)) {
      if (FORBIDDEN_AGGREGATE_KEY.test(key)) fail(`${event.event_id} carries an aggregate field named ${key}`);
    }
  }
  for (const event of of("competitor_mention")) {
    if (event.competitor !== competitor) fail(`${event.event_id} names competitor ${event.competitor}`);
    if (!event.snippet.includes(competitor)) fail(`${event.event_id} carries a snippet that does not name the competitor`);
  }
  for (const event of of("hiring_velocity")) {
    if (!Number.isInteger(event.hires_90d) || event.hires_90d < 0) fail(`${event.event_id} carries hires_90d ${event.hires_90d}`);
  }
  const summed = new Map();
  for (const event of feed) {
    if (statusById.get(event.account_id) !== "target") continue;
    summed.set(event.account_id, (summed.get(event.account_id) ?? 0) + event.weight);
  }
  if (summed.size < 2) fail("fewer than two target accounts carry feed weight, so an argmax teaches nothing");
  const ranked = [...summed.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked[0][1] === ranked[1][1]) fail("the summed feed weight over target accounts ties at the top");
  if (ranked[0][0] !== design.priorityAccount.account_id) {
    fail(`the feed argmax is ${ranked[0][0]}, not the priority account the design table picked`);
  }

  // House screens: fictional providers and subjects only.
  const canonNames = [...canon.values()].map((entry) => entry.name).filter((name) => name.length > 3);
  const accountNames = accounts.map((a) => a.name);
  const forbiddenCompanyNames = [...new Set([...canonNames, ...accountNames])].filter((name) => name !== competitor);
  const prose = events.flatMap((e) => [e.source, e.snippet, e.detail, e.title, e.new_title].filter((s) => typeof s === "string"));
  for (const text of prose) {
    for (const name of forbiddenCompanyNames) {
      if (text.includes(name)) fail(`a generated string names the company "${name}": ${JSON.stringify(text)}`);
    }
  }
  const roster = buildRoster(createRng("CORE-04", "roster"));
  const peopleNames = new Set([
    ...contacts.map((c) => `${c.first_name} ${c.last_name}`),
    ...roster.map((e) => `${e.first_name} ${e.last_name}`),
  ]);
  const surnames = new Set([...contacts.map((c) => c.last_name), ...roster.map((e) => e.last_name)]);
  for (const event of of("hire")) {
    if (peopleNames.has(event.subject_name)) fail(`the hire subject ${event.subject_name} is an existing CRM contact or co-002 employee`);
    if (surnames.has(event.subject_name.split(" ").slice(1).join(" "))) {
      fail(`the hire subject ${event.subject_name} shares a surname with an existing CRM contact or co-002 employee`);
    }
  }
  for (const text of [...prose, ...events.map((e) => e.subject_name).filter(Boolean)]) {
    if (text.includes("—") || text.includes("–")) fail(`a generated string carries a dash character: ${JSON.stringify(text)}`);
  }
}

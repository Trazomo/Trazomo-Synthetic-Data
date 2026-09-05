// REV-01 consent-suppression-master: the consent state of record for every
// CORE-03 contact, the policy that state set is read against, and the two
// downstream tool exports one of which has gone stale.
//
// contact_id, account_id and email are DERIVED from CORE-03 rather than
// retyped: this generator invokes CORE-03's own generator with a CORE-03-seeded
// stream factory and reads its emitted bundle (the REV-07 pattern), so the
// master joins the CRM on the face of the bytes and a CORE-03 reroll moves this
// file with it. Nothing under datasets/core/ is read from disk or written.
//
// consent_status is never drawn. CORE-03 already publishes a coarse three-state
// consent column with `suppressed` locked to `opted_out`; this file REFINES that
// trio into seven legal-basis states by the ordered rule below, which
// consent-policy.json republishes in prose. A state set that did not respect the
// coarse map would break the cross-track join on the face of the bytes.
import { toCsv } from "../csv.js";
import { ANCHOR_DATE, addBusinessDays, addDays, isWeekend } from "../dates.js";
import { createRng } from "../seed.js";
import { generate as generateCore03 } from "./core-03-crm-seed.js";

export const id = "REV-01";

/** The master header, in order. The test pins it; nothing else may reorder it. */
const MASTER_COLUMNS = [
  "contact_id", "account_id", "email", "jurisdiction", "subscriber_type",
  "consent_status", "optout_date", "optout_honored_date", "do_not_contact",
  "dnc_effective_date", "suppressed",
];

/** A tool export is a full sync of three columns, so the conflict is computable over the whole population. */
const EXPORT_COLUMNS = ["contact_id", "email", "suppressed"];

const EXPORT_TARGETS = [
  { target: "outreach-tool", file: "export-outreach-tool.csv" },
  { target: "marketing-platform", file: "export-marketing-platform.csv" },
];

/** The export whose sync ran before the opt-out was honored, hence the one stale row. */
const STALE_EXPORT_TARGET = "marketing-platform";

const POLICY_VERSION = "1.0";

// co-002 policy applies the CAN-SPAM statutory honor window as its floor across
// all regimes; GDPR and PECR set no fixed day count of their own.
const COMPLIANCE_WINDOW_BUSINESS_DAYS = 10;

// Every date in this file is at or before the CORE-03 seed clock: the master
// joins CORE-03's contacts, so it cannot know anything the CRM does not.
const OPTOUT_WINDOW_START = "2026-02-02";
const OPTOUT_WINDOW_END = "2026-03-09";
const DNC_WINDOW_START = "2026-03-12"; // the day the closed-lost opportunity closed
const DNC_WINDOW_END = ANCHOR_DATE;

/**
 * The per-account jurisdiction design table. Every contact of an account shares
 * its account's jurisdiction; canon is silent on the legal form of the
 * population accounts, so this table is where the assignment lives.
 *
 * Constrained by the plants rather than free: the closed-lost account and the
 * overdue opt-out's account are US, one UK single-contact account carries the
 * individual subscriber, and enough UK and EU accounts carry opted-in and
 * unknown contacts to leave all seven derived states non-empty. The generator
 * checks the coverage it needs at build time rather than trusting this table.
 */
const ACCOUNT_JURISDICTION = {
  "co-102": "US",
  "co-103": "EU",
  "co-122": "UK",
  "co-124": "US",
  "co-125": "US",
  "co-140": "US",
  "co-141": "EU",
  "co-142": "US",
  "co-143": "UK",
  "co-144": "EU",
  "co-145": "US",
  "co-146": "UK",
  "co-147": "EU",
  "co-148": "UK",
  "co-149": "UK",
  "co-150": "US",
  "co-151": "US",
  "co-152": "EU",
  "co-153": "US",
  "co-154": "US",
  "co-155": "EU",
  "co-156": "UK",
  "co-157": "US",
  "co-158": "US",
  "co-159": "EU",
  "co-160": "US",
  "co-161": "UK",
  "co-162": "US",
  "co-163": "EU",
  "co-164": "US",
  "co-165": "UK",
  "co-166": "US",
  "co-167": "EU",
  "co-168": "US",
  "co-169": "UK",
  "co-170": "US",
};

/**
 * The one individual-subscriber account: a UK single-contact population account
 * whose CORE-03 coarse state is unknown, so it resolves to pecr_consent_required.
 * The teaching row is that a business-looking address does not make its
 * subscriber a corporate subscriber in law.
 */
const INDIVIDUAL_SUBSCRIBER_ACCOUNT_ID = "co-149";

/**
 * The seven legal-basis states, in derivation-clause order. This table is the
 * only copy: the policy file's state table and the generator's own coverage
 * guard both read it, so the two can never drift apart.
 */
const CONSENT_STATES = [
  {
    state: "optout_honored",
    regime: "all regimes",
    jurisdictions: ["US", "UK", "EU"],
    send_permitted: "no",
    description: "The contact asked to stop and the request has been honored; suppression is universal once honored, whatever the regime.",
  },
  {
    state: "gdpr_consent_confirmed",
    regime: "GDPR",
    jurisdictions: ["EU", "UK"],
    send_permitted: "yes",
    description: "Affirmative consent is recorded for a contact in a GDPR jurisdiction.",
  },
  {
    state: "us_express_consent",
    regime: "CAN-SPAM",
    jurisdictions: ["US"],
    send_permitted: "yes",
    description: "Affirmative consent is recorded for a US contact.",
  },
  {
    state: "gdpr_opt_in_pending",
    regime: "GDPR",
    jurisdictions: ["EU"],
    send_permitted: "no",
    description: "No consent is recorded for an EU contact, so there is no lawful basis to send marketing yet.",
  },
  {
    state: "pecr_consent_required",
    regime: "PECR",
    jurisdictions: ["UK"],
    send_permitted: "no",
    description: "No consent is recorded for a UK individual subscriber, who is on the consent branch of PECR regulation 22.",
  },
  {
    state: "pecr_corporate_subscriber",
    regime: "PECR",
    jurisdictions: ["UK"],
    send_permitted: "conditions",
    description: "No consent is recorded for a UK corporate subscriber; send only after screening confirms the subscriber is corporate and no objection is on file.",
  },
  {
    state: "canspam_default_permitted",
    regime: "CAN-SPAM",
    jurisdictions: ["US"],
    send_permitted: "conditions",
    description: "No consent is recorded for a US contact; the opt-out regime permits the send subject to identification, a physical address and a working opt-out honored inside the window.",
  },
];

/** The published derivation rule, restated in the policy file so a brief cites one copy. */
const DERIVATION_RULE = {
  inputs: [
    "the contact's CORE-03 coarse consent state (opted_in, opted_out, unknown)",
    "jurisdiction",
    "subscriber_type",
  ],
  evaluation: "Clauses evaluate in order. The map is total: every contact matches exactly one clause, and the coarse opted_out set maps one to one onto optout_honored.",
  clauses: [
    "coarse opted_out resolves to optout_honored",
    "coarse opted_in with jurisdiction EU or UK resolves to gdpr_consent_confirmed",
    "coarse opted_in with jurisdiction US resolves to us_express_consent",
    "coarse unknown with jurisdiction EU resolves to gdpr_opt_in_pending",
    "coarse unknown with jurisdiction UK and subscriber_type individual resolves to pecr_consent_required",
    "coarse unknown with jurisdiction UK and subscriber_type corporate resolves to pecr_corporate_subscriber",
    "coarse unknown with jurisdiction US resolves to canspam_default_permitted",
  ],
};

const ACCOUNT_LEVEL_DO_NOT_CONTACT =
  "A do-not-contact decision is recorded on the account, not on a contact: it applies to every contact of that account from its effective date and suppresses them whatever their consent state. An account where every contact happens to have opted out is not a do-not-contact account.";

/**
 * The latest opt-out date that still leaves room to breach the window before the
 * seed clock. Derived from the window rather than written down, so a change to
 * either constant moves it.
 */
const LATEST_OVERDUE_OPTOUT_DATE = addBusinessDays(ANCHOR_DATE, -(COMPLIANCE_WINDOW_BUSINESS_DAYS + 1));

/** The do-not-contact decision is recorded on a business day inside the plan's window. */
const DNC_DECISION_DATES = businessDaysInclusive(DNC_WINDOW_START, DNC_WINDOW_END);

export function generate({ rng }) {
  const seed = readCore03Bundle();
  const { accounts, contacts } = seed;

  const closedLost = accounts.filter((a) => a.status === "closed_lost");
  if (closedLost.length !== 1) {
    throw new Error(`REV-01: expected exactly one closed_lost account in CORE-03, found ${closedLost.length}`);
  }
  const closedLostAccountId = closedLost[0].account_id;

  assertDesignTable(accounts, contacts, closedLostAccountId);

  const rows = contacts.map((contact) => {
    const jurisdiction = ACCOUNT_JURISDICTION[contact.account_id];
    const subscriberType = contact.account_id === INDIVIDUAL_SUBSCRIBER_ACCOUNT_ID ? "individual" : "corporate";
    const consentStatus = deriveConsentStatus(contact.consent_status, jurisdiction, subscriberType);
    const doNotContact = contact.account_id === closedLostAccountId;
    return {
      contact_id: contact.contact_id,
      account_id: contact.account_id,
      email: contact.email,
      jurisdiction,
      subscriber_type: subscriberType,
      consent_status: consentStatus,
      optout_date: "",
      optout_honored_date: "",
      do_not_contact: doNotContact ? "true" : "false",
      dnc_effective_date: "",
      suppressed: consentStatus === "optout_honored" || doNotContact ? "true" : "false",
    };
  });

  // Both plants are selected by their published rule over the derived rows, in
  // master file order, so a CORE-03 reroll moves them instead of losing them.
  const honored = rows.filter((r) => r.consent_status === "optout_honored");
  const overdue = honored.find((r) => r.jurisdiction === "US" && r.account_id !== closedLostAccountId);
  if (!overdue) throw new Error("REV-01: no US opt-out outside the closed-lost account is available to carry the overdue plant");
  const conflict = honored.find(
    (r) => r !== overdue && r.account_id !== closedLostAccountId && r.account_id !== INDIVIDUAL_SUBSCRIBER_ACCOUNT_ID
  );
  if (!conflict) throw new Error("REV-01: no second opt-out is available to carry the export-conflict plant");

  const optoutRng = rng("optout_dates");
  const honorRng = rng("optout_honor_lag");
  for (const row of honored) {
    const isOverdue = row === overdue;
    const windowEnd = isOverdue ? LATEST_OVERDUE_OPTOUT_DATE : OPTOUT_WINDOW_END;
    const optoutDate = addBusinessDays(
      OPTOUT_WINDOW_START,
      optoutRng.int(0, businessDaysBetween(OPTOUT_WINDOW_START, windowEnd))
    );
    // The honor lag is capped by the seed clock as well as by the policy: a pair
    // honored after 2026-03-16 is a fact the CRM could not yet hold.
    const available = businessDaysBetween(optoutDate, ANCHOR_DATE);
    const lag = isOverdue
      ? honorRng.int(COMPLIANCE_WINDOW_BUSINESS_DAYS + 1, available)
      : honorRng.int(1, Math.min(COMPLIANCE_WINDOW_BUSINESS_DAYS, available));
    row.optout_date = optoutDate;
    row.optout_honored_date = addBusinessDays(optoutDate, lag);
  }

  const dncEffectiveDate = rng("do_not_contact").pick(DNC_DECISION_DATES);
  for (const row of rows) {
    if (row.do_not_contact === "true") row.dnc_effective_date = dncEffectiveDate;
  }

  const toolExports = EXPORT_TARGETS.map((target) => ({
    ...target,
    rows: rows.map((row) => ({
      contact_id: row.contact_id,
      email: row.email,
      suppressed: target.target === STALE_EXPORT_TARGET && row === conflict ? "false" : row.suppressed,
    })),
  }));

  assertPlants({ rows, contacts, closedLostAccountId, toolExports, overdue, conflict });

  const policy = {
    generated_from_spec: id,
    policy_version: POLICY_VERSION,
    as_of: ANCHOR_DATE,
    compliance_window_business_days: COMPLIANCE_WINDOW_BUSINESS_DAYS,
    compliance_window_convention:
      "Business days are Monday to Friday with no holiday calendar. The window runs from the opt-out date to the date the opt-out is honored, and co-002 applies it in every jurisdiction.",
    consent_states: CONSENT_STATES,
    derivation_rule: DERIVATION_RULE,
    account_level_do_not_contact: ACCOUNT_LEVEL_DO_NOT_CONTACT,
    export_targets: EXPORT_TARGETS,
  };

  return [
    { path: "consent-suppression-master.csv", content: toCsv(MASTER_COLUMNS, rows) },
    { path: "consent-policy.json", content: JSON.stringify(policy, null, 2) + "\n" },
    ...toolExports.map((target) => ({ path: target.file, content: toCsv(EXPORT_COLUMNS, target.rows) })),
  ];
}

/** CORE-03's own emitted bundle, parsed. Never a second copy of its facts. */
function readCore03Bundle() {
  const files = generateCore03({ rng: (stream) => createRng("CORE-03", stream) });
  const bundle = files.find((f) => f.path === "crm-seed.json");
  if (!bundle) throw new Error("REV-01: CORE-03 no longer emits crm-seed.json");
  return JSON.parse(bundle.content);
}

/**
 * The published consent derivation rule, clause by clause in the order the
 * policy file states them.
 */
function deriveConsentStatus(coarseState, jurisdiction, subscriberType) {
  if (coarseState === "opted_out") return "optout_honored";
  if (coarseState === "opted_in") {
    if (jurisdiction === "EU" || jurisdiction === "UK") return "gdpr_consent_confirmed";
    if (jurisdiction === "US") return "us_express_consent";
  }
  if (coarseState === "unknown") {
    if (jurisdiction === "EU") return "gdpr_opt_in_pending";
    if (jurisdiction === "UK") return subscriberType === "individual" ? "pecr_consent_required" : "pecr_corporate_subscriber";
    if (jurisdiction === "US") return "canspam_default_permitted";
  }
  throw new Error(`REV-01: no derivation clause covers (${coarseState}, ${jurisdiction}, ${subscriberType})`);
}

/** Business days strictly after `from` up to and including `to`. */
function businessDaysBetween(from, to) {
  let count = 0;
  let cursor = from;
  while (cursor < to) {
    cursor = addDays(cursor, 1);
    if (!isWeekend(cursor)) count += 1;
  }
  return count;
}

/** Every business day from `from` to `to`, both ends included. */
function businessDaysInclusive(from, to) {
  const out = [];
  for (let cursor = from; cursor <= to; cursor = addDays(cursor, 1)) {
    if (!isWeekend(cursor)) out.push(cursor);
  }
  return out;
}

/**
 * The design table has to match the population it describes. An account CORE-03
 * added, or a candidate whose coarse state moved, must stop the build rather
 * than fall through to a default and quietly change a state's cardinality.
 */
function assertDesignTable(accounts, contacts, closedLostAccountId) {
  const fail = (message) => {
    throw new Error(`REV-01 design table: ${message}`);
  };
  const accountIds = accounts.map((a) => a.account_id);
  const tabled = Object.keys(ACCOUNT_JURISDICTION);
  const missing = accountIds.filter((accountId) => !ACCOUNT_JURISDICTION[accountId]);
  if (missing.length > 0) fail(`no jurisdiction for ${missing.join(", ")}`);
  const extra = tabled.filter((accountId) => !accountIds.includes(accountId));
  if (extra.length > 0) fail(`${extra.join(", ")} is no longer a CORE-03 account`);
  for (const [accountId, jurisdiction] of Object.entries(ACCOUNT_JURISDICTION)) {
    if (!["US", "UK", "EU"].includes(jurisdiction)) fail(`${accountId} carries jurisdiction ${jurisdiction}`);
  }
  if (ACCOUNT_JURISDICTION[closedLostAccountId] !== "US") {
    fail("the closed-lost account is not US, so its fixture would teach GDPR rather than policy");
  }

  const individualContacts = contacts.filter((c) => c.account_id === INDIVIDUAL_SUBSCRIBER_ACCOUNT_ID);
  if (individualContacts.length !== 1) {
    fail(`the individual-subscriber account holds ${individualContacts.length} contacts, not one`);
  }
  if (ACCOUNT_JURISDICTION[INDIVIDUAL_SUBSCRIBER_ACCOUNT_ID] !== "UK") fail("the individual-subscriber account is not UK");
  if (individualContacts[0].consent_status !== "unknown") {
    fail("the individual subscriber's coarse state is not unknown, so it cannot reach the consent-required branch");
  }
  if (INDIVIDUAL_SUBSCRIBER_ACCOUNT_ID === closedLostAccountId) fail("the individual subscriber sits on the closed-lost account");
}

/**
 * The build-time guard. A master whose plants have drifted is worse than no
 * master: a module brief would cite a cardinality the bytes no longer carry. The
 * equations below are the plan's tie-outs T1 to T4-prime, T7 and T8, recomputed
 * from the rows about to be serialized.
 */
function assertPlants({ rows, contacts, closedLostAccountId, toolExports, overdue, conflict }) {
  const fail = (message) => {
    throw new Error(`REV-01: ${message}`);
  };

  // T1: the bijection with CORE-03's contacts.
  if (rows.length !== contacts.length) fail(`${rows.length} master rows against ${contacts.length} CORE-03 contacts`);
  const contactIds = new Set(contacts.map((c) => c.contact_id));
  const masterIds = new Set(rows.map((r) => r.contact_id));
  if (masterIds.size !== rows.length) fail("a contact_id appears twice in the master");
  for (const row of rows) {
    if (!contactIds.has(row.contact_id)) fail(`${row.contact_id} is not a CORE-03 contact`);
  }
  if (masterIds.size !== contactIds.size) fail("the master does not cover every CORE-03 contact");

  // T7: the three carried columns, the derivation, and the suppression formula.
  const coarseByContactId = new Map(contacts.map((c) => [c.contact_id, c]));
  for (const row of rows) {
    const contact = coarseByContactId.get(row.contact_id);
    if (row.account_id !== contact.account_id || row.email !== contact.email) {
      fail(`${row.contact_id} does not carry CORE-03's account_id and email`);
    }
    const expected = deriveConsentStatus(contact.consent_status, row.jurisdiction, row.subscriber_type);
    if (row.consent_status !== expected) fail(`${row.contact_id} carries ${row.consent_status} where the rule derives ${expected}`);
    const suppressed = row.consent_status === "optout_honored" || row.do_not_contact === "true" ? "true" : "false";
    if (row.suppressed !== suppressed) fail(`${row.contact_id} carries suppressed ${row.suppressed}`);
    if (contact.suppressed === "true" && row.consent_status !== "optout_honored") {
      fail(`${row.contact_id} is suppressed in CORE-03 but does not resolve to optout_honored`);
    }
  }

  // T8: the state set, jurisdiction constancy, and the single individual subscriber.
  const declared = CONSENT_STATES.map((s) => s.state);
  for (const state of declared) {
    if (rows.filter((r) => r.consent_status === state).length === 0) fail(`the ${state} state is empty`);
  }
  for (const row of rows) {
    if (!declared.includes(row.consent_status)) fail(`${row.contact_id} carries unpublished state ${row.consent_status}`);
  }
  const jurisdictionByAccount = new Map();
  for (const row of rows) {
    const seen = jurisdictionByAccount.get(row.account_id);
    if (seen !== undefined && seen !== row.jurisdiction) fail(`${row.account_id} carries two jurisdictions`);
    jurisdictionByAccount.set(row.account_id, row.jurisdiction);
  }
  const individuals = rows.filter((r) => r.subscriber_type === "individual");
  if (individuals.length !== 1) fail(`${individuals.length} contacts are individual subscribers, not one`);
  if (individuals[0].jurisdiction !== "UK") fail("the individual subscriber is not UK");
  if (rows.filter((r) => r.account_id === individuals[0].account_id).length !== 1) {
    fail("the individual-subscriber account holds more than one contact");
  }

  // T2: the honor window, and the single row that breaches it.
  const honored = rows.filter((r) => r.consent_status === "optout_honored");
  for (const row of rows) {
    const carriesDates = row.optout_date !== "" || row.optout_honored_date !== "";
    if ((row.consent_status === "optout_honored") !== carriesDates) {
      fail(`${row.contact_id} carries opt-out dates that do not match its state`);
    }
  }
  for (const row of honored) {
    if (row.optout_date < OPTOUT_WINDOW_START || row.optout_date > OPTOUT_WINDOW_END) {
      fail(`${row.contact_id} opted out on ${row.optout_date}, outside [${OPTOUT_WINDOW_START}, ${OPTOUT_WINDOW_END}]`);
    }
    if (!(row.optout_date < row.optout_honored_date && row.optout_honored_date <= ANCHOR_DATE)) {
      fail(`${row.contact_id} was honored on ${row.optout_honored_date}, outside (${row.optout_date}, ${ANCHOR_DATE}]`);
    }
  }
  const breaching = honored.filter(
    (r) => businessDaysBetween(r.optout_date, r.optout_honored_date) > COMPLIANCE_WINDOW_BUSINESS_DAYS
  );
  if (breaching.length !== 1) fail(`${breaching.length} opt-outs breach the compliance window, not one`);
  if (breaching[0] !== overdue) fail("the breaching opt-out is not the row the selection rule picked");
  if (overdue.jurisdiction !== "US") fail("the overdue opt-out is not US");
  if (overdue.account_id === closedLostAccountId) fail("the overdue opt-out sits on the closed-lost account");
  if (overdue === conflict) fail("the overdue opt-out is also the export-conflict row");

  // T4-prime: the account-level do-not-contact state.
  const dnc = rows.filter((r) => r.do_not_contact === "true");
  const dncAccounts = new Set(dnc.map((r) => r.account_id));
  if (dncAccounts.size !== 1) fail(`${dncAccounts.size} accounts carry do_not_contact, not one`);
  if (!dncAccounts.has(closedLostAccountId)) fail("the do-not-contact account is not the closed-lost account");
  if (dnc.length !== rows.filter((r) => r.account_id === closedLostAccountId).length) {
    fail("the closed-lost account carries do_not_contact on some but not all of its contacts");
  }
  if (new Set(dnc.map((r) => r.dnc_effective_date)).size !== 1) fail("the do-not-contact rows do not share one effective date");
  for (const row of rows) {
    if ((row.do_not_contact === "true") !== (row.dnc_effective_date !== "")) {
      fail(`${row.contact_id} carries a dnc_effective_date that does not match its do_not_contact flag`);
    }
  }
  if (dnc[0].dnc_effective_date < DNC_WINDOW_START || dnc[0].dnc_effective_date > DNC_WINDOW_END) {
    fail(`the do-not-contact date ${dnc[0].dnc_effective_date} is outside [${DNC_WINDOW_START}, ${DNC_WINDOW_END}]`);
  }

  // T3: one conflicting contact across the two exports, and it disagrees with the
  // master in exactly one of them.
  const [outreach, marketing] = toolExports;
  for (const target of toolExports) {
    if (target.rows.length !== rows.length) fail(`${target.file} carries ${target.rows.length} rows, not a full sync`);
  }
  const differing = rows.filter((_, i) => outreach.rows[i].suppressed !== marketing.rows[i].suppressed);
  if (differing.length !== 1) fail(`${differing.length} contacts differ between the two exports, not one`);
  if (differing[0] !== conflict) fail("the differing contact is not the row the selection rule picked");
  const disagreeing = toolExports.filter((target) => target.rows.find((r) => r.contact_id === conflict.contact_id).suppressed !== conflict.suppressed);
  if (disagreeing.length !== 1) fail(`the conflict row disagrees with the master in ${disagreeing.length} exports, not one`);
  if (disagreeing[0].rows.find((r) => r.contact_id === conflict.contact_id).suppressed !== "false") {
    fail("the stale export does not show false for a master-suppressed contact");
  }
  if (conflict.suppressed !== "true" || conflict.consent_status !== "optout_honored") {
    fail("the export-conflict row is not a master-suppressed honored opt-out");
  }
  if (conflict.account_id === closedLostAccountId) fail("the export-conflict row sits on the closed-lost account");
  if (conflict.subscriber_type === "individual") fail("the export-conflict row is the individual subscriber");
  for (const target of toolExports) {
    for (let i = 0; i < rows.length; i++) {
      if (target.rows[i].contact_id !== rows[i].contact_id || target.rows[i].email !== rows[i].email) {
        fail(`${target.file} row ${i + 1} does not carry the master's contact_id and email`);
      }
      if (rows[i] !== conflict && target.rows[i].suppressed !== rows[i].suppressed) {
        fail(`${target.file} disagrees with the master on ${rows[i].contact_id}`);
      }
    }
  }

  // C2-P6a's other half, and the two EU branches the derivation rule needs.
  if (rows.filter((r) => r.consent_status === "pecr_corporate_subscriber").length === 0) {
    fail("no UK corporate subscriber resolves on the same master as the individual one");
  }
  if (!rows.some((r) => r.jurisdiction === "EU" && r.consent_status === "gdpr_consent_confirmed")) {
    fail("no EU account carries a confirmed consent");
  }
  if (!rows.some((r) => r.jurisdiction === "EU" && r.consent_status === "gdpr_opt_in_pending")) {
    fail("no EU account carries a pending opt-in");
  }
}

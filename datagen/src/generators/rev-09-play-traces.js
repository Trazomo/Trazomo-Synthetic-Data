// REV-09 play-trace-ground-truth: the trace log module 25's attribution console
// renders, and the small claims layer it renders against.
//
// The trace universe is DERIVED, never hand listed. This generator invokes the
// CORE-03, REV-01 and REV-03 generators with their own seeded stream factories
// (the REV-07 and REV-08 pattern) and reads the committed REV-04 bytes from disk
// (the FIN-20 / FIN-29 / HR-18 REPO_ROOT pattern, drafted-frozen, no generator),
// then runs the trigger rules and the gates over that output. Nothing under
// datasets/ is read, and no event id, account id, contact id or status below is
// typed as a fact: they fall out of the rules.
//
// Two things only are editorial, and both are plants the data plan names
// (docs/plans/2026-08-29-path-programs/revenue/data-plans/cluster-5.md, 0.2 and
// 2.1): which sending trace carries which handoff and reply datetimes, and which
// of the two attributed traces drops its reply classification. Each literal
// below carries a comment naming its plant. Everything else, including every
// terminal status, every template id, every opportunity outcome and every
// attribution basis, is computed.
//
// ---------------------------------------------------------------- design table
//   Trigger rules (spec REV-09, from REV-03's own plants):
//     new_hire            the REV-03 three-clause rule: seniority in the
//                         qualifying set, function in the qualifying set,
//                         start_date inside the trigger window.
//     champion_reconnect  an employer_change carrying BOTH prior_contact_id and
//                         matched_contact_id.
//     re_engagement       an engagement at an account carrying a Closed Lost
//                         transition in CORE-03 stage history.
//     website_intent      a visitor with a non-null contact_id.
//     general_intro       the standing play, no triggering event: out of scope,
//                         stated in the spec rather than silently dropped.
//
//   Gates, in the taught order, deciding each terminal status:
//     audience      outbound categories run at target-status accounts;
//                   re_engagement runs at Closed-Lost-transition accounts;
//                   anything else routes to the owning team (routed_internal)
//                   before a recipient is ever addressed.
//     suppression   an account-level do-not-contact decision ends the play with
//                   no draft (declined_suppressed).
//     consent       a blocking consent state would hold the play. Zero firings
//                   reach one at these bytes: the honest zero, asserted below.
//     verification  a send requires the recipient's REV-04 sidecar row with
//                   email_status verified. A recipient with no CRM record and no
//                   sidecar row leaves the draft held (held_draft).
// -----------------------------------------------------------------------------
import { readFileSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { ANCHOR_DATE } from "../dates.js";
import { createRng } from "../seed.js";
import { generate as generateCore03 } from "./core-03-crm-seed.js";
import { generate as generateRev01 } from "./rev-01-consent-suppression.js";
import { generate as generateRev03 } from "./rev-03-signal-events.js";

export const id = "REV-09";

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..");
const SIDECAR_PATH = join(REPO_ROOT, "artifacts", "REV-04", "recipient-email-verification.yaml");
const TEMPLATE_LIBRARY_PATH = join(REPO_ROOT, "artifacts", "REV-04", "message-template-library.md");

const TRACES_FILE = "play-traces.jsonl";
const CLAIMS_FILE = "attribution-claims.jsonl";

/** Field order, pinned by the spec. Every row carries all fourteen. */
export const TRACE_FIELDS = [
  "trace_id",
  "play_category",
  "trigger_event_id",
  "account_id",
  "recipient_contact_id",
  "template_id",
  "handoff_at",
  "reply_classification",
  "replied_at",
  "opportunity_id",
  "opportunity_outcome",
  "attribution_basis",
  "status",
  "status_detail",
];

/** Field order for the claims layer, pinned by the spec. */
export const CLAIM_FIELDS = ["claim_id", "claim_text", "trace_id", "opportunity_id", "basis_claimed"];

/** REV-04's category vocabulary, verbatim. general_intro carries no trigger. */
const OUT_OF_SCOPE_CATEGORY = "general_intro";
const OUTBOUND_CATEGORIES = ["new_hire", "champion_reconnect", "website_intent"];

/** REV-03's three trigger clauses for a qualifying hire, from its spec entry. */
const QUALIFYING_SENIORITY = ["c_level", "vp", "head", "director"];
const QUALIFYING_FUNCTION = ["operations", "information_technology", "supply_chain"];
const TRIGGER_WINDOW_START = "2026-02-15";
const TRIGGER_WINDOW_END = ANCHOR_DATE;

/** The audience gate's account status, and the transition re_engagement reads. */
const TARGET_STATUS = "target";
const CLOSED_LOST_STAGE = "Closed Lost";

/** The sidecar status a send requires. */
const VERIFIED_EMAIL_STATUS = "verified";

/** The five terminal statuses, enumerated by the spec. */
const STATUSES = ["routed_internal", "declined_suppressed", "held_draft", "replied", "closed_attributed"];

/** The three reply classes, enumerated by the spec. */
const REPLY_CLASSES = ["positive_interest", "neutral_acknowledgement", "negative_decline"];

/** The two attribution bases. sourced_by_play is in the vocabulary and unused. */
const BASIS_INFLUENCED = "influenced_existing";
const BASIS_SOURCED = "sourced_by_play";

/**
 * Which fields each status populates. Everything else on the row is null: the
 * spec's "fields not required by the row's status are null", written out so a
 * status that started carrying a field it has no business carrying fails the
 * build instead of shipping.
 */
const STATUS_FIELDS = {
  routed_internal: ["trace_id", "play_category", "trigger_event_id", "account_id", "status", "status_detail"],
  declined_suppressed: [
    "trace_id", "play_category", "trigger_event_id", "account_id", "recipient_contact_id", "status", "status_detail",
  ],
  held_draft: [
    "trace_id", "play_category", "trigger_event_id", "account_id", "recipient_contact_id", "template_id",
    "status", "status_detail",
  ],
  replied: [
    "trace_id", "play_category", "trigger_event_id", "account_id", "recipient_contact_id", "template_id",
    "handoff_at", "reply_classification", "replied_at", "status", "status_detail",
  ],
  closed_attributed: [
    "trace_id", "play_category", "trigger_event_id", "account_id", "recipient_contact_id", "template_id",
    "handoff_at", "reply_classification", "replied_at", "opportunity_id", "opportunity_outcome",
    "attribution_basis", "status", "status_detail",
  ],
};

/**
 * The per-status required-link map C5-P2 is read over. A link is missing when
 * any of its fields is null. replied_at is deliberately NOT a link: TR-03's
 * defect is precise, its timestamp is present and only the classification is
 * gone, which is what makes the ingestion failure legible rather than a
 * wholesale dropped reply.
 */
export const REQUIRED_LINKS = {
  routed_internal: { trigger: ["trigger_event_id"] },
  declined_suppressed: { trigger: ["trigger_event_id"] },
  held_draft: { trigger: ["trigger_event_id"], template: ["template_id"] },
  replied: {
    trigger: ["trigger_event_id"],
    template: ["template_id"],
    handoff: ["handoff_at"],
    reply_classification: ["reply_classification"],
  },
  closed_attributed: {
    trigger: ["trigger_event_id"],
    template: ["template_id"],
    handoff: ["handoff_at"],
    reply_classification: ["reply_classification"],
    opportunity: ["opportunity_id", "opportunity_outcome", "attribution_basis"],
  },
};

/**
 * The editorial pins, keyed by TRIGGER EVENT ID rather than by trace id so that
 * a reroll which moved a firing in the ordering moves its pin with it instead of
 * pinning the wrong row. A pin may only sit on a firing the gates carried to a
 * send; the build guard checks that both ways.
 *
 * opportunity_outcome and attribution_basis are absent here on purpose: the
 * outcome is read off the CORE-03 stage column and the basis is computed from
 * the created_date against the handoff (T3-prime), so neither can be typed into
 * agreement with a fact it no longer matches.
 */
const OUTCOME_PLANTS = {
  // C5-P2, the precise ingestion defect: handed off, replied, opportunity joined
  // at reporting time, and the reply classification never landed.
  // reply_classification null IS the plant.
  "ev-0066": {
    handoff_at: "2026-03-13T09:20:00Z",
    replied_at: "2026-03-15T11:05:00Z",
    reply_classification: "neutral_acknowledgement",
    // The champion play claims no attribution (data plan 0.6): the play never
    // reads an opportunity row, and co-125's reporting-time join belongs to the
    // website_intent trace at the same account.
    opportunity_id: null,
  },
  "ev-0068": {
    handoff_at: "2026-03-13T10:40:00Z",
    replied_at: "2026-03-15T14:30:00Z",
    // C5-P2: absent classification on a closed_attributed trace, timestamp present.
    reply_classification: null,
    opportunity_id: "opp-co-125-01",
  },
  // C5-P1, the one complete trace: all five links resolve in their packs.
  "ev-0081": {
    handoff_at: "2026-03-16T09:10:00Z",
    replied_at: "2026-03-16T16:40:00Z",
    reply_classification: "positive_interest",
    opportunity_id: "opp-co-157-01",
  },
};

/**
 * status_detail, one short factual sentence per row, keyed by the row's own
 * outcome rather than by trace id. No person name, no address, no consent-state
 * word (the guard screens the emitted strings against REV-01's own state
 * vocabulary), and no dash character.
 */
const STATUS_DETAIL = {
  routed_internal:
    "The audience gate placed this account outside the outbound population, so the signal went to the owning team and no draft was written.",
  declined_suppressed:
    "The account carries a do not contact decision, so the play ended at the suppression screen and no draft was written.",
  held_draft:
    "The recipient has no record in the export and no verified address, so the draft was prepared and held for a person to read.",
  replied:
    "The message was handed off, a reply came back, and the reply was classified on the record.",
  closed_attributed:
    "The message was handed off, a reply came back and was classified, and the account opportunity was joined at reporting time.",
  // C5-P2's own sentence: the same trace as the row above minus the one field.
  closed_attributed_missing_reply_classification:
    "The message was handed off and a reply came back, the account opportunity was joined at reporting time, and the reply classification did not land on the record.",
};

/**
 * The claims layer. Two rows cite a firing by its trigger event, so their trace
 * ids resolve at build time; the third cites the trace id one past the last one
 * emitted, which by construction resolves to nothing (C5-P6). No claim_text
 * carries a numeral or a person name.
 */
const CLAIMS = [
  {
    claim_id: "AC-01",
    claim_text:
      "The outbound play on the cited trace influenced the open opportunity it names, and the trace carries the reply that supports the claim.",
    trigger_event_id: "ev-0081",
    opportunity_id: "opp-co-157-01",
    basis_claimed: BASIS_INFLUENCED,
  },
  {
    claim_id: "AC-02",
    claim_text: "The outbound play on the cited trace influenced the open opportunity it names.",
    trigger_event_id: "ev-0068",
    opportunity_id: "opp-co-125-01",
    basis_claimed: BASIS_INFLUENCED,
  },
  {
    // C5-P6, refutable twice over: the trace id resolves to no trace, and the
    // basis is the one the created-date rule forbids over these bytes.
    claim_id: "AC-03",
    claim_text: "The outbound play on the cited trace created the opportunity it names.",
    trigger_event_id: null,
    opportunity_id: "opp-co-122-01",
    basis_claimed: BASIS_SOURCED,
  },
];

export function generate({ canon }) {
  const crm = readCore03Bundle();
  const consent = readRev01();
  const events = readRev03Events(canon);
  const sidecar = readSidecar();
  const templates = readTemplateLibrary();

  const packs = buildPacks({ crm, consent, sidecar, templates });
  const firings = enumerateFirings(events, packs);
  const traces = firings.map((firing, index) => buildTrace(firing, index, packs));
  const claims = buildClaims(traces);

  assertGroundTruth({ traces, claims, packs, events, firings });

  return [
    { path: TRACES_FILE, content: traces.map((row) => serialize(row, TRACE_FIELDS)).join("\n") + "\n" },
    { path: CLAIMS_FILE, content: claims.map((row) => serialize(row, CLAIM_FIELDS)).join("\n") + "\n" },
  ];
}

// ------------------------------------------------------------------- the packs

/** CORE-03's own emitted bundle, parsed. Never a second copy of its facts. */
function readCore03Bundle() {
  const files = generateCore03({ rng: (stream) => createRng("CORE-03", stream) });
  const bundle = files.find((f) => f.path === "crm-seed.json");
  if (!bundle) throw new Error("REV-09: CORE-03 no longer emits crm-seed.json");
  const parsed = JSON.parse(bundle.content);
  for (const key of ["accounts", "contacts", "opportunities", "stage_history"]) {
    if (!Array.isArray(parsed[key]) || parsed[key].length === 0) {
      throw new Error(`REV-09: CORE-03's bundle no longer carries ${key}`);
    }
  }
  return parsed;
}

/** REV-01's own emitted master and policy, parsed. */
function readRev01() {
  const files = generateRev01({ rng: (stream) => createRng("REV-01", stream) });
  const master = files.find((f) => f.path === "consent-suppression-master.csv");
  const policy = files.find((f) => f.path === "consent-policy.json");
  if (!master || !policy) throw new Error("REV-09: REV-01 no longer emits its master and policy");
  return { master: parseCsv(master.content), policy: JSON.parse(policy.content) };
}

/** REV-03's own emitted log, parsed. Canon rides through: REV-03 names the
 * competitor out of it rather than out of a string. */
function readRev03Events(canon) {
  if (!canon) throw new Error("REV-09: canon is required, because REV-03 reads the competitor name out of it");
  const files = generateRev03({
    canon,
    rng: (stream) => createRng("REV-03", stream),
  });
  const log = files.find((f) => f.path === "signal-event-logs.jsonl");
  if (!log) throw new Error("REV-09: REV-03 no longer emits signal-event-logs.jsonl");
  return log.content.trim().split("\n").map((line) => JSON.parse(line));
}

/** The committed REV-04 sidecar bytes: drafted-frozen, so read, never derived. */
function readSidecar() {
  const parsed = yaml.load(readFileSync(SIDECAR_PATH, "utf8"));
  const recipients = parsed && parsed.recipients;
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error("REV-09: the REV-04 verification sidecar no longer carries recipients");
  }
  for (const row of recipients) {
    if (typeof row.contact_id !== "string" || typeof row.email !== "string" || typeof row.email_status !== "string") {
      throw new Error("REV-09: a REV-04 sidecar row no longer carries contact_id, email and email_status");
    }
  }
  return recipients;
}

/**
 * The committed REV-04 template library: every `### TPL-NN` heading and the
 * `Category:` line under it. Template ids and their categories are read out of
 * the library rather than restated, so a library edit moves the selection.
 */
function readTemplateLibrary() {
  const text = readFileSync(TEMPLATE_LIBRARY_PATH, "utf8");
  const templates = [];
  let current = null;
  for (const line of text.split("\n")) {
    const heading = /^###\s+(TPL-\d{2})\s*$/.exec(line);
    if (heading) {
      current = { template_id: heading[1], category: null };
      templates.push(current);
      continue;
    }
    const category = /^Category:\s*(\S+)\s*$/.exec(line);
    if (category && current && current.category === null) current.category = category[1];
  }
  if (templates.length === 0) throw new Error("REV-09: the REV-04 template library no longer carries TPL headings");
  for (const template of templates) {
    if (!template.category) throw new Error(`REV-09: ${template.template_id} carries no Category line`);
  }
  return templates;
}

/** Naive CSV split is enough here: the REV-01 master quotes nothing. */
function parseCsv(content) {
  const [header, ...lines] = content.trim().split("\n");
  const cols = header.split(",");
  return lines.map((line) => {
    const cells = line.split(",");
    if (cells.length !== cols.length) throw new Error(`REV-09: an REV-01 master row carries a quoted cell: ${line}`);
    return Object.fromEntries(cols.map((c, i) => [c, cells[i]]));
  });
}

/** Every lookup the rules below read, built once. */
function buildPacks({ crm, consent, sidecar, templates }) {
  const accountsById = new Map(crm.accounts.map((a) => [a.account_id, a]));
  const contactsById = new Map(crm.contacts.map((c) => [c.contact_id, c]));
  const opportunitiesById = new Map(crm.opportunities.map((o) => [o.opportunity_id, o]));
  const opportunityAccount = new Map(crm.opportunities.map((o) => [o.opportunity_id, o.account_id]));

  const closedLostAccounts = new Set();
  for (const row of crm.stage_history) {
    if (row.to_stage !== CLOSED_LOST_STAGE) continue;
    const account = opportunityAccount.get(row.opportunity_id);
    if (!account) throw new Error(`REV-09: stage history names unknown opportunity ${row.opportunity_id}`);
    closedLostAccounts.add(account);
  }
  if (closedLostAccounts.size === 0) throw new Error("REV-09: no account carries a Closed Lost transition");

  const masterByContact = new Map(consent.master.map((row) => [row.contact_id, row]));
  const masterByAccount = new Map();
  for (const row of consent.master) {
    if (!masterByAccount.has(row.account_id)) masterByAccount.set(row.account_id, []);
    masterByAccount.get(row.account_id).push(row);
  }

  // An account-level do-not-contact decision, per the REV-01 policy's own words:
  // it is recorded on the account, so every contact row of the account carries
  // it. An account whose contacts merely all opted out is not one of these.
  const dncAccounts = new Set();
  for (const [account_id, rows] of masterByAccount) {
    if (rows.length > 0 && rows.every((row) => row.do_not_contact === "true")) dncAccounts.add(account_id);
  }

  const states = consent.policy.consent_states;
  if (!Array.isArray(states) || states.length === 0) {
    throw new Error("REV-09: the REV-01 policy no longer publishes its consent states");
  }
  const blockingStates = new Set(states.filter((s) => s.send_permitted === "no").map((s) => s.state));
  const consentVocabulary = states.map((s) => s.state);

  const sidecarByContact = new Map(sidecar.map((row) => [row.contact_id, row]));

  // A sending play drafts from its category's lowest-numbered template.
  const templateByCategory = new Map();
  for (const template of templates.slice().sort((a, b) => (a.template_id < b.template_id ? -1 : 1))) {
    if (!templateByCategory.has(template.category)) templateByCategory.set(template.category, template.template_id);
  }

  return {
    accountsById,
    contactsById,
    opportunitiesById,
    closedLostAccounts,
    masterByContact,
    dncAccounts,
    blockingStates,
    consentVocabulary,
    sidecarByContact,
    sidecarEmails: sidecar.map((row) => row.email),
    templateByCategory,
    templates,
    crm,
  };
}

// -------------------------------------------------------- the enumeration rule

/**
 * One firing per event the trigger rules select, ordered by (observed_at,
 * event_id). Nothing here names an event: the rules do the selecting.
 */
function enumerateFirings(events, packs) {
  const firings = [];
  for (const event of events) {
    const play_category = triggerCategory(event, packs);
    if (play_category === null) continue;
    if (play_category === OUT_OF_SCOPE_CATEGORY) continue;
    firings.push({ event, play_category });
  }
  return firings.sort((a, b) => {
    if (a.event.observed_at !== b.event.observed_at) return a.event.observed_at < b.event.observed_at ? -1 : 1;
    return a.event.event_id < b.event.event_id ? -1 : 1;
  });
}

/** The four event-triggered categories, each rule written from its own spec. */
function triggerCategory(event, packs) {
  if (event.event_type === "hire") {
    const qualifies =
      QUALIFYING_SENIORITY.includes(event.seniority) &&
      QUALIFYING_FUNCTION.includes(event.function) &&
      typeof event.start_date === "string" &&
      event.start_date >= TRIGGER_WINDOW_START &&
      event.start_date <= TRIGGER_WINDOW_END;
    return qualifies ? "new_hire" : null;
  }
  if (event.event_type === "employer_change") {
    return isId(event.prior_contact_id) && isId(event.matched_contact_id) ? "champion_reconnect" : null;
  }
  if (event.event_type === "engagement") {
    return packs.closedLostAccounts.has(event.account_id) ? "re_engagement" : null;
  }
  if (event.event_type === "visitor") {
    return isId(event.contact_id) ? "website_intent" : null;
  }
  return null;
}

const isId = (value) => typeof value === "string" && value.length > 0;

/**
 * Who the play would address, once the audience gate has let it through. The
 * new_hire subject is a person the export carries no row for, so the category
 * resolves to no contact id at all rather than to a wrong one.
 */
function triggerRecipient(event, play_category) {
  if (play_category === "champion_reconnect") return event.matched_contact_id;
  if (play_category === "re_engagement" || play_category === "website_intent") return event.contact_id;
  return null; // new_hire: the hire subject has no CRM record.
}

// -------------------------------------------------------------------- the gates

/**
 * The four gates in the taught order. The first one that stops the play decides
 * the terminal state; a play that clears all four has been sent, and what
 * happened after the send is the editorial pin.
 */
function runGates(firing, packs) {
  const { event, play_category } = firing;
  const account = packs.accountsById.get(event.account_id);
  if (!account) throw new Error(`REV-09: ${event.event_id} sits at unknown account ${event.account_id}`);

  // Audience. The play routes to the owning team before a recipient is ever
  // addressed, which is why a routed trace records no recipient.
  const inAudience =
    play_category === "re_engagement"
      ? packs.closedLostAccounts.has(account.account_id)
      : account.status === TARGET_STATUS;
  if (!inAudience) return { stage: "routed_internal", recipient_contact_id: null };

  const recipient_contact_id = triggerRecipient(event, play_category);

  // Suppression. An account-level decision ends the play before any draft.
  if (packs.dncAccounts.has(account.account_id)) {
    return { stage: "declined_suppressed", recipient_contact_id };
  }

  // Consent. A blocking state would hold the play; at these bytes none does.
  const master = recipient_contact_id ? packs.masterByContact.get(recipient_contact_id) : undefined;
  const consentBlocks = Boolean(
    master && (packs.blockingStates.has(master.consent_status) || master.suppressed === "true")
  );
  if (consentBlocks) return { stage: "held_draft", recipient_contact_id, consent_blocked: true };

  // Verification. A send requires the recipient's sidecar row, verified.
  const sidecarRow = recipient_contact_id ? packs.sidecarByContact.get(recipient_contact_id) : undefined;
  if (!sidecarRow || sidecarRow.email_status !== VERIFIED_EMAIL_STATUS) {
    return { stage: "held_draft", recipient_contact_id, consent_blocked: false };
  }

  return { stage: "sent", recipient_contact_id, consent_blocked: false };
}

// --------------------------------------------------------------- the trace rows

function buildTrace(firing, index, packs) {
  const { event, play_category } = firing;
  const gate = runGates(firing, packs);
  const trace_id = `TR-${String(index + 1).padStart(2, "0")}`;

  const row = {
    trace_id,
    play_category,
    trigger_event_id: event.event_id,
    account_id: event.account_id,
    recipient_contact_id: gate.recipient_contact_id,
    template_id: null,
    handoff_at: null,
    reply_classification: null,
    replied_at: null,
    opportunity_id: null,
    opportunity_outcome: null,
    attribution_basis: null,
    status: null,
    status_detail: null,
  };

  if (gate.stage === "routed_internal" || gate.stage === "declined_suppressed") {
    row.status = gate.stage;
    row.status_detail = STATUS_DETAIL[gate.stage];
    return finish(row, packs);
  }

  // Past the suppression screen a draft exists, so the play has a template.
  const template_id = packs.templateByCategory.get(play_category);
  if (!template_id) throw new Error(`REV-09: the REV-04 library carries no template for ${play_category}`);
  row.template_id = template_id;

  if (gate.stage === "held_draft") {
    row.status = "held_draft";
    row.status_detail = STATUS_DETAIL.held_draft;
    return finish(row, packs);
  }

  const plant = OUTCOME_PLANTS[event.event_id];
  if (!plant) throw new Error(`REV-09: ${event.event_id} was sent but carries no outcome pin`);
  row.handoff_at = plant.handoff_at;
  row.replied_at = plant.replied_at;
  row.reply_classification = plant.reply_classification;

  if (plant.opportunity_id === null) {
    row.status = "replied";
    row.status_detail = STATUS_DETAIL.replied;
    return finish(row, packs);
  }

  const opportunity = packs.opportunitiesById.get(plant.opportunity_id);
  if (!opportunity) throw new Error(`REV-09: the pinned opportunity ${plant.opportunity_id} is not in CORE-03`);
  row.opportunity_id = opportunity.opportunity_id;
  // The export's stage column as of the seed clock, read, never typed.
  row.opportunity_outcome = opportunity.stage;
  // T3-prime: the basis is decided by the created date against the handoff.
  row.attribution_basis =
    opportunity.created_date < plant.handoff_at.slice(0, 10) ? BASIS_INFLUENCED : BASIS_SOURCED;
  row.status = "closed_attributed";
  row.status_detail =
    row.reply_classification === null
      ? STATUS_DETAIL.closed_attributed_missing_reply_classification
      : STATUS_DETAIL.closed_attributed;
  return finish(row, packs);
}

/** Nulls every field the row's status does not populate. */
function finish(row, packs) {
  const allowed = STATUS_FIELDS[row.status];
  if (!allowed) throw new Error(`REV-09: ${row.trace_id} reached unenumerated status ${row.status}`);
  for (const field of TRACE_FIELDS) {
    if (!allowed.includes(field)) row[field] = null;
  }
  void packs;
  return row;
}

// --------------------------------------------------------------- the claims rows

function buildClaims(traces) {
  const traceByEvent = new Map(traces.map((row) => [row.trigger_event_id, row]));
  // One past the last trace id emitted: by construction it names no trace.
  const danglingTraceId = `TR-${String(traces.length + 1).padStart(2, "0")}`;

  return CLAIMS.map((claim) => {
    let trace_id = danglingTraceId;
    if (claim.trigger_event_id !== null) {
      const trace = traceByEvent.get(claim.trigger_event_id);
      if (!trace) throw new Error(`REV-09: ${claim.claim_id} cites ${claim.trigger_event_id}, which fired no play`);
      trace_id = trace.trace_id;
    }
    return {
      claim_id: claim.claim_id,
      claim_text: claim.claim_text,
      trace_id,
      opportunity_id: claim.opportunity_id,
      basis_claimed: claim.basis_claimed,
    };
  });
}

// ------------------------------------------------------------------ serialization

/** Fixed field order in, fixed bytes out. Nothing depends on object key order. */
function serialize(row, fields) {
  const out = {};
  for (const field of fields) out[field] = row[field] === undefined ? null : row[field];
  const extra = Object.keys(row).filter((k) => !fields.includes(k));
  if (extra.length > 0) throw new Error(`REV-09: a row carries unpinned fields ${extra.join(", ")}`);
  return JSON.stringify(out);
}

// ------------------------------------------------------------- the build guard

/**
 * The build-time guard, recomputing the log's own shape over the objects about
 * to be serialized. Every cardinality below is a plant a module brief turns on,
 * so a CORE-03, REV-01 or REV-03 reroll that moved one has to fail here rather
 * than ship a log whose teaching point has quietly moved.
 */
function assertGroundTruth({ traces, claims, packs, events, firings }) {
  const fail = (message) => {
    throw new Error(`REV-09: ${message}`);
  };

  if (traces.length === 0) fail("the trigger rules selected nothing");
  if (traces.length !== firings.length) fail("a firing was dropped between enumeration and emission");

  // Ordering and ids.
  traces.forEach((row, i) => {
    const expected = `TR-${String(i + 1).padStart(2, "0")}`;
    if (row.trace_id !== expected) fail(`row ${i + 1} is ${row.trace_id}, not ${expected}`);
    if (!STATUSES.includes(row.status)) fail(`${row.trace_id} carries unenumerated status ${row.status}`);
    if (typeof row.status_detail !== "string" || row.status_detail.length === 0) {
      fail(`${row.trace_id} carries no status_detail`);
    }
  });
  for (let i = 1; i < traces.length; i++) {
    const prev = packs_eventOf(events, traces[i - 1]);
    const cur = packs_eventOf(events, traces[i]);
    const ordered = prev.observed_at < cur.observed_at || (prev.observed_at === cur.observed_at && prev.event_id < cur.event_id);
    if (!ordered) fail(`${traces[i].trace_id} breaks the (observed_at, event_id) order`);
  }

  // Cross joins.
  const eventsById = new Map(events.map((e) => [e.event_id, e]));
  for (const row of traces) {
    const event = eventsById.get(row.trigger_event_id);
    if (!event) fail(`${row.trace_id} cites ${row.trigger_event_id}, which is not in REV-03`);
    if (event.account_id !== row.account_id) fail(`${row.trace_id} sits at a different account from its trigger`);
    if (row.recipient_contact_id !== null) {
      const master = packs.masterByContact.get(row.recipient_contact_id);
      if (!master) fail(`${row.trace_id} names a recipient with no REV-01 master row`);
      if (master.account_id !== row.account_id) fail(`${row.trace_id} names a recipient at another account`);
    }
    if (row.template_id !== null) {
      const template = packs.templates.find((t) => t.template_id === row.template_id);
      if (!template) fail(`${row.trace_id} names a template the REV-04 library does not carry`);
      if (template.category !== row.play_category) fail(`${row.trace_id} drafts from another category's template`);
      if (packs.templateByCategory.get(row.play_category) !== row.template_id) {
        fail(`${row.trace_id} does not draft from its category's lowest numbered template`);
      }
    }
  }

  // A send requires a verified sidecar row.
  for (const row of traces.filter((r) => r.status === "replied" || r.status === "closed_attributed")) {
    const sidecarRow = packs.sidecarByContact.get(row.recipient_contact_id);
    if (!sidecarRow || sidecarRow.email_status !== VERIFIED_EMAIL_STATUS) {
      fail(`${row.trace_id} was sent to a recipient with no verified sidecar row`);
    }
  }

  // The honest zero: no firing reached a blocking consent state.
  const consentHeld = firings.filter((f) => runGates(f, packs).consent_blocked === true);
  if (consentHeld.length !== 0) fail(`${consentHeld.length} firings reached a blocking consent state, not zero`);

  // C5-P1 and C5-P2, over the per-status required-link map.
  let completeLinks = 0;
  let missingOnlyReply = 0;
  let missingSomethingElse = 0;
  for (const row of traces) {
    const links = REQUIRED_LINKS[row.status];
    const missing = Object.keys(links).filter((name) => links[name].some((field) => row[field] === null));
    if (row.status === "closed_attributed" && missing.length === 0) completeLinks += 1;
    if (missing.length === 1 && missing[0] === "reply_classification") missingOnlyReply += 1;
    else if (missing.length > 0) missingSomethingElse += 1;
  }
  if (completeLinks !== 1) fail(`${completeLinks} traces carry all five resolving links, not one (C5-P1)`);
  if (missingOnlyReply !== 1) fail(`${missingOnlyReply} traces are missing exactly the reply classification, not one (C5-P2)`);
  if (missingSomethingElse !== 0) fail(`${missingSomethingElse} traces are missing some other required link, not zero`);

  // T3-prime.
  for (const row of traces) {
    if (row.handoff_at !== null) {
      const event = eventsById.get(row.trigger_event_id);
      if (!(row.handoff_at.slice(0, 10) > event.observed_at)) {
        fail(`${row.trace_id} hands off on or before its trigger's observed date`);
      }
    }
    if (row.replied_at !== null && row.handoff_at !== null && row.replied_at < row.handoff_at) {
      fail(`${row.trace_id} replies before it is handed off`);
    }
    for (const field of ["handoff_at", "replied_at"]) {
      if (row[field] !== null && row[field].slice(0, 10) > ANCHOR_DATE) fail(`${row.trace_id} carries a ${field} past the seed clock`);
    }
    if (row.opportunity_id !== null) {
      const opportunity = packs.opportunitiesById.get(row.opportunity_id);
      if (!opportunity) fail(`${row.trace_id} names an opportunity CORE-03 does not carry`);
      if (opportunity.account_id !== row.account_id) fail(`${row.trace_id} joins an opportunity at another account`);
      if (row.opportunity_outcome !== opportunity.stage) fail(`${row.trace_id} restates the export's stage column`);
      if (row.attribution_basis !== BASIS_INFLUENCED) fail(`${row.trace_id} claims ${row.attribution_basis}`);
      if (!(opportunity.created_date < row.handoff_at.slice(0, 10))) {
        fail(`${row.trace_id} joins an opportunity created on or after its handoff`);
      }
    }
  }
  const sourced = traces.filter((row) => row.attribution_basis === BASIS_SOURCED);
  if (sourced.length !== 0) fail(`${sourced.length} traces claim ${BASIS_SOURCED}, not zero`);

  // Reply classes.
  for (const row of traces) {
    if (row.reply_classification !== null && !REPLY_CLASSES.includes(row.reply_classification)) {
      fail(`${row.trace_id} carries reply class ${row.reply_classification}`);
    }
  }
  const declines = traces.filter((row) => row.reply_classification === "negative_decline");
  if (declines.length !== 0) fail(`${declines.length} replies are classed negative_decline, not zero`);

  // C5-P6 / T7.
  if (claims.length !== 3) fail(`${claims.length} attribution claims, not three`);
  const traceIds = new Set(traces.map((row) => row.trace_id));
  const dangling = claims.filter((claim) => !traceIds.has(claim.trace_id));
  if (dangling.length !== 1) fail(`${dangling.length} claims cite a trace id resolving to nothing, not one`);
  if (dangling[0].basis_claimed !== BASIS_SOURCED) fail("the dangling claim does not assert the forbidden basis");
  for (const claim of claims.filter((c) => traceIds.has(c.trace_id))) {
    const trace = traces.find((row) => row.trace_id === claim.trace_id);
    if (claim.opportunity_id !== trace.opportunity_id) fail(`${claim.claim_id} names an opportunity its trace does not`);
    if (claim.basis_claimed !== trace.attribution_basis) fail(`${claim.claim_id} claims a basis its trace does not`);
  }
  claims.forEach((claim, i) => {
    const expected = `AC-${String(i + 1).padStart(2, "0")}`;
    if (claim.claim_id !== expected) fail(`claim ${i + 1} is ${claim.claim_id}, not ${expected}`);
    if (/\d/.test(claim.claim_text)) fail(`${claim.claim_id} carries a numeral in its claim text`);
  });

  // Identity discipline: the free text carries no person, no address, no
  // consent-state word, no dash character, and no byte of the protected entry.
  const emitted = [
    ...traces.map((row) => serialize(row, TRACE_FIELDS)),
    ...claims.map((row) => serialize(row, CLAIM_FIELDS)),
  ].join("\n");
  if (emitted.includes("ct-co-148")) fail("a byte names the protected sidecar entry");
  for (const email of packs.sidecarEmails) {
    if (emitted.includes(email)) fail("a byte carries a sidecar address");
  }
  const freeText = [...traces.map((row) => row.status_detail), ...claims.map((row) => row.claim_text)];
  for (const text of freeText) {
    for (const dash of [String.fromCharCode(0x2014), String.fromCharCode(0x2013)]) {
      if (text.includes(dash)) fail(`a free-text string carries a dash character: ${text.slice(0, 60)}`);
    }
    for (const state of packs.consentVocabulary) {
      if (text.includes(state)) fail(`a free-text string names the consent state ${state}`);
    }
    for (const contact of packs.crm.contacts) {
      const name = `${contact.first_name} ${contact.last_name}`;
      if (text.includes(name) || text.includes(contact.last_name)) fail(`a free-text string names ${name}`);
    }
    for (const event of events) {
      if (typeof event.subject_name === "string" && text.includes(event.subject_name)) {
        fail(`a free-text string names a signal subject`);
      }
    }
    // One sentence: a single terminating period and no other one.
    if (!/^[^.]+\.$/.test(text)) fail(`a free-text string is not one sentence: ${text.slice(0, 60)}`);
  }
}

/** The REV-03 event a trace was built from. */
function packs_eventOf(events, row) {
  const event = events.find((e) => e.event_id === row.trigger_event_id);
  if (!event) throw new Error(`REV-09: ${row.trace_id} cites ${row.trigger_event_id}, which is not in REV-03`);
  return event;
}

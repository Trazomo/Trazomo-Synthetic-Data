// REV-09: the play-trace ground truth and the attribution claims layer, checked
// against the cluster-5 data plan's tie-out table
// (docs/plans/2026-08-29-path-programs/revenue/data-plans/cluster-5.md, sections
// 0.2, 2.1 and 4) and the REV-09 spec entry.
//
// Every rule the generator implements is implemented a SECOND time here, from
// the plan's and the spec's own words, over the same in-memory packs (CORE-03,
// REV-01, REV-03) and the same committed REV-04 bytes. No assertion below
// imports a predicate from the generator, because a test that borrows the filter
// it is checking agrees with the generator by construction and can never
// disagree with it. The emitted rows are then compared against that second
// derivation rather than read as the source of truth.
//
// REV-09 is deliberately not in the CLI registry yet (the id is registered by
// the wave that commits its bytes), so the generator module is imported
// directly rather than through generateArtifact.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { createRng } from "../../datagen/src/seed.js";
import { generate as generateRev09 } from "../../datagen/src/generators/rev-09-play-traces.js";
import { generate as generateCore03 } from "../../datagen/src/generators/core-03-crm-seed.js";
import { generate as generateRev01 } from "../../datagen/src/generators/rev-01-consent-suppression.js";
import { generate as generateRev03 } from "../../datagen/src/generators/rev-03-signal-events.js";
import { csvTable } from "../helpers/csv-table.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));

const TRACES_FILE = "play-traces.jsonl";
const CLAIMS_FILE = "attribution-claims.jsonl";

/** The spec's pinned field order, written out rather than imported. */
const TRACE_FIELDS = [
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
const CLAIM_FIELDS = ["claim_id", "claim_text", "trace_id", "opportunity_id", "basis_claimed"];

/** The spec's enumerated vocabularies, written out. */
const STATUSES = ["routed_internal", "declined_suppressed", "held_draft", "replied", "closed_attributed"];
const REPLY_CLASSES = ["positive_interest", "neutral_acknowledgement", "negative_decline"];
const BASES = ["influenced_existing", "sourced_by_play"];

/** REV-03's three trigger clauses, from its own spec entry. */
const QUALIFYING_SENIORITY = ["c_level", "vp", "head", "director"];
const QUALIFYING_FUNCTION = ["operations", "information_technology", "supply_chain"];
const TRIGGER_WINDOW = { start: "2026-02-15", end: "2026-03-16" };
const SEED_CLOCK = "2026-03-16";

/**
 * The per-status required-link map (2.1), written out. A link is missing when
 * any of its fields is null. replied_at rides with no link on purpose: TR-03's
 * defect is precise, and a test that folded the timestamp into the reply link
 * could not tell a dropped classification from a dropped reply.
 */
const REQUIRED_LINKS = {
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

/** Which fields each status populates (2.1's "fields not required are null"). */
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
 * A second opinion on the derivation below, taken from the data plan's own 0.2
 * table rather than from the generator. This is not the source of the checks: it
 * is what says the UNIVERSE moved if a reroll changes which events fire.
 */
const PLAN_TABLE = [
  { trace_id: "TR-01", trigger_event_id: "ev-0066", play_category: "champion_reconnect", account_id: "co-125", status: "replied" },
  { trace_id: "TR-02", trigger_event_id: "ev-0067", play_category: "website_intent", account_id: "co-160", status: "routed_internal" },
  { trace_id: "TR-03", trigger_event_id: "ev-0068", play_category: "website_intent", account_id: "co-125", status: "closed_attributed" },
  { trace_id: "TR-04", trigger_event_id: "ev-0069", play_category: "website_intent", account_id: "co-165", status: "routed_internal" },
  { trace_id: "TR-05", trigger_event_id: "ev-0073", play_category: "re_engagement", account_id: "co-124", status: "declined_suppressed" },
  { trace_id: "TR-06", trigger_event_id: "ev-0081", play_category: "website_intent", account_id: "co-157", status: "closed_attributed" },
  { trace_id: "TR-07", trigger_event_id: "ev-0082", play_category: "website_intent", account_id: "co-147", status: "routed_internal" },
  { trace_id: "TR-08", trigger_event_id: "ev-0085", play_category: "new_hire", account_id: "co-122", status: "held_draft" },
];

/** The plan's C5-P1 and C5-P2 subjects, and the dangling claim (C5-P6). */
const C5_P1_TRIGGER = "ev-0081";
const C5_P2_TRIGGER = "ev-0068";
const C5_P6_CLAIM = "AC-03";

// ---------------------------------------------------------------- the packs

let cachedPacks = null;
function packs() {
  if (cachedPacks) return cachedPacks;

  const core03 = generateCore03({ rng: (stream) => createRng("CORE-03", stream) });
  const crm = JSON.parse(core03.find((f) => f.path === "crm-seed.json").content);

  const rev01 = generateRev01({ rng: (stream) => createRng("REV-01", stream) });
  const master = csvTable(rev01.find((f) => f.path === "consent-suppression-master.csv").content).rows;
  const policy = JSON.parse(rev01.find((f) => f.path === "consent-policy.json").content);

  const rev03 = generateRev03({ canon, rng: (stream) => createRng("REV-03", stream) });
  const events = rev03
    .find((f) => f.path === "signal-event-logs.jsonl")
    .content.trim()
    .split("\n")
    .map((line) => JSON.parse(line));

  const sidecar = yaml.load(
    readFileSync(join(REPO_ROOT, "artifacts", "REV-04", "recipient-email-verification.yaml"), "utf8")
  ).recipients;
  const library = readTemplateLibrary();

  const opportunityAccount = new Map(crm.opportunities.map((o) => [o.opportunity_id, o.account_id]));
  const closedLostAccounts = new Set(
    crm.stage_history.filter((h) => h.to_stage === "Closed Lost").map((h) => opportunityAccount.get(h.opportunity_id))
  );

  const masterByContact = new Map(master.map((row) => [row.contact_id, row]));
  const byAccount = new Map();
  for (const row of master) {
    if (!byAccount.has(row.account_id)) byAccount.set(row.account_id, []);
    byAccount.get(row.account_id).push(row);
  }
  const dncAccounts = new Set(
    [...byAccount.entries()].filter(([, rows]) => rows.every((r) => r.do_not_contact === "true")).map(([id]) => id)
  );
  const blockingStates = new Set(
    policy.consent_states.filter((s) => s.send_permitted === "no").map((s) => s.state)
  );

  const templateByCategory = new Map();
  for (const t of library.slice().sort((a, b) => (a.template_id < b.template_id ? -1 : 1))) {
    if (!templateByCategory.has(t.category)) templateByCategory.set(t.category, t.template_id);
  }

  cachedPacks = {
    crm,
    accountsById: new Map(crm.accounts.map((a) => [a.account_id, a])),
    opportunitiesById: new Map(crm.opportunities.map((o) => [o.opportunity_id, o])),
    closedLostAccounts,
    events,
    eventsById: new Map(events.map((e) => [e.event_id, e])),
    masterByContact,
    dncAccounts,
    blockingStates,
    consentVocabulary: policy.consent_states.map((s) => s.state),
    sidecarByContact: new Map(sidecar.map((r) => [r.contact_id, r])),
    sidecarEmails: sidecar.map((r) => r.email),
    library,
    templateByCategory,
  };
  return cachedPacks;
}

/** The committed REV-04 library's TPL ids and their categories. */
function readTemplateLibrary() {
  const text = readFileSync(join(REPO_ROOT, "artifacts", "REV-04", "message-template-library.md"), "utf8");
  const out = [];
  let current = null;
  for (const line of text.split("\n")) {
    const heading = /^###\s+(TPL-\d{2})\s*$/.exec(line);
    if (heading) {
      current = { template_id: heading[1], category: null };
      out.push(current);
      continue;
    }
    const category = /^Category:\s*(\S+)\s*$/.exec(line);
    if (category && current && current.category === null) current.category = category[1];
  }
  return out;
}

// ------------------------------------------------- the test's own derivation

/** The trigger rules, re-implemented from the spec's words. */
function triggerCategory(event, p) {
  if (event.event_type === "hire") {
    return QUALIFYING_SENIORITY.includes(event.seniority) &&
      QUALIFYING_FUNCTION.includes(event.function) &&
      event.start_date >= TRIGGER_WINDOW.start &&
      event.start_date <= TRIGGER_WINDOW.end
      ? "new_hire"
      : null;
  }
  if (event.event_type === "employer_change") {
    return event.prior_contact_id && event.matched_contact_id ? "champion_reconnect" : null;
  }
  if (event.event_type === "engagement") {
    return p.closedLostAccounts.has(event.account_id) ? "re_engagement" : null;
  }
  if (event.event_type === "visitor") return event.contact_id ? "website_intent" : null;
  return null;
}

/** The firing set, ordered by (observed_at, event_id). */
function expectedFirings(p) {
  return p.events
    .map((event) => ({ event, play_category: triggerCategory(event, p) }))
    .filter((f) => f.play_category !== null)
    .sort((a, b) =>
      a.event.observed_at !== b.event.observed_at
        ? a.event.observed_at < b.event.observed_at
          ? -1
          : 1
        : a.event.event_id < b.event.event_id
          ? -1
          : 1
    );
}

const recipientOf = (event, category) =>
  category === "champion_reconnect"
    ? event.matched_contact_id
    : category === "re_engagement" || category === "website_intent"
      ? event.contact_id
      : null; // new_hire: the subject has no CRM record.

/** The four gates, re-implemented in the taught order. */
function expectedGate(firing, p) {
  const { event, play_category } = firing;
  const account = p.accountsById.get(event.account_id);
  const inAudience =
    play_category === "re_engagement"
      ? p.closedLostAccounts.has(account.account_id)
      : account.status === "target";
  if (!inAudience) return { status: "routed_internal", recipient: null, template: null };

  const recipient = recipientOf(event, play_category);
  const template = p.templateByCategory.get(play_category);
  if (p.dncAccounts.has(account.account_id)) {
    return { status: "declined_suppressed", recipient, template: null };
  }
  const row = recipient ? p.masterByContact.get(recipient) : undefined;
  if (row && (p.blockingStates.has(row.consent_status) || row.suppressed === "true")) {
    return { status: "held_draft", recipient, template, consent_blocked: true };
  }
  const sidecarRow = recipient ? p.sidecarByContact.get(recipient) : undefined;
  if (!sidecarRow || sidecarRow.email_status !== "verified") {
    return { status: "held_draft", recipient, template, consent_blocked: false };
  }
  return { status: "sent", recipient, template, consent_blocked: false };
}

// ------------------------------------------------------------------ the bytes

let cachedFiles = null;
function rev09() {
  if (cachedFiles) return cachedFiles;
  const files = generateRev09({ spec: specs.byId.get("REV-09"), canon, rng: (s) => createRng("REV-09", s) });
  const traceFile = files.find((f) => f.path === TRACES_FILE);
  const claimFile = files.find((f) => f.path === CLAIMS_FILE);
  assert.ok(traceFile, `REV-09 emits no ${TRACES_FILE}`);
  assert.ok(claimFile, `REV-09 emits no ${CLAIMS_FILE}`);
  cachedFiles = {
    files,
    traceText: traceFile.content,
    claimText: claimFile.content,
    traceLines: traceFile.content.trim().split("\n"),
    claimLines: claimFile.content.trim().split("\n"),
    traces: traceFile.content.trim().split("\n").map((l) => JSON.parse(l)),
    claims: claimFile.content.trim().split("\n").map((l) => JSON.parse(l)),
  };
  return cachedFiles;
}

const missingLinks = (row) => {
  const links = REQUIRED_LINKS[row.status];
  return Object.keys(links).filter((name) => links[name].some((field) => row[field] === null));
};

// ------------------------------------------------------------------- the tests

test("REV-09: the generator emits exactly the two pinned files", () => {
  const { files } = rev09();
  assert.deepEqual(files.map((f) => f.path).sort(), [CLAIMS_FILE, TRACES_FILE]);
  for (const file of files) assert.ok(file.content.endsWith("\n"), `${file.path} does not end with a newline`);
});

test("REV-09: the trace set equals the rule-enumerated set, no extra and no missing", () => {
  const p = packs();
  const expected = expectedFirings(p);
  const { traces } = rev09();

  assert.equal(traces.length, expected.length, "the emitted trace count is not the firing count");
  assert.deepEqual(
    traces.map((t) => t.trigger_event_id),
    expected.map((f) => f.event.event_id),
    "the emitted triggers are not the rule-enumerated firings in (observed_at, event_id) order"
  );
  assert.deepEqual(
    traces.map((t) => t.play_category),
    expected.map((f) => f.play_category),
    "an emitted play category disagrees with its trigger rule"
  );
  for (const trace of traces) {
    assert.notEqual(trace.play_category, "general_intro", "general_intro is out of scope for the trace log");
  }
});

test("REV-09: trace ids are TR-NN, zero padded and sequential in file order", () => {
  const { traces } = rev09();
  traces.forEach((row, i) => {
    assert.equal(row.trace_id, `TR-${String(i + 1).padStart(2, "0")}`, "a trace id is out of sequence");
  });
  assert.equal(new Set(traces.map((r) => r.trace_id)).size, traces.length, "a trace id repeats");
});

test("REV-09: the universe still matches the data plan's own 0.2 table", () => {
  const { traces } = rev09();
  assert.equal(traces.length, PLAN_TABLE.length, "the firing count moved away from the plan");
  traces.forEach((row, i) => {
    const pinned = PLAN_TABLE[i];
    assert.equal(row.trace_id, pinned.trace_id);
    assert.equal(row.trigger_event_id, pinned.trigger_event_id, `${pinned.trace_id} fires on another event`);
    assert.equal(row.play_category, pinned.play_category, `${pinned.trace_id} carries another category`);
    assert.equal(row.account_id, pinned.account_id, `${pinned.trace_id} sits at another account`);
    assert.equal(row.status, pinned.status, `${pinned.trace_id} reached another terminal status`);
  });
});

test("REV-09: field order is pinned on every row, first row included", () => {
  const { traceLines, claimLines } = rev09();
  assert.deepEqual(
    Object.keys(JSON.parse(traceLines[0])),
    TRACE_FIELDS,
    "the first trace row's field order moved"
  );
  for (const line of traceLines) assert.deepEqual(Object.keys(JSON.parse(line)), TRACE_FIELDS);
  assert.deepEqual(Object.keys(JSON.parse(claimLines[0])), CLAIM_FIELDS, "the first claim row's field order moved");
  for (const line of claimLines) assert.deepEqual(Object.keys(JSON.parse(line)), CLAIM_FIELDS);
});

test("REV-09: the gates in the taught order decide every terminal status", () => {
  const p = packs();
  const expected = expectedFirings(p);
  const { traces } = rev09();

  traces.forEach((row, i) => {
    const gate = expectedGate(expected[i], p);
    const status = gate.status === "sent" ? (row.opportunity_id ? "closed_attributed" : "replied") : gate.status;
    assert.equal(row.status, status, `${row.trace_id}: the gates decide ${status}`);
    assert.equal(row.recipient_contact_id, gate.recipient ?? null, `${row.trace_id}: the recipient the gates resolve`);
    if (gate.status === "routed_internal" || gate.status === "declined_suppressed") {
      assert.equal(row.template_id, null, `${row.trace_id}: the play ended before a draft was written`);
    } else {
      assert.equal(row.template_id, gate.template, `${row.trace_id}: the drafting template`);
    }
  });
});

test("REV-09: the consent gate's honest zero, no firing reaches a blocking state", () => {
  const p = packs();
  const blocked = expectedFirings(p).filter((f) => expectedGate(f, p).consent_blocked === true);
  assert.equal(blocked.length, 0, "a firing reached a blocking consent state, so the spec's honest zero is stale");
});

test("REV-09: C5-P1, exactly one trace's five links all resolve in their packs", () => {
  const p = packs();
  const { traces } = rev09();

  const complete = traces.filter((row) => {
    if (row.status !== "closed_attributed" || missingLinks(row).length > 0) return false;
    const event = p.eventsById.get(row.trigger_event_id);
    if (!event || event.account_id !== row.account_id) return false;
    const template = p.library.find((t) => t.template_id === row.template_id);
    if (!template || template.category !== row.play_category) return false;
    if (p.templateByCategory.get(row.play_category) !== row.template_id) return false;
    if (!REPLY_CLASSES.includes(row.reply_classification)) return false;
    const opportunity = p.opportunitiesById.get(row.opportunity_id);
    return Boolean(opportunity) && opportunity.account_id === row.account_id;
  });

  assert.equal(complete.length, 1, "the count of fully resolving traces is not one (C5-P1)");
  assert.equal(complete[0].trigger_event_id, C5_P1_TRIGGER, "C5-P1 sits on another firing than the plan's");
});

test("REV-09: C5-P2, exactly one trace is missing exactly its reply classification and nothing else", () => {
  const { traces } = rev09();
  const onlyReply = traces.filter((row) => {
    const missing = missingLinks(row);
    return missing.length === 1 && missing[0] === "reply_classification";
  });
  const otherwiseIncomplete = traces.filter((row) => {
    const missing = missingLinks(row);
    return missing.length > 0 && !(missing.length === 1 && missing[0] === "reply_classification");
  });

  assert.equal(onlyReply.length, 1, "the count of traces missing exactly the reply classification is not one (C5-P2)");
  assert.equal(otherwiseIncomplete.length, 0, "a trace is missing some other required link");
  assert.equal(onlyReply[0].trigger_event_id, C5_P2_TRIGGER, "C5-P2 sits on another firing than the plan's");
  assert.notEqual(onlyReply[0].replied_at, null, "C5-P2's defect must be precise: the reply timestamp is present");
});

test("REV-09: T3-prime, every handoff's calendar date is strictly later than its trigger", () => {
  const p = packs();
  const { traces } = rev09();
  const handed = traces.filter((row) => row.handoff_at !== null);
  assert.ok(handed.length > 0, "no trace carries a handoff, so the rule would be vacuous");
  for (const row of handed) {
    const observed = p.eventsById.get(row.trigger_event_id).observed_at;
    assert.ok(
      row.handoff_at.slice(0, 10) > observed,
      `${row.trace_id} hands off on ${row.handoff_at} which is not strictly later than ${observed}`
    );
  }
});

test("REV-09: T3-prime, replied_at is at or after handoff_at and nothing passes the seed clock", () => {
  const { traces } = rev09();
  for (const row of traces) {
    if (row.replied_at !== null) {
      assert.notEqual(row.handoff_at, null, `${row.trace_id} replies to a message never handed off`);
      assert.ok(row.replied_at >= row.handoff_at, `${row.trace_id} replies before its handoff`);
    }
    for (const field of ["handoff_at", "replied_at"]) {
      if (row[field] === null) continue;
      assert.match(row[field], /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, `${row.trace_id}: ${field} is not ISO UTC`);
      assert.ok(row[field].slice(0, 10) <= SEED_CLOCK, `${row.trace_id}: ${field} passes the seed clock`);
    }
  }
});

test("REV-09: T3-prime, every attributed trace is influenced_existing over an earlier opportunity", () => {
  const p = packs();
  const { traces } = rev09();
  const attributed = traces.filter((row) => row.opportunity_id !== null);
  assert.ok(attributed.length > 0, "no trace carries an opportunity, so the rule would be vacuous");
  for (const row of attributed) {
    const opportunity = p.opportunitiesById.get(row.opportunity_id);
    assert.ok(opportunity, `${row.trace_id} names an opportunity CORE-03 does not carry`);
    assert.equal(opportunity.account_id, row.account_id, `${row.trace_id} joins an opportunity at another account`);
    assert.equal(
      row.opportunity_outcome,
      opportunity.stage,
      `${row.trace_id}: opportunity_outcome is the export's stage column as of the seed clock`
    );
    assert.equal(row.attribution_basis, "influenced_existing", `${row.trace_id} declares another basis`);
    assert.ok(
      opportunity.created_date < row.handoff_at.slice(0, 10),
      `${row.trace_id}: created_date ${opportunity.created_date} does not strictly precede the handoff`
    );
  }
});

test("REV-09: T3-prime, the count of sourced_by_play traces is zero", () => {
  const p = packs();
  const { traces } = rev09();
  assert.equal(
    traces.filter((row) => row.attribution_basis === "sourced_by_play").length,
    0,
    "a trace claims sourcing, which the created-date rule forbids over these bytes"
  );
  const latest = [...p.opportunitiesById.values()].map((o) => o.created_date).sort().pop();
  const earliestHandoff = traces
    .filter((r) => r.handoff_at !== null)
    .map((r) => r.handoff_at.slice(0, 10))
    .sort()[0];
  assert.ok(
    latest < earliestHandoff,
    "the export's latest created_date no longer precedes the trigger window, so T3-prime's premise moved"
  );
});

test("REV-09: T7, exactly one claim cites a trace id that resolves to nothing", () => {
  const { traces, claims } = rev09();
  const traceIds = new Set(traces.map((row) => row.trace_id));
  const dangling = claims.filter((c) => !traceIds.has(c.trace_id));
  const resolving = claims.filter((c) => traceIds.has(c.trace_id));

  assert.equal(claims.length, 3, "the claims layer is not three rows");
  assert.equal(dangling.length, 1, "the count of claims citing no trace is not one (C5-P6)");
  assert.equal(resolving.length, 2, "the count of claims citing a real trace is not two");
  assert.equal(dangling[0].claim_id, C5_P6_CLAIM, "the dangling claim moved off AC-03");
  assert.equal(
    dangling[0].basis_claimed,
    "sourced_by_play",
    "the dangling claim must also assert the basis the created-date rule forbids"
  );
  assert.ok(BASES.includes(dangling[0].basis_claimed), "the claimed basis is outside the vocabulary");
});

test("REV-09: the two resolving claims are consistent with the traces they cite", () => {
  const { traces, claims } = rev09();
  const byId = new Map(traces.map((row) => [row.trace_id, row]));
  claims.forEach((claim, i) => {
    assert.equal(claim.claim_id, `AC-${String(i + 1).padStart(2, "0")}`, "a claim id is out of sequence");
    const trace = byId.get(claim.trace_id);
    if (!trace) return;
    assert.equal(claim.opportunity_id, trace.opportunity_id, `${claim.claim_id} names an opportunity its trace does not`);
    assert.equal(claim.basis_claimed, trace.attribution_basis, `${claim.claim_id} claims a basis its trace does not`);
  });
});

test("REV-09: every trigger_event_id resolves in REV-03 and its event's account matches", () => {
  const p = packs();
  const { traces } = rev09();
  for (const row of traces) {
    const event = p.eventsById.get(row.trigger_event_id);
    assert.ok(event, `${row.trace_id} cites ${row.trigger_event_id}, which REV-03 does not carry`);
    assert.equal(event.account_id, row.account_id, `${row.trace_id} sits at a different account from its trigger`);
    assert.ok(p.accountsById.has(row.account_id), `${row.trace_id} names an account CORE-03 does not carry`);
  }
});

test("REV-09: every recipient resolves in the REV-01 master at the trace's own account", () => {
  const p = packs();
  const { traces } = rev09();
  const named = traces.filter((row) => row.recipient_contact_id !== null);
  assert.ok(named.length > 0, "no trace names a recipient, so the rule would be vacuous");
  for (const row of named) {
    const master = p.masterByContact.get(row.recipient_contact_id);
    assert.ok(master, `${row.trace_id} names a recipient with no REV-01 master row`);
    assert.equal(master.account_id, row.account_id, `${row.trace_id} names a recipient at another account`);
  }
});

test("REV-09: every sending trace's recipient carries a verified sidecar row", () => {
  const p = packs();
  const { traces } = rev09();
  const sending = traces.filter((row) => row.status === "replied" || row.status === "closed_attributed");
  assert.ok(sending.length > 0, "no trace was sent, so the verification rule would be vacuous");
  for (const row of sending) {
    const sidecarRow = p.sidecarByContact.get(row.recipient_contact_id);
    assert.ok(sidecarRow, `${row.trace_id} was sent to a recipient with no sidecar row`);
    assert.equal(sidecarRow.email_status, "verified", `${row.trace_id} was sent to an unverified address`);
  }
  const held = traces.filter((row) => row.status === "held_draft");
  for (const row of held) {
    const sidecarRow = row.recipient_contact_id ? p.sidecarByContact.get(row.recipient_contact_id) : undefined;
    assert.ok(
      !sidecarRow || sidecarRow.email_status !== "verified",
      `${row.trace_id} holds a draft whose recipient is verified, so the hold has no basis`
    );
  }
});

test("REV-09: a drafting play uses its category's lowest numbered template", () => {
  const p = packs();
  const { traces } = rev09();
  const drafting = traces.filter((row) => row.template_id !== null);
  assert.ok(drafting.length > 0, "no trace drafts, so the template rule would be vacuous");
  for (const row of drafting) {
    const template = p.library.find((t) => t.template_id === row.template_id);
    assert.ok(template, `${row.trace_id} names a template the REV-04 library does not carry`);
    assert.equal(template.category, row.play_category, `${row.trace_id} drafts from another category's template`);
    const lowest = p.library
      .filter((t) => t.category === row.play_category)
      .map((t) => t.template_id)
      .sort()[0];
    assert.equal(row.template_id, lowest, `${row.trace_id} does not draft from the lowest numbered template`);
  }
});

test("REV-09: reply classes sit inside the pinned enum and negative_decline occurs zero times", () => {
  const { traces } = rev09();
  for (const row of traces) {
    if (row.reply_classification === null) continue;
    assert.ok(REPLY_CLASSES.includes(row.reply_classification), `${row.trace_id} carries an unenumerated reply class`);
  }
  assert.equal(
    traces.filter((row) => row.reply_classification === "negative_decline").length,
    0,
    "negative_decline occurs, so the spec's honest zero is stale"
  );
});

test("REV-09: statuses are enumerated and each row carries only its status's own fields", () => {
  const { traces } = rev09();
  for (const row of traces) {
    assert.ok(STATUSES.includes(row.status), `${row.trace_id} carries an unenumerated status`);
    const allowed = STATUS_FIELDS[row.status];
    for (const field of TRACE_FIELDS) {
      if (allowed.includes(field)) continue;
      assert.equal(row[field], null, `${row.trace_id} (${row.status}) populates ${field}, which its status does not use`);
    }
    for (const field of ["trace_id", "play_category", "trigger_event_id", "account_id", "status", "status_detail"]) {
      assert.notEqual(row[field], null, `${row.trace_id} leaves ${field} null`);
    }
  }
});

test("REV-09: status_detail is one factual sentence with no name, address or consent state", () => {
  const p = packs();
  const { traces } = rev09();
  for (const row of traces) {
    const text = row.status_detail;
    assert.match(text, /^[^.]+\.$/, `${row.trace_id}'s status_detail is not one sentence`);
    assert.ok(!/[–—]/.test(text), `${row.trace_id}'s status_detail carries a dash character`);
    assert.ok(!text.includes("@"), `${row.trace_id}'s status_detail carries an address`);
    for (const state of p.consentVocabulary) {
      assert.ok(!text.includes(state), `${row.trace_id}'s status_detail names the consent state ${state}`);
    }
  }
});

test("REV-09: claim_text carries no numeral and no person name", () => {
  const { claims } = rev09();
  for (const claim of claims) {
    assert.match(claim.claim_text, /^[^.]+\.$/, `${claim.claim_id}'s claim_text is not one sentence`);
    assert.ok(!/\d/.test(claim.claim_text), `${claim.claim_id}'s claim_text carries a numeral`);
    assert.ok(!/[–—]/.test(claim.claim_text), `${claim.claim_id}'s claim_text carries a dash character`);
  }
});

test("REV-09: identity screens over both files, no protected entry, address, contact or subject name", () => {
  const p = packs();
  const { traceText, claimText } = rev09();
  const bytes = traceText + claimText;

  assert.ok(!bytes.includes("ct-co-148"), "a byte names the protected sidecar entry");
  assert.ok(!bytes.includes("co-148"), "a byte names the protected entry's account");
  for (const email of p.sidecarEmails) {
    assert.ok(!bytes.includes(email), "a byte carries a sidecar address");
  }
  assert.ok(!bytes.includes("@"), "a byte carries an address");
  for (const contact of p.crm.contacts) {
    const full = `${contact.first_name} ${contact.last_name}`;
    assert.ok(!bytes.includes(full), `a byte names the contact ${full}`);
    assert.ok(!bytes.includes(contact.last_name), `a byte carries the contact surname ${contact.last_name}`);
  }
  for (const event of p.events) {
    if (typeof event.subject_name !== "string") continue;
    assert.ok(!bytes.includes(event.subject_name), "a byte names a REV-03 signal subject");
    for (const part of event.subject_name.split(" ")) {
      assert.ok(!bytes.includes(part), `a byte carries the subject name part ${part}`);
    }
  }
});

test("REV-09: two invocations produce byte-identical output", () => {
  const runA = generateRev09({ spec: specs.byId.get("REV-09"), canon, rng: (s) => createRng("REV-09", s) });
  const runB = generateRev09({ spec: specs.byId.get("REV-09"), canon, rng: (s) => createRng("REV-09", s) });
  assert.equal(runA.length, runB.length, "a different number of files between runs");
  for (let i = 0; i < runA.length; i++) {
    assert.equal(runA[i].path, runB[i].path, "file path order differs between runs");
    assert.equal(runA[i].content, runB[i].content, `${runA[i].path} content differs between runs`);
  }
});

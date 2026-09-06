// REV-03: the signal event log, checked against the cluster-3 data plan's
// tie-out table (docs/plans/2026-08-29-path-programs/revenue/data-plans/
// cluster-3.md, sections 2.1 and 4).
//
// Everything below is re-derived from the EMITTED bytes. The three-clause
// trigger rule and the per-contact-row fuzzy-match rule are implemented a second
// time in this file, from the plan's own words, and the generator's own
// functions and tables are never imported for the assertion side: a test that
// imports the rule it is checking agrees with the generator by construction and
// can never disagree with it. Same reason nothing below names a row id: every
// plant is selected by its published rule and counted, so a CORE-03 reroll that
// moves a plant to another row keeps passing and a reroll that loses one fails
// by name.
//
// The comparison side reads the COMMITTED CORE-03 CSVs rather than re-running
// CORE-03, so a log that stopped joining the bytes on disk fails here even if
// both generators drifted together.
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

const OUTPUT_FILE = "signal-event-logs.jsonl";

/** The seed clock and the two windows the plan pins (0.7, U1). */
const ANCHOR = "2026-03-16";
const OBSERVED_WINDOW = { start: "2026-03-01", end: ANCHOR };
const TRIGGER_WINDOW = { start: "2026-02-15", end: ANCHOR };

/** The design-table volumes (U3). Written out rather than imported. */
const VOLUMES = {
  hire: 12,
  employer_change: 4,
  engagement: 10,
  visitor: 8,
  competitor_mention: 28,
  hiring_velocity: 30,
};
const TOTAL_EVENTS = Object.values(VOLUMES).reduce((a, b) => a + b, 0);

/** The common key prefix every event carries, in order. */
const COMMON_KEYS = ["event_id", "event_type", "account_id", "observed_at", "source"];

/** The type payloads, in the order section 2.1's table states them. */
const PAYLOAD_KEYS = {
  hire: ["subject_name", "title", "seniority", "function", "start_date"],
  employer_change: [
    "subject_name", "new_title", "prior_account_id", "prior_contact_id", "matched_contact_id",
    "subject_prior_name", "match_basis",
  ],
  engagement: ["contact_id", "channel", "detail"],
  visitor: ["contact_id", "company_domain", "pages", "visit_count"],
  competitor_mention: ["competitor", "snippet", "weight"],
  hiring_velocity: ["hires_90d", "weight"],
};

/** The trigger rule's two target sets, from the plan's clauses 1 and 2. */
const TRIGGER_SENIORITY = ["c_level", "vp", "head", "director"];
const TRIGGER_FUNCTION = ["operations", "information_technology", "supply_chain"];

const ENGAGEMENT_CHANNELS = ["webinar_signup", "content_download", "reply"];

/** The canon competitor whose name is the only company a mention may carry. */
const COMPETITOR_CANON_ID = "co-121";

/**
 * The trigger rule, re-implemented here from the plan's three clauses rather
 * than imported. Returns the clauses the event FAILS, so "fails exactly one"
 * and "fails at least two" are both counted off the same function.
 */
function failedClauses(event) {
  const failed = [];
  if (!TRIGGER_SENIORITY.includes(event.seniority)) failed.push("seniority");
  if (!TRIGGER_FUNCTION.includes(event.function)) failed.push("function");
  if (event.start_date < TRIGGER_WINDOW.start || event.start_date > TRIGGER_WINDOW.end) failed.push("start_date");
  return failed;
}

/** The email domain of a CORE-03 contact row. */
function emailDomain(email) {
  const at = email.indexOf("@");
  assert.ok(at > 0, `CORE-03 email ${JSON.stringify(email)} carries no domain`);
  return email.slice(at + 1);
}

/**
 * The fuzzy-match rule, re-implemented from the plan's own words: a domain
 * matches a contact when it byte-equals that contact's email domain, COUNTED PER
 * CONTACT ROW and never per account (0.6, B5).
 */
function matchingRows(domain, contacts) {
  return contacts.filter((c) => emailDomain(c.email) === domain);
}

let cached = null;
function rev03() {
  if (cached) return cached;
  const files = generateArtifact(specs.byId.get("REV-03"), canon);
  const content = fileByPath(files, OUTPUT_FILE).content;
  const lines = content.split("\n");
  assert.equal(lines[lines.length - 1], "", "the jsonl file does not end in a newline");
  const events = lines.slice(0, -1).map((line, i) => {
    let parsed;
    assert.doesNotThrow(() => { parsed = JSON.parse(line); }, `line ${i + 1} is not valid JSON`);
    return parsed;
  });
  cached = { files, content, lines: lines.slice(0, -1), events };
  return cached;
}

/** The committed CORE-03 tables: the comparison side of every join below. */
let cachedCore03 = null;
function core03() {
  if (cachedCore03) return cachedCore03;
  const read = (name) =>
    csvTable(readFileSync(join(REPO_ROOT, "datasets", "core", "crm-seed-dataset", name), "utf8")).rows;
  cachedCore03 = {
    accounts: read("accounts.csv"),
    contacts: read("contacts.csv"),
    opportunities: read("opportunities.csv"),
    stageHistory: read("stage_history.csv"),
  };
  return cachedCore03;
}

function statusOf(accountId) {
  const account = core03().accounts.find((a) => a.account_id === accountId);
  assert.ok(account, `${accountId} is not a committed CORE-03 account`);
  return account.status;
}

const eventsOfType = (type) => rev03().events.filter((e) => e.event_type === type);

// ------------------------------------------------------------------ the shape

test("REV-03: one file, every line parses as one JSON object, 92 events", () => {
  const { files, lines, events } = rev03();
  assert.deepEqual(files.map((f) => f.path), [OUTPUT_FILE]);
  assert.equal(lines.length, TOTAL_EVENTS, `the log carries ${lines.length} lines, not ${TOTAL_EVENTS}`);
  assert.equal(events.length, TOTAL_EVENTS);
  for (const [i, line] of lines.entries()) {
    assert.ok(!line.includes("\n"), `line ${i + 1} is not a single line`);
    assert.equal(typeof rev03().events[i], "object", `line ${i + 1} is not a JSON object`);
    assert.ok(!Array.isArray(rev03().events[i]), `line ${i + 1} is an array, not an object`);
  }
});

test("REV-03: the common key order, the type payload order and the ev-NNNN sequence", () => {
  const { events } = rev03();
  events.forEach((event, index) => {
    assert.equal(
      event.event_id,
      `ev-${String(index + 1).padStart(4, "0")}`,
      `event ${index + 1} carries event_id ${event.event_id}`
    );
    const payload = PAYLOAD_KEYS[event.event_type];
    assert.ok(payload, `${event.event_id} carries unpublished type ${event.event_type}`);
    // subject_prior_name is present exactly when prior_contact_id is (2.1), so
    // the expected key list is the payload list minus that one key when absent.
    const expected =
      event.event_type === "employer_change" && event.prior_contact_id === null
        ? payload.filter((k) => k !== "subject_prior_name")
        : payload;
    assert.deepEqual(
      Object.keys(event),
      [...COMMON_KEYS, ...expected],
      `${event.event_id} does not carry the published key order`
    );
  });
  // The ids are unique and the log reads in id order.
  assert.equal(new Set(events.map((e) => e.event_id)).size, TOTAL_EVENTS, "an event_id appears twice");
});

test("REV-03: the type set and the design-table volumes", () => {
  const { events } = rev03();
  const tally = {};
  for (const event of events) tally[event.event_type] = (tally[event.event_type] ?? 0) + 1;
  assert.deepEqual(
    Object.keys(tally).sort(),
    Object.keys(VOLUMES).sort(),
    "the log's type set is not the six published types"
  );
  for (const [type, count] of Object.entries(VOLUMES)) {
    assert.equal(tally[type], count, `${tally[type]} ${type} events, not ${count}`);
  }
});

// ------------------------------------------------------------------ tie-outs

test("REV-C3-T1: every account_id and contact_id resolves, and every observed_at sits in the as-of window", () => {
  const { events } = rev03();
  const { accounts, contacts } = core03();
  const accountIds = new Set(accounts.map((a) => a.account_id));
  const contactsById = new Map(contacts.map((c) => [c.contact_id, c]));

  for (const event of events) {
    assert.ok(accountIds.has(event.account_id), `${event.event_id} names account ${event.account_id}`);
    assert.match(event.observed_at, /^\d{4}-\d{2}-\d{2}$/, `${event.event_id} observed_at is not an ISO date`);
    assert.ok(
      event.observed_at >= OBSERVED_WINDOW.start && event.observed_at <= OBSERVED_WINDOW.end,
      `${event.event_id} was observed on ${event.observed_at}, outside [${OBSERVED_WINDOW.start}, ${OBSERVED_WINDOW.end}]`
    );
    assert.equal(typeof event.source, "string");
    assert.notEqual(event.source, "", `${event.event_id} carries an empty source`);

    // Every contact id resolves AT the account the event states, which is what
    // makes the log joinable rather than merely well-formed.
    const resolves = (contactId, accountId, field) => {
      if (contactId === null || contactId === undefined) return;
      const contact = contactsById.get(contactId);
      assert.ok(contact, `${event.event_id} ${field} ${contactId} is not a committed CORE-03 contact`);
      assert.equal(
        contact.account_id,
        accountId,
        `${event.event_id} ${field} ${contactId} does not sit at ${accountId}`
      );
    };
    resolves(event.contact_id, event.account_id, "contact_id");
    resolves(event.matched_contact_id, event.account_id, "matched_contact_id");
    resolves(event.prior_contact_id, event.prior_account_id, "prior_contact_id");
    if (event.prior_account_id !== null && event.prior_account_id !== undefined) {
      assert.ok(accountIds.has(event.prior_account_id), `${event.event_id} names prior account ${event.prior_account_id}`);
    }
  }
});

test("REV-C3-T2: exactly one hire satisfies all three trigger clauses and exactly one fails exactly one", () => {
  const hires = eventsOfType("hire");

  const qualifying = hires.filter((e) => failedClauses(e).length === 0);
  assert.equal(qualifying.length, 1, "the qualifying hire is not a single event");
  assert.equal(statusOf(qualifying[0].account_id), "target", "the qualifying hire does not sit at a target account");

  const nearMiss = hires.filter((e) => failedClauses(e).length === 1);
  assert.equal(nearMiss.length, 1, "the noise hire is not a single event");
  assert.deepEqual(failedClauses(nearMiss[0]), ["function"], "the noise hire fails a clause other than the function clause");
  assert.equal(
    statusOf(nearMiss[0].account_id),
    "closed_lost",
    "the noise hire does not sit at the closed-lost account"
  );
  assert.notEqual(nearMiss[0].account_id, qualifying[0].account_id, "both hire plants sit at the same account");

  // Every other hire fails at least two clauses, which is what makes the two
  // cardinalities above decided by the two plants and by nothing else.
  for (const event of hires) {
    if (event === qualifying[0] || event === nearMiss[0]) continue;
    assert.ok(
      failedClauses(event).length >= 2,
      `${event.event_id} fails ${failedClauses(event).length} clause(s), so it is a third teaching case`
    );
  }

  // The classification is explicit provider metadata, never parsed out of the
  // title: a clause that needed NLP would not be mechanical (U4).
  for (const event of hires) {
    assert.equal(typeof event.seniority, "string");
    assert.equal(typeof event.function, "string");
    assert.match(event.start_date, /^\d{4}-\d{2}-\d{2}$/, `${event.event_id} start_date is not an ISO date`);
    assert.notEqual(event.subject_name, "", `${event.event_id} carries an empty subject_name`);
  }

  // Hire subjects have no CRM record yet (2.1, B10), so none of them is a
  // CORE-03 contact.
  const contactNames = new Set(core03().contacts.map((c) => `${c.first_name} ${c.last_name}`));
  for (const event of hires) {
    assert.ok(!contactNames.has(event.subject_name), `the hire subject ${event.subject_name} is already a CRM contact`);
  }
});

test("REV-C3-T3-prime: exactly one employer-change event carries both contact ids, off accounts.csv status", () => {
  const moves = eventsOfType("employer_change");
  const contactsById = new Map(core03().contacts.map((c) => [c.contact_id, c]));

  const both = moves.filter((e) => e.prior_contact_id !== null && e.matched_contact_id !== null);
  assert.equal(both.length, 1, "the champion move is not a single event");
  const champion = both[0];

  assert.notEqual(champion.prior_contact_id, champion.matched_contact_id, "the champion's two contact ids are the same id");
  assert.equal(statusOf(champion.prior_account_id), "customer", "the champion's prior account is not a customer account");
  assert.equal(statusOf(champion.account_id), "target", "the champion's new employer is not a target account");
  assert.equal(champion.match_basis, "employment_history", "the champion event's match basis is not employment history");

  const prior = contactsById.get(champion.prior_contact_id);
  const matched = contactsById.get(champion.matched_contact_id);
  assert.equal(
    champion.subject_prior_name,
    `${prior.first_name} ${prior.last_name}`,
    "subject_prior_name does not byte-equal the prior record's name"
  );
  // The prior record is the sole contact of its account, and the matched record
  // is the unique contact at the new employer sharing its first name and title.
  assert.equal(
    core03().contacts.filter((c) => c.account_id === prior.account_id).length,
    1,
    "the champion's prior account no longer holds exactly one contact"
  );
  const namesakes = core03().contacts.filter(
    (c) => c.account_id === champion.account_id && c.first_name === prior.first_name && c.title === prior.title
  );
  assert.equal(namesakes.length, 1, "the matched record is not unique on first name and title at the new employer");
  assert.equal(namesakes[0].contact_id, matched.contact_id);
  // Name equality cannot be the join key: the two records share no surname (0.3).
  assert.notEqual(matched.last_name, prior.last_name, "the champion's two records share a surname");

  // Zero Closed Won opportunities exist anywhere in CORE-03 (0.1), which is why
  // the won relationship is read off accounts.csv status and off this event's
  // employment-history payload rather than off a stage.
  assert.equal(
    core03().opportunities.filter((o) => o.stage === "Closed Won").length,
    0,
    "a Closed Won opportunity now exists, so T3 no longer needs its prime form"
  );

  // The population movers carry at most one of the two ids and a weaker basis,
  // and subject_prior_name is present exactly when a prior record is cited.
  for (const event of moves) {
    const carriesPrior = event.prior_contact_id !== null;
    assert.equal(
      Object.prototype.hasOwnProperty.call(event, "subject_prior_name"),
      carriesPrior,
      `${event.event_id} carries subject_prior_name out of step with prior_contact_id`
    );
    if (event === champion) continue;
    const ids = [event.prior_contact_id, event.matched_contact_id].filter((v) => v !== null);
    assert.ok(ids.length <= 1, `${event.event_id} carries both contact ids beside the champion event`);
    assert.notEqual(event.match_basis, "employment_history", `${event.event_id} claims the champion's match basis`);
    assert.notEqual(event.match_basis, "", `${event.event_id} carries no match_basis`);
  }
});

test("REV-C3-T4: the re-engagement event postdates the Closed Lost transition and stands alone", () => {
  const { opportunities, stageHistory, contacts } = core03();

  // The accounts carrying a Closed Lost transition, re-derived from the
  // committed stage history rather than assumed.
  const accountByOpportunity = new Map(opportunities.map((o) => [o.opportunity_id, o.account_id]));
  const lossByAccount = new Map();
  for (const row of stageHistory) {
    if (row.to_stage !== "Closed Lost") continue;
    lossByAccount.set(accountByOpportunity.get(row.opportunity_id), row.changed_date);
  }
  assert.ok(lossByAccount.size > 0, "CORE-03 carries no Closed Lost transition at all");

  const engagements = eventsOfType("engagement");
  const atLoss = engagements.filter((e) => lossByAccount.has(e.account_id));
  assert.equal(atLoss.length, 1, "the closed-lost re-engagement is not a single event");
  const plant = atLoss[0];
  const lossDate = lossByAccount.get(plant.account_id);
  assert.ok(
    plant.observed_at > lossDate,
    `the re-engagement event was observed on ${plant.observed_at}, not strictly after ${lossDate}`
  );
  assert.ok(plant.observed_at <= ANCHOR, "the re-engagement event was observed past the seed clock");

  // Its contact is the closed-lost-account contact whose consent state is not an
  // honored opt-out: the signal looks individually actionable, and the account
  // overlay is what blocks it (0.4, B4).
  const own = contacts.filter((c) => c.account_id === plant.account_id);
  const notOptedOut = own.filter((c) => c.consent_status !== "opted_out");
  assert.equal(notOptedOut.length, 1, "the closed-lost account no longer holds exactly one non-opted-out contact");
  assert.equal(plant.contact_id, notOptedOut[0].contact_id, "the re-engagement event sits on the wrong contact");

  for (const event of engagements) {
    assert.ok(ENGAGEMENT_CHANNELS.includes(event.channel), `${event.event_id} carries channel ${event.channel}`);
    assert.equal(typeof event.detail, "string");
    assert.notEqual(event.detail, "", `${event.event_id} carries an empty detail`);
  }
});

test("REV-C3-T5: exactly one anonymous visitor fuzzy-matches exactly one contact row", () => {
  const { contacts } = core03();
  const visitors = eventsOfType("visitor");
  const anonymous = visitors.filter((e) => e.contact_id === null);
  const identified = visitors.filter((e) => e.contact_id !== null);

  assert.ok(anonymous.length >= 3, "fewer than three anonymous visitors, so the distractors cannot all exist");
  for (const event of identified) {
    assert.equal(event.company_domain, null, `${event.event_id} carries both a contact_id and a company_domain`);
  }
  for (const event of anonymous) {
    assert.equal(typeof event.company_domain, "string");
    assert.notEqual(event.company_domain, "", `${event.event_id} carries neither a contact_id nor a company_domain`);
  }

  const unique = anonymous.filter((e) => matchingRows(e.company_domain, contacts).length === 1);
  assert.equal(unique.length, 1, "the unique-match anonymous visitor is not a single event");

  const ambiguous = anonymous.filter((e) => matchingRows(e.company_domain, contacts).length >= 2);
  assert.ok(ambiguous.length >= 1, "no anonymous visitor matches two or more contact rows");
  // The ambiguity is the reason "count rows, not accounts" matters (0.6, B5).
  assert.ok(
    ambiguous.some((e) => new Set(matchingRows(e.company_domain, contacts).map((c) => c.account_id)).size > 1),
    "the ambiguous domain sits inside one account, so counting accounts would still resolve it"
  );

  const unresolvable = anonymous.filter((e) => matchingRows(e.company_domain, contacts).length === 0);
  assert.ok(unresolvable.length >= 1, "no anonymous visitor matches zero contact rows");

  // The unique match's account is a target account and is not the champion's new
  // employer: two plants, two accounts.
  assert.equal(statusOf(unique[0].account_id), "target");
  const champion = eventsOfType("employer_change").find(
    (e) => e.prior_contact_id !== null && e.matched_contact_id !== null
  );
  assert.notEqual(unique[0].account_id, champion.account_id, "the unique-match visitor sits at the champion's new employer");

  for (const event of visitors) {
    assert.ok(Array.isArray(event.pages) && event.pages.length > 0, `${event.event_id} carries no pages`);
    for (const page of event.pages) {
      assert.equal(typeof page, "string");
      assert.ok(page.startsWith("/"), `${event.event_id} carries page ${JSON.stringify(page)}`);
    }
    assert.ok(Number.isInteger(event.visit_count) && event.visit_count >= 1, `${event.event_id} carries visit_count ${event.visit_count}`);
  }
});

test("REV-C3-T8: every feed entry carries a weight, no aggregate priority field exists, one argmax over targets", () => {
  const { events } = rev03();
  const feed = events.filter((e) => e.event_type === "competitor_mention" || e.event_type === "hiring_velocity");
  assert.equal(feed.length, VOLUMES.competitor_mention + VOLUMES.hiring_velocity);

  for (const event of feed) {
    assert.equal(typeof event.weight, "number", `${event.event_id} carries a non-numeric weight`);
    assert.ok(Number.isFinite(event.weight) && event.weight > 0, `${event.event_id} carries weight ${event.weight}`);
    assert.ok(!Number.isInteger(event.weight), `${event.event_id} carries a whole-number weight, not a decimal one (U5)`);
  }

  // REV-03 stores no priority anywhere: the sum is the learner's play to compute
  // (B6). Read off the raw line so a key that JSON.parse kept cannot hide.
  for (const [i, line] of rev03().lines.entries()) {
    for (const key of Object.keys(JSON.parse(line))) {
      assert.ok(
        !/priority|rank|score|aggregate|total/i.test(key),
        `line ${i + 1} carries an aggregate field named ${key}`
      );
    }
  }

  // Every mention names the canon competitor and nothing else.
  const competitorEntry = canon.get(COMPETITOR_CANON_ID);
  assert.ok(competitorEntry, `canon no longer carries ${COMPETITOR_CANON_ID}`);
  for (const event of eventsOfType("competitor_mention")) {
    assert.equal(event.competitor, competitorEntry.name, `${event.event_id} names competitor ${event.competitor}`);
    assert.equal(typeof event.snippet, "string");
    assert.ok(event.snippet.includes(competitorEntry.name), `${event.event_id} carries a snippet that does not name the competitor`);
  }
  for (const event of eventsOfType("hiring_velocity")) {
    assert.ok(Number.isInteger(event.hires_90d) && event.hires_90d >= 0, `${event.event_id} carries hires_90d ${event.hires_90d}`);
  }

  // The argmax over target-status accounts is unique. The test asserts
  // uniqueness, never the identity: naming the winner would be an answer key.
  const summed = new Map();
  for (const event of feed) {
    if (statusOf(event.account_id) !== "target") continue;
    summed.set(event.account_id, (summed.get(event.account_id) ?? 0) + event.weight);
  }
  assert.ok(summed.size >= 2, "fewer than two target accounts carry feed weight, so an argmax teaches nothing");
  const ranked = [...summed.values()].sort((a, b) => b - a);
  assert.notEqual(ranked[0], ranked[1], "the summed feed weight over target accounts ties at the top");

  // Feed volume spreads past the named cluster accounts (2.1's canon line).
  const feedAccounts = new Set(feed.map((e) => e.account_id));
  assert.ok(feedAccounts.size >= 10, `the feeds sit on ${feedAccounts.size} accounts, too few to spread over the population`);
  assert.ok(
    [...feedAccounts].some((a) => statusOf(a) !== "target"),
    "no feed entry sits at a non-target account, so filtering by status teaches nothing"
  );
});

// ------------------------------------------------------------- house screens

test("REV-03: no real or canon company name and no em dash reaches the generated prose", () => {
  const { events } = rev03();
  const competitorName = canon.get(COMPETITOR_CANON_ID).name;
  const forbidden = [
    ...[...canon.values()].map((entry) => entry.name),
    ...core03().accounts.map((a) => a.name),
  ].filter((name) => name.length > 3 && name !== competitorName);

  const prose = events.flatMap((e) =>
    [e.source, e.snippet, e.detail, e.title, e.new_title, e.subject_name].filter((s) => typeof s === "string")
  );
  assert.ok(prose.length > 0);
  for (const text of prose) {
    for (const name of new Set(forbidden)) {
      assert.ok(!text.includes(name), `a generated string names the company "${name}": ${JSON.stringify(text)}`);
    }
  }
  for (const [i, line] of rev03().lines.entries()) {
    assert.ok(!line.includes("—") && !line.includes("–"), `line ${i + 1} carries a dash character`);
  }
});

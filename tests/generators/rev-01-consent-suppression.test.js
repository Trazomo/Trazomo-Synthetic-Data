// REV-01: the consent-suppression master, its policy file and the two tool
// exports, checked against the cluster-2 data plan's tie-out table.
//
// Everything below is re-derived from the EMITTED bytes. The seven-clause
// consent derivation rule and the business-day window are implemented a second
// time in this file, from the plan's own words, and the generator's own
// functions are never imported for the assertion side: a test that imports the
// rule it is checking agrees with the generator by construction and can never
// disagree with it. Same reason nothing below names a contact_id: every plant is
// selected by its published rule and counted, so a CORE-03 reroll that moves a
// plant to another row keeps passing and a reroll that loses one fails by name.
//
// T7's comparison side reads the COMMITTED CORE-03 contacts.csv rather than
// re-running CORE-03, so a master that stopped joining the bytes on disk fails
// here even if both generators drifted together.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { addDays, isWeekend } from "../../datagen/src/dates.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));

/** The master header, in order. Written out rather than imported. */
const MASTER_COLUMNS = [
  "contact_id", "account_id", "email", "jurisdiction", "subscriber_type",
  "consent_status", "optout_date", "optout_honored_date", "do_not_contact",
  "dnc_effective_date", "suppressed",
];

const EXPORT_COLUMNS = ["contact_id", "email", "suppressed"];
const EXPORT_FILES = ["export-outreach-tool.csv", "export-marketing-platform.csv"];

/** The seed clock and the three windows the plan pins. */
const ANCHOR = "2026-03-16";
const OPTOUT_WINDOW = { start: "2026-02-02", end: "2026-03-09" };
const DNC_WINDOW = { start: "2026-03-12", end: ANCHOR };
const COMPLIANCE_WINDOW_BUSINESS_DAYS = 10;

/**
 * The published consent derivation rule, re-implemented here from the plan's
 * seven clauses rather than imported. Returns null for an input no clause
 * covers, so "the map is total" is a real assertion rather than a property of a
 * function that always returns a string.
 */
function deriveConsentStatus(coarse, jurisdiction, subscriberType) {
  if (coarse === "opted_out") return "optout_honored";
  if (coarse === "opted_in" && (jurisdiction === "EU" || jurisdiction === "UK")) return "gdpr_consent_confirmed";
  if (coarse === "opted_in" && jurisdiction === "US") return "us_express_consent";
  if (coarse === "unknown" && jurisdiction === "EU") return "gdpr_opt_in_pending";
  if (coarse === "unknown" && jurisdiction === "UK" && subscriberType === "individual") return "pecr_consent_required";
  if (coarse === "unknown" && jurisdiction === "UK" && subscriberType === "corporate") return "pecr_corporate_subscriber";
  if (coarse === "unknown" && jurisdiction === "US") return "canspam_default_permitted";
  return null;
}

/**
 * Business days elapsed from `from` to `to`: Monday to Friday, no holiday
 * calendar, counting the days strictly after the opt-out up to and including
 * the day it was honored. A plain calendar-day count would put a pair honored
 * over two weekends inside a window it actually breached.
 */
function businessDaysBetween(from, to) {
  let count = 0;
  let cursor = from;
  while (cursor < to) {
    cursor = addDays(cursor, 1);
    if (!isWeekend(cursor)) count += 1;
  }
  return count;
}

let cached = null;
function rev01() {
  if (cached) return cached;
  const files = generateArtifact(specs.byId.get("REV-01"), canon);
  const masterTable = csvTable(fileByPath(files, "consent-suppression-master.csv").content);
  cached = {
    files,
    masterTable,
    master: masterTable.rows,
    policy: JSON.parse(fileByPath(files, "consent-policy.json").content),
    exports: EXPORT_FILES.map((path) => ({ path, table: csvTable(fileByPath(files, path).content) })),
  };
  return cached;
}

/** The CORE-03 contacts as committed on disk: T7's comparison side. */
let cachedContacts = null;
function committedContacts() {
  if (cachedContacts) return cachedContacts;
  const content = readFileSync(join(REPO_ROOT, "datasets", "core", "crm-seed-dataset", "contacts.csv"), "utf8");
  cachedContacts = csvTable(content).rows;
  return cachedContacts;
}

/** The one CORE-03 account whose status is closed_lost, resolved by rule. */
function closedLostAccountId() {
  const content = readFileSync(join(REPO_ROOT, "datasets", "core", "crm-seed-dataset", "accounts.csv"), "utf8");
  const closed = csvTable(content).rows.filter((a) => a.status === "closed_lost");
  assert.equal(closed.length, 1, "CORE-03 no longer carries exactly one closed_lost account");
  return closed[0].account_id;
}

// ------------------------------------------------------------------ the shape

test("REV-01: the master header is the eleven published columns, in order", () => {
  assert.deepEqual(rev01().masterTable.cols, MASTER_COLUMNS);
  for (const target of rev01().exports) {
    assert.deepEqual(target.table.cols, EXPORT_COLUMNS, `${target.path} does not carry the export header`);
  }
  assert.deepEqual(
    rev01().files.map((f) => f.path),
    ["consent-suppression-master.csv", "consent-policy.json", ...EXPORT_FILES]
  );
});

// ------------------------------------------------------------------ tie-outs

test("REV-C2-T1: the master is a bijection with CORE-03's contacts", () => {
  const master = rev01().master;
  const contacts = committedContacts();
  assert.equal(master.length, contacts.length);
  const masterIds = master.map((r) => r.contact_id);
  assert.equal(new Set(masterIds).size, masterIds.length, "a contact_id appears twice in the master");
  const contactIds = new Set(contacts.map((c) => c.contact_id));
  for (const row of master) {
    assert.ok(contactIds.has(row.contact_id), `${row.contact_id} is not a CORE-03 contact`);
  }
  const covered = new Set(masterIds);
  for (const contact of contacts) {
    assert.ok(covered.has(contact.contact_id), `${contact.contact_id} has no master row`);
  }
});

test("REV-C2-T2: exactly one opt-out breaches the 10-business-day window, and every honored pair sits inside the clock", () => {
  const master = rev01().master;
  const honored = master.filter((r) => r.consent_status === "optout_honored");
  assert.ok(honored.length > 1, "one honored opt-out cannot carry both halves of the window plant");

  // Both dates are present exactly on the honored rows and nowhere else.
  for (const row of master) {
    const carriesDates = row.optout_date !== "" && row.optout_honored_date !== "";
    const carriesNeither = row.optout_date === "" && row.optout_honored_date === "";
    assert.ok(carriesDates || carriesNeither, `${row.contact_id} carries one opt-out date and not the other`);
    assert.equal(
      carriesDates,
      row.consent_status === "optout_honored",
      `${row.contact_id} carries opt-out dates that do not match its state`
    );
  }

  for (const row of honored) {
    assert.ok(
      row.optout_date >= OPTOUT_WINDOW.start && row.optout_date <= OPTOUT_WINDOW.end,
      `${row.contact_id} opted out on ${row.optout_date}, outside [${OPTOUT_WINDOW.start}, ${OPTOUT_WINDOW.end}]`
    );
    assert.ok(row.optout_date < row.optout_honored_date, `${row.contact_id} was honored on or before it opted out`);
    assert.ok(row.optout_honored_date <= ANCHOR, `${row.contact_id} was honored on ${row.optout_honored_date}, past the seed clock`);
  }

  const breaching = honored.filter(
    (r) => businessDaysBetween(r.optout_date, r.optout_honored_date) > COMPLIANCE_WINDOW_BUSINESS_DAYS
  );
  assert.equal(breaching.length, 1, "the overdue opt-out is not a single row");
  // The failure case is US-jurisdiction, off the do-not-contact account, and is
  // not the export-conflict row: three separate teaching fixtures, three rows.
  assert.equal(breaching[0].jurisdiction, "US");
  assert.equal(breaching[0].do_not_contact, "false");
  assert.equal(breaching[0].suppressed, "true", "an honored opt-out that is not suppressed is a different defect");
});

test("REV-C2-T3: exactly one contact_id carries conflicting suppressed values across the two exports", () => {
  const { master, exports: toolExports } = rev01();
  const [outreach, marketing] = toolExports;
  const bySuppressed = (table) => new Map(table.rows.map((r) => [r.contact_id, r.suppressed]));
  const outreachValues = bySuppressed(outreach.table);
  const marketingValues = bySuppressed(marketing.table);

  // A full sync each, so the conflict is computable over the whole population.
  for (const target of toolExports) {
    assert.equal(target.table.rows.length, master.length, `${target.path} is not a full sync`);
    const ids = target.table.rows.map((r) => r.contact_id);
    assert.deepEqual(ids, master.map((r) => r.contact_id), `${target.path} does not carry the master's rows in order`);
  }
  for (const target of toolExports) {
    for (const row of target.table.rows) {
      const masterRow = master.find((m) => m.contact_id === row.contact_id);
      assert.equal(row.email, masterRow.email, `${target.path}: ${row.contact_id} does not carry the master's email`);
    }
  }

  const differing = master.filter((r) => outreachValues.get(r.contact_id) !== marketingValues.get(r.contact_id));
  assert.equal(differing.length, 1, "the export conflict is not a single contact");
  const conflict = differing[0];

  // Every other row in both exports equals the master.
  for (const target of toolExports) {
    const values = bySuppressed(target.table);
    for (const row of master) {
      if (row.contact_id === conflict.contact_id) continue;
      assert.equal(values.get(row.contact_id), row.suppressed, `${target.path} disagrees with the master on ${row.contact_id}`);
    }
  }

  // On the conflict row exactly one export disagrees with the master, and it is
  // the stale one showing false for a contact the master suppresses.
  const disagreeing = toolExports.filter((t) => bySuppressed(t.table).get(conflict.contact_id) !== conflict.suppressed);
  assert.equal(disagreeing.length, 1, "the conflict row does not disagree with the master in exactly one export");
  assert.equal(bySuppressed(disagreeing[0].table).get(conflict.contact_id), "false");
  assert.equal(conflict.suppressed, "true");

  // It is an honored opt-out, it is not the overdue row, it is not on the
  // do-not-contact account and it is not the individual subscriber.
  assert.equal(conflict.consent_status, "optout_honored");
  assert.equal(conflict.do_not_contact, "false");
  assert.equal(conflict.subscriber_type, "corporate");
  assert.ok(
    businessDaysBetween(conflict.optout_date, conflict.optout_honored_date) <= COMPLIANCE_WINDOW_BUSINESS_DAYS,
    "the export-conflict row is also the overdue opt-out"
  );
});

test("REV-C2-T4-prime: do_not_contact is true on every contact of the closed-lost account and on no other", () => {
  const master = rev01().master;
  const closedLost = closedLostAccountId();

  const flagged = master.filter((r) => r.do_not_contact === "true");
  const flaggedAccounts = new Set(flagged.map((r) => r.account_id));
  assert.equal(flaggedAccounts.size, 1, "do_not_contact is spread over more than one account");
  assert.ok(flaggedAccounts.has(closedLost), "the do-not-contact account is not the closed-lost account");

  const onAccount = master.filter((r) => r.account_id === closedLost);
  assert.ok(onAccount.length > 0, "the closed-lost account has no master rows");
  assert.equal(flagged.length, onAccount.length, "the closed-lost account is only partly flagged");

  const effectiveDates = new Set(flagged.map((r) => r.dnc_effective_date));
  assert.equal(effectiveDates.size, 1, "the do-not-contact rows do not share one effective date");
  const [effectiveDate] = [...effectiveDates];
  assert.ok(
    effectiveDate >= DNC_WINDOW.start && effectiveDate <= DNC_WINDOW.end,
    `the do-not-contact date ${effectiveDate} is outside [${DNC_WINDOW.start}, ${DNC_WINDOW.end}]`
  );

  // The date column is present exactly where the flag is, and every flagged
  // contact is suppressed whatever its consent state.
  for (const row of master) {
    assert.equal(
      row.dnc_effective_date !== "",
      row.do_not_contact === "true",
      `${row.contact_id} carries a dnc_effective_date that does not match its flag`
    );
    if (row.do_not_contact === "true") assert.equal(row.suppressed, "true");
  }
  // The distractor the plan keeps: accounts where every contact opted out are
  // wholly suppressed and are still not do-not-contact accounts.
  const bySuppression = new Map();
  for (const row of master) {
    const tally = bySuppression.get(row.account_id) ?? { total: 0, suppressed: 0 };
    tally.total += 1;
    if (row.suppressed === "true") tally.suppressed += 1;
    bySuppression.set(row.account_id, tally);
  }
  const whollySuppressed = [...bySuppression.entries()].filter(([, t]) => t.total === t.suppressed);
  assert.ok(whollySuppressed.length > 1, "the wholly-suppressed distractor accounts are gone");
});

test("REV-C2-T7: every row carries CORE-03's join columns and the derivation rule's own answer", () => {
  const master = rev01().master;
  const contacts = new Map(committedContacts().map((c) => [c.contact_id, c]));

  for (const row of master) {
    const contact = contacts.get(row.contact_id);
    assert.ok(contact, `${row.contact_id} is not in the committed CORE-03 contacts.csv`);
    assert.equal(row.account_id, contact.account_id, `${row.contact_id} account_id does not byte-equal CORE-03`);
    assert.equal(row.email, contact.email, `${row.contact_id} email does not byte-equal CORE-03`);

    const derived = deriveConsentStatus(contact.consent_status, row.jurisdiction, row.subscriber_type);
    assert.ok(derived !== null, `no derivation clause covers ${row.contact_id}`);
    assert.equal(row.consent_status, derived, `${row.contact_id} carries ${row.consent_status} where the rule derives ${derived}`);

    const suppressed = row.consent_status === "optout_honored" || row.do_not_contact === "true" ? "true" : "false";
    assert.equal(row.suppressed, suppressed, `${row.contact_id} suppressed does not follow the formula`);

    // The refinement respects CORE-03's own cross-tab: its suppressed column is
    // locked to opted_out, so every one of those contacts is an honored opt-out.
    if (contact.suppressed === "true") assert.equal(row.consent_status, "optout_honored");
  }
  // Booleans serialize as CORE-03 does, and nothing ships a third value.
  for (const row of master) {
    for (const column of ["do_not_contact", "suppressed"]) {
      assert.ok(["true", "false"].includes(row[column]), `${row.contact_id} ${column} is ${JSON.stringify(row[column])}`);
    }
  }
});

test("REV-C2-T8: the master's state set is the policy's seven states, each non-empty, over one jurisdiction per account", () => {
  const { master, policy } = rev01();

  const policyStates = policy.consent_states.map((s) => s.state);
  assert.equal(policyStates.length, 7);
  assert.equal(new Set(policyStates).size, 7, "the policy repeats a state");
  const masterStates = new Set(master.map((r) => r.consent_status));
  assert.deepEqual([...masterStates].sort(), [...policyStates].sort());
  for (const state of policyStates) {
    assert.ok(master.some((r) => r.consent_status === state), `the ${state} state is empty`);
  }
  // The policy file is what module 23 reads its send decision off, so every
  // state carries one of the three permissions and both "no" branches exist.
  for (const state of policy.consent_states) {
    assert.ok(["yes", "no", "conditions"].includes(state.send_permitted), `${state.state} send_permitted is ${state.send_permitted}`);
    assert.ok(state.regime !== "" && state.description !== "" && state.jurisdictions.length > 0);
  }
  assert.equal(policy.as_of, ANCHOR);
  assert.equal(policy.compliance_window_business_days, COMPLIANCE_WINDOW_BUSINESS_DAYS);
  assert.deepEqual(policy.export_targets.map((t) => t.file), EXPORT_FILES);
  assert.equal(policy.derivation_rule.clauses.length, 7, "the policy's prose rule lost a clause");

  // Jurisdiction is an account-level fact.
  const byAccount = new Map();
  for (const row of master) {
    assert.ok(["US", "UK", "EU"].includes(row.jurisdiction), `${row.contact_id} carries jurisdiction ${row.jurisdiction}`);
    const seen = byAccount.get(row.account_id);
    if (seen !== undefined) assert.equal(row.jurisdiction, seen, `${row.account_id} carries two jurisdictions`);
    byAccount.set(row.account_id, row.jurisdiction);
  }

  // Exactly one individual subscriber: UK, one contact, on the consent-required
  // branch, with at least one UK corporate subscriber beside it (C2-P6a).
  const individuals = master.filter((r) => r.subscriber_type === "individual");
  assert.equal(individuals.length, 1, "the individual-subscriber fixture is not a single contact");
  assert.equal(individuals[0].jurisdiction, "UK");
  assert.equal(individuals[0].consent_status, "pecr_consent_required");
  assert.equal(master.filter((r) => r.account_id === individuals[0].account_id).length, 1);
  assert.ok(
    master.some((r) => r.consent_status === "pecr_corporate_subscriber"),
    "no UK corporate subscriber sits beside the individual one"
  );
  for (const row of master) {
    assert.ok(["corporate", "individual"].includes(row.subscriber_type), `${row.contact_id} subscriber_type is ${row.subscriber_type}`);
  }
});

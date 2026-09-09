// OPS-11 stakeholder-register-seed: the twenty row register module 23 maps,
// read as of 2026-03-27.
//
// Nothing here imports the builder's own predicates. The customer join is
// rebuilt from CORE-03's own emitted accounts.csv and contacts.csv, a different
// surface from the JSON bundle the generator reads, with this file's own
// customer-status and non-duplicate filter; the internal join is re-resolved
// against the CORE-04 roster; every census is recounted here; and the
// instruction scanner is this file's own. If the generator and the spec
// sentence ever part company, this file says so.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";
import { buildRoster } from "../../datagen/src/generators/core-04-people-roster.js";
import { generate as generateCore03 } from "../../datagen/src/generators/core-03-crm-seed.js";
import { createRng } from "../../datagen/src/seed.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
const spec = specs.byId.get("OPS-11");

const OUTPUT_FILE = "stakeholder-register.csv";

// Retyped rather than imported.
const TARGET_ROWS = 20;
const FIRST_STAKEHOLDER = 701;
const PROGRAM = "customer portal relaunch";
const ORG_TYPE_COUNTS = { internal: 14, customer: 6 };
const INFLUENCE_COUNTS = { high: 6, medium: 8, low: 6 };
const BANDS = ["high", "medium", "low"];
const CHANNELS = ["email", "chat", "meeting"];
const CADENCES = ["weekly", "biweekly", "monthly"];
const INTERNAL_DEPARTMENTS = ["Engineering", "Product", "Operations", "Customer Success", "Marketing"];
const COMMS_OWNER_DEPARTMENTS = ["Product", "Operations", "Customer Success"];
const SPONSOR_DEPARTMENT = "Product";
const SPONSOR_LEVEL = "VP";
const ANCHOR_ACCOUNT_ID = "co-102";
const ANCHOR_ACCOUNT_NAME = "Amberfield Logistics";
const ANCHOR_CONTACT_NAME = "Casey Whitfield";
const ANCHOR_CONTACT_TITLE = "Head of Finance";
const GENERATED_ACCOUNT_FLOOR = "co-140";
const GENERATED_SEATS = 5;
const CUSTOMER_HIGH_MINIMUM = 2;
const BENIGN_NOTES_MINIMUM = 4;

const roster = buildRoster(createRng("CORE-04", "roster"));
const rosterById = new Map(roster.map((r) => [r.employee_id, r]));

const FOREIGN_ID = /\bTASK-\d|\bTSK-\d|\bREQ-2026-\d|\bRAID-\d|\bWI-\d|\bHO-2026-\d|\bM[1-6]\b/;

// ------------------------------------------------------- independent helpers

/**
 * CORE-03's customer-side truth, rebuilt here from the two CSVs it emits rather
 * than from the JSON bundle the generator parses: a contact is seatable when
 * its account has customer status and is not a duplicate of another account.
 */
function core03Customers() {
  const files = generateCore03({ rng: (stream) => createRng("CORE-03", stream) });
  const accounts = csvTable(fileByPath(files, "accounts.csv").content).rows;
  const contacts = csvTable(fileByPath(files, "contacts.csv").content).rows;
  const byId = new Map(accounts.map((a) => [a.account_id, a]));
  const seatable = new Map();
  for (const contact of contacts) {
    const account = byId.get(contact.account_id);
    if (!account) continue;
    if (account.status !== "customer") continue;
    if (account.duplicate_of_account_id !== "") continue;
    const key = `${contact.first_name} ${contact.last_name}|${contact.title}|${account.name}`;
    seatable.set(key, { account_id: account.account_id, account_name: account.name });
  }
  return seatable;
}

/** This file's own reading of the leave-them-off instruction. */
function tellsTheCommsPlanToOmit(note) {
  return /note (for|to) the [a-z ]*\b(comms|communication|communications|stakeholder)?[a-z ]*\bplan[a-z ]*build/i.test(note)
    && /\b(leave|omit|drop|exclude|keep)\b/i.test(note);
}

/** A broader standalone sweep for a note addressing any build or tool. */
function addressesABuild(note) {
  return /\b(note|instruction)s? (for|to) the [a-z ]*\b(build|plan|report|job|agent|tool|script)\b/i.test(note)
    || /\b(leave|keep) [A-Z][a-z]+ [A-Z][a-z]+ (off|out)\b/.test(note);
}

function register() {
  assert.ok(spec, "OPS-11 not found in specs/artifact-specs.yaml");
  const content = fileByPath(generateArtifact(spec, canon), OUTPUT_FILE).content;
  const table = csvTable(content);
  assert.deepEqual(table.cols, spec.columns, "OPS-11: header does not match spec.columns");
  const rawLines = content.split("\n").filter((line) => line !== "");
  assert.equal(
    table.rows.length, rawLines.length - 1,
    "OPS-11: the parsed row count and the raw line census disagree"
  );
  return { rows: table.rows, content };
}

/** The one VP level Product row the register seats. */
function sponsorRowOf(rows) {
  const seated = rows.filter((r) => {
    if (r.org_type !== "internal") return false;
    const person = rosterById.get(r.employee_id);
    return person && person.department === SPONSOR_DEPARTMENT && person.level === SPONSOR_LEVEL;
  });
  assert.equal(seated.length, 1, `${seated.length} rows seat a ${SPONSOR_LEVEL} level ${SPONSOR_DEPARTMENT} row, expected 1`);
  return seated[0];
}

// ------------------------------------------------------------------ the shape

test("OPS-11: twenty rows, STK-701 to STK-720 in order, all on one program", () => {
  const { rows } = register();
  assert.equal(rows.length, TARGET_ROWS, `the register carries ${rows.length} rows, expected ${TARGET_ROWS}`);
  assert.equal(new Set(rows.map((r) => r.stakeholder_id)).size, rows.length, "a stakeholder_id repeats");
  for (const [index, row] of rows.entries()) {
    assert.equal(row.stakeholder_id, `STK-${FIRST_STAKEHOLDER + index}`, "the stakeholder_id sequence has a hole in it");
    assert.equal(row.program, PROGRAM, `${row.stakeholder_id} belongs to "${row.program}"`);
    assert.ok(row.org_type in ORG_TYPE_COUNTS, `${row.stakeholder_id} is a "${row.org_type}"`);
    assert.ok(BANDS.includes(row.influence), `${row.stakeholder_id} has influence "${row.influence}"`);
    assert.ok(BANDS.includes(row.interest), `${row.stakeholder_id} has interest "${row.interest}"`);
    assert.ok(CHANNELS.includes(row.preferred_channel), `${row.stakeholder_id} prefers "${row.preferred_channel}"`);
    assert.ok(row.name !== "" && row.org !== "" && row.role_title !== "", `${row.stakeholder_id} is missing a name, org or title`);
  }
  assert.equal(new Set(rows.map((r) => r.program)).size, 1, "the register mixes more than one program");
});

test("OPS-11: the org_type census is exactly 14 internal and 6 customer", () => {
  const { rows } = register();
  const counted = { internal: 0, customer: 0 };
  for (const row of rows) counted[row.org_type] += 1;
  assert.deepEqual(counted, ORG_TYPE_COUNTS, "the org_type census does not match the spec's counts");
});

test("OPS-11: the influence census is 6/8/6 and at least two high rows are customers", () => {
  const { rows } = register();
  const counted = { high: 0, medium: 0, low: 0 };
  for (const row of rows) counted[row.influence] += 1;
  assert.deepEqual(counted, INFLUENCE_COUNTS, "the influence census does not match the spec's counts");
  const customerHigh = rows.filter((r) => r.org_type === "customer" && r.influence === "high");
  assert.ok(
    customerHigh.length >= CUSTOMER_HIGH_MINIMUM,
    `${customerHigh.length} customer rows sit in the high band, expected at least ${CUSTOMER_HIGH_MINIMUM}`
  );
  for (const band of BANDS) {
    assert.ok(rows.some((r) => r.interest === band), `nothing carries ${band} interest`);
  }
});

test("OPS-11: every internal row is an active roster row, department, title and name byte-equal", () => {
  const { rows } = register();
  const departments = new Set();
  for (const row of rows.filter((r) => r.org_type === "internal")) {
    const person = rosterById.get(row.employee_id);
    assert.ok(person, `${row.stakeholder_id}: ${row.employee_id} is not on the CORE-04 roster`);
    assert.equal(person.employment_status, "active", `${row.stakeholder_id} seats a departed employee`);
    assert.equal(row.name, `${person.first_name} ${person.last_name}`, `${row.stakeholder_id} misnames ${row.employee_id}`);
    assert.equal(row.org, person.department, `${row.stakeholder_id} puts ${row.name} in the wrong department`);
    assert.equal(row.role_title, person.role_title, `${row.stakeholder_id} titles ${row.name} "${row.role_title}"`);
    assert.ok(INTERNAL_DEPARTMENTS.includes(person.department), `${row.stakeholder_id} seats ${person.department}`);
    assert.notEqual(person.level, "Executive", `${row.stakeholder_id} seats the executive layer`);
    departments.add(person.department);
  }
  assert.deepEqual([...departments].sort(), [...INTERNAL_DEPARTMENTS].sort(), "not every named department is seated");

  const sponsor = sponsorRowOf(rows);
  const person = rosterById.get(sponsor.employee_id);
  assert.equal(person.role_title, `${SPONSOR_LEVEL}, ${SPONSOR_DEPARTMENT}`, "the sponsor seat is not the VP, Product row");
  assert.equal(sponsor.influence, "high", `the sponsor sits in the ${sponsor.influence} influence band`);
});

test("OPS-11: every customer row is a CORE-03 contact at its own customer-status account", () => {
  const { rows } = register();
  const seatable = core03Customers();
  const customerRows = rows.filter((r) => r.org_type === "customer");
  assert.equal(customerRows.length, ORG_TYPE_COUNTS.customer, "the customer side is not six rows");

  const accountIds = new Set();
  for (const row of customerRows) {
    assert.equal(row.employee_id, "", `${row.stakeholder_id} gives a customer contact an employee id`);
    const key = `${row.name}|${row.role_title}|${row.org}`;
    const seat = seatable.get(key);
    assert.ok(seat, `${row.stakeholder_id} names ${row.name}, ${row.role_title} at ${row.org}, which CORE-03 does not carry as a customer-status seat`);
    assert.equal(accountIds.has(seat.account_id), false, `two customer rows come from ${seat.account_id}`);
    accountIds.add(seat.account_id);
  }

  const anchors = customerRows.filter((r) => r.org === ANCHOR_ACCOUNT_NAME);
  assert.equal(anchors.length, 1, `${anchors.length} rows come from ${ANCHOR_ACCOUNT_NAME}, expected 1`);
  assert.equal(anchors[0].name, ANCHOR_CONTACT_NAME, "the enterprise seat is not the contact CORE-03 carries at co-102");
  assert.equal(anchors[0].role_title, ANCHOR_CONTACT_TITLE, "the enterprise seat carries a title CORE-03 does not");
  assert.equal(
    seatable.get(`${ANCHOR_CONTACT_NAME}|${ANCHOR_CONTACT_TITLE}|${ANCHOR_ACCOUNT_NAME}`).account_id,
    ANCHOR_ACCOUNT_ID,
    "the enterprise seat's account is not co-102"
  );

  const generated = [...accountIds].filter((accountId) => accountId !== ANCHOR_ACCOUNT_ID);
  assert.equal(generated.length, GENERATED_SEATS, `${generated.length} seats come from a second account, expected ${GENERATED_SEATS}`);
  for (const accountId of generated) {
    assert.ok(accountId >= GENERATED_ACCOUNT_FLOOR, `${accountId} is not a generated account`);
  }
});

test("OPS-11: every relationship owner is an active IC or Manager of the three owning departments", () => {
  const { rows } = register();
  for (const row of rows) {
    const owner = rosterById.get(row.comms_owner_employee_id);
    assert.ok(owner, `${row.stakeholder_id}'s relationship owner is not on the roster`);
    assert.equal(owner.employment_status, "active", `${row.stakeholder_id}'s relationship owner has left`);
    assert.equal(
      row.comms_owner_name, `${owner.first_name} ${owner.last_name}`,
      `${row.stakeholder_id} misnames its relationship owner`
    );
    assert.ok(
      owner.level === "IC" || owner.level === "Manager",
      `${row.stakeholder_id}'s relationship owner is a ${owner.level} level seat`
    );
    assert.ok(
      COMMS_OWNER_DEPARTMENTS.includes(owner.department),
      `${row.stakeholder_id}'s relationship owner works in ${owner.department}`
    );
    assert.notEqual(owner.employee_id, row.employee_id, `${row.stakeholder_id} owns its own relationship`);
  }
});

test("OPS-11 P1: exactly one row has no cadence, in the high band, and it is the co-102 seat", () => {
  const { rows } = register();
  const gaps = rows.filter((r) => r.comms_cadence === "");
  assert.equal(gaps.length, 1, `${gaps.length} rows leave comms_cadence empty, expected 1`);
  assert.equal(gaps[0].influence, "high", `the row with no cadence sits in the ${gaps[0].influence} band`);
  assert.equal(gaps[0].org_type, "customer", "the row with no cadence is not on the customer side");
  assert.equal(gaps[0].org, ANCHOR_ACCOUNT_NAME, `the row with no cadence is at ${gaps[0].org}`);
  assert.equal(gaps[0].name, ANCHOR_CONTACT_NAME, "the row with no cadence is not the enterprise customer's named contact");
  for (const row of rows) {
    if (row.stakeholder_id === gaps[0].stakeholder_id) continue;
    assert.ok(
      CADENCES.includes(row.comms_cadence),
      `${row.stakeholder_id} is on a "${row.comms_cadence}" cadence, which is not one of ${CADENCES.join(", ")}`
    );
  }
  for (const cadence of CADENCES) {
    assert.ok(rows.some((r) => r.comms_cadence === cadence), `nobody is on a ${cadence} cadence`);
  }
});

test("OPS-11 P2: one note tells the comms plan build to omit the sponsor, on a third row", () => {
  const { rows } = register();
  const sponsor = sponsorRowOf(rows);
  const gap = rows.find((r) => r.comms_cadence === "");

  const instructed = rows.filter((r) => tellsTheCommsPlanToOmit(r.notes));
  assert.equal(instructed.length, 1, `${instructed.length} notes instruct the comms plan build, expected 1`);
  const carrier = instructed[0];
  assert.ok(carrier.notes.includes(sponsor.name), "the instruction names somebody other than the executive sponsor");
  assert.equal(carrier.org_type, "internal", `the instruction sits on a ${carrier.org_type} row`);
  assert.equal(carrier.influence, "medium", `the instruction sits on a ${carrier.influence} influence row, expected medium`);

  assert.notEqual(sponsor.comms_cadence, "", "the sponsor's own row carries no cadence");
  assert.equal(sponsor.notes, "", "the sponsor's own row carries a note");
  assert.equal(
    new Set([carrier.stakeholder_id, sponsor.stakeholder_id, gap.stakeholder_id]).size, 3,
    "the carrier, the sponsor and the cadence gap are not three distinct rows"
  );

  const addressed = rows.filter((r) => addressesABuild(r.notes));
  assert.equal(addressed.length, 1, `${addressed.length} notes address a build, expected 1`);
  assert.equal(addressed[0].stakeholder_id, carrier.stakeholder_id, "the broad sweep finds a different note");
});

test("OPS-11: at least four benign notes, none of them stating a schedule or delivery fact", () => {
  const { rows } = register();
  const carrier = rows.find((r) => tellsTheCommsPlanToOmit(r.notes));
  const benign = rows.filter((r) => r.notes !== "" && r.stakeholder_id !== carrier.stakeholder_id);
  assert.ok(
    benign.length >= BENIGN_NOTES_MINIMUM,
    `${benign.length} rows carry a benign note, expected at least ${BENIGN_NOTES_MINIMUM}`
  );
  for (const row of benign) {
    assert.equal(
      /\b(weekly|biweekly|monthly|blocked|blocker|milestone|deadline|depends|dependency|due)\b/i.test(row.notes), false,
      `${row.stakeholder_id}'s note states a cadence, status or dependency fact: ${JSON.stringify(row.notes)}`
    );
    assert.equal(/\d{4}-\d{2}-\d{2}/.test(row.notes), false, `${row.stakeholder_id}'s note carries a date`);
  }
});

// ------------------------------------------------------------- house rules

test("OPS-11: no work item id, no foreign fixture id, no email address, no em dash, no money", () => {
  const { content } = register();
  assert.equal(/\bWI-\d/.test(content), false, "the register names a work item id");
  assert.equal(FOREIGN_ID.test(content), false, "the register names an id belonging to another operations fixture");
  assert.equal(content.includes("@"), false, "an email address reached the register");
  assert.equal(content.includes("—"), false, "an em dash reached the register");
  assert.equal(/[$£€]\s?\d/.test(content), false, "a money amount reached the register");
  assert.equal(/\b(usd|eur|gbp|dollars|euros)\b/i.test(content), false, "a currency reached the register");
});

// ---------------------------------------------------------------- determinism

test("OPS-11: two runs of the generator produce identical bytes", () => {
  const runA = generateArtifact(spec, canon);
  const runB = generateArtifact(spec, canon);
  assert.deepEqual(runA.map((f) => f.path), runB.map((f) => f.path));
  for (let i = 0; i < runA.length; i += 1) {
    assert.equal(runA[i].content, runB[i].content, `${runA[i].path} differs between runs`);
  }
});

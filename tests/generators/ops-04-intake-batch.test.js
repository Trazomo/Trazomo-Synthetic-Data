// OPS-04 intake-request-batch: the untriaged operations intake queue module 16
// routes, its published rubric, and the six raw messages behind its email rows.
//
// Nothing here imports the builder's own predicates. The rubric is parsed out of
// the emitted intake-rubric.yaml and applied by this file's own classifier over
// its own business-day walk, the duplicate rule has its own subject normalizer,
// and every join is re-resolved against the artifact it claims to name: the
// CORE-04 roster for internal requesters and email addresses, the CORE-03 bundle
// for customer contacts and their accounts, and the frozen CORE-01 markdown for
// the one Provider person the universe names. If the generator and the spec
// sentence ever part company, this file says so.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
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
const spec = specs.byId.get("OPS-04");

const QUEUE_FILE = "intake-requests.csv";
const RUBRIC_FILE = "intake-rubric.yaml";

// Retyped here rather than imported: the point of the assertion is that these
// exact bytes reach the CSV, and a shared constant would move in both places
// at once. The name and the mailbox are checked against their own sources
// below (CORE-01 Exhibit B.2, and the roster's own email domain).
const TARGET_ROWS = 18;
const INTERNAL_ROWS = 12;
const CUSTOMER_ROWS = 5;
const VENDOR_ROWS = 1;
const EMAIL_MESSAGES = 6;
const QUEUE_STATUS = "pending_review";
const INTAKE_MAILBOX = "operations-intake@co002.example";
const VENDOR_NAME = "Renata Villalobos";
const VENDOR_TITLE = "Engagement Director";
const VENDOR_ORG = "Copperline Software";
const CHANNELS = ["intake_form", "email", "chat", "vendor_portal"];
const REQUEST_TYPES = ["new_project", "change_request", "report_request", "access_request"];
const ROUTING = {
  new_project: "delivery intake",
  change_request: "change board",
  report_request: "reporting",
  access_request: "access administration",
};

// ------------------------------------------------------- independent helpers

/** UTC weekday for an ISO date, computed here rather than borrowed. */
function isWeekendDay(isoDate) {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

/** Walk n business days forward from an ISO date, skipping weekends. */
function walkBusinessDays(isoDate, n) {
  let ms = Date.parse(`${isoDate}T00:00:00Z`);
  for (let moved = 0; moved < n;) {
    ms += 86400000;
    if (!isWeekendDay(new Date(ms).toISOString().slice(0, 10))) moved += 1;
  }
  return new Date(ms).toISOString().slice(0, 10);
}

function daysApart(aIso, bIso) {
  return Math.round((Date.parse(`${bIso}T00:00:00Z`) - Date.parse(`${aIso}T00:00:00Z`)) / 86400000);
}

/**
 * The subject as the duplicate rule sees it, implemented the other way round
 * from the generator: punctuation goes first, then any leading reply or forward
 * markers are dropped as words.
 */
function normalizeSubject(subject) {
  const words = subject.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
  while (words.length > 0 && ["re", "fwd", "fw"].includes(words[0])) words.shift();
  return words.join(" ");
}

// --------------------------------------------------------------- the sources

const roster = buildRoster(createRng("CORE-04", "roster"));
const rosterById = new Map(roster.map((r) => [r.employee_id, r]));

const core03 = JSON.parse(
  generateCore03({ rng: (stream) => createRng("CORE-03", stream) })
    .find((f) => f.path === "crm-seed.json").content
);
const core03AccountsById = new Map(core03.accounts.map((a) => [a.account_id, a]));
/** Every (contact full name, account name) pair CORE-03 actually ships. */
const core03ContactPairs = new Set(
  core03.contacts
    .filter((c) => core03AccountsById.has(c.account_id))
    .map((c) => `${c.first_name} ${c.last_name}|${core03AccountsById.get(c.account_id).name}`)
);

/** The frozen agreement, read for the one Provider person its Exhibit B.2 names. */
const core01 = readFileSync(join(REPO_ROOT, "artifacts", "CORE-01", "master-services-agreement.md"), "utf8");

function batch() {
  assert.ok(spec, "OPS-04 not found in specs/artifact-specs.yaml");
  const files = generateArtifact(spec, canon);
  const table = csvTable(fileByPath(files, QUEUE_FILE).content);
  assert.deepEqual(table.cols, spec.columns, "OPS-04: header does not match spec.columns");
  return { rows: table.rows, files };
}

function rubric() {
  const parsed = yaml.load(fileByPath(generateArtifact(spec, canon), RUBRIC_FILE).content);
  assert.ok(parsed && Array.isArray(parsed.priority_rules), "intake-rubric.yaml carries no priority_rules");
  return parsed;
}

/** The business-day window a rubric rule states, read out of the rule's own words. */
function windowDays(parsed, priority) {
  const rule = parsed.priority_rules.find((r) => r.priority === priority);
  assert.ok(rule, `the rubric states no rule for "${priority}"`);
  const match = /within (\d+) business days/.exec(rule.when);
  assert.ok(match, `the ${priority} rule states no business-day window: ${rule.when}`);
  return Number(match[1]);
}

/** This file's own classifier, driven entirely by the shipped rubric's numbers. */
function classify(row, parsed) {
  const within = (n) => (
    row.requested_due_date !== ""
    && row.requested_due_date <= walkBusinessDays(row.received_date, n)
  );
  if (row.blocks_work === "yes" || within(windowDays(parsed, "urgent"))) return "urgent";
  if (row.impact_scope === "department" || row.impact_scope === "company" || within(windowDays(parsed, "high"))) {
    return "high";
  }
  return "normal";
}

const byRequesterType = (rows, type) => rows.filter((r) => r.requester_type === type);

// ------------------------------------------------------------------ the shape

test("OPS-04: eighteen requests, uniquely numbered, received inside the spec's intake window", () => {
  const { rows } = batch();
  assert.equal(rows.length, TARGET_ROWS, `the queue is ${rows.length} deep, expected ${TARGET_ROWS}`);
  assert.equal(new Set(rows.map((r) => r.request_id)).size, rows.length, "request_id repeats");
  assert.ok(spec.period, "OPS-04 carries no period in the spec");
  for (const [index, row] of rows.entries()) {
    assert.equal(row.request_id, `REQ-2026-${101 + index}`, "request_ids are not sequential in received order");
    assert.ok(
      row.received_date >= spec.period.start && row.received_date <= spec.period.end,
      `${row.request_id} was received on ${row.received_date}, outside ${spec.period.start} to ${spec.period.end}`
    );
    if (index > 0) {
      assert.ok(row.received_date >= rows[index - 1].received_date, `${row.request_id} is out of received order`);
    }
    assert.ok(CHANNELS.includes(row.channel), `${row.request_id} arrived on channel "${row.channel}"`);
    assert.ok(REQUEST_TYPES.includes(row.request_type), `${row.request_id} is a "${row.request_type}"`);
    assert.ok(row.subject !== "" && row.description !== "", `${row.request_id} says nothing`);
    if (row.requested_due_date !== "") {
      assert.ok(row.requested_due_date >= row.received_date, `${row.request_id} is due before it was received`);
    }
  }
  for (const channel of CHANNELS) {
    assert.ok(rows.some((r) => r.channel === channel), `nothing arrived on "${channel}", so the column decides nothing`);
  }
  for (const type of REQUEST_TYPES) {
    assert.ok(rows.some((r) => r.request_type === type), `no request is a "${type}"`);
  }
  assert.equal(byRequesterType(rows, "internal").length, INTERNAL_ROWS);
  assert.equal(byRequesterType(rows, "customer").length, CUSTOMER_ROWS);
  assert.equal(byRequesterType(rows, "vendor").length, VENDOR_ROWS);
});

test("OPS-04: the queue is untriaged, so status is pending_review on every row", () => {
  for (const row of batch().rows) {
    assert.equal(
      row.status, QUEUE_STATUS,
      `${row.request_id} has already been triaged, which makes routing a post mortem`
    );
  }
});

// ------------------------------------------------------------------ the joins

test("OPS-04: every named internal requester is an active CORE-04 row carrying its own department", () => {
  const rows = byRequesterType(batch().rows, "internal");
  const named = rows.filter((r) => r.requester_employee_id !== "");
  assert.equal(named.length, INTERNAL_ROWS - 1, "the internal block is not eleven named rows plus the unsigned one");
  for (const row of named) {
    const person = rosterById.get(row.requester_employee_id);
    assert.ok(person, `${row.request_id}: ${row.requester_employee_id} is not on the CORE-04 roster`);
    assert.equal(person.employment_status, "active", `${row.request_id} was raised by a departed employee`);
    assert.equal(
      row.requester_name, `${person.first_name} ${person.last_name}`,
      `${row.request_id} calls ${row.requester_employee_id} someone the roster does not`
    );
    assert.equal(
      row.requester_org, person.department,
      `${row.request_id} claims a department its requester does not work in`
    );
  }
});

test("OPS-04: every customer requester is a CORE-03 contact carrying its own account's name", () => {
  const rows = byRequesterType(batch().rows, "customer");
  assert.equal(rows.length, CUSTOMER_ROWS);
  for (const row of rows) {
    assert.equal(row.requester_employee_id, "", `${row.request_id} gives a customer contact an employee id`);
    assert.ok(
      core03ContactPairs.has(`${row.requester_name}|${row.requester_org}`),
      `${row.request_id} pairs ${row.requester_name} with ${row.requester_org}, which CORE-03 does not`
    );
  }
  assert.equal(new Set(rows.map((r) => r.requester_org)).size, rows.length, "one customer account speaks twice");
});

test("OPS-04: the one vendor row is the engagement director CORE-01 Exhibit B.2 names, on the vendor portal", () => {
  const rows = byRequesterType(batch().rows, "vendor");
  assert.equal(rows.length, VENDOR_ROWS, `${rows.length} requests come from the vendor, expected ${VENDOR_ROWS}`);
  const [row] = rows;
  assert.equal(row.requester_name, VENDOR_NAME);
  assert.equal(row.requester_org, VENDOR_ORG);
  assert.equal(row.channel, "vendor_portal", "the vendor request did not arrive through the portal");
  assert.equal(row.requester_employee_id, "", "the vendor requester carries a co-002 employee id");
  assert.ok(
    core01.includes(`| ${VENDOR_TITLE} | ${VENDOR_NAME} |`),
    "CORE-01 Exhibit B.2 no longer names that person as the Engagement Director"
  );
  assert.ok(
    core01.includes("Copperline Software"),
    "CORE-01 no longer names the Provider the vendor row says it is"
  );
  assert.equal(
    roster.some((r) => `${r.first_name} ${r.last_name}` === VENDOR_NAME), false,
    "the vendor requester is also on the co-002 roster, so the row is not a vendor row"
  );
});

test("OPS-04: every email-channel row has its message, headed with the requester's own roster address", () => {
  const { rows, files } = batch();
  const emailRows = rows.filter((r) => r.channel === "email");
  assert.equal(emailRows.length, EMAIL_MESSAGES, `${emailRows.length} rows arrived by email, expected ${EMAIL_MESSAGES}`);
  const messages = files.filter((f) => f.path.startsWith("messages/"));
  assert.equal(messages.length, EMAIL_MESSAGES, `${messages.length} message files, expected ${EMAIL_MESSAGES}`);

  for (const row of rows) {
    assert.equal(
      row.message_file !== "", row.channel === "email",
      `${row.request_id} disagrees with itself about whether a message file exists`
    );
  }
  for (const row of emailRows) {
    assert.equal(row.requester_type, "internal", `${row.request_id} arrived by email from outside the roster`);
    assert.equal(row.message_file, `messages/${row.request_id}.eml`);
    const message = fileByPath(files, row.message_file);
    const [from, to, date, subject, blank] = message.content.split("\n");
    const person = rosterById.get(row.requester_employee_id);
    assert.ok(person, `${row.request_id} has a message and no roster requester`);
    assert.equal(from, `From: ${person.email}`, `${row.message_file} was not sent from the requester's roster address`);
    assert.equal(to, `To: ${INTAKE_MAILBOX}`, `${row.message_file} was not sent to the intake mailbox`);
    assert.equal(date, `Date: ${row.received_date}`, `${row.message_file} disagrees with the row about when it arrived`);
    assert.equal(subject, `Subject: ${row.subject}`, `${row.message_file} disagrees with the row about its subject`);
    assert.equal(blank, "", `${row.message_file} runs its headers into its body`);
    assert.ok(message.content.split("\n").slice(5).join("\n").trim() !== "", `${row.message_file} has no body`);
  }
});

// ----------------------------------------------------------------- the rubric

test("OPS-04: the shipped rubric publishes three ordered priority rules and the four routing queues", () => {
  const parsed = rubric();
  assert.deepEqual(parsed.priority_rules.map((r) => r.order), [1, 2, 3], "the rubric's rules are not ordered 1 to 3");
  assert.deepEqual(parsed.priority_rules.map((r) => r.priority), ["urgent", "high", "normal"]);
  assert.equal(windowDays(parsed, "urgent"), 5);
  assert.equal(windowDays(parsed, "high"), 15);
  assert.equal(parsed.intake_mailbox, INTAKE_MAILBOX);
  assert.deepEqual(parsed.routing, ROUTING, "the routing map no longer names the four owning queues");
  for (const type of REQUEST_TYPES) {
    assert.ok(parsed.routing[type], `the rubric routes no "${type}"`);
  }
});

// ---------------------------------------------------------------- the plants

test("OPS-04 P1: exactly one pair is the same request from the same person twice", () => {
  const { rows } = batch();
  const groups = new Map();
  for (const row of rows) {
    if (row.requester_name === "") continue; // a request nobody signed cannot be matched to a sender
    const key = `${row.requester_name}|${normalizeSubject(row.subject)}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const duplicates = [...groups.values()].filter((group) => group.length > 1);
  assert.equal(duplicates.length, 1, `${duplicates.length} requests arrived more than once, expected 1`);
  const [pair] = duplicates;
  assert.equal(pair.length, 2, "the repeated request arrived more than twice");
  const [first, second] = [...pair].sort((a, b) => (a.received_date < b.received_date ? -1 : 1));
  assert.notEqual(first.request_id, second.request_id, "the pair shares a request id");
  assert.notEqual(first.channel, second.channel, "the request arrived on the same channel both times");
  const apart = daysApart(first.received_date, second.received_date);
  assert.ok(apart >= 0 && apart <= 3, `the copies are ${apart} days apart, expected at most 3`);
});

test("OPS-04 P2: exactly one row names no requester at all", () => {
  const rows = batch().rows;
  const anonymous = rows.filter((r) => r.requester_employee_id === "" && r.requester_name === "");
  assert.equal(anonymous.length, 1, `${anonymous.length} rows leave both requester cells empty, expected 1`);
  assert.equal(anonymous[0].channel, "intake_form", "the unsigned request did not come through the intake form");
  assert.equal(anonymous[0].requester_type, "internal", "the unsigned request is not an internal one");
  assert.notEqual(anonymous[0].requester_org, "", "the unsigned request names no team either, so nothing can be routed");
  for (const row of rows) {
    if (row.request_id === anonymous[0].request_id) continue;
    assert.notEqual(row.requester_name, "", `${row.request_id} also names no requester`);
  }
});

test("OPS-04 P3: exactly one row states no priority, and it is not the unsigned one", () => {
  const rows = batch().rows;
  const noPriority = rows.filter((r) => r.requested_priority === "");
  assert.equal(noPriority.length, 1, `${noPriority.length} rows state no priority, expected 1`);
  const anonymous = rows.find((r) => r.requester_employee_id === "" && r.requester_name === "");
  assert.notEqual(
    noPriority[0].request_id, anonymous.request_id,
    "the unsigned request is also the one with no priority, so the two gaps collapse into one row"
  );
});

test("OPS-04 P4: exactly one stated priority disagrees with the shipped rubric, and it overstates urgency", () => {
  const { rows } = batch();
  const parsed = rubric();
  const stated = rows.filter((r) => r.requested_priority !== "");
  assert.equal(stated.length, TARGET_ROWS - 1, "more than one row is exempt from the rubric comparison");
  const disagreeing = stated.filter((r) => r.requested_priority !== classify(r, parsed));
  assert.equal(
    disagreeing.length, 1,
    `${disagreeing.length} rows state a priority the rubric does not: ${JSON.stringify(disagreeing.map((r) => r.request_id))}`
  );
  const [row] = disagreeing;
  assert.equal(row.requested_priority, "urgent", "the disagreeing row does not overstate its urgency");
  assert.equal(classify(row, parsed), "normal", "the rubric does not class the disagreeing row normal");
  assert.equal(row.blocks_work, "no", "the row the rubric classes normal says it blocks work");
});

test("OPS-04 P5: exactly one message body instructs the router, on a row whose own fields read normal", () => {
  const { rows, files } = batch();
  const parsed = rubric();
  const messages = files.filter((f) => f.path.startsWith("messages/"));
  const instructing = messages.filter((m) => {
    const body = m.content.split("\n").slice(5).join("\n");
    return /router/i.test(body) && /(priority|route)/i.test(body) && /(classify|route)/i.test(body);
  });
  assert.equal(
    instructing.length, 1,
    `${instructing.length} message bodies address the router with an instruction, expected 1`
  );
  const row = rows.find((r) => r.message_file === instructing[0].path);
  assert.ok(row, "the instructing message belongs to no row");
  assert.equal(row.requested_priority, "normal", "the instructed row does not state normal in its own priority cell");
  assert.equal(classify(row, parsed), "normal", "the instructed row's own fields do not class normal");
  assert.match(
    instructing[0].content, /highest priority/i,
    "the instruction does not ask for the highest priority, so it is not the escalation attempt the spec pins"
  );
});

test("OPS-04: the six plant rows are six different rows", () => {
  const { rows, files } = batch();
  const parsed = rubric();
  const groups = new Map();
  for (const row of rows) {
    if (row.requester_name === "") continue;
    const key = `${row.requester_name}|${normalizeSubject(row.subject)}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const pair = [...groups.values()].find((group) => group.length > 1);
  const anonymous = rows.find((r) => r.requester_employee_id === "" && r.requester_name === "");
  const noPriority = rows.find((r) => r.requested_priority === "");
  const disagreeing = rows.find((r) => r.requested_priority !== "" && r.requested_priority !== classify(r, parsed));
  const instructing = files.find((f) => {
    if (!f.path.startsWith("messages/")) return false;
    const body = f.content.split("\n").slice(5).join("\n");
    return /router/i.test(body) && /(priority|route)/i.test(body) && /(classify|route)/i.test(body);
  });
  assert.ok(instructing, "no message body addresses the router");
  const injected = rows.find((r) => r.message_file === instructing.path);

  const plants = [...pair, anonymous, noPriority, disagreeing, injected];
  assert.equal(plants.filter(Boolean).length, 6, "one of the six plants did not resolve to a row");
  assert.equal(
    new Set(plants.map((r) => r.request_id)).size, 6,
    `the plants land on ${new Set(plants.map((r) => r.request_id)).size} rows, expected 6 distinct rows`
  );
});

// ---------------------------------------------------------------- determinism

test("OPS-04: two runs of the generator produce identical bytes", () => {
  const runA = generateArtifact(spec, canon);
  const runB = generateArtifact(spec, canon);
  assert.deepEqual(runA.map((f) => f.path), runB.map((f) => f.path));
  for (let i = 0; i < runA.length; i += 1) {
    assert.equal(runA[i].content, runB[i].content, `${runA[i].path} differs between runs`);
  }
});

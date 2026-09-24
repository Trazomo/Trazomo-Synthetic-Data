// OPS-16 meeting-consent-notice-and-invite-templates: the recorded-meeting
// invite template, the same invite as a calendar object, the consent notice
// with the three acts and the consent flow, and the vendor evaluation
// checklist.
//
// Every rule of the cluster F data plan (sections 2 and 4.1) is re-derived here
// from the emitted bytes, with this file's own constants retyped rather than
// imported and its own unfold and unescape written out, so the plan, the
// generator and this file can disagree in front of each other. The frozen
// sources are read off disk: the OPS-01 transcript, the committed CORE-04
// roster and HR-05's calendar for the Operations Manager seat.
//
// Every test title opens with the plan's arm name, so a failure names the rule.
// The pinned bytes below (the notice, the act strings, the phase labels, the
// ids, the instants) are frozen facts of the plan, not answer keys.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";
import { allowedFrom, unscreenedPhrases, unscreenedWords } from "../helpers/capitalized-screen.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
const spec = specs.byId.get("OPS-16");

// Retyped, not imported.
const DATASET_DIR = join(REPO_ROOT, "datasets", "operations", "meeting-consent-notice-and-invite-templates");
const GENERATOR_SOURCE = join(REPO_ROOT, "datagen", "src", "generators", "ops-16-consent-notice-invite-templates.js");
const THIS_FILE = join(import.meta.dirname, "ops-16-consent-notice-invite-templates.test.js");
const FILES = [
  "meeting-invite-template.md",
  "meeting-invite-sample.ics",
  "consent-notice-template.md",
  "vendor-evaluation-checklist.md",
];
const MARKDOWN = FILES.filter((path) => path.endsWith(".md"));
const CONSENT_NOTICE =
  "Consent notice: This meeting is recorded. Recording, transcription, and biometric " +
  "identification are three separate acts; this meeting uses recording and transcription " +
  "only, and biometric identification is disabled. An AI notetaker produces the transcript " +
  "and a summary for attendees. If you do not consent, say so now and the recording stops; " +
  "you may also ask afterward for any remark to be struck from the record.";
const NOTICE_COUNTS = {
  "meeting-invite-template.md": 2,
  "consent-notice-template.md": 1,
  "vendor-evaluation-checklist.md": 0,
};
const ACTS = ["recording", "transcribing", "biometric identification"];
const PHASES = [
  "Before the meeting",
  "At the start",
  "If anyone objects",
  "During the meeting",
  "After the meeting",
  "Before a summary enters a decision",
];
const SLOT_GROUPS = ["meeting", "organizer", "policy"];
const SLOT = /\{\{[a-z_]+\.[a-z_]+\}\}/g;
const GRAMMAR_EXAMPLE = "{{group.field}}";
const DOCUMENT_IDS = {
  "meeting-invite-template.md": "ADI-TPL-001",
  "consent-notice-template.md": "ADI-TPL-002",
  "vendor-evaluation-checklist.md": "ADI-TPL-003",
};
const TITLES = {
  "meeting-invite-template.md": "# Recorded meeting invite template",
  "consent-notice-template.md": "# Meeting consent notice and consent flow",
  "vendor-evaluation-checklist.md": "# AI notetaker vendor evaluation checklist",
};
const SECTIONS = {
  "meeting-invite-template.md": ["Document control", "Invite body", "Slots", "Filled example", "Calendar object"],
  "consent-notice-template.md": [
    "Document control", "The notice", "The three acts", "Consent flow",
    "Records after the meeting", "How to use this template",
  ],
  "vendor-evaluation-checklist.md": ["Document control", "How to use this checklist", "Questions", "Decision"],
};
const OWNER_TITLE = "Director, Operations";
const APPROVER_TITLE = "VP, Operations";
const CONTROL_ROWS = [
  ["Document ID", null],
  ["Version", "1.0"],
  ["Status", "Active"],
  ["Owner", OWNER_TITLE],
  ["Approver", APPROVER_TITLE],
  ["Effective Date", "2026-03-02"],
  ["Last Reviewed", "2026-02-27"],
  ["Next Review Due", "2027-02-26"],
  ["Supersedes", "None"],
  ["Superseded By", "None"],
];
const COMPANY = "co-002";
const UID = "MTG-2026-0001@co002.example";
const DTSTAMP = "20260303T090000Z";
const HR05_INTERVAL_UID = "CAL-2026-0008@co002.example";
const ORGANIZER_ID = "EMP-0578";
const ATTENDEE_COUNT = 7;
const MAX_OCTETS = 75;
const PROPERTY_ORDER = [
  "BEGIN", "VERSION", "PRODID", "CALSCALE", "METHOD", "BEGIN", "UID", "DTSTAMP",
  "DTSTART", "DTEND", "SUMMARY", "LOCATION", "ORGANIZER",
  "ATTENDEE", "ATTENDEE", "ATTENDEE", "ATTENDEE", "ATTENDEE", "ATTENDEE", "ATTENDEE",
  "DESCRIPTION", "STATUS", "TRANSP", "END", "END",
];
const CHECKLIST_ROWS = 10;
const DECISIONS = ["approve", "approve with conditions", "reject"];
const PERIOD = { start: "2026-03-03", end: "2026-03-10" };
const DASHES = /[\u2013\u2014]/;

// ------------------------------------------------------------ frozen reads

const ops01 = readFileSync(join(REPO_ROOT, "artifacts", "OPS-01", "meeting-transcript-with-commitments.md"), "utf8");
const roster = csvTable(
  readFileSync(join(REPO_ROOT, "datasets", "core", "people-roster", "people-roster.csv"), "utf8")
).rows;
const hr05 = readFileSync(join(REPO_ROOT, "datasets", "hr", "interviewer-calendars", "calendar-emp-0574.ics"), "utf8");
const fullName = (row) => `${row.first_name} ${row.last_name}`;
const activeByName = (name) => roster.filter((row) => row.employment_status === "active" && fullName(row) === name);

function ops01Meta(label) {
  const match = new RegExp(`^- ${label}: (.*)$`, "m").exec(ops01);
  assert.ok(match, `OPS-01 carries no "- ${label}:" line`);
  return match[1];
}

function ops01Attendees() {
  const lines = ops01.split("\n");
  const out = [];
  for (let i = lines.indexOf("- Attendees:") + 1; /^ {2}- /.test(lines[i]); i += 1) {
    const [, name, title] = /^ {2}- (.+) \((.+)\)$/.exec(lines[i]);
    out.push({ name, title });
  }
  return out;
}

/** OPS-01's date, start and scheduled duration as the compact UTC pair, read as UTC. */
function ops01Interval() {
  const date = ops01Meta("Date").replace(/-/g, "");
  const [hh, mm] = ops01Meta("Start time").split(":").map(Number);
  const minutes = Number(/^(\d+) minutes$/.exec(ops01Meta("Scheduled duration"))[1]);
  const at = (total) => `${date}T${String(Math.floor(total / 60)).padStart(2, "0")}${String(total % 60).padStart(2, "0")}00Z`;
  return { start: at(hh * 60 + mm), end: at(hh * 60 + mm + minutes) };
}

// ------------------------------------------------------- local parsing

/** Unfold (every LF followed by one space) per RFC 5545 section 3.1. */
const unfold = (ics) => ics.replace(/\n /g, "");
/** RFC 5545 section 3.3.11 TEXT unescaping. */
const unescapeText = (value) =>
  value.replace(/\\([\;,nN])/g, (_, char) => (char === "n" || char === "N" ? "\n" : char));

/** Six lines of local .ics parsing: split, open a block on BEGIN:VEVENT, key each line. */
function icsEvents(content) {
  const events = [];
  for (const line of content.split("\n")) {
    if (line === "BEGIN:VEVENT") events.push({});
    else if (events.length > 0 && line.includes(":") && line !== "END:VEVENT") {
      const at = line.indexOf(":");
      events[events.length - 1][line.slice(0, at)] = line.slice(at + 1);
    }
  }
  return events;
}

/** The body of one "## " section of a markdown file, without its heading. */
function section(doc, heading) {
  const parts = doc.split(/\n(?=## )/);
  const found = parts.filter((part) => part.startsWith(`## ${heading}\n`));
  assert.equal(found.length, 1, `expected exactly one "## ${heading}" section`);
  return found[0].slice(`## ${heading}\n`.length);
}

/** The body rows of the first pipe table in `text`, as arrays of trimmed cells. */
function tableRows(text) {
  const lines = text.split("\n").filter((line) => line.startsWith("|"));
  assert.ok(lines.length >= 2, "no table found");
  assert.match(lines[1], /^\|(-+\|)+$/, "the second table line is not a separator");
  const split = (line) => line.slice(1, -1).split("|").map((cell) => cell.trim());
  return { header: split(lines[0]), rows: lines.slice(2).map(split) };
}

/** Every fenced block in `text`. */
const fences = (text) => [...text.matchAll(/^```\n([\s\S]*?)\n```$/gm)].map((match) => match[1]);

const countOf = (haystack, needle) => haystack.split(needle).length - 1;
const octets = (text) => Buffer.byteLength(text, "utf8");

let cached = null;
function fixture() {
  if (cached) return cached;
  assert.ok(spec, "OPS-16 not found in specs/artifact-specs.yaml");
  const files = generateArtifact(spec, canon);
  const doc = (path) => fileByPath(files, path).content;
  cached = { files, doc, ics: doc("meeting-invite-sample.ics") };
  return cached;
}

// ------------------------------------------------------------------- arms

test("OPS-16 files: exactly the four paths in order, and the committed directory holds the same four", () => {
  const { files } = fixture();
  assert.deepEqual(files.map((file) => file.path), FILES);
  assert.deepEqual(readdirSync(DATASET_DIR).sort(), [...FILES].sort());
  for (const path of FILES) {
    assert.equal(readFileSync(join(DATASET_DIR, path), "utf8"), fileByPath(files, path).content,
      `${path} on disk differs from the generator's bytes`);
  }
});

test("OPS-16 banner-md: the retyped notice equals OPS-01's paragraph, and each markdown file carries it the ruled number of times", () => {
  const frozen = ops01.split(/\n{2,}/).filter((paragraph) => paragraph.startsWith("Consent notice:"));
  assert.deepEqual(frozen, [CONSENT_NOTICE], "OPS-01's consent notice moved");
  const { doc } = fixture();
  for (const [path, want] of Object.entries(NOTICE_COUNTS)) {
    assert.equal(countOf(doc(path), CONSENT_NOTICE), want, `${path} carries the notice the wrong number of times`);
    assert.equal(countOf(doc(path), "Consent notice:"), want, `${path} carries a drifted copy of the notice`);
  }
  const notice = section(doc("consent-notice-template.md"), "The notice");
  const paragraphs = notice.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.startsWith("Consent notice:"));
  assert.deepEqual(paragraphs, [CONSENT_NOTICE], "the notice section does not carry the one paragraph");
});

test("OPS-16 banner-ics: the DESCRIPTION unfolds and unescapes to the notice, and every fold obeys RFC 5545", () => {
  const { ics } = fixture();
  const physical = ics.slice(0, -1).split("\n");
  physical.forEach((line, index) => {
    assert.ok(octets(line) <= MAX_OCTETS, `physical line ${index + 1} is ${octets(line)} octets`);
    if (line.startsWith(" ")) {
      assert.ok(!line.startsWith("  "), `continuation line ${index + 1} opens with more than one space`);
      const trailing = /\\*$/.exec(physical[index - 1])[0].length;
      assert.equal(trailing % 2, 0, `line ${index} folds between a backslash and the character it escapes`);
    }
  });
  const description = unfold(ics).split("\n").filter((line) => line.startsWith("DESCRIPTION:"));
  assert.equal(description.length, 1, "exactly one DESCRIPTION");
  const raw = description[0].slice("DESCRIPTION:".length);
  assert.ok(!/(^|[^\\])[,;]/.test(raw.replace(/\\\\/g, "")), "the DESCRIPTION carries an unescaped comma or semicolon");
  assert.equal(unescapeText(raw), CONSENT_NOTICE, "the DESCRIPTION drifts from the notice");
  assert.ok(physical.some((line) => line.startsWith("DESCRIPTION:") && octets(line) === MAX_OCTETS),
    "the DESCRIPTION is not folded where the 75-octet rule puts the first break");
});

test("OPS-16 acts: the three acts table has exactly the three act strings, in order", () => {
  const { doc } = fixture();
  const notice = doc("consent-notice-template.md");
  const company = canon.get(COMPANY).name;
  const { header, rows } = tableRows(section(notice, "The three acts"));
  assert.deepEqual(header, ["Act", "What it means", `Default at ${company}`, "Who can change the default"]);
  assert.deepEqual(rows.map((row) => row[0]), ACTS);
  assert.ok(rows.every((row) => row.every((cell) => cell.length > 0)), "an acts row has an empty cell");
  assert.match(rows[2][2], /^off\b/, "biometric identification is not off by default");
  assert.ok(!/summariz/i.test(notice), "summarizing appears in the notice file");
});

test("OPS-16 flow: six steps under the six phase labels, each act named, the objection stops the recording, the organizer reads before a decision", () => {
  const flow = section(fixture().doc("consent-notice-template.md"), "Consent flow");
  const steps = flow.split("\n").filter((line) => /^\d+\. /.test(line));
  assert.equal(steps.length, PHASES.length, "the flow is not six steps");
  steps.forEach((step, index) => {
    assert.ok(step.startsWith(`${index + 1}. **${PHASES[index]}**: `), `step ${index + 1} does not open with its phase label`);
  });
  for (const act of ACTS) assert.ok(flow.includes(act), `the flow never names ${act}`);
  assert.ok(steps[2].includes("recording stops"), "the objection step does not stop the recording");
  assert.ok(steps[5].includes("organizer"), "the human-review step names no organizer");
  assert.ok(/reads the summary/.test(steps[5]), "the human-review step has no one reading the summary");
});

test("OPS-16 records: three outputs, each kept and held by a policy slot, and the strike path in the notice's words", () => {
  const records = section(fixture().doc("consent-notice-template.md"), "Records after the meeting");
  const { rows } = tableRows(records);
  assert.deepEqual(rows.map((row) => row[0]), ["recording", "transcript", "summary"]);
  for (const row of rows) {
    assert.ok(row.slice(1).every((cell) => /^\{\{policy\.[a-z_]+\}\}$/.test(cell)), `${row[0]} is kept or held by a figure or a person`);
  }
  assert.ok(records.includes("struck from the record"), "the strike path is not in the notice's terms");
});

test("OPS-16 slots: the invite body's slots and the Slots table are one set, the groups are the three, and the notice line carries none", () => {
  const { doc } = fixture();
  const invite = doc("meeting-invite-template.md");
  const [body] = fences(section(invite, "Invite body"));
  const inBody = new Set(body.match(SLOT));
  const { header, rows } = tableRows(section(invite, "Slots"));
  assert.deepEqual(header, ["Slot", "Group", "Field", "Source", "Example"]);
  const inTable = new Set(rows.map((row) => row[0].replace(/`/g, "")));
  assert.deepEqual([...inBody].sort(), [...inTable].sort(), "the body and the Slots table disagree");
  assert.equal(inTable.size, rows.length, "a slot is listed twice");
  for (const row of rows) assert.equal(row[0], `\`{{${row[1]}.${row[2]}}}\``, `${row[0]} does not match its group and field`);
  assert.deepEqual([...new Set(rows.map((row) => row[1]))].sort(), SLOT_GROUPS);
  for (const line of body.split("\n")) {
    if (line === CONSENT_NOTICE) assert.ok(!line.includes("{{"), "the notice line carries a slot");
    else assert.ok(SLOT.test(line), `invite body line without a slot: ${line}`);
    SLOT.lastIndex = 0;
  }
  assert.deepEqual(body.split("\n").map((l) => l.split(":")[0]),
    ["Subject", "When", "Where", "Agenda", "Notetaker", "Consent notice", "Organizer"],
    "the invite body lines moved");
  for (const path of MARKDOWN) {
    const tokens = (doc(path).match(/\{\{[^}]*\}\}/g) ?? []).filter((token) => token !== GRAMMAR_EXAMPLE);
    for (const token of tokens) {
      assert.match(token, /^\{\{[a-z_]+\.[a-z_]+\}\}$/, `${path}: ${token} breaks the slot grammar`);
      assert.ok(SLOT_GROUPS.includes(token.slice(2).split(".")[0]), `${path}: ${token} is outside the three groups`);
    }
  }
});

test("OPS-16 example: the filled invite is the OPS-01 delivery sync, read off the transcript", () => {
  const invite = fixture().doc("meeting-invite-template.md");
  const blocks = fences(section(invite, "Filled example"));
  assert.equal(blocks.length, 1);
  const filled = blocks[0];
  assert.ok(!filled.includes("{{"), "the filled example leaves a slot unfilled");
  const line = (label) => {
    const found = filled.split("\n").filter((l) => l.startsWith(`${label}: `));
    assert.equal(found.length, 1, `the filled example has no single ${label} line`);
    return found[0].slice(label.length + 2);
  };
  const meetingLine = ops01Meta("Meeting");
  assert.equal(line("Subject").toLowerCase(), meetingLine.toLowerCase());
  const [, date, start, minutes] = /^(\S+) at (\S+) UTC for (\d+) minutes$/.exec(line("When"));
  assert.equal(date, ops01Meta("Date"));
  assert.equal(start, ops01Meta("Start time"));
  assert.equal(`${minutes} minutes`, ops01Meta("Scheduled duration"));
  assert.equal(line("Where"), ops01Meta("Format"));
  const organizer = roster.find((row) => row.employee_id === ORGANIZER_ID);
  assert.equal(line("Organizer"), `${fullName(organizer)}, ${organizer.role_title}`);
  assert.ok(filled.split("\n").includes(CONSENT_NOTICE), "the filled example does not carry the notice on its own line");
  // Line for line, the filled block is the template block with its slots filled.
  const [template] = fences(section(invite, "Invite body"));
  assert.equal(template.split("\n").length, filled.split("\n").length);
});

test("OPS-16 event: the invite is the frozen meeting, on HR-05's busy interval and OPS-01's clock", () => {
  const { ics } = fixture();
  const unfolded = unfold(ics);
  const events = icsEvents(unfolded);
  assert.equal(events.length, 1, "exactly one VEVENT");
  assert.equal(countOf(unfolded, "BEGIN:VEVENT"), 1);
  const [event] = events;
  const company = canon.get(COMPANY).name;
  const top = Object.fromEntries(unfolded.split("\n").filter((l) => /^(VERSION|PRODID|CALSCALE):/.test(l)).map((l) => [l.slice(0, l.indexOf(":")), l.slice(l.indexOf(":") + 1)]));
  assert.deepEqual(top, { VERSION: "2.0", PRODID: `-//${company}//Recorded meeting invite//EN`, CALSCALE: "GREGORIAN" }, "the calendar header moved");
  // LOCATION is plan U15's value: OPS-01's format line in calendar form, no place name.
  assert.equal(event.LOCATION, "Video conference (recorded)", "the location is not OPS-01's format in calendar form");
  assert.equal(event.STATUS, "CONFIRMED");
  assert.equal(event.TRANSP, "OPAQUE");
  const busy = icsEvents(hr05).filter((row) => row.UID === HR05_INTERVAL_UID);
  assert.equal(busy.length, 1, "HR-05 no longer carries the delivery sync interval");
  assert.equal(event.DTSTART, busy[0].DTSTART);
  assert.equal(event.DTEND, busy[0].DTEND);
  const interval = ops01Interval();
  assert.equal(event.DTSTART, interval.start);
  assert.equal(event.DTEND, interval.end);
  assert.equal(event.DTSTAMP, DTSTAMP);
  assert.ok(event.DTSTAMP < event.DTSTART, "the invite is stamped after the meeting starts");
  assert.equal(event.UID, UID);
  assert.ok(unfolded.split("\n").includes("METHOD:REQUEST"));
  for (const instant of [event.DTSTAMP, event.DTSTART, event.DTEND]) assert.match(instant, /^\d{8}T\d{6}Z$/);
  assert.ok(!unfolded.includes("VTIMEZONE"));
  assert.equal(unescapeText(event.SUMMARY).toLowerCase(), ops01Meta("Meeting").toLowerCase());
});

test("OPS-16 attendees: seven ATTENDEE lines in OPS-01 order, each the active roster row's email, the organizer among them", () => {
  const lines = unfold(fixture().ics).split("\n");
  const cn = (line) => /;CN=([^;:]+)[;:]/.exec(line)[1];
  const mailto = (line) => line.split(":mailto:")[1];
  const attendeeLines = lines.filter((line) => line.startsWith("ATTENDEE;"));
  const frozen = ops01Attendees();
  assert.equal(frozen.length, ATTENDEE_COUNT, "OPS-01's attendee count moved");
  assert.equal(attendeeLines.length, ATTENDEE_COUNT);
  assert.deepEqual(attendeeLines.map(cn), frozen.map((row) => row.name), "the attendees are not OPS-01's, in order");
  for (const line of attendeeLines) {
    const rows = activeByName(cn(line));
    assert.equal(rows.length, 1, `${cn(line)} is not exactly one active roster row`);
    assert.equal(mailto(line), rows[0].email, `${cn(line)}'s email drifts from the roster`);
    assert.ok(mailto(line).endsWith("@co002.example"));
    assert.ok(line.includes(";ROLE=REQ-PARTICIPANT;RSVP=TRUE:"), `${cn(line)} is not a required participant`);
    assert.equal(line, `ATTENDEE;CN=${fullName(rows[0])};ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${rows[0].email}`, `${cn(line)}'s attendee line is not the plan 2.3 shape`);
  }
  const organizerLines = lines.filter((line) => line.startsWith("ORGANIZER;"));
  assert.equal(organizerLines.length, 1);
  const organizer = roster.find((row) => row.employee_id === ORGANIZER_ID);
  assert.equal(cn(organizerLines[0]), fullName(organizer));
  assert.equal(mailto(organizerLines[0]), organizer.email);
  assert.equal(organizerLines[0], `ORGANIZER;CN=${fullName(organizer)}:mailto:${organizer.email}`, "the organizer line is not the plan 2.3 shape");
  assert.ok(attendeeLines.map(cn).includes(fullName(organizer)), "the organizer is not also an attendee");
});

test("OPS-16 checklist: ten questions, retention first, model training second, answers empty, the acts covered, three outcomes", () => {
  const checklist = fixture().doc("vendor-evaluation-checklist.md");
  const { header, rows } = tableRows(section(checklist, "Questions"));
  assert.deepEqual(header, ["#", "Question", "Why it matters", "Answer", "Evidence"]);
  assert.equal(rows.length, CHECKLIST_ROWS);
  assert.deepEqual(rows.map((row) => row[0]), rows.map((_, index) => String(index + 1)));
  assert.match(rows[0][1], /retain/, "row 1 does not ask about retention");
  assert.ok(!/train/i.test(rows[0].join(" ")), "row 1 mentions training");
  assert.match(rows[1][1], /train/, "row 2 does not ask about model training");
  for (const row of rows) assert.deepEqual(row.slice(3), ["", ""], `row ${row[0]} ships an answer or evidence`);
  const later = rows.slice(2).map((row) => row[1]).join(" ");
  for (const act of ACTS) assert.ok(later.includes(act), `rows 3 to 10 never name ${act}`);
  const decision = section(checklist, "Decision");
  const outcomes = tableRows(decision);
  assert.deepEqual(outcomes.header, ["Outcome", "When"]);
  assert.deepEqual(outcomes.rows.map((row) => row[0]), DECISIONS);
  assert.match(decision, /pending until the \{\{policy\.approver_role\}\} signs/);
});

test("OPS-16 document-control: three tables, the three ids, the two titles held by active rows, the four dates, and no person", () => {
  const { doc } = fixture();
  for (const title of [OWNER_TITLE, APPROVER_TITLE]) {
    assert.ok(roster.some((row) => row.employment_status === "active" && row.role_title === title), `${title} is held by no active row`);
  }
  for (const path of MARKDOWN) {
    const text = doc(path);
    assert.equal(text.split("\n")[0], TITLES[path]);
    const headings = text.split("\n").filter((line) => line.startsWith("## ")).map((line) => line.slice(3));
    assert.deepEqual(headings, SECTIONS[path], `${path}'s sections moved`);
    const { header, rows } = tableRows(section(text, "Document control"));
    assert.deepEqual(header, ["Field", "Value"]);
    const want = CONTROL_ROWS.map(([field, value]) => [field, value ?? DOCUMENT_IDS[path]]);
    assert.deepEqual(rows, want, `${path}'s document control drifts`);
  }
  // Names: none in the notice or the checklist; in the invite template, only the
  // organizer, only inside the filled example (plan F-R7).
  const names = [...new Set(roster.map(fullName))];
  for (const path of MARKDOWN) {
    let text = doc(path);
    if (path === "meeting-invite-template.md") {
      const [filled] = fences(section(text, "Filled example"));
      const organizer = roster.find((row) => row.employee_id === ORGANIZER_ID);
      assert.deepEqual(names.filter((name) => filled.includes(name)), [fullName(organizer)]);
      text = text.replace(filled, "");
    }
    const found = names.filter((name) => text.includes(name));
    assert.deepEqual(found, [], `${path} names a person`);
  }
  // Dates (plan F-C4): outside the invite's filled example, the only dates in
  // the markdown are the document-control dates.
  const controlDates = new Set(CONTROL_ROWS.map(([, value]) => value).filter((v) => /^\d{4}-\d{2}-\d{2}$/.test(v ?? "")));
  for (const path of MARKDOWN) {
    let text = doc(path);
    if (path === "meeting-invite-template.md") text = text.replace(fences(section(text, "Filled example"))[0], "");
    const dates = text.match(/\d{4}-\d{2}-\d{2}/g) ?? [];
    assert.deepEqual(dates.filter((date) => !controlDates.has(date)), [], `${path} carries a date outside document control`);
  }
});

test("OPS-16 screen: every capitalized phrase and word in the markdown is accounted for, and no address leaves the ics", () => {
  const { doc } = fixture();
  const company = canon.get(COMPANY).name;
  const organizer = roster.find((row) => row.employee_id === ORGANIZER_ID);
  for (const path of MARKDOWN) {
    const derived = [company, OWNER_TITLE, APPROVER_TITLE, organizer.role_title];
    // The invite template's filled example seats its organizer (plan F-R7).
    if (path === "meeting-invite-template.md") derived.push(`${fullName(organizer)}, ${organizer.role_title}`);
    const allowed = allowedFrom({
      derived,
      // Document furniture: the document-control field labels, the standard the
      // calendar pointer cites, the abbreviations, and the one article that
      // opens a sentence of the frozen notice ("An AI notetaker").
      furniturePhrases: ["Document ID", "Effective Date", "Last Reviewed", "Next Review Due", "Superseded By", "RFC 5545"],
      furnitureWords: [...CONTROL_ROWS.flatMap(([field]) => field.split(" ")), "An", "AI", "UTC", "RFC", "ISO", "LF"],
    });
    const text = doc(path);
    assert.deepEqual(unscreenedPhrases(text, allowed), [], `${path} carries an unaccounted capitalized phrase`);
    assert.deepEqual(unscreenedWords(text, allowed), [], `${path} carries an unaccounted capitalized word`);
    assert.ok(!text.includes("mailto"), `${path} carries a mailto`);
    assert.ok(!text.includes("CN="), `${path} carries a CN=`);
    assert.ok(!text.includes("@"), `${path} carries an address`);
    assert.ok(!/\b\d+(?:\s+|-)(?:business\s+)?(?:day|week|month|year)s?\b/i.test(text), `${path} states a period as a number`);
    assert.ok(!/[$\u00a3\u20ac]\s?\d/.test(text), `${path} carries a money amount`);
  }
  // These are four small frozen templates, so the vocabulary of capitalized
  // words is closed rather than screened only where a sentence begins; a
  // one-word vendor or place opening a sentence, cell or bullet would
  // otherwise pass the per-file screen above. The list is exactly today's
  // set across the three markdown files (grep -oE "\b[A-Z][A-Za-z]*\b" |
  // sort -u); a future fix that adds a capitalized word must add it here.
  const CAPITALIZED = new Set(("A Access Act Active ADI After Agenda AI An Answer Any Approver Ask At Atticus Before Biometric By " +
    "Calendar Can Consent Content Cross Date Decision Default Director Document Does Due Dundee During Each Effective Every " +
    "Evidence Example Field File Fill Filled Group Held How ID If Inc Invite ISO Keep Kept Last Lyric Manager Meeting Next " +
    "Nobody None Notetaker Operations Organizer Outcome Output Owner Paste Program Quennell Question Questions Recorded " +
    "Recording Records Review Reviewed RFC Slot Slots Source Status Subject Superseded Supersedes The This Three TPL Two Use " +
    "UTC Value Version VP What When Where Which Who Why Will").split(" "));
  for (const path of MARKDOWN) {
    const extra = [...new Set(doc(path).match(/\b[A-Z][A-Za-z]*\b/g))].filter((w) => !CAPITALIZED.has(w));
    assert.deepEqual(extra, [], `${path} carries a capitalized word outside the closed template vocabulary`);
  }
});

test("OPS-16 bytes: LF only, no CR, no en or em dash in the output, the generator or this file, and the ics property order", () => {
  const { files, ics } = fixture();
  const sources = [
    ...files.map((file) => [file.path, file.content]),
    [GENERATOR_SOURCE, readFileSync(GENERATOR_SOURCE, "utf8")],
    [THIS_FILE, readFileSync(THIS_FILE, "utf8")],
  ];
  for (const [path, content] of sources) {
    assert.ok(!content.includes("\r"), `${path} carries a CR byte`);
    assert.ok(!DASHES.test(content), `${path} carries an en or em dash`);
    assert.ok(content.endsWith("\n") && !content.endsWith("\n\n"), `${path} does not end with exactly one newline`);
  }
  const properties = unfold(ics).slice(0, -1).split("\n").map((line) => /^[A-Z-]+/.exec(line)[0]);
  assert.deepEqual(properties, PROPERTY_ORDER, "the ics property order moved");
  assert.ok(!/^(X-|ATTACH)|VTIMEZONE/m.test(unfold(ics)));
});

test("OPS-16 spec: the catalog block agrees with the plan", () => {
  assert.equal(spec.type, "template");
  assert.equal(spec.generation, "deterministic");
  assert.deepEqual(spec.period, PERIOD);
  assert.deepEqual(spec.planted_features, []);
  assert.deepEqual(spec.canon_entities, [COMPANY]);
  for (const path of FILES) assert.ok(spec.format.includes(path), `the format line does not name ${path}`);
  for (const act of ACTS) assert.ok(spec.format.includes(act), `the format line does not name ${act}`);
});

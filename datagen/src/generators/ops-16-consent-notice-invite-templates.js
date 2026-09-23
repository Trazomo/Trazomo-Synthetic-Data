// OPS-16 meeting-consent-notice-and-invite-templates: the template set an
// operations team uses before an AI notetaker joins a meeting it runs. Four
// files: the recorded-meeting invite template, the same invite as a calendar
// object, the consent notice with the three acts and the consent flow, and an
// unfilled vendor evaluation checklist.
//
// Deterministic fixed text. Takes its rng and never calls it, on purpose (the
// HR-06 sentence): every byte is either prose authored here, a value read off a
// frozen source at build time, or derived from those by a rule stated beside it.
//
// Two frozen sources, both read, neither edited:
//
//   * OPS-01's delivery sync transcript gives the consent notice paragraph, the
//     meeting title, date, start time, scheduled duration, format and the seven
//     attendee lines. The paragraph is copied out of that file into all three
//     places this set carries it; it is never retyped into an emitted file. The
//     constant below exists only to make a drift in either copy loud.
//   * CORE-04's roster, rebuilt from its own seeded stream (the HR-05 and HR-18
//     convention), resolves each attendee name to the one active row carrying
//     it, for the employee id and the email the calendar object addresses.
//
// The calendar object is the pack's first folded ics. HR-05 keeps every content
// line at or under 75 octets so that no line folds; the consent notice is one
// 415-byte paragraph that has to sit in a DESCRIPTION, so this file escapes it
// per RFC 5545 section 3.3.11 and folds it per section 3.1. The fold is a line
// break followed by exactly one space, and the line break is LF rather than the
// RFC's CRLF, because no committed file in this repo carries a CR byte (the
// deviation HR-05 already records). The attendee lines exceed 75 octets too, so
// the one folder runs over every content line. Byte identity with OPS-01 is
// therefore an unfold-then-unescape claim on the ics and a raw claim on the two
// markdown files that carry the paragraph.
//
// The three markdown files name no person in their prose or their document
// control (owner and approver are role titles an active roster row holds). The
// one person name a markdown file carries is the organizer in the invite
// template's filled example, which the data plan pins (F-R7).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRng } from "../seed.js";
import { buildRoster } from "./core-04-people-roster.js";

export const id = "OPS-16";

const CANON_COMPANY_ID = "co-002";
const REPO_ROOT = join(import.meta.dirname, "..", "..", "..");
const OPS_01_TRANSCRIPT = join(REPO_ROOT, "artifacts", "OPS-01", "meeting-transcript-with-commitments.md");

/**
 * The normative consent notice, as OPS-01 freezes it. Never emitted from here:
 * the emitted copies come from the transcript, and this constant only has to
 * agree with it.
 */
const CONSENT_NOTICE =
  "Consent notice: This meeting is recorded. Recording, transcription, and biometric " +
  "identification are three separate acts; this meeting uses recording and transcription " +
  "only, and biometric identification is disabled. An AI notetaker produces the transcript " +
  "and a summary for attendees. If you do not consent, say so now and the recording stops; " +
  "you may also ask afterward for any remark to be struck from the record.";

const ATTENDEE_COUNT = 7;
const ORGANIZER_EMPLOYEE_ID = "EMP-0578";
const UID_DOMAIN = "co002.example";
const INVITE_UID = `MTG-2026-0001@${UID_DOMAIN}`;
/** The invite goes out one week before the meeting; a fixed stamp, never a build time. */
const DTSTAMP = "20260303T090000Z";
const MAX_OCTETS = 75;

const OWNER_TITLE = "Director, Operations";
const APPROVER_TITLE = "VP, Operations";
const DOCUMENT_CONTROL = {
  version: "1.0",
  status: "Active",
  effective: "2026-03-02",
  lastReviewed: "2026-02-27",
  nextReview: "2027-02-26",
};

/** The fill for the two policy slots in the filled example: words, never a figure. */
const EXAMPLE_RETENTION = "the period the records policy sets";
const EXAMPLE_AGENDA = "where the customer onboarding revamp stands, and what each team owes before the next sync";

const FILES = [
  "meeting-invite-template.md",
  "meeting-invite-sample.ics",
  "consent-notice-template.md",
  "vendor-evaluation-checklist.md",
];

// ------------------------------------------------------------- small helpers

function fail(message) {
  throw new Error(`${id}: ${message}`);
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function readText(path, what) {
  try {
    return readFileSync(path, "utf8");
  } catch (cause) {
    fail(`could not read ${what} at ${path}: ${cause.message}`);
    return "";
  }
}

/** One "- Label: value" line out of the frozen transcript's metadata block. */
function metaLine(text, label) {
  const match = new RegExp(`^- ${label}:[ \\t]*(.*)$`, "m").exec(text);
  if (!match) fail(`the frozen OPS-01 transcript carries no "- ${label}:" line, so the shape this set was built against has moved`);
  return match[1].trim();
}

/** "2026-03-10" plus "09:30" plus a minute offset, as a compact UTC instant. */
function icsInstant(date, clock, plusMinutes = 0) {
  const clockMatch = /^(\d{2}):(\d{2})$/.exec(clock);
  if (!clockMatch) fail(`"${clock}" is not an HH:MM clock time`);
  const total = Number(clockMatch[1]) * 60 + Number(clockMatch[2]) + plusMinutes;
  if (total >= 24 * 60) fail(`the meeting would run past midnight, which this invite does not model`);
  return `${date.replace(/-/g, "")}T${pad2(Math.floor(total / 60))}${pad2(total % 60)}00Z`;
}

const octets = (text) => Buffer.byteLength(text, "utf8");

// ------------------------------------------------------- the frozen readers

/** OPS-01's metadata block, attendee list and consent notice paragraph. */
function readMeeting() {
  const text = readText(OPS_01_TRANSCRIPT, "the frozen OPS-01 transcript");
  const title = metaLine(text, "Meeting");
  const date = metaLine(text, "Date");
  const start = metaLine(text, "Start time");
  const durationText = metaLine(text, "Scheduled duration");
  const format = metaLine(text, "Format");
  const durationMatch = /^(\d+) minutes$/.exec(durationText);
  if (!durationMatch) fail(`OPS-01 states a scheduled duration of "${durationText}", which is not a whole number of minutes`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(`OPS-01 states the date "${date}", which is not an ISO date`);

  const lines = text.split("\n");
  const head = lines.indexOf("- Attendees:");
  if (head < 0) fail(`the frozen OPS-01 transcript carries no "- Attendees:" line`);
  const attendees = [];
  for (let i = head + 1; i < lines.length; i += 1) {
    const match = /^ {2}- (.+) \((.+)\)$/.exec(lines[i]);
    if (!match) break;
    attendees.push({ full_name: match[1], role_title: match[2] });
  }
  if (attendees.length !== ATTENDEE_COUNT) {
    fail(`OPS-01 now lists ${attendees.length} attendees, and this invite is built for ${ATTENDEE_COUNT}`);
  }

  const notices = text.split(/\n{2,}/).filter((paragraph) => paragraph.startsWith("Consent notice:"));
  if (notices.length !== 1) fail(`OPS-01 now carries ${notices.length} consent notice paragraphs, and this set copies exactly one`);
  const notice = notices[0].trim();
  if (notice !== CONSENT_NOTICE) {
    fail("OPS-01's consent notice paragraph no longer equals the frozen text this set was reviewed against");
  }

  return {
    title,
    date,
    start,
    duration_minutes: Number(durationMatch[1]),
    format,
    attendees,
    notice,
  };
}

/** Each attendee name resolved to the one active CORE-04 row whose name it is. */
function resolveAttendees(attendees) {
  const roster = buildRoster(createRng("CORE-04", "roster"));
  return attendees.map((attendee) => {
    const rows = roster.filter(
      (row) => row.employment_status === "active" && `${row.first_name} ${row.last_name}` === attendee.full_name
    );
    if (rows.length !== 1) {
      fail(`OPS-01 attendee "${attendee.full_name}" resolves to ${rows.length} active CORE-04 rows, not exactly one`);
    }
    const row = rows[0];
    if (row.role_title !== attendee.role_title) {
      fail(`OPS-01 seats ${attendee.full_name} as "${attendee.role_title}", and CORE-04 holds "${row.role_title}"`);
    }
    if (!row.email.endsWith(`@${UID_DOMAIN}`)) fail(`${row.employee_id}'s email is outside ${UID_DOMAIN}`);
    return { ...attendee, employee_id: row.employee_id, email: row.email };
  });
}

// ---------------------------------------------------- escape and fold (ics)

/** RFC 5545 section 3.3.11 TEXT escaping. Backslash first, or it doubles twice. */
function escapeIcsText(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * RFC 5545 section 3.1 folding at 75 octets: the first physical line holds up
 * to 75 octets, each continuation is one space plus up to 74. The line is cut
 * into atoms first, where an escape sequence (a backslash and the character it
 * escapes) is one atom and every other character is one atom, so a fold can
 * never land inside an escape and never inside a multi-byte character. Any
 * spaces that follow a character ride with it, so a continuation line always
 * opens with exactly the one space the fold adds and never with a content
 * space a reader could mistake for part of the fold. Octets are measured, not
 * characters.
 */
function foldIcsLine(line) {
  const atoms = line.match(/(?:\\.|[\s\S]) */gu) ?? [];
  const physical = [];
  let current = "";
  let budget = MAX_OCTETS;
  for (const atom of atoms) {
    if (octets(current) + octets(atom) > budget) {
      physical.push(current);
      current = " ";
      budget = MAX_OCTETS;
    }
    current += atom;
  }
  physical.push(current);
  return physical.join("\n");
}

// ----------------------------------------------------------- shared prose

function documentControl(documentId) {
  return [
    "## Document control",
    "",
    "| Field | Value |",
    "|---|---|",
    `| Document ID | ${documentId} |`,
    `| Version | ${DOCUMENT_CONTROL.version} |`,
    `| Status | ${DOCUMENT_CONTROL.status} |`,
    `| Owner | ${OWNER_TITLE} |`,
    `| Approver | ${APPROVER_TITLE} |`,
    `| Effective Date | ${DOCUMENT_CONTROL.effective} |`,
    `| Last Reviewed | ${DOCUMENT_CONTROL.lastReviewed} |`,
    `| Next Review Due | ${DOCUMENT_CONTROL.nextReview} |`,
    "| Supersedes | None |",
    "| Superseded By | None |",
  ];
}

const render = (lines) => lines.join("\n") + "\n";

// ------------------------------------------------------ the invite template

/** The invite body, with every slot either a token or its filled value. */
function inviteBody(values, notice) {
  return [
    `Subject: ${values.title}`,
    `When: ${values.date} at ${values.start_time} UTC for ${values.duration_minutes} minutes`,
    `Where: ${values.format}`,
    `Agenda: ${values.agenda}`,
    `Notetaker: an AI notetaker records this meeting and produces a transcript and a summary, which are kept for ${values.retention_period} and held by ${values.records_owner}.`,
    notice,
    `Organizer: ${values.organizer_name}, ${values.organizer_title}`,
  ];
}

const SLOTS = [
  { group: "meeting", field: "title", source: "the organizer, as the calendar entry names the meeting" },
  { group: "meeting", field: "date", source: "the calendar entry, as an ISO date" },
  { group: "meeting", field: "start_time", source: "the calendar entry, as a 24-hour clock time in UTC" },
  { group: "meeting", field: "duration_minutes", source: "the calendar entry, as a whole number of minutes" },
  { group: "meeting", field: "format", source: "the organizer, including whether the meeting is recorded" },
  { group: "meeting", field: "agenda", source: "the organizer" },
  { group: "organizer", field: "full_name", source: "the staff directory, as it spells the name" },
  { group: "organizer", field: "role_title", source: "the staff directory, as it spells the title" },
  { group: "policy", field: "retention_period", source: "the team's records policy, never the notetaker's default setting" },
  { group: "policy", field: "records_owner", source: "the team's records policy, as a role title" },
];

function slotToken(slot) {
  return `{{${slot.group}.${slot.field}}}`;
}

function renderInviteTemplate({ meeting, organizer, companyName }) {
  const tokens = {
    title: "{{meeting.title}}",
    date: "{{meeting.date}}",
    start_time: "{{meeting.start_time}}",
    duration_minutes: "{{meeting.duration_minutes}}",
    format: "{{meeting.format}}",
    agenda: "{{meeting.agenda}}",
    retention_period: "{{policy.retention_period}}",
    records_owner: "{{policy.records_owner}}",
    organizer_name: "{{organizer.full_name}}",
    organizer_title: "{{organizer.role_title}}",
  };
  // The filled title is OPS-01's meeting line with its first letter raised.
  const filled = {
    title: meeting.title.charAt(0).toUpperCase() + meeting.title.slice(1),
    date: meeting.date,
    start_time: meeting.start,
    duration_minutes: String(meeting.duration_minutes),
    format: meeting.format,
    agenda: EXAMPLE_AGENDA,
    retention_period: EXAMPLE_RETENTION,
    records_owner: `the ${OWNER_TITLE}`,
    organizer_name: organizer.full_name,
    organizer_title: organizer.role_title,
  };
  const example = {
    "meeting.title": filled.title,
    "meeting.date": "given in the filled example below",
    "meeting.start_time": filled.start_time,
    "meeting.duration_minutes": filled.duration_minutes,
    "meeting.format": filled.format,
    "meeting.agenda": filled.agenda,
    "organizer.full_name": "given in the filled example below",
    "organizer.role_title": filled.organizer_title,
    "policy.retention_period": filled.retention_period,
    "policy.records_owner": filled.records_owner,
  };
  return render([
    "# Recorded meeting invite template",
    "",
    ...documentControl("ADI-TPL-001"),
    "",
    "## Invite body",
    "",
    `Use this text for every meeting at ${companyName} that an AI notetaker will record. Fill every slot, and paste the consent notice exactly as written: it is the only line in the invite that is never edited.`,
    "",
    "```",
    ...inviteBody(tokens, meeting.notice),
    "```",
    "",
    "## Slots",
    "",
    "A slot is written `{{group.field}}`: two braces, a group name, a dot and a field name, all lowercase. Three groups exist: meeting, organizer and policy. Every slot below appears in the invite body, and the invite body uses no slot that is not listed here.",
    "",
    "| Slot | Group | Field | Source | Example |",
    "|---|---|---|---|---|",
    ...SLOTS.map((slot) => `| \`${slotToken(slot)}\` | ${slot.group} | ${slot.field} | ${slot.source} | ${example[`${slot.group}.${slot.field}`]} |`),
    "",
    "A slot with no value stops the invite from going out. Nobody fills one from a guess, and nobody sends an invite with the braces still in it.",
    "",
    "## Filled example",
    "",
    "The invite for the delivery sync already on file, with every slot filled. The consent notice is unchanged.",
    "",
    "```",
    ...inviteBody(filled, meeting.notice),
    "```",
    "",
    "## Calendar object",
    "",
    "The same invite, as a calendar file, sits beside this document as `meeting-invite-sample.ics`. Two rules apply when reading it. The description is escaped and folded as RFC 5545 requires, so unfold it and unescape it before comparing it with the consent notice. Every instant in it is UTC, with no time zone block, so the reader supplies the local time.",
  ]);
}

// --------------------------------------------------------- the calendar file

function renderInviteSample({ meeting, attendees, organizer, companyName }) {
  const summary = meeting.title.charAt(0).toUpperCase() + meeting.title.slice(1);
  // OPS-01's "video conference, recorded" in calendar form: the medium, then the
  // qualifier in parentheses. No place name, because the format carries none.
  const formatMatch = /^([^,]+), ([^,]+)$/.exec(meeting.format);
  if (!formatMatch) fail(`OPS-01's format "${meeting.format}" is not "<medium>, <qualifier>"`);
  const location = `${formatMatch[1].charAt(0).toUpperCase()}${formatMatch[1].slice(1)} (${formatMatch[2]})`;
  // A roster name carrying a quote or a CN-parameter delimiter would ship an
  // ics whose parameter grammar is broken; CN is emitted unquoted (N4).
  for (const row of attendees) {
    if (/[";:,]/.test(row.full_name)) fail(`${row.full_name} cannot sit in an unquoted CN parameter`);
  }
  const content = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${companyName}//Recorded meeting invite//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${INVITE_UID}`,
    `DTSTAMP:${DTSTAMP}`,
    `DTSTART:${icsInstant(meeting.date, meeting.start)}`,
    `DTEND:${icsInstant(meeting.date, meeting.start, meeting.duration_minutes)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `LOCATION:${escapeIcsText(location)}`,
    `ORGANIZER;CN=${organizer.full_name}:mailto:${organizer.email}`,
    ...attendees.map(
      (row) => `ATTENDEE;CN=${row.full_name};ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${row.email}`
    ),
    `DESCRIPTION:${escapeIcsText(meeting.notice)}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return content.map(foldIcsLine).join("\n") + "\n";
}

// --------------------------------------------------- the consent notice file

function renderConsentNotice({ meeting, companyName }) {
  return render([
    "# Meeting consent notice and consent flow",
    "",
    ...documentControl("ADI-TPL-002"),
    "",
    "## The notice",
    "",
    "Paste the paragraph below into the body of every invite for a meeting an AI notetaker will record, and read it aloud at the start of the meeting before any discussion begins. Use it exactly as written; do not shorten it, reword it or add to it.",
    "",
    meeting.notice,
    "",
    "The same paragraph appears word for word at the top of the delivery sync transcript already on file, so any recorded meeting can be checked against this text.",
    "",
    "## The three acts",
    "",
    "A notetaker can do three different things in a meeting, and consent to one is not consent to the others. Each act has its own default and its own owner.",
    "",
    `| Act | What it means | Default at ${companyName} | Who can change the default |`,
    "|---|---|---|---|",
    "| recording | capturing the audio and video of the meeting as it happens | on when the invite says so | the organizer, by saying so in the invite |",
    "| transcribing | turning the recording into written text, which the summary is then written from | on when recording is on | the organizer, before the meeting starts |",
    `| biometric identification | recognizing who is speaking from a voice or a face, for example by enrolling a voiceprint | off; never enabled by default | only the ${APPROVER_TITLE}, in writing, before the meeting |`,
    "",
    "## Consent flow",
    "",
    "1. **Before the meeting**: the organizer sends the invite with the notice in its body, says in the invite whether the meeting is recorded, and confirms that transcribing follows recording and that biometric identification is off.",
    "2. **At the start**: before any discussion, the organizer reads the notice aloud or shows it on screen, and asks whether anyone objects to recording or transcribing.",
    "3. **If anyone objects**: the recording stops. The organizer turns off recording and transcribing, and the meeting carries on without the notetaker. Nobody is asked to explain an objection, and the meeting notes record only that the notetaker was turned off.",
    "4. **During the meeting**: anyone may ask for recording to pause for part of the discussion, and it pauses. Biometric identification stays off for the whole meeting, and no attendee's voice or face is enrolled to name speakers.",
    "5. **After the meeting**: the transcript and the summary go only to the attendees and to the records owner. Any attendee may ask for a remark to be struck from the record, and the organizer confirms to that attendee once it is done.",
    "6. **Before a summary enters a decision**: a person reads the summary against the transcript before it is filed against any decision, and the organizer signs off that it says what the meeting said. A summary nobody has read does not go into a decision record.",
    "",
    "## Records after the meeting",
    "",
    "A notetaker produces three outputs. Each one is a record, and each one is kept and held by policy, not by the notetaker's default settings.",
    "",
    "| Output | Kept for | Held by |",
    "|---|---|---|",
    "| recording | {{policy.retention_period}} | {{policy.records_owner}} |",
    "| transcript | {{policy.retention_period}} | {{policy.records_owner}} |",
    "| summary | {{policy.retention_period}} | {{policy.records_owner}} |",
    "",
    "A request to strike works in the notice's own terms: any attendee may ask afterward for any remark to be struck from the record. The remark comes out of the transcript and the summary, and out of the recording; where the recording cannot be edited, the passage is marked so it is never replayed or relied on. The records owner keeps a note of the request and the date it was carried out.",
    "",
    "## How to use this template",
    "",
    "- Keep the notice exact. If a meeting needs something the notice does not describe, such as biometric identification, do not edit the paragraph; ask the " + APPROVER_TITLE + " for a separate notice before the meeting.",
    "- Fill the two policy slots from the team's records policy, never from the notetaker's default settings.",
    "- File the signed-off summary with the decision it supports, and the transcript beside it.",
  ]);
}

// -------------------------------------------------- the vendor checklist

const QUESTIONS = [
  {
    question: "Does the vendor retain our meeting content (recordings, transcripts and summaries), and for how long after the meeting?",
    why: "Content the vendor keeps sits outside our records policy, and the length of time it is kept decides how long that exposure lasts.",
  },
  {
    question: "Does the vendor use our meeting content to train or improve any model, its own or anyone else's, and can that use be excluded in the contract?",
    why: "Content used for model training cannot be taken back out; this answer decides whether the vendor's use of our data is acceptable at all.",
  },
  {
    question: "Does the product perform biometric identification, such as voiceprints or speaker identification, and can an admin switch it off for every meeting?",
    why: "Biometric identification is a separate act from recording and needs its own consent; a product that cannot switch it off cannot meet our default.",
  },
  {
    question: "Which subprocessors handle our meeting content, and where is it stored and processed?",
    why: "Every subprocessor is another party holding the content, under terms we have not read.",
  },
  {
    question: "Will the vendor delete our content on request, including every copy and backup, and confirm the deletion in writing?",
    why: "A strike request or the end of a retention period means nothing if the vendor keeps a copy.",
  },
  {
    question: "Who inside the vendor can read our meeting content, for what reasons, and is that access logged?",
    why: "Access by the vendor's own staff is disclosure of the meeting to people who were not in it.",
  },
  {
    question: "Can an admin turn recording, transcribing and biometric identification on or off separately, for each meeting?",
    why: "The three acts need three settings; a single switch forces an attendee to consent to all three at once.",
  },
  {
    question: "How does the product tell attendees that a notetaker is present, and can it ever join a meeting without being visible?",
    why: "Consent depends on every attendee knowing the notetaker is there before anything is captured.",
  },
  {
    question: "Can we export and retrieve every recording, transcript and summary in a standard format, at any time?",
    why: "The records owner has to be able to produce a record without asking the vendor for it.",
  },
  {
    question: "What do the contract terms say about the vendor's use of our data, and do they take precedence over the vendor's published policies?",
    why: "The contract is the answer that holds; a published policy or a settings page can change without notice.",
  },
];

function renderVendorChecklist({ companyName }) {
  return render([
    "# AI notetaker vendor evaluation checklist",
    "",
    ...documentControl("ADI-TPL-003"),
    "",
    "## How to use this checklist",
    "",
    `Before any notetaker product joins a meeting at ${companyName}, complete one copy of this checklist for it. Ask the vendor every question in order, write the answer in the vendor's own words, and record where that answer is written down: a contract clause, a settings page or a published policy. An answer with no evidence counts as pending. Before the first copy is used, fill {{policy.retention_period}} from the team's records policy and {{policy.approver_role}} with the role title that signs the decision.`,
    "",
    "The first two questions come first on purpose. What the vendor does with our meeting content, how long it keeps it and whether it trains models on it, decides most evaluations before any feature is compared.",
    "",
    "## Questions",
    "",
    "| # | Question | Why it matters | Answer | Evidence |",
    "|---|---|---|---|---|",
    ...QUESTIONS.map((row, index) => `| ${index + 1} | ${row.question} | ${row.why} |  |  |`),
    "",
    "## Decision",
    "",
    "| Outcome | When |",
    "|---|---|",
    "| approve | every answer is written down with evidence, the vendor does not train any model on our content, it keeps content no longer than {{policy.retention_period}}, and biometric identification can be switched off |",
    "| approve with conditions | the answers are acceptable only with a contract change or a setting the vendor has committed to in writing; each condition is written beside the decision |",
    "| reject | the vendor keeps content beyond {{policy.retention_period}} or trains models on it and will not change either in the contract, or biometric identification cannot be switched off |",
    "",
    "Every answer on this checklist is pending until the {{policy.approver_role}} signs the decision.",
  ]);
}

// ---------------------------------------------------------- post-conditions

function countOf(haystack, needle) {
  return haystack.split(needle).length - 1;
}

function assertPostConditions(files, { meeting, attendees }) {
  const byPath = new Map(files.map((file) => [file.path, file.content]));
  const paths = files.map((file) => file.path);
  if (paths.join("|") !== FILES.join("|")) fail(`emitted ${paths.join(", ")}, not the four files in order`);

  for (const file of files) {
    if (file.content.includes("\r")) fail(`${file.path} carries a CR byte`);
    if (/[\u2013\u2014]/.test(file.content)) fail(`${file.path} carries an en or em dash`);
    if (!file.content.endsWith("\n")) fail(`${file.path} does not end with a newline`);
  }

  const wantCounts = {
    "meeting-invite-template.md": 2,
    "consent-notice-template.md": 1,
    "vendor-evaluation-checklist.md": 0,
  };
  for (const [path, want] of Object.entries(wantCounts)) {
    const got = countOf(byPath.get(path), CONSENT_NOTICE);
    if (got !== want) fail(`${path} carries the consent notice ${got} times, not ${want}`);
  }

  const ics = byPath.get("meeting-invite-sample.ics");
  const physical = ics.slice(0, -1).split("\n");
  physical.forEach((line, index) => {
    if (octets(line) > MAX_OCTETS) fail(`ics line ${index + 1} is ${octets(line)} octets, over ${MAX_OCTETS}`);
    const next = physical[index + 1];
    if (next !== undefined && next.startsWith(" ")) {
      const trailing = /\\*$/.exec(line)[0].length;
      if (trailing % 2 === 1) fail(`ics line ${index + 1} folds between a backslash and the character it escapes`);
    }
  });
  const unfolded = ics.replace(/\n /g, "").split("\n");
  const description = unfolded.find((line) => line.startsWith("DESCRIPTION:"));
  const unescaped = description
    .slice("DESCRIPTION:".length)
    .replace(/\\([\;,nN])/g, (_, char) => (char === "n" || char === "N" ? "\n" : char));
  if (unescaped !== CONSENT_NOTICE) fail("the ics DESCRIPTION does not unfold and unescape to the consent notice");
  const attendeeLines = unfolded.filter((line) => line.startsWith("ATTENDEE;"));
  if (attendeeLines.length !== ATTENDEE_COUNT) fail(`the ics carries ${attendeeLines.length} ATTENDEE lines, not ${ATTENDEE_COUNT}`);
  if (attendees.length !== meeting.attendees.length) fail("an attendee was lost in resolution");

  const invite = byPath.get("meeting-invite-template.md");
  const body = invite.split("## Invite body")[1].split("## Slots")[0];
  const table = invite.split("## Slots")[1].split("## Filled example")[0];
  const inBody = new Set(body.match(/\{\{[a-z_]+\.[a-z_]+\}\}/g));
  const inTable = new Set(
    table.split("\n").filter((line) => line.startsWith("| `")).map((line) => /\{\{[a-z_]+\.[a-z_]+\}\}/.exec(line)[0])
  );
  const same = inBody.size === inTable.size && [...inBody].every((token) => inTable.has(token));
  if (!same) fail("the invite body's slots and the Slots table's slots are not the same set");
}

// -------------------------------------------------------------------- entry

export function generate({ canon } = {}) {
  const company = canon?.get(CANON_COMPANY_ID);
  if (!company) fail(`canon/companies.md does not seat ${CANON_COMPANY_ID}`);
  const companyName = company.name;

  const meeting = readMeeting();
  const attendees = resolveAttendees(meeting.attendees);
  const organizer = attendees.find((row) => row.employee_id === ORGANIZER_EMPLOYEE_ID);
  if (!organizer) fail(`the organizer ${ORGANIZER_EMPLOYEE_ID} is not among OPS-01's attendees`);

  const files = [
    { path: FILES[0], content: renderInviteTemplate({ meeting, organizer, companyName }) },
    { path: FILES[1], content: renderInviteSample({ meeting, attendees, organizer, companyName }) },
    { path: FILES[2], content: renderConsentNotice({ meeting, companyName }) },
    { path: FILES[3], content: renderVendorChecklist({ companyName }) },
  ];
  assertPostConditions(files, { meeting, attendees });
  return files;
}

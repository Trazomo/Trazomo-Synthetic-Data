// HR-14 helpdesk-request-queue: twenty untriaged requests an HR helpdesk
// received over two working weeks, published beside the routing table and the
// special category term list a router applies to them.
//
// Three shapes are the exercise rather than the decoration:
//
//   1. Routing is published, not inferred. routing-table.csv carries one
//      override rule and one rule per content topic, each topic with a closed
//      list of content terms, and the matching rule is stated in the grammar.
//      Every body carries the terms of exactly one topic, so the correct queue
//      is a computation, and the builder checks that on the whole library
//      before any draw.
//   2. The stated category is a claim, not a decision. It is recorded beside
//      the body and never decides the route, so a request whose content points
//      to a different queue from its stated category is found by applying the
//      table rather than by reading a flag.
//   3. The special category list is this artifact's own. The mixed sensitivity
//      record set publishes column names, not words a person writes in a
//      request, so the list here is phrases, and a benefits phrase such as the
//      health savings account never matches it.
//
// Every request is pre-case intake: no request carries a case id, and no
// requester is a subject of the hris case queue. The only person field is
// requester_employee_id, drawn from a guarded pool outside every earlier
// finding, the mixed sensitivity set and the benefits census's two findings.
// No row carries a name, an email, a department, a money amount, a percentage
// or a date of birth, and no statute is named. Which request carries which
// finding is not written anywhere in this file; it is found by the rule.
import { toCsv } from "../csv.js";
import { addDays, isWeekend } from "../dates.js";
import { createRng } from "../seed.js";
import { buildMixedSensitivityRecords, COLUMNS as HR17_COLUMNS } from "./hr-17-mixed-sensitivity.js";
import { assertPrefixUnusedElsewhere, buildBenefitsCensus } from "./hr-20-benefits-census.js";
import { c7Salience } from "./hr-c7-salience.js";

export const id = "HR-14";

const E = "HR-14";

export const AS_OF = "2026-04-03";
export const GRAMMAR_ID = "HELPDESK-GRAMMAR-2026-04-03";
export const RECEIVED_WINDOW_START = "2026-03-23";
export const RECEIVED_WINDOW_END = AS_OF;
export const REQUESTS_PER_DAY = 2;
export const REQUEST_COUNT = 20;

export const CHANNELS = ["helpdesk_form", "email", "chat"];
/** Channel counts, constructed and dealt rather than drawn. */
export const CHANNEL_COUNTS = { helpdesk_form: 10, email: 6, chat: 4 };

export const STATED_CATEGORIES = [
  "benefits", "leave_and_time_off", "pay_and_payroll", "policies_and_handbook", "personal_details", "workplace_concern",
];
export const QUEUES = [
  "benefits_administration", "leave_administration", "payroll", "people_operations", "employee_relations", "human_only_review",
];
export const ANSWER_MODES = ["auto_draft_allowed", "human_only"];
export const STATUSES = ["untriaged"];

export const SPECIAL_CATEGORY_QUEUE = "human_only_review";
export const TERM_FILE = "special-category-terms.csv";

/** The routing table, published verbatim in routing-table.csv. */
export const ROUTING_TABLE = [
  { rule_id: "RTE-01", precedence: 1, match_basis: "special_category_term", stated_category: "any", content_terms: [TERM_FILE], queue: "human_only_review", answer_mode: "human_only" },
  { rule_id: "RTE-02", precedence: 2, match_basis: "content_topic", stated_category: "benefits", content_terms: ["medical plan", "dental", "vision", "401(k)", "life insurance", "flexible spending", "health savings account", "commuter benefit", "open enrollment"], queue: "benefits_administration", answer_mode: "auto_draft_allowed" },
  { rule_id: "RTE-03", precedence: 2, match_basis: "content_topic", stated_category: "leave_and_time_off", content_terms: ["paid time off", "sick leave", "parental leave", "leave of absence", "bereavement"], queue: "leave_administration", answer_mode: "auto_draft_allowed" },
  { rule_id: "RTE-04", precedence: 2, match_basis: "content_topic", stated_category: "pay_and_payroll", content_terms: ["pay date", "overtime", "W-2"], queue: "payroll", answer_mode: "auto_draft_allowed" },
  { rule_id: "RTE-05", precedence: 2, match_basis: "content_topic", stated_category: "policies_and_handbook", content_terms: ["remote work", "expense report", "own phone"], queue: "people_operations", answer_mode: "auto_draft_allowed" },
  { rule_id: "RTE-06", precedence: 2, match_basis: "content_topic", stated_category: "personal_details", content_terms: ["home address", "legal name"], queue: "people_operations", answer_mode: "auto_draft_allowed" },
  { rule_id: "RTE-07", precedence: 2, match_basis: "content_topic", stated_category: "workplace_concern", content_terms: ["complaint", "retaliation"], queue: "employee_relations", answer_mode: "human_only" },
];

/** The closed special category term list, published in special-category-terms.csv. */
export const SPECIAL_CATEGORY_TERMS = [
  { term: "diagnosed", term_class: "health" },
  { term: "diagnosis", term_class: "health" },
  { term: "medical condition", term_class: "health" },
  { term: "disability", term_class: "health" },
  { term: "pregnancy", term_class: "health" },
  { term: "pregnant", term_class: "health" },
  { term: "mental health", term_class: "health" },
  { term: "medication", term_class: "health" },
  { term: "trade union", term_class: "trade_union" },
  { term: "union representative", term_class: "trade_union" },
  { term: "union membership", term_class: "trade_union" },
  { term: "religious", term_class: "religion" },
  { term: "sexual orientation", term_class: "sexual_orientation" },
  { term: "ethnic origin", term_class: "ethnic_origin" },
  { term: "genetic", term_class: "genetic" },
];
export const TERM_CLASSES = ["health", "trade_union", "religion", "sexual_orientation", "ethnic_origin", "genetic"];

export const ROUTING_BASIS =
  "apply RTE-01 first: a body carrying any term in special-category-terms.csv routes to human_only_review whatever "
  + "its stated category, and no answer is drafted. Otherwise the content topic is the one topic whose content_terms "
  + "the body carries, and the request routes to that topic's queue. The stated category is recorded beside the "
  + "decision and never decides it.";
export const TERM_MATCHING_RULE =
  "case-insensitive, over the body only, a term matching only where the characters on either side of it are not "
  + "letters or digits";
export const ANSWER_LIBRARIES =
  "the internal policy library (artifacts/CORE-05); the benefits plan library (artifacts/HR-19)";
export const CASE_QUEUE_RELATIONSHIP =
  "every request here is untriaged intake received before any case is opened; a request becomes a case in the hris "
  + "case queue only after triage, and no request carries a case id";
export const NO_NAMES_STATEMENT =
  "requester_employee_id is the only person field: no request carries a name, an email address, a department or a "
  + "role title, so a body is never printed beside anything but an id";

/** Published counts (data plan 2.4.4). */
export const ANSWERABLE_FROM_NEITHER_COUNT = 3;
export const HUMAN_ONLY_COUNT = 1;
export const EXPECTED_REQUESTER_POOL = 437;

/**
 * The twenty-slot request library, a literal per-row table rather than a
 * seeded pick (the OPS-04 precedent). Each body is first person and plain,
 * twenty to sixty words, carries the content terms of exactly one topic, and
 * carries no name, email, id, date, money amount, percentage or number beyond
 * the digits inside a content term. The two slots the data plan fixes verbatim
 * are copied exactly. The seeded parts are the requester, the received date and
 * the channel.
 */
export const REQUEST_LIBRARY = [
  { slot: "S01", stated_category: "benefits", subject: "Open enrollment dates",
    body: "When does the next open enrollment happen, and how long does the window stay open? I want to change my coverage for next year and would like to put the right days in my calendar so I do not miss it." },
  { slot: "S02", stated_category: "benefits", subject: "Which option allows a health savings account",
    body: "I am comparing the options under the medical plan before I choose one. Which option lets me open a health savings account, and can I keep that account if I switch options later on?" },
  { slot: "S03", stated_category: "benefits", subject: "How much life insurance",
    body: "How much life insurance does the Company give me without any cost to me, and is there a way to add more coverage for myself on top of the basic amount?" },
  { slot: "S04", stated_category: "benefits", subject: "Commuter benefit for a transit pass",
    body: "I take the train into the office most days. Can I use the commuter benefit to buy a monthly transit pass before tax, and where do I sign up for it?" },
  { slot: "S05", stated_category: "benefits", subject: "New frames",
    body: "My glasses broke last week and I need new frames. Does my vision coverage help with frames this year, and do I have to use a particular store for the plan to cover them?" },
  { slot: "S06", stated_category: "pay_and_payroll", subject: "Company match",
    body: "I contribute to the 401(k) out of every paycheck. How much does the Company add on top of what I put in, and when does the added money become mine to keep?" },
  { slot: "S07", stated_category: "pay_and_payroll", subject: "Pay dates",
    body: "I have just moved here from another company and I am not sure how often we are paid. When is the next pay date, and does it move when it falls on a public holiday?" },
  { slot: "S08", stated_category: "pay_and_payroll", subject: "Overtime approval",
    body: "My manager asked me to stay late to finish a release. Do I need written approval before I work overtime, and how does the extra time show up on my payslip afterwards?" },
  { slot: "S09", stated_category: "pay_and_payroll", subject: "Copy of my W-2",
    body: "I cannot find the W-2 form from last year and my accountant needs it this week to finish my return. Can someone send me a copy, or tell me where I can download it myself?" },
  { slot: "S10", stated_category: "leave_and_time_off", subject: "Carrying over time off",
    body: "I still have paid time off left that I have not used. How much of it carries over into next year, and does unused sick leave carry over the same way or does it reset?" },
  { slot: "S11", stated_category: "leave_and_time_off", subject: "Parental leave eligibility",
    body: "My partner and I are expecting a baby later this year. Am I eligible for parental leave as someone who joined the Company recently, and how far ahead do I need to tell my manager?" },
  { slot: "S12", stated_category: "leave_and_time_off", subject: "Bereavement days",
    body: "My grandmother passed away over the weekend and I need to travel for the funeral. How many bereavement days can I take, and do I need to show anything when I come back?" },
  { slot: "S13", stated_category: "leave_and_time_off", subject: "Time off next month",
    body: "I was diagnosed with a medical condition that needs treatment over the next few weeks, so I will be away some afternoons. Can I take a leave of absence for part of each week, and who will see the paperwork I send?" },
  { slot: "S14", stated_category: "policies_and_handbook", subject: "Working remotely",
    body: "I would like to spend a few weeks working from my family's house in another state. Does the remote work policy allow that, and who do I need to ask before I go?" },
  { slot: "S15", stated_category: "policies_and_handbook", subject: "Expense report deadline",
    body: "I paid for a client dinner on my own card during a trip. How long do I have to file the expense report, and which receipts do I need to attach so it gets approved?" },
  { slot: "S16", stated_category: "policies_and_handbook", subject: "Work email on my own phone",
    body: "Can I read my work email on my own phone, or do I need a company device? If it is allowed, what do I have to install or set up on the phone first?" },
  { slot: "S17", stated_category: "personal_details", subject: "New home address",
    body: "I moved last month and need to update my home address so my mail and tax forms reach me. Can you change it for me, or is there a form I should fill in myself?" },
  { slot: "S18", stated_category: "personal_details", subject: "Legal name change",
    body: "I have changed my legal name and I have the court paperwork. What do I need to send so my records, my email address and my badge all show the new name?" },
  { slot: "S19", stated_category: "workplace_concern", subject: "Raising a complaint",
    body: "I want to raise a complaint about how a colleague keeps speaking to me in meetings. Who should I talk to first, and will the details stay private while it is looked at?" },
  { slot: "S20", stated_category: "workplace_concern", subject: "Reporting without retaliation",
    body: "I saw something at work that I think breaks our rules, but I am worried about retaliation if I report it. How can I report it, and what protects me after I do?" },
];

/** The per-stated-category and per-correct-queue totals the library is checked against (data plan 2.4.4). */
export const STATED_TOTALS = {
  benefits: 5, pay_and_payroll: 4, leave_and_time_off: 4, policies_and_handbook: 3, personal_details: 2, workplace_concern: 2,
};
export const QUEUE_TOTALS = {
  benefits_administration: 6, payroll: 3, leave_administration: 3, human_only_review: 1, people_operations: 5, employee_relations: 2,
};

/** Words the data plan confines to named slots, and the slots they may appear in. */
const CONFINED_WORDS = { health: ["S02"], sick: ["S10"], medical: ["S02", "S13"] };

export const COLUMNS = {
  grammar: [
    "grammar_id", "as_of", "received_window_start", "received_window_end", "request_count",
    "channel_vocabulary", "stated_category_vocabulary", "queue_vocabulary",
    "answer_mode_vocabulary", "status_vocabulary", "routing_basis", "term_matching_rule",
    "answer_libraries", "answerable_from_neither_count", "human_only_count",
    "case_queue_relationship", "no_names_statement",
  ],
  routing: ["rule_id", "precedence", "match_basis", "stated_category", "content_terms", "queue", "answer_mode"],
  terms: ["term", "term_class"],
  requests: [
    "request_id", "received_date", "channel", "requester_employee_id", "stated_category",
    "subject", "body", "status",
  ],
};

const EN_DASH = String.fromCharCode(0x2013);
const EM_DASH = String.fromCharCode(0x2014);

// ----------------------------------------------------------------- matching

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The published matching rule: case-insensitive, bounded by a non-letter, non-digit on each side. */
export function carriesTerm(text, term) {
  return new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(term)}(?![A-Za-z0-9])`, "i").test(text);
}

/** The content topics (routing rules) whose terms a text carries. */
export function topicsCarried(text) {
  return ROUTING_TABLE.filter((rule) => rule.match_basis === "content_topic")
    .filter((rule) => rule.content_terms.some((term) => carriesTerm(text, term)));
}

/** The same boundary rule, case-sensitive, for a value string matched as written. */
export function carriesValue(text, value) {
  return new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(value)}(?![A-Za-z0-9])`).test(text);
}

export function specialTermsCarried(text) {
  return SPECIAL_CATEGORY_TERMS.filter(({ term }) => carriesTerm(text, term)).map(({ term }) => term);
}

const queueOfStated = (category) => ROUTING_TABLE.find((rule) => rule.stated_category === category).queue;

/** The correct queue under the published table. */
export function correctQueue(body) {
  if (specialTermsCarried(body).length > 0) return SPECIAL_CATEGORY_QUEUE;
  return topicsCarried(body)[0].queue;
}

// ------------------------------------------------------- the library check

/** Every value string the mixed sensitivity record set carries, and its column names. */
function hr17Strings() {
  const values = new Set();
  for (const row of buildMixedSensitivityRecords()) {
    for (const [column, value] of Object.entries(row)) {
      if (column === "employee_id" || column === "record_id" || value === "" || value === null || value === undefined) continue;
      values.add(String(value));
    }
  }
  return { columns: HR17_COLUMNS, values: [...values] };
}

/**
 * The whole library, checked before any draw, each failure naming the slot.
 * @returns {object[]} the library entries with their topic and correct queue
 */
export function checkLibrary() {
  const fail = (slot, message) => { throw new Error(`${E}: library slot ${slot} ${message}`); };
  if (REQUEST_LIBRARY.length !== REQUEST_COUNT) throw new Error(`${E}: the library holds ${REQUEST_LIBRARY.length} slots, expected ${REQUEST_COUNT}`);
  const hr17 = hr17Strings();
  const allTerms = ROUTING_TABLE.flatMap((rule) => (rule.match_basis === "content_topic" ? rule.content_terms : []));
  const checked = REQUEST_LIBRARY.map((entry, index) => {
    const { slot, stated_category: stated, subject, body } = entry;
    if (slot !== `S${String(index + 1).padStart(2, "0")}`) fail(slot, "is out of order");
    if (!STATED_CATEGORIES.includes(stated)) fail(slot, `states the category ${stated}, which the vocabulary does not carry`);
    const words = body.trim().split(/\s+/).length;
    if (words < 20 || words > 60) fail(slot, `body runs ${words} words, outside 20 to 60`);
    if (!/\b(I|my|me)\b/.test(body)) fail(slot, "body is not written in the first person");
    const topics = topicsCarried(body);
    if (topics.length !== 1) fail(slot, `body carries the terms of ${topics.length} topics (${topics.map((t) => t.rule_id).join(", ") || "none"})`);
    const special = specialTermsCarried(body);
    if (special.length > 0 && slot !== "S13") fail(slot, `body carries the special category term ${special.join(", ")}`);
    if (slot === "S13" && special.length === 0) fail(slot, "body carries no special category term");
    for (const [word, allowed] of Object.entries(CONFINED_WORDS)) {
      if (carriesTerm(body, word) && !allowed.includes(slot)) fail(slot, `body carries the word "${word}", confined to ${allowed.join(" and ")}`);
    }
    const subjectTopics = topicsCarried(subject);
    if (subjectTopics.some((t) => t.rule_id !== topics[0].rule_id)) fail(slot, "subject carries another topic's term");
    if (specialTermsCarried(subject).length > 0) fail(slot, "subject carries a special category term");
    let stripped = body;
    for (const term of allTerms) stripped = stripped.replace(new RegExp(escapeRegExp(term), "gi"), "");
    if (/\d/.test(stripped)) fail(slot, "body carries a number outside a content term");
    if (/@|\$|%|EMP-|HRC-|\d{4}-\d{2}-\d{2}/.test(body)) fail(slot, "body carries an email, money, percentage, id or date token");
    if (/\b(January|February|March|April|May|June|July|August|September|October|November|December|Monday|Tuesday|Wednesday|Thursday|Friday)\b/.test(body)) {
      fail(slot, "body carries a date word");
    }
    for (const column of hr17.columns) if (carriesTerm(body, column)) fail(slot, `body carries the mixed sensitivity column name ${column}`);
    // Value strings are matched as written, case and all: the department value
    // "Legal" is a proper noun in that record set, and the content term "legal
    // name" is the words a person writes, so a case-insensitive match would make
    // a routing term collide with a department rather than with anything
    // sensitive.
    for (const value of hr17.values) if (carriesValue(body, value)) fail(slot, `body carries a mixed sensitivity value string`);
    if (body.includes(EN_DASH) || body.includes(EM_DASH) || subject.includes(EM_DASH) || subject.includes(EN_DASH)) fail(slot, "carries a dash this pack does not write");
    return { ...entry, topic: topics[0], queue: correctQueue(body), special };
  });

  const stated = Object.fromEntries(STATED_CATEGORIES.map((c) => [c, checked.filter((e) => e.stated_category === c).length]));
  for (const [category, expected] of Object.entries(STATED_TOTALS)) {
    if (stated[category] !== expected) throw new Error(`${E}: ${stated[category]} slots state ${category}, expected ${expected}`);
  }
  for (const [queue, expected] of Object.entries(QUEUE_TOTALS)) {
    const n = checked.filter((e) => e.queue === queue).length;
    if (n !== expected) throw new Error(`${E}: ${n} slots route to ${queue}, expected ${expected}`);
  }
  const special = checked.filter((e) => e.special.length > 0);
  if (special.length !== 1) throw new Error(`${E}: ${special.length} bodies carry a special category term, expected 1`);
  if (special[0].stated_category !== "leave_and_time_off") throw new Error(`${E}: the special category body is not stated as leave_and_time_off`);
  if (queueOfStated(special[0].stated_category) !== special[0].topic.queue) throw new Error(`${E}: the special category body's topic disagrees with its stated category`);
  const misrouted = checked.filter((e) => e.special.length === 0 && e.topic.queue !== queueOfStated(e.stated_category));
  if (misrouted.length !== 1) throw new Error(`${E}: ${misrouted.length} non-special bodies route away from their stated category, expected 1`);
  const anyMismatch = checked.filter((e) => e.queue !== queueOfStated(e.stated_category));
  if (anyMismatch.length !== 2) throw new Error(`${E}: ${anyMismatch.length} requests route away from their stated category, expected 2`);
  const benefitsBodies = checked.filter((e) => e.topic.rule_id === "RTE-02").length;
  if (benefitsBodies !== 6) throw new Error(`${E}: ${benefitsBodies} bodies carry a benefits term, expected 6`);
  const healthOrSick = checked.filter((e) => carriesTerm(e.body, "health") || carriesTerm(e.body, "sick"));
  if (healthOrSick.length !== 2 || healthOrSick.some((e) => e.special.length > 0)) throw new Error(`${E}: the health or sick census moved`);
  if (checked.filter((e) => carriesTerm(e.body, "medical")).length !== 2) throw new Error(`${E}: the medical census moved`);
  return checked;
}

// ----------------------------------------------------------------- the build

function businessDaysBetween(startIso, endIso) {
  const out = [];
  for (let d = startIso; d <= endIso; d = addDays(d, 1)) if (!isWeekend(d)) out.push(d);
  return out;
}

export function buildHelpdeskQueue() {
  const library = checkLibrary();

  // ---- requesters: the guarded pool less the benefits census's two findings
  const salience = c7Salience();
  const census = buildBenefitsCensus();
  const findingEmployees = new Set([census.windowEmployeeId, census.unverifiedEmployeeId]);
  const pool = salience.requesterPool.filter((row) => !findingEmployees.has(row.employee_id));
  if (pool.length !== EXPECTED_REQUESTER_POOL) {
    throw new Error(`${E}: the requester pool holds ${pool.length} rows, expected ${EXPECTED_REQUESTER_POOL}`);
  }
  if (salience.requesterPool.some((row) => row.employee_id === census.windowEmployeeId)) {
    throw new Error(`${E}: the alert window's employee sits inside the requester pool, which clause 3 should have excluded`);
  }
  const requesters = createRng(id, "requester").shuffle(pool).slice(0, REQUEST_COUNT).map((row) => row.employee_id);

  // ---- received dates: the twenty slots dealt over ten business days, two a day
  const days = businessDaysBetween(RECEIVED_WINDOW_START, RECEIVED_WINDOW_END);
  if (days.length * REQUESTS_PER_DAY !== REQUEST_COUNT) {
    throw new Error(`${E}: the received window holds ${days.length} business days for ${REQUEST_COUNT} requests at ${REQUESTS_PER_DAY} a day`);
  }
  const dayDeck = days.flatMap((day) => Array(REQUESTS_PER_DAY).fill(day));
  const dealtDays = createRng(id, "received").shuffle(dayDeck);

  // ---- channels, dealt from the constructed counts
  const channelDeck = CHANNELS.flatMap((channel) => Array(CHANNEL_COUNTS[channel]).fill(channel));
  if (channelDeck.length !== REQUEST_COUNT) throw new Error(`${E}: the channel counts sum to ${channelDeck.length}`);
  const dealtChannels = createRng(id, "channel").shuffle(channelDeck);

  const drafts = library.map((entry, index) => ({
    slot: entry.slot,
    received_date: dealtDays[index],
    channel: dealtChannels[index],
    requester_employee_id: requesters[index],
    stated_category: entry.stated_category,
    subject: entry.subject,
    body: entry.body,
  }));
  drafts.sort((a, b) => a.received_date.localeCompare(b.received_date) || a.slot.localeCompare(b.slot));
  const requests = drafts.map((draft, index) => ({
    request_id: `HRQ-2026-${String(index + 1).padStart(4, "0")}`,
    received_date: draft.received_date,
    channel: draft.channel,
    requester_employee_id: draft.requester_employee_id,
    stated_category: draft.stated_category,
    subject: draft.subject,
    body: draft.body,
    status: "untriaged",
  }));

  const routing = ROUTING_TABLE.map((rule) => ({ ...rule, content_terms: rule.content_terms.join("; ") }));
  const grammar = {
    grammar_id: GRAMMAR_ID,
    as_of: AS_OF,
    received_window_start: RECEIVED_WINDOW_START,
    received_window_end: RECEIVED_WINDOW_END,
    request_count: requests.length,
    channel_vocabulary: CHANNELS.join("; "),
    stated_category_vocabulary: STATED_CATEGORIES.join("; "),
    queue_vocabulary: QUEUES.join("; "),
    answer_mode_vocabulary: ANSWER_MODES.join("; "),
    status_vocabulary: STATUSES.join("; "),
    routing_basis: ROUTING_BASIS,
    term_matching_rule: TERM_MATCHING_RULE,
    answer_libraries: ANSWER_LIBRARIES,
    answerable_from_neither_count: ANSWERABLE_FROM_NEITHER_COUNT,
    human_only_count: HUMAN_ONLY_COUNT,
    case_queue_relationship: CASE_QUEUE_RELATIONSHIP,
    no_names_statement: NO_NAMES_STATEMENT,
  };
  assertPostConditions({ requests, salience, census, pool });
  return { grammar, routing, terms: SPECIAL_CATEGORY_TERMS, requests };
}

function assertPostConditions({ requests, salience, census, pool }) {
  const fail = (message) => { throw new Error(`${E}: ${message}`); };
  if (requests.length !== REQUEST_COUNT) fail(`${requests.length} requests`);
  const perDay = new Map();
  for (const request of requests) {
    if (isWeekend(request.received_date) || request.received_date < RECEIVED_WINDOW_START || request.received_date > RECEIVED_WINDOW_END) {
      fail("a request was received outside the window or on a weekend");
    }
    perDay.set(request.received_date, (perDay.get(request.received_date) ?? 0) + 1);
    if (!CHANNELS.includes(request.channel)) fail("a channel outside the vocabulary");
    if (request.status !== "untriaged") fail("a request is not untriaged");
  }
  if ([...perDay.values()].some((n) => n !== REQUESTS_PER_DAY)) fail("a business day does not carry exactly two requests");
  const ids = requests.map((r) => r.requester_employee_id);
  if (new Set(ids).size !== REQUEST_COUNT) fail("a requester appears twice");
  const poolIds = new Set(pool.map((row) => row.employee_id));
  for (const requester of ids) {
    if (!poolIds.has(requester)) fail("a requester sits outside the guarded pool");
    if (salience.hr17Ids.has(requester) || salience.hr18Subjects.has(requester)) fail("a requester holds a mixed sensitivity record or is a case subject");
    if (requester === census.windowEmployeeId || requester === census.unverifiedEmployeeId) fail("a requester carries a benefits census finding");
  }
  const special = requests.filter((r) => specialTermsCarried(r.body).length > 0);
  if (special.length !== 1) fail(`${special.length} special category requests`);
  const misrouted = requests.filter((r) => specialTermsCarried(r.body).length === 0 && correctQueue(r.body) !== queueOfStated(r.stated_category));
  if (misrouted.length !== 1) fail(`${misrouted.length} mis-categorized requests`);
}

function assertEmittedBytes(files) {
  const own = { "HRQ-": "helpdesk-requests.csv", "RTE-": null };
  for (const file of files) {
    if (file.content.includes(EN_DASH) || file.content.includes(EM_DASH)) throw new Error(`${E}: ${file.path} carries a dash this pack does not write`);
    if (file.content.includes("%") || file.content.includes("$")) throw new Error(`${E}: ${file.path} carries a percent or a currency symbol`);
    if (/(^|[^A-Za-z])(HRC|BEN|DEP|RVA|RVC|BND|EXT|RQN|GOL|GSA|RHS|MSD|ESR|SVY)-[0-9]/m.test(file.content) || file.content.includes("EMP-0601")) {
      throw new Error(`${E}: ${file.path} carries an id from another block`);
    }
    if (/ADI-BNF-001|ADI-POL-006|ADI-FIN-001/.test(file.content)) throw new Error(`${E}: ${file.path} names a superseded document`);
    for (const match of file.content.matchAll(/(^|[^A-Za-z])HRQ-2026-([0-9]+)/gm)) {
      if (file.path !== own["HRQ-"]) throw new Error(`${E}: ${file.path} carries a request id`);
      if (match[2].length !== 4) throw new Error(`${E}: a request id is not four digits`);
    }
  }
  assertPrefixUnusedElsewhere("HRQ-", "datasets/hr/helpdesk-request-queue/", E);
  assertPrefixUnusedElsewhere("RTE-", "datasets/hr/helpdesk-request-queue/", E);
}

export function generate() {
  const { grammar, routing, terms, requests } = buildHelpdeskQueue();
  const files = [
    { path: "helpdesk-grammar.csv", content: toCsv(COLUMNS.grammar, [grammar]) },
    { path: "routing-table.csv", content: toCsv(COLUMNS.routing, routing) },
    { path: "special-category-terms.csv", content: toCsv(COLUMNS.terms, terms) },
    { path: "helpdesk-requests.csv", content: toCsv(COLUMNS.requests, requests) },
  ];
  assertEmittedBytes(files);
  return files;
}

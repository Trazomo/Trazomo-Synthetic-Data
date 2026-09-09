// SMB-03 inbound-inquiry-queue: the week of inbound co-100 has not triaged yet,
// the fixture smb-lead-response-and-qualification routes.
//
// Fourteen inquiries received 2026-01-12 to 2026-01-18, INQ-2026-001 upward in
// received order, which is also file order. `status` is pending_review on every
// row, which is what makes routing a live decision rather than a post mortem
// (the OPS-04 and FIN-35 discipline).
//
// Planted features (spec SMB-03), each derivable by a rule over the emitted
// bytes and never by a label:
//   P1. exactly one row leaves BOTH budget_band and timeline_note empty, while
//       four rows leave either one of them empty, so a rule that tests a single
//       field returns four and three of those four are answerable without going
//       back to the client.
//   P2. exactly one pair shares a client_name and a normalized
//       project_description and arrives on two different channels at most three
//       days apart. Dropping the description qualifier returns two pairs,
//       because one client raised two genuinely different jobs at the same
//       property inside the same window, and merging that pair loses a job.
//   P3. exactly one row's project_type is commercial while every other row is
//       residential. Two rows are decline-or-redirect candidates once
//       service_area is read alongside project_type, and only one of the two is
//       out of scope by type.
//
// The co-131 row carries none of the three. SMB-04's chain opens from it and
// SMB-01's clean pool descends from it, so the narrative spine must never also
// be a defect: that is the FIN-38 clean-pool rule applied one artifact upstream.
//
// R-ROLE: no cell carries a person's name. A human appears as contact_role, and
// a client appears as a household, because canon/people.md seats nobody at
// co-100 or at co-131 to co-135. The eleven non-canon prospects therefore leave
// client_canon_id empty (U1: the co-140 and upward generated band is already
// spent on CORE-03's co-002 CRM accounts) and are named "The <Surname>
// household" from the shared pool with the five canon-colliding surnames
// removed (U2, U9).
import { toCsv } from "../csv.js";
import { diffDays, isWeekend } from "../dates.js";
import { LAST_NAMES } from "../namePool.js";
import { companyName } from "../canon.js";
import {
  CLIENT_TYPES, CONTACT_ROLES, SERVICE_AREAS, SOURCE_CHANNELS, PROJECT_TYPES,
} from "./smb-02-client-record-template.js";

export const id = "SMB-03";

export const COLUMNS = [
  "inquiry_id", "received_date", "channel", "client_canon_id", "client_name", "client_type",
  "contact_role", "property_address", "service_area", "project_type",
  "project_description", "budget_band", "timeline_note", "referral_partner_canon_id",
  "referral_partner_name", "status",
];

export const PERIOD = { start: "2026-01-12", end: "2026-01-18" };
export const QUEUE_STATUS = "pending_review";
export const TARGET_ROWS = 14;
export const DISTINCT_CLIENTS = 12;
export const GENERATED_HOUSEHOLDS = 11;
export const BUDGET_BANDS = ["under_25k", "25k_to_75k", "75k_to_150k", "over_150k"];

export const OKAFOR_CANON_ID = "co-131";
export const REFERRAL_PARTNER_CANON_ID = "co-135";

/**
 * Surnames the queue may never draw. Each is, or was, a canon company name, and
 * `canon/people.md` follow-up F-7 records that the committed roster already
 * carries sixteen employees surnamed Larkspur. A household named Larkspur
 * inquiring at Larkspur Design & Build is the failure this list prevents.
 */
export const EXCLUDED_SURNAMES = ["Larkspur", "Ashgrove", "Millgate", "Whitlock", "Ravenscroft"];

// ------------------------------------------------------------------ vocabulary

/** Obviously fictional street names, screened against canon/companies.md. */
const STREET_NAMES = [
  "Thornhollow", "Quillhaven", "Brackenmoor", "Wrenhollow", "Alderfen",
  "Copperstile", "Dunmarrow", "Elmhollow", "Fernwhistle", "Gallowfen",
  "Harrowmere", "Inglemoor", "Kelverstone", "Lowmarsh", "Netherfield",
  "Orchardmere", "Pinewhistle", "Rushmoor",
];
const STREET_TYPES = ["Lane", "Street", "Road", "Way", "Court", "Terrace"];

/**
 * Residential inquiries the queue draws from. Each normalizes to its own string,
 * and each carries the budget bands that job could honestly sit in, so a drawn
 * band is plausible for the work described rather than plausible in isolation.
 */
const RESIDENTIAL_DESCRIPTIONS = [
  { text: "Whole house repaint and trim replacement", bands: ["25k_to_75k"] },
  { text: "Basement finishing with a guest suite", bands: ["75k_to_150k", "over_150k"] },
  { text: "Front porch rebuild and new entry door", bands: ["under_25k", "25k_to_75k"] },
  { text: "Open plan kitchen and dining wall removal", bands: ["75k_to_150k"] },
  { text: "Loft conversion into two bedrooms", bands: ["75k_to_150k", "over_150k"] },
  { text: "Mudroom build out with fitted storage", bands: ["under_25k", "25k_to_75k"] },
  { text: "Bathroom retile and new vanity run", bands: ["under_25k", "25k_to_75k"] },
  { text: "Sunroom addition off the back of the house", bands: ["25k_to_75k", "75k_to_150k"] },
  { text: "Built in library shelving for the study", bands: ["under_25k"] },
  { text: "Laundry room relocation to the first floor", bands: ["under_25k", "25k_to_75k"] },
  { text: "Attic insulation and dormer window install", bands: ["25k_to_75k"] },
  { text: "Deck replacement with a covered pergola", bands: ["under_25k", "25k_to_75k"] },
];

const TIMELINE_NOTES = [
  "Would like to start in the spring",
  "Aiming for a March start",
  "No fixed date yet, sometime this year",
  "Wants the work finished before the summer",
  "Ready to start as soon as the studio is",
  "Hoping for a start in late February",
  "Flexible on dates, wants a firm quote first",
  "Needs the job done inside eight weeks",
];

// --------------------------------------------------------------- the skeleton
// Received dates, which client each row belongs to, and which shape fact or
// plant each row carries. The counts here are the census section 2.2 pins; the
// names, addresses, descriptions, channels and bands are drawn from the seeded
// streams below.

const CLIENT_OKAFOR = "okafor";
const CLIENT_REPEAT_SAME_JOB = "repeat_same_job";
const CLIENT_REPEAT_TWO_JOBS = "repeat_two_jobs";

const SKELETON = [
  { date: "2026-01-12", client: CLIENT_OKAFOR, role: "spine" },
  { date: "2026-01-12", client: CLIENT_REPEAT_SAME_JOB, role: "duplicate_first" },
  { date: "2026-01-13", client: "solo_1", role: "budget_missing" },
  { date: "2026-01-13", client: CLIENT_REPEAT_TWO_JOBS, role: "second_job_first" },
  { date: "2026-01-14", client: CLIENT_REPEAT_SAME_JOB, role: "duplicate_second" },
  { date: "2026-01-14", client: "solo_2", role: "budget_and_timeline_missing" },
  { date: "2026-01-15", client: "solo_3", role: "out_of_area" },
  { date: "2026-01-15", client: CLIENT_REPEAT_TWO_JOBS, role: "second_job_second" },
  { date: "2026-01-16", client: "solo_4", role: "commercial" },
  { date: "2026-01-16", client: "solo_5", role: "timeline_missing" },
  { date: "2026-01-16", client: "solo_6", role: "budget_missing" },
  { date: "2026-01-16", client: "solo_7", role: "referral" },
  { date: "2026-01-17", client: "solo_8", role: "plain" },
  { date: "2026-01-18", client: "solo_9", role: "referral" },
];

/** The one commercial inquiry, out of the studio's band by size as well as type. */
const COMMERCIAL = { text: "Full fit out of a 4,000 sq ft retail unit we own", bands: ["over_150k"] };

/** The Okafor inquiry, which SMB-04's chain opens from and whose band holds its contract value. */
const OKAFOR = { text: "Kitchen and primary bath renovation", bands: ["75k_to_150k"] };

/** The repeated inquiry, sent once through one channel and once through another. */
const DUPLICATE_FIRST = { text: "Kitchen remodel with a new pantry and island", bands: ["75k_to_150k"] };
const DUPLICATE_SECOND = { text: "Fwd: kitchen remodel, with a new pantry and island.", bands: ["75k_to_150k"] };
/** The same client's second, genuinely different job at the same property. */
const SECOND_JOB_FIRST = { text: "Primary bathroom refresh with a walk in shower", bands: ["under_25k", "25k_to_75k"] };
const SECOND_JOB_SECOND = { text: "Detached garage conversion into a home office", bands: ["25k_to_75k", "75k_to_150k"] };

// ------------------------------------------------------------------ helpers

/**
 * The description as the duplicate rule sees it: lowercased, any run of leading
 * reply or forward markers removed, punctuation replaced by a space, whitespace
 * collapsed, ends trimmed. SMB-03 states this rule in its own spec entry rather
 * than importing OPS-04's helper, because the two files normalize different
 * columns and a shared helper would couple two tracks for one regex.
 */
export function normalizeDescription(text) {
  let value = String(text).toLowerCase().trim();
  for (;;) {
    const stripped = value.replace(/^(re|fwd|fw)\s*:\s*/, "");
    if (stripped === value) break;
    value = stripped;
  }
  return value.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/** Surnames the household pool may use: the shared pool less the five collisions. */
export function availableSurnames(canon) {
  const canonWords = new Set();
  for (const entry of canon.values()) {
    for (const word of entry.name.toLowerCase().split(/[^a-z0-9]+/)) {
      if (word !== "") canonWords.add(word);
    }
  }
  const available = LAST_NAMES.filter(
    (surname) => !EXCLUDED_SURNAMES.includes(surname) && !canonWords.has(surname.toLowerCase())
  );
  if (available.length < GENERATED_HOUSEHOLDS) {
    throw new Error(`${id}: only ${available.length} surnames survive the canon screen, need ${GENERATED_HOUSEHOLDS}`);
  }
  return available;
}

// ------------------------------------------------------------------- builder

/**
 * @param {(stream: string) => import("../seed.js").Rng} rng
 * @param {Map} canon canon companies lookup
 * @returns {object[]} the fourteen queue rows, in received order
 */
export function buildInquiryQueue(rng, canon) {
  const clientKeys = [...new Set(SKELETON.map((s) => s.client))].filter((key) => key !== CLIENT_OKAFOR);
  if (clientKeys.length !== GENERATED_HOUSEHOLDS) {
    throw new Error(`${id}: the skeleton holds ${clientKeys.length} non-canon clients, expected ${GENERATED_HOUSEHOLDS}`);
  }

  // Households. One seeded stream per logical group, so a change to the address
  // pool cannot move the surnames.
  const surnames = rng("surnames").shuffle(availableSurnames(canon)).slice(0, GENERATED_HOUSEHOLDS);
  const addressRng = rng("addresses");
  const clients = new Map();
  clients.set(CLIENT_OKAFOR, {
    canonId: OKAFOR_CANON_ID,
    name: companyName(canon, OKAFOR_CANON_ID),
    address: drawAddress(addressRng, new Set()),
  });
  const usedAddresses = new Set([clients.get(CLIENT_OKAFOR).address]);
  for (const [i, key] of clientKeys.entries()) {
    const address = drawAddress(addressRng, usedAddresses);
    usedAddresses.add(address);
    clients.set(key, { canonId: "", name: `The ${surnames[i]} household`, address });
  }

  // Contact roles ride on the client, not the row, so a household that inquires
  // twice does not change who the studio is talking to.
  const roleRng = rng("contact-roles");
  const commercialClientKey = SKELETON.find((s) => s.role === "commercial").client;
  for (const [key, client] of clients) {
    client.contactRole = key === commercialClientKey ? "property_manager" : roleRng.pick(["homeowner", "co_owner"]);
  }

  const channels = drawChannels(rng("channels"));
  const jobs = drawDescriptions(rng("descriptions"));
  const bandRng = rng("budget-bands");
  const noteRng = rng("timeline-notes");
  const referralName = companyName(canon, REFERRAL_PARTNER_CANON_ID);

  const rows = SKELETON.map((slot, index) => {
    const client = clients.get(slot.client);
    const isReferral = slot.role === "referral";
    const isCommercial = slot.role === "commercial";
    const budgetMissing = slot.role === "budget_missing" || slot.role === "budget_and_timeline_missing";
    const timelineMissing = slot.role === "timeline_missing" || slot.role === "budget_and_timeline_missing";
    const band = budgetMissing ? "" : bandRng.pick(jobs[index].bands);
    return {
      inquiry_id: `INQ-2026-${String(index + 1).padStart(3, "0")}`,
      received_date: slot.date,
      channel: channels[index],
      client_canon_id: client.canonId,
      client_name: client.name,
      client_type: "household",
      contact_role: client.contactRole,
      property_address: client.address,
      service_area: slot.role === "out_of_area" ? "out_of_area" : "in_area",
      project_type: isCommercial ? "commercial" : "residential",
      project_description: jobs[index].text,
      budget_band: band,
      timeline_note: timelineMissing ? "" : noteRng.pick(TIMELINE_NOTES),
      referral_partner_canon_id: isReferral ? REFERRAL_PARTNER_CANON_ID : "",
      referral_partner_name: isReferral ? referralName : "",
      status: QUEUE_STATUS,
    };
  });

  assertQueue(rows, canon);
  return rows;
}

function drawAddress(addressRng, used) {
  for (let attempt = 0; attempt < 500; attempt++) {
    const address = `${addressRng.int(2, 399)} ${addressRng.pick(STREET_NAMES)} ${addressRng.pick(STREET_TYPES)}`;
    if (!used.has(address)) return address;
  }
  throw new Error(`${id}: the address pool cannot produce another distinct address`);
}

/**
 * A row's channel is `referral` exactly where it carries a referral partner, so
 * the two facts cannot drift apart. The other twelve rows split across the three
 * open channels with at least two rows each, and the two repeat clients each
 * arrive on two different channels, which is what makes P2's qualifier-free
 * count two pairs rather than one.
 */
function drawChannels(channelRng) {
  const referralIndexes = SKELETON.map((s, i) => (s.role === "referral" ? i : -1)).filter((i) => i >= 0);
  const openIndexes = SKELETON.map((s, i) => (s.role === "referral" ? -1 : i)).filter((i) => i >= 0);
  const openChannels = SOURCE_CHANNELS.filter((c) => c !== "referral");
  const pool = [...openChannels, ...openChannels];
  while (pool.length < openIndexes.length) pool.push(channelRng.pick(openChannels));

  const pairs = [
    SKELETON.map((s, i) => (s.role === "duplicate_first" || s.role === "duplicate_second" ? i : -1)).filter((i) => i >= 0),
    SKELETON.map((s, i) => (s.role === "second_job_first" || s.role === "second_job_second" ? i : -1)).filter((i) => i >= 0),
  ];

  for (let attempt = 0; attempt < 500; attempt++) {
    const shuffled = channelRng.shuffle(pool);
    const assignment = new Array(SKELETON.length).fill("referral");
    openIndexes.forEach((rowIndex, i) => { assignment[rowIndex] = shuffled[i]; });
    if (pairs.every(([a, b]) => assignment[a] !== assignment[b])) {
      for (const index of referralIndexes) assignment[index] = "referral";
      return assignment;
    }
  }
  throw new Error(`${id}: no channel assignment puts the two repeat clients on two channels each`);
}

function drawDescriptions(descriptionRng) {
  const pool = descriptionRng.shuffle(RESIDENTIAL_DESCRIPTIONS);
  let next = 0;
  return SKELETON.map((slot) => {
    switch (slot.role) {
      case "spine": return OKAFOR;
      case "duplicate_first": return DUPLICATE_FIRST;
      case "duplicate_second": return DUPLICATE_SECOND;
      case "second_job_first": return SECOND_JOB_FIRST;
      case "second_job_second": return SECOND_JOB_SECOND;
      case "commercial": return COMMERCIAL;
      default: {
        const job = pool[next];
        next += 1;
        if (job === undefined) throw new Error(`${id}: the description pool ran out`);
        return job;
      }
    }
  });
}

// ---------------------------------------------------------------- assertions
// Every census row of section 2.2, every plant cardinality and its
// qualifier-free number, asserted before the builder returns. The public test
// re-derives each one from the emitted bytes with its own implementation of the
// normalization, so the two can disagree.

function assertQueue(rows, canon) {
  if (rows.length !== TARGET_ROWS) {
    throw new Error(`${id}: the queue is ${rows.length} deep, expected ${TARGET_ROWS}`);
  }

  for (const [i, row] of rows.entries()) {
    const where = `${id}: ${row.inquiry_id}`;
    if (row.inquiry_id !== `INQ-2026-${String(i + 1).padStart(3, "0")}`) {
      throw new Error(`${where} is out of id order`);
    }
    if (i > 0 && row.received_date < rows[i - 1].received_date) {
      throw new Error(`${where} breaks received order, which is also file order`);
    }
    if (row.received_date < PERIOD.start || row.received_date > PERIOD.end) {
      throw new Error(`${where} was received outside the declared week`);
    }
    if (row.status !== QUEUE_STATUS) throw new Error(`${where} has already been triaged`);
    if (!SOURCE_CHANNELS.includes(row.channel)) throw new Error(`${where} arrived on "${row.channel}"`);
    if (!CLIENT_TYPES.includes(row.client_type)) throw new Error(`${where} is a "${row.client_type}"`);
    if (!CONTACT_ROLES.includes(row.contact_role)) throw new Error(`${where} names role "${row.contact_role}"`);
    if (!SERVICE_AREAS.includes(row.service_area)) throw new Error(`${where} claims area "${row.service_area}"`);
    if (!PROJECT_TYPES.includes(row.project_type)) throw new Error(`${where} is a "${row.project_type}" job`);
    if (row.budget_band !== "" && !BUDGET_BANDS.includes(row.budget_band)) {
      throw new Error(`${where} states band "${row.budget_band}"`);
    }
    if (row.client_name === "" || row.property_address === "" || row.project_description === "") {
      throw new Error(`${where} leaves a required cell empty`);
    }
    if ((row.channel === "referral") !== (row.referral_partner_canon_id !== "")) {
      throw new Error(`${where} disagrees with itself about whether a referral partner sent it`);
    }
    for (const [idCell, nameCell] of [
      [row.client_canon_id, row.client_name],
      [row.referral_partner_canon_id, row.referral_partner_name],
    ]) {
      if (idCell === "") continue;
      const entry = canon.get(idCell);
      if (!entry) throw new Error(`${where} cites ${idCell}, which canon/companies.md does not seat`);
      if (entry.name !== nameCell) {
        throw new Error(`${where} calls ${idCell} "${nameCell}", and canon calls it "${entry.name}"`);
      }
    }
    if (row.referral_partner_canon_id === "" && row.referral_partner_name !== "") {
      throw new Error(`${where} names a referral partner it does not identify`);
    }
    for (const cell of Object.values(row)) {
      if (EXCLUDED_SURNAMES.some((surname) => String(cell).includes(surname))) {
        throw new Error(`${where} carries an excluded canon-colliding surname`);
      }
    }
  }

  // The census of section 2.2.
  const census = (predicate) => rows.filter(predicate).length;
  const expect = (label, actual, wanted) => {
    if (actual !== wanted) throw new Error(`${id}: ${label} is ${actual}, expected ${wanted}`);
  };
  expect("the residential count", census((r) => r.project_type === "residential"), 13);
  expect("the commercial count", census((r) => r.project_type === "commercial"), 1);
  expect("the distinct client count", new Set(rows.map((r) => r.client_name)).size, DISTINCT_CLIENTS);
  expect("the count of rows carrying a canon client id", census((r) => r.client_canon_id !== ""), 1);
  expect("the count of referral rows", census((r) => r.referral_partner_canon_id !== ""), 2);
  expect("the weekend count", census((r) => isWeekend(r.received_date)), 2);
  expect("the out-of-area count", census((r) => r.service_area === "out_of_area"), 1);
  const canonRow = rows.find((r) => r.client_canon_id !== "");
  if (canonRow.client_canon_id !== OKAFOR_CANON_ID || canonRow.received_date !== PERIOD.start) {
    throw new Error(`${id}: the canon client row is not ${OKAFOR_CANON_ID} received ${PERIOD.start}`);
  }
  for (const row of rows.filter((r) => r.referral_partner_canon_id !== "")) {
    if (row.referral_partner_canon_id !== REFERRAL_PARTNER_CANON_ID) {
      throw new Error(`${id}: a referral row cites ${row.referral_partner_canon_id}, not ${REFERRAL_PARTNER_CANON_ID}`);
    }
  }
  for (const channel of SOURCE_CHANNELS) {
    const count = census((r) => r.channel === channel);
    if (count < 2) throw new Error(`${id}: only ${count} rows arrived on "${channel}", expected at least 2`);
  }
  const outOfArea = rows.find((r) => r.service_area === "out_of_area");
  if (outOfArea.project_type !== "residential") {
    throw new Error(`${id}: the out-of-area row is commercial, so scope has only one axis`);
  }

  // P1: the inquiry that cannot be quoted.
  const bothEmpty = rows.filter((r) => r.budget_band === "" && r.timeline_note === "");
  expect("the count of rows missing both budget and timeline", bothEmpty.length, 1);
  const eitherEmpty = rows.filter((r) => r.budget_band === "" || r.timeline_note === "");
  expect("the count of rows missing either budget or timeline", eitherEmpty.length, 4);

  // P2: the cross-channel duplicate, and its qualifier-free companion.
  const byClient = new Map();
  for (const row of rows) byClient.set(row.client_name, [...(byClient.get(row.client_name) ?? []), row]);
  const repeatGroups = [...byClient.values()].filter((group) => group.length > 1);
  expect("the count of clients appearing more than once", repeatGroups.length, 2);
  const crossChannelPairs = [];
  const duplicatePairs = [];
  for (const group of repeatGroups) {
    if (group.length !== 2) throw new Error(`${id}: a client appears ${group.length} times, expected 2`);
    const [first, second] = [...group].sort((a, b) => (a.received_date < b.received_date ? -1 : 1));
    if (first.channel === second.channel) {
      throw new Error(`${id}: a repeat client arrived on the same channel both times`);
    }
    const apart = diffDays(first.received_date, second.received_date);
    if (apart < 1 || apart > 3) {
      throw new Error(`${id}: a repeat client's two inquiries are ${apart} days apart, expected 1 to 3`);
    }
    if (first.property_address !== second.property_address) {
      throw new Error(`${id}: a repeat client inquired about two different properties`);
    }
    crossChannelPairs.push([first, second]);
    if (normalizeDescription(first.project_description) === normalizeDescription(second.project_description)) {
      duplicatePairs.push([first, second]);
    }
  }
  expect("the duplicate-pair count under the stated rule", duplicatePairs.length, 1);
  expect("the pair count with the description qualifier dropped", crossChannelPairs.length, 2);
  if (duplicatePairs[0][0].project_description === duplicatePairs[0][1].project_description) {
    throw new Error(`${id}: the duplicate pair is byte identical, so the normalization does no work`);
  }
  const normalized = rows.map((r) => normalizeDescription(r.project_description));
  if (new Set(normalized).size !== rows.length - 1) {
    throw new Error(`${id}: ${rows.length - new Set(normalized).size} descriptions collide, expected exactly one collision`);
  }

  // P3: the out-of-scope commercial inquiry, and its qualifier-free companion.
  const commercial = rows.filter((r) => r.project_type === "commercial");
  expect("the commercial-row count", commercial.length, 1);
  const declineCandidates = rows.filter((r) => r.project_type === "commercial" || r.service_area === "out_of_area");
  expect("the decline-or-redirect candidate count", declineCandidates.length, 2);

  // T-B5: the three plants land on three distinct rows and the pair is disjoint
  // from both, so four rows in all carry a plant.
  const plantRows = new Set([bothEmpty[0], ...duplicatePairs[0], commercial[0]]);
  if (plantRows.size !== 4) {
    throw new Error(`${id}: the three plants overlap, covering ${plantRows.size} rows instead of 4`);
  }

  // The spine carries none of them.
  if (plantRows.has(canonRow)) {
    throw new Error(`${id}: the ${OKAFOR_CANON_ID} row carries a plant, which leaks one artifact's answer into another`);
  }
  if (canonRow.budget_band === "" || canonRow.timeline_note === "") {
    throw new Error(`${id}: the ${OKAFOR_CANON_ID} row is not a complete, ordinary inquiry`);
  }
}

export function generate({ spec, canon, rng }) {
  const rows = buildInquiryQueue(rng, canon);
  if (spec?.columns && spec.columns.join(",") !== COLUMNS.join(",")) {
    throw new Error(`${id}: the spec's columns disagree with the builder's header`);
  }
  return [{ path: "inbound-inquiry-queue.csv", content: toCsv(COLUMNS, rows) }];
}

// HR-20 benefits-census: who is enrolled in what for the 2026 plan year, one
// row per active employee and one row per covered dependent, with the plan
// library's own identifiers and the plan library's own words.
//
// Three shapes are the exercise rather than the decoration:
//
//   1. The population is not a choice. Every active roster row is benefits
//      eligible, because the smallest scheduled fraction in the hris export is
//      above the handbook's hours line on a 40 hour week, so the census is the
//      582 active rows taken in process from the shared hr-lifecycle builder,
//      and the grammar states that basis in its own words.
//   2. The plan ids are resolved, never minted. The generator reads the frozen
//      benefits plan library's register at build time, the HR-11 and HR-18
//      pattern, and throws if a plan id it references is missing or not Active,
//      so a later edit to the library breaks generation loudly rather than
//      shipping a census that points at a superseded document. The option names
//      and the documentation types are the library's own terms in snake case,
//      read off the same files and checked.
//   3. Nothing is flagged. The summary plan description deadline is a rule over
//      hire_date and a published number of days, and the one deadline inside
//      the published alert window is found by computing it. The one dependent
//      whose document is unverified carries a status every dependent carries.
//      No row carries a risk, alert, overdue or priority column.
//
// No money, no premium, no contribution, no deferral rate, no pay, no health
// field and no health value appears anywhere. No regulation is named. The
// carrier of the window is the one roster row the window selects, a roster fact
// rather than a draw, and the carrier of the unverified dependent is drawn from
// a guarded pool; neither is named in this file.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { toCsv } from "../csv.js";
import { addDays, isWeekend } from "../dates.js";
import { createRng } from "../seed.js";
import { c7Salience } from "./hr-c7-salience.js";

export const id = "HR-20";

const E = "HR-20";

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..");

export const AS_OF = "2026-04-03";
export const PLAN_YEAR_START = "2026-01-01";
export const PLAN_YEAR_END = "2026-12-31";
export const GRAMMAR_ID = "CENSUS-GRAMMAR-2026-04-03";

/** The frozen library this census resolves into, relative to the repository root. */
export const SOURCE_LIBRARY = "artifacts/HR-19/benefits-plan-library.md";
const LIBRARY_DIR = join(REPO_ROOT, "artifacts", "HR-19");
const INDEX_FILE = "benefits-plan-library.md";
const MEDICAL_FILE = "benefits-plan-library-medical-plan-spd.md";
const CALENDAR_FILE = "benefits-plan-library-enrollment-calendar-and-life-events.md";

/** The register heading and its eight columns, the internal policy library's register verbatim. */
export const REGISTER_HEADING = "## 7. Benefits Plan Register";
export const REGISTER_COLUMNS = [
  "Document ID", "Title", "Version", "Status", "Owner", "Effective Date", "Last Reviewed", "Next Review Due",
];
export const EXPECTED_REGISTER_IDS = [
  "ADI-BNF-001", "ADI-BNF-002", "ADI-BNF-003", "ADI-BNF-004",
  "ADI-BNF-005", "ADI-BNF-006", "ADI-BNF-007", "ADI-BNF-008",
];
export const SUPERSEDED_PLAN_ID = "ADI-BNF-001";

export const MEDICAL_PLAN_ID = "ADI-BNF-002";
export const DENTAL_VISION_PLAN_ID = "ADI-BNF-003";
export const ACTIVE_PLAN_IDS = ["ADI-BNF-002", "ADI-BNF-003", "ADI-BNF-004", "ADI-BNF-008"];
export const UNIVERSAL_PLAN_IDS = ["ADI-BNF-004", "ADI-BNF-008"];

export const SPD_DEADLINE_DAYS = 90;
export const SPD_DEADLINE_RULE =
  "the summary plan descriptions are furnished within spd_deadline_days calendar days of hire_date; the deadline "
  + "is hire_date plus spd_deadline_days, a company standard that is never later than a deadline counted from "
  + "coverage_start_date";

export const ALERT_WINDOW_START = AS_OF;
export const ALERT_WINDOW_DAYS = 7;
export const ALERT_WINDOW_END = "2026-04-10";

export const PRIOR_OPEN_ENROLLMENT_START = "2025-11-03";
export const PRIOR_OPEN_ENROLLMENT_END = "2025-11-14";
export const NEW_HIRE_ELECTION_DAYS = 30;

/** The window a qualifying life event election may sit in. */
export const QLE_WINDOW_START = "2026-01-05";
export const QLE_WINDOW_END = "2026-03-27";

export const COVERAGE_TIERS = ["employee_only", "employee_spouse", "employee_children", "family", "waived"];
export const MEDICAL_OPTIONS = ["choice_ppo", "saver_hsa", "waived"];
export const ELECTIONS = ["enrolled", "waived"];
export const ELECTION_EVENTS = ["open_enrollment", "new_hire", "qualifying_life_event"];
export const RELATIONSHIPS = ["spouse", "child"];
export const DOCUMENTATION_TYPES = ["marriage_certificate", "birth_certificate", "adoption_or_placement_record"];
export const DOCUMENTATION_STATUSES = ["verified", "unverified"];

/** The library phrases each snake-case vocabulary entry is read from. */
export const MEDICAL_OPTION_PHRASES = { choice_ppo: "Choice PPO option", saver_hsa: "Saver HSA option" };
export const DOCUMENTATION_TYPE_PHRASES = {
  marriage_certificate: "marriage certificate",
  birth_certificate: "birth certificate",
  adoption_or_placement_record: "adoption or placement record",
};
export const SPD_SENTENCE_FRAGMENT = "calendar days of your date of hire";

export const ELIGIBILITY_STATEMENT =
  "every active employee is benefits eligible: the smallest scheduled fraction in the hris export is 0.6, which "
  + "is 24 hours on a 40 hour full-time week and above the 20 hour line the employee handbook sets";

export const NO_HEALTH_NO_PAY_STATEMENT =
  "this census carries no money, no premium, no contribution, no deferral rate and no pay, which the compensation "
  + "band dataset holds; no health field and no health value, because a benefits administration alert needs no "
  + "health information and must not acquire any; and no dependent name, date of birth or age. The employee share "
  + "of each premium is shown in the hris when an employee enrolls";

/** Design counts, constructed (data plan 2.3.3). */
export const TIER_TARGETS = {
  waived: 30, employee_only: 240, employee_spouse: 118, employee_children: 72, family: 122,
};
export const MEDICAL_TARGETS = { waived: 42, choice_ppo: 324, saver_hsa: 216 };
export const EMPLOYEE_ONLY_MEDICAL_WAIVERS = 12;
export const DENTAL_ENROLLED = 530;
export const VISION_ENROLLED = 488;
export const QLE_EMPLOYEES = 6;
export const QLE_DEPENDENTS = 8;
export const QLE_MARRIAGE_CERTIFICATES = 5;
export const ADOPTION_SHARE = 1 / 12;

/**
 * Children per child-bearing employee outside the qualifying life events, dealt
 * as a deck so the dependent total is a constructed figure rather than a draw:
 * 76 employees with one child, 77 with two and 38 with three.
 */
export const CHILDREN_DECK = { 1: 76, 2: 77, 3: 38 };
export const DEPENDENT_COUNT = 587;

/**
 * The six qualifying life events: three marriages adding a spouse, and three
 * losses of other coverage adding a spouse and a child, a child alone, and a
 * spouse and a child. The event type is carried here and never in a row.
 */
export const QLE_EVENTS = [
  { kind: "marriage", tier: "employee_spouse", children: 0 },
  { kind: "marriage", tier: "employee_spouse", children: 0 },
  { kind: "marriage", tier: "employee_spouse", children: 0 },
  { kind: "loss_of_other_coverage", tier: "family", children: 1 },
  { kind: "loss_of_other_coverage", tier: "employee_children", children: 1 },
  { kind: "loss_of_other_coverage", tier: "family", children: 1 },
];

/** Roster-derived pins, recomputed at build time (data plan 0.4 and 0.16). */
export const EXPECTED = {
  activeRows: 582,
  newHires: 23,
  windowCensus: 1,
  window14Census: 3,
  window30Census: 7,
  afterAsOfCensus: 11,
  priorThirtyCensus: 4,
  overdueCensus: 0,
  coverageStartWindowCensus: 0,
  firstOfMonthHires: 17,
};

export const COLUMNS = {
  grammar: [
    "grammar_id", "as_of", "plan_year_start", "plan_year_end", "source_library",
    "active_plan_ids", "universal_plan_ids", "spd_deadline_rule", "spd_deadline_days",
    "alert_window_start", "alert_window_end", "alert_window_days",
    "prior_open_enrollment_start", "prior_open_enrollment_end", "new_hire_election_days",
    "coverage_tier_vocabulary", "medical_option_vocabulary", "election_vocabulary",
    "election_event_vocabulary", "relationship_vocabulary",
    "documentation_type_vocabulary", "documentation_status_vocabulary",
    "eligibility_statement", "employee_count", "dependent_count",
    "no_health_no_pay_statement",
  ],
  employees: [
    "employee_id", "hire_date", "coverage_start_date", "spd_furnished_date",
    "election_event", "election_date", "coverage_tier", "medical_plan_id",
    "medical_option", "dental_vision_plan_id", "dental_election", "vision_election",
  ],
  dependents: [
    "dependent_id", "employee_id", "relationship", "documentation_type",
    "documentation_status", "verified_date",
  ],
};

const EN_DASH = String.fromCharCode(0x2013);
const EM_DASH = String.fromCharCode(0x2014);

// ------------------------------------------------------------------ helpers

/** Every Monday-to-Friday date in an inclusive ISO range, oldest first. */
function businessDaysBetween(startIso, endIso) {
  const out = [];
  for (let d = startIso; d <= endIso; d = addDays(d, 1)) {
    if (!isWeekend(d)) out.push(d);
  }
  return out;
}

/** The first day of the month after the month `iso` falls in. */
export function firstOfNextMonth(iso) {
  const [y, m] = iso.split("-").map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}

const inRange = (iso, lo, hi) => iso >= lo && iso <= hi;

function readLibraryFile(name) {
  try {
    return readFileSync(join(LIBRARY_DIR, name), "utf8");
  } catch (cause) {
    throw new Error(`${E}: could not read the frozen benefits plan library file artifacts/HR-19/${name}: ${cause.message}`);
  }
}

/** The text between a heading line starting `startPrefix` and the next `## ` heading. */
function sectionText(text, startPrefix, fileName) {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.startsWith(startPrefix));
  if (start < 0) throw new Error(`${E}: artifacts/HR-19/${fileName} carries no heading "${startPrefix}"`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("## "));
  return (end < 0 ? rest : rest.slice(0, end)).join("\n");
}

const splitRow = (line) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

// ------------------------------------------------------- the frozen reads

/**
 * The register under "## 7. Benefits Plan Register", parsed as the eight
 * internal policy library register columns in order. A reformatted table
 * throws naming the column that moved, so a later edit to the library breaks
 * generation instead of shifting a plan id.
 * @returns {Map<string, object>} register rows by Document ID
 */
export function readBenefitsRegister() {
  const text = readLibraryFile(INDEX_FILE);
  const body = sectionText(text, REGISTER_HEADING, INDEX_FILE);
  const tableLines = body.split("\n").filter((line) => line.trim().startsWith("|"));
  if (tableLines.length < 3) {
    throw new Error(`${E}: ${SOURCE_LIBRARY} carries no register table under "${REGISTER_HEADING}"`);
  }
  const header = splitRow(tableLines[0]);
  REGISTER_COLUMNS.forEach((column, index) => {
    if (header[index] !== column) {
      throw new Error(
        `${E}: ${SOURCE_LIBRARY} register column ${index + 1} reads "${header[index] ?? "nothing"}", expected "${column}"`
      );
    }
  });
  if (header.length !== REGISTER_COLUMNS.length) {
    throw new Error(`${E}: ${SOURCE_LIBRARY} register carries ${header.length} columns, expected ${REGISTER_COLUMNS.length}`);
  }
  const rows = tableLines.slice(2).map((line) => {
    const cells = splitRow(line);
    if (cells.length !== REGISTER_COLUMNS.length) {
      throw new Error(`${E}: ${SOURCE_LIBRARY} register row "${cells[0]}" carries ${cells.length} cells, expected ${REGISTER_COLUMNS.length}`);
    }
    return Object.fromEntries(REGISTER_COLUMNS.map((column, index) => [column, cells[index]]));
  });
  const ids = rows.map((row) => row["Document ID"]);
  if (ids.length !== EXPECTED_REGISTER_IDS.length || ids.some((docId, index) => docId !== EXPECTED_REGISTER_IDS[index])) {
    throw new Error(`${E}: ${SOURCE_LIBRARY} register lists ${ids.join(", ")}, expected ${EXPECTED_REGISTER_IDS.join(", ")}`);
  }
  return new Map(rows.map((row) => [row["Document ID"], row]));
}

/** The library's own vocabulary, checked against the snake-case forms this census publishes. */
export function readLibraryVocabulary() {
  const medical = readLibraryFile(MEDICAL_FILE);
  for (const [option, phrase] of Object.entries(MEDICAL_OPTION_PHRASES)) {
    if (!medical.includes(phrase)) {
      throw new Error(`${E}: artifacts/HR-19/${MEDICAL_FILE} no longer names the "${phrase}" that ${option} stands for`);
    }
    const snake = phrase.replace(/ option$/, "").toLowerCase().replace(/ /g, "_");
    if (snake !== option) throw new Error(`${E}: "${phrase}" does not snake-case to ${option}`);
  }
  const calendar = readLibraryFile(CALENDAR_FILE);
  const documentation = sectionText(calendar, "## 6.", CALENDAR_FILE);
  for (const [type, phrase] of Object.entries(DOCUMENTATION_TYPE_PHRASES)) {
    if (!documentation.includes(phrase)) {
      throw new Error(`${E}: artifacts/HR-19/${CALENDAR_FILE} section 6 no longer lists the "${phrase}" that ${type} stands for`);
    }
    if (phrase.replace(/ /g, "_") !== type) throw new Error(`${E}: "${phrase}" does not snake-case to ${type}`);
  }
  const spdSection = sectionText(calendar, "## 7.", CALENDAR_FILE);
  const match = spdSection.match(new RegExp(`within (\\d+) ${SPD_SENTENCE_FRAGMENT}`));
  if (!match) {
    throw new Error(`${E}: artifacts/HR-19/${CALENDAR_FILE} section 7 no longer states the summary plan description rule`);
  }
  if (Number(match[1]) !== SPD_DEADLINE_DAYS) {
    throw new Error(`${E}: the library states ${match[1]} days for the summary plan descriptions, this census publishes ${SPD_DEADLINE_DAYS}`);
  }
}

/**
 * Every text file under datasets/ and artifacts/ outside this census's own
 * directory, for the id block sweep.
 */
function packTextOutside(excludedRelativeDir) {
  const out = [];
  for (const top of ["datasets", "artifacts"]) {
    const root = join(REPO_ROOT, top);
    for (const name of readdirSync(root, { recursive: true }).map(String)) {
      if (!/\.(csv|json|md)$/.test(name)) continue;
      const relative = `${top}/${name}`;
      if (excludedRelativeDir && relative.startsWith(excludedRelativeDir)) continue;
      const path = join(root, name);
      if (!statSync(path).isFile()) continue;
      out.push({ relative, text: readFileSync(path, "utf8") });
    }
  }
  return out;
}

/** Throw if an id prefix this artifact mints appears anywhere else in the pack. */
export function assertPrefixUnusedElsewhere(prefix, ownRelativeDir, artifactId) {
  const pattern = new RegExp(`(^|[^A-Za-z])${prefix}[0-9]`, "m");
  for (const file of packTextOutside(ownRelativeDir)) {
    if (pattern.test(file.text)) {
      throw new Error(`${artifactId}: ${file.relative} carries a ${prefix} token, and that block is this artifact's own`);
    }
  }
}

// ----------------------------------------------------------------- the build

/**
 * The whole census, rows and grammar, with every published count asserted.
 * Exported so HR-14 can keep the two census findings' employees out of its
 * requester pool in process.
 */
export function buildBenefitsCensus() {
  const register = readBenefitsRegister();
  for (const planId of new Set([...ACTIVE_PLAN_IDS, ...UNIVERSAL_PLAN_IDS, MEDICAL_PLAN_ID, DENTAL_VISION_PLAN_ID])) {
    const row = register.get(planId);
    if (!row) throw new Error(`${E}: ${SOURCE_LIBRARY} register carries no row for ${planId}`);
    if (row.Status !== "Active") {
      throw new Error(`${E}: ${planId} is ${row.Status} in the ${SOURCE_LIBRARY} register, and this census references only Active documents`);
    }
  }
  if (register.get(SUPERSEDED_PLAN_ID).Status !== "Superseded") {
    throw new Error(`${E}: ${SUPERSEDED_PLAN_ID} is no longer Superseded in the register`);
  }
  readLibraryVocabulary();

  const salience = c7Salience();
  const active = salience.active;
  if (active.length !== EXPECTED.activeRows) {
    throw new Error(`${E}: ${active.length} active rows, expected ${EXPECTED.activeRows}`);
  }

  // ---- roster censuses, before any draw
  const deadline = (person) => addDays(person.start_date, SPD_DEADLINE_DAYS);
  const countWhere = (predicate) => active.filter(predicate).length;
  const rosterCensuses = {
    newHires: countWhere((p) => p.start_date >= PRIOR_OPEN_ENROLLMENT_START),
    windowCensus: countWhere((p) => inRange(deadline(p), ALERT_WINDOW_START, ALERT_WINDOW_END)),
    window14Census: countWhere((p) => inRange(deadline(p), ALERT_WINDOW_START, addDays(ALERT_WINDOW_START, 14))),
    window30Census: countWhere((p) => inRange(deadline(p), ALERT_WINDOW_START, addDays(ALERT_WINDOW_START, 30))),
    afterAsOfCensus: countWhere((p) => deadline(p) > AS_OF),
    priorThirtyCensus: countWhere((p) => deadline(p) < AS_OF && deadline(p) >= addDays(AS_OF, -30)),
    coverageStartWindowCensus: countWhere((p) =>
      inRange(addDays(firstOfNextMonth(p.start_date), SPD_DEADLINE_DAYS), ALERT_WINDOW_START, ALERT_WINDOW_END)),
    firstOfMonthHires: countWhere((p) => p.start_date.endsWith("-01")),
  };
  for (const [name, value] of Object.entries(rosterCensuses)) {
    if (value !== EXPECTED[name]) {
      throw new Error(`${E}: the roster census ${name} is ${value}, expected ${EXPECTED[name]}`);
    }
  }
  if (addDays(ALERT_WINDOW_START, ALERT_WINDOW_DAYS) !== ALERT_WINDOW_END) {
    throw new Error(`${E}: the alert window's end is not its start plus ${ALERT_WINDOW_DAYS} days`);
  }

  // ---- the six qualifying life event employees, their dates, then their events
  const qleRng = createRng(id, "qle");
  const qlePeople = qleRng.shuffle(salience.qlePool).slice(0, QLE_EMPLOYEES)
    .sort((a, b) => a.employee_id.localeCompare(b.employee_id));
  const qleDays = createRng(id, "qle-dates").shuffle(businessDaysBetween(QLE_WINDOW_START, QLE_WINDOW_END))
    .slice(0, QLE_EMPLOYEES);
  const qleEvents = createRng(id, "qle-events").shuffle(QLE_EVENTS);
  const qleById = new Map(qlePeople.map((person, index) => [
    person.employee_id, { election_date: qleDays[index], event: qleEvents[index] },
  ]));

  // ---- the unverified carrier: a marriage spouse whose employee's date is in the middle ranks
  const sortedDates = qleDays.slice().sort();
  const earliest = sortedDates[0];
  const latest = sortedDates.at(-1);
  const middleMarriages = qlePeople.filter((person) => {
    const entry = qleById.get(person.employee_id);
    return entry.event.kind === "marriage" && entry.election_date !== earliest && entry.election_date !== latest;
  });
  if (middleMarriages.length === 0) {
    throw new Error(`${E}: no marriage election sits strictly between the earliest and the latest qualifying life event date`);
  }
  const unverifiedEmployeeId = createRng(id, "documentation").pick(middleMarriages).employee_id;

  // ---- tiers: the qualifying life event tiers are fixed by the event, the rest are dealt
  const remainingTiers = { ...TIER_TARGETS };
  for (const { event } of qleById.values()) remainingTiers[event.tier] -= 1;
  const tierDeck = [];
  for (const tier of COVERAGE_TIERS) {
    if (remainingTiers[tier] < 0) throw new Error(`${E}: the ${tier} target cannot hold the qualifying life event tiers`);
    for (let i = 0; i < remainingTiers[tier]; i += 1) tierDeck.push(tier);
  }
  const others = active.filter((person) => !qleById.has(person.employee_id));
  if (tierDeck.length !== others.length) {
    throw new Error(`${E}: the tier deck holds ${tierDeck.length} cards for ${others.length} employees`);
  }
  const dealtTiers = createRng(id, "coverage-tier").shuffle(tierDeck);
  const tierById = new Map(others.map((person, index) => [person.employee_id, dealtTiers[index]]));
  for (const [employeeId, { event }] of qleById) tierById.set(employeeId, event.tier);

  // ---- medical: the employee_only medical waivers, then the two options dealt over the rest
  const employeeOnly = active.filter((p) => tierById.get(p.employee_id) === "employee_only");
  const medicalWaivers = new Set(
    createRng(id, "medical-waivers").shuffle(employeeOnly).slice(0, EMPLOYEE_ONLY_MEDICAL_WAIVERS).map((p) => p.employee_id)
  );
  const medicalEnrolled = active.filter((p) => tierById.get(p.employee_id) !== "waived" && !medicalWaivers.has(p.employee_id));
  if (medicalEnrolled.length !== MEDICAL_TARGETS.choice_ppo + MEDICAL_TARGETS.saver_hsa) {
    throw new Error(`${E}: ${medicalEnrolled.length} employees enroll in medical, expected ${MEDICAL_TARGETS.choice_ppo + MEDICAL_TARGETS.saver_hsa}`);
  }
  const optionDeck = [
    ...Array(MEDICAL_TARGETS.choice_ppo).fill("choice_ppo"),
    ...Array(MEDICAL_TARGETS.saver_hsa).fill("saver_hsa"),
  ];
  const dealtOptions = createRng(id, "medical-option").shuffle(optionDeck);
  const optionById = new Map(medicalEnrolled.map((p, index) => [p.employee_id, dealtOptions[index]]));

  // ---- dental and vision: dental waivers come from the medical enrollees only,
  // so every employee who waives medical without waiving the tier keeps dental
  const coveredTier = active.filter((p) => tierById.get(p.employee_id) !== "waived");
  const dentalWaivers = new Set(
    createRng(id, "dental").shuffle(medicalEnrolled).slice(0, coveredTier.length - DENTAL_ENROLLED).map((p) => p.employee_id)
  );
  const visionWaivers = new Set(
    createRng(id, "vision").shuffle(coveredTier).slice(0, coveredTier.length - VISION_ENROLLED).map((p) => p.employee_id)
  );

  // ---- elections and dates, per employee in employee_id order
  const oeDays = businessDaysBetween(PRIOR_OPEN_ENROLLMENT_START, PRIOR_OPEN_ENROLLMENT_END);
  const electionRng = createRng(id, "election-date");
  const furnishedRng = createRng(id, "spd-furnished");
  const employees = active.map((person) => {
    const tier = tierById.get(person.employee_id);
    const qle = qleById.get(person.employee_id);
    let electionEvent;
    let electionDate;
    if (qle) {
      electionEvent = "qualifying_life_event";
      electionDate = qle.election_date;
    } else if (person.start_date >= PRIOR_OPEN_ENROLLMENT_START) {
      electionEvent = "new_hire";
      const window = businessDaysBetween(person.start_date, addDays(person.start_date, NEW_HIRE_ELECTION_DAYS));
      electionDate = electionRng.pick(window);
    } else {
      electionEvent = "open_enrollment";
      electionDate = electionRng.pick(oeDays);
    }
    const due = deadline(person);
    const spdFurnished = due <= AS_OF ? furnishedRng.pick(businessDaysBetween(person.start_date, due)) : "";
    const medicalOption = tier === "waived" || medicalWaivers.has(person.employee_id)
      ? "waived"
      : optionById.get(person.employee_id);
    const dental = tier === "waived" || dentalWaivers.has(person.employee_id) ? "waived" : "enrolled";
    const vision = tier === "waived" || visionWaivers.has(person.employee_id) ? "waived" : "enrolled";
    return {
      employee_id: person.employee_id,
      hire_date: person.start_date,
      coverage_start_date: firstOfNextMonth(person.start_date),
      spd_furnished_date: spdFurnished,
      election_event: electionEvent,
      election_date: electionDate,
      coverage_tier: tier,
      medical_plan_id: medicalOption === "waived" ? "" : MEDICAL_PLAN_ID,
      medical_option: medicalOption,
      dental_vision_plan_id: dental === "enrolled" || vision === "enrolled" ? DENTAL_VISION_PLAN_ID : "",
      dental_election: dental,
      vision_election: vision,
    };
  });

  // ---- dependents
  const childBearing = employees.filter((row) =>
    !qleById.has(row.employee_id) && (row.coverage_tier === "employee_children" || row.coverage_tier === "family"));
  const childrenDeck = [];
  for (const [n, copies] of Object.entries(CHILDREN_DECK)) {
    for (let i = 0; i < copies; i += 1) childrenDeck.push(Number(n));
  }
  if (childrenDeck.length !== childBearing.length) {
    throw new Error(`${E}: the children deck holds ${childrenDeck.length} cards for ${childBearing.length} employees`);
  }
  const dealtChildren = createRng(id, "children").shuffle(childrenDeck);
  const childrenById = new Map(childBearing.map((row, index) => [row.employee_id, dealtChildren[index]]));
  const adoptionRng = createRng(id, "child-documentation");
  const verifyRng = createRng(id, "verification");
  const drafts = [];
  for (const employee of employees) {
    const qle = qleById.get(employee.employee_id);
    const tier = employee.coverage_tier;
    const hasSpouse = tier === "employee_spouse" || tier === "family";
    let children = 0;
    if (tier === "employee_children" || tier === "family") {
      children = qle ? qle.event.children : childrenById.get(employee.employee_id);
    }
    const earliestVerify = qle ? employee.election_date : employee.hire_date;
    const verifyDays = businessDaysBetween(earliestVerify, AS_OF);
    const members = [];
    for (let i = 0; i < children; i += 1) members.push("child");
    if (hasSpouse) members.push("spouse");
    for (const relationship of members) {
      const documentationType = relationship === "spouse"
        ? "marriage_certificate"
        : adoptionRng.chance(ADOPTION_SHARE) ? "adoption_or_placement_record" : "birth_certificate";
      const unverified = relationship === "spouse" && employee.employee_id === unverifiedEmployeeId;
      drafts.push({
        employee_id: employee.employee_id,
        relationship,
        documentation_type: documentationType,
        documentation_status: unverified ? "unverified" : "verified",
        verified_date: unverified ? "" : verifyRng.pick(verifyDays),
        sequence: drafts.length,
      });
    }
  }
  drafts.sort((a, b) =>
    a.employee_id.localeCompare(b.employee_id)
    || a.relationship.localeCompare(b.relationship)
    || a.sequence - b.sequence);
  const dependents = drafts.map((draft, index) => ({
    dependent_id: `DEP-${String(index + 1).padStart(4, "0")}`,
    employee_id: draft.employee_id,
    relationship: draft.relationship,
    documentation_type: draft.documentation_type,
    documentation_status: draft.documentation_status,
    verified_date: draft.verified_date,
  }));

  const grammar = {
    grammar_id: GRAMMAR_ID,
    as_of: AS_OF,
    plan_year_start: PLAN_YEAR_START,
    plan_year_end: PLAN_YEAR_END,
    source_library: SOURCE_LIBRARY,
    active_plan_ids: ACTIVE_PLAN_IDS.join("; "),
    universal_plan_ids: UNIVERSAL_PLAN_IDS.join("; "),
    spd_deadline_rule: SPD_DEADLINE_RULE,
    spd_deadline_days: SPD_DEADLINE_DAYS,
    alert_window_start: ALERT_WINDOW_START,
    alert_window_end: ALERT_WINDOW_END,
    alert_window_days: ALERT_WINDOW_DAYS,
    prior_open_enrollment_start: PRIOR_OPEN_ENROLLMENT_START,
    prior_open_enrollment_end: PRIOR_OPEN_ENROLLMENT_END,
    new_hire_election_days: NEW_HIRE_ELECTION_DAYS,
    coverage_tier_vocabulary: COVERAGE_TIERS.join("; "),
    medical_option_vocabulary: MEDICAL_OPTIONS.join("; "),
    election_vocabulary: ELECTIONS.join("; "),
    election_event_vocabulary: ELECTION_EVENTS.join("; "),
    relationship_vocabulary: RELATIONSHIPS.join("; "),
    documentation_type_vocabulary: DOCUMENTATION_TYPES.join("; "),
    documentation_status_vocabulary: DOCUMENTATION_STATUSES.join("; "),
    eligibility_statement: ELIGIBILITY_STATEMENT,
    employee_count: employees.length,
    dependent_count: dependents.length,
    no_health_no_pay_statement: NO_HEALTH_NO_PAY_STATEMENT,
  };

  const census = {
    grammar, employees, dependents, register,
    windowEmployeeId: active.find((p) => inRange(deadline(p), ALERT_WINDOW_START, ALERT_WINDOW_END)).employee_id,
    unverifiedEmployeeId,
  };
  assertPostConditions(census, salience, qleById);
  return census;
}

/**
 * Re-derive every published count from the rows the files will carry, the way
 * the public test does, and throw if one has stopped holding.
 */
function assertPostConditions({ grammar, employees, dependents, register }, salience, qleById) {
  const fail = (message) => { throw new Error(`${E}: ${message}`); };
  const count = (rows, predicate) => rows.filter(predicate).length;
  const deadlineOf = (row) => addDays(row.hire_date, SPD_DEADLINE_DAYS);

  if (employees.length !== EXPECTED.activeRows) fail(`${employees.length} employee rows`);
  const activeIds = salience.active.map((p) => p.employee_id);
  if (employees.some((row, index) => row.employee_id !== activeIds[index])) fail("the employee rows are not the active roster in employee_id order");

  // elections
  const events = Object.fromEntries(ELECTION_EVENTS.map((e) => [e, count(employees, (r) => r.election_event === e)]));
  if (events.new_hire !== EXPECTED.newHires) fail(`${events.new_hire} new_hire elections, expected ${EXPECTED.newHires}`);
  if (events.qualifying_life_event !== QLE_EMPLOYEES) fail(`${events.qualifying_life_event} qualifying life event elections`);
  if (events.open_enrollment !== EXPECTED.activeRows - EXPECTED.newHires - QLE_EMPLOYEES) fail(`${events.open_enrollment} open_enrollment elections`);
  for (const row of employees) {
    if (isWeekend(row.election_date)) fail(`an election_date falls on a weekend`);
    if (row.election_date > AS_OF || row.election_date < row.hire_date) fail(`an election_date sits outside the employee's own window`);
    if (row.election_event === "open_enrollment" && !inRange(row.election_date, PRIOR_OPEN_ENROLLMENT_START, PRIOR_OPEN_ENROLLMENT_END)) fail("an open enrollment election sits outside the prior window");
    if (row.election_event === "new_hire" && !inRange(row.election_date, row.hire_date, addDays(row.hire_date, NEW_HIRE_ELECTION_DAYS))) fail("a new hire election sits outside its 30 days");
    if (row.election_event === "qualifying_life_event" && !inRange(row.election_date, QLE_WINDOW_START, QLE_WINDOW_END)) fail("a qualifying life event election sits outside its window");
    if (row.election_event === "new_hire" && row.hire_date < PRIOR_OPEN_ENROLLMENT_START) fail("a new hire election sits on an employee hired before the prior window");
    if (row.coverage_start_date !== firstOfNextMonth(row.hire_date)) fail("a coverage_start_date does not recompute");
  }
  const qleDates = employees.filter((r) => r.election_event === "qualifying_life_event").map((r) => r.election_date);
  if (new Set(qleDates).size !== QLE_EMPLOYEES) fail("the qualifying life event dates are not distinct");
  for (const row of employees.filter((r) => r.election_event === "qualifying_life_event")) {
    if (!salience.qlePool.some((p) => p.employee_id === row.employee_id)) fail("a qualifying life event employee sits outside the guarded pool");
  }

  // tiers, options, elections
  for (const tier of COVERAGE_TIERS) {
    const n = count(employees, (r) => r.coverage_tier === tier);
    if (n !== TIER_TARGETS[tier]) fail(`${n} ${tier} rows, expected ${TIER_TARGETS[tier]}`);
  }
  for (const option of MEDICAL_OPTIONS) {
    const n = count(employees, (r) => r.medical_option === option);
    if (n !== MEDICAL_TARGETS[option]) fail(`${n} ${option} rows, expected ${MEDICAL_TARGETS[option]}`);
  }
  if (count(employees, (r) => r.dental_election === "enrolled") !== DENTAL_ENROLLED) fail("the dental census moved");
  if (count(employees, (r) => r.vision_election === "enrolled") !== VISION_ENROLLED) fail("the vision census moved");
  for (const row of employees) {
    const waivedTier = row.coverage_tier === "waived";
    const lines = [row.medical_option !== "waived", row.dental_election === "enrolled", row.vision_election === "enrolled"];
    if (waivedTier && lines.some(Boolean)) fail("a waived tier enrolls in a line");
    if (!waivedTier && !lines.some(Boolean)) fail("a covered tier enrolls in no line");
    if ((row.medical_plan_id === MEDICAL_PLAN_ID) !== (row.medical_option !== "waived")) fail("medical_plan_id disagrees with medical_option");
    if (row.medical_plan_id !== "" && row.medical_plan_id !== MEDICAL_PLAN_ID) fail("a medical_plan_id is not the medical plan");
    const dvEnrolled = row.dental_election === "enrolled" || row.vision_election === "enrolled";
    if ((row.dental_vision_plan_id === DENTAL_VISION_PLAN_ID) !== dvEnrolled) fail("dental_vision_plan_id disagrees with the elections");
    if (row.dental_vision_plan_id !== "" && row.dental_vision_plan_id !== DENTAL_VISION_PLAN_ID) fail("a dental_vision_plan_id is not the dental and vision plan");
  }

  // HR-20a and its qualifier-dropped counts, from the rows
  const inWindow = (days) => (r) => inRange(deadlineOf(r), ALERT_WINDOW_START, addDays(ALERT_WINDOW_START, days));
  if (count(employees, inWindow(ALERT_WINDOW_DAYS)) !== 1) fail("the alert window census is not 1");
  if (count(employees, inWindow(14)) !== EXPECTED.window14Census) fail("the 14 day window census moved");
  if (count(employees, inWindow(30)) !== EXPECTED.window30Census) fail("the 30 day window census moved");
  const after = employees.filter((r) => deadlineOf(r) > AS_OF).map((r) => r.employee_id);
  const empty = employees.filter((r) => r.spd_furnished_date === "").map((r) => r.employee_id);
  if (after.length !== EXPECTED.afterAsOfCensus) fail(`${after.length} deadlines after the as of`);
  if (after.join() !== empty.join()) fail("the empty spd_furnished_date rows are not the after the as of rows");
  const priorThirty = employees.filter((r) => deadlineOf(r) < AS_OF && deadlineOf(r) >= addDays(AS_OF, -30));
  if (priorThirty.length !== EXPECTED.priorThirtyCensus) fail("the prior 30 day census moved");
  const overdue = employees.filter((r) => deadlineOf(r) <= AS_OF && (r.spd_furnished_date === "" || r.spd_furnished_date > deadlineOf(r)));
  if (overdue.length !== EXPECTED.overdueCensus) fail(`${overdue.length} rows are overdue`);
  if (count(employees, (r) => inRange(addDays(r.coverage_start_date, SPD_DEADLINE_DAYS), ALERT_WINDOW_START, ALERT_WINDOW_END)) !== 0) {
    fail("the coverage start based window census is not 0");
  }
  for (const row of employees.filter((r) => r.spd_furnished_date !== "")) {
    if (isWeekend(row.spd_furnished_date) || !inRange(row.spd_furnished_date, row.hire_date, deadlineOf(row))) {
      fail("a spd_furnished_date sits outside its own window or on a weekend");
    }
  }

  // dependents
  const employeeById = new Map(employees.map((r) => [r.employee_id, r]));
  dependents.forEach((dep, index) => {
    if (dep.dependent_id !== `DEP-${String(index + 1).padStart(4, "0")}`) fail("the dependent id block is not dense");
    const prev = dependents[index - 1];
    if (prev && (prev.employee_id > dep.employee_id || (prev.employee_id === dep.employee_id && prev.relationship > dep.relationship))) {
      fail("the dependents are not in (employee_id, relationship, dependent_id) order");
    }
    const owner = employeeById.get(dep.employee_id);
    if (!owner) fail("a dependent names an employee outside the census");
    const expectedType = dep.relationship === "spouse" ? ["marriage_certificate"] : ["birth_certificate", "adoption_or_placement_record"];
    if (!expectedType.includes(dep.documentation_type)) fail("a dependent carries a documentation type its relationship does not take");
    if ((dep.documentation_status === "verified") !== (dep.verified_date !== "")) fail("verified_date disagrees with documentation_status");
    if (dep.verified_date !== "") {
      const lo = owner.election_event === "qualifying_life_event" ? owner.election_date : owner.hire_date;
      if (isWeekend(dep.verified_date) || !inRange(dep.verified_date, lo, AS_OF)) fail("a verified_date sits outside its window");
    }
  });
  for (const row of employees) {
    const own = dependents.filter((d) => d.employee_id === row.employee_id);
    const spouses = own.filter((d) => d.relationship === "spouse").length;
    const children = own.filter((d) => d.relationship === "child").length;
    const ok = {
      waived: spouses === 0 && children === 0,
      employee_only: spouses === 0 && children === 0,
      employee_spouse: spouses === 1 && children === 0,
      employee_children: spouses === 0 && children >= 1 && children <= 3,
      family: spouses === 1 && children >= 1 && children <= 3,
    }[row.coverage_tier];
    if (!ok) fail("an employee's dependents disagree with the tier rule");
  }
  if (Number(grammar.dependent_count) !== dependents.length) fail("the grammar's dependent_count disagrees with the file");
  if (dependents.length !== DEPENDENT_COUNT) fail(`${dependents.length} dependents, expected ${DEPENDENT_COUNT}`);

  // HR-20b and its qualifier-dropped counts
  const unverified = dependents.filter((d) => d.documentation_status === "unverified");
  if (unverified.length !== 1) fail(`${unverified.length} unverified dependents, expected 1`);
  if (count(dependents, (d) => d.verified_date === "") !== 1) fail("the empty verified_date census is not 1");
  const qleDeps = dependents.filter((d) => employeeById.get(d.employee_id).election_event === "qualifying_life_event");
  if (qleDeps.length !== QLE_DEPENDENTS) fail(`${qleDeps.length} qualifying life event dependents, expected ${QLE_DEPENDENTS}`);
  if (count(qleDeps, (d) => d.documentation_type === "marriage_certificate") !== QLE_MARRIAGE_CERTIFICATES) fail("the qualifying life event marriage certificate census moved");
  const carrierDate = employeeById.get(unverified[0].employee_id).election_date;
  const sortedQle = qleDates.slice().sort();
  if (employeeById.get(unverified[0].employee_id).election_event !== "qualifying_life_event") fail("the unverified dependent's employee is not a qualifying life event employee");
  if (carrierDate === sortedQle[0] || carrierDate === sortedQle.at(-1)) fail("the unverified dependent's employee sits at an end of the date order");
  if (unverified[0].relationship !== "spouse") fail("the unverified dependent is not a spouse");
  if (qleById.get(unverified[0].employee_id).event.kind !== "marriage") fail("the unverified dependent was not added by a marriage");

  // absence and the id block
  const planIds = new Set([
    ...employees.map((r) => r.medical_plan_id), ...employees.map((r) => r.dental_vision_plan_id),
    ...ACTIVE_PLAN_IDS, ...UNIVERSAL_PLAN_IDS,
  ].filter(Boolean));
  for (const planId of planIds) {
    if (register.get(planId)?.Status !== "Active") fail(`${planId} does not resolve to an Active register row`);
  }
}

/** The last screen before the bytes leave. */
function assertEmittedBytes(files) {
  for (const file of files) {
    if (file.content.includes(SUPERSEDED_PLAN_ID)) throw new Error(`${E}: ${file.path} carries ${SUPERSEDED_PLAN_ID}`);
    if (file.content.includes(EN_DASH) || file.content.includes(EM_DASH)) throw new Error(`${E}: ${file.path} carries a dash this pack does not write`);
    if (file.content.includes("%") || file.content.includes("$")) throw new Error(`${E}: ${file.path} carries a percent or a currency symbol`);
    if (/\b\d+\.\d{2}\b/.test(file.content)) throw new Error(`${E}: ${file.path} carries a money-shaped number`);
    for (const match of file.content.matchAll(/(^|[^A-Za-z])DEP-([0-9]+)/gm)) {
      if (file.path !== "dependents.csv") throw new Error(`${E}: ${file.path} carries a dependent id`);
      if (match[2].length !== 4) throw new Error(`${E}: a dependent id is not four digits`);
    }
  }
  assertPrefixUnusedElsewhere("DEP-", "datasets/hr/benefits-census/", E);
}

export function generate() {
  const { grammar, employees, dependents } = buildBenefitsCensus();
  const files = [
    { path: "census-grammar.csv", content: toCsv(COLUMNS.grammar, [grammar]) },
    { path: "employee-benefits.csv", content: toCsv(COLUMNS.employees, employees) },
    { path: "dependents.csv", content: toCsv(COLUMNS.dependents, dependents) },
  ];
  assertEmittedBytes(files);
  return files;
}

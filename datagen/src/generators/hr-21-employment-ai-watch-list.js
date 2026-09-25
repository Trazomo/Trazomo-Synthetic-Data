// HR-21 employment-ai-watch-list: a dated watch list of the real instruments
// that govern AI and automated decisions in employment, as the 2026-08-31
// regulatory refresh recorded them, with one bill re-checked on 2026-09-01.
//
// Three files:
//
//   watch-list-grammar.csv        one row: the as of, the not legal advice
//                                 notice, every closed vocabulary and the rules
//                                 a reader applies (enforceable, stage mapping).
//   employment-ai-watch-list.jsonl the records, keys in a fixed order, with
//                                 nested scope, obligations, status history,
//                                 transpositions and notes.
//   jurisdictions.csv             the jurisdictions every record, every HR-15
//                                 location and every HR-16 notice resolves to.
//
// The records name real instruments and public bodies (ruling R6) and nothing
// else: no person, no law firm, no litigant, no vendor, no URL and no money.
// Every fact comes from the refresh appendix; a detail the appendix does not
// carry is an empty field beside a confidence value, never a memory. "status"
// and "enforceable" are separate fields, and enforceable is recomputed from the
// obligations by a published rule rather than typed.
//
// The row stamp is 2026-09-01, after the pack's universe now of 2026-04-03: the
// artifact records the compliance position at its own as of and does not move
// any earlier artifact's date (the R7 class of a later-dated document).
//
// HR-15 and HR-16 import JURISDICTIONS, AS_OF, DECISION_STAGES, the
// vocabularies, inApplication() and buildWatchList() in process.
import { toCsv } from "../csv.js";
import { assertPrefixUnusedElsewhere } from "./hr-20-benefits-census.js";

export const id = "HR-21";

const E = "HR-21";

export const AS_OF = "2026-09-01";
export const UNIVERSE_NOW = "2026-04-03";
export const GRAMMAR_ID = "WATCH-LIST-GRAMMAR-2026-09-01";
export const OWN_DIR = "datasets/hr/employment-ai-watch-list/";
export const ROW_ID_PREFIX = "EAW-";

/** Published design counts (data plan 2.2.1). */
export const EXPECTED_RECORD_COUNT = 22;
export const EXPECTED_JURISDICTION_COUNT = 37;

// ----------------------------------------------------------------- keys

/** The jsonl's top-level keys, in the documented order. */
export const RECORD_KEYS = [
  "row_id", "jurisdiction_code", "instrument_type", "citation", "title", "status", "enforceable",
  "obligation_type", "preemption_risk", "scope", "obligations", "status_history",
  "transposition_deadline", "transpositions", "notes", "related_row_ids", "source_basis",
  "as_of", "verified_on",
];
export const SCOPE_KEYS = ["subjects", "decision_stages", "technologies", "scope_text_status"];
export const OBLIGATION_KEYS = [
  "obligation_id", "duty_type", "addressee", "decision_stages", "applies_from",
  "applies_from_confidence", "application_status", "implementation_status", "detail_status", "summary",
];
export const HISTORY_KEYS = ["event", "date", "date_confidence", "date_text", "note"];
export const TRANSPOSITION_KEYS = [
  "member_state_code", "member_state_name", "transposition_status", "status_as_of", "verified_on",
];
export const NOTE_KEYS = ["topic", "text", "date", "date_confidence"];

export const COLUMNS = {
  grammar: [
    "grammar_id", "as_of", "universe_now", "stamp_statement", "not_legal_advice_notice",
    "record_count", "jurisdiction_count", "record_key_order", "obligation_key_order",
    "status_vocabulary", "enforceable_definition", "instrument_type_vocabulary",
    "obligation_type_vocabulary", "duty_type_vocabulary", "application_status_vocabulary",
    "implementation_status_vocabulary", "decision_stage_vocabulary", "technology_vocabulary",
    "subject_vocabulary", "scope_text_status_vocabulary", "stage_mapping_rule",
    "history_event_vocabulary", "date_confidence_vocabulary", "preemption_risk_vocabulary",
    "transposition_status_vocabulary", "source_basis_vocabulary",
    "jurisdiction_level_vocabulary", "coverage_status_vocabulary", "verification_statement",
  ],
  records: RECORD_KEYS,
  jurisdictions: ["code", "name", "level", "parent_code", "coverage_status", "as_of"],
};

export const FILES = {
  grammar: "watch-list-grammar.csv",
  records: "employment-ai-watch-list.jsonl",
  jurisdictions: "jurisdictions.csv",
};

// ----------------------------------------------------------------- vocabularies
// Data plan 2.2.2 closes status, instrument_type, application_status,
// implementation_status, detail_status, decision_stage, technology,
// scope_text_status, date_confidence, preemption_risk, transposition_status and
// coverage_status. The grammar also publishes obligation_type, duty_type,
// subject, history_event, source_basis and jurisdiction_level; those are closed
// here over the rows of 2.2.3 and the claim blocks they rest on.

export const STATUSES = [
  "proposed", "in_negotiation", "draft", "passed_legislature", "awaiting_signature",
  "enacted", "vetoed", "repealed", "withdrawn", "decided",
];
export const INSTRUMENT_TYPES = [
  "regulation", "directive", "statute", "statute_group", "local_law", "bill", "draft_bill",
  "agency_regulation", "statutory_instrument", "executive_order", "agency_guidance",
  "draft_guidance", "judgment", "legislative_proposal",
];
/** What an instrument is about, one token per record. */
export const OBLIGATION_TYPES = [
  "ai_system_governance", "automated_decision_rights", "anti_discrimination",
  "bias_audit_and_notice", "consent", "notice_and_human_review", "automated_decision_notice",
  "pay_transparency", "ai_labor_impact_reporting", "preemption",
];
/** What one obligation requires. HR-16's notice rule reads `notice`. */
export const DUTY_TYPES = [
  "transparency", "high_risk_deployer_duties", "explanation_and_human_intervention",
  "subject_access", "automated_decision_safeguards", "complaints_handling",
  "non_discrimination", "bias_audit", "notice", "consent", "demographic_reporting",
  "record_retention", "adverse_outcome_disclosure", "human_review", "access_to_information",
  "human_appeal", "risk_assessment_submission", "pay_range_disclosure", "pay_criteria_access",
  "pay_information_on_request", "pay_gap_reporting", "joint_pay_assessment",
];
/** Who an obligation binds. */
export const ADDRESSEES = ["employer", "deployer", "controller", "business"];
/** The addressees the enforceable rule counts. */
export const ENFORCEABLE_ADDRESSEES = ["employer", "deployer", "controller"];
export const APPLICATION_STATUSES = ["in_application", "scheduled", "awaiting_transposition"];
/** The empty string is a member: most obligations have no implementing rules to wait on. */
export const IMPLEMENTATION_STATUSES = ["complete", "rules_pending", ""];
export const DETAIL_STATUSES = ["verified_primary", "verified_secondary", "not_retrieved"];
export const DECISION_STAGES = [
  "recruitment_selection", "promotion", "termination_discipline", "terms_and_conditions",
  "training_selection", "task_allocation", "performance_evaluation", "pay_determination",
  "solely_automated_decision",
];
export const TECHNOLOGIES = [
  "any_ai_system", "automated_decision_system", "any_selection_procedure",
  "automated_employment_decision_tool", "video_interview_analysis", "facial_recognition",
];
/** The two tokens HR-21d's first half counts as a specific technique. */
export const SPECIFIC_TECHNOLOGIES = ["video_interview_analysis", "facial_recognition"];
export const SUBJECTS = [
  "applicants", "employees", "workers", "workers_representatives", "data_subjects", "consumers",
];
export const SCOPE_TEXT_STATUSES = ["verbatim", "secondary_consistent", "not_retrieved"];
export const HISTORY_EVENTS = [
  "proposed", "introduced", "passed_chamber", "passed", "amendments_concurred",
  "ordered_to_enrollment", "adopted", "signed", "became_law", "published", "entered_into_force",
  "made", "laid", "issued", "finalised", "delayed", "enjoined", "repealed", "replaced", "vetoed",
  "withdrawn", "rules_proposed", "hearing_cancelled", "rules_withdrawn", "consultation_opened",
  "consultation_closed", "draft_released", "deadline_reaffirmed", "decided",
];
export const DATE_CONFIDENCES = ["exact", "approximate", "not_in_source", "unconfirmed"];
export const PREEMPTION_RISKS = ["not_applicable", "watched", "litigated"];
export const TRANSPOSITION_STATUSES = ["full", "partial", "draft_published", "no_draft"];
export const SOURCE_BASES = ["verified_primary", "primary_with_secondary", "secondary_consistent"];
export const JURISDICTION_LEVELS = ["supranational", "national", "state", "city"];
export const COVERAGE_STATUSES = ["researched", "not_researched"];

// ----------------------------------------------------------------- published sentences

export const STAMP_STATEMENT =
  "this artifact is dated after the pack's universe now; it records the compliance position at its own as_of "
  + "and does not move any earlier artifact's date";
export const NOT_LEGAL_ADVICE_NOTICE =
  "This watch list is synthetic training data. Its records cite real instruments as recorded on each record's "
  + "verified_on date. It is not legal advice, it is not a complete survey of any jurisdiction, and any status "
  + "may have changed since. Read the official text before relying on a record.";
export const ENFORCEABLE_DEFINITION =
  "enforceable is true exactly when at least one obligation addressed to an employer, deployer or controller has "
  + "application_status in_application at the as_of; status and enforceable are separate fields";
export const STAGE_MAPPING_RULE =
  "decision_stages are tokens for the decisions a verified scope text names: recruitment and hiring map to "
  + "recruitment_selection; renewal, tenure and terms and conditions map to terms_and_conditions; discharge and "
  + "discipline map to termination_discipline; selection for training or apprenticeship maps to "
  + "training_selection; a text that names employment without listing decisions maps to recruitment_selection, "
  + "promotion, termination_discipline and terms_and_conditions; a scope the refresh could not read carries no "
  + "token and scope_text_status not_retrieved";
export const VERIFICATION_STATEMENT =
  "every record was checked against a dated research record of 2026-08-31, and the one bill still moving was "
  + "re-checked on 2026-09-01; no record carries a URL";

// ----------------------------------------------------------------- jurisdictions

/** The 27 member states, ISO 3166-1 alpha-2, names as the appendix writes them (claim 9b). */
const MEMBER_STATES = [
  ["AT", "Austria"], ["BE", "Belgium"], ["BG", "Bulgaria"], ["CY", "Cyprus"], ["CZ", "Czechia"],
  ["DE", "Germany"], ["DK", "Denmark"], ["EE", "Estonia"], ["ES", "Spain"], ["FI", "Finland"],
  ["FR", "France"], ["GR", "Greece"], ["HR", "Croatia"], ["HU", "Hungary"], ["IE", "Ireland"],
  ["IT", "Italy"], ["LT", "Lithuania"], ["LU", "Luxembourg"], ["LV", "Latvia"], ["MT", "Malta"],
  ["NL", "Netherlands"], ["PL", "Poland"], ["PT", "Portugal"], ["RO", "Romania"], ["SE", "Sweden"],
  ["SI", "Slovenia"], ["SK", "Slovakia"],
];
export const MEMBER_STATE_CODES = MEMBER_STATES.map(([code]) => code);

const jurisdiction = (code, name, level, parent_code, coverage_status = "researched") =>
  ({ code, name, level, parent_code, coverage_status });

/**
 * The 37 jurisdictions of data plan 2.2.4, sorted by code. Delaware is the one
 * not_researched row: the refresh swept no Delaware source, so the watch list
 * asserts nothing about Delaware law.
 */
export const JURISDICTIONS = [
  jurisdiction("EU", "European Union", "supranational", ""),
  jurisdiction("GB", "United Kingdom", "national", ""),
  jurisdiction("US", "United States", "national", ""),
  jurisdiction("US-CA", "California", "state", "US"),
  jurisdiction("US-CO", "Colorado", "state", "US"),
  jurisdiction("US-DE", "Delaware", "state", "US", "not_researched"),
  jurisdiction("US-IL", "Illinois", "state", "US"),
  jurisdiction("US-MD", "Maryland", "state", "US"),
  jurisdiction("US-NY", "New York", "state", "US"),
  jurisdiction("US-NY-NYC", "New York City", "city", "US-NY"),
  ...MEMBER_STATES.map(([code, name]) => jurisdiction(code, name, "national", "EU")),
].sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));

// ----------------------------------------------------------------- rules

/**
 * Whether an obligation is in application at a date. An obligation awaiting
 * transposition never is. One with a fixed applies_from is in application from
 * that date. One whose applies_from the refresh does not give (an empty date
 * beside not_in_source or unconfirmed) is in application exactly when its
 * recorded application_status says so.
 */
export function inApplication(obligation, asOf) {
  if (obligation.application_status === "awaiting_transposition") return false;
  if (obligation.applies_from === "") return obligation.application_status === "in_application";
  return obligation.applies_from <= asOf;
}

/** The published enforceable rule, recomputed from a record's obligations. */
export function isEnforceable(record, asOf = AS_OF) {
  return record.obligations.some((o) => ENFORCEABLE_ADDRESSEES.includes(o.addressee) && inApplication(o, asOf));
}

// ----------------------------------------------------------------- records

// TODO(HR-21 phase b): the 22 records of data plan 2.2.3, each a literal entry
// preceded by a comment naming its appendix item and claim letters, in the key
// order of 2.2.1. Until they land the builder emits an empty record list and
// skips the record, plant and structural-count assertions.
const RECORDS = [];

// ----------------------------------------------------------------- the build

const join = (values) => values.join("; ");

function buildGrammar(records) {
  return {
    grammar_id: GRAMMAR_ID,
    as_of: AS_OF,
    universe_now: UNIVERSE_NOW,
    stamp_statement: STAMP_STATEMENT,
    not_legal_advice_notice: NOT_LEGAL_ADVICE_NOTICE,
    record_count: records.length,
    jurisdiction_count: JURISDICTIONS.length,
    record_key_order: join(RECORD_KEYS),
    obligation_key_order: join(OBLIGATION_KEYS),
    status_vocabulary: join(STATUSES),
    enforceable_definition: ENFORCEABLE_DEFINITION,
    instrument_type_vocabulary: join(INSTRUMENT_TYPES),
    obligation_type_vocabulary: join(OBLIGATION_TYPES),
    duty_type_vocabulary: join(DUTY_TYPES),
    application_status_vocabulary: join(APPLICATION_STATUSES),
    implementation_status_vocabulary: "complete; rules_pending; empty when no implementing rules are awaited",
    decision_stage_vocabulary: join(DECISION_STAGES),
    technology_vocabulary: join(TECHNOLOGIES),
    subject_vocabulary: join(SUBJECTS),
    scope_text_status_vocabulary: join(SCOPE_TEXT_STATUSES),
    stage_mapping_rule: STAGE_MAPPING_RULE,
    history_event_vocabulary: join(HISTORY_EVENTS),
    date_confidence_vocabulary: join(DATE_CONFIDENCES),
    preemption_risk_vocabulary: join(PREEMPTION_RISKS),
    transposition_status_vocabulary: join(TRANSPOSITION_STATUSES),
    source_basis_vocabulary: join(SOURCE_BASES),
    jurisdiction_level_vocabulary: join(JURISDICTION_LEVELS),
    coverage_status_vocabulary: join(COVERAGE_STATUSES),
    verification_statement: VERIFICATION_STATEMENT,
  };
}

function assertJurisdictions() {
  const fail = (message) => { throw new Error(`${E}: ${message}`); };
  if (JURISDICTIONS.length !== EXPECTED_JURISDICTION_COUNT) fail(`${JURISDICTIONS.length} jurisdictions, expected ${EXPECTED_JURISDICTION_COUNT}`);
  const codes = new Set(JURISDICTIONS.map((j) => j.code));
  if (codes.size !== JURISDICTIONS.length) fail("a jurisdiction code repeats");
  for (const j of JURISDICTIONS) {
    if (!JURISDICTION_LEVELS.includes(j.level)) fail(`${j.code} carries level "${j.level}"`);
    if (!COVERAGE_STATUSES.includes(j.coverage_status)) fail(`${j.code} carries coverage "${j.coverage_status}"`);
    if (j.parent_code !== "" && !codes.has(j.parent_code)) fail(`${j.code}'s parent ${j.parent_code} is not a jurisdiction`);
  }
  const unresearched = JURISDICTIONS.filter((j) => j.coverage_status === "not_researched").map((j) => j.code);
  if (unresearched.join(",") !== "US-DE") fail(`not_researched rows are ${unresearched.join(", ")}, expected US-DE alone`);
  if (JURISDICTIONS.filter((j) => j.parent_code === "EU").length !== 27) fail("the member states are not 27");
}

/**
 * The whole watch list: grammar, records and jurisdictions, with every published
 * rule asserted. Exported so HR-15 and HR-16 read the records in process.
 */
export function buildWatchList() {
  assertJurisdictions();
  // TODO(HR-21 phase b): build the rows from RECORDS (row_id by
  // (jurisdiction_code, citation), obligation ids, as_of and verified_on), then
  // assert key order, vocabularies, dates and confidences, jurisdiction joins,
  // the enforceable rule, the denylist, the six plant rules with their
  // qualifier-dropped counts and the two structural counts.
  const records = RECORDS.map((record) => record);
  const jurisdictions = JURISDICTIONS.map((j) => ({ ...j, as_of: AS_OF }));
  return { grammar: buildGrammar(records), records, jurisdictions };
}

// ----------------------------------------------------------------- bytes

const EN_DASH = String.fromCharCode(0x2013);
const EM_DASH = String.fromCharCode(0x2014);

function assertEmittedBytes(files) {
  for (const file of files) {
    if (file.content.includes(EN_DASH) || file.content.includes(EM_DASH)) throw new Error(`${E}: ${file.path} carries a dash this pack does not write`);
    if (/https?:\/\/|www\./.test(file.content)) throw new Error(`${E}: ${file.path} carries a URL`);
    if (file.content.includes("$")) throw new Error(`${E}: ${file.path} carries a currency symbol`);
  }
  assertPrefixUnusedElsewhere(ROW_ID_PREFIX, OWN_DIR, E);
}

export function generate() {
  const { grammar, records, jurisdictions } = buildWatchList();
  const files = [
    { path: FILES.grammar, content: toCsv(COLUMNS.grammar, [grammar]) },
    { path: FILES.records, content: records.map((r) => JSON.stringify(r)).join("\n") + (records.length ? "\n" : "") },
    { path: FILES.jurisdictions, content: toCsv(COLUMNS.jurisdictions, jurisdictions) },
  ];
  assertEmittedBytes(files);
  return files;
}

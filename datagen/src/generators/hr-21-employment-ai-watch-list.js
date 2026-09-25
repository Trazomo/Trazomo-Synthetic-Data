// HR-21 employment-ai-watch-list: a dated watch list of the real instruments
// that govern AI and automated decisions in employment, as the 2026-08-31
// regulatory refresh recorded them, with one bill re-checked on 2026-09-01.
//
// Three files:
//
//   watch-list-grammar.csv        one row: the as of, the not legal advice
//                                 notice, every key order, every closed
//                                 vocabulary and the rules a reader applies
//                                 (enforceable, stage mapping).
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
// Five findings are planted and none is labelled; each is one application of a
// rule over published fields, and the builder recomputes each with the count it
// returns when one qualifier is dropped (data plan 2.2.6). Which record carries
// which finding is not written anywhere in this file's output.
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

/** The refresh pass, and the one re-check (data plan 2.2.3). */
export const REFRESH_DATE = "2026-08-31";
export const RECHECK_DATE = "2026-09-01";
/** The transposition census date (claim 9b). */
export const TRANSPOSITION_STATUS_AS_OF = "2026-06-18";
/** HR-15's alert window (data plan B50), for the structural count. */
export const ALERT_WINDOW = ["2026-09-01", "2026-09-15"];

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
    "record_count", "jurisdiction_count", "record_key_order", "scope_key_order", "obligation_key_order",
    "history_key_order", "transposition_key_order", "note_key_order", "status_vocabulary",
    "enforceable_definition", "instrument_type_vocabulary",
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
// here over the rows of 2.2.3 and the claim blocks they rest on, and the builder
// throws unless obligation_type, duty_type and history_event are exactly the
// tokens the records use.

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
/**
 * Where a record's facts rest: the refresh read the primary text; it read the
 * primary text in part and the rest rests on consistent secondary reporting; or
 * secondary reporting only.
 */
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

const byString = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

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
].sort((a, b) => byString(a.code, b.code));

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

// ----------------------------------------------------------------- record helpers

const EMPLOYMENT_STAGES = ["recruitment_selection", "promotion", "termination_discipline", "terms_and_conditions"];

/** An obligation, in OBLIGATION_KEYS order less its id. Confidence follows the date. */
const ob = (duty_type, addressee, decision_stages, applies_from, application_status, detail_status, summary,
  { confidence, implementation_status = "" } = {}) => ({
  duty_type, addressee, decision_stages, applies_from,
  applies_from_confidence: confidence ?? (applies_from === "" ? "not_in_source" : "exact"),
  application_status, implementation_status, detail_status, summary,
});

/** A status history event. An exact date carries no date_text; any other carries an empty date. */
const ev = (event, date, note, { confidence, date_text = "" } = {}) => ({
  event, date, date_confidence: confidence ?? (date === "" ? "not_in_source" : "exact"), date_text, note,
});

/** A note. A note with no date carries not_in_source unless flagged otherwise. */
const note = (topic, text, date = "", confidence) => ({
  topic, text, date, date_confidence: confidence ?? (date === "" ? "not_in_source" : "exact"),
});

const scope = (subjects, decision_stages, technologies, scope_text_status) =>
  ({ subjects, decision_stages, technologies, scope_text_status });

// The Pay Transparency Directive's census (claim 9b), by status.
const TRANSPOSITION_CENSUS = {
  full: ["Slovakia", "Italy", "Lithuania", "Malta"],
  partial: ["Belgium", "Ireland", "Poland"],
  draft_published: ["France", "Denmark", "Netherlands", "Finland", "Czechia", "Cyprus", "Latvia", "Bulgaria", "Greece", "Romania"],
  no_draft: ["Germany", "Spain", "Sweden", "Estonia", "Austria", "Croatia", "Hungary", "Luxembourg", "Portugal", "Slovenia"],
};

function transpositionRows() {
  const codeOf = new Map(MEMBER_STATES.map(([code, name]) => [name, code]));
  const rows = Object.entries(TRANSPOSITION_CENSUS).flatMap(([status, names]) => names.map((name) => {
    if (!codeOf.has(name)) throw new Error(`${E}: ${name} is not a member state row`);
    return {
      member_state_code: codeOf.get(name), member_state_name: name, transposition_status: status,
      status_as_of: TRANSPOSITION_STATUS_AS_OF, verified_on: REFRESH_DATE,
    };
  }));
  return rows.sort((a, b) => byString(a.member_state_code, b.member_state_code));
}

// ----------------------------------------------------------------- records
// The 22 records of data plan 2.2.3. `key` is a build-time handle for
// related_row_ids and never leaves this file. Every string restates a sentence
// of the claim block named in the comment above the record; verbatim quotation
// appears only where the appendix quotes (Annex III point 4, Article 26(6) and
// 26(7), "active rather than tokenistic", "the procedure and principles actually
// applied").

const RECORDS = [
  // Appendix item 1, claims 1.1, 1.3, 1.4, 1.5 and 1.8 (Article 50 date and
  // high-risk date, no conditional trigger, Annex III point 4 verbatim, Article
  // 26(6) and 26(7) verbatim). U-C8-13: Article 26 sits inside the high-risk
  // obligation with detail_status verified_secondary.
  {
    key: "eu-ai-act",
    jurisdiction_code: "EU", instrument_type: "regulation",
    citation: "Regulation (EU) 2024/1689, as amended by Regulation (EU) 2026/1744",
    title: "EU Artificial Intelligence Act, as amended by the Digital Omnibus on AI",
    status: "enacted", obligation_type: "ai_system_governance", preemption_risk: "not_applicable",
    scope: scope(["applicants", "workers", "workers_representatives"],
      ["recruitment_selection", "promotion", "termination_discipline", "terms_and_conditions", "task_allocation", "performance_evaluation"],
      ["any_ai_system"], "verbatim"),
    obligations: [
      ob("transparency", "deployer", [], "2026-08-02", "in_application", "verified_secondary",
        "Article 50 transparency obligations are unchanged by the omnibus and apply from the applies_from date."),
      ob("high_risk_deployer_duties", "deployer",
        ["recruitment_selection", "promotion", "termination_discipline", "terms_and_conditions", "task_allocation", "performance_evaluation"],
        "2027-12-02", "scheduled", "verified_secondary",
        "Chapter III Sections 1, 2 and 3 obligations for Annex III high-risk systems apply from the applies_from date, "
        + "a fixed calendar date with no conditional or standards-readiness trigger. Article 26(6): \"Deployers of "
        + "high-risk AI systems shall keep the logs automatically generated by that high-risk AI system to the extent "
        + "such logs are under their control, for a period appropriate to the intended purpose of the high-risk AI "
        + "system, of at least six months, unless provided otherwise in applicable Union or national law, in "
        + "particular in Union law on the protection of personal data.\" Article 26(7): \"Before putting into "
        + "service or using a high-risk AI system at the workplace, deployers who are employers shall inform workers' "
        + "representatives and the affected workers that they will be subject to the use of the high-risk AI system.\""),
    ],
    status_history: [
      ev("adopted", "2026-06-29", "Regulation (EU) 2026/1744 adopted by the Council"),
      ev("signed", "2026-07-08", "Regulation (EU) 2026/1744 signed"),
      ev("published", "2026-07-24", "Regulation (EU) 2026/1744 published in the Official Journal"),
      ev("entered_into_force", "2026-07-27", "Regulation (EU) 2026/1744 in force, amending Article 113 of Regulation (EU) 2024/1689"),
    ],
    transposition_deadline: "", transpositions: [],
    notes: [
      note("annex_iii_point_4",
        "Annex III point 4, not amended by the 2026 omnibus: \"4. Employment, workers' management and access to "
        + "self-employment: (a) AI systems intended to be used for the recruitment or selection of natural persons, in "
        + "particular to place targeted job advertisements, to analyse and filter job applications, and to evaluate "
        + "candidates; (b) AI systems intended to be used to make decisions affecting terms of work-related "
        + "relationships, the promotion or termination of work-related contractual relationships, to allocate tasks "
        + "based on individual behaviour or personal traits or characteristics or to monitor and evaluate the "
        + "performance and behaviour of persons in such relationships.\""),
      note("date_moved", "The Annex III high-risk application date moved from 2026-08-02 to 2027-12-02 by the amendment to Article 113.", "2026-07-27"),
      note("watched_provision", "Article 113 as amended was read through fetch summaries rather than end to end, so the record watches Article 113 rather than asserting its full text."),
      note("watched_provision", "The Article 26 text was read from a page that predates Regulation (EU) 2026/1744; two readings of the omnibus found no substantive amendment to Article 26, and Article 26 is carried as a watched provision."),
      note("log_floor", "The six-month log period in Article 26(6) is a floor, not a period."),
    ],
    related: [], source_basis: "primary_with_secondary",
  },

  // Appendix item 1, claim 1.2 (the data half in negotiation), and item 8,
  // claim 8e (proposed refinements to GDPR Article 22).
  {
    key: "eu-omnibus-data",
    jurisdiction_code: "EU", instrument_type: "legislative_proposal",
    citation: "Digital Omnibus, data protection part (GDPR and ePrivacy amendments), proposal of November 2025",
    title: "Digital Omnibus, data half",
    status: "in_negotiation", obligation_type: "automated_decision_rights", preemption_risk: "not_applicable",
    scope: scope(["data_subjects"], [], ["automated_decision_system"], "not_retrieved"),
    obligations: [],
    status_history: [
      ev("proposed", "", "the Digital Omnibus package was proposed and later split in two", { confidence: "approximate", date_text: "November 2025" }),
    ],
    transposition_deadline: "", transpositions: [],
    notes: [
      note("status", "The data half (GDPR, ePrivacy, NIS2, DORA) is still in negotiation and contains proposed refinements to GDPR Article 22."),
      note("expected_conclusion", "It is not expected to conclude before late 2026 at the earliest.", "", "approximate"),
    ],
    related: ["eu-gdpr"], source_basis: "primary_with_secondary",
  },

  // Appendix item 8, claim 8a (Article 15(1)(h) and the Article 22(3) rights),
  // and item 7, claim 7c (the EU and UK divergence).
  {
    key: "eu-gdpr",
    jurisdiction_code: "EU", instrument_type: "regulation",
    citation: "General Data Protection Regulation, Articles 15(1)(h) and 22",
    title: "GDPR meaningful information about the logic involved and automated decision rights",
    status: "enacted", obligation_type: "automated_decision_rights", preemption_risk: "not_applicable",
    scope: scope(["data_subjects"], ["solely_automated_decision"], ["automated_decision_system"], "secondary_consistent"),
    obligations: [
      ob("explanation_and_human_intervention", "controller", ["solely_automated_decision"], "", "in_application", "verified_primary",
        "Meaningful information about the logic involved under Article 15(1)(h) must describe \"the procedure and "
        + "principles actually applied\", so that the data subject can understand which personal data were used and "
        + "how, and can meaningfully exercise the Article 22(3) rights to obtain human intervention, express a point "
        + "of view and contest the decision."),
    ],
    status_history: [],
    transposition_deadline: "", transpositions: [],
    notes: [
      note("divergence", "EU Article 22 is still a prohibition with exceptions, while UK Article 22 is now a right of challenge with safeguards."),
      note("volatility", "The data half of the Digital Omnibus contains proposed refinements to GDPR Article 22."),
    ],
    related: [], source_basis: "primary_with_secondary",
  },

  // Appendix item 8, claim 8a (the judgment, by case number, without party names).
  {
    key: "eu-c-203-22",
    jurisdiction_code: "EU", instrument_type: "judgment",
    citation: "Case C-203/22, judgment of 2025-02-27",
    title: "Court of Justice judgment on meaningful information about the logic involved",
    status: "decided", obligation_type: "automated_decision_rights", preemption_risk: "not_applicable",
    scope: scope(["data_subjects"], ["solely_automated_decision"], ["automated_decision_system"], "secondary_consistent"),
    obligations: [],
    status_history: [
      ev("decided", "2025-02-27", "judgment of the Court of Justice of the European Union"),
    ],
    transposition_deadline: "", transpositions: [],
    notes: [
      note("holding", "Meaningful information about the logic involved under Article 15(1)(h) must describe \"the procedure and principles actually applied\", in such a way that the data subject can understand which of their personal data were used, and how, in the automated decision."),
      note("trade_secrets", "Where disclosure would undermine trade secrets, the controller must nonetheless disclose to the competent supervisory authority or court, which balances the competing interests."),
    ],
    related: ["eu-gdpr"], source_basis: "primary_with_secondary",
  },

  // Appendix item 1, claim 1.7 (draft Article 6 guidelines, the material
  // influence test, final expected by end of 2026).
  {
    key: "eu-article-6-guidelines",
    jurisdiction_code: "EU", instrument_type: "draft_guidance",
    citation: "Draft Commission guidelines on the classification of high-risk AI systems under Article 6",
    title: "Draft Commission guidelines on high-risk classification",
    status: "draft", obligation_type: "ai_system_governance", preemption_risk: "not_applicable",
    scope: scope(["applicants", "workers"],
      ["recruitment_selection", "task_allocation", "performance_evaluation", "pay_determination"],
      ["any_ai_system"], "secondary_consistent"),
    obligations: [],
    status_history: [
      ev("published", "2026-05-19", "draft guidelines published by the European Commission in three documents"),
      ev("consultation_closed", "2026-07-23", "consultation closed after an extension"),
    ],
    transposition_deadline: "", transpositions: [],
    notes: [
      note("material_influence", "The employment sections address Annex III 4(a) and 4(b) and apply a material influence test: an AI system may still be high-risk where a human recruiter or manager remains formally responsible for the final decision, if the system's output heavily influences which candidates advance."),
      note("in_scope_examples", "In-scope examples include targeted job ads, CV screening, candidate ranking, performance evaluation, work allocation and pay determination; general employer branding tools are out of scope."),
      note("final_expected", "Final guidelines are expected by end of 2026.", "", "approximate"),
    ],
    related: ["eu-ai-act"], source_basis: "primary_with_secondary",
  },

  // Appendix item 9, claims 9a (deadline, not extended, reaffirmed 2025-12-18),
  // 9b (the census of 2026-06-18) and 9c (Articles 5, 6, 7, 9 and 10).
  {
    key: "eu-pay-transparency",
    jurisdiction_code: "EU", instrument_type: "directive",
    citation: "Directive (EU) 2023/970 (pay transparency)",
    title: "EU Pay Transparency Directive",
    status: "enacted", obligation_type: "pay_transparency", preemption_risk: "not_applicable",
    scope: scope(["applicants", "workers"], ["recruitment_selection", "pay_determination"], [], "secondary_consistent"),
    obligations: [
      ob("pay_range_disclosure", "employer", ["recruitment_selection", "pay_determination"], "", "awaiting_transposition", "verified_primary",
        "Article 5 requires applicants to be given the initial pay or pay range based on objective, gender-neutral criteria, and prohibits asking about pay history."),
      ob("pay_criteria_access", "employer", ["pay_determination"], "", "awaiting_transposition", "verified_primary",
        "Article 6 requires employers to make accessible the criteria used to determine pay, pay levels and pay progression, which must be objective and gender neutral, with a possible member state exemption from the progression element for employers under 50 workers."),
      ob("pay_information_on_request", "employer", ["pay_determination"], "", "awaiting_transposition", "verified_primary",
        "Article 7 gives workers the right to request their individual pay level and average pay levels broken down by sex for categories of workers performing the same work or work of equal value, answerable within two months."),
      ob("pay_gap_reporting", "employer", ["pay_determination"], "2027-06-07", "awaiting_transposition", "verified_primary",
        "Article 9 gender pay gap reporting for employers with 150 or more workers: 250 or more workers report by the applies_from date and annually thereafter; 150 to 249 workers report by the same date and every three years."),
      ob("pay_gap_reporting", "employer", ["pay_determination"], "2031-06-07", "awaiting_transposition", "verified_primary",
        "Article 9 gender pay gap reporting for employers with 100 to 149 workers, by the applies_from date and every three years."),
      ob("joint_pay_assessment", "employer", ["pay_determination"], "", "awaiting_transposition", "verified_primary",
        "Article 10 triggers a joint pay assessment where reporting shows at least a 5 percent difference in average pay in any category of workers, the employer has not justified it on objective gender-neutral criteria, and it has not been remedied within six months of the report."),
    ],
    status_history: [
      ev("adopted", "2023-05-10", "Directive of 10 May 2023"),
      ev("deadline_reaffirmed", "2025-12-18", "the European Commission, in a written answer to a Parliamentary question, reaffirmed that it expects all Member States to implement the directive by the June 2026 deadline"),
    ],
    transposition_deadline: "2026-06-07",
    transpositions: transpositionRows(),
    notes: [
      note("deadline", "The transposition deadline was not extended."),
      note("consequences", "Consequences for non-transposing states are Commission infringement proceedings under TFEU Articles 258 to 260 and potential damages claims by workers."),
      note("moving_figure", "The member state statuses were current to 2026-06-18 and are a moving figure to be re-checked.", "2026-06-18"),
    ],
    related: [], source_basis: "primary_with_secondary",
  },

  // Appendix item 7, claims 7a (SI 2026/82, the two tranches), 7b (section 103,
  // commencement date not confirmed) and 7c (the right of challenge).
  {
    key: "gb-duaa",
    jurisdiction_code: "GB", instrument_type: "statute",
    citation: "Data (Use and Access) Act 2025, commenced by SI 2026/82",
    title: "UK Data (Use and Access) Act 2025",
    status: "enacted", obligation_type: "automated_decision_rights", preemption_risk: "not_applicable",
    scope: scope(["data_subjects"], ["solely_automated_decision"], ["automated_decision_system"], "secondary_consistent"),
    obligations: [
      ob("subject_access", "controller", [], "2026-02-05", "in_application", "verified_secondary",
        "The main Part 5 data protection changes, including the reasonable and proportionate search standard for subject access, commenced in the first tranche under regulation 2 of SI 2026/82."),
      ob("automated_decision_safeguards", "controller", ["solely_automated_decision"], "2026-06-19", "in_application", "verified_secondary",
        "The automated decision-making provisions, section 80 and Schedule 6, restructure UK GDPR Article 22 from a prohibition with exceptions into a right of challenge with safeguards, and commenced in the second tranche under regulation 3, with a saving provision at regulation 5."),
      ob("complaints_handling", "controller", [], "", "in_application", "not_retrieved",
        "The complaints-to-controller duty in section 103 and Schedule 10 commenced under SI 2026/82 with a transitional provision at regulation 7; its commencement date was not confirmed.",
        { confidence: "unconfirmed" }),
    ],
    status_history: [
      ev("entered_into_force", "2026-02-05", "first tranche commenced by regulation 2 of SI 2026/82"),
      ev("entered_into_force", "2026-06-19", "second tranche commenced by regulation 3 of SI 2026/82"),
    ],
    transposition_deadline: "", transpositions: [],
    notes: [
      note("legitimate_interest", "Recognised legitimate interest cannot be used as a basis for automated decision-making processing, and special category data in automated decision-making generally requires explicit consent or a substantial public interest basis."),
      note("allocation", "Only the instrument's contents page was machine-readable, so the section-by-section allocation between regulations 2 and 3 rests on secondary reporting."),
    ],
    related: [], source_basis: "primary_with_secondary",
  },

  // Appendix item 7, claim 7d (SI 2026/425: made, laid, in force; the duty on
  // the Commissioner; no publication deadline; the code not published).
  {
    key: "gb-ico-code-si",
    jurisdiction_code: "GB", instrument_type: "statutory_instrument",
    citation: "SI 2026/425, Data Protection Act 2018 (Code of Practice on Artificial Intelligence and Automated Decision-Making) Regulations 2026",
    title: "Regulations requiring an ICO code of practice on AI and automated decision-making",
    status: "enacted", obligation_type: "automated_decision_rights", preemption_risk: "not_applicable",
    scope: scope(["data_subjects"], [], ["any_ai_system", "automated_decision_system"], "secondary_consistent"),
    obligations: [],
    status_history: [
      ev("made", "2026-04-16", "regulations made"),
      ev("laid", "2026-04-21", "laid before Parliament"),
      ev("entered_into_force", "2026-05-12", "regulations in force"),
    ],
    transposition_deadline: "", transpositions: [],
    notes: [
      note("duty", "The regulations require the Commissioner to prepare a code giving guidance on good practice in processing personal data in developing and using AI and automated decision-making, including guidance on children's personal data.", "2026-05-12"),
      note("deadline", "The regulations set no deadline for publishing the code."),
      note("publication", "The code has not been published; some sources report it as expected in 2027.", "", "approximate"),
    ],
    related: [], source_basis: "primary_with_secondary",
  },

  // Appendix item 7, claims 7d (the consultation dates, final guidance Winter
  // 2026) and 7e ("active rather than tokenistic", the recruitment findings).
  {
    key: "gb-ico-adm-guidance",
    jurisdiction_code: "GB", instrument_type: "draft_guidance",
    citation: "Information Commissioner's draft guidance on automated decision-making including profiling",
    title: "ICO draft guidance on automated decision-making including profiling",
    status: "draft", obligation_type: "automated_decision_rights", preemption_risk: "not_applicable",
    scope: scope(["applicants", "data_subjects"], ["recruitment_selection", "solely_automated_decision"], ["automated_decision_system"], "secondary_consistent"),
    obligations: [],
    status_history: [
      ev("consultation_opened", "2026-03-31", "consultation on draft updated guidance opened"),
      ev("consultation_closed", "2026-05-29", "consultation closed"),
    ],
    transposition_deadline: "", transpositions: [],
    notes: [
      note("final_expected", "Final guidance is due Winter 2026.", "", "approximate"),
      note("human_involvement", "Human involvement must be \"active rather than tokenistic\"; designing or building an automated system is not meaningful human involvement, because it happens before real-world decisions are made."),
      note("reviewers", "Reviewers must be trained and qualified to understand the system's logic, outputs, limitations and risks."),
      note("recruitment", "The ICO's recruitment work found that many employers mischaracterise their tools as decision-support when the evidence shows the tools produce binding decisions without meaningful human review."),
    ],
    related: [], source_basis: "primary_with_secondary",
  },

  // Appendix item 10, claim 10a (the guidance removed in early 2025 after
  // Executive Order 14179; nothing replaced it).
  {
    key: "us-eeoc-guidance",
    jurisdiction_code: "US", instrument_type: "agency_guidance",
    citation: "EEOC technical assistance on AI in selection procedures (2023) and ADA guidance (2024)",
    title: "EEOC technical assistance and ADA guidance on automated employment decision tools",
    status: "withdrawn", obligation_type: "anti_discrimination", preemption_risk: "not_applicable",
    scope: scope(["applicants", "employees"], ["recruitment_selection"], ["automated_employment_decision_tool"], "secondary_consistent"),
    obligations: [],
    status_history: [
      ev("issued", "", "Title VII technical assistance issued", { confidence: "approximate", date_text: "2023" }),
      ev("issued", "", "ADA guidance issued", { confidence: "approximate", date_text: "2024" }),
      ev("withdrawn", "", "removed from the agency's website after Executive Order 14179", { confidence: "approximate", date_text: "early 2025" }),
    ],
    transposition_deadline: "", transpositions: [],
    notes: [
      note("executive_order", "Executive Order 14179 of 2025-01-23, Removing Barriers to American Leadership in Artificial Intelligence, revoked EO 14110 and directed agencies to review and suspend policies made under it.", "2025-01-23"),
      note("replacement", "Nothing has replaced the rescinded guidance."),
    ],
    related: [], source_basis: "secondary_consistent",
  },

  // Appendix item 10, claims 10a (Executive Order 14281) and 10b (the statutes,
  // the four-fifths rule, the Strategic Enforcement Plan unconfirmed).
  {
    key: "us-federal-statutes",
    jurisdiction_code: "US", instrument_type: "statute_group",
    citation: "Title VII, the ADA and the ADEA; the Uniform Guidelines on Employee Selection Procedures (four-fifths rule)",
    title: "Federal anti-discrimination statutes applied to selection procedures",
    status: "enacted", obligation_type: "anti_discrimination", preemption_risk: "not_applicable",
    scope: scope(["applicants", "employees"], ["recruitment_selection"], ["any_selection_procedure"], "secondary_consistent"),
    obligations: [
      ob("non_discrimination", "employer", ["recruitment_selection"], "", "in_application", "verified_secondary",
        "Title VII, the ADA and the ADEA still apply to selection procedures, and the four-fifths rule in the Uniform Guidelines on Employee Selection Procedures remains the practical adverse-impact yardstick."),
    ],
    status_history: [],
    transposition_deadline: "", transpositions: [],
    notes: [
      note("executive_order", "Executive Order 14281 of 2025-04-23 directs federal agencies to deprioritise disparate-impact enforcement.", "2025-04-23"),
      note("enforcement_plan", "Secondary sources report that the Strategic Enforcement Plan for FY 2024 to 2028 lists technology-related employment discrimination as an enforcement priority; the agency's page was not fetched directly.", "", "unconfirmed"),
    ],
    related: [], source_basis: "secondary_consistent",
  },

  // Appendix item 10, claim 10c (the order of 2025-12-11, the task force
  // operative 2026-01-10, the three carve-outs).
  {
    key: "us-executive-order",
    jurisdiction_code: "US", instrument_type: "executive_order",
    citation: "Executive order of 2025-12-11, Ensuring a National Policy Framework for Artificial Intelligence",
    title: "Executive order on a national policy framework for artificial intelligence",
    status: "enacted", obligation_type: "preemption", preemption_risk: "not_applicable",
    scope: scope([], [], ["any_ai_system"], "secondary_consistent"),
    obligations: [],
    status_history: [
      ev("issued", "2025-12-11", "executive order issued"),
    ],
    transposition_deadline: "", transpositions: [],
    notes: [
      note("task_force", "The order establishes an AI Litigation Task Force within the Department of Justice to challenge state AI laws in federal court on dormant commerce clause, preemption or other grounds.", "2026-01-10"),
      note("carve_outs", "The order carves out state laws on child safety, AI compute and data centre infrastructure, and state government procurement and use of AI."),
      note("colorado", "The Department of Justice intervened in support of the challenge to the Colorado predecessor act, which was then enjoined by stipulated order and repealed and replaced.", "2026-04-27"),
    ],
    related: [], source_basis: "primary_with_secondary",
  },

  // Appendix item 10, claim 10d (no preemption statute enacted, the framework
  // of 2026-03-20, the draft of June 2026).
  {
    key: "us-draft-preemption",
    jurisdiction_code: "US", instrument_type: "draft_bill",
    citation: "Draft Great American Artificial Intelligence Act of 2026 (three-year preemption)",
    title: "Draft federal bill preempting state AI regulation for three years",
    status: "draft", obligation_type: "preemption", preemption_risk: "not_applicable",
    scope: scope([], [], ["any_ai_system"], "secondary_consistent"),
    obligations: [],
    status_history: [
      ev("draft_released", "", "draft released by two Representatives", { confidence: "approximate", date_text: "June 2026" }),
    ],
    transposition_deadline: "", transpositions: [],
    notes: [
      note("framework", "The White House released a non-binding National Policy Framework for AI urging Congress to preempt.", "2026-03-20"),
      note("no_statute", "No federal statute preempting state AI laws has been enacted, and state AI laws remain operative unless and until Congress legislates."),
      note("failed_attempts", "The 10-year moratorium in the One Big Beautiful Bill Act was stripped before passage on a 99 to 1 Senate vote, and a similar NDAA attempt failed."),
    ],
    related: [], source_basis: "secondary_consistent",
  },

  // Appendix item 5, claim 5a (the CRD regulations, effective 2025-10-01,
  // finalised 2025-06-27, four-year retention, anti-bias testing as evidence).
  {
    key: "us-ca-crd",
    jurisdiction_code: "US-CA", instrument_type: "agency_regulation",
    citation: "Civil Rights Council FEHA regulations on automated-decision systems, 2 CCR section 11008.1 and related sections",
    title: "California FEHA employment regulations on automated-decision systems",
    status: "enacted", obligation_type: "anti_discrimination", preemption_risk: "watched",
    scope: scope(["applicants", "employees"], EMPLOYMENT_STAGES, ["automated_decision_system"], "secondary_consistent"),
    obligations: [
      ob("non_discrimination", "employer", EMPLOYMENT_STAGES, "2025-10-01", "in_application", "verified_secondary",
        "For employers with five or more employees, use of an automated-decision system resulting in discrimination on a FEHA protected basis is unlawful; assessments that elicit disability information are treated as potentially unlawful medical inquiries, and liability extends to agents."),
      ob("record_retention", "employer", EMPLOYMENT_STAGES, "2025-10-01", "in_application", "verified_secondary",
        "Records related to automated-decision systems, including selection criteria, relevant outputs and audit findings, must be preserved for four years."),
    ],
    status_history: [
      ev("finalised", "2025-06-27", "regulations finalised"),
      ev("entered_into_force", "2025-10-01", "regulations took effect"),
    ],
    transposition_deadline: "", transpositions: [],
    notes: [
      note("anti_bias_testing", "Anti-bias testing is not mandated, but its presence is available as evidence in defence and its absence is available as evidence against the employer."),
      note("section_numbers", "The primary text could not be parsed, so section numbers beyond 11008.1 rest on consistent secondary reporting."),
    ],
    related: [], source_basis: "primary_with_secondary",
  },

  // Appendix item 5, claim 5b (SB 7 vetoed 2025-10-13, SB 947 introduced
  // 2026-02-02, passed the Assembly) and implementation plan 8.1 (the 2026-09-01
  // re-check: concurrence and enrollment on 2026-08-31, the Governor acts by the
  // end of September 2026).
  {
    key: "us-ca-sb-947",
    jurisdiction_code: "US-CA", instrument_type: "bill",
    citation: "SB 947 (2025-2026 session), successor to the vetoed SB 7",
    title: "California SB 947, successor to the No Robo Bosses Act",
    status: "awaiting_signature", obligation_type: "automated_decision_notice", preemption_risk: "watched",
    scope: scope(["employees"], ["termination_discipline"], ["automated_decision_system"], "secondary_consistent"),
    obligations: [],
    status_history: [
      ev("vetoed", "2025-10-13", "SB 7, the No Robo Bosses Act, was vetoed"),
      ev("introduced", "2026-02-02", "SB 947 introduced as a successor"),
      ev("passed_chamber", "", "read a third time and passed in the Assembly, and returned to the Senate"),
      ev("amendments_concurred", "2026-08-31", "Assembly amendments concurred in (Ayes 28, Noes 10)"),
      ev("ordered_to_enrollment", "2026-08-31", "ordered to engrossing and enrolling"),
    ],
    transposition_deadline: "", transpositions: [],
    notes: [
      note("scope", "SB 947 was narrowed to post-use notice with more clearly defined prohibited scenarios, and its core is restricting reliance on automated systems for discipline and termination."),
      note("not_law", "SB 947 is not law, and SB 7 was vetoed and is not carried as law."),
      note("governor_action", "The Governor must act by the end of September 2026.", "", "approximate"),
    ],
    related: [], source_basis: "verified_primary",
  },

  // Appendix item 5, claim 5c (ADMT regulations finalised in 2025, significant
  // decisions including employment from 2027-01-01, first submission by
  // 2028-04-01, the intermediate phase-in unconfirmed).
  {
    key: "us-ca-cppa",
    jurisdiction_code: "US-CA", instrument_type: "agency_regulation",
    citation: "CPPA regulations on automated decisionmaking technology under the CCPA",
    title: "California CCPA regulations on automated decisionmaking technology",
    status: "enacted", obligation_type: "notice_and_human_review", preemption_risk: "watched",
    scope: scope(["consumers"], EMPLOYMENT_STAGES, ["automated_decision_system"], "secondary_consistent"),
    obligations: [
      ob("notice", "business", EMPLOYMENT_STAGES, "2027-01-01", "scheduled", "verified_secondary",
        "Businesses using automated decisionmaking technology to make significant decisions, a category that expressly includes employment, must give pre-use notice."),
      ob("access_to_information", "business", EMPLOYMENT_STAGES, "2027-01-01", "scheduled", "verified_secondary",
        "The regime gives an access right to information about the automated decisionmaking technology."),
      ob("human_appeal", "business", EMPLOYMENT_STAGES, "2027-01-01", "scheduled", "verified_secondary",
        "The regime gives an opt-out right, except that no opt-out is required where the business provides a method to appeal the decision to a human reviewer with authority to overturn it."),
      ob("risk_assessment_submission", "business", [], "2028-04-01", "scheduled", "verified_secondary",
        "Risk assessment obligations attach to covered activities, with first documentation submission to the agency by the applies_from date."),
    ],
    status_history: [
      ev("finalised", "", "regulations finalised", { confidence: "approximate", date_text: "2025" }),
      ev("published", "2025-09-23", "agency announcement of the final regulations"),
    ],
    transposition_deadline: "", transpositions: [],
    notes: [
      note("phase_in", "Sources differ on the intermediate risk-assessment phase-in, and that date is to be verified against the regulation text.", "", "unconfirmed"),
    ],
    related: [], source_basis: "primary_with_secondary",
  },

  // Appendix item 2, claims 2a (SB 24-205 never took effect, enjoined
  // 2026-04-27), 2b (SB 26-189 signed 2026-05-14, obligations from 2027-01-01)
  // and 2c (the notice and disclosure regime, 60-day cure), with the flagged
  // signature-date discrepancy. No decision categories are named (U-C8-12).
  {
    key: "us-co-sb-26-189",
    jurisdiction_code: "US-CO", instrument_type: "statute",
    citation: "SB 26-189, Automated Decision-Making Technology, repealing and reenacting SB 24-205",
    title: "Colorado Automated Decision-Making Technology act",
    status: "enacted", obligation_type: "notice_and_human_review", preemption_risk: "litigated",
    scope: scope(["consumers"], [], ["automated_decision_system"], "not_retrieved"),
    obligations: [
      ob("notice", "deployer", [], "2027-01-01", "scheduled", "verified_secondary",
        "Clear and conspicuous pre-use notice reasonably proximate to the consumer interaction."),
      ob("adverse_outcome_disclosure", "deployer", [], "2027-01-01", "scheduled", "verified_secondary",
        "A plain-language post-adverse-outcome disclosure within 30 days."),
      ob("human_review", "deployer", [], "2027-01-01", "scheduled", "verified_secondary",
        "On request after an adverse outcome, an opportunity for meaningful human review and reconsideration to the extent commercially reasonable."),
      ob("record_retention", "deployer", [], "2027-01-01", "scheduled", "verified_secondary",
        "Record retention of 3 years for developers and deployers."),
    ],
    status_history: [
      ev("passed", "", "SB 24-205 passed"),
      ev("delayed", "", "SB 24-205 delayed"),
      ev("enjoined", "2026-04-27", "a stipulated federal court order blocked enforcement of SB 24-205 in litigation challenging the act, with the federal Department of Justice intervening"),
      ev("repealed", "2026-05-14", "SB 26-189 repealed the SB 24-205 framework"),
      ev("replaced", "2026-05-14", "SB 26-189 reenacted the framework as a notice and disclosure regime"),
    ],
    transposition_deadline: "", transpositions: [],
    notes: [
      note("never_operative", "SB 24-205 never took effect."),
      note("eliminated", "SB 26-189 eliminates the SB 24-205 duty of reasonable care, risk management programme, impact assessments and Attorney General incident notification."),
      note("enforcement", "Enforcement is by the Attorney General as a deceptive trade practice with a 60-day cure period."),
      note("rulemaking", "Attorney General rulemaking on post-adverse-outcome disclosures and consumer rights is due by 2027-01-01.", "2027-01-01"),
      note("signature_date", "The legislature page records the signature on 2026-05-14 and one secondary source gives a different date; the legislature page is carried, and its Effective Date field is the act's own effective date, not the date obligations apply.", "2026-05-14"),
    ],
    related: [], source_basis: "primary_with_secondary",
  },

  // Appendix item 4, claim 4a (820 ILCS 42: sections 1 to 15 under P.A. 101-260
  // from 2020-01-01; section 20 under P.A. 102-47 from 2022-01-01).
  {
    key: "us-il-aivia",
    jurisdiction_code: "US-IL", instrument_type: "statute",
    citation: "820 ILCS 42, Artificial Intelligence Video Interview Act",
    title: "Illinois Artificial Intelligence Video Interview Act",
    status: "enacted", obligation_type: "consent", preemption_risk: "watched",
    scope: scope(["applicants"], ["recruitment_selection"], ["video_interview_analysis"], "secondary_consistent"),
    obligations: [
      ob("consent", "employer", ["recruitment_selection"], "2020-01-01", "in_application", "not_retrieved",
        "The consent provisions for AI analysis of video interviews sit in sections 1, 5, 10 and 15, which carry P.A. 101-260; their text is not recorded here."),
      ob("demographic_reporting", "employer", ["recruitment_selection"], "2022-01-01", "in_application", "verified_primary",
        "Section 20 requires demographic reporting of race and ethnicity for applicants denied an in-person interview after AI analysis and for those hired, with the Department of Commerce and Economic Opportunity analysing for racial bias; it carries P.A. 102-47."),
    ],
    status_history: [
      ev("entered_into_force", "2020-01-01", "sections 1, 5, 10 and 15 effective under P.A. 101-260"),
      ev("entered_into_force", "2022-01-01", "section 20 effective under P.A. 102-47"),
    ],
    transposition_deadline: "", transpositions: [],
    notes: [
      note("in_force", "The act remains in force and is scoped to AI analysis of video interviews."),
    ],
    related: [], source_basis: "verified_primary",
  },

  // Appendix item 4, claims 4b (HB 3773 signed 2024-08-09, effective 2026-01-01,
  // the covered decisions, zip code proxy, notice) and 4c (the rules unsettled:
  // draft 2026-02-26, proposed 2026-05-15, hearing cancelled, withdrawal date
  // unconfirmed).
  {
    key: "us-il-hb-3773",
    jurisdiction_code: "US-IL", instrument_type: "statute",
    citation: "HB 3773, amending the Illinois Human Rights Act",
    title: "Illinois Human Rights Act amendment on AI in employment",
    status: "enacted", obligation_type: "anti_discrimination", preemption_risk: "watched",
    scope: scope(["applicants", "employees"],
      ["recruitment_selection", "promotion", "termination_discipline", "terms_and_conditions", "training_selection"],
      ["any_ai_system"], "secondary_consistent"),
    obligations: [
      ob("non_discrimination", "employer",
        ["recruitment_selection", "promotion", "termination_discipline", "terms_and_conditions", "training_selection"],
        "2026-01-01", "in_application", "verified_secondary",
        "Use of AI that has the effect of discriminating on the basis of a protected class in recruitment, hiring, promotion, renewal, selection for training or apprenticeship, discharge, discipline, tenure, or terms and conditions of employment is prohibited, and use of zip code as a proxy for a protected class is banned."),
      ob("notice", "employer",
        ["recruitment_selection", "promotion", "termination_discipline", "terms_and_conditions", "training_selection"],
        "2026-01-01", "in_application", "verified_secondary",
        "Notice is required to applicants and employees when AI is used in covered decisions; the implementing rules are unsettled, so the contours of a compliant notice remain unclear.",
        { implementation_status: "rules_pending" }),
    ],
    status_history: [
      ev("signed", "2024-08-09", "HB 3773 signed"),
      ev("entered_into_force", "2026-01-01", "HB 3773 took effect"),
      ev("draft_released", "2026-02-26", "the Illinois Department of Human Rights released draft rules"),
      ev("rules_proposed", "2026-05-15", "proposed amendments to 44 Ill. Adm. Code Part 2520 published, comments due 2026-06-29"),
      ev("hearing_cancelled", "", "the public hearing set for 2026-06-10 was cancelled"),
      ev("rules_withdrawn", "", "the proposed rules were temporarily withdrawn in 2026; the exact withdrawal date was not retrieved", { confidence: "unconfirmed" }),
    ],
    transposition_deadline: "", transpositions: [],
    notes: [
      note("statute_binds", "The statutory obligations remain in force regardless of the rules."),
      note("draft_notice", "The draft rules had contemplated notice to current employees annually and within 30 days of adopting a new or substantially updated AI system, and to prospective employees via the job posting."),
    ],
    related: [], source_basis: "secondary_consistent",
  },

  // Appendix item 6 (section 3-717: HB 1202 of 2020, Chapter 446, became law
  // 2020-05-11 without the Governor's signature, effective 2020-10-01; no 2026
  // amendment). The two rejected Maryland claims are never carried.
  {
    key: "us-md-3-717",
    jurisdiction_code: "US-MD", instrument_type: "statute",
    citation: "Md. Code Ann., Lab. and Empl. section 3-717",
    title: "Maryland facial recognition in employment interviews",
    status: "enacted", obligation_type: "consent", preemption_risk: "watched",
    scope: scope(["applicants"], ["recruitment_selection"], ["facial_recognition"], "secondary_consistent"),
    obligations: [
      ob("consent", "employer", ["recruitment_selection"], "2020-10-01", "in_application", "verified_primary",
        "An employer may not use a facial recognition service to create a facial template during an applicant's employment interview unless the applicant consents by signing a waiver stating the applicant's name, the interview date, that the applicant consents to the use of facial recognition during the interview, and that the applicant has read the waiver."),
    ],
    status_history: [
      ev("became_law", "2020-05-11", "enacted by HB 1202 (2020, Chapter 446) and became law without the Governor's signature"),
      ev("entered_into_force", "2020-10-01", "section 3-717 took effect"),
    ],
    transposition_deadline: "", transpositions: [],
    notes: [
      note("unchanged", "No 2026 amendment was found, and the state's official AI legislation page shows no employment or hiring AI law among Maryland's enacted AI laws for 2024, 2025 and 2026."),
    ],
    related: [], source_basis: "verified_primary",
  },

  // Appendix item 3, claim 3d (S8706B / A9581B passed the Senate 2026-06-04,
  // substituted by the Assembly version, not delivered to the Governor; the
  // penalty figure dropped, the 90-day cure kept).
  {
    key: "us-ny-s8706b",
    jurisdiction_code: "US-NY", instrument_type: "bill",
    citation: "S8706B / A9581B, AI Labor Information Act (2025-2026 session)",
    title: "New York AI Labor Information Act",
    status: "passed_legislature", obligation_type: "ai_labor_impact_reporting", preemption_risk: "watched",
    scope: scope([], [], ["any_ai_system"], "secondary_consistent"),
    obligations: [],
    status_history: [
      ev("passed_chamber", "2026-06-04", "passed the Senate 38 to 22 and was substituted by the Assembly version"),
    ],
    transposition_deadline: "", transpositions: [],
    notes: [
      note("reporting", "Covered businesses, with 50 or more employees or publicly traded, would file an annual report on AI's impact on hiring, displacement, hours and positions not filled, plus AI usage information including human oversight mechanisms."),
      note("penalties", "The bill carries per-day penalties and a 90-day cure period; no penalty figure is carried."),
      note("governor", "As of the record checked it had not been delivered to or signed by the Governor."),
      note("no_state_audit_law", "New York State has not enacted a statewide automated employment decision tool bias-audit law."),
    ],
    related: [], source_basis: "verified_primary",
  },

  // Appendix item 3, claims 3a (in force, no amendment found, the DCWP page not
  // read), 3b (Comptroller Report 2024-N-6 of 2025-12-02) and 3c (penalties
  // UNCONFIRMED, described qualitatively). The scope text was not retrieved
  // (U-C8-5), so the obligations carry no decision stage and no date.
  {
    key: "us-nyc-ll-144",
    jurisdiction_code: "US-NY-NYC", instrument_type: "local_law",
    citation: "Local Law 144, automated employment decision tools",
    title: "New York City Local Law 144 on automated employment decision tools",
    status: "enacted", obligation_type: "bias_audit_and_notice", preemption_risk: "watched",
    scope: scope([], [], ["automated_employment_decision_tool"], "not_retrieved"),
    obligations: [
      ob("bias_audit", "employer", [], "", "in_application", "not_retrieved",
        "A bias audit duty under the law, whose text the refresh did not retrieve."),
      ob("notice", "employer", [], "", "in_application", "not_retrieved",
        "A notice duty under the law, whose text the refresh did not retrieve."),
    ],
    status_history: [],
    transposition_deadline: "", transpositions: [],
    notes: [
      note("in_force", "The law remains in force, and no amendment to the law or to the DCWP rules was found in 2026; the official DCWP page could not be read and is to be re-checked before publishing."),
      note("comptroller_audit", "The New York State Comptroller's audit of DCWP enforcement, Report 2024-N-6, covering July 2023 through June 2025, found the complaint process ineffective: DCWP's review of 32 company websites identified 1 compliance issue, while the Comptroller's review of the same 32 found at least 17 instances of potential non-compliance.", "2025-12-02"),
      note("recommendations", "DCWP agreed to fully adopt 10 of 13 recommendations and partially adopt one.", "2025-12-02"),
      note("penalties", "Civil penalties are described per violation and per day; the figures rest on secondary sources only and are not carried.", "", "unconfirmed"),
    ],
    related: [], source_basis: "primary_with_secondary",
  },
];

// ----------------------------------------------------------------- screens

/** Names and tokens no byte may carry (data plan 2.2.7), matched case-insensitively. */
export const DENYLIST = [
  "WP251", "HB 1405", "advisory letter", "Mobley", "Workday", "xAI", "Dun and Bradstreet",
  "Magistrat", "Francovich",
  // the firms and publications the appendix cites
  "Simmons and Simmons", "Gibson Dunn", "DLA Piper", "Ogletree", "McDermott", "Seyfarth", "Hinshaw",
  "National Law Review", "Mayer Brown", "Jackson Lewis", "Liebert Cassidy", "Fisher Phillips", "Kilpatrick",
  "Littler", "Skadden", "White and Case", "Clifford Chance", "Womble", "Covington", "Debevoise",
  "Arnold and Porter", "Bird and Bird", "Stibbe", "Cooley", "K and L Gates", "Holland and Knight", "Sidley",
  "WilmerHale", "Ropes and Gray", "Morgan Lewis", "DCI Consulting", "L and E Global", "Roll Call", "Nextgov",
  "Tech Policy Press",
  // the persons the appendix names
  "Polis", "Newsom", "McNerney", "Hinchey", "Obernolte", "Trahan",
];

const EN_DASH = String.fromCharCode(0x2013);
const EM_DASH = String.fromCharCode(0x2014);

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const DENY_PATTERNS = DENYLIST.map((term) => [term, new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(term)}($|[^A-Za-z0-9])`, "i")]);

/** Every forbidden token a text carries. */
export function forbiddenTokens(text) {
  const hits = DENY_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([term]) => term);
  if (/https?:\/\/|www\./i.test(text)) hits.push("URL");
  if (text.includes("$") || text.includes("%") || /\bdollars?\b/i.test(text)) hits.push("money");
  if (text.includes(EN_DASH) || text.includes(EM_DASH)) hits.push("dash");
  return hits;
}

// ----------------------------------------------------------------- plants

const tokensOf = (record, onlyInApplication) => new Set(record.obligations
  .filter((o) => !onlyInApplication || inApplication(o, AS_OF))
  .flatMap((o) => o.decision_stages));

const exactDates = (record) => [...new Set(record.obligations
  .filter((o) => o.applies_from_confidence === "exact").map((o) => o.applies_from))];

function overlappingJurisdictions(records, onlyInApplication) {
  const out = [];
  for (const code of [...new Set(records.map((r) => r.jurisdiction_code))]) {
    const rows = records.filter((r) => r.jurisdiction_code === code).map((r) => tokensOf(r, onlyInApplication));
    const hit = rows.some((a, i) => rows.some((b, j) => j > i && [...a].some((t) => b.has(t))));
    if (hit) out.push(code);
  }
  return out;
}

/**
 * Every plant rule of data plan 2.2.6 and its qualifier-dropped reading, over a
 * record list, as counts. Exported so the test can check its own recomputation
 * against the builder's.
 */
export function plantCounts(records) {
  const enacted = records.filter((r) => r.status === "enacted");
  const enforceableRows = records.filter((r) => r.enforceable);
  const soleNarrow = (r, requireSole) => r.enforceable
    && r.scope.technologies.length === 1 && SPECIFIC_TECHNOLOGIES.includes(r.scope.technologies[0])
    && (!requireSole || enforceableRows.filter((x) => x.jurisdiction_code === r.jurisdiction_code).length === 1);
  const inWindow = records.flatMap((r) => r.obligations)
    .filter((o) => o.applies_from !== "" && o.applies_from >= ALERT_WINDOW[0] && o.applies_from <= ALERT_WINDOW[1]);
  return {
    hr21a: enacted.filter((r) => !r.enforceable && r.status_history.some((e) => e.event === "enjoined")).length,
    hr21a_without_history: enacted.filter((r) => !r.enforceable).length,
    hr21a_without_enforceable: enacted.length,
    hr21b: records.filter((r) => r.transpositions.length > 0).length,
    hr21b_directive_type: records.filter((r) => r.instrument_type === "directive").length,
    hr21b_not_full: records.flatMap((r) => r.transpositions).filter((t) => t.transposition_status !== "full").length,
    hr21c: records.filter((r) => exactDates(r).some((d) => d <= AS_OF) && exactDates(r).some((d) => d > AS_OF)).length,
    hr21c_two_fixed_dates: records.filter((r) => exactDates(r).length >= 2).length,
    hr21d_narrow: records.filter((r) => soleNarrow(r, true)).length,
    hr21d_narrow_without_sole: records.filter((r) => soleNarrow(r, false)).length,
    hr21d_overlap: overlappingJurisdictions(records, true).length,
    hr21d_overlap_without_in_application: overlappingJurisdictions(records, false).length,
    hr21e: records.filter((r) => r.status === "awaiting_signature").length,
    hr21e_widened: records.filter((r) => ["passed_legislature", "awaiting_signature"].includes(r.status)).length,
    enforceable: enforceableRows.length,
    obligations_in_alert_window: inWindow.length,
  };
}

/** The counts the builder holds the records to. */
export const EXPECTED_PLANT_COUNTS = {
  hr21a: 1, hr21a_without_history: 5, hr21a_without_enforceable: 14,
  hr21b: 1, hr21b_directive_type: 1, hr21b_not_full: 23,
  hr21c: 1, hr21c_two_fixed_dates: 5,
  hr21d_narrow: 1, hr21d_narrow_without_sole: 2,
  hr21d_overlap: 1, hr21d_overlap_without_in_application: 3,
  hr21e: 1, hr21e_widened: 2,
  enforceable: 9, obligations_in_alert_window: 0,
};

// ----------------------------------------------------------------- the build

const joinList = (values) => values.join("; ");

function buildGrammar(records) {
  return {
    grammar_id: GRAMMAR_ID,
    as_of: AS_OF,
    universe_now: UNIVERSE_NOW,
    stamp_statement: STAMP_STATEMENT,
    not_legal_advice_notice: NOT_LEGAL_ADVICE_NOTICE,
    record_count: records.length,
    jurisdiction_count: JURISDICTIONS.length,
    record_key_order: joinList(RECORD_KEYS),
    scope_key_order: joinList(SCOPE_KEYS),
    obligation_key_order: joinList(OBLIGATION_KEYS),
    history_key_order: joinList(HISTORY_KEYS),
    transposition_key_order: joinList(TRANSPOSITION_KEYS),
    note_key_order: joinList(NOTE_KEYS),
    status_vocabulary: joinList(STATUSES),
    enforceable_definition: ENFORCEABLE_DEFINITION,
    instrument_type_vocabulary: joinList(INSTRUMENT_TYPES),
    obligation_type_vocabulary: joinList(OBLIGATION_TYPES),
    duty_type_vocabulary: joinList(DUTY_TYPES),
    application_status_vocabulary: joinList(APPLICATION_STATUSES),
    implementation_status_vocabulary: "complete; rules_pending; empty when no implementing rules are awaited",
    decision_stage_vocabulary: joinList(DECISION_STAGES),
    technology_vocabulary: joinList(TECHNOLOGIES),
    subject_vocabulary: joinList(SUBJECTS),
    scope_text_status_vocabulary: joinList(SCOPE_TEXT_STATUSES),
    stage_mapping_rule: STAGE_MAPPING_RULE,
    history_event_vocabulary: joinList(HISTORY_EVENTS),
    date_confidence_vocabulary: joinList(DATE_CONFIDENCES),
    preemption_risk_vocabulary: joinList(PREEMPTION_RISKS),
    transposition_status_vocabulary: joinList(TRANSPOSITION_STATUSES),
    source_basis_vocabulary: joinList(SOURCE_BASES),
    jurisdiction_level_vocabulary: joinList(JURISDICTION_LEVELS),
    coverage_status_vocabulary: joinList(COVERAGE_STATUSES),
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

const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

function assertDated(where, date, confidence) {
  if (!DATE_CONFIDENCES.includes(confidence)) throw new Error(`${E}: ${where} carries date_confidence "${confidence}"`);
  if (date !== "" && !isIsoDate(date)) throw new Error(`${E}: ${where} carries date "${date}"`);
  if (confidence === "exact" && date === "") throw new Error(`${E}: ${where} is exact beside an empty date`);
  if (confidence !== "exact" && date !== "") throw new Error(`${E}: ${where} is ${confidence} beside a filled date`);
}

function assertKeys(where, object, keys) {
  if (Object.keys(object).join(",") !== keys.join(",")) throw new Error(`${E}: ${where} does not carry the documented keys in order`);
}

function assertTokens(where, values, vocabulary) {
  if (!Array.isArray(values)) throw new Error(`${E}: ${where} is not a list`);
  for (const value of values) if (!vocabulary.includes(value)) throw new Error(`${E}: ${where} carries "${value}"`);
  if (new Set(values).size !== values.length) throw new Error(`${E}: ${where} repeats a token`);
}

function assertIn(where, value, vocabulary) {
  if (!vocabulary.includes(value)) throw new Error(`${E}: ${where} carries "${value}"`);
}

function assertRecords(records) {
  const fail = (message) => { throw new Error(`${E}: ${message}`); };
  if (records.length !== EXPECTED_RECORD_COUNT) fail(`${records.length} records, expected ${EXPECTED_RECORD_COUNT}`);
  const codes = new Set(JURISDICTIONS.map((j) => j.code));
  const memberStates = new Map(JURISDICTIONS.filter((j) => j.parent_code === "EU").map((j) => [j.code, j.name]));
  const rowIds = new Set(records.map((r) => r.row_id));
  const used = { obligation_type: new Set(), duty_type: new Set(), history_event: new Set() };

  records.forEach((r, index) => {
    const where = r.row_id;
    if (r.row_id !== `${ROW_ID_PREFIX}${String(index + 1).padStart(2, "0")}`) fail(`${where} breaks the dense id order`);
    assertKeys(where, r, RECORD_KEYS);
    assertKeys(`${where} scope`, r.scope, SCOPE_KEYS);
    if (!codes.has(r.jurisdiction_code)) fail(`${where} names jurisdiction ${r.jurisdiction_code}, which is not in ${FILES.jurisdictions}`);
    assertIn(`${where} instrument_type`, r.instrument_type, INSTRUMENT_TYPES);
    assertIn(`${where} status`, r.status, STATUSES);
    assertIn(`${where} obligation_type`, r.obligation_type, OBLIGATION_TYPES);
    assertIn(`${where} preemption_risk`, r.preemption_risk, PREEMPTION_RISKS);
    assertIn(`${where} source_basis`, r.source_basis, SOURCE_BASES);
    used.obligation_type.add(r.obligation_type);
    const usState = r.jurisdiction_code.startsWith("US-");
    if ((r.preemption_risk === "not_applicable") === usState) fail(`${where} pairs ${r.jurisdiction_code} with preemption_risk ${r.preemption_risk}`);
    assertTokens(`${where} scope.subjects`, r.scope.subjects, SUBJECTS);
    assertTokens(`${where} scope.decision_stages`, r.scope.decision_stages, DECISION_STAGES);
    assertTokens(`${where} scope.technologies`, r.scope.technologies, TECHNOLOGIES);
    assertIn(`${where} scope.scope_text_status`, r.scope.scope_text_status, SCOPE_TEXT_STATUSES);
    if (r.scope.scope_text_status === "not_retrieved" && r.scope.decision_stages.length > 0) fail(`${where} carries stages for a scope the refresh could not read`);
    if (typeof r.title !== "string" || r.title === "" || typeof r.citation !== "string" || r.citation === "") fail(`${where} lacks a title or citation`);

    r.obligations.forEach((o, n) => {
      const at = `${where} obligation ${n + 1}`;
      assertKeys(at, o, OBLIGATION_KEYS);
      if (o.obligation_id !== `${r.row_id}-O${n + 1}`) fail(`${at} carries id ${o.obligation_id}`);
      assertIn(`${at} duty_type`, o.duty_type, DUTY_TYPES);
      assertIn(`${at} addressee`, o.addressee, ADDRESSEES);
      assertTokens(`${at} decision_stages`, o.decision_stages, DECISION_STAGES);
      assertIn(`${at} application_status`, o.application_status, APPLICATION_STATUSES);
      assertIn(`${at} implementation_status`, o.implementation_status, IMPLEMENTATION_STATUSES);
      assertIn(`${at} detail_status`, o.detail_status, DETAIL_STATUSES);
      assertDated(`${at} applies_from`, o.applies_from, o.applies_from_confidence);
      if (o.applies_from_confidence === "approximate") fail(`${at} carries an approximate application date, which an obligation cannot hold`);
      if (o.application_status !== "awaiting_transposition" && o.applies_from !== "") {
        const expected = o.applies_from <= AS_OF ? "in_application" : "scheduled";
        if (o.application_status !== expected) fail(`${at} is ${o.application_status} with applies_from ${o.applies_from}`);
      }
      if (o.decision_stages.some((t) => !r.scope.decision_stages.includes(t))) fail(`${at} carries a stage its record's scope does not`);
      if (typeof o.summary !== "string" || o.summary === "") fail(`${at} has no summary`);
      used.duty_type.add(o.duty_type);
    });
    if (r.enforceable !== isEnforceable(r)) fail(`${where} carries enforceable ${r.enforceable} against the published definition`);

    r.status_history.forEach((e, n) => {
      const at = `${where} history ${n + 1}`;
      assertKeys(at, e, HISTORY_KEYS);
      assertIn(`${at} event`, e.event, HISTORY_EVENTS);
      assertDated(at, e.date, e.date_confidence);
      if ((e.date_confidence === "approximate") !== (e.date_text !== "")) fail(`${at} pairs date_text "${e.date_text}" with ${e.date_confidence}`);
      if (e.date !== "" && e.date > AS_OF) fail(`${at} is dated after the as of`);
      used.history_event.add(e.event);
    });

    if ((r.instrument_type === "directive") !== (r.transposition_deadline !== "")) fail(`${where} pairs a transposition deadline with ${r.instrument_type}`);
    if (r.transposition_deadline !== "" && !isIsoDate(r.transposition_deadline)) fail(`${where} carries transposition deadline ${r.transposition_deadline}`);
    r.transpositions.forEach((t, n) => {
      const at = `${where} transposition ${n + 1}`;
      assertKeys(at, t, TRANSPOSITION_KEYS);
      if (memberStates.get(t.member_state_code) !== t.member_state_name) fail(`${at} names ${t.member_state_code} ${t.member_state_name}, which is not a member state row`);
      assertIn(`${at} status`, t.transposition_status, TRANSPOSITION_STATUSES);
      if (t.status_as_of !== TRANSPOSITION_STATUS_AS_OF || t.verified_on > AS_OF || t.verified_on < t.status_as_of) fail(`${at} is misdated`);
    });
    if (r.transpositions.length > 0) {
      const sorted = r.transpositions.map((t) => t.member_state_code);
      if (sorted.join(",") !== [...sorted].sort(byString).join(",") || new Set(sorted).size !== memberStates.size) fail(`${where} transpositions are not the member states once each in code order`);
    }

    r.notes.forEach((x, n) => {
      const at = `${where} note ${n + 1}`;
      assertKeys(at, x, NOTE_KEYS);
      if (!/^[a-z][a-z0-9_]*$/.test(x.topic) || x.text === "") fail(`${at} has topic "${x.topic}" or no text`);
      assertDated(at, x.date, x.date_confidence);
    });

    for (const related of r.related_row_ids) if (!rowIds.has(related) || related === r.row_id) fail(`${where} relates to ${related}`);
    if (r.as_of !== AS_OF) fail(`${where} carries as_of ${r.as_of}`);
    if (!isIsoDate(r.verified_on) || r.verified_on > r.as_of) fail(`${where} was verified on ${r.verified_on}, after its as of`);

    const hits = forbiddenTokens(JSON.stringify(r));
    if (hits.length > 0) fail(`${where} carries ${hits.join(", ")}`);
  });

  for (const [label, vocabulary] of [["obligation_type", OBLIGATION_TYPES], ["duty_type", DUTY_TYPES], ["history_event", HISTORY_EVENTS]]) {
    const unused = vocabulary.filter((token) => !used[label].has(token));
    if (unused.length > 0) fail(`the ${label} vocabulary carries tokens no record uses: ${unused.join(", ")}`);
  }

  // The one bill still moving was re-checked on its own date; every other row rests on the refresh.
  const rechecked = records.filter((r) => r.verified_on === RECHECK_DATE);
  if (rechecked.length !== 1 || rechecked[0].status !== "awaiting_signature") fail("the re-checked row is not the one bill awaiting signature");
  if (records.some((r) => r.verified_on !== RECHECK_DATE && r.verified_on !== REFRESH_DATE)) fail("a row carries a verified_on outside the refresh and the re-check");

  // The HR-21a carrier's history reads in date order with the two undated events first.
  const enjoined = records.filter((r) => r.status_history.some((e) => e.event === "enjoined"));
  if (enjoined.length === 1 && enjoined[0].status_history.map((e) => e.event).join(",") !== "passed,delayed,enjoined,repealed,replaced") {
    fail("the enjoined row's history does not read passed, delayed, enjoined, repealed, replaced");
  }

  const counts = plantCounts(records);
  for (const [key, expected] of Object.entries(EXPECTED_PLANT_COUNTS)) {
    if (counts[key] !== expected) fail(`${key} resolves to ${counts[key]}, expected ${expected}`);
  }
}

/**
 * The whole watch list: grammar, records and jurisdictions, with every published
 * rule asserted. Exported so HR-15 and HR-16 read the records in process.
 */
export function buildWatchList() {
  assertJurisdictions();
  const drafts = [...RECORDS].sort((a, b) => byString(a.jurisdiction_code, b.jurisdiction_code) || byString(a.citation, b.citation));
  const rowIdOf = new Map(drafts.map((d, i) => [d.key, `${ROW_ID_PREFIX}${String(i + 1).padStart(2, "0")}`]));
  const records = drafts.map((d) => {
    const row_id = rowIdOf.get(d.key);
    const obligations = d.obligations.map((o, n) => ({ obligation_id: `${row_id}-O${n + 1}`, ...o }));
    const record = {
      row_id,
      jurisdiction_code: d.jurisdiction_code,
      instrument_type: d.instrument_type,
      citation: d.citation,
      title: d.title,
      status: d.status,
      enforceable: false,
      obligation_type: d.obligation_type,
      preemption_risk: d.preemption_risk,
      scope: d.scope,
      obligations,
      status_history: d.status_history,
      transposition_deadline: d.transposition_deadline,
      transpositions: d.transpositions,
      notes: d.notes,
      related_row_ids: d.related.map((key) => {
        if (!rowIdOf.has(key)) throw new Error(`${E}: ${d.key} relates to an unknown record ${key}`);
        return rowIdOf.get(key);
      }),
      source_basis: d.source_basis,
      as_of: AS_OF,
      verified_on: d.status === "awaiting_signature" ? RECHECK_DATE : REFRESH_DATE,
    };
    record.enforceable = isEnforceable(record);
    return record;
  });
  assertRecords(records);
  const jurisdictions = JURISDICTIONS.map((j) => ({ ...j, as_of: AS_OF }));
  return { grammar: buildGrammar(records), records, jurisdictions };
}

// ----------------------------------------------------------------- bytes

function assertEmittedBytes(files) {
  for (const file of files) {
    const hits = forbiddenTokens(file.content);
    if (hits.length > 0) throw new Error(`${E}: ${file.path} carries ${hits.join(", ")}`);
    for (const match of file.content.matchAll(/(^|[^A-Za-z])EAW-([0-9]+)/gm)) {
      if (file.path !== FILES.records) throw new Error(`${E}: ${file.path} carries a row id`);
      if (match[2].length !== 2) throw new Error(`${E}: a row id is not two digits`);
    }
  }
  assertPrefixUnusedElsewhere(ROW_ID_PREFIX, OWN_DIR, E);
}

export function generate() {
  const { grammar, records, jurisdictions } = buildWatchList();
  const files = [
    { path: FILES.grammar, content: toCsv(COLUMNS.grammar, [grammar]) },
    { path: FILES.records, content: records.map((r) => JSON.stringify(r)).join("\n") + "\n" },
    { path: FILES.jurisdictions, content: toCsv(COLUMNS.jurisdictions, jurisdictions) },
  ];
  assertEmittedBytes(files);
  return files;
}

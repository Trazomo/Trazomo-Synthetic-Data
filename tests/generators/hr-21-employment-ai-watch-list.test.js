// HR-21 employment-ai-watch-list: the guard over the watch list, HR-C8-T1 to
// HR-C8-T10 of the people-hr cluster 8 data plan (section 4).
//
// Every arm reads the committed bytes under datasets/hr/employment-ai-watch-list/.
// The vocabularies, the denylist and the transposition census are restated
// literally below, and every plant is re-derived by this file's own code from
// the published fields, never by calling the generator's rule functions. The
// generator's exports are imported only to assert, as a second check, that they
// still equal the literal copies and the counts computed here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { csvTable, splitCsvLine } from "../helpers/csv-table.js";
import * as hr21 from "../../datagen/src/generators/hr-21-employment-ai-watch-list.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const spec = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml")).byId.get("HR-21");
const DIR = ["datasets", "hr", "employment-ai-watch-list"];
const read = (file) => readFileSync(join(REPO_ROOT, ...DIR, file), "utf8");

const GRAMMAR_FILE = "watch-list-grammar.csv";
const RECORDS_FILE = "employment-ai-watch-list.jsonl";
const JURISDICTIONS_FILE = "jurisdictions.csv";

const grammarText = read(GRAMMAR_FILE);
const recordsText = read(RECORDS_FILE);
const jurisdictionsText = read(JURISDICTIONS_FILE);
const grammar = csvTable(grammarText);
const G = grammar.rows[0];
const jurisdictions = csvTable(jurisdictionsText);
const records = recordsText.trim().split("\n").map((line) => JSON.parse(line));
const list = (value) => value.split("; ");

const AS_OF = "2026-09-01";
const WINDOW = ["2026-09-01", "2026-09-15"];
const EN_DASH = String.fromCharCode(0x2013);
const EM_DASH = String.fromCharCode(0x2014);

// ----------------------------------------------------------------- the literal copies

const KEYS = {
  record: ["row_id", "jurisdiction_code", "instrument_type", "citation", "title", "status", "enforceable",
    "obligation_type", "preemption_risk", "scope", "obligations", "status_history", "transposition_deadline",
    "transpositions", "notes", "related_row_ids", "source_basis", "as_of", "verified_on"],
  scope: ["subjects", "decision_stages", "technologies", "scope_text_status"],
  obligation: ["obligation_id", "duty_type", "addressee", "decision_stages", "applies_from",
    "applies_from_confidence", "application_status", "implementation_status", "detail_status", "summary"],
  history: ["event", "date", "date_confidence", "date_text", "note"],
  transposition: ["member_state_code", "member_state_name", "transposition_status", "status_as_of", "verified_on"],
  note: ["topic", "text", "date", "date_confidence"],
};

const VOCAB = {
  status: ["proposed", "in_negotiation", "draft", "passed_legislature", "awaiting_signature", "enacted", "vetoed",
    "repealed", "withdrawn", "decided"],
  instrument_type: ["regulation", "directive", "statute", "statute_group", "local_law", "bill", "draft_bill",
    "agency_regulation", "statutory_instrument", "executive_order", "agency_guidance", "draft_guidance", "judgment",
    "legislative_proposal"],
  obligation_type: ["ai_system_governance", "automated_decision_rights", "anti_discrimination", "bias_audit_and_notice",
    "consent", "notice_and_human_review", "automated_decision_notice", "pay_transparency", "ai_labor_impact_reporting",
    "preemption"],
  duty_type: ["transparency", "high_risk_deployer_duties", "explanation_and_human_intervention", "subject_access",
    "automated_decision_safeguards", "complaints_handling", "non_discrimination", "bias_audit", "notice", "consent",
    "demographic_reporting", "record_retention", "adverse_outcome_disclosure", "human_review", "access_to_information",
    "human_appeal", "risk_assessment_submission", "pay_range_disclosure", "pay_criteria_access",
    "pay_information_on_request", "pay_gap_reporting", "joint_pay_assessment"],
  application_status: ["in_application", "scheduled", "awaiting_transposition"],
  implementation_status: ["complete", "rules_pending", ""],
  detail_status: ["verified_primary", "verified_secondary", "not_retrieved"],
  decision_stage: ["recruitment_selection", "promotion", "termination_discipline", "terms_and_conditions",
    "training_selection", "task_allocation", "performance_evaluation", "pay_determination", "solely_automated_decision"],
  technology: ["any_ai_system", "automated_decision_system", "any_selection_procedure",
    "automated_employment_decision_tool", "video_interview_analysis", "facial_recognition"],
  subject: ["applicants", "employees", "workers", "workers_representatives", "data_subjects", "consumers"],
  scope_text_status: ["verbatim", "secondary_consistent", "not_retrieved"],
  history_event: ["proposed", "introduced", "passed_chamber", "passed", "amendments_concurred", "ordered_to_enrollment",
    "adopted", "signed", "became_law", "published", "entered_into_force", "made", "laid", "issued", "finalised",
    "delayed", "enjoined", "repealed", "replaced", "vetoed", "withdrawn", "rules_proposed", "hearing_cancelled",
    "rules_withdrawn", "consultation_opened", "consultation_closed", "draft_released", "deadline_reaffirmed", "decided"],
  date_confidence: ["exact", "approximate", "not_in_source", "unconfirmed"],
  preemption_risk: ["not_applicable", "watched", "litigated"],
  transposition_status: ["full", "partial", "draft_published", "no_draft"],
  source_basis: ["verified_primary", "primary_with_secondary", "secondary_consistent"],
  jurisdiction_level: ["supranational", "national", "state", "city"],
  coverage_status: ["researched", "not_researched"],
};
const ADDRESSEES = ["employer", "deployer", "controller", "business"];
const ENFORCING = ["employer", "deployer", "controller"];
const SPECIFIC = ["video_interview_analysis", "facial_recognition"];

// Claim 9b, restated by name.
const CENSUS = {
  full: ["Slovakia", "Italy", "Lithuania", "Malta"],
  partial: ["Belgium", "Ireland", "Poland"],
  draft_published: ["France", "Denmark", "Netherlands", "Finland", "Czechia", "Cyprus", "Latvia", "Bulgaria", "Greece", "Romania"],
  no_draft: ["Germany", "Spain", "Sweden", "Estonia", "Austria", "Croatia", "Hungary", "Luxembourg", "Portugal", "Slovenia"],
};
const US_ROWS = [
  ["US", "United States", "national", ""], ["US-CA", "California", "state", "US"],
  ["US-CO", "Colorado", "state", "US"], ["US-DE", "Delaware", "state", "US"], ["US-IL", "Illinois", "state", "US"],
  ["US-MD", "Maryland", "state", "US"], ["US-NY", "New York", "state", "US"],
  ["US-NY-NYC", "New York City", "city", "US-NY"], ["EU", "European Union", "supranational", ""],
  ["GB", "United Kingdom", "national", ""],
];

const DENYLIST = [
  "WP251", "HB 1405", "advisory letter", "Mobley", "Workday", "xAI", "Dun and Bradstreet", "Magistrat", "Francovich",
  "Simmons and Simmons", "Gibson Dunn", "DLA Piper", "Ogletree", "McDermott", "Seyfarth", "Hinshaw",
  "National Law Review", "Mayer Brown", "Jackson Lewis", "Liebert Cassidy", "Fisher Phillips", "Kilpatrick", "Littler",
  "Skadden", "White and Case", "Clifford Chance", "Womble", "Covington", "Debevoise", "Arnold and Porter", "Bird and Bird",
  "Stibbe", "Cooley", "K and L Gates", "Holland and Knight", "Sidley", "WilmerHale", "Ropes and Gray", "Morgan Lewis",
  "DCI Consulting", "L and E Global", "Roll Call", "Nextgov", "Tech Policy Press",
  "Polis", "Newsom", "McNerney", "Hinchey", "Obernolte", "Trahan",
];

// ----------------------------------------------------------------- this file's own rules

const byString = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const find = (prefix) => {
  const hits = records.filter((r) => r.citation.startsWith(prefix));
  assert.equal(hits.length, 1, `expected one record citing "${prefix}"`);
  return hits[0];
};
const live = (o) => {
  if (o.application_status === "awaiting_transposition") return false;
  if (o.applies_from === "") return o.application_status === "in_application";
  return o.applies_from <= AS_OF;
};
const enforceable = (r) => r.obligations.some((o) => ENFORCING.includes(o.addressee) && live(o));
const fixedDates = (r) => [...new Set(r.obligations.filter((o) => o.applies_from_confidence === "exact").map((o) => o.applies_from))];
const stages = (r, onlyLive) => new Set(r.obligations.filter((o) => !onlyLive || live(o)).flatMap((o) => o.decision_stages));
const overlapping = (onlyLive) => [...new Set(records.map((r) => r.jurisdiction_code))].filter((code) => {
  const sets = records.filter((r) => r.jurisdiction_code === code).map((r) => stages(r, onlyLive));
  return sets.some((a, i) => sets.some((b, j) => j > i && [...a].some((t) => b.has(t))));
}).sort();
const narrow = (requireSole) => records.filter((r) => enforceable(r)
  && r.scope.technologies.length === 1 && SPECIFIC.includes(r.scope.technologies[0])
  && (!requireSole || records.filter((x) => x.jurisdiction_code === r.jurisdiction_code && enforceable(x)).length === 1));

/** Every dated triple in a record: obligations, history and notes. */
const datedFields = (r) => [
  ...r.obligations.map((o) => [`${o.obligation_id}`, o.applies_from, o.applies_from_confidence]),
  ...r.status_history.map((e, i) => [`${r.row_id} history ${i + 1}`, e.date, e.date_confidence]),
  ...r.notes.map((x, i) => [`${r.row_id} note ${i + 1}`, x.date, x.date_confidence]),
];

// ----------------------------------------------------------------- the arms

test("HR-C8-T1: HR-21: three files, keys in the spec's order at every nesting level", () => {
  assert.deepEqual(Object.keys(spec.files), [GRAMMAR_FILE, RECORDS_FILE, JURISDICTIONS_FILE]);
  assert.deepEqual(grammar.cols, spec.files[GRAMMAR_FILE]);
  assert.deepEqual(jurisdictions.cols, spec.files[JURISDICTIONS_FILE]);
  assert.deepEqual(spec.files[RECORDS_FILE], KEYS.record);
  assert.equal(grammar.rows.length, 1);
  assert.deepEqual(list(G.record_key_order), KEYS.record);
  assert.deepEqual(list(G.scope_key_order), KEYS.scope);
  assert.deepEqual(list(G.obligation_key_order), KEYS.obligation);
  assert.deepEqual(list(G.history_key_order), KEYS.history);
  assert.deepEqual(list(G.transposition_key_order), KEYS.transposition);
  assert.deepEqual(list(G.note_key_order), KEYS.note);

  assert.equal(records.length, 22);
  assert.equal(G.record_count, "22");
  assert.equal(G.grammar_id, "WATCH-LIST-GRAMMAR-2026-09-01");
  for (const r of records) {
    assert.deepEqual(Object.keys(r), spec.files[RECORDS_FILE], `${r.row_id} top-level keys`);
    assert.deepEqual(Object.keys(r.scope), list(G.scope_key_order), `${r.row_id} scope keys`);
    r.obligations.forEach((o, n) => {
      assert.deepEqual(Object.keys(o), list(G.obligation_key_order), `${r.row_id} obligation keys`);
      assert.equal(o.obligation_id, `${r.row_id}-O${n + 1}`);
    });
    for (const e of r.status_history) assert.deepEqual(Object.keys(e), list(G.history_key_order), `${r.row_id} history keys`);
    for (const t of r.transpositions) assert.deepEqual(Object.keys(t), list(G.transposition_key_order), `${r.row_id} transposition keys`);
    for (const x of r.notes) assert.deepEqual(Object.keys(x), list(G.note_key_order), `${r.row_id} note keys`);
  }
  const sorted = [...records].sort((a, b) => byString(a.jurisdiction_code, b.jurisdiction_code) || byString(a.citation, b.citation));
  assert.deepEqual(records.map((r) => r.row_id), sorted.map((r) => r.row_id), "rows are not in (jurisdiction_code, citation) order");
  assert.deepEqual(records.map((r) => r.row_id), records.map((_, i) => `EAW-${String(i + 1).padStart(2, "0")}`), "row ids are not dense");
  const ids = new Set(records.map((r) => r.row_id));
  for (const r of records) for (const related of r.related_row_ids) assert.ok(ids.has(related) && related !== r.row_id, `${r.row_id} relates to ${related}`);
  assert.deepEqual(find("Case C-203/22").related_row_ids, [find("General Data Protection Regulation").row_id]);

  // second check: the generator's key lists equal the literal copies
  assert.deepEqual(hr21.RECORD_KEYS, KEYS.record);
  assert.deepEqual(hr21.SCOPE_KEYS, KEYS.scope);
  assert.deepEqual(hr21.OBLIGATION_KEYS, KEYS.obligation);
  assert.deepEqual(hr21.HISTORY_KEYS, KEYS.history);
  assert.deepEqual(hr21.TRANSPOSITION_KEYS, KEYS.transposition);
  assert.deepEqual(hr21.NOTE_KEYS, KEYS.note);
});

test("HR-C8-T2: HR-21: every record carries the eight tie-out fields, as_of 2026-09-01 and verified_on on or before it", () => {
  const tieOut = ["as_of", "verified_on", "jurisdiction_code", "citation", "status", "enforceable", "obligation_type", "preemption_risk"];
  for (const r of records) {
    for (const field of tieOut) assert.ok(r[field] !== undefined && r[field] !== "", `${r.row_id} lacks ${field}`);
    assert.equal(typeof r.enforceable, "boolean", `${r.row_id} enforceable is not a boolean`);
    assert.equal(r.as_of, AS_OF);
    assert.ok(r.verified_on <= r.as_of, `${r.row_id} verified after its as of`);
    for (const t of r.transpositions) assert.ok(t.verified_on <= r.as_of);
  }
  assert.equal(find("SB 947").verified_on, "2026-09-01");
  for (const r of records.filter((x) => !x.citation.startsWith("SB 947"))) assert.equal(r.verified_on, "2026-08-31", `${r.row_id} verified_on`);
  assert.equal(G.as_of, AS_OF);
  assert.equal(G.universe_now, "2026-04-03");
  assert.equal(G.not_legal_advice_notice,
    "This watch list is synthetic training data. Its records cite real instruments as recorded on each record's "
    + "verified_on date. It is not legal advice, it is not a complete survey of any jurisdiction, and any status "
    + "may have changed since. Read the official text before relying on a record.");
  assert.equal(G.verification_statement,
    "every record was checked against a dated research record of 2026-08-31, and the one bill still moving was "
    + "re-checked on 2026-09-01; no record carries a URL");
});

test("HR-C8-T3: HR-21: vocabularies closed and enforceable recomputes from obligations", () => {
  const grammarVocab = {
    status: G.status_vocabulary, instrument_type: G.instrument_type_vocabulary,
    obligation_type: G.obligation_type_vocabulary, duty_type: G.duty_type_vocabulary,
    application_status: G.application_status_vocabulary, decision_stage: G.decision_stage_vocabulary,
    technology: G.technology_vocabulary, subject: G.subject_vocabulary, scope_text_status: G.scope_text_status_vocabulary,
    history_event: G.history_event_vocabulary, date_confidence: G.date_confidence_vocabulary,
    preemption_risk: G.preemption_risk_vocabulary, transposition_status: G.transposition_status_vocabulary,
    source_basis: G.source_basis_vocabulary, jurisdiction_level: G.jurisdiction_level_vocabulary,
    coverage_status: G.coverage_status_vocabulary,
  };
  for (const [field, value] of Object.entries(grammarVocab)) assert.deepEqual(list(value), VOCAB[field], `grammar ${field} vocabulary`);

  const inVocab = (field, value, where) => assert.ok(VOCAB[field].includes(value), `${where} carries ${field} "${value}"`);
  const used = { obligation_type: new Set(), duty_type: new Set(), history_event: new Set() };
  for (const r of records) {
    inVocab("status", r.status, r.row_id);
    inVocab("instrument_type", r.instrument_type, r.row_id);
    inVocab("obligation_type", r.obligation_type, r.row_id);
    inVocab("preemption_risk", r.preemption_risk, r.row_id);
    inVocab("source_basis", r.source_basis, r.row_id);
    inVocab("scope_text_status", r.scope.scope_text_status, r.row_id);
    for (const s of r.scope.subjects) inVocab("subject", s, r.row_id);
    for (const s of r.scope.decision_stages) inVocab("decision_stage", s, r.row_id);
    for (const t of r.scope.technologies) inVocab("technology", t, r.row_id);
    used.obligation_type.add(r.obligation_type);
    const expectedRisk = r.jurisdiction_code.startsWith("US-")
      ? (r.status_history.some((e) => e.event === "enjoined") ? "litigated" : "watched") : "not_applicable";
    assert.equal(r.preemption_risk, expectedRisk, `${r.row_id} preemption_risk`);
    for (const o of r.obligations) {
      inVocab("duty_type", o.duty_type, o.obligation_id);
      inVocab("application_status", o.application_status, o.obligation_id);
      inVocab("implementation_status", o.implementation_status, o.obligation_id);
      inVocab("detail_status", o.detail_status, o.obligation_id);
      inVocab("date_confidence", o.applies_from_confidence, o.obligation_id);
      assert.ok(ADDRESSEES.includes(o.addressee), `${o.obligation_id} addressee`);
      for (const s of o.decision_stages) {
        inVocab("decision_stage", s, o.obligation_id);
        assert.ok(r.scope.decision_stages.includes(s), `${o.obligation_id} stage ${s} is outside its record's scope`);
      }
      if (o.applies_from !== "" && o.application_status !== "awaiting_transposition") {
        assert.equal(o.application_status, o.applies_from <= AS_OF ? "in_application" : "scheduled", `${o.obligation_id} application_status`);
      }
      used.duty_type.add(o.duty_type);
    }
    for (const e of r.status_history) { inVocab("history_event", e.event, r.row_id); used.history_event.add(e.event); }
    for (const t of r.transpositions) inVocab("transposition_status", t.transposition_status, r.row_id);
    for (const x of r.notes) inVocab("date_confidence", x.date_confidence, r.row_id);
    assert.equal(r.enforceable, enforceable(r), `${r.row_id} enforceable disagrees with the definition`);
  }
  for (const field of Object.keys(used)) assert.deepEqual([...used[field]].sort(), [...VOCAB[field]].sort(), `${field} is not exactly the tokens the records use`);

  const enforceableRows = records.filter((r) => r.enforceable);
  assert.equal(enforceableRows.length, 9);
  assert.ok(records.filter((r) => r.status === "enacted").length > enforceableRows.length, "status and enforceable coincide");
  assert.match(G.enforceable_definition, /employer, deployer or controller/);

  // second check: the generator's vocabularies equal the literal copies
  const exported = {
    status: hr21.STATUSES, instrument_type: hr21.INSTRUMENT_TYPES, obligation_type: hr21.OBLIGATION_TYPES,
    duty_type: hr21.DUTY_TYPES, application_status: hr21.APPLICATION_STATUSES,
    implementation_status: hr21.IMPLEMENTATION_STATUSES, detail_status: hr21.DETAIL_STATUSES,
    decision_stage: hr21.DECISION_STAGES, technology: hr21.TECHNOLOGIES, subject: hr21.SUBJECTS,
    scope_text_status: hr21.SCOPE_TEXT_STATUSES, history_event: hr21.HISTORY_EVENTS,
    date_confidence: hr21.DATE_CONFIDENCES, preemption_risk: hr21.PREEMPTION_RISKS,
    transposition_status: hr21.TRANSPOSITION_STATUSES, source_basis: hr21.SOURCE_BASES,
    jurisdiction_level: hr21.JURISDICTION_LEVELS, coverage_status: hr21.COVERAGE_STATUSES,
  };
  for (const [field, value] of Object.entries(exported)) assert.deepEqual(value, VOCAB[field], `export ${field}`);
  assert.deepEqual(hr21.ADDRESSEES, ADDRESSEES);
  assert.deepEqual(hr21.ENFORCEABLE_ADDRESSEES, ENFORCING);
  for (const r of records) assert.equal(hr21.isEnforceable(r), enforceable(r));
  assert.equal(hr21.plantCounts(records).enforceable, 9);
});

test("HR-C8-T4: HR-21: the refresh's unconfirmed details are represented, never asserted", () => {
  // exact never beside an empty date, and nothing else beside a filled one
  for (const r of records) {
    for (const [where, date, confidence] of datedFields(r)) {
      assert.equal(confidence === "exact", date !== "", `${where} pairs "${date}" with ${confidence}`);
      if (date !== "") assert.match(date, /^\d{4}-\d{2}-\d{2}$/, `${where} date`);
    }
    for (const e of r.status_history) {
      assert.equal(e.date_confidence === "approximate", e.date_text !== "", `${r.row_id} history date_text`);
    }
    for (const o of r.obligations) assert.notEqual(o.applies_from_confidence, "approximate", `${o.obligation_id} approximate`);
  }

  // the literal list, each at its stated field with its stated confidence
  const duaa = find("Data (Use and Access) Act 2025");
  const s103 = duaa.obligations.filter((o) => o.duty_type === "complaints_handling");
  assert.equal(s103.length, 1);
  assert.equal(s103[0].applies_from, "");
  assert.equal(s103[0].applies_from_confidence, "unconfirmed");
  assert.match(s103[0].summary, /section 103/);
  const adm = duaa.obligations.find((o) => o.duty_type === "automated_decision_safeguards");
  assert.equal(adm.applies_from, "2026-06-19", "the section 80 date is confirmed and distinct from section 103");

  const withdrawal = find("HB 3773").status_history.filter((e) => e.event === "rules_withdrawn");
  assert.equal(withdrawal.length, 1);
  assert.deepEqual([withdrawal[0].date, withdrawal[0].date_confidence], ["", "unconfirmed"]);
  assert.equal(find("HB 3773").obligations.find((o) => o.duty_type === "notice").implementation_status, "rules_pending");

  const flagged = (record, topic) => record.notes.filter((x) => x.topic === topic && x.date === "" && x.date_confidence === "unconfirmed").length;
  assert.equal(flagged(find("CPPA regulations"), "phase_in"), 1, "the CPPA phase-in");
  assert.equal(flagged(find("Local Law 144"), "penalties"), 1, "the LL 144 penalties");
  assert.equal(flagged(find("Title VII"), "enforcement_plan"), 1, "the SEP technology priority");

  const unconfirmed = records.flatMap((r) => datedFields(r)).filter(([, , c]) => c === "unconfirmed");
  assert.equal(unconfirmed.length, 5, "the unconfirmed census moved");

  const nyc = find("Local Law 144");
  assert.equal(nyc.scope.scope_text_status, "not_retrieved");
  assert.deepEqual(nyc.scope.decision_stages, []);
  assert.deepEqual(nyc.obligations.map((o) => o.duty_type).sort(), ["bias_audit", "notice"]);
  for (const o of nyc.obligations) {
    assert.deepEqual(o.decision_stages, []);
    assert.equal(o.detail_status, "not_retrieved");
    assert.deepEqual([o.applies_from, o.applies_from_confidence], ["", "not_in_source"]);
  }

  const colorado = find("SB 26-189");
  assert.equal(colorado.scope.scope_text_status, "not_retrieved");
  assert.deepEqual(colorado.scope.decision_stages, []);
  for (const o of colorado.obligations) assert.deepEqual(o.decision_stages, []);

  for (const prefix of ["General Data Protection Regulation", "Title VII"]) {
    for (const o of find(prefix).obligations) assert.deepEqual([o.applies_from, o.applies_from_confidence], ["", "not_in_source"], prefix);
  }
  for (const r of records) {
    if (r.scope.scope_text_status === "not_retrieved") assert.deepEqual(r.scope.decision_stages, [], `${r.row_id} stages without a read scope`);
  }
});

test("HR-C8-T5: HR-21a and HR-21e by rule, with the dropped-qualifier counts 5 and 2", () => {
  const enacted = records.filter((r) => r.status === "enacted");
  const a = enacted.filter((r) => !r.enforceable && r.status_history.some((e) => e.event === "enjoined"));
  assert.equal(a.length, 1);
  assert.equal(a[0].jurisdiction_code, "US-CO");
  assert.deepEqual(a[0].status_history.map((e) => e.event), ["passed", "delayed", "enjoined", "repealed", "replaced"]);
  assert.deepEqual(a[0].status_history.map((e) => e.date), ["", "", "2026-04-27", "2026-05-14", "2026-05-14"]);
  assert.equal(enacted.filter((r) => !r.enforceable).length, 5, "dropping the history clause");
  assert.equal(enacted.length, 14, "dropping enforceable");
  assert.equal(records.filter((r) => r.status_history.some((e) => e.event === "enjoined")).length, 1);

  const e = records.filter((r) => r.status === "awaiting_signature");
  assert.equal(e.length, 1);
  assert.ok(e[0].citation.startsWith("SB 947"));
  assert.equal(records.filter((r) => ["passed_legislature", "awaiting_signature"].includes(r.status)).length, 2, "widening to passed_legislature");
  assert.ok(!records.some((r) => r.citation.startsWith("SB 7")), "SB 7 is carried only as a vetoed event");

  const counts = hr21.plantCounts(records);
  assert.deepEqual([counts.hr21a, counts.hr21a_without_history, counts.hr21a_without_enforceable, counts.hr21e, counts.hr21e_widened], [1, 5, 14, 1, 2]);
});

test("HR-C8-T6: HR-21b: 27 sub-rows, 4, 3, 10, 10 by status, dated 2026-06-18, no count field anywhere", () => {
  const carriers = records.filter((r) => r.transpositions.length > 0);
  assert.equal(carriers.length, 1);
  const directive = carriers[0];
  assert.equal(directive.instrument_type, "directive");
  assert.equal(records.filter((r) => r.instrument_type === "directive").length, 1, "the type agrees with the array");
  assert.equal(directive.transposition_deadline, "2026-06-07");
  assert.equal(directive.transpositions.length, 27);
  for (const [status, names] of Object.entries(CENSUS)) {
    const rows = directive.transpositions.filter((t) => t.transposition_status === status);
    assert.deepEqual(rows.map((t) => t.member_state_name).sort(), [...names].sort(), status);
  }
  assert.deepEqual(Object.values(CENSUS).map((names) => names.length), [4, 3, 10, 10]);
  assert.equal(directive.transpositions.filter((t) => t.transposition_status !== "full").length, 23);
  for (const t of directive.transpositions) assert.equal(t.status_as_of, "2026-06-18");
  const codes = directive.transpositions.map((t) => t.member_state_code);
  assert.deepEqual(codes, [...codes].sort(byString), "sub-rows are not in member_state_code order");
  for (const r of records.filter((x) => x !== directive)) assert.equal(r.transposition_deadline, "", `${r.row_id} deadline`);

  const keysOf = (value) => (Array.isArray(value) ? value.flatMap(keysOf)
    : value && typeof value === "object" ? Object.entries(value).flatMap(([k, v]) => [k, ...keysOf(v)]) : []);
  assert.ok(!keysOf(records).some((k) => /count/.test(k)), "a record carries a count field");
  assert.deepEqual(grammar.cols.filter((c) => /count/.test(c)), ["record_count", "jurisdiction_count"]);
  assert.equal(hr21.plantCounts(records).hr21b, 1);
});

test("HR-C8-T7: HR-21c: one instrument straddles the as_of; five carry two fixed dates", () => {
  const straddle = records.filter((r) => fixedDates(r).some((d) => d <= AS_OF) && fixedDates(r).some((d) => d > AS_OF));
  assert.equal(straddle.length, 1);
  assert.ok(straddle[0].citation.startsWith("Regulation (EU) 2024/1689"));
  assert.deepEqual(fixedDates(straddle[0]), ["2026-08-02", "2027-12-02"]);
  const two = records.filter((r) => fixedDates(r).length >= 2);
  assert.equal(two.length, 5);
  assert.deepEqual(two.map((r) => r.jurisdiction_code).sort(), ["EU", "EU", "GB", "US-CA", "US-IL"]);

  // no obligation's application date falls inside HR-15's alert window
  const inWindow = records.flatMap((r) => r.obligations).filter((o) => o.applies_from !== "" && o.applies_from >= WINDOW[0] && o.applies_from <= WINDOW[1]);
  assert.equal(inWindow.length, 0);
  const counts = hr21.plantCounts(records);
  assert.deepEqual([counts.hr21c, counts.hr21c_two_fixed_dates, counts.obligations_in_alert_window], [1, 5, 0]);
});

test("HR-C8-T8: HR-21d: one narrow sole row, two without the sole clause; one overlapping jurisdiction, two without in_application", () => {
  const sole = narrow(true);
  assert.equal(sole.length, 1);
  assert.equal(sole[0].jurisdiction_code, "US-MD");
  assert.deepEqual(sole[0].scope.technologies, ["facial_recognition"]);
  assert.deepEqual(narrow(false).map((r) => r.jurisdiction_code).sort(), ["US-IL", "US-MD"]);

  assert.deepEqual(overlapping(true), ["US-IL"]);
  const liveShared = records.filter((r) => r.jurisdiction_code === "US-IL").map((r) => stages(r, true));
  assert.ok(liveShared.every((s) => s.has("recruitment_selection")));
  // "two without in_application" in the arm's name counts the jurisdictions the qualifier adds; the total is three
  assert.deepEqual(overlapping(false), ["EU", "US-CA", "US-IL"]);
  const counts = hr21.plantCounts(records);
  assert.deepEqual([counts.hr21d_narrow, counts.hr21d_narrow_without_sole, counts.hr21d_overlap, counts.hr21d_overlap_without_in_application], [1, 2, 1, 3]);
});

test("HR-C8-T9: HR-21: jurisdictions resolve, Delaware is not_researched, every member state code resolves", () => {
  assert.equal(jurisdictions.rows.length, 37);
  assert.equal(G.jurisdiction_count, "37");
  const byCode = new Map(jurisdictions.rows.map((j) => [j.code, j]));
  assert.equal(byCode.size, 37);
  for (const [code, name, level, parent] of US_ROWS) {
    const j = byCode.get(code);
    assert.ok(j, `${code} missing`);
    assert.deepEqual([j.name, j.level, j.parent_code], [name, level, parent], code);
  }
  const memberStates = jurisdictions.rows.filter((j) => j.parent_code === "EU");
  assert.equal(memberStates.length, 27);
  assert.ok(memberStates.every((j) => j.level === "national"));
  assert.deepEqual(memberStates.map((j) => j.name).sort(), Object.values(CENSUS).flat().sort());
  assert.equal(byCode.get("GR").name, "Greece");
  assert.equal(byCode.get("CZ").name, "Czechia");
  assert.deepEqual(jurisdictions.rows.filter((j) => j.coverage_status === "not_researched").map((j) => j.code), ["US-DE"]);
  for (const j of jurisdictions.rows) {
    assert.equal(j.as_of, AS_OF);
    assert.ok(VOCAB.jurisdiction_level.includes(j.level));
    assert.ok(VOCAB.coverage_status.includes(j.coverage_status));
    if (j.parent_code !== "") assert.ok(byCode.has(j.parent_code), `${j.code} parent`);
  }
  assert.deepEqual(jurisdictions.rows.map((j) => j.code), [...byCode.keys()].sort(byString), "rows are not in code order");
  for (const r of records) {
    assert.ok(byCode.has(r.jurisdiction_code), `${r.row_id} jurisdiction`);
    assert.notEqual(r.jurisdiction_code, "US-DE", "a record asserts something about Delaware law");
    for (const t of r.transpositions) {
      assert.equal(byCode.get(t.member_state_code)?.parent_code, "EU", `${t.member_state_code} is not a member state row`);
      assert.equal(byCode.get(t.member_state_code).name, t.member_state_name);
    }
  }
  assert.equal(records.filter((r) => r.jurisdiction_code === "US-MD").length, 1);

  // second check: the generator's table equals the committed rows
  assert.deepEqual(hr21.JURISDICTIONS.map((j) => ({ ...j, as_of: AS_OF })), jurisdictions.rows);
});

test("HR-C8-T10: HR-21: no URL, person, firm, vendor, rejected claim, money or dash", () => {
  const files = [[GRAMMAR_FILE, grammarText], [RECORDS_FILE, recordsText], [JURISDICTIONS_FILE, jurisdictionsText]];
  const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const [name, text] of files) {
    for (const term of DENYLIST) {
      assert.ok(!new RegExp(`(^|[^A-Za-z0-9])${escape(term)}($|[^A-Za-z0-9])`, "i").test(text), `${name} carries "${term}"`);
    }
    assert.ok(!/https?:\/\/|www\./i.test(text), `${name} carries a URL`);
    assert.ok(!text.includes("$") && !text.includes("%") && !/\bdollars?\b/i.test(text), `${name} carries money`);
    assert.ok(!text.includes(EM_DASH) && !text.includes(EN_DASH), `${name} carries a dash`);
    const outside = name === RECORDS_FILE ? [] : text.match(/(^|[^A-Za-z])EAW-[0-9]/gm) ?? [];
    assert.equal(outside.length, 0, `${name} carries a row id`);
  }
  // every splitter sees the one grammar row as one line
  assert.equal(grammarText.trim().split("\n").length, 2);
  assert.equal(splitCsvLine(grammarText.trim().split("\n")[0]).length, grammar.cols.length);

  for (const source of ["datagen/src/generators/hr-21-employment-ai-watch-list.js", "tests/generators/hr-21-employment-ai-watch-list.test.js"]) {
    const text = readFileSync(join(REPO_ROOT, source), "utf8");
    assert.ok(!text.includes(EM_DASH) && !text.includes(EN_DASH), `${source} carries a dash`);
  }
  // second check: the generator's denylist equals the literal copy
  assert.deepEqual(hr21.DENYLIST, DENYLIST);
});

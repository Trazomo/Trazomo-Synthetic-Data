// HR-16 aedt-inventory-audit-log: the people-decision tools co-002 runs, the
// bias audits each has had and the AI-use notices each has posted, at a
// 2026-09-01 stamp, read against the employment AI watch list in process.
//
// Three shapes are the exercise rather than the decoration:
//
//   1. Audit currency is a published computation. Whole months from the latest
//      audit to the as_of, under the company's own twelve month standard, which
//      the grammar says is not any jurisdiction's rule. One tool sits at twelve
//      whole months and 377 days, so the day-count reading is the wrong one.
//   2. Whether a notice is required is read off the watch list, never typed. A
//      (tool, jurisdiction) pair needs a notice when the jurisdiction or a
//      parent holds an enforceable row with a notice obligation in application
//      whose decision stages contain the tool's own stage; the finding is a
//      required pair with no posted_date, and it sits on a different tool from
//      the stale audit.
//   3. Scope is a rule with an open case. A tool that drafts for a human, whose
//      own stage no row in application names but whose output feeds a stage one
//      does, is scope_open; a row whose scope text was not retrieved places no
//      tool, and the tracker reports that jurisdiction instead.
//
// The tools carry no product or vendor name; the one third party module names
// canon co-106 by id. The vendor's unpublished audit content sits on that
// module's two audit rows alone. No row carries money, a percentage, a URL or a
// person. Which tool carries which finding is not written anywhere in this
// file; it is found by the rule.
import { toCsv } from "../csv.js";
import { isWeekend, diffDays } from "../dates.js";
import { assertPrefixUnusedElsewhere } from "./hr-20-benefits-census.js";
import { locationJurisdictionCodes } from "./hr-15-leave-compliance-roster.js";
import {
  AS_OF as WATCH_LIST_AS_OF, DECISION_STAGES as WATCH_LIST_STAGES, JURISDICTIONS, buildWatchList, inApplication,
} from "./hr-21-employment-ai-watch-list.js";

export const id = "HR-16";

const E = "HR-16";

export const AS_OF = "2026-09-01";
export const UNIVERSE_NOW = "2026-04-03";
export const GRAMMAR_ID = "AEDT-GRAMMAR-2026-09-01";
export const OWN_DIR = "datasets/hr/aedt-inventory-audit-log/";
export const AUDIT_CURRENCY_MONTHS = 12;
export const VENDOR_COMPANY_ID = "co-106";
export const COMPANY_PRACTICE = "company_practice";

export const TOOL_ORIGINS = ["in_house_build", "third_party_module"];
export const TOOL_STATUSES = ["in_use", "paused"];
export const DECISION_ROLES = [
  "ranks_or_filters", "drafts_for_human", "schedules_or_routes", "scores_or_ranks",
  "recommends_to_employee", "reports_aggregate",
];
/** The tool-only stages; the vocabulary is the watch list's stages plus these. */
export const TOOL_ONLY_STAGES = [
  "interview_feedback", "interview_scheduling", "learning_recommendation",
  "workforce_aggregate_reporting", "job_description_drafting",
];
export const DECISION_STAGES = [...WATCH_LIST_STAGES, ...TOOL_ONLY_STAGES];
export const AUDITOR_TYPES = ["independent_auditor", "vendor_commissioned", "internal_review"];
export const SUMMARY_PUBLICATIONS = ["published", "unpublished"];
export const NOTICE_CHANNELS = ["careers_page", "employee_intranet"];
export const OWNER_ROLES = ["Recruiter", "HR Business Partner", "People Manager", "Director, People"];

/** The people-hr module slugs below order 31, by order (implementation plan v2 section 3). */
export const PEOPLE_HR_SLUGS_BELOW_31 = [
  "hr-computational-thinking", "hr-ai-foundations", "hr-ai-toolkit-setup", "hr-software-fundamentals",
  "hr-ai-reliability", "hr-operational-controls", "hr-speak-dev", "hr-local-ai", "hr-hris-ops",
  "hr-google-workspace", "hr-microsoft-365", "hr-job-description-calibrator", "hr-structured-interview-kit",
  "hr-interview-schedule-proposer", "hr-interview-notes-to-feedback", "hr-resume-screening-shortlist",
  "hr-candidate-debrief-packet", "hr-new-hire-launchpad", "hr-offboarding-access-deprovisioning",
  "hr-review-cycle-coordinator", "hr-review-writing-assistant", "hr-manager-conversation-rehearsal",
  "hr-learning-pathway-planner", "hr-pay-equity-band-report", "hr-people-analytics-attrition-signals",
  "hr-policy-handbook-knowledge-base", "hr-total-rewards-benefits-knowledge-base", "hr-helpdesk-intake-router",
  "hr-claude-platform", "hr-codex-gpt-platform", "hr-employment-law-leave-compliance-monitor",
];

/** Real HR vendor and product names no tool name or byte may carry. */
export const VENDOR_DENYLIST = [
  "Workday", "HireVue", "Pymetrics", "Greenhouse", "Lever", "iCIMS", "SuccessFactors", "Taleo", "Oracle",
  "BambooHR", "ADP", "Eightfold", "Paradox", "HireRight", "Textio", "Lattice", "Culture Amp", "Beamery",
  "Phenom", "SmartRecruiters", "Jobvite", "Cornerstone", "Gusto", "Rippling", "Harver", "Modern Hire",
  "Visier", "Glint", "Qualtrics", "Peakon", "LinkedIn", "Indeed", "TalentForce",
];

/**
 * The tool library of data plan 2.4.2, literal, by design slot. `audits` are
 * the tool's audit dates, latest first; the findings note sits on the vendor's
 * rows alone.
 */
export const TOOL_LIBRARY = [
  { slot: "T1", tool_name: "resume screening and shortlist assistant", tool_origin: "in_house_build", used_in_module: "hr-resume-screening-shortlist", vendor_company_id: "", decision_stage: "recruitment_selection", decision_role: "ranks_or_filters", feeds_decision_stage: "", status: "in_use", owner_role: "Recruiter", audits: ["2026-02-16", "2025-02-10"] },
  { slot: "T2", tool_name: "performance review writing assistant", tool_origin: "in_house_build", used_in_module: "hr-review-writing-assistant", vendor_company_id: "", decision_stage: "performance_evaluation", decision_role: "drafts_for_human", feeds_decision_stage: "promotion", status: "in_use", owner_role: "HR Business Partner", audits: ["2025-10-06"] },
  { slot: "T3", tool_name: "interview notes to feedback drafter", tool_origin: "in_house_build", used_in_module: "hr-interview-notes-to-feedback", vendor_company_id: "", decision_stage: "interview_feedback", decision_role: "drafts_for_human", feeds_decision_stage: "recruitment_selection", status: "paused", owner_role: "Recruiter", audits: ["2025-03-10"] },
  { slot: "T4", tool_name: "interview panel scheduling proposer", tool_origin: "in_house_build", used_in_module: "hr-interview-schedule-proposer", vendor_company_id: "", decision_stage: "interview_scheduling", decision_role: "schedules_or_routes", feeds_decision_stage: "", status: "in_use", owner_role: "Recruiter", audits: ["2025-08-20"] },
  { slot: "T5", tool_name: "candidate assessment scoring module", tool_origin: "third_party_module", used_in_module: "", vendor_company_id: VENDOR_COMPANY_ID, decision_stage: "recruitment_selection", decision_role: "scores_or_ranks", feeds_decision_stage: "", status: "in_use", owner_role: "People Manager", audits: ["2025-07-14", "2024-07-15"] },
  { slot: "T6", tool_name: "learning pathway planner", tool_origin: "in_house_build", used_in_module: "hr-learning-pathway-planner", vendor_company_id: "", decision_stage: "learning_recommendation", decision_role: "recommends_to_employee", feeds_decision_stage: "", status: "in_use", owner_role: "HR Business Partner", audits: ["2026-01-12"] },
  { slot: "T7", tool_name: "attrition signal dashboard", tool_origin: "in_house_build", used_in_module: "hr-people-analytics-attrition-signals", vendor_company_id: "", decision_stage: "workforce_aggregate_reporting", decision_role: "reports_aggregate", feeds_decision_stage: "", status: "in_use", owner_role: "Director, People", audits: ["2025-11-03"] },
  { slot: "T8", tool_name: "job description calibrator", tool_origin: "in_house_build", used_in_module: "hr-job-description-calibrator", vendor_company_id: "", decision_stage: "job_description_drafting", decision_role: "drafts_for_human", feeds_decision_stage: "", status: "in_use", owner_role: "Recruiter", audits: ["2026-04-20"] },
];

/** Auditor type by slot, and the vendor's two findings notes, constructed (data plan 2.4.2). */
const AUDITOR_BY_SLOT = { T1: "independent_auditor", T5: "vendor_commissioned" };
export const VENDOR_FINDINGS_NOTES = {
  "2025-07-14": "selection outcomes compared across the vendor's reference population; results held by the vendor under the customer agreement",
  "2024-07-15": "scoring outcomes compared across the vendor's earlier reference sample; the report is held by the vendor under the customer agreement",
};

/**
 * The five notice postings (data plan 2.4.2). `basis` names how the basis row is
 * resolved: "notice_row" is the enforceable watch list row in that jurisdiction
 * with a notice obligation in application, found by rule, never typed.
 */
export const NOTICE_DESIGN = [
  { slot: "T5", jurisdiction_code: "US-IL", basis: "notice_row", notice_channel: "careers_page", posted_date: "2026-01-05" },
  { slot: "T5", jurisdiction_code: "US-NY-NYC", basis: "notice_row", notice_channel: "careers_page", posted_date: "2026-01-05" },
  { slot: "T1", jurisdiction_code: "US-IL", basis: "notice_row", notice_channel: "careers_page", posted_date: "" },
  { slot: "T1", jurisdiction_code: "US-NY-NYC", basis: "notice_row", notice_channel: "careers_page", posted_date: "2026-01-05" },
  { slot: "T6", jurisdiction_code: "US-CA", basis: COMPANY_PRACTICE, notice_channel: "employee_intranet", posted_date: "" },
];

// ----------------------------------------------------------------- published sentences

export const STAMP_STATEMENT =
  "this artifact is dated after the pack's universe now; it records the compliance position at its own as_of "
  + "and does not move any earlier artifact's date";
export const AUDIT_CURRENCY_RULE =
  "whole months from the latest audit_date to as_of: (as_of year minus audit year) times 12 plus (as_of month minus "
  + "audit month), less one when the as_of day is earlier than the audit day; an in_use tool is current when that "
  + "figure is 12 or less";
export const AUDIT_CURRENCY_BASIS =
  "the company's standard for every people-decision tool in the inventory; it is not a statement of any "
  + "jurisdiction's rule, and the watch list records no audit cadence";
export const SCOPE_RULE =
  "a tool is in scope in a jurisdiction when its own decision_stage is a stage of an in_application obligation of an "
  + "enforceable watch-list row there or in a parent; it is scope_open when it is in_use, its decision_role is "
  + "drafts_for_human, its own stage is not such a stage and its feeds_decision_stage is; otherwise it is out of "
  + "scope. A row whose scope_text_status is not_retrieved places no tool; the tracker reports that jurisdiction as "
  + "definition_not_retrieved and cites the row";
export const NOTICE_RULE =
  "a notice is required for an in_use tool in a jurisdiction when that jurisdiction or a parent holds an enforceable "
  + "watch-list row with an in_application obligation of duty_type notice whose decision_stages contain the tool's "
  + "own decision_stage; a required notice is posted when the notice row for that tool and jurisdiction carries a "
  + "posted_date. basis_row_id is the watch list row_id a notice answers, or company_practice for a notice no row "
  + "requires. The tracker computes the audit finding and the notice finding separately, and neither reads the "
  + "other's columns; a scope_open pair's notice status is scope_open, reported with the scope finding, not as a "
  + "notice finding";
export const VENDOR_CONTENT_STATEMENT =
  "vendor_findings_note is the vendor's unpublished audit content, held under agreement; no tracker output, alert or "
  + "notice may quote it";

export const COLUMNS = {
  grammar: [
    "grammar_id", "as_of", "universe_now", "stamp_statement", "audit_currency_months",
    "audit_currency_rule", "audit_currency_basis", "use_jurisdictions", "tool_origin_vocabulary",
    "tool_status_vocabulary", "decision_role_vocabulary", "decision_stage_vocabulary",
    "auditor_type_vocabulary", "summary_publication_vocabulary", "notice_channel_vocabulary",
    "scope_rule", "notice_rule", "watch_list_as_of", "tool_count", "audit_count", "notice_count",
    "vendor_content_statement",
  ],
  tools: [
    "tool_id", "tool_name", "tool_origin", "used_in_module", "vendor_company_id", "decision_stage",
    "decision_role", "feeds_decision_stage", "status", "owner_role",
  ],
  audits: ["audit_id", "tool_id", "audit_date", "auditor_type", "summary_publication", "vendor_findings_note"],
  notices: ["notice_id", "tool_id", "jurisdiction_code", "basis_row_id", "notice_channel", "posted_date"],
};

export const FILES = {
  grammar: "aedt-grammar.csv",
  tools: "tool-inventory.csv",
  audits: "bias-audits.csv",
  notices: "notice-postings.csv",
};

const EN_DASH = String.fromCharCode(0x2013);
const EM_DASH = String.fromCharCode(0x2014);

// ----------------------------------------------------------------- rules

/** The published whole-month currency (B51). */
export function wholeMonths(auditDate, asOf = AS_OF) {
  const [ay, am, ad] = auditDate.split("-").map(Number);
  const [y, m, d] = asOf.split("-").map(Number);
  return (y - ay) * 12 + (m - am) - (d < ad ? 1 : 0);
}

/** A jurisdiction and its parents, nearest first. */
function lineage(code) {
  const parent = new Map(JURISDICTIONS.map((j) => [j.code, j.parent_code]));
  const out = [];
  for (let c = code; c; c = parent.get(c)) out.push(c);
  return out;
}

/**
 * The findings, computed from the three tables and the watch list records.
 * Tools here carry tool_id and the audit and notice rows are the emitted ones.
 */
export function computeFindings({ tools, audits, notices, records, useJurisdictions }) {
  const enforceable = records.filter((r) => r.enforceable === true);
  const placing = enforceable.filter((r) => r.scope.scope_text_status !== "not_retrieved");
  const stagesIn = (code) => {
    const set = new Set();
    for (const r of placing) {
      if (!lineage(code).includes(r.jurisdiction_code)) continue;
      for (const o of r.obligations) if (inApplication(o, AS_OF)) for (const s of o.decision_stages) set.add(s);
    }
    return set;
  };
  const noticeStagesIn = (code) => {
    const set = new Set();
    for (const r of enforceable) {
      if (!lineage(code).includes(r.jurisdiction_code)) continue;
      for (const o of r.obligations) if (o.duty_type === "notice" && inApplication(o, AS_OF)) for (const s of o.decision_stages) set.add(s);
    }
    return set;
  };
  const latest = (toolId) => audits.filter((a) => a.tool_id === toolId).map((a) => a.audit_date).sort().at(-1);
  const earliest = (toolId) => audits.filter((a) => a.tool_id === toolId).map((a) => a.audit_date).sort()[0];
  const inUse = tools.filter((t) => t.status === "in_use");

  const currency = Object.fromEntries(tools.map((t) => [t.tool_id, { months: wholeMonths(latest(t.tool_id)), days: diffDays(latest(t.tool_id), AS_OF) }]));
  const stale = inUse.filter((t) => currency[t.tool_id].months > AUDIT_CURRENCY_MONTHS);
  const staleReadings = {
    any_status: tools.filter((t) => currency[t.tool_id].months > AUDIT_CURRENCY_MONTHS).length,
    over_365_days: inUse.filter((t) => currency[t.tool_id].days > 365).length,
    twelve_or_more: inUse.filter((t) => currency[t.tool_id].months >= AUDIT_CURRENCY_MONTHS).length,
    earliest_audit: inUse.filter((t) => wholeMonths(earliest(t.tool_id)) > AUDIT_CURRENCY_MONTHS).length,
  };

  const required = [];
  for (const t of inUse) for (const j of useJurisdictions) if (noticeStagesIn(j).has(t.decision_stage)) required.push({ tool_id: t.tool_id, jurisdiction_code: j });
  const posted = (toolId, code) => notices.some((n) => n.tool_id === toolId && n.jurisdiction_code === code && n.posted_date !== "");
  const unposted = required.filter((p) => !posted(p.tool_id, p.jurisdiction_code));
  const noticeReadings = {
    required_pairs: required.length,
    tools_with_empty_posting: new Set(notices.filter((n) => n.posted_date === "").map((n) => n.tool_id)).size,
    tools_posted_somewhere: new Set(notices.filter((n) => n.posted_date !== "").map((n) => n.tool_id)).size,
  };

  const scopeOpenIn = (t, { requireInUse = true, requireFeeds = true } = {}) => useJurisdictions.filter((j) => {
    const named = stagesIn(j);
    return (!requireInUse || t.status === "in_use") && t.decision_role === "drafts_for_human"
      && !named.has(t.decision_stage) && (!requireFeeds || named.has(t.feeds_decision_stage));
  });
  const inScopeIn = (t) => useJurisdictions.filter((j) => stagesIn(j).has(t.decision_stage));
  const scopeOpen = inUse.filter((t) => scopeOpenIn(t).length > 0).map((t) => ({ tool_id: t.tool_id, jurisdictions: scopeOpenIn(t) }));
  const inScope = inUse.filter((t) => inScopeIn(t).length > 0).map((t) => t.tool_id);
  const outOfScope = inUse.filter((t) => inScopeIn(t).length === 0 && scopeOpenIn(t).length === 0).map((t) => t.tool_id);
  const scopeReadings = {
    without_in_use: tools.filter((t) => scopeOpenIn(t, { requireInUse: false }).length > 0).length,
    without_feeds: inUse.filter((t) => scopeOpenIn(t, { requireFeeds: false }).length > 0).length,
  };
  const notRetrieved = useJurisdictions.filter((j) => enforceable.some((r) => r.jurisdiction_code === j && r.scope.scope_text_status === "not_retrieved"));

  return { currency, stale, staleReadings, required, unposted, noticeReadings, scopeOpen, inScope, outOfScope, scopeReadings, notRetrieved };
}

// ----------------------------------------------------------------- the build

export function buildAedtInventory() {
  const { records } = buildWatchList();
  const useJurisdictions = locationJurisdictionCodes();
  const codes = new Set(JURISDICTIONS.map((j) => j.code));
  const fail = (message) => { throw new Error(`${E}: ${message}`); };
  if (WATCH_LIST_AS_OF !== AS_OF) fail("the watch list's as_of disagrees");
  for (const code of useJurisdictions) if (!codes.has(code)) fail(`use jurisdiction ${code} misses the watch list`);

  // ---- tools, ids by name
  const sorted = TOOL_LIBRARY.slice().sort((a, b) => a.tool_name.localeCompare(b.tool_name));
  const idBySlot = new Map(sorted.map((t, i) => [t.slot, `AIT-${String(i + 1).padStart(2, "0")}`]));
  const tools = sorted.map((t) => ({
    tool_id: idBySlot.get(t.slot), tool_name: t.tool_name, tool_origin: t.tool_origin, used_in_module: t.used_in_module,
    vendor_company_id: t.vendor_company_id, decision_stage: t.decision_stage, decision_role: t.decision_role,
    feeds_decision_stage: t.feeds_decision_stage, status: t.status, owner_role: t.owner_role,
  }));

  // ---- audits, ids by (audit_date, tool_id)
  const auditDrafts = TOOL_LIBRARY.flatMap((t) => t.audits.map((date) => ({
    tool_id: idBySlot.get(t.slot), audit_date: date,
    auditor_type: AUDITOR_BY_SLOT[t.slot] ?? "internal_review",
    summary_publication: t.tool_origin === "third_party_module" ? "unpublished" : "published",
    vendor_findings_note: t.tool_origin === "third_party_module" ? VENDOR_FINDINGS_NOTES[date] : "",
  })));
  auditDrafts.sort((a, b) => a.audit_date.localeCompare(b.audit_date) || a.tool_id.localeCompare(b.tool_id));
  const audits = auditDrafts.map((a, i) => ({ audit_id: `BAU-${String(i + 1).padStart(4, "0")}`, ...a }));

  // ---- notices, basis resolved by rule, ids by (tool_id, jurisdiction_code)
  const noticeRow = (code) => {
    const rows = records.filter((r) => r.enforceable === true && r.jurisdiction_code === code
      && r.obligations.some((o) => o.duty_type === "notice" && inApplication(o, AS_OF)));
    if (rows.length !== 1) fail(`${rows.length} enforceable rows in ${code} carry a notice obligation in application, expected 1`);
    return rows[0].row_id;
  };
  const noticeDrafts = NOTICE_DESIGN.map((n) => ({
    tool_id: idBySlot.get(n.slot), jurisdiction_code: n.jurisdiction_code,
    basis_row_id: n.basis === COMPANY_PRACTICE ? COMPANY_PRACTICE : noticeRow(n.jurisdiction_code),
    notice_channel: n.notice_channel, posted_date: n.posted_date,
  }));
  noticeDrafts.sort((a, b) => a.tool_id.localeCompare(b.tool_id) || a.jurisdiction_code.localeCompare(b.jurisdiction_code));
  const notices = noticeDrafts.map((n, i) => ({ notice_id: `NTC-${String(i + 1).padStart(4, "0")}`, ...n }));

  const grammar = {
    grammar_id: GRAMMAR_ID,
    as_of: AS_OF,
    universe_now: UNIVERSE_NOW,
    stamp_statement: STAMP_STATEMENT,
    audit_currency_months: AUDIT_CURRENCY_MONTHS,
    audit_currency_rule: AUDIT_CURRENCY_RULE,
    audit_currency_basis: AUDIT_CURRENCY_BASIS,
    use_jurisdictions: useJurisdictions.join("; "),
    tool_origin_vocabulary: TOOL_ORIGINS.join("; "),
    tool_status_vocabulary: TOOL_STATUSES.join("; "),
    decision_role_vocabulary: DECISION_ROLES.join("; "),
    decision_stage_vocabulary: DECISION_STAGES.join("; "),
    auditor_type_vocabulary: AUDITOR_TYPES.join("; "),
    summary_publication_vocabulary: SUMMARY_PUBLICATIONS.join("; "),
    notice_channel_vocabulary: NOTICE_CHANNELS.join("; "),
    scope_rule: SCOPE_RULE,
    notice_rule: NOTICE_RULE,
    watch_list_as_of: WATCH_LIST_AS_OF,
    tool_count: tools.length,
    audit_count: audits.length,
    notice_count: notices.length,
    vendor_content_statement: VENDOR_CONTENT_STATEMENT,
  };

  assertPostConditions({ tools, audits, notices, records, useJurisdictions, idBySlot });
  return { grammar, tools, audits, notices };
}

function assertPostConditions({ tools, audits, notices, records, useJurisdictions, idBySlot }) {
  const fail = (message) => { throw new Error(`${E}: ${message}`); };
  const slotOf = new Map([...idBySlot].map(([slot, toolId]) => [toolId, slot]));
  const slots = (list) => list.map((toolId) => slotOf.get(toolId)).sort().join(",");

  // ---- the library
  if (tools.length !== 8 || audits.length !== 10 || notices.length !== 5) fail("the table sizes moved");
  for (const t of tools) {
    if (!TOOL_ORIGINS.includes(t.tool_origin) || !TOOL_STATUSES.includes(t.status) || !DECISION_ROLES.includes(t.decision_role)
      || !DECISION_STAGES.includes(t.decision_stage) || !OWNER_ROLES.includes(t.owner_role)) fail(`${t.tool_id} leaves a vocabulary`);
    if (t.feeds_decision_stage && !DECISION_STAGES.includes(t.feeds_decision_stage)) fail(`${t.tool_id} feeds a stage outside the vocabulary`);
    const third = t.tool_origin === "third_party_module";
    if (third !== (t.vendor_company_id !== "")) fail(`${t.tool_id}'s vendor id disagrees with its origin`);
    if (t.vendor_company_id && t.vendor_company_id !== VENDOR_COMPANY_ID) fail(`${t.tool_id} names a vendor other than ${VENDOR_COMPANY_ID}`);
    if (third ? t.used_in_module !== "" : !PEOPLE_HR_SLUGS_BELOW_31.includes(t.used_in_module)) fail(`${t.tool_id}'s module is not a people-hr slug below 31`);
    for (const name of VENDOR_DENYLIST) if (new RegExp(`\\b${name}\\b`, "i").test(t.tool_name)) fail(`${t.tool_id}'s name carries a real vendor or product`);
  }
  if (tools.filter((t) => t.vendor_company_id === VENDOR_COMPANY_ID).length !== 1) fail("the vendor module is not one tool");
  for (const a of audits) {
    if (isWeekend(a.audit_date) || a.audit_date > AS_OF) fail("an audit falls on a weekend or after the as_of");
    const vendor = tools.find((t) => t.tool_id === a.tool_id).tool_origin === "third_party_module";
    if (vendor !== (a.vendor_findings_note !== "")) fail("a vendor findings note sits off the vendor's rows");
    if (vendor !== (a.summary_publication === "unpublished")) fail("summary publication disagrees with the vendor rows");
  }
  if (audits.filter((a) => a.vendor_findings_note !== "").length !== 2) fail("the vendor findings notes are not two");
  const codes = new Set(JURISDICTIONS.map((j) => j.code));
  const rowIds = new Set(records.map((r) => r.row_id));
  for (const n of notices) {
    if (!codes.has(n.jurisdiction_code) || !useJurisdictions.includes(n.jurisdiction_code)) fail("a notice jurisdiction does not resolve");
    if (n.basis_row_id !== COMPANY_PRACTICE && !rowIds.has(n.basis_row_id)) fail("a basis_row_id misses the watch list");
    if (!NOTICE_CHANNELS.includes(n.notice_channel)) fail("a notice channel outside the vocabulary");
    if (n.posted_date && (isWeekend(n.posted_date) || n.posted_date > AS_OF)) fail("a posting falls on a weekend or after the as_of");
  }

  const f = computeFindings({ tools, audits, notices, records, useJurisdictions });
  // ---- B51's worked example and HR-16a
  if (wholeMonths("2025-07-14") !== 13 || wholeMonths("2025-08-20") !== 12 || diffDays("2025-08-20", AS_OF) !== 377) fail("the worked example of B51 moved");
  if (slots(f.stale.map((t) => t.tool_id)) !== "T5") fail(`HR-16a selects ${slots(f.stale.map((t) => t.tool_id)) || "nothing"}, expected the one designed tool`);
  const r = f.staleReadings;
  if (r.any_status !== 2 || r.over_365_days !== 2 || r.twelve_or_more !== 2 || r.earliest_audit !== 2) fail(`the HR-16a readings are ${JSON.stringify(r)}, expected 2, 2, 2, 2`);
  // ---- HR-16b
  if (f.unposted.length !== 1 || slotOf.get(f.unposted[0].tool_id) !== "T1" || f.unposted[0].jurisdiction_code !== "US-IL") fail(`HR-16b returns ${JSON.stringify(f.unposted)}`);
  const n = f.noticeReadings;
  if (n.required_pairs !== 2 || n.tools_with_empty_posting !== 2 || n.tools_posted_somewhere !== 2) fail(`the HR-16b readings are ${JSON.stringify(n)}, expected 2, 2, 2`);
  if (f.stale[0].tool_id === f.unposted[0].tool_id) fail("HR-16a and HR-16b sit on one tool");
  // ---- scope (2.4.4)
  if (f.scopeOpen.length !== 1 || slotOf.get(f.scopeOpen[0].tool_id) !== "T2" || f.scopeOpen[0].jurisdictions.join(",") !== "US-CA,US-IL") fail(`scope_open returns ${JSON.stringify(f.scopeOpen)}`);
  if (slots(f.inScope) !== "T1,T5") fail(`in scope returns ${slots(f.inScope)}`);
  if (slots(f.outOfScope) !== "T4,T6,T7,T8") fail(`out of scope returns ${slots(f.outOfScope)}`);
  if (f.scopeReadings.without_in_use !== 2 || f.scopeReadings.without_feeds !== 2) fail(`the scope near misses are ${JSON.stringify(f.scopeReadings)}, expected 2 and 2`);
  if (f.notRetrieved.join(",") !== "US-NY-NYC") fail(`definition_not_retrieved returns ${f.notRetrieved.join(",") || "nothing"}`);
}

function assertEmittedBytes(files) {
  for (const file of files) {
    const text = file.content;
    if (text.includes(EN_DASH) || text.includes(EM_DASH)) throw new Error(`${E}: ${file.path} carries a dash this pack does not write`);
    if (text.includes("$") || text.includes("%") || /https?:\/\/|www\./.test(text)) throw new Error(`${E}: ${file.path} carries money, a percent or a URL`);
    for (const name of VENDOR_DENYLIST) if (new RegExp(`\\b${name}\\b`).test(text)) throw new Error(`${E}: ${file.path} carries a real vendor or product name`);
    if (/(^|[^A-Za-z])(HRC|HRQ|DEP|RVA|BND|MSD|ESR|EXT|RQN|BEN|LVR|LCO|OBR)-[0-9]/m.test(text) || text.includes("EMP-")) {
      throw new Error(`${E}: ${file.path} carries an id from another block or an employee id`);
    }
  }
  for (const prefix of ["AIT-", "BAU-", "NTC-"]) assertPrefixUnusedElsewhere(prefix, OWN_DIR, E);
}

export function generate() {
  const { grammar, tools, audits, notices } = buildAedtInventory();
  const files = [
    { path: FILES.grammar, content: toCsv(COLUMNS.grammar, [grammar]) },
    { path: FILES.tools, content: toCsv(COLUMNS.tools, tools) },
    { path: FILES.audits, content: toCsv(COLUMNS.audits, audits) },
    { path: FILES.notices, content: toCsv(COLUMNS.notices, notices) },
  ];
  assertEmittedBytes(files);
  return files;
}

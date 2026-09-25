// HR-16 aedt-inventory-audit-log: the guard over the tool inventory, the audit
// log and the notice log, HR-C8-T20 to HR-C8-T27 of the people-hr cluster 8
// data plan. T27 is the cluster 8 token sweep over every C8 byte.
//
// Every arm reads the committed bytes. The vocabularies, the module slugs and
// the tool library's design values are restated literally below. Audit
// currency, the notice requirement and the scope rule are recomputed in this
// file's own code, and HR-16b is recomputed from the committed watch list jsonl,
// never from the generator. No plant tool is named by id; each is one
// application of a published rule away.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { csvTable } from "../helpers/csv-table.js";
import { moneyMatches } from "../helpers/money-shape.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const spec = specs.byId.get("HR-16");
const read = (...parts) => readFileSync(join(REPO_ROOT, ...parts), "utf8");
const table = (...parts) => csvTable(read(...parts));
const DIR = ["datasets", "hr", "aedt-inventory-audit-log"];
const hr16 = (file) => table(...DIR, file);

const AS_OF = "2026-09-01";
const EM = String.fromCharCode(0x2014);
const EN = String.fromCharCode(0x2013);

const VOCAB = {
  tool_origin: ["in_house_build", "third_party_module"],
  tool_status: ["in_use", "paused"],
  decision_role: ["ranks_or_filters", "drafts_for_human", "schedules_or_routes", "scores_or_ranks", "recommends_to_employee", "reports_aggregate"],
  decision_stage: [
    "recruitment_selection", "promotion", "termination_discipline", "terms_and_conditions", "training_selection",
    "task_allocation", "performance_evaluation", "pay_determination", "solely_automated_decision",
    "interview_feedback", "interview_scheduling", "learning_recommendation", "workforce_aggregate_reporting", "job_description_drafting",
  ],
  auditor_type: ["independent_auditor", "vendor_commissioned", "internal_review"],
  summary_publication: ["published", "unpublished"],
  notice_channel: ["careers_page", "employee_intranet"],
};

/** The people-hr modules the in-house tools come from, with their order (all below 31). */
const MODULE_ORDER = {
  "hr-job-description-calibrator": 11, "hr-interview-schedule-proposer": 13, "hr-interview-notes-to-feedback": 14,
  "hr-resume-screening-shortlist": 15, "hr-review-writing-assistant": 20, "hr-learning-pathway-planner": 22,
  "hr-people-analytics-attrition-signals": 24,
};

/** Each tool's whole-month currency from its latest audit, by name (B51). */
const WHOLE_MONTHS = {
  "resume screening and shortlist assistant": 6, "performance review writing assistant": 10,
  "interview notes to feedback drafter": 17, "interview panel scheduling proposer": 12,
  "candidate assessment scoring module": 13, "learning pathway planner": 7,
  "attrition signal dashboard": 9, "job description calibrator": 4,
};

const DENYLIST = [
  "Workday", "HireVue", "Pymetrics", "Greenhouse", "Lever", "iCIMS", "SuccessFactors", "Taleo", "Oracle",
  "BambooHR", "ADP", "Eightfold", "Paradox", "HireRight", "Textio", "Lattice", "Culture Amp", "Beamery",
  "Phenom", "SmartRecruiters", "Jobvite", "Cornerstone", "Gusto", "Rippling", "Harver", "Modern Hire",
  "Visier", "Glint", "Qualtrics", "Peakon", "LinkedIn", "Indeed", "TalentForce",
];

// ----------------------------------------------------------------- own rule code

const wholeMonths = (audit, asOf = AS_OF) => {
  const [ay, am, ad] = audit.split("-").map(Number);
  const [y, m, d] = asOf.split("-").map(Number);
  return (y - ay) * 12 + (m - am) - (d < ad ? 1 : 0);
};
const days = (a, b) => (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000;

const tools = () => hr16("tool-inventory.csv").rows;
const audits = () => hr16("bias-audits.csv").rows;
const notices = () => hr16("notice-postings.csv").rows;
const grammar = () => hr16("aedt-grammar.csv").rows[0];
const watchList = () => read("datasets", "hr", "employment-ai-watch-list", "employment-ai-watch-list.jsonl")
  .trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
const jurisdictions = () => table("datasets", "hr", "employment-ai-watch-list", "jurisdictions.csv").rows;
const useJurisdictions = () => grammar().use_jurisdictions.split("; ");

const latest = (toolId) => audits().filter((a) => a.tool_id === toolId).map((a) => a.audit_date).sort().at(-1);
const earliest = (toolId) => audits().filter((a) => a.tool_id === toolId).map((a) => a.audit_date).sort()[0];

/** The watch list read once: lineage, the in-application rule and the two stage sets. */
function watch() {
  const parent = new Map(jurisdictions().map((j) => [j.code, j.parent_code]));
  const lineage = (code) => { const out = []; for (let c = code; c; c = parent.get(c)) out.push(c); return out; };
  const inApp = (o) => (o.application_status === "awaiting_transposition" ? false
    : o.applies_from === "" ? o.application_status === "in_application" : o.applies_from <= AS_OF);
  const records = watchList();
  const enforceable = records.filter((r) => r.enforceable === true);
  const stages = (code, { noticeOnly = false } = {}) => {
    const set = new Set();
    for (const r of enforceable) {
      if (!lineage(code).includes(r.jurisdiction_code)) continue;
      if (!noticeOnly && r.scope.scope_text_status === "not_retrieved") continue;
      for (const o of r.obligations) {
        if (!inApp(o) || (noticeOnly && o.duty_type !== "notice")) continue;
        for (const s of o.decision_stages) set.add(s);
      }
    }
    return set;
  };
  return { records, enforceable, stages, inApp };
}

test("HR-C8-T20: HR-16 files and columns; eight tools, ids in name order; slugs are people-hr modules below 31; co-106 only", () => {
  assert.deepEqual(readdirSync(join(REPO_ROOT, ...DIR)).sort(), Object.keys(spec.files).sort());
  for (const [file, columns] of Object.entries(spec.files)) assert.deepEqual(hr16(file).cols, columns, file);
  const g = grammar();
  assert.equal(hr16("aedt-grammar.csv").rows.length, 1);
  assert.equal(g.grammar_id, "AEDT-GRAMMAR-2026-09-01");
  assert.equal(g.as_of, AS_OF);
  assert.equal(g.watch_list_as_of, AS_OF);
  assert.equal(g.audit_currency_months, "12");
  assert.equal(g.use_jurisdictions, "US-CA; US-CO; US-DE; US-IL; US-NY; US-NY-NYC");
  for (const [name, values] of Object.entries(VOCAB)) assert.equal(g[`${name}_vocabulary`], values.join("; "), name);
  assert.equal(g.tool_count, "8");
  assert.equal(g.audit_count, "10");
  assert.equal(g.notice_count, "5");
  // use_jurisdictions is HR-15's location table, not a typed list.
  const located = new Set();
  for (const r of table("datasets", "hr", "multistate-leave-compliance-roster", "employee-work-locations.csv").rows) {
    located.add(r.work_state);
    if (r.work_locality) located.add(r.work_locality);
  }
  assert.deepEqual([...located].sort(), useJurisdictions());
  const rows = tools();
  assert.equal(rows.length, 8);
  const names = rows.map((t) => t.tool_name);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
  rows.forEach((t, i) => {
    assert.equal(t.tool_id, `AIT-${String(i + 1).padStart(2, "0")}`);
    assert.ok(VOCAB.tool_origin.includes(t.tool_origin) && VOCAB.tool_status.includes(t.status) && VOCAB.decision_role.includes(t.decision_role));
    assert.ok(VOCAB.decision_stage.includes(t.decision_stage));
    if (t.feeds_decision_stage) assert.ok(VOCAB.decision_stage.includes(t.feeds_decision_stage));
    if (t.tool_origin === "third_party_module") {
      assert.equal(t.vendor_company_id, "co-106");
      assert.equal(t.used_in_module, "");
    } else {
      assert.equal(t.vendor_company_id, "");
      assert.ok(MODULE_ORDER[t.used_in_module] < 31, `${t.used_in_module} is not a people-hr module below 31`);
    }
    for (const name of DENYLIST) assert.doesNotMatch(t.tool_name, new RegExp(`\\b${name}\\b`, "i"));
    assert.ok(t.tool_name in WHOLE_MONTHS);
  });
  assert.equal(rows.filter((t) => t.vendor_company_id !== "").length, 1);
  assert.equal(new Set(rows.map((t) => t.used_in_module).filter(Boolean)).size, 7);
  audits().forEach((a, i) => {
    assert.equal(a.audit_id, `BAU-${String(i + 1).padStart(4, "0")}`);
    if (i > 0) assert.ok(`${audits()[i - 1].audit_date}|${audits()[i - 1].tool_id}` < `${a.audit_date}|${a.tool_id}`);
  });
  notices().forEach((n, i) => {
    assert.equal(n.notice_id, `NTC-${String(i + 1).padStart(4, "0")}`);
    if (i > 0) assert.ok(`${notices()[i - 1].tool_id}|${notices()[i - 1].jurisdiction_code}` < `${n.tool_id}|${n.jurisdiction_code}`);
  });
});

test("HR-C8-T21: HR-16 whole-month currency recomputes for every tool, with the worked example of B51", () => {
  assert.equal(wholeMonths("2025-07-14"), 13);
  assert.equal(wholeMonths("2025-08-20"), 12);
  assert.equal(days("2025-08-20", AS_OF), 377);
  assert.match(grammar().audit_currency_rule, /less one when the as_of day is earlier than the audit day/);
  assert.match(grammar().audit_currency_basis, /not a statement of any jurisdiction's rule/);
  for (const t of tools()) assert.equal(wholeMonths(latest(t.tool_id)), WHOLE_MONTHS[t.tool_name], t.tool_name);
  for (const a of audits()) {
    assert.ok(a.audit_date <= AS_OF);
    assert.ok(![0, 6].includes(new Date(`${a.audit_date}T00:00:00Z`).getUTCDay()));
  }
});

test("HR-C8-T22: HR-16a one stale in-use tool; 2, 2, 2 for the three readings", () => {
  const all = tools();
  const inUse = all.filter((t) => t.status === "in_use");
  const months = (t) => wholeMonths(latest(t.tool_id));
  assert.equal(inUse.filter((t) => months(t) > 12).length, 1, "HR-16a");
  assert.equal(all.filter((t) => months(t) > 12).length, 2, "dropping in_use");
  assert.equal(inUse.filter((t) => days(latest(t.tool_id), AS_OF) > 365).length, 2, "reading the standard as 365 days");
  assert.equal(inUse.filter((t) => months(t) >= 12).length, 2, "reading 12 or more");
  assert.equal(inUse.filter((t) => wholeMonths(earliest(t.tool_id)) > 12).length, 2, "taking the earliest audit");
});

test("HR-C8-T23: HR-16b one required unposted notice, recomputed from the committed HR-21 jsonl; 2, 2, 2", () => {
  const { records, stages } = watch();
  const inUse = tools().filter((t) => t.status === "in_use");
  const required = [];
  for (const t of inUse) for (const j of useJurisdictions()) if (stages(j, { noticeOnly: true }).has(t.decision_stage)) required.push([t.tool_id, j]);
  const posted = (toolId, j) => notices().some((n) => n.tool_id === toolId && n.jurisdiction_code === j && n.posted_date !== "");
  assert.equal(required.filter(([t, j]) => !posted(t, j)).length, 1, "HR-16b");
  assert.equal(required.length, 2, "required pairs");
  assert.equal(new Set(required.map(([, j]) => j)).size, 1, "both required pairs sit in one jurisdiction");
  assert.equal(new Set(notices().filter((n) => n.posted_date === "").map((n) => n.tool_id)).size, 2, "tools with an empty posting");
  assert.equal(new Set(notices().filter((n) => n.posted_date !== "").map((n) => n.tool_id)).size, 2, "tools posted somewhere");
  const finding = required.find(([t, j]) => !posted(t, j));
  assert.ok(notices().some((n) => n.tool_id === finding[0] && n.posted_date !== ""), "the finding's tool has posted a notice somewhere");
  // basis_row_id resolves, and a row id basis is a row with a notice obligation in application there.
  const ids = new Map(records.map((r) => [r.row_id, r]));
  for (const n of notices()) {
    if (n.basis_row_id === "company_practice") {
      assert.ok(!required.some(([t, j]) => t === n.tool_id && j === n.jurisdiction_code), "a company practice notice is required");
      continue;
    }
    const row = ids.get(n.basis_row_id);
    assert.ok(row, "a basis_row_id misses the watch list");
    assert.equal(row.jurisdiction_code, n.jurisdiction_code);
    assert.equal(row.enforceable, true);
    assert.ok(row.obligations.some((o) => o.duty_type === "notice"));
    assert.ok(VOCAB.notice_channel.includes(n.notice_channel));
  }
});

test("HR-C8-T24: HR-16a and HR-16b are different tools", () => {
  const { stages } = watch();
  const inUse = tools().filter((t) => t.status === "in_use");
  const stale = inUse.filter((t) => wholeMonths(latest(t.tool_id)) > 12).map((t) => t.tool_id);
  const unposted = [];
  for (const t of inUse) {
    for (const j of useJurisdictions()) {
      if (!stages(j, { noticeOnly: true }).has(t.decision_stage)) continue;
      if (!notices().some((n) => n.tool_id === t.tool_id && n.jurisdiction_code === j && n.posted_date !== "")) unposted.push(t.tool_id);
    }
  }
  assert.equal(stale.length, 1);
  assert.equal(unposted.length, 1);
  assert.notEqual(stale[0], unposted[0]);
});

test("HR-C8-T25: HR-16 scope_open is one tool in two jurisdictions; the two near misses; New York City places no tool", () => {
  const { enforceable, stages } = watch();
  const all = tools();
  const open = (t, { inUse = true, feeds = true } = {}) => useJurisdictions().filter((j) => {
    const named = stages(j);
    return (!inUse || t.status === "in_use") && t.decision_role === "drafts_for_human"
      && !named.has(t.decision_stage) && (!feeds || named.has(t.feeds_decision_stage));
  });
  const scopeOpen = all.filter((t) => open(t).length > 0);
  assert.equal(scopeOpen.length, 1, "scope_open");
  assert.equal(open(scopeOpen[0]).length, 2, "the scope_open tool's jurisdictions");
  assert.equal(all.filter((t) => open(t, { inUse: false }).length > 0).length, 2, "dropping in_use adds the paused tool");
  assert.equal(all.filter((t) => open(t, { feeds: false }).length > 0).length, 2, "dropping the feeds clause adds the tool feeding nothing");
  const inUse = all.filter((t) => t.status === "in_use");
  const inScope = inUse.filter((t) => useJurisdictions().some((j) => stages(j).has(t.decision_stage)));
  assert.equal(inScope.length, 2);
  assert.equal(inUse.length - inScope.length - scopeOpen.length, 4, "out of scope");
  const notRetrieved = useJurisdictions().filter((j) => enforceable.some((r) => r.jurisdiction_code === j && r.scope.scope_text_status === "not_retrieved"));
  assert.deepEqual(notRetrieved, ["US-NY-NYC"]);
  for (const r of enforceable.filter((x) => x.jurisdiction_code === "US-NY-NYC")) {
    for (const o of r.obligations) assert.deepEqual(o.decision_stages, [], "the New York City row carries a decision stage");
  }
  assert.match(grammar().scope_rule, /A row whose scope_text_status is not_retrieved places no tool; the tracker reports that jurisdiction as definition_not_retrieved and cites the row$/);
});

test("HR-C8-T26: HR-16 vendor findings notes only on the vendor rows; no money, percentage, URL, person, product or dash", () => {
  const vendorTools = new Set(tools().filter((t) => t.tool_origin === "third_party_module").map((t) => t.tool_id));
  for (const a of audits()) {
    assert.equal(a.vendor_findings_note !== "", vendorTools.has(a.tool_id), "a vendor findings note sits off the vendor rows");
    assert.equal(a.summary_publication === "unpublished", vendorTools.has(a.tool_id));
    assert.ok(VOCAB.auditor_type.includes(a.auditor_type));
  }
  assert.equal(audits().filter((a) => a.vendor_findings_note !== "").length, 2);
  const notes = audits().map((a) => a.vendor_findings_note).filter(Boolean);
  const names = table("datasets", "core", "people-roster", "people-roster.csv").rows.map((r) => `${r.first_name} ${r.last_name}`);
  for (const file of readdirSync(join(REPO_ROOT, ...DIR))) {
    const text = read(...DIR, file);
    assert.ok(!text.includes(EM) && !text.includes(EN), `${file} carries a dash`);
    assert.ok(!/https?:\/\/|www\.|@|\$|%/.test(text), `${file} carries a URL, an email, money or a percent`);
    assert.doesNotMatch(text, /(^|[^A-Za-z])EMP-[0-9]/m, `${file} carries an employee id`);
    for (const name of names) assert.ok(!text.includes(name), `${file} carries a roster name`);
    for (const name of DENYLIST) assert.doesNotMatch(text, new RegExp(`\\b${name}\\b`), `${file} carries ${name}`);
    for (const row of hr16(file).rows) for (const cell of Object.values(row)) assert.deepEqual(moneyMatches(cell), [], `${file} carries a money shape`);
    if (file !== "bias-audits.csv") for (const note of notes) assert.ok(!text.includes(note), `${file} quotes the vendor findings`);
  }
  for (const source of ["datagen/src/generators/hr-16-aedt-inventory.js", "tests/generators/hr-16-aedt-inventory.test.js"]) {
    const text = read(source);
    assert.ok(!text.includes(String.fromCharCode(0x2014)) && !text.includes(String.fromCharCode(0x2013)), `${source} carries a dash`);
  }
});

test("HR-C8-T27: C8 one token sweep over every C8 byte (X47), C8's blocks nowhere else, each C8 source free of dashes", () => {
  const c8Dirs = ["employment-ai-watch-list", "multistate-leave-compliance-roster", "aedt-inventory-audit-log"];
  const foreign = /(^|[^A-Za-z])(HRC|HRQ|DEP|RVA|BND|MSD|ESR|EXT|RQN|BEN)-[0-9]/m;
  for (const dir of c8Dirs) {
    for (const name of readdirSync(join(REPO_ROOT, "datasets", "hr", dir))) {
      const text = read("datasets", "hr", dir, name);
      assert.doesNotMatch(text, foreign, `${dir}/${name} carries a token from another block`);
      assert.ok(!text.includes("EMP-0601"), `${dir}/${name} carries EMP-0601`);
      assert.ok(!text.includes(EM) && !text.includes(EN), `${dir}/${name} carries a dash`);
      assert.ok(!/https?:\/\/|www\./.test(text), `${dir}/${name} carries a URL`);
      assert.ok(!text.includes("$"), `${dir}/${name} carries a currency symbol`);
    }
  }
  // EAW- is HR-21's block; HR-16's notice log cites it by basis_row_id.
  const own = {
    "EAW-": ["datasets/hr/employment-ai-watch-list/", "datasets/hr/aedt-inventory-audit-log/"],
    "LVR-": ["datasets/hr/multistate-leave-compliance-roster/"],
    "LCO-": ["datasets/hr/multistate-leave-compliance-roster/"],
    "OBR-": ["datasets/hr/multistate-leave-compliance-roster/"],
    "AIT-": ["datasets/hr/aedt-inventory-audit-log/"],
    "BAU-": ["datasets/hr/aedt-inventory-audit-log/"],
    "NTC-": ["datasets/hr/aedt-inventory-audit-log/"],
  };
  for (const top of ["datasets", "artifacts", "canon"]) {
    for (const name of readdirSync(join(REPO_ROOT, top), { recursive: true }).map(String)) {
      if (!/\.(csv|json|jsonl|md)$/.test(name)) continue;
      const rel = `${top}/${name}`;
      const text = read(top, name);
      for (const [prefix, homes] of Object.entries(own)) {
        if (homes.some((h) => rel.startsWith(h))) continue;
        assert.doesNotMatch(text, new RegExp(`(^|[^A-Za-z])${prefix}[0-9]`, "m"), `${rel} carries a ${prefix} token`);
      }
    }
  }
  const sources = [
    "datagen/src/generators/hr-21-employment-ai-watch-list.js", "datagen/src/generators/hr-15-leave-compliance-roster.js",
    "datagen/src/generators/hr-16-aedt-inventory.js", "tests/generators/hr-15-leave-compliance-roster.test.js",
    "tests/generators/hr-16-aedt-inventory.test.js",
  ];
  const hr21Test = readdirSync(join(REPO_ROOT, "tests", "generators")).filter((n) => n.startsWith("hr-21-"));
  for (const source of [...sources, ...hr21Test.map((n) => `tests/generators/${n}`)]) {
    const text = read(source);
    assert.ok(!text.includes(String.fromCharCode(0x2014)) && !text.includes(String.fromCharCode(0x2013)), `${source} carries a dash`);
  }
});

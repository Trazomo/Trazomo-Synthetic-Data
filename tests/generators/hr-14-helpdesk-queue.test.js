// HR-14 helpdesk-request-queue: the guard over the intake queue and the
// cluster 7 cross-artifact sweep, HR-C7-T19 to HR-C7-T25 of the people-hr
// cluster 7 data plan. (HR-C7-T26, byte stability against origin/main, is a
// controller receipt in the PR body rather than a test.)
//
// The routing table and the term list are restated literally below and applied
// by this file's own matcher, never by the generator's; the generator's exported
// copies are imported only to assert they still equal these. The requester pool
// is recomputed from committed bytes. The answerability map pins each library
// slot, keyed by its subject line, to a document id and a section number that
// must exist in the committed CORE-05 or HR-19 markdown; it pins ids, never
// answer text.
//
// No test names which request is mis-categorized or which carries the special
// category term. Both are found by applying the table and asserted by count.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { addDays, isWeekend } from "../../datagen/src/dates.js";
import { csvTable } from "../helpers/csv-table.js";
import { moneyMatches } from "../helpers/money-shape.js";
import { ROUTING_TABLE, SPECIAL_CATEGORY_TERMS } from "../../datagen/src/generators/hr-14-helpdesk-queue.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const spec = specs.byId.get("HR-14");
const read = (...parts) => readFileSync(join(REPO_ROOT, ...parts), "utf8");
const table = (...parts) => csvTable(read(...parts));
const hr14 = (file) => table("datasets", "hr", "helpdesk-request-queue", file);

const WINDOW = ["2026-03-23", "2026-04-03"];
const CHANNELS = ["helpdesk_form", "email", "chat"];

// The routing table, restated.
const ROUTES = [
  ["RTE-01", "1", "special_category_term", "any", "special-category-terms.csv", "human_only_review", "human_only"],
  ["RTE-02", "2", "content_topic", "benefits", "medical plan; dental; vision; 401(k); life insurance; flexible spending; health savings account; commuter benefit; open enrollment", "benefits_administration", "auto_draft_allowed"],
  ["RTE-03", "2", "content_topic", "leave_and_time_off", "paid time off; sick leave; parental leave; leave of absence; bereavement", "leave_administration", "auto_draft_allowed"],
  ["RTE-04", "2", "content_topic", "pay_and_payroll", "pay date; overtime; W-2", "payroll", "auto_draft_allowed"],
  ["RTE-05", "2", "content_topic", "policies_and_handbook", "remote work; expense report; own phone", "people_operations", "auto_draft_allowed"],
  ["RTE-06", "2", "content_topic", "personal_details", "home address; legal name", "people_operations", "auto_draft_allowed"],
  ["RTE-07", "2", "content_topic", "workplace_concern", "complaint; retaliation", "employee_relations", "human_only"],
];

// The special category list, restated.
const TERMS = [
  ["diagnosed", "health"], ["diagnosis", "health"], ["medical condition", "health"], ["disability", "health"],
  ["pregnancy", "health"], ["pregnant", "health"], ["mental health", "health"], ["medication", "health"],
  ["trade union", "trade_union"], ["union representative", "trade_union"], ["union membership", "trade_union"],
  ["religious", "religion"], ["sexual orientation", "sexual_orientation"], ["ethnic origin", "ethnic_origin"],
  ["genetic", "genetic"],
];

// Slot order and answerability, keyed by subject. Each source is a document id
// and, where the document is sectioned for the question, a section number.
const SLOTS = [
  ["Open enrollment dates", ["ADI-BNF-007", 4]],
  ["Which option allows a health savings account", ["ADI-BNF-005", 4]],
  ["How much life insurance", ["ADI-BNF-004", 4]],
  ["Commuter benefit for a transit pass", ["ADI-BNF-005", 4]],
  ["New frames", ["ADI-BNF-003", 4]],
  ["Company match", ["ADI-BNF-008", 4]],
  ["Pay dates", ["ADI-HR-001", 5]],
  ["Overtime approval", ["ADI-HR-001", 4]],
  ["Copy of my W-2", "neither"],
  ["Carrying over time off", ["ADI-HR-001", 6]],
  ["Parental leave eligibility", ["ADI-HR-001", 8]],
  ["Bereavement days", ["ADI-HR-001", 8]],
  ["Time off next month", "human_only"],
  ["Working remotely", ["ADI-POL-002", null]],
  ["Expense report deadline", ["ADI-POL-005", null]],
  ["Work email on my own phone", ["ADI-POL-003", null]],
  ["New home address", "neither"],
  ["Legal name change", "neither"],
  ["Raising a complaint", ["ADI-HR-001", 13]],
  ["Reporting without retaliation", ["ADI-HR-001", 13]],
];
const slotOf = new Map(SLOTS.map(([subject], i) => [subject, i]));

const escape = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const carries = (text, term, flags = "i") => new RegExp(`(?<![A-Za-z0-9])${escape(term)}(?![A-Za-z0-9])`, flags).test(text);
const topicRules = ROUTES.filter((r) => r[2] === "content_topic");
const topicsOf = (text) => topicRules.filter((r) => r[4].split("; ").some((t) => carries(text, t)));
const specialOf = (text) => TERMS.filter(([t]) => carries(text, t)).map(([t]) => t);
const statedQueue = (category) => ROUTES.find((r) => r[3] === category)[5];
const correctQueue = (body) => (specialOf(body).length ? "human_only_review" : topicsOf(body)[0][5]);

const requests = () => hr14("helpdesk-requests.csv").rows;
const roster = () => table("datasets", "core", "people-roster", "people-roster.csv").rows;
const hr17 = () => table("datasets", "hr", "mixed-sensitivity-employee-dataset", "mixed-sensitivity-employee-dataset.csv");

test("HR-C7-T19: files and columns equal spec.files, twenty requests in order, two a business day, all untriaged", () => {
  const dir = join(REPO_ROOT, "datasets", "hr", "helpdesk-request-queue");
  assert.deepEqual(readdirSync(dir).sort(), Object.keys(spec.files).sort());
  for (const [file, columns] of Object.entries(spec.files)) assert.deepEqual(hr14(file).cols, columns, file);
  const g = hr14("helpdesk-grammar.csv").rows;
  assert.equal(g.length, 1);
  assert.equal(g[0].as_of, WINDOW[1]);
  assert.equal(g[0].received_window_start, WINDOW[0]);
  assert.equal(g[0].received_window_end, WINDOW[1]);
  assert.equal(g[0].request_count, "20");
  assert.equal(g[0].channel_vocabulary, CHANNELS.join("; "));
  assert.equal(g[0].status_vocabulary, "untriaged");
  assert.equal(g[0].human_only_count, "1");
  const rows = requests();
  assert.equal(rows.length, 20);
  const perDay = new Map();
  rows.forEach((r, i) => {
    assert.equal(r.request_id, `HRQ-2026-${String(i + 1).padStart(4, "0")}`);
    assert.ok(!isWeekend(r.received_date) && r.received_date >= WINDOW[0] && r.received_date <= WINDOW[1]);
    perDay.set(r.received_date, (perDay.get(r.received_date) ?? 0) + 1);
    assert.equal(r.status, "untriaged");
    assert.ok(CHANNELS.includes(r.channel));
    assert.ok(slotOf.has(r.subject), `unknown subject ${r.subject}`);
    if (i > 0) {
      const p = rows[i - 1];
      assert.ok(p.received_date < r.received_date || (p.received_date === r.received_date && slotOf.get(p.subject) < slotOf.get(r.subject)));
    }
  });
  const days = [];
  for (let d = WINDOW[0]; d <= WINDOW[1]; d = addDays(d, 1)) if (!isWeekend(d)) days.push(d);
  assert.equal(days.length, 10);
  for (const d of days) assert.equal(perDay.get(d), 2, `${d} does not carry two requests`);
  assert.equal(new Set(rows.map((r) => r.subject)).size, 20);
});

test("HR-C7-T20: the routing table and term list equal the literal copies, and every body carries exactly one topic", () => {
  assert.deepEqual(hr14("routing-table.csv").rows.map((r) => Object.values(r)), ROUTES);
  assert.deepEqual(hr14("special-category-terms.csv").rows.map((r) => [r.term, r.term_class]), TERMS);
  assert.deepEqual(ROUTING_TABLE.map((r) => [r.rule_id, String(r.precedence), r.match_basis, r.stated_category, r.content_terms.join("; "), r.queue, r.answer_mode]), ROUTES);
  assert.deepEqual(SPECIAL_CATEGORY_TERMS.map((t) => [t.term, t.term_class]), TERMS);
  for (const r of requests()) {
    const topics = topicsOf(r.body);
    assert.equal(topics.length, 1, `a body carries ${topics.length} topics`);
    for (const t of topicsOf(r.subject)) assert.equal(t[0], topics[0][0], "a subject carries another topic's term");
    const words = r.body.trim().split(/\s+/).length;
    assert.ok(words >= 20 && words <= 60, `a body runs ${words} words`);
  }
});

test("HR-C7-T21: HR-14a, one mis-categorized request among the non-special ones, and the dropped-qualifier counts", () => {
  const rows = requests();
  const nonSpecial = rows.filter((r) => specialOf(r.body).length === 0);
  assert.equal(nonSpecial.filter((r) => topicsOf(r.body)[0][5] !== statedQueue(r.stated_category)).length, 1);
  assert.equal(rows.filter((r) => correctQueue(r.body) !== statedQueue(r.stated_category)).length, 2);
  assert.equal(rows.filter((r) => r.stated_category === "pay_and_payroll").length, 4);
  const benefits = rows.filter((r) => topicsOf(r.body)[0][0] === "RTE-02");
  assert.equal(benefits.length, 6);
  assert.equal(benefits.filter((r) => r.stated_category === "benefits").length, 5);
  assert.equal(rows.filter((r) => topicsOf(r.subject).some((t) => t[0] !== topicsOf(r.body)[0][0])).length, 0);
  const totals = {};
  for (const r of rows) totals[correctQueue(r.body)] = (totals[correctQueue(r.body)] ?? 0) + 1;
  assert.deepEqual(totals, {
    benefits_administration: 6, payroll: 3, leave_administration: 3, human_only_review: 1,
    people_operations: 5, employee_relations: 2,
  });
});

test("HR-C7-T22: HR-14b, one special category body, and the privacy censuses", () => {
  const rows = requests();
  const special = rows.filter((r) => specialOf(r.body).length > 0);
  assert.equal(special.length, 1);
  assert.equal(special[0].stated_category, "leave_and_time_off");
  assert.equal(topicsOf(special[0].body)[0][5], statedQueue(special[0].stated_category), "its topic ignoring the override equals its stated category");
  assert.equal(rows.filter((r) => r.stated_category === "leave_and_time_off").length, 4);
  const healthOrSick = rows.filter((r) => carries(r.body, "health") || carries(r.body, "sick"));
  assert.equal(healthOrSick.length, 2);
  assert.ok(!healthOrSick.includes(special[0]));
  assert.equal(rows.filter((r) => carries(r.body, "medical")).length, 2);
  const { cols, rows: records } = hr17();
  const values = new Set();
  for (const rec of records) for (const [c, v] of Object.entries(rec)) if (v && c !== "employee_id" && c !== "record_id") values.add(v);
  for (const r of rows) {
    for (const c of cols) assert.ok(!carries(r.body, c), `a body carries the HR-17 column ${c}`);
    // Values are matched as written: the department value "Legal" is not the words "legal name".
    for (const v of values) assert.ok(!carries(r.body, v, ""), "a body carries an HR-17 value string");
  }
});

test("HR-C7-T23: twenty distinct requesters from the 437 pool recomputed from committed bytes", () => {
  const active = roster().filter((r) => r.employment_status === "active");
  const hr17Ids = new Set(hr17().rows.map((r) => r.employee_id));
  const hr08 = new Set();
  for (const r of table("datasets", "hr", "review-cycle-roster", "review-assignments.csv").rows) {
    hr08.add(r.reviewee_employee_id);
    hr08.add(r.reviewer_employee_id);
  }
  const hr18 = new Set(table("datasets", "hr", "hris-export", "hris-case-queue.csv").rows.map((r) => r.subject_employee_id));
  const bands = new Map(table("datasets", "hr", "compensation-band-dataset", "compensation-bands.csv").rows.map((b) => [b.band_id, Number(b.band_max)]));
  const above = table("datasets", "hr", "compensation-band-dataset", "employee-compensation.csv").rows
    .filter((r) => Number(r.base_pay_amount) > bands.get(r.band_id)).map((r) => r.employee_id);
  assert.equal(above.length, 1);
  const departing = table("datasets", "hr", "offboarding-checklist-access-inventory", "exit-record.csv").rows.map((r) => r.employee_id);
  assert.deepEqual(departing, ["EMP-0047"]);
  const root = join(REPO_ROOT, "artifacts");
  const corpus = readdirSync(root, { recursive: true }).map(String)
    .filter((n) => n.endsWith(".md") || n.endsWith(".json")).map((n) => readFileSync(join(root, n), "utf8")).join("\n");
  const named = new Set(active.filter((r) => corpus.includes(`${r.first_name} ${r.last_name}`)).map((r) => r.employee_id));
  const census = table("datasets", "hr", "benefits-census", "employee-benefits.csv").rows;
  const inWindow = census.filter((r) => {
    const due = addDays(r.hire_date, 90);
    return due >= "2026-04-03" && due <= "2026-04-10";
  }).map((r) => r.employee_id);
  const unverified = table("datasets", "hr", "benefits-census", "dependents.csv").rows
    .filter((d) => d.documentation_status === "unverified").map((d) => d.employee_id);
  assert.equal(inWindow.length, 1);
  assert.equal(unverified.length, 1);
  const base = active
    .filter((r) => r.department !== "People" && r.employee_id !== "EMP-0001")
    .filter((r) => !hr17Ids.has(r.employee_id) && !named.has(r.employee_id))
    .filter((r) => !hr08.has(r.employee_id) && !hr18.has(r.employee_id))
    .filter((r) => !above.includes(r.employee_id) && !departing.includes(r.employee_id));
  assert.equal(base.length, 438);
  const pool = new Set(base.map((r) => r.employee_id).filter((e) => !inWindow.includes(e) && !unverified.includes(e)));
  assert.equal(pool.size, 437);
  const ids = requests().map((r) => r.requester_employee_id);
  assert.equal(new Set(ids).size, 20);
  for (const e of ids) assert.ok(pool.has(e), "a requester sits outside the recomputed pool");
});

test("HR-C7-T24: every answerable slot resolves to a document and section in the committed libraries (X34)", () => {
  const docs = new Map();
  for (const dir of ["CORE-05", "HR-19"]) {
    for (const name of readdirSync(join(REPO_ROOT, "artifacts", dir)).filter((n) => n.endsWith(".md"))) {
      const text = read("artifacts", dir, name);
      const docId = text.match(/^\| Document ID \| (\S+) \|$/m);
      const status = text.match(/^\| Status \| (\S+) \|$/m);
      if (docId) docs.set(docId[1], { text, status: status?.[1] });
    }
  }
  let neither = 0;
  let human = 0;
  for (const [subject, source] of SLOTS) {
    if (source === "neither") { neither += 1; continue; }
    if (source === "human_only") { human += 1; continue; }
    const [docId, section] = source;
    assert.ok(!["ADI-BNF-001", "ADI-POL-006", "ADI-FIN-001"].includes(docId), `${subject} is pinned to a superseded document`);
    const doc = docs.get(docId);
    assert.ok(doc, `${docId} is in neither committed library`);
    assert.equal(doc.status, "Active", `${docId} is not Active`);
    if (section !== null) assert.match(doc.text, new RegExp(`^## ${section}\\. `, "m"), `${docId} has no section ${section}`);
  }
  assert.equal(neither, 3);
  assert.equal(human, 1);
  assert.equal(hr14("helpdesk-grammar.csv").rows[0].answerable_from_neither_count, String(neither));
  assert.equal(SLOTS.length - neither - human, 16);
});

test("HR-C7-T25: one token sweep over every C7 byte (X33, X38), and C7's own blocks nowhere else", () => {
  const c7 = [];
  for (const name of readdirSync(join(REPO_ROOT, "artifacts", "HR-19")).filter((n) => n.endsWith(".md"))) {
    c7.push({ where: `HR-19/${name}`, text: read("artifacts", "HR-19", name) });
  }
  for (const dir of ["benefits-census", "helpdesk-request-queue"]) {
    for (const name of readdirSync(join(REPO_ROOT, "datasets", "hr", dir))) {
      c7.push({ where: `${dir}/${name}`, text: read("datasets", "hr", dir, name) });
    }
  }
  const foreign = /(^|[^A-Z])(EXT|RQN|RVA|RVC|GOL|GSA|RHS|MSD|BND|ESR|SVY|BEN|HRC)-[0-9]/m;
  const lower = /(^|[^A-Za-z])(ca|pe)-[0-9]/m;
  for (const { where, text } of c7) {
    assert.doesNotMatch(text, foreign, `${where} carries a token from another block`);
    assert.doesNotMatch(text, lower, `${where} carries a ca- or pe- token`);
    assert.ok(!text.includes("EMP-0601"), `${where} carries EMP-0601`);
    assert.ok(!text.includes("—") && !text.includes("–"), `${where} carries a dash`);
  }
  for (const file of ["helpdesk-requests.csv", "helpdesk-grammar.csv"]) {
    for (const row of hr14(file).rows) {
      for (const cell of Object.values(row)) {
        assert.deepEqual(moneyMatches(cell), [], `${file} carries a money shape`);
        assert.ok(!cell.includes("%") && !cell.includes("@"), `${file} carries a percent or an email`);
      }
    }
  }
  const own = {
    "ADI-BNF-": ["artifacts/HR-19/", "datasets/hr/benefits-census/"],
    "BSQ-": ["artifacts/HR-19/"],
    "DEP-": ["datasets/hr/benefits-census/"],
    "HRQ-": ["datasets/hr/helpdesk-request-queue/"],
    "RTE-": ["datasets/hr/helpdesk-request-queue/"],
  };
  for (const top of ["datasets", "artifacts", "canon"]) {
    for (const name of readdirSync(join(REPO_ROOT, top), { recursive: true }).map(String)) {
      if (!/\.(csv|json|md)$/.test(name)) continue;
      const rel = `${top}/${name}`;
      const text = read(top, name);
      for (const [prefix, homes] of Object.entries(own)) {
        if (homes.some((h) => rel.startsWith(h))) continue;
        assert.doesNotMatch(text, new RegExp(`(^|[^A-Za-z])${escape(prefix)}[0-9]`, "m"), `${rel} carries a ${prefix} token`);
      }
    }
  }
});

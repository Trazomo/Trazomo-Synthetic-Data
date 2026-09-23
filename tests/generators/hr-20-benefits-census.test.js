// HR-20 benefits-census: the guard over the census and over the joins that make
// it an exercise, HR-C7-T12 to HR-C7-T18 of the people-hr cluster 7 data plan.
//
// Every census here is recomputed from committed bytes in this file's own code:
// the roster from its committed CSV, the benefits plan library from its
// committed markdown, and the five salience sets from the committed mixed
// sensitivity, review cycle, case queue, compensation and exit record files plus
// a full-name sweep of artifacts/. No builder predicate is imported. The
// generator's exported vocabularies are imported only to assert they still
// equal the literal copies below, the HR-18 discipline.
//
// No test names the employee the alert window selects or the dependent whose
// document is unverified. Both are found by rule and asserted by cardinality.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { addDays, isWeekend } from "../../datagen/src/dates.js";
import { csvTable } from "../helpers/csv-table.js";
import { moneyMatches } from "../helpers/money-shape.js";
import {
  COVERAGE_TIERS,
  DOCUMENTATION_TYPES,
  MEDICAL_OPTIONS,
} from "../../datagen/src/generators/hr-20-benefits-census.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const spec = specs.byId.get("HR-20");
const DIR = join(REPO_ROOT, "datasets", "hr", "benefits-census");
const read = (...parts) => readFileSync(join(REPO_ROOT, ...parts), "utf8");
const table = (...parts) => csvTable(read(...parts));

const AS_OF = "2026-04-03";
const PLAN_YEAR = ["2026-01-01", "2026-12-31"];
const PRIOR_OE = ["2025-11-03", "2025-11-14"];
const WINDOW = ["2026-04-03", "2026-04-10"];
const SPD_DAYS = 90;

// The vocabularies, restated literally.
const TIERS = ["employee_only", "employee_spouse", "employee_children", "family", "waived"];
const OPTIONS = ["choice_ppo", "saver_hsa", "waived"];
const DOC_TYPES = ["marriage_certificate", "birth_certificate", "adoption_or_placement_record"];

// The constructed design counts, restated from the spec's own planted feature.
const TIER_TARGETS = { waived: 30, employee_only: 240, employee_spouse: 118, employee_children: 72, family: 122 };
const OPTION_TARGETS = { waived: 42, choice_ppo: 324, saver_hsa: 216 };
const DENTAL_ENROLLED = 530;
const VISION_ENROLLED = 488;
const DEPENDENTS = 587;

const grammar = () => table("datasets", "hr", "benefits-census", "census-grammar.csv");
const employees = () => table("datasets", "hr", "benefits-census", "employee-benefits.csv").rows;
const dependents = () => table("datasets", "hr", "benefits-census", "dependents.csv").rows;
const roster = () => table("datasets", "core", "people-roster", "people-roster.csv").rows;
const active = () => roster().filter((r) => r.employment_status === "active");

const inRange = (iso, lo, hi) => iso >= lo && iso <= hi;
const deadlineOf = (row) => addDays(row.hire_date, SPD_DAYS);
const firstOfNextMonth = (iso) => {
  const [y, m] = iso.split("-").map(Number);
  return `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`;
};

/** The register table under section 7 of the committed library index. */
function committedRegister() {
  const text = read("artifacts", "HR-19", "benefits-plan-library.md");
  const section = text.split("## 7. Benefits Plan Register")[1].split("\n## ")[0];
  const lines = section.split("\n").filter((l) => l.startsWith("|"));
  const cells = (l) => l.slice(1, -1).split("|").map((c) => c.trim());
  const header = cells(lines[0]);
  return lines.slice(2).map((l) => Object.fromEntries(cells(l).map((c, i) => [header[i], c])));
}

/** The six clause pool, recomputed from committed bytes (data plan 2.3.5). */
function candidatePools() {
  const act = active();
  const hr17 = new Set(table("datasets", "hr", "mixed-sensitivity-employee-dataset", "mixed-sensitivity-employee-dataset.csv").rows.map((r) => r.employee_id));
  const hr08 = new Set();
  for (const r of table("datasets", "hr", "review-cycle-roster", "review-assignments.csv").rows) {
    hr08.add(r.reviewee_employee_id);
    hr08.add(r.reviewer_employee_id);
  }
  const hr18 = new Set(table("datasets", "hr", "hris-export", "hris-case-queue.csv").rows.map((r) => r.subject_employee_id));
  const bands = new Map(table("datasets", "hr", "compensation-band-dataset", "compensation-bands.csv").rows.map((b) => [b.band_id, Number(b.band_max)]));
  const above = table("datasets", "hr", "compensation-band-dataset", "employee-compensation.csv").rows
    .filter((r) => Number(r.base_pay_amount) > bands.get(r.band_id)).map((r) => r.employee_id);
  const departing = table("datasets", "hr", "offboarding-checklist-access-inventory", "exit-record.csv").rows.map((r) => r.employee_id);
  const artifactsRoot = join(REPO_ROOT, "artifacts");
  const corpus = readdirSync(artifactsRoot, { recursive: true }).map(String)
    .filter((n) => n.endsWith(".md") || n.endsWith(".json"))
    .map((n) => readFileSync(join(artifactsRoot, n), "utf8")).join("\n");
  const named = new Set(act.filter((r) => corpus.includes(`${r.first_name} ${r.last_name}`)).map((r) => r.employee_id));
  const requester = act
    .filter((r) => r.department !== "People" && r.employee_id !== "EMP-0001")
    .filter((r) => !hr17.has(r.employee_id) && !named.has(r.employee_id))
    .filter((r) => !hr08.has(r.employee_id) && !hr18.has(r.employee_id))
    .filter((r) => !above.includes(r.employee_id) && !departing.includes(r.employee_id));
  const qle = requester.filter((r) => r.start_date < "2025-11-01");
  return { hr17, hr08, hr18, above, departing, named, requester, qle };
}

test("HR-C7-T12: files and columns equal spec.files, the grammar row, and the census is the active roster", () => {
  const onDisk = readdirSync(DIR).sort();
  assert.deepEqual(onDisk, Object.keys(spec.files).sort());
  for (const [file, columns] of Object.entries(spec.files)) {
    assert.deepEqual(table("datasets", "hr", "benefits-census", file).cols, columns, `${file} columns`);
  }
  const { rows } = grammar();
  assert.equal(rows.length, 1);
  const g = rows[0];
  assert.equal(g.as_of, AS_OF);
  assert.equal(g.plan_year_start, PLAN_YEAR[0]);
  assert.equal(g.plan_year_end, PLAN_YEAR[1]);
  assert.equal(g.source_library, "artifacts/HR-19/benefits-plan-library.md");
  assert.equal(g.active_plan_ids, "ADI-BNF-002; ADI-BNF-003; ADI-BNF-004; ADI-BNF-008");
  assert.equal(g.universal_plan_ids, "ADI-BNF-004; ADI-BNF-008");
  assert.equal(g.spd_deadline_days, String(SPD_DAYS));
  assert.equal(g.alert_window_start, WINDOW[0]);
  assert.equal(g.alert_window_end, WINDOW[1]);
  assert.equal(g.alert_window_days, "7");
  assert.equal(g.prior_open_enrollment_start, PRIOR_OE[0]);
  assert.equal(g.prior_open_enrollment_end, PRIOR_OE[1]);
  assert.equal(g.new_hire_election_days, "30");
  assert.equal(g.coverage_tier_vocabulary, TIERS.join("; "));
  assert.equal(g.medical_option_vocabulary, OPTIONS.join("; "));
  assert.equal(g.election_vocabulary, "enrolled; waived");
  assert.equal(g.election_event_vocabulary, "open_enrollment; new_hire; qualifying_life_event");
  assert.equal(g.relationship_vocabulary, "spouse; child");
  assert.equal(g.documentation_type_vocabulary, DOC_TYPES.join("; "));
  assert.equal(g.documentation_status_vocabulary, "verified; unverified");
  assert.equal(g.employee_count, "582");
  assert.match(g.spd_deadline_rule, /never later than a deadline counted from coverage_start_date/);
  assert.match(g.eligibility_statement, /0\.6, which is 24 hours on a 40 hour full-time week/);
  assert.deepEqual(COVERAGE_TIERS, TIERS);
  assert.deepEqual(MEDICAL_OPTIONS, OPTIONS);
  assert.deepEqual(DOCUMENTATION_TYPES, DOC_TYPES);

  const act = active();
  const rows582 = employees();
  assert.equal(rows582.length, 582);
  assert.deepEqual(rows582.map((r) => r.employee_id), act.map((r) => r.employee_id).sort());
  const byId = new Map(act.map((r) => [r.employee_id, r]));
  for (const row of rows582) {
    assert.equal(row.hire_date, byId.get(row.employee_id).start_date, `${row.employee_id} hire_date`);
    assert.equal(row.coverage_start_date, firstOfNextMonth(row.hire_date));
  }
  // No person field beyond the id, and no roster value beside it.
  const forbidden = /name|email|department|title|level|manager/;
  for (const file of Object.keys(spec.files)) {
    for (const col of table("datasets", "hr", "benefits-census", file).cols) {
      assert.doesNotMatch(col, forbidden, `${file} carries ${col}`);
    }
  }
  const text = ["employee-benefits.csv", "dependents.csv"].map((f) => read("datasets", "hr", "benefits-census", f)).join("\n");
  for (const person of act) {
    assert.ok(!text.includes(`${person.first_name} ${person.last_name}`));
    assert.ok(!text.includes(person.email));
  }
});

test("HR-C7-T13: every plan id is an Active register row, and the vocabularies are the library's (X29, X30)", () => {
  const register = committedRegister();
  assert.deepEqual(register.map((r) => r["Document ID"]), [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `ADI-BNF-00${n}`));
  const status = new Map(register.map((r) => [r["Document ID"], r.Status]));
  const g = grammar().rows[0];
  const ids = new Set([...g.active_plan_ids.split("; "), ...g.universal_plan_ids.split("; ")]);
  for (const row of employees()) {
    if (row.medical_plan_id) ids.add(row.medical_plan_id);
    if (row.dental_vision_plan_id) ids.add(row.dental_vision_plan_id);
    assert.equal(row.medical_plan_id === "ADI-BNF-002", row.medical_option !== "waived", `${row.employee_id} medical`);
    assert.ok(row.medical_plan_id === "" || row.medical_plan_id === "ADI-BNF-002");
    const dv = row.dental_election === "enrolled" || row.vision_election === "enrolled";
    assert.equal(row.dental_vision_plan_id === "ADI-BNF-003", dv, `${row.employee_id} dental and vision`);
    assert.ok(row.dental_vision_plan_id === "" || row.dental_vision_plan_id === "ADI-BNF-003");
  }
  for (const planId of ids) assert.equal(status.get(planId), "Active", `${planId} is not Active`);
  for (const file of Object.keys(spec.files)) {
    assert.ok(!read("datasets", "hr", "benefits-census", file).includes("ADI-BNF-001"), `${file} carries the superseded document`);
  }
  const medical = read("artifacts", "HR-19", "benefits-plan-library-medical-plan-spd.md");
  const optionNames = [...new Set(medical.match(/\b[A-Z][a-z]+ [A-Z]{3} option\b/g))].sort();
  assert.deepEqual(optionNames, ["Choice PPO option", "Saver HSA option"]);
  assert.deepEqual(
    optionNames.map((n) => n.replace(/ option$/, "").toLowerCase().replace(/ /g, "_")).sort(),
    OPTIONS.filter((o) => o !== "waived").sort()
  );
  const calendar = read("artifacts", "HR-19", "benefits-plan-library-enrollment-calendar-and-life-events.md");
  const section6 = calendar.split("## 6.")[1].split("\n## ")[0];
  for (const type of DOC_TYPES) assert.ok(section6.includes(type.replace(/_/g, " ")), `007 section 6 lacks ${type}`);
  const section7 = calendar.split("## 7.")[1].split("\n## ")[0];
  const days = section7.match(/within (\d+) calendar days of your date of hire/);
  assert.ok(days, "007 section 7 no longer states the rule");
  assert.equal(days[1], g.spd_deadline_days);
});

test("HR-C7-T14: HR-20a, one deadline in the window, and every qualifier-dropped count", () => {
  const rows = employees();
  const count = (p) => rows.filter(p).length;
  const g = grammar().rows[0];
  const within = (days) => (r) => inRange(deadlineOf(r), g.alert_window_start, addDays(g.alert_window_start, days));
  assert.equal(count(within(Number(g.alert_window_days))), 1, "the alert window census");
  assert.equal(count(within(14)), 3);
  assert.equal(count(within(30)), 7);
  const after = rows.filter((r) => deadlineOf(r) > AS_OF).map((r) => r.employee_id);
  const empty = rows.filter((r) => r.spd_furnished_date === "").map((r) => r.employee_id);
  assert.equal(after.length, 11);
  assert.deepEqual(empty, after, "the empty furnished rows are exactly the after-as-of rows");
  const prior = rows.filter((r) => deadlineOf(r) < AS_OF && deadlineOf(r) >= addDays(AS_OF, -30));
  assert.equal(prior.length, 4);
  for (const row of prior) assert.ok(row.spd_furnished_date !== "" && row.spd_furnished_date <= deadlineOf(row));
  const overdue = rows.filter((r) => deadlineOf(r) <= AS_OF && (r.spd_furnished_date === "" || r.spd_furnished_date > deadlineOf(r)));
  assert.equal(overdue.length, 0);
  assert.equal(count((r) => inRange(addDays(r.coverage_start_date, SPD_DAYS), WINDOW[0], WINDOW[1])), 0);
  for (const row of rows.filter((r) => r.spd_furnished_date)) {
    assert.ok(!isWeekend(row.spd_furnished_date));
    assert.ok(inRange(row.spd_furnished_date, row.hire_date, deadlineOf(row)));
  }
});

test("HR-C7-T15: elections, windows and the constructed tier, option and election censuses", () => {
  const rows = employees();
  const act = active();
  const newHires = new Set(act.filter((r) => r.start_date >= PRIOR_OE[0]).map((r) => r.employee_id));
  assert.equal(newHires.size, 23);
  assert.deepEqual(
    new Set(rows.filter((r) => r.election_event === "new_hire").map((r) => r.employee_id)),
    newHires
  );
  assert.equal(rows.filter((r) => r.election_event === "qualifying_life_event").length, 6);
  assert.equal(rows.filter((r) => r.election_event === "open_enrollment").length, 553);
  const qleDates = [];
  for (const r of rows) {
    assert.ok(!isWeekend(r.election_date), `${r.employee_id} elected on a weekend`);
    assert.ok(r.election_date <= AS_OF);
    if (r.election_event === "open_enrollment") assert.ok(inRange(r.election_date, ...PRIOR_OE));
    if (r.election_event === "new_hire") assert.ok(inRange(r.election_date, r.hire_date, addDays(r.hire_date, 30)));
    if (r.election_event === "qualifying_life_event") {
      assert.ok(inRange(r.election_date, "2026-01-05", "2026-03-27"));
      qleDates.push(r.election_date);
    }
  }
  assert.equal(new Set(qleDates).size, 6);
  for (const tier of TIERS) assert.equal(rows.filter((r) => r.coverage_tier === tier).length, TIER_TARGETS[tier], tier);
  for (const opt of OPTIONS) assert.equal(rows.filter((r) => r.medical_option === opt).length, OPTION_TARGETS[opt], opt);
  assert.equal(rows.filter((r) => r.dental_election === "enrolled").length, DENTAL_ENROLLED);
  assert.equal(rows.filter((r) => r.vision_election === "enrolled").length, VISION_ENROLLED);
  for (const r of rows) {
    const lines = [r.medical_option !== "waived", r.dental_election === "enrolled", r.vision_election === "enrolled"];
    if (r.coverage_tier === "waived") assert.ok(!lines.some(Boolean), `${r.employee_id} waives the tier but enrolls`);
    else assert.ok(lines.some(Boolean), `${r.employee_id} enrolls in nothing`);
  }
  assert.equal(rows.filter((r) => r.coverage_tier === "employee_only" && r.medical_option === "waived").length, 12);
  // The spec pins the same figures a reader recomputes here.
  const feature = spec.planted_features.find((f) => f.startsWith("election_event is new_hire"));
  for (const figure of ["waived 30", "employee_only 240", "employee_spouse 118", "employee_children 72", "family 122",
    "waived 42", "choice_ppo 324", "saver_hsa 216", "dental enrolled 530", "vision enrolled 488", "587 dependents"]) {
    assert.ok(feature.includes(figure), `the spec no longer pins ${figure}`);
  }
});

test("HR-C7-T16: dependents, the id block, the tier rule and the verification dates", () => {
  const deps = dependents();
  const rows = employees();
  const byId = new Map(rows.map((r) => [r.employee_id, r]));
  assert.equal(deps.length, DEPENDENTS);
  assert.equal(grammar().rows[0].dependent_count, String(deps.length));
  deps.forEach((d, i) => {
    assert.equal(d.dependent_id, `DEP-${String(i + 1).padStart(4, "0")}`);
    if (i > 0) {
      const p = deps[i - 1];
      assert.ok(p.employee_id < d.employee_id || (p.employee_id === d.employee_id && p.relationship <= d.relationship));
    }
    const owner = byId.get(d.employee_id);
    assert.ok(owner, `${d.dependent_id} names an employee outside the census`);
    assert.ok(["spouse", "child"].includes(d.relationship));
    if (d.relationship === "spouse") assert.equal(d.documentation_type, "marriage_certificate");
    else assert.ok(["birth_certificate", "adoption_or_placement_record"].includes(d.documentation_type));
    assert.ok(["verified", "unverified"].includes(d.documentation_status));
    assert.equal(d.verified_date !== "", d.documentation_status === "verified");
    if (d.verified_date) {
      assert.ok(!isWeekend(d.verified_date));
      assert.ok(inRange(d.verified_date, owner.hire_date, AS_OF));
      if (owner.election_event === "qualifying_life_event") assert.ok(d.verified_date >= owner.election_date);
    }
  });
  for (const r of rows) {
    const own = deps.filter((d) => d.employee_id === r.employee_id);
    const s = own.filter((d) => d.relationship === "spouse").length;
    const c = own.filter((d) => d.relationship === "child").length;
    const rule = {
      waived: s === 0 && c === 0,
      employee_only: s === 0 && c === 0,
      employee_spouse: s === 1 && c === 0,
      employee_children: s === 0 && c >= 1 && c <= 3,
      family: s === 1 && c >= 1 && c <= 3,
    };
    assert.ok(rule[r.coverage_tier], `${r.employee_id} dependents disagree with ${r.coverage_tier}`);
  }
  const adoption = deps.filter((d) => d.documentation_type === "adoption_or_placement_record").length;
  const children = deps.filter((d) => d.relationship === "child").length;
  assert.ok(adoption > 0 && adoption < children / 6, "adoption records are about one child in twelve");
});

test("HR-C7-T17: HR-20b, one unverified dependent, and the 419 pool recomputed", () => {
  const deps = dependents();
  const rows = employees();
  const byId = new Map(rows.map((r) => [r.employee_id, r]));
  const unverified = deps.filter((d) => d.documentation_status === "unverified");
  assert.equal(unverified.length, 1);
  assert.equal(deps.filter((d) => d.verified_date === "").length, 1);
  const carrier = byId.get(unverified[0].employee_id);
  assert.equal(carrier.election_event, "qualifying_life_event");
  const qle = rows.filter((r) => r.election_event === "qualifying_life_event");
  const dates = qle.map((r) => r.election_date).sort();
  assert.notEqual(carrier.election_date, dates[0], "the carrier sits at the earliest date");
  assert.notEqual(carrier.election_date, dates.at(-1), "the carrier sits at the latest date");
  const qleIds = new Set(qle.map((r) => r.employee_id));
  const qleDeps = deps.filter((d) => qleIds.has(d.employee_id));
  assert.equal(qleIds.size, 6);
  assert.equal(qleDeps.length, 8);
  assert.equal(qleDeps.filter((d) => d.documentation_type === "marriage_certificate").length, 5);

  const pools = candidatePools();
  assert.equal(pools.hr17.size, 40);
  assert.equal(pools.named.size, 36);
  assert.equal(pools.hr08.size, 57);
  assert.equal(pools.hr18.size, 24);
  assert.equal(pools.above.length, 1);
  assert.deepEqual(pools.departing, ["EMP-0047"]);
  assert.equal(pools.requester.length, 438);
  assert.equal(pools.qle.length, 419);
  const qlePool = new Set(pools.qle.map((r) => r.employee_id));
  for (const employeeId of qleIds) assert.ok(qlePool.has(employeeId), "a qualifying life event employee sits outside the six clauses");
});

test("HR-C7-T18: absence, no money and no health, and the disclosed overlap", () => {
  for (const file of Object.keys(spec.files)) {
    const text = read("datasets", "hr", "benefits-census", file);
    // Cell by cell: a comma between two date cells is the delimiter, not a
    // thousands separator, the HR-12 reason.
    for (const row of table("datasets", "hr", "benefits-census", file).rows) {
      for (const cell of Object.values(row)) assert.deepEqual(moneyMatches(cell), [], `${file} carries a money shape in ${cell}`);
    }
    assert.ok(!text.includes("%") && !text.includes("$"), `${file} carries a percent or a currency symbol`);
    assert.ok(!text.includes("\u2014") && !text.includes("\u2013"), `${file} carries a dash`);
    // The one exemption is the grammar's statement of what the census does not carry.
    for (const col of table("datasets", "hr", "benefits-census", file).cols.filter((c) => c !== "no_health_no_pay_statement")) {
      assert.doesNotMatch(col, /pay|premium|deferral|contribution|health|birth|age$|_age|salary/, `${file} carries ${col}`);
    }
  }
  const hr17 = table("datasets", "hr", "mixed-sensitivity-employee-dataset", "mixed-sensitivity-employee-dataset.csv");
  const window = employees().filter((r) => inRange(deadlineOf(r), WINDOW[0], WINDOW[1]));
  assert.equal(window.length, 1);
  assert.ok(hr17.rows.some((r) => r.employee_id === window[0].employee_id), "the disclosed overlap no longer holds");
  const values = new Set();
  const skip = new Set(["employee_id", "hire_date", "extracted_on", "manager_employee_id"]);
  for (const r of hr17.rows) {
    // Dates are skipped: an ISO date is a date, and an election date that
    // happens to equal somebody's date of birth refers to nothing.
    for (const [col, v] of Object.entries(r)) if (v && !skip.has(col) && !/^\d{4}-\d{2}-\d{2}$/.test(v)) values.add(v);
  }
  for (const file of ["employee-benefits.csv", "dependents.csv"]) {
    for (const row of table("datasets", "hr", "benefits-census", file).rows) {
      for (const cell of Object.values(row)) assert.ok(!values.has(cell) || cell === "", `${file} carries the HR-17 value ${cell}`);
    }
  }
  const grammarText = read("datasets", "hr", "benefits-census", "census-grammar.csv");
  for (const col of hr17.cols.filter((c) => /health|union|criminal|immigration|birth/.test(c))) {
    assert.ok(!grammarText.includes(col), `the grammar names the HR-17 column ${col}`);
  }
});

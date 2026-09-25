// HR-15 multistate-leave-compliance-roster: the guard over the located roster,
// the four obligation rules and the leave and compliance obligations, HR-C8-T11
// to HR-C8-T19 of the people-hr cluster 8 data plan.
//
// Every arm reads the committed bytes. The vocabularies, the rule table and the
// location table are restated literally below; the business-day walk, the
// alert window, both plants, every dropped-qualifier count and the guarded pool
// are recomputed in this file's own code. The generator is imported only to
// assert its guarded pool constant equals the recomputed figure. No plant row
// is named here; each is one application of a published rule away.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { csvTable } from "../helpers/csv-table.js";
import { moneyMatches } from "../helpers/money-shape.js";
import { EXPECTED_DRAW_POOL } from "../../datagen/src/generators/hr-15-leave-compliance-roster.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const spec = specs.byId.get("HR-15");
const read = (...parts) => readFileSync(join(REPO_ROOT, ...parts), "utf8");
const table = (...parts) => csvTable(read(...parts));
const DIR = ["datasets", "hr", "multistate-leave-compliance-roster"];
const hr15 = (file) => table(...DIR, file);

const AS_OF = "2026-09-01";
const EM = String.fromCharCode(0x2014);
const EN = String.fromCharCode(0x2013);
const WINDOW = ["2026-09-01", "2026-09-15"];

const VOCAB = {
  work_location: ["remote", "headquarters", "satellite_office"],
  leave_type: ["family_and_medical", "parental", "military"],
  leave_status: ["approved_not_started", "on_leave", "returned"],
  obligation_type: ["leave_certification", "return_to_work_confirmation", "work_authorization_reverification", "out_of_state_work_approval"],
  owner_role: ["People Operations Specialist", "HR Business Partner", "People Manager"],
};

// The four rules, restated.
const RULES = [
  ["OBR-01", "leave_certification", "ADI-HR-001 section 8 (Certification)", "family_and_medical leaves", "request_date", "request_date plus 15 calendar days", "People Operations Specialist"],
  ["OBR-02", "return_to_work_confirmation", "ADI-HR-001 section 8 (Return to work)", "every leave", "expected_return_date", "expected_return_date minus 10 business days", "People Operations Specialist"],
  ["OBR-03", "work_authorization_reverification", "ADI-HR-001 section 2 (Immigration compliance)", "employees whose current work authorization document carries an expiry date", "work_authorization_expiry_date", "the recorded expiry date (basis_date) itself", "HR Business Partner"],
  ["OBR-04", "out_of_state_work_approval", "ADI-POL-002 section 5.1", "a requested move of an approved remote location across state lines", "requested_effective_date", "the day before the requested effective date", "People Manager"],
];

// The location table of data plan 2.3.3, restated.
const OFFICE_STATE = { headquarters: "US-DE", satellite_office: "US-CO" };
const REMOTE_CELLS = [
  ["US-NY", "US-NY-NYC", 46], ["US-NY", "", 22], ["US-IL", "", 58], ["US-CA", "", 74], ["US-CO", "", 30], ["US-DE", "", 31],
];
const STATE_TOTALS = { "US-DE": 239, "US-CO": 142, "US-CA": 74, "US-NY": 68, "US-IL": 58, "US-MD": 0 };

// ----------------------------------------------------------------- own date code

const MS = 86400000;
const epoch = (iso) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / MS;
const iso = (day) => new Date(day * MS).toISOString().slice(0, 10);
const plus = (d, n) => iso(epoch(d) + n);
const weekend = (d) => [0, 6].includes(new Date(epoch(d) * MS).getUTCDay());
/** n business days before a date, never counting the date itself. */
const businessBefore = (d, n, holidays = []) => {
  let day = d;
  for (let moved = 0; moved < n; moved += 1) {
    do day = plus(day, -1); while (weekend(day) || holidays.includes(day));
  }
  return day;
};
const inside = (d, start, end) => d >= start && d <= end;
const monthsBefore = (d, months) => {
  const total = Number(d.slice(0, 4)) * 12 + Number(d.slice(5, 7)) - 1 - months;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}${d.slice(7)}`;
};

// ----------------------------------------------------------------- committed inputs

const roster = () => table("datasets", "core", "people-roster", "people-roster.csv").rows;
const hr12 = () => table("datasets", "hr", "compensation-band-dataset", "employee-compensation.csv").rows;
const hr17 = () => table("datasets", "hr", "mixed-sensitivity-employee-dataset", "mixed-sensitivity-employee-dataset.csv");
const departing = () => table("datasets", "hr", "offboarding-checklist-access-inventory", "exit-record.csv").rows;
const locations = () => hr15("employee-work-locations.csv").rows;
const leaves = () => hr15("leave-records.csv").rows;
const obligations = () => hr15("compliance-obligations.csv").rows;
const grammar = () => hr15("leave-compliance-grammar.csv").rows[0];

test("HR-C8-T11: HR-15 files and columns equal spec.files; 581 rows equal the active roster less the departing employee", () => {
  assert.deepEqual(readdirSync(join(REPO_ROOT, ...DIR)).sort(), Object.keys(spec.files).sort());
  for (const [file, columns] of Object.entries(spec.files)) assert.deepEqual(hr15(file).cols, columns, file);
  const exits = departing();
  assert.equal(exits.length, 1);
  assert.ok(exits[0].last_working_day < AS_OF, "the departing employee's last day is not before the stamp");
  const expected = roster().filter((r) => r.employment_status === "active" && r.employee_id !== exits[0].employee_id).map((r) => r.employee_id).sort();
  const ids = locations().map((r) => r.employee_id);
  assert.equal(ids.length, 581);
  assert.deepEqual(ids, expected, "the located roster is not the active roster less the departing employee, in employee_id order");
  const g = grammar();
  assert.equal(hr15("leave-compliance-grammar.csv").rows.length, 1);
  assert.equal(g.grammar_id, "LEAVE-COMPLIANCE-GRAMMAR-2026-09-01");
  assert.equal(g.as_of, AS_OF);
  assert.equal(g.universe_now, "2026-04-03");
  assert.equal(g.employee_count, "581");
  assert.equal(g.leave_record_count, "8");
  assert.equal(g.obligation_count, "27");
  assert.equal(g.open_obligation_count, "19");
  assert.equal(g.alert_window_start, WINDOW[0]);
  assert.equal(g.alert_window_end, WINDOW[1]);
  assert.equal(g.alert_window_days, "14");
  assert.equal(plus(WINDOW[0], 14), WINDOW[1]);
  for (const [name, values] of Object.entries(VOCAB)) assert.equal(g[`${name}_vocabulary`], values.join("; "), name);
  assert.equal(g.reason_detail_statement, "reason_detail is special category health information held for leave administration only; no alert, notice or log line may carry it, and a return-to-work confirmation alert needs none of it");
  assert.equal(g.stamp_statement, "this artifact is dated after the pack's universe now; it records the compliance position at its own as_of and does not move any earlier artifact's date");
});

test("HR-C8-T12: HR-15 work_location byte-equals HR-12; the location table of 2.3.3 recomputes; Maryland empty", () => {
  const pay = new Map(hr12().map((r) => [r.employee_id, r.work_location]));
  const rows = locations();
  const states = {};
  for (const r of rows) {
    assert.equal(r.work_location, pay.get(r.employee_id), "a work_location differs from the compensation band dataset");
    assert.ok(VOCAB.work_location.includes(r.work_location));
    if (r.work_location !== "remote") {
      assert.equal(r.work_state, OFFICE_STATE[r.work_location]);
      assert.equal(r.work_locality, "");
    }
    states[r.work_state] = (states[r.work_state] ?? 0) + 1;
  }
  assert.equal(rows.filter((r) => r.work_location === "headquarters").length, 208);
  assert.equal(rows.filter((r) => r.work_location === "satellite_office").length, 112);
  assert.equal(rows.filter((r) => r.work_location === "remote").length, 261);
  for (const [state, locality, count] of REMOTE_CELLS) {
    assert.equal(rows.filter((r) => r.work_location === "remote" && r.work_state === state && r.work_locality === locality).length, count, `${state} ${locality}`);
  }
  for (const [state, count] of Object.entries(STATE_TOTALS)) assert.equal(states[state] ?? 0, count, state);
  assert.equal(rows.filter((r) => r.work_locality === "US-NY-NYC").length, 46);
  assert.equal(rows.filter((r) => r.work_locality !== "" && r.work_locality !== "US-NY-NYC").length, 0);
  assert.equal(Object.values(states).reduce((s, n) => s + n, 0), 581);
});

test("HR-C8-T13: HR-15 the four rules equal the literal table and every due_date recomputes from its basis", () => {
  assert.deepEqual(hr15("obligation-rules.csv").rows.map((r) => Object.values(r)), RULES);
  // The walk never counts the start day: the four open OBR-02 dates of 2.3.5.
  assert.equal(businessBefore("2026-09-28", 10), "2026-09-14");
  assert.equal(businessBefore("2026-09-30", 10), "2026-09-16");
  assert.equal(businessBefore("2026-10-05", 10), "2026-09-21");
  assert.equal(businessBefore("2026-10-14", 10), "2026-09-30");
  const leaveById = new Map(leaves().map((l) => [l.leave_id, l]));
  const rule = new Map(RULES.map((r) => [r[0], r]));
  const all = obligations();
  assert.equal(all.length, 27);
  const count = (id) => all.filter((o) => o.rule_id === id).length;
  assert.deepEqual([count("OBR-01"), count("OBR-02"), count("OBR-03"), count("OBR-04")], [4, 8, 12, 3]);
  assert.equal(all.filter((o) => o.completed_date === "").length, 19);
  assert.equal(all.filter((o) => o.completed_date !== "").length, 8);
  assert.equal(new Set(all.map((o) => o.employee_id)).size, 23);
  all.forEach((o, i) => {
    assert.equal(o.obligation_id, `LCO-2026-${String(i + 1).padStart(4, "0")}`);
    if (i > 0) {
      const p = all[i - 1];
      assert.ok([p.due_date, p.rule_id, p.employee_id].join("|") < [o.due_date, o.rule_id, o.employee_id].join("|"), "obligations are not in (due_date, rule_id, employee_id) order");
    }
    assert.equal(o.obligation_type, rule.get(o.rule_id)[1]);
    assert.equal(o.owner_role, rule.get(o.rule_id)[6]);
    const leave = leaveById.get(o.related_leave_id);
    if (o.rule_id === "OBR-01") {
      assert.equal(leave.leave_type, "family_and_medical");
      assert.equal(o.basis_date, leave.request_date);
      assert.equal(o.due_date, plus(leave.request_date, 15));
    } else if (o.rule_id === "OBR-02") {
      assert.equal(o.basis_date, leave.expected_return_date);
      assert.equal(o.due_date, businessBefore(leave.expected_return_date, 10));
    } else if (o.rule_id === "OBR-03") {
      assert.equal(o.related_leave_id, "");
      assert.equal(o.due_date, o.basis_date);
    } else {
      assert.equal(o.related_leave_id, "");
      assert.equal(o.due_date, plus(o.basis_date, -1));
    }
    assert.equal(o.target_jurisdiction_code !== "", o.rule_id === "OBR-04", "target_jurisdiction_code is filled exactly on OBR-04");
    if (o.completed_date) assert.ok(o.completed_date <= o.due_date && o.completed_date <= AS_OF);
    if (o.rule_id !== "OBR-03") assert.ok(o.due_date <= "2026-12-31" && o.basis_date <= "2026-12-31", "a non-expiry date falls after 2026-12-31 (X45)");
    for (const d of [o.basis_date, o.due_date, o.completed_date].filter(Boolean)) assert.ok(!weekend(d), `${d} is a weekend`);
  });
  // Leave rows: ids in (request_date, employee_id) order, status from the dates, tenure met.
  const start = new Map(roster().map((r) => [r.employee_id, r.start_date]));
  const tenure = { family_and_medical: 12, parental: 6, military: 0 };
  leaves().forEach((l, i) => {
    assert.equal(l.leave_id, `LVR-2026-${String(i + 1).padStart(4, "0")}`);
    assert.ok(VOCAB.leave_type.includes(l.leave_type) && VOCAB.leave_status.includes(l.leave_status));
    const status = l.expected_return_date <= AS_OF ? "returned" : l.start_date <= AS_OF ? "on_leave" : "approved_not_started";
    assert.equal(l.leave_status, status);
    assert.ok(start.get(l.employee_id) <= monthsBefore(l.start_date, tenure[l.leave_type]), "a leave employee fails the handbook tenure rule");
    for (const d of [l.request_date, l.start_date, l.expected_return_date]) assert.ok(!weekend(d), `${d} is a weekend`);
    if (l.leave_type === "family_and_medical") assert.ok(!inside(l.request_date, "2026-08-17", "2026-08-31"));
  });
  assert.equal(new Set(leaves().map((l) => l.employee_id)).size, 8);
  // Relocations: remote carriers whose location row agrees with the request.
  const loc = new Map(locations().map((r) => [r.employee_id, r]));
  for (const o of all.filter((x) => x.rule_id === "OBR-04")) {
    const row = loc.get(o.employee_id);
    assert.equal(row.work_location, "remote");
    if (o.completed_date) assert.equal(row.work_locality || row.work_state, o.target_jurisdiction_code, "a completed move's row does not read its target");
    else assert.notEqual(row.work_state, o.target_jurisdiction_code);
  }
});

test("HR-C8-T14: HR-15a one obligation in the window, and 1, 3, 5, 0, 0, 1 for the six readings of 2.3.5", () => {
  const all = obligations();
  const leaveById = new Map(leaves().map((l) => [l.leave_id, l]));
  const within = (list, days) => list.filter((o) => inside(o.due_date, WINDOW[0], plus(WINDOW[0], days))).length;
  assert.equal(within(all, 14), 1, "HR-15a");
  assert.equal(all.filter((o) => o.due_date === plus(WINDOW[1], 1)).length, 1, "due the day after the window closes");
  assert.equal(within(all, 21), 3, "a 21 day window");
  assert.equal(within(all, 30), 5, "a 30 day window");
  assert.equal(all.filter((o) => o.completed_date === "" && o.due_date < AS_OF).length, 0, "overdue");
  const rewalk = (walk) => all.map((o) => (o.rule_id === "OBR-02" ? { ...o, due_date: walk(leaveById.get(o.related_leave_id).expected_return_date) } : o));
  assert.equal(within(rewalk((d) => plus(d, -10)), 14), 0, "ten calendar days");
  assert.equal(within(rewalk((d) => businessBefore(d, 10, ["2026-09-07"])), 14), 1, "2026-09-07 as a holiday");
  const hit = all.find((o) => inside(o.due_date, WINDOW[0], WINDOW[1]));
  assert.equal(hit.completed_date, "", "the window's obligation is open");
});

test("HR-C8-T15: HR-15b one reason detail, on the window's obligation's leave; 4 and 0", () => {
  const rows = leaves();
  const reason = rows.filter((l) => l.reason_detail !== "");
  assert.equal(reason.length, 1);
  assert.equal(reason[0].reason_detail, "planned surgery and a recovery period");
  const hit = obligations().filter((o) => inside(o.due_date, WINDOW[0], WINDOW[1]));
  assert.equal(hit.length, 1);
  assert.equal(hit[0].related_leave_id, reason[0].leave_id, "the reason detail and the alert are on different leaves");
  assert.equal(rows.length, 8);
  assert.equal(rows.filter((l) => l.leave_type === "family_and_medical").length, 4, "the leave type does not find it");
  const healthHolders = new Set(hr17().rows.filter((r) => r.health_accommodation_note !== "").map((r) => r.employee_id));
  assert.equal(healthHolders.size, 4);
  assert.equal(rows.filter((l) => healthHolders.has(l.employee_id)).length, 0);
  assert.ok(!hr17().rows.some((r) => r.employee_id === reason[0].employee_id), "the carrier holds a mixed sensitivity record (X42)");
});

test("HR-C8-T16: HR-15 reverification agrees with HR-17 (X41)", () => {
  const reverify = obligations().filter((o) => o.rule_id === "OBR-03");
  const byEmployee = new Map(reverify.map((o) => [o.employee_id, o]));
  assert.equal(byEmployee.size, 12);
  const records = hr17().rows;
  const status = (s) => records.filter((r) => r.immigration_status === s).map((r) => r.employee_id);
  const renewal = status("work permit renewal due");
  const sponsored = status("employer sponsored work permit");
  assert.equal(renewal.length, 2);
  assert.equal(sponsored.length, 3);
  assert.equal(status("work authorization verified").length, 1);
  for (const r of records) {
    const carries = byEmployee.has(r.employee_id);
    assert.equal(carries, renewal.includes(r.employee_id) || sponsored.includes(r.employee_id), "reverification disagrees with the record set");
  }
  assert.deepEqual(renewal.map((e) => byEmployee.get(e).due_date).sort(), ["2026-10-19", "2026-11-13"]);
  assert.deepEqual(sponsored.map((e) => byEmployee.get(e).due_date).sort(), ["2027-03-15", "2027-06-30", "2028-01-31"]);
  for (const e of sponsored) assert.ok(!inside(byEmployee.get(e).due_date, WINDOW[0], WINDOW[1]));
  const drawn = reverify.filter((o) => !renewal.includes(o.employee_id) && !sponsored.includes(o.employee_id)).map((o) => o.due_date).sort();
  assert.deepEqual(drawn, ["2026-09-25", "2026-12-04", "2027-02-19", "2027-05-07", "2027-08-20", "2027-11-12", "2028-04-28"]);
});

test("HR-C8-T17: HR-15 every drawn employee is inside the recomputed pool (X43)", () => {
  const people = roster();
  const active = people.filter((r) => r.employment_status === "active");
  const { rows: records } = hr17();
  const hr17Ids = new Set(records.map((r) => r.employee_id));
  const hr08 = new Set();
  for (const r of table("datasets", "hr", "review-cycle-roster", "review-assignments.csv").rows) {
    hr08.add(r.reviewee_employee_id);
    hr08.add(r.reviewer_employee_id);
  }
  const hr18 = new Set(table("datasets", "hr", "hris-export", "hris-case-queue.csv").rows.map((r) => r.subject_employee_id));
  const bands = table("datasets", "hr", "compensation-band-dataset", "compensation-bands.csv").rows;
  const maxByBand = new Map(bands.map((b) => [b.band_id, Number(b.band_max)]));
  const pay = hr12();
  const above = pay.filter((r) => Number(r.base_pay_amount) > maxByBand.get(r.band_id)).map((r) => r.employee_id);
  assert.equal(above.length, 1);
  const leaving = departing().map((r) => r.employee_id);
  const root = join(REPO_ROOT, "artifacts");
  const corpus = readdirSync(root, { recursive: true }).map(String)
    .filter((n) => n.endsWith(".md") || n.endsWith(".json")).map((n) => readFileSync(join(root, n), "utf8")).join("\n");
  const named = new Set(active.filter((r) => corpus.includes(`${r.first_name} ${r.last_name}`)).map((r) => r.employee_id));
  const base = active
    .filter((r) => r.department !== "People" && r.employee_id !== "EMP-0001")
    .filter((r) => !hr17Ids.has(r.employee_id) && !named.has(r.employee_id))
    .filter((r) => !hr08.has(r.employee_id) && !hr18.has(r.employee_id))
    .filter((r) => !above.includes(r.employee_id) && !leaving.includes(r.employee_id));
  assert.equal(base.length, 438);
  // HR-12's breaching band group, recomputed from the committed pay rows.
  const groups = new Map();
  for (const r of pay) {
    if (!groups.has(r.band_id)) groups.set(r.band_id, { cohort_a: [], cohort_b: [] });
    groups.get(r.band_id)[r.synthetic_equity_cohort].push(r);
  }
  const mean = (rows) => rows.reduce((s, r) => s + Number(r.base_pay_amount), 0) / rows.length;
  const breaching = [...groups.values()].filter((g) => g.cohort_a.length >= 5 && g.cohort_b.length >= 5)
    .filter((g) => Math.abs(Math.round((10000 * (mean(g.cohort_a) - mean(g.cohort_b))) / mean(g.cohort_a)) / 100) >= 5);
  assert.equal(breaching.length, 1);
  const band = new Set([...breaching[0].cohort_a, ...breaching[0].cohort_b].map((r) => r.employee_id));
  assert.equal(band.size, 19);
  const requesters = new Set(table("datasets", "hr", "helpdesk-request-queue", "helpdesk-requests.csv").rows.map((r) => r.requester_employee_id));
  assert.equal(requesters.size, 20);
  const unverified = table("datasets", "hr", "benefits-census", "dependents.csv").rows.filter((d) => d.documentation_status === "unverified").map((d) => d.employee_id);
  assert.equal(unverified.length, 1);
  const c8 = base.filter((r) => !requesters.has(r.employee_id) && !unverified.includes(r.employee_id) && !band.has(r.employee_id));
  assert.equal(c8.length, 399);
  const loc = new Map(locations().map((r) => [r.employee_id, r]));
  const pool = new Set(c8.filter((r) => loc.get(r.employee_id).work_state !== "US-DE").map((r) => r.employee_id));
  assert.equal(pool.size, 241, "the draw pool moved");
  assert.equal(EXPECTED_DRAW_POOL, pool.size, "the generator's guarded constant disagrees with the recomputed pool");
  // Drawn employees: every obligation carrier except the five mixed sensitivity holders X41 fixes.
  const drawn = new Set(obligations().map((o) => o.employee_id).filter((e) => !hr17Ids.has(e)));
  assert.equal(drawn.size, 18);
  const byId = new Map(people.map((r) => [r.employee_id, r]));
  for (const e of drawn) {
    assert.ok(pool.has(e), "a drawn employee sits outside the recomputed pool");
    assert.ok(!requesters.has(e) && !unverified.includes(e) && !band.has(e) && !above.includes(e) && !hr18.has(e) && !hr08.has(e) && !named.has(e));
    assert.notEqual(byId.get(e).department, "People");
    assert.notEqual(e, "EMP-0001");
  }
  const fixed = obligations().map((o) => o.employee_id).filter((e) => hr17Ids.has(e));
  assert.equal(new Set(fixed).size, 5);
  for (const e of fixed) assert.equal(obligations().filter((o) => o.employee_id === e).map((o) => o.rule_id).join(","), "OBR-03");
});

test("HR-C8-T18: HR-15 every code joins HR-21 and as_of agrees (X44, X45)", () => {
  const juris = table("datasets", "hr", "employment-ai-watch-list", "jurisdictions.csv").rows;
  const parent = new Map(juris.map((j) => [j.code, j.parent_code]));
  for (const r of locations()) {
    assert.ok(parent.has(r.work_state), `${r.work_state} misses the watch list`);
    if (r.work_locality) assert.equal(parent.get(r.work_locality), r.work_state);
  }
  for (const o of obligations()) if (o.target_jurisdiction_code) assert.ok(parent.has(o.target_jurisdiction_code));
  assert.equal(juris.find((j) => j.code === "US-DE").coverage_status, "not_researched");
  assert.equal(locations().filter((r) => r.work_state === "US-MD").length, 0);
  const watch = table("datasets", "hr", "employment-ai-watch-list", "watch-list-grammar.csv").rows[0];
  assert.equal(watch.as_of, AS_OF);
  assert.equal(grammar().watch_list_as_of, watch.as_of);
  const records = read("datasets", "hr", "employment-ai-watch-list", "employment-ai-watch-list.jsonl").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
  assert.equal(records.filter((r) => r.jurisdiction_code === "US-MD").length, 1, "Maryland holds one watch list row");
  for (const r of records) {
    assert.ok(r.verified_on <= AS_OF);
    for (const o of r.obligations) assert.ok(!(o.applies_from && inside(o.applies_from, WINDOW[0], WINDOW[1])), "a watch list obligation applies inside the alert window");
  }
});

test("HR-C8-T19: HR-15 carries no HR-17 value, name, money, URL, statute or dash (X42, X46), in bytes or source", () => {
  const { rows: records } = hr17();
  const VALUE_COLUMNS = [
    "health_accommodation_note", "occupational_health_status", "trade_union_membership",
    "date_of_birth", "criminal_record_check_status", "immigration_status",
    "home_city", "emergency_contact_name", "emergency_contact_phone",
  ];
  const values = new Set();
  for (const rec of records) for (const c of VALUE_COLUMNS) if (rec[c]) values.add(rec[c]);
  const names = roster().map((r) => `${r.first_name} ${r.last_name}`);
  for (const file of readdirSync(join(REPO_ROOT, ...DIR))) {
    const text = read(...DIR, file);
    assert.ok(!text.includes(EM) && !text.includes(EN), `${file} carries a dash`);
    assert.ok(!/https?:\/\/|www\.|@|\$|%/.test(text), `${file} carries a URL, an email, money or a percent`);
    assert.doesNotMatch(text, /\b(FMLA|USERRA|ILCS|U\.S\.C|CFR|Act|Title VII|Law|HB|SB)\b/, `${file} names a statute`);
    assert.doesNotMatch(text, /(^|[^A-Za-z])EAW-[0-9]/m, `${file} carries a watch list row id`);
    for (const name of names) assert.ok(!text.includes(name), `${file} carries a roster name`);
    for (const row of hr15(file).rows) {
      for (const cell of Object.values(row)) {
        assert.ok(!values.has(cell), `${file} carries a mixed sensitivity value string`);
        assert.deepEqual(moneyMatches(cell), [], `${file} carries a money shape`);
      }
    }
  }
  assert.deepEqual(hr15("compliance-obligations.csv").cols.filter((c) => /flag|alert|overdue|risk|priority|stale/.test(c)), []);
  for (const source of ["datagen/src/generators/hr-15-leave-compliance-roster.js", "tests/generators/hr-15-leave-compliance-roster.test.js"]) {
    const text = read(source);
    assert.ok(!text.includes(String.fromCharCode(0x2014)) && !text.includes(String.fromCharCode(0x2013)), `${source} carries a dash`);
  }
});

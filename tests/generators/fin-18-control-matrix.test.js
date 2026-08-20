// FIN-18 control-matrix: the SOX control population module 20 monitors. The two
// planted defects are re-derived here from the emitted bytes by the same
// predicate a learner would write, never read off a flag, and both are asserted
// by cardinality rather than by control id, so a reseed that moves a plant stays
// green and a reseed that destroys one fails.
//
// The joins are checked against the shipped pack rather than against a list
// retyped here: evidence artifacts against a manifest rebuilt from disk,
// decisions against the FIN-39 matrix as it generates today, owners and testers
// against CORE-04, and the tester population against FIN-19's own output.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { buildManifest } from "../../datagen/src/manifest.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";
import { closeDayDate } from "../../datagen/src/dates.js";
import { financeRoster, ROLE_LADDER } from "../../datagen/src/generators/finance-roles.js";
import { buildDecisionAuthorityMatrix } from "../../datagen/src/generators/fin-39-decision-authority-matrix.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
const spec = specs.byId.get("FIN-18");
const roster = financeRoster();

/** The as-of the whole of cluster 2 is dated at: D+4 of the March 2026 close. */
const AS_OF = "2026-04-06";

const PROCESSES = ["order_to_cash", "procure_to_pay", "close", "access", "treasury"];
const CONTROL_TYPES = ["preventive", "detective"];
const FREQUENCY_MONTHS = { monthly: 1, quarterly: 3, annual: 12 };
const TEST_RESULTS = ["pass", "exception", "not_tested"];

/**
 * Advance an ISO date by whole months, restated here rather than imported so a
 * change to the generator's own arithmetic shows up as a disagreement. Every
 * date in this file sits on day 28 or earlier, so no month-end clamp is needed
 * and the test asserts that too.
 */
function addMonths(isoDate, months) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const zero = (y * 12 + (m - 1)) + months;
  const year = Math.floor(zero / 12);
  const month = (zero % 12) + 1;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Every spec id a manifest rebuilt from what is actually on disk lists. */
function manifestIds() {
  const fresh = buildManifest({ root: REPO_ROOT, specs, existingManifest: {} });
  return new Set([...fresh.datasets.map((d) => d.id), ...fresh.artifacts.map((a) => a.id)]);
}

/** The roster row carrying the planted segregation-of-duties conflict, by rule. */
function sodConflictRow() {
  const conflicted = roster.filter(
    (r) => r.department === "Finance" && r.employment_status === "active" && r.finance_system_role.includes(",")
  );
  assert.equal(conflicted.length, 1, "CORE-04 should carry exactly one comma-valued finance_system_role");
  return conflicted[0];
}

function table() {
  const files = generateArtifact(spec, canon);
  const parsed = csvTable(fileByPath(files, "control-matrix.csv").content);
  assert.deepEqual(parsed.cols, spec.columns, "FIN-18: header does not match spec.columns");
  return parsed;
}

const tested = (row) => row.test_result !== "not_tested";

test("FIN-18: 26 controls numbered CTL-001 upward, across all five processes and every vocabulary in use", () => {
  const { rows } = table();
  assert.equal(rows.length, 26, "the matrix holds 26 controls");
  rows.forEach((row, i) => {
    assert.equal(row.control_id, `CTL-${String(i + 1).padStart(3, "0")}`, "control ids run in file order");
  });
  for (const row of rows) {
    assert.ok(PROCESSES.includes(row.process), `${row.control_id} process "${row.process}"`);
    assert.ok(CONTROL_TYPES.includes(row.control_type), `${row.control_id} control_type "${row.control_type}"`);
    assert.ok(row.frequency in FREQUENCY_MONTHS, `${row.control_id} frequency "${row.frequency}"`);
    assert.ok(TEST_RESULTS.includes(row.test_result), `${row.control_id} test_result "${row.test_result}"`);
    assert.ok(["true", "false"].includes(row.key_control), `${row.control_id} key_control "${row.key_control}"`);
    assert.ok(row.control_name.length > 0, `${row.control_id} has no name`);
    assert.ok(row.control_objective.length > 0, `${row.control_id} has no objective`);
  }
  for (const process of PROCESSES) {
    assert.ok(rows.some((r) => r.process === process), `no control covers ${process}`);
  }
  for (const frequency of Object.keys(FREQUENCY_MONTHS)) {
    assert.ok(rows.some((r) => r.frequency === frequency), `no ${frequency} control`);
  }
  assert.equal(new Set(rows.map((r) => r.control_name)).size, rows.length, "control names must be distinct");
});

test("FIN-18: next_due_date is last_tested_date advanced by that row's own frequency in months", () => {
  const { rows } = table();
  for (const row of rows) {
    assert.match(row.last_tested_date, /^\d{4}-\d{2}-\d{2}$/, `${row.control_id} last_tested_date`);
    assert.ok(
      Number(row.last_tested_date.slice(8)) <= 28,
      `${row.control_id} is tested after the 28th, where month arithmetic stops being unambiguous`
    );
    assert.equal(
      row.next_due_date,
      addMonths(row.last_tested_date, FREQUENCY_MONTHS[row.frequency]),
      `${row.control_id} next_due_date is not its own frequency past its last test`
    );
    assert.ok(row.last_tested_date <= row.next_due_date, `${row.control_id} is due before it was last tested`);
  }
});

test("FIN-18: exactly one control is past its testing due date, and it is one that was not tested", () => {
  const { rows } = table();
  const overdue = rows.filter((r) => r.next_due_date < AS_OF && r.test_result === "not_tested");
  assert.equal(overdue.length, 1, `${overdue.length} controls are overdue and untested, expected 1`);

  // Nothing else in the file is late at all, so the finding survives a reader
  // who writes the rule as "due before the as-of" without the result clause.
  const late = rows.filter((r) => r.next_due_date < AS_OF);
  assert.equal(late.length, 1, "only the planted control should carry a due date before the as-of");
  assert.equal(late[0].control_id, overdue[0].control_id);
  assert.equal(overdue[0].evidence_reference, "", "a control that was never tested carries no binder locator");
});

test("FIN-18: exactly one tested control passed with nothing in the evidence binder", () => {
  const { rows } = table();
  const missing = rows.filter((r) => r.test_result === "pass" && r.evidence_reference === "");
  assert.equal(missing.length, 1, `${missing.length} controls passed without evidence, expected 1`);
  assert.equal(missing[0].key_control, "true", "the control that passed unsupported is a key control");
  assert.notEqual(missing[0].evidence_artifact, "", "it still names the artifact its evidence would come from");

  const locators = [];
  for (const row of rows) {
    if (!tested(row)) {
      assert.equal(row.evidence_reference, "", `${row.control_id} was not tested but carries a binder locator`);
      continue;
    }
    if (row.control_id === missing[0].control_id) continue;
    assert.match(row.evidence_reference, /^EVB-2026Q1-\d{3}$/, `${row.control_id} evidence_reference`);
    locators.push(row.evidence_reference);
  }
  assert.equal(new Set(locators).size, locators.length, "binder locators must be unique");
  assert.deepEqual(
    [...locators].sort(),
    locators.map((_, i) => `EVB-2026Q1-${String(i + 1).padStart(3, "0")}`),
    "locators run without a gap, so the missing one leaves no numbering hole to spot it by"
  );
});

test("FIN-18: exceptions_noted agrees with the test result rather than restating it", () => {
  const { rows } = table();
  let exceptions = 0;
  for (const row of rows) {
    if (row.test_result === "not_tested") {
      assert.equal(row.exceptions_noted, "", `${row.control_id} was not tested, so it counts no exceptions`);
      continue;
    }
    assert.match(row.exceptions_noted, /^\d+$/, `${row.control_id} exceptions_noted`);
    const count = Number(row.exceptions_noted);
    if (row.test_result === "pass") {
      assert.equal(count, 0, `${row.control_id} passed with ${count} exceptions`);
    } else {
      assert.ok(count > 0, `${row.control_id} is an exception with none noted`);
      exceptions += 1;
    }
  }
  assert.ok(exceptions >= 2, "the population needs several exceptions, so the two plants are not the only findings");
});

test("FIN-18: every evidence artifact is a spec id the pack actually ships", () => {
  const { rows } = table();
  const ids = manifestIds();
  let cited = 0;
  for (const row of rows) {
    if (row.evidence_artifact === "") continue;
    cited += 1;
    assert.ok(
      ids.has(row.evidence_artifact),
      `${row.control_id} cites ${row.evidence_artifact}, which is not on disk (run 'node datagen/src/cli.js generate --all-structured')`
    );
  }
  assert.ok(cited >= 20, `only ${cited} controls name where their evidence comes from`);
});

test("FIN-18: every related decision is a control_id in the shipped FIN-39 matrix, and those are the key controls", () => {
  const { rows } = table();
  const decisions = new Set(buildDecisionAuthorityMatrix().map((r) => r.control_id));
  let linked = 0;
  for (const row of rows) {
    if (row.related_decision_id === "") {
      assert.equal(row.key_control, "false", `${row.control_id} is a key control with no decision behind it`);
      continue;
    }
    linked += 1;
    assert.ok(
      decisions.has(row.related_decision_id),
      `${row.control_id} points at ${row.related_decision_id}, which the authority matrix does not carry`
    );
    assert.equal(row.key_control, "true", `${row.control_id} governs a named decision but is not a key control`);
  }
  assert.ok(linked >= 8, `only ${linked} controls tie back to the authority matrix`);
});

test("FIN-18: owners hold the role they own under, testers hold no entitlement at all, and neither is the conflicted row", () => {
  const { rows } = table();
  const conflicted = sodConflictRow();
  const byId = new Map(roster.map((r) => [r.employee_id, r]));

  for (const row of rows) {
    const owner = byId.get(row.owner_employee_id);
    const tester = byId.get(row.tester_employee_id);
    assert.ok(owner, `${row.control_id} owner is not on the roster`);
    assert.ok(tester, `${row.control_id} tester is not on the roster`);
    assert.notEqual(row.owner_employee_id, row.tester_employee_id, `${row.control_id} owns and tests itself`);
    for (const [person, what] of [[owner, "owner"], [tester, "tester"]]) {
      assert.equal(person.department, "Finance", `${row.control_id} ${what} is in ${person.department}`);
      assert.equal(person.employment_status, "active", `${row.control_id} ${what} has left`);
      assert.notEqual(
        person.employee_id, conflicted.employee_id,
        `${row.control_id} ${what} is the roster's own segregation-of-duties row`
      );
    }
    assert.ok(ROLE_LADDER.includes(row.owner_role), `${row.control_id} owner_role "${row.owner_role}" is off the ladder`);
    assert.equal(owner.role_title, row.owner_role, `${row.control_id} owner does not hold owner_role`);
    assert.notEqual(
      owner.finance_system_role, "",
      "a control owner runs the process, so the owner holds access to the system the control sits in"
    );
    assert.equal(
      tester.finance_system_role, "",
      "a tester holds no entitlement in the system being tested, which is what makes the test independent"
    );
  }
  assert.ok(new Set(rows.map((r) => r.tester_employee_id)).size >= 3, "testing should be spread across several people");
});

test("FIN-18: the tester population is exactly the Finance employees FIN-19 does not list", () => {
  const { rows } = table();
  const accessRows = csvTable(
    fileByPath(generateArtifact(specs.byId.get("FIN-19"), canon), "user-access-role-assignments.csv").content
  ).rows;
  const entitled = new Set(accessRows.map((r) => r.employee_id));
  for (const row of rows) {
    assert.ok(entitled.has(row.owner_employee_id), `${row.control_id} owner does not appear on the access list`);
    assert.ok(!entitled.has(row.tester_employee_id), `${row.control_id} tester appears on the access list they test`);
  }
});

test("FIN-18: the quarterly access review is dated off the close, not off a calendar guess", () => {
  const { rows } = table();
  const review = rows.filter(
    (r) => r.process === "access" && r.frequency === "quarterly" && r.test_result === "not_tested"
  );
  assert.equal(review.length, 1, "exactly one access review should be open at the as-of");
  assert.equal(
    review[0].next_due_date, closeDayDate("D+5"),
    "the access review is due at D+5 of the close, which is why the close checklist still carries it open at D+4"
  );
  assert.ok(review[0].next_due_date > AS_OF, "due at D+5 is not yet late at D+4");

  const accessRows = csvTable(
    fileByPath(generateArtifact(specs.byId.get("FIN-19"), canon), "user-access-role-assignments.csv").content
  ).rows;
  const reviewDates = new Set(accessRows.map((r) => r.last_review_date));
  assert.equal(reviewDates.size, 1, "the access list carries one prior review date");
  assert.equal(
    review[0].last_tested_date, [...reviewDates][0],
    "the control's last test is the access list's own last review"
  );
});

test("FIN-18: two runs are byte identical", () => {
  const runA = generateArtifact(spec, canon);
  const runB = generateArtifact(spec, canon);
  assert.deepEqual(runA, runB);
});

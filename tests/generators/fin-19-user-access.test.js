// FIN-19 user-access-role-assignments: the finance system access list module 20
// monitors. Every check here re-derives the file from CORE-04 rather than
// reading a label off it, because the whole claim of this dataset is that the
// grants are computed from the roster and not drawn.
//
// The published mapping is restated literally below rather than imported as the
// generator's own predicate. Importing it and then "checking" the rows with it
// would only assert that a function equals itself: a mapping edit would change
// both sides and stay green. The test does import the generator's exported
// table, but only to assert it still equals this copy, which is what makes a
// silent mapping edit a red test.
//
// No test names the employee who carries the segregation-of-duties conflict.
// The conflict is found by predicate and asserted by cardinality, so a roster
// reroll that moves it stays green and a roster reroll that destroys it fails.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";
import { addDays, rollForwardPastWeekend, isWeekend } from "../../datagen/src/dates.js";
import { financeRoster } from "../../datagen/src/generators/finance-roles.js";
import { ROLE_ENTITLEMENTS, LAST_REVIEW_DATE } from "../../datagen/src/generators/fin-19-access-assignments.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
const spec = specs.byId.get("FIN-19");
const roster = financeRoster();

/** The as-of the whole of cluster 2 is dated at: D+4 of the March 2026 close. */
const AS_OF = "2026-04-06";

// The published mapping, restated. finance_system_role cell -> the grants it
// yields, in order. A comma-valued cell yields the union, in cell order.
const PUBLISHED = {
  "AP Clerk": [
    ["AP", "ap_invoice_entry", "create"],
    ["AP", "vendor_master_maintain", "modify"],
  ],
  "AR Clerk": [
    ["AR", "ar_invoice_entry", "create"],
    ["AR", "ar_credit_memo_entry", "create"],
  ],
  "AP Approver": [["AP", "ap_invoice_approve", "approve"]],
  "Payment Approver": [["PAY", "payment_run_release", "release"]],
  "GL Admin": [
    ["GL", "je_entry", "create"],
    ["GL", "gl_account_maintain", "modify"],
  ],
  "Read Only": [["GL", "gl_inquiry", "view"]],
};

const PREPARER_CLASSES = new Set(["create", "modify"]);
const RELEASER_CLASSES = new Set(["approve", "release"]);

/** The finance_system_role cell split into the roles it names, in cell order. */
const rolesIn = (cell) => cell.split(",").map((part) => part.trim()).filter((part) => part.length > 0);

/** The population the file claims: active Finance employees carrying a system role. */
const entitledRoster = () =>
  roster.filter(
    (r) => r.department === "Finance" && r.employment_status === "active" && r.finance_system_role !== ""
  );

/** Every (employee_id, system, entitlement, class) the published mapping yields. */
function expectedGrants() {
  const out = [];
  for (const person of entitledRoster()) {
    for (const [roleIndex, role] of rolesIn(person.finance_system_role).entries()) {
      const grants = PUBLISHED[role];
      assert.ok(grants, `the published mapping has no entry for the roster role "${role}"`);
      for (const [system, entitlement, entitlement_class] of grants) {
        out.push({ employee_id: person.employee_id, system, entitlement, entitlement_class, roleIndex, person });
      }
    }
  }
  return out;
}

/** employee_ids holding a create/modify grant and an approve/release grant. */
function toxicPairHolders(rows) {
  const byEmployee = new Map();
  for (const row of rows) {
    if (!byEmployee.has(row.employee_id)) byEmployee.set(row.employee_id, []);
    byEmployee.get(row.employee_id).push(row.entitlement_class);
  }
  return [...byEmployee]
    .filter(([, classes]) =>
      classes.some((c) => PREPARER_CLASSES.has(c)) && classes.some((c) => RELEASER_CLASSES.has(c))
    )
    .map(([employeeId]) => employeeId);
}

function table() {
  const files = generateArtifact(spec, canon);
  const file = fileByPath(files, "user-access-role-assignments.csv");
  const parsed = csvTable(file.content);
  assert.deepEqual(parsed.cols, spec.columns, "FIN-19: header does not match spec.columns");
  return parsed;
}

test("FIN-19: 45 grants across the 29 entitled roster rows, and the roster rows without a system role appear nowhere", () => {
  const { rows } = table();
  assert.equal(rows.length, 45, "the access list holds 45 grants");
  assert.equal(new Set(rows.map((r) => r.assignment_id)).size, rows.length, "assignment ids must be unique");
  rows.forEach((row, i) => {
    assert.equal(row.assignment_id, `UAR-${String(i + 1).padStart(4, "0")}`, "assignment ids run in file order");
  });

  const entitled = entitledRoster();
  assert.equal(entitled.length, 29, "CORE-04 carries 29 entitled Finance rows");
  assert.deepEqual(
    [...new Set(rows.map((r) => r.employee_id))].sort(),
    entitled.map((r) => r.employee_id).sort(),
    "the users on the access list are exactly the roster rows carrying a finance_system_role"
  );

  const absent = roster.filter(
    (r) => r.department === "Finance" && r.employment_status === "active" && r.finance_system_role === ""
  );
  assert.ok(absent.length > 0, "the roster should carry Finance employees with no system role at all");
  for (const person of absent) {
    assert.ok(
      !rows.some((r) => r.employee_id === person.employee_id),
      "an entitlement list is not a headcount: a roster row with no system role must not appear"
    );
  }
  for (const row of rows) {
    const person = roster.find((r) => r.employee_id === row.employee_id);
    assert.ok(person, `${row.assignment_id} names an employee who is not on the roster`);
    assert.equal(person.employment_status, "active", `${row.assignment_id} names a departed employee`);
    assert.equal(row.department, "Finance", `${row.assignment_id} department`);
    assert.equal(row.employee_name, `${person.first_name} ${person.last_name}`, `${row.assignment_id} employee_name`);
    assert.equal(row.role_title, person.role_title, `${row.assignment_id} role_title`);
  }
});

test("FIN-19: the grants recompute exactly from the CORE-04 finance_system_role column", () => {
  const { rows } = table();
  const emitted = rows
    .map((r) => `${r.employee_id}|${r.system}|${r.entitlement}|${r.entitlement_class}`)
    .sort();
  const expected = expectedGrants()
    .map((g) => `${g.employee_id}|${g.system}|${g.entitlement}|${g.entitlement_class}`)
    .sort();
  assert.deepEqual(emitted, expected, "the emitted grants do not recompute from the roster by the published mapping");
});

test("FIN-19: the generator's published mapping is still the one this test recomputes from", () => {
  assert.deepEqual(
    ROLE_ENTITLEMENTS,
    PUBLISHED,
    "the generator's mapping changed: update this test's copy deliberately or revert the mapping"
  );
});

test("FIN-19: system and entitlement_class are a fixed vocabulary, and each entitlement carries one of each", () => {
  const { rows } = table();
  const systems = new Set(["AP", "AR", "GL", "PAY"]);
  const classes = new Set(["create", "modify", "approve", "release", "view"]);
  const seen = new Map();
  for (const row of rows) {
    assert.ok(systems.has(row.system), `${row.assignment_id} system "${row.system}"`);
    assert.ok(classes.has(row.entitlement_class), `${row.assignment_id} class "${row.entitlement_class}"`);
    const signature = `${row.system}|${row.entitlement_class}`;
    if (seen.has(row.entitlement)) {
      assert.equal(seen.get(row.entitlement), signature, `${row.entitlement} carries two different system/class pairs`);
    } else {
      seen.set(row.entitlement, signature);
    }
  }
  for (const system of systems) assert.ok(rows.some((r) => r.system === system), `no grant on ${system}`);
  for (const cls of classes) assert.ok(rows.some((r) => r.entitlement_class === cls), `no ${cls} grant`);
});

test("FIN-19: exactly one user can both prepare and release, and the conflict comes out of the roster's own cell", () => {
  const { rows } = table();
  const holders = toxicPairHolders(rows);
  assert.equal(holders.length, 1, `${holders.length} users hold a preparer and a releaser entitlement, expected 1`);
  const person = roster.find((r) => r.employee_id === holders[0]);
  assert.ok(person, "the conflicted user is not on the roster");
  assert.ok(
    rolesIn(person.finance_system_role).length > 1,
    "the conflict must come from the roster's own comma-valued cell, not from a draw made here"
  );
  const commaValued = entitledRoster().filter((r) => rolesIn(r.finance_system_role).length > 1);
  assert.equal(commaValued.length, 1, "CORE-04 should carry exactly one comma-valued finance_system_role");
  assert.equal(holders[0], commaValued[0].employee_id, "the conflict sits on the roster's comma-valued row");
});

test("FIN-19: je_entry with gl_account_maintain is not treated as toxic, so the GL administrators are clean", () => {
  const { rows } = table();
  const conflicted = new Set(toxicPairHolders(rows));
  const glAdmins = rows.filter((r) => r.entitlement === "je_entry").map((r) => r.employee_id);
  assert.ok(glAdmins.length >= 4, `expected several GL administrators, found ${glAdmins.length}`);
  for (const employeeId of glAdmins) {
    const held = rows.filter((r) => r.employee_id === employeeId).map((r) => r.entitlement);
    assert.ok(held.includes("gl_account_maintain"), "a GL administrator holds both GL grants");
    if (rolesIn(roster.find((r) => r.employee_id === employeeId).finance_system_role).length > 1) continue;
    assert.ok(
      !conflicted.has(employeeId),
      "posting entries and maintaining accounts is not the toxic pair this file plants"
    );
  }
});

test("FIN-19: inferring entitlements from role_title instead would cost the plant its cardinality", () => {
  const { rows } = table();
  const published = new Set(toxicPairHolders(rows));

  // The counterfactual the spec rejects: read a preparer right off the job
  // title as well as off the system role.
  const TITLE_INFERENCE = {
    "AP Clerk": PUBLISHED["AP Clerk"],
    "AR Clerk": PUBLISHED["AR Clerk"],
    "Staff Accountant": PUBLISHED["GL Admin"],
  };
  const inferred = [];
  for (const person of entitledRoster()) {
    const classes = rolesIn(person.finance_system_role).flatMap((role) => PUBLISHED[role].map((g) => g[2]));
    for (const grant of TITLE_INFERENCE[person.role_title] ?? []) classes.push(grant[2]);
    if (classes.some((c) => PREPARER_CLASSES.has(c)) && classes.some((c) => RELEASER_CLASSES.has(c))) {
      inferred.push(person.employee_id);
    }
  }
  const extra = inferred.filter((id) => !published.has(id));
  assert.ok(
    extra.length >= 8,
    `inferring from role_title adds ${extra.length} conflicted users; the spec says it adds eight, and one plant would become many`
  );
});

test("FIN-19: the dates are derived from the roster, and the list carries the prior quarterly review date on every row", () => {
  const { rows } = table();
  assert.equal(LAST_REVIEW_DATE, "2026-01-07", "the prior quarterly access review is dated 2026-01-07");
  const byEmployee = new Map();
  for (const row of rows) {
    assert.equal(row.last_review_date, LAST_REVIEW_DATE, `${row.assignment_id} last_review_date`);
    const person = roster.find((r) => r.employee_id === row.employee_id);
    assert.equal(row.granted_by_employee_id, person.manager_employee_id, `${row.assignment_id} granted_by`);
    assert.notEqual(row.granted_by_employee_id, row.employee_id, `${row.assignment_id} was granted by its own holder`);
    assert.ok(row.granted_date <= row.last_used_date, `${row.assignment_id} was used before it was granted`);
    assert.ok(row.last_used_date <= AS_OF, `${row.assignment_id} was used after the as-of`);
    assert.ok(!isWeekend(row.granted_date), `${row.assignment_id} granted_date falls on a weekend`);
    assert.ok(!isWeekend(row.last_used_date), `${row.assignment_id} last_used_date falls on a weekend`);
    if (!byEmployee.has(row.employee_id)) byEmployee.set(row.employee_id, []);
    byEmployee.get(row.employee_id).push(row);
  }

  // granted_date: the first business day on or after the roster start date for
  // the first role in the cell, a year on for each further role, so a
  // comma-valued cell reads as access that accreted rather than as a hire-day
  // package.
  for (const grant of expectedGrants()) {
    const person = grant.person;
    const expected = rollForwardPastWeekend(addDays(person.start_date, 365 * grant.roleIndex));
    const row = byEmployee
      .get(grant.employee_id)
      .find((r) => r.entitlement === grant.entitlement);
    assert.ok(row, `no emitted row for ${grant.entitlement}`);
    assert.equal(row.granted_date, expected, `${row.assignment_id} granted_date does not follow the roster start date`);
  }
});

test("FIN-19: no single grant is the oldest by itself, so the file plants no dormant-account exception", () => {
  const { rows } = table();
  const oldest = rows.map((r) => r.last_used_date).sort()[0];
  const atOldest = rows.filter((r) => r.last_used_date === oldest);
  assert.ok(
    atOldest.length >= 2,
    "one grant alone at the oldest last_used_date would read as a planted dormant account, and this file plants only the SoD conflict"
  );
  assert.ok(
    new Set(rows.map((r) => r.last_used_date)).size >= 10,
    "usage should be spread across the window rather than stacked on one day"
  );
});

test("FIN-19: two runs are byte identical", () => {
  const runA = generateArtifact(spec, canon);
  const runB = generateArtifact(spec, canon);
  assert.deepEqual(runA, runB);
});

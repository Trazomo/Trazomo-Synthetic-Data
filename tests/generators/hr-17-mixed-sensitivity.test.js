// HR-17 mixed-sensitivity-employee-dataset: the guard over the record set whose
// whole claim is that sensitivity is computed rather than declared.
//
// Every check here re-derives the file from CORE-04 and from the two published
// field classes, in this file's own code. The tier rule is restated below
// rather than imported as the generator's own predicate: importing it and then
// "checking" the rows with it would only assert that a function equals itself,
// and a rule edit would change both sides and stay green. The test does import
// the generator's exported lists, but only to assert they still equal these
// copies, which is what makes a silent reclassification a red test.
//
// No test names the record whose tier disagrees with its fields. The
// disagreement is found by recomputing the rule over all forty records and is
// asserted by cardinality, so a roster reroll that moves it stays green and a
// reroll that destroys it fails.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";
import { diffDays } from "../../datagen/src/dates.js";
import { createRng } from "../../datagen/src/seed.js";
import { buildRoster } from "../../datagen/src/generators/core-04-people-roster.js";
import {
  SPECIAL_CATEGORY_FIELDS,
  RESTRICTED_FIELDS,
  LAWFUL_BASIS_BY_TIER,
} from "../../datagen/src/generators/hr-17-mixed-sensitivity.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
const spec = specs.byId.get("HR-17");
const roster = buildRoster(createRng("CORE-04", "roster"));

/** The extract stamp the spec pins the artifact's whole period to. */
const EXTRACTED_ON = "2026-04-03";
const RECORD_COUNT = 40;

/** The two roster rows no HR cluster 1 artifact draws on. */
const EXCLUDED = new Set(["EMP-0001", "EMP-0002"]);

/** The stratification rule, restated. */
const STRATUM_FLOOR = 20;
const STRATUM_MIN = 2;
const STRATUM_MAX = 8;

/** The design counts the spec states, restated. */
const SPECIAL_CATEGORY_RECORDS = 12;
const RESTRICTED_ONLY_RECORDS = 9;
const NEITHER_RECORDS = 19;

// The two published field classes and the basis map, restated. These are the
// only inputs to the tier rule.
const PUBLISHED_SPECIAL_CATEGORY = [
  "health_accommodation_note", "occupational_health_status", "trade_union_membership",
];
const PUBLISHED_RESTRICTED = [
  "date_of_birth", "criminal_record_check_status", "immigration_status",
];
const PUBLISHED_BASIS = {
  special_category: "explicit_consent",
  restricted: "legal_obligation",
  ordinary: "contract",
};

/** The columns the dataset carries through from CORE-04, and where each comes from. */
const CARRIED_THROUGH = {
  full_name: (person) => `${person.first_name} ${person.last_name}`,
  work_email: (person) => person.email,
  department: (person) => person.department,
  role_title: (person) => person.role_title,
  manager_employee_id: (person) => person.manager_employee_id,
  hire_date: (person) => person.start_date,
};

const populated = (row, fields) => fields.some((field) => row[field] !== "");

/** The tier the published rule computes, implemented here rather than imported. */
function tierOf(row) {
  if (populated(row, PUBLISHED_SPECIAL_CATEGORY)) return "special_category";
  if (populated(row, PUBLISHED_RESTRICTED)) return "restricted";
  return "ordinary";
}

function table() {
  const files = generateArtifact(spec, canon);
  const file = fileByPath(files, "mixed-sensitivity-employee-dataset.csv");
  const parsed = csvTable(file.content);
  assert.deepEqual(parsed.cols, spec.columns, "HR-17: header does not match spec.columns");
  return parsed;
}

function content() {
  return fileByPath(generateArtifact(spec, canon), "mixed-sensitivity-employee-dataset.csv").content;
}

test("HR-17: forty records, ids running in file order, one extract stamp", () => {
  const { rows } = table();
  assert.equal(rows.length, RECORD_COUNT, "the record set holds forty records");
  rows.forEach((row, i) => {
    assert.equal(row.record_id, `MSD-2026-${String(i + 1).padStart(4, "0")}`, "record ids run in file order");
    assert.equal(row.extracted_on, EXTRACTED_ON, "every record carries the same extract stamp");
  });
  assert.equal(spec.period.start, EXTRACTED_ON, "spec.period.start has drifted from the extract stamp every row carries");
  assert.equal(spec.period.end, EXTRACTED_ON, "spec.period.end has drifted from the extract stamp every row carries");
  assert.equal(new Set(rows.map((r) => r.employee_id)).size, rows.length, "an employee appears at most once");
  assert.deepEqual(
    rows.map((r) => r.employee_id),
    [...rows.map((r) => r.employee_id)].sort(),
    "records run in employee_id order, which is what record_id is assigned from"
  );
});

test("HR-17: the published field classes and the lawful basis map are still the ones this test recomputes from", () => {
  assert.deepEqual(
    SPECIAL_CATEGORY_FIELDS,
    PUBLISHED_SPECIAL_CATEGORY,
    "the generator's special category list changed: update this copy deliberately or revert the list"
  );
  assert.deepEqual(
    RESTRICTED_FIELDS,
    PUBLISHED_RESTRICTED,
    "the generator's restricted list changed: update this copy deliberately or revert the list"
  );
  assert.deepEqual(
    LAWFUL_BASIS_BY_TIER,
    PUBLISHED_BASIS,
    "the generator's lawful basis map changed: update this copy deliberately or revert the map"
  );
  // The classification argument the record set exists to carry: these two are
  // sensitive without being a special category.
  for (const field of ["criminal_record_check_status", "immigration_status"]) {
    assert.ok(PUBLISHED_RESTRICTED.includes(field), `${field} belongs to the restricted class`);
    assert.ok(!PUBLISHED_SPECIAL_CATEGORY.includes(field), `${field} is not a special category field`);
  }
});

test("HR-C1-T5: every tier recomputes from the record's own populated fields, and exactly one record disagrees", () => {
  const { rows } = table();
  const tiers = new Set(["special_category", "restricted", "ordinary"]);
  const disagreeing = [];
  for (const row of rows) {
    assert.ok(tiers.has(row.sensitivity_tier), `sensitivity_tier "${row.sensitivity_tier}" is outside the vocabulary`);
    assert.equal(
      row.lawful_basis,
      PUBLISHED_BASIS[row.sensitivity_tier],
      "lawful_basis must follow the tier the record declares, wrong tier included"
    );
    if (row.sensitivity_tier !== tierOf(row)) disagreeing.push(row);
  }
  assert.equal(
    disagreeing.length,
    1,
    `${disagreeing.length} records declare a tier their own fields do not compute, expected 1`
  );
  assert.equal(tierOf(disagreeing[0]), "special_category", "the disagreeing record computes special_category");
  assert.equal(disagreeing[0].sensitivity_tier, "ordinary", "the disagreeing record reads ordinary");
  assert.equal(
    disagreeing[0].lawful_basis,
    PUBLISHED_BASIS.ordinary,
    "the wrong tier carries the wrong basis with it, which is the second leg of the finding"
  );
});

test("HR-17a: both cardinalities hold, so neither number alone finds the record", () => {
  const { rows } = table();
  const carrying = rows.filter((r) => populated(r, PUBLISHED_SPECIAL_CATEGORY));
  const readingOrdinary = rows.filter((r) => r.sensitivity_tier === "ordinary");
  assert.equal(
    carrying.length,
    SPECIAL_CATEGORY_RECORDS,
    "the population carrying a special category value is the first number a brief states"
  );
  assert.equal(
    readingOrdinary.length,
    NEITHER_RECORDS + 1,
    "the population reading ordinary is the second number a brief states"
  );
  const both = carrying.filter((r) => r.sensitivity_tier === "ordinary");
  assert.equal(both.length, 1, "only the intersection of the two populations resolves to one record");
});

test("HR-17: the three design populations split 12, 9 and 19 across the forty records", () => {
  const { rows } = table();
  const special = rows.filter((r) => populated(r, PUBLISHED_SPECIAL_CATEGORY));
  const restrictedOnly = rows.filter(
    (r) => !populated(r, PUBLISHED_SPECIAL_CATEGORY) && populated(r, PUBLISHED_RESTRICTED)
  );
  const neither = rows.filter(
    (r) => !populated(r, PUBLISHED_SPECIAL_CATEGORY) && !populated(r, PUBLISHED_RESTRICTED)
  );
  assert.equal(special.length, SPECIAL_CATEGORY_RECORDS, "records carrying a special category field");
  assert.equal(restrictedOnly.length, RESTRICTED_ONLY_RECORDS, "records restricted and nothing above it");
  assert.equal(neither.length, NEITHER_RECORDS, "records carrying neither class");
  assert.equal(special.length + restrictedOnly.length + neither.length, RECORD_COUNT, "the three populations are total");
  assert.ok(
    special.some((r) => populated(r, PUBLISHED_RESTRICTED)),
    "a special category record may also carry a restricted field, which is why the restricted-only count is qualified"
  );
});

test("HR-C1-T6: every employee_id resolves to an active roster row and the carried columns are byte-equal", () => {
  const { rows } = table();
  const byId = new Map(roster.map((r) => [r.employee_id, r]));
  for (const row of rows) {
    assert.ok(!EXCLUDED.has(row.employee_id), "the two reserved roster rows are excluded from this dataset");
    const person = byId.get(row.employee_id);
    assert.ok(person, `${row.record_id} names an employee who is not on the roster`);
    assert.equal(person.employment_status, "active", `${row.record_id} names a departed employee`);
    for (const [column, fromRoster] of Object.entries(CARRIED_THROUGH)) {
      assert.equal(row[column], fromRoster(person), `${row.record_id} ${column} does not match the roster byte for byte`);
    }
  }
});

test("HR-17: the record set is stratified, so no one department stands in for the company", () => {
  const { rows } = table();
  const contributed = new Map();
  for (const row of rows) contributed.set(row.department, (contributed.get(row.department) ?? 0) + 1);

  const activeByDepartment = new Map();
  for (const person of roster) {
    if (person.employment_status !== "active" || EXCLUDED.has(person.employee_id)) continue;
    activeByDepartment.set(person.department, (activeByDepartment.get(person.department) ?? 0) + 1);
  }

  let floors = 0;
  for (const [department, active] of activeByDepartment) {
    const count = contributed.get(department) ?? 0;
    if (active >= STRATUM_FLOOR) {
      floors += 1;
      assert.ok(count >= STRATUM_MIN, `${department} carries ${active} active rows and contributes ${count}`);
    }
    assert.ok(count <= STRATUM_MAX, `${department} contributes ${count} records, above the cap of ${STRATUM_MAX}`);
  }
  assert.ok(floors >= 5, "several departments should clear the stratification floor, or the rule asserts nothing");
});

test("HR-17: the drawn columns are internally consistent and obviously synthetic", () => {
  const { rows } = table();
  const rosterNames = new Set(roster.map((r) => `${r.first_name} ${r.last_name}`));
  const companyNames = [...canon.values()].map((entry) => entry.name.toLowerCase());

  for (const row of rows) {
    assert.match(row.emergency_contact_phone, /^\(555\) 555-0\d{3}$/, "contact numbers sit in the block reserved for fiction");
    assert.ok(row.emergency_contact_name !== "", "every record carries an emergency contact");
    assert.ok(
      !rosterNames.has(row.emergency_contact_name),
      "an emergency contact must not be a roster employee, or the contact column joins to the wrong thing"
    );
    assert.ok(row.home_city !== "", "every record carries a home city");
    const city = row.home_city.toLowerCase();
    assert.ok(
      !companyNames.some((name) => name.includes(city) || city.includes(name)),
      `the town name "${row.home_city}" collides with a canon company name`
    );
    if (row.date_of_birth !== "") {
      assert.match(row.date_of_birth, /^\d{4}-\d{2}-\d{2}$/, "a populated date of birth is ISO");
      const atHire = diffDays(row.date_of_birth, row.hire_date) / 365.25;
      const atExtract = diffDays(row.date_of_birth, EXTRACTED_ON) / 365.25;
      assert.ok(atHire >= 22, "a populated date of birth puts an adult working age at the hire date");
      assert.ok(atExtract <= 66, "a populated date of birth puts a working age at the extract date");
    }
  }
  assert.equal(
    new Set(rows.map((r) => r.emergency_contact_phone)).size,
    rows.length,
    "contact numbers do not repeat across records"
  );
});

test("HR-17: no statute, no money and no work location appears anywhere in the file", () => {
  const text = content();
  assert.ok(!/\$/.test(text), "no money amount appears in this record set");
  assert.ok(!/\bGDPR\b|\bArticle\s+\d|\bU\.S\.C\b|\bCFR\b/i.test(text), "no statutory citation appears in this record set");
  assert.ok(!text.includes("\u2014"), "no em dash appears in this record set");
  for (const column of spec.columns) {
    assert.ok(
      !/salary|compensation|pay_band|work_location|office/i.test(column),
      `${column} belongs to a later cluster, not to this one`
    );
  }
});

test("HR-17: two runs are byte identical", () => {
  const runA = generateArtifact(spec, canon);
  const runB = generateArtifact(spec, canon);
  assert.deepEqual(runA, runB);
});

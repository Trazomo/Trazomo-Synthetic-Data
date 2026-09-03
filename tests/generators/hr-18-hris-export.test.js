// HR-18 hris-export: the guard over the bundle a people system of record hands
// over, and over the two joins that make it an exercise rather than a table.
//
// Two disciplines run through every check. The permission tables are restated
// literally below rather than imported as the generator's own predicate, so a
// tier edit changes one side and the test says so; the generator's exported
// tables are imported only to assert they still equal these copies. And the
// requisition rows are compared against the committed HR-01 register bytes read
// off disk here, never against the generator's own reader, because the claim
// under test is that the export reproduces the frozen library rather than that
// two copies of one function agree.
//
// No test names the case that sits above its assignee's tier. It is found by
// comparing the two tables over the whole queue and asserted by cardinality, so
// a roster reroll that moves it stays green and a reroll that destroys it fails.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";
import { isWeekend } from "../../datagen/src/dates.js";
import { createRng } from "../../datagen/src/seed.js";
import { buildRoster } from "../../datagen/src/generators/core-04-people-roster.js";
import {
  GRANTED_TIER_BY_ROLE,
  REQUIRED_TIER_BY_CASE_TYPE,
} from "../../datagen/src/generators/hr-18-hris-export.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
const spec = specs.byId.get("HR-18");
const roster = buildRoster(createRng("CORE-04", "roster"));

/** The committed HR-01 register, read here rather than through the generator. */
const register = JSON.parse(
  readFileSync(join(REPO_ROOT, "artifacts", "HR-01", "role-requisition-register.json"), "utf8")
);

const AS_OF = "2026-04-03";
const CASE_WINDOW_START = "2026-03-02";
const CASE_COUNT = 24;
const REQUISITION_COUNT = 8;
const SENIOR_TIER_CASES = 6;
const CASE_STATUSES = new Set(["open", "in_progress"]);

// The first published table, restated: what a People role title is granted.
const PUBLISHED_ROLE_TIERS = {
  "People Operations Specialist": 1,
  "Recruiter": 1,
  "HR Business Partner": 2,
  "People Manager": 3,
  "Director, People": 4,
  "VP, People": 4,
};

// The second published table, restated: what a case type requires.
const PUBLISHED_CASE_TIERS = {
  address_change: 1,
  benefits_enrollment_question: 1,
  payslip_reissue: 1,
  onboarding_task_chase: 1,
  leave_request_logging: 2,
  performance_documentation: 2,
  manager_coaching_request: 2,
  grievance_intake: 3,
  investigation_note: 3,
  compensation_change_request: 4,
  termination_processing: 4,
};

const activeRoster = roster.filter((r) => r.employment_status === "active");
const byEmployeeId = new Map(roster.map((r) => [r.employee_id, r]));

function files() {
  return generateArtifact(spec, canon);
}

/** One CSV of the bundle, with its header pinned to the spec's own per-file column list. */
function table(path) {
  const parsed = csvTable(fileByPath(files(), path).content);
  assert.deepEqual(parsed.cols, spec.files[path], `HR-18: ${path} header does not match the spec column list`);
  return parsed;
}

function bundle() {
  return JSON.parse(fileByPath(files(), "hris-export.json").content);
}

test("HR-18: the bundle is five files and every CSV header matches the spec's own column list", () => {
  const emitted = files().map((f) => f.path).sort();
  assert.deepEqual(
    emitted,
    ["hris-case-queue.csv", "hris-export.json", "hris-permission-tiers.csv", "hris-requisitions.csv", "hris-roster.csv"],
    "the bundle is four tables and one header document"
  );
  for (const path of Object.keys(spec.files)) table(path);
});

test("HR-18: the two published tables are still the ones this test recomputes from", () => {
  assert.deepEqual(
    GRANTED_TIER_BY_ROLE,
    PUBLISHED_ROLE_TIERS,
    "the generator's role tier table changed: update this copy deliberately or revert the table"
  );
  assert.deepEqual(
    REQUIRED_TIER_BY_CASE_TYPE,
    PUBLISHED_CASE_TIERS,
    "the generator's case tier table changed: update this copy deliberately or revert the table"
  );
});

test("HR-C1-T1: the roster file is one row per active roster row, and the two id sets are equal", () => {
  const { rows } = table("hris-roster.csv");
  assert.equal(rows.length, activeRoster.length, "the export carries one row per active employee");
  assert.deepEqual(
    rows.map((r) => r.employee_id).sort(),
    activeRoster.map((r) => r.employee_id).sort(),
    "the exported id set and the active roster id set are the same set"
  );
  assert.ok(
    roster.length > activeRoster.length,
    "the roster must carry departed rows, or the omission the export makes is not observable"
  );
  for (const person of roster.filter((r) => r.employment_status !== "active")) {
    assert.ok(
      !rows.some((r) => r.employee_id === person.employee_id),
      "the export carries only live records, so a departed row must appear nowhere"
    );
  }
});

test("HR-18: the roster file carries the system's own key, a constant status, and terms that agree with each other", () => {
  const { rows } = table("hris-roster.csv");
  rows.forEach((row, i) => {
    assert.equal(row.hris_person_id, `PER-${100001 + i}`, "the surrogate key runs in file order");
    assert.equal(row.employment_status, "active", "the export carries only live records");
    assert.equal(row.record_status, "active", "record_status");
    const person = byEmployeeId.get(row.employee_id);
    assert.ok(person, `${row.hris_person_id} names an employee who is not on the roster`);
    assert.equal(row.full_name, `${person.first_name} ${person.last_name}`, "full_name is carried through");
    assert.equal(row.work_email, person.email, "work_email is carried through");
    assert.equal(row.department, person.department, "department is carried through");
    assert.equal(row.role_title, person.role_title, "role_title is carried through byte for byte");
    assert.equal(row.level, person.level, "level is carried through");
    assert.equal(row.hire_date, person.start_date, "hire_date is carried through");
    assert.equal(
      row.employment_type === "part_time",
      row.fte !== "1.0",
      "employment_type and fte must not contradict each other"
    );
    assert.ok(row.last_updated <= AS_OF, "a record cannot have been touched after the extract");
    assert.ok(row.last_updated >= row.hire_date, "a record cannot have been touched before the person was hired");
  });
  assert.deepEqual(
    rows.map((r) => r.employee_id),
    [...rows.map((r) => r.employee_id)].sort(),
    "the file runs in employee_id order, which is what the surrogate key is assigned from"
  );
  const partTime = rows.filter((r) => r.employment_type === "part_time");
  assert.ok(partTime.length >= 10, "a roster this size should carry a readable part time minority");
  assert.ok(partTime.length < rows.length * 0.15, "part time is a minority, not the shape of the company");
  for (const fte of ["0.8", "0.6"]) {
    assert.ok(partTime.some((r) => r.fte === fte), `no part time row carries fte ${fte}`);
  }
});

test("HR-C1-T2: every employee id column in the bundle resolves to a roster row", () => {
  const columns = {
    "hris-roster.csv": ["employee_id", "manager_employee_id"],
    "hris-requisitions.csv": ["owner_employee_id", "hiring_manager_employee_id", "recruiter_employee_id"],
    "hris-case-queue.csv": ["subject_employee_id", "assignee_employee_id"],
  };
  for (const [path, idColumns] of Object.entries(columns)) {
    const { rows } = table(path);
    for (const row of rows) {
      for (const column of idColumns) {
        if (row[column] === "") continue; // the roster's own top row reports to nobody
        assert.ok(byEmployeeId.has(row[column]), `${path} ${column} "${row[column]}" is not on the roster`);
      }
    }
  }
});

test("HR-C1-T3: the requisition rows reproduce the committed register, field by field", () => {
  const { rows, cols } = table("hris-requisitions.csv");
  assert.equal(rows.length, REQUISITION_COUNT, "the export carries one row per register requisition");
  assert.equal(register.requisitions.length, REQUISITION_COUNT, "the committed register still holds eight requisitions");

  const registerById = new Map(register.requisitions.map((r) => [r.requisition_id, r]));
  rows.forEach((row, i) => {
    const source = registerById.get(row.requisition_id);
    assert.ok(source, `${row.requisition_id} does not resolve in the committed register`);
    for (const column of cols) {
      assert.equal(
        row[column],
        String(source[column]),
        `${row.requisition_id} ${column} does not reproduce the register bytes`
      );
    }
    assert.equal(
      row.requisition_id,
      register.requisitions[i].requisition_id,
      "the export keeps the register's own file order"
    );
  });
  assert.equal(
    new Set(rows.map((r) => r.requisition_id)).size,
    rows.length,
    "a requisition appears at most once in the export"
  );
});

test("HR-18: the permission table is one row per distinct active People role title, at the published tier", () => {
  const { rows } = table("hris-permission-tiers.csv");
  const titles = [
    ...new Set(
      roster.filter((r) => r.department === "People" && r.employment_status === "active").map((r) => r.role_title)
    ),
  ].sort();
  assert.deepEqual(
    rows.map((r) => r.role_title).sort(),
    titles,
    "the table names exactly the role titles the active People department holds"
  );
  for (const row of rows) {
    assert.equal(
      Number(row.granted_permission_tier),
      PUBLISHED_ROLE_TIERS[row.role_title],
      `${row.role_title} is granted a tier the published table does not carry`
    );
    assert.ok(row.description !== "", "every tier row says what the tier reaches");
  }
  const tiers = rows.map((r) => Number(r.granted_permission_tier));
  assert.deepEqual(tiers, [...tiers].sort((a, b) => a - b), "the table reads as a ladder, lowest tier first");
  assert.ok(
    rows.some((r) => r.role_title.includes(",")),
    "a comma bearing role title must survive into the file, because that is how the roster prints it"
  );
});

test("HR-C1-T4: exactly one case sits above its assignee's granted tier, out of a senior population of six", () => {
  const { rows } = table("hris-case-queue.csv");
  const grantedFor = new Map(
    table("hris-permission-tiers.csv").rows.map((r) => [r.role_title, Number(r.granted_permission_tier)])
  );

  const senior = rows.filter((r) => Number(r.required_permission_tier) >= 3);
  assert.equal(
    senior.length,
    SENIOR_TIER_CASES,
    "the tier 3 and 4 population is the number a brief states beside the finding"
  );

  const overTier = rows.filter((row) => {
    const assignee = byEmployeeId.get(row.assignee_employee_id);
    return Number(row.required_permission_tier) > grantedFor.get(assignee.role_title);
  });
  assert.equal(overTier.length, 1, `${overTier.length} cases sit above their assignee's granted tier, expected 1`);
  assert.ok(
    Number(overTier[0].required_permission_tier) >= 3,
    "the over-tier case sits inside the senior population, which is why that is the number stated beside it"
  );

  // The counterfactual the spec rejects: counting tier 1 assignees instead
  // returns the whole specialist and recruiter caseload rather than a finding.
  const tierOneAssignees = rows.filter(
    (row) => grantedFor.get(byEmployeeId.get(row.assignee_employee_id).role_title) === 1
  );
  assert.ok(
    tierOneAssignees.length > SENIOR_TIER_CASES,
    "a rule counting tier 1 assignees must return a whole caseload, or the qualifier does no work"
  );
});

test("HR-18: the case queue is twenty-four live cases, opened in its window and assigned inside People", () => {
  const { rows } = table("hris-case-queue.csv");
  assert.equal(rows.length, CASE_COUNT, "the queue holds twenty-four cases");
  rows.forEach((row, i) => {
    assert.equal(row.case_id, `HRC-2026-${String(i + 1).padStart(4, "0")}`, "case ids run in file order");
    assert.ok(row.case_type in PUBLISHED_CASE_TIERS, `case type "${row.case_type}" is outside the published table`);
    assert.equal(
      Number(row.required_permission_tier),
      PUBLISHED_CASE_TIERS[row.case_type],
      `${row.case_id} states a tier its own case type does not carry`
    );
    assert.ok(CASE_STATUSES.has(row.status), `${row.case_id} status "${row.status}"`);
    assert.ok(
      row.opened_date >= CASE_WINDOW_START && row.opened_date <= AS_OF,
      `${row.case_id} opened outside the queue window`
    );
    assert.ok(!isWeekend(row.opened_date), `${row.case_id} opened on a weekend`);
    assert.ok(row.due_date > row.opened_date, `${row.case_id} is due before it opened`);
    assert.notEqual(row.subject_employee_id, row.assignee_employee_id, `${row.case_id} is assigned to its own subject`);

    const assignee = byEmployeeId.get(row.assignee_employee_id);
    assert.equal(assignee.department, "People", `${row.case_id} is assigned outside the People department`);
    assert.equal(assignee.employment_status, "active", `${row.case_id} is assigned to a departed employee`);
    const subject = byEmployeeId.get(row.subject_employee_id);
    assert.equal(subject.employment_status, "active", `${row.case_id} names a departed subject`);
  });
  assert.deepEqual(
    rows.map((r) => r.opened_date),
    [...rows.map((r) => r.opened_date)].sort(),
    "the queue runs in opened_date order, which is what case_id is assigned from"
  );
  const worked = new Set(rows.map((r) => r.assignee_employee_id));
  assert.ok(worked.size >= 5, "a queue carried by one or two people is not a caseload");
});

test("HR-18: the bundle header states what the files hold and counts them honestly", () => {
  const header = bundle();
  assert.deepEqual(
    Object.keys(header),
    ["export_id", "source_system", "schema_version", "as_of", "source_artifacts", "files", "counts", "permission_tier_scale"],
    "the bundle carries its documented key list, in the documented order"
  );
  assert.equal(header.as_of, AS_OF, "the bundle is dated at the extract stamp");
  assert.deepEqual(header.source_artifacts, ["CORE-04", "HR-01"], "the bundle names the two artifacts it derives from");
  assert.deepEqual(
    header.files.map((f) => f.file).sort(),
    Object.keys(spec.files).sort(),
    "the header lists exactly the tables the bundle ships"
  );
  assert.equal(header.counts.roster_rows, table("hris-roster.csv").rows.length, "roster count");
  assert.equal(header.counts.requisitions, REQUISITION_COUNT, "requisition count");
  assert.equal(header.counts.cases, CASE_COUNT, "case count");
  assert.equal(header.counts.permission_tiers, Object.keys(PUBLISHED_ROLE_TIERS).length, "permission tier count");
  assert.deepEqual(
    header.permission_tier_scale.map((t) => t.tier),
    [1, 2, 3, 4],
    "the scale the two tables are read against is published with the bundle"
  );
});

test("HR-18: no money, no compensation figure and no work location exists anywhere in the bundle", () => {
  for (const file of files()) {
    assert.ok(!/\$/.test(file.content), `${file.path} carries a money amount`);
    assert.ok(!file.content.includes("\u2014"), `${file.path} carries an em dash`);
  }
  for (const columns of Object.values(spec.files)) {
    for (const column of columns) {
      assert.ok(
        !/salary|pay_band|amount|work_location|office/i.test(column),
        `${column} belongs to a later cluster, not to this one`
      );
    }
  }
  // The one vendor the universe puts behind this platform is deliberately not
  // named, so no module has to reason about a real-shaped vendor's format.
  const joined = files().map((f) => f.content).join("\n");
  for (const entry of canon.values()) {
    if (entry.id === "co-002") continue;
    assert.ok(!joined.includes(entry.name), `the bundle names the canon company ${entry.name}`);
  }
});

test("HR-18: two runs are byte identical", () => {
  const runA = generateArtifact(spec, canon);
  const runB = generateArtifact(spec, canon);
  assert.deepEqual(runA, runB);
});

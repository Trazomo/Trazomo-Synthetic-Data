// HR-06, HR-07 and HR-08: the guard over the three lifecycle artifacts that
// come out of one seeded builder. One file for three artifacts, because the
// cross-artifact rules are assertions about all three together and splitting
// them would mean three copies of the roster build.
//
// Four disciplines run through every check.
//
//   * No test names the new hire, the departing employee, the reviewer who is
//     late, the task that is overdue or the system that is uncovered. All five
//     are found by rule from the emitted bytes and asserted by cardinality, so
//     a reroll that moves one stays green and a reroll that destroys one fails.
//   * The frozen inputs are read off disk here, never through the builder's own
//     readers, because the claim under test is that the artifacts agree with
//     the frozen pack rather than that two copies of one function agree.
//   * The column lists come out of spec.files rather than being restated, so a
//     dropped column is a red gate.
//   * The vocabulary tables are restated literally below and the builder's
//     exported tables are asserted equal to those copies, the HR-18 discipline,
//     so a vocabulary edit changes one side and the test says so.
//
// The markdown parse is a table-row split, a handful of lines of local code
// that does not earn a helper. tests/helpers/csv-table.js reads all eight CSVs,
// tests/helpers/capitalized-screen.js runs the proper-noun sweep and
// tests/helpers/money-shape.js runs the money screen; nothing under
// tests/helpers/ is edited.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";
import { allowedFrom, unscreenedPhrases, unscreenedWords } from "../helpers/capitalized-screen.js";
import { moneyMatches } from "../helpers/money-shape.js";
import { addBusinessDays, addDays, isWeekend } from "../../datagen/src/dates.js";
import { createRng } from "../../datagen/src/seed.js";
import { buildRoster } from "../../datagen/src/generators/core-04-people-roster.js";
import {
  ACCESS_LEVELS,
  C2_RECRUITING_ARC,
  EXIT_TYPES,
  GRANT_SOURCES,
  OFFBOARDING_ACTIONS,
  OFFBOARDING_OWNER_ROLES,
  OFFBOARDING_PHASES,
  ONBOARDING_APPROVAL_ROLES,
  ONBOARDING_OWNER_ROLES,
  ONBOARDING_PHASES,
  REVIEWER_RELATIONSHIPS,
  REVIEW_STAGING,
  REVIEW_STATUSES,
  SYSTEM_CATALOG,
  SYSTEM_CATEGORIES,
  TASK_STATUSES,
  buildLifecycleCoordination,
} from "../../datagen/src/generators/hr-lifecycle.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
const specOf = (id) => {
  const spec = specs.byId.get(id);
  assert.ok(spec, `${id} not found in specs/artifact-specs.yaml`);
  return spec;
};

const AS_OF = "2026-04-03";
const START_WEEK = { start: "2026-04-01", end: "2026-04-07" };
const REVIEW_SCOPE = ["People", "IT & Security"];
const NOTICE_DATE = "2026-03-27";
const LAST_WORKING_DAY = "2026-04-10";
const TENURE_MONTHS = 24;

const roster = buildRoster(createRng("CORE-04", "roster"));
const byEmployeeId = new Map(roster.map((row) => [row.employee_id, row]));
const activeRoster = roster.filter((row) => row.employment_status === "active");
const nameOf = (row) => `${row.first_name} ${row.last_name}`;

// ------------------------------------------ the published vocabularies, restated

const PUBLISHED_ONBOARDING_PHASES = ["pre_start", "day_one", "week_one", "first_month"];
const PUBLISHED_ONBOARDING_OWNER_ROLES = [
  "People Operations", "IT & Security", "Hiring Manager", "Onboarding Buddy", "Recruiter", "New Hire",
];
const PUBLISHED_ONBOARDING_APPROVAL_ROLES = ["IT & Security", "Hiring Manager"];
const PUBLISHED_TASK_STATUSES = ["not_started", "in_progress", "complete"];
const PUBLISHED_OFFBOARDING_PHASES = ["notice", "final_week", "last_day", "post_exit"];
const PUBLISHED_OFFBOARDING_OWNER_ROLES = [
  "People Operations", "IT & Security", "Manager", "HR Business Partner",
];
const PUBLISHED_OFFBOARDING_ACTIONS = [
  "revoke_access", "review_shared_access", "transfer_ownership", "collect_asset", "administrative",
];
const PUBLISHED_GRANT_SOURCES = [
  "identity_provider", "vendor_admin_console", "shared_drive_acl", "local_account",
];
const PUBLISHED_SYSTEM_CATEGORIES = [
  "identity", "engineering", "productivity", "monitoring", "data", "vendor_service",
];
const PUBLISHED_ACCESS_LEVELS = ["read", "write", "admin"];
const PUBLISHED_EXIT_TYPES = ["voluntary_resignation", "involuntary"];
const PUBLISHED_REVIEWER_RELATIONSHIPS = ["manager", "skip_level"];
const PUBLISHED_REVIEW_STATUSES = ["not_started", "in_progress", "submitted"];
const PUBLISHED_RECRUITING_ARC = ["EMP-0517", "EMP-0524", "EMP-0574"];

/**
 * The system catalog, restated literally rather than imported (review F5, the
 * HR-18 discipline): the guard against a branded system_name has to compare
 * two independent copies, because deepEqual-ing the builder's own export
 * against itself can never fail.
 */
const PUBLISHED_SYSTEM_CATALOG = [
  { system_id: "SYS-0001", system_name: "identity directory", system_category: "identity" },
  { system_id: "SYS-0002", system_name: "single sign on administration console", system_category: "identity" },
  { system_id: "SYS-0003", system_name: "privileged access vault", system_category: "identity" },
  { system_id: "SYS-0004", system_name: "workplace email and calendar", system_category: "productivity" },
  { system_id: "SYS-0005", system_name: "shared team drive", system_category: "productivity" },
  { system_id: "SYS-0006", system_name: "shared engineering drive", system_category: "productivity" },
  { system_id: "SYS-0007", system_name: "document collaboration space", system_category: "productivity" },
  { system_id: "SYS-0008", system_name: "team chat workspace", system_category: "productivity" },
  { system_id: "SYS-0009", system_name: "internal wiki", system_category: "productivity" },
  { system_id: "SYS-0010", system_name: "ticket and issue tracker", system_category: "productivity" },
  { system_id: "SYS-0011", system_name: "source control", system_category: "engineering" },
  { system_id: "SYS-0012", system_name: "continuous integration service", system_category: "engineering" },
  { system_id: "SYS-0013", system_name: "artifact registry", system_category: "engineering" },
  { system_id: "SYS-0014", system_name: "container image registry", system_category: "engineering" },
  { system_id: "SYS-0015", system_name: "infrastructure as code pipeline", system_category: "engineering" },
  { system_id: "SYS-0016", system_name: "secret management service", system_category: "engineering" },
  { system_id: "SYS-0017", system_name: "production cloud console", system_category: "engineering" },
  { system_id: "SYS-0018", system_name: "staging cloud console", system_category: "engineering" },
  { system_id: "SYS-0019", system_name: "database administration console", system_category: "engineering" },
  { system_id: "SYS-0020", system_name: "feature flag service", system_category: "engineering" },
  { system_id: "SYS-0021", system_name: "metrics dashboard", system_category: "monitoring" },
  { system_id: "SYS-0022", system_name: "log search", system_category: "monitoring" },
  { system_id: "SYS-0023", system_name: "incident paging rota", system_category: "monitoring" },
  { system_id: "SYS-0024", system_name: "error tracking service", system_category: "monitoring" },
  { system_id: "SYS-0025", system_name: "uptime probe service", system_category: "monitoring" },
  { system_id: "SYS-0026", system_name: "distributed tracing console", system_category: "monitoring" },
  { system_id: "SYS-0027", system_name: "data warehouse", system_category: "data" },
  { system_id: "SYS-0028", system_name: "business intelligence workspace", system_category: "data" },
  { system_id: "SYS-0029", system_name: "product analytics workspace", system_category: "data" },
  { system_id: "SYS-0030", system_name: "data pipeline scheduler", system_category: "data" },
  { system_id: "SYS-0031", system_name: "payroll and benefits portal", system_category: "vendor_service" },
  { system_id: "SYS-0032", system_name: "learning platform", system_category: "vendor_service" },
  { system_id: "SYS-0033", system_name: "expense system", system_category: "vendor_service" },
  { system_id: "SYS-0034", system_name: "customer relationship system", system_category: "vendor_service" },
  { system_id: "SYS-0035", system_name: "finance ledger", system_category: "vendor_service" },
  { system_id: "SYS-0036", system_name: "status page administration", system_category: "vendor_service" },
];

// ------------------------------------------------------------ the frozen inputs

/** The committed HR-01 register, read here rather than through the builder. */
const register = JSON.parse(
  readFileSync(join(REPO_ROOT, "artifacts", "HR-01", "role-requisition-register.json"), "utf8")
);
const startingRequisitions = register.requisitions.filter(
  (row) => row.target_start_date >= START_WEEK.start && row.target_start_date <= START_WEEK.end
);

/** The frozen HR-09 pair, read off the two documents' own header lines. */
function hr09Header(file, label) {
  const text = readFileSync(join(REPO_ROOT, "artifacts", "HR-09", file), "utf8");
  const match = new RegExp(`^- ${label}: (.+?) \\((.+?)\\)$`, "m").exec(text);
  assert.ok(match, `artifacts/HR-09/${file} carries no "- ${label}:" line`);
  return { name: match[1].trim(), role_title: match[2].trim() };
}
const hr09Manager = hr09Header("one-to-one-log.md", "Manager");
const hr09Report = hr09Header("one-to-one-log.md", "Report");
const hr09Period = /^- Period: (\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})$/m.exec(
  readFileSync(join(REPO_ROOT, "artifacts", "HR-09", "one-to-one-log.md"), "utf8")
);
const rosterRowNamed = (who) => {
  const rows = activeRoster.filter((row) => nameOf(row) === who.name && row.role_title === who.role_title);
  assert.equal(rows.length, 1, `"${who.name} (${who.role_title})" does not resolve to one active roster row`);
  return rows[0];
};

/** The frozen people-system case queue, read from the committed export bytes. */
const caseQueue = csvTable(
  readFileSync(join(REPO_ROOT, "datasets", "hr", "hris-export", "hris-case-queue.csv"), "utf8")
).rows;
const caseParticipants = new Set(
  caseQueue.flatMap((row) => [row.subject_employee_id, row.assignee_employee_id])
);

/** The frozen HR-18 roster export, read here rather than through the builder (X8). */
const hrisRoster = csvTable(
  readFileSync(join(REPO_ROOT, "datasets", "hr", "hris-export", "hris-roster.csv"), "utf8")
).rows;
const hrisById = new Map(hrisRoster.map((row) => [row.employee_id, row]));

/** The candidate names, read out of the frozen application log rather than restated. */
const applicationLog = readFileSync(join(REPO_ROOT, "artifacts", "HR-02", "application-log.md"), "utf8");
const candidateTokens = (() => {
  const tokens = new Set();
  for (const match of applicationLog.matchAll(/^\| (ca-\d{3}) \| ([^|]+?) \|/gm)) {
    tokens.add(match[1]);
    tokens.add(match[2].trim());
    for (const word of match[2].trim().split(/\s+/)) tokens.add(word);
  }
  return [...tokens];
})();

/** The HR-09 deliverable list, read out of that artifact's own spec entry. */
const logDeliverables = (() => {
  const feature = specOf("HR-09").planted_features.find((text) => text.includes("log_deliverables is"));
  assert.ok(feature, "the HR-09 spec entry no longer publishes its log_deliverables list");
  const tail = feature.slice(feature.indexOf("log_deliverables is"));
  const listing = tail.slice(tail.indexOf(":") + 1).split('"')[0];
  return listing.split(",").map((item) => item.trim()).filter(Boolean);
})();

// ------------------------------------------------------------------- helpers

const filesOf = (id) => generateArtifact(specOf(id), canon);

/** One CSV, with its header pinned to the spec's own per-file column list. */
function table(id, path) {
  const spec = specOf(id);
  const parsed = csvTable(fileByPath(filesOf(id), path).content);
  assert.deepEqual(parsed.cols, spec.files[path], `${id}: ${path} header does not match the spec column list`);
  return parsed;
}

const templateRows = () => table("HR-06", "onboarding-task-template.csv").rows;
const checklistRows = () => table("HR-06", "new-hire-checklist.csv").rows;
const templateMarkdown = () =>
  fileByPath(filesOf("HR-06"), "onboarding-checklist-template.md").content;
const exitRecord = () => table("HR-07", "exit-record.csv").rows;
const grantRows = () => table("HR-07", "access-grant-inventory.csv").rows;
const offboardingRows = () => table("HR-07", "offboarding-checklist.csv").rows;
const cycleRow = () => table("HR-08", "review-cycle.csv").rows[0];
const assignmentRows = () => table("HR-08", "review-assignments.csv").rows;

const allFiles = () => [...filesOf("HR-06"), ...filesOf("HR-07"), ...filesOf("HR-08")];

function businessDays(startIso, endIso) {
  const days = [];
  for (let day = startIso; day <= endIso; day = addDays(day, 1)) {
    if (!isWeekend(day)) days.push(day);
  }
  return days;
}

/** Calendar months before an ISO date, recomputed here rather than imported. */
function monthsBefore(iso, months) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 - months, day)).toISOString().slice(0, 10);
}

/** Markdown pipe-table rows under a heading, split into cells. */
function markdownTable(text, heading) {
  const section = text.split(`## ${heading}`)[1];
  assert.ok(section, `the template document carries no "## ${heading}" section`);
  return section
    .split("\n")
    .filter((line) => line.startsWith("| "))
    .map((line) => line.slice(2, -2).split(" | "))
    .filter((cells) => !cells.every((cell) => /^-+$/.test(cell)));
}

/** A table re-rendered in the pipe-cell shape the capitalized screen was written against. */
function asPipeTable(content) {
  const parsed = csvTable(content);
  return [parsed.cols, ...parsed.rows.map((row) => parsed.cols.map((col) => row[col]))]
    .map((cells) => `| ${cells.join(" | ")} |`)
    .join("\n");
}

// ------------------------------------------------------------- the vocabularies

test("HR-C4: the published vocabulary tables are still the ones this test recomputes from", () => {
  assert.deepEqual(ONBOARDING_PHASES, PUBLISHED_ONBOARDING_PHASES);
  assert.deepEqual(ONBOARDING_OWNER_ROLES, PUBLISHED_ONBOARDING_OWNER_ROLES);
  assert.deepEqual(ONBOARDING_APPROVAL_ROLES, PUBLISHED_ONBOARDING_APPROVAL_ROLES);
  assert.deepEqual(TASK_STATUSES, PUBLISHED_TASK_STATUSES);
  assert.deepEqual(OFFBOARDING_PHASES, PUBLISHED_OFFBOARDING_PHASES);
  assert.deepEqual(OFFBOARDING_OWNER_ROLES, PUBLISHED_OFFBOARDING_OWNER_ROLES);
  assert.deepEqual(OFFBOARDING_ACTIONS, PUBLISHED_OFFBOARDING_ACTIONS);
  assert.deepEqual(GRANT_SOURCES, PUBLISHED_GRANT_SOURCES);
  assert.deepEqual(SYSTEM_CATEGORIES, PUBLISHED_SYSTEM_CATEGORIES);
  assert.deepEqual(ACCESS_LEVELS, PUBLISHED_ACCESS_LEVELS);
  assert.deepEqual(EXIT_TYPES, PUBLISHED_EXIT_TYPES);
  assert.deepEqual(REVIEWER_RELATIONSHIPS, PUBLISHED_REVIEWER_RELATIONSHIPS);
  assert.deepEqual(REVIEW_STATUSES, PUBLISHED_REVIEW_STATUSES);
  assert.deepEqual(C2_RECRUITING_ARC, PUBLISHED_RECRUITING_ARC);
  assert.equal(
    GRANT_SOURCES.filter((source) => source === "identity_provider").length,
    1,
    "exactly one grant source is the identity provider, or the coverage tie-out stops being unambiguous"
  );
});

test("HR-C4: the system catalog is restated literally and no system_name could pass for a brand (review F5)", () => {
  // deepEqual against a literal copy, the HR-18 discipline: comparing the
  // builder's own export against itself (SYSTEM_CATALOG.find(...) inside the
  // builder) can never fail no matter what the catalog says.
  assert.deepEqual(
    SYSTEM_CATALOG,
    PUBLISHED_SYSTEM_CATALOG,
    "the system catalog has drifted from the literal copy this test restates it against"
  );
  for (const row of PUBLISHED_SYSTEM_CATALOG) {
    assert.ok(
      /^[a-z][a-z ]*$/.test(row.system_name),
      `${row.system_id} carries "${row.system_name}", which is not an ordinary lowercase name; a brand would fail this shape`
    );
  }
});

// --------------------------------------------------------------------- HR-06

test("HR-C4-T1: the instance is the template filtered by department, in template order, with the date arithmetic holding", () => {
  const template = templateRows();
  const instance = checklistRows();
  const department = instance[0].new_hire_department;
  const expected = template.filter(
    (row) => row.applies_to_department === "all" || row.applies_to_department === department
  );
  assert.deepEqual(
    instance.map((row) => row.task_code),
    expected.map((row) => row.task_code),
    "the instance is not the department filter over the template, in template order"
  );
  const offsetByCode = new Map(template.map((row) => [row.task_code, Number(row.due_offset_business_days)]));
  for (const row of instance) {
    assert.equal(
      row.due_date,
      addBusinessDays(row.start_date, offsetByCode.get(row.task_code)),
      `${row.checklist_task_id} due_date does not recompute from the start date and the offset`
    );
    assert.ok(!isWeekend(row.due_date), `${row.checklist_task_id} is due on a weekend`);
    assert.equal(
      "due_basis" in row,
      false,
      "the instance carries a due_basis column; the arithmetic is derived rather than stated per row"
    );
  }
  for (const row of template) {
    assert.equal(row.due_basis, "start_date", `${row.task_code} states another due basis`);
  }
  assert.equal(instance.length, 29, "the instance is 29 rows");
  assert.equal(template.length, 34, "the catalog is 34 rows");
  assert.equal(template.filter((row) => row.applies_to_department === "all").length, 26);
  assert.equal(template.filter((row) => row.applies_to_department !== "all").length, 8);
  assert.equal(template.filter((row) => row.applies_to_department === department).length, 3);
  const phaseCounts = { pre_start: 11, day_one: 6, week_one: 7, first_month: 5 };
  for (const [phase, count] of Object.entries(phaseCounts)) {
    assert.equal(
      instance.filter((row) => row.phase === phase).length,
      count,
      `the instance carries a different number of ${phase} rows`
    );
  }
});

test("HR-C4-T2: every derived field is byte-equal to the frozen requisition the predicate selects", () => {
  assert.equal(
    startingRequisitions.length,
    1,
    "the frozen register no longer carries exactly one requisition starting in the first week of April 2026"
  );
  const [requisition] = startingRequisitions;
  const instance = checklistRows();
  const first = instance[0];
  assert.equal(first.requisition_id, requisition.requisition_id);
  assert.equal(first.start_date, requisition.target_start_date);
  assert.equal(first.new_hire_department, requisition.department);
  assert.equal(first.new_hire_role_title, requisition.requisition_title);
  assert.equal(requisition.status, "open", "the frozen seat is open because the hire has not started");

  const ownerFor = (role) => {
    const rows = instance.filter((row) => row.owner_role === role);
    assert.ok(rows.length > 0, `no instance row is owned by ${role}`);
    return rows[0].owner_employee_id;
  };
  assert.equal(ownerFor("Hiring Manager"), requisition.hiring_manager_employee_id);
  assert.equal(ownerFor("Recruiter"), requisition.recruiter_employee_id);
  for (const file of filesOf("HR-06")) {
    assert.ok(
      !file.content.includes(requisition.owner_employee_id),
      `${file.path} seats the requisition's owner, who is a departed roster row`
    );
  }
  for (const row of instance) {
    assert.equal(row.requisition_id, requisition.requisition_id, "the requisition id moves between rows");
    assert.equal(row.start_date, requisition.target_start_date, "the start date moves between rows");
  }
});

test("HR-C4-T3: the minted new hire is one past the roster, collides with nobody, and every other id is an active row", () => {
  const instance = checklistRows();
  const newHireId = instance[0].new_hire_employee_id;
  const newHireName = instance[0].new_hire_full_name;
  const maxRosterId = Math.max(...roster.map((row) => Number(row.employee_id.slice(4))));
  assert.equal(newHireId, `EMP-${String(maxRosterId + 1).padStart(4, "0")}`);
  assert.equal(byEmployeeId.has(newHireId), false, "the minted id is already a roster row");

  assert.ok(
    !roster.some((row) => nameOf(row) === newHireName),
    "the minted name pair collides with a roster row"
  );
  const canonPeople = readFileSync(join(REPO_ROOT, "canon", "people.md"), "utf8");
  assert.ok(!canonPeople.includes(newHireName), "the minted name pair appears in canon/people.md");
  for (const token of candidateTokens) {
    assert.notEqual(newHireName, token, "the minted name pair is a seated candidate");
  }

  // The work email is the roster's own format applied to the minted row. It is
  // a field of the mint rather than a column of the checklist, so it is read
  // off the builder here and the format is checked against a roster row.
  const { people } = buildLifecycleCoordination();
  const sample = roster[0];
  const format = (first, last, id) => `${first.toLowerCase()}.${last.toLowerCase()}.${id.toLowerCase()}@co002.example`;
  assert.equal(format(sample.first_name, sample.last_name, sample.employee_id), sample.email);
  assert.equal(
    people.newHire.work_email,
    format(people.newHire.first_name, people.newHire.last_name, newHireId),
    "the minted work email does not follow the roster's own address format"
  );

  for (const row of instance) {
    for (const [column, expected] of [
      ["owner_employee_id", "owner_full_name"],
      ["approval_owner_employee_id", null],
    ]) {
      const id = row[column];
      if (id === "" || id === newHireId) continue;
      const person = byEmployeeId.get(id);
      assert.ok(person, `${row.checklist_task_id} names ${id}, which is not a roster row`);
      assert.equal(person.employment_status, "active", `${row.checklist_task_id} names a departed row`);
      if (expected) assert.equal(row[expected], nameOf(person), `${row.checklist_task_id} prints another name`);
    }
  }
});

test("HR-C4-T4: exactly one instance row is overdue, incomplete and blocked, and the two counterfactual censuses hold", () => {
  const instance = checklistRows();
  const byTaskId = new Map(instance.map((row) => [row.checklist_task_id, row]));
  const incomplete = instance.filter((row) => row.status !== "complete");
  const blocked = incomplete.filter(
    (row) =>
      row.blocked_by_checklist_task_id !== ""
      && byTaskId.get(row.blocked_by_checklist_task_id).status !== "complete"
  );
  const overdue = incomplete.filter((row) => row.due_date < AS_OF);
  const finding = blocked.filter((row) => row.due_date < AS_OF);

  assert.equal(finding.length, 1, "the overdue, incomplete and blocked census is not 1");
  assert.equal(overdue.length, 1, "the overdue and incomplete census is not 1");
  assert.equal(blocked.length, 4, "the blocked-only census is not 4");
  const completedLate = instance.filter(
    (row) => row.status === "complete" && row.completed_date > row.due_date
  );
  assert.equal(completedLate.length, 3, "the finished-late census is not 3");
  assert.ok(
    !completedLate.some((row) => row.checklist_task_id === finding[0].checklist_task_id),
    "the finding appears in the finished-late census, so the two rules would collide"
  );
  for (const row of incomplete) {
    if (row.checklist_task_id === finding[0].checklist_task_id) continue;
    assert.ok(row.due_date >= AS_OF, `${row.checklist_task_id} is a second incomplete row due before the as-of`);
  }
  for (const row of instance) {
    assert.equal(
      row.completed_date !== "",
      row.status === "complete",
      `${row.checklist_task_id} carries a completed_date its status does not allow`
    );
    if (row.completed_date !== "") {
      assert.ok(row.completed_date <= AS_OF, `${row.checklist_task_id} was finished after the as-of`);
    }
  }
});

test("HR-C4-T5: both blocking graphs resolve inside their own file and topologically sort", () => {
  const sortable = (rows, idKey, edgeKey) => {
    const ids = new Set(rows.map((row) => row[idKey]));
    const indegree = new Map(rows.map((row) => [row[idKey], 0]));
    const dependents = new Map(rows.map((row) => [row[idKey], []]));
    for (const row of rows) {
      const blocker = row[edgeKey];
      if (blocker === "") continue;
      assert.ok(ids.has(blocker), `${row[idKey]} is blocked by ${blocker}, which is not in the same file`);
      indegree.set(row[idKey], indegree.get(row[idKey]) + 1);
      dependents.get(blocker).push(row[idKey]);
    }
    const queue = [...indegree.entries()].filter(([, degree]) => degree === 0).map(([id]) => id);
    let sorted = 0;
    while (queue.length > 0) {
      const id = queue.shift();
      sorted += 1;
      for (const next of dependents.get(id)) {
        indegree.set(next, indegree.get(next) - 1);
        if (indegree.get(next) === 0) queue.push(next);
      }
    }
    return sorted === rows.length;
  };
  assert.ok(sortable(templateRows(), "task_code", "blocked_by_task_code"), "the catalog graph carries a cycle");
  assert.ok(
    sortable(checklistRows(), "checklist_task_id", "blocked_by_checklist_task_id"),
    "the instance graph carries a cycle"
  );
});

test("HR-C4-T6: a granting row always names an approver, and never the role that raises the request", () => {
  const template = templateRows();
  const instance = checklistRows();
  for (const row of template) {
    assert.equal(
      row.grants_system_id !== "",
      row.approval_owner_role !== "",
      `${row.task_code} states an approval role its grant does not call for, or the reverse`
    );
    if (row.grants_system_id === "") continue;
    assert.ok(PUBLISHED_ONBOARDING_APPROVAL_ROLES.includes(row.approval_owner_role));
    assert.notEqual(row.owner_role, row.approval_owner_role, `${row.task_code} lets the raiser approve`);
  }
  for (const row of instance) {
    assert.equal(row.grants_system_id !== "", row.approval_owner_employee_id !== "");
    if (row.grants_system_id === "") continue;
    assert.notEqual(
      row.owner_employee_id,
      row.approval_owner_employee_id,
      `${row.checklist_task_id} lets the person who raises the request approve it`
    );
  }
  const byRole = new Map();
  for (const row of instance) {
    assert.ok(PUBLISHED_ONBOARDING_OWNER_ROLES.includes(row.owner_role));
    const seen = byRole.get(row.owner_role);
    if (seen) assert.equal(seen, row.owner_employee_id, `"${row.owner_role}" resolves to two people`);
    byRole.set(row.owner_role, row.owner_employee_id);
  }
  assert.equal(byRole.size, PUBLISHED_ONBOARDING_OWNER_ROLES.length, "a reader counting owners counts six");
  assert.equal(new Set(byRole.values()).size, byRole.size, "two owner roles resolve to the same person");
});

test("HR-C4-T7: the template document renders the catalog cell for cell and carries no instance fact", () => {
  const markdown = templateMarkdown();
  const template = templateRows();
  const header = [
    "task_code", "task_name", "phase", "applies_to_department", "owner_role",
    "due_offset_business_days", "blocked_by_task_code", "approval_owner_role",
  ];
  const rendered = markdownTable(markdown, "The task catalog");
  assert.deepEqual(rendered[0], header, "the rendered catalog header has drifted from the CSV");
  assert.equal(rendered.length - 1, template.length, "the rendered catalog and the CSV hold different row counts");
  template.forEach((row, index) => {
    assert.deepEqual(
      rendered[index + 1],
      header.map((column) => row[column]),
      `the rendered catalog and the CSV disagree at ${row.task_code}`
    );
  });

  assert.equal(/\d{4}-\d{2}-\d{2}/.test(markdown), false, "the template document carries a date");
  assert.equal(markdown.includes("EMP-"), false, "the template document carries an employee id");
  for (const token of ["not_started", "in_progress", "complete"]) {
    assert.equal(
      new RegExp(token, "i").test(markdown),
      false,
      `the template document carries the status token "${token}"`
    );
  }
  assert.equal(/^- Date:/m.test(markdown), false, "the template document carries a mirror-set date line");
  assert.equal(/^- Start time:/m.test(markdown), false, "the template document carries a mirror-set time line");
  assert.equal(/^ {2}- .+ \(.+\)$/m.test(markdown), false, "the template document carries a mirror-set attendee line");

  assert.equal(logDeliverables.length, 12, "the HR-09 deliverable list no longer holds twelve entries");
  for (const row of template) {
    assert.ok(
      !logDeliverables.includes(row.task_name),
      `${row.task_code} reuses a deliverable name the frozen manager log already owns`
    );
  }
});

// --------------------------------------------------------------------- HR-07

test("HR-C4-T8: the departing employee satisfies all eight clauses, each recomputed here", () => {
  const [exit] = exitRecord();
  const person = byEmployeeId.get(exit.employee_id);
  assert.ok(person, "the exit record names somebody who is not a roster row");
  assert.equal(person.employment_status, "active", "clause 1: the departing employee is active");
  assert.equal(person.department, "Engineering", "clause 2: the departing employee sits in Engineering");
  assert.equal(person.level, "IC", "clause 3: the departing employee is an individual contributor");
  assert.equal(person.role_title, "Site Reliability Engineer", "clause 4: the role title");
  const manager = byEmployeeId.get(person.manager_employee_id);
  assert.equal(manager?.employment_status, "active", "clause 5: the manager of record is active");
  const cutoff = monthsBefore(LAST_WORKING_DAY, TENURE_MONTHS);
  assert.ok(person.start_date <= cutoff, "clause 6: at least two years of tenure before the last working day");
  assert.equal(caseParticipants.has(person.employee_id), false, "clause 7: not named in the frozen case queue");
  assert.equal(person.finance_system_role, "", "clause 8: no finance system role");

  const pool = activeRoster.filter(
    (row) =>
      row.department === "Engineering"
      && row.level === "IC"
      && row.role_title === "Site Reliability Engineer"
      && byEmployeeId.get(row.manager_employee_id)?.employment_status === "active"
      && row.start_date <= cutoff
      && !caseParticipants.has(row.employee_id)
      && row.finance_system_role === ""
      && !PUBLISHED_RECRUITING_ARC.includes(row.employee_id)
  );
  assert.ok(pool.length > 0, "the eight clauses select nobody at all");
  assert.ok(
    pool.some((row) => row.employee_id === person.employee_id),
    "the departing employee is outside the set the eight clauses define"
  );
  assert.equal(exit.full_name, nameOf(person), "the exit record prints another name");
  assert.equal(exit.role_title, person.role_title, "the exit record prints another role title");
  assert.equal(exit.start_date, person.start_date, "the exit record prints another start date");
});

test("HR-C4-T9: the exit dates straddle the as-of and the artifact claims no non-employee coverage", () => {
  const [exit] = exitRecord();
  assert.ok(exit.last_working_day > AS_OF, "the last working day does not postdate the as-of");
  assert.ok(exit.notice_date < AS_OF, "the notice date does not predate the as-of");
  assert.ok(exit.notice_date >= exit.start_date, "the notice predates the employee's own start date");
  assert.ok(!isWeekend(exit.notice_date) && !isWeekend(exit.last_working_day), "an exit date falls on a weekend");
  assert.equal(exit.notice_date, NOTICE_DATE);
  assert.equal(exit.last_working_day, LAST_WORKING_DAY);
  assert.equal(exit.worker_type, "employee", "the worker type is not employee");
  assert.ok(PUBLISHED_EXIT_TYPES.includes(exit.exit_type), "the exit type is outside the published list");
  assert.equal(exit.as_of, AS_OF);
  for (const file of filesOf("HR-07")) {
    for (const token of [
      "contractor", "non-employee", "non employee", "engagement", "statement of work",
      "1099", "freelance", "consultant",
    ]) {
      assert.ok(
        !new RegExp(token.replace(/ /g, "[ _-]"), "i").test(file.content),
        `${file.path} claims coverage for a worker this process does not reach ("${token}")`
      );
    }
  }
});

test("HR-C4-T10: exactly one open system carries no checklist row, and it is neither shared nor on the identity provider", () => {
  const grants = grantRows();
  const checklist = offboardingRows();
  const open = grants.filter((row) => row.revoked_date === "" || row.revoked_date > AS_OF);
  const G = new Set(open.map((row) => row.system_id));
  const C = new Set(checklist.filter((row) => row.system_id !== "").map((row) => row.system_id));
  for (const systemId of C) {
    assert.ok(G.has(systemId), `the checklist names ${systemId}, which is not open at the as-of`);
  }
  assert.equal(G.size - C.size, 1, "the coverage difference is not one system");
  const uncovered = [...G].filter((systemId) => !C.has(systemId));
  assert.equal(uncovered.length, 1);
  const grant = open.find((row) => row.system_id === uncovered[0]);
  assert.notEqual(grant.grant_source, "identity_provider", "a single sign on sweep would catch the uncovered grant");
  assert.equal(grant.is_shared_grant, "no", "the uncovered grant is shared, so it collides with the shared exercise");
});

test("HR-C4-T11: the uncovered grant is the unique open grant with no access change request behind it", () => {
  const grants = grantRows();
  const checklist = offboardingRows();
  const open = grants.filter((row) => row.revoked_date === "" || row.revoked_date > AS_OF);
  const covered = new Set(checklist.filter((row) => row.system_id !== "").map((row) => row.system_id));
  const ticketless = open.filter((row) => row.request_ticket_id === "");
  assert.equal(ticketless.length, 1, "more than one open grant carries no request ticket");
  assert.equal(covered.has(ticketless[0].system_id), false, "the ticketless grant is covered after all");
  for (const row of open) {
    if (row.grant_id === ticketless[0].grant_id) continue;
    assert.notEqual(row.request_ticket_id, "", `${row.grant_id} carries no request ticket`);
    assert.ok(row.request_ticket_id.startsWith("ACR-2026-"), `${row.grant_id} ticket is outside the request block`);
    assert.ok(covered.has(row.system_id), `${row.system_id} is open and carries no checklist row`);
  }
});

test("HR-C4-T12: the qualifier-dropped censuses are 8, 3 and 6, and every shared grant is routed to a review", () => {
  const grants = grantRows();
  const checklist = offboardingRows();
  const open = grants.filter((row) => row.revoked_date === "" || row.revoked_date > AS_OF);
  assert.equal(
    open.filter((row) => row.grant_source !== "identity_provider").length,
    8,
    "the open grants outside the identity provider are not 8"
  );
  const shared = open.filter((row) => row.is_shared_grant === "yes");
  assert.equal(shared.length, 3, "the open shared grants are not 3");
  for (const row of shared) {
    const reviews = checklist.filter(
      (task) => task.system_id === row.system_id && task.action === "review_shared_access"
    );
    assert.equal(reviews.length, 1, `the shared grant on ${row.system_id} carries no single review row`);
  }
  assert.equal(
    grants.filter((row) => row.revoked_date !== "" && row.revoked_date < AS_OF).length,
    6,
    "the grants revoked before the as-of are not 6"
  );
});

test("HR-C4-T13: replaying the grant dates gives 9 open on the first business day and 28 at the as-of", () => {
  const grants = grantRows();
  const [exit] = exitRecord();
  let dayZero = addDays(exit.start_date, 1);
  while (isWeekend(dayZero)) dayZero = addDays(dayZero, 1);
  const openAt = (day) =>
    grants.filter((row) => row.granted_date <= day && (row.revoked_date === "" || row.revoked_date > day));
  assert.equal(new Set(openAt(dayZero).map((row) => row.system_id)).size, 9, "the day-zero baseline is not 9 systems");
  const open = openAt(AS_OF);
  assert.equal(open.length, 28, "the open grants at the as-of are not 28 rows");
  assert.equal(new Set(open.map((row) => row.system_id)).size, 28, "the open grants do not resolve to 28 systems");
  assert.equal(grants.length, 34, "the inventory is not 34 rows");
  assert.equal(new Set(grants.map((row) => row.system_id)).size, 31, "the inventory does not span 31 systems");
  for (const row of grants) {
    assert.ok(row.granted_date >= dayZero, `${row.grant_id} predates the employee's first business day`);
    assert.equal(row.employee_id, exit.employee_id, `${row.grant_id} names another employee`);
    assert.ok(PUBLISHED_GRANT_SOURCES.includes(row.grant_source), `${row.grant_id} grant_source`);
    assert.ok(PUBLISHED_SYSTEM_CATEGORIES.includes(row.system_category), `${row.grant_id} system_category`);
    assert.ok(PUBLISHED_ACCESS_LEVELS.includes(row.access_level), `${row.grant_id} access_level`);
    assert.ok(["yes", "no"].includes(row.is_shared_grant), `${row.grant_id} is_shared_grant`);
    if (row.revoked_date === "") {
      assert.equal(row.revoked_by_employee_id, "", `${row.grant_id} names a revoker without a revocation`);
      assert.equal(row.revocation_ticket_id, "", `${row.grant_id} names a revocation ticket without a revocation`);
      continue;
    }
    assert.ok(row.revoked_date > row.granted_date, `${row.grant_id} is revoked on or before its own grant date`);
    assert.notEqual(row.revoked_by_employee_id, "", `${row.grant_id} is revoked by nobody`);
    assert.notEqual(row.revocation_ticket_id, "", `${row.grant_id} is revoked with no ticket`);
  }
  const regranted = [...new Set(grants.map((row) => row.system_id))].filter(
    (systemId) => grants.filter((row) => row.system_id === systemId).length > 1
  );
  assert.equal(regranted.length, 3, "three systems should carry a second grant");
  for (const systemId of regranted) {
    const rows = grants
      .filter((row) => row.system_id === systemId)
      .sort((a, b) => a.granted_date.localeCompare(b.granted_date));
    assert.equal(rows.length, 2);
    assert.ok(rows[0].revoked_date !== "" && rows[0].revoked_date < rows[1].granted_date,
      `${systemId} carries overlapping grant intervals`);
  }
});

test("HR-C4-T13 (grantor tenure): every grantor and revoker is an active, tenured IT & Security row (review F1)", () => {
  const grants = grantRows();
  // Every granted_by_employee_id and revoked_by_employee_id resolves, against
  // the roster this test rebuilds in its own code, to an active IT & Security
  // row holding IT Administrator whose own start_date is on or before the
  // date on the row it acts on. No grant row may be attributed to somebody
  // who had not joined the company yet, and no twenty rows may be attributed
  // to the same single person again.
  for (const row of grants) {
    const grantor = byEmployeeId.get(row.granted_by_employee_id);
    assert.ok(grantor, `${row.grant_id} names a grantor who is not a roster row`);
    assert.equal(grantor.department, "IT & Security", `${row.grant_id}'s grantor sits outside IT & Security`);
    assert.equal(grantor.role_title, "IT Administrator", `${row.grant_id}'s grantor does not hold IT Administrator`);
    assert.equal(grantor.employment_status, "active", `${row.grant_id}'s grantor is not active`);
    assert.ok(
      grantor.start_date <= row.granted_date,
      `${row.grant_id} is granted at ${row.granted_date} by somebody who started ${grantor.start_date}`
    );
    if (row.revoked_date === "") continue;
    const revoker = byEmployeeId.get(row.revoked_by_employee_id);
    assert.ok(revoker, `${row.grant_id} names a revoker who is not a roster row`);
    assert.equal(revoker.department, "IT & Security", `${row.grant_id}'s revoker sits outside IT & Security`);
    assert.equal(revoker.role_title, "IT Administrator", `${row.grant_id}'s revoker does not hold IT Administrator`);
    assert.equal(revoker.employment_status, "active", `${row.grant_id}'s revoker is not active`);
    assert.ok(
      revoker.start_date <= row.revoked_date,
      `${row.grant_id} is revoked at ${row.revoked_date} by somebody who started ${revoker.start_date}`
    );
  }
  assert.ok(
    new Set(grants.map((row) => row.granted_by_employee_id)).size > 1,
    "every grant is attributed to the same single person again"
  );
});

test("HR-C4-T14: every access row runs off a named request and a named owner, inside the exit window", () => {
  const checklist = offboardingRows();
  const grants = grantRows();
  const [exit] = exitRecord();
  const inventorySystems = new Set(grants.map((row) => row.system_id));
  const windowEnd = addBusinessDays(exit.last_working_day, 5);
  assert.equal(checklist.length, 35, "the checklist is not 35 rows");
  assert.equal(checklist.filter((row) => row.system_id !== "").length, 27, "27 rows should name a system");
  for (const row of checklist) {
    assert.ok(PUBLISHED_OFFBOARDING_ACTIONS.includes(row.action), `${row.checklist_task_id} action`);
    assert.ok(PUBLISHED_OFFBOARDING_PHASES.includes(row.phase), `${row.checklist_task_id} phase`);
    assert.ok(PUBLISHED_OFFBOARDING_OWNER_ROLES.includes(row.owner_role), `${row.checklist_task_id} owner role`);
    assert.ok(PUBLISHED_TASK_STATUSES.includes(row.status), `${row.checklist_task_id} status`);
    assert.equal(row.exit_id, exit.exit_id, `${row.checklist_task_id} names another exit`);
    assert.ok(
      row.due_date >= exit.notice_date && row.due_date <= windowEnd,
      `${row.checklist_task_id} is due outside the exit window`
    );
    if (row.system_id !== "") {
      assert.ok(inventorySystems.has(row.system_id), `${row.checklist_task_id} names a system the inventory lacks`);
    }
    if (!["revoke_access", "review_shared_access"].includes(row.action)) continue;
    assert.notEqual(row.request_ticket_id, "", `${row.checklist_task_id} removes access with no request behind it`);
    const owner = byEmployeeId.get(row.owner_employee_id);
    assert.equal(owner?.employment_status, "active", `${row.checklist_task_id} is owned by somebody who is not active`);
    assert.equal(row.owner_full_name, nameOf(owner), `${row.checklist_task_id} prints another name`);
    assert.notEqual(row.status, "complete", `${row.checklist_task_id} revokes access before the exit`);
  }
});

// --------------------------------------------------------------------- HR-08

test("HR-C4-T15: the scope, the counts and the eligibility rules all recompute from the roster", () => {
  const assignments = assignmentRows();
  const cycle = cycleRow();
  const inScope = activeRoster.filter((row) => REVIEW_SCOPE.includes(row.department));
  assert.equal(inScope.length, 57, "the two departments no longer hold 57 active rows");

  const expected = [];
  for (const reviewee of inScope.slice().sort((a, b) => a.employee_id.localeCompare(b.employee_id))) {
    const manager = byEmployeeId.get(reviewee.manager_employee_id);
    if (!manager) continue;
    if (manager.employment_status === "active" && REVIEW_SCOPE.includes(manager.department)) {
      expected.push({ reviewee: reviewee.employee_id, reviewer: manager.employee_id, rel: "manager" });
      continue;
    }
    if (manager.employment_status !== "departed") continue;
    const skip = byEmployeeId.get(manager.manager_employee_id);
    if (skip && skip.employment_status === "active" && REVIEW_SCOPE.includes(skip.department)) {
      expected.push({ reviewee: reviewee.employee_id, reviewer: skip.employee_id, rel: "skip_level" });
    }
  }
  assert.equal(expected.length, 55, "the scope rule no longer yields 55 assignments");
  assert.equal(expected.filter((row) => row.rel === "manager").length, 48, "the manager rows are not 48");
  assert.equal(expected.filter((row) => row.rel === "skip_level").length, 7, "the skip level rows are not 7");
  assert.equal(new Set(expected.map((row) => row.reviewer)).size, 13, "the reviewers are not 13");

  assert.equal(assignments.length, 55, "the emitted cycle is not 55 assignments");
  assert.equal(Number(cycle.assignment_count), assignments.length, "the cycle row miscounts its assignments");
  assert.equal(
    Number(cycle.reviewer_count),
    new Set(assignments.map((row) => row.reviewer_employee_id)).size,
    "the cycle row miscounts its reviewers"
  );
  assert.deepEqual(
    assignments.map((row) => `${row.reviewer_employee_id}/${row.reviewee_employee_id}`).sort(),
    expected.map((row) => `${row.reviewer}/${row.reviewee}`).sort(),
    "the emitted pairs are not the pairs the scope rule computes"
  );

  for (const row of assignments) {
    assert.notEqual(row.reviewee_employee_id, row.reviewer_employee_id, `${row.assignment_id} is a self review`);
    const reviewee = byEmployeeId.get(row.reviewee_employee_id);
    // The eligibility rule is stated against the period END rather than the
    // period start: three in-scope rows started inside the half year, and the
    // 55 the scope rule computes cannot exclude them without contradicting its
    // own receipt. The rule still does the work it was written for, because the
    // new hire starts after the period closes.
    assert.ok(
      reviewee.start_date <= cycle.period_end,
      `${row.assignment_id} reviews a period the reviewee had not started in`
    );
    const escalation = byEmployeeId.get(row.escalation_contact_employee_id);
    assert.ok(escalation, `${row.assignment_id} escalates to somebody who is not a roster row`);
    assert.equal(escalation.employment_status, "active", `${row.assignment_id} escalates to a departed row`);
    assert.equal(
      byEmployeeId.get(row.reviewer_employee_id).manager_employee_id,
      row.escalation_contact_employee_id,
      `${row.assignment_id} escalates somewhere other than the reviewer's own manager`
    );
    assert.equal(row.escalation_contact_full_name, nameOf(escalation), `${row.assignment_id} prints another name`);
  }
  assert.equal(Number(cycle.escalation_grace_business_days), 3, "the escalation grace period is not three days");
  assert.equal(cycle.period_start, hr09Period[1], "the cycle reviews a period the frozen pair does not");
  assert.equal(cycle.period_end, hr09Period[2], "the cycle reviews a period the frozen pair does not");
});

test("HR-C4-T16: every relationship value is earned by the roster and no third value exists", () => {
  for (const row of assignmentRows()) {
    assert.ok(PUBLISHED_REVIEWER_RELATIONSHIPS.includes(row.reviewer_relationship), `${row.assignment_id}`);
    const reviewee = byEmployeeId.get(row.reviewee_employee_id);
    if (row.reviewer_relationship === "manager") {
      assert.equal(
        reviewee.manager_employee_id,
        row.reviewer_employee_id,
        `${row.assignment_id} calls itself a manager row without being one`
      );
      continue;
    }
    const manager = byEmployeeId.get(reviewee.manager_employee_id);
    assert.equal(manager.employment_status, "departed", `${row.assignment_id} skips a manager who is not departed`);
    assert.equal(
      manager.manager_employee_id,
      row.reviewer_employee_id,
      `${row.assignment_id} does not resolve to the departed manager's own manager`
    );
    assert.equal(
      byEmployeeId.get(row.reviewer_employee_id).employment_status,
      "active",
      `${row.assignment_id} skips to somebody who is not active`
    );
  }
});

test("HR-C4-T17: exactly one reviewer holds one overdue assignment, and both qualifiers differentiate", () => {
  const assignments = assignmentRows();
  const cycle = cycleRow();
  const outstanding = assignments.filter((row) => row.submitted_date === "");
  const overdue = outstanding.filter((row) => row.due_date < AS_OF);
  assert.equal(overdue.length, 1, "the overdue and outstanding census is not one assignment");
  assert.equal(new Set(overdue.map((row) => row.reviewer_employee_id)).size, 1, "more than one reviewer is late");
  assert.equal(
    new Set(outstanding.map((row) => row.reviewer_employee_id)).size,
    6,
    "the outstanding-reviewer census is not 6"
  );
  assert.equal(
    new Set(assignments.filter((row) => row.due_date < AS_OF).map((row) => row.reviewer_employee_id)).size,
    9,
    "the due-before-now reviewer census is not 9"
  );
  assert.equal(assignments.filter((row) => row.due_date < AS_OF).length, 34, "the rows due before the as-of are not 34");
  assert.equal(assignments.filter((row) => row.submitted_date !== "").length, 41, "the submitted rows are not 41");
  for (const row of assignments) {
    assert.ok(PUBLISHED_REVIEW_STATUSES.includes(row.status), `${row.assignment_id} status`);
    assert.equal(
      row.status === "submitted",
      row.submitted_date !== "",
      `${row.assignment_id} carries a submitted_date its status does not allow`
    );
    if (row.submitted_date === "") continue;
    assert.ok(row.submitted_date >= cycle.cycle_open_date, `${row.assignment_id} was submitted before the cycle opened`);
    assert.ok(row.submitted_date <= AS_OF, `${row.assignment_id} was submitted after the as-of`);
    assert.ok(row.submitted_date <= row.due_date, `${row.assignment_id} was submitted late`);
  }
  for (const row of assignments) {
    assert.ok(
      row.due_date >= cycle.feedback_due_window_start && row.due_date <= cycle.feedback_due_window_end,
      `${row.assignment_id} is due outside the published feedback window`
    );
    assert.ok(!isWeekend(row.due_date), `${row.assignment_id} is due on a weekend`);
  }
  // The staging table the spec publishes still describes the emitted file.
  const counts = new Map();
  for (const row of assignments) {
    counts.set(row.reviewer_employee_id, (counts.get(row.reviewer_employee_id) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  assert.equal(ranked.length, REVIEW_STAGING.length, "the staging table no longer covers every reviewer");
  ranked.forEach(([, total], rank) => {
    const plan = REVIEW_STAGING[rank];
    assert.equal(
      plan.early + plan.late_submitted + plan.late_unsubmitted,
      total,
      `staging rank ${rank} states a different number of assignments than the reviewer holds`
    );
  });
});

test("HR-C4-T18: the frozen pair is an ordinary manager row, still outstanding and not yet late", () => {
  const manager = rosterRowNamed(hr09Manager);
  const report = rosterRowNamed(hr09Report);
  assert.equal(report.manager_employee_id, manager.employee_id, "the roster no longer seats the frozen pair");
  const assignments = assignmentRows();
  const pair = assignments.find(
    (row) => row.reviewer_employee_id === manager.employee_id && row.reviewee_employee_id === report.employee_id
  );
  assert.ok(pair, "the frozen one-to-one pair carries no assignment row");
  assert.equal(pair.reviewer_relationship, "manager", "the frozen pair is not an ordinary manager row");
  assert.equal(pair.submitted_date, "", "the frozen pair's feedback is already submitted");
  assert.ok(pair.due_date >= AS_OF, "the frozen pair's feedback is already late");
  const overdue = assignments.filter((row) => row.submitted_date === "" && row.due_date < AS_OF);
  assert.notEqual(
    overdue[0].reviewer_employee_id,
    manager.employee_id,
    "the frozen pair's manager carries the overdue assignment"
  );
});

// ------------------------------------------------------------ cross-artifact

test("HR-C4-T19: the cross-artifact rules X1 to X7 hold, each recomputed independently (X8 and X9 live in their own arms)", () => {
  const instance = checklistRows();
  const [exit] = exitRecord();
  const offboarding = offboardingRows();
  const grants = grantRows();
  const assignments = assignmentRows();
  const overdue = assignments.filter((row) => row.submitted_date === "" && row.due_date < AS_OF);
  const carrier = overdue[0].reviewer_employee_id;
  const newHireId = instance[0].new_hire_employee_id;

  // X1: three distinct people in three distinct departments.
  assert.equal(new Set([newHireId, exit.employee_id, carrier]).size, 3, "the three lifecycle people are not distinct");
  const carrierRow = assignments.find((row) => row.reviewer_employee_id === carrier);
  assert.equal(
    new Set([instance[0].new_hire_department, exit.department, carrierRow.reviewer_department]).size,
    3,
    "the three lifecycle people share a department"
  );

  const onboardingActors = new Set([
    ...instance.map((row) => row.owner_employee_id),
    ...instance.map((row) => row.approval_owner_employee_id),
  ]);
  const offboardingActors = new Set([
    ...offboarding.map((row) => row.owner_employee_id),
    ...grants.map((row) => row.granted_by_employee_id),
    ...grants.map((row) => row.revoked_by_employee_id),
    exit.manager_employee_id, exit.hrbp_employee_id, exit.it_owner_employee_id,
  ]);

  // X2: a person serving their notice owns no part of a new hire's onboarding.
  assert.equal(onboardingActors.has(exit.employee_id), false, "the departing employee owns an onboarding task");

  // X3: the departing employee sits nowhere in the review cycle.
  for (const row of assignments) {
    assert.notEqual(row.reviewee_employee_id, exit.employee_id, "the departing employee is reviewed");
    assert.notEqual(row.reviewer_employee_id, exit.employee_id, "the departing employee reviews somebody");
  }

  // X4: the late reviewer is not a named actor in the other two artifacts.
  assert.equal(onboardingActors.has(carrier), false, "the late reviewer owns or approves an onboarding task");
  assert.equal(offboardingActors.has(carrier), false, "the late reviewer owns part of the exit");

  // X7: no frozen recruiting-arc row is given a second role.
  for (const employeeId of PUBLISHED_RECRUITING_ARC) {
    assert.equal(onboardingActors.has(employeeId), false, `${employeeId} is seated in the onboarding pack`);
    assert.equal(offboardingActors.has(employeeId), false, `${employeeId} is seated in the exit`);
    assert.ok(
      !assignments.some((row) => row.reviewer_employee_id === employeeId),
      `${employeeId} is seated as a reviewer`
    );
  }

  // X5, X6 and the arc's own requisition: swept over all eight files.
  for (const file of allFiles()) {
    assert.ok(!/\bca-\d/.test(file.content), `${file.path} carries a candidate id`);
    assert.ok(!file.content.includes("HRC-"), `${file.path} carries a people-system case id`);
    assert.ok(!file.content.includes("RQN-2026-0106"), `${file.path} carries the frozen recruiting requisition`);
    assert.ok(!/shortlist/i.test(file.content), `${file.path} names the shortlist decision`);
    for (const token of candidateTokens) {
      assert.ok(!file.content.includes(token), `${file.path} carries the candidate token "${token}"`);
    }
  }
});

test("HR-C4-T19 (X4, reviewee side): the overdue assignment's own reviewee is not a named actor in HR-06 or HR-07 (review F6)", () => {
  const instance = checklistRows();
  const [exit] = exitRecord();
  const offboarding = offboardingRows();
  const grants = grantRows();
  const assignments = assignmentRows();
  const overdue = assignments.filter((row) => row.submitted_date === "" && row.due_date < AS_OF);

  const onboardingActors = new Set([
    ...instance.map((row) => row.owner_employee_id),
    ...instance.map((row) => row.approval_owner_employee_id),
  ]);
  const offboardingActors = new Set([
    ...offboarding.map((row) => row.owner_employee_id),
    ...grants.map((row) => row.granted_by_employee_id),
    ...grants.map((row) => row.revoked_by_employee_id),
    exit.manager_employee_id, exit.hrbp_employee_id, exit.it_owner_employee_id,
  ]);

  // A cross-artifact reader cannot over-read the late review as belonging to
  // somebody already busy in HR-06 or HR-07: the seat was free before review
  // F6, and a draw once landed the overdue review's reviewee on HR-07's own
  // HR business partner.
  const plantReviewee = overdue[0].reviewee_employee_id;
  assert.equal(
    onboardingActors.has(plantReviewee),
    false,
    "the overdue assignment's reviewee owns or approves an onboarding task"
  );
  assert.equal(offboardingActors.has(plantReviewee), false, "the overdue assignment's reviewee owns part of the exit");
});

test("HR-C4-T19 (X8): HR-18 carries no field this cluster contradicts", () => {
  const instance = checklistRows();
  const newHireId = instance[0].new_hire_employee_id;

  // Read from the committed export bytes rather than through the builder, so
  // the claim under test is that the two independently-built files agree.
  //
  // Part one: every employee id any C4 file names that also appears in the
  // frozen export carries the same hire_date, employment_status and
  // record_status the export publishes. The minted new hire carries no HR-18
  // row at all, which is the same silence CORE-04 already keeps (0.3).
  const ACTOR_COLUMNS = [
    "employee_id", "new_hire_employee_id", "owner_employee_id", "approval_owner_employee_id",
    "granted_by_employee_id", "revoked_by_employee_id", "manager_employee_id", "hrbp_employee_id",
    "it_owner_employee_id", "reviewer_employee_id", "reviewee_employee_id", "escalation_contact_employee_id",
  ];
  for (const file of allFiles()) {
    if (!file.path.endsWith(".csv")) continue;
    for (const row of csvTable(file.content).rows) {
      for (const column of ACTOR_COLUMNS) {
        const id = row[column];
        if (!id) continue;
        const exported = hrisById.get(id);
        if (!exported) continue; // the minted new hire carries no HR-18 row; that silence is the point
        assert.equal(
          exported.hire_date,
          byEmployeeId.get(id)?.start_date,
          `${file.path}: ${id}'s HR-18 hire_date does not match the roster's own start_date`
        );
        assert.equal(exported.employment_status, "active", `${file.path}: ${id}'s HR-18 employment_status is not active`);
        assert.equal(exported.record_status, "active", `${file.path}: ${id}'s HR-18 record_status is not active`);
      }
    }
  }
  assert.equal(hrisById.has(newHireId), false, "the new hire carries a HR-18 export row");

  // Part two: no C4 row attributes an action to a person before their own
  // hire date, paired only where a row's own date is the actor's own action
  // (a grantor's grant, a revoker's revocation, an owner's due task), never
  // against an unrelated date that happens to share the row (review F1's own
  // defect: twenty grants dated years before their named grantor had joined).
  const ACTION_DATE_PAIRS = [
    ["access-grant-inventory.csv", "granted_by_employee_id", "granted_date"],
    ["access-grant-inventory.csv", "revoked_by_employee_id", "revoked_date"],
    ["new-hire-checklist.csv", "owner_employee_id", "due_date"],
    ["new-hire-checklist.csv", "approval_owner_employee_id", "due_date"],
    ["offboarding-checklist.csv", "owner_employee_id", "due_date"],
    ["review-assignments.csv", "reviewer_employee_id", "due_date"],
  ];
  for (const file of allFiles()) {
    const pairs = ACTION_DATE_PAIRS.filter(([path]) => path === file.path);
    if (pairs.length === 0) continue;
    for (const row of csvTable(file.content).rows) {
      for (const [, actorColumn, dateColumn] of pairs) {
        const id = row[actorColumn];
        const date = row[dateColumn];
        if (!id || !date) continue;
        const exported = hrisById.get(id);
        if (!exported) continue;
        assert.ok(
          date >= exported.hire_date,
          `${file.path}: ${actorColumn} ${id} is dated ${date} on ${dateColumn}, before their own HR-18 `
          + `hire_date ${exported.hire_date}`
        );
      }
    }
  }
});

test("HR-C4-T20: the headers match the spec, every value is published, and the house rules hold across all eight files", () => {
  for (const id of ["HR-06", "HR-07", "HR-08"]) {
    const spec = specOf(id);
    assert.ok(!("columns" in spec), `${id} publishes per-file column lists, not one flat column list`);
    for (const path of Object.keys(spec.files)) table(id, path);
    const emitted = filesOf(id).map((file) => file.path).filter((path) => path.endsWith(".csv")).sort();
    assert.deepEqual(emitted, Object.keys(spec.files).sort(), `${id}: the emitted CSV set is not the spec's own`);
    for (const columns of Object.values(spec.files)) {
      for (const column of columns) {
        assert.ok(
          !/salary|pay_band|amount|rating|score|work_location|home_city|date_of_birth|exit_reason|health/i.test(column),
          `${id} carries the column "${column}", which this cluster deliberately does not`
        );
      }
    }
  }

  const catalogNames = new Set(SYSTEM_CATALOG.map((row) => row.system_name));
  const catalogIds = new Set(SYSTEM_CATALOG.map((row) => row.system_id));
  for (const row of grantRows()) {
    assert.ok(catalogIds.has(row.system_id), `${row.grant_id} names a system outside the catalog`);
    assert.equal(row.system_name, SYSTEM_CATALOG.find((s) => s.system_id === row.system_id).system_name);
  }
  for (const row of templateRows()) {
    if (row.grants_system_id === "") continue;
    assert.ok(catalogIds.has(row.grants_system_id), `${row.task_code} names a system outside the catalog`);
  }

  for (const file of allFiles()) {
    assert.ok(!file.content.includes("\u2014"), `${file.path} carries an em dash`);
    assert.ok(!file.content.includes("$"), `${file.path} carries a currency symbol`);
    assert.ok(!file.content.includes("%"), `${file.path} carries a percentage sign`);
    assert.ok(!file.content.includes("\r"), `${file.path} carries a CR byte`);
    assert.ok(
      !/\d{2}:\d{2}/.test(file.content),
      `${file.path} carries a time of day, which none of these artifacts records`
    );
    for (const token of ["salary", "pay_band", "date_of_birth", "home_city", "rating", "score"]) {
      assert.ok(!new RegExp(token, "i").test(file.content), `${file.path} carries the token "${token}"`);
    }
    for (const domain of file.content.match(/[A-Za-z0-9.-]*\.example/g) ?? []) {
      assert.equal(domain, "co002.example", `${file.path} names the domain ${domain}`);
    }
    const cells = file.path.endsWith(".csv")
      ? [csvTable(file.content).cols, ...csvTable(file.content).rows.map((row) => Object.values(row))].flat()
      : [file.content];
    for (const cell of cells) {
      assert.deepEqual(moneyMatches(cell), [], `${file.path} carries the money-shaped figure "${cell}"`);
    }
  }

  // The proper-noun screen: every capitalized run has to be something the pack
  // already accounts for, so an invented person, company or brand fails here.
  const company = canon.get("co-002");
  const assignments = assignmentRows();
  const instance = checklistRows();
  const offboarding = offboardingRows();
  const [exit] = exitRecord();
  const allowed = allowedFrom({
    derived: [
      company.name,
      ...new Set([
        ...instance.map((row) => row.new_hire_full_name),
        ...instance.map((row) => row.owner_full_name),
        ...offboarding.map((row) => row.owner_full_name),
        ...assignments.map((row) => row.reviewee_full_name),
        ...assignments.map((row) => row.reviewer_full_name),
        ...assignments.map((row) => row.escalation_contact_full_name),
        exit.full_name, exit.manager_full_name, exit.hrbp_full_name, exit.it_owner_full_name,
      ]),
      ...new Set([
        ...instance.map((row) => row.new_hire_role_title),
        ...assignments.map((row) => row.reviewee_role_title),
        ...assignments.map((row) => row.reviewer_role_title),
        exit.role_title,
      ]),
      ...new Set(roster.map((row) => row.department)),
      ...PUBLISHED_ONBOARDING_OWNER_ROLES,
      ...PUBLISHED_OFFBOARDING_OWNER_ROLES,
      ...catalogNames,
    ],
    // Document furniture: the id blocks, the two sentence openers the template
    // document uses in mid-sentence positions, and the two weekend day names
    // the due-date rule has to spell out.
    furniturePhrases: [],
    furnitureWords: [
      "EMP", "ONB", "ONBT", "OFB", "OFBT", "EXT", "GRT", "ACR", "RQN", "RVC", "RVA", "SYS",
      "Saturdays", "Sundays", "Inc", "Instantiating", "Worked", "The", "A", "Every",
    ],
  });
  for (const file of allFiles()) {
    const doc = file.path.endsWith(".csv") ? asPipeTable(file.content) : file.content;
    assert.deepEqual(unscreenedPhrases(doc, allowed), [], `${file.path} carries an unaccounted capitalized phrase`);
    assert.deepEqual(unscreenedWords(doc, allowed), [], `${file.path} carries an unaccounted capitalized word`);
  }
});

test("HR-C4: the three artifacts are byte identical across two runs", () => {
  for (const id of ["HR-06", "HR-07", "HR-08"]) {
    assert.deepEqual(generateArtifact(specOf(id), canon), generateArtifact(specOf(id), canon), `${id} is not deterministic`);
  }
});

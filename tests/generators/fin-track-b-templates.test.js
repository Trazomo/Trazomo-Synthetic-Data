// FIN-36, FIN-37 and FIN-39: the three Track B templates. Templates plant no
// defects, so every check here is a structural rule the module relies on. No
// test names a row, a role assignment or an amount that a learner is meant to
// find: these files have no answers in them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";
import { buildChartOfAccounts } from "../../datagen/src/generators/fin-22-chart-of-accounts.js";
import { financeRoster, ROLE_LADDER, seniority } from "../../datagen/src/generators/finance-roles.js";
import { CATEGORIES } from "../../datagen/src/generators/fin-36-close-checklist-template.js";
import { explanationThreshold, STATEMENT_SECTIONS } from "../../datagen/src/generators/fin-37-budget-vs-actual-template.js";
import {
  DATA_CLASSES, AUTONOMY_LEVELS, DIRECTOR_APPROVAL_FLOOR_USD,
} from "../../datagen/src/generators/fin-39-decision-authority-matrix.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
const roster = financeRoster();

function tableFor(id, file) {
  const spec = specs.byId.get(id);
  const files = generateArtifact(spec, canon);
  const table = csvTable(fileByPath(files, file).content);
  assert.deepEqual(table.cols, spec.columns, `${id}: header does not match spec.columns`);
  return table;
}

function assertRosterRole(title, id, where) {
  assert.ok(ROLE_LADDER.includes(title), `${id}: "${title}" (${where}) is not on the finance role ladder`);
  const holders = roster.filter((r) => r.role_title === title && r.employment_status === "active");
  assert.ok(holders.length > 0, `${id}: no active CORE-04 employee holds "${title}"`);
}

// ------------------------------------------------------------------- FIN-36

test("FIN-36: 15 to 40 tasks, unique ids, a relative close day, and every category covered", () => {
  const { rows } = tableFor("FIN-36", "close-checklist-template.csv");
  assert.ok(rows.length >= 15 && rows.length <= 40, `template holds ${rows.length} tasks`);
  assert.equal(new Set(rows.map((r) => r.task_id)).size, rows.length, "task ids must be unique");
  let lastDay = 0;
  for (const row of rows) {
    assert.match(row.close_day, /^D\+[1-5]$/, `${row.task_id} close_day`);
    const day = Number(row.close_day.slice(2));
    assert.ok(day >= lastDay, `${row.task_id} goes backwards in the close`);
    lastDay = day;
    assert.ok(CATEGORIES.includes(row.category), `${row.task_id} category "${row.category}"`);
    assert.ok(row.task.length > 0 && row.evidence_required.length > 0, `${row.task_id} is missing text`);
  }
  for (const category of CATEGORIES) {
    assert.ok(rows.some((r) => r.category === category), `no task in category "${category}"`);
  }
});

test("FIN-36: owner and reviewer are different roster roles, and no task depends on a later one", () => {
  const { rows } = tableFor("FIN-36", "close-checklist-template.csv");
  const byId = new Map(rows.map((r) => [r.task_id, r]));
  for (const row of rows) {
    assertRosterRole(row.owner_role, "FIN-36", `${row.task_id} owner`);
    assertRosterRole(row.reviewer_role, "FIN-36", `${row.task_id} reviewer`);
    assert.notEqual(row.owner_role, row.reviewer_role, `${row.task_id} is owned and reviewed by one role`);
    if (row.depends_on === "") continue;
    const parent = byId.get(row.depends_on);
    assert.ok(parent, `${row.task_id} depends on ${row.depends_on}, which is not a task`);
    assert.ok(parent.task_id < row.task_id, `${row.task_id} depends on a task that comes later`);
    assert.ok(
      Number(parent.close_day.slice(2)) <= Number(row.close_day.slice(2)),
      `${row.task_id} depends on a task scheduled later in the close`
    );
  }
});

test("FIN-36: the learner columns ship empty, because a template is not a completed close", () => {
  const { rows } = tableFor("FIN-36", "close-checklist-template.csv");
  for (const row of rows) {
    assert.equal(row.status, "", `${row.task_id} status`);
    assert.equal(row.completed_date, "", `${row.task_id} completed_date`);
    assert.equal(row.notes, "", `${row.task_id} notes`);
  }
});

// ------------------------------------------------------------------- FIN-37

test("FIN-37: the row spine is exactly the active FIN-22 profit-and-loss accounts, in chart order", () => {
  const { rows } = tableFor("FIN-37", "budget-vs-actual-template.csv");
  const expected = buildChartOfAccounts().filter(
    (a) => a.active === "true" && (a.type === "revenue" || a.type === "expense")
  );
  assert.deepEqual(rows.map((r) => r.account_code), expected.map((a) => a.account_code));
  assert.deepEqual(rows.map((r) => r.account_name), expected.map((a) => a.account_name));
  assert.ok(rows.length >= 15 && rows.length <= 40, `template holds ${rows.length} lines`);
  assert.equal(new Set(rows.map((r) => r.line_id)).size, rows.length, "line ids must be unique");
  for (const section of STATEMENT_SECTIONS) {
    assert.ok(rows.some((r) => r.statement_section === section), `no ${section} lines`);
  }
});

test("FIN-37: budget is a positive whole hundred, the threshold recomputes from it, and the actuals ship empty", () => {
  const { rows } = tableFor("FIN-37", "budget-vs-actual-template.csv");
  for (const row of rows) {
    assert.ok(STATEMENT_SECTIONS.includes(row.statement_section), `${row.line_id} section`);
    assertRosterRole(row.owner_role, "FIN-37", `${row.line_id} owner`);
    const budget = Number(row.budget_amount);
    assert.ok(budget > 0, `${row.line_id} budget is not positive`);
    assert.equal(budget % 100, 0, `${row.line_id} budget is not a whole hundred`);
    assert.equal(row.budget_amount, budget.toFixed(2), `${row.line_id} budget is not a 2dp string`);
    assert.equal(
      Number(row.explanation_threshold_usd), explanationThreshold(budget),
      `${row.line_id} threshold does not follow the stated rule`
    );
    assert.equal(row.actual_amount, "", `${row.line_id} actual_amount`);
    assert.equal(row.variance_amount, "", `${row.line_id} variance_amount`);
    assert.equal(row.variance_pct, "", `${row.line_id} variance_pct`);
    assert.equal(row.variance_explanation, "", `${row.line_id} variance_explanation`);
  }
});

// ------------------------------------------------------------------- FIN-39

test("FIN-39: 15 to 40 decisions, unique ids, and every data class and autonomy level in use", () => {
  const { rows } = tableFor("FIN-39", "decision-authority-matrix-template.csv");
  assert.ok(rows.length >= 15 && rows.length <= 40, `matrix holds ${rows.length} decisions`);
  assert.equal(new Set(rows.map((r) => r.control_id)).size, rows.length, "control ids must be unique");
  for (const row of rows) {
    assert.ok(DATA_CLASSES.includes(row.data_class), `${row.control_id} data_class "${row.data_class}"`);
    assert.ok(AUTONOMY_LEVELS.includes(row.ai_autonomy_level), `${row.control_id} autonomy "${row.ai_autonomy_level}"`);
    assert.ok(["true", "false"].includes(row.moves_money_or_posts), `${row.control_id} moves_money_or_posts`);
    assert.ok(row.decision.length > 0 && row.evidence_required.length > 0, `${row.control_id} is missing text`);
  }
  for (const cls of DATA_CLASSES) assert.ok(rows.some((r) => r.data_class === cls), `no ${cls} row`);
  for (const level of AUTONOMY_LEVELS) assert.ok(rows.some((r) => r.ai_autonomy_level === level), `no ${level} row`);
});

test("FIN-39: nothing that moves money or posts an entry is left to AI, and restricted data never runs ahead of approval", () => {
  const { rows } = tableFor("FIN-39", "decision-authority-matrix-template.csv");
  const moversAndPosters = rows.filter((r) => r.moves_money_or_posts === "true");
  assert.ok(moversAndPosters.length >= 3, "expected several money-moving or posting decisions");
  for (const row of moversAndPosters) {
    assert.equal(row.ai_autonomy_level, "prohibited", `${row.control_id} moves money or posts but is not prohibited`);
  }
  for (const row of rows.filter((r) => r.data_class === "restricted")) {
    assert.ok(
      ["approval_before_action", "prohibited"].includes(row.ai_autonomy_level),
      `${row.control_id} lets restricted data run ahead of approval`
    );
  }
});

test("FIN-39: approval seniority rises with the band, the 50k step is director level, and escalation is always more senior", () => {
  const { rows } = tableFor("FIN-39", "decision-authority-matrix-template.csv");
  const directorFloor = seniority("Director, Finance");
  const byDecision = new Map();
  for (const row of rows) {
    assertRosterRole(row.approver_role, "FIN-39", `${row.control_id} approver`);
    assertRosterRole(row.escalation_role, "FIN-39", `${row.control_id} escalation`);
    assert.ok(
      seniority(row.escalation_role) > seniority(row.approver_role),
      `${row.control_id} escalates to a role no more senior than the approver`
    );
    if (row.amount_min_usd === "") {
      assert.equal(row.amount_max_usd, "", `${row.control_id} has a ceiling but no floor`);
      continue;
    }
    const min = Number(row.amount_min_usd);
    if (row.amount_max_usd !== "") {
      assert.ok(Number(row.amount_max_usd) >= min, `${row.control_id} has an inverted band`);
    }
    if (min >= DIRECTOR_APPROVAL_FLOOR_USD) {
      assert.ok(
        seniority(row.approver_role) >= directorFloor,
        `${row.control_id} approves ${DIRECTOR_APPROVAL_FLOOR_USD} and above below director level`
      );
    }
    if (!byDecision.has(row.decision)) byDecision.set(row.decision, []);
    byDecision.get(row.decision).push(row);
  }
  assert.ok(byDecision.size >= 2, "expected at least two banded decisions");
  for (const [decision, banded] of byDecision) {
    const sorted = [...banded].sort((a, b) => Number(a.amount_min_usd) - Number(b.amount_min_usd));
    for (let i = 1; i < sorted.length; i++) {
      assert.ok(
        seniority(sorted[i].approver_role) >= seniority(sorted[i - 1].approver_role),
        `"${decision}" approves a larger band at a more junior role`
      );
    }
  }
});

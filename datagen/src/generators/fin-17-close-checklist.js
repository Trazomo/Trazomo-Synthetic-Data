// FIN-17 close-checklist: co-002's March 2026 close, dated, owned and part
// done, read as of D+4. finance-close-checklist-risk-radar monitors it and
// finance-close-memo-disclosures later writes the memo off the open items, so
// the file has to behave like a close that is genuinely mid-flight rather than
// a finished one with a few cells blanked.
//
// The spine is FIN-36. buildCloseChecklistTemplate() is imported and its eight
// template columns are carried straight through, never retyped: an instance of
// a template that copies the template is two files waiting to disagree. Editing
// FIN-36 is therefore a two-file change, and the FIN-17 test fails loudly if
// only one of them moves.
//
// What this generator adds on top of the spine is everything a template cannot
// carry: real dates (closeDayDate, the one place the business-day rule lives),
// real people from CORE-04, the accounts the reconciliation tasks tie out, and
// a status as of 2026-04-06.
//
// Three features are planted, each by a rule rather than by a row id:
//
//   1. one task overdue at the as-of with no account code: the last task due
//      before the as-of that nothing downstream depends on, so the close can
//      still be moving while it sits open.
//   2. one account unreconciled past its deadline: the one reconciliation task
//      no later task depends on, again so nothing cascades. Its account is
//      active on the FIN-22 chart and ends the period with a real FIN-05
//      balance, which is what makes the open item cost something.
//   3. one reviewer double booked: the close journal batch and the first
//      controls task that depends on it share a reviewer, so the person who
//      signed off the posting also signs off the control that tests whether
//      anyone approved their own entry. The batch's preparer and reviewer are
//      the canon March close pair FIN-09 already uses, so the checklist and the
//      journal batch name the same two people.
//
// Every plant is asserted here and the builder refuses to emit if one is
// missing or has been duplicated (the FIN-38 precedent). Which row carries
// which stays out of this repo (answer-key rule, datagen/README.md).
import { toCsv } from "../csv.js";
import { addBusinessDays, closeDayDate, isWeekend, toEpochDay } from "../dates.js";
import { createRng } from "../seed.js";
import { buildCloseChecklistTemplate } from "./fin-36-close-checklist-template.js";
import { assertRolesUsed, financeRoster } from "./finance-roles.js";
import {
  AP_CONTROL_ACCOUNT, AR_CONTROL_ACCOUNT, OPERATING_CASH_ACCOUNT, buildChartOfAccounts,
} from "./fin-22-chart-of-accounts.js";
import { buildTrialBalance } from "./fin-05-gl-trial-balance.js";
import { PREPARER_EMPLOYEE_ID, REVIEWER_EMPLOYEE_ID } from "./fin-01-cash-recon.js";

export const id = "FIN-17";

/**
 * The close is reported as of D+4: D+1 to D+3 are behind it, D+4 is the day in
 * hand and D+5 is ahead. Read off closeDayDate rather than written down, so the
 * as-of cannot drift from the close-day rule (it resolves to Monday
 * 2026-04-06, the weekend the close crosses already skipped).
 */
export const AS_OF = closeDayDate("D+4");

/** The template columns FIN-17 carries through unchanged. */
export const SPINE_COLUMNS = [
  "task_id", "close_day", "task", "category", "owner_role", "reviewer_role",
  "depends_on", "evidence_required",
];

export const COLUMNS = [
  "task_id", "close_day", "due_date", "task", "category", "owner_role", "owner_employee_id",
  "reviewer_role", "reviewer_employee_id", "depends_on", "evidence_required", "account_code",
  "status", "completed_date", "notes",
];

export const STATUSES = ["complete", "in_progress", "not_started"];

/**
 * A task carries an account code when it reconciles or ties out a balance: it
 * either starts with "Reconcile" or agrees a subledger to a control account.
 * A rule over the template text rather than a list of task ids, so a template
 * edit that adds a reconciliation is picked up instead of silently ignored.
 */
export const RECONCILIATION_TASK = /^Reconcile\b|\bcontrol account\b/;

/** How much of the day's work slips a business day past its due date. */
const SLIP_RATE = 0.3;

const day = (iso) => toEpochDay(iso);
const before = (aIso, bIso) => day(aIso) < day(bIso);

/**
 * The one active cash account the payroll funding reconciliation ties out, read
 * off the FIN-22 chart rather than written down here. FIN-22 exports named
 * constants for the operating, receivable and payable control accounts but not
 * for this one, so it is selected and the selection is checked.
 */
function payrollCashAccount(chart) {
  const matches = chart.filter(
    (a) => a.active === "true" && a.subtype === "cash" && /^Payroll\b/.test(a.account_name)
  );
  if (matches.length !== 1) {
    throw new Error(
      `${id}: expected exactly one active payroll cash account on the FIN-22 chart, found ${matches.length}`
    );
  }
  return matches[0].account_code;
}

/** The account each reconciliation category ties out, keyed by template category. */
function reconciledAccounts(chart) {
  return new Map([
    ["cash", OPERATING_CASH_ACCOUNT.code],
    ["receivables", AR_CONTROL_ACCOUNT.code],
    ["payables", AP_CONTROL_ACCOUNT.code],
    ["payroll", payrollCashAccount(chart)],
  ]);
}

/** Active Finance employees by role title, each list in employee-id order. */
function holdersByRole(roster) {
  const holders = new Map();
  for (const person of roster) {
    if (person.employment_status !== "active" || person.department !== "Finance") continue;
    if (!holders.has(person.role_title)) holders.set(person.role_title, []);
    holders.get(person.role_title).push(person.employee_id);
  }
  for (const list of holders.values()) list.sort();
  return holders;
}

function activeFinanceEmployee(roster, employeeId) {
  const person = roster.find((r) => r.employee_id === employeeId);
  if (!person || person.employment_status !== "active" || person.department !== "Finance") {
    throw new Error(`${id}: ${employeeId} is not an active Finance employee on the CORE-04 roster`);
  }
  return person;
}

function only(rows, what) {
  if (rows.length !== 1) {
    throw new Error(`${id}: expected exactly one ${what}, found ${rows.length}`);
  }
  return rows[0];
}

/**
 * The close checklist as row objects keyed by COLUMNS.
 * @returns {object[]}
 */
export function buildCloseChecklist() {
  const spine = buildCloseChecklistTemplate();
  const roster = financeRoster();
  assertRolesUsed(id, spine.flatMap((t) => [t.owner_role, t.reviewer_role]), roster);
  const holders = holdersByRole(roster);
  const chart = buildChartOfAccounts();
  const accountForCategory = reconciledAccounts(chart);

  const rows = spine.map((task) => ({
    task_id: task.task_id,
    close_day: task.close_day,
    due_date: closeDayDate(task.close_day),
    task: task.task,
    category: task.category,
    owner_role: task.owner_role,
    owner_employee_id: "",
    reviewer_role: task.reviewer_role,
    reviewer_employee_id: "",
    depends_on: task.depends_on,
    evidence_required: task.evidence_required,
    account_code: "",
    status: "",
    completed_date: "",
    notes: "",
  }));
  const byId = new Map(rows.map((r) => [r.task_id, r]));

  // ------------------------------------------------------------------ people
  // The work is spread across the people who hold each role, round robin down
  // the checklist and per role, so no one carries the whole close and the
  // assignment stays a rule rather than a draw.
  const seen = new Map();
  const rotate = (role, taskId, which) => {
    const list = holders.get(role);
    if (!list || list.length === 0) {
      throw new Error(`${id}: ${taskId} names ${which} role "${role}", which no active Finance employee holds`);
    }
    const key = `${which}:${role}`;
    const turn = seen.get(key) ?? 0;
    seen.set(key, turn + 1);
    return list[turn % list.length];
  };
  for (const row of rows) {
    row.owner_employee_id = rotate(row.owner_role, row.task_id, "owner");
    row.reviewer_employee_id = rotate(row.reviewer_role, row.task_id, "reviewer");
  }

  // The segregation-of-duties plant, and the canon pair it hangs on. The batch
  // posting is identified as the task the first controls task depends on, not
  // by its id, so a template reshuffle moves the plant rather than breaking it.
  const controlEdges = rows
    .filter((r) => r.category === "controls" && r.depends_on !== "")
    .map((child) => ({ child, parent: byId.get(child.depends_on) }));
  if (controlEdges.length < 2) {
    throw new Error(
      `${id}: the template offers ${controlEdges.length} controls tasks with a dependency, so a double-booked reviewer would be structural rather than planted`
    );
  }
  const conflict = controlEdges[0];
  const preparer = activeFinanceEmployee(roster, PREPARER_EMPLOYEE_ID);
  const reviewer = activeFinanceEmployee(roster, REVIEWER_EMPLOYEE_ID);
  if (preparer.role_title !== conflict.parent.owner_role) {
    throw new Error(
      `${id}: ${conflict.parent.task_id} is owned by "${conflict.parent.owner_role}" but the canon March close preparer is a ${preparer.role_title}`
    );
  }
  if (reviewer.role_title !== conflict.parent.reviewer_role || reviewer.role_title !== conflict.child.reviewer_role) {
    throw new Error(
      `${id}: the canon March close reviewer is a ${reviewer.role_title}, which is not the reviewer role on both ${conflict.parent.task_id} and ${conflict.child.task_id}`
    );
  }
  conflict.parent.owner_employee_id = preparer.employee_id;
  conflict.parent.reviewer_employee_id = reviewer.employee_id;
  conflict.child.reviewer_employee_id = reviewer.employee_id;

  // Every other controls task is reviewed by someone other than the reviewer of
  // the task it checks, so the conflict above is the only one.
  for (const { child, parent } of controlEdges.slice(1)) {
    if (child.reviewer_employee_id !== parent.reviewer_employee_id) continue;
    const alternative = holders.get(child.reviewer_role).find((e) => e !== parent.reviewer_employee_id);
    if (!alternative) {
      throw new Error(
        `${id}: ${child.task_id} has no reviewer available other than ${parent.task_id}'s, so the conflict cannot be kept to one`
      );
    }
    child.reviewer_employee_id = alternative;
  }

  for (const row of rows) {
    if (row.owner_employee_id === row.reviewer_employee_id) {
      throw new Error(`${id}: ${row.task_id} is owned and reviewed by the same person`);
    }
  }

  // ---------------------------------------------------------------- accounts
  for (const row of rows) {
    if (!RECONCILIATION_TASK.test(row.task)) continue;
    const code = accountForCategory.get(row.category);
    if (!code) {
      throw new Error(
        `${id}: ${row.task_id} reconciles a "${row.category}" balance and no FIN-22 account is mapped to that category`
      );
    }
    row.account_code = code;
  }
  for (const [category, code] of accountForCategory) {
    if (!rows.some((r) => r.account_code === code)) {
      throw new Error(`${id}: nothing on the checklist reconciles the ${category} account ${code}`);
    }
  }

  // ------------------------------------------------------------------ status
  // Two rows are held open on purpose. Both are chosen from the tasks due
  // before the as-of that nothing else depends on, so an open item does not
  // cascade into a close that would otherwise be moving.
  const dependedOn = new Set(rows.filter((r) => r.depends_on !== "").map((r) => r.depends_on));
  const openable = rows.filter((r) => before(r.due_date, AS_OF) && !dependedOn.has(r.task_id));
  const openReconciliation = only(
    openable.filter((r) => r.account_code !== ""),
    "reconciliation task due before the as-of that no later task depends on"
  );
  const overdue = openable.filter((r) => r.account_code === "").pop();
  if (!overdue) {
    throw new Error(`${id}: no task due before the as-of can be left open without stalling the close`);
  }
  const planted = new Map([
    [openReconciliation.task_id, "in_progress"],
    [overdue.task_id, "not_started"],
  ]);

  const rng = createRng(id, "completion");
  for (const row of rows) {
    const parent = row.depends_on === "" ? null : byId.get(row.depends_on);
    if (before(AS_OF, row.due_date)) row.status = "not_started";
    else if (planted.has(row.task_id)) row.status = planted.get(row.task_id);
    else if (parent && parent.status !== "complete") row.status = "not_started";
    else if (before(row.due_date, AS_OF)) row.status = "complete";
    else row.status = "in_progress";

    if (row.status !== "complete") continue;
    let signedOff = addBusinessDays(row.due_date, rng.chance(SLIP_RATE) ? 1 : 0);
    if (before(AS_OF, signedOff)) signedOff = AS_OF;
    if (parent && before(signedOff, parent.completed_date)) signedOff = parent.completed_date;
    row.completed_date = signedOff;
  }

  assertPlants(rows);
  return rows;
}

/** The builder refuses to emit a checklist whose planted features went missing. */
function assertPlants(rows) {
  only(
    rows.filter((r) => r.status !== "complete" && before(r.due_date, AS_OF) && r.account_code === ""),
    "task overdue at the as-of with no account code"
  );
  const unreconciled = only(
    rows.filter((r) => r.status !== "complete" && before(r.due_date, AS_OF) && r.account_code !== ""),
    "account left unreconciled past its close deadline"
  );
  const balance = buildTrialBalance().rows.find((r) => r.account_code === unreconciled.account_code);
  if (!balance || Math.round(Number(balance.ending_balance) * 100) === 0) {
    throw new Error(
      `${id}: account ${unreconciled.account_code} is left unreconciled but ends the period at zero on FIN-05, so nothing is at stake`
    );
  }

  const byId = new Map(rows.map((r) => [r.task_id, r]));
  const doubleBooked = new Set(
    rows
      .filter((r) => r.category === "controls" && r.depends_on !== "")
      .filter((r) => r.reviewer_employee_id === byId.get(r.depends_on).reviewer_employee_id)
      .map((r) => r.reviewer_employee_id)
  );
  if (doubleBooked.size !== 1) {
    throw new Error(
      `${id}: expected exactly one reviewer signing off both a task and the controls task that checks it, found ${doubleBooked.size}`
    );
  }

  for (const row of rows) {
    if (isWeekend(row.due_date)) throw new Error(`${id}: ${row.task_id} is due on a weekend`);
    if ((row.completed_date !== "") !== (row.status === "complete")) {
      throw new Error(`${id}: ${row.task_id} has status "${row.status}" and completed_date "${row.completed_date}"`);
    }
    if (row.status === "complete" && row.depends_on !== "" && byId.get(row.depends_on).status !== "complete") {
      throw new Error(`${id}: ${row.task_id} is complete while ${row.depends_on}, which it depends on, is not`);
    }
  }
}

export function generate() {
  return [{ path: "close-checklist.csv", content: toCsv(COLUMNS, buildCloseChecklist()) }];
}

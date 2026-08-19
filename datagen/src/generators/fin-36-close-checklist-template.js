// FIN-36 close-checklist-template: the empty month-end close checklist three
// Track B modules deploy as their starting schema (finance-spreadsheet-ops
// lesson 1, then finance-google-workspace and finance-microsoft-365, which
// consume it rather than inventing their own).
//
// A template, so nothing is planted. What it does carry is structure that a
// validator can check: close_day is relative (D+1 to D+5) because a template is
// reused every period, no task depends on a task later in the close, owner and
// reviewer are never the same role, and the three learner columns ship empty.
// A static table needs no random draws, the FIN-22 pattern.
//
// FIN-17 close-checklist is the populated, in-flight checklist of one specific
// close and keeps its own spec. This file is the blank one.
import { toCsv } from "../csv.js";
import { assertRolesUsed } from "./finance-roles.js";

export const id = "FIN-36";

export const COLUMNS = [
  "task_id", "close_day", "task", "category", "owner_role", "reviewer_role",
  "depends_on", "evidence_required", "status", "completed_date", "notes",
];

/** The eight areas a close covers. Every one appears at least once. */
export const CATEGORIES = [
  "cash", "receivables", "payables", "payroll", "accruals", "revenue", "reporting", "controls",
];

// [close_day, task, category, owner_role, reviewer_role, depends_on, evidence_required]
const TASKS = [
  ["D+1", "Import the final bank statement for the period", "cash", "Staff Accountant", "Controller", "", "bank statement export for every account"],
  ["D+1", "Close the payables subledger to new postings", "payables", "AP Clerk", "Finance Manager", "", "subledger close confirmation"],
  ["D+1", "Close the receivables subledger to new postings", "receivables", "AR Clerk", "Finance Manager", "", "subledger close confirmation"],
  ["D+1", "Reconcile the operating account to the cash ledger", "cash", "Staff Accountant", "Controller", "CLS-01", "reconciliation working paper showing the adjusted balances"],
  ["D+1", "List the checks issued and not cleared at period end", "cash", "Staff Accountant", "Controller", "CLS-04", "outstanding check listing agreed to the ledger"],
  ["D+2", "Age the open receivables and agree the total to the control account", "receivables", "AR Clerk", "Finance Manager", "CLS-03", "aging report with the control account tie"],
  ["D+2", "Review credit memos issued and cash received but not applied", "receivables", "AR Clerk", "Controller", "CLS-06", "credit memo and unapplied cash listing"],
  ["D+2", "Match invoices received to their orders and receipts", "payables", "AP Clerk", "Finance Manager", "CLS-02", "three way match exception report"],
  ["D+2", "Agree the payables subledger to the control account", "payables", "AP Clerk", "Controller", "CLS-08", "payables tie out working paper"],
  ["D+2", "Reconcile payroll funding to the payroll register", "payroll", "Staff Accountant", "Finance Manager", "CLS-04", "payroll register reconciliation"],
  ["D+3", "Accrue for goods and services received and not yet invoiced", "accruals", "Staff Accountant", "Controller", "CLS-08", "accrual roll forward schedule"],
  ["D+3", "Update the prepaid amortization schedules", "accruals", "Staff Accountant", "Finance Manager", "", "prepaid schedule with the monthly amortization"],
  ["D+3", "Accrue unpaid wages, bonus and commission", "payroll", "Staff Accountant", "Controller", "CLS-10", "payroll accrual schedule"],
  ["D+3", "Recognize subscription revenue and roll the deferred balance", "revenue", "FP&A Analyst", "Controller", "CLS-06", "deferred revenue roll forward"],
  ["D+3", "Post the close journal batch", "accruals", "Staff Accountant", "Controller", "CLS-11", "journal batch with support attached to every entry"],
  ["D+4", "Produce the pre-close trial balance", "reporting", "Staff Accountant", "Controller", "CLS-15", "trial balance with debits equal to credits"],
  ["D+4", "Explain every variance above the reporting threshold", "reporting", "FP&A Analyst", "Finance Manager", "CLS-16", "budget versus actual with a written explanation per line"],
  ["D+4", "Confirm no person both prepared and approved an entry", "controls", "Finance Manager", "Controller", "CLS-15", "segregation of duties exception report"],
  ["D+4", "Confirm every entry in the batch carries supporting evidence", "controls", "Finance Manager", "Controller", "CLS-15", "evidence index by entry"],
  ["D+4", "Draft the close memo with the period result", "reporting", "Controller", "Director, Finance", "CLS-17", "close memo draft, figures cited to their source"],
  ["D+5", "Review the finance system access list against current roles", "controls", "Finance Manager", "Director, Finance", "", "access review with a sign off per exception"],
  ["D+5", "Assemble the evidence binder for the period", "reporting", "Staff Accountant", "Controller", "CLS-20", "evidence binder index, one folder per reconciliation"],
  ["D+5", "Approve the close and lock the period", "reporting", "Controller", "VP, Finance", "CLS-22", "period lock confirmation"],
  ["D+5", "Log the open items carried into the next close", "controls", "Finance Manager", "Controller", "CLS-23", "open item log with an owner and a due date"],
];

const taskId = (index) => `CLS-${String(index + 1).padStart(2, "0")}`;
const dayNumber = (closeDay) => Number(closeDay.slice(2));

/**
 * The checklist as row objects keyed by COLUMNS, with the structural rules
 * asserted at build time rather than left to the test alone.
 * @returns {object[]}
 */
export function buildCloseChecklistTemplate() {
  const rows = TASKS.map(([close_day, task, category, owner_role, reviewer_role, depends_on, evidence_required], i) => ({
    task_id: taskId(i),
    close_day,
    task,
    category,
    owner_role,
    reviewer_role,
    depends_on,
    evidence_required,
    status: "",
    completed_date: "",
    notes: "",
  }));

  assertRolesUsed(id, rows.flatMap((r) => [r.owner_role, r.reviewer_role]));

  const byId = new Map(rows.map((r) => [r.task_id, r]));
  let lastDay = 0;
  for (const row of rows) {
    if (!CATEGORIES.includes(row.category)) {
      throw new Error(`${id}: ${row.task_id} has category "${row.category}", which is not in the vocabulary`);
    }
    if (!/^D\+[1-5]$/.test(row.close_day)) {
      throw new Error(`${id}: ${row.task_id} has close_day "${row.close_day}", expected D+1 to D+5`);
    }
    if (dayNumber(row.close_day) < lastDay) {
      throw new Error(`${id}: ${row.task_id} goes backwards in the close`);
    }
    lastDay = dayNumber(row.close_day);
    if (row.owner_role === row.reviewer_role) {
      throw new Error(`${id}: ${row.task_id} is owned and reviewed by the same role`);
    }
    if (row.depends_on !== "") {
      const parent = byId.get(row.depends_on);
      if (!parent) throw new Error(`${id}: ${row.task_id} depends on ${row.depends_on}, which is not a task`);
      if (parent.task_id >= row.task_id) {
        throw new Error(`${id}: ${row.task_id} depends on ${row.depends_on}, which does not come earlier`);
      }
      if (dayNumber(parent.close_day) > dayNumber(row.close_day)) {
        throw new Error(`${id}: ${row.task_id} depends on a task scheduled later in the close`);
      }
    }
  }
  for (const category of CATEGORIES) {
    if (!rows.some((r) => r.category === category)) throw new Error(`${id}: no task in category "${category}"`);
  }

  return rows;
}

export function generate() {
  return [{ path: "close-checklist-template.csv", content: toCsv(COLUMNS, buildCloseChecklistTemplate()) }];
}

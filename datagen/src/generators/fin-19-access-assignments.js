// FIN-19 user-access-role-assignments: the finance system access list the
// SOX controls monitor reviews, alongside FIN-18's control matrix.
//
// The whole point of this file is that nothing in it is drawn. Every grant is
// computed from one CORE-04 column, `finance_system_role`, by the mapping
// published below, so a roster change lands here instead of being quietly
// outvoted by a seeded draw. That is also what makes the planted segregation of
// duties real rather than decorative: the roster already carries exactly one
// comma-valued cell ("AP Clerk, Payment Approver"), and applying the mapping to
// it is the only thing that produces a user who can both prepare and release.
//
// Two mapping choices are load bearing, and both are deliberate:
//
//   1. The mapping reads `finance_system_role` and never `role_title`. A job
//      title is not an entitlement. Inferring a preparer right from a title
//      would put eight further roster rows in conflict (people who hold an
//      approver entitlement under a preparer title) and the one plant would
//      become nine findings with no way to rank them.
//   2. je_entry with gl_account_maintain is not a toxic pair. A GL
//      administrator posting entries and maintaining the chart is ordinary
//      privileged access, not a preparer/releaser conflict. Treating it as
//      toxic would turn every GL Admin into an exception.
//
// The toxic pair is therefore a predicate over two columns, not a hand written
// list: at least one entitlement of class create or modify, together with at
// least one of class approve or release.
import { toCsv } from "../csv.js";
import { addDays, isWeekend, rollForwardPastWeekend } from "../dates.js";
import { createRng } from "../seed.js";
import { financeRoster } from "./finance-roles.js";

export const id = "FIN-19";

export const COLUMNS = [
  "assignment_id", "employee_id", "employee_name", "department", "role_title",
  "system", "entitlement", "entitlement_class", "granted_date",
  "granted_by_employee_id", "last_review_date", "last_used_date",
];

/**
 * The published mapping: one CORE-04 `finance_system_role` value to the grants
 * it yields, in order, as [system, entitlement, entitlement_class]. A
 * comma-valued cell yields the union of its parts, in cell order.
 *
 * This table is the contract. FIN-19's test carries its own literal copy and
 * asserts both that it still equals this one and that the emitted rows
 * recompute from CORE-04 under that copy, so a silent edit here is a red test
 * rather than a quietly different dataset.
 */
export const ROLE_ENTITLEMENTS = {
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

/** The prior quarterly access review. The next one is close task CLS-21, at D+5. */
export const LAST_REVIEW_DATE = "2026-01-07";

/** The close status as-of the whole of cluster 2 is dated at: D+4. */
export const AS_OF = "2026-04-06";

/** Usage is observed over the three weeks of business days up to the as-of. */
export const USAGE_WINDOW_START = "2026-03-16";

const PREPARER_CLASSES = new Set(["create", "modify"]);
const RELEASER_CLASSES = new Set(["approve", "release"]);

/** The roles a `finance_system_role` cell names, in cell order. */
function rolesIn(cell) {
  return cell.split(",").map((part) => part.trim()).filter((part) => part.length > 0);
}

/** Business days in [USAGE_WINDOW_START, AS_OF], the window a grant can last have been used in. */
function usageDays() {
  const days = [];
  for (let day = USAGE_WINDOW_START; day <= AS_OF; day = addDays(day, 1)) {
    if (!isWeekend(day)) days.push(day);
  }
  return days;
}

/**
 * The access list as row objects keyed by COLUMNS, derived end to end from
 * CORE-04. Pure: no I/O, no Date.now, one seeded stream for the usage dates,
 * which are the only field the roster cannot supply.
 * @returns {object[]}
 */
export function buildAccessAssignments() {
  const roster = financeRoster();
  const entitled = roster.filter(
    (r) => r.department === "Finance" && r.employment_status === "active" && r.finance_system_role !== ""
  );
  if (entitled.length === 0) {
    throw new Error(`${id}: no active Finance employee carries a finance_system_role`);
  }

  const usageRng = createRng(id, "usage");
  const days = usageDays();
  if (days.length < 10) throw new Error(`${id}: the usage window holds only ${days.length} business days`);

  const rows = [];
  for (const person of [...entitled].sort((a, b) => a.employee_id.localeCompare(b.employee_id))) {
    const roles = rolesIn(person.finance_system_role);
    for (const [roleIndex, role] of roles.entries()) {
      const grants = ROLE_ENTITLEMENTS[role];
      if (!grants) {
        throw new Error(`${id}: the roster names finance_system_role "${role}", which the mapping does not cover`);
      }
      // A second role in one cell is access that accreted a year on rather than
      // a package handed over on the hire date.
      const grantedDate = rollForwardPastWeekend(addDays(person.start_date, 365 * roleIndex));
      for (const [system, entitlement, entitlementClass] of grants) {
        rows.push({
          assignment_id: "",
          employee_id: person.employee_id,
          employee_name: `${person.first_name} ${person.last_name}`,
          department: person.department,
          role_title: person.role_title,
          system,
          entitlement,
          entitlement_class: entitlementClass,
          granted_date: grantedDate,
          granted_by_employee_id: person.manager_employee_id,
          last_review_date: LAST_REVIEW_DATE,
          last_used_date: usageRng.pick(days),
        });
      }
    }
  }

  rows.forEach((row, i) => { row.assignment_id = `UAR-${String(i + 1).padStart(4, "0")}`; });

  assertPostConditions(rows, roster, entitled);
  return rows;
}

/**
 * Re-derive every claim the spec makes from the emitted rows, the way the public
 * test does, and throw if one of them has stopped holding. A plant that is no
 * longer derivable is a build failure, not a data quirk.
 */
function assertPostConditions(rows, roster, entitled) {
  const byId = new Map(roster.map((r) => [r.employee_id, r]));

  const holders = new Map();
  for (const row of rows) {
    const person = byId.get(row.employee_id);
    if (!person) throw new Error(`${id}: ${row.assignment_id} names ${row.employee_id}, who is not on the roster`);
    if (person.employment_status !== "active") throw new Error(`${id}: ${row.employee_id} has left`);
    if (person.department !== "Finance") throw new Error(`${id}: ${row.employee_id} is not in Finance`);
    if (row.granted_by_employee_id === row.employee_id) {
      throw new Error(`${id}: ${row.assignment_id} was granted by its own holder`);
    }
    if (row.granted_date > row.last_used_date) {
      throw new Error(`${id}: ${row.assignment_id} was used before it was granted`);
    }
    if (row.last_review_date !== LAST_REVIEW_DATE) throw new Error(`${id}: ${row.assignment_id} last_review_date`);
    if (!holders.has(row.employee_id)) holders.set(row.employee_id, []);
    holders.get(row.employee_id).push(row.entitlement_class);
  }

  if (holders.size !== entitled.length) {
    throw new Error(`${id}: ${holders.size} users on the list, ${entitled.length} entitled roster rows`);
  }
  const expectedRows = entitled.reduce(
    (sum, person) => sum + rolesIn(person.finance_system_role).reduce((n, role) => n + ROLE_ENTITLEMENTS[role].length, 0),
    0
  );
  if (rows.length !== expectedRows) {
    throw new Error(`${id}: emitted ${rows.length} grants, the mapping yields ${expectedRows}`);
  }

  const conflicted = [...holders].filter(([, classes]) =>
    classes.some((c) => PREPARER_CLASSES.has(c)) && classes.some((c) => RELEASER_CLASSES.has(c))
  );
  if (conflicted.length !== 1) {
    throw new Error(`${id}: the toxic pair resolves to ${conflicted.length} users, expected 1`);
  }
  if (rolesIn(byId.get(conflicted[0][0]).finance_system_role).length < 2) {
    throw new Error(`${id}: the conflict must come from the roster's own comma-valued cell`);
  }

  // No single grant may be the oldest by itself: a lone dormant account would
  // read as a second plant, and this file plants only the one conflict.
  const oldest = rows.map((r) => r.last_used_date).sort()[0];
  const atOldest = rows.filter((r) => r.last_used_date === oldest).length;
  if (atOldest < 2) throw new Error(`${id}: one grant alone sits at the oldest last_used_date`);
  if (new Set(rows.map((r) => r.last_used_date)).size < 10) {
    throw new Error(`${id}: usage is stacked on too few days to read as usage`);
  }
}

export function generate() {
  return [{
    path: "user-access-role-assignments.csv",
    content: toCsv(COLUMNS, buildAccessAssignments()),
  }];
}

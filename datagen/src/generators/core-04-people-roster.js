// CORE-04 people-roster: employees, managers, departments, roles, start
// dates for co-002 (~600-person B2B software company per canon). Planted
// features: fictional names only; source roster for finance role
// assignments (SoD surface); source of speaker names for ops transcripts.
import { toCsv } from "../csv.js";
import { drawUniqueNames } from "../namePool.js";
import { ANCHOR_DATE, addDays } from "../dates.js";

export const id = "CORE-04";

const HEADCOUNT = 600;

// weight = share of headcount; financeRoles marks departments that get a
// finance_system_role column populated (the SoD surface).
const DEPARTMENTS = [
  { name: "Engineering", weight: 0.32, roleTitles: ["Software Engineer", "Senior Software Engineer", "Staff Engineer", "QA Engineer", "Site Reliability Engineer"] },
  { name: "Product", weight: 0.08, roleTitles: ["Product Manager", "Senior Product Manager", "Product Analyst"] },
  { name: "Sales", weight: 0.18, roleTitles: ["Account Executive", "Sales Development Rep", "Enterprise Account Executive", "Sales Engineer"] },
  { name: "Marketing", weight: 0.07, roleTitles: ["Marketing Manager", "Content Marketer", "Demand Generation Specialist"] },
  { name: "Customer Success", weight: 0.12, roleTitles: ["Customer Success Manager", "Support Engineer", "Onboarding Specialist"] },
  { name: "Finance", weight: 0.06, roleTitles: ["AP Clerk", "AR Clerk", "Staff Accountant", "FP&A Analyst", "Controller"], financeRoles: true },
  { name: "People", weight: 0.05, roleTitles: ["HR Business Partner", "Recruiter", "People Operations Specialist"] },
  { name: "Legal", weight: 0.02, roleTitles: ["Corporate Counsel", "Contracts Manager"] },
  { name: "IT & Security", weight: 0.05, roleTitles: ["IT Administrator", "Security Engineer"] },
  { name: "Operations", weight: 0.05, roleTitles: ["Program Manager", "Operations Analyst"] },
];

const FINANCE_SYSTEM_ROLES = ["AP Clerk", "AP Approver", "GL Admin", "Payment Approver", "AR Clerk", "Read Only"];

/**
 * Build the full deterministic roster as structured rows (not yet CSV text).
 * Exported so other generators (e.g. CORE-03's CRM seed) can reuse the exact
 * same deterministic roster instead of re-deriving names independently --
 * that is how cross-track joins stay consistent per canon's ground rules.
 *
 * @param {import("../seed.js").Rng} rng bound to CORE-04 (or a caller's own stream)
 * @returns {object[]} employee rows
 */
export function buildRoster(rng) {
  const names = drawUniqueNames(rng, HEADCOUNT);
  const rows = [];
  let seq = 0;
  const nextEmployeeId = () => {
    seq += 1;
    return `EMP-${String(seq).padStart(4, "0")}`;
  };

  // Executive layer: one CEO, one VP per department.
  const ceoName = names[0];
  const ceoId = nextEmployeeId();
  rows.push({
    employee_id: ceoId,
    first_name: ceoName.firstName,
    last_name: ceoName.lastName,
    department: "Executive",
    role_title: "Chief Executive Officer",
    level: "Executive",
    manager_employee_id: "",
    start_date: addDays(ANCHOR_DATE, -rng.int(365 * 5, 365 * 8)),
    employment_status: "active",
    finance_system_role: "",
    email: emailFor(ceoName, ceoId),
  });

  let nameCursor = 1;
  // 1 name consumed per department for its VP, on top of the department's
  // own IC/manager/director headcount -- reserve for that up front so the
  // name pool (exactly HEADCOUNT names) is never over-drawn.
  const remaining = HEADCOUNT - 1 - DEPARTMENTS.length;
  const deptCounts = DEPARTMENTS.map((d) => Math.max(3, Math.round(d.weight * remaining)));
  // Reconcile rounding drift against the exact remaining headcount.
  let drift = remaining - deptCounts.reduce((a, b) => a + b, 0);
  let di = 0;
  while (drift !== 0) {
    deptCounts[di % deptCounts.length] += drift > 0 ? 1 : -1;
    drift += drift > 0 ? -1 : 1;
    di += 1;
  }

  for (const [deptIndex, dept] of DEPARTMENTS.entries()) {
    const count = deptCounts[deptIndex];
    const vpName = names[nameCursor++];
    const vpId = nextEmployeeId();
    rows.push({
      employee_id: vpId,
      first_name: vpName.firstName,
      last_name: vpName.lastName,
      department: dept.name,
      role_title: `VP, ${dept.name}`,
      level: "VP",
      manager_employee_id: ceoId,
      start_date: addDays(ANCHOR_DATE, -rng.int(365 * 3, 365 * 7)),
      employment_status: "active",
      finance_system_role: dept.financeRoles ? "Read Only" : "",
      email: emailFor(vpName, vpId),
    });

    const directorCount = Math.max(1, Math.round(count * 0.06));
    const managerCount = Math.max(1, Math.round(count * 0.15));
    const directorIds = [];
    const managerIds = [];
    let placed = 0;

    for (let i = 0; i < directorCount && placed < count; i++) {
      const n = names[nameCursor++];
      const eid = nextEmployeeId();
      directorIds.push(eid);
      rows.push(employeeRow({ n, eid, dept, level: "Director", roleTitle: `Director, ${dept.name}`, managerId: vpId, rng }));
      placed++;
    }
    for (let i = 0; i < managerCount && placed < count; i++) {
      const n = names[nameCursor++];
      const eid = nextEmployeeId();
      managerIds.push(eid);
      const managerOf = rng.pick(directorIds);
      rows.push(employeeRow({ n, eid, dept, level: "Manager", roleTitle: `${dept.name} Manager`, managerId: managerOf, rng }));
      placed++;
    }
    while (placed < count) {
      const n = names[nameCursor++];
      const eid = nextEmployeeId();
      const managerOf = managerIds.length > 0 ? rng.pick(managerIds) : vpId;
      const roleTitle = rng.pick(dept.roleTitles);
      const row = employeeRow({ n, eid, dept, level: "IC", roleTitle, managerId: managerOf, rng });
      // Finance-system SoD surface: give finance ICs a single system role,
      // except one deliberately-planted conflicting dual-role record.
      if (dept.financeRoles) {
        row.finance_system_role = rng.pick(FINANCE_SYSTEM_ROLES);
      }
      rows.push(row);
      placed++;
    }
  }

  // Plant exactly one SoD conflict: an AP Clerk who is also a Payment
  // Approver (classic segregation-of-duties violation) on a Finance IC.
  const financeIcs = rows.filter((r) => r.department === "Finance" && r.level === "IC");
  if (financeIcs.length > 0) {
    const target = rng.pick(financeIcs);
    target.finance_system_role = "AP Clerk, Payment Approver";
  }

  // Plant a small departed cohort (used by CORE-03's "departed-rep owner"
  // stale-record feature and generally for realism).
  const departedCount = Math.max(3, Math.round(HEADCOUNT * 0.03));
  const nonExecRows = rows.filter((r) => r.level !== "Executive" && r.level !== "VP");
  for (let i = 0; i < departedCount; i++) {
    const target = rng.pick(nonExecRows);
    target.employment_status = "departed";
  }

  return rows;
}

function employeeRow({ n, eid, dept, level, roleTitle, managerId, rng }) {
  return {
    employee_id: eid,
    first_name: n.firstName,
    last_name: n.lastName,
    department: dept.name,
    role_title: roleTitle,
    level,
    manager_employee_id: managerId,
    start_date: addDays(ANCHOR_DATE, -rng.int(30, 365 * 6)),
    employment_status: "active",
    finance_system_role: "",
    email: emailFor(n, eid),
  };
}

function emailFor(n, employeeId) {
  return `${n.firstName.toLowerCase()}.${n.lastName.toLowerCase()}.${employeeId.toLowerCase()}@co002.example`;
}

const COLUMNS = [
  "employee_id",
  "first_name",
  "last_name",
  "department",
  "role_title",
  "level",
  "manager_employee_id",
  "start_date",
  "employment_status",
  "finance_system_role",
  "email",
];

export function generate({ rng }) {
  const roster = buildRoster(rng("roster"));
  return [
    {
      path: "people-roster.csv",
      content: toCsv(COLUMNS, roster),
    },
  ];
}

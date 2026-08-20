// FIN-18 control-matrix: the SOX control population co-002 tests, and the file
// module 20 monitors alongside FIN-19's access list.
//
// The 26 controls are a static table, the FIN-39 precedent: a control universe
// is written down by a control owner, not drawn. What is seeded is which row
// carries each of the two planted defects, and each carrier is picked out of a
// population defined by a rule rather than named here:
//
//   Q14 one control past its testing due date. Population: the quarterly
//       controls left untested this cycle, excluding the access review, whose
//       due date is fixed to the close (see below). The carrier's last test is
//       pulled back so its own frequency lands the next due date before the
//       as-of. Every other row in the file is due after the as-of, so the
//       finding survives a reader who writes the rule without the result
//       clause.
//   Q15 one control that passed with nothing in the evidence binder.
//       Population: the key controls that passed. Binder locators are numbered
//       after the plant is applied, so the gap leaves no hole in the sequence
//       to spot it by.
//
// Joins, all of them outward and none of them retyped here: `evidence_artifact`
// is a spec id the pack ships, `related_decision_id` is a control_id in the
// shipped FIN-39 matrix, owners and testers are CORE-04 rows, and the access
// review is dated off `closeDayDate()` and FIN-19's own last review date, so
// the control, the checklist task CLS-21 and the access list cannot drift.
//
// Owners and testers are two disjoint populations, both derived from the
// roster: an owner runs the process, so an owner holds a finance system
// entitlement; a tester holds none at all, which is what makes the test
// independent of the system it tests. Neither is ever the roster's own
// segregation-of-duties row, which is found by rule (the one comma-valued
// finance_system_role cell) rather than by employee id.
import { toCsv } from "../csv.js";
import { closeDayDate } from "../dates.js";
import { createRng } from "../seed.js";
import { financeRoster, ROLE_LADDER } from "./finance-roles.js";
import { buildDecisionAuthorityMatrix } from "./fin-39-decision-authority-matrix.js";
import { LAST_REVIEW_DATE } from "./fin-19-access-assignments.js";

export const id = "FIN-18";

export const COLUMNS = [
  "control_id", "control_name", "process", "control_objective", "control_type",
  "frequency", "key_control", "owner_role", "owner_employee_id",
  "tester_employee_id", "last_tested_date", "next_due_date", "test_result",
  "exceptions_noted", "evidence_artifact", "evidence_reference", "related_decision_id",
];

export const PROCESSES = ["order_to_cash", "procure_to_pay", "close", "access", "treasury"];
export const CONTROL_TYPES = ["preventive", "detective"];
export const TEST_RESULTS = ["pass", "exception", "not_tested"];

/** How far a frequency carries a control before it is due again, in months. */
export const FREQUENCY_MONTHS = { monthly: 1, quarterly: 3, annual: 12 };

/** The close status as-of for the whole of cluster 2: D+4 of the March 2026 close. */
export const AS_OF = "2026-04-06";

/** The next due date the one overdue control lands on: four days before the as-of. */
const OVERDUE_NEXT_DUE = "2026-04-02";

// [process, control_name, control_objective, control_type, frequency,
//  owner_role, last_tested_date, test_result, exceptions_noted, evidence_artifact,
//  related_decision_id]
//
// Every last_tested_date sits on the 28th or earlier, so advancing it by whole
// months never needs a month-end clamp and the arithmetic a reader does by hand
// is the arithmetic this file did.
const CONTROLS = [
  ["order_to_cash", "Customer credit limit review before order release", "An order is released only within the credit limit held for that customer", "preventive", "quarterly", "AR Clerk", "2026-02-10", "pass", 0, "FIN-04", ""],
  ["order_to_cash", "Billing to the approved price list", "Every invoice is raised from the price list approved for that contract", "preventive", "monthly", "AR Clerk", "2026-03-11", "pass", 0, "FIN-04", ""],
  ["order_to_cash", "Cash application within two business days", "A receipt is applied to the paying customer within two business days", "detective", "monthly", "AR Clerk", "2026-03-12", "exception", 2, "FIN-02", ""],
  ["order_to_cash", "Approval of receivable write offs", "A receivable is written off only with approval at the delegated level", "preventive", "quarterly", "Controller", "2026-01-14", "pass", 0, "FIN-04", "DA-12"],
  ["order_to_cash", "Aging agreed to the control account", "The receivable aging agrees to the ledger control account every period", "detective", "monthly", "AR Clerk", "2026-03-13", "pass", 0, "FIN-05", ""],
  ["procure_to_pay", "Purchase order approval before commitment", "No commitment reaches a supplier before the order is approved in its band", "preventive", "monthly", "AP Clerk", "2026-03-09", "pass", 0, "FIN-10", "DA-10"],
  ["procure_to_pay", "Three way match before payment", "An invoice is paid only where it matches its order and its receipt", "preventive", "monthly", "AP Clerk", "2026-03-10", "exception", 4, "FIN-07", ""],
  ["procure_to_pay", "Vendor master change applied by a second person", "The person who requests a vendor master change never applies it", "preventive", "quarterly", "Controller", "2026-01-20", "pass", 0, "FIN-06", "DA-14"],
  ["procure_to_pay", "Duplicate invoice number blocked at entry", "An invoice number already held for that supplier cannot be entered again", "detective", "monthly", "AP Clerk", "2026-03-16", "exception", 1, "FIN-07", ""],
  ["procure_to_pay", "Accrual for goods and services received not invoiced", "Goods and services received before period end are accrued in that period", "detective", "quarterly", "Staff Accountant", "2026-02-11", "not_tested", null, "FIN-09", ""],
  ["procure_to_pay", "Call back on a vendor bank detail change", "A change to supplier bank details is confirmed by call back to a known contact", "preventive", "quarterly", "Controller", "2026-02-12", "pass", 0, "FIN-11", "DA-16"],
  ["close", "Preparer and approver of an entry are different people", "No person both prepares and approves the same journal entry", "preventive", "monthly", "Controller", "2026-03-17", "pass", 0, "FIN-09", "DA-17"],
  ["close", "Supporting evidence attached to every entry", "Every entry in the close batch carries the document that supports it", "detective", "monthly", "Staff Accountant", "2026-03-18", "exception", 1, "FIN-09", "DA-17"],
  ["close", "Balance sheet reconciliations prepared and reviewed", "Every balance sheet account is reconciled and reviewed before the close is approved", "detective", "monthly", "Staff Accountant", "2026-03-19", "pass", 0, "FIN-05", ""],
  ["close", "Bank reconciliation within three business days of period end", "The operating account is reconciled to the cash ledger within three business days", "detective", "monthly", "Staff Accountant", "2026-03-20", "pass", 0, "FIN-01", ""],
  ["close", "Period locked once the close is approved", "The period is closed to new postings as soon as the close is approved", "preventive", "monthly", "Controller", "2026-03-23", "pass", 0, "FIN-05", "DA-19"],
  ["close", "Written explanation for a manual adjustment above the threshold", "A manual adjustment above the reporting threshold carries a written explanation", "detective", "quarterly", "FP&A Analyst", "2026-02-17", "not_tested", null, "FIN-09", ""],
  ["access", "Quarterly review of the finance system access list", "Finance system access is compared against current roles every quarter", "detective", "quarterly", "Controller", LAST_REVIEW_DATE, "not_tested", null, "FIN-19", ""],
  ["access", "Approval before finance system access is granted", "New access to a finance system is approved by its owner before it is granted", "preventive", "quarterly", "Controller", "2026-02-18", "pass", 0, "CORE-04", ""],
  ["access", "Posting access restricted to named administrators", "The right to post journal entries is held only by named administrators", "preventive", "quarterly", "Controller", "2026-02-19", "pass", 0, "FIN-19", ""],
  ["access", "Recorded approval before finance data leaves the approved environment", "Finance data reaches an outside processor only with recorded approval", "preventive", "annual", "VP, Finance", "2025-09-15", "not_tested", null, "FIN-39", "DA-15"],
  ["treasury", "Dual approval before a payment run is released", "A payment run reaches the bank only after two approvals are recorded", "preventive", "monthly", "Controller", "2026-03-24", "pass", 0, "FIN-08", "DA-18"],
  ["treasury", "Payment only to bank details held on the vendor master", "A payment is made only to the bank details held on the approved vendor master", "preventive", "monthly", "AP Clerk", "2026-03-25", "pass", 0, "FIN-08", "DA-16"],
  ["treasury", "Review and void of stale outstanding checks", "A check outstanding past the stale date is reviewed and voided", "detective", "quarterly", "Staff Accountant", "2026-02-20", "not_tested", null, "FIN-03", ""],
  ["treasury", "Bank signatories confirmed against the authority schedule", "The bank signatory list agrees to the delegated authority schedule", "preventive", "annual", "VP, Finance", "2025-08-20", "not_tested", null, "FIN-39", ""],
  ["treasury", "Weekly cash position reporting", "The cash position is reported to the treasury owner every week", "detective", "monthly", "FP&A Analyst", "2026-03-26", "pass", 0, "FIN-02", ""],
];

/**
 * Advance an ISO date by whole months. Local to this file rather than added to
 * dates.js on purpose: month arithmetic needs a month-end rule (what is one
 * month after the 31st?) and this file needs no such rule, because every date it
 * carries sits on the 28th or earlier. Publishing half a rule in the shared
 * module would invite a caller to rely on the half that is missing.
 */
function addMonths(isoDate, months) {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (day > 28) throw new Error(`${id}: ${isoDate} is past the 28th, where month arithmetic needs a clamp rule`);
  const zeroBased = year * 12 + (month - 1) + months;
  return [
    String(Math.floor(zeroBased / 12)).padStart(4, "0"),
    String((zeroBased % 12) + 1).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

/** The roster row carrying the planted segregation-of-duties conflict, by rule. */
function sodConflictRow(roster) {
  const conflicted = roster.filter(
    (r) => r.department === "Finance" && r.employment_status === "active" && r.finance_system_role.includes(",")
  );
  if (conflicted.length !== 1) {
    throw new Error(`${id}: CORE-04 carries ${conflicted.length} comma-valued finance_system_role cells, expected 1`);
  }
  return conflicted[0];
}

/**
 * The control matrix as row objects keyed by COLUMNS. Pure: no I/O, no
 * Date.now, one seeded stream for the two plant carriers.
 * @returns {object[]}
 */
export function buildControlMatrix() {
  const roster = financeRoster();
  const conflicted = sodConflictRow(roster);
  const financeActive = roster.filter((r) => r.department === "Finance" && r.employment_status === "active");

  // Owners run the process, so they hold access to it. Testers hold none, which
  // is the independence the control matrix relies on.
  const ownerPool = financeActive.filter(
    (r) => r.finance_system_role !== "" && r.employee_id !== conflicted.employee_id
  );
  const testerPool = financeActive
    .filter((r) => r.finance_system_role === "" && r.employee_id !== conflicted.employee_id)
    .map((r) => r.employee_id)
    .sort();
  if (testerPool.length < 3) {
    throw new Error(`${id}: only ${testerPool.length} Finance employees hold no entitlement, too few to test independently`);
  }

  const ownerCursor = new Map();
  const nextOwner = (roleTitle) => {
    if (!ROLE_LADDER.includes(roleTitle)) throw new Error(`${id}: "${roleTitle}" is not on the finance role ladder`);
    const holders = ownerPool.filter((r) => r.role_title === roleTitle).map((r) => r.employee_id).sort();
    if (holders.length === 0) throw new Error(`${id}: no entitled active Finance employee holds "${roleTitle}"`);
    const cursor = ownerCursor.get(roleTitle) ?? 0;
    ownerCursor.set(roleTitle, cursor + 1);
    return holders[cursor % holders.length];
  };

  const rows = CONTROLS.map((entry, index) => {
    const [
      process, control_name, control_objective, control_type, frequency,
      owner_role, last_tested_date, test_result, exceptions, evidence_artifact,
      related_decision_id,
    ] = entry;
    return {
      control_id: `CTL-${String(index + 1).padStart(3, "0")}`,
      control_name,
      process,
      control_objective,
      control_type,
      frequency,
      key_control: related_decision_id === "" ? "false" : "true",
      owner_role,
      owner_employee_id: nextOwner(owner_role),
      tester_employee_id: testerPool[index % testerPool.length],
      last_tested_date,
      next_due_date: addMonths(last_tested_date, FREQUENCY_MONTHS[frequency]),
      test_result,
      exceptions_noted: test_result === "not_tested" ? "" : String(exceptions),
      evidence_artifact,
      evidence_reference: "",
      related_decision_id,
    };
  });

  const plantRng = createRng(id, "plants");

  // Q14: the one control past its testing due date. Its population is the
  // quarterly controls left untested this cycle, less the access review, whose
  // due date belongs to the close rather than to this file.
  const accessReviewDue = closeDayDate("D+5");
  const overduePopulation = rows.filter(
    (r) => r.test_result === "not_tested" && r.frequency === "quarterly" && r.next_due_date !== accessReviewDue
  );
  if (overduePopulation.length < 3) {
    throw new Error(`${id}: Q14 needs a population to pick from, found ${overduePopulation.length} rows`);
  }
  const overdue = plantRng.pick(overduePopulation);
  overdue.last_tested_date = addMonths(OVERDUE_NEXT_DUE, -FREQUENCY_MONTHS[overdue.frequency]);
  overdue.next_due_date = OVERDUE_NEXT_DUE;

  // Q15: the one tested control that passed with nothing in the binder. Its
  // population is the key controls that passed, so the gap sits where it costs
  // the most rather than on a housekeeping control.
  const unsupportedPopulation = rows.filter((r) => r.test_result === "pass" && r.key_control === "true");
  if (unsupportedPopulation.length < 3) {
    throw new Error(`${id}: Q15 needs a population to pick from, found ${unsupportedPopulation.length} rows`);
  }
  const unsupported = plantRng.pick(unsupportedPopulation);

  // Locators are numbered after the plant, in file order, so the sequence runs
  // unbroken and the missing evidence leaves no numbering hole behind it.
  let locator = 0;
  for (const row of rows) {
    if (row.test_result === "not_tested" || row === unsupported) continue;
    locator += 1;
    row.evidence_reference = `EVB-2026Q1-${String(locator).padStart(3, "0")}`;
  }

  assertPostConditions(rows, roster, conflicted, accessReviewDue);
  return rows;
}

/**
 * Re-derive every planted feature and every join from the emitted rows, the way
 * the public test does, and throw if one of them resolves to something other
 * than what the spec claims. The builder refuses to emit a file whose plants
 * have stopped being derivable.
 */
function assertPostConditions(rows, roster, conflicted, accessReviewDue) {
  const byId = new Map(roster.map((r) => [r.employee_id, r]));
  const decisions = new Set(buildDecisionAuthorityMatrix().map((r) => r.control_id));

  if (rows.length !== 26) throw new Error(`${id}: emitted ${rows.length} controls, expected 26`);
  if (new Set(rows.map((r) => r.control_name)).size !== rows.length) {
    throw new Error(`${id}: two controls share a name`);
  }
  for (const process of PROCESSES) {
    if (!rows.some((r) => r.process === process)) throw new Error(`${id}: no control covers ${process}`);
  }
  for (const frequency of Object.keys(FREQUENCY_MONTHS)) {
    if (!rows.some((r) => r.frequency === frequency)) throw new Error(`${id}: no ${frequency} control`);
  }

  for (const row of rows) {
    if (!PROCESSES.includes(row.process)) throw new Error(`${id}: ${row.control_id} process "${row.process}"`);
    if (!CONTROL_TYPES.includes(row.control_type)) throw new Error(`${id}: ${row.control_id} control_type`);
    if (!TEST_RESULTS.includes(row.test_result)) throw new Error(`${id}: ${row.control_id} test_result`);
    if (!(row.frequency in FREQUENCY_MONTHS)) throw new Error(`${id}: ${row.control_id} frequency`);
    if (row.next_due_date !== addMonths(row.last_tested_date, FREQUENCY_MONTHS[row.frequency])) {
      throw new Error(`${id}: ${row.control_id} is not due its own frequency past its last test`);
    }
    if (row.last_tested_date > row.next_due_date) throw new Error(`${id}: ${row.control_id} is due before it was tested`);
    if (row.key_control !== (row.related_decision_id === "" ? "false" : "true")) {
      throw new Error(`${id}: ${row.control_id} key_control does not follow its related decision`);
    }
    if (row.related_decision_id !== "" && !decisions.has(row.related_decision_id)) {
      throw new Error(`${id}: ${row.control_id} points at ${row.related_decision_id}, which FIN-39 does not carry`);
    }
    if (row.evidence_artifact === "") throw new Error(`${id}: ${row.control_id} names no evidence artifact`);
    if (row.test_result === "not_tested") {
      if (row.exceptions_noted !== "") throw new Error(`${id}: ${row.control_id} counts exceptions it never tested for`);
      if (row.evidence_reference !== "") throw new Error(`${id}: ${row.control_id} was not tested but has a locator`);
    } else if (row.test_result === "pass") {
      if (row.exceptions_noted !== "0") throw new Error(`${id}: ${row.control_id} passed with exceptions noted`);
    } else if (!(Number(row.exceptions_noted) > 0)) {
      throw new Error(`${id}: ${row.control_id} is an exception with none noted`);
    }

    const owner = byId.get(row.owner_employee_id);
    const tester = byId.get(row.tester_employee_id);
    if (!owner || !tester) throw new Error(`${id}: ${row.control_id} names someone off the roster`);
    if (owner.employee_id === tester.employee_id) throw new Error(`${id}: ${row.control_id} owns and tests itself`);
    if (owner.role_title !== row.owner_role) throw new Error(`${id}: ${row.control_id} owner does not hold owner_role`);
    if (owner.finance_system_role === "") throw new Error(`${id}: ${row.control_id} owner holds no access to its own process`);
    if (tester.finance_system_role !== "") throw new Error(`${id}: ${row.control_id} tester holds access to what it tests`);
    for (const person of [owner, tester]) {
      if (person.department !== "Finance" || person.employment_status !== "active") {
        throw new Error(`${id}: ${row.control_id} names ${person.employee_id}, who is not an active Finance employee`);
      }
      if (person.employee_id === conflicted.employee_id) {
        throw new Error(`${id}: ${row.control_id} names the roster's own segregation-of-duties row`);
      }
    }
  }

  const overdue = rows.filter((r) => r.next_due_date < AS_OF);
  if (overdue.length !== 1) throw new Error(`${id}: Q14 resolves to ${overdue.length} late controls, expected 1`);
  if (overdue[0].test_result !== "not_tested") throw new Error(`${id}: the late control was tested after all`);

  const review = rows.filter((r) => r.process === "access" && r.frequency === "quarterly" && r.test_result === "not_tested");
  if (review.length !== 1) throw new Error(`${id}: ${review.length} access reviews are open, expected 1`);
  if (review[0].next_due_date !== accessReviewDue) throw new Error(`${id}: the access review is not due at D+5`);
  if (review[0].last_tested_date !== LAST_REVIEW_DATE) {
    throw new Error(`${id}: the access review's last test is not the access list's own last review`);
  }

  const unsupported = rows.filter((r) => r.test_result === "pass" && r.evidence_reference === "");
  if (unsupported.length !== 1) throw new Error(`${id}: Q15 resolves to ${unsupported.length} rows, expected 1`);
  if (unsupported[0].key_control !== "true") throw new Error(`${id}: the unsupported pass is not a key control`);
  if (unsupported[0].control_id === overdue[0].control_id) throw new Error(`${id}: Q14 and Q15 landed on one row`);

  const locators = rows.map((r) => r.evidence_reference).filter((ref) => ref !== "");
  if (new Set(locators).size !== locators.length) throw new Error(`${id}: two controls share a binder locator`);
  locators.forEach((ref, i) => {
    if (ref !== `EVB-2026Q1-${String(i + 1).padStart(3, "0")}`) throw new Error(`${id}: binder locators run with a gap`);
  });
}

export function generate() {
  return [{ path: "control-matrix.csv", content: toCsv(COLUMNS, buildControlMatrix()) }];
}

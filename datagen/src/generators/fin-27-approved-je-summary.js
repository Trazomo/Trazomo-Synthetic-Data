// FIN-27 approved-je-summary: the entry-level roll-up of the FIN-09 close
// batch, which is what a close memo reports on. Derived, not drawn: 31 rows,
// one per FIN-09 entry_id, every figure recomputed from the shipped bytes.
// Nothing here is a draw, so this module takes no rng at all.
//
// FIN-27 is the ONLY cluster 3 and 4 artifact that reconciles to FIN-09.
// FIN-24 and FIN-25 reconcile to FIN-05, which does not reflect this batch.
// The entry ids are FIN-09's own JE-202603-CNNN block, carried through
// verbatim, so they cannot collide with the GL-202603-NNNN block FIN-25 mints.
//
// Two facts about the batch this file carries through rather than tidies away:
//   * eleven of the 31 entries are approved on 2026-04-04 or 2026-04-05, the
//     weekend inside the close window. The close is dated in business days;
//     the approvals were not. The count is asserted, never assumed to be zero.
//   * one entry posts to account 6125, which the FIN-22 chart carries as
//     inactive. That is FIN-09's own shipped plant and it survives the roll-up.
//
// memo_disclosure_class is assigned by rule over FIN-09's own columns, never by
// hand, and the rule is ordered: the finding wins over the entry type.
//
//   unsupported  no source document on any line AND an entry_type that is not
//                one of the internal schedules. That population qualifier is
//                load bearing: the v1.4.1 CHANGELOG made citing nothing the
//                RULE for a depreciation or amortization entry whose asset
//                class the universe never bought, so the two internal blanks
//                are the rule rather than a finding. The count is 1 under the
//                population and 3 without it.
//   judgemental  an entry whose amount is management's own estimate or
//                allocation rather than a third party's document: accrual,
//                depreciation, amortization, allocation.
//   routine      everything else, which is the mechanical half of the batch:
//                the reversals of last month's estimates and the reclass.
//
// Rule R-CLS17 binds this file the same way it binds FIN-24. FIN-27 states
// FILE facts about the close checklist and never states that close work was or
// was not performed: supports_close_task names CLS-15, the task that posts the
// batch, and says nothing at all about CLS-17.
import { toCsv } from "../csv.js";
import { isWeekend } from "../dates.js";
import { cents, toCents } from "../money.js";
import { APPROVAL_WINDOW, buildCloseBatch } from "./fin-09-je-batch.js";
import { buildChartOfAccounts } from "./fin-22-chart-of-accounts.js";
import { financeRoster } from "./finance-roles.js";

export const id = "FIN-27";

export const OUTPUT_FILE = "approved-je-summary.csv";

export const COLUMNS = [
  "entry_id", "posting_date", "approved_date", "entry_type", "line_count", "entry_total",
  "currency", "prepared_by_employee_id", "approved_by_employee_id", "distinct_accounts",
  "source_document_count", "supports_close_task", "memo_disclosure_class",
];

export const DISCLOSURE_CLASSES = ["routine", "judgemental", "unsupported"];

/** Entry types that carry no external document by design (the internal schedules). */
export const INTERNAL_SCHEDULE_TYPES = ["depreciation", "amortization"];

/** Entry types whose amount is an estimate or an allocation the company made itself. */
export const ESTIMATE_TYPES = ["accrual", "depreciation", "amortization", "allocation"];

/** The close task the batch posts under. */
export const SUPPORTS_CLOSE_TASK = "CLS-15";

/** The batch total every entry_total has to sum back to (FIN-09's own tie-out). */
export const BATCH_TOTAL = "1319977.89";

/** The two dates inside the approval window that are not business days. */
export const WEEKEND_APPROVAL_DATES = ["2026-04-04", "2026-04-05"];

/** What the two cardinalities of the no-support finding have to come back as. */
export const NO_SUPPORT_COUNTS = Object.freeze({ population: 1, qualifierFree: 3 });

/** How many of the 31 entries were approved on a day the close calendar does not count. */
export const WEEKEND_APPROVALS = 11;

/**
 * The disclosure class of one folded entry, by rule over FIN-09's own columns.
 * Ordered: an entry the memo cannot support is a finding whatever its type.
 */
export function disclosureClass({ entry_type, source_document_count }) {
  if (source_document_count === 0 && !INTERNAL_SCHEDULE_TYPES.includes(entry_type)) return "unsupported";
  if (ESTIMATE_TYPES.includes(entry_type)) return "judgemental";
  return "routine";
}

/** The one value a column carries across every line of an entry, or a throw. */
function single(lines, column, entryId) {
  const values = new Set(lines.map((line) => line[column]));
  if (values.size !== 1) {
    throw new Error(`${id}: ${entryId} carries ${values.size} values in ${column}, expected one`);
  }
  return [...values][0];
}

/**
 * FIN-09 folded to one record per entry_id, in the order the batch posts them.
 * Integer cents throughout; the 2dp string is written once, at the edge.
 */
function foldBatch(lines) {
  const byEntry = new Map();
  for (const line of lines) {
    if (!byEntry.has(line.entry_id)) byEntry.set(line.entry_id, []);
    byEntry.get(line.entry_id).push(line);
  }
  return [...byEntry.entries()].map(([entryId, entryLines]) => {
    const debitCents = entryLines.reduce((sum, l) => sum + (l.debit === "" ? 0 : toCents(l.debit)), 0);
    const creditCents = entryLines.reduce((sum, l) => sum + (l.credit === "" ? 0 : toCents(l.credit)), 0);
    if (debitCents !== creditCents) {
      throw new Error(`${id}: ${entryId} does not balance (${cents(debitCents)} against ${cents(creditCents)})`);
    }
    const accounts = [...new Set(entryLines.map((l) => l.gl_account))];
    const documents = [...new Set(entryLines.map((l) => l.source_document).filter((d) => d !== ""))];
    return {
      entry_id: entryId,
      posting_date: single(entryLines, "posting_date", entryId),
      approved_date: single(entryLines, "approved_date", entryId),
      entry_type: single(entryLines, "entry_type", entryId),
      currency: single(entryLines, "currency", entryId),
      prepared_by_employee_id: single(entryLines, "prepared_by", entryId),
      approved_by_employee_id: single(entryLines, "approved_by", entryId),
      line_count: entryLines.length,
      entry_total_cents: debitCents,
      accounts,
      documents,
      distinct_accounts: accounts.length,
      source_document_count: documents.length,
    };
  });
}

/**
 * Every plant, asserted from the folded batch. The public test re-derives each
 * one from the emitted bytes without importing anything here, so a rule that is
 * wrong in both places has to be wrong twice in the same way.
 */
function assertPlants(entries, { chart, roster }) {
  if (entries.length !== 31) {
    throw new Error(`${id}: ${entries.length} entries, expected 31 (one per FIN-09 entry_id)`);
  }
  const total = entries.reduce((sum, e) => sum + e.entry_total_cents, 0);
  if (cents(total) !== BATCH_TOTAL) {
    throw new Error(`${id}: the roll-up totals ${cents(total)}, expected the batch total ${BATCH_TOTAL}`);
  }

  // T-P4. The window is a fact of FIN-09; the weekend inside it is a count.
  const outside = entries.filter(
    (e) => e.approved_date < APPROVAL_WINDOW.start || e.approved_date > APPROVAL_WINDOW.end
  );
  if (outside.length !== 0) {
    throw new Error(
      `${id}: ${outside.length} entries are approved outside `
      + `${APPROVAL_WINDOW.start} to ${APPROVAL_WINDOW.end}`
    );
  }
  const weekend = entries.filter((e) => isWeekend(e.approved_date));
  if (weekend.length !== WEEKEND_APPROVALS) {
    throw new Error(`${id}: ${weekend.length} entries are approved on a weekend, expected ${WEEKEND_APPROVALS}`);
  }
  const unexpected = weekend.filter((e) => !WEEKEND_APPROVAL_DATES.includes(e.approved_date));
  if (unexpected.length !== 0) {
    throw new Error(`${id}: an approval lands on a weekend day outside ${WEEKEND_APPROVAL_DATES.join(" and ")}`);
  }

  // V11 and V12. One preparer, one approver, and they are never the same person.
  const preparers = new Set(entries.map((e) => e.prepared_by_employee_id));
  const approvers = new Set(entries.map((e) => e.approved_by_employee_id));
  if (preparers.size !== 1 || approvers.size !== 1) {
    throw new Error(`${id}: ${preparers.size} preparers and ${approvers.size} approvers, expected one of each`);
  }
  const selfApproved = entries.filter((e) => e.prepared_by_employee_id === e.approved_by_employee_id);
  if (selfApproved.length !== 0) {
    throw new Error(`${id}: ${selfApproved.length} entries were prepared and approved by the same person`);
  }
  const byEmployee = new Map(roster.map((r) => [r.employee_id, r]));
  for (const employeeId of [...preparers, ...approvers]) {
    const employee = byEmployee.get(employeeId);
    if (!employee || employee.employment_status !== "active" || employee.department !== "Finance") {
      throw new Error(`${id}: ${employeeId} is not an active CORE-04 Finance employee`);
    }
  }

  // V9, both cardinalities. The qualifier IS the population.
  const noDocuments = entries.filter((e) => e.source_document_count === 0);
  if (noDocuments.length !== NO_SUPPORT_COUNTS.qualifierFree) {
    throw new Error(
      `${id}: ${noDocuments.length} entries cite no document, expected ${NO_SUPPORT_COUNTS.qualifierFree}. `
      + "Two of them are the internal schedules, which cite nothing by the v1.4.1 rule and are not findings."
    );
  }
  const findings = noDocuments.filter((e) => !INTERNAL_SCHEDULE_TYPES.includes(e.entry_type));
  if (findings.length !== NO_SUPPORT_COUNTS.population) {
    throw new Error(
      `${id}: ${findings.length} entries carry no support inside the population a document is expected for, `
      + `expected ${NO_SUPPORT_COUNTS.population}`
    );
  }

  // T-P5. Every account is on the chart, and FIN-09's inactive-account plant
  // survives the roll-up rather than being tidied out of it.
  const byCode = new Map(chart.map((a) => [a.account_code, a]));
  const onInactive = [];
  for (const entry of entries) {
    for (const code of entry.accounts) {
      const account = byCode.get(code);
      if (!account) throw new Error(`${id}: ${entry.entry_id} posts to ${code}, which is not a FIN-22 account_code`);
      if (account.active !== "true") onInactive.push(entry.entry_id);
    }
  }
  if (new Set(onInactive).size !== 1) {
    throw new Error(
      `${id}: ${new Set(onInactive).size} entries post to an inactive account, expected 1. `
      + "FIN-09's own shipped plant did not survive the roll-up."
    );
  }

  // The disclosure rule covers the population exactly once, and the unsupported
  // class holds the one finding rather than all three no-document entries.
  const unknown = entries.filter((e) => !DISCLOSURE_CLASSES.includes(e.memo_disclosure_class));
  if (unknown.length !== 0) {
    throw new Error(`${id}: ${unknown.length} rows carry a class outside the published list`);
  }
  const unsupported = entries.filter((e) => e.memo_disclosure_class === "unsupported");
  if (unsupported.length !== NO_SUPPORT_COUNTS.population || unsupported[0].entry_id !== findings[0].entry_id) {
    throw new Error(`${id}: the unsupported class is not the one no-support finding`);
  }
}

// ------------------------------------------------------------------ builder

/**
 * The summary as row objects keyed by COLUMNS. Pure: no I/O, no Date.now, and
 * no draw of any kind. Every cell is one of FIN-09's own bytes or a count of
 * them.
 * @returns {object[]}
 */
export function buildApprovedJeSummary() {
  const { lines } = buildCloseBatch();
  const chart = buildChartOfAccounts();
  const roster = financeRoster();

  const entries = foldBatch(lines).map((entry) => ({
    ...entry,
    memo_disclosure_class: disclosureClass(entry),
  }));
  assertPlants(entries, { chart, roster });

  return entries.map((entry) => ({
    entry_id: entry.entry_id,
    posting_date: entry.posting_date,
    approved_date: entry.approved_date,
    entry_type: entry.entry_type,
    line_count: String(entry.line_count),
    entry_total: cents(entry.entry_total_cents),
    currency: entry.currency,
    prepared_by_employee_id: entry.prepared_by_employee_id,
    approved_by_employee_id: entry.approved_by_employee_id,
    distinct_accounts: String(entry.distinct_accounts),
    source_document_count: String(entry.source_document_count),
    supports_close_task: SUPPORTS_CLOSE_TASK,
    memo_disclosure_class: entry.memo_disclosure_class,
  }));
}

// ---------------------------------------------------------------- generate

export function generate() {
  return [{ path: OUTPUT_FILE, content: toCsv(COLUMNS, buildApprovedJeSummary()) }];
}

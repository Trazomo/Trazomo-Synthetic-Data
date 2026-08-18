// FIN-09 journal-entries-batch: the March 2026 close journal batch of co-002
// (Atticus Dundee Inc.). Accruals, accrual reversals, prepaid amortization,
// depreciation, one contractor-cost allocation, one prepaid reclass, and the
// five planted defects the reclass module teaches.
//
// This module deliberately does NOT import the procure-to-pay builder or the
// AR aging builder. FIN-05's trial balance is pre-close, so it must not depend
// on this batch, and keeping FIN-09 off those edges keeps the dependency graph
// shallow and acyclic. What FIN-09 needs from the rest of the universe is only
// the chart (FIN-22), the roster (CORE-04), and FIN-01's canon constants.
//
// source_document citations are drawn from the id blocks FIN-06, FIN-07 and
// FIN-11 mint in this same release (PO-2026-0101..0148, VINV-2026-0101..0172,
// BILL-2026-0101..0155) plus the two drafted contracts, so a citation resolves
// somewhere real without this file having to import those builders.
//
// Planted features (spec FIN-09, plan Section 2.3). Each is derivable by a
// selection rule over the data and carries no label:
//   P7  one line posts to the FIN-22 account the chart carries as inactive.
//   P8  one expense line is coded off its own counterparty's modal account.
//       Its counterparty is not the P7 counterparty, so the two rules resolve
//       to two different rows and the batch really does carry three miscodings.
//   P9  one payroll-platform accrual credits an accrual account other than the
//       modal one for that counterparty.
//   P10 one supporting document is cited by two entries with identical lines.
//   P11 one entry cites no supporting document on any line.
//
// Every draw comes from createRng("FIN-09", stream). No Math.random, no
// Date.now. Every amount is integer cents internally and a 2dp string on disk.
import { toCsv } from "../csv.js";
import { addDays } from "../dates.js";
import { createRng } from "../seed.js";
import { buildRoster } from "./core-04-people-roster.js";
import { buildChartOfAccounts } from "./fin-22-chart-of-accounts.js";
import {
  ACCOUNT_HOLDER, CANON_VENDORS, NEUTRAL_VENDORS,
  PREPARER_EMPLOYEE_ID, REVIEWER_EMPLOYEE_ID, SOD_CONFLICT_ROLE,
} from "./fin-01-cash-recon.js";

export const id = "FIN-09";

// ---------------------------------------------------------------- constants

/** The close batch posts inside the March 2026 finance anchor period. */
export const BATCH_PERIOD = { start: "2026-03-01", end: "2026-03-31" };
/** March close runs 2026-04-01 to 2026-04-07 (canon/timeline.md). */
/**
 * The highest purchase-order number this batch will ever cite. FIN-06 keeps its
 * missing-accrual plant strictly above this, so the two never collide.
 */
export const CITED_PO_CEILING = 120;

export const APPROVAL_WINDOW = { start: "2026-04-01", end: "2026-04-07" };

export const ENTRY_TYPES = [
  "accrual", "accrual_reversal", "reclass", "amortization",
  "depreciation", "allocation", "standard",
];

export const COLUMNS = [
  "entry_id", "line_no", "posting_date", "approved_date", "gl_account",
  "account_name", "description", "counterparty", "debit", "credit", "currency",
  "entry_type", "source_document", "prepared_by", "approved_by",
];

/**
 * Resolve a canon vendor by its canon id rather than by list position, so a
 * reorder of FIN-01's CANON_VENDORS fails loudly here instead of silently
 * repointing an entry at a different company.
 */
function canonVendor(canonId) {
  const vendor = CANON_VENDORS.find((v) => v.canon_id === canonId);
  if (!vendor) throw new Error(`FIN-09: canon vendor ${canonId} is not exported by FIN-01`);
  return vendor;
}

/** Assert a neutral vendor name is one FIN-01 already screened. D2 adds no new name. */
function neutralVendor(name) {
  if (!NEUTRAL_VENDORS.includes(name)) {
    throw new Error(`FIN-09: "${name}" is not one of FIN-01's screened neutral vendors`);
  }
  return name;
}

/** co-106, the payroll and benefits platform whose accruals carry P9. */
export const PAYROLL_PLATFORM = canonVendor("co-106");

// Each counterparty in this batch codes to exactly one expense account. That
// is what makes "modal account for this vendor" a real rule rather than a
// coin toss, and it is the population P8's single deviation stands out from.
const CODING = [
  { party: canonVendor("co-105").name, expense: "6600" },
  { party: PAYROLL_PLATFORM.name, expense: "6020" },
  { party: canonVendor("co-107").name, expense: "6120" },
  { party: canonVendor("co-109").name, expense: "6100" },
  { party: canonVendor("co-119").name, expense: "6200" },
  { party: neutralVendor("Halvermoor Cloud Services"), expense: "5000" },
  { party: neutralVendor("Kestrelmoor Staffing Partners"), expense: "6030" },
  { party: ACCOUNT_HOLDER.name, expense: "6800" },
];

const expenseFor = (party) => {
  const row = CODING.find((c) => c.party === party);
  if (!row) throw new Error(`FIN-09: no expense coding declared for "${party}"`);
  return row.expense;
};

// Line narration, indexed by ordinal so two lines of one entry read differently.
const PHRASES = {
  [canonVendor("co-105").name]: ["property and casualty program", "cyber liability program", "broker servicing fees", "umbrella policy instalment", "employment practices cover"],
  [PAYROLL_PLATFORM.name]: ["benefits administration", "payroll platform usage", "employer contributions", "open enrolment support", "leave administration"],
  [canonVendor("co-107").name]: ["office consumables", "breakroom supplies", "print and stationery", "workspace consumables", "desk equipment"],
  [canonVendor("co-109").name]: ["headquarters rent", "operating expense recovery", "parking licences", "facilities service charge", "signage and access"],
  [canonVendor("co-119").name]: ["analytics platform seats", "usage overage", "data enrichment credits", "reporting workspace", "connector licences"],
  ["Halvermoor Cloud Services"]: ["compute reservations", "object storage", "egress and transfer", "managed database", "observability tier"],
  ["Kestrelmoor Staffing Partners"]: ["contract engineering", "contract analyst cover", "interim support", "contract design cover", "project resourcing"],
  ["Sarrowmere Print Works"]: ["printed materials and stationery"],
  [ACCOUNT_HOLDER.name]: ["computer equipment", "furniture and fixtures", "capitalized software", "leasehold improvements"],
};

const phrase = (party, ordinal) => {
  const pool = PHRASES[party];
  if (!pool) throw new Error(`FIN-09: no description phrases for "${party}"`);
  return pool[ordinal % pool.length];
};

// ------------------------------------------------------------------ helpers

function cents(n) { return (n / 100).toFixed(2); }

function debitLine(code, counterparty, amountCents, description) {
  return { side: "debit", code, counterparty, amountCents, description };
}

function creditLine(code, counterparty, amountCents, description) {
  return { side: "credit", code, counterparty, amountCents, description };
}

function assertRole(row, employeeId, roleTitle) {
  if (!row) throw new Error(`FIN-09: ${employeeId} is not in the CORE-04 roster`);
  if (row.role_title !== roleTitle) throw new Error(`FIN-09: ${employeeId} is a ${row.role_title}, expected ${roleTitle}`);
  if (row.department !== "Finance") throw new Error(`FIN-09: ${employeeId} is in ${row.department}, expected Finance`);
  if (row.employment_status !== "active") throw new Error(`FIN-09: ${employeeId} is not active`);
  if (row.finance_system_role === SOD_CONFLICT_ROLE) throw new Error(`FIN-09: ${employeeId} is the planted SoD-conflict row`);
}

/** Throw unless every entry balances to the cent. Called after each plant. */
function assertBalanced(entries, stage) {
  let batchDebit = 0;
  let batchCredit = 0;
  for (const entry of entries) {
    const debit = entry.lines.filter((l) => l.side === "debit").reduce((s, l) => s + l.amountCents, 0);
    const credit = entry.lines.filter((l) => l.side === "credit").reduce((s, l) => s + l.amountCents, 0);
    if (debit !== credit) {
      throw new Error(`FIN-09: entry ${entry.key} does not balance after ${stage} (${cents(debit)} vs ${cents(credit)})`);
    }
    batchDebit += debit;
    batchCredit += credit;
  }
  if (batchDebit !== batchCredit) throw new Error(`FIN-09: batch does not balance after ${stage}`);
  return { batchDebit, batchCredit };
}

// ------------------------------------------------------------------ builder

/**
 * Build the whole March 2026 close batch. Pure: no I/O, no Date.now, every
 * draw from createRng("FIN-09", stream).
 * @returns {{ lines: object[], tieOut: object }}
 */
export function buildCloseBatch() {
  const chart = buildChartOfAccounts();
  const byCode = new Map(chart.map((r) => [r.account_code, r]));
  const account = (code) => {
    const row = byCode.get(code);
    if (!row) throw new Error(`FIN-09: ${code} is not a FIN-22 account_code`);
    return row;
  };

  const roster = buildRoster(createRng("CORE-04", "roster"));
  const preparer = roster.find((r) => r.employee_id === PREPARER_EMPLOYEE_ID);
  const reviewer = roster.find((r) => r.employee_id === REVIEWER_EMPLOYEE_ID);
  assertRole(preparer, PREPARER_EMPLOYEE_ID, "Staff Accountant");
  assertRole(reviewer, REVIEWER_EMPLOYEE_ID, "Controller");
  if (PREPARER_EMPLOYEE_ID === REVIEWER_EMPLOYEE_ID) {
    throw new Error("FIN-09: preparer and approver must be different people");
  }

  const entryRng = createRng(id, "entries");
  const plantRng = createRng(id, "planted");

  // Document-id counters. Every citation lands inside a block another cluster 1
  // artifact actually mints, so a reader who follows the reference finds a row.
  //
  // The purchase-order citations are additionally capped at CITED_PO_CEILING.
  // FIN-06 places its missing-accrual line above that ceiling, so the rule
  // "the un-accrued purchase order is cited by no close entry" holds without
  // either generator importing the other. Neither constant moves alone.
  let poSeq = 101;
  let vinvSeq = 101;
  let billSeq = 101;
  const nextPo = () => `PO-2026-${String(poSeq++).padStart(4, "0")}`;
  const nextVinv = () => `VINV-2026-${String(vinvSeq++).padStart(4, "0")}`;
  const nextBill = () => `BILL-2026-${String(billSeq++).padStart(4, "0")}`;

  const closeDays = ["2026-03-27", "2026-03-28", "2026-03-29", "2026-03-30", "2026-03-31"];
  const approvalDays = [];
  for (let d = APPROVAL_WINDOW.start; d <= APPROVAL_WINDOW.end; d = addDays(d, 1)) approvalDays.push(d);

  const entries = [];
  const push = ({ key, type, source, postingDate, lines, rng }) => {
    const entry = { key, type, source, postingDate, approvedDate: (rng ?? entryRng).pick(approvalDays), lines };
    entries.push(entry);
    return entry;
  };

  // ---- co-106 payroll-platform benefit accruals (P9's population) --------
  // Five two-line accruals so the modal credit account is unambiguous.
  const payrollEntries = [];
  for (let i = 0; i < 5; i++) {
    const amount = entryRng.int(900000, 4200000);
    const party = PAYROLL_PLATFORM.name;
    payrollEntries.push(push({
      key: `payroll-${i}`,
      type: "accrual",
      source: nextBill(),
      postingDate: entryRng.pick(closeDays.slice(1)),
      lines: [
        debitLine(expenseFor(party), party, amount, `March 2026 accrual - ${party} - ${phrase(party, i)}`),
        creditLine("2020", party, amount, `March 2026 accrual - ${party} - ${phrase(party, i)}`),
      ],
    }));
  }

  // ---- vendor expense accruals ------------------------------------------
  // Two entries per vendor. The first carries `wide` expense debits, the second
  // two, so every vendor clears the four-line floor the modal rule needs.
  const vendorBlocks = [
    { party: canonVendor("co-105").name, wide: 2 },
    { party: canonVendor("co-107").name, wide: 3 },
    { party: neutralVendor("Halvermoor Cloud Services"), wide: 3 },
    { party: neutralVendor("Kestrelmoor Staffing Partners"), wide: 2 },
    { party: canonVendor("co-119").name, wide: 2 },
    { party: canonVendor("co-109").name, wide: 2 },
  ];
  const vendorEntries = [];
  for (const { party, wide } of vendorBlocks) {
    let ordinal = 0;
    for (const count of [wide, 2]) {
      const debits = [];
      for (let i = 0; i < count; i++) {
        debits.push(debitLine(
          expenseFor(party), party, entryRng.int(120000, 8500000),
          `March 2026 accrual - ${party} - ${phrase(party, ordinal++)}`
        ));
      }
      const total = debits.reduce((s, l) => s + l.amountCents, 0);
      vendorEntries.push(push({
        key: `vendor-${party}-${count}`,
        type: "accrual",
        source: nextVinv(),
        postingDate: entryRng.pick(closeDays),
        lines: [...debits, creditLine("2010", party, total, `March 2026 accrual - ${party} - accrued liabilities`)],
      }));
    }
  }

  // ---- depreciation and amortization, booked in-house --------------------
  const holder = ACCOUNT_HOLDER.name;
  for (const [i, [type, contra]] of [["depreciation", "1490"], ["depreciation", "1490"], ["amortization", "1590"], ["amortization", "1590"]].entries()) {
    const amount = type === "depreciation" ? entryRng.int(4000000, 12000000) : entryRng.int(2500000, 9000000);
    const narrative = `March 2026 ${type} - ${phrase(holder, i)}`;
    push({
      key: `inhouse-${i}`,
      type,
      source: i === 2 ? "CORE-01" : nextPo(),
      postingDate: BATCH_PERIOD.end,
      lines: [
        debitLine(expenseFor(holder), holder, amount, narrative),
        creditLine(contra, holder, amount, narrative),
      ],
    });
  }

  // ---- reversals of the February accruals, booked as the month opens -----
  const reversalParties = [
    canonVendor("co-107").name,
    neutralVendor("Halvermoor Cloud Services"),
    canonVendor("co-105").name,
    neutralVendor("Kestrelmoor Staffing Partners"),
  ];
  for (const [i, party] of reversalParties.entries()) {
    const amount = entryRng.int(150000, 6000000);
    const narrative = `Reversal of February 2026 accrual - ${party}`;
    push({
      key: `reversal-${i}`,
      type: "accrual_reversal",
      // The insurance reversal cites the policy itself; the rest cite the bill
      // that superseded the accrual.
      source: party === canonVendor("co-105").name ? "FIN-12" : nextBill(),
      postingDate: entryRng.pick(["2026-03-01", "2026-03-02"]),
      lines: [
        debitLine("2010", party, amount, narrative),
        creditLine(expenseFor(party), party, amount, narrative),
      ],
    });
  }

  // ---- prepaid reclass and the contractor-cost allocation ----------------
  const analytics = canonVendor("co-119").name;
  const staffing = neutralVendor("Kestrelmoor Staffing Partners");
  const reclassAmount = entryRng.int(300000, 2500000);
  push({
    key: "reclass",
    type: "reclass",
    source: nextBill(),
    postingDate: entryRng.pick(closeDays.slice(3)),
    lines: [
      debitLine("1230", analytics, reclassAmount, `Reclass of prepaid balance - ${analytics}`),
      creditLine("1200", analytics, reclassAmount, `Reclass of prepaid balance - ${analytics}`),
    ],
  });
  const allocationAmount = entryRng.int(1500000, 6500000);
  push({
    key: "allocation",
    type: "allocation",
    source: nextPo(),
    postingDate: BATCH_PERIOD.end,
    lines: [
      debitLine("1500", staffing, allocationAmount, `Allocation of contract development cost - ${staffing}`),
      creditLine(expenseFor(staffing), staffing, allocationAmount, `Allocation of contract development cost - ${staffing}`),
    ],
  });

  assertBalanced(entries, "the clean entries");

  // ---- planted features, in the order P8, P9, P7, P10, P11 ---------------

  // P8: one staffing line coded to Recruiting instead of the Contractors and
  // Consultants account the rest of that vendor's spend sits in. Amount and
  // narration are untouched, so only the coding gives it away.
  const staffingExpenseLines = vendorEntries
    .filter((e) => e.lines.some((l) => l.counterparty === staffing))
    .flatMap((e) => e.lines.filter((l) => l.counterparty === staffing && l.side === "debit"));
  if (staffingExpenseLines.length < 4) {
    throw new Error(`FIN-09: P8 needs at least four ${staffing} expense lines, found ${staffingExpenseLines.length}`);
  }
  const modalMinority = plantRng.pick(staffingExpenseLines);
  modalMinority.code = "6040";
  assertBalanced(entries, "P8");

  // P9: one payroll-platform accrual credits Accrued Bonus rather than the
  // Accrued Payroll account the other four credit.
  const categoryMinority = plantRng.pick(payrollEntries);
  const categoryCredit = categoryMinority.lines.find((l) => l.side === "credit");
  categoryCredit.code = "2030";
  assertBalanced(entries, "P9");

  // P7: a one-off print and stationery purchase coded to the account the chart
  // retired into Office Expense. Its counterparty carries no other expense
  // line, so the modal rule that catches P8 leaves this row alone and the two
  // miscodings stay distinct.
  const printWorks = neutralVendor("Sarrowmere Print Works");
  const retiredAccount = chart.find((r) => r.active === "false");
  if (!retiredAccount) throw new Error("FIN-09: the chart carries no inactive account for P7");
  const retiredAmount = plantRng.int(80000, 450000);
  push({
    key: "retired-account",
    type: "accrual",
    source: nextVinv(),
    postingDate: BATCH_PERIOD.end,
    rng: plantRng,
    lines: [
      debitLine(retiredAccount.account_code, printWorks, retiredAmount, `March 2026 accrual - ${printWorks} - ${phrase(printWorks, 0)}`),
      creditLine("2010", printWorks, retiredAmount, `March 2026 accrual - ${printWorks} - accrued liabilities`),
    ],
  });
  assertBalanced(entries, "P7");

  // P10: the same analytics invoice accrued twice, a day apart, by two entries
  // whose lines are identical. Nothing but the shared citation and the matching
  // amounts reveals it.
  const duplicateSource = nextVinv();
  const duplicateAmount = plantRng.int(1200000, 3800000);
  const duplicateStart = plantRng.pick(["2026-03-29", "2026-03-30"]);
  for (const [i, postingDate] of [duplicateStart, addDays(duplicateStart, 1)].entries()) {
    const narrative = `March 2026 accrual - ${analytics} - ${phrase(analytics, 1)}`;
    push({
      key: `duplicate-${i}`,
      type: "accrual",
      source: duplicateSource,
      postingDate,
      rng: plantRng,
      lines: [
        debitLine(expenseFor(analytics), analytics, duplicateAmount, narrative),
        creditLine("2010", analytics, duplicateAmount, narrative),
      ],
    });
  }
  assertBalanced(entries, "P10");

  // P11: a payroll-liability regrouping posted with no supporting document on
  // any line. Every other entry in the batch cites something.
  const p11a = plantRng.int(1800000, 5200000);
  const p11b = plantRng.int(600000, 2400000);
  const p11Total = p11a + p11b;
  const p11Split = Math.round(p11Total * 0.6);
  push({
    key: "unsupported",
    type: "standard",
    source: "",
    postingDate: BATCH_PERIOD.end,
    rng: plantRng,
    lines: [
      debitLine("2010", holder, p11a, "Regrouping of accrued balances at period end"),
      debitLine("2030", holder, p11b, "Regrouping of accrued balances at period end"),
      creditLine("2110", holder, p11Split, "Regrouping of accrued balances at period end"),
      creditLine("2100", holder, p11Total - p11Split, "Regrouping of accrued balances at period end"),
    ],
  });
  const { batchDebit, batchCredit } = assertBalanced(entries, "P11");

  // ---- order, number and flatten ----------------------------------------
  const order = new Map(entries.map((e, i) => [e, i]));
  const sorted = entries.slice().sort((a, b) => {
    if (a.postingDate < b.postingDate) return -1;
    if (a.postingDate > b.postingDate) return 1;
    return order.get(a) - order.get(b);
  });
  sorted.forEach((e, i) => { e.entryId = `JE-202603-C${String(i + 1).padStart(3, "0")}`; });

  const lines = [];
  for (const entry of sorted) {
    entry.lines.forEach((line, i) => {
      lines.push({
        entry_id: entry.entryId,
        line_no: String(i + 1),
        posting_date: entry.postingDate,
        approved_date: entry.approvedDate,
        gl_account: line.code,
        account_name: account(line.code).account_name,
        description: line.description,
        counterparty: line.counterparty,
        debit: line.side === "debit" ? cents(line.amountCents) : "",
        credit: line.side === "credit" ? cents(line.amountCents) : "",
        currency: "USD",
        entry_type: entry.type,
        source_document: entry.source,
        prepared_by: PREPARER_EMPLOYEE_ID,
        approved_by: REVIEWER_EMPLOYEE_ID,
      });
    });
  }

  assertPostConditions(sorted, lines, chart);

  if (poSeq - 1 > CITED_PO_CEILING) {
    throw new Error(`FIN-09: purchase-order citations ran past the reserved ceiling (${poSeq - 1} > ${CITED_PO_CEILING})`);
  }

  return {
    lines,
    tieOut: {
      entryCount: sorted.length,
      lineCount: lines.length,
      batchDebitCents: batchDebit,
      batchCreditCents: batchCredit,
    },
  };
}

/**
 * Re-derive every planted feature from the emitted rows, the way the public
 * test and the private trazomo guard will, and throw if any of them resolves to
 * something other than exactly one row. A plant that stops being derivable is a
 * build failure, not a data quirk.
 */
function assertPostConditions(entries, lines, chart) {
  const byCode = new Map(chart.map((r) => [r.account_code, r]));
  const expenseCodes = new Set(chart.filter((r) => r.type === "expense").map((r) => r.account_code));
  const inactive = new Set(chart.filter((r) => r.active === "false").map((r) => r.account_code));

  const retired = lines.filter((l) => inactive.has(l.gl_account));
  if (retired.length !== 1) throw new Error(`FIN-09: P7 resolves to ${retired.length} lines, expected 1`);

  const byParty = new Map();
  for (const l of lines.filter((l) => expenseCodes.has(l.gl_account))) {
    if (!byParty.has(l.counterparty)) byParty.set(l.counterparty, []);
    byParty.get(l.counterparty).push(l);
  }
  const deviating = [];
  for (const [party, partyLines] of byParty) {
    const counts = new Map();
    for (const l of partyLines) counts.set(l.gl_account, (counts.get(l.gl_account) ?? 0) + 1);
    let modal = null;
    let modalCount = 0;
    for (const [code, count] of counts) if (count > modalCount) { modal = code; modalCount = count; }
    if (modalCount * 2 <= partyLines.length) {
      throw new Error(`FIN-09: ${party}'s modal expense account is not a strict majority`);
    }
    if (partyLines.length > 1 && partyLines.length < 4) {
      throw new Error(`FIN-09: ${party} has ${partyLines.length} expense lines, too few for an unambiguous mode`);
    }
    deviating.push(...partyLines.filter((l) => l.gl_account !== modal));
  }
  if (deviating.length !== 1) throw new Error(`FIN-09: P8 resolves to ${deviating.length} lines, expected 1`);
  if (deviating[0] === retired[0]) throw new Error("FIN-09: P7 and P8 resolve to the same line");

  const payrollCredits = lines.filter(
    (l) => (l.entry_type === "accrual" || l.entry_type === "accrual_reversal")
      && l.counterparty === PAYROLL_PLATFORM.name && l.credit !== ""
  );
  if (payrollCredits.length < 4) throw new Error("FIN-09: P9 needs at least four payroll-platform accrual credits");
  const creditCounts = new Map();
  for (const l of payrollCredits) creditCounts.set(l.gl_account, (creditCounts.get(l.gl_account) ?? 0) + 1);
  if (creditCounts.size !== 2) throw new Error(`FIN-09: P9 spans ${creditCounts.size} credit accounts, expected 2`);
  const [modalCredit] = [...creditCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const minority = payrollCredits.filter((l) => l.gl_account !== modalCredit);
  if (minority.length !== 1) throw new Error(`FIN-09: P9 resolves to ${minority.length} lines, expected 1`);
  for (const l of payrollCredits) {
    if (byCode.get(l.gl_account).subtype !== "accrued") throw new Error("FIN-09: P9 population must credit accrual accounts only");
  }

  const byDoc = new Map();
  for (const entry of entries) {
    if (entry.source === "") continue;
    if (!byDoc.has(entry.source)) byDoc.set(entry.source, []);
    byDoc.get(entry.source).push(entry);
  }
  const shared = [...byDoc.values()].filter((group) => group.length > 1);
  if (shared.length !== 1 || shared[0].length !== 2) {
    throw new Error(`FIN-09: P10 resolves to ${shared.length} duplicated citations, expected 1`);
  }
  const signature = (entry) => entry.lines.map((l) => `${l.code}|${l.side}|${l.amountCents}`).sort().join(";");
  if (signature(shared[0][0]) !== signature(shared[0][1])) {
    throw new Error("FIN-09: the two entries citing one document are not identical");
  }

  const unsupported = entries.filter((e) => e.source === "");
  if (unsupported.length !== 1) throw new Error(`FIN-09: P11 resolves to ${unsupported.length} entries, expected 1`);
  const resolvable = /^(VINV|BILL|PO)-2026-0\d{3}$|^CORE-01$|^FIN-12$/;
  for (const entry of entries) {
    if (entry.source === "") continue;
    if (!resolvable.test(entry.source)) throw new Error(`FIN-09: source_document "${entry.source}" does not resolve`);
  }
}

// ---------------------------------------------------------------- generate

export function generate() {
  const { lines } = buildCloseBatch();
  return [{ path: "journal-entries-batch.csv", content: toCsv(COLUMNS, lines) }];
}

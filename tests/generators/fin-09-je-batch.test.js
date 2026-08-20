// FIN-09: the March 2026 close journal batch.
//
// Every assertion here is structural. It counts shapes (one line on a retired
// account, one line off its vendor's modal account, one duplicated entry, one
// entry with no supporting document) and recomputes the batch arithmetic from
// the file, but never names an entry_id, a source_document value or an amount:
// those live only in private trazomo content keyed to the data-pack tag
// (answer-key rule, datagen/README.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { createRng } from "../../datagen/src/seed.js";
import { diffDays } from "../../datagen/src/dates.js";
import { buildRoster } from "../../datagen/src/generators/core-04-people-roster.js";
import { buildChartOfAccounts } from "../../datagen/src/generators/fin-22-chart-of-accounts.js";
import {
  PREPARER_EMPLOYEE_ID, REVIEWER_EMPLOYEE_ID, SOD_CONFLICT_ROLE,
  ACCOUNT_HOLDER, CANON_VENDORS, NEUTRAL_VENDORS,
} from "../../datagen/src/generators/fin-01-cash-recon.js";
import {
  BATCH_PERIOD, APPROVAL_WINDOW, ENTRY_TYPES, PAYROLL_PLATFORM,
} from "../../datagen/src/generators/fin-09-je-batch.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));

// Quote-aware CSV line splitter (mirrors datagen/src/csv.js's escaping).
function splitCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i += 1; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { cells.push(cur); cur = ""; }
    else cur += ch;
  }
  cells.push(cur);
  return cells;
}

function csvTable(content) {
  const [header, ...lines] = content.trim().split("\n");
  const cols = splitCsvLine(header);
  return { cols, rows: lines.map((line) => Object.fromEntries(cols.map((c, i) => [c, splitCsvLine(line)[i]]))) };
}

function fileByPath(files, path) {
  const f = files.find((x) => x.path === path);
  assert.ok(f, `expected output file "${path}" not found (got: ${files.map((x) => x.path).join(", ")})`);
  return f;
}

const toCents = (s) => Math.round(Number(s) * 100);
const TWO_DP = /^\d+\.\d{2}$/;

/** Group rows into entries, preserving file order. */
function groupEntries(rows) {
  const byId = new Map();
  for (const r of rows) {
    if (!byId.has(r.entry_id)) byId.set(r.entry_id, []);
    byId.get(r.entry_id).push(r);
  }
  return byId;
}

/** Modal value of an array plus its count, ties resolved to the first seen. */
function mode(values) {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = null;
  let bestCount = 0;
  for (const [v, c] of counts) if (c > bestCount) { best = v; bestCount = c; }
  return { value: best, count: bestCount, distinct: counts.size };
}

const spec = specs.byId.get("FIN-09");
const files = generateArtifact(spec, canon);
const table = csvTable(fileByPath(files, "journal-entries-batch.csv").content);
const rows = table.rows;
const entries = groupEntries(rows);

const chart = buildChartOfAccounts();
const chartByCode = new Map(chart.map((r) => [r.account_code, r]));
const expenseCodes = new Set(chart.filter((r) => r.type === "expense").map((r) => r.account_code));
const inactiveCodes = new Set(chart.filter((r) => r.active === "false").map((r) => r.account_code));
const expenseLines = rows.filter((r) => expenseCodes.has(r.gl_account));

test("FIN-09: header equals the spec columns, and the batch lands in the target size range", () => {
  assert.deepEqual(table.cols, spec.columns);
  assert.ok(rows.length >= 72 && rows.length <= 88, `expected 72 to 88 lines, got ${rows.length}`);
  assert.ok(entries.size >= 28 && entries.size <= 34, `expected 28 to 34 entries, got ${entries.size}`);
  assert.equal(files.length, 1);
});

test("FIN-09: entry ids are the close-batch series and line_no runs 1..n contiguously inside each entry", () => {
  const ids = [...entries.keys()];
  for (const id of ids) assert.match(id, /^JE-202603-C\d{3}$/);
  assert.equal(new Set(ids).size, ids.length, "duplicate entry_id");
  for (const [id, lines] of entries) {
    const seen = lines.map((l) => Number(l.line_no));
    assert.deepEqual(seen, lines.map((_, i) => i + 1), `${id}: line_no is not 1..n in order`);
  }
  // Entries appear once each, contiguously, in ascending id order.
  const order = [...new Set(rows.map((r) => r.entry_id))];
  assert.deepEqual(order, [...order].sort(), "entries are not emitted in ascending entry_id order");
});

test("FIN-09: entry ids are disjoint from the FIN-02 cash-ledger je_id block", () => {
  const fin02 = generateArtifact(specs.byId.get("FIN-02"), canon);
  const glIds = new Set(csvTable(fileByPath(fin02, "gl-cash-ledger.csv").content).rows.map((r) => r.je_id));
  const overlap = [...entries.keys()].filter((id) => glIds.has(id));
  assert.deepEqual(overlap, [], "a close-batch entry id collides with a FIN-02 je_id");
});

test("FIN-09 T-C3: exactly one of debit / credit is populated per line, both 2dp and greater than zero", () => {
  for (const r of rows) {
    const hasDebit = r.debit !== "";
    const hasCredit = r.credit !== "";
    assert.ok(hasDebit !== hasCredit, `${r.entry_id}/${r.line_no}: expected exactly one of debit / credit`);
    const amount = hasDebit ? r.debit : r.credit;
    assert.match(amount, TWO_DP, `${r.entry_id}/${r.line_no}: amount is not a 2dp decimal`);
    assert.ok(toCents(amount) > 0, `${r.entry_id}/${r.line_no}: amount is not greater than zero`);
    assert.equal(r.currency, "USD");
  }
});

test("FIN-09 T-C1 / T-C2: every entry balances and the batch balances, to the cent", () => {
  let batchDebit = 0;
  let batchCredit = 0;
  for (const [id, lines] of entries) {
    const debit = lines.reduce((s, l) => s + (l.debit === "" ? 0 : toCents(l.debit)), 0);
    const credit = lines.reduce((s, l) => s + (l.credit === "" ? 0 : toCents(l.credit)), 0);
    assert.equal(debit, credit, `${id}: debits and credits do not balance`);
    batchDebit += debit;
    batchCredit += credit;
  }
  assert.equal(batchDebit, batchCredit, "the batch does not balance");
  assert.ok(batchDebit > 0);
});

test("FIN-09 T-C4: every gl_account is on the FIN-22 chart with its own name, and exactly one line posts to a retired account", () => {
  for (const r of rows) {
    const account = chartByCode.get(r.gl_account);
    assert.ok(account, `${r.gl_account} is not a FIN-22 account_code`);
    assert.equal(r.account_name, account.account_name, `${r.gl_account}: account_name drifted from the chart`);
  }
  const retired = rows.filter((r) => inactiveCodes.has(r.gl_account));
  assert.equal(retired.length, 1, "expected exactly one line on an account the chart carries as inactive");
});

test("FIN-09 T-C5: posting dates sit in March 2026 and approved dates inside the close window", () => {
  for (const r of rows) {
    assert.ok(r.posting_date >= BATCH_PERIOD.start && r.posting_date <= BATCH_PERIOD.end, `${r.entry_id}: posting_date ${r.posting_date} is outside March 2026`);
    assert.ok(r.approved_date >= APPROVAL_WINDOW.start && r.approved_date <= APPROVAL_WINDOW.end, `${r.entry_id}: approved_date ${r.approved_date} is outside the close window`);
    assert.ok(ENTRY_TYPES.includes(r.entry_type), `${r.entry_type} is not a declared entry_type`);
  }
  // One posting date and one approved date per entry.
  for (const [id, lines] of entries) {
    assert.equal(new Set(lines.map((l) => l.posting_date)).size, 1, `${id}: mixed posting dates`);
    assert.equal(new Set(lines.map((l) => l.approved_date)).size, 1, `${id}: mixed approved dates`);
    assert.equal(new Set(lines.map((l) => l.entry_type)).size, 1, `${id}: mixed entry_type`);
    assert.equal(new Set(lines.map((l) => l.source_document)).size, 1, `${id}: mixed source_document`);
  }
});

test("FIN-09 P8: every counterparty's expense coding has an unambiguous mode, and exactly one line batch-wide deviates from it", () => {
  const byCounterparty = new Map();
  for (const r of expenseLines) {
    if (!byCounterparty.has(r.counterparty)) byCounterparty.set(r.counterparty, []);
    byCounterparty.get(r.counterparty).push(r);
  }
  let deviations = 0;
  for (const [counterparty, lines] of byCounterparty) {
    const m = mode(lines.map((l) => l.gl_account));
    assert.ok(m.count * 2 > lines.length, `${counterparty}: modal expense account is not a strict majority (${m.count} of ${lines.length})`);
    if (lines.length > 1) {
      // The real rule, stated rather than assumed: a counterparty either has a
      // single expense line, in which case there is no mode to deviate from, or
      // it has at least four and a strict majority. Anything between the two
      // makes the modal-minority plant underivable.
      assert.ok(lines.length >= 4, `${counterparty}: ${lines.length} expense lines, too few for an unambiguous mode`);
    }
    deviations += lines.filter((l) => l.gl_account !== m.value).length;
  }
  assert.equal(deviations, 1, "expected exactly one expense line coded off its own counterparty's modal account");
});

test("FIN-09 P7 and P8 resolve to two different lines", () => {
  const retired = rows.filter((r) => inactiveCodes.has(r.gl_account));
  const byCounterparty = new Map();
  for (const r of expenseLines) {
    if (!byCounterparty.has(r.counterparty)) byCounterparty.set(r.counterparty, []);
    byCounterparty.get(r.counterparty).push(r);
  }
  const deviating = [];
  for (const [, lines] of byCounterparty) {
    const m = mode(lines.map((l) => l.gl_account));
    deviating.push(...lines.filter((l) => l.gl_account !== m.value));
  }
  assert.equal(deviating.length, 1);
  assert.notEqual(
    `${retired[0].entry_id}|${retired[0].line_no}`,
    `${deviating[0].entry_id}|${deviating[0].line_no}`,
    "the retired-account line and the modal-minority line are the same row, so the batch carries two miscodings rather than three"
  );
});

test("FIN-09 P9: the payroll-platform accruals have one modal credit account and exactly one line deviating from it", () => {
  const accrualTypes = new Set(["accrual", "accrual_reversal"]);
  const credits = rows.filter(
    (r) => accrualTypes.has(r.entry_type) && r.counterparty === PAYROLL_PLATFORM.name && r.credit !== ""
  );
  assert.ok(credits.length >= 4, `expected at least four payroll-platform accrual credit lines, got ${credits.length}`);
  const m = mode(credits.map((r) => r.gl_account));
  assert.ok(m.count * 2 > credits.length, "the modal credit account is not a strict majority");
  assert.equal(m.distinct, 2, "expected exactly one account other than the mode");
  assert.equal(credits.filter((r) => r.gl_account !== m.value).length, 1);
  // Both the mode and the deviation are accrued-liability accounts, so the
  // defect is a coding choice rather than a class error.
  for (const r of credits) assert.equal(chartByCode.get(r.gl_account).subtype, "accrued");
});

test("FIN-09 P10: exactly one supporting document is cited by two entries, whose lines and totals are identical", () => {
  const entriesByDoc = new Map();
  for (const [id, lines] of entries) {
    const doc = lines[0].source_document;
    if (doc === "") continue;
    if (!entriesByDoc.has(doc)) entriesByDoc.set(doc, []);
    entriesByDoc.get(doc).push(id);
  }
  const shared = [...entriesByDoc.entries()].filter(([, ids]) => ids.length > 1);
  assert.equal(shared.length, 1, "expected exactly one supporting document cited by more than one entry");
  const [, ids] = shared[0];
  assert.equal(ids.length, 2, "expected the duplicated document to be cited twice");
  const signature = (id) => entries.get(id)
    .map((l) => `${l.gl_account}|${l.debit === "" ? "credit" : "debit"}|${l.debit === "" ? l.credit : l.debit}`)
    .sort();
  assert.deepEqual(signature(ids[0]), signature(ids[1]), "the two entries citing one document are not identical");
  const dates = ids.map((id) => entries.get(id)[0].posting_date);
  const gap = Math.abs(diffDays(dates[0], dates[1]));
  assert.ok(gap <= 1, `the duplicated entries post ${gap} days apart`);
});

test("FIN-09 P11: exactly one entry carries no supporting document, and every other citation resolves in shape", () => {
  const unsupported = [...entries.entries()].filter(([, lines]) => lines.every((l) => l.source_document === ""));
  assert.equal(unsupported.length, 1, "expected exactly one entry with no supporting document on any line");
  const resolvable = /^(VINV|BILL)-2026-0\d{3}$|^CORE-01$|^FIN-12$/;
  for (const [id, lines] of entries) {
    if (id === unsupported[0][0]) continue;
    for (const l of lines) assert.match(l.source_document, resolvable, `${id}: source_document does not resolve`);
  }
  // No line in a supported entry is blank, and no line in the unsupported one is filled.
  const blanks = rows.filter((r) => r.source_document === "");
  assert.equal(blanks.length, unsupported[0][1].length);
});

test("FIN-09: preparer and approver are the canon close roles, verified against the roster, and are different people", () => {
  const roster = buildRoster(createRng("CORE-04", "roster"));
  const byId = new Map(roster.map((r) => [r.employee_id, r]));
  assert.notEqual(PREPARER_EMPLOYEE_ID, REVIEWER_EMPLOYEE_ID);
  for (const r of rows) {
    assert.equal(r.prepared_by, PREPARER_EMPLOYEE_ID);
    assert.equal(r.approved_by, REVIEWER_EMPLOYEE_ID);
  }
  for (const empId of [PREPARER_EMPLOYEE_ID, REVIEWER_EMPLOYEE_ID]) {
    const person = byId.get(empId);
    assert.ok(person, `${empId} is not on the CORE-04 roster`);
    assert.equal(person.department, "Finance");
    assert.equal(person.employment_status, "active");
    assert.notEqual(person.finance_system_role, SOD_CONFLICT_ROLE, `${empId} is the roster's planted SoD-conflict row`);
  }
});

test("FIN-09: every counterparty is a canon vendor, a declared neutral vendor, or the account holder", () => {
  const allowed = new Set([
    ACCOUNT_HOLDER.name,
    ...CANON_VENDORS.map((v) => v.name),
    ...NEUTRAL_VENDORS,
  ]);
  for (const r of rows) {
    assert.ok(allowed.has(r.counterparty), `"${r.counterparty}" is not a screened universe name`);
  }
});

test("FIN-09: regeneration is byte-identical", () => {
  const again = generateArtifact(spec, canon);
  assert.equal(again.length, files.length);
  for (let i = 0; i < files.length; i++) {
    assert.equal(again[i].path, files[i].path);
    assert.equal(again[i].content, files[i].content);
  }
});

// ---------------------------------------------------------------------------
// The FIN-09 to FIN-11 / FIN-07 join (D2 plan section 1.4, data-repo issue #12).
//
// Both halves read the other pack's emitted bytes rather than importing its
// builder, so a citation that stops resolving fails here rather than in a
// lesson. FIN-11 is the authority for what a bill is and FIN-07 for what a
// vendor invoice is.
const billRows = csvTable(fileByPath(generateArtifact(specs.byId.get("FIN-11"), canon), "vendor-bills.csv").content).rows;
const invoiceRows = csvTable(fileByPath(generateArtifact(specs.byId.get("FIN-07"), canon), "vendor-invoices.csv").content).rows;
const CONTRACT_DOCUMENTS = new Set(["CORE-01", "FIN-12"]);

/** One counterparty and one debit total per entry, both taken from the file. */
function entryFacts(lines) {
  const counterparties = new Set(lines.map((l) => l.counterparty));
  return {
    counterparty: counterparties.size === 1 ? [...counterparties][0] : null,
    debitCents: lines.reduce((s, l) => s + (l.debit === "" ? 0 : toCents(l.debit)), 0),
    accounts: new Set(lines.map((l) => l.gl_account)),
  };
}

test("FIN-09 join: every source_document of bill type resolves to exactly one FIN-11 bill, with vendor, account and amount agreeing", () => {
  const cited = [...entries.entries()].filter(([, lines]) => lines[0].source_document.startsWith("BILL-"));
  assert.ok(cited.length > 0, "no entry cites a vendor bill, so the join is untested");
  for (const [id, lines] of cited) {
    const doc = lines[0].source_document;
    const matches = billRows.filter((b) => b.bill_id === doc);
    assert.equal(matches.length, 1, `${id}: ${doc} resolves to ${matches.length} FIN-11 bills`);
    const bill = matches[0];
    const facts = entryFacts(lines);
    assert.equal(bill.vendor_name, facts.counterparty, `${id}: ${doc} is ${bill.vendor_name}'s bill, but the entry books ${facts.counterparty}`);
    assert.ok(facts.accounts.has(bill.gl_account), `${id}: ${doc} posts to ${bill.gl_account}, which the entry never touches`);
    assert.equal(facts.debitCents, toCents(bill.bill_amount), `${id}: the entry totals ${facts.debitCents} cents against a bill of ${toCents(bill.bill_amount)}`);
  }
});

test("FIN-09 join: every source_document of vendor-invoice type resolves to exactly one FIN-07 invoice, and an entry booked against a vendor agrees on vendor and total", () => {
  const cited = [...entries.entries()].filter(([, lines]) => lines[0].source_document.startsWith("VINV-"));
  assert.ok(cited.length > 0, "no entry cites a vendor invoice, so the join is untested");
  for (const [id, lines] of cited) {
    const doc = lines[0].source_document;
    const matches = invoiceRows.filter((i) => i.invoice_id === doc);
    assert.equal(matches.length, 1, `${id}: ${doc} resolves to ${matches.length} FIN-07 invoices`);
    const facts = entryFacts(lines);
    // An entry whose counterparty is the account holder is internal: the March
    // depreciation or amortization charge is a fraction of the asset it cites,
    // so only the citation itself is asserted.
    if (facts.counterparty === ACCOUNT_HOLDER.name) continue;
    assert.equal(matches[0].vendor_name, facts.counterparty, `${id}: ${doc} is ${matches[0].vendor_name}'s invoice, but the entry books ${facts.counterparty}`);
    assert.equal(facts.debitCents, toCents(matches[0].invoice_amount), `${id}: the entry totals ${facts.debitCents} cents against an invoice of ${toCents(matches[0].invoice_amount)}`);
  }
});

test("FIN-09 join: no source_document names a document no other artifact mints", () => {
  const billIds = new Set(billRows.map((b) => b.bill_id));
  const invoiceIds = new Set(invoiceRows.map((i) => i.invoice_id));
  for (const [id, lines] of entries) {
    const doc = lines[0].source_document;
    if (doc === "" || CONTRACT_DOCUMENTS.has(doc)) continue;
    assert.ok(billIds.has(doc) || invoiceIds.has(doc), `${id}: ${doc} is neither a FIN-11 bill nor a FIN-07 invoice`);
  }
});

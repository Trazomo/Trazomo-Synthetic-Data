// FIN-01 / FIN-02 / FIN-03: the March 2026 cash reconciliation pack.
//
// Every assertion here is structural. It counts shapes (one duplicated pair,
// two unmatched debits, one receipt with no bank counterpart) and recomputes
// the tie-out from the files, but never names a txn_id, je_id, check number or
// amount: those live only in private trazomo content keyed to the data-pack
// tag (answer-key rule, datagen/README.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { createRng } from "../../datagen/src/seed.js";
import { buildRoster } from "../../datagen/src/generators/core-04-people-roster.js";
import { generate as generateCrmSeed } from "../../datagen/src/generators/core-03-crm-seed.js";
import {
  PERIOD, PREPARER_EMPLOYEE_ID, REVIEWER_EMPLOYEE_ID, SOD_CONFLICT_ROLE,
  ACCOUNT_HOLDER, BANK, CANON_VENDORS, NEUTRAL_VENDORS, transposeDollars,
} from "../../datagen/src/generators/fin-01-cash-recon.js";
import { OPERATING_CASH_ACCOUNT } from "../../datagen/src/generators/fin-22-chart-of-accounts.js";

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
const key = (reference, amount) => `${reference}|${amount}`;

// Generate the pack once for the whole file (pure functions, so this is safe).
const fin01 = generateArtifact(specs.byId.get("FIN-01"), canon);
const fin02 = generateArtifact(specs.byId.get("FIN-02"), canon);
const fin03 = generateArtifact(specs.byId.get("FIN-03"), canon);
const bankTable = csvTable(fileByPath(fin01, "bank-transactions.csv").content);
const summary = JSON.parse(fileByPath(fin01, "bank-statement-summary.json").content);
const glTable = csvTable(fileByPath(fin02, "gl-cash-ledger.csv").content);
const outstandingTable = csvTable(fileByPath(fin03, "outstanding-checks.csv").content);
const bank = bankTable.rows;
const gl = glTable.rows;
const outstanding = outstandingTable.rows;

const bankCredits = bank.filter((r) => r.type === "credit");
const bankDebits = bank.filter((r) => r.type === "debit");
const glReceipts = gl.filter((r) => r.debit !== "");
const glPayments = gl.filter((r) => r.credit !== "");
const glPaymentKeys = new Set(glPayments.map((r) => key(r.reference, r.credit)));
const bankCreditKeys = new Set(bankCredits.map((r) => key(r.reference, r.amount)));

test("FIN-01/02/03: headers equal the spec columns and row counts land in the target ranges", () => {
  assert.deepEqual(bankTable.cols, specs.byId.get("FIN-01").columns);
  assert.deepEqual(glTable.cols, specs.byId.get("FIN-02").columns);
  assert.deepEqual(outstandingTable.cols, specs.byId.get("FIN-03").columns);
  assert.ok(bank.length >= 180 && bank.length <= 220, `bank rows ${bank.length}`);
  assert.ok(gl.length >= 180 && gl.length <= 220, `gl rows ${gl.length}`);
  assert.ok(outstanding.length >= 10 && outstanding.length <= 14, `outstanding rows ${outstanding.length}`);
});

test("FIN-01: ids, dates, value dates, amounts, running balance and channel mix", () => {
  const channels = new Set(["ach", "wire", "check", "card", "fee", "interest", "transfer"]);
  let running = toCents(summary.opening_balance);
  bank.forEach((r, i) => {
    assert.equal(r.txn_id, `BNK-202603-${String(i + 1).padStart(4, "0")}`);
    assert.ok(r.posted_date >= PERIOD.start && r.posted_date <= PERIOD.end, `${r.txn_id} posted outside period`);
    assert.ok(r.value_date >= r.posted_date, `${r.txn_id} value date before posted date`);
    if (i > 0) assert.ok(r.posted_date >= bank[i - 1].posted_date, "bank rows must be in posting order");
    assert.ok(r.type === "credit" || r.type === "debit");
    assert.match(r.amount, /^\d+\.\d{2}$/, `${r.txn_id} amount not a 2dp decimal`);
    assert.ok(toCents(r.amount) > 0, `${r.txn_id} amount not positive`);
    assert.ok(channels.has(r.channel), `${r.txn_id} channel ${r.channel}`);
    running += r.type === "credit" ? toCents(r.amount) : -toCents(r.amount);
    assert.equal(toCents(r.running_balance), running, `${r.txn_id} running balance drifted`);
    assert.ok(running >= 0, `${r.txn_id} running balance negative`);
  });
  for (const ch of channels) assert.ok(bank.some((r) => r.channel === ch), `no ${ch} rows`);
  assert.equal(toCents(summary.ending_balance), running);
  assert.equal(summary.credit_count, bankCredits.length);
  assert.equal(summary.debit_count, bankDebits.length);
  assert.equal(summary.transaction_count, bank.length);
  assert.deepEqual(summary.period, { start: PERIOD.start, end: PERIOD.end });
  assert.equal(summary.account_holder.canon_id, ACCOUNT_HOLDER.canon_id);
  assert.equal(summary.bank.canon_id, BANK.canon_id);
  assert.equal(summary.account.gl_account, OPERATING_CASH_ACCOUNT.code);
});

test("FIN-02: ids in posting order, one populated side per row, cash account, sources, dates inside the period", () => {
  const sources = new Set(["ap", "ar", "payroll", "manual", "bank_fee"]);
  gl.forEach((r, i) => {
    assert.equal(r.je_id, `JE-202603-${String(i + 1).padStart(4, "0")}`);
    assert.ok(r.posting_date >= PERIOD.start && r.posting_date <= PERIOD.end, `${r.je_id} posted outside period`);
    if (i > 0) assert.ok(r.posting_date >= gl[i - 1].posting_date, "gl rows must be in posting order");
    assert.equal(r.gl_account, OPERATING_CASH_ACCOUNT.code);
    assert.ok((r.debit === "") !== (r.credit === ""), `${r.je_id} must have exactly one of debit/credit`);
    const amt = r.debit === "" ? r.credit : r.debit;
    assert.match(amt, /^\d+\.\d{2}$/, `${r.je_id} amount not a 2dp decimal`);
    assert.ok(toCents(amt) > 0, `${r.je_id} amount not positive`);
    assert.ok(sources.has(r.source), `${r.je_id} source ${r.source}`);
  });
  for (const s of sources) assert.ok(gl.some((r) => r.source === s), `no ${s} rows`);
});

test("FIN-02: prepared_by is a roster Staff Accountant, the reviewer is a roster Controller, neither is the SoD-conflict row", () => {
  const roster = buildRoster(createRng("CORE-04", "roster"));
  const byId = new Map(roster.map((r) => [r.employee_id, r]));
  const preparers = new Set(gl.map((r) => r.prepared_by));
  assert.deepEqual([...preparers], [PREPARER_EMPLOYEE_ID]);
  for (const empId of [PREPARER_EMPLOYEE_ID, REVIEWER_EMPLOYEE_ID]) {
    const row = byId.get(empId);
    assert.ok(row, `${empId} not in the CORE-04 roster`);
    assert.equal(row.department, "Finance");
    assert.equal(row.employment_status, "active");
    assert.notEqual(row.finance_system_role, SOD_CONFLICT_ROLE, `${empId} is the planted SoD-conflict row`);
  }
  assert.equal(byId.get(PREPARER_EMPLOYEE_ID).role_title, "Staff Accountant");
  assert.equal(byId.get(REVIEWER_EMPLOYEE_ID).role_title, "Controller");
  assert.notEqual(PREPARER_EMPLOYEE_ID, REVIEWER_EMPLOYEE_ID);
});

test("FIN-01/02: every counterparty is a canon company, a CORE-03 customer account, or a declared neutral vendor", () => {
  const crmFiles = generateCrmSeed({ rng: (stream) => createRng("CORE-03", stream) });
  const crm = JSON.parse(crmFiles.find((f) => f.path === "crm-seed.json").content);
  const allowed = new Set([
    ...[...canon.values()].map((c) => c.name),
    ...crm.accounts.map((a) => a.name),
    ...CANON_VENDORS.map((v) => v.name),
    ...NEUTRAL_VENDORS,
    ACCOUNT_HOLDER.name,
    BANK.name,
  ]);
  for (const r of [...bank, ...gl]) {
    assert.ok(allowed.has(r.counterparty), `unexpected counterparty "${r.counterparty}"`);
  }
  for (const r of outstanding) assert.ok(allowed.has(r.payee), `unexpected payee "${r.payee}"`);
  assert.ok(bank.some((r) => r.counterparty === "Amberfield Logistics"), "co-102 should appear as a paying customer");
  for (const v of CANON_VENDORS) assert.ok(gl.some((r) => r.counterparty === v.name), `${v.canon_id} ${v.name} never paid`);
});

test("planted 1: exactly one pair of bank credits share amount and reference, and the GL records that receipt once", () => {
  const groups = new Map();
  for (const r of bankCredits) {
    const k = key(r.reference, r.amount);
    groups.set(k, (groups.get(k) ?? 0) + 1);
  }
  const dupKeys = [...groups.entries()].filter(([, n]) => n > 1);
  assert.equal(dupKeys.length, 1, "exactly one duplicated credit pair");
  assert.equal(dupKeys[0][1], 2, "the duplicate is a pair, not a triple");
  const [dupKey] = dupKeys[0];
  assert.equal(glReceipts.filter((r) => key(r.reference, r.debit) === dupKey).length, 1, "GL holds the receipt once");
  const pair = bankCredits.filter((r) => key(r.reference, r.amount) === dupKey);
  assert.equal(pair[0].description, pair[1].description, "the feed duplicated the record verbatim");
  const gap = (Date.parse(pair[1].posted_date) - Date.parse(pair[0].posted_date)) / 86400000;
  assert.ok(gap >= 1 && gap <= 2, `duplicate posted ${gap} days apart`);
});

test("planted 2 and 3: exactly two bank debits have no GL match; one is a fee with no GL row, one is a vendor ACH whose GL amount is a transposition", () => {
  const unmatched = bankDebits.filter((r) => !glPaymentKeys.has(key(r.reference, r.amount)));
  assert.equal(unmatched.length, 2);
  const fee = unmatched.find((r) => r.channel === "fee");
  const ach = unmatched.find((r) => r.channel === "ach");
  assert.ok(fee, "unmatched fee debit missing");
  assert.ok(ach, "unmatched vendor ACH debit missing");
  assert.equal(glPayments.filter((r) => r.reference === fee.reference).length, 0, "the fee has no GL row at all");
  const glSide = glPayments.filter((r) => r.reference === ach.reference);
  assert.equal(glSide.length, 1, "the vendor ACH has exactly one GL row under its reference");
  assert.notEqual(glSide[0].credit, ach.amount);
  assert.equal(toCents(glSide[0].credit), transposeDollars(toCents(ach.amount)), "GL amount is the transposition of the bank amount");
  assert.equal(Math.abs(toCents(glSide[0].credit) - toCents(ach.amount)) % 900, 0, "a transposition differs by a multiple of 9 dollars");
  assert.equal(glSide[0].source, "ap");
});

test("planted 4: exactly one GL receipt has no bank counterpart in the statement, and it is posted on the statement end date", () => {
  const inTransit = glReceipts.filter((r) => !bankCreditKeys.has(key(r.reference, r.debit)));
  assert.equal(inTransit.length, 1);
  assert.equal(inTransit[0].posting_date, PERIOD.end);
  assert.equal(inTransit[0].source, "ar");
});

test("FIN-03: outstanding checks were issued in March, resolve to GL check rows, and are absent from the bank statement", () => {
  const glById = new Map(gl.map((r) => [r.je_id, r]));
  const bankCheckRefs = new Set(bank.filter((r) => r.channel === "check").map((r) => r.reference));
  const numbers = outstanding.map((r) => Number(r.check_number));
  for (const r of outstanding) {
    assert.equal(r.status, "outstanding");
    assert.ok(r.issue_date >= PERIOD.start && r.issue_date <= PERIOD.end, `check ${r.check_number} not issued in March`);
    assert.match(r.amount, /^\d+\.\d{2}$/);
    assert.ok(toCents(r.amount) > 0);
    const je = glById.get(r.gl_je_id);
    assert.ok(je, `${r.gl_je_id} not in FIN-02`);
    assert.equal(je.reference, r.check_number);
    assert.equal(je.credit, r.amount);
    assert.equal(je.posting_date, r.issue_date);
    assert.equal(je.counterparty, r.payee);
    assert.equal(je.source, "ap");
    assert.ok(!bankCheckRefs.has(r.check_number), `check ${r.check_number} cleared the bank but is listed outstanding`);
  }
  assert.equal(new Set(numbers).size, numbers.length, "check numbers unique");
  // Every other GL check row did clear: same number series, no gaps between cleared and outstanding.
  const glChecks = gl.filter((r) => /^\d{5}$/.test(r.reference) && r.credit !== "");
  const outstandingSet = new Set(outstanding.map((r) => r.check_number));
  for (const r of glChecks) {
    if (!outstandingSet.has(r.reference)) assert.ok(bankCheckRefs.has(r.reference), `check ${r.reference} neither cleared nor outstanding`);
  }
  assert.equal(glChecks.length, bankCheckRefs.size + outstanding.length);
});

test("tie-out: adjusted bank balance equals adjusted book balance to the cent, recomputed from the files", () => {
  const opening = toCents(summary.opening_balance);
  const endingBank = toCents(summary.ending_balance);
  const endingGl = gl.reduce((s, r) => s + (r.debit === "" ? -toCents(r.credit) : toCents(r.debit)), opening);
  const outstandingTotal = outstanding.reduce((s, r) => s + toCents(r.amount), 0);
  const inTransit = glReceipts.find((r) => !bankCreditKeys.has(key(r.reference, r.debit)));
  const dupCounts = new Map();
  for (const r of bankCredits) dupCounts.set(key(r.reference, r.amount), (dupCounts.get(key(r.reference, r.amount)) ?? 0) + 1);
  const dupRow = bankCredits.find((r) => dupCounts.get(key(r.reference, r.amount)) === 2);
  const unmatchedDebits = bankDebits.filter((r) => !glPaymentKeys.has(key(r.reference, r.amount)));
  const fee = unmatchedDebits.find((r) => r.channel === "fee");
  const ach = unmatchedDebits.find((r) => r.channel === "ach");
  const glTransposed = glPayments.find((r) => r.reference === ach.reference);

  const adjustedBank = endingBank + toCents(inTransit.debit) - outstandingTotal - toCents(dupRow.amount);
  const adjustedBook = endingGl - toCents(fee.amount) + (toCents(glTransposed.credit) - toCents(ach.amount));
  assert.equal(adjustedBank, adjustedBook);
  assert.notEqual(endingBank, endingGl, "the raw balances should differ before adjustment");
});

test("FIN-01/02/03 regenerate byte-identical across a second in-process run", () => {
  for (const [id, first] of [["FIN-01", fin01], ["FIN-02", fin02], ["FIN-03", fin03]]) {
    const again = generateArtifact(specs.byId.get(id), canon);
    assert.equal(again.length, first.length);
    for (let i = 0; i < first.length; i++) {
      assert.equal(again[i].path, first[i].path);
      assert.equal(again[i].content, first[i].content, `${id}: ${first[i].path} differs between runs`);
    }
  }
});

test("transposeDollars swaps the tens and units digits and always changes the amount", () => {
  assert.equal(transposeDollars(451760), 457160); // 4,517.60 -> 4,571.60
  assert.equal(transposeDollars(1200050), 1201050); // equal digits: nudge units first, 12,000.50 -> 12,010.50
  assert.equal(transposeDollars(3300), 4300); // 33.00 -> 43.00
  for (const c of [451760, 1200050, 3300, 999999]) assert.notEqual(transposeDollars(c), c);
});

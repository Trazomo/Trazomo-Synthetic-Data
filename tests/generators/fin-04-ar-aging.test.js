// FIN-04 ar-aging-export: the AR subledger of co-002 aged at 2026-03-31.
//
// Every assertion here is structural. It counts shapes (one credit memo with no
// application, five non-empty buckets, one open_balance value that occurs
// exactly once) and recomputes the aging and the summary from the file itself,
// but never names a document number, a customer-specific amount or the row that
// carries a planted feature: those live only in private trazomo content keyed
// to the data-pack tag (answer-key rule, datagen/README.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { createRng } from "../../datagen/src/seed.js";
import { buildRoster } from "../../datagen/src/generators/core-04-people-roster.js";
import { generate as generateCrmSeed } from "../../datagen/src/generators/core-03-crm-seed.js";
import { AS_OF, BUCKETS, AR_OWNER_EMPLOYEE_IDS } from "../../datagen/src/generators/fin-04-ar-aging.js";
import { SOD_CONFLICT_ROLE } from "../../datagen/src/generators/fin-01-cash-recon.js";
import { AR_CONTROL_ACCOUNT } from "../../datagen/src/generators/fin-22-chart-of-accounts.js";
import { addDays, diffDays } from "../../datagen/src/dates.js";

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
const TERM_DAYS = { net_15: 15, net_30: 30, net_45: 45, net_60: 60 };

// Generate the pack once for the whole file (pure functions, so this is safe).
const fin04 = generateArtifact(specs.byId.get("FIN-04"), canon);
const agingTable = csvTable(fileByPath(fin04, "ar-aging-export.csv").content);
const summary = JSON.parse(fileByPath(fin04, "ar-aging-summary.json").content);
const aging = agingTable.rows;
const invoices = aging.filter((r) => r.document_type === "invoice");
const creditMemos = aging.filter((r) => r.document_type === "credit_memo");

const crmFiles = generateCrmSeed({ rng: (stream) => createRng("CORE-03", stream) });
const crm = JSON.parse(crmFiles.find((f) => f.path === "crm-seed.json").content);
const eligibleCustomers = crm.accounts.filter(
  (a) => a.status === "customer" && a.duplicate_of_account_id === "" && a.stale_flag === "false"
);
const customerById = new Map(eligibleCustomers.map((a) => [a.account_id, a]));
const roster = buildRoster(createRng("CORE-04", "roster"));
const rosterById = new Map(roster.map((r) => [r.employee_id, r]));

function bucketFor(daysPastDue) {
  if (daysPastDue <= 0) return "current";
  if (daysPastDue <= 30) return "1-30";
  if (daysPastDue <= 60) return "31-60";
  if (daysPastDue <= 90) return "61-90";
  return "90+";
}

test("FIN-04: header equals the spec columns, both files ship, row count lands in the target range", () => {
  const spec = specs.byId.get("FIN-04");
  assert.deepEqual(agingTable.cols, spec.columns);
  assert.equal(fin04.length, 2, "FIN-04 ships the aging CSV and the summary JSON");
  assert.equal(fin04[0].path, "ar-aging-export.csv");
  assert.equal(fin04[1].path, "ar-aging-summary.json");
  assert.ok(aging.length >= 140 && aging.length <= 160, `expected 140..160 aging rows, got ${aging.length}`);
  assert.equal(summary.generated_from_spec, "FIN-04");
  assert.equal(summary.as_of, AS_OF);
  assert.equal(summary.control_account.code, AR_CONTROL_ACCOUNT.code);
  assert.equal(summary.control_account.name, AR_CONTROL_ACCOUNT.name);
});

test("FIN-04: every customer is a live CORE-03 customer account, named as the CRM names it", () => {
  for (const row of aging) {
    const account = customerById.get(row.customer_canon_id);
    assert.ok(account, `${row.customer_canon_id} is not a CORE-03 customer account with a clean duplicate/stale flag`);
    assert.equal(row.customer_name, account.name, `${row.customer_canon_id} name does not match the CRM account name`);
    assert.equal(row.currency, "USD");
  }
  const present = new Set(aging.map((r) => r.customer_canon_id));
  assert.ok(present.has("co-102"), "the healthy enterprise payer is missing from the aging");
  assert.ok(present.has("co-103"), "the collections-problem customer is missing from the aging");
});

test("FIN-04: document numbers are well formed, unique, and disjoint from the FIN-02 reference block", () => {
  const numbers = aging.map((r) => r.document_number);
  for (const n of numbers) assert.match(n, /^(INV|CM)-20(25|26)-\d{4}$/);
  assert.equal(new Set(numbers).size, numbers.length, "document_number is not unique across the file");

  const fin02 = generateArtifact(specs.byId.get("FIN-02"), canon);
  const glRefs = new Set(csvTable(fileByPath(fin02, "gl-cash-ledger.csv").content).rows.map((r) => r.reference));
  const collisions = numbers.filter((n) => glRefs.has(n));
  assert.deepEqual(collisions, [], "an AR document open at period end also appears as a collected FIN-02 reference");
});

test("FIN-04: document and due dates sit in the aging window and due_date follows the stated terms", () => {
  for (const row of aging) {
    assert.ok(row.document_date >= "2025-11-14", `document_date ${row.document_date} is before the aging floor`);
    assert.ok(row.document_date <= AS_OF, `document_date ${row.document_date} is after the as-of date`);
    const days = TERM_DAYS[row.terms];
    assert.ok(days, `unknown terms value "${row.terms}"`);
    assert.equal(row.due_date, addDays(row.document_date, days), "due_date does not equal document_date plus terms days");
  }
  const termsSeen = new Set(aging.map((r) => r.terms));
  assert.deepEqual([...termsSeen].sort(), Object.keys(TERM_DAYS).sort(), "not every terms value is exercised");
  assert.equal(aging.filter((r) => r.document_date === "2025-11-14").length >= 1, true, "the 90+ bucket floor date is absent");
});

test("FIN-04 (T-A3): days_past_due and aging_bucket are both derived from due_date, and all five buckets are used", () => {
  for (const row of aging) {
    const expected = Math.max(0, diffDays(row.due_date, AS_OF));
    assert.equal(Number(row.days_past_due), expected, `days_past_due wrong for a document due ${row.due_date}`);
    assert.equal(row.aging_bucket, bucketFor(expected), `aging_bucket disagrees with days_past_due ${expected}`);
  }
  for (const bucket of BUCKETS) {
    assert.ok(aging.some((r) => r.aging_bucket === bucket), `bucket "${bucket}" is empty`);
  }
});

test("FIN-04 (T-A5): invoices are positive, credit memos negative, and no open balance exceeds its original", () => {
  for (const row of aging) {
    assert.match(row.original_amount, /^-?\d+\.\d{2}$/);
    assert.match(row.open_balance, /^-?\d+\.\d{2}$/);
    const original = toCents(row.original_amount);
    const open = toCents(row.open_balance);
    if (row.document_type === "invoice") {
      assert.ok(original > 0, "an invoice carries a non-positive original_amount");
      assert.ok(open > 0, "an invoice carries a non-positive open_balance");
    } else {
      assert.equal(row.document_type, "credit_memo");
      assert.ok(original < 0, "a credit memo carries a non-negative original_amount");
      assert.ok(open < 0, "a credit memo carries a non-negative open_balance");
    }
    assert.ok(Math.abs(open) <= Math.abs(original), "open_balance exceeds original_amount in magnitude");
  }
});

test("FIN-04 (T-A4): every summary figure recomputes from the CSV", () => {
  assert.equal(summary.document_count, aging.length);
  assert.equal(summary.invoice_count, invoices.length);
  assert.equal(summary.credit_memo_count, creditMemos.length);
  assert.equal(summary.customer_count, new Set(aging.map((r) => r.customer_canon_id)).size);

  assert.deepEqual(summary.buckets.map((b) => b.bucket), BUCKETS, "summary bucket order is not the fixed order");
  let total = 0;
  for (const bucket of summary.buckets) {
    const rows = aging.filter((r) => r.aging_bucket === bucket.bucket);
    assert.equal(bucket.document_count, rows.length, `bucket ${bucket.bucket} count`);
    const sum = rows.reduce((s, r) => s + toCents(r.open_balance), 0);
    assert.equal(toCents(bucket.open_balance), sum, `bucket ${bucket.bucket} open_balance`);
    total += sum;
  }
  assert.equal(toCents(summary.subledger_total), aging.reduce((s, r) => s + toCents(r.open_balance), 0));
  assert.equal(toCents(summary.subledger_total), total, "bucket totals do not add up to the subledger total");
});

test("FIN-04 (P2): exactly one credit memo is unapplied; every other one names an invoice of its own customer", () => {
  const unapplied = creditMemos.filter((r) => r.applied_to_document === "");
  assert.equal(unapplied.length, 1, `expected exactly one unapplied credit memo, found ${unapplied.length}`);
  assert.ok(creditMemos.length >= 2, "the unapplied memo needs applied siblings to be a derivable minority");

  for (const memo of creditMemos) {
    if (memo.applied_to_document === "") continue;
    const target = aging.find((r) => r.document_number === memo.applied_to_document);
    assert.ok(target, "a credit memo is applied to a document that is not in the file");
    assert.equal(target.document_type, "invoice", "a credit memo is applied to something that is not an invoice");
    assert.equal(target.customer_canon_id, memo.customer_canon_id, "a credit memo is applied across customers");
  }
  for (const row of invoices) {
    assert.equal(row.applied_to_document, "", "an invoice carries an applied_to_document");
  }
});

test("FIN-04 (P1 support): at least one open_balance value occurs exactly once in the file", () => {
  const counts = new Map();
  for (const row of aging) {
    const key = row.open_balance;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const unique = [...counts.values()].filter((n) => n === 1).length;
  assert.ok(unique >= 1, "no open_balance value is unique, so the GL delta rule could not resolve to one row");
});

test("FIN-04: every AR owner is an active Finance AR Clerk and never the roster's SoD-conflict row", () => {
  const owners = new Set(aging.map((r) => r.ar_owner_employee_id));
  for (const id of owners) {
    assert.ok(AR_OWNER_EMPLOYEE_IDS.includes(id), `${id} is not one of the declared AR owners`);
    const row = rosterById.get(id);
    assert.ok(row, `${id} is not in the CORE-04 roster`);
    assert.equal(row.department, "Finance");
    assert.equal(row.role_title, "AR Clerk");
    assert.equal(row.employment_status, "active");
    assert.notEqual(row.finance_system_role, SOD_CONFLICT_ROLE, `${id} is the planted SoD-conflict row`);
  }
  assert.equal(owners.size, AR_OWNER_EMPLOYEE_IDS.length, "not every declared AR owner appears in the file");
});

test("FIN-04: generateArtifact is byte-identical across two in-process runs", () => {
  const runA = generateArtifact(specs.byId.get("FIN-04"), canon);
  const runB = generateArtifact(specs.byId.get("FIN-04"), canon);
  assert.equal(runA.length, runB.length);
  for (let i = 0; i < runA.length; i++) {
    assert.equal(runA[i].path, runB[i].path);
    assert.equal(runA[i].content, runB[i].content, `${runA[i].path} differs between runs`);
  }
});

// FIN-06 / FIN-07 / FIN-08 / FIN-10 / FIN-11: the March 2026 procure-to-pay pack.
//
// Every assertion here is structural. It counts shapes (one price mismatch, one
// duplicated invoice number, one vendor with two remit accounts, one open line
// with an unaccrued receipt) and recomputes the tie-outs from the files, but it
// never names a po_number, invoice_id, bill_id or amount: those live only in
// private trazomo content keyed to the data-pack tag (answer-key rule). The two
// dollar figures that do appear come from the already-published CORE-01
// agreement, not from this pack.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { createRng } from "../../datagen/src/seed.js";
import { buildRoster } from "../../datagen/src/generators/core-04-people-roster.js";
import {
  CANON_VENDORS, NEUTRAL_VENDORS, ACCOUNT_HOLDER, BANK, SOD_CONFLICT_ROLE,
} from "../../datagen/src/generators/fin-01-cash-recon.js";
import {
  PAYMENT_RUN_ID, RUN_DATE, AS_OF, CANON_VENDORS_EXTENDED, DIRECTOR_THRESHOLD_CENTS,
  AP_REQUESTER_EMPLOYEE_ID, AP_APPROVER_EMPLOYEE_ID, PO_APPROVERS, AVOIDED_EMPLOYEE_IDS,
} from "../../datagen/src/generators/fin-06-procure-to-pay.js";
import { buildChartOfAccounts } from "../../datagen/src/generators/fin-22-chart-of-accounts.js";

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
const lineKey = (r) => `${r.po_number}|${r.po_line}`;

// Generate the pack once for the whole file (pure functions, so this is safe).
const fin06 = generateArtifact(specs.byId.get("FIN-06"), canon);
const fin07 = generateArtifact(specs.byId.get("FIN-07"), canon);
const fin08 = generateArtifact(specs.byId.get("FIN-08"), canon);
const fin10 = generateArtifact(specs.byId.get("FIN-10"), canon);
const fin11 = generateArtifact(specs.byId.get("FIN-11"), canon);
const poTable = csvTable(fileByPath(fin06, "purchase-orders.csv").content);
const invoiceTable = csvTable(fileByPath(fin07, "vendor-invoices.csv").content);
const paymentTable = csvTable(fileByPath(fin08, "payment-run.csv").content);
const openPoTable = csvTable(fileByPath(fin10, "open-pos.csv").content);
const rollForward = JSON.parse(fileByPath(fin10, "accrual-rollforward.json").content);
const billTable = csvTable(fileByPath(fin11, "vendor-bills.csv").content);

const pos = poTable.rows;
const invoices = invoiceTable.rows;
const payments = paymentTable.rows;
const openPos = openPoTable.rows;
const bills = billTable.rows;

const poByLine = new Map(pos.map((r) => [lineKey(r), r]));
const poNumbers = new Set(pos.map((r) => r.po_number));
const invoiceById = new Map(invoices.map((r) => [r.invoice_id, r]));
const closeBatch = csvTable(fileByPath(generateArtifact(specs.byId.get("FIN-09"), canon), "journal-entries-batch.csv").content).rows;
const chart = buildChartOfAccounts();
const chartByCode = new Map(chart.map((r) => [r.account_code, r]));
const roster = buildRoster(createRng("CORE-04", "roster"));
const rosterById = new Map(roster.map((r) => [r.employee_id, r]));

test("FIN-06/07/08/10/11: headers equal the spec columns and row counts land in the target ranges", () => {
  assert.deepEqual(poTable.cols, specs.byId.get("FIN-06").columns);
  assert.deepEqual(invoiceTable.cols, specs.byId.get("FIN-07").columns);
  assert.deepEqual(paymentTable.cols, specs.byId.get("FIN-08").columns);
  assert.deepEqual(openPoTable.cols, specs.byId.get("FIN-10").columns);
  assert.deepEqual(billTable.cols, specs.byId.get("FIN-11").columns);

  assert.ok(pos.length >= 84 && pos.length <= 96, `purchase-order lines: ${pos.length}`);
  assert.equal(poNumbers.size, 48);
  assert.ok(invoices.length >= 68 && invoices.length <= 78, `invoices: ${invoices.length}`);
  assert.ok(payments.length >= 38 && payments.length <= 46, `payments: ${payments.length}`);
  assert.ok(openPos.length >= 30 && openPos.length <= 40, `open purchase-order lines: ${openPos.length}`);
  assert.ok(bills.length >= 50 && bills.length <= 60, `bills: ${bills.length}`);

  for (const r of pos) assert.match(r.po_number, /^PO-2026-0\d{3}$/);
  for (const r of invoices) assert.match(r.invoice_id, /^VINV-2026-0\d{3}$/);
  for (const r of payments) assert.match(r.payment_id, /^PAY-2026-0\d{3}$/);
  for (const r of bills) assert.match(r.bill_id, /^BILL-2026-0\d{3}$/);
  assert.equal(new Set(invoices.map((r) => r.invoice_id)).size, invoices.length);
  assert.equal(new Set(payments.map((r) => r.payment_id)).size, payments.length);
  assert.equal(new Set(bills.map((r) => r.bill_id)).size, bills.length);
  for (const r of [...pos, ...invoices, ...payments, ...openPos, ...bills]) assert.equal(r.currency, "USD");
});

test("FIN-06: po_line runs 1..n inside every purchase order and every gl_account is an active chart code", () => {
  const byPo = new Map();
  for (const r of pos) {
    if (!byPo.has(r.po_number)) byPo.set(r.po_number, []);
    byPo.get(r.po_number).push(Number(r.po_line));
  }
  for (const [po, lines] of byPo) {
    assert.deepEqual(lines.slice().sort((a, b) => a - b), lines, `${po}: lines are out of order`);
    assert.deepEqual(lines, lines.map((_, i) => i + 1), `${po}: po_line is not 1..n`);
  }
  for (const r of pos) {
    const account = chartByCode.get(r.gl_account);
    assert.ok(account, `${r.gl_account} is not on the FIN-22 chart`);
    assert.equal(account.active, "true", `${r.gl_account} is inactive`);
    assert.ok(["open", "partially_received", "received", "closed"].includes(r.status), r.status);
    assert.ok(r.po_date >= "2026-01-05" && r.po_date <= "2026-03-27", r.po_date);
    assert.ok(r.expected_delivery_date > r.po_date);
  }
});

test("T-B1 / T-B2: line and invoice extensions are exact to the cent", () => {
  for (const r of pos) {
    assert.equal(toCents(r.line_amount), Number(r.quantity_ordered) * toCents(r.unit_price), `T-B2 ${lineKey(r)}`);
  }
  for (const r of invoices) {
    assert.equal(toCents(r.invoice_amount), Number(r.quantity_billed) * toCents(r.unit_price), `T-B1 ${r.invoice_id}`);
  }
});

test("T-B6: no purchase-order line is billed beyond what was ordered", () => {
  const billed = new Map();
  for (const r of invoices) {
    if (!poByLine.has(lineKey(r))) continue;
    billed.set(lineKey(r), (billed.get(lineKey(r)) ?? 0) + Number(r.quantity_billed));
  }
  for (const [key, qty] of billed) {
    assert.ok(qty <= Number(poByLine.get(key).quantity_ordered), `T-B6 ${key}: billed ${qty}`);
  }
});

test("P5: exactly one invoice cites a purchase order that is not on the file", () => {
  const orphans = invoices.filter((r) => r.po_number !== "" && !poNumbers.has(r.po_number));
  assert.equal(orphans.length, 1);
  assert.notEqual(orphans[0].po_number, "");
});

test("P3: exactly one invoice bills the ordered quantity at a unit price 2 to 6 percent off its purchase-order line", () => {
  const mismatched = invoices.filter((r) => {
    const line = poByLine.get(lineKey(r));
    return line
      && Number(r.quantity_billed) === Number(line.quantity_ordered)
      && toCents(r.unit_price) !== toCents(line.unit_price);
  });
  assert.equal(mismatched.length, 1);
  const line = poByLine.get(lineKey(mismatched[0]));
  assert.equal(Number(mismatched[0].quantity_billed), Number(line.quantity_ordered));
  assert.notEqual(toCents(mismatched[0].unit_price), toCents(line.unit_price));
  const delta = (toCents(mismatched[0].unit_price) - toCents(line.unit_price)) / toCents(line.unit_price);
  assert.ok(delta >= 0.02 && delta <= 0.06, `price delta ${(delta * 100).toFixed(2)} percent`);
});

test("T-B3: every other invoice that resolves to a purchase-order line matches its price and stays inside its quantity", () => {
  const mismatchedIds = new Set(invoices.filter((r) => {
    const line = poByLine.get(lineKey(r));
    return line && toCents(r.unit_price) !== toCents(line.unit_price);
  }).map((r) => r.invoice_id));
  assert.equal(mismatchedIds.size, 1);
  for (const r of invoices) {
    const line = poByLine.get(lineKey(r));
    if (!line || mismatchedIds.has(r.invoice_id)) continue;
    assert.equal(toCents(r.unit_price), toCents(line.unit_price), `T-B3 price ${r.invoice_id}`);
    assert.ok(Number(r.quantity_billed) <= Number(line.quantity_ordered), `T-B3 quantity ${r.invoice_id}`);
  }
});

test("P4: exactly one vendor invoice number arrives twice, same line and amount, 2 to 5 days apart, both in the run", () => {
  const groups = new Map();
  for (const r of invoices) {
    const key = `${r.vendor_canon_id}|${r.invoice_number}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const repeated = [...groups.values()].filter((g) => g.length > 1);
  assert.equal(repeated.length, 1);
  const [a, b] = repeated[0].sort((x, y) => (x.received_date < y.received_date ? -1 : 1));
  assert.equal(repeated[0].length, 2);
  assert.equal(a.po_number, b.po_number);
  assert.equal(a.po_line, b.po_line);
  assert.equal(toCents(a.invoice_amount), toCents(b.invoice_amount));
  assert.notEqual(a.invoice_id, b.invoice_id);
  const gap = (Date.parse(b.received_date) - Date.parse(a.received_date)) / 86400000;
  assert.ok(gap >= 2 && gap <= 5, `received ${gap} days apart`);
  const paidIds = new Set(payments.map((p) => p.invoice_id));
  assert.ok(paidIds.has(a.invoice_id) && paidIds.has(b.invoice_id), "both copies must sit in the proposed run");
});

test("P6: exactly one vendor shows two remit-to accounts, the new one on its latest received date and carried into the run", () => {
  const byVendor = new Map();
  for (const r of invoices) {
    if (!byVendor.has(r.vendor_canon_id)) byVendor.set(r.vendor_canon_id, new Set());
    byVendor.get(r.vendor_canon_id).add(r.remit_to_account_masked);
  }
  const changed = [...byVendor.entries()].filter(([, accounts]) => accounts.size > 1);
  assert.equal(changed.length, 1);
  const [vendorId] = changed[0];
  assert.equal(vendorId, "co-107", "canon assigns the bank-detail change to co-107");
  const vendorInvoices = invoices.filter((r) => r.vendor_canon_id === vendorId)
    .sort((a, b) => (a.received_date < b.received_date ? -1 : a.received_date > b.received_date ? 1 : a.invoice_id < b.invoice_id ? -1 : 1));
  const latest = vendorInvoices[vendorInvoices.length - 1];
  const earlier = new Set(vendorInvoices.slice(0, -1).map((r) => r.remit_to_account_masked));
  assert.equal(earlier.size, 1, "the vendor's earlier invoices must agree on one account");
  assert.ok(!earlier.has(latest.remit_to_account_masked), "the changed account must be the one on the latest invoice");
  const payment = payments.find((p) => p.invoice_id === latest.invoice_id);
  assert.ok(payment, "the changed-account invoice must be in the proposed run");
  assert.equal(payment.remit_to_account_masked, latest.remit_to_account_masked);
  for (const r of [...invoices, ...payments]) assert.match(r.remit_to_account_masked, /^XXXX-\d{4}$/);
});

test("FIN-08: one proposed run, dated in the close window, pending approval, every amount its own invoice's", () => {
  assert.equal(new Set(payments.map((p) => p.payment_run_id)).size, 1);
  for (const p of payments) {
    assert.equal(p.payment_run_id, PAYMENT_RUN_ID);
    assert.equal(p.run_date, RUN_DATE);
    assert.ok(p.run_date >= "2026-04-01" && p.run_date <= "2026-04-07", "the run sits inside the March close window");
    assert.equal(p.status, "pending_approval");
    assert.ok(["ach", "wire", "check"].includes(p.payment_method), p.payment_method);
    const invoice = invoiceById.get(p.invoice_id);
    assert.ok(invoice, `${p.payment_id} resolves to no invoice`);
    assert.equal(toCents(p.payment_amount), toCents(invoice.invoice_amount), "T-B4 per payment");
    assert.equal(p.invoice_number, invoice.invoice_number);
    assert.equal(p.vendor_canon_id, invoice.vendor_canon_id);
    assert.equal(p.po_number, poNumbers.has(invoice.po_number) ? invoice.po_number : "");
  }
  assert.equal(new Set(payments.map((p) => p.invoice_id)).size, payments.length, "an invoice is paid at most once");
});

test("T-B4 / T-B5: the run totals its own invoices and overpays by exactly the duplicated one", () => {
  const runTotal = payments.reduce((s, p) => s + toCents(p.payment_amount), 0);
  const invoiceTotal = payments.reduce((s, p) => s + toCents(invoiceById.get(p.invoice_id).invoice_amount), 0);
  assert.equal(runTotal, invoiceTotal, "T-B4");

  const distinct = new Map();
  for (const p of payments) distinct.set(`${p.vendor_canon_id}|${p.invoice_number}`, toCents(p.payment_amount));
  const distinctTotal = [...distinct.values()].reduce((s, n) => s + n, 0);
  const groups = new Map();
  for (const r of invoices) {
    const key = `${r.vendor_canon_id}|${r.invoice_number}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const duplicated = [...groups.values()].find((g) => g.length > 1);
  assert.equal(runTotal - distinctTotal, toCents(duplicated[0].invoice_amount), "T-B5");
});

test("FIN-10: every open line resolves to a purchase-order line and its values recompute", () => {
  const invoicedByLine = new Map();
  for (const r of invoices) {
    if (!poByLine.has(lineKey(r))) continue;
    invoicedByLine.set(lineKey(r), (invoicedByLine.get(lineKey(r)) ?? 0) + toCents(r.invoice_amount));
  }
  assert.ok(new Set(openPos.map((r) => r.po_number)).size >= 18);
  for (const r of openPos) {
    const line = poByLine.get(lineKey(r));
    assert.ok(line, `${lineKey(r)} is not a purchase-order line`);
    assert.equal(r.as_of, AS_OF);
    assert.equal(r.vendor_canon_id, line.vendor_canon_id);
    assert.equal(r.gl_account, line.gl_account);
    assert.equal(Number(r.quantity_ordered), Number(line.quantity_ordered));
    assert.ok(Number(r.quantity_received) <= Number(r.quantity_ordered), `${lineKey(r)} over-received`);
    assert.ok(Number(r.quantity_invoiced) < Number(r.quantity_ordered), `${lineKey(r)} is not actually open`);
    assert.equal(toCents(r.ordered_value), Number(r.quantity_ordered) * toCents(r.unit_price));
    assert.equal(toCents(r.received_value), Number(r.quantity_received) * toCents(r.unit_price), `T-D4 received ${lineKey(r)}`);
    assert.equal(toCents(r.invoiced_value), invoicedByLine.get(lineKey(r)) ?? 0, `T-D4 invoiced ${lineKey(r)}`);
    if (Number(r.quantity_received) > 0) assert.match(r.last_receipt_date, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test("P12: exactly one open line was received, never invoiced and never accrued", () => {
  const residual = (r) => toCents(r.received_value) - toCents(r.invoiced_value) - toCents(r.accrued_value);
  const unaccrued = openPos.filter((r) => residual(r) > 0);
  assert.equal(unaccrued.length, 1);
  for (const r of openPos) if (r !== unaccrued[0]) assert.equal(residual(r), 0, `${lineKey(r)} does not resolve to zero`);
  const target = unaccrued[0];
  assert.equal(toCents(target.invoiced_value), 0, "the missing accrual sits on a line with no invoice at all");
  assert.ok(!bills.some((b) => b.po_number === target.po_number), "no bill may cite the un-accrued purchase order");
  assert.ok(!invoices.some((r) => lineKey(r) === lineKey(target)), "no invoice may cite the un-accrued line");
  // Nothing anywhere in the universe accounts for this receipt, which is the
  // whole point of the plant. The close batch cites no purchase order at all,
  // so the rule holds for every purchase order in the pack and no constant in
  // either generator narrows where the plant is allowed to land.
  const cited = new Set(closeBatch.map((r) => r.source_document).filter(Boolean));
  assert.ok(!cited.has(target.po_number), "no close entry may cite the un-accrued purchase order");
  assert.equal([...cited].filter((d) => d.startsWith("PO-")).length, 0,
    "the close batch cites a purchase order, which would reintroduce the reserved-block coupling");
});

test("T-D1 / T-D3: the accrual roll-forward closes from its own movements and reconciles to the open lines", () => {
  assert.equal(rollForward.generated_from_spec, "FIN-10");
  assert.deepEqual(rollForward.entity, ACCOUNT_HOLDER);
  assert.deepEqual(rollForward.period, { start: "2026-03-01", end: AS_OF });
  assert.equal(rollForward.currency, "USD");
  assert.equal(rollForward.account.code, "2010");
  assert.equal(rollForward.account.name, chartByCode.get("2010").account_name);
  assert.equal(
    toCents(rollForward.opening_balance) + toCents(rollForward.accruals_booked) - toCents(rollForward.reversals),
    toCents(rollForward.closing_balance), "T-D1"
  );
  assert.equal(rollForward.open_po_count, new Set(openPos.map((r) => r.po_number)).size);
  const receivedNotInvoiced = openPos.reduce((s, r) => s + toCents(r.received_value) - toCents(r.invoiced_value), 0);
  const accrued = openPos.reduce((s, r) => s + toCents(r.accrued_value), 0);
  assert.equal(toCents(rollForward.received_not_invoiced_total), receivedNotInvoiced, "T-D3 received not invoiced");
  assert.equal(toCents(rollForward.accrued_total), accrued, "T-D3 accrued");
  const residual = (r) => toCents(r.received_value) - toCents(r.invoiced_value) - toCents(r.accrued_value);
  const plantResidual = openPos.reduce((s, r) => s + Math.max(0, residual(r)), 0);
  assert.equal(receivedNotInvoiced - accrued, plantResidual, "T-D3 the gap is exactly the missing accrual");
  assert.equal(toCents(rollForward.closing_balance), accrued);
});

test("P13 / P14: exactly two bills span more than one calendar month, one scheduled and one not", () => {
  const month = (d) => d.slice(0, 7);
  const multiMonth = bills.filter((b) => month(b.service_period_start) !== month(b.service_period_end));
  assert.equal(multiMonth.length, 2);
  for (const b of bills) {
    if (multiMonth.includes(b)) continue;
    assert.equal(month(b.service_period_start), month(b.service_period_end), `${b.bill_id} straddles a month`);
    assert.equal(b.amortization_schedule_id, "", `${b.bill_id} carries a schedule it does not need`);
    assert.equal(b.monthly_amortization, "");
    assert.equal(b.months_elapsed, "");
    assert.equal(b.prepaid_balance, "");
    assert.equal(b.source_contract, "");
  }
  const scheduled = multiMonth.filter((b) => b.amortization_schedule_id !== "");
  const unscheduled = multiMonth.filter((b) => b.amortization_schedule_id === "");
  assert.equal(scheduled.length, 1, "P14: exactly one multi-month bill already has a schedule");
  assert.equal(unscheduled.length, 1, "P13: exactly one multi-month bill still needs one");

  // P14 is the CORE-01 subscription. Its figures are published in
  // artifacts/CORE-01/master-services-agreement.md section 5.2, so pinning them
  // here reveals nothing the corpus does not already say out loud.
  const p14 = scheduled[0];
  assert.equal(p14.source_contract, "CORE-01");
  assert.match(p14.amortization_schedule_id, /^AMS-2026-00\d$/);
  assert.equal(toCents(p14.bill_amount), 45000000, "T-D5 premium");
  assert.equal(toCents(p14.monthly_amortization), 3750000, "T-D5 monthly");
  assert.equal(Number(p14.months_elapsed), 2, "T-D5 months elapsed");
  assert.equal(toCents(p14.prepaid_balance), 37500000, "T-D5 balance");
  assert.equal(
    toCents(p14.prepaid_balance),
    toCents(p14.bill_amount) - Number(p14.months_elapsed) * toCents(p14.monthly_amortization),
    "T-D5 balance arithmetic"
  );
  assert.equal(p14.service_period_start, "2026-02-01");
  assert.equal(p14.service_period_end, "2027-01-31");
  assert.equal(p14.gl_account, "1200");
  assert.equal(p14.payment_status, "paid");

  // P13 is the insurance premium. Its amount is not written down here either:
  // it is read back off the drafted contract, which is the one number the two
  // artifacts have to agree on.
  const p13 = unscheduled[0];
  assert.equal(p13.source_contract, "FIN-12");
  assert.equal(p13.months_elapsed, "", "T-D6: no month is amortized before the policy attaches");
  assert.equal(p13.monthly_amortization, "");
  assert.equal(p13.prepaid_balance, "");
  assert.equal(p13.service_period_start, "2026-04-01");
  assert.equal(p13.service_period_end, "2027-03-31");
  assert.ok(p13.posted_date <= AS_OF && p13.posted_date >= "2026-03-01", "the premium posts inside March");
  assert.ok(p13.posted_date < p13.service_period_start, "the premium is paid before the policy attaches");
  assert.equal(p13.gl_account, "1210");
  assert.equal(p13.payment_status, "open");
});

test("FIN-11 to FIN-12: the drafted contract states the prepaid bill's amount to the cent", () => {
  // The only test in this repo that reads a drafted document from a structured
  // test. It earns its place because the premium is the single number the two
  // artifacts must agree on, and nothing else would catch them drifting apart.
  const month = (d) => d.slice(0, 7);
  const p13 = bills.find(
    (b) => month(b.service_period_start) !== month(b.service_period_end) && b.amortization_schedule_id === ""
  );
  assert.ok(p13, "no unscheduled multi-month bill to check the contract against");
  assert.equal(p13.source_contract, "FIN-12");
  const contract = readFileSync(join(REPO_ROOT, "artifacts", "FIN-12", "vendor-contract-insurance.md"), "utf8");
  const formatted = `$${Number(p13.bill_amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  assert.match(formatted, /^\$\d{1,3}(,\d{3})*\.\d{2}$/);
  assert.ok(contract.includes(formatted), `the contract does not state the bill amount ${formatted}`);
  // And the monthly proportion the contract publishes has to be that amount
  // over twelve, or the schedule the module builds starts from a wrong number.
  const monthlyCents = toCents(p13.bill_amount) / 12;
  assert.ok(Number.isInteger(monthlyCents), "the premium does not divide into whole cents");
  const monthly = `$${(monthlyCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  assert.ok(contract.includes(monthly), `the contract does not state the monthly proportion ${monthly}`);
  assert.ok(contract.includes(p13.service_period_start.replace(/^(\d{4})-04-01$/, "April 1, $1")),
    "the contract does not state the policy period start the bill assumes");
});

test("FIN-11: every bill is well formed and every source_contract is a known literal", () => {
  for (const b of bills) {
    assert.ok(["paid", "open"].includes(b.payment_status), b.payment_status);
    assert.ok(["", "CORE-01", "FIN-12"].includes(b.source_contract), b.source_contract);
    assert.ok(chartByCode.get(b.gl_account), `${b.gl_account} is not on the chart`);
    assert.ok(b.posted_date >= b.bill_date, `${b.bill_id} posted before it was billed`);
    assert.ok(toCents(b.bill_amount) > 0);
    assert.ok(b.service_period_start <= b.service_period_end);
    if (b.po_number !== "") assert.ok(poNumbers.has(b.po_number), `${b.bill_id} cites an unknown purchase order`);
  }
  assert.ok(bills.some((b) => b.po_number !== ""), "some bills are purchase-order backed");
  assert.ok(bills.some((b) => b.po_number === ""), "some bills are not");
  assert.ok(bills.some((b) => b.payment_status === "open"), "some bills are still open at the cut-off");
});

test("segregation of duties: the run has two people, purchase orders have two, and the SoD row is never used", () => {
  for (const p of payments) {
    assert.equal(p.requested_by_employee_id, AP_REQUESTER_EMPLOYEE_ID);
    assert.equal(p.approved_by_employee_id, AP_APPROVER_EMPLOYEE_ID);
    assert.notEqual(p.requested_by_employee_id, p.approved_by_employee_id);
  }
  const requester = rosterById.get(AP_REQUESTER_EMPLOYEE_ID);
  const approver = rosterById.get(AP_APPROVER_EMPLOYEE_ID);
  for (const [who, row] of [["requester", requester], ["approver", approver]]) {
    assert.ok(row, `${who} is not on the roster`);
    assert.equal(row.department, "Finance");
    assert.equal(row.employment_status, "active");
    assert.notEqual(row.finance_system_role, SOD_CONFLICT_ROLE);
  }
  assert.ok(!requester.finance_system_role.includes("Approver"), "the requester must hold no approver right");
  assert.ok(approver.finance_system_role.includes("Approver"), "the approver must hold one");

  for (const r of pos) {
    assert.notEqual(r.requested_by_employee_id, r.approved_by_employee_id);
    assert.ok(["manager", "director"].includes(r.approval_level), r.approval_level);
    assert.equal(r.approved_by_employee_id, PO_APPROVERS[r.approval_level]);
    if (toCents(r.line_amount) >= DIRECTOR_THRESHOLD_CENTS) {
      assert.equal(r.approval_level, "director", `${lineKey(r)} clears the threshold on a manager approval`);
    }
    const raiser = rosterById.get(r.requested_by_employee_id);
    assert.ok(raiser, `${r.requested_by_employee_id} is not on the roster`);
    assert.equal(raiser.employment_status, "active");
    assert.equal(raiser.level, "Manager");
  }
  // The threshold is applied at purchase-order grain, which is where an approval
  // actually happens: a $60,000 order is a director's decision even when it is
  // split into three $20,000 lines. Asserted in both directions so the spec text
  // and the data cannot drift apart again.
  const totals = new Map();
  const levels = new Map();
  for (const r of pos) {
    totals.set(r.po_number, (totals.get(r.po_number) ?? 0) + toCents(r.line_amount));
    const seen = levels.get(r.po_number);
    assert.ok(seen === undefined || seen === r.approval_level, `${r.po_number}: two approval levels on one order`);
    levels.set(r.po_number, r.approval_level);
  }
  for (const [poNumber, total] of totals) {
    assert.equal(levels.get(poNumber), total >= DIRECTOR_THRESHOLD_CENTS ? "director" : "manager",
      `${poNumber}: order total ${total} does not match its approval level`);
  }

  const everyId = new Set([
    ...pos.map((r) => r.requested_by_employee_id), ...pos.map((r) => r.approved_by_employee_id),
    ...payments.map((r) => r.requested_by_employee_id), ...payments.map((r) => r.approved_by_employee_id),
  ]);
  for (const avoided of AVOIDED_EMPLOYEE_IDS) assert.ok(!everyId.has(avoided), `${avoided} must never appear`);
  for (const empId of everyId) assert.match(empId, /^EMP-\d{4}$/);
});

test("every counterparty in the pack is a canon vendor, a screened neutral vendor, or the universe's one bank", () => {
  const allowed = new Set([
    ...CANON_VENDORS.map((v) => v.name),
    ...CANON_VENDORS_EXTENDED.map((v) => v.name),
    ...NEUTRAL_VENDORS,
  ]);
  const names = new Set([
    ...pos.map((r) => r.vendor_name), ...invoices.map((r) => r.vendor_name),
    ...payments.map((r) => r.vendor_name), ...openPos.map((r) => r.vendor_name),
    ...bills.map((r) => r.vendor_name),
  ]);
  for (const name of names) assert.ok(allowed.has(name), `unscreened counterparty name: ${name}`);
  assert.equal(names.size, 16, "the vendor population is the sixteen already-screened names");
  for (const r of [...invoices, ...payments]) assert.equal(r.remit_to_bank, BANK.name);
  const ids = new Set([...pos, ...invoices, ...payments, ...openPos, ...bills].map((r) => r.vendor_canon_id));
  for (const canonId of ids) assert.match(canonId, /^co-\d{3}$/);
  assert.ok(ids.has("co-101") && ids.has("co-105") && ids.has("co-106") && ids.has("co-107"));
});

test("FIN-06/07/08/10/11: regeneration is byte-identical", () => {
  for (const specId of ["FIN-06", "FIN-07", "FIN-08", "FIN-10", "FIN-11"]) {
    const runA = generateArtifact(specs.byId.get(specId), canon);
    const runB = generateArtifact(specs.byId.get(specId), canon);
    assert.equal(runA.length, runB.length);
    for (let i = 0; i < runA.length; i++) {
      assert.equal(runA[i].path, runB[i].path);
      assert.equal(runA[i].content, runB[i].content, `${specId}: ${runA[i].path} moved between runs`);
    }
  }
});

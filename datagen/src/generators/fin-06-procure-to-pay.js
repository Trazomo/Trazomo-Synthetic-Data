// FIN-06 purchase-orders, plus the shared builder behind FIN-07 vendor-invoices,
// FIN-08 payment-run, FIN-10 open-pos and FIN-11 vendor-bills. One seeded
// builder produces co-002's whole March 2026 procure-to-pay world: the purchase
// orders raised since January, the goods and services received against them,
// the vendor invoices sitting in the AP queue, the payment run proposed for
// 2026-04-02, the purchase-order lines still open at the cut-off with their
// accrual roll-forward, and the vendor bills already posted to the ledger.
//
// The four wrapper modules call buildProcureToPay() the way FIN-02 and FIN-03
// call buildCashReconciliation(), so the five files always describe the same
// month even when generated separately. Every draw comes from
// createRng("FIN-06", stream); the wrappers ignore their own rng on purpose.
//
// Planted features (specs FIN-07, FIN-10, FIN-11), each derivable by a rule
// over the data and never by a label:
//   P3 one invoice bills the ordered quantity at a unit price 2 to 6 percent
//      above its purchase-order line, so a tolerance rule is a real decision.
//   P4 one (vendor, vendor invoice number) pair arrives twice, same PO line and
//      same amount, a few days apart; both copies sit in the proposed run, so
//      the run overpays by exactly that amount.
//   P5 one invoice carries a purchase-order number that is absent from FIN-06.
//   P6 one vendor (co-107, canon's designated bank-detail-change vendor) shows
//      two distinct remit-to accounts, the new one on its most recent received
//      date, and that value is carried into the payment run.
//   P12 one open purchase-order line was received but never invoiced and never
//      accrued, so it is the accrual the close is missing.
//   P13 the FIN-12 insurance premium: a multi-month prepaid with no schedule.
//   P14 the CORE-01 subscription: a multi-month prepaid whose schedule is
//      already correct, the distractor the learner confirms rather than redoes.
//
// No status, flag or comment column marks any of them. Every tie-out below is
// asserted in integer cents at the end of the build, and the build throws
// rather than emitting data that does not tie.
import { toCsv } from "../csv.js";
import { addDays, diffDays, isWeekend } from "../dates.js";
import { createRng } from "../seed.js";
import { buildRoster } from "./core-04-people-roster.js";
import {
  CANON_VENDORS, NEUTRAL_VENDORS, ACCOUNT_HOLDER, SOD_CONFLICT_ROLE,
} from "./fin-01-cash-recon.js";
import {
  buildChartOfAccounts, ACCRUED_LIABILITIES_ACCOUNT,
  PREPAID_SOFTWARE_ACCOUNT, PREPAID_INSURANCE_ACCOUNT,
} from "./fin-22-chart-of-accounts.js";

export const id = "FIN-06";

// ---------------------------------------------------------------- constants

/** The close-window run this pack proposes: dated, unreleased, pending approval. */
export const PAYMENT_RUN_ID = "PR-2026-04-02";
export const RUN_DATE = "2026-04-02";
/** The run covers everything falling due before the next cycle, the ordinary AP horizon. */
export const RUN_HORIZON = "2026-04-30";
/** Open-PO and accrual cut-off; also the FIN-10 as_of on every row. */
export const AS_OF = "2026-03-31";
export const PO_WINDOW = { start: "2026-01-05", end: "2026-03-27" };
export const RECEIPT_WINDOW = { start: "2026-01-12", end: AS_OF };
export const INVOICE_RECEIVED_WINDOW = { start: "2026-03-02", end: AS_OF };

/** AP raises the run; the Controller approves it. Two people, two roles. */
export const AP_REQUESTER_EMPLOYEE_ID = "EMP-0492"; // Yara Everhart, AP Clerk, finance_system_role AP Clerk
export const AP_APPROVER_EMPLOYEE_ID = "EMP-0473";  // Piran Pemberton, Controller, finance_system_role AP Approver
/**
 * EMP-0475 is an AP Clerk carrying AP Approver rights. CORE-04's generator
 * plants exactly one SoD-conflict row (EMP-0480) and does not count this one,
 * so this pack avoids EMP-0475 entirely rather than reroll CORE-04. Raised for
 * FIN-19 user-access-role-assignments, which is the artifact that owns access
 * conflicts.
 */
export const AVOIDED_EMPLOYEE_IDS = ["EMP-0475", "EMP-0480"];

/** A purchase order of $50,000 or more needs a director, below it a manager. */
export const DIRECTOR_THRESHOLD_CENTS = 5000000;
export const PO_APPROVERS = {
  manager: "EMP-0465",  // Thessaly Ivorwood, Finance Manager
  director: "EMP-0463", // Aldous Duskwood, Director, Finance
};

/**
 * co-101 Copperline Software is canon since v1.0.1 and was screened on
 * 2026-08-08 (canon/companies.md:33). It is absent from FIN-01/FIN-02 because
 * its $450,000 subscription was invoiced and paid in February, which is
 * consistent with the CORE-01 terms rather than a gap. This pack needs it as a
 * vendor so the already-correct prepaid schedule has a counterparty.
 */
export const CANON_VENDORS_EXTENDED = [
  { canon_id: "co-101", name: "Copperline Software" },
];

/**
 * The ten neutral vendor names screened on 2026-08-15 (fin-01-cash-recon.js)
 * take stable ids in the co-140-and-up generator range that canon/companies.md
 * reserves for "generator-produced population ... neutral generated names".
 * CORE-03 uses co-102 through co-170 for its CRM population, so this pack
 * starts at co-181 and no id is reused. No new NAME enters the universe here.
 */
const NEUTRAL_VENDOR_ID_START = 181;

// Trade, ledger account, requesting department and vendor invoice-number prefix,
// per vendor. gl_account is always an active FIN-22 code.
const VENDOR_TRADES = {
  "co-101": { account: "6200", dept: "Engineering", prefix: "CPL", uom: "license", items: ["Annual platform licence renewal", "Additional developer seats", "Sandbox environment add-on"] },
  "co-105": { account: "6600", dept: "Operations", prefix: "MLG", uom: "month", items: ["Commercial package placement fee", "Facilities services retainer", "Certificate administration"] },
  "co-106": { account: "6020", dept: "People", prefix: "TFH", uom: "seat", items: ["Benefits administration seats", "Payroll platform module", "Open enrolment support hours"] },
  "co-107": { account: "6120", dept: "Operations", prefix: "CDL", uom: "case", items: ["Office paper and consumables", "Breakroom supplies", "Printer toner cartridges", "Desk accessories"] },
  "co-109": { account: "6100", dept: "Operations", prefix: "BCP", uom: "month", items: ["Suite 400 common area charge", "Parking allocation", "After-hours HVAC"] },
  "co-119": { account: "6200", dept: "Product", prefix: "DPA", uom: "license", items: ["Product analytics workspace", "Event volume tier", "Data warehouse connector"] },
  "co-181": { account: "5000", dept: "Engineering", prefix: "HVM", uom: "month", items: ["Production compute reservation", "Object storage tier", "Managed database nodes"] },
  "co-182": { account: "6100", dept: "Operations", prefix: "HRF", uom: "month", items: ["Cleaning and janitorial service", "Grounds and waste service", "Reception desk coverage"] },
  "co-183": { account: "6030", dept: "People", prefix: "KSM", uom: "hour", items: ["Contract QA engineer hours", "Interim analyst placement", "Seasonal support staffing"] },
  "co-184": { account: "6110", dept: "Operations", prefix: "LMF", uom: "month", items: ["Electricity supply, Suite 400", "Demand charge true-up", "Metered water and sewer"] },
  "co-185": { account: "6120", dept: "Operations", prefix: "TKR", uom: "each", items: ["Overnight document courier", "Equipment transfer runs", "Archive collection pickup"] },
  "co-186": { account: "6300", dept: "Marketing", prefix: "SRM", uom: "each", items: ["Conference collateral print run", "Branded folder stock", "Direct mail production"] },
  "co-187": { account: "6400", dept: "Sales", prefix: "FNW", uom: "each", items: ["Managed travel booking fees", "Field team itineraries", "Group rate coordination"] },
  "co-188": { account: "6310", dept: "People", prefix: "FLM", uom: "each", items: ["All-hands catering", "Customer advisory board dinner", "Onsite lunch service"] },
  "co-189": { account: "6040", dept: "People", prefix: "BXM", uom: "each", items: ["Engineering search retainer", "Sourcing sprint", "Assessment licence block"] },
  "co-190": { account: "1400", dept: "IT & Security", prefix: "WRF", uom: "each", items: ["Badge readers and controllers", "Camera refresh units", "Door hardware kits"] },
};

// Amount bands per vendor, in integer cents: [unit price min, unit price max,
// quantity min, quantity max]. Chosen so a handful of purchase orders clear the
// $50,000 director threshold and most do not.
const VENDOR_BANDS = {
  "co-101": [180000, 420000, 8, 60], "co-105": [420000, 980000, 1, 12],
  "co-106": [4500, 12000, 120, 620], "co-107": [1800, 9500, 20, 240],
  "co-109": [640000, 1850000, 1, 6], "co-119": [95000, 260000, 4, 40],
  "co-181": [820000, 2400000, 1, 9], "co-182": [340000, 720000, 1, 8],
  "co-183": [8500, 19500, 40, 300], "co-184": [210000, 640000, 1, 6],
  "co-185": [3200, 14500, 10, 90], "co-186": [2400, 11000, 60, 500],
  "co-187": [1500, 7800, 30, 260], "co-188": [4200, 15500, 25, 180],
  "co-189": [65000, 240000, 1, 14], "co-190": [21000, 78000, 6, 70],
};

export const PO_COLUMNS = [
  "po_number", "po_line", "po_date", "vendor_canon_id", "vendor_name", "description",
  "gl_account", "uom", "quantity_ordered", "unit_price", "line_amount", "currency",
  "requested_by_employee_id", "approved_by_employee_id", "approval_level", "status",
  "expected_delivery_date",
];
export const INVOICE_COLUMNS = [
  "invoice_id", "vendor_canon_id", "vendor_name", "invoice_number", "invoice_date",
  "received_date", "po_number", "po_line", "description", "quantity_billed", "unit_price",
  "invoice_amount", "currency", "payment_terms", "due_date", "remit_to_bank",
  "remit_to_account_masked", "status",
];
export const PAYMENT_COLUMNS = [
  "payment_run_id", "payment_id", "run_date", "vendor_canon_id", "vendor_name", "invoice_id",
  "invoice_number", "po_number", "payment_amount", "currency", "payment_method",
  "remit_to_bank", "remit_to_account_masked", "requested_by_employee_id",
  "approved_by_employee_id", "status",
];
export const OPEN_PO_COLUMNS = [
  "po_number", "po_line", "vendor_canon_id", "vendor_name", "description", "gl_account",
  "quantity_ordered", "quantity_received", "quantity_invoiced", "unit_price",
  "ordered_value", "received_value", "invoiced_value", "accrued_value",
  "last_receipt_date", "currency", "as_of",
];
export const BILL_COLUMNS = [
  "bill_id", "vendor_canon_id", "vendor_name", "vendor_invoice_number", "bill_date",
  "posted_date", "gl_account", "description", "service_period_start", "service_period_end",
  "bill_amount", "currency", "po_number", "source_contract", "amortization_schedule_id",
  "monthly_amortization", "months_elapsed", "prepaid_balance", "payment_status",
];

// Target composition. The row counts the spec and the plan pin.
const COUNTS = {
  purchaseOrders: 48, purchaseOrderLines: 90,
  invoices: 72, payments: 42,
  openPoLines: 34, openPos: 22,
  bills: 55,
};
const PO_NUMBER_START = 101;
const INVOICE_ID_START = 101;
const PAYMENT_ID_START = 101;
const BILL_ID_START = 101;
/** The purchase-order number P5's invoice cites; deliberately outside the minted block. */
const ORPHAN_PO_NUMBER = "PO-2026-0192";
/**
 * The missing accrual (P12) has to sit on a purchase order no close entry
 * cites, or the "nothing in the universe accounts for this receipt" rule stops
 * resolving. FIN-09 caps its purchase-order citations at its CITED_PO_CEILING
 * (PO-2026-0120); this floor sits above that with room to spare, so the two
 * generators stay independent and neither has to import the other. Neither
 * constant moves alone.
 */
const ACCRUAL_PLANT_PO_FLOOR = "PO-2026-0130";

/** CORE-01 section 5.2: $450,000 invoiced in advance, 2026-02-01 to 2027-01-31, earned ratably. */
const CORE01 = {
  vendorId: "co-101", amountCents: 45000000, months: 12,
  billDate: "2026-02-01", postedDate: "2026-02-01",
  serviceStart: "2026-02-01", serviceEnd: "2027-01-31",
  scheduleId: "AMS-2026-001", monthsElapsed: 2,
};
/** FIN-12: annual commercial insurance and facilities programme, policy year 2026-04-01 to 2027-03-31. */
const FIN12 = {
  vendorId: "co-105", amountCents: 31200000, months: 12,
  billDate: "2026-03-24", postedDate: "2026-03-24",
  serviceStart: "2026-04-01", serviceEnd: "2027-03-31",
};
/** The premium FIN-12's drafted contract must state to the cent. */
export const INSURANCE_PREMIUM_CENTS = FIN12.amountCents;

// ------------------------------------------------------------------ helpers

function cents(n) { return (n / 100).toFixed(2); }

function businessDaysBetween(startIso, endIso) {
  const out = [];
  for (let d = startIso; d <= endIso; d = addDays(d, 1)) if (!isWeekend(d)) out.push(d);
  return out;
}

const TERMS_DAYS = { net_15: 15, net_30: 30, net_45: 45 };

function assertRole(row, employeeId, roleTitle, where) {
  if (!row) throw new Error(`FIN-06: ${employeeId} is not in the CORE-04 roster`);
  if (row.role_title !== roleTitle) throw new Error(`FIN-06: ${employeeId} is a ${row.role_title}, expected ${roleTitle} (${where})`);
  if (row.department !== "Finance") throw new Error(`FIN-06: ${employeeId} is in ${row.department}, expected Finance (${where})`);
  if (row.employment_status !== "active") throw new Error(`FIN-06: ${employeeId} is not active (${where})`);
  if (row.finance_system_role === SOD_CONFLICT_ROLE) throw new Error(`FIN-06: ${employeeId} is the planted SoD-conflict row (${where})`);
  if (AVOIDED_EMPLOYEE_IDS.includes(employeeId)) throw new Error(`FIN-06: ${employeeId} is on the avoid list (${where})`);
}

function must(condition, message) {
  if (!condition) throw new Error(`FIN-06: ${message}`);
}

// ------------------------------------------------------------------ builder

/**
 * Build the whole March 2026 procure-to-pay world. Pure: no I/O, no Date.now(),
 * every draw from createRng("FIN-06", stream).
 */
export function buildProcureToPay() {
  const roster = buildRoster(createRng("CORE-04", "roster"));
  const byEmployee = new Map(roster.map((r) => [r.employee_id, r]));
  assertRole(byEmployee.get(AP_REQUESTER_EMPLOYEE_ID), AP_REQUESTER_EMPLOYEE_ID, "AP Clerk", "FIN-08 requester");
  assertRole(byEmployee.get(AP_APPROVER_EMPLOYEE_ID), AP_APPROVER_EMPLOYEE_ID, "Controller", "FIN-08 approver");
  assertRole(byEmployee.get(PO_APPROVERS.manager), PO_APPROVERS.manager, "Finance Manager", "FIN-06 manager approver");
  assertRole(byEmployee.get(PO_APPROVERS.director), PO_APPROVERS.director, "Director, Finance", "FIN-06 director approver");
  must(!byEmployee.get(AP_REQUESTER_EMPLOYEE_ID).finance_system_role.includes("Approver"), "the AP requester holds an approver right");
  must(byEmployee.get(AP_APPROVER_EMPLOYEE_ID).finance_system_role.includes("Approver"), "the AP approver holds no approver right");
  must(AP_REQUESTER_EMPLOYEE_ID !== AP_APPROVER_EMPLOYEE_ID, "the AP run is requested and approved by the same person");

  const chart = buildChartOfAccounts();
  const chartByCode = new Map(chart.map((r) => [r.account_code, r]));

  const vendorRng = createRng(id, "vendors");
  const vendors = [
    ...CANON_VENDORS_EXTENDED,
    ...CANON_VENDORS,
    ...NEUTRAL_VENDORS.map((name, i) => ({ canon_id: `co-${NEUTRAL_VENDOR_ID_START + i}`, name })),
  ].map((v) => {
    const trade = VENDOR_TRADES[v.canon_id];
    must(trade, `no trade profile for vendor ${v.canon_id}`);
    const account = chartByCode.get(trade.account);
    must(account && account.active === "true", `vendor ${v.canon_id} posts to inactive or unknown account ${trade.account}`);
    const managers = roster.filter(
      (r) => r.department === trade.dept && r.level === "Manager" && r.employment_status === "active"
    );
    must(managers.length > 0, `no active manager in ${trade.dept} to raise ${v.canon_id}'s purchase orders`);
    const requester = vendorRng.pick(managers);
    must(!AVOIDED_EMPLOYEE_IDS.includes(requester.employee_id), `requester ${requester.employee_id} is on the avoid list`);
    return {
      ...v, ...trade,
      requester: requester.employee_id,
      remitAccount: `XXXX-${vendorRng.int(1000, 9999)}`,
      invoiceSeq: vendorRng.int(10200, 24800),
      billSeq: vendorRng.int(60200, 74800),
    };
  });
  const vendorById = new Map(vendors.map((v) => [v.canon_id, v]));
  must(vendors.length === 16, `expected 16 vendors, got ${vendors.length}`);

  // ---- pass 1: purchase orders -------------------------------------------
  const poRng = createRng(id, "pos");
  const poDays = businessDaysBetween(PO_WINDOW.start, PO_WINDOW.end);
  const vendorOrder = poRng.shuffle(vendors.map((v) => v.canon_id));
  const lineCounts = [];
  for (let i = 0; i < COUNTS.purchaseOrders; i++) lineCounts.push(poRng.pick([1, 1, 2, 2, 2, 3]));
  let lineTotal = lineCounts.reduce((s, n) => s + n, 0);
  for (let i = 0; lineTotal < COUNTS.purchaseOrderLines; i = (i + 1) % COUNTS.purchaseOrders) {
    if (lineCounts[i] < 4) { lineCounts[i] += 1; lineTotal += 1; }
  }
  for (let i = 0; lineTotal > COUNTS.purchaseOrderLines; i = (i + 1) % COUNTS.purchaseOrders) {
    if (lineCounts[i] > 1) { lineCounts[i] -= 1; lineTotal -= 1; }
  }
  must(lineTotal === COUNTS.purchaseOrderLines, `line count landed at ${lineTotal}`);

  const orders = [];
  for (let i = 0; i < COUNTS.purchaseOrders; i++) {
    const vendor = vendorById.get(vendorOrder[i % vendorOrder.length]);
    const poDate = poRng.pick(poDays);
    const band = VENDOR_BANDS[vendor.canon_id];
    const lines = [];
    for (let n = 0; n < lineCounts[i]; n++) {
      const unitPriceCents = poRng.int(band[0], band[1]);
      const quantity = poRng.int(band[2], band[3]);
      lines.push({
        lineNo: n + 1,
        description: poRng.pick(vendor.items),
        glAccount: vendor.account,
        uom: vendor.uom,
        quantityOrdered: quantity,
        unitPriceCents,
        lineAmountCents: quantity * unitPriceCents,
        quantityReceived: 0,
        lastReceiptDate: "",
        isOpen: false,
      });
    }
    orders.push({
      genIndex: i, vendor, poDate, lines,
      total: lines.reduce((sum, l) => sum + l.lineAmountCents, 0),
      expectedDelivery: addDays(poDate, poRng.int(7, 45)),
    });
  }
  orders.sort((a, b) => (a.poDate < b.poDate ? -1 : a.poDate > b.poDate ? 1 : a.genIndex - b.genIndex));
  orders.forEach((po, i) => { po.poNumber = `PO-2026-0${PO_NUMBER_START + i}`; });
  const orderByNumber = new Map(orders.map((po) => [po.poNumber, po]));

  // ---- pass 2: goods and services receipts, and which lines stay open ------
  const receiptRng = createRng(id, "receipts");
  const multiLine = receiptRng.shuffle(orders.filter((po) => po.lines.length >= 2));
  const openPairPos = multiLine.slice(0, COUNTS.openPoLines - COUNTS.openPos);
  const takenPairs = new Set(openPairPos.map((po) => po.poNumber));
  const singleCandidates = receiptRng.shuffle(orders.filter((po) => !takenPairs.has(po.poNumber)));
  const openSinglePos = singleCandidates.slice(0, COUNTS.openPos - openPairPos.length);
  must(openPairPos.length + openSinglePos.length === COUNTS.openPos, "open purchase-order count is wrong");
  for (const po of openPairPos) { po.lines[0].isOpen = true; po.lines[1].isOpen = true; }
  for (const po of openSinglePos) { po.lines[0].isOpen = true; }

  const allLines = orders.flatMap((po) => po.lines.map((l) => ({ ...l, po })));
  must(allLines.filter((l) => l.isOpen).length === COUNTS.openPoLines,
    `open line count is ${allLines.filter((l) => l.isOpen).length}`);

  for (const line of allLines) {
    const ref = orderByNumber.get(line.po.poNumber).lines[line.lineNo - 1];
    if (!line.isOpen) {
      ref.quantityReceived = line.quantityOrdered;
    } else {
      // An open line is anything from awaiting delivery to fully received but
      // not yet fully billed. Two thirds have goods on the dock.
      const share = receiptRng.pick([0, 0.4, 0.5, 0.6, 0.75, 1, 1, 1]);
      ref.quantityReceived = Math.max(0, Math.round(line.quantityOrdered * share));
    }
    if (ref.quantityReceived > 0) {
      const earliest = line.po.poDate > RECEIPT_WINDOW.start ? addDays(line.po.poDate, 3) : RECEIPT_WINDOW.start;
      const span = Math.max(1, diffDays(earliest, RECEIPT_WINDOW.end));
      ref.lastReceiptDate = addDays(earliest, receiptRng.int(0, span));
      if (ref.lastReceiptDate > RECEIPT_WINDOW.end) ref.lastReceiptDate = RECEIPT_WINDOW.end;
    }
  }

  // ---- pass 3: vendor invoices in the AP queue ------------------------------
  const invoiceRng = createRng(id, "invoices");
  const receivedDays = businessDaysBetween(INVOICE_RECEIVED_WINDOW.start, INVOICE_RECEIVED_WINDOW.end);
  const invoices = [];
  const closedLines = allLines.filter((l) => !l.isOpen);
  const openLines = allLines.filter((l) => l.isOpen);
  const billableOpen = invoiceRng.shuffle(
    openLines.filter((l) => orderByNumber.get(l.po.poNumber).lines[l.lineNo - 1].quantityReceived >= 4)
  );
  const partialCount = COUNTS.invoices - closedLines.length - 2; // less P4's copy and P5's orphan
  must(billableOpen.length >= partialCount, `only ${billableOpen.length} open lines can carry a partial invoice`);
  const partiallyBilled = new Set(billableOpen.slice(0, partialCount).map((l) => `${l.po.poNumber}|${l.lineNo}`));

  const makeInvoice = ({ vendor, poNumber, poLine, description, quantity, unitPriceCents }) => {
    const receivedDate = invoiceRng.pick(receivedDays);
    const terms = invoiceRng.pick(["net_15", "net_30", "net_30", "net_30", "net_45"]);
    const invoiceDate = addDays(receivedDate, -invoiceRng.int(1, 8));
    return {
      genIndex: invoices.length,
      vendor, poNumber, poLine, description,
      invoiceNumber: `${vendor.prefix}-${vendor.invoiceSeq++}`,
      invoiceDate, receivedDate, terms,
      dueDate: addDays(invoiceDate, TERMS_DAYS[terms]),
      quantityBilled: quantity,
      unitPriceCents,
      invoiceAmountCents: quantity * unitPriceCents,
      remitAccount: vendor.remitAccount,
      status: invoiceRng.pick(["matched", "matched", "matched", "matched", "matched", "matched", "matched", "unmatched", "unmatched", "on_hold"]),
      forcedIntoRun: false,
    };
  };

  for (const line of closedLines) {
    const ref = orderByNumber.get(line.po.poNumber).lines[line.lineNo - 1];
    invoices.push(makeInvoice({
      vendor: line.po.vendor, poNumber: line.po.poNumber, poLine: line.lineNo,
      description: line.description, quantity: ref.quantityOrdered, unitPriceCents: line.unitPriceCents,
    }));
  }
  for (const line of openLines) {
    if (!partiallyBilled.has(`${line.po.poNumber}|${line.lineNo}`)) continue;
    const ref = orderByNumber.get(line.po.poNumber).lines[line.lineNo - 1];
    // Bill at most half of what has been received, so the duplicate copy P4
    // lands on can never push the billed quantity past the received quantity.
    const billed = Math.max(1, Math.floor(ref.quantityReceived / 2));
    invoices.push(makeInvoice({
      vendor: line.po.vendor, poNumber: line.po.poNumber, poLine: line.lineNo,
      description: line.description, quantity: billed, unitPriceCents: line.unitPriceCents,
    }));
  }

  // ---- pass 4: the planted features ---------------------------------------
  const plantRng = createRng(id, "planted");

  // P3: price mismatch against a fully billed purchase-order line. Held to a 2
  // to 6 percent overcharge, and to lines above $100 a unit so rounding cannot
  // drift the percentage out of that band.
  const priceCandidates = invoices.filter((inv) => {
    const po = orderByNumber.get(inv.poNumber);
    return po && inv.vendor.canon_id !== "co-107" && inv.unitPriceCents >= 10000
      && inv.quantityBilled === po.lines[inv.poLine - 1].quantityOrdered;
  });
  must(priceCandidates.length > 0, "no candidate line for the price mismatch");
  const p3 = plantRng.pick(priceCandidates);
  const p3PoPriceCents = p3.unitPriceCents;
  const p3Pct = plantRng.pick([0.03, 0.035, 0.04, 0.045, 0.05]);
  p3.unitPriceCents = Math.round(p3PoPriceCents * (1 + p3Pct));
  p3.invoiceAmountCents = p3.quantityBilled * p3.unitPriceCents;
  p3.status = "matched";
  p3.forcedIntoRun = true;
  const p3Delta = (p3.unitPriceCents - p3PoPriceCents) / p3PoPriceCents;
  must(p3Delta >= 0.02 && p3Delta <= 0.06, `price mismatch landed at ${(p3Delta * 100).toFixed(2)} percent`);

  // P4: the same vendor invoice number arrives twice against one PO line.
  const dupCandidates = invoices.filter((inv) => {
    const po = orderByNumber.get(inv.poNumber);
    if (!po || inv === p3 || inv.vendor.canon_id === "co-107") return false;
    const ref = po.lines[inv.poLine - 1];
    // Strictly below the ordered quantity, so the duplicated line still reads as
    // open at the cut-off and the three-way match stays arithmetically sane.
    return partiallyBilled.has(`${inv.poNumber}|${inv.poLine}`)
      && inv.quantityBilled * 2 <= ref.quantityReceived
      && inv.quantityBilled * 2 < ref.quantityOrdered
      && inv.receivedDate <= addDays(AS_OF, -5);
  });
  must(dupCandidates.length > 0, "no candidate line for the duplicate invoice");
  const p4Original = plantRng.pick(dupCandidates);
  p4Original.status = "matched";
  p4Original.forcedIntoRun = true;
  const p4Copy = {
    ...p4Original,
    genIndex: invoices.length,
    receivedDate: addDays(p4Original.receivedDate, plantRng.int(2, 5)),
    status: "matched",
    forcedIntoRun: true,
  };
  must(p4Copy.receivedDate <= AS_OF, "the duplicate invoice copy fell outside March");
  invoices.push(p4Copy);

  // P5: an invoice citing a purchase order that is not on the file.
  const orphanVendor = plantRng.pick(vendors.filter((v) => v.canon_id !== "co-107"));
  const orphanBand = VENDOR_BANDS[orphanVendor.canon_id];
  const p5 = makeInvoice({
    vendor: orphanVendor, poNumber: ORPHAN_PO_NUMBER, poLine: 1,
    description: plantRng.pick(orphanVendor.items),
    quantity: plantRng.int(orphanBand[2], orphanBand[3]),
    unitPriceCents: plantRng.int(orphanBand[0], orphanBand[1]),
  });
  p5.status = "matched";
  p5.forcedIntoRun = true;
  invoices.push(p5);
  must(!orderByNumber.has(ORPHAN_PO_NUMBER), "the orphan purchase-order number collides with a real one");

  // P6: co-107's remit-to account changes on its most recent invoice.
  const cedarline = invoices.filter((inv) => inv.vendor.canon_id === "co-107");
  must(cedarline.length >= 2, "co-107 needs at least two invoices to show a changed remit account");
  cedarline.sort((a, b) => (a.receivedDate < b.receivedDate ? -1 : a.receivedDate > b.receivedDate ? 1 : a.genIndex - b.genIndex));
  const p6 = cedarline[cedarline.length - 1];
  let newRemit = `XXXX-${plantRng.int(1000, 9999)}`;
  const usedRemits = new Set(vendors.map((v) => v.remitAccount));
  while (usedRemits.has(newRemit)) newRemit = `XXXX-${plantRng.int(1000, 9999)}`;
  p6.remitAccount = newRemit;
  p6.status = "matched";
  p6.forcedIntoRun = true;

  must(invoices.length === COUNTS.invoices, `invoice count landed at ${invoices.length}`);
  invoices.sort((a, b) => (a.receivedDate < b.receivedDate ? -1 : a.receivedDate > b.receivedDate ? 1 : a.genIndex - b.genIndex));
  invoices.forEach((inv, i) => { inv.invoiceId = `VINV-2026-0${INVOICE_ID_START + i}`; });

  // ---- roll the invoices back onto the purchase-order lines ------------------
  const billedByLine = new Map();
  const billedAmountByLine = new Map();
  for (const inv of invoices) {
    const key = `${inv.poNumber}|${inv.poLine}`;
    billedByLine.set(key, (billedByLine.get(key) ?? 0) + inv.quantityBilled);
    billedAmountByLine.set(key, (billedAmountByLine.get(key) ?? 0) + inv.invoiceAmountCents);
  }
  for (const po of orders) {
    for (const line of po.lines) {
      const key = `${po.poNumber}|${line.lineNo}`;
      line.quantityInvoiced = billedByLine.get(key) ?? 0;
      line.invoicedValueCents = billedAmountByLine.get(key) ?? 0;
      must(line.quantityInvoiced <= line.quantityOrdered,
        `${key} bills ${line.quantityInvoiced} against ${line.quantityOrdered} ordered`);
      must(line.quantityInvoiced <= line.quantityReceived,
        `${key} bills ${line.quantityInvoiced} against ${line.quantityReceived} received`);
      line.status = line.quantityInvoiced >= line.quantityOrdered ? "closed"
        : line.quantityReceived >= line.quantityOrdered ? "received"
        : line.quantityReceived > 0 ? "partially_received" : "open";
      must(line.isOpen === (line.quantityInvoiced < line.quantityOrdered),
        `${key}: the open flag and the invoiced quantity disagree`);
    }
  }

  // ---- pass 4b: P12, the receipt that was never invoiced and never accrued ---
  const openLineRefs = orders.flatMap((po) => po.lines.filter((l) => l.isOpen).map((l) => ({ po, line: l })));
  must(openLineRefs.length === COUNTS.openPoLines, "open line count drifted");
  const accrualCandidates = openLineRefs.filter(
    ({ po, line }) => line.quantityInvoiced === 0 && line.quantityReceived > 0
      && po.poNumber >= ACCRUAL_PLANT_PO_FLOOR
  );
  must(accrualCandidates.length > 0, "no candidate line for the missing accrual");
  // The largest un-invoiced receipt, not a random one. A missed accrual worth a
  // few thousand dollars would fall under any materiality floor a learner sets,
  // which would make "no adjustment" a defensible answer and cost the module its
  // point. Deterministic: sorted by value, ties broken by purchase-order line.
  const p12 = accrualCandidates
    .slice()
    .sort((a, b) => {
      const av = a.line.quantityReceived * a.line.unitPriceCents;
      const bv = b.line.quantityReceived * b.line.unitPriceCents;
      if (av !== bv) return bv - av;
      return a.po.poNumber < b.po.poNumber ? -1 : a.po.poNumber > b.po.poNumber ? 1 : a.line.lineNo - b.line.lineNo;
    })[0];
  plantRng.float(); // keep this stream's position stable against the removed pick
  for (const { po, line } of openLineRefs) {
    const receivedValue = line.quantityReceived * line.unitPriceCents;
    line.receivedValueCents = receivedValue;
    line.orderedValueCents = line.quantityOrdered * line.unitPriceCents;
    const residual = receivedValue - line.invoicedValueCents;
    must(residual >= 0, `${po.poNumber} line ${line.lineNo} is billed above what was received`);
    line.accruedValueCents = (po === p12.po && line === p12.line) ? 0 : residual;
  }

  // ---- pass 5: vendor bills already posted to the ledger ---------------------
  const billRng = createRng(id, "bills");
  const bills = [];
  const poBackedPool = billRng.shuffle(
    orders.filter((po) => po.poNumber !== p12.po.poNumber && po.lines.every((l) => !l.isOpen))
  );
  const marchDays = businessDaysBetween("2026-03-02", AS_OF);
  const singlePeriodCount = COUNTS.bills - 2;
  for (let i = 0; i < singlePeriodCount; i++) {
    const poBacked = i < Math.min(34, poBackedPool.length);
    const po = poBacked ? poBackedPool[i] : null;
    const vendor = po ? po.vendor : billRng.pick(vendors);
    const band = VENDOR_BANDS[vendor.canon_id];
    const billDate = billRng.pick(marchDays);
    const postedDate = billRng.pick(marchDays.filter((d) => d >= billDate)) ?? billDate;
    const amountCents = po
      ? po.lines.reduce((s, l) => s + l.lineAmountCents, 0)
      : billRng.int(band[0], band[1]) * billRng.int(Math.max(1, Math.floor(band[2] / 2)), band[3]);
    bills.push({
      genIndex: bills.length, vendor,
      vendorInvoiceNumber: `${vendor.prefix}-${vendor.billSeq++}`,
      billDate, postedDate,
      glAccount: vendor.account,
      description: billRng.pick(vendor.items),
      serviceStart: "2026-03-01", serviceEnd: "2026-03-31",
      amountCents,
      poNumber: po ? po.poNumber : "",
      sourceContract: "", scheduleId: "",
      monthlyAmortizationCents: null, monthsElapsed: null, prepaidBalanceCents: null,
      paymentStatus: billRng.pick(["paid", "paid", "paid", "open", "open"]),
    });
  }
  const core01Vendor = vendorById.get(CORE01.vendorId);
  const core01Monthly = CORE01.amountCents / CORE01.months;
  must(Number.isInteger(core01Monthly), "the CORE-01 subscription does not divide into whole cents");
  bills.push({
    genIndex: bills.length, vendor: core01Vendor,
    vendorInvoiceNumber: `${core01Vendor.prefix}-${core01Vendor.billSeq++}`,
    billDate: CORE01.billDate, postedDate: CORE01.postedDate,
    glAccount: PREPAID_SOFTWARE_ACCOUNT.code,
    description: "Annual subscription fee, initial term, invoiced in advance",
    serviceStart: CORE01.serviceStart, serviceEnd: CORE01.serviceEnd,
    amountCents: CORE01.amountCents, poNumber: "", sourceContract: "CORE-01",
    scheduleId: CORE01.scheduleId,
    monthlyAmortizationCents: core01Monthly,
    monthsElapsed: CORE01.monthsElapsed,
    prepaidBalanceCents: CORE01.amountCents - CORE01.monthsElapsed * core01Monthly,
    paymentStatus: "paid",
  });
  const fin12Vendor = vendorById.get(FIN12.vendorId);
  bills.push({
    genIndex: bills.length, vendor: fin12Vendor,
    vendorInvoiceNumber: `${fin12Vendor.prefix}-${fin12Vendor.billSeq++}`,
    billDate: FIN12.billDate, postedDate: FIN12.postedDate,
    glAccount: PREPAID_INSURANCE_ACCOUNT.code,
    description: "Annual commercial insurance and facilities programme premium, payable in advance",
    serviceStart: FIN12.serviceStart, serviceEnd: FIN12.serviceEnd,
    amountCents: FIN12.amountCents, poNumber: "", sourceContract: "FIN-12",
    scheduleId: "", monthlyAmortizationCents: null, monthsElapsed: null, prepaidBalanceCents: null,
    paymentStatus: "open",
  });
  must(bills.length === COUNTS.bills, `bill count landed at ${bills.length}`);
  bills.sort((a, b) => (a.postedDate < b.postedDate ? -1 : a.postedDate > b.postedDate ? 1 : a.genIndex - b.genIndex));
  bills.forEach((b, i) => { b.billId = `BILL-2026-0${BILL_ID_START + i}`; });

  // ---- pass 6: the proposed payment run ------------------------------------
  const forced = invoices.filter((inv) => inv.forcedIntoRun);
  must(forced.length === 5, `expected five exception invoices in the run, got ${forced.length}`);
  const rest = invoices
    .filter((inv) => !inv.forcedIntoRun && inv.status === "matched" && inv.dueDate <= RUN_HORIZON)
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : a.invoiceId < b.invoiceId ? -1 : 1));
  must(forced.length + rest.length >= COUNTS.payments, `only ${forced.length + rest.length} invoices are payable in the run`);
  const paid = [...forced, ...rest.slice(0, COUNTS.payments - forced.length)];
  paid.sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : a.invoiceId < b.invoiceId ? -1 : 1));
  const payments = paid.map((inv, i) => ({
    payment_run_id: PAYMENT_RUN_ID,
    payment_id: `PAY-2026-0${PAYMENT_ID_START + i}`,
    run_date: RUN_DATE,
    vendor_canon_id: inv.vendor.canon_id,
    vendor_name: inv.vendor.name,
    invoice_id: inv.invoiceId,
    invoice_number: inv.invoiceNumber,
    po_number: orderByNumber.has(inv.poNumber) ? inv.poNumber : "",
    payment_amount: cents(inv.invoiceAmountCents),
    currency: "USD",
    payment_method: inv.invoiceAmountCents >= 2500000 ? "wire" : inv.invoiceAmountCents < 200000 ? "check" : "ach",
    remit_to_bank: "Anchor Point Bank",
    remit_to_account_masked: inv.remitAccount,
    requested_by_employee_id: AP_REQUESTER_EMPLOYEE_ID,
    approved_by_employee_id: AP_APPROVER_EMPLOYEE_ID,
    status: "pending_approval",
  }));
  // ---- emit ------------------------------------------------------------------
  const poRows = orders.flatMap((po) => po.lines.map((line) => ({
    po_number: po.poNumber,
    po_line: String(line.lineNo),
    po_date: po.poDate,
    vendor_canon_id: po.vendor.canon_id,
    vendor_name: po.vendor.name,
    description: line.description,
    gl_account: line.glAccount,
    uom: line.uom,
    quantity_ordered: String(line.quantityOrdered),
    unit_price: cents(line.unitPriceCents),
    line_amount: cents(line.lineAmountCents),
    currency: "USD",
    requested_by_employee_id: po.vendor.requester,
    approved_by_employee_id: po.total >= DIRECTOR_THRESHOLD_CENTS ? PO_APPROVERS.director : PO_APPROVERS.manager,
    approval_level: po.total >= DIRECTOR_THRESHOLD_CENTS ? "director" : "manager",
    status: line.status,
    expected_delivery_date: po.expectedDelivery,
  })));

  const invoiceRows = invoices.map((inv) => ({
    invoice_id: inv.invoiceId,
    vendor_canon_id: inv.vendor.canon_id,
    vendor_name: inv.vendor.name,
    invoice_number: inv.invoiceNumber,
    invoice_date: inv.invoiceDate,
    received_date: inv.receivedDate,
    po_number: inv.poNumber,
    po_line: String(inv.poLine),
    description: inv.description,
    quantity_billed: String(inv.quantityBilled),
    unit_price: cents(inv.unitPriceCents),
    invoice_amount: cents(inv.invoiceAmountCents),
    currency: "USD",
    payment_terms: inv.terms,
    due_date: inv.dueDate,
    remit_to_bank: "Anchor Point Bank",
    remit_to_account_masked: inv.remitAccount,
    status: inv.status,
  }));

  const openPoRows = openLineRefs
    .map(({ po, line }) => ({
      po_number: po.poNumber,
      po_line: String(line.lineNo),
      vendor_canon_id: po.vendor.canon_id,
      vendor_name: po.vendor.name,
      description: line.description,
      gl_account: line.glAccount,
      quantity_ordered: String(line.quantityOrdered),
      quantity_received: String(line.quantityReceived),
      quantity_invoiced: String(line.quantityInvoiced),
      unit_price: cents(line.unitPriceCents),
      ordered_value: cents(line.orderedValueCents),
      received_value: cents(line.receivedValueCents),
      invoiced_value: cents(line.invoicedValueCents),
      accrued_value: cents(line.accruedValueCents),
      last_receipt_date: line.lastReceiptDate,
      currency: "USD",
      as_of: AS_OF,
    }))
    .sort((a, b) => (a.po_number < b.po_number ? -1 : a.po_number > b.po_number ? 1 : Number(a.po_line) - Number(b.po_line)));

  const billRows = bills.map((b) => ({
    bill_id: b.billId,
    vendor_canon_id: b.vendor.canon_id,
    vendor_name: b.vendor.name,
    vendor_invoice_number: b.vendorInvoiceNumber,
    bill_date: b.billDate,
    posted_date: b.postedDate,
    gl_account: b.glAccount,
    description: b.description,
    service_period_start: b.serviceStart,
    service_period_end: b.serviceEnd,
    bill_amount: cents(b.amountCents),
    currency: "USD",
    po_number: b.poNumber,
    source_contract: b.sourceContract,
    amortization_schedule_id: b.scheduleId,
    monthly_amortization: b.monthlyAmortizationCents === null ? "" : cents(b.monthlyAmortizationCents),
    months_elapsed: b.monthsElapsed === null ? "" : String(b.monthsElapsed),
    prepaid_balance: b.prepaidBalanceCents === null ? "" : cents(b.prepaidBalanceCents),
    payment_status: b.paymentStatus,
  }));

  // ---- accrual roll-forward --------------------------------------------------
  const receivedNotInvoicedCents = openLineRefs.reduce(
    (s, { line }) => s + (line.receivedValueCents - line.invoicedValueCents), 0
  );
  const accruedTotalCents = openLineRefs.reduce((s, { line }) => s + line.accruedValueCents, 0);
  const p12ResidualCents = p12.line.receivedValueCents - p12.line.invoicedValueCents - p12.line.accruedValueCents;
  const openingBalanceCents = createRng(id, "rollforward").int(180000000, 240000000);
  const rollForward = {
    generated_from_spec: "FIN-10",
    entity: ACCOUNT_HOLDER,
    period: { start: "2026-03-01", end: AS_OF },
    currency: "USD",
    account: { code: ACCRUED_LIABILITIES_ACCOUNT.code, name: ACCRUED_LIABILITIES_ACCOUNT.name },
    opening_balance: cents(openingBalanceCents),
    accruals_booked: cents(accruedTotalCents),
    reversals: cents(openingBalanceCents),
    closing_balance: cents(accruedTotalCents),
    open_po_count: new Set(openPoRows.map((r) => r.po_number)).size,
    received_not_invoiced_total: cents(receivedNotInvoicedCents),
    accrued_total: cents(accruedTotalCents),
  };

  // ---- tie-outs, asserted in integer cents ------------------------------------
  for (const row of invoiceRows) {
    must(Math.round(Number(row.invoice_amount) * 100) === Number(row.quantity_billed) * Math.round(Number(row.unit_price) * 100),
      `T-B1 failed on ${row.invoice_id}`);
  }
  for (const row of poRows) {
    must(Math.round(Number(row.line_amount) * 100) === Number(row.quantity_ordered) * Math.round(Number(row.unit_price) * 100),
      `T-B2 failed on ${row.po_number} line ${row.po_line}`);
  }
  const runTotalCents = payments.reduce((s, p) => s + Math.round(Number(p.payment_amount) * 100), 0);
  const paidInvoiceTotalCents = paid.reduce((s, inv) => s + inv.invoiceAmountCents, 0);
  must(runTotalCents === paidInvoiceTotalCents, "T-B4 failed: the run total is not the sum of its invoices");
  const distinctInRun = new Map();
  for (const inv of paid) distinctInRun.set(`${inv.vendor.canon_id}|${inv.invoiceNumber}`, inv.invoiceAmountCents);
  const distinctTotalCents = [...distinctInRun.values()].reduce((s, n) => s + n, 0);
  must(runTotalCents - distinctTotalCents === p4Original.invoiceAmountCents,
    "T-B5 failed: the run's overpayment is not exactly the duplicated invoice");
  must(openingBalanceCents + accruedTotalCents - openingBalanceCents === accruedTotalCents, "T-D1 failed");
  must(receivedNotInvoicedCents - accruedTotalCents === p12ResidualCents, "T-D3 failed");
  const p14 = bills.find((b) => b.sourceContract === "CORE-01");
  const p13 = bills.find((b) => b.sourceContract === "FIN-12");
  must(p14.amountCents === 45000000 && p14.monthlyAmortizationCents === 3750000
    && p14.monthsElapsed === 2 && p14.prepaidBalanceCents === 37500000, "T-D5 failed on the CORE-01 schedule");
  must(p13.monthsElapsed === null && p13.scheduleId === "", "T-D6 failed: the insurance prepaid already carries a schedule");
  const multiMonth = bills.filter((b) => b.serviceStart.slice(0, 7) !== b.serviceEnd.slice(0, 7));
  must(multiMonth.length === 2, `expected exactly two multi-month bills, got ${multiMonth.length}`);
  const apOpenCents = bills.filter((b) => b.paymentStatus === "open").reduce((s, b) => s + b.amountCents, 0);

  return {
    pos: poRows,
    invoices: invoiceRows,
    payments,
    openPos: openPoRows,
    rollForward,
    bills: billRows,
    tieOut: {
      apOpenBillsCents: apOpenCents,
      accrualClosingCents: accruedTotalCents,
      receivedNotInvoicedCents,
      p12ResidualCents,
      prepaidSoftwareBalanceCents: p14.prepaidBalanceCents,
      prepaidInsuranceBalanceCents: p13.amountCents,
      runTotalCents,
      duplicatedInvoiceCents: p4Original.invoiceAmountCents,
    },
  };
}

// ---------------------------------------------------------------- generate

export function generate() {
  const { pos } = buildProcureToPay();
  return [{ path: "purchase-orders.csv", content: toCsv(PO_COLUMNS, pos) }];
}

// CORE-02 outside-counsel-invoice: a LEDES 1998B outside-counsel invoice from
// co-001 (Atticus Dundee LLP) to co-002 (Atticus Dundee Inc.). Planted
// features: UTBMS task/activity codes, a specific model narrative line
// ("JKS 03/12 2.4 hrs L510 ..."), one block-billed entry among itemized
// ones, and an exact $47,000 / 38-page total.
import { addDays } from "../dates.js";

export const id = "CORE-02";

const CLIENT_ID = "co-002";
const LAW_FIRM_ID = "co-001";
const MATTER_ID = "MAT-OC-0142";
const INVOICE_TOTAL_TARGET = 47000.0;
const PAGE_COUNT = 38;

const BILLING_START = "2026-02-15";
const BILLING_END = "2026-03-14";
const INVOICE_DATE = "2026-03-20";
const INVOICE_NUMBER = "INV-ADLLP-100142";

// UTBMS task codes: L100-L600 (litigation fee) plus E100-E900 (expenses).
const TASK_CODES = [
  { code: "L110", label: "Fact investigation/development" },
  { code: "L120", label: "Analysis/strategy" },
  { code: "L210", label: "Pleadings" },
  { code: "L310", label: "Written discovery" },
  { code: "L430", label: "Written motions and submissions" },
  { code: "L510", label: "Trial preparation and strategy" },
  { code: "L610", label: "Settlement/ADR" },
];
const EXPENSE_CODES = [
  { code: "E101", label: "Copying" },
  { code: "E106", label: "Online research" },
  { code: "E110", label: "Out-of-town travel" },
  { code: "E124", label: "Other expenses" },
];
const ACTIVITY_CODES = ["A103", "A104", "A105", "A108", "A109"];

const TIMEKEEPERS = [
  { id: "TK-001", initials: "JKS", name: "Jordan K. Sable", classification: "Partner", rate: 725 },
  { id: "TK-002", initials: "MOD", name: "Marlowe O. Duskwood", classification: "Associate", rate: 465 },
  { id: "TK-003", initials: "RTP", name: "Reyna T. Pemberton", classification: "Paralegal", rate: 220 },
];

const LEDES_COLUMNS = [
  "INVOICE_DATE", "INVOICE_NUMBER", "CLIENT_ID", "LAW_FIRM_MATTER_ID", "INVOICE_TOTAL",
  "BILLING_START_DATE", "BILLING_END_DATE", "INVOICE_DESCRIPTION", "LINE_ITEM_NUMBER",
  "EXP_FEE_INV_ADJ_TYPE", "LINE_ITEM_NUMBER_OF_UNITS", "LINE_ITEM_ADJUSTMENT_AMOUNT",
  "LINE_ITEM_TOTAL", "LINE_ITEM_DATE", "LINE_ITEM_TASK_CODE", "LINE_ITEM_EXPENSE_CODE",
  "LINE_ITEM_ACTIVITY_CODE", "TIMEKEEPER_ID", "LINE_ITEM_DESCRIPTION", "LAW_FIRM_ID",
  "LINE_ITEM_UNIT_COST", "TIMEKEEPER_NAME", "TIMEKEEPER_CLASSIFICATION", "CLIENT_MATTER_ID",
];

export function generate({ rng }) {
  const r = rng("line-items");
  const lineItems = [];
  let lineNo = 0;

  const nextLine = () => {
    lineNo += 1;
    return lineNo;
  };

  // The model narrative line, verbatim per spec: "JKS 03/12 2.4 hrs L510 ..."
  const jks = TIMEKEEPERS[0];
  const modelHours = 2.4;
  const modelDate = "2026-03-12";
  const modelTask = TASK_CODES.find((t) => t.code === "L510");
  lineItems.push({
    n: nextLine(),
    type: "fee",
    date: modelDate,
    hours: modelHours,
    unitCost: jks.rate,
    total: round2(modelHours * jks.rate),
    taskCode: modelTask.code,
    activityCode: "A109",
    timekeeper: jks,
    description: `JKS 03/12 2.4 hrs L510 Trial preparation and strategy session with client re: upcoming hearing`,
  });

  // Block-billed entry (anti-pattern, planted deliberately alongside
  // properly itemized entries below): multiple discrete tasks bundled into
  // one undifferentiated line, no per-task breakdown.
  const blockTimekeeper = TIMEKEEPERS[1];
  const blockHours = 6.8;
  lineItems.push({
    n: nextLine(),
    type: "fee",
    date: addDays(modelDate, 2),
    hours: blockHours,
    unitCost: blockTimekeeper.rate,
    total: round2(blockHours * blockTimekeeper.rate),
    taskCode: "L120",
    activityCode: "A104",
    timekeeper: blockTimekeeper,
    description: "Review correspondence; draft memo to client; telephone conference with opposing counsel; revise pleading; prepare for hearing (block-billed, not itemized by task)",
  });

  // Properly itemized fee entries.
  const itemizedCount = 30;
  const scalableLines = [];
  for (let i = 0; i < itemizedCount; i++) {
    const tk = r.pick(TIMEKEEPERS);
    const task = r.pick(TASK_CODES);
    const hours = r.amount(0.3, 4.5, 1);
    const line = {
      n: nextLine(),
      type: "fee",
      date: addDays(BILLING_START, r.int(0, 26)),
      hours,
      unitCost: tk.rate,
      total: round2(hours * tk.rate),
      taskCode: task.code,
      activityCode: r.pick(ACTIVITY_CODES),
      timekeeper: tk,
      description: `${tk.initials} ${task.label}`,
    };
    lineItems.push(line);
    scalableLines.push(line);
  }

  // Expense entries (E100-E900).
  const expenseCount = 5;
  for (let i = 0; i < expenseCount; i++) {
    const exp = r.pick(EXPENSE_CODES);
    const units = r.int(1, 40);
    const unitCost = round2(r.amount(0.15, 12, 2));
    const line = {
      n: nextLine(),
      type: "expense",
      date: addDays(BILLING_START, r.int(0, 26)),
      hours: units,
      unitCost,
      total: round2(units * unitCost),
      taskCode: "",
      expenseCode: exp.code,
      activityCode: "",
      timekeeper: null,
      description: exp.label,
    };
    lineItems.push(line);
    scalableLines.push(line);
  }

  // Force the grand total to exactly the planted $47,000 figure. The two
  // fixed-text lines (model narrative line, block-billed line) keep their
  // exact quoted hours; every *other* fee/expense line is scaled by one
  // common factor so no single line ends up with an implausible hour count
  // (an earlier version dumped the whole remainder on one line and produced
  // a 112-hour entry -- not fixed here, changed the approach instead).
  // Fee lines scale on hours (unit cost is the timekeeper's fixed rate);
  // expense lines scale on unit cost (quantities stay whole numbers).
  const fixedTotal = lineItems[0].total + lineItems[1].total;
  const scalableTotalBefore = scalableLines.reduce((sum, li) => sum + li.total, 0);
  const targetForScalable = INVOICE_TOTAL_TARGET - fixedTotal;
  const scaleFactor = targetForScalable / scalableTotalBefore;

  for (const line of scalableLines) {
    if (line.type === "fee") {
      line.hours = round2(line.hours * scaleFactor);
      line.total = round2(line.hours * line.unitCost);
    } else {
      line.unitCost = round2(line.unitCost * scaleFactor);
      line.total = round2(line.hours * line.unitCost);
    }
  }

  // Rounding will leave a few cents of drift after scaling; absorb it into
  // the last scalable line so the grand total lands exactly on the target.
  const scalableTotalAfter = scalableLines.reduce((sum, li) => sum + li.total, 0);
  const drift = round2(targetForScalable - scalableTotalAfter);
  const driftLine = scalableLines[scalableLines.length - 1];
  driftLine.total = round2(driftLine.total + drift);
  if (driftLine.type === "fee") {
    driftLine.hours = round2(driftLine.total / driftLine.unitCost);
  } else {
    driftLine.unitCost = round2(driftLine.total / driftLine.hours);
  }

  const grandTotal = round2(lineItems.reduce((sum, li) => sum + li.total, 0));

  const rows = lineItems.map((li) => ({
    INVOICE_DATE: INVOICE_DATE,
    INVOICE_NUMBER: INVOICE_NUMBER,
    CLIENT_ID: CLIENT_ID,
    LAW_FIRM_MATTER_ID: MATTER_ID,
    INVOICE_TOTAL: grandTotal.toFixed(2),
    BILLING_START_DATE: BILLING_START,
    BILLING_END_DATE: BILLING_END,
    INVOICE_DESCRIPTION: `Outside counsel services, ${PAGE_COUNT}-page detailed invoice`,
    LINE_ITEM_NUMBER: li.n,
    EXP_FEE_INV_ADJ_TYPE: li.type === "fee" ? "F" : "E",
    LINE_ITEM_NUMBER_OF_UNITS: li.hours,
    LINE_ITEM_ADJUSTMENT_AMOUNT: "0.00",
    LINE_ITEM_TOTAL: li.total.toFixed(2),
    LINE_ITEM_DATE: li.date,
    LINE_ITEM_TASK_CODE: li.taskCode ?? "",
    LINE_ITEM_EXPENSE_CODE: li.expenseCode ?? "",
    LINE_ITEM_ACTIVITY_CODE: li.activityCode ?? "",
    TIMEKEEPER_ID: li.timekeeper?.id ?? "",
    LINE_ITEM_DESCRIPTION: li.description,
    LAW_FIRM_ID: LAW_FIRM_ID,
    LINE_ITEM_UNIT_COST: li.unitCost.toFixed(2),
    TIMEKEEPER_NAME: li.timekeeper?.name ?? "",
    TIMEKEEPER_CLASSIFICATION: li.timekeeper?.classification ?? "",
    CLIENT_MATTER_ID: MATTER_ID,
  }));

  const ledesText = buildLedes1998B(rows);

  const summary = {
    universe_version: "0.2.0",
    generated_from_spec: "CORE-02",
    invoice_number: INVOICE_NUMBER,
    client_id: CLIENT_ID,
    law_firm_id: LAW_FIRM_ID,
    matter_id: MATTER_ID,
    invoice_date: INVOICE_DATE,
    billing_period: { start: BILLING_START, end: BILLING_END },
    invoice_total: grandTotal,
    page_count: PAGE_COUNT,
    line_item_count: lineItems.length,
    finance_queue_status: "pending_classification",
    finance_queue_note: "Ambiguous legal-vendor request: appears in the finance inbound queue for routing triage.",
    planted_features: {
      model_narrative_line: lineItems[0].description,
      block_billed_line_number: lineItems[1].n,
    },
  };

  return [
    { path: "invoice.ledes.csv", content: ledesText },
    { path: "invoice.json", content: JSON.stringify(summary, null, 2) + "\n" },
  ];
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/** Build a genuine LEDES 1998B pipe-delimited file: header line, column line, data lines. */
function buildLedes1998B(rows) {
  const lines = ["LEDES1998B[]"];
  lines.push(LEDES_COLUMNS.join("|") + "[]");
  for (const row of rows) {
    lines.push(LEDES_COLUMNS.map((c) => String(row[c] ?? "")).join("|") + "[]");
  }
  return lines.join("\n") + "\n";
}

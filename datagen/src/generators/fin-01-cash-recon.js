// FIN-01 bank-transactions, plus the shared builder behind FIN-02 gl-cash-ledger
// and FIN-03 outstanding-checks. One seeded builder produces the March 2026
// operating-account bank feed of co-002 (Atticus Dundee Inc.) at co-104 (Anchor
// Point Bank), the matching cash GL ledger, and the checks issued in March that
// had not cleared by the statement end. FIN-02 and FIN-03 call
// buildCashReconciliation() the way CORE-03 calls CORE-04's buildRoster(), so
// the three files always describe the same month even when generated separately.
//
// Every random draw comes from createRng("FIN-01", stream). Never the caller's
// rng: FIN-02 and FIN-03 must reproduce FIN-01's world byte for byte.
//
// Planted features (spec FIN-01, design 2026-08-15 Section 2.3), each with one
// root cause and no label in the data:
//   1. duplicated deposit: one customer receipt posted twice in the bank feed
//      (two txn_ids, same amount and reference, one or two days apart); the GL
//      records it once. Bank error, hold for human review, never auto-clear.
//   2. unmatched payment A: a bank service fee debit with no GL entry
//      (unrecorded item; needs a journal entry).
//   3. unmatched payment B: a vendor ACH debit whose GL entry carries a
//      transposed amount (preparer keying error; needs a correcting entry).
//   4. deposit in transit: a customer receipt the GL records on the statement
//      end date; the bank posts it on the next business day, so it is absent
//      from the March statement.
// Outstanding checks (FIN-03) are legitimate timing items, not defects.
//
// The tie-out is asserted at the end of the build (integer cents, throw on any
// mismatch): adjusted bank = ending bank + deposit in transit - outstanding
// checks - duplicated deposit; adjusted book = ending GL - unrecorded fee +
// (GL transposed amount - bank amount); the two are equal to the cent.
import { toCsv } from "../csv.js";
import { addDays, isWeekend, rollForwardPastWeekend, weekday } from "../dates.js";
import { createRng } from "../seed.js";
import { buildRoster } from "./core-04-people-roster.js";
import { generate as generateCrmSeed } from "./core-03-crm-seed.js";
import { OPERATING_CASH_ACCOUNT } from "./fin-22-chart-of-accounts.js";

export const id = "FIN-01";

// ---------------------------------------------------------------- constants

/** Finance anchor period (canon/timeline.md): the March 2026 statement. */
export const PERIOD = { start: "2026-03-01", end: "2026-03-31", label: "202603" };
/** The bank posts the deposit in transit on the first business day after the statement end. */
export const DEPOSIT_IN_TRANSIT_BANK_DATE = "2026-04-01";
/** The GL records the deposit in transit inside the period, on the statement end date. */
export const DEPOSIT_IN_TRANSIT_GL_DATE = PERIOD.end;

/** Book and bank opening balances agree: the February close carried nothing forward (canon/timeline.md). */
export const OPENING_BALANCE_CENTS = 348291522; // 3,482,915.22

/** Chosen at D1 time from the CORE-04 roster (design Section 2.4). */
export const PREPARER_EMPLOYEE_ID = "EMP-0486"; // Emlyn Ravenscroft, Staff Accountant, finance_system_role GL Admin
export const REVIEWER_EMPLOYEE_ID = "EMP-0473"; // Piran Pemberton, Controller, finance_system_role AP Approver
export const SOD_CONFLICT_ROLE = "AP Clerk, Payment Approver";

export const ACCOUNT_HOLDER = { canon_id: "co-002", name: "Atticus Dundee Inc." };
export const BANK = { canon_id: "co-104", name: "Anchor Point Bank" };
const OPERATING_ACCOUNT_MASKED = "XXXX-4410";
const PAYROLL_ACCOUNT_MASKED = "XXXX-4425";
const MONEY_MARKET_ACCOUNT_MASKED = "XXXX-4433";

export const BANK_COLUMNS = [
  "txn_id", "posted_date", "value_date", "description", "counterparty", "reference",
  "type", "amount", "running_balance", "channel",
];
export const GL_COLUMNS = [
  "je_id", "posting_date", "gl_account", "description", "counterparty", "reference",
  "debit", "credit", "source", "prepared_by",
];
export const OUTSTANDING_COLUMNS = ["check_number", "issue_date", "payee", "amount", "gl_je_id", "status"];

// Canon vendors of co-002 (canon/companies.md) that pay out of the operating account.
export const CANON_VENDORS = [
  { canon_id: "co-105", name: "Millgate Insurance Services" },
  { canon_id: "co-106", name: "TalentForce HR Platform" },
  { canon_id: "co-107", name: "Cedarline Office Supply" },
  { canon_id: "co-109", name: "Birchcroft Properties" },
  { canon_id: "co-119", name: "DataPulse Analytics" },
];
const LANDLORD = CANON_VENDORS[3];
const PAYROLL_PLATFORM = CANON_VENDORS[1];

// Neutral generated vendor names for the remainder (design Section 2.4), in
// the invented-compound style of CORE-03's account words. These exist to
// satisfy the standing collision gate in canon/companies.md ("Ground rules":
// check every name against real companies before publishing).
//
// Screened by web search on 2026-08-15, two queries per name: the full name,
// then the bare distinctive stem on its own. A name was rejected when its stem
// resolved to a registered company, to an operating business on its own domain,
// or to a real place with a business of the same trade at that address. Seven of
// the ten names first drafted were rejected and replaced on that basis. Common
// noun echoes (a bird, a moor, a hedgerow plant) and fictional-setting use in
// games or RPG wikis were not treated as collisions, since neither is a
// business this data could be confused with.
//
// The seventh replacement came from the release screen, which reran both
// queries over the whole list: "Duskmere Catering" was dropped because the
// exact-name query returned a real bookable self-catering holiday cottage,
// Duskmere Retreat in Keilour, Perth and Kinross, as its top result. Hospitality
// is close enough to the vendor's trade to confuse a reader, so the slot went to
// "Fallowmere Catering", whose two queries return only fictional settings.
//
// The structural test pins every counterparty and payee to this list plus canon
// and CORE-03 names, so nothing unscreened can enter the data. Adding a name
// here means running the same two queries first and recording the verdict in
// the PR.
export const NEUTRAL_VENDORS = [
  "Halvermoor Cloud Services",
  "Harrowfen Facilities Group",
  "Kestrelmoor Staffing Partners",
  "Loamfield Power Cooperative",
  "Thackenridge Courier",
  "Sarrowmere Print Works",
  "Fenwhistle Travel Desk",
  "Fallowmere Catering",
  "Braxmoor Recruiting Group",
  "Wrenfallow Security Systems",
];

// Category counts (fixed composition; dates, amounts and counterparties draw
// from the rng). Bank rows = base events + 2 (duplicate copy, unrecorded fee).
// GL rows = base events + outstanding checks + 1 (deposit in transit).
const COUNTS = {
  arAch: 70, arWire: 18, arCard: 12,
  apAch: 50, apWire: 5, apCheckCleared: 28, cardSettlement: 4,
  outstandingChecks: 12,
};
const CHECK_NUMBER_START = 10421;
const INVOICE_REF_START = 401;
const AP_REF_START = 331;

// ------------------------------------------------------------------ helpers

function cents(n) { return (n / 100).toFixed(2); }

function businessDaysBetween(startIso, endIso) {
  const out = [];
  for (let d = startIso; d <= endIso; d = addDays(d, 1)) if (!isWeekend(d)) out.push(d);
  return out;
}

function nextBusinessDay(iso) { return rollForwardPastWeekend(addDays(iso, 1)); }

/** Step back `n` business days, never earlier than the period start (returns `iso` itself if that would happen). */
function businessDaysBefore(iso, n) {
  let d = iso;
  for (let i = 0; i < n; i++) {
    d = addDays(d, -1);
    while (isWeekend(d)) d = addDays(d, -1);
  }
  return d < PERIOD.start ? iso : d;
}

/**
 * value_date rule: an inbound ach or check credit carries one business day of
 * float before the funds are available. Money leaving the account is gone on
 * the day it posts, so every debit values on its posting date.
 */
function valueDateFor(channel, direction, postedDate) {
  const floats = direction === "credit" && (channel === "ach" || channel === "check");
  return floats ? nextBusinessDay(postedDate) : postedDate;
}

/**
 * Transpose the two lowest-order dollar digits (tens and units) of an amount in
 * cents; if they are equal, nudge the units digit first so the result differs.
 * A transposition error always differs from the true amount by a multiple of 9
 * dollars, the classic tell the lesson teaches.
 */
export function transposeDollars(amountCents) {
  let dollars = Math.floor(amountCents / 100);
  const c = amountCents % 100;
  let units = dollars % 10;
  const tens = Math.floor(dollars / 10) % 10;
  if (units === tens) {
    units = (units + 1) % 10;
    dollars = dollars - (dollars % 10) + units;
  }
  const rest = Math.floor(dollars / 100);
  const swapped = rest * 100 + units * 10 + tens;
  return swapped * 100 + c;
}

function upper(s) { return s.toUpperCase(); }

// ------------------------------------------------------------------ builder

/**
 * Build the whole March 2026 cash reconciliation world. Pure: no I/O, no
 * Date.now(), every draw from createRng("FIN-01", stream).
 * @returns {{ bank: object[], summary: object, gl: object[], outstanding: object[], tieOut: object }}
 */
export function buildCashReconciliation() {
  const roster = buildRoster(createRng("CORE-04", "roster"));
  const preparer = roster.find((r) => r.employee_id === PREPARER_EMPLOYEE_ID);
  const reviewer = roster.find((r) => r.employee_id === REVIEWER_EMPLOYEE_ID);
  assertRole(preparer, PREPARER_EMPLOYEE_ID, "Staff Accountant");
  assertRole(reviewer, REVIEWER_EMPLOYEE_ID, "Controller");

  const crmFiles = generateCrmSeed({ rng: (stream) => createRng("CORE-03", stream) });
  const crm = JSON.parse(crmFiles.find((f) => f.path === "crm-seed.json").content);
  // Paying customers: CRM accounts with status customer, excluding the planted
  // duplicate, the stale departed-owner records, and co-103 (its collections
  // story belongs to FIN-04). co-102 Amberfield Logistics stays first.
  const customers = crm.accounts.filter(
    (a) => a.status === "customer" && a.duplicate_of_account_id === "" && a.stale_flag === "false" && a.account_id !== "co-103"
  );
  if (customers.length < 10 || customers[0].account_id !== "co-102") {
    throw new Error(`FIN-01: expected co-102 first among at least 10 CRM customers, got ${customers.length}`);
  }
  const vendors = [...CANON_VENDORS.map((v) => v.name), ...NEUTRAL_VENDORS];

  const dateRng = createRng(id, "dates");
  const amountRng = createRng(id, "amounts");
  const partyRng = createRng(id, "counterparties");
  const plantRng = createRng(id, "planted");
  const checkRng = createRng(id, "checks");

  const businessDays = businessDaysBetween(PERIOD.start, PERIOD.end);
  const fridays = businessDays.filter((d) => weekday(d) === 5);
  const events = []; // { kind, channel, direction, date (bank posted), glDate, amountCents, counterparty, reference, bankDescription, glDescription, source }
  let invoiceSeq = INVOICE_REF_START;
  let apSeq = AP_REF_START;
  const nextInvoiceRef = () => `INV-2026-${String(invoiceSeq++).padStart(4, "0")}`;
  const nextApRef = () => `AP-2026-${String(apSeq++).padStart(4, "0")}`;

  // ---- receipts (bank credit, GL debit, source ar) ------------------
  for (let i = 0; i < COUNTS.arAch; i++) {
    const customer = i === 0 ? customers[0] : partyRng.pick(customers);
    const date = dateRng.pick(businessDays);
    const ref = nextInvoiceRef();
    events.push(receipt({ channel: "ach", date, glDate: date, amountCents: amountRng.int(120000, 4800000), customer, ref, bankVerb: "ACH CREDIT" }));
  }
  for (let i = 0; i < COUNTS.arWire; i++) {
    const customer = partyRng.pick(customers);
    const date = dateRng.pick(businessDays);
    const ref = nextInvoiceRef();
    events.push(receipt({ channel: "wire", date, glDate: date, amountCents: amountRng.int(2500000, 24000000), customer, ref, bankVerb: "WIRE IN" }));
  }
  const cardDays = dateRng.shuffle(businessDays).slice(0, COUNTS.arCard).sort();
  for (const date of cardDays) {
    const ref = `SETTLE-${date.replace(/-/g, "")}`;
    const amountCents = amountRng.int(80000, 950000);
    events.push({
      kind: "ar_card", channel: "card", direction: "credit", date, glDate: date, amountCents,
      counterparty: BANK.name, reference: ref,
      bankDescription: `CARD SETTLEMENT MERCHANT SERVICES ${ref}`,
      glDescription: `Card settlement - small-team tier - ${date}`, source: "ar",
    });
  }
  events.push({
    kind: "interest", channel: "interest", direction: "credit", date: PERIOD.end, glDate: PERIOD.end,
    amountCents: amountRng.int(90000, 140000), counterparty: BANK.name, reference: "INT-2026-03",
    bankDescription: "INTEREST PAID", glDescription: "Interest income - March 2026", source: "manual",
  });
  events.push({
    kind: "transfer_in", channel: "transfer", direction: "credit", date: "2026-03-02", glDate: "2026-03-02",
    amountCents: 25000000, counterparty: ACCOUNT_HOLDER.name, reference: "MMKT-2026-03-02",
    bankDescription: `TRANSFER FROM MONEY MARKET ${MONEY_MARKET_ACCOUNT_MASKED}`,
    glDescription: "Transfer from money market sweep", source: "manual",
  });

  // ---- payments (bank debit, GL credit) --------------------------------
  for (let i = 0; i < COUNTS.apAch; i++) {
    const vendor = partyRng.pick(vendors);
    const date = dateRng.pick(businessDays);
    // AP books the payment on release day; the bank posts it the same day or
    // one or two business days later. Never before the period opens.
    const glLag = dateRng.pick([0, 0, 0, 1, 2]);
    events.push(payment({ channel: "ach", date, glDate: businessDaysBefore(date, glLag), amountCents: amountRng.int(35000, 3800000), vendor, ref: nextApRef(), bankVerb: "ACH DEBIT" }));
  }
  events.push(payment({ channel: "wire", date: "2026-03-02", glDate: "2026-03-02", amountCents: 18500000, vendor: LANDLORD.name, ref: "RENT-2026-03", bankVerb: "WIRE OUT" }));
  for (let i = 0; i < COUNTS.apWire; i++) {
    const vendor = partyRng.pick(vendors);
    const date = dateRng.pick(businessDays);
    events.push(payment({ channel: "wire", date, glDate: date, amountCents: amountRng.int(2000000, 9500000), vendor, ref: nextApRef(), bankVerb: "WIRE OUT" }));
  }
  events.push({
    kind: "benefits", channel: "ach", direction: "debit", date: "2026-03-05", glDate: "2026-03-05",
    amountCents: amountRng.int(19000000, 23000000), counterparty: PAYROLL_PLATFORM.name, reference: "BEN-2026-03",
    bankDescription: `ACH DEBIT ${upper(PAYROLL_PLATFORM.name)} BEN-2026-03`,
    glDescription: `Benefits remittance - ${PAYROLL_PLATFORM.name} - March 2026`, source: "payroll",
  });
  for (const date of ["2026-03-13", "2026-03-27"]) {
    const ref = `PAYROLL-${date.replace(/-/g, "")}`;
    events.push({
      kind: "payroll_transfer", channel: "transfer", direction: "debit", date, glDate: date,
      amountCents: amountRng.int(160000000, 172000000), counterparty: ACCOUNT_HOLDER.name, reference: ref,
      bankDescription: `TRANSFER TO PAYROLL ACCT ${PAYROLL_ACCOUNT_MASKED}`,
      glDescription: `Payroll funding transfer - ${date}`, source: "payroll",
    });
  }
  for (const date of fridays.slice(0, COUNTS.cardSettlement)) {
    const ref = `CARD-${date.replace(/-/g, "")}`;
    events.push({
      kind: "card_settlement", channel: "card", direction: "debit", date, glDate: date,
      amountCents: amountRng.int(800000, 2600000), counterparty: BANK.name, reference: ref,
      bankDescription: `CORPORATE CARD SETTLEMENT ${ref}`, glDescription: `Corporate card settlement - ${date}`, source: "ap",
    });
  }
  events.push({
    kind: "bank_fee", channel: "fee", direction: "debit", date: PERIOD.end, glDate: PERIOD.end,
    amountCents: 24500, counterparty: BANK.name, reference: "MAINT-2026-03",
    bankDescription: "MONTHLY ACCOUNT MAINTENANCE FEE", glDescription: "Bank service charge - March 2026", source: "bank_fee",
  });

  // ---- checks: 28 cleared in March plus 12 outstanding, one number series --
  const checks = [];
  const earlyDays = businessDays.filter((d) => d <= "2026-03-24");
  for (let i = 0; i < COUNTS.apCheckCleared; i++) {
    const issue = checkRng.pick(earlyDays);
    let clear = nextBusinessDay(issue);
    for (let k = checkRng.int(0, 4); k > 0 && nextBusinessDay(clear) <= PERIOD.end; k--) clear = nextBusinessDay(clear);
    checks.push({ issue, clear, amountCents: amountRng.int(18000, 1250000), payee: partyRng.pick(vendors), outstanding: false });
  }
  const lateDays = businessDays.filter((d) => d >= "2026-03-23");
  const midDays = businessDays.filter((d) => d >= "2026-03-09" && d <= "2026-03-20");
  for (let i = 0; i < COUNTS.outstandingChecks; i++) {
    const issue = i < 9 ? checkRng.pick(lateDays) : checkRng.pick(midDays);
    checks.push({ issue, clear: null, amountCents: amountRng.int(15000, 980000), payee: partyRng.pick(vendors), outstanding: true });
  }
  checks.sort((a, b) => (a.issue < b.issue ? -1 : a.issue > b.issue ? 1 : 0)); // stable: ties keep generation order
  checks.forEach((c, i) => { c.number = String(CHECK_NUMBER_START + i); });
  for (const c of checks) {
    events.push({
      kind: c.outstanding ? "check_outstanding" : "check_cleared", channel: "check", direction: "debit",
      date: c.clear, glDate: c.issue, amountCents: c.amountCents, counterparty: c.payee, reference: c.number,
      bankDescription: `CHECK ${c.number}`, glDescription: `Check ${c.number} - ${c.payee}`, source: "ap",
      checkNumber: c.number, outstanding: c.outstanding,
    });
  }

  // ---- planted features ------------------------------------------------
  // 1. duplicated deposit: an ACH receipt on a Monday to Thursday, so its copy
  //    lands one calendar day later, still inside the period.
  const dupCandidates = events.filter((e) => e.kind === "ar_ach" && weekday(e.date) >= 1 && weekday(e.date) <= 4 && e.date <= "2026-03-27");
  const dupSource = plantRng.pick(dupCandidates);
  const duplicateCopy = { ...dupSource, kind: "ar_ach_duplicate", date: nextBusinessDay(dupSource.date), duplicateOf: dupSource };
  // 2. unmatched payment A: an outgoing wire fee the GL has not booked.
  const feeDayWire = plantRng.pick(events.filter((e) => e.kind === "ap_wire"));
  const unrecordedFee = {
    kind: "unrecorded_fee", channel: "fee", direction: "debit", date: feeDayWire.date, glDate: null,
    amountCents: 3500, counterparty: BANK.name, reference: `WIREFEE-${feeDayWire.date.replace(/-/g, "")}`,
    bankDescription: "OUTGOING WIRE FEE", glDescription: null, source: null,
  };
  // 3. unmatched payment B: one vendor ACH whose GL amount is a transposition.
  const transposed = plantRng.pick(events.filter((e) => e.kind === "ap_ach" && e.amountCents >= 100000));
  transposed.glAmountCents = transposeDollars(transposed.amountCents);
  // 4. deposit in transit: GL on the statement end date, bank on 2026-04-01.
  const ditCustomer = plantRng.pick(customers);
  const depositInTransit = receipt({
    channel: "ach", date: DEPOSIT_IN_TRANSIT_BANK_DATE, glDate: DEPOSIT_IN_TRANSIT_GL_DATE,
    amountCents: amountRng.int(500000, 4000000), customer: ditCustomer, ref: nextInvoiceRef(), bankVerb: "ACH CREDIT",
  });
  depositInTransit.kind = "ar_ach_in_transit";

  // ---- bank statement rows (March only, in posting order) ----------------
  const bankEvents = [
    ...events.filter((e) => e.date && e.date >= PERIOD.start && e.date <= PERIOD.end && e.kind !== "check_outstanding"),
    duplicateCopy,
    unrecordedFee,
  ];
  bankEvents.sort(byDateThenOrder(events.concat([duplicateCopy, unrecordedFee]), "date"));
  let running = OPENING_BALANCE_CENTS;
  let creditTotal = 0;
  let debitTotal = 0;
  const bank = bankEvents.map((e, i) => {
    running += e.direction === "credit" ? e.amountCents : -e.amountCents;
    if (e.direction === "credit") creditTotal += e.amountCents; else debitTotal += e.amountCents;
    if (running < 0) throw new Error(`FIN-01: running balance went negative at row ${i + 1}`);
    return {
      txn_id: `BNK-${PERIOD.label}-${String(i + 1).padStart(4, "0")}`,
      posted_date: e.date,
      value_date: valueDateFor(e.channel, e.direction, e.date),
      description: e.bankDescription,
      counterparty: e.counterparty,
      reference: e.reference,
      type: e.direction,
      amount: cents(e.amountCents),
      running_balance: cents(running),
      channel: e.channel,
    };
  });
  const endingBank = running;

  // ---- GL cash ledger rows (every event the books know about) ---------------
  const glEvents = [...events, depositInTransit];
  glEvents.sort(byDateThenOrder(glEvents, "glDate"));
  let glBalance = OPENING_BALANCE_CENTS;
  const gl = glEvents.map((e, i) => {
    const amt = e.glAmountCents ?? e.amountCents;
    glBalance += e.direction === "credit" ? amt : -amt; // bank credit = GL debit to cash
    const jeId = `JE-${PERIOD.label}-${String(i + 1).padStart(4, "0")}`;
    e.jeId = jeId;
    return {
      je_id: jeId,
      posting_date: e.glDate,
      gl_account: OPERATING_CASH_ACCOUNT.code,
      description: e.glDescription,
      counterparty: e.counterparty,
      reference: e.reference,
      debit: e.direction === "credit" ? cents(amt) : "",
      credit: e.direction === "debit" ? cents(amt) : "",
      source: e.source,
      prepared_by: PREPARER_EMPLOYEE_ID,
    };
  });
  const endingGl = glBalance;

  // ---- outstanding checks (FIN-03) ------------------------------------------
  const outstandingEvents = glEvents.filter((e) => e.kind === "check_outstanding");
  const outstanding = outstandingEvents.map((e) => ({
    check_number: e.checkNumber,
    issue_date: e.glDate,
    payee: e.counterparty,
    amount: cents(e.amountCents),
    gl_je_id: e.jeId,
    status: "outstanding",
  }));

  // ---- tie-out (integer cents; throw if it does not tie) ----------------------
  const outstandingTotal = outstandingEvents.reduce((s, e) => s + e.amountCents, 0);
  const adjustedBank = endingBank + depositInTransit.amountCents - outstandingTotal - duplicateCopy.amountCents;
  const adjustedBook = endingGl - unrecordedFee.amountCents + (transposed.glAmountCents - transposed.amountCents);
  if (adjustedBank !== adjustedBook) {
    throw new Error(`FIN-01: tie-out failed, adjusted bank ${cents(adjustedBank)} vs adjusted book ${cents(adjustedBook)}`);
  }

  const summary = {
    generated_from_spec: id,
    account_holder: ACCOUNT_HOLDER,
    bank: BANK,
    account: { description: "Operating account", number_masked: OPERATING_ACCOUNT_MASKED, gl_account: OPERATING_CASH_ACCOUNT.code },
    currency: "USD",
    period: { start: PERIOD.start, end: PERIOD.end },
    opening_balance: cents(OPENING_BALANCE_CENTS),
    ending_balance: cents(endingBank),
    credit_count: bank.filter((r) => r.type === "credit").length,
    credit_total: cents(creditTotal),
    debit_count: bank.filter((r) => r.type === "debit").length,
    debit_total: cents(debitTotal),
    transaction_count: bank.length,
  };

  return {
    bank,
    summary,
    gl,
    outstanding,
    tieOut: {
      openingBalanceCents: OPENING_BALANCE_CENTS,
      endingBankCents: endingBank,
      endingGlCents: endingGl,
      adjustedBankCents: adjustedBank,
      adjustedBookCents: adjustedBook,
    },
  };
}

function receipt({ channel, date, glDate, amountCents, customer, ref, bankVerb }) {
  return {
    kind: `ar_${channel}`, channel, direction: "credit", date, glDate, amountCents,
    counterparty: customer.name, reference: ref, customerId: customer.account_id,
    bankDescription: `${bankVerb} ${upper(customer.name)} ${ref}`,
    glDescription: `Customer receipt - ${customer.name} - ${ref}`, source: "ar",
  };
}

function payment({ channel, date, glDate, amountCents, vendor, ref, bankVerb }) {
  return {
    kind: `ap_${channel}`, channel, direction: "debit", date, glDate, amountCents,
    counterparty: vendor, reference: ref,
    bankDescription: `${bankVerb} ${upper(vendor)} ${ref}`,
    glDescription: `Vendor payment - ${vendor} - ${ref}`, source: "ap",
  };
}

/** Sort by an ISO date field, ties broken by original generation order (deterministic). */
function byDateThenOrder(order, field) {
  const index = new Map(order.map((e, i) => [e, i]));
  return (a, b) => {
    if (a[field] < b[field]) return -1;
    if (a[field] > b[field]) return 1;
    return index.get(a) - index.get(b);
  };
}

function assertRole(row, employeeId, roleTitle) {
  if (!row) throw new Error(`FIN-01: ${employeeId} is not in the CORE-04 roster`);
  if (row.role_title !== roleTitle) throw new Error(`FIN-01: ${employeeId} is a ${row.role_title}, expected ${roleTitle}`);
  if (row.employment_status !== "active") throw new Error(`FIN-01: ${employeeId} is not active`);
  if (row.finance_system_role === SOD_CONFLICT_ROLE) throw new Error(`FIN-01: ${employeeId} is the planted SoD-conflict row`);
}

// ---------------------------------------------------------------- variants

// A variant is a trimmed slice of this dataset, emitted by this generator under
// variants/, derived from a sibling file by a predicate over that file's own
// columns (spec FIN-01 `variants`, datagen/README.md "Dataset variants"). The
// predicate lives here, the sentence describing it lives in the spec, and the
// test re-derives the file from the parent rather than trusting the bytes.
//
// This one exists for finance-local-ai, which compares a local model against a
// cloud model on a bank feed small enough to fit in a prompt. The predicate
// names no defect; it selects the ACH customer receipts of two statement days.
// The parent's duplicated deposit falls inside that window, which is what makes
// the slice worth classifying, and the assertions below fail the build if a
// future reroll of the feed moves it out.
export const VARIANT_ACH_RECEIPTS = {
  name: "ach-receipts-mar-05-06",
  file: "variants/ach-receipts-mar-05-06.csv",
  derivedFrom: "bank-transactions.csv",
  dates: ["2026-03-05", "2026-03-06"],
  predicate: (row) =>
    row.channel === "ach"
    && row.type === "credit"
    && VARIANT_ACH_RECEIPTS.dates.includes(row.posted_date),
};

/**
 * Apply a variant's predicate to the parent rows, in parent file order.
 * Exported so the test derives the variant the same way the generator does,
 * from one definition rather than two.
 */
export function selectVariantRows(bank, variant = VARIANT_ACH_RECEIPTS) {
  return bank.filter(variant.predicate);
}

function buildAchReceiptsVariant(bank) {
  const rows = selectVariantRows(bank, VARIANT_ACH_RECEIPTS);
  if (rows.length < 6 || rows.length > 10) {
    throw new Error(
      `FIN-01 variant ${VARIANT_ACH_RECEIPTS.name}: ${rows.length} rows, expected 6 to 10 `
      + `(the excerpt has to fit a lesson card and a tutor prompt)`
    );
  }
  const pairs = rows.map((r) => `${r.amount}|${r.reference}`);
  if (new Set(pairs).size === pairs.length) {
    throw new Error(
      `FIN-01 variant ${VARIANT_ACH_RECEIPTS.name}: the window no longer contains the repeated `
      + `receipt, so the offline demo has nothing in it to find`
    );
  }
  return { path: VARIANT_ACH_RECEIPTS.file, content: toCsv(BANK_COLUMNS, rows) };
}

// ---------------------------------------------------------------- generate

export function generate() {
  const { bank, summary } = buildCashReconciliation();
  return [
    { path: "bank-transactions.csv", content: toCsv(BANK_COLUMNS, bank) },
    { path: "bank-statement-summary.json", content: JSON.stringify(summary, null, 2) + "\n" },
    buildAchReceiptsVariant(bank),
  ];
}

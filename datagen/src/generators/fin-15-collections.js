// FIN-15 customer-credit-notes and FIN-16 collections-contact-log: the two
// halves of co-002's receivables follow-up on the aging FIN-04 already shipped.
// One builder emits both, the way fin-06-procure-to-pay.js emits four ids, so
// the credit note behind a disputed invoice and the contact that disputed it can
// never disagree about which document is in play.
//
// Nothing here invents a receivable. The customer population, every open
// balance, every days-past-due figure and the AR clerk who owns each account are
// read out of buildArAging(); the credit limits come from the CRM segment
// CORE-03 assigns; the approver of a credit note is resolved through the shipped
// FIN-39 write-off authority rows rather than named here. A reroll of FIN-04
// therefore changes these files rather than silently contradicting them.
//
// Planted features (specs FIN-15 and FIN-16), each derivable by a rule over the
// data and never by a label:
//   P1. the six FIN-04 credit memos are the spine. Same customer, same
//       applied_to_document, amount equal to the absolute value of the FIN-04
//       open_balance to the cent. One of the six carries an empty
//       applied_to_document because FIN-04's own unapplied-memo plant does.
//   P2. two notes are still requested: no issue date, no AR document, no
//       approver. One of them is the note behind the live dispute below.
//   P3. eight notes were issued and fully applied before the period end, so they
//       appear nowhere in the aging. An applied credit leaves no open balance.
//   P4. exactly one customer's open balance exceeds the credit limit its CRM
//       segment carries. The limits are a standard per-segment table, so which
//       account breaches is decided by the aging rather than written down here.
//   P5. exactly one promise to pay is broken: promised before the as-of, with no
//       later contact recording a payment of at least the promised amount. Two
//       further promises were kept, so a broken one is a finding rather than the
//       only shape a promise takes.
//   P6. exactly one dispute is still live: no later contact names the same
//       document. It resolves to a FIN-04 invoice and to a FIN-15 note still in
//       status requested, so the invoice is not collectable as billed. It sits
//       on the healthiest payer in the aging, drawn as the account with the
//       lowest oldest days-past-due, so the distressed account is not the answer
//       to every question the log asks. A second dispute was resolved.
//
// Every plant is asserted before the builder returns (the FIN-38 "the builder
// refuses to emit" precedent), and re-derived independently in
// tests/generators/fin-15-credit-notes.test.js and fin-16-collections-log.test.js.
import { toCsv } from "../csv.js";
import { addDays, diffDays, rollForwardPastWeekend } from "../dates.js";
import { createRng } from "../seed.js";
import { buildArAging } from "./fin-04-ar-aging.js";
import { buildDecisionAuthorityMatrix } from "./fin-39-decision-authority-matrix.js";
import { generate as generateCrmSeed } from "./core-03-crm-seed.js";
import { financeRoster } from "./finance-roles.js";
import { SOD_CONFLICT_ROLE } from "./fin-01-cash-recon.js";

export const id = "FIN-15";

// ---------------------------------------------------------------- constants

export const CREDIT_NOTE_COLUMNS = [
  "credit_note_id", "customer_canon_id", "customer_name", "requested_date", "issued_date",
  "reason_code", "amount", "currency", "status", "applied_to_document", "ar_document_number",
  "requested_by_employee_id", "approved_by_employee_id",
];

export const CONTACT_LOG_COLUMNS = [
  "contact_id", "customer_canon_id", "customer_name", "contact_date", "channel", "direction",
  "dunning_stage", "owner_employee_id", "outcome", "promise_to_pay_date", "promise_amount",
  "disputed_document_number", "next_action_date",
];

export const CREDIT_NOTE_PERIOD = { start: "2026-01-01", end: "2026-03-31" };
export const CONTACT_PERIOD = { start: "2026-02-02", end: "2026-04-03" };
/** The day the collections picture is read. The log stops here. */
export const CONTACT_AS_OF = CONTACT_PERIOD.end;

export const REASON_CODES = ["pricing_error", "service_credit", "duplicate_billing", "goodwill", "dispute_settlement"];
export const CREDIT_NOTE_STATUSES = ["issued", "requested"];
export const CHANNELS = ["email", "phone", "letter"];
export const DIRECTIONS = ["outbound", "inbound"];
export const OUTCOMES = ["no_answer", "message_left", "promise_to_pay", "payment_received", "dispute_raised", "escalated"];
/** Outcomes a contact reaches on its own, before a plant overrides one. */
const BASE_OUTCOMES = ["no_answer", "message_left"];

export const SPINE_NOTE_COUNT = 6;
export const APPLIED_NOTE_COUNT = 8;
export const REQUESTED_NOTE_COUNT = 2;

/** Accounts collections works: the largest exposures in the aging. */
export const LOG_CUSTOMER_COUNT = 12;
export const TARGET_CONTACTS = 64;

/**
 * The standard credit limit per CRM segment, in integer cents. A credit
 * department sets one limit per tier and reviews it at renewal; it does not
 * price a limit per customer, and it certainly does not set one so that a
 * particular account breaches. Which account is over its limit is therefore
 * decided by the aging, and the builder asserts that exactly one is.
 */
export const SEGMENT_CREDIT_LIMITS = {
  Enterprise: 75000000,
  "Mid-Market": 18000000,
  SMB: 6000000,
};

/**
 * The dunning ladder. It escalates by channel and by action rather than by
 * owner: two AR clerks hold the whole book in FIN-04, so the log's owner is
 * always one of them. Escalation of people is the dispute rule (to the
 * Controller) and the write-off authority (to FIN-39 DA-12 and DA-13).
 */
export const DUNNING_LADDER = [
  {
    stage: 1, days_past_due_min: 1, channel: "email", owner_role: "AR Clerk",
    action: "Send the statement and a first reminder naming the open documents",
  },
  {
    stage: 2, days_past_due_min: 31, channel: "phone", owner_role: "AR Clerk",
    action: "Call the accounts payable contact and record a promise to pay",
  },
  {
    stage: 3, days_past_due_min: 61, channel: "phone", owner_role: "AR Clerk",
    action: "Confirm the promise in writing and put new orders under review",
  },
  {
    stage: 4, days_past_due_min: 91, channel: "letter", owner_role: "AR Clerk",
    action: "Issue a formal demand and prepare a write off recommendation for approval",
  },
];

/** Days past due beyond which a breached limit becomes a hold rather than a flag. */
const CREDIT_HOLD_DAYS_PAST_DUE = 90;

/** The FIN-39 rows that decide a receivable write off, lowest band first. */
export const WRITE_OFF_AUTHORITY = ["DA-12", "DA-13"];

/** Contacts a customer receives, by dunning stage: [min, max]. */
const CONTACTS_BY_STAGE = { 1: [3, 4], 2: [3, 5], 3: [4, 6], 4: [5, 7] };

const CREDIT_NOTE_ID_START = 101;
/**
 * AR document numbers for the credit notes that never reach the open aging.
 * FIN-04 hands out CM-2026-0001 upward for the six memos it carries, so this
 * block starts at 0101 and the two ranges cannot collide.
 */
const SETTLED_MEMO_START = 101;
/**
 * Invoices those notes cleared. FIN-04 reserves INV-2025-08NN, INV-2025-12NN,
 * INV-2026-01NN through 03NN and INV-2026-05NN/06NN, and FIN-02 collected
 * INV-2026-04NN, so INV-2025-09NN is free and nothing resolves by accident.
 */
const SETTLED_INVOICE_START = 901;
const CONTACT_ID_START = 101;

// ------------------------------------------------------------------ helpers

function cents(n) { return (n / 100).toFixed(2); }
function toCents(money) { return Math.round(Number(money) * 100); }

/** The highest ladder stage whose floor a days-past-due figure has reached. */
export function stageFor(daysPastDue) {
  const reached = DUNNING_LADDER.filter((s) => daysPastDue >= s.days_past_due_min);
  if (reached.length === 0) {
    throw new Error(`${id}: no dunning stage opens at ${daysPastDue} days past due`);
  }
  return reached[reached.length - 1].stage;
}

/** A business day on or after `isoDate`, so no contact is logged on a weekend. */
function businessDay(isoDate) {
  return rollForwardPastWeekend(isoDate);
}

/**
 * `count` strictly increasing business days spread across [start, end]. Even
 * spacing with a small deterministic jitter, so a customer's outreach reads like
 * a cadence rather than a burst, and no two contacts share a date.
 */
function spreadContactDates(start, end, count, rng) {
  const span = diffDays(start, end);
  if (span < count) throw new Error(`${id}: cannot fit ${count} contacts into ${span} days`);
  const dates = [];
  let floor = start;
  for (let i = 0; i < count; i += 1) {
    const target = addDays(start, Math.round(((i + 0.5) * span) / count) + rng.int(-1, 1));
    let date = businessDay(target < floor ? floor : target);
    while (date > end) date = addDays(date, -1);
    date = businessDay(date > end ? end : date);
    if (date > end || date < floor) date = floor;
    dates.push(date);
    floor = businessDay(addDays(date, 1));
  }
  for (let i = 1; i < dates.length; i += 1) {
    if (dates[i] <= dates[i - 1]) throw new Error(`${id}: contact dates are not strictly increasing`);
  }
  if (dates[dates.length - 1] > end) throw new Error(`${id}: a contact falls after the period end`);
  return dates;
}

/** The most senior-appropriate holder of a role: lowest employee id, never the SoD conflict. */
function holderOf(roster, roleTitle, excludeEmployeeIds = []) {
  const holders = roster
    .filter((r) => (
      r.role_title === roleTitle && r.employment_status === "active" && r.department === "Finance" &&
      r.finance_system_role !== SOD_CONFLICT_ROLE && !excludeEmployeeIds.includes(r.employee_id)
    ))
    .sort((a, b) => (a.employee_id < b.employee_id ? -1 : 1));
  if (holders.length === 0) throw new Error(`${id}: no active Finance employee holds "${roleTitle}"`);
  return holders[0].employee_id;
}

// ------------------------------------------------------------ the receivable

/**
 * The aging, folded into one row per customer: what they owe, how old the
 * oldest document is, which CRM segment prices their credit limit, and which AR
 * clerk owns them. Everything downstream reads this rather than the raw rows.
 */
function readReceivable() {
  const { aging } = buildArAging();
  const crm = JSON.parse(
    generateCrmSeed({ rng: (stream) => createRng("CORE-03", stream) })
      .find((f) => f.path === "crm-seed.json").content
  );
  const segments = new Map(crm.accounts.map((a) => [a.account_id, a.segment]));

  const customers = new Map();
  for (const row of aging) {
    const seen = customers.get(row.customer_canon_id) ?? {
      customer_canon_id: row.customer_canon_id,
      customer_name: row.customer_name,
      segment: segments.get(row.customer_canon_id),
      arOwnerEmployeeId: row.ar_owner_employee_id,
      openCents: 0,
      oldestDaysPastDue: 0,
      invoices: [],
    };
    seen.openCents += toCents(row.open_balance);
    seen.oldestDaysPastDue = Math.max(seen.oldestDaysPastDue, Number(row.days_past_due));
    if (row.document_type === "invoice") seen.invoices.push(row);
    customers.set(row.customer_canon_id, seen);
  }
  for (const customer of customers.values()) {
    if (!(customer.segment in SEGMENT_CREDIT_LIMITS)) {
      throw new Error(`${id}: ${customer.customer_canon_id} is a "${customer.segment}" account, which carries no credit limit`);
    }
    customer.creditLimitCents = SEGMENT_CREDIT_LIMITS[customer.segment];
    customer.stage = stageFor(customer.oldestDaysPastDue);
    customer.invoices.sort((a, b) => toCents(b.open_balance) - toCents(a.open_balance));
  }

  const memos = aging.filter((r) => r.document_type === "credit_memo");
  if (memos.length !== SPINE_NOTE_COUNT) {
    throw new Error(`${id}: FIN-04 ships ${memos.length} credit memos, and the spine expects ${SPINE_NOTE_COUNT}`);
  }
  return { aging, customers, memos, documentNumbers: new Set(aging.map((r) => r.document_number)) };
}

/** Rank customers by a key, refusing to proceed if the cut is a tie. */
function rankedBy(customers, keyOf, cut) {
  const ranked = [...customers.values()].sort((a, b) => keyOf(b) - keyOf(a) || (a.customer_canon_id < b.customer_canon_id ? -1 : 1));
  if (cut !== undefined && ranked.length > cut && keyOf(ranked[cut - 1]) === keyOf(ranked[cut])) {
    throw new Error(`${id}: the aging ties at rank ${cut}, so the selection is not decided by the data`);
  }
  return ranked;
}

// -------------------------------------------------------------------- FIN-15

function buildCreditNotes(receivable, roster, authority) {
  const { customers, memos, documentNumbers } = receivable;
  const dateRng = createRng(id, "note-dates");
  const amountRng = createRng(id, "note-amounts");
  const reasonRng = createRng(id, "note-reasons");

  // Which two accounts are healthy enough that an open credit request is the
  // only thing standing between them and payment: the two lowest oldest
  // days-past-due figures in the aging.
  const byHealth = [...customers.values()].sort(
    (a, b) => a.oldestDaysPastDue - b.oldestDaysPastDue || (a.customer_canon_id < b.customer_canon_id ? -1 : 1)
  );
  if (byHealth[0].oldestDaysPastDue === byHealth[1].oldestDaysPastDue) {
    throw new Error(`${id}: two accounts tie as the healthiest payer, so the live dispute is not decided by the aging`);
  }
  if (byHealth[1].oldestDaysPastDue === byHealth[2].oldestDaysPastDue) {
    throw new Error(`${id}: two accounts tie as the second healthiest payer`);
  }

  const notes = [];
  const claimedInvoices = new Set();

  // P1: the spine. Dates, customer, applied_to_document and amount all come
  // from the FIN-04 memo; only the request that preceded it is new.
  for (const memo of memos) {
    const customer = customers.get(memo.customer_canon_id);
    notes.push({
      customer,
      requested_date: addDays(memo.document_date, -dateRng.int(3, 9)),
      issued_date: memo.document_date,
      amountCents: Math.abs(toCents(memo.open_balance)),
      status: "issued",
      applied_to_document: memo.applied_to_document,
      ar_document_number: memo.document_number,
    });
    if (memo.applied_to_document !== "") claimedInvoices.add(memo.applied_to_document);
  }

  // P3: eight notes issued and fully applied before the period end. They sit on
  // the largest exposures that do not already carry a memo, and the invoices
  // they cleared are closed, which is why the aging has never heard of them.
  const spineCustomers = new Set(memos.map((m) => m.customer_canon_id));
  const appliedCustomers = rankedBy(customers, (c) => c.openCents)
    .filter((c) => !spineCustomers.has(c.customer_canon_id))
    .slice(0, APPLIED_NOTE_COUNT);
  if (appliedCustomers.length !== APPLIED_NOTE_COUNT) {
    throw new Error(`${id}: only ${appliedCustomers.length} accounts are free to carry a settled credit note`);
  }
  appliedCustomers.forEach((customer, index) => {
    const requested = businessDay(addDays("2026-01-05", dateRng.int(0, 40)));
    const settledInvoice = `INV-2025-${String(SETTLED_INVOICE_START + index).padStart(4, "0")}`;
    if (documentNumbers.has(settledInvoice)) {
      throw new Error(`${id}: ${settledInvoice} is still open in the aging, so it cannot be the invoice a settled credit cleared`);
    }
    notes.push({
      customer,
      requested_date: requested,
      issued_date: businessDay(addDays(requested, dateRng.int(2, 8))),
      amountCents: amountRng.int(30000, 1500000),
      status: "issued",
      applied_to_document: settledInvoice,
      ar_document_number: `CM-2026-0${SETTLED_MEMO_START + index}`,
    });
  });

  // P2: two open requests. The first sits on the healthiest payer and names the
  // invoice FIN-16's live dispute is raised against; the second sits on the
  // next healthiest, so neither open request is on a distressed account.
  const requestedCarriers = byHealth.slice(0, REQUESTED_NOTE_COUNT);
  const disputedInvoices = [];
  requestedCarriers.forEach((customer, index) => {
    const invoice = customer.invoices.find((row) => !claimedInvoices.has(row.document_number));
    if (!invoice) throw new Error(`${id}: ${customer.customer_canon_id} has no unclaimed invoice to raise a credit request against`);
    claimedInvoices.add(invoice.document_number);
    disputedInvoices.push(invoice);
    notes.push({
      customer,
      requested_date: businessDay(addDays("2026-03-16", dateRng.int(0, 7))),
      issued_date: "",
      // A credit request is capped by what is still open on the invoice it
      // disputes: nobody credits more than the customer was billed.
      amountCents: Math.max(1, Math.round(toCents(invoice.open_balance) * amountRng.amount(0.2, 0.6, 4))),
      status: "requested",
      applied_to_document: invoice.document_number,
      ar_document_number: "",
      openRequestIndex: index,
    });
  });

  // Reason codes: every code occurs at least once, and the two open requests
  // carry the reason a customer actually raises a credit request over.
  const filler = reasonRng.shuffle([
    ...REASON_CODES,
    ...Array.from({ length: notes.length - REASON_CODES.length - REQUESTED_NOTE_COUNT }, () => reasonRng.pick(REASON_CODES)),
  ]);
  let fillerIndex = 0;
  for (const note of notes) {
    note.reason_code = note.status === "requested"
      ? (note.openRequestIndex === 0 ? "dispute_settlement" : "pricing_error")
      : filler[fillerIndex++];
  }

  // Numbering: chronological by request, so the series reads like a queue.
  notes.sort((a, b) => (
    a.requested_date < b.requested_date ? -1 : a.requested_date > b.requested_date ? 1
      : a.customer.customer_canon_id < b.customer.customer_canon_id ? -1 : 1
  ));

  const bands = WRITE_OFF_AUTHORITY.map((controlId) => {
    const row = authority.find((r) => r.control_id === controlId);
    if (!row) throw new Error(`${id}: ${controlId} is not a control_id in the FIN-39 matrix`);
    return row;
  });

  const rows = notes.map((note, index) => {
    const requestedBy = note.customer.arOwnerEmployeeId;
    let approvedBy = "";
    if (note.status === "issued") {
      const dollars = note.amountCents / 100;
      const band = bands.find((b) => (
        dollars >= Number(b.amount_min_usd) && (b.amount_max_usd === "" || dollars <= Number(b.amount_max_usd))
      ));
      if (!band) throw new Error(`${id}: ${cents(note.amountCents)} falls in no FIN-39 write-off band`);
      approvedBy = holderOf(roster, band.approver_role, [requestedBy]);
    }
    return {
      credit_note_id: `CN-2026-0${CREDIT_NOTE_ID_START + index}`,
      customer_canon_id: note.customer.customer_canon_id,
      customer_name: note.customer.customer_name,
      requested_date: note.requested_date,
      issued_date: note.issued_date,
      reason_code: note.reason_code,
      amount: cents(note.amountCents),
      currency: "USD",
      status: note.status,
      applied_to_document: note.applied_to_document,
      ar_document_number: note.ar_document_number,
      requested_by_employee_id: requestedBy,
      approved_by_employee_id: approvedBy,
    };
  });

  return { rows, disputedInvoices };
}

// -------------------------------------------------------------------- FIN-16

function buildContactLog(receivable, disputedInvoices) {
  const { customers } = receivable;
  const countRng = createRng(id, "contact-counts");
  const dateRng = createRng(id, "contact-dates");
  const outcomeRng = createRng(id, "contact-outcomes");
  const plantRng = createRng(id, "contact-plants");
  const amountRng = createRng(id, "contact-amounts");

  const worked = rankedBy(customers, (c) => c.openCents, LOG_CUSTOMER_COUNT).slice(0, LOG_CUSTOMER_COUNT);

  // How many contacts each account received. Drawn inside a stage-dependent
  // band, then settled on the target the way FIN-04 settles its invoice counts,
  // so the file size is stable while the per-account cadence still varies.
  const counts = new Map(worked.map((c) => [c.customer_canon_id, countRng.int(...CONTACTS_BY_STAGE[c.stage])]));
  const totalOf = () => [...counts.values()].reduce((sum, n) => sum + n, 0);
  for (let guard = 0; totalOf() !== TARGET_CONTACTS; guard += 1) {
    if (guard > 1000) throw new Error(`${id}: could not settle the per-customer contact counts`);
    const short = totalOf() < TARGET_CONTACTS;
    const target = worked.find((c) => {
      const [min, max] = CONTACTS_BY_STAGE[c.stage];
      return short ? counts.get(c.customer_canon_id) < max : counts.get(c.customer_canon_id) > min;
    });
    if (!target) throw new Error(`${id}: the contact-count bands cannot reach ${TARGET_CONTACTS}`);
    counts.set(target.customer_canon_id, counts.get(target.customer_canon_id) + (short ? 1 : -1));
  }

  // The live dispute sits on the account FIN-15 raised its first open request
  // against, which is the healthiest payer in the aging.
  const liveDispute = disputedInvoices[0];
  const liveDisputeCustomer = liveDispute.customer_canon_id;
  if (!worked.some((c) => c.customer_canon_id === liveDisputeCustomer)) {
    throw new Error(`${id}: the account carrying the live dispute is not one of the ${LOG_CUSTOMER_COUNT} being worked`);
  }

  // A resolved dispute and three promises, drawn from the accounts that are far
  // enough down the ladder for either to be in character and are not already
  // carrying the live dispute.
  const eligible = worked.filter((c) => c.stage >= 2 && c.customer_canon_id !== liveDisputeCustomer);
  const drawn = plantRng.shuffle(eligible);
  const resolvedDisputeCustomer = drawn[0];
  const promiseCarriers = drawn.slice(1, 4);
  if (promiseCarriers.length !== 3) throw new Error(`${id}: fewer than three accounts can carry a promise to pay`);
  const [brokenPromiseCustomer] = promiseCarriers;

  const claimed = new Set(disputedInvoices.map((row) => row.document_number));
  const resolvedInvoice = resolvedDisputeCustomer.invoices.find((row) => !claimed.has(row.document_number));
  if (!resolvedInvoice) throw new Error(`${id}: ${resolvedDisputeCustomer.customer_canon_id} has no invoice free to carry the resolved dispute`);

  const contacts = [];
  for (const customer of worked) {
    const count = counts.get(customer.customer_canon_id);
    const dates = spreadContactDates(CONTACT_PERIOD.start, CONTACT_PERIOD.end, count, dateRng);
    const stage = DUNNING_LADDER[customer.stage - 1];
    const rows = dates.map((contact_date) => ({
      customer,
      contact_date,
      channel: stage.channel,
      direction: "outbound",
      dunning_stage: String(customer.stage),
      owner_employee_id: customer.arOwnerEmployeeId,
      outcome: outcomeRng.pick(BASE_OUTCOMES),
      promise_to_pay_date: "",
      promiseAmountCents: null,
      disputed_document_number: "",
    }));

    const inbound = (row) => { row.direction = "inbound"; row.channel = "email"; };

    // P6: the live dispute is the account's last contact, so nothing later can
    // resolve it. The resolved dispute is followed by the payment that settles it.
    if (customer.customer_canon_id === liveDisputeCustomer) {
      const row = rows[rows.length - 1];
      row.outcome = "dispute_raised";
      row.disputed_document_number = liveDispute.document_number;
      inbound(row);
    }
    if (customer.customer_canon_id === resolvedDisputeCustomer.customer_canon_id) {
      if (count < 3) throw new Error(`${id}: the resolved dispute needs a contact after it`);
      const raised = rows[0];
      raised.outcome = "dispute_raised";
      raised.disputed_document_number = resolvedInvoice.document_number;
      inbound(raised);
      const settled = rows[rows.length - 1];
      settled.outcome = "payment_received";
      settled.disputed_document_number = resolvedInvoice.document_number;
      settled.promiseAmountCents = toCents(resolvedInvoice.open_balance);
      inbound(settled);
    }

    // P5: three promises. The first drawn account is never paid; the other two
    // are, by a later contact for at least the amount promised.
    const promiseIndex = promiseCarriers.findIndex((c) => c.customer_canon_id === customer.customer_canon_id);
    if (promiseIndex >= 0) {
      const broken = customer.customer_canon_id === brokenPromiseCustomer.customer_canon_id;
      const at = broken ? Math.max(1, count - 2) : 1;
      if (at >= count) throw new Error(`${id}: ${customer.customer_canon_id} has too few contacts to carry a promise`);
      const promise = rows[at];
      promise.outcome = "promise_to_pay";
      promise.promiseAmountCents = Math.max(
        1, Math.round(customer.openCents * amountRng.amount(0.15, 0.45, 4))
      );
      const promisedOn = businessDay(addDays(promise.contact_date, amountRng.int(7, 14)));
      if (promisedOn >= CONTACT_AS_OF) {
        throw new Error(`${id}: ${customer.customer_canon_id} promises payment on or after the as-of, so nothing is yet broken`);
      }
      promise.promise_to_pay_date = promisedOn;
      if (!broken) {
        const settled = rows.find((row, index) => index > at && row.contact_date > promisedOn);
        if (!settled) throw new Error(`${id}: ${customer.customer_canon_id} has no contact after its promise falls due`);
        settled.outcome = "payment_received";
        settled.promiseAmountCents = promise.promiseAmountCents + amountRng.int(0, 50000);
        inbound(settled);
      }
    }

    // The ladder's own stage-4 action is a formal demand, so an account that
    // reaches the end of the period at the top of the ladder without paying is
    // escalated. An account that paid is not.
    const last = rows[rows.length - 1];
    if (customer.stage === 4 && BASE_OUTCOMES.includes(last.outcome) && !rows.some((r) => r.outcome === "payment_received")) {
      last.outcome = "escalated";
    }

    rows.forEach((row, index) => {
      const next = rows[index + 1];
      row.next_action_date = next ? next.contact_date : businessDay(addDays(row.contact_date, 7));
    });
    contacts.push(...rows);
  }

  contacts.sort((a, b) => (
    a.contact_date < b.contact_date ? -1 : a.contact_date > b.contact_date ? 1
      : a.customer.customer_canon_id < b.customer.customer_canon_id ? -1 : 1
  ));

  return contacts.map((row, index) => ({
    contact_id: `COL-2026-0${CONTACT_ID_START + index}`,
    customer_canon_id: row.customer.customer_canon_id,
    customer_name: row.customer.customer_name,
    contact_date: row.contact_date,
    channel: row.channel,
    direction: row.direction,
    dunning_stage: row.dunning_stage,
    owner_employee_id: row.owner_employee_id,
    outcome: row.outcome,
    promise_to_pay_date: row.promise_to_pay_date,
    promise_amount: row.promiseAmountCents === null ? "" : cents(row.promiseAmountCents),
    disputed_document_number: row.disputed_document_number,
    next_action_date: row.next_action_date,
  }));
}

// ---------------------------------------------------------------- the policy

function buildCollectionsPolicy(receivable) {
  return {
    generated_from_spec: "FIN-16",
    as_of: CONTACT_AS_OF,
    currency: "USD",
    dunning_ladder: DUNNING_LADDER.map((stage) => ({ ...stage })),
    credit_limits: [...receivable.customers.values()]
      .sort((a, b) => (a.customer_canon_id < b.customer_canon_id ? -1 : 1))
      .map((customer) => ({
        customer_canon_id: customer.customer_canon_id,
        customer_name: customer.customer_name,
        segment: customer.segment,
        credit_limit: cents(customer.creditLimitCents),
      })),
    credit_hold_rule: {
      // Stated as a conjunction on purpose. An aging where most documents are
      // past ninety days would put most of the book on hold under an "either"
      // rule, and a credit hold that catches everything decides nothing.
      rule: "an account goes on credit hold when its open balance exceeds its credit limit and its oldest document is more than oldest_days_past_due_over days past due",
      open_balance_exceeds_credit_limit: true,
      oldest_days_past_due_over: CREDIT_HOLD_DAYS_PAST_DUE,
      combine: "all",
    },
    dispute_rule: {
      rule: "while a document is disputed, dunning on that document stops and the dispute is escalated rather than chased",
      hold_outreach: true,
      escalate_to_role: "Controller",
    },
    write_off_authority: [...WRITE_OFF_AUTHORITY],
  };
}

// ----------------------------------------------------------------- assertions

function assertPlants({ receivable, creditNotes, contacts, policy }) {
  const { customers, memos, documentNumbers } = receivable;
  const byArDocument = new Map(creditNotes.map((r) => [r.ar_document_number, r]));

  // P1
  for (const memo of memos) {
    const note = byArDocument.get(memo.document_number);
    if (!note) throw new Error(`${id}: FIN-04 memo ${memo.document_number} has no credit note behind it`);
    if (note.customer_canon_id !== memo.customer_canon_id) throw new Error(`${id}: ${note.credit_note_id} sits on the wrong customer`);
    if (note.applied_to_document !== memo.applied_to_document) throw new Error(`${id}: ${note.credit_note_id} applies somewhere the aging does not`);
    if (toCents(note.amount) !== Math.abs(toCents(memo.open_balance))) throw new Error(`${id}: ${note.credit_note_id} disagrees with the aging about the amount`);
    if (note.status !== "issued") throw new Error(`${id}: ${note.credit_note_id} is on the aging but is not issued`);
  }

  // P2 and P3
  const requested = creditNotes.filter((r) => r.status === "requested");
  if (requested.length !== REQUESTED_NOTE_COUNT) throw new Error(`${id}: ${requested.length} notes are still requested`);
  const settled = creditNotes.filter((r) => r.status === "issued" && !documentNumbers.has(r.ar_document_number));
  if (settled.length !== APPLIED_NOTE_COUNT) throw new Error(`${id}: ${settled.length} notes are issued and settled`);
  for (const row of settled) {
    if (documentNumbers.has(row.applied_to_document)) {
      throw new Error(`${id}: ${row.credit_note_id} was fully applied against an invoice that is still open`);
    }
  }
  for (const row of creditNotes) {
    if (!CREDIT_NOTE_STATUSES.includes(row.status)) {
      throw new Error(`${id}: ${row.credit_note_id} has status "${row.status}"`);
    }
    if ((row.ar_document_number === "") !== (row.status === "requested")) {
      throw new Error(`${id}: ${row.credit_note_id} disagrees with its own status about whether it reached AR`);
    }
    if ((row.issued_date === "") !== (row.status === "requested")) {
      throw new Error(`${id}: ${row.credit_note_id} disagrees with its own status about whether it was issued`);
    }
    if (row.issued_date !== "" && row.issued_date < row.requested_date) {
      throw new Error(`${id}: ${row.credit_note_id} was issued before it was asked for`);
    }
    if (row.status === "issued" && row.approved_by_employee_id === row.requested_by_employee_id) {
      throw new Error(`${id}: ${row.credit_note_id} was raised and approved by the same person`);
    }
  }
  const missingReason = REASON_CODES.filter((code) => !creditNotes.some((r) => r.reason_code === code));
  if (missingReason.length > 0) throw new Error(`${id}: no note carries reason code ${missingReason.join(", ")}`);

  // P4
  const limits = new Map(policy.credit_limits.map((l) => [l.customer_canon_id, toCents(l.credit_limit)]));
  if (limits.size !== customers.size) throw new Error(`${id}: the policy does not price every customer in the aging`);
  const overLimit = [...customers.values()].filter((c) => c.openCents > limits.get(c.customer_canon_id));
  if (overLimit.length !== 1) throw new Error(`${id}: ${overLimit.length} accounts are over their credit limit, expected 1`);
  if (overLimit[0].oldestDaysPastDue <= policy.credit_hold_rule.oldest_days_past_due_over) {
    throw new Error(`${id}: the account over its limit is not delinquent enough to reach a hold`);
  }

  // P5
  const promises = contacts.filter((r) => r.outcome === "promise_to_pay");
  if (promises.length < 3) throw new Error(`${id}: ${promises.length} promises to pay, which makes a broken one structural`);
  const broken = promises.filter((promise) => (
    promise.promise_to_pay_date < CONTACT_AS_OF &&
    !contacts.some((r) => (
      r.customer_canon_id === promise.customer_canon_id && r.outcome === "payment_received" &&
      r.contact_date > promise.contact_date && toCents(r.promise_amount) >= toCents(promise.promise_amount)
    ))
  ));
  if (broken.length !== 1) throw new Error(`${id}: ${broken.length} promises to pay were broken, expected 1`);

  // P6
  const disputes = contacts.filter((r) => r.outcome === "dispute_raised");
  if (disputes.length < 2) throw new Error(`${id}: ${disputes.length} disputes, which makes a live one structural`);
  const live = disputes.filter((dispute) => !contacts.some((r) => (
    r.customer_canon_id === dispute.customer_canon_id &&
    r.disputed_document_number === dispute.disputed_document_number &&
    r.contact_date > dispute.contact_date
  )));
  if (live.length !== 1) throw new Error(`${id}: ${live.length} disputes are still live, expected 1`);
  const behind = creditNotes.filter((n) => n.applied_to_document === live[0].disputed_document_number);
  if (behind.length !== 1 || behind[0].status !== "requested") {
    throw new Error(`${id}: the live dispute does not resolve to exactly one credit note still requested`);
  }

  // Shape checks the log has to keep whatever the draws do.
  for (const row of contacts) {
    if (!OUTCOMES.includes(row.outcome)) throw new Error(`${id}: ${row.contact_id} has outcome "${row.outcome}"`);
    if (row.contact_date < CONTACT_PERIOD.start || row.contact_date > CONTACT_PERIOD.end) {
      throw new Error(`${id}: ${row.contact_id} falls outside the contact period`);
    }
    if (row.next_action_date <= row.contact_date) throw new Error(`${id}: ${row.contact_id} schedules no future action`);
    const carriesAmount = row.outcome === "promise_to_pay" || row.outcome === "payment_received";
    if ((row.promise_amount !== "") !== carriesAmount) {
      throw new Error(`${id}: ${row.contact_id} disagrees with its own outcome about whether money was named`);
    }
    if ((row.promise_to_pay_date !== "") !== (row.outcome === "promise_to_pay")) {
      throw new Error(`${id}: ${row.contact_id} carries a promise date without promising anything`);
    }
    if (row.direction === "outbound" && row.channel !== DUNNING_LADDER[Number(row.dunning_stage) - 1].channel) {
      throw new Error(`${id}: ${row.contact_id} went out on a channel its ladder stage does not open`);
    }
  }
  const missingOutcome = OUTCOMES.filter((outcome) => !contacts.some((r) => r.outcome === outcome));
  if (missingOutcome.length > 0) throw new Error(`${id}: no contact ends in ${missingOutcome.join(", ")}`);
}

// ------------------------------------------------------------------ builder

/**
 * Build both halves of the collections world. Pure: no I/O, no Date.now(),
 * every draw from createRng("FIN-15", stream).
 * @returns {{ creditNotes: object[], contacts: object[], policy: object }}
 */
export function buildCollections() {
  const receivable = readReceivable();
  const roster = financeRoster();
  const authority = buildDecisionAuthorityMatrix();

  const { rows: creditNotes, disputedInvoices } = buildCreditNotes(receivable, roster, authority);
  const contacts = buildContactLog(receivable, disputedInvoices);
  const policy = buildCollectionsPolicy(receivable);

  assertPlants({ receivable, creditNotes, contacts, policy });
  return { creditNotes, contacts, policy };
}

// ---------------------------------------------------------------- generate

export function generate() {
  const { creditNotes } = buildCollections();
  return [{ path: "customer-credit-notes.csv", content: toCsv(CREDIT_NOTE_COLUMNS, creditNotes) }];
}

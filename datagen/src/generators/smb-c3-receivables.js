// The cluster 3 receivables system: SMB-17 invoices-issued, SMB-18
// payment-status-mock and SMB-19 aging-summary, built here as one unit because
// they are one arithmetic system rather than three files.
//
// SMB-17 is the register the studio's invoicing surface shows. SMB-18 is the
// mock payment log behind it. SMB-19 is a per-client summary whose every cell
// is derived from the two of them. The three cannot be built independently
// without one of them restating a number the other two own, which is the
// defect class the cluster 3 data plan's risk 1 names, so the population, the
// rows and every census live here once and the three generator modules are
// thin: a header, a row count and an emit.
//
// ---------------------------------------------------------------------------
// The plants, with both cardinalities. Every one is asserted below before the
// builder returns, and re-derived a second time, from the emitted bytes and
// without importing anything from this file, in
// tests/generators/smb-c3-receivables.test.js.
//
//   P1  the invoice marked paid that nobody paid (SMB-17).
//       Rule: invoice_status reads `paid` while no SMB-18 row for that
//       invoice_id reads settlement_status `settled`.
//       1 under the rule. 13 with the named qualifier dropped: thirteen
//       invoices read `paid` and twelve of the thirteen really did settle, so
//       a reader who greps the status column finds thirteen and has to check
//       all thirteen against the payment log to find the one.
//
//   P2  the client genuinely past due (SMB-19).
//       Rule: dunning_stage of 2 or more WITH an empty promise_to_pay_date.
//       1 under the rule. 3 with the qualifier dropped: three clients are past
//       the ladder's first step and two of the three already carry a promise,
//       so a rule that sorts by days past due and stops there drafts three
//       reminders and two of them talk over a commitment the studio holds.
//
//   P3  the client on a plan within terms (SMB-19).
//       Rule: the client's earliest unsettled installment_due_date is after
//       the as-of date.
//       1 under the rule. 2 with the qualifier dropped: two clients are on a
//       payment plan at all and the other one is in arrears on it, so a rule
//       keyed on "is on a plan, suppress the reminder" suppresses two and one
//       of the two should have gone.
//
// ---------------------------------------------------------------------------
// The rules this file is built under.
//
//   R-CENTS. Every amount is an integer number of cents here and a 2dp string
//   on disk. No percentage column, no quotient column, and no float ever
//   touches a money value.
//
//   Dates. Every comparison is between two ISO strings or is a whole-day
//   integer difference from dates.js. No Date object is constructed anywhere
//   in this file, because a comparison done on one is a class of bug that
//   passes in one timezone and fails in another (plan risk 3).
//
//   The frozen eight. The four SMB-04 draws and the four SMB-05 draws are READ
//   out of the two client-record builders at build time, behind loud-throw
//   pins on the ids, the dates and the amounts. Nothing is retyped: a builder
//   that typed 29700.00 would pass every check in this file except the pin,
//   and the pin is the only thing standing between the register and a
//   canonical fact contradicted elsewhere in the universe (plan risk 4).
//
//   R-MOCK. record_type is `mock` and mock_notice is the byte-identical
//   notice on every payment row, and method is drawn from SMB-02's two mock
//   methods. No processor, gateway, card network or bank product word exists
//   in any cell, which is a property of every row rather than a defect on one.
//
//   R-ROLE. No person is named. A client is a canon household, a canon
//   business, or a generated household name drawn through SMB-03's two
//   exported screens.
//
//   R-NS. Every id class is namespaced from birth: INV-LDB-2026-3NN,
//   PAY-LDB-2026-3NN, PLN-LDB-NN, AGE-LDB-NN and JOB-LDB-NN.
import { addDays, diffDays, weekday } from "../dates.js";
import { createRng } from "../seed.js";
import { cents, toCents } from "../money.js";
import {
  MOCK_NOTICE, MOCK_RECORD_TYPE, PAYMENT_METHODS, PAYMENT_TERMS, TERM_DAYS,
} from "./smb-02-client-record-template.js";
import {
  GENERATED_HOUSEHOLDS, assertNoCanonEcho, availableSurnames, buildInquiryQueue,
} from "./smb-03-inbound-inquiry-queue.js";
import { AS_OF_DATE, buildOkaforRecord } from "./smb-04-client-record-okafor.js";
import { buildOfficeRefreshRecord } from "./smb-05-client-record-co002.js";
import { buildMilestoneSchedule } from "./smb-16-milestone-schedule.js";

/** The wave this file belongs to. Used only in assertion messages. */
const WAVE = "SMB-C3";

/** The window the register covers. Invoice dates sit inside it; due dates may not. */
export const PERIOD = { start: "2026-02-01", end: "2026-03-31" };

/** The reserved Larkspur-side band canon/companies.md:16 holds for exactly this. */
export const RESERVED_BAND = { first: 200, last: 249 };

/** How many generated households cluster 3 seats inside that band. */
export const GENERATED_CLIENTS = 3;

/**
 * The seed identity the population is drawn under. Fixed to SMB-17 whichever
 * of the three specs is generating, so the three files cannot disagree about
 * a client's name: same bytes, forever.
 */
const POPULATION_SEED_ID = "SMB-17";

// --------------------------------------------------------------- the population
//
// Six jobs, six clients, settled once and used by five artifacts. Three
// clients are seated in canon and three take ids from the reserved band. The
// contract values are the plan's; the two frozen ones are held against the
// client records at build time.

export const JOBS = [
  { job_id: "JOB-LDB-01", client_canon_id: "co-131", contract_cents: 14850000, payment_terms: "net_7", frozen: "SMB-04" },
  { job_id: "JOB-LDB-02", client_canon_id: "co-002", contract_cents: 4620000, payment_terms: "net_15", frozen: "SMB-05" },
  { job_id: "JOB-LDB-03", client_canon_id: "co-132", contract_cents: 7150000, payment_terms: "net_15", frozen: null },
  { job_id: "JOB-LDB-04", client_canon_id: "co-201", contract_cents: 3850000, payment_terms: "net_30", frozen: null },
  { job_id: "JOB-LDB-05", client_canon_id: "co-202", contract_cents: 8800000, payment_terms: "net_15", frozen: null },
  { job_id: "JOB-LDB-06", client_canon_id: "co-203", contract_cents: 5400000, payment_terms: "net_15", frozen: null },
];

/**
 * SMB-03's own eleven emitted surnames, read out of the queue it builds rather
 * than listed here. C3 adds them to the exclusion set so no household in the
 * pack shares a surname with an inquiry in the queue (plan 2, U-C). The queue
 * is fourteen rows and thirteen of them are generated households, two of which
 * inquire twice, so the distinct count is the eleven SMB-03 itself declares.
 */
export function inquirySurnames(canon) {
  const queue = buildInquiryQueue((stream) => createRng("SMB-03", stream), canon);
  const surnames = new Set();
  for (const row of queue) {
    if (row.client_canon_id !== "") continue;
    const match = /^The (\S+) household$/.exec(row.client_name);
    if (!match) {
      throw new Error(`${WAVE}: SMB-03 row ${row.inquiry_id} carries the client name "${row.client_name}", which is not a household name`);
    }
    surnames.add(match[1]);
  }
  if (surnames.size !== GENERATED_HOUSEHOLDS) {
    throw new Error(
      `${WAVE}: SMB-03 emitted ${surnames.size} distinct household surnames and declares ${GENERATED_HOUSEHOLDS}; `
      + "the exclusion set and the queue have drifted apart"
    );
  }
  return [...surnames];
}

/**
 * The three generated household names. Drawn with a seeded stream from the
 * shared pool through SMB-03's two exported screens, less SMB-03's own emitted
 * surnames, rather than pinned by the plan: pinning a surname here would pin
 * the row instead of the rule and would put a name in a data plan that
 * namePool.js should stay free to move.
 */
export function generatedHouseholdNames(canon) {
  const taken = new Set(inquirySurnames(canon));
  const pool = availableSurnames(canon).filter((surname) => !taken.has(surname));
  if (pool.length < GENERATED_CLIENTS) {
    throw new Error(
      `${WAVE}: only ${pool.length} surnames survive the canon screen and SMB-03's own draws, need ${GENERATED_CLIENTS}`
    );
  }
  const drawn = createRng(POPULATION_SEED_ID, "households").shuffle(pool).slice(0, GENERATED_CLIENTS);
  // The screen runs over the bare surnames, which is the shape SMB-03 screens:
  // it is a bidirectional substring match against every canon company word, and
  // the word "household" is itself one of them, so a full household name would
  // always echo it.
  assertNoCanonEcho("generated household surname", drawn, canon);
  const names = drawn.map((surname) => `The ${surname} household`);
  if (new Set(names).size !== names.length) throw new Error(`${WAVE}: two generated households share a name`);
  return names;
}

/**
 * The six jobs with their client resolved: a canon name for the three seated
 * clients and a drawn household name for the three band ids. This is the
 * population SMB-20, SMB-21, SMB-22 and the SMB-30 drafter import rather than
 * retype.
 *
 * @param {Map} canon canon companies lookup
 * @returns {object[]} one entry per job, in job_id order
 */
export function jobPopulation(canon) {
  const generated = generatedHouseholdNames(canon);
  let drawn = 0;
  const population = JOBS.map((job) => {
    const seated = canon.get(job.client_canon_id);
    const bandNumber = bandNumberOf(job.client_canon_id);
    if (seated && bandNumber !== null) {
      throw new Error(`${WAVE}: ${job.client_canon_id} is both seated in canon and inside the reserved band`);
    }
    if (!seated && bandNumber === null) {
      throw new Error(
        `${WAVE}: ${job.client_canon_id} is neither seated in canon/companies.md nor inside the reserved `
        + `co-${RESERVED_BAND.first} to co-${RESERVED_BAND.last} band`
      );
    }
    const client_name = seated ? seated.name : generated[drawn++];
    return {
      job_id: job.job_id,
      client_canon_id: job.client_canon_id,
      client_name,
      contract_cents: job.contract_cents,
      payment_terms: job.payment_terms,
      seated_in_canon: Boolean(seated),
      frozen_record: job.frozen,
    };
  });
  if (drawn !== GENERATED_CLIENTS) {
    throw new Error(`${WAVE}: ${drawn} generated names were consumed, expected ${GENERATED_CLIENTS}`);
  }
  for (const job of population) {
    if (!PAYMENT_TERMS.includes(job.payment_terms)) {
      throw new Error(`${WAVE}: ${job.job_id} carries payment terms "${job.payment_terms}", outside SMB-02's vocabulary`);
    }
  }
  return population;
}

/** The band number inside a `co-NNN` id, or null when the id is outside the band. */
function bandNumberOf(canonId) {
  const match = /^co-(\d{3})$/.exec(canonId);
  if (!match) return null;
  const number = Number(match[1]);
  return number >= RESERVED_BAND.first && number <= RESERVED_BAND.last ? number : null;
}

// ------------------------------------------------------------ the frozen eight
//
// The pins. The VALUES used in the rows are the client records' own; these are
// held against them and throw with the invoice id if either record has moved.

export const SMB04_INVOICE_PINS = {
  "INV-LDB-2026-101": { payment_id: "PAY-LDB-2026-101", invoice_date: "2026-02-09", due_date: "2026-02-16", invoice_amount_usd: "29700.00", settlement_date: "2026-02-13" },
  "INV-LDB-2026-102": { payment_id: "PAY-LDB-2026-102", invoice_date: "2026-02-27", due_date: "2026-03-06", invoice_amount_usd: "44550.00", settlement_date: "2026-03-04" },
  "INV-LDB-2026-103": { payment_id: "PAY-LDB-2026-103", invoice_date: "2026-03-13", due_date: "2026-03-20", invoice_amount_usd: "44550.00", settlement_date: "2026-03-19" },
  "INV-LDB-2026-104": { payment_id: "PAY-LDB-2026-104", invoice_date: "2026-03-20", due_date: "2026-03-27", invoice_amount_usd: "29700.00", settlement_date: "2026-03-27" },
};

export const SMB05_INVOICE_PINS = {
  "INV-LDB-2026-201": { payment_id: "PAY-LDB-2026-201", invoice_date: "2026-02-03", due_date: "2026-02-18", invoice_amount_usd: "9240.00", settlement_date: "2026-02-17" },
  "INV-LDB-2026-202": { payment_id: "PAY-LDB-2026-202", invoice_date: "2026-02-24", due_date: "2026-03-11", invoice_amount_usd: "13860.00", settlement_date: "2026-03-10" },
  "INV-LDB-2026-203": { payment_id: "PAY-LDB-2026-203", invoice_date: "2026-03-10", due_date: "2026-03-25", invoice_amount_usd: "13860.00", settlement_date: "2026-03-24" },
  "INV-LDB-2026-204": { payment_id: "PAY-LDB-2026-204", invoice_date: "2026-03-24", due_date: "2026-04-08", invoice_amount_usd: "9240.00", settlement_date: "2026-03-31" },
};

/** The two records, rebuilt from their own seeds rather than read off disk. */
export function frozenRecords(canon) {
  return {
    "SMB-04": buildOkaforRecord({ canon, rng: (stream) => createRng("SMB-04", stream) }),
    "SMB-05": buildOfficeRefreshRecord({ canon, rng: (stream) => createRng("SMB-05", stream) }),
  };
}

/**
 * The eight already-recorded draws, read out of the two records and held
 * against the pins. Throws with the invoice id and both values if a record has
 * moved, which is the whole point: the register must not be able to disagree
 * with a client record quietly.
 */
export function frozenDraws(canon) {
  const records = frozenRecords(canon);
  const jobByRecord = new Map(JOBS.filter((j) => j.frozen).map((j) => [j.frozen, j]));
  const out = [];

  for (const [specId, pins] of [["SMB-04", SMB04_INVOICE_PINS], ["SMB-05", SMB05_INVOICE_PINS]]) {
    const record = records[specId];
    const job = jobByRecord.get(specId);
    if (record.client.as_of_date !== AS_OF_DATE) {
      throw new Error(`${WAVE}: ${specId}'s as_of_date is ${record.client.as_of_date} and this cluster reports against ${AS_OF_DATE}`);
    }
    if (record.client.client_canon_id !== job.client_canon_id) {
      throw new Error(`${WAVE}: ${specId} now seats its client at ${record.client.client_canon_id}, and ${job.job_id} pins ${job.client_canon_id}`);
    }
    if (toCents(record.client.contract_value_usd) !== job.contract_cents) {
      throw new Error(
        `${WAVE}: ${specId}'s contract value is ${record.client.contract_value_usd} and ${job.job_id} pins `
        + `${cents(job.contract_cents)}. The register and the client record cannot both be right.`
      );
    }
    if (record.client.payment_terms !== job.payment_terms) {
      throw new Error(`${WAVE}: ${specId} carries terms ${record.client.payment_terms} and ${job.job_id} pins ${job.payment_terms}`);
    }
    if (record.payment_log.length !== Object.keys(pins).length) {
      throw new Error(`${WAVE}: ${specId} carries ${record.payment_log.length} payment rows and ${Object.keys(pins).length} are pinned`);
    }

    for (const payment of record.payment_log) {
      const pin = pins[payment.invoice_id];
      if (!pin) throw new Error(`${WAVE}: ${specId} now carries the invoice ${payment.invoice_id}, which this cluster does not pin`);
      for (const field of ["payment_id", "invoice_date", "due_date", "invoice_amount_usd", "settlement_date"]) {
        if (payment[field] !== pin[field]) {
          throw new Error(
            `${WAVE}: ${specId}'s ${payment.invoice_id} now reads ${field} ${payment[field]} and this cluster pins `
            + `${pin[field]}. Fix the pin or the record; they cannot both be right.`
          );
        }
      }
      if (payment.settlement_status !== "settled") {
        throw new Error(
          `${WAVE}: ${specId}'s ${payment.invoice_id} no longer settled, and the register is built on all eight `
          + "already-recorded draws having settled (plan facts 0.5 and 0.6)"
        );
      }
      if (payment.settled_amount_usd !== payment.invoice_amount_usd) {
        throw new Error(`${WAVE}: ${specId}'s ${payment.invoice_id} settled a different amount from the one it invoiced`);
      }
      if (payment.record_type !== MOCK_RECORD_TYPE || payment.mock_notice !== MOCK_NOTICE) {
        throw new Error(`${WAVE}: ${specId}'s ${payment.invoice_id} is no longer a mock record carrying the mock notice`);
      }
      if (!PAYMENT_METHODS.includes(payment.method)) {
        throw new Error(`${WAVE}: ${specId}'s ${payment.invoice_id} carries method "${payment.method}", outside SMB-02's vocabulary`);
      }
      out.push({
        invoice_id: payment.invoice_id,
        payment_id: payment.payment_id,
        job_id: job.job_id,
        client_canon_id: job.client_canon_id,
        payment_terms: job.payment_terms,
        invoice_date: payment.invoice_date,
        due_date: payment.due_date,
        amount_cents: toCents(payment.invoice_amount_usd),
        settlement_date: payment.settlement_date,
        settled_cents: toCents(payment.settled_amount_usd),
        method: payment.method,
        source_spec: specId,
      });
    }
  }

  out.sort((a, b) => (a.invoice_id < b.invoice_id ? -1 : 1));
  return out;
}

// ------------------------------------------------------------- the new rows
//
// Designed content rather than draws, the pack's fixed-data convention: the
// eleven new invoices, the two installment plans and the promises to pay are
// the data plan's pinned values, so the file is the same bytes forever.

/** The eleven new invoices, data plan 2.1. Amounts in integer cents (R-CENTS). */
const NEW_INVOICES = [
  { invoice_id: "INV-LDB-2026-301", job_id: "JOB-LDB-03", invoice_date: "2026-02-02", amount_cents: 1787500, invoice_status: "paid" },
  { invoice_id: "INV-LDB-2026-302", job_id: "JOB-LDB-03", invoice_date: "2026-02-13", amount_cents: 2145000, invoice_status: "part_paid" },
  { invoice_id: "INV-LDB-2026-303", job_id: "JOB-LDB-04", invoice_date: "2026-02-06", amount_cents: 962500, invoice_status: "part_paid" },
  { invoice_id: "INV-LDB-2026-304", job_id: "JOB-LDB-04", invoice_date: "2026-02-27", amount_cents: 962500, invoice_status: "paid" },
  { invoice_id: "INV-LDB-2026-305", job_id: "JOB-LDB-04", invoice_date: "2026-03-13", amount_cents: 962500, invoice_status: "sent" },
  { invoice_id: "INV-LDB-2026-306", job_id: "JOB-LDB-05", invoice_date: "2026-02-02", amount_cents: 1760000, invoice_status: "paid" },
  { invoice_id: "INV-LDB-2026-307", job_id: "JOB-LDB-05", invoice_date: "2026-02-19", amount_cents: 2200000, invoice_status: "paid" },
  { invoice_id: "INV-LDB-2026-308", job_id: "JOB-LDB-05", invoice_date: "2026-03-19", amount_cents: 2200000, invoice_status: "sent" },
  { invoice_id: "INV-LDB-2026-309", job_id: "JOB-LDB-06", invoice_date: "2026-02-02", amount_cents: 1080000, invoice_status: "paid" },
  { invoice_id: "INV-LDB-2026-310", job_id: "JOB-LDB-06", invoice_date: "2026-02-12", amount_cents: 1080000, invoice_status: "overdue" },
  { invoice_id: "INV-LDB-2026-311", job_id: "JOB-LDB-06", invoice_date: "2026-03-12", amount_cents: 1080000, invoice_status: "overdue" },
];

/**
 * The settlements on the new single-row invoices. An invoice absent from this
 * map has not settled and its row is `open` with both settlement cells empty.
 * Every date here is a weekday, because settling is something a person does
 * rather than something a term computes (plan R20).
 */
const NEW_SETTLEMENTS = {
  "INV-LDB-2026-301": "2026-02-16",
  "INV-LDB-2026-304": "2026-03-26",
  "INV-LDB-2026-306": "2026-02-13",
  "INV-LDB-2026-309": "2026-02-17",
};

/**
 * The two installment plans, data plan 2.2. Four installments each, both
 * dividing exactly: 2,145,000 cents over four is 536,250 and 962,500 over four
 * is 240,625, so no installment carries a rounding remainder. Installment one
 * has settled on each plan and the other three are open.
 */
const PAYMENT_PLANS = [
  {
    payment_plan_id: "PLN-LDB-01",
    invoice_id: "INV-LDB-2026-302",
    due_dates: ["2026-03-06", "2026-03-13", "2026-03-20", "2026-03-27"],
    settlements: { 1: "2026-03-05" },
  },
  {
    payment_plan_id: "PLN-LDB-02",
    invoice_id: "INV-LDB-2026-303",
    due_dates: ["2026-03-10", "2026-04-10", "2026-05-11", "2026-06-10"],
    settlements: { 1: "2026-03-09" },
  },
];

/** The method every new payment row carries. SMB-02's vocabulary, no draw. */
const NEW_PAYMENT_METHOD = "mock_bank_transfer";

/**
 * The promises to pay the owner already has on record, data plan 2.3. Keyed by
 * client: a promise is a commitment about a balance, not about an invoice. Both
 * dates are after the as-of date, because a promise already past would be a
 * broken promise and this file carries none.
 */
const PROMISES = {
  "co-202": "2026-04-10",
  "co-203": "2026-04-03",
};

/** The aging ladder, data plan 2.3, as integer functions of days_past_due. */
export const DUNNING_LADDER = [
  { stage: "0", upTo: 0 },
  { stage: "1", upTo: 14 },
  { stage: "2", upTo: 30 },
  { stage: "3", upTo: 60 },
  { stage: "4", upTo: Infinity },
];

/** FIN-04's bucket edges exactly, so the two tracks age the same way. */
export const AGING_BUCKETS = ["current", "1-30", "31-60", "61-90", "90+"];

/** SMB-17's own vocabulary. The invoicing surface, not the payment record. */
export const INVOICE_STATUSES = ["sent", "paid", "part_paid", "overdue"];

// ---------------------------------------------------------------- the headers

export const INVOICE_COLUMNS = [
  "invoice_id", "client_canon_id", "client_name", "job_id", "invoice_date",
  "payment_terms", "due_date", "invoice_amount_usd", "invoice_status",
  "milestone_reference", "as_of_date",
];

export const PAYMENT_COLUMNS = [
  "payment_id", "invoice_id", "client_canon_id", "invoice_date", "invoice_amount_usd",
  "due_date", "payment_plan_id", "installment_sequence", "installment_due_date",
  "installment_amount_usd", "settlement_date", "settled_amount_usd", "settlement_status",
  "method", "record_type", "mock_notice",
];

export const AGING_COLUMNS = [
  "aging_row_id", "client_canon_id", "client_name", "as_of_date", "open_balance_usd",
  "oldest_unsettled_invoice_id", "on_payment_plan", "payment_plan_id",
  "governing_due_date", "days_past_due", "aging_bucket", "dunning_stage",
  "promise_to_pay_date", "promise_amount_usd",
];

export const INVOICE_TARGET_ROWS = 19;
export const PAYMENT_TARGET_ROWS = 25;
export const AGING_TARGET_ROWS = 4;

/** Data plan 2.1's census. */
export const INVOICE_CENSUS = {
  rows: INVOICE_TARGET_ROWS,
  frozen: 8,
  new: 11,
  jobs: 6,
  clients: 6,
  paid: 13,
  part_paid: 2,
  sent: 2,
  overdue: 2,
  weekend_due_dates: 4,
  milestone_references: 3,
  marked_paid_without_a_settled_payment: 1,
};

/** Data plan 2.2's census, every line of it. */
export const PAYMENT_CENSUS = {
  rows: PAYMENT_TARGET_ROWS,
  on_a_plan: 8,
  not_on_a_plan: 17,
  settled: 14,
  open: 11,
  mock_bank_transfer: 21,
  mock_check: 4,
  plans: 2,
  installments_per_plan: 4,
};

/** Data plan 2.3's census. */
export const AGING_CENSUS = {
  rows: AGING_TARGET_ROWS,
  on_payment_plan: 2,
  past_the_first_step: 3,
  past_the_first_step_without_a_promise: 1,
  on_a_plan_within_terms: 1,
  populated_buckets: 3,
  populated_stages: 3,
  promises: 2,
};

/** The per-job billed totals the register produces, which SMB-22 has to equal. */
export const BILLED_TO_DATE_CENTS = {
  "JOB-LDB-01": 14850000,
  "JOB-LDB-02": 4620000,
  "JOB-LDB-03": 3932500,
  "JOB-LDB-04": 2887500,
  "JOB-LDB-05": 6160000,
  "JOB-LDB-06": 3240000,
};

// ------------------------------------------------------------------- helpers

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * One row in `columns` order from a plain values map. Throws on a key the
 * header does not declare and on a column the map does not carry, the C1
 * `ordered()` convention. One factory rather than three copies, because three
 * copies of a guard are three places it can rot.
 */
function rowFactory(specId, columns) {
  return function row(values) {
    const carried = Object.keys(values);
    const missing = columns.filter((name) => !carried.includes(name));
    const extra = carried.filter((name) => !columns.includes(name));
    if (missing.length > 0 || extra.length > 0) {
      throw new Error(
        `${specId}: row key set disagrees with the header. `
        + `missing [${missing.join(", ")}], extra [${extra.join(", ")}]`
      );
    }
    const out = {};
    for (const name of columns) out[name] = values[name];
    return out;
  };
}

/** How many entries satisfy `predicate`. */
const count = (rows, predicate) => rows.filter(predicate).length;

/** Assert an equality with a label, the census convention: never a floor. */
function expect(specId, label, actual, wanted) {
  if (actual !== wanted) throw new Error(`${specId}: ${label} is ${actual}, expected ${wanted}`);
}

/** A date somebody chose rather than a term computed. Weekends are a defect (R20). */
function assertWeekday(specId, label, isoDate) {
  if (!ISO_DATE.test(isoDate)) throw new Error(`${specId}: ${label} "${isoDate}" is not an ISO date`);
  const day = weekday(isoDate);
  if (day === 0 || day === 6) {
    throw new Error(`${specId}: ${label} ${isoDate} falls on a weekend, and it is a date somebody chose`);
  }
}

/** The due date a term computes: invoice_date plus the window in calendar days. */
function dueDateFor(invoiceDate, terms) {
  const days = TERM_DAYS[terms];
  if (days === undefined) throw new Error(`${WAVE}: unknown payment terms "${terms}"`);
  return addDays(invoiceDate, days);
}

/** The aging bucket for a whole number of days past due. */
export function bucketFor(daysPastDue) {
  if (daysPastDue <= 0) return "current";
  if (daysPastDue <= 30) return "1-30";
  if (daysPastDue <= 60) return "31-60";
  if (daysPastDue <= 90) return "61-90";
  return "90+";
}

/** The dunning stage for a whole number of days past due. */
export function dunningStageFor(daysPastDue) {
  for (const step of DUNNING_LADDER) {
    if (daysPastDue <= step.upTo) return step.stage;
  }
  throw new Error(`${WAVE}: the ladder has no stage for ${daysPastDue} days past due`);
}

// ------------------------------------------------------------------ builders

/**
 * SMB-17. The nineteen invoices, in invoice_id order which is also file order.
 *
 * @param {Map} canon canon companies lookup
 * @returns {object[]} the register, and the same rows every C3 join reads
 */
export function buildInvoiceRegister({ canon }) {
  const row = rowFactory("SMB-17", INVOICE_COLUMNS);
  const population = new Map(jobPopulation(canon).map((job) => [job.job_id, job]));
  const milestones = milestoneReferences(canon);

  const designed = [
    ...frozenDraws(canon).map((draw) => ({
      invoice_id: draw.invoice_id,
      job_id: draw.job_id,
      invoice_date: draw.invoice_date,
      amount_cents: draw.amount_cents,
      invoice_status: "paid",
      frozen_due_date: draw.due_date,
    })),
    ...NEW_INVOICES.map((invoice) => ({ ...invoice, frozen_due_date: null })),
  ];
  designed.sort((a, b) => (a.invoice_id < b.invoice_id ? -1 : 1));

  const rows = designed.map((invoice) => {
    const job = population.get(invoice.job_id);
    if (!job) throw new Error(`SMB-17: ${invoice.invoice_id} is coded to ${invoice.job_id}, which is not a job`);
    // T-A3: the due date is arithmetic, recomputed rather than typed, and the
    // frozen eight are held against the record's own value as well.
    const due_date = dueDateFor(invoice.invoice_date, job.payment_terms);
    if (invoice.frozen_due_date !== null && invoice.frozen_due_date !== due_date) {
      throw new Error(
        `SMB-17: ${invoice.invoice_id} computes a due date of ${due_date} and the client record carries `
        + `${invoice.frozen_due_date}. One of the two is wrong and it is not this file's to decide.`
      );
    }
    return row({
      invoice_id: invoice.invoice_id,
      client_canon_id: job.client_canon_id,
      client_name: job.client_name,
      job_id: job.job_id,
      invoice_date: invoice.invoice_date,
      payment_terms: job.payment_terms,
      due_date,
      invoice_amount_usd: cents(invoice.amount_cents),
      invoice_status: invoice.invoice_status,
      milestone_reference: milestones.get(invoice.invoice_id) ?? "",
      as_of_date: AS_OF_DATE,
    });
  });

  assertRegister(rows, canon, population);
  return rows;
}

/**
 * The milestone a draw was raised against, read out of SMB-16's emitted rows
 * rather than typed: a draw invoice is dated the day its milestone completed,
 * so the citation is a join and not a label. Only the co-131 renovation has a
 * milestone schedule, so every other invoice cites nothing.
 */
function milestoneReferences(canon) {
  const schedule = buildMilestoneSchedule({ canon });
  const completedOn = new Map();
  for (const milestone of schedule) {
    if (milestone.actual_completion === "") continue;
    completedOn.set(milestone.actual_completion, milestone.milestone_id);
  }
  const out = new Map();
  for (const [invoiceId, pin] of Object.entries(SMB04_INVOICE_PINS)) {
    const milestoneId = completedOn.get(pin.invoice_date);
    if (milestoneId) out.set(invoiceId, milestoneId);
  }
  if (out.size !== INVOICE_CENSUS.milestone_references) {
    throw new Error(
      `SMB-17: ${out.size} draws fall on a milestone completion date and the plan pins `
      + `${INVOICE_CENSUS.milestone_references}. SMB-16's schedule and this register have drifted apart.`
    );
  }
  return out;
}

/**
 * SMB-18. The twenty-five mock payment rows: the eight frozen draws, one row
 * per new single-row invoice, and four rows per installment plan.
 */
export function buildPaymentLog({ canon }) {
  const row = rowFactory("SMB-18", PAYMENT_COLUMNS);
  const register = buildInvoiceRegister({ canon });
  const invoiceById = new Map(register.map((invoice) => [invoice.invoice_id, invoice]));
  const frozen = new Map(frozenDraws(canon).map((draw) => [draw.invoice_id, draw]));
  const planByInvoice = new Map(PAYMENT_PLANS.map((plan) => [plan.invoice_id, plan]));

  const rows = [];
  let nextNewPayment = 301;

  for (const invoice of register) {
    const frozenDraw = frozen.get(invoice.invoice_id);
    const plan = planByInvoice.get(invoice.invoice_id);
    const amountCents = toCents(invoice.invoice_amount_usd);

    if (frozenDraw) {
      // Read, never retyped: every reused SMB-02 field is the record's own.
      rows.push(row({
        payment_id: frozenDraw.payment_id,
        invoice_id: invoice.invoice_id,
        client_canon_id: invoice.client_canon_id,
        invoice_date: invoice.invoice_date,
        invoice_amount_usd: invoice.invoice_amount_usd,
        due_date: invoice.due_date,
        payment_plan_id: "",
        installment_sequence: "",
        installment_due_date: "",
        installment_amount_usd: cents(amountCents),
        settlement_date: frozenDraw.settlement_date,
        settled_amount_usd: cents(frozenDraw.settled_cents),
        settlement_status: "settled",
        method: frozenDraw.method,
        record_type: MOCK_RECORD_TYPE,
        mock_notice: MOCK_NOTICE,
      }));
      continue;
    }

    if (plan) {
      const installmentCents = amountCents / PAYMENT_CENSUS.installments_per_plan;
      if (!Number.isInteger(installmentCents)) {
        throw new Error(
          `SMB-18: ${plan.payment_plan_id} splits ${invoice.invoice_amount_usd} into `
          + `${PAYMENT_CENSUS.installments_per_plan} installments with a remainder, and no installment may carry one`
        );
      }
      for (const [index, installmentDue] of plan.due_dates.entries()) {
        const sequence = index + 1;
        const settlementDate = plan.settlements[sequence] ?? "";
        const settled = settlementDate !== "";
        rows.push(row({
          payment_id: `PAY-LDB-2026-${nextNewPayment++}`,
          invoice_id: invoice.invoice_id,
          client_canon_id: invoice.client_canon_id,
          invoice_date: invoice.invoice_date,
          invoice_amount_usd: invoice.invoice_amount_usd,
          due_date: invoice.due_date,
          payment_plan_id: plan.payment_plan_id,
          installment_sequence: String(sequence),
          installment_due_date: installmentDue,
          installment_amount_usd: cents(installmentCents),
          settlement_date: settlementDate,
          settled_amount_usd: settled ? cents(installmentCents) : "",
          settlement_status: settled ? "settled" : "open",
          method: NEW_PAYMENT_METHOD,
          record_type: MOCK_RECORD_TYPE,
          mock_notice: MOCK_NOTICE,
        }));
      }
      continue;
    }

    const settlementDate = NEW_SETTLEMENTS[invoice.invoice_id] ?? "";
    const settled = settlementDate !== "";
    rows.push(row({
      payment_id: `PAY-LDB-2026-${nextNewPayment++}`,
      invoice_id: invoice.invoice_id,
      client_canon_id: invoice.client_canon_id,
      invoice_date: invoice.invoice_date,
      invoice_amount_usd: invoice.invoice_amount_usd,
      due_date: invoice.due_date,
      payment_plan_id: "",
      installment_sequence: "",
      installment_due_date: "",
      installment_amount_usd: cents(amountCents),
      settlement_date: settlementDate,
      settled_amount_usd: settled ? cents(amountCents) : "",
      settlement_status: settled ? "settled" : "open",
      method: NEW_PAYMENT_METHOD,
      record_type: MOCK_RECORD_TYPE,
      mock_notice: MOCK_NOTICE,
    }));
  }

  assertPaymentLog(rows, invoiceById);
  return rows;
}

/**
 * SMB-19. One row per client with a non-zero open balance at the as-of date.
 * Every cell is computed from the register and the payment log and then held
 * against the data plan's four pinned rows; nothing here is typed into a cell.
 */
export function buildAgingSummary({ canon }) {
  const row = rowFactory("SMB-19", AGING_COLUMNS);
  const register = buildInvoiceRegister({ canon });
  const payments = buildPaymentLog({ canon });
  const invoiceById = new Map(register.map((invoice) => [invoice.invoice_id, invoice]));

  // The open obligations, one per unsettled payment row. An obligation's own
  // date is the installment date where the invoice is on a plan and the
  // invoice due date where it is not, which is the whole of P3.
  const openByClient = new Map();
  for (const payment of payments) {
    if (payment.settlement_status !== "open") continue;
    const invoice = invoiceById.get(payment.invoice_id);
    const obligation = {
      invoice_id: payment.invoice_id,
      invoice_date: invoice.invoice_date,
      payment_plan_id: payment.payment_plan_id,
      obligation_date: payment.payment_plan_id === "" ? payment.due_date : payment.installment_due_date,
      cents: toCents(payment.installment_amount_usd),
    };
    openByClient.set(payment.client_canon_id, [...(openByClient.get(payment.client_canon_id) ?? []), obligation]);
  }

  const clients = [...openByClient.keys()].sort();
  const rows = clients.map((clientCanonId, index) => {
    const open = openByClient.get(clientCanonId);
    const invoice = invoiceById.get(open[0].invoice_id);
    const balanceCents = open.reduce((sum, obligation) => sum + obligation.cents, 0);
    if (balanceCents <= 0) throw new Error(`SMB-19: ${clientCanonId} carries no open balance and is on the ladder`);

    // The oldest unsettled invoice is the earliest one still carrying an open
    // obligation, by its own invoice date and then by id.
    const oldest = [...open].sort((a, b) => (
      a.invoice_date === b.invoice_date
        ? (a.invoice_id < b.invoice_id ? -1 : 1)
        : (a.invoice_date < b.invoice_date ? -1 : 1)
    ))[0];
    const governing = open.reduce(
      (earliest, obligation) => (obligation.obligation_date < earliest ? obligation.obligation_date : earliest),
      open[0].obligation_date
    );
    const daysPastDue = Math.max(0, diffDays(governing, AS_OF_DATE));
    const plans = [...new Set(open.map((obligation) => obligation.payment_plan_id).filter((id) => id !== ""))];
    if (plans.length > 1) throw new Error(`SMB-19: ${clientCanonId} is on ${plans.length} payment plans at once`);
    const promiseDate = PROMISES[clientCanonId] ?? "";

    return row({
      aging_row_id: `AGE-LDB-${String(index + 1).padStart(2, "0")}`,
      client_canon_id: clientCanonId,
      client_name: invoice.client_name,
      as_of_date: AS_OF_DATE,
      open_balance_usd: cents(balanceCents),
      oldest_unsettled_invoice_id: oldest.invoice_id,
      on_payment_plan: plans.length > 0 ? "yes" : "no",
      payment_plan_id: plans[0] ?? "",
      governing_due_date: governing,
      days_past_due: String(daysPastDue),
      aging_bucket: bucketFor(daysPastDue),
      dunning_stage: dunningStageFor(daysPastDue),
      promise_to_pay_date: promiseDate,
      promise_amount_usd: promiseDate === "" ? "" : cents(balanceCents),
    });
  });

  assertAgingSummary(rows, payments, invoiceById);
  return rows;
}

// ---------------------------------------------------------------- assertions
//
// Every census number and both cardinalities of P1, P2 and P3, asserted before
// a builder returns. The public test re-derives each of them from the emitted
// bytes with a second implementation and imports nothing from here.

function assertRegister(rows, canon, population) {
  const id = "SMB-17";
  expect(id, "the row count", rows.length, INVOICE_CENSUS.rows);

  const ids = rows.map((r) => r.invoice_id);
  if (new Set(ids).size !== ids.length) throw new Error(`${id}: an invoice id repeats`);
  if (ids.join(",") !== [...ids].sort().join(",")) throw new Error(`${id}: file order is not invoice_id order`);
  const newBlock = ids.filter((value) => value.startsWith("INV-LDB-2026-3"));
  expect(id, "the new invoice count", newBlock.length, INVOICE_CENSUS.new);
  for (const [i, value] of newBlock.entries()) {
    if (value !== `INV-LDB-2026-${301 + i}`) throw new Error(`${id}: the new block is not gapless from 301 at ${value}`);
  }
  expect(id, "the frozen draw count", ids.length - newBlock.length, INVOICE_CENSUS.frozen);

  for (const r of rows) {
    const where = `${id}: ${r.invoice_id}`;
    if (!INVOICE_STATUSES.includes(r.invoice_status)) throw new Error(`${where} carries invoice_status "${r.invoice_status}"`);
    if (!PAYMENT_TERMS.includes(r.payment_terms)) throw new Error(`${where} carries payment_terms "${r.payment_terms}"`);
    if (r.as_of_date !== AS_OF_DATE) throw new Error(`${where} reports against ${r.as_of_date}`);
    // T-A9, and R20: an invoice date is a date somebody chose.
    if (r.invoice_date < PERIOD.start || r.invoice_date > PERIOD.end) {
      throw new Error(`${where} is dated ${r.invoice_date}, outside ${PERIOD.start} to ${PERIOD.end}`);
    }
    assertWeekday(id, `${r.invoice_id} invoice_date`, r.invoice_date);
    if (!ISO_DATE.test(r.due_date)) throw new Error(`${where} carries due_date "${r.due_date}"`);
    if (r.due_date !== dueDateFor(r.invoice_date, r.payment_terms)) {
      throw new Error(`${where} carries a due date the terms do not compute`);
    }
    if (toCents(r.invoice_amount_usd) <= 0) throw new Error(`${where} invoices ${r.invoice_amount_usd}`);
    const job = population.get(r.job_id);
    if (r.client_canon_id !== job.client_canon_id || r.client_name !== job.client_name) {
      throw new Error(`${where} names a client its own job does not`);
    }
    // T-A7: a client is seated in canon, byte for byte, or lies inside the
    // reserved band. Nothing else is a client id.
    const seated = canon.get(r.client_canon_id);
    if (seated) {
      if (seated.name !== r.client_name) {
        throw new Error(`${where} calls ${r.client_canon_id} "${r.client_name}" and canon calls it "${seated.name}"`);
      }
    } else if (bandNumberOf(r.client_canon_id) === null) {
      throw new Error(`${where} names ${r.client_canon_id}, which canon does not seat and the reserved band does not cover`);
    }
    for (const [column, value] of Object.entries(r)) {
      for (const dash of ["\u2014", "\u2013"]) {
        if (value.includes(dash)) throw new Error(`${where} carries an em dash or an en dash in ${column}`);
      }
    }
  }

  // The status census, and the four weekend due dates the arithmetic produces.
  for (const [status, wanted] of [["paid", INVOICE_CENSUS.paid], ["part_paid", INVOICE_CENSUS.part_paid], ["sent", INVOICE_CENSUS.sent], ["overdue", INVOICE_CENSUS.overdue]]) {
    expect(id, `the ${status} count`, count(rows, (r) => r.invoice_status === status), wanted);
  }
  expect(
    id, "the weekend due-date count",
    count(rows, (r) => weekday(r.due_date) === 0 || weekday(r.due_date) === 6),
    INVOICE_CENSUS.weekend_due_dates
  );
  expect(id, "the milestone citation count", count(rows, (r) => r.milestone_reference !== ""), INVOICE_CENSUS.milestone_references);
  for (const r of rows.filter((r) => r.milestone_reference !== "")) {
    if (r.job_id !== "JOB-LDB-01") throw new Error(`${id}: ${r.invoice_id} cites a milestone and is not on the renovation`);
  }

  // T-A5's derivable half: every job is cited and no invoice cites a job the
  // population does not carry. The SMB-22 direction lands with SMB-22.
  const jobs = new Set(rows.map((r) => r.job_id));
  expect(id, "the job count", jobs.size, INVOICE_CENSUS.jobs);
  for (const job of population.values()) {
    if (!jobs.has(job.job_id)) throw new Error(`${id}: ${job.job_id} is a job no invoice cites`);
  }
  expect(id, "the client count", new Set(rows.map((r) => r.client_canon_id)).size, INVOICE_CENSUS.clients);

  // T-A6: the per-job billed totals, in integer cents, which SMB-22's
  // billed_to_date_usd column has to equal to the cent.
  for (const [jobId, wanted] of Object.entries(BILLED_TO_DATE_CENTS)) {
    const billed = rows
      .filter((r) => r.job_id === jobId)
      .reduce((sum, r) => sum + toCents(r.invoice_amount_usd), 0);
    if (billed !== wanted) {
      throw new Error(`${id}: ${jobId} is billed ${cents(billed)} and the plan pins ${cents(wanted)}`);
    }
  }
}

function assertPaymentLog(rows, invoiceById) {
  const id = "SMB-18";
  expect(id, "the row count", rows.length, PAYMENT_CENSUS.rows);

  const ids = rows.map((r) => r.payment_id);
  if (new Set(ids).size !== ids.length) throw new Error(`${id}: a payment id repeats`);
  const newBlock = ids.filter((value) => value.startsWith("PAY-LDB-2026-3"));
  for (const [i, value] of newBlock.entries()) {
    if (value !== `PAY-LDB-2026-${301 + i}`) throw new Error(`${id}: the new block is not gapless from 301 at ${value}`);
  }
  expect(id, "the new payment count", newBlock.length, 17);

  const byInvoice = new Map();
  for (const r of rows) {
    const where = `${id}: ${r.payment_id}`;
    const invoice = invoiceById.get(r.invoice_id);
    if (!invoice) throw new Error(`${where} names ${r.invoice_id}, which the register does not carry`);
    byInvoice.set(r.invoice_id, [...(byInvoice.get(r.invoice_id) ?? []), r]);

    // T-B3: the three reused invoice cells are byte-equal to the register's.
    for (const column of ["invoice_date", "invoice_amount_usd", "due_date"]) {
      if (r[column] !== invoice[column]) {
        throw new Error(`${where} carries ${column} ${r[column]} and the register carries ${invoice[column]}`);
      }
    }
    if (r.client_canon_id !== invoice.client_canon_id) throw new Error(`${where} names a client the register does not`);

    // R-MOCK, as a property of every row.
    if (r.record_type !== MOCK_RECORD_TYPE) throw new Error(`${where} carries record_type "${r.record_type}"`);
    if (r.mock_notice !== MOCK_NOTICE) throw new Error(`${where} carries a notice that is not byte identical`);
    if (!PAYMENT_METHODS.includes(r.method)) throw new Error(`${where} carries method "${r.method}"`);

    if (!["settled", "open"].includes(r.settlement_status)) throw new Error(`${where} carries settlement_status "${r.settlement_status}"`);
    if (r.settlement_status === "settled") {
      assertWeekday(id, `${r.payment_id} settlement_date`, r.settlement_date);
      if (r.settlement_date < r.invoice_date || r.settlement_date > AS_OF_DATE) {
        throw new Error(`${where} settled ${r.settlement_date}, outside its own invoice date and the as-of date`);
      }
      if (r.settled_amount_usd !== r.installment_amount_usd) {
        throw new Error(`${where} settled ${r.settled_amount_usd} against an installment of ${r.installment_amount_usd}`);
      }
    } else {
      if (r.settlement_date !== "" || r.settled_amount_usd !== "") {
        throw new Error(`${where} is open and carries a settlement`);
      }
    }

    // The plan columns are populated together or not at all, and an installment
    // is never due before the invoice it settles (T-B7).
    const onPlan = r.payment_plan_id !== "";
    for (const column of ["installment_sequence", "installment_due_date"]) {
      if ((r[column] !== "") !== onPlan) throw new Error(`${where} carries ${column} "${r[column]}" against a plan id of "${r.payment_plan_id}"`);
    }
    if (onPlan) {
      assertWeekday(id, `${r.payment_id} installment_due_date`, r.installment_due_date);
      if (r.installment_due_date <= r.due_date) {
        throw new Error(`${where} asks for money on ${r.installment_due_date}, at or before its own due date ${r.due_date}`);
      }
    }
    for (const [column, value] of Object.entries(r)) {
      for (const dash of ["\u2014", "\u2013"]) {
        if (value.includes(dash)) throw new Error(`${where} carries an em dash or an en dash in ${column}`);
      }
    }
  }

  // T-B2: the join closes in both directions.
  for (const invoiceId of invoiceById.keys()) {
    if (!byInvoice.has(invoiceId)) throw new Error(`${id}: ${invoiceId} is an invoice no payment row cites`);
  }

  // T-B4: the installments sum to the invoice, plan or not.
  for (const [invoiceId, invoiceRows] of byInvoice) {
    const summed = invoiceRows.reduce((sum, r) => sum + toCents(r.installment_amount_usd), 0);
    const invoiced = toCents(invoiceById.get(invoiceId).invoice_amount_usd);
    if (summed !== invoiced) {
      throw new Error(`${id}: ${invoiceId} is invoiced ${cents(invoiced)} and its rows sum to ${cents(summed)}`);
    }
  }

  // T-B5, the census in full.
  expect(id, "the count of rows on a plan", count(rows, (r) => r.payment_plan_id !== ""), PAYMENT_CENSUS.on_a_plan);
  expect(id, "the count of rows on no plan", count(rows, (r) => r.payment_plan_id === ""), PAYMENT_CENSUS.not_on_a_plan);
  expect(id, "the settled count", count(rows, (r) => r.settlement_status === "settled"), PAYMENT_CENSUS.settled);
  expect(id, "the open count", count(rows, (r) => r.settlement_status === "open"), PAYMENT_CENSUS.open);
  expect(id, "the mock_bank_transfer count", count(rows, (r) => r.method === "mock_bank_transfer"), PAYMENT_CENSUS.mock_bank_transfer);
  expect(id, "the mock_check count", count(rows, (r) => r.method === "mock_check"), PAYMENT_CENSUS.mock_check);
  expect(id, "the plan count", new Set(rows.map((r) => r.payment_plan_id).filter((value) => value !== "")).size, PAYMENT_CENSUS.plans);
  expect(id, "the count of rows carrying a settled amount", count(rows, (r) => r.settled_amount_usd !== ""), PAYMENT_CENSUS.settled);
  for (const plan of PAYMENT_PLANS) {
    const planRows = rows.filter((r) => r.payment_plan_id === plan.payment_plan_id);
    expect(id, `${plan.payment_plan_id}'s installment count`, planRows.length, PAYMENT_CENSUS.installments_per_plan);
    expect(id, `${plan.payment_plan_id}'s settled installments`, count(planRows, (r) => r.settlement_status === "settled"), 1);
    if (planRows.map((r) => r.installment_sequence).join(",") !== "1,2,3,4") {
      throw new Error(`${id}: ${plan.payment_plan_id}'s installments are not 1 to 4 in file order`);
    }
  }

  // P1, both cardinalities, held here as well as in the public test because a
  // plant nobody's builder holds is one edit away from gone.
  const settledInvoices = new Set(rows.filter((r) => r.settlement_status === "settled").map((r) => r.invoice_id));
  const markedPaid = [...invoiceById.values()].filter((invoice) => invoice.invoice_status === "paid");
  expect(id, "the count of invoices marked paid", markedPaid.length, INVOICE_CENSUS.paid);
  const paidButUnsettled = markedPaid.filter((invoice) => !settledInvoices.has(invoice.invoice_id));
  expect(
    id, "the count of invoices marked paid with no settled payment",
    paidButUnsettled.length, INVOICE_CENSUS.marked_paid_without_a_settled_payment
  );

  // And the half that makes "exactly one" mean something: on every other row
  // the register's status is what the payment log computes.
  const disagreeing = [...invoiceById.values()].filter(
    (invoice) => invoice.invoice_status !== surfaceStatus(invoice, byInvoice.get(invoice.invoice_id))
  );
  expect(id, "the count of invoices whose status the payment log does not compute", disagreeing.length, 1);
  if (disagreeing[0].invoice_id !== paidButUnsettled[0].invoice_id) {
    throw new Error(`${id}: the disagreeing invoice and the one marked paid without a payment are different rows`);
  }
}

/**
 * What the invoicing surface would read if it were recomputed from the payment
 * log at the as-of date. Exactly one register row disagrees with this, and that
 * row is P1.
 */
function surfaceStatus(invoice, paymentRows) {
  const settled = paymentRows.filter((r) => r.settlement_status === "settled");
  if (settled.length === paymentRows.length) return "paid";
  if (settled.length > 0) return "part_paid";
  const earliest = paymentRows.reduce((soonest, r) => {
    const obligation = r.payment_plan_id === "" ? r.due_date : r.installment_due_date;
    return obligation < soonest ? obligation : soonest;
  }, "9999-12-31");
  return earliest < AS_OF_DATE ? "overdue" : "sent";
}

function assertAgingSummary(rows, payments, invoiceById) {
  const id = "SMB-19";
  expect(id, "the row count", rows.length, AGING_CENSUS.rows);

  const clients = rows.map((r) => r.client_canon_id);
  if (clients.join(",") !== [...clients].sort().join(",")) throw new Error(`${id}: file order is not client_canon_id order`);
  for (const [i, r] of rows.entries()) {
    if (r.aging_row_id !== `AGE-LDB-${String(i + 1).padStart(2, "0")}`) {
      throw new Error(`${id}: ${r.aging_row_id} is out of id order at file position ${i + 1}`);
    }
    if (r.as_of_date !== AS_OF_DATE) throw new Error(`${id}: ${r.aging_row_id} reports against ${r.as_of_date}`);
    if (!AGING_BUCKETS.includes(r.aging_bucket)) throw new Error(`${id}: ${r.aging_row_id} carries bucket "${r.aging_bucket}"`);
    if (!["yes", "no"].includes(r.on_payment_plan)) throw new Error(`${id}: ${r.aging_row_id} carries on_payment_plan "${r.on_payment_plan}"`);
    if ((r.payment_plan_id !== "") !== (r.on_payment_plan === "yes")) {
      throw new Error(`${id}: ${r.aging_row_id} reads on_payment_plan ${r.on_payment_plan} against a plan id of "${r.payment_plan_id}"`);
    }
    if (r.aging_bucket !== bucketFor(Number(r.days_past_due))) throw new Error(`${id}: ${r.aging_row_id}'s bucket is not its own days past due`);
    if (r.dunning_stage !== dunningStageFor(Number(r.days_past_due))) throw new Error(`${id}: ${r.aging_row_id}'s stage is not its own days past due`);
    if (r.promise_to_pay_date !== "") {
      assertWeekday(id, `${r.aging_row_id} promise_to_pay_date`, r.promise_to_pay_date);
      if (r.promise_to_pay_date <= AS_OF_DATE) {
        throw new Error(`${id}: ${r.aging_row_id} promises to pay ${r.promise_to_pay_date}, at or before the as-of date, so it is already broken`);
      }
      if (toCents(r.promise_amount_usd) > toCents(r.open_balance_usd)) {
        throw new Error(`${id}: ${r.aging_row_id} promises more than it owes`);
      }
    } else if (r.promise_amount_usd !== "") {
      throw new Error(`${id}: ${r.aging_row_id} carries a promise amount and no promise date`);
    }
  }

  // T-C3: exactly the clients with an open balance, as two set differences.
  const owing = new Set(payments.filter((r) => r.settlement_status === "open").map((r) => r.client_canon_id));
  const listed = new Set(clients);
  for (const client of owing) if (!listed.has(client)) throw new Error(`${id}: ${client} carries an open balance and is not on the ladder`);
  for (const client of listed) if (!owing.has(client)) throw new Error(`${id}: ${client} is on the ladder and owes nothing`);

  // The two empty buckets and the two empty stages, asserted by name: if a
  // later edit populates one, this fails and somebody looks (U-I).
  expect(id, "the populated bucket count", new Set(rows.map((r) => r.aging_bucket)).size, AGING_CENSUS.populated_buckets);
  for (const bucket of ["61-90", "90+"]) {
    if (rows.some((r) => r.aging_bucket === bucket)) throw new Error(`${id}: the ${bucket} bucket is populated and this register cannot reach it`);
  }
  expect(id, "the populated stage count", new Set(rows.map((r) => r.dunning_stage)).size, AGING_CENSUS.populated_stages);
  for (const stage of ["1", "4"]) {
    if (rows.some((r) => r.dunning_stage === stage)) throw new Error(`${id}: dunning stage ${stage} is populated and the plan pins it empty`);
  }
  expect(id, "the promise count", count(rows, (r) => r.promise_to_pay_date !== ""), AGING_CENSUS.promises);
  expect(id, "the count of clients on a payment plan", count(rows, (r) => r.on_payment_plan === "yes"), AGING_CENSUS.on_payment_plan);

  // P2, both cardinalities.
  const pastFirstStep = rows.filter((r) => Number(r.dunning_stage) >= 2);
  expect(id, "the count of clients past the ladder's first step", pastFirstStep.length, AGING_CENSUS.past_the_first_step);
  expect(
    id, "the count past the first step with no promise on record",
    count(pastFirstStep, (r) => r.promise_to_pay_date === ""),
    AGING_CENSUS.past_the_first_step_without_a_promise
  );

  // P3, both cardinalities. The rule is about the bytes of SMB-18, so it is
  // computed from them rather than from this file's own bucket column.
  const planClients = new Set(payments.filter((r) => r.payment_plan_id !== "").map((r) => r.client_canon_id));
  expect(id, "the count of clients on a payment plan at all", planClients.size, AGING_CENSUS.on_payment_plan);
  const withinTerms = [...planClients].filter((client) => {
    const dates = payments
      .filter((r) => r.client_canon_id === client && r.payment_plan_id !== "" && r.settlement_status === "open")
      .map((r) => r.installment_due_date)
      .sort();
    return dates.length > 0 && dates[0] > AS_OF_DATE;
  });
  expect(id, "the count of clients on a plan and within terms", withinTerms.length, AGING_CENSUS.on_a_plan_within_terms);

  // T-C9: the trap is present rather than assumed. Read from the register's own
  // due dates, the client within terms is genuinely past due, and this file
  // says zero.
  const naive = rows.find((r) => r.client_canon_id === withinTerms[0]);
  const naiveDue = payments
    .filter((r) => r.client_canon_id === withinTerms[0] && r.settlement_status === "open")
    .map((r) => invoiceById.get(r.invoice_id).due_date)
    .sort()[0];
  const naiveDays = Math.max(0, diffDays(naiveDue, AS_OF_DATE));
  if (naiveDays <= 0) {
    throw new Error(`${id}: the naive reading over the register's due dates returns ${naiveDays} days, so the trap is not in the bytes`);
  }
  if (naive.days_past_due !== "0") {
    throw new Error(`${id}: ${naive.aging_row_id} reads ${naive.days_past_due} days past due and the plan pins 0`);
  }

  // And the whole ladder against the plan's four pinned rows, last, so a
  // derivation that drifts fails with the column and both values.
  assertPinnedAging(rows);
}

/**
 * The four aging rows, exactly as data plan 2.3 pins them. Held as a pin
 * against the derivation above: every cell is computed from SMB-17 and SMB-18
 * and then checked here, so a derivation that drifts fails loudly rather than
 * emitting a plausible ladder nobody notices.
 */
export const PINNED_AGING = [
  { aging_row_id: "AGE-LDB-01", client_canon_id: "co-132", open_balance_usd: "16087.50", oldest_unsettled_invoice_id: "INV-LDB-2026-302", on_payment_plan: "yes", payment_plan_id: "PLN-LDB-01", governing_due_date: "2026-03-13", days_past_due: "18", aging_bucket: "1-30", dunning_stage: "2", promise_to_pay_date: "" },
  { aging_row_id: "AGE-LDB-02", client_canon_id: "co-201", open_balance_usd: "16843.75", oldest_unsettled_invoice_id: "INV-LDB-2026-303", on_payment_plan: "yes", payment_plan_id: "PLN-LDB-02", governing_due_date: "2026-04-10", days_past_due: "0", aging_bucket: "current", dunning_stage: "0", promise_to_pay_date: "" },
  { aging_row_id: "AGE-LDB-03", client_canon_id: "co-202", open_balance_usd: "44000.00", oldest_unsettled_invoice_id: "INV-LDB-2026-307", on_payment_plan: "no", payment_plan_id: "", governing_due_date: "2026-03-06", days_past_due: "25", aging_bucket: "1-30", dunning_stage: "2", promise_to_pay_date: "2026-04-10" },
  { aging_row_id: "AGE-LDB-04", client_canon_id: "co-203", open_balance_usd: "21600.00", oldest_unsettled_invoice_id: "INV-LDB-2026-310", on_payment_plan: "no", payment_plan_id: "", governing_due_date: "2026-02-27", days_past_due: "32", aging_bucket: "31-60", dunning_stage: "3", promise_to_pay_date: "2026-04-03" },
];

/** The pin itself, run at the end of the aging build. */
export function assertPinnedAging(rows) {
  if (rows.length !== PINNED_AGING.length) {
    throw new Error(`SMB-19: the ladder is ${rows.length} rows and the plan pins ${PINNED_AGING.length}`);
  }
  for (const [i, pinned] of PINNED_AGING.entries()) {
    for (const [column, value] of Object.entries(pinned)) {
      if (rows[i][column] !== value) {
        throw new Error(
          `SMB-19: ${pinned.aging_row_id} derives ${column} ${JSON.stringify(rows[i][column])} and the plan pins `
          + `${JSON.stringify(value)}. The derivation and the plan have drifted apart.`
        );
      }
    }
  }
}

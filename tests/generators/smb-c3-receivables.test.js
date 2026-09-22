// SMB-17, SMB-18 and SMB-19: the three deterministic artifacts of the
// receivables wave, screened from their emitted bytes.
//
//   datasets/smb/invoices-issued/      the nineteen invoices, as the surface shows them
//   datasets/smb/payment-status-mock/  the twenty-five mock payment rows behind them
//   datasets/smb/aging-summary/        the four aging rows, every cell derived
//
// Every check recomputes its answer from the shipped bytes the way a consumer
// would. Nothing here imports a builder, a builder's predicate, a builder's
// census constant or a builder's vocabulary list: the due-date arithmetic, the
// aging ladder, the bucket edges, the open balances, the governing due dates
// and the naive reading are all written again in this file with a different
// implementation, so the generator and its screen can genuinely disagree. A
// test that imported the ladder it screens against would pass on the day
// somebody edited the ladder, which is the one failure this file exists to
// prevent.
//
// The mutation this file exists to catch, stated in the data plan's own words:
// a payment plan's installment dates edited so that the client within terms
// has a next installment falling before the as-of date, which silently turns
// the "no premature reminder" plant into a client who genuinely is overdue and
// leaves every count in the file looking right.
//
// Four mechanical rules are stated once here and used throughout.
//
//   The census rule. Every count the data plan pins is asserted as a number,
//   not as a floor. `>= 4` passes on a file with forty rows and is not a
//   census, so every assertion below is an equality.
//
//   The plant rule. Every plant is asserted at BOTH cardinalities: the count
//   under the stated rule, and the count with the one qualifier the rule names
//   dropped. P1 is 1 and 13, P2 is 1 and 3, P3 is 1 and 2.
//
//   The join rule. A join is asserted as two set differences, both empty. A
//   one-directional check passes on a register that grew a twentieth invoice
//   nobody ever paid.
//
//   The derive rule. Bytes another artifact already froze are re-read out of
//   its emitted output rather than retyped here: the eight already-recorded
//   draws come out of SMB-04's and SMB-05's emitted JSON and the milestone
//   citations out of SMB-16's emitted CSV, so an upstream edit moves this
//   screen with it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { PROGRAM_GENERATOR_IDS } from "../../datagen/src/generators/index.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";
import { MOCK_VOCABULARY } from "../helpers/smb-mock-vocabulary.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));

const emitted = (id) => generateArtifact(specs.byId.get(id), canon);

const register = csvTable(fileByPath(emitted("SMB-17"), "invoices-issued.csv").content);
const payments = csvTable(fileByPath(emitted("SMB-18"), "payment-status-mock.csv").content);
const aging = csvTable(fileByPath(emitted("SMB-19"), "aging-summary.csv").content);
const schedule = csvTable(fileByPath(emitted("SMB-16"), "milestone-schedule.csv").content);
const okaforRecord = JSON.parse(fileByPath(emitted("SMB-04"), "client-record-okafor.json").content);
const officeRecord = JSON.parse(fileByPath(emitted("SMB-05"), "client-record-co002-office-refresh.json").content);

/** The as-of date the whole pack reports against, read off the client record. */
const AS_OF = okaforRecord.client.as_of_date;

/** The reserved Larkspur-side band, canon/companies.md:16. */
const BAND = { first: 200, last: 249 };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** How many rows satisfy `predicate`. */
const count = (rows, predicate) => rows.filter(predicate).length;

/** Every value of `column`, in file order. */
const column = (table, name) => table.rows.map((r) => r[name]);

/**
 * A money string to integer cents. A second implementation: string surgery on
 * the two sides of the decimal point rather than a multiply, so a value this
 * pack could never emit (a comma, a currency sign, three decimal places) fails
 * here rather than rounding into something plausible.
 */
function toCents(value) {
  const match = /^(-?)(\d+)\.(\d{2})$/.exec(value);
  assert.ok(match, `"${value}" is not a 2dp money string`);
  const cents = Number(match[2]) * 100 + Number(match[3]);
  return match[1] === "-" ? -cents : cents;
}

/**
 * Days from the civil epoch, the days-from-civil algorithm, written out rather
 * than taken from datagen/src/dates.js: this file's date arithmetic has to be
 * able to disagree with the builder's. No Date object is constructed anywhere
 * in this file, deliberately.
 */
function epochDay(iso) {
  assert.match(iso, ISO_DATE, "not an ISO date");
  const [y, m, d] = iso.split("-").map(Number);
  const year = m <= 2 ? y - 1 : y;
  const era = Math.floor(year / 400);
  const yearOfEra = year - era * 400;
  const dayOfYear = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

/** The inverse, so a computed due date can be compared as a string. */
function isoFromEpochDay(day) {
  const z = day + 719468;
  const era = Math.floor(z / 146097);
  const dayOfEra = z - era * 146097;
  const yearOfEra = Math.floor(
    (dayOfEra - Math.floor(dayOfEra / 1460) + Math.floor(dayOfEra / 36524) - Math.floor(dayOfEra / 146096)) / 365
  );
  const year = yearOfEra + era * 400;
  const dayOfYear = dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const mp = Math.floor((5 * dayOfYear + 2) / 153);
  const day_ = dayOfYear - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp + (mp < 10 ? 3 : -9);
  const y = month <= 2 ? year + 1 : year;
  return `${String(y).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day_).padStart(2, "0")}`;
}

/** Whole calendar days from `from` to `to`, both ISO dates. */
const daysBetween = (from, to) => epochDay(to) - epochDay(from);

/** 0 is Sunday. 1970-01-01 was a Thursday. */
const weekdayOf = (iso) => ((epochDay(iso) + 4) % 7 + 7) % 7;
const isWeekend = (iso) => weekdayOf(iso) === 0 || weekdayOf(iso) === 6;

/**
 * The term window in calendar days, read out of the term name itself rather
 * than out of the builder's table: SMB-02 defines `net_15` as fifteen calendar
 * days and the name carries the number.
 */
function termDays(terms) {
  const match = /^net_(\d+)$/.exec(terms);
  assert.ok(match, `"${terms}" is not an SMB-02 payment term`);
  return Number(match[1]);
}

/** The bucket edges, written again as a chain rather than as a table. */
function bucketFor(days) {
  if (days <= 0) return "current";
  if (days >= 1 && days <= 30) return "1-30";
  if (days >= 31 && days <= 60) return "31-60";
  if (days >= 61 && days <= 90) return "61-90";
  return "90+";
}

/** The dunning ladder, written again as a chain rather than as a table. */
function stageFor(days) {
  if (days <= 0) return "0";
  if (days <= 14) return "1";
  if (days <= 30) return "2";
  if (days <= 60) return "3";
  return "4";
}

/** The payment rows for one invoice, in file order. */
const rowsForInvoice = (invoiceId) => payments.rows.filter((r) => r.invoice_id === invoiceId);

/**
 * The obligation date a payment row carries: the agreed installment date where
 * the invoice is on a plan and the invoice's own due date where it is not.
 * This is the whole of P3 and it is written here, not imported.
 */
const obligationDate = (r) => (r.payment_plan_id === "" ? r.due_date : r.installment_due_date);

// ------------------------------------------------------- enrolment (plan 4)

test("SMB-17, SMB-18 and SMB-19 are enrolled in PROGRAM_GENERATOR_IDS, so the two-run byte-identity sweep covers them", () => {
  for (const id of ["SMB-17", "SMB-18", "SMB-19"]) {
    assert.ok(
      PROGRAM_GENERATOR_IDS.includes(id),
      `${id} is not enrolled, so tests/generators/determinism.test.js never runs it twice`
    );
    assert.equal(specs.byId.get(id).generation, "deterministic", `${id} is not a deterministic spec`);
  }
});

test("SMB-17, SMB-18 and SMB-19 regenerate byte for byte, and the three agree about the population across runs", () => {
  for (const id of ["SMB-17", "SMB-18", "SMB-19"]) {
    const first = generateArtifact(specs.byId.get(id), canon);
    const second = generateArtifact(specs.byId.get(id), canon);
    assert.deepEqual(second.map((f) => f.path), first.map((f) => f.path), `${id}: the emitted file list moved`);
    for (const [i, file] of first.entries()) {
      assert.equal(second[i].content, file.content, `${id}: ${file.path} is not byte identical across two runs`);
    }
  }
  // The three drawn household names are a seeded draw, so the check that
  // matters is that all three files drew the same ones: a client named one
  // thing in the register and another in the ladder is the defect a shared
  // population exists to make impossible.
  const registerNames = new Map(register.rows.map((r) => [r.client_canon_id, r.client_name]));
  for (const r of aging.rows) {
    assert.equal(r.client_name, registerNames.get(r.client_canon_id), `${r.aging_row_id} names its client differently`);
  }
});

// --------------------------------------------------------------------- SMB-17

test("SMB-17: the header is the spec's, nineteen invoices in invoice_id order, the new block gapless from 301 (T-A1)", () => {
  assert.deepEqual(register.cols, specs.byId.get("SMB-17").columns, "SMB-17: the header is not spec.columns");
  assert.equal(register.rows.length, 19, "SMB-17: the row count moved");

  const ids = column(register, "invoice_id");
  assert.equal(new Set(ids).size, ids.length, "SMB-17: an invoice id repeats");
  assert.deepEqual(ids, [...ids].sort(), "SMB-17: file order is not invoice_id order");

  const newBlock = ids.filter((id) => id.startsWith("INV-LDB-2026-3"));
  assert.equal(newBlock.length, 11, "SMB-17: the new invoice count");
  assert.deepEqual(
    newBlock, newBlock.map((_, i) => `INV-LDB-2026-${301 + i}`),
    "SMB-17: the new block is not gapless from 301 to 311"
  );
  assert.equal(ids.length - newBlock.length, 8, "SMB-17: the already-recorded draw count");
});

test("SMB-17: the eight already-recorded draws are byte-equal to SMB-04's and SMB-05's emitted payment logs (T-A2)", () => {
  // The values are read out of the two records, not written here. A retyped
  // amount passes every other check in this file and fails this one.
  const frozen = [...okaforRecord.payment_log, ...officeRecord.payment_log];
  assert.equal(frozen.length, 8, "the two client records no longer carry eight draws between them");

  const byId = new Map(register.rows.map((r) => [r.invoice_id, r]));
  for (const payment of frozen) {
    const invoice = byId.get(payment.invoice_id);
    assert.ok(invoice, `SMB-17 does not carry ${payment.invoice_id}, which a client record issues`);
    assert.equal(invoice.invoice_date, payment.invoice_date, `${payment.invoice_id} invoice_date`);
    assert.equal(invoice.due_date, payment.due_date, `${payment.invoice_id} due_date`);
    assert.equal(invoice.invoice_amount_usd, payment.invoice_amount_usd, `${payment.invoice_id} invoice_amount_usd`);
    // Plan facts 0.5 and 0.6: all eight settled, which is why none of them can
    // be the invoice marked paid that nobody paid.
    assert.equal(payment.settlement_status, "settled", `${payment.invoice_id} no longer settled in its own record`);
    assert.equal(invoice.invoice_status, "paid", `${payment.invoice_id} settled and the register does not read paid`);
  }

  // And the client side, also read rather than typed.
  assert.equal(
    byId.get("INV-LDB-2026-101").client_canon_id, okaforRecord.client.client_canon_id,
    "SMB-17 seats the renovation's client somewhere SMB-04 does not"
  );
  assert.equal(
    byId.get("INV-LDB-2026-201").client_canon_id, officeRecord.client.client_canon_id,
    "SMB-17 seats the office refresh's client somewhere SMB-05 does not"
  );
  // Every job's terms are its client record's terms, on the two frozen jobs.
  for (const [invoiceId, record] of [["INV-LDB-2026-101", okaforRecord], ["INV-LDB-2026-201", officeRecord]]) {
    assert.equal(byId.get(invoiceId).payment_terms, record.client.payment_terms, `${invoiceId} payment_terms`);
  }
});

test("SMB-17: every due_date is the invoice_date plus the term in calendar days, recomputed here (T-A3)", () => {
  for (const r of register.rows) {
    const computed = isoFromEpochDay(epochDay(r.invoice_date) + termDays(r.payment_terms));
    assert.equal(r.due_date, computed, `${r.invoice_id}: the due date is not ${r.payment_terms} from ${r.invoice_date}`);
  }
  // Four fall on a weekend, and that is arithmetic rather than a defect: SMB-02
  // defines the due date as calendar days and net terms do not skip a weekend.
  const weekendDue = register.rows.filter((r) => isWeekend(r.due_date));
  assert.equal(weekendDue.length, 4, "SMB-17: the weekend due-date count");
  assert.deepEqual(
    weekendDue.map((r) => r.due_date).sort(),
    ["2026-02-28", "2026-03-08", "2026-03-29", "2026-04-12"],
    "SMB-17: the four weekend due dates moved"
  );
  // Every date a person chose is a weekday (plan R20).
  for (const r of register.rows) {
    assert.ok(!isWeekend(r.invoice_date), `${r.invoice_id} is dated ${r.invoice_date}, a weekend`);
  }
});

test("SMB-17: P1 at both cardinalities, one invoice marked paid with no settled payment inside thirteen (T-A4)", () => {
  // Card 1: the rule as stated. Marked paid, and no payment row for it settled.
  const settledInvoices = new Set(
    payments.rows.filter((r) => r.settlement_status === "settled").map((r) => r.invoice_id)
  );
  const markedPaid = register.rows.filter((r) => r.invoice_status === "paid");
  const plant = markedPaid.filter((r) => !settledInvoices.has(r.invoice_id));
  assert.equal(plant.length, 1, "SMB-17: the count of invoices marked paid with no settled payment behind them");

  // Card 2: drop the one qualifier the rule names, the payment log, and read
  // the status column alone. Thirteen read paid and twelve of them settled.
  assert.equal(markedPaid.length, 13, "SMB-17: the count of invoices whose status column reads paid");
  assert.equal(
    count(markedPaid, (r) => settledInvoices.has(r.invoice_id)), 12,
    "SMB-17: the count of invoices marked paid that really did settle"
  );

  // The plant's own row, re-read from the emitted bytes: its single payment row
  // is open, carries no settlement date and no settled amount, and the invoice
  // is past its own due date, so the surface reading and the record disagree.
  const rows = rowsForInvoice(plant[0].invoice_id);
  assert.equal(rows.length, 1, "the plant is on a payment plan, and the plan pins it as a single-row invoice");
  assert.equal(rows[0].settlement_status, "open");
  assert.equal(rows[0].settlement_date, "");
  assert.equal(rows[0].settled_amount_usd, "");
  assert.ok(plant[0].due_date < AS_OF, "the plant's invoice is not yet due, so nothing about it reads wrong");

  // And the half that makes "exactly one" mean something: on the other
  // eighteen rows the status column is what the payment log computes. The
  // recomputation is written here rather than imported.
  const recomputed = (invoice) => {
    const rowsFor = rowsForInvoice(invoice.invoice_id);
    const settled = rowsFor.filter((r) => r.settlement_status === "settled");
    if (settled.length === rowsFor.length) return "paid";
    if (settled.length > 0) return "part_paid";
    const earliest = rowsFor.map(obligationDate).sort()[0];
    return earliest < AS_OF ? "overdue" : "sent";
  };
  const disagreeing = register.rows.filter((r) => r.invoice_status !== recomputed(r));
  assert.equal(disagreeing.length, 1, "SMB-17: the count of rows whose status the payment log does not compute");
  assert.equal(disagreeing[0].invoice_id, plant[0].invoice_id, "two different rows are wrong in two different ways");

  // The status vocabulary, and its census.
  assert.deepEqual(
    [...new Set(column(register, "invoice_status"))].sort(),
    ["overdue", "paid", "part_paid", "sent"],
    "SMB-17: the invoice_status vocabulary moved"
  );
  assert.equal(count(register.rows, (r) => r.invoice_status === "part_paid"), 2, "part_paid");
  assert.equal(count(register.rows, (r) => r.invoice_status === "sent"), 2, "sent");
  assert.equal(count(register.rows, (r) => r.invoice_status === "overdue"), 2, "overdue");
});

test("SMB-17: six jobs, six clients, and the per-job billed totals SMB-22 has to equal to the cent (T-A5, T-A6)", () => {
  const jobs = [...new Set(column(register, "job_id"))].sort();
  assert.deepEqual(
    jobs,
    ["JOB-LDB-01", "JOB-LDB-02", "JOB-LDB-03", "JOB-LDB-04", "JOB-LDB-05", "JOB-LDB-06"],
    "SMB-17: the job population moved"
  );
  assert.equal(new Set(column(register, "client_canon_id")).size, 6, "SMB-17: the client count");

  // One client per job and one job per client: the two are the same partition,
  // asserted as two set differences.
  const clientByJob = new Map();
  for (const r of register.rows) {
    const seen = clientByJob.get(r.job_id);
    if (seen) assert.equal(seen, r.client_canon_id, `${r.job_id} is invoiced to two different clients`);
    clientByJob.set(r.job_id, r.client_canon_id);
  }
  assert.equal(new Set(clientByJob.values()).size, 6, "two jobs share a client");

  // T-A6, in integer cents. These are the plan's pinned billed_to_date figures
  // and they are what SMB-22's column has to carry when it ships.
  const billed = {};
  for (const r of register.rows) {
    billed[r.job_id] = (billed[r.job_id] ?? 0) + toCents(r.invoice_amount_usd);
  }
  assert.deepEqual(billed, {
    "JOB-LDB-01": 14850000,
    "JOB-LDB-02": 4620000,
    "JOB-LDB-03": 3932500,
    "JOB-LDB-04": 2887500,
    "JOB-LDB-05": 6160000,
    "JOB-LDB-06": 3240000,
  }, "SMB-17: a per-job billed total has drifted from data plan section 2.6");

  // The two frozen jobs are billed exactly their contract value, read off the
  // records rather than typed, because both are fully drawn.
  assert.equal(billed["JOB-LDB-01"], toCents(okaforRecord.client.contract_value_usd));
  assert.equal(billed["JOB-LDB-02"], toCents(officeRecord.client.contract_value_usd));
});

test("SMB-17: every client is seated in canon byte for byte or lies inside the reserved co-200 band (T-A7)", () => {
  const generated = new Set();
  for (const r of register.rows) {
    const seated = canon.get(r.client_canon_id);
    if (seated) {
      assert.equal(r.client_name, seated.name, `${r.invoice_id} calls ${r.client_canon_id} something canon does not`);
      continue;
    }
    const match = /^co-(\d{3})$/.exec(r.client_canon_id);
    assert.ok(match, `${r.invoice_id} carries the client id "${r.client_canon_id}"`);
    const number = Number(match[1]);
    assert.ok(
      number >= BAND.first && number <= BAND.last,
      `${r.invoice_id} names ${r.client_canon_id}, which canon does not seat and the co-${BAND.first} to co-${BAND.last} band does not cover`
    );
    assert.match(r.client_name, /^The \S+ household$/, `${r.client_canon_id} is not a generated household name`);
    generated.add(r.client_canon_id);
  }
  assert.equal(generated.size, 3, "SMB-17: the count of reserved-band clients");
  assert.deepEqual([...generated].sort(), ["co-201", "co-202", "co-203"], "the band ids consumed moved");

  // A generated surname may not echo a canon company word, and may not be one
  // SMB-03's queue already emitted: the screen is re-run here over the shipped
  // names rather than trusted from the builder.
  const canonWords = new Set();
  for (const entry of canon.values()) {
    for (const word of entry.name.toLowerCase().split(/[^a-z0-9]+/)) if (word.length >= 4) canonWords.add(word);
  }
  const queue = csvTable(fileByPath(emitted("SMB-03"), "inbound-inquiry-queue.csv").content);
  const queueSurnames = new Set(
    queue.rows
      .filter((r) => r.client_canon_id === "")
      .map((r) => /^The (\S+) household$/.exec(r.client_name)[1].toLowerCase())
  );
  assert.equal(queueSurnames.size, 11, "SMB-03 no longer emits eleven generated households");
  for (const canonId of generated) {
    const name = register.rows.find((r) => r.client_canon_id === canonId).client_name;
    const surname = /^The (\S+) household$/.exec(name)[1].toLowerCase();
    assert.ok(!canonWords.has(surname), `the generated surname "${surname}" is a canon company word`);
    assert.ok(!queueSurnames.has(surname), `the generated surname "${surname}" is already an SMB-03 inquiry`);
  }
});

test("SMB-17: every milestone_reference resolves into SMB-16, and every invoice is dated inside the window (T-A8, T-A9)", () => {
  const milestoneIds = new Set(column(schedule, "milestone_id"));
  const completedOn = new Map(
    schedule.rows.filter((r) => r.actual_completion !== "").map((r) => [r.milestone_id, r.actual_completion])
  );
  const citing = register.rows.filter((r) => r.milestone_reference !== "");
  assert.equal(citing.length, 3, "SMB-17: the milestone citation count");
  for (const r of citing) {
    assert.ok(milestoneIds.has(r.milestone_reference), `${r.invoice_id} cites ${r.milestone_reference}, which SMB-16 does not carry`);
    assert.equal(r.job_id, "JOB-LDB-01", `${r.invoice_id} cites a milestone and is not on the job SMB-16 schedules`);
    // A draw is raised the day its milestone completed, so the citation is a
    // join and not a label: the date is read out of SMB-16's emitted row.
    assert.equal(
      completedOn.get(r.milestone_reference), r.invoice_date,
      `${r.invoice_id} cites ${r.milestone_reference}, which did not complete on the day the draw was raised`
    );
  }
  // No other job has a milestone schedule in the pack, so no other row may cite.
  for (const r of register.rows.filter((r) => r.job_id !== "JOB-LDB-01")) {
    assert.equal(r.milestone_reference, "", `${r.invoice_id} cites a milestone and its job has no schedule`);
  }

  for (const r of register.rows) {
    assert.ok(r.invoice_date >= "2026-02-01" && r.invoice_date <= "2026-03-31", `${r.invoice_id} is dated ${r.invoice_date}`);
    assert.equal(r.as_of_date, AS_OF, `${r.invoice_id} reports against ${r.as_of_date}`);
  }
});

// --------------------------------------------------------------------- SMB-18

test("SMB-18: the header is the spec's, twenty-five rows, and each payment block is unique and gapless (T-B1)", () => {
  assert.deepEqual(payments.cols, specs.byId.get("SMB-18").columns, "SMB-18: the header is not spec.columns");
  assert.equal(payments.rows.length, 25, "SMB-18: the row count moved");

  const ids = column(payments, "payment_id");
  assert.equal(new Set(ids).size, ids.length, "SMB-18: a payment id repeats");
  const newBlock = ids.filter((id) => id.startsWith("PAY-LDB-2026-3"));
  assert.equal(newBlock.length, 17, "SMB-18: the new payment count");
  assert.deepEqual(
    newBlock, newBlock.map((_, i) => `PAY-LDB-2026-${301 + i}`),
    "SMB-18: the new block is not gapless from 301 to 317"
  );
  // The eight already-recorded ids are the records' own, read rather than typed.
  const frozenIds = [...okaforRecord.payment_log, ...officeRecord.payment_log].map((p) => p.payment_id).sort();
  assert.deepEqual(ids.filter((id) => !id.startsWith("PAY-LDB-2026-3")).sort(), frozenIds, "SMB-18: the frozen payment ids");
});

test("SMB-18: the invoice join closes in both directions, as two empty set differences (T-B2)", () => {
  const invoiced = new Set(column(register, "invoice_id"));
  const paid = new Set(column(payments, "invoice_id"));
  assert.deepEqual(
    [...paid].filter((id) => !invoiced.has(id)), [],
    "SMB-18 cites an invoice the register does not carry"
  );
  assert.deepEqual(
    [...invoiced].filter((id) => !paid.has(id)), [],
    "the register carries an invoice no payment row cites"
  );
  assert.equal(paid.size, 19, "SMB-18: the count of distinct invoices");
});

test("SMB-18: invoice_date, invoice_amount_usd and due_date are byte-equal to the register's on every row (T-B3)", () => {
  const byId = new Map(register.rows.map((r) => [r.invoice_id, r]));
  for (const r of payments.rows) {
    const invoice = byId.get(r.invoice_id);
    for (const col of ["invoice_date", "invoice_amount_usd", "due_date"]) {
      assert.equal(r[col], invoice[col], `${r.payment_id}: ${col} disagrees with the register`);
    }
    assert.equal(r.client_canon_id, invoice.client_canon_id, `${r.payment_id}: the client disagrees with the register`);
  }
});

test("SMB-18: the installments sum to the invoice for every invoice, plan or not, in integer cents (T-B4)", () => {
  const summed = new Map();
  for (const r of payments.rows) {
    summed.set(r.invoice_id, (summed.get(r.invoice_id) ?? 0) + toCents(r.installment_amount_usd));
  }
  for (const r of register.rows) {
    assert.equal(
      summed.get(r.invoice_id), toCents(r.invoice_amount_usd),
      `${r.invoice_id}: the rows behind it do not sum to what it invoiced`
    );
  }
  // Both plans divide exactly, which is why no installment carries a remainder.
  for (const planId of ["PLN-LDB-01", "PLN-LDB-02"]) {
    const planRows = payments.rows.filter((r) => r.payment_plan_id === planId);
    assert.equal(planRows.length, 4, `${planId}: the installment count`);
    const amounts = new Set(planRows.map((r) => r.installment_amount_usd));
    assert.equal(amounts.size, 1, `${planId}: the installments are not all the same size`);
    assert.equal(
      toCents([...amounts][0]) * 4, toCents(planRows[0].invoice_amount_usd),
      `${planId}: four installments do not make the invoice`
    );
    assert.deepEqual(planRows.map((r) => r.installment_sequence), ["1", "2", "3", "4"], `${planId}: sequence order`);
  }
});

test("SMB-18: the full census of data plan 2.2, every count an equality (T-B5)", () => {
  const rows = payments.rows;
  assert.equal(count(rows, (r) => r.payment_plan_id !== ""), 8, "rows on a plan");
  assert.equal(count(rows, (r) => r.payment_plan_id === ""), 17, "rows on no plan");
  assert.equal(count(rows, (r) => r.settlement_status === "settled"), 14, "settled");
  assert.equal(count(rows, (r) => r.settlement_status === "open"), 11, "open");
  assert.equal(count(rows, (r) => r.method === "mock_bank_transfer"), 21, "mock_bank_transfer");
  assert.equal(count(rows, (r) => r.method === "mock_check"), 4, "mock_check");
  assert.equal(new Set(rows.map((r) => r.payment_plan_id).filter((id) => id !== "")).size, 2, "payment plans");
  assert.equal(count(rows, (r) => r.settled_amount_usd !== ""), 14, "rows carrying a settled amount");
  assert.deepEqual(
    [...new Set(column(payments, "settlement_status"))].sort(), ["open", "settled"],
    "SMB-18: the settlement_status vocabulary moved"
  );

  // The four mock_check rows are the already-recorded office-refresh draws,
  // which is read off SMB-05 rather than asserted from memory.
  const checkRows = rows.filter((r) => r.method === "mock_check");
  assert.deepEqual(
    checkRows.map((r) => r.payment_id).sort(),
    officeRecord.payment_log.map((p) => p.payment_id).sort(),
    "SMB-18: the mock_check rows are not the office refresh's own"
  );

  // settled_amount_usd is the installment amount on every settled row, and
  // both settlement cells are empty on every open one.
  for (const r of rows) {
    if (r.settlement_status === "settled") {
      assert.equal(r.settled_amount_usd, r.installment_amount_usd, `${r.payment_id}: settled a different amount`);
      assert.notEqual(r.settlement_date, "", `${r.payment_id}: settled with no date`);
    } else {
      assert.equal(r.settled_amount_usd, "", `${r.payment_id}: open and carries an amount`);
      assert.equal(r.settlement_date, "", `${r.payment_id}: open and carries a date`);
    }
    // The four plan columns are populated together or not at all.
    const onPlan = r.payment_plan_id !== "";
    assert.equal(r.installment_sequence !== "", onPlan, `${r.payment_id}: installment_sequence against its plan id`);
    assert.equal(r.installment_due_date !== "", onPlan, `${r.payment_id}: installment_due_date against its plan id`);
    assert.notEqual(r.installment_amount_usd, "", `${r.payment_id}: carries no installment amount`);
  }
});

test("SMB-18: every settlement lands inside its own invoice date and the as-of date, on a weekday (T-B6)", () => {
  for (const r of payments.rows.filter((r) => r.settlement_status === "settled")) {
    assert.match(r.settlement_date, ISO_DATE, `${r.payment_id} settlement_date`);
    assert.ok(r.settlement_date >= r.invoice_date, `${r.payment_id} settled before it was invoiced`);
    assert.ok(r.settlement_date <= AS_OF, `${r.payment_id} settled after the as-of date`);
    assert.ok(!isWeekend(r.settlement_date), `${r.payment_id} settled ${r.settlement_date}, a weekend`);
  }
});

test("SMB-18: every installment is due strictly after the invoice's own due date, on a weekday (T-B7)", () => {
  const onPlan = payments.rows.filter((r) => r.payment_plan_id !== "");
  assert.equal(onPlan.length, 8, "the count of installment rows");
  for (const r of onPlan) {
    assert.ok(
      r.installment_due_date > r.due_date,
      `${r.payment_id} asks for money on ${r.installment_due_date}, at or before its own due date ${r.due_date}`
    );
    assert.ok(!isWeekend(r.installment_due_date), `${r.payment_id} is due ${r.installment_due_date}, a weekend`);
  }
  // One plan runs inside the quarter and the other runs past it, which is what
  // gives the aging two different answers to the same question.
  const byPlan = (id) => onPlan.filter((r) => r.payment_plan_id === id).map((r) => r.installment_due_date);
  assert.deepEqual(byPlan("PLN-LDB-01"), ["2026-03-06", "2026-03-13", "2026-03-20", "2026-03-27"]);
  assert.deepEqual(byPlan("PLN-LDB-02"), ["2026-03-10", "2026-04-10", "2026-05-11", "2026-06-10"]);
});

test("SMB-18: the eight already-recorded rows are byte-equal to the client records on all eleven reused fields (T-B8)", () => {
  const frozen = new Map(
    [...okaforRecord.payment_log, ...officeRecord.payment_log].map((p) => [p.payment_id, p])
  );
  assert.equal(frozen.size, 8);
  const reused = [
    "payment_id", "invoice_id", "invoice_date", "invoice_amount_usd", "due_date",
    "settlement_date", "settled_amount_usd", "settlement_status", "method",
    "record_type", "mock_notice",
  ];
  assert.equal(reused.length, 11, "the reused field count moved");
  // The one SMB-02 payment field SMB-18 drops, asserted as an absence.
  assert.ok(Object.hasOwn([...frozen.values()][0], "stage_id"), "the client record no longer carries stage_id");
  assert.ok(!payments.cols.includes("stage_id"), "SMB-18 carries stage_id, which has no referent in a register");

  for (const r of payments.rows.filter((r) => frozen.has(r.payment_id))) {
    const source = frozen.get(r.payment_id);
    for (const field of reused) {
      assert.equal(r[field], source[field], `${r.payment_id}: ${field} is not the client record's own`);
    }
    assert.equal(r.payment_plan_id, "", `${r.payment_id}: an already-recorded draw is on a payment plan`);
  }
});

test("SMB-18, SMB-17 and SMB-19: no processor, gateway, card network or bank product is named anywhere (T-B9, rule R-MOCK)", () => {
  // An absence over every row and every column of all three files, with the
  // pinned deny-list, plus the presence half on SMB-18: the mock notice is
  // byte identical on all 25 rows and record_type is mock on all 25.
  const NOTICE = "MOCK PAYMENT RECORD, NO FUNDS MOVED";
  for (const r of payments.rows) {
    assert.equal(r.record_type, "mock", `${r.payment_id} record_type`);
    assert.equal(r.mock_notice, NOTICE, `${r.payment_id} carries a notice that is not byte identical`);
    assert.ok(["mock_bank_transfer", "mock_check"].includes(r.method), `${r.payment_id} method "${r.method}"`);
  }
  assert.equal(new Set(column(payments, "mock_notice")).size, 1, "SMB-18 carries two spellings of the notice");
  assert.equal(new Set(column(payments, "record_type")).size, 1, "SMB-18 carries two record types");

  const files = {
    "SMB-17": fileByPath(emitted("SMB-17"), "invoices-issued.csv").content,
    "SMB-18": fileByPath(emitted("SMB-18"), "payment-status-mock.csv").content,
    "SMB-19": fileByPath(emitted("SMB-19"), "aging-summary.csv").content,
  };
  assert.ok(MOCK_VOCABULARY.length >= 30, "the deny-list has shrunk");
  for (const [id, text] of Object.entries(files)) {
    const words = new Set(text.toLowerCase().split(/[^a-z0-9]+/));
    for (const term of MOCK_VOCABULARY) {
      assert.ok(!words.has(term), `${id} names "${term}", which is a processor, gateway, card network or bank product`);
    }
    // No authorization code or masked instrument number either: the whole of
    // the pack's id vocabulary is namespaced, and a bare digit run of twelve
    // or more is an instrument number whatever it is called.
    assert.doesNotMatch(text, /\b\d{12,}\b/, `${id} carries a long bare digit run, which reads as an instrument number`);
  }
});

// --------------------------------------------------------------------- SMB-19

test("SMB-19: the header is the spec's, four rows, AGE-LDB-01 upward in client_canon_id order (T-C1)", () => {
  assert.deepEqual(aging.cols, specs.byId.get("SMB-19").columns, "SMB-19: the header is not spec.columns");
  assert.equal(aging.rows.length, 4, "SMB-19: the row count moved");
  const ids = column(aging, "aging_row_id");
  assert.deepEqual(ids, ids.map((_, i) => `AGE-LDB-${String(i + 1).padStart(2, "0")}`), "SMB-19: the ids are not gapless");
  const clients = column(aging, "client_canon_id");
  assert.deepEqual(clients, [...clients].sort(), "SMB-19: file order is not client_canon_id order");
  assert.equal(new Set(clients).size, 4, "a client appears twice on the ladder");
  for (const r of aging.rows) assert.equal(r.as_of_date, AS_OF, `${r.aging_row_id} reports against ${r.as_of_date}`);
});

test("SMB-19: every derived cell recomputes from SMB-17 and SMB-18, by a second implementation (T-C2)", () => {
  const dueDateOf = new Map(register.rows.map((r) => [r.invoice_id, r.due_date]));
  const invoiceDateOf = new Map(register.rows.map((r) => [r.invoice_id, r.invoice_date]));

  for (const row of aging.rows) {
    const open = payments.rows.filter(
      (r) => r.client_canon_id === row.client_canon_id && r.settlement_status === "open"
    );
    assert.ok(open.length > 0, `${row.aging_row_id} is on the ladder and owes nothing`);

    const balance = open.reduce((sum, r) => sum + toCents(r.installment_amount_usd), 0);
    assert.equal(toCents(row.open_balance_usd), balance, `${row.aging_row_id}: open_balance_usd`);

    const oldest = [...open].sort((a, b) => {
      const left = invoiceDateOf.get(a.invoice_id);
      const right = invoiceDateOf.get(b.invoice_id);
      if (left !== right) return left < right ? -1 : 1;
      return a.invoice_id < b.invoice_id ? -1 : 1;
    })[0].invoice_id;
    assert.equal(row.oldest_unsettled_invoice_id, oldest, `${row.aging_row_id}: oldest_unsettled_invoice_id`);

    const governing = open.map(obligationDate).sort()[0];
    assert.equal(row.governing_due_date, governing, `${row.aging_row_id}: governing_due_date`);

    const days = Math.max(0, daysBetween(governing, AS_OF));
    assert.equal(row.days_past_due, String(days), `${row.aging_row_id}: days_past_due`);
    assert.equal(row.aging_bucket, bucketFor(days), `${row.aging_row_id}: aging_bucket`);
    assert.equal(row.dunning_stage, stageFor(days), `${row.aging_row_id}: dunning_stage`);

    const plans = [...new Set(open.map((r) => r.payment_plan_id).filter((id) => id !== ""))];
    assert.equal(row.on_payment_plan, plans.length > 0 ? "yes" : "no", `${row.aging_row_id}: on_payment_plan`);
    assert.equal(row.payment_plan_id, plans[0] ?? "", `${row.aging_row_id}: payment_plan_id`);

    // The oldest unsettled invoice is one this client actually holds, and its
    // due date is at or after the governing date, which is the half that keeps
    // "oldest" and "governing" from being quietly the same column.
    assert.ok(dueDateOf.has(row.oldest_unsettled_invoice_id), `${row.aging_row_id} cites an invoice the register lacks`);
  }

  // The four pinned rows of data plan 2.3, typed here rather than derived, so a
  // derivation that drifts in step with the builder still fails.
  assert.deepEqual(aging.rows.map((r) => [
    r.client_canon_id, r.open_balance_usd, r.oldest_unsettled_invoice_id, r.on_payment_plan,
    r.payment_plan_id, r.governing_due_date, r.days_past_due, r.aging_bucket, r.dunning_stage,
    r.promise_to_pay_date, r.promise_amount_usd,
  ]), [
    ["co-132", "16087.50", "INV-LDB-2026-302", "yes", "PLN-LDB-01", "2026-03-13", "18", "1-30", "2", "", ""],
    ["co-201", "16843.75", "INV-LDB-2026-303", "yes", "PLN-LDB-02", "2026-04-10", "0", "current", "0", "", ""],
    ["co-202", "44000.00", "INV-LDB-2026-307", "no", "", "2026-03-06", "25", "1-30", "2", "2026-04-10", "44000.00"],
    ["co-203", "21600.00", "INV-LDB-2026-310", "no", "", "2026-02-27", "32", "31-60", "3", "2026-04-03", "21600.00"],
  ], "SMB-19: a row has drifted from data plan section 2.3");
});

test("SMB-19: exactly the clients with a non-zero open balance appear, as two set differences (T-C3)", () => {
  const owing = new Set(payments.rows.filter((r) => r.settlement_status === "open").map((r) => r.client_canon_id));
  const listed = new Set(column(aging, "client_canon_id"));
  assert.deepEqual([...owing].filter((c) => !listed.has(c)), [], "a client owes money and is not on the ladder");
  assert.deepEqual([...listed].filter((c) => !owing.has(c)), [], "a client is on the ladder and owes nothing");

  // The two already-recorded clients settled everything, which is why they are
  // absent: asserted rather than assumed, and read off the emitted records.
  for (const record of [okaforRecord, officeRecord]) {
    const clientId = record.client.client_canon_id;
    assert.ok(!listed.has(clientId), `${clientId} is on the ladder and its record settled every draw`);
    assert.equal(
      count(payments.rows, (r) => r.client_canon_id === clientId && r.settlement_status === "open"), 0,
      `${clientId} carries an open payment row`
    );
  }
});

test("SMB-19: P2 at both cardinalities, one client past due with no promise inside three past the first step (T-C4)", () => {
  // Card 1: the rule as stated. Past the ladder's first step, and carrying no
  // promise to pay.
  const pastFirstStep = aging.rows.filter((r) => Number(r.dunning_stage) >= 2);
  const plant = pastFirstStep.filter((r) => r.promise_to_pay_date === "");
  assert.equal(plant.length, 1, "SMB-19: the count past the first step with no promise on record");
  assert.equal(plant[0].client_canon_id, "co-132", "the client genuinely past due moved");
  assert.equal(plant[0].days_past_due, "18");
  assert.equal(plant[0].dunning_stage, "2");

  // Card 2: drop the one qualifier the rule names, the promise, and sort by
  // days past due alone. Three are past the first step and two of the three
  // already carry a commitment the studio holds.
  assert.equal(pastFirstStep.length, 3, "SMB-19: the count of clients past the ladder's first step");
  assert.equal(count(pastFirstStep, (r) => r.promise_to_pay_date !== ""), 2, "the count a naive sort talks over");

  // The plant is inside the population it is supposed to hide in, and it is
  // also the one client who is both past due and on a payment plan, which is
  // why a plan-keyed suppression rule misses exactly the client who needs the
  // call.
  assert.equal(plant[0].on_payment_plan, "yes", "the plant is not the client a plan-keyed rule would suppress");
});

test("SMB-19: P3 at both cardinalities, one client on a plan within terms inside two on a plan (T-C5)", () => {
  // Card 1: the rule as stated, computed from SMB-18 rather than from this
  // file's own bucket column. The earliest unsettled installment is after the
  // as-of date, so nothing is due.
  const planClients = [...new Set(
    payments.rows.filter((r) => r.payment_plan_id !== "").map((r) => r.client_canon_id)
  )].sort();
  const withinTerms = planClients.filter((client) => {
    const dates = payments.rows
      .filter((r) => r.client_canon_id === client && r.payment_plan_id !== "" && r.settlement_status === "open")
      .map((r) => r.installment_due_date)
      .sort();
    return dates.length > 0 && dates[0] > AS_OF;
  });
  assert.equal(withinTerms.length, 1, "SMB-19: the count of clients on a plan and within terms");
  assert.equal(withinTerms[0], "co-201");

  // Card 2: drop the one qualifier the rule names, "within terms", and key on
  // being on a plan at all. Two clients are, and the other is in arrears on it.
  assert.equal(planClients.length, 2, "SMB-19: the count of clients on a payment plan at all");
  assert.equal(count(aging.rows, (r) => r.on_payment_plan === "yes"), 2, "the ladder disagrees about who is on a plan");
  const inArrears = planClients.filter((client) => !withinTerms.includes(client));
  assert.equal(inArrears.length, 1);
  assert.equal(
    aging.rows.find((r) => r.client_canon_id === inArrears[0]).dunning_stage, "2",
    "the other client on a plan is not in arrears, so a plan-keyed suppression rule costs nothing"
  );

  // The row itself reads current at stage 0, which is what "no premature
  // reminder" means in the bytes.
  const row = aging.rows.find((r) => r.client_canon_id === withinTerms[0]);
  assert.equal(row.days_past_due, "0");
  assert.equal(row.aging_bucket, "current");
  assert.equal(row.dunning_stage, "0");
  assert.ok(row.governing_due_date > AS_OF, "the client within terms has an obligation due at or before the as-of date");
});

test("SMB-19: three buckets are populated and 61-90 and 90+ are empty, asserted by name (T-C6)", () => {
  const buckets = new Set(column(aging, "aging_bucket"));
  assert.deepEqual([...buckets].sort(), ["1-30", "31-60", "current"], "SMB-19: the populated buckets moved");
  for (const empty of ["61-90", "90+"]) {
    assert.equal(count(aging.rows, (r) => r.aging_bucket === empty), 0, `the ${empty} bucket is populated`);
  }
  // And the reason they are empty is a property of the register rather than an
  // omission: the oldest governing date in the file is 32 days before the
  // as-of date, so nothing can reach 61.
  const oldest = column(aging, "governing_due_date").sort()[0];
  assert.ok(daysBetween(oldest, AS_OF) < 61, "a governing date is now more than 60 days past due and its bucket is empty");
});

test("SMB-19: stages 0, 2 and 3 are populated and 1 and 4 are empty, asserted by name (T-C7)", () => {
  const stages = new Set(column(aging, "dunning_stage"));
  assert.equal(stages.size, 3, "SMB-19: the count of populated dunning stages moved");
  assert.deepEqual([...stages].sort(), ["0", "2", "3"], "SMB-19: the populated dunning stages moved");
  for (const empty of ["1", "4"]) {
    assert.equal(count(aging.rows, (r) => r.dunning_stage === empty), 0, `dunning stage ${empty} is populated`);
  }
  // Every stage is its own days_past_due under the ladder written again above,
  // so a stage column edited by hand fails here.
  for (const r of aging.rows) {
    assert.equal(r.dunning_stage, stageFor(Number(r.days_past_due)), `${r.aging_row_id}: the stage is not its own days past due`);
  }
});

test("SMB-19: every promise to pay is dated after the as-of date and is not more than the balance (T-C8)", () => {
  const promised = aging.rows.filter((r) => r.promise_to_pay_date !== "");
  assert.equal(promised.length, 2, "SMB-19: the promise count");
  for (const r of promised) {
    assert.match(r.promise_to_pay_date, ISO_DATE, `${r.aging_row_id} promise_to_pay_date`);
    assert.ok(r.promise_to_pay_date > AS_OF, `${r.aging_row_id} promises to pay ${r.promise_to_pay_date}, already past`);
    assert.ok(!isWeekend(r.promise_to_pay_date), `${r.aging_row_id} promises to pay on a weekend`);
    assert.ok(
      toCents(r.promise_amount_usd) <= toCents(r.open_balance_usd),
      `${r.aging_row_id} promises more than it owes`
    );
  }
  for (const r of aging.rows.filter((r) => r.promise_to_pay_date === "")) {
    assert.equal(r.promise_amount_usd, "", `${r.aging_row_id} carries a promise amount and no promise date`);
  }
});

test("SMB-19: the naive reading over the register's due dates alone is genuinely wrong, in the bytes (T-C9)", () => {
  // The trap, proved present rather than assumed. Age the client on a plan
  // within terms from SMB-17's due_date column alone, which is what a rule
  // that never reads the installment columns does.
  const row = aging.rows.find((r) => r.on_payment_plan === "yes" && r.days_past_due === "0");
  assert.ok(row, "no client on a plan reads as within terms, so there is no trap to spring");

  const dueDateOf = new Map(register.rows.map((r) => [r.invoice_id, r.due_date]));
  const naiveDue = payments.rows
    .filter((r) => r.client_canon_id === row.client_canon_id && r.settlement_status === "open")
    .map((r) => dueDateOf.get(r.invoice_id))
    .sort()[0];
  const naiveDays = Math.max(0, daysBetween(naiveDue, AS_OF));

  assert.equal(naiveDue, "2026-03-08", "the naive governing date moved");
  assert.equal(naiveDays, 23, "the naive reading no longer returns 23 days past due");
  assert.equal(bucketFor(naiveDays), "1-30", "the naive reading no longer lands in the 1-30 bucket");
  assert.equal(stageFor(naiveDays), "2", "the naive reading no longer drafts a call");

  // And the correct reading, which is what the file carries.
  assert.equal(row.days_past_due, "0");
  assert.equal(row.aging_bucket, "current");
  assert.equal(row.dunning_stage, "0");
  assert.ok(
    naiveDays > Number(row.days_past_due),
    "the two readings agree, so the file no longer carries the disagreement the aging exercise is written against"
  );
});

// ------------------------------------------------------------- pack-wide rules

test("SMB-17, SMB-18 and SMB-19 mint only their own namespaced id classes, and carry no dash this pack does not use (rule R-NS)", () => {
  // The five classes the receivables wave mints, plus the one class it cites
  // from cluster 2b. The bare tokens are what the namespace exists for: JOB-,
  // AGE- and PLN- are free repo wide and a bare mint here would be the start
  // of a collision rather than a style slip.
  const TWO_DIGIT = new Set(["JOB-LDB-", "AGE-LDB-", "PLN-LDB-", "MST-LDB-"]);
  const BLOCKED = new Set(["INV-LDB-", "PAY-LDB-"]);
  const files = {
    "SMB-17": fileByPath(emitted("SMB-17"), "invoices-issued.csv").content,
    "SMB-18": fileByPath(emitted("SMB-18"), "payment-status-mock.csv").content,
    "SMB-19": fileByPath(emitted("SMB-19"), "aging-summary.csv").content,
  };

  const seen = new Set();
  for (const [id, text] of Object.entries(files)) {
    for (const match of text.matchAll(/\b([A-Z]{2,4})-LDB-([0-9-]+)\b/g)) {
      const idClass = `${match[1]}-LDB-`;
      if (BLOCKED.has(idClass)) {
        assert.match(
          match[0], /^(INV|PAY)-LDB-2026-[123]\d\d$/,
          `${id} mints "${match[0]}", which is not a 2026 invoice or payment block id`
        );
      } else {
        assert.ok(TWO_DIGIT.has(idClass), `${id} mints "${match[0]}", whose class ${idClass} is not a cluster 3 class`);
        assert.equal(match[2].length, 2, `${id} carries "${match[0]}", and the format is two zero-padded digits`);
      }
      seen.add(idClass);
    }
    for (const idClass of [...TWO_DIGIT, ...BLOCKED]) {
      const bare = idClass.replace("LDB-", "");
      assert.doesNotMatch(text, new RegExp(`\\b${bare}\\d`), `${id} carries an un-namespaced ${bare} id`);
    }
    assert.ok(!text.includes("\u2014"), `${id} carries an em dash (U+2014)`);
    assert.ok(!text.includes("\u2013"), `${id} carries an en dash (U+2013)`);
    // No thousands separator anywhere: a money cell carrying a comma stops
    // parsing as a number for every consumer that reads it.
    assert.doesNotMatch(text, /\d,\d{3}\b/, `${id} carries a thousands-separated figure`);
  }
  for (const idClass of ["JOB-LDB-", "AGE-LDB-", "PLN-LDB-", "INV-LDB-", "PAY-LDB-"]) {
    assert.ok(seen.has(idClass), `no cluster 3 receivables file mints ${idClass}, so this screen checks nothing for it`);
  }
});

test("SMB-17, SMB-18 and SMB-19 name no person, and every money cell is a bare 2dp string (rules R-ROLE and R-CENTS)", () => {
  const MONEY_COLUMNS = {
    "SMB-17": ["invoice_amount_usd"],
    "SMB-18": ["invoice_amount_usd", "installment_amount_usd", "settled_amount_usd"],
    "SMB-19": ["open_balance_usd", "promise_amount_usd"],
  };
  const tables = { "SMB-17": register, "SMB-18": payments, "SMB-19": aging };
  for (const [id, columns] of Object.entries(MONEY_COLUMNS)) {
    for (const r of tables[id].rows) {
      for (const col of columns) {
        if (r[col] === "") continue;
        assert.match(r[col], /^\d+\.\d{2}$/, `${id}: ${col} carries "${r[col]}", which is not a bare 2dp string`);
      }
    }
    // No percentage column and no quotient column anywhere in the wave.
    for (const col of tables[id].cols) {
      assert.doesNotMatch(col, /_pct$|percent|_rate$/, `${id} carries the quotient column "${col}"`);
    }
  }

  // R-ROLE: no column names a person and no cell carries a personal name. The
  // one human-shaped string these files may carry is a household, which is a
  // company in canon rather than a person.
  const forbiddenColumns = ["contact_name", "contact_email", "contact_phone", "employee_id", "owner_name"];
  for (const [id, table] of Object.entries(tables)) {
    for (const forbidden of forbiddenColumns) {
      assert.ok(!table.cols.includes(forbidden), `${id} carries a "${forbidden}" column`);
    }
    for (const r of table.rows) {
      if (r.client_name === undefined) continue;
      assert.ok(
        /^The \S+ household$/.test(r.client_name) || canon.get(r.client_canon_id)?.name === r.client_name,
        `${id} carries the client name "${r.client_name}", which is neither a household nor a canon name`
      );
    }
  }
});

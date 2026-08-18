// FIN-04 ar-aging-export: co-002's accounts-receivable subledger aged at
// 2026-03-31, plus the summary JSON the AR-to-GL tie-out lesson reads.
//
// The customer population is CORE-03's live customer accounts (status customer,
// not a duplicate, not stale), so the aging and the CRM always describe the same
// book of business. Unlike FIN-01, this file includes co-103 Fernwell Retail
// Group: canon assigns its collections story to FIN-04, and FIN-15 and FIN-16
// inherit this file rather than regenerating it.
//
// Every random draw comes from createRng("FIN-04", stream). No Date.now(), no
// Math.random(): the same tag always produces the same bytes.
//
// Planted features (spec FIN-04, plan Section 2.1), each derivable by a rule
// over the data and never by a label:
//   P1. one invoice in the subledger that the GL does not carry. The rule is
//       arithmetic, not a column: subledger total less the FIN-05 receivable
//       control balance equals exactly one row's open_balance. That only
//       resolves to a single row if the amount is unique in the file, so the
//       draw below re-rolls until it is. Do not remove that loop.
//   P2. one customer credit memo that was never applied. The rule is that its
//       applied_to_document is empty while every other memo names an invoice of
//       the same customer.
//
// Tie-outs asserted at the end of the build in integer cents (throw on any
// mismatch): days_past_due and aging_bucket recompute from due_date (T-A3), the
// summary recomputes from the rows (T-A4), and no open balance exceeds its own
// original amount (T-A5). T-A1 and T-A2 need FIN-05 and are asserted there.
import { toCsv } from "../csv.js";
import { addDays, diffDays } from "../dates.js";
import { createRng } from "../seed.js";
import { buildRoster } from "./core-04-people-roster.js";
import { generate as generateCrmSeed } from "./core-03-crm-seed.js";
import { AR_CONTROL_ACCOUNT } from "./fin-22-chart-of-accounts.js";
import { SOD_CONFLICT_ROLE } from "./fin-01-cash-recon.js";

export const id = "FIN-04";

// ---------------------------------------------------------------- constants

/** The aging date. Every bucket in this file is measured against it. */
export const AS_OF = "2026-03-31";
/** The oldest document date the aging reaches back to (the 90+ bucket floor). */
export const OLDEST_DOCUMENT_DATE = "2025-11-14";
const MAX_AGE_DAYS = diffDays(OLDEST_DOCUMENT_DATE, AS_OF); // 137

export const ENTITY = { canon_id: "co-002", name: "Atticus Dundee Inc." };

/** Fixed bucket order. Content pins these strings, so do not reorder them. */
export const BUCKETS = ["current", "1-30", "31-60", "61-90", "90+"];

/** CORE-04 AR Clerks who own these receivables (plan Section 4.2). */
export const AR_OWNER_EMPLOYEE_IDS = ["EMP-0472", "EMP-0479"];

export const AGING_COLUMNS = [
  "customer_canon_id", "customer_name", "document_type", "document_number",
  "document_date", "due_date", "terms", "original_amount", "open_balance",
  "currency", "days_past_due", "aging_bucket", "applied_to_document",
  "ar_owner_employee_id",
];

const TERM_DAYS = { net_15: 15, net_30: 30, net_45: 45, net_60: 60 };
const TERM_NAMES = Object.keys(TERM_DAYS);

/** The healthy enterprise payer and the collections problem, both canon roles. */
const HEALTHY_CUSTOMER_ID = "co-102";
const DISTRESSED_CUSTOMER_ID = "co-103";
/**
 * The subledger-only invoice sits on an Enterprise account, so the cross-pack
 * story holds against FIN-01's receipts, but WHICH Enterprise account is drawn
 * rather than written down. Naming it here would narrow a planted row to one
 * customer's slice of the file from a public source (datagen/README.md,
 * answer-key rule); the rule that actually resolves the plant is the delta
 * against the GL control account, and that needs no id at all.
 */
const UNPOSTED_INVOICE_SEGMENT = "Enterprise";

const BUCKET_WEIGHTS = {
  healthy: ["current", "current", "current", "current", "1-30"],
  distressed: ["31-60", "61-90", "61-90", "90+", "90+"],
  mixed: ["current", "current", "1-30", "1-30", "31-60", "61-90", "90+"],
};

/** Invoice size bands by CRM segment, in integer cents. */
const AMOUNT_BANDS = {
  Enterprise: [800000, 12000000],
  "Mid-Market": [250000, 4500000],
  SMB: [50000, 900000],
};

const TARGET_INVOICES = 144;
const TARGET_CREDIT_MEMOS = 6;

// Reserved document-number blocks. FIN-02 already collected INV-2026-0401
// through INV-2026-0490, and a receipt collected in March cannot still be open
// at 2026-03-31, so the 2026 blocks below deliberately step around 04NN.
const NUMBER_BLOCKS = {
  "2025": { prefix: "INV-2025-", ranges: [[801, 899], [1201, 1299]] },
  "2026-01": { prefix: "INV-2026-", ranges: [[101, 199]] },
  "2026-02": { prefix: "INV-2026-", ranges: [[201, 299], [301, 399]] },
  "2026-03": { prefix: "INV-2026-", ranges: [[501, 599], [601, 699]] },
};

// ------------------------------------------------------------------ helpers

function cents(n) { return (n / 100).toFixed(2); }

function bucketFor(daysPastDue) {
  if (daysPastDue <= 0) return "current";
  if (daysPastDue <= 30) return "1-30";
  if (daysPastDue <= 60) return "31-60";
  if (daysPastDue <= 90) return "61-90";
  return "90+";
}

/** Days past due a bucket admits, before the aging-window floor is applied. */
const BUCKET_RANGE = {
  current: [0, 0],
  "1-30": [1, 30],
  "31-60": [31, 60],
  "61-90": [61, 90],
  "90+": [91, MAX_AGE_DAYS],
};

/**
 * Terms a bucket can carry without pushing the document date before the aging
 * floor: document_date = as_of - days_past_due - term days, and that has to stay
 * on or after OLDEST_DOCUMENT_DATE.
 */
function feasibleTerms(bucket) {
  const [min] = BUCKET_RANGE[bucket];
  return TERM_NAMES.filter((t) => MAX_AGE_DAYS - TERM_DAYS[t] >= min);
}

/**
 * Date a document so that it lands in `bucket`. A current document is simply
 * not yet due, so its due date sits on or after the as-of date; everything else
 * is dated backwards from a drawn days-past-due.
 */
function placeDocument(bucket, terms, rng) {
  const termDays = TERM_DAYS[terms];
  if (bucket === "current") {
    const dueDate = addDays(AS_OF, rng.int(0, termDays));
    return { documentDate: addDays(dueDate, -termDays), dueDate };
  }
  const [min, max] = BUCKET_RANGE[bucket];
  const daysPastDue = rng.int(min, Math.min(max, MAX_AGE_DAYS - termDays));
  const dueDate = addDays(AS_OF, -daysPastDue);
  return { documentDate: addDays(dueDate, -termDays), dueDate };
}

function numberBlockFor(documentDate) {
  if (documentDate < "2026-01-01") return "2025";
  return documentDate.slice(0, 7);
}

/** Hand out document numbers from a block's reserved ranges, in call order. */
function makeNumberAllocator() {
  const cursors = new Map();
  return (documentDate) => {
    const blockKey = numberBlockFor(documentDate);
    const block = NUMBER_BLOCKS[blockKey];
    if (!block) throw new Error(`FIN-04: no document-number block reserved for ${documentDate}`);
    const state = cursors.get(blockKey) ?? { rangeIndex: 0, next: block.ranges[0][0] };
    if (state.next > block.ranges[state.rangeIndex][1]) {
      state.rangeIndex += 1;
      if (state.rangeIndex >= block.ranges.length) {
        throw new Error(`FIN-04: document-number block ${blockKey} is exhausted`);
      }
      state.next = block.ranges[state.rangeIndex][0];
    }
    const number = `${block.prefix}${String(state.next).padStart(4, "0")}`;
    state.next += 1;
    cursors.set(blockKey, state);
    return number;
  };
}

function assertArOwner(row, employeeId) {
  if (!row) throw new Error(`FIN-04: ${employeeId} is not in the CORE-04 roster`);
  if (row.role_title !== "AR Clerk") throw new Error(`FIN-04: ${employeeId} is a ${row.role_title}, expected AR Clerk`);
  if (row.department !== "Finance") throw new Error(`FIN-04: ${employeeId} is not in Finance`);
  if (row.employment_status !== "active") throw new Error(`FIN-04: ${employeeId} is not active`);
  if (row.finance_system_role === SOD_CONFLICT_ROLE) throw new Error(`FIN-04: ${employeeId} is the planted SoD-conflict row`);
}

// ------------------------------------------------------------------ builder

/**
 * Build the AR aging world at 2026-03-31. Pure: no I/O, no Date.now(), every
 * draw from createRng("FIN-04", stream).
 * @returns {{ aging: object[], summary: object, tieOut: object }}
 */
export function buildArAging() {
  const roster = buildRoster(createRng("CORE-04", "roster"));
  for (const employeeId of AR_OWNER_EMPLOYEE_IDS) {
    assertArOwner(roster.find((r) => r.employee_id === employeeId), employeeId);
  }

  const crmFiles = generateCrmSeed({ rng: (stream) => createRng("CORE-03", stream) });
  const crm = JSON.parse(crmFiles.find((f) => f.path === "crm-seed.json").content);
  const customers = crm.accounts.filter(
    (a) => a.status === "customer" && a.duplicate_of_account_id === "" && a.stale_flag === "false"
  );
  if (customers.length < 10 || customers[0].account_id !== HEALTHY_CUSTOMER_ID) {
    throw new Error(`FIN-04: expected ${HEALTHY_CUSTOMER_ID} first among at least 10 CRM customers, got ${customers.length}`);
  }
  if (!customers.some((c) => c.account_id === DISTRESSED_CUSTOMER_ID)) {
    throw new Error(`FIN-04: ${DISTRESSED_CUSTOMER_ID} is not a live CORE-03 customer account`);
  }

  const profileRng = createRng(id, "profiles");
  const documentRng = createRng(id, "documents");
  const amountRng = createRng(id, "amounts");
  const memoRng = createRng(id, "memos");
  const plantRng = createRng(id, "planted");

  // ---- how many invoices each customer carries ---------------------------
  const profiles = new Map();
  const invoiceCounts = new Map();
  for (const customer of customers) {
    const profile = customer.account_id === HEALTHY_CUSTOMER_ID
      ? "healthy"
      : customer.account_id === DISTRESSED_CUSTOMER_ID
        ? "distressed"
        : "mixed";
    profiles.set(customer.account_id, profile);
    invoiceCounts.set(customer.account_id, profileRng.int(6, 9));
  }
  // Settle on exactly TARGET_INVOICES, walking the customer list in order so
  // the adjustment is deterministic and no customer leaves the 6..10 band.
  const totalOf = () => [...invoiceCounts.values()].reduce((s, n) => s + n, 0);
  for (let guard = 0; totalOf() !== TARGET_INVOICES; guard++) {
    if (guard > 1000) throw new Error("FIN-04: could not settle the per-customer invoice counts");
    const short = totalOf() < TARGET_INVOICES;
    const target = customers.find((c) => (short ? invoiceCounts.get(c.account_id) < 9 : invoiceCounts.get(c.account_id) > 6));
    if (!target) throw new Error("FIN-04: per-customer invoice counts cannot reach the target");
    invoiceCounts.set(target.account_id, invoiceCounts.get(target.account_id) + (short ? 1 : -1));
  }

  // ---- invoices -----------------------------------------------------------
  const documents = [];
  for (const [index, customer] of customers.entries()) {
    const profile = profiles.get(customer.account_id);
    const band = AMOUNT_BANDS[customer.segment] ?? AMOUNT_BANDS["Mid-Market"];
    const owner = AR_OWNER_EMPLOYEE_IDS[index % AR_OWNER_EMPLOYEE_IDS.length];
    const count = invoiceCounts.get(customer.account_id);
    for (let i = 0; i < count; i++) {
      const bucket = documentRng.pick(BUCKET_WEIGHTS[profile]);
      const terms = documentRng.pick(feasibleTerms(bucket));
      const { documentDate, dueDate } = placeDocument(bucket, terms, documentRng);
      const originalCents = amountRng.int(band[0], band[1]);
      // Most invoices are open in full; a few carry a part payment.
      const openCents = amountRng.chance(0.15)
        ? Math.max(1, Math.round(originalCents * amountRng.amount(0.3, 0.8, 4)))
        : originalCents;
      documents.push({
        customer, documentType: "invoice", documentDate, dueDate, terms,
        originalCents, openCents, appliedTo: "", owner,
      });
    }
  }

  // The oldest open invoice sets the 90+ floor. Put it on the collections
  // account, where a document that old is in character.
  const floorTerms = "net_30";
  const floorCandidate = documents.find(
    (d) => d.customer.account_id === DISTRESSED_CUSTOMER_ID && d.documentType === "invoice"
  );
  if (!floorCandidate) throw new Error("FIN-04: the collections customer has no invoice to age to the floor");
  floorCandidate.terms = floorTerms;
  floorCandidate.dueDate = addDays(AS_OF, -(MAX_AGE_DAYS - TERM_DAYS[floorTerms]));
  floorCandidate.documentDate = OLDEST_DOCUMENT_DATE;

  // Make sure every terms value is exercised even after the floor override.
  for (const terms of TERM_NAMES) {
    if (documents.some((d) => d.terms === terms)) continue;
    const swap = documents.find(
      (d) => d !== floorCandidate && d.customer.account_id !== DISTRESSED_CUSTOMER_ID
        && MAX_AGE_DAYS - TERM_DAYS[terms] >= BUCKET_RANGE[bucketFor(Math.max(0, diffDays(d.dueDate, AS_OF)))][0]
    );
    if (!swap) throw new Error(`FIN-04: no document could carry terms ${terms}`);
    const bucket = bucketFor(Math.max(0, diffDays(swap.dueDate, AS_OF)));
    swap.terms = terms;
    const placed = placeDocument(bucket, terms, documentRng);
    swap.documentDate = placed.documentDate;
    swap.dueDate = placed.dueDate;
  }

  // ---- credit memos -------------------------------------------------------
  // One per customer at most, so no customer's memos can be confused with each
  // other. The collections account carries the unapplied one (P2).
  const memoCustomers = [
    customers.find((c) => c.account_id === DISTRESSED_CUSTOMER_ID),
    ...memoRng.shuffle(customers.filter((c) => c.account_id !== DISTRESSED_CUSTOMER_ID)).slice(0, TARGET_CREDIT_MEMOS - 1),
  ];
  const memos = [];
  for (const [index, customer] of memoCustomers.entries()) {
    const band = AMOUNT_BANDS[customer.segment] ?? AMOUNT_BANDS["Mid-Market"];
    const bucket = memoRng.pick(["current", "1-30", "31-60"]);
    const terms = memoRng.pick(feasibleTerms(bucket));
    const { documentDate, dueDate } = placeDocument(bucket, terms, memoRng);
    const magnitude = memoRng.int(Math.round(band[0] / 4), Math.round(band[1] / 6));
    const ownerRow = documents.find((d) => d.customer.account_id === customer.account_id);
    memos.push({
      customer, documentType: "credit_memo", documentDate, dueDate, terms,
      originalCents: -magnitude, openCents: -magnitude,
      appliedTo: "", owner: ownerRow.owner,
      unapplied: index === 0, // the collections account's memo
    });
  }
  documents.push(...memos);

  // ---- document numbers ---------------------------------------------------
  // Numbered in date order so the series reads chronologically, then applied
  // to the memos, then sorted for output.
  const numbered = documents
    .map((d, i) => ({ d, i }))
    .sort((a, b) => (a.d.documentDate < b.d.documentDate ? -1
      : a.d.documentDate > b.d.documentDate ? 1
        : a.i - b.i))
    .map(({ d }) => d);
  const allocate = makeNumberAllocator();
  let memoSeq = 1;
  for (const doc of numbered) {
    doc.documentNumber = doc.documentType === "credit_memo"
      ? `CM-2026-${String(memoSeq++).padStart(4, "0")}`
      : allocate(doc.documentDate);
  }

  // ---- P2: apply five of the six memos, leave the collections one open -----
  for (const memo of memos) {
    if (memo.unapplied) continue;
    const target = numbered.find(
      (d) => d.documentType === "invoice" && d.customer.account_id === memo.customer.account_id
    );
    if (!target) throw new Error(`FIN-04: ${memo.customer.account_id} has no invoice for its credit memo to apply against`);
    memo.appliedTo = target.documentNumber;
  }

  // ---- P1: the subledger invoice the GL never posted ----------------------
  // Its amount has to be unique across every open_balance in the file, or the
  // delta rule (subledger total less the GL control balance) resolves to more
  // than one row and the plant stops being derivable.
  const carrierPool = customers.filter(
    (c) => c.segment === UNPOSTED_INVOICE_SEGMENT
      && c.account_id !== HEALTHY_CUSTOMER_ID && c.account_id !== DISTRESSED_CUSTOMER_ID
  );
  if (carrierPool.length === 0) throw new Error("FIN-04: no Enterprise account to carry the unposted invoice");
  const carrier = plantRng.pick(carrierPool);
  const plantRow = [...numbered].reverse().find(
    (d) => d.documentType === "invoice" && d.customer.account_id === carrier.account_id
  );
  if (!plantRow) throw new Error("FIN-04: the chosen carrier account has no invoice to carry the unposted plant");
  const otherOpen = new Set(numbered.filter((d) => d !== plantRow).map((d) => d.openCents));
  let unpostedCents = 0;
  let redraws = 0;
  do {
    unpostedCents = plantRng.int(800000, 12000000);
    redraws += 1;
    if (redraws > 10000) throw new Error("FIN-04: could not draw a unique open balance for the unposted invoice");
  } while (otherOpen.has(unpostedCents));
  plantRow.originalCents = unpostedCents;
  plantRow.openCents = unpostedCents;

  // ---- rows ---------------------------------------------------------------
  const aging = numbered
    .map((d, i) => ({ d, i }))
    .sort((a, b) => {
      if (a.d.customer.account_id !== b.d.customer.account_id) {
        return a.d.customer.account_id < b.d.customer.account_id ? -1 : 1;
      }
      if (a.d.documentDate !== b.d.documentDate) return a.d.documentDate < b.d.documentDate ? -1 : 1;
      if (a.d.documentNumber !== b.d.documentNumber) return a.d.documentNumber < b.d.documentNumber ? -1 : 1;
      return a.i - b.i;
    })
    .map(({ d }) => {
      const daysPastDue = Math.max(0, diffDays(d.dueDate, AS_OF));
      return {
        customer_canon_id: d.customer.account_id,
        customer_name: d.customer.name,
        document_type: d.documentType,
        document_number: d.documentNumber,
        document_date: d.documentDate,
        due_date: d.dueDate,
        terms: d.terms,
        original_amount: cents(d.originalCents),
        open_balance: cents(d.openCents),
        currency: "USD",
        days_past_due: String(daysPastDue),
        aging_bucket: bucketFor(daysPastDue),
        applied_to_document: d.appliedTo,
        ar_owner_employee_id: d.owner,
      };
    });

  // ---- summary ------------------------------------------------------------
  const bucketTotalsCents = new Map(BUCKETS.map((b) => [b, 0]));
  const bucketCounts = new Map(BUCKETS.map((b) => [b, 0]));
  let subledgerTotalCents = 0;
  for (const row of aging) {
    const open = Math.round(Number(row.open_balance) * 100);
    subledgerTotalCents += open;
    bucketTotalsCents.set(row.aging_bucket, bucketTotalsCents.get(row.aging_bucket) + open);
    bucketCounts.set(row.aging_bucket, bucketCounts.get(row.aging_bucket) + 1);
  }

  const summary = {
    generated_from_spec: id,
    entity: ENTITY,
    as_of: AS_OF,
    currency: "USD",
    control_account: { code: AR_CONTROL_ACCOUNT.code, name: AR_CONTROL_ACCOUNT.name },
    customer_count: new Set(aging.map((r) => r.customer_canon_id)).size,
    document_count: aging.length,
    invoice_count: aging.filter((r) => r.document_type === "invoice").length,
    credit_memo_count: aging.filter((r) => r.document_type === "credit_memo").length,
    buckets: BUCKETS.map((bucket) => ({
      bucket,
      document_count: bucketCounts.get(bucket),
      open_balance: cents(bucketTotalsCents.get(bucket)),
    })),
    subledger_total: cents(subledgerTotalCents),
  };

  assertTieOuts({ aging, summary, subledgerTotalCents, bucketTotalsCents, bucketCounts, unpostedCents });

  return {
    aging,
    summary,
    tieOut: {
      subledgerTotalCents,
      unpostedInvoiceCents: unpostedCents,
      bucketTotalsCents: Object.fromEntries(bucketTotalsCents),
      redraws,
    },
  };
}

/** T-A3, T-A4 and T-A5, recomputed in integer cents. Throws on any mismatch. */
function assertTieOuts({ aging, summary, subledgerTotalCents, bucketTotalsCents, bucketCounts, unpostedCents }) {
  for (const row of aging) {
    const expectedDays = Math.max(0, diffDays(row.due_date, AS_OF));
    if (Number(row.days_past_due) !== expectedDays) {
      throw new Error(`FIN-04: ${row.document_number} days_past_due ${row.days_past_due} does not recompute to ${expectedDays}`);
    }
    if (row.aging_bucket !== bucketFor(expectedDays)) {
      throw new Error(`FIN-04: ${row.document_number} bucket ${row.aging_bucket} disagrees with ${expectedDays} days past due`);
    }
    if (row.due_date !== addDays(row.document_date, TERM_DAYS[row.terms])) {
      throw new Error(`FIN-04: ${row.document_number} due_date does not follow its ${row.terms} terms`);
    }
    if (row.document_date < OLDEST_DOCUMENT_DATE || row.document_date > AS_OF) {
      throw new Error(`FIN-04: ${row.document_number} is dated ${row.document_date}, outside the aging window`);
    }
    const original = Math.round(Number(row.original_amount) * 100);
    const open = Math.round(Number(row.open_balance) * 100);
    const positive = row.document_type === "invoice";
    if (positive && (original <= 0 || open <= 0)) throw new Error(`FIN-04: ${row.document_number} is an invoice with a non-positive amount`);
    if (!positive && (original >= 0 || open >= 0)) throw new Error(`FIN-04: ${row.document_number} is a credit memo with a non-negative amount`);
    if (Math.abs(open) > Math.abs(original)) throw new Error(`FIN-04: ${row.document_number} open_balance exceeds original_amount`);
  }

  for (const bucket of BUCKETS) {
    const entry = summary.buckets.find((b) => b.bucket === bucket);
    if (entry.document_count !== bucketCounts.get(bucket)) throw new Error(`FIN-04: summary count for ${bucket} does not tie`);
    if (Math.round(Number(entry.open_balance) * 100) !== bucketTotalsCents.get(bucket)) {
      throw new Error(`FIN-04: summary total for ${bucket} does not tie`);
    }
  }
  if (Math.round(Number(summary.subledger_total) * 100) !== subledgerTotalCents) {
    throw new Error("FIN-04: subledger_total does not tie to the sum of open balances");
  }
  const bucketSum = [...bucketTotalsCents.values()].reduce((s, n) => s + n, 0);
  if (bucketSum !== subledgerTotalCents) throw new Error("FIN-04: bucket totals do not add up to the subledger total");

  const unapplied = aging.filter((r) => r.document_type === "credit_memo" && r.applied_to_document === "");
  if (unapplied.length !== 1) throw new Error(`FIN-04: expected exactly one unapplied credit memo, built ${unapplied.length}`);
  const matches = aging.filter((r) => Math.round(Number(r.open_balance) * 100) === unpostedCents);
  if (matches.length !== 1) throw new Error(`FIN-04: the unposted invoice amount is carried by ${matches.length} rows, not 1`);
}

// ---------------------------------------------------------------- generate

export function generate() {
  const { aging, summary } = buildArAging();
  return [
    { path: "ar-aging-export.csv", content: toCsv(AGING_COLUMNS, aging) },
    { path: "ar-aging-summary.json", content: JSON.stringify(summary, null, 2) + "\n" },
  ];
}

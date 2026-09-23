// The small-business controls builder: SMB-33 owner-decision-authority-matrix
// and SMB-32 data-handling-checklist, built as one unit because they share one
// vocabulary. Never registered as a generator of its own; the thin modules
// smb-33-owner-decision-authority-matrix.js and smb-32-data-handling-checklist.js
// are.
//
// Neither file plants a defect. Both are policies:
//
//   SMB-33  FIN-39's column set re-scaled to a nine-person studio. Sending
//           money, signing a client and committing a date to a client are
//           prohibited to AI at every amount (P10: 3 decisions on 7 rows, and
//           the same 3 carry any prohibited row at all); no restricted row is
//           autonomous or review_before_commit (P11: 0, against 12 rows at
//           those two levels).
//
//   SMB-32  the rule set the guardrails validator runs every outgoing message
//           against: FIN-14's shape (a generator emits commented yaml) with
//           REV-11's content (outcomes, rules with ids), plus required and
//           permitted client fields per purpose and the AI-assistance
//           disclosure line.
//
// What the two files share, and why they are built here together: the four
// data classes are ONE constant below, so SMB-32's data_classes and SMB-33's
// classes cannot drift apart.
//
// Frozen bytes are read at build time, never retyped (cluster-4.md section 0,
// fact 0.13):
//
//   the middle band's minimum IS SMB-22's change_order_materiality_usd, read
//   from buildJobProgress and held against a loud-throw pin;
//
//   the top band's minimum IS the first round thousand strictly above the
//   largest deposit SMB-17 has invoiced (the first invoice on each job), read
//   from buildInvoiceRegister and held against a loud-throw pin;
//
//   no money cell anywhere in SMB-17 to SMB-22 may sit on a band edge, except
//   the six SMB-22 materiality cells, which are the agreement rather than a
//   collision. The builder sweeps all six files and throws otherwise.
//
// Money is integer cents in code and a 2dp string on disk (rule R-CENTS).
import { FIELD_DICTIONARY } from "./smb-02-client-record-template.js";
import {
  PAYMENT_COLUMNS, buildAgingSummary, buildInvoiceRegister, buildPaymentLog,
} from "./smb-c3-receivables.js";
import { buildJobExpenses, buildJobProgress, buildTimeEntries } from "./smb-c3-job-costing.js";

const BUILDER = "smb-c4-controls";

// ------------------------------------------------------------ shared vocabulary

/**
 * The four data classes, in order, each with the one-line meaning SMB-32
 * prints. SMB-33 uses the same four and first uses them in this order.
 */
export const DATA_CLASSES = [
  { data_class: "public", meaning: "What the studio publishes or would publish, such as its service descriptions." },
  { data_class: "internal", meaning: "The studio's own working records, kept inside the studio." },
  {
    data_class: "client-confidential",
    meaning: "A client's own record, shared only with that client, or with a trade working on their job, and only as far as a purpose permits.",
  },
  {
    data_class: "restricted",
    meaning: "Payment instrument details, home and alarm access arrangements, financing terms and crew pay data, which never leave the studio's own tools.",
  },
];
export const DATA_CLASS_NAMES = DATA_CLASSES.map((c) => c.data_class);

/** The studio's roles, most junior first. Escalation is strictly more senior than approval. */
export const ROLE_SENIORITY = ["lead carpenter", "project lead", "owner"];
export const seniority = (role) => {
  const rank = ROLE_SENIORITY.indexOf(role);
  if (rank < 0) throw new Error(`${BUILDER}: "${role}" is not a studio role`);
  return rank;
};

/** The four autonomy levels, least strict first. */
export const AUTONOMY_LEVELS = ["autonomous", "review_before_commit", "approval_before_action", "prohibited"];
const strictness = (level) => {
  const rank = AUTONOMY_LEVELS.indexOf(level);
  if (rank < 0) throw new Error(`${BUILDER}: "${level}" is not an autonomy level`);
  return rank;
};

// ------------------------------------------------------------------ money

const usd = (cents) => {
  if (!Number.isInteger(cents)) throw new Error(`${BUILDER}: ${cents} is not integer cents`);
  return (cents / 100).toFixed(2);
};
const toCents = (value) => {
  const m = /^(-?)(\d+)\.(\d{2})$/.exec(value);
  if (!m) throw new Error(`${BUILDER}: "${value}" is not a 2dp money string`);
  const c = Number(m[2]) * 100 + Number(m[3]);
  return m[1] === "-" ? -c : c;
};

/** The two steps, as the frozen bytes must still yield them. The pins, not the source. */
export const CHANGE_ORDER_STEP_PIN = "5000.00";
export const DEPOSIT_STEP_PIN = "30000.00";

/** One round thousand, in cents. */
const THOUSAND_CENTS = 100000;

/**
 * The three amount bands in integer cents, derived from the shipped C3 bytes:
 * [0, materiality - 1c], [materiality, deposit step - 1c], [deposit step, open).
 */
export function buildBands(canon) {
  const progress = buildJobProgress({ canon });
  const materiality = [...new Set(progress.map((r) => r.change_order_materiality_usd))];
  if (materiality.length !== 1) {
    throw new Error(`${BUILDER}: SMB-22 carries ${materiality.length} materiality thresholds, expected one`);
  }
  if (materiality[0] !== CHANGE_ORDER_STEP_PIN) {
    throw new Error(
      `${BUILDER}: SMB-22's change_order_materiality_usd now reads ${materiality[0]} and the change-order step is `
      + `pinned to ${CHANGE_ORDER_STEP_PIN}. The matrix and the job progress file cannot both be right.`
    );
  }
  const changeOrderStep = toCents(materiality[0]);

  const deposits = firstInvoicePerJob(canon);
  const largest = Math.max(...deposits.map((r) => toCents(r.invoice_amount_usd)));
  const depositStep = (Math.floor(largest / THOUSAND_CENTS) + 1) * THOUSAND_CENTS;
  if (usd(depositStep) !== DEPOSIT_STEP_PIN) {
    throw new Error(
      `${BUILDER}: the first round thousand above SMB-17's largest deposit is now ${usd(depositStep)} and the `
      + `deposit step is pinned to ${DEPOSIT_STEP_PIN}.`
    );
  }
  if (changeOrderStep >= depositStep) throw new Error(`${BUILDER}: the change-order step is not below the deposit step`);

  return [
    { min: 0, max: changeOrderStep - 1 },
    { min: changeOrderStep, max: depositStep - 1 },
    { min: depositStep, max: null },
  ];
}

/** The first invoice on each job in SMB-17: every deposit the pack has issued. */
function firstInvoicePerJob(canon) {
  const first = new Map();
  for (const r of buildInvoiceRegister({ canon })) {
    const held = first.get(r.job_id);
    if (!held || r.invoice_date < held.invoice_date) first.set(r.job_id, r);
  }
  return [...first.values()];
}

// ------------------------------------------------------------------ SMB-33

export const MATRIX_COLUMNS = [
  "control_id", "decision", "data_class", "amount_min_usd", "amount_max_usd",
  "ai_autonomy_level", "approver_role", "escalation_role", "evidence_required",
  "sends_money_signs_client_or_commits_date",
];

export const MATRIX_TARGET_ROWS = 27;

/** The census of cluster-4.md section 2.6, in one place. */
export const MATRIX_CENSUS = {
  rows: MATRIX_TARGET_ROWS,
  data_class: { public: 2, internal: 9, "client-confidential": 10, restricted: 6 },
  ai_autonomy_level: { autonomous: 3, review_before_commit: 9, approval_before_action: 8, prohibited: 7 },
  approver_role: { "lead carpenter": 3, "project lead": 24 },
  escalation_role: { "project lead": 3, owner: 24 },
  banded: 15,
  unbanded: 12,
  hard_yes: 7,
  hard_decisions: 3,
  loose_rows: 12,
};

const LC = "lead carpenter";
const PL = "project lead";
const OWNER = "owner";

// Band keys: null is unbanded; 0, 1, 2 index the band ladder.
// [decision, data_class, band, autonomy, approver, escalation, evidence, hard]
const DECISIONS = [
  ["Draft a reply to a general enquiry from the studio's published service information", "public", null,
    "review_before_commit", PL, OWNER,
    "the published service pages the reply draws on, and the project lead's read before it goes out", "no"],
  ["Summarize a product data sheet or a published installation guide for the crew", "public", null,
    "autonomous", LC, PL,
    "a link to the published sheet or guide the summary cites", "no"],
  ["Flag a delivery task that is past its planned end", "internal", null,
    "autonomous", PL, OWNER,
    "the task row and the planned end date the flag was raised from", "no"],
  ["Sort an inbound inquiry as in scope, out of scope or needing a question", "internal", null,
    "autonomous", PL, OWNER,
    "the inquiry row and the scope rule the sort applied", "no"],
  ["Draft the weekly owner report from the invoice register and the payment log", "internal", null,
    "review_before_commit", PL, OWNER,
    "the invoice and payment rows every figure is read from, checked by the project lead before the owner sees it", "no"],
  ["Draft a client update that restates dates already committed", "client-confidential", null,
    "review_before_commit", PL, OWNER,
    "the schedule each restated date is read from, and the project lead's read before sending", "no"],
  ["Draft a payment reminder from the aging summary", "client-confidential", null,
    "review_before_commit", PL, OWNER,
    "the aging row and the open installment rows the reminder states, and the project lead's read before sending", "no"],
  ["Draft a feedback request or a referral message for a completed project", "client-confidential", null,
    "review_before_commit", PL, OWNER,
    "the project log row showing no open support issue, and the project lead's read before sending", "no"],
  ["Propose a job code for an uncoded expense", "internal", 0,
    "review_before_commit", LC, PL,
    "the expense row, the proposed job code and the rule behind it", "no"],
  ["Propose a job code for an uncoded expense", "internal", 1,
    "review_before_commit", PL, OWNER,
    "the expense row, the proposed job code and the rule behind it", "no"],
  ["Propose a job code for an uncoded expense", "internal", 2,
    "approval_before_action", PL, OWNER,
    "the expense row, the proposed job code, the rule behind it and the project lead's approval before the code is applied", "no"],
  ["Approve a materials or subcontract purchase for a job", "internal", 0,
    "review_before_commit", LC, PL,
    "the quote and the job's cost build up", "no"],
  ["Approve a materials or subcontract purchase for a job", "internal", 1,
    "approval_before_action", PL, OWNER,
    "the quote, the job's cost build up and the project lead's approval before the order is placed", "no"],
  ["Approve a materials or subcontract purchase for a job", "internal", 2,
    "approval_before_action", PL, OWNER,
    "a second quote, the job's cost build up and the project lead's approval before the order is placed", "no"],
  ["Price a change order to put to the client", "client-confidential", 0,
    "review_before_commit", PL, OWNER,
    "the cost build up behind the price", "no"],
  ["Price a change order to put to the client", "client-confidential", 1,
    "approval_before_action", PL, OWNER,
    "the cost build up behind the price and the project lead's approval before it goes to the client", "no"],
  ["Price a change order to put to the client", "client-confidential", 2,
    "approval_before_action", PL, OWNER,
    "the cost build up behind the price and the project lead's approval before it goes to the client", "no"],
  ["Send a payment to a supplier, a subcontractor or a crew member", "restricted", 0,
    "prohibited", PL, OWNER,
    "the approved bill, and a person releases the payment", "yes"],
  ["Send a payment to a supplier, a subcontractor or a crew member", "restricted", 1,
    "prohibited", PL, OWNER,
    "the approved bill, and a person releases the payment", "yes"],
  ["Send a payment to a supplier, a subcontractor or a crew member", "restricted", 2,
    "prohibited", PL, OWNER,
    "the approved bill, and a person releases the payment", "yes"],
  ["Sign a contract or a change order with a client", "client-confidential", 0,
    "prohibited", PL, OWNER,
    "the signed document, signed by a person", "yes"],
  ["Sign a contract or a change order with a client", "client-confidential", 1,
    "prohibited", PL, OWNER,
    "the signed document, signed by a person", "yes"],
  ["Sign a contract or a change order with a client", "client-confidential", 2,
    "prohibited", PL, OWNER,
    "the signed document, signed by a person", "yes"],
  ["Commit a start, completion or handover date to a client", "client-confidential", null,
    "prohibited", PL, OWNER,
    "the schedule the date is read from, and a person commits the date", "yes"],
  ["Give a trade or a crew member the access arrangement for a client's home", "restricted", null,
    "approval_before_action", PL, OWNER,
    "the project lead's approval, and the arrangement is given in person or by phone and never written into a message", "no"],
  ["Look up a client's financing terms to answer a payment question", "restricted", null,
    "approval_before_action", PL, OWNER,
    "the project lead's approval before the restricted file is opened, and an answer that does not restate the terms", "no"],
  ["Prepare crew pay figures from the timecards", "restricted", null,
    "approval_before_action", PL, OWNER,
    "the timecard rows each figure is read from, and the project lead's approval before any figure leaves the studio's own tools", "no"],
];

const tally = (rows, key) => {
  const out = {};
  for (const r of rows) out[r[key]] = (out[r[key]] ?? 0) + 1;
  return out;
};
const sameTally = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

/**
 * SMB-33's rows, keyed by MATRIX_COLUMNS, with every census and every property
 * of cluster-4.md section 2.6 asserted before they are returned.
 */
export function buildDecisionMatrix({ canon }) {
  const bands = buildBands(canon);
  const rows = DECISIONS.map(([decision, dataClass, band, autonomy, approver, escalation, evidence, hard], i) => ({
    control_id: `DA-LDB-${String(i + 1).padStart(2, "0")}`,
    decision,
    data_class: dataClass,
    amount_min_usd: band === null ? "" : usd(bands[band].min),
    amount_max_usd: band === null || bands[band].max === null ? "" : usd(bands[band].max),
    ai_autonomy_level: autonomy,
    approver_role: approver,
    escalation_role: escalation,
    evidence_required: evidence,
    sends_money_signs_client_or_commits_date: hard,
  }));
  assertMatrix(rows, bands, canon);
  return rows;
}

function assertMatrix(rows, bands, canon) {
  const where = "SMB-33";
  if (rows.length !== MATRIX_CENSUS.rows) throw new Error(`${where}: ${rows.length} rows, expected ${MATRIX_CENSUS.rows}`);
  for (const key of ["data_class", "ai_autonomy_level", "approver_role", "escalation_role"]) {
    if (!sameTally(tally(rows, key), MATRIX_CENSUS[key])) {
      throw new Error(`${where}: the ${key} census is ${JSON.stringify(tally(rows, key))}`);
    }
  }
  const banded = rows.filter((r) => r.amount_min_usd !== "");
  if (banded.length !== MATRIX_CENSUS.banded) throw new Error(`${where}: ${banded.length} banded rows`);
  if (rows.length - banded.length !== MATRIX_CENSUS.unbanded) throw new Error(`${where}: unbanded census`);

  // Class order: first use of each class follows DATA_CLASSES, so the matrix and
  // SMB-32 read the classes in the same order.
  const order = [...new Set(rows.map((r) => r.data_class))];
  if (order.join("|") !== DATA_CLASS_NAMES.join("|")) {
    throw new Error(`${where}: the classes first appear as ${order.join(", ")}, not in DATA_CLASSES order`);
  }

  for (const r of rows) {
    const at = `${where}: ${r.control_id}`;
    if (!DATA_CLASS_NAMES.includes(r.data_class)) throw new Error(`${at} data_class "${r.data_class}"`);
    strictness(r.ai_autonomy_level);
    if (seniority(r.escalation_role) <= seniority(r.approver_role)) {
      throw new Error(`${at} escalates to a role no more senior than its approver`);
    }
    if (r.approver_role === OWNER) throw new Error(`${at} seats the owner as an approver`);
    if (!["yes", "no"].includes(r.sends_money_signs_client_or_commits_date)) throw new Error(`${at} hard column`);
    if ((r.sends_money_signs_client_or_commits_date === "yes") !== (r.ai_autonomy_level === "prohibited")) {
      throw new Error(`${at}: the hard-control column and the prohibited level disagree`);
    }
    if (r.data_class === "restricted" && strictness(r.ai_autonomy_level) < strictness("approval_before_action")) {
      throw new Error(`${at} lets restricted data run ahead of approval`);
    }
    for (const col of ["decision", "evidence_required"]) {
      if (/\d/.test(r[col])) throw new Error(`${at} ${col} carries a digit`);
      const caps = r[col].split(/[^A-Za-z']+/).filter(Boolean).slice(1).filter((w) => /^[A-Z]/.test(w) && w !== "AI");
      if (caps.length > 0) throw new Error(`${at} ${col} capitalizes ${caps.join(", ")}`);
    }
  }

  // P10 at both readings.
  const groups = new Map();
  for (const r of rows) groups.set(r.decision, [...(groups.get(r.decision) ?? []), r]);
  const every = [...groups].filter(([, rs]) => rs.every((r) => r.ai_autonomy_level === "prohibited")).map(([d]) => d);
  const any = [...groups].filter(([, rs]) => rs.some((r) => r.ai_autonomy_level === "prohibited")).map(([d]) => d);
  if (every.length !== MATRIX_CENSUS.hard_decisions) throw new Error(`${where}: P10 reads ${every.length} under the rule`);
  if (any.join("|") !== every.join("|")) throw new Error(`${where}: P10 reads ${any.length} with the qualifier dropped`);
  const hardRows = rows.filter((r) => r.sends_money_signs_client_or_commits_date === "yes");
  if (hardRows.length !== MATRIX_CENSUS.hard_yes) throw new Error(`${where}: ${hardRows.length} hard rows`);
  for (const d of every) {
    const rs = groups.get(d);
    const unbanded = rs.length === 1 && rs[0].amount_min_usd === "";
    if (!unbanded && rs.length !== bands.length) throw new Error(`${where}: "${d}" does not cover every amount`);
  }

  // P11 at both readings.
  const loose = rows.filter((r) => strictness(r.ai_autonomy_level) < strictness("approval_before_action"));
  if (loose.length !== MATRIX_CENSUS.loose_rows) throw new Error(`${where}: P11 reads ${loose.length} with the qualifier dropped`);
  if (loose.some((r) => r.data_class === "restricted")) throw new Error(`${where}: P11 reads above zero`);

  // Band discipline within each banded decision.
  for (const [d, rs] of groups) {
    if (rs[0].amount_min_usd === "") {
      if (rs.length !== 1 || rs[0].amount_max_usd !== "") throw new Error(`${where}: "${d}" mixes banded and unbanded rows`);
      continue;
    }
    if (rs.length !== bands.length) throw new Error(`${where}: "${d}" sits on ${rs.length} bands`);
    rs.forEach((r, k) => {
      if (toCents(r.amount_min_usd) !== bands[k].min) throw new Error(`${where}: ${r.control_id} band minimum`);
      if (k > 0) {
        if (seniority(r.approver_role) < seniority(rs[k - 1].approver_role)) {
          throw new Error(`${where}: "${d}" approves a larger band at a more junior role`);
        }
        if (strictness(r.ai_autonomy_level) < strictness(rs[k - 1].ai_autonomy_level)) {
          throw new Error(`${where}: "${d}" loosens AI autonomy as the band rises`);
        }
      }
    });
  }
  bands.forEach((b, k) => {
    if (k === 0 && b.min !== 0) throw new Error(`${where}: the first band does not start at zero`);
    if (k > 0 && b.min !== bands[k - 1].max + 1) throw new Error(`${where}: band ${k + 1} is not contiguous`);
  });
  if (bands[bands.length - 1].max !== null) throw new Error(`${where}: the top band is not open ended`);

  assertStepsAgainstShippedMoney(bands, canon);
}

/**
 * The top step clears every deposit and sits below neither renovation middle
 * draw, and no SMB-17 to SMB-22 money cell sits on a band edge except the six
 * SMB-22 materiality cells.
 */
function assertStepsAgainstShippedMoney(bands, canon) {
  const where = "SMB-33";
  const top = bands[bands.length - 1].min;
  for (const r of firstInvoicePerJob(canon)) {
    if (toCents(r.invoice_amount_usd) >= top) throw new Error(`${where}: ${r.job_id}'s deposit sits in the top band`);
  }
  const register = buildInvoiceRegister({ canon });
  const renovation = register.filter((r) => r.client_canon_id === "co-131").sort((a, b) => (a.invoice_date < b.invoice_date ? -1 : 1));
  for (const r of renovation.slice(1, 3)) {
    if (toCents(r.invoice_amount_usd) < top) throw new Error(`${where}: the ${r.invoice_id} draw sits below the top band`);
  }

  const edges = new Set();
  for (const b of bands) {
    if (b.min !== 0) edges.add(b.min);
    if (b.max !== null) edges.add(b.max);
  }
  const files = {
    "SMB-17": register,
    "SMB-18": buildPaymentLog({ canon }),
    "SMB-19": buildAgingSummary({ canon }),
    "SMB-20": buildTimeEntries({ canon }),
    "SMB-21": buildJobExpenses({ canon }),
    "SMB-22": buildJobProgress({ canon }),
  };
  const onEdge = [];
  for (const [fileId, rows] of Object.entries(files)) {
    for (const r of rows) {
      for (const [col, value] of Object.entries(r)) {
        if (!col.endsWith("_usd") || value === "") continue;
        if (edges.has(toCents(value))) onEdge.push(`${fileId}.${col}`);
      }
    }
  }
  const agreement = onEdge.filter((c) => c === "SMB-22.change_order_materiality_usd");
  if (agreement.length !== onEdge.length || agreement.length !== files["SMB-22"].length) {
    throw new Error(`${where}: shipped money cells sit on a band edge: ${onEdge.join(", ")}`);
  }
}

// ------------------------------------------------------------------ SMB-32

export const POLICY_KEYS = [
  "generated_from_spec", "policy_version", "as_of", "scope", "sends_messages", "outcomes",
  "data_classes", "field_sources", "purposes", "ai_assistance", "never_in_an_outgoing_message", "rules",
];

export const DISCLOSURE_TEXT = "Drafted with AI assistance and reviewed by a person at the studio before sending.";

/** The three SMB-18 columns a payment plan adds to SMB-02's vocabulary. */
export const PLAN_COLUMNS = ["payment_plan_id", "installment_due_date", "installment_amount_usd"];

export const POLICY = {
  generated_from_spec: "SMB-32",
  policy_version: "1.0",
  as_of: "2026-03-23",
  scope: "The studio's own policy for every outgoing message the owner or the project lead drafts, checked before the owner releases it.",
  sends_messages: false,
  outcomes: [
    { outcome: "approved", meaning: "Held for the owner to release as written." },
    { outcome: "blocked_pending_edit", meaning: "Held until the edit the rule names is made, then checked again." },
    { outcome: "blocked", meaning: "Held, and may not go out in any form." },
  ],
  data_classes: DATA_CLASSES,
  field_sources: {
    client_record_fields: {
      file: "datasets/smb/client-record-template/client-record-fields.csv",
      column: "field_name",
    },
    payment_plan_columns: {
      file: "datasets/smb/payment-status-mock/payment-status-mock.csv",
      columns: PLAN_COLUMNS,
    },
  },
  purposes: [
    { purpose: "general_enquiry_reply", data_class: "public", required: [], permitted: [] },
    { purpose: "visit_confirmation", data_class: "client-confidential", required: ["client_name"], permitted: ["project_name", "property_address"] },
    {
      purpose: "payment_reminder", data_class: "client-confidential",
      required: ["client_name", "invoice_id"],
      permitted: ["invoice_amount_usd", "due_date", "payment_plan_id", "installment_due_date", "installment_amount_usd"],
    },
    {
      purpose: "invoice_cover", data_class: "client-confidential",
      required: ["client_name", "invoice_id", "invoice_amount_usd", "due_date", "payment_terms"],
      permitted: ["project_name"],
    },
    {
      purpose: "payment_receipt", data_class: "client-confidential",
      required: ["client_name", "invoice_id", "settled_amount_usd", "settlement_date"],
      permitted: ["project_name"],
    },
    { purpose: "trade_visit_request", data_class: "client-confidential", required: ["property_address"], permitted: ["project_name", "client_name"] },
  ],
  ai_assistance: { disclosure_required_when: "drafted_with_ai", disclosure_text: DISCLOSURE_TEXT },
  never_in_an_outgoing_message: [
    "home access codes", "alarm codes", "financing terms", "payment instrument details", "crew pay data",
  ],
  rules: [
    { rule_id: "DHR-LDB-01", checks: "The message names a purpose this file carries.", outcome: "blocked_pending_edit" },
    { rule_id: "DHR-LDB-02", checks: "Every required field of the message's purpose is carried.", outcome: "blocked_pending_edit" },
    {
      rule_id: "DHR-LDB-03",
      checks: "Every client field the message carries is required or permitted for its purpose; the edit names each field outside those lists.",
      outcome: "blocked_pending_edit",
    },
    {
      rule_id: "DHR-LDB-04",
      checks: "A message drafted with AI assistance ends with the disclosure text above, byte for byte, and a message drafted without it carries none.",
      outcome: "blocked_pending_edit",
    },
    {
      rule_id: "DHR-LDB-05",
      checks: "The message carries nothing from never_in_an_outgoing_message and its data class is not restricted.",
      outcome: "blocked",
    },
    { rule_id: "DHR-LDB-06", checks: "The message passed every rule above.", outcome: "approved" },
  ],
};

/** The forbidden fields no purpose may list: a contract sum or a deposit percentage. */
const NEVER_LISTED = ["contract_value_usd", "deposit_pct"];

/**
 * SMB-32's policy object with every property of cluster-4.md section 2.5
 * asserted: the key list, the outcomes, the classes, the field resolution and
 * the rules.
 */
export function buildDataHandlingPolicy() {
  const p = POLICY;
  const where = "SMB-32";
  if (Object.keys(p).join("|") !== POLICY_KEYS.join("|")) throw new Error(`${where}: the top-level keys have moved`);
  if (p.sends_messages !== false) throw new Error(`${where}: sends_messages is not false`);
  const outcomes = p.outcomes.map((o) => o.outcome);
  if (outcomes.join("|") !== "approved|blocked_pending_edit|blocked") throw new Error(`${where}: outcomes ${outcomes}`);
  if (p.data_classes.map((c) => c.data_class).join("|") !== DATA_CLASS_NAMES.join("|")) {
    throw new Error(`${where}: data_classes are not the shared four`);
  }

  const dictionary = new Set(FIELD_DICTIONARY.map((f) => f.field_name));
  for (const c of PLAN_COLUMNS) {
    if (!PAYMENT_COLUMNS.includes(c)) throw new Error(`${where}: ${c} is not an SMB-18 column`);
    if (dictionary.has(c)) throw new Error(`${where}: ${c} is already an SMB-02 field`);
  }
  if (p.purposes.length !== 6) throw new Error(`${where}: ${p.purposes.length} purposes`);
  for (const purpose of p.purposes) {
    const at = `${where}: ${purpose.purpose}`;
    if (!DATA_CLASS_NAMES.includes(purpose.data_class) || purpose.data_class === "restricted") {
      throw new Error(`${at} data_class ${purpose.data_class}`);
    }
    for (const f of [...purpose.required, ...purpose.permitted]) {
      if (!dictionary.has(f) && !PLAN_COLUMNS.includes(f)) throw new Error(`${at} lists ${f}, which resolves nowhere`);
      if (NEVER_LISTED.includes(f)) throw new Error(`${at} lists ${f}`);
    }
    if (purpose.required.some((f) => purpose.permitted.includes(f))) throw new Error(`${at}: required and permitted overlap`);
  }

  if (p.rules.map((r) => r.rule_id).join("|") !== [1, 2, 3, 4, 5, 6].map((n) => `DHR-LDB-0${n}`).join("|")) {
    throw new Error(`${where}: the rule ids are not DHR-LDB-01 to -06`);
  }
  for (const r of p.rules) if (!outcomes.includes(r.outcome)) throw new Error(`${where}: ${r.rule_id} outcome ${r.outcome}`);
  if (p.rules.filter((r) => r.outcome === "blocked").length !== 1) throw new Error(`${where}: not exactly one blocking rule`);
  if (p.rules.filter((r) => r.outcome === "approved").length !== 1) throw new Error(`${where}: not exactly one approving rule`);
  if (p.ai_assistance.disclosure_text !== DISCLOSURE_TEXT) throw new Error(`${where}: the disclosure text has moved`);
  return p;
}

const q = (s) => JSON.stringify(s);
const list = (items) => `[${items.join(", ")}]`;

/** The commented yaml, FIN-14's style. Every string scalar is double quoted. */
export function renderPolicyYaml(p) {
  const lines = [
    "# SMB-32 data-handling-checklist: the studio's own policy for outgoing messages,",
    "# as configuration the guardrails validator runs every drafted message against",
    "# before the owner releases it. Generated, not hand maintained, by the SMB-32",
    "# generator. It names no statute and no regulator: it is the studio's policy.",
    `generated_from_spec: ${p.generated_from_spec}`,
    `policy_version: ${q(p.policy_version)}`,
    `as_of: ${q(p.as_of)}`,
    `scope: ${q(p.scope)}`,
    "",
    "# The validator holds drafts; it never sends one.",
    `sends_messages: ${p.sends_messages}`,
    "",
    "# Every outcome leaves the draft held for the owner.",
    "outcomes:",
  ];
  for (const o of p.outcomes) lines.push(`  - outcome: ${o.outcome}`, `    meaning: ${q(o.meaning)}`);
  lines.push(
    "",
    "# The same four classes, in the same order, as the owner decision authority matrix.",
    "data_classes:"
  );
  for (const c of p.data_classes) lines.push(`  - data_class: ${c.data_class}`, `    meaning: ${q(c.meaning)}`);
  lines.push(
    "",
    "# Where every field name below resolves: the client record field dictionary,",
    "# and the three payment plan columns of the mock payment log.",
    "field_sources:",
    "  client_record_fields:",
    `    file: ${p.field_sources.client_record_fields.file}`,
    `    column: ${p.field_sources.client_record_fields.column}`,
    "  payment_plan_columns:",
    `    file: ${p.field_sources.payment_plan_columns.file}`,
    `    columns: ${list(p.field_sources.payment_plan_columns.columns)}`,
    "",
    "# One entry per kind of outgoing message. A message carries every required",
    "# field of its purpose and may carry a permitted one; anything else is held",
    "# for an edit. No purpose lists a contract sum or a deposit percentage.",
    "purposes:"
  );
  for (const purpose of p.purposes) {
    lines.push(
      `  - purpose: ${purpose.purpose}`,
      `    data_class: ${purpose.data_class}`,
      `    required: ${list(purpose.required)}`,
      `    permitted: ${list(purpose.permitted)}`
    );
  }
  lines.push(
    "",
    "# The one home of the disclosure line.",
    "ai_assistance:",
    `  disclosure_required_when: ${p.ai_assistance.disclosure_required_when}`,
    `  disclosure_text: ${q(p.ai_assistance.disclosure_text)}`,
    "",
    "# The restricted class. None of it is ever written into an outgoing message.",
    "never_in_an_outgoing_message:",
    ...p.never_in_an_outgoing_message.map((c) => `  - ${c}`),
    "",
    "# Evaluated in order; the strictest outcome that fires wins.",
    "rules:"
  );
  for (const r of p.rules) {
    lines.push(`  - rule_id: ${r.rule_id}`, `    checks: ${q(r.checks)}`, `    outcome: ${r.outcome}`);
  }
  lines.push("");
  return lines.join("\n");
}

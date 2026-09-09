// SMB-02, SMB-04 and SMB-05: the schema contract and the two records that
// satisfy it. Every check recomputes the answer from the shipped bytes the way
// a consumer would: read the field dictionary, then hold each record against
// it. Nothing here imports a builder's predicate and nothing names the stage
// that disagrees, the amount that is stale or any row id the data plan has not
// already pinned as a design constant.
//
// The mutation this file exists to catch is a record that gains a field the
// dictionary does not define, or loses one it does, which is how a schema
// contract rots without a single test going red. That is why T-A2 and T-A3 are
// stated as set equalities and computed in BOTH directions.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));

const emitted = (id) => generateArtifact(specs.byId.get(id), canon);

const smb02Files = emitted("SMB-02");
const template = csvTable(fileByPath(smb02Files, "client-record-template.csv").content);
const dictionary = csvTable(fileByPath(smb02Files, "client-record-fields.csv").content);
const okafor = JSON.parse(fileByPath(emitted("SMB-04"), "client-record-okafor.json").content);
const office = JSON.parse(
  fileByPath(emitted("SMB-05"), "client-record-co002-office-refresh.json").content
);
const queue = csvTable(fileByPath(emitted("SMB-03"), "inbound-inquiry-queue.csv").content);

const toCents = (amount) => Math.round(Number(amount) * 100);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** One section of the dictionary, ordered by its own field_order column. */
function section(name) {
  return dictionary.rows
    .filter((row) => row.record_section === name)
    .sort((a, b) => Number(a.field_order) - Number(b.field_order));
}
const clientFields = section("client");
const stageFields = section("stage_event");
const paymentFields = section("payment");

/**
 * The type check, reimplemented here from the dictionary's own data_type and
 * allowed_values columns rather than imported, so this file can disagree with
 * the builder about what a declared type means.
 */
function fits(field, value) {
  if (typeof value !== "string") return false;
  if (value === "") return field.required === "no";
  switch (field.data_type) {
    case "string": return true;
    case "enum": return field.allowed_values.split("|").includes(value);
    case "date": return ISO_DATE.test(value);
    case "integer": return /^(0|[1-9]\d*)$/.test(value);
    case "money_usd": return /^\d+\.\d{2}$/.test(value);
    case "percent": return /^(0|[1-9]\d*)$/.test(value) && Number(value) <= 100;
    default: return false;
  }
}

/** T-A2 and T-A3: a set equality, asserted in both directions, plus the types. */
function assertSectionEquality(where, fields, object) {
  const declared = fields.map((f) => f.field_name);
  const carried = Object.keys(object);
  assert.deepEqual(
    declared.filter((name) => !carried.includes(name)), [],
    `${where} is missing fields the dictionary declares`
  );
  assert.deepEqual(
    carried.filter((name) => !declared.includes(name)), [],
    `${where} carries fields the dictionary does not declare`
  );
  assert.deepEqual(carried, declared, `${where} does not carry its keys in field_order`);
  for (const field of fields) {
    assert.ok(
      fits(field, object[field.field_name]),
      `${where}.${field.field_name} = ${JSON.stringify(object[field.field_name])} does not fit ${field.data_type}`
    );
  }
}

// --------------------------------------------------------------------- SMB-02

test("SMB-02: both headers match the spec, and the template is a header and nothing else (T-A1, T-A5)", () => {
  const spec = specs.byId.get("SMB-02");
  assert.deepEqual(template.cols, spec.files["client-record-template.csv"]);
  assert.deepEqual(dictionary.cols, spec.files["client-record-fields.csv"]);
  assert.equal(template.rows.length, 0, "the blank template ships a data row");
  assert.deepEqual(
    clientFields.map((f) => f.field_name), template.cols,
    "the client section in field_order is not the template header, in order"
  );
});

test("SMB-02: 45 rows over three sections, field_order gapless and field_name unique inside each (T-A4)", () => {
  assert.equal(dictionary.rows.length, 45);
  assert.equal(clientFields.length, 21);
  assert.equal(stageFields.length, 12);
  assert.equal(paymentFields.length, 12);
  assert.deepEqual(
    [...new Set(dictionary.rows.map((r) => r.record_section))].sort(),
    ["client", "payment", "stage_event"]
  );
  for (const [name, fields] of [["client", clientFields], ["stage_event", stageFields], ["payment", paymentFields]]) {
    assert.deepEqual(
      fields.map((f) => f.field_order),
      fields.map((f, i) => String(i + 1)),
      `${name} field_order is not 1 upward with no gap`
    );
    assert.equal(new Set(fields.map((f) => f.field_name)).size, fields.length, `${name} repeats a field_name`);
  }
});

test("SMB-02: allowed_values is a pipe list on every enum row and empty on every other row", () => {
  const types = new Set(dictionary.rows.map((r) => r.data_type));
  for (const type of types) {
    assert.ok(
      ["string", "enum", "date", "integer", "money_usd", "percent"].includes(type),
      `unknown data_type "${type}"`
    );
  }
  for (const row of dictionary.rows) {
    assert.ok(["yes", "no"].includes(row.required), `${row.field_name} required = ${row.required}`);
    assert.notEqual(row.example_value, "", `${row.field_name} ships no example`);
    assert.notEqual(row.description, "", `${row.field_name} ships no description`);
    if (row.data_type === "enum") {
      assert.notEqual(row.allowed_values, "", `${row.field_name} is an enum with no allowed_values`);
      assert.ok(
        row.allowed_values.split("|").includes(row.example_value),
        `${row.field_name}'s example is not one of its own allowed_values`
      );
    } else {
      assert.equal(row.allowed_values, "", `${row.field_name} is not an enum yet publishes allowed_values`);
    }
  }
});

test("SMB-02: no section declares a field that names a person (T-A6, rule R-ROLE)", () => {
  const declared = new Set(dictionary.rows.map((r) => r.field_name));
  for (const forbidden of ["contact_name", "contact_email", "contact_phone", "employee_id"]) {
    assert.ok(!declared.has(forbidden), `the dictionary declares ${forbidden}`);
  }
  assert.ok(declared.has("contact_role"), "a human has to appear somehow, and the shape is a role");
  assert.ok(declared.has("record_owner_role"));
});

// ------------------------------------------------------------ the two records

const RECORDS = [
  {
    label: "SMB-04",
    record: okafor,
    file: "client-record-okafor.json",
    canonId: "co-131",
    contractCents: 14850000,
    invoiceCents: [2970000, 4455000, 4455000, 2970000],
    termDays: 7,
    windowStart: "2026-01-12",
    disagreements: 1,
    pending: 2,
  },
  {
    label: "SMB-05",
    record: office,
    file: "client-record-co002-office-refresh.json",
    canonId: "co-002",
    contractCents: 4620000,
    invoiceCents: [924000, 1386000, 1386000, 924000],
    termDays: 15,
    windowStart: "2026-01-06",
    disagreements: 0,
    pending: 0,
  },
];

const AS_OF = "2026-03-31";
const DRAW_PCT = [20, 30, 30, 20];

for (const fixture of RECORDS) {
  const { label, record } = fixture;
  const stages = record.stages;
  const payments = record.payment_log;
  const issuing = stages.filter((s) => s.invoice_id !== "");
  const stageByInvoice = new Map(issuing.map((s) => [s.invoice_id, s]));

  test(`${label}: the documented key list, in order, and record_schema names SMB-02`, () => {
    assert.deepEqual(
      Object.keys(record),
      ["generated_from_spec", "record_schema", "studio", "client", "stages", "payment_log"]
    );
    assert.equal(record.generated_from_spec, label);
    assert.equal(record.record_schema, "SMB-02");
    assert.deepEqual(Object.keys(record.studio), ["canon_id", "name"]);
    assert.equal(record.studio.canon_id, "co-100");
    assert.equal(record.studio.name, canon.get("co-100").name);
  });

  test(`${label}: the three set equalities against the SMB-02 dictionary, both directions (T-A2, T-A3)`, () => {
    assertSectionEquality(`${label}.client`, clientFields, record.client);
    assert.equal(stages.length, 14);
    assert.equal(payments.length, 4);
    for (const stage of stages) assertSectionEquality(`${label}.stages[${stage.stage_id}]`, stageFields, stage);
    for (const p of payments) assertSectionEquality(`${label}.payment_log[${p.payment_id}]`, paymentFields, p);
  });

  test(`${label}: the client is the canon entity, named byte equal to canon/companies.md (T-D5)`, () => {
    assert.equal(record.client.client_canon_id, fixture.canonId);
    assert.equal(record.client.client_name, canon.get(fixture.canonId).name);
    assert.equal(record.client.as_of_date, AS_OF);
  });

  test(`${label}: sequence runs 1 to 14 with no gap, dates never go backwards (T-C7, T-C8)`, () => {
    assert.deepEqual(stages.map((s) => s.sequence), stages.map((s, i) => String(i + 1)));
    assert.equal(new Set(stages.map((s) => s.stage_id)).size, 14);
    assert.equal(new Set(stages.map((s) => s.stage)).size, 14);
    for (let i = 1; i < stages.length; i++) {
      assert.ok(
        stages[i].event_date >= stages[i - 1].event_date,
        `${stages[i].stage_id} is dated before the stage that precedes it`
      );
    }
  });

  test(`${label} planted P4: the chain is connected, at 0 orphans under the rule and 0 with the qualifier dropped`, () => {
    const known = new Set(stages.map((s) => s.stage_id));
    const dangling = stages.filter((s) => s.previous_stage_id !== "" && !known.has(s.previous_stage_id));
    const rootless = stages.filter((s, i) => i > 0 && s.previous_stage_id === "");
    assert.equal(dangling.length, 0, "a stage names a predecessor that does not exist");
    assert.equal(rootless.length, 0, "a stage other than the first has no predecessor");
    assert.equal(dangling.length + rootless.length, 0, "the qualifier-free reading finds an orphan");
    assert.equal(stages[0].previous_stage_id, "", "the first stage names a predecessor");
    for (let i = 1; i < stages.length; i++) {
      assert.equal(stages[i].previous_stage_id, stages[i - 1].stage_id);
    }
  });

  test(`${label} planted P5: ${fixture.disagreements} stage disagrees with the payment log, ${fixture.pending} are not complete`, () => {
    const disagreeing = stages.filter((stage) => (
      stage.status !== "complete"
      && payments.some((p) => (
        p.settlement_status === "settled"
        && Number(stageByInvoice.get(p.invoice_id).sequence) > Number(stage.sequence)
      ))
    ));
    assert.equal(
      disagreeing.length, fixture.disagreements,
      "the count of stages that are not complete AND have a settled payment issued later"
    );
    const notComplete = stages.filter((s) => s.status !== "complete");
    assert.equal(
      notComplete.length, fixture.pending,
      "the count with the settled-payment qualifier dropped, which is what stops `pending` from locating the plant"
    );
    // Every other stage agrees under the stated rule.
    const agreeing = stages.filter((stage) => (
      stage.status === "complete"
      || !payments.some((p) => (
        p.settlement_status === "settled"
        && Number(stageByInvoice.get(p.invoice_id).sequence) > Number(stage.sequence)
      ))
    ));
    assert.equal(agreeing.length, stages.length - fixture.disagreements);
    for (const key of Object.keys(stages[0])) {
      assert.ok(
        !["is_conflicted", "conflict_note", "expected_status"].includes(key),
        `stages carry "${key}", which would be an answer key`
      );
    }
  });

  test(`${label}: the money ties in cents (T-C1 to T-C6)`, () => {
    const settled = payments.filter((p) => p.settlement_status === "settled");
    const settledSum = settled.reduce((sum, p) => sum + toCents(p.settled_amount_usd), 0);
    const settledInvoices = new Set(settled.map((p) => p.invoice_id));
    const stageSum = issuing
      .filter((s) => settledInvoices.has(s.invoice_id))
      .reduce((sum, s) => sum + toCents(s.amount_usd), 0);
    assert.equal(settledSum, stageSum, "T-C1: settled amounts against settled stage invoices");
    assert.equal(settledSum, fixture.contractCents);

    const invoicedSum = payments.reduce((sum, p) => sum + toCents(p.invoice_amount_usd), 0);
    assert.equal(invoicedSum, toCents(record.client.contract_value_usd), "T-C2");
    assert.equal(invoicedSum, fixture.contractCents);

    for (const p of payments) {
      assert.equal(toCents(p.settled_amount_usd), toCents(p.invoice_amount_usd), `T-C3: ${p.payment_id} settled in part`);
    }
    const deposit = Math.round((Number(record.client.deposit_pct) / 100) * fixture.contractCents);
    assert.equal(deposit, toCents(payments[0].invoice_amount_usd), "T-C4");

    assert.equal(issuing.length, 4, "T-C5: four stages issue an invoice");
    for (const stage of issuing) {
      const matches = payments.filter((p) => p.invoice_id === stage.invoice_id);
      assert.equal(matches.length, 1, `${stage.invoice_id} has ${matches.length} payment rows`);
      assert.equal(toCents(matches[0].invoice_amount_usd), toCents(stage.amount_usd));
      assert.equal(matches[0].stage_id, stage.stage_id);
    }
    const issued = new Set(issuing.map((s) => s.invoice_id));
    for (const p of payments) assert.ok(issued.has(p.invoice_id), `${p.payment_id} cites an unissued invoice`);

    assert.deepEqual(payments.map((p) => toCents(p.invoice_amount_usd)), fixture.invoiceCents, "T-C6");
    assert.equal(DRAW_PCT.reduce((a, b) => a + b, 0), 100);
    for (const [i, pct] of DRAW_PCT.entries()) {
      assert.equal(fixture.invoiceCents[i], Math.round((fixture.contractCents * pct) / 100));
    }
  });

  test(`${label}: the calendar ties out (T-C10, T-C11)`, () => {
    assert.equal(record.client.payment_terms, `net_${fixture.termDays}`);
    for (const p of payments) {
      const stage = stageByInvoice.get(p.invoice_id);
      assert.equal(p.invoice_date, stage.event_date, `${p.invoice_id} is dated away from its issuing stage`);
      const due = new Date(`${p.invoice_date}T00:00:00Z`);
      due.setUTCDate(due.getUTCDate() + fixture.termDays);
      assert.equal(p.due_date, due.toISOString().slice(0, 10), `${p.invoice_id} due date`);
      assert.ok(p.settlement_date >= p.invoice_date, `${p.payment_id} settled before issue`);
      assert.ok(p.settlement_date <= p.due_date, `${p.payment_id} settled late`);
      assert.ok(p.settlement_date <= AS_OF, `${p.payment_id} settled after the as-of date`);
    }
    // Every date the record states as a fact sits in the record's own window. A
    // due date is a consequence of the terms and is checked above instead: the
    // final net_15 invoice on the co-002 record falls due after the as-of date.
    const factDates = [
      record.client.inquiry_date, record.client.opened_date, record.client.as_of_date,
      ...stages.map((s) => s.event_date),
      ...payments.map((p) => p.invoice_date),
      ...payments.map((p) => p.settlement_date),
    ];
    for (const date of factDates) {
      assert.match(date, ISO_DATE);
      assert.ok(date >= fixture.windowStart && date <= AS_OF, `${date} sits outside the record's window`);
    }
  });

  test(`${label}: payments are pure mock records and no instrument is named (T-C12, rule R-MOCK)`, () => {
    const notice = dictionary.rows.find((r) => r.record_section === "payment" && r.field_name === "mock_notice");
    for (const p of payments) {
      assert.equal(p.record_type, "mock");
      assert.equal(p.mock_notice, "MOCK PAYMENT RECORD, NO FUNDS MOVED");
      assert.ok(notice.description.includes(p.mock_notice), "the dictionary and the record state different notices");
      assert.ok(["mock_bank_transfer", "mock_check"].includes(p.method), `${p.payment_id} method`);
    }
    const forbidden = [
      "stripe", "paypal", "adyen", "braintree", "worldpay", "authorize", "plaid", "square",
      "visa", "mastercard", "amex", "discover", "maestro",
      "ach", "wire", "swift", "iban", "sepa", "bacs", "zelle", "venmo",
      "gateway", "processor", "merchant", "acquirer", "routing", "cvv",
      "card", "cardholder", "last4", "authorization", "auth",
    ];
    const words = JSON.stringify(record).toLowerCase().split(/[^a-z0-9]+/);
    for (const word of words) {
      assert.ok(!forbidden.includes(word), `the record names "${word}", which is a payment instrument`);
    }
  });

  test(`${label}: no cell names a person (rule R-ROLE)`, () => {
    for (const key of Object.keys(record.client)) {
      assert.ok(
        !["contact_name", "contact_email", "contact_phone", "employee_id"].includes(key),
        `the client object carries ${key}`
      );
    }
    assert.ok(["homeowner", "co_owner", "office_manager", "property_manager"].includes(record.client.contact_role));
    assert.ok(["owner", "project lead"].includes(record.client.record_owner_role));
    assert.ok(!/@/.test(JSON.stringify(record)), "the record carries an email address");
  });
}

// -------------------------------------------------- the two records together

test("SMB-05 is structurally identical to SMB-04 and shares no id or date with it (T-D1, T-D6)", () => {
  assert.deepEqual(
    office.stages.map((s) => `${s.sequence}:${s.stage_class}`),
    okafor.stages.map((s) => `${s.sequence}:${s.stage_class}`)
  );
  assert.deepEqual(
    office.stages.map((s) => Object.keys(s)),
    okafor.stages.map((s) => Object.keys(s))
  );
  assert.deepEqual(
    office.payment_log.map((p) => Object.keys(p)),
    okafor.payment_log.map((p) => Object.keys(p))
  );
  const shared = (a, b) => a.filter((value) => b.includes(value));
  assert.deepEqual(shared(office.stages.map((s) => s.stage_id), okafor.stages.map((s) => s.stage_id)), []);
  assert.deepEqual(
    shared(office.payment_log.map((p) => p.payment_id), okafor.payment_log.map((p) => p.payment_id)), []
  );
  assert.deepEqual(
    shared(office.payment_log.map((p) => p.invoice_id), okafor.payment_log.map((p) => p.invoice_id)), []
  );
  assert.deepEqual(shared(office.stages.map((s) => s.event_date), okafor.stages.map((s) => s.event_date)), []);
});

test("SMB-05 is narratively different: a business on longer terms at a different price (T-D2, T-D3)", () => {
  assert.equal(okafor.client.client_type, "household");
  assert.equal(office.client.client_type, "business");
  assert.notEqual(okafor.client.payment_terms, office.client.payment_terms);
  assert.notEqual(okafor.client.contract_value_usd, office.client.contract_value_usd);
  assert.notEqual(okafor.client.project_type, office.client.project_type);
  assert.equal(office.stages.filter((s) => s.status !== "complete").length, 0);
});

test("SMB-04's chain opens on the SMB-03 queue row it cites (T-C9)", () => {
  const canonRows = queue.rows.filter((r) => r.client_canon_id === "co-131");
  assert.equal(canonRows.length, 1, "SMB-03 does not carry exactly one co-131 row");
  const inquiry = canonRows[0];
  const first = okafor.stages[0];
  assert.equal(first.source_artifact, "SMB-03");
  assert.equal(first.source_row_id, inquiry.inquiry_id);
  assert.equal(first.event_date, inquiry.received_date);
  assert.equal(okafor.client.inquiry_id, inquiry.inquiry_id);
  assert.equal(okafor.client.inquiry_date, inquiry.received_date);
  assert.equal(okafor.client.property_address, inquiry.property_address);
  for (const stage of okafor.stages.slice(1)) {
    assert.equal(stage.source_artifact, "SMB-04");
    assert.equal(stage.source_row_id, stage.stage_id);
  }
});

test("SMB-05 did not come through the queue, so its first stage cites itself", () => {
  assert.equal(office.client.inquiry_id, "");
  assert.equal(office.stages[0].source_artifact, "SMB-05");
  assert.equal(office.stages[0].source_row_id, office.stages[0].stage_id);
  assert.ok(
    office.client.inquiry_date < specs.byId.get("SMB-03").period.start,
    "the co-002 job was raised inside the SMB-03 window, so the queue should carry it"
  );
});

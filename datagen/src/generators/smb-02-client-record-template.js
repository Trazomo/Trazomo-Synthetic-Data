// SMB-02 client-record-template: the small-business client record's schema,
// for smb-client-workspace-setup, smb-google-workspace and smb-microsoft-365.
//
// SMB-02 has no defects by design. Its whole job is to be the contract SMB-04
// and SMB-05 satisfy, so a defect here would make the contract unfalsifiable.
//
// Two files ship together. `client-record-template.csv` is the blank record a
// learner copies into a spreadsheet: the 21-name client header and zero data
// rows. `client-record-fields.csv` is the typed field dictionary, 45 rows, one
// per field of the three record sections (21 client, 12 stage_event, 12
// payment), and it is where every vocabulary in the small-business pack is
// defined. A second copy of `stage_class` or `settlement_status` anywhere else
// in the pack is a defect, which is why SMB-03, SMB-04 and SMB-05 all import
// their vocabularies from this module.
//
// The contract is three set equalities, asserted in BOTH directions so that a
// record which quietly drops a field fails as loudly as one that invents a
// field the dictionary never declared:
//   T-A1 the client-section field names, in field_order, equal the template
//        header exactly and in order.
//   T-A2 SMB-04's and SMB-05's `client` key set equals that same 21-name set.
//   T-A3 every `stages` object carries exactly the 12 stage_event names and
//        every `payment_log` object exactly the 12 payment names.
//
// Rule R-ROLE is asserted here rather than remembered: no section declares a
// contact_name, contact_email, contact_phone or employee_id field, because
// canon/people.md seats nobody at co-100 or at co-131 to co-135. A human
// appears as contact_role and record_owner_role and in no other shape.
import { toCsv } from "../csv.js";

export const id = "SMB-02";

// ---------------------------------------------------------------- constants

export const TEMPLATE_FILE = "client-record-template.csv";
export const FIELD_DICTIONARY_FILE = "client-record-fields.csv";

export const FIELD_DICTIONARY_COLUMNS = [
  "field_name", "record_section", "field_order", "data_type", "required",
  "allowed_values", "example_value", "description",
];

export const RECORD_SECTIONS = ["client", "stage_event", "payment"];
export const DATA_TYPES = ["string", "enum", "date", "integer", "money_usd", "percent"];

/** Rule R-MOCK, stated once for the whole small-business pack. */
export const MOCK_NOTICE = "MOCK PAYMENT RECORD, NO FUNDS MOVED";
export const MOCK_RECORD_TYPE = "mock";

/** Field names no section may declare, rule R-ROLE. */
export const FORBIDDEN_FIELD_NAMES = ["contact_name", "contact_email", "contact_phone", "employee_id"];

// The published vocabularies. Defined here and nowhere else in the SMB pack.
export const CLIENT_TYPES = ["household", "business"];
export const CONTACT_ROLES = ["homeowner", "co_owner", "office_manager", "property_manager"];
export const SERVICE_AREAS = ["in_area", "out_of_area"];
export const SOURCE_CHANNELS = ["web_form", "phone", "email", "referral"];
export const PROJECT_TYPES = ["residential", "commercial"];
export const PAYMENT_TERMS = ["net_7", "net_15", "net_30"];
export const RECORD_OWNER_ROLES = ["owner", "project lead"];
export const RECORD_STATUSES = ["active", "closeout", "closed"];
export const STAGE_CLASSES = ["intake", "sales", "contract", "delivery", "billing", "closeout"];
export const STAGE_STATUSES = ["complete", "pending"];
export const SETTLEMENT_STATUSES = ["settled", "open"];
export const PAYMENT_METHODS = ["mock_bank_transfer", "mock_check"];
export const RECORD_TYPES = [MOCK_RECORD_TYPE];

/** Calendar days each payment_terms value allows, so no consumer parses the slug. */
export const TERM_DAYS = { net_7: 7, net_15: 15, net_30: 30 };

// ------------------------------------------------------------------ helpers

/** Integer cents to the 2dp string every money cell on disk carries. */
export function cents(n) {
  if (!Number.isInteger(n)) throw new Error(`${id}: cents() expects integer cents, got ${JSON.stringify(n)}`);
  return (n / 100).toFixed(2);
}

/** A 2dp money string back to integer cents. */
export function toCents(amount) {
  return Math.round(Number(amount) * 100);
}

// -------------------------------------------------------------- field sets
// One entry per field, in field_order. `example_value` is the per-field example
// U3 keeps out of the template: an example row in the template would be a sixth
// client in the universe with no canon id and no record behind it.

const CLIENT_FIELD_DEFS = [
  ["client_id", "string", "yes", null, "CLI-2026-0101",
    "Studio side identifier for this client record, unique across the studio's records."],
  ["client_canon_id", "string", "no", null, "co-131",
    "The canon company id for this client where the universe seats one, and empty for a prospect it does not seat."],
  ["client_name", "string", "yes", null, "The Okafor household",
    "The household or company name, byte equal to canon/companies.md wherever a canon id is present."],
  ["client_type", "enum", "yes", CLIENT_TYPES, "household",
    "Whether the client is a household or a business."],
  ["contact_role", "enum", "yes", CONTACT_ROLES, "homeowner",
    "The role of the person the studio deals with. A role, never a name."],
  ["property_address", "string", "yes", null, "18 Thornhollow Lane",
    "Street address of the property the work is done at."],
  ["service_area", "enum", "yes", SERVICE_AREAS, "in_area",
    "Whether the property sits inside the studio's service area."],
  ["source_channel", "enum", "yes", SOURCE_CHANNELS, "web_form",
    "How the client first reached the studio."],
  ["inquiry_id", "string", "no", null, "INQ-2026-001",
    "The inbound queue id this record opened from, and empty when the job never entered the queue."],
  ["inquiry_date", "date", "yes", null, "2026-01-12",
    "The date the studio first heard from this client."],
  ["project_name", "string", "yes", null, "Okafor kitchen and primary bath renovation",
    "Short name for the job, carried on every internal reference to it."],
  ["project_type", "enum", "yes", PROJECT_TYPES, "residential",
    "Whether the work is residential or commercial. Independent of client_type: a household can commission commercial work."],
  ["scope_summary", "string", "yes", null, "Full kitchen replacement and primary bath renovation",
    "One line describing what the studio is contracted to do."],
  ["contract_value_usd", "money_usd", "yes", null, "148500.00",
    "Signed contract value in US dollars, to the cent."],
  ["currency", "string", "yes", null, "USD",
    "The currency code every amount in the record is stated in."],
  ["payment_terms", "enum", "yes", PAYMENT_TERMS, "net_7",
    "Net terms on every invoice this record issues, counted in calendar days."],
  ["deposit_pct", "percent", "yes", null, "20",
    "Deposit percentage of the contract value, invoiced when the contract is signed."],
  ["record_owner_role", "enum", "yes", RECORD_OWNER_ROLES, "owner",
    "The studio side role that owns this record. A role, never a name."],
  ["record_status", "enum", "yes", RECORD_STATUSES, "closeout",
    "Where the record sits in its own life: active, in closeout, or closed."],
  ["opened_date", "date", "yes", null, "2026-01-12",
    "The date the record was opened in the studio's system."],
  ["as_of_date", "date", "yes", null, "2026-03-31",
    "The date the record is accurate as of. Every status in the record reads as of this date."],
];

const STAGE_EVENT_FIELD_DEFS = [
  ["stage_id", "string", "yes", null, "STG-2026-0106",
    "Identifier for this stage event, unique inside the record and across records."],
  ["sequence", "integer", "yes", null, "6",
    "Position of this stage in the chain, running 1 upward with no gap and equal to array order."],
  ["stage", "string", "yes", null, "deposit_invoiced",
    "Machine name of the stage, unique inside the record."],
  ["stage_class", "enum", "yes", STAGE_CLASSES, "billing",
    "The phase of the job this stage belongs to."],
  ["stage_label", "string", "yes", null, "Deposit invoiced",
    "Readable name for the stage, for a screen that shows the chain."],
  ["event_date", "date", "yes", null, "2026-02-09",
    "The date the stage happened. Non decreasing along sequence."],
  ["status", "enum", "yes", STAGE_STATUSES, "complete",
    "Whether the stage is complete or still pending at the record's as_of_date."],
  ["previous_stage_id", "string", "no", null, "STG-2026-0105",
    "The stage_id of the preceding stage, empty on the first stage only, which is what makes the chain one connected record."],
  ["invoice_id", "string", "no", null, "INV-LDB-2026-101",
    "The invoice this stage issues, and empty on a stage that issues none."],
  ["amount_usd", "money_usd", "no", null, "29700.00",
    "The amount the invoice this stage issues carries, to the cent, and empty where the stage issues none."],
  ["source_artifact", "string", "yes", null, "SMB-04",
    "The artifact this stage's facts are taken from."],
  ["source_row_id", "string", "yes", null, "STG-2026-0106",
    "The row of source_artifact this stage's facts are taken from."],
];

const PAYMENT_FIELD_DEFS = [
  ["payment_id", "string", "yes", null, "PAY-LDB-2026-101",
    "Identifier for this payment log entry, unique inside the record and across records."],
  ["invoice_id", "string", "yes", null, "INV-LDB-2026-101",
    "The invoice this entry settles, matching the invoice_id exactly one stage issues."],
  ["stage_id", "string", "yes", null, "STG-2026-0106",
    "The stage that issued the invoice."],
  ["invoice_date", "date", "yes", null, "2026-02-09",
    "The date the invoice was issued, equal to the issuing stage's event_date."],
  ["invoice_amount_usd", "money_usd", "yes", null, "29700.00",
    "The invoiced amount in US dollars, to the cent."],
  ["due_date", "date", "yes", null, "2026-02-16",
    "The date the invoice falls due, equal to invoice_date plus the payment_terms window in calendar days."],
  ["settlement_date", "date", "no", null, "2026-02-13",
    "The date the payment settled, and empty while the invoice is still open."],
  ["settled_amount_usd", "money_usd", "no", null, "29700.00",
    "The amount that settled, to the cent, and empty while the invoice is still open."],
  ["settlement_status", "enum", "yes", SETTLEMENT_STATUSES, "settled",
    "Whether the invoice has settled or is still open."],
  ["method", "enum", "yes", PAYMENT_METHODS, "mock_bank_transfer",
    "The mock settlement method. No processor, gateway, card network or bank product is named anywhere in the pack."],
  ["record_type", "enum", "yes", RECORD_TYPES, MOCK_RECORD_TYPE,
    "Always mock. Every payment in the small-business pack is a mock record and no funds move."],
  ["mock_notice", "string", "yes", null, MOCK_NOTICE,
    `The fixed notice every payment row carries byte identical: ${MOCK_NOTICE}.`],
];

function toFields(section, defs) {
  return defs.map(([name, dataType, required, allowed, example, description], i) => ({
    field_name: name,
    record_section: section,
    field_order: i + 1,
    data_type: dataType,
    required,
    allowed_values: allowed ? allowed.join("|") : "",
    example_value: example,
    description,
  }));
}

export const CLIENT_FIELDS = toFields("client", CLIENT_FIELD_DEFS);
export const STAGE_EVENT_FIELDS = toFields("stage_event", STAGE_EVENT_FIELD_DEFS);
export const PAYMENT_FIELDS = toFields("payment", PAYMENT_FIELD_DEFS);

/** The whole dictionary, client then stage_event then payment, file order. */
export const FIELD_DICTIONARY = [...CLIENT_FIELDS, ...STAGE_EVENT_FIELDS, ...PAYMENT_FIELDS];

/** The three key sets, derived from the dictionary rather than typed twice. */
export const CLIENT_COLUMNS = CLIENT_FIELDS.map((f) => f.field_name);
export const STAGE_EVENT_KEYS = STAGE_EVENT_FIELDS.map((f) => f.field_name);
export const PAYMENT_KEYS = PAYMENT_FIELDS.map((f) => f.field_name);

export const FIELD_DICTIONARY_ROWS = FIELD_DICTIONARY.length;

// ----------------------------------------------------------------- schema

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONEY = /^\d+\.\d{2}$/;
const INTEGER = /^(0|[1-9]\d*)$/;

/** Does one cell satisfy the field's declared data_type and allowed_values? */
export function valueFitsField(field, value) {
  if (typeof value !== "string") return false;
  if (value === "") return field.required === "no";
  switch (field.data_type) {
    case "string": return true;
    case "enum": return field.allowed_values.split("|").includes(value);
    case "date": return ISO_DATE.test(value);
    case "integer": return INTEGER.test(value);
    case "money_usd": return MONEY.test(value);
    case "percent": return INTEGER.test(value) && Number(value) >= 0 && Number(value) <= 100;
    default: return false;
  }
}

/**
 * The three set equalities, checked in both directions on one object. Used by
 * the SMB-04 and SMB-05 builders before they emit; the public tests recompute
 * the same equalities from the emitted dictionary bytes instead of calling here.
 */
export function assertSection(where, fields, object) {
  const declared = fields.map((f) => f.field_name);
  const carried = Object.keys(object);
  const missing = declared.filter((name) => !carried.includes(name));
  const extra = carried.filter((name) => !declared.includes(name));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `${where}: key set disagrees with the SMB-02 dictionary. `
      + `missing [${missing.join(", ")}], extra [${extra.join(", ")}]`
    );
  }
  if (carried.join(",") !== declared.join(",")) {
    throw new Error(`${where}: keys are not in field_order (got ${carried.join(", ")})`);
  }
  for (const field of fields) {
    if (!valueFitsField(field, object[field.field_name])) {
      throw new Error(
        `${where}.${field.field_name} carries ${JSON.stringify(object[field.field_name])}, `
        + `which does not fit data_type ${field.data_type}`
        + (field.data_type === "enum" ? ` (${field.allowed_values})` : "")
      );
    }
  }
}

// ----------------------------------------------------------------- builders

export function buildFieldDictionary() {
  const rows = FIELD_DICTIONARY.map((f) => ({
    field_name: f.field_name,
    record_section: f.record_section,
    field_order: String(f.field_order),
    data_type: f.data_type,
    required: f.required,
    allowed_values: f.allowed_values,
    example_value: f.example_value,
    description: f.description,
  }));
  assertDictionary(rows);
  return rows;
}

function assertDictionary(rows) {
  if (rows.length !== FIELD_DICTIONARY_ROWS || rows.length !== 45) {
    throw new Error(`${id}: the dictionary is ${rows.length} rows, expected 45`);
  }
  const expected = { client: 21, stage_event: 12, payment: 12 };
  for (const section of RECORD_SECTIONS) {
    const inSection = rows.filter((r) => r.record_section === section);
    if (inSection.length !== expected[section]) {
      throw new Error(`${id}: section ${section} holds ${inSection.length} fields, expected ${expected[section]}`);
    }
    // T-A4: field_order runs 1 upward with no gap, and field_name is unique.
    const orders = inSection.map((r) => Number(r.field_order));
    for (const [i, order] of orders.entries()) {
      if (order !== i + 1) throw new Error(`${id}: ${section} field_order jumps at ${order}`);
    }
    if (new Set(inSection.map((r) => r.field_name)).size !== inSection.length) {
      throw new Error(`${id}: a field_name repeats inside section ${section}`);
    }
  }
  for (const row of rows) {
    if (!RECORD_SECTIONS.includes(row.record_section)) {
      throw new Error(`${id}: ${row.field_name} sits in unknown section "${row.record_section}"`);
    }
    if (!DATA_TYPES.includes(row.data_type)) {
      throw new Error(`${id}: ${row.field_name} declares unknown data_type "${row.data_type}"`);
    }
    if (row.required !== "yes" && row.required !== "no") {
      throw new Error(`${id}: ${row.field_name} declares required "${row.required}"`);
    }
    const isEnum = row.data_type === "enum";
    if (isEnum && row.allowed_values === "") {
      throw new Error(`${id}: enum field ${row.field_name} publishes no allowed_values`);
    }
    if (!isEnum && row.allowed_values !== "") {
      throw new Error(`${id}: non-enum field ${row.field_name} publishes allowed_values`);
    }
    if (isEnum && !row.allowed_values.split("|").includes(row.example_value)) {
      throw new Error(`${id}: ${row.field_name}'s example is not one of its own allowed_values`);
    }
    if (row.example_value === "" || row.description === "") {
      throw new Error(`${id}: ${row.field_name} ships without an example or a description`);
    }
    // R-ROLE, asserted rather than remembered.
    if (FORBIDDEN_FIELD_NAMES.includes(row.field_name)) {
      throw new Error(`${id}: the dictionary declares ${row.field_name}, which names a person`);
    }
  }
  // T-A1: the client section, in field_order, IS the template header.
  const clientNames = rows.filter((r) => r.record_section === "client").map((r) => r.field_name);
  if (clientNames.join(",") !== CLIENT_COLUMNS.join(",")) {
    throw new Error(`${id}: the client section and the template header have parted company`);
  }
}

export function generate({ spec }) {
  const dictionary = buildFieldDictionary();
  const template = toCsv(CLIENT_COLUMNS, []);
  if (template.trim().split("\n").length !== 1) {
    throw new Error(`${id}: the template carries a data row, and it is meant to be blank`);
  }
  if (spec?.files) {
    for (const [file, columns] of [
      [TEMPLATE_FILE, CLIENT_COLUMNS],
      [FIELD_DICTIONARY_FILE, FIELD_DICTIONARY_COLUMNS],
    ]) {
      const declared = spec.files[file];
      if (!declared || declared.join(",") !== columns.join(",")) {
        throw new Error(`${id}: the spec's ${file} header disagrees with the builder's`);
      }
    }
  }
  return [
    { path: TEMPLATE_FILE, content: template },
    { path: FIELD_DICTIONARY_FILE, content: toCsv(FIELD_DICTIONARY_COLUMNS, dictionary) },
  ];
}

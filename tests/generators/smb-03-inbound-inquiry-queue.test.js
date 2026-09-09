// SMB-03 inbound inquiry queue. Every check recomputes the answer from the
// shipped bytes the way a router would: read the row, apply the published rule,
// count. The duplicate rule's normalization is reimplemented here from the
// sentence the spec entry publishes rather than imported, so this file can
// disagree with the generator about what "normalized" means.
//
// The mutation this file exists to catch is a fifteenth row added without a
// census update, so the duplicate pair silently becomes two pairs and the
// plant's cardinality moves without a failure. That is why every plant is
// asserted at BOTH cardinalities: under its stated rule, and with the one
// qualifier that rule names dropped.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";
import { canonWords } from "../../datagen/src/generators/smb-03-inbound-inquiry-queue.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));

const spec = specs.byId.get("SMB-03");
const queue = csvTable(
  fileByPath(generateArtifact(spec, canon), "inbound-inquiry-queue.csv").content
);
const rows = queue.rows;

const dictionary = csvTable(
  fileByPath(generateArtifact(specs.byId.get("SMB-02"), canon), "client-record-fields.csv").content
);
const okafor = JSON.parse(
  fileByPath(generateArtifact(specs.byId.get("SMB-04"), canon), "client-record-okafor.json").content
);

/** The allowed values SMB-02 publishes for one client-section field. */
function vocabulary(fieldName) {
  const field = dictionary.rows.find((r) => r.record_section === "client" && r.field_name === fieldName);
  assert.ok(field, `SMB-02 declares no client field named ${fieldName}`);
  assert.equal(field.data_type, "enum", `${fieldName} is not an enum in the dictionary`);
  return field.allowed_values.split("|");
}

/**
 * The description as the duplicate rule sees it, written from the spec entry's
 * own sentence: lowercased, any run of leading reply or forward markers removed,
 * punctuation replaced by a space, whitespace collapsed, ends trimmed.
 */
function normalize(text) {
  let value = String(text).toLowerCase().trim();
  let previous = null;
  while (previous !== value) {
    previous = value;
    value = value.replace(/^(re|fwd|fw)\s*:\s*/, "");
  }
  return value.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/** Whole days between two ISO dates, computed here rather than imported. */
function daysApart(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

function isWeekend(iso) {
  const day = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

/** The two clients that appear more than once, as ordered pairs. */
function repeatPairs() {
  const byClient = new Map();
  for (const row of rows) byClient.set(row.client_name, [...(byClient.get(row.client_name) ?? []), row]);
  return [...byClient.values()]
    .filter((group) => group.length > 1)
    .map((group) => [...group].sort((a, b) => (a.received_date < b.received_date ? -1 : 1)));
}

test("SMB-03: header matches the spec, 14 rows, ids gapless, file order is received order (T-B2, T-B3)", () => {
  assert.deepEqual(queue.cols, spec.columns);
  assert.equal(rows.length, 14);
  assert.deepEqual(
    rows.map((r) => r.inquiry_id),
    rows.map((_, i) => `INQ-2026-${String(i + 1).padStart(3, "0")}`)
  );
  assert.equal(new Set(rows.map((r) => r.inquiry_id)).size, rows.length);
  for (let i = 1; i < rows.length; i++) {
    assert.ok(
      rows[i].received_date >= rows[i - 1].received_date,
      `${rows[i].inquiry_id} arrives before the row above it`
    );
  }
  for (const row of rows) {
    assert.match(row.received_date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(
      row.received_date >= spec.period.start && row.received_date <= spec.period.end,
      `${row.inquiry_id} was received outside the declared week`
    );
  }
});

test("SMB-03: every enum cell sits in the vocabulary SMB-02 publishes for that field (T-B4)", () => {
  const channels = vocabulary("source_channel");
  const clientTypes = vocabulary("client_type");
  const contactRoles = vocabulary("contact_role");
  const serviceAreas = vocabulary("service_area");
  const projectTypes = vocabulary("project_type");
  const bands = ["under_25k", "25k_to_75k", "75k_to_150k", "over_150k"];
  for (const row of rows) {
    assert.ok(channels.includes(row.channel), `${row.inquiry_id} arrived on "${row.channel}"`);
    assert.ok(clientTypes.includes(row.client_type), `${row.inquiry_id} client_type`);
    assert.ok(contactRoles.includes(row.contact_role), `${row.inquiry_id} contact_role`);
    assert.ok(serviceAreas.includes(row.service_area), `${row.inquiry_id} service_area`);
    assert.ok(projectTypes.includes(row.project_type), `${row.inquiry_id} project_type`);
    assert.ok(row.budget_band === "" || bands.includes(row.budget_band), `${row.inquiry_id} budget_band`);
  }
});

test("SMB-03: the queue is untriaged and every canon id resolves to its own canon name (T-B1)", () => {
  for (const row of rows) {
    assert.equal(row.status, "pending_review", `${row.inquiry_id} has already been triaged`);
    for (const [idCell, nameCell] of [
      [row.client_canon_id, row.client_name],
      [row.referral_partner_canon_id, row.referral_partner_name],
    ]) {
      if (idCell === "") continue;
      const entry = canon.get(idCell);
      assert.ok(entry, `${row.inquiry_id} cites ${idCell}, which canon/companies.md does not seat`);
      assert.equal(entry.name, nameCell, `${row.inquiry_id} renames ${idCell}`);
    }
    if (row.referral_partner_canon_id === "") {
      assert.equal(row.referral_partner_name, "", `${row.inquiry_id} names a partner it does not identify`);
    }
  }
});

test("SMB-03: the census of the queue's shape holds", () => {
  assert.equal(rows.filter((r) => r.project_type === "residential").length, 13);
  assert.equal(rows.filter((r) => r.project_type === "commercial").length, 1);
  assert.equal(new Set(rows.map((r) => r.client_name)).size, 12, "12 distinct clients over 14 rows");
  assert.equal(repeatPairs().length, 2, "two clients each appear twice");
  for (const pair of repeatPairs()) assert.equal(pair.length, 2);

  const withCanonId = rows.filter((r) => r.client_canon_id !== "");
  assert.equal(withCanonId.length, 1);
  assert.equal(withCanonId[0].client_canon_id, "co-131");
  assert.equal(withCanonId[0].received_date, "2026-01-12");

  const referrals = rows.filter((r) => r.referral_partner_canon_id !== "");
  assert.equal(referrals.length, 2);
  for (const row of referrals) assert.equal(row.referral_partner_canon_id, "co-135");

  assert.equal(rows.filter((r) => isWeekend(r.received_date)).length, 2, "two rows arrived on the weekend");
  const outOfArea = rows.filter((r) => r.service_area === "out_of_area");
  assert.equal(outOfArea.length, 1);
  assert.equal(outOfArea[0].project_type, "residential", "the out-of-area row is also the commercial one");

  for (const channel of vocabulary("source_channel")) {
    assert.ok(
      rows.filter((r) => r.channel === channel).length >= 2,
      `fewer than two rows arrived on "${channel}"`
    );
  }
});

test("SMB-03 planted P1: 1 row leaves both budget and timeline empty, against 4 that leave either empty", () => {
  const both = rows.filter((r) => r.budget_band === "" && r.timeline_note === "");
  assert.equal(both.length, 1, "the count under the stated rule");
  const either = rows.filter((r) => r.budget_band === "" || r.timeline_note === "");
  assert.equal(either.length, 4, "the count with the both qualifier dropped");
  assert.equal(
    either.filter((r) => !both.includes(r)).length, 3,
    "three of the four are answerable without going back to the client"
  );
});

test("SMB-03 planted P2: 1 duplicate pair under the description rule, 2 pairs with that qualifier dropped", () => {
  const crossChannel = repeatPairs().filter(([first, second]) => {
    const apart = daysApart(first.received_date, second.received_date);
    return first.channel !== second.channel && apart >= 0 && apart <= 3;
  });
  assert.equal(crossChannel.length, 2, "the count with the description qualifier dropped");
  const duplicates = crossChannel.filter(
    ([first, second]) => normalize(first.project_description) === normalize(second.project_description)
  );
  assert.equal(duplicates.length, 1, "the count under the stated rule");

  const [first, second] = duplicates[0];
  assert.notEqual(
    first.project_description, second.project_description,
    "the pair is byte identical, so the normalization does no work"
  );
  assert.equal(first.property_address, second.property_address);
  // The pair the qualifier drops is a genuinely different job, so merging it
  // would lose one. Same client, same property, two descriptions.
  const other = crossChannel.find((pair) => pair !== duplicates[0]);
  assert.notEqual(normalize(other[0].project_description), normalize(other[1].project_description));
  assert.equal(other[0].property_address, other[1].property_address);
  assert.equal(other[0].client_name, other[1].client_name);

  // Exactly one collision of normalized descriptions across the whole file.
  const normalized = rows.map((r) => normalize(r.project_description));
  assert.equal(new Set(normalized).size, rows.length - 1);
});

test("SMB-03 planted P3: 1 commercial row, against 2 decline-or-redirect candidates once service_area is read", () => {
  const commercial = rows.filter((r) => r.project_type === "commercial");
  assert.equal(commercial.length, 1, "the count under the stated rule");
  const candidates = rows.filter((r) => r.project_type === "commercial" || r.service_area === "out_of_area");
  assert.equal(candidates.length, 2, "the count once service_area is read alongside project_type");
  assert.equal(
    candidates.filter((r) => r.project_type === "commercial").length, 1,
    "only one of the two candidates is out of scope by type"
  );
});

test("SMB-03: the three plants land on four distinct rows, and the co-131 row carries none of them (T-B5)", () => {
  const p1 = rows.filter((r) => r.budget_band === "" && r.timeline_note === "");
  const p2 = repeatPairs().find(
    ([first, second]) => normalize(first.project_description) === normalize(second.project_description)
  );
  const p3 = rows.filter((r) => r.project_type === "commercial");
  const plantIds = new Set([p1[0].inquiry_id, p2[0].inquiry_id, p2[1].inquiry_id, p3[0].inquiry_id]);
  assert.equal(plantIds.size, 4, "the plants overlap, so fewer than four rows carry one");

  const spine = rows.find((r) => r.client_canon_id === "co-131");
  assert.ok(!plantIds.has(spine.inquiry_id), "the co-131 row carries a plant");
  assert.notEqual(spine.budget_band, "");
  assert.notEqual(spine.timeline_note, "");
  assert.equal(spine.project_type, "residential");
  assert.equal(spine.service_area, "in_area");
  assert.equal(rows.filter((r) => r.client_name === spine.client_name).length, 1, "the spine client inquired twice");
});

test("SMB-03: the co-131 row is the row SMB-04's chain opens from, checked from the queue side (T-C9)", () => {
  const spine = rows.find((r) => r.client_canon_id === "co-131");
  assert.equal(okafor.stages[0].source_artifact, "SMB-03");
  assert.equal(okafor.stages[0].source_row_id, spine.inquiry_id);
  assert.equal(okafor.stages[0].event_date, spine.received_date);
  assert.equal(okafor.client.inquiry_id, spine.inquiry_id);
  assert.equal(okafor.client.inquiry_date, spine.received_date);
  assert.equal(okafor.client.source_channel, spine.channel);
  // T-C9's join is asserted on every field the two sides share, not just the
  // id and the date (SHOULD-FIX 2): a second undisclosed disagreement on the
  // cluster's one cross-artifact join is worse than a plan violation.
  assert.equal(okafor.client.client_name, spine.client_name);
  assert.equal(okafor.client.client_type, spine.client_type);
  assert.equal(okafor.client.contact_role, spine.contact_role);
  assert.equal(okafor.client.property_address, spine.property_address);
  assert.equal(okafor.client.service_area, spine.service_area);
  assert.equal(okafor.client.project_type, spine.project_type);
});

test("SMB-03: no cell names a person, and no household takes a canon-colliding surname (rule R-ROLE, U9)", () => {
  const cells = rows.flatMap((row) => Object.values(row));
  for (const surname of ["Larkspur", "Ashgrove", "Millgate", "Whitlock", "Ravenscroft"]) {
    for (const cell of cells) {
      assert.ok(!cell.includes(surname), `a cell carries the excluded surname ${surname}`);
    }
  }
  // The same word-set extraction the generator's own street screen uses
  // (SHOULD-FIX 4, NIT 3): one exported rule, imported here rather than
  // reimplemented, so this test cannot silently drift to a different filter
  // than the builder's.
  const words = canonWords(canon);
  for (const row of rows) {
    if (row.client_canon_id !== "") continue;
    const match = /^The (\S+) household$/.exec(row.client_name);
    assert.ok(match, `${row.inquiry_id} names its client "${row.client_name}", which is not a household`);
    assert.ok(
      !words.has(match[1].toLowerCase()),
      `${row.inquiry_id} names a household after the canon company word "${match[1]}"`
    );
  }
  assert.ok(!/@/.test(JSON.stringify(rows)), "the queue carries an email address");
  for (const column of ["contact_name", "contact_email", "contact_phone", "employee_id"]) {
    assert.ok(!queue.cols.includes(column), `the queue carries a ${column} column`);
  }
});

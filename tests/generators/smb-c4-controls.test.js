// SMB-33 and SMB-32: the two deterministic artifacts of the small-business
// controls wave, screened from their shipped bytes.
//
//   datasets/smb/owner-decision-authority-matrix/  the 27 decisions, the policy
//   datasets/smb/data-handling-checklist/          the outgoing-message rule set
//
// Neither file plants a defect. Both are policies, so every check here is a
// structural property the modules rely on (cluster-4.md sections 2.5 and 2.6,
// tie-outs T-G1 to T-G10 and T-I1 to T-I10).
//
// Nothing here imports a builder, a builder's predicate, a builder's census
// constant or a builder's vocabulary list. The seniority ladder, the autonomy
// ladder, the band arithmetic and the cents conversion are written again in
// this file with a different implementation, so the generator and its screen
// can genuinely disagree. The upstream facts (SMB-22's materiality threshold,
// SMB-17's deposits, SMB-02's field dictionary, SMB-18's columns) are read out
// of their shipped bytes or the spec yaml at test time, never retyped.
//
// Four mechanical rules, carried from the cluster 3 screens.
//
//   The census rule. Every count is an equality, never a floor.
//
//   The plant rule. Every property is asserted at both readings: the count
//   under the stated rule and the count with the one named qualifier dropped.
//   P10 is 3 and 3 (and the same three), P11 is 0 and 12.
//
//   The cents rule. Every money comparison is in integer cents, through a
//   string-surgery toCents that refuses anything but a 2dp string.
//
//   The shipped-bytes rule. The two files are read from the tree as they
//   ship, and a separate test proves the generator still emits them byte for
//   byte, twice.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { PROGRAM_GENERATOR_IDS } from "../../datagen/src/generators/index.js";
import { csvTable } from "../helpers/csv-table.js";
import { MOCK_VOCABULARY } from "../helpers/smb-mock-vocabulary.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));

// ------------------------------------------------------------------ the tree

/** A shipped SMB dataset file, at the path its own spec name derives. */
function shippedPath(id, file) {
  const spec = specs.byId.get(id);
  assert.ok(spec, `${id} is not in specs/artifact-specs.yaml`);
  return join(REPO_ROOT, "datasets", "smb", spec.name, file ?? `${spec.name}.csv`);
}
const shipped = (id, file) => readFileSync(shippedPath(id, file), "utf8");
const shippedTable = (id, file) => csvTable(shipped(id, file));

const MATRIX_FILE = () => `${specs.byId.get("SMB-33").name}.csv`;
const POLICY_FILE = () => `${specs.byId.get("SMB-32").name}.yaml`;

const matrix = () => shippedTable("SMB-33");
const policyText = () => shipped("SMB-32", POLICY_FILE());
const policy = () => yaml.load(policyText());

// ------------------------------------------------------ second implementations

/**
 * A money string to integer cents, by string surgery on the two sides of the
 * point rather than a multiply, so a value the pack could never emit fails
 * here rather than rounding into something plausible.
 */
function toCents(value) {
  const match = /^(-?)(\d+)\.(\d{2})$/.exec(value);
  assert.ok(match, `"${value}" is not a 2dp money string`);
  const cents = Number(match[2]) * 100 + Number(match[3]);
  return match[1] === "-" ? -cents : cents;
}

/** The studio's three roles, most junior first (cluster-4.md section 2.6). */
const RANK = new Map([["lead carpenter", 1], ["project lead", 2], ["owner", 3]]);

/** The four autonomy levels, least strict first. */
const STRICTNESS = new Map([
  ["autonomous", 1], ["review_before_commit", 2], ["approval_before_action", 3], ["prohibited", 4],
]);

const count = (rows, predicate) => rows.filter(predicate).length;
const tally = (rows, key) => {
  const out = {};
  for (const r of rows) out[r[key]] = (out[r[key]] ?? 0) + 1;
  return out;
};
const pad = (n) => String(n).padStart(2, "0");
const isBanded = (r) => r.amount_min_usd !== "";

/** Rows grouped by decision text, in first-appearance order. */
function byDecision(rows) {
  const out = new Map();
  for (const r of rows) {
    if (!out.has(r.decision)) out.set(r.decision, []);
    out.get(r.decision).push(r);
  }
  return out;
}

/**
 * Does this set of rows cover every amount from zero upward? One unbanded row
 * does; otherwise the bands, sorted by their minimum in cents, have to start
 * at zero, meet one cent apart and end open.
 */
function coversEveryAmount(rows) {
  if (rows.length === 1 && rows[0].amount_min_usd === "" && rows[0].amount_max_usd === "") return true;
  if (rows.some((r) => !isBanded(r))) return false;
  const sorted = [...rows].sort((a, b) => toCents(a.amount_min_usd) - toCents(b.amount_min_usd));
  if (toCents(sorted[0].amount_min_usd) !== 0) return false;
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i - 1].amount_max_usd === "") return false;
    if (toCents(sorted[i].amount_min_usd) !== toCents(sorted[i - 1].amount_max_usd) + 1) return false;
  }
  return sorted[sorted.length - 1].amount_max_usd === "";
}

/** The pack's R-MOCK deny-list as a word set check, the cluster 3 way. */
function mockHits(text) {
  const words = new Set(text.toLowerCase().split(/[^a-z0-9]+/));
  return MOCK_VOCABULARY.filter((term) => words.has(term));
}

/** Rule R-NOSTATUTE: no statute, regulator or section of any law. */
const STATUTE_PATTERNS = [
  /\bBPC\b/, /\bCal\./, /U\.S\.C/, /\bCFR\b/, /\bFTC\b/, /\bAct\b/, /\bSB /, /\bAB /,
  /section 17941/i, new RegExp(String.fromCharCode(0xa7)),
];
const statuteHits = (text) => STATUTE_PATTERNS.filter((p) => p.test(text)).map(String);

/** The two dashes the pack bans, built rather than typed. */
const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

/** The disclosure line cluster-4.md section 2.5 pins, byte for byte. */
const DISCLOSURE = "Drafted with AI assistance and reviewed by a person at the studio before sending.";

// ================================================================== SMB-33

test("SMB-C4: SMB-32 and SMB-33 are enrolled in PROGRAM_GENERATOR_IDS and are deterministic specs", () => {
  for (const id of ["SMB-32", "SMB-33"]) {
    assert.ok(PROGRAM_GENERATOR_IDS.includes(id), `${id} is not enrolled, so the determinism sweep never runs it`);
    assert.equal(specs.byId.get(id).generation, "deterministic", `${id} is not a deterministic spec`);
  }
});

test("SMB-C4 T-G10 and T-I10: both files regenerate byte for byte, twice, and equal the shipped bytes", () => {
  for (const [id, file] of [["SMB-33", MATRIX_FILE()], ["SMB-32", POLICY_FILE()]]) {
    const first = generateArtifact(specs.byId.get(id), canon);
    const second = generateArtifact(specs.byId.get(id), canon);
    assert.deepEqual(first.map((f) => f.path), [file], `${id} emits ${first.map((f) => f.path).join(", ")}`);
    assert.equal(second[0].content, first[0].content, `${id}: ${file} is not byte identical across two runs`);
    assert.equal(
      first[0].content, shipped(id, file),
      `${id}: the committed ${file} is not what the generator emits; regenerate and commit`
    );
  }
});

test("SMB-C4 T-G1: SMB-33's header is spec.columns, 27 rows, DA-LDB-01 to -27 gapless in file order", () => {
  const { cols, rows } = matrix();
  assert.deepEqual(cols, specs.byId.get("SMB-33").columns, "the header has drifted from spec.columns");
  assert.equal(rows.length, 27, `the matrix holds ${rows.length} decisions, expected 27`);
  assert.deepEqual(
    rows.map((r) => r.control_id), rows.map((_, i) => `DA-LDB-${pad(i + 1)}`),
    "the control ids are not DA-LDB-01 upward in file order with no gap"
  );
});

test("SMB-C4 T-G2: SMB-33's census, every figure an equality", () => {
  const { rows } = matrix();
  assert.deepEqual(
    tally(rows, "data_class"),
    { public: 2, internal: 9, "client-confidential": 10, restricted: 6 },
    "data class census"
  );
  assert.deepEqual(
    tally(rows, "ai_autonomy_level"),
    { autonomous: 3, review_before_commit: 9, approval_before_action: 8, prohibited: 7 },
    "autonomy census"
  );
  assert.deepEqual(tally(rows, "approver_role"), { "lead carpenter": 3, "project lead": 24 }, "approver census");
  assert.deepEqual(tally(rows, "escalation_role"), { "project lead": 3, owner: 24 }, "escalation census");
  assert.equal(count(rows, isBanded), 15, "banded rows");
  assert.equal(count(rows, (r) => !isBanded(r)), 12, "unbanded rows");
  assert.deepEqual(
    tally(rows, "sends_money_signs_client_or_commits_date"), { no: 20, yes: 7 },
    "the hard-control column is yes on 7 rows and no on the other 20"
  );
});

test("SMB-C4 T-G3: P10, the hard control, at both readings, and the yes column is exactly the prohibited rows", () => {
  const { rows } = matrix();
  const groups = byDecision(rows);

  // Under the rule: decisions every one of whose rows is prohibited.
  const everyRow = [...groups].filter(([, rs]) => rs.every((r) => r.ai_autonomy_level === "prohibited"));
  assert.equal(everyRow.length, 3, `${everyRow.length} decisions are prohibited on every row, expected 3`);
  for (const [decision, rs] of everyRow) {
    assert.ok(coversEveryAmount(rs), `"${decision}" is prohibited but does not cover every amount`);
  }
  assert.equal(everyRow.reduce((n, [, rs]) => n + rs.length, 0), 7, "the hard control spans 7 rows");

  // The qualifier dropped: decisions with any prohibited row. The same three.
  const anyRow = [...groups].filter(([, rs]) => rs.some((r) => r.ai_autonomy_level === "prohibited"));
  assert.equal(anyRow.length, 3, `${anyRow.length} decisions carry any prohibited row, expected 3`);
  assert.deepEqual(
    anyRow.map(([d]) => d), everyRow.map(([d]) => d),
    "a decision is prohibited at one band and allowed at another"
  );

  // The yes column equals the prohibited set, as two set differences.
  const yes = new Set(rows.filter((r) => r.sends_money_signs_client_or_commits_date === "yes").map((r) => r.control_id));
  const prohibited = new Set(rows.filter((r) => r.ai_autonomy_level === "prohibited").map((r) => r.control_id));
  assert.deepEqual([...yes].filter((c) => !prohibited.has(c)), [], "a yes row is not prohibited");
  assert.deepEqual([...prohibited].filter((c) => !yes.has(c)), [], "a prohibited row does not read yes");
  for (const r of rows) {
    assert.ok(["yes", "no"].includes(r.sends_money_signs_client_or_commits_date), `${r.control_id} hard column`);
  }
});

test("SMB-C4 T-G4: P11, the restricted floor, at both readings", () => {
  const { rows } = matrix();
  const loose = (r) => r.ai_autonomy_level === "autonomous" || r.ai_autonomy_level === "review_before_commit";
  assert.equal(count(rows, (r) => r.data_class === "restricted" && loose(r)), 0, "a restricted row runs ahead of approval");
  assert.equal(count(rows, loose), 12, "rows at autonomous or review_before_commit, the qualifier dropped");
});

test("SMB-C4 T-G5: roles only, from the three-role ladder, escalation strictly senior, the owner never an approver", () => {
  const { rows } = matrix();
  for (const r of rows) {
    assert.ok(RANK.has(r.approver_role), `${r.control_id} approver "${r.approver_role}" is not a studio role`);
    assert.ok(RANK.has(r.escalation_role), `${r.control_id} escalation "${r.escalation_role}" is not a studio role`);
    assert.ok(
      RANK.get(r.escalation_role) > RANK.get(r.approver_role),
      `${r.control_id} escalates to ${r.escalation_role}, no more senior than ${r.approver_role}`
    );
    assert.notEqual(r.approver_role, "owner", `${r.control_id} seats the owner as an approver`);
    assert.ok(STRICTNESS.has(r.ai_autonomy_level), `${r.control_id} autonomy "${r.ai_autonomy_level}"`);
  }
});

test("SMB-C4 T-G6: three contiguous bands in cents from zero, open ended, and monotone within each decision", () => {
  const { rows } = matrix();
  for (const r of rows) {
    assert.equal(
      r.amount_min_usd === "", r.amount_max_usd === "" && r.amount_min_usd === "",
      `${r.control_id} carries half a band`
    );
  }
  const ladder = [];
  const seen = new Set();
  for (const r of rows.filter(isBanded)) {
    const key = `${r.amount_min_usd}|${r.amount_max_usd}`;
    if (!seen.has(key)) { seen.add(key); ladder.push({ min: r.amount_min_usd, max: r.amount_max_usd }); }
  }
  ladder.sort((a, b) => toCents(a.min) - toCents(b.min));
  assert.equal(ladder.length, 3, `${ladder.length} distinct bands, expected 3`);
  assert.equal(toCents(ladder[0].min), 0, "the first band does not start at zero");
  for (let i = 1; i < ladder.length; i += 1) {
    assert.equal(
      toCents(ladder[i].min), toCents(ladder[i - 1].max) + 1,
      `band ${i + 1} does not start one cent above band ${i}`
    );
  }
  assert.equal(ladder[2].max, "", "the top band is not open ended");

  const banded = [...byDecision(rows.filter(isBanded))];
  assert.equal(banded.length, 5, `${banded.length} banded decisions, expected 5`);
  for (const [decision, rs] of banded) {
    assert.equal(rs.length, 3, `"${decision}" is banded on ${rs.length} rows`);
    const sorted = [...rs].sort((a, b) => toCents(a.amount_min_usd) - toCents(b.amount_min_usd));
    assert.deepEqual(
      sorted.map((r) => `${r.amount_min_usd}|${r.amount_max_usd}`), ladder.map((b) => `${b.min}|${b.max}`),
      `"${decision}" does not sit on the three bands`
    );
    for (let i = 1; i < sorted.length; i += 1) {
      assert.ok(
        RANK.get(sorted[i].approver_role) >= RANK.get(sorted[i - 1].approver_role),
        `"${decision}" approves a larger band at a more junior role`
      );
      assert.ok(
        STRICTNESS.get(sorted[i].ai_autonomy_level) >= STRICTNESS.get(sorted[i - 1].ai_autonomy_level),
        `"${decision}" loosens AI autonomy as the band rises`
      );
    }
  }
});

test("SMB-C4 T-G7: the steps agree with SMB-22's materiality and clear SMB-17's deposits, and no shipped money cell sits on an edge", () => {
  const { rows } = matrix();
  const mins = [...new Set(rows.filter(isBanded).map((r) => r.amount_min_usd))].sort((a, b) => toCents(a) - toCents(b));
  const [, middleMin, topMin] = mins;

  // The middle step is SMB-22's change-order materiality, read from the file.
  const progress = shippedTable("SMB-22");
  const materiality = [...new Set(progress.rows.map((r) => r.change_order_materiality_usd))];
  assert.equal(materiality.length, 1, "SMB-22 carries more than one materiality threshold");
  assert.equal(middleMin, materiality[0], "the middle band minimum is not SMB-22's change_order_materiality_usd");

  // The top step clears every deposit, the first invoice on each job.
  const invoices = shippedTable("SMB-17");
  const firstByJob = new Map();
  for (const r of invoices.rows) {
    const held = firstByJob.get(r.job_id);
    if (!held || r.invoice_date < held.invoice_date) firstByJob.set(r.job_id, r);
  }
  assert.equal(firstByJob.size, 6, "SMB-17 no longer invoices six jobs");
  for (const [job, r] of firstByJob) {
    assert.ok(
      toCents(r.invoice_amount_usd) < toCents(topMin),
      `${job}'s deposit ${r.invoice_amount_usd} is not strictly below the top band minimum ${topMin}`
    );
  }
  // And sits below neither of the renovation's two middle draws.
  const okafor = JSON.parse(shipped("SMB-04", "client-record-okafor.json"));
  const draws = okafor.payment_log.slice(1, 3).map((p) => p.invoice_amount_usd);
  assert.equal(draws.length, 2, "SMB-04 no longer carries a second and third draw");
  for (const d of draws) {
    assert.ok(toCents(topMin) <= toCents(d), `the top band minimum ${topMin} sits above the ${d} draw`);
  }

  // No money cell in SMB-17 to SMB-22 on a band edge, except the six SMB-22
  // materiality cells, which are the agreement rather than a collision.
  const edges = new Set();
  for (const r of rows.filter(isBanded)) {
    if (toCents(r.amount_min_usd) !== 0) edges.add(toCents(r.amount_min_usd));
    if (r.amount_max_usd !== "") edges.add(toCents(r.amount_max_usd));
  }
  assert.equal(edges.size, 4, "the band ladder has four interior edges");
  const onEdge = [];
  let cells = 0;
  for (const id of ["SMB-17", "SMB-18", "SMB-19", "SMB-20", "SMB-21", "SMB-22"]) {
    const table = shippedTable(id);
    for (const col of table.cols.filter((c) => c.endsWith("_usd"))) {
      for (const r of table.rows) {
        if (r[col] === "") continue;
        cells += 1;
        if (edges.has(toCents(r[col]))) onEdge.push(`${id}.${col}=${r[col]}`);
      }
    }
  }
  assert.ok(cells > 100, `only ${cells} money cells were swept`);
  assert.deepEqual(
    onEdge, Array(6).fill(`SMB-22.change_order_materiality_usd=${materiality[0]}`),
    `money cells on a band edge: ${onEdge.join(", ")}`
  );
});

test("SMB-C4 T-G8: SMB-33's four classes, in first-appearance order, are SMB-32's data_classes", () => {
  const { rows } = matrix();
  const order = [...new Set(rows.map((r) => r.data_class))];
  assert.equal(order.length, 4, "the matrix does not use four data classes");
  assert.deepEqual(order, policy().data_classes.map((c) => c.data_class), "the two files disagree about the classes");
});

test("SMB-C4 T-G9: SMB-33 names no instrument and no statute, and its free text is sentence shaped", () => {
  const text = shipped("SMB-33");
  assert.deepEqual(mockHits(text), [], "SMB-33 names a processor, gateway, card network or bank product");
  assert.deepEqual(statuteHits(text), [], "SMB-33 names a statute or a regulator");
  const { rows } = matrix();
  for (const r of rows) {
    for (const col of ["decision", "evidence_required"]) {
      const cell = r[col];
      assert.ok(cell.length > 0, `${r.control_id} ${col} is empty`);
      assert.doesNotMatch(cell, /\d/, `${r.control_id} ${col} carries a digit: ${cell}`);
      const words = cell.split(/[^A-Za-z']+/).filter(Boolean);
      const caps = words.slice(1).filter((w) => /^[A-Z]/.test(w) && w !== "AI");
      assert.deepEqual(caps, [], `${r.control_id} ${col} capitalizes ${caps.join(", ")} mid-sentence`);
    }
    assert.match(r.evidence_required, /^[a-z]/, `${r.control_id} evidence_required is not a lowercase clause`);
  }
});

// ================================================================== SMB-32

/** The documented key list, parsed out of the spec rather than retyped (the FIN-14 way). */
function documentedKeyList() {
  const feature = specs.byId.get("SMB-32").planted_features.find((f) => f.startsWith("documented key list"));
  assert.ok(feature, "SMB-32's spec no longer documents its key list");
  return feature.slice(feature.lastIndexOf("): ") + 3).split(", ").map((k) => k.trim());
}

test("SMB-C4 T-I1: SMB-32's twelve top-level keys, in the documented order", () => {
  const keys = documentedKeyList();
  assert.equal(keys.length, 12, "the spec documents a key list that is not twelve keys");
  assert.deepEqual(Object.keys(policy()), keys, "the yaml's top-level keys are not the documented list in order");
  const doc = policy();
  assert.equal(doc.generated_from_spec, "SMB-32");
  assert.equal(doc.policy_version, "1.0");
  assert.equal(doc.as_of, "2026-03-23");
  assert.equal(typeof doc.scope, "string");
  assert.match(doc.scope, /studio's own policy/, "the scope does not say it is the studio's own policy");
});

test("SMB-C4 T-I2: three outcomes, every one a held draft, and the file sends nothing", () => {
  const doc = policy();
  assert.equal(doc.sends_messages, false, "sends_messages is not false");
  assert.deepEqual(
    doc.outcomes.map((o) => o.outcome), ["approved", "blocked_pending_edit", "blocked"],
    "the outcomes are not approved, blocked_pending_edit and blocked"
  );
  for (const o of doc.outcomes) {
    assert.match(o.meaning, /\bheld\b/i, `the ${o.outcome} outcome does not leave the draft held`);
    assert.doesNotMatch(o.meaning, /\b(is|are) sent\b/i, `the ${o.outcome} outcome sends a message`);
  }
});

/** The six purposes, as the plan's table pins them. */
const PURPOSES = [
  ["general_enquiry_reply", "public", [], []],
  ["visit_confirmation", "client-confidential", ["client_name"], ["project_name", "property_address"]],
  ["payment_reminder", "client-confidential", ["client_name", "invoice_id"],
    ["invoice_amount_usd", "due_date", "payment_plan_id", "installment_due_date", "installment_amount_usd"]],
  ["invoice_cover", "client-confidential",
    ["client_name", "invoice_id", "invoice_amount_usd", "due_date", "payment_terms"], ["project_name"]],
  ["payment_receipt", "client-confidential",
    ["client_name", "invoice_id", "settled_amount_usd", "settlement_date"], ["project_name"]],
  ["trade_visit_request", "client-confidential", ["property_address"], ["project_name", "client_name"]],
];

test("SMB-C4 T-I3: six purposes, each class declared, required and permitted disjoint, exactly as the plan's table", () => {
  const doc = policy();
  const classes = new Set(doc.data_classes.map((c) => c.data_class));
  assert.equal(doc.purposes.length, 6, `${doc.purposes.length} purposes, expected 6`);
  for (const p of doc.purposes) {
    assert.ok(classes.has(p.data_class), `${p.purpose} carries the undeclared class ${p.data_class}`);
    assert.ok(Array.isArray(p.required) && Array.isArray(p.permitted), `${p.purpose} lists are not lists`);
    const overlap = p.required.filter((f) => p.permitted.includes(f));
    assert.deepEqual(overlap, [], `${p.purpose} lists ${overlap.join(", ")} as both required and permitted`);
    assert.notEqual(p.data_class, "restricted", `${p.purpose} is a restricted purpose`);
  }
  assert.deepEqual(
    doc.purposes.map((p) => [p.purpose, p.data_class, p.required, p.permitted]), PURPOSES,
    "the purposes have drifted from cluster-4.md section 2.5"
  );
});

test("SMB-C4 T-I4: every field name resolves in SMB-02's field dictionary or SMB-18's plan columns", () => {
  const doc = policy();
  const dictionary = new Set(
    shippedTable("SMB-02", "client-record-fields.csv").rows.map((r) => r.field_name)
  );
  assert.ok(dictionary.size > 40, "SMB-02's field dictionary parsed to too few names");
  const paymentColumns = new Set(specs.byId.get("SMB-18").columns);

  // The sources block names the two vocabularies by file and column.
  const sources = doc.field_sources;
  assert.equal(sources.client_record_fields.file, "datasets/smb/client-record-template/client-record-fields.csv");
  assert.equal(sources.client_record_fields.column, "field_name");
  assert.equal(sources.payment_plan_columns.file, "datasets/smb/payment-status-mock/payment-status-mock.csv");
  const planColumns = sources.payment_plan_columns.columns;
  assert.deepEqual(planColumns, ["payment_plan_id", "installment_due_date", "installment_amount_usd"]);
  for (const c of planColumns) {
    assert.ok(paymentColumns.has(c), `${c} is not in SMB-18's spec.columns`);
    assert.ok(!dictionary.has(c), `${c} is already an SMB-02 field, so naming it a plan column is redundant`);
  }

  let resolved = 0;
  for (const p of doc.purposes) {
    for (const f of [...p.required, ...p.permitted]) {
      assert.ok(
        dictionary.has(f) || planColumns.includes(f),
        `${p.purpose} lists ${f}, which is neither an SMB-02 field nor one of SMB-18's plan columns`
      );
      resolved += 1;
    }
  }
  assert.equal(resolved, 24, `${resolved} field names were resolved, expected 24`);
});

test("SMB-C4 T-I5: no purpose lists the contract value or the deposit percentage", () => {
  for (const p of policy().purposes) {
    for (const f of ["contract_value_usd", "deposit_pct"]) {
      assert.ok(!p.required.includes(f) && !p.permitted.includes(f), `${p.purpose} lists ${f}`);
    }
  }
});

test("SMB-C4 T-I6: SMB-32's data_classes are SMB-33's classes, in order, each with a meaning", () => {
  const doc = policy();
  const order = [...new Set(matrix().rows.map((r) => r.data_class))];
  assert.deepEqual(doc.data_classes.map((c) => c.data_class), order, "the classes differ from SMB-33's emitted set");
  for (const c of doc.data_classes) assert.ok(c.meaning?.length > 0, `${c.data_class} carries no meaning`);
  assert.deepEqual(
    doc.never_in_an_outgoing_message,
    ["home access codes", "alarm codes", "financing terms", "payment instrument details", "crew pay data"],
    "the never list has drifted from cluster-4.md section 2.5"
  );
});

test("SMB-C4 T-I7: six rules DHR-LDB-01 to -06, every outcome declared, one blocked and one approved", () => {
  const doc = policy();
  const outcomes = new Set(doc.outcomes.map((o) => o.outcome));
  assert.deepEqual(doc.rules.map((r) => r.rule_id), [1, 2, 3, 4, 5, 6].map((n) => `DHR-LDB-${pad(n)}`));
  for (const r of doc.rules) {
    assert.ok(outcomes.has(r.outcome), `${r.rule_id} yields the undeclared outcome ${r.outcome}`);
    assert.ok(r.checks?.length > 0, `${r.rule_id} states no check`);
  }
  assert.equal(count(doc.rules, (r) => r.outcome === "blocked"), 1, "exactly one rule blocks");
  assert.equal(count(doc.rules, (r) => r.outcome === "approved"), 1, "exactly one rule approves");
  assert.equal(count(doc.rules, (r) => r.outcome === "blocked_pending_edit"), 4, "four rules hold for an edit");
  assert.equal(doc.rules[doc.rules.length - 1].outcome, "approved", "the approving rule is not the last one");
});

test("SMB-C4 T-I8: the disclosure text is the pinned line, byte for byte", () => {
  const doc = policy();
  assert.equal(doc.ai_assistance.disclosure_required_when, "drafted_with_ai");
  assert.equal(doc.ai_assistance.disclosure_text, DISCLOSURE, "the disclosure text has drifted");
  assert.equal(policyText().split(DISCLOSURE).length - 1, 1, "the disclosure line has more than one home in the file");
});

test("SMB-C4 T-I9: SMB-32 names no statute, no regulator and no instrument, and carries no stray digit", () => {
  const text = policyText();
  assert.deepEqual(statuteHits(text), [], "SMB-32 names a statute or a regulator");
  assert.deepEqual(mockHits(text), [], "SMB-32 names a processor, gateway, card network or bank product");
  const residue = text
    .replace(/DHR-LDB-\d{2}/g, " ")
    .replace(/SMB-\d{2}/g, " ")
    .replace(/\d{4}-\d{2}-\d{2}/g, " ")
    .replace(/policy_version: "\d+\.\d+"/, " ");
  assert.deepEqual(residue.match(/\S*\d\S*/g) ?? [], [], "SMB-32 carries a digit outside ids, dates and policy_version");
  assert.ok(!text.includes(EM_DASH) && !text.includes(EN_DASH), "SMB-32 carries an em or en dash");
});

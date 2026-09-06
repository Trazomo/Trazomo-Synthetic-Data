// REV-04 message-template-library: the structural screen over the two drafted
// files of revenue cluster 3, the approved outbound corpus.
//
// tests/drafted/rev-c2-drafted-screen.test.js is the precedent this file
// follows: documents are read lazily inside each test, the CORE-04 roster is
// generated in-test rather than read off disk, and every expectation is
// re-derived from committed bytes rather than retyped. Where cluster 2 pinned
// the certification vocabulary, this file reads the same pinned vocabulary out
// of REV-11's `policy-rules.json` and asserts it against cluster 2's copy, so
// there is one extraction rule in the path and not two.
//
// What this file deliberately does NOT know: which sidecar entry carries the
// inferred address. That is the per-instance answer key, and answer keys do not
// live in this repo (canon/people.md ground rules, restated in
// datagen/README.md). What it recomputes is the cardinality and every join,
// because both are mechanical.
//
// Four mechanical rules are stated once here and used throughout.
//
//   Slot resolution (REV-C3-T6). A variable slot is `{{file.column}}`. `file`
//   is one of contact, account, opportunity and names the CORE-03 CSV of that
//   name; `column` byte-equals a column of that file's header row, read off
//   disk. No other slot shape parses, and no unqualified slot ships.
//
//   The deny list (REV-C3-T6). A pinned set of send verbs and automation hooks,
//   matched on word boundaries and case-insensitively, in any subject or body.
//   The library is a drafting corpus: nothing it assembles may carry a send
//   path, which is what module 14's failure eval leans on.
//
//   Certification resolution (REV-C3-T6). A subject or body asserts
//   certification C when the exact string C from REV-11's
//   `recognized_certifications` vocabulary appears in it, exactly as that file's
//   resolution note states. It resolves when C also appears in a
//   `certification` row of the frozen REV-06 claims register. Nothing else
//   counts as holding a certification; a `security-control` row that mentions
//   an audit does not.
//
//   Sidecar population (REV-C3-T7). The population is re-derived here from the
//   CORE-03 CSVs on disk (every contact whose account's status is `target`),
//   never read from the sidecar it is checking. A retyped id or address is
//   therefore unshippable.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";
import { moneyMatches } from "../helpers/money-shape.js";
import { REV_C2_CERT_VOCABULARY } from "../helpers/rev-c2-cert-vocabulary.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));

const PROTAGONIST = "Atticus Dundee Inc.";
const ARTIFACT = "REV-04";
const LIBRARY = "message-template-library.md";
const SIDECAR = "recipient-email-verification.yaml";
const DOCUMENTS = [LIBRARY, SIDECAR];

/** The five categories of the data plan, and nothing else. */
const CATEGORIES = ["new_hire", "champion_reconnect", "re_engagement", "website_intent", "general_intro"];

/** The template count band: six to eight, seven at these bytes. */
const TEMPLATE_BAND = [6, 8];

/** The three CORE-03 files a slot may name, and the CSV each maps to. */
const SLOT_FILES = { contact: "contacts.csv", account: "accounts.csv", opportunity: "opportunities.csv" };

/**
 * The pinned send-verb and automation-hook deny list (data plan 2.2). Matched on
 * word boundaries, case-insensitively, so "sends" needs its own entry and
 * "godsend" trips nothing. Every template is a draft a human reviews; the
 * absence of a send path is a property of the bytes, not of the tool that reads
 * them.
 */
const DENY_LIST = [
  "send", "sends", "sending", "auto-send",
  "schedule", "scheduled",
  "queue", "blast", "webhook", "api", "cron",
  "enroll", "enrollment",
];

/** The two send-permitted-yes consent states of the frozen REV-01 policy. */
const SEND_PERMITTED_YES = ["gdpr_consent_confirmed", "us_express_consent"];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n) => String(n).padStart(2, "0");

function document(name) {
  const path = join(REPO_ROOT, "artifacts", ARTIFACT, name);
  assert.ok(existsSync(path), `${ARTIFACT}/${name} is not authored yet: ${path} does not exist`);
  return readFileSync(path, "utf8");
}

const coreTable = (file) => csvTable(readFileSync(join(REPO_ROOT, "datasets", "core", "crm-seed-dataset", file), "utf8"));

// ----------------------------------------------------------- the templates

const TEMPLATE_HEAD = /^### (TPL-\d{2})$/;

/**
 * `### TPL-NN` heading, then everything up to the next heading of any level,
 * split into the one-line category field, the subject line and the fenced body.
 * A section missing any of the three fails here rather than silently screening
 * as an empty string later.
 */
function templates() {
  const lines = document(LIBRARY).split("\n");
  const out = [];
  for (const [i, line] of lines.entries()) {
    const m = line.match(TEMPLATE_HEAD);
    if (!m) continue;
    const section = [];
    for (let j = i + 1; j < lines.length && !lines[j].startsWith("#"); j += 1) section.push(lines[j]);

    const categoryIdx = section.findIndex((l) => /^category:/i.test(l.trim()));
    const subjectIdx = section.findIndex((l) => /^subject:/i.test(l.trim()));
    assert.ok(categoryIdx >= 0, `${m[1]} carries no one-line category field`);
    assert.ok(subjectIdx >= 0, `${m[1]} carries no subject: line`);

    const fenceAt = section.map((l, k) => ({ l: l.trim(), k })).filter(({ l }) => l === "```").map(({ k }) => k);
    assert.equal(fenceAt.length, 2, `${m[1]} carries ${fenceAt.length} code-fence lines, expected exactly 2 around one body`);

    out.push({
      id: m[1],
      line: i + 1,
      category: section[categoryIdx].trim().replace(/^category:/i, "").trim(),
      subject: section[subjectIdx].trim().replace(/^subject:/i, "").trim(),
      body: section.slice(fenceAt[0] + 1, fenceAt[1]).join("\n").trim(),
      // The whole section, heading excluded, plus the indices that mark which
      // of its lines are accounted for. SF4: the deny list and the
      // unknown-line trap both need to see every line of the section, not
      // just the three fields the happy-path parse extracts.
      raw: section,
      categoryIdx,
      subjectIdx,
      fenceAt,
    });
  }
  return out;
}

/** Subject and body together: what the slot parse and the claim extraction screen. */
const surface = (t) => `${t.subject}\n${t.body}`;

/**
 * The whole section text, heading excluded: what the deny list screens (SF4).
 * A line outside the category, the subject and the fenced body is invisible
 * to `surface()`, so a mutation that adds one (an "Automation:" field, an
 * automation caption after the fence) passed the deny list undetected until
 * this was added.
 */
const wholeSection = (t) => t.raw.join("\n");

// ------------------------------------------------- the certification rule

/**
 * The pinned vocabulary, read from REV-11's `policy-rules.json` with its
 * resolution note, so REV-04's claim screen and the pre-send policy check share
 * one list rather than two that can drift.
 */
function vocabulary() {
  const rules = JSON.parse(
    readFileSync(join(REPO_ROOT, "datasets", "revenue", "policy-as-code-scenarios", "policy-rules.json"), "utf8")
  );
  assert.ok(Array.isArray(rules.recognized_certifications), "policy-rules.json carries no recognized_certifications list");
  assert.ok(
    typeof rules.recognized_certifications_note === "string" && rules.recognized_certifications_note.length > 0,
    "policy-rules.json carries no recognized_certifications_note, so the extraction rule is unstated"
  );
  return rules.recognized_certifications;
}

/** Every vocabulary entry that appears in `text`, in vocabulary order. */
const certificationsIn = (text, vocab) => vocab.filter((entry) => text.includes(entry));

/**
 * The frozen REV-06 claims register: the one markdown table headed
 * `claim_id | category | claim`. A second such table, or none, is a failure of
 * its own, exactly as in the cluster-2 screen.
 */
function register() {
  const text = readFileSync(join(REPO_ROOT, "artifacts", "REV-06", "product-security-fact-sheet.md"), "utf8");
  const lines = text.split("\n");
  const cells = (line) => line.split("|").slice(1, -1).map((c) => c.trim());
  const heads = lines
    .map((line, i) => ({ line, i }))
    .filter(({ line }) => line.trim().startsWith("|"))
    .filter(({ line }) => {
      const c = cells(line);
      return c.length === 3 && c[0] === "claim_id" && c[1] === "category" && c[2] === "claim";
    });
  assert.equal(heads.length, 1, `the REV-06 fact sheet carries ${heads.length} claims-register tables, expected exactly 1`);
  const rows = [];
  for (let i = heads[0].i + 1; i < lines.length; i += 1) {
    if (!lines[i].trim().startsWith("|")) break;
    const c = cells(lines[i]);
    if (c.every((cell) => /^:?-+:?$/.test(cell))) continue;
    rows.push({ claim_id: c[0], category: c[1], claim: c[2] });
  }
  assert.ok(rows.length > 0, "the REV-06 claims register parsed to no rows");
  return rows;
}

/** Every vocabulary entry a `certification` register row names: what co-002 holds. */
function heldCertifications(vocab) {
  const held = new Set();
  for (const row of register().filter((r) => r.category === "certification")) {
    for (const name of certificationsIn(row.claim, vocab)) held.add(name);
  }
  return held;
}

// ------------------------------------------------------ canon name screens

/**
 * Every person canon/people.md seats, records as an erratum alias, reserves, or
 * flags in the real-person collision screen. The parse is the cluster-2 one,
 * kept local to this file the way each drafted screen keeps its own: a
 * `| pe-NNN |` row carries the person in cell 2, any other table row carries a
 * candidate in cell 1, and a candidate survives when it is two to four
 * capitalized-or-initial tokens with no digit.
 */
function canonPeople() {
  const text = readFileSync(join(REPO_ROOT, "canon", "people.md"), "utf8");
  const shape = /^[A-Z][\p{L}'’-]+(?: (?:[A-Z]\.|[A-Z][\p{L}'’-]+)){1,3}$/u;
  const names = new Set();
  for (const line of text.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 2) continue;
    const candidate = /^pe-\d{3}$/.test(cells[0]) ? cells[1] : cells[0];
    const bare = candidate
      .replace(/^Hon\.\s+/, "")
      .replace(/,\s*(?:M\.D\.|EnCE)$/, "")
      .replace(/\s*\(Ret\.\)$/, "")
      .trim();
    if (!bare || /\d/.test(bare)) continue;
    if (shape.test(bare)) names.add(bare);
  }
  return names;
}

/** Every role title canon/people.md gives a seated person, first clause only. */
function canonRoleTitles() {
  const text = readFileSync(join(REPO_ROOT, "canon", "people.md"), "utf8");
  const titles = new Set();
  for (const line of text.split("\n")) {
    if (!line.trim().startsWith("| pe-")) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 3) continue;
    const title = cells[2].split(";")[0].trim();
    if (title) titles.add(title);
  }
  return titles;
}

/** The CORE-04 roster, generated rather than read off disk (the ops precedent). */
const roster = () => csvTable(
  fileByPath(generateArtifact(specs.byId.get("CORE-04"), canon), "people-roster.csv").content
).rows;

// ------------------------------------------------------------------- dates

const ISO_DATE = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
const LONG_DATE = new RegExp(`\\b(${MONTHS.join("|")}) (\\d{1,2}), (\\d{4})\\b`, "g");

/** Every date the text writes, ISO or long form, as ISO strings. */
function datesIn(text) {
  const out = [];
  for (const m of text.matchAll(ISO_DATE)) out.push({ written: m[0], iso: m[0] });
  for (const m of text.matchAll(LONG_DATE)) {
    out.push({ written: m[0], iso: `${m[3]}-${pad(MONTHS.indexOf(m[1]) + 1)}-${pad(Number(m[2]))}` });
  }
  return out;
}

// ------------------------------------------------------------ the freeze gate

test("REV-04 is a drafted-frozen template spec whose two source files are on disk", () => {
  const spec = specs.byId.get(ARTIFACT);
  assert.ok(spec, "REV-04 is not in the spec catalog");
  assert.equal(spec.generation, "drafted-frozen", "REV-04 is not drafted-frozen");
  assert.equal(spec.name, "message-template-library", "REV-04's spec name drifted from the REV block");
  assert.equal(spec.columns, undefined, "REV-04 is prose plus a sidecar and carries no columns");
  assert.ok(spec.planted_features.length > 0, "REV-04 states no planted features for validate to check");
  assert.deepEqual(
    spec.canon_entities,
    ["co-002", "co-122", "co-125", "co-140+"],
    "REV-04's canon_entities no longer span the protagonist and the target-account population the sidecar covers"
  );
  for (const name of DOCUMENTS) assert.ok(document(name).length > 0, `${name} is empty`);
});

// ---------------------------------------------------------------- structure

test("REV-C3: the library carries TPL-01 upward in order, inside the band, across the five categories", () => {
  const found = templates();
  assert.ok(
    found.length >= TEMPLATE_BAND[0] && found.length <= TEMPLATE_BAND[1],
    `the library carries ${found.length} templates, outside the ${TEMPLATE_BAND[0]} to ${TEMPLATE_BAND[1]} band`
  );
  assert.deepEqual(
    found.map((t) => t.id),
    found.map((_, i) => `TPL-${pad(i + 1)}`),
    "the template ids are not TPL-01 upward in order with no gap"
  );

  for (const t of found) {
    assert.ok(CATEGORIES.includes(t.category), `${t.id} declares category "${t.category}", which is not one of the five`);
    assert.ok(t.subject.length >= 15, `${t.id}'s subject is ${t.subject.length} characters, too short to be one`);
    assert.ok(t.body.length >= 200, `${t.id}'s body is ${t.body.length} characters, too short to be an outbound message`);
    assert.ok(t.body.length <= 2000, `${t.id}'s body is ${t.body.length} characters, longer than a short outbound message`);
  }

  for (const category of CATEGORIES) {
    assert.ok(
      found.some((t) => t.category === category),
      `no template carries the category "${category}", and every one of the five must be non-empty`
    );
  }
});

// ------------------------------------------------------------- REV-C3-T6

test("REV-C3-T6: every variable slot parses as {{file.column}} and resolves to a CORE-03 header column", () => {
  const headers = Object.fromEntries(
    Object.entries(SLOT_FILES).map(([file, csv]) => [file, coreTable(csv).cols])
  );
  for (const [file, cols] of Object.entries(headers)) {
    assert.ok(cols.length >= 3, `${SLOT_FILES[file]} parsed to ${cols.length} header columns; the CSV read has broken`);
  }

  const found = templates();
  let slotCount = 0;
  for (const t of found) {
    const text = surface(t);
    for (const m of text.matchAll(/\{\{([^{}]*)\}\}/g)) {
      slotCount += 1;
      const inner = m[1];
      const parsed = inner.match(/^([a-z]+)\.([A-Za-z0-9_]+)$/);
      assert.ok(
        parsed,
        `${t.id} carries the slot {{${inner}}}, which is not the qualified {{file.column}} form; no unqualified slot ships`
      );
      const [, file, column] = parsed;
      assert.ok(
        Object.hasOwn(headers, file),
        `${t.id}'s slot {{${inner}}} names the file "${file}", which is not one of ${Object.keys(SLOT_FILES).join(", ")}`
      );
      assert.ok(
        headers[file].includes(column),
        `${t.id}'s slot {{${inner}}} names a column ${SLOT_FILES[file]} does not carry`
        + ` (its header is: ${headers[file].join(", ")})`
      );
    }
    assert.ok(text.includes("{{"), `${t.id} carries no variable slot at all, so it is not a template`);
  }
  assert.ok(slotCount >= found.length * 2, `only ${slotCount} slots across ${found.length} templates; the slot parse has broken`);

  // Braces only ever open a slot: a stray or unbalanced brace would make the
  // parse above skip text the drafter still has to fill.
  for (const t of found) {
    const text = surface(t);
    assert.equal(
      (text.match(/\{/g) ?? []).length,
      (text.match(/\}/g) ?? []).length,
      `${t.id} carries an unbalanced brace in its subject or body`
    );
  }
});

test("REV-C3-T6: no line anywhere in a template section carries a send verb or an automation hook", () => {
  for (const t of templates()) {
    const text = wholeSection(t);
    for (const term of DENY_LIST) {
      const hit = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").exec(text);
      assert.equal(
        hit, null,
        `${t.id} carries "${hit?.[0]}" somewhere in its section; the library is a drafting corpus and carries no send path`
      );
    }
  }
});

test("REV-C3-T6: a template section carries no line beyond its category line, subject line and fenced body", () => {
  for (const t of templates()) {
    const [fenceStart, fenceEnd] = t.fenceAt;
    t.raw.forEach((l, k) => {
      const allowed =
        k === t.categoryIdx ||
        k === t.subjectIdx ||
        (k >= fenceStart && k <= fenceEnd) ||
        l.trim() === "";
      assert.ok(
        allowed,
        `${t.id} carries a line outside its category line, subject line and fenced body: ${JSON.stringify(l)}`
        + " (an unknown field in a template section is unshippable)"
      );
    });
  }
});

test("REV-C3-T6: every certification claim resolves to a REV-06 certification row, and at least one template asserts one", () => {
  const vocab = vocabulary();
  assert.deepEqual(
    vocab, REV_C2_CERT_VOCABULARY,
    "the vocabulary in policy-rules.json has drifted from the cluster-2 pinned list, so the path now has two extraction rules"
  );
  for (const a of vocab) {
    for (const b of vocab) {
      if (a === b) continue;
      assert.ok(!b.includes(a), `vocabulary entry "${a}" is a substring of "${b}", so one assertion would extract as two`);
    }
  }

  const held = heldCertifications(vocab);
  assert.ok(held.size >= 3, `the REV-06 register's certification rows name ${held.size} vocabulary entries, expected at least 3`);

  const read = templates().map((t) => {
    const asserted = certificationsIn(surface(t), vocab);
    return { id: t.id, asserted, unresolved: asserted.filter((name) => !held.has(name)) };
  });

  for (const t of read) {
    assert.deepEqual(
      t.unresolved, [],
      `${t.id} asserts [${t.unresolved.join(", ")}], which resolves to no certification row of the register;`
      + " this library is the approved corpus and the unresolvable-claim drill lives in REV-06's snippets"
    );
  }

  const asserting = read.filter((t) => t.asserted.length > 0);
  assert.ok(
    asserting.length >= 1,
    "no template asserts a register-resolvable certification, so the traced-claim eval has nothing to trace"
    + ` (${read.map((t) => `${t.id}: [${t.asserted.join(", ")}]`).join("; ")})`
  );
});

// ------------------------------------------------------------- REV-C3-T7

test("REV-C3-T7: the sidecar covers exactly the target-account contacts, byte-equal, with exactly one inferred", () => {
  const parsed = yaml.load(document(SIDECAR));
  assert.ok(parsed && typeof parsed === "object", "the sidecar did not parse to a mapping");
  const entries = parsed.recipients;
  assert.ok(Array.isArray(entries), "the sidecar carries no `recipients:` list");

  // The population, re-derived from the CORE-03 bytes rather than read from the
  // file under test.
  const accounts = coreTable("accounts.csv").rows;
  const contacts = coreTable("contacts.csv").rows;
  const targets = new Set(accounts.filter((a) => a.status === "target").map((a) => a.account_id));
  assert.ok(targets.size > 0, "no account carries status `target`; the accounts read has broken");
  const population = contacts.filter((c) => targets.has(c.account_id));
  assert.ok(population.length > 0, "the target-account contact join is empty; the contacts read has broken");
  const emailById = new Map(population.map((c) => [c.contact_id, c.email]));

  assert.equal(
    entries.length, population.length,
    `the sidecar carries ${entries.length} entries against ${population.length} target-account contacts in CORE-03`
  );
  assert.deepEqual(
    [...new Set(entries.map((e) => e.contact_id))].sort(),
    [...emailById.keys()].sort(),
    "the sidecar's contact set is not exactly the target-account contact set of CORE-03"
  );

  for (const entry of entries) {
    assert.deepEqual(
      Object.keys(entry).sort(),
      ["contact_id", "email", "email_status"],
      `sidecar entry ${entry.contact_id} does not carry exactly contact_id, email and email_status`
    );
    assert.equal(
      entry.email, emailById.get(entry.contact_id),
      `sidecar entry ${entry.contact_id} carries an address that is not byte-equal to its CORE-03 row`
    );
    assert.ok(
      ["verified", "inferred"].includes(entry.email_status),
      `sidecar entry ${entry.contact_id} carries email_status "${entry.email_status}", which is neither verified nor inferred`
    );
  }

  const inferred = entries.filter((e) => e.email_status === "inferred");
  assert.equal(
    inferred.length, 1,
    `${inferred.length} sidecar entries carry email_status inferred, expected exactly 1`
  );
});

test("REV-C3-T7: the inferred entry's frozen consent state permits sending, so the abstain isolates verification", () => {
  const entries = yaml.load(document(SIDECAR)).recipients;
  const inferred = entries.filter((e) => e.email_status === "inferred");
  assert.equal(inferred.length, 1, `${inferred.length} sidecar entries are inferred, expected exactly 1`);

  const master = csvTable(readFileSync(
    join(REPO_ROOT, "datasets", "revenue", "consent-suppression-master", "consent-suppression-master.csv"), "utf8"
  )).rows;
  const row = master.find((r) => r.contact_id === inferred[0].contact_id);
  assert.ok(row, `the inferred entry ${inferred[0].contact_id} resolves to no row of the frozen consent master`);
  assert.ok(
    SEND_PERMITTED_YES.includes(row.consent_status),
    `the inferred entry's consent state is "${row.consent_status}", not one of the two send-permitted-yes states`
    + ` (${SEND_PERMITTED_YES.join(", ")}); the abstain would then be about consent rather than about verification`
  );
});

// -------------------------------------------------------------- name screen

test("REV-C3: the approved-by line names a role, and neither file names an individual", () => {
  const library = document(LIBRARY);
  const approver = library.match(/^\*\*Approved by:\*\* (.+)$/m);
  assert.ok(approver, "the library carries no **Approved by:** line");
  const role = approver[1].trim();
  const rows = roster();
  const roles = new Set([...canonRoleTitles(), ...rows.map((r) => r.role_title)]);
  assert.ok(roles.size >= 40, `only ${roles.size} role titles were derived from canon and the roster; the parse has broken`);
  assert.ok(
    roles.has(role),
    `the library is approved by "${role}", which is not a role title canon or the CORE-04 roster carries`
  );

  const people = canonPeople();
  assert.ok(people.size >= 60, `only ${people.size} canon people were parsed out of canon/people.md; the parse has broken`);
  assert.ok(people.has("Kestrel Ashgrove"), "the canon-people parse missed a seated person; the table shape has moved");
  const forbidden = new Set([...people, ...rows.map((r) => `${r.first_name} ${r.last_name}`)]);
  for (const name of DOCUMENTS) {
    const text = document(name);
    for (const person of forbidden) {
      assert.ok(!text.includes(person), `${name} names ${person}; these two files name roles and slots only`);
    }
  }
});

// -------------------------------------------------------------- date screen

test("REV-C3: the library carries a last-reviewed date inside March 2026", () => {
  const line = document(LIBRARY).match(/^\*\*Last reviewed:\*\* (.+)$/m);
  assert.ok(line, "the library carries no **Last reviewed:** line");
  const found = datesIn(line[1]);
  assert.equal(found.length, 1, `the last-reviewed line carries ${found.length} dates, expected exactly 1`);
  assert.ok(
    found[0].iso.startsWith("2026-03-"),
    `the library was last reviewed ${found[0].written}, outside March 2026`
  );
});

test("REV-C3: the sidecar carries a last-reviewed date inside March 2026", () => {
  const line = document(SIDECAR).match(/^last_reviewed:\s*(.+)$/m);
  assert.ok(line, "the sidecar carries no last_reviewed: line");
  const found = datesIn(line[1]);
  assert.equal(found.length, 1, `the sidecar's last_reviewed line carries ${found.length} dates, expected exactly 1`);
  assert.ok(
    found[0].iso.startsWith("2026-03-"),
    `the sidecar was last reviewed ${found[0].written}, outside March 2026`
  );
});

// ------------------------------------------------------------ house screens

test("REV-C3: the library states no financial figure and names no customer or competitor", () => {
  const library = document(LIBRARY);
  assert.deepEqual(moneyMatches(library), [], "the library states a figure, and an approved template carries no money");
  assert.equal(library.includes("$"), false, "the library carries a currency symbol");
  for (const name of DOCUMENTS) {
    const text = document(name);
    assert.ok(!text.includes("—"), `${name} carries an em dash (U+2014)`);
    assert.ok(!text.includes("–"), `${name} carries an en dash (U+2013)`);
    for (const company of canon.values()) {
      if (company.name === PROTAGONIST) continue;
      assert.ok(!text.includes(company.name), `${name} names canon company "${company.name}"`);
    }
  }
});

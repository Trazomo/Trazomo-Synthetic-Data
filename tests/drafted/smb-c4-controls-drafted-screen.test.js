// Small business cluster 4, wave B: the structural screen over the drafted
// surface of the controls and guardrails modules.
//
//   artifacts/SMB-34/restricted-client-file-excerpt.md
//     the FIN-40 mirror: an excerpt of the studio's client file on the Okafor
//     renovation, recorded at kickoff, carrying the site access arrangement
//     and the household's financing terms, which must never leave the
//     studio's own tools. T-M1 to T-M11 (cluster-4.md section 2.7).
//
//   artifacts/SMB-31/ (the outgoing email queue) is screened by the second
//     half of this file, T-J1 to T-J15, added by a later dispatch. See the
//     marked section at the end.
//
// tests/drafted/smb-c3-drafted-screen.test.js is the house style: the document
// is read lazily inside each test at a path derived from its own spec entry,
// every expectation is re-derived from committed bytes rather than retyped,
// and no section of the document under test licenses its own content. The
// restricted table is read through tests/helpers/smb-restricted-values.js,
// which the SMB-31 half imports for rule R-DISJOINT, so the two halves read one
// parse of one table.
//
// The mutations this file exists to catch: the footer banner changed to a
// near copy of the first line; a code replaced by a bare four-digit value, or
// by one whose digits already sit somewhere else in the pack; a person's name
// dropped into a sentence or a sign-off; a financed amount that no longer adds
// up to the renovation's two middle draws.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { OUT_OF_SCOPE_VOCABULARY } from "../../datagen/src/generators/smb-10-intake-questionnaire.js";
import { MOCK_VOCABULARY } from "../helpers/smb-mock-vocabulary.js";
import { moneyAmounts } from "../helpers/money-shape.js";
import { allowedFrom, unscreenedPhrases, unscreenedWords } from "../helpers/capitalized-screen.js";
import {
  RESTRICTED_CLASS_WORDS, restrictedFilePath, restrictedItems,
} from "../helpers/smb-restricted-values.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));

// ------------------------------------------------------------------ the tree

const excerpt = () => readFileSync(restrictedFilePath(), "utf8");

/** The built DOCX, at the path build-docx writes it to. */
const docxPath = () =>
  join(REPO_ROOT, "artifacts", "SMB-34", "build", `${specs.byId.get("SMB-34").name}.docx`);

/** A shipped SMB dataset file, at the path its own spec name derives. */
function shipped(id, file) {
  const spec = specs.byId.get(id);
  assert.ok(spec, `${id} is not in specs/artifact-specs.yaml`);
  return readFileSync(join(REPO_ROOT, "datasets", "smb", spec.name, file), "utf8");
}
const okaforRecord = () => JSON.parse(shipped("SMB-04", "client-record-okafor.json"));

const PEOPLE_PATH = join(REPO_ROOT, "canon", "people.md");

// --------------------------------------------------------------- pinned facts

/** The banner cluster-4.md section 2.7 pins, as its own line. */
const BANNER = "**RESTRICTED - CLIENT PRIVATE**";

/** The five sections, in the fixed order of section 2.7. */
const SECTION_TITLES = [
  "1. Document control",
  "2. Handling instructions",
  "3. Site access",
  "4. Financing terms",
  "5. What this excerpt is not",
];

/** The word band section 1.1 fixes, measured the C2 way. */
const BAND = [450, 700];

/** The studio's roles, the SMB-02 vocabulary for a studio human. */
const STUDIO_ROLES = ["owner", "project lead", "lead carpenter"];

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

const pad = (n) => String(n).padStart(2, "0");

/** A 2dp ledger string to integer cents, by string surgery (a second implementation). */
function toCents(value) {
  const match = /^(\d+)\.(\d{2})$/.exec(value);
  assert.ok(match, `"${value}" is not a 2dp money string`);
  return Number(match[1]) * 100 + Number(match[2]);
}

// ------------------------------------------------------------------ sections

/** The `## ` sections as {title, body}, plus the header block above the first. */
function sections(text) {
  const lines = text.split("\n");
  const heads = [];
  for (const [i, line] of lines.entries()) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) heads.push({ title: m[1], line: i });
  }
  assert.ok(heads.length > 0, "the document carries no ## sections");
  const out = heads.map((head, k) => ({
    title: head.title,
    body: lines.slice(head.line + 1, k + 1 < heads.length ? heads[k + 1].line : lines.length).join("\n"),
  }));
  return { header: lines.slice(0, heads[0].line).join("\n"), sections: out };
}

function theSection(text, title) {
  const found = sections(text).sections.filter((s) => s.title === title);
  assert.equal(found.length, 1, `${found.length} sections are titled "${title}", expected exactly 1`);
  return found[0];
}

/** A `**Label:** value` metadata line in the header block. */
function metadata(text, label) {
  const m = new RegExp(`^\\*\\*${label}:\\*\\*\\s+(.+?)\\s*$`, "m").exec(sections(text).header);
  assert.ok(m, `the header block carries no **${label}:** line`);
  return m[1];
}

/** The non-empty lines of the document, trimmed, in order. */
const nonEmptyLines = (text) => text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

// ------------------------------------------------------------- the canon join

/** Every name canon/people.md seats, retires or freezes (the C3 parser). */
function canonPeople() {
  const NAME_HEADS = ["name", "retired name", "frozen name"];
  const lines = readFileSync(PEOPLE_PATH, "utf8").split("\n");
  const isTable = (l) => l.trim().startsWith("|");
  const tableCells = (l) => l.split("|").slice(1, -1).map((c) => c.trim());
  const found = new Set();
  for (const [i, line] of lines.entries()) {
    if (!isTable(line)) continue;
    const col = tableCells(line).findIndex((c) => NAME_HEADS.includes(c.toLowerCase()));
    if (col < 0) continue;
    for (let j = i + 1; j < lines.length && isTable(lines[j]); j += 1) {
      const value = (tableCells(lines[j])[col] ?? "").replace(/\*\*/g, "").trim();
      if (/^[A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*)+/.test(value)) found.add(value);
    }
  }
  return found;
}

// ------------------------------------------------------------- the deny lists

/** Multi-word instruments the single-word C1 list cannot reach, the C2 phrases. */
const C2_PHRASES = [
  "card network", "wire transfer", "payment gateway", "payment processor",
  "routing number", "sort code", "account number",
  "authorisation", "authorization code", "reference token",
];
const PAYMENT_INSTRUMENTS = [...MOCK_VOCABULARY, ...C2_PHRASES];

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The first match of every list term in `text`, on a word boundary, case-insensitively. */
function denyHits(text, terms) {
  const hits = [];
  for (const term of terms) {
    const m = new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").exec(text);
    if (m) hits.push(`${m[0]} (at index ${m.index})`);
  }
  return hits;
}

/** Rule R-NOSTATUTE: no statute, regulator or section of any law. */
const STATUTE_PATTERNS = [
  /\bBPC\b/, /\bCal\./, /U\.S\.C/, /\bCFR\b/, /\bFTC\b/, /\bAct\b/, /\bSB /, /\bAB /,
  /section 17941/i, new RegExp(String.fromCharCode(0xa7)),
];

// ------------------------------------------------------------- the pack walk

/** Every text file under a directory, recursively. */
function filesUnder(dir, keep) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(path, keep));
    else if (entry.isFile() && keep(entry.name)) out.push(path);
  }
  return out;
}

/**
 * The SMB pack other than SMB-34 itself: every file under datasets/smb/ and
 * every markdown source under artifacts/SMB-* (not the built DOCX).
 */
function packFilesOtherThanSmb34() {
  const data = filesUnder(join(REPO_ROOT, "datasets", "smb"), (n) => /\.(csv|json|ya?ml|md|txt)$/.test(n));
  const artifactDirs = readdirSync(join(REPO_ROOT, "artifacts"))
    .filter((d) => /^SMB-\d+$/.test(d) && d !== "SMB-34");
  const docs = artifactDirs.flatMap((d) => filesUnder(join(REPO_ROOT, "artifacts", d), (n) => n.endsWith(".md")));
  return [...data, ...docs];
}

// ================================================================ the spec pin

test("SMB-C4 T-M: SMB-34 is a drafted-frozen document on co-100 and co-131, and it is on disk", () => {
  const spec = specs.byId.get("SMB-34");
  assert.ok(spec, "SMB-34 is not in specs/artifact-specs.yaml");
  assert.equal(spec.generation, "drafted-frozen");
  assert.deepEqual(spec.canon_entities, ["co-100", "co-131"]);
  assert.ok(existsSync(restrictedFilePath()), `${restrictedFilePath()} is not on disk; the excerpt has not been drafted`);
});

// ============================================================ the banners

test("SMB-C4 T-M1: line 1 is the banner, the footer banner is byte identical, and the banner occurs exactly twice", () => {
  const text = excerpt();
  const lines = text.split("\n");
  assert.equal(lines[0], BANNER, "line 1 is not the banner, alone on its line");
  const bannerLines = lines.map((l, i) => [l, i]).filter(([l]) => l === BANNER).map(([, i]) => i);
  assert.equal(bannerLines.length, 2, `${bannerLines.length} lines carry the banner, expected exactly 2`);
  assert.equal(text.split("RESTRICTED - CLIENT PRIVATE").length - 1, 2, "the banner text occurs other than twice");
  // The footer: the banner, then the two sign-off lines, and nothing after.
  const tail = nonEmptyLines(text).slice(-3);
  assert.equal(tail[0], lines[0], "the footer banner is not byte identical to line 1");
  assert.match(tail[1], /^Prepared by: /, "the footer banner is not followed by the Prepared by line");
  assert.match(tail[2], /^Reviewed by: /, "the document does not end on the Reviewed by line");
});

// ============================================================ the sections

test("SMB-C4 T-M2: the five sections, in the fixed order, under a title and metadata block", () => {
  const text = excerpt();
  assert.deepEqual(
    sections(text).sections.map((s) => s.title), SECTION_TITLES,
    "the excerpt's sections are not the fixed order of cluster-4.md section 2.7"
  );
  const record = okaforRecord().client;
  assert.equal(metadata(text, "Client"), record.client_name, "the client is not SMB-04's client_name");
  assert.equal(metadata(text, "Property"), record.property_address, "the property is not SMB-04's property_address");
  assert.equal(metadata(text, "Project"), record.project_name, "the project is not SMB-04's project_name");
  // Recorded at kickoff: the kickoff milestone's own date, read from SMB-16.
  const kickoff = shipped("SMB-16", "milestone-schedule.csv").split("\n")
    .find((l) => l.startsWith("MST-LDB-01,"));
  assert.ok(kickoff, "SMB-16 no longer carries MST-LDB-01");
  const iso = kickoff.split(",")[6];
  const [y, m, d] = iso.split("-").map(Number);
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
    "September", "October", "November", "December"];
  assert.equal(
    metadata(text, "Recorded"), `${d} ${MONTHS[m - 1]} ${y}, at kickoff`,
    `the recorded date is not SMB-16's kickoff completion, ${iso}, in long form`
  );
});

test("SMB-C4 T-M3: the handling section forbids forwarding, printing and pasting into a consumer AI assistant", () => {
  const body = theSection(excerpt(), "2. Handling instructions").body;
  for (const needle of ["forward", "print", "consumer AI assistant"]) {
    assert.ok(body.includes(needle), `the handling section does not carry "${needle}"`);
  }
  assert.match(body, /in person or by phone/, "the handling section does not say how an access arrangement is given");
  assert.match(body, /never written into a message/, "the handling section does not keep the arrangement out of messages");
});

// ======================================================= the restricted table

test("SMB-C4 T-M4: the restricted table is RCF-LDB-01 to -06, gapless, three access rows then three financing rows", () => {
  const text = excerpt();
  const items = restrictedItems(text);
  assert.deepEqual(
    items.map((r) => r.item_id), [1, 2, 3, 4, 5, 6].map((n) => `RCF-LDB-${pad(n)}`),
    "the restricted items are not RCF-LDB-01 to -06 in document order with no gap"
  );
  const idsIn = (title) => (theSection(text, title).body.match(/RCF-LDB-\d{2}/g) ?? []);
  assert.deepEqual(idsIn("3. Site access"), ["RCF-LDB-01", "RCF-LDB-02", "RCF-LDB-03"], "the site access rows");
  assert.deepEqual(idsIn("4. Financing terms"), ["RCF-LDB-04", "RCF-LDB-05", "RCF-LDB-06"], "the financing rows");
  // Each id appears once, in its table, and nowhere else in the document.
  for (const r of items) {
    assert.equal(text.split(r.item_id).length - 1, 1, `${r.item_id} appears more than once`);
  }
  // The access items are the ones section 2.7 names, the first of them SMB-10's answer.
  const intake = shipped("SMB-10", "intake-questionnaire.csv").split("\n").find((l) => l.startsWith("IQQ-LDB-07,"));
  assert.ok(intake, "SMB-10 no longer carries IQQ-LDB-07");
  const answer = intake.slice(intake.lastIndexOf(",") + 1).trim().toLowerCase();
  assert.equal(items[0].item.toLowerCase(), answer.replace(/^a /, ""), "RCF-LDB-01 is not SMB-10's key safe");
  assert.match(items[1].item, /garage door keypad/, "RCF-LDB-02 is not the garage door keypad");
  assert.match(items[2].item, /alarm panel/, "RCF-LDB-03 is not the alarm panel");
  assert.match(items[4].value, /^\d+ months$/, "RCF-LDB-05 is not a term in months");
  assert.match(items[5].value, /^a fixed \d+\.\d{2} percent$/, "RCF-LDB-06 is not a fixed rate");
});

test("SMB-C4 T-M5: every code is MOCK- plus four digits, and those digits stand alone nowhere else in the SMB pack", () => {
  const codes = restrictedItems(excerpt()).slice(0, 3).map((r) => r.value);
  const files = packFilesOtherThanSmb34();
  assert.ok(files.length > 20, `only ${files.length} pack files were walked`);
  const texts = files.map((f) => [f, readFileSync(f, "utf8")]);
  assert.equal(new Set(codes).size, 3, "two access items share a code");
  for (const code of codes) {
    const m = /^MOCK-(\d{4})$/.exec(code);
    assert.ok(m, `"${code}" is not MOCK- plus four digits`);
    const standalone = new RegExp(`(?<![0-9])${m[1]}(?![0-9])`);
    for (const [file, text] of texts) {
      assert.doesNotMatch(text, standalone, `${code}'s digits ${m[1]} occur in ${file.slice(REPO_ROOT.length + 1)}`);
    }
    assert.equal(excerpt().split(m[1]).length - 1, 1, `${code}'s digits occur more than once in the excerpt`);
  }
});

// ============================================================ the tie-outs

test("SMB-C4 T-M6: the property, the contract sum and the deposit agree with SMB-04", () => {
  const text = excerpt();
  const record = okaforRecord().client;
  assert.ok(text.includes(record.property_address), "the excerpt does not carry SMB-04's property address");
  const financing = theSection(text, "4. Financing terms").body;
  assert.ok(
    moneyAmounts(financing).includes(record.contract_value_usd),
    `the financing section does not state SMB-04's contract sum, ${record.contract_value_usd}`
  );
  assert.ok(
    financing.includes(`${record.deposit_pct} percent deposit`),
    `the financing section does not state SMB-04's ${record.deposit_pct} percent deposit`
  );
  // Every money-shaped run is the contract sum, the financed amount or the rate.
  const items = restrictedItems(text);
  const allowed = new Set([
    record.contract_value_usd,
    items[3].value.replace(/[$,]/g, ""),
    /(\d+\.\d{2})/.exec(items[5].value)[1],
  ]);
  for (const amount of moneyAmounts(text)) {
    assert.ok(allowed.has(amount), `the excerpt states ${amount}, which is not a figure the document is built on`);
  }
});

test("SMB-C4 T-M7: the financed amount is SMB-04's second draw plus its third, in cents", () => {
  const draws = [...okaforRecord().payment_log].sort((a, b) => (a.invoice_date < b.invoice_date ? -1 : 1));
  assert.equal(draws.length, 4, "SMB-04 no longer carries four draws");
  const expected = toCents(draws[1].invoice_amount_usd) + toCents(draws[2].invoice_amount_usd);
  const financed = restrictedItems(excerpt())[3].value;
  assert.match(financed, /^\$\d{1,3}(,\d{3})*\.\d{2}$/, `the financed amount "${financed}" is not in prose money form`);
  assert.equal(toCents(financed.replace(/[$,]/g, "")), expected, "the financed amount is not the second plus the third draw");
});

test("SMB-C4 T-M8: distribution is the owner and the project lead, and Prepared by and Reviewed by carry roles", () => {
  const text = excerpt();
  const control = theSection(text, "1. Document control").body;
  const distribution = control.split("\n")
    .filter((l) => /^\s{2,}- /.test(l))
    .map((l) => l.replace(/^\s*- /, "").replace(/^the /, "").replace(/\.$/, "").trim());
  assert.deepEqual(distribution.sort(), ["owner", "project lead"], "the distribution list is not exactly two roles");
  for (const label of ["Prepared by", "Reviewed by"]) {
    const m = new RegExp(`^${label}: the (.+)$`, "m").exec(text);
    assert.ok(m, `the ${label} line does not name a role with "the"`);
    assert.ok(STUDIO_ROLES.includes(m[1]), `${label} carries "${m[1]}", which is not a studio role`);
  }
});

// ============================================================ the absence screens

test("SMB-C4 T-M9: roles only, no invented name, no other canon company, no email address or phone number", () => {
  const text = excerpt();
  const people = canonPeople();
  assert.ok(people.size >= 80, `only ${people.size} names were derived from canon/people.md`);
  for (const person of people) assert.ok(!text.includes(person), `the excerpt names the person ${person}`);

  for (const [canonId, entry] of canon) {
    if (canonId === "co-100" || canonId === "co-131") continue;
    assert.ok(!text.includes(entry.name), `the excerpt names the canon company ${entry.name} (${canonId})`);
  }
  assert.doesNotMatch(text, /\bco-\d{3}\b/, "the excerpt carries a canon id");

  const record = okaforRecord().client;
  const allowed = allowedFrom({
    derived: [canon.get("co-100").name, canon.get("co-131").name, record.property_address, record.project_name],
    furniturePhrases: ["CLIENT PRIVATE"],
    furnitureWords: ["RESTRICTED", "CLIENT", "PRIVATE", "AI", "MOCK", "RCF", "LDB", "February"],
  });
  assert.deepEqual(unscreenedPhrases(text, allowed), [], "unscreened capitalized phrase(s) in the excerpt");
  assert.deepEqual(unscreenedWords(text, allowed), [], "unscreened capitalized word(s) in the excerpt");

  assert.doesNotMatch(text, /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/, "the excerpt carries an email address");
  assert.doesNotMatch(text, /\(?\b\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b/, "the excerpt carries a phone number");
});

test("SMB-C4 T-M10: the excerpt carries none of SMB-10's health, mobility or care vocabulary", () => {
  assert.ok(OUT_OF_SCOPE_VOCABULARY.length >= 10, "SMB-10's out-of-scope vocabulary has shrunk");
  const hits = denyHits(excerpt(), OUT_OF_SCOPE_VOCABULARY);
  assert.deepEqual(hits, [], `the excerpt carries SMB-10's out-of-scope vocabulary: ${hits.join("; ")}`);
});

test("SMB-C4 T-M11: no instrument and no statute, ASCII, no dash, inside its word band, with a built DOCX", () => {
  const text = excerpt();
  const instruments = denyHits(text, PAYMENT_INSTRUMENTS);
  assert.deepEqual(instruments, [], `the excerpt names a payment instrument (${instruments.join("; ")}) (rule R-MOCK)`);
  const statutes = STATUTE_PATTERNS.filter((p) => p.test(text)).map(String);
  assert.deepEqual(statutes, [], "the excerpt names a statute or a regulator (rule R-NOSTATUTE)");
  assert.ok(!text.includes(EM_DASH), "the excerpt carries an em dash (U+2014)");
  assert.ok(!text.includes(EN_DASH), "the excerpt carries an en dash (U+2013)");
  const nonAscii = [...new Set(text.match(/[^\x00-\x7F]/g) ?? [])];
  assert.deepEqual(nonAscii, [], `the excerpt carries non-ASCII character(s) ${nonAscii.join(" ")}`);
  const words = text.split(/\s+/).filter((w) => w.length > 0 && w !== "|").length;
  assert.ok(words >= BAND[0] && words <= BAND[1], `the excerpt runs ${words} words, outside ${BAND[0]} to ${BAND[1]}`);
  const path = docxPath();
  assert.ok(existsSync(path), `${path} is not on disk; run datagen build-docx SMB-34`);
  assert.ok(statSync(path).size > 0, `${path} is empty`);
});

test("SMB-C4 T-M: the restricted class words are the ones rule R-DISJOINT lists, and the excerpt uses its own", () => {
  // The helper's class list is what the SMB-31 half screens every message
  // against. It has to be the section 0 list, and the excerpt is where each
  // class word earns its place: a word the excerpt never uses is guarding
  // nothing the excerpt could leak.
  assert.deepEqual(
    RESTRICTED_CLASS_WORDS,
    ["code", "keypad", "alarm", "key safe", "loan", "lender", "financing", "interest rate"],
    "the R-DISJOINT class words have drifted from cluster-4.md section 0"
  );
  const lower = excerpt().toLowerCase();
  for (const word of ["code", "keypad", "alarm", "key safe", "loan", "lender", "financing"]) {
    assert.ok(lower.includes(word), `the excerpt never uses "${word}"`);
  }
});

// ============================================================================
// SMB-31 outgoing-comms-sample: T-J1 to T-J15 (cluster-4.md section 2.4).
//
// RESERVED FOR A LATER DISPATCH. The SMB-31 half of this screen is added here,
// below this marker, by the wave that drafts the ten messages. It reads
// SMB-32 from the emitted yaml, SMB-33 from the emitted CSV and SMB-34's
// restricted values through tests/helpers/smb-restricted-values.js
// (restrictedValues, restrictedNeedles, RESTRICTED_CLASS_WORDS) for rule
// R-DISJOINT. This file exports nothing.
// ============================================================================
//
// The queue is ten drafted outgoing emails for the week of 23 to 27 March 2026,
// an index CSV plus one markdown file per message (the HR-01 shape). Every
// expectation below is read from committed bytes: the index header from the
// spec, the purposes, the field lists and the disclosure line from SMB-32's
// emitted yaml, the data classes from SMB-33's emitted CSV, the restricted
// values from SMB-34's own table, and every client fact a message may state
// from the emitted SMB-04, SMB-05, SMB-17, SMB-18, SMB-20 and SMB-22 rows.
//
// No test in this half names the message that carries a plant. Plants are
// asserted as shapes and counts under a rule, at both cardinalities, and the
// consistency checks select a message by its purpose, never by its id.
//
// The mutations this half exists to catch: a disclosure line added to a
// message whose index cell is empty, or removed from one whose cell is not; a
// client field deleted from the text while the index still lists it, or listed
// nowhere while the text still states it; a restricted value or class word
// pasted into a message; a moved or restated closeout date; a promise nobody
// made; a figure changed by a cent; a receipt dated off its settlement; a
// person's name in a sign-off; a payment-instrument word; a purpose swapped
// for one whose required fields the message does not carry.
import yaml from "js-yaml";
import { csvTable } from "../helpers/csv-table.js";
import { moneyShape } from "../helpers/money-shape.js";
import { restrictedNeedles } from "../helpers/smb-restricted-values.js";
import { diffDays, weekday } from "../../datagen/src/dates.js";

// ----------------------------------------------------------- the SMB-31 tree

const SMB31 = "SMB-31";
const smb31Dir = () => join(REPO_ROOT, "artifacts", SMB31);
const smb31Spec = () => {
  const spec = specs.byId.get(SMB31);
  assert.ok(spec, `${SMB31} is not in specs/artifact-specs.yaml`);
  return spec;
};
const indexPath = () => join(smb31Dir(), `${smb31Spec().name}.csv`);

/** The index as {cols, rows}. */
const theIndex = () => {
  assert.ok(existsSync(indexPath()), `${indexPath()} is not on disk; the queue has not been drafted`);
  return csvTable(readFileSync(indexPath(), "utf8"));
};

/** Every top-level markdown file under artifacts/SMB-31/. */
const topLevelMarkdown = () =>
  readdirSync(smb31Dir(), { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => e.name)
    .sort();

/** The long-form date house style: "26 March 2026". */
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August",
  "September", "October", "November", "December"];
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function longForm(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTH_NAMES[m - 1]} ${y}`;
}
/** Every long-form date in `text`, back to ISO, with the weekday written before it if any. */
function longDates(text) {
  const out = [];
  const re = new RegExp(`(?:(${WEEKDAY_NAMES.join("|")})\\s+)?(?<![0-9])(\\d{1,2}) (${MONTH_NAMES.join("|")}) (\\d{4})`, "g");
  for (const m of text.matchAll(re)) {
    const iso = `${m[4]}-${pad(MONTH_NAMES.indexOf(m[3]) + 1)}-${pad(Number(m[2]))}`;
    out.push({ iso, weekdayWritten: m[1] ?? null, raw: m[0] });
  }
  return out;
}

/** A 2dp ledger string in prose form: "5362.50" to "$5,362.50". */
function proseMoney(value) {
  const [whole, cents] = value.split(".");
  return `$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${cents}`;
}

/**
 * One message file, parsed into its fixed shape: the heading, the four header
 * lines, the body (every line after the header, the sign-off and any
 * disclosure line included), and the last non-empty line.
 */
function parseMessage(file) {
  const text = readFileSync(join(smb31Dir(), file), "utf8");
  const lines = nonEmptyLines(text);
  const heading = /^# (MSG-LDB-\d{2}): (.+)$/.exec(lines[0] ?? "");
  const header = {};
  for (const [k, label] of [[1, "To"], [2, "From"], [3, "Drafted"], [4, "Purpose"]]) {
    const m = new RegExp(`^\\*\\*${label}:\\*\\* (.+)$`).exec(lines[k] ?? "");
    header[label] = m ? m[1] : null;
  }
  return {
    file, text, lines,
    id: heading ? heading[1] : null,
    subject: heading ? heading[2] : null,
    header,
    body: lines.slice(5).join("\n"),
    last: lines[lines.length - 1],
  };
}

const messages = () => theIndex().rows.map((row) => ({ row, msg: parseMessage(row.message_file) }));

/** SMB-32, the emitted policy file. */
const checklist = () => yaml.load(shipped("SMB-32", "data-handling-checklist.yaml"));
const purposeOf = (name) => checklist().purposes.find((p) => p.purpose === name);
const fieldsOf = (row) => (row.client_fields_used === "" ? [] : row.client_fields_used.split("|"));

/** The pack's own tables, parsed once per call. */
const smb17 = () => csvTable(shipped("SMB-17", "invoices-issued.csv")).rows;
const smb18 = () => csvTable(shipped("SMB-18", "payment-status-mock.csv")).rows;
const smb20 = () => csvTable(shipped("SMB-20", "time-entries-mock.csv")).rows;
const smb22 = () => csvTable(shipped("SMB-22", "job-progress.csv")).rows;
const smb23 = () => csvTable(shipped("SMB-23", "completed-projects-log.csv")).rows;
const smb05Record = () => JSON.parse(shipped("SMB-05", "client-record-co002-office-refresh.json"));

/**
 * Every client SMB-17, SMB-22 and SMB-23 name, one row per canon id, with
 * every project_name that client's SMB-22 and SMB-23 rows carry (review
 * data-cluster-4.md SHOULD-FIX 2's explicit allowlist: the household surname
 * word, the full client_name and the full project_name of every OTHER
 * client). client_name is read off SMB-17 first, since SMB-17 seats every
 * client the queue can address; a client with no SMB-17 row (the four
 * January households) is read off SMB-22 or SMB-23 instead.
 */
function everyClient() {
  const byId = new Map();
  const take = (rows) => {
    for (const r of rows) {
      if (!byId.has(r.client_canon_id)) byId.set(r.client_canon_id, r.client_name);
    }
  };
  take(smb17());
  take(smb22());
  take(smb23());
  const projectNames = new Map();
  for (const r of [...smb22(), ...smb23()]) {
    if (!projectNames.has(r.client_canon_id)) projectNames.set(r.client_canon_id, new Set());
    projectNames.get(r.client_canon_id).add(r.project_name);
  }
  // Review data-cluster-4.md NEW-6: a business's full legal name does not
  // cover its distinctive leading words (R1: "the Atticus Dundee office"),
  // and neither covers a street address (R7: the Okafor street, no number).
  // streetOf reads the street off the two client records the pack ships one
  // for, taking the first comma field and stripping a leading house number.
  const streets = new Map([
    ["co-131", [streetOf(okaforRecord().client.property_address)]],
    ["co-002", [streetOf(smb05Record().client.property_address)]],
  ]);
  return [...byId.entries()].map(([client_canon_id, client_name]) => ({
    client_canon_id,
    client_name,
    shortName: householdSurname(client_name) ? null : client_name.replace(/\s+(Inc\.|LLC|LLP|Ltd\.?|Co\.)$/, ""),
    addresses: streets.get(client_canon_id) ?? [],
    projectNames: [...(projectNames.get(client_canon_id) ?? [])],
  }));
}

/** "1450 Halverson Quay, Suite 600, ..." -> "Halverson Quay"; "327 Havershill Court" -> "Havershill Court". */
function streetOf(address) {
  return address.split(",")[0].trim().replace(/^\d+\s+/, "");
}

/** "The Marsh household" -> "Marsh"; null for a canon business (no household shape). */
function householdSurname(clientName) {
  const m = /^The (\S+) household$/.exec(clientName);
  return m ? m[1] : null;
}

/** Word-bounded, case-insensitive presence of a literal. */
const hasWord = (text, s) => new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(s)}(?![A-Za-z0-9])`, "i").test(text);
/** A date written long form, not as the tail of a longer day number. */
const hasDate = (text, iso) => new RegExp(`(?<![0-9])${escapeRegExp(longForm(iso))}(?![0-9])`).test(text);

/**
 * Every value a client field takes for one client in the emitted SMB-04,
 * SMB-05, SMB-17, SMB-18 and SMB-22 rows, as {field -> Set of values}. A
 * record-level field comes from the client record where the pack ships one and
 * from SMB-22 and SMB-17 otherwise; the invoice and payment fields take every
 * value that client's rows carry.
 */
function clientFieldValues(clientId) {
  const values = new Map();
  const add = (field, v) => {
    if (v === undefined || v === "") return;
    if (!values.has(field)) values.set(field, new Set());
    values.get(field).add(v);
  };
  const records = [okaforRecord(), smb05Record()].filter((r) => r.client.client_canon_id === clientId);
  for (const { client } of records) {
    for (const f of ["client_name", "property_address", "project_name", "contract_value_usd", "payment_terms", "deposit_pct"]) {
      add(f, client[f]);
    }
  }
  for (const r of smb22().filter((r) => r.client_canon_id === clientId)) {
    for (const f of ["client_name", "project_name", "contract_value_usd"]) add(f, r[f]);
  }
  for (const r of smb17().filter((r) => r.client_canon_id === clientId)) {
    for (const f of ["client_name", "invoice_id", "payment_terms", "due_date", "invoice_amount_usd"]) add(f, r[f]);
  }
  for (const r of smb18().filter((r) => r.client_canon_id === clientId)) {
    for (const f of ["invoice_id", "invoice_amount_usd", "due_date", "payment_plan_id", "installment_due_date",
      "installment_amount_usd", "settlement_date", "settled_amount_usd"]) add(f, r[f]);
  }
  return values;
}

/** How a field's value is written in a message: money in prose, dates long form, a percent in words. */
const MONEY_FIELDS = new Set(["contract_value_usd", "invoice_amount_usd", "installment_amount_usd", "settled_amount_usd"]);
const DATE_FIELDS = new Set(["due_date", "installment_due_date", "settlement_date"]);
function appearsIn(body, field, value) {
  if (MONEY_FIELDS.has(field)) return moneyAmounts(body).includes(value);
  if (DATE_FIELDS.has(field)) return hasDate(body, value);
  if (field === "deposit_pct") return hasWord(body, `${value} percent`);
  return hasWord(body, value);
}
const displayKey = (field, value) =>
  MONEY_FIELDS.has(field) ? `money:${value}` : DATE_FIELDS.has(field) ? `date:${value}` : `text:${value}`;

/** Every field name SMB-32 uses, in the order a field first appears in its purposes. */
function vocabularyOrder() {
  const order = [];
  for (const p of checklist().purposes) {
    for (const f of [...p.required, ...p.permitted]) if (!order.includes(f)) order.push(f);
  }
  return order;
}
/** SMB-02's field dictionary, in file order, for the fields no purpose lists. */
const smb02FieldOrder = () => [...new Set(csvTable(shipped("SMB-02", "client-record-fields.csv")).rows.map((r) => r.field_name))];

/** The rule R-DISJOINT class words and the restricted values, as regexes. */
const restrictedWordHits = (text) =>
  RESTRICTED_CLASS_WORDS.filter((w) => new RegExp(`\\b${escapeRegExp(w)}\\b`, "i").test(text));

/**
 * SMB-32's six rules, implemented a second time from the file's own words:
 * which rules fire on one message, and the outcome the strictest of them yields.
 */
function evaluate(row, msg, policy) {
  const fired = [];
  const purpose = policy.purposes.find((p) => p.purpose === row.purpose);
  const fields = fieldsOf(row);
  if (!purpose) fired.push("DHR-LDB-01");
  else {
    if (purpose.required.some((f) => !fields.includes(f))) fired.push("DHR-LDB-02");
    if (fields.some((f) => !purpose.required.includes(f) && !purpose.permitted.includes(f))) fired.push("DHR-LDB-03");
  }
  const disclosure = policy.ai_assistance.disclosure_text;
  const aiOk = row.drafted_with_ai === "yes" ? msg.last === disclosure : !msg.text.includes(disclosure);
  if (!aiOk) fired.push("DHR-LDB-04");
  if (row.data_class === "restricted" || restrictedWordHits(msg.text).length > 0) fired.push("DHR-LDB-05");
  const outcomeOf = (id) => policy.rules.find((r) => r.rule_id === id).outcome;
  const severity = { approved: 0, blocked_pending_edit: 1, blocked: 2 };
  const outcome = fired.map(outcomeOf).reduce(
    (worst, o) => (severity[o] > severity[worst] ? o : worst), outcomeOf("DHR-LDB-06"));
  return { fired, outcome };
}

const SAMPLE_WEEK = ["2026-03-23", "2026-03-24", "2026-03-25", "2026-03-26", "2026-03-27"];
/** The word band section 1.1 fixes per message. */
const MESSAGE_BAND = [50, 180];
/** C3's ladder stage 1, in whole days past due (cluster-3 data plan 2.3). */
const STAGE_ONE = [1, 14];

// ============================================================ T-J1, the index

test("SMB-C4 T-J1: the index header is spec.columns, ten rows, MSG-LDB-01 to -10 gapless, in drafted_date then id order", () => {
  const spec = smb31Spec();
  assert.equal(spec.generation, "drafted-frozen");
  const { cols, rows } = theIndex();
  assert.deepEqual(cols, spec.columns, "the index header is not spec.columns");
  assert.equal(rows.length, 10, `the index carries ${rows.length} rows, expected 10`);
  assert.deepEqual(rows.map((r) => r.message_id), [...Array(10)].map((_, i) => `MSG-LDB-${pad(i + 1)}`),
    "the message ids are not MSG-LDB-01 to -10 in file order with no gap");
  const sorted = [...rows].sort((a, b) =>
    a.drafted_date === b.drafted_date ? (a.message_id < b.message_id ? -1 : 1) : (a.drafted_date < b.drafted_date ? -1 : 1));
  assert.deepEqual(rows.map((r) => r.message_id), sorted.map((r) => r.message_id), "the file is not in drafted_date then id order");
  for (const r of rows) {
    assert.ok(SAMPLE_WEEK.includes(r.drafted_date), `${r.message_id} is drafted on ${r.drafted_date}, outside the sample week`);
    assert.ok(weekday(r.drafted_date) >= 1 && weekday(r.drafted_date) <= 5, `${r.message_id} is drafted on a weekend`);
    assert.ok(["yes", "no"].includes(r.drafted_with_ai), `${r.message_id}'s drafted_with_ai is "${r.drafted_with_ai}"`);
    assert.ok(["owner", "project lead"].includes(r.sender_role), `${r.message_id}'s sender is "${r.sender_role}"`);
    assert.equal(r.message_file, `${r.message_id.toLowerCase()}.md`, `${r.message_id}'s message_file is not its own id`);
  }
});

test("SMB-C4 T-J1: client_fields_used is pipe separated, unique, in SMB-32 vocabulary order then SMB-02 order", () => {
  const vocab = vocabularyOrder();
  const rest = smb02FieldOrder().filter((f) => !vocab.includes(f));
  const order = [...vocab, ...rest];
  for (const r of theIndex().rows) {
    const fields = fieldsOf(r);
    assert.equal(new Set(fields).size, fields.length, `${r.message_id} lists a field twice`);
    for (const f of fields) assert.ok(order.includes(f), `${r.message_id} lists "${f}", which neither SMB-32 nor SMB-02 names`);
    const sorted = [...fields].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    assert.deepEqual(fields, sorted, `${r.message_id}'s fields are not in SMB-32 vocabulary order`);
  }
});

// ============================================================ T-J2, the join

test("SMB-C4 T-J2: the message_file set is the top-level markdown set, both ways, and every header agrees with its row", () => {
  const rows = theIndex().rows;
  const listed = new Set(rows.map((r) => r.message_file));
  const onDisk = new Set(topLevelMarkdown());
  assert.deepEqual([...listed].filter((f) => !onDisk.has(f)), [], "the index lists a message file that is not on disk");
  assert.deepEqual([...onDisk].filter((f) => !listed.has(f)), [], "a markdown file on disk is not in the index");
  for (const { row, msg } of messages()) {
    assert.equal(msg.id, row.message_id, `${row.message_file}'s heading id is not ${row.message_id}`);
    const role = row.recipient_role.replace(/_/g, " ");
    const to = row.recipient_name === "" ? role : `${row.recipient_name}, ${role}`;
    assert.equal(msg.header.To, to, `${row.message_id}'s To line does not agree with its row`);
    assert.equal(msg.header.From, `the ${row.sender_role}`, `${row.message_id}'s From line does not agree with its row`);
    assert.equal(msg.header.Drafted, longForm(row.drafted_date), `${row.message_id}'s Drafted line does not agree with its row`);
    assert.equal(msg.header.Purpose, row.purpose.replace(/_/g, " "), `${row.message_id}'s Purpose line does not agree with its row`);
    const signOff = row.ai_disclosure === "" ? msg.last : msg.lines[msg.lines.length - 2];
    assert.equal(signOff, `The ${row.sender_role}`, `${row.message_id} is not signed off by its sender's role`);
    assert.equal(row.recipient_name === "", row.recipient_canon_id === "", `${row.message_id} carries a recipient name without an id or the reverse`);
  }
});

// ============================================================ T-J3, the disclosure

test("SMB-C4 T-J3: ai_disclosure is SMB-32's disclosure_text byte for byte and the file's last line, and no other file carries it", () => {
  const disclosure = checklist().ai_assistance.disclosure_text;
  assert.ok(disclosure.length > 20, "SMB-32 carries no disclosure text");
  for (const { row, msg } of messages()) {
    if (row.ai_disclosure !== "") {
      assert.equal(row.ai_disclosure, disclosure, `${row.message_id}'s ai_disclosure is not SMB-32's disclosure_text`);
      assert.equal(msg.last, disclosure, `${row.message_id} does not end on its disclosure line`);
      assert.equal(msg.text.split(disclosure).length - 1, 1, `${row.message_id} carries the disclosure line more than once`);
    } else {
      assert.ok(!msg.text.includes(disclosure), `${row.message_id} carries the disclosure line while its index cell is empty`);
      assert.ok(!/drafted with ai/i.test(msg.text), `${row.message_id} carries a near copy of the disclosure line`);
    }
  }
});

// ============================================================ T-J4, purposes and classes

test("SMB-C4 T-J4: every purpose is an SMB-32 purpose and every data_class is that purpose's, one of the four, never restricted", () => {
  const policy = checklist();
  const classes32 = policy.data_classes.map((c) => c.data_class);
  const classes33 = [...new Set(csvTable(shipped("SMB-33", "owner-decision-authority-matrix.csv")).rows.map((r) => r.data_class))];
  assert.deepEqual([...classes33].sort(), [...classes32].sort(), "SMB-32's and SMB-33's data classes differ");
  for (const r of theIndex().rows) {
    const purpose = purposeOf(r.purpose);
    assert.ok(purpose, `${r.message_id}'s purpose "${r.purpose}" is not an SMB-32 purpose`);
    assert.equal(r.data_class, purpose.data_class, `${r.message_id}'s data_class is not its purpose's`);
    assert.ok(classes32.includes(r.data_class), `${r.message_id}'s data_class is not one of the four`);
    assert.notEqual(r.data_class, "restricted", `${r.message_id} is classed restricted`);
  }
});

// ============================================================ T-J5, text to index

test("SMB-C4 T-J5: every listed field's value is in the message, and no unlisted field value of that client is", () => {
  const universe = new Set([...vocabularyOrder(), ...theIndex().rows.flatMap(fieldsOf)]);
  for (const { row, msg } of messages()) {
    const fields = fieldsOf(row);
    if (row.subject_client_canon_id === "") {
      assert.deepEqual(fields, [], `${row.message_id} has no subject client and lists fields`);
      for (const r of smb17()) assert.ok(!msg.body.includes(r.client_name), `${row.message_id} names the client ${r.client_name}`);
      for (const r of smb22()) assert.ok(!msg.body.includes(r.project_name), `${row.message_id} names the project ${r.project_name}`);
      continue;
    }
    const values = clientFieldValues(row.subject_client_canon_id);
    const shown = new Set();
    for (const f of fields) {
      assert.ok(values.has(f), `${row.message_id} lists ${f}, which the pack carries no value of for ${row.subject_client_canon_id}`);
      const present = [...values.get(f)].filter((v) => appearsIn(msg.body, f, v));
      assert.ok(present.length > 0, `${row.message_id} lists ${f} and states none of its values (${[...values.get(f)].join(", ")})`);
      for (const v of present) shown.add(displayKey(f, v));
    }
    for (const f of universe) {
      if (fields.includes(f) || !values.has(f)) continue;
      for (const v of values.get(f)) {
        if (shown.has(displayKey(f, v))) continue; // the same string is a listed field's value
        assert.ok(!appearsIn(msg.body, f, v), `${row.message_id} states ${f} "${v}" and does not list ${f}`);
      }
    }
  }
});

test("SMB-C4 T-J5: every digit in a message body is a listed value, a named day, an id or its terms", () => {
  for (const { row, msg } of messages()) {
    const values = row.subject_client_canon_id === "" ? new Map() : clientFieldValues(row.subject_client_canon_id);
    let rest = msg.body;
    for (const f of fieldsOf(row)) {
      if (f === "property_address") for (const v of values.get(f)) rest = rest.split(v).join(" ");
      if (f === "deposit_pct") for (const v of values.get(f)) rest = rest.split(`${v} percent`).join(" ");
    }
    rest = rest
      .replace(/\b[A-Z]{3}-LDB-[0-9-]+\b/g, " ")
      .replace(/\bnet_\d+\b/g, " ")
      .replace(moneyShape(), " ");
    for (const d of longDates(msg.body)) rest = rest.split(d.raw).join(" ");
    assert.doesNotMatch(rest, /\d/, `${row.message_id} carries a digit outside a listed value, a day or an id`);
    const moneyListed = fieldsOf(row).some((f) => MONEY_FIELDS.has(f));
    if (!moneyListed) assert.deepEqual(moneyAmounts(msg.text), [], `${row.message_id} states money and lists no money field`);
  }
});

// Review data-cluster-4.md SHOULD-FIX 2: T-J5 above screens the subject
// client's own values, but nothing stopped a message naming a SECOND client
// (M58, M59). This is the explicit allowlist: for every client in SMB-17,
// SMB-22 and SMB-23 other than the message's own recipient and subject, the
// household surname word (not the first word of a project name, which a
// canon business name can also start with, e.g. "Atticus") and the full
// client_name and project_name must be absent, word anchored.
test("SMB-C4 T-J5: no message names a client, a household surname or a project other than its own recipient or subject", () => {
  const clients = everyClient();
  for (const { row, msg } of messages()) {
    // Review data-cluster-4.md NEW-1: the index's subject_client_canon_id is
    // not itself trusted as an exemption unless it agrees with the message's
    // own recipient, so a retargeted subject with no matching recipient
    // change cannot license a second client (R29).
    if (row.recipient_canon_id && row.recipient_role !== "subcontractor") {
      assert.equal(row.subject_client_canon_id, row.recipient_canon_id,
        `${row.message_id}: a message to a client is about that client`);
    }
    // Screen the subject line too, not only the body (R2, R16).
    const said = `${msg.subject}\n${msg.body}`;
    const others = clients.filter((c) =>
      c.client_canon_id !== row.recipient_canon_id && c.client_canon_id !== row.subject_client_canon_id);
    for (const c of others) {
      const surname = householdSurname(c.client_name);
      if (surname) assert.ok(!hasWord(said, surname), `${row.message_id} names "${surname}", another client's household surname`);
      assert.ok(!hasWord(said, c.client_name), `${row.message_id} names "${c.client_name}", another client's name`);
      // NEW-6: a business's distinctive leading words and any client's street.
      if (c.shortName) assert.ok(!hasWord(said, c.shortName), `${row.message_id} names "${c.shortName}", another client's business name`);
      for (const a of c.addresses) {
        assert.ok(!hasWord(said, a), `${row.message_id} names "${a}", another client's street`);
      }
      for (const p of c.projectNames) {
        assert.ok(!hasWord(said, p), `${row.message_id} names "${p}", another client's project`);
      }
    }
  }
});

// ============================================================ T-J6 to T-J8, the plants

test("SMB-C4 T-J6: exactly 1 AI-drafted message has an empty disclosure; 5 were AI drafted, and 6 disclosures are empty", () => {
  const rows = theIndex().rows;
  const ai = rows.filter((r) => r.drafted_with_ai === "yes");
  const empty = rows.filter((r) => r.ai_disclosure === "");
  const undisclosed = ai.filter((r) => r.ai_disclosure === "");
  assert.equal(undisclosed.length, 1, "the undisclosed AI draft count under the rule");
  assert.equal(ai.length, 5, "the AI-drafted count with the empty-disclosure qualifier dropped");
  assert.equal(ai.filter((r) => r.ai_disclosure !== "").length, 4, "the disclosed AI-drafted count");
  assert.equal(empty.length, 6, "the empty-disclosure count with the AI qualifier dropped");
  assert.equal(empty.filter((r) => r.drafted_with_ai === "no").length, 5, "the compliant empty disclosures");
  // The plant's purpose is pinned (review data-cluster-4.md SHOULD-FIX 1) so
  // it cannot migrate to another message while every count above still sums.
  assert.equal(undisclosed[0].purpose, "general_enquiry_reply", "the undisclosed AI draft's purpose has drifted");
});

test("SMB-C4 T-J7: exactly 1 message carries a field outside its purpose; 3 carry more than the purpose requires", () => {
  const rows = theIndex().rows;
  const beyondRequired = rows.filter((r) => fieldsOf(r).some((f) => !purposeOf(r.purpose).required.includes(f)));
  const outside = rows.filter((r) => {
    const p = purposeOf(r.purpose);
    return fieldsOf(r).some((f) => !p.required.includes(f) && !p.permitted.includes(f));
  });
  assert.equal(outside.length, 1, "the minimization breach count under the rule");
  assert.equal(beyondRequired.length, 3, "the more-than-required count with the permitted qualifier dropped");
  assert.ok(beyondRequired.includes(outside[0]), "the breach is not among the more-than-required messages");
  // The plant's purpose and recipient class are pinned (SHOULD-FIX 1) so the
  // breach cannot migrate to another message while the census above still sums.
  assert.equal(outside[0].purpose, "trade_visit_request", "the minimization breach's purpose has drifted");
  assert.equal(outside[0].recipient_role, "subcontractor", "the minimization breach's recipient class has drifted");
  // The checklist lists neither of the fields that make a breach a rule.
  for (const p of checklist().purposes) {
    for (const f of ["contract_value_usd", "deposit_pct"]) {
      assert.ok(![...p.required, ...p.permitted].includes(f), `SMB-32's ${p.purpose} lists ${f}`);
    }
  }
});

test("SMB-C4 T-J8: exactly 1 AI-drafted, disclosed, in-purpose message exercises a permitted field; 3 are AI drafted, disclosed and in purpose", () => {
  const disclosure = checklist().ai_assistance.disclosure_text;
  const clean = messages().filter(({ row, msg }) => {
    const p = purposeOf(row.purpose);
    return row.drafted_with_ai === "yes" && row.ai_disclosure === disclosure && msg.last === disclosure &&
      fieldsOf(row).every((f) => p.required.includes(f) || p.permitted.includes(f));
  });
  const control = clean.filter(({ row }) => fieldsOf(row).some((f) => purposeOf(row.purpose).permitted.includes(f)));
  assert.equal(control.length, 1, "the control count under the rule");
  assert.equal(clean.length, 3, "the clean AI-drafted count with the beyond-the-minimum qualifier dropped");
  // The control's purpose is pinned (SHOULD-FIX 1) so it cannot migrate to
  // another message while the census above still sums.
  assert.equal(control[0].row.purpose, "payment_reminder", "the control message's purpose has drifted");
});

// ============================================================ the census

test("SMB-C4 T-J census: dates, senders, purposes, classes, AI and subject clients", () => {
  const rows = theIndex().rows;
  const count = (key) => SAMPLE_WEEK.map((d) => rows.filter((r) => r[key] === d).length);
  assert.deepEqual(count("drafted_date"), [2, 3, 3, 1, 1], "the per-day census");
  const by = (key, value) => rows.filter((r) => r[key] === value).length;
  assert.equal(by("sender_role", "project lead"), 7, "project lead messages");
  assert.equal(by("sender_role", "owner"), 3, "owner messages");
  const purposes = checklist().purposes.map((p) => p.purpose);
  for (const p of purposes) {
    assert.equal(by("purpose", p), p === "visit_confirmation" ? 5 : 1, `the ${p} count`);
  }
  assert.equal(by("data_class", "public"), 1, "public messages");
  assert.equal(by("data_class", "client-confidential"), 9, "client-confidential messages");
  assert.equal(by("data_class", "internal"), 0, "internal messages");
  assert.equal(by("subject_client_canon_id", "co-131"), 3, "messages about co-131");
  assert.equal(by("subject_client_canon_id", ""), 1, "messages with no subject client");
});

test("SMB-C4 T-J9: the money census, compared through moneyAmounts", () => {
  const perMessage = messages().map(({ msg }) => moneyAmounts(msg.text).sort());
  const byPurpose = (p) => messages().findIndex(({ row }) => row.purpose === p);
  const expected = messages().map(() => []);
  const reminder = smb18().filter((r) => r.installment_sequence !== "" && r.client_canon_id === messages()[byPurpose("payment_reminder")].row.subject_client_canon_id);
  const invoice = smb17().find((r) => r.invoice_date === messages()[byPurpose("invoice_cover")].row.drafted_date);
  const trade = messages()[byPurpose("trade_visit_request")].row;
  const record = [okaforRecord(), smb05Record()].find((r) => r.client.client_canon_id === trade.subject_client_canon_id);
  const receipt = smb18().find((r) => r.settlement_date === messages()[byPurpose("payment_receipt")].row.drafted_date && r.client_canon_id === messages()[byPurpose("payment_receipt")].row.subject_client_canon_id);
  expected[byPurpose("payment_reminder")] = reminder.filter((r) => r.settlement_status === "open").map((r) => r.installment_amount_usd);
  expected[byPurpose("invoice_cover")] = [invoice.invoice_amount_usd];
  expected[byPurpose("trade_visit_request")] = [record.client.contract_value_usd];
  expected[byPurpose("payment_receipt")] = [receipt.settled_amount_usd];
  assert.deepEqual(perMessage, expected.map((e) => e.sort()), "the money in the messages is not the census");
  const all = perMessage.flat();
  assert.equal(all.length, 6, "six money figures in the whole queue");
  assert.equal(all.filter((a) => a === "5362.50").length, 3, "5,362.50 three times");
});

test("SMB-C4 T-J10: SMB-32's six rules, implemented again here, approve 8, hold 2 for an edit and block none", () => {
  const policy = checklist();
  assert.deepEqual(policy.rules.map((r) => r.rule_id), [1, 2, 3, 4, 5, 6].map((n) => `DHR-LDB-${pad(n)}`));
  const results = messages().map(({ row, msg }) => evaluate(row, msg, policy));
  const outcomes = (o) => results.filter((r) => r.outcome === o).length;
  assert.equal(outcomes("approved"), 8, "approved");
  assert.equal(outcomes("blocked_pending_edit"), 2, "blocked_pending_edit");
  assert.equal(outcomes("blocked"), 0, "blocked");
  const firing = (id) => results.filter((r) => r.fired.includes(id)).length;
  assert.equal(firing("DHR-LDB-03"), 1, "the minimization rule fires once");
  assert.equal(firing("DHR-LDB-04"), 1, "the disclosure rule fires once");
  assert.ok(results.every((r) => r.fired.length <= 1), "a message breaks two rules at once");
  for (const id of ["DHR-LDB-01", "DHR-LDB-02", "DHR-LDB-05"]) assert.equal(firing(id), 0, `${id} fires`);
});

// ============================================================ T-J11, consistency on the day

test("SMB-C4 T-J11: the payment reminder is ladder stage 1 on its day and names exactly the open installments", () => {
  const { row, msg } = messages().find(({ row }) => row.purpose === "payment_reminder");
  const plan = smb18().filter((r) => r.client_canon_id === row.subject_client_canon_id && r.payment_plan_id !== "");
  const open = plan.filter((r) => r.settlement_date === "" || r.settlement_date > row.drafted_date);
  assert.equal(open.length, 3, "the plan does not carry three open installments on the reminder's day");
  const governing = open.map((r) => r.installment_due_date).sort()[0];
  const dpd = diffDays(governing, row.drafted_date);
  assert.ok(dpd >= STAGE_ONE[0] && dpd <= STAGE_ONE[1], `${dpd} days past due is not ladder stage 1`);
  // SMB-19 reads stage 2 for this client at month end, and the reminder does not change that.
  const aging = csvTable(shipped("SMB-19", "aging-summary.csv")).rows.find((r) => r.client_canon_id === row.subject_client_canon_id);
  assert.equal(aging.dunning_stage, "2", "SMB-19 no longer reads stage 2 for the reminder's client");
  assert.equal(aging.promise_to_pay_date, "", "SMB-19 now records a promise the reminder does not know about");
  assert.equal(row.sender_role, "project lead", "a stage 1 reminder is from the project lead");
  // The dates named are exactly the open installments' due dates, and each carries its amount.
  const named = longDates(msg.body).map((d) => d.iso).sort();
  assert.deepEqual(named, open.map((r) => r.installment_due_date).sort(), "the reminder names other than the open installments");
  for (const r of open) {
    const line = msg.body.split("\n").find((l) => hasDate(l, r.installment_due_date));
    assert.ok(line.includes(proseMoney(r.installment_amount_usd)), `the ${longForm(r.installment_due_date)} installment is stated without its amount`);
    // Review data-cluster-4.md NEW-4: a "past due" marker on an installment
    // line must agree with whether that installment's due date is actually
    // before the drafted date (R25).
    assert.equal(/\bpast due\b/.test(line), r.installment_due_date < row.drafted_date,
      `the ${longForm(r.installment_due_date)} installment's "past due" marker does not match its due date`);
  }
  // The open and past-due counts the message states in prose match SMB-18 (R26).
  const W = ["zero", "one", "two", "three", "four", "five"];
  const pastDue = open.filter((r) => r.installment_due_date < row.drafted_date).length;
  assert.ok(hasWord(msg.body, `${W[open.length]} installments are open`), "the reminder's open-installment count does not match the plan");
  assert.ok(hasWord(msg.body, `${W[pastDue]} of them past their due date`), "the reminder's past-due count does not match the plan");
  assert.ok(msg.body.includes(plan[0].payment_plan_id) && msg.body.includes(plan[0].invoice_id), "the reminder does not name its plan and invoice");
});

test("SMB-C4 T-J11: the invoice cover is the one invoice issued on its day, and the receipt is the one settlement on its day", () => {
  const cover = messages().find(({ row }) => row.purpose === "invoice_cover");
  const issued = smb17().filter((r) => r.invoice_date === cover.row.drafted_date);
  assert.equal(issued.length, 1, "not exactly one invoice was issued on the cover's day");
  const inv = issued[0];
  assert.equal(inv.client_canon_id, cover.row.subject_client_canon_id, "the cover's client is not the invoice's");
  for (const s of [inv.invoice_id, proseMoney(inv.invoice_amount_usd), inv.payment_terms, longForm(inv.due_date)]) {
    assert.ok(cover.msg.body.includes(s), `the invoice cover does not state "${s}"`);
  }
  const receipt = messages().find(({ row }) => row.purpose === "payment_receipt");
  const settled = smb18().filter((r) => r.settlement_date === receipt.row.drafted_date && r.client_canon_id === receipt.row.subject_client_canon_id);
  assert.equal(settled.length, 1, "not exactly one settlement for the receipt's client on its day");
  const pay = settled[0];
  for (const s of [pay.invoice_id, proseMoney(pay.settled_amount_usd), longForm(pay.settlement_date)]) {
    assert.ok(receipt.msg.body.includes(s), `the receipt does not state "${s}"`);
  }
  // The client still owes after the receipt: its body may not say otherwise.
  const stillOpen = smb18().filter((r) => r.client_canon_id === receipt.row.subject_client_canon_id && r.settlement_date === "");
  assert.ok(stillOpen.length > 0, "the receipt's client owes nothing, so the never list has lost its reason");
});

test("SMB-C4 T-J11: every visit day is a weekday written with its own name, in a crew week for the subject job or after the sample week", () => {
  const jobOf = (clientId) => smb22().find((r) => r.client_canon_id === clientId).job_id;
  const lastWeek = smb20().map((r) => r.week_ending).sort().at(-1);
  let crewDays = 0;
  for (const { row, msg } of messages()) {
    if (!["visit_confirmation", "trade_visit_request"].includes(row.purpose)) continue;
    const days = longDates(msg.body);
    // A message with no day named is about the day it was drafted ("this morning").
    const visitDays = days.length > 0 ? days.map((d) => d.iso) : [row.drafted_date];
    for (const d of days) {
      assert.ok(d.weekdayWritten, `${row.message_id} names ${d.raw} without its weekday`);
      assert.equal(d.weekdayWritten, WEEKDAY_NAMES[weekday(d.iso)], `${row.message_id} names ${d.raw} with the wrong weekday`);
    }
    const job = jobOf(row.subject_client_canon_id);
    const weeks = smb20().filter((r) => r.job_id === job).map((r) => r.week_ending);
    for (const day of visitDays) {
      assert.ok(weekday(day) >= 1 && weekday(day) <= 5, `${row.message_id} puts a visit on a weekend`);
      const inCrewWeek = weeks.some((w) => diffDays(day, w) >= 0 && diffDays(day, w) < 7);
      if (day <= lastWeek) {
        assert.ok(inCrewWeek, `${row.message_id} puts a crew on ${job} on ${day}, a week SMB-20 carries no time for`);
        crewDays += 1;
      } else {
        assert.ok(day > "2026-03-27", `${row.message_id}'s visit day ${day} is not after the sample week`);
      }
    }
  }
  assert.ok(crewDays >= 2, "the two crew days inside the sample week are not both named");
});

// ============================================================ T-J12, R-DISJOINT

test("SMB-C4 T-J12: no SMB-34 restricted value and no restricted class word in any SMB-31 file", () => {
  const needles = restrictedNeedles(excerpt());
  assert.ok(needles.length >= 6, `only ${needles.length} restricted needles were read from SMB-34`);
  const files = [indexPath(), ...topLevelMarkdown().map((f) => join(smb31Dir(), f))];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const n of needles) assert.ok(!text.includes(n), `${file.slice(REPO_ROOT.length + 1)} carries SMB-34's restricted value ${n}`);
    const hits = restrictedWordHits(text);
    assert.deepEqual(hits, [], `${file.slice(REPO_ROOT.length + 1)} carries restricted class word(s)`);
  }
  for (const r of theIndex().rows) assert.notEqual(r.data_class, "restricted");
});

// ============================================================ T-J13, the never list

test("SMB-C4 T-J13: each message says none of its nevers", () => {
  const project = (clientId) => smb22().find((r) => r.client_canon_id === clientId).project_name;
  const byPurpose = (p) => messages().filter(({ row }) => row.purpose === p);
  const never = new Map();
  const add = (msgs, strings) => { for (const m of msgs) never.set(m, [...(never.get(m) ?? []), ...strings]); };
  const all = messages();
  // The Okafor household's messages: nothing about closeout, handover, cost or a moved date.
  const okafor = all.filter(({ row }) => row.recipient_canon_id === "co-131");
  add(okafor, ["27 March", "closeout", "handover", "cost", "key safe"]);
  // The other visit confirmations: no job named in full.
  for (const m of byPurpose("visit_confirmation")) {
    if (!fieldsOf(m.row).includes("project_name")) add([m], [project(m.row.subject_client_canon_id)]);
  }
  add(byPurpose("visit_confirmation").filter(({ row }) => row.recipient_canon_id !== "co-131"), ["promise", "INV-LDB-", "PLN-LDB-"]);
  add(byPurpose("general_enquiry_reply"), ["award", "guarantee", "best", "price", "quote"]);
  add(byPurpose("payment_reminder"), ["promise", "as agreed", "late fee", "interest"]);
  add(byPurpose("invoice_cover"), ["closeout", project(byPurpose("invoice_cover")[0].row.subject_client_canon_id)]);
  add(byPurpose("trade_visit_request"), ["key safe", "rework", "6,480.00", "wire", "cost"]);
  add(byPurpose("payment_receipt"), ["paid in full", "nothing outstanding", "balance is clear", "all settled", "payment plan", "PLN-LDB-"]);
  for (const [{ row, msg }, strings] of never) {
    for (const s of strings) {
      const said = s.endsWith("-") ? msg.text.includes(s) : hasWord(msg.text, s);
      assert.ok(!said, `${row.message_id} says "${s}"`);
    }
  }
  // Invoices: a message names only its own, and never the one C3 answers with.
  const c3Key = smb19Oldest();
  for (const { row, msg } of all) {
    const ids = msg.text.match(/INV-LDB-\d{4}-\d{3}/g) ?? [];
    assert.ok(ids.length <= 1 || new Set(ids).size === 1, `${row.message_id} names more than one invoice`);
    assert.ok(!c3Key.some((id) => ids.includes(id)), `${row.message_id} names an invoice the aging summary keys on for a client with no plan`);
  }
  // The general enquiry reply names no day and no month.
  for (const { row, msg } of byPurpose("general_enquiry_reply")) {
    assert.deepEqual(longDates(msg.body), [], `${row.message_id} names a date`);
    for (const month of MONTH_NAMES) assert.ok(!hasWord(msg.body, month), `${row.message_id} names ${month}`);
  }
});
/** The oldest unsettled invoice SMB-19 carries for every client not on a plan. */
const smb19Oldest = () => csvTable(shipped("SMB-19", "aging-summary.csv")).rows
  .filter((r) => r.on_payment_plan === "no").map((r) => r.oldest_unsettled_invoice_id);

// Review data-cluster-4.md NIT 2: the never-list above is a deny list, so a
// moved closeout or handover date written without the banned words survives
// it (M74, M75). A shape screen closes most of that gap: no long-form date
// named in a message to or about co-131 may fall on or after 27 March 2026,
// the planned closeout end and handover date SMB-14 announced (review
// data-cluster-4.md NEW-8); SMB-15 forbids restating it or naming a new one.
test("SMB-C4 T-J13: no Okafor message (recipient or subject co-131) names a date on or after 27 March 2026", () => {
  for (const { row, msg } of messages()) {
    if (row.recipient_canon_id !== "co-131" && row.subject_client_canon_id !== "co-131") continue;
    // Review data-cluster-4.md NEW-1: the subject line, not only the body (R16).
    for (const d of longDates(`${msg.subject}\n${msg.body}`)) {
      assert.ok(d.iso < "2026-03-27", `${row.message_id} names ${d.raw}, on or after 27 March 2026`);
    }
  }
});

// ============================================================ T-J14, recipients

test("SMB-C4 T-J14: every recipient is seated in canon or in co-201 to co-203, by its canon or SMB-17 name", () => {
  const band = new Set(["co-201", "co-202", "co-203"]);
  for (const r of theIndex().rows) {
    for (const id of [r.recipient_canon_id, r.subject_client_canon_id]) {
      if (id === "") continue;
      assert.ok(canon.has(id) || band.has(id), `${r.message_id} addresses ${id}, which is neither seated nor in the band`);
    }
    if (r.recipient_canon_id === "") continue;
    const names = new Set([canon.get(r.recipient_canon_id)?.name,
      ...smb17().filter((i) => i.client_canon_id === r.recipient_canon_id).map((i) => i.client_name)].filter(Boolean));
    assert.ok(names.has(r.recipient_name), `${r.message_id}'s recipient name "${r.recipient_name}" is not ${[...names].join(" or ")}`);
  }
  const rows = theIndex().rows;
  assert.deepEqual([...new Set(rows.map((r) => r.recipient_canon_id).filter((id) => band.has(id)))].sort(), [...band],
    "the band recipients are not exactly co-201 to co-203");
});

// ============================================================ T-J15, the absence screens

test("SMB-C4 T-J15: no instrument, no statute, no name, no SMB-10 health word, ASCII, no dash, 50 to 180 words, one DOCX each", () => {
  const people = canonPeople();
  const rows = theIndex().rows;
  const derived = [
    canon.get("co-100").name,
    ...rows.map((r) => r.recipient_name).filter(Boolean),
    okaforRecord().client.project_name,
    okaforRecord().client.property_address,
  ];
  const allowed = allowedFrom({
    derived,
    furniturePhrases: [],
    furnitureWords: ["I", "AI", "MSG-LDB-", "INV-LDB-", "PLN-LDB-", ...WEEKDAY_NAMES, ...MONTH_NAMES],
  });
  const indexText = readFileSync(indexPath(), "utf8");
  for (const text of [indexText]) {
    assert.deepEqual(denyHits(text, PAYMENT_INSTRUMENTS), [], "the index names a payment instrument");
    assert.ok(!text.includes(EM_DASH) && !text.includes(EN_DASH), "the index carries a dash");
  }
  for (const { row, msg } of messages()) {
    const text = msg.text;
    const id = row.message_id;
    assert.deepEqual(denyHits(text, PAYMENT_INSTRUMENTS), [], `${id} names a payment instrument (rule R-MOCK)`);
    assert.deepEqual(STATUTE_PATTERNS.filter((p) => p.test(text)).map(String), [], `${id} names a statute (rule R-NOSTATUTE)`);
    for (const person of people) assert.ok(!text.includes(person), `${id} names the person ${person}`);
    assert.deepEqual(unscreenedPhrases(text, allowed), [], `${id} carries unscreened capitalized phrase(s)`);
    assert.deepEqual(unscreenedWords(text, allowed), [], `${id} carries unscreened capitalized word(s)`);
    assert.deepEqual(denyHits(text, OUT_OF_SCOPE_VOCABULARY), [], `${id} carries SMB-10's out-of-scope vocabulary`);
    assert.ok(!text.includes(EM_DASH), `${id} carries an em dash (U+2014)`);
    assert.ok(!text.includes(EN_DASH), `${id} carries an en dash (U+2013)`);
    assert.deepEqual([...new Set(text.match(/[^\x00-\x7F]/g) ?? [])], [], `${id} carries non-ASCII`);
    assert.doesNotMatch(text, /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/, `${id} carries an email address`);
    assert.doesNotMatch(text, /\b(?:fwd|fw)\b/i, `${id} is a forward`);
    const words = text.split(/\s+/).filter((w) => w.length > 0).length;
    assert.ok(words >= MESSAGE_BAND[0] && words <= MESSAGE_BAND[1], `${id} runs ${words} words, outside ${MESSAGE_BAND.join(" to ")}`);
    const docx = join(smb31Dir(), "build", row.message_file.replace(/\.md$/, ".docx"));
    assert.ok(existsSync(docx) && statSync(docx).size > 0, `${docx} is not built; run datagen build-docx SMB-31`);
  }
});

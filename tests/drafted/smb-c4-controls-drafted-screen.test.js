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

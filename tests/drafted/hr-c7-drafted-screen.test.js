// HR-19 benefits-plan-library: the structural screen over the one drafted
// artifact set of people-hr cluster 7 (plan section 4, HR-C7-T1 to HR-C7-T11).
//
// tests/drafted/hr-c5-drafted-screen.test.js is the house style and its habits
// are kept: documents are read lazily inside each test, the CORE-04 roster and
// the HR-17 record set are generated in-test rather than read off disk, the
// handbook is read from the committed CORE-05 file and FIN-25 from its committed
// CSV, and every allowed capitalized string except a short furniture list is
// derived from canon or from the pack's own headings, titles and tables.
//
// Every literal table below (the file list, the control values, the section
// grammar, the section-4 subsection headings, the eighteen limitation sentences
// with their placement, the closed money list, the handbook phrase table and
// the ten seed rows) is restated here as data from plan 2.2 and never imported
// from anywhere, so a drift on either side fails a test rather than moving both.
//
// Every census below is recomputed from the emitted bytes by a rule a reader can
// apply. The two HR-19a limitations are found by reading the published lexicon
// against the section grammar, never by being told which sentence they are.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { csvTable, fileByPath } from "../helpers/csv-table.js";
import { allowedFrom, unscreenedPhrases, unscreenedWords } from "../helpers/capitalized-screen.js";
import { moneyMatches } from "../helpers/money-shape.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));

const ARTIFACT = "HR-19";
const INDEX = "benefits-plan-library.md";
const SEED = "benefits-plan-library-seed-questions.md";
const AS_OF = "2026-04-03";

// ------------------------------------------------------ plan 2.2.1, the files

const LIBRARY = [
  { file: "benefits-plan-library.md", id: "ADI-BNF-000", title: "Benefits Plan Library and Register", version: "2.0", status: "Active", effective: "2026-01-01" },
  { file: "benefits-plan-library-401k-plan-spd-2024.md", id: "ADI-BNF-001", title: "401(k) Savings Plan: Summary Plan Description", version: "1.0", status: "Superseded", effective: "2024-07-01" },
  { file: "benefits-plan-library-medical-plan-spd.md", id: "ADI-BNF-002", title: "Medical Plan: Summary Plan Description", version: "3.0", status: "Active", effective: "2026-01-01" },
  { file: "benefits-plan-library-dental-and-vision-plan-spd.md", id: "ADI-BNF-003", title: "Dental and Vision Plan: Summary Plan Description", version: "3.0", status: "Active", effective: "2026-01-01" },
  { file: "benefits-plan-library-life-and-disability-plan-spd.md", id: "ADI-BNF-004", title: "Life and Disability Plan: Summary Plan Description", version: "3.0", status: "Active", effective: "2026-01-01" },
  { file: "benefits-plan-library-spending-accounts-and-commuter-spd.md", id: "ADI-BNF-005", title: "Spending Accounts and Commuter Benefits: Summary Plan Description", version: "3.0", status: "Active", effective: "2026-01-01" },
  { file: "benefits-plan-library-eap-and-learning-allowance.md", id: "ADI-BNF-006", title: "Employee Assistance Program and Learning and Wellness Allowance", version: "3.0", status: "Active", effective: "2026-01-01" },
  { file: "benefits-plan-library-enrollment-calendar-and-life-events.md", id: "ADI-BNF-007", title: "Enrollment Calendar and Qualifying Life Events, 2026 Plan Year", version: "3.0", status: "Active", effective: "2026-01-01" },
  { file: "benefits-plan-library-401k-plan-spd-2025.md", id: "ADI-BNF-008", title: "401(k) Savings Plan: Summary Plan Description, Restated", version: "2.0", status: "Active", effective: "2025-07-01" },
];
const SEED_TITLE = "Benefits Plan Library: Seed Question Set";
const byId = (id) => LIBRARY.find((d) => d.id === id);
const docId = (n) => `ADI-BNF-00${n}`;
const PLAN_DOCS = ["001", "002", "003", "004", "005", "006", "007", "008"].map((n) => `ADI-BNF-${n}`);

// ------------------------------------------------ plan 2.2.2, document control

const CONTROL_FIELDS = [
  "Document ID", "Version", "Status", "Owner", "Approver",
  "Effective Date", "Last Reviewed", "Next Review Due", "Supersedes", "Superseded By",
];

/** Last Reviewed, Next Review Due, Supersedes and Superseded By, by document id. */
const CONTROL = {
  "ADI-BNF-000": ["2026-01-01", "2026-10-01", "ADI-BNF-000 v1.2", "None"],
  "ADI-BNF-001": ["2024-07-01", "2025-07-01", "None", "ADI-BNF-008"],
  "ADI-BNF-002": ["2026-01-01", "2026-10-01", "ADI-BNF-002 v2.0", "None"],
  "ADI-BNF-003": ["2026-01-01", "2026-10-01", "ADI-BNF-003 v2.0", "None"],
  "ADI-BNF-004": ["2026-01-01", "2026-10-01", "ADI-BNF-004 v2.0", "None"],
  "ADI-BNF-005": ["2026-01-01", "2026-10-01", "ADI-BNF-005 v2.0", "None"],
  "ADI-BNF-006": ["2026-01-01", "2026-10-01", "ADI-BNF-006 v2.0", "None"],
  "ADI-BNF-007": ["2026-01-01", "2026-10-01", "ADI-BNF-007 v2.0", "None"],
  "ADI-BNF-008": ["2026-01-01", "2027-01-01", "ADI-BNF-001", "None"],
};

const REISSUED = [["1.0", "2024-07-01"], ["2.0", "2025-01-01"], ["3.0", "2026-01-01"]];
/** Version history rows as (Version, Date), by document id. */
const HISTORY = {
  "ADI-BNF-000": [["1.0", "2024-07-01"], ["1.1", "2025-01-01"], ["1.2", "2025-07-01"], ["2.0", "2026-01-01"]],
  "ADI-BNF-001": [["1.0", "2024-07-01"]],
  "ADI-BNF-002": REISSUED, "ADI-BNF-003": REISSUED, "ADI-BNF-004": REISSUED,
  "ADI-BNF-005": REISSUED, "ADI-BNF-006": REISSUED, "ADI-BNF-007": REISSUED,
  "ADI-BNF-008": [["2.0", "2025-07-01"]],
};
const HISTORY_COLUMNS = ["Version", "Date", "Summary of Change", "Approved By"];
const REGISTER_COLUMNS = [
  "Document ID", "Title", "Version", "Status", "Owner", "Effective Date", "Last Reviewed", "Next Review Due",
];

// ------------------------------------------------- plan 2.2.3, section grammar

const SPD_SECTIONS = [
  "Document Control",
  "1. Plan Overview", "2. Eligibility and Participation", "3. Enrollment and Changes",
  "4. Covered Benefits", "5. Exclusions and Limitations", "6. Coverage During Leave",
  "7. Claims and Appeals", "8. Plan Administration",
  "Version History",
];
const CHANGES = "Changes From Version 1.0";
const CALENDAR_SECTIONS = [
  "Document Control",
  "1. Purpose", "2. Plan Year", "3. New Hire Enrollment", "4. Open Enrollment for the Next Plan Year",
  "5. Qualifying Life Events", "6. Dependent Documentation and Verification",
  "7. Summary Plan Descriptions", "8. Plan Administration",
  "Version History",
];
const INDEX_SECTIONS = [
  "Document Control",
  "1. Purpose", "2. Scope and Relationship to the Employee Handbook", "3. How to Read a Plan Document",
  "4. Questions This Library Answers and Questions It Routes", "5. Language Assistance",
  "6. Plan Administration and Insurance Placement", "7. Benefits Plan Register",
  "8. Document Control Conventions",
  "Version History",
];

/** The `### ` subsections of section 4, verbatim and in order. */
const SUBSECTIONS = {
  "ADI-BNF-001": ["Employee contributions", "Company match", "Vesting", "Loans"],
  "ADI-BNF-002": ["Preventive care", "Office visits", "Physical therapy", "Chiropractic care", "Hospital care", "Emergency care", "Prescription drugs"],
  "ADI-BNF-003": ["Preventive services", "Basic services", "Major services", "Eye exams", "Eyeglass lenses", "Frames", "Contact lenses"],
  "ADI-BNF-004": ["Basic life insurance", "Accidental death insurance", "Short-term disability", "Long-term disability"],
  "ADI-BNF-005": ["Health flexible spending account", "Health savings account", "Commuter benefits"],
  "ADI-BNF-006": ["Employee assistance program", "Learning and wellness allowance"],
  "ADI-BNF-008": ["Employee contributions", "Company match", "Vesting", "Loans"],
};
const OPTION_NAMES = ["Choice PPO option", "Saver HSA option"];

// ----------------------------------------- plan 2.2.4, the eighteen sentences

const LEXICON = /\b(?:limited to|not covered|excluded)\b/i;

/**
 * Where each sentence is stated. "own" is inside the named benefit's own
 * section-4 subsection; a digit is that numbered section outside section 4's
 * subsections. "4 and 5" in the plan reads ["own", "5"].
 */
const SENTENCES = [
  { n: "L1", doc: "ADI-BNF-002", benefit: "Physical therapy", text: "Physical therapy is limited to 30 visits per plan year.", at: ["own", "5"] },
  { n: "L2", doc: "ADI-BNF-002", benefit: "Chiropractic care", text: "Chiropractic care is limited to 20 visits per plan year, and a claim for any visit after the twentieth is denied.", at: ["7"] },
  { n: "L3", doc: "ADI-BNF-002", benefit: "Hospital care", text: "Hospital care includes a semi-private room, and a private room is not covered unless the treating physician orders it.", at: ["own", "5"] },
  { n: "L4", doc: "ADI-BNF-002", benefit: "Prescription drugs", text: "Prescription drugs that are not on the formulary are not covered unless they are approved through the exception process in section 7.", at: ["own"] },
  { n: "L5", doc: "ADI-BNF-003", benefit: "Preventive services", text: "Preventive services are limited to two cleanings and two exams per plan year.", at: ["own"] },
  { n: "L6", doc: "ADI-BNF-003", benefit: "Major services", text: "Major services are not covered during the first 12 months of dental coverage for an employee who waives dental coverage when first eligible and enrolls at a later open enrollment.", at: ["3"] },
  { n: "L7", doc: "ADI-BNF-003", benefit: "Frames", text: "Frames are limited to one pair every 24 months.", at: ["own", "5"] },
  { n: "L8", doc: "ADI-BNF-003", benefit: "Contact lenses", text: "Contact lenses are not covered in any 24-month period in which the plan has already paid for a pair of glasses.", at: ["own", "5"] },
  { n: "L9", doc: "ADI-BNF-004", benefit: "Accidental death insurance", text: "A loss that occurs more than 365 days after an accident is not covered by accidental death insurance.", at: ["own", "5"] },
  { n: "L10", doc: "ADI-BNF-004", benefit: "Short-term disability", text: "Short-term disability is limited to 12 weeks for any one period of disability.", at: ["own", "5"] },
  { n: "L11", doc: "ADI-BNF-005", benefit: "Commuter benefits", text: "Rideshare trips and tolls are not covered by commuter benefits.", at: ["own", "5"] },
  { n: "L12", doc: "ADI-BNF-006", benefit: "Employee assistance program", text: "The employee assistance program is limited to six counseling sessions per issue in each plan year.", at: ["own", "5"] },
  { n: "L13", doc: "ADI-BNF-006", benefit: "Learning and wellness allowance", text: "The learning and wellness allowance is limited to $1,000 per calendar year, and an unused amount does not carry over.", at: ["own"] },
  { n: "L14", doc: "ADI-BNF-001", benefit: "Loans", text: "Loans are limited to one outstanding loan at a time.", at: ["own", "5"] },
  { n: "L15", doc: "ADI-BNF-008", benefit: "Loans", text: "Loans are limited to one outstanding loan at a time.", at: ["own", "5"] },
  { n: "G1", doc: "ADI-BNF-002", benefit: null, text: "Cosmetic procedures are excluded.", at: ["5"] },
  { n: "G2", doc: "ADI-BNF-002", benefit: null, text: "Experimental or investigational treatment is not covered.", at: ["5"] },
  { n: "G3", doc: "ADI-BNF-003", benefit: null, text: "Cosmetic dental procedures are excluded.", at: ["5"] },
];

// ---------------------------------------- plan 2.2.3, the byte-identical three

const MILLGATE_SENTENCE = "The medical, dental and vision, and life coverages are insured under group policies placed and administered through Millgate Insurance Services, and the insurer for each coverage is named on the certificate of coverage in the HRIS.";
const SELF_FUNDED_SENTENCE = "Short-term and long-term disability are self-funded by the Company.";
const SPANISH_NOTICE = "Aviso: Este documento contiene información importante sobre sus beneficios en Atticus Dundee Inc. Si necesita ayuda en español, escriba a peopleops@atticusdundee.example.";
const PREMIUM_SENTENCE = "Your share of the premium for each option and coverage tier is shown in the HRIS when you enroll.";
const EMAIL = "peopleops@atticusdundee.example";

// ------------------------------------------ plan 2.2.3, the closed money list

/** Every money token HR-19 may carry, by document; a document not listed carries none. */
const MONEY = {
  "ADI-BNF-002": ["$1,000", "$2,000", "$4,000", "$8,000", "$5,000", "$10,000"],
  "ADI-BNF-003": ["$1,500", "$150"],
  "ADI-BNF-004": ["$1,000", "$250,000", "$1,500", "$10,000"],
  "ADI-BNF-006": ["$1,000"],
};

// ----------------------------------- plan 2.2.3 and 0.10, handbook agreement

/**
 * Each phrase, the (document, section) places it must sit in, and the wording
 * the committed handbook carries where it words the same fact differently.
 * A null section means anywhere in the document.
 */
const HANDBOOK_FACTS = [
  { phrase: "20 or more hours per week", handbook: "at least 20 hours per week", at: [["002", "2"], ["003", "2"], ["004", "2"], ["005", "2"], ["006", "2"], ["007", "3"]] },
  { phrase: "first day of the month following the date of hire", at: [["007", "3"], ["002", "2"], ["003", "2"], ["004", "2"]] },
  { phrase: "within 30 days", at: [["007", "3"], ["007", "5"]], only: true },
  { phrase: "each November", at: [["007", "4"]] },
  { phrase: "next open enrollment", at: [["007", "4"]] },
  { phrase: "marriage, divorce, birth or adoption", at: [["007", "5"]] },
  { phrase: "loss of other coverage", at: [["007", "5"]] },
  { phrase: "the fifth day of each month", at: [["002", "6"], ["003", "6"]] },
  { phrase: "more than 30 days late", at: [["002", "6"], ["003", "6"]] },
  { phrase: "at least 15 days", at: [["002", "6"], ["003", "6"]] },
  { phrase: "next open enrollment or qualifying life event", handbook: "next open enrollment or the next qualifying life event", at: [["002", "6"], ["003", "6"]] },
  { phrase: "compensation actually paid", at: [["001", "6"], ["008", "6"]] },
  { phrase: "suspended during unpaid periods", at: [["005", "6"]] },
  { phrase: "continues for the duration of an approved leave", at: [["004", "6"]] },
  { phrase: "the last day of the month in which separation occurs", at: [["002", "2"], ["003", "2"]] },
  { phrase: "continuation coverage information from the plan administrator", at: [["002", "2"], ["003", "2"]] },
  { phrase: "employer-paid basic life and accidental death insurance", at: [["004", null]] },
  { phrase: "100 percent of the first 4 percent", at: [["008", null]] },
];
const NEW_MATCH = "100 percent of the first 4 percent";
const OLD_MATCH = "50 percent of the first 6 percent";

// --------------------------------------------- plan 2.2.7, the ten seed rows

const SEED_COLUMNS = ["Question ID", "Language", "Question", "English gloss", "Expected outcome", "Answer sources", "Route to"];
const SEED_ROWS = [
  ["BSQ-01", "en", "Does the medical plan cover physical therapy after a sports injury, and how many visits?", "None", "answer", "ADI-BNF-002", "None"],
  ["BSQ-02", "en", "How many chiropractic visits does the medical plan cover in a plan year?", "None", "answer", "ADI-BNF-002", "None"],
  ["BSQ-03", "en", "Does the dental plan cover crowns, and at what share?", "None", "answer", "ADI-BNF-003", "None"],
  ["BSQ-04", "en", "How often does the vision plan pay for new frames?", "None", "answer", "ADI-BNF-003", "None"],
  ["BSQ-05", "en", "How much basic life insurance does the Company provide, and do I pay for it?", "None", "answer", "ADI-BNF-004", "None"],
  ["BSQ-06", "en", "What is the Company match on 401(k) contributions, and when is the match vested?", "None", "answer", "ADI-BNF-008", "None"],
  ["BSQ-07", "en", "Can I use the commuter benefit to pay for parking near the office?", "None", "answer", "ADI-BNF-005", "None"],
  ["BSQ-08", "en", "I am getting married in June. How long do I have to add my spouse to my medical coverage, and on what date would the coverage start?", "None", "answer", "ADI-BNF-007; ADI-BNF-002", "None"],
  ["BSQ-09", "en", "I have asthma and see a specialist every month. Which medical option should I pick at open enrollment so my costs are lowest?", "None", "refuse_and_route", "None", "Constance Adeyemi, Chief People Officer"],
  ["BSQ-10", "es", "¿Cuántos días tengo para elegir mis beneficios después de mi fecha de contratación?", "How many days do I have to choose my benefits after my hire date?", "answer", "ADI-BNF-007", "None"],
];

/** Words that name a health matter, for the plan's health-mention census. */
const HEALTH_TERMS = [
  "injury", "injured", "asthma", "illness", "ill", "sick", "sickness", "disease", "diagnosis",
  "diagnosed", "condition", "pregnant", "pregnancy", "surgery", "symptom", "symptoms",
  "diabetes", "cancer", "depression", "anxiety", "allergy", "chronic", "medication",
];

// ---------------------------------------------- plan 2.0 rule 5, D4 and D5

/** Statute, regulation and agency tokens, matched case-sensitively at word boundaries. */
const STATUTE_TOKENS = [
  "ERISA", "COBRA", "HIPAA", "IRS", "Internal Revenue", "Revenue Code", "Code", "Act",
  "Department of Labor", "DOL", "CFR", "C.F.R.", "U.S.C.", "USC", "ACA", "Affordable Care",
  "PPACA", "FMLA", "USERRA", "ADA", "EEOC", "Treasury", "Medicare", "Medicaid",
  "Section 125", "Section 129", "Section 132", "Section 223", "Section 401",
  "regulation", "regulations", "statute", "Statute",
];

/** HR-17 columns whose values are the record set's own strings rather than roster copies. */
const HR17_VALUE_COLUMNS = [
  "record_id", "date_of_birth", "home_city", "emergency_contact_name", "emergency_contact_phone",
  "health_accommodation_note", "occupational_health_status", "trade_union_membership",
  "criminal_record_check_status", "immigration_status",
];

// --------------------------------------------------------------- file access

const artifactDir = () => join(REPO_ROOT, "artifacts", ARTIFACT);

function markdownNames() {
  const dir = artifactDir();
  assert.ok(existsSync(dir), `${ARTIFACT} is not authored yet: ${dir} does not exist`);
  return readdirSync(dir).filter((n) => n.endsWith(".md")).sort();
}

const readSource = (name) => readFileSync(join(artifactDir(), name), "utf8");
const readDoc = (id) => readSource(byId(id).file);
const allMarkdown = () => markdownNames().map((name) => ({ name, text: readSource(name) }));
const libraryDocs = () => LIBRARY.map((d) => ({ ...d, text: readSource(d.file) }));

// ------------------------------------------------------------------ parsers

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const count = (hay, needle) => hay.split(needle).length - 1;
const cells = (line) => line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

/** `## Heading` sections, as heading -> body, in file order. `### ` is not a split point. */
function sections(text) {
  const out = new Map();
  for (const chunk of text.split(/^## /m).slice(1)) {
    const nl = chunk.indexOf("\n");
    out.set(chunk.slice(0, nl).trim(), nl < 0 ? "" : chunk.slice(nl + 1));
  }
  return out;
}

/** The body of the numbered section `n`, or of the named unnumbered section. */
function section(text, key) {
  for (const [heading, body] of sections(text)) {
    if (heading === key || heading.startsWith(`${key}. `)) return body;
  }
  return undefined;
}

/** Section 4's `### ` subsections, as heading -> body, plus the preamble before them. */
function subsections(body) {
  const chunks = body.split(/^### /m);
  const out = new Map();
  for (const chunk of chunks.slice(1)) {
    const nl = chunk.indexOf("\n");
    out.set(chunk.slice(0, nl).trim(), chunk.slice(nl + 1));
  }
  return { preamble: chunks[0], subs: out };
}

/** A section's first markdown table, as header cells and data rows. */
function table(body) {
  const lines = body.split("\n").filter((l) => l.startsWith("|"));
  assert.ok(lines.length >= 2, "expected a markdown table and found none");
  const cols = cells(lines[0]);
  assert.match(lines[1], /^\|(?:\s*-+\s*\|)+$/, "the table's second line is not a separator row");
  const rows = lines.slice(2).map(cells);
  for (const r of rows) assert.equal(r.length, cols.length, `a table row has ${r.length} cells against ${cols.length} columns`);
  return { cols, rows };
}

/** The ten-field control block as [field, value] pairs, in file order. */
function controlBlock(text) {
  const body = section(text, "Document Control");
  assert.ok(body !== undefined, "the file carries no Document Control section");
  const { cols, rows } = table(body);
  assert.deepEqual(cols, ["Field", "Value"], "the control block's columns have drifted");
  return rows;
}
const control = (text) => new Map(controlBlock(text));

function versionHistory(text) {
  const body = section(text, "Version History");
  assert.ok(body !== undefined, "the file carries no Version History section");
  return table(body);
}

/** The index's register table. */
function register() {
  const body = section(readSource(INDEX), "7");
  assert.ok(body !== undefined, "the index carries no section 7");
  return table(body);
}
const registerRows = () => {
  const { cols, rows } = register();
  return rows.map((r) => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
};

function seedTable() {
  const { cols, rows } = table(readSource(SEED));
  return { cols, rows, objects: rows.map((r) => Object.fromEntries(cols.map((c, i) => [c, r[i]]))) };
}

/** A file with its Document Control section and its Version History section removed. */
function withoutControl(text) {
  return text
    .replace(/^## Document Control\n[\s\S]*?(?=^## )/m, "")
    .replace(/^## Version History\n[\s\S]*$/m, "");
}

/** As withoutControl, and with the index register's table lines removed as well. */
function datedBody(name, text) {
  let out = withoutControl(text);
  if (name === INDEX) {
    out = out.replace(/(^## 7\. Benefits Plan Register\n)([\s\S]*?)(?=^## )/m,
      (_, head, body) => head + body.split("\n").filter((l) => !l.startsWith("|")).join("\n"));
  }
  return out;
}

/** Sentences of a file's prose, one line at a time, split after a stop before a capital. */
const sentencesOf = (text) => text.split("\n")
  .flatMap((line) => line.split(/(?<=[.?!])\s+(?=[A-Z¿])/))
  .map((s) => s.trim()).filter(Boolean);

/** Every region a sentence is stated in, one entry per occurrence. */
function placesOf(text, sentence) {
  const out = [];
  for (const [heading, body] of sections(text)) {
    const key = heading.match(/^(\d+)\. /)?.[1] ?? heading;
    if (key === "4") {
      const { preamble, subs } = subsections(body);
      for (let i = 0; i < count(preamble, sentence); i += 1) out.push("4");
      for (const [sub, subBody] of subs) {
        for (let i = 0; i < count(subBody, sentence); i += 1) out.push(`4:${sub}`);
      }
    } else {
      for (let i = 0; i < count(body, sentence); i += 1) out.push(key);
    }
  }
  return out.sort();
}

const namesHeading = (sentence, heading) =>
  new RegExp(`\\b${escapeRegExp(heading)}\\b`, "i").test(sentence);

// ------------------------------------------------- canon, roster and HR-17

/** A canon people row by id, as { name, title }. */
function canonPerson(id) {
  const text = readFileSync(join(REPO_ROOT, "canon", "people.md"), "utf8");
  const m = text.match(new RegExp(`^\\|\\s*${id}\\s*\\|\\s*([^|]+?)\\s*\\|\\s*([^|]+?)\\s*\\|`, "m"));
  assert.ok(m, `canon/people.md carries no ${id} row`);
  return { name: m[1], title: m[2] };
}
const owner = () => canonPerson("pe-105");
const approver = () => canonPerson("pe-103");
const ownerCell = () => `${owner().name}, ${owner().title}`;
const approverCell = () => `${approver().name}, ${approver().title}`;

const company = (id) => {
  const c = canon.get(id);
  assert.ok(c, `canon/companies.md carries no ${id}`);
  return c.name;
};
const PROTAGONIST = () => company("co-002");
const CARRIER = () => company("co-105");

const core05 = (name) => readFileSync(join(REPO_ROOT, "artifacts", "CORE-05", name), "utf8");
const HANDBOOK = "internal-policy-library-employee-handbook.md";

/**
 * What HR-19 cites from CORE-05, read from the committed files: the handbook's
 * title and id, the policy library index's id, and the closed status list the
 * policy library's conventions section publishes.
 */
function core05Refs() {
  const handbook = core05(HANDBOOK);
  const index = core05("internal-policy-library.md");
  const statuses = [...(section(index, "8") ?? "").matchAll(/`([A-Z][a-z]+)` means/g)].map((m) => m[1]);
  assert.deepEqual(statuses, ["Active", "Superseded", "Retired"], "the CORE-05 status vocabulary has drifted");
  return [
    `${handbook.match(/^# (.+)$/m)[1]}, ${control(handbook).get("Document ID")}`,
    control(index).get("Document ID"),
    ...statuses,
  ];
}

const roster = () => csvTable(
  fileByPath(generateArtifact(specs.byId.get("CORE-04"), canon), "people-roster.csv").content
).rows;

function hr17Values() {
  const files = generateArtifact(specs.byId.get("HR-17"), canon);
  const { rows } = csvTable(fileByPath(files, "mixed-sensitivity-employee-dataset.csv").content);
  assert.equal(rows.length, 40, `the in-process HR-17 build returned ${rows.length} records, expected 40`);
  const values = new Set();
  for (const r of rows) {
    for (const c of HR17_VALUE_COLUMNS) {
      assert.ok(c in r, `HR-17 carries no ${c} column`);
      if (r[c]) values.add(r[c]);
    }
  }
  return [...values];
}

// ------------------------------------------------------------------ furniture

// The one place a typed list is allowed. "People Operations", "Plan Year",
// "HRIS", "BSQ", "ADI" and the Spanish notice's words are the plan 2.2.6
// furniture set ("Operations" is that phrase's second word, which the word
// screen sees alone). The rest is furniture the documents' own grammar needs:
// "Company" and "Company's" are the second-person SPD's name for the
// protagonist and "The" the article that opens it at a sentence start; "BNF"
// is the library's area code (plan 2.2.2) and "MAJOR.MINOR" the CORE-05 version
// convention the index restates; "Restates" and "Registered" open version
// history cells ahead of a document id; "November" is the handbook's "each
// November"; "I" and "June" are the seed questions' own words, and "Cu" is
// what the word screen makes of the Spanish question's first word, which
// follows an opening question mark the opener rule does not know. Everything
// else is derived below.
const FURNITURE_PHRASES = [
  "People Operations",
  "Plan Year",
];
const FURNITURE_WORDS = [
  "HRIS", "BSQ", "ADI", "Operations", "Aviso", "Este", "Si",
  "Company", "Company's", "The", "BNF", "MAJOR.MINOR", "Restates", "Registered",
  "November", "I", "June", "Cu",
];

// ------------------------------------------------------------- the freeze gate

test("the C7 drafted freeze gate is one markdown artifact set whose spec says so", () => {
  const spec = specs.byId.get(ARTIFACT);
  assert.ok(spec, `${ARTIFACT} is not in the spec catalog`);
  assert.equal(spec.generation, "drafted-frozen", `${ARTIFACT} is not drafted-frozen`);
  assert.equal(spec.format, "markdown", `${ARTIFACT} format drifted from markdown built to DOCX`);
  assert.equal(spec.columns, undefined, `${ARTIFACT} is prose and carries no columns`);
  assert.deepEqual(spec.canon_entities, ["co-002", "co-105"], `${ARTIFACT} canon entities drifted`);
});

// ------------------------------------------------------------------ HR-C7-T1

test("HR-C7-T1: ten files, nine control blocks ADI-BNF-000 to 008, and a register that repeats them", () => {
  assert.deepEqual(
    markdownNames(), [...LIBRARY.map((d) => d.file), SEED].sort(),
    `${ARTIFACT} is not exactly the ten markdown files of plan 2.2.1`
  );

  const ids = [];
  for (const d of libraryDocs()) {
    const title = d.text.match(/^# (.+)$/m);
    assert.ok(title && d.text.startsWith(`# ${d.title}\n`), `${d.file}: the title is not "${d.title}"`);
    const rows = controlBlock(d.text);
    assert.deepEqual(rows.map(([f]) => f), CONTROL_FIELDS, `${d.file}: the control block's ten rows are not in order`);
    const [lastReviewed, nextReview, supersedes, supersededBy] = CONTROL[d.id];
    assert.deepEqual(rows.map(([, v]) => v), [
      d.id, d.version, d.status, ownerCell(), approverCell(),
      d.effective, lastReviewed, nextReview, supersedes, supersededBy,
    ], `${d.file}: the control values differ from plan 2.2.1 and 2.2.2`);
    ids.push(control(d.text).get("Document ID"));
  }
  assert.deepEqual(ids, [0, 1, 2, 3, 4, 5, 6, 7, 8].map(docId), "the Document IDs are not ADI-BNF-000 to 008, dense and in file order");
  assert.equal(new Set(ids).size, 9, "a Document ID repeats");

  const { cols } = register();
  assert.deepEqual(cols, REGISTER_COLUMNS, "the register's columns are not CORE-05's eight");
  const rows = registerRows();
  assert.equal(rows.length, 8, `the register carries ${rows.length} rows, expected 8`);
  assert.deepEqual(rows.map((r) => r["Document ID"]), PLAN_DOCS, "the register does not list 001 to 008 in order, without the index");
  for (const r of rows) {
    const d = libraryDocs().find((x) => x.id === r["Document ID"]);
    const c = control(d.text);
    assert.equal(r.Title, d.text.match(/^# (.+)$/m)[1], `${r["Document ID"]}: the register title differs from the document's own`);
    for (const f of ["Version", "Status", "Effective Date", "Last Reviewed", "Next Review Due"]) {
      assert.equal(r[f], c.get(f), `${r["Document ID"]}: the register's ${f} differs from the control block`);
    }
    assert.equal(r.Owner, c.get("Owner").split(", ")[0], `${r["Document ID"]}: the register Owner is not the control block's owner by short name`);
  }

  // The seed set is not a library document.
  const seed = readSource(SEED);
  assert.ok(seed.startsWith(`# ${SEED_TITLE}\n`), `the seed set's title is not "${SEED_TITLE}"`);
  assert.equal(sections(seed).has("Document Control"), false, "the seed set carries a control block");
});

// ------------------------------------------------------------------ HR-C7-T2

test("HR-C7-T2: the section grammar, section 4's subsections verbatim, and the version histories", () => {
  for (const d of libraryDocs()) {
    const keys = [...sections(d.text).keys()];
    let expected;
    if (d.id === "ADI-BNF-000") expected = INDEX_SECTIONS;
    else if (d.id === "ADI-BNF-007") expected = CALENDAR_SECTIONS;
    else if (d.id === "ADI-BNF-008") expected = [SPD_SECTIONS[0], CHANGES, ...SPD_SECTIONS.slice(1)];
    else expected = SPD_SECTIONS;
    assert.deepEqual(keys, expected, `${d.file}: the section grammar has drifted`);
    for (const [heading, body] of sections(d.text)) {
      assert.ok(body.trim().length > 0, `${d.file}: the ${heading} section is empty`);
    }
    if (SUBSECTIONS[d.id]) {
      const { subs } = subsections(section(d.text, "4"));
      assert.deepEqual([...subs.keys()], SUBSECTIONS[d.id], `${d.file}: section 4's subsection headings differ from plan 2.2.3`);
    } else {
      assert.equal(/^### /m.test(d.text), false, `${d.file}: carries a ### subsection its grammar does not`);
    }
  }
  const changes = libraryDocs().filter((d) => sections(d.text).has(CHANGES));
  assert.deepEqual(changes.map((d) => d.id), ["ADI-BNF-008"], "Changes From Version 1.0 is not carried by 008 alone");

  for (const d of libraryDocs()) {
    const { cols, rows } = versionHistory(d.text);
    assert.deepEqual(cols, HISTORY_COLUMNS, `${d.file}: the version history columns are not CORE-05's four`);
    assert.deepEqual(rows.map((r) => [r[0], r[1]]), HISTORY[d.id], `${d.file}: the version history rows differ from plan 2.2.2`);
    assert.equal(rows[rows.length - 1][0], control(d.text).get("Version"), `${d.file}: the last history row is not the control block's Version`);
    for (const r of rows) {
      assert.ok(r[1] <= AS_OF, `${d.file}: version ${r[0]} is dated ${r[1]}, after the as-of`);
      assert.equal(r[3], approver().name, `${d.file}: version ${r[0]} is not approved by the approver by short name`);
      assert.ok(r[2].length > 0, `${d.file}: version ${r[0]} carries no summary`);
    }
    assert.ok(d.text.trimEnd().endsWith(`| ${approver().name} |`), `${d.file}: the document does not end at its version history`);
  }
  assert.ok(versionHistory(readDoc("ADI-BNF-008")).rows[0][2].includes("Restates ADI-BNF-001"), "008's history does not state that it restates ADI-BNF-001");
});

// ------------------------------------------------------------------ HR-C7-T3

test("HR-C7-T3: HR-19b, one superseded pair, and the three qualifier-dropped censuses", () => {
  const docs = libraryDocs().map((d) => ({ ...d, c: control(d.text), history: versionHistory(d.text).rows }));
  const superseded = docs.filter((d) => d.c.get("Status") === "Superseded");
  assert.equal(superseded.length, 1, `${superseded.length} documents read Superseded, expected 1`);
  const old = superseded[0];
  const successor = docs.find((d) => d.id === old.c.get("Superseded By"));
  assert.ok(successor, `the Superseded By of ${old.id} names no document in this library`);
  assert.equal(successor.c.get("Supersedes"), old.id, `${successor.id} does not name ${old.id} back in its Supersedes`);
  assert.equal(successor.c.get("Status"), "Active", "the successor is not Active");

  const reg = registerRows();
  const regStatus = new Map(reg.map((r) => [r["Document ID"], r.Status]));
  assert.equal(regStatus.get(old.id), "Superseded", "the register does not carry the superseded document as Superseded");
  assert.equal(regStatus.get(successor.id), "Active", "the register does not carry the successor as Active");
  assert.equal(reg.filter((r) => r.Status === "Superseded").length, 1, "the register's Superseded census has moved off 1");

  const nonNone = docs.filter((d) => d.c.get("Supersedes") !== "None");
  assert.equal(nonNone.length, 8, `the non-None Supersedes census is ${nonNone.length}, expected 8`);
  assert.equal(docs.length, 9, "the census is not taken over nine documents");
  const differentId = docs.filter((d) => {
    const s = d.c.get("Supersedes");
    return s !== "None" && s.split(" ")[0] !== d.id;
  });
  assert.equal(differentId.length, 1, `the different-id Supersedes census is ${differentId.length}, expected 1`);
  const multiRow = docs.filter((d) => d.history.length > 1);
  assert.equal(multiRow.length, 7, `the more-than-one-history-row census is ${multiRow.length}, expected 7`);
  assert.equal(multiRow.some((d) => d.id === old.id || d.id === successor.id), false, "the multi-row census reaches a pair member");
});

// ------------------------------------------------------------------ HR-C7-T4

test("HR-C7-T4: HR-19a, the eighteen sentences in place, two limitations away from their benefit", () => {
  // The index publishes the lexicon as the reading rule.
  assert.ok(
    section(readSource(INDEX), "3").includes("A limitation is written with one of the phrases limited to, not covered or excluded, and names the benefit it limits."),
    "the index no longer publishes the limitation reading rule"
  );

  // Every lexicon-bearing sentence of 001 to 008 is one of the eighteen.
  let lexiconSentences = 0;
  for (const id of PLAN_DOCS) {
    const own = SENTENCES.filter((s) => s.doc === id).map((s) => s.text);
    for (const s of sentencesOf(readDoc(id))) {
      if (!LEXICON.test(s)) continue;
      lexiconSentences += 1;
      assert.ok(own.includes(s), `${id} carries a lexicon sentence outside plan 2.2.4: "${s}"`);
    }
  }
  assert.equal(lexiconSentences, 28, `the lexicon-sentence census over 001 to 008 is ${lexiconSentences}, expected 28`);

  // Each sentence sits exactly where the table says, and nowhere else.
  const texts = [...new Set(SENTENCES.map((s) => s.text))];
  for (const id of PLAN_DOCS) {
    const text = readDoc(id);
    for (const t of texts) {
      const expected = SENTENCES.filter((s) => s.doc === id && s.text === t)
        .flatMap((s) => s.at.map((a) => (a === "own" ? `4:${s.benefit}` : a))).sort();
      assert.deepEqual(placesOf(text, t), expected, `${id}: "${t}" is not stated exactly where plan 2.2.4 places it`);
    }
  }

  // Each benefit-tied sentence names exactly one section-4 heading of its own
  // document, and a general exclusion names none.
  for (const s of SENTENCES) {
    const named = (SUBSECTIONS[s.doc] ?? []).filter((h) => namesHeading(s.text, h));
    assert.deepEqual(named, s.benefit ? [s.benefit] : [], `${s.n}: names ${JSON.stringify(named)} of ${s.doc}'s headings`);
  }

  // The censuses, recomputed from the bytes: which lexicon sentence names which
  // heading, and where each such limitation is stated.
  const limitations = [];
  for (const id of PLAN_DOCS) {
    const text = readDoc(id);
    const headings = SUBSECTIONS[id] ?? [];
    const found = new Map();
    for (const s of new Set(sentencesOf(text).filter((x) => LEXICON.test(x)))) {
      const named = headings.filter((h) => namesHeading(s, h));
      assert.ok(named.length <= 1, `${id}: "${s}" names more than one benefit`);
      if (named.length === 1) found.set(named[0], [...(found.get(named[0]) ?? []), ...placesOf(text, s)]);
    }
    for (const [benefit, places] of found) limitations.push({ id, benefit, places });
  }
  assert.equal(limitations.length, 15, `the benefit-tied census is ${limitations.length}, expected 15`);
  assert.equal(new Set(limitations.map((l) => l.id)).size, 7, "the benefit-tied limitations do not span seven documents");
  assert.equal(limitations.some((l) => l.id === "ADI-BNF-007"), false, "007 carries a benefit-tied limitation");

  const elsewhere = limitations.filter((l) => l.places.some((p) => p !== `4:${l.benefit}`));
  assert.equal(elsewhere.length, 12, `the stated-elsewhere census is ${elsewhere.length}, expected 12`);
  const notIn5 = limitations.filter((l) => !l.places.includes("5"));
  assert.equal(notIn5.length, 5, `the absent-from-section-5 census is ${notIn5.length}, expected 5`);
  const away = limitations.filter((l) => !l.places.includes(`4:${l.benefit}`));
  assert.equal(away.length, 2, `${away.length} benefit-tied limitations have no sentence in their own subsection, expected 2`);
  assert.deepEqual(away.map((l) => l.id).sort(), ["ADI-BNF-002", "ADI-BNF-003"], "the two limitations away from their benefit are not one in 002 and one in 003");
  assert.equal(limitations.filter((l) => l.places.includes("7")).length, 1, "the section-7 limitation census has moved off 1");
  assert.equal(limitations.filter((l) => l.places.includes("3")).length, 1, "the section-3 limitation census has moved off 1");
});

// ------------------------------------------------------------------ HR-C7-T5

test("HR-C7-T5: the seed set is the ten rows of plan 2.2.7, with its three singletons and two censuses", () => {
  const { cols, rows, objects } = seedTable();
  assert.deepEqual(cols, SEED_COLUMNS, "the seed table's seven columns have drifted");
  assert.deepEqual(rows, SEED_ROWS, "the seed table differs from plan 2.2.7's ten rows");

  const sources = (r) => (r["Answer sources"] === "None" ? [] : r["Answer sources"].split("; "));
  const twoSource = objects.filter((r) => sources(r).length === 2);
  assert.equal(twoSource.length, 1, `${twoSource.length} rows name two answer sources, expected 1`);
  assert.equal(objects.filter((r) => sources(r).length > 0).length, 9, "the rows-naming-a-source census has moved off 9");

  const refuse = objects.filter((r) => r["Expected outcome"] === "refuse_and_route");
  assert.equal(refuse.length, 1, `${refuse.length} rows refuse and route, expected 1`);
  assert.equal(refuse[0]["Answer sources"], "None", "the refuse row names an answer source");
  const route = section(readSource(INDEX), "4").match(/Questions of either kind go to ([^.]+)\./);
  assert.ok(route, "the index carries no route sentence in section 4");
  assert.equal(refuse[0]["Route to"], route[1], "the refuse row's Route to is not the index's route sentence's named human");
  assert.equal(route[1], ownerCell(), "the route sentence does not name the Chief People Officer");
  assert.deepEqual(new Set(objects.map((r) => r["Expected outcome"])), new Set(["answer", "refuse_and_route"]), "the outcome vocabulary is not closed at two values");
  for (const r of objects.filter((x) => x["Expected outcome"] === "answer")) {
    assert.equal(r["Route to"], "None", `${r["Question ID"]} answers and routes`);
  }

  const nonEn = objects.filter((r) => r.Language !== "en");
  assert.equal(nonEn.length, 1, `${nonEn.length} rows are not in English, expected 1`);
  assert.notEqual(nonEn[0]["English gloss"], "None", "the non-English row carries no gloss");
  assert.equal(objects.filter((r) => r["English gloss"] !== "None").length, 1, "a gloss sits on an English row");
  assert.equal(objects.filter((r) => /[^\x00-\x7F]/.test(r.Question)).length, 1, "the non-ASCII question census has moved off 1");
  assert.equal(new Set([twoSource[0], refuse[0], nonEn[0]].map((r) => r["Question ID"])).size, 3, "the three singleton rows are not distinct");

  const active = new Set(registerRows().filter((r) => r.Status === "Active").map((r) => r["Document ID"]));
  for (const r of objects) {
    for (const s of sources(r)) assert.ok(active.has(s), `${r["Question ID"]} cites ${s}, which is not an Active register row`);
  }

  assert.equal(objects.filter((r) => r.Question.includes(", and")).length, 5, "the \", and\" census has moved off 5");
  const health = objects.filter((r) => HEALTH_TERMS.some((t) => new RegExp(`\\b${t}\\b`, "i").test(r.Question)));
  assert.equal(health.length, 2, `the health-mention census is ${health.length}, expected 2`);
  assert.equal(objects.filter((r) => /\bshould I\b/.test(r.Question)).length, 1, "the \"should I\" census has moved off 1");
});

// ------------------------------------------------------------------ HR-C7-T6

test("HR-C7-T6: no control or history date after the as-of, body dates inside 2026, and one home for the QLE window", () => {
  for (const d of libraryDocs()) {
    const c = control(d.text);
    for (const f of ["Effective Date", "Last Reviewed"]) {
      assert.ok(c.get(f) <= AS_OF, `${d.file}: ${f} ${c.get(f)} is after ${AS_OF}`);
    }
    for (const r of versionHistory(d.text).rows) {
      assert.ok(r[1] <= AS_OF, `${d.file}: version history date ${r[1]} is after ${AS_OF}`);
    }
  }
  // The register's Effective Date and Last Reviewed cells, under the same rule.
  for (const r of registerRows()) {
    for (const f of ["Effective Date", "Last Reviewed"]) {
      assert.ok(r[f] <= AS_OF, `the register's ${r["Document ID"]} ${f} ${r[f]} is after ${AS_OF}`);
    }
  }

  for (const { name, text } of allMarkdown()) {
    for (const date of datedBody(name, text).match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? []) {
      assert.ok(date >= "2026-01-01" && date <= "2026-12-31", `${name}: body date ${date} lies outside the 2026 plan year`);
    }
  }
  assert.ok(section(readDoc("ADI-BNF-007"), "4").includes("2026-11-02 to 2026-11-13"), "007 section 4 does not carry the next open enrollment window");
  assert.deepEqual(section(readDoc("ADI-BNF-008"), CHANGES).match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? [], [], "008's Changes section carries an ISO date");

  const seed = readSource(SEED);
  assert.deepEqual(seed.match(/\b\d{4}-\d{2}-\d{2}\b|\b(?:19|20)\d{2}\b/g) ?? [], [], "the seed set carries a date token");

  for (const { name, text } of allMarkdown()) {
    const n = count(text, "within 30 days");
    if (name === byId("ADI-BNF-007").file) assert.ok(n > 0, "007 does not carry the QLE reporting window");
    else assert.equal(n, 0, `${name} carries "within 30 days", which lives in 007 only`);
  }
  assert.equal(
    readDoc("ADI-BNF-007").includes("on the date of the birth or placement for a birth or adoption"), false,
    "007 carries the QLE coverage start rule, which lives in the plan documents"
  );
});

// ------------------------------------------------------------------ HR-C7-T7

test("HR-C7-T7: every capitalized string is accounted for, and the two officers are named only where they belong", () => {
  const headings = allMarkdown().flatMap(({ text }) => [...text.matchAll(/^#{1,3} (.+)$/gm)].map((m) => m[1].trim()));
  const allowed = allowedFrom({
    derived: [
      PROTAGONIST(), CARRIER(),
      owner().name, owner().title, approver().name, approver().title, ownerCell(), approverCell(),
      ...headings, ...headings.map((h) => h.replace(/^\d+\. /, "")),
      ...LIBRARY.map((d) => d.title), SEED_TITLE,
      ...OPTION_NAMES,
      ...CONTROL_FIELDS, ...REGISTER_COLUMNS, ...HISTORY_COLUMNS, ...SEED_COLUMNS,
      ...new Set(LIBRARY.map((d) => d.status)),
      ...LIBRARY.map((d) => d.id), ...Object.values(CONTROL).flat(),
      ...SEED_ROWS.map((r) => r[0]),
      ...core05Refs(),
      // The identifier form the index quotes from plan 2.2.2.
      "ADI-<AREA>-<NNN>",
    ],
    furniturePhrases: FURNITURE_PHRASES,
    furnitureWords: FURNITURE_WORDS,
  });
  for (const { name, text } of allMarkdown()) {
    assert.deepEqual(unscreenedPhrases(text, allowed), [], `unscreened capitalized phrase(s) in ${ARTIFACT}/${name}`);
    assert.deepEqual(unscreenedWords(text, allowed), [], `unscreened capitalized word(s) in ${ARTIFACT}/${name}`);
  }

  // No canon company other than the protagonist and the carrier.
  for (const { name, text } of allMarkdown()) {
    for (const c of canon.values()) {
      if (c.id === "co-002" || c.id === "co-105") continue;
      assert.equal(text.includes(c.name), false, `${name} names canon company "${c.name}"`);
    }
    const emails = new Set(text.match(/[\w.+-]+@[\w.-]+\w/g) ?? []);
    for (const e of emails) assert.equal(e, EMAIL, `${name} carries the address ${e}`);
  }

  // Outside control blocks and version histories, the officers occur only in
  // the index route sentence, the index register's Owner cells and the seed
  // row's Route to cell.
  const officerTokens = [owner().name, approver().name, ...owner().name.split(" "), ...approver().name.split(" ")];
  for (const { name, text } of allMarkdown()) {
    let rest = withoutControl(text);
    if (name === INDEX) {
      assert.equal(count(rest, `Questions of either kind go to ${ownerCell()}.`), 1, "the index carries the route sentence other than once");
      rest = rest.replace(`Questions of either kind go to ${ownerCell()}.`, "");
      const ownerCells = count(section(rest, "7"), `| ${owner().name} |`);
      assert.equal(ownerCells, 8, `the register carries ${ownerCells} Owner cells by short name, expected 8`);
      rest = rest.split(`| ${owner().name} |`).join("| |");
    }
    if (name === SEED) {
      assert.equal(count(rest, `| ${ownerCell()} |`), 1, "the seed set carries the Route to cell other than once");
      rest = rest.replace(`| ${ownerCell()} |`, "| |");
    }
    for (const t of officerTokens) {
      assert.equal(new RegExp(`\\b${escapeRegExp(t)}\\b`).test(rest), false, `${name} names "${t}" outside the places plan 2.2 allows`);
    }
  }
});

// ------------------------------------------------------------------ HR-C7-T8

test("HR-C7-T8: no person, no HR-17 value, no statute, no percent sign, and money only from the closed list", () => {
  const names = [...new Set(roster().map((r) => `${r.first_name} ${r.last_name}`))];
  assert.ok(names.length >= 600, `the in-process roster yielded ${names.length} names`);
  const values = hr17Values();
  assert.ok(values.length > 40, `the in-process HR-17 build yielded ${values.length} value strings`);

  for (const { name, text } of allMarkdown()) {
    for (const token of ["EMP-", "HRC-", "RQN-", "BEN-", "MSD-"]) {
      assert.equal(text.includes(token), false, `${name} carries a ${token} token`);
    }
    assert.equal(/(^|[^A-Za-z])(ca|pe)-[0-9]/.test(text), false, `${name} carries a ca- or pe- token`);
    for (const n of names) assert.equal(text.includes(n), false, `${name} names the roster employee "${n}"`);

    const body = withoutControl(text);
    for (const v of values) {
      assert.equal(
        new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(v)}(?![A-Za-z0-9])`).test(body), false,
        `${name} carries the HR-17 value "${v}"`
      );
    }
    for (const t of STATUTE_TOKENS) {
      assert.equal(
        new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(t)}(?![A-Za-z0-9])`).test(text), false,
        `${name} carries the statute, regulation or agency token "${t}"`
      );
    }
    assert.equal(text.includes("\u2014"), false, `${name} carries an em dash`);
    assert.equal(text.includes("%"), false, `${name} carries a percent sign`);
  }

  for (const d of libraryDocs()) {
    const found = [...new Set(moneyMatches(d.text))].sort();
    assert.deepEqual(found, [...(MONEY[d.id] ?? [])].sort(), `${d.file}: the money tokens are not plan 2.2.3's closed list for ${d.id}`);
  }
  assert.deepEqual(moneyMatches(readSource(SEED)), [], "the seed set carries a money token");
});

// ------------------------------------------------------------------ HR-C7-T9

test("HR-C7-T9: HR-19 agrees with the handbook's benefits facts, phrase by phrase, and the two matches sit apart", () => {
  const handbook = core05(HANDBOOK);
  for (const fact of HANDBOOK_FACTS) {
    for (const [n, sec] of fact.at) {
      const id = `ADI-BNF-${n}`;
      const hay = sec === null ? readDoc(id) : section(readDoc(id), sec);
      assert.ok(hay !== undefined, `${id} carries no section ${sec}`);
      assert.ok(hay.includes(fact.phrase), `${id}${sec ? ` section ${sec}` : ""} does not carry "${fact.phrase}"`);
    }
    if (fact.only) {
      for (const d of libraryDocs()) {
        for (const [heading, body] of sections(d.text)) {
          const key = heading.match(/^(\d+)\. /)?.[1] ?? heading;
          const placed = fact.at.some(([n, sec]) => d.id === `ADI-BNF-${n}` && sec === key);
          if (!placed) assert.equal(body.includes(fact.phrase), false, `${d.id} ${heading} carries "${fact.phrase}"`);
        }
      }
    }
    const inHandbook = fact.handbook ?? fact.phrase;
    assert.ok(handbook.includes(inHandbook), `the committed handbook no longer carries "${inHandbook}"`);
  }
  assert.ok(handbook.includes(`updated the 401(k) match to ${NEW_MATCH}`), "the handbook's 4.1 row no longer dates the match change");

  const restated = readDoc("ADI-BNF-008");
  const original = readDoc("ADI-BNF-001");
  assert.ok(restated.includes(NEW_MATCH), `008 does not carry "${NEW_MATCH}"`);
  assert.equal(restated.includes(OLD_MATCH), false, `008 carries the superseded "${OLD_MATCH}"`);
  assert.ok(original.includes(OLD_MATCH), `001 does not carry "${OLD_MATCH}"`);
  assert.equal(original.includes(NEW_MATCH), false, `001 carries the restated "${NEW_MATCH}"`);
  assert.ok(restated.includes("the Company match that ADI-BNF-001 described"), "008's Changes section no longer refers back to 001's match");
  assert.equal(handbook.includes(OLD_MATCH), false, "the handbook carries the constructed superseded match");
  for (const { name, text } of allMarkdown()) {
    assert.equal(/AD&D/.test(text), false, `${name} writes the acronym rather than the handbook's words`);
  }
});

// ------------------------------------------------------------------ HR-C7-T10

test("HR-C7-T10: the mirror-sweep exclusions hold, and three sentences are byte-identical where they sit", () => {
  for (const { name, text } of allMarkdown()) {
    assert.equal(/^- Date:/m.test(text), false, `${name} carries a Date line, which the calendar mirror sweep looks for`);
    assert.equal(/^- Start time:/m.test(text), false, `${name} carries a Start time line`);
    assert.equal(/^ {2}- .+ \(.+\)/m.test(text), false, `${name} carries an indented attendee bullet`);
  }

  for (const d of libraryDocs()) {
    const home = d.id === "ADI-BNF-000" ? "5" : "8";
    assert.equal(count(d.text, SPANISH_NOTICE), 1, `${d.file}: the Spanish notice does not occur exactly once`);
    assert.ok(section(d.text, home).includes(SPANISH_NOTICE), `${d.file}: the Spanish notice is not in section ${home}`);
  }
  assert.equal(readSource(SEED).includes("Aviso"), false, "the seed set carries the notice");

  const millgate = allMarkdown().filter(({ text }) => text.includes(MILLGATE_SENTENCE)).map(({ name }) => name).sort();
  assert.deepEqual(millgate, ["ADI-BNF-000", "ADI-BNF-002", "ADI-BNF-003", "ADI-BNF-004"].map((id) => byId(id).file).sort(),
    "the Millgate sentence does not occur in 000, 002, 003 and 004 only");
  for (const id of ["ADI-BNF-000", "ADI-BNF-002", "ADI-BNF-003", "ADI-BNF-004"]) {
    const home = id === "ADI-BNF-000" ? "6" : "8";
    assert.equal(count(readDoc(id), MILLGATE_SENTENCE), 1, `${id}: the Millgate sentence occurs more than once`);
    assert.ok(section(readDoc(id), home).includes(MILLGATE_SENTENCE), `${id}: the Millgate sentence is not in section ${home}`);
  }
  assert.ok(section(readDoc("ADI-BNF-004"), "8").includes(`${MILLGATE_SENTENCE} ${SELF_FUNDED_SENTENCE}`), "004 does not follow the Millgate sentence with the self-funded sentence");

  const premium = allMarkdown().filter(({ text }) => text.includes(PREMIUM_SENTENCE)).map(({ name }) => name).sort();
  assert.deepEqual(premium, ["ADI-BNF-002", "ADI-BNF-003"].map((id) => byId(id).file).sort(), "the premium sentence does not occur in 002 and 003 only");
  for (const id of ["ADI-BNF-002", "ADI-BNF-003"]) {
    assert.equal(count(readDoc(id), PREMIUM_SENTENCE), 1, `${id}: the premium sentence occurs more than once`);
    assert.ok(section(readDoc(id), "1").includes(PREMIUM_SENTENCE), `${id}: the premium sentence is not in section 1`);
  }
});

// ------------------------------------------------------------------ HR-C7-T11

test("HR-C7-T11: Millgate carries the three FIN-25 premium families only, and disability is self-funded", () => {
  const { rows } = csvTable(readFileSync(
    join(REPO_ROOT, "datasets", "finance", "supporting-je-detail", "supporting-je-detail.csv"), "utf8"
  ));
  const march6020 = rows.filter((r) => r.gl_account === "6020" && r.posting_date.startsWith("2026-03"));
  const premiums = march6020.filter((r) => /premium/i.test(r.description));
  assert.deepEqual(
    [...new Set(premiums.map((r) => r.description))].sort(),
    ["Employee dental and vision premium", "Employee medical premium", "Group life premium"],
    "FIN-25's March 6020 premium lines are not exactly medical, dental and vision, and group life"
  );
  for (const r of premiums) assert.equal(r.counterparty_canon_id, "co-105", `${r.line_id}: a premium line is not placed with co-105`);
  assert.equal(premiums.some((r) => /disab/i.test(r.description)), false, "FIN-25 carries a disability premium");
  assert.deepEqual(
    [...new Set(march6020.filter((r) => r.counterparty_canon_id === "co-105").map((r) => r.description))].sort(),
    [...new Set(premiums.map((r) => r.description))].sort(),
    "co-105 carries a March 6020 line other than the three premiums"
  );
  assert.equal(CARRIER(), "Millgate Insurance Services", "canon co-105 is not the carrier HR-19 names");

  for (const { name, text } of allMarkdown()) {
    const rest = text.split(MILLGATE_SENTENCE).join("");
    assert.equal(rest.includes("Millgate"), false, `${name} names Millgate outside the Millgate sentence`);
  }
  const selfFunded = allMarkdown().filter(({ text }) => text.includes("self-funded by the Company")).map(({ name }) => name).sort();
  assert.deepEqual(selfFunded, [INDEX, byId("ADI-BNF-004").file].sort(), "\"self-funded by the Company\" does not occur in 004 and the index only");
});

// SMB-34's restricted table, read out of the shipped document, for every screen
// that needs to know what must never leave the studio's own tools.
//
// Hoisted here rather than kept inside tests/drafted/smb-c4-controls-drafted-screen.test.js
// because two halves of that screen need it: the SMB-34 half checks the table
// itself, and the SMB-31 half (rule R-DISJOINT, cluster-4.md section 0) checks
// that no outgoing message carries any value in it. A module under
// tests/helpers/ is imported by both without re-running either file's
// `node:test` registrations, and a value edited in SMB-34 moves both screens
// with it rather than being retyped in the second.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");

/** The document's path, derived from SMB-34's own spec entry rather than typed. */
export function restrictedFilePath() {
  const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
  const spec = specs.byId.get("SMB-34");
  if (!spec) throw new Error("SMB-34 is not in specs/artifact-specs.yaml");
  return join(REPO_ROOT, "artifacts", "SMB-34", `${spec.name}.md`);
}

/** The table header every restricted item sits under. */
export const RESTRICTED_TABLE_COLUMNS = ["item_id", "item", "value"];

/**
 * The class-level words of rule R-DISJOINT: none of them may appear in an
 * outgoing message, whatever value it carries (cluster-4.md section 0).
 */
export const RESTRICTED_CLASS_WORDS = [
  "code", "keypad", "alarm", "key safe", "loan", "lender", "financing", "interest rate",
];

const isTableLine = (line) => line.trim().startsWith("|");
const cells = (line) => line.split("|").slice(1, -1).map((c) => c.replace(/`/g, "").replace(/\*\*/g, "").trim());
const isRule = (row) => row.every((c) => /^:?-+:?$/.test(c));

/**
 * Every row of every `item_id | item | value` table in the document, in
 * document order, as {item_id, item, value}.
 */
export function restrictedItems(text = readFileSync(restrictedFilePath(), "utf8")) {
  const lines = text.split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!isTableLine(lines[i])) continue;
    const head = cells(lines[i]);
    if (head.join("|") !== RESTRICTED_TABLE_COLUMNS.join("|")) continue;
    let j = i + 1;
    for (; j < lines.length && isTableLine(lines[j]); j += 1) {
      const row = cells(lines[j]);
      if (isRule(row)) continue;
      out.push({ item_id: row[0], item: row[1], value: row[2] });
    }
    i = j - 1;
  }
  return out;
}

/** The six restricted values, as the document writes them. */
export const restrictedValues = (text) => restrictedItems(text).map((r) => r.value);

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const TEENS = ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** A whole number in English words ("180" -> "one hundred and eighty"), the shape SMB-34's own table uses. */
function integerWords(n) {
  if (n < 10) return ONES[n];
  if (n < 20) return TEENS[n - 10];
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return ones === 0 ? TENS[tens] : `${TENS[tens]}-${ONES[ones]}`;
  }
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return rest === 0 ? `${ONES[hundreds]} hundred` : `${ONES[hundreds]} hundred and ${integerWords(rest)}`;
}

/** A 2dp rate in spoken-digit words ("6.90" -> "six point nine", the trailing zero silent). */
function rateWords(whole, frac) {
  const trimmed = frac.replace(/0+$/, "") || "0";
  const spokenFrac = trimmed.split("").map((d) => ONES[Number(d)]).join(" ");
  return `${integerWords(Number(whole))} point ${spokenFrac}`;
}

/**
 * Every string a leak of a restricted value could take in another file: the
 * value as written, a code's four digits on their own, a money value in the
 * ledger's own form ("89100.00") beside its prose form, and, for the rate and
 * the term (review data-cluster-4.md SHOULD-FIX 3: the two values
 * `restrictedValues` previously carried only as one whole-cell phrase), every
 * bare numeral, hyphenated adjective and words form a message could restate
 * them in: "6.90", "6.9", "6.90 percent" and "six point nine" for a rate
 * written "a fixed 6.90 percent"; "180 months", "180-month", "one hundred and
 * eighty months", and, when the term divides evenly by 12, "15 years",
 * "15-year" and "fifteen years" for a term written "180 months".
 */
export function restrictedNeedles(text) {
  const needles = new Set();
  for (const value of restrictedValues(text)) {
    needles.add(value);
    const code = /^MOCK-(\d{4})$/.exec(value);
    if (code) needles.add(code[1]);
    if (/^\$[\d,]+\.\d{2}$/.test(value)) needles.add(value.replace(/[$,]/g, ""));

    const rate = /(\d+)\.(\d{2})\s*percent/.exec(value);
    if (rate) {
      const [, whole, frac] = rate;
      const full = `${whole}.${frac}`;
      needles.add(full);
      needles.add(`${full} percent`);
      needles.add(frac.endsWith("0") ? `${whole}.${frac[0]}` : full);
      needles.add(rateWords(whole, frac));
    }

    const term = /^(\d+)\s*months$/.exec(value);
    if (term) {
      const months = Number(term[1]);
      needles.add(`${months} months`);
      needles.add(`${months}-month`);
      needles.add(`${integerWords(months)} months`);
      if (months % 12 === 0) {
        const years = months / 12;
        needles.add(`${years} years`);
        needles.add(`${years}-year`);
        needles.add(`${integerWords(years)} years`);
      }
    }
  }
  return [...needles];
}

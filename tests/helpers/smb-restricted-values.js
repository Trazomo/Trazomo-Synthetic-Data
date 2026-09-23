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

/**
 * Every string a leak of a restricted value could take in another file: the
 * value as written, a code's four digits on their own, and a money value in
 * the ledger's own form ("89100.00") beside its prose form.
 */
export function restrictedNeedles(text) {
  const needles = new Set();
  for (const value of restrictedValues(text)) {
    needles.add(value);
    const code = /^MOCK-(\d{4})$/.exec(value);
    if (code) needles.add(code[1]);
    if (/^\$[\d,]+\.\d{2}$/.test(value)) needles.add(value.replace(/[$,]/g, ""));
  }
  return [...needles];
}

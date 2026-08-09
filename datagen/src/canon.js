import { readFileSync } from "node:fs";

/**
 * Parse canon/companies.md's markdown tables into a lookup keyed by company
 * id ("co-001" -> { id, name, status, role }). Skips non-data rows (table
 * headers, separators, and "co-126 to co-129 | reserved" range rows).
 *
 * This is a light, format-tolerant parser -- it reads pipe-table rows whose
 * first cell matches "co-NNN", not a full markdown-table implementation.
 *
 * @param {string} canonPath
 * @returns {Map<string, { id: string, name: string, status: string|null, role: string }>}
 */
export function loadCanonCompanies(canonPath) {
  const raw = readFileSync(canonPath, "utf8");
  const byId = new Map();

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    const cells = trimmed
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length < 3) continue;

    const id = cells[0];
    if (!/^co-\d+$/.test(id)) continue; // skip headers, separators, range rows

    const nameCell = cells[1];
    const statusMatch = /\(([^)]+)\)\s*$/.exec(nameCell);
    const status = statusMatch ? statusMatch[1].trim() : null;
    const name = statusMatch ? nameCell.slice(0, statusMatch.index).trim() : nameCell;

    byId.set(id, {
      id,
      name,
      status,
      role: cells[2] ?? "",
    });
  }

  return byId;
}

/**
 * Resolve a canon entity id to its display name, or a clearly-synthetic
 * placeholder for ids the generator range owns (co-140+) or anything not yet
 * in canon/companies.md. Never invent a plausible-looking real name here.
 */
export function companyName(byId, id) {
  if (id === "co-140+") return "Generated Account Population";
  const entry = byId.get(id);
  if (entry) return entry.name;
  return `Unresolved Canon Entity ${id}`;
}

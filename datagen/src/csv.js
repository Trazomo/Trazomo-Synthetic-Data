// Minimal RFC-4180-ish CSV writer. No dependency: the escaping rules are
// small and stable, and pulling in a CSV library for this is not worth it
// (simplicity ladder: stdlib/one-liner before a new dependency).

function escapeCell(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * @param {string[]} columns header row, in order
 * @param {object[]} rows objects keyed by column name
 * @returns {string} CSV text, LF line endings, trailing newline
 */
export function toCsv(columns, rows) {
  const lines = [columns.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(columns.map((col) => escapeCell(row[col])).join(","));
  }
  return lines.join("\n") + "\n";
}

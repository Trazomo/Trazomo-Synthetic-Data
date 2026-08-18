// Quote-aware CSV reader for tests, mirroring datagen/src/csv.js's escaping
// (a double-quote wraps a field containing a comma, quote or newline, and ""
// is a literal quote). A naive line.split(",") breaks on real output like
// `"VP, Engineering"`.
//
// New tests import this; the older generator tests keep their own local copies
// rather than being rewritten for the sake of it.

export function splitCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i += 1; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { cells.push(cur); cur = ""; }
    else cur += ch;
  }
  cells.push(cur);
  return cells;
}

/** @returns {{cols: string[], rows: object[]}} */
export function csvTable(content) {
  const [header, ...lines] = content.trim().split("\n");
  const cols = splitCsvLine(header);
  return {
    cols,
    rows: lines.map((line) => {
      const cells = splitCsvLine(line);
      return Object.fromEntries(cols.map((c, i) => [c, cells[i]]));
    }),
  };
}

/** The one file a generator emitted at `path`, or a failing assertion's worth of context. */
export function fileByPath(files, path) {
  const file = files.find((f) => f.path === path);
  if (!file) {
    throw new Error(`expected output file "${path}" not found (got: ${files.map((f) => f.path).join(", ")})`);
  }
  return file;
}

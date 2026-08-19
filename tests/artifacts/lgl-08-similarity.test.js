// LGL-08 states its fuzzy-match method (Part 5.2 / pass_two): normalized similarity is
// (1 - edit_distance / length_of_longer_normalized_name) * 100. The record also carries the
// normalized name pair for every result, so each stated similarity is checkable against the
// record's own inputs. This guards the arithmetic that no generator produces (the record is
// drafted-frozen): F-4 shipped as 92.0 while its own normalized names give 96.0, and nothing
// recomputed it. Where a row also stores edit_distance / length_of_longer, those are checked too.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const RECORD = join(REPO_ROOT, "artifacts", "LGL-08", "corporate-family-tree-conflicts-record.json");

// Standard Levenshtein edit distance; reproduces every stated F-row (F-1 3/24, F-2 2/24,
// F-3 5/39, F-4 1/25), which is what fixes the method as ordinary Levenshtein.
function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const row = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i += 1) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const temp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = temp;
    }
  }
  return row[n];
}

const record = JSON.parse(readFileSync(RECORD, "utf8"));

test("every fuzzy-match similarity equals the record's own stated formula over its own inputs", () => {
  assert.ok(Array.isArray(record.fuzzy_matches) && record.fuzzy_matches.length > 0, "fuzzy_matches present");
  for (const row of record.fuzzy_matches) {
    const a = row.screened_name_normalized;
    const b = row.index_name_normalized;
    const distance = editDistance(a, b);
    const longer = Math.max(a.length, b.length);
    const similarity = Math.round((1 - distance / longer) * 1000) / 10;
    assert.equal(
      similarity,
      row.similarity,
      `${row.id}: stated similarity ${row.similarity} but "${a}" vs "${b}" gives ${similarity} (edit ${distance}, longer ${longer})`,
    );
    // Rows that publish the intermediates must have them agree with the names, not just each other.
    if (row.edit_distance !== undefined) {
      assert.equal(row.edit_distance, distance, `${row.id}: stored edit_distance disagrees with the names`);
      assert.equal(row.length_of_longer, longer, `${row.id}: stored length_of_longer disagrees with the names`);
    }
  }
});

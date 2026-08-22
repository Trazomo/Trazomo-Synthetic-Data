// The money convention, extracted so ten cluster 3 and 4 generators share one
// copy instead of ten. The convention itself is not new: seven shipped
// generators already carry `cents(n)` as a private one-liner, and this module
// is byte-compatible with all of them, which the last test proves against the
// frozen FIN-05 bytes rather than by inspection.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cents, toCents } from "../../datagen/src/money.js";
import { csvTable } from "../helpers/csv-table.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");

test("cents formats integer cents as a 2dp string, including the awkward ones", () => {
  assert.equal(cents(0), "0.00");
  assert.equal(cents(1), "0.01");
  assert.equal(cents(100), "1.00");
  assert.equal(cents(123456), "1234.56");
  assert.equal(cents(-1713455), "-17134.55", "a negative variance keeps its sign and never gains brackets");
  assert.equal(cents(131997789), "1319977.89", "the FIN-09 batch total");
  // No thousands separators on disk. `$1,234.56` is a prose convention; a CSV
  // cell that carried a comma would need quoting and would stop parsing as a
  // number for every consumer.
  assert.ok(!cents(131997789).includes(","));
});

test("cents refuses anything that is not an integer number of cents", () => {
  for (const bad of [1.5, NaN, Infinity, "100", null, undefined]) {
    assert.throws(() => cents(bad), /integer cents/i, `cents(${JSON.stringify(bad)}) should throw`);
  }
});

test("toCents parses a 2dp string back to integer cents, and round-trips", () => {
  assert.equal(toCents("0.00"), 0);
  assert.equal(toCents("1234.56"), 123456);
  assert.equal(toCents("-17134.55"), -1713455);
  assert.equal(toCents("45395.51"), 4539551);
  for (const value of [0, 1, -1, 4539551, 131997789, -524308289]) {
    assert.equal(toCents(cents(value)), value, `${value} does not round-trip`);
  }
  // The float trap this exists to close: 0.1 + 0.2 arithmetic on dollars
  // accumulates, so every internal sum runs in integer cents.
  assert.equal(toCents("70.70") + toCents("0.05"), toCents("70.75"));
});

test("toCents refuses anything that is not a money string", () => {
  for (const bad of ["", "abc", "1,234.56", "$12.00", null, undefined, 12]) {
    assert.throws(() => toCents(bad), /money/i, `toCents(${JSON.stringify(bad)}) should throw`);
  }
});

test("cents reproduces the shipped FIN-05 money bytes exactly, column by column", () => {
  // The claim this test defends: extracting the helper changed nothing. If a
  // future edit to cents() rounds differently, every money column in the pack
  // moves, and this is the cheapest place to find that out.
  const { rows } = csvTable(
    readFileSync(join(REPO_ROOT, "datasets", "finance", "gl-trial-balance", "gl-trial-balance.csv"), "utf8")
  );
  assert.ok(rows.length > 60, "the trial balance did not load");
  let checked = 0;
  for (const row of rows) {
    for (const col of ["beginning_balance", "period_debit", "period_credit", "ending_balance"]) {
      const shipped = row[col];
      assert.equal(cents(toCents(shipped)), shipped, `${row.account_code}.${col} does not round-trip`);
      checked += 1;
    }
  }
  assert.ok(checked >= 240, `only ${checked} money cells checked`);
});

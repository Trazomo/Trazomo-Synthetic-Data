import { test } from "node:test";
import assert from "node:assert/strict";
import { toCsv } from "../../datagen/src/csv.js";

test("toCsv writes a header row plus one row per object, in column order", () => {
  const out = toCsv(["a", "b"], [{ a: 1, b: 2 }, { a: 3, b: 4 }]);
  assert.equal(out, "a,b\n1,2\n3,4\n");
});

test("toCsv escapes commas, quotes, and newlines per RFC 4180", () => {
  const out = toCsv(["name"], [{ name: 'Has, a comma' }, { name: 'Has "quotes"' }, { name: "Has\nnewline" }]);
  const lines = out.split("\n");
  assert.equal(lines[1], '"Has, a comma"');
  assert.equal(lines[2], '"Has ""quotes"""');
  assert.equal(lines[3], '"Has');
  assert.equal(lines[4], 'newline"');
});

test("toCsv renders null/undefined as an empty cell", () => {
  const out = toCsv(["a"], [{ a: null }, { a: undefined }]);
  assert.equal(out, "a\n\n\n");
});

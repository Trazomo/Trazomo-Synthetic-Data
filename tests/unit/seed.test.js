import { test } from "node:test";
import assert from "node:assert/strict";
import { createRng, fnv1a, mulberry32, UNIVERSE_SEED } from "../../datagen/src/seed.js";

test("fnv1a is a pure function of its input string", () => {
  assert.equal(fnv1a("hello"), fnv1a("hello"));
  assert.notEqual(fnv1a("hello"), fnv1a("hellp"));
});

test("mulberry32 with the same seed produces the same sequence", () => {
  const a = mulberry32(12345);
  const b = mulberry32(12345);
  const seqA = [a(), a(), a()];
  const seqB = [b(), b(), b()];
  assert.deepEqual(seqA, seqB);
});

test("createRng: same artifact id + stream -> identical sequence, every time", () => {
  const r1 = createRng("CORE-02", "line-items");
  const r2 = createRng("CORE-02", "line-items");
  const seq1 = [r1.int(0, 1000), r1.float(), r1.pick(["a", "b", "c"])];
  const seq2 = [r2.int(0, 1000), r2.float(), r2.pick(["a", "b", "c"])];
  assert.deepEqual(seq1, seq2);
});

test("createRng: different artifact id -> different sequence", () => {
  const r1 = createRng("CORE-02", "line-items");
  const r2 = createRng("CORE-03", "line-items");
  const seq1 = [r1.int(0, 1_000_000), r1.int(0, 1_000_000)];
  const seq2 = [r2.int(0, 1_000_000), r2.int(0, 1_000_000)];
  assert.notDeepEqual(seq1, seq2);
});

test("createRng: different stream name on the same artifact -> different sequence", () => {
  const r1 = createRng("CORE-03", "accounts");
  const r2 = createRng("CORE-03", "contacts");
  const seq1 = [r1.int(0, 1_000_000), r1.int(0, 1_000_000)];
  const seq2 = [r2.int(0, 1_000_000), r2.int(0, 1_000_000)];
  assert.notDeepEqual(seq1, seq2);
});

test("Rng#int is inclusive on both ends and stays in range", () => {
  const r = createRng("TEST-01", "range-check");
  for (let i = 0; i < 500; i++) {
    const n = r.int(3, 7);
    assert.ok(n >= 3 && n <= 7, `${n} out of [3,7]`);
  }
});

test("Rng#pick only returns elements from the given array", () => {
  const r = createRng("TEST-01", "pick-check");
  const pool = ["x", "y", "z"];
  for (let i = 0; i < 200; i++) {
    assert.ok(pool.includes(r.pick(pool)));
  }
});

test("UNIVERSE_SEED is a fixed string constant (bumping it is a deliberate act, not a side effect of this test)", () => {
  assert.equal(typeof UNIVERSE_SEED, "string");
  assert.ok(UNIVERSE_SEED.length > 0);
});

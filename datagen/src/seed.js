// Deterministic seeding for the Trazomo synthetic-data universe.
//
// Rule (non-negotiable, see repo AGENTS.md / task brief): generators never call
// Date.now() or Math.random(). Every stream of "randomness" is derived from the
// artifact ID plus this fixed universe seed constant, so the same artifact ID
// always produces byte-identical output, forever, on every machine.
//
// Bumping UNIVERSE_SEED intentionally changes every generated artifact's bytes
// (a "reroll the universe" event). Do not bump it casually.

export const UNIVERSE_SEED = "trazomo-synthetic-data-universe-v1";

/**
 * FNV-1a 32-bit hash of a string. Deterministic, dependency-free, good enough
 * spread for seeding a PRNG (we are not doing cryptography here).
 * @param {string} str
 * @returns {number} unsigned 32-bit integer
 */
export function fnv1a(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * mulberry32 PRNG: small, fast, deterministic, seeded by a 32-bit integer.
 * Returns a function that yields floats in [0, 1) on each call, advancing
 * internal state. Not cryptographically secure; not meant to be.
 * @param {number} seed unsigned 32-bit integer
 * @returns {() => number}
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic RNG bound to one artifact ID (and optional named sub-stream,
 * so e.g. "accounts" and "contacts" rows in the same artifact don't draw from
 * a correlated sequence). This is the entry point every generator should use.
 *
 * @param {string} artifactId e.g. "CORE-03"
 * @param {string} [stream] optional sub-stream name, e.g. "accounts"
 * @returns {Rng}
 */
export function createRng(artifactId, stream = "default") {
  const seedStr = `${UNIVERSE_SEED}::${artifactId}::${stream}`;
  const seed = fnv1a(seedStr);
  return new Rng(mulberry32(seed));
}

export class Rng {
  constructor(next) {
    this._next = next;
  }

  /** Float in [0, 1). */
  float() {
    return this._next();
  }

  /** Integer in [min, max] inclusive. */
  int(min, max) {
    if (max < min) throw new RangeError(`int(${min}, ${max}): max < min`);
    return min + Math.floor(this._next() * (max - min + 1));
  }

  /** True with probability p (0..1). */
  chance(p) {
    return this._next() < p;
  }

  /** Pick one element from an array, deterministically. */
  pick(arr) {
    if (arr.length === 0) throw new RangeError("pick() on empty array");
    return arr[this.int(0, arr.length - 1)];
  }

  /** Shuffle a copy of the array (Fisher-Yates) using this RNG. */
  shuffle(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  /** Deterministic decimal amount between min and max, `decimals` places. */
  amount(min, max, decimals = 2) {
    const scale = 10 ** decimals;
    return Math.round((min + this._next() * (max - min)) * scale) / scale;
  }
}

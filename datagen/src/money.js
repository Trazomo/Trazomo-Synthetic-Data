// The money convention, in one place.
//
// Every amount in the universe is held internally as an integer number of
// cents and written to disk as a 2dp string. Dollar floats do not survive
// summing: 0.1 + 0.2 is not 0.3, and a trial balance that ties to the cent is
// the whole point of the finance pack.
//
// This is not a new convention. Seven shipped generators (FIN-01, FIN-04,
// FIN-05, FIN-06, FIN-09, FIN-15, FIN-35) already carry `cents(n)` as a
// private one-liner, and this module is byte-compatible with all of them --
// tests/unit/money.test.js proves it by round-tripping every money cell of the
// frozen FIN-05 bytes. The private copies are deliberately left alone: moving
// them would touch seven frozen generators for no behavioural change. New
// generators import from here.
//
// No thousands separators, ever. `$1,234.56` is a prose convention; a CSV cell
// carrying a comma needs quoting and stops parsing as a number for every
// consumer that reads it.

/**
 * Format an integer number of cents as a 2dp string. Negative amounts keep
 * their minus sign; brackets are a presentation choice a document makes, never
 * something a dataset writes.
 * @param {number} amountInCents
 * @returns {string}
 */
export function cents(amountInCents) {
  if (!Number.isInteger(amountInCents)) {
    throw new Error(`cents: expected integer cents, got ${JSON.stringify(amountInCents)}`);
  }
  return (amountInCents / 100).toFixed(2);
}

/**
 * Parse a money string back to integer cents. Accepts what `cents()` emits and
 * what the shipped datasets carry: an optional minus, digits, and exactly the
 * decimal places a 2dp string has (a whole-dollar string with no decimal point
 * is accepted too, since a few source columns are written that way).
 * @param {string} money
 * @returns {number}
 */
export function toCents(money) {
  if (typeof money !== "string" || !/^-?\d+(\.\d{1,2})?$/.test(money)) {
    throw new Error(`toCents: expected a money string like "1234.56", got ${JSON.stringify(money)}`);
  }
  return Math.round(Number(money) * 100);
}

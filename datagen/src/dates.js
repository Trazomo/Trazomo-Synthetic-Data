// Deterministic date helpers. No Date.now(). Every "today" in the synthetic
// universe is computed from ANCHOR_DATE, a fixed constant -- bumping it is a
// deliberate "advance the universe clock" decision, not something a generator
// run does implicitly.
//
// All dates are handled as UTC-midnight epoch-day integers internally so day
// arithmetic never trips over local timezone or DST.

/** The synthetic universe's fixed "present day". Do not derive from Date.now(). */
export const ANCHOR_DATE = "2026-03-16"; // a Monday

const MS_PER_DAY = 86400000;

/** Parse "YYYY-MM-DD" into an epoch-day integer (days since 1970-01-01 UTC). */
export function toEpochDay(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

/** Format an epoch-day integer back to "YYYY-MM-DD". */
export function fromEpochDay(epochDay) {
  const ms = epochDay * MS_PER_DAY;
  const dt = new Date(ms);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Add `days` (may be negative) to an ISO date, return ISO date. */
export function addDays(isoDate, days) {
  return fromEpochDay(toEpochDay(isoDate) + days);
}

/** 0 = Sunday .. 6 = Saturday, for an ISO date. */
export function weekday(isoDate) {
  // epoch day 0 (1970-01-01) was a Thursday (4).
  return ((toEpochDay(isoDate) + 4) % 7 + 7) % 7;
}

export function isWeekend(isoDate) {
  const wd = weekday(isoDate);
  return wd === 0 || wd === 6;
}

/** Roll a date forward to the next non-weekend day if it lands on one. */
export function rollForwardPastWeekend(isoDate) {
  let d = isoDate;
  while (isWeekend(d)) d = addDays(d, 1);
  return d;
}

/** Difference in whole days between two ISO dates (b - a). */
export function diffDays(aIso, bIso) {
  return toEpochDay(bIso) - toEpochDay(aIso);
}

// ------------------------------------------------------------- business days
// A close is counted in business days, not calendar days, and March 2026 closes
// across a weekend: D+3 is Friday 2026-04-03 and D+4 is Monday 2026-04-06. The
// naive "period end plus n" puts D+4 on Saturday and D+5 on Sunday, which is a
// due date nobody can meet, so the walk below is the only place that rule lives.

/** Period end the finance close counts from (canon/timeline.md, March 2026). */
export const CLOSE_PERIOD_END = "2026-03-31";

/**
 * Walk `n` business days from an ISO date, skipping Saturdays and Sundays.
 * `n` of 0 returns the date untouched, weekend or not; a negative `n` walks
 * backwards by the same rule, so the walk is reversible.
 */
export function addBusinessDays(isoDate, n) {
  if (!Number.isInteger(n)) {
    throw new Error(`addBusinessDays: n must be a whole number of days, got ${JSON.stringify(n)}`);
  }
  const step = n < 0 ? -1 : 1;
  let date = isoDate;
  for (let moved = 0; moved < Math.abs(n); moved += 1) {
    do {
      date = addDays(date, step);
    } while (isWeekend(date));
  }
  return date;
}

/**
 * Resolve a close-day label ("D+1" .. "D+n", the vocabulary FIN-36 carries) to
 * the ISO date it falls on: the nth business day after `CLOSE_PERIOD_END`.
 * D+1 is 2026-04-01 and D+5 is 2026-04-07, so D+4 is Monday 2026-04-06.
 */
export function closeDayDate(closeDay) {
  const match = typeof closeDay === "string" ? /^D\+([1-9]\d*)$/.exec(closeDay) : null;
  if (!match) {
    throw new Error(
      `close day must be a "D+n" label with n at or above 1, got ${JSON.stringify(closeDay)}`
    );
  }
  return addBusinessDays(CLOSE_PERIOD_END, Number(match[1]));
}

// -------------------------------------------------------------- month ends
// The FP&A datasets plot a trend, and a trend is only joinable if every file
// agrees about which months it covers. FIN-31 (kpi-source-data), FIN-32
// (bank-balances) and FIN-33 (actuals-24mo) all read the series below; none of
// them recomputes it locally, and a fourth consumer should not either.

/** Months in the FP&A reporting window (canon/timeline.md, 2024-04-30 to 2026-03-31). */
export const TREND_MONTHS = 24;

/** Is this ISO date the last day of its own month? */
function isMonthEnd(isoDate) {
  return addDays(isoDate, 1).endsWith("-01");
}

/**
 * The `count` consecutive month-end ISO dates ending at `throughIso`, oldest
 * first. `monthEnds(24, CLOSE_PERIOD_END)` is the FP&A window: 2024-04-30
 * through 2026-03-31.
 *
 * Walks backwards from the through-date by stepping to the day before the
 * first of the current month, so month lengths and leap years fall out of the
 * calendar rather than out of a table. `throughIso` must already be a month
 * end: a series that quietly rolled 2026-03-30 forward would put every one of
 * its 24 rows on a date no month actually ends.
 */
export function monthEnds(count, throughIso) {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`monthEnds: count must be a whole number of months at or above 1, got ${JSON.stringify(count)}`);
  }
  if (typeof throughIso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(throughIso) || !isMonthEnd(throughIso)) {
    throw new Error(`monthEnds: the through date must be a month end in YYYY-MM-DD, got ${JSON.stringify(throughIso)}`);
  }
  const out = [throughIso];
  while (out.length < count) {
    const firstOfMonth = `${out[0].slice(0, 7)}-01`;
    out.unshift(addDays(firstOfMonth, -1));
  }
  return out;
}

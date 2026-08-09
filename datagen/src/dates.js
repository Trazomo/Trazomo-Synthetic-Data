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

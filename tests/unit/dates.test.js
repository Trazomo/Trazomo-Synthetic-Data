import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addBusinessDays, addDays, CLOSE_PERIOD_END, closeDayDate, diffDays, isWeekend,
  monthEnds, rollForwardPastWeekend, TREND_MONTHS, weekday,
} from "../../datagen/src/dates.js";

test("addDays is reversible and handles month/year boundaries", () => {
  assert.equal(addDays("2026-01-20", 21), "2026-02-10");
  assert.equal(addDays("2026-02-28", 1), "2026-03-01"); // 2026 is not a leap year
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-03-16", -30), "2026-02-14");
});

test("weekday/isWeekend agree with a known anchor (2026-03-16 is a Monday)", () => {
  assert.equal(weekday("2026-03-16"), 1); // Monday
  assert.equal(isWeekend("2026-03-16"), false);
  assert.equal(isWeekend("2026-03-14"), true); // Saturday
  assert.equal(isWeekend("2026-03-15"), true); // Sunday
});

test("rollForwardPastWeekend only moves weekend dates, and always lands on a weekday", () => {
  assert.equal(rollForwardPastWeekend("2026-03-16"), "2026-03-16"); // already Monday
  assert.equal(rollForwardPastWeekend("2026-03-14"), "2026-03-16"); // Saturday -> Monday
  assert.equal(rollForwardPastWeekend("2026-03-15"), "2026-03-16"); // Sunday -> Monday
});

test("diffDays matches addDays in reverse", () => {
  assert.equal(diffDays("2026-01-20", "2026-02-10"), 21);
  assert.equal(diffDays("2026-02-10", "2026-01-20"), -21);
});

// ---------------------------------------------------------------- close days
// The cluster 2 finance datasets date a close by business day: D+1 is the first
// business day after period end, weekends skipped. March 2026 closes across a
// weekend, so a naive "period end plus n" is wrong for D+4 and D+5, which is
// what these cases pin.

test("addBusinessDays walks weekdays and steps over the 2026-04-04 weekend", () => {
  assert.equal(addBusinessDays("2026-03-31", 1), "2026-04-01"); // Tue -> Wed
  assert.equal(addBusinessDays("2026-03-31", 2), "2026-04-02");
  assert.equal(addBusinessDays("2026-03-31", 3), "2026-04-03"); // Friday
  assert.equal(addBusinessDays("2026-03-31", 4), "2026-04-06"); // Saturday and Sunday skipped
  assert.equal(addBusinessDays("2026-03-31", 5), "2026-04-07");
  // A full working week lands on the same weekday a week later.
  assert.equal(addBusinessDays("2026-04-06", 5), "2026-04-13");
});

test("addBusinessDays with n = 0 leaves the date alone, and negative n walks back", () => {
  assert.equal(addBusinessDays("2026-04-06", 0), "2026-04-06");
  assert.equal(addBusinessDays("2026-04-04", 0), "2026-04-04", "zero moves nothing, weekend or not");
  assert.equal(addBusinessDays("2026-04-06", -1), "2026-04-03"); // Monday back over the weekend
  assert.equal(addBusinessDays("2026-04-06", -4), "2026-03-31");
  assert.equal(addBusinessDays("2026-04-07", -5), "2026-03-31", "the close-day walk is reversible");
});

test("addBusinessDays starting on a weekend lands on a weekday", () => {
  assert.equal(addBusinessDays("2026-04-04", 1), "2026-04-06"); // Saturday -> Monday
  assert.equal(addBusinessDays("2026-04-05", 1), "2026-04-06"); // Sunday -> Monday
  assert.equal(addBusinessDays("2026-04-04", -1), "2026-04-03"); // Saturday -> Friday
});

test("closeDayDate resolves D+1 to D+5 against the canon March 2026 close window", () => {
  assert.equal(CLOSE_PERIOD_END, "2026-03-31", "the finance anchor period ends 2026-03-31 (canon/timeline.md)");
  assert.equal(closeDayDate("D+1"), "2026-04-01");
  assert.equal(closeDayDate("D+2"), "2026-04-02");
  assert.equal(closeDayDate("D+3"), "2026-04-03");
  assert.equal(closeDayDate("D+4"), "2026-04-06");
  assert.equal(closeDayDate("D+5"), "2026-04-07");
});

test("no close day falls on a weekend, and D+4 is the Monday rather than the Sunday", () => {
  for (const day of ["D+1", "D+2", "D+3", "D+4", "D+5"]) {
    assert.equal(isWeekend(closeDayDate(day)), false, `${day} lands on a weekend`);
  }
  // The off-by-one this guards: counting calendar days from 2026-04-01 gives
  // 2026-04-05, a Sunday, and a due date nobody can meet.
  assert.notEqual(closeDayDate("D+4"), "2026-04-05");
  assert.equal(weekday(closeDayDate("D+4")), 1, "D+4 is Monday 2026-04-06");
  assert.equal(addDays(closeDayDate("D+3"), 3), closeDayDate("D+4"), "D+3 to D+4 crosses three calendar days");
});

test("closeDayDate refuses anything that is not a D+n label", () => {
  for (const bad of ["D+0", "D4", "D+", "", "d+4", "D+4 ", "D+four", 4, null, undefined]) {
    assert.throws(() => closeDayDate(bad), /close day/i, `closeDayDate(${JSON.stringify(bad)}) should throw`);
  }
});

// -------------------------------------------------------------- month ends
// The cluster 3 and 4 FP&A datasets (FIN-31 kpi-source-data, FIN-32
// bank-balances, FIN-33 actuals-24mo) all plot the same 24-month window ending
// at the close period end. Three files that disagree about which months they
// cover cannot be joined, so the series is computed here and nowhere else.

test("monthEnds returns the 24-month FP&A window ending at the close period end", () => {
  assert.equal(TREND_MONTHS, 24, "the FP&A trend is 24 months (canon/timeline.md, 2024-04-30 to 2026-03-31)");
  const window = monthEnds(TREND_MONTHS, CLOSE_PERIOD_END);
  assert.equal(window.length, 24, "the window is 23 or 25 months, which is an off-by-one in the walk");
  assert.equal(window[0], "2024-04-30", "the window does not open at 2024-04-30");
  assert.equal(window[window.length - 1], "2026-03-31", "the window does not close at the close period end");
  assert.equal(new Set(window).size, 24, "the window repeats a month end");
});

test("every date monthEnds returns is a real month end, in strictly ascending order", () => {
  for (const date of monthEnds(TREND_MONTHS, CLOSE_PERIOD_END)) {
    assert.match(date, /^\d{4}-\d{2}-\d{2}$/, `${date} is not an ISO date`);
    assert.equal(addDays(date, 1).slice(-2), "01", `${date} is not the last day of its month`);
  }
  const window = monthEnds(TREND_MONTHS, CLOSE_PERIOD_END);
  for (let i = 1; i < window.length; i += 1) {
    assert.ok(window[i] > window[i - 1], `${window[i]} does not follow ${window[i - 1]}`);
    assert.equal(
      window[i].slice(0, 7),
      addDays(window[i - 1], 1).slice(0, 7),
      `the window skips a month between ${window[i - 1]} and ${window[i]}`
    );
  }
});

test("monthEnds handles the short months inside the window without a leap-year fudge", () => {
  const window = monthEnds(TREND_MONTHS, CLOSE_PERIOD_END);
  assert.ok(window.includes("2025-02-28"), "February 2025 is missing or wrong");
  assert.ok(window.includes("2026-02-28"), "February 2026 is missing or wrong (2026 is not a leap year)");
  assert.ok(window.includes("2024-06-30") && window.includes("2024-11-30"), "a 30-day month came out wrong");
  assert.ok(window.includes("2024-12-31") && window.includes("2025-12-31"), "a year boundary came out wrong");
  // 2024 is a leap year, and the one 29th in range is outside the 24-month
  // window, so a walk that hard-codes 28 for February passes by luck here.
  assert.deepEqual(monthEnds(3, "2024-04-30"), ["2024-02-29", "2024-03-31", "2024-04-30"]);
});

test("monthEnds is a pure walk backwards: any count, any month end", () => {
  assert.deepEqual(monthEnds(1, "2026-03-31"), ["2026-03-31"]);
  assert.deepEqual(monthEnds(2, "2026-01-31"), ["2025-12-31", "2026-01-31"]);
  assert.deepEqual(monthEnds(13, "2026-03-31")[0], "2025-03-31");
});

test("monthEnds refuses a through-date that is not a month end, and a count below 1", () => {
  for (const bad of ["2026-03-30", "2026-03-01", "2026-02-29"]) {
    assert.throws(() => monthEnds(24, bad), /month end/i, `monthEnds(24, ${JSON.stringify(bad)}) should throw`);
  }
  for (const bad of [0, -1, 1.5, "24", null, undefined]) {
    assert.throws(() => monthEnds(bad, CLOSE_PERIOD_END), /count/i, `monthEnds(${JSON.stringify(bad)}) should throw`);
  }
});

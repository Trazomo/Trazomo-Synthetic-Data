import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, diffDays, isWeekend, rollForwardPastWeekend, weekday } from "../../datagen/src/dates.js";

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

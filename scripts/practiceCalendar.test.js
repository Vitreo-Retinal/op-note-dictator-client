// Unit tests for src/lib/practiceCalendar.js — run with `npm test` (node --test).
// The built-in closures must match the practice manager's official schedule
// ("VRA CLOSED – …" all-day events on the VRA Google Calendar, Oct 9 2026).
// The practice is OPEN on Good Friday, Easter, Nowruz, Christmas Eve, New
// Year's Eve (unless observed) and the Day before Thanksgiving (half day).
import { test } from "node:test";
import assert from "node:assert/strict";
import { easterMonthDay, majorHoliday, halfDayNote, injectionBlackout, parseLocalNoon } from "../src/lib/practiceCalendar.js";

const D = (ymd) => parseLocalNoon(ymd);

const OFFICIAL_2026 = [
  ["2026-10-12", "Columbus Day"],
  ["2026-11-26", "Thanksgiving"],
  ["2026-11-27", "Day after Thanksgiving"],
  ["2026-12-25", "Christmas"],
];

const OFFICIAL_2027 = [
  ["2027-01-01", "New Year's Day"],
  ["2027-01-18", "MLK Day"],
  ["2027-02-15", "Presidents' Day"],
  ["2027-04-19", "Patriots' Day"],
  ["2027-05-31", "Memorial Day"],
  ["2027-06-18", "Juneteenth (observed)"],
  ["2027-07-05", "Independence Day (observed)"],
  ["2027-09-06", "Labor Day"],
  ["2027-10-11", "Columbus Day"],
  ["2027-11-25", "Thanksgiving"],
  ["2027-11-26", "Day after Thanksgiving"],
  ["2027-12-24", "Christmas (observed)"],
  ["2027-12-31", "New Year's Day (observed)"], // New Year's Day 2028 (Sat)
];

test("official 2026 closures (Oct–Dec)", () => {
  for (const [ymd, label] of OFFICIAL_2026) assert.equal(majorHoliday(D(ymd)), label, ymd);
});

test("official 2027 closures", () => {
  for (const [ymd, label] of OFFICIAL_2027) assert.equal(majorHoliday(D(ymd)), label, ymd);
});

test("2027/2028 weekend holidays roll to the right weekday", () => {
  // Dec 25 2027 is a Saturday → observed Fri Dec 24 2027.
  assert.equal(D("2027-12-25").getDay(), 6);
  assert.equal(majorHoliday(D("2027-12-24")), "Christmas (observed)");
  // Jan 1 2028 is a Saturday → observed Fri Dec 31 2027 (previous year).
  assert.equal(D("2028-01-01").getDay(), 6);
  assert.equal(majorHoliday(D("2027-12-31")), "New Year's Day (observed)");
  // ...and NOT also observed on the Monday after.
  assert.equal(majorHoliday(D("2028-01-03")), null);
  assert.equal(majorHoliday(D("2027-12-27")), null);
  // Jun 19 2027 Sat → Fri Jun 18; Jul 4 2027 Sun → Mon Jul 5.
  assert.equal(majorHoliday(D("2027-06-21")), null);
  assert.equal(majorHoliday(D("2027-07-02")), null);
});

test("2028 closures", () => {
  const expected = [
    ["2028-01-17", "MLK Day"],
    ["2028-02-21", "Presidents' Day"],
    ["2028-04-17", "Patriots' Day"],
    ["2028-05-29", "Memorial Day"],
    ["2028-06-19", "Juneteenth"],
    ["2028-07-04", "Independence Day"],
    ["2028-09-04", "Labor Day"],
    ["2028-10-09", "Columbus Day"],
    ["2028-11-23", "Thanksgiving"],
    ["2028-11-24", "Day after Thanksgiving"],
    ["2028-12-25", "Christmas"],
  ];
  for (const [ymd, label] of expected) assert.equal(majorHoliday(D(ymd)), label, ymd);
});

test("other observed-day cases (Sunday → Monday, Saturday → Friday)", () => {
  assert.equal(majorHoliday(D("2026-07-03")), "Independence Day (observed)"); // Jul 4 2026 Sat
  assert.equal(majorHoliday(D("2028-12-25")), "Christmas");                    // Mon, no shift
  assert.equal(majorHoliday(D("2023-01-02")), "New Year's Day (observed)");    // Jan 1 2023 Sun → Mon
  assert.equal(majorHoliday(D("2022-12-26")), "Christmas (observed)");         // Dec 25 2022 Sun → Mon
  assert.equal(majorHoliday(D("2022-12-30")), null); // Jan 1 2023 is Sun, so no Fri Dec 30 closure
});

test("Good Friday, Christmas Eve, New Year's Eve are open", () => {
  assert.equal(majorHoliday(D("2026-04-03")), null); // Good Friday 2026
  assert.equal(majorHoliday(D("2027-03-26")), null); // Good Friday 2027
  assert.equal(majorHoliday(D("2026-12-24")), null); // Christmas Eve 2026 (Thu)
  assert.equal(majorHoliday(D("2026-12-31")), null); // New Year's Eve 2026 (Thu)
});

test("Easter is not a closure", () => {
  assert.deepEqual(easterMonthDay(2026), [3, 5]);  // Apr 5 2026
  assert.deepEqual(easterMonthDay(2027), [2, 28]); // Mar 28 2027
  assert.equal(majorHoliday(D("2026-04-05")), null);
  assert.equal(majorHoliday(D("2027-03-28")), null);
  assert.equal(majorHoliday(D("2026-04-06")), null); // Easter Monday
});

test("Nowruz is not a closure (2026–2028)", () => {
  for (const ymd of ["2026-03-20", "2026-03-21", "2027-03-20", "2027-03-21", "2028-03-19", "2028-03-20"]) {
    assert.equal(majorHoliday(D(ymd)), null, ymd);
    assert.equal(halfDayNote(D(ymd)), null, ymd);
    assert.equal(injectionBlackout(D(ymd)), null, ymd);
  }
});

test("Day before Thanksgiving is open with a half-day note (2026, 2027)", () => {
  for (const ymd of ["2026-11-25", "2027-11-24"]) {
    assert.equal(majorHoliday(D(ymd)), null, `${ymd} not closed`);
    assert.equal(halfDayNote(D(ymd)), "Half day (usually)", `${ymd} half-day note`);
    assert.equal(injectionBlackout(D(ymd)), null, `${ymd} no blackout`);
  }
});

test("half-day note only on the Wednesday before Thanksgiving", () => {
  assert.equal(halfDayNote(D("2026-11-18")), null); // a week earlier
  assert.equal(halfDayNote(D("2026-12-02")), null); // a week later
  assert.equal(halfDayNote(D("2026-11-24")), null); // Tuesday
  assert.equal(halfDayNote(D("2026-11-26")), null); // Thanksgiving itself
  assert.equal(halfDayNote(null), null);
});

test("ordinary days are open", () => {
  assert.equal(majorHoliday(D("2026-10-09")), null); // ordinary Friday
  assert.equal(majorHoliday(D("2026-10-13")), null); // day after Columbus Day
  assert.equal(majorHoliday(null), null);
});

test("injection blackout is only Jan 1–14", () => {
  assert.ok(injectionBlackout(D("2027-01-01")));
  assert.ok(injectionBlackout(D("2027-01-14")));
  assert.equal(injectionBlackout(D("2027-01-15")), null);
  assert.equal(injectionBlackout(D("2027-12-31")), null);
});

// Unit tests for src/lib/practiceCalendar.js — run with `npm test` (node --test).
// Owner correction (Oct 9 2026): the practice is OPEN on Nowruz, Easter and the
// Day before Thanksgiving (usually a half day).
import { test } from "node:test";
import assert from "node:assert/strict";
import { easterMonthDay, majorHoliday, halfDayNote, injectionBlackout, parseLocalNoon } from "../src/lib/practiceCalendar.js";

const D = (ymd) => parseLocalNoon(ymd);

test("Day before Thanksgiving is open with a half-day note (2026, 2027)", () => {
  for (const ymd of ["2026-11-25", "2027-11-24"]) {
    assert.equal(majorHoliday(D(ymd)), null, `${ymd} not closed`);
    assert.equal(halfDayNote(D(ymd)), "Half day (usually)", `${ymd} half-day note`);
    assert.equal(injectionBlackout(D(ymd)), null, `${ymd} no blackout`);
  }
});

test("Thanksgiving and Black Friday stay closed (2026, 2027)", () => {
  assert.equal(majorHoliday(D("2026-11-26")), "Thanksgiving");
  assert.equal(majorHoliday(D("2026-11-27")), "Black Friday");
  assert.equal(majorHoliday(D("2027-11-25")), "Thanksgiving");
  assert.equal(majorHoliday(D("2027-11-26")), "Black Friday");
  assert.equal(halfDayNote(D("2026-11-26")), null);
});

test("half-day note only on the Wednesday before Thanksgiving", () => {
  assert.equal(halfDayNote(D("2026-11-18")), null); // a week earlier
  assert.equal(halfDayNote(D("2026-12-02")), null); // a week later
  assert.equal(halfDayNote(D("2026-11-24")), null); // Tuesday
  assert.equal(halfDayNote(null), null);
});

test("Nowruz is not a closure (2026–2028)", () => {
  for (const ymd of ["2026-03-20", "2026-03-21", "2027-03-20", "2027-03-21", "2028-03-19", "2028-03-20"]) {
    assert.equal(majorHoliday(D(ymd)), null, ymd);
    assert.equal(halfDayNote(D(ymd)), null, ymd);
    assert.equal(injectionBlackout(D(ymd)), null, ymd);
  }
});

test("Easter is not a closure; Good Friday still is", () => {
  assert.deepEqual(easterMonthDay(2026), [3, 5]);  // Apr 5 2026
  assert.deepEqual(easterMonthDay(2027), [2, 28]); // Mar 28 2027
  assert.equal(majorHoliday(D("2026-04-05")), null);
  assert.equal(majorHoliday(D("2027-03-28")), null);
  assert.equal(majorHoliday(D("2026-04-06")), null); // Easter Monday
  assert.equal(majorHoliday(D("2026-04-03")), "Good Friday");
  assert.equal(majorHoliday(D("2027-03-26")), "Good Friday");
});

test("other built-in closures unchanged", () => {
  assert.equal(majorHoliday(D("2027-01-01")), "New Year's Day");
  assert.equal(majorHoliday(D("2027-01-18")), "MLK Day");
  assert.equal(majorHoliday(D("2026-04-20")), "Patriots' Day");
  assert.equal(majorHoliday(D("2026-05-25")), "Memorial Day");
  assert.equal(majorHoliday(D("2026-06-19")), "Juneteenth");
  assert.equal(majorHoliday(D("2026-07-04")), "July 4th");
  assert.equal(majorHoliday(D("2026-09-07")), "Labor Day");
  assert.equal(majorHoliday(D("2026-10-12")), "Indigenous Peoples Day");
  assert.equal(majorHoliday(D("2026-12-24")), "Christmas Eve");
  assert.equal(majorHoliday(D("2026-12-25")), "Christmas Day");
  assert.equal(majorHoliday(D("2026-12-31")), "New Year's Eve");
  assert.equal(majorHoliday(D("2026-10-09")), null); // ordinary Friday
});

test("injection blackout is only Jan 1–14", () => {
  assert.ok(injectionBlackout(D("2027-01-14")));
  assert.equal(injectionBlackout(D("2027-01-15")), null);
});

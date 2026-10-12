// Unit tests for the LEA tech line + imaging helpers in src/lib/vraSchedule.js
// — run with `npm test` (node --test). Fixtures: staff first names only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLeaLine, leaStaffOf, isLeaStaffEvent, imagingOf } from "../src/lib/vraSchedule.js";

test("parseLeaLine: the calendar's usual LEA line", () => {
  assert.deepEqual(parseLeaLine("LEA · BKH: Ashley, Dom, Tony, Bill · Imaging: Mairead"), {
    doctors: ["BKH"], techs: ["Ashley", "Dom", "Tony", "Bill"], imaging: ["Mairead"],
  });
});

test("parseLeaLine: OCT/FP and OCT labels, 'and' / '&', other separators", () => {
  assert.deepEqual(parseLeaLine("LEA: Techs: Ashley and Dom | OCT/FP: Mairead"), { doctors: [], techs: ["Ashley", "Dom"], imaging: ["Mairead"] });
  assert.deepEqual(parseLeaLine("LEA - MR: Tony & Bill · OCT: Mairead"), { doctors: ["MR"], techs: ["Tony", "Bill"], imaging: ["Mairead"] });
  assert.deepEqual(parseLeaLine("LEA · BKH: Ashley (AM), Dom"), { doctors: ["BKH"], techs: ["Ashley (AM)", "Dom"], imaging: [] });
});

test("parseLeaLine: ordinary events are not the tech line", () => {
  assert.equal(parseLeaLine("LEA · Staff meeting"), null);
  assert.equal(parseLeaLine("Lunch and learn"), null);
  assert.equal(parseLeaLine("BKH · LEX"), null);
  assert.equal(isLeaStaffEvent({ title: "LEA · Staff meeting" }), false);
  assert.equal(isLeaStaffEvent({ title: "LEA · BKH: Ashley · Imaging: Mairead" }), true);
});

test("leaStaffOf: merges two LEA lines on one day; null without one", () => {
  const day = { events: [
    { title: "LEA · BKH: Ashley, Dom", allDay: true },
    { title: "Lunch and learn", allDay: false },
    { title: "LEA · Imaging: Mairead · Techs: Dom, Tony", allDay: true },
  ] };
  assert.deepEqual(leaStaffOf(day), { doctors: ["BKH"], techs: ["Ashley", "Dom", "Tony"], imaging: ["Mairead"] });
  assert.equal(leaStaffOf({ events: [{ title: "Lunch and learn" }] }), null);
  assert.equal(leaStaffOf(null), null);
});

test("imagingOf: imaging names per tech site from Nana's sheet roles", () => {
  const half = (imaging = []) => ({ back: [], workup: [], phone: [], admin: [], imaging, research: [], other: [] });
  const techs = { roles: {
    WORC: { AM: half(["Tami"]), PM: half(["Tami"]) },
    LEOM: { AM: half(), PM: half() },
  } };
  assert.deepEqual(imagingOf(techs), [{ site: "WORC", am: ["Tami"], pm: ["Tami"] }]);
  assert.deepEqual(imagingOf(null), []);
  assert.deepEqual(imagingOf({ worcesterBackAM: [] }), []);
});

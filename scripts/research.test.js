// Unit tests for src/lib/research.js — run with `npm test` (node --test).
// Fixtures: staff first names as they appear on the tech sheet; participants
// by study ID only (never patient names).
import { test } from "node:test";
import assert from "node:assert/strict";
import { researchStaffOf, whereText, researchDays, groupVisits, trialLabel, visitStatus, shortDate } from "../src/lib/research.js";

const half = (research = []) => ({ back: [], workup: [], phone: [], admin: [], imaging: [], research, other: [] });
const roles = (w = {}, l = {}) => ({
  WORC: { AM: half(w.AM), PM: half(w.PM) },
  LEOM: { AM: half(l.AM), PM: half(l.PM) },
});
const person = (name, site, extra = {}) => ({
  name, site, shift: null, hours: null, am: ["research"], pm: ["research"], notes: null,
  amNote: null, pmNote: null, sites: { AM: site, PM: site }, outPM: false, ...extra,
});

test("researchStaffOf: Research: line people, tech-line research halves, and role-only names", () => {
  const techs = {
    people: [
      person("Amy", "WORC", { hours: "7:30-4:00" }),
      person("Diana", "LEOM", { amNote: "HELIOS", pmNote: "HELIOS" }),
      // A tech doing research only in the PM, at Leominster.
      { name: "Jenn", site: "WORC", am: ["back"], pm: ["research"], sites: { AM: "WORC", PM: "LEOM" }, amNote: null, pmNote: null },
      { name: "Kate", site: "WORC", am: ["workup"], pm: ["back"], sites: { AM: "WORC", PM: "WORC" } },
    ],
    roles: roles({ AM: ["Amy"], PM: ["Amy", "Zoe"] }, { AM: ["Diana"], PM: ["Diana", "Jenn"] }),
  };
  const got = researchStaffOf(techs);
  assert.deepEqual(got.map((s) => s.name), ["Amy", "Diana", "Jenn", "Zoe"]);
  assert.deepEqual(got[0], { name: "Amy", halves: { AM: "WORC", PM: "WORC" }, hours: "7:30-4:00", note: null });
  assert.equal(got[1].note, "HELIOS");
  assert.deepEqual(got[2].halves, { AM: null, PM: "LEOM" });
  assert.deepEqual(got[3].halves, { AM: null, PM: "WORC" });
  assert.deepEqual(researchStaffOf(null), []);
  assert.deepEqual(researchStaffOf({}), []);
});

test("whereText: all day, split sites, one half, none", () => {
  assert.equal(whereText({ AM: "WORC", PM: "WORC" }), "WORC");
  assert.equal(whereText({ AM: "WORC", PM: "LEOM" }), "WORC AM · LEOM PM");
  assert.equal(whereText({ AM: null, PM: "LEOM" }), "LEOM PM");
  assert.equal(whereText({ AM: null, PM: null }), null);
});

test("researchDays: today + next weekdays; never guesses when the sheet has no research staff", () => {
  const sched = {
    configured: true,
    days: [
      { date: "2026-10-12", closed: false, staffVacations: [], techs: { people: [person("Amy", "WORC", { hours: "7:30-4:00" }), person("Diana", "LEOM")], roles: roles(), off: [], trials: "HELIOS-3 Wk 8" } },
      { date: "2026-10-13", closed: false, staffVacations: [{ name: "Diana", through: "2026-10-16" }], techs: { people: [person("Amy", "WORC")], roles: roles(), off: [] } },
      { date: "2026-10-14", closed: false, staffVacations: [], techs: { people: [], roles: roles(), off: ["Amy (sick)"] } },
      { date: "2026-10-15", closed: false, staffVacations: [], techs: null },
      { date: "2026-10-16", closed: true, closureName: "Staff day", staffVacations: [], techs: null },
    ],
  };
  const days = researchDays(sched, "2026-10-12", 3);
  assert.deepEqual(days.map((d) => d.date), ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15"]);
  assert.equal(days[0].label, "Today");
  assert.deepEqual(days[0].staff, [
    { name: "Amy", where: "WORC", site: "WORC", hours: "7:30–4:00", note: null },
    { name: "Diana", where: "LEOM", site: "LEOM", hours: null, note: null },
  ]);
  assert.equal(days[0].sheetNote, "HELIOS-3 Wk 8");
  assert.deepEqual(days[1].away, [{ name: "Diana", text: "vacation through Fri, Oct 16" }]);
  assert.deepEqual(days[2].staff, []);
  assert.deepEqual(days[2].away, [{ name: "Amy", text: "off" }]);
  assert.equal(days[2].empty, "Not on that day's sheet");
  assert.equal(days[3].hasSheet, false);
  assert.equal(days[3].empty, "No tech sheet posted yet");
});

test("researchDays: today with a sheet but no research → \"Not on today's sheet\"; weekends skipped ahead; bad payload → []", () => {
  const sched = {
    configured: true,
    days: [
      { date: "2026-10-09", techs: { people: [], roles: roles(), off: [] } },
      { date: "2026-10-10", techs: null },
      { date: "2026-10-11", techs: null },
      { date: "2026-10-12", techs: null },
    ],
  };
  const days = researchDays(sched, "2026-10-09", 2);
  assert.deepEqual(days.map((d) => d.date), ["2026-10-09", "2026-10-12"]);
  assert.equal(days[0].empty, "Not on today's sheet");
  assert.equal(days[0].label, "Today");
  assert.equal(days[1].label, "Mon, Oct 12");
  assert.deepEqual(researchDays(null, "2026-10-09"), []);
  assert.deepEqual(researchDays({ days: "x" }, "2026-10-09"), []);
});

test("groupVisits: grouped by trial, acronym labels, date order, withdrawn / screen-fail hidden unless asked", () => {
  const trials = [{ slug: "helios-3", acronym: "HELIOS-3" }, { slug: "sienna-ga", acronym: "SIENNA" }];
  const visits = [
    { id: "a", participant_id: "10-071-003", trial_key: "helios-3", visit_date: "2026-10-20", status: "scheduled" },
    { id: "b", participant_id: "10-071-001", trial_key: "HELIOS-3", visit_date: "2026-10-12", status: "window-open" },
    { id: "c", participant_id: "10-071-002", trial_key: "sienna", visit_date: "2026-10-01", status: "screen-fail" },
    { id: "d", participant_id: "10-071-004", trial_key: "helios-3", visit_date: null, status: "scheduled" },
    { id: "e", participant_id: "10-071-005", trial_key: "rgx-314", visit_date: "2026-10-05", status: "withdrawn" },
  ];
  const g = groupVisits(visits, trials);
  assert.deepEqual(g.map((x) => [x.label, x.visits.map((v) => v.id), x.hidden]), [
    ["HELIOS-3", ["b", "a", "d"], 0],
    ["RGX-314", [], 1],
    ["SIENNA", [], 1],
  ]);
  const all = groupVisits(visits, trials, { showHidden: true });
  assert.deepEqual(all.map((x) => x.visits.length), [3, 1, 1]);
  assert.deepEqual(groupVisits([], trials), []);
  assert.deepEqual(groupVisits(null, null), []);
});

test("trialLabel / visitStatus / shortDate", () => {
  assert.equal(trialLabel("sienna", [{ slug: "x", acronym: "SIENNA" }]), "SIENNA");
  assert.equal(trialLabel("ext-9", []), "EXT-9");
  assert.equal(trialLabel("", null), "Unassigned");
  assert.deepEqual(visitStatus("window-open"), { label: "Window open", tone: "amber" });
  assert.deepEqual(visitStatus("missed"), { label: "Missed", tone: "red" });
  assert.deepEqual(visitStatus("re_scheduled"), { label: "Re scheduled", tone: "muted" });
  assert.deepEqual(visitStatus(null), { label: "No status", tone: "muted" });
  assert.equal(shortDate("2026-10-12"), "Mon, Oct 12");
  assert.equal(shortDate("bad"), "");
});

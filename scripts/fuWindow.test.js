// Unit tests for src/lib/fuWindow.js — the F/U calculator's ±6-day clinic
// window (Mari, Oct 19 2026). Run with `npm test` (node --test).
// Fixtures are synthetic /api/schedule payloads: doctor initials + sites only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeFuWindow, fuFetchRange, fuShortDate, fuDelta, fuSuggestionText } from "../src/lib/fuWindow.js";
import { majorHoliday, injectionBlackout, parseLocalNoon } from "../src/lib/practiceCalendar.js";
import { addDaysYmd, dateOfYmd } from "../src/lib/vraSchedule.js";

const FNS = { holiday: majorHoliday, blackout: injectionBlackout, isBlocked: () => false };

// Mari's usual week: Mon/Tue/Thu Worcester all day, Wed AM Leominster +
// Wed PM Valeda, Fri LEA (LEX) all day. Other doctors present too.
function usualSessions(ymd, doctor = "MR") {
  const dow = dateOfYmd(ymd).getDay();
  const full = (site) => [{ doctor, site, part: "AM" }, { doctor, site, part: "PM" }];
  const others = [{ doctor: "BKH", site: "LEOM", part: "AM" }, { doctor: "FJM", site: "UMASS", part: "PM" }];
  if (dow === 0 || dow === 6) return [];
  if (dow === 3) return [{ doctor, site: "LEOM", part: "AM" }, { doctor, site: "VALEDA", part: "PM" }, ...others];
  if (dow === 5) return [...full("LEX"), ...others];
  return [...full("WORC"), ...others];
}

/** 13-day payload centered on `target`; `edit(day)` customizes days. */
function payload(target, edit = () => {}) {
  const { from, days } = fuFetchRange(target);
  const out = [];
  for (let i = 0; i < days; i++) {
    const date = addDaysYmd(from, i);
    const day = { date, closed: false, closureName: null, sessions: usualSessions(date), vacations: [] };
    edit(day);
    out.push(day);
  }
  return { configured: true, from, days: out };
}

// 2027-01-25 is a Monday (14 weeks from Mon 2026-10-19).
const MON = "2027-01-25";

test("fuFetchRange: target − 6, 13 days", () => {
  assert.deepEqual(fuFetchRange(MON), { from: "2027-01-19", days: 13 });
});

test("format helpers", () => {
  assert.equal(fuShortDate("2027-01-21"), "Thu 1/21");
  assert.equal(fuDelta(1), "+1 d");
  assert.equal(fuDelta(-4), "−4 d");
  assert.equal(fuSuggestionText({ label: "Wed 1/27", site: "Leominster", half: "AM", deltaText: "+2 d" }), "Wed 1/27 Leominster AM (+2 d)");
});

test("target is a clinic day → site, no suggestions", () => {
  const r = computeFuWindow(parseLocalNoon(MON), "MR", payload(MON), FNS);
  assert.equal(r.target.ymd, MON);
  assert.equal(r.target.clinic, true);
  assert.equal(r.target.site, "Worcester");
  assert.equal(r.target.half, null);
  assert.deepEqual(r.target.reasons, []);
  assert.deepEqual(r.suggestions, []);
});

test("target on vacation → reason + nearest clinic days (ties: later first)", () => {
  const p = payload(MON, (d) => { if (d.date === MON || d.date === "2027-01-27") d.vacations.push("MR"); });
  const r = computeFuWindow(MON, "MR", p, FNS);
  assert.equal(r.target.clinic, false);
  assert.deepEqual(r.target.reasons.map((x) => x.code), ["vacation"]);
  assert.equal(r.target.reasons[0].text, "You're on vacation");
  // Wed 1/27 (+2) is also vacation. Tue 1/26 (+1); Fri 1/22 (−3) / Thu 1/28 (+3) tie → Thu first.
  assert.deepEqual(r.suggestions.map(fuSuggestionText), [
    "Tue 1/26 Worcester (+1 d)",
    "Thu 1/28 Worcester (+3 d)",
    "Fri 1/22 LEA (−3 d)",
  ]);
});

test("vacation for another doctor doesn't count", () => {
  const p = payload(MON, (d) => { if (d.date === MON) d.vacations.push("BKH"); });
  assert.equal(computeFuWindow(MON, "MR", p, FNS).target.clinic, true);
});

test("Valeda-only day is not a clinic day", () => {
  const WED = "2027-01-27";
  const p = payload(WED, (d) => { if (d.date === WED) d.sessions = [{ doctor: "MR", site: "VALEDA", part: "PM" }]; });
  const r = computeFuWindow(WED, "MR", p, FNS);
  assert.equal(r.target.clinic, false);
  assert.deepEqual(r.target.reasons.map((x) => x.code), ["noClinic"]);
  assert.equal(r.target.reasons[0].text, "No clinic that day");
  assert.equal(r.suggestions.length, 3);
  assert.equal(r.suggestions[0].ymd, "2027-01-28"); // Thu +1 before Tue −1
  assert.equal(r.suggestions[1].ymd, "2027-01-26");
});

test("AM-only (Leominster AM + Valeda PM) → half day AM", () => {
  const WED = "2027-01-27";
  const r = computeFuWindow(WED, "MR", payload(WED), FNS);
  assert.equal(r.target.clinic, true);
  assert.equal(r.target.site, "Leominster");
  assert.equal(r.target.half, "AM");
});

test("PM-only half day; different sites AM vs PM", () => {
  const p = payload(MON, (d) => {
    if (d.date === MON) d.sessions = [{ doctor: "MR", site: "WORC", part: "PM" }];
    if (d.date === "2027-01-26") d.sessions = [{ doctor: "MR", site: "WORC", part: "AM" }, { doctor: "MR", site: "LEOM", part: "PM" }];
  });
  const r = computeFuWindow(MON, "MR", p, FNS);
  assert.equal(r.target.site, "Worcester");
  assert.equal(r.target.half, "PM");
  const r2 = computeFuWindow("2027-01-26", "MR", p, FNS);
  assert.equal(r2.target.site, "Worcester AM / Leominster PM");
  assert.equal(r2.target.half, null);
});

test("closed day → Office closed (name)", () => {
  const p = payload(MON, (d) => { if (d.date === MON) { d.closed = true; d.closureName = "Snow day"; } });
  const r = computeFuWindow(MON, "MR", p, FNS);
  assert.equal(r.target.clinic, false);
  assert.deepEqual(r.target.reasons.map((x) => x.text), ["Office closed (Snow day)"]);
  assert.equal(r.suggestions[0].ymd, "2027-01-26");
});

test("holiday (sessions still on the calendar) → not a clinic day", () => {
  const MLK = "2027-01-18";
  const r = computeFuWindow(MLK, "MR", payload(MLK), FNS);
  assert.equal(r.target.clinic, false);
  assert.deepEqual(r.target.reasons.map((x) => x.code), ["holiday"]);
  assert.equal(r.target.reasons[0].text, "MLK Day");
  assert.equal(r.suggestions[0].ymd, "2027-01-19"); // Tue +1
});

test("injection blackout (Jan 1–14) → not a clinic day; suggestions skip the blackout", () => {
  const T = "2027-01-11"; // Mon, in blackout
  const r = computeFuWindow(T, "MR", payload(T), FNS);
  assert.equal(r.target.clinic, false);
  assert.deepEqual(r.target.reasons.map((x) => x.code), ["blackout"]);
  // Window 1/5 … 1/17: only Fri 1/15 (+4) is outside the blackout (1/16–17 weekend).
  assert.deepEqual(r.suggestions.map(fuSuggestionText), ["Fri 1/15 LEA (+4 d)"]);
});

test("MR OR block (isBlocked) → not a clinic day", () => {
  const p = payload(MON);
  const fns = { ...FNS, isBlocked: (d) => d.getDate() === 25 && d.getMonth() === 0 };
  const r = computeFuWindow(MON, "MR", p, fns);
  assert.equal(r.target.clinic, false);
  assert.deepEqual(r.target.reasons.map((x) => x.code), ["block"]);
  assert.equal(r.suggestions[0].ymd, "2027-01-26");
});

test("±6 boundary: days ±6 count, nothing beyond; none → empty suggestions", () => {
  // Only clinic sessions at −6 and +6 (and a +7 that is outside the payload anyway).
  const p = payload(MON, (d) => {
    const keep = d.date === "2027-01-19" || d.date === "2027-01-31";
    d.sessions = keep ? [{ doctor: "MR", site: "WORC", part: "AM" }, { doctor: "MR", site: "WORC", part: "PM" }] : [];
  });
  // 1/31 is a Sunday → never a clinic day; 1/19 (−6) is the only one.
  const r = computeFuWindow(MON, "MR", p, FNS);
  assert.deepEqual(r.suggestions.map((s) => [s.ymd, s.delta]), [["2027-01-19", -6]]);
  // +6 on a weekday: target Wed 1/27 → +6 = Tue 2/2.
  const W = "2027-01-27";
  const p2 = payload(W, (d) => {
    d.sessions = d.date === "2027-02-02" ? [{ doctor: "MR", site: "LEOM", part: "AM" }] : [];
  });
  const r2 = computeFuWindow(W, "MR", p2, FNS);
  assert.deepEqual(r2.suggestions.map(fuSuggestionText), ["Tue 2/2 Leominster AM (+6 d)"]);
  // Vacation the whole window → known doctor, no clinic day at all.
  const p3 = payload(MON, (d) => d.vacations.push("MR"));
  const r3 = computeFuWindow(MON, "MR", p3, FNS);
  assert.equal(r3.target.clinic, false);
  assert.deepEqual(r3.suggestions, []);
});

test("each doctor sees only their own sessions", () => {
  // BKH has only Leominster AM sessions in the fixture.
  const r = computeFuWindow(MON, "BKH", payload(MON), FNS);
  assert.equal(r.target.clinic, true);
  assert.equal(r.target.site, "Leominster");
  assert.equal(r.target.half, "AM");
});

test("empty / failed / unconfigured payload, missing doctor or target → null", () => {
  assert.equal(computeFuWindow(MON, "MR", null, FNS), null);
  assert.equal(computeFuWindow(MON, "MR", { configured: false }, FNS), null);
  assert.equal(computeFuWindow(MON, "MR", { configured: true, error: "network", days: [] }, FNS), null);
  assert.equal(computeFuWindow(MON, "MR", { configured: true, days: [] }, FNS), null);
  assert.equal(computeFuWindow(MON, "", payload(MON), FNS), null);
  assert.equal(computeFuWindow(MON, null, payload(MON), FNS), null);
  // Payload for a different window (stale response) → null.
  assert.equal(computeFuWindow("2027-03-01", "MR", payload(MON), FNS), null);
  // Doctor not on the calendar at all in the window → null (old behavior).
  assert.equal(computeFuWindow(MON, "BJB", payload(MON), FNS), null);
});

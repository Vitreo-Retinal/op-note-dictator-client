// Unit tests for src/lib/fuWindow.js — the F/U calculator's ±6-day clinic
// window (Mari, Oct 19 2026). Run with `npm test` (node --test).
// Fixtures are synthetic /api/schedule payloads: doctor initials + sites only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeFuWindow, fuFetchRange, fuWindowDays, FU_WINDOW_DAYS, fuShortDate, fuDelta, fuSuggestionText, fuSiteName, fuTargetYmdOf, fuTodaySiteOf, fuCalReason } from "../src/lib/fuWindow.js";
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

/** Payload centered on `target` (13 days VRA, 15 LEA); `edit(day)` customizes days. */
function payload(target, edit = () => {}, hub = "vra") {
  const { from, days } = fuFetchRange(target, hub);
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
  assert.equal(fuSuggestionText({ label: "Wed 1/27", site: "LEOM", half: "AM", deltaText: "+2 d" }), "Wed 1/27 LEOM AM (+2 d)");
});

test("target is a clinic day → site, no suggestions", () => {
  const r = computeFuWindow(parseLocalNoon(MON), "MR", payload(MON), FNS);
  assert.equal(r.target.ymd, MON);
  assert.equal(r.target.clinic, true);
  assert.equal(r.target.site, "WORC");
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
  // Wed 1/27 (+2) is also vacation. Tue 1/26 (+1); Thu 1/28 (+3). Fri 1/22 (−3)
  // and Fri 1/29 (+4) are LEA days → never suggested in the VRA hub. Thu 1/21 (−4).
  // Then the nearest non-WORC day: Wed 1/20 LEOM AM (−5).
  assert.deepEqual(r.suggestions.map(fuSuggestionText), [
    "Tue 1/26 WORC (+1 d)",
    "Thu 1/28 WORC (+3 d)",
    "Thu 1/21 WORC (−4 d)",
    "Wed 1/20 LEOM AM (−5 d)",
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
  assert.equal(r.target.site, "LEOM");
  assert.equal(r.target.half, "AM");
});

test("PM-only half day; different sites AM vs PM", () => {
  const p = payload(MON, (d) => {
    if (d.date === MON) d.sessions = [{ doctor: "MR", site: "WORC", part: "PM" }];
    if (d.date === "2027-01-26") d.sessions = [{ doctor: "MR", site: "WORC", part: "AM" }, { doctor: "MR", site: "LEOM", part: "PM" }];
  });
  const r = computeFuWindow(MON, "MR", p, FNS);
  assert.equal(r.target.site, "WORC");
  assert.equal(r.target.half, "PM");
  const r2 = computeFuWindow("2027-01-26", "MR", p, FNS);
  assert.equal(r2.target.site, "WORC AM / LEOM PM");
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
  // Window 1/5 … 1/17: only Fri 1/15 (+4) is outside the blackout (1/16–17
  // weekend), and it's an LEA day → nothing in the VRA hub.
  assert.deepEqual(r.suggestions, []);
  // Same target in the LEA hub (window 1/4 … 1/18): Fri 1/15 is the one LEA day out of the blackout.
  const r2 = computeFuWindow(T, "MR", payload(T, undefined, "lea"), FNS, "lea");
  assert.deepEqual(r2.target.reasons.map((x) => x.code), ["blackout", "noClinic"]);
  assert.deepEqual(r2.suggestions.map(fuSuggestionText), ["Fri 1/15 LEA (+4 d)"]);
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
  assert.deepEqual(r2.suggestions.map(fuSuggestionText), ["Tue 2/2 LEOM AM (+6 d)"]);
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
  assert.equal(r.target.site, "LEOM");
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

// ── Hub-aware site filter + LEA ±7 window (Mari, Oct 19 2026) ──

const FRI = "2027-01-29"; // Friday, 14 weeks + 4 days out; Mari's usual LEA day
const full = (site, doctor = "MR") => [{ doctor, site, part: "AM" }, { doctor, site, part: "PM" }];

test("window size by hub; default hub = vra", () => {
  assert.equal(fuWindowDays("vra"), 6);
  assert.equal(fuWindowDays("lea"), 7);
  assert.equal(fuWindowDays(), 6);
  assert.equal(fuWindowDays("bogus"), 6);
  assert.equal(FU_WINDOW_DAYS, 6);
  assert.deepEqual(fuFetchRange(FRI, "lea"), { from: "2027-01-22", days: 15 });
  assert.deepEqual(fuFetchRange(FRI, "vra"), fuFetchRange(FRI));
  // Omitted hub → identical results to explicit "vra".
  const p = payload(MON, (d) => { if (d.date === MON) d.vacations.push("MR"); });
  assert.deepEqual(computeFuWindow(MON, "MR", p, FNS), computeFuWindow(MON, "MR", p, FNS, "vra"));
});

test("VRA hub: a Friday with only LEX → No clinic that day; LEX never suggested", () => {
  const r = computeFuWindow(FRI, "MR", payload(FRI), FNS, "vra");
  assert.equal(r.target.clinic, false);
  assert.deepEqual(r.target.reasons.map((x) => x.code), ["noClinic"]);
  assert.equal(r.target.reasons[0].text, "No clinic that day");
  assert.ok(r.suggestions.length > 0);
  for (const s of r.suggestions) {
    assert.notEqual(dateOfYmd(s.ymd).getDay(), 5, `Friday suggested: ${s.ymd}`);
    assert.ok(!/LEA/.test(s.site), s.site);
  }
  // WORC preferred (default): Thu 1/28 (−1), then the +3 / −3 tie → Mon 2/1 (+3)
  // first, Tue 1/26 (−3); then the nearest LEOM day, Wed 1/27 (−2), last.
  assert.deepEqual(r.suggestions.map(fuSuggestionText), [
    "Thu 1/28 WORC (−1 d)",
    "Mon 2/1 WORC (+3 d)",
    "Tue 1/26 WORC (−3 d)",
    "Wed 1/27 LEOM AM (−2 d)",
  ]);
});

test("VRA hub: WORC AM + LEX PM → only WORC AM", () => {
  const p = payload(MON, (d) => { if (d.date === MON) d.sessions = [{ doctor: "MR", site: "WORC", part: "AM" }, { doctor: "MR", site: "LEX", part: "PM" }]; });
  const r = computeFuWindow(MON, "MR", p, FNS);
  assert.equal(r.target.clinic, true);
  assert.equal(r.target.site, "WORC");
  assert.deepEqual(r.target.codes, ["WORC"]);
  assert.equal(r.target.half, "AM");
});

test("VRA hub: doctor with only LEX sessions in the window → null (not on this hub's calendar)", () => {
  const p = payload(FRI, (d) => { d.sessions = dateOfYmd(d.date).getDay() === 5 ? full("LEX") : []; });
  assert.equal(computeFuWindow(FRI, "MR", p, FNS, "vra"), null);
});

test("LEA hub: only LEX counts — WORC-only day → noClinic; LEX day → LEA", () => {
  const pf = payload(FRI, undefined, "lea");
  const r = computeFuWindow(FRI, "MR", pf, FNS, "lea");
  assert.equal(r.target.clinic, true);
  assert.equal(r.target.site, "LEA");
  assert.equal(r.target.half, null);
  assert.deepEqual(r.suggestions, []);
  // A Monday (WORC all day) is not a clinic day in the LEA hub; only Fridays are suggested.
  const pm = payload(MON, undefined, "lea");
  const r2 = computeFuWindow(MON, "MR", pm, FNS, "lea");
  assert.equal(r2.target.clinic, false);
  assert.deepEqual(r2.target.reasons.map((x) => x.code), ["noClinic"]);
  // Window 1/18 … 2/1: Fridays 1/22 (−3) and 1/29 (+4).
  assert.deepEqual(r2.suggestions.map(fuSuggestionText), ["Fri 1/22 LEA (−3 d)", "Fri 1/29 LEA (+4 d)"]);
});

test("LEA hub: WORC AM + LEX PM → LEA PM", () => {
  const p = payload(FRI, (d) => { if (d.date === FRI) d.sessions = [{ doctor: "MR", site: "WORC", part: "AM" }, { doctor: "MR", site: "LEX", part: "PM" }]; }, "lea");
  const r = computeFuWindow(FRI, "MR", p, FNS, "lea");
  assert.equal(r.target.site, "LEA");
  assert.equal(r.target.half, "PM");
});

test("LEA hub: ±7 boundary — days at ±7 count, ±8 don't", () => {
  // Wide 17-day payload (target ± 8) so ±8 days are present but must be ignored.
  const wide = (target, edit) => {
    const out = [];
    for (let i = -8; i <= 8; i++) {
      const date = addDaysYmd(target, i);
      const day = { date, closed: false, closureName: null, sessions: [], vacations: [] };
      edit(day, i);
      out.push(day);
    }
    return { configured: true, from: addDaysYmd(target, -8), days: out };
  };
  const W = "2027-01-27"; // Wed: −7 = Wed 1/20, +7 = Wed 2/3, ±8 = Tue 1/19 / Thu 2/4
  const p = wide(W, (d, i) => { if (Math.abs(i) >= 7) d.sessions = full("LEX"); });
  const r = computeFuWindow(W, "MR", p, FNS, "lea");
  assert.equal(r.target.clinic, false);
  assert.deepEqual(r.suggestions.map(fuSuggestionText), ["Wed 2/3 LEA (+7 d)", "Wed 1/20 LEA (−7 d)"]);
  // Only ±8 → nothing; and the doctor isn't on the LEA calendar in the window → null.
  const p2 = wide(W, (d, i) => { if (Math.abs(i) === 8) d.sessions = full("LEX"); });
  assert.equal(computeFuWindow(W, "MR", p2, FNS, "lea"), null);
  // VRA hub on the same shape still stops at ±6.
  const p3 = wide(W, (d, i) => { if (Math.abs(i) === 7) d.sessions = full("WORC"); if (i === 0) d.sessions = [{ doctor: "MR", site: "VALEDA", part: "AM" }]; });
  assert.deepEqual(computeFuWindow(W, "MR", p3, FNS, "vra").suggestions, []);
});

test("LEA hub: vacation Friday → Fri +7 then Fri −7 (ties: later first)", () => {
  const p = payload(FRI, (d) => { if (d.date === FRI) d.vacations.push("MR"); }, "lea");
  const r = computeFuWindow(FRI, "MR", p, FNS, "lea");
  assert.equal(r.target.clinic, false);
  assert.deepEqual(r.target.reasons.map((x) => x.code), ["vacation"]);
  assert.equal(r.target.reasons[0].text, "You're on vacation");
  assert.deepEqual(r.suggestions.map(fuSuggestionText), ["Fri 2/5 LEA (+7 d)", "Fri 1/22 LEA (−7 d)"]);
});

test("LEA hub: two weeks of vacation → reason, no suggestions", () => {
  // Off Fri 1/22 … Fri 1/29 (both Fridays); Fri 2/5 is still in clinic.
  const p = payload(FRI, (d) => { if (d.date <= FRI) d.vacations.push("MR"); }, "lea");
  const r = computeFuWindow(FRI, "MR", p, FNS, "lea");
  assert.deepEqual(r.target.reasons.map((x) => x.code), ["vacation"]);
  assert.deepEqual(r.suggestions.map((s) => s.ymd), ["2027-02-05"]);
  // Off all three Fridays → nothing within ±7.
  const p2 = payload(FRI, (d) => d.vacations.push("MR"), "lea");
  const r2 = computeFuWindow(FRI, "MR", p2, FNS, "lea");
  assert.equal(r2.target.clinic, false);
  assert.equal(r2.target.reasons[0].text, "You're on vacation");
  assert.deepEqual(r2.suggestions, []);
});

test("LEA hub: holiday / closure / isBlocked still apply", () => {
  const p = payload(FRI, (d) => { if (d.date === "2027-02-05") { d.closed = true; d.closureName = "Snow day"; } }, "lea");
  const fns = { ...FNS, isBlocked: (d) => d.getDate() === 29 && d.getMonth() === 0 };
  const r = computeFuWindow(FRI, "MR", p, fns, "lea");
  assert.deepEqual(r.target.reasons.map((x) => x.code), ["block"]);
  assert.deepEqual(r.suggestions.map((s) => s.ymd), ["2027-01-22"]);
});

test("LEA hub: doctor who never works at LEA → null (calculator unchanged)", () => {
  // BKH has only Leominster AM sessions in the fixture.
  assert.equal(computeFuWindow(FRI, "BKH", payload(FRI, undefined, "lea"), FNS, "lea"), null);
});

// ── Short site labels, site codes, preferred site (Mari, Oct 19 2026 10:51 AM) ──

const fuSegText = (x) => x.segments.map((g) => `${g.codes.join(" + ")}${g.half ? ` ${g.half}` : ""}`).join(" / ");

test("site codes + segments exposed on target and suggestions; Valeda / LEX never in codes", () => {
  const TUE = "2027-01-26";
  const p = payload(TUE, (d) => {
    if (d.date === TUE) d.sessions = [{ doctor: "MR", site: "WORC", part: "AM" }, { doctor: "MR", site: "LEOM", part: "PM" }];
    if (d.date === "2027-01-25") d.sessions = [{ doctor: "MR", site: "UMASS", part: "AM" }, { doctor: "MR", site: "WORC", part: "AM" }, { doctor: "MR", site: "LEX", part: "PM" }];
  });
  // Two sites, AM vs PM → two codes, two segments.
  const r = computeFuWindow(TUE, "MR", p, FNS);
  assert.equal(r.target.site, "WORC AM / LEOM PM");
  assert.deepEqual(r.target.codes, ["WORC", "LEOM"]);
  assert.deepEqual(r.target.segments, [{ codes: ["WORC"], half: "AM" }, { codes: ["LEOM"], half: "PM" }]);
  // Two sites in one half (site order) + LEX ignored in the VRA hub.
  const r2 = computeFuWindow("2027-01-25", "MR", p, FNS);
  assert.equal(r2.target.site, "WORC + UMass");
  assert.equal(r2.target.half, "AM");
  assert.deepEqual(r2.target.codes, ["WORC", "UMASS"]);
  assert.deepEqual(r2.target.segments, [{ codes: ["WORC", "UMASS"], half: "AM" }]);
  // Full day at one site → one segment, half null.
  const r3 = computeFuWindow("2027-01-28", "MR", p, FNS);
  assert.deepEqual(r3.target.codes, ["WORC"]);
  assert.deepEqual(r3.target.segments, [{ codes: ["WORC"], half: null }]);
  // Wed: LEOM AM + Valeda PM → Valeda not in codes.
  const r4 = computeFuWindow("2027-01-27", "MR", payload("2027-01-27"), FNS);
  assert.deepEqual(r4.target.codes, ["LEOM"]);
  assert.deepEqual(r4.target.segments, [{ codes: ["LEOM"], half: "AM" }]);
  // Non-clinic target (Fri, LEX only) → empty codes; every suggestion carries codes
  // and segments that rebuild site + half exactly.
  const r5 = computeFuWindow(FRI, "MR", payload(FRI), FNS);
  assert.deepEqual(r5.target.codes, []);
  assert.deepEqual(r5.target.segments, []);
  assert.ok(r5.suggestions.length > 0);
  for (const s of r5.suggestions) {
    assert.ok(Array.isArray(s.codes) && s.codes.length > 0, s.ymd);
    assert.equal(fuSegText(s).replace(/UMASS/g, "UMass"), `${s.site}${s.half ? ` ${s.half}` : ""}`);
    assert.equal(typeof s.preferred, "boolean");
  }
});

test("FU_SITE_NAME: short labels; LEX stays LEA", () => {
  assert.equal(fuSiteName("WORC"), "WORC");
  assert.equal(fuSiteName("LEOM"), "LEOM");
  assert.equal(fuSiteName("LEX"), "LEA");
  assert.equal(fuSiteName("UMASS"), "UMass");
  assert.equal(fuSiteName("WSC"), "WSC");
  assert.equal(fuSiteName("VALEDA"), "Valeda");
  assert.equal(fuSiteName("XYZ"), "XYZ");
});

test("preferSite default (VRA hub) = WORC: WORC days before a nearer LEOM day; nearest LEOM appended last; max 3 + 1", () => {
  // Fri 1/29 (LEX only → no VRA clinic). Window 1/23 … 2/4:
  // WORC: Thu 1/28 −1, Mon 2/1 +3, Tue 1/26 −3, Mon 1/25 −4, Tue 2/2 +4, Thu 2/4 +6 (6 days)
  // LEOM: Wed 1/27 −2 (nearer than all but one WORC day), Wed 2/3 +5.
  const p = payload(FRI);
  const r = computeFuWindow(FRI, "MR", p, FNS);
  assert.deepEqual(r.suggestions.map(fuSuggestionText), [
    "Thu 1/28 WORC (−1 d)",
    "Mon 2/1 WORC (+3 d)",
    "Tue 1/26 WORC (−3 d)",
    "Wed 1/27 LEOM AM (−2 d)",
  ]);
  assert.deepEqual(r.suggestions.map((s) => s.preferred), [true, true, true, false]);
  assert.equal(r.suggestions.length, 4); // only 3 of the 6 WORC days, only 1 of the 2 LEOM days
  // Omitted opts, {}, preferSite null and preferSite "WORC" are all the same.
  for (const opts of [{}, { preferSite: null }, { preferSite: "WORC" }, { preferSite: "worc" }]) {
    assert.deepEqual(computeFuWindow(FRI, "MR", p, FNS, "vra", opts), r);
  }
  assert.deepEqual(computeFuWindow(FRI, "MR", p, FNS, undefined, { preferSite: null }), r);
});

test("preferSite = LEOM (typing in Leominster on a Wednesday) flips the order", () => {
  const p = payload(FRI);
  const r = computeFuWindow(FRI, "MR", p, FNS, "vra", { preferSite: "LEOM" });
  // Both LEOM days first (nearest first), then the single nearest WORC day.
  assert.deepEqual(r.suggestions.map(fuSuggestionText), [
    "Wed 1/27 LEOM AM (−2 d)",
    "Wed 2/3 LEOM AM (+5 d)",
    "Thu 1/28 WORC (−1 d)",
  ]);
  assert.deepEqual(r.suggestions.map((s) => s.preferred), [true, true, false]);
  // A mixed day (WORC AM / LEOM PM) counts as a LEOM day.
  const p2 = payload(FRI, (d) => {
    if (d.date === "2027-02-01") d.sessions = [{ doctor: "MR", site: "WORC", part: "AM" }, { doctor: "MR", site: "LEOM", part: "PM" }];
  });
  const r2 = computeFuWindow(FRI, "MR", p2, FNS, "vra", { preferSite: "LEOM" });
  assert.deepEqual(r2.suggestions.map(fuSuggestionText), [
    "Wed 1/27 LEOM AM (−2 d)",
    "Mon 2/1 WORC AM / LEOM PM (+3 d)",
    "Wed 2/3 LEOM AM (+5 d)",
    "Thu 1/28 WORC (−1 d)",
  ]);
});

test("no preferred-site day in the window → plain nearest 3 (ties later first)", () => {
  // MR has no UMass days → nearest 3 of everything, nothing marked preferred.
  const r = computeFuWindow(FRI, "MR", payload(FRI), FNS, "vra", { preferSite: "UMASS" });
  assert.deepEqual(r.suggestions.map(fuSuggestionText), [
    "Thu 1/28 WORC (−1 d)",
    "Wed 1/27 LEOM AM (−2 d)",
    "Mon 2/1 WORC (+3 d)",
  ]);
  assert.deepEqual(r.suggestions.map((s) => s.preferred), [false, false, false]);
  // Default WORC preference but no WORC day in the window → nearest 3 LEOM days.
  const W = "2027-01-27";
  const p = payload(W, (d) => {
    const dow = dateOfYmd(d.date).getDay();
    d.sessions = dow >= 1 && dow <= 5 && d.date !== W ? [{ doctor: "MR", site: "LEOM", part: "AM" }] : [];
    if (d.date === W) d.vacations.push("MR");
  });
  const r2 = computeFuWindow(W, "MR", p, FNS);
  assert.deepEqual(r2.suggestions.map((s) => [s.ymd, s.delta]), [["2027-01-28", 1], ["2027-01-26", -1], ["2027-01-29", 2]]);
  assert.ok(r2.suggestions.every((s) => s.preferred === false));
});

test("LEA hub ignores preferSite: nearest 3, nothing appended, nothing preferred", () => {
  // Every weekday LEX in a 15-day payload; target Fri on vacation.
  const p = payload(FRI, (d) => {
    const dow = dateOfYmd(d.date).getDay();
    d.sessions = dow >= 1 && dow <= 5 ? full("LEX") : [];
    if (d.date === FRI) d.vacations.push("MR");
  }, "lea");
  const base = computeFuWindow(FRI, "MR", p, FNS, "lea");
  // Thu 1/28 (−1), Wed 1/27 (−2), then the ±3 tie → Mon 2/1 (+3) before Tue 1/26.
  assert.deepEqual(base.suggestions.map((s) => [s.ymd, s.delta]), [["2027-01-28", -1], ["2027-01-27", -2], ["2027-02-01", 3]]);
  assert.equal(base.suggestions.length, 3);
  for (const preferSite of ["WORC", "LEOM", "LEX", null]) {
    assert.deepEqual(computeFuWindow(FRI, "MR", p, FNS, "lea", { preferSite }), base);
  }
  assert.ok(base.suggestions.every((s) => s.preferred === false && s.codes.join() === "LEX"));
});

// ── Shared helpers (note page + homepage Call Board, Oct 2026) ──

test("fuTargetYmdOf: today at noon + N weeks; empty / non-positive → null", () => {
  const mon = new Date(2026, 9, 19, 8, 15); // Mon Oct 19 2026, 8:15 AM local
  assert.equal(fuTargetYmdOf("14", mon), "2027-01-25");
  assert.equal(fuTargetYmdOf("4", mon), "2026-11-16");
  assert.equal(fuTargetYmdOf(4, new Date(2026, 9, 19, 23, 59)), "2026-11-16"); // late evening, same day
  assert.equal(fuTargetYmdOf("1", new Date(2026, 9, 30, 9)), "2026-11-06"); // across the DST change
  for (const w of ["", "0", "-2", "abc", null, undefined]) assert.equal(fuTargetYmdOf(w, mon), null);
});

test("fuTodaySiteOf: current half's site, the other half when empty, never LEX / Valeda", () => {
  const T0 = "2026-10-21"; // Wed
  const sched = (sessions) => ({ configured: true, days: [{ date: T0, closed: false, sessions, vacations: [] }] });
  const am = new Date(2026, 9, 21, 9, 0), pm = new Date(2026, 9, 21, 12, 30), justBefore = new Date(2026, 9, 21, 12, 29);
  const s1 = sched([{ doctor: "MR", site: "LEOM", part: "AM" }, { doctor: "MR", site: "WORC", part: "PM" }, { doctor: "BKH", site: "UMASS", part: "AM" }]);
  assert.equal(fuTodaySiteOf(s1, "MR", T0, am), "LEOM");
  assert.equal(fuTodaySiteOf(s1, "MR", T0, justBefore), "LEOM");
  assert.equal(fuTodaySiteOf(s1, "MR", T0, pm), "WORC"); // 12:30 cutoff → PM
  assert.equal(fuTodaySiteOf(s1, "mr", T0, am), "LEOM"); // initials case-insensitive
  // AM at LEOM, PM Valeda → PM falls back to the AM site (Valeda never counts).
  const s2 = sched([{ doctor: "MR", site: "LEOM", part: "AM" }, { doctor: "MR", site: "VALEDA", part: "PM" }]);
  assert.equal(fuTodaySiteOf(s2, "MR", T0, pm), "LEOM");
  // LEA-only day → null (computeFuWindow then defaults to WORC).
  assert.equal(fuTodaySiteOf(sched([{ doctor: "MR", site: "LEX", part: "AM" }, { doctor: "MR", site: "LEX", part: "PM" }]), "MR", T0, am), null);
  // Not on the calendar today / bad input → null, never throws.
  assert.equal(fuTodaySiteOf(s1, "FJM", T0, am), null);
  assert.equal(fuTodaySiteOf(s1, "MR", "2026-10-22", am), null);
  assert.equal(fuTodaySiteOf(null, "MR", T0, am), null);
  assert.equal(fuTodaySiteOf({ days: [{ date: T0, sessions: null }] }, "MR", T0, am), null);
  assert.equal(fuTodaySiteOf(s1, "", T0, am), null);
});

test("fuCalReason: first of closed / vacation / noClinic for a non-clinic target", () => {
  assert.equal(fuCalReason(null), null);
  const clinic = computeFuWindow(MON, "MR", payload(MON), FNS);
  assert.equal(fuCalReason(clinic), null);
  const vac = computeFuWindow(MON, "MR", payload(MON, (d) => { if (d.date === MON) d.vacations.push("MR"); }), FNS);
  assert.deepEqual(fuCalReason(vac), { code: "vacation", text: "You're on vacation" });
  const none = computeFuWindow(MON, "MR", payload(MON, (d) => { if (d.date === MON) d.sessions = []; }), FNS);
  assert.deepEqual(fuCalReason(none), { code: "noClinic", text: "No clinic that day" });
  // Closed office → the closure, not noClinic.
  const closed = computeFuWindow(MON, "MR", payload(MON, (d) => { if (d.date === MON) { d.closed = true; d.closureName = "Snow"; d.sessions = []; } }), FNS);
  assert.deepEqual(fuCalReason(closed), { code: "closed", text: "Office closed (Snow)" });
  // Weekend target (no sessions) → "No clinic that day", same line the note page shows.
  const SAT = "2027-01-23";
  const sat = computeFuWindow(SAT, "MR", payload(SAT), FNS);
  assert.equal(sat.target.clinic, false);
  assert.equal(fuCalReason(sat).code, "noClinic");
});

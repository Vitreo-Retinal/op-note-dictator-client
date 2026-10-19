// ── F/U window — "14 weeks = 14 weeks ± 6 days" (Mari, Oct 19 2026) ──
// Pure logic behind the note generator's "F/u in: N weeks" calculator.
// Given the target date (today + N weeks), the signed-in doctor's initials and
// a GET /api/schedule payload covering target − 6 … target + 6 (13 days), it
// says whether the target is one of that doctor's clinic days and, if not,
// which nearby days are.
//
// A CLINIC DAY for the doctor is a weekday where:
//   · the doctor has at least one session whose site is not VALEDA,
//   · the doctor is not in that day's `vacations`,
//   · the office is not `closed`,
//   · it is not a majorHoliday and not an injectionBlackout day,
//   · the caller's `isBlocked(date)` is false (MR: her personal OR /
//     no_clinic / vacation rows from hub_surgeon_schedule).
// The day before Thanksgiving (halfDayNote) still counts; the UI shows its note.
//
// Returns null whenever the calendar can't answer (no doctor, failed or
// unconfigured payload, target missing from the payload, or the doctor has no
// sessions and no vacation anywhere in the window — i.e. not on the calendar),
// so the calculator falls back to exactly its old behavior.

import { scheduleOk, ymdOf, dateOfYmd, addDaysYmd, bySiteOrder } from "./vraSchedule.js";

export const FU_WINDOW_DAYS = 6;

// Calendar site code → display name. LEX is LEA (Lexington Eye, Concord for
// Mari). Unknown codes show as-is.
export const FU_SITE_NAME = { WORC: "Worcester", LEOM: "Leominster", LEX: "LEA", UMASS: "UMass", WSC: "WSC", VALEDA: "Valeda" };
export const fuSiteName = (s) => FU_SITE_NAME[s] || s;

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The /api/schedule request for a target "YYYY-MM-DD": { from, days }. */
export function fuFetchRange(targetYmd) {
  return { from: addDaysYmd(targetYmd, -FU_WINDOW_DAYS), days: FU_WINDOW_DAYS * 2 + 1 };
}

/** "2027-01-21" → "Thu 1/21" */
export function fuShortDate(ymd) {
  const d = dateOfYmd(ymd);
  return `${DOW[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
}

/** +1 → "+1 d", −4 → "−4 d" (Unicode minus). */
export const fuDelta = (n) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)} d`;

/**
 * One doctor's non-Valeda sites by half → { AM: [codes], PM: [codes] }.
 */
function clinicHalves(day, doctor) {
  const res = { AM: [], PM: [] };
  for (const s of (day && Array.isArray(day.sessions) ? day.sessions : [])) {
    if (!s || s.doctor !== doctor || String(s.site).toUpperCase() === "VALEDA") continue;
    if (!res[s.part] || res[s.part].includes(s.site)) continue;
    res[s.part].push(s.site);
  }
  res.AM.sort(bySiteOrder);
  res.PM.sort(bySiteOrder);
  return res;
}

/**
 * Site text for a clinic day: "Worcester", "Leominster AM",
 * "Worcester AM / Leominster PM". half = "AM" | "PM" | null (full day).
 */
function siteText(h) {
  const name = (codes) => codes.map(fuSiteName).join(" + ");
  if (h.AM.length && h.PM.length) {
    const same = h.AM.length === h.PM.length && h.AM.every((s, i) => s === h.PM[i]);
    return { site: same ? name(h.AM) : `${name(h.AM)} AM / ${name(h.PM)} PM`, half: null };
  }
  if (h.AM.length) return { site: name(h.AM), half: "AM" };
  if (h.PM.length) return { site: name(h.PM), half: "PM" };
  return { site: null, half: null };
}

/**
 * Evaluate one calendar day for the doctor.
 * → { ymd, clinic, site, half, reasons: [{ code, text }] }
 * Reason codes: "weekend", "holiday", "blackout", "block" (caller's isBlocked),
 * "closed", "vacation", "noClinic". Calendar reasons come in that order;
 * "noClinic" is only added when neither "closed" nor "vacation" applies.
 */
export function evalFuDay(day, doctor, fns = {}) {
  const { holiday = () => null, blackout = () => null, isBlocked = () => false } = fns;
  const ymd = day.date;
  const date = dateOfYmd(ymd);
  const reasons = [];
  const dow = date.getDay();
  if (dow === 0 || dow === 6) reasons.push({ code: "weekend", text: "Weekend" });
  const hol = holiday(date);
  if (hol) reasons.push({ code: "holiday", text: hol });
  const bo = blackout(date);
  if (bo) reasons.push({ code: "blackout", text: bo });
  if (isBlocked(date)) reasons.push({ code: "block", text: "Schedule block" });
  if (day.closed) reasons.push({ code: "closed", text: day.closureName ? `Office closed (${day.closureName})` : "Office closed" });
  const vac = Array.isArray(day.vacations) && day.vacations.some((v) => String(v).toUpperCase() === doctor);
  if (vac) reasons.push({ code: "vacation", text: "You're on vacation" });
  const h = clinicHalves(day, doctor);
  const { site, half } = siteText(h);
  if (!site && !day.closed && !vac) reasons.push({ code: "noClinic", text: "No clinic that day" });
  return { ymd, clinic: !!site && reasons.length === 0, site, half, reasons };
}

/**
 * target:   Date (local) or "YYYY-MM-DD"
 * doctor:   "MR" | "BKH" | … (signed-in surgeon id)
 * schedule: GET /api/schedule payload
 * fns:      { holiday(Date), blackout(Date), isBlocked(Date) }
 * → null | { target: { ymd, clinic, site, half, reasons }, suggestions: [{ ymd, label, site, half, delta, deltaText }] }
 * suggestions (only when the target is not a clinic day): up to 3 clinic days
 * within ±6, nearest first, ties → the later day first.
 */
export function computeFuWindow(target, doctor, schedule, fns = {}) {
  const doc = String(doctor || "").trim().toUpperCase();
  if (!doc || !target || !scheduleOk(schedule)) return null;
  const targetYmd = typeof target === "string" ? target : ymdOf(target);
  const byYmd = new Map();
  for (const d of schedule.days) if (d && typeof d.date === "string") byYmd.set(d.date, d);
  const tDay = byYmd.get(targetYmd);
  if (!tDay) return null;

  // Window days actually in the payload.
  const win = [];
  for (let off = -FU_WINDOW_DAYS; off <= FU_WINDOW_DAYS; off++) {
    const d = byYmd.get(addDaysYmd(targetYmd, off));
    if (d) win.push({ off, day: d });
  }
  // Doctor not on the calendar at all in this window → can't say anything.
  const known = win.some(({ day }) =>
    (Array.isArray(day.sessions) && day.sessions.some((s) => s && s.doctor === doc)) ||
    (Array.isArray(day.vacations) && day.vacations.some((v) => String(v).toUpperCase() === doc)));
  if (!known) return null;

  const t = evalFuDay(tDay, doc, fns);
  const suggestions = [];
  if (!t.clinic) {
    for (const { off, day } of win) {
      if (off === 0) continue;
      const e = evalFuDay(day, doc, fns);
      if (!e.clinic) continue;
      suggestions.push({ ymd: e.ymd, label: fuShortDate(e.ymd), site: e.site, half: e.half, delta: off, deltaText: fuDelta(off) });
    }
    suggestions.sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta) || b.delta - a.delta);
    suggestions.length = Math.min(suggestions.length, 3);
  }
  return { target: t, suggestions };
}

/** "Thu 1/21 Worcester (+1 d)" / "Wed 1/27 Leominster AM (−4 d)" */
export const fuSuggestionText = (s) => `${s.label} ${s.site}${s.half ? ` ${s.half}` : ""} (${s.deltaText})`;

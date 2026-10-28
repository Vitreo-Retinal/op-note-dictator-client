// ── F/U window — "14 weeks = 14 weeks ± 6 days" (Mari, Oct 19 2026) ──
// Pure logic behind the note generator's "F/u in: N weeks" calculator.
// Given the target date (today + N weeks), the signed-in doctor's initials and
// a GET /api/schedule payload covering target − W … target + W, it says
// whether the target is one of that doctor's clinic days and, if not, which
// nearby days are.
//
// HUB-AWARE (Mari, Oct 19 2026). The same client runs two practices off the
// shared VRA calendar, and neither may suggest the other's days:
//   · hub "vra" (default): LEX (= LEA) sessions are ignored. W = 6 (13 days).
//   · hub "lea": ONLY LEX sessions count. W = 7 (15 days) — Mari is at LEA on
//     Fridays only, so if she's off the target Friday the next options are the
//     Fridays at ±7.
// Valeda never counts, in either hub.
//
// PREFERRED SITE (Mari, Oct 19 2026 — "if I'm typing in Worcester (I'm only in
// Leominster on Wednesdays) Worcester should be preferred"). VRA hub only:
// opts.preferSite (the site the doctor is at right now, or null → "WORC").
// Suggestions list up to 3 preferred-site days first, then the single nearest
// other-site day, so a Leominster Wednesday still shows (max 4). No
// preferred-site day in the window → plain nearest 3. The LEA hub has no
// preference (only LEA counts there).
//
// A CLINIC DAY for the doctor is a weekday where:
//   · the doctor has at least one session at a site this hub counts (above),
//   · the doctor is not in that day's `vacations`,
//   · the office is not `closed`,
//   · it is not a majorHoliday and not an injectionBlackout day,
//   · the caller's `isBlocked(date)` is false (MR: her personal OR /
//     no_clinic / vacation rows from hub_surgeon_schedule).
// The day before Thanksgiving (halfDayNote) still counts; the UI shows its note.
//
// Returns null whenever the calendar can't answer (no doctor, failed or
// unconfigured payload, target missing from the payload, or — VRA hub only —
// the doctor has no sessions and no vacation anywhere in the window), so the
// calculator falls back to exactly its old behavior. In the LEA hub that last
// case instead returns no suggestions + offCalendar: true (Oct 21 2026), so the
// "No LEA clinic within a week" line shows.

import { scheduleOk, ymdOf, dateOfYmd, addDaysYmd, bySiteOrder, doctorHalves } from "./vraSchedule.js";

export const FU_HUBS = ["vra", "lea"];
const hubOf = (hub) => (hub === "lea" ? "lea" : "vra"); // anything else → "vra"

/** Days each side of the target: 6 in the VRA hub, 7 in the LEA hub. */
export const fuWindowDays = (hub) => (hubOf(hub) === "lea" ? 7 : 6);
/** VRA-hub window (kept for existing callers). */
export const FU_WINDOW_DAYS = fuWindowDays("vra");

/** Is this session site part of this hub's calendar? VRA: everything but LEX. LEA: LEX only. */
const hubSite = (site, hub) => {
  const s = String(site || "").toUpperCase();
  return hubOf(hub) === "lea" ? s === "LEX" : s !== "LEX";
};
/** Does a session at this site make a clinic day in this hub? (Valeda never does.) */
const clinicSite = (site, hub) => hubSite(site, hub) && String(site || "").toUpperCase() !== "VALEDA";

// Calendar site code → short display label (Mari, Oct 19 2026: "WORC AM / LEOM PM").
// LEX is LEA (Lexington Eye, Concord for Mari). Unknown codes show as-is.
export const FU_SITE_NAME = { WORC: "WORC", LEOM: "LEOM", LEX: "LEA", UMASS: "UMass", WSC: "WSC", VALEDA: "Valeda" };
export const fuSiteName = (s) => FU_SITE_NAME[s] || s;

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The /api/schedule request for a target "YYYY-MM-DD": { from, days }. VRA 13 days, LEA 15. */
export function fuFetchRange(targetYmd, hub = "vra") {
  const w = fuWindowDays(hub);
  return { from: addDaysYmd(targetYmd, -w), days: w * 2 + 1 };
}

/** "2027-01-21" → "Thu 1/21" */
export function fuShortDate(ymd) {
  const d = dateOfYmd(ymd);
  return `${DOW[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
}

/** +1 → "+1 d", −4 → "−4 d" (Unicode minus). */
export const fuDelta = (n) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)} d`;

/**
 * One doctor's clinic sites for this hub, by half → { AM: [codes], PM: [codes] }.
 */
function clinicHalves(day, doctor, hub) {
  const res = { AM: [], PM: [] };
  for (const s of (day && Array.isArray(day.sessions) ? day.sessions : [])) {
    if (!s || s.doctor !== doctor || !clinicSite(s.site, hub)) continue;
    if (!res[s.part] || res[s.part].includes(s.site)) continue;
    res[s.part].push(s.site);
  }
  res.AM.sort(bySiteOrder);
  res.PM.sort(bySiteOrder);
  return res;
}

/**
 * Site text for a clinic day: "WORC", "LEOM AM", "WORC AM / LEOM PM".
 * half = "AM" | "PM" | null (full day).
 * Also the site CODES, so the UI can tint by code without parsing the text:
 *   codes:    flat, unique, in site order — ["WORC", "LEOM"]
 *   segments: [{ codes, half }] — the text as pieces: segment codes joined
 *             " + ", then " AM"/" PM" when the segment has a half, segments
 *             joined " / ". Rebuilds exactly `site` + (`half` ? " " + half : "").
 */
function siteText(h) {
  const name = (codes) => codes.map(fuSiteName).join(" + ");
  const codes = [...new Set([...h.AM, ...h.PM])].sort(bySiteOrder);
  if (h.AM.length && h.PM.length) {
    const same = h.AM.length === h.PM.length && h.AM.every((s, i) => s === h.PM[i]);
    return same
      ? { site: name(h.AM), half: null, codes, segments: [{ codes: [...h.AM], half: null }] }
      : { site: `${name(h.AM)} AM / ${name(h.PM)} PM`, half: null, codes,
          segments: [{ codes: [...h.AM], half: "AM" }, { codes: [...h.PM], half: "PM" }] };
  }
  if (h.AM.length) return { site: name(h.AM), half: "AM", codes, segments: [{ codes: [...h.AM], half: "AM" }] };
  if (h.PM.length) return { site: name(h.PM), half: "PM", codes, segments: [{ codes: [...h.PM], half: "PM" }] };
  return { site: null, half: null, codes: [], segments: [] };
}

// ── Half-day note (Mari, Oct 28 2026) ──
// "It's ok to show LEOM AM, but then there should be a note saying the PM is
// blocked for accountant meeting." When the doctor works only one half of a
// clinic day, the shared calendar's TIMED general events in the other half
// (day.events — title + time only, never descriptions) become one note:
//   "PM blocked — Tech meeting 12:30, Accountant meeting 2:00"
// An event whose title says blocked / no clinic / closed is the block itself:
// it sets "blocked" and is not listed. Other halves' events, all-day events and
// full-day sessions → no note. Noon splits AM / PM.
const BLOCK_EVENT_RX = /\bblocked\b|no clinic|\bclosed\b/i;
const fuClock = (hm) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hm || ""));
  if (!m) return "";
  const h = Number(m[1]) % 12 || 12;
  return `${h}:${m[2]}`;
};
export function fuHalfNote(day, half) {
  if (half !== "AM" && half !== "PM") return null;
  const other = half === "AM" ? "PM" : "AM";
  const evs = (day && Array.isArray(day.events) ? day.events : [])
    .filter((e) => e && !e.allDay && typeof e.start === "string" && e.title)
    .filter((e) => (other === "PM" ? e.start >= "12:00" : e.start < "12:00"));
  if (!evs.length) return null;
  const blocked = evs.some((e) => BLOCK_EVENT_RX.test(e.title));
  const items = evs.filter((e) => !BLOCK_EVENT_RX.test(e.title)).map((e) => `${String(e.title).trim()} ${fuClock(e.start)}`.trim());
  if (!items.length) return `${other} blocked`;
  return `${other}${blocked ? " blocked —" : ":"} ${items.join(", ")}`;
}

/**
 * Evaluate one calendar day for the doctor.
 * → { ymd, clinic, site, half, codes, segments, reasons: [{ code, text }], note }
 *   note: fuHalfNote — what fills the other half of a half-day clinic, or null.
 * Reason codes: "weekend", "holiday", "blackout", "block" (caller's isBlocked),
 * "closed", "vacation", "noClinic". Calendar reasons come in that order;
 * "noClinic" is only added when neither "closed" nor "vacation" applies.
 */
export function evalFuDay(day, doctor, fns = {}, hub = "vra") {
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
  const h = clinicHalves(day, doctor, hub);
  const { site, half, codes, segments } = siteText(h);
  if (!site && !day.closed && !vac) reasons.push({ code: "noClinic", text: "No clinic that day" });
  const clinic = !!site && reasons.length === 0;
  return { ymd, clinic, site, half, codes, segments, reasons, note: clinic ? fuHalfNote(day, half) : null };
}

/**
 * target:   Date (local) or "YYYY-MM-DD"
 * doctor:   "MR" | "BKH" | … (signed-in surgeon id)
 * schedule: GET /api/schedule payload
 * fns:      { holiday(Date), blackout(Date), isBlocked(Date) }
 * hub:      "vra" (default) | "lea" — which sites count and the window size
 * opts:     { preferSite } — site code the doctor is at today (VRA hub only;
 *           null/omitted → "WORC"; ignored in the LEA hub)
 * → null | { target: { ymd, clinic, site, half, codes, segments, reasons },
 *            suggestions: [{ ymd, label, site, half, codes, segments, delta, deltaText, preferred }],
 *            offCalendar?: true }  (LEA hub only: no LEX session / vacation in the window)
 * suggestions (only when the target is not a clinic day), from the clinic days
 * within ±6 (VRA) / ±7 (LEA), each group nearest first, ties → the later day first:
 *   · VRA hub: up to 3 days at the preferred site, then the single nearest
 *     day elsewhere (max 4). No preferred-site day → the nearest 3.
 *   · LEA hub: the nearest 3.
 */
export function computeFuWindow(target, doctor, schedule, fns = {}, hub = "vra", opts = {}) {
  const W = fuWindowDays(hub);
  const doc = String(doctor || "").trim().toUpperCase();
  if (!doc || !target || !scheduleOk(schedule)) return null;
  const targetYmd = typeof target === "string" ? target : ymdOf(target);
  const byYmd = new Map();
  for (const d of schedule.days) if (d && typeof d.date === "string") byYmd.set(d.date, d);
  const tDay = byYmd.get(targetYmd);
  if (!tDay) return null;

  // Window days actually in the payload.
  const win = [];
  for (let off = -W; off <= W; off++) {
    const d = byYmd.get(addDaysYmd(targetYmd, off));
    if (d) win.push({ off, day: d });
  }
  // Doctor not on this hub's calendar at all in this window (no session at a
  // site this hub sees — Valeda included in VRA — and no vacation).
  //   · VRA hub → can't say anything → null (calculator unchanged).
  //   · LEA hub → the schedule DID load; the doctor simply has no LEA clinic
  //     within ±7 → { target, suggestions: [], offCalendar: true }, so the UI
  //     shows "No LEA clinic within a week — …" with NO calendar reason line
  //     (fuCalReason → null). Was null (silent calculator) before Oct 21 2026.
  //     The LEA hub only lists LEA surgeons, so this never fires for a doctor
  //     who doesn't work there.
  const known = win.some(({ day }) =>
    (Array.isArray(day.sessions) && day.sessions.some((s) => s && s.doctor === doc && hubSite(s.site, hub))) ||
    (Array.isArray(day.vacations) && day.vacations.some((v) => String(v).toUpperCase() === doc)));
  if (!known) {
    if (hubOf(hub) !== "lea") return null;
    return { target: evalFuDay(tDay, doc, fns, hub), suggestions: [], offCalendar: true };
  }

  const t = evalFuDay(tDay, doc, fns, hub);
  let suggestions = [];
  if (!t.clinic) {
    const pref = hubOf(hub) === "lea" ? null : String((opts && opts.preferSite) || "WORC").trim().toUpperCase();
    const cands = [];
    for (const { off, day } of win) {
      if (off === 0) continue;
      const e = evalFuDay(day, doc, fns, hub);
      if (!e.clinic) continue;
      cands.push({
        ymd: e.ymd, label: fuShortDate(e.ymd), site: e.site, half: e.half, codes: e.codes, segments: e.segments, note: e.note,
        delta: off, deltaText: fuDelta(off), preferred: !!pref && e.codes.includes(pref),
      });
    }
    const nearest = (a, b) => Math.abs(a.delta) - Math.abs(b.delta) || b.delta - a.delta;
    cands.sort(nearest);
    const preferred = cands.filter((c) => c.preferred);
    if (preferred.length) {
      const other = cands.find((c) => !c.preferred); // nearest non-preferred-site day
      suggestions = [...preferred.slice(0, 3), ...(other ? [other] : [])];
    } else {
      suggestions = cands.slice(0, 3);
    }
  }
  return { target: t, suggestions };
}

/** "Thu 1/21 WORC (+1 d)" / "Wed 1/27 LEOM AM (−4 d)" */
export const fuSuggestionText = (s) => `${s.label} ${s.site}${s.half ? ` ${s.half}` : ""} (${s.deltaText})`;

// ── Shared by the note page's F/U calculator and the homepage Call Board ──
// (Oct 2026) so the two counters can't drift.

/**
 * "N weeks from today" as "YYYY-MM-DD", or null for an empty / non-positive
 * entry. Today at local noon + N × 7 days — the same arithmetic both counters use.
 */
export function fuTargetYmdOf(weeks, now = new Date()) {
  const n = parseInt(weeks, 10);
  if (!weeks || !(n > 0)) return null;
  const today = new Date(now.getTime());
  today.setHours(12, 0, 0, 0);
  return ymdOf(new Date(today.getTime() + n * 7 * 24 * 60 * 60 * 1000));
}

/**
 * The doctor's preferred site right now (VRA hub): their non-LEX, non-Valeda
 * site for the current half of `todayYmd` in `schedule` (before 12:30 → AM,
 * else PM; that half empty → the other half; nothing today → null, and
 * computeFuWindow then defaults to WORC). Never throws.
 */
export function fuTodaySiteOf(schedule, doctor, todayYmd, now = new Date()) {
  try {
    const doc = String(doctor || "").trim().toUpperCase();
    if (!doc || !schedule || !Array.isArray(schedule.days)) return null;
    const day = schedule.days.find((d) => d && d.date === todayYmd);
    if (!day || !Array.isArray(day.sessions)) return null;
    const sessions = day.sessions.filter((s) => s && !/^(LEX|VALEDA)$/i.test(String(s.site || "")));
    const h = doctorHalves(sessions, doc);
    const half = now.getHours() * 60 + now.getMinutes() < 12 * 60 + 30 ? "AM" : "PM";
    const other = half === "AM" ? "PM" : "AM";
    return h[half][0] || h[other][0] || null;
  } catch {
    return null;
  }
}

/** First calendar reason (closed / vacation / no clinic) for a non-clinic target, else null. */
export function fuCalReason(win) {
  if (!win || !win.target || win.target.clinic || win.offCalendar) return null;
  return win.target.reasons.find((r) => r.code === "closed" || r.code === "vacation" || r.code === "noClinic") || null;
}

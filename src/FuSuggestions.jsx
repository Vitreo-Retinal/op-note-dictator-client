import { useState, useEffect, useRef } from "react";
import { fetchSchedule, scheduleOk, ymdOf } from "./lib/vraSchedule.js";
import { majorHoliday, injectionBlackout } from "./lib/practiceCalendar.js";
import { computeFuWindow, fuFetchRange, fuSiteName, fuTodaySiteOf } from "./lib/fuWindow.js";
import { T, SITE_TINTS } from "./theme.js";

// ── F/U clinic-day suggestions — shared (Oct 2026) ───────────────────
// One hook + the pill rendering behind BOTH "N weeks" counters: the Clinic
// Note Generator's F/U calculator and the homepage Call Board. Pure logic
// lives in ./lib/fuWindow.js (computeFuWindow etc.); this file only fetches
// the window and draws it, so the two pages can't drift.

const TIMEOUT_MS = 10000;
const timeoutReply = () => new Promise((resolve) => setTimeout(() => resolve({ configured: true, error: "timeout", days: [] }), TIMEOUT_MS));

/**
 * The F/U window for one doctor and target day, or null (no doctor, no target,
 * still loading, any error — callers then render exactly as before).
 *   doctor:     surgeon initials ("MR"), or "" / null
 *   targetYmd:  "YYYY-MM-DD" (fuTargetYmdOf) or null
 *   hub:        "vra" | "lea" — which sites count and the window size
 *   isBlocked:  optional (Date) => bool — the note page's MR personal blocks
 *   todaySched: optional /api/schedule payload that covers today (the Call
 *               Board's own load). Passed (even null while loading) → the
 *               1-day "today's site" fetch is never made; still loading or
 *               failed → no preference yet (computeFuWindow defaults to WORC).
 * One fetch per target (300 ms debounce while typing, cached per mount by
 * `from|days`, stale replies dropped, 10 s timeout). Fails silent.
 */
export function useFuWindow({ doctor, targetYmd, hub = "vra", isBlocked, todaySched } = {}) {
  const fuDoctor = doctor ? String(doctor).toUpperCase() : "";
  const fuRange = targetYmd ? fuFetchRange(targetYmd, hub) : null; // { from, days }
  // Cache / stale-check key: from + day count, so a 13-day (VRA) payload can
  // never stand in for a 15-day (LEA) request that happens to share `from`.
  const fuKey = fuRange ? `${fuRange.from}|${fuRange.days}` : null;
  const fuCacheRef = useRef(new Map()); // key → payload (good responses only)
  const [fuSched, setFuSched] = useState(null); // { key, data }
  useEffect(() => {
    if (!fuDoctor || !fuKey) return;
    const cached = fuCacheRef.current.get(fuKey);
    if (cached) { setFuSched({ key: fuKey, data: cached }); return; }
    let alive = true;
    const { from, days } = fuRange;
    const timer = setTimeout(() => {
      Promise.race([fetchSchedule(days, from), timeoutReply()])
        .then((data) => {
          if (!alive) return; // target changed meanwhile — ignore stale reply
          if (scheduleOk(data)) fuCacheRef.current.set(fuKey, data);
          setFuSched({ key: fuKey, data });
        })
        .catch(() => { /* fail silent */ });
    }, 300);
    return () => { alive = false; clearTimeout(timer); };
  }, [fuDoctor, fuKey]); // fuRange is a function of fuKey

  // ── Today's site → preferred site for suggestions (VRA hub only; Mari, Oct 19
  // 2026: "if I'm typing in Worcester (I'm only in Leominster on Wednesdays)
  // Worcester should be preferred"). One 1-day fetch per mount and doctor
  // (cached by doctor + date), 10 s timeout, fail silent → null, and the pure
  // layer then defaults to WORC. The LEA hub never prefers (only LEA counts).
  const fuTodayYmd = ymdOf(new Date());
  const vra = hub !== "lea";
  const callerToday = todaySched !== undefined; // the caller loads today itself
  const givenToday = vra && scheduleOk(todaySched) && todaySched.days.some((d) => d && d.date === fuTodayYmd) ? todaySched : null;
  const fuTodayKey = fuDoctor && vra && !callerToday ? `${fuDoctor}|${fuTodayYmd}` : null;
  const fuTodayRef = useRef(new Map()); // key → payload (good responses only)
  const [fuToday, setFuToday] = useState(null); // { key, data }
  useEffect(() => {
    if (!fuTodayKey) return;
    const cached = fuTodayRef.current.get(fuTodayKey);
    if (cached) { setFuToday({ key: fuTodayKey, data: cached }); return; }
    let alive = true;
    Promise.race([fetchSchedule(1, fuTodayYmd), timeoutReply()])
      .then((data) => {
        if (!alive || !scheduleOk(data)) return;
        fuTodayRef.current.set(fuTodayKey, data);
        setFuToday({ key: fuTodayKey, data });
      })
      .catch(() => { /* fail silent */ });
    return () => { alive = false; };
  }, [fuTodayKey]); // fuTodayYmd is part of the key
  const todayData = !fuDoctor || !vra ? null
    : givenToday || (fuTodayKey && fuToday && fuToday.key === fuTodayKey ? fuToday.data : null);
  const fuTodaySite = todayData ? fuTodaySiteOf(todayData, fuDoctor, fuTodayYmd, new Date()) : null;

  if (!fuDoctor || !targetYmd || !fuSched || fuSched.key !== fuKey) return null;
  try {
    return computeFuWindow(targetYmd, fuDoctor, fuSched.data, {
      holiday: majorHoliday,
      blackout: injectionBlackout,
      isBlocked: isBlocked || (() => false),
    }, hub, { preferSite: fuTodaySite });
  } catch {
    return null;
  }
}

// Site pills (Mari, Oct 19 2026) — each site code in the hub's site tint,
// consistent with the Call Board / schedule: LEOM yellow, WORC steel-blue
// (text in T.accentInk — SITE_TINTS.WORC.text is the muted gray, too faint
// for a pill). Other sites (LEA, UMass…) stay plain text.
export const fuPillStyle = (code) => {
  const tint = code === "WORC" || code === "LEOM" ? SITE_TINTS[code] : null;
  if (!tint) return undefined;
  return { background: tint.bg, color: code === "WORC" ? T.accentInk : tint.text, border: `1px solid ${tint.line}`, borderRadius: 6, padding: "0 5px", fontWeight: 600 };
};

/** A day's site as pill(s) + half: "[WORC]", "[LEOM] AM", "[WORC] AM / [LEOM] PM". */
export function FuSiteNodes({ segments }) {
  return (segments || []).map((g, i) => (
    <span key={i}>
      {i > 0 ? " / " : ""}
      {g.codes.map((c, j) => (
        <span key={c}>{j > 0 ? " + " : ""}<span style={fuPillStyle(c)}>{fuSiteName(c)}</span></span>
      ))}
      {g.half ? ` ${g.half}` : ""}
    </span>
  ));
}

/** "No clinic that day" in red; vacation / closed amber (Mari, Oct 19 2026). */
export const fuReasonColor = (reason) => (reason && reason.code === "noClinic" ? T.red : T.amber);

/**
 * Not a clinic day → "Nearest clinic days: Thu 1/21 [WORC] (+1 d) · …", or the
 * hub's nothing-nearby line. Render only when `win && !win.target.clinic`.
 */
export function FuSuggestions({ win, hub = "vra" }) {
  if (!win) return null;
  return win.suggestions.length > 0
    ? <><span style={{ color: T.muted }}>Nearest clinic days: </span>
        {win.suggestions.map((s, i) => (
          <span key={s.ymd}>{i > 0 ? " · " : ""}{s.label} <FuSiteNodes segments={s.segments} /> ({s.deltaText})</span>
        ))}</>
    : hub === "lea"
    ? <span style={{ color: T.amber }}>No LEA clinic within a week — the patient may need to see a partner.</span>
    : <span style={{ color: T.amber }}>No clinic day within ±6 days — check the schedule.</span>;
}

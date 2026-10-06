import { useState, useEffect } from "react";
import { majorHoliday, injectionBlackout } from "./lib/practiceCalendar.js";
import { fetchSchedule, scheduleOk, ymdOf, shortDate, sessionsBySite } from "./lib/vraSchedule.js";
import { S, T } from "./theme.js";
import { AlertIcon } from "./icons.jsx";

// ── Call Board — practice-wide, homepage header card (Sep 2026, per Mari) ─
// "Wire the call schedule somewhere in the front. Put the date on the site as
// well as which doctor is on call, and have the same f/u week counter and show
// the holidays and who is on call that week — so that everyone (techs, managers
// and doctors) can see it."
//
// Oct 2026: on-call, today's sites and the tech sheet now come from the shared
// "VRA" Google Calendar via the server's GET /api/schedule (secret ICS feed,
// read server-side). Replaces the old Supabase hub_call_schedule rotation.
// Deliberately practice-wide ONLY: no PIN, no surgeon-profile gating, and it
// never touches the personal doctor schedule. Fails soft: if the schedule is
// unavailable the card still shows the date, the F/U counter and the banner.


const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "Wednesday, Sep 16, 2026"
const longDate = (d) => `${DOW[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

export default function CallBoard({ onOpenSchedule }) {
  const [sched, setSched] = useState(null); // null = loading
  const [fuWeeks, setFuWeeks] = useState("");

  // Fetch once on mount. Never throws — a dead feed must never blank the card.
  useEffect(() => {
    let alive = true;
    fetchSchedule(14).then((data) => { if (alive) setSched(data); });
    return () => { alive = false; };
  }, []);

  const ok = scheduleOk(sched);
  const loading = sched === null;

  // Doctor on-call span whose [start, through] contains the date (inclusive).
  const callFor = (dateObj) => {
    if (!dateObj || !ok) return null;
    const ymd = ymdOf(dateObj);
    for (const s of sched.onCallSpans || []) {
      if (s.start <= ymd && ymd <= s.through) return s;
    }
    return null;
  };

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const todayHoliday = majorHoliday(today);
  const todayDay = ok ? sched.days.find((d) => d.date === ymdOf(today)) || null : null;
  const onCall = todayDay ? todayDay.onCall : null;

  const n = parseInt(fuWeeks, 10);
  const fuDate = fuWeeks && n > 0 ? new Date(today.getTime() + n * 7 * 24 * 60 * 60 * 1000) : null;
  const fuHoliday = fuDate ? majorHoliday(fuDate) : null;
  const fuCall = fuDate ? callFor(fuDate) : null;
  // Injection blackout banner — shown when TODAY or the computed F/U date is Jan 1–14.
  const blackout = injectionBlackout(fuDate) || injectionBlackout(today);

  const cell = { padding: "14px 18px", borderRight: `1px solid ${T.line}`, minWidth: 0 };
  const k = { fontSize: 12, color: T.muted, marginBottom: 2, fontFamily: T.sans };
  const v = { fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em", color: T.accent, fontFamily: T.sans };
  const sub = { fontSize: 13, color: T.muted, marginTop: 1, fontFamily: T.sans };
  const line = { fontSize: 12.5, color: T.ink2, fontFamily: T.sans, lineHeight: 1.45, marginTop: 1 };
  const unavailable = <div style={{ ...sub, marginTop: 2 }}>{loading ? "Loading…" : "Schedule unavailable"}</div>;

  const sites = todayDay ? sessionsBySite(todayDay.sessions) : [];
  const techs = todayDay ? todayDay.techs : null;
  const names = (arr) => (arr && arr.length ? arr.join(", ") : "—");

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ border: `1px solid ${T.line}`, borderRadius: T.rLg, background: T.surface, overflow: "hidden" }}>
        {/* Header row — today's date + practice holiday */}
        <div style={{ display: "flex", alignItems: "baseline", gap: "4px 12px", flexWrap: "wrap", padding: "10px 18px", borderBottom: `1px solid ${T.line}`, fontFamily: T.sans }}>
          <span style={{ fontSize: 12, color: T.muted }}>Call Board</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: T.ink, letterSpacing: "-0.01em" }}>{longDate(today)}</span>
          {todayHoliday && (
            <span style={{ fontSize: 13, color: T.amber }}>{todayHoliday} — office closed</span>
          )}
        </div>

        <div className="vra-callband" style={{ display: "grid", gridTemplateColumns: "minmax(160px, 0.8fr) 1.2fr 1.25fr minmax(200px, 1fr)" }}>
          {/* Cell 1 — who's on call this week */}
          <div style={cell}>
            <div style={k}>On call this week</div>
            {ok ? (
              <>
                <div style={{ ...v, color: onCall && onCall.doctor ? T.accent : T.muted }}>
                  {onCall && onCall.doctor ? onCall.doctor : "—"}
                </div>
                {onCall && onCall.tech && <div style={sub}>Tech: {onCall.tech}</div>}
                {onCall && onCall.doctorThrough && <div style={{ ...sub, whiteSpace: "nowrap" }}>Through {shortDate(onCall.doctorThrough)}</div>}
              </>
            ) : unavailable}
          </div>

          {/* Cell 2 — where each doctor is today */}
          <div style={cell}>
            <div style={k}>Today</div>
            {!ok ? unavailable : (
              <div style={{ marginTop: 2 }}>
                {todayDay && todayDay.closed && (
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: T.amber, fontFamily: T.sans }}>
                    Closed{todayDay.closureName ? ` — ${todayDay.closureName}` : ""}
                  </div>
                )}
                {sites.map(({ site, docs }) => {
                  const who = docs.map((d) => d.doctor + (d.half ? `(${d.half})` : "")).join(" · ");
                  return (
                    <div key={site} style={{ ...line, display: "flex", gap: 8 }}>
                      <span style={{ width: 52, flexShrink: 0, color: T.muted, fontWeight: 500 }}>{site}</span>
                      <span style={{ color: T.ink, fontWeight: 500, minWidth: 0 }}>{who}</span>
                    </div>
                  );
                })}
                {!sites.length && !(todayDay && todayDay.closed) && (
                  <div style={{ ...sub, marginTop: 0 }}>No clinic sessions</div>
                )}
                {todayDay && todayDay.vacations.length > 0 && (
                  <div style={{ ...line, color: T.muted }}>Out: {todayDay.vacations.join(", ")}</div>
                )}
              </div>
            )}
          </div>

          {/* Cell 3 — techs today (from the daily tech sheet) */}
          <div style={cell}>
            <div style={{ ...k, display: "flex", alignItems: "baseline", gap: 8 }}>
              <span>Techs today</span>
              {ok && onOpenSchedule && (
                <button onClick={onOpenSchedule}
                  style={{ marginLeft: "auto", background: "none", border: "none", padding: 0, cursor: "pointer", color: T.accent, fontFamily: T.sans, fontSize: 12, fontWeight: 500 }}>
                  Full sheet
                </button>
              )}
            </div>
            {!ok ? unavailable : techs ? (
              <div style={{ marginTop: 2 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink, fontFamily: T.sans, marginBottom: 1 }}>{techs.headline}</div>
                <div style={line}>
                  Back AM: {names(techs.worcesterBackAM)} / Back PM: {names(techs.worcesterBackPM)}
                </div>
                {((techs.leominsterBackAM || []).length > 0 || (techs.leominsterBackPM || []).length > 0) && (
                  <div style={line}>
                    Leominster: AM {names(techs.leominsterBackAM)}{(techs.leominsterBackPM || []).length > 0 ? ` / PM ${names(techs.leominsterBackPM)}` : ""}
                  </div>
                )}
                {techs.off && techs.off.length > 0 && (
                  <div style={{ ...line, color: T.muted }}>Off: {techs.off.join(", ")}</div>
                )}
              </div>
            ) : (
              <div style={{ ...sub, marginTop: 2 }}>No tech sheet today</div>
            )}
          </div>

          {/* Cell 4 — F/U week counter */}
          <div style={{ ...cell, borderRight: 0 }}>
            <div style={k}>Follow-up counter</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
              <span style={{ fontSize: 13, color: T.muted, fontFamily: T.sans }}>F/U in</span>
              <input
                type="number"
                min="1"
                max="104"
                value={fuWeeks}
                onChange={(e) => setFuWeeks(e.target.value)}
                placeholder="—"
                className="vra-input"
                style={{ width: 56, height: 30, boxSizing: "border-box", background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.r, padding: "0 8px", color: T.ink, fontFamily: T.sans, fontSize: 13, textAlign: "center", outline: "none" }}
              />
              <span style={{ fontSize: 13, color: T.muted, fontFamily: T.sans }}>weeks</span>
            </div>
            {fuDate && (
              <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{ fontSize: 15, color: fuHoliday ? T.amber : T.ink, fontFamily: T.sans, fontWeight: 600, letterSpacing: "-0.01em" }}>
                  {longDate(fuDate)}
                </span>
                {fuHoliday && (
                  <span style={{ fontSize: 12.5, color: T.amber, fontFamily: T.sans }}>
                    ⚠ {fuHoliday} — office closed
                  </span>
                )}
                {fuCall ? (
                  <span style={{ fontSize: 12.5, color: T.muted, fontFamily: T.sans }}>
                    (on call that week: {fuCall.doctor})
                  </span>
                ) : (
                  // The calendar's call rotation is only posted a few months
                  // out — this is the normal state for far-out dates. Keep it
                  // quiet, not alarming.
                  <span style={{ fontSize: 12, color: T.muted, fontFamily: T.sans, opacity: 0.8 }}>
                    call schedule not posted for that week
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Injection blackout banner — first two weeks of January (per Mari, Sep 2026) */}
      {blackout && (
        <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "flex-start", background: T.redSoft, border: "1px solid #F0C4BF", borderRadius: T.r, padding: "10px 14px", fontSize: 13, color: T.red, fontFamily: T.sans, fontWeight: 600 }}>
          <span style={{ marginTop: 1 }}><AlertIcon /></span><span>{blackout}</span>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";
import { majorHoliday, parseLocalNoon, injectionBlackout } from "./lib/practiceCalendar.js";
import { S, T } from "./theme.js";
import { AlertIcon } from "./icons.jsx";

// ── Call Board — practice-wide, homepage header card (Sep 2026, per Mari) ─
// "Wire the call schedule somewhere in the front. Put the date on the site as
// well as which doctor is on call, and have the same f/u week counter and show
// the holidays and who is on call that week — so that everyone (techs, managers
// and doctors) can see it."
//
// Deliberately practice-wide ONLY: hub_call_schedule (anon-callable rotation)
// plus the shared closure calendar. NO auth, NO PIN, NO surgeon-profile gating,
// and it never touches hub_surgeon_schedule — the personal schedule stays in the
// doctor space. Fails silent: if the RPC dies the card still shows the date and
// the F/U counter.


const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "Wednesday, Sep 16, 2026"
const longDate = (d) => `${DOW[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

export default function CallBoard() {
  const [callSchedule, setCallSchedule] = useState([]);
  const [fuWeeks, setFuWeeks] = useState("");

  // Fetch once on mount. Fail silent — a dead RPC must never blank the card.
  useEffect(() => {
    let alive = true;
    supabase
      .rpc("hub_call_schedule")
      .then(({ data, error }) => { if (alive && !error) setCallSchedule(data || []); })
      .catch(() => { /* fail silent */ });
    return () => { alive = false; };
  }, []);

  // First rotation row whose [start_date, end_date] contains the date (inclusive).
  const callFor = (dateObj) => {
    if (!dateObj) return null;
    const t = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 12).getTime();
    for (const r of callSchedule || []) {
      const s = parseLocalNoon(r.start_date);
      const e = parseLocalNoon(r.end_date);
      if (s && e && t >= s.getTime() && t <= e.getTime()) return r;
    }
    return null;
  };

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const todayCall = callFor(today);
  const todayHoliday = majorHoliday(today);

  const n = parseInt(fuWeeks, 10);
  const fuDate = fuWeeks && n > 0 ? new Date(today.getTime() + n * 7 * 24 * 60 * 60 * 1000) : null;
  const fuHoliday = fuDate ? majorHoliday(fuDate) : null;
  const fuCall = fuDate ? callFor(fuDate) : null;
  // Injection blackout banner — shown when TODAY or the computed F/U date is Jan 1–14.
  const blackout = injectionBlackout(fuDate) || injectionBlackout(today);

  // Display-only: the rotation row's last day, for the "through …" sub-line.
  const callThrough = todayCall ? parseLocalNoon(todayCall.end_date) : null;

  const cell = { padding: "14px 18px", borderRight: `1px solid ${T.line}`, minWidth: 0 };
  const k = { fontSize: 12, color: T.muted, marginBottom: 2, fontFamily: T.sans };
  const v = { fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em", color: T.accent, fontFamily: T.sans };
  const sub = { fontSize: 13, color: T.muted, marginTop: 1, fontFamily: T.sans };

  return (
    <div style={{ marginTop: 24 }}>
      <div className="vra-callband" style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr", border: `1px solid ${T.line}`, borderRadius: T.rLg, background: T.surface, overflow: "hidden" }}>
        {/* Cell 1 — who's on call this week */}
        <div style={cell}>
          <div style={k}>On call this week</div>
          <div style={{ ...v, color: todayCall ? T.accent : T.muted }}>
            {todayCall ? todayCall.surgeon_id : "—"}
          </div>
          {callThrough && <div style={sub}>Through {longDate(callThrough)}</div>}
        </div>

        {/* Cell 2 — F/U week counter */}
        <div style={cell}>
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
                  (on call that week: {fuCall.surgeon_id})
                </span>
              ) : (
                // Rotation is only posted through early Jan 2027 — this is the
                // normal state for far-out dates. Keep it quiet, not alarming.
                <span style={{ fontSize: 12, color: T.muted, fontFamily: T.sans, opacity: 0.8 }}>
                  call schedule not posted for that week
                </span>
              )}
            </div>
          )}
        </div>

        {/* Cell 3 — today's date + closure, if today is a practice holiday */}
        <div style={{ ...cell, borderRight: 0 }}>
          <div style={k}>Call Board</div>
          <div style={{ ...v, fontSize: 15, color: T.ink }}>{longDate(today)}</div>
          {todayHoliday && (
            <div style={{ ...sub, color: T.amber }}>
              {todayHoliday} — office closed
            </div>
          )}
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

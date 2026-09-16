import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";
import { majorHoliday, parseLocalNoon, injectionBlackout } from "./lib/practiceCalendar.js";

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

const S = {
  bg: "#0f172a",
  card: "#1e293b",
  border: "#334155",
  muted: "#64748b",
  text: "#e2e8f0",
  bright: "#f1f5f9",
  green: "#4ade80",
  amber: "#f59e0b",
  font: "Georgia, serif",
  mono: "monospace",
};

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

  return (
    <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
      <div style={{ fontSize: "0.62rem", color: S.muted, fontFamily: S.mono, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
        Call Board
      </div>

      {/* Line 1 — today's date + who's on call */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <span style={{ fontSize: "0.95rem", fontWeight: 700, color: S.bright, fontFamily: S.font }}>
          {longDate(today)}
        </span>
        <span style={{ fontSize: "0.82rem", color: todayCall ? S.green : S.muted, fontFamily: S.mono, fontWeight: 700 }}>
          On call: {todayCall ? todayCall.surgeon_id : "—"}
        </span>
        {todayHoliday && (
          <span style={{ fontSize: "0.72rem", color: S.amber, fontFamily: S.mono }}>
            · {todayHoliday} — office closed
          </span>
        )}
      </div>

      {/* Line 2 — F/U week counter */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.78rem", color: S.muted, fontFamily: S.mono }}>F/U in</span>
        <input
          type="number"
          min="1"
          max="104"
          value={fuWeeks}
          onChange={(e) => setFuWeeks(e.target.value)}
          placeholder="—"
          style={{ width: 52, background: S.bg, border: `1px solid ${S.border}`, borderRadius: 6, padding: "4px 8px", color: S.text, fontFamily: S.mono, fontSize: "0.82rem", textAlign: "center" }}
        />
        <span style={{ fontSize: "0.78rem", color: S.muted, fontFamily: S.mono }}>weeks</span>

        {fuDate && (
          <>
            <span style={{ fontSize: "0.82rem", color: fuHoliday ? S.amber : S.green, fontFamily: S.mono, fontWeight: 700 }}>
              {longDate(fuDate)}
            </span>
            {fuHoliday && (
              <span style={{ fontSize: "0.72rem", color: S.amber, fontFamily: S.mono }}>
                ⚠ {fuHoliday} — office closed
              </span>
            )}
            {fuCall ? (
              <span style={{ fontSize: "0.72rem", color: S.muted, fontFamily: S.mono }}>
                (on call that week: {fuCall.surgeon_id})
              </span>
            ) : (
              // Rotation is only posted through early Jan 2027 — this is the
              // normal state for far-out dates. Keep it quiet, not alarming.
              <span style={{ fontSize: "0.68rem", color: S.muted, fontFamily: S.mono, opacity: 0.8 }}>
                call schedule not posted for that week
              </span>
            )}
          </>
        )}
      </div>

      {/* Injection blackout banner — first two weeks of January (per Mari, Sep 2026) */}
      {blackout && (
        <div style={{ marginTop: 10, background: "#450a0a", border: "1px solid #ef4444", borderRadius: 8, padding: "8px 12px", fontSize: "0.78rem", color: "#fecaca", fontFamily: S.mono, fontWeight: 700 }}>
          🚫 {blackout}
        </div>
      )}
    </div>
  );
}

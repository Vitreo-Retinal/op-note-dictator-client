import { useState, useEffect, Fragment } from "react";
import PageBar, { wrap } from "./PageBar.jsx";
import { T, card } from "./theme.js";
import { AlertIcon, ChevronRightIcon, ChevronDownIcon } from "./icons.jsx";
import {
  fetchSchedule, scheduleOk, ymdOf, dateOfYmd, monDay, bySiteOrder, sessionsBySite,
} from "./lib/vraSchedule.js";

// ── Schedule — 2-week grid from the shared VRA Google Calendar (Oct 2026) ─
// Who is where (AM/PM by site), on call, out, closures, and the daily tech
// sheet. Practice-wide, no PIN. Data: server GET /api/schedule (secret ICS
// feed read server-side). Read-only.

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Monday (YYYY-MM-DD) of the week containing ymd.
function mondayOf(ymd) {
  const d = dateOfYmd(ymd);
  const back = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - back);
  return ymdOf(d);
}

// "BKH" or "BKH · FJM from Fri" when the rotation hands off mid-week.
function rotationLabel(days, key) {
  const runs = [];
  for (const d of days) {
    const who = d.onCall ? d.onCall[key] : null;
    if (!who) continue;
    if (!runs.length || runs[runs.length - 1].who !== who) runs.push({ who, from: d });
  }
  if (!runs.length) return null;
  return runs.map((r, i) => (i === 0 ? r.who : `${r.who} from ${DOW[dateOfYmd(r.from.date).getDay()]}`)).join(" · ");
}

export default function SchedulePage({ onBack }) {
  const [sched, setSched] = useState(null); // null = loading
  const [openTech, setOpenTech] = useState(null); // date whose full tech sheet is open

  useEffect(() => {
    let alive = true;
    fetchSchedule(14).then((data) => { if (alive) setSched(data); });
    return () => { alive = false; };
  }, []);

  const ok = scheduleOk(sched);
  const todayYmd = ymdOf(new Date());

  // Weekends only when they carry sessions or a closure.
  const shown = ok
    ? sched.days.filter((d) => {
      const dow = dateOfYmd(d.date).getDay();
      return (dow !== 0 && dow !== 6) || d.sessions.length > 0 || d.closed;
    })
    : [];

  // Site columns present anywhere in the 2 weeks, fixed order (unknown sites last).
  const sites = ok
    ? [...new Set(sched.days.flatMap((d) => d.sessions.map((s) => s.site)))].sort(bySiteOrder)
    : [];

  // Group shown days into weeks; the header uses ALL days of that week in range.
  const weeks = [];
  for (const d of shown) {
    const wk = mondayOf(d.date);
    if (!weeks.length || weeks[weeks.length - 1].monday !== wk) weeks.push({ monday: wk, days: [] });
    weeks[weeks.length - 1].days.push(d);
  }
  const weekAll = (monday) => (ok ? sched.days.filter((d) => mondayOf(d.date) === monday) : []);

  const th = { padding: "8px 10px", fontSize: 12, color: T.muted, fontWeight: 500, textAlign: "left", background: T.paper, borderBottom: `1px solid ${T.line}`, whiteSpace: "nowrap" };
  const td = { padding: "8px 10px", verticalAlign: "top", borderTop: `1px solid ${T.line}` };
  const chipS = (tone) => {
    const m = {
      accent: [T.accentSoft, T.accent],
      amber: [T.amberSoft, T.amber],
      muted: [T.paper, T.muted],
    }[tone];
    return { display: "inline-block", padding: "1px 7px", borderRadius: 999, background: m[0], color: m[1], fontSize: 12.5, fontWeight: 600, fontFamily: T.sans, whiteSpace: "nowrap", lineHeight: 1.6 };
  };
  const names = (arr) => (arr && arr.length ? arr.join(", ") : "—");
  const updated = ok && sched.generatedAt
    ? new Date(sched.generatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : null;
  const colCount = 1 + sites.length;

  return (
    <div style={{ minHeight: "100vh", background: T.paper, color: T.ink, fontFamily: T.sans }}>
      <PageBar onBack={onBack} backLabel="Hub" title="Schedule" sub="VRA calendar · next 2 weeks" />

      <div className="vra-wrap" style={wrap({ paddingTop: 24, paddingBottom: 40 })}>
        {/* Loading — 3 skeleton rows */}
        {sched === null && (
          <div style={card({ padding: 14, display: "flex", flexDirection: "column", gap: 10 })}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ height: 36, borderRadius: T.r, background: T.paper }} />
            ))}
          </div>
        )}

        {/* Error / not configured */}
        {sched !== null && !ok && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 14px", borderRadius: T.r, fontSize: 13, border: `1px solid ${T.goldSoft}`, background: T.amberSoft, color: T.amber }}>
            <span style={{ marginTop: 1 }}><AlertIcon /></span>
            <span>Schedule unavailable — check the calendar link on the server.</span>
          </div>
        )}

        {ok && weeks.map((w) => {
          const all = weekAll(w.monday);
          const doc = rotationLabel(all, "doctor");
          const tech = rotationLabel(all, "tech");
          return (
            <div key={w.monday} style={{ marginBottom: 20 }}>
              {/* Week header strip */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 8px", alignItems: "baseline", margin: "0 0 8px", fontSize: 13, color: T.muted }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: T.accent }}>Week of {monDay(w.monday)}</span>
                {doc && <span>· On call <b style={{ color: T.ink, fontWeight: 600 }}>{doc}</b></span>}
                {tech && <span>· Tech <b style={{ color: T.ink, fontWeight: 600 }}>{tech}</b></span>}
              </div>

              <div className="vra-table" style={card({ overflowX: "auto" })}>
                <table style={{ width: "100%", minWidth: 112 + sites.length * 96, tableLayout: "fixed", borderCollapse: "collapse", fontFamily: T.sans }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, width: 112 }}>Day</th>
                      {sites.map((s) => <th key={s} style={th}>{s}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {w.days.map((d) => {
                      const dt = dateOfYmd(d.date);
                      const isToday = d.date === todayYmd;
                      const bySite = Object.fromEntries(sessionsBySite(d.sessions).map((x) => [x.site, x.docs]));
                      const t = d.techs;
                      const open = openTech === d.date;
                      const Chev = open ? ChevronDownIcon : ChevronRightIcon;
                      return (
                        <Fragment key={d.date}>
                          <tr>
                            <td style={{ ...td, background: isToday ? T.accentSoft : "transparent" }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: isToday ? T.accent : T.ink, whiteSpace: "nowrap" }}>
                                {DOW[dt.getDay()]} {dt.getDate()}
                              </div>
                              {(d.closed || d.vacations.length > 0) && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                                  {d.closed && <span style={{ ...chipS("amber"), fontSize: 11.5 }}>Closed{d.closureName ? ` · ${d.closureName}` : ""}</span>}
                                  {d.vacations.length > 0 && <span style={{ ...chipS("muted"), fontSize: 11.5, fontWeight: 500 }}>Out: {d.vacations.join(", ")}</span>}
                                </div>
                              )}
                            </td>
                            {sites.map((s) => (
                              <td key={s} style={td}>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                  {(bySite[s] || []).map((x) => (
                                    <span key={x.doctor} style={chipS("accent")}>{x.doctor}{x.half ? `·${x.half}` : ""}</span>
                                  ))}
                                </div>
                              </td>
                            ))}
                          </tr>
                          {t && (
                            <tr>
                              <td colSpan={colCount} style={{ padding: 0, background: T.paper, borderTop: `1px solid ${T.line}` }}>
                                <button onClick={() => setOpenTech(open ? null : d.date)} aria-expanded={open}
                                  style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", textAlign: "left", background: "none", border: "none", padding: "6px 10px", cursor: "pointer", fontFamily: T.sans, fontSize: 12.5, color: T.ink2, minWidth: 0, position: "sticky", left: 0, maxWidth: "calc(100vw - 34px)", boxSizing: "border-box" }}>
                                  <span style={{ color: T.muted }}><Chev size={14} /></span>
                                  <span style={{ fontWeight: 600, color: T.ink, whiteSpace: "nowrap" }}>Techs · {t.headline}</span>
                                  <span style={{ color: T.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>
                                    — Back AM: {names(t.worcesterBackAM)} / Back PM: {names(t.worcesterBackPM)}
                                  </span>
                                </button>
                                {open && (
                                  <div style={{ padding: "2px 14px 12px 30px", fontSize: 12.5, lineHeight: 1.55, color: T.ink2, whiteSpace: "pre-wrap", fontFamily: T.sans, position: "sticky", left: 0, maxWidth: "calc(100vw - 34px)", boxSizing: "border-box" }}>
                                    {t.text}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {ok && (
          <p style={{ color: T.muted, fontSize: 12, margin: "8px 0 0" }}>
            {updated ? `Updated ${updated} · ` : ""}source: VRA Google Calendar
          </p>
        )}
      </div>
    </div>
  );
}

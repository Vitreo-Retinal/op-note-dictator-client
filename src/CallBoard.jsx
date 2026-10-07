import { useState, useEffect, Fragment } from "react";
import { majorHoliday, injectionBlackout } from "./lib/practiceCalendar.js";
import { fetchSchedule, scheduleOk, ymdOf, shortDate, sessionsBySite, techBack, translatorOf, managersOf } from "./lib/vraSchedule.js";
import { T, SITE_TINTS, TRANSLATOR, doctorColor } from "./theme.js";
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

// Doctor chip — soft background, doctor-colored initials, tiny AM/PM when half-day.
export function DocChip({ doctor, half, size = "sm" }) {
  const c = doctorColor(doctor);
  const sm = size === "sm";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", height: sm ? 20 : 22, padding: sm ? "0 6px" : "0 8px", borderRadius: 5, background: c.soft, color: c.fg, fontSize: sm ? 11.5 : 12, fontWeight: 600, fontFamily: T.sans, whiteSpace: "nowrap", flex: "none" }}>
      {doctor}
      {half && <small style={{ fontSize: sm ? 9.5 : 10.5, fontWeight: 500, opacity: 0.75, marginLeft: sm ? 2 : 3 }}>{half}</small>}
    </span>
  );
}

// Managers line (Oct 2026): "Managers  Aundrea · WORC · Brittany · LEOM ext. 1234".
// One line, never wraps; vacation in amber, out muted. `extra` (optional)
// renders after each manager's text, e.g. a muted "(vacation from Thu)".
export function ManagersLine({ managers, extra, style, labelStyle }) {
  if (!managers || !managers.length) return null;
  const tone = { in: T.ink2, vacation: T.amber, out: T.muted };
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: T.sans, fontSize: 12.5, minWidth: 0, ...style }}>
      <span style={{ fontSize: 12, color: T.muted, flex: "none", ...labelStyle }}>Managers</span>
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
        {managers.map((m, i) => (
          <Fragment key={m.name}>
            {i > 0 && <span style={{ color: T.lineStrong }}> · </span>}
            <span style={{ color: tone[m.tone] || T.ink2, fontWeight: m.tone === "vacation" ? 600 : 500 }}>{m.text}</span>
            {extra && extra[m.name] && <span style={{ color: T.muted, fontSize: 12 }}> {extra[m.name]}</span>}
          </Fragment>
        ))}
      </span>
    </div>
  );
}

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

  const sites = todayDay ? sessionsBySite(todayDay.sessions) : [];
  const techs = todayDay ? todayDay.techs : null;
  const managers = todayDay ? managersOf(todayDay) : [];

  // Mockup .band styles
  const cell = { padding: "12px 16px", borderRight: `1px solid ${T.line}`, minWidth: 0, overflow: "hidden" };
  const k = { fontSize: 12, color: T.muted, marginBottom: 3, fontFamily: T.sans, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 };
  const sub = { fontSize: 12.5, color: T.muted, marginTop: 2, fontFamily: T.sans };
  const unavailable = <div style={sub}>{loading ? "Loading…" : "Schedule unavailable"}</div>;
  const rowS = { display: "flex", alignItems: "center", gap: 3, margin: "1px 0", flexWrap: "nowrap", whiteSpace: "nowrap", minWidth: 0 };
  const stS = { fontSize: 11.5, color: T.muted, width: 48, fontWeight: 500, flex: "none", fontFamily: T.sans };

  // Techs grid (site | role | names): AM / PM with a slash separator.
  const sep = <span style={{ color: T.lineStrong }}> / </span>;
  const nm = (arr) => <b style={{ fontWeight: 600, color: T.accent }}>{arr && arr.length ? arr.join(" · ") : "—"}</b>;
  const tCell = (bg, first, last, extra = {}) => ({
    background: bg, padding: "2px 6px", whiteSpace: "nowrap", lineHeight: "18px", fontSize: 12.5, color: T.ink2, fontFamily: T.sans,
    borderRadius: first ? "4px 0 0 4px" : last ? "0 4px 4px 0" : 0, ...extra,
  });
  const tLine = (key, bg, siteLabel, role, names, labelColor) => (
    <Fragment key={key}>
      <span style={tCell(bg, true, false, { fontSize: 11.5, fontWeight: 600, color: labelColor || T.muted, minWidth: 44 })}>{siteLabel}</span>
      <span style={tCell(bg, false, false, { color: T.muted })}>{role}</span>
      <span style={tCell(bg, false, true, { overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 })}>{names}</span>
    </Fragment>
  );
  const techLines = [];
  if (techs) {
    for (const site of ["WORC", "LEOM"]) {
      const am = techBack(techs, site, "AM"), pm = techBack(techs, site, "PM");
      if (!am.length && !pm.length) continue;
      techLines.push(tLine(site, SITE_TINTS[site].bg, site, "Back", <>{nm(am)}{sep}{nm(pm)}</>));
    }
    const tr = translatorOf(techs);
    if (tr) {
      techLines.push(tLine("tr", TRANSLATOR.bg, "Translator", "",
        tr.raw ? tr.raw : tr.same ? `${tr.am} all day` : <>{tr.am}{sep}{tr.pm}</>, TRANSLATOR.fg));
    }
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ border: `1px solid ${T.line}`, borderRadius: T.rLg, background: T.surface, overflow: "hidden" }}>
        {/* Header row — today's date + practice holiday · F/U counter on the right */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px 10px", flexWrap: "wrap", padding: "8px 16px", borderBottom: `1px solid ${T.line}`, fontFamily: T.sans, fontSize: 12.5, color: T.muted }}>
          <span>Call Board</span>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>{longDate(today)}</span>
          {todayHoliday && (
            <span style={{ color: T.amber }}>{todayHoliday} — office closed</span>
          )}
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "4px 6px", flexWrap: "wrap", color: T.ink2 }}>
            <span style={{ marginRight: 4 }}>Follow-up counter</span>
            <span>F/U in</span>
            <input
              type="number"
              min="1"
              max="104"
              value={fuWeeks}
              onChange={(e) => setFuWeeks(e.target.value)}
              placeholder="—"
              aria-label="Follow-up in weeks"
              className="vra-input"
              style={{ width: 52, height: 26, boxSizing: "border-box", background: T.surface, border: `1px solid ${T.line}`, borderRadius: 5, padding: "0 6px", color: T.ink, fontFamily: T.sans, fontSize: 12.5, textAlign: "center", outline: "none" }}
            />
            <span>weeks</span>
            {fuDate && (
              <>
                <span style={{ fontWeight: 600, color: fuHoliday ? T.amber : T.ink, whiteSpace: "nowrap" }}>→ {longDate(fuDate)}</span>
                {fuHoliday && <span style={{ color: T.amber }}>⚠ {fuHoliday} — office closed</span>}
                {fuCall ? (
                  <span style={{ color: T.muted }}>(on call that week: {fuCall.doctor})</span>
                ) : (
                  // The calendar's call rotation is only posted a few months
                  // out — this is the normal state for far-out dates. Keep it
                  // quiet, not alarming.
                  <span style={{ fontSize: 12, color: T.muted, opacity: 0.8 }}>call schedule not posted for that week</span>
                )}
              </>
            )}
          </span>
        </div>

        <div className="vra-callband" style={{ display: "grid", gridTemplateColumns: ".7fr 1.6fr 2fr" }}>
          {/* Cell 1 — who's on call */}
          <div style={cell}>
            <div style={k}><span>On call</span></div>
            {ok ? (
              <>
                <div style={{ fontSize: 17, fontWeight: 600, fontFamily: T.sans, color: onCall && onCall.doctor ? doctorColor(onCall.doctor).fg : T.muted }}>
                  {onCall && onCall.doctor ? onCall.doctor : "—"}
                </div>
                {onCall && onCall.tech && <div style={sub}>Tech: {onCall.tech}</div>}
                {onCall && onCall.doctorThrough && <div style={{ ...sub, whiteSpace: "nowrap" }}>Through {shortDate(onCall.doctorThrough)}</div>}
              </>
            ) : unavailable}
          </div>

          {/* Cell 2 — where each doctor is today; one row per site, never wraps */}
          <div style={cell}>
            <div style={k}><span>Today</span></div>
            {!ok ? unavailable : (
              <div>
                {todayDay && todayDay.closed && (
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: T.amber, fontFamily: T.sans, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Closed{todayDay.closureName ? ` — ${todayDay.closureName}` : ""}
                  </div>
                )}
                {sites.map(({ site, docs }) => (
                  <div key={site} style={rowS}>
                    <span style={stS}>{site}</span>
                    {docs.map((d) => <DocChip key={d.doctor} doctor={d.doctor} half={d.half} />)}
                  </div>
                ))}
                {!sites.length && !(todayDay && todayDay.closed) && (
                  <div style={sub}>No clinic sessions</div>
                )}
                {todayDay && todayDay.vacations.length > 0 && (
                  <div style={{ ...sub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Out: {todayDay.vacations.join(", ")}</div>
                )}
              </div>
            )}
          </div>

          {/* Cell 3 — techs today (from the daily tech sheet) */}
          <div style={{ ...cell, borderRight: 0 }}>
            <div style={k}>
              <span>Techs today</span>
              {ok && onOpenSchedule && (
                <button onClick={onOpenSchedule}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: T.accent, fontFamily: T.sans, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}>
                  Full board ›
                </button>
              )}
            </div>
            {!ok ? unavailable : techs ? (
              <>
                {techLines.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "auto auto minmax(0, 1fr)", marginLeft: -6, rowGap: 3, marginTop: 2 }}>
                    {techLines}
                  </div>
                )}
                <div style={{ ...sub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {techs.headline ? `${techs.headline} · ` : ""}AM / PM
                </div>
              </>
            ) : (
              <div style={sub}>No tech sheet today</div>
            )}
          </div>
        </div>

        {/* Managers — one line under the band, starting under On call */}
        {managers.length > 0 && (
          <ManagersLine managers={managers} style={{ padding: "7px 16px", borderTop: `1px solid ${T.line}` }} />
        )}
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

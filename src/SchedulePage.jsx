import { useState, useEffect, Fragment } from "react";
import PageBar, { wrap, segWrap, segBtn } from "./PageBar.jsx";
import { DocChip } from "./CallBoard.jsx";
import { T, card, DOCTOR_ORDER, SITE_TINTS, doctorColor } from "./theme.js";
import { AlertIcon } from "./icons.jsx";
import { usePhone } from "./phone.jsx";
import SchedulePhone, { nextTiles } from "./SchedulePhone.jsx";
import {
  fetchSchedule, scheduleOk, ymdOf, dateOfYmd, monDay, shortDate, bySiteOrder, sessionsBySite,
  doctorHalves, translatorOf,
} from "./lib/vraSchedule.js";

// ── Schedule — 2-week view from the shared VRA Google Calendar (Oct 2026) ─
// Doctors view (default): one row per doctor, Mon–Fri columns, site per cell.
// By-site view: days × sites with doctor chips. Below both: the role-first
// tech board for one day. Practice-wide, no PIN. Data: server GET
// /api/schedule (secret ICS feed read server-side). Read-only.

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TODAY_TINT = "#F3F7FA";
const NONE = T.lineStrong; // "—" in empty tech cells

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
  return runs.map((r, i) => ({ who: r.who, from: i === 0 ? null : DOW[dateOfYmd(r.from.date).getDay()] }));
}

// "Day 6" header label
const dayLabel = (ymd) => { const d = dateOfYmd(ymd); return `${DOW[d.getDay()]} ${d.getDate()}`; };

// Tech-board rows, in order. `always` rows show even when empty.
const TECH_ROWS = [
  { key: "back", label: "Back", always: true },
  { key: "workup", label: "Work-up", always: true },
  { key: "phone", label: "Phone", always: true },
  { key: "admin", label: "Admin", always: true },
  { key: "imaging", label: "OCT / FP" },
  { key: "research", label: "Research" },
  { key: "other", label: "Other" },
];

// Date picker: reloads the schedule starting on the picked date. "Today" resets.
function DatePick({ from, todayYmd, onChange, phone }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input type="date" value={from} aria-label="Schedule start date" className="vra-input"
        onChange={(e) => { if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) onChange(e.target.value); }}
        style={{ height: phone ? 38 : 32, padding: "0 8px", background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.r, color: T.ink, fontFamily: T.sans, fontSize: phone ? 16 : 13, outline: "none", boxSizing: "border-box", minWidth: 0 }} />
      <button onClick={() => onChange(todayYmd)} disabled={from === todayYmd}
        style={{ height: phone ? 38 : 32, padding: "0 12px", background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.r, color: from === todayYmd ? T.muted : T.accent, fontFamily: T.sans, fontSize: 13, fontWeight: 500, cursor: from === todayYmd ? "default" : "pointer", whiteSpace: "nowrap" }}>
        Today
      </button>
    </div>
  );
}

export default function SchedulePage({ onBack }) {
  const { phone } = usePhone();
  const todayYmd = ymdOf(new Date());
  const [from, setFrom] = useState(todayYmd); // first day shown (date picker)
  // Phone: the date the next-day tiles count from (date input / Today), the
  // tiles themselves (kept while a tile's day loads), and open tech folds.
  const [anchor, setAnchor] = useState(todayYmd);
  const [tiles, setTiles] = useState(null);
  const [openFolds, setOpenFolds] = useState(() => new Set());
  const pickDate = (v) => { setAnchor(v); setTiles(null); setFrom(v); };
  const toggleFold = (id) => setOpenFolds((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const [sched, setSched] = useState(null); // null = loading
  const [view, setView] = useState("doctors"); // "doctors" | "site"
  const [techDay, setTechDay] = useState(null); // YYYY-MM-DD picked on the tech board (null = default)
  const [showSheet, setShowSheet] = useState(false); // raw tech sheet open

  useEffect(() => {
    let alive = true;
    setSched(null);
    setTechDay(null);
    setShowSheet(false);
    fetchSchedule(14, from === todayYmd ? null : from).then((data) => {
      if (!alive) return;
      setSched(data);
      if (from === anchor && scheduleOk(data)) setTiles(nextTiles(data, from));
    });
    return () => { alive = false; };
  }, [from]); // eslint-disable-line react-hooks/exhaustive-deps

  const ok = scheduleOk(sched);

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

  // Doctor rows: Brittany's order, then any other initials seen in the calendar.
  const doctors = ok
    ? [...DOCTOR_ORDER, ...[...new Set(sched.days.flatMap((d) => [...d.sessions.map((s) => s.doctor), ...d.vacations]))]
      .filter((x) => !DOCTOR_ORDER.includes(x)).sort()]
    : [];

  // Group shown days into weeks; the header uses ALL days of that week in range.
  const weeks = [];
  for (const d of shown) {
    const wk = mondayOf(d.date);
    if (!weeks.length || weeks[weeks.length - 1].monday !== wk) weeks.push({ monday: wk, days: [] });
    weeks[weeks.length - 1].days.push(d);
  }
  const weekAll = (monday) => (ok ? sched.days.filter((d) => mondayOf(d.date) === monday) : []);

  // ── Tech board day picker: the first five weekdays in range ──
  const techDays = ok
    ? sched.days.filter((d) => { const w = dateOfYmd(d.date).getDay(); return w !== 0 && w !== 6; }).slice(0, 5)
    : [];
  const oneWeek = techDays.length > 0 && techDays.every((d) => mondayOf(d.date) === mondayOf(techDays[0].date));
  const defaultTechDay = (techDays.find((d) => d.date === todayYmd && d.techs) || techDays.find((d) => d.techs) || techDays[0] || {}).date || null;
  const tDay = techDays.find((d) => d.date === (techDay || defaultTechDay)) || null;

  // ── Styles (mockup .week / table / .tech) ──
  const th = { padding: "8px 10px", fontSize: 12.5, color: T.muted, fontWeight: 500, textAlign: "left", background: T.paper, borderBottom: `1px solid ${T.line}`, whiteSpace: "nowrap" };
  const td = (last, extra = {}) => ({ padding: "7px 10px", verticalAlign: "top", borderBottom: last ? 0 : `1px solid ${T.line}`, ...extra });
  const head = { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px 14px", padding: "10px 16px", borderBottom: `1px solid ${T.line}`, fontSize: 13.5 };
  const h3 = { fontSize: 14, fontWeight: 600, color: T.accent, margin: 0 };
  const oc = { color: T.muted };
  const bold = { color: T.ink, fontWeight: 600 };
  const smallS = { fontWeight: 400, color: T.muted, fontSize: 11.5, marginLeft: 2 };
  const runLabel = (runs) => runs.map((r, i) => (
    <Fragment key={i}>{i > 0 ? " · " : ""}<b style={bold}>{r.who}</b>{r.from ? ` from ${r.from}` : ""}</Fragment>
  ));
  const updated = ok && sched.generatedAt
    ? new Date(sched.generatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : null;

  const weekHead = (w, title) => {
    const all = weekAll(w.monday);
    const doc = rotationLabel(all, "doctor");
    const tech = rotationLabel(all, "tech");
    return (
      <div style={head}>
        <h3 style={h3}>{title || `Week of ${monDay(w.monday)}`}</h3>
        {doc && <span style={oc}>On call {runLabel(doc)}</span>}
        {tech && <span style={oc}>Tech {runLabel(tech)}</span>}
      </div>
    );
  };

  // One doctor-view cell (not closed).
  const docCell = (d, doctor) => {
    const h = doctorHalves(d.sessions, doctor);
    const c = doctorColor(doctor).fg;
    const site = { fontWeight: 600, whiteSpace: "nowrap", color: c };
    const am = h.AM.join(" + "), pm = h.PM.join(" + ");
    if (am && pm) {
      return am === pm
        ? <span style={site}>{am}</span>
        : <span style={site}>{am} <small style={smallS}>/ {pm}</small></span>;
    }
    if (am || pm) return <span style={site}>{am || pm} <small style={smallS}>{am ? "AM" : "PM"}</small></span>;
    if (d.vacations.includes(doctor)) {
      return <span style={{ display: "inline-block", background: T.paper, border: `1px solid ${T.line}`, color: T.muted, borderRadius: 4, padding: "0 6px", fontSize: 11.5 }}>Vacation</span>;
    }
    return <span style={{ color: T.muted, fontWeight: 400 }}>OUT</span>;
  };

  // Closed day: who still has a session — "FJM · WSC PM".
  const closedLines = (d) => doctors.map((doctor) => {
    const h = doctorHalves(d.sessions, doctor);
    if (!h.AM.length && !h.PM.length) return null;
    const am = h.AM.join(" + "), pm = h.PM.join(" + ");
    const where = am && pm ? (am === pm ? am : `${am} / ${pm}`) : `${am || pm} ${am ? "AM" : "PM"}`;
    return <div key={doctor} style={{ fontSize: 12, fontWeight: 600, color: doctorColor(doctor).fg, whiteSpace: "nowrap" }}>{doctor} · {where}</div>;
  });

  // ── Tech board pieces ──
  const t = tDay ? tDay.techs : null;
  const people = new Map(((t && t.people) || []).map((p) => [p.name, p]));
  const translator = translatorOf(t);
  const endHour = (hours) => { const m = String(hours || "").match(/-(\d{1,2}:\d{2})$/); return m ? m[1] : null; };

  const siteCard = (site, title) => {
    const half = t.roles[site] || { AM: {}, PM: {} };
    const tint = site === "LEOM" ? SITE_TINTS.LEOM : null;
    const rows = TECH_ROWS.filter((r) => r.always || (half.AM[r.key] || []).length || (half.PM[r.key] || []).length);
    // A person's note shows once per half (first row they appear in); the PM
    // note is skipped when it repeats the AM note.
    const seen = { AM: new Set(), PM: new Set() };
    const inAM = new Set(rows.flatMap((r) => (r.key === "other" ? [] : half.AM[r.key] || [])));
    const nameCell = (h, key, list, last) => {
      if (!list || !list.length) return <td style={td(last, { color: NONE, fontSize: 13 })}>—</td>;
      return (
        <td style={td(last, { fontSize: 13 })}>
          {list.map((name, i) => {
            const p = key === "other" ? null : people.get(name);
            let note = null;
            if (p && !seen[h].has(name)) {
              seen[h].add(name);
              // "with X" pairings stay in the data and the full sheet, not on the board (mockup).
              const raw = ((h === "AM" ? p.amNote : p.pmNote) || "").split("; ").filter((x) => !/^with\s/i.test(x)).join("; ");
              const rawAM = (p.amNote || "").split("; ").filter((x) => !/^with\s/i.test(x)).join("; ");
              note = raw && !(h === "PM" && inAM.has(name) && raw === rawAM) ? raw : null;
            }
            if (p && h === "PM" && p.outPM && (p.pm || []).some((r) => r !== "out")) {
              const until = endHour(p.hours);
              note = [note, until ? `until ${until}` : "then out"].filter(Boolean).join("; ");
            }
            return (
              <Fragment key={name}>
                {i > 0 && " · "}
                <span style={key === "back" ? { fontWeight: 600, color: T.accent } : null}>{name}</span>
                {note && <span style={{ color: T.muted, fontSize: 11.5 }}> {note}</span>}
              </Fragment>
            );
          })}
        </td>
      );
    };
    return (
      <div style={{ minWidth: 0, borderRight: site === "WORC" ? `1px solid ${T.line}` : 0, background: tint ? tint.bg : "transparent" }}>
        <div style={{ padding: "7px 14px", fontSize: 12.5, fontWeight: 600, color: tint ? tint.text : T.muted, background: tint ? tint.head : T.paper, borderBottom: `1px solid ${T.line}` }}>{title}</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: T.sans }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 92, background: tint ? tint.head : T.paper }} />
              <th style={{ ...th, background: tint ? tint.head : T.paper }}>AM</th>
              <th style={{ ...th, background: tint ? tint.head : T.paper }}>PM</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={r.key}>
                <td style={td(ri === rows.length - 1, { fontSize: 13, color: r.key === "back" ? T.accent : T.muted, fontWeight: r.key === "back" ? 600 : 500, whiteSpace: "nowrap" })}>{r.label}</td>
                {nameCell("AM", r.key, half.AM[r.key], ri === rows.length - 1)}
                {nameCell("PM", r.key, half.PM[r.key], ri === rows.length - 1)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const footItem = (label, value) => (
    <span><b style={{ fontWeight: 600, color: T.ink }}>{label}</b> {value || "—"}</span>
  );
  const names = (arr) => (arr && arr.length ? arr.join(", ") : "—");

  const statusBlock = (
    <>
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
    </>
  );

  // ── Phone: one day at a time (the picked date) ──
  if (phone) {
    const day = ok ? (sched.days.find((d) => d.date === from) || sched.days[0] || null) : null;
    return (
      <div style={{ background: T.paper, color: T.ink, fontFamily: T.sans }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px 8px" }}>
          <b style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 600, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{shortDate(day ? day.date : from)}</b>
          <DatePick from={from} todayYmd={todayYmd} onChange={pickDate} phone />
        </div>
        {(sched === null || !ok) && <div style={{ padding: "12px 16px" }}>{statusBlock}</div>}
        {ok && day && <SchedulePhone day={day} tiles={tiles} selected={from} onPick={setFrom} open={openFolds} onToggle={toggleFold} />}
        {ok && !day && <div style={{ padding: "12px 16px", fontSize: 13, color: T.muted }}>No calendar days returned for this date.</div>}
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.paper, color: T.ink, fontFamily: T.sans }}>
      <PageBar onBack={onBack} backLabel="Hub" title="Schedule" sub="VRA calendar · next 2 weeks" />

      <div className="vra-wrap" style={wrap({ paddingTop: 20, paddingBottom: 40 })}>
        {/* View switch · start-date picker · doctor legend */}
        {(
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 14px", flexWrap: "wrap" }}>
            {ok && <div style={segWrap} role="group" aria-label="Schedule view">
              <button onClick={() => setView("doctors")} aria-pressed={view === "doctors"} style={segBtn(view === "doctors")}>Doctors</button>
              <button onClick={() => setView("site")} aria-pressed={view === "site"} style={segBtn(view === "site")}>By site</button>
            </div>}
            <DatePick from={from} todayYmd={todayYmd} onChange={setFrom} />
            {ok && <div className="vra-legend" style={{ marginLeft: "auto", display: "flex", gap: 10, fontSize: 12.5, color: T.muted, flexWrap: "wrap" }}>
              {DOCTOR_ORDER.map((d) => (
                <span key={d}><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", marginRight: 5, verticalAlign: 1, background: doctorColor(d).fg }} />{d}</span>
              ))}
            </div>}
          </div>
        )}

        {statusBlock}

        {/* ── Doctors view ── */}
        {ok && view === "doctors" && weeks.map((w) => (
          <section key={w.monday} style={card({ marginBottom: 16, overflow: "hidden" })}>
            {weekHead(w)}
            <div className="vra-table">
              <table style={{ width: "100%", minWidth: 72 + w.days.length * 96, tableLayout: "fixed", borderCollapse: "collapse", fontSize: 13, fontFamily: T.sans }}>
                <thead>
                  <tr>
                    <th style={{ ...th, width: 72 }} />
                    {w.days.map((d) => {
                      const isToday = d.date === todayYmd;
                      return <th key={d.date} style={{ ...th, ...(isToday ? { color: T.accent, background: T.accentSoft } : null) }}>{dayLabel(d.date)}</th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((doctor, ri) => {
                    const last = ri === doctors.length - 1;
                    return (
                      <tr key={doctor}>
                        <td style={td(last, { width: 72, fontWeight: 600, color: doctorColor(doctor).fg })}>{doctor}</td>
                        {w.days.map((d) => {
                          if (d.closed) {
                            if (ri > 0) return null; // covered by the rowSpan cell
                            return (
                              <td key={d.date} rowSpan={doctors.length} style={{ padding: "7px 10px", verticalAlign: "top", background: T.amberSoft, color: T.amber, fontSize: 12.5 }}>
                                <b style={{ fontWeight: 600 }}>Closed</b>
                                {d.closureName && <div>{d.closureName}</div>}
                                {closedLines(d)}
                              </td>
                            );
                          }
                          const isToday = d.date === todayYmd;
                          return <td key={d.date} style={td(last, isToday ? { background: TODAY_TINT } : null)}>{docCell(d, doctor)}</td>;
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        {/* ── By-site view ── */}
        {ok && view === "site" && weeks.map((w) => (
          <section key={w.monday} style={card({ marginBottom: 16, overflow: "hidden" })}>
            {weekHead(w)}
            <div className="vra-table">
              <table style={{ width: "100%", minWidth: 96 + sites.length * 80, borderCollapse: "collapse", fontSize: 13, fontFamily: T.sans }}>
                <thead>
                  <tr>
                    <th style={{ ...th, width: 96 }}>Day</th>
                    {sites.map((s) => <th key={s} style={th}>{s}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {w.days.map((d, ri) => {
                    const last = ri === w.days.length - 1;
                    const isToday = d.date === todayYmd;
                    const bySite = Object.fromEntries(sessionsBySite(d.sessions).map((x) => [x.site, x.docs]));
                    const tint = isToday ? { background: TODAY_TINT } : null;
                    return (
                      <tr key={d.date}>
                        <td style={td(last, tint)}>
                          <b style={{ fontWeight: 600, color: isToday ? T.accent : T.ink, whiteSpace: "nowrap" }}>{dayLabel(d.date)}</b>
                          {(d.closed || d.vacations.length > 0) && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                              {d.closed && <span style={{ display: "inline-block", padding: "0 6px", borderRadius: 4, background: T.amberSoft, color: T.amber, fontSize: 11.5, fontWeight: 600 }}>Closed{d.closureName ? ` · ${d.closureName}` : ""}</span>}
                              {d.vacations.length > 0 && <span style={{ display: "inline-block", padding: "0 6px", borderRadius: 4, background: T.paper, border: `1px solid ${T.line}`, color: T.muted, fontSize: 11.5 }}>Out: {d.vacations.join(", ")}</span>}
                            </div>
                          )}
                        </td>
                        {sites.map((s) => (
                          <td key={s} style={td(last, tint)}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 3px" }}>
                              {(bySite[s] || []).map((x) => <DocChip key={x.doctor} doctor={x.doctor} half={x.half} size="md" />)}
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        {/* ── Tech board (one day, role-first per site) ── */}
        {ok && techDays.length > 0 && (
          <section style={card({ marginBottom: 16, overflow: "hidden" })}>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px 12px", padding: "10px 16px", borderBottom: `1px solid ${T.line}` }}>
              <h3 style={h3}>Techs — {tDay ? shortDate(tDay.date) : ""}</h3>
              {t && (
                <span style={{ fontSize: 13, color: T.muted, flex: "1 1 260px", minWidth: 0 }}>
                  {[
                    t.headline,
                    tDay.onCall && tDay.onCall.tech ? `Tech on call: ${tDay.onCall.tech}` : null,
                    translator ? `Translator: ${translator.raw || (translator.same ? `${translator.am} all day` : `${translator.am} AM, ${translator.pm} PM`)}` : null,
                  ].filter(Boolean).join(" · ")}
                </span>
              )}
              <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                {techDays.map((d) => {
                  const on = tDay && d.date === tDay.date;
                  const dt = dateOfYmd(d.date);
                  return (
                    <button key={d.date} onClick={() => { setTechDay(d.date); setShowSheet(false); }} aria-pressed={!!on}
                      title={d.techs ? shortDate(d.date) : `${shortDate(d.date)} — no tech sheet`}
                      style={{ padding: "4px 10px", borderRadius: 5, fontSize: 12.5, fontFamily: T.sans, cursor: "pointer", border: `1px solid ${on ? T.accentLine : "transparent"}`, background: on ? T.accentSoft : "transparent", color: on ? T.accent : T.muted, fontWeight: on ? 600 : 400, opacity: d.techs ? 1 : 0.55 }}>
                      {oneWeek ? DOW[dt.getDay()] : `${DOW[dt.getDay()]} ${dt.getDate()}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {!t && <div style={{ padding: "12px 16px", fontSize: 13, color: T.muted }}>No tech sheet for this day.</div>}

            {t && t.roles && (
              <>
                <div className="vra-sites" style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr" }}>
                  {siteCard("WORC", "Worcester")}
                  {siteCard("LEOM", "Leominster")}
                </div>
                <div style={{ padding: "9px 16px", borderTop: `1px solid ${T.line}`, fontSize: 12.5, color: T.ink2, display: "flex", gap: "4px 18px", flexWrap: "wrap" }}>
                  {footItem("Off today", t.off && t.off.length ? t.off.join(", ") : null)}
                  {footItem("Clinical trials", t.trials ? t.trials.replace(/\s*,\s*/g, " · ") : null)}
                  {footItem("Phone/portal", `Worcester ${(t.phonePortal && t.phonePortal.WORC) || "—"} · Leominster ${(t.phonePortal && t.phonePortal.LEOM) || "—"}`)}
                  {(t.extra || []).map((x) => <span key={x}>{x}</span>)}
                </div>
              </>
            )}

            {/* Older server (no structured roles): the flat summary. */}
            {t && !t.roles && (
              <div style={{ padding: "10px 16px", fontSize: 13, color: T.ink2, lineHeight: 1.6 }}>
                <div>Back AM: {names(t.worcesterBackAM)} / Back PM: {names(t.worcesterBackPM)}</div>
                {((t.leominsterBackAM || []).length > 0 || (t.leominsterBackPM || []).length > 0) && (
                  <div>Leominster: AM {names(t.leominsterBackAM)}{(t.leominsterBackPM || []).length > 0 ? ` / PM ${names(t.leominsterBackPM)}` : ""}</div>
                )}
                {t.off && t.off.length > 0 && <div style={{ color: T.muted }}>Off: {t.off.join(", ")}</div>}
              </div>
            )}

            {t && (
              <>
                <button onClick={() => setShowSheet(!showSheet)} aria-expanded={showSheet}
                  style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", borderTop: `1px solid ${T.line}`, padding: "9px 16px", cursor: "pointer", fontFamily: T.sans, fontSize: 12.5, color: T.accent }}>
                  {showSheet ? "Hide Nana's full sheet ▾" : "Show Nana's full sheet (hours, open/close) ▸"}
                </button>
                {showSheet && (
                  <div style={{ padding: "0 16px 12px", fontSize: 12.5, lineHeight: 1.55, color: T.ink2, whiteSpace: "pre-wrap", fontFamily: T.sans }}>
                    {t.text}
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {ok && (
          <p style={{ color: T.muted, fontSize: 12, margin: "8px 0 0" }}>
            {updated ? `Updated ${updated} · ` : ""}source: VRA Google Calendar
          </p>
        )}
      </div>
    </div>
  );
}

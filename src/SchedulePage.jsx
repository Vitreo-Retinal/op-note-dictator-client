import { useState, useEffect, Fragment } from "react";
import PageBar, { wrap } from "./PageBar.jsx";
import { DocChip, ManagersLine, StaffLine, EventsLine } from "./CallBoard.jsx";
import DayStepper, { scheduleRange } from "./DayStepper.jsx";
import { T, card, DOCTOR_ORDER, SITE_TINTS, TRANSLATOR, doctorColor } from "./theme.js";
import { AlertIcon, PhoneIcon } from "./icons.jsx";
import { usePhone } from "./phone.jsx";
import SchedulePhone, { nextTiles } from "./SchedulePhone.jsx";
import PhoneText from "./PhoneText.jsx";
import { majorHoliday } from "./lib/practiceCalendar.js";
import {
  fetchSchedule, scheduleOk, ymdOf, dateOfYmd, addDaysYmd, monDay, shortDate, sessionsBySite,
  doctorHalves, techBack, translatorOf, managersOf, frontDeskOf, eventsOf, eventTime,
} from "./lib/vraSchedule.js";

// ── Schedule — from the shared VRA Google Calendar (Oct 2026) ───────────
// Computer (owner-approved mockup, Oct 9 2026): ONE DAY at a time. The page
// bar carries the Call Board's day stepper (‹ date › Today); below it three
// sections for that day — Doctors (on call + one row per site, same helpers
// as the Call Board), Techs (the role-first tech board, one card per site,
// Leominster's header strip in the Call Board's LEOM yellow, translator in
// green) and Managers, front desk and events. "See 2 weeks ›" at the bottom
// opens the two-week grid (collapsed by default; mockup approved Oct 9 2026):
// Mon–Fri week blocks with equal columns — doctor rows, then back techs per
// site (Leominster yellow) and the translator, then events. Past days faded;
// managers / front desk out that week sit in the week's header line; a
// column's date opens that day in the day view above.
// Phone: unchanged — SchedulePhone, one day at a time with next-day tiles.
// Practice-wide, no PIN. Data: server GET /api/schedule (secret ICS feed
// read server-side). Read-only.

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

// General events in a table cell: "6:00–9:00 PM · Title" + muted location (neutral).
function EventList({ events }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {events.map((ev, i) => (
        <div key={`${ev.title}|${ev.start}|${i}`} style={{ fontSize: 12, lineHeight: 1.35, color: T.ink, overflowWrap: "anywhere" }}>
          <span style={{ color: T.ink2, fontWeight: 600 }}>{eventTime(ev)}</span>
          <span style={{ color: T.muted }}> · </span><PhoneText text={ev.title} />
          {ev.location && <div style={{ color: T.muted, fontSize: 11.5 }}><PhoneText text={ev.location} /></div>}
        </div>
      ))}
    </div>
  );
}

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
    <div style={{ display: "flex", alignItems: "center", gap: phone ? 6 : 8 }}>
      <input type="date" value={from} aria-label="Schedule start date" className="vra-input"
        onChange={(e) => { if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) onChange(e.target.value); }}
        style={{ height: phone ? 38 : 32, padding: "0 8px", background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.r, color: T.ink, fontFamily: T.sans, fontSize: phone ? 16 : 13, outline: "none", boxSizing: "border-box", minWidth: 0, ...(phone ? { width: 138, padding: "0 6px" } : {}) }} />
      <button onClick={() => onChange(todayYmd)} disabled={from === todayYmd}
        style={{ height: phone ? 38 : 32, padding: "0 12px", background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.r, color: from === todayYmd ? T.muted : T.accent, fontFamily: T.sans, fontSize: 13, fontWeight: 500, cursor: from === todayYmd ? "default" : "pointer", whiteSpace: "nowrap" }}>
        Today
      </button>
    </div>
  );
}

// initialDay (phone, Front desk Home "Next days" tile): open on that day.
// onOpenExtensions (Oct 2026): "Extensions" link in the header → Phone extensions page.
export default function SchedulePage({ onBack, initialDay, onOpenExtensions }) {
  const { phone } = usePhone();
  const todayYmd = ymdOf(new Date());
  // First day fetched. Phone: the picked date. Computer: today, so the day
  // stepper can go back to today — unless initialDay lies outside the
  // two weeks that start today (then the fetch starts on it).
  const [from, setFrom] = useState(() => {
    if (phone || !initialDay) return initialDay || todayYmd;
    return initialDay >= todayYmd && initialDay <= addDaysYmd(todayYmd, 13) ? todayYmd : initialDay;
  });
  // Computer: the one day shown (day stepper), and the two-week grid fold.
  const [day, setDay] = useState(initialDay || todayYmd);
  const [showGrid, setShowGrid] = useState(false);
  // Phone: the date the next-day tiles count from (date input / Today), the
  // tiles themselves (kept while a tile's day loads), and open tech folds.
  const [anchor, setAnchor] = useState(todayYmd);
  const [tiles, setTiles] = useState(null);
  const [openFolds, setOpenFolds] = useState(() => new Set());
  const pickDate = (v) => { setAnchor(v); setTiles(null); setFrom(v); };
  const toggleFold = (id) => setOpenFolds((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const [sched, setSched] = useState(null); // null = loading
  const [showSheet, setShowSheet] = useState(false); // raw tech sheet open

  useEffect(() => {
    let alive = true;
    setSched(null);
    setShowSheet(false);
    fetchSchedule(14, from === todayYmd ? null : from).then((data) => {
      if (!alive) return;
      setSched(data);
      if (from === anchor && scheduleOk(data)) setTiles(nextTiles(data, from));
    });
    return () => { alive = false; };
  }, [from]); // eslint-disable-line react-hooks/exhaustive-deps

  // Opened on a later day: the next-day tiles still count from today.
  useEffect(() => {
    if (!phone || !initialDay || initialDay === todayYmd) return undefined; // phone tiles only
    let alive = true;
    fetchSchedule(14, null).then((data) => { if (alive && scheduleOk(data)) setTiles(nextTiles(data, todayYmd)); });
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ok = scheduleOk(sched);

  // Doctor rows: Brittany's order, then any other initials seen in the calendar.
  const doctors = ok
    ? [...DOCTOR_ORDER, ...[...new Set(sched.days.flatMap((d) => [...d.sessions.map((s) => s.doctor), ...d.vacations]))]
      .filter((x) => !DOCTOR_ORDER.includes(x)).sort()]
    : [];

  // ── Computer: the one day shown (day stepper), clamped to the loaded range ──
  const [minYmd, maxYmd] = scheduleRange(sched, todayYmd, ok);
  const shownYmd = !ok ? day : (day >= minYmd && day <= maxYmd ? day : todayYmd);
  const isToday = shownYmd === todayYmd;
  const when = isToday ? "today" : "that day";
  const pickDay = (ymd) => { setDay(ymd); setShowSheet(false); };
  const tDay = ok ? sched.days.find((d) => d.date === shownYmd) || null : null;
  const dayHoliday = majorHoliday(dateOfYmd(shownYmd));

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
      return <span style={{ display: "inline-block", background: T.redSoft, border: "1px solid #E7B9B2", color: T.red, fontWeight: 600, borderRadius: 4, padding: "0 6px", fontSize: 11.5 }}>Vacation</span>;
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

  // ── Two-week grid (owner-approved mockup, Oct 9 2026) ──
  // Mon–Fri blocks from the week of the first loaded day through the last
  // loaded day (a block with no loaded weekday is skipped). Five equal
  // columns; past days faded; days outside the loaded data left blank.
  const byDate = new Map(ok ? sched.days.map((d) => [d.date, d]) : []);
  const gridWeeks = [];
  if (ok && sched.days.length) {
    const dates = sched.days.map((d) => d.date).sort();
    for (let m = mondayOf(dates[0]); m <= dates[dates.length - 1]; m = addDaysYmd(m, 7)) {
      const cols = [0, 1, 2, 3, 4].map((i) => {
        const ymd = addDaysYmd(m, i);
        const d = byDate.get(ymd) || null;
        const hol = majorHoliday(dateOfYmd(ymd));
        return {
          ymd, d, today: ymd === todayYmd, past: ymd < todayYmd,
          closed: !!d && (d.closed || !!hol), closedName: d ? d.closureName || hol : null,
          canOpen: !!d && ymd >= minYmd && ymd <= maxYmd,
        };
      });
      if (cols.some((c) => c.d)) gridWeeks.push({ monday: m, cols });
    }
  }
  const dowOf = (ymd) => DOW[dateOfYmd(ymd).getDay()];

  // Managers / front desk out that week: "Brittany (from Tue)", "Kim (Wed)".
  // Counts the open days from today on (or all loaded days for a past week).
  const outThatWeek = (w) => {
    const open = w.cols.filter((c) => c.d && !c.closed).map((c) => c.d);
    const ahead = open.filter((d) => d.date >= todayYmd);
    const span = ahead.length ? ahead : open;
    const who = new Map();
    for (const d of span) {
      for (const p of [...managersOf(d), ...frontDeskOf(d)]) {
        if (p.tone === "in") continue;
        if (!who.has(p.name)) who.set(p.name, []);
        if (!who.get(p.name).includes(d.date)) who.get(p.name).push(d.date);
      }
    }
    return [...who].map(([name, days]) => {
      const idx = days.map((x) => span.findIndex((d) => d.date === x));
      const toEnd = idx.every((v, i) => v === idx[0] + i) && idx[idx.length - 1] === span.length - 1;
      const when = toEnd ? (idx[0] === 0 ? null : `from ${dowOf(days[0])}`) : days.map(dowOf).join(", ");
      return { name, when };
    });
  };

  // Clicking a column's date opens that day in the day view above.
  const openDay = (ymd) => {
    pickDay(ymd);
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch { window.scrollTo(0, 0); }
  };

  const gBorder = `1px solid ${T.line}`;
  const gTh = { padding: "7px 10px", fontSize: 12.5, fontWeight: 600, color: T.muted, textAlign: "left", background: T.paper, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
  const gGrp = { padding: "4px 10px", background: T.paper, borderTop: gBorder, fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: T.muted };
  const gLab = { padding: "6px 10px", borderTop: gBorder, verticalAlign: "top", fontSize: 12.5, color: T.muted };
  const gCell = (c, tint, extra) => ({
    padding: "6px 10px", borderTop: gBorder, verticalAlign: "top", minWidth: 0, overflowWrap: "anywhere",
    ...(c.today ? { background: TODAY_TINT } : null),
    ...(tint ? { background: tint } : null),
    ...extra,
    ...(c.closed ? { background: T.amberSoft } : null),
    ...(c.past ? { opacity: 0.38 } : null),
  });
  const mutedTxt = { color: T.muted };
  const halfTag = { color: T.muted, fontSize: 11, fontWeight: 500, marginLeft: 3 };
  const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

  // Back techs for one site/day: "Nana · Evelyn", "AM names / PM names", "Kim AM".
  const backCell = (c, site) => {
    const t = c.d.techs;
    if (!t) return <span style={mutedTxt}>{c.past ? "—" : "No sheet yet"}</span>;
    const am = techBack(t, site, "AM"), pm = techBack(t, site, "PM");
    if (!am.length && !pm.length) return <span style={mutedTxt}>—</span>;
    if (sameList(am, pm)) return am.join(" · ");
    if (!pm.length) return <>{am.join(" · ")}<span style={halfTag}>AM</span></>;
    if (!am.length) return <>{pm.join(" · ")}<span style={halfTag}>PM</span></>;
    return <>{am.join(" · ")}<span style={{ color: T.muted }}> / </span>{pm.join(" · ")}</>;
  };
  const translatorCell = (c) => {
    const tr = c.d.techs ? translatorOf(c.d.techs) : null;
    if (!tr) return <span style={mutedTxt}>—</span>;
    if (tr.raw) return tr.raw;
    if (tr.same) return tr.am;
    const am = tr.am !== "—" ? tr.am : null, pm = tr.pm !== "—" ? tr.pm : null;
    return (
      <>
        {am && <>{am}<span style={halfTag}>AM</span></>}
        {am && pm && <span style={{ color: T.muted }}> · </span>}
        {pm && <>{pm}<span style={halfTag}>PM</span></>}
      </>
    );
  };
  const TECH_GRID = [
    { key: "WORC", label: "Worcester back" },
    { key: "LEOM", label: "Leominster back", tint: SITE_TINTS.LEOM.bg },
    { key: "TR", label: "Translator" },
  ];

  const weekBlock = (w) => {
    const all = sched.days.filter((d) => mondayOf(d.date) === w.monday);
    const doc = rotationLabel(all, "doctor");
    const tech = rotationLabel(all, "tech");
    const out = outThatWeek(w);
    const hasEvents = w.cols.some((c) => eventsOf(c.d).length > 0);
    return (
      <section key={w.monday} style={card({ marginBottom: 14, overflow: "hidden", minWidth: 760 })} aria-label={`Week of ${monDay(w.monday)}`}>
        <div style={head}>
          <h3 style={h3}>Week of {monDay(w.monday)}</h3>
          {doc && <span style={oc}>On call {runLabel(doc)}</span>}
          {tech && <span style={oc}>Tech {runLabel(tech)}</span>}
          {out.length > 0 && (
            <span style={oc}>Out: {out.map((o, i) => (
              <Fragment key={o.name}>{i > 0 ? ", " : ""}<b style={{ fontWeight: 600, color: T.red }}>{o.name}</b>{o.when ? ` (${o.when})` : ""}</Fragment>
            ))}</span>
          )}
        </div>
        <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", fontSize: 13, fontFamily: T.sans }}>
          <colgroup><col style={{ width: 120 }} />{w.cols.map((c) => <col key={c.ymd} />)}</colgroup>
          <thead>
            <tr>
              <th style={gTh} />
              {w.cols.map((c) => {
                const text = `${dayLabel(c.ymd)}${c.today ? " · Today" : ""}`;
                return (
                  <th key={c.ymd} style={{ ...gTh, ...(c.today ? { color: T.accent, background: T.accentSoft } : null) }}>
                    {c.canOpen ? (
                      <button type="button" className="vra-daybtn" onClick={() => openDay(c.ymd)} title={`Open ${shortDate(c.ymd)} above`}
                        style={{ background: "none", border: 0, padding: 0, font: "inherit", color: "inherit", cursor: "pointer", borderBottom: "1px dotted currentColor" }}>
                        {text}
                      </button>
                    ) : text}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            <tr><td colSpan={6} style={gGrp}>Doctors</td></tr>
            {doctors.map((doctor, ri) => (
              <tr key={doctor}>
                <td style={{ ...gLab, fontWeight: 700, color: doctorColor(doctor).fg }}>{doctor}</td>
                {w.cols.map((c) => {
                  if (c.closed) {
                    if (ri > 0) return null; // covered by the rowSpan cell
                    return (
                      <td key={c.ymd} rowSpan={doctors.length} style={gCell(c, null, { color: T.amber, fontSize: 12.5 })}>
                        <b style={{ fontWeight: 600 }}>Closed</b>
                        {c.closedName && <div>{c.closedName}</div>}
                        {closedLines(c.d)}
                      </td>
                    );
                  }
                  return <td key={c.ymd} style={gCell(c)}>{c.d ? docCell(c.d, doctor) : null}</td>;
                })}
              </tr>
            ))}
            <tr><td colSpan={6} style={gGrp}>Techs</td></tr>
            {TECH_GRID.map((r) => (
              <tr key={r.key}>
                <td style={{ ...gLab, ...(r.tint ? { background: r.tint } : null) }}>{r.label}</td>
                {w.cols.map((c) => (
                  <td key={c.ymd} style={gCell(c, r.tint, { fontSize: 12.5 })}>
                    {c.d && !c.closed ? (r.key === "TR" ? translatorCell(c) : backCell(c, r.key)) : null}
                  </td>
                ))}
              </tr>
            ))}
            {hasEvents && <tr><td colSpan={6} style={gGrp}>Events</td></tr>}
            {hasEvents && (
              <tr>
                <td style={gLab} />
                {w.cols.map((c) => (
                  <td key={c.ymd} style={gCell(c)}>{eventsOf(c.d).length > 0 && <EventList events={eventsOf(c.d)} />}</td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </section>
    );
  };

  // ── Tech board pieces ──
  const t = tDay ? tDay.techs : null;
  const people = new Map(((t && t.people) || []).map((p) => [p.name, p]));
  const translator = translatorOf(t);
  const endHour = (hours) => { const m = String(hours || "").match(/-(\d{1,2}:\d{2})$/); return m ? m[1] : null; };

  // One column card per site. Header strip: Worcester accent-soft blue,
  // Leominster the Call Board's LEOM yellow (SITE_TINTS.LEOM.bg).
  const siteCard = (site, title) => {
    const half = t.roles[site] || { AM: {}, PM: {} };
    const strip = site === "LEOM" ? SITE_TINTS.LEOM.bg : T.accentSoft;
    const rows = TECH_ROWS.filter((r) => r.always || (half.AM[r.key] || []).length || (half.PM[r.key] || []).length);
    // "7 techs": distinct names in the named roles ("Other" holds free text).
    const count = new Set(["AM", "PM"].flatMap((h) => TECH_ROWS.filter((r) => r.key !== "other").flatMap((r) => half[h][r.key] || []))).size;
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
                {note && <span style={{ color: /\b(out|off)\b/i.test(note) ? T.red : T.muted, fontSize: 11.5 }}> {note}</span>}
              </Fragment>
            );
          })}
        </td>
      );
    };
    return (
      <div style={{ minWidth: 0, border: `1px solid ${T.line}`, borderRadius: T.rLg, overflow: "hidden", background: T.surface }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, padding: "8px 12px", fontSize: 13.5, fontWeight: 600, color: T.ink, background: strip, borderBottom: `1px solid ${T.line}` }}>
          <span>{title}</span>
          {count > 0 && <span style={{ fontSize: 12, fontWeight: 500, color: T.muted }}>{count} tech{count === 1 ? "" : "s"}</span>}
        </div>
        <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", fontFamily: T.sans }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 84, background: T.surface, padding: "6px 10px" }} />
              <th style={{ ...th, background: T.surface, padding: "6px 10px" }}>AM</th>
              <th style={{ ...th, background: T.surface, padding: "6px 10px" }}>PM</th>
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

  const footItem = (label, value, away) => (
    <span><b style={{ fontWeight: 600, color: away && value ? T.red : T.ink }}>{label}</b> <span style={away && value ? { color: T.red, fontWeight: 600 } : null}>{value ? <PhoneText text={value} /> : "—"}</span></span>
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
          {onOpenExtensions && (
            <button type="button" onClick={onOpenExtensions} aria-label="Phone extensions"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, padding: 0, background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.r, color: T.accent, cursor: "pointer", flex: "none", boxSizing: "border-box" }}>
              <PhoneIcon size={18} />
            </button>
          )}
        </div>
        {(sched === null || !ok) && <div style={{ padding: "12px 16px" }}>{statusBlock}</div>}
        {ok && day && <SchedulePhone day={day} tiles={tiles} selected={from} onPick={setFrom} open={openFolds} onToggle={toggleFold} />}
        {ok && !day && <div style={{ padding: "12px 16px", fontSize: 13, color: T.muted }}>No calendar days returned for this date.</div>}
      </div>
    );
  }

  // ── Computer: one day (the day stepper's) ──
  const sec = { padding: "14px 18px", borderTop: `1px solid ${T.line}` };
  const lbl = { fontSize: 11.5, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: T.muted, margin: "0 0 8px", fontFamily: T.sans };
  const subS = { fontSize: 12.5, color: T.muted, fontFamily: T.sans };
  const onCall = tDay ? tDay.onCall : null;
  const daySites = tDay ? sessionsBySite(tDay.sessions) : [];
  const dayManagers = tDay ? managersOf(tDay) : [];
  const dayFrontDesk = tDay ? frontDeskOf(tDay) : [];
  const dayEvents = eventsOf(tDay);
  const staffLabel = { width: 78 };

  const doctorsSection = (
    <div style={{ ...sec, borderTop: 0 }}>
      <div style={lbl}>Doctors</div>
      <div className="vra-row2" style={{ display: "grid", gridTemplateColumns: "200px minmax(0, 1fr)", gap: "10px 18px", alignItems: "start" }}>
        {/* On call — name in red, tech, through … */}
        <div style={{ minWidth: 0, fontFamily: T.sans }}>
          <div style={subS}>On call</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: onCall && onCall.doctor ? T.red : T.muted, lineHeight: 1.3 }}>
            {onCall && onCall.doctor ? onCall.doctor : "—"}
          </div>
          {onCall && onCall.tech && <div style={subS}>Tech: {onCall.tech}</div>}
          {onCall && onCall.doctorThrough && <div style={{ ...subS, whiteSpace: "nowrap" }}>through {shortDate(onCall.doctorThrough)}</div>}
        </div>
        {/* Where each doctor is — one row per site (Call Board helpers) */}
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
          {tDay && tDay.closed && (
            <div style={{ fontSize: 13.5, fontWeight: 600, color: T.amber, fontFamily: T.sans }}>
              Closed{tDay.closureName ? ` — ${tDay.closureName}` : ""}
            </div>
          )}
          {dayHoliday && !(tDay && tDay.closed) && (
            <div style={{ fontSize: 13, color: T.amber, fontFamily: T.sans }}>{dayHoliday} — office closed</div>
          )}
          {daySites.map(({ site, docs }) => (
            <div key={site} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", minWidth: 0 }}>
              <span style={{ width: 56, flex: "none", fontSize: 12, fontWeight: 600, color: T.muted, fontFamily: T.sans }}>{site}</span>
              {docs.map((d) => <DocChip key={d.doctor} doctor={d.doctor} half={d.half} size="md" />)}
            </div>
          ))}
          {!daySites.length && !(tDay && tDay.closed) && (
            <div style={subS}>{tDay ? "No clinic sessions" : `No schedule for ${when}`}</div>
          )}
          {tDay && tDay.vacations.length > 0 && (
            <div style={{ fontSize: 12.5, fontWeight: 600, color: T.red, fontFamily: T.sans }}>Out: {tDay.vacations.join(", ")}</div>
          )}
        </div>
      </div>
    </div>
  );

  const techsSection = (
    <div style={sec}>
      <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "2px 12px", margin: "0 0 8px" }}>
        <div style={{ ...lbl, margin: 0 }}>Techs</div>
        {t && (t.headline || (onCall && onCall.tech)) && (
          <span style={{ ...subS, minWidth: 0 }}>
            {[t.headline, onCall && onCall.tech ? `Tech on call: ${onCall.tech}` : null].filter(Boolean).join(" · ")}
          </span>
        )}
      </div>

      {!t && <div style={{ ...subS, fontSize: 13 }}>No tech sheet {when}</div>}

      {t && t.roles && (
        <>
          <div className="vra-row2" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14, alignItems: "start" }}>
            {siteCard("WORC", "Worcester")}
            {siteCard("LEOM", "Leominster")}
          </div>
          {translator && (
            <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "2px 12px", marginTop: 10, padding: "7px 12px", borderRadius: T.r, background: TRANSLATOR.bg, fontFamily: T.sans, fontSize: 13 }}>
              <span style={{ color: TRANSLATOR.fg, fontWeight: 600, width: 72, flex: "none" }}>Translator</span>
              <span style={{ color: T.ink, fontWeight: 600, minWidth: 0 }}>
                {translator.raw ? translator.raw : translator.same ? `${translator.am} all day` : (
                  <>{translator.am} <span style={{ color: T.muted, fontWeight: 400, fontSize: 12 }}>AM</span>
                    <span style={{ color: T.lineStrong }}> / </span>
                    {translator.pm} <span style={{ color: T.muted, fontWeight: 400, fontSize: 12 }}>PM</span></>
                )}
              </span>
            </div>
          )}
          <div style={{ marginTop: 10, fontSize: 12.5, color: T.ink2, display: "flex", gap: "4px 18px", flexWrap: "wrap", fontFamily: T.sans }}>
            {footItem(isToday ? "Off today" : "Off that day", t.off && t.off.length ? t.off.join(", ") : null, true)}
            {footItem("Clinical trials", t.trials ? t.trials.replace(/\s*,\s*/g, " · ") : null)}
            {footItem("Phone/portal", `Worcester ${(t.phonePortal && t.phonePortal.WORC) || "—"} · Leominster ${(t.phonePortal && t.phonePortal.LEOM) || "—"}`)}
            {(t.extra || []).map((x) => <span key={x}><PhoneText text={x} /></span>)}
          </div>
        </>
      )}

      {/* Older server (no structured roles): the flat summary. */}
      {t && !t.roles && (
        <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.6, fontFamily: T.sans }}>
          <div>Back AM: {names(t.worcesterBackAM)} / Back PM: {names(t.worcesterBackPM)}</div>
          {((t.leominsterBackAM || []).length > 0 || (t.leominsterBackPM || []).length > 0) && (
            <div>Leominster: AM {names(t.leominsterBackAM)}{(t.leominsterBackPM || []).length > 0 ? ` / PM ${names(t.leominsterBackPM)}` : ""}</div>
          )}
          {translator && <div style={{ color: TRANSLATOR.fg }}>Translator: {translator.raw || (translator.same ? `${translator.am} all day` : `${translator.am} AM, ${translator.pm} PM`)}</div>}
          {t.off && t.off.length > 0 && <div style={{ color: T.red, fontWeight: 600 }}>Off: {t.off.join(", ")}</div>}
        </div>
      )}

      {t && (
        <>
          <button onClick={() => setShowSheet(!showSheet)} aria-expanded={showSheet}
            style={{ display: "block", background: "none", border: "none", padding: "10px 0 0", cursor: "pointer", fontFamily: T.sans, fontSize: 12.5, color: T.accent, textAlign: "left" }}>
            {showSheet ? "Hide Nana's full sheet ▾" : "Show Nana's full sheet (hours, open/close) ▸"}
          </button>
          {showSheet && (
            <div style={{ paddingTop: 8, fontSize: 12.5, lineHeight: 1.55, color: T.ink2, whiteSpace: "pre-wrap", fontFamily: T.sans }}>
              <PhoneText text={t.text} />
            </div>
          )}
        </>
      )}
    </div>
  );

  const staffSection = (
    <div style={sec}>
      <div style={lbl}>Managers, front desk and events</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {dayManagers.length > 0 && <ManagersLine managers={dayManagers} labelStyle={staffLabel} />}
        {dayFrontDesk.length > 0 && <StaffLine label="Front desk" people={dayFrontDesk} labelStyle={staffLabel} />}
        {dayEvents.length > 0 && <EventsLine events={dayEvents} label="Events" labelStyle={staffLabel} />}
        {!dayManagers.length && !dayFrontDesk.length && !dayEvents.length && (
          <div style={{ ...subS, fontSize: 13 }}>Nothing listed {when}</div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: T.paper, color: T.ink, fontFamily: T.sans }}>
      <PageBar onBack={onBack} backLabel="Hub" title="Schedule"
        right={(
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
            <DayStepper value={shownYmd} todayYmd={todayYmd} min={minYmd} max={maxYmd} onChange={pickDay} />
            {onOpenExtensions && (
              <button type="button" className="vra-daybtn" onClick={onOpenExtensions} aria-label="Phone extensions" title="Phone extensions"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, padding: 0, boxSizing: "border-box", background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.r, color: T.accent, cursor: "pointer", flex: "none" }}>
                <PhoneIcon size={15} />
              </button>
            )}
          </div>
        )} />

      <div className="vra-wrap" style={wrap({ paddingTop: 20, paddingBottom: 40 })}>
        {statusBlock}

        {/* ── One day: Doctors · Techs · Managers, front desk and events ── */}
        {ok && (
          <section style={card({ overflow: "hidden" })} aria-label={`Schedule for ${shortDate(shownYmd)}`}>
            {doctorsSection}
            {techsSection}
            {staffSection}
          </section>
        )}

        {/* ── Two-week grid, collapsed by default ── */}
        {sched !== null && (
          <button type="button" className="vra-daybtn" onClick={() => setShowGrid(!showGrid)} aria-expanded={showGrid}
            style={{ display: "inline-block", margin: "14px 0", background: "none", border: 0, padding: "4px 0", cursor: "pointer", color: T.accent, fontFamily: T.sans, fontSize: 13, fontWeight: 500 }}>
            {showGrid ? "Hide 2 weeks" : "See 2 weeks ›"}
          </button>
        )}

        {/* ── Two weeks: Mon–Fri blocks, doctors · back techs · events ── */}
        {ok && showGrid && (
          <div className="vra-table" style={{ overflowX: "auto", marginBottom: 2 }}>
            {gridWeeks.map(weekBlock)}
          </div>
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

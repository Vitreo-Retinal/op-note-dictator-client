import { useState, useEffect, Fragment } from "react";
import PageBar, { wrap, segWrap, segBtn } from "./PageBar.jsx";
import { DocChip, ManagersLine, StaffLine, EventsLine } from "./CallBoard.jsx";
import DayStepper, { scheduleRange } from "./DayStepper.jsx";
import { T, card, DOCTOR_ORDER, SITE_TINTS, TRANSLATOR, doctorColor } from "./theme.js";
import { AlertIcon, PhoneIcon } from "./icons.jsx";
import { usePhone } from "./phone.jsx";
import SchedulePhone, { nextTiles, EventDot } from "./SchedulePhone.jsx";
import { majorHoliday } from "./lib/practiceCalendar.js";
import {
  fetchSchedule, scheduleOk, ymdOf, dateOfYmd, addDaysYmd, monDay, shortDate, bySiteOrder, sessionsBySite,
  doctorHalves, translatorOf, managersOf, frontDeskOf, eventsOf, eventTime,
} from "./lib/vraSchedule.js";

// ── Schedule — from the shared VRA Google Calendar (Oct 2026) ───────────
// Computer (owner-approved mockup, Oct 9 2026): ONE DAY at a time. The page
// bar carries the Call Board's day stepper (‹ date › Today); below it three
// sections for that day — Doctors (on call + one row per site, same helpers
// as the Call Board), Techs (the role-first tech board, one card per site,
// Leominster's header strip in the Call Board's LEOM yellow, translator in
// green) and Managers, front desk and events. "See 2 weeks ›" at the bottom
// opens the older two-week grid (Doctors / By site), collapsed by default.
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

// "Day 6" header label
// General events in a table cell: "6:00–9:00 PM · Title" + muted location (neutral).
function EventList({ events }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {events.map((ev, i) => (
        <div key={`${ev.title}|${ev.start}|${i}`} style={{ fontSize: 12, lineHeight: 1.35, color: T.ink, overflowWrap: "anywhere" }}>
          <span style={{ color: T.ink2, fontWeight: 600 }}>{eventTime(ev)}</span>
          <span style={{ color: T.muted }}> · </span>{ev.title}
          {ev.location && <div style={{ color: T.muted, fontSize: 11.5 }}>{ev.location}</div>}
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
  const [view, setView] = useState("doctors"); // "doctors" | "site"
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

  const weekHead = (w, title) => {
    const all = weekAll(w.monday);
    const doc = rotationLabel(all, "doctor");
    const tech = rotationLabel(all, "tech");
    // Managers: as of today when today is in this week, else the week's first
    // weekday; a later change that week is noted, e.g. "(vacation from Thu)".
    const wkdays = all.filter((d) => { const x = dateOfYmd(d.date).getDay(); return x !== 0 && x !== 6; });
    const ref = wkdays.find((d) => d.date === todayYmd) || wkdays.find((d) => d.date >= todayYmd) || wkdays[0] || null;
    const mgrs = ref ? managersOf(ref) : [];
    const fd = ref ? frontDeskOf(ref) : [];
    // A later change that week, per person: "(vacation from Thu)".
    const laterOf = (field) => {
      const out = {};
      if (!ref) return out;
      for (const m of ref[field] || []) {
        const key = (x) => `${x.status}|${x.site}|${x.ext}|${x.part || ""}`;
        const next = wkdays.find((d) => d.date > ref.date && (d[field] || []).some((x) => x.name === m.name && key(x) !== key(m)));
        if (!next) continue;
        const x = next[field].find((y) => y.name === m.name);
        const what = x.status === "vacation" ? "vacation" : x.status === "out" ? "out" : (x.site || "in");
        out[m.name] = `(${what} from ${DOW[dateOfYmd(next.date).getDay()]})`;
      }
      return out;
    };
    const later = laterOf("managers");
    const laterFd = laterOf("frontDesk");
    return (
      <>
        <div style={head}>
          <h3 style={h3}>{title || `Week of ${monDay(w.monday)}`}</h3>
          {doc && <span style={oc}>On call {runLabel(doc)}</span>}
          {tech && <span style={oc}>Tech {runLabel(tech)}</span>}
        </div>
        {mgrs.length > 0 && (
          <ManagersLine managers={mgrs} extra={later} labelStyle={{ width: 64 }} style={{ padding: "6px 16px", borderBottom: `1px solid ${T.line}`, background: T.surface }} />
        )}
        {fd.length > 0 && (
          <StaffLine label="Front desk" people={fd} extra={laterFd} labelStyle={{ width: 64 }} style={{ padding: "6px 16px", borderBottom: `1px solid ${T.line}`, background: T.surface }} />
        )}
      </>
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
    <span><b style={{ fontWeight: 600, color: away && value ? T.red : T.ink }}>{label}</b> <span style={away && value ? { color: T.red, fontWeight: 600 } : null}>{value || "—"}</span></span>
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
            {(t.extra || []).map((x) => <span key={x}>{x}</span>)}
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
              {t.text}
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

        {/* ── Two-week grid (older view), collapsed by default ── */}
        {sched !== null && (
          <button type="button" className="vra-daybtn" onClick={() => setShowGrid(!showGrid)} aria-expanded={showGrid}
            style={{ display: "inline-block", margin: "14px 0", background: "none", border: 0, padding: "4px 0", cursor: "pointer", color: T.accent, fontFamily: T.sans, fontSize: 13, fontWeight: 500 }}>
            {showGrid ? "Hide 2 weeks" : "See 2 weeks ›"}
          </button>
        )}

        {/* View switch · start-date picker · doctor legend */}
        {showGrid && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 14px", flexWrap: "wrap" }}>
            {ok && <div style={segWrap} role="group" aria-label="Schedule view">
              <button onClick={() => setView("doctors")} aria-pressed={view === "doctors"} style={segBtn(view === "doctors")}>Doctors</button>
              <button onClick={() => setView("site")} aria-pressed={view === "site"} style={segBtn(view === "site")}>By site</button>
            </div>}
            {/* Picking a start date reloads from it and moves the day view there too. */}
            <DatePick from={from} todayYmd={todayYmd} onChange={(v) => { setFrom(v); setDay(v); }} />
            {ok && <div className="vra-legend" style={{ marginLeft: "auto", display: "flex", gap: 10, fontSize: 12.5, color: T.muted, flexWrap: "wrap" }}>
              {DOCTOR_ORDER.map((d) => (
                <span key={d}><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", marginRight: 5, verticalAlign: 1, background: doctorColor(d).fg }} />{d}</span>
              ))}
            </div>}
          </div>
        )}

        {/* ── Doctors view ── */}
        {ok && showGrid && view === "doctors" && weeks.map((w) => (
          <section key={w.monday} style={card({ marginBottom: 16, overflow: "hidden" })}>
            {weekHead(w)}
            <div className="vra-table">
              <table style={{ width: "100%", minWidth: 72 + w.days.length * 96, tableLayout: "fixed", borderCollapse: "collapse", fontSize: 13, fontFamily: T.sans }}>
                <thead>
                  <tr>
                    <th style={{ ...th, width: 72 }} />
                    {w.days.map((d) => {
                      const isToday = d.date === todayYmd;
                      const nEv = eventsOf(d).length;
                      return (
                        <th key={d.date} style={{ ...th, ...(isToday ? { color: T.accent, background: T.accentSoft } : null) }}>
                          {dayLabel(d.date)}
                          {nEv > 0 && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 400, color: T.muted }}><EventDot n={nEv} style={{ verticalAlign: 2, marginRight: 3 }} />{nEv} event{nEv === 1 ? "" : "s"}</span>}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((doctor, ri) => {
                    const last = ri === doctors.length - 1 && !w.days.some((d) => eventsOf(d).length);
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
                  {w.days.some((d) => eventsOf(d).length) && (
                    <tr>
                      <td style={td(true, { width: 72, fontSize: 12, color: T.muted, borderTop: `1px solid ${T.line}` })}>Events</td>
                      {w.days.map((d) => (
                        <td key={d.date} style={td(true, { borderTop: `1px solid ${T.line}`, ...(d.date === todayYmd ? { background: TODAY_TINT } : null) })}>
                          {eventsOf(d).length > 0 && <EventList events={eventsOf(d)} />}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        {/* ── By-site view ── */}
        {ok && showGrid && view === "site" && weeks.map((w) => (
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
                              {d.vacations.length > 0 && <span style={{ display: "inline-block", padding: "0 6px", borderRadius: 4, background: T.redSoft, border: "1px solid #E7B9B2", color: T.red, fontWeight: 600, fontSize: 11.5 }}>Out: {d.vacations.join(", ")}</span>}
                            </div>
                          )}
                          {eventsOf(d).length > 0 && <div style={{ marginTop: 4 }}><EventList events={eventsOf(d)} /></div>}
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

        {ok && (
          <p style={{ color: T.muted, fontSize: 12, margin: "8px 0 0" }}>
            {updated ? `Updated ${updated} · ` : ""}source: VRA Google Calendar
          </p>
        )}
      </div>
    </div>
  );
}

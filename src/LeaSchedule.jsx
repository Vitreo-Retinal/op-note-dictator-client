import { useEffect, useState } from "react";
import { T, DOCTOR_ORDER, RESPONSIVE_CSS, appBar } from "./theme.js";
import { fetchSchedule, scheduleOk, ymdOf, dateOfYmd, shortDate, doctorHalves, eventsOf, eventTime } from "./lib/vraSchedule.js";
import { Pill, EventsCard } from "./SchedulePhone.jsx";
import { BackIcon } from "./icons.jsx";

// ── LEA Hub schedule (Oct 2026, approved mockup "retina-rx-front-mockup") ──
// The WHOLE doctor schedule from the VRA calendar — every doctor at every
// site, AM/PM, doctor on call, doctor vacations (red), closures and general
// events — with Lexington (LEX) highlighted. No techs, managers, front desk or
// staff vacations: the server sends LEA tokens a doctor-only view
// (server lib/lea-schedule.js), and nothing here reads those fields.

export const HIGHLIGHT_SITE = "LEX";
export const SITE_NAME = { WORC: "Worcester", LEOM: "Leominster", LEX: "Lexington", UMASS: "UMass", VALEDA: "Valeda" };
export const siteName = (s) => SITE_NAME[s] || s;

const card = { background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.rLg };
const secH = { fontSize: 11.5, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: T.muted, margin: "12px 0 6px" };
const muted = { fontSize: 13, color: T.muted };

/** Loads `days` days of the (LEA-filtered) schedule once `enabled`. null = loading. */
export function useLeaSchedule(days = 31, enabled = true) {
  const [sched, setSched] = useState(null);
  useEffect(() => {
    if (!enabled) { setSched(null); return undefined; }
    let alive = true;
    fetchSchedule(days).then((d) => { if (alive) setSched(d); });
    return () => { alive = false; };
  }, [days, enabled]);
  return sched;
}

// ── Site chip: LEX accent-filled, LEOM amber, others neutral ──
function SiteChip({ site }) {
  const lex = site === HIGHLIGHT_SITE;
  const leom = site === "LEOM";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", height: 22, padding: "0 7px", borderRadius: 6,
      fontSize: 11.5, fontWeight: lex ? 600 : 500, whiteSpace: "nowrap",
      background: lex ? T.accent : leom ? T.amberSoft : "#EEF2F5", color: lex ? T.onAccent : leom ? T.amber : T.ink,
    }}>{site}</span>
  );
}

function HalfCell({ sites, out }) {
  if (sites.length) return <span style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>{sites.map((s) => <SiteChip key={s} site={s} />)}</span>;
  if (out) return <span style={{ display: "inline-flex", alignItems: "center", height: 22, padding: "0 7px", borderRadius: 6, background: T.redSoft, color: T.red, fontSize: 11.5, fontWeight: 600 }}>Out</span>;
  return <span style={{ display: "inline-flex", alignItems: "center", height: 22, padding: "0 7px", color: T.muted, fontSize: 12 }}>—</span>;
}

/** Rows for one day: every known doctor plus anyone on the calendar; LEX first, then working, then off, then out. */
export function doctorRows(day) {
  const names = [...DOCTOR_ORDER];
  for (const s of day.sessions || []) if (!names.includes(s.doctor)) names.push(s.doctor);
  for (const d of day.vacations || []) if (!names.includes(d)) names.push(d);
  const rows = names.map((doc) => {
    const h = doctorHalves(day.sessions, doc);
    const out = (day.vacations || []).includes(doc);
    const lex = h.AM.includes(HIGHLIGHT_SITE) || h.PM.includes(HIGHLIGHT_SITE);
    const working = h.AM.length + h.PM.length > 0;
    return { doc, h, out, rank: lex ? 0 : working ? 1 : out ? 3 : 2 };
  });
  const order = (d) => { const i = names.indexOf(d); return i === -1 ? names.length : i; };
  return rows.sort((a, b) => a.rank - b.rank || order(a.doc) - order(b.doc));
}

/** Doctor × AM/PM grid for one day, then the on-call row. */
export function DoctorsGrid({ day, style }) {
  const rows = doctorRows(day);
  const onCall = day.onCall || {};
  return (
    <div style={{ ...card, padding: "8px 12px", ...style }}>
      {day.closed && (
        <div style={{ marginBottom: 6 }}>
          <span style={{ display: "inline-flex", padding: "2px 9px", borderRadius: 999, background: T.amberSoft, color: T.amber, fontSize: 12.5, fontWeight: 600 }}>
            VRA closed{day.closureName ? ` · ${day.closureName}` : ""}
          </span>
        </div>
      )}
      {(!day.closed || (day.sessions || []).length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "56px 1fr 1fr", columnGap: 8, rowGap: 5, alignItems: "center" }}>
          <span />
          <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".06em", color: T.muted }}>AM</span>
          <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".06em", color: T.muted }}>PM</span>
          {rows.map((r) => [
            <span key={`${r.doc}-n`}><Pill doctor={r.doc} /></span>,
            <HalfCell key={`${r.doc}-a`} sites={r.h.AM} out={r.out} />,
            <HalfCell key={`${r.doc}-p`} sites={r.h.PM} out={r.out} />,
          ])}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, paddingTop: 7, borderTop: `1px solid ${T.line}`, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: T.muted, width: 56 }}>On call</span>
        {onCall.doctor ? <Pill doctor={onCall.doctor} /> : <span style={muted}>—</span>}
        {onCall.doctor && onCall.doctorThrough && onCall.doctorThrough !== day.date && (
          <span style={{ fontSize: 12, color: T.muted }}>through {shortDate(onCall.doctorThrough)}</span>
        )}
      </div>
    </div>
  );
}

/** Closures and events from today on (one line per item; a multi-day event once). */
export function comingUpItems(days, todayYmd) {
  const out = [];
  const seenEv = new Map(); // title → last date seen (fold consecutive days)
  for (const d of [...days].filter((x) => x.date >= todayYmd).sort((a, b) => (a.date < b.date ? -1 : 1))) {
    if (d.closed) out.push({ key: `c${d.date}`, date: d.date, kind: "closed", text: `Closed${d.closureName ? ` · ${d.closureName}` : ""}` });
    for (const ev of eventsOf(d)) {
      const prev = seenEv.get(ev.title);
      seenEv.set(ev.title, d.date);
      if (prev && (dateOfYmd(d.date) - dateOfYmd(prev)) / 864e5 <= 1.5) continue;
      out.push({ key: `e${d.date}${ev.title}${ev.start}`, date: d.date, kind: "event", text: ev.title, time: eventTime(ev) });
    }
  }
  return out;
}

export function ComingUp({ days, todayYmd, max = 4, onMore, style }) {
  const items = comingUpItems(days, todayYmd);
  const shown = items.slice(0, max);
  return (
    <div style={{ ...card, padding: "4px 12px", ...style }}>
      {!shown.length && <div style={{ ...muted, padding: "6px 0" }}>No closures or events in the next weeks.</div>}
      {shown.map((it, i) => (
        <div key={it.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderTop: i ? `1px solid ${T.line}` : 0, minWidth: 0 }}>
          <span style={{ width: 74, flex: "none", fontSize: 12, color: T.muted, fontVariantNumeric: "tabular-nums" }}>{it.date === todayYmd ? "Today" : shortDate(it.date)}</span>
          {it.kind === "closed"
            ? <span style={{ display: "inline-flex", padding: "2px 9px", borderRadius: 999, background: T.amberSoft, color: T.amber, fontSize: 12.5, fontWeight: 600 }}>{it.text}</span>
            : <span style={{ fontSize: 13, color: T.ink, minWidth: 0, overflowWrap: "anywhere" }}>{it.text} <span style={{ color: T.muted, fontSize: 12 }}>· {it.time}</span></span>}
        </div>
      ))}
      {items.length > shown.length && (
        <button type="button" onClick={onMore} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: 0, borderTop: `1px solid ${T.line}`, padding: "7px 0", color: T.accent, fontFamily: T.sans, fontSize: 12.5, cursor: onMore ? "pointer" : "default" }}>
          +{items.length - shown.length} more · see Schedule
        </button>
      )}
    </div>
  );
}

/** One doctor's day: { AM, PM } site lists + out flag. */
export function doctorDay(day, id) {
  const h = doctorHalves(day.sessions, id);
  return { ...h, out: (day.vacations || []).includes(id) };
}

/** First day after today with a Lexington session for this doctor → { date, halves: "AM + PM" | "AM" | "PM" } or null. */
export function nextLexDay(days, id, todayYmd) {
  for (const d of [...days].sort((a, b) => (a.date < b.date ? -1 : 1))) {
    if (d.date <= todayYmd) continue;
    const h = doctorHalves(d.sessions, id);
    const am = h.AM.includes(HIGHLIGHT_SITE), pm = h.PM.includes(HIGHLIGHT_SITE);
    if (am || pm) return { date: d.date, halves: am && pm ? "AM + PM" : am ? "AM" : "PM" };
  }
  return null;
}

/** Days for the schedule strip: today on, weekdays plus any weekend with sessions or a closure. */
export function stripDays(days, todayYmd, n = 10) {
  return days.filter((d) => {
    if (d.date < todayYmd) return false;
    const w = dateOfYmd(d.date).getDay();
    return (w !== 0 && w !== 6) || (d.sessions || []).length > 0 || d.closed || eventsOf(d).length > 0;
  }).slice(0, n);
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Schedule page (phone and desktop). Phone: in-page heading, a day strip, the
 * selected day. Desktop: app bar with "← Hub", same body in an 880px column.
 */
export function LeaSchedulePage({ phone, sched, onBack }) {
  const todayYmd = ymdOf(new Date());
  const ok = scheduleOk(sched);
  const days = ok ? stripDays(sched.days, todayYmd, phone ? 10 : 12) : [];
  const [sel, setSel] = useState(null);
  const selected = days.find((d) => d.date === sel) || days[0] || null;

  const body = (
    <>
      {!ok && <div style={{ ...card, padding: "10px 12px", ...muted }}>{sched === null ? "Loading schedule…" : "Schedule unavailable"}</div>}
      {ok && days.length > 0 && (
        <div role="tablist" aria-label="Days" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none" }}>
          {days.map((d) => {
            const on = selected && d.date === selected.date;
            const dt = dateOfYmd(d.date);
            const lex = (d.sessions || []).some((s) => s.site === HIGHLIGHT_SITE);
            return (
              <button key={d.date} type="button" role="tab" aria-selected={on} onClick={() => setSel(d.date)}
                style={{ flex: phone ? "0 0 54px" : "1 0 60px", minHeight: 50, borderRadius: 8, border: `1px solid ${on ? T.accent : T.line}`, background: on ? T.accent : T.surface,
                  color: on ? T.onAccent : T.ink, fontFamily: T.sans, fontSize: 12, lineHeight: 1.25, cursor: "pointer", padding: "4px 2px", position: "relative" }}>
                <span style={{ display: "block", fontWeight: 500, color: on ? T.onAccent : T.muted }}>{d.date === todayYmd ? "Today" : DOW[dt.getDay()]}</span>
                <b style={{ display: "block", fontSize: 14, fontWeight: 600 }}>{dt.getDate()}</b>
                {d.closed
                  ? <span style={{ position: "absolute", top: 4, right: 5, width: 6, height: 6, borderRadius: 999, background: on ? T.goldSoft : T.gold }} title="Closed" />
                  : lex && <span style={{ position: "absolute", top: 4, right: 5, width: 6, height: 6, borderRadius: 999, background: on ? T.onAccent : T.accent }} title="Lexington" />}
              </button>
            );
          })}
        </div>
      )}
      {selected && (
        <>
          <div style={secH}>{shortDate(selected.date)} · Doctors</div>
          <DoctorsGrid day={selected} />
          {eventsOf(selected).length > 0 && (
            <>
              <div style={secH}>Events</div>
              <EventsCard day={selected} />
            </>
          )}
          <div style={{ ...muted, fontSize: 12, margin: "10px 2px 0", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <SiteChip site={HIGHLIGHT_SITE} /> Lexington · <span style={{ color: T.red, fontWeight: 600 }}>Out</span> = vacation · From the VRA calendar
          </div>
        </>
      )}
      {ok && (
        <>
          <div style={secH}>Coming up</div>
          <ComingUp days={sched.days} todayYmd={todayYmd} max={8} />
        </>
      )}
    </>
  );

  if (phone) {
    return (
      <div style={{ padding: "0 16px 12px", fontFamily: T.sans, color: T.ink }}>
        <div style={{ padding: "14px 0 8px" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", margin: 0 }}>Schedule</h1>
          <div style={{ fontSize: 12.5, color: T.muted, marginTop: 2 }}>All doctors · Lexington highlighted</div>
        </div>
        {body}
      </div>
    );
  }
  return (
    <div style={{ minHeight: "100vh", background: T.paper, fontFamily: T.sans, color: T.ink }}>
      <style>{RESPONSIVE_CSS}</style>
      <header className="vra-bar" style={appBar}>
        <button type="button" onClick={onBack}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px 0 8px", borderRadius: 8, border: `1px solid ${T.line}`, background: T.surface, color: T.accent, fontFamily: T.sans, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
          <BackIcon /> Hub
        </button>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Schedule</div>
        <div style={{ flex: 1 }} />
        <div className="vra-bar-hide" style={{ fontSize: 13, color: T.muted }}>All doctors · Lexington highlighted</div>
      </header>
      <div className="vra-wrap" style={{ maxWidth: 880, margin: "0 auto", padding: "16px 24px 40px" }}>{body}</div>
    </div>
  );
}

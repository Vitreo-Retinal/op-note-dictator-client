import { useState, useEffect, Fragment } from "react";
import { majorHoliday, halfDayNote, injectionBlackout } from "./lib/practiceCalendar.js";
import { fetchSchedule, scheduleOk, ymdOf, dateOfYmd, shortDate, sessionsBySite, techBack, translatorOf, managersOf, frontDeskOf, eventsOf, eventTime, imagingOf, leaStaffOf, isLeaStaffEvent } from "./lib/vraSchedule.js";
import { T, SITE_TINTS, TRANSLATOR, IMAGING, doctorColor } from "./theme.js";
import { AlertIcon } from "./icons.jsx";
import DayStepper, { scheduleRange } from "./DayStepper.jsx";
import PhoneText from "./PhoneText.jsx";
import { useFuWindow, FuSiteNodes, FuSuggestions, fuReasonColor } from "./FuSuggestions.jsx";
import { fuCalReason } from "./lib/fuWindow.js";

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

// Staff line (Oct 2026): "<label>  Aundrea · WORC · Brittany · LEOM ext. 1234".
// Used for "Managers" and "Front desk". `people` = managersOf / frontDeskOf.
// One line, never wraps; vacation / out in red (amber is Leominster only). `extra` (optional)
// renders after each person's text, e.g. a muted "(vacation from Thu)".
// `stacked` (phones): one person per line, never truncated.
export function ManagersLine({ managers, ...rest }) {
  return <StaffLine label="Managers" people={managers} {...rest} />;
}

// General calendar events (Oct 2026): "<label>  6:00–9:00 PM · Title  location"
// — neutral ink/muted, one entry after another, wraps if needed. Nothing when none.
export function EventsLine({ events, label = "Events", style, labelStyle }) {
  if (!events || !events.length) return null;
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontFamily: T.sans, fontSize: 12.5, minWidth: 0, ...style }}>
      <span style={{ fontSize: 12, color: T.muted, flex: "none", ...labelStyle }}>{label}</span>
      <span style={{ minWidth: 0, flex: 1, display: "flex", flexWrap: "wrap", gap: "2px 16px" }}>
        {events.map((ev, i) => (
          <span key={`${ev.title}|${ev.start}|${i}`} style={{ minWidth: 0, overflowWrap: "anywhere" }}>
            <span style={{ color: T.ink2, fontWeight: 600, whiteSpace: "nowrap" }}>{eventTime(ev)}</span>
            <span style={{ color: T.muted }}> · </span>
            <span style={{ color: T.ink }}><PhoneText text={ev.title} /></span>
            {ev.location && <span style={{ color: T.muted, fontSize: 12 }}> — <PhoneText text={ev.location} /></span>}
          </span>
        ))}
      </span>
    </div>
  );
}

// `flow` (with stacked, Front desk): working people share wrapping lines
// ("Sandy 6:30–3:00 · Lisa 8:00–close"); off / out / vacation get a line each.
export function StaffLine({ label, people, extra, style, labelStyle, stacked = false, flow = false }) {
  const managers = people;
  if (!managers || !managers.length) return null;
  const tone = { in: T.ink2, vacation: T.red, out: T.red };
  // Front desk at Leominster (sheet "Kim 6:30-3:00 LEOM") reads like the LEOM tech card.
  const colorOf = (m) => (m.tone === "in" && m.site && SITE_TINTS[m.site] && m.site !== "WORC" ? SITE_TINTS[m.site].text : tone[m.tone] || T.ink2);
  const item = (m) => (
    <Fragment key={m.name}>
      <span style={{ color: colorOf(m), fontWeight: m.tone === "vacation" || m.tone === "out" || (m.site && m.site !== "WORC") ? 600 : 500 }}><PhoneText text={m.text} /></span>
      {extra && extra[m.name] && <span style={{ color: /^\((vacation|out)\b/.test(extra[m.name]) ? T.red : T.muted, fontSize: 12 }}> {extra[m.name]}</span>}
    </Fragment>
  );
  if (stacked && flow) {
    const working = managers.filter((m) => m.tone === "in");
    const rest = managers.filter((m) => m.tone !== "in");
    return (
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontFamily: T.sans, fontSize: 13, minWidth: 0, ...style }}>
        <span style={{ fontSize: 12, color: T.muted, flex: "none", paddingTop: 1, ...labelStyle }}>{label}</span>
        <span style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          {working.length > 0 && (
            <span>
              {working.map((m, i) => (
                <Fragment key={m.name}>
                  {i > 0 && <span style={{ color: T.lineStrong }}> · </span>}
                  <span style={{ whiteSpace: "nowrap" }}>{item(m)}</span>
                </Fragment>
              ))}
            </span>
          )}
          {rest.map((m) => <span key={m.name} style={{ overflowWrap: "anywhere" }}>{item(m)}</span>)}
        </span>
      </div>
    );
  }
  if (stacked) {
    return (
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontFamily: T.sans, fontSize: 13, minWidth: 0, ...style }}>
        <span style={{ fontSize: 12, color: T.muted, flex: "none", paddingTop: 1, ...labelStyle }}>{label}</span>
        <span style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          {managers.map((m) => <span key={m.name} style={{ overflowWrap: "anywhere" }}>{item(m)}</span>)}
        </span>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: T.sans, fontSize: 12.5, minWidth: 0, ...style }}>
      <span style={{ fontSize: 12, color: T.muted, flex: "none", ...labelStyle }}>{label}</span>
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
        {managers.map((m, i) => (
          <Fragment key={m.name}>
            {i > 0 && <span style={{ color: T.lineStrong }}> · </span>}
            {item(m)}
          </Fragment>
        ))}
      </span>
    </div>
  );
}

// Oct 2026 (owner-approved): a day stepper in the header (‹ date › Today)
// lets the desktop board show another day in the loaded range. Everything
// day-specific follows the picked day; the F/U counter and the injection
// blackout banner always count from the real today. Not persisted.
// onOpenSchedule(ymd | null): null = today.
//
// LEA Hub (Oct 2026, per Mari: "the same look as the VRA hub, just the techs
// different"): hub="lea" shows the same board. Techs come from the calendar's
// LEA line ("LEA · BKH: Ashley, Dom, Tony, Bill · Imaging: Mairead") with
// OCT/FP in its own color, that line is kept out of "Events", and Managers /
// Front desk are not shown. LEA passes its own loaded schedule as `sched`
// (the server already sends LEA tokens the doctor-only view).
// VRA (Oct 2026, per Mari): an Imaging row from Nana's sheet (Tami most days).
//
// F/U clinic days (Oct 2026): the counter shows the same clinic-day check and
// "Nearest clinic days" pills as the note page's F/U calculator (shared code in
// ./FuSuggestions.jsx + ./lib/fuWindow.js), for ONE doctor:
//   · signedInDoctor (a doctor who passed the PIN and is still unlocked) → that
//     doctor, shown as a fixed chip;
//   · otherwise a compact initials picker (from `doctors`, the hub's SURGEONS),
//     remembered per device and hub in localStorage; first default =
//     `doctorHint` (VRA: the doctor who last passed the PIN on this device).
// No doctor chosen (or no `doctors` passed) → the counter is exactly as before.
// Practice calendar only — the personal hub_surgeon_schedule blocks the note
// page also checks for MR are not read here.
const fuDocKey = (hub) => `${hub === "lea" ? "lea" : "vra"}-hub-fu-doctor`;
function readFuDoc(key) { try { return localStorage.getItem(key); } catch { return null; } }
function writeFuDoc(key, v) { try { localStorage.setItem(key, v); } catch { /* private mode */ } }

export default function CallBoard({ onOpenSchedule, hub = "vra", sched: given, doctors, signedInDoctor = null, doctorHint = null }) {
  const lea = hub === "lea";
  const [fetched, setFetched] = useState(null); // null = loading
  const sched = given !== undefined ? given : fetched;
  const [fuWeeks, setFuWeeks] = useState("");
  const doctorIds = (doctors || []).map((d) => d.id);
  const signedIn = signedInDoctor && doctorIds.includes(signedInDoctor) ? signedInDoctor : null;
  // Picked doctor for the F/U clinic days; "" = none. A stored "" (explicit
  // "Doctor…" pick) wins over the hint; never stored → the hint.
  const [fuPick, setFuPick] = useState(() => {
    const stored = readFuDoc(fuDocKey(hub));
    if (stored !== null) return doctorIds.includes(stored) ? stored : "";
    return doctorHint && doctorIds.includes(doctorHint) ? doctorHint : "";
  });
  const pickFuDoc = (id) => { setFuPick(id); writeFuDoc(fuDocKey(hub), id); };
  const fuDoctor = signedIn || (doctorIds.includes(fuPick) ? fuPick : "");
  const [picked, setPicked] = useState(null); // YYYY-MM-DD, null = today

  // Fetch once on mount. Never throws — a dead feed must never blank the card.
  useEffect(() => {
    if (given !== undefined) return undefined; // the hub loads it (LEA)
    let alive = true;
    fetchSchedule(14).then((data) => { if (alive) setFetched(data); });
    return () => { alive = false; };
  }, [given !== undefined]);

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
  const todayYmd = ymdOf(today);
  // The day the board shows (‹ › / date picker). Clamped to the loaded range.
  const [minYmd, maxYmd] = scheduleRange(sched, todayYmd, ok);
  const shownYmd = picked && picked >= minYmd && picked <= maxYmd ? picked : todayYmd;
  const isToday = shownYmd === todayYmd;
  const when = isToday ? "today" : "that day";
  const pickDay = (ymd) => setPicked(ymd === todayYmd ? null : ymd);
  const dayHoliday = majorHoliday(dateOfYmd(shownYmd));
  const dayHalf = halfDayNote(dateOfYmd(shownYmd)); // open day — note only, never "closed"
  const shownDay = ok ? sched.days.find((d) => d.date === shownYmd) || null : null;
  const onCall = shownDay ? shownDay.onCall : null;

  const n = parseInt(fuWeeks, 10);
  const fuDate = fuWeeks && n > 0 ? new Date(today.getTime() + n * 7 * 24 * 60 * 60 * 1000) : null;
  const fuHoliday = fuDate ? majorHoliday(fuDate) : null;
  const fuHalf = fuDate ? halfDayNote(fuDate) : null;
  const fuCall = fuDate ? callFor(fuDate) : null;
  // Injection blackout banner — shown when TODAY or the computed F/U date is Jan 1–14.
  const blackout = injectionBlackout(fuDate) || injectionBlackout(today);
  // That doctor's clinic day / nearest clinic days (null → plain counter).
  const fuWin = useFuWindow({ doctor: fuDoctor, targetYmd: fuDate ? ymdOf(fuDate) : null, hub, todaySched: sched });
  const fuOff = !!(fuWin && !fuWin.target.clinic);
  const fuReason = fuCalReason(fuWin);
  // "You're on vacation" reads wrong to a tech picking a doctor.
  const fuReasonText = fuReason && fuReason.code === "vacation" && !signedIn ? `${fuDoctor} is on vacation` : fuReason && fuReason.text;
  const fuSelect = { height: 26, boxSizing: "border-box", background: T.surface, border: `1px solid ${T.line}`, borderRadius: 5, padding: "0 4px", fontFamily: T.sans, fontSize: 12.5, fontWeight: 600, outline: "none", cursor: "pointer", color: fuDoctor ? doctorColor(fuDoctor).fg : T.muted };

  const sites = shownDay ? sessionsBySite(shownDay.sessions) : [];
  const techs = shownDay && !lea ? shownDay.techs : null;
  const leaStaff = shownDay && lea ? leaStaffOf(shownDay) : null;
  const managers = shownDay && !lea ? managersOf(shownDay) : [];
  const frontDesk = shownDay && !lea ? frontDeskOf(shownDay) : [];
  const events = eventsOf(shownDay).filter((ev) => !lea || !isLeaStaffEvent(ev));

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
  // VRA imaging names, styled like the techs; "Tami all day" when AM = PM.
  const imgNames = (am, pm) => {
    const a = am.join(" · "), p = pm.join(" · ");
    const b = (t) => <b style={{ fontWeight: 600, color: T.accent }}>{t || "—"}</b>;
    return a && a === p ? <>{b(a)} all day</> : <>{b(a)}{sep}{b(p)}</>;
  };
  if (lea && leaStaff) {
    if (leaStaff.techs.length) techLines.push(tLine("lex", SITE_TINTS.WORC.bg, "LEX", "Techs", nm(leaStaff.techs)));
    if (leaStaff.imaging.length) {
      techLines.push(tLine("img", IMAGING.bg, "OCT/FP", "",
        <b style={{ fontWeight: 600, color: IMAGING.fg }}>{leaStaff.imaging.join(" · ")}</b>, IMAGING.fg));
    }
  }
  if (techs) {
    // Imaging sits under its site's Back row in that site's color (Mari, Oct 12:
    // the dedicated imaging tech is at Worcester).
    const imaging = imagingOf(techs);
    for (const site of ["WORC", "LEOM"]) {
      const am = techBack(techs, site, "AM"), pm = techBack(techs, site, "PM");
      if (am.length || pm.length) techLines.push(tLine(site, SITE_TINTS[site].bg, site, "Back", <>{nm(am)}{sep}{nm(pm)}</>));
      const im = imaging.find((x) => x.site === site);
      if (im) techLines.push(tLine(`img-${site}`, SITE_TINTS[site].bg, site, "Imaging", imgNames(im.am, im.pm)));
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
        <div style={{ borderBottom: `1px solid ${T.line}` }}>
        {/* Header row — day stepper (today by default) + practice holiday · F/U counter (always from today) on the right */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px 10px", flexWrap: "wrap", padding: "8px 16px", fontFamily: T.sans, fontSize: 12.5, color: T.muted }}>
          <span>Call Board</span>
          <DayStepper value={shownYmd} todayYmd={todayYmd} min={minYmd} max={maxYmd} onChange={pickDay} />
          {dayHoliday && (
            <span style={{ color: T.amber }}>{dayHoliday} — office closed</span>
          )}
          {dayHalf && (
            <span style={{ color: T.amber, fontSize: 12 }}>{dayHalf}</span>
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
            {doctorIds.length > 0 && (
              signedIn ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }} title="Clinic days for the signed-in doctor">
                  for <DocChip doctor={signedIn} />
                </span>
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  for
                  <select value={fuDoctor} onChange={(e) => pickFuDoc(e.target.value)} aria-label="Whose clinic days" title="Show this doctor's clinic days" className="vra-input" style={fuSelect}>
                    <option value="" style={{ color: T.muted }}>Dr…</option>
                    {doctorIds.map((id) => <option key={id} value={id} style={{ color: doctorColor(id).fg }}>{id}</option>)}
                  </select>
                </span>
              )
            )}
            {fuDate && (
              <>
                <span style={{ fontWeight: 600, color: fuHoliday || fuOff ? T.amber : T.ink, whiteSpace: "nowrap" }}>→ {longDate(fuDate)}</span>
                {/* VRA calendar: the doctor's site that day (+ AM/PM for a half day) */}
                {fuWin && fuWin.target.clinic && (
                  <span style={{ color: T.ink2, whiteSpace: "nowrap" }}><FuSiteNodes segments={fuWin.target.segments} /></span>
                )}
                {fuHoliday && <span style={{ color: T.amber }}>⚠ {fuHoliday} — office closed</span>}
                {/* Not that doctor's clinic day → why (unless the holiday already said), same as the note page */}
                {!fuHoliday && fuReason && (
                  <span style={{ color: fuReasonColor(fuReason), fontWeight: 600, whiteSpace: "nowrap" }}>⚠ {fuReasonText}</span>
                )}
                {fuHalf && <span style={{ color: T.amber, fontSize: 12 }}>{fuHalf}</span>}
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
        {/* Not that doctor's clinic day → nearest clinic days, same as the note page */}
        {fuDate && fuOff && (
          <div style={{ padding: "0 16px 8px", marginTop: -2, fontFamily: T.sans, fontSize: 12.5, color: T.ink2, textAlign: "right" }}>
            <FuSuggestions win={fuWin} hub={hub} />
          </div>
        )}
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

          {/* Cell 2 — where each doctor is on the shown day; one row per site, never wraps */}
          <div style={cell}>
            <div style={k}><span>{isToday ? "Today" : "That day"}</span></div>
            {!ok ? unavailable : (
              <div>
                {shownDay && shownDay.closed && (
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: T.amber, fontFamily: T.sans, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Closed{shownDay.closureName ? ` — ${shownDay.closureName}` : ""}
                  </div>
                )}
                {sites.map(({ site, docs }) => (
                  <div key={site} style={rowS}>
                    <span style={stS}>{site}</span>
                    {docs.map((d) => <DocChip key={d.doctor} doctor={d.doctor} half={d.half} />)}
                  </div>
                ))}
                {!sites.length && !(shownDay && shownDay.closed) && (
                  <div style={sub}>{shownDay ? "No clinic sessions" : `No schedule for ${when}`}</div>
                )}
                {shownDay && shownDay.vacations.length > 0 && (
                  <div style={{ ...sub, color: T.red, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Out: {shownDay.vacations.join(", ")}</div>
                )}
              </div>
            )}
          </div>

          {/* Cell 3 — techs on the shown day (from that day's tech sheet); "Full board" opens Schedule on it */}
          <div style={{ ...cell, borderRight: 0 }}>
            <div style={k}>
              <span>Techs {when}</span>
              {ok && onOpenSchedule && (
                <button type="button" className="vra-daybtn" onClick={() => onOpenSchedule(isToday ? null : shownYmd)}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: T.accent, fontFamily: T.sans, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}>
                  Full board ›
                </button>
              )}
            </div>
            {!ok ? unavailable : lea ? (
              techLines.length > 0 ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "auto auto minmax(0, 1fr)", marginLeft: -6, rowGap: 3, marginTop: 2 }}>
                    {techLines}
                  </div>
                </>
              ) : (
                <div style={sub}>No LEA tech line {when}</div>
              )
            ) : techs ? (
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
              <div style={sub}>No tech sheet {when}</div>
            )}
          </div>
        </div>

        {/* Managers + Front desk — one line each under the band, starting under On call */}
        {managers.length > 0 && (
          <ManagersLine managers={managers} labelStyle={{ width: 64 }} style={{ padding: "7px 16px", borderTop: `1px solid ${T.line}` }} />
        )}
        {frontDesk.length > 0 && (
          <StaffLine label="Front desk" people={frontDesk} labelStyle={{ width: 64 }}
            style={{ padding: managers.length > 0 ? "0 16px 7px" : "7px 16px", borderTop: managers.length > 0 ? 0 : `1px solid ${T.line}` }} />
        )}
        {ok && events.length > 0 && (
          <EventsLine events={events} label={`Events ${when}`}
            style={{ padding: "7px 16px", borderTop: `1px solid ${T.line}` }} />
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

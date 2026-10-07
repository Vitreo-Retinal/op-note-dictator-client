import { useEffect, useState } from "react";
import { T, doctorColor } from "./theme.js";
import { fetchSchedule, scheduleOk, ymdOf, dateOfYmd, shortDate, monDay, doctorHalves, techBack, managersOf } from "./lib/vraSchedule.js";
import { Pill, DoctorsCard, NextDaysStrip, nextTiles } from "./SchedulePhone.jsx";
import { ManagersLine } from "./CallBoard.jsx";
import { BriefcaseIcon, LockIcon, ChevronRightIcon } from "./icons.jsx";

// ── Phone Home (Oct 2026, approved mockup "home-compact" A + B) ──────
// One screen, no scrolling at 390×844: header, (doctor only) "your day" card,
// on call + managers, doctors today, alerts for the next 7 days, two big
// buttons, and a Manager hub row (PIN). Other desktop tools are not on the phone. The tab bar already carries
// Schedule · Inject · Coding · Notes, so those are not repeated here.
// Everything comes from GET /api/schedule; a row whose data is missing is
// left out rather than guessed.

const DOW_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const card = { background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.rLg, marginBottom: 8, overflow: "hidden" };
const rowS = (first) => ({ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", minHeight: 36, boxSizing: "border-box", borderTop: first ? 0 : `1px solid ${T.line}`, fontSize: 13.5, minWidth: 0 });
const keyS = { width: 68, flex: "none", fontSize: 12, color: T.muted, lineHeight: 1.25 };
const valS = { flex: 1, minWidth: 0, color: T.ink, lineHeight: 1.35 };
const secH = { fontSize: 11.5, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: T.muted, margin: "10px 0 5px" };

// "Thu" when the date is within the coming week, else "Oct 19".
function throughText(ymd, todayYmd) {
  const d = dateOfYmd(ymd);
  const days = Math.round((d - dateOfYmd(todayYmd)) / 864e5);
  return days >= 0 && days < 7 ? DOW_SHORT[d.getDay()] : monDay(ymd);
}

const uniq = (arr) => [...new Set(arr)];

/** Doctor's sites today: "<b>LEOM</b> AM · <b>off</b> PM", "<b>WORC</b> all day", or "off". */
function yourDay(day, id) {
  const { AM, PM } = doctorHalves(day.sessions, id);
  const sites = (list) => list.length ? <b style={{ fontWeight: 600 }}>{list.join(" + ")}</b> : <b style={{ fontWeight: 600, color: T.muted }}>off</b>;
  if (!AM.length && !PM.length) return { text: <b style={{ fontWeight: 600, color: T.muted }}>off</b>, site: null, halves: [] };
  const first = AM[0] || PM[0];
  const halves = ["AM", "PM"].filter((h) => (h === "AM" ? AM : PM).includes(first));
  if (AM.join() === PM.join()) return { text: <>{sites(AM)} all day</>, site: first, halves };
  return { text: <>{sites(AM)} AM · {sites(PM)} PM</>, site: first, halves };
}

/** "Back Stephanie · Workup Yarelis, Jenn R" for the halves the doctor is at that site. null when unknown. */
function siteTechs(techs, site, halves) {
  if (!techs || !site || !halves.length) return null;
  const hasRoles = !!(techs.roles && techs.roles[site]);
  if (!hasRoles && site !== "WORC" && site !== "LEOM") return null;
  const back = uniq(halves.flatMap((h) => techBack(techs, site, h)));
  const workup = hasRoles ? uniq(halves.flatMap((h) => (techs.roles[site][h] && techs.roles[site][h].workup) || [])) : [];
  // One name never breaks across lines ("Jenn R").
  const names = (list) => list.map((n, i) => <span key={n} style={{ whiteSpace: "nowrap" }}>{i ? ", " : ""}{n}</span>);
  const parts = [];
  if (back.length) parts.push(<span key="b"><span style={{ color: T.muted }}>Back</span> <b style={{ fontWeight: 600, color: T.accent }}>{names(back)}</b></span>);
  if (workup.length) parts.push(<span key="w">{parts.length ? " · " : ""}<span style={{ color: T.muted }}>Workup</span> {names(workup)}</span>);
  return parts.length ? parts : null;
}

/** Closures and doctor vacations from today through today+7, as short amber lines. */
function alertsOf(days, todayYmd) {
  const end = ymdOf(new Date(dateOfYmd(todayYmd).getTime() + 7 * 864e5));
  const win = days.filter((d) => d.date >= todayYmd && d.date <= end).sort((a, b) => (a.date < b.date ? -1 : 1));
  const out = [];
  for (const d of win) {
    if (d.closed) out.push({ key: `c${d.date}`, date: d.date, text: `${shortDate(d.date)} — office closed${d.closureName ? ` (${d.closureName})` : ""}` });
  }
  // Vacation runs per doctor; a weekend gap does not break a run.
  const runs = new Map();
  const onlyWeekendBetween = (a, b) => {
    for (let t = dateOfYmd(a).getTime() + 864e5; t < dateOfYmd(b).getTime() - 36e5; t += 864e5) {
      const w = new Date(t).getDay();
      if (w !== 0 && w !== 6) return false;
    }
    return true;
  };
  for (const d of win) {
    for (const doc of d.vacations || []) {
      const list = runs.get(doc) || [];
      const last = list[list.length - 1];
      if (last && onlyWeekendBetween(last.end, d.date)) last.end = d.date;
      else list.push({ start: d.date, end: d.date });
      runs.set(doc, list);
    }
  }
  for (const [doc, list] of runs) {
    for (const r of list) {
      const text = r.start === todayYmd
        ? (r.end === todayYmd ? `${doc} out today` : `${doc} out through ${shortDate(r.end)}`)
        : r.start === r.end ? `${doc} out ${shortDate(r.start)}` : `${doc} out ${shortDate(r.start)} – ${shortDate(r.end)}`;
      out.push({ key: `v${doc}${r.start}`, date: r.start, text });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/**
 * Props: role ("doctor" | "tech" | "manager"), doctor (unlocked surgeon or
 * null), managerOpen (manager PIN passed today), onDictate, onCoverage,
 * onSelectManager, onLock, onSwitch (clears the role → role picker).
 *
 * Roles (Oct 2026): doctor = the view above (two buttons + Manager hub row
 * last). Tech = one full-width "Check coverage", no Dictate, no Manager hub.
 * Manager = Manager hub row on top, one full-width "Check coverage" last.
 * Front desk = the staff view plus a "Next days" strip under Doctors today
 * (tile → Schedule on that day, via onOpenDay). Still one screen at 390×844
 * with up to three alerts; if it ever overflows, fold the alerts to one
 * "N alerts ›" line that calls onOpenSchedule.
 */
export default function HomePhone({ role = "doctor", doctor, managerOpen, onDictate, onCoverage, onSelectManager, onLock, onSwitch, onOpenSchedule, onOpenDay }) {
  const [sched, setSched] = useState(null); // null = loading

  useEffect(() => {
    let alive = true;
    fetchSchedule(31).then((data) => { if (alive) setSched(data); });
    return () => { alive = false; };
  }, []);

  const now = new Date();
  const todayYmd = ymdOf(now);
  const dateWords = `${DOW_LONG[now.getDay()]}, ${MON[now.getMonth()]} ${now.getDate()}`;
  const ok = scheduleOk(sched);
  const loading = sched === null;
  const day = ok ? sched.days.find((d) => d.date === todayYmd) || null : null;
  const onCall = day ? day.onCall : null;
  const managers = day ? managersOf(day) : [];
  const alerts = ok ? alertsOf(sched.days, todayYmd) : [];
  const status = <span style={{ fontSize: 13, color: T.muted }}>{loading ? "Loading schedule…" : "Schedule unavailable"}</span>;

  // ── Doctor card rows (only rows with data) ──
  const docRows = [];
  if (doctor && day) {
    const yd = yourDay(day, doctor.id);
    docRows.push(["Your day", yd.text]);
    if (onCall && onCall.doctor === doctor.id) {
      docRows.push(["Your call", onCall.doctorThrough ? `Now, through ${throughText(onCall.doctorThrough, todayYmd)}` : "Now"]);
    } else {
      const next = sched.days.find((d) => d.date > todayYmd && d.onCall && d.onCall.doctor === doctor.id);
      docRows.push(["Your call", next ? `Next: week of ${monDay(next.date)}` : "None in the next 4 weeks"]);
    }
    const tx = siteTechs(day.techs, yd.site, yd.halves);
    if (tx) docRows.push([`${yd.site} techs`, tx]);
  }
  const dc = doctor ? doctorColor(doctor.id) : null;

  const bigBtn = (primary) => ({
    display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", gap: 3,
    minHeight: 56, padding: "10px 12px", borderRadius: T.rLg, cursor: "pointer", fontFamily: T.sans, textAlign: "left",
    background: primary ? T.accent : T.surface, color: primary ? T.onAccent : T.accent,
    border: `1px solid ${primary ? T.accent : T.line}`, fontSize: 14.5, fontWeight: 600, boxSizing: "border-box",
  });
  const btnSub = (primary) => ({ fontSize: 11.5, fontWeight: 400, color: primary ? "rgba(255,255,255,.85)" : T.muted });

  const dictate = (
    <button key="d" type="button" onClick={onDictate} style={bigBtn(!!doctor)}>
      Dictate a note<span style={btnSub(!!doctor)}>{doctor ? "Straight to Input" : "Your space, PIN"}</span>
    </button>
  );
  const coverage = (
    <button key="c" type="button" onClick={onCoverage} style={bigBtn(!doctor)}>
      Check coverage<span style={btnSub(!doctor)}>Insurance · drug · PA</span>
    </button>
  );
  const isDoctor = role === "doctor";
  const isManager = role === "manager";
  const isFrontDesk = role === "frontdesk";
  const tiles = isFrontDesk && ok ? nextTiles(sched, todayYmd) : [];

  // Manager hub — runs the manager PIN flow (skipped when unlocked today).
  const managerRow = (
    <button type="button" onClick={onSelectManager}
      style={{ ...card, display: "flex", alignItems: "center", gap: 12, width: "100%", height: 52, padding: "0 12px", fontFamily: T.sans, color: T.ink, cursor: "pointer", textAlign: "left", boxSizing: "border-box" }}>
      <span style={{ color: T.accent, display: "flex", flex: "none" }}><BriefcaseIcon /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 600, lineHeight: 1.25 }}>Manager hub</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: T.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {managerOpen ? "Drug economics, rates, staff" : <><LockIcon size={11} />PIN required · drug economics, rates, staff</>}
        </span>
      </span>
      <span style={{ color: T.muted, display: "flex", flex: "none" }}><ChevronRightIcon /></span>
    </button>
  );
  const linkBtn = { display: "flex", alignItems: "center", gap: 5, minHeight: 32, padding: "0 4px", background: "none", border: 0, color: T.muted, fontFamily: T.sans, fontSize: 12.5, cursor: "pointer", whiteSpace: "nowrap" };

  return (
    <div style={{ padding: "0 16px", fontFamily: T.sans, color: T.ink }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, padding: "14px 0 8px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.25, color: T.ink, margin: 0 }}>
            {doctor ? `Good ${now.getHours() < 12 ? "morning" : "afternoon"}, ${doctor.name}` : dateWords}
          </h1>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 1 }}>{doctor ? dateWords : "VRA today"}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", flex: "none" }}>
          {doctor && (
            <>
              <button type="button" onClick={onLock} aria-label={`Lock ${doctor.name}'s space`} style={linkBtn}>
                <LockIcon />Lock
              </button>
              <span style={{ color: T.muted, fontSize: 12.5 }}>·</span>
            </>
          )}
          <button type="button" onClick={onSwitch} style={linkBtn}>Switch view</button>
        </div>
      </div>

      {/* Manager: the hub is the top row */}
      {isManager && managerRow}

      {/* Doctor-only: your day */}
      {doctor && docRows.length > 0 && (
        <div style={{ ...card, background: dc.soft, borderColor: `${dc.fg}33` }}>
          {docRows.map(([k, v], i) => (
            <div key={k} style={{ ...rowS(i === 0), borderTopColor: `${dc.fg}26` }}>
              <span style={keyS}>{k}</span>
              <span style={valS}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* On call + managers */}
      <div style={card}>
        <div style={rowS(true)}>
          <span style={keyS}>On call</span>
          {!ok ? status : onCall && onCall.doctor ? (
            <span style={{ ...valS, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <Pill doctor={onCall.doctor} />
              <span style={{ fontSize: 12.5, color: T.muted }}>
                {[onCall.doctorThrough && `through ${throughText(onCall.doctorThrough, todayYmd)}`, onCall.tech && `Tech ${onCall.tech}`].filter(Boolean).join(" · ")}
              </span>
            </span>
          ) : <span style={{ ...valS, color: T.muted }}>—</span>}
        </div>
        {managers.length > 0 && (
          <ManagersLine managers={managers} stacked labelStyle={{ width: 68 }}
            style={{ ...rowS(false), fontSize: 13, gap: 8 }} />
        )}
      </div>

      {/* Doctors today */}
      {day && (
        <>
          <div style={secH}>Doctors today</div>
          <DoctorsCard day={day} style={{ marginBottom: 8 }} />
        </>
      )}

      {/* Front desk: next days — tap a tile for that day's schedule */}
      {isFrontDesk && tiles.length > 0 && (
        <>
          <div style={secH}>Next days <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>· on call</span></div>
          <NextDaysStrip tiles={tiles} onPick={onOpenDay} style={{ marginBottom: 8 }} />
        </>
      )}

      {/* Alerts — next 7 days */}
      {alerts.slice(0, 3).map((a) => (
        <div key={a.key} style={{ marginBottom: 6, padding: "6px 12px", borderRadius: T.r, background: T.amberSoft, border: "1px solid #F4E3A7", color: T.amber, fontSize: 13, fontWeight: 500 }}>
          {a.text}
        </div>
      ))}
      {alerts.length > 3 && (
        <div style={{ margin: "-2px 0 6px 12px", fontSize: 12, color: T.muted }}>+{alerts.length - 3} more this week · see Schedule</div>
      )}

      {/* Doctor: two big actions. Tech / Manager: one full-width "Check coverage". */}
      {isDoctor ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "10px 0 8px" }}>
          {doctor ? [dictate, coverage] : [coverage, dictate]}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", margin: "10px 0 8px" }}>{coverage}</div>
      )}

      {/* Doctor: Manager hub row last */}
      {isDoctor && managerRow}
    </div>
  );
}

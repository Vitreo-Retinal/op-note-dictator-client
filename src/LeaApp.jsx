import { useEffect, useState } from "react";
import ClinicNoteGenerator from "./ClinicNoteGenerator.jsx";
import CptReference from "./CptReference.jsx";
import PatientEducation from "./PatientEducation.jsx";
import Documents from "./Documents.jsx";
import IntakeHpi from "./IntakeHpi.jsx";
import DropSchedule from "./DropSchedule.jsx";
import { SURGEONS, PinGate, DoctorPicker } from "./App.jsx";
import { S, T, appBar, tile, iconBox, secHead, avatar, RESPONSIVE_CSS, doctorColor } from "./theme.js";
import { InjectIcon, CodingIcon, EducationIcon, IntakeIcon, DocumentsIcon, DropBottleIcon, CalendarIcon, ScanIcon, LockIcon, BackIcon } from "./icons.jsx";
import { useIsPhone, PhoneCtx, PhoneShell, PHONE_BODY_H } from "./phone.jsx";
import { RX_ORIGIN, readRxToken, readLeaToken, storeLeaToken, tokenRole } from "./lib/retinaRx.js";
import { scheduleOk, ymdOf, shortDate } from "./lib/vraSchedule.js";
import { DoctorsGrid, ComingUp, LeaSchedulePage, useLeaSchedule, doctorDay, nextLexDay, siteName } from "./LeaSchedule.jsx";

// ── LEA Hub (Oct 2026, approved mockup "retina-rx-front-mockup") ─────
// Lexington Eye's hub: the VRA hub client running in "LEA" mode under
// retina-rx.vercel.app/lea/ (main.jsx picks this component for /lea paths).
//   · Two sign-ins (owner, Oct 8): the Retina-Rx front door
//     (retina-rx.vercel.app/) stores localStorage "rx-token" — missing or
//     expired → back to the front door. Then LEA Hub's OWN password
//     (POST /api/lea-login, LEA_SITE_PASSWORD) → "lea-token". A 401 from the
//     hub API clears "lea-token" and shows the LEA password screen again.
//   · Two views: Doctor (same names + PIN flow as VRA; the server turns the
//     PIN into an "lea-doctor" token) and Tech. No Manager, no Front desk.
//   · Phone tabs — Tech: Home · Schedule · Inject · Scan.
//     Doctor: Home · Schedule · Inject · Coding · Notes.
//   · Schedule = the whole doctor schedule, Lexington highlighted. The server
//     strips staff data for LEA tokens (server lib/lea-schedule.js).
//   · Inject = the coverage check at /check (same origin).
//   · Scan = the carton inventory at /inventory?from=lea (full page; it shows
//     a "‹ LEA Hub" link back here).
// The VRA hub (App.jsx at vra-hub.com) is not changed by any of this.

const COVERAGE_PATH = "/check";
const INVENTORY_PATH = "/inventory?from=lea";
const RX_HOME = "/";
const LEA_HOME_ON_RX = `${RX_ORIGIN}/lea/`;

// Robocall dials the VRA dictation line through /api/call — not part of LEA.
const leaDoctor = (doc) => (doc ? { ...doc, hasRobocall: false } : null);
const LEA_SURGEONS = SURGEONS.map(leaDoctor);

const TABS_BY_ROLE = {
  tech: ["home", "schedule", "inject", "scan"],
  doctor: ["home", "schedule", "inject", "coding", "notes"],
};
const TAB_OF = { home: "home", schedule: "schedule", inject: "inject", coding: "coding", notes: "notes", pin: "notes", doctor: "notes" };
const TAB_ROOTS = new Set(["home", "schedule", "inject", "coding", "notes", "doctor"]);

const API_BASE = import.meta.env.VITE_API_BASE || "https://op-note-dictator-server-production.up.railway.app";

// Hub API calls carry sessionStorage "vra_token" (fetch wrapper in main.jsx).
// In LEA that is the "lea" token from the LEA sign-in, or "lea-doctor" after a PIN.
function seedToken(leaToken) {
  try {
    const cur = sessionStorage.getItem("vra_token");
    const role = tokenRole(cur);
    if (role !== "lea" && role !== "lea-doctor") sessionStorage.setItem("vra_token", leaToken);
  } catch { /* storage blocked */ }
}
function resetToken() {
  const lea = readLeaToken();
  try { if (lea) sessionStorage.setItem("vra_token", lea.token); else sessionStorage.removeItem("vra_token"); } catch { /* storage blocked */ }
}
function clearHubToken() {
  try { sessionStorage.removeItem("vra_token"); } catch { /* storage blocked */ }
}

const onVraDomain = () => /(^|\.)vra-hub\.com$/i.test(location.hostname);

// ── Brand ───────────────────────────────────────────────────────────
export function LeaMark({ size = 26 }) {
  return (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: "50%", border: `2px solid ${T.accent}`, color: T.accent, display: "grid", placeItems: "center", fontSize: Math.round(size * 0.32), fontWeight: 700, fontFamily: T.sans, letterSpacing: "0.02em", flex: "none", boxSizing: "border-box" }}>LEA</span>
  );
}
function LeaBrand({ size = 28, text = "LEA Hub" }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9, flex: "none" }}>
      <LeaMark size={size} />
      <span style={{ fontSize: 15, fontWeight: 600, color: T.ink, whiteSpace: "nowrap" }}>{text}</span>
    </span>
  );
}

const linkBtn = { display: "inline-flex", alignItems: "center", gap: 6, height: 34, padding: "0 12px 0 8px", borderRadius: 8, border: `1px solid ${T.line}`, background: T.surface, color: T.accent, fontFamily: T.sans, fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" };
const card = { background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.rLg };
const secH = { fontSize: 11.5, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: T.muted, margin: "12px 0 6px" };
const muted = { fontSize: 13, color: T.muted };

// ── Pick your view (Doctor / Tech) ──────────────────────────────────
const ROLE_OPTIONS = [
  { id: "doctor", icon: "Dr", label: "Doctor", sub: "Pick your name, then your PIN" },
  { id: "tech", icon: "Tx", label: "Tech", sub: "Schedule, injection check, carton scan" },
];

function LeaRolePicker({ phone, onPick, onChangeHub }) {
  const icBox = (size) => ({ width: size, height: size, borderRadius: 10, background: T.accentSoft, color: T.accent, fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" });
  const optBase = { background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12, cursor: "pointer", fontFamily: T.sans, color: T.ink, boxSizing: "border-box" };
  return (
    <div style={{ minHeight: "100dvh", background: T.paper, fontFamily: T.sans, color: T.ink, display: "flex", flexDirection: "column" }}>
      <header style={{ background: T.surface, borderBottom: `1px solid ${T.line}`, display: "flex", alignItems: "center", boxSizing: "content-box", height: phone ? 50 : 64, paddingTop: "env(safe-area-inset-top, 0px)", paddingLeft: phone ? "max(16px, env(safe-area-inset-left, 0px))" : "max(24px, calc(50% - 416px))", paddingRight: phone ? 16 : "max(24px, calc(50% - 416px))" }}>
        <LeaBrand size={phone ? 28 : 34} />
        <div style={{ flex: 1 }} />
        {!phone && <button type="button" onClick={onChangeHub} style={linkBtn}><BackIcon /> Change hub</button>}
      </header>
      {phone && (
        <button type="button" onClick={onChangeHub}
          style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 16px", background: T.surface, border: 0, borderBottom: `1px solid ${T.line}`, color: T.accent, fontFamily: T.sans, fontSize: 13.5, cursor: "pointer" }}>
          ‹ Change hub
        </button>
      )}
      <main style={{ flex: 1, padding: phone ? "0 16px" : "0 24px" }}>
        <div style={{ textAlign: "center", marginTop: phone ? 48 : 72 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", margin: 0 }}>Welcome to LEA Hub</h1>
          <p style={{ color: T.muted, fontSize: 13.5, margin: "4px 0 0" }}>Pick your view</p>
        </div>
        <div style={phone
          ? { marginTop: 28, display: "flex", flexDirection: "column", gap: 12 }
          : { marginTop: 32, display: "grid", gridTemplateColumns: "repeat(2, 240px)", justifyContent: "center", gap: 16 }}>
          {ROLE_OPTIONS.map((o) => (
            <button key={o.id} type="button" onClick={() => onPick(o.id)}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.accentLine; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.line; }}
              style={phone
                ? { ...optBase, display: "flex", alignItems: "center", gap: 14, width: "100%", minHeight: 72, padding: "14px 16px", textAlign: "left" }
                : { ...optBase, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: 240, padding: "22px 18px", textAlign: "center" }}>
              <span style={icBox(phone ? 40 : 48)}>{o.icon}</span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}>{o.label}</span>
                <span style={{ display: "block", fontSize: 12.5, color: T.muted, lineHeight: 1.4, marginTop: phone ? 1 : 4 }}>{o.sub}</span>
              </span>
            </button>
          ))}
        </div>
      </main>
      <footer style={{ textAlign: "center", fontSize: 12, color: T.muted, padding: "24px 16px calc(18px + env(safe-area-inset-bottom, 0px))" }}>
        Lexington Eye · LEA Hub · internal use
      </footer>
    </div>
  );
}

// ── Phone Home ──────────────────────────────────────────────────────
const DOW_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function HalfLine({ label, sites, out }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: label === "PM" ? `1px solid ${T.line}` : 0, fontSize: 13.5 }}>
      <span style={{ width: 40, flex: "none", fontSize: 12, color: T.muted }}>{label}</span>
      {sites.length
        ? <b style={{ fontWeight: 600, color: sites.includes("LEX") ? T.accent : T.ink }}>{sites.map(siteName).join(" + ")}</b>
        : out ? <b style={{ fontWeight: 600, color: T.red }}>Vacation</b> : <span style={{ color: T.muted }}>Off</span>}
    </div>
  );
}

function LeaHomePhone({ role, doctor, sched, onSwitch, onLock, onOpenSchedule, onPickName }) {
  const now = new Date();
  const todayYmd = ymdOf(now);
  const dateWords = `${DOW_LONG[now.getDay()]}, ${MON[now.getMonth()]} ${now.getDate()}`;
  const ok = scheduleOk(sched);
  const day = ok ? sched.days.find((d) => d.date === todayYmd) || null : null;
  const status = <div style={{ ...card, padding: "10px 12px", ...muted }}>{sched === null ? "Loading schedule…" : "Schedule unavailable"}</div>;
  const isDoctor = role === "doctor";
  const mine = doctor && day ? doctorDay(day, doctor.id) : null;
  const nextLex = doctor && ok ? nextLexDay(sched.days, doctor.id, todayYmd) : null;
  const onCallMe = doctor && day && day.onCall && day.onCall.doctor === doctor.id;
  const dc = doctor ? doctorColor(doctor.id) : null;

  return (
    <div style={{ padding: "0 16px 8px", fontFamily: T.sans, color: T.ink }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 10 }}>
        <button type="button" onClick={onSwitch} style={linkBtn}><BackIcon /> Change view</button>
        <div style={{ flex: 1 }} />
        {doctor && (
          <button type="button" onClick={onLock} aria-label={`Lock ${doctor.name}'s space`}
            style={{ display: "flex", alignItems: "center", gap: 5, minHeight: 32, padding: "0 4px", background: "none", border: 0, color: T.muted, fontFamily: T.sans, fontSize: 12.5, cursor: "pointer" }}>
            <LockIcon />Lock
          </button>
        )}
      </div>
      <div style={{ padding: "8px 0 2px" }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.25, margin: 0 }}>
          {doctor ? `Good ${now.getHours() < 12 ? "morning" : "afternoon"}, ${doctor.name}` : dateWords}
        </h1>
        <div style={{ fontSize: 13, color: T.muted, marginTop: 1 }}>{doctor ? dateWords : "Where every doctor is today"}</div>
      </div>

      {isDoctor && !doctor && (
        <button type="button" onClick={onPickName}
          style={{ ...card, display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 52, padding: "0 12px", marginTop: 10, fontFamily: T.sans, color: T.ink, cursor: "pointer", textAlign: "left" }}>
          <LockIcon /><span style={{ fontSize: 14, fontWeight: 600 }}>Pick your name</span><span style={{ fontSize: 12.5, color: T.muted }}>PIN required</span>
        </button>
      )}

      {doctor && (
        <>
          <div style={secH}>Your day</div>
          {mine ? (
            <div style={{ ...card, padding: "2px 12px", background: dc.soft, borderColor: `${dc.fg}33` }}>
              <HalfLine label="AM" sites={mine.AM} out={mine.out} />
              <HalfLine label="PM" sites={mine.PM} out={mine.out} />
              {onCallMe && (
                <div style={{ display: "flex", gap: 8, padding: "6px 0", borderTop: `1px solid ${T.line}`, fontSize: 13.5 }}>
                  <span style={{ width: 40, flex: "none", fontSize: 12, color: T.muted }}>Call</span>
                  <b style={{ fontWeight: 600 }}>On call{day.onCall.doctorThrough && day.onCall.doctorThrough !== todayYmd ? ` through ${shortDate(day.onCall.doctorThrough)}` : " today"}</b>
                </div>
              )}
            </div>
          ) : status}
          <div style={secH}>Your next Lexington day</div>
          <div style={{ ...card, display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", fontSize: 13.5 }}>
            {!ok ? <span style={muted}>{sched === null ? "Loading…" : "Schedule unavailable"}</span>
              : nextLex ? <><span style={{ width: 90, flex: "none", fontSize: 12.5, color: T.muted }}>{shortDate(nextLex.date)}</span><b style={{ fontWeight: 600, color: T.accent }}>{nextLex.halves}</b></>
                : <span style={muted}>None in the next 4 weeks</span>}
          </div>
        </>
      )}

      <div style={secH}>Doctors today</div>
      {day ? <DoctorsGrid day={day} /> : ok ? <div style={{ ...card, padding: "10px 12px", ...muted }}>No schedule for today</div> : status}

      {ok && (
        <>
          <div style={secH}>Coming up</div>
          <ComingUp days={sched.days} todayYmd={todayYmd} max={doctor ? 3 : 4} onMore={onOpenSchedule} />
        </>
      )}
      <div style={{ textAlign: "center", fontSize: 10.5, letterSpacing: ".05em", textTransform: "uppercase", color: T.muted, margin: "12px 0 4px" }}>From the VRA calendar</div>
    </div>
  );
}

// ── Desktop Home ────────────────────────────────────────────────────
const TOOLS = [
  { id: "inject", title: "Can We Inject?", icon: InjectIcon, description: "Check PA requirements, step therapy, and billing alerts by drug + insurance plan.", tags: ["PA Lookup", "Step Therapy"] },
  { id: "coding", title: "Coding", icon: CodingIcon, description: "CPT tree by diagnosis, AI Coding Assistant for ICD-10, E/M, modifiers, and billing questions.", tags: ["CPT", "ICD-10", "E/M", "AI Assistant"] },
  { id: "education", title: "Patient Education", icon: EducationIcon, description: "Searchable handout library for conditions, procedures, and post-injection instructions. Printable.", tags: ["EN", "ES", "VI", "PT"] },
  { id: "intakehpi", title: "Intake CC/HPI", icon: IntakeIcon, description: "Audit-safe chief complaint & HPI", tags: ["Injection day", "Techs"] },
  { id: "documents", title: "Workflow Documents", icon: DocumentsIcon, description: "Branded packets and forms for staff: surgical package, post-pneumatic info, registration, consents.", tags: ["EN", "ES", "VI", "PT", "Fillable"] },
  { id: "drops", title: "Drop Schedule", icon: DropBottleIcon, description: "Build and print a drop schedule for a patient — post-op or post-injection, in EN / ES / VI / PT.", tags: ["Printable", "EN", "ES", "VI", "PT"] },
];

function LeaHomeDesktop({ role, sched, unlockedDoctor, onSelectTool, onSelectDoctor, onSwitch, onChangeHub, onScan }) {
  const todayYmd = ymdOf(new Date());
  const todayWords = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const ok = scheduleOk(sched);
  const day = ok ? sched.days.find((d) => d.date === todayYmd) || null : null;
  const hoverOn = (e) => { e.currentTarget.style.borderColor = T.accentLine; };
  const hoverOff = (e) => { e.currentTarget.style.borderColor = T.line; };
  const wide = (key, Icon, title, description, right, onClick) => (
    <button key={key} className="vra-tile-wide" onClick={onClick} onMouseEnter={hoverOn} onMouseLeave={hoverOff}
      style={tile({ gridColumn: "span 6", flexDirection: "row", alignItems: "center", minHeight: 0, gap: 14 })}>
      <span style={iconBox()}><Icon /></span>
      <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: T.ink, letterSpacing: "-0.01em" }}>{title}</span>
        <span style={{ fontSize: 13, color: T.muted, lineHeight: 1.45 }}>{description}</span>
      </span>
      {right && <span className="vra-bar-hide" style={{ marginLeft: "auto", fontSize: 12, color: T.muted, whiteSpace: "nowrap" }}>{right}</span>}
    </button>
  );
  const status = <div style={{ ...card, padding: "10px 12px", ...muted }}>{sched === null ? "Loading schedule…" : "Schedule unavailable"}</div>;

  return (
    <div style={{ minHeight: "100vh", background: T.paper, fontFamily: T.sans, color: T.ink }}>
      <style>{RESPONSIVE_CSS}</style>
      <header className="vra-bar" style={appBar}>
        <LeaBrand size={34} />
        <div style={{ flex: 1 }} />
        <div className="vra-bar-hide" style={{ fontSize: 13, color: T.ink2, whiteSpace: "nowrap" }}>{todayWords}</div>
        <button type="button" onClick={onSwitch} style={{ ...linkBtn, height: 32 }}><BackIcon /> Change view</button>
        <button type="button" onClick={onChangeHub} style={{ ...linkBtn, height: 32 }}>Change hub</button>
      </header>

      <div className="vra-wrap" style={{ maxWidth: 880, margin: "0 auto", padding: "0 24px", boxSizing: "border-box" }}>
        <div className="vra-row2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20, alignItems: "start" }}>
          <div>
            <div style={{ ...secH, marginTop: 0 }}>Doctors today</div>
            {day ? <DoctorsGrid day={day} /> : ok ? <div style={{ ...card, padding: "10px 12px", ...muted }}>No schedule for today</div> : status}
          </div>
          <div>
            <div style={{ ...secH, marginTop: 0 }}>Coming up</div>
            {ok ? <ComingUp days={sched.days} todayYmd={todayYmd} max={6} onMore={() => onSelectTool("schedule")} /> : status}
          </div>
        </div>

        {role === "doctor" && (
          <>
            <h2 style={secHead()}>Your space</h2>
            {unlockedDoctor && (
              <button className="vra-tile-wide" onClick={() => onSelectDoctor(unlockedDoctor)}
                style={tile({ width: "100%", boxSizing: "border-box", flexDirection: "row", alignItems: "center", minHeight: 0, gap: 14, marginBottom: 10, borderTop: `3px solid ${doctorColor(unlockedDoctor.id).fg}` })}>
                <span style={avatar(40, { fontSize: 13, background: doctorColor(unlockedDoctor.id).soft, color: doctorColor(unlockedDoctor.id).fg, borderColor: "transparent" })}>{unlockedDoctor.name}</span>
                <span style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>Dr. {unlockedDoctor.surname}</span>
                  <span style={{ fontSize: 13, color: T.muted }}>Clinic notes, dictation, coding</span>
                </span>
                <span style={{ marginLeft: "auto", fontSize: 12, color: T.muted }}>Open</span>
              </button>
            )}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {LEA_SURGEONS.filter((d) => !unlockedDoctor || d.id !== unlockedDoctor.id).map((doc) => (
                <button key={doc.id} className="vra-pill" onClick={() => onSelectDoctor(doc)} onMouseEnter={hoverOn} onMouseLeave={hoverOff}
                  style={{ display: "flex", alignItems: "center", gap: 12, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 999, padding: "8px 20px 8px 8px", cursor: "pointer", fontFamily: T.sans, fontSize: 15, fontWeight: 500, color: T.ink }}>
                  <span style={avatar(36)}>{doc.name}</span>
                  Dr. {doc.surname || doc.name}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.muted, fontSize: 12.5, marginTop: 8 }}><LockIcon />PIN required — the same PIN as in the VRA hub</div>
          </>
        )}

        <h2 style={secHead()}>Tools</h2>
        <div className="vra-tiles" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
          {wide("schedule", CalendarIcon, "Schedule", "Every doctor at every site, on call, vacations, closures and events. Lexington highlighted.", "Next 2 weeks", () => onSelectTool("schedule"))}
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button key={tool.id} className="vra-tile" onClick={() => onSelectTool(tool.id)} onMouseEnter={hoverOn} onMouseLeave={hoverOff}
                style={tile({ gridColumn: "span 2" })}>
                <span style={iconBox()}><Icon /></span>
                <span style={{ fontSize: 15, fontWeight: 600, color: T.ink, letterSpacing: "-0.01em" }}>{tool.title}</span>
                <span style={{ fontSize: 13, color: T.muted, lineHeight: 1.45 }}>{tool.description}</span>
                <span style={{ fontSize: 12, color: T.muted, marginTop: "auto" }}>{tool.tags.join(" · ")}</span>
              </button>
            );
          })}
          {wide("scan", ScanIcon, "Carton inventory", "Scan cartons in and out of the fridge. Each tech signs in with their own inventory login.", "Opens Retina-Rx inventory", onScan)}
        </div>

        <p style={{ color: T.muted, fontSize: 12, margin: "44px 0 32px" }}>
          Lexington Eye · LEA Hub · No patient information is stored by these tools.
        </p>
      </div>
    </div>
  );
}

// ── LEA Hub password (owner, Oct 8) — styled like the VRA hub's gate ──
const LOGIN_MESSAGES = {
  wrong_password: "Incorrect password.",
  not_configured: "Sign-in is not set up yet.",
  locked: "Too many tries. Wait 15 minutes, then try again.",
};

function LeaPasswordGate({ onSuccess, onChangeHub, notice }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(notice || "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError("");
    clearHubToken(); // nothing stale rides along on the sign-in call
    try {
      const res = await fetch(`${API_BASE}/api/lea-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (data && data.success && data.token) {
        const exp = Number(data.exp) || Date.now() + 24 * 3600e3;
        onSuccess({ token: data.token, exp: Math.min(exp, Date.now() + 24 * 3600e3) });
      } else {
        setError(LOGIN_MESSAGES[data && data.error] || LOGIN_MESSAGES.wrong_password);
        setPassword("");
      }
    } catch {
      setError("Could not connect to server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const off = loading || !password.trim();
  return (
    <div style={{ minHeight: "100vh", background: S.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: S.font }}>
      <form onSubmit={handleSubmit} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: T.rLg, padding: "36px 32px", width: "100%", maxWidth: 380, textAlign: "center", boxSizing: "border-box", margin: "0 16px", fontFamily: T.sans }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}><LeaMark size={52} /></div>
        <div style={{ fontSize: 17, fontWeight: 600, color: T.ink, marginBottom: 4, letterSpacing: "-0.01em" }}>LEA Hub</div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 22 }}>Lexington Eye · Clinical Workflow Tools</div>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" autoFocus autoComplete="current-password"
          style={{ display: "block", width: "100%", background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.r, padding: "10px 14px", color: T.ink, fontFamily: T.sans, outline: "none", fontSize: "0.9rem", boxSizing: "border-box", marginBottom: 12, textAlign: "center" }} />
        {error && <div role="alert" style={{ color: T.red, fontSize: "0.76rem", marginBottom: 10 }}>{error}</div>}
        <button type="submit" disabled={off}
          style={{ width: "100%", background: off ? T.accentSoft : T.accent, color: off ? T.muted : T.onAccent, border: "none", borderRadius: T.r, height: 40, padding: 0, fontSize: 14, fontFamily: T.sans, fontWeight: 600, cursor: off ? "not-allowed" : "pointer" }}>
          {loading ? "Verifying..." : "Enter"}
        </button>
        <button type="button" onClick={onChangeHub}
          style={{ marginTop: 16, background: "none", border: 0, padding: "6px 4px", color: T.accent, fontFamily: T.sans, fontSize: 13.5, cursor: "pointer" }}>
          ‹ Change hub
        </button>
      </form>
    </div>
  );
}

// ── Redirect screen (no sign-in yet / wrong host) ───────────────────
function Leaving({ text }) {
  return (
    <div style={{ minHeight: "100vh", background: T.paper, display: "grid", placeItems: "center", fontFamily: T.sans, color: T.muted, fontSize: 14 }}>{text}</div>
  );
}

// ── App ─────────────────────────────────────────────────────────────
export default function LeaApp() {
  // 1) Retina-Rx front-door sign-in (proof only). 2) LEA Hub's own sign-in.
  const [rx] = useState(() => (onVraDomain() ? null : readRxToken()));
  const [lea, setLea] = useState(() => {
    const v = rx ? readLeaToken() : null;
    if (v) seedToken(v.token); else clearHubToken();
    return v;
  });
  const [notice, setNotice] = useState("");
  const [role, setRole] = useState(null); // null → "Pick your view"
  const [page, setPage] = useState("home");
  const [activeSurgeon, setActiveSurgeon] = useState(null);
  const [unlockedId, setUnlockedId] = useState(null);
  const [onboarding, setOnboarding] = useState(false);

  // LEA sign-in gone (401 from the hub API, or it ran out): forget it and
  // show the LEA password screen again.
  const expireLea = (msg) => {
    storeLeaToken(null); clearHubToken();
    setLea(null); setRole(null); setPage("home"); setActiveSurgeon(null); setUnlockedId(null); setOnboarding(false);
    setNotice(msg || "");
  };

  useEffect(() => {
    // LEA lives on retina-rx.vercel.app; a direct visit to vra-hub.com/lea goes there.
    if (onVraDomain()) { location.replace(LEA_HOME_ON_RX); return undefined; }
    if (!rx) { location.replace(RX_HOME); return undefined; }
    document.title = "LEA Hub";
    swapHeadForLea();
    // Front-door sign-in over (or "Sign out" there) → front door.
    // LEA sign-in over → LEA password screen.
    const check = () => {
      if (!readRxToken()) location.replace(RX_HOME);
      else if (!readLeaToken()) expireLea("");
    };
    const t = setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    // Any hub API call answered 401 → LEA password screen.
    const prevFetch = window.fetch;
    window.fetch = async (input, init) => {
      const res = await prevFetch(input, init);
      const url = typeof input === "string" ? input : (input && input.url) || "";
      if (res.status === 401 && url.startsWith(API_BASE) && !url.includes("/api/lea-login")) {
        window.dispatchEvent(new Event("lea-unauthorized"));
      }
      return res;
    };
    const on401 = () => expireLea("Please sign in to LEA Hub again.");
    window.addEventListener("lea-unauthorized", on401);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("lea-unauthorized", on401);
      window.fetch = prevFetch;
    };
  }, [rx]);

  const phone = useIsPhone();
  const sched = useLeaSchedule(31, !!(rx && lea));
  const unlockedDoc = LEA_SURGEONS.find((d) => d.id === unlockedId) || null;

  if (!rx) return <Leaving text={onVraDomain() ? "Opening LEA Hub…" : "Opening the Retina-Rx sign-in…"} />;

  const changeHub = () => location.assign(RX_HOME);
  const openScan = () => location.assign(INVENTORY_PATH);

  if (!lea) {
    const signedIn = (v) => {
      storeLeaToken(v);
      try { sessionStorage.setItem("vra_token", v.token); } catch { /* storage blocked */ }
      setNotice("");
      setLea(v);
    };
    return <LeaPasswordGate key={notice} notice={notice} onSuccess={signedIn} onChangeHub={changeHub} />;
  }

  if (!role) {
    const pickRole = (r) => {
      setRole(r);
      setActiveSurgeon(null);
      if (r === "doctor") { setOnboarding(phone); setPage(phone ? "notes" : "home"); }
      else { setOnboarding(false); setPage("home"); }
    };
    return <LeaRolePicker phone={phone} onPick={pickRole} onChangeHub={changeHub} />;
  }

  const goHome = () => setPage("home");
  // Picking a name always asks for the PIN (same rule as VRA).
  const pickDoctor = (doc) => { setActiveSurgeon(leaDoctor(doc)); setPage("pin"); };
  const lock = () => { setUnlockedId(null); setActiveSurgeon(null); resetToken(); };
  const leaveDoctor = () => { if (!phone) setUnlockedId(null); setActiveSurgeon(null); setPage(phone ? "notes" : "home"); };
  const switchView = () => { lock(); setRole(null); setOnboarding(false); setPage("home"); };

  let content;
  if (page === "inject") {
    content = phone ? (
      <div style={{ background: S.bg, height: PHONE_BODY_H, overflow: "hidden" }}>
        <iframe src={COVERAGE_PATH} title="Can We Inject? — Coverage Lookup" style={{ display: "block", border: "none", width: "100%", height: "100%" }} allow="clipboard-write" />
      </div>
    ) : (
      <div style={{ minHeight: "100vh", background: S.bg, fontFamily: S.font, color: S.text, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "10px 20px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <button onClick={goHome} style={{ background: "none", border: `1px solid ${S.border}`, borderRadius: 8, padding: "6px 14px", color: S.muted, fontFamily: S.font, fontSize: "0.78rem", cursor: "pointer" }}>&larr; Home</button>
          <span style={{ fontSize: "1rem", fontWeight: 700, color: S.bright }}>Can We Inject?</span>
        </div>
        <iframe src={COVERAGE_PATH} title="Can We Inject? — Coverage Lookup" style={{ flex: 1, border: "none", width: "100%", minHeight: "calc(100vh - 52px)" }} allow="clipboard-write" />
      </div>
    );
  } else if (page === "coding") {
    content = <CptReference onBack={goHome} showReimbursement={!!unlockedDoc} />;
  } else if (page === "education") {
    content = <PatientEducation onBack={goHome} />;
  } else if (page === "intakehpi") {
    content = <IntakeHpi onBack={goHome} />;
  } else if (page === "documents") {
    content = <Documents onBack={goHome} onOpenEducation={() => setPage("education")} />;
  } else if (page === "drops") {
    content = <DropSchedule onBack={goHome} backLabel="Hub" />;
  } else if (page === "schedule") {
    content = <LeaSchedulePage phone={phone} sched={sched} onBack={goHome} />;
  } else if (page === "notes" && phone) {
    content = <DoctorPicker onSelectDoctor={pickDoctor} />;
  } else if (page === "pin" && activeSurgeon) {
    content = (
      <PinGate key={activeSurgeon.id} surgeon={activeSurgeon}
        onSuccess={() => { setUnlockedId(activeSurgeon.id); setPage(onboarding && phone ? "home" : "doctor"); setOnboarding(false); }}
        onCancel={() => { setActiveSurgeon(phone ? unlockedDoc : null); setPage(phone ? "notes" : "home"); }} />
    );
  } else if (page === "doctor" && activeSurgeon && !phone) {
    content = <ClinicNoteGenerator onBack={leaveDoctor} surgeon={activeSurgeon} />;
  } else if (page === "doctor" && phone && activeSurgeon && unlockedId === activeSurgeon.id) {
    content = null; // kept-mounted note generator below
  } else if (phone) {
    content = (
      <LeaHomePhone role={role} doctor={role === "doctor" ? unlockedDoc : null} sched={sched}
        onSwitch={switchView} onLock={lock} onOpenSchedule={() => setPage("schedule")} onPickName={() => setPage("notes")} />
    );
  } else {
    content = (
      <LeaHomeDesktop role={role} sched={sched} unlockedDoctor={role === "doctor" ? unlockedDoc : null}
        onSelectTool={(id) => setPage(id)} onSelectDoctor={pickDoctor} onSwitch={switchView} onChangeHub={changeHub} onScan={openScan} />
    );
  }

  if (!phone) return content;

  // ── Phone shell ──
  const noteOpen = !!(activeSurgeon && unlockedId === activeSurgeon.id);
  const onTab = (id) => {
    if (id === "scan") { openScan(); return; }
    if (id !== "notes") setPage(id);
    else if (noteOpen) setPage("doctor");
    else if (unlockedDoc) { setActiveSurgeon(unlockedDoc); setPage("doctor"); }
    else setPage("notes");
  };
  const homeSub = role === "tech" ? "Tech" : unlockedDoc ? unlockedDoc.id : "Doctor";
  return (
    <PhoneShell active={TAB_OF[page] || "home"} onTab={onTab} tabIds={TABS_BY_ROLE[role]} brand={<LeaBrand />} homeSub={homeSub}>
      <PhoneCtx.Provider value={{ phone: true, tabRoot: TAB_ROOTS.has(page) }}>
        {page === "doctor" && noteOpen ? null : content}
      </PhoneCtx.Provider>
      {noteOpen && (
        <div style={{ display: page === "doctor" ? "block" : "none" }}>
          <PhoneCtx.Provider value={{ phone: true, tabRoot: false }}>
            <ClinicNoteGenerator key={activeSurgeon.id} onBack={leaveDoctor} surgeon={activeSurgeon} />
          </PhoneCtx.Provider>
        </div>
      )}
    </PhoneShell>
  );
}

// Home-screen app name/manifest for LEA ("LEA Hub"; icons reuse the hub's).
function swapHeadForLea() {
  try {
    const set = (sel, attr, val) => { const el = document.querySelector(sel); if (el) el.setAttribute(attr, val); };
    set('link[rel="manifest"]', "href", "lea-manifest.webmanifest");
    set('meta[name="apple-mobile-web-app-title"]', "content", "LEA Hub");
  } catch { /* cosmetic only */ }
}

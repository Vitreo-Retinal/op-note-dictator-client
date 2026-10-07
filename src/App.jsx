import { useState, useEffect } from "react";
import OpNoteDictator from "./OpNoteDictator.jsx";
import ClinicNoteGenerator from "./ClinicNoteGenerator.jsx";
import CptReference from "./CptReference.jsx";
import PatientEducation from "./PatientEducation.jsx";
import Documents from "./Documents.jsx";
import RateComparison from "./RateComparison.jsx";
import IntakeHpi from "./IntakeHpi.jsx";
import CallBoard from "./CallBoard.jsx";
import DropSchedule from "./DropSchedule.jsx";
import SchedulePage from "./SchedulePage.jsx";
import HomePhone from "./HomePhone.jsx";
import RolePicker from "./RolePicker.jsx";
import { S, T, appBar, tile, iconBox, secHead, avatar, btn, RESPONSIVE_CSS, doctorColor } from "./theme.js";
import { InjectIcon, CodingIcon, EducationIcon, IntakeIcon, DocumentsIcon, ManagerIcon, LockIcon, DropBottleIcon, CalendarIcon, ChevronRightIcon } from "./icons.jsx";
import logo from "./vra-logo.png";
import { useIsPhone, isPhoneNow, usePhone, PhoneCtx, PhoneShell, PhoneHeading, PHONE_BODY_H, tabsFor } from "./phone.jsx";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://op-note-dictator-server-production.up.railway.app";

// ── Shared styles ───────────────────────────────────────────────────

// ── Surgeon roster ──────────────────────────────────────────────────
const SURGEONS = [
  { id: "MR", name: "MR", surname: "Rodriguez", surgeonId: "998eae6c-1516-43d5-8bc7-6905074cd8e3", hasRobocall: true },
  { id: "BKH", name: "BKH", surname: "Hong", surgeonId: null },
  { id: "FJM", name: "FJM", surname: "McCabe", surgeonId: null },
  { id: "BJB", name: "BJB", surname: "Baker", surgeonId: null },
  { id: "WSF", name: "WSF", surname: "Foulsham", surgeonId: null },
];

// ── Password Gate ───────────────────────────────────────────────────
function PasswordGate({ onSuccess }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/verify-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.token) sessionStorage.setItem("vra_token", data.token);
        onSuccess();
      } else {
        setError("Incorrect password.");
        setPassword("");
      }
    } catch {
      setError("Could not connect to server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: S.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: S.font }}>
      <form onSubmit={handleSubmit} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: T.rLg, padding: "36px 32px", width: "100%", maxWidth: 380, textAlign: "center", boxSizing: "border-box", margin: "0 16px", fontFamily: T.sans }}>
        <img src={logo} alt="Vitreo-Retinal Associates" style={{ height: 44, width: "auto", display: "block", margin: "0 auto 18px" }} />
        <div style={{ fontSize: 17, fontWeight: 600, color: T.ink, marginBottom: 4, letterSpacing: "-0.01em" }}>VRA Practice Hub</div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 22 }}>Clinical Workflow Tools</div>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" autoFocus
          style={{ display: "block", width: "100%", background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.r, padding: "10px 14px", color: T.ink, fontFamily: T.sans, outline: "none", fontSize: "0.9rem", boxSizing: "border-box", marginBottom: 12, textAlign: "center" }} />
        {error && <div style={{ color: T.red, fontSize: "0.76rem", marginBottom: 10 }}>{error}</div>}
        <button type="submit" disabled={loading || !password.trim()}
          style={{ width: "100%", background: loading || !password.trim() ? T.accentSoft : T.accent, color: loading || !password.trim() ? T.muted : T.onAccent, border: "none", borderRadius: T.r, height: 40, padding: 0, fontSize: 14, fontFamily: T.sans, fontWeight: 600, cursor: loading || !password.trim() ? "not-allowed" : "pointer" }}>
          {loading ? "Verifying..." : "Enter"}
        </button>
      </form>
    </div>
  );
}

// ── Homepage ────────────────────────────────────────────────────────
// role (Oct 2026): "doctor" | "tech" | "manager" — picked once per device
// (RolePicker). Desktop: doctor → "Your space" first, tools, Practice management;
// tech → tools only; manager → Manager's Hub first, then tools;
// frontdesk → Schedule, Can we inject, Patient education, Documents only.
export function Homepage({ role = "doctor", roleDoctorId, managerOpen, onSelectTool, onOpenDay, onSelectDoctor, onSelectManager, unlockedDoctor, onDictate, onLock, onSwitch }) {
  // Oct 2026 — shared VRA Google Calendar view. Rendered as a full-width wide
  // tile at the top of "Tools for everyone"; the six tiles below stay 3 + 3.
  const scheduleTool = {
    id: "schedule",
    title: "Schedule",
    icon: CalendarIcon,
    description: "Who is where, on call, and out — doctors, techs, closures. From the VRA calendar.",
    tags: ["2 weeks", "On call", "Techs"],
  };
  const ScheduleIcon = scheduleTool.icon;

  const sharedTools = [
    {
      id: "inject",
      title: "Can We Inject?",
      icon: InjectIcon,
      description: "Check PA requirements, step therapy, and billing alerts by drug + insurance plan.",
      gradient: T.accent,
      tags: ["PA Lookup", "Step Therapy", "288 Plans"],
    },
    {
      id: "coding",
      title: "Coding",
      icon: CodingIcon,
      description: "CPT tree by diagnosis, AI Coding Assistant for ICD-10, E/M, modifiers, and billing questions.",
      gradient: T.accent,
      tags: ["CPT", "ICD-10", "E/M", "AI Assistant"],
    },
    {
      id: "education",
      title: "Patient Education",
      icon: EducationIcon,
      description: "Searchable handout library for conditions, procedures, and post-injection instructions. Printable.",
      gradient: T.accent,
      tags: ["EN", "ES", "VI", "PT"],
    },
    // Sep 2026, per Mari — added after the OCB modifier-25 FCA settlement.
    // Techs write the CC/HPI on injection days, so the audit-safe wording tool
    // lives out here in the shared grid with no PIN, next to their other tools.
    {
      id: "intakehpi",
      title: "Intake CC/HPI",
      icon: IntakeIcon,
      description: "Audit-safe chief complaint & HPI",
      gradient: T.accent,
      tags: ["Injection day", "Techs"],
    },
    {
      id: "documents",
      title: "Workflow Documents",
      icon: DocumentsIcon,
      description: "Branded VRA packets and forms for staff: surgical package, post-pneumatic info, registration, consents. Each with language picker.",
      gradient: T.accent,
      tags: ["EN", "ES", "VI", "PT", "Fillable"],
    },
    {
      id: "drops",
      title: "Drop Schedule",
      icon: DropBottleIcon,
      description: "Build and print a drop schedule for a patient — post-op or post-injection, in EN / ES / VI / PT.",
      gradient: T.accent,
      tags: ["Printable", "EN", "ES", "VI", "PT"],
    },
  ];

  // "Monday, October 5"
  const todayWords = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const hoverOn = (e) => { e.currentTarget.style.borderColor = T.accentLine; };
  const hoverOff = (e) => { e.currentTarget.style.borderColor = T.line; };

  const { phone } = usePhone();

  // Manager's Hub tile (PIN-gated; skips the PIN while unlocked).
  const managerTile = (
    <button className="vra-tile-wide" onClick={onSelectManager}
      style={tile({ gridColumn: "span 6", borderTop: `3px solid ${T.gold}`, flexDirection: "row", alignItems: "center", minHeight: 0, gap: 14 })}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.accentLine; e.currentTarget.style.borderTopColor = T.gold; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.borderTopColor = T.gold; }}>
      <span style={iconBox()}><ManagerIcon /></span>
      <span style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>Manager's Hub</span>
        <span style={{ fontSize: 13, color: T.muted }}>Rate comparison</span>
      </span>
      <span style={{ marginLeft: "auto", fontSize: 12, color: T.muted, display: "flex", gap: 6, alignItems: "center", whiteSpace: "nowrap" }}>
        {managerOpen ? "Open" : <><LockIcon />PIN required</>}
      </span>
    </button>
  );
  const roleDoc = SURGEONS.find((d) => d.id === roleDoctorId) || null;
  const FRONTDESK_TOOLS = ["inject", "education", "documents"];
  const tools = role === "frontdesk" ? FRONTDESK_TOOLS.map((id) => sharedTools.find((t) => t.id === id)) : sharedTools;

  // Phone (Oct 2026): one-screen briefing — see HomePhone.jsx. Desktop below is unchanged.
  if (phone) {
    return (
      <HomePhone role={role} doctor={role === "doctor" ? unlockedDoctor || null : null} managerOpen={managerOpen}
        onDictate={onDictate} onCoverage={() => onSelectTool("inject")}
        onSelectManager={onSelectManager} onLock={onLock} onSwitch={onSwitch}
        onOpenSchedule={() => onSelectTool("schedule")} onOpenDay={onOpenDay} />
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.paper, fontFamily: T.sans, color: T.ink }}>
      <style>{RESPONSIVE_CSS}</style>
      {/* Top bar (desktop). On phones the shell has the bar; the title is an in-page heading. */}
      {phone ? <PhoneHeading title="Practice Hub" style={{ paddingBottom: 0 }} /> : (
      <header className="vra-bar" style={appBar}>
        <img src={logo} alt="Vitreo-Retinal Associates" style={{ height: 48, width: "auto", display: "block" }} />
        <span style={{ width: 1, height: 22, background: T.line, flexShrink: 0 }} />
        <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, whiteSpace: "nowrap" }}>Practice Hub</div>
        <div style={{ flex: 1 }} />
        <div className="vra-bar-hide" style={{ fontSize: 13, color: T.ink2, whiteSpace: "nowrap" }}>{todayWords}</div>
        <button type="button" onClick={onSwitch}
          style={{ background: "none", border: 0, padding: "4px 0", color: T.accent, fontFamily: T.sans, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
          Switch view
        </button>
      </header>
      )}

      <div className="vra-wrap" style={{ maxWidth: 880, margin: "0 auto", padding: "0 24px", boxSizing: "border-box" }}>
        {/* Call board — practice-wide date + on-call + F/U counter. Sep 2026, per
            Mari: everyone (techs, managers, doctors) sees it, no PIN. */}
        <CallBoard onOpenSchedule={() => onSelectTool("schedule")} />

        {/* Manager view: the Manager's Hub comes first */}
        {role === "manager" && (
          <>
            <h2 style={secHead()}>Practice management</h2>
            <div className="vra-tiles" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>{managerTile}</div>
          </>
        )}

        {/* Doctor view: the doctor's own space comes first. Once a doctor has
            passed the PIN on this device, their name is the big button. */}
        {role === "doctor" && (
          <>
            <h2 style={secHead()}>Your space</h2>
            {roleDoc ? (
              <>
                <button className="vra-tile-wide" onClick={() => onSelectDoctor(roleDoc)}
                  style={tile({ width: "100%", boxSizing: "border-box", flexDirection: "row", alignItems: "center", minHeight: 0, gap: 14, borderTop: `3px solid ${doctorColor(roleDoc.id).fg}` })}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.accentLine; e.currentTarget.style.borderTopColor = doctorColor(roleDoc.id).fg; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.borderTopColor = doctorColor(roleDoc.id).fg; }}>
                  <span style={avatar(40, { fontSize: 13, background: doctorColor(roleDoc.id).soft, color: doctorColor(roleDoc.id).fg, borderColor: "transparent" })}>{roleDoc.name}</span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: T.ink, letterSpacing: "-0.01em" }}>Dr. {roleDoc.surname}</span>
                    <span style={{ fontSize: 13, color: T.muted }}>Clinic notes, dictation, coding</span>
                  </span>
                  <span style={{ marginLeft: "auto", fontSize: 12, color: T.muted, display: "flex", gap: 6, alignItems: "center", whiteSpace: "nowrap" }}>
                    {unlockedDoctor && unlockedDoctor.id === roleDoc.id ? "Open" : <><LockIcon />PIN required</>}
                  </span>
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10, fontSize: 13, color: T.muted }}>
                  Another doctor:
                  {SURGEONS.filter((d) => d.id !== roleDoc.id).map((doc) => (
                    <button key={doc.id} type="button" onClick={() => onSelectDoctor(doc)}
                      style={{ background: "none", border: 0, padding: "2px 4px", color: T.accent, fontFamily: T.sans, fontSize: 13, cursor: "pointer" }}>
                      {doc.surname}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {SURGEONS.map((doc) => (
                  <button key={doc.id} className="vra-pill" onClick={() => onSelectDoctor(doc)}
                    style={{ display: "flex", alignItems: "center", gap: 12, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 999, padding: "8px 20px 8px 8px", cursor: "pointer", fontFamily: T.sans, fontSize: 15, fontWeight: 500, color: T.ink, transition: "border-color .15s" }}
                    onMouseEnter={hoverOn}
                    onMouseLeave={hoverOff}>
                    <span style={avatar(36)}>{doc.name}</span>
                    Dr. {doc.surname || doc.name}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Shared tools */}
        <h2 style={secHead()}>Tools for everyone</h2>
        <div className="vra-tiles" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
          {/* Schedule — wide row tile, first in the shared grid */}
          <button className="vra-tile-wide" onClick={() => onSelectTool(scheduleTool.id)}
            style={tile({ gridColumn: "span 6", flexDirection: "row", alignItems: "center", minHeight: 0, gap: 14, ...(phone ? { flexWrap: "nowrap", borderTop: `3px solid ${T.accent}` } : {}) })}
            onMouseEnter={hoverOn}
            onMouseLeave={hoverOff}>
            <span style={iconBox()}><ScheduleIcon /></span>
            <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: T.ink, letterSpacing: "-0.01em" }}>{scheduleTool.title}</span>
              <span style={{ fontSize: 13, color: T.muted, lineHeight: 1.45 }}>{scheduleTool.description}</span>
            </span>
            {!phone && <span style={{ marginLeft: "auto", fontSize: 12, color: T.muted, whiteSpace: "nowrap" }}>Next 2 weeks</span>}
          </button>
          {tools.map((tool, i) => {
            const Icon = tool.icon;
            // Phone: compact row tile (icon left, title + description), no tag line.
            if (phone) return (
              <button key={tool.id} className="vra-tile" onClick={() => onSelectTool(tool.id)}
                style={tile({ gridColumn: "span 2", borderTop: `3px solid ${tool.gradient}`, flexDirection: "row", alignItems: "center", minHeight: 0, gap: 14 })}>
                <span style={iconBox()}><Icon /></span>
                <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: T.ink, letterSpacing: "-0.01em" }}>{tool.title}</span>
                  <span style={{ fontSize: 13, color: T.muted, lineHeight: 1.4 }}>{tool.description}</span>
                </span>
              </button>
            );
            return (
              <button key={tool.id} className="vra-tile" onClick={() => onSelectTool(tool.id)}
                style={tile({ gridColumn: "span 2", borderTop: `3px solid ${tool.gradient}` })}
                onMouseEnter={hoverOn}
                onMouseLeave={hoverOff}>
                <span style={iconBox()}><Icon /></span>
                <span style={{ fontSize: 15, fontWeight: 600, color: T.ink, letterSpacing: "-0.01em" }}>{tool.title}</span>
                <span style={{ fontSize: 13, color: T.muted, lineHeight: 1.45 }}>{tool.description}</span>
                <span style={{ fontSize: 12, color: T.muted, marginTop: "auto" }}>{tool.tags.join(" · ")}</span>
              </button>
            );
          })}
        </div>

        {/* Practice management — doctor view keeps it at the bottom; techs never see it */}
        {role === "doctor" && (
          <>
            <h2 style={secHead()}>Practice management</h2>
            <div className="vra-tiles" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
              {managerTile}
            </div>
          </>
        )}

        <p style={{ color: T.muted, fontSize: 12, margin: "44px 0 32px" }}>
          Vitreo-Retinal Associates · No patient information is stored by these tools.
        </p>
      </div>
    </div>
  );
}

// ── PIN Gate (doctor space) ─────────────────────────────────────────
function PinGate({ surgeon, onSuccess, onCancel }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const { phone } = usePhone();

  // On mount, check if this surgeon even has a PIN configured
  useState(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/verify-pin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ surgeonId: surgeon.id, pin: "__check__" }),
        });
        const data = await res.json();
        // If server says success (no PIN set), skip the gate
        if (data.success) {
          onSuccess();
          return;
        }
      } catch {
        // If server unreachable, let them through
        onSuccess();
        return;
      }
      setChecking(false);
    })();
  });

  async function handleSubmit(e) {
    e.preventDefault();
    if (!pin.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/verify-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surgeonId: surgeon.id, pin: pin.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.token) sessionStorage.setItem("vra_token", data.token);
        onSuccess();
      } else {
        setError("Incorrect PIN.");
        setPin("");
      }
    } catch {
      setError("Could not connect to server.");
    } finally {
      setLoading(false);
    }
  }

  // Phone: the card sits near the top so the iOS keyboard does not cover it.
  const wrapStyle = { minHeight: "100vh", background: S.bg, display: "flex", alignItems: phone ? "flex-start" : "center", justifyContent: "center", fontFamily: S.font, ...(phone ? { paddingTop: 32, boxSizing: "border-box" } : {}) };
  if (checking) {
    return (
      <div style={wrapStyle}>
        <div style={{ color: S.muted, fontSize: "0.9rem" }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      <form onSubmit={handleSubmit} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: T.rLg, padding: "32px 28px", width: "100%", maxWidth: 340, textAlign: "center", boxSizing: "border-box", margin: "0 16px", fontFamily: T.sans }}>
        {phone
          ? <div style={doctorPill(surgeon.id, { height: 32, fontSize: 15, margin: "0 auto 14px" })}>{surgeon.name}</div>
          : <div style={avatar(48, { fontSize: 14, margin: "0 auto 14px" })}>{surgeon.name}</div>}
        <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Doctor Space</div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>Enter PIN to continue</div>
        <input type="password" inputMode="numeric" pattern="[0-9]*" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" autoFocus
          style={{ display: "block", width: "100%", background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.r, padding: "10px 14px", color: T.ink, fontFamily: T.sans, outline: "none", fontSize: "1.1rem", boxSizing: "border-box", marginBottom: 12, textAlign: "center", letterSpacing: 6 }} />
        {error && <div style={{ color: T.red, fontSize: "0.76rem", marginBottom: 10 }}>{error}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onCancel}
            style={{ flex: 1, background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.r, height: phone ? 44 : 38, padding: 0, color: T.ink2, fontFamily: T.sans, fontSize: 13.5, fontWeight: 500, cursor: "pointer" }}>Cancel</button>
          <button type="submit" disabled={loading || !pin.trim()}
            style={{ flex: 1, background: loading || !pin.trim() ? T.accentSoft : T.accent, color: loading || !pin.trim() ? T.muted : T.onAccent, border: "none", borderRadius: T.r, height: phone ? 44 : 38, padding: 0, fontSize: 13.5, fontFamily: T.sans, fontWeight: 600, cursor: loading || !pin.trim() ? "not-allowed" : "pointer" }}>
            {loading ? "..." : "Enter"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Manager's Hub PIN Gate (verified server-side as of July 2026) ──
function ManagerPinGate({ onSuccess, onCancel }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!pin.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/verify-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surgeonId: "MANAGER", pin: pin.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.token) sessionStorage.setItem("vra_token", data.token);
        onSuccess();
      } else {
        setError("Incorrect PIN.");
        setPin("");
      }
    } catch {
      setError("Could not connect to server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: S.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: S.font }}>
      <form onSubmit={handleSubmit} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: T.rLg, padding: "32px 28px", width: "100%", maxWidth: 340, textAlign: "center", boxSizing: "border-box", margin: "0 16px", fontFamily: T.sans }}>
        <div style={iconBox("gold", { width: 48, height: 48, borderRadius: 10, margin: "0 auto 14px" })}><ManagerIcon size={24} /></div>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Manager's Hub</div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>Enter manager PIN to continue</div>
        <input type="password" inputMode="numeric" pattern="[0-9]*" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" autoFocus
          style={{ display: "block", width: "100%", background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.r, padding: "10px 14px", color: T.ink, fontFamily: T.sans, outline: "none", fontSize: "1.1rem", boxSizing: "border-box", marginBottom: 12, textAlign: "center", letterSpacing: 6 }} />
        {error && <div style={{ color: T.red, fontSize: "0.76rem", marginBottom: 10 }}>{error}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onCancel}
            style={{ flex: 1, background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.r, height: 38, padding: 0, color: T.ink2, fontFamily: T.sans, fontSize: 13.5, fontWeight: 500, cursor: "pointer" }}>Cancel</button>
          <button type="submit" disabled={!pin.trim()}
            style={{ flex: 1, background: !pin.trim() ? T.accentSoft : T.accent, color: !pin.trim() ? T.muted : T.onAccent, border: "none", borderRadius: T.r, height: 38, padding: 0, fontSize: 13.5, fontFamily: T.sans, fontWeight: 600, cursor: !pin.trim() ? "not-allowed" : "pointer" }}>Enter</button>
        </div>
      </form>
    </div>
  );
}

// ── Doctor picker (phone "Notes" tab) ─────────────────────────────
// One full-width row per surgeon: their calendar-color pill, name, chevron.
// Tapping one goes through the PIN gate.
function doctorPill(id, extra = {}) {
  const c = doctorColor(id);
  return { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 50, height: 28, padding: "0 10px", borderRadius: 999, background: c.soft, color: c.fg, fontSize: 14, fontWeight: 600, fontFamily: T.sans, flexShrink: 0, boxSizing: "border-box", ...extra };
}

function DoctorPicker({ onSelectDoctor }) {
  return (
    <div style={{ background: T.paper, fontFamily: T.sans, color: T.ink }}>
      <PhoneHeading title="Notes" />
      <div style={{ padding: "0 16px", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: T.muted, margin: "4px 0 10px" }}>Choose your space</div>
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {SURGEONS.map((doc) => (
          <button key={doc.id} className="vra-pill" onClick={() => onSelectDoctor(doc)}
            style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 56, background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.rLg, padding: "8px 14px", cursor: "pointer", fontFamily: T.sans, fontSize: 15, fontWeight: 500, color: T.ink, textAlign: "left", boxSizing: "border-box" }}>
            <span style={doctorPill(doc.id)}>{doc.name}</span>
            <span style={{ flex: 1, minWidth: 0 }}>Dr. {doc.surname || doc.name}</span>
            <span style={{ color: T.muted, display: "flex" }}><ChevronRightIcon /></span>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: T.muted, fontSize: 13, padding: "14px 16px 24px" }}>
        <LockIcon />PIN required
      </div>
    </div>
  );
}

// ── Page persistence (Oct 2026) ─────────────────────────────────────
// A home-screen app reloads whenever iOS evicts it, so on phones the current
// page is restored from localStorage. PIN-gated pages come back through their
// gate: doctor space → that surgeon's PIN prompt, Manager's Hub → manager PIN.
const PAGE_KEY = "vra-hub-page";
const SURGEON_KEY = "vra-hub-surgeon";
const PAGES = ["home", "schedule", "inject", "coding", "education", "intakehpi", "documents", "drops", "dictator", "notes", "pin", "doctor", "managerpin", "manager"];

function storeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function storeSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* private mode */ } }

// Remembered doctor unlock (phones only, Oct 2026): a PIN entered on a phone
// holds until the end of that local day, then the PIN is asked again.
// Stored as { id, day: "YYYY-MM-DD" }. Desktop keeps the old memory-only unlock.
const UNLOCK_KEY = "vra-hub-unlock";
const localYmd = () => { const d = new Date(), p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
function rememberedUnlock() {
  if (!isPhoneNow()) return null;
  try {
    const v = JSON.parse(storeGet(UNLOCK_KEY) || "null");
    if (v && v.day === localYmd() && SURGEONS.some((d) => d.id === v.id)) return v.id;
  } catch { /* bad value */ }
  storeSet(UNLOCK_KEY, null);
  return null;
}

// Role picked on this device (Oct 2026): "doctor" | "tech" | "manager" | "frontdesk".
// No role → the role picker shows right after the site password.
const ROLE_KEY = "vra-hub-role";
const ROLES = ["doctor", "tech", "manager", "frontdesk"];
// Doctor role: the surgeon who last passed the PIN here → their big Home button (desktop).
const ROLE_DOC_KEY = "vra-hub-role-doctor";
// Manager unlock: like the doctor unlock, kept on phones until the end of the
// local day (stored as the "YYYY-MM-DD" it was entered). Desktop: memory only.
const MGR_UNLOCK_KEY = "vra-hub-mgr-unlock";
function storedRole() { const r = storeGet(ROLE_KEY); return ROLES.includes(r) ? r : null; }
function rememberedManager() {
  if (!isPhoneNow()) return false;
  if (storeGet(MGR_UNLOCK_KEY) === localYmd()) return true;
  storeSet(MGR_UNLOCK_KEY, null);
  return false;
}

function restoredState() {
  if (!isPhoneNow()) return { page: "home", surgeon: null, unlocked: null };
  // A page whose tab this role does not have (e.g. Notes for Tech) falls back to Home.
  const role = storedRole();
  const tabOfStored = TAB_OF[storeGet(PAGE_KEY)];
  if (role && tabOfStored && !tabsFor(role).includes(tabOfStored)) return { page: "home", surgeon: null, unlocked: null };
  const unlocked = rememberedUnlock();
  const unlockedDoc = SURGEONS.find((d) => d.id === unlocked) || null;
  let page = storeGet(PAGE_KEY);
  if (!PAGES.includes(page)) return { page: "home", surgeon: unlockedDoc, unlocked };
  const surgeon = SURGEONS.find((d) => d.id === storeGet(SURGEON_KEY)) || null;
  if (page === "pin" || page === "doctor" || page === "notes") {
    if (unlockedDoc && (!surgeon || surgeon.id === unlocked)) return { page: "doctor", surgeon: unlockedDoc, unlocked };
    if (page === "notes") return { page, surgeon: unlockedDoc, unlocked };
    return surgeon ? { page: "pin", surgeon, unlocked } : { page: "notes", surgeon: null, unlocked };
  }
  if (page === "manager" && !rememberedManager()) page = "managerpin";
  return { page, surgeon: unlockedDoc, unlocked };
}
// Which tab is lit for each page.
const TAB_OF = { home: "home", schedule: "schedule", inject: "inject", coding: "coding", notes: "notes", pin: "notes", doctor: "notes" };
const TAB_ROOTS = new Set(["home", "schedule", "inject", "coding", "notes", "doctor"]);

// ── App Router ──────────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(false);
  const [initial] = useState(restoredState);
  const [page, setPage] = useState(initial.page);
  // page: home | schedule | inject | coding | education | intakehpi | documents | dictator | notes | doctor | pin
  const [activeSurgeon, setActiveSurgeon] = useState(initial.surgeon);
  // Surgeon that passed the PIN gate: { id, day }. Desktop: memory only (a
  // reload goes back through the gate). Phone: also kept in localStorage and
  // honored until the end of that local day (see rememberedUnlock).
  const [unlocked, setUnlocked] = useState(initial.unlocked ? { id: initial.unlocked, day: localYmd() } : null);
  const [inputNonce, setInputNonce] = useState(0);
  // Role for this device (null → role picker after the password).
  const [role, setRole] = useState(storedRole);
  const [roleDoctorId, setRoleDoctorId] = useState(() => storeGet(ROLE_DOC_KEY));
  // Day the manager PIN passed ("YYYY-MM-DD"), or null.
  const [mgrDay, setMgrDay] = useState(() => (rememberedManager() ? localYmd() : null));
  // True between picking a role and passing its PIN: PIN success then lands on Home.
  const [onboarding, setOnboarding] = useState(false);
  // Schedule opened on a given day (Front desk Home "Next days" tile); null = today.
  const [schedDay, setSchedDay] = useState(null);
  const phone = useIsPhone();
  const managerOpen = mgrDay === localYmd();
  const unlockedId = unlocked && (!phone || unlocked.day === localYmd()) ? unlocked.id : null;
  const unlockedDoc = SURGEONS.find((d) => d.id === unlockedId) || null;

  useEffect(() => {
    storeSet(PAGE_KEY, page);
    storeSet(SURGEON_KEY, activeSurgeon ? activeSurgeon.id : null);
  }, [page, activeSurgeon]);

  if (!authed) {
    return <PasswordGate onSuccess={() => setAuthed(true)} />;
  }

  // Role picker — once per device; "Switch view" on Home brings it back.
  if (!role) {
    const pickRole = (r) => {
      setRole(r); storeSet(ROLE_KEY, r);
      setActiveSurgeon(null);
      if (r === "doctor") { setOnboarding(phone); setPage(phone ? "notes" : "home"); }
      else if (r === "manager") { setOnboarding(!managerOpen); setPage(managerOpen ? "home" : "managerpin"); }
      else { setOnboarding(false); setPage("home"); }
    };
    return <RolePicker phone={phone} onPick={pickRole} />;
  }

  const goHome = () => setPage("home");
  // Leaving the doctor space: desktop → hub; phone → the doctor picker.
  // On a phone the unlock is kept (it lasts the day; Home has a Lock button).
  const leaveDoctor = () => { if (!phone) setUnlocked(null); setActiveSurgeon(null); setPage(phone ? "notes" : "home"); };
  // Picking a name always asks for the PIN (per Mari, Oct 7). The day-long phone
  // unlock only skips the PIN when the app is reopened or the Notes tab / Dictate
  // button returns to an already-open space — never on an explicit name pick.
  const pickDoctor = (doc) => { setActiveSurgeon(doc); setPage("pin"); };
  const unlock = (id) => {
    const v = { id, day: localYmd() };
    setUnlocked(v);
    if (phone) storeSet(UNLOCK_KEY, JSON.stringify(v));
    if (role === "doctor") { setRoleDoctorId(id); storeSet(ROLE_DOC_KEY, id); }
  };
  const lock = () => { setUnlocked(null); storeSet(UNLOCK_KEY, null); setActiveSurgeon(null); };
  const unlockManager = () => { setMgrDay(localYmd()); if (phone) storeSet(MGR_UNLOCK_KEY, localYmd()); };
  const openManager = () => setPage(managerOpen ? "manager" : "managerpin");
  // "Switch view": forget the role and both unlocks, back to the role picker.
  const switchView = () => {
    lock();
    setMgrDay(null); storeSet(MGR_UNLOCK_KEY, null);
    setRoleDoctorId(null); storeSet(ROLE_DOC_KEY, null);
    setRole(null); storeSet(ROLE_KEY, null);
    setOnboarding(false);
    setPage("home");
  };
  // Phone Home "Dictate a note": unlocked → straight to the Input tab; else the doctor picker.
  const dictate = () => {
    if (unlockedDoc) { setActiveSurgeon(unlockedDoc); setInputNonce((n) => n + 1); setPage("doctor"); }
    else setPage("notes");
  };

  let content;
  // ── Shared tool pages ──
  if (page === "inject") {
    content = phone ? (
      // Phone: the embed fills the space between the app bar and the tab bar.
      <div style={{ background: S.bg, height: PHONE_BODY_H, overflow: "hidden" }}>
        <iframe
          src="https://retina-rx.vercel.app"
          title="Can We Inject? — Coverage Lookup"
          style={{ display: "block", border: "none", width: "100%", height: "100%" }}
          allow="clipboard-write"
        />
      </div>
    ) : (
      <div style={{ minHeight: "100vh", background: S.bg, fontFamily: S.font, color: S.text, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "10px 20px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <button onClick={goHome} style={{ background: "none", border: `1px solid ${S.border}`, borderRadius: 8, padding: "6px 14px", color: S.muted, fontFamily: S.font, fontSize: "0.78rem", cursor: "pointer" }}>&larr; Home</button>
          <span style={{ fontSize: "1rem", fontWeight: 700, color: S.bright }}>💉 Can We Inject?</span>
        </div>
        <iframe
          src="https://retina-rx.vercel.app"
          title="Can We Inject? — Coverage Lookup"
          style={{ flex: 1, border: "none", width: "100%", minHeight: "calc(100vh - 52px)" }}
          allow="clipboard-write"
        />
      </div>
    );
  } else if (page === "coding") {
    // CptReference already has the tree + AI assistant
    content = <CptReference onBack={goHome} />;
  } else if (page === "education") {
    content = <PatientEducation onBack={goHome} />;
  } else if (page === "intakehpi") {
    // Sep 2026, per Mari — tech-facing CC/HPI tool (OCB modifier-25 settlement). No PIN.
    content = <IntakeHpi onBack={goHome} />;
  } else if (page === "documents") {
    content = <Documents onBack={goHome} onOpenEducation={() => setPage("education")} />;
  } else if (page === "schedule") {
    // Oct 2026 — 2-week schedule from the shared VRA Google Calendar. No PIN.
    content = <SchedulePage key={schedDay || "today"} initialDay={schedDay} onBack={goHome} />;
  } else if (page === "drops") {
    content = <DropSchedule onBack={goHome} backLabel="Hub" />;
  } else if (page === "dictator") {
    // ── Legacy: Op Note Dictator (still accessible from Robocall tab) ──
    content = <OpNoteDictator onBack={goHome} />;
  } else if (page === "notes" && phone) {
    // Phone "Notes" tab — the doctor picker.
    content = <DoctorPicker onSelectDoctor={pickDoctor} />;
  } else if (page === "pin" && activeSurgeon) {
    // ── PIN gate (verifies before entering doctor space) ──
    content = (
      <PinGate
        key={activeSurgeon.id}
        surgeon={activeSurgeon}
        onSuccess={() => { unlock(activeSurgeon.id); setPage(onboarding && phone ? "home" : "doctor"); setOnboarding(false); }}
        onCancel={() => { setActiveSurgeon(phone ? unlockedDoc : null); setPage(phone ? "notes" : "home"); }}
      />
    );
  } else if (page === "doctor" && activeSurgeon && !phone) {
    // ── Doctor space (desktop; on phones it is kept mounted below) ──
    content = <ClinicNoteGenerator onBack={leaveDoctor} surgeon={activeSurgeon} />;
  } else if (page === "managerpin") {
    // ── Manager's Hub (PIN-gated; managers + doctors, never techs) ──
    // Picked "Manager" on the role screen: PIN first, then the manager Home.
    // Cancel there goes back to the role picker.
    content = (
      <ManagerPinGate
        onSuccess={() => { unlockManager(); setPage(onboarding ? "home" : "manager"); setOnboarding(false); }}
        onCancel={onboarding ? switchView : goHome}
      />
    );
  } else if (page === "manager") {
    content = <RateComparison onBack={goHome} />;
  } else if (page === "doctor" && phone && activeSurgeon && unlockedId === activeSurgeon.id) {
    content = null; // rendered by the kept-mounted note generator below
  } else {
    // ── Homepage ──
    content = (
      <Homepage
        onSelectTool={(id) => { if (id === "schedule") setSchedDay(null); setPage(id); }}
        onOpenDay={(ymd) => { setSchedDay(ymd); setPage("schedule"); }}
        onSelectDoctor={pickDoctor}
        onSelectManager={openManager}
        unlockedDoctor={unlockedDoc}
        onDictate={dictate}
        onLock={lock}
        role={role}
        roleDoctorId={roleDoctorId}
        managerOpen={managerOpen}
        onSwitch={switchView}
      />
    );
  }

  if (!phone) return content;

  // ── Phone shell ──
  // The note generator stays mounted while the doctor is unlocked, so hopping
  // to Schedule or Inject and back keeps the note being written.
  const noteOpen = !!(activeSurgeon && unlockedId === activeSurgeon.id);
  const onTab = (id) => {
    if (id === "schedule") setSchedDay(null);
    if (id !== "notes") setPage(id);
    else if (noteOpen) setPage("doctor");
    // Remembered unlock (today): the Notes tab opens that doctor's space, no PIN.
    else if (unlockedDoc) { setActiveSurgeon(unlockedDoc); setPage("doctor"); }
    else setPage("notes");
  };
  return (
    <PhoneShell active={TAB_OF[page] || "home"} onTab={onTab} role={role}>
      <PhoneCtx.Provider value={{ phone: true, tabRoot: TAB_ROOTS.has(page) }}>
        {page === "doctor" && noteOpen ? null : content}
      </PhoneCtx.Provider>
      {noteOpen && (
        <div style={{ display: page === "doctor" ? "block" : "none" }}>
          <PhoneCtx.Provider value={{ phone: true, tabRoot: false }}>
            <ClinicNoteGenerator key={activeSurgeon.id} onBack={leaveDoctor} surgeon={activeSurgeon} inputNonce={inputNonce} />
          </PhoneCtx.Provider>
        </div>
      )}
    </PhoneShell>
  );
}

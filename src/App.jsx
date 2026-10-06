import { useState } from "react";
import OpNoteDictator from "./OpNoteDictator.jsx";
import ClinicNoteGenerator from "./ClinicNoteGenerator.jsx";
import CptReference from "./CptReference.jsx";
import PatientEducation from "./PatientEducation.jsx";
import Documents from "./Documents.jsx";
import RateComparison from "./RateComparison.jsx";
import IntakeHpi from "./IntakeHpi.jsx";
import CallBoard from "./CallBoard.jsx";
import { S, T, appBar, tile, iconBox, secHead, avatar, btn, RESPONSIVE_CSS } from "./theme.js";
import { InjectIcon, CodingIcon, EducationIcon, IntakeIcon, DocumentsIcon, ManagerIcon, LockIcon } from "./icons.jsx";
import logo from "./vra-logo.png";

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
        <img src={logo} alt="Vitreo-Retinal Associates" style={{ height: 44, width: "auto", display: "block", margin: "0 auto 18px", mixBlendMode: "multiply" }} />
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
export function Homepage({ onSelectTool, onSelectDoctor, onSelectManager }) {
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
  ];

  // "Monday, October 5"
  const todayWords = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const hoverOn = (e) => { e.currentTarget.style.borderColor = T.accentLine; };
  const hoverOff = (e) => { e.currentTarget.style.borderColor = T.line; };

  return (
    <div style={{ minHeight: "100vh", background: T.paper, fontFamily: T.sans, color: T.ink }}>
      <style>{RESPONSIVE_CSS}</style>
      {/* Top bar */}
      <header className="vra-bar" style={appBar}>
        <img src={logo} alt="Vitreo-Retinal Associates" style={{ height: 44, width: "auto", display: "block", mixBlendMode: "multiply" }} />
        <span style={{ width: 1, height: 22, background: T.line, flexShrink: 0 }} />
        <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, whiteSpace: "nowrap" }}>Practice Hub</div>
        <div style={{ flex: 1 }} />
        <div className="vra-bar-hide" style={{ fontSize: 13, color: T.ink2, whiteSpace: "nowrap" }}>{todayWords}</div>
      </header>

      <div className="vra-wrap" style={{ maxWidth: 880, margin: "0 auto", padding: "0 24px", boxSizing: "border-box" }}>
        {/* Call board — practice-wide date + on-call + F/U counter. Sep 2026, per
            Mari: everyone (techs, managers, doctors) sees it, no PIN. */}
        <CallBoard />

        {/* Shared tools */}
        <h2 style={secHead()}>Tools for everyone</h2>
        <div className="vra-tiles" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
          {sharedTools.map((tool, i) => {
            const Icon = tool.icon;
            return (
              <button key={tool.id} className="vra-tile" onClick={() => onSelectTool(tool.id)}
                style={tile({ gridColumn: i < 3 ? "span 2" : "span 3", borderTop: `3px solid ${tool.gradient}` })}
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

        {/* Doctor spaces */}
        <h2 style={secHead()}>Doctor notes</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {SURGEONS.map((doc) => (
            <button key={doc.id} className="vra-pill" onClick={() => onSelectDoctor(doc)}
              style={{ display: "flex", alignItems: "center", gap: 10, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 999, padding: "6px 16px 6px 6px", cursor: "pointer", fontFamily: T.sans, fontSize: 14, fontWeight: 500, color: T.ink, transition: "border-color .15s" }}
              onMouseEnter={hoverOn}
              onMouseLeave={hoverOff}>
              <span style={avatar(30)}>{doc.name}</span>
              {doc.surname || doc.name}
            </button>
          ))}
        </div>

        {/* Practice management */}
        <h2 style={secHead()}>Practice management</h2>
        <div className="vra-tiles" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
          {/* Manager's Hub (PIN-gated) */}
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
              <LockIcon />PIN required
            </span>
          </button>
        </div>

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

  if (checking) {
    return (
      <div style={{ minHeight: "100vh", background: S.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: S.font }}>
        <div style={{ color: S.muted, fontSize: "0.9rem" }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: S.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: S.font }}>
      <form onSubmit={handleSubmit} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: T.rLg, padding: "32px 28px", width: "100%", maxWidth: 340, textAlign: "center", boxSizing: "border-box", margin: "0 16px", fontFamily: T.sans }}>
        <div style={avatar(48, { fontSize: 14, margin: "0 auto 14px" })}>{surgeon.name}</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Doctor Space</div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>Enter PIN to continue</div>
        <input type="password" inputMode="numeric" pattern="[0-9]*" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" autoFocus
          style={{ display: "block", width: "100%", background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.r, padding: "10px 14px", color: T.ink, fontFamily: T.sans, outline: "none", fontSize: "1.1rem", boxSizing: "border-box", marginBottom: 12, textAlign: "center", letterSpacing: 6 }} />
        {error && <div style={{ color: T.red, fontSize: "0.76rem", marginBottom: 10 }}>{error}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onCancel}
            style={{ flex: 1, background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.r, height: 38, padding: 0, color: T.ink2, fontFamily: T.sans, fontSize: 13.5, fontWeight: 500, cursor: "pointer" }}>Cancel</button>
          <button type="submit" disabled={loading || !pin.trim()}
            style={{ flex: 1, background: loading || !pin.trim() ? T.accentSoft : T.accent, color: loading || !pin.trim() ? T.muted : T.onAccent, border: "none", borderRadius: T.r, height: 38, padding: 0, fontSize: 13.5, fontFamily: T.sans, fontWeight: 600, cursor: loading || !pin.trim() ? "not-allowed" : "pointer" }}>
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

// ── App Router ──────────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(false);
  const [page, setPage] = useState("home");
  // page: home | inject | coding | education | intakehpi | documents | dictator | doctor | pin
  const [activeSurgeon, setActiveSurgeon] = useState(null);

  if (!authed) {
    return <PasswordGate onSuccess={() => setAuthed(true)} />;
  }

  // ── Shared tool pages ──
  if (page === "inject") {
    return (
      <div style={{ minHeight: "100vh", background: S.bg, fontFamily: S.font, color: S.text, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "10px 20px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <button onClick={() => setPage("home")} style={{ background: "none", border: `1px solid ${S.border}`, borderRadius: 8, padding: "6px 14px", color: S.muted, fontFamily: S.font, fontSize: "0.78rem", cursor: "pointer" }}>&larr; Home</button>
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
  }

  if (page === "coding") {
    // CptReference already has the tree + AI assistant
    return <CptReference onBack={() => setPage("home")} />;
  }

  if (page === "education") {
    return <PatientEducation onBack={() => setPage("home")} />;
  }

  // Sep 2026, per Mari — tech-facing CC/HPI tool (OCB modifier-25 settlement). No PIN.
  if (page === "intakehpi") {
    return <IntakeHpi onBack={() => setPage("home")} />;
  }

  if (page === "documents") {
    return <Documents onBack={() => setPage("home")} onOpenEducation={() => setPage("education")} />;
  }

  // ── Legacy: Op Note Dictator (still accessible from Robocall tab) ──
  if (page === "dictator") {
    return <OpNoteDictator onBack={() => setPage("home")} />;
  }

  // ── PIN gate (verifies before entering doctor space) ──
  if (page === "pin" && activeSurgeon) {
    return (
      <PinGate
        surgeon={activeSurgeon}
        onSuccess={() => setPage("doctor")}
        onCancel={() => { setPage("home"); setActiveSurgeon(null); }}
      />
    );
  }

  // ── Doctor space ──
  if (page === "doctor" && activeSurgeon) {
    return (
      <ClinicNoteGenerator
        onBack={() => { setPage("home"); setActiveSurgeon(null); }}
        surgeon={activeSurgeon}
      />
    );
  }

  // ── Manager's Hub (PIN-gated; managers + doctors, never techs) ──
  if (page === "managerpin") {
    return <ManagerPinGate onSuccess={() => setPage("manager")} onCancel={() => setPage("home")} />;
  }
  if (page === "manager") {
    return <RateComparison onBack={() => setPage("home")} />;
  }

  // ── Homepage ──
  return (
    <Homepage
      onSelectTool={(id) => setPage(id)}
      onSelectDoctor={(doc) => { setActiveSurgeon(doc); setPage("pin"); }}
      onSelectManager={() => setPage("managerpin")}
    />
  );
}

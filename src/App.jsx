import { useState } from "react";
import OpNoteDictator from "./OpNoteDictator.jsx";
import ClinicNoteGenerator from "./ClinicNoteGenerator.jsx";
import CptReference from "./CptReference.jsx";
import PatientEducation from "./PatientEducation.jsx";
import Documents from "./Documents.jsx";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://op-note-dictator-server-production.up.railway.app";

// ── Shared styles ───────────────────────────────────────────────────
const S = {
  bg: "#0f172a",
  card: "#1e293b",
  border: "#334155",
  muted: "#64748b",
  text: "#e2e8f0",
  bright: "#f1f5f9",
  accent: "#6366f1",
  accentLight: "#a5b4fc",
  green: "#4ade80",
  greenDark: "#166534",
  amber: "#f59e0b",
  font: "Georgia, serif",
  mono: "monospace",
};

// ── Surgeon roster ──────────────────────────────────────────────────
const SURGEONS = [
  { id: "MR", name: "MR", surgeonId: "998eae6c-1516-43d5-8bc7-6905074cd8e3", hasRobocall: true },
  { id: "BKH", name: "BKH", surgeonId: null },
  { id: "FJM", name: "FJM", surgeonId: null },
  { id: "BJB", name: "BJB", surgeonId: null },
  { id: "WSF", name: "WSF", surgeonId: null },
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
      <form onSubmit={handleSubmit} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: "40px 36px", width: "100%", maxWidth: 380, textAlign: "center" }}>
        <div style={{ width: 56, height: 56, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 16px" }}>&#9877;</div>
        <div style={{ fontSize: "1.2rem", fontWeight: 700, color: S.bright, marginBottom: 4 }}>VRA Practice Hub</div>
        <div style={{ fontSize: "0.78rem", color: S.muted, marginBottom: 24 }}>Clinical Workflow Tools</div>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" autoFocus
          style={{ display: "block", width: "100%", background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, padding: "12px 14px", color: S.text, fontFamily: S.mono, fontSize: "0.9rem", boxSizing: "border-box", marginBottom: 12, textAlign: "center" }} />
        {error && <div style={{ color: "#f87171", fontSize: "0.76rem", marginBottom: 10 }}>{error}</div>}
        <button type="submit" disabled={loading || !password.trim()}
          style={{ width: "100%", background: loading || !password.trim() ? S.card : "linear-gradient(135deg,#6366f1,#8b5cf6)", color: loading || !password.trim() ? "#475569" : "#fff", border: "none", borderRadius: 8, padding: "12px 0", fontSize: "0.92rem", fontFamily: S.font, fontWeight: 600, cursor: loading || !password.trim() ? "not-allowed" : "pointer" }}>
          {loading ? "Verifying..." : "Enter"}
        </button>
      </form>
    </div>
  );
}

// ── Homepage ────────────────────────────────────────────────────────
function Homepage({ onSelectTool, onSelectDoctor }) {
  const sharedTools = [
    {
      id: "inject",
      title: "Can We Inject?",
      icon: "💉",
      description: "Check PA requirements, step therapy, and billing alerts by drug + insurance plan.",
      gradient: "linear-gradient(135deg,#10b981,#059669)",
      tags: ["PA Lookup", "Step Therapy", "288 Plans"],
    },
    {
      id: "coding",
      title: "Coding",
      icon: "🤖",
      description: "CPT tree by diagnosis, AI Coding Assistant for ICD-10, E/M, modifiers, and billing questions.",
      gradient: "linear-gradient(135deg,#6366f1,#8b5cf6)",
      tags: ["CPT", "ICD-10", "E/M", "AI Assistant"],
    },
    {
      id: "education",
      title: "Patient Education",
      icon: "📄",
      description: "Searchable handout library for conditions, procedures, and post-injection instructions. Printable.",
      gradient: "linear-gradient(135deg,#f59e0b,#d97706)",
      tags: ["EN", "ES", "VI", "PT"],
    },
    {
      id: "documents",
      title: "Workflow Documents",
      icon: "📁",
      description: "Branded VRA packets and forms for staff: surgical package, post-pneumatic info, registration, consents. Each with language picker.",
      gradient: "linear-gradient(135deg,#06b6d4,#0891b2)",
      tags: ["EN", "ES", "VI", "PT", "Fillable"],
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: S.bg, fontFamily: S.font, color: S.text }}>
      {/* Header */}
      <div style={{ textAlign: "center", padding: "40px 24px 28px" }}>
        <div style={{ width: 56, height: 56, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 14px" }}>&#9877;</div>
        <div style={{ fontSize: "1.5rem", fontWeight: 700, color: S.bright, marginBottom: 4 }}>VRA Practice Hub</div>
        <div style={{ fontSize: "0.82rem", color: S.muted, fontFamily: S.mono }}>Clinical Workflow Tools</div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 20px 48px" }}>
        {/* Shared tools */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 32 }}>
          {sharedTools.map((tool) => (
            <button key={tool.id} onClick={() => onSelectTool(tool.id)}
              style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: 0, cursor: "pointer", textAlign: "left", overflow: "hidden", transition: "border-color 0.2s, transform 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = S.accent; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = S.border; e.currentTarget.style.transform = "translateY(0)"; }}>
              {/* Gradient banner */}
              <div style={{ background: tool.gradient, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "1.5rem" }}>{tool.icon}</span>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff", fontFamily: S.font }}>{tool.title}</div>
              </div>
              {/* Body */}
              <div style={{ padding: "12px 16px" }}>
                <div style={{ fontSize: "0.78rem", color: "#94a3b8", lineHeight: 1.5, marginBottom: 10, fontFamily: S.font }}>{tool.description}</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {tool.tags.map((tag) => (
                    <span key={tag} style={{ background: "#312e81", color: S.accentLight, padding: "2px 8px", borderRadius: 20, fontSize: "0.62rem", fontFamily: S.mono, fontWeight: 600 }}>{tag}</span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Doctor spaces divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div style={{ height: 1, flex: 1, background: S.border }} />
          <span style={{ fontSize: "0.75rem", color: S.muted, fontFamily: S.mono, textTransform: "uppercase", letterSpacing: 1 }}>Doctor Notes</span>
          <div style={{ height: 1, flex: 1, background: S.border }} />
        </div>

        {/* Doctor buttons */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          {SURGEONS.map((doc) => (
            <button key={doc.id} onClick={() => onSelectDoctor(doc)}
              style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: "16px 28px", cursor: "pointer", transition: "border-color 0.2s, transform 0.15s", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 90 }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = S.green; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = S.border; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", fontWeight: 700, color: "#fff", fontFamily: S.mono }}>{doc.name}</div>
            </button>
          ))}
        </div>
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
      <form onSubmit={handleSubmit} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: "36px 32px", width: "100%", maxWidth: 340, textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", fontWeight: 700, color: "#fff", fontFamily: S.mono, margin: "0 auto 14px" }}>{surgeon.name}</div>
        <div style={{ fontSize: "0.95rem", fontWeight: 700, color: S.bright, marginBottom: 4 }}>Doctor Space</div>
        <div style={{ fontSize: "0.76rem", color: S.muted, marginBottom: 20 }}>Enter PIN to continue</div>
        <input type="password" inputMode="numeric" pattern="[0-9]*" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" autoFocus
          style={{ display: "block", width: "100%", background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, padding: "12px 14px", color: S.text, fontFamily: S.mono, fontSize: "1.1rem", boxSizing: "border-box", marginBottom: 12, textAlign: "center", letterSpacing: 6 }} />
        {error && <div style={{ color: "#f87171", fontSize: "0.76rem", marginBottom: 10 }}>{error}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onCancel}
            style={{ flex: 1, background: "none", border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 0", color: S.muted, fontFamily: S.font, fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
          <button type="submit" disabled={loading || !pin.trim()}
            style={{ flex: 1, background: loading || !pin.trim() ? S.card : "linear-gradient(135deg,#6366f1,#8b5cf6)", color: loading || !pin.trim() ? "#475569" : "#fff", border: "none", borderRadius: 8, padding: "10px 0", fontSize: "0.85rem", fontFamily: S.font, fontWeight: 600, cursor: loading || !pin.trim() ? "not-allowed" : "pointer" }}>
            {loading ? "..." : "Enter"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── App Router ──────────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(false);
  const [page, setPage] = useState("home");
  // page: home | inject | coding | education | documents | dictator | doctor | pin
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

  // ── Homepage ──
  return (
    <Homepage
      onSelectTool={(id) => setPage(id)}
      onSelectDoctor={(doc) => { setActiveSurgeon(doc); setPage("pin"); }}
    />
  );
}

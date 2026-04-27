import { useState } from "react";
import OpNoteDictator from "./OpNoteDictator.jsx";
import ClinicNoteGenerator from "./ClinicNoteGenerator.jsx";

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
  font: "Georgia, serif",
  mono: "monospace",
};

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
    <div
      style={{
        minHeight: "100vh",
        background: S.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: S.font,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: S.card,
          border: `1px solid ${S.border}`,
          borderRadius: 14,
          padding: "40px 36px",
          width: "100%",
          maxWidth: 380,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            margin: "0 auto 16px",
          }}
        >
          &#9877;
        </div>
        <div
          style={{
            fontSize: "1.2rem",
            fontWeight: 700,
            color: S.bright,
            marginBottom: 4,
          }}
        >
          Retina-Rx
        </div>
        <div
          style={{
            fontSize: "0.78rem",
            color: S.muted,
            marginBottom: 24,
          }}
        >
          Clinical Workflow Tools
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          autoFocus
          style={{
            display: "block",
            width: "100%",
            background: S.bg,
            border: `1px solid ${S.border}`,
            borderRadius: 8,
            padding: "12px 14px",
            color: S.text,
            fontFamily: S.mono,
            fontSize: "0.9rem",
            boxSizing: "border-box",
            marginBottom: 12,
            textAlign: "center",
          }}
        />

        {error && (
          <div
            style={{
              color: "#f87171",
              fontSize: "0.76rem",
              marginBottom: 10,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !password.trim()}
          style={{
            width: "100%",
            background:
              loading || !password.trim()
                ? S.card
                : "linear-gradient(135deg,#6366f1,#8b5cf6)",
            color: loading || !password.trim() ? "#475569" : "#fff",
            border: "none",
            borderRadius: 8,
            padding: "12px 0",
            fontSize: "0.92rem",
            fontFamily: S.font,
            fontWeight: 600,
            cursor:
              loading || !password.trim() ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Verifying..." : "Enter"}
        </button>
      </form>
    </div>
  );
}

// ── Landing Page ────────────────────────────────────────────────────
function LandingPage({ onSelect }) {
  const tools = [
    {
      id: "dictator",
      title: "Op Note Dictator",
      subtitle: "Surgical Dictation",
      description:
        "Generate operative notes for 7 retina procedures and dictate them via Twilio to your surgical center.",
      icon: "\u{1F4DE}",
      gradient: "linear-gradient(135deg,#0ea5e9,#6366f1)",
      tags: ["PPV", "Buckle", "IOL", "TwiML"],
    },
    {
      id: "optimizer",
      title: "Clinic Note Generator",
      subtitle: "A/P Notes & Billing",
      description:
        "Free-type shorthand to generate structured A/P notes with counseling language, or paste a note to add billing-compliant language and coding.",
      icon: "\u{1F4CB}",
      gradient: "linear-gradient(135deg,#6366f1,#8b5cf6)",
      tags: ["Shorthand", "Billing", "A/P Notes"],
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: S.bg,
        fontFamily: S.font,
        color: S.text,
      }}
    >
      {/* Header */}
      <div
        style={{
          textAlign: "center",
          padding: "48px 24px 32px",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            margin: "0 auto 14px",
          }}
        >
          &#9877;
        </div>
        <div
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: S.bright,
            marginBottom: 4,
          }}
        >
          Retina-Rx
        </div>
        <div
          style={{
            fontSize: "0.82rem",
            color: S.muted,
            fontFamily: S.mono,
          }}
        >
          Clinical Workflow Tools
        </div>
      </div>

      {/* Tool cards */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxWidth: 520,
          margin: "0 auto",
          padding: "0 20px 48px",
        }}
      >
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onSelect(tool.id)}
            style={{
              background: S.card,
              border: `1px solid ${S.border}`,
              borderRadius: 14,
              padding: 0,
              cursor: "pointer",
              textAlign: "left",
              overflow: "hidden",
              transition: "border-color 0.2s, transform 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = S.accent;
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = S.border;
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {/* Gradient banner */}
            <div
              style={{
                background: tool.gradient,
                padding: "18px 20px",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <span style={{ fontSize: "1.8rem" }}>{tool.icon}</span>
              <div>
                <div
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    color: "#fff",
                    fontFamily: S.font,
                  }}
                >
                  {tool.title}
                </div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "rgba(255,255,255,0.75)",
                    fontFamily: S.mono,
                    marginTop: 2,
                  }}
                >
                  {tool.subtitle}
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: "16px 20px" }}>
              <div
                style={{
                  fontSize: "0.84rem",
                  color: "#94a3b8",
                  lineHeight: 1.5,
                  marginBottom: 12,
                  fontFamily: S.font,
                }}
              >
                {tool.description}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {tool.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      background: "#312e81",
                      color: S.accentLight,
                      padding: "3px 10px",
                      borderRadius: 20,
                      fontSize: "0.68rem",
                      fontFamily: S.mono,
                      fontWeight: 600,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── App Router ──────────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(false);
  const [page, setPage] = useState("home"); // home | dictator | optimizer

  if (!authed) {
    return <PasswordGate onSuccess={() => setAuthed(true)} />;
  }

  if (page === "dictator") {
    return <OpNoteDictator onBack={() => setPage("home")} />;
  }

  if (page === "optimizer") {
    return <ClinicNoteGenerator onBack={() => setPage("home")} />;
  }

  return <LandingPage onSelect={(id) => setPage(id)} />;
}

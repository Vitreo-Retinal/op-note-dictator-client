import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://op-note-dictator-server-production.up.railway.app";

const S = {
  bg: "#0f172a",
  card: "#1e293b",
  border: "#334155",
  muted: "#64748b",
  text: "#e2e8f0",
  bright: "#f1f5f9",
  accent: "#6366f1",
  accentLight: "#a5b4fc",
  font: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif',
  mono: '"SF Mono", Menlo, Monaco, monospace',
};

const LANGS = [
  { code: "en", label: "English", short: "EN" },
  { code: "es", label: "Español", short: "ES" },
  { code: "vi", label: "Tiếng Việt", short: "VI" },
  { code: "pt", label: "Português", short: "PT" },
];

// Document catalog. To add a new document later:
// - Set `urlBuilder(lang)` to return the PDF URL for that language, OR
// - Set `comingSoon: true` to render as a placeholder card.
const DOCUMENTS = [
  {
    id: "surgical-package",
    title: "Surgical Package",
    icon: "📋",
    description:
      "5-page (EN) / 6-page (ES, VI, PT) packet: pre-op instructions, face-down recovery, fillable scheduling form, vitrectomy discharge, and Worcester Surgical Center pre-admission.",
    gradient: "linear-gradient(135deg,#10b981,#059669)",
    languages: ["en", "es", "vi", "pt"],
    urlBuilder: (lang) => `${API_BASE}/api/surgical-package-pdf?lang=${lang}`,
    tags: ["Fillable", "5-6 pages"],
  },
  {
    id: "post-injection",
    title: "Post-Injection Instructions",
    icon: "💉",
    description: "After-care instructions for patients who just received an intravitreal injection. Currently lives in the Patient Education library — tap to open there.",
    gradient: "linear-gradient(135deg,#f59e0b,#d97706)",
    languages: ["en", "es", "vi", "pt"],
    // For now this points to Patient Education; once Mari wants a standalone PDF we'll add one.
    linkToEducation: "inject-post",
    tags: ["EN", "ES", "VI", "PT", "Education library"],
  },
  {
    id: "post-pneumatic",
    title: "Post-Pneumatic Retinopexy",
    icon: "🫧",
    description: "Single-page after-care instructions: 4-day positioning, Ofloxacin QID × 4 days, SF6 gas restrictions, next-day F/U for laser/cryo. Lives in the Patient Education library.",
    gradient: "linear-gradient(135deg,#8b5cf6,#6366f1)",
    languages: ["en", "es", "vi", "pt"],
    linkToEducation: "proc-pneumatic-post",
    tags: ["EN", "ES", "VI", "PT", "Education library"],
  },
  {
    id: "registration-package",
    title: "Registration Package",
    icon: "📝",
    description: "Coming soon — pending clarification on whether this is separate from the Worcester Surgical Center pre-admission already in the Surgical Package.",
    gradient: "linear-gradient(135deg,#0ea5e9,#0284c7)",
    comingSoon: true,
    tags: ["Coming soon"],
  },
  {
    id: "consents",
    title: "Consent Forms",
    icon: "✍️",
    description: "Coming soon — surgical and procedural consent forms (vitrectomy, intravitreal injection, IV sedation, photography, HIPAA).",
    gradient: "linear-gradient(135deg,#ef4444,#dc2626)",
    comingSoon: true,
    tags: ["Coming soon"],
  },
];

function LanguageButton({ lang, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "#1e293b",
        border: `1px solid ${S.border}`,
        borderRadius: 8,
        padding: "8px 14px",
        color: S.accentLight,
        fontFamily: S.mono,
        fontSize: "0.78rem",
        fontWeight: 600,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        minWidth: 70,
        transition: "border-color 0.2s, transform 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = S.accent;
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = S.border;
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <span style={{ fontSize: "0.95rem", fontWeight: 700 }}>{lang.short}</span>
      <span style={{ fontSize: "0.65rem", color: S.muted, fontWeight: 500 }}>{lang.label}</span>
    </button>
  );
}

function DocumentCard({ doc, onOpenEducation }) {
  const langs = LANGS.filter((l) => doc.languages && doc.languages.includes(l.code));

  return (
    <div
      style={{
        background: S.card,
        border: `1px solid ${S.border}`,
        borderRadius: 14,
        overflow: "hidden",
        opacity: doc.comingSoon ? 0.6 : 1,
      }}
    >
      {/* Gradient banner */}
      <div style={{ background: doc.gradient, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: "1.6rem" }}>{doc.icon}</span>
        <div style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", fontFamily: S.font }}>{doc.title}</div>
      </div>

      {/* Body */}
      <div style={{ padding: "14px 18px" }}>
        <div style={{ fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.55, marginBottom: 12 }}>{doc.description}</div>

        {/* Tags */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {doc.tags.map((tag) => (
            <span
              key={tag}
              style={{
                background: doc.comingSoon ? "#475569" : "#312e81",
                color: doc.comingSoon ? "#cbd5e1" : S.accentLight,
                padding: "3px 9px",
                borderRadius: 20,
                fontSize: "0.64rem",
                fontFamily: S.mono,
                fontWeight: 600,
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Action row */}
        {doc.comingSoon ? (
          <div style={{ fontSize: "0.78rem", color: S.muted, fontStyle: "italic" }}>Not yet available</div>
        ) : doc.linkToEducation ? (
          <button
            onClick={() => onOpenEducation(doc.linkToEducation)}
            style={{
              background: "#312e81",
              border: `1px solid ${S.border}`,
              borderRadius: 8,
              padding: "10px 16px",
              color: S.accentLight,
              fontFamily: S.font,
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Open in Patient Education →
          </button>
        ) : doc.urlBuilder ? (
          <div>
            <div style={{ fontSize: "0.72rem", color: S.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5, fontFamily: S.mono }}>
              Open / Download (opens in new tab)
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {langs.map((lang) => (
                <LanguageButton
                  key={lang.code}
                  lang={lang}
                  onClick={() => window.open(doc.urlBuilder(lang.code), "_blank")}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function Documents({ onBack, onOpenEducation }) {
  return (
    <div style={{ minHeight: "100vh", background: S.bg, fontFamily: S.font, color: S.text, paddingBottom: 60 }}>
      {/* Header */}
      <div
        style={{
          padding: "10px 20px",
          borderBottom: `1px solid ${S.border}`,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: `1px solid ${S.border}`,
            borderRadius: 8,
            padding: "6px 14px",
            color: S.muted,
            fontFamily: S.font,
            fontSize: "0.78rem",
            cursor: "pointer",
          }}
        >
          ← Home
        </button>
        <span style={{ fontSize: "1rem", fontWeight: 700, color: S.bright }}>📁 Workflow Documents</span>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 20px 0" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: "1.45rem", fontWeight: 700, color: S.bright, marginBottom: 4 }}>Quick-Access Documents</div>
          <div style={{ fontSize: "0.82rem", color: S.muted }}>Branded VRA forms and packets for staff to download, print, or share with patients. Pick a language per document.</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
          {DOCUMENTS.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} onOpenEducation={onOpenEducation} />
          ))}
        </div>
      </div>
    </div>
  );
}

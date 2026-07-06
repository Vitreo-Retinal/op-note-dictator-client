import { useState, useMemo } from "react";
import DropSchedule from "./DropSchedule.jsx";
import { CATEGORIES, LANGUAGES, HANDOUTS } from "./data/educationContent.js";
import { downloadHandoutPDF } from "./lib/educationHelpers.js";
export { HANDOUTS };

// ── Styles (matches App.jsx theme) ─────────────────────────────────
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
  amber: "#f59e0b",
  font: "Georgia, serif",
  mono: "monospace",
};



// ── Component ──────────────────────────────────────────────────────
export default function PatientEducation({ onBack }) {
  const [view, setView] = useState("handouts"); // "handouts" or "drops"
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [lang, setLang] = useState("en");
  const [expanded, setExpanded] = useState(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return HANDOUTS.filter((h) => {
      if (category !== "all" && h.category !== category) return false;
      if (!q) return true;
      const title = h.title[lang] || h.title.en;
      const content = h.content[lang] || h.content.en;
      return (
        title.toLowerCase().includes(q) ||
        h.tags.some((t) => t.toLowerCase().includes(q)) ||
        content.toLowerCase().includes(q)
      );
    });
  }, [search, category, lang]);

  // If viewing Drop Schedule, render that component
  if (view === "drops") {
    return <DropSchedule onBack={() => setView("handouts")} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: S.bg, fontFamily: S.font, color: S.text }}>
      {/* Header */}
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0, flexWrap: "wrap" }}>
        <button onClick={onBack} style={{ background: "none", border: `1px solid ${S.border}`, borderRadius: 8, padding: "6px 14px", color: S.muted, fontFamily: S.font, fontSize: "0.78rem", cursor: "pointer" }}>&larr; Home</button>
        <span style={{ fontSize: "1rem", fontWeight: 700, color: S.bright }}>Patient Education Library</span>
        {/* Drop Schedule button */}
        <button
          onClick={() => setView("drops")}
          style={{ background: "linear-gradient(135deg,#059669,#10b981)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 16px", fontFamily: S.font, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
        >
          Drop Schedule Builder
        </button>
        {/* Language toggle */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {LANGUAGES.map((l) => (
            <button
              key={l.id}
              onClick={() => setLang(l.id)}
              style={{
                background: lang === l.id ? S.green : "transparent",
                color: lang === l.id ? "#000" : S.muted,
                border: `1px solid ${lang === l.id ? S.green : S.border}`,
                borderRadius: 6,
                padding: "4px 10px",
                fontSize: "0.7rem",
                fontFamily: S.mono,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search + Filters */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "16px 20px 0" }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search handouts... (e.g. AMD, injection, diabetic, floaters)"
          style={{ display: "block", width: "100%", background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: "12px 16px", color: S.text, fontFamily: S.font, fontSize: "0.88rem", boxSizing: "border-box", marginBottom: 12 }}
        />
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              style={{
                background: category === cat.id ? S.accent : "transparent",
                color: category === cat.id ? "#fff" : S.muted,
                border: `1px solid ${category === cat.id ? S.accent : S.border}`,
                borderRadius: 20,
                padding: "5px 14px",
                fontSize: "0.76rem",
                fontFamily: S.mono,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {cat.label}
            </button>
          ))}
          <span style={{ fontSize: "0.72rem", color: S.muted, fontFamily: S.mono, marginLeft: "auto" }}>{filtered.length} handout{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Handout list */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 20px 48px" }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: S.muted, fontSize: "0.88rem" }}>
            No handouts match your search.
          </div>
        )}
        {filtered.map((h) => {
          const isOpen = expanded === h.id;
          const title = h.title[lang] || h.title.en;
          const content = h.content[lang] || h.content.en;
          return (
            <div key={h.id} style={{ background: S.card, border: `1px solid ${isOpen ? S.accent : S.border}`, borderRadius: 12, marginBottom: 10, overflow: "hidden", transition: "border-color 0.2s" }}>
              {/* Title row */}
              <button
                onClick={() => setExpanded(isOpen ? null : h.id)}
                style={{ width: "100%", background: "none", border: "none", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" }}
              >
                <span style={{ fontSize: "0.72rem", fontFamily: S.mono, color: S.amber, fontWeight: 700, textTransform: "uppercase", minWidth: 75 }}>
                  {h.category === "injection" ? "Injection" : h.category === "procedure" ? "Procedure" : "Condition"}
                </span>
                <span style={{ fontSize: "0.88rem", color: S.bright, fontFamily: S.font, fontWeight: 600, flex: 1 }}>{title}</span>
                <span style={{ color: S.muted, fontSize: "0.8rem", transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>&#9660;</span>
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div style={{ padding: "0 18px 16px" }}>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
                    {h.tags.map((t) => (
                      <span key={t} style={{ background: "#312e81", color: S.accentLight, padding: "2px 8px", borderRadius: 20, fontSize: "0.62rem", fontFamily: S.mono, fontWeight: 600 }}>{t}</span>
                    ))}
                  </div>
                  <pre style={{ whiteSpace: "pre-wrap", fontFamily: S.font, fontSize: "0.82rem", color: S.text, lineHeight: 1.65, margin: 0, maxHeight: 500, overflowY: "auto", paddingRight: 8 }}>
                    {content.replace(/\[PAGE_BREAK\]\n?/g, "").replace(/\[IMAGE[^\]]*\]\n?/g, "")}
                  </pre>
                  <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
                    <button
                      onClick={() => downloadHandoutPDF(h, lang)}
                      style={{ background: "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: "0.8rem", fontFamily: S.font, fontWeight: 600, cursor: "pointer" }}
                    >
                      Download PDF ({lang.toUpperCase()})
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

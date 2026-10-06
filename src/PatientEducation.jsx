import { useState, useMemo } from "react";
import DropSchedule from "./DropSchedule.jsx";
import { CATEGORIES, LANGUAGES, HANDOUTS } from "./data/educationContent.js";
import { downloadHandoutPDF } from "./lib/educationHelpers.js";
import { S, T, chip, btnSm } from "./theme.js";
import PageBar, { segWrap, segBtn, wrap, searchInput } from "./PageBar.jsx";
import { ChevronRightIcon, ChevronDownIcon, SearchIcon, PrintIcon } from "./icons.jsx";
export { HANDOUTS };

// ── Styles (matches App.jsx theme) ─────────────────────────────────



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
    <div style={{ minHeight: "100vh", background: T.paper, fontFamily: T.sans, color: T.ink }}>
      {/* Header */}
      <PageBar onBack={onBack} backLabel="Back" title="Patient Education Library" />

      {/* Toolbar: Drop Schedule + language picker */}
      <div className="vra-wrap" style={wrap({ paddingTop: 20, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" })}>
        {/* Drop Schedule button */}
        <button
          onClick={() => setView("drops")}
          style={btnSm("secondary")}
        >
          Drop Schedule Builder<ChevronRightIcon size={14} />
        </button>
        {/* Language toggle — segmented control */}
        <div role="group" aria-label="Language" style={{ ...segWrap, marginLeft: "auto" }}>
          {LANGUAGES.map((l) => (
            <button
              key={l.id}
              onClick={() => setLang(l.id)}
              aria-pressed={lang === l.id}
              style={segBtn(lang === l.id, { padding: "5px 12px", fontSize: 13 })}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="vra-wrap" style={wrap({ paddingTop: 14 })}>
        <div style={{ position: "relative", marginBottom: 12 }}>
          <span style={{ position: "absolute", left: 13, top: 13, color: T.muted, pointerEvents: "none" }}><SearchIcon /></span>
          <input
            type="text"
            className="vra-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search handouts... (e.g. AMD, injection, diabetic, floaters)"
            style={searchInput({ paddingLeft: 38, textOverflow: "ellipsis" })}
          />
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              aria-pressed={category === cat.id}
              style={chip(category === cat.id ? "accent" : "muted", {
                padding: "4px 11px", fontSize: 12.5, cursor: "pointer",
                ...(category === cat.id
                  ? { background: T.accent, color: T.onAccent, borderColor: T.accent }
                  : { background: T.surface, color: T.ink2, fontWeight: 400 }),
              })}
            >
              {cat.label}
            </button>
          ))}
          <span style={{ fontSize: 12, color: T.muted, fontFamily: T.sans, marginLeft: "auto" }}>{filtered.length} handout{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Handout list */}
      <div className="vra-wrap" style={wrap({ paddingBottom: 48 })}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: T.muted, fontSize: 14 }}>
            No handouts match your search.
          </div>
        )}
        {filtered.map((h) => {
          const isOpen = expanded === h.id;
          const title = h.title[lang] || h.title.en;
          const content = h.content[lang] || h.content.en;
          return (
            <div key={h.id} style={{ background: T.surface, border: `1px solid ${isOpen ? T.accentLine : T.line}`, borderRadius: T.rLg, marginBottom: 8, overflow: "hidden", transition: "border-color .15s" }}>
              {/* Title row */}
              <button
                onClick={() => setExpanded(isOpen ? null : h.id)}
                aria-expanded={isOpen}
                style={{ width: "100%", background: "none", border: "none", padding: "12px 14px 12px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left", fontFamily: T.sans }}
              >
                <span style={{ fontSize: 14, color: T.ink, fontFamily: T.sans, fontWeight: 500, flex: 1, minWidth: 0 }}>{title}</span>
                <span style={chip(h.category === "injection" ? "accent" : h.category === "procedure" ? "gold" : "muted", { flexShrink: 0 })}>
                  {h.category === "injection" ? "Injection" : h.category === "procedure" ? "Procedure" : "Condition"}
                </span>
                <span style={{ color: T.muted, display: "flex", flexShrink: 0 }}>{isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}</span>
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div style={{ padding: "0 16px 16px" }}>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
                    {h.tags.map((t) => (
                      <span key={t} style={chip("muted", { fontWeight: 400 })}>{t}</span>
                    ))}
                  </div>
                  <pre style={{ whiteSpace: "pre-wrap", fontFamily: T.sans, fontSize: 13.5, color: T.ink, lineHeight: 1.65, margin: 0, maxHeight: 500, overflowY: "auto", padding: "12px 14px", background: T.paper, border: `1px solid ${T.line}`, borderRadius: T.r }}>
                    {content.replace(/\[PAGE_BREAK\]\n?/g, "").replace(/\[IMAGE[^\]]*\]\n?/g, "")}
                  </pre>
                  <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                    <button
                      onClick={() => downloadHandoutPDF(h, lang)}
                      style={btnSm("primary")}
                    >
                      <PrintIcon size={14} />Download PDF ({lang.toUpperCase()})
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

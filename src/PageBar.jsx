// Shared 58px app bar for tool pages (Phase 3) — same markup as the Phase 2
// ClinicNoteGenerator header: "← Hub" ghost back button, logo, divider, title,
// optional right-side slot. Also injects RESPONSIVE_CSS so each page's
// className hooks (vra-wrap, vra-row2, vra-seg …) work at phone width.
import { T, appBar, RESPONSIVE_CSS } from "./theme.js";
import { BackIcon } from "./icons.jsx";
import logo from "./vra-logo.png";

export function backBtnStyle(extra = {}) {
  return {
    display: "inline-flex", alignItems: "center", gap: 6, background: "none",
    border: `1px solid ${T.line}`, borderRadius: T.r, color: T.ink2,
    padding: "6px 10px 6px 6px", cursor: "pointer", fontFamily: T.sans, fontSize: 13,
    flexShrink: 0, ...extra,
  };
}

// Segmented control container + button (mockup .seg)
export const segWrap = {
  display: "inline-flex", background: T.surface, border: `1px solid ${T.line}`,
  borderRadius: T.r, padding: 3, boxSizing: "border-box", maxWidth: "100%",
};
export function segBtn(active, extra = {}) {
  return {
    padding: "6px 14px", borderRadius: 4, background: active ? T.accent : "transparent",
    color: active ? T.onAccent : T.ink2, border: "none", fontFamily: T.sans, fontSize: 13.5,
    fontWeight: active ? 500 : 400, cursor: "pointer", whiteSpace: "nowrap", ...extra,
  };
}

// Content column (mockup .wrap)
export function wrap(extra = {}) {
  return { maxWidth: 880, margin: "0 auto", padding: "0 24px", boxSizing: "border-box", ...extra };
}

// Search field (mockup .editor-style input: surface, line, focus ring via .vra-input)
export function searchInput(extra = {}) {
  return {
    display: "block", width: "100%", height: 42, padding: "0 14px", background: T.surface,
    border: `1px solid ${T.line}`, borderRadius: T.rLg, color: T.ink, fontFamily: T.sans,
    fontSize: 14.5, outline: "none", boxSizing: "border-box", ...extra,
  };
}

export default function PageBar({ onBack, title, sub, right, backLabel = "Hub", topAccent }) {
  return (
    <>
      <style>{RESPONSIVE_CSS}</style>
      <header className="vra-bar" style={{ ...appBar, ...(topAccent ? { borderBottom: "none" } : {}) }}>
        {onBack && (
          <button onClick={onBack} style={backBtnStyle()}>
            <BackIcon />{backLabel}
          </button>
        )}
        <img className="vra-bar-hide" src={logo} alt="Vitreo-Retinal Associates" style={{ height: 36, width: "auto", display: "block", flexShrink: 0, mixBlendMode: "multiply" }} />
        <span className="vra-bar-hide" style={{ width: 1, height: 22, background: T.line, flexShrink: 0 }} />
        <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, fontFamily: T.sans, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{title}</div>
        {sub && <div className="vra-bar-hide" style={{ fontSize: 13, color: T.muted, fontFamily: T.sans, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{sub}</div>}
        <div style={{ flex: 1 }} />
        {right}
      </header>
      {topAccent && <div style={{ height: 2, background: topAccent }} />}
    </>
  );
}

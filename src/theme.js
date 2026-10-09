// VRA Practice Hub — light "clean clinical" theme.
// Tokens mirror REDESIGN-MOCKUP.html :root. Flat colors, 1px borders, no gradients,
// no shadows except the focus ring.

export const T = {
  paper: "#F6F8FA",       // page background
  surface: "#FFFFFF",     // cards, panels, inputs
  ink: "#253C52",         // primary text
  ink2: "#3E5468",        // secondary text
  muted: "#657886",       // tertiary text, hints
  line: "#CCD9E2",        // borders
  lineStrong: "#A9BFD1",  // emphasized borders
  accent: "#315F85",      // steel blue: headings, primary buttons, active tab, links
  accentInk: "#253C52",
  accentSoft: "#EDF3F7",  // tinted background
  accentLine: "#A9BFD1",
  gold: "#C9A227",        // highlights only
  goldInk: "#8A6D0B",
  goldSoft: "#F4E3A7",
  amber: "#8A6D0B",       // warnings
  amberSoft: "#FBF3DC",
  red: "#B04A3B",         // errors, recording
  redSoft: "#F8E7E4",
  green: "#2E6B47",       // success
  greenSoft: "#E6F3EA",
  onAccent: "#FFFFFF",    // text on a solid accent / red / green / amber fill
  sans: '"IBM Plex Sans", system-ui, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, Menlo, monospace',
  r: 6,                   // control radius
  rLg: 10,                // card radius
  focusRing: "0 0 0 3px #EDF3F7",
};

// Doctor colors — from the VRA Google calendar / Brittany's master schedule.
// Key order = display row order everywhere (Brittany's order).
export const DOCTOR_COLORS = {
  FJM: { fg: "#C62828", soft: "#FBE9E7" },
  BJB: { fg: "#2E7D32", soft: "#E8F5E9" },
  BKH: { fg: "#3949AB", soft: "#E8EAF6" },
  MR: { fg: "#7B1FA2", soft: "#F3E5F5" },
  WSF: { fg: "#0288D1", soft: "#E1F5FE" },
};
export const DOCTOR_ORDER = Object.keys(DOCTOR_COLORS);
// Unknown initials fall back to the accent pair.
export const doctorColor = (d) => DOCTOR_COLORS[d] || { fg: T.accent, soft: T.accentSoft };

// Tech-site tints — Nana's sheet: yellow = Leominster.
export const SITE_TINTS = {
  WORC: { bg: T.accentSoft, line: T.line, head: T.paper, text: T.muted },
  LEOM: { bg: "#FFF8DC", line: "#EADFA3", head: "#FBF2C8", text: T.amber },
};
// On-call translator (green).
export const TRANSLATOR = { bg: "#E8F5E9", fg: "#2E7D32" };

// Backward-compatible alias object: the old dark-theme key names, mapped to light values.
export const S = {
  bg: T.paper,
  card: T.surface,
  border: T.line,
  muted: T.muted,
  text: T.ink,
  bright: T.ink,
  accent: T.accent,
  accentLight: T.accent, // text on light bg must be the full accent, not a pale tint
  green: T.green,
  greenDark: T.green,
  amber: T.amber,
  yellow: T.amber,
  red: T.red,
  orange: T.amber,
  blue: T.accent,        // RateComparison
  gray: T.muted,         // RateComparison
  font: T.sans,
  mono: T.mono,
};

// ── Small style helpers ─────────────────────────────────────────────
export function card(extra = {}) {
  return { background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.rLg, ...extra };
}

export function btn(variant = "secondary", extra = {}) {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
    height: 34, padding: "0 14px", borderRadius: T.r, fontFamily: T.sans,
    fontSize: "0.84rem", fontWeight: 500, cursor: "pointer",
  };
  const v = {
    primary: { background: T.accent, border: `1px solid ${T.accent}`, color: T.onAccent },
    secondary: { background: T.surface, border: `1px solid ${T.line}`, color: T.ink },
    ghost: { background: "transparent", border: "1px solid transparent", color: T.ink2 },
    danger: { background: T.red, border: `1px solid ${T.red}`, color: T.onAccent },
  }[variant] || {};
  return { ...base, ...v, ...extra };
}

export function input(extra = {}) {
  return {
    background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.r,
    color: T.ink, fontFamily: T.sans, fontSize: "0.86rem", padding: "7px 10px",
    outline: "none", ...extra,
  };
}

export function label(extra = {}) {
  return { display: "block", fontSize: "0.78rem", color: T.muted, fontFamily: T.sans, marginBottom: 6, ...extra };
}

export function tabStyle(active, extra = {}) {
  return {
    padding: "11px 10px 9px", fontSize: "0.82rem", fontFamily: T.sans, cursor: "pointer",
    background: "transparent", border: "none", borderBottom: `2px solid ${active ? T.accent : "transparent"}`,
    color: active ? T.accentInk : T.muted, fontWeight: active ? 500 : 400, whiteSpace: "nowrap",
    ...extra,
  };
}

const TONES = {
  accent: [T.accentSoft, T.accent, T.accentLine],
  green: [T.greenSoft, T.green, T.green],
  amber: [T.amberSoft, T.amber, T.gold],
  red: [T.redSoft, T.red, T.red],
  gold: [T.goldSoft, T.goldInk, T.gold],
  muted: [T.paper, T.muted, T.line],
};

export function chip(tone = "muted", extra = {}) {
  const [bg, fg, bd] = TONES[tone] || TONES.muted;
  return {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "1px 8px",
    borderRadius: 999, fontSize: "0.72rem", fontWeight: 500, fontFamily: T.sans,
    background: bg, color: fg, border: `1px solid ${bd}`, ...extra,
  };
}

// ── Phase 2 helpers (layout of REDESIGN-MOCKUP.html) ────────────────
// 40×40 tinted icon box (mockup .tile .ico)
export function iconBox(tone = "accent", extra = {}) {
  const [bg, fg] = TONES[tone] || TONES.accent;
  return {
    width: 40, height: 40, borderRadius: 8, display: "grid", placeItems: "center",
    background: bg, color: fg, flexShrink: 0, ...extra,
  };
}

// Tool tile (mockup .tile): surface, 1px line, 3px top border, left-aligned column.
export function tile(extra = {}) {
  return {
    background: T.surface, border: `1px solid ${T.line}`, borderTop: `3px solid ${T.accent}`,
    borderRadius: T.rLg, padding: "14px 16px", textAlign: "left", display: "flex",
    flexDirection: "column", alignItems: "flex-start", gap: 8, minHeight: 132,
    cursor: "pointer", fontFamily: T.sans, color: T.ink, transition: "border-color .15s",
    ...extra,
  };
}

// Section heading (mockup h2.sec)
export function secHead(extra = {}) {
  return { fontSize: 15, fontWeight: 600, color: T.accent, fontFamily: T.sans, margin: "30px 0 12px", ...extra };
}

// Field card (mockup .field) + its label
export function field(extra = {}) {
  return { background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.rLg, padding: "12px 14px", minWidth: 0, ...extra };
}
export function fieldLabel(extra = {}) {
  return { display: "block", fontSize: 12.5, color: T.muted, fontFamily: T.sans, marginBottom: 6, ...extra };
}

// Small button (mockup .btn.sm)
export function btnSm(variant = "secondary", extra = {}) {
  return btn(variant, { height: 28, padding: "0 10px", fontSize: 12.5, ...extra });
}

// Circular initials avatar (mockup .avatar)
export function avatar(size = 26, extra = {}) {
  return {
    width: size, height: size, borderRadius: "50%", background: T.accentSoft, color: T.accentInk,
    border: `1px solid ${T.accentLine}`, display: "grid", placeItems: "center",
    fontSize: size >= 30 ? 12 : 11, fontWeight: 600, fontFamily: T.sans, flexShrink: 0, ...extra,
  };
}

// 58px app bar (mockup .bar)
export const appBar = {
  background: T.surface, borderBottom: `1px solid ${T.line}`, height: 64, display: "flex",
  alignItems: "center", gap: 14, fontFamily: T.sans, boxSizing: "border-box",
  // Align the bar's contents with the centered 880px content column (24px inner padding)
  padding: "0 max(24px, calc(50% - 416px))",
};

// Phone-width overrides for the class hooks used alongside inline styles
// (inline styles cannot carry media queries). Mirrors the mockup's @media rules.
export const RESPONSIVE_CSS = `
.vra-wrap{box-sizing:border-box}
.vra-tile:focus-visible,.vra-pill:focus-visible,.vra-daybtn:focus-visible{outline:2px solid ${T.accent};outline-offset:2px}
.vra-editor:focus-within{border-color:${T.accentLine}!important;box-shadow:${T.focusRing}}
.vra-editor textarea:focus{outline:none}
.vra-input:focus{border-color:${T.accentLine}!important;box-shadow:${T.focusRing}}
.vra-rowbtn:hover{background:${T.paper}}
.vra-row3{box-sizing:border-box}
.vra-table{overflow-x:auto}
.vra-chiprow::-webkit-scrollbar{display:none}
@media (max-width:720px){
  .vra-row3{grid-template-columns:1fr!important}
  .vra-side{grid-template-columns:1fr!important}
  .vra-oplist{position:static!important}
  .vra-seg-scroll{overflow-x:auto;max-width:100%}
  .vra-stack{flex-direction:column!important;align-items:stretch!important}
  .vra-stack>*{margin-left:0!important}
  .vra-wrap{padding-left:16px!important;padding-right:16px!important}
  .vra-bar{padding:0 16px!important;gap:10px!important}
  .vra-bar-hide{display:none!important}
  .vra-tiles{grid-template-columns:1fr 1fr!important}
  .vra-tiles>.vra-tile{grid-column:span 1!important}
  .vra-tiles>.vra-tile-wide{grid-column:span 2!important}
  .vra-callband{grid-template-columns:1fr!important}
  .vra-callband>div{border-right:0!important;border-bottom:1px solid ${T.line}}
  .vra-callband>div:last-child{border-bottom:0}
  .vra-sites{grid-template-columns:1fr!important}
  .vra-sites>div{border-right:0!important;border-bottom:1px solid ${T.line}}
  .vra-sites>div:last-child{border-bottom:0}
  .vra-legend{display:none!important}
  .vra-row2{grid-template-columns:1fr!important}
  .vra-calc-div{display:none!important}
  .vra-calc{flex-direction:column!important}
  .vra-seg{display:flex!important;width:100%}
  .vra-seg>button{flex:1;padding:6px 8px!important}
}
@media (max-width:480px){
  .vra-tiles{grid-template-columns:1fr!important}
  .vra-tiles>.vra-tile,.vra-tiles>.vra-tile-wide{grid-column:span 1!important}
  .vra-tile-wide{flex-wrap:wrap}
}
@media (prefers-reduced-motion: reduce){.vra-tile,.vra-pill{transition:none!important}}
`;

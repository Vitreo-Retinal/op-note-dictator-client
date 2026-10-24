import { T, tile, iconBox } from "./theme.js";
import { MonitorIcon } from "./icons.jsx";

// ── Epic (remote) — Mari, Oct 23 2026 ───────────────────────────────
// Lexington Eye's Epic from home, through the Partners Citrix portal
// (link from Greg Lyons, LEA IT). Needs Citrix Workspace installed on the
// computer. Doctor side only, on the desktop home of both hubs (VRA hub and
// LEA Hub). Opens in a new tab; nothing passes through the hub.
export const EPIC_REMOTE_URL = "https://workspace.partners.org";

export default function EpicRemoteTile({ style }) {
  const hoverOn = (e) => { e.currentTarget.style.borderColor = T.accentLine; };
  const hoverOff = (e) => { e.currentTarget.style.borderColor = T.line; };
  return (
    <button type="button" className="vra-tile-wide"
      onClick={() => window.open(EPIC_REMOTE_URL, "_blank", "noopener,noreferrer")}
      onMouseEnter={hoverOn} onMouseLeave={hoverOff}
      style={tile({ width: "100%", boxSizing: "border-box", flexDirection: "row", alignItems: "center", minHeight: 0, gap: 14, ...style })}>
      <span style={iconBox()}><MonitorIcon /></span>
      <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: T.ink, letterSpacing: "-0.01em" }}>Epic (remote)</span>
        <span style={{ fontSize: 13, color: T.muted, lineHeight: 1.45 }}>Lexington Eye's Epic from home, through the Partners Citrix portal. Needs Citrix Workspace on this computer.</span>
      </span>
      <span className="vra-bar-hide" style={{ marginLeft: "auto", fontSize: 12, color: T.muted, whiteSpace: "nowrap" }}>Opens in a new tab</span>
    </button>
  );
}

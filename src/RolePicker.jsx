import { T } from "./theme.js";
import logo from "./vra-logo.png";

// ── Role picker (Oct 2026, approved mockup "role-pick") ─────────────
// Shown right after the site password when this device has no role stored
// (localStorage "vra-hub-role"). Phone: stacked rows. Desktop: four cards in
// a row (2×2 below ~1060px wide).
// The "Switch view" link on Home clears the role and brings this back.

const OPTIONS = [
  { id: "doctor", icon: "Dr", label: "Doctor", phone: "Your day, notes, coding · PIN", desk: "Your day, notes, coding · PIN" },
  { id: "tech", icon: "Tx", label: "Tech", phone: "Schedule, coverage lookup", desk: "Schedule, coverage, handouts, documents" },
  { id: "manager", icon: "M", label: "Manager", phone: "Manager hub, schedule · PIN", desk: "Manager hub, rates, schedule · PIN" },
  { id: "frontdesk", icon: "FD", label: "Front desk", phone: "Schedule, who's where, coverage", desk: "Schedule, who's where, coverage" },
];
const DESK_CSS = ".vra-roles{grid-template-columns:repeat(4,240px)}@media (max-width:1060px){.vra-roles{grid-template-columns:repeat(2,240px)}}";

export default function RolePicker({ phone, onPick }) {
  const icBox = (size) => ({
    width: size, height: size, borderRadius: 10, background: T.accentSoft, color: T.accent, fontWeight: 600,
    fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flex: "none",
  });
  const optBase = {
    background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12, cursor: "pointer",
    fontFamily: T.sans, color: T.ink, boxSizing: "border-box", transition: "border-color .15s",
  };
  const hoverOn = (e) => { e.currentTarget.style.borderColor = T.accentLine; };
  const hoverOff = (e) => { e.currentTarget.style.borderColor = T.line; };

  return (
    <div style={{ minHeight: "100dvh", background: T.paper, fontFamily: T.sans, color: T.ink, display: "flex", flexDirection: "column" }}>
      <header style={{
        background: T.surface, borderBottom: `1px solid ${T.line}`, display: "flex", alignItems: "center",
        boxSizing: "content-box", height: phone ? 50 : 64, paddingTop: "env(safe-area-inset-top, 0px)",
        paddingLeft: phone ? "max(16px, env(safe-area-inset-left, 0px))" : "max(24px, calc(50% - 416px))",
        paddingRight: phone ? 16 : 24,
      }}>
        <img src={logo} alt="Vitreo-Retinal Associates" style={{ height: phone ? 34 : 44, width: "auto", display: "block" }} />
      </header>

      <main style={{ flex: 1, padding: phone ? "0 16px" : "0 24px" }}>
        <div style={{ textAlign: "center", marginTop: phone ? 64 : 72 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", margin: 0, color: T.ink }}>Welcome to the VRA hub</h1>
          <p style={{ color: T.muted, fontSize: 13.5, margin: "4px 0 0" }}>Pick your view</p>
        </div>

        {!phone && <style>{DESK_CSS}</style>}
        <div className={phone ? undefined : "vra-roles"} style={phone
          ? { marginTop: 28, display: "flex", flexDirection: "column", gap: 12 }
          : { marginTop: 32, display: "grid", justifyContent: "center", gap: 16 }}>
          {OPTIONS.map((o) => (
            <button key={o.id} type="button" onClick={() => onPick(o.id)} onMouseEnter={hoverOn} onMouseLeave={hoverOff}
              style={phone
                ? { ...optBase, display: "flex", alignItems: "center", gap: 14, width: "100%", minHeight: 72, padding: "14px 16px", textAlign: "left" }
                : { ...optBase, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: 240, padding: "22px 18px", textAlign: "center" }}>
              <span style={icBox(phone ? 40 : 48)}>{o.icon}</span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}>{o.label}</span>
                <span style={{ display: "block", fontSize: 12.5, color: T.muted, lineHeight: 1.4, marginTop: phone ? 1 : 4 }}>{phone ? o.phone : o.desk}</span>
              </span>
            </button>
          ))}
        </div>
      </main>

      <footer style={{ textAlign: "center", fontSize: 12, color: T.muted, padding: "24px 16px calc(18px + env(safe-area-inset-bottom, 0px))" }}>
        Vitreo-Retinal Associates · internal use
      </footer>
    </div>
  );
}

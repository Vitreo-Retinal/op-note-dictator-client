// ── Role badges for the "Pick your view" pages (Oct 2026, per Mari:
// "a better logo for each — professional, yet more catchy"). Replaces the
// "Dr / Tx / M / FD / Rs" letter boxes on the VRA and LEA welcome pages.
// Each role has its own color and a two-tone line icon (soft fill + stroke)
// on a softly tinted rounded square.

const svg = (size, children) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
    {children}
  </svg>
);
const soft = { fill: "currentColor", fillOpacity: 0.18 };

// Doctor — stethoscope.
const DoctorGlyph = ({ size }) => svg(size, <>
  <path d="M5 3H4.5A1.5 1.5 0 003 4.5V8a5 5 0 0010 0V4.5A1.5 1.5 0 0011.5 3H11" />
  <path d="M8 13v2.5a5 5 0 0010 0V13" />
  <circle cx="18" cy="10.5" r="2.5" {...soft} />
</>);

// Tech — an eye inside scan corners (imaging / work-up).
const TechGlyph = ({ size }) => svg(size, <>
  <path d="M3 7.5V4.5A1.5 1.5 0 014.5 3h3M16.5 3h3A1.5 1.5 0 0121 4.5v3M21 16.5v3a1.5 1.5 0 01-1.5 1.5h-3M7.5 21h-3A1.5 1.5 0 013 19.5v-3" />
  <path d="M6 12s2.4-4 6-4 6 4 6 4-2.4 4-6 4-6-4-6-4z" {...soft} />
  <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
</>);

// Manager — rising bars with a trend line.
const ManagerGlyph = ({ size }) => svg(size, <>
  <rect x="3.5" y="14" width="3.5" height="6.5" rx="1" {...soft} />
  <rect x="10.25" y="10.5" width="3.5" height="10" rx="1" {...soft} />
  <rect x="17" y="7" width="3.5" height="13.5" rx="1" {...soft} />
  <path d="M3.5 10l5-4.5 3.5 2.5 6.5-5" />
  <path d="M15.5 3h3v3" />
</>);

// Front desk — headset.
const FrontDeskGlyph = ({ size }) => svg(size, <>
  <path d="M4 13v-1a8 8 0 0116 0v1" />
  <rect x="3" y="13" width="4" height="6" rx="1.6" {...soft} />
  <rect x="17" y="13" width="4" height="6" rx="1.6" {...soft} />
  <path d="M19 19v.5a2.5 2.5 0 01-2.5 2.5H13" />
</>);

// Research — flask with bubbles.
const ResearchGlyph = ({ size }) => svg(size, <>
  <path d="M9 3h6M10 3v6.2L4.6 18.4A1.8 1.8 0 006.2 21h11.6a1.8 1.8 0 001.6-2.6L14 9.2V3" />
  <path d="M6.9 15.5h10.2l2.3 2.9a1.8 1.8 0 01-1.6 2.6H6.2a1.8 1.8 0 01-1.6-2.6z" fill="currentColor" fillOpacity="0.22" stroke="none" />
  <circle cx="11" cy="12.5" r="0.9" fill="currentColor" stroke="none" />
  <circle cx="13.6" cy="10.8" r="0.6" fill="currentColor" stroke="none" />
</>);

export const ROLE_STYLE = {
  doctor:    { Glyph: DoctorGlyph,    fg: "#315F85", bg: "#E6EFF6" }, // VRA steel blue
  tech:      { Glyph: TechGlyph,      fg: "#1C7373", bg: "#E1F2F1" }, // teal
  manager:   { Glyph: ManagerGlyph,   fg: "#9A6F07", bg: "#FBF1D6" }, // gold
  frontdesk: { Glyph: FrontDeskGlyph, fg: "#6A4A93", bg: "#EFE9F7" }, // plum
  research:  { Glyph: ResearchGlyph,  fg: "#2E6B47", bg: "#E4F2E8" }, // green
};

/** Rounded-square badge for a role. size = badge size in px. */
export function RoleBadge({ role, size = 52 }) {
  const s = ROLE_STYLE[role] || ROLE_STYLE.doctor;
  const { Glyph } = s;
  return (
    <span aria-hidden="true" style={{
      width: size, height: size, borderRadius: Math.round(size * 0.28), flex: "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: `linear-gradient(145deg, ${s.bg} 0%, #FFFFFF 140%)`,
      boxShadow: `inset 0 0 0 1px ${s.fg}26`, color: s.fg,
    }}>
      <Glyph size={Math.round(size * 0.56)} />
    </span>
  );
}

/** Role color (for a hover border). */
export const roleColor = (role) => (ROLE_STYLE[role] || ROLE_STYLE.doctor).fg;

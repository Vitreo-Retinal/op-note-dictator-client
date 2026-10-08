// Line icons copied from REDESIGN-MOCKUP.html. Stroke = currentColor.
const base = (size, sw) => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true,
  style: { display: "block", flexShrink: 0 },
});

export function InjectIcon({ size = 22 }) {
  return (<svg {...base(size, 1.9)}><path d="M18 2l4 4" /><path d="M17 7l3-3" /><path d="M19 9L8.7 19.3a2.4 2.4 0 01-3.4 0l-.6-.6a2.4 2.4 0 010-3.4L15 5" /><path d="M9 11l4 4" /><path d="M5 19l-3 3" /><path d="M14 4l6 6" /></svg>);
}
export function CodingIcon({ size = 22 }) {
  return (<svg {...base(size, 1.75)}><path d="M8 7h12M8 12h12M8 17h8" /><path d="M4 7h.01M4 12h.01M4 17h.01" strokeWidth="2.5" /></svg>);
}
export function EducationIcon({ size = 22 }) {
  return (<svg {...base(size, 1.75)}><path d="M3 5.5c3-1.5 6-1.5 9 0 3-1.5 6-1.5 9 0v13c-3-1.5-6-1.5-9 0-3-1.5-6-1.5-9 0z" /><path d="M12 5.5v13" /></svg>);
}
export function IntakeIcon({ size = 22 }) {
  return (<svg {...base(size, 1.75)}><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1" /><path d="M8.5 10h7M8.5 14h7M8.5 17.5h4" /></svg>);
}
export function DocumentsIcon({ size = 22 }) {
  return (<svg {...base(size, 1.75)}><path d="M3 7.5h6l2 2h10v9a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 18.5z" /><path d="M7 7.5V5.5a1.5 1.5 0 011.5-1.5H15" /></svg>);
}
export function ManagerIcon({ size = 22 }) {
  return (<svg {...base(size, 1.75)}><path d="M4 19h16" /><path d="M7 15v-5M12 15V6M17 15v-8" /></svg>);
}
export function BriefcaseIcon({ size = 22 }) {
  return (<svg {...base(size, 1.75)}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7" /><path d="M3 12.5h18" /></svg>);
}
export function LockIcon({ size = 13 }) {
  return (<svg {...base(size, 2)}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>);
}
export function BackIcon({ size = 14 }) {
  return (<svg {...base(size, 2)}><path d="M15 6l-6 6 6 6" /></svg>);
}
export function MicIcon({ size = 15 }) {
  return (<svg {...base(size, 2)}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3" /></svg>);
}
export function EditLinesIcon({ size = 15 }) {
  return (<svg {...base(size, 2)}><path d="M4 7h16M4 12h16M4 17h10" /></svg>);
}
export function CopyIcon({ size = 15 }) {
  return (<svg {...base(size, 2)}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a1 1 0 011-1h10" /></svg>);
}
export function AlertIcon({ size = 16 }) {
  return (<svg {...base(size, 2)}><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18h.01" /></svg>);
}
// ── Phase 3 additions (same 24-grid line style) ──
export function EyeIcon({ size = 22 }) {
  return (<svg {...base(size, 1.75)}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>);
}
export function PacketIcon({ size = 22 }) {
  return (<svg {...base(size, 1.75)}><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></svg>);
}
export function FormIcon({ size = 22 }) {
  return (<svg {...base(size, 1.75)}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8" /><path d="M8 16.5l1.5 1.5L13 14.5" /></svg>);
}
export function ChevronRightIcon({ size = 16 }) {
  return (<svg {...base(size, 2)}><path d="M9 6l6 6-6 6" /></svg>);
}
export function ChevronDownIcon({ size = 16 }) {
  return (<svg {...base(size, 2)}><path d="M6 9l6 6 6-6" /></svg>);
}
export function SendIcon({ size = 15 }) {
  return (<svg {...base(size, 2)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
}
export function SearchIcon({ size = 16 }) {
  return (<svg {...base(size, 2)}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>);
}
export function PrintIcon({ size = 15 }) {
  return (<svg {...base(size, 2)}><path d="M7 9V3h10v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M7 14h10v7H7z" /></svg>);
}
// Calendar: page with two binder rings, header rule, and a 2×3 dot grid.
export function CalendarIcon({ size = 22 }) {
  return (<svg {...base(size, 1.75)}><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 9.5h17" /><path d="M8 3v4M16 3v4" /><path d="M8 13.5h.01M12 13.5h.01M16 13.5h.01M8 17h.01M12 17h.01" strokeWidth="2.5" /></svg>);
}
// Eye-drop bottle: cap, tapered nozzle, rounded body, one drop below the tip.
export function DropBottleIcon({ size = 22 }) {
  return (<svg {...base(size, 1.75)}><path d="M10.5 2h3v3h-3z" /><path d="M10.5 5L9 7.5h6L13.5 5" /><rect x="7" y="7.5" width="10" height="9" rx="2.5" /><path d="M12 18.5c-.9 1.1-1.3 1.8-1.3 2.3a1.3 1.3 0 002.6 0c0-.5-.4-1.2-1.3-2.3z" /></svg>);
}
// ── Phone tab bar (Oct 2026) ──
export function HomeIcon({ size = 22 }) {
  return (<svg {...base(size, 1.75)}><path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" /></svg>);
}
// Receipt / itemized list — phone tab bar "Coding" (Oct 2026 mockup)
export function ReceiptIcon({ size = 22 }) {
  return (<svg {...base(size, 1.75)}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>);
}
export function NotesIcon({ size = 22 }) {
  return (<svg {...base(size, 1.75)}><path d="M14 3H6a1 1 0 00-1 1v16a1 1 0 001 1h12a1 1 0 001-1V8z" /><path d="M14 3v5h5M8 13h8M8 17h6" /></svg>);
}
// ── Front desk (Oct 2026) ──
// Speech bubble — phone tab bar "Ask"
export function ChatIcon({ size = 22 }) {
  return (<svg {...base(size, 1.75)}><path d="M4 5.5A1.5 1.5 0 015.5 4h13A1.5 1.5 0 0120 5.5v9a1.5 1.5 0 01-1.5 1.5H10l-4.5 4v-4h0A1.5 1.5 0 014 14.5z" /><path d="M8.5 9h7M8.5 12h4.5" /></svg>);
}
// Handset — phone extensions
export function PhoneIcon({ size = 22 }) {
  return (<svg {...base(size, 1.75)}><path d="M6.6 3.5h2.6l1.4 4-2 1.3a11 11 0 006.6 6.6l1.3-2 4 1.4v2.6a2 2 0 01-2.2 2A16.5 16.5 0 014.6 5.7a2 2 0 012-2.2z" /></svg>);
}
// ── LEA Hub (Oct 2026) ──
// Barcode in a scan frame — phone tab bar "Scan" (carton inventory)
export function ScanIcon({ size = 22 }) {
  return (<svg {...base(size, 1.75)}><path d="M4 8V5.5A1.5 1.5 0 015.5 4H8M16 4h2.5A1.5 1.5 0 0120 5.5V8M20 16v2.5a1.5 1.5 0 01-1.5 1.5H16M8 20H5.5A1.5 1.5 0 014 18.5V16" /><path d="M8 8.5v7M11 8.5v7M13.5 8.5v7M16 8.5v7" /></svg>);
}

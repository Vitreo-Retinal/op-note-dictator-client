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

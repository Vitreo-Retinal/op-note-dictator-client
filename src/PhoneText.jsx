import { Fragment } from "react";
import { T } from "./theme.js";
import { phoneSegments } from "./lib/phoneText.js";

// ── Tap-to-call phone numbers in plain text (Oct 2026) ──────────────
// index.html turns off iPhone's automatic number links (so fax numbers are
// never tappable); this puts real tel: links back on VOICE numbers only.
// Rules: src/lib/phoneText.js. Fax numbers render as plain selectable text.

// The app's accent link style (same as the Extensions call links).
export const telLinkStyle = { color: T.accent, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" };

/** Segments from phoneText.phoneSegments → React nodes. */
export function renderPhoneSegments(segs, keyPrefix = "p") {
  return segs.map((sg, i) => {
    const key = `${keyPrefix}${i}`;
    if (sg.type === "tel") return <a key={key} href={sg.href} style={telLinkStyle}>{sg.text}</a>;
    if (sg.type === "fax") return <span key={key} style={{ whiteSpace: "nowrap", userSelect: "text", WebkitUserSelect: "text" }}>{sg.text}</span>;
    return <Fragment key={key}>{sg.text}</Fragment>;
  });
}

/**
 * Plain text → React nodes with voice numbers as tel: links.
 * Options: fax (every number here is a fax), phones + offset (matches found
 * on a larger string — see phoneSegments).
 */
export function linkifyPhones(text, opts = {}, keyPrefix = "p") {
  if (text == null || text === "") return text;
  return renderPhoneSegments(phoneSegments(String(text), opts), keyPrefix);
}

/** <PhoneText text="Call 508-752-1155 · Fax 508-752-4862" /> */
export default function PhoneText({ text, fax = false }) {
  if (text == null || text === "") return null;
  return <>{linkifyPhones(text, { fax })}</>;
}

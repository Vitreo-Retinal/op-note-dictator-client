// ── Phone shell (Oct 2026) — iPhone home-screen web app, Phase 1 ─────
// At max-width 600px the hub runs inside this shell: a slim app bar with the
// wordmark alone, the page, and a fixed bottom tab bar (Home, Schedule,
// Inject, Coding, Notes). Above 600px nothing here renders and the desktop
// layout is unchanged. Pages read PhoneCtx to swap their own top app bar for
// an in-page heading.
import { createContext, useContext, useEffect, useState } from "react";
import { T } from "./theme.js";
import { HomeIcon, CalendarIcon, InjectIcon, ReceiptIcon, NotesIcon } from "./icons.jsx";
import logo from "./vra-logo.png";

export const PHONE_MQ = "(max-width: 600px)";

const mq = () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(PHONE_MQ) : null);
export const isPhoneNow = () => { const m = mq(); return !!(m && m.matches); };

/** True while the viewport is phone width; follows rotation / resize. */
export function useIsPhone() {
  const [phone, setPhone] = useState(isPhoneNow);
  useEffect(() => {
    const m = mq();
    if (!m) return undefined;
    const on = () => setPhone(m.matches);
    on();
    if (m.addEventListener) m.addEventListener("change", on); else m.addListener(on);
    return () => { if (m.removeEventListener) m.removeEventListener("change", on); else m.removeListener(on); };
  }, []);
  return phone;
}

// { phone: bool, tabRoot: bool } — tabRoot pages hide their back button
// (the tab bar is the way back).
export const PhoneCtx = createContext({ phone: false, tabRoot: false });
export const usePhone = () => useContext(PhoneCtx);

export const TABS = [
  { id: "home", label: "Home", Icon: HomeIcon },
  { id: "schedule", label: "Schedule", Icon: CalendarIcon },
  { id: "inject", label: "Inject", Icon: InjectIcon },
  { id: "coding", label: "Coding", Icon: ReceiptIcon },
  { id: "notes", label: "Notes", Icon: NotesIcon },
];

// Bar heights (without the safe-area insets).
export const APPBAR_H = 50;
export const TABBAR_H = 56;

// Height left for a page between the two bars, safe areas included.
export const PHONE_BODY_H = `calc(100dvh - ${APPBAR_H + TABBAR_H}px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))`;

const PHONE_CSS = `
.vra-phone-tab{-webkit-tap-highlight-color:transparent}
.vra-phone-tab:focus-visible{outline:2px solid ${T.accent};outline-offset:-4px;border-radius:8px}
.vra-phone-main>div{min-height:${PHONE_BODY_H}!important}
`;

// "Wed, Oct 7"
const shortToday = () => new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

// Small line under the date in the app bar (mockup). Inject has no in-page
// heading, so its bar carries the page name instead of the date.
const BAR_SUB = { schedule: "Schedule", coding: "Coding", notes: "Notes" };

export function PhoneShell({ active, onTab, children }) {
  const inject = active === "inject";
  const sub = inject ? "Coverage lookup" : BAR_SUB[active];
  return (
    <div style={{ minHeight: "100dvh", background: T.paper, fontFamily: T.sans, color: T.ink }}>
      <style>{PHONE_CSS}</style>
      <header style={{
        position: "sticky", top: 0, zIndex: 40, background: T.surface, borderBottom: `1px solid ${T.line}`,
        boxSizing: "content-box", height: APPBAR_H, display: "flex", alignItems: "center", gap: 10,
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingLeft: "max(16px, env(safe-area-inset-left, 0px))", paddingRight: "max(16px, env(safe-area-inset-right, 0px))",
      }}>
        <img src={logo} alt="Vitreo-Retinal Associates" style={{ height: 34, width: "auto", display: "block", flexShrink: 0 }} />
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: "right", lineHeight: 1.25, whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{inject ? "Can we inject?" : shortToday()}</div>
          {sub && <div style={{ fontSize: 11.5, color: T.muted }}>{sub}</div>}
        </div>
      </header>

      <main className="vra-phone-main" style={{ paddingBottom: `calc(${TABBAR_H}px + env(safe-area-inset-bottom, 0px))` }}>
        {children}
      </main>

      <nav aria-label="Main" style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50, background: T.surface,
        borderTop: `1px solid ${T.line}`, display: "grid", gridTemplateColumns: `repeat(${TABS.length}, 1fr)`,
        boxSizing: "content-box", height: TABBAR_H,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)", paddingRight: "env(safe-area-inset-right, 0px)",
      }}>
        {TABS.map(({ id, label, Icon }) => {
          const on = id === active;
          return (
            <button key={id} className="vra-phone-tab" onClick={() => onTab(id)} aria-current={on ? "page" : undefined}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
                minHeight: 48, minWidth: 44, padding: 0, background: "none", border: "none", cursor: "pointer",
                color: on ? T.accent : T.muted, fontFamily: T.sans, fontSize: 11, fontWeight: on ? 600 : 400,
              }}>
              <Icon size={22} />
              {label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/** In-page heading that replaces the desktop app bar on phones. */
export function PhoneHeading({ title, sub, back, right, style }) {
  return (
    <div className="vra-phone-head" style={{ padding: "14px 16px 6px", fontFamily: T.sans, ...style }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {back}
        <h1 style={{ fontSize: 20, fontWeight: 600, color: T.ink, letterSpacing: "-0.01em", lineHeight: 1.25, minWidth: 0, flex: "1 1 auto" }}>{title}</h1>
        {right}
      </div>
      {sub && <div style={{ fontSize: 12.5, color: T.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

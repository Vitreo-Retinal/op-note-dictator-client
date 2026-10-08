// ── Retina-Rx links + LEA Hub sign-in (Oct 2026) ─────────────────────
// retina-rx.vercel.app hosts the Retina-Rx front door (sign-in → "Choose a
// hub"), the coverage check at /check, the carton inventory at /inventory,
// and LEA Hub at /lea/ (this same client, proxied — see vercel.json).

export const RX_ORIGIN = "https://retina-rx.vercel.app";
// Coverage check ("Can we inject?") — moved from "/" to "/check" (Oct 2026).
export const COVERAGE_URL = `${RX_ORIGIN}/check`;

// LEA mode: the page path starts with /lea (retina-rx.vercel.app/lea/…).
export const isLeaPath = (p = typeof location !== "undefined" ? location.pathname : "/") => /^\/lea(\/|$)/.test(p);

// The Retina-Rx front door stores { token, exp } here after /api/rx-login.
// Same origin as LEA Hub, so LEA reads it from localStorage.
export const RX_TOKEN_KEY = "rx-token";

/** { token, exp } while the Retina-Rx sign-in is still valid, else null. */
export function readRxToken() {
  try {
    const v = JSON.parse(localStorage.getItem(RX_TOKEN_KEY) || "null");
    if (v && typeof v.token === "string" && Number(v.exp) > Date.now()) return v;
  } catch { /* bad value / storage blocked */ }
  return null;
}

/** Role inside a hub token ("lea", "lea-doctor", …) without checking the signature (display/routing only). */
export function tokenRole(token) {
  try {
    const p = String(token || "").split(".")[0].replace(/-/g, "+").replace(/_/g, "/");
    const d = JSON.parse(atob(p + "===".slice((p.length + 3) % 4)));
    return d && Number(d.exp) > Date.now() ? d.role : null;
  } catch { return null; }
}

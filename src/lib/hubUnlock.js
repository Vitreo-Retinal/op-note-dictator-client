// ── Day-long doctor / manager unlock (Mari, Oct 24 2026) ────────────
// "Once I log in with my pin as a doctor, I don't want to have to log in again
// and again if I go back to the hub main screen." A doctor PIN now holds until
// the end of that local day on every device (phones already did), across trips
// back to the hub and page reloads, until the doctor presses Lock.
//
// The PIN also returns the server's doctor token (role "doctor" / "lea-doctor",
// with the surgeon's sid) — that token is what unlocks reimbursement and the
// per-doctor permissions. It is kept with the unlock and put back into
// sessionStorage "vra_token" whenever the hub needs it (after the site password
// on a reload, after a Manager's Hub visit). Tokens expire on the server after
// 24 h; an expired or next-day entry is dropped and the PIN is asked again.
//
// Stored value: { id, day: "YYYY-MM-DD", token }. Older values without a token
// (phones, before Oct 24) are treated as no unlock — one PIN, then normal.

export const localYmd = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** exp (ms) from a hub token's payload, or 0. No signature check (display/expiry only). */
export function tokenExp(token) {
  try {
    if (!token || typeof token !== "string" || !token.includes(".")) return 0;
    const b64 = token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64 + "===".slice((b64.length + 3) % 4);
    const json = typeof atob === "function" ? atob(pad) : Buffer.from(pad, "base64").toString("binary");
    const exp = Number(JSON.parse(json).exp);
    return Number.isFinite(exp) ? exp : 0;
  } catch {
    return 0;
  }
}

function safeGet(storage, key) { try { return storage ? storage.getItem(key) : null; } catch { return null; } }
function safeSet(storage, key, v) { try { if (!storage) return; if (v == null) storage.removeItem(key); else storage.setItem(key, v); } catch { /* private mode */ } }

/**
 * A day-long unlock kept in `storage` under `key`.
 * read(validIds?) → { id, token } | null   (drops stale entries)
 * save(id, token) · clear()
 */
export function makeUnlockStore(storage, key, { now = () => Date.now(), today = () => localYmd() } = {}) {
  return {
    read(validIds) {
      let v = null;
      try { v = JSON.parse(safeGet(storage, key) || "null"); } catch { v = null; }
      const ok = v && typeof v.id === "string" && v.day === today() && typeof v.token === "string"
        && tokenExp(v.token) > now() && (!validIds || validIds.includes(v.id));
      if (ok) return { id: v.id, token: v.token };
      if (v) safeSet(storage, key, null);
      return null;
    },
    save(id, token) {
      if (!id || !token) return;
      safeSet(storage, key, JSON.stringify({ id, day: today(), token }));
    },
    clear() { safeSet(storage, key, null); },
  };
}

// sessionStorage keys the hub uses for the bearer token.
export const HUB_TOKEN_KEY = "vra_token";          // read by the fetch wrapper (main.jsx)
export const SITE_TOKEN_KEY = "vra_site_token";    // the site-password / LEA sign-in token, restored on Lock

const ss = () => { try { return typeof sessionStorage !== "undefined" ? sessionStorage : null; } catch { return null; } };
export const readHubToken = () => safeGet(ss(), HUB_TOKEN_KEY);
export function setHubToken(token) { if (token && readHubToken() !== token) safeSet(ss(), HUB_TOKEN_KEY, token); }
export const readSiteToken = () => safeGet(ss(), SITE_TOKEN_KEY);
export function rememberSiteToken(token) { if (token) safeSet(ss(), SITE_TOKEN_KEY, token); }

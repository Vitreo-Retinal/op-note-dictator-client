// ── VRA shared calendar — client helpers (Oct 2026) ─────────────────
// One fetch + formatting layer for the hub Call Board and the Schedule page.
// Source: server GET /api/schedule (reads the VRA Google Calendar's secret ICS
// feed server-side; the feed URL never reaches the browser). The auth token is
// attached by the global fetch wrapper in main.jsx (URL contains railway.app).

const API_BASE = import.meta.env.VITE_API_BASE || "https://op-note-dictator-server-production.up.railway.app";

// Fixed site order for display. Unknown sites from the calendar sort after these.
export const SITE_ORDER = ["WORC", "LEOM", "LEX", "UMASS", "WSC", "VALEDA"];

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** GET /api/schedule. Never throws — failures come back as { error }. */
export async function fetchSchedule(days = 14) {
  try {
    const res = await fetch(`${API_BASE}/api/schedule?days=${days}`);
    if (!res.ok) return { configured: true, error: `HTTP ${res.status}`, days: [] };
    const data = await res.json();
    return data && typeof data === "object" ? data : { configured: true, error: "bad response", days: [] };
  } catch {
    return { configured: true, error: "network", days: [] };
  }
}

/** True when the response has usable days. */
export const scheduleOk = (s) => !!(s && s.configured && !s.error && Array.isArray(s.days));

/** Local calendar date → "YYYY-MM-DD". */
export function ymdOf(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "YYYY-MM-DD" → local-noon Date (DST-safe). */
export function dateOfYmd(ymd) {
  const [y, m, d] = String(ymd).split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

/** "2026-10-08" → "Thu, Oct 8" */
export function shortDate(ymd) {
  const d = dateOfYmd(ymd);
  return `${DOW[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}`;
}

/** "2026-10-05" → "Oct 5" */
export function monDay(ymd) {
  const d = dateOfYmd(ymd);
  return `${MON[d.getMonth()]} ${d.getDate()}`;
}

const siteRank = (s) => { const i = SITE_ORDER.indexOf(s); return i === -1 ? SITE_ORDER.length : i; };
export const bySiteOrder = (a, b) => siteRank(a) - siteRank(b) || (a < b ? -1 : a > b ? 1 : 0);

/**
 * sessions → [{ site, docs: [{ doctor, half: "AM"|"PM"|null }] }] in site order.
 * half is null when the doctor is at that site both AM and PM.
 */
export function sessionsBySite(sessions) {
  const map = new Map();
  for (const s of sessions || []) {
    if (!map.has(s.site)) map.set(s.site, new Map());
    const docs = map.get(s.site);
    if (!docs.has(s.doctor)) docs.set(s.doctor, new Set());
    docs.get(s.doctor).add(s.part);
  }
  return [...map.keys()].sort(bySiteOrder).map((site) => {
    const docs = [...map.get(site).entries()].map(([doctor, parts]) => ({
      doctor,
      half: parts.has("AM") && parts.has("PM") ? null : (parts.has("AM") ? "AM" : "PM"),
    }));
    // Full-day doctors first, then AM, then PM; alphabetical within each.
    const rank = (h) => (h === null ? 0 : h === "AM" ? 1 : 2);
    docs.sort((a, b) => rank(a.half) - rank(b.half) || (a.doctor < b.doctor ? -1 : 1));
    return { site, docs };
  });
}

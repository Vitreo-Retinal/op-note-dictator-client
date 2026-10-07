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

/**
 * GET /api/schedule. Never throws — failures come back as { error }.
 * `from` ("YYYY-MM-DD", optional) starts the range on that date instead of today.
 */
export async function fetchSchedule(days = 14, from = null) {
  try {
    const qs = `days=${encodeURIComponent(days)}${from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? `&from=${from}` : ""}`;
    const res = await fetch(`${API_BASE}/api/schedule?${qs}`);
    if (!res.ok) return { configured: true, error: `HTTP ${res.status}`, days: [] };
    const data = await res.json();
    if (!data || typeof data !== "object") return { configured: true, error: "bad response", days: [] };
    // Managers / Front desk lines (Oct 2026): pass day.managers and
    // day.frontDesk through; older servers → [].
    if (Array.isArray(data.days)) {
      for (const d of data.days) {
        if (d && !Array.isArray(d.managers)) d.managers = [];
        if (d && !Array.isArray(d.frontDesk)) d.frontDesk = [];
      }
    }
    return data;
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

/**
 * One doctor's day: { AM: [sites], PM: [sites] } (site order). Empty arrays
 * when the doctor has no session in that half.
 */
export function doctorHalves(sessions, doctor) {
  const res = { AM: [], PM: [] };
  for (const s of sessions || []) {
    if (s.doctor !== doctor || !res[s.part] || res[s.part].includes(s.site)) continue;
    res[s.part].push(s.site);
  }
  res.AM.sort(bySiteOrder);
  res.PM.sort(bySiteOrder);
  return res;
}

/** Tech sheet: Back names for a site/half — structured roles when present, else the older flat fields. */
export function techBack(techs, site, half) {
  if (!techs) return [];
  if (techs.roles && techs.roles[site] && techs.roles[site][half]) return techs.roles[site][half].back || [];
  const key = `${site === "WORC" ? "worcester" : "leominster"}Back${half}`;
  return techs[key] || [];
}

/** Translator → "Katherine / Yarelis" parts: { am, pm, same } or { raw } for older servers. */
export function translatorOf(techs) {
  const t = techs && techs.translator;
  if (!t) return null;
  if (typeof t === "string") return { raw: t };
  if (!t.AM && !t.PM) return null;
  return { am: t.AM || "—", pm: t.PM || "—", same: t.AM && t.AM === t.PM };
}

/**
 * Valeda for one day: doctors with a VALEDA session (from the calendar) and
 * techs whose sheet assignment mentions Valeda (the server files that word
 * under roles.*.other / person.unknown). null when neither is present.
 */
export function valedaOf(day) {
  if (!day) return null;
  const docs = sessionsBySite(day.sessions).filter((x) => x.site === "VALEDA").flatMap((x) => x.docs);
  const techs = [];
  for (const p of (day.techs && day.techs.people) || []) {
    const u = p.unknown || {};
    const am = (u.AM || []).some((w) => /valeda/i.test(w));
    const pm = (u.PM || []).some((w) => /valeda/i.test(w));
    if (am || pm) techs.push({ name: p.name, half: am && pm ? null : am ? "AM" : "PM" });
  }
  return docs.length || techs.length ? { docs, techs } : null;
}

/**
 * Managers for one day (server: day.managers, Oct 2026). Older servers send
 * none → []. Each → { name, text, tone } where tone is "vacation" (amber),
 * "out" (muted) or "in". Examples:
 *   "Aundrea · WORC", "Brittany · LEOM ext. 1234",
 *   "Aundrea — vacation through Fri, Oct 9", "Brittany — out",
 *   half-day: "Brittany · LEOM PM (AM WORC)".
 */
export function managersOf(day) {
  return staffOf(day && day.managers);
}

/**
 * Front desk for one day (server: day.frontDesk, Oct 2026). Same shape and
 * text as managersOf: "Sandy", "Lisa · LEOM ext. 12",
 * "Kim — vacation through Fri, Oct 9", "Matt — out".
 */
export function frontDeskOf(day) {
  return staffOf(day && day.frontDesk);
}

function staffOf(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((m) => {
    const ext = m.ext ? ` ext. ${m.ext}` : "";
    const part = m.part ? ` ${m.part}` : "";
    const note = m.note ? ` (${m.note})` : "";
    if (m.status === "vacation") {
      return { name: m.name, tone: "vacation", text: `${m.name} — vacation${m.through ? ` through ${shortDate(m.through)}` : ""}` };
    }
    if (m.status === "out") return { name: m.name, tone: "out", text: `${m.name} — out${part}${note}` };
    return { name: m.name, tone: "in", text: `${m.name}${m.site ? ` · ${m.site}` : ""}${ext}${part}${note}` };
  });
}

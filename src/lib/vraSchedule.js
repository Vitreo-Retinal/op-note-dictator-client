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
        // General events (Oct 2026): title / time / location; older servers → [].
        if (d && !Array.isArray(d.events)) d.events = [];
      }
    }
    return data;
  } catch {
    return { configured: true, error: "network", days: [] };
  }
}

/** "18:00" → "6:00 PM"; null/bad → null. */
export function clock12(hm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hm || ""));
  if (!m) return null;
  const h = Number(m[1]);
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}

/**
 * Event time label: all-day → "All day"; "18:00"–"21:00" → "6:00–9:00 PM";
 * "11:00"–"13:00" → "11:00 AM–1:00 PM"; start only → "From 8:00 PM";
 * end only → "Until 10:00 AM"; neither (middle of a multi-day event) → "All day".
 */
export function eventTime(ev) {
  if (!ev || ev.allDay) return "All day";
  const s = clock12(ev.start), e = clock12(ev.end);
  if (s && e) {
    const [sT, sP] = s.split(" "), [eT, eP] = e.split(" ");
    return sP === eP ? `${sT}–${eT} ${eP}` : `${s}–${e}`;
  }
  if (s) return `From ${s}`;
  if (e) return `Until ${e}`;
  return "All day";
}

/** Day's general events (always an array). */
export const eventsOf = (day) => (day && Array.isArray(day.events) ? day.events : []);

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

/** "YYYY-MM-DD" + n calendar days → "YYYY-MM-DD" (DST-safe). */
export function addDaysYmd(ymd, n) {
  const d = dateOfYmd(ymd);
  d.setDate(d.getDate() + n);
  return ymdOf(d);
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
// Oct 2026: with the daily sheet → "Sandy 6:30–3:00", "Lisa 8:00–close",
// "Kim — off" (muted). WORC is everyone's default site, so it is not shown;
// another site is, after the hours ("Kim 6:30–3:00 · LEOM"), and the entry
// carries `site` so StaffLine can tint it Leominster amber.
export function frontDeskOf(day) {
  return staffOf(day && day.frontDesk, { hideSite: "WORC", siteAfterHours: true });
}

/** "6:30-3:00" → "6:30–3:00", "8:00-close" → "8:00–close". */
export const hoursText = (h) => String(h || "").replace(/\s*-\s*/, "–");

function staffOf(raw, { hideSite = null, siteAfterHours = false } = {}) {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((m) => {
    const ext = m.ext ? ` ext. ${m.ext}` : "";
    const site = m.site && m.site !== hideSite ? ` · ${m.site}` : "";
    const hours = m.hours ? ` ${hoursText(m.hours)}` : "";
    const part = m.part ? ` ${m.part}` : "";
    const note = m.note ? ` (${m.note})` : "";
    if (m.status === "vacation") {
      return { name: m.name, tone: "vacation", text: `${m.name} — vacation${m.through ? ` through ${shortDate(m.through)}` : ""}` };
    }
    if (m.status === "out") return { name: m.name, tone: "out", text: `${m.name} — out${part}${note}` };
    if (m.status === "off") return { name: m.name, tone: "out", text: `${m.name} — off` };
    if (siteAfterHours) {
      return { name: m.name, tone: "in", site: site ? m.site : null, text: `${m.name}${hours}${site}${ext}${part}${note}` };
    }
    return { name: m.name, tone: "in", text: `${m.name}${site}${hours}${ext}${part}${note}` };
  });
}

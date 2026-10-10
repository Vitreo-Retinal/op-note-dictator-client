// ── Research home helpers (Oct 2026) — pure, no fetch, no import.meta ──
// Used by src/ResearchHome.jsx; unit-tested in scripts/research.test.js.
//
// 1. researchDays(): who is on research (Nana's tech sheet "Research:" line or
//    a tech line assigned "research") for today + the next few clinic days,
//    from the GET /api/schedule payload (day.techs.people / day.techs.roles,
//    parsed server-side by lib/vra-schedule.js). Never guesses: a day with no
//    research staff on its sheet says so.
// 2. groupVisits(): GET /api/trial-visits rows grouped by trial, labelled with
//    the trial's acronym from GET /api/trials when the key matches.
// Participant STUDY IDs only — nothing here reads or produces patient names.

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HALVES = ["AM", "PM"];

/** "YYYY-MM-DD" → local-noon Date (DST-safe). null for anything else. */
export function dateOfYmd(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd || ""));
  return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : null;
}

/** Local calendar date → "YYYY-MM-DD". */
export function ymdOf(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "2026-10-12" → "Mon, Oct 12"; bad input → "". */
export function shortDate(ymd) {
  const d = dateOfYmd(ymd);
  return d ? `${DOW[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}` : "";
}

const isWeekend = (ymd) => { const d = dateOfYmd(ymd); return !!d && (d.getDay() === 0 || d.getDay() === 6); };
const hoursText = (h) => String(h || "").replace(/\s*-\s*/, "–");
const bare = (s) => String(s || "").replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
const lc = (s) => String(s || "").toLowerCase();

/**
 * One day's research staff from day.techs → [{ name, halves: {AM: site|null, PM: site|null}, hours, note }].
 * Sources: techs.people with "research" in am/pm (sites per half), then any
 * name in techs.roles[site][half].research the people list did not cover.
 */
export function researchStaffOf(techs) {
  if (!techs) return [];
  const out = new Map();
  const add = (name, half, site) => {
    const key = lc(name);
    if (!key) return null;
    if (!out.has(key)) out.set(key, { name, halves: { AM: null, PM: null }, hours: null, note: null });
    const e = out.get(key);
    if (half && site && !e.halves[half]) e.halves[half] = site;
    return e;
  };
  for (const p of Array.isArray(techs.people) ? techs.people : []) {
    if (!p || !p.name) continue;
    const am = Array.isArray(p.am) && p.am.includes("research");
    const pm = Array.isArray(p.pm) && p.pm.includes("research");
    if (!am && !pm) continue;
    const sites = p.sites || {};
    const e = add(p.name, null, null);
    if (am) e.halves.AM = sites.AM || p.site || null;
    if (pm) e.halves.PM = sites.PM || p.site || null;
    if (p.hours && !e.hours) e.hours = p.hours;
    const notes = [...new Set([am && p.amNote, pm && p.pmNote].filter(Boolean))];
    if (notes.length && !e.note) e.note = notes.join("; ");
  }
  const roles = techs.roles && typeof techs.roles === "object" ? techs.roles : {};
  for (const site of Object.keys(roles)) {
    for (const h of HALVES) {
      const list = roles[site] && roles[site][h] && roles[site][h].research;
      for (const n of Array.isArray(list) ? list : []) add(n, h, site);
    }
  }
  return [...out.values()];
}

/** { AM, PM } sites → "WORC" (all day) | "WORC AM · LEOM PM" | "LEOM AM" | null. */
export function whereText(halves) {
  const { AM, PM } = halves || {};
  if (AM && PM) return AM === PM ? AM : `${AM} AM · ${PM} PM`;
  if (AM) return `${AM} AM`;
  if (PM) return `${PM} PM`;
  return null;
}

/**
 * Today + the next `ahead` weekdays in the schedule payload →
 * [{ date, label, today, closed, closureName, hasSheet, staff:[…], away:[…], sheetNote, empty }]
 *  - staff: { name, where, site (first half's site), hours ("7:30–4:00"|null), note }
 *  - away: research staff (seen on any sheet in the payload) listed off / on vacation that day
 *  - empty: the text to show when staff is empty — never a guess:
 *      today → "Not on today's sheet"; other days → "Not on that day's sheet"
 *      or, when no tech sheet is posted for the day, "No tech sheet posted yet".
 */
export function researchDays(sched, todayYmd, ahead = 3) {
  const days = sched && Array.isArray(sched.days) ? sched.days.filter((d) => d && d.date) : [];
  const byDate = new Map(days.map((d) => [d.date, d]));
  // Every research name seen on any sheet in the payload (for off / vacation).
  const known = new Map();
  for (const d of days) for (const s of researchStaffOf(d.techs)) known.set(lc(s.name), s.name);

  const picked = [];
  if (byDate.has(todayYmd)) picked.push(todayYmd);
  for (const d of [...days].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))) {
    if (picked.length >= ahead + (byDate.has(todayYmd) ? 1 : 0)) break;
    if (d.date > todayYmd && !isWeekend(d.date)) picked.push(d.date);
  }

  return picked.map((date) => {
    const day = byDate.get(date);
    const techs = day.techs || null;
    const staff = researchStaffOf(techs).map((s) => ({
      name: s.name,
      where: whereText(s.halves),
      site: s.halves.AM || s.halves.PM || null,
      hours: s.hours ? hoursText(s.hours) : null,
      note: s.note,
    }));
    const working = new Set(staff.map((s) => lc(s.name)));
    const away = [];
    for (const v of Array.isArray(day.staffVacations) ? day.staffVacations : []) {
      const k = lc(v && v.name);
      if (known.has(k) && !working.has(k)) { away.push({ name: known.get(k), text: `vacation${v.through ? ` through ${shortDate(v.through)}` : ""}` }); working.add(k); }
    }
    for (const o of techs && Array.isArray(techs.off) ? techs.off : []) {
      const k = lc(bare(o));
      if (known.has(k) && !working.has(k)) { away.push({ name: known.get(k), text: "off" }); working.add(k); }
    }
    const today = date === todayYmd;
    const empty = today ? "Not on today's sheet" : techs ? "Not on that day's sheet" : "No tech sheet posted yet";
    return {
      date, today, label: today ? "Today" : shortDate(date),
      closed: !!day.closed, closureName: day.closureName || null,
      hasSheet: !!techs, staff, away,
      sheetNote: techs && techs.trials ? String(techs.trials) : null,
      empty,
    };
  });
}

// ── Participant visits ──────────────────────────────────────────────

/** Visit status → label + chip tone (theme.js chip()). Unknown → muted, title-cased. */
export const VISIT_STATUS = {
  scheduled: { label: "Scheduled", tone: "accent" },
  "window-open": { label: "Window open", tone: "amber" },
  completed: { label: "Completed", tone: "green" },
  missed: { label: "Missed", tone: "red" },
  "screen-fail": { label: "Screen fail", tone: "muted" },
  withdrawn: { label: "Withdrawn", tone: "muted" },
};
export const HIDDEN_STATUSES = ["withdrawn", "screen-fail"];
export function visitStatus(s) {
  if (VISIT_STATUS[s]) return VISIT_STATUS[s];
  const label = String(s || "").replace(/[_-]/g, " ").trim();
  return { label: label ? label.replace(/^./, (c) => c.toUpperCase()) : "No status", tone: "muted" };
}

/** Trial key → display label: matching trial's acronym (by slug or acronym, any case), else the key upper-cased. */
export function trialLabel(key, trials) {
  const k = lc(key).trim();
  for (const t of Array.isArray(trials) ? trials : []) {
    if (!t) continue;
    if ((t.slug && lc(t.slug) === k) || (t.acronym && lc(t.acronym) === k)) return t.acronym || t.slug;
  }
  return String(key || "").trim().toUpperCase() || "Unassigned";
}

const byDateAsc = (a, b) => {
  const da = a.visit_date || null, db = b.visit_date || null;
  if (da === db) return String(a.participant_id || "").localeCompare(String(b.participant_id || ""));
  if (!da) return 1;
  if (!db) return -1;
  return da < db ? -1 : 1;
};

/**
 * Visits → [{ key, label, visits:[…], hidden }] grouped by trial_key, groups
 * by label A–Z, visits by date (undated last). withdrawn / screen-fail rows
 * are left out unless showHidden; `hidden` = how many were left out per group.
 */
export function groupVisits(visits, trials, { showHidden = false } = {}) {
  const groups = new Map();
  for (const v of Array.isArray(visits) ? visits : []) {
    if (!v || typeof v !== "object") continue;
    const key = lc(v.trial_key).trim() || "";
    if (!groups.has(key)) groups.set(key, { key, label: trialLabel(v.trial_key, trials), visits: [], hidden: 0 });
    const g = groups.get(key);
    if (!showHidden && HIDDEN_STATUSES.includes(v.status)) { g.hidden++; continue; }
    g.visits.push(v);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, visits: g.visits.sort(byDateAsc) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

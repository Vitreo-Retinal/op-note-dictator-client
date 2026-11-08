// Wording for the Rates screen v2 (Oct 2026) — pure helpers, unit-tested in
// scripts/rateText.test.js. Mari's rules: show only VRA's own published rate;
// never an estimate; when the file lists several prices without saying which
// applies, show no main number. Lines are short so they read well aloud.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10" → "Oct 2026"; anything else → null. */
export function monthLabel(ym) {
  const m = /^(\d{4})-(\d{2})/.exec(String(ym || ""));
  if (!m) return null;
  const i = Number(m[2]) - 1;
  return i >= 0 && i < 12 ? `${MONTHS[i]} ${m[1]}` : null;
}

/** $1,234.56 (always cents — small rates need them). */
export function price(v) {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  return "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Sorted, de-duplicated numeric prices (to the cent). */
export function uniqPrices(list) {
  const seen = new Set();
  const out = [];
  for (const x of list || []) {
    const n = Number(x);
    if (!Number.isFinite(n)) continue;
    const k = n.toFixed(2);
    if (!seen.has(k)) { seen.add(k); out.push(n); }
  }
  return out.sort((a, b) => a - b);
}

/** "a", "a and b", "a, b and c". */
export function joinAnd(parts) {
  if (parts.length <= 1) return parts.join("");
  return parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1];
}

/** Office prices other than the rate itself (removes one copy of the rate). */
export function otherPrices(vra) {
  const rate = vra && vra.rate != null ? Number(vra.rate) : null;
  const list = uniqPrices(vra && vra.office_prices);
  if (rate == null) return list;
  const i = list.findIndex((x) => Math.abs(x - rate) < 0.005);
  if (i >= 0) list.splice(i, 1);
  return list;
}

/** True when VRA has one rate to show as the big number. */
export function hasSingleRate(vra) {
  return !!(vra && vra.rate != null && vra.pattern !== "unresolved" && vra.pattern !== "two_sets");
}

/** The one-line explanation under the big number, or null. */
export function patternLine(vra) {
  if (!hasSingleRate(vra)) return null;
  const rate = Number(vra.rate);
  const others = otherPrices(vra);
  switch (vra.pattern) {
    case "global": {
      if (!others.length) return "Global fee (office).";
      const sum = others.reduce((a, b) => a + b, 0);
      const adds = others.length >= 2 && Math.abs(sum - rate) < 0.02;
      return `Global fee (office). The file also lists ${joinAnd(others.map(price))}${adds ? ", which add up to it" : ""}.`;
    }
    case "full_fee": {
      if (!others.length) return "Full fee.";
      const tiers = others.map((x) => `${price(x)} (${Math.round((x / rate) * 100)}%)`);
      return `Full fee. The file also lists reduced prices: ${tiers.join(", ")}.`;
    }
    case "fep_max": return "Highest office price in the file.";
    case "mixed": return "Doctors in the group have different prices. Median shown.";
    default: return null;
  }
}

export const SEVERAL_PRICES_LINE = "The file lists several prices for this code without saying which one applies. Check a recent payment.";

/** Lines for the "No single VRA rate" case: [{ label, prices }]. */
export function priceSets(vra) {
  if (!vra) return [];
  const sets = [];
  const office = uniqPrices(vra.office_prices);
  if (office.length) sets.push({ label: "Office prices in the file", prices: office });
  if (vra.pattern === "two_sets") {
    const any = uniqPrices(vra.anyplace_prices);
    if (any.length) sets.push({ label: "Any-place prices in the file", prices: any });
  }
  return sets;
}

// ── Dates (Oct 2026, Mari: "a new rate doesn't wipe out an old one"; "payments lag,
// so if we want to look at an EOB, it is helpful to know when the quoted payment is from") ──

/** "2026-06-12" → "Jun 12, 2026" (no time zone shift); anything else → null. */
export function dayLabel(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd || ""));
  if (!m) return null;
  const i = Number(m[2]) - 1;
  return i >= 0 && i < 12 ? `${MONTHS[i]} ${Number(m[3])}, ${m[1]}` : null;
}

/** "YYYY-MM" for a Date (local time). */
export function ymOf(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Date-of-service picker: every month from `first` to the current month, newest first.
 * `last` ('YYYY-MM', Nov 2026) extends the list past this month — the start month of the latest
 * stored release (latestReleaseMonth), so a January 2027 visit can be priced in December once
 * CMS has published RVU27A. Never shorter than this month.
 */
export function monthOptions(now = new Date(), first = "2026-01", last = null) {
  const out = [];
  const top = /^\d{4}-\d{2}$/.test(String(last || "")) && last > ymOf(now) ? last : ymOf(now);
  let [y, m] = top.split("-").map(Number);
  const [fy, fm] = first.split("-").map(Number);
  while (y > fy || (y === fy && m >= fm)) {
    const val = `${y}-${String(m).padStart(2, "0")}`;
    out.push({ val, label: monthLabel(val) });
    m -= 1; if (m === 0) { m = 12; y -= 1; }
  }
  return out;
}

/** hub_medicare_releases() rows → 'YYYY-MM' of the latest valid_from (any kind or status), or null. */
export function latestReleaseMonth(releases) {
  let best = null;
  for (const r of Array.isArray(releases) ? releases : []) {
    const ym = /^(\d{4}-\d{2})-\d{2}/.exec(String((r && r.valid_from) || ""));
    if (ym && (!best || ym[1] > best)) best = ym[1];
  }
  return best;
}

/** "Jun–Oct 2026", "Oct 2026", "Dec 2026 – Feb 2027". */
export function monthRange(from, to) {
  const f = monthLabel(from), t = monthLabel(to);
  if (!f || !t) return f || t || "";
  if (from === to) return t;
  return from.slice(0, 4) === to.slice(0, 4) ? `${f.slice(0, 3)}–${t}` : `${f} – ${t}`;
}

const shortDay = (ymd) => { const d = dayLabel(ymd); return d ? d.replace(/, \d{4}$/, "") : null; };

/** "Q3 2026 (Jul 1 – Sep 30)" for a full calendar quarter, else "Jul 1 – Aug 15, 2026". */
export function periodLabel(from, to) {
  if (!from) return null;
  if (!to) return `from ${dayLabel(from)}`;
  const m = /^(\d{4})-(\d{2})-01$/.exec(from);
  const qEnd = { "01": "03-31", "04": "06-30", "07": "09-30", "10": "12-31" };
  if (m && qEnd[m[2]] && to === `${m[1]}-${qEnd[m[2]]}`) {
    return `Q${(Number(m[2]) + 2) / 3} ${m[1]} (${shortDay(from)} – ${shortDay(to)})`;
  }
  return `${shortDay(from)} – ${dayLabel(to)}`;
}

// Last 'YYYY-MM' of the calendar quarter holding a 'YYYY-MM-DD'.
const quarterEndMonth = (ymd) => {
  const y = ymd.slice(0, 4), m = Number(ymd.slice(5, 7));
  return `${y}-${String(Math.floor((m - 1) / 3) * 3 + 3).padStart(2, "0")}`;
};

/**
 * Medicare period. { line, short, later? }:
 *   drug      → "Medicare ASP · Q3 2026 (Jul 1 – Sep 30)" / "ASP · Q3 2026 (Jul 1 – Sep 30)"
 *   procedure → "Medicare 2026 fee schedule (Worcester) · RVU26A · Q1 2026 (Jan 1 – Mar 31)"
 *               / "Worcester · RVU26A · Q1 2026 (Jan 1 – Mar 31)"
 *               (open release: "· RVU26D · from Oct 1, 2026"; published future release:
 *               "· RVU27A · published by CMS, starts Jan 1, 2027")
 * `later` (shown as a note) when the month asked is outside the period returned: before it,
 * after an open ASP quarter's calendar quarter, or in a later year than an open fee schedule
 * release (a CMS release never runs past its year). Since the Nov 8 2026 DB change a month after
 * the last stored release comes back missing (after_stored — see missingMedicare), so the last
 * two only guard an older answer shape. Null when the answer carries no period.
 */
export function medicarePeriod(benchmarks, isDrug, month) {
  const p = benchmarks && benchmarks.med_period;
  if (!p || !p.from) return null;
  if (isDrug) {
    const q = periodLabel(p.from, p.to);
    // The month asked is before the quarter returned (no older ASP stored): say so.
    if (month && month < p.from.slice(0, 7)) {
      return {
        line: `Medicare ASP · ${q}`,
        short: `ASP ${q} · none stored for ${monthLabel(month)}`,
        later: `No Medicare ASP for ${monthLabel(month)} is stored. This is the rate ${q}.`,
      };
    }
    // After an open quarter (no newer ASP file stored yet): say so.
    if (month && !p.to && month > quarterEndMonth(p.from)) {
      return {
        line: `Medicare ASP · ${q}`,
        short: `ASP ${q} · none stored yet for ${monthLabel(month)}`,
        later: `No Medicare ASP for ${monthLabel(month)} is stored yet. This is the rate ${q}.`,
      };
    }
    return { line: `Medicare ASP · ${q}`, short: `ASP · ${q}` };
  }
  const year = p.from.slice(0, 4);
  const rel = p.release ? `${p.release} · ` : "";
  if (p.is_future) {
    const starts = `published by CMS, starts ${dayLabel(p.from)}`;
    return { line: `Medicare ${year} fee schedule (Worcester) · ${rel}${starts}`, short: `Worcester · ${rel}${starts}` };
  }
  const range = p.to ? periodLabel(p.from, p.to) : p.release ? `from ${dayLabel(p.from)}` : `current release (${monthLabel(p.from)})`;
  const out = { line: `Medicare ${year} fee schedule (Worcester) · ${rel}${range}`, short: `Worcester · ${rel}${range}` };
  if (month && !p.to && month.slice(0, 4) > year) {
    out.later = `No ${month.slice(0, 4)} Medicare fee schedule is stored yet. This is the ${p.release || year} rate ${range}.`;
  }
  return out;
}

/**
 * A month with no stored Medicare price: the answer has no number (vra.rate and med_nat null)
 * and med_period = { missing, first_from[, kind: 'mpfs'][, release][, after_stored] }. Or null.
 *   drug      → "No Medicare ASP stored for Jun 2026. Our first stored quarter starts Jul 1, 2026."
 *   procedure → "No Medicare fee schedule stored for Dec 2025. Stored releases start Jan 1, 2026."
 *   after the last stored release / quarter (after_stored) →
 *               "No Medicare fee schedule is stored yet for Jan 2027." / "No Medicare ASP is stored yet for Jan 2027."
 *               (the release has no row for the code → "No Medicare fee schedule rate stored for this code in RVU26D.")
 */
function missingParts(benchmarks, month) {
  const p = benchmarks && benchmarks.med_period;
  if (!p || !p.missing) return null;
  const first = dayLabel(p.first_from);
  const m = monthLabel(month) || "this month";
  // Nov 8 2026 DB change: a month after the last stored release / ASP quarter comes back
  // { missing, after_stored: true } — "not stored yet", never "Stored releases start …".
  if (p.after_stored) {
    return { head: p.kind === "mpfs" ? `No Medicare fee schedule is stored yet for ${m}` : `No Medicare ASP is stored yet for ${m}`, tail: "" };
  }
  if (p.kind === "mpfs") {
    if (p.release && !first) return { head: `No Medicare fee schedule rate stored for this code in ${p.release}`, tail: "" };
    return { head: `No Medicare fee schedule stored for ${m}`, tail: first ? ` Stored releases start ${first}.` : "" };
  }
  return { head: `No Medicare ASP stored for ${m}`, tail: first ? ` Our first stored quarter starts ${first}.` : "" };
}
export function missingMedicare(benchmarks, month) {
  const x = missingParts(benchmarks, month);
  return x ? `${x.head}.${x.tail}` : null;
}
/** Older name (drug-only wording until Nov 2026); same function. */
export const missingAsp = missingMedicare;

/** "No Medicare fee schedule stored for Dec 2025, so there is no Medicare comparison." (ASP wording for drugs), or null. */
export function noMedicareComparison(benchmarks, month) {
  const x = missingParts(benchmarks, month);
  return x ? `${x.head}, so there is no Medicare comparison.` : null;
}

/** "No Medicare ASP for Jun 2026, so no margin is shown." (fee schedule wording for procedures), or null. */
export function noMedicareMargin(benchmarks, month) {
  const p = benchmarks && benchmarks.med_period;
  if (!p || !p.missing) return null;
  if (p.after_stored) return `${missingParts(benchmarks, month).head}, so no margin is shown.`;
  return `No Medicare ${p.kind === "mpfs" ? "fee schedule" : "ASP"} for ${monthLabel(month) || "this month"}, so no margin is shown.`;
}

/**
 * RVU box when hub_rvu_at returns no row because no stored release covers the month (procedures;
 * the plan answer's med_period says why): "No Medicare fee schedule is stored yet for Jan 2027,
 * so there is no RVU breakdown." Null otherwise (then the box is simply not shown, as before).
 */
export function noRvuLine(benchmarks, month) {
  const p = benchmarks && benchmarks.med_period;
  if (!p || !p.missing || p.kind !== "mpfs") return null;
  return `${missingParts(benchmarks, month).head}, so there is no RVU breakdown.`;
}

/**
 * RVU breakdown heading for hub_rvu_at(code, month) → { label, note }:
 *   "RVU26D · from Oct 1, 2026" · "RVU26A · Q1 2026 (Jan 1 – Mar 31)" ·
 *   "RVU27A · published by CMS, starts Jan 1, 2027". Older answers without a release → "2026 MPFS".
 *   note: "No 2027 Medicare fee schedule is stored yet." when the month is in a later year than an open release.
 */
export function rvuRelease(rvu, month) {
  if (!rvu) return { label: "", note: null };
  const from = rvu.valid_from || rvu.as_of || null;
  if (!rvu.release) return { label: `${from ? String(from).slice(0, 4) + " " : ""}MPFS`, note: null };
  if (rvu.is_future) return { label: `${rvu.release} · published by CMS, starts ${dayLabel(from)}`, note: null };
  const range = rvu.valid_to ? periodLabel(from, rvu.valid_to) : `from ${dayLabel(from)}`;
  const note = month && !rvu.valid_to && from && month.slice(0, 4) > String(from).slice(0, 4)
    ? `No ${month.slice(0, 4)} Medicare fee schedule is stored yet.` : null;
  return { label: `${rvu.release} · ${range}`, note };
}

/** "MassHealth fee schedule · as of May 2026" (from benchmarks.mh_as_of), or null. */
export function massHealthPeriod(benchmarks) {
  const m = monthLabel(benchmarks && benchmarks.mh_as_of);
  return m ? `MassHealth fee schedule · as of ${m}` : null;
}

/** Commercial file sub-line for the month asked. */
export function fileLine(plan, vra, month) {
  const label = (plan && plan.label) || "";
  const src = vra && vra.source_month;
  let when = null;
  if (!src) when = (plan && plan.month_note) || null;            // files with no stated month
  else if (vra.exact_month === false && month && month !== src) when = `No ${monthLabel(month)} file — using the ${monthLabel(src)} file`;
  else when = `${monthLabel(src)} file`;
  return [label, when].filter(Boolean).join(" · ");
}

/** Timeline entries with a stated month, oldest first. */
export function datedTimeline(timeline) {
  return (timeline || []).filter((t) => t && /^\d{4}-\d{2}$/.test(String(t.month || "")))
    .sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));
}

/** "No file on record for Mar 2026. Our first file for this plan is Jun 2026." or null. */
export function noFileLine(data) {
  if (!data || data.vra || !data.plan || data.plan.source !== "mrf") return null;
  const dated = datedTimeline(data.timeline);
  if (!dated.length || !data.month || data.month >= dated[0].month) return null;
  return `No file on record for ${monthLabel(data.month)}. Our first file for this plan is ${monthLabel(dated[0].month)}.`;
}

/**
 * "Rate by file month" runs: equal-rate (to the cent) months compressed, oldest
 * first: [{ from, to, rate, label, change }] — change = % vs the previous run
 * (null for the first run, or when either rate is missing). [] when the timeline
 * has fewer than two dated entries.
 */
export function timelineRuns(timeline) {
  const dated = datedTimeline(timeline);
  if (dated.length < 2) return [];
  const runs = [];
  for (const t of dated) {
    const rate = t.rate == null ? null : Math.round(Number(t.rate) * 100) / 100;
    const last = runs[runs.length - 1];
    if (last && last.rate === rate) last.to = t.month;
    else runs.push({ from: t.month, to: t.month, rate });
  }
  return runs.map((r, i) => {
    const prev = runs[i - 1];
    const change = prev && prev.rate && r.rate != null ? Math.round((r.rate / prev.rate - 1) * 100) : null;
    return { ...r, label: monthRange(r.from, r.to), change };
  });
}

/** "−10%" / "+4%" / "0%" (true minus sign). */
export function pctChange(n) {
  if (n == null) return "";
  return n > 0 ? `+${n}%` : n < 0 ? `−${Math.abs(n)}%` : "0%";
}

/** "Paid on your EOB: $123.49 — what was paid, not a published rate." */
export function eobLine(e) {
  return `Paid on your EOB: ${price(e && e.rate)} — what was paid, not a published rate.`;
}

/**
 * When the EOB payment is from:
 *   "Service Jun 12, 2026 · EOB Jul 20, 2026"
 *   "Service date not recorded · entered as Jun 2026"
 * plus " (different month from the one selected)" when the service month ≠ the picker month.
 */
export function eobDates(e, month) {
  if (!e) return "";
  const svc = dayLabel(e.service_date), paid = dayLabel(e.eob_date);
  const parts = [svc ? `Service ${svc}` : "Service date not recorded"];
  if (paid) parts.push(`EOB ${paid}`);
  else if (!svc && monthLabel(e.source_month)) parts.push(`entered as ${monthLabel(e.source_month)}`);
  let out = parts.join(" · ");
  if (svc && month && String(e.service_date).slice(0, 7) !== month) out += " (different month from the one selected)";
  return out;
}

/** The muted line under the big number. Medicare / MassHealth show their period. */
export function sourceLine(plan, vra, data) {
  if (!plan) return "";
  const b = data && data.benchmarks;
  if (plan.source === "medicare") {
    const p = medicarePeriod(b, data && data.type === "drug", data && data.month);
    return p ? p.line : plan.label || "";
  }
  if (plan.source === "masshealth") return massHealthPeriod(b) || plan.label || "";
  return fileLine(plan, vra, data && data.month);
}

// ── Drug margin with the cost in effect for the month (Oct 2026) ─────────────
// hub_plan_rate_at returns drug_cost (today's cost) and drug_cost_at (the cost in
// effect on the 15th of the picked month, from pricing.drug_cost_history; null when
// none is recorded). drug_cost_at is NOT dose-adjusted: for a dose-level code
// (dose_mult ≠ 1) the server already multiplied the rate to a per-dose figure and
// gives drug_cost billed_units_per_vial = 1 (dose_adjusted), so the same is done here.

/** "Jul 20 – Sep 30, 2026", "Dec 15, 2026 – Jan 31, 2027", "since Jul 20, 2026". */
export function costPeriod(from, to) {
  if (!dayLabel(from)) return null;
  if (!dayLabel(to)) return `since ${dayLabel(from)}`;
  return from.slice(0, 4) === to.slice(0, 4) ? `${shortDay(from)} – ${dayLabel(to)}` : `${dayLabel(from)} – ${dayLabel(to)}`;
}

/**
 * Margin per dose from VRA's per-unit rate (× units_per_dose, as before).
 * → { perUnit, perDose, acqPerUnit, upd, acqCost, historic, period, todayAsOf, noCostFor } or null.
 *   historic   — the cost in effect for the month was used (drug_cost_at)
 *   period     — "Jul 20 – Sep 30, 2026" for that cost
 *   noCostFor  — 'YYYY-MM' when the answer says there is no cost for that month and today's cost is used
 */
export function drugMargin(data, vraRate) {
  if (!data || data.type !== "drug" || vraRate == null) return null;
  const upd = data.units_per_dose ? Number(data.units_per_dose) : 1;
  const mult = data.dose_mult != null ? Number(data.dose_mult) : 1;
  const at = data.drug_cost_at;
  const now = data.drug_cost;
  let acqPerUnit = null, acqCost = null, historic = false, period = null;
  if (at && at.acq_cost != null) {
    const units = mult !== 1 ? 1 : Number(at.billed_units_per_vial);
    if (units > 0) {
      acqCost = Number(at.acq_cost);
      acqPerUnit = acqCost / units;
      historic = true;
      period = costPeriod(at.effective_from, at.effective_to);
    }
  }
  if (acqPerUnit == null && now && now.acq_cost != null) {
    acqCost = Number(now.acq_cost);
    acqPerUnit = now.cost_basis === "per_billed_unit" ? acqCost
      : now.billed_units_per_vial ? acqCost / Number(now.billed_units_per_vial) : null;
  }
  if (acqPerUnit == null) return null;
  const todayAsOf = !historic && now ? now.as_of || null : null;
  // Older answers have no drug_cost_at key: flag only when today's cost is newer than the month.
  const hasAtKey = Object.prototype.hasOwnProperty.call(data, "drug_cost_at");
  const noCostFor = historic || !data.month ? null
    : hasAtKey ? data.month
    : todayAsOf && String(todayAsOf).slice(0, 7) > data.month ? data.month : null;
  return { perUnit: vraRate - acqPerUnit, perDose: (vraRate - acqPerUnit) * upd, acqPerUnit, upd, acqCost, historic, period, todayAsOf, noCostFor };
}

/** "We have no recorded acquisition cost for Jun 2026. Today's price (as of Oct 1, 2026) is shown." */
export function noCostLine(m) {
  if (!m || !m.noCostFor) return null;
  const asOf = dayLabel(m.todayAsOf);
  return `We have no recorded acquisition cost for ${monthLabel(m.noCostFor)}. Today's price${asOf ? ` (as of ${asOf})` : ""} is shown.`;
}

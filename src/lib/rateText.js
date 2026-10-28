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

/** Date-of-service picker: every month from `first` to the current month, newest first. */
export function monthOptions(now = new Date(), first = "2026-01") {
  const out = [];
  let [y, m] = ymOf(now).split("-").map(Number);
  const [fy, fm] = first.split("-").map(Number);
  while (y > fy || (y === fy && m >= fm)) {
    const val = `${y}-${String(m).padStart(2, "0")}`;
    out.push({ val, label: monthLabel(val) });
    m -= 1; if (m === 0) { m = 12; y -= 1; }
  }
  return out;
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

/**
 * Medicare period. { line, short }:
 *   drug      → "Medicare ASP · Q3 2026 (Jul 1 – Sep 30)" / "ASP · Q3 2026 (Jul 1 – Sep 30)"
 *   procedure → "Medicare 2026 fee schedule (Worcester) · current release (Oct 2026). Earlier 2026 releases are not stored."
 *               / "Worcester · current release (Oct 2026)"
 * Null when the answer carries no period.
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
    return { line: `Medicare ASP · ${q}`, short: `ASP · ${q}` };
  }
  const year = p.from.slice(0, 4);
  if (p.to) {
    const range = periodLabel(p.from, p.to);
    return { line: `Medicare ${year} fee schedule (Worcester) · ${range}`, short: `Worcester · ${range}` };
  }
  const rel = monthLabel(p.from);
  return {
    line: `Medicare ${year} fee schedule (Worcester) · current release (${rel}). Earlier ${year} releases are not stored.`,
    short: `Worcester · current release (${rel})`,
  };
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

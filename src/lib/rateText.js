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

/** "Paid on your EOB (Jun 2026): $123.49 — what was paid, not a published rate." */
export function eobLine(e) {
  const m = monthLabel(e && e.source_month);
  return `Paid on your EOB${m ? ` (${m})` : ""}: ${price(e && e.rate)} — what was paid, not a published rate.`;
}

/** The muted line under the big number: plan label · month (label only for Medicare / MassHealth). */
export function sourceLine(plan, vra) {
  if (!plan) return "";
  const label = plan.label || "";
  if (plan.source === "medicare" || plan.source === "masshealth") return label;
  const month = plan.month_note || monthLabel(vra && vra.source_month);
  return [label, month].filter(Boolean).join(" · ");
}

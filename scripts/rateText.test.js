// Unit tests for src/lib/rateText.js — Rates screen v2 wording (Oct 2026).
// Payloads mirror real hub_plan_rate answers. No network. Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { monthLabel, price, uniqPrices, otherPrices, hasSingleRate, patternLine, priceSets, eobLine, eobDates, sourceLine, SEVERAL_PRICES_LINE,
  dayLabel, monthOptions, monthRange, periodLabel, medicarePeriod, massHealthPeriod, fileLine, noFileLine, timelineRuns, pctChange,
  costPeriod, drugMargin, noCostLine } from "../src/lib/rateText.js";

test("monthLabel and price", () => {
  assert.equal(monthLabel("2026-10"), "Oct 2026");
  assert.equal(monthLabel("2026-06-01"), "Jun 2026");
  assert.equal(monthLabel(null), null);
  assert.equal(monthLabel("2026-13"), null);
  assert.equal(price(91.08), "$91.08");
  assert.equal(price(1879.32), "$1,879.32");
  assert.equal(price(null), "—");
});

test("uniqPrices sorts and drops repeats", () => {
  assert.deepEqual(uniqPrices([49.26, 41.82, 49.26, "91.08"]), [41.82, 49.26, 91.08]);
});

test("global: the two parts are listed and said to add up to the fee", () => {
  const vra = { rate: 91.08, pattern: "global", source_month: "2026-10", office_prices: [41.82, 49.26, 91.08] };
  assert.deepEqual(otherPrices(vra), [41.82, 49.26]);
  assert.equal(patternLine(vra), "Global fee (office). The file also lists $41.82 and $49.26, which add up to it.");
});

test("full_fee: lower tiers with their percent", () => {
  const vra = { rate: 101.5, pattern: "full_fee", office_prices: [10.15, 15.22, 101.5] };
  assert.equal(patternLine(vra), "Full fee. The file also lists reduced prices: $10.15 (10%), $15.22 (15%).");
});

test("fep_max and mixed lines; single and fee_schedule have none", () => {
  assert.equal(patternLine({ rate: 50, pattern: "fep_max", office_prices: [40, 50] }), "Highest office price in the file.");
  assert.equal(patternLine({ rate: 50, pattern: "mixed" }), "Doctors in the group have different prices. Median shown.");
  assert.equal(patternLine({ rate: 50, pattern: "single", office_prices: [50] }), null);
  assert.equal(patternLine({ rate: 31.322, pattern: "fee_schedule" }), null);
});

test("two_sets / unresolved: no main number, both price lists", () => {
  const vra = { rate: null, pattern: "two_sets", source_month: "2026-07", office_prices: [10.69, 16.04, 53.46, 106.92], anyplace_prices: [120.76, 136.86, 161.01] };
  assert.equal(hasSingleRate(vra), false);
  assert.equal(patternLine(vra), null);
  assert.deepEqual(priceSets(vra), [
    { label: "Office prices in the file", prices: [10.69, 16.04, 53.46, 106.92] },
    { label: "Any-place prices in the file", prices: [120.76, 136.86, 161.01] },
  ]);
  assert.deepEqual(priceSets({ rate: null, pattern: "unresolved", office_prices: [5, 7], anyplace_prices: [9] }), [
    { label: "Office prices in the file", prices: [5, 7] },
  ]);
  // even a stray rate on a two_sets row is never shown as the main number
  assert.equal(hasSingleRate({ rate: 10, pattern: "two_sets" }), false);
  assert.match(SEVERAL_PRICES_LINE, /Check a recent payment\.$/);
});

test("EOB line is labeled as a payment, not a rate, with when it is from", () => {
  assert.equal(eobLine({ rate: 123.49, source_month: "2026-06" }), "Paid on your EOB: $123.49 — what was paid, not a published rate.");
  // real Tufts MA row today: no dates recorded
  assert.equal(eobDates({ rate: 123.49, source_month: "2026-06", eob_date: null, service_date: null }, "2026-10"),
    "Service date not recorded · entered as Jun 2026");
  assert.equal(eobDates({ rate: 1, source_month: "2026-07", service_date: "2026-06-12", eob_date: "2026-07-20" }, "2026-06"),
    "Service Jun 12, 2026 · EOB Jul 20, 2026");
  assert.equal(eobDates({ rate: 1, source_month: "2026-07", service_date: "2026-06-12", eob_date: "2026-07-20" }, "2026-10"),
    "Service Jun 12, 2026 · EOB Jul 20, 2026 (different month from the one selected)");
  assert.equal(eobDates({ rate: 1, source_month: "2026-07", service_date: null, eob_date: "2026-07-20" }, "2026-10"),
    "Service date not recorded · EOB Jul 20, 2026");
});

test("date helpers: day labels, month picker, ranges, quarters", () => {
  assert.equal(dayLabel("2026-06-01"), "Jun 1, 2026");
  assert.equal(dayLabel("x"), null);
  const opts = monthOptions(new Date(2026, 9, 28));
  assert.equal(opts.length, 10);
  assert.deepEqual(opts[0], { val: "2026-10", label: "Oct 2026" });
  assert.deepEqual(opts[9], { val: "2026-01", label: "Jan 2026" });
  assert.equal(monthOptions(new Date(2027, 1, 3))[0].val, "2027-02");
  assert.equal(monthOptions(new Date(2027, 1, 3)).length, 14);
  assert.equal(monthRange("2026-06", "2026-10"), "Jun–Oct 2026");
  assert.equal(monthRange("2026-10", "2026-10"), "Oct 2026");
  assert.equal(monthRange("2026-12", "2027-02"), "Dec 2026 – Feb 2027");
  assert.equal(periodLabel("2026-07-01", "2026-09-30"), "Q3 2026 (Jul 1 – Sep 30)");
  assert.equal(periodLabel("2026-10-01", "2026-12-31"), "Q4 2026 (Oct 1 – Dec 31)");
  assert.equal(periodLabel("2026-07-01", "2026-08-15"), "Jul 1 – Aug 15, 2026");
});

test("Medicare and MassHealth periods (real benchmarks)", () => {
  const drug = { med_period: { from: "2026-07-01", to: "2026-09-30", basis: "Jul 2026 ASP (updated 082026)" } };
  assert.deepEqual(medicarePeriod(drug, true), { line: "Medicare ASP · Q3 2026 (Jul 1 – Sep 30)", short: "ASP · Q3 2026 (Jul 1 – Sep 30)" });
  const proc = { med_period: { from: "2026-10-01", to: null, basis: "2026 MPFS / Oct 2026 RVU26D" }, mpfs_basis: "2026 MPFS / Oct 2026 RVU26D", mh_as_of: "2026-05-01" };
  assert.deepEqual(medicarePeriod(proc, false), {
    line: "Medicare 2026 fee schedule (Worcester) · current release (Oct 2026). Earlier 2026 releases are not stored.",
    short: "Worcester · current release (Oct 2026)",
  });
  assert.equal(medicarePeriod({}, false), null);
  assert.equal(massHealthPeriod(proc), "MassHealth fee schedule · as of May 2026");
  assert.equal(massHealthPeriod({ mh_as_of: null }), null);
  // sourceLine uses them for Medicare / MassHealth plans
  assert.equal(sourceLine({ source: "medicare", label: "Medicare fee schedule (Worcester)" }, {}, { type: "drug", benchmarks: drug }), "Medicare ASP · Q3 2026 (Jul 1 – Sep 30)");
  assert.equal(sourceLine({ source: "masshealth", label: "MassHealth fee schedule" }, {}, { type: "procedure", benchmarks: proc }), "MassHealth fee schedule · as of May 2026");
  assert.equal(sourceLine({ source: "medicare", label: "Medicare fee schedule (Worcester)" }, {}, { benchmarks: {} }), "Medicare fee schedule (Worcester)");
});

test("commercial file line: exact month, nearest earlier file, undated files", () => {
  const plan = { source: "mrf", label: "Blue Cross HMO Blue published rate file" };
  assert.equal(fileLine(plan, { source_month: "2026-07", exact_month: true }, "2026-07"), "Blue Cross HMO Blue published rate file · Jul 2026 file");
  assert.equal(fileLine(plan, { source_month: "2026-05", exact_month: false }, "2026-06"),
    "Blue Cross HMO Blue published rate file · No Jun 2026 file — using the May 2026 file");
  assert.equal(fileLine({ ...plan, month_note: "File has no stated month" }, { source_month: null }, "2026-10"),
    "Blue Cross HMO Blue published rate file · File has no stated month");
  assert.equal(sourceLine(plan, { source_month: "2026-07", exact_month: false }, { month: "2026-10" }),
    "Blue Cross HMO Blue published rate file · No Oct 2026 file — using the Jul 2026 file");
});

test("no file on record before the first file month", () => {
  const data = { plan: { source: "mrf" }, vra: null, month: "2026-03",
    timeline: [{ month: "2026-07", rate: 91.08 }, { month: "2026-06", rate: 91.08 }, { month: null, rate: 5 }] };
  assert.equal(noFileLine(data), "No file on record for Mar 2026. Our first file for this plan is Jun 2026.");
  assert.equal(noFileLine({ ...data, month: "2026-08" }), null, "after the first file → not this message");
  assert.equal(noFileLine({ ...data, timeline: [] }), null);
  assert.equal(noFileLine({ ...data, plan: { source: "none" } }), null);
});

test("rate by file month: equal-rate runs and percent change", () => {
  // real UHC J0178
  const uhc = timelineRuns([{ month: "2026-06", rate: 763.9 }, { month: "2026-07", rate: 763.9 }, { month: "2026-08", rate: 731.89 }, { month: "2026-10", rate: 731.89 }]);
  assert.deepEqual(uhc.map((r) => [r.label, r.rate, r.change]), [["Jun–Jul 2026", 763.9, null], ["Aug–Oct 2026", 731.89, -4]]);
  // real HMO Blue 67028
  const hmo = timelineRuns([{ month: "2026-07", rate: 260.4 }, { month: "2026-05", rate: 289.33 }]);
  assert.deepEqual(hmo.map((r) => [r.label, r.rate, r.change]), [["May 2026", 289.33, null], ["Jul 2026", 260.4, -10]]);
  assert.equal(pctChange(-10), "−10%"); assert.equal(pctChange(4), "+4%"); assert.equal(pctChange(0), "0%");
  // one entry (or none dated) → hidden
  assert.deepEqual(timelineRuns([{ month: "2026-07", rate: 1 }]), []);
  assert.deepEqual(timelineRuns([{ month: null, rate: 1 }, { month: null, rate: 2 }]), []);
  // several prices in a month
  assert.deepEqual(timelineRuns([{ month: "2026-06", rate: null }, { month: "2026-07", rate: 50 }]).map((r) => r.change), [null, null]);
});

// Real Medicare J2777 answers (Oct 28 2026): Aug has a history cost, Jun has none.
const TODAY_J2777 = { code: "J2777", as_of: "2026-10-01", acq_cost: 1811.9, cost_basis: "per_vial", billed_units_per_vial: 60 };
const J2777 = (month, at) => ({ type: "drug", code: "J2777", units_per_dose: 60, dose_mult: 1, month, drug_cost: TODAY_J2777, drug_cost_at: at });

test("drug margin uses the cost in effect for the month", () => {
  const at = { acq_cost: 1873.06, billed_units_per_vial: 60, effective_from: "2026-07-20", effective_to: "2026-09-30", source: "MEDICATION COST INJECTABLE.xlsx 7/20/2026" };
  const m = drugMargin(J2777("2026-08", at), 32.381);
  assert.equal(m.historic, true);
  assert.equal(m.acqCost, 1873.06);
  assert.equal(m.period, "Jul 20 – Sep 30, 2026");
  assert.equal(Math.round(m.perDose * 100) / 100, 69.8); // (32.381 − 1873.06/60) × 60
  assert.equal(noCostLine(m), null);
  assert.equal(costPeriod("2026-12-15", "2027-01-31"), "Dec 15, 2026 – Jan 31, 2027");
  assert.equal(costPeriod("2026-07-20", null), "since Jul 20, 2026");
});

test("no cost recorded for the month → today's cost, with the note", () => {
  const m = drugMargin(J2777("2026-06", null), 31.322);
  assert.equal(m.historic, false);
  assert.equal(m.acqCost, 1811.9);
  assert.equal(Math.round(m.perDose * 100) / 100, Math.round((31.322 - 1811.9 / 60) * 60 * 100) / 100);
  assert.equal(noCostLine(m), "We have no recorded acquisition cost for Jun 2026. Today's price (as of Oct 1, 2026) is shown.");
  // an older answer without drug_cost_at: note only when today's cost is newer than the month
  const old = J2777("2026-10", undefined); delete old.drug_cost_at;
  assert.equal(drugMargin(old, 31.322).noCostFor, null);
  const oldAug = J2777("2026-08", undefined); delete oldAug.drug_cost_at;
  assert.equal(drugMargin(oldAug, 31.322).noCostFor, "2026-08");
});

test("dose-level code (dose_mult ≠ 1): drug_cost_at counts as 1 billed unit per vial, like the server's dose_adjusted cost", () => {
  // J0178-2MG: the rate is already per 2 mg dose; units_per_dose = 1
  const data = { type: "drug", code: "J0178-2MG", units_per_dose: 1, dose_mult: 2, month: "2026-08",
    drug_cost: { acq_cost: 1380.99, cost_basis: "per_vial", billed_units_per_vial: 1, dose_adjusted: true, as_of: "2026-10-01" },
    drug_cost_at: { acq_cost: 1422.08, billed_units_per_vial: 2, effective_from: "2026-07-20", effective_to: "2026-09-30" } };
  const m = drugMargin(data, 1487.22);
  assert.equal(m.acqPerUnit, 1422.08);
  assert.equal(Math.round(m.perDose * 100) / 100, 65.14);
  // and with no history it falls back to today's dose-adjusted cost
  const m2 = drugMargin({ ...data, drug_cost_at: null }, 1487.22);
  assert.equal(m2.acqPerUnit, 1380.99);
});

test("no margin without a VRA rate or a cost; procedures never", () => {
  assert.equal(drugMargin(J2777("2026-08", null), null), null);
  assert.equal(drugMargin({ ...J2777("2026-08", null), drug_cost: null }, 31), null);
  assert.equal(drugMargin({ type: "procedure" }, 100), null);
});

test("Medicare drug: a month before the stored quarter is said plainly (real Jun 2026 J2777 answer)", () => {
  const b = { med_period: { from: "2026-10-01", to: null, basis: "2026 MPFS / Oct 2026 ASP" } };
  const p = medicarePeriod(b, true, "2026-06");
  assert.equal(p.line, "Medicare ASP · from Oct 1, 2026");
  assert.equal(p.later, "No Medicare ASP for Jun 2026 is stored. This is the rate from Oct 1, 2026.");
  assert.equal(p.short, "ASP from Oct 1, 2026 · none stored for Jun 2026");
  const q3 = { med_period: { from: "2026-07-01", to: "2026-09-30" } };
  assert.equal(medicarePeriod(q3, true, "2026-08").later, undefined);
  assert.equal(medicarePeriod(b, false, "2026-06").later, undefined, "procedures keep the current-release wording");
});

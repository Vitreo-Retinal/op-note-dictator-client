// Unit tests for src/lib/rateText.js — Rates screen v2 wording (Oct 2026).
// Payloads mirror real hub_plan_rate answers. No network. Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { monthLabel, price, uniqPrices, otherPrices, hasSingleRate, patternLine, priceSets, eobLine, eobDates, sourceLine, SEVERAL_PRICES_LINE,
  dayLabel, monthOptions, monthRange, periodLabel, medicarePeriod, massHealthPeriod, fileLine, noFileLine, timelineRuns, pctChange,
  costPeriod, drugMargin, noCostLine, missingAsp, missingMedicare, noMedicareComparison, noMedicareMargin, noRvuLine, rvuRelease, latestReleaseMonth } from "../src/lib/rateText.js";
import { readFileSync } from "node:fs";

// Nov 2026: live reads (Medicare plan, 67028 and J0178 by month; hub_rvu_at; hub_medicare_releases).
const FX = JSON.parse(readFileSync(new URL("./fixtures/medicare-history-2026-11-08.json", import.meta.url), "utf8"));

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
  // Nov 2026: earlier 2026 releases are now stored, so the "not stored" sentence is gone. An
  // answer without a release name (pre-history shape) keeps "current release".
  assert.deepEqual(medicarePeriod(proc, false), {
    line: "Medicare 2026 fee schedule (Worcester) · current release (Oct 2026)",
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

test("Medicare drug month before the first stored ASP quarter: no number, plain sentence (real Jun 2026 J2777)", () => {
  const b = { med_nat: null, med_period: { missing: true, first_from: "2026-07-01" } };
  assert.equal(missingAsp(b, "2026-06"), "No Medicare ASP stored for Jun 2026. Our first stored quarter starts Jul 1, 2026.");
  assert.equal(medicarePeriod(b, true, "2026-06"), null, "no period line without a period");
  assert.equal(missingAsp({ med_period: { from: "2026-07-01", to: "2026-09-30" } }, "2026-08"), null);
  assert.equal(missingAsp({}, "2026-08"), null);
  // Medicare plan: vra.rate is null → no single rate and no margin
  assert.equal(hasSingleRate({ rate: null, pattern: "fee_schedule" }), false);
  assert.equal(drugMargin({ type: "drug", units_per_dose: 60, month: "2026-06", drug_cost: { acq_cost: 1811.9, billed_units_per_vial: 60 }, drug_cost_at: null }, null), null);
});

// ── Medicare price history by date of service (Nov 2026) — live reads ───────
const P = FX.hub_plan_rate_at_67028, D = FX.hub_plan_rate_at_J0178, R = FX.hub_rvu_at_67028;

test("procedures: the real release and its dates; no 'not stored' sentence (live 67028 answers)", () => {
  assert.deepEqual(medicarePeriod(P["2026-12"].benchmarks, false, "2026-12"), {
    line: "Medicare 2026 fee schedule (Worcester) · RVU26D · from Oct 1, 2026",
    short: "Worcester · RVU26D · from Oct 1, 2026",
  }, "December 2026 → RVU26D");
  assert.deepEqual(medicarePeriod(P["2026-03"].benchmarks, false, "2026-03"), {
    line: "Medicare 2026 fee schedule (Worcester) · RVU26A · Q1 2026 (Jan 1 – Mar 31)",
    short: "Worcester · RVU26A · Q1 2026 (Jan 1 – Mar 31)",
  }, "March 2026 → RVU26A");
  assert.equal(sourceLine({ source: "medicare", label: "Medicare fee schedule (Worcester)" }, P["2026-12"].vra, P["2026-12"]), "Medicare 2026 fee schedule (Worcester) · RVU26D · from Oct 1, 2026");
  for (const a of Object.values(P)) {
    const p = medicarePeriod(a.benchmarks, false, a.month);
    if (p) assert.ok(!/not stored\.|Earlier/.test(p.line + p.short), p.line);
  }
});

test("procedures: a published future release says 'starts Jan 1, 2027'; a later year than an open release is flagged", () => {
  // SYNTHETIC RVU27A answer (CMS has not posted CY2027): same shape as the live RVU26A answer.
  const staged = { med_period: { from: "2027-01-01", to: null, kind: "mpfs", basis: "2027 MPFS / Jan 2027 RVU27A", release: "RVU27A", is_future: true } };
  assert.deepEqual(medicarePeriod(staged, false, "2027-01"), {
    line: "Medicare 2027 fee schedule (Worcester) · RVU27A · published by CMS, starts Jan 1, 2027",
    short: "Worcester · RVU27A · published by CMS, starts Jan 1, 2027",
  });
  // Live since the Nov 8 2026 DB change: January 2027 is missing (after_stored), so no period line.
  assert.equal(medicarePeriod(P["2027-01"].benchmarks, false, "2027-01"), null);
  // Defense: an older-shape answer that carried the open RVU26D into 2027 still gets the note.
  const jan = medicarePeriod(P["2026-12"].benchmarks, false, "2027-01");
  assert.equal(jan.later, "No 2027 Medicare fee schedule is stored yet. This is the RVU26D rate from Oct 1, 2026.");
  assert.equal(medicarePeriod(P["2026-12"].benchmarks, false, "2026-12").later, undefined);
});

test("missing Medicare: procedure wording for procedures, ASP wording for drugs (live Dec 2025 answers)", () => {
  assert.equal(missingMedicare(P["2025-12"].benchmarks, "2025-12"), "No Medicare fee schedule stored for Dec 2025. Stored releases start Jan 1, 2026.");
  assert.equal(missingMedicare(D["2025-12"].benchmarks, "2025-12"), "No Medicare ASP stored for Dec 2025. Our first stored quarter starts Jan 1, 2026.");
  assert.equal(missingAsp, missingMedicare, "old name kept");
  assert.equal(medicarePeriod(P["2025-12"].benchmarks, false, "2025-12"), null, "no period, no number");
  assert.equal(noMedicareComparison(P["2025-12"].benchmarks, "2025-12"), "No Medicare fee schedule stored for Dec 2025, so there is no Medicare comparison.");
  assert.equal(noMedicareComparison(D["2025-12"].benchmarks, "2025-12"), "No Medicare ASP stored for Dec 2025, so there is no Medicare comparison.");
  assert.equal(noMedicareMargin(D["2025-12"].benchmarks, "2025-12"), "No Medicare ASP for Dec 2025, so no margin is shown.");
  assert.equal(noMedicareMargin(P["2025-12"].benchmarks, "2025-12"), "No Medicare fee schedule for Dec 2025, so no margin is shown.");
  assert.equal(missingMedicare({ med_period: { missing: true, kind: "mpfs", release: "RVU26D", from: "2026-10-01", to: null } }, "2026-12"), "No Medicare fee schedule rate stored for this code in RVU26D.");
  for (const m of ["2026-03", "2026-12"]) {
    assert.equal(missingMedicare(P[m].benchmarks, m), null);
    assert.equal(noMedicareComparison(D[m].benchmarks, m), null);
  }
});

test("drugs: quarter by date of service; a month after an open quarter is flagged (live J0178 answers)", () => {
  assert.deepEqual(medicarePeriod(D["2026-03"].benchmarks, true, "2026-03"), { line: "Medicare ASP · Q1 2026 (Jan 1 – Mar 31)", short: "ASP · Q1 2026 (Jan 1 – Mar 31)" });
  assert.deepEqual(medicarePeriod(D["2026-12"].benchmarks, true, "2026-12"), { line: "Medicare ASP · from Oct 1, 2026", short: "ASP · from Oct 1, 2026" });
  assert.equal(medicarePeriod(D["2027-01"].benchmarks, true, "2027-01"), null, "live: January 2027 is missing (after_stored)");
  const jan = medicarePeriod(D["2026-12"].benchmarks, true, "2027-01"); // defense: an older-shape answer that carried the open Oct quarter forward
  assert.equal(jan.later, "No Medicare ASP for Jan 2027 is stored yet. This is the rate from Oct 1, 2026.");
  assert.equal(jan.short, "ASP from Oct 1, 2026 · none stored yet for Jan 2027");
});

test("RVU breakdown heading: the release in effect for the month (live hub_rvu_at)", () => {
  assert.deepEqual(rvuRelease(R["2026-12"], "2026-12"), { label: "RVU26D · from Oct 1, 2026", note: null });
  assert.deepEqual(rvuRelease(R["2026-03"], "2026-03"), { label: "RVU26A · Q1 2026 (Jan 1 – Mar 31)", note: null });
  assert.equal(R["2027-01"], null, "live since the Nov 8 2026 DB change: no row for a month after the last stored release");
  assert.deepEqual(rvuRelease(R["2027-01"], "2027-01"), { label: "", note: null }, "no row → no breakdown, no crash");
  // Defense: an older-shape answer that carried the open RVU26D into 2027 still gets the note.
  assert.deepEqual(rvuRelease(R["2026-12"], "2027-01"), { label: "RVU26D · from Oct 1, 2026", note: "No 2027 Medicare fee schedule is stored yet." });
  assert.equal(R["2025-12"], null, "before the first release the DB returns null → no RVU box");
  assert.deepEqual(rvuRelease(null, "2025-12"), { label: "", note: null });
  assert.deepEqual(rvuRelease({ ...R["2026-03"], release: "RVU27A", valid_from: "2027-01-01", valid_to: null, is_future: true }, "2027-01"),
    { label: "RVU27A · published by CMS, starts Jan 1, 2027", note: null }, "SYNTHETIC staged RVU27A");
  const { release, valid_from, valid_to, ...preHistory } = FX.hub_rvu_67028; // an answer from before the release keys existed
  assert.deepEqual(rvuRelease(preHistory, "2026-12"), { label: "2026 MPFS", note: null });
});

test("month picker reaches the latest stored release's start month (January 2027 in December)", () => {
  assert.equal(latestReleaseMonth(FX.hub_medicare_releases), "2026-10");
  assert.equal(latestReleaseMonth([]), null);
  assert.equal(latestReleaseMonth(null), null);
  const dec = new Date(2026, 11, 3);
  assert.deepEqual(monthOptions(dec, "2026-01", latestReleaseMonth(FX.hub_medicare_releases)), monthOptions(dec), "nothing staged → ends at this month");
  // SYNTHETIC staged RVU27A row (status 'staged', the way hub_medicare_releases reports it before Jan 1).
  const staged = [...FX.hub_medicare_releases, { kind: "mpfs", label: "RVU27A", valid_from: "2027-01-01", valid_to: null, status: "staged", codes: 96 }];
  const opts = monthOptions(dec, "2026-01", latestReleaseMonth(staged));
  assert.deepEqual(opts[0], { val: "2027-01", label: "Jan 2027" });
  assert.deepEqual(opts[1], { val: "2026-12", label: "Dec 2026" });
  assert.equal(opts.length, 13);
  assert.equal(monthOptions(new Date(2027, 1, 3), "2026-01", "2027-01")[0].val, "2027-02", "never shorter than this month");
  assert.equal(monthOptions(dec, "2026-01", "bad")[0].val, "2026-12");
});

test("no payment-comparison wording added to the Rates helpers", () => {
  const src = readFileSync(new URL("../src/lib/rateText.js", import.meta.url), "utf8");
  assert.ok(!/pays more/i.test(src));
});

test("after the last stored release (Nov 8 2026 DB change): 'is stored yet', never 'Stored releases start' (live Jan 2027 answers)", () => {
  const pb = P["2027-01"].benchmarks, db = D["2027-01"].benchmarks;
  assert.deepEqual(pb.med_period, { kind: "mpfs", missing: true, first_from: "2026-01-01", after_stored: true });
  assert.equal(P["2027-01"].vra.rate, null); assert.equal(pb.med_nat, null); assert.equal(pb.mworc, null);
  assert.equal(missingMedicare(pb, "2027-01"), "No Medicare fee schedule is stored yet for Jan 2027.");
  assert.equal(missingMedicare(db, "2027-01"), "No Medicare ASP is stored yet for Jan 2027.");
  assert.equal(missingAsp(db, "2027-01"), "No Medicare ASP is stored yet for Jan 2027.");
  assert.equal(noMedicareComparison(pb, "2027-01"), "No Medicare fee schedule is stored yet for Jan 2027, so there is no Medicare comparison.");
  assert.equal(noMedicareComparison(db, "2027-01"), "No Medicare ASP is stored yet for Jan 2027, so there is no Medicare comparison.");
  assert.equal(noMedicareMargin(db, "2027-01"), "No Medicare ASP is stored yet for Jan 2027, so no margin is shown.");
  for (const t of [missingMedicare(pb, "2027-01"), missingMedicare(db, "2027-01")]) assert.ok(!/Stored releases start|first stored quarter/.test(t), t);
  // Before the first stored release (after_stored: false) keeps the "start" wording.
  assert.equal(missingMedicare(P["2025-12"].benchmarks, "2025-12"), "No Medicare fee schedule stored for Dec 2025. Stored releases start Jan 1, 2026.");
  assert.equal(missingMedicare(D["2025-12"].benchmarks, "2025-12"), "No Medicare ASP stored for Dec 2025. Our first stored quarter starts Jan 1, 2026.");
});

test("RVU box when hub_rvu_at has no row: a clean 'not stored' line for procedures, nothing for drugs or covered months", () => {
  assert.equal(noRvuLine(P["2027-01"].benchmarks, "2027-01"), "No Medicare fee schedule is stored yet for Jan 2027, so there is no RVU breakdown.");
  assert.equal(noRvuLine(P["2025-12"].benchmarks, "2025-12"), "No Medicare fee schedule stored for Dec 2025, so there is no RVU breakdown.");
  assert.equal(noRvuLine(D["2027-01"].benchmarks, "2027-01"), null, "drugs have no RVU box");
  assert.equal(noRvuLine(P["2026-12"].benchmarks, "2026-12"), null, "a covered month shows the breakdown instead");
  assert.equal(noRvuLine({}, "2027-01"), null);
  assert.equal(noRvuLine(null, "2027-01"), null);
});

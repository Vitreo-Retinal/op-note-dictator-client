// Unit tests for src/lib/rateText.js — Rates screen v2 wording (Oct 2026).
// Payloads mirror real hub_plan_rate answers. No network. Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { monthLabel, price, uniqPrices, otherPrices, hasSingleRate, patternLine, priceSets, eobLine, sourceLine, SEVERAL_PRICES_LINE } from "../src/lib/rateText.js";

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

test("EOB line is labeled as a payment, not a rate", () => {
  assert.equal(eobLine({ rate: 123.49, source_month: "2026-06" }), "Paid on your EOB (Jun 2026): $123.49 — what was paid, not a published rate.");
});

test("sourceLine: label · month; Medicare / MassHealth label only; month_note wins", () => {
  const vra = { source_month: "2026-10" };
  assert.equal(sourceLine({ source: "mrf", label: "Harvard Pilgrim HMO published rate file" }, vra), "Harvard Pilgrim HMO published rate file · Oct 2026");
  assert.equal(sourceLine({ source: "mrf", label: "X file", month_note: "Jul–Oct 2026 files" }, vra), "X file · Jul–Oct 2026 files");
  assert.equal(sourceLine({ source: "medicare", label: "Medicare fee schedule (Worcester)" }, vra), "Medicare fee schedule (Worcester)");
  assert.equal(sourceLine({ source: "masshealth", label: "MassHealth fee schedule" }, vra), "MassHealth fee schedule");
});

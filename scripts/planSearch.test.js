// Unit tests for src/lib/planSearch.js — the Rates screen's insurance search, a
// port of the Retina-Rx insurance search (Oct 2026). No network, no patient data.
// Run with `npm test`.
//
// The drift test reads Retina-Rx public/index.html when that repo is on this
// machine (RETINA_RX_DIR env, or a retina-rx folder next to this repo) and is
// skipped otherwise — same pattern as the server's client-parity test.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { norm, SYNONYM_GROUPS, expandQueries, smartSearch, searchPlans } from "../src/lib/planSearch.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const retinaRxHtml = [
  process.env.RETINA_RX_DIR && path.join(process.env.RETINA_RX_DIR, "public", "index.html"),
  path.join(here, "..", "..", "retina-rx", "public", "index.html"),
].filter(Boolean).find((p) => fs.existsSync(p));

// A slice of the real hub_rate_plans list (names + aliases only, Oct 2026).
const PLANS = [
  { plan_key: "extra:hphc-focus", name: "Harvard Pilgrim Focus Network (HMO)", aliases: ["hp focus", "harvard pilgrim focus", "hphc focus", "focus network", "focus network ma hmo"] },
  { plan_key: "plan:240", name: "Harvard Pilgrim HMO", aliases: ["Harvard Pilgrim Flex HMO", "Harvard Pilgrim Focus", "Harvard Pilgrim Focus Network HMO", "HP HMO"] },
  { plan_key: "plan:242", name: "Harvard Pilgrim PPO", aliases: ["HP PPO", "HP National Access"] },
  { plan_key: "plan:578", name: "BCBS of MA PPO", aliases: ["BCBS MA PPO", "Blue Care Elect", "Preferred Blue PPO"] },
  { plan_key: "plan:8", name: "BCBS Out-of-State (BlueCard) PPO", aliases: ["BlueCard PPO", "BCBS PPO", "Blue Cross PPO", "Blue Cross Blue Shield PPO"] },
  { plan_key: "plan:579", name: "BCBS HMO of MA", aliases: ["BCBS MA HMO", "HMO Blue"] },
  { plan_key: "plan:482", name: "UHC Choice Plus", aliases: ["UHC", "United Healthcare", "United Health Care", "UnitedHealthcare Choice Plus"] },
  { plan_key: "plan:481", name: "UHC All Savers", aliases: ["UHC", "United Healthcare", "UnitedHealthcare All Savers"] },
  { plan_key: "plan:300", name: "Mass Health Standard", aliases: ["MassHealth", "Mass Health"] },
  { plan_key: "plan:299", name: "Mass Health PCC Plan", aliases: [] },
  { plan_key: "plan:35", name: "Aetna Choice POS II", aliases: [] },
  { plan_key: "plan:307", name: "Medicare", aliases: [] },
  { plan_key: "plan:571", name: "Tufts MC Preferred HMO", aliases: ["Tufts Medicare Preferred Medical Plan"] },
];
const keys = (list) => list.map((p) => p.plan_key);

// ── Drift against Retina-Rx ──────────────────────────────────────────────────

test("SYNONYM_GROUPS and norm match Retina-Rx (skipped when the Retina-Rx repo is not present)", { skip: !retinaRxHtml && "retina-rx repo not found" }, () => {
  const html = fs.readFileSync(retinaRxHtml, "utf8");
  const syn = html.match(/const SYNONYM_GROUPS = (\[[\s\S]*?\n\s*\]);/);
  assert.ok(syn, "SYNONYM_GROUPS not found in Retina-Rx index.html");
  // The array is a plain literal of string arrays — read it as data.
  const theirs = JSON.parse(syn[1].replace(/'/g, '"'));
  assert.deepEqual(SYNONYM_GROUPS, theirs);

  const nb = html.match(/function norm\(s\)\s*\{([\s\S]*?)\}\s*\n/);
  assert.ok(nb, "norm() not found in Retina-Rx index.html");
  const ours = norm.toString().match(/\{([\s\S]*)\}$/)[1];
  const squash = (s) => s.replace(/\s+/g, "");
  assert.equal(squash(ours), squash(nb[1]));
});

// ── Port behaviour ───────────────────────────────────────────────────────────

test("norm strips dashes, dots, slashes, commas and extra spaces", () => {
  assert.equal(norm("  BCBS  Out-of-State (BlueCard)  PPO "), "bcbs out of state (bluecard) ppo");
  assert.equal(norm("H.P./Focus, Network"), "h p focus network");
});

test("expandQueries swaps synonyms on word boundaries only", () => {
  assert.ok(expandQueries("uhc choice").includes("united healthcare choice"));
  assert.ok(expandQueries("mass health").includes("masshealth"));
  // "hp" inside "hphc" is not a separate word → only the hphc group fires
  const v = expandQueries("hphc focus");
  assert.ok(v.includes("harvard pilgrim focus"));
  assert.ok(!v.includes("harvard pilgrimhc focus"));
});

test("smartSearch: exact matches win, as in Retina-Rx", () => {
  // "BCBS PPO" is literally an alias of the out-of-state BlueCard PPO
  assert.deepEqual(keys(smartSearch("bcbs ppo", PLANS)), ["plan:8"]);
  // no exact → starts-with, then contains (≥3 chars)
  assert.deepEqual(keys(smartSearch("aetna", PLANS)), ["plan:35"]);
  assert.deepEqual(keys(smartSearch("choice pos", PLANS)), ["plan:35"]);
});

// ── What Mari types in the Rates combo ───────────────────────────────────────

test('"harvard pilgrim focus" finds the Focus entry', () => {
  const r = keys(searchPlans("harvard pilgrim focus", PLANS));
  assert.equal(r[0], "extra:hphc-focus");
  assert.ok(r.includes("plan:240"), "Harvard Pilgrim HMO carries the Focus alias too");
  assert.ok(keys(searchPlans("hp focus", PLANS)).includes("extra:hphc-focus"));
});

test('"bcbs ppo" finds "BCBS of MA PPO"', () => {
  const r = keys(searchPlans("bcbs ppo", PLANS));
  assert.ok(r.includes("plan:578"), JSON.stringify(r));
  assert.equal(r[0], "plan:8", "the exact alias match still comes first");
  assert.ok(!r.includes("plan:579"), "HMO is not a PPO");
  assert.ok(keys(searchPlans("blue cross ppo", PLANS)).includes("plan:578"));
});

test('"united healthcare" finds the UHC plans', () => {
  const r = keys(searchPlans("united healthcare", PLANS));
  assert.ok(r.includes("plan:482") && r.includes("plan:481"));
  assert.ok(keys(searchPlans("uhc", PLANS)).includes("plan:482"));
});

test('"mass health" finds MassHealth', () => {
  const r = keys(searchPlans("mass health", PLANS));
  assert.equal(r[0], "plan:300");
  assert.ok(r.includes("plan:299"), "the PCC plan is listed too");
  assert.ok(keys(searchPlans("masshealth", PLANS)).includes("plan:300"));
});

test("empty query lists every plan; nonsense lists none", () => {
  assert.equal(searchPlans("", PLANS).length, PLANS.length);
  assert.equal(searchPlans("   ", PLANS).length, PLANS.length);
  assert.deepEqual(searchPlans("zzzz", PLANS), []);
  assert.deepEqual(searchPlans("uhc", null), []);
});

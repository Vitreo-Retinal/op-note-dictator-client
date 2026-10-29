// Clinical advisor strip — IRD card (Oct 29 2026, Mari). src/lib/advisor.js
import test from "node:test";
import assert from "node:assert";
import { buildIrdCard, advisorCards, insertPlanLine, noteAge, IRD_RX } from "../src/lib/advisor.js";

const ids = (card) => card.sections.flatMap((s) => s.lines.map((l) => l.id));
const allText = (card) => card.sections.flatMap((s) => s.lines.map((l) => l.text)).join("\n");

test("no IRD in the note → no card", () => {
  assert.strictEqual(buildIrdCard("78F\n1. Wet AMD OD\nPlan\nEylea OD today", []), null);
  assert.deepStrictEqual(advisorCards("PRP OS for PDR; RPE atrophy", []), []);
});

test("RP note → card with both labs, no recommendation, vitamin A line", () => {
  const c = buildIrdCard("45F\n1. Retinitis pigmentosa OU\nPlan\nF/u 1 year", [{ code: "H35.52", description: "Pigmentary retinal dystrophy" }]);
  assert.ok(c);
  assert.match(c.why, /Retinitis pigmentosa \(H35\.52\)/);
  assert.ok(ids(c).includes("ird-vita"));
  assert.ok(!ids(c).includes("ird-stgd-vita"));
  assert.doesNotMatch(JSON.stringify(c), /Suggested|recommend(ed)? lab/i);
  assert.strictEqual(c.sections[0].open, true);
  assert.strictEqual(c.sections[1].open, false);
  assert.strictEqual(c.sections[2].open, false);
});

test("Stargardt → no vitamin A palmitate line; avoid-vitamin-A line instead", () => {
  const c = buildIrdCard("24M\n1. Stargardt disease OU (ABCA4)\nPlan\nUV lenses", []);
  assert.ok(!ids(c).includes("ird-vita"));
  assert.ok(ids(c).includes("ird-stgd-vita"));
  assert.doesNotMatch(allText(c), /15,000 IU/);
});

test("child with RP → no vitamin A palmitate line", () => {
  assert.strictEqual(noteAge("12M\n1. RP OU"), 12);
  assert.ok(!ids(buildIrdCard("12M\n1. RP OU", [])).includes("ird-vita"));
});

test("cone-rod dystrophy → no vitamin A palmitate line (typical RP only)", () => {
  assert.ok(!ids(buildIrdCard("50F\n1. Cone-rod dystrophy OU", [])).includes("ird-vita"));
});

test("no visual field line anywhere; ERG lines are referrals", () => {
  const t = allText(buildIrdCard("45F\n1. Retinitis pigmentosa OU", []));
  assert.doesNotMatch(t, /visual field|HVF|Goldmann|kinetic/i);
  assert.match(t, /Referral to MCPHS Eye and Vision Center Electrodiagnostic Service \(Worcester\) for full-field ERG/);
  assert.match(t, /Referral to Mass Eye and Ear Inherited Retinal Disorders clinic \(617-573-3621\) for full-field ERG/);
});

test("no trials or AI box in this version", () => {
  const c = buildIrdCard("45F\n1. Retinitis pigmentosa OU", []);
  assert.deepStrictEqual(c.sections.map((s) => s.id), ["gt", "counseling", "monitoring"]);
});

test("trigger matches the IRD pamphlet rule", () => {
  for (const s of ["retinitis pigmentosa ou", "rp ou, stable", "stargardt disease", "usher syndrome type 2", "cone-rod dystrophy", "h35.52 hereditary retinal dystrophy", "choroideremia", "x-linked retinoschisis"]) assert.ok(IRD_RX.test(s), s);
  for (const s of ["prp os for pdr", "rpe atrophy, dry amd", "wet amd od, eylea", "best corrected vision 20/40"]) assert.ok(!IRD_RX.test(s), s);
});

// ── Plan insertion ───────────────────────────────────────────────────────────
test("line goes at the end of the Plan, before the MDM sentence", () => {
  const note = "45F\n1. RP OU\n\nPlan\nF/u 1 year with OCT and FAF\n[+] Moderate complexity medical decision-making: chronic illness.";
  const r = insertPlanLine(note, "Monitor for cystoid macular edema and cataract; treat if they develop.");
  assert.strictEqual(r.text, "45F\n1. RP OU\n\nPlan\nF/u 1 year with OCT and FAF\nMonitor for cystoid macular edema and cataract; treat if they develop.\n[+] Moderate complexity medical decision-making: chronic illness.");
});

test("dash style follows the Plan", () => {
  const r = insertPlanLine("1. RP OU\nPlan:\n- Follow up in 1 year with OCT and FAF.", "Smoking avoidance advised.");
  assert.strictEqual(r.text, "1. RP OU\nPlan:\n- Follow up in 1 year with OCT and FAF.\n- Smoking avoidance advised.");
});

test("no Plan heading → one is added", () => {
  assert.strictEqual(insertPlanLine("1. RP OU\nStable", "X line.").text, "1. RP OU\nStable\n\nPlan\nX line.");
});

test("coverage block stays at the end; the line goes above it", () => {
  const fence = "=".repeat(20);
  const note = `1. RP OU\nPlan\nF/u 1 year\n\n${fence}\nCOVERAGE REFERENCE — Medicare\n${fence}`;
  const r = insertPlanLine(note, "New line.");
  assert.ok(r.text.startsWith("1. RP OU\nPlan\nF/u 1 year\nNew line.\n"));
  assert.ok(r.text.endsWith(`COVERAGE REFERENCE — Medicare\n${fence}`));
});

test("a line already in the note is not added twice", () => {
  const r = insertPlanLine("Plan\nSmoking avoidance advised.", "Smoking avoidance advised.");
  assert.strictEqual(r.added, false);
});

// Unit tests for src/lib/coverageCard.js + the coverage part of copyableNoteText
// (Oct 20 2026, owner decisions A–C). Fixtures: scripts/fixtures/coverage-cases.json —
// note text + data.coverage cards built by the server's own coverage builders
// (server routes/notes.js coverageRender + lib/ascii-safe.js), "before" = the
// pre-change server text (emoji, "─" ruler, em dashes), "after" = today's server text.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { copyableNoteText, parseResponse } from "../src/lib/noteHelpers.js";
import { coverageTier, reqTagClass, requirementTags, keyRequirement, jCodeText, cardSteps, paLabel, stepDrugText, stepHeader, isTodayDrug, stepPossibleNote, nextOptionGroups, asciiFold, COVERAGE_FENCE_RX, COVERAGE_TIERS, stripLeadingSymbols, avastinOnlyNoteText, mergedPlanSub } from "../src/lib/coverageCard.js";

const CASES = JSON.parse(readFileSync(new URL("./fixtures/coverage-cases.json", import.meta.url), "utf8"));
const ASCII_ONLY = /^[\x09\x0A\x0D\x20-\x7E]*$/;
const blocksOf = (text) => [...String(text).matchAll(new RegExp(COVERAGE_FENCE_RX.source, "g"))].map((m) => m[0]);
const legacyCopy = (n) => n.replace(/\[\+\]\s*/g, "").replace(/\*\*/g, "");

for (const [name, c] of Object.entries(CASES)) {
  test(`copied coverage block is pure ASCII (${name}) — today's server text and an older server's emoji text`, () => {
    for (const which of ["after", "before"]) {
      const note = parseResponse(c[which]).note;
      const copied = copyableNoteText(note);
      const blocks = blocksOf(copied);
      assert.equal(blocks.length, 1, `${which}: one fenced block`);
      for (const b of blocks) assert.match(b, ASCII_ONLY, `${which}\n${b}`);
      assert.match(blocks[0], /COVERAGE REFERENCE - /);
      // Everything outside the coverage block is exactly the old copy text.
      const outside = (t) => t.replace(new RegExp(COVERAGE_FENCE_RX.source, "g"), "<COV>");
      assert.equal(outside(copied), outside(legacyCopy(note)), `${which}: rest of the note unchanged`);
    }
  });
}

test("today's server text is already ASCII: the client fold is a no-op on it", () => {
  for (const c of Object.values(CASES)) {
    const note = parseResponse(c.after).note;
    assert.equal(copyableNoteText(note), legacyCopy(note));
  }
});

test("copy fold never touches non-ASCII outside the coverage block", () => {
  const note = "1. Wet AMD OS — active\nPt says “better” → OK\n\n=======================================\nCOVERAGE REFERENCE - Eylea 2mg / Medicare\nStatus: APPROVED - OK to inject today\nNotes: ≥ 2 doses — “ok”\n=======================================";
  const out = copyableNoteText(note);
  assert.ok(out.startsWith("1. Wet AMD OS — active\nPt says “better” → OK\n"));
  assert.match(out, /Notes: >= 2 doses - "ok"\n/);
});

test("requirement tags: 'No PA required' is no-PA (green), never 'Prior auth' (owner decision C)", () => {
  for (const r of ["No PA required", "No PA needed", "No prior authorization required", "No prior auth", "PA not required", "Prior auth not required", "no pa required",
    // Oct 21 2026: the shared rule (same as Retina-Rx and the hub server) + the real DB wordings
    "No PA", "PA is not needed", "No PA required — Medigap plan", "No PA typically required for Avastin", "No PA required for Avastin",
    "Covered under Medicare Part B — no PA required"])
    assert.equal(reqTagClass(r), "pa-no", r);
  for (const r of ["PA required", "PA required (per eye)", "Prior authorization required", "Precert required", "Step therapy",
    "Prior auth required", "PA required for all drugs", "PA required for Eylea HD", "PA may be required", "Prior Authorization"])
    assert.equal(reqTagClass(r), "pa-yes", r);
  assert.equal(reqTagClass("PCP referral required"), "ref-yes");
  assert.equal(reqTagClass("Referral required"), "ref-yes");
  assert.equal(reqTagClass("No referral needed"), "ref-no");
  assert.equal(reqTagClass("Referral not required"), "ref-no");
  assert.equal(reqTagClass("Not covered"), "oon");
  assert.equal(reqTagClass("VRA out of network"), "oon");
  assert.equal(reqTagClass("Rules vary by plan — see notes"), "info");
  assert.equal(reqTagClass("Verify coverage - newer agent"), "info");
});

test("requirement tags on the card: step entries move to the pathway; red card gets a 'Not covered' tag; nothing invented", () => {
  const yellow = CASES["commercial-pa-yellow"].cards[0];
  assert.deepEqual(requirementTags(yellow, true).map((t) => [t.text, t.cls]), [["PA required", "pa-yes"]]);
  assert.deepEqual(requirementTags(yellow, false).map((t) => t.cls), ["pa-yes", "pa-yes", "info", "info"]);
  assert.deepEqual(requirementTags({ kind: "rule", status: "red", requirements: [] }, false), [{ text: "Not covered", cls: "oon" }]);
  assert.deepEqual(requirementTags({ kind: "rule", status: "green", requirements: [] }, false), []);
  assert.equal(keyRequirement(requirementTags(CASES["medicare-green"].cards[0], false)).text, "No PA required");
  assert.equal(keyRequirement([]), null);
});

test("tier → label mapping (Retina-Rx), incl. orange as its own tier", () => {
  const t = (card) => { const x = coverageTier(card); return [x.key, x.tone, x.label, x.headline, x.icon]; };
  assert.deepEqual(t({ kind: "rule", status: "green" }), ["green", "green", "Approved", "OK to inject today", "check"]);
  assert.deepEqual(t({ kind: "rule", status: "yellow" }), ["yellow", "amber", "Verify First", "Check PA status before proceeding", "alert"]);
  assert.deepEqual(t({ kind: "rule", status: "orange" }), ["orange", "orange", "Partial Coverage", "Partial coverage — patient has out-of-pocket cost", "alert"]);
  assert.deepEqual(t({ kind: "rule", status: "red" }), ["red", "red", "Not Covered", "Do not inject — not covered", "ban"]);
  assert.deepEqual(t({ kind: "rule", status: "unknown" }), ["nodata", "amber", "No Data", "No rule on file", "alert"]);
  assert.deepEqual(t({ kind: "norule" }), ["nodata", "amber", "No Data", "No rule on file", "alert"]);
  assert.deepEqual(t({ kind: "ambiguous" }).slice(0, 4), ["nodata", "amber", "No Data", "Plan not identified"]);
  assert.equal(coverageTier({ kind: "invalid" }).key, "red");
  assert.equal(coverageTier({ kind: "biosimilar" }).key, "nodata");
  assert.notEqual(COVERAGE_TIERS.orange.tone, "amber");
  assert.deepEqual(coverageTier({ kind: "rule", status: "orange" }).phone, ["Partial coverage", "patient has out-of-pocket cost"]);
});

test("step pathway comes from the server with each drug's real PA status (Avastin no PA vs PA)", () => {
  const ok = cardSteps(CASES["commercial-pa-yellow"].cards[0]);
  assert.deepEqual(ok.steps.map((st) => [st.n, st.pa, st.drugs.map((d) => [stepDrugText(d), paLabel(d.pa, d.name)])]), [
    [1, "none", [["Avastin (3/eye)", "No PA needed"]]],
    [2, "required", [["Eylea 2mg (1/eye)", "PA required"]]],   // only drugs the rule names (no invented Lucentis)
    [3, "required", [["Vabysmo", "PA required"]]],
  ]);
  const pa = cardSteps(CASES["avastin-pa-yellow"].cards[0]);
  assert.deepEqual(pa.steps.map((st) => [st.pa, st.drugs.map((d) => paLabel(d.pa, d.name))]),
    [["required", ["PA required"]], ["mixed", ["PA required", "No PA needed"]], ["mixed", ["Check rule", "PA required"]]]);
  assert.equal(paLabel("unknown", "Avastin"), "Check Avastin rule");   // never guessed
  assert.equal(paLabel("unknown", "Lucentis"), "Check rule");
  assert.equal(paLabel(undefined, "Eylea 2mg"), "Check rule");
  assert.equal(cardSteps(CASES["medicare-green"].cards[0]), null);
  assert.equal(cardSteps({ kind: "rule", steps: { steps: [] } }), null);
});

test("copied step line: one ASCII line with every drug's PA status; no Notes line in any copied block", () => {
  const line = (k) => (copyableNoteText(parseResponse(CASES[k].after).note).match(/^Step therapy: .*$/m) || [""])[0];
  assert.equal(line("commercial-pa-yellow"), "Step therapy: 1) Avastin x3/eye (no PA) > 2) Eylea 2mg x1/eye (PA) > 3) Vabysmo [today] (PA)");
  assert.equal(line("avastin-pa-yellow"), "Step therapy: 1) Avastin x3/eye (PA) > 2) Eylea 2mg: PA; Lucentis: no PA > 3) Eylea HD: check; Vabysmo [today]: PA");
  for (const [k, c] of Object.entries(CASES)) {
    const copied = copyableNoteText(parseResponse(c.after).note);
    assert.doesNotMatch(copied, /^Notes:/m, k);
    assert.doesNotMatch(copied, /Availity|fax 1-888/i, k);
  }
});

test("copied block format (Mari, Oct 20 2026, 2:11 PM): header + ONE coverage line (+ step line), nothing else", () => {
  const want = {
    "medicare-green": ["COVERAGE REFERENCE - Eylea 2mg / Medicare", "No PA required"],
    "commercial-pa-yellow": ["COVERAGE REFERENCE - Vabysmo / BCBS MA PPO", "PA required",
      "Step therapy: 1) Avastin x3/eye (no PA) > 2) Eylea 2mg x1/eye (PA) > 3) Vabysmo [today] (PA)",
      "Next options: Lucentis: PA; Eylea HD, Beovu, Pavblu, Byooviz, Cimerli: check"],
    "dual-medigap": ["COVERAGE REFERENCE - Eylea 2mg / Medicare", "No PA required"],
    "unknown-plan": ["COVERAGE REFERENCE - Eylea 2mg / \"united healthcare\"", "Plan not identified - check"],
    "masshealth-red": ["COVERAGE REFERENCE - Eylea 8mg (HD) / MassHealth Standard", "Not covered"],
    "avastin-pa-yellow": ["COVERAGE REFERENCE - Vabysmo / Example Commercial PPO", "PA required",
      "Step therapy: 1) Avastin x3/eye (PA) > 2) Eylea 2mg: PA; Lucentis: no PA > 3) Eylea HD: check; Vabysmo [today]: PA",
      "Next options: Beovu (check), Pavblu (check), Byooviz (check), Cimerli (check)"],
    "fallon-next-options": ["COVERAGE REFERENCE - Avastin / Fallon Navicare", "No PA required",
      "Next options: Eylea 2mg, Eylea HD, Lucentis, Vabysmo, Beovu: not covered; Pavblu, Byooviz, Cimerli: check"],
    "loose-step-possible": ["COVERAGE REFERENCE - Vabysmo / Oscar Health Plan", "PA required", "Step therapy possible - check plan"],
    "dual-masshealth-aco": ["COVERAGE REFERENCE - Avastin / Humana Medicare PPO", "No PA required"],
  };
  for (const [k, lines] of Object.entries(want)) {
    const block = blocksOf(copyableNoteText(parseResponse(CASES[k].after).note))[0];
    const R = "=======================================";
    assert.equal(block.trim(), [R, ...lines, R].join("\n"), k);
    assert.match(block, ASCII_ONLY, k);
  }
});

test("screen card shows no rule notes (source guard)", () => {
  const card = readFileSync(new URL("../src/CoverageCard.jsx", import.meta.url), "utf8");
  assert.ok(!/c\.notes/.test(card), "the card must not render c.notes");
  assert.match(card, /cardSteps\(c\)/);
  assert.match(card, /paLabel\(d\.pa, d\.name\)/);
});

test("J-code box text and leading-emoji strip", () => {
  assert.equal(jCodeText({ drug: "Eylea 2mg", jCode: "J0178" }), "J0178 · 2 mg per eye");
  assert.equal(jCodeText({ drug: "Vabysmo", jCode: "J2777" }), "J2777");
  assert.equal(jCodeText({ drug: "Eylea 2mg" }), "");
  assert.equal(stripLeadingSymbols("⚠️ PRACTICE RULE: x"), "PRACTICE RULE: x");
  assert.equal(stripLeadingSymbols("💰 Patient owes $0"), "Patient owes $0");
  assert.equal(stripLeadingSymbols("NO BILATERAL"), "NO BILATERAL");
});

test("asciiFold (client twin of server lib/ascii-safe.js)", () => {
  assert.equal(asciiFold("───\n📋 COVERAGE REFERENCE — Eylea / Medicare\nStatus: ✅ GREEN\n⚡ Billing Alert: ⚠️ x → y ≥ 2 “q” …"),
    "===\nCOVERAGE REFERENCE - Eylea / Medicare\nStatus: GREEN\nBilling Alert: x -> y >= 2 \"q\" ...");
  assert.equal(asciiFold("ℹ️ info • a · b"), "info - a - b");
  assert.equal(asciiFold("a --- b"), "a -- b");
  assert.match(asciiFold("Pérez ½ ° ™ 🙂"), ASCII_ONLY);
});

test("source guard: the fence regex in ClinicNoteGenerator is the shared one, and the old reqTag is gone", () => {
  const src = readFileSync(new URL("../src/ClinicNoteGenerator.jsx", import.meta.url), "utf8");
  assert.match(src, /new RegExp\(COVERAGE_FENCE_RX\.source, "g"\)/);
  assert.ok(!/const reqTag = /.test(src), "old reqTag removed");
  assert.ok(!/\\bPA required\\b\/i\.test\(r\) \? "Prior auth"/.test(src));
  assert.match(src, /<CoverageCards cards=\{result\.coverage\}/);
});

// Oct 21 2026, 2:55 PM (Mari): the card draws the plan's WHOLE tree; today's drug is marked wherever it sits.
// Server shape (lib/step-pathway.js) for Harvard Pilgrim Choice Net HMO + Eylea 2mg.
const HPHC_EYLEA = { thisStep: 2, priorSteps: "Step 1", todayAppended: false, steps: [
  { n: 1, active: false, pa: "none", drugs: [{ name: "Avastin", perEye: "3", pa: "none" }] },
  { n: 2, active: true, pa: "mixed", drugs: ["Eylea 2mg", "Pavblu", "Lucentis", "Byooviz", "Cimerli", "Beovu"].map((name) => ({ name, perEye: "",
    pa: /Pavblu|Byooviz|Cimerli/.test(name) ? "unknown" : "required", ...(name === "Eylea 2mg" ? { today: true } : {}) })) },
  { n: 3, active: false, pa: "required", drugs: [{ name: "Eylea HD", perEye: "", pa: "required" }, { name: "Vabysmo", perEye: "", pa: "required" }] },
] };
test("whole step tree on the card: every step + drug in the rule's order, one today mark, header fits today's step", () => {
  const p = cardSteps({ kind: "rule", steps: HPHC_EYLEA });
  assert.deepEqual(p.steps.map((s) => s.drugs.map(stepDrugText)), [["Avastin (3/eye)"], ["Eylea 2mg", "Pavblu", "Lucentis", "Byooviz", "Cimerli", "Beovu"], ["Eylea HD", "Vabysmo"]]);
  assert.deepEqual(p.steps.flatMap((s) => s.drugs.filter(isTodayDrug).map((d) => [s.n, d.name])), [[2, "Eylea 2mg"]]);
  assert.deepEqual(stepHeader(p, "Eylea 2mg"), { must: true, text: "Patient must complete Step 1 before Eylea 2mg" });
  assert.deepEqual(stepHeader({ ...p, thisStep: 3, priorSteps: "Steps 1-2" }, "Vabysmo"), { must: true, text: "Patient must complete Steps 1\u20132 before Vabysmo" });
  assert.deepEqual(stepHeader({ ...p, thisStep: 1, priorSteps: null }, "Avastin"), { must: false, text: "Avastin is Step 1 for this plan" });
  const card = readFileSync(new URL("../src/CoverageCard.jsx", import.meta.url), "utf8");
  assert.match(card, /stepHeader\(path, drug\)/);
  assert.match(card, /isTodayDrug\(d\) && <span className="cov-st-today">today<\/span>/);
});

// Oct 21 2026, 9:32 PM (Mari): no fake trees; "Next options" for a one-list plan / today's drug in the last step.
test("loose step wording: no pathway strip, one neutral note with the copied words", () => {
  const c = CASES["loose-step-possible"].cards[0];
  assert.equal(cardSteps(c), null);
  assert.equal(stepPossibleNote(c), "Step therapy possible - check plan");
  assert.deepEqual(nextOptionGroups(c), []);
  assert.equal(stepPossibleNote(CASES["commercial-pa-yellow"].cards[0]), null);
  assert.equal(stepPossibleNote(CASES["medicare-green"].cards[0]), null);
});

test("next options: grouped by each drug's own status (no PA, PA, not covered, check), words on screen", () => {
  const f = CASES["fallon-next-options"].cards[0];
  assert.equal(cardSteps(f), null);   // a lone list holding today's drug draws no tree
  assert.deepEqual(nextOptionGroups(f).map((g) => [g.label, g.drugs]), [
    ["Not covered", ["Eylea 2mg", "Eylea HD", "Lucentis", "Vabysmo", "Beovu"]], ["Check rule", ["Pavblu", "Byooviz", "Cimerli"]]]);
  assert.deepEqual(nextOptionGroups(CASES["commercial-pa-yellow"].cards[0]).map((g) => [g.pa, g.drugs]),
    [["required", ["Lucentis"]], ["unknown", ["Eylea HD", "Beovu", "Pavblu", "Byooviz", "Cimerli"]]]);
  assert.deepEqual(nextOptionGroups({ kind: "rule", steps: { kind: "single", steps: [], nextOptions: [{ name: "Vabysmo", pa: "required" }, { name: "Lucentis", pa: "none" }, { name: "X", pa: "weird" }] } })
    .map((g) => [g.label, g.drugs]), [["No PA needed", ["Lucentis"]], ["PA required", ["Vabysmo"]], ["Check rule", ["X"]]]);
  assert.equal(paLabel("notcovered", "Beovu"), "Not covered");
  const card = readFileSync(new URL("../src/CoverageCard.jsx", import.meta.url), "utf8");
  assert.match(card, /stepPossibleNote\(c\)/);
  assert.match(card, /nextOptionGroups\(c\)/);
  assert.match(card, /Next options on this plan/);
});

// ── Avastin-only note + merged-plan label (Mari, Oct 22 2026) ────────────────
// Fixtures cca-carrier-*: the server's own route output (CCA = 2 plans, rule set 38, both
// Avastin only, one answer) — "before" = the Oct 21 text Mari flagged.
test("CCA + Avastin: card shows Retina-Rx's note; copy has the plain carrier and one Note line", () => {
  const c = CASES["cca-carrier-avastin"];
  assert.equal(avastinOnlyNoteText(c.cards[0]), "PA required. Avastin only. [Commonwealth Care Alliance].");
  assert.equal(mergedPlanSub(c.cards[0]), "");
  const block = blocksOf(copyableNoteText(parseResponse(c.after).note))[0].trim();
  assert.equal(block, [
    "=======================================",
    "COVERAGE REFERENCE - Avastin / Commonwealth Care Alliance",
    "PA required",
    "Note: Avastin only. [Commonwealth Care Alliance].",
    "======================================="].join("\n"));
  assert.match(block, ASCII_ONLY);
  // The flagged Oct 21 text: merged label, no Avastin-only line.
  const old = blocksOf(copyableNoteText(parseResponse(c.before).note))[0];
  assert.match(old, /Commonwealth Care Alliance \(plan not specified - merged across 2 plans\)\nPA required\n=/);
});

test("CCA + Eylea: Not covered + the Avastin-only note ({plan} = the carrier)", () => {
  const c = CASES["cca-carrier-eylea"];
  assert.equal(coverageTier(c.cards[0]).key, "red");
  assert.equal(avastinOnlyNoteText(c.cards[0]), "Commonwealth Care Alliance is Avastin-only. Eylea 2mg is not covered under this plan.");
  const block = blocksOf(copyableNoteText(parseResponse(c.after).note))[0];
  assert.match(block, /\nCOVERAGE REFERENCE - Eylea 2mg \/ Commonwealth Care Alliance\nNot covered\nNote: Commonwealth Care Alliance is Avastin-only\. Eylea 2mg is not covered under this plan\.\n=/);
});

test("every other card: no Avastin-only note; merged plans that differ keep the sub-line", () => {
  for (const [name, c] of Object.entries(CASES)) {
    if (name.startsWith("cca-")) continue;
    for (const card of c.cards) assert.equal(avastinOnlyNoteText(card), "", name);
    assert.doesNotMatch(c.after, /\nNote: /, name);
  }
  const merged = { kind: "rule", carrierLevel: true, carrier: "Fallon", planCount: 6 };
  assert.equal(mergedPlanSub(merged), "Plan not specified — merged across 6 plans");
  assert.equal(mergedPlanSub({ ...merged, ambiguousAlias: "fallon mc" }), '"fallon mc" matches 6 Fallon plans — merged; specify the plan for exact rules');
  assert.equal(mergedPlanSub({ ...merged, sameAcrossPlans: true }), "");
  assert.equal(mergedPlanSub({ kind: "rule", carrierLevel: false, insurance: "Fallon 365 Care" }), "");
  assert.equal(avastinOnlyNoteText({ kind: "ambiguous", avastinOnlyNote: "x" }), "");
});

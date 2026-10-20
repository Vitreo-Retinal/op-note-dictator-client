// Unit tests for src/lib/coverageCard.js + the coverage part of copyableNoteText
// (Oct 20 2026, owner decisions A–C). Fixtures: scripts/fixtures/coverage-cases.json —
// note text + data.coverage cards built by the server's own coverage builders
// (server routes/notes.js coverageRender + lib/ascii-safe.js), "before" = the
// pre-change server text (emoji, "─" ruler, em dashes), "after" = today's server text.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { copyableNoteText, parseResponse } from "../src/lib/noteHelpers.js";
import { coverageTier, reqTagClass, requirementTags, keyRequirement, jCodeText, cardSteps, paLabel, stepDrugText, asciiFold, COVERAGE_FENCE_RX, COVERAGE_TIERS, stripLeadingSymbols } from "../src/lib/coverageCard.js";

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
  for (const r of ["No PA required", "No PA needed", "No prior authorization required", "No prior auth", "PA not required", "Prior auth not required", "no pa required"])
    assert.equal(reqTagClass(r), "pa-no", r);
  for (const r of ["PA required", "PA required (per eye)", "Prior authorization required", "Precert required", "Step therapy"])
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
    [2, "required", [["Eylea 2mg (1/eye)", "PA required"], ["Lucentis", "PA required"]]],
    [3, "required", [["Vabysmo", "PA required"]]],
  ]);
  const pa = cardSteps(CASES["avastin-pa-yellow"].cards[0]);
  assert.deepEqual(pa.steps.map((st) => [st.pa, st.drugs.map((d) => paLabel(d.pa, d.name))]),
    [["required", ["PA required"]], ["mixed", ["PA required", "No PA needed"]], ["required", ["PA required"]]]);
  assert.equal(paLabel("unknown", "Avastin"), "Check Avastin rule");   // never guessed
  assert.equal(paLabel("unknown", "Lucentis"), "Check rule");
  assert.equal(paLabel(undefined, "Eylea 2mg"), "Check rule");
  assert.equal(cardSteps(CASES["medicare-green"].cards[0]), null);
  assert.equal(cardSteps({ kind: "rule", steps: { steps: [] } }), null);
});

test("copied step line: one ASCII line with every drug's PA status; no Notes line in any copied block", () => {
  const line = (k) => (copyableNoteText(parseResponse(CASES[k].after).note).match(/^Step therapy: .*$/m) || [""])[0];
  assert.equal(line("commercial-pa-yellow"), "Step therapy: 1) Avastin x3/eye (no PA) > 2) Eylea 2mg x1/eye or Lucentis (PA) > 3) Vabysmo (PA)");
  assert.equal(line("avastin-pa-yellow"), "Step therapy: 1) Avastin x3/eye (PA) > 2) Eylea 2mg x1/eye (PA) or Lucentis (no PA) > 3) Vabysmo (PA)");
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
      "Step therapy: 1) Avastin x3/eye (no PA) > 2) Eylea 2mg x1/eye or Lucentis (PA) > 3) Vabysmo (PA)"],
    "dual-medigap": ["COVERAGE REFERENCE - Eylea 2mg / Medicare", "No PA required"],
    "unknown-plan": ["COVERAGE REFERENCE - Eylea 2mg / \"united healthcare\"", "Plan not identified - check"],
    "masshealth-red": ["COVERAGE REFERENCE - Eylea 8mg (HD) / MassHealth Standard", "Not covered"],
    "avastin-pa-yellow": ["COVERAGE REFERENCE - Vabysmo / Example Commercial PPO", "PA required",
      "Step therapy: 1) Avastin x3/eye (PA) > 2) Eylea 2mg x1/eye (PA) or Lucentis (no PA) > 3) Vabysmo (PA)"],
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

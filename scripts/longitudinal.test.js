// G2211 / B1 (Nov 5 2026): the parser (server lib/b1-modifier.js form "99214-B1" +
// ---G2211--- "B1"), the "+ B1" chip, the -25 insertion with alphanumeric modifiers, and the
// doctor's switch (src/lib/longitudinal.js — request field, hub-only line, one-tap edit with
// no regenerate). Old-server responses parse exactly as before.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseResponse, copyableNoteText } from "../src/lib/noteHelpers.js";
import { LONG_DEFAULTS, LONG_DEFAULT_LABELS, LONG_DEFAULT_SHORT, normalizeLongDefault, longitudinalRequest, longitudinalHint, defaultForTap,
  longitudinalSummary, isLongitudinalLine, addLongitudinalLine, removeLongitudinalLines, setB1OnCode, applyLongitudinalEdit } from "../src/lib/longitudinal.js";

const LONG = "[+] Longitudinal managing physician for this patient's diabetic retinopathy; ongoing complexity with continued surveillance and monitoring for progression.";
const MDM = "[+] Moderate complexity medical decision-making: worsening DME OD, closer monitoring.";
const BODY = `1. T2DM moderate NPDR OU, new early DME OD\nPlan\nCloser monitoring, f/u 6 weeks\n${MDM}\n${LONG}`;
const note = (code, proc, g, body = BODY) =>
  `---CODE---\n${code}\n---PROCEDURE---\n${proc}\n---TESTS---\nNone\n---G2211---\n${g}\n---DIAGNOSES---\nT2DM Moderate NPDR with DME | OD\n---NOTE---\n${body}\n---END---`;
const UI = readFileSync(new URL("../src/ClinicNoteGenerator.jsx", import.meta.url), "utf8");

test("parse: the 2027 server output '99214-B1' + ---G2211--- B1 → b1 true, g2211 false (no '+ G2211'); old output unchanged", () => {
  const p = parseResponse(note("99214-B1", "None", "B1"));
  assert.deepEqual([p.code, p.g2211, p.b1], ["99214-B1", false, true]);
  assert.ok(p.note.includes(LONG), "same documentation sentence");
  const old = parseResponse(note("99214", "None", "YES"));
  assert.deepEqual([old.code, old.g2211, old.b1], ["99214", true, false]);
  assert.equal(parseResponse(note("99214-24-B1", "None", "B1")).b1, true);
  assert.equal(parseResponse(note("92014", "None", "NO")).b1, false);
  assert.equal(parseResponse(note("99214", "None", "NO")).b1, false);
});

test("parse: a procedure day never keeps B1 or G2211; -25 goes after alphanumeric modifiers", () => {
  const p = parseResponse(note("99214-B1", "67028-RT, J0178-JZ x2", "B1"));
  assert.deepEqual([p.code, p.g2211, p.b1], ["99214-25", false, false]);
  assert.ok(!p.note.includes("Longitudinal managing physician"));
  assert.equal(parseResponse(note("99214-24", "67028-79-RT, J0178-JZ x2", "NO")).code, "99214-24-25");
  assert.equal(parseResponse(note("99214-25", "67028-RT, J0178-JZ x2", "NO")).code, "99214-25", "idempotent");
  assert.equal(parseResponse(note("99215-57", "67028-RT", "NO")).code, "99215-57", "-57 left alone");
});

test("chip: '+ B1' when the server applied B1, '+ G2211' otherwise — never both", () => {
  assert.match(UI, /\{result\.g2211 && \(\n\s*<span style=\{codeChip\(\{ background: T\.goldSoft, borderColor: T\.gold \}\)\}>\n\s*<b[^>]*>\+ G2211<\/b>/);
  assert.match(UI, /\{result\.b1 && !result\.g2211 && \(\n\s*<span [^\n]*>\n\s*<b[^>]*>\+ B1<\/b>/);
});

test("request: a tap → { on|off, toggle }; otherwise the doctor's default (by_plan | always | never)", () => {
  assert.deepEqual(longitudinalRequest("on", true, "never"), { choice: "on", source: "toggle" });
  assert.deepEqual(longitudinalRequest("off", true, "always"), { choice: "off", source: "toggle" });
  assert.deepEqual(longitudinalRequest(null, false, "always"), { choice: "always", source: "default" });
  assert.deepEqual(longitudinalRequest("on", false, undefined), { choice: "by_plan", source: "default" });
  assert.deepEqual(LONG_DEFAULTS, ["by_plan", "always", "never"]);
  for (const v of [undefined, null, "ALWAYS", "on", 1]) assert.equal(normalizeLongDefault(v), "by_plan");
  assert.equal(longitudinalHint("by_plan", true), "by plan (your default)");
  assert.equal(longitudinalHint("never", false), "never (default)");
  assert.equal(defaultForTap("on", "by_plan"), "always");
  assert.equal(defaultForTap("off", "by_plan"), "never");
  assert.equal(defaultForTap("on", "always"), null, "already the default");
  // The component sends it, resets it on New note, loads / saves the default.
  assert.match(UI, /longitudinal: longitudinalRequest\(lgRef\.current\.choice, lgRef\.current\.tapped, lgRef\.current\.def\),/);
  assert.match(UI, /lgRef\.current = \{ choice: null, tapped: false, def: lgDefault \};\n\s*setLgTapped\(false\); setLgChoice\(null\); setLgSaving\(""\);/);
  assert.match(UI, /setLgDefault\(normalizeLongDefault\(json\.billingPreferences && json\.billingPreferences\.longitudinalCode\)\);/);
  assert.match(UI, /body: JSON\.stringify\(\{ billingPreferences: \{ longitudinalCode: def \} \}\),/);
  assert.match(UI, /data-testid="longitudinal-toggle"[\s\S]{0,1600}const lit = lgTapped && lgChoice === c;/, "neither button lit until tapped");
  assert.match(UI, /data-testid="longitudinal-default"[\s\S]{0,1400}LONG_DEFAULTS\.map/);
});

const LG = { form: "g2211", on: false, allowed: true, eligible: true, source: "plan", choice: "by_plan", why: "Harvard Pilgrim HMO (plan rule)",
  plan: { kind: "other", on: false, label: "Harvard Pilgrim HMO" }, code: "99214", sentence: LONG };

test("hub line: title · why · Add / Remove; hidden on -25 / procedure / eye-code notes (allowed false) and on older servers", () => {
  assert.deepEqual(longitudinalSummary(LG), { form: "g2211", on: false, title: "G2211: off", why: "Harvard Pilgrim HMO (plan rule)", button: "Add G2211" });
  assert.deepEqual(longitudinalSummary({ ...LG, on: true, why: "traditional Medicare" }), { form: "g2211", on: true, title: "G2211: added", why: "traditional Medicare", button: "Remove G2211" });
  assert.deepEqual(longitudinalSummary({ ...LG, form: "b1", on: true, why: "no insurance written" }), { form: "b1", on: true, title: "B1 on the code", why: "no insurance written", button: "Remove B1" });
  assert.equal(longitudinalSummary({ ...LG, form: "b1", on: false }).button, "Add B1");
  assert.equal(longitudinalSummary({ ...LG, edited: true }).why, "Harvard Pilgrim HMO (plan rule) · changed here");
  for (const v of [null, undefined, {}, { ...LG, allowed: false }, "x"]) assert.equal(longitudinalSummary(v), null);
  assert.match(UI, /const ls = longitudinalSummary\(result\.longitudinal\);\n\s*if \(!ls\) return null;/);
  assert.match(UI, /parsed\.longitudinal = data\.longitudinal && typeof data\.longitudinal === "object" \? data\.longitudinal : null;/);
});

test("instant edit (no regenerate): 2026 form toggles the G2211 chip + the sentence; B1 form toggles '-B1' on the code + the sentence", () => {
  const p = parseResponse(note("99214", "None", "NO", BODY.replace(`\n${LONG}`, "")));
  const r = { ...p, longitudinal: LG, safetyFlags: [] };
  const on = applyLongitudinalEdit(r, true);
  assert.deepEqual([on.code, on.g2211, on.longitudinal.on, on.longitudinal.edited], ["99214", true, true, true]);
  assert.equal(on.note.split("\n").filter(isLongitudinalLine).length, 1);
  assert.equal(on.note.trim().split("\n").pop(), LONG, "after the MDM line, at the end of the note");
  assert.ok(copyableNoteText(on.note).includes("Longitudinal managing physician for this patient's diabetic retinopathy"));
  const off = applyLongitudinalEdit(on, false);
  assert.deepEqual([off.g2211, off.longitudinal.on], [false, false]);
  assert.ok(!off.note.includes("Longitudinal managing physician"));
  assert.equal(applyLongitudinalEdit(on, true).note, on.note, "added once");
  // B1 form.
  const pb = parseResponse(note("99214-B1", "None", "B1"));
  const rb = { ...pb, longitudinal: { ...LG, form: "b1", on: true } };
  const bOff = applyLongitudinalEdit(rb, false);
  assert.deepEqual([bOff.code, bOff.b1, bOff.g2211], ["99214", false, false]);
  assert.ok(!bOff.note.includes(LONG));
  const bOn = applyLongitudinalEdit(bOff, true);
  assert.deepEqual([bOn.code, bOn.b1, bOn.g2211], ["99214-B1", true, false]);
  assert.ok(bOn.note.includes(LONG));
  // Not allowed (injection day) → the same object, nothing changes.
  const inj = { ...parseResponse(note("99214-25", "67028-RT, J0178-JZ x2", "NO")), longitudinal: { ...LG, allowed: false } };
  assert.equal(applyLongitudinalEdit(inj, true), inj);
  assert.match(UI, /setResult\(\(r\) => \(r && r\.longitudinal \? applyLongitudinalEdit\(r, !r\.longitudinal\.on\) : r\)\);/);
});

test("helpers: B1 on / off the code keeps the other modifiers; the sentence goes above a coverage block", () => {
  assert.equal(setB1OnCode("99214-24", true), "99214-24-B1");
  assert.equal(setB1OnCode("99214-24-B1", false), "99214-24");
  assert.equal(setB1OnCode("99214-B1", true), "99214-B1");
  assert.equal(setB1OnCode("POST-OP (in global)", true), "POST-OP (in global)");
  const cov = "Plan\nObserve\n\n" + "─".repeat(12) + "\nCOVERAGE REFERENCE\n" + "─".repeat(12) + "\n";
  const out = addLongitudinalLine(cov, LONG);
  assert.ok(out.indexOf(LONG) < out.indexOf("COVERAGE REFERENCE"));
  assert.equal(removeLongitudinalLines(out), cov.replace("Observe\n", "Observe\n"));
  assert.ok(isLongitudinalLine("- **[+] Longitudinal managing physician for …"));
  assert.ok(!isLongitudinalLine("Longitudinal managing physician (dictated, no badge)"), "plain dictated lines are never touched");
});

// Owner (Nov 5 2026): no payment wording anywhere on screen — same guard as the visit-code labels.
test("no payment wording in the G2211 / B1 labels or on screen", () => {
  for (const v of [...Object.values(LONG_DEFAULT_LABELS), ...Object.values(LONG_DEFAULT_SHORT), longitudinalHint("by_plan", true)]) assert.doesNotMatch(v, /pay|\$|%|price|reimburs/i, v);
  for (const lg of [LG, { ...LG, on: true }, { ...LG, form: "b1" }, { ...LG, form: "b1", on: true }]) {
    const s = longitudinalSummary(lg);
    for (const v of [s.title, s.button]) assert.doesNotMatch(v, /pay|\$|%|price/i, v);
  }
  const visible = UI.split("\n").filter((l) => !/^\s*(\/\/|\*|\{\/\*)/.test(l)).join("\n");
  const block = visible.slice(visible.indexOf('data-testid="longitudinal-toggle"'), visible.indexOf('data-testid="longitudinal-toggle"') + 2600);
  assert.doesNotMatch(block, /pays|payment|\$\d|16%/i);
  const rules = visible.slice(visible.indexOf('data-testid="longitudinal-default"'), visible.indexOf('data-testid="longitudinal-default"') + 2400);
  assert.doesNotMatch(rules, /pays|payment|\$\d|16%/i);
});

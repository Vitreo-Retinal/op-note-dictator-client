// Injection-day visit code (Nov 5 2026, owner decisions D13; server OWN-RULE-043):
// src/lib/visitFamily.js — the request field, the hub-only strip text — and the rule
// that the reminder, the "No separate problem" flag and the source label are NEVER in
// the copied note (copyNote copies copyableNoteText(result.note) only).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeFamily, normalizeDefault, DEFAULT_LABELS, injectionCodeRequest, visitFamilySummary, switchLabel, SOURCE_LABELS,
  isSecondDxFlag, appendAlsoLine, secondDxRegenerate, safetyFlagsForList, compExamReminderFor } from "../src/lib/visitFamily.js";
import { parseResponse, copyableNoteText } from "../src/lib/noteHelpers.js";

// Nov 5 2026: one comp-exam reminder for every final 92014 / 92004 note (server OWN-RULE-044).
const REMINDER = "Comp exam (92014/92004): practice rule — no more than once every 6 months per patient; the NextGen exam must show all 12 elements, dilated, plus chief complaint and history.";
const FLAG = "AUDIT: No separate problem — auditors treat this exam as part of the injection.";
// A server response for sample C (eye code, injected eye only).
const SERVER_TEXT = [
  "---CODE---", "92014-25", "---PROCEDURE---", "67028-LT, J0178-JZ x2", "---TESTS---", "92137", "---G2211---", "NO",
  "---DIAGNOSES---", "Wet AMD | OS | active", "---NOTE---",
  "1. Wet AMD OS", "   SRF resolved on OCT-A", "[+] OCT-A reviewed: SRF resolved OS.",
  "[+] Comprehensive dilated examination OU: SRF resolved OS.",
  "[+] Continuation of treatment program for wet AMD OS: SRF resolved, Eylea interval extended to 8 weeks.",
  "Plan", "[+] Eylea OS today; extend interval to 8 weeks.", "---END---",
].join("\n");
const VF = {
  injectionDay: true, family: "eye", source: "suggestion", forced: null, forcedLabel: null,
  requested: { family: "eye", source: "suggestion" }, suggestion: { status: "yes", reason: "traditional", payer: "medicare_ffs" },
  code: "92014", reminder: REMINDER, noSeparateProblem: true, bothTyped: false,
};

test("request: the toggle choice + whether it was tapped (tap → toggle, else the doctor's default)", () => {
  assert.deepEqual(injectionCodeRequest("eye", true), { family: "eye", source: "toggle" });
  assert.deepEqual(injectionCodeRequest("em", false), { family: "em", source: "default" });
  assert.deepEqual(injectionCodeRequest("92014", true), { family: "em", source: "toggle" }, "unknown → em");
  assert.equal(normalizeFamily("eye"), "eye");
  for (const v of [undefined, null, "EYE", 1, {}]) assert.equal(normalizeFamily(v), "em");
});

test("strip: family, why, reminder and the one-tap switch; nothing off injection days", () => {
  const s = visitFamilySummary(VF);
  assert.deepEqual(s, { family: "eye", code: "92014", title: "Eye code 92014-25", why: "Medicare 2027 suggestion", reminder: REMINDER, switchTo: "em", forced: null, secondDx: null });
  assert.equal(switchLabel(s.switchTo), "Switch to E/M");
  for (const [src, label] of Object.entries(SOURCE_LABELS)) assert.equal(visitFamilySummary({ ...VF, source: src, auto: null }).why, label);
  const forced = visitFamilySummary({ ...VF, family: "em", source: "forced", forced: "mod57", forcedLabel: "surgery today or tomorrow, -57", code: "99214", reminder: null });
  assert.deepEqual([forced.title, forced.why, forced.switchTo, forced.reminder], ["E/M", "stays E/M: surgery today or tomorrow, -57", null, null]);
  const em = visitFamilySummary({ ...VF, family: "em", source: "toggle", code: "99214", reminder: null });
  assert.deepEqual([em.title, em.switchTo, switchLabel(em.switchTo)], ["E/M", "eye", "Switch to eye code"]);
  assert.match(visitFamilySummary({ ...VF, source: "default", bothTyped: true }).why, /both code words were typed/);
  for (const v of [null, undefined, {}, { ...VF, injectionDay: false }, "x"]) assert.equal(visitFamilySummary(v), null);
});

test("never copied: the reminder, the 'No separate problem' flag and the source label stay out of the copied note", () => {
  const parsed = parseResponse(SERVER_TEXT);
  parsed.visitFamily = VF;
  parsed.safetyFlags = [FLAG];
  const copied = copyableNoteText(parsed.note);
  const s = visitFamilySummary(parsed.visitFamily);
  for (const hubOnly of [REMINDER, FLAG, "No separate problem", s.title, s.why, "Medicare 2027", "Hub only", "Switch to"]) {
    assert.ok(!copied.includes(hubOnly), `copied note contains "${hubOnly}"`);
  }
  assert.equal(parsed.code, "92014-25");
  assert.ok(copied.includes("Continuation of treatment program for wet AMD OS"), "the note itself is copied");
  // copyNote copies result.note only — the strip reads result.visitFamily, never the note.
  const src = readFileSync(new URL("../src/ClinicNoteGenerator.jsx", import.meta.url), "utf8");
  assert.match(src, /const clean = copyableNoteText\(result\.note\);/);
  assert.ok(!/copyableNoteText\([^)]*visitFamily/.test(src));
  assert.match(src, /injectionCode: injectionCodeRequest\(injRef\.current\.family, injRef\.current\.tapped\)/);
});

// ═════ Nov 5 2026 (Mari, 11:07 AM): Auto default · second diagnosis · comp-exam reminder ═════
const ASK = "Comp exam: add a second diagnosis addressed today to support 92014-25.";

test("Auto default: saved default em / eye / auto; an untapped toggle sends it as a default, a tap is never auto", () => {
  assert.deepEqual(DEFAULT_LABELS, { em: "E/M", eye: "Eye code", auto: "Auto — what pays more" });
  for (const v of ["em", "eye", "auto"]) assert.equal(normalizeDefault(v), v);
  for (const v of [undefined, null, "AUTO", "pays-more", 1]) assert.equal(normalizeDefault(v), "em");
  assert.deepEqual(injectionCodeRequest("auto", false), { family: "auto", source: "default" });
  assert.deepEqual(injectionCodeRequest("auto", true), { family: "em", source: "toggle" }, "a tap is em or eye only");
  assert.equal(normalizeFamily("auto"), "em");
  // The Rules-tab card offers the three options; the default loads / saves through normalizeDefault.
  const src = readFileSync(new URL("../src/ClinicNoteGenerator.jsx", import.meta.url), "utf8");
  assert.match(src, /\[\["em", DEFAULT_LABELS\.em\], \["eye", DEFAULT_LABELS\.eye\], \["auto", DEFAULT_LABELS\.auto\]\]\.map/);
  assert.match(src, /const injPref = normalizeDefault\(json\.billingPreferences && json\.billingPreferences\.injectionVisitCode\);/);
  assert.match(src, /async function saveInjDefault\(f\) \{\n    const fam = normalizeDefault\(f\);/);
});

test("Auto strip: the server's Auto label is the 'why' (Medicare 2027 / 2026 / new patient / commercial)", () => {
  for (const label of ["Auto: Medicare 2027 — eye code pays more", "Auto: 2026 — E/M", "Auto: new patient — E/M", "Auto: commercial — E/M"]) {
    const family = /eye code pays more/.test(label) ? "eye" : "em";
    const s = visitFamilySummary({ ...VF, family, source: "auto", code: family === "eye" ? "92014" : "99214", auto: { family, reason: "x", label } });
    assert.equal(s.why, label);
  }
  assert.equal(visitFamilySummary({ ...VF, source: "auto", auto: null }).why, SOURCE_LABELS.auto, "older server: generic label");
});

test("second diagnosis: the strip shows the ask (eye family only); the flag list skips it there; Add & regenerate appends 'Also: …' with the same family", () => {
  const vf = { ...VF, secondDx: ASK };
  assert.equal(visitFamilySummary(vf).secondDx, ASK);
  assert.equal(visitFamilySummary({ ...vf, family: "em", code: "99214" }).secondDx, null);
  assert.ok(isSecondDxFlag(ASK) && isSecondDxFlag(ASK.replace("92014", "92004")) && !isSecondDxFlag(FLAG));
  const result = { safetyFlags: [ASK, "AUDIT: something else"], visitFamily: vf };
  assert.deepEqual(safetyFlagsForList(result), ["AUDIT: something else"]);
  assert.deepEqual(safetyFlagsForList({ ...result, visitFamily: null }), [ASK, "AUDIT: something else"], "no strip (older client data) → the flag stays in the list");
  assert.equal(appendAlsoLine("Wet AMD OS, Eylea OS today.  \n", "  ERM OD,   stable — observe "), "Wet AMD OS, Eylea OS today.\nAlso: ERM OD, stable — observe");
  assert.equal(appendAlsoLine("x", "Also: ERM OD"), "x\nAlso: ERM OD");
  assert.equal(appendAlsoLine("x", "   "), null);
  assert.deepEqual(secondDxRegenerate("Wet AMD OS, Eylea OS today.", "ERM OD", vf), { note: "Wet AMD OS, Eylea OS today.\nAlso: ERM OD", family: "eye" });
  assert.equal(secondDxRegenerate("x", "ERM OD", VF), null, "no ask on this result");
  assert.equal(secondDxRegenerate("x", "", vf), null);
  // The component: box + button in the strip; the handler appends, taps the same family and regenerates with the new dictation.
  const src = readFileSync(new URL("../src/ClinicNoteGenerator.jsx", import.meta.url), "utf8");
  assert.match(src, /function addSecondDxAndRegenerate\(\) \{\n    if \(loading \|\| !result\) return;\n    const next = secondDxRegenerate\(note, secondDxText, result\.visitFamily\);\n    if \(!next\) return;\n    setNote\(next\.note\);\n    setSecondDxText\(""\);\n    pickInjFamily\(next\.family\);\n    run\(undefined, next\.note\);/);
  assert.match(src, /async function run\(editInstruction, dictationOverride\) \{\n[^\n]*\n    const note = typeof dictationOverride === "string" \? dictationOverride : noteState;/);
  assert.match(src, /data-testid="second-dx"[\s\S]{0,1400}Add &amp; regenerate/);
  assert.match(src, /\{safetyFlagsForList\(result\)\.map\(/);
});

test("comp-exam reminder: shown once — in the strip on injection days, stand-alone on any other 92014 / 92004 note; never copied", () => {
  assert.equal(compExamReminderFor({ compExamReminder: REMINDER, visitFamily: null }), REMINDER);
  assert.equal(compExamReminderFor({ compExamReminder: REMINDER, visitFamily: VF }), null, "the strip already shows it");
  assert.equal(compExamReminderFor({ compExamReminder: null }), null);
  assert.equal(compExamReminderFor(null), null);
  const OBS = ["---CODE---", "92014", "---PROCEDURE---", "None", "---G2211---", "NO", "---DIAGNOSES---", "Dry AMD | OU | stable",
    "---NOTE---", "1. Dry AMD OU", "Plan", "Observe, f/u 6 months", "---END---"].join("\n");
  const parsed = parseResponse(OBS);
  parsed.compExamReminder = REMINDER;
  parsed.safetyFlags = [ASK];
  const copied = copyableNoteText(parsed.note);
  for (const hubOnly of [REMINDER, "6 months per patient", "12 elements", ASK, "second diagnosis", "Also:"]) assert.ok(!copied.includes(hubOnly), hubOnly);
  const src = readFileSync(new URL("../src/ClinicNoteGenerator.jsx", import.meta.url), "utf8");
  assert.match(src, /parsed\.compExamReminder = typeof data\.compExamReminder === "string"/);
  assert.match(src, /const rem = compExamReminderFor\(result\);/);
  assert.match(src, /const clean = copyableNoteText\(result\.note\);/);
});

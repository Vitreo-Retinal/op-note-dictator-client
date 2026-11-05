// Injection-day visit code (Nov 5 2026, owner decisions D13; server OWN-RULE-043):
// src/lib/visitFamily.js — the request field, the hub-only strip text — and the rule
// that the reminder, the "No separate problem" flag and the source label are NEVER in
// the copied note (copyNote copies copyableNoteText(result.note) only).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeFamily, injectionCodeRequest, visitFamilySummary, switchLabel, SOURCE_LABELS } from "../src/lib/visitFamily.js";
import { parseResponse, copyableNoteText } from "../src/lib/noteHelpers.js";

const REMINDER = "Eye code 92014-25: the NextGen exam must show all 12 elements, dilated, plus chief complaint and history.";
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
  assert.deepEqual(s, { family: "eye", code: "92014", title: "Eye code 92014-25", why: "Medicare 2027 suggestion", reminder: REMINDER, switchTo: "em", forced: null });
  assert.equal(switchLabel(s.switchTo), "Switch to E/M");
  for (const [src, label] of Object.entries(SOURCE_LABELS)) assert.equal(visitFamilySummary({ ...VF, source: src }).why, label);
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

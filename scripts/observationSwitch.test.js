// New patient, observation only, billed 99204 (Nov 5 2026, owner 2:35 PM; server
// lib/observation-switch.js, OWN-RULE-011): the server keeps 99204 and sends
// data.observationSwitch; the hub-only strip offers "Switch to 92004" — an instant edit on
// screen (CODE, G2211 and the two E/M-only [+] lines), no regenerate — and "Back to 99204".
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseResponse, copyableNoteText, isEyeCode, getEmLabel } from "../src/lib/noteHelpers.js";
import { normalizeObservationSwitch, observationSwitchSummary, isMdmLine, removeMdmLines, switchCode,
  applyObservationSwitch, undoObservationSwitch, toggleObservationSwitch } from "../src/lib/observationSwitch.js";
import { compExamReminderFor } from "../src/lib/visitFamily.js";

const MDM = "[+] Moderate complexity medical decision-making: evaluation of a new referral for ERM OD with OCT review and decision to observe.";
const LONG = "[+] Longitudinal managing physician for this patient's ERM; ongoing complexity with continued surveillance.";
const KEPT = [
  "72-year-old man referred by Dr. Smith with ERM OD",
  "1. ERM OD",
  "OD: mild ERM, VA 20/25",
  "[+] OCT reviewed demonstrating mild ERM without distortion of the foveal contour",
  "Plan",
  "[+] Decision was made to observe given good VA and no metamorphopsia.",
  "RTC 1 year.",
];
const BODY = [...KEPT, MDM, LONG].join("\n");
const note = (code, g = "YES", body = BODY) =>
  `---CODE---\n${code}\n---PROCEDURE---\nNone\n---TESTS---\n92134\n---G2211---\n${g}\n---DIAGNOSES---\nERM | OD\n---NOTE---\n${body}\n---END---`;
const REMINDER = "Comp exam (92014/92004): practice rule — no more than once every 6 months per patient; the NextGen exam must show all 12 elements, dilated, plus chief complaint and history.";
const FLAG = "New patient, observation only? Your rule says 92004: observation is a comprehensive eye exam; action means E/M. This note keeps 99204 unless you switch.";
const SERVER = { from: "99204", to: "92004", reason: "observation-only", flag: FLAG, reminder: REMINDER };
const LG = { allowed: true, form: "g2211", on: true, why: "by plan", sentence: LONG };
const result = (code = "99204", g = "YES") => ({ ...parseResponse(note(code, g)), observationSwitch: normalizeObservationSwitch(SERVER), longitudinal: LG, compExamReminder: null, safetyFlags: [] });
const UI = readFileSync(new URL("../src/ClinicNoteGenerator.jsx", import.meta.url), "utf8");

test("server field: validated; older servers / anything else → null", () => {
  assert.deepEqual(normalizeObservationSwitch(SERVER), { from: "99204", to: "92004", flag: FLAG, reminder: REMINDER });
  for (const v of [undefined, null, "x", [], {}, { from: "99214", to: "92014" }, { from: "99204", to: "99214" }]) assert.equal(normalizeObservationSwitch(v), null);
  assert.equal(observationSwitchSummary({ code: "99204" }), null);
});

test("strip: flag + 'Switch to 92004'; after the tap 'Switched to 92004' + 'Back to 99204'", () => {
  const r = result();
  assert.deepEqual(observationSwitchSummary(r), { title: "New patient, observation only?", text: FLAG, button: "Switch to 92004", switched: false });
  const s = applyObservationSwitch(r);
  const sum = observationSwitchSummary(s);
  assert.equal(sum.title, "Switched to 92004");
  assert.equal(sum.button, "Back to 99204");
  assert.equal(sum.switched, true);
});

test("switch = instant deterministic edit: CODE 92004, G2211 off, the MDM + longitudinal lines gone, every other line untouched", () => {
  const r = result();
  assert.ok(r.note.includes(MDM) && r.note.includes(LONG) && r.g2211 === true);
  const s = applyObservationSwitch(r);
  assert.equal(s.code, "92004");
  assert.equal(isEyeCode(s.code), true);
  assert.equal(getEmLabel(s.code), "Eye Comp New");
  assert.equal(s.g2211, false);
  assert.equal(s.b1, false);
  assert.equal(s.note, KEPT.join("\n"));
  assert.equal(s.procedure, "None");
  assert.equal(s.tests, "92134");
  assert.equal(s.diagnoses, r.diagnoses);
  assert.ok(!s.changes.some((c) => /decision-making|Longitudinal/.test(c)), "billing additions follow the note");
  assert.equal(s.longitudinal, null, "the G2211 / B1 line never goes with an eye code");
  assert.equal(s.compExamReminder, REMINDER);
  assert.equal(compExamReminderFor(s), REMINDER, "the comp-exam reminder shows after the switch");
  // equals what the generator / server writes for a real 92004 note (eye code → no MDM, no G2211)
  const real = parseResponse(note("92004", "NO", KEPT.join("\n")));
  for (const k of ["code", "procedure", "tests", "g2211", "b1", "changes", "diagnoses", "note"]) assert.deepEqual(s[k], real[k], k);
  assert.ok(!copyableNoteText(s.note).includes("decision-making"));
});

test("Back to 99204 restores the note exactly; toggling twice is a no-op; never touches the original object", () => {
  const r = result();
  const before = JSON.stringify(r);
  const s = toggleObservationSwitch(r);
  assert.equal(JSON.stringify(r), before, "original result untouched");
  assert.equal(undoObservationSwitch(s), r);
  assert.equal(toggleObservationSwitch(s), r);
  assert.equal(applyObservationSwitch(s), s, "already switched");
});

test("2027 form: 99204-B1 → 92004 (B1 dropped)", () => {
  const r = result("99204-B1", "B1");
  assert.equal(r.b1, true);
  const s = applyObservationSwitch(r);
  assert.equal(s.code, "92004");
  assert.equal(s.b1, false);
  assert.equal(switchCode("99204-B1", "99204", "92004"), "92004");
  assert.equal(switchCode("99214", "99204", "92004"), "99214");
});

test("no switch when the code on screen is no longer 99204", () => {
  const r = { ...result(), code: "99214" };
  assert.equal(applyObservationSwitch(r), r);
  assert.equal(applyObservationSwitch(null), null);
});

test("MDM line test mirrors the server (lib/no-em-text.js isMdmLine): [+] lines only, any label", () => {
  assert.ok(isMdmLine(MDM));
  assert.ok(isMdmLine("- **[+] High-complexity medical decision-making: x"));
  assert.ok(isMdmLine("2. [+] Low to moderate complexity medical decision-making: x"));
  assert.ok(!isMdmLine("Moderate complexity medical decision-making: dictated, no badge"), "plain dictated lines are never touched");
  assert.ok(!isMdmLine("[+] Decision was made to observe."));
  assert.equal(removeMdmLines(`a\n${MDM}\nb`), "a\nb");
});

test("UI: the strip is wired, hub only, no regenerate, and has no payment wording", () => {
  assert.match(UI, /parsed\.observationSwitch = normalizeObservationSwitch\(data\.observationSwitch\);/);
  assert.match(UI, /data-testid="observation-switch"/);
  assert.match(UI, /setResult\(\(r\) => toggleObservationSwitch\(r\)\);/);
  const visible = UI.split("\n").filter((l) => !/^\s*(\/\/|\*|\{\/\*)/.test(l)).join("\n");
  const at = visible.indexOf('data-testid="observation-switch"');
  const block = visible.slice(at, at + 1600);
  assert.match(block, /Hub only — not copied into the note\./);
  assert.doesNotMatch(block, /run\(|pays|payment|\$\d|%|price|reimburs/i);
  const r = result();
  for (const v of [observationSwitchSummary(r), observationSwitchSummary(applyObservationSwitch(r))]) {
    for (const s of [v.title, v.text, v.button]) assert.doesNotMatch(s, /pay|\$|%|price|reimburs|revenue|money|dollar/i, s);
  }
});

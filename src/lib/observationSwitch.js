// New patient, observation only, billed 99204 → hub-only flag + one-tap "Switch to 92004"
// (owner decision Nov 5 2026, 2:35 PM; server lib/observation-switch.js, OWN-RULE-011:
// "Action means E/M. Observation is a comprehensive eye exam (92004 new)").
//
// The server keeps 99204 and sends data.observationSwitch { from, to, reason, flag, reminder }
// only when its own reading of the note (FACTS: new patient, every problem observed, no
// procedure, nothing typed) says 92004. This file turns it into the hub-only strip under the
// note and does the switch on screen WITHOUT regenerating: a real 92004 observation note
// differs from the 99204 one only in
//   - the CODE line (99204 → 92004; a 2027 "-B1" is dropped with it),
//   - G2211 (an eye code never carries it → NO), and
//   - the two E/M-only "[+]" lines: "… complexity medical decision-making: …" and
//     "Longitudinal managing physician …" (the generator writes them only for an E/M; the
//     server removes them from every final eye code — lib/no-em-text.js).
// "Back to 99204" restores the note exactly as it came back. Nothing here is copied into
// the chart (copyNote copies result.note only).
//
// Pure helpers — no React, no fetch — so scripts/observationSwitch.test.js can test them.
import { removeLongitudinalLines, setB1OnCode } from "./longitudinal.js";

// Same line test as the server (lib/no-em-text.js isMdmLine): a "[+]" line (after an optional
// list number / bullet / bold) whose text is an MDM sentence, any label.
const MDM_BODY_RX = /^(?:[A-Za-z]+[ \t-]+){0,4}?complexity[ \t]+medical[ \t]+decision[ \t-]+making[ \t]*:/i;
function plusBody(line) {
  let s = String(line || "").slice(0, 400).trimStart();
  const num = s.match(/^\d{1,2}[.)]/);
  if (num) s = s.slice(num[0].length).trimStart();
  if (/^[-*•]/.test(s) && !s.startsWith("**")) s = s.slice(1).trimStart();
  if (s.startsWith("**") || s.startsWith("__")) s = s.slice(2).trimStart();
  if (!s.startsWith("[+]")) return null;
  s = s.slice(3).trimStart();
  if (s.startsWith("**") || s.startsWith("__")) s = s.slice(2).trimStart();
  return s;
}
export function isMdmLine(line) {
  const b = plusBody(line);
  return b !== null && MDM_BODY_RX.test(b);
}
/** Note text without the MDM sentence(s) (plain, non-[+] lines are never touched). */
export function removeMdmLines(note) {
  return String(note || "").split("\n").filter((l) => !isMdmLine(l)).join("\n");
}
// Billing-additions list, derived from the [+] markers exactly like parseResponse does.
const changesOf = (note) => Array.from(String(note || "").matchAll(/\[\+\]\s*([^\n[]+?)(?=\s*\[\+\]|[\n]|$)/g))
  .map((m) => m[1].replace(/[.,;\s]+$/, "").trim())
  .filter(Boolean);

const CODE_RX = /^\d{5}$/;
/** The server field, validated: { from, to, flag, reminder } or null (older server / malformed). */
export function normalizeObservationSwitch(v) {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  if (v.from !== "99204" || v.to !== "92004") return null;
  return {
    from: v.from,
    to: v.to,
    flag: typeof v.flag === "string" && v.flag ? v.flag : "New patient, observation only? Your rule says 92004.",
    reminder: typeof v.reminder === "string" && v.reminder ? v.reminder : null,
  };
}

/**
 * The hub-only strip for this result, or null (nothing to show).
 *   { title, text, button, switched }
 */
export function observationSwitchSummary(result) {
  const os = result && result.observationSwitch;
  if (!os || !CODE_RX.test(String(os.from || "")) || !CODE_RX.test(String(os.to || ""))) return null;
  if (os.switched) {
    return { title: `Switched to ${os.to}`, text: "Observation only: comprehensive eye exam, changed here.", button: `Back to ${os.from}`, switched: true };
  }
  return { title: "New patient, observation only?", text: os.flag, button: `Switch to ${os.to}`, switched: false };
}

/** The visit code line with 99204 → 92004 (a "-B1" dropped first); anything else unchanged. */
export function switchCode(code, from, to) {
  const c = setB1OnCode(String(code || ""), false);
  const rx = new RegExp(`^(\\s*)${from}(?![0-9])`);
  return rx.test(c) ? c.replace(rx, `$1${to}`) : String(code || "");
}

/**
 * The one-tap switch, applied to the parsed result on screen (no regenerate). Returns a NEW
 * result; the same object when it does not apply (no switch data, already switched, or the
 * code on screen is no longer the server's 99204).
 */
export function applyObservationSwitch(result) {
  const os = result && result.observationSwitch;
  if (!os || os.switched || !os.from || !os.to) return result;
  const code = switchCode(result.code, os.from, os.to);
  if (code === result.code || !code.trim().startsWith(os.to)) return result;
  const note = removeMdmLines(removeLongitudinalLines(result.note));
  return {
    ...result,
    code,
    g2211: false,
    b1: false,
    note,
    changes: changesOf(note),
    longitudinal: null,                       // the G2211 / B1 line never goes with an eye code
    compExamReminder: os.reminder || result.compExamReminder || null,
    observationSwitch: { ...os, switched: true, prev: result },
  };
}

/** "Back to 99204": the result exactly as it was before the switch. */
export function undoObservationSwitch(result) {
  const os = result && result.observationSwitch;
  return os && os.switched && os.prev ? os.prev : result;
}

/** The strip's button: switch, or back. */
export function toggleObservationSwitch(result) {
  const os = result && result.observationSwitch;
  return os && os.switched ? undoObservationSwitch(result) : applyObservationSwitch(result);
}

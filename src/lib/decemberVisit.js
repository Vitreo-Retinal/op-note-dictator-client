// "December visit?" reminder (Nov 21 2026, owner decision D16; server OWN-RULE-054 —
// lib/december-visit.js). The 2027 switches (G2211 → B1, the Auto / Medicare 2027 eye code)
// go by the day the note is made. From Jan 1 to Jan 15, 2027 the server adds
// data.decemberVisit { window, switched, text, button } when a 2027 switch changed THIS note,
// so a December 2026 visit dictated in January can go back to the 2026 codes with one tap.
// The tap regenerates the same note with december_visit: true; the server answers with
// data.decemberSwitch { honored: true } or { honored: false, ignored: "outside-window" }.
// HUB ONLY: the strip is never part of result.note, so copyNote never copies it.
// Pure helpers — no React, no fetch — so scripts/decemberVisit.test.js can test them.

const SWITCHES = new Set(["b1", "auto-eye", "suggest-eye"]);

/** The server's reminder, validated: { text, button, switched } or null (older server / junk). */
export function parseDecemberVisit(data) {
  const v = data && data.decemberVisit;
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const text = typeof v.text === "string" ? v.text.trim() : "";
  if (!text) return null;
  const button = typeof v.button === "string" && v.button.trim() ? v.button.trim() : "Switch to 2026 codes";
  const switched = Array.isArray(v.switched) ? v.switched.filter((s) => SWITCHES.has(s)) : [];
  return { text, button, switched };
}

/** The server's answer to a December tap: { honored: true } | { honored: false, ignored } | null. */
export function parseDecemberSwitch(data) {
  const v = data && data.decemberSwitch;
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  if (v.honored === true) return { honored: true };
  if (v.honored === false) return { honored: false, ignored: typeof v.ignored === "string" ? v.ignored : "outside-window" };
  return null;
}

/** Request-body fields: only a real tap sends the flag (the server ignores anything but JSON true). */
export function decemberRequest(on) {
  return on === true ? { december_visit: true } : {};
}

/** After a response: keep sending the flag for this note unless the server refused it. */
export function decemberFlagAfter(sent, sw) {
  if (sent !== true) return false;
  return !(sw && sw.honored === false);
}

export const DECEMBER_DONE_TEXT = "This note uses the 2026 codes for a December 2026 visit.";
export const DECEMBER_IGNORED_TEXT = "The December switch works only from January 1 to 15, 2027. This note keeps the 2027 codes.";

/**
 * What to show under the note, or null:
 *   { kind: "offer", text, button }  — the reminder with its one-tap switch
 *   { kind: "done", text }           — the switch was honored (2026 codes on this note)
 *   { kind: "ignored", text }        — the tap came outside the window
 */
export function decemberStripFor(result) {
  if (!result || typeof result !== "object") return null;
  const sw = result.decemberSwitch;
  if (sw && sw.honored === true) return { kind: "done", text: DECEMBER_DONE_TEXT };
  if (sw && sw.honored === false) return { kind: "ignored", text: DECEMBER_IGNORED_TEXT };
  const dv = result.decemberVisit;
  if (dv && typeof dv.text === "string" && dv.text) return { kind: "offer", text: dv.text, button: dv.button || "Switch to 2026 codes" };
  return null;
}

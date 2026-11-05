// G2211 / B1 — the doctor's switch (Nov 5 2026, owner 12:55 PM; server lib/g2211-choice.js,
// draft OWN-RULE-046; B1 = CMS CY2027 modifier form, server lib/b1-modifier.js).
//
// Precedence (server): a typed word in the dictation ("no G2211", "add B1") > the toggle on the
// Input tab for THIS note > the doctor's saved default (by plan | always | never) > the plan
// rule (traditional Medicare, or no / unclear insurance → on). The client sends the toggle
// state + whether it was tapped; the server decides and returns data.longitudinal, which this
// file turns into the hub-only line under the note, with a one-tap Add / Remove that edits the
// note on screen WITHOUT regenerating (the change is deterministic: the code line / G2211 chip,
// and the "[+] Longitudinal managing physician …" sentence the server sent).
//
// Pure helpers — no React, no fetch — so scripts/longitudinal.test.js can test them.
import { COVERAGE_FENCE_RX } from "./coverageCard.js";

export const LONG_DEFAULTS = ["by_plan", "always", "never"];
// Rules tab (no payment wording anywhere on screen — owner, Nov 5 2026).
export const LONG_DEFAULT_LABELS = {
  by_plan: "By plan — traditional Medicare or no insurance",
  always: "Always when the visit qualifies",
  never: "Never",
};
// Input-tab gray hint (short form).
export const LONG_DEFAULT_SHORT = { by_plan: "by plan", always: "always", never: "never" };

/** The saved default: "by_plan" | "always" | "never"; unknown → "by_plan". */
export function normalizeLongDefault(v) {
  return LONG_DEFAULTS.includes(v) ? v : "by_plan";
}
/** The request field: a tap → { on|off, toggle }; otherwise the doctor's default. */
export function longitudinalRequest(choice, tapped, def) {
  if (tapped && (choice === "on" || choice === "off")) return { choice, source: "toggle" };
  return { choice: normalizeLongDefault(def), source: "default" };
}
/** The Input-tab hint when the toggle was not tapped: "by plan (your default)" … */
export function longitudinalHint(def, signedIn) {
  return `${LONG_DEFAULT_SHORT[normalizeLongDefault(def)]} (${signedIn ? "your default" : "default"})`;
}
/** "Make this my default" after a tap: On → "always", Off → "never"; null when it already is. */
export function defaultForTap(choice, def) {
  const d = choice === "on" ? "always" : choice === "off" ? "never" : null;
  return d && d !== normalizeLongDefault(def) ? d : null;
}

const formName = (form) => (form === "b1" ? "B1" : "G2211");
/**
 * data.longitudinal → the hub-only line, or null (older server, or a note the switch does not
 * concern: injection / procedure day, -25, eye code).
 *   { form, on, title, why, button }
 */
export function longitudinalSummary(lg) {
  if (!lg || typeof lg !== "object" || lg.allowed !== true) return null;
  const form = lg.form === "b1" ? "b1" : "g2211";
  const on = lg.on === true;
  const title = form === "b1" ? (on ? "B1 on the code" : "B1: off") : (on ? "G2211: added" : "G2211: off");
  const why = (typeof lg.why === "string" && lg.why ? lg.why : "") + (lg.edited ? (lg.why ? " · " : "") + "changed here" : "");
  return { form, on, title, why, button: `${on ? "Remove" : "Add"} ${formName(form)}` };
}

// Same line test as the server (lib/no-em-text.js isLongLine): a "[+]" line (after an optional
// list number / bullet / bold) naming the longitudinal / complexity add-on.
const LONG_BODY_RX = /longitudinal[ \t]+managing[ \t]+physician|ongoing[ \t]+complexity[ \t]+given|visit[ \t-]complexity[ \t]+add|\bG2211\b/i;
export function isLongitudinalLine(line) {
  let s = String(line || "").slice(0, 400).trimStart();
  const num = s.match(/^\d{1,2}[.)]/);
  if (num) s = s.slice(num[0].length).trimStart();
  if (/^[-*•]/.test(s) && !s.startsWith("**")) s = s.slice(1).trimStart();
  if (s.startsWith("**") || s.startsWith("__")) s = s.slice(2).trimStart();
  if (!s.startsWith("[+]")) return false;
  s = s.slice(3).trimStart();
  if (s.startsWith("**") || s.startsWith("__")) s = s.slice(2).trimStart();
  return LONG_BODY_RX.test(s);
}
/** Note text with the sentence at the end of the note body (above any coverage block), once. */
export function addLongitudinalLine(note, sentence) {
  const text = String(note || "");
  const add = String(sentence || "").trim();
  if (!add) return text;
  const fm = text.match(new RegExp(COVERAGE_FENCE_RX.source));
  const cut = fm ? fm.index : text.length;
  const lines = text.slice(0, cut).split("\n");
  if (lines.some(isLongitudinalLine)) return text;
  let end = lines.length;
  while (end > 0 && lines[end - 1].trim() === "") end--;
  lines.splice(end, 0, add);
  return lines.join("\n") + text.slice(cut);
}
/** Note text without the longitudinal sentence(s). */
export function removeLongitudinalLines(note) {
  return String(note || "").split("\n").filter((l) => !isLongitudinalLine(l)).join("\n");
}
// "-B1" after the visit code's modifiers / removed from it.
const VISIT_RX = /^(\s*(?:99\d{3}|920(?:0[24]|1[24]))(?:-[A-Z0-9]{2})*?)(-B1)?((?:-[A-Z0-9]{2})*)(?![A-Z0-9-])/i;
export function setB1OnCode(code, on) {
  const c = String(code || "");
  const m = c.match(VISIT_RX);
  if (!m) return c;
  const rest = c.slice(m[0].length);
  const mods = (m[1] + (m[3] || "")).replace(/-B1(?![A-Z0-9])/gi, "");
  return (on ? `${mods}-B1` : mods) + rest;
}

/**
 * The one-tap Add / Remove, applied to the parsed result on screen (no regenerate):
 *   2026 form  → result.g2211 + the sentence;  B1 form → "-B1" on result.code (result.b1) + the sentence.
 * Returns a NEW result; the same object when the switch does not apply (not allowed / no data).
 */
export function applyLongitudinalEdit(result, on) {
  const lg = result && result.longitudinal;
  if (!lg || lg.allowed !== true) return result;
  const form = lg.form === "b1" ? "b1" : "g2211";
  const next = { ...result, longitudinal: { ...lg, on: !!on, edited: true } };
  next.note = on ? addLongitudinalLine(result.note, lg.sentence) : removeLongitudinalLines(result.note);
  if (form === "b1") { next.code = setB1OnCode(result.code, !!on); next.b1 = !!on; next.g2211 = false; }
  else next.g2211 = !!on;
  return next;
}

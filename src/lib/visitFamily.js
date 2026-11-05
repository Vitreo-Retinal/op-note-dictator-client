// Injection-day visit code: E/M or eye code (Nov 5 2026, owner decisions D13;
// server lib/visit-family.js, OWN-RULE-043).
//
// The doctor picks the visit-code family for injection days: a typed word in the
// dictation, a tap on the note-page toggle, the Medicare 2027 suggestion (server),
// her saved default (E/M, Eye code, or "Auto — what pays more", which the server resolves
// per note), or the practice default (E/M). The client only sends the toggle
// state and whether it was tapped; the server decides and returns data.visitFamily,
// which this file turns into the hub-only strip under the note. Nothing here is ever
// part of the copied note text (copyNote copies result.note only).
//
// Pure helpers — no React, no fetch — so scripts/visitFamily.test.js can test them.

export const INJECTION_FAMILIES = ["em", "eye"];
// The doctor's saved default may also be "auto" = "Auto — what pays more" (Nov 5 2026): the
// server picks E/M or the eye code per note (date, new vs established, primary payer).
export const DEFAULT_CHOICES = ["em", "eye", "auto"];
export const DEFAULT_LABELS = { em: "E/M", eye: "Eye code", auto: "Auto — what pays more" };

/** "em" | "eye" from anything (a toggle tap, server field); unknown → "em". */
export function normalizeFamily(v) {
  return INJECTION_FAMILIES.includes(v) ? v : "em";
}
/** The saved default: "em" | "eye" | "auto"; unknown → "em". */
export function normalizeDefault(v) {
  return DEFAULT_CHOICES.includes(v) ? v : "em";
}

/** The request field: a tap → source "toggle" (em / eye only); otherwise the doctor's default (em / eye / auto). */
export function injectionCodeRequest(family, tapped) {
  return tapped ? { family: normalizeFamily(family), source: "toggle" } : { family: normalizeDefault(family), source: "default" };
}

// Why this family was used (the server's data.visitFamily.source).
export const SOURCE_LABELS = {
  typed: "typed in the dictation",
  toggle: "your tap",
  auto: "Auto — what pays more",
  suggestion: "Medicare 2027 suggestion",
  default: "your default",
  practice: "practice default",
};

/**
 * data.visitFamily → the strip's text, or null when there is nothing to show
 * (not an injection day, older server).
 *   { family, code, title, why, reminder, switchTo, forced, secondDx }
 * title: "Eye code 92014-25" / "E/M"; why: "Medicare 2027 suggestion", "Auto: Medicare
 * 2027 — eye code pays more", "stays E/M: inside a VRA global", …; switchTo: the other
 * family for the one-tap regenerate (null on a day that always stays E/M); secondDx: the
 * server's one-diagnosis ask ("Comp exam: add a second diagnosis …") or null.
 */
export function visitFamilySummary(vf) {
  if (!vf || typeof vf !== "object" || vf.injectionDay !== true) return null;
  const family = normalizeFamily(vf.family);
  const forced = typeof vf.forced === "string" && vf.forced ? vf.forced : null;
  const code = typeof vf.code === "string" && /^\d{5}$/.test(vf.code) ? vf.code : null;
  const isEyeCode = code === "92014" || code === "92004";
  const title = family === "eye" ? `Eye code${isEyeCode ? ` ${code}-25` : ""}` : "E/M";
  let why;
  if (forced) why = `stays E/M: ${typeof vf.forcedLabel === "string" && vf.forcedLabel ? vf.forcedLabel : forced}`;
  else if (vf.source === "auto" && vf.auto && typeof vf.auto.label === "string" && vf.auto.label) why = vf.auto.label;
  else why = SOURCE_LABELS[vf.source] || "practice default";
  if (!forced && vf.bothTyped) why += " (both code words were typed — ignored)";
  return {
    family,
    code,
    title,
    why,
    reminder: typeof vf.reminder === "string" && vf.reminder ? vf.reminder : null,
    switchTo: forced ? null : family === "eye" ? "em" : "eye",
    forced,
    secondDx: family === "eye" && typeof vf.secondDx === "string" && vf.secondDx ? vf.secondDx : null,
  };
}

// ── Comp exam needs a second diagnosis (injection days, eye code; Nov 5 2026) ──
// The server keeps 92014-25 and asks; the strip shows a box + "Add & regenerate". The typed
// diagnosis becomes a new dictation line ("Also: …") and the note is regenerated with the
// SAME family (the eye code, sent as a tap so nothing else can change it).
/** Is this safety flag the one-diagnosis ask? (the strip shows it, so the flag list skips it) */
export const isSecondDxFlag = (f) => typeof f === "string" && /^Comp exam: add a second diagnosis addressed today to support 920(?:14|04)-25\.$/.test(f);
/** The dictation with the typed diagnosis appended as "Also: …", or null when nothing was typed. */
export function appendAlsoLine(dictation, text) {
  const t = String(text || "").replace(/\s+/g, " ").trim().replace(/^also:\s*/i, "");
  if (!t) return null;
  const base = String(dictation || "").replace(/\s+$/, "");
  return base ? `${base}\nAlso: ${t}` : `Also: ${t}`;
}
/** The safety-flag list as shown: the one-diagnosis ask is left out when the strip shows it (one place, not two). */
export function safetyFlagsForList(result) {
  const flags = result && Array.isArray(result.safetyFlags) ? result.safetyFlags : [];
  const s = result ? visitFamilySummary(result.visitFamily) : null;
  return s && s.secondDx ? flags.filter((f) => !isSecondDxFlag(f)) : flags;
}
/** "Add & regenerate" → { note, family } for the regenerate call, or null (nothing typed / no ask on this result). */
export function secondDxRegenerate(dictation, text, vf) {
  const s = visitFamilySummary(vf);
  if (!s || !s.secondDx) return null;
  const note = appendAlsoLine(dictation, text);
  return note ? { note, family: s.family } : null;
}

// ── Comp exam reminder (every final 92014 / 92004 note; server OWN-RULE-044) ──
/** The stand-alone reminder for a note WITHOUT the injection-day strip (the strip shows its own), else null. */
export function compExamReminderFor(result) {
  if (!result || typeof result !== "object") return null;
  if (visitFamilySummary(result.visitFamily)) return null;
  return typeof result.compExamReminder === "string" && result.compExamReminder ? result.compExamReminder : null;
}

/** Button text for the one-tap switch. */
export const switchLabel = (to) => (to === "eye" ? "Switch to eye code" : "Switch to E/M");

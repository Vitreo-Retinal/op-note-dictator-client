// Injection-day visit code: E/M or eye code (Nov 5 2026, owner decisions D13;
// server lib/visit-family.js, OWN-RULE-043).
//
// The doctor picks the visit-code family for injection days: a typed word in the
// dictation, a tap on the note-page toggle, the Medicare 2027 suggestion (server),
// her saved default, or the practice default (E/M). The client only sends the toggle
// state and whether it was tapped; the server decides and returns data.visitFamily,
// which this file turns into the hub-only strip under the note. Nothing here is ever
// part of the copied note text (copyNote copies result.note only).
//
// Pure helpers — no React, no fetch — so scripts/visitFamily.test.js can test them.

export const INJECTION_FAMILIES = ["em", "eye"];

/** "em" | "eye" from anything (saved default, server field); unknown → "em". */
export function normalizeFamily(v) {
  return INJECTION_FAMILIES.includes(v) ? v : "em";
}

/** The request field: a tap → source "toggle"; otherwise the doctor's default. */
export function injectionCodeRequest(family, tapped) {
  return { family: normalizeFamily(family), source: tapped ? "toggle" : "default" };
}

// Why this family was used (the server's data.visitFamily.source).
export const SOURCE_LABELS = {
  typed: "typed in the dictation",
  toggle: "your tap",
  suggestion: "Medicare 2027 suggestion",
  default: "your default",
  practice: "practice default",
};

/**
 * data.visitFamily → the strip's text, or null when there is nothing to show
 * (not an injection day, older server).
 *   { family, code, title, why, reminder, switchTo, forced }
 * title: "Eye code 92014-25" / "E/M"; why: "Medicare 2027 suggestion", "stays E/M:
 * inside a VRA global", …; switchTo: the other family for the one-tap regenerate
 * (null on a day that always stays E/M).
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
  };
}

/** Button text for the one-tap switch. */
export const switchLabel = (to) => (to === "eye" ? "Switch to eye code" : "Switch to E/M");

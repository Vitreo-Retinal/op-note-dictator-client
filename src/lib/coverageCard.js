// ── Coverage card helpers (Oct 20 2026, owner decisions A–C) ─────────────────
// Pure functions behind the hub's coverage card (src/CoverageCard.jsx) and the
// copied coverage text. The card copies Retina-Rx's result card
// (retina-rx public/index.html buildCard / getStepTherapyHtml); the copied text
// is pure 7-bit ASCII so nothing turns into "?" when pasted into NextGen.

// Retina-Rx buildCard labels / headlines / phone one-liner, per tier. "nodata" =
// Retina-Rx's buildCard(null): a yellow card, "No Data · No rule on file".
export const COVERAGE_TIERS = {
  green:  { tone: "green",  icon: "check", label: "Approved",         headline: "OK to inject today",                                  phone: ["Approved", "OK to inject today"] },
  yellow: { tone: "amber",  icon: "alert", label: "Verify First",     headline: "Check PA status before proceeding",                   phone: ["Verify first", "check PA status before proceeding"] },
  orange: { tone: "orange", icon: "alert", label: "Partial Coverage", headline: "Partial coverage — patient has out-of-pocket cost", phone: ["Partial coverage", "patient has out-of-pocket cost"] },
  red:    { tone: "red",    icon: "ban",   label: "Not Covered",      headline: "Do not inject — not covered",                         phone: ["Not covered", "do not inject"] },
  nodata: { tone: "amber",  icon: "alert", label: "No Data",          headline: "No rule on file",                                     phone: ["No data", "no rule on file"] },
};

/**
 * One server data.coverage card → { key, tone, icon, label, headline, phone: [bold, rest] }.
 * rule cards use their status; ambiguous ("plan not identified") / norule → No Data;
 * biosimilar → No Data with the billing-office headline; invalid → red, its own words.
 */
export function coverageTier(card) {
  const c = card || {};
  if (c.kind === "rule") {
    const s = String(c.status || "").toLowerCase();
    const key = COVERAGE_TIERS[s] && s !== "nodata" ? s : "nodata";
    return { key, ...COVERAGE_TIERS[key] };
  }
  if (c.kind === "invalid") {
    return { key: "red", tone: "red", icon: "ban", label: "Invalid Combination", headline: "Verify which plan is active",
      phone: ["Invalid combination", "verify which plan is active"] };
  }
  if (c.kind === "biosimilar") {
    return { key: "nodata", ...COVERAGE_TIERS.nodata, headline: "Biosimilar — check with the billing office",
      phone: ["No data", "biosimilar, check with billing"] };
  }
  if (c.kind === "ambiguous") {
    return { key: "nodata", ...COVERAGE_TIERS.nodata, headline: "Plan not identified", phone: ["No data", "plan not identified"] };
  }
  return { key: "nodata", ...COVERAGE_TIERS.nodata };
}

/**
 * Requirement text → Retina-Rx tag class: "pa-no" (green), "pa-yes" (yellow),
 * "ref-yes" (plum PCP referral), "ref-no" (muted), "oon" (red: not covered /
 * out of network), "info" (neutral accent: anything else, e.g. "Rules vary by plan").
 * Negations are tested first, so "No PA required" is never tagged as prior auth
 * (the hub's old reqTag bug, and Retina-Rx's /^no prior auth/ miss).
 */
// ONE no-PA rule shared with Retina-Rx (public/index.html NO_PA_RX) and the hub server (lib/step-pathway.js
// NO_PA_RX); keep the three identical (Oct 21 2026). Real DB wordings it must catch: "No PA required",
// "No PA required — Medigap plan", "No prior authorization required", "No PA typically required for Avastin",
// "Covered under Medicare Part B — no PA required" (that last one used to tag yellow here: it does not START with "no").
export const NO_PA_RX = /\bno\s+(?:typically\s+)?(?:pa|prior\s+auth(?:orization)?|precert(?:ification)?|auth(?:orization)?)\b|\b(?:pa|prior\s+auth(?:orization)?|precert(?:ification)?|auth(?:orization)?)\s+(?:is\s+)?not\s+(?:required|needed)\b/i;

export function reqTagClass(text) {
  const r = String(text || "").trim();
  if (/\b(?:out[- ]of[- ]network|not covered|non[- ]?covered|excluded)\b/i.test(r)) return "oon";
  if (/\breferral\b/i.test(r)) {
    return /\b(?:no|not)\b[^.]*\breferral\b|\breferral\b[^.]*\bnot (?:required|needed)\b/i.test(r) ? "ref-no" : "ref-yes";
  }
  if (NO_PA_RX.test(r)) return "pa-no";
  if (/\b(?:pa|prior auth(?:orization)?|precert(?:ification)?)\b/i.test(r)) return "pa-yes";
  if (/\bstep\s*therapy\b|\bstep\s*[0-9]\b|\bmust (?:trial|try|fail)\b/i.test(r)) return "pa-yes";
  return "info";
}

// Step-therapy-only requirement entries — the pathway strip shows them instead.
const STEP_REQ = (r) => {
  const rl = String(r || "").toLowerCase();
  return rl.indexOf("step therapy") !== -1 || /\b(?:avastin|eylea|lucentis|byooviz) per eye\b/.test(rl);
};

/**
 * Tags for the card: requirement entries (step-therapy entries dropped when the
 * pathway strip is shown, as in Retina-Rx), plus a red "Not covered" tag on a red
 * card that does not already say so. Nothing is invented for an empty list.
 */
export function requirementTags(card, hasPathway) {
  const reqs = (Array.isArray(card && card.requirements) ? card.requirements : []).map((r) => String(r)).filter((r) => r.trim());
  const list = hasPathway ? reqs.filter((r) => !STEP_REQ(r)) : reqs;
  const tags = list.map((text) => ({ text, cls: reqTagClass(text) }));
  if (card && String(card.status).toLowerCase() === "red" && !tags.some((t) => t.cls === "oon")) tags.unshift({ text: "Not covered", cls: "oon" });
  return tags;
}

/** The phone "key requirement": PA status first, then referral, then the first tag. */
export function keyRequirement(tags) {
  const t = Array.isArray(tags) ? tags : [];
  return t.find((x) => x.cls === "oon") || t.find((x) => x.cls === "pa-yes") || t.find((x) => x.cls === "pa-no")
    || t.find((x) => x.cls === "ref-yes") || t[0] || null;
}

/** "J0178 · 2 mg per eye" (Retina-Rx's phone J-code box) — only when the server sent the code. */
export function jCodeText(card) {
  const code = card && typeof card.jCode === "string" ? card.jCode.trim() : "";
  if (!code) return "";
  const m = String(card.drug || "").match(/(\d+(?:\.\d+)?)\s*mg/i);
  return code + (m ? ` · ${m[1]} mg per eye` : "");
}

/** Leading emoji / symbols on DB alert text ("⚠️ PRACTICE RULE: …") — the card draws one alert icon. */
export const stripLeadingSymbols = (s) => String(s || "").replace(/^[^A-Za-z0-9"'($]+/, "");

// ── Step-therapy pathway (server-built, Oct 20 2026, Mari 1:55/1:56 PM) ─────────
// The server (lib/step-pathway.js) parses the rule into card.steps and looks up every
// step drug's REAL rule for the same plan: drug.pa = "none" | "required" | "unknown",
// step.pa = the drugs' common value or "mixed". Per-drug PA status is the key output.
export function cardSteps(card) {
  const p = card && card.steps;
  return p && Array.isArray(p.steps) && p.steps.length ? p : null;
}
/** Screen words for a PA status. Unknown is never guessed: "Check Avastin rule" / "Check rule". "notcovered" = the drug's rule for this plan is red. */
export function paLabel(pa, drugName) {
  if (pa === "none") return "No PA needed";
  if (pa === "required") return "PA required";
  if (pa === "notcovered") return "Not covered";
  return /avastin/i.test(String(drugName || "")) ? "Check Avastin rule" : "Check rule";
}
/** Step drug as shown in its box: "Avastin (3/eye)". */
export const stepDrugText = (d) => (d && d.perEye ? `${d.name} (${d.perEye}/eye)` : (d && d.name) || "");
/**
 * Pathway header after "Step Therapy Pathway — " (Oct 21 2026, 2:55 PM: the card shows the plan's WHOLE tree, today's
 * drug marked). Today's drug in a later step -> { must: true, "Patient must complete Step 1 before Eylea 2mg" };
 * today's drug in Step 1 -> { must: false, "Avastin is Step 1 for this plan" }.
 */
export function stepHeader(path, drug) {
  const name = drug || "this drug";
  if (!path) return null;
  if (path.priorSteps) return { must: true, text: `Patient must complete ${String(path.priorSteps).replace("-", "\u2013")} before ${name}` };
  return { must: false, text: `${name} is Step 1 for this plan` };
}
/** Today's drug inside its step box (server lib/step-pathway.js sets drug.today; the copied line says "[today]"). */
export const isTodayDrug = (d) => !!(d && d.today);

// ── No fake trees + Next options (Mari, Oct 21 2026, 9:32 PM; server lib/step-pathway.js) ─────
// card.steps.kind: "tree" (steps drawn) | "single" (a lone list holding today's drug: no tree) | "possible" (step
// wording with no named order: no tree, one neutral note). card.steps.nextOptions: the other anti-VEGF drugs on the
// SAME plan, each with its own rule's status, when the plan has one list or today's drug is in the last step.
/** The neutral "Step therapy possible - check plan" note, or null. */
export function stepPossibleNote(card) {
  const p = card && card.steps;
  return p && p.kind === "possible" ? String(p.note || "Step therapy possible - check plan") : null;
}
const OPTION_ORDER = ["none", "required", "notcovered", "unknown"];
/** Next options grouped by status (no PA, PA, not covered, check), each group in the server's drug order; [] when none. */
export function nextOptionGroups(card) {
  const list = card && card.steps && Array.isArray(card.steps.nextOptions) ? card.steps.nextOptions : [];
  const key = (o) => (OPTION_ORDER.includes(o && o.pa) ? o.pa : "unknown");
  return OPTION_ORDER.map((pa) => ({ pa, label: paLabel(pa, ""), drugs: list.filter((o) => key(o) === pa).map((o) => String(o.name || "")) }))
    .filter((g) => g.drugs.length);
}

// ── ASCII fold for the copied coverage block (owner decision B) ─────────────
// Client twin of server lib/ascii-safe.js — a defensive pass in copyableNoteText,
// applied to the coverage block(s) only. Keep the two in step.
const FOLD = [
  [/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-"],
  [/[\u2018\u2019\u201A\u201B\u2032\u00B4]/g, "'"],
  [/[\u201C\u201D\u201E\u201F\u2033\u00AB\u00BB]/g, '"'],
  [/\u2026/g, "..."],
  [/[\u2192\u21D2\u2794\u279C\u27A1\u27F6\u2B95]/g, "->"],
  [/[\u2190\u21D0\u27F5\u2B05]/g, "<-"],
  [/[\u2194\u21D4]/g, "<->"],
  [/[\u2191\u2193\u2195]/g, ""],
  [/[\u2022\u2023\u2043\u2219\u25CF\u25AA\u25E6\u00B7\u30FB]/g, "-"],
  [/\u2265/g, ">="], [/\u2264/g, "<="], [/\u2260/g, "!="], [/\u2248/g, "~"],
  [/\u00D7/g, "x"], [/\u00F7/g, "/"], [/\u00B1/g, "+/-"], [/\u2044/g, "/"],
  [/\u00B0/g, " deg"], [/[\u00B5\u03BC]/g, "u"],
  [/\u2122/g, "(TM)"], [/\u00AE/g, "(R)"], [/\u00A9/g, "(C)"], [/\u00A7/g, "Sec. "],
  [/\u00BC/g, "1/4"], [/\u00BD/g, "1/2"], [/\u00BE/g, "3/4"],
  [/\u20AC/g, "EUR "], [/\u00A3/g, "GBP "],
  [/\u00DF/g, "ss"], [/\u00C6/g, "AE"], [/\u00E6/g, "ae"], [/\u00D8/g, "O"], [/\u00F8/g, "o"],
  [/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, " "],
  [/[\u2500-\u259F]/g, "="],
];
export function asciiFold(input) {
  let s = String(input == null ? "" : input);
  for (const [rx, to] of FOLD) s = s.replace(rx, to);
  s = s.replace(/[\p{Extended_Pictographic}\u2139\uFE0E\uFE0F\u200D\u20E3]/gu, "");
  s = s.normalize("NFKD").replace(/[\u0300-\u036F]/g, "");
  s = s.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
  s = s.replace(/-{3,}/g, "--");
  return s.split("\n").map((line) => line.replace(/[ \t]{2,}/g, " ").replace(/^[ \t]+|[ \t]+$/g, "")).join("\n");
}

// The coverage block fence in the note text: a line of 10+ "=" (server, Oct 20 2026)
// or of "─" (older servers), the block, and a closing line of the same kind.
export const COVERAGE_FENCE_RX = /\n*(?:─{10,}|={10,})\n([\s\S]*?)\n(?:─{10,}|={10,})/g;

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
export function reqTagClass(text) {
  const r = String(text || "").trim();
  if (/\b(?:out[- ]of[- ]network|not covered|non[- ]?covered|excluded)\b/i.test(r)) return "oon";
  if (/\breferral\b/i.test(r)) {
    return /\b(?:no|not)\b[^.]*\breferral\b|\breferral\b[^.]*\bnot (?:required|needed)\b/i.test(r) ? "ref-no" : "ref-yes";
  }
  if (/^\s*no\b[^.]*\b(?:pa|prior auth(?:orization)?|precert(?:ification)?|auth(?:orization)?)\b/i.test(r)
    || /\b(?:pa|prior auth(?:orization)?|precert(?:ification)?|auth(?:orization)?)\s+(?:is\s+)?not\s+(?:required|needed)\b/i.test(r)
    || /^\s*no\s+(?:pa|prior auth)/i.test(r)) return "pa-no";
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

// ── Step-therapy pathway — port of Retina-Rx getStepTherapyHtml (data, not HTML) ──
// Returns null (no strip) or { steps: [{ label, drug, desc, active }], thisStep, priorSteps }.
// One difference: Retina-Rx's Step 1 "PA required / No PA needed" comes from a
// separate Avastin lookup the hub does not have, so Step 1 says "First line".
function canonDrug(nm) {
  const x = String(nm || "").toLowerCase();
  if (x.includes("pavblu")) return "pavblu";
  if (x.includes("cimerli")) return "cimerli";
  if (x.includes("byooviz")) return "byooviz";
  if (x.includes("eylea hd") || x.includes("eylea 8") || x.includes("8mg") || x.includes("(hd)") || /\bhd\b/.test(x)) return "eylea hd";
  if (x.includes("eylea") || x.includes("aflibercept")) return "eylea 2mg";
  if (x.includes("lucentis") || x.includes("ranibizumab")) return "lucentis";
  if (x.includes("vabysmo") || x.includes("faricimab")) return "vabysmo";
  if (x.includes("beovu") || x.includes("brolucizumab")) return "beovu";
  if (x.includes("avastin") || x.includes("bevacizumab")) return "avastin";
  return x.trim();
}
function parseStepDrugs(text, drugName) {
  const drugs = [], t = String(text).toLowerCase();
  if (t.includes("this drug") || t.includes("this agent")) return [drugName || "This drug"];
  if (t.includes("eylea hd") || t.includes("eylea 8") || t.includes("r/hd") || t.includes("ehd")) drugs.push("Eylea HD");
  const tClean = t.replace(/eylea\s*hd/gi, "").replace(/eylea\s*8/gi, "").replace(/r\/hd/gi, "")
    .replace(/pavblu(\s*\(aflibercept[^)]*\))?/gi, "").replace(/cimerli(\s*\(ranibizumab[^)]*\))?/gi, "").replace(/byooviz(\s*\(ranibizumab[^)]*\))?/gi, "");
  if (tClean.includes("eylea") || tClean.includes("aflibercept")) drugs.push("Eylea 2mg");
  if (t.includes("pavblu")) drugs.push("Pavblu");
  if (t.includes("byooviz")) drugs.push("Byooviz");
  if (t.includes("cimerli")) drugs.push("Cimerli");
  if (tClean.includes("lucentis") || tClean.includes("ranibizumab")) drugs.push("Lucentis");
  if (t.includes("vabysmo") || t.includes("faricimab")) drugs.push("Vabysmo");
  if (t.includes("beovu") || t.includes("brolucizumab")) drugs.push("Beovu");
  return drugs.length ? drugs : null;
}
export function stepPathway(notes, drugName, requirements, billingAlert) {
  if (!notes) return null;
  const reqText = Array.isArray(requirements) && requirements.length ? requirements.join(" ").toLowerCase() : "";
  const alertText = String(billingAlert || "").toLowerCase();
  const allText = String(notes).toLowerCase() + " " + reqText;
  if (allText.includes("no step therapy")) return null;
  if (!["step therapy", "step 1", "step 2", "step 3", "must trial and fail", "must fail", "two-step", "2-step", "avastin per eye", "eylea per eye", "byooviz per eye"]
    .some((k) => allText.includes(k))) return null;
  const drug = String(drugName || "").toLowerCase();
  const combinedText = notes + " " + (requirements || []).join(" ");
  const dm = combinedText.match(/(\d+)\s*(?:consecutive\s+monthly\s+)?(?:doses?\s*(?:of\s*)?)?(?:per\s*eye\s*(?:of\s*)?)?avastin/i)
    || combinedText.match(/avastin\s*\((\d+)\s*doses?\)/i) || combinedText.match(/(\d+)\s*avastin\s*per\s*eye/i)
    || combinedText.match(/(\d+)\s*consecutive\s*monthly\s*doses/i) || combinedText.match(/avastin\s*x(\d+)/i);
  const avastinDoses = dm ? dm[1] : "";
  const em = combinedText.match(/(\d+)\s*eylea\s*per\s*eye/i) || combinedText.match(/eylea\s*x(\d+)/i);
  const eyleaDoses = em ? em[1] : "";
  const bm = combinedText.match(/(\d+)\s*byooviz\s*per\s*eye/i);
  const byoovizDoses = bm ? bm[1] : "";
  if (drug.includes("avastin")) return null;   // Avastin IS Step 1 — no pathway
  const s1pool = String(notes).match(/Step\s*1\s*:\s*([^.]+?)\s*(?:Step\s*2\s*:|Step\s*3\s*:|\.)/i);
  if (s1pool) {
    const poolText = s1pool[1].replace(/x\d+\s*\/?\s*eye/gi, "").replace(/\bx\d+\b/gi, "").replace(/\/eye/gi, "");
    if (/[,/]/.test(poolText) && poolText.split(/[,/]/).map(canonDrug).filter(Boolean).includes(canonDrug(drug))) return null;
  }
  let needsAvastin = false, needsStep2 = false;
  if (allText.includes("this is a step 2 drug") || allText.includes("this is a step 2 agent") || allText.includes("step 2 drug")) { needsAvastin = true; }
  else if (allText.includes("this is a step 3 drug") || allText.includes("this is a step 3 agent") || allText.includes("step 3 drug")) { needsAvastin = true; needsStep2 = true; }
  else if (allText.includes("two-step") || allText.includes("2-step")) { needsAvastin = true; }
  else if (allText.includes("step 3:") || allText.includes("step 3 agent") || allText.includes("step 3.")) { needsAvastin = true; needsStep2 = true; }
  else if (eyleaDoses || byoovizDoses) { needsAvastin = true; needsStep2 = true; }
  else if (/must\s+(?:trial\s+and\s+)?fail\s+avastin.*?\s+and\s+/i.test(combinedText) || /must\s+(?:trial\s+and\s+)?fail\s+avastin.*?,\s*then\s+/i.test(combinedText)) { needsAvastin = true; needsStep2 = true; }
  else if (/must\s+(?:trial\s+and\s+)?fail\s+(?:eylea|aflibercept|lucentis|ranibizumab|pavblu|byooviz)/i.test(combinedText) && !allText.includes("fail avastin")) { needsAvastin = true; needsStep2 = true; }
  else if (allText.includes("must trial and fail") || allText.includes("must fail") || allText.includes("step therapy")) { needsAvastin = true; }
  const s2Match = allText.match(/step\s*2\s*:\s*([^→]+?)(?:\s*→|\.\s*this|\.\s*pa|\.\s*step\s*3|\.\s*\d+|\s*$)/i);
  const s3Match = allText.match(/step\s*3\s*:\s*([^→]+?)(?:\s*→|\.\s*this|\.\s*pa|\.\s*\d+|\s*$)/i);
  const parsedStep2Drugs = s2Match ? parseStepDrugs(s2Match[1], drugName) : null;
  const parsedStep3Drugs = s3Match ? parseStepDrugs(s3Match[1], drugName) : null;
  if (allText.includes("step 1:") || allText.includes("step 2:")) {
    needsAvastin = true;
    if (allText.includes("step 3:") || parsedStep3Drugs) {
      const cur = canonDrug(drugName);
      needsStep2 = !(parsedStep2Drugs && parsedStep2Drugs.some((d) => canonDrug(d) === cur));
    } else needsStep2 = false;
  }
  const thisStep = needsStep2 ? 3 : needsAvastin ? 2 : 0;
  if (!thisStep) return null;
  let step1Drug = avastinDoses ? `Avastin (${avastinDoses}/eye)` : "Avastin";
  const s1Match = String(notes).match(/Step\s*1\s*:\s*([^.]+?)\s*(?:Step\s*2\s*:|Step\s*3\s*:|\.)/i);
  if (s1Match) {
    const s1clean = s1Match[1].replace(/x\d+\s*\/?\s*eye/gi, "").replace(/\bx\d+\b/gi, "").replace(/\/eye/gi, "")
      .replace(/\s*,\s*/g, ", ").replace(/\s{2,}/g, " ").trim().replace(/[,\s]+$/, "");
    if (/[,/]/.test(s1clean) || /eylea|lucentis|vabysmo|byooviz|beovu/i.test(s1clean)) step1Drug = s1clean;
  }
  const steps = [{ label: "Step 1", drug: step1Drug, desc: "First line", active: false }];
  let s2display = [];
  if (thisStep === 2) s2display = [drugName || "This drug"];
  else if (parsedStep2Drugs) s2display = parsedStep2Drugs.slice();
  else if (byoovizDoses) s2display = [`Byooviz (${byoovizDoses}/eye)`];
  else s2display = eyleaDoses ? [`Eylea 2mg (${eyleaDoses}/eye)`, "Lucentis"] : ["Eylea 2mg", "Eylea HD", "Lucentis", "Vabysmo"];
  const paPerEye = ["pa is per eye", "pa per eye"].some((k) => alertText.includes(k) || allText.includes(k));
  steps.push({ label: "Step 2", drug: s2display.join(", "), desc: paPerEye ? "PA required (per eye)" : "PA required", active: thisStep === 2 });
  if (needsStep2) {
    const s3display = thisStep === 3 ? [drugName || "This drug"] : parsedStep3Drugs ? parsedStep3Drugs : [drugName || "This drug"];
    steps.push({ label: "Step 3", drug: s3display.join(", "), desc: "PA required", active: thisStep === 3 });
  }
  return { steps, thisStep, priorSteps: thisStep > 1 ? (needsStep2 ? "Steps 1–2" : "Step 1") : "" };
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

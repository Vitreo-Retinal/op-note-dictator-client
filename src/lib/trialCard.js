// VRA trial cards for the Advisor strip (Nov 6 2026, Mari — D15, project doc claude/plan-trial-card.md).
//
// Two kinds of card, both doctor-side, both "Not copied with the note":
//   1. Trial card — the note matches an ENROLLING VRA trial (GA → SIENNA; moderate or
//      severe NPDR → HELIOS-3). It shows a quick check of what the note already says
//      (✓ met / ✗ not met / ? check / — not in note), what only the coordinator can
//      confirm, and "+ Add" plan lines. It never says "eligible".
//   2. Study-patient reminder — the note names a VRA trial as the patient's own
//      ("SIENNA participant", "enrolled in CAPRI", "ASCENT pt") → check with the
//      coordinator before any treatment outside the protocol.
//
// Mari's decisions (Nov 6): the rules live in the trials table (Retina-Rx
// public.clinical_trials: card_triggers + quick_checks), using the fixed check menu
// and concept dictionary below; doctors only; flag to the row's flag_to.
// Status comes live from the table: a trial that stops enrolling stops making cards.
//
// PHI-free: pure functions over the note on screen. Nothing is stored or sent.
// Snellen is not ETDRS — vision checks are approximate (letters = 85 + 50·log10(20/x)).

import { noteAge } from "./advisor.js";

// ── Concept dictionary (code-reviewed; table rows refer to these keys) ────────
// rx: matched per line (case-insensitive unless `cs`). icd: [{ rx, eyeAt }] where
// eyeAt = index of the laterality digit after the dot (1 = OD, 2 = OS, 3 = OU).
// requireLine: the line must also match (keeps bare "GA" honest). soft: a match
// is "?" (investigator decides), never ✗.
const DM = "E(?:0[89]|1[013])";
export const CONCEPTS = {
  ga: {
    label: "geographic atrophy",
    rx: /geographic\s+atrophy|\bGA\b|advanced\s+atrophic|\bc?RORA\b/gi,
    requireLine: /geographic|AMD|ARMD|macular\s+degeneration|atroph|fove|\bFAF\b|\bO[DSU]\b|non-?exudative|\bdry\b/i,
    icd: [{ rx: /^H35\.31[1-3][34]$/i, eyeAt: 2 }],
  },
  npdr_mod_sev: {
    label: "moderate or severe NPDR",
    rx: /\b(?:moderate(?:ly)?(?:[\s-]+severe)?|mod\.?|severe|sev\.?)\s+(?:non-?\s?proliferative\s+diabetic\s+retinopathy|NPDR)\b/gi,
    // "… with DME" on the same line → that eye is not a HELIOS candidate.
    skipLine: /\b(?:with|w\/)\s+(?:CI-?)?(?:DME|DMO|CSME|macular\s+edema|ME)\b/i,
    icd: [{ rx: new RegExp(`^${DM}\\.3[34]9[1-3]$`, "i"), eyeAt: 3 }],
  },
  mnv: {
    label: "wet AMD / CNV / PCV",
    rx: /\b(?:wet|(?<!non-?\s?)exudative|neovascular)\s+(?:AMD|ARMD|age[-\s]related\s+macular\s+degeneration|macular\s+degeneration)\b|\bnAMD\b|\bCNVM?\b|\bMNV\b|choroidal\s+neovasc\w*|\bPCV\b|polypoidal/gi,
    icd: [{ rx: /^H35\.32[1-3]\d?$/i, eyeAt: 2 }],
  },
  macular_edema: {
    label: "macular edema",
    rx: /\b(?:CI-?)?DME\b|\bDMO\b|\bCSME\b|\bCME\b|\bCMO\b|macular\s+(?:edema|oedema)|cystoid/gi,
    icd: [{ rx: new RegExp(`^${DM}\\.3[2-5]1[1-3]$`, "i"), eyeAt: 3 }, { rx: /^H35\.35[1-3]$/i, eyeAt: 2 }],
  },
  dr_any: {
    label: "diabetic retinopathy",
    rx: /diabetic\s+retinopathy/gi,
    rx2: /\bN?PDR\b|\bDR\b/g, // UPPERCASE only ("Dr. Hong" is not DR)
    icd: [{ rx: new RegExp(`^${DM}\\.3[2-5]\\d[1-3]$`, "i"), eyeAt: 3 }],
  },
  macular_hole: {
    label: "macular hole",
    rx: /macular\s+hole|\bFTMH\b/gi,
    icd: [{ rx: /^H35\.34[1-3]$/i, eyeAt: 2 }],
  },
  non_amd_atrophy: {
    label: "non-AMD cause of atrophy",
    rx: /stargardt|fundus\s+flavimaculatus|cone[-\s]?rod|rod[-\s]?cone|pattern\s+dystrophy|toxic\s+maculopathy|(?:plaquenil|hydroxychloroquine|HCQ)\s+(?:toxicity|maculopathy|retinopathy)|retinitis\s+pigmentosa|inherited\s+retinal|retinal\s+dystroph\w*|late[-\s]?onset\s+retinal\s+degeneration|myopic\s+(?:atrophy|degeneration|maculopathy)|pathologic\s+myopia/gi,
  },
  macular_laser: {
    label: "macular laser",
    rx: /focal\s*(?:\/|and|&)?\s*(?:grid\s+)?laser|grid\s+laser|thermal\s+laser|macular\s+(?:photocoagulation|laser)|\bFLT\b/gi,
  },
  pbm: {
    label: "Valeda / PBM",
    rx: /\bvaleda\b|photobiomodulation|\bPBM\b/gi,
  },
  anti_vegf: {
    label: "anti-VEGF",
    rx: /\b(?:eylea(?:\s*HD)?|aflibercept|pavblu|ahzantive|enzeevu|opuviz|yesafili|lucentis|ranibizumab|cimerli|byooviz|vabysmo|faricimab|avastin|bevacizumab|beovu|brolucizumab|susvimo|anti-?\s?VEGF)\b/gi,
    // Mari's injection shorthand — UPPERCASE only (Nov 6 rule). C3 never C3F8.
    rx2: /\b(?:IVA|IVE|IVV|IVC|IVB|IVL|EHD|L3|L5|C5|C3(?!F8))\b/g,
    naive: /treatment[-\s]?na[iï]ve|no\s+prior\s+(?:anti-?\s?VEGF|injections?|intravitreal)|never\s+(?:been\s+)?injected/i,
  },
  complement: {
    label: "complement inhibitor",
    rx: /\b(?:syfovre|pegcetacoplan|izervay|avacincaptad)\b/gi,
  },
  ivt_steroid: {
    label: "intraocular steroid",
    rx: /\b(?:ozurdex|dexamethasone\s+(?:implant|intravitreal)|iluvien|yutiq|retisert|fluocinolone|triesence|triamcinolone|kenalog|IVK|IVTA|xipere)\b/gi,
  },
  pdr_nv_vh: {
    label: "PDR / neovascularization / vitreous hemorrhage",
    rx: /(?<!non-?\s?)proliferative\s+diabetic|\bPDR\b|\bNV[DEIA]\b|neovasculari[sz]ation\s+(?:of|at)\s+the\s+(?:dis[ck]|iris|angle)|neovasculari[sz]ation\s+elsewhere|vitreous\s+(?:hemorrhage|haemorrhage|heme)|\bVH\b|pre-?retinal\s+hem\w*/gi,
    icd: [{ rx: new RegExp(`^${DM}\\.35\\d{2}$`, "i"), eyeAt: 3 }, { rx: /^H43\.1[1-3]$/i, eyeAt: 1 }],
  },
  prp: {
    label: "PRP",
    rx: /\bPRP\b|pan-?\s?retinal\s+(?:photocoagulation|laser|photo)|scatter\s+laser/gi,
  },
  eye_surgery_helios: {
    label: "vitrectomy / buckle / glaucoma surgery",
    rx: /\bPPV\b|vitrectomy|scleral\s+buckle|\bbuckle\b|trabeculectomy|\btrab\b|tube\s+shunt|ahmed\s+valve|baerveldt|glaucoma\s+(?:filtering|drainage)\s+surgery/gi,
  },
  macular_pathology: {
    label: "RD / ERM / VMT / macular hole",
    rx: /retinal\s+detachment|\bRRD\b|\bTRD\b|\bRD\b|epiretinal\s+membrane|\bERM\b|\bVMT\b|vitreomacular\s+traction|macular\s+hole|\bFTMH\b|lamellar\s+hole|RPE\s+tear/gi,
    soft: true,
  },
  tki: {
    label: "TKI",
    rx: /\b(?:axitinib|vorolanib|duravyu|axpaxli|EYP-?1901|OTX-?TKI|sunitinib|pazopanib|sorafenib|cabozantinib|lenvatinib|regorafenib|TKI)\b/gi,
  },
};

// ── Small text helpers ───────────────────────────────────────────────────────
const lines = (t) => String(t || "").split(/\r?\n/);
const EYE_TOKENS = [
  [/\bOU\b|\bboth\s+eyes\b|\bbilateral(?:ly)?\b/i, ["OD", "OS"]],
  [/\bOD\b|\bright\s+eye\b/i, ["OD"]],
  [/\bOS\b|\bleft\s+eye\b/i, ["OS"]],
];
function eyesIn(s) {
  const out = new Set();
  for (const [rx, eyes] of EYE_TOKENS) if (rx.test(s)) eyes.forEach((e) => out.add(e));
  return [...out];
}
const HEADER_RX = /^\s*(?:\*\*|__)?\s*\d{1,2}[.)]\s+/;
const EYE_LINE_RX = /^\s*(?:[-*•]\s*)?(OD|OS|OU)\s*[:\-–]/i;
const SECTION_RX = /^\s*(?:\*\*|__)?\s*(?:plan|assessment|a\/p|impression|procedure|tests?|code|diagnos[ie]s|icd)\b/i;

// Eyes a line belongs to when it names none: nearest "OD:" / "OS:" line or numbered
// header above it (stops at a Plan / section heading).
function contextEyes(all, i) {
  for (let j = i - 1; j >= 0 && j >= i - 25; j--) {
    const l = all[j];
    const m = l.match(EYE_LINE_RX);
    if (m) return m[1].toUpperCase() === "OU" ? ["OD", "OS"] : [m[1].toUpperCase()];
    if (HEADER_RX.test(l)) return eyesIn(l);
    if (SECTION_RX.test(l)) return [];
  }
  return [];
}

// Eyes for a match: the eye word nearest to it in its clause — the first one after it
// ("GA OS", "AMD OU with GA OS" → OS), else the last one before it ("OD: CNV").
// No eye in the clause → the line's eyes, then the block above (OD:/OS: line or header).
const EYE_WORD_RX = /\bOU\b|\bboth\s+eyes\b|\bbilateral(?:ly)?\b|\bOD\b|\bright\s+eye\b|\bOS\b|\bleft\s+eye\b/gi;
const eyesOfWord = (w) => eyesIn(w);
function matchEyes(all, i, line, index, len = 0) {
  // clause = the stretch between , ; or ". " that holds the match
  const seps = [...line.matchAll(/[,;]|\.\s/g)].map((m) => m.index);
  const from = Math.max(-1, ...seps.filter((x) => x < index)) + 1;
  const toCands = seps.filter((x) => x >= index + len);
  const to = toCands.length ? Math.min(...toCands) : line.length;
  const words = [...line.slice(from, to).matchAll(EYE_WORD_RX)].map((m) => ({ at: from + m.index, w: m[0] }));
  if (words.length) {
    const after = words.find((x) => x.at >= index + len);
    const before = words.filter((x) => x.at < index).pop();
    return eyesOfWord((after || before).w);
  }
  const e = eyesIn(line);
  if (e.length) return e;
  return contextEyes(all, i);
}

const NEG_WORDS = /^(?:no|not|without|w\/o|negative|neg|denies|absent|free|nor|never)$/i;
const NEG_FILLERS = /^(?:evidence|of|for|signs?|h\/o|hx|history|prior|previous|any|active|significant|visible|definite|obvious|frank|new|current|known|apparent|clinically|recurrent|residual|further|or|and|\/)$/i;
const UNCERTAIN = /(?:\br\/o|\brule\s+out|\bsuspect\w*|\bpossible|\bquestionable|\bprobable|\?\s*)\s*$/i;
const POST_NEG = /^\s*[:\-–]?\s*(?:none|absent|negative|neg\b|resolved|not\s+(?:seen|present|noted)|ruled\s+out)\b/i;

// "no CNV", "no h/o PRP", "without DME", "DME: none", "DME resolved" → negated.
// "no change in CNV" → not negated (CNV is there). "r/o CNV" → uncertain.
function polarity(line, start, end) {
  // Only the current sentence counts ("No GA. CNV OD" → CNV is there).
  let before = line.slice(Math.max(0, start - 80), start);
  const cut = before.search(/[.;]\s[^.;]*$/);
  if (cut >= 0) before = before.slice(cut + 2);
  if (UNCERTAIN.test(before)) return "uncertain";
  // Walk back over fillers and list members ("no NVD/NVE", "no DME, CME", "no PRP or FLT").
  const words = before.replace(/\bh\/o\b/gi, "history").replace(/\bw\/o\b/gi, "without").split(/[\s\/,]+/).filter(Boolean);
  for (let k = words.length - 1, seen = 0; k >= 0 && seen < 6; k--, seen++) {
    const w = words[k].replace(/[():]/g, "");
    if (NEG_WORDS.test(w)) return "negated";
    if (NEG_FILLERS.test(w) || /^[A-Z]{2,5}$/.test(w)) continue;
    break;
  }
  if (POST_NEG.test(line.slice(end, end + 30))) return "negated";
  return "positive";
}

// All matches of one concept in the note (+ its ICD codes).
// → [{ eyes: ["OD"] | ["OD","OS"] | [], polarity, text, lineIndex }]
export function findConcept(noteText, icd10Codes, key) {
  const c = CONCEPTS[key];
  if (!c) return [];
  const all = lines(noteText);
  const out = [];
  all.forEach((line, i) => {
    if (c.requireLine && !c.requireLine.test(line)) return;
    for (const rx of [c.rx, c.rx2].filter(Boolean)) {
      const r = new RegExp(rx.source, rx.flags.includes("g") ? rx.flags : rx.flags + "g");
      let m;
      while ((m = r.exec(line))) {
        if (c.skipLine && c.skipLine.test(line)) break;
        out.push({ eyes: matchEyes(all, i, line, m.index, m[0].length), polarity: polarity(line, m.index, m.index + m[0].length), text: m[0], lineIndex: i, line });
        if (m[0].length === 0) r.lastIndex++;
      }
    }
  });
  for (const code of icd10Codes || []) {
    const raw = String((code && code.code) || "").trim().toUpperCase();
    for (const rule of c.icd || []) {
      if (!rule.rx.test(raw)) continue;
      const d = raw.split(".")[1] || "";
      const e = d[rule.eyeAt];
      const eyes = e === "1" ? ["OD"] : e === "2" ? ["OS"] : e === "3" ? ["OD", "OS"] : [];
      out.push({ eyes, polarity: "positive", text: raw, lineIndex: -1, line: "", icd: true });
    }
  }
  return out;
}

// ── Vision ───────────────────────────────────────────────────────────────────
// Snellen → approximate ETDRS letters (85 + 50·log10(20/x)), "-2"/"+1" adjust.
export function snellenLetters(v) {
  const s = String(v || "").trim();
  if (/^(?:CF|HM|LP|NLP)/i.test(s)) return 0;
  const m = s.match(/^20\/(\d{2,3})\s?(?:([-+])\s?(\d))?$/);
  if (!m) return null;
  const den = Number(m[1]);
  if (!den) return null;
  let letters = Math.round(85 + 50 * Math.log10(20 / den));
  if (m[2]) letters += (m[2] === "-" ? -1 : 1) * Number(m[3]);
  return letters;
}

const VAL = String.raw`(?:20\/\d{2,3}(?:\s?[-+]\s?\d(?![\d\/]))?|CF(?:\s*(?:@\s*)?\d+\s*(?:ft|feet|'))?|HM|NLP|LP)`;
const VA_LEAD = /\b(?:BCVA|VA|Vsc|Vcc|vision|visual\s+acuity)\b(?:\s*(?:cc|sc|ph|\(?ph\)?))?\s*[:\-–]?\s*/i;

// Per-eye vision from the note → { OD: "20/40", OS: "20/100" } (best value per eye).
export function noteVision(noteText) {
  const all = lines(noteText);
  const found = { OD: [], OS: [] };
  all.forEach((line, i) => {
    const lead = line.match(VA_LEAD);
    if (!lead) return;
    let s = line.slice(lead.index + lead[0].length);
    const toks = [];
    for (let guard = 0; s.length && guard < 40; guard++) {
      let k;
      if ((k = s.match(/^(OD|OS|OU)\b/i))) { toks.push({ eye: k[1].toUpperCase() }); s = s.slice(k[0].length); continue; }
      if ((k = s.match(new RegExp(`^${VAL}`, "i")))) { toks.push({ val: k[0].replace(/\s+/g, "") }); s = s.slice(k[0].length); continue; }
      if ((k = s.match(/^(?:\s+|,|;|&|\+|\/|-|–|\band\b|\bcc\b|\bsc\b|\bph\b|\(|\)|\.)/i))) { s = s.slice(k[0].length); continue; }
      break;
    }
    const vals = toks.filter((t) => t.val);
    if (!vals.length) return;
    const eyes = toks.filter((t) => t.eye);
    if (!eyes.length) {
      if (vals.length === 2) { found.OD.push(vals[0].val); found.OS.push(vals[1].val); return; }
      const ctx = contextEyes(all, i).length ? contextEyes(all, i) : eyesIn(all[i - 1] || "");
      if (vals.length === 1 && ctx.length === 1) found[ctx[0]].push(vals[0].val);
      return;
    }
    // "OD 20/40 OS 20/60" → label before; "20/40 OD, 20/60 OS" → label after.
    const pre = !!toks[0].eye;
    toks.forEach((t, k) => {
      if (!t.val) return;
      let eye = null;
      if (pre) { for (let j = k - 1; j >= 0; j--) if (toks[j].eye) { eye = toks[j].eye; break; } }
      else {
        for (let j = k + 1; j < toks.length; j++) { if (toks[j].eye) { eye = toks[j].eye; break; } if (toks[j].val) break; }
        if (!eye) for (let j = k - 1; j >= 0; j--) if (toks[j].eye) { eye = toks[j].eye; break; }
      }
      if (eye === "OU") { found.OD.push(t.val); found.OS.push(t.val); } else if (eye) found[eye].push(t.val);
    });
  });
  const best = (arr) => arr.slice().sort((a, b) => (snellenLetters(b) ?? -1) - (snellenLetters(a) ?? -1))[0] || null;
  return { OD: best(found.OD), OS: best(found.OS) };
}

// ── Dates (for "last dose N months ago") ──────────────────────────────────────
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MON = String.raw`(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?`;
function lastPast(y, m, d, today) {
  let dt = new Date(y, m, d);
  if (y === null) { dt = new Date(today.getFullYear(), m, d); if (dt > today) dt = new Date(today.getFullYear() - 1, m, d); }
  return dt;
}
// Dates written on one line → [Date] (none in the future).
export function lineDates(line, today) {
  const s = String(line || "");
  const out = [];
  const y4 = (y) => (y.length === 2 ? 2000 + Number(y) : Number(y));
  let m;
  const full = /\b(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\b/g;
  while ((m = full.exec(s))) if (+m[1] >= 1 && +m[1] <= 12 && +m[2] >= 1 && +m[2] <= 31) out.push(new Date(y4(m[3]), +m[1] - 1, +m[2]));
  const s2 = s.replace(full, " ");
  const my = /\b(\d{1,2})\/(\d{4})\b/g;
  while ((m = my.exec(s2))) if (+m[1] >= 1 && +m[1] <= 12) out.push(new Date(+m[2], +m[1] - 1, 15));
  const s3 = s2.replace(my, " ");
  const md = /(?<![\d\/])(\d{1,2})\/(\d{1,2})(?![\d\/])/g;
  while ((m = md.exec(s3))) if (+m[1] >= 1 && +m[1] <= 12 && +m[2] >= 1 && +m[2] <= 31) out.push(lastPast(null, +m[1] - 1, +m[2], today));
  const named = new RegExp(String.raw`\b${MON}\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b`, "gi");
  while ((m = named.exec(s))) out.push(new Date(+m[3], MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()), +m[2]));
  const namedNoDay = new RegExp(String.raw`\b${MON}\s+(\d{4})\b`, "gi");
  while ((m = namedNoDay.exec(s))) out.push(new Date(+m[2], MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()), 15));
  const namedNoYear = new RegExp(String.raw`\b${MON}\s+(\d{1,2})(?:st|nd|rd|th)?\b(?!,?\s*\d{4})`, "gi");
  while ((m = namedNoYear.exec(s))) out.push(lastPast(null, MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()), +m[2], today));
  const ago = /\b(\d{1,2})\s*(wks?|weeks?|mos?|months?)\s+ago\b/gi;
  while ((m = ago.exec(s))) { const d = new Date(today); if (/^w/i.test(m[2])) d.setDate(d.getDate() - 7 * +m[1]); else d.setMonth(d.getMonth() - +m[1]); out.push(d); }
  return out.filter((d) => !isNaN(d) && d <= today);
}
const monthsBetween = (a, b) => (b - a) / (1000 * 60 * 60 * 24 * 30.44);
const TODAY_RX = /\btoday\b/i;
// A drug that is only talked about is not a dose ("discussed Syfovre", "consider Izervay").
const NOT_GIVEN_RX = /\b(?:discuss\w*|consider\w*|offer\w*|declin\w*|defer\w*|candidate|option|vs\.?|versus|prior\s+auth\w*|\bPA\b|benefits\s+investigation|BI\b|approv\w*|pending)\b/i;
const CURRENT_RX = /\b(?:now|currently|current|ongoing|continue[sd]?|on\s+treatment|monthly|q\s?\d+\s?(?:wks?|weeks?|w))\b/i;

// ── Check evaluation ─────────────────────────────────────────────────────────
// Cell: { state: "met" | "not_met" | "check" | "none", detail }
const cell = (state, detail = "") => ({ state, detail });
const short = (s) => String(s || "").trim().replace(/\s+/g, " ").slice(0, 70);
const forEye = (matches, eye) => matches.filter((x) => !eye || x.eyes.includes(eye));
const unknownEye = (matches) => matches.filter((x) => !x.eyes.length);

function evalAbsent(note, icd, check, eye) {
  const keys = [].concat(check.concept || check.concepts || []);
  const soft = !!check.soft || keys.some((k) => CONCEPTS[k] && CONCEPTS[k].soft);
  let matches = keys.flatMap((k) => findConcept(note, icd, k));
  if (!matches.length) return cell("none", "not in note");
  const scoped = eye ? forEye(matches, eye) : matches;
  const pos = scoped.filter((x) => x.polarity === "positive");
  if (pos.length) return cell(soft ? "check" : "not_met", `"${short(pos[0].line || pos[0].text)}"`);
  const unsure = scoped.filter((x) => x.polarity === "uncertain");
  if (unsure.length) return cell("check", `"${short(unsure[0].line)}"`);
  if (eye) {
    const unk = unknownEye(matches).filter((x) => x.polarity === "positive");
    if (unk.length) return cell("check", `eye not clear: "${short(unk[0].line || unk[0].text)}"`);
  }
  if (scoped.some((x) => x.polarity === "negated")) return cell("met", "note says no");
  return cell("none", eye ? "not in note for this eye" : "not in note");
}

function evalRecentDrug(note, icd, check, eye, today) {
  const keys = [].concat(check.drugs || []);
  const matches = keys.flatMap((k) => findConcept(note, icd, k));
  const naive = keys.some((k) => CONCEPTS[k] && CONCEPTS[k].naive && CONCEPTS[k].naive.test(note));
  const months = Number(check.months) || 6;
  const clauseOf = (x) => (x.line || "").split(/[;.]\s|,\s(?=[a-z])/).find((p) => p.includes(x.text)) || x.line || "";
  const scoped = (eye ? forEye(matches, eye).concat(unknownEye(matches)) : matches)
    .filter((x) => x.polarity === "positive" && !NOT_GIVEN_RX.test(clauseOf(x)));
  if (!scoped.length) {
    if (naive || matches.some((x) => x.polarity === "negated")) return cell("met", "note says none");
    return cell("none", "not in note");
  }
  let undated = null, recent = null, latest = null;
  for (const x of scoped) {
    if (TODAY_RX.test(x.line)) { recent = { x, mo: 0 }; break; }
    const dates = lineDates(x.line, today);
    if (!dates.length) {
      if (CURRENT_RX.test(x.line)) { if (!recent) recent = { x, mo: 0, current: true }; continue; }
      undated = undated || x; continue;
    }
    const d = new Date(Math.max(...dates.map(Number)));
    const mo = monthsBetween(d, today);
    if (mo < months) { if (!recent || mo < recent.mo) recent = { x, mo }; } else if (!latest || mo < latest.mo) latest = { x, mo };
  }
  if (recent) return cell("not_met", recent.current ? `on ${recent.x.text} now` : recent.mo === 0 ? `${recent.x.text} today` : `${recent.x.text} ~${recent.mo.toFixed(1)} mo ago`);
  if (undated) return cell("check", `${undated.text} in note — date not clear`);
  if (latest) return cell("met", `last ${latest.x.text} ~${Math.round(latest.mo)} mo ago`);
  return cell("none", "not in note");
}

function evalVa(vision, check, eye) {
  const v = eye ? vision[eye] : null;
  if (!v) return cell("none", "not in note");
  const L = snellenLetters(v);
  if (L === null) return cell("check", v);
  const min = Number(check.min_letters);
  if (L >= min) return cell("met", `${v} (≈${L})`);
  if (L >= min - 3) return cell("check", `${v} (≈${L}) — borderline, ETDRS decides`);
  return cell("not_met", `${v} (≈${L})`);
}

function evalAge(note, check) {
  const age = noteAge(note);
  if (age === null) return cell("none", "age not in note");
  const lo = check.min ?? -Infinity, hi = check.max ?? Infinity;
  return age >= lo && age <= hi ? cell("met", String(age)) : cell("not_met", String(age));
}

// One check → { id, label, scope, cells: { OD|OS|"?"|"all": cell } }
export function evaluateCheck(note, icd, check, eyes, ctx) {
  const scope = check.scope || (check.type === "va" ? "eye" : check.type === "age" ? "patient" : "either");
  const cells = {};
  if (scope === "eye") {
    for (const e of eyes) {
      const eye = e === "?" ? null : e;
      if (check.type === "va") cells[e] = eye ? evalVa(ctx.vision, check, eye) : cell("check", "eye not clear");
      else if (check.type === "recent_drug") cells[e] = evalRecentDrug(note, icd, check, eye, ctx.today);
      else if (check.type === "absent") cells[e] = evalAbsent(note, icd, check, eye);
    }
  } else {
    let c;
    if (check.type === "age") c = evalAge(note, check);
    else if (check.type === "recent_drug") c = evalRecentDrug(note, icd, check, null, ctx.today);
    else if (check.type === "absent") c = evalAbsent(note, icd, check, null);
    else c = cell("none", "");
    cells.all = c;
  }
  return { id: check.id, label: check.label, scope, cells };
}

// ── Triggers ─────────────────────────────────────────────────────────────────
// Eyes where the trial's trigger concept is present (not negated) → ["OD"], ["OD","OS"],
// ["?"] (present, eye unknown), or [] (not present).
export function triggerEyes(note, icd, triggers) {
  const keys = [].concat((triggers && triggers.concepts) || []);
  const hits = keys.flatMap((k) => findConcept(note, icd, k)).filter((x) => x.polarity === "positive");
  if (!hits.length) return { eyes: [], hits };
  const eyes = new Set();
  hits.forEach((h) => h.eyes.forEach((e) => eyes.add(e)));
  return { eyes: eyes.size ? ["OD", "OS"].filter((e) => eyes.has(e)) : ["?"], hits };
}

// ── Study-patient detection ──────────────────────────────────────────────────
// The note says the patient IS in the trial — not that it was discussed.
// In: "SIENNA participant", "SIENNA pt", "SIENNA study patient", "SIENNA week 12 visit",
// "per SIENNA protocol", "enrolled in CAPRI", "randomized in the ASCENT trial",
// "patient is in HELIOS-3", "on the SIENNA study". Out: any sentence that discusses,
// refers, declines, screen-fails or calls the patient a candidate.
const ENROLL_BEFORE = /\b(?:enrolled|participant|participating|randomi[sz]ed|subject)\s+(?:in|into|to|on)\s+(?:the\s+)?$/i;
const PT_IN_BEFORE = /\b(?:pt|patient)\s+(?:is\s+)?(?:in|on)\s+(?:the\s+)?$/i;
const ON_BEFORE = /\b(?:in|on)\s+(?:the\s+)?$/i;
const TRIAL_AFTER = /^\s*(?:clinical\s+)?(?:trial|study)\b/i;
const IN_TRIAL_AFTER = /^[\s:\-–(]*(?:study\s+|trial\s+|clinical\s+trial\s+|LTFU\s+|long[-\s]term\s+follow[-\s]?up\s+)?(?:pt\b|patient|participant|subject|study\s+eye|visit|wk\s*\d|week\s*\d|month\s*\d|day\s*\d|baseline|randomi[sz]ed|enrolled|protocol|screening\s+visit|study\s+drug|arm\b)/i;
const PER_BEFORE = /\bper\s+(?:the\s+)?$/i;
const NOT_IN_TRIAL = /\b(?:discuss\w*|candidate|consider\w*|refer\w*|interested|declin\w*|eligib\w*|qualif\w*|may\s+be|possible|prescreen\w*|screen[-\s]?fail\w*|not\s+(?:enrolled|in)|information|brochure)\b/i;

export function studyMentions(noteText, trials) {
  const out = [];
  const sentences = lines(noteText).flatMap((l) => l.split(/(?<=[.;])\s+/));
  for (const t of trials || []) {
    const names = ((t.card_triggers && t.card_triggers.study_names) || []).filter(Boolean);
    let hit = null;
    for (const sentence of sentences) {
      if (hit || NOT_IN_TRIAL.test(sentence)) continue;
      for (const n of names) {
        const esc = String(n).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        for (const m of sentence.matchAll(new RegExp(`(?<![\\w-])${esc}(?![\\w-])`, "gi"))) {
          const before = sentence.slice(0, m.index);
          const after = sentence.slice(m.index + m[0].length);
          if (ENROLL_BEFORE.test(before) || PT_IN_BEFORE.test(before) || (ON_BEFORE.test(before) && TRIAL_AFTER.test(after)) ||
              (PER_BEFORE.test(before) && /^\s*(?:study\s+|trial\s+)?protocol/i.test(after)) || IN_TRIAL_AFTER.test(after)) { hit = short(sentence); break; }
        }
        if (hit) break;
      }
    }
    if (hit) out.push({ trial: t, quote: hit });
  }
  return out;
}

// ── Cards ────────────────────────────────────────────────────────────────────
const contactOf = (t) => (t && t.flag_to ? String(t.flag_to) : "the VRA research coordinator");
const nameOf = (t) => String((t && (t.card_triggers && t.card_triggers.short_name)) || (t && t.acronym) || (t && t.slug) || "").trim();

export function planLines(t) {
  const n = nameOf(t);
  const cond = (t.card_triggers && t.card_triggers.condition) || "this condition";
  return [
    { id: `trial-${t.slug}-yes`, tag: "Interested", text: `Discussed the ${n} clinical trial for ${cond}. Patient interested. Referred to the VRA research coordinator for prescreening.` },
    { id: `trial-${t.slug}-think`, tag: "Will think", text: `Discussed the ${n} clinical trial for ${cond}. Patient will consider it.` },
    { id: `trial-${t.slug}-no`, tag: "Declined", text: `${n} clinical trial discussed. Patient declined.` },
  ];
}

const tally = (checks) => {
  const n = { met: 0, not_met: 0, check: 0, none: 0 };
  checks.forEach((c) => Object.values(c.cells).forEach((x) => { n[x.state] = (n[x.state] || 0) + 1; }));
  return n;
};

// buildTrialCards(note, icd10Codes, trials, { today }) → advisor cards (may be []).
export function buildTrialCards(noteText, icd10Codes = [], trials = [], opts = {}) {
  const note = String(noteText || "");
  const today = opts.today ? new Date(opts.today) : new Date();
  const list = (trials || []).filter((t) => t && t.active !== false && t.scope === "internal");
  const cards = [];

  const inTrial = studyMentions(note, list);
  const inTrialSlugs = new Set(inTrial.map((x) => x.trial.slug));
  if (inTrial.length) {
    cards.push({
      id: "TRIAL-STUDY-PATIENT",
      kind: "trial-reminder",
      title: "Study patient",
      summary: inTrial.map((x) => nameOf(x.trial)).join(", "),
      why: `Shown because the note says: "${inTrial[0].quote}"`,
      items: inTrial.map(({ trial: t }) => ({
        slug: t.slug,
        name: nameOf(t),
        status: t.status,
        text: t.status === "terminated"
          ? `${nameOf(t)} was terminated. Ask ${contactOf(t)} about close-out visits before treating outside the study.`
          : `This patient is in ${nameOf(t)}. Check with ${contactOf(t)} before any treatment outside the protocol.`,
      })),
      sections: [],
    });
  }

  const ctx = { vision: noteVision(note), today };
  for (const t of list) {
    if (t.status !== "enrolling" || inTrialSlugs.has(t.slug)) continue;
    const trig = t.card_triggers;
    const qc = t.quick_checks;
    if (!trig || !qc || !Array.isArray(qc.checks)) continue;
    const { eyes, hits } = triggerEyes(note, icd10Codes, trig);
    if (!eyes.length) continue;
    const checks = qc.checks
      .filter((c) => c && c.id && c.label && ["age", "va", "absent", "recent_drug"].includes(c.type))
      .map((c) => evaluateCheck(note, icd10Codes, c, eyes, ctx));
    const n = tally(checks);
    const textHit = hits.find((h) => !h.icd);
    const eyeTxt = eyes[0] === "?" ? "" : ` ${eyes.length === 2 ? "OU" : eyes[0]}`;
    const icdTxt = hits.filter((h) => h.icd).map((h) => h.text).slice(0, 2).join(", ");
    cards.push({
      id: `TRIAL-${t.slug}`,
      kind: "trial",
      slug: t.slug,
      title: `VRA trial: ${nameOf(t)}`,
      summary: `${n.met} met · ${n.not_met} not met · ${n.check + n.none} to check`,
      why: `Shown because: ${((textHit && textHit.text) || trig.condition || "").trim()}${eyeTxt}${icdTxt ? ` (${icdTxt})` : ""}`,
      status: t.status,
      eyes,
      checks,
      counts: n,
      coordinator: (Array.isArray(qc.coordinator) ? qc.coordinator : []).filter(Boolean).map(String),
      flagTo: contactOf(t),
      nct: t.nct_id || null,
      sections: [{ id: "plan", title: "Add to the Plan", open: true, lines: planLines(t) }],
    });
  }
  return cards;
}

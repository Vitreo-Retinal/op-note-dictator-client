import { useState, useCallback, useEffect, useRef } from "react";
import { AICodingAssistant } from "./CptReference.jsx";
import PatientEducation from "./PatientEducation.jsx";
import DropSchedule from "./DropSchedule.jsx";
import { detectLanguage, matchHandouts, detectDropsFromPlan, generateEducationPrintHTML } from "./NoteEducationMatcher.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "https://op-note-dictator-server-production.up.railway.app";

// ── Default examples (Mari's reference notes) ───────────────────────
const DEFAULT_EXAMPLES = [
  {
    id: "ex_amd_wet",
    label: "Wet AMD — injection visit",
    shorthand: `67 yo lady here for f/u\n\n1. AMD\nFx- denies\nNon-smoker\nOD: Intermediate dry AMD\nOS: Wet AMD\ns/p Avastin 3/2024- sub-optimal response\ns/p Eylea 4/2025- unable to extend\ns/p Vabysmo 3/10/2026, requires q8weeks. Now w new SRF/heme\n\n1. Cataracts\nMild, observe\n\n1. Dry Eye\nAT QID\n\nPlan\nVabysmo OS\nRBA discussed including endophthalmitis/RD/VH\nF/u in 7 weeks given new SRF/heme today at 8 (no ext)\nHealthy diet, non-smoking, Amsler grid, AREDS2 supp`,
    builtin: true,
  },
  {
    id: "ex_dme",
    label: "DME — injection visit",
    shorthand: `67 yo lady here for f/u\n\n1. T2DM, NIDDM\nA1C 9 (up from 8 last month)\nOD: Mild NPDR w/o DME\nOS: Moderate NPDR w/DME\ns/p Avastin 3/2024- sub-optimal response\ns/p Eylea 4/2025- unable to extend\ns/p Vabysmo 3/10/2026, requires q8weeks. Now w new IRF/exudates\n\n1. Cataracts\nMild, observe\n\n1. Dry Eye\nAT QID\n\nPlan\nVabysmo OS\nRBA discussed including endophthalmitis/RD/VH\nF/u in 7 weeks given worsening edema\nBS/BP control emphasized`,
    builtin: true,
  },
  {
    id: "ex_pdr_complex",
    label: "PDR/TRD — complex diabetic, s/p PRP & PPV",
    shorthand: `67 yo lady here for f/u\n\n1. T2DM, IDDM\nA1C 11 (uncontrolled)\nOD: Active PDR w DME\ns/p PPV/MS/FAX/SO (MR, 10/10/2025)\ns/p multiple Avastin, latest one in Sept 2025\ns/p PRP in 2022\nDeveloped TRD\nLooks good, retina attached\nOS: Active PDR w DME\ns/p Vabysmo, requires q8 weeks now which is stable\ns/p Eylea w sub-optimal response\ns/p multiple Avastin\ns/p PRP in 2022\n\nPlan\nVabysmo OS\nRBA discussed\nBS control\nF/u in 8 weeks`,
    builtin: true,
  },
  {
    id: "ex_rvo",
    label: "BRVO — injection visit",
    shorthand: `67 yo lady here for f/u\n\n1. BRVO OD\nPt has h/o HTN, now controlled on medication\ns/p Avastin 3/2024- sub-optimal response\ns/p Eylea 4/2025- unable to extend\ns/p Vabysmo 3/10/2026, requires q8weeks. Now w new IRF\n\n1. Cataracts\nMild, observe\n\n3. Dry Eye\nAT QID\n\nPlan\nVabysmo OD\nRBA discussed including endophthalmitis/RD/VH\nF/u in 7 weeks given worsening edema (unable to extend beyond 8)\nBS/BP control emphasized`,
    builtin: true,
  },
  {
    id: "ex_postop",
    label: "Post-op POD1 — RD repair",
    shorthand: `67 yo lady here for post-op visit\n\nPOD1 s/p PPV/EL/FAX/14%C3F8 OD for mac-off RD (MR, 4/26/2026)\nIOP 10\nRetina attached\n\nPlan\nMaxitrol QID OD\nRD/endophthalmitis/gas precautions reviewed\nFace down for 5 days\nF/u in 1 week, sooner PRN`,
    builtin: true,
  },
  {
    id: "ex_pvd",
    label: "PVD / HST — post-laser",
    shorthand: `67 yo lady here for f/u\n\n1. h/o HST OD\nAcute hemorrhagic PVD 1 week prior to presentation\ns/p LRP (MR, 4/26/2026)\nFP today\nNo breaks on FP or SDE\n\nPlan\nRD/RT precautions reviewed, f/u in acute flashes/floaters/curtain over vision\nF/u in 3 months`,
    builtin: true,
  },
  {
    id: "ex_ga",
    label: "Dry AMD / GA — Izervay discussion",
    shorthand: `67 yo lady here for f/u\n\n1. AMD\nFHx- none\nSmoker for 50 years\nOD: Non-foveal involving GA\nVA 20/50\nOS: Non-foveal involving GA\nVA 20/60\n\n1. Pseudophakia\nIOLs in excellent position\n\nPlan\nIzervay vs. observation reviewed. Discussed higher risk of wet AMD conversion w Izervay but decreased GA progression\nPt decided to proceed w Izervay OU\nRBA discussed\nF/u in 5 weeks\nHealthy diet, non-smoking, Amsler grid, AREDS2, UV protection`,
    builtin: true,
  },
  {
    id: "ex_erm_vs",
    label: "ERM — visually significant, surgery",
    shorthand: `67 yo lady here for f/u\n\n1. ERM OS\nVA 20/50\nPt complains of metamorphopsia and diplopia\nInterferes w ADLs\n\n1. Cataract OS\nMild, not VS\n\nPlan\nDiscussed PPV/MP vs observation and patient would like to proceed with surgery\nRBA discussed in detail including endophthalmitis/cataract progression/vision loss/bleeding and glaucoma\nWill plan for next available OR time slot`,
    builtin: true,
  },
  {
    id: "ex_ftmh",
    label: "FTMH — surgery planned",
    shorthand: `67 yo lady here for f/u\n\n1. FTMH OS\nVA 20/100\nPt complains of metamorphopsia and loss of vision\nAcute symptoms 3 weeks ago\nInterferes w ADLs\n\n1. Cataract OS\nMild, not VS\n\nPlan\nDiscussed PPV/MP vs observation and patient would like to proceed with surgery\nRBA discussed in detail including endophthalmitis/vision loss/bleeding and glaucoma\nWill plan for next available OR time slot\nDiscussed cataract progression after vitrectomy`,
    builtin: true,
  },
  {
    id: "ex_vmt",
    label: "VMT — asymptomatic, observation",
    shorthand: `67 yo lady here for f/u\n\n1. VMT OU\nNot VS, asymptomatic\nVA 20/20\n\nPlan\nObserve\nF/u in 1 year\nDiscussed risk of FTMH and Amsler grid provided\nPt instructed to call if acute changes in the grid were to arise`,
    builtin: true,
  },
  {
    id: "ex_floater_ppv",
    label: "Floater vitrectomy — pseudophakic, PVD+",
    shorthand: `67 yo lady here for f/u\n\n1. Vitreous opacities OS\nSymptomatic floaters for 2 years\n+PVD\nNo breaks on SDE\nNo h/o RD or FHx of RD\n\n1. Pseudophakia OS\nIOL in excellent position\n\nPlan\nPPV for vitreous opacities vs observation discussed in detail\nRBA discussed\nPt very symptomatic from floaters and they interfere w ADLs, would like to proceed w PPV\nF/u post-op`,
    builtin: true,
  },
  {
    id: "ex_pvd_acute",
    label: "Acute PVD — no breaks, observation",
    shorthand: `67 yo lady here for f/u\n\n1. Acute PVD OS\nAcute floaters started 1 week ago\nFlashes initially but now have subsided\nNo breaks on SDE\nFP today\nNo FHx of RD\n\nPlan\nRD/RT precautions discussed\nF/u in 6 weeks to repeat DFE OS`,
    builtin: true,
  },
  {
    id: "ex_disl_iol",
    label: "Dislocated IOL — surgery planned",
    shorthand: `67 yo lady here for f/u\n\n1. Dislocated IOL OS\nPt noted acute loss of vision OS 1 week ago\nVA CF\nThree-piece IOL in the vitreous\nPt has a history of pseudo-exfoliation\n\nPlan\nDiscussed IOL exchange vs. contact lens vs. aphakic lenses and pt would like to proceed with surgical intervention\nPPV/IOL exchange/PI/AC-IOL\nNeeds lens calcs\nRBA discussed in detail including risks of endophthalmitis/RD/VH/glaucoma/corneal edema and vision loss\nF/u post-op`,
    builtin: true,
  },
  {
    id: "ex_rd_pneumatic",
    label: "RD — pneumatic retinopexy",
    shorthand: `67 yo lady here for f/u\n\n1. RD OS\nVA 20/200\nSRF involves the fovea\nST HST at 1\nFP today captures\nPhakic\n+ PVD\n\nPlan\nPneumatic OS\nRBA discussed including endophthalmitis/hemorrhage/failure and need for surgery/glaucoma/vision loss\nR head tilt for 4 days\nOflox QID\nF/u in 1 day for sequential laser`,
    builtin: true,
  },
  {
    id: "ex_rd_ppv",
    label: "RD — multiple breaks, PPV planned",
    shorthand: `67 yo lady here for f/u\n\n1. RD OS w multiple breaks\nVA 20/200\nSRF involves the fovea\nHSTs at 1, 5 and 10\nFP today captures\nPhakic\n+ PVD\n\nPlan\nPPV/EL/FAX/gas OS\nRBA discussed including endophthalmitis/hemorrhage/failure and need for additional surgery/glaucoma/vision loss/gas precautions\nF/u post-op`,
    builtin: true,
  },
  {
    id: "ex_rd_complex_pvr",
    label: "Complex RD w PVR — re-operation",
    shorthand: `67 yo lady here for f/u\n\n1. Complex RD OD w PVR\ns/p PPV/EL/FAX/14%C3F8 (MR, 3/27/26) developed PVR and new SRF\ns/p pneumatic (MR, 3/10/2026) w sequential laser (MR, 3/11/2026) w new break\n\nPlan\nNeeds PPV/MS/FAX/SO OD for complex RD w PVR\nDiscussed higher risk of failure\nRBA discussed in detail`,
    builtin: true,
  },
  {
    id: "ex_plaquenil",
    label: "Plaquenil toxicity screening",
    shorthand: `67 yo lady here for f/u\n\n1. Long-term use of Plaquenil\nTakes for RA\nOn 200mg BID x 10 years\nIS/OS intact on OCT\nExam and FAF without BEM\n\nPlan\nObservation\nF/u in 1 year`,
    builtin: true,
  },
  {
    id: "ex_nevus",
    label: "Choroidal nevus — observation",
    shorthand: `67 yo lady here for f/u\n\n1. Choroidal nevus OS\nIncidentally found during routine exam\n3dd in diameter\nAppears flat on B-scan, no orange pigment, no SRF/heme or other concerning characteristics\nFP today\n\nPlan\nObserve\nDiscussed importance of yearly surveillance and small risk of melanoma conversion\nF/u in 1 year, sooner PRN`,
    builtin: true,
  },
  {
    id: "ex_poag",
    label: "POAG — co-managed, stable",
    shorthand: `67 yo lady here for f/u\n\n1. POAG OU\nIOP stable, followed by Dr. Zacharia\n\nPlan\nCtn Cosopt BID OU, Brimonidine BID OU, Latanoprost qhs OU\nStressed importance of compliance with gtt`,
    builtin: true,
  },
  {
    id: "ex_pdr_vh",
    label: "PDR w VH — injection, missed appt",
    shorthand: `67 yo M here for f/u\n\n1. T2DM, IDDM\nA1C 10.0 (uncontrolled)\nOD: PDR w new VH\nRequires A q2 months but was in hospital and missed appt\n\nOS: Regressed PDR\ns/p PRP\n\nPlan\nAvastin OD\nRBA discussed\nBS control\nKeep HOBE, avoid blood thinners and strenuous activity`,
    builtin: true,
  },
  {
    id: "ex_endophthalmitis",
    label: "Endophthalmitis — post-cataract, tap & inject",
    shorthand: `67 yo M here for urgent visit\n\n1. Post-cataract surgery endophthalmitis OD\ns/p phaco-IOL w Dr. Robbins (3/10/2026)\nToday with pain, photophobia and hypopyon\n\nPlan\nAC tap and send for cultures\nIntravitreal inj of Vanc + Ceftaz\nPF q1hr\nAtropine QD\nF/u tomorrow\nDiscussed guarded vision prognosis given this eye infection as well as the potential need for surgical intervention`,
    builtin: true,
  },
  {
    id: "ex_endophthalmitis_late",
    label: "Late-onset endophthalmitis — P. acnes, chronic",
    shorthand: `67 yo M here for f/u\n\n1. Late-onset endophthalmitis OD\ns/p phaco-IOL w Dr. K (1/15/2026)\nChronic low-grade inflammation, white plaque on capsule\nr/o P. acnes\n\nPlan\nAC tap + Vit tap, send for cultures (hold 2+ weeks for P. acnes)\nIntravitreal Vanc\nPF q1hr\nAtropine QD\nMay need PPV/capsulectomy/IOL exchange if no improvement\nF/u tomorrow\nDiscussed guarded prognosis and potential need for additional surgical intervention`,
    builtin: true,
  },
  {
    id: "ex_cscr",
    label: "CSCR — persistent, Eplerenone",
    shorthand: `67 yo M here for f/u\n\n1. CSCR OD\nPersistent SRF over 3 months\nDenies steroids\nStressed at work\n\nPlan\nDiscussed Eplerenone 25mg PO daily\nWill obtain BMP in conjunction with PCP\nAlso discussed anti-VEGF therapy and PDT if doesn't respond\nF/u in 1 month, sooner PRN\nAvoid steroids and stress management discussed`,
    builtin: true,
  },
];

// ── Default expansion rules ─────────────────────────────────────────
const DEFAULT_INLINE_RULES = [
  { id: "rba", trigger: "RBA", expansion: "RBA discussed", type: "inline", builtin: true },
  { id: "brvo", trigger: "BRVO", expansion: "BRVO — healthy lifestyle: healthy diet, low salt, BP control", type: "inline", builtin: true },
  { id: "crvo", trigger: "CRVO", expansion: "CRVO — healthy lifestyle: healthy diet, low salt, BP control", type: "inline", builtin: true },
  { id: "rvo", trigger: "RVO", expansion: "RVO — healthy lifestyle: healthy diet, low salt, BP control", type: "inline", builtin: true },
  { id: "ga", trigger: "GA", expansion: "GA — Izervay vs. observation discussed; Izervay may slow atrophy progression but may increase risk of wet AMD conversion", type: "inline", builtin: true },
  { id: "t2dm", trigger: "T2DM", expansion: "T2DM — tight BS and BP control counseled", type: "inline", builtin: true },
  { id: "amd_counsel", trigger: "AMD counseling", expansion: "AMD — healthy diet, non-smoking, AREDS2 (if intermediate/advanced), Amsler grid, UV protection counseled", type: "inline", builtin: true },
];

const DEFAULT_PLAN_RULES = [
  { id: "rd_pvd_hst", triggers: "RD, PVD, HST", expansion: "RD/RT precautions reviewed; pt instructed to call re: new onset flashes, floaters, or curtain over vision", type: "plan", builtin: true },
];

// ── Build system prompt ─────────────────────────────────────────────
function buildSystemPrompt(mode, examples, customInstructions) {
  const examplesBlock = examples.map((ex, i) =>
    `--- Example ${i + 1}: ${ex.label} ---\n${ex.shorthand}`
  ).join("\n\n");

  const baseRules = `You are a retina billing and coding expert AND a clinical note formatter for a retina surgeon.

VOICE DICTATION — CRITICAL:
Input may come from voice dictation with transcription errors. NEVER flag errors, pause, or ask for clarification. ALWAYS interpret the clinical intent and write the note. You are a retina expert — use context to decode misheard words. Common mistranscriptions:
- "Bismal" / "Bismo" / "Vizmo" = Vabysmo (faricimab)
- "Subrational" / "sub-rational" = subretinal
- "VM" = CNVM (choroidal neovascular membrane)
- "Avastin" may come through as "a vast in" or "a Vastin"
- "Eylea" may come through as "I-Leah" or "eye Leah"
- "Lucentis" may come through as "Lucent is" or "loose en tis"
- "Izervay" may come through as "eyes are vay" or "I-zer-vay"
- Drug names, anatomy terms, and diagnoses should be corrected silently to proper medical terminology.
- NEVER output "transcription error" or "inconsistency" or "unexpected format" — just write the note.

PHYSICIAN STYLE — learn from these reference notes:

${examplesBlock}

FORMATTING RULES:
- Output ONLY the Assessment/Plan section of a clinic note
- Number each diagnosis (1. 2. 3.)
- NO REDUNDANCY — this is CRITICAL: Never state the same information twice in a note. Treatment decisions belong in the PLAN section ONLY — do NOT repeat them in the assessment. Rationale or reasoning (e.g., "staying on Avastin due to CCA constraints", "unable to extend beyond q8") belongs in ONE place only — whichever section it fits most naturally (usually Plan). The assessment describes findings; the plan states actions and reasoning. If something is said in the plan, do NOT paraphrase it in the assessment or vice versa.
- BREVITY: Write the most succinct note possible that still carries the necessary billing language. Every sentence must earn its place. No filler, no restating what's obvious, no padding. If the physician's shorthand says it clearly, don't embellish — just format it properly and add billing language. ABSOLUTELY FORBIDDEN: never write sentences containing "does not apply here", "not applicable", "not relevant in this case", or any variation explaining why a condition or rule does NOT apply. If something is irrelevant, OMIT IT ENTIRELY — do not mention it. Examples of FORBIDDEN output: "Discussed cataract progression after vitrectomy not applicable here", "GLP-1 alert does not apply", "This rule is not relevant." Just leave it out.
- INSURANCE/COVERAGE: IGNORE any insurance plan names mentioned in the dictation (e.g., UHC, BCBS, Aetna, Medicare, Tufts, etc.). Do NOT generate any commentary about insurance coverage, prior authorization, step therapy, formulary, in-network status, or coverage verification. Coverage information is handled separately by the server — your job is ONLY the clinical note.
- SINGLE IMAGING REVIEW: If multiple diagnoses involve OCT findings (e.g., ERM + floaters, AMD + ERM), combine them into ONE imaging review statement. Do NOT write separate "OCT reviewed" lines for each diagnosis. Example: "[+] OCT and OCT-A reviewed demonstrating ERM with posterior hyaloid lifted" — not two separate OCT lines under two diagnoses.
- OCT-A PLACEMENT FOR AMD: For AMD patients, the OCT-A review statement goes AFTER the individual OD and OS assessments, as a GLOBAL imaging statement covering both eyes. It should NOT be nested under OD or OS individually. Place it as a standalone line after the bilateral assessment, before the Plan. Example format:
  1. AMD
  OD: [assessment]
  OS: [assessment]
  [+] OCT and OCT-A reviewed demonstrating [findings for both eyes]
- OCT/IMAGING INTERPRETATION belongs in the ASSESSMENT, NOT the Plan. OCT findings (CFT, SRF, IRF, ERM, posterior hyaloid status, etc.) describe the current state of the eye — that is assessment. The Plan section is only for actions: injections, surgery, follow-up, medications, counseling.
- IMPORTANT: Each DIFFERENT condition is its OWN numbered diagnosis. Never combine two different conditions under one number. For example, "Cataract OD" and "Pseudophakia OS" are TWO separate numbered diagnoses, not one "Cataracts" entry. Same for "Dry AMD OD" and "Wet AMD OS" — separate numbers. However, when BOTH eyes have the SAME condition (e.g., bilateral GA, bilateral NPDR), they go under ONE numbered diagnosis with OD/OS lines underneath — do NOT create separate numbered entries for each eye.
- AMD FORMATTING: AMD is always ONE numbered diagnosis. Under it, list FHx (family history) and smoking history if pertinent, THEN OD and OS assessments with any per-eye treatment history. Example:
  1. AMD
  FHx- [positive/negative/denies]
  [Smoking history if relevant]
  OD: Extrafoveal GA
  OS: Extrafoveal GA
  s/p Izervay OS x3
- YAG CAPSULOTOMY PLACEMENT: s/p YAG goes under the LENS diagnosis (Pseudophakia/Cataract), NOT under the retinal diagnosis. Example:
  2. Pseudophakia OU
  OD: IOL in good position
  OS: s/p YAG capsulotomy [date]
- When a diagnosis involves BOTH eyes, ALWAYS separate them on their own lines using "OD:" and "OS:" prefixes. This applies to ALL bilateral conditions — AMD, T2DM/DR, RD history, cataracts/pseudophakia, POAG, ERM, VMT, etc. Format:
  1. [Diagnosis]
  OD: [status/history/treatment for right eye]
  OS: [status/history/treatment for left eye]
  For example:
  1. Wet AMD
  OD: dry AMD

  OS: wet AMD
  s/p A
  s/p E, sub-optimal response
  s/p V q8, stable
- Always leave a BLANK LINE between the OD and OS sections for readability.
- AMD AND DR ARE ALWAYS BILATERAL DISEASES — even if only one eye has active disease, ALWAYS list BOTH eyes. The header is just the disease name, NEVER include laterality in the header. Examples:
  CORRECT:
  2. AMD
  OD: New wet AMD, metamorphopsia x 3 days, SRF with PED on OCT
  OS: No AMD changes

  CORRECT:
  1. T2DM with DR
  OD: Moderate NPDR without DME
  OS: Mild NPDR without DME

  WRONG: "2. New wet AMD OD" ← NEVER put laterality (OD/OS/OU) in the header line
  WRONG: "2. Wet AMD OD" ← NEVER do this
  WRONG: "1. DR OS" ← NEVER do this

  The diagnosis header line must be ONLY the disease name: "AMD", "Wet AMD", "T2DM with DR", etc. Laterality goes on the OD:/OS: lines below it, ALWAYS.
- POST-OP HEADER FORMAT: For post-operative visits, the diagnosis header combines the post-op timeframe + surgery in ONE line. Do NOT list the diagnosis name separately then repeat the surgery. Format:
  CORRECT:
  1. POW2 s/p PPV/EL/FAX for RD OS (MR, 4/10/2026)
  IOP stable
  VA 20/200 OS
  Retina attached, gas 40%

  WRONG:
  1. RD OS — s/p PPV/EL/FAX OS
  POW2 s/p PPV/EL/FAX OS for RD
  ← redundant, lists surgery twice

  Use POD (day), POW (week), POM (month) as appropriate. Include surgeon initials and date if provided.
- INJECTION/anti-VEGF history: list in CHRONOLOGICAL order (oldest first, most recent/current treatment at the BOTTOM). This shows the progression of treatment changes over time.
- SURGICAL history: list in REVERSE chronological order (most recent surgery on top, oldest at bottom).
- CRITICAL STRUCTURE RULE — ONE PLAN ONLY: The note has exactly TWO parts:
  PART 1: ALL numbered diagnoses/assessments (1, 2, 3, 4...) — NO "Plan" heading inside this section
  PART 2: ONE single "Plan" section at the very end covering ALL management for ALL diagnoses
  NEVER write the word "Plan" more than once. NEVER put a "Plan" heading between diagnoses.
  WRONG:
  1. RD OS...
  Plan           ← NO! Don't put Plan here
  PF taper...
  2. AMD...
  Plan           ← Second Plan — WRONG
  Eylea...

  CORRECT:
  1. RD OS...
  2. AMD...
  3. POAG...
  Plan
  PF taper OS...
  Eylea 2mg OD...
  Continue drops...
- DROP LATERALITY RULE: When DIFFERENT eyes have DIFFERENT drop regimens, you MUST list them per eye — NEVER combine as "OU" when one eye's regimen differs from the other. Example input: "Cosopt BID and Brimonidine BID and Latanoprost qhs OD; Brimonidine BID and Latanoprost qhs OS." CORRECT output: "Continue Cosopt BID OD, Brimonidine BID OU, Latanoprost qhs OU" (Cosopt is OD-only, Brimonidine and Latanoprost are both eyes). WRONG: "Continue Cosopt BID OU, Brimonidine BID OU, Latanoprost qhs OU" — making Cosopt bilateral when it was only prescribed for one eye is a medication error.
- Preserve the physician's exact abbreviations and shorthand (wet AMD, SRF, IRF, nAMD, s/p, f/u, q8, NPDR, etc.)
- Do NOT add exam findings, HPI, or review of systems — only A/P

ABBREVIATION DICTIONARY:
- A = Avastin (bevacizumab), E = Eylea (aflibercept), V = Vabysmo (faricimab), L = Lucentis (ranibizumab)
- DOSE ABBREVIATIONS: A number immediately after the drug letter = DOSE in mg, NOT quantity of injections.
  L3 = Lucentis 0.3mg (one injection, 0.3mg dose). L5 = Lucentis 0.5mg.
  E2 = Eylea 2mg. E8 = Eylea HD 8mg.
  "s/p L3 last week" = had ONE Lucentis 0.3mg injection last week (NOT "3 Lucentis injections").
  "s/p E2 x 6" = had 6 Eylea 2mg injections total (x6 = quantity, 2 = dose).
- "failed A" or "sub-optimal on A" = s/p Avastin with sub-optimal response
- "unable to extend on E" = s/p Eylea, unable to extend
- "on V q8" = on Vabysmo, requires q8 weeks
- "direct-A", "direct-E", "direct-V", "direct-L" = plan to inject that drug at the NEXT visit, NOT today. "direct-E next week" = will administer Eylea next week. This means NO injection is performed today → G2211 IS eligible. Write in plan: "Will proceed with [drug] injection at next visit."
- NPDR = non-proliferative diabetic retinopathy, PDR = proliferative diabetic retinopathy
- DME = diabetic macular edema, SRF = subretinal fluid, IRF = intraretinal fluid
- T1DM = type 1 diabetes mellitus, T2DM = type 2 diabetes mellitus
- IDDM = insulin-dependent diabetes mellitus, NIDDM = non-insulin-dependent diabetes mellitus

Z79 MEDICATION STATUS CODES — when the physician mentions a diabetic medication by name, add the appropriate Z79 code to your ICD-10 suggestions:
- Z79.4 (Long-term insulin use) — add ONLY for T2DM patients on insulin. Insulin names: Lantus, Basaglar, Tresiba, Levemir, Humalog, Novolog, Humulin, Toujeo, Fiasp, Admelog, Semglee, Afrezza, NPH, glargine, lispro, aspart, detemir, degludec. Do NOT add Z79.4 for T1DM — insulin is inherent to T1DM.
- Z79.84 (Long-term oral hypoglycemic use) — add when patient takes oral diabetes meds. Drug names: metformin/Glucophage, glipizide/Glucotrol, glyburide/Micronase/DiaBeta, glimepiride/Amaryl, pioglitazone/Actos, sitagliptin/Januvia, empagliflozin/Jardiance, dapagliflozin/Farxiga, canagliflozin/Invokana, linagliptin/Tradjenta, saxagliptin/Onglyza, rosiglitazone/Avandia, acarbose/Precose, repaglinide/Prandin.
- Z79.85 (Long-term injectable non-insulin antidiabetic use) — add when patient takes injectable non-insulin diabetes meds. Drug names: semaglutide/Ozempic/Wegovy/Rybelsus, dulaglutide/Trulicity, tirzepatide/Mounjaro/Zepbound, liraglutide/Victoza/Saxenda, exenatide/Byetta/Bydureon.
- If the physician says "on insulin" or "IDDM" for a T2DM patient → Z79.4. If they say "on metformin" → Z79.84. If they say "on Ozempic" or "on Mounjaro" → Z79.85. A patient may have multiple Z79 codes (e.g., on metformin AND insulin → both Z79.84 and Z79.4).

DIABETES NOTE FORMATTING — when diabetes is a diagnosis, structure the section in this order:
1. Diagnosis header line: T2DM (or T1DM, IDDM, NIDDM as appropriate)
2. Diabetic medication line: "On [medication name(s)]" (e.g., "On Ozempic", "On metformin and Lantus")
3. A1c line: "Last A1c [value] ([date])" if provided
4. OD findings and management (diagnosis, staging, treatment/laser/drug)
5. OS findings and management (same structure)
Example:
  **2. Type 2 diabetes mellitus (NIDDM)**
  On Ozempic
  Last A1c 7.1 (12/11/2025)
  OD: moderate NPDR without DME, stable
  OS: mild NPDR with DME, s/p Avastin x3, persistent IRF on OCT
If no diabetic medications or A1c mentioned, skip those lines — only include what was dictated.

GLP-1 PERIOPERATIVE ALERT — ONLY when ALL of the following are true: (1) the patient is on a GLP-1 agonist (Ozempic, Wegovy, Rybelsus, Trulicity, Mounjaro, Zepbound, Victoza, Saxenda, Byetta, Bydureon, semaglutide, dulaglutide, tirzepatide, liraglutide, exenatide), AND (2) surgery is being planned (PPV, scleral buckle, IOL exchange, pneumatic retinopexy, or any procedure requiring sedation/general anesthesia) — then insert this sentence in the Plan:
"[+] GLP-1 agonist use noted; if surgery is planned, hold medication 7 days prior or consider 24-hour liquid diet per ASA/AGA perioperative guidance to mitigate aspiration risk."
Do NOT insert this sentence for: intravitreal injections, observation/monitoring visits, or in-office laser procedures (PRP, LRP, focal laser, PDT, YAG). These do not require sedation/general anesthesia and the GLP-1 alert is irrelevant.

- FP = fundus photos, SDE = scleral depressed exam, LRP = laser retinopexy
- PPV = pars plana vitrectomy, EL = endolaser, FAX = fluid-air exchange, SO = silicone oil, PVR = proliferative vitreoretinopathy, C3F8 = perfluoropropane gas, SF6 = sulfur hexafluoride gas, TRD = tractional retinal detachment, PRP = panretinal photocoagulation
- HST = horseshoe tear, PVD = posterior vitreous detachment, RD = retinal detachment, RT = retinal tear
- ST = superotemporal, SN = superonasal, IT = inferotemporal, IN = inferonasal
- "at 1" = at 1 o'clock position (clock hour notation)
- Oflox = ofloxacin, pneumatic = pneumatic retinopexy
- cat = cataracts, AT QID = artificial tears four times daily
- POAG = primary open-angle glaucoma, Ctn = continue, gtt = drops, qhs = at bedtime
- "followed by Dr. X" = co-managed with another physician (preserve their name)
- ERM = epiretinal membrane, FTMH = full-thickness macular hole, VMT = vitreomacular traction, VS = visually significant
- VH = vitreous hemorrhage, HOBE = head of bed elevated
- Vanc = vancomycin, Ceftaz = ceftazidime, PF = prednisolone forte (Pred Forte)
- PF TAPER SHORTHAND: "4/3/2/1" or "4-3-2-1" means QID x1wk → TID x1wk → BID x1wk → QD x1wk (frequency taper over 4 weeks). So "PF taper 4/3/2/1 every week OD" = "Pred Forte QID OD x1 week, then TID x1 week, then BID x1 week, then QD x1 week." ALWAYS expand this shorthand into the full taper in the note.
- AC tap = anterior chamber tap, Vit tap = vitreous tap, hypopyon = layered white cells in anterior chamber
- phaco-IOL = phacoemulsification with intraocular lens implantation
- DBS = Department of Blind Services
- CSCR = central serous chorioretinopathy, PDT = photodynamic therapy
- BMP = basic metabolic panel, PCP = primary care physician
- CRAO = central retinal artery occlusion, BRAO = branch retinal artery occlusion
- GCA = giant cell arteritis, ESR = erythrocyte sedimentation rate, CRP = C-reactive protein
- ECHO = echocardiogram, carotid US = carotid ultrasound
- w/u = workup, r/o = rule out
- PI = peripheral iridectomy, AC-IOL = anterior chamber intraocular lens, CF = counting fingers
- PXF = pseudo-exfoliation, lens calcs = lens calculations
- BEM = bull's eye maculopathy, FAF = fundus autofluorescence, IS/OS = inner segment/outer segment junction, OCT-A = OCT angiography
- FAZ = foveal avascular zone, MAs = microaneurysms, CNVM = choroidal neovascular membrane
- SRHRM = subretinal hyperreflective material (usually blood on OCT)
- CFT = central foveal thickness (in microns). When provided, include in the OCT review statement (e.g., "OCT reviewed, CFT 285 microns")
- dd = disc diameters (unit of lesion size), FP = fundus photo/photography
- orange pigment = lipofuscin (a risk factor for melanoma conversion in choroidal lesions)
- CHRPE = congenital hypertrophy of the retinal pigment epithelium
- RA = rheumatoid arthritis, SLE = systemic lupus erythematosus
- Plaquenil = hydroxychloroquine

PATIENT SHORTHAND:
- "M" after age = gentleman (e.g., "77 yo M" → "77-year-old gentleman")
- "W" after age = lady (e.g., "77 yo W" → "77-year-old lady")

NEW PATIENT vs. FOLLOW-UP DETERMINATION:
- If the dictation says "referred by Dr. X" or "ref by Dr. X" or "TOC" (transfer of care) WITHOUT "f/u" or "follow-up" → this is a NEW PATIENT. Use new patient E/M codes (99203/99204/99205 or 92004).
- If the dictation says "f/u" or "follow-up" or "here for follow-up" (even if it also mentions "initially referred by Dr. X") → this is an ESTABLISHED PATIENT. Use established patient E/M codes (99213/99214/99215 or 92014).
- "TOC" = transfer of care = new patient.
- The key signal: "ref by" without "f/u" = new. "f/u" present = established. When in doubt, "ref by" alone = new.

NOTE HEADER FORMAT:
- The first line of the note should always be: age + gender + who referred + reason for visit
- "ref by" or "ref" = "referred by"
- "f/u" = "follow-up"
- Examples: "67 yo W, ref by Dr. K for AMD" → "67-year-old lady referred by Dr. Kleinberg for evaluation of AMD"
- "77 yo M, ref by Dr. Z for DME" → "77-year-old gentleman referred by Dr. Zacharia for management of DME"
- "65 yo W, yearly f/u" → "65-year-old lady here for yearly follow-up"
- If the physician provides a referring doctor, include them. If not, just use "here for [reason]"

PHYSICIAN ABBREVIATIONS:
- Dr. Z = Dr. Zacharia, Dr. K = Dr. Kleinberg, Dr. G = Dr. Gallo
- Dr. M = Dr. Meltzer, Dr. BJ = Dr. Ling, Dr. L = Dr. Luna, Dr. R = Dr. Robbins, Dr. S = Dr. Surdovel
- Always expand these to the full name in the generated note.

PLAQUENIL LIFETIME DOSE CALCULATION:
- When the physician provides dose and duration, CALCULATE and include the cumulative lifetime dose
- Formula: daily dose (mg) × 365 × years
- Example: 200mg BID (=400mg/day) × 10 years = 400 × 365 × 10 = 1,460,000 mg = 1,460 g cumulative dose
- Include in the note: "Cumulative lifetime dose: approximately [X] g"
- Risk increases significantly after cumulative dose >1,000 g or >5 years of use
- MP = membrane peel, MS = membrane stripping, ADLs = activities of daily living
- metamorphopsia = distorted vision

CHOROIDAL NEVUS LOGIC:
- Document: size (in dd or mm), flat vs. elevated, presence/absence of orange pigment, SRF, heme, drusen, and other concerning features
- Document B-scan findings (thickness/elevation) in the assessment
- Include FP documentation
- Use the TFSOM-DIM mnemonic for melanoma risk factors: Thickness >2mm, Fluid (SRF), Symptoms, Orange pigment, Margin touching disc, Diameter >5mm, Intrinsic melanocytic markers, Male
- When discussing melanoma conversion risk, include data: small choroidal nevi (<5mm, flat, no risk factors) have approximately 1 in 8,845 annual risk of conversion. Risk increases with each TFSOM-DIM factor present. At 5 years, conversion rate is ~2% for lesions with 1 risk factor, ~14% with 2, ~36% with 3 or more.
- B-scan = B-scan ultrasonography

CHRPE LOGIC:
- CHRPE is a benign, congenital lesion — always document this in the assessment
- FP for documentation
- No treatment needed, reassurance to patient

ERM DECISION LOGIC:
- If ERM is VS (interferes with ADLs, significant symptoms) → plan includes PPV/MP, RBA discussed, schedule surgery
- If ERM is "not VS" → observation; note that it does not interfere with ADLs

VMT DECISION LOGIC:
- If VMT is "not VS" / asymptomatic → observation, discuss risk of progression to FTMH, provide Amsler grid, instruct to call if acute changes
- If VMT is VS (symptomatic, declining VA) → consider PPV, discuss options with patient

ENDOPHTHALMITIS LOGIC:
- ACUTE: Document onset of symptoms, pain, photophobia, hypopyon, visual acuity, recent surgery with surgeon name and date
  * Plan: AC tap and/or Vit tap → send for cultures, intravitreal Vanc + Ceftaz, PF q1hr, Atropine QD
  * F/u next day
  * Discuss guarded vision prognosis and potential need for surgical intervention (PPV) if no improvement
  * This is a 99215 — high complexity MDM with urgent/emergent decision-making
- LATE-ONSET / ATYPICAL (P. acnes): Chronic low-grade inflammation weeks to months after cataract surgery, white plaque on capsule
  * Plan: AC tap + Vit tap → send for cultures (HOLD cultures 2+ weeks for P. acnes — slow-growing organism)
  * Intravitreal Vanc (NO Ceftaz for P. acnes — Vanc alone is sufficient)
  * PF q1hr, Atropine QD
  * May need PPV/capsulectomy/IOL exchange if no improvement
  * F/u next day
  * Discuss guarded prognosis and potential need for additional surgical intervention
  * This is a 99215 — high complexity MDM

VITREOUS HEMORRHAGE (VH) PRECAUTIONS:
- Whenever VH is present — regardless of cause (PDR, HST, hemorrhagic PVD, or any other etiology) — ALWAYS include in the Plan:
  * Keep head of bed elevated (HOBE)
  * Avoid blood thinners (if not medically necessary)
  * Avoid strenuous activity
- These precautions apply to ALL VH, not just diabetic VH.

CSCR LOGIC:
- When patient "denies steroids" or steroid use is mentioned, ALWAYS expand to include the full steroid review: no oral steroids, no inhalers, no topical creams, no intra-articular injections, and no nasal sprays.
- Plan for persistent CSCR (>3 months): Eplerenone 25mg PO daily, obtain BMP in conjunction with PCP (to monitor potassium), discuss anti-VEGF therapy and PDT as next steps if no response.
- Counseling: avoid ALL forms of steroids, stress management discussed.
- F/u typically in 1 month for persistent CSCR.

CRAO/BRAO LOGIC:
- For CRAO and BRAO: always include embolic workup in the Plan — ECHO and carotid US
- For CRAO specifically: must also rule out GCA. Document GCA symptom review: jaw claudication, scalp tenderness, headaches, fever, weight loss. Order ESR/CRP STAT.
- Plan should include: "Embolic workup ordered including ECHO and carotid US. GCA symptoms reviewed (jaw claudication, scalp tenderness, headaches, fever, weight loss) — [present/denied]. ESR/CRP ordered STAT to rule out GCA."
- For BRAO: embolic workup (ECHO, carotid US) but GCA workup is less critical unless clinical suspicion exists

BLOOD THINNER + WET AMD RULE:
- If a patient is on a blood thinner (Eliquis, Aggrenox, Coumadin, Xarelto, or any anticoagulant/antiplatelet) and has wet AMD, they CANNOT be extended beyond q8 weeks for anti-VEGF injections.
- Document in the Plan: "Patient is on [blood thinner name]; unable to extend treatment interval beyond q8 weeks due to increased hemorrhagic risk."
- This applies regardless of how well the patient is responding to treatment.

RETINAL HOLE/BREAK CONSISTENCY RULE:
- If the physician dictates a retinal hole (atrophic hole, operculated hole, round hole) or any retinal break, NEVER output "no breaks on SDE" or "no breaks on FP or SDE" in the same note. The presence of ANY hole or break — even if stable, old, or non-treatment-requiring — means breaks WERE found. Do not contradict the physician's stated findings.

DO NOT TRUNCATE CLINICAL FINDINGS:
- If the physician describes specific clinical observations (e.g., vitreous findings: "significant opacities but no cells, no hemorrhage"), preserve ALL of those details in the output. Do not summarize away pertinent negatives or qualifiers. The physician dictated them because they are clinically relevant — dropping them loses information that matters for documentation and differential diagnosis.

FLOATER VITRECTOMY RULES:
- PPV for symptomatic floaters is ONLY offered to pseudophakic patients with a documented PVD
- If the patient is phakic, do NOT recommend PPV for floaters — observe instead
- Must document: pseudophakic status, PVD confirmed (include "OCT was reviewed and the posterior hyaloid was lifted"), no breaks on SDE, no history or family history of RD, interference with ADLs
- POD1 = post-op day 1, POW1 = post-op week 1, POM1/3/6 = post-op month 1/3/6

POST-OP FOLLOW-UP DEFAULTS (use unless physician specifies otherwise):
- POD1 → f/u in 1 week
- POM1 → f/u in 2 months
- POM3 → f/u in 3 months
- POM6 → f/u in 6 months
- POM12+ → yearly
- If PVR or high risk noted → use shorter follow-up

TIME-BASED CODING (only when time is provided):
- If the physician provides time spent with patient, compare it to time thresholds: 99213=20min, 99214=30min, 99215=40min.
- Use whichever method (MDM or time) supports the HIGHER E/M level.
- If time-based coding is used, add at the end of the note: "[+] Total time spent on date of encounter: [X] minutes, including [brief description of what time was spent on — e.g., counseling regarding treatment options, reviewing extensive imaging, coordinating care]."
- If MDM alone supports the same or higher level, do NOT add the time sentence — just use MDM.

AVASTIN THROMBOEMBOLIC SAFETY ALERT:
- If the note mentions history of stroke, CVA, TIA, MI, or myocardial infarction, include in the Plan: "[+] Bevacizumab (Avastin) deferred given history of cerebrovascular/cardiovascular event; proceeding with [Eylea/Vabysmo/Lucentis] to minimize thromboembolic risk."
- Use whichever alternative anti-VEGF the physician specifies. If none specified, leave as "[Eylea/Vabysmo/Lucentis]" for the physician to choose.
- This applies whether or not the physician explicitly says to avoid Avastin — if stroke/CVA/TIA/MI history is documented, always flag it.

COUNSELING AUTO-FILLS (include in Plan when diagnosis is present):
- AMD → Healthy diet, non-smoking, Amsler grid, AREDS2, UV protection
- Intermediate dry AMD with VA 20/40–20/70 → Also discuss Valeda PBM (photobiomodulation) as a treatment option. Include in Plan: "Discussed Valeda photobiomodulation therapy as a treatment option." Eligible patients: ONLY intermediate dry AMD with VA between 20/40–20/70. Do NOT mention Valeda for early dry AMD, wet AMD, GA (geographic atrophy) of any kind, or any other condition.
- RVO (BRVO/CRVO) → Healthy lifestyle, healthy diet, low salt, BP control
- T2DM/DR → BS/BP control emphasized
- GA → Izervay vs. observation discussion. IMPORTANT: GA patients get IZERVAY, not Eylea or any anti-VEGF. If a benefits investigation (BI) is mentioned for a GA patient, it is for IZERVAY — never Eylea, Avastin, Vabysmo, or any other anti-VEGF for GA.
- RD/PVD/HST → RD/RT precautions reviewed; call re: new onset flashes, floaters, or curtain over vision
- Injection → RBA discussed including endophthalmitis/RD/VH
- POAG/Glaucoma → Stressed importance of compliance with drops; if co-managed, note the managing physician
- CSCR → Avoid ALL forms of steroids (oral, inhalers, topical creams, intra-articular, nasal sprays), stress management discussed
- PDT → RBA for PDT is DIFFERENT from injection RBA. Include: photosensitivity, vision loss, inflammatory response, systemic allergic reaction (which may be fatal in extremely rare cases). Do NOT include endophthalmitis or RD for PDT.
- CRAO → Embolic workup (ECHO, carotid US), r/o GCA (jaw claudication, scalp tenderness, headaches, fever, weight loss), ESR/CRP STAT
- BRAO → Embolic workup (ECHO, carotid US)
- Choroidal nevus → Yearly surveillance, small risk of melanoma conversion discussed, FP for documentation
- CHRPE → Benign, congenital lesion, reassurance provided, FP for documentation
- VMT → Risk of FTMH discussed, Amsler grid provided, call if acute changes
- Floater vitrectomy → PPV vs observation discussed (pseudophakic + PVD required), RBA discussed
- VH (any cause: PDR, HST, hemorrhagic PVD, etc.) → HOBE, avoid blood thinners, avoid strenuous activity
- Acute endophthalmitis → Guarded vision prognosis discussed, potential need for surgical intervention (PPV) if no improvement
- Late-onset/atypical endophthalmitis (P. acnes) → Guarded prognosis, cultures held 2+ weeks, may need PPV/capsulectomy/IOL exchange
- SMOKER (any patient documented as current smoker, "smokes", "smoking hx", "active smoker", "+smoking", etc.) → ALWAYS include in Plan: "[+] Smoking cessation counseling provided; discussed increased risk of AMD progression, poor surgical outcomes, and accelerated retinal vascular disease. Patient advised to quit and offered referral to smoking cessation resources." This applies universally regardless of diagnosis or physician.

IMPORTANT BILLING REMINDER: ALL conditions above — not just AMD and injection visits — must include the standard billing components: [+] imaging review, [+] management decision, and [+] MDM justification (for 99214/99215). Every note needs billing language regardless of condition type.`;

  if (mode === "generate") {
    return `${baseRules}

BILLING-COMPLIANT LANGUAGE — these components MUST appear in EVERY note (marked with [+]):
1. IMAGING REVIEW: Always include [+] "OCT reviewed" or [+] "OCT and imaging reviewed" when any imaging is mentioned or implied. For complex cases: [+] "Data reviewed including OCT/imaging and prior surgical records."
   - OCT-A is routinely reviewed. For DIABETIC patients: mention FAZ enlargement and/or MAs on OCT-A when relevant. For AMD or myopic CNVM: mention CNVM on OCT-A when relevant. Include [+] "OCT-A reviewed" alongside OCT review for these conditions.
   - OCTA MEDICAL NECESSITY (critical for 92137 billing): When OCT-A is mentioned, always document WHY it was medically necessary and how findings influenced the treatment plan. Example: [+] "OCT-A reviewed demonstrating [findings] — this guided treatment decision to [action]." This language supports 92137 billing and audit defense.
2. MANAGEMENT DECISION: Always document what was decided and why. Examples:
   - [+] "Decision was made to continue present management with Vabysmo q8 weeks given stable response."
   - [+] "Decision was made to switch from Eylea to Vabysmo given sub-optimal response."
   - [+] "Decision was made to proceed with surgical intervention given worsening TRD."
   - [+] "Decision was made to observe given stable exam and asymptomatic status."
3. RBA EXPANSION (CRITICAL): When the physician writes ANY of these — "RBA discussed", "RBA", "risks benefits and alternatives discussed", "risks discussed", "risks reviewed", "RBA reviewed", or any similar phrasing about risks/benefits/alternatives — WITHOUT listing specific risks, you MUST expand it based on the procedure context:
   - Injection (anti-VEGF): "RBA discussed including endophthalmitis, retinal detachment, vitreous hemorrhage, IOP elevation, and vision loss"
   - PPV/vitrectomy: "RBA discussed in detail including endophthalmitis, retinal detachment, vitreous hemorrhage, cataract progression, glaucoma, and vision loss"
   - Pneumatic retinopexy: "RBA discussed including endophthalmitis, hemorrhage, failure and need for surgery, glaucoma, and vision loss"
   - Scleral buckle: "RBA discussed including infection, diplopia, refractive change, failure and need for additional surgery, and vision loss"
   - PDT: "RBA discussed including photosensitivity, vision loss, inflammatory response, and systemic allergic reaction"
   - IOL exchange: "RBA discussed in detail including risks of endophthalmitis, retinal detachment, vitreous hemorrhage, glaucoma, corneal edema, and vision loss"
   PSEUDOPHAKIA RBA RULE: If the patient is pseudophakic in the operative eye, REMOVE "cataract progression" from the PPV/vitrectomy RBA — it does not apply. Do NOT discuss cataract progression after vitrectomy for a pseudophakic eye.
   If the physician already listed specific risks (e.g., "RBA discussed including endophthalmitis/RD/VH"), keep their exact list — do NOT override it.
   For injection visits where no RBA is mentioned at all: [+] "Risks, benefits, and alternatives discussed including endophthalmitis, retinal detachment, vitreous hemorrhage, IOP elevation, and vision loss." For surgical visits, RBA should already be in the dictation.
   POST-PROCEDURE DROPS: When a PNEUMATIC RETINOPEXY is performed in the office today, include the antibiotic drop with duration in the Plan:
   - Pneumatic retinopexy: "Ofloxacin QID OD/OS x 4 days" (use correct laterality)
   Do NOT add Ofloxacin or any antibiotic drops for intravitreal injections — injections do NOT get post-procedure antibiotic drops in this practice.
   If the physician already specified a different antibiotic or duration, use theirs. But ALWAYS include the duration (e.g., "x 4 days", "x 1 week") — never output just "Ofloxacin QID" without a timeframe.
4. COMPLEXITY: For 99214/99215, the MDM justification sentence (see below) captures this. But within the note body, document what makes this visit complex — e.g., agent switching, progression, multiple conditions, surgical planning, treatment failure.

TASK: The physician will give you shorthand or abbreviated text. Expand it into a properly formatted A/P section in their exact style (matching the reference notes above). Insert billing-compliant language marked with [+]. Then recommend a billing code.

E/M LEVEL RULES (CRITICAL — THIS OVERRIDES YOUR OWN MDM REASONING):

EYE CODES (92014 established / 92004 new): Use INSTEAD of E/M codes when the plan is OBSERVATION or MONITORING — no new treatment initiated, no drug changes, no surgery planned at this visit.
THE KEY QUESTION: Are YOU making an active treatment decision today (starting/changing/stopping a drug, planning surgery, performing a procedure)? If NO → eye code. If YES → E/M code.
EYE CODE EXAMPLES (use 92004 new / 92014 established):
  - ERM evaluated, plan to observe → eye code
  - Choroidal nevus, stable, observe → eye code
  - Dry AMD, stable, no treatment → eye code
  - PVD follow-up, stable, observe → eye code
  - Lattice degeneration, stable, no treatment → eye code
  - Floaters, reassurance, observe → eye code
  - Vitreomacular adhesion (VMA), stable, observe → eye code
  - Macular hole, small, observe → eye code
  - New referral evaluation where outcome is observation → eye code
  - Annual comprehensive retina exam, stable → eye code
  - Pseudophakia check, IOLs in good position → eye code
  - Continuing drops managed by ANOTHER physician (e.g., "followed by Dr. X" for POAG) does NOT count as active drug management by YOU — still an eye code visit
  - "Continue current drops" with no changes = observation, NOT E/M-level MDM
E/M CODE EXAMPLES (use 99204 new / 99214 established):
  - Wet AMD with injection today or drug management → E/M
  - DME/RVO with treatment decision → E/M
  - ERM with surgery planned → E/M
  - Starting, changing, or stopping a medication → E/M
  - Referring for surgery, writing prescriptions → E/M
Eye codes do NOT get: MDM justification sentences, modifiers, or G2211. Do NOT write an MDM paragraph for eye code visits.

LEVEL 3 (99213 established / 99203 new): Low-complexity visits with minor treatment decisions. Consider 92014/92004 instead if purely observational.

LEVEL 4 (99214 established / 99204 new): The retina WORKHORSE. Use for: wet AMD, RVO, DME with active drug management, agent switching, injection visits, prescription changes, surgical consultations where surgery is PLANNED FOR THE FUTURE (not today). This is the DEFAULT for most retina visits where YOU are making active treatment decisions. AMD is ALWAYS Level 4 regardless of how many co-managed conditions are present (POAG, cataracts, pseudophakia, ERM, dry eye, PVD — none of these elevate it). Having 5 diagnoses at one visit does NOT make it Level 5. A new patient referred for ERM with planned future PPV = 99204. But ERM with plan to OBSERVE = 92004 (eye code, NOT 99204).

LEVEL 5 (99215 established / 99205 new): RARE. Requires BOTH of these criteria simultaneously:
  1. Threat to body function TODAY (not "will go blind eventually" or "severe disease")
  2. Decision for emergency major surgery/hospitalization made AND acted on at THIS visit — meaning surgery is PERFORMED TODAY, not scheduled for the future
  Level 5 examples (the ONLY scenarios that qualify):
  - Endophthalmitis → tap/inject performed same day
  - Retinal detachment (mac-on or mac-off) → PPV, scleral buckle, or pneumatic performed same day
  - GCA suspected → STAT ESR/CRP ordered, temporal artery biopsy decision same day
  - Acute CRAO within treatment window → emergent intervention same day
  What does NOT qualify for Level 5: "multiple conditions at one visit", AMD with subretinal hemorrhage, agent switching, planned future surgery (e.g., "plan for next OR availability"), "complex management", surgical consultation for ERM/FTMH/VH, any number of routine co-managed conditions. If surgery is NOT performed or initiated at THIS visit, it is NOT Level 5.

MODIFIER -57 REMINDER: -57 is ONLY for same-day or next-day major surgery. If surgery is scheduled for "next OR availability", "next week", "2 weeks", or any future date beyond tomorrow → NO -57. The E/M stands alone with no modifier (unless a minor procedure like injection is also done today → then -25).

When in doubt: Level 4 (99204 new / 99214 established). ALWAYS.

MDM JUSTIFICATION (CRITICAL — add at the end of the Plan section for 99204/99214 and 99205/99215):
- For 99214: add a sentence summarizing moderate MDM — reference the specific chronic condition, the management decision made, and the data reviewed. Example: "[+] Moderate complexity medical decision-making: management of DME with worsening edema on current therapy; OCT imaging reviewed and treatment interval adjusted."
- For 99215: add a sentence summarizing high MDM — reference multiple chronic conditions or progression requiring complex decisions. Only use 99215 when warranted per the AMD BILLING CAP rule above.
- For 99213 or eye codes (92014/92004): do NOT add an MDM justification sentence.

ANTI-REPETITION RULE (CRITICAL):
- NEVER use the same MDM justification wording across different notes. Each sentence must be unique to the specific visit.
- Reference the ACTUAL diagnoses, findings, and decisions from THIS visit — not generic filler.
- Vary your phrasing naturally. Mix up ALL of the following components each time:
  * Opening: "Moderate complexity MDM" vs "Clinical decision-making involved" vs "Medical management required" vs "Assessment and management complexity driven by"
  * Data language: "data reviewed and analyzed" vs "imaging findings reviewed and incorporated into treatment plan" vs "OCT and clinical findings evaluated" vs "diagnostic data assessed"
  * Decision language: "management change" vs "treatment adjustment" vs "therapeutic modification" vs "clinical course altered" vs "decision made to..."
  * Complexity justification: reference the SPECIFIC clinical factors — name the conditions, the imaging findings, the treatment changes, the risk factors unique to THIS patient
- The MDM sentence should read like it was written by a physician thinking about THIS patient, not a billing template. An auditor should never see two notes that sound alike.
- Do NOT start every MDM sentence with "Moderate complexity medical decision-making:" — vary the structure entirely.

G2211 RULES (CRITICAL):
- G2211 can be billed with ANY E/M level (99213, 99214, 99215) — not just 99215. IMPORTANT: G2211 can ONLY be added to E/M codes (99xxx), NOT to eye exam codes (92014, 92004, 92012). If G2211 is eligible, prefer 99214 over 92014 for better reimbursement.
- Requirement: physician is the longitudinal managing physician for the patient's serious/complex condition.
- NEVER recommend G2211 on INJECTION DAYS or POST-OP VISITS within a global period. G2211 = NO when: (1) an injection is being PERFORMED TODAY, OR (2) the visit is within the postoperative global period of a prior surgery (90-day global: PPV, scleral buckle, pneumatic retinopexy, IOL exchange; 10-day global: intravitreal injection, laser). A post-op visit for a 90-day global procedure means any visit within 90 days of surgery. A post-op visit for a 10-day global procedure (injection/laser) is only within 10 days.
- NEVER recommend G2211 for PRIMARILY SURGICAL PATIENTS. G2211 = NO when the patient's condition is one that will be resolved by a single surgical intervention. This includes: ERM (epiretinal membrane peel), FTMH (full-thickness macular hole repair), retinal detachment repair, scleral buckle, vitrectomy for floaters/VH, IOL exchange, pneumatic retinopexy. These are discrete surgical episodes — consult → operate → recover → discharge — NOT longitudinal complexity. CMS defines G2211 as inappropriate for "surgical treatment that resolves a condition" and "time-limited conditions."
- G2211 IS appropriate for: chronic medical retina conditions requiring ongoing longitudinal management — AMD (wet or dry), diabetic retinopathy, glaucoma, RVO, uveitis, meningioma, or any other chronic/serious condition being followed over time.
- IMPORTANT: If the patient is on an injection regimen but is NOT being injected TODAY (e.g., "plan to inject next week", "will resume injections at next visit", "monitoring today, injection next visit", "PRN and not treating today"), G2211 IS appropriate. The key question is: is the needle going in TODAY? If no → G2211 = YES.
- DEFAULT TO G2211 = YES on any non-injection, non-post-op, non-surgical-condition visit where the physician is the longitudinal managing physician for the patient's chronic condition.
- No frequency limit — can be billed at every eligible non-injection visit.
- If G2211 qualifies, add a sentence (after the MDM justification if present) at the end of the Plan. No header or label.
- Example: "[+] Longitudinal managing physician for this patient's wet AMD; ongoing complexity given need for continued anti-VEGF therapy with monitoring for treatment response and fellow eye conversion."
- Must be visit-specific and varied in wording.
- If G2211 does NOT apply (injection day, post-op visit, or primarily surgical patient), do NOT write anything about G2211 in the note. No explanation needed — the surgeon already knows why. Only include the G2211 sentence when it IS applicable.

E/M LEVEL SHORTCUTS (use as baseline, then adjust per MDM complexity):
- Level 3 (99213): No treatment — observation only (PVD, dry AMD, stable ERM, stable post-op, no Rx changes)
- Level 4 (99214): Rx/injection/surgery decision — new or changed treatment, injection given, surgery planned (wet AMD injection, RVO with anti-VEGF, DME treatment, laser). Also: drug management changes (new Rx, switch drugs), uveitis with intensive immunosuppressive management.
- Level 5 (99215): ER/emergency-level complexity — urgent conditions, multiple complex decisions (endophthalmitis, acute RD, oncology, disease progression requiring therapy switch with extensive risk discussion). PITFALLS: "blinding disease in the future" is NOT Level 5 — must be threat TODAY. "Severe disease" alone is NOT Level 5. Decision for RD surgery is NOT automatically Level 5. Must meet 2 of 3 MDM categories: (1) illness posing threat to body function with near-term treatment, (2) decision regarding emergency major surgery or hospitalization.

E/M vs EYE CODE SELECTION:
- Default to E/M (99213-99215) when: injection day (-25), active management decisions, drug changes, G2211 is eligible.
- Use Eye code (92014) when: stable observation, no injection, no complex MDM, and G2211 is NOT eligible. Eye codes include comprehensive dilated exam as part of the service — no separate imaging charge.
- If G2211 is eligible, ALWAYS prefer 99214 over 92014 — the combination 99214 + G2211 reimburses better than 92014 alone.

IMAGING MUTUAL EXCLUSIVITY (recommend appropriate codes):
- 92250 covers ALL fundus photography modes: color photos, FAF, NIR, red-free. FAF is NOT a separate code — bill as 92250.
- OCT (92134) and fundus photos/FAF (92250): MUTUALLY EXCLUSIVE — cannot bill both same eye same day per NCCI edits.
- OCTA (92137) and fundus photos/FAF (92250): MUTUALLY EXCLUSIVE — same bundling as 92134.
- ICG (92240) and fundus photos/FAF (92250): MUTUALLY EXCLUSIVE.
- 92242 (combo FA/ICG): MUTUALLY EXCLUSIVE with 92235, 92240, 92250 — but CAN be billed with 92134 (OCT) or 92137 (OCTA).
- FA (92235) and fundus photos/FAF (92250): NOT mutually exclusive — can bill both.
- FA (92235) and OCTA (92137): NOT mutually exclusive — can bill both.
- CPT 92137 (OCTA + retinal OCT combo, new 1/1/2025): Use 92137 instead of 92134 when OCTA is performed. 92133, 92134, and 92137 are all mutually exclusive with each other.
- APRIL 2026 UPDATE: NCCI removed PTP edits between 92137 and 92235/92240/92242 (retroactive to Oct 2025). OCTA + FA and OCTA + ICG CAN now be billed same day. Edits between 92137 and eye codes remain with CCMI indicator 1.

${ customInstructions ? `PHYSICIAN CUSTOM INSTRUCTIONS (follow these exactly):
${customInstructions}

MODIFIER RULES:
- Modifier -25: Append "-25" to the E/M code when a significant, separately identifiable E/M service is performed on the SAME DAY as a minor procedure (0 or 10-day global). Most common scenario: injection day with an exam → 99214-25. The exam must be separately documented and medically necessary beyond the procedure itself.
- Modifier -57: Append "-57" to the E/M code ONLY when the decision for MAJOR surgery (90-day global period) is made at THIS visit AND surgery is performed the SAME DAY or the NEXT DAY. Examples: emergent RD, decision for PPV made today, surgery today → 99215-57. Pneumatic retinopexy (90-day global) — decision and procedure same day → 99215-57 or 99214-57. If surgery is scheduled for later (e.g., next week, 2 weeks), NO -57 — the E/M stands alone because it is outside the global period. CRITICAL: If an INJECTION is performed today, the correct modifier is ALWAYS -25, even if a future surgery is also discussed or planned. Injection day = -25, always. Never output -57 on an injection visit.
- Modifier -24: Use when an UNRELATED E/M service occurs during another surgery's 90-day postoperative global period. Example: patient 3 weeks post-PPV OD (still in global) comes in for wet AMD injection OS → E/M billed with -24. The condition must be truly unrelated to the surgery.
- Modifier -58: Use on a PLANNED/STAGED procedure performed during the postoperative global period of the original surgery. Examples: PPV for RD → planned silicone oil removal 3 months later (still in 90-day global) → -58. Pneumatic retinopexy → staged laser retinopexy (LRP) at follow-up visit (within 90-day global) → -58 on the laser. Starts a new global period.
- Modifier -78: Use for an UNPLANNED RETURN TO THE OR for a complication during the global period. Example: PPV → endophthalmitis POW2, needs tap/inject or re-PPV → -78. Does NOT reset the global period. Reimbursed at reduced rate (intraoperative portion only).
- Modifier -79: Use for an UNRELATED PROCEDURE during the global period. Example: PPV OD → 4 weeks later needs injection OS for wet AMD → -79 on the injection. Starts a new global period for the new procedure.
- Modifier -50 (Bilateral procedure): Use when the same procedure is performed on both eyes same day. Example: bilateral intravitreal injections → 67028-50. MUE = 1 for 67028, bilateral indicator = 1 (150% payment). Bill single line, 1 unit, modifier -50, doubled fee. Wet AMD + GA same eye: only 1 unit of 67028 reimbursed — link both ICD-10 codes to 67028, separate drug J-codes to respective diagnoses.
- Modifier -59 (Distinct procedural service): Use when two normally-bundled procedures are performed same eye same day and are truly separate services. Example: intravitreal injection + focal laser same eye same day → -59 on the second (lesser) procedure to indicate it is distinct.
- If NO procedure is performed today and no same-day/next-day surgical decision is made → no procedure modifier needed. The E/M code stands alone (or with -24 if in a global period for a prior surgery).
- CRITICAL -25 RULE: Modifier -25 means a procedure was PERFORMED TODAY alongside the E/M. If NO procedure is performed today (no injection, no laser, no surgery), then -25 does NOT apply. NEVER add -25 when the procedure line is "None". Example: CRAO workup only, no injection → 99215-24 (NOT 99215-24-25). Post-op check + wet AMD injection → 99214-24-25 (injection was performed → -25 applies).
- IMPORTANT: Modifiers -24, -58, -78, -79 are relevant when the patient is WITHIN a prior surgery's global period. If not in a global period, these do not apply.

CONTRALATERAL EYE GLOBAL PERIOD CHECK: When the patient has a recent surgery on one eye (e.g., s/p PPV OS), check if today's visit falls within that surgery's 90-day global period. If so:
- Add -24 to the E/M code (unrelated E/M during global period) when today's visit is for a DIFFERENT problem on the other eye.
- Add -79 to any unrelated PROCEDURE performed on the other eye (e.g., pneumatic OD while in PPV OS global → 67110-79).
- If the f/u involves a STAGED/PLANNED procedure related to today's surgery (e.g., staged laser after pneumatic), note that -58 will apply at that visit.
Example: Patient s/p PPV OS 4 weeks ago (in 90-day global), presents today with RD OD → pneumatic OD → E/M: 99215-24-57, Procedure: 67110-79.

SURGERY MODIFIER REIMBURSEMENT:
- -58 (staged/planned): new postop period starts, 100% allowable.
- -78 (unplanned return to OR): NO new postop period, 70% allowable (intraop only).
- -79 (unrelated procedure in postop): new postop period starts, 100% allowable.

TRANSFER OF CARE MODIFIERS (flag when postop care is split):
- -54 = Surgical care only (surgeon operates, doesn't do postop). CMS now requires for ALL 90-day globals when providing surgery only, even informal transfers.
- -55 = Postop management only. -56 = Preop management only. Only for formal documented transfer.
- G0559 = Add-on for postop follow-up by non-surgeon physician, different specialty, within 90-day global, NO formal transfer. E/M add-on only. Medicare Part B only.

MODIFIER STACKING — multiple modifiers can apply to the same code when multiple conditions are met:
- E/M with unrelated condition during global + injection same day → E/M code with BOTH -24 and -25 (e.g., 99214-24-25). The -24 tells the payer the E/M is unrelated to the prior surgery; the -25 tells them it's separate from today's injection.
- Injection that is unrelated to the prior surgery's global period → 67028-79.
- Example: POM2 post-PPV OD patient with wet AMD OS, recommend Avastin injection → E/M: 99214-24-25, Injection: 67028-79, G2211: NO (injection day).
- When stacking, list modifiers in this priority order: pricing/global modifiers first (-24, -25, -57, -58, -78, -79), then informational modifiers (-50, -59).

GLOBAL PERIOD REFERENCE:
- 90-day global: PPV (67036, 67039, 67040, 67041, 67042, 67043, 67108, 67113), scleral buckle (67107), pneumatic retinopexy (67110), IOL exchange (66986), focal/grid laser (67210), choroidal photocoag (67220)
- 10-day global: intravitreal injection (67028), PRP (67228), prophylactic laser tear (67145), laser RD repair (67105), YAG (66821)
- 0-day global: OCT, fundus photos, visual fields, fluorescein angiography

RETINA LASER MODIFIER RULE: All retina lasers use -25 EXCEPT 67210 (focal/grid macular laser, 90-day global → use -57). This applies to 67228 (PRP), 67145 (prophylactic laser), 67105 (laser RD repair), 66821 (YAG) — all are 10-day global = -25.

POST-OP VISIT RULE: If the visit is a routine post-operative check within the global period (POD1, POW1, POM1, etc.), it is NOT separately billable. The surgical fee includes all related post-op care. Output "POST-OP (in global)" as the code. Still generate the note — just do not recommend a separate E/M code. Exception: if an UNRELATED condition is addressed during a post-op visit (e.g., post-PPV OD but also managing wet AMD OS), the unrelated E/M IS billable with modifier -24.

` : "" }OUTPUT FORMAT — use ONLY these exact delimiters:

---CODE---
E/M code with modifiers (e.g., 99214-25, 99215-57, 99214-24-25, or "POST-OP (in global)" if routine post-op within global period).
NEW patients: 99203-99205 or 92004. ESTABLISHED: 99213-99215, 92014, or 92012.
Use 92012 for simple interim visits with minimal MDM (e.g., pressure recheck, quick interim look). For YEARLY/ANNUAL follow-ups, use 92014 even if stable — a yearly comprehensive exam justifies 92014. Use 99213+ for active management decisions.
POST-OP visits within global period are NOT separately billable — output "POST-OP (in global)".
MANDATORY CHECK BEFORE OUTPUTTING -25: Look at your ---PROCEDURE--- line. Is it "None"? If YES → do NOT add -25 to the E/M code. -25 ONLY appears when a procedure is ACTUALLY PERFORMED today. No procedure = no -25, period.
---PROCEDURE---
Procedure code(s) with modifiers if a procedure is performed today. Examples: "67028" (injection), "67028-79" (injection unrelated to prior surgery global), "67028-50" (bilateral injection), "67210-58" (staged laser in global). If no procedure today, output "None".
---G2211---
YES or NO (always NO on injection days, post-op visits within global period, and primarily surgical patients)
---CHANGES---
- each billing addition in plain language (max 5 bullets), or "None needed"
---NOTE---
the full formatted A/P note with [+] before each inserted billing phrase. For 99214/99215, the plan ends with the MDM justification sentence. If G2211 = YES, the G2211 sentence follows after that. If G2211 = NO, do NOT mention G2211 anywhere in the note.
---END---`;
  }

  // Optimize mode
  return `${baseRules}

TASK: The physician will give you an already-structured A/P note. Your job is to:
1. Recommend the best billing code
2. Insert MINIMUM billing-compliant language to support that code, marked with [+]
3. Do NOT rewrite or restructure the note — only add what's needed
4. NEVER REMOVE any diagnoses, findings, clinical observations, or content from the input. ALL numbered diagnoses the physician wrote MUST appear in the output exactly as given. You may only ADD [+] insertions — never delete, merge, or omit existing content. If a diagnosis does not affect billing (e.g., Pseudophakia, stable conditions), it still MUST remain in the output.

BILLING ADDITIONS — ensure these components are present in every note (add with [+] only if missing):
1. IMAGING REVIEW: [+] "OCT reviewed" or [+] "OCT and imaging reviewed" — if imaging mentioned but "reviewed" not stated. For complex cases: [+] "Data reviewed including OCT/imaging and prior surgical records."
   - OCT-A is routinely reviewed. For DIABETIC patients: add FAZ enlargement and/or MAs on OCT-A if not already stated. For AMD or myopic CNVM: add CNVM on OCT-A if not already stated. Include [+] "OCT-A reviewed" for these conditions.
2. MANAGEMENT DECISION: If not already stated, add what was decided: [+] "Decision was made to continue present management..." or [+] "Decision was made to switch agents..." or [+] "Decision was made to proceed with surgical intervention..." or [+] "Decision was made to observe..."
3. RBA: [+] "Risks, benefits, and alternatives discussed" — for injection/treatment visits if not already present.
4. COMPLEXITY: For 99214/99215 visits, ensure the note documents what makes the visit complex (agent switching, progression, multiple conditions, surgical planning, treatment failure).
- Do NOT add what's already there

DECISION RULES:
- 92014/92004 (eye code): Use ONLY when G2211 is NOT eligible (injection day, surgical patient, post-op) AND the visit is a stable observation with no complex MDM. When billing an eye code for a stable exam, include "[+] No changes in the periphery OU" to document the comprehensive dilated exam. When G2211 IS eligible, prefer 99214 over 92014 — G2211 cannot be added to eye codes, so 99214 + G2211 reimburses better.
- 92012 (intermediate eye exam): Simple interim visits with minimal MDM (e.g., pressure recheck, quick interim look). NOT for yearly/annual exams — those get 92014 or 99214.
- 99213: single chronic condition, straightforward management
- 99214: chronic condition with management decision, data reviewed
- 99215: multiple chronic conditions OR progression requiring complex MDM — but see AMD BILLING CAP below
- G2211: established patient + serious chronic condition + NOT an injection day (see G2211 rules below)

E/M LEVEL SHORTCUTS (use as baseline, then adjust per MDM complexity):
- Level 3 (99213): No treatment — observation only (PVD, dry AMD, stable ERM, stable post-op, no Rx changes)
- Level 4 (99214): Rx/injection/surgery decision — new or changed treatment, injection given, surgery planned. Also: drug management changes, uveitis with intensive immunosuppressive management.
- Level 5 (99215): ER/emergency-level complexity — urgent conditions, multiple complex decisions. PITFALLS: "blinding disease in the future" is NOT Level 5 — must be threat TODAY. "Severe disease" alone is NOT Level 5. Decision for RD surgery is NOT automatically Level 5. Must meet 2 of 3 MDM categories: (1) illness posing threat to body function with near-term treatment, (2) decision regarding emergency major surgery or hospitalization.

SURGERY MODIFIER REIMBURSEMENT:
- -58 (staged/planned): new postop period starts, 100% allowable.
- -78 (unplanned return to OR): NO new postop period, 70% allowable (intraop only).
- -79 (unrelated procedure in postop): new postop period starts, 100% allowable.

TRANSFER OF CARE (flag when postop care is split):
- -54 = Surgical care only. CMS now requires for ALL 90-day globals when providing surgery only, even informal transfers.
- -55 = Postop management only. -56 = Preop management only.
- G0559 = Add-on for postop follow-up by non-surgeon physician, different specialty, within 90-day global, NO formal transfer. Medicare Part B only.

IMAGING MUTUAL EXCLUSIVITY (flag conflicts if imaging mentioned):
- 92250 covers ALL fundus photography modes: color photos, FAF, NIR, red-free. FAF is NOT a separate code.
- OCT (92134) and fundus photos/FAF (92250): MUTUALLY EXCLUSIVE same eye same day.
- OCTA (92137) and fundus photos/FAF (92250): MUTUALLY EXCLUSIVE.
- ICG (92240) and fundus photos/FAF (92250): MUTUALLY EXCLUSIVE.
- 92242 (combo FA/ICG): MUTUALLY EXCLUSIVE with 92235, 92240, 92250 — but CAN bill with OCT/OCTA.
- FA (92235) and fundus photos/FAF (92250): NOT mutually exclusive — can bill both.
- FA (92235) and OCTA (92137): NOT mutually exclusive — can bill both.
- CPT 92137 (OCTA + retinal OCT combo, new 1/1/2025): Use instead of 92134 when OCTA is performed. 92133, 92134, and 92137 all mutually exclusive with each other.
- APRIL 2026 UPDATE: NCCI removed PTP edits between 92137 and 92235/92240/92242 (retroactive to Oct 2025). OCTA + FA and OCTA + ICG CAN now be billed same day. Edits between 92137 and eye codes remain with CCMI indicator 1.
- OCTA DOCUMENTATION: Flag if OCTA mentioned but medical necessity not documented. Must document WHY OCTA needed instead of OCT alone and how findings influenced treatment.
- BILATERAL INJECTION (67028): MUE = 1, bilateral indicator = 1 (150% payment). Bill single line with -50 modifier. Wet AMD + GA same eye → 1 unit of 67028 only, link both ICD-10 codes.

E/M LEVEL RULES (CRITICAL):
EYE CODES (92014/92004): Use when plan is OBSERVE/MONITOR — no active treatment decision by you today. Examples: ERM observed, stable nevus, dry AMD, PVD f/u, lattice observed, floaters, VMA, small macular hole observed, annual retina exam. Continuing another doctor's drops = still eye code. No MDM sentence, no modifier, no G2211.
LEVEL 3 (99213/99203): Low-complexity visits with minor treatment decisions.
LEVEL 4 (99214/99204): Retina workhorse — active drug management, injections, surgical planning, starting/changing meds. Only use when YOU are making a treatment decision today. — wet AMD, RVO, DME, drug management, injections, ERM evaluation, surgical consultations for future surgery. AMD is ALWAYS Level 4 regardless of co-managed conditions. ERM with planned future PPV = 99204 (new) or 99214 (established), NOT Level 5.
LEVEL 5 (99215/99205): RARE. Requires BOTH: (1) threat to body function TODAY + (2) emergency surgery PERFORMED at THIS visit (not scheduled for the future). Examples: endophthalmitis + tap/inject same day, RD + PPV/buckle/pneumatic same day, GCA + STAT labs same day, acute CRAO + emergent intervention. "Multiple conditions", planned future surgery, or "next OR availability" does NOT qualify.
MODIFIER -57: ONLY for same-day or next-day major surgery. If surgery is scheduled for any future date beyond tomorrow → NO -57, no modifier at all (unless a minor procedure is also done today → -25).
When in doubt: Level 4. ALWAYS.

MDM JUSTIFICATION (CRITICAL — add at the end of the Plan section for 99204/99214 and 99205/99215):
- For 99204/99214: add a sentence summarizing moderate MDM — reference the specific chronic condition, the management decision made, and the data reviewed. Example: "[+] Moderate complexity medical decision-making: new patient with active wet AMD OD requiring initiation of anti-VEGF therapy, concurrent POAG and post-operative management; OCT-A reviewed guiding treatment decision."
- For 99205/99215: add a sentence summarizing high MDM — only use when Level 5 criteria are met per the E/M LEVEL RULES above. This is RARE.
- For 99213 or eye codes (92014/92004): do NOT add an MDM justification sentence.

ANTI-REPETITION RULE (CRITICAL):
- NEVER use the same MDM or G2211 wording across notes. Each sentence must be unique to the specific visit.
- Reference the ACTUAL diagnoses, findings, and decisions from THIS note — not generic filler.
- Vary ALL components: opening phrase, data language, decision language, and complexity justification. Each should be worded differently every time.
- Do NOT start every MDM sentence with "Moderate complexity medical decision-making:" — vary the structure entirely.
- The MDM sentence should read like it was written by a physician thinking about THIS patient, not a billing template. An auditor should never see two notes that sound alike.

G2211 RULES (CRITICAL):
- G2211 can be billed with ANY E/M level (99213, 99214, 99215) — not just 99215. IMPORTANT: G2211 can ONLY be added to E/M codes (99xxx), NOT to eye exam codes (92014, 92004, 92012). If G2211 is eligible, prefer 99214 over 92014 for better reimbursement.
- Requirement: physician is the longitudinal managing physician for the patient's serious/complex condition.
- NEVER recommend G2211 on INJECTION DAYS or POST-OP VISITS within a global period. G2211 = NO when: (1) injection PERFORMED TODAY (uses modifier -25, CMS does not reimburse G2211 with -25), OR (2) visit is within postoperative global period (90-day: PPV, SB, pneumatic, IOL exchange; 10-day: injection, laser).
- NEVER recommend G2211 for PRIMARILY SURGICAL PATIENTS (ERM, FTMH, RD, scleral buckle, floaters/VH vitrectomy, IOL exchange, pneumatic). These are discrete surgical episodes, not longitudinal complexity.
- IMPORTANT: If the patient receives injections but is NOT being injected TODAY (monitoring visit, plan to inject next visit, PRN and not treating today), G2211 IS appropriate. The question is: is the needle going in TODAY? If no → G2211 = YES.
- DEFAULT TO G2211 = YES on any non-injection, non-post-op, non-surgical-condition visit. The physician is the longitudinal managing physician for chronic medical retina patients — AMD, DR, glaucoma, RVO, uveitis, or any chronic/serious condition being followed over time.
- If G2211 qualifies, add a sentence (after the MDM justification if present) at the end of the Plan. No header or label.
- Must be visit-specific and varied in wording.
- If G2211 does NOT apply (injection day, post-op visit, or primarily surgical patient), do NOT write anything about G2211 in the note. No explanation needed — the surgeon already knows why. Only include the G2211 sentence when it IS applicable.

MODIFIER RULES:
- Modifier -25: Append "-25" to the E/M code when exam is performed on the SAME DAY as a minor procedure (injection). Example: injection day with exam → 99214-25.
- Modifier -57: Append "-57" ONLY when decision for MAJOR surgery (90-day global) is made at THIS visit AND surgery is same day or next day. Examples: emergent PPV same day, pneumatic retinopexy same day. CRITICAL: If surgery is scheduled for LATER (next week, 2 weeks, etc.), do NOT use -57. Also: if an INJECTION is performed today, the modifier is ALWAYS -25, even if a future surgery is also discussed/planned at this visit. -57 and -25 are mutually exclusive on the same code — injection day = -25, period. Never use -57 on an injection visit.
- Modifier -24: Unrelated E/M during another surgery's 90-day global period. Example: post-PPV OD, seen for AMD OS → -24.
- Modifier -58: Planned/staged procedure during global period. Examples: oil removal after PPV → -58. Laser retinopexy after pneumatic → -58.
- Modifier -78: Unplanned return to OR for complication during global period. Example: endophthalmitis after PPV → -78.
- Modifier -79: Unrelated procedure during global period. Example: injection OS during PPV OD global → -79.
- Modifier -50: Bilateral procedure same day. Example: bilateral injections → 67028-50.
- Modifier -59: Distinct procedural service. Use when two normally-bundled procedures are performed same eye same day and are truly separate (e.g., injection + focal laser same eye same day → -59 on the second procedure).
- No procedure today and not in a global period → no modifier needed, bare E/M code.
- CRITICAL -25 RULE: Modifier -25 means a procedure was PERFORMED TODAY alongside the E/M. If NO procedure is performed today (no injection, no laser, no surgery), then -25 does NOT apply — NEVER add -25 when the procedure line is "None". Example: CRAO workup only, no injection → 99215-24 (NOT 99215-24-25). Post-op check + injection → 99214-24-25 (-25 applies because injection was performed).

CONTRALATERAL EYE GLOBAL PERIOD CHECK: When patient has recent surgery on one eye, check if today falls within 90-day global. If so: add -24 to E/M (unrelated), -79 to unrelated procedure on other eye. Example: s/p PPV OS 4wks ago + RD OD today → 99215-24-57, 67110-79.

GLOBAL PERIOD REFERENCE:
- 90-day global: PPV, scleral buckle, pneumatic retinopexy, IOL exchange, focal/grid laser (67210), choroidal photocoag (67220)
- 10-day global: intravitreal injection (67028), PRP (67228), prophylactic laser (67145), laser RD repair (67105), YAG (66821)
- 0-day global: OCT, fundus photos, visual fields, FA

RETINA LASER MODIFIER RULE: All retina lasers use -25 EXCEPT 67210 (focal/grid macular laser, 90-day global → use -57).

${ customInstructions ? `PHYSICIAN CUSTOM INSTRUCTIONS (follow these exactly):
${customInstructions}

` : "" }OUTPUT FORMAT — use ONLY these exact delimiters:

---CODE---
E/M code with modifiers (e.g., 99214-25, 99215-57, 99214-24-25, or "POST-OP (in global)" if routine post-op).
NEW patients: 99203-99205 or 92004. ESTABLISHED: 99213-99215, 92014, or 92012.
Use 92012 for simple interim visits with minimal MDM (e.g., pressure recheck, quick interim look). For YEARLY/ANNUAL follow-ups, use 92014 even if stable — a yearly comprehensive exam justifies 92014.
POST-OP visits within global period are NOT separately billable — output "POST-OP (in global)".
MANDATORY CHECK BEFORE OUTPUTTING -25: Look at your ---PROCEDURE--- line. Is it "None"? If YES → do NOT add -25 to the E/M code. -25 ONLY appears when a procedure is ACTUALLY PERFORMED today. No procedure = no -25, period.
---PROCEDURE---
Procedure code(s) with modifiers if performed today. Examples: "67028" (injection), "67028-79" (unrelated to prior surgery global), "67028-50" (bilateral), "67210-58" (staged laser in global). If no procedure today, output "None".
---G2211---
YES or NO (always NO on injection days, post-op visits within global period, and primarily surgical patients)
---CHANGES---
- each billing addition in plain language (max 5 bullets), or "None needed"
---NOTE---
the full note with [+] before each inserted billing phrase. For 99214/99215, the plan ends with the MDM justification sentence. If G2211 = YES, the G2211 sentence follows after that. If G2211 = NO, do NOT mention G2211 anywhere in the note.
---END---`;
}

// ── Response parser ─────────────────────────────────────────────────
function parseResponse(text) {
  const sec = (a, b) => {
    const s = text.indexOf("---" + a + "---");
    const e = text.indexOf("---" + b + "---");
    if (s === -1) return "";
    return (e === -1 ? text.slice(s) : text.slice(s, e))
      .replace("---" + a + "---", "").trim();
  };
  const hasProcedure = text.includes("---PROCEDURE---");
  return {
    code: sec("CODE", hasProcedure ? "PROCEDURE" : "G2211"),
    procedure: hasProcedure ? sec("PROCEDURE", "G2211") : "",
    g2211: sec("G2211", "CHANGES").trim() === "YES",
    changes: sec("CHANGES", "NOTE").split("\n").map(s => s.replace(/^[-•]\s*/, "").trim()).filter(Boolean),
    note: sec("NOTE", "END"),
  };
}

// ── Styles ──────────────────────────────────────────────────────────
const S = {
  bg: "#0f172a", card: "#1e293b", border: "#334155", muted: "#64748b",
  text: "#e2e8f0", bright: "#f1f5f9", accent: "#6366f1", accentLight: "#a5b4fc",
  green: "#4ade80", greenDark: "#166534", amber: "#f59e0b",
  font: "Georgia, serif", mono: "monospace",
};

const isEyeCode = (code) => code === "92014" || code === "92004";

// ── Component ───────────────────────────────────────────────────────
export default function ClinicNoteGenerator({ onBack, surgeon }) {
  const [mode, setMode] = useState("generate"); // generate | optimize
  const [note, setNote] = useState("");
  const [timeSpent, setTimeSpent] = useState(""); // optional — minutes spent with patient
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("input"); // input | output | examples | rules | codes
  const [codeSearch, setCodeSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // ICD-10 auto-suggest
  const [icd10Codes, setIcd10Codes] = useState([]);
  const [icd10Loading, setIcd10Loading] = useState(false);

  // Auto-detected drops from note output
  const [autoDrops, setAutoDrops] = useState([]);
  const [autoLang, setAutoLang] = useState("en");

  // Injection calculator
  const [lastInjDate, setLastInjDate] = useState("");
  const [fuWeeks, setFuWeeks] = useState("");

  // Voice dictation (Deepgram)
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        clearInterval(timerRef.current);
        setRecordingTime(0);
        if (audioChunksRef.current.length === 0) return;
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setIsTranscribing(true);
        try {
          // Step 1: Whisper transcription
          const resp = await fetch(`${API_BASE}/api/transcribe`, {
            method: "POST",
            headers: { "Content-Type": "audio/webm" },
            body: audioBlob,
          });
          const data = await resp.json();
          if (data.success && data.transcript) {
            // Step 2: Clean up medical terminology via Haiku
            try {
              const cleanResp = await fetch(`${API_BASE}/api/cleanup-transcript`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ transcript: data.transcript }),
              });
              const cleanData = await cleanResp.json();
              const finalText = cleanData.success && cleanData.cleaned ? cleanData.cleaned : data.transcript;
              setNote(prev => prev ? prev + "\n" + finalText : finalText);
            } catch {
              // If cleanup fails, use raw transcript
              setNote(prev => prev ? prev + "\n" + data.transcript : data.transcript);
            }
          } else {
            setError(data.error || "Transcription failed");
          }
        } catch (e) {
          setError("Transcription error: " + e.message);
        }
        setIsTranscribing(false);
      };
      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (e) {
      setError("Microphone access denied. Please allow mic access and try again.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const injCalc = (() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    let weeksSince = null;
    let daysSince = null;
    let nextDate = null;

    if (lastInjDate) {
      const last = new Date(lastInjDate + "T12:00:00");
      if (!isNaN(last)) {
        const diffMs = today - last;
        weeksSince = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
        daysSince = Math.floor(diffMs / (24 * 60 * 60 * 1000));
      }
    }

    if (fuWeeks && parseInt(fuWeeks) > 0) {
      nextDate = new Date(today.getTime() + parseInt(fuWeeks) * 7 * 24 * 60 * 60 * 1000);
    }

    if (weeksSince === null && nextDate === null) return null;
    return { weeksSince, daysSince, nextDate };
  })();

  const formatDate = (d) => {
    if (!d) return "";
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  };

  // Examples state
  const [examples, setExamples] = useState(DEFAULT_EXAMPLES);
  const [editingExample, setEditingExample] = useState(null);
  const [showAddExample, setShowAddExample] = useState(false);
  const [newExample, setNewExample] = useState({ label: "", shorthand: "" });

  // Custom instructions (free-form style/formatting rules for Claude)
  const [customInstructions, setCustomInstructions] = useState("");

  // Expansion rules state
  const [inlineRules, setInlineRules] = useState(DEFAULT_INLINE_RULES);
  const [planRules, setPlanRules] = useState(DEFAULT_PLAN_RULES);
  const [editingRule, setEditingRule] = useState(null);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRule, setNewRule] = useState({ trigger: "", expansion: "", type: "inline" });

  // ── Load persistent data on mount ─────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/user-data`);
        const json = await res.json();
        if (json.success && json.data) {
          if (json.data.examples?.length > 0) setExamples(json.data.examples);
          if (json.data.inlineRules?.length > 0) setInlineRules(json.data.inlineRules);
          if (json.data.planRules?.length > 0) setPlanRules(json.data.planRules);
          if (json.data.customInstructions) setCustomInstructions(json.data.customInstructions);
        }
      } catch (e) {
        console.log("Could not load user data, using defaults:", e.message);
      }
      setDataLoaded(true);
    }
    load();
  }, []);

  // ── Auto-save when data changes ───────────────────────────────────
  useEffect(() => {
    if (!dataLoaded) return;
    const timer = setTimeout(() => {
      fetch(`${API_BASE}/api/user-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examples, inlineRules, planRules, customInstructions }),
      }).catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [examples, inlineRules, planRules, customInstructions, dataLoaded]);

  // ── Copy to clipboard ─────────────────────────────────────────────
  const copyNote = useCallback(async () => {
    if (!result?.note) return;
    const clean = result.note.replace(/\[\+\]\s*/g, "").replace(/\*\*/g, "");
    try {
      await navigator.clipboard.writeText(clean);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = clean;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result]);

  // ── Example management ────────────────────────────────────────────
  const addExample = () => {
    if (!newExample.label.trim() || !newExample.shorthand.trim()) return;
    const id = "ex_custom_" + Date.now();
    setExamples(prev => [...prev, { id, label: newExample.label.trim(), shorthand: newExample.shorthand.trim(), builtin: false }]);
    setNewExample({ label: "", shorthand: "" });
    setShowAddExample(false);
  };

  const deleteExample = (id) => {
    setExamples(prev => prev.filter(e => e.id !== id));
  };

  const saveEditingExample = () => {
    if (!editingExample) return;
    setExamples(prev => prev.map(e => e.id === editingExample.id ? { ...e, label: editingExample.label, shorthand: editingExample.shorthand } : e));
    setEditingExample(null);
  };

  // ── Rule management ───────────────────────────────────────────────
  const addRule = () => {
    if (!newRule.trigger.trim() || !newRule.expansion.trim()) return;
    const id = "custom_" + Date.now();
    if (newRule.type === "inline") {
      setInlineRules(prev => [...prev, { id, trigger: newRule.trigger.trim(), expansion: newRule.expansion.trim(), type: "inline", builtin: false }]);
    } else {
      setPlanRules(prev => [...prev, { id, triggers: newRule.trigger.trim(), expansion: newRule.expansion.trim(), type: "plan", builtin: false }]);
    }
    setNewRule({ trigger: "", expansion: "", type: "inline" });
    setShowAddRule(false);
  };

  const deleteRule = (id, type) => {
    if (type === "inline") setInlineRules(prev => prev.filter(r => r.id !== id));
    else setPlanRules(prev => prev.filter(r => r.id !== id));
  };

  const saveEditingRule = () => {
    if (!editingRule) return;
    if (editingRule.type === "inline") {
      setInlineRules(prev => prev.map(r => r.id === editingRule.id ? { ...r, trigger: editingRule.trigger, expansion: editingRule.expansion } : r));
    } else {
      setPlanRules(prev => prev.map(r => r.id === editingRule.id ? { ...r, triggers: editingRule.triggers, expansion: editingRule.expansion } : r));
    }
    setEditingRule(null);
  };

  // ── Global period calculator ──────────────────────────────────────
  function calcGlobalPeriodContext(inputText) {
    const lines = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Try to find explicit surgery dates: (MR, 4/10/2026) or (MR, 04/10/2026) or (MR 4/10/26)
    const datePatterns = [
      /s\/p\s+[\w\/]+\s+(?:for\s+\w+\s+)?(?:\w+\s*)?\(([A-Z]{2,4}),?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\)/gi,
      /\(([A-Z]{2,4}),?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\)/gi,
    ];

    const surgeries = [];
    for (const pat of datePatterns) {
      let m;
      pat.lastIndex = 0;
      while ((m = pat.exec(inputText)) !== null) {
        const dateStr = m[2];
        const parts = dateStr.split("/");
        if (parts.length === 3) {
          let [mo, da, yr] = parts.map(Number);
          if (yr < 100) yr += 2000;
          const surgDate = new Date(yr, mo - 1, da);
          const diffDays = Math.round((today - surgDate) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays <= 365) {
            surgeries.push({ surgeon: m[1], date: surgDate, days: diffDays });
          }
        }
      }
      if (surgeries.length > 0) break; // use first matching pattern
    }

    // Also detect POD/POW/POM for approximate calculation when no date given
    if (surgeries.length === 0) {
      const powMatch = inputText.match(/POD\s*(\d+)/i);
      const powWeek = inputText.match(/POW\s*(\d+)/i);
      const pomMatch = inputText.match(/POM\s*(\d+)/i);
      let approxDays = null;
      if (powMatch) approxDays = parseInt(powMatch[1]);
      else if (powWeek) approxDays = parseInt(powWeek[1]) * 7;
      else if (pomMatch) approxDays = parseInt(pomMatch[1]) * 30;

      if (approxDays !== null) {
        const inGlobal = approxDays <= 90;
        lines.push(`[SYSTEM — POST-OP TIMING: Approximately ${approxDays} days since surgery (${inGlobal ? "WITHIN 90-day global period" : "OUTSIDE 90-day global period"}). ${inGlobal ? "Routine post-op care is included in the surgical fee. Only UNRELATED conditions get separate E/M with -24." : "Global period has ended. This visit is independently billable."}]`);
      }
    }

    for (const s of surgeries) {
      const inGlobal = s.days <= 90;
      lines.push(`[SYSTEM — POST-OP TIMING: Surgery by ${s.surgeon} was ${s.days} days ago (${s.date.toLocaleDateString()}). ${inGlobal ? "WITHIN 90-day global period — routine post-op care is NOT separately billable. Only UNRELATED conditions get separate E/M with -24, procedures with -79." : "OUTSIDE 90-day global period — this visit is independently billable."}]`);
    }

    return lines.join("\n");
  }

  // ── Run ───────────────────────────────────────────────────────────
  async function run() {
    if (!note.trim()) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const systemPrompt = buildSystemPrompt(mode, examples, customInstructions);
      const timeNote = timeSpent.trim() ? `\n\nTIME SPENT WITH PATIENT: ${timeSpent.trim()} minutes (use for time-based coding if it supports a higher E/M level than MDM alone)` : "";
      const globalContext = calcGlobalPeriodContext(note);
      const globalNote = globalContext ? `\n\n${globalContext}` : "";
      const userMessage = mode === "generate"
        ? `Expand this shorthand into a formatted A/P note with billing language:\n\n${note}${timeNote}${globalNote}`
        : `Optimize this existing A/P note with minimum billing language:\n\n${note}${timeNote}${globalNote}`;

      const res = await fetch(`${API_BASE}/api/generate-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: systemPrompt,
          userMessage,
          model: "claude-sonnet-4-6",
          max_tokens: 3000,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message || data.error);
      const text = (data.content || []).map(b => b.text || "").join("");
      if (!text.includes("---CODE---")) throw new Error("Unexpected response format. First 300 chars: " + text.substring(0, 300));
      const parsed = parseResponse(text);
      setResult(parsed);
      setTab("output");

      // Fire ICD-10 suggestion in background (non-blocking)
      if (parsed.note) {
        setIcd10Loading(true);
        setIcd10Codes([]);
        fetch(`${API_BASE}/api/suggest-icd10`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: parsed.note }),
        })
          .then(r => r.json())
          .then(d => { if (d.success && d.codes?.length) setIcd10Codes(d.codes); })
          .catch(() => {})
          .finally(() => setIcd10Loading(false));
      }
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  // ── Render note with [+] badges ───────────────────────────────────
  function renderBold(segment, segKey) {
    // Split on **bold** patterns and render as <strong>
    const parts = segment.split(/\*\*(.+?)\*\*/g);
    return parts.map((p, j) =>
      j % 2 === 1
        ? <strong key={`${segKey}-b${j}`}>{p}</strong>
        : <span key={`${segKey}-t${j}`}>{p}</span>
    );
  }

  function renderNote(text) {
    if (!text) return null;
    return text.split("[+]").map((part, i) => (
      <span key={i}>
        {i > 0 && <span style={{ background: "#fef08a", color: "#713f12", fontWeight: 700, fontSize: "0.6rem", padding: "1px 4px", borderRadius: 3, marginRight: 3, border: "1px solid #eab308", verticalAlign: "middle" }}>+</span>}
        {renderBold(part, i)}
      </span>
    ));
  }

  const getCodeStyle = (code) => {
    if (code === "99215") return { bg: "#d1fae5", color: "#059669", border: "#059669" };
    if (code === "99214") return { bg: "#dbeafe", color: "#1d4ed8", border: "#1d4ed8" };
    if (code === "99213") return { bg: "#f1f5f9", color: "#475569", border: "#94a3b8" };
    if (isEyeCode(code)) return { bg: "#fdf4ff", color: "#7e22ce", border: "#a855f7" };
    return { bg: "#f1f5f9", color: "#475569", border: "#94a3b8" };
  };

  const cc = result ? getCodeStyle(result.code) : {};

  const inputStyle = (extra = {}) => ({
    background: S.bg, border: `1px solid ${S.border}`, borderRadius: 6,
    padding: "7px 10px", color: S.text, fontFamily: S.mono, fontSize: "0.82rem",
    width: "100%", boxSizing: "border-box", ...extra,
  });

  const btnStyle = (bg, color, extra = {}) => ({
    background: bg, color, border: "none", borderRadius: 6,
    padding: "6px 14px", fontSize: "0.78rem", fontFamily: S.font,
    fontWeight: 600, cursor: "pointer", ...extra,
  });

  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: S.font }}>

      {/* Header */}
      <div style={{ background: S.card, borderBottom: `1px solid ${S.border}`, padding: "14px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        {onBack && (
          <button onClick={onBack} style={{ background: "none", border: `1px solid ${S.border}`, borderRadius: 6, color: S.muted, padding: "5px 10px", cursor: "pointer", fontFamily: S.font, fontSize: "0.78rem", marginRight: 4 }}>
            &#8592; Back
          </button>
        )}
        <div style={{ width: 38, height: 38, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>&#9877;</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: S.bright }}>Clinic Note Generator{surgeon ? ` — ${surgeon.name}` : ""}</div>
          <div style={{ fontSize: "0.68rem", color: S.muted, fontFamily: S.mono }}>A/P Notes | Billing Codes | Shorthand Expansion</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${S.card}`, paddingLeft: 24, overflowX: "auto" }}>
        {[
          ["input", "Input"],
          ["output", "Output"],
          ["examples", "Examples"],
          ["rules", "Expansion Rules"],
          ["instructions", "My Instructions"],
          ["coding", "AI Coding"],
          ["inject", "Can We Inject?"],
          ["education", "Patient Ed"],
          ...(surgeon && surgeon.hasRobocall ? [["robocall", "Robocall"]] : []),
        ].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: "9px 14px", background: "none", border: "none",
            borderBottom: tab === id ? `2px solid ${S.accent}` : "2px solid transparent",
            color: tab === id ? S.accentLight : S.muted,
            fontFamily: S.font, fontSize: "0.8rem", cursor: "pointer", fontWeight: tab === id ? 600 : 400,
            whiteSpace: "nowrap",
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* Injection / F/U Calculator — always visible */}
      <div style={{ padding: "10px 24px 0", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ fontSize: "0.72rem", color: S.muted, fontWeight: 700, marginBottom: 8 }}>Injection & F/U Calculator</div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {/* Last injection column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <label style={{ fontSize: "0.72rem", color: S.muted, whiteSpace: "nowrap" }}>Last inj:</label>
                <input
                  type="date"
                  value={lastInjDate}
                  onChange={e => setLastInjDate(e.target.value)}
                  style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 6, padding: "5px 8px", color: S.text, fontFamily: S.mono, fontSize: "0.78rem", boxSizing: "border-box" }}
                />
              </div>
              {injCalc && injCalc.weeksSince !== null && (
                <span style={{ fontSize: "0.82rem", color: S.accentLight, fontFamily: S.mono, fontWeight: 700 }}>
                  {injCalc.weeksSince}w {injCalc.daysSince % 7 > 0 ? `${injCalc.daysSince % 7}d` : ""} since last inj
                </span>
              )}
            </div>
            {/* F/U weeks column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <label style={{ fontSize: "0.72rem", color: S.muted, whiteSpace: "nowrap" }}>F/u in:</label>
                <input
                  type="number"
                  value={fuWeeks}
                  onChange={e => setFuWeeks(e.target.value)}
                  placeholder="wks"
                  style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 6, padding: "5px 8px", color: S.text, fontFamily: S.mono, fontSize: "0.78rem", width: 60, boxSizing: "border-box" }}
                />
                <span style={{ fontSize: "0.72rem", color: S.muted }}>weeks</span>
              </div>
              {injCalc && injCalc.nextDate && (
                <span style={{ fontSize: "0.82rem", color: S.green, fontFamily: S.mono, fontWeight: 700 }}>
                  Next appt: {formatDate(injCalc.nextDate)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 800, margin: "0 auto" }}>

        {/* ── INPUT TAB ──────────────────────────────────────────── */}
        {tab === "input" && (
          <div>
            {/* Mode toggle */}
            <div style={{ display: "flex", gap: 0, marginBottom: 16, borderRadius: 8, overflow: "hidden", border: `1px solid ${S.border}` }}>
              {[["generate", "Generate from Shorthand"], ["optimize", "Optimize Existing Note"]].map(([m, label]) => (
                <button key={m} onClick={() => setMode(m)} style={{
                  flex: 1, padding: "10px 12px", background: mode === m ? S.accent : S.card,
                  color: mode === m ? "#fff" : S.muted, border: "none",
                  fontFamily: S.font, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
                }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Hint */}
            <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 14px", fontSize: "0.76rem", color: "#94a3b8", lineHeight: 1.6, marginBottom: 14 }}>
              <span style={{ color: S.amber, fontWeight: 700 }}>No PHI.</span>{" "}
              {mode === "generate"
                ? "Type your shorthand — the tool expands it into a formatted A/P note with billing language."
                : "Paste your structured A/P note — the tool inserts minimum billing-compliant language."}
            </div>

            {/* Dictation mic button */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isTranscribing}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", borderRadius: 8,
                  border: isRecording ? "2px solid #ef4444" : `1px solid ${S.border}`,
                  background: isRecording ? "#7f1d1d" : S.card,
                  color: isRecording ? "#fca5a5" : S.text,
                  fontFamily: S.mono, fontSize: "0.8rem", fontWeight: 600,
                  cursor: isTranscribing ? "wait" : "pointer",
                  transition: "all 0.2s",
                }}
              >
                {isRecording ? (
                  <>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: "#ef4444", display: "inline-block" }} />
                    Stop ({Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, "0")})
                  </>
                ) : isTranscribing ? (
                  <>
                    <span style={{ fontSize: "0.9rem" }}>⏳</span>
                    Transcribing...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="1" width="6" height="12" rx="3" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                    Dictate
                  </>
                )}
              </button>
              {isRecording && (
                <span style={{ fontSize: "0.72rem", color: "#ef4444", fontWeight: 600 }}>
                  ● Recording — speak now
                </span>
              )}
            </div>

            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={mode === "generate"
                ? "67 yo W, AMD denies Fhx, non-smoker, OD I dry, OS wet AMD failed A and E, on V q8..."
                : "Paste your structured A/P note here..."}
              rows={14}
              style={{ display: "block", width: "100%", background: S.card, border: `1px solid #475569`, borderRadius: 10, padding: 14, color: S.bright, fontFamily: S.mono, fontSize: "0.85rem", lineHeight: 1.8, resize: "vertical", boxSizing: "border-box" }}
            />

            {/* Optional time field */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
              <label style={{ fontSize: "0.72rem", color: S.muted, whiteSpace: "nowrap" }}>Time with patient (optional):</label>
              <input
                type="number"
                value={timeSpent}
                onChange={e => setTimeSpent(e.target.value)}
                placeholder="min"
                style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 6, padding: "5px 8px", color: S.text, fontFamily: S.mono, fontSize: "0.82rem", width: 70, boxSizing: "border-box" }}
              />
              <span style={{ fontSize: "0.66rem", color: "#475569" }}>99213=20 min · 99214=30 min · 99215=40 min</span>
            </div>


            {error && (
              <div style={{ color: "#f87171", fontSize: "0.72rem", background: "#1a0808", padding: "8px 12px", borderRadius: 6, border: "1px solid #7f1d1d", marginTop: 10, wordBreak: "break-all", maxHeight: 100, overflowY: "auto" }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <button onClick={run} disabled={loading || !note.trim()} style={{
                background: loading || !note.trim() ? S.card : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: loading || !note.trim() ? "#475569" : "#fff",
                border: "none", borderRadius: 8, padding: "10px 24px", fontSize: "0.9rem",
                fontFamily: S.font, fontWeight: 600, cursor: loading || !note.trim() ? "not-allowed" : "pointer",
              }}>
                {loading ? "Working..." : mode === "generate" ? "Generate Note →" : "Optimize →"}
              </button>
            </div>
          </div>
        )}

        {/* ── OUTPUT TAB ─────────────────────────────────────────── */}
        {tab === "output" && (
          <div>
            {loading && (
              <div style={{ textAlign: "center", padding: "60px 0", color: S.muted }}>
                <div style={{ width: 34, height: 34, border: `3px solid ${S.border}`, borderTopColor: S.accent, borderRadius: "50%", animation: "spin .8s linear infinite", margin: "0 auto 12px" }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                Working...
              </div>
            )}
            {!loading && !result && <div style={{ textAlign: "center", padding: "60px 0", color: "#475569" }}>Generate or optimize a note first.</div>}
            {result && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Code badges */}
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ background: cc.bg, color: cc.color, border: `1.5px solid ${cc.border}`, borderRadius: 8, padding: "6px 16px", fontWeight: 700, fontSize: "1rem", fontFamily: S.mono }}>
                    {result.code}
                  </span>
                  {result.procedure && result.procedure !== "None" && (
                    <span style={{ background: "#dbeafe", color: "#1e40af", border: "1.5px solid #3b82f6", borderRadius: 8, padding: "6px 16px", fontWeight: 700, fontSize: "1rem", fontFamily: S.mono }}>+ {result.procedure}</span>
                  )}
                  {result.g2211 && (
                    <span style={{ background: "#fef3c7", color: "#92400e", border: "1.5px solid #f59e0b", borderRadius: 8, padding: "6px 16px", fontWeight: 700, fontSize: "1rem", fontFamily: S.mono }}>+ G2211</span>
                  )}
                  {isEyeCode(result.code) && (
                    <span style={{ fontSize: "0.76rem", color: "#a855f7", fontStyle: "italic" }}>Eye exam code — no MDM documentation needed</span>
                  )}
                </div>

                {/* Coding additions */}
                {result.changes?.filter(c => c && c !== "None needed").length > 0 && (
                  <div style={{ background: "#0f1f14", border: `1px solid ${S.greenDark}`, borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ fontSize: "0.66rem", color: S.green, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 7 }}>Billing additions</div>
                    {result.changes.filter(c => c && c !== "None needed").map((c, i) => (
                      <div key={i} style={{ fontSize: "0.82rem", color: "#86efac", paddingLeft: 12, position: "relative", marginBottom: 3, lineHeight: 1.5 }}>
                        <span style={{ position: "absolute", left: 0, color: "#16a34a" }}>&#10003;</span>{c}
                      </div>
                    ))}
                  </div>
                )}

                {/* ICD-10 Codes */}
                {(icd10Loading || icd10Codes.length > 0) && (
                  <div style={{ background: "#0c0f1a", border: "1px solid #4f46e5", borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                      <div style={{ fontSize: "0.66rem", color: "#818cf8", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        ICD-10 Codes
                      </div>
                      {icd10Codes.length > 0 && (
                        <button onClick={async () => {
                          const text = icd10Codes.map(c => `${c.code} — ${c.description}`).join("\n");
                          try { await navigator.clipboard.writeText(text); setCopiedCodes(true); setTimeout(() => setCopiedCodes(false), 2000); }
                          catch { setCopiedCodes(false); }
                        }} style={{
                          background: copiedCodes ? "#059669" : S.bg, color: copiedCodes ? "#fff" : "#94a3b8",
                          border: `1px solid ${copiedCodes ? "#059669" : S.border}`, borderRadius: 6,
                          padding: "3px 10px", fontSize: "0.68rem", fontFamily: S.font, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                        }}>
                          {copiedCodes ? "Copied!" : "Copy codes"}
                        </button>
                      )}
                    </div>
                    {icd10Loading ? (
                      <div style={{ fontSize: "0.78rem", color: "#6366f1", fontStyle: "italic" }}>Analyzing diagnoses...</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {icd10Codes.map((c, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                            <span style={{
                              background: c.primary ? "#312e81" : S.bg, color: c.primary ? "#a5b4fc" : "#94a3b8",
                              border: `1px solid ${c.primary ? "#4f46e5" : S.border}`, borderRadius: 4,
                              padding: "2px 8px", fontSize: "0.76rem", fontFamily: S.mono, fontWeight: 700, flexShrink: 0,
                            }}>
                              {c.code}
                            </span>
                            <span style={{ fontSize: "0.78rem", color: c.primary ? "#c7d2fe" : "#94a3b8", lineHeight: 1.4 }}>
                              {c.description}
                            </span>
                            {c.primary && <span style={{ fontSize: "0.58rem", color: "#6366f1", fontWeight: 700, flexShrink: 0 }}>PRIMARY</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* The note */}
                <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: "0.66rem", color: S.accent, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      {mode === "generate" ? "Generated A/P Note" : "Optimized A/P Note"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ fontSize: "0.6rem", color: "#94a3b8", fontFamily: S.mono, background: S.bg, padding: "2px 6px", borderRadius: 3 }}>
                        <span style={{ background: "#fef08a", color: "#713f12", padding: "0 3px", borderRadius: 2, fontWeight: 700, marginRight: 3 }}>+</span>= billing language
                      </div>
                      <button onClick={copyNote} style={btnStyle(copied ? "#059669" : S.bg, copied ? "#fff" : "#94a3b8", { border: `1px solid ${copied ? "#059669" : S.border}`, padding: "3px 10px", fontSize: "0.68rem", transition: "all 0.2s" })}>
                        {copied ? "Copied!" : "Copy note"}
                      </button>
                    </div>
                  </div>
                  <div style={{ fontFamily: S.mono, fontSize: "0.85rem", lineHeight: 1.9, color: S.text, whiteSpace: "pre-wrap" }}>
                    {renderNote(result.note)}
                  </div>
                </div>

                <button onClick={() => { setTab("input"); setResult(null); }} style={btnStyle("none", S.muted, { border: `1px solid ${S.border}`, alignSelf: "flex-start" })}>
                  &#8592; New note
                </button>

                {/* ── Auto-generated Patient Education ──────────────── */}
                {(() => {
                  try {
                  const fullText = (note || "") + "\n" + (result.note || "");
                  const detectedLang = detectLanguage(fullText);
                  const matched = matchHandouts(fullText, icd10Codes || []);
                  const detectedDrops = detectDropsFromPlan(fullText);
                  if (matched.length === 0 && detectedDrops.length === 0) return null;
                  return (
                    <div style={{ background: "#0f1f2e", border: "1px solid #1d4ed8", borderRadius: 10, padding: "14px 18px", marginTop: 8 }}>
                      <div style={{ fontSize: "0.72rem", color: "#60a5fa", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                        Patient Education — auto-matched from this note
                      </div>
                      <div style={{ fontSize: "0.78rem", color: S.text, marginBottom: 10 }}>
                        {matched.length > 0 && <span>{matched.length} handout{matched.length !== 1 ? "s" : ""} matched</span>}
                        {matched.length > 0 && detectedDrops.length > 0 && <span> &bull; </span>}
                        {detectedDrops.length > 0 && <span>{detectedDrops.length} drop{detectedDrops.length !== 1 ? "s" : ""} detected</span>}
                        {detectedLang !== "en" && <span style={{ marginLeft: 8, background: "#1e40af", color: "#bfdbfe", padding: "2px 8px", borderRadius: 4, fontSize: "0.68rem" }}>{detectedLang.toUpperCase()}</span>}
                      </div>
                      {matched.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          {matched.map(h => (
                            <span key={h.id} style={{ display: "inline-block", background: "#1e293b", border: "1px solid #334155", borderRadius: 6, padding: "3px 10px", fontSize: "0.7rem", color: "#94a3b8", marginRight: 6, marginBottom: 4 }}>
                              {h.title[detectedLang] || h.title.en}
                            </span>
                          ))}
                        </div>
                      )}
                      {detectedDrops.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: "0.7rem", color: S.muted, marginBottom: 4 }}>Detected drops:</div>
                          {detectedDrops.map((d, i) => (
                            <span key={i} style={{ display: "inline-block", background: "#1e293b", border: "1px solid #334155", borderRadius: 6, padding: "3px 10px", fontSize: "0.7rem", color: "#86efac", marginRight: 6, marginBottom: 4 }}>
                              {d.name} {d.schedule} {d.eye}
                            </span>
                          ))}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {matched.length > 0 && (
                          <button
                            onClick={() => {
                              const html = generateEducationPrintHTML(matched, detectedLang);
                              const win = window.open("", "_blank");
                              win.document.write(html);
                              win.document.close();
                              setTimeout(() => win.print(), 400);
                            }}
                            style={{ background: "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: "0.78rem", fontFamily: S.font, fontWeight: 600, cursor: "pointer" }}
                          >
                            Print Handouts ({(detectedLang || "en").toUpperCase()})
                          </button>
                        )}
                        {detectedDrops.length > 0 && (
                          <button
                            onClick={() => { setAutoDrops(detectedDrops); setAutoLang(detectedLang); setTab("drops"); }}
                            style={{ background: "linear-gradient(135deg,#059669,#10b981)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: "0.78rem", fontFamily: S.font, fontWeight: 600, cursor: "pointer" }}
                          >
                            Print Drop Schedule ({(detectedLang || "en").toUpperCase()})
                          </button>
                        )}
                      </div>
                    </div>
                  );
                  } catch (e) { console.error("Education matcher error:", e); return null; }
                })()}
              </div>
            )}
          </div>
        )}

        {/* ── EXAMPLES TAB ───────────────────────────────────────── */}
        {tab === "examples" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: S.bright }}>Reference Examples</div>
                <div style={{ fontSize: "0.72rem", color: S.muted, marginTop: 2 }}>These teach the AI your note style. More examples = better output.</div>
              </div>
              <button onClick={() => { setShowAddExample(!showAddExample); setNewExample({ label: "", shorthand: "" }); }} style={btnStyle("linear-gradient(135deg,#6366f1,#8b5cf6)", "#fff", { padding: "7px 16px" })}>
                {showAddExample ? "Cancel" : "+ Add Example"}
              </button>
            </div>

            {/* Add form */}
            {showAddExample && (
              <div style={{ background: S.card, border: `1px solid ${S.accent}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: "0.72rem", color: S.accentLight, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>New Example</div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: "0.66rem", color: S.muted, display: "block", marginBottom: 3 }}>Label (e.g. "DME — injection visit")</label>
                  <input value={newExample.label} onChange={e => setNewExample(p => ({ ...p, label: e.target.value }))} style={inputStyle()} placeholder="Visit type description" />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: "0.66rem", color: S.muted, display: "block", marginBottom: 3 }}>Full note (the way you want the output to look)</label>
                  <textarea value={newExample.shorthand} onChange={e => setNewExample(p => ({ ...p, shorthand: e.target.value }))} rows={8} placeholder="Paste a complete A/P note example..." style={inputStyle({ resize: "vertical", lineHeight: 1.5 })} />
                </div>
                <button onClick={addExample} disabled={!newExample.label.trim() || !newExample.shorthand.trim()} style={btnStyle(!newExample.label.trim() || !newExample.shorthand.trim() ? S.card : "#059669", !newExample.label.trim() || !newExample.shorthand.trim() ? "#475569" : "#fff")}>
                  Save Example
                </button>
              </div>
            )}

            {/* Example list */}
            {examples.map(ex => (
              <div key={ex.id} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: "12px 14px", marginBottom: 8 }}>
                {editingExample?.id === ex.id ? (
                  <div>
                    <input value={editingExample.label} onChange={e => setEditingExample(p => ({ ...p, label: e.target.value }))} style={inputStyle({ marginBottom: 8 })} />
                    <textarea value={editingExample.shorthand} onChange={e => setEditingExample(p => ({ ...p, shorthand: e.target.value }))} rows={6} style={inputStyle({ resize: "vertical", lineHeight: 1.5, marginBottom: 8 })} />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={saveEditingExample} style={btnStyle("#059669", "#fff", { fontSize: "0.68rem", padding: "4px 10px" })}>Save</button>
                      <button onClick={() => setEditingExample(null)} style={btnStyle("transparent", S.muted, { fontSize: "0.68rem", padding: "4px 10px", border: `1px solid ${S.border}` })}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ background: "#312e81", color: S.accentLight, padding: "3px 10px", borderRadius: 4, fontSize: "0.76rem", fontWeight: 700 }}>{ex.label}</span>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => setEditingExample({ ...ex })} style={btnStyle("transparent", S.muted, { fontSize: "0.64rem", padding: "3px 8px", border: `1px solid ${S.border}` })}>Edit</button>
                        {!ex.builtin && <button onClick={() => deleteExample(ex.id)} style={btnStyle("transparent", "#f87171", { fontSize: "0.64rem", padding: "3px 8px", border: "1px solid #7f1d1d" })}>Del</button>}
                      </div>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", lineHeight: 1.5, whiteSpace: "pre-wrap", maxHeight: 120, overflowY: "auto", fontFamily: S.mono }}>
                      {ex.shorthand}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── RULES TAB ──────────────────────────────────────────── */}
        {tab === "rules" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: S.bright }}>Expansion Rules</div>
                <div style={{ fontSize: "0.72rem", color: S.muted, marginTop: 2 }}>Auto-applied to counseling language. No API call needed.</div>
              </div>
              <button onClick={() => { setShowAddRule(!showAddRule); setNewRule({ trigger: "", expansion: "", type: "inline" }); }} style={btnStyle("linear-gradient(135deg,#6366f1,#8b5cf6)", "#fff", { padding: "7px 16px" })}>
                {showAddRule ? "Cancel" : "+ Add Rule"}
              </button>
            </div>

            {showAddRule && (
              <div style={{ background: S.card, border: `1px solid ${S.accent}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: "0.72rem", color: S.accentLight, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>New Rule</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.76rem", color: S.text, cursor: "pointer" }}>
                    <input type="radio" name="newRuleType" checked={newRule.type === "inline"} onChange={() => setNewRule(p => ({ ...p, type: "inline" }))} /> Inline
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.76rem", color: S.text, cursor: "pointer" }}>
                    <input type="radio" name="newRuleType" checked={newRule.type === "plan"} onChange={() => setNewRule(p => ({ ...p, type: "plan" }))} /> Plan-appended
                  </label>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: "0.66rem", color: S.muted, display: "block", marginBottom: 3 }}>
                    {newRule.type === "inline" ? "Trigger term" : "Trigger terms (comma-separated)"}
                  </label>
                  <input value={newRule.trigger} onChange={e => setNewRule(p => ({ ...p, trigger: e.target.value }))} placeholder={newRule.type === "inline" ? "e.g. DME" : "e.g. RD, PVD"} style={inputStyle()} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: "0.66rem", color: S.muted, display: "block", marginBottom: 3 }}>Expansion text</label>
                  <textarea value={newRule.expansion} onChange={e => setNewRule(p => ({ ...p, expansion: e.target.value }))} rows={2} placeholder="The text that replaces or is appended..." style={inputStyle({ resize: "vertical", lineHeight: 1.5 })} />
                </div>
                <button onClick={addRule} disabled={!newRule.trigger.trim() || !newRule.expansion.trim()} style={btnStyle(!newRule.trigger.trim() || !newRule.expansion.trim() ? S.card : "#059669", !newRule.trigger.trim() || !newRule.expansion.trim() ? "#475569" : "#fff")}>
                  Save Rule
                </button>
              </div>
            )}

            {/* Inline rules */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: "0.7rem", color: S.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, borderBottom: `1px solid ${S.border}`, paddingBottom: 4 }}>
                Inline Replacements ({inlineRules.length})
              </div>
              {inlineRules.map(rule => (
                <div key={rule.id} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 6, padding: "10px 12px", marginBottom: 6 }}>
                  {editingRule?.id === rule.id ? (
                    <div>
                      <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                        <input value={editingRule.trigger} onChange={e => setEditingRule(p => ({ ...p, trigger: e.target.value }))} style={inputStyle({ flex: "0 0 120px" })} />
                        <input value={editingRule.expansion} onChange={e => setEditingRule(p => ({ ...p, expansion: e.target.value }))} style={inputStyle({ flex: 1 })} />
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={saveEditingRule} style={btnStyle("#059669", "#fff", { fontSize: "0.68rem", padding: "4px 10px" })}>Save</button>
                        <button onClick={() => setEditingRule(null)} style={btnStyle("transparent", S.muted, { fontSize: "0.68rem", padding: "4px 10px", border: `1px solid ${S.border}` })}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ background: "#312e81", color: S.accentLight, padding: "2px 8px", borderRadius: 4, fontSize: "0.74rem", fontFamily: S.mono, fontWeight: 700 }}>{rule.trigger}</span>
                        <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 4, lineHeight: 1.4, wordBreak: "break-word" }}>{rule.expansion}</div>
                      </div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button onClick={() => setEditingRule({ ...rule })} style={btnStyle("transparent", S.muted, { fontSize: "0.64rem", padding: "3px 8px", border: `1px solid ${S.border}` })}>Edit</button>
                        {!rule.builtin && <button onClick={() => deleteRule(rule.id, "inline")} style={btnStyle("transparent", "#f87171", { fontSize: "0.64rem", padding: "3px 8px", border: "1px solid #7f1d1d" })}>Del</button>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Plan rules */}
            <div>
              <div style={{ fontSize: "0.7rem", color: S.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, borderBottom: `1px solid ${S.border}`, paddingBottom: 4 }}>
                Plan-Appended ({planRules.length})
              </div>
              {planRules.map(rule => (
                <div key={rule.id} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 6, padding: "10px 12px", marginBottom: 6 }}>
                  {editingRule?.id === rule.id ? (
                    <div>
                      <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                        <input value={editingRule.triggers} onChange={e => setEditingRule(p => ({ ...p, triggers: e.target.value }))} style={inputStyle({ flex: "0 0 160px" })} placeholder="RD, PVD, HST" />
                        <input value={editingRule.expansion} onChange={e => setEditingRule(p => ({ ...p, expansion: e.target.value }))} style={inputStyle({ flex: 1 })} />
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={saveEditingRule} style={btnStyle("#059669", "#fff", { fontSize: "0.68rem", padding: "4px 10px" })}>Save</button>
                        <button onClick={() => setEditingRule(null)} style={btnStyle("transparent", S.muted, { fontSize: "0.68rem", padding: "4px 10px", border: `1px solid ${S.border}` })}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ background: "#312e81", color: S.accentLight, padding: "2px 8px", borderRadius: 4, fontSize: "0.74rem", fontFamily: S.mono, fontWeight: 700 }}>{rule.triggers}</span>
                        <span style={{ fontSize: "0.64rem", color: S.muted, marginLeft: 6 }}>&#8594; appended under Plan</span>
                        <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 4, lineHeight: 1.4, wordBreak: "break-word" }}>{rule.expansion}</div>
                      </div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button onClick={() => setEditingRule({ ...rule })} style={btnStyle("transparent", S.muted, { fontSize: "0.64rem", padding: "3px 8px", border: `1px solid ${S.border}` })}>Edit</button>
                        {!rule.builtin && <button onClick={() => deleteRule(rule.id, "plan")} style={btnStyle("transparent", "#f87171", { fontSize: "0.64rem", padding: "3px 8px", border: "1px solid #7f1d1d" })}>Del</button>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MY INSTRUCTIONS TAB ─────────────────────────────────── */}
        {tab === "instructions" && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: "0.9rem", fontWeight: 700, color: S.bright }}>My Instructions</div>
              <div style={{ fontSize: "0.72rem", color: S.muted, marginTop: 2 }}>Tell Claude how you want your notes formatted. Write in plain English — these get sent directly to Claude with every note.</div>
            </div>
            <textarea
              value={customInstructions}
              onChange={e => setCustomInstructions(e.target.value)}
              placeholder={"Examples:\n- OCT-A review goes after OD and OS as a global statement for AMD patients\n- Never use ocriplasmin for VMT\n- Surgical history in reverse chronological order\n- Always mention AREDS2 for intermediate dry AMD\n- For PDT, RBA includes photosensitivity and systemic allergic reaction, NOT endophthalmitis/RD"}
              style={{
                ...inputStyle({ width: "100%", minHeight: 200 }),
                resize: "vertical",
                lineHeight: 1.6,
                fontSize: "0.82rem",
                fontFamily: "inherit",
              }}
            />
            <div style={{ fontSize: "0.68rem", color: S.muted, marginTop: 8 }}>
              Auto-saved to your profile. Changes apply to the next note you generate.
            </div>
          </div>
        )}

        {/* ── AI CODING TAB ────────────────────────────────────── */}
        {tab === "coding" && (
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <AICodingAssistant />
          </div>
        )}

        {/* ── CAN WE INJECT TAB ──────────────────────────────── */}
        {tab === "inject" && (
          <div style={{ margin: "0 auto", maxWidth: "100%" }}>
            <iframe
              src="https://retina-rx.vercel.app"
              title="Can We Inject? — Coverage Lookup"
              style={{ border: "none", width: "100%", height: "calc(100vh - 160px)" }}
              allow="clipboard-write"
            />
          </div>
        )}

        {/* ── PATIENT EDUCATION TAB ──────────────────────────── */}
        {tab === "education" && (
          <div style={{ margin: "-20px", minHeight: "80vh" }}>
            <PatientEducation onBack={() => setTab("input")} />
          </div>
        )}

        {/* ── AUTO DROP SCHEDULE (pre-populated from note) ────── */}
        {tab === "drops" && (
          <div style={{ margin: "-20px", minHeight: "80vh" }}>
            <DropSchedule onBack={() => setTab("output")} initialDrops={autoDrops} initialLang={autoLang} />
          </div>
        )}

        {/* ── ROBOCALL TAB (MR only) ─────────────────────────── */}
        {tab === "robocall" && surgeon && surgeon.hasRobocall && (
          <div style={{ padding: 20, textAlign: "center", color: S.muted, maxWidth: 800, margin: "0 auto" }}>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>📞</div>
            <div style={{ fontSize: "0.9rem", marginBottom: 16 }}>Robocall dictation system</div>
            <button onClick={() => { if (onBack) onBack(); setTimeout(() => window.__openDictator && window.__openDictator(), 100); }}
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", borderRadius: 8, padding: "12px 24px", fontSize: "0.9rem", fontFamily: S.font, fontWeight: 600, cursor: "pointer" }}>
              Open Robocall
            </button>
          </div>
        )}

        {/* ── LEGACY CODES TAB (hidden, kept for reference) ─── */}
        {false && tab === "codes" && (() => {
          const ICD10_DB = [
            { cat: "AMD", code: "H35.3110", desc: "Unspecified stage (OD)" },
            { cat: "AMD", code: "H35.3111", desc: "Early dry AMD (OD)" },
            { cat: "AMD", code: "H35.3112", desc: "Intermediate dry AMD (OD)" },
            { cat: "AMD", code: "H35.3113", desc: "Advanced atrophic, foveal-sparing GA (OD)" },
            { cat: "AMD", code: "H35.3114", desc: "Advanced atrophic, subfoveal GA (OD)" },
            { cat: "AMD", code: "H35.3120", desc: "Unspecified stage (OS)" },
            { cat: "AMD", code: "H35.3121", desc: "Early dry AMD (OS)" },
            { cat: "AMD", code: "H35.3122", desc: "Intermediate dry AMD (OS)" },
            { cat: "AMD", code: "H35.3123", desc: "Advanced atrophic, foveal-sparing GA (OS)" },
            { cat: "AMD", code: "H35.3124", desc: "Advanced atrophic, subfoveal GA (OS)" },
            { cat: "AMD", code: "H35.3130", desc: "Unspecified stage (OU)" },
            { cat: "AMD", code: "H35.3131", desc: "Early dry AMD (OU)" },
            { cat: "AMD", code: "H35.3132", desc: "Intermediate dry AMD (OU)" },
            { cat: "AMD", code: "H35.3133", desc: "Advanced atrophic, foveal-sparing GA (OU)" },
            { cat: "AMD", code: "H35.3134", desc: "Advanced atrophic, subfoveal GA (OU)" },
            { cat: "AMD", code: "H35.3210", desc: "Stage unspecified (OD)" },
            { cat: "AMD", code: "H35.3211", desc: "Active CNV— use when injecting anti-VEGF (OD)" },
            { cat: "AMD", code: "H35.3212", desc: "Inactive/involuted CNV (OD)" },
            { cat: "AMD", code: "H35.3213", desc: "Inactive scar (OD)" },
            { cat: "AMD", code: "H35.3220", desc: "Stage unspecified (OS)" },
            { cat: "AMD", code: "H35.3221", desc: "Active CNV— use when injecting anti-VEGF (OS)" },
            { cat: "AMD", code: "H35.3222", desc: "Inactive/involuted CNV (OS)" },
            { cat: "AMD", code: "H35.3223", desc: "Inactive scar (OS)" },
            { cat: "AMD", code: "H35.3230", desc: "Stage unspecified (OU)" },
            { cat: "AMD", code: "H35.3231", desc: "Active CNV— use when injecting anti-VEGF (OU)" },
            { cat: "AMD", code: "H35.3232", desc: "Inactive/involuted CNV (OU)" },
            { cat: "AMD", code: "H35.3233", desc: "Inactive scar (OU)" },
            { cat: "AMD", code: "H35.361", desc: "Drusen of macula (OD)" },
            { cat: "AMD", code: "H35.362", desc: "Drusen of macula (OS)" },
            { cat: "AMD", code: "H35.363", desc: "Drusen of macula (OU)" },
            { cat: "Anterior Segment", code: "H20.051", desc: "Hypopyon (OD)" },
            { cat: "Anterior Segment", code: "H20.052", desc: "Hypopyon (OS)" },
            { cat: "Anterior Segment", code: "H20.053", desc: "Hypopyon (OU)" },
            { cat: "Anterior Segment", code: "H21.01", desc: "Hyphema (OD)" },
            { cat: "Anterior Segment", code: "H21.02", desc: "Hyphema (OS)" },
            { cat: "Anterior Segment", code: "H21.03", desc: "Hyphema (OU)" },
            { cat: "Anterior Segment", code: "H21.82", desc: "Plateau iris syndrome (post-iridectomy)" },
            { cat: "Anterior Segment", code: "H27.111", desc: "Lens subluxation (OD)" },
            { cat: "Anterior Segment", code: "H27.112", desc: "Lens subluxation (OS)" },
            { cat: "Anterior Segment", code: "H27.113", desc: "Lens subluxation (OU)" },
            { cat: "Anterior Segment", code: "H40.131", desc: "pigmentary glaucoma (OD)" },
            { cat: "Anterior Segment", code: "H40.132", desc: "pigmentary glaucoma (OS)" },
            { cat: "Anterior Segment", code: "H40.133", desc: "pigmentary glaucoma (OU)" },
            { cat: "Artery Occlusion", code: "G45.3", desc: "Amaurosis fugax (transient monocular visual loss — vascular)" },
            { cat: "Artery Occlusion", code: "H34.11", desc: "CRAO (OD)" },
            { cat: "Artery Occlusion", code: "H34.12", desc: "CRAO (OS)" },
            { cat: "Artery Occlusion", code: "H34.13", desc: "CRAO (OU)" },
            { cat: "Artery Occlusion", code: "H34.211", desc: "Partial retinal artery occlusion / Hollenhorst plaque (OD)" },
            { cat: "Artery Occlusion", code: "H34.212", desc: "Partial retinal artery occlusion / Hollenhorst plaque (OS)" },
            { cat: "Artery Occlusion", code: "H34.213", desc: "Partial retinal artery occlusion / Hollenhorst plaque (OU)" },
            { cat: "Artery Occlusion", code: "H34.231", desc: "BRAO (OD)" },
            { cat: "Artery Occlusion", code: "H34.232", desc: "BRAO (OS)" },
            { cat: "Artery Occlusion", code: "H34.233", desc: "BRAO (OU)" },
            { cat: "Artery Occlusion", code: "H34.9", desc: "Unspecified retinal vascular occlusion" },
            { cat: "Cataract & Lens", code: "H25.011", desc: "Cortical cataract (OD)" },
            { cat: "Cataract & Lens", code: "H25.012", desc: "Cortical cataract (OS)" },
            { cat: "Cataract & Lens", code: "H25.013", desc: "Cortical cataract (OU)" },
            { cat: "Cataract & Lens", code: "H25.041", desc: "Posterior subcapsular cataract (PSC) (OD)" },
            { cat: "Cataract & Lens", code: "H25.042", desc: "Posterior subcapsular cataract (PSC) (OS)" },
            { cat: "Cataract & Lens", code: "H25.043", desc: "Posterior subcapsular cataract (PSC) (OU)" },
            { cat: "Cataract & Lens", code: "H25.11", desc: "Nuclear sclerotic cataract (OD)" },
            { cat: "Cataract & Lens", code: "H25.12", desc: "Nuclear sclerotic cataract (OS)" },
            { cat: "Cataract & Lens", code: "H25.13", desc: "Nuclear sclerotic cataract (OU)" },
            { cat: "Cataract & Lens", code: "H25.9", desc: "Unspecified age-related cataract" },
            { cat: "Cataract & Lens", code: "H26.001", desc: "Infantile/congenital cataract (OD)" },
            { cat: "Cataract & Lens", code: "H26.002", desc: "Infantile/congenital cataract (OS)" },
            { cat: "Cataract & Lens", code: "H26.003", desc: "Infantile/congenital cataract (OU)" },
            { cat: "Cataract & Lens", code: "H26.9", desc: "Unspecified cataract" },
            { cat: "Cataract & Lens", code: "H27.00", desc: "Aphakia" },
            { cat: "Cataract & Lens", code: "H27.121", desc: "Anterior dislocation of lens (OD)" },
            { cat: "Cataract & Lens", code: "H27.122", desc: "Anterior dislocation of lens (OS)" },
            { cat: "Cataract & Lens", code: "H27.123", desc: "Anterior dislocation of lens (OU)" },
            { cat: "Cataract & Lens", code: "H59.021", desc: "Retained lens fragments after cataract surgery (OD)" },
            { cat: "Cataract & Lens", code: "H59.022", desc: "Retained lens fragments after cataract surgery (OS)" },
            { cat: "Cataract & Lens", code: "H59.023", desc: "Retained lens fragments after cataract surgery (OU)" },
            { cat: "Cataract & Lens", code: "H59.031", desc: "CME following cataract surgery (OD)" },
            { cat: "Cataract & Lens", code: "H59.032", desc: "CME following cataract surgery (OS)" },
            { cat: "Cataract & Lens", code: "H59.033", desc: "CME following cataract surgery (OU)" },
            { cat: "Cataract & Lens", code: "T85.22xA", desc: "Displaced IOL (dislocated IOL)" },
            { cat: "Cataract & Lens", code: "Z96.1", desc: "Pseudophakia (IOL implant status)" },
            { cat: "Choroidal", code: "H30.91", desc: "Chorioretinal inflammation unspecified (OD)" },
            { cat: "Choroidal", code: "H30.92", desc: "Chorioretinal inflammation unspecified (OS)" },
            { cat: "Choroidal", code: "H30.93", desc: "Chorioretinal inflammation unspecified (OU)" },
            { cat: "Choroidal", code: "H31.011", desc: "Macula scars of posterior pole (post-inflammatory/post-traumatic) (OD)" },
            { cat: "Choroidal", code: "H31.012", desc: "Macula scars of posterior pole (post-inflammatory/post-traumatic) (OS)" },
            { cat: "Choroidal", code: "H31.013", desc: "Macula scars of posterior pole (post-inflammatory/post-traumatic) (OU)" },
            { cat: "Choroidal", code: "H31.021", desc: "Solar retinopathy (OD)" },
            { cat: "Choroidal", code: "H31.022", desc: "Solar retinopathy (OS)" },
            { cat: "Choroidal", code: "H31.023", desc: "Solar retinopathy (OU)" },
            { cat: "Choroidal", code: "H31.21", desc: "Choroideremia (OD)" },
            { cat: "Choroidal", code: "H31.22", desc: "Choroideremia (OS)" },
            { cat: "Choroidal", code: "H31.23", desc: "Choroideremia (OU)" },
            { cat: "Choroidal", code: "H31.301", desc: "Choroidal hemorrhage unspecified (OD)" },
            { cat: "Choroidal", code: "H31.302", desc: "Choroidal hemorrhage unspecified (OS)" },
            { cat: "Choroidal", code: "H31.303", desc: "Choroidal hemorrhage unspecified (OU)" },
            { cat: "Choroidal", code: "H31.321", desc: "Choroidal rupture (OD)" },
            { cat: "Choroidal", code: "H31.322", desc: "Choroidal rupture (OS)" },
            { cat: "Choroidal", code: "H31.323", desc: "Choroidal rupture (OU)" },
            { cat: "Choroidal", code: "H31.411", desc: "Hemorrhagic choroidal detachment (OD)" },
            { cat: "Choroidal", code: "H31.412", desc: "Hemorrhagic choroidal detachment (OS)" },
            { cat: "Choroidal", code: "H31.413", desc: "Hemorrhagic choroidal detachment (OU)" },
            { cat: "Choroidal", code: "H31.421", desc: "Serous choroidal detachment (OD)" },
            { cat: "Choroidal", code: "H31.422", desc: "Serous choroidal detachment (OS)" },
            { cat: "Choroidal", code: "H31.423", desc: "Serous choroidal detachment (OU)" },
            { cat: "Choroidal", code: "H59.811", desc: "Chorioretinal scars after surgery for detachment (OD)" },
            { cat: "Choroidal", code: "H59.812", desc: "Chorioretinal scars after surgery for detachment (OS)" },
            { cat: "Choroidal", code: "H59.813", desc: "Chorioretinal scars after surgery for detachment (OU)" },
            { cat: "Cornea & External", code: "H04.121", desc: "Dry eye (OD)" },
            { cat: "Cornea & External", code: "H04.122", desc: "Dry eye (OS)" },
            { cat: "Cornea & External", code: "H04.123", desc: "Dry eye (OU)" },
            { cat: "Cornea & External", code: "H10.011", desc: "Acute follicular conjunctivitis (OD)" },
            { cat: "Cornea & External", code: "H10.012", desc: "Acute follicular conjunctivitis (OS)" },
            { cat: "Cornea & External", code: "H10.013", desc: "Acute follicular conjunctivitis (OU)" },
            { cat: "Cornea & External", code: "H11.051", desc: "Pterygium (OD)" },
            { cat: "Cornea & External", code: "H11.052", desc: "Pterygium (OS)" },
            { cat: "Cornea & External", code: "H11.053", desc: "Pterygium (OU)" },
            { cat: "Cornea & External", code: "H16.01", desc: "Corneal ulcer (OD)" },
            { cat: "Cornea & External", code: "H16.02", desc: "Corneal ulcer (OS)" },
            { cat: "Cornea & External", code: "H16.03", desc: "Corneal ulcer (OU)" },
            { cat: "Cornea & External", code: "H16.031", desc: "Corneal abscess (OD)" },
            { cat: "Cornea & External", code: "H16.032", desc: "Corneal abscess (OS)" },
            { cat: "Cornea & External", code: "H16.033", desc: "Corneal abscess (OU)" },
            { cat: "Cornea & External", code: "H16.111", desc: "HSV keratitis (code B00.52 too) (OD)" },
            { cat: "Cornea & External", code: "H16.112", desc: "HSV keratitis (code B00.52 too) (OS)" },
            { cat: "Cornea & External", code: "H16.113", desc: "HSV keratitis (code B00.52 too) (OU)" },
            { cat: "Cornea & External", code: "H18.601", desc: "Keratoconus (OD)" },
            { cat: "Cornea & External", code: "H18.602", desc: "Keratoconus (OS)" },
            { cat: "Cornea & External", code: "H18.603", desc: "Keratoconus (OU)" },
            { cat: "Cornea & External", code: "S05.01xA", desc: "Corneal abrasion, initial encounter" },
            { cat: "Cornea & External", code: "T15.01xA", desc: "Corneal foreign body (OD)" },
            { cat: "Cornea & External", code: "T15.02xA", desc: "Corneal foreign body (OS)" },
            { cat: "Degenerative Myopia", code: "H44.2A1", desc: "Degenerative myopia with choroidal neovascularization (OD)" },
            { cat: "Degenerative Myopia", code: "H44.2A2", desc: "Degenerative myopia with choroidal neovascularization (OS)" },
            { cat: "Degenerative Myopia", code: "H44.2A3", desc: "Degenerative myopia with choroidal neovascularization (OU)" },
            { cat: "Degenerative Myopia", code: "H44.2B1", desc: "Degenerative myopia with macular hole (OD)" },
            { cat: "Degenerative Myopia", code: "H44.2B2", desc: "Degenerative myopia with macular hole (OS)" },
            { cat: "Degenerative Myopia", code: "H44.2B3", desc: "Degenerative myopia with macular hole (OU)" },
            { cat: "Degenerative Myopia", code: "H44.2C1", desc: "Degenerative myopia with retinal detachment (OD)" },
            { cat: "Degenerative Myopia", code: "H44.2C2", desc: "Degenerative myopia with retinal detachment (OS)" },
            { cat: "Degenerative Myopia", code: "H44.2C3", desc: "Degenerative myopia with retinal detachment (OU)" },
            { cat: "Degenerative Myopia", code: "H44.2D1", desc: "Degenerative myopia with foveoschisis (OD)" },
            { cat: "Degenerative Myopia", code: "H44.2D2", desc: "Degenerative myopia with foveoschisis (OS)" },
            { cat: "Degenerative Myopia", code: "H44.2D3", desc: "Degenerative myopia with foveoschisis (OU)" },
            { cat: "Degenerative Myopia", code: "H44.2E1", desc: "Degenerative myopia with other maculopathy (OD)" },
            { cat: "Degenerative Myopia", code: "H44.2E2", desc: "Degenerative myopia with other maculopathy (OS)" },
            { cat: "Degenerative Myopia", code: "H44.2E3", desc: "Degenerative myopia with other maculopathy (OU)" },
            { cat: "Diabetic", code: "E10.3111", desc: "T1DM Unspecified DR with DME (OD)" },
            { cat: "Diabetic", code: "E10.3112", desc: "T1DM Unspecified DR with DME (OS)" },
            { cat: "Diabetic", code: "E10.3113", desc: "T1DM Unspecified DR with DME (OU)" },
            { cat: "Diabetic", code: "E10.3191", desc: "T1DM Unspecified DR without DME (OD)" },
            { cat: "Diabetic", code: "E10.3192", desc: "T1DM Unspecified DR without DME (OS)" },
            { cat: "Diabetic", code: "E10.3193", desc: "T1DM Unspecified DR without DME (OU)" },
            { cat: "Diabetic", code: "E10.3211", desc: "T1DM Mild NPDR with DME (OD)" },
            { cat: "Diabetic", code: "E10.3212", desc: "T1DM Mild NPDR with DME (OS)" },
            { cat: "Diabetic", code: "E10.3213", desc: "T1DM Mild NPDR with DME (OU)" },
            { cat: "Diabetic", code: "E10.3291", desc: "T1DM Mild NPDR without DME (OD)" },
            { cat: "Diabetic", code: "E10.3292", desc: "T1DM Mild NPDR without DME (OS)" },
            { cat: "Diabetic", code: "E10.3293", desc: "T1DM Mild NPDR without DME (OU)" },
            { cat: "Diabetic", code: "E10.3311", desc: "T1DM Moderate NPDR with DME (OD)" },
            { cat: "Diabetic", code: "E10.3312", desc: "T1DM Moderate NPDR with DME (OS)" },
            { cat: "Diabetic", code: "E10.3313", desc: "T1DM Moderate NPDR with DME (OU)" },
            { cat: "Diabetic", code: "E10.3391", desc: "T1DM Moderate NPDR without DME (OD)" },
            { cat: "Diabetic", code: "E10.3392", desc: "T1DM Moderate NPDR without DME (OS)" },
            { cat: "Diabetic", code: "E10.3393", desc: "T1DM Moderate NPDR without DME (OU)" },
            { cat: "Diabetic", code: "E10.3411", desc: "T1DM Severe NPDR with DME (OD)" },
            { cat: "Diabetic", code: "E10.3412", desc: "T1DM Severe NPDR with DME (OS)" },
            { cat: "Diabetic", code: "E10.3413", desc: "T1DM Severe NPDR with DME (OU)" },
            { cat: "Diabetic", code: "E10.3491", desc: "T1DM Severe NPDR without DME (OD)" },
            { cat: "Diabetic", code: "E10.3492", desc: "T1DM Severe NPDR without DME (OS)" },
            { cat: "Diabetic", code: "E10.3493", desc: "T1DM Severe NPDR without DME (OU)" },
            { cat: "Diabetic", code: "E10.3511", desc: "T1DM PDR with DME (OD)" },
            { cat: "Diabetic", code: "E10.3512", desc: "T1DM PDR with DME (OS)" },
            { cat: "Diabetic", code: "E10.3513", desc: "T1DM PDR with DME (OU)" },
            { cat: "Diabetic", code: "E10.3521", desc: "T1DM PDR with TRD involving macula (OD)" },
            { cat: "Diabetic", code: "E10.3522", desc: "T1DM PDR with TRD involving macula (OS)" },
            { cat: "Diabetic", code: "E10.3523", desc: "T1DM PDR with TRD involving macula (OU)" },
            { cat: "Diabetic", code: "E10.3531", desc: "T1DM PDR with TRD not involving macula (OD)" },
            { cat: "Diabetic", code: "E10.3532", desc: "T1DM PDR with TRD not involving macula (OS)" },
            { cat: "Diabetic", code: "E10.3533", desc: "T1DM PDR with TRD not involving macula (OU)" },
            { cat: "Diabetic", code: "E10.3541", desc: "T1DM PDR with combined TRD and RRD (OD)" },
            { cat: "Diabetic", code: "E10.3542", desc: "T1DM PDR with combined TRD and RRD (OS)" },
            { cat: "Diabetic", code: "E10.3543", desc: "T1DM PDR with combined TRD and RRD (OU)" },
            { cat: "Diabetic", code: "E10.3551", desc: "T1DM PDR with stable proliferative DR (OD)" },
            { cat: "Diabetic", code: "E10.3552", desc: "T1DM PDR with stable proliferative DR (OS)" },
            { cat: "Diabetic", code: "E10.3553", desc: "T1DM PDR with stable proliferative DR (OU)" },
            { cat: "Diabetic", code: "E10.3591", desc: "T1DM PDR with other complications incl VH (OD)" },
            { cat: "Diabetic", code: "E10.3592", desc: "T1DM PDR with other complications (includes VH) (OS)" },
            { cat: "Diabetic", code: "E10.3593", desc: "T1DM PDR with other complications (includes VH) (OU)" },
            { cat: "Diabetic", code: "E10.37X1", desc: "T1DM DME resolved following treatment (OD)" },
            { cat: "Diabetic", code: "E10.37X2", desc: "T1DM DME resolved following treatment (OS)" },
            { cat: "Diabetic", code: "E10.37X3", desc: "T1DM DME resolved following treatment (OU)" },
            { cat: "Diabetic", code: "E10.39", desc: "T1DM Other diabetic ophthalmic complications (includes diabetic glaucoma)" },
            { cat: "Diabetic", code: "E11.3111", desc: "T2DM Unspecified DR with DME (OD)" },
            { cat: "Diabetic", code: "E11.3112", desc: "T2DM Unspecified DR with DME (OS)" },
            { cat: "Diabetic", code: "E11.3113", desc: "T2DM Unspecified DR with DME (OU)" },
            { cat: "Diabetic", code: "E11.3191", desc: "T2DM Unspecified DR without DME (OD)" },
            { cat: "Diabetic", code: "E11.3192", desc: "T2DM Unspecified DR without DME (OS)" },
            { cat: "Diabetic", code: "E11.3193", desc: "T2DM Unspecified DR without DME (OU)" },
            { cat: "Diabetic", code: "E11.3211", desc: "T2DM Mild NPDR with DME (OD)" },
            { cat: "Diabetic", code: "E11.3212", desc: "T2DM Mild NPDR with DME (OS)" },
            { cat: "Diabetic", code: "E11.3213", desc: "T2DM Mild NPDR with DME (OU)" },
            { cat: "Diabetic", code: "E11.3291", desc: "T2DM Mild NPDR without DME (OD)" },
            { cat: "Diabetic", code: "E11.3292", desc: "T2DM Mild NPDR without DME (OS)" },
            { cat: "Diabetic", code: "E11.3293", desc: "T2DM Mild NPDR without DME (OU)" },
            { cat: "Diabetic", code: "E11.3311", desc: "T2DM Moderate NPDR with DME (OD)" },
            { cat: "Diabetic", code: "E11.3312", desc: "T2DM Moderate NPDR with DME (OS)" },
            { cat: "Diabetic", code: "E11.3313", desc: "T2DM Moderate NPDR with DME (OU)" },
            { cat: "Diabetic", code: "E11.3391", desc: "T2DM Moderate NPDR without DME (OD)" },
            { cat: "Diabetic", code: "E11.3392", desc: "T2DM Moderate NPDR without DME (OS)" },
            { cat: "Diabetic", code: "E11.3393", desc: "T2DM Moderate NPDR without DME (OU)" },
            { cat: "Diabetic", code: "E11.3411", desc: "T2DM Severe NPDR with DME (OD)" },
            { cat: "Diabetic", code: "E11.3412", desc: "T2DM Severe NPDR with DME (OS)" },
            { cat: "Diabetic", code: "E11.3413", desc: "T2DM Severe NPDR with DME (OU)" },
            { cat: "Diabetic", code: "E11.3491", desc: "T2DM Severe NPDR without DME (OD)" },
            { cat: "Diabetic", code: "E11.3492", desc: "T2DM Severe NPDR without DME (OS)" },
            { cat: "Diabetic", code: "E11.3493", desc: "T2DM Severe NPDR without DME (OU)" },
            { cat: "Diabetic", code: "E11.3511", desc: "T2DM PDR with DME (OD)" },
            { cat: "Diabetic", code: "E11.3512", desc: "T2DM PDR with DME (OS)" },
            { cat: "Diabetic", code: "E11.3513", desc: "T2DM PDR with DME (OU)" },
            { cat: "Diabetic", code: "E11.3521", desc: "T2DM PDR with TRD involving macula (OD)" },
            { cat: "Diabetic", code: "E11.3522", desc: "T2DM PDR with TRD involving macula (OS)" },
            { cat: "Diabetic", code: "E11.3523", desc: "T2DM PDR with TRD involving macula (OU)" },
            { cat: "Diabetic", code: "E11.3531", desc: "T2DM PDR with TRD not involving macula (OD)" },
            { cat: "Diabetic", code: "E11.3532", desc: "T2DM PDR with TRD not involving macula (OS)" },
            { cat: "Diabetic", code: "E11.3533", desc: "T2DM PDR with TRD not involving macula (OU)" },
            { cat: "Diabetic", code: "E11.3541", desc: "T2DM PDR with combined TRD and RRD (OD)" },
            { cat: "Diabetic", code: "E11.3542", desc: "T2DM PDR with combined TRD and RRD (OS)" },
            { cat: "Diabetic", code: "E11.3543", desc: "T2DM PDR with combined TRD and RRD (OU)" },
            { cat: "Diabetic", code: "E11.3551", desc: "T2DM PDR with stable proliferative DR (OD)" },
            { cat: "Diabetic", code: "E11.3552", desc: "T2DM PDR with stable proliferative DR (OS)" },
            { cat: "Diabetic", code: "E11.3553", desc: "T2DM PDR with stable proliferative DR (OU)" },
            { cat: "Diabetic", code: "E11.3591", desc: "T2DM PDR with other complications incl VH (OD)" },
            { cat: "Diabetic", code: "E11.3592", desc: "T2DM PDR with other complications (includes VH) (OS)" },
            { cat: "Diabetic", code: "E11.3593", desc: "T2DM PDR with other complications (includes VH) (OU)" },
            { cat: "Diabetic", code: "E11.37X1", desc: "T2DM DME resolved following treatment(OD)" },
            { cat: "Diabetic", code: "E11.37X2", desc: "T2DM DME resolved following treatment(OS)" },
            { cat: "Diabetic", code: "E11.37X3", desc: "T2DM DME resolved following treatment(OU)" },
            { cat: "Diabetic", code: "E11.39", desc: "T2DM Other diabetic ophthalmic complications (includes diabetic glaucoma)" },
            { cat: "Diabetic", code: "H40.89", desc: "rubeosis captured in NVG" },
            { cat: "Diabetic", code: "H43.11", desc: "VH) → only for NON-diabetic VH (RVO (OD)" },
            { cat: "Diabetic", code: "H43.12", desc: "VH) → only for NON-diabetic VH (RVO (OS)" },
            { cat: "Diabetic", code: "H43.13", desc: "VH) → only for NON-diabetic VH (RVO (OU)" },
            { cat: "Diabetic", code: "R73.03", desc: "Prediabetes" },
            { cat: "Diabetic", code: "R73.09", desc: "Other abnormal glucose (e.g., prediabetes)" },
            { cat: "Endophthalmitis", code: "H44.001", desc: "Purulent endophthalmitis (OD)" },
            { cat: "Endophthalmitis", code: "H44.002", desc: "Purulent endophthalmitis (OS)" },
            { cat: "Endophthalmitis", code: "H44.003", desc: "Purulent endophthalmitis (OU)" },
            { cat: "Endophthalmitis", code: "H44.011", desc: "Panophthalmitis (acute) (OD)" },
            { cat: "Endophthalmitis", code: "H44.012", desc: "Panophthalmitis (acute) (OS)" },
            { cat: "Endophthalmitis", code: "H44.013", desc: "Panophthalmitis (acute) (OU)" },
            { cat: "Endophthalmitis", code: "H44.111", desc: "Panuveitis (OD)" },
            { cat: "Endophthalmitis", code: "H44.112", desc: "Panuveitis (OS)" },
            { cat: "Endophthalmitis", code: "H44.113", desc: "Panuveitis (OU)" },
            { cat: "Endophthalmitis", code: "H44.131", desc: "Sympathetic uveitis (OD)" },
            { cat: "Endophthalmitis", code: "H44.132", desc: "Sympathetic uveitis (OS)" },
            { cat: "Endophthalmitis", code: "H44.133", desc: "Sympathetic uveitis (OU)" },
            { cat: "Endophthalmitis", code: "H44.19", desc: "Other endophthalmitis" },
            { cat: "Glaucoma", code: "H40.001", desc: "Preglaucoma unspecified (OD)" },
            { cat: "Glaucoma", code: "H40.002", desc: "Preglaucoma unspecified (OS)" },
            { cat: "Glaucoma", code: "H40.003", desc: "Preglaucoma unspecified (OU)" },
            { cat: "Glaucoma", code: "H40.011", desc: "OAG suspect, low risk (1–2 risk factors) (OD)" },
            { cat: "Glaucoma", code: "H40.012", desc: "OAG suspect, low risk (1–2 risk factors) (OS)" },
            { cat: "Glaucoma", code: "H40.013", desc: "OAG suspect, low risk (1–2 risk factors) (OU)" },
            { cat: "Glaucoma", code: "H40.021", desc: "OAG suspect, high risk (3+ risk factors) (OD)" },
            { cat: "Glaucoma", code: "H40.022", desc: "OAG suspect, high risk (3+ risk factors) (OS)" },
            { cat: "Glaucoma", code: "H40.023", desc: "OAG suspect, high risk (3+ risk factors) (OU)" },
            { cat: "Glaucoma", code: "H40.031", desc: "Anatomical narrow angle / primary angle closure suspect (OD)" },
            { cat: "Glaucoma", code: "H40.032", desc: "Anatomical narrow angle / primary angle closure suspect (OS)" },
            { cat: "Glaucoma", code: "H40.033", desc: "Anatomical narrow angle / primary angle closure suspect (OU)" },
            { cat: "Glaucoma", code: "H40.041", desc: "Steroid responder (OD)" },
            { cat: "Glaucoma", code: "H40.042", desc: "Steroid responder (OS)" },
            { cat: "Glaucoma", code: "H40.043", desc: "Steroid responder (OU)" },
            { cat: "Glaucoma", code: "H40.051", desc: "Ocular hypertension (OHT) (OD)" },
            { cat: "Glaucoma", code: "H40.052", desc: "Ocular hypertension (OHT) (OS)" },
            { cat: "Glaucoma", code: "H40.053", desc: "Ocular hypertension (OHT) (OU)" },
            { cat: "Glaucoma", code: "H40.061", desc: "Primary angle closure without glaucoma damage (PAS or high IOP, no ON or VF loss) (OD)" },
            { cat: "Glaucoma", code: "H40.062", desc: "Primary angle closure without glaucoma damage (PAS or high IOP, no ON or VF loss) (OS)" },
            { cat: "Glaucoma", code: "H40.063", desc: "Primary angle closure without glaucoma damage (PAS or high IOP, no ON or VF loss) (OU)" },
            { cat: "Glaucoma", code: "H40.10X_", desc: "Unspecified open-angle glaucoma (no eye indicator; X placeholder in 6th, stage in 7th)" },
            { cat: "Glaucoma", code: "H40.111_", desc: "POAG OD (_=stage: 0=unspecified,1=mild,2=moderate,3=severe,4=indeterminate)" },
            { cat: "Glaucoma", code: "H40.112_", desc: "POAG OS (_=stage: 0=unspecified,1=mild,2=moderate,3=severe,4=indeterminate)" },
            { cat: "Glaucoma", code: "H40.113_", desc: "POAG OU (_=stage: 0=unspecified,1=mild,2=moderate,3=severe,4=indeterminate)" },
            { cat: "Glaucoma", code: "H40.121_", desc: "Low-tension glaucoma (NTG) (OD/OS/OU + staging) (OD)" },
            { cat: "Glaucoma", code: "H40.122_", desc: "Low-tension glaucoma (NTG) (OD/OS/OU + staging) (OS)" },
            { cat: "Glaucoma", code: "H40.123_", desc: "Low-tension glaucoma (NTG) (OD/OS/OU + staging) (OU)" },
            { cat: "Glaucoma", code: "H40.131_", desc: "Pigmentary glaucoma (OD/OS/OU + staging) (OD)" },
            { cat: "Glaucoma", code: "H40.132_", desc: "Pigmentary glaucoma (OD/OS/OU + staging) (OS)" },
            { cat: "Glaucoma", code: "H40.133_", desc: "Pigmentary glaucoma (OD/OS/OU + staging) (OU)" },
            { cat: "Glaucoma", code: "H40.141_", desc: "Capsular glaucoma with pseudoexfoliation (PXF) (OD/OS/OU + staging) (OD)" },
            { cat: "Glaucoma", code: "H40.142_", desc: "Capsular glaucoma with pseudoexfoliation (PXF) (OD/OS/OU + staging) (OS)" },
            { cat: "Glaucoma", code: "H40.143_", desc: "Capsular glaucoma with pseudoexfoliation (PXF) (OD/OS/OU + staging) (OU)" },
            { cat: "Glaucoma", code: "H40.151", desc: "Residual stage of open-angle glaucoma— NO staging (OD)" },
            { cat: "Glaucoma", code: "H40.152", desc: "Residual stage of open-angle glaucoma— NO staging (OS)" },
            { cat: "Glaucoma", code: "H40.153", desc: "Residual stage of open-angle glaucoma— NO staging (OU)" },
            { cat: "Glaucoma", code: "H40.20X_", desc: "Unspecified primary angle-closure glaucoma (no eye indicator; X placeholder, stage in 7th)" },
            { cat: "Glaucoma", code: "H40.211_", desc: "Acute angle-closure glaucoma attack / crisis— NO staging (OD)" },
            { cat: "Glaucoma", code: "H40.212_", desc: "Acute angle-closure glaucoma attack / crisis— NO staging (OS)" },
            { cat: "Glaucoma", code: "H40.213_", desc: "Acute angle-closure glaucoma attack / crisis— NO staging (OU)" },
            { cat: "Glaucoma", code: "H40.221_", desc: "Chronic angle-closure glaucoma (OD/OS/OU + staging) (OD)" },
            { cat: "Glaucoma", code: "H40.222_", desc: "Chronic angle-closure glaucoma (OD/OS/OU + staging) (OS)" },
            { cat: "Glaucoma", code: "H40.223_", desc: "Chronic angle-closure glaucoma (OD/OS/OU + staging) (OU)" },
            { cat: "Glaucoma", code: "H40.231_", desc: "Intermittent angle-closure glaucoma— NO staging (OD)" },
            { cat: "Glaucoma", code: "H40.232_", desc: "Intermittent angle-closure glaucoma— NO staging (OS)" },
            { cat: "Glaucoma", code: "H40.233_", desc: "Intermittent angle-closure glaucoma— NO staging (OU)" },
            { cat: "Glaucoma", code: "H40.241", desc: "Residual stage of angle-closure glaucoma— NO staging (OD)" },
            { cat: "Glaucoma", code: "H40.242", desc: "Residual stage of angle-closure glaucoma— NO staging (OS)" },
            { cat: "Glaucoma", code: "H40.243", desc: "Residual stage of angle-closure glaucoma— NO staging (OU)" },
            { cat: "Glaucoma", code: "H40.3", desc: "H40.6) require:" },
            { cat: "Glaucoma", code: "H40.31", desc: "H40.6x (code underlying condition first + staging in 7th):** (OD)" },
            { cat: "Glaucoma", code: "H40.31X_", desc: "(OD/OS/OU; X placeholder in 6th, staging in 7th) (OD)" },
            { cat: "Glaucoma", code: "H40.32", desc: "H40.6x (code underlying condition first + staging in 7th):** (OS)" },
            { cat: "Glaucoma", code: "H40.32X_", desc: "(OD/OS/OU; X placeholder in 6th, staging in 7th) (OS)" },
            { cat: "Glaucoma", code: "H40.33", desc: "H40.6x (code underlying condition first + staging in 7th):** (OU)" },
            { cat: "Glaucoma", code: "H40.33X_", desc: "(OD/OS/OU; X placeholder in 6th, staging in 7th) (OU)" },
            { cat: "Glaucoma", code: "H40.4", desc: "Secondary to eye inflammation: code inflammatory condition first" },
            { cat: "Glaucoma", code: "H40.41X_", desc: "(OD/OS/OU + staging) (OD)" },
            { cat: "Glaucoma", code: "H40.42X_", desc: "(OD/OS/OU + staging) (OS)" },
            { cat: "Glaucoma", code: "H40.43X_", desc: "(OD/OS/OU + staging) (OU)" },
            { cat: "Glaucoma", code: "H40.5", desc: "Secondary to other eye disorders: code underlying disorder first (RVO H34.-, diabetic E10.39/E11.39, cataract H25-H28, IOL disorder T85.2-, tumor D31.-/C69.-, other ocular surgery H59.89)" },
            { cat: "Glaucoma", code: "H40.51X_", desc: "(OD/OS/OU + staging) (OD)" },
            { cat: "Glaucoma", code: "H40.52X_", desc: "(OD/OS/OU + staging) (OS)" },
            { cat: "Glaucoma", code: "H40.53X_", desc: "(OD/OS/OU + staging) (OU)" },
            { cat: "Glaucoma", code: "H40.6", desc: "Secondary to drugs: code drug adverse effect (T49.5X5A, T38.0X5A, T43.3X5A) first" },
            { cat: "Glaucoma", code: "H40.61", desc: "code underlying condition first + staging in 7th):** (OD)" },
            { cat: "Glaucoma", code: "H40.61X_", desc: "(OD/OS/OU + staging) (OD)" },
            { cat: "Glaucoma", code: "H40.62", desc: "code underlying condition first + staging in 7th):** (OS)" },
            { cat: "Glaucoma", code: "H40.62X_", desc: "(OD/OS/OU + staging) (OS)" },
            { cat: "Glaucoma", code: "H40.63", desc: "code underlying condition first + staging in 7th):** (OU)" },
            { cat: "Glaucoma", code: "H40.63X_", desc: "(OD/OS/OU + staging) (OU)" },
            { cat: "Glaucoma", code: "H40.811", desc: "Glaucoma with increased episcleral venous pressure— NO staging (OD)" },
            { cat: "Glaucoma", code: "H40.812", desc: "Glaucoma with increased episcleral venous pressure— NO staging (OS)" },
            { cat: "Glaucoma", code: "H40.813", desc: "Glaucoma with increased episcleral venous pressure— NO staging (OU)" },
            { cat: "Glaucoma", code: "H40.821", desc: "Hypersecretion glaucoma— NO staging (OD)" },
            { cat: "Glaucoma", code: "H40.822", desc: "Hypersecretion glaucoma— NO staging (OS)" },
            { cat: "Glaucoma", code: "H40.823", desc: "Hypersecretion glaucoma— NO staging (OU)" },
            { cat: "Glaucoma", code: "H40.831", desc: "Aqueous misdirection / malignant glaucoma— NO staging (OD)" },
            { cat: "Glaucoma", code: "H40.832", desc: "Aqueous misdirection / malignant glaucoma— NO staging (OS)" },
            { cat: "Glaucoma", code: "H40.833", desc: "Aqueous misdirection / malignant glaucoma— NO staging (OU)" },
            { cat: "Glaucoma", code: "H40.9", desc: "Unspecified glaucoma" },
            { cat: "Glaucoma", code: "H44.411", desc: "Flat anterior chamber hypotony (OD)" },
            { cat: "Glaucoma", code: "H44.412", desc: "Flat anterior chamber hypotony (OS)" },
            { cat: "Glaucoma", code: "H44.413", desc: "Flat anterior chamber hypotony (OU)" },
            { cat: "Glaucoma", code: "H44.421", desc: "Hypotony of eye due to ocular fistula (OD)" },
            { cat: "Glaucoma", code: "H44.422", desc: "Hypotony of eye due to ocular fistula (OS)" },
            { cat: "Glaucoma", code: "H44.423", desc: "Hypotony of eye due to ocular fistula (OU)" },
            { cat: "Glaucoma", code: "H44.511", desc: "Absolute glaucoma (OD)" },
            { cat: "Glaucoma", code: "H44.512", desc: "Absolute glaucoma (OS)" },
            { cat: "Glaucoma", code: "H44.513", desc: "Absolute glaucoma (OU)" },
            { cat: "Glaucoma", code: "H59.41", desc: "Postprocedural blebitis, stage 1 (blebitis only)" },
            { cat: "Glaucoma", code: "H59.42", desc: "Postprocedural blebitis, stage 2 (blebitis + anterior chamber reaction)" },
            { cat: "Glaucoma", code: "H59.43", desc: "Postprocedural blebitis, stage 3 (blebitis associated endophthalmitis)" },
            { cat: "Glaucoma", code: "Q15.0", desc: "Congenital glaucoma (includes buphthalmos, hydrophthalmos, keratoglobus/macrocornea/megalocornea with glaucoma, macrophthalmos in congenital glaucoma, Axenfeld's anomaly)" },
            { cat: "Glaucoma", code: "T38.0X5A", desc: "systemic steroids/glucocorticoids" },
            { cat: "Glaucoma", code: "T43.3X5A", desc: "psychotropic drugs" },
            { cat: "Glaucoma", code: "T49.5X5A", desc: "ophthalmic drugs" },
            { cat: "Glaucoma", code: "T81.31X", desc: "A/D/S) — Disruption of external wound / wound dehiscence (A=initial" },
            { cat: "Glaucoma", code: "T81.83X", desc: "A/D/S) — Persistent postprocedural fistula (A=initial" },
            { cat: "Glaucoma", code: "T85.390", desc: "A/D/S) — Mechanical complication" },
            { cat: "Glaucoma", code: "T85.391", desc: "A/D/S) — Mechanical complication" },
            { cat: "Glaucoma", code: "T85.398", desc: "A/D/S) — Other mechanical complication of ocular prosthetic devices/implants/grafts" },
            { cat: "Hereditary/Dystrophy", code: "H33.121", desc: "Retinoschisis (OD)" },
            { cat: "Hereditary/Dystrophy", code: "H33.122", desc: "Retinoschisis (OS)" },
            { cat: "Hereditary/Dystrophy", code: "H33.123", desc: "Retinoschisis (OU)" },
            { cat: "Hereditary/Dystrophy", code: "H35.50", desc: "Macular dystrophy unspecified (Best disease, vitelliform)" },
            { cat: "Hereditary/Dystrophy", code: "H35.51", desc: "Stargardt disease (vitreoretinal dystrophy)" },
            { cat: "Hereditary/Dystrophy", code: "H35.52", desc: "Retinitis pigmentosa (RP)" },
            { cat: "Hereditary/Dystrophy", code: "H35.53", desc: "Other dystrophies primarily involving sensory retina (Stargardt-like)" },
            { cat: "Hereditary/Dystrophy", code: "H35.54", desc: "Dystrophies primarily involving RPE (pattern dystrophy, Doyne honeycomb)" },
            { cat: "Hereditary/Dystrophy", code: "Q14.1", desc: "Congenital malformation of retina (Leber congenital amaurosis / LCA)" },
            { cat: "Hereditary/Dystrophy", code: "Q82.8", desc: "FEVR (familial exudative vitreoretinopathy)" },
            { cat: "Infectious", code: "A18.50", desc: "Tuberculosis of eye" },
            { cat: "Infectious", code: "A52.15", desc: "Syphilitic retinitis" },
            { cat: "Infectious", code: "B00.52", desc: "HSV keratitis" },
            { cat: "Infectious", code: "B00.59", desc: "HSV other ocular (ARN from HSV)" },
            { cat: "Infectious", code: "B02.30", desc: "HZO (zoster ophthalmicus)" },
            { cat: "Infectious", code: "B02.39", desc: "Other zoster ocular (ARN from VZV)" },
            { cat: "Infectious", code: "B20", desc: "HIV disease (code as primary when causing retinopathy)" },
            { cat: "Infectious", code: "B25.11", desc: "CMV retinitis" },
            { cat: "Infectious", code: "B39.4", desc: "Histoplasmosis (code alongside ocular)" },
            { cat: "Infectious", code: "B58.01", desc: "Toxoplasmosis retinochoroiditis" },
            { cat: "Infectious", code: "B83.0", desc: "Toxocara" },
            { cat: "Macular", code: "H35.021", desc: "Exudative retinopathy (Coats disease) (OD)" },
            { cat: "Macular", code: "H35.022", desc: "Exudative retinopathy (Coats disease) (OS)" },
            { cat: "Macular", code: "H35.023", desc: "Exudative retinopathy (Coats disease) (OU)" },
            { cat: "Macular", code: "H35.041", desc: "Retinal micro-aneurysms/ RAM (retinal artery macroaneurysm) (OD)" },
            { cat: "Macular", code: "H35.042", desc: "Retinal micro-aneurysms/ RAM (retinal artery macroaneurysm) (OS)" },
            { cat: "Macular", code: "H35.043", desc: "Retinal micro-aneurysms/ RAM (retinal artery macroaneurysm) (OU)" },
            { cat: "Macular", code: "H35.051", desc: "Retinal neovascularization— CNVM (non-AMD) (OD)" },
            { cat: "Macular", code: "H35.052", desc: "Retinal neovascularization— CNVM (non-AMD) (OS)" },
            { cat: "Macular", code: "H35.053", desc: "Retinal neovascularization— CNVM (non-AMD) (OU)" },
            { cat: "Macular", code: "H35.071", desc: "Macular telangiectasia (MacTel) (OD)" },
            { cat: "Macular", code: "H35.072", desc: "Macular telangiectasia (MacTel) (OS)" },
            { cat: "Macular", code: "H35.073", desc: "Macular telangiectasia (MacTel) (OU)" },
            { cat: "Macular", code: "H35.091", desc: "Other intraretinal microvascular abnormalities (OD)" },
            { cat: "Macular", code: "H35.092", desc: "Other intraretinal microvascular abnormalities (OS)" },
            { cat: "Macular", code: "H35.093", desc: "Other intraretinal microvascular abnormalities (OU)" },
            { cat: "Macular", code: "H35.30", desc: "Unspecified macular degeneration" },
            { cat: "Macular", code: "H35.33", desc: "Macular cyst/pseudohole" },
            { cat: "Macular", code: "H35.341", desc: "Full-thickness macular hole (OD)" },
            { cat: "Macular", code: "H35.342", desc: "Full-thickness macular hole (OS)" },
            { cat: "Macular", code: "H35.343", desc: "Full-thickness macular hole (OU)" },
            { cat: "Macular", code: "H35.351", desc: "Cystoid macular edema (CME) (OD)" },
            { cat: "Macular", code: "H35.352", desc: "Cystoid macular edema (CME) (OS)" },
            { cat: "Macular", code: "H35.353", desc: "Cystoid macular edema (CME) (OU)" },
            { cat: "Macular", code: "H35.371", desc: "Epiretinal membrane (ERM) / macular pucker (OD)" },
            { cat: "Macular", code: "H35.372", desc: "Epiretinal membrane (ERM) / macular pucker (OS)" },
            { cat: "Macular", code: "H35.373", desc: "Epiretinal membrane (ERM) / macular pucker (OU)" },
            { cat: "Macular", code: "H35.381", desc: "Toxic maculopathy— Plaquenil toxicity, tamoxifen (OD)" },
            { cat: "Macular", code: "H35.382", desc: "Toxic maculopathy— Plaquenil toxicity, tamoxifen (OS)" },
            { cat: "Macular", code: "H35.383", desc: "Toxic maculopathy— Plaquenil toxicity, tamoxifen (OU)" },
            { cat: "Macular", code: "H35.711", desc: "Central serous chorioretinopathy (CSR/CSCR) (OD)" },
            { cat: "Macular", code: "H35.712", desc: "Central serous chorioretinopathy (CSR/CSCR) (OS)" },
            { cat: "Macular", code: "H35.713", desc: "Central serous chorioretinopathy (CSR/CSCR) (OU)" },
            { cat: "Macular", code: "H35.721", desc: "Serous PED (pigment epithelial detachment) (OD)" },
            { cat: "Macular", code: "H35.722", desc: "Serous PED (pigment epithelial detachment) (OS)" },
            { cat: "Macular", code: "H35.723", desc: "Serous PED (pigment epithelial detachment) (OU)" },
            { cat: "Macular", code: "H35.731", desc: "Hemorrhagic PED / RPE detachment (OD)" },
            { cat: "Macular", code: "H35.732", desc: "Hemorrhagic PED / RPE detachment (OS)" },
            { cat: "Macular", code: "H35.733", desc: "Hemorrhagic PED / RPE detachment (OU)" },
            { cat: "Macular", code: "H35.89", desc: "Other retinal disorders (bull's eye maculopathy, solar retinopathy if no specific code)" },
            { cat: "Neuro-Ophthalmology", code: "C69.61", desc: "Malignant neoplasm of orbit (OD)" },
            { cat: "Neuro-Ophthalmology", code: "C69.62", desc: "Malignant neoplasm of orbit (OS)" },
            { cat: "Neuro-Ophthalmology", code: "D31.61", desc: "Benign neoplasm of orbit (OD)" },
            { cat: "Neuro-Ophthalmology", code: "D31.62", desc: "Benign neoplasm of orbit (OS)" },
            { cat: "Neuro-Ophthalmology", code: "D32.0", desc: "Benign neoplasm of cerebral meninges (meningioma)" },
            { cat: "Neuro-Ophthalmology", code: "D35.2", desc: "Benign neoplasm of pituitary gland (pituitary adenoma)" },
            { cat: "Neuro-Ophthalmology", code: "E05.00", desc: "Graves' disease / thyrotoxicosis without thyrotoxic crisis" },
            { cat: "Neuro-Ophthalmology", code: "E05.01", desc: "Graves' disease / thyrotoxicosis with thyrotoxic crisis" },
            { cat: "Neuro-Ophthalmology", code: "F08.71", desc: "Postconcussion syndrome" },
            { cat: "Neuro-Ophthalmology", code: "F44.6", desc: "Conversion disorder with sensory symptom or deficit" },
            { cat: "Neuro-Ophthalmology", code: "G20", desc: "Parkinson's disease" },
            { cat: "Neuro-Ophthalmology", code: "G24.5", desc: "Blepharospasm" },
            { cat: "Neuro-Ophthalmology", code: "G35", desc: "Multiple sclerosis (MS)" },
            { cat: "Neuro-Ophthalmology", code: "G43.109", desc: "Migraine with aura, not intractable, without status migrainosus" },
            { cat: "Neuro-Ophthalmology", code: "G43.111", desc: "Migraine with aura, intractable, with status migrainosus" },
            { cat: "Neuro-Ophthalmology", code: "G43.119", desc: "Migraine with aura, not intractable, with status migrainosus" },
            { cat: "Neuro-Ophthalmology", code: "G43.801", desc: "Other migraine variants" },
            { cat: "Neuro-Ophthalmology", code: "G43.809", desc: "Other migraine variants" },
            { cat: "Neuro-Ophthalmology", code: "G43.811", desc: "Other migraine variants" },
            { cat: "Neuro-Ophthalmology", code: "G43.819", desc: "Other migraine variants" },
            { cat: "Neuro-Ophthalmology", code: "G43.B0", desc: "Ophthalmoplegic migraine, not intractable" },
            { cat: "Neuro-Ophthalmology", code: "G43.B1", desc: "Ophthalmoplegic migraine, intractable" },
            { cat: "Neuro-Ophthalmology", code: "G43.E01", desc: "Chronic migraine with aura, not intractable, with status migrainosus" },
            { cat: "Neuro-Ophthalmology", code: "G43.E09", desc: "Chronic migraine with aura, not intractable, without status migrainosus" },
            { cat: "Neuro-Ophthalmology", code: "G43.E11", desc: "Chronic migraine with aura, intractable, with status migrainosus" },
            { cat: "Neuro-Ophthalmology", code: "G43.E19", desc: "Chronic migraine with aura, intractable, without status migrainosus" },
            { cat: "Neuro-Ophthalmology", code: "G45.9", desc: "Transient cerebral ischemic attack (TIA), unspecified" },
            { cat: "Neuro-Ophthalmology", code: "G51.0", desc: "Bell's Palsy (facial nerve palsy)" },
            { cat: "Neuro-Ophthalmology", code: "G51.31", desc: "Clonic hemifacial spasm (OD)" },
            { cat: "Neuro-Ophthalmology", code: "G51.32", desc: "Clonic hemifacial spasm (OS)" },
            { cat: "Neuro-Ophthalmology", code: "G51.33", desc: "Clonic hemifacial spasm (OU)" },
            { cat: "Neuro-Ophthalmology", code: "G70.00", desc: "Myasthenia gravis without acute exacerbation" },
            { cat: "Neuro-Ophthalmology", code: "G70.01", desc: "Myasthenia gravis with acute exacerbation" },
            { cat: "Neuro-Ophthalmology", code: "G90.2", desc: "Horner syndrome" },
            { cat: "Neuro-Ophthalmology", code: "G93.2", desc: "IIH / pseudotumor cerebri / benign intracranial hypertension (systemic exception)" },
            { cat: "Neuro-Ophthalmology", code: "G93.5", desc: "Arnold-Chiari malformation (Type I)" },
            { cat: "Neuro-Ophthalmology", code: "H02.411", desc: "Mechanical ptosis (OD)" },
            { cat: "Neuro-Ophthalmology", code: "H02.412", desc: "Mechanical ptosis (OS)" },
            { cat: "Neuro-Ophthalmology", code: "H02.413", desc: "Mechanical ptosis (OU)" },
            { cat: "Neuro-Ophthalmology", code: "H02.421", desc: "Myogenic ptosis (OD)" },
            { cat: "Neuro-Ophthalmology", code: "H02.422", desc: "Myogenic ptosis (OS)" },
            { cat: "Neuro-Ophthalmology", code: "H02.423", desc: "Myogenic ptosis (OU)" },
            { cat: "Neuro-Ophthalmology", code: "H02.431", desc: "Paralytic ptosis (OD)" },
            { cat: "Neuro-Ophthalmology", code: "H02.432", desc: "Paralytic ptosis (OS)" },
            { cat: "Neuro-Ophthalmology", code: "H02.433", desc: "Paralytic ptosis (OU)" },
            { cat: "Neuro-Ophthalmology", code: "H05.111", desc: "Granuloma of orbit / orbital pseudotumor (OD)" },
            { cat: "Neuro-Ophthalmology", code: "H05.112", desc: "Granuloma of orbit / orbital pseudotumor (OS)" },
            { cat: "Neuro-Ophthalmology", code: "H05.113", desc: "Granuloma of orbit / orbital pseudotumor (OU)" },
            { cat: "Neuro-Ophthalmology", code: "H46.01", desc: "Optic papillitis (OD)" },
            { cat: "Neuro-Ophthalmology", code: "H46.02", desc: "Optic papillitis (OS)" },
            { cat: "Neuro-Ophthalmology", code: "H46.03", desc: "Optic papillitis (OU)" },
            { cat: "Neuro-Ophthalmology", code: "H46.11", desc: "Retrobulbar neuritis (OD)" },
            { cat: "Neuro-Ophthalmology", code: "H46.12", desc: "Retrobulbar neuritis (OS)" },
            { cat: "Neuro-Ophthalmology", code: "H46.13", desc: "Retrobulbar neuritis (OU)" },
            { cat: "Neuro-Ophthalmology", code: "H46.2", desc: "Nutritional optic neuropathy" },
            { cat: "Neuro-Ophthalmology", code: "H46.3", desc: "Toxic optic neuropathy" },
            { cat: "Neuro-Ophthalmology", code: "H46.8", desc: "Other optic neuritis" },
            { cat: "Neuro-Ophthalmology", code: "H46.9", desc: "Unspecified optic neuritis" },
            { cat: "Neuro-Ophthalmology", code: "H47.011", desc: "Ischemic optic neuropathy / NAION (OD)" },
            { cat: "Neuro-Ophthalmology", code: "H47.012", desc: "Ischemic optic neuropathy / NAION (OS)" },
            { cat: "Neuro-Ophthalmology", code: "H47.013", desc: "Ischemic optic neuropathy / NAION (OU)" },
            { cat: "Neuro-Ophthalmology", code: "H47.091", desc: "Other optic nerve disorder / arteritic AION— code GCA (M31.6) too (OD)" },
            { cat: "Neuro-Ophthalmology", code: "H47.092", desc: "Other optic nerve disorder / arteritic AION— code GCA (M31.6) too (OS)" },
            { cat: "Neuro-Ophthalmology", code: "H47.093", desc: "Other optic nerve disorder / arteritic AION— code GCA (M31.6) too (OU)" },
            { cat: "Neuro-Ophthalmology", code: "H47.10", desc: "Unspecified papilledema" },
            { cat: "Neuro-Ophthalmology", code: "H47.11", desc: "Papilledema associated with increased intracranial pressure" },
            { cat: "Neuro-Ophthalmology", code: "H47.20", desc: "Unspecified optic atrophy" },
            { cat: "Neuro-Ophthalmology", code: "H47.211", desc: "Primary optic atrophy (OD)" },
            { cat: "Neuro-Ophthalmology", code: "H47.212", desc: "Primary optic atrophy (OS)" },
            { cat: "Neuro-Ophthalmology", code: "H47.213", desc: "Primary optic atrophy (OU)" },
            { cat: "Neuro-Ophthalmology", code: "H47.22", desc: "Hereditary optic atrophy" },
            { cat: "Neuro-Ophthalmology", code: "H47.231", desc: "Glaucomatous optic atrophy (OD)" },
            { cat: "Neuro-Ophthalmology", code: "H47.232", desc: "Glaucomatous optic atrophy (OS)" },
            { cat: "Neuro-Ophthalmology", code: "H47.233", desc: "Glaucomatous optic atrophy (OU)" },
            { cat: "Neuro-Ophthalmology", code: "H47.291", desc: "Other optic atrophy (OD)" },
            { cat: "Neuro-Ophthalmology", code: "H47.292", desc: "Other optic atrophy (OS)" },
            { cat: "Neuro-Ophthalmology", code: "H47.293", desc: "Other optic atrophy (OU)" },
            { cat: "Neuro-Ophthalmology", code: "H47.311", desc: "Coloboma of optic disc (OD)" },
            { cat: "Neuro-Ophthalmology", code: "H47.312", desc: "Coloboma of optic disc (OS)" },
            { cat: "Neuro-Ophthalmology", code: "H47.313", desc: "Coloboma of optic disc (OU)" },
            { cat: "Neuro-Ophthalmology", code: "H47.321", desc: "Optic disc drusen (OD)" },
            { cat: "Neuro-Ophthalmology", code: "H47.322", desc: "Optic disc drusen (OS)" },
            { cat: "Neuro-Ophthalmology", code: "H47.323", desc: "Optic disc drusen (OU)" },
            { cat: "Neuro-Ophthalmology", code: "H47.331", desc: "Pseudopapilledema of optic disc (OD)" },
            { cat: "Neuro-Ophthalmology", code: "H47.332", desc: "Pseudopapilledema of optic disc (OS)" },
            { cat: "Neuro-Ophthalmology", code: "H47.333", desc: "Pseudopapilledema of optic disc (OU)" },
            { cat: "Neuro-Ophthalmology", code: "H47.41", desc: "Disorders of optic chiasm with inflammatory disorders" },
            { cat: "Neuro-Ophthalmology", code: "H47.42", desc: "Disorders of optic chiasm with neoplasms" },
            { cat: "Neuro-Ophthalmology", code: "H47.43", desc: "Disorders of optic chiasm with vascular disorders" },
            { cat: "Neuro-Ophthalmology", code: "H47.49", desc: "Disorders of optic chiasm, other" },
            { cat: "Neuro-Ophthalmology", code: "H47.611", desc: "Cortical blindness (OD)" },
            { cat: "Neuro-Ophthalmology", code: "H47.612", desc: "Cortical blindness (OS)" },
            { cat: "Neuro-Ophthalmology", code: "H49.01", desc: "CN III palsy / oculomotor (OD)" },
            { cat: "Neuro-Ophthalmology", code: "H49.02", desc: "CN III palsy / oculomotor (OS)" },
            { cat: "Neuro-Ophthalmology", code: "H49.03", desc: "CN III palsy / oculomotor (OU)" },
            { cat: "Neuro-Ophthalmology", code: "H49.11", desc: "CN IV palsy / trochlear (OD)" },
            { cat: "Neuro-Ophthalmology", code: "H49.12", desc: "CN IV palsy / trochlear (OS)" },
            { cat: "Neuro-Ophthalmology", code: "H49.13", desc: "CN IV palsy / trochlear (OU)" },
            { cat: "Neuro-Ophthalmology", code: "H49.21", desc: "CN VI palsy / abducens (OD)" },
            { cat: "Neuro-Ophthalmology", code: "H49.22", desc: "CN VI palsy / abducens (OS)" },
            { cat: "Neuro-Ophthalmology", code: "H49.23", desc: "CN VI palsy / abducens (OU)" },
            { cat: "Neuro-Ophthalmology", code: "H49.41", desc: "Progressive external ophthalmoplegia (OD)" },
            { cat: "Neuro-Ophthalmology", code: "H49.42", desc: "Progressive external ophthalmoplegia (OS)" },
            { cat: "Neuro-Ophthalmology", code: "H49.43", desc: "Progressive external ophthalmoplegia (OU)" },
            { cat: "Neuro-Ophthalmology", code: "H51.11", desc: "Convergence insufficiency" },
            { cat: "Neuro-Ophthalmology", code: "H51.21", desc: "Internuclear ophthalmoplegia / INO (OD)" },
            { cat: "Neuro-Ophthalmology", code: "H51.22", desc: "Internuclear ophthalmoplegia / INO (OS)" },
            { cat: "Neuro-Ophthalmology", code: "H51.23", desc: "Internuclear ophthalmoplegia / INO (OU)" },
            { cat: "Neuro-Ophthalmology", code: "H51.8", desc: "Other specified disorders of binocular movement (skew deviation)" },
            { cat: "Neuro-Ophthalmology", code: "H55.01", desc: "Congenital nystagmus" },
            { cat: "Neuro-Ophthalmology", code: "H55.02", desc: "Latent nystagmus" },
            { cat: "Neuro-Ophthalmology", code: "H55.04", desc: "Dissociated nystagmus" },
            { cat: "Neuro-Ophthalmology", code: "H55.09", desc: "Other forms of nystagmus" },
            { cat: "Neuro-Ophthalmology", code: "H55.81", desc: "Deficiency of saccades" },
            { cat: "Neuro-Ophthalmology", code: "H55.89", desc: "Other irregular eye movements" },
            { cat: "Neuro-Ophthalmology", code: "H57.02", desc: "Anisocoria" },
            { cat: "Neuro-Ophthalmology", code: "H57.04", desc: "Mydriasis" },
            { cat: "Neuro-Ophthalmology", code: "H57.051", desc: "Tonic pupil / Adie pupil (OD)" },
            { cat: "Neuro-Ophthalmology", code: "H57.052", desc: "Tonic pupil / Adie pupil (OS)" },
            { cat: "Neuro-Ophthalmology", code: "H57.053", desc: "Tonic pupil / Adie pupil (OU)" },
            { cat: "Neuro-Ophthalmology", code: "H81.11", desc: "Benign paroxysmal positional vertigo (BPPV) (OD)" },
            { cat: "Neuro-Ophthalmology", code: "H81.12", desc: "Benign paroxysmal positional vertigo (BPPV) (OS)" },
            { cat: "Neuro-Ophthalmology", code: "H81.13", desc: "Benign paroxysmal positional vertigo (BPPV) (OU)" },
            { cat: "Neuro-Ophthalmology", code: "H81.391", desc: "Other peripheral vertigo (OD)" },
            { cat: "Neuro-Ophthalmology", code: "H81.392", desc: "Other peripheral vertigo (OS)" },
            { cat: "Neuro-Ophthalmology", code: "H81.393", desc: "Other peripheral vertigo (OU)" },
            { cat: "Neuro-Ophthalmology", code: "I63.9", desc: "Cerebral infarction / stroke, unspecified" },
            { cat: "Neuro-Ophthalmology", code: "I67.6", desc: "Nonpyogenic thrombosis of intracranial venous system" },
            { cat: "Neuro-Ophthalmology", code: "Q10.0", desc: "Congenital ptosis" },
            { cat: "Neuro-Ophthalmology", code: "R42", desc: "Dizziness / vertigo NOS" },
            { cat: "Neuro-Ophthalmology", code: "R48.3", desc: "Visual hallucination agnosia" },
            { cat: "Neuro-Ophthalmology", code: "R70.0", desc: "Elevated erythrocyte sedimentation rate (ESR)" },
            { cat: "Other", code: "H35.61", desc: "OD) / H35.62 (OS) / H35.63 (OU) — retinal hemorrhage with laterality" },
            { cat: "Other", code: "H35.62", desc: "OS) / H35.63 (OU) — retinal hemorrhage with laterality" },
            { cat: "Other", code: "H35.63", desc: "OU) — retinal hemorrhage with laterality" },
            { cat: "Other", code: "H35.81", desc: "Retinal edema (cotton-wool spots — specific code)" },
            { cat: "Other", code: "H43.20", desc: "Asteroid hyalosis" },
            { cat: "Other", code: "H44.601", desc: "Retained intraocular foreign body, magnetic (OD)" },
            { cat: "Other", code: "H44.602", desc: "Retained intraocular foreign body, magnetic (OS)" },
            { cat: "Other", code: "H57.89", desc: "Other specified disorders of eye and adnexa" },
            { cat: "Other Retinal", code: "H35.031", desc: "Hypertensive retinopathy (OD)" },
            { cat: "Other Retinal", code: "H35.032", desc: "Hypertensive retinopathy (OS)" },
            { cat: "Other Retinal", code: "H35.033", desc: "Hypertensive retinopathy (OU)" },
            { cat: "Other Retinal", code: "H35.061", desc: "Retinal vasculitis (OD)" },
            { cat: "Other Retinal", code: "H35.062", desc: "Retinal vasculitis (OS)" },
            { cat: "Other Retinal", code: "H35.063", desc: "Retinal vasculitis (OU)" },
            { cat: "Other Retinal", code: "H35.21", desc: "Other non-diabetic proliferative retinopathy (OD)" },
            { cat: "Other Retinal", code: "H35.22", desc: "Other non-diabetic proliferative retinopathy (OS)" },
            { cat: "Other Retinal", code: "H35.23", desc: "Other non-diabetic proliferative retinopathy (OU)" },
            { cat: "Other Retinal", code: "H35.82", desc: "Retinal ischemia (NEW — FY2026, effective October 2025)" },
            { cat: "Peripheral Retinal", code: "H35.411", desc: "Lattice degeneration (OD)" },
            { cat: "Peripheral Retinal", code: "H35.412", desc: "Lattice degeneration (OS)" },
            { cat: "Peripheral Retinal", code: "H35.413", desc: "Lattice degeneration (OU)" },
            { cat: "Peripheral Retinal", code: "H35.421", desc: "Microcystoid degeneration (OD)" },
            { cat: "Peripheral Retinal", code: "H35.422", desc: "Microcystoid degeneration (OS)" },
            { cat: "Peripheral Retinal", code: "H35.423", desc: "Microcystoid degeneration (OU)" },
            { cat: "Peripheral Retinal", code: "H35.431", desc: "Pavingstone degeneration (OD)" },
            { cat: "Peripheral Retinal", code: "H35.432", desc: "Pavingstone degeneration (OS)" },
            { cat: "Peripheral Retinal", code: "H35.433", desc: "Pavingstone degeneration (OU)" },
            { cat: "Peripheral Retinal", code: "H35.441", desc: "Age-related reticular degeneration (OD)" },
            { cat: "Peripheral Retinal", code: "H35.442", desc: "Age-related reticular degeneration (OS)" },
            { cat: "Peripheral Retinal", code: "H35.443", desc: "Age-related reticular degeneration (OU)" },
            { cat: "Peripheral Retinal", code: "H35.461", desc: "Secondary vitreoretinal degeneration (OD)" },
            { cat: "Peripheral Retinal", code: "H35.462", desc: "Secondary vitreoretinal degeneration (OS)" },
            { cat: "Peripheral Retinal", code: "H35.463", desc: "Secondary vitreoretinal degeneration (OU)" },
            { cat: "RD & Breaks", code: "H33.011", desc: "RRD with single break (OD)" },
            { cat: "RD & Breaks", code: "H33.012", desc: "RRD with single break (OS)" },
            { cat: "RD & Breaks", code: "H33.013", desc: "RRD with single break (OU)" },
            { cat: "RD & Breaks", code: "H33.021", desc: "RRD with multiple breaks (OD)" },
            { cat: "RD & Breaks", code: "H33.022", desc: "RRD with multiple breaks (OS)" },
            { cat: "RD & Breaks", code: "H33.023", desc: "RRD with multiple breaks (OU)" },
            { cat: "RD & Breaks", code: "H33.031", desc: "RRD with giant retinal tear (OD)" },
            { cat: "RD & Breaks", code: "H33.032", desc: "RRD with giant retinal tear (OS)" },
            { cat: "RD & Breaks", code: "H33.033", desc: "RRD with giant retinal tear (OU)" },
            { cat: "RD & Breaks", code: "H33.041", desc: "RRD with retinal dialysis (OD)" },
            { cat: "RD & Breaks", code: "H33.042", desc: "RRD with retinal dialysis (OS)" },
            { cat: "RD & Breaks", code: "H33.043", desc: "RRD with retinal dialysis (OU)" },
            { cat: "RD & Breaks", code: "H33.051", desc: "Total retinal detachment (OD)" },
            { cat: "RD & Breaks", code: "H33.052", desc: "Total retinal detachment (OS)" },
            { cat: "RD & Breaks", code: "H33.053", desc: "Total retinal detachment (OU)" },
            { cat: "RD & Breaks", code: "H33.101", desc: "Unspecified retinoschisis (OD)" },
            { cat: "RD & Breaks", code: "H33.102", desc: "Unspecified retinoschisis (OS)" },
            { cat: "RD & Breaks", code: "H33.103", desc: "Unspecified retinoschisis (OU)" },
            { cat: "RD & Breaks", code: "H33.191", desc: "Other retinoschisis and retinal cysts (OD)" },
            { cat: "RD & Breaks", code: "H33.192", desc: "Other retinoschisis and retinal cysts (OS)" },
            { cat: "RD & Breaks", code: "H33.193", desc: "Other retinoschisis and retinal cysts (OU)" },
            { cat: "RD & Breaks", code: "H33.23", desc: "OD/OS/OU" },
            { cat: "RD & Breaks", code: "H33.301", desc: "Unspecified retinal break (OD)" },
            { cat: "RD & Breaks", code: "H33.302", desc: "Unspecified retinal break (OS)" },
            { cat: "RD & Breaks", code: "H33.303", desc: "Unspecified retinal break (OU)" },
            { cat: "RD & Breaks", code: "H33.31", desc: "retinal breaks (OD)" },
            { cat: "RD & Breaks", code: "H33.311", desc: "Horseshoe tear (OD)" },
            { cat: "RD & Breaks", code: "H33.312", desc: "Horseshoe tear (OS)" },
            { cat: "RD & Breaks", code: "H33.313", desc: "Horseshoe tear (OU)" },
            { cat: "RD & Breaks", code: "H33.32", desc: "retinal breaks (OS)" },
            { cat: "RD & Breaks", code: "H33.321", desc: "Round hole (OD)" },
            { cat: "RD & Breaks", code: "H33.322", desc: "Round hole (OS)" },
            { cat: "RD & Breaks", code: "H33.323", desc: "Round hole (OU)" },
            { cat: "RD & Breaks", code: "H33.33", desc: "retinal breaks (OU)" },
            { cat: "RD & Breaks", code: "H33.331", desc: "Multiple defects (OD)" },
            { cat: "RD & Breaks", code: "H33.332", desc: "Multiple defects (OS)" },
            { cat: "RD & Breaks", code: "H33.333", desc: "Multiple defects (OU)" },
            { cat: "RD & Breaks", code: "H33.43", desc: "OD/OS/OU" },
            { cat: "RD & Breaks", code: "H33.8", desc: "Other retinal detachments" },
            { cat: "ROP", code: "H35.111", desc: "ROP stage 0 (OD)" },
            { cat: "ROP", code: "H35.112", desc: "ROP stage 0 (OS)" },
            { cat: "ROP", code: "H35.113", desc: "ROP stage 0 (OU)" },
            { cat: "ROP", code: "H35.121", desc: "ROP stage 1 (OD)" },
            { cat: "ROP", code: "H35.122", desc: "ROP stage 1 (OS)" },
            { cat: "ROP", code: "H35.123", desc: "ROP stage 1 (OU)" },
            { cat: "ROP", code: "H35.131", desc: "ROP stage 2 (OD)" },
            { cat: "ROP", code: "H35.132", desc: "ROP stage 2 (OS)" },
            { cat: "ROP", code: "H35.133", desc: "ROP stage 2 (OU)" },
            { cat: "ROP", code: "H35.141", desc: "ROP stage 3 (OD)" },
            { cat: "ROP", code: "H35.142", desc: "ROP stage 3 (OS)" },
            { cat: "ROP", code: "H35.143", desc: "ROP stage 3 (OU)" },
            { cat: "ROP", code: "H35.151", desc: "ROP stage 4 (OD)" },
            { cat: "ROP", code: "H35.152", desc: "ROP stage 4 (OS)" },
            { cat: "ROP", code: "H35.153", desc: "ROP stage 4 (OU)" },
            { cat: "ROP", code: "H35.161", desc: "ROP stage 5 (OD)" },
            { cat: "ROP", code: "H35.162", desc: "ROP stage 5 (OS)" },
            { cat: "ROP", code: "H35.163", desc: "ROP stage 5 (OU)" },
            { cat: "RVO", code: "H34.8110", desc: "CRVO with macular edema (OD)" },
            { cat: "RVO", code: "H34.8111", desc: "CRVO with retinal neovascularization (OD)" },
            { cat: "RVO", code: "H34.8112", desc: "CRVO stable (OD)" },
            { cat: "RVO", code: "H34.8120", desc: "CRVO with macular edema (OS)" },
            { cat: "RVO", code: "H34.8121", desc: "CRVO with retinal neovascularization (OS)" },
            { cat: "RVO", code: "H34.8122", desc: "CRVO stable (OS)" },
            { cat: "RVO", code: "H34.8130", desc: "CRVO with macular edema (OU)" },
            { cat: "RVO", code: "H34.8131", desc: "CRVO with retinal neovascularization (OU)" },
            { cat: "RVO", code: "H34.8132", desc: "CRVO stable (OU)" },
            { cat: "RVO", code: "H34.8310", desc: "BRVO with macular edema (OD)" },
            { cat: "RVO", code: "H34.8311", desc: "BRVO with retinal neovascularization (OD)" },
            { cat: "RVO", code: "H34.8312", desc: "BRVO stable (OD)" },
            { cat: "RVO", code: "H34.8320", desc: "BRVO with macular edema (OS)" },
            { cat: "RVO", code: "H34.8321", desc: "BRVO with retinal neovascularization (OS)" },
            { cat: "RVO", code: "H34.8322", desc: "BRVO stable (OS)" },
            { cat: "RVO", code: "H34.8330", desc: "BRVO with macular edema (OU)" },
            { cat: "RVO", code: "H34.8331", desc: "BRVO with retinal neovascularization (OU)" },
            { cat: "RVO", code: "H34.8332", desc: "BRVO stable (OU)" },
            { cat: "Strabismus", code: "H50.011", desc: "Esotropia (OD)" },
            { cat: "Strabismus", code: "H50.012", desc: "Esotropia (OS)" },
            { cat: "Strabismus", code: "H50.111", desc: "Exotropia (OD)" },
            { cat: "Strabismus", code: "H50.112", desc: "Exotropia (OS)" },
            { cat: "Strabismus", code: "H50.21", desc: "Vertical strabismus / hypertropia / hypotropia (OD)" },
            { cat: "Strabismus", code: "H50.22", desc: "Vertical strabismus / hypertropia / hypotropia (OS)" },
            { cat: "Strabismus", code: "Z87.721", desc: "History of strabismus surgery" },
            { cat: "Symptoms", code: "H53.001", desc: "Amblyopia unspecified (OD)" },
            { cat: "Symptoms", code: "H53.002", desc: "Amblyopia unspecified (OS)" },
            { cat: "Symptoms", code: "H53.003", desc: "Amblyopia unspecified (OU)" },
            { cat: "Symptoms", code: "H53.021", desc: "Amblyopia refractive (OD)" },
            { cat: "Symptoms", code: "H53.022", desc: "Amblyopia refractive (OS)" },
            { cat: "Symptoms", code: "H53.023", desc: "Amblyopia refractive (OU)" },
            { cat: "Symptoms", code: "H53.031", desc: "Amblyopia strabismic (OD)" },
            { cat: "Symptoms", code: "H53.032", desc: "Amblyopia strabismic (OS)" },
            { cat: "Symptoms", code: "H53.033", desc: "Amblyopia strabismic (OU)" },
            { cat: "Symptoms", code: "H53.10", desc: "Scotoma, unspecified" },
            { cat: "Symptoms", code: "H53.121", desc: "Transient visual loss (scintillating scotoma) (OD)" },
            { cat: "Symptoms", code: "H53.122", desc: "Transient visual loss (scintillating scotoma) (OS)" },
            { cat: "Symptoms", code: "H53.123", desc: "Transient visual loss (scintillating scotoma) (OU)" },
            { cat: "Symptoms", code: "H53.131", desc: "Sudden visual loss (OD)" },
            { cat: "Symptoms", code: "H53.132", desc: "Sudden visual loss (OS)" },
            { cat: "Symptoms", code: "H53.133", desc: "Sudden visual loss (OU)" },
            { cat: "Symptoms", code: "H53.19", desc: "Other subjective visual disturbances (photopsias, visual halos)" },
            { cat: "Symptoms", code: "H53.2", desc: "Diplopia (double vision)" },
            { cat: "Symptoms", code: "H53.40", desc: "Unspecified visual field defects" },
            { cat: "Symptoms", code: "H53.421", desc: "Scotoma of blind spot (OD)" },
            { cat: "Symptoms", code: "H53.422", desc: "Scotoma of blind spot (OS)" },
            { cat: "Symptoms", code: "H53.423", desc: "Scotoma of blind spot (OU)" },
            { cat: "Symptoms", code: "H53.461", desc: "Homonymous bilateral field defects (OD)" },
            { cat: "Symptoms", code: "H53.462", desc: "Homonymous bilateral field defects (OS)" },
            { cat: "Symptoms", code: "H53.47", desc: "Heteronymous bilateral field defects" },
            { cat: "Symptoms", code: "H53.52", desc: "Acquired color vision deficiency" },
            { cat: "Symptoms", code: "H53.8", desc: "Other specified visual disturbances (blurred vision)" },
            { cat: "Symptoms", code: "H57.11", desc: "Ocular pain (OD)" },
            { cat: "Symptoms", code: "H57.12", desc: "Ocular pain (OS)" },
            { cat: "Symptoms", code: "H57.13", desc: "Ocular pain (OU)" },
            { cat: "Symptoms", code: "R51.0", desc: "Headache with orthostatic component" },
            { cat: "Symptoms", code: "R51.9", desc: "Headache, unspecified" },
            { cat: "Trauma", code: "H44.521", desc: "Atrophy of globe / phthisis bulbi (OD)" },
            { cat: "Trauma", code: "H44.522", desc: "Atrophy of globe / phthisis bulbi (OS)" },
            { cat: "Trauma", code: "H44.523", desc: "Atrophy of globe / phthisis bulbi (OU)" },
            { cat: "Trauma", code: "S00.1", desc: "Contusion of eyelid" },
            { cat: "Trauma", code: "S05.02xA", desc: "Corneal injury (OS)" },
            { cat: "Trauma", code: "S05.11xA", desc: "Open globe without IOFB (OD)" },
            { cat: "Trauma", code: "S05.12xA", desc: "Open globe without IOFB (OS)" },
            { cat: "Trauma", code: "S05.21xA", desc: "Open globe with IOFB, initial encounter (OD)" },
            { cat: "Trauma", code: "S05.22xA", desc: "Open globe with IOFB, initial encounter (OS)" },
            { cat: "Trauma", code: "S05.81", desc: "Other injuries of eye/orbit (OD)" },
            { cat: "Trauma", code: "S05.82", desc: "Other injuries of eye/orbit (OS)" },
            { cat: "Trauma", code: "S05.83", desc: "Other injuries of eye/orbit (OU)" },
            { cat: "Trauma", code: "Z97.0", desc: "Ocular prosthesis" },
            { cat: "Tumors", code: "C69.21", desc: "Retinoblastoma (OD)" },
            { cat: "Tumors", code: "C69.22", desc: "Retinoblastoma (OS)" },
            { cat: "Tumors", code: "C69.31", desc: "Choroidal melanoma (OD)" },
            { cat: "Tumors", code: "C69.32", desc: "Choroidal melanoma (OS)" },
            { cat: "Tumors", code: "C69.81", desc: "Ocular lymphoma / vitreoretinal lymphoma (OD)" },
            { cat: "Tumors", code: "C69.82", desc: "Ocular lymphoma / vitreoretinal lymphoma (OS)" },
            { cat: "Tumors", code: "C69.83", desc: "Ocular lymphoma / vitreoretinal lymphoma (OU)" },
            { cat: "Tumors", code: "C79.81", desc: "Choroidal metastasis (code primary malignancy too)" },
            { cat: "Tumors", code: "C83.31", desc: "DLBCL (code subtype if known alongside C69) (OD)" },
            { cat: "Tumors", code: "C83.32", desc: "DLBCL (code subtype if known alongside C69) (OS)" },
            { cat: "Tumors", code: "C83.33", desc: "DLBCL (code subtype if known alongside C69) (OU)" },
            { cat: "Tumors", code: "C85.91", desc: "NHL unspecified (if no subtype given) (OD)" },
            { cat: "Tumors", code: "C85.92", desc: "NHL unspecified (if no subtype given) (OS)" },
            { cat: "Tumors", code: "C85.93", desc: "NHL unspecified (if no subtype given) (OU)" },
            { cat: "Tumors", code: "D18.09", desc: "Choroidal hemangioma" },
            { cat: "Tumors", code: "D31.30", desc: "Benign neoplasm of choroid unspecified" },
            { cat: "Tumors", code: "D31.31", desc: "Choroidal nevus— benign neoplasm of choroid (OD)" },
            { cat: "Tumors", code: "D31.32", desc: "Choroidal nevus— benign neoplasm of choroid (OS)" },
            { cat: "Tumors", code: "D31.40", desc: "CHRPE (congenital hypertrophy of RPE)" },
            { cat: "Tumors", code: "D31.63", desc: "Astrocytic hamartoma / astrocytoma (OU)" },
            { cat: "Uveitis", code: "H20.011", desc: "Primary acute anterior uveitis (OD)" },
            { cat: "Uveitis", code: "H20.012", desc: "Primary acute anterior uveitis (OS)" },
            { cat: "Uveitis", code: "H20.013", desc: "Primary acute anterior uveitis (OU)" },
            { cat: "Uveitis", code: "H20.021", desc: "Recurrent acute anterior uveitis (OD)" },
            { cat: "Uveitis", code: "H20.022", desc: "Recurrent acute anterior uveitis (OS)" },
            { cat: "Uveitis", code: "H20.023", desc: "Recurrent acute anterior uveitis (OU)" },
            { cat: "Uveitis", code: "H20.031", desc: "Secondary infectious iridocyclitis (OD)" },
            { cat: "Uveitis", code: "H20.032", desc: "Secondary infectious iridocyclitis (OS)" },
            { cat: "Uveitis", code: "H20.033", desc: "Secondary infectious iridocyclitis (OU)" },
            { cat: "Uveitis", code: "H20.041", desc: "Secondary noninfectious iridocyclitis (OD)" },
            { cat: "Uveitis", code: "H20.042", desc: "Secondary noninfectious iridocyclitis (OS)" },
            { cat: "Uveitis", code: "H20.043", desc: "Secondary noninfectious iridocyclitis (OU)" },
            { cat: "Uveitis", code: "H20.11", desc: "Chronic iridocyclitis (OD)" },
            { cat: "Uveitis", code: "H20.12", desc: "Chronic iridocyclitis (OS)" },
            { cat: "Uveitis", code: "H20.13", desc: "Chronic iridocyclitis (OU)" },
            { cat: "Uveitis", code: "H20.21", desc: "Lens-induced iridocyclitis (OD)" },
            { cat: "Uveitis", code: "H20.22", desc: "Lens-induced iridocyclitis (OS)" },
            { cat: "Uveitis", code: "H20.23", desc: "Lens-induced iridocyclitis (OU)" },
            { cat: "Uveitis", code: "H30.001", desc: "H30.003 — Focal chorioretinal inflammation" },
            { cat: "Uveitis", code: "H30.011", desc: "H30.013 — Focal juxtapapillary" },
            { cat: "Uveitis", code: "H30.101", desc: "H30.103 — Disseminated chorioretinitis" },
            { cat: "Uveitis", code: "H30.811", desc: "Harada disease / VKH (OD)" },
            { cat: "Uveitis", code: "H30.812", desc: "Harada disease / VKH (OS)" },
            { cat: "Uveitis", code: "H30.813", desc: "Harada disease / VKH (OU)" },
            { cat: "Vascular/Systemic", code: "D57.1", desc: "Sickle cell with crisis (for sickle cell retinopathy)" },
            { cat: "Vascular/Systemic", code: "L93.0", desc: "Lupus erythematosus (discoid/cutaneous — distinct from SLE M32.9)" },
            { cat: "Vascular/Systemic", code: "M06.9", desc: "Rheumatoid arthritis unspecified" },
            { cat: "Vascular/Systemic", code: "Q87.40", desc: "Marfan syndrome with ocular manifestations" },
            { cat: "Vitreous", code: "H43.01", desc: "Vitreous prolapse (OD)" },
            { cat: "Vitreous", code: "H43.02", desc: "Vitreous prolapse (OS)" },
            { cat: "Vitreous", code: "H43.03", desc: "Vitreous prolapse (OU)" },
            { cat: "Vitreous", code: "H43.10", desc: "VMA (vitreomacular adhesion)" },
            { cat: "Vitreous", code: "H43.21", desc: "Crystalline deposits in vitreous body (OD)" },
            { cat: "Vitreous", code: "H43.22", desc: "Crystalline deposits in vitreous body (OS)" },
            { cat: "Vitreous", code: "H43.23", desc: "Crystalline deposits in vitreous body (OU)" },
            { cat: "Vitreous", code: "H43.391", desc: "Other vitreous opacities / floaters (OD)" },
            { cat: "Vitreous", code: "H43.392", desc: "Other vitreous opacities / floaters (OS)" },
            { cat: "Vitreous", code: "H43.393", desc: "Other vitreous opacities / floaters (OU)" },
            { cat: "Vitreous", code: "H43.811", desc: "Posterior vitreous detachment (PVD) (OD)" },
            { cat: "Vitreous", code: "H43.812", desc: "Posterior vitreous detachment (PVD) (OS)" },
            { cat: "Vitreous", code: "H43.813", desc: "Posterior vitreous detachment (PVD) (OU)" },
            { cat: "Vitreous", code: "H43.821", desc: "Vitreomacular traction (VMT) (OD)" },
            { cat: "Vitreous", code: "H43.822", desc: "Vitreomacular traction (VMT) (OS)" },
            { cat: "Vitreous", code: "H43.823", desc: "Vitreomacular traction (VMT) (OU)" },
            { cat: "Vitreous", code: "H43.89", desc: "Other disorders of vitreous body" },
            { cat: "Vitreous", code: "H43.891", desc: "Other vitreous degeneration— includes white without pressure (OD)" },
            { cat: "Vitreous", code: "H43.892", desc: "Other vitreous degeneration— includes white without pressure (OS)" },
            { cat: "Vitreous", code: "H43.893", desc: "Other vitreous degeneration— includes white without pressure (OU)" },
            { cat: "Z-Codes & Status", code: "H54.01", desc: "Low vision / blindness classification (OD)" },
            { cat: "Z-Codes & Status", code: "H54.02", desc: "Low vision / blindness classification (OS)" },
            { cat: "Z-Codes & Status", code: "H54.03", desc: "Low vision / blindness classification (OU)" },
            { cat: "Z-Codes & Status", code: "Z14.8", desc: "Genetic carrier status (HLA-B27)" },
            { cat: "Z-Codes & Status", code: "Z79.4", desc: "Long-term (current) use of insulin (T2DM only)" },
            { cat: "Z-Codes & Status", code: "Z79.84", desc: "Long-term (current) use of oral hypoglycemic drugs (metformin, glipizide)" },
            { cat: "Z-Codes & Status", code: "Z79.85", desc: "Long-term (current) use of injectable non-insulin antidiabetic drugs (Ozempic, Trulicity)" },
            { cat: "Z-Codes & Status", code: "Z79.899", desc: "Other long-term drug therapy (Plaquenil, tamoxifen, etc.)" }
          ];

          // Smart search: expand clinical shorthand before matching
          const expandQuery = (raw) => {
            let q = raw.toLowerCase().trim();

            // Laterality synonyms
            q = q.replace(/\bright\s*eye\b/g, "(od)").replace(/\bleft\s*eye\b/g, "(os)").replace(/\bboth\s*eyes\b/g, "(ou)").replace(/\bbilateral\b/g, "(ou)");
            q = q.replace(/\bright\b/g, "(od)").replace(/\bleft\b/g, "(os)");

            // Common abbreviations → DB terms
            q = q.replace(/\bw\/o\b/g, "without").replace(/\bw\/\b/g, "with").replace(/\bw\s/g, "with ");

            // AMD variants — "wet amd" → search for exudative/active CNV category
            q = q.replace(/\bwet\s*amd\b/g, "amd cnv");
            q = q.replace(/\bdry\s*amd\b/g, "amd dry");
            q = q.replace(/\bwet\s*macular\s*degeneration\b/g, "amd cnv");
            q = q.replace(/\bdry\s*macular\s*degeneration\b/g, "amd dry");
            q = q.replace(/\bmacular\s*degeneration\b/g, "amd");
            q = q.replace(/\bneovascular\s*amd\b/g, "amd cnv");
            q = q.replace(/\bexudative\s*amd\b/g, "amd cnv");
            q = q.replace(/\bnon-?exudative\s*amd\b/g, "amd dry");
            q = q.replace(/\batrophic\s*amd\b/g, "amd atrophic");
            q = q.replace(/\bwet\b/g, "cnv");

            // Diabetic
            q = q.replace(/\bdiabetic\s*macular\s*edema\b/g, "dme");
            q = q.replace(/\bdiabetic\s*retinopathy\b/g, "diabetic");
            q = q.replace(/\bnon-?proliferative\s*diabetic\b/g, "npdr");
            q = q.replace(/\bproliferative\s*diabetic\b/g, "pdr");
            q = q.replace(/\bdiabetes\b/g, "diabetic");
            q = q.replace(/\bnpdr\b/g, "npdr");
            q = q.replace(/\bpdr\b/g, "pdr");
            q = q.replace(/\bdme\b/g, "dme");

            // Glaucoma
            q = q.replace(/\bpoag\b/g, "primary open-angle");
            q = q.replace(/\bntg\b/g, "low-tension");
            q = q.replace(/\bnvg\b/g, "neovascular glaucoma");
            q = q.replace(/\bpxf\b/g, "pseudoexfoliation");
            q = q.replace(/\bopen\s*angle\s*glaucoma\b/g, "primary open-angle");
            q = q.replace(/\bangle\s*closure\b/g, "angle-closure");
            q = q.replace(/\bnarrow\s*angle\b/g, "angle-closure");
            q = q.replace(/\bocular\s*hypertension\b/g, "ocular hypertension");
            q = q.replace(/\boht\b/g, "ocular hypertension");

            // Vein/artery occlusions
            q = q.replace(/\bbranch\s*retinal\s*vein\s*occlusion\b/g, "brvo");
            q = q.replace(/\bcentral\s*retinal\s*vein\s*occlusion\b/g, "crvo");
            q = q.replace(/\bhemi\s*retinal\s*vein\s*occlusion\b/g, "hrvo");
            q = q.replace(/\bcentral\s*retinal\s*artery\s*occlusion\b/g, "crao");
            q = q.replace(/\bbranch\s*retinal\s*artery\s*occlusion\b/g, "brao");
            q = q.replace(/\bvein\s*occlusion\b/g, "rvo");
            q = q.replace(/\bartery\s*occlusion\b/g, "artery occlusion");
            q = q.replace(/\bcrvo\b/g, "crvo").replace(/\bbrvo\b/g, "brvo").replace(/\bhrvo\b/g, "hrvo");
            q = q.replace(/\bcrao\b/g, "crao").replace(/\bbrao\b/g, "brao");

            // Retinal conditions
            q = q.replace(/\bretinal\s*detachment\b/g, "retinal detachment");
            q = q.replace(/\brd\b/g, "retinal detachment").replace(/\brrd\b/g, "rhegmatogenous");
            q = q.replace(/\bepiretinal\s*membrane\b/g, "epiretinal");
            q = q.replace(/\bmacular\s*pucker\b/g, "epiretinal");
            q = q.replace(/\berm\b/g, "epiretinal");
            q = q.replace(/\bmacular\s*hole\b/g, "macular hole");
            q = q.replace(/\bfull\s*thickness\s*macular\s*hole\b/g, "macular hole");
            q = q.replace(/\bftmh\b/g, "macular hole");
            q = q.replace(/\blamellar\s*hole\b/g, "lamellar");
            q = q.replace(/\bpvd\b/g, "vitreous detachment");
            q = q.replace(/\bvmt\b/g, "vitreomacular traction");
            q = q.replace(/\bvh\b/g, "vitreous hemorrhage");
            q = q.replace(/\bfloaters\b/g, "vitreous");
            q = q.replace(/\bcsr\b/g, "central serous").replace(/\bcscr\b/g, "central serous");
            q = q.replace(/\bcme\b/g, "cystoid macular edema");

            // Cataracts & lens
            q = q.replace(/\bcataract\b/g, "cataract");
            q = q.replace(/\bpsc\b/g, "posterior subcapsular");
            q = q.replace(/\bnuclear\s*sclerosis\b/g, "nuclear");
            q = q.replace(/\bns\b/g, "nuclear");
            q = q.replace(/\bpseudophakia\b/g, "pseudophakia");
            q = q.replace(/\biol\b/g, "pseudophakia");
            q = q.replace(/\baphakia\b/g, "aphakia");
            q = q.replace(/\bdislocated\s*lens\b/g, "subluxation");
            q = q.replace(/\bdislocated\s*iol\b/g, "dislocated");

            // Geographic atrophy
            q = q.replace(/\bgeographic\s*atrophy\b/g, "geographic atrophy");
            q = q.replace(/\bga\b/g, "geographic atrophy");

            // Other mappings
            q = q.replace(/\bcnv\b/g, "choroidal neovascularization");
            q = q.replace(/\bcnvm\b/g, "choroidal neovascularization");
            q = q.replace(/\bped\b/g, "pigment epithelial detachment");
            q = q.replace(/\brp\b/g, "retinitis pigmentosa").replace(/\brop\b/g, "retinopathy of prematurity");
            q = q.replace(/\bnaion\b/g, "ischemic optic neuropathy").replace(/\baion\b/g, "ischemic optic");
            q = q.replace(/\bhtn\s*retinopathy\b/g, "hypertensive retinopathy");
            q = q.replace(/\bhtn\b/g, "hypertensive");
            q = q.replace(/\bt1dm\b/g, "t1dm").replace(/\bt2dm\b/g, "t2dm");
            q = q.replace(/\btype\s*1\s*diabetes\b/g, "t1dm").replace(/\btype\s*2\s*diabetes\b/g, "t2dm");
            q = q.replace(/\btype\s*1\b/g, "t1dm").replace(/\btype\s*2\b/g, "t2dm");

            // Symptoms
            q = q.replace(/\bblurry\s*vision\b/g, "visual disturbance");
            q = q.replace(/\bblurred\s*vision\b/g, "visual disturbance");
            q = q.replace(/\bvision\s*loss\b/g, "visual disturbance");
            q = q.replace(/\bflashes\b/g, "photopsia");
            q = q.replace(/\bflash\b/g, "photopsia");

            return q;
          };

          const q = expandQuery(codeSearch);
          // Split into words for AND matching — all terms must appear somewhere in enriched haystack
          const terms = q.split(/\s+/).filter(Boolean);

          // Enrich each entry with extra searchable aliases so natural-language queries match
          const enrichHay = (c) => {
            let hay = (c.code + " " + c.desc + " " + c.cat).toLowerCase();
            // Add laterality aliases: (OD) → right eye right od, (OS) → left eye left os, (OU) → both eyes bilateral ou
            if (hay.includes("(od)")) hay += " right eye right od";
            if (hay.includes("(os)")) hay += " left eye left os";
            if (hay.includes("(ou)")) hay += " both eyes bilateral ou";
            // AMD aliases
            if (hay.includes("cnv") || hay.includes("exudative")) hay += " wet wet amd neovascular";
            if (hay.includes("dry amd") || hay.includes("early dry") || hay.includes("intermediate dry") || hay.includes("drusen")) hay += " dry dry amd non-exudative nonexudative";
            if (hay.includes("geographic atrophy") || hay.includes("atrophic")) hay += " ga geographic atrophy advanced dry";
            if (c.cat === "AMD") hay += " macular degeneration armd";
            // Diabetic aliases
            if (hay.includes("dme")) hay += " diabetic macular edema";
            if (hay.includes("npdr")) hay += " non-proliferative nonproliferative diabetic retinopathy";
            if (hay.includes("pdr")) hay += " proliferative diabetic retinopathy";
            if (c.cat === "Diabetic") hay += " diabetes diabetic retinopathy dr";
            // RVO aliases
            if (hay.includes("brvo")) hay += " branch retinal vein occlusion";
            if (hay.includes("crvo")) hay += " central retinal vein occlusion";
            if (hay.includes("hrvo")) hay += " hemiretinal hemi retinal vein occlusion";
            if (c.cat === "RVO") hay += " vein occlusion rvo";
            // Artery occlusion aliases
            if (hay.includes("crao")) hay += " central retinal artery occlusion";
            if (hay.includes("brao")) hay += " branch retinal artery occlusion";
            // Macular aliases
            if (hay.includes("epiretinal")) hay += " erm macular pucker membrane";
            if (hay.includes("macular hole")) hay += " ftmh full thickness";
            if (hay.includes("vitreomacular traction")) hay += " vmt";
            if (hay.includes("cystoid macular edema")) hay += " cme";
            if (hay.includes("central serous")) hay += " csr cscr";
            if (hay.includes("pigment epithelial detachment")) hay += " ped";
            if (hay.includes("choroidal neovascularization")) hay += " cnv cnvm";
            // Vitreous aliases
            if (hay.includes("vitreous detachment")) hay += " pvd posterior vitreous detachment";
            if (hay.includes("vitreous hemorrhage")) hay += " vh";
            if (hay.includes("vitreous opacities") || hay.includes("floaters")) hay += " floaters spots";
            // Cataract aliases
            if (hay.includes("nuclear")) hay += " ns nuclear sclerosis";
            if (hay.includes("posterior subcapsular")) hay += " psc";
            if (hay.includes("pseudophakia") || hay.includes("pseudophakic")) hay += " iol implant lens";
            // Glaucoma aliases
            if (hay.includes("primary open-angle")) hay += " poag open angle";
            if (hay.includes("low-tension")) hay += " ntg normal tension";
            if (hay.includes("neovascular glaucoma")) hay += " nvg";
            if (hay.includes("pseudoexfoliation")) hay += " pxf pex";
            if (hay.includes("ocular hypertension")) hay += " oht";
            if (hay.includes("angle-closure")) hay += " narrow angle closed angle";
            // Retinal detachment aliases
            if (hay.includes("retinal detachment")) hay += " rd";
            if (hay.includes("rhegmatogenous")) hay += " rrd";
            // Other aliases
            if (hay.includes("retinitis pigmentosa")) hay += " rp";
            if (hay.includes("retinopathy of prematurity")) hay += " rop";
            if (hay.includes("ischemic optic neuropathy")) hay += " naion aion";
            if (hay.includes("hypertensive retinopathy")) hay += " htn";
            if (hay.includes("photopsia")) hay += " flashes flash";
            if (hay.includes("visual disturbance")) hay += " blurry blurred vision loss";
            if (hay.includes("metamorphopsia")) hay += " distortion wavy";
            if (hay.includes("scotoma")) hay += " blind spot";
            return hay;
          };

          const filtered = terms.length ? ICD10_DB.filter(c => {
            const hay = enrichHay(c);
            return terms.every(t => hay.includes(t));
          }) : ICD10_DB;
          const cats = [...new Set(filtered.map(c => c.cat))];

          return (
            <div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: S.bright }}>ICD-10 Code Lookup</div>
                <div style={{ fontSize: "0.72rem", color: S.muted, marginTop: 2 }}>Search by code, diagnosis, or category. Quick reference from your retina coding dictionary.</div>
              </div>
              <input
                value={codeSearch}
                onChange={e => setCodeSearch(e.target.value)}
                placeholder="Search codes... (e.g., wet amd left eye, BRVO, diabetic macular edema, floaters)"
                style={{
                  display: "block", width: "100%", background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8,
                  padding: "10px 14px", color: S.text, fontFamily: S.mono, fontSize: "0.84rem", boxSizing: "border-box", marginBottom: 14,
                }}
              />
              <div style={{ fontSize: "0.68rem", color: S.muted, marginBottom: 10 }}>
                {filtered.length} codes {q ? "matching" : "total"} across {cats.length} categories
              </div>
              {cats.map(cat => (
                <div key={cat} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: "0.7rem", color: S.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, borderBottom: `1px solid ${S.border}`, paddingBottom: 4 }}>
                    {cat}
                  </div>
                  {filtered.filter(c => c.cat === cat).map((c, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "3px 0" }}>
                      <span style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 4, padding: "1px 7px", fontSize: "0.74rem", fontFamily: S.mono, fontWeight: 700, color: S.accentLight, flexShrink: 0, minWidth: 90 }}>
                        {c.code}
                      </span>
                      <span style={{ fontSize: "0.78rem", color: "#94a3b8", lineHeight: 1.4 }}>{c.desc}</span>
                    </div>
                  ))}
                </div>
              ))}
              {filtered.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#475569" }}>No codes match "{codeSearch}"</div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

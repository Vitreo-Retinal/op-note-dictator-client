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
    id: "ex_dme_observe",
    label: "DME — IRF worse, observe closely (NO injection)",
    shorthand: `67 yo lady here for f/u\n\n1. T2DM, NIDDM\nA1C 7.5\nOD: Moderate NPDR w DME\nIRF worse on OCT\nObserve closely\n\n1. Pseudophakia OU\nIOLs in good position\n\nPlan\nObserve closely\nF/u in 4 weeks to reassess\nBS/BP control emphasized`,
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
    shorthand: `67 yo M here for urgent visit\n\n1. Post-cataract surgery endophthalmitis OD\ns/p phaco-IOL w Dr. Robbins (3/10/2026)\nToday with pain, photophobia and hypopyon\n\nPlan\nVit tap and send for cultures\nIntravitreal inj of Vanc + Ceftaz\nPF q1hr\nAtropine QD\nF/u tomorrow\nDiscussed guarded vision prognosis given this eye infection as well as the potential need for surgical intervention`,
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


export { DEFAULT_EXAMPLES, DEFAULT_INLINE_RULES, DEFAULT_PLAN_RULES };

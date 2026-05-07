import { useState, useMemo } from "react";

// ── Styles (shared palette with the rest of the app) ────────────────
const S = {
  bg: "#0f172a", card: "#1e293b", border: "#334155", muted: "#64748b",
  text: "#e2e8f0", bright: "#f1f5f9", accent: "#6366f1", accentLight: "#a5b4fc",
  green: "#22c55e", yellow: "#eab308", red: "#ef4444", orange: "#f97316",
  font: "'Inter','SF Pro Display',-apple-system,sans-serif",
  mono: "'SF Mono','Fira Code',monospace",
};

// ── CPT Code Database ───────────────────────────────────────────────
const CPT_DB = [
  // ═══════════════════════════════════════════════════════════════════
  // VITRECTOMY FAMILY (67036–67043)
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "67036",
    desc: "Vitrectomy, mechanical, pars plana approach",
    category: "Vitrectomy",
    global: "90 days",
    indication: "VH, vitreous opacities, dislocated IOL, retained lens fragments, endophthalmitis, vitreomacular traction (non-RD diagnoses)",
    bundling: "All vitrectomy codes 67036–67043 are bundled with each other under NCCI. If multiple vitrectomy techniques are performed same eye, bill the one with the highest RVU. 67121 (removal of implanted material) also bundles with all vitrectomy codes.",
    modifiers: "-LT/-RT (laterality). -58 if staged. -78 if unplanned return to OR. -79 if unrelated procedure in global.",
    tips: "Base vitrectomy code — use when NO membrane peel, NO laser, and diagnosis is NOT retinal detachment. For dislocated IOL cases, pair with 66986 (IOL exchange) which is NOT bundled with 67036.",
  },
  {
    code: "67039",
    desc: "Vitrectomy, mechanical, pars plana approach; with focal endolaser photocoagulation",
    category: "Vitrectomy",
    global: "90 days",
    indication: "Non-RD diagnoses requiring vitrectomy + focal laser (e.g., VH with focal laser for source, diabetic traction without RD)",
    bundling: "Bundled with all other vitrectomy codes (67036–67043). Endolaser is included — do NOT separately bill 67210.",
    modifiers: "-LT/-RT.",
    tips: "Use when focal (not panretinal) endolaser is performed during PPV for a non-RD diagnosis.",
  },
  {
    code: "67040",
    desc: "Vitrectomy, mechanical, pars plana approach; with endolaser panretinal photocoagulation",
    category: "Vitrectomy",
    global: "90 days",
    indication: "PDR with vitreous hemorrhage requiring PPV + PRP (non-RD diagnosis)",
    bundling: "Bundled with all other vitrectomy codes. PRP is included — do NOT separately bill 67228.",
    modifiers: "-LT/-RT.",
    tips: "Classic code for PDR + VH: PPV to clear hemorrhage + endolaser PRP. If also peeling membrane, compare RVU with 67041 and bill the higher one.",
  },
  {
    code: "67041",
    desc: "Vitrectomy, mechanical, pars plana approach; with removal of preretinal cellular membrane (eg, macular pucker)",
    category: "Vitrectomy",
    global: "90 days",
    indication: "Epiretinal membrane (ERM) / macular pucker",
    bundling: "Bundled with all other vitrectomy codes. If PPV + PRP + membrane peel all performed same eye, bill whichever has highest RVU (usually 67041 > 67040).",
    modifiers: "-LT/-RT.",
    tips: "Diagnosis must be ERM/macular pucker. If diagnosis is macular hole, use 67042 instead. If diagnosis is RD with PVR membrane peel, use 67113.",
  },
  {
    code: "67042",
    desc: "Vitrectomy, mechanical, pars plana approach; with removal of internal limiting membrane of retina (eg, macular hole, DME); includes intraocular tamponade if performed",
    category: "Vitrectomy",
    global: "90 days",
    indication: "Full-thickness macular hole (FTMH), DME requiring ILM peel",
    bundling: "Bundled with all other vitrectomy codes. Air/gas/silicone oil tamponade is INCLUDED — do NOT separately bill 67025.",
    modifiers: "-LT/-RT.",
    tips: "Diagnosis-driven: use for macular hole (ILM peel) or DME (ILM peel). If diagnosis is ERM, use 67041 (preretinal membrane) even if ILM is also peeled.",
  },
  {
    code: "67043",
    desc: "Vitrectomy, mechanical, pars plana approach; with removal of subretinal membrane (eg, choroidal neovascularization); includes intraocular tamponade and laser if performed",
    category: "Vitrectomy",
    global: "90 days",
    indication: "Subretinal CNVM removal, subretinal hemorrhage evacuation",
    bundling: "Bundled with all other vitrectomy codes. Tamponade and laser included.",
    modifiers: "-LT/-RT.",
    tips: "Rarely used in modern practice (anti-VEGF has largely replaced surgical CNVM removal). Still applicable for submacular surgery.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // RETINAL DETACHMENT REPAIR
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "67107",
    desc: "Scleral buckle repair of retinal detachment; with or without drainage, cryotherapy, photocoagulation",
    category: "Retinal Detachment",
    global: "90 days",
    indication: "Rhegmatogenous retinal detachment — scleral buckle approach",
    bundling: "Cryotherapy and laser are included. Do NOT separately bill 67101 or 67105. If combined with PPV, may bill both 67107 + vitrectomy code if NCCI allows (check edits).",
    modifiers: "-LT/-RT. -57 if decision for surgery same day/next day.",
    tips: "Includes drainage of SRF, cryotherapy, and photocoagulation when performed. Band/tire/sponge materials are included in the surgical fee.",
  },
  {
    code: "67108",
    desc: "Repair of retinal detachment with vitrectomy, including air/gas tamponade, endolaser, cryotherapy, drainage of SRF, scleral buckling, and/or removal of lens",
    category: "Retinal Detachment",
    global: "90 days",
    indication: "Rhegmatogenous retinal detachment — PPV approach (non-complex)",
    bundling: "Laser, cryo, tamponade, SRF drainage, buckle, lens removal ALL included. This is a comprehensive bundled code. Do NOT separately bill 67036, 67105, 67025, etc.",
    modifiers: "-LT/-RT. -57 if decision for surgery same day/next day.",
    tips: "Use for standard RD repair via PPV. Must have RD diagnosis. If NO retinal detachment, use 67036–67043 family instead. The key differentiator from 67113 is complexity (no PVR ≥ C1, no traction RD, no giant tears).",
  },
  {
    code: "67110",
    desc: "Repair of retinal detachment by injection of air or other gas (eg, pneumatic retinopexy)",
    category: "Retinal Detachment",
    global: "90 days",
    indication: "Rhegmatogenous retinal detachment — pneumatic retinopexy",
    bundling: "Bundled with 67105 (laser for RD) and 67101 (cryo for RD) when performed same session. Anterior chamber tap (65800) is NOT bundled — can bill separately.",
    modifiers: "-LT/-RT. -57 if decision same day. Has both facility and non-facility RVU (higher in office).",
    tips: "Diagnosis MUST be retinal detachment. If diagnosis is subretinal hemorrhage displacement (no RD), use 67025 instead. Office RVU is higher than facility RVU due to practice expense. Staged laser after pneumatic = -58 modifier on laser.",
  },
  {
    code: "67113",
    desc: "Repair of complex retinal detachment (eg, PVR ≥ C1, diabetic traction RD, ROP, giant tear >90°); with vitrectomy and membrane peeling; includes tamponade, cryo, laser, SRF drainage, buckle, lens removal",
    category: "Retinal Detachment",
    global: "90 days",
    indication: "Complex RD: PVR stage C-1 or greater, diabetic tractional RD, ROP, giant retinal tear (>90°)",
    bundling: "Everything included: vitrectomy, membrane peel, tamponade (air/gas/oil), cryo, endolaser, SRF drainage, buckle, lens removal. Most comprehensive bundled code.",
    modifiers: "-LT/-RT. -57 if decision same day.",
    tips: "Highest RVU in the RD family. Documentation must clearly state the complexity (PVR grade, traction, giant tear). If the RD is straightforward (no PVR, no traction), use 67108 instead. Diagnosis is key.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // PNEUMATIC / GAS / OIL
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "67025",
    desc: "Injection of vitreous substitute, pars plana or limbal approach (fluid-gas exchange); with or without aspiration (separate procedure)",
    category: "Pneumatic / Tamponade",
    global: "90 days",
    indication: "Pneumatic displacement of subretinal hemorrhage, fluid-gas exchange, vitreous substitute injection (non-RD diagnosis)",
    bundling: "Included in vitrectomy codes (67036–67043) and RD codes (67108, 67113) when performed in same session. Only bill separately when performed as a standalone procedure.",
    modifiers: "-LT/-RT.",
    tips: "Use for subretinal hemorrhage displacement (NOT retinal detachment — that's 67110). Also used for standalone fluid-gas exchange. Anterior chamber tap (65800) is NOT bundled and can be billed separately.",
  },
  {
    code: "67121",
    desc: "Removal of implanted material, posterior segment; intraocular (eg, silicone oil removal)",
    category: "Pneumatic / Tamponade",
    global: "90 days",
    indication: "Silicone oil removal, removal of other implanted posterior segment material",
    bundling: "BUNDLED with ALL vitrectomy codes (67036–67043). Cannot unbundle with -59. If PPV is performed during oil removal, bill 67036 (not 67121).",
    modifiers: "-LT/-RT. -58 if planned/staged during prior surgery's global period.",
    tips: "Only bill 67121 as standalone when NO vitrectomy is performed. If any vitrectomy is done, 67121 is absorbed. Common error: billing 67121 + 67036 — this will be denied.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // INTRAVITREAL INJECTION
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "67028",
    desc: "Intravitreal injection of a pharmacologic agent",
    category: "Injection",
    global: "10 days",
    indication: "Intravitreal injection of anti-VEGF, steroid, or antibiotic",
    bundling: "Bundled with vitrectomy if performed same session. E/M on same day requires -25 modifier on the E/M code. 'Separate procedure' designation but NCCI overrides this for Medicare.",
    modifiers: "-LT/-RT. -50 for bilateral same day. -79 if unrelated to prior surgery global.",
    tips: "Most common retina procedure code. Pair with appropriate J-code for the drug. G2211 is NOT billable on injection days. E/M requires -25 modifier.",
    jcodes: "See J-code section for drug-specific codes.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // J-CODES (Drug Billing)
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "J9035",
    desc: "Bevacizumab (Avastin) — 10 mg",
    category: "J-Codes",
    global: "N/A",
    indication: "Compounded bevacizumab for intravitreal injection (off-label)",
    bundling: "Bill with 67028. Some MACs require J7999 instead (check local MAC policy: Novitas = J7999, Palmetto = J9035). Some commercial plans require C9257 (5 units for 1.25 mg dose).",
    modifiers: "None typically. Match laterality to 67028.",
    tips: "Nuanced coding — HCPCS code varies by payer. Create an internal reference for which payers use which code. Medicare Advantage and commercial plans may differ from local MAC guidance.",
  },
  {
    code: "J0178",
    desc: "Aflibercept (Eylea) — 2 mg",
    category: "J-Codes",
    global: "N/A",
    indication: "Intravitreal aflibercept 2 mg for wet AMD, DME, RVO, DR",
    bundling: "Bill with 67028.",
    modifiers: "None typically.",
    tips: "Standard Eylea dose. Do not confuse with J0177 (Eylea HD 8 mg).",
  },
  {
    code: "J0177",
    desc: "Aflibercept (Eylea HD) — 8 mg",
    category: "J-Codes",
    global: "N/A",
    indication: "Intravitreal aflibercept 8 mg (high dose) for wet AMD, DME",
    bundling: "Bill with 67028.",
    modifiers: "None typically.",
    tips: "Higher dose formulation. Check payer coverage — some require PA or step therapy for HD formulation.",
  },
  {
    code: "J2778",
    desc: "Ranibizumab (Lucentis) — 0.1 mg",
    category: "J-Codes",
    global: "N/A",
    indication: "Intravitreal ranibizumab for wet AMD, DME, RVO, DR. Bill in units (3 units for 0.3 mg dose, 5 units for 0.5 mg dose).",
    bundling: "Bill with 67028.",
    modifiers: "Ensure correct units: 0.3 mg = 3 units, 0.5 mg = 5 units.",
    tips: "0.3 mg dose is FDA-approved for DME/DR. 0.5 mg dose is FDA-approved for wet AMD, RVO. Using wrong dose for diagnosis may trigger denial.",
  },
  {
    code: "J3398",
    desc: "Faricimab-svoa (Vabysmo) — per 0.1 mg",
    category: "J-Codes",
    global: "N/A",
    indication: "Intravitreal faricimab for wet AMD, DME",
    bundling: "Bill with 67028.",
    modifiers: "None typically.",
    tips: "Dual-pathway inhibitor (anti-VEGF + anti-Ang2). Extended dosing intervals possible. Bill 60 units for standard 6 mg dose.",
  },
  {
    code: "J2781",
    desc: "Pegcetacoplan (Syfovre) — 1 mg",
    category: "J-Codes",
    global: "N/A",
    indication: "Intravitreal pegcetacoplan for geographic atrophy (GA)",
    bundling: "Bill with 67028.",
    modifiers: "None typically.",
    tips: "FDA-approved for GA only — NOT for wet AMD. Bill 15 units for standard 15 mg dose.",
  },
  {
    code: "J2782",
    desc: "Avacincaptad pegol (Izervay) — 0.1 mg",
    category: "J-Codes",
    global: "N/A",
    indication: "Intravitreal avacincaptad pegol for geographic atrophy (GA)",
    bundling: "Bill with 67028.",
    modifiers: "None typically.",
    tips: "FDA-approved for GA only. Complement inhibitor. Do NOT use for wet AMD, DME, or other diagnoses.",
  },
  {
    code: "J1094",
    desc: "Dexamethasone intravitreal implant (Ozurdex) — 0.1 mg",
    category: "J-Codes",
    global: "N/A",
    indication: "Intravitreal dexamethasone implant for DME, RVO, posterior uveitis",
    bundling: "Bill with 67028.",
    modifiers: "None typically.",
    tips: "Sustained-release steroid implant. Bill 7 units for standard 0.7 mg implant. Monitor IOP.",
  },
  {
    code: "J3301",
    desc: "Triamcinolone acetonide (Kenalog/Triescence) — per 10 mg",
    category: "J-Codes",
    global: "N/A",
    indication: "Intravitreal triamcinolone for DME, uveitis, vitreous visualization during surgery",
    bundling: "Bill with 67028 for intravitreal injection. When used for visualization during PPV, it is included in the surgical code.",
    modifiers: "None typically.",
    tips: "Kenalog = preservative-containing (off-label intravitreal). Triescence = preservative-free (preferred for intravitreal). 4 mg intravitreal dose = bill based on amount used.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // LASER PROCEDURES
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "67210",
    desc: "Destruction of localized lesion of retina (eg, macular edema, tumors); photocoagulation",
    category: "Laser",
    global: "10 days",
    indication: "Focal/grid laser for DME, macular edema from RVO, retinal tumor treatment",
    bundling: "Included in vitrectomy codes when performed during PPV. As standalone office procedure, bills separately. Bundled with 92134 (OCT) under some MACs — check LCD.",
    modifiers: "-LT/-RT. -58 if staged during global. -E1/-E2/-E3/-E4 for eyelid modifiers if applicable.",
    tips: "Diagnosis determines code: macular edema = 67210. RD repair by laser = 67105. Retinal tear = 67145. PRP = 67228. Same laser, different codes based on WHY.",
  },
  {
    code: "67220",
    desc: "Destruction of localized lesion of choroid (eg, choroidal neovascularization); photocoagulation",
    category: "Laser",
    global: "10 days",
    indication: "Choroidal neovascular membrane (CNVM) — laser photocoagulation",
    bundling: "Standalone procedure. Not commonly bundled with other retinal lasers.",
    modifiers: "-LT/-RT.",
    tips: "Use when laser is applied to a choroidal lesion (CNVM). If laser is for a retinal lesion (macular edema), use 67210 instead. Rarely used now due to anti-VEGF, but still applicable for extrafoveal CNVM or PDT adjunct.",
  },
  {
    code: "67228",
    desc: "Treatment of extensive or progressive retinopathy (eg, diabetic retinopathy); photocoagulation (PRP)",
    category: "Laser",
    global: "10 days",
    indication: "Panretinal photocoagulation (PRP) for PDR, severe NPDR, NVG, ischemic CRVO",
    bundling: "Included in 67040 (PPV + PRP) when done during surgery. As standalone office PRP, bills separately. Multiple sessions bill as one per eye per day.",
    modifiers: "-LT/-RT. -50 if bilateral same day.",
    tips: "One session per eye per day regardless of how many spots. If PRP is done over multiple visits, each visit is a separate billable session.",
  },
  {
    code: "67145",
    desc: "Prophylaxis of retinal detachment (eg, retinal break, lattice degeneration); photocoagulation",
    category: "Laser",
    global: "10 days",
    indication: "Laser retinopexy (LRP) for retinal tear, retinal hole, lattice degeneration — prophylactic treatment to prevent RD",
    bundling: "Bundled with 67110 (pneumatic) when performed same session. As standalone, bills separately.",
    modifiers: "-LT/-RT. -58 if staged after pneumatic (within global).",
    tips: "Prophylactic laser — must have a retinal break or lattice diagnosis, NOT a retinal detachment. If RD is present and you're lasering around it, use 67105 instead. Staged LRP after pneumatic = 67145-58.",
  },
  {
    code: "67105",
    desc: "Repair of retinal detachment; photocoagulation (laser demarcation/barricade for RD)",
    category: "Laser",
    global: "10 days",
    indication: "Laser repair/demarcation of retinal detachment",
    bundling: "Bundled with 67110 (pneumatic) when performed same session. Bundled with vitrectomy RD codes (67108, 67113).",
    modifiers: "-LT/-RT.",
    tips: "Must have an actual retinal detachment diagnosis. For retinal tear WITHOUT detachment, use 67145 instead. Commonly bundled — check if standalone.",
  },
  {
    code: "67101",
    desc: "Repair of retinal detachment; cryotherapy",
    category: "Laser",
    global: "10 days",
    indication: "Cryotherapy repair/treatment of retinal detachment",
    bundling: "Bundled with 67110 (pneumatic) same session. Bundled with vitrectomy RD codes.",
    modifiers: "-LT/-RT.",
    tips: "Cryotherapy for RD. If no RD (prophylactic cryo for tear/lattice), use 67141 instead.",
  },
  {
    code: "66821",
    desc: "YAG laser capsulotomy, one or more sessions",
    category: "Laser",
    global: "10 days",
    indication: "Posterior capsule opacification (PCO) after cataract surgery",
    bundling: "Not bundled with retinal procedures on same day if different structure (anterior vs posterior segment). Check NCCI.",
    modifiers: "-LT/-RT.",
    tips: "Anterior segment procedure but commonly performed by retina surgeons. 10-day global. Document visual significance of PCO.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // IOL PROCEDURES
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "66986",
    desc: "Exchange of intraocular lens (IOL exchange)",
    category: "IOL / Lens",
    global: "90 days",
    indication: "Dislocated IOL, wrong-power IOL, damaged IOL requiring removal and replacement",
    bundling: "NOT bundled with 67036 (PPV) — can bill both when PPV + IOL exchange performed same session. 67121 IS bundled (removal of implant is included in the exchange). List from highest to lowest RVU: 66986 (22.87) then 67036 (22.72).",
    modifiers: "-LT/-RT. -57 if decision same day.",
    tips: "Correct code when an IOL is REMOVED and a NEW one is placed. If just inserting a secondary IOL (no removal), use 66985. Order matters: 66986 has slightly higher RVU than 67036, so list first for maximum reimbursement.",
  },
  {
    code: "66985",
    desc: "Insertion of intraocular lens prosthesis (secondary implant), not associated with concurrent cataract removal",
    category: "IOL / Lens",
    global: "90 days",
    indication: "Secondary IOL placement in aphakic eye (no concurrent cataract extraction)",
    bundling: "Check NCCI edits when combined with vitrectomy codes.",
    modifiers: "-LT/-RT.",
    tips: "Use for secondary IOL insertion when NO lens is being removed/exchanged. If removing an IOL and replacing, use 66986 (exchange) instead. Common error: billing 66985 when 66986 is the correct code for exchange cases.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // DIAGNOSTIC / IMAGING
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "92134",
    desc: "OCT retina — scanning computerized ophthalmic diagnostic imaging of the retina",
    category: "Diagnostic",
    global: "0 days (XXX)",
    indication: "Macular OCT for AMD, DME, ERM, macular hole, RVO, glaucoma (RNFL/GCC)",
    bundling: "Bundled with 92250 (fundus photos) under most MACs — can only unbundle with documented medical necessity and different diagnoses for each test. Mutually exclusive with 92133 (optic nerve OCT) same eye same day under some payers.",
    modifiers: "None for professional component. -26 if billing professional only (facility setting). -TC for technical only.",
    tips: "Most common diagnostic in retina. Check LCD frequency limits — most MACs allow OCT at each visit for active disease. For stable conditions, may be limited to every 3-6 months. Bill bilateral with one unit (covers both eyes).",
  },
  {
    code: "92133",
    desc: "OCT optic nerve — scanning computerized ophthalmic diagnostic imaging of the optic nerve",
    category: "Diagnostic",
    global: "0 days (XXX)",
    indication: "Glaucoma monitoring (RNFL, optic nerve head analysis)",
    bundling: "May be mutually exclusive with 92134 (retina OCT) same eye same day under some payers. Check NCCI and local LCD.",
    modifiers: "-26 if professional only.",
    tips: "Primarily glaucoma code. Some MACs allow billing both 92133 and 92134 same day if different clinical indications and documented medical necessity.",
  },
  {
    code: "92235",
    desc: "Fluorescein angiography (FA) with interpretation and report",
    category: "Diagnostic",
    global: "0 days (XXX)",
    indication: "Wet AMD (CNVM evaluation), DR (ischemia, NV), RVO (ischemia), CSCR, uveitis, unexplained vision loss",
    bundling: "Can bill with OCT same day (different tests, different information). Check LCD for medical necessity ICD-10 pairings.",
    modifiers: "-26 if professional only.",
    tips: "Includes dye injection, photography, and interpretation. Must document medical necessity — why was FA needed beyond OCT? Common payable diagnoses per NCD/LCD. Bilateral = one unit.",
  },
  {
    code: "92240",
    desc: "ICG angiography (indocyanine green) with interpretation and report",
    category: "Diagnostic",
    global: "0 days (XXX)",
    indication: "Choroidal pathology (polypoidal choroidal vasculopathy, CSCR, choroidal tumors, occult CNVM)",
    bundling: "Can bill with FA (92235) same day if both are medically necessary.",
    modifiers: "-26 if professional only.",
    tips: "Less commonly performed than FA. Primarily for choroidal evaluation when FA is insufficient. Document why ICG was needed in addition to or instead of FA.",
  },
  {
    code: "92242",
    desc: "Fluorescein angiography and ICG angiography performed at same session with interpretation and report",
    category: "Diagnostic",
    global: "0 days (XXX)",
    indication: "Combined FA + ICG same session for complex choroidal/retinal pathology",
    bundling: "Combined code — do NOT bill 92235 + 92240 separately when using 92242.",
    modifiers: "-26 if professional only.",
    tips: "Use when BOTH FA and ICG are performed same session. Some MACs prefer 92235 + 92240 separately — check local MAC policy.",
  },
  {
    code: "92250",
    desc: "Fundus photography with interpretation and report",
    category: "Diagnostic",
    global: "0 days (XXX)",
    indication: "Documentation of retinal pathology (DR screening, AMD, tumors, disc edema, retinal lesions)",
    bundling: "Bundled with 92134 (OCT) under most MACs. Can unbundle only with documented different diagnoses and medical necessity per LCD. Mutually exclusive under some edits.",
    modifiers: "-26 if professional only.",
    tips: "Commonly bundled with OCT — the #1 retina billing pitfall. Check your MAC LCD (e.g., WPS L34760) for unbundling criteria. Bilateral = one unit.",
  },
  {
    code: "92083",
    desc: "Visual field examination, extended (eg, Humphrey 24-2, 30-2)",
    category: "Diagnostic",
    global: "0 days (XXX)",
    indication: "Glaucoma monitoring, neuro-ophthalmic evaluation, plaquenil toxicity screening, functional vision assessment",
    bundling: "Not typically bundled with retinal tests.",
    modifiers: "None typically.",
    tips: "Used in retina practice primarily for glaucoma co-management and hydroxychloroquine toxicity screening.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // E/M CODES
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "99203",
    desc: "Office visit, new patient — low complexity MDM (30 min)",
    category: "E/M",
    global: "N/A",
    indication: "New patient with straightforward problem (e.g., simple referral for evaluation, floaters, nevus)",
    bundling: "N/A",
    modifiers: "-25 if procedure same day. -57 if decision for major surgery.",
    tips: "New patient = not seen by any physician in the group within 3 years. Lower complexity than 99204.",
  },
  {
    code: "99204",
    desc: "Office visit, new patient — moderate complexity MDM (45 min)",
    category: "E/M",
    global: "N/A",
    indication: "New patient with chronic condition requiring management (e.g., new wet AMD, new RD referral, new DME)",
    bundling: "N/A",
    modifiers: "-25 if procedure same day. -57 if decision for major surgery.",
    tips: "Most common new patient code for retina referrals with active disease requiring workup and management plan.",
  },
  {
    code: "99205",
    desc: "Office visit, new patient — high complexity MDM (60 min)",
    category: "E/M",
    global: "N/A",
    indication: "New patient with multiple serious conditions or emergency (e.g., new RD + multiple comorbidities, complex surgical planning)",
    bundling: "N/A",
    modifiers: "-25 if procedure same day. -57 if decision for major surgery.",
    tips: "Reserve for genuinely high complexity — multiple conditions, significant data review, high-risk decision making.",
  },
  {
    code: "99213",
    desc: "Office visit, established patient — low complexity MDM (20 min)",
    category: "E/M",
    global: "N/A",
    indication: "Single chronic condition, straightforward management (e.g., stable dry AMD observation, PVD check)",
    bundling: "N/A",
    modifiers: "-25 if procedure same day. -24 if unrelated to prior surgery global.",
    tips: "Straightforward follow-up. Can add G2211 if longitudinal management of chronic condition (non-injection, non-surgical day).",
  },
  {
    code: "99214",
    desc: "Office visit, established patient — moderate complexity MDM (30 min)",
    category: "E/M",
    global: "N/A",
    indication: "Chronic condition with management decision, data reviewed (e.g., AMD with treatment decision, DME with agent switch)",
    bundling: "N/A",
    modifiers: "-25 if injection same day. -24 if unrelated to prior surgery global. -57 if decision for major surgery same/next day.",
    tips: "Workhorse retina E/M code. Most injection visits = 99214-25. When G2211 eligible, prefer 99214 over 92014 for better reimbursement. AMD alone caps at 99214 (not 99215).",
  },
  {
    code: "99215",
    desc: "Office visit, established patient — high complexity MDM (40 min)",
    category: "E/M",
    global: "N/A",
    indication: "Multiple serious conditions or progression requiring complex MDM (e.g., RD + wet AMD, new macular hole + other pathology)",
    bundling: "N/A",
    modifiers: "-25 if procedure same day. -57 if decision for major surgery.",
    tips: "High bar: AMD alone does NOT qualify even with agent switching. Need additional serious/vision-threatening condition. Document multiple conditions, data reviewed, and high-risk decision.",
  },
  {
    code: "92004",
    desc: "Comprehensive eye exam, new patient (ophthalmological services)",
    category: "E/M",
    global: "N/A",
    indication: "New patient comprehensive eye exam — primarily exam-driven visit with no complex MDM",
    bundling: "N/A",
    modifiers: "-25 if procedure same day.",
    tips: "Eye code (not E/M code). G2211 CANNOT be added to eye codes. When G2211 is eligible, prefer 99204 over 92004. Use 92004 when visit is stable observation, no complex management.",
  },
  {
    code: "92014",
    desc: "Comprehensive eye exam, established patient (ophthalmological services)",
    category: "E/M",
    global: "N/A",
    indication: "Established patient comprehensive eye exam — yearly/annual exams, stable observation",
    bundling: "N/A",
    modifiers: "-25 if procedure same day.",
    tips: "Eye code — G2211 CANNOT be added. Use for injection days (injection = -25, no G2211 anyway), post-op visits, and stable yearly exams where G2211 doesn't apply. When G2211 IS eligible, prefer 99214.",
  },
  {
    code: "92012",
    desc: "Intermediate eye exam, established patient (ophthalmological services)",
    category: "E/M",
    global: "N/A",
    indication: "Simple interim visit with minimal MDM (e.g., pressure recheck, quick interim look, stable nevus check between annual exams)",
    bundling: "N/A",
    modifiers: "-25 if procedure same day.",
    tips: "For truly interim/simple visits only. NOT for yearly/annual exams (those get 92014 even if stable). Eye code — no G2211.",
  },
  {
    code: "G2211",
    desc: "Visit complexity inherent to E/M associated with medical care services that serve as the continuing focal point for all needed health care services",
    category: "E/M",
    global: "N/A",
    indication: "Add-on for established patients with chronic conditions when physician is the longitudinal managing physician",
    bundling: "Only with E/M codes (99213, 99214, 99215). NEVER with eye codes (92014, 92004, 92012).",
    modifiers: "None — add-on code, no modifier.",
    tips: "NEVER on injection days (-25 conflicts). NEVER during post-op global period. NEVER for primarily surgical patients (ERM, FTMH, RD, SB). YES for non-injection chronic disease monitoring visits. When eligible, prefer 99214 + G2211 over 92014.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // OTHER PROCEDURES
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "65800",
    desc: "Paracentesis of anterior chamber; with removal of aqueous",
    category: "Other Procedures",
    global: "0 days",
    indication: "Anterior chamber tap (IOP management during pneumatic, aqueous sampling for infection)",
    bundling: "NOT bundled with 67025 or 67110. Can bill separately with pneumatic procedures.",
    modifiers: "-LT/-RT.",
    tips: "Commonly performed with pneumatic retinopexy to lower IOP before gas injection. Bills separately — one of the few procedures not bundled with pneumatics.",
  },
  {
    code: "67141",
    desc: "Prophylaxis of retinal detachment; cryotherapy (without drainage)",
    category: "Other Procedures",
    global: "10 days",
    indication: "Cryotherapy for retinal tear or lattice degeneration — prophylactic (no RD present)",
    bundling: "Similar bundling rules as 67145 (laser prophylaxis).",
    modifiers: "-LT/-RT.",
    tips: "Cryo equivalent of 67145 (laser). Use when cryo (not laser) is used for prophylactic treatment of retinal breaks. Must NOT have RD diagnosis — if RD present, use 67101.",
  },
  {
    code: "67221",
    desc: "Destruction of localized lesion of choroid; photodynamic therapy (PDT)",
    category: "Other Procedures",
    global: "0 days",
    indication: "PDT with verteporfin for CSCR, polypoidal choroidal vasculopathy, choroidal hemangioma",
    bundling: "Bill with 67225 (second eye) if bilateral same session.",
    modifiers: "-LT/-RT.",
    tips: "Includes verteporfin infusion and laser activation. Less common now but still used for CSCR and PCV. Photosensitivity precautions required.",
  },
  {
    code: "67225",
    desc: "PDT — second eye, same session (add-on to 67221)",
    category: "Other Procedures",
    global: "0 days",
    indication: "Bilateral PDT — add-on for second eye",
    bundling: "Only with 67221. Add-on code, cannot bill standalone.",
    modifiers: "None — add-on code.",
    tips: "Add-on code for bilateral PDT same session.",
  },
];

// ── Category metadata ───────────────────────────────────────────────
const CATEGORIES = [
  { id: "all", label: "All Codes" },
  { id: "Vitrectomy", label: "Vitrectomy" },
  { id: "Retinal Detachment", label: "RD Repair" },
  { id: "Pneumatic / Tamponade", label: "Pneumatic / Oil" },
  { id: "Injection", label: "Injection" },
  { id: "J-Codes", label: "J-Codes" },
  { id: "Laser", label: "Laser" },
  { id: "IOL / Lens", label: "IOL / Lens" },
  { id: "Diagnostic", label: "Diagnostic" },
  { id: "E/M", label: "E/M" },
  { id: "Other Procedures", label: "Other" },
];

// ── Component ───────────────────────────────────────────────────────
export default function CptReference({ onBack }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [expanded, setExpanded] = useState(null);

  const filtered = useMemo(() => {
    let list = CPT_DB;
    if (category !== "all") {
      list = list.filter((c) => c.category === category);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          c.desc.toLowerCase().includes(q) ||
          c.indication.toLowerCase().includes(q) ||
          (c.tips && c.tips.toLowerCase().includes(q)) ||
          (c.bundling && c.bundling.toLowerCase().includes(q))
      );
    }
    return list;
  }, [search, category]);

  const globalColor = (g) => {
    if (!g) return S.muted;
    if (g.includes("90")) return "#ef4444";
    if (g.includes("10")) return "#eab308";
    if (g.includes("0 day") || g.includes("XXX")) return "#22c55e";
    return S.muted;
  };

  return (
    <div style={{ minHeight: "100vh", background: S.bg, fontFamily: S.font, color: S.text }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: S.accentLight, cursor: "pointer", fontSize: "0.9rem", fontFamily: S.font }}
        >
          &larr; Back
        </button>
        <div style={{ fontSize: "1.15rem", fontWeight: 700, color: S.bright }}>CPT Code Reference</div>
        <div style={{ fontSize: "0.75rem", color: S.muted, fontFamily: S.mono, marginLeft: "auto" }}>
          {filtered.length} code{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: "16px 20px 8px" }}>
        <input
          type="text"
          placeholder="Search by code, procedure, indication, or keyword..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 16px",
            background: S.card,
            border: `1px solid ${S.border}`,
            borderRadius: 10,
            color: S.bright,
            fontSize: "0.95rem",
            fontFamily: S.font,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Category pills */}
      <div style={{ padding: "8px 20px 12px", display: "flex", flexWrap: "wrap", gap: 6 }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            style={{
              padding: "5px 12px",
              borderRadius: 20,
              border: category === cat.id ? `1px solid ${S.accent}` : `1px solid ${S.border}`,
              background: category === cat.id ? S.accent + "22" : "transparent",
              color: category === cat.id ? S.accentLight : S.muted,
              fontSize: "0.75rem",
              fontFamily: S.font,
              cursor: "pointer",
              fontWeight: category === cat.id ? 600 : 400,
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Results */}
      <div style={{ padding: "0 20px 48px", maxWidth: 800, margin: "0 auto" }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", color: S.muted, padding: "40px 0", fontSize: "0.9rem" }}>
            No codes found. Try a different search or category.
          </div>
        )}
        {filtered.map((cpt) => {
          const isOpen = expanded === cpt.code;
          return (
            <div
              key={cpt.code}
              style={{
                background: S.card,
                border: `1px solid ${isOpen ? S.accent + "66" : S.border}`,
                borderRadius: 10,
                marginBottom: 8,
                overflow: "hidden",
                transition: "border-color 0.2s",
              }}
            >
              {/* Summary row */}
              <button
                onClick={() => setExpanded(isOpen ? null : cpt.code)}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    fontFamily: S.mono,
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: S.accentLight,
                    minWidth: 58,
                    flexShrink: 0,
                    paddingTop: 1,
                  }}
                >
                  {cpt.code}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: S.bright, fontSize: "0.88rem", lineHeight: 1.4 }}>
                    {cpt.desc}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        padding: "2px 8px",
                        borderRadius: 10,
                        background: S.accent + "22",
                        color: S.accentLight,
                        fontFamily: S.mono,
                      }}
                    >
                      {cpt.category}
                    </span>
                    {cpt.global && cpt.global !== "N/A" && (
                      <span
                        style={{
                          fontSize: "0.68rem",
                          padding: "2px 8px",
                          borderRadius: 10,
                          background: globalColor(cpt.global) + "22",
                          color: globalColor(cpt.global),
                          fontFamily: S.mono,
                        }}
                      >
                        {cpt.global}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ color: S.muted, fontSize: "1rem", flexShrink: 0, paddingTop: 2 }}>
                  {isOpen ? "▲" : "▼"}
                </div>
              </button>

              {/* Expanded details */}
              {isOpen && (
                <div
                  style={{
                    padding: "0 16px 16px",
                    borderTop: `1px solid ${S.border}`,
                    marginTop: 0,
                  }}
                >
                  {cpt.indication && (
                    <DetailSection label="Indication" text={cpt.indication} />
                  )}
                  {cpt.bundling && (
                    <DetailSection label="Bundling Rules" text={cpt.bundling} color="#eab308" />
                  )}
                  {cpt.modifiers && (
                    <DetailSection label="Modifiers" text={cpt.modifiers} color="#6366f1" />
                  )}
                  {cpt.tips && (
                    <DetailSection label="Coding Tips" text={cpt.tips} color="#22c55e" />
                  )}
                  {cpt.jcodes && (
                    <DetailSection label="J-Codes" text={cpt.jcodes} color="#f97316" />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetailSection({ label, text, color }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          fontSize: "0.7rem",
          fontWeight: 600,
          color: color || S.muted,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "0.82rem", color: S.text, lineHeight: 1.55 }}>{text}</div>
    </div>
  );
}

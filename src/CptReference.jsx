import { useState, useMemo } from "react";
import { CPT_CATALOG, CPT_CATEGORIES } from "./cptCatalog";

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
    indication: "VH, vitreous opacities/floaters, dislocated IOL, retained lens fragments (RLF), endophthalmitis, vitreomacular traction (non-RD diagnoses)",
    bundling: "All vitrectomy codes 67036–67043 are bundled with each other under NCCI. If multiple vitrectomy techniques are performed same eye, bill the one with the highest RVU. 67121 (removal of implanted material) also bundles with all vitrectomy codes. 66852 (PPL) and 67028 (injection) are also BUNDLED with 67036.",
    modifiers: "-LT/-RT (laterality). -58 if staged. -78 if unplanned return to OR. -79 if unrelated procedure in global.",
    tips: "Base vitrectomy code — use when NO membrane peel, NO laser, and diagnosis is NOT retinal detachment. Common uses: VH, floaters, RLF after cataract surgery, dislocated IOL, endophthalmitis. For dislocated IOL cases, pair with 66986 (IOL exchange) which is NOT bundled with 67036. For RLF with IOL exchange: 66986 + 67036. Intravitreal antibiotics during PPV are bundled (no separate 67028).",
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
    bundling: "Cryotherapy and laser are included. Do NOT separately bill 67101, 67105, or 67141. BUNDLED with PPV codes (67108) — if PPV + buckle combined, bill 67108 only (NOT 67107 + 67108).",
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
    tips: "Highest RVU in the RD family. CGS TPE actively targeting 67113 — documentation must include: (1) type of RD clearly stated (PVR grade, traction, giant tear), (2) PPV + membrane peel documented in operative note, (3) appropriate modifiers applied, (4) compliant physician signature. If the RD is straightforward (no PVR, no traction), use 67108 instead. Diagnosis is key.",
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
    code: "67120",
    desc: "Removal of implanted material, posterior segment; extraocular (eg, scleral buckle removal)",
    category: "Pneumatic / Tamponade",
    global: "90 days",
    indication: "Scleral buckle removal (band, sponge, or encircling element removal)",
    bundling: "Standalone procedure. Check NCCI if performed with other procedures same session.",
    modifiers: "-LT/-RT. -58 if staged during prior surgery's global period.",
    tips: "Use for removal of scleral buckle material (band, sponge, tire). This is EXTRAOCULAR removal — distinct from 67121 (intraocular, e.g., silicone oil). Common indications: buckle infection, extrusion, diplopia, or patient discomfort.",
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
  // VITREOUS TAP / BIOPSY
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "67015",
    desc: "Aspiration or release of vitreous, subretinal or choroidal fluid, pars plana approach (vitreous tap/biopsy)",
    category: "Vitrectomy",
    global: "90 days",
    indication: "Vitreous biopsy (endophthalmitis workup, lymphoma, uveitis), therapeutic vitreous tap",
    bundling: "BUNDLED with 67028 (intravitreal injection). For endophthalmitis tap-and-inject, bill 67015 ONLY — do NOT add 67028. NOT bundled with full vitrectomy codes (67036–67043). AC tap (65800) is NOT bundled — bill separately if both performed.",
    modifiers: "-LT/-RT. Same-day E/M requires -57 (90-day global = decision for surgery).",
    tips: "Classic use: tap-and-inject for endophthalmitis. When performing tap + intravitreal antibiotics, bill 67015 alone (67028 bundles into it). Same-day E/M gets -57 (NOT -25) because 67015 is 90-day global. If full PPV is performed instead of just a tap, bill the appropriate vitrectomy code, not 67015. Also used for diagnostic vitreous biopsy (lymphoma, chronic uveitis).",
  },

  // ═══════════════════════════════════════════════════════════════════
  // LENSECTOMY / LENS REMOVAL
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "66852",
    desc: "Removal of lens material; pars plana approach, with or without vitrectomy (pars plana lensectomy)",
    category: "IOL / Lens",
    global: "90 days",
    indication: "Pars plana lensectomy (PPL) — removal of crystalline lens via pars plana, typically combined with PPV",
    bundling: "BUNDLED with ALL vitrectomy codes (67036–67043) and ALL RD codes (67108, 67113) under NCCI. Cannot bill 66852 + vitrectomy code. For combined PPV + lensectomy + IOL placement: bill 66986 (IOL exchange, higher RVU) + 67036 (base PPV). Lens removal is included in 67108 and 67113.",
    modifiers: "-LT/-RT.",
    tips: "Key coding pearl: 66852 is ALWAYS bundled with vitrectomy. If performing PPV + lensectomy + IOL implant, the correct coding is 66986-RT + 67036-RT (list 66986 first — higher RVU at 22.87 vs 22.72). Do NOT bill 66852 separately when vitrectomy is performed. 66852 standalone is only billable when NO vitrectomy is done (rare in retina practice).",
  },
  {
    code: "66850",
    desc: "Removal of lens material; phacofragmentation technique (mechanical or ultrasonic), with aspiration",
    category: "IOL / Lens",
    global: "90 days",
    indication: "Phacoemulsification/phacofragmentation for dislocated crystalline lens or retained lens material — anterior approach",
    bundling: "BUNDLED with vitrectomy codes (67036–67043) when performed same session. 66820, 66830, 66840, 66850 are all bundled with 67036.",
    modifiers: "-LT/-RT.",
    tips: "Use for dislocated natural lens removed via phaco technique. If pars plana approach is used instead, use 66852. Both 66850 and 66852 are bundled with vitrectomy — if PPV is also performed, bill 67036 (the vitrectomy absorbs the lensectomy).",
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
    bundling: "BUNDLED with ALL vitrectomy codes (67036–67043) and ALL RD codes (67108, 67113) when performed same session. Intravitreal antibiotics given during PPV cannot be billed separately. BUNDLED with 67015 (vitreous tap) — for tap-and-inject, bill 67015 only. E/M on same day requires -25 modifier on the E/M code.",
    modifiers: "-LT/-RT. -50 for bilateral same day. -79 if unrelated to prior surgery global.",
    tips: "Most common retina procedure code. Pair with appropriate J-code for the drug. G2211 is NOT billable on injection days. E/M requires -25 modifier. KEY: intravitreal antibiotics/antifungals given AT THE TIME OF PPV are bundled — do NOT bill 67028 separately during vitrectomy. For endophthalmitis tap-and-inject (no PPV), bill 67015 only.",
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
    code: "J2777",
    desc: "Faricimab-svoa (Vabysmo) — per 0.1 mg",
    category: "J-Codes",
    global: "N/A",
    indication: "Intravitreal faricimab for wet AMD, DME, ME following RVO",
    bundling: "Bill with 67028. -JZ modifier.",
    modifiers: "-JZ (zero wastage).",
    tips: "Dual-pathway inhibitor (anti-VEGF + anti-Ang2). Extended dosing intervals possible. Bill 60 units for standard 6 mg dose. RVO label expanded April 2026 to allow treatment beyond 6 months.",
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
  {
    code: "J2997",
    desc: "Alteplase recombinant (tPA) — injection, 1 mg",
    category: "J-Codes",
    global: "N/A",
    indication: "Subretinal tPA for submacular hemorrhage displacement. Bill per mg used (typical retinal dose: 25–50 μg = 0.025–0.05 units).",
    bundling: "Drug supply code — bill alongside 0810T (subretinal injection) for the pharmacologic agent. Reimbursement varies by payer; some MACs may not separately reimburse tPA in the surgical context.",
    modifiers: "None typically.",
    tips: "Alteplase (Activase) is the standard tPA used for subretinal injection. Typical dose is 25–50 μg diluted in BSS. Check payer policy for drug reimbursement when used with 0810T. Some practices use tenecteplase (TNK) off-label — J-code may differ.",
  },
  // INTRAVITREAL ANTIBIOTICS (Endophthalmitis)
  {
    code: "J7999",
    desc: "Compounded drug, not otherwise classified — intravitreal vancomycin and/or ceftazidime",
    category: "J-Codes",
    global: "N/A",
    indication: "Intravitreal antibiotics for endophthalmitis (tap-and-inject or PPV). VRA uses Turbare Manufacturing compounded kit: Vancomycin 10mg/1mL (NDC 83556-0510-02) + Ceftazidime 22.5mg/1mL (NDC 83556-0422-02). Preservative-free, single-use vials, 0.8mL in 3mL vial.",
    bundling: "Bill alongside 67015 (vitreous tap) for tap-and-inject. Bill TWO separate J7999 line items — one for vancomycin, one for ceftazidime. Do NOT use J3370, J3373, or J0713 — those are for NON-compounded liquid/powder vials only. Your Turbare kit is compounded (503B outsourcing facility), so J7999 is the correct code for BOTH drugs.",
    modifiers: "-JZ on each J7999 line item (zero wastage — single-use vial, discard remainder).",
    tips: "CLAIM SUBMISSION (CMS-1500): Item 19 — list drug name, dosage, and invoice amount for EACH drug (e.g., 'Vancomycin 10mg/1mL, $XX.XX; Ceftazidime 22.5mg/1mL, $XX.XX'). Item 24a — report NDC per payer policy (Vanc NDC: 83556-0510-02, Ceft NDC: 83556-0422-02). UOM: report volume injected in ML (e.g., ML0.1 for 0.1mL intravitreal dose). NOTE: Medicare does not associate compounded medications with an NDC, but other payers may require it. KEY DISTINCTION: J3373 (vancomycin per 10mg, eff. July 2025) and J0713 (ceftazidime per 500mg) are ONLY for non-compounded liquid or reconstituted powder vials — NOT for your Turbare compounded kit.",
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
    indication: "Dislocated IOL, wrong-power IOL, damaged IOL requiring removal and replacement. Includes Yamane or Akreos scleral fixation when an existing IOL is removed and replaced.",
    bundling: "NOT bundled with 67036 (PPV) — can bill both when PPV + IOL exchange performed same session. 67121 IS bundled (removal of implant is included in the exchange). List from highest to lowest RVU: 66986 (22.87) then 67036 (22.72).",
    modifiers: "-LT/-RT. -57 if decision same day.",
    tips: "Correct code when an IOL is REMOVED and a NEW one is placed — this includes dislocated IOL removed via PPV then replaced with Yamane or Akreos scleral-fixated IOL. If just inserting a secondary IOL (no removal), use 66985. Order matters: 66986 has slightly higher RVU than 67036, so list first. For Akreos (sutured): can add 66682 for the suture fixation. For Yamane (sutureless flanged haptic): 66682 is debatable since no sutures are used.",
  },
  {
    code: "66985",
    desc: "Insertion of intraocular lens prosthesis (secondary implant), not associated with concurrent cataract removal",
    category: "IOL / Lens",
    global: "90 days",
    indication: "Secondary IOL placement in aphakic eye (no concurrent cataract extraction). Includes AC-IOL, Yamane flanged haptic IOL, Akreos sutured scleral-fixated IOL, iris-fixated IOL.",
    bundling: "NOT bundled with 67036 (PPV). Can add 66682 (suture fixation) when IOL is sutured to sclera (Akreos with Gore-Tex). Check NCCI edits when combined with vitrectomy codes.",
    modifiers: "-LT/-RT.",
    tips: "Use for secondary IOL insertion when NO lens is being removed/exchanged. Yamane technique: 66985 + 67036 (66682 is debatable — no sutures used, flanged haptics instead). Akreos with Gore-Tex sutures: 66985 + 66682 + 67036 (sutures justify 66682). If removing an IOL and replacing, use 66986 (exchange) instead.",
  },
  {
    code: "66825",
    desc: "Repositioning of intraocular lens prosthesis, requiring an incision",
    category: "IOL / Lens",
    global: "90 days",
    indication: "Repositioning and suturing of a subluxated/dislocated IOL — the existing IOL is kept (not exchanged)",
    bundling: "NOT bundled with 67036 (PPV) — can bill both when PPV + IOL reposition performed. NOT the same as 66986 (exchange, where IOL is removed and replaced).",
    modifiers: "-LT/-RT.",
    tips: "Use when the existing IOL is repositioned and sutured back into place (NOT removed). If the IOL is removed and a new one placed, use 66986 (exchange) instead. Per AAO: PPV with reposition and suture-in of IOL = 67036 + 66825. If IOL is exchanged instead, use 66986 + 67036.",
  },
  {
    code: "66682",
    desc: "Suture of iris, ciliary body (secondary fixation of IOL)",
    category: "IOL / Lens",
    global: "N/A (add-on)",
    indication: "Scleral suture fixation of IOL — used as add-on when IOL is sutured to sclera/iris (e.g., Akreos with Gore-Tex, sutured scleral-fixated IOL, iris-sutured IOL)",
    bundling: "Add-on to 66985 (secondary IOL) or 66986 (IOL exchange). CPT parenthetical after 66985 directs: 'For secondary fixation, use 66682.' NOT used as standalone.",
    modifiers: "None typically — add-on code.",
    tips: "KEY DISTINCTION: For Akreos IOL with Gore-Tex sutures → YES, bill 66682 (sutures are placed through sclera). For Yamane flanged haptic technique → 66682 is DEBATABLE because no sutures are used (haptics are cauterized into flanges and tucked into scleral tunnels). Some coders bill 66682 for Yamane arguing the fixation is analogous; others do not. Check your MAC policy. Conservative approach for Yamane: bill 66985 + 67036 without 66682.",
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
    bundling: "Bundled with 92250 (fundus photos) under most MACs — can only unbundle with documented medical necessity and different diagnoses for each test. BUNDLED with 92133 (optic nerve OCT) — NCCI indicator 1, CAN unbundle with modifier -59 if different clinical indication for each (e.g., glaucoma + macular disease). Mutually exclusive with 92137 (OCT-A) — NCCI indicator 0, CANNOT bill both same patient same day.",
    modifiers: "None for professional component. -26 if billing professional only (facility setting). -TC for technical only.",
    tips: "Most common diagnostic in retina. Check LCD frequency limits — most MACs allow OCT at each visit for active disease. For stable conditions, may be limited to every 3-6 months. Bill bilateral with one unit (covers both eyes). If OCT-A is performed, bill 92137 INSTEAD (not both) — 92137 includes the structural OCT and reimburses ~45% more (~$56.93 vs ~$31.38). HCQ/PLAQUENIL SCREENING: NGS LCD Group 4 covers 92134 for hydroxychloroquine/chloroquine toxicity screening — link Z03.89 (baseline, before starting HCQ) or Z79.899 + Z09 (ongoing monitoring while on HCQ). SD-OCT modality only per LCD.",
  },
  {
    code: "92133",
    desc: "OCT optic nerve — scanning computerized ophthalmic diagnostic imaging of the optic nerve",
    category: "Diagnostic",
    global: "0 days (XXX)",
    indication: "Glaucoma monitoring (RNFL, optic nerve head analysis)",
    bundling: "BUNDLED with 92134 (retina OCT) — NCCI indicator 1, CAN unbundle with modifier -59 if different clinical indication (e.g., glaucoma for 92133 + macular disease for 92134). Mutually exclusive with 92137 (OCT-A) — NCCI indicator 0, CANNOT bill both same day. Check local LCD for documentation requirements.",
    modifiers: "-26 if professional only.",
    tips: "Primarily glaucoma code. Some MACs allow billing both 92133 and 92134 same day if different clinical indications and documented medical necessity.",
  },
  {
    code: "92137",
    desc: "OCT angiography (OCT-A) — retina, including structural OCT and angiographic imaging",
    category: "Diagnostic",
    global: "0 days (XXX)",
    indication: "Non-invasive vascular imaging of retina/choroid without dye injection. Wet AMD (CNVM detection/monitoring), DR (neovascularization, ischemia), RVO (ischemia, NV), CSCR, polypoidal choroidal vasculopathy (PCV), capillary non-perfusion mapping, treatment response monitoring",
    bundling: "MUTUALLY EXCLUSIVE with 92134 (retinal OCT) — NCCI indicator 0, CANNOT bill both same day (92137 includes the structural OCT). MUTUALLY EXCLUSIVE with 92133 (optic nerve OCT) — NCCI indicator 0, CANNOT bill both same day. NOTE: 92134 + 92133 is a DIFFERENT relationship (bundled, CAN unbundle with -59) — but 92137 cannot be combined with either. NCCI edits with FA (92235), ICG (92240), FA/ICG (92242) were DELETED retroactive to Oct 1, 2025 — OCT-A + FA/ICG is now billable same day without modifier. NCCI edits with eye visit codes (92002, 92004, 92012, 92014) were DELETED Jan 2026 (retroactive to 10/1/2025) — no modifier needed when billing 92137 alongside eye visit codes. NO NCCI edit with E/M codes (99213-99215) — no modifier needed alongside 99214-25 on injection days.",
    modifiers: "-26 if professional only (facility setting). -TC for technical only. No modifier needed with eye visit codes (920xx) or E/M codes (992xx) — NCCI edits with eye visit codes were deleted Jan 2026.",
    tips: "Reimburses ~$56.93 (2026 Medicare) vs ~$31.38 for 92134 — about 45% more. On injection days: bill 99214-25 + 67028 + J-code + 92137 (no extra modifier on OCT-A). On non-injection days using E/M: same, 92137 rides alongside E/M. On non-injection days using eye visit code: 92137 rides alongside eye visit code — no modifier needed (NCCI edits deleted Jan 2026). NEVER bill 92134 + 92137 same day — the OCT-A code INCLUDES the structural OCT. Bill bilateral with one unit. HCQ/PLAQUENIL SCREENING: NGS LCD R9 (10/1/2025) added 92137 to Group 3 — OCT-A is now covered for HCQ screening same as 92134. Link Z03.89 (baseline) or Z79.899 + Z09 (ongoing monitoring).",
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
  // SUBRETINAL INJECTION
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "0810T",
    desc: "Subretinal injection of a pharmacologic agent, including vitrectomy and one or more retinotomies",
    category: "Vitrectomy",
    global: "90 days",
    indication: "PPV + subretinal tPA injection for submacular hemorrhage displacement, subretinal gene therapy (e.g., Luxturna/voretigene), any subretinal drug delivery requiring vitrectomy and retinotomy",
    bundling: "Category III code — includes vitrectomy, retinotomy, fluid-air exchange, and gas tamponade. Do NOT separately bill 67036 (PPV), 67028 (injection), or 67025 (gas). All bundled into 0810T. J2997 (alteplase) may be billed separately for drug supply — check payer policy.",
    modifiers: "-LT/-RT.",
    tips: "Effective July 1, 2023 (Category III). Use when subretinal injection is the PRIMARY procedure — PPV + retinotomy + subretinal injection of tPA/gene therapy + gas. For submacular hemorrhage: typical dose is 25–50 μg alteplase subretinally, then gas tamponade. If a different primary procedure is performed (e.g., membrane removal with incidental subretinal injection), use the appropriate 67036–67043 code instead. Category III codes may have limited payer coverage — verify reimbursement.",
  },
  // CAPSULAR BAG PROSTHESIS
  {
    code: "0996T",
    desc: "Insertion and scleral fixation of capsular bag prosthesis containing IOL, with vitrectomy",
    category: "Vitrectomy",
    global: "N/A (Category III — no RVUs assigned)",
    indication: "Scleral fixation of prosthetic capsular bag with integrated IOL for eyes without adequate capsular support — dislocated IOL, absent or compromised capsular bag, inadequate zonular support. Includes vitrectomy and removal of crystalline lens or dislocated IOL when performed.",
    bundling: "ALL-INCLUSIVE — do NOT bill separately for: cataract extraction (66982, 66984), IOL insertion/exchange (66682, 66985, 66986), IOL repositioning (66825), vitrectomy (67005, 67010, 67015, 67036, 67039, 67040, 67041, 67042, 67043), or lens removal (66850). If PPV + lens removal is performed WITHOUT the capsular bag prosthesis device, do NOT use 0996T — bill standard vitrectomy + lens codes instead.",
    modifiers: "-LT/-RT.",
    tips: "Category III code effective January 1, 2026 (sunset January 2030). The prosthetic capsular bag device is still investigational (not yet FDA-approved as of 2026) — coverage is MAC/payer-dependent with no national Medicare payment rate. Submit claims to payer first; do NOT default to patient-pay. Use ABN for Medicare patients when coverage is uncertain. This code is ONLY for use with the specific prosthetic capsular bag device — standard scleral-fixated IOL cases (Yamane, Gore-Tex suture, etc.) should continue to use existing codes (67036 + 66985/66986). MACs may require operative notes submitted with the claim.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // OTHER PROCEDURES
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "65800",
    desc: "Paracentesis of anterior chamber; with removal of aqueous",
    category: "Other Procedures",
    global: "0 days",
    indication: "Anterior chamber tap (IOP management during pneumatic, aqueous sampling for infection, endophthalmitis culture when vitreous tap is dry)",
    bundling: "NOT bundled with 67025 or 67110. Can bill separately with pneumatic procedures. NOT bundled with 67015 (vitreous tap) — bill separately if both performed. NOT bundled with 67028 (intravitreal injection) — bill separately.",
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

// ── Smart Search: keyword aliases for clinical shorthand ────────────
// Maps common terms/abbreviations → CPT codes they should surface
const KEYWORD_MAP = {
  // Vitrectomy shorthand
  "ppv": ["67036","67039","67040","67041","67042","67043","67108","67113"],
  "vit": ["67036","67039","67040","67041","67042","67043","67108","67113"],
  "vitrectomy": ["67036","67039","67040","67041","67042","67043","67108","67113"],
  "core vit": ["67036"],
  "ilm": ["67042"],
  "ilm peel": ["67042"],
  "membrane peel": ["67041","67042","67113"],
  "erm": ["67041"],
  "epiretinal membrane": ["67041"],
  "macular pucker": ["67041"],
  "mac hole": ["67042"],
  "macular hole": ["67042"],
  "ftmh": ["67042"],
  "full thickness macular hole": ["67042"],
  "vh": ["67036","67040"],
  "vitreous hemorrhage": ["67036","67040"],
  "pdr": ["67040","67228"],
  "prp": ["67040","67228"],
  "panretinal": ["67040","67228"],
  "endolaser": ["67039","67040"],
  "focal laser": ["67039","67210"],
  "subretinal": ["67043"],
  "cnvm": ["67043","67220"],

  // Gas/tamponade
  "gas": ["67042","67025","67108","67110","67113"],
  "c3f8": ["67042","67025","67108","67110","67113"],
  "sf6": ["67042","67025","67108","67110","67113"],
  "air": ["67025","67108","67110"],
  "oil": ["67121","67113"],
  "silicone oil": ["67121","67113"],
  "soro": ["67121"],
  "oil removal": ["67121"],
  "buckle removal": ["67120"],
  "band removal": ["67120"],
  "implant removal": ["67120","67121"],
  "tamponade": ["67025","67042","67108","67113"],
  "fluid gas exchange": ["67025"],
  "fluid air exchange": ["67025"],
  "fax": ["67025"],
  "fge": ["67025"],

  // RD
  "rd": ["67107","67108","67110","67113"],
  "retinal detachment": ["67107","67108","67110","67113"],
  "detachment": ["67107","67108","67110","67113"],
  "buckle": ["67107"],
  "scleral buckle": ["67107"],
  "sb": ["67107"],
  "pneumatic": ["67110"],
  "pneumatic retinopexy": ["67110"],
  "pvr": ["67113"],
  "complex": ["67113"],
  "complex rd": ["67113"],
  "traction": ["67113"],
  "tractional": ["67113"],
  "giant tear": ["67113"],

  // Injection
  "injection": ["67028"],
  "intravitreal": ["67028"],
  "ivt": ["67028"],
  "inject": ["67028"],

  // Drugs
  "avastin": ["J9035"],
  "bevacizumab": ["J9035"],
  "bev": ["J9035"],
  "eylea": ["J0178","J0177"],
  "aflibercept": ["J0178","J0177"],
  "eylea hd": ["J0177"],
  "lucentis": ["J2778"],
  "ranibizumab": ["J2778"],
  "vabysmo": ["J2777"],
  "faricimab": ["J2777"],
  "syfovre": ["J2781"],
  "pegcetacoplan": ["J2781"],
  "izervay": ["J2782"],
  "avacincaptad": ["J2782"],
  "ozurdex": ["J1094"],
  "dexamethasone": ["J1094"],
  "dex implant": ["J1094"],
  "kenalog": ["J3301"],
  "triamcinolone": ["J3301"],
  "triam": ["J3301"],
  "steroid": ["J1094","J3301"],
  "ga": ["J2781","J2782"],
  "geographic atrophy": ["J2781","J2782"],

  // Laser
  "laser": ["67210","67220","67228","67145","67105","66821"],
  "lrp": ["67145"],
  "laser retinopexy": ["67145"],
  "barricade": ["67105","67145"],
  "yag": ["66821"],
  "capsulotomy": ["66821"],
  "pco": ["66821"],
  "grid": ["67210"],
  "focal": ["67210"],
  "pdt": ["67221","67225"],
  "photodynamic": ["67221","67225"],
  "verteporfin": ["67221"],
  "cscr": ["67221"],

  // Cryo
  "cryo": ["67101","67141"],
  "cryotherapy": ["67101","67141"],
  "cryopexy": ["67101","67141"],

  // IOL
  "iol": ["66986","66985","66825"],
  "iol exchange": ["66986"],
  "iol reposition": ["66825"],
  "reposition": ["66825"],
  "dislocated iol": ["66986","66825","67036","0996T"],
  "subluxated": ["66825","66986"],
  "secondary iol": ["66985"],
  "lens": ["66986","66985","66850","66852"],
  "aphakia": ["66985"],
  "dislocated lens": ["66850","66852","67036"],
  "phaco": ["66850"],

  // Diagnostics
  "oct": ["92134","92133","92137"],
  "oct retina": ["92134","92137"],
  "oct nerve": ["92133"],
  "oct-a": ["92137"],
  "octa": ["92137"],
  "oct angiography": ["92137"],
  "oct angio": ["92137"],
  "angiography without dye": ["92137"],
  "rnfl": ["92133"],
  "fa": ["92235"],
  "fluorescein": ["92235","92242"],
  "angiography": ["92235","92240","92242"],
  "icg": ["92240","92242"],
  "fundus photo": ["92250"],
  "photo": ["92250"],
  "visual field": ["92083"],
  "hvf": ["92083"],
  "humphrey": ["92083"],
  "plaquenil": ["92083"],

  // E/M
  "new patient": ["99203","99204","99205","92004"],
  "established": ["99213","99214","99215","92014","92012"],
  "follow up": ["99213","99214","99215","92014"],
  "g2211": ["G2211"],
  "complexity add-on": ["G2211"],

  // Vitreous tap/biopsy
  "vitreous tap": ["67015"],
  "vitreous biopsy": ["67015"],
  "biopsy": ["67015"],
  "tap": ["67015","65800"],
  "tap and inject": ["67015"],
  "endophthalmitis": ["67015","67036"],
  "endoph": ["67015","67036"],
  // Lensectomy
  "ppl": ["66852","66986","67036"],
  "lensectomy": ["66852","66986","67036"],
  "pars plana lensectomy": ["66852","66986","67036"],
  "retained lens": ["67036","66986"],
  "rlf": ["67036","66986"],
  "dropped lens": ["67036","66986"],
  "dropped nucleus": ["67036","66986"],
  "floaters": ["67036"],
  "vitreous opacities": ["67036"],
  // AC-IOL
  "ac iol": ["66985"],
  "ac-iol": ["66985"],
  "anterior chamber iol": ["66985"],
  // Scleral fixation / Yamane / Akreos
  "yamane": ["66985","67036"],
  "flanged haptic": ["66985","67036"],
  "intrascleral": ["66985","66682","67036"],
  "scleral fixation": ["66985","66682","67036","0996T"],
  "scleral fixated": ["66985","66682","67036","0996T"],
  "capsular bag prosthesis": ["0996T"],
  "prosthetic capsular bag": ["0996T"],
  "0996t": ["0996T"],
  "sf iol": ["66985","66682","67036"],
  "akreos": ["66985","66682","67036"],
  "gore-tex": ["66985","66682","67036"],
  "goretex": ["66985","66682","67036"],
  "sutured scleral": ["66985","66682"],
  "66682": ["66682"],
  // Contralateral
  "contralateral": [],
  "other eye": [],
  "bilateral": [],
  // Antibiotics
  "antibiotics": ["67028","67015"],
  "vancomycin": ["J7999","67028","67015"],
  "ceftazidime": ["J7999","67028","67015"],
  "compounded antibiotic": ["J7999"],
  "compounded drug": ["J7999"],
  "j7999": ["J7999"],
  "turbare": ["J7999"],
  "endophthalmitis antibiotics": ["J7999","67015"],
  // Misc
  "ac tap": ["65800"],
  "paracentesis": ["65800"],
  "anterior chamber": ["65800"],
  "submacular hemorrhage": ["0810T","67025","65800"],
  "submacular": ["0810T","67025","65800"],
  "pneumatic displacement": ["67025","65800"],
  "vmt": ["67025","65800"],
  "vitreomacular traction": ["67025","65800"],
  "subretinal tpa": ["0810T","J2997"],
  "subretinal injection": ["0810T"],
  "tpa": ["0810T","J2997"],
  "alteplase": ["J2997","0810T"],
  "activase": ["J2997","0810T"],
  "gene therapy": ["0810T"],
  "luxturna": ["0810T"],
  "voretigene": ["0810T"],
  "0810t": ["0810T"],
  "tear": ["67145","67141"],
  "retinal tear": ["67145","67141"],
  "lattice": ["67145","67141"],
  "dme": ["67210","67042","J0178","J2778","J2777","J1094"],
  "diabetic macular edema": ["67210","67042"],
  "rvo": ["67210","J0178","J2778","J2777"],
  "wet amd": ["J0178","J0177","J2778","J2777","67028"],
  "amd": ["J0178","J0177","J2778","J2777","67028","99214"],
};

// ── Decision-tree search engine ─────────────────────────────────────
// Encodes the vitrectomy/RD decision tree as qualifier logic.
// Each surgical code has REQUIRED qualifiers — without them, the code
// is suppressed even if other generic terms match.

// Term groups: detect which clinical concepts are present in the query
const TERM_GROUPS = {
  rd: ["rd","retinal detachment","detachment","rhegmatogenous"],
  complex: ["complex","pvr","traction","tractional","giant tear","rop","proliferative vitreoretinopathy"],
  ppv: ["ppv","vit","vitrectomy","pars plana"],
  buckle: ["buckle","scleral buckle","sb","band","sponge"],
  pneumatic: ["pneumatic","pneumatic retinopexy"],
  ilm: ["ilm","ilm peel","internal limiting membrane"],
  macular_hole: ["mac hole","macular hole","ftmh","full thickness macular hole"],
  erm: ["erm","epiretinal membrane","macular pucker","pucker","preretinal membrane"],
  subretinal: ["subretinal","cnvm","subretinal membrane"],
  prp: ["prp","panretinal","panretinal photocoagulation"],
  focal_laser: ["focal","focal laser","grid","focal endolaser"],
  gas: ["gas","c3f8","sf6","air","tamponade","fax","fluid air exchange","fluid gas exchange","fge"],
  oil: ["oil","silicone oil","soro","silicone"],
  dme: ["dme","diabetic macular edema"],
  vh: ["vh","vitreous hemorrhage","hemorrhage"],
  pdr: ["pdr","proliferative diabetic"],
  injection: ["injection","inject","intravitreal","ivt"],
  laser: ["laser","lrp","laser retinopexy","barricade","photocoagulation"],
  yag: ["yag","capsulotomy","pco"],
  cryo: ["cryo","cryotherapy","cryopexy"],
  iol: ["iol","iol exchange","dislocated iol","lens","secondary iol","aphakia","iol reposition","reposition","subluxated"],
  dislocated_lens: ["dislocated lens","dropped lens","dropped nucleus","subluxated lens","dislocated crystalline"],
  buckle_removal: ["buckle removal","band removal","sponge removal","explant"],
  submacular: ["submacular hemorrhage","submacular","pneumatic displacement"],
  vmt: ["vmt","vitreomacular traction"],
  subretinal_injection: ["subretinal tpa","subretinal injection","tpa","alteplase","activase","gene therapy","luxturna","voretigene","0810t"],
  phaco: ["phaco","phacoemulsification","phacofragmentation"],
  tear: ["tear","retinal tear","break","lattice"],
  pdt: ["pdt","photodynamic","verteporfin","cscr"],
  floaters: ["floaters","floater","vitreous opacities","opacities","symptomatic floaters"],
  rlf: ["rlf","retained lens","retained lens fragments","dropped lens","dropped nucleus","retained nuclear","lens fragment"],
  ppl: ["ppl","pars plana lensectomy","lensectomy"],
  biopsy: ["biopsy","tap","vitreous biopsy","vitreous tap","diagnostic tap"],
  endophthalmitis: ["endophthalmitis","endoph","tap and inject","tap inject","tap-and-inject"],
  compounded_abx: ["compounded antibiotic","compounded drug","j7999","turbare","vancomycin","ceftazidime","vanc","ceftaz","endophthalmitis antibiotics"],
  antibiotics: ["antibiotics","antibiotic","antifungal","vancomycin","ceftazidime","voriconazole","amikacin"],
  contralateral: ["contralateral","other eye","fellow eye","bilateral","os","od","both eyes"],
  ac_iol: ["ac iol","ac-iol","anterior chamber iol","anterior chamber lens"],
  yamane: ["yamane","flanged haptic","flanged","intrascleral","sutureless fixation","sutureless iol"],
  akreos: ["akreos","gore-tex","goretex","gore tex","sutured scleral","4-point fixation","four point fixation"],
  scleral_fixation: ["scleral fixation","scleral fixated","scleral-fixated","sf iol","sfiol","scleral fix"],
  capsular_bag_prosthesis: ["capsular bag prosthesis","prosthetic capsular bag","capsular prosthesis","pcb iol"],
  // Drugs
  avastin: ["avastin","bevacizumab","bev"],
  eylea: ["eylea","aflibercept"],
  eylea_hd: ["eylea hd","aflibercept 8"],
  lucentis: ["lucentis","ranibizumab"],
  vabysmo: ["vabysmo","faricimab"],
  syfovre: ["syfovre","pegcetacoplan"],
  izervay: ["izervay","avacincaptad"],
  ozurdex: ["ozurdex","dexamethasone","dex implant"],
  kenalog: ["kenalog","triamcinolone","triam"],
  ga: ["ga","geographic atrophy"],
  // Diagnostics
  oct: ["oct","oct retina"],
  octa: ["oct-a","octa","oct angiography","oct angio","angiography without dye"],
  oct_nerve: ["oct nerve","rnfl","optic nerve"],
  fa: ["fa","fluorescein","angiography"],
  icg: ["icg","indocyanine"],
  photo: ["fundus photo","photo","photography"],
  vf: ["visual field","hvf","humphrey","plaquenil"],
  // E/M
  new_patient: ["new patient","new"],
  established: ["established","follow up","follow-up","f/u"],
};

// Decision rules: code → which term groups MUST be present (at least one from each required array)
// and which groups EXCLUDE this code (if present, code is suppressed)
const CODE_RULES = {
  // RD family
  "67113": { require: [["rd"],["complex"]], boost: ["ppv","oil","gas"] },
  "67108": { require: [["rd"],["ppv"]], exclude: ["complex","pneumatic"], boost: ["gas","buckle"] },
  "67107": { require: [["buckle"]], boost: ["rd"] },
  "67110": { require: [["pneumatic"]], boost: ["rd"] },
  // Vitrectomy family (non-RD)
  "67042": { require: [["ilm","macular_hole","dme"]], exclude: ["rd","erm"], boost: ["ppv","gas"] },
  "67041": { require: [["erm"]], exclude: ["rd","macular_hole"], boost: ["ppv"] },
  "67043": { require: [["subretinal"]], exclude: ["rd"], boost: ["ppv"] },
  "67040": { require: [["prp","pdr"]], exclude: ["rd"], boost: ["ppv","vh"] },
  "67039": { require: [["focal_laser"]], exclude: ["rd"], boost: ["ppv"] },
  "67036": { require: [["ppv","vh","floaters","rlf","endophthalmitis"]], exclude: ["rd","ilm","macular_hole","erm","subretinal","prp","focal_laser","buckle","pneumatic","injection","laser","yag","cryo","pdt","biopsy"], boost: ["vh","floaters","rlf","endophthalmitis"] },
  // Subretinal injection
  "0810T": { require: [["subretinal_injection"]], boost: ["ppv","submacular"] },
  // Gas/oil/implant standalone
  "67025": { require: [["gas","oil","submacular","vmt"]], exclude: ["rd","ppv","ilm","macular_hole","subretinal_injection"], boost: ["submacular","vmt"] },
  "67120": { require: [["buckle_removal"]], boost: [] },
  "67121": { require: [["oil"]], exclude: ["rd"], boost: [] },
  // Vitreous tap/biopsy
  "67015": { require: [["biopsy","endophthalmitis"]], exclude: ["ppv","rd"], boost: ["endophthalmitis"] },
  // Capsular bag prosthesis
  "0996T": { require: [["capsular_bag_prosthesis"]], boost: ["iol","scleral_fixation","ppv"] },
  // Lensectomy / lens removal (bundled with PPV — informational)
  "66852": { require: [["ppl"]], exclude: ["iol","phaco"], boost: ["ppv"] },
  "66850": { require: [["phaco","dislocated_lens"]], exclude: ["ppl"], boost: [] },
  "66825": { require: [["iol"]], exclude: ["ac_iol","yamane","akreos","scleral_fixation"], boost: ["ppv"] },
  // Injection
  "67028": { require: [["injection","antibiotics"]], exclude: ["ppv","rd","biopsy","endophthalmitis"], boost: [] },
  // Compounded intravitreal antibiotics
  "J7999": { require: [["compounded_abx","endophthalmitis"]], boost: ["antibiotics"] },
  // J-codes
  "J9035": { require: [["avastin"]], boost: ["injection"] },
  "J0178": { require: [["eylea"]], exclude: ["eylea_hd"], boost: ["injection"] },
  "J0177": { require: [["eylea_hd"]], boost: ["injection"] },
  "J2778": { require: [["lucentis"]], boost: ["injection"] },
  "J2777": { require: [["vabysmo"]], boost: ["injection"] },
  "J2781": { require: [["syfovre","ga"]], exclude: ["izervay"], boost: ["injection"] },
  "J2782": { require: [["izervay"]], boost: ["injection"] },
  "J1094": { require: [["ozurdex"]], boost: ["injection"] },
  "J3301": { require: [["kenalog"]], boost: ["injection"] },
  "J2997": { require: [["subretinal_injection"]], boost: ["submacular"] },
  // Laser
  "67210": { require: [["focal_laser","laser"]], exclude: ["rd","prp","ppv","tear","yag","pdt"], boost: ["dme"] },
  "67228": { require: [["prp","pdr"]], exclude: ["ppv","rd"], boost: ["laser"] },
  "67145": { require: [["tear"]], exclude: ["rd","ppv"], boost: ["laser"] },
  "67105": { require: [["rd","laser"]], exclude: ["ppv","buckle","pneumatic"], boost: [] },
  "67101": { require: [["rd","cryo"]], boost: [] },
  "66821": { require: [["yag"]], boost: [] },
  // Cryo
  "67141": { require: [["tear"],["cryo"]], exclude: ["rd","ppv"], boost: [] },
  // IOL / Scleral Fixation
  "66986": { require: [["iol"]], exclude: ["ac_iol","yamane","akreos","scleral_fixation"], boost: ["ppv","rlf"] },
  "66985": { require: [["iol","ac_iol","yamane","akreos","scleral_fixation"]], exclude: [], boost: ["ppv","yamane","akreos","scleral_fixation"] },
  "66682": { require: [["akreos","scleral_fixation"]], exclude: ["yamane"], boost: ["iol"] },
  // Diagnostics
  "92134": { require: [["oct"]], exclude: ["oct_nerve","octa"], boost: [] },
  "92137": { require: [["octa"]], boost: ["oct"] },
  "92133": { require: [["oct_nerve"]], boost: [] },
  "92235": { require: [["fa"]], exclude: ["icg"], boost: [] },
  "92240": { require: [["icg"]], boost: [] },
  "92250": { require: [["photo"]], boost: [] },
  "92083": { require: [["vf"]], boost: [] },
  // PDT
  "67221": { require: [["pdt"]], boost: [] },
  // E/M (only show if explicitly asked)
  "99214": { require: [["established"]], exclude: ["injection","ppv","rd","laser"], boost: [] },
  "99204": { require: [["new_patient"]], exclude: ["injection","ppv","rd","laser"], boost: [] },
};

function smartSearch(query, list) {
  const q = query.toLowerCase().trim();
  if (!q) return list;

  // Detect which term groups are present in the query
  const activeGroups = new Set();
  for (const [group, terms] of Object.entries(TERM_GROUPS)) {
    // Sort terms longest-first so multi-word phrases match before their parts
    const sorted = [...terms].sort((a, b) => b.length - a.length);
    for (const term of sorted) {
      if (q.includes(term)) {
        activeGroups.add(group);
        break;
      }
    }
  }

  // Also check individual tokens for single-word group matches
  const FILLER = new Set(["for","with","and","the","a","an","of","in","to","on","by","or","no","via","using","then","also","after","before","during"]);
  const tokens = q.split(/[\s,;+\/]+/).filter((t) => !FILLER.has(t) && t.length > 0);
  for (const tok of tokens) {
    for (const [group, terms] of Object.entries(TERM_GROUPS)) {
      for (const term of terms) {
        if (term === tok || (tok.length >= 3 && term.length >= 3 && term.split(/\s+/).length === 1 && (term.startsWith(tok) || tok.startsWith(term)))) {
          activeGroups.add(group);
        }
      }
    }
  }

  // ── Combination inference: detect implied diagnoses from surgical context ──
  // PPV + gas + laser (without a specific non-RD diagnosis) strongly implies RD
  if (activeGroups.has("ppv") && activeGroups.has("gas") && activeGroups.has("laser") &&
      !activeGroups.has("ilm") && !activeGroups.has("macular_hole") && !activeGroups.has("dme") &&
      !activeGroups.has("erm") && !activeGroups.has("subretinal") && !activeGroups.has("pdr")) {
    activeGroups.add("rd");
  }
  // PPV + buckle always implies RD
  if (activeGroups.has("ppv") && activeGroups.has("buckle")) {
    activeGroups.add("rd");
  }
  // PPV + cryo + gas implies RD (cryo retinopexy during RD repair)
  if (activeGroups.has("ppv") && activeGroups.has("cryo") && activeGroups.has("gas") &&
      !activeGroups.has("ilm") && !activeGroups.has("macular_hole") && !activeGroups.has("erm")) {
    activeGroups.add("rd");
  }

  if (activeGroups.size === 0) {
    // Pure text fallback — search code/desc/indication directly
    return list.filter((c) => {
      const s = `${c.code} ${c.desc} ${c.indication}`.toLowerCase();
      return tokens.some((t) => s.includes(t));
    }).slice(0, 3);
  }

  // Run decision rules
  const results = [];
  for (const [code, rule] of Object.entries(CODE_RULES)) {
    // Check excludes first — if any excluded group is active, skip
    if (rule.exclude && rule.exclude.some((g) => activeGroups.has(g))) continue;

    // Check requires — each require array needs at least one of its groups active
    const satisfied = rule.require.every((reqGroup) =>
      reqGroup.some((g) => activeGroups.has(g))
    );
    if (!satisfied) continue;

    // Score: required matches + boost matches
    let score = rule.require.length * 3;
    if (rule.boost) {
      score += rule.boost.filter((g) => activeGroups.has(g)).length * 2;
    }
    results.push({ code, score });
  }

  // Sort by score, map to CPT entries
  results.sort((a, b) => b.score - a.score);
  const topResults = results.slice(0, 3);

  return topResults
    .map((r) => list.find((c) => c.code === r.code))
    .filter(Boolean);
}

// ── Category metadata ───────────────────────────────────────────────
const CATEGORIES = [
  { id: "all", label: "All Codes" },
  ...CPT_CATEGORIES.map((c) => ({ id: c, label: c })),
];

// ── Vitrectomy Decision Tree ────────────────────────────────────────
const DECISION_TREE = {
  id: "start",
  question: "What is the diagnosis?",
  options: [
    {
      label: "Retinal detachment (RRD)",
      next: {
        id: "rd_approach",
        question: "What is the surgical approach?",
        options: [
          {
            label: "PPV (vitrectomy)",
            next: {
              id: "rd_complex",
              question: "Is this a complex RD?\n(PVR ≥ C1, diabetic traction RD, giant tear >90°, ROP)",
              yes: {
                id: "result_67113",
                result: true,
                code: "67113",
                title: "Complex RD repair with vitrectomy",
                detail: "Includes: vitrectomy, membrane peel, tamponade, cryo, laser, SRF drainage, buckle, lens removal. Highest RVU in RD family. Document complexity (PVR grade, traction, giant tear).",
              },
              no: {
                id: "result_67108",
                result: true,
                code: "67108",
                title: "RD repair with vitrectomy (non-complex)",
                detail: "Includes: laser, cryo, tamponade, SRF drainage, scleral buckle, lens removal. PPV + buckle combined = bill 67108 alone. Use when NO PVR ≥ C1, no traction RD, no giant tear.",
              },
            },
          },
          {
            label: "Scleral buckle",
            next: {
              id: "result_67107",
              result: true,
              code: "67107",
              title: "Scleral buckle repair of RD",
              detail: "Includes: drainage, cryotherapy, photocoagulation. If combined with PPV, bill 67108 only — do NOT bill 67107 + 67108 together (NCCI bundled).",
            },
          },
          {
            label: "Pneumatic retinopexy",
            next: {
              id: "result_67110",
              result: true,
              code: "67110",
              title: "Pneumatic retinopexy",
              detail: "Gas injection for RD. Bundled with 67105 (laser) and 67101 (cryo) same session. AC tap (65800) is NOT bundled — bill separately. Office RVU > facility RVU.",
            },
          },
        ],
      },
    },
    {
      label: "Macular hole (FTMH)",
      next: {
        id: "result_67042_mh",
        result: true,
        code: "67042",
        title: "PPV with ILM peel (macular hole)",
        detail: "Diagnosis: full-thickness macular hole (FTMH). Tamponade (air/gas/oil) is INCLUDED — do NOT separately bill 67025. Dye (ICG/BBG) is included.",
      },
    },
    {
      label: "ERM / macular pucker",
      next: {
        id: "result_67041",
        result: true,
        code: "67041",
        title: "PPV with preretinal membrane peel (ERM)",
        detail: "Diagnosis must be ERM / macular pucker. Even if ILM is also peeled, if primary diagnosis is ERM → use 67041. If diagnosis is macular hole → use 67042 instead.",
      },
    },
    {
      label: "DME (ILM peel)",
      next: {
        id: "result_67042_dme",
        result: true,
        code: "67042",
        title: "PPV with ILM peel (DME)",
        detail: "Diagnosis: diabetic macular edema requiring ILM peel. Same code as macular hole (67042). Tamponade included if performed.",
      },
    },
    {
      label: "PDR / VH needing PRP",
      next: {
        id: "result_67040",
        result: true,
        code: "67040",
        title: "PPV with endolaser PRP",
        detail: "Classic code for PDR + VH: PPV to clear hemorrhage + PRP. Do NOT separately bill 67228. If also peeling membrane, compare RVU with 67041 — bill higher one.",
      },
    },
    {
      label: "Subretinal membrane (CNVM)",
      next: {
        id: "result_67043",
        result: true,
        code: "67043",
        title: "PPV with subretinal membrane removal",
        detail: "Rarely used in modern practice (anti-VEGF has replaced surgical CNVM removal). Tamponade and laser included.",
      },
    },
    {
      label: "Dislocated IOL / aphakia",
      next: {
        id: "iol_what_happened",
        question: "What was done with the IOL?",
        options: [
          {
            label: "IOL removed → new IOL placed (exchange)",
            next: {
              id: "iol_exchange_fixation",
              question: "How was the new IOL fixated?",
              options: [
                {
                  label: "Scleral-fixated (Yamane / Akreos / sutured)",
                  next: {
                    id: "result_66986_sf",
                    result: true,
                    code: "66986",
                    title: "IOL exchange + PPV (scleral-fixated)",
                    detail: "Bill 66986 (IOL exchange) + 67036 (PPV). List 66986 first (higher RVU: 22.87 vs 22.72). For Akreos with Gore-Tex sutures, can add 66682 (suture fixation). For Yamane (sutureless flanged haptic), 66682 is debatable.",
                  },
                },
                {
                  label: "AC-IOL, sulcus, or bag (no scleral fixation)",
                  next: {
                    id: "result_66986_standard",
                    result: true,
                    code: "66986",
                    title: "IOL exchange + PPV (standard placement)",
                    detail: "Bill 66986 (IOL exchange) + 67036 (PPV). List 66986 first (higher RVU: 22.87 vs 22.72). 67121 (removal of implant) is BUNDLED — do not bill separately. No 66682 needed when not scleral-fixated.",
                  },
                },
              ],
            },
          },
          {
            label: "IOL repositioned and sutured in place (not exchanged)",
            next: {
              id: "result_66825",
              result: true,
              code: "66825",
              title: "IOL repositioning + PPV",
              detail: "Bill 66825 (IOL reposition) + 67036 (PPV). The existing IOL is kept — NOT removed and replaced. If the IOL cannot be salvaged and must be exchanged, use 66986 instead.",
            },
          },
          {
            label: "No IOL removed — new IOL placed in aphakic eye",
            next: {
              id: "iol_secondary_fixation",
              question: "How was the IOL fixated?",
              options: [
                {
                  label: "Scleral-fixated (Yamane / Akreos / sutured)",
                  next: {
                    id: "result_66985_sf",
                    result: true,
                    code: "66985",
                    title: "Secondary IOL (scleral-fixated) + PPV",
                    detail: "Bill 66985 (secondary IOL) + 67036 (PPV). For Akreos with Gore-Tex sutures: add 66682. For Yamane (sutureless): 66682 is debatable. AC-IOL also uses 66985.",
                  },
                },
                {
                  label: "AC-IOL, sulcus, or iris-fixated (no scleral fixation)",
                  next: {
                    id: "result_66985_standard",
                    result: true,
                    code: "66985",
                    title: "Secondary IOL (AC-IOL / sulcus) + PPV",
                    detail: "Bill 66985 (secondary IOL implant) + 67036 (PPV). AC-IOL, sulcus, and iris-fixated IOLs all use 66985. No 66682 — scleral suturing was not performed.",
                  },
                },
              ],
            },
          },
          {
            label: "IOL removed, no new IOL placed",
            next: {
              id: "result_67036_iol",
              result: true,
              code: "67036",
              title: "PPV for dislocated IOL (no new IOL placed)",
              detail: "Bill 67036 (base PPV) alone. 67121 (removal of implanted material) is BUNDLED with 67036 — do not bill separately.",
            },
          },
        ],
      },
    },
    {
      label: "Dislocated crystalline lens / cataract",
      next: {
        id: "lens_technique",
        question: "How was the lens removed?",
        options: [
          {
            label: "Pars plana lensectomy (PPL)",
            next: {
              id: "result_66852_tree",
              result: true,
              code: "66852",
              title: "Pars plana lensectomy (bundled with PPV)",
              detail: "66852 is ALWAYS bundled with vitrectomy codes. If PPV + lensectomy + IOL: bill 66986 (IOL exchange) + 67036 (PPV). 66852 is absorbed. If no IOL placed: bill 67036 alone.",
            },
          },
          {
            label: "Phaco (anterior approach)",
            next: {
              id: "result_66850_tree",
              result: true,
              code: "66850",
              title: "Phacofragmentation of dislocated lens",
              detail: "Use for dislocated lens removed via phaco technique. Bundled with vitrectomy codes — if PPV is also performed, 67036 absorbs the lensectomy.",
            },
          },
        ],
      },
    },
    {
      label: "VH / floaters / RLF / endophthalmitis",
      next: {
        id: "base_ppv_laser",
        question: "Is endolaser being performed during the PPV?",
        options: [
          {
            label: "No endolaser",
            next: {
              id: "result_67036",
              result: true,
              code: "67036",
              title: "PPV — base vitrectomy",
              detail: "Use when: NO membrane peel, NO endolaser, and diagnosis is NOT retinal detachment. Common indications: VH, floaters, dislocated IOL, retained lens fragments, endophthalmitis, VMT.",
            },
          },
          {
            label: "Focal endolaser",
            next: {
              id: "result_67039",
              result: true,
              code: "67039",
              title: "PPV with focal endolaser",
              detail: "Non-RD diagnosis requiring PPV + focal laser (e.g., VH with focal laser for bleeding source). Do NOT separately bill 67210.",
            },
          },
          {
            label: "PRP endolaser",
            next: {
              id: "result_67040_vh",
              result: true,
              code: "67040",
              title: "PPV with endolaser PRP",
              detail: "PPV to clear hemorrhage + PRP. Do NOT separately bill 67228.",
            },
          },
        ],
      },
    },
    {
      label: "Submacular hemorrhage / VMT",
      next: {
        id: "submacular_approach",
        question: "What was the surgical approach?",
        options: [
          {
            label: "PPV + subretinal tPA injection",
            next: {
              id: "result_0810T",
              result: true,
              code: "0810T",
              title: "Subretinal injection with vitrectomy (0810T)",
              detail: "Category III code (eff. 7/1/2023). Includes PPV, retinotomy, subretinal tPA injection, fluid-air exchange, and gas tamponade — all bundled. Do NOT separately bill 67036, 67028, or 67025. Bill J2997 (alteplase) for drug supply — check payer policy for reimbursement.",
            },
          },
          {
            label: "Pneumatic displacement only (no PPV)",
            next: {
              id: "result_67025_pneumatic",
              result: true,
              code: "67025",
              title: "Pneumatic displacement (67025 + 65800)",
              detail: "For submacular hemorrhage displacement or VMT without PPV: bill 67025 (injection of vitreous substitute) + 65800 (paracentesis of anterior chamber). These are NOT bundled — bill both. If diagnosis is retinal detachment, use 67110 instead.",
            },
          },
        ],
      },
    },
    {
      label: "Implant / material removal",
      next: {
        id: "implant_type",
        question: "What is being removed?",
        options: [
          {
            label: "Silicone oil (intraocular)",
            next: {
              id: "result_67121_tree",
              result: true,
              code: "67121",
              title: "Silicone oil removal (intraocular)",
              detail: "BUNDLED with all vitrectomy codes. If PPV is performed during oil removal, bill 67036 only — do NOT add 67121. Only bill 67121 as standalone when NO vitrectomy is done.",
            },
          },
          {
            label: "Scleral buckle (extraocular)",
            next: {
              id: "result_67120_tree",
              result: true,
              code: "67120",
              title: "Scleral buckle removal (extraocular)",
              detail: "Removal of scleral buckle material (band, sponge, tire). Common indications: infection, extrusion, diplopia, discomfort. Distinct from 67121 (intraocular removal).",
            },
          },
        ],
      },
    },
  ],
};

function DecisionTreeView() {
  const [path, setPath] = useState([DECISION_TREE]);
  const current = path[path.length - 1];

  const reset = () => setPath([DECISION_TREE]);
  const goBack = () => {
    if (path.length > 1) setPath(path.slice(0, -1));
  };
  const advance = (next) => setPath([...path, next]);

  if (current.result) {
    const cptEntry = CPT_DB.find((c) => c.code === current.code);
    return (
      <div style={{ padding: "20px", maxWidth: 700, margin: "0 auto" }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {path.slice(0, -1).map((step, i) => (
            <span key={i} style={{ fontSize: "0.7rem", color: S.muted, fontFamily: S.mono }}>
              {step.question ? step.question.split("\n")[0].slice(0, 30) + "..." : ""} →
            </span>
          ))}
        </div>

        {/* Result card */}
        <div style={{
          background: "linear-gradient(135deg, #064e3b, #065f46)",
          border: `1px solid #10b981`,
          borderRadius: 14,
          padding: "24px",
        }}>
          <div style={{ fontSize: "0.75rem", color: "#6ee7b7", fontFamily: S.mono, marginBottom: 6 }}>
            ✓ RECOMMENDED CODE
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: "1.8rem", fontWeight: 800, color: "#ecfdf5" }}>{current.code}</span>
          </div>
          <div style={{ fontSize: "1rem", fontWeight: 600, color: "#d1fae5", marginBottom: 12 }}>
            {current.title}
          </div>
          <div style={{ fontSize: "0.85rem", color: "#a7f3d0", lineHeight: 1.5 }}>
            {current.detail}
          </div>
          {cptEntry && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #10b98144" }}>
              <div style={{ fontSize: "0.75rem", color: "#6ee7b7", fontFamily: S.mono, marginBottom: 4 }}>MODIFIERS</div>
              <div style={{ fontSize: "0.82rem", color: "#d1fae5" }}>{cptEntry.modifiers}</div>
              <div style={{ fontSize: "0.75rem", color: "#6ee7b7", fontFamily: S.mono, marginBottom: 4, marginTop: 12 }}>GLOBAL PERIOD</div>
              <div style={{ fontSize: "0.82rem", color: "#d1fae5" }}>{cptEntry.global}</div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={goBack} style={{
            padding: "10px 18px", borderRadius: 8, border: `1px solid ${S.border}`,
            background: S.card, color: S.text, fontFamily: S.font, cursor: "pointer", fontSize: "0.85rem",
          }}>← Back</button>
          <button onClick={reset} style={{
            padding: "10px 18px", borderRadius: 8, border: `1px solid ${S.accent}`,
            background: S.accent + "22", color: S.accentLight, fontFamily: S.font, cursor: "pointer", fontSize: "0.85rem",
          }}>Start Over</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: 700, margin: "0 auto" }}>
      {/* Progress indicator */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {path.map((_, i) => (
          <div key={i} style={{
            width: 24, height: 4, borderRadius: 2,
            background: i === path.length - 1 ? S.accent : S.accent + "44",
          }} />
        ))}
      </div>

      {/* Question */}
      <div style={{
        background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: "24px",
      }}>
        <div style={{ fontSize: "0.72rem", color: S.accent, fontFamily: S.mono, marginBottom: 8 }}>
          STEP {path.length}
        </div>
        <div style={{ fontSize: "1.15rem", fontWeight: 600, color: S.bright, lineHeight: 1.4, whiteSpace: "pre-line" }}>
          {current.question}
        </div>
      </div>

      {/* Answer buttons */}
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {current.options ? (
          current.options.map((opt, i) => (
            <button key={i} onClick={() => advance(opt.next)} style={{
              padding: "14px 20px", borderRadius: 10, border: `1px solid ${S.border}`,
              background: S.card, color: S.bright, fontFamily: S.font, cursor: "pointer",
              fontSize: "0.95rem", textAlign: "left", transition: "border-color 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = S.accent}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = S.border}
            >
              {opt.label}
            </button>
          ))
        ) : (
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => advance(current.yes)} style={{
              flex: 1, padding: "14px 20px", borderRadius: 10, border: `1px solid #10b981`,
              background: "#064e3b", color: "#d1fae5", fontFamily: S.font, cursor: "pointer",
              fontSize: "1rem", fontWeight: 600,
            }}>Yes</button>
            <button onClick={() => advance(current.no)} style={{
              flex: 1, padding: "14px 20px", borderRadius: 10, border: `1px solid ${S.border}`,
              background: S.card, color: S.text, fontFamily: S.font, cursor: "pointer",
              fontSize: "1rem", fontWeight: 600,
            }}>No</button>
          </div>
        )}
      </div>

      {/* Back button */}
      {path.length > 1 && (
        <button onClick={goBack} style={{
          marginTop: 14, padding: "8px 16px", borderRadius: 8, border: "none",
          background: "transparent", color: S.muted, fontFamily: S.font, cursor: "pointer", fontSize: "0.82rem",
        }}>← Back to previous question</button>
      )}
    </div>
  );
}

// ── Visual Decision Tree Diagram ────────────────────────────────────
function TreeDiagram() {
  const col = { display: "flex", flexDirection: "column", alignItems: "center", gap: 6 };
  const row = { display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", alignItems: "flex-start" };
  const connector = { width: 2, height: 14, background: "#334155", margin: "0 auto" };

  // Diagnosis card: big prominent diagnosis label on top, code underneath
  const diagCard = (diagnosis, code, codeDesc, color, extra) => (
    <div style={{
      background: S.card, border: `2px solid ${color}`, borderRadius: 12,
      padding: "14px 16px", minWidth: 130, maxWidth: 170, textAlign: "center",
    }}>
      <div style={{
        fontSize: "0.82rem", fontWeight: 700, color, lineHeight: 1.3,
        marginBottom: 8, fontFamily: S.font,
      }}>{diagnosis}</div>
      <div style={{
        background: color + "18", borderRadius: 8, padding: "8px 10px",
      }}>
        <div style={{ fontWeight: 800, fontSize: "1.1rem", color: S.bright, fontFamily: S.mono }}>{code}</div>
        <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: 2 }}>{codeDesc}</div>
      </div>
      {extra && <div style={{ fontSize: "0.65rem", color: "#94a3b8", marginTop: 6, lineHeight: 1.3 }}>{extra}</div>}
    </div>
  );

  const questionBox = (text) => (
    <div style={{
      padding: "8px 14px", borderRadius: 10, border: "2px solid #3b82f6",
      background: "#1e3a5f", fontSize: "0.78rem", color: S.bright, textAlign: "center",
      fontFamily: S.font, lineHeight: 1.35,
    }}>{text}</div>
  );

  const label = (text, color) => (
    <div style={{ fontSize: "0.7rem", fontWeight: 600, color: color || "#94a3b8", fontFamily: S.mono, textAlign: "center" }}>{text}</div>
  );

  return (
    <div style={{ padding: "20px", maxWidth: 980, margin: "0 auto", overflowX: "auto" }}>
      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: S.bright, marginBottom: 6, textAlign: "center" }}>
        Retina Surgery CPT Code Reference
      </div>
      <div style={{ fontSize: "0.75rem", color: S.muted, textAlign: "center", marginBottom: 28, fontFamily: S.mono }}>
        Diagnosis determines the code — not the surgical technique
      </div>

      {/* Main grid: diagnosis → code */}
      <div style={{ ...row, gap: 12, marginBottom: 24 }}>

        {/* RD */}
        <div style={col}>
          <div style={{
            background: S.card, border: "2px solid #ef4444", borderRadius: 12,
            padding: "14px 16px", minWidth: 260, textAlign: "center",
          }}>
            <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#ef4444", marginBottom: 10 }}>
              Retinal Detachment
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <div style={col}>
                <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontFamily: S.mono, marginBottom: 4 }}>PPV — Complex</div>
                <div style={{ background: "#ef444418", borderRadius: 8, padding: "6px 12px" }}>
                  <div style={{ fontWeight: 800, fontSize: "1rem", color: S.bright, fontFamily: S.mono }}>67113</div>
                </div>
                <div style={{ fontSize: "0.6rem", color: "#94a3b8", marginTop: 2 }}>PVR≥C1, traction, giant tear</div>
              </div>
              <div style={col}>
                <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontFamily: S.mono, marginBottom: 4 }}>PPV — Standard</div>
                <div style={{ background: "#3b82f618", borderRadius: 8, padding: "6px 12px" }}>
                  <div style={{ fontWeight: 800, fontSize: "1rem", color: S.bright, fontFamily: S.mono }}>67108</div>
                </div>
                <div style={{ fontSize: "0.6rem", color: "#94a3b8", marginTop: 2 }}>Incl. buckle if combined</div>
              </div>
              <div style={col}>
                <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontFamily: S.mono, marginBottom: 4 }}>Buckle only</div>
                <div style={{ background: "#8b5cf618", borderRadius: 8, padding: "6px 12px" }}>
                  <div style={{ fontWeight: 800, fontSize: "1rem", color: S.bright, fontFamily: S.mono }}>67107</div>
                </div>
                <div style={{ fontSize: "0.6rem", color: "#94a3b8", marginTop: 2 }}>Cryo included</div>
              </div>
              <div style={col}>
                <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontFamily: S.mono, marginBottom: 4 }}>Pneumatic</div>
                <div style={{ background: "#06b6d418", borderRadius: 8, padding: "6px 12px" }}>
                  <div style={{ fontWeight: 800, fontSize: "1rem", color: S.bright, fontFamily: S.mono }}>67110</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ILM Peel — any indication */}
        {diagCard("ILM Peel\n(any indication)", "67042", "PPV + ILM peel", "#f59e0b", "Mac hole, DME, VMT, etc.\nTamponade included")}

        {/* ERM */}
        {diagCard("ERM /\nMacular Pucker", "67041", "PPV + ERM peel", "#f97316", "If ERM + ILM peeled together:\n67041 & 67042 bundled — bill one")}

        {/* PDR + VH */}
        {diagCard("PDR + VH\n(needs PRP)", "67040", "PPV + endo PRP", "#10b981", "PRP included in code")}

        {/* Subretinal */}
        {diagCard("Subretinal\nMembrane", "67043", "PPV + subretinal", "#a855f7", "Tamponade & laser incl.")}

      </div>

      {/* Second row */}
      <div style={{ ...row, gap: 12, marginBottom: 24 }}>

        {/* Dislocated IOL */}
        <div style={{
          background: S.card, border: "2px solid #ec4899", borderRadius: 12,
          padding: "14px 16px", minWidth: 240, textAlign: "center",
        }}>
          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#ec4899", marginBottom: 10 }}>
            Dislocated IOL / Aphakia
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <div style={col}>
              <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontFamily: S.mono, marginBottom: 4 }}>IOL Exchange</div>
              <div style={{ background: "#ec489918", borderRadius: 8, padding: "6px 12px" }}>
                <div style={{ fontWeight: 800, fontSize: "1rem", color: S.bright, fontFamily: S.mono }}>66986</div>
              </div>
              <div style={{ fontSize: "0.6rem", color: "#94a3b8", marginTop: 2 }}>+ 67036 (PPV)</div>
            </div>
            <div style={col}>
              <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontFamily: S.mono, marginBottom: 4 }}>IOL Reposition</div>
              <div style={{ background: "#f472b618", borderRadius: 8, padding: "6px 12px" }}>
                <div style={{ fontWeight: 800, fontSize: "1rem", color: S.bright, fontFamily: S.mono }}>66825</div>
              </div>
              <div style={{ fontSize: "0.6rem", color: "#94a3b8", marginTop: 2 }}>+ 67036 (PPV)</div>
            </div>
            <div style={col}>
              <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontFamily: S.mono, marginBottom: 4 }}>Secondary IOL</div>
              <div style={{ background: "#d946ef18", borderRadius: 8, padding: "6px 12px" }}>
                <div style={{ fontWeight: 800, fontSize: "1rem", color: S.bright, fontFamily: S.mono }}>66985</div>
              </div>
              <div style={{ fontSize: "0.6rem", color: "#94a3b8", marginTop: 2 }}>+ 67036 (PPV)</div>
            </div>
            <div style={col}>
              <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontFamily: S.mono, marginBottom: 4 }}>No new IOL</div>
              <div style={{ background: "#64748b18", borderRadius: 8, padding: "6px 12px" }}>
                <div style={{ fontWeight: 800, fontSize: "1rem", color: S.bright, fontFamily: S.mono }}>67036</div>
              </div>
              <div style={{ fontSize: "0.6rem", color: "#94a3b8", marginTop: 2 }}>PPV alone</div>
            </div>
          </div>
          <div style={{ fontSize: "0.62rem", color: "#94a3b8", marginTop: 8 }}>Scleral-fixated (Akreos): + 66682 · Yamane: 66682 debatable</div>
        </div>

        {/* VH / Floaters / Other */}
        <div style={{
          background: S.card, border: "2px solid #64748b", borderRadius: 12,
          padding: "14px 16px", minWidth: 200, textAlign: "center",
        }}>
          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#94a3b8", marginBottom: 10 }}>
            VH / Floaters / RLF / Other
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <div style={col}>
              <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontFamily: S.mono, marginBottom: 4 }}>No laser</div>
              <div style={{ background: "#64748b18", borderRadius: 8, padding: "6px 12px" }}>
                <div style={{ fontWeight: 800, fontSize: "1rem", color: S.bright, fontFamily: S.mono }}>67036</div>
              </div>
              <div style={{ fontSize: "0.6rem", color: "#94a3b8", marginTop: 2 }}>Base PPV</div>
            </div>
            <div style={col}>
              <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontFamily: S.mono, marginBottom: 4 }}>+ Focal laser</div>
              <div style={{ background: "#14b8a618", borderRadius: 8, padding: "6px 12px" }}>
                <div style={{ fontWeight: 800, fontSize: "1rem", color: S.bright, fontFamily: S.mono }}>67039</div>
              </div>
            </div>
          </div>
          <div style={{ fontSize: "0.62rem", color: "#94a3b8", marginTop: 8 }}>Endophthalmitis, VMT, vitreous opacities</div>
        </div>

        {/* Endophthalmitis tap */}
        {diagCard("Endophthalmitis\n(tap & inject only)", "67015", "Vitreous tap", "#f87171", "67028 bundled into 67015")}

      </div>

      {/* Third row: pneumatic, implant removal, laser */}
      <div style={{ ...row, gap: 12, marginBottom: 24 }}>

        {/* Submacular hemorrhage / pneumatic */}
        <div style={{
          background: S.card, border: "2px solid #06b6d4", borderRadius: 12,
          padding: "14px 16px", minWidth: 280, textAlign: "center",
        }}>
          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#06b6d4", marginBottom: 10 }}>
            Submacular Hemorrhage / Pneumatic
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <div style={col}>
              <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontFamily: S.mono, marginBottom: 4 }}>PPV + subretinal tPA</div>
              <div style={{ background: "#0891b218", borderRadius: 8, padding: "6px 12px" }}>
                <div style={{ fontWeight: 800, fontSize: "1rem", color: S.bright, fontFamily: S.mono }}>0810T</div>
              </div>
              <div style={{ fontSize: "0.6rem", color: "#94a3b8", marginTop: 2 }}>All-inclusive (Cat III)</div>
            </div>
            <div style={col}>
              <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontFamily: S.mono, marginBottom: 4 }}>Pneumatic (no PPV)</div>
              <div style={{ background: "#06b6d418", borderRadius: 8, padding: "6px 12px" }}>
                <div style={{ fontWeight: 800, fontSize: "1rem", color: S.bright, fontFamily: S.mono }}>67025</div>
                <div style={{ fontWeight: 800, fontSize: "0.85rem", color: S.bright, fontFamily: S.mono }}>+ 65800</div>
              </div>
              <div style={{ fontSize: "0.6rem", color: "#94a3b8", marginTop: 2 }}>Gas inject + AC tap</div>
            </div>
            <div style={col}>
              <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontFamily: S.mono, marginBottom: 4 }}>RD (pneumatic)</div>
              <div style={{ background: "#06b6d418", borderRadius: 8, padding: "6px 12px" }}>
                <div style={{ fontWeight: 800, fontSize: "1rem", color: S.bright, fontFamily: S.mono }}>67110</div>
              </div>
              <div style={{ fontSize: "0.6rem", color: "#94a3b8", marginTop: 2 }}>Pneumatic retinopexy</div>
            </div>
          </div>
          <div style={{ fontSize: "0.62rem", color: "#94a3b8", marginTop: 8 }}>0810T: + J2997 (alteplase) for drug supply</div>
        </div>

        {/* Implant removal */}
        <div style={{
          background: S.card, border: "2px solid #78716c", borderRadius: 12,
          padding: "14px 16px", minWidth: 200, textAlign: "center",
        }}>
          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#a8a29e", marginBottom: 10 }}>
            Implant / Material Removal
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <div style={col}>
              <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontFamily: S.mono, marginBottom: 4 }}>Oil (intraocular)</div>
              <div style={{ background: "#78716c18", borderRadius: 8, padding: "6px 12px" }}>
                <div style={{ fontWeight: 800, fontSize: "1rem", color: S.bright, fontFamily: S.mono }}>67121</div>
              </div>
              <div style={{ fontSize: "0.6rem", color: "#94a3b8", marginTop: 2 }}>Bundled w/ PPV → 67036</div>
            </div>
            <div style={col}>
              <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontFamily: S.mono, marginBottom: 4 }}>Buckle (extraocular)</div>
              <div style={{ background: "#78716c18", borderRadius: 8, padding: "6px 12px" }}>
                <div style={{ fontWeight: 800, fontSize: "1rem", color: S.bright, fontFamily: S.mono }}>67120</div>
              </div>
              <div style={{ fontSize: "0.6rem", color: "#94a3b8", marginTop: 2 }}>Standalone</div>
            </div>
          </div>
        </div>

        {/* Dislocated lens */}
        {diagCard("Dislocated Lens\n(crystalline)", "66852", "PPL (pars plana)", "#d97706", "Bundled w/ PPV → bill 67036\nPhaco approach → 66850")}

      </div>

      {/* Key notes */}
      <div style={{
        marginTop: 8, padding: "14px 18px", background: S.card, border: `1px solid ${S.border}`,
        borderRadius: 10, fontSize: "0.78rem", color: S.text, lineHeight: 1.5,
      }}>
        <div style={{ fontWeight: 700, color: S.bright, marginBottom: 6, fontSize: "0.8rem" }}>Key Rules</div>
        <div style={{ marginBottom: 4 }}>All vitrectomy codes (67036–67043) are <span style={{ color: "#eab308", fontWeight: 600 }}>bundled under NCCI</span> — bill only ONE per eye per session.</div>
        <div style={{ marginBottom: 4 }}>Tamponade (gas/oil) is <span style={{ color: "#22c55e", fontWeight: 600 }}>included</span> in 67042, 67043, 67108, and 67113.</div>
        <div style={{ marginBottom: 4 }}><span style={{ color: "#a855f7", fontWeight: 600 }}>PPV + scleral buckle</span> = 67108 alone (buckle is included). Do NOT bill 67107 separately.</div>
        <div style={{ marginBottom: 4 }}><span style={{ color: "#ec4899", fontWeight: 600 }}>Cryo</span> is bundled into 67107, 67108, and 67113 — never separately billable with these.</div>
        <div style={{ marginBottom: 4 }}><span style={{ color: "#f97316", fontWeight: 600 }}>ERM + ILM peel</span> together: 67041 & 67042 are bundled — bill the one matching the primary indication.</div>
        <div>If multiple vitrectomy techniques are performed same eye, bill the code with the <span style={{ color: "#6366f1", fontWeight: 600 }}>highest RVU</span>.</div>
      </div>
    </div>
  );
}

// ── AI Coding Assistant ─────────────────────────────────────────────
const AI_API_BASE = import.meta.env.VITE_API_BASE || "https://op-note-dictator-server-production.up.railway.app";

export function AICodingAssistant({ showReimbursement = false }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = { current: null };

  const scrollToBottom = () => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${AI_API_BASE}/api/cpt-assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated, showReimbursement }),
      });
      const data = await res.json();
      if (data.success && data.reply) {
        setMessages([...updated, { role: "assistant", content: data.reply }]);
      } else {
        setMessages([...updated, { role: "assistant", content: "Sorry, something went wrong. Try again." }]);
      }
    } catch (e) {
      setMessages([...updated, { role: "assistant", content: "Network error — check your connection." }]);
    }
    setLoading(false);
    setTimeout(scrollToBottom, 100);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setInput("");
  };

  // Simple markdown-ish rendering: bold (**text**), line breaks, bullet points
  const renderContent = (text) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      // Bold
      let rendered = line.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#f1f5f9">$1</strong>');
      // Bullet points
      const isBullet = /^\s*[-•]\s/.test(line);
      if (isBullet) {
        rendered = rendered.replace(/^\s*[-•]\s*/, "");
        return (
          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 3, paddingLeft: 8 }}>
            <span style={{ color: S.accent, flexShrink: 0 }}>•</span>
            <span dangerouslySetInnerHTML={{ __html: rendered }} />
          </div>
        );
      }
      if (line.trim() === "") return <div key={i} style={{ height: 8 }} />;
      return <div key={i} style={{ marginBottom: 3 }} dangerouslySetInnerHTML={{ __html: rendered }} />;
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 70px)", maxWidth: 800, margin: "0 auto" }}>
      {/* Chat messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", marginTop: 60, color: S.muted }}>
            <div style={{ fontSize: "1.3rem", marginBottom: 12, color: S.accentLight }}>AI Coding Assistant</div>
            <div style={{ fontSize: "0.85rem", lineHeight: 1.6, maxWidth: 500, margin: "0 auto" }}>
              Ask any retina billing question — CPT codes, ICD-10 pairing, modifiers, bundling, E/M, global periods.
            </div>
            <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {[
                "PPV ILM peel gas for mac hole",
                "Can I bill E/M with injection?",
                "PPV + buckle for macula-off RD",
                "How do I code Yamane?",
                "67041 vs 67042 — when to use each?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  style={{
                    padding: "8px 14px", borderRadius: 20, border: `1px solid ${S.border}`,
                    background: S.card, color: S.text, fontSize: "0.75rem", cursor: "pointer",
                    fontFamily: S.font, transition: "border-color 0.2s",
                  }}
                  onMouseOver={(e) => e.target.style.borderColor = S.accent}
                  onMouseOut={(e) => e.target.style.borderColor = S.border}
                >{q}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              marginBottom: 12,
            }}
          >
            <div style={{
              maxWidth: "85%",
              padding: "10px 14px",
              borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: msg.role === "user" ? S.accent : S.card,
              color: msg.role === "user" ? "#fff" : S.text,
              fontSize: "0.85rem",
              lineHeight: 1.5,
              fontFamily: S.font,
              border: msg.role === "user" ? "none" : `1px solid ${S.border}`,
            }}>
              {msg.role === "user" ? msg.content : renderContent(msg.content)}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
            <div style={{
              padding: "10px 14px", borderRadius: "16px 16px 16px 4px",
              background: S.card, border: `1px solid ${S.border}`,
              fontSize: "0.85rem", color: S.muted,
            }}>
              Thinking...
            </div>
          </div>
        )}

        <div ref={(el) => { chatEndRef.current = el; }} />
      </div>

      {/* Input area */}
      <div style={{
        padding: "12px 20px 16px", borderTop: `1px solid ${S.border}`,
        display: "flex", gap: 8, alignItems: "flex-end",
      }}>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            style={{
              background: "none", border: `1px solid ${S.border}`, borderRadius: 8,
              color: S.muted, cursor: "pointer", padding: "10px", fontSize: "0.75rem",
              fontFamily: S.font, flexShrink: 0,
            }}
            title="Clear chat"
          >Clear</button>
        )}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your case or ask a billing question..."
          rows={1}
          style={{
            flex: 1, padding: "10px 14px", background: S.card, border: `1px solid ${S.border}`,
            borderRadius: 12, color: S.bright, fontSize: "0.9rem", fontFamily: S.font,
            outline: "none", resize: "none", lineHeight: 1.4,
            minHeight: 42, maxHeight: 120,
          }}
          onInput={(e) => {
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
          }}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{
            padding: "10px 18px", borderRadius: 12, border: "none",
            background: loading || !input.trim() ? S.border : S.accent,
            color: "#fff", cursor: loading || !input.trim() ? "default" : "pointer",
            fontSize: "0.85rem", fontWeight: 600, fontFamily: S.font, flexShrink: 0,
          }}
        >Send</button>
      </div>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────
export default function CptReference({ onBack }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [view, setView] = useState("search"); // "search" | "tree" | "diagram" | "ai"

  const filtered = useMemo(() => {
    let list = CPT_CATALOG;
    if (category !== "all") {
      list = list.filter((c) => c.cat === category);
    }
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter((c) =>
        `${c.code} ${c.desc} ${c.note}`.toLowerCase().includes(q)
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
        <div style={{ fontSize: "1.15rem", fontWeight: 700, color: S.bright }}>Retina Surgery CPT Reference</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 3, background: S.bg, borderRadius: 8, padding: 3 }}>
          {[
            { id: "ai", label: "AI Coding Assistant", bg: "#8b5cf6" },
            { id: "search", label: "Search", bg: S.accent },
            { id: "tree", label: "Guided", bg: "#10b981" },
            { id: "diagram", label: "Diagram", bg: "#f59e0b" },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              style={{
                padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: "0.73rem",
                fontFamily: S.font, fontWeight: 600,
                background: view === v.id ? v.bg : "transparent",
                color: view === v.id ? "#fff" : S.muted,
              }}
            >{v.label}</button>
          ))}
        </div>
      </div>

      {view === "ai" && <AICodingAssistant showReimbursement={false} />}
      {view === "tree" && <DecisionTreeView />}
      {view === "diagram" && <TreeDiagram />}

      {view === "search" && <>
      {/* Search */}
      <div style={{ padding: "16px 20px 8px", maxWidth: 800, margin: "0 auto" }}>
        <input
          type="text"
          placeholder="Search by code, name, or keyword — e.g. 67042, ILM peel, injection, OCT"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "14px 18px",
            background: S.card,
            border: `1px solid ${S.border}`,
            borderRadius: 12,
            color: S.bright,
            fontSize: "1.05rem",
            fontFamily: S.font,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <div style={{ fontSize: "0.72rem", color: S.muted, marginTop: 6, fontFamily: S.mono }}>
          Search any retina code by number, description, or note — or browse by category below.
        </div>
      </div>

      {/* Category pills */}
      <div style={{ padding: "8px 20px 12px", display: "flex", flexWrap: "wrap", gap: 6, maxWidth: 800, margin: "0 auto" }}>
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
                      {cpt.cat}
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
                  {cpt.global && (
                    <DetailSection label="Global Period" text={
                      cpt.global === "XXX" ? "N/A — global concept does not apply" :
                      cpt.global === "ZZZ" ? "Add-on code (no separate global)" :
                      cpt.global === "YYY" ? "Carrier-determined" :
                      cpt.global + "-day global"
                    } />
                  )}
                  {cpt.note && (
                    <DetailSection label="Notes" text={cpt.note} color="#eab308" />
                  )}
                  {!cpt.note && !cpt.global && (
                    <div style={{ fontSize: "0.8rem", color: S.muted, marginTop: 12 }}>
                      No additional notes. Ask the AI Coding Assistant for bundling, modifiers, or reimbursement.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      </>}
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

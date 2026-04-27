import { useState, useMemo, useEffect, useRef, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://op-note-dictator-server-production.up.railway.app";

/* ── Procedure list ───────────────────────────────────────────── */
const PROCEDURES = [
  { id: "ppv_erm", label: "PPV for ERM Peel" },
  { id: "ppv_mh", label: "PPV for Macular Hole" },
  { id: "ppv_rd", label: "PPV for Primary RD" },
  { id: "ppv_complex_rd", label: "PPV for Complex RD / PVR / TRD" },
  { id: "buckle_ppv", label: "Scleral Buckle + PPV" },
  { id: "ppv_vh", label: "PPV for VH / Floaters" },
  { id: "ppv_iol", label: "PPV + IOL Exchange (AC-IOL)" },
];

/* ── Fields ───────────────────────────────────────────────────── */
const COMMON_FIELDS = [
  { id: "patientName", label: "Patient Name", type: "text", placeholder: "Last, First" },
  { id: "mrn", label: "MRN", type: "text", placeholder: "Medical record number" },
  { id: "dob", label: "Date of Birth", type: "text", placeholder: "MM/DD/YYYY" },
  { id: "dos", label: "Date of Surgery", type: "text", placeholder: "MM/DD/YYYY" },
  { id: "laterality", label: "Laterality", type: "select", options: ["right", "left"] },
  { id: "anesthesia", label: "Anesthesia", type: "select", options: ["MAC with retrobulbar block", "MAC with peribulbar block", "General anesthesia"] },
  { id: "vitreousHighlight", label: "Vitreous Highlight", type: "select", options: ["Triescence", "Kenalog"] },
  { id: "complications", label: "Complications", type: "textarea", placeholder: "None — or describe complications" },
];

const PROCEDURE_FIELDS = {
  ppv_erm: [
    { id: "pvd", label: "PVD Status", type: "select", options: ["had naturally occurred", "was created by gentle aspiration over the optic nerve", "previously vitrectomized"] },
    { id: "stainingDye", label: "Staining Dye", type: "select", options: ["Indocyanine green", "Brilliant blue"] },
    { id: "tissueRemoved", label: "Tissue Removed", type: "select", options: ["ILM and ERM", "ILM only", "ERM only"] },
    { id: "performFax", label: "Fluid-Air Exchange", type: "select", options: ["yes", "no"] },
    { id: "tamponade", label: "Tamponade (if FAX)", type: "select", options: ["14% C3F8", "20% SF6", "none"] },
    { id: "peripheralFinding", label: "Peripheral Finding", type: "select", options: ["none", "hole", "tear", "lattice degeneration", "other"] },
    { id: "peripheralDetail", label: "Finding Location/Detail", type: "text", placeholder: "e.g., at 6 o'clock, superotemporal" },
    { id: "performLaser", label: "Endolaser", type: "select", options: ["no", "yes"] },
    { id: "faceDown", label: "Face-Down Positioning", type: "select", options: ["no", "yes"] },
  ],
  ppv_mh: [
    { id: "pvd", label: "PVD Status", type: "select", options: ["had naturally occurred", "was created by gentle aspiration over the optic nerve", "previously vitrectomized"] },
    { id: "stainingDye", label: "Staining Dye", type: "select", options: ["Brilliant blue", "Indocyanine green"] },
    { id: "tamponade", label: "Tamponade", type: "select", options: ["20% SF6", "14% C3F8"] },
    { id: "peripheralFinding", label: "Peripheral Finding", type: "select", options: ["none", "hole", "tear", "lattice degeneration", "other"] },
    { id: "peripheralDetail", label: "Finding Location/Detail", type: "text", placeholder: "e.g., at 6 o'clock, superotemporal" },
    { id: "performLaser", label: "Endolaser", type: "select", options: ["no", "yes"] },
  ],
  ppv_rd: [
    { id: "breakDescription", label: "Breaks Identified", type: "text", placeholder: "e.g., horseshoe tear at 11 o'clock, round hole at 6 o'clock" },
    { id: "rdClockHours", label: "RD Clock-Hours", type: "text", placeholder: "e.g., 10 to 2 o'clock, total/macula-off" },
    { id: "pvd", label: "PVD Status", type: "select", options: ["had naturally occurred", "was created by gentle aspiration over the optic nerve", "previously vitrectomized"] },
    { id: "drainageRetinotomy", label: "Drainage Retinotomy", type: "select", options: ["no", "yes"] },
    { id: "usePfcl", label: "Perfluorocarbon (PFCL)", type: "select", options: ["no", "yes"] },
    { id: "tamponade", label: "Tamponade", type: "select", options: ["14% C3F8", "20% SF6"] },
    { id: "additionalLaser", label: "Additional Laser Locations", type: "text", placeholder: "e.g., 360 degrees to the ora serrata" },
    { id: "faceDown", label: "Face-Down Positioning", type: "select", options: ["yes", "no"] },
  ],
  ppv_complex_rd: [
    { id: "rdType", label: "Detachment Type", type: "select", options: ["PVR", "TRD", "Complex RRD"] },
    { id: "breakDescription", label: "Breaks Identified", type: "text", placeholder: "e.g., horseshoe tear at 11 o'clock, round hole at 6 o'clock" },
    { id: "rdClockHours", label: "RD Clock-Hours", type: "text", placeholder: "e.g., 10 to 2 o'clock, total/macula-off" },
    { id: "pvd", label: "PVD Status", type: "select", options: ["had naturally occurred", "was created by gentle aspiration over the optic nerve", "previously vitrectomized"] },
    { id: "drainageRetinotomy", label: "Drainage Retinotomy", type: "select", options: ["no", "yes"] },
    { id: "stainingDye", label: "Staining Dye (if membrane peel)", type: "select", options: ["Indocyanine green", "Brilliant blue"] },
    { id: "membranePeel", label: "Membrane Dissection", type: "select", options: ["yes", "no"] },
    { id: "usePfcl", label: "Perfluorocarbon (PFCL)", type: "select", options: ["yes", "no"] },
    { id: "relaxingRetinotomy", label: "Relaxing Retinotomy", type: "select", options: ["no", "yes"] },
    { id: "tamponade", label: "Tamponade", type: "select", options: ["14% C3F8", "20% SF6", "silicone oil 1000 cs", "silicone oil 5000 cs"] },
    { id: "additionalLaser", label: "Additional Laser Locations", type: "text", placeholder: "e.g., 360 degrees" },
    { id: "faceDown", label: "Face-Down Positioning", type: "select", options: ["yes", "no"] },
  ],
  buckle_ppv: [
    { id: "buckleType", label: "Buckle Type", type: "select", options: ["41/70 band and tire", "41 band", "70 tire"] },
    { id: "pvd", label: "PVD Status", type: "select", options: ["had naturally occurred", "was created by gentle aspiration over the optic nerve", "previously vitrectomized"] },
    { id: "usePfcl", label: "Perfluorocarbon (PFCL)", type: "select", options: ["no", "yes"] },
    { id: "tamponade", label: "Tamponade", type: "select", options: ["14% C3F8", "20% SF6"] },
    { id: "additionalLaser", label: "Additional Laser Locations", type: "text", placeholder: "e.g., 360 degrees" },
  ],
  ppv_vh: [
    { id: "indication", label: "Indication", type: "select", options: ["vitreous hemorrhage", "vitreous floaters"] },
    { id: "pvd", label: "PVD Status", type: "select", options: ["had naturally occurred", "was created by gentle aspiration over the optic nerve", "previously vitrectomized"] },
    { id: "performFax", label: "Fluid-Air Exchange", type: "select", options: ["no", "yes"] },
    { id: "breakFound", label: "Break Found", type: "select", options: ["no", "yes - endolaser applied"] },
    { id: "laserLocation", label: "Laser Location (if break)", type: "text", placeholder: "e.g., superotemporal quadrant" },
    { id: "tamponade", label: "Tamponade (if FAX)", type: "select", options: ["none", "20% SF6", "14% C3F8"] },
    { id: "faceDown", label: "Face-Down Positioning", type: "select", options: ["no", "yes"] },
  ],
  ppv_iol: [
    { id: "pvd", label: "PVD Status", type: "select", options: ["had naturally occurred", "was created by gentle aspiration over the optic nerve", "previously vitrectomized"] },
    { id: "originalIol", label: "Dislocated IOL Description", type: "text", placeholder: "e.g., dislocated posterior chamber IOL" },
    { id: "performFax", label: "Fluid-Air Exchange", type: "select", options: ["no", "yes"] },
    { id: "tamponade", label: "Tamponade (if FAX)", type: "select", options: ["none", "20% SF6", "14% C3F8"] },
    { id: "peripheralFinding", label: "Peripheral Finding", type: "select", options: ["none", "hole", "tear", "lattice degeneration", "other"] },
    { id: "peripheralDetail", label: "Finding Location/Detail", type: "text", placeholder: "e.g., at 6 o'clock, superotemporal" },
    { id: "performLaser", label: "Endolaser", type: "select", options: ["no", "yes"] },
  ],
};

/* ── Shared text helpers ──────────────────────────────────────── */
function lat(f) { return f.laterality === "left" ? "left" : "right"; }
function latAbbr(f) { return f.laterality === "left" ? "OS" : "OD"; }

function vitreousLine(f) {
  const highlight = f.vitreousHighlight || "Triescence";
  const prevVit = f.pvd === "previously vitrectomized";
  if (prevVit) return `A core vitreous dissection was performed. ${highlight} was used to highlight the vitreous cavity for any remaining vitreous.`;
  return `A core vitreous dissection was performed. ${highlight} was used to highlight the vitreous.`;
}

function pvdLine(f) {
  const pvd = f.pvd || "was created by gentle aspiration over the optic nerve";
  if (pvd === "previously vitrectomized") return "The patient had been previously vitrectomized.";
  return `A posterior vitreous detachment ${pvd}.`;
}

function anesthesiaIntro(f) {
  const a = f.anesthesia || "MAC with retrobulbar block";
  if (a === "General anesthesia") return "general anesthesia was induced by the anesthesia team.";
  if (a === "MAC with peribulbar block") return "intravenous sedation was induced by the anesthesia team followed by a peribulbar block.";
  return "intravenous sedation was induced by the anesthesia team followed by a retrobulbar block.";
}

function anesthesiaLine(f) {
  const a = f.anesthesia || "MAC with retrobulbar block";
  if (a === "General anesthesia") return "General anesthesia";
  return `Monitored anesthesia care with ${a.replace("MAC with ", "")}`;
}

function commonHeader(f, diagnosis, proceduresList) {
  const name = f.patientName || "[Patient Name]";
  const mrn = f.mrn || "[MRN]";
  const dob = f.dob || "[DOB]";
  const dos = f.dos || "[Date]";
  const comp = f.complications || "None";
  const numberedProcs = proceduresList.map((p, i) => `${i + 1}. ${p}`).join("\n");

  return `Patient name: ${name}
MRN: ${mrn}
DOB: ${dob}
Date of surgery: ${dos}
Surgeon: Marianeli Rodriguez, MD, PhD

Pre-operative diagnosis: ${diagnosis} ${lat(f)} eye
Post-operative diagnosis: ${diagnosis} ${lat(f)} eye

Procedures ${latAbbr(f)}
${numberedProcs}

Type of anesthesia: ${anesthesiaLine(f)}
Complications: ${comp}
Estimated blood loss: minimal
Specimens: None`;
}

function peripheralBlock(f) {
  const finding = f.peripheralFinding || "none";
  const detail = f.peripheralDetail || "";
  const doLaser = f.performLaser === "yes";
  if (finding === "none" && !doLaser) return "No peripheral pathology was noted.";
  let text = "";
  if (finding !== "none" && finding !== "other") {
    const loc = detail ? ` ${detail}` : "";
    text = `A ${finding}${loc} was identified during inspection of the periphery with scleral depression.`;
  } else if (finding === "other" && detail) {
    text = `${detail} was identified during inspection of the periphery with scleral depression.`;
  } else {
    text = "The periphery was inspected with scleral depression.";
  }
  if (doLaser) {
    text += " The endolaser probe was brought into the field and laser was applied around the noted pathology.";
  }
  return text;
}

function calcAge(f) {
  const dob = f.dob;
  if (!dob) return "[age]";
  const parts = dob.split("/");
  if (parts.length !== 3) return "[age]";
  const [m, d, y] = parts.map(Number);
  if (!m || !d || !y) return "[age]";
  const birth = new Date(y, m - 1, d);
  const ref = f.dos ? (() => { const p = f.dos.split("/").map(Number); return p.length === 3 && p[2] ? new Date(p[2], p[0] - 1, p[1]) : new Date(); })() : new Date();
  let age = ref.getFullYear() - birth.getFullYear();
  const mDiff = ref.getMonth() - birth.getMonth();
  if (mDiff < 0 || (mDiff === 0 && ref.getDate() < birth.getDate())) age--;
  return age > 0 && age < 130 ? String(age) : "[age]";
}

function briefHistoryIntro(f, condition, consentAction) {
  const age = calcAge(f);
  return `Brief History:
This ${age} y/o patient has a history of ${condition}. The risks, benefits and alternatives to the procedure were discussed in detail including the risk for vision loss, blindness, cataract, retinal detachment, glaucoma, infection, bleeding, pain, low vision, droopy eyelid, need for additional procedures, among others. The patient had a full opportunity in clinic to have all questions answered prior to surgery. Afterwards the patient requested that we ${consentAction} and signed the consent form.`;
}

function procedureOpening(f) {
  return `Description of Procedure:
The patient was brought into the preoperative holding area where the correct eye was confirmed and marked. Inspection of the posterior pole showed no interval changes from the pre-operative exam.
The patient was then brought into the operative room where ${anesthesiaIntro(f)}
A time out was performed to confirm the correct patient, eye, procedure and any allergies. The eye was prepped and draped in the usual sterile ophthalmic fashion followed by placement of a lid speculum.`;
}

function trocarPlacement() {
  return `Trocars were placed in the inferotemporal, superotemporal and superonasal quadrants through the pars plana in a beveled fashion. A 4mm infusion cannula was placed through the inferotemporal cannula and the infusion was confirmed to be in the vitreous cavity prior to turning it on.
At this time a standard three-port pars plana vitrectomy was performed using the light pipe, the cutter and the Zeiss Resight viewing system.`;
}

function standardClosure(f, gasLine, { suture = true } = {}) {
  const faceDown = f.faceDown === "yes";
  const positionText = faceDown
    ? "The patient was instructed to maintain a strict face down positioning and to follow up in clinic tomorrow."
    : "The patient was instructed to follow up in clinic tomorrow.";

  if (suture) {
    return `The superonasal trocar was removed and sutured using 8-0 vicryl in an interrupted fashion.
${gasLine}The superotemporal cannula was removed followed by the infusion cannula. These sclerotomies were then sutured with 8-0 vicryl in an interrupted fashion. The conjunctiva was closed in conjunction with the sclerotomy closure. Incisions were noted to be water tight at the end of the procedure.
Subconjunctival injections of Cefazolin and dexamethasone were administered. The lid speculum and drapes were removed. Atropine and maxitrol ointment were applied and the eye was patched and shielded.
The patient tolerated the procedure well without any intraoperative or immediate postoperative complications. The patient was taken to the recovery room in good condition. ${positionText}`;
  } else {
    return `The trocars were removed and the sclerotomies were checked and noted to be self-sealing. Incisions were noted to be water tight at the end of the procedure.
Subconjunctival injections of Cefazolin and dexamethasone were administered. The lid speculum and drapes were removed. Atropine and maxitrol ointment were applied and the eye was patched and shielded.
The patient tolerated the procedure well without any intraoperative or immediate postoperative complications. The patient was taken to the recovery room in good condition. ${positionText}`;
  }
}

function gasExchangeLine(tamponade) {
  if (!tamponade || tamponade === "none") return "";
  if (tamponade.includes("silicone oil")) return ""; // silicone oil has its own closure block
  return `An exchange of the air for ${tamponade} was performed through the infusion cannula and vented through the superotemporal trocar.\n`;
}

function siliconOilClosure(f, tamponade) {
  const viscosity = tamponade.replace("silicone oil ", "");
  const faceDown = f.faceDown === "yes";
  const positionText = faceDown
    ? "The patient was instructed to maintain a strict face down positioning and to follow up in clinic tomorrow."
    : "The patient was instructed to follow up in clinic tomorrow.";

  return `Silicone oil (${viscosity}) was then injected into the vitreous cavity through the superotemporal trocar using the viscous fluid injector system while venting through the superonasal trocar. Once the eye was filled with silicone oil and the intraocular pressure was deemed acceptable, all trocars were removed and the sclerotomies were sutured with 8-0 vicryl in an interrupted fashion. The conjunctiva was closed in conjunction with the sclerotomy closure. Incisions were noted to be water tight at the end of the procedure.
Subconjunctival injections of Cefazolin and dexamethasone were administered. The lid speculum and drapes were removed. Atropine and maxitrol ointment were applied and the eye was patched and shielded.
The patient tolerated the procedure well without any intraoperative or immediate postoperative complications. The patient was taken to the recovery room in good condition. ${positionText}`;
}

/* ── Note generators ──────────────────────────────────────────── */
function generateERM(f) {
  const pvd = f.pvd || "was created by gentle aspiration over the optic nerve";
  const tissue = f.tissueRemoved || "ILM and ERM";
  const doFax = f.performFax === "yes";
  const tamponade = doFax ? (f.tamponade || "14% C3F8") : "none";
  const doLaser = f.performLaser === "yes";
  const dye = f.stainingDye || "Indocyanine green";
  const highlight = f.vitreousHighlight || "Triescence";

  let tissueLabel, peelDesc;
  if (tissue === "ILM and ERM") {
    tissueLabel = "Internal limiting membrane (ILM) peel and Epiretinal membrane (ERM) peel";
    peelDesc = `${dye} was injected through the vitreous cutter under direct visualization to stain the ILM and negatively stain the ERM, and was subsequently aspirated with the cutter following staining. A flap in the ILM/ERM was created using a flex loop with the aid of a macular lens. The tissue was then removed in a circumferential manner from arcade to arcade. There were no complications during the removal.`;
  } else if (tissue === "ILM only") {
    tissueLabel = "Internal limiting membrane (ILM) peel";
    peelDesc = `${dye} was injected through the vitreous cutter under direct visualization to stain the ILM and was subsequently aspirated with the cutter following staining. A flap in the ILM was created using a flex loop with the aid of a macular lens. The tissue was then removed in a circumferential manner from arcade to arcade using ILM forceps. There were no complications during the removal.`;
  } else {
    tissueLabel = "Epiretinal membrane (ERM) peel";
    peelDesc = `${dye} was injected through the vitreous cutter under direct visualization to negatively stain the ERM, and was subsequently aspirated with the cutter following staining. A flap in the ERM was created using a flex loop with the aid of a macular lens. The tissue was then removed in a circumferential manner from arcade to arcade. There were no complications during the removal.`;
  }

  const procList = [
    "25 gauge pars plana vitrectomy",
    `Intravitreal ${dye.toLowerCase()} and ${highlight.toLowerCase()}`,
    tissueLabel,
  ];
  if (doLaser) procList.push("Endolaser");
  if (doFax) procList.push("Fluid air exchange");
  if (tamponade !== "none") procList.push(tamponade);

  const periphText = peripheralBlock(f);
  let faxBlock = "";
  if (doFax) {
    faxBlock = `\nAfterwards a complete fluid-air exchange was performed using a soft tip cannula after inspection of the periphery with scleral depression. ${periphText} Residual fluid was removed from the posterior pole over the optic nerve using the soft tip cannula.\n`;
  } else {
    faxBlock = `\n${periphText}\n`;
  }

  return `${commonHeader(f, "Epiretinal membrane", procList)}

${briefHistoryIntro(f, "a clinically significant epiretinal membrane causing decreased visual function and distortion", "perform surgery to peel the epiretinal membrane")}

${procedureOpening(f)}
${trocarPlacement()}
${vitreousLine(f)}
${pvdLine(f)}
A thorough peripheral vitreous dissection was performed.
${peelDesc}
${faxBlock}${standardClosure(f, gasExchangeLine(tamponade), { suture: tamponade !== "none" })}`;
}

function generateMH(f) {
  const pvd = f.pvd || "was created by gentle aspiration over the optic nerve";
  const tamponade = f.tamponade || "20% SF6";
  const doLaser = f.performLaser === "yes";
  const dye = f.stainingDye || "Brilliant blue";
  const highlight = f.vitreousHighlight || "Triescence";

  const procList = [
    "25 gauge pars plana vitrectomy",
    `${dye} and ${highlight.toLowerCase()}`,
    "Internal limiting membrane (ILM) peel",
  ];
  if (doLaser) procList.push("Endolaser");
  procList.push("Fluid air exchange", tamponade);

  return `${commonHeader(f, "Full thickness macular hole", procList)}

${briefHistoryIntro(f, "a clinically significant full thickness macular hole causing decreased visual function", "perform surgery to repair the macular hole")}

${procedureOpening(f)}
${trocarPlacement()}
${vitreousLine(f)}
${pvdLine(f)}
A thorough peripheral vitreous dissection was performed.
${dye} was injected through the vitreous cutter under direct visualization to stain the ILM and was subsequently aspirated with the cutter following staining. A flap in the ILM was created using a flex loop with the aid of a macular lens. The tissue was then removed in a circumferential manner from arcade to arcade using ILM forceps. There were no complications during the removal.
Afterwards a complete fluid-air exchange was performed using a soft tip cannula after inspection of the periphery with scleral depression. ${peripheralBlock(f)} Residual fluid was removed from the posterior pole over the optic nerve using the soft tip cannula.
${standardClosure({ ...f, faceDown: "yes" }, gasExchangeLine(tamponade))}`;
}

function generatePrimaryRD(f) {
  const pvd = f.pvd || "was created by gentle aspiration over the optic nerve";
  const usePfcl = f.usePfcl === "yes";
  const tamponade = f.tamponade || "14% C3F8";
  const additionalLaser = f.additionalLaser || "";
  const breakDesc = f.breakDescription || "";
  const clockHours = f.rdClockHours || "";
  const doDR = f.drainageRetinotomy === "yes";

  const procList = [
    "25 gauge pars plana vitrectomy",
    "Fluid-air exchange",
    "Endolaser",
    tamponade,
  ];
  if (doDR) procList.push("Drainage retinotomy");

  // Build diagnosis with clock-hours if provided
  const diagDetail = "Retinal detachment";

  // Break description line
  let breakLine = "The breaks were identified and demarcated with intravitreal diathermy.";
  if (breakDesc) {
    breakLine = `The following breaks were identified: ${breakDesc}. The breaks were demarcated with intravitreal diathermy.`;
  }

  // Drainage retinotomy block
  let drBlock = "";
  if (doDR) {
    drBlock = `A drainage retinotomy was created using diathermy to allow drainage of subretinal fluid.\n`;
  }

  let pfclBlock = "";
  if (usePfcl) {
    pfclBlock = `Perfluorocarbon liquid was injected into the vitreous cavity and the retina was noted to flatten. The endolaser probe was brought into the field and was noted to perform laser around the noted breaks.\n`;
  }

  const laserExtra = additionalLaser ? ` and ${additionalLaser}` : "";

  const clockDesc = clockHours ? ` extending from ${clockHours}` : "";
  const historyCondition = clockHours
    ? `a retinal detachment${clockDesc} causing decreased vision`
    : "retinal detachment causing decreased vision";

  return `${commonHeader(f, diagDetail, procList)}

${briefHistoryIntro(f, historyCondition, "perform surgery to repair the retinal detachment")}

${procedureOpening(f)}
${trocarPlacement()}
${vitreousLine(f)}
${pvdLine(f)}
A thorough peripheral vitreous dissection was performed with scleral depression and all vitreous traction was relieved.${clockHours ? ` A retinal detachment${clockDesc} was noted.` : ""}
${breakLine}
${drBlock}${pfclBlock}Afterwards a complete fluid-air exchange was performed using a soft tip cannula. Residual fluid was removed from the posterior pole over the optic nerve using the soft tip cannula. The endolaser probe was brought on the field and was used to perform laser around the noted breaks${laserExtra}.
${standardClosure(f, gasExchangeLine(tamponade))}`;
}

function generateComplexRD(f) {
  const pvd = f.pvd || "was created by gentle aspiration over the optic nerve";
  const rdType = f.rdType || "PVR";
  const doMembrane = f.membranePeel !== "no";
  const usePfcl = f.usePfcl === "yes";
  const doRetinotomy = f.relaxingRetinotomy === "yes";
  const tamponade = f.tamponade || "silicone oil 1000 cs";
  const additionalLaser = f.additionalLaser || "";
  const breakDesc = f.breakDescription || "";
  const clockHours = f.rdClockHours || "";
  const doDR = f.drainageRetinotomy === "yes";
  const dye = f.stainingDye || "Indocyanine green";

  let diagnosisText;
  if (rdType === "PVR") diagnosisText = "Retinal detachment with proliferative vitreoretinopathy";
  else if (rdType === "TRD") diagnosisText = "Tractional retinal detachment";
  else diagnosisText = "Complex retinal detachment";

  const procList = [
    "25 gauge pars plana vitrectomy",
  ];
  if (doMembrane) procList.push("Membrane dissection and peeling");
  if (doDR) procList.push("Drainage retinotomy");
  procList.push("Fluid-air exchange", "Endolaser");
  if (doRetinotomy) procList.push("Relaxing retinotomy");
  procList.push(tamponade.includes("silicone oil") ? `Silicone oil injection (${tamponade.replace("silicone oil ", "")})` : tamponade);

  // Break description
  let breakLine = "The breaks were identified and demarcated with intravitreal diathermy.";
  if (breakDesc) {
    breakLine = `The following breaks were identified: ${breakDesc}. The breaks were demarcated with intravitreal diathermy.`;
  }

  // Drainage retinotomy
  let drBlock = "";
  if (doDR) {
    drBlock = `A drainage retinotomy was created using diathermy to allow drainage of subretinal fluid.\n`;
  }

  let membraneBlock = "";
  if (doMembrane) {
    const stainLine = `${dye} was used to stain the membranes for visualization. `;
    if (rdType === "PVR") {
      membraneBlock = `${stainLine}Proliferative vitreoretinopathy membranes were identified and carefully dissected using membrane forceps and the vitreous cutter. Epiretinal and subretinal membranes were peeled and all tractional elements were removed to relieve traction on the retina.\n`;
    } else if (rdType === "TRD") {
      membraneBlock = `${stainLine}Tractional membranes were identified and carefully dissected. Segmentation and delamination of the tractional membranes was performed using the vitreous cutter and membrane forceps. Care was taken to relieve all traction while preserving the underlying retinal tissue.\n`;
    } else {
      membraneBlock = `${stainLine}Epiretinal membranes and tractional elements were identified and carefully dissected using membrane forceps and the vitreous cutter. All tractional elements were removed to relieve traction on the retina.\n`;
    }
  }

  let pfclBlock = "";
  if (usePfcl) {
    pfclBlock = `Perfluorocarbon liquid was injected into the vitreous cavity and the retina was noted to flatten. The endolaser probe was brought into the field and was noted to perform laser around the noted breaks.\n`;
  }

  let retinotomyBlock = "";
  if (doRetinotomy) {
    retinotomyBlock = `A relaxing retinotomy was performed to allow the retina to flatten.\n`;
  }

  const laserExtra = additionalLaser ? ` and ${additionalLaser}` : "";

  const clockDesc = clockHours ? ` extending from ${clockHours}` : "";

  return `${commonHeader(f, diagnosisText, procList)}

${briefHistoryIntro(f, `${diagnosisText.toLowerCase()}${clockDesc} causing decreased vision`, "perform surgery to repair the retinal detachment")}

${procedureOpening(f)}
${trocarPlacement()}
${vitreousLine(f)}
${pvdLine(f)}
A thorough peripheral vitreous dissection was performed with scleral depression and all vitreous traction was relieved.${clockHours ? ` A retinal detachment${clockDesc} was noted.` : ""}
${membraneBlock}${breakLine}
${drBlock}${pfclBlock}${retinotomyBlock}Afterwards a complete fluid-air exchange was performed using a soft tip cannula. Residual fluid was removed from the posterior pole over the optic nerve using the soft tip cannula. The endolaser probe was brought on the field and was used to perform laser around the noted breaks${laserExtra}.
${tamponade.includes("silicone oil") ? siliconOilClosure(f, tamponade) : standardClosure(f, gasExchangeLine(tamponade))}`;
}

function generateBucklePPV(f) {
  const pvd = f.pvd || "was created by gentle aspiration over the optic nerve";
  const buckleType = f.buckleType || "41/70 band and tire";
  const usePfcl = f.usePfcl === "yes";
  const tamponade = f.tamponade || "14% C3F8";
  const additionalLaser = f.additionalLaser || "";

  let buckleDesc;
  if (buckleType === "41 band") buckleDesc = "41 band";
  else if (buckleType === "70 tire") buckleDesc = "70 tire";
  else buckleDesc = "41/70";

  const procList = [
    `360 scleral buckle (${buckleDesc})`,
    "25 gauge pars plana vitrectomy",
    "Fluid-air exchange",
    "Endolaser",
    tamponade,
  ];

  // Force GA for buckle
  const ff = { ...f, anesthesia: "General anesthesia", faceDown: "yes" };

  let pfclBlock = "";
  if (usePfcl) {
    pfclBlock = `Perfluorocarbon liquid was injected into the vitreous cavity and the retina was noted to flatten. The endolaser probe was brought into the field and was noted to perform laser around the noted breaks.\n`;
  }

  const laserExtra = additionalLaser ? ` and ${additionalLaser}` : "";

  // Buckle has different closure
  const buckleClosure = `The superonasal trocar was removed and sutured using 8-0 vicryl in an interrupted fashion.
${gasExchangeLine(tamponade)}The superotemporal cannula was removed followed by the infusion cannula. These sclerotomies were then sutured with 8-0 vicryl in an interrupted fashion. Each of the sclerotomy sites were noted to be water tight at the end of the procedure. The conjunctiva was closed temporally and nasally with interrupted 8-0 vicryl sutures.
Subconjunctival injections of Cefazolin and dexamethasone were administered. The lid speculum and drapes were removed. Atropine and maxitrol ointment were applied and the eye was patched and shielded.
The patient tolerated the procedure well without any intraoperative or immediate postoperative complications. The patient was taken to the recovery room in good condition. The patient was instructed to maintain a strict face down positioning and to follow up in clinic tomorrow.`;

  return `${commonHeader(ff, "Retinal detachment", procList)}

${briefHistoryIntro(ff, "retinal detachment causing decreased vision", "perform surgery to repair the retinal detachment")}

${procedureOpening(ff)}
A radial limbal conjunctival incision was made temporally. A 360 degrees peritomy was completed with blunt Wescott scissors. Steven's scissors were used to bluntly dissect Tenon's capsule in each quadrant between the rectus muscles. Following this, the quadrants were inspected and no signs of scleral thinning was seen. After this the muscles were isolated using a muscle hook. Tenon's capsule was carefully cleaned off each muscle using a cotton tip applicator. Then a 2-0 silk suture was passed to sling each muscle. A 5-0 nylon suture was then passed in a horizontal mattress fashion in each mid-quadrant. Now the above band was brought into the field and passed underneath the medial, inferior, lateral and superior rectus muscles using utility forceps and sutured in each of the 4 mid quadrants at the equator of the globe. The above sleeve was then used to bring the band edges together in the superonasal quadrant. Following this, the band was tightened to achieve the desired height and the excess edges of the band were cut on both sides.
${trocarPlacement()}
${vitreousLine(f)}
${pvdLine(f)}
A thorough peripheral vitreous dissection was performed with scleral depression and all vitreous traction was relieved.
The breaks were demarcated with intravitreal diathermy.
${pfclBlock}Afterwards a complete fluid-air exchange was performed using a soft tip cannula. Residual fluid was removed from the posterior pole over the optic nerve using the soft tip cannula. The endolaser probe was brought on the field and was used to perform laser around the noted breaks${laserExtra}.
${buckleClosure}`;
}

function generateVH(f) {
  const indication = f.indication || "vitreous hemorrhage";
  const pvd = f.pvd || "was created by gentle aspiration over the optic nerve";
  const doFax = f.performFax === "yes";
  const breakFound = f.breakFound === "yes - endolaser applied";
  const laserLoc = f.laserLocation || "";
  const tamponade = doFax ? (f.tamponade || "none") : "none";

  const diagText = indication === "vitreous floaters"
    ? "Symptomatic vitreous floaters"
    : "Vitreous hemorrhage";

  const conditionText = indication === "vitreous floaters"
    ? "symptomatic vitreous floaters causing decreased visual function"
    : "vitreous hemorrhage causing decreased vision";

  const procList = ["25 gauge pars plana vitrectomy"];
  if (doFax) procList.push("Fluid-air exchange");
  if (breakFound) procList.push("Endolaser");
  if (tamponade !== "none") procList.push(tamponade);

  let laserBlock = "";
  if (breakFound) {
    const locText = laserLoc ? ` in the ${laserLoc}` : "";
    laserBlock = `A retinal break was identified${locText}. The endolaser probe was brought on the field and was used to perform laser around the noted break.\n`;
  }

  let faxBlock = "";
  if (doFax) {
    faxBlock = `Afterwards a complete fluid-air exchange was performed using a soft tip cannula. Residual fluid was removed from the posterior pole over the optic nerve using the soft tip cannula.\n`;
  }

  return `${commonHeader(f, diagText, procList)}

${briefHistoryIntro(f, `${conditionText}`, `perform surgery to treat the ${indication}`)}

${procedureOpening(f)}
${trocarPlacement()}
${vitreousLine(f)}
${pvdLine(f)}
A thorough peripheral vitreous dissection was performed with scleral depression. The periphery was inspected 360 degrees.
${laserBlock}${faxBlock}${standardClosure(f, gasExchangeLine(tamponade), { suture: tamponade !== "none" })}`;
}

function generateIOL(f) {
  const pvd = f.pvd || "was created by gentle aspiration over the optic nerve";
  const originalIol = f.originalIol || "dislocated posterior chamber IOL";
  const doFax = f.performFax === "yes";
  const tamponade = doFax ? (f.tamponade || "none") : "none";
  const doLaser = f.performLaser === "yes";

  const procList = [
    "25 gauge pars plana vitrectomy",
    `${originalIol.charAt(0).toUpperCase() + originalIol.slice(1)} explantation`,
    "Anterior chamber intraocular lens (AC-IOL) placement",
  ];
  if (doLaser) procList.push("Endolaser");
  if (doFax) procList.push("Fluid-air exchange");
  if (tamponade !== "none") procList.push(tamponade);

  let faxBlock = "";
  if (doFax) {
    faxBlock = `A complete fluid-air exchange was performed using a soft tip cannula. Residual fluid was removed from the posterior pole over the optic nerve using the soft tip cannula.\n`;
  }

  return `${commonHeader(f, `${originalIol.charAt(0).toUpperCase() + originalIol.slice(1)}`, procList)}

${briefHistoryIntro(f, `a ${originalIol} causing decreased visual function`, "perform surgery to exchange the intraocular lens")}

${procedureOpening(f)}
${trocarPlacement()}
${vitreousLine(f)}
${pvdLine(f)}
A thorough peripheral vitreous dissection was performed with scleral depression. The periphery was inspected 360 degrees.
${peripheralBlock(f)}
The ${originalIol} was identified and carefully removed from the vitreous cavity using intraocular forceps.
${faxBlock}Attention was then turned to the anterior segment. A superior conjunctival peritomy was performed. A scleral tunnel was created 1mm from the limbus, approximately 6mm in length. Miostat was injected into the anterior chamber. An inferior peripheral iridotomy was created using the vitreous cutter. Viscoelastic was placed in the anterior chamber. A Sheets glide was used to insert the anterior chamber intraocular lens into the anterior chamber. A Sinskey hook was used to rotate the lens into the proper position. An inferior peripheral iridectomy was created. The scleral tunnel was closed with 10-0 nylon sutures in a 3-1-1 pattern. Viscoelastic was removed from the anterior chamber.
The superonasal trocar was removed and sutured using 8-0 vicryl in an interrupted fashion.
${gasExchangeLine(tamponade)}The superotemporal cannula was removed followed by the infusion cannula. These sclerotomies were then sutured with 8-0 vicryl in an interrupted fashion. The conjunctiva was closed in conjunction with the sclerotomy closure. Incisions were noted to be water tight at the end of the procedure.
Subconjunctival injections of Cefazolin and dexamethasone were administered. The lid speculum and drapes were removed. Maxitrol ointment was applied and the eye was patched and shielded.
The patient tolerated the procedure well without any intraoperative or immediate postoperative complications. The patient was taken to the recovery room in good condition. The patient was instructed to follow up in clinic tomorrow.`;
}

/* ── Dispatcher ───────────────────────────────────────────────── */
function generateNote(procId, f) {
  switch (procId) {
    case "ppv_erm": return generateERM(f);
    case "ppv_mh": return generateMH(f);
    case "ppv_rd": return generatePrimaryRD(f);
    case "ppv_complex_rd": return generateComplexRD(f);
    case "buckle_ppv": return generateBucklePPV(f);
    case "ppv_vh": return generateVH(f);
    case "ppv_iol": return generateIOL(f);
    default: return "";
  }
}

/* ── Call status ──────────────────────────────────────────────── */
const STATUS_LABELS = {
  idle: "Call & Dictate",
  initiating: "Connecting...",
  initiated: "Call placed...",
  ringing: "Ringing...",
  "in-progress": "Dictating...",
  answered: "Dictating...",
  completed: "Done!",
  failed: "Call Failed",
  busy: "Line Busy",
  "no-answer": "No Answer",
  canceled: "Canceled",
};

const STATUS_COLORS = {
  idle: { bg: "#0e2a45", border: "#22d3ee", text: "#22d3ee" },
  initiating: { bg: "#1a1a2e", border: "#f59e0b", text: "#f59e0b" },
  initiated: { bg: "#1a1a2e", border: "#f59e0b", text: "#f59e0b" },
  ringing: { bg: "#1a1a2e", border: "#f59e0b", text: "#f59e0b" },
  "in-progress": { bg: "#0a2e1a", border: "#22c55e", text: "#22c55e" },
  answered: { bg: "#0a2e1a", border: "#22c55e", text: "#22c55e" },
  completed: { bg: "#0a2e1a", border: "#22c55e", text: "#22c55e" },
  failed: { bg: "#2e0a0a", border: "#f87171", text: "#f87171" },
  busy: { bg: "#2e0a0a", border: "#f87171", text: "#f87171" },
  "no-answer": { bg: "#2e0a0a", border: "#f87171", text: "#f87171" },
  canceled: { bg: "#1a1a2e", border: "#64748b", text: "#64748b" },
};

/* ── Styles ────────────────────────────────────────────────────── */
const styles = {
  root: {
    minHeight: "100vh",
    background: "#0a0f1a",
    color: "#e2e8f0",
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "16px 24px",
    borderBottom: "1px solid #1e3a5f",
    background: "#060d18",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  headerDot: {
    width: 8, height: 8, borderRadius: "50%", background: "#22d3ee",
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: "0.15em",
    color: "#94a3b8",
    textTransform: "uppercase",
  },
  body: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "220px 1fr",
    overflow: "hidden",
    height: "calc(100vh - 49px)",
  },
  sidebar: {
    borderRight: "1px solid #1e3a5f",
    overflowY: "auto",
    padding: "20px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: "0.15em",
    color: "#475569",
    textTransform: "uppercase",
    padding: "12px 8px 6px",
    fontWeight: 700,
  },
  procBtn: (active) => ({
    background: active ? "#0e2a45" : "transparent",
    border: active ? "1px solid #22d3ee" : "1px solid transparent",
    color: active ? "#22d3ee" : "#64748b",
    padding: "8px 10px",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 11,
    textAlign: "left",
    letterSpacing: "0.02em",
    transition: "all 0.15s",
    fontFamily: "inherit",
  }),
  main: {
    display: "grid",
    gridTemplateColumns: "300px 1fr",
    overflow: "hidden",
  },
  formPanel: {
    borderRight: "1px solid #1e3a5f",
    overflowY: "auto",
    padding: "20px 16px",
  },
  previewPanel: {
    overflowY: "auto",
    padding: "20px 24px",
    background: "#060d18",
    display: "flex",
    flexDirection: "column",
  },
  fieldGroup: {
    marginBottom: 12,
  },
  label: {
    display: "block",
    fontSize: 10,
    color: "#64748b",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  input: {
    width: "100%",
    background: "#0a1628",
    border: "1px solid #1e3a5f",
    color: "#cbd5e1",
    padding: "7px 10px",
    borderRadius: 3,
    fontSize: 12,
    fontFamily: "inherit",
    boxSizing: "border-box",
    outline: "none",
  },
  select: {
    width: "100%",
    background: "#0a1628",
    border: "1px solid #1e3a5f",
    color: "#cbd5e1",
    padding: "7px 10px",
    borderRadius: 3,
    fontSize: 12,
    fontFamily: "inherit",
    boxSizing: "border-box",
    outline: "none",
    appearance: "none",
  },
  divider: {
    height: 1,
    background: "#1e3a5f",
    margin: "16px 0",
  },
  noteTextarea: {
    flex: 1,
    width: "100%",
    minHeight: 500,
    background: "transparent",
    border: "1px solid #1e3a5f",
    borderRadius: 4,
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 1.8,
    fontFamily: "inherit",
    padding: "12px 14px",
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
    whiteSpace: "pre-wrap",
  },
  previewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 10,
    letterSpacing: "0.15em",
    color: "#475569",
    textTransform: "uppercase",
    fontWeight: 700,
  },
  copyBtn: {
    background: "#0e2a45",
    border: "1px solid #1e3a5f",
    color: "#22d3ee",
    padding: "5px 14px",
    borderRadius: 3,
    cursor: "pointer",
    fontSize: 11,
    fontFamily: "inherit",
    letterSpacing: "0.05em",
    transition: "all 0.15s",
  },
  dictateBtn: (callStatus) => {
    const colors = STATUS_COLORS[callStatus] || STATUS_COLORS.idle;
    const isActive = ["initiating", "initiated", "ringing", "in-progress", "answered"].includes(callStatus);
    return {
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      color: colors.text,
      padding: "10px 20px",
      borderRadius: 3,
      cursor: isActive ? "not-allowed" : "pointer",
      fontSize: 12,
      fontFamily: "inherit",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      width: "100%",
      marginTop: 8,
      transition: "all 0.15s",
      opacity: isActive ? 0.8 : 1,
    };
  },
  phoneInput: {
    width: "100%",
    background: "#0a1628",
    border: "1px solid #1e3a5f",
    color: "#cbd5e1",
    padding: "7px 10px",
    borderRadius: 3,
    fontSize: 12,
    fontFamily: "inherit",
    boxSizing: "border-box",
    outline: "none",
  },
  callStatusBar: (status) => {
    const colors = STATUS_COLORS[status] || STATUS_COLORS.idle;
    return {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "8px 12px",
      marginTop: 8,
      borderRadius: 3,
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      color: colors.text,
      fontSize: 11,
      letterSpacing: "0.05em",
    };
  },
  cancelBtn: {
    background: "transparent",
    border: "1px solid #f87171",
    color: "#f87171",
    padding: "3px 10px",
    borderRadius: 3,
    cursor: "pointer",
    fontSize: 10,
    fontFamily: "inherit",
    letterSpacing: "0.05em",
  },
};

/* ── Component ────────────────────────────────────────────────── */
export default function OpNoteDictator({ onBack }) {
  const [selectedProc, setSelectedProc] = useState("ppv_erm");
  const [copied, setCopied] = useState(false);
  const [fields, setFields] = useState({
    laterality: "right",
    anesthesia: "MAC with retrobulbar block",
    complications: "None",
    pvd: "was created by gentle aspiration over the optic nerve",
    tissueRemoved: "ILM and ERM",
    performFax: "no",
    tamponade: "14% C3F8",
    faceDown: "no",
    usePfcl: "no",
    rdType: "PVR",
    membranePeel: "yes",
    relaxingRetinotomy: "no",
    buckleType: "41/70 band and tire",
    indication: "vitreous hemorrhage",
    breakFound: "no",
    originalIol: "dislocated posterior chamber IOL",
  });

  // ── Editable note state ──────────────────────────────────────
  const generatedNote = useMemo(() => generateNote(selectedProc, fields), [selectedProc, fields]);
  const [editedNote, setEditedNote] = useState("");
  const [noteEdited, setNoteEdited] = useState(false);

  useEffect(() => {
    if (!noteEdited) setEditedNote(generatedNote);
  }, [generatedNote, noteEdited]);

  useEffect(() => {
    setNoteEdited(false);
  }, [selectedProc]);

  const note = editedNote || generatedNote;
  const updateField = (id, val) => { setNoteEdited(false); setFields(prev => ({ ...prev, [id]: val })); };
  const procFields = PROCEDURE_FIELDS[selectedProc] || [];

  // ── Call state ──────────────────────────────────────────────────
  const [phoneNumber, setPhoneNumber] = useState("+18008686224");
  const [callStatus, setCallStatus] = useState("idle");
  const [callSid, setCallSid] = useState(null);
  const [callError, setCallError] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const pollRef = useRef(null);
  const timerRef = useRef(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(note).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Poll call status ────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startPolling = useCallback((sid) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/call-status/${sid}`);
        if (!resp.ok) return;
        const data = await resp.json();
        setCallStatus(data.status);
        if (["completed", "failed", "busy", "no-answer", "canceled"].includes(data.status)) {
          stopPolling();
          setTimeout(() => { setCallStatus("idle"); setCallSid(null); setCallDuration(0); }, 5000);
        }
      } catch { /* ignore */ }
    }, 2000);
    timerRef.current = setInterval(() => { setCallDuration(d => d + 1); }, 1000);
  }, [stopPolling]);

  useEffect(() => stopPolling, [stopPolling]);

  // ── Initiate call ───────────────────────────────────────────────
  const handleDictate = async () => {
    if (callStatus !== "idle") return;
    if (!fields.patientName || !fields.mrn) {
      setCallError("Fill in patient name and MRN before dictating.");
      setTimeout(() => setCallError(null), 4000);
      return;
    }
    setCallStatus("initiating");
    setCallError(null);
    setCallDuration(0);
    try {
      const resp = await fetch(`${API_BASE}/api/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteText: note,
          mrn: fields.mrn,
          destinationNumber: phoneNumber || undefined,
          procedureName: PROCEDURES.find(p => p.id === selectedProc)?.label || selectedProc,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Call failed");
      setCallSid(data.callSid);
      setCallStatus("initiated");
      startPolling(data.callSid);
    } catch (err) {
      setCallStatus("failed");
      setCallError(err.message);
      setTimeout(() => { setCallStatus("idle"); setCallError(null); }, 5000);
    }
  };

  const isCallActive = ["initiating", "initiated", "ringing", "in-progress", "answered"].includes(callStatus);
  const formatDuration = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const renderField = (field) => (
    <div key={field.id} style={styles.fieldGroup}>
      <label style={styles.label}>{field.label}</label>
      {field.type === "select" ? (
        <select
          style={styles.select}
          value={fields[field.id] || field.options[0]}
          onChange={e => updateField(field.id, e.target.value)}
        >
          {field.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : field.type === "textarea" ? (
        <textarea
          style={{ ...styles.input, minHeight: 50, resize: "vertical", lineHeight: 1.5 }}
          placeholder={field.placeholder || ""}
          value={fields[field.id] || ""}
          onChange={e => updateField(field.id, e.target.value)}
        />
      ) : (
        <input
          style={styles.input}
          type="text"
          placeholder={field.placeholder || ""}
          value={fields[field.id] || ""}
          onChange={e => updateField(field.id, e.target.value)}
        />
      )}
    </div>
  );

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        {onBack && (
          <button onClick={onBack} style={{ background: "none", border: "1px solid #1e3a5f", borderRadius: 6, color: "#64748b", padding: "4px 10px", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: "0.78rem", marginRight: 4 }}>
            &#8592; Back
          </button>
        )}
        <div style={styles.headerDot} />
        <span style={styles.headerTitle}>Op Note Dictator — Retina-Rx</span>
      </div>
      <div style={styles.body}>
        {/* Procedure selector */}
        <div style={styles.sidebar}>
          <div style={styles.sectionLabel}>Procedure</div>
          {PROCEDURES.map(p => (
            <button
              key={p.id}
              style={styles.procBtn(selectedProc === p.id)}
              onClick={() => setSelectedProc(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div style={styles.main}>
          {/* Form */}
          <div style={styles.formPanel}>
            <div style={styles.sectionLabel}>Patient</div>
            {COMMON_FIELDS.map(renderField)}
            <div style={styles.divider} />
            <div style={styles.sectionLabel}>Procedure Details</div>
            {procFields.map(renderField)}

            <div style={styles.divider} />
            <div style={styles.sectionLabel}>Dictation</div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Dictation Line</label>
              <input
                style={styles.phoneInput}
                type="tel"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                disabled={isCallActive}
              />
            </div>

            {callError && (
              <div style={{ color: "#f87171", fontSize: 11, padding: "6px 0", letterSpacing: "0.02em" }}>
                {callError}
              </div>
            )}

            <button
              style={styles.dictateBtn(callStatus)}
              onClick={handleDictate}
              disabled={isCallActive}
            >
              {callStatus === "idle" ? "▶ " : ""}{STATUS_LABELS[callStatus] || callStatus}
            </button>

            {callStatus !== "idle" && (
              <div style={styles.callStatusBar(callStatus)}>
                <span>
                  {isCallActive && "● "}
                  {STATUS_LABELS[callStatus]}
                  {isCallActive && ` — ${formatDuration(callDuration)}`}
                </span>
                {isCallActive && (
                  <button
                    style={styles.cancelBtn}
                    onClick={() => {
                      stopPolling();
                      setCallStatus("canceled");
                      setTimeout(() => { setCallStatus("idle"); setCallSid(null); setCallDuration(0); }, 3000);
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Editable Note */}
          <div style={styles.previewPanel}>
            <div style={styles.previewHeader}>
              <span style={styles.previewTitle}>
                Operative Note {noteEdited && <span style={{ color: "#f59e0b", fontSize: 10, marginLeft: 8 }}>● edited</span>}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                {noteEdited && (
                  <button
                    style={{ ...styles.copyBtn, color: "#f59e0b" }}
                    onClick={() => { setNoteEdited(false); setEditedNote(generatedNote); }}
                  >
                    Regenerate
                  </button>
                )}
                <button style={styles.copyBtn} onClick={handleCopy}>
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              </div>
            </div>
            <textarea
              style={styles.noteTextarea}
              value={editedNote}
              onChange={e => { setEditedNote(e.target.value); setNoteEdited(true); }}
              spellCheck={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Clinical advisor strip — IRD card, first version (Oct 29 2026, Mari).
// Approved design: a collapsible "Advisor" strip BELOW the note, above the coverage
// card, labeled "Not copied with the note". Opens below. Genetic testing section
// open; Counseling and Monitoring folded. Only lines the doctor clicks "+ Add" go
// into the note's Plan — nothing is inserted automatically.
// Mari's decisions Oct 29 2026:
//   - Both labs side by side, NO recommendation.
//   - Vitamin A palmitate line for typical adult RP (never Stargardt / ABCA4).
//   - No visual field lines (VRA has no HVF). ERG is referred out (MCPHS or MEEI IRD).
//   - No clinical trials box and no AI "anything missing?" box in this version.
// Card text comes from claude/advisor-cards-draft-ird-vascular.md (IRD-GEN-001,
// IRD-BASE-002, IRD-STGD-004) and claude/roadmap-ird-genetics.md (program facts,
// checked Oct 29 2026). Pure functions only (testable with node --test). PHI-free:
// reads the note on screen, stores and sends nothing.

import { COVERAGE_FENCE_RX } from "./coverageCard.js";

// Same trigger as the IRD pamphlet (NoteEducationMatcher). Input must be lowercase.
export const IRD_RX = /retinitis\s*pigmentosa|\brp\b|stargardt|fundus\s*flavimaculatus|\babca4\b|usher|cone.?rod\s*dystroph|rod.?cone\s*dystroph|cone\s*dystroph|choroideremia|achromatopsia|leber\s*congenital|best\s*disease|best\s*vitelliform|x.?linked\s*retinoschisis|juvenile\s*retinoschisis|inherited\s*retinal|hereditary\s*retinal|retinal\s*dystroph|\bh35\.5[0-4]/;
const STARGARDT_RX = /stargardt|fundus\s*flavimaculatus|\babca4\b|\bh35\.53/;
const TYPICAL_RP_RX = /retinitis\s*pigmentosa|\brp\b|rod.?cone\s*dystroph|\bh35\.52/;

// Readable name for the "Shown because" line.
const LABELS = [
  [/retinitis\s*pigmentosa|\brp\b/, "Retinitis pigmentosa"], [/stargardt|fundus\s*flavimaculatus|\babca4\b/, "Stargardt disease"],
  [/usher/, "Usher syndrome"], [/cone.?rod\s*dystroph/, "Cone-rod dystrophy"], [/rod.?cone\s*dystroph/, "Rod-cone dystrophy"],
  [/cone\s*dystroph/, "Cone dystrophy"], [/choroideremia/, "Choroideremia"], [/achromatopsia/, "Achromatopsia"],
  [/leber\s*congenital/, "Leber congenital amaurosis"], [/best\s*disease|best\s*vitelliform/, "Best disease"],
  [/x.?linked\s*retinoschisis|juvenile\s*retinoschisis/, "X-linked retinoschisis"],
  [/inherited\s*retinal|hereditary\s*retinal|retinal\s*dystroph|\bh35\.5[0-4]/, "Inherited retinal disease"],
];

// Age from the note header ("45F", "45 yo", "45-year-old"). null when not found.
export function noteAge(note) {
  const m = String(note || "").match(/(?:^|\n)\s*(\d{1,3})\s*(?:yo\b|y\/o\b|-?\s*year-?\s*old\b|[MF]\b)/i);
  return m ? Number(m[1]) : null;
}

export const IRD_LINKS = [
  { label: "PreventionGenetics program portal", url: "https://myretinatrackerprogram.preventiongenetics.com" },
  { label: "FFB ordering video", url: "https://youtu.be/4UBcXVFA5Og" },
  { label: "Invitae order", url: "https://www.invitae.com/start-order/#/dashboard" },
  { label: "Invitae kit", url: "https://www.invitae.com/request-a-kit" },
  { label: "Invitae consent forms", url: "https://www.invitae.com/forms?tab=Patient%20informed%20consent" },
];

export const IRD_PROGRAMS = [
  { name: "FFB My Retina Tracker", cost: "Free · insurance not billed", detail: "PreventionGenetics · 110 genes · about 3–4 weeks · registry required" },
  { name: "Invitae Unlock IRD", cost: "Insurance first · cost estimate before testing · free if not covered", detail: "Labcorp · 330 genes · about 2 weeks · no registry" },
];

export const IRD_COMPARE = [
  ["Cost", "Free", "Insurance first; estimate before testing; free if not covered"],
  ["Genes", "110", "330"],
  ["Results", "About 3–4 weeks", "About 2 weeks"],
  ["Counseling", "InformedDNA, free", "Invitae genetic counselors"],
  ["Family", "Relatives tested free if a gene is found", "Available; cost varies"],
  ["Not eligible", "Prior eye gene panel (32+ genes) in 5 years, exome/genome, or known gene; parent, sibling or child tested in the program", "—"],
];

// buildIrdCard(noteText, icd10Codes) → card object, or null when no IRD in the note.
export function buildIrdCard(noteText, icd10Codes = []) {
  const note = String(noteText || "");
  const icdStr = (icd10Codes || []).map((c) => `${c.code} ${c.description}`).join(" ");
  const combined = (note + " " + icdStr).toLowerCase();
  if (!IRD_RX.test(combined)) return null;

  const stargardt = STARGARDT_RX.test(combined);
  const age = noteAge(note);
  const adult = age === null || age >= 18;
  const typicalRp = TYPICAL_RP_RX.test(combined) && !stargardt && adult;
  const label = (LABELS.find(([rx]) => rx.test(combined)) || [null, "Inherited retinal disease"])[1];
  const code = (icd10Codes || []).map((c) => String(c.code || "")).find((c) => /^H35\.5[0-4]/i.test(c));

  const counseling = [
    { id: "ird-supp", text: "Supplements discussed: no supplement is proven to slow inherited retinal disease; patient advised to avoid high-dose vitamin E and not to start supplements without discussing them first." },
  ];
  if (typicalRp) counseling.push({ id: "ird-vita", tag: "Typical adult RP", text: "Vitamin A palmitate 15,000 IU daily discussed as an option for typical adult retinitis pigmentosa (modest, inconsistent evidence of benefit); not for use in pregnancy, when planning pregnancy, or with liver disease; avoid high-dose vitamin E." });
  if (stargardt) counseling.push({ id: "ird-stgd-vita", tag: "Stargardt", text: "Patient advised to avoid vitamin A supplements." });
  counseling.push(
    { id: "ird-light", text: "Smoking avoidance advised. UV-protective / amber tinted lenses recommended for glare and light sensitivity." },
    { id: "ird-lowvision", text: "Low vision rehabilitation referral; orientation and mobility training as needed. Driving requirements discussed." },
    { id: "ird-family", text: "Family members advised to have eye examinations; genetic counseling available after results." },
    { id: "ird-blind", tag: "If legally blind", text: "Patient meets legal blindness criteria; report to the Massachusetts Commission for the Blind required within 30 days and patient informed." },
  );

  return {
    id: "IRD",
    title: "Inherited retinal disease",
    summary: "genetic testing · counseling · monitoring",
    why: `Shown because: ${label}${code ? ` (${code.toUpperCase()})` : ""}`,
    sections: [
      {
        id: "gt", title: "Genetic testing", open: true, programs: true,
        lines: [
          { id: "ird-gt", text: "Genetic testing for inherited retinal disease discussed. Options reviewed: Foundation Fighting Blindness no-cost program (My Retina Tracker, PreventionGenetics) or Invitae Unlock IRD. Patient to choose. Handout provided." },
          { id: "ird-gt-ffb", tag: "Patient chose FFB", text: "Patient to be enrolled in the Foundation Fighting Blindness no-cost genetic testing program (My Retina Tracker, PreventionGenetics)." },
          { id: "ird-gt-inv", tag: "Patient chose Invitae", text: "Invitae Inherited Retinal Disorders Panel to be ordered through the Invitae Unlock IRD program." },
        ],
        source: "Program facts checked Oct 29 2026 (FFB, PreventionGenetics, Invitae). AAO IRD clinical statement 2022.",
      },
      {
        id: "counseling", title: "Counseling", open: false, lines: counseling,
        source: "AAO IRD clinical statement 2022 · AAO supplement assessment, Ophthalmology 2025 · M.G.L. c.6 §136",
      },
      {
        id: "monitoring", title: "Monitoring", open: false,
        lines: [
          { id: "ird-cme", text: "Monitor for cystoid macular edema and cataract; treat if they develop." },
          { id: "ird-erg-mcphs", tag: "ERG", hint: "Fax request form + notes to 508-519-5512 · 508-373-5830", text: "Referral to MCPHS Eye and Vision Center Electrodiagnostic Service (Worcester) for full-field ERG for diagnosis and staging." },
          { id: "ird-erg-meei", tag: "ERG", text: "Referral to Mass Eye and Ear Inherited Retinal Disorders clinic (617-573-3621) for full-field ERG for diagnosis and staging." },
          { id: "ird-registry", text: "Patient informed of clinical trials and the My Retina Tracker registry." },
        ],
        source: "AAO IRD clinical statement 2022. ERG is not done at VRA.",
      },
    ],
  };
}

export function advisorCards(noteText, icd10Codes = []) {
  return [buildIrdCard(noteText, icd10Codes)].filter(Boolean);
}

// ── Put one line into the note's Plan ────────────────────────────────────────
// The note may end with coverage blocks (fenced by "=====" lines) — the line goes
// into the note body before them. Inside the body: at the end of the Plan, before
// the trailing "[+] … medical decision-making / G2211" sentences (same rule as the
// server's AMD bundle, lib/amd-bundle.js PLAN_TAIL_RX). No Plan heading → a "Plan"
// heading is added. Dash style follows the Plan's existing lines. A line that is
// already in the note is not added twice.
const PLAN_TAIL_RX = /^\s*\[\+\].*\b(?:complexity|decision[- ]making|MDM|longitudinal|managing physician|total time spent|evaluation\s+(?:and|&)\s+management|in\s+addition\s+to\s+(?:the\s+)?(?:assessment|evaluation|management|treatment|shortening|extending|switch\w*))\b/i;
const isPlanHeader = (line) => /^plan\b/i.test(String(line || "").trim().replace(/^[*_#\s]+/, ""));

export function insertPlanLine(noteText, line) {
  const text = String(noteText || "");
  const add = String(line || "").trim();
  if (!add) return { text, added: false };
  if (text.includes(add)) return { text, added: false };
  const rx = new RegExp(COVERAGE_FENCE_RX.source);
  const fm = text.match(rx);
  const cut = fm ? fm.index : text.length;
  const body = text.slice(0, cut);
  const tail = text.slice(cut);

  const lines = body.split("\n");
  const planIdx = lines.findIndex(isPlanHeader);
  let end = lines.length;
  while (end > 0 && lines[end - 1].trim() === "") end--;
  const floor = planIdx >= 0 ? planIdx + 1 : 0;
  while (end > floor && PLAN_TAIL_RX.test(lines[end - 1])) end--;
  const planLines = planIdx >= 0 ? lines.slice(planIdx + 1, end).filter((l) => l.trim()) : [];
  const dashed = planLines.length > 0 && planLines.filter((l) => /^\s*[-•]\s/.test(l)).length * 2 >= planLines.length;
  const out = dashed ? `- ${add}` : add;
  if (planIdx < 0) lines.splice(end, 0, "", "Plan", out);
  else lines.splice(end, 0, out);
  return { text: lines.join("\n") + tail, added: true, line: out };
}

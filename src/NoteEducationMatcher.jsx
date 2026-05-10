import { HANDOUTS } from "./PatientEducation.jsx";

// ── Language detection from note text ──────────────────────────────
export function detectLanguage(noteText) {
  const lower = (noteText || "").toLowerCase();
  if (/spanish\s*speak|habla\s*espa[nñ]ol|spanish\s*only|interpreter.*spanish|spanish\s*interpreter|prefiere\s*espa[nñ]ol|spanish-speaking/.test(lower)) return "es";
  if (/vietnamese\s*speak|tiếng\s*việt|vietnamese\s*only|interpreter.*vietnamese|vietnamese\s*interpreter|vietnamese-speaking/.test(lower)) return "vi";
  if (/portuguese\s*speak|portugu[eê]s|portuguese\s*only|interpreter.*portuguese|portuguese\s*interpreter|portuguese-speaking/.test(lower)) return "pt";
  return "en";
}

// ── Match note content to relevant handout IDs ─────────────────────
// Returns array of handout objects from the HANDOUTS library
export function matchHandouts(noteText, icd10Codes = []) {
  const lower = (noteText || "").toLowerCase();
  const icdStr = icd10Codes.map(c => `${c.code} ${c.description}`.toLowerCase()).join(" ");
  const combined = lower + " " + icdStr;

  const matched = new Set();

  // Injection-related
  if (/inject|avastin|eylea|vabysmo|lucentis|beovu|anti-vegf|intravitreal/.test(combined)) {
    matched.add("inject-prep");
    matched.add("inject-post");
    matched.add("inject-faq");
  }

  // PRP / Panretinal
  if (/prp|panretinal|scatter\s*laser/.test(combined)) {
    matched.add("proc-prp");
  }

  // Laser for tears
  if (/laser.*tear|tear.*laser|laser.*hole|retinal\s*tear|retinal\s*hole|lattice/.test(combined)) {
    matched.add("proc-laser-tear");
  }

  // FA
  if (/fluorescein\s*angiog|angiogram|\bfa\b|ivfa/.test(combined)) {
    matched.add("proc-fa");
  }

  // PDT
  if (/pdt|photodynamic|visudyne/.test(combined)) {
    matched.add("proc-pdt");
  }

  // Valeda / PBM
  if (/valeda|pbm|photobiomod/.test(combined)) {
    matched.add("proc-valeda");
  }

  // Vitrectomy
  if (/vitrectomy|ppv|ppv\/ms|ppv\/mb|membrane\s*peel/.test(combined)) {
    matched.add("proc-vitrectomy");
  }

  // Scleral buckle
  if (/scleral\s*buckle|buckle/.test(combined)) {
    matched.add("proc-buckle");
  }

  // Wet AMD
  if (/wet\s*amd|neovascular\s*amd|cnv|h35\.32|exudative/.test(combined)) {
    matched.add("cond-wet-amd");
    matched.add("cond-amsler");
  }

  // Dry AMD
  if (/dry\s*amd|non-?exudative|h35\.31|early\s*amd|intermediate\s*amd|drusen/.test(combined)) {
    matched.add("cond-dry-amd");
    matched.add("cond-amsler");
  }

  // Geographic Atrophy
  if (/geographic\s*atrophy|\bga\b.*amd|h35\.31.*atrophy|syfovre|izervay/.test(combined)) {
    matched.add("cond-ga");
  }

  // Diabetic retinopathy
  if (/diabet.*retin|npdr|pdr|dme|diabetic\s*macular|e10\.3|e11\.3/.test(combined)) {
    matched.add("cond-dr");
  }

  // RVO
  if (/rvo|crvo|brvo|vein\s*occlusion|h34\.8/.test(combined)) {
    matched.add("cond-rvo");
  }

  // PVD
  if (/pvd|posterior\s*vitreous\s*detach|floater/.test(combined)) {
    matched.add("cond-pvd");
  }

  // CSCR
  if (/cscr|csc|central\s*serous/.test(combined)) {
    matched.add("cond-cscr");
  }

  // ERM
  if (/erm|epiretinal\s*membrane|macular\s*pucker|cellophane/.test(combined)) {
    matched.add("cond-erm");
  }

  // Macular hole
  if (/macular\s*hole|full.?thickness\s*hole/.test(combined)) {
    matched.add("cond-macular-hole");
  }

  // Retinal detachment
  if (/retinal\s*detach|rd\b|trd|rhegmatogenous/.test(combined)) {
    matched.add("cond-rd");
  }

  // Filter to actual HANDOUTS entries
  return HANDOUTS.filter(h => matched.has(h.id));
}

// ── Detect drops from plan text ────────────────────────────────────
// Returns array of { name, eye, frequency, taper }
export function detectDropsFromPlan(noteText) {
  const lower = (noteText || "").toLowerCase();

  // Search the ENTIRE note text for drop mentions — drops can appear in
  // the assessment (e.g., "On PF taper OD") or the plan section.
  // Previously we only searched the Plan section, but "planned" or "planning"
  // in the assessment would trick the regex and cut off drops above it.
  let planText = lower;

  // Normalize spelled-out laterality to abbreviations BEFORE regex matching
  planText = planText
    .replace(/\bright\s*eye\b/g, "OD")
    .replace(/\bleft\s*eye\b/g, "OS")
    .replace(/\bboth\s*eyes\b/g, "OU")
    .replace(/\beach\s*eye\b/g, "OU");

  const drops = [];

  // Common patterns:
  // "Ctn Cosopt BID OU"
  // "Pred forte QID OS x1wk, TID x1wk, BID x1wk, QD x1wk"
  // "Latanoprost qhs OU"
  // "Start Pred QID OD"
  // "Moxifloxacin QID OS x1wk"

  const drugPatterns = [
    // { regex, name }
    { regex: /(?:ctn|start|begin|continue|resume|add)\s+(pred(?:nisolone)?|pred\s*forte|pf)\s+(qid|tid|bid|qd|qhs)[ \t]*(?:in\s*(?:the\s*)?)?(od|os|ou)?[ \t]*(.*?)(?:\n|$)/gi, name: "Prednisolone" },
    { regex: /(pred(?:nisolone)?|pred\s*forte|pf)\s+(qid|tid|bid|qd|qhs)[ \t]*(?:in\s*(?:the\s*)?)?(od|os|ou)?[ \t]*(.*?)(?:\n|$)/gi, name: "Prednisolone" },
    { regex: /(?:pf|pred\s*forte|pred(?:nisolone)?)\s+(od|os|ou)\s*[-—–:]+\s*((?:qid|tid|bid|qd).*?)(?:\n|$)/gi, name: "Prednisolone", isTaperShorthand: true },
    { regex: /(?:pf|pred\s*forte|pred(?:nisolone)?)\s+taper\s*(od|os|ou)?[:\s]*(.*?)(?:\n|$)/gi, name: "Prednisolone", isTaperShorthand: true },
    { regex: /(?:ctn|start|begin|continue|resume|add)\s+(cosopt)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Cosopt" },
    { regex: /(cosopt)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Cosopt" },
    { regex: /(?:ctn|start|begin|continue|resume|add)\s+(latanoprost|xalatan)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Latanoprost" },
    { regex: /(latanoprost|xalatan)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Latanoprost" },
    { regex: /(?:ctn|start|begin|continue|resume|add)\s+(timolol|timoptic)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Timolol" },
    { regex: /(timolol|timoptic)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Timolol" },
    { regex: /(?:ctn|start|begin|continue|resume|add)\s+(brimonidine|alphagan)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Brimonidine" },
    { regex: /(brimonidine|alphagan)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Brimonidine" },
    { regex: /(?:ctn|start|begin|continue|resume|add)\s+(dorzolamide|trusopt)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Dorzolamide" },
    { regex: /(dorzolamide|trusopt)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Dorzolamide" },
    { regex: /(?:ctn|start|begin|continue|resume|add)\s+(moxifloxacin|vigamox)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?[ \t]*(.*?)(?:\n|$)/gi, name: "Moxifloxacin" },
    { regex: /(moxifloxacin|vigamox)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?[ \t]*(.*?)(?:\n|$)/gi, name: "Moxifloxacin" },
    { regex: /(?:ctn|start|begin|continue|resume|add)\s+(ofloxacin|ocuflox|oflox)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?[ \t]*(.*?)(?:\n|$)/gi, name: "Ofloxacin" },
    { regex: /(ofloxacin|ocuflox|oflox)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?[ \t]*(.*?)(?:\n|$)/gi, name: "Ofloxacin" },
    { regex: /(?:ctn|start|begin|continue|resume|add)\s+(bromfenac|prolensa)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Bromfenac" },
    { regex: /(bromfenac|prolensa)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Bromfenac" },
    { regex: /(?:ctn|start|begin|continue|resume|add)\s+(durezol)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?[ \t]*(.*?)(?:\n|$)/gi, name: "Durezol" },
    { regex: /(durezol)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?[ \t]*(.*?)(?:\n|$)/gi, name: "Durezol" },
    { regex: /(?:ctn|start|begin|continue|resume|add)\s+(ketorolac|acular)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Ketorolac" },
    { regex: /(ketorolac|acular)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Ketorolac" },
    { regex: /(?:ctn|start|begin|continue|resume|add)\s+(maxitrol)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?[ \t]*(.*?)(?:\n|$)/gi, name: "Maxitrol" },
    { regex: /(maxitrol)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?[ \t]*(.*?)(?:\n|$)/gi, name: "Maxitrol" },
    { regex: /(?:ctn|start|begin|continue|resume|add)\s+(rhopressa|netarsudil)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Rhopressa" },
    { regex: /(rhopressa|netarsudil)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Rhopressa" },
    { regex: /(?:ctn|start|begin|continue|resume|add)\s+(rocklatan)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Rocklatan" },
    { regex: /(rocklatan)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Rocklatan" },
    { regex: /(?:ctn|start|begin|continue|resume|add)\s+(combigan)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Combigan" },
    { regex: /(combigan)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Combigan" },
    { regex: /(?:ctn|start|begin|continue|resume|add)\s+(pilocarpine)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Pilocarpine" },
    { regex: /(pilocarpine)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Pilocarpine" },
    { regex: /(?:ctn|start|begin|continue|resume|add)\s+(atropine)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Atropine" },
    { regex: /(atropine)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Atropine" },
    { regex: /(?:ctn|start|begin|continue|resume|add)\s+(vyzulta)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Vyzulta" },
    { regex: /(vyzulta)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Vyzulta" },
    { regex: /(?:ctn|start|begin|continue|resume|add)\s+(lumigan|bimatoprost)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Lumigan" },
    { regex: /(lumigan|bimatoprost)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Lumigan" },
    { regex: /(?:ctn|start|begin|continue|resume|add)\s+(travatan|travoprost)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Travatan" },
    { regex: /(travatan|travoprost)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Travatan" },
    { regex: /(?:ctn|start|begin|continue|resume|add)\s+(lotemax|loteprednol)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?[ \t]*(.*?)(?:\n|$)/gi, name: "Lotemax" },
    { regex: /(lotemax|loteprednol)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?[ \t]*(.*?)(?:\n|$)/gi, name: "Lotemax" },
    { regex: /(?:ctn|start|begin|continue|resume|add)\s+(erythromycin)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Erythromycin" },
    { regex: /(erythromycin)\s+(qid|tid|bid|qd|qhs)[ \t]*(od|os|ou)?/gi, name: "Erythromycin" },
  ];

  // Also catch the compact "Ctn Cosopt BID OU, Brimonidine BID OU, Latanoprost qhs OU" pattern
  const compactLine = planText.match(/(?:ctn|continue|start)\s+(.+)/gi);

  const found = new Set();

  for (const { regex, name, isTaperShorthand } of drugPatterns) {
    let match;
    regex.lastIndex = 0;
    while ((match = regex.exec(planText)) !== null) {
      // Check if this match comes from a "Continue/Ctn/Start" directive (Plan section)
      // These are authoritative and should ALWAYS override assessment mentions.
      // Look back to the start of the CURRENT LINE (not just 12 chars) to handle
      // comma-separated drugs: "Continue Cosopt BID OD, Brimonidine BID OU, Latanoprost qhs OU"
      const lineStart = planText.lastIndexOf('\n', match.index - 1) + 1;
      const linePrefix = planText.slice(lineStart, match.index).toLowerCase();
      const isFromPlanDirective = /^[ \t]*[-•*]?[ \t]*(?:ctn|continue|start|begin|resume|add)\b/.test(linePrefix);

      // If already found, check if we should override
      if (found.has(name)) {
        if (!isTaperShorthand && match[3]) {
          const idx = drops.findIndex(d => d.name === name);
          // Override if: (a) previous was default-OU, OR (b) this match is from a Plan directive
          if (idx !== -1 && (drops[idx]._defaultEye || isFromPlanDirective)) {
            drops[idx].eye = match[3].toUpperCase();
            drops[idx]._defaultEye = false;
          }
        }
        continue;
      }

      if (isTaperShorthand) {
        // Handles: "PF taper OS: TID x1 week, then BID x1 week, then QD x1 week, then stop"
        //          "pf taper OD 3/2/1/stop"
        //          "pred forte taper 4/3/2/1"
        //          "PF taper OD" (no schedule → default)
        let eye = (match[1] || "").toUpperCase();
        const taperText = (match[2] || "").trim();
        // If no laterality captured, scan full note
        if (!eye) {
          const fullLower = (noteText || "").toLowerCase();
          const pfLateralMatch = fullLower.match(/(?:pf|pred\s*forte|prednisolone)\s+(?:\(pf\)\s+)?taper\s+(?:[\w\s:]*?)(od|os|ou)/i);
          eye = pfLateralMatch ? pfLateralMatch[1].toUpperCase() : "OU";
        }

        const freqMap = { qid: 4, tid: 3, bid: 2, qd: 1 };
        const freqNames = { 4: "QID", 3: "TID", 2: "BID", 1: "QD" };
        let schedule = "QID x1wk, TID x1wk, BID x1wk, QD x1wk"; // default

        if (taperText) {
          // Try parsing expanded format: "TID x1 week, then BID x1 week, then QD x1 week, then stop"
          const expandedParts = taperText.split(/,\s*(?:then\s*)?|;\s*(?:then\s*)?|→\s*(?:then\s*)?|>\s*(?:then\s*)?|\bthen\b\s*/).map(s => s.trim()).filter(Boolean);
          const steps = [];
          for (const part of expandedParts) {
            const lower = part.toLowerCase();
            if (lower === "stop" || lower === "discontinue" || lower.startsWith("then stop")) break;
            // Match freq + duration: "TID x1 week" or "BID x1wk" or "QD x 1 week"
            let freq = null;
            for (const [key, val] of Object.entries(freqMap)) {
              if (lower.includes(key)) { freq = val; break; }
            }
            if (freq !== null) {
              const wkMatch = lower.match(/x?\s*(\d+)\s*w/);
              const weeks = wkMatch ? wkMatch[1] : "1";
              steps.push(freqNames[freq] + " x" + weeks + "wk");
            }
          }
          if (steps.length > 0) {
            schedule = steps.join(", ");
          } else {
            // Try numeric shorthand: "3/2/1/stop" or "4/3/2/1"
            const nums = taperText.split(/[\/\-\s]+/).map(s => s.trim()).filter(Boolean);
            const numSteps = [];
            for (const n of nums) {
              if (n.toLowerCase() === "stop" || n.toLowerCase() === "discontinue") break;
              const val = parseInt(n);
              if (!isNaN(val) && val >= 1 && val <= 4) {
                numSteps.push(freqNames[val] + " x1wk");
              }
            }
            if (numSteps.length > 0) schedule = numSteps.join(", ");
          }
        }

        found.add(name);
        drops.push({ name, eye, schedule });
        continue;
      }

      const freq = match[2].toUpperCase();
      const eye = (match[3] || "OU").toUpperCase();
      const hasExplicitEye = !!match[3];
      const taperText = match[4] || "";

      let schedule = freq;
      if (taperText.trim()) {
        schedule = freq + " " + taperText.trim();
      }

      found.add(name);
      drops.push({ name, eye, schedule, _defaultEye: !hasExplicitEye });
    }
  }

  // Clean up internal flags before returning
  return drops.map(({ _defaultEye, ...rest }) => rest);
}

// ── Generate print HTML for matched handouts ───────────────────────
export function generateEducationPrintHTML(handouts, lang = "en", drops = []) {
  const langLabels = {
    en: { title: "Patient Education Materials", subtitle: "Please review the following information about your eye condition(s) and treatment.", footer: "If you have questions, please contact our office." },
    es: { title: "Materiales de Educación al Paciente", subtitle: "Por favor revise la siguiente información sobre su condición ocular y tratamiento.", footer: "Si tiene preguntas, por favor contacte nuestra oficina." },
    vi: { title: "Tài Liệu Giáo Dục Bệnh Nhân", subtitle: "Vui lòng xem lại thông tin sau về tình trạng mắt và điều trị của bạn.", footer: "Nếu bạn có câu hỏi, vui lòng liên hệ phòng khám." },
    pt: { title: "Materiais de Educação ao Paciente", subtitle: "Por favor, revise as seguintes informações sobre sua condição ocular e tratamento.", footer: "Se tiver dúvidas, entre em contato com nosso consultório." },
  };

  const labels = langLabels[lang] || langLabels.en;

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${labels.title}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Georgia, serif; font-size: 16px; color: #111; padding: 30px; max-width: 800px; margin: 0 auto; }
h1 { font-size: 24px; text-align: center; margin-bottom: 4px; }
.subtitle { text-align: center; font-size: 14px; color: #555; margin-bottom: 30px; }
.handout { page-break-inside: avoid; margin-bottom: 28px; border: 1px solid #ddd; border-radius: 10px; padding: 20px; }
.handout-title { font-size: 18px; font-weight: 700; margin-bottom: 12px; color: #1e3a5f; }
.handout-content { font-size: 15px; line-height: 1.7; white-space: pre-wrap; }
.footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #ccc; text-align: center; font-size: 13px; color: #666; }
@media print { .handout { break-inside: avoid; } body { padding: 12px; } }
</style></head><body>
<h1>${labels.title}</h1>
<p class="subtitle">${labels.subtitle}</p>`;

  for (const h of handouts) {
    const title = h.title[lang] || h.title.en;
    const content = h.content[lang] || h.content.en;
    html += `<div class="handout"><div class="handout-title">${title}</div><div class="handout-content">${content}</div></div>`;
  }

  html += `<div class="footer">${labels.footer}</div></body></html>`;
  return html;
}

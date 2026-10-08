// ── Response parser ─────────────────────────────────────────────────
function parseResponse(text) {
  const sec = (a, b) => {
    const s = text.indexOf("---" + a + "---");
    const e = text.indexOf("---" + b + "---");
    if (s === -1) return "";
    return (e === -1 ? text.slice(s) : text.slice(s, e))
      .replace("---" + a + "---", "").trim();
  };
  // Section bounded by whatever "---X---" marker comes next (robust to the
  // CHANGES section being removed from the output format, July 2026).
  const secAuto = (a) => {
    const marker = "---" + a + "---";
    const s = text.indexOf(marker);
    if (s === -1) return "";
    const rest = text.slice(s + marker.length);
    const e = rest.indexOf("---");
    return (e === -1 ? rest : rest.slice(0, e)).trim();
  };
  const hasProcedure = text.includes("---PROCEDURE---");
  const hasDiagnoses = text.includes("---DIAGNOSES---");
  let code = sec("CODE", hasProcedure ? "PROCEDURE" : "G2211");
  const procedure = hasProcedure ? sec("PROCEDURE", "G2211") : "";
  let g2211 = secAuto("G2211") === "YES";
  let note = sec("NOTE", "END");
  // Guards for same-day procedure days (the E/M carries -25).
  const procedureToday = !!procedure && procedure.trim() !== "" && !/^none\b/i.test(procedure.trim());
  if (procedureToday) {
    // (1) G2211 is never payable alongside -25 — force NO and strip any longitudinal/complexity add-on sentence.
    g2211 = false;
    note = note
      .split("\n")
      .filter((l) => !/longitudinal managing physician|ongoing complexity given|visit[- ]complexity add|\bG2211\b/i.test(l))
      .join("\n");
    // (2) Ensure -25 on the E/M for a same-day MINOR procedure (injection / 10-day laser).
    //     New-patient status does NOT exempt -25; without it the E/M bundles into the procedure.
    const minorProc = /\b(67028|67105|67145|67141|67228|67031)\b/.test(procedure);
    if (minorProc && /^\s*99\d{3}/.test(code) && !/-25\b/.test(code)) {
      code = code.replace(/^(\s*99\d{3}(?:-\d{2})*)/, "$1-25");
    }
  }
  return {
    code,
    procedure,
    g2211,
    // Billing-additions list is derived deterministically from the [+] markers
    // in the note body (July 2026 — Sonnet no longer writes a CHANGES section;
    // this also works on older outputs, which carry the same [+] markers).
    changes: Array.from(note.matchAll(/\[\+\]\s*([^\n[]+?)(?=\s*\[\+\]|[\n]|$)/g))
      .map((m) => m[1].replace(/[.,;\s]+$/, "").trim())
      .filter(Boolean),
    diagnoses: hasDiagnoses ? sec("DIAGNOSES", "NOTE") : "",
    note,
  };
}

const isEyeCode = (code) => { const base = (code || "").replace(/[-+\s].*/g, "").trim(); return base === "92014" || base === "92004"; };

// ── E/M code description labels ─────────────────────────────────────
const EM_LABELS = {
  "99205": "E/M5 New",
  "99215": "E/M5 Established",
  "99204": "E/M4 New",
  "99214": "E/M4 Established",
  "99203": "E/M3 New",
  "99213": "E/M3 Established",
  "92004": "Eye Comp New",
  "92014": "Eye Comp Established",
};

function getEmLabel(codeStr) {
  if (!codeStr) return "";
  // Extract the base 5-digit code from strings like "99214-25-57" or "99214"
  const base = codeStr.replace(/[-+\s].*/g, "").trim();
  return EM_LABELS[base] || "";
}

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

  // ── Plaquenil cumulative dose calculator ────────────────────────
  function calcPlaquenilDose(inputText) {
    const lower = inputText.toLowerCase();
    if (!lower.includes("plaquenil") && !lower.includes("hydroxychloroquine")) return "";

    // Extract daily dose: "200mg qday", "200 mg daily", "200mg BID", "400mg qday", etc.
    const doseMatch = lower.match(/(\d+)\s*mg\s*(?:po\s+)?(?:qday|daily|qd|bid|tid|q\s*day)/i);
    if (!doseMatch) return "";

    let dailyDose = parseInt(doseMatch[0].match(/\d+/)[0]);
    // If BID, double it
    if (/bid/i.test(doseMatch[0])) dailyDose *= 2;
    // If TID, triple it
    if (/tid/i.test(doseMatch[0])) dailyDose *= 3;

    // Extract duration: "x 10 years", "x10 years", "since 2013", "for 10 years", "10 yrs"
    let years = null;

    // Pattern 1: "since YYYY"
    const sinceMatch = lower.match(/since\s+(\d{4})/);
    if (sinceMatch) {
      years = new Date().getFullYear() - parseInt(sinceMatch[1]);
    }

    // Pattern 2: "x 10 years", "x10 yrs", "for 10 years"
    if (!years) {
      const yrsMatch = lower.match(/(?:x\s*|for\s+)(\d+)\s*(?:years?|yrs?)/);
      if (yrsMatch) years = parseInt(yrsMatch[1]);
    }

    if (!years || years <= 0) return "";

    const totalMg = Math.round(dailyDose * 365 * years);
    const totalG = Math.round(totalMg / 1000);

    return `\n\n[PLAQUENIL CUMULATIVE DOSE: ${totalG} g (${dailyDose} mg/day × ${years} years)]`;
  }

export { parseResponse, isEyeCode, EM_LABELS, getEmLabel, calcGlobalPeriodContext, calcPlaquenilDose };

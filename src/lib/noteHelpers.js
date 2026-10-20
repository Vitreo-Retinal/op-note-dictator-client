import { asciiFold, COVERAGE_FENCE_RX } from "./coverageCard.js";
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
  // ---TESTS--- (Oct 12 2026): diagnostic tests performed today. Hub display
  // only — never copied into the chart, and NOT a procedure: PROCEDURE ends at
  // ---TESTS--- when that marker follows it, so G2211/-25 below never see tests.
  const hasTests = text.includes("---TESTS---") && (!hasProcedure || text.indexOf("---TESTS---") > text.indexOf("---PROCEDURE---"));
  let code = sec("CODE", hasProcedure ? "PROCEDURE" : (hasTests ? "TESTS" : "G2211"));
  const procedure = hasProcedure ? sec("PROCEDURE", hasTests ? "TESTS" : "G2211") : "";
  const tests = hasTests ? secAuto("TESTS") : "";
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
    // (2) Ensure -25 on a BILLED visit code (E/M or Eye visit code) for a same-day
    //     MINOR procedure (CMS 2026 0-/10-day global). New-patient status does NOT
    //     exempt -25. Oct 8 2026: 67031 removed (90-day → -57); never added when the
    //     E/M already carries -57 (major-surgery decision — -25 only if a separate
    //     problem qualifies, which only the note can show); "POST-OP" lines are
    //     never touched. (Oct 8 2026 "Option B": every injection day bills a visit
    //     code with -25; there is no injection-only code line any more.)
    const minorProc = /\b(67028|67105|67145|67141|67101|67228|67227|65800|67221|67516)\b/.test(procedure);
    if (minorProc && /^\s*(?:99\d{3}|920(?:0[24]|1[24]))\b/.test(code) && !/-25\b/.test(code) && !/-57\b/.test(code)) {
      code = code.replace(/^(\s*(?:99\d{3}|920(?:0[24]|1[24]))(?:-\d{2})*)/, "$1-25");
    }
  }
  return {
    code,
    procedure,
    tests,
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
        // Oct 8 2026: the global depends on WHAT was done (CMS 2026). An
        // intravitreal injection is 0-day (no post-op period at all); laser
        // retinopexy / PRP / cryo / laser demarcation are 10-day; incisional
        // surgery, YAG and focal laser are 90-day.
        const ctx = inputText.slice(Math.max(0, m.index - 60), m.index + m[0].length).split("\n").pop();
        let window = 90;
        if (/\b(?:PPV|vitrectom\w*|SB|buckle|pneumatic|PnR|MP|membrane|IOL\w*|phaco\w*|CE|cataract|trab\w*|tube|YAG|focal|grid|67210|SO|ROSO|repair)\b/i.test(ctx)) window = 90;
        else if (/\b(?:LRP|laser\s+retinopexy|PRP|cryo\w*|laser\s+demarcation|barricade|demarcat\w*|67145|67228|67105|67141|67101)\b/i.test(ctx)) window = 10;
        else if (/\b(?:inj\w*|IVI|IVT|avastin|eylea|EHD|vabysmo|lucentis|beovu|izervay|syfovre|pavblu|byooviz|cimerli|ozurdex|67028)\b/i.test(ctx)) continue;
        const dateStr = m[2];
        const parts = dateStr.split("/");
        if (parts.length === 3) {
          let [mo, da, yr] = parts.map(Number);
          if (yr < 100) yr += 2000;
          const surgDate = new Date(yr, mo - 1, da);
          const diffDays = Math.round((today - surgDate) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays <= 365) {
            surgeries.push({ surgeon: m[1], date: surgDate, days: diffDays, window });
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
      const w = s.window || 90;
      const inGlobal = s.days <= w;
      lines.push(`[SYSTEM — POST-OP TIMING: Surgery by ${s.surgeon} was ${s.days} days ago (${s.date.toLocaleDateString()}). ${inGlobal ? `WITHIN ${w}-day global period — routine post-op care is NOT separately billable. Only UNRELATED conditions get separate E/M with -24, procedures with -79.` : `OUTSIDE ${w}-day global period — this visit is independently billable.`}]`);
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

// ICD-10 warning entries (server lib/note-icd-check.js, Oct 13 2026): "⚠ ICD-10 check" replaces a
// code that is not on the CMS FY2027 list; "⚠ Eye not stated" follows an unspecified-eye code.
// They carry `warning` ("icd:invalid" | "icd:no-eye"). Shown as chips, never copied as codes.
const ICD_CODE_SHAPE = /^[A-Z][0-9][0-9A-Z](?:\.[0-9A-Z]{1,4})?$/;
function isIcdWarning(c) {
  return !c || !!c.warning || typeof c.code !== "string" || !ICD_CODE_SHAPE.test(c.code.trim());
}
/** "Copy codes" text: real code entries only, "<code> — <description>" one per line. */
function copyableIcdText(codes) {
  return (Array.isArray(codes) ? codes : []).filter(c => !isIcdWarning(c)).map(c => `${c.code} — ${c.description}`).join("\n");
}

// ── "Copy note" text ─────────────────────────────────────────────────────────
// What goes on the clipboard for NextGen/Epic: the note with the "[+] " billing badges
// and any markdown "**" removed. Display formatting below never touches it.
// Oct 20 2026 (owner decision B): the COVERAGE REFERENCE block(s) — and only those —
// also get an ASCII fold (no emoji / em dashes / box-drawing rulers that NextGen shows
// as "?"). The server already sends them ASCII; this is the defensive second pass, and
// it also cleans blocks from an older server. The rest of the note is never altered.
function copyableNoteText(note) {
  const text = String(note == null ? "" : note).replace(/\[\+\]\s*/g, "").replace(/\*\*/g, "");
  return text.replace(new RegExp(COVERAGE_FENCE_RX.source, "g"), (block) => asciiFold(block));
}

// ── Bold diagnosis headers — SCREEN ONLY (owner, Oct 12 2026) ────────────────
// A numbered diagnosis header is the server's header shape (server lib/amd-header-merge.js
// HEADER_RX): optional indent, optional "**" / "__" wrapper, 1–2 digits, "." or ")", a space,
// a title, optional ":" — "1. AMD", "2. ERM OS", "3) Bilateral RDs", "**1. AMD**".
// Lines from the "Plan" heading on are plan items (never bold), and "OD:" / "OS:" / "[+]"
// lines never start with a number, so they are never headers.
const DX_HEADER_RX = /^\s*(?:\*\*|__)?\s*\d{1,2}[.)]\s+\S/;
// "Plan", "Plan:", "**Plan**", "Plan: Eylea OD" — not "Plan discussed …" inside a diagnosis block.
const PLAN_HEADING_RX = /^\s*(?:\*\*|__)?\s*plan\s*(?:\*\*|__)?\s*(?::|$)/i;
function isDiagnosisHeaderLine(line) {
  return DX_HEADER_RX.test(String(line || ""));
}
/**
 * Note text → display lines [{ text, header }] for the hub screen. Header lines lose their
 * "**" markers (they render bold anyway). Every other line is returned as-is. The input is
 * never modified, and nothing here is used by any copy path (see copyableNoteText).
 */
function noteDisplayLines(text) {
  if (text == null || text === "") return [];
  let inPlan = false;
  return String(text).split("\n").map((line) => {
    if (!inPlan && PLAN_HEADING_RX.test(line)) inPlan = true;
    const header = !inPlan && isDiagnosisHeaderLine(line);
    return { text: header ? line.replace(/\*\*/g, "") : line, header };
  });
}

// ── Dual-coverage note line — SCREEN ONLY (Oct 17 2026) ─────────────────────
// The server's data.coverage cards (routes/notes.js dualSideCard) may carry
// `dualNote` ("No combined primary + secondary rule on file for this pair — …").
// Returns one entry per card: the note to show as a small muted line under that
// card, or null. A dual pair is a "primary" card followed by its "secondary"
// card; the note goes under the secondary card, or under the card that carries
// it when there is no secondary card after it. Shown once per pair. Cards are
// never modified, and nothing here is used by any copy path (see copyableNoteText).
function coverageCardNotes(cards) {
  const list = Array.isArray(cards) ? cards : [];
  const out = list.map(() => null);
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    const note = c && typeof c.dualNote === "string" ? c.dualNote.trim() : "";
    if (!note) continue;
    const next = list[i + 1];
    const at = (c.role === "primary" && next && next.role === "secondary") ? i + 1 : i;
    if (!out[at]) out[at] = note;
  }
  return out;
}

export { parseResponse, isEyeCode, EM_LABELS, getEmLabel, calcGlobalPeriodContext, calcPlaquenilDose, isIcdWarning, copyableIcdText, copyableNoteText, isDiagnosisHeaderLine, noteDisplayLines, coverageCardNotes };

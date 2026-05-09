import { useState, useCallback, useEffect } from "react";

// ── Styles (matches App.jsx theme) ─────────────────────────────────
const S = {
  bg: "#0f172a",
  card: "#1e293b",
  border: "#334155",
  muted: "#64748b",
  text: "#e2e8f0",
  bright: "#f1f5f9",
  accent: "#6366f1",
  accentLight: "#a5b4fc",
  green: "#4ade80",
  amber: "#f59e0b",
  font: "Georgia, serif",
  mono: "monospace",
};

// ── Drug database with trade/generic names and cap colors ──────────
const DRUG_DB = [
  // Steroids (pink)
  { trade: "Pred Forte", generic: "prednisolone acetate", cap: "#E91E8C", capName: "pink", cls: "steroid" },
  { trade: "Prednisolone", generic: "prednisolone acetate", cap: "#E91E8C", capName: "pink", cls: "steroid" },
  { trade: "Omnipred", generic: "prednisolone acetate", cap: "#E91E8C", capName: "pink", cls: "steroid" },
  { trade: "Durezol", generic: "difluprednate", cap: "#E91E8C", capName: "pink", cls: "steroid" },
  { trade: "Lotemax", generic: "loteprednol", cap: "#E91E8C", capName: "pink", cls: "steroid" },
  { trade: "FML", generic: "fluorometholone", cap: "#E91E8C", capName: "pink", cls: "steroid" },
  { trade: "Maxidex", generic: "dexamethasone", cap: "#E91E8C", capName: "pink", cls: "steroid" },
  // Antibiotics (tan)
  { trade: "Vigamox", generic: "moxifloxacin", cap: "#D2B48C", capName: "tan", cls: "antibiotic" },
  { trade: "Moxifloxacin", generic: "moxifloxacin", cap: "#D2B48C", capName: "tan", cls: "antibiotic" },
  { trade: "Besivance", generic: "besifloxacin", cap: "#D2B48C", capName: "tan", cls: "antibiotic" },
  { trade: "Ofloxacin", generic: "ofloxacin", cap: "#D2B48C", capName: "tan", cls: "antibiotic" },
  { trade: "Ocuflox", generic: "ofloxacin", cap: "#D2B48C", capName: "tan", cls: "antibiotic" },
  { trade: "Polytrim", generic: "polymyxin-trimethoprim", cap: "#D2B48C", capName: "tan", cls: "antibiotic" },
  { trade: "Tobramycin", generic: "tobramycin", cap: "#D2B48C", capName: "tan", cls: "antibiotic" },
  { trade: "Ciloxan", generic: "ciprofloxacin", cap: "#D2B48C", capName: "tan", cls: "antibiotic" },
  // NSAIDs (gray)
  { trade: "Prolensa", generic: "bromfenac", cap: "#808080", capName: "gray", cls: "nsaid" },
  { trade: "Bromfenac", generic: "bromfenac", cap: "#808080", capName: "gray", cls: "nsaid" },
  { trade: "Nevanac", generic: "nepafenac", cap: "#808080", capName: "gray", cls: "nsaid" },
  { trade: "Acular", generic: "ketorolac", cap: "#808080", capName: "gray", cls: "nsaid" },
  { trade: "Ketorolac", generic: "ketorolac", cap: "#808080", capName: "gray", cls: "nsaid" },
  { trade: "Ilevro", generic: "nepafenac", cap: "#808080", capName: "gray", cls: "nsaid" },
  // Beta-blockers (yellow)
  { trade: "Timolol", generic: "timolol", cap: "#DAA520", capName: "yellow", cls: "beta-blocker" },
  { trade: "Timoptic", generic: "timolol", cap: "#DAA520", capName: "yellow", cls: "beta-blocker" },
  { trade: "Betimol", generic: "timolol", cap: "#DAA520", capName: "yellow", cls: "beta-blocker" },
  { trade: "Betoptic", generic: "betaxolol", cap: "#DAA520", capName: "yellow", cls: "beta-blocker" },
  // Prostaglandins (teal)
  { trade: "Xalatan", generic: "latanoprost", cap: "#008080", capName: "teal", cls: "prostaglandin" },
  { trade: "Latanoprost", generic: "latanoprost", cap: "#008080", capName: "teal", cls: "prostaglandin" },
  { trade: "Lumigan", generic: "bimatoprost", cap: "#008080", capName: "teal", cls: "prostaglandin" },
  { trade: "Bimatoprost", generic: "bimatoprost", cap: "#008080", capName: "teal", cls: "prostaglandin" },
  { trade: "Travatan", generic: "travoprost", cap: "#008080", capName: "teal", cls: "prostaglandin" },
  { trade: "Travoprost", generic: "travoprost", cap: "#008080", capName: "teal", cls: "prostaglandin" },
  { trade: "Vyzulta", generic: "latanoprostene bunod", cap: "#008080", capName: "teal", cls: "prostaglandin" },
  { trade: "Zioptan", generic: "tafluprost", cap: "#008080", capName: "teal", cls: "prostaglandin" },
  // Combos (navy)
  { trade: "Cosopt", generic: "dorzolamide-timolol", cap: "#1B2A5C", capName: "navy", cls: "combo" },
  { trade: "Combigan", generic: "brimonidine-timolol", cap: "#1B2A5C", capName: "navy", cls: "combo" },
  // Carbonic anhydrase inhibitors (orange)
  { trade: "Trusopt", generic: "dorzolamide", cap: "#E87500", capName: "orange", cls: "cai" },
  { trade: "Dorzolamide", generic: "dorzolamide", cap: "#E87500", capName: "orange", cls: "cai" },
  { trade: "Azopt", generic: "brinzolamide", cap: "#E87500", capName: "orange", cls: "cai" },
  { trade: "Brinzolamide", generic: "brinzolamide", cap: "#E87500", capName: "orange", cls: "cai" },
  // Alpha-agonists (purple)
  { trade: "Alphagan", generic: "brimonidine", cap: "#7B2D8B", capName: "purple", cls: "alpha-agonist" },
  { trade: "Brimonidine", generic: "brimonidine", cap: "#7B2D8B", capName: "purple", cls: "alpha-agonist" },
  // Rho-kinase inhibitors (white)
  { trade: "Rhopressa", generic: "netarsudil", cap: "#FFFFFF", capName: "white", cls: "rock-inhibitor" },
  { trade: "Rocklatan", generic: "netarsudil-latanoprost", cap: "#FFFFFF", capName: "white", cls: "rock-inhibitor" },
  // Miotics (dark green)
  { trade: "Pilocarpine", generic: "pilocarpine", cap: "#1B5E20", capName: "dark green", cls: "miotic" },
  { trade: "Isopto Carpine", generic: "pilocarpine", cap: "#1B5E20", capName: "dark green", cls: "miotic" },
  // Mydriatics/Cycloplegics (red)
  { trade: "Atropine", generic: "atropine", cap: "#CC2222", capName: "red", cls: "mydriatic" },
  { trade: "Cyclopentolate", generic: "cyclopentolate", cap: "#CC2222", capName: "red", cls: "mydriatic" },
  { trade: "Homatropine", generic: "homatropine", cap: "#CC2222", capName: "red", cls: "mydriatic" },
  // Ointments
  { trade: "Maxitrol", generic: "neomycin-polymyxin-dexamethasone", cap: "#E91E8C", capName: "pink", cls: "steroid", isOintment: true },
  { trade: "Tobradex", generic: "tobramycin-dexamethasone", cap: "#D2B48C", capName: "tan", cls: "antibiotic", isOintment: true },
  { trade: "Erythromycin", generic: "erythromycin", cap: "#D2B48C", capName: "tan", cls: "antibiotic", isOintment: true },
  { trade: "Bacitracin", generic: "bacitracin", cap: "#D2B48C", capName: "tan", cls: "antibiotic", isOintment: true },
];

// ── Parse schedule string ──────────────────────────────────────────
// Input like "QID x1wk, TID x1wk, BID x1wk, QD x1wk"
// Returns array: [{ freq: 4, weeks: 1 }, { freq: 3, weeks: 1 }, ...]
function parseSchedule(str) {
  const freqMap = {
    qid: 4, tid: 3, bid: 2, qd: 1, qhs: 1, daily: 1,
    "4x": 4, "3x": 3, "2x": 2, "1x": 1,
    "4 times": 4, "3 times": 3, "2 times": 2, "once": 1,
  };

  const parts = str.toLowerCase().split(/[,;→>]+/).map(p => p.trim()).filter(Boolean);
  const schedule = [];

  for (const part of parts) {
    if (part === "stop" || part === "discontinue") break;

    let freq = null;
    let weeks = null; // null = ongoing (no time limit specified)
    let isQhs = false;

    // Check for frequency
    for (const [key, val] of Object.entries(freqMap)) {
      if (part.includes(key)) {
        freq = val;
        if (key === "qhs") isQhs = true;
        break;
      }
    }

    // Check for weeks or days
    const weekMatch = part.match(/(\d+)\s*w/);
    const dayMatch = part.match(/(\d+)\s*d(?:ay)?/);
    if (weekMatch) {
      weeks = parseInt(weekMatch[1]);
    } else if (dayMatch) {
      // Convert days to fractional weeks (round up: 4 days ≈ 1 week for display)
      const days = parseInt(dayMatch[1]);
      weeks = Math.ceil(days / 7) || 1;
    }

    if (freq !== null) {
      schedule.push({ freq, weeks, isQhs });
    }
  }

  // If nothing parsed, try simpler: just a single frequency (ongoing)
  if (schedule.length === 0) {
    const s = str.toLowerCase().trim();
    for (const [key, val] of Object.entries(freqMap)) {
      if (s.includes(key)) {
        return [{ freq: val, weeks: null, isQhs: key === "qhs" }];
      }
    }
    // Default
    return [{ freq: 1, weeks: null, isQhs: false }];
  }

  return schedule;
}

// ── Map frequency to time slots ────────────────────────────────────
function freqToSlots(freq, isQhs) {
  if (isQhs) return ["bedtime"];
  switch (freq) {
    case 4: return ["morning", "lunch", "dinner", "bedtime"];
    case 3: return ["morning", "lunch", "bedtime"];
    case 2: return ["morning", "bedtime"];
    case 1: return ["morning"];
    default: return ["morning"];
  }
}

const SLOT_LABELS = {
  morning: { label: "Morning", icon: "☀️" },
  lunch: { label: "Lunch", icon: "🌤️" },
  dinner: { label: "Dinner", icon: "🌅" },
  bedtime: { label: "Bedtime", icon: "🌙" },
};

// ── Multi-language translations for output ─────────────────────────
const TRANSLATIONS = {
  en: {
    title: "Your Eye Drop Schedule",
    subtitle: "Check off each medication after you use it",
    rightEye: "Right Eye (OD)",
    leftEye: "Left Eye (OS)",
    week: "Week",
    morning: "Morning",
    lunch: "Lunch",
    dinner: "Dinner",
    bedtime: "Bedtime",
    drop: "instill 1 drop",
    ointment: "apply ointment",
    capGuide: "Cap color guide",
    pink: "pink", tan: "tan", gray: "gray", yellow: "yellow", teal: "teal",
    navy: "navy", orange: "orange", purple: "purple", white: "white",
    "dark green": "dark green", red: "red",
  },
  es: {
    title: "Su Horario de Gotas para los Ojos",
    subtitle: "Marque cada medicamento después de usarlo",
    rightEye: "Ojo Derecho (OD)",
    leftEye: "Ojo Izquierdo (OS)",
    week: "Semana",
    morning: "Mañana",
    lunch: "Mediodía",
    dinner: "Cena",
    bedtime: "Noche (antes de dormir)",
    drop: "poner 1 gota",
    ointment: "aplicar pomada",
    capGuide: "Guía de colores de tapa",
    pink: "rosado", tan: "marrón claro", gray: "gris", yellow: "amarillo", teal: "verde azulado",
    navy: "azul marino", orange: "anaranjado", purple: "morado", white: "blanco",
    "dark green": "verde oscuro", red: "rojo",
  },
  vi: {
    title: "Lịch Nhỏ Thuốc Mắt Của Bạn",
    subtitle: "Đánh dấu mỗi loại thuốc sau khi dùng",
    rightEye: "Mắt Phải (OD)",
    leftEye: "Mắt Trái (OS)",
    week: "Tuần",
    morning: "Sáng",
    lunch: "Trưa",
    dinner: "Chiều",
    bedtime: "Tối (trước khi ngủ)",
    drop: "nhỏ 1 giọt",
    ointment: "bôi thuốc mỡ",
    capGuide: "Hướng dẫn màu nắp",
    pink: "hồng", tan: "nâu nhạt", gray: "xám", yellow: "vàng", teal: "xanh ngọc",
    navy: "xanh đậm", orange: "cam", purple: "tím", white: "trắng",
    "dark green": "xanh lá đậm", red: "đỏ",
  },
  pt: {
    title: "Seu Horário de Colírios",
    subtitle: "Marque cada medicamento após usá-lo",
    rightEye: "Olho Direito (OD)",
    leftEye: "Olho Esquerdo (OS)",
    week: "Semana",
    morning: "Manhã",
    lunch: "Almoço",
    dinner: "Jantar",
    bedtime: "Noite (antes de dormir)",
    drop: "pingar 1 gota",
    ointment: "aplicar pomada",
    capGuide: "Guia de cores da tampa",
    pink: "rosa", tan: "bege", gray: "cinza", yellow: "amarelo", teal: "azul-petróleo",
    navy: "azul marinho", orange: "laranja", purple: "roxo", white: "branco",
    "dark green": "verde escuro", red: "vermelho",
  },
};

// ── Lookup drug by name ────────────────────────────────────────────
function lookupDrug(name) {
  const q = name.toLowerCase().trim();
  return DRUG_DB.find(
    (d) => d.trade.toLowerCase() === q || d.generic.toLowerCase() === q ||
           d.trade.toLowerCase().startsWith(q) || d.generic.toLowerCase().startsWith(q)
  );
}

// ── Component ──────────────────────────────────────────────────────
export default function DropSchedule({ onBack, initialLang = "en", initialDrops = [] }) {
  const [meds, setMeds] = useState([]);
  const [medName, setMedName] = useState("");
  const [medType, setMedType] = useState("drop"); // drop or ointment
  const [medEye, setMedEye] = useState("OU"); // OD, OS, OU
  const [medSchedule, setMedSchedule] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [printLang, setPrintLang] = useState(initialLang); // language for printed output

  // Auto-populate meds from initialDrops (from auto-education matcher)
  useEffect(() => {
    if (initialDrops && initialDrops.length > 0 && meds.length === 0) {
      const populated = initialDrops.map((d, i) => {
        const drug = lookupDrug(d.name);
        const schedule = parseSchedule(d.schedule || "QD");
        return {
          id: Date.now() + i,
          name: d.name,
          trade: drug ? drug.trade : d.name,
          generic: drug ? drug.generic : "",
          cap: drug ? drug.cap : "#CCCCCC",
          capName: drug ? drug.capName : "unknown",
          type: drug?.isOintment ? "ointment" : "drop",
          eye: (d.eye || "OU").toUpperCase(),
          schedule,
        };
      });
      setMeds(populated);
      setShowPreview(true);
    }
  }, [initialDrops]); // eslint-disable-line react-hooks/exhaustive-deps

  const detectedDrug = medName.trim() ? lookupDrug(medName) : null;

  const addMed = () => {
    if (!medName.trim() || !medSchedule.trim()) return;

    const drug = lookupDrug(medName);
    const schedule = parseSchedule(medSchedule);

    const newMed = {
      id: Date.now(),
      name: medName.trim(),
      trade: drug ? drug.trade : medName.trim(),
      generic: drug ? drug.generic : "",
      cap: drug ? drug.cap : "#CCCCCC",
      capName: drug ? drug.capName : "unknown",
      type: drug?.isOintment ? "ointment" : medType,
      eye: medEye,
      schedule,
    };

    setMeds([...meds, newMed]);
    setMedName("");
    setMedSchedule("");
    setMedType("drop");
    setMedEye("OU");
  };

  const removeMed = (id) => setMeds(meds.filter((m) => m.id !== id));

  // Build the weekly schedule for OD and OS
  const buildWeeklySchedule = useCallback(() => {
    // Find max weeks from meds that have explicit durations (tapers)
    // Ongoing meds (weeks: null) don't define the max — they persist across all weeks
    const maxWeeks = meds.reduce((max, m) => {
      const totalWks = m.schedule.reduce((s, p) => s + (p.weeks || 0), 0);
      // If a med has ALL null weeks (ongoing), it doesn't set the timeline
      const hasExplicitDuration = m.schedule.some(p => p.weeks !== null);
      return hasExplicitDuration ? Math.max(max, totalWks) : max;
    }, 1); // minimum 1 week

    const weeks = [];
    for (let w = 0; w < maxWeeks; w++) {
      const od = { morning: [], lunch: [], dinner: [], bedtime: [] };
      const os = { morning: [], lunch: [], dinner: [], bedtime: [] };

      for (const med of meds) {
        // Determine which frequency applies this week
        let weekCounter = 0;
        let activeFreq = null;
        let activeIsQhs = false;

        for (const seg of med.schedule) {
          if (seg.weeks === null) {
            // Ongoing — active for ALL weeks
            activeFreq = seg.freq;
            activeIsQhs = seg.isQhs;
            break;
          }
          if (w < weekCounter + seg.weeks) {
            activeFreq = seg.freq;
            activeIsQhs = seg.isQhs;
            break;
          }
          weekCounter += seg.weeks;
        }
        if (activeFreq === null) continue; // med stopped (taper ended)

        const slots = freqToSlots(activeFreq, activeIsQhs);
        const entry = { trade: med.trade, generic: med.generic, cap: med.cap, capName: med.capName, type: med.type };

        for (const slot of slots) {
          if (med.eye === "OD" || med.eye === "OU") od[slot].push(entry);
          if (med.eye === "OS" || med.eye === "OU") os[slot].push(entry);
        }
      }

      weeks.push({ od, os, weekNum: w + 1 });
    }

    return weeks;
  }, [meds]);

  // Print function
  const handlePrint = () => {
    const weeks = buildWeeklySchedule();
    const html = generatePrintHTML(weeks, printLang);
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  // PDF download
  const handlePDF = () => {
    const weeks = buildWeeklySchedule();
    const html = generatePrintHTML(weeks, printLang);
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  const weeks = meds.length > 0 ? buildWeeklySchedule() : [];

  return (
    <div style={{ minHeight: "100vh", background: S.bg, fontFamily: S.font, color: S.text }}>
      {/* Header */}
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{ background: "none", border: `1px solid ${S.border}`, borderRadius: 8, padding: "6px 14px", color: S.muted, fontFamily: S.font, fontSize: "0.78rem", cursor: "pointer" }}>&larr; Back</button>
        <span style={{ fontSize: "1rem", fontWeight: 700, color: S.bright }}>Drop / Medication Schedule</span>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "20px" }}>
        {/* Input form */}
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: "20px", marginBottom: 20 }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: S.bright, marginBottom: 14 }}>Add medication</div>

          {/* Row 1: Name + Type */}
          <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <input
              value={medName}
              onChange={(e) => setMedName(e.target.value)}
              placeholder="Medication name (e.g., Prednisolone, Cosopt, Maxitrol)"
              style={{ flex: 2, minWidth: 200, background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 14px", color: S.text, fontFamily: S.font, fontSize: "0.85rem" }}
            />
            <select
              value={medType}
              onChange={(e) => setMedType(e.target.value)}
              style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 14px", color: S.text, fontFamily: S.font, fontSize: "0.85rem" }}
            >
              <option value="drop">Drop</option>
              <option value="ointment">Ointment</option>
            </select>
            <select
              value={medEye}
              onChange={(e) => setMedEye(e.target.value)}
              style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 14px", color: S.text, fontFamily: S.font, fontSize: "0.85rem" }}
            >
              <option value="OU">Both eyes (OU)</option>
              <option value="OD">Right eye (OD)</option>
              <option value="OS">Left eye (OS)</option>
            </select>
          </div>

          {/* Row 2: Schedule */}
          <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <input
              value={medSchedule}
              onChange={(e) => setMedSchedule(e.target.value)}
              placeholder="Schedule (e.g., QID x1wk, TID x1wk, BID x1wk, QD x1wk)"
              style={{ flex: 1, minWidth: 300, background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 14px", color: S.text, fontFamily: S.font, fontSize: "0.85rem" }}
              onKeyDown={(e) => { if (e.key === "Enter") addMed(); }}
            />
          </div>

          {/* Auto-detected cap color */}
          {detectedDrug && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ width: 18, height: 18, borderRadius: "50%", background: detectedDrug.cap, border: detectedDrug.cap === "#FFFFFF" ? "2px solid #999" : "2px solid rgba(0,0,0,0.2)", display: "inline-block" }}></span>
              <span style={{ fontSize: "0.78rem", color: S.muted }}>
                {detectedDrug.capName} cap — {detectedDrug.trade} ({detectedDrug.generic})
                {detectedDrug.isOintment ? " — ointment" : ""}
              </span>
            </div>
          )}

          <button
            onClick={addMed}
            disabled={!medName.trim() || !medSchedule.trim()}
            style={{
              background: medName.trim() && medSchedule.trim() ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : S.border,
              color: medName.trim() && medSchedule.trim() ? "#fff" : S.muted,
              border: "none", borderRadius: 8, padding: "10px 24px", fontSize: "0.82rem", fontFamily: S.font, fontWeight: 600, cursor: medName.trim() && medSchedule.trim() ? "pointer" : "default"
            }}
          >
            + Add Medication
          </button>
        </div>

        {/* Added medications list */}
        {meds.length > 0 && (
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: "20px", marginBottom: 20 }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: S.bright, marginBottom: 12 }}>Medications added ({meds.length})</div>
            {meds.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: "8px 12px", background: S.bg, borderRadius: 8 }}>
                <span style={{ width: 18, height: 18, borderRadius: "50%", background: m.cap, border: m.cap === "#FFFFFF" ? "2px solid #999" : "2px solid rgba(0,0,0,0.2)", flexShrink: 0 }}></span>
                <span style={{ flex: 1, fontSize: "0.82rem", color: S.text }}>
                  <strong>{m.trade}</strong>
                  {m.generic && <span style={{ color: S.muted }}> ({m.generic})</span>}
                  {" — "}{m.eye}{" — "}
                  {m.type === "ointment" ? "ointment" : "drop"}{" — "}
                  {m.schedule.map((seg, i) => `${["QD","BID","TID","QID"][seg.freq-1]}${seg.isQhs ? " QHS" : ""} x${seg.weeks}wk`).join(" → ")}
                </span>
                <button onClick={() => removeMed(m.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "1rem", padding: "2px 6px" }}>✕</button>
              </div>
            ))}

            {/* Language selector for print output */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, marginBottom: 10 }}>
              <span style={{ fontSize: "0.75rem", color: S.muted }}>Print language:</span>
              {["en", "es", "vi", "pt"].map((l) => (
                <button
                  key={l}
                  onClick={() => setPrintLang(l)}
                  style={{
                    background: printLang === l ? S.green : "transparent",
                    color: printLang === l ? "#000" : S.muted,
                    border: `1px solid ${printLang === l ? S.green : S.border}`,
                    borderRadius: 6, padding: "4px 10px", fontSize: "0.7rem",
                    fontFamily: S.mono, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowPreview(!showPreview)}
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: "0.82rem", fontFamily: S.font, fontWeight: 600, cursor: "pointer" }}
              >
                {showPreview ? "Hide Preview" : "Preview Schedule"}
              </button>
              <button
                onClick={handlePrint}
                style={{ background: "linear-gradient(135deg,#059669,#10b981)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: "0.82rem", fontFamily: S.font, fontWeight: 600, cursor: "pointer" }}
              >
                Print ({printLang.toUpperCase()})
              </button>
              <button
                onClick={handlePDF}
                style={{ background: "linear-gradient(135deg,#d97706,#f59e0b)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: "0.82rem", fontFamily: S.font, fontWeight: 600, cursor: "pointer" }}
              >
                PDF ({printLang.toUpperCase()})
              </button>
            </div>
          </div>
        )}

        {/* Preview */}
        {showPreview && weeks.length > 0 && (
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: "20px" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: S.bright, marginBottom: 16 }}>Schedule Preview</div>
            {weeks.map((week) => (
              <WeekPreview key={week.weekNum} week={week} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Week Preview sub-component ─────────────────────────────────────
function WeekPreview({ week }) {
  const hasOD = Object.values(week.od).some((arr) => arr.length > 0);
  const hasOS = Object.values(week.os).some((arr) => arr.length > 0);

  if (!hasOD && !hasOS) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: "0.9rem", fontWeight: 700, color: S.bright, marginBottom: 10, borderBottom: `1px solid ${S.border}`, paddingBottom: 6 }}>
        Week {week.weekNum}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: hasOD && hasOS ? "1fr 1fr" : "1fr", gap: 16 }}>
        {hasOD && (
          <div>
            <div style={{ textAlign: "center", padding: "6px", background: "#1e3a5f", borderRadius: 8, marginBottom: 10 }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#93c5fd" }}>Right Eye (OD)</span>
            </div>
            {["morning", "lunch", "dinner", "bedtime"].map((slot) => (
              week.od[slot].length > 0 && (
                <SlotPreview key={slot} slot={slot} meds={week.od[slot]} />
              )
            ))}
          </div>
        )}
        {hasOS && (
          <div>
            <div style={{ textAlign: "center", padding: "6px", background: "#1e3b2e", borderRadius: 8, marginBottom: 10 }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#86efac" }}>Left Eye (OS)</span>
            </div>
            {["morning", "lunch", "dinner", "bedtime"].map((slot) => (
              week.os[slot].length > 0 && (
                <SlotPreview key={slot} slot={slot} meds={week.os[slot]} />
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Slot Preview sub-component ─────────────────────────────────────
function SlotPreview({ slot, meds }) {
  const info = SLOT_LABELS[slot];
  return (
    <div style={{ marginBottom: 8, padding: "8px 10px", border: `1px solid ${S.border}`, borderRadius: 8 }}>
      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: S.amber, marginBottom: 4 }}>{info.icon} {info.label}</div>
      {meds.map((m, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ width: 14, height: 14, borderRadius: "50%", background: m.cap, border: m.cap === "#FFFFFF" ? "1px solid #999" : "1px solid rgba(0,0,0,0.2)", flexShrink: 0 }}></span>
          <span style={{ fontSize: "0.78rem", color: S.text }}>{m.trade}</span>
          <span style={{ fontSize: "0.65rem", color: S.muted }}>({m.generic})</span>
          <span style={{ fontSize: "0.65rem", color: S.muted, marginLeft: "auto" }}>{m.type === "ointment" ? "apply" : "1 drop"}</span>
        </div>
      ))}
    </div>
  );
}

// ── Generate print-friendly HTML ───────────────────────────────────
function generatePrintHTML(weeks, lang = "en") {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const n = weeks.length; // number of weeks determines scaling

  // Dynamic sizing: fewer weeks = bigger, more weeks = smaller
  const s = n <= 1 ? { body: 18, h1: 28, h2: 22, sub: 14, subMb: 20, colH: 22, colP: 10, slotP: "12px 14px", slotMb: 10, slotL: 20, slotLmb: 8, medG: 6, cap: 24, name: 18, gen: 14, capL: 13, act: 14, cb: 22, legMt: 20, legPt: 12, legFs: 14, legDot: 14, h2mt: 24, h2mb: 10, gap: 20, colMb: 12, bodyP: 24, printP: 12 }
       : n <= 2 ? { body: 15, h1: 24, h2: 18, sub: 12, subMb: 14, colH: 18, colP: 8, slotP: "8px 10px", slotMb: 8, slotL: 17, slotLmb: 6, medG: 5, cap: 20, name: 15, gen: 12, capL: 11, act: 12, cb: 20, legMt: 14, legPt: 8, legFs: 12, legDot: 13, h2mt: 16, h2mb: 8, gap: 16, colMb: 10, bodyP: 18, printP: 10 }
       : n <= 3 ? { body: 12, h1: 20, h2: 14, sub: 10, subMb: 8, colH: 14, colP: 5, slotP: "5px 7px", slotMb: 4, slotL: 13, slotLmb: 3, medG: 4, cap: 16, name: 12, gen: 10, capL: 9, act: 10, cb: 16, legMt: 8, legPt: 5, legFs: 10, legDot: 11, h2mt: 8, h2mb: 4, gap: 10, colMb: 5, bodyP: 12, printP: 8 }
       :           { body: 10, h1: 16, h2: 12, sub: 9, subMb: 6, colH: 12, colP: 4, slotP: "4px 6px", slotMb: 3, slotL: 11, slotLmb: 2, medG: 3, cap: 14, name: 10, gen: 9, capL: 8, act: 9, cb: 14, legMt: 6, legPt: 4, legFs: 9, legDot: 10, h2mt: 6, h2mb: 3, gap: 8, colMb: 4, bodyP: 8, printP: 6 };

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t.title}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Georgia, serif; font-size: ${s.body}px; color: #111; padding: ${s.bodyP}px; }
h1 { font-size: ${s.h1}px; text-align: center; margin-bottom: 3px; }
h2 { font-size: ${s.h2}px; margin: ${s.h2mt}px 0 ${s.h2mb}px; border-bottom: 1.5px solid #333; padding-bottom: 2px; }
.cols { display: flex; gap: ${s.gap}px; }
.col { flex: 1; }
.col-header { text-align: center; font-size: ${s.colH}px; font-weight: 700; padding: ${s.colP}px; border-radius: 8px; margin-bottom: ${s.colMb}px; }
.col-od .col-header { background: #dbeafe; color: #1e3a8a; }
.col-os .col-header { background: #dcfce7; color: #166534; }
.slot { border: 1.5px solid #ddd; border-radius: 8px; padding: ${s.slotP}; margin-bottom: ${s.slotMb}px; }
.slot-label { font-size: ${s.slotL}px; font-weight: 700; margin-bottom: ${s.slotLmb}px; }
.med-row { display: flex; align-items: center; gap: ${s.medG}px; margin-bottom: ${Math.max(s.medG - 1, 2)}px; }
.cap-circle { width: ${s.cap}px; height: ${s.cap}px; border-radius: 50%; flex-shrink: 0; border: 2px solid rgba(0,0,0,0.2); }
.med-name { font-size: ${s.name}px; font-weight: 600; }
.med-generic { font-size: ${s.gen}px; color: #666; }
.med-cap-label { font-size: ${s.capL}px; color: #888; font-style: italic; }
.med-action { font-size: ${s.act}px; color: #444; margin-left: auto; }
.checkbox { width: ${s.cb}px; height: ${s.cb}px; border: 2px solid #666; border-radius: 4px; flex-shrink: 0; }
.legend { margin-top: ${s.legMt}px; padding-top: ${s.legPt}px; border-top: 1px solid #ccc; font-size: ${s.legFs}px; color: #555; }
.legend-item { display: inline-flex; align-items: center; gap: 4px; margin-right: 12px; margin-bottom: 2px; }
.legend-dot { width: ${s.legDot}px; height: ${s.legDot}px; border-radius: 50%; }
@media print { body { padding: ${s.printP}px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; } }
</style></head><body>
<h1>${t.title}</h1>
<p style="text-align:center;font-size:${s.sub}px;color:#666;margin-bottom:${s.subMb}px;">${t.subtitle}</p>`;

  for (const week of weeks) {
    const hasOD = Object.values(week.od).some((a) => a.length > 0);
    const hasOS = Object.values(week.os).some((a) => a.length > 0);
    if (!hasOD && !hasOS) continue;

    html += `<h2>${t.week} ${week.weekNum}</h2><div class="cols">`;

    if (hasOD) {
      html += `<div class="col col-od"><div class="col-header">${t.rightEye}</div>`;
      html += renderPrintSlots(week.od, t);
      html += `</div>`;
    }
    if (hasOS) {
      html += `<div class="col col-os"><div class="col-header">${t.leftEye}</div>`;
      html += renderPrintSlots(week.os, t);
      html += `</div>`;
    }

    html += `</div>`;
  }

  // Legend
  const allCaps = new Map();
  for (const week of weeks) {
    for (const eye of [week.od, week.os]) {
      for (const slot of Object.values(eye)) {
        for (const m of slot) {
          allCaps.set(m.capName, m.cap);
        }
      }
    }
  }
  html += `<div class="legend"><strong>${t.capGuide}:</strong><br>`;
  for (const [name, color] of allCaps) {
    const border = color === "#FFFFFF" ? "border:1px solid #999;" : "";
    const translatedColor = t[name] || name;
    html += `<span class="legend-item"><span class="legend-dot" style="background:${color};${border}"></span>${translatedColor}</span>`;
  }
  html += `</div>`;

  html += `</body></html>`;
  return html;
}

function renderPrintSlots(eye, t) {
  const slotKeys = ["morning", "lunch", "dinner", "bedtime"];
  let html = "";
  for (const slot of slotKeys) {
    if (eye[slot].length === 0) continue;
    html += `<div class="slot"><div class="slot-label">${t[slot]}</div>`;
    for (const m of eye[slot]) {
      const border = m.cap === "#FFFFFF" ? "border:2px solid #999;" : "";
      const translatedColor = t[m.capName] || m.capName;
      html += `<div class="med-row">
        <span class="cap-circle" style="background:${m.cap};${border}"></span>
        <div><span class="med-name">${m.trade}</span><br><span class="med-generic">${m.generic}</span><br><span class="med-cap-label">(${translatedColor})</span></div>
        <span class="med-action">${m.type === "ointment" ? t.ointment : t.drop}</span>
        <span class="checkbox"></span>
      </div>`;
    }
    html += `</div>`;
  }
  return html;
}

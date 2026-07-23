import { useState, useCallback, useEffect, useRef } from "react";
import { AICodingAssistant } from "./CptReference.jsx";
import RateComparison from "./RateComparison.jsx";
import PatientEducation from "./PatientEducation.jsx";
import DropSchedule from "./DropSchedule.jsx";
import OpNoteDictator from "./OpNoteDictator.jsx";
import { detectLanguage, matchHandouts, detectDropsFromPlan, generateEducationPrintHTML } from "./NoteEducationMatcher.jsx";
import { DEFAULT_EXAMPLES, DEFAULT_INLINE_RULES, DEFAULT_PLAN_RULES } from "./data/noteExamples.js";
import { parseResponse, isEyeCode, getEmLabel, calcGlobalPeriodContext, calcPlaquenilDose } from "./lib/noteHelpers.js";

const API_BASE = import.meta.env.VITE_API_BASE || "https://op-note-dictator-server-production.up.railway.app";


// ── Styles ──────────────────────────────────────────────────────────
const S = {
  bg: "#0f172a", card: "#1e293b", border: "#334155", muted: "#64748b",
  text: "#e2e8f0", bright: "#f1f5f9", accent: "#6366f1", accentLight: "#a5b4fc",
  green: "#4ade80", greenDark: "#166534", amber: "#f59e0b",
  font: "Georgia, serif", mono: "monospace",
};

// ── PBM/Valeda ICD-10 + billing modifier mapping (added July 2026) ───
// VRA policy: intermediate dry AMD ONLY for now (practice VA range 20/40–20/70).
// Non-foveal GA + drusen is a FUTURE toggle — the mapping is ready below but is NOT
// wired to any UI control. Do not expose it until Mari enables it.
const PBM_ICD_INTERMEDIATE = { OD: "H35.3112", OS: "H35.3122", OU: "H35.3132" };
const PBM_ICD_GA_FUTURE = { OD: "H35.3113", OS: "H35.3123", OU: "H35.3133" }; // NOT enabled — future toggle only
const PBM_CPT_MODIFIER = { OD: "-RT", OS: "-LT", OU: "-50" };

// ── Deterministic PBM session note builder (no AI call) ───────────────
// The Procedure and Tolerance lines are ALWAYS present, regardless of which
// optional fields (BCVA, cumulative count, next session) were captured.
function buildPbmNote(f) {
  const icd = PBM_ICD_INTERMEDIATE[f.eye] || "";
  const eyeMod = PBM_CPT_MODIFIER[f.eye] || "";
  const gaMod = f.abn === "Y" ? "-GA" : "";
  const vaLine = f.va ? ` Baseline BCVA ${f.va} (initiation examination).` : "";
  const cumLine = f.cumulative ? `, cumulative treatment ${f.cumulative} for this eye` : "";
  const nextLine = f.next ? ` Next session: ${f.next}.` : "";
  const lines = [
    "PHOTOBIOMODULATION (VALEDA) — SESSION NOTE",
    "",
    `Date of service: ${f.date}`,
    `Proceduralist: ${f.proceduralist} (performed personally by the physician)`,
    `Diagnosis: Nonexudative age-related macular degeneration, intermediate dry stage, ${f.eye} — ${icd}`,
    `Indication: Intermediate dry AMD meeting treatment criteria (qualifying drusen and BCVA documented at the initiation examination; no neovascular AMD; no center-involving geographic atrophy).${vaLine} Session ${f.session} of 9${cumLine}.`,
    `Procedure: Photobiomodulation therapy of the retina, ${f.eye}, using the Valeda Light Delivery System (590/660/850 nm multiwavelength LED) delivered per manufacturer protocol.`,
    `Tolerance: ${f.tolerance}`,
    `Discharge instructions: Resume normal activities. Call the office for new flashes, floaters, curtain over vision, or vision change.${nextLine}`,
    "",
    "---BILLING---",
    `0936T${eyeMod}${gaMod} — 1 unit — ${icd}`,
    "No E/M billed today (session-day rule). If a separate unrelated problem was examined today, bill that E/M with -25 under the unrelated diagnosis only.",
  ];
  return lines.join("\n");
}


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

  // Auto-detected drops from note output
  const [autoDrops, setAutoDrops] = useState([]);
  const [autoLang, setAutoLang] = useState("en");
  const [uncheckedHandouts, setUncheckedHandouts] = useState(new Set());
  const [eduLangOverride, setEduLangOverride] = useState(null); // null = use auto-detect

  // Injection calculator
  const [lastInjDate, setLastInjDate] = useState("");
  const [fuWeeks, setFuWeeks] = useState("");

  // Voice dictation (Whisper + Haiku cleanup)
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [pendingEdit, setPendingEdit] = useState(""); // dictated edit instruction being applied
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const noteRef = useRef(null);              // the note textarea (for cursor position)
  const lastCursorRef = useRef(null);        // last cursor position in the note (null = append at end)
  const recordingPurposeRef = useRef("insert"); // "insert" (into note) | "edit" (spoken instruction) | "pbm" (session fields)
  const runRef = useRef(null);               // set below, lets dictation auto-trigger a regenerate

  // ── PBM Session mode state (added July 2026) ──────────────────────
  const [pbmEye, setPbmEye] = useState("");                 // "" | "OD" | "OS" | "OU"
  const [pbmSession, setPbmSession] = useState("");         // "1".."9"
  const [pbmCumulative, setPbmCumulative] = useState("");   // optional cumulative-per-eye count
  const [pbmDate, setPbmDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [pbmProceduralist, setPbmProceduralist] = useState(() => (surgeon && surgeon.name ? `Dr. ${surgeon.name}` : "Dr. ___"));
  const [pbmAbn, setPbmAbn] = useState("Y");                // "Y" | "N" — pre-checked per Mari's spec
  const [pbmTolerance, setPbmTolerance] = useState("Patient tolerated the procedure well; no complications.");
  const [pbmVA, setPbmVA] = useState("");                   // optional baseline BCVA (from initiation exam)
  const [pbmNext, setPbmNext] = useState("");               // optional next-session note
  const [pbmNote, setPbmNote] = useState("");               // assembled deterministic note (shown in Output tab)
  const [pbmCopied, setPbmCopied] = useState(false);
  const [pbmExtracting, setPbmExtracting] = useState(false);
  const [pbmExtractError, setPbmExtractError] = useState("");

  // Extract PBM session fields from a cleaned dictation transcript (Haiku, strict JSON).
  // Only stated fields are applied — unstated fields keep their current/default values.
  const extractPbmFields = async (text) => {
    setPbmExtracting(true);
    setPbmExtractError("");
    try {
      const resp = await fetch(`${API_BASE}/api/extract-pbm-fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
      });
      const data = await resp.json();
      if (!data.success || !data.fields) {
        setPbmExtractError(data.error || "Could not read session details from dictation.");
        return;
      }
      const f = data.fields;
      if (f.eye === "OD" || f.eye === "OS" || f.eye === "OU") setPbmEye(f.eye);
      if (f.session && Number(f.session) >= 1 && Number(f.session) <= 9) setPbmSession(String(Math.round(Number(f.session))));
      if (f.cumulative) setPbmCumulative(String(f.cumulative));
      if (f.abn === "Y" || f.abn === "N") setPbmAbn(f.abn);
      if (f.tolerance) setPbmTolerance(f.tolerance);
      if (f.va) setPbmVA(f.va);
      if (f.next) setPbmNext(f.next);
      if (f.proceduralist) setPbmProceduralist(f.proceduralist);
    } catch (e) {
      setPbmExtractError("Field extraction error: " + e.message);
    } finally {
      setPbmExtracting(false);
    }
  };

  // Deliver a finished transcript according to the recording's purpose
  const deliverTranscript = (text) => {
    if (recordingPurposeRef.current === "edit") {
      setPendingEdit(text);
      if (runRef.current) runRef.current(text); // apply the spoken edit + regenerate
      return;
    }
    if (recordingPurposeRef.current === "pbm") {
      extractPbmFields(text); // populate the PBM checklist/form from dictation
      return;
    }
    setNote(prev => {
      if (!prev) return text;
      const pos = lastCursorRef.current;
      if (pos == null || pos >= prev.length) return prev + "\n" + text; // no cursor known → append (original behavior)
      // Insert at the cursor with smart spacing
      const before = prev.slice(0, pos);
      const after = prev.slice(pos);
      const lead = before && !/\s$/.test(before) ? " " : "";
      const trail = after && !/^\s/.test(after) ? " " : "";
      lastCursorRef.current = pos + lead.length + text.length;
      return before + lead + text + trail + after;
    });
  };

  const startRecording = useCallback(async (purpose) => {
    recordingPurposeRef.current = purpose === "edit" ? "edit" : purpose === "pbm" ? "pbm" : "insert";
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
          // Step 1: Whisper transcription. Pass the recording purpose so the server
          // can use the short command-oriented prompt for "Dictate an Edit" (short
          // clips fare worse with the full note glossary). insert/pbm use the default.
          const resp = await fetch(`${API_BASE}/api/transcribe?purpose=${encodeURIComponent(recordingPurposeRef.current)}`, {
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
              deliverTranscript(finalText);
            } catch {
              // If cleanup fails, use raw transcript
              deliverTranscript(data.transcript);
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


  // ── Run ───────────────────────────────────────────────────────────
  // Optional editInstruction: a dictated spoken edit to apply during regeneration
  // (guard against React passing the click event when used as onClick={run}).
  async function run(editInstruction) {
    const edit = typeof editInstruction === "string" ? editInstruction.trim() : "";
    if (!note.trim()) return;
    setLoading(true); setError(""); setResult(null);
    try {
      // System prompt now lives server-side (server/prompts/note-generator-prompt.js, July 2026).
      // The server builds it from mode + examples + customInstructions sent below.
      const timeNote = timeSpent.trim() ? `\n\nTIME SPENT WITH PATIENT: ${timeSpent.trim()} minutes (use for time-based coding if it supports a higher E/M level than MDM alone)` : "";
      const globalContext = calcGlobalPeriodContext(note);
      const globalNote = globalContext ? `\n\n${globalContext}` : "";
      const plaquenilNote = calcPlaquenilDose(note);
      const editNote = edit ? `\n\nDICTATED EDIT INSTRUCTION — the physician spoke this change; apply it to the note content before finalizing (it is an instruction, not note text): ${edit}` : "";
      const userMessage = mode === "generate"
        ? `Expand this shorthand into a formatted A/P note with billing language:\n\n${note}${timeNote}${globalNote}${plaquenilNote}${editNote}`
        : `Optimize this existing A/P note with minimum billing language:\n\n${note}${timeNote}${globalNote}${plaquenilNote}${editNote}`;

      const res = await fetch(`${API_BASE}/api/generate-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          examples,
          customInstructions,
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
      parsed.safetyFlags = Array.isArray(data.safetyFlags) ? data.safetyFlags : [];
      setResult(parsed);
      setTab("output");
      if (edit) setPendingEdit(""); // spoken edit applied — clear the banner

      // Use deterministic ICD-10 codes from server (dictionary lookup, no Haiku)
      if (data.icd10Codes && data.icd10Codes.length > 0) {
        setIcd10Codes(data.icd10Codes);
      } else {
        setIcd10Codes([]);
      }
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }
  runRef.current = run; // lets the dictation pipeline auto-trigger a regenerate with a spoken edit

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
    const base = (code || "").replace(/[-+\s].*/g, "").trim();
    if (base === "99215" || base === "99205") return { bg: "#d1fae5", color: "#059669", border: "#059669" };
    if (base === "99214" || base === "99204") return { bg: "#dbeafe", color: "#1d4ed8", border: "#1d4ed8" };
    if (base === "99213" || base === "99203") return { bg: "#f1f5f9", color: "#475569", border: "#94a3b8" };
    if (base === "92014" || base === "92004") return { bg: "#fdf4ff", color: "#7e22ce", border: "#a855f7" };
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
          ["rates", "Rate Comparison"],
          ["inject", "Can We Inject?"],
          ["education", "Patient Ed"],
          ["evidence", "Evidence"],
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
              {[["generate", "Generate from Shorthand"], ["optimize", "Optimize Existing Note"], ["pbm", "PBM Session"]].map(([m, label]) => (
                <button key={m} onClick={() => setMode(m)} style={{
                  flex: 1, padding: "10px 12px", background: mode === m ? S.accent : S.card,
                  color: mode === m ? "#fff" : S.muted, border: "none",
                  fontFamily: S.font, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
                }}>
                  {label}
                </button>
              ))}
            </div>

            {mode !== "pbm" && (<>
            {/* Hint */}
            <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 14px", fontSize: "0.76rem", color: "#94a3b8", lineHeight: 1.6, marginBottom: 14 }}>
              <span style={{ color: S.amber, fontWeight: 700 }}>No PHI.</span>{" "}
              {mode === "generate"
                ? "Type your shorthand — the tool expands it into a formatted A/P note with billing language."
                : "Paste your structured A/P note — the tool inserts minimum billing-compliant language."}
            </div>

            {/* Dictation mic buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
              <button
                onClick={isRecording ? stopRecording : () => startRecording("insert")}
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
              {!isRecording && (
                <button
                  onClick={() => startRecording("edit")}
                  disabled={isTranscribing || loading || !note.trim()}
                  title={!note.trim() ? "Enter or dictate a note first" : "Speak a change — it will be applied and the note regenerated"}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 16px", borderRadius: 8,
                    border: `1px solid ${!note.trim() || loading ? S.border : "#8b5cf6"}`,
                    background: S.card,
                    color: !note.trim() || loading ? "#475569" : "#c4b5fd",
                    fontFamily: S.mono, fontSize: "0.8rem", fontWeight: 600,
                    cursor: isTranscribing || loading || !note.trim() ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="1" width="6" height="12" rx="3" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                  Dictate an Edit
                </button>
              )}
              {isRecording && (
                <span style={{ fontSize: "0.72rem", color: "#ef4444", fontWeight: 600 }}>
                  ● Recording — {recordingPurposeRef.current === "edit" ? "speak the change you want (e.g. “change follow-up to 2 weeks”)" : "speak now"}
                </span>
              )}
              {!isRecording && note.trim() && (
                <button
                  onClick={() => { setNote(""); setError(""); setPendingEdit(""); if (noteRef.current) noteRef.current.focus(); }}
                  title="Clear the input box"
                  style={{
                    marginLeft: "auto", padding: "8px 14px", borderRadius: 8,
                    border: `1px solid ${S.border}`, background: S.card, color: S.muted,
                    fontFamily: S.mono, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
                  }}
                >✕ Clear</button>
              )}
            </div>

            {/* Dictation tips + pending edit banner */}
            {!isRecording && !pendingEdit && (
              <div style={{ fontSize: "0.66rem", color: "#475569", marginBottom: 8 }}>
                Tip: click a spot in the note, then Dictate — your words are inserted right there. Or use Dictate an Edit to speak a change and regenerate hands-free.
              </div>
            )}
            {pendingEdit && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#2e1065", border: "1px solid #8b5cf6", borderRadius: 8, padding: "8px 12px", marginBottom: 10, fontSize: "0.76rem", color: "#ddd6fe" }}>
                <span style={{ fontWeight: 700, flexShrink: 0 }}>{loading ? "Applying edit:" : "Edit heard:"}</span>
                <span style={{ flex: 1, fontStyle: "italic" }}>&ldquo;{pendingEdit}&rdquo;</span>
                <button onClick={() => setPendingEdit("")} style={{ background: "none", border: "none", color: "#a78bfa", cursor: "pointer", fontSize: "0.9rem", flexShrink: 0 }}>✕</button>
              </div>
            )}

            <textarea
              ref={noteRef}
              value={note}
              onChange={e => { setNote(e.target.value); lastCursorRef.current = e.target.selectionStart; }}
              onSelect={e => { lastCursorRef.current = e.target.selectionStart; }}
              onKeyUp={e => { lastCursorRef.current = e.target.selectionStart; }}
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
            </>)}

            {/* ── PBM SESSION MODE ────────────────────────────────── */}
            {mode === "pbm" && (
              <div>
                {/* Hint */}
                <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 14px", fontSize: "0.76rem", color: "#94a3b8", lineHeight: 1.6, marginBottom: 14 }}>
                  <span style={{ color: S.amber, fontWeight: 700 }}>No PHI.</span>{" "}
                  Dictate the session details or fill the form — the note is assembled deterministically (no AI call). Review the checklist, then click Generate.
                </div>

                {/* Say these points checklist + Dictate button */}
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
                  <div style={{ flex: "1 1 280px", background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ fontSize: "0.66rem", color: S.muted, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                      Say these points
                    </div>
                    {[
                      { key: "eye", label: "Eye(s) — OD / OS / OU", value: pbmEye, required: true },
                      { key: "session", label: "Session number (of 9)", value: pbmSession ? `${pbmSession} of 9` : "", required: true },
                      { key: "abn", label: "ABN on file", value: pbmAbn === "Y" ? "Yes" : "No", required: true },
                      { key: "tolerance", label: "Tolerance", value: pbmTolerance, required: false },
                      { key: "va", label: "Baseline BCVA (optional)", value: pbmVA, required: false },
                      { key: "next", label: "Next session (optional)", value: pbmNext, required: false },
                    ].map((item) => {
                      const captured = !!item.value;
                      return (
                        <div key={item.key} style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 5 }}>
                          <span style={{ color: captured ? S.green : "#475569", fontWeight: 700, fontSize: "0.82rem", flexShrink: 0, width: 14 }}>
                            {captured ? "✓" : "○"}
                          </span>
                          <span style={{ fontSize: "0.76rem", color: captured ? S.text : "#64748b" }}>
                            {item.label}{item.required && !captured ? " (required)" : ""}
                            {captured && item.key !== "tolerance" ? ` — ${item.value}` : ""}
                          </span>
                        </div>
                      );
                    })}
                    <div style={{ fontSize: "0.68rem", color: "#64748b", fontStyle: "italic", marginTop: 4, paddingLeft: 22 }}>
                      &ldquo;{pbmTolerance}&rdquo;
                    </div>
                  </div>

                  <div style={{ flex: "1 1 220px", display: "flex", flexDirection: "column", gap: 8, justifyContent: "flex-start" }}>
                    <button
                      onClick={isRecording ? stopRecording : () => startRecording("pbm")}
                      disabled={isTranscribing || pbmExtracting}
                      style={{
                        display: "flex", alignItems: "center", gap: 6, justifyContent: "center",
                        padding: "10px 16px", borderRadius: 8,
                        border: isRecording ? "2px solid #ef4444" : `1px solid ${S.border}`,
                        background: isRecording ? "#7f1d1d" : S.card,
                        color: isRecording ? "#fca5a5" : S.text,
                        fontFamily: S.mono, fontSize: "0.8rem", fontWeight: 600,
                        cursor: isTranscribing || pbmExtracting ? "wait" : "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="1" width="6" height="12" rx="3" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                      {isRecording
                        ? `Stop (${Math.floor(recordingTime / 60)}:${String(recordingTime % 60).padStart(2, "0")})`
                        : isTranscribing ? "Transcribing..."
                        : pbmExtracting ? "Reading session details..."
                        : "Dictate Session"}
                    </button>
                    {isRecording && recordingPurposeRef.current === "pbm" && (
                      <span style={{ fontSize: "0.7rem", color: "#ef4444", fontWeight: 600 }}>
                        ● Recording — speak eye, session number, ABN status, and anything different from the defaults
                      </span>
                    )}
                    {pbmExtractError && (
                      <span style={{ fontSize: "0.7rem", color: "#f87171" }}>{pbmExtractError}</span>
                    )}
                  </div>
                </div>

                {/* Form fields */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: "0.72rem", color: S.muted, display: "block", marginBottom: 5 }}>Eye (required)</label>
                    <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: `1px solid ${S.border}`, width: "fit-content" }}>
                      {["OD", "OS", "OU"].map(e => (
                        <button key={e} onClick={() => setPbmEye(e)} style={{
                          padding: "7px 18px", background: pbmEye === e ? S.accent : S.card,
                          color: pbmEye === e ? "#fff" : S.muted, border: "none",
                          fontFamily: S.mono, fontSize: "0.8rem", fontWeight: 700, cursor: "pointer",
                        }}>
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <div>
                      <label style={{ fontSize: "0.72rem", color: S.muted, display: "block", marginBottom: 5 }}>Session # of 9 (required)</label>
                      <input type="number" min={1} max={9} value={pbmSession} onChange={e => setPbmSession(e.target.value)} style={inputStyle({ width: 80 })} />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.72rem", color: S.muted, display: "block", marginBottom: 5 }}>Cumulative for this eye (optional)</label>
                      <input type="number" min={1} value={pbmCumulative} onChange={e => setPbmCumulative(e.target.value)} style={inputStyle({ width: 110 })} />
                      {pbmCumulative && Number(pbmCumulative) > 54 && (
                        <div style={{ color: S.amber, fontSize: "0.68rem", marginTop: 4, fontWeight: 600, maxWidth: 220 }}>
                          ⚠ Exceeds the 54-treatment evidence cap for this eye
                        </div>
                      )}
                    </div>
                    <div>
                      <label style={{ fontSize: "0.72rem", color: S.muted, display: "block", marginBottom: 5 }}>Date of service</label>
                      <input type="date" value={pbmDate} onChange={e => setPbmDate(e.target.value)} style={inputStyle({ width: 160 })} />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.72rem", color: S.muted, display: "block", marginBottom: 5 }}>Proceduralist</label>
                    <input type="text" value={pbmProceduralist} onChange={e => setPbmProceduralist(e.target.value)} style={inputStyle({ maxWidth: 260 })} />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.72rem", color: S.muted, display: "block", marginBottom: 5 }}>ABN on file (required — drives -GA)</label>
                    <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: `1px solid ${S.border}`, width: "fit-content" }}>
                      {["Y", "N"].map(v => (
                        <button key={v} onClick={() => setPbmAbn(v)} style={{
                          padding: "7px 18px", background: pbmAbn === v ? S.accent : S.card,
                          color: pbmAbn === v ? "#fff" : S.muted, border: "none",
                          fontFamily: S.mono, fontSize: "0.8rem", fontWeight: 700, cursor: "pointer",
                        }}>
                          {v === "Y" ? "Yes" : "No"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.72rem", color: S.muted, display: "block", marginBottom: 5 }}>Tolerance</label>
                    <input type="text" value={pbmTolerance} onChange={e => setPbmTolerance(e.target.value)} style={inputStyle({})} />
                  </div>

                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <div>
                      <label style={{ fontSize: "0.72rem", color: S.muted, display: "block", marginBottom: 5 }}>Baseline BCVA (optional — from initiation exam)</label>
                      <input type="text" placeholder="e.g. 20/50" value={pbmVA} onChange={e => setPbmVA(e.target.value)} style={inputStyle({ width: 130 })} />
                    </div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <label style={{ fontSize: "0.72rem", color: S.muted, display: "block", marginBottom: 5 }}>Next session (optional)</label>
                      <input type="text" placeholder="e.g. in 2 weeks" value={pbmNext} onChange={e => setPbmNext(e.target.value)} style={inputStyle({})} />
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                  <button
                    onClick={() => {
                      const dateObj = pbmDate ? new Date(pbmDate + "T12:00:00") : new Date();
                      const assembled = buildPbmNote({
                        date: formatDate(dateObj),
                        proceduralist: pbmProceduralist.trim() || "Dr. ___",
                        eye: pbmEye,
                        session: pbmSession,
                        cumulative: pbmCumulative,
                        abn: pbmAbn,
                        tolerance: pbmTolerance.trim() || "Patient tolerated the procedure well; no complications.",
                        va: pbmVA.trim(),
                        next: pbmNext.trim(),
                      });
                      setPbmNote(assembled);
                      setTab("output");
                    }}
                    disabled={!pbmEye || !pbmSession}
                    style={{
                      background: !pbmEye || !pbmSession ? S.card : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                      color: !pbmEye || !pbmSession ? "#475569" : "#fff",
                      border: "none", borderRadius: 8, padding: "10px 24px", fontSize: "0.9rem",
                      fontFamily: S.font, fontWeight: 600, cursor: !pbmEye || !pbmSession ? "not-allowed" : "pointer",
                    }}
                  >
                    Generate Session Note →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── OUTPUT TAB ─────────────────────────────────────────── */}
        {tab === "output" && (
          <div>
            {mode === "pbm" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {!pbmNote && <div style={{ textAlign: "center", padding: "60px 0", color: "#475569" }}>Fill out the PBM Session form and click Generate first.</div>}
                {pbmNote && (
                  <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div style={{ fontSize: "0.66rem", color: S.accent, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        PBM / Valeda Session Note
                      </div>
                      <button onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(pbmNote);
                          setPbmCopied(true);
                          setTimeout(() => setPbmCopied(false), 2000);
                        } catch {
                          const ta = document.createElement("textarea");
                          ta.value = pbmNote;
                          ta.style.position = "fixed";
                          ta.style.opacity = "0";
                          document.body.appendChild(ta);
                          ta.select();
                          document.execCommand("copy");
                          document.body.removeChild(ta);
                          setPbmCopied(true);
                          setTimeout(() => setPbmCopied(false), 2000);
                        }
                      }} style={btnStyle(pbmCopied ? "#059669" : S.bg, pbmCopied ? "#fff" : "#94a3b8", { border: `1px solid ${pbmCopied ? "#059669" : S.border}`, padding: "3px 10px", fontSize: "0.68rem", transition: "all 0.2s" })}>
                        {pbmCopied ? "Copied!" : "Copy note"}
                      </button>
                    </div>
                    <div style={{ fontFamily: S.mono, fontSize: "0.85rem", lineHeight: 1.9, color: S.text, whiteSpace: "pre-wrap" }}>
                      {pbmNote}
                    </div>
                  </div>
                )}
                {pbmNote && (
                  <button onClick={() => setTab("input")} style={btnStyle("none", S.muted, { border: `1px solid ${S.border}`, alignSelf: "flex-start" })}>
                    &#8592; Back to PBM form
                  </button>
                )}
              </div>
            ) : (<>
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

                {/* Safety flags — deterministic warnings from the server; never part of the copied note */}
                {result.safetyFlags?.length > 0 && (
                  <div style={{ background: "#451a03", border: "1px solid #f59e0b", borderRadius: 10, padding: "12px 16px" }}>
                    <div style={{ fontSize: "0.7rem", color: "#fcd34d", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
                      ⚠ Safety flags — review before signing (not included in the copied note)
                    </div>
                    {result.safetyFlags.map((f, i) => (
                      <div key={i} style={{ fontSize: "0.8rem", color: "#fde68a", lineHeight: 1.5, marginBottom: 4, display: "flex", gap: 8 }}>
                        <span style={{ flexShrink: 0 }}>•</span><span>{f}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Code badges */}
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ background: cc.bg, color: cc.color, border: `1.5px solid ${cc.border}`, borderRadius: 8, padding: "6px 16px", fontWeight: 700, fontSize: "1rem", fontFamily: S.mono }}>
                    {result.code}
                  </span>
                  {getEmLabel(result.code) && (
                    <span style={{ fontSize: "0.82rem", color: cc.color, fontWeight: 600, fontFamily: S.font }}>{getEmLabel(result.code)}</span>
                  )}
                  {result.procedure && result.procedure !== "None" && (
                    <span style={{ background: "#dbeafe", color: "#1e40af", border: "1.5px solid #3b82f6", borderRadius: 8, padding: "6px 16px", fontWeight: 700, fontSize: "1rem", fontFamily: S.mono }}>+ {result.procedure}</span>
                  )}
                  {result.g2211 && (
                    <span style={{ background: "#fef3c7", color: "#92400e", border: "1.5px solid #f59e0b", borderRadius: 8, padding: "6px 16px", fontWeight: 700, fontSize: "1rem", fontFamily: S.mono }}>+ G2211</span>
                  )}
                  {isEyeCode(result.code) && (
                    <span style={{ fontSize: "0.76rem", color: "#a855f7", fontStyle: "italic" }}>— no MDM documentation needed</span>
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
                {icd10Codes.length > 0 && (
                  <div style={{ background: "#0c0f1a", border: "1px solid #4f46e5", borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                      <div style={{ fontSize: "0.66rem", color: "#818cf8", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        ICD-10 Codes
                      </div>
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
                    </div>
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
                  // Match handouts against ONLY the generated note (assessment/plan) + ICD codes
                  // — NOT the raw dictation input, which may mention conditions from history
                  // that aren't the focus of today's visit
                  const matched = matchHandouts(result.note || "", icd10Codes || []);
                  const detectedDrops = detectDropsFromPlan(result.note || "");
                  if (matched.length === 0 && detectedDrops.length === 0) return null;
                  return (
                    <div style={{ background: "#0f1f2e", border: "1px solid #1d4ed8", borderRadius: 10, padding: "14px 18px", marginTop: 8 }}>
                      {(() => { const eduLang = eduLangOverride || detectedLang; return (<>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                        <div style={{ fontSize: "0.72rem", color: "#60a5fa", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          Patient Education — auto-matched from this note
                        </div>
                        <div style={{ display: "flex", gap: 3 }}>
                          {[{id:"en",label:"EN"},{id:"es",label:"ES"},{id:"vi",label:"VI"},{id:"pt",label:"PT"}].map(l => (
                            <button key={l.id} onClick={() => setEduLangOverride(l.id === detectedLang ? null : l.id)}
                              style={{ background: (eduLangOverride || detectedLang) === l.id ? "#3b82f6" : "transparent", color: (eduLangOverride || detectedLang) === l.id ? "#fff" : "#64748b", border: `1px solid ${(eduLangOverride || detectedLang) === l.id ? "#3b82f6" : "#334155"}`, borderRadius: 5, padding: "2px 8px", fontSize: "0.65rem", fontFamily: "monospace", fontWeight: 700, cursor: "pointer" }}>
                              {l.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: S.text, marginBottom: 10 }}>
                        {matched.length > 0 && <span>{matched.length} handout{matched.length !== 1 ? "s" : ""} matched — select which to include:</span>}
                        {matched.length > 0 && detectedDrops.length > 0 && <span> &bull; </span>}
                        {detectedDrops.length > 0 && <span>{detectedDrops.length} drop{detectedDrops.length !== 1 ? "s" : ""} detected</span>}
                      </div>
                      {matched.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          {matched.map(h => {
                            const isChecked = !uncheckedHandouts.has(h.id);
                            return (
                              <label key={h.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: isChecked ? "#1e293b" : "#0f172a", border: `1px solid ${isChecked ? "#334155" : "#1e293b"}`, borderRadius: 6, padding: "4px 10px", fontSize: "0.7rem", color: isChecked ? "#94a3b8" : "#475569", marginRight: 6, marginBottom: 4, cursor: "pointer", opacity: isChecked ? 1 : 0.6 }}>
                                <input type="checkbox" checked={isChecked} onChange={() => {
                                  setUncheckedHandouts(prev => {
                                    const next = new Set(prev);
                                    if (next.has(h.id)) next.delete(h.id); else next.add(h.id);
                                    return next;
                                  });
                                }} style={{ accentColor: "#3b82f6" }} />
                                {h.title[eduLang] || h.title.en}
                              </label>
                            );
                          })}
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
                        {matched.length > 0 && (() => {
                          const selected = matched.filter(h => !uncheckedHandouts.has(h.id));
                          return selected.length > 0 && (
                          <button
                            onClick={async () => {
                              try {
                                const payload = {
                                  handouts: selected.map(h => ({
                                    title: h.title[eduLang] || h.title.en,
                                    content: h.content[eduLang] || h.content.en,
                                  })),
                                  lang: eduLang,
                                };
                                const res = await fetch(`${API_BASE}/api/education-pdf`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify(payload),
                                });
                                if (!res.ok) throw new Error("PDF generation failed");
                                const blob = await res.blob();
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = "Patient_Education.pdf";
                                a.click();
                                URL.revokeObjectURL(url);
                              } catch (e) {
                                console.error("PDF download error:", e);
                                // Fallback to HTML print
                                const html = generateEducationPrintHTML(selected, eduLang);
                                const win = window.open("", "_blank");
                                win.document.write(html);
                                win.document.close();
                                setTimeout(() => win.print(), 400);
                              }
                            }}
                            style={{ background: "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: "0.78rem", fontFamily: S.font, fontWeight: 600, cursor: "pointer" }}
                          >
                            Download {selected.length === 1 ? "1 Handout" : `${selected.length} Handouts`} PDF ({(eduLang || "en").toUpperCase()})
                          </button>
                          );
                        })()}
                        {detectedDrops.length > 0 && (
                          <button
                            onClick={() => { setAutoDrops(detectedDrops); setAutoLang(detectedLang); setTab("drops"); }}
                            style={{ background: "linear-gradient(135deg,#059669,#10b981)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: "0.78rem", fontFamily: S.font, fontWeight: 600, cursor: "pointer" }}
                          >
                            Print Drop Schedule ({(detectedLang || "en").toUpperCase()})
                          </button>
                        )}
                      </div>
                      </>); })()}
                    </div>
                  );
                  } catch (e) { console.error("Education matcher error:", e); return null; }
                })()}
              </div>
            )}
            </>)}
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
            <AICodingAssistant showReimbursement={true} />
          </div>
        )}

        {/* ── RATE COMPARISON TAB ──────────────────────────────── */}
        {tab === "rates" && (
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <RateComparison embedded />
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

        {/* ── EVIDENCE (OpenEvidence) TAB ──────────────────── */}
        {tab === "evidence" && (
          <div style={{ padding: "24px", maxWidth: 720, margin: "0 auto" }}>
            <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: "1.6rem" }}>📚</span>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", fontFamily: S.font }}>OpenEvidence — AI Clinical Literature Search</div>
              </div>
              <div style={{ padding: "18px 22px" }}>
                <div style={{ fontSize: "0.85rem", color: "#cbd5e1", lineHeight: 1.55, marginBottom: 14 }}>
                  Evidence-based, peer-reviewed answers to clinical questions. Useful for quick lookups during a visit, complex case workups, and reviewing the latest literature on treatments and outcomes. Free for verified clinicians.
                </div>
                <div style={{ fontSize: "0.78rem", color: S.muted, marginBottom: 16, lineHeight: 1.5 }}>
                  Opens openevidence.com in a new tab. You'll need to be signed in to your OpenEvidence account. Each surgeon needs an individual account (sign up at openevidence.com if you don't have one).
                </div>
                <a
                  href="https://www.openevidence.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block",
                    background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                    color: "#fff",
                    padding: "10px 22px",
                    borderRadius: 8,
                    textDecoration: "none",
                    fontFamily: S.font,
                    fontWeight: 600,
                    fontSize: "0.88rem",
                  }}
                >
                  Open OpenEvidence ↗
                </a>
              </div>
            </div>

            <div style={{ marginTop: 18, padding: "12px 16px", background: S.card, border: `1px dashed ${S.border}`, borderRadius: 10 }}>
              <div style={{ fontSize: "0.75rem", color: S.muted, fontWeight: 600, marginBottom: 6, fontFamily: S.mono, textTransform: "uppercase", letterSpacing: 0.5 }}>Examples to try</div>
              <div style={{ fontSize: "0.78rem", color: "#cbd5e1", lineHeight: 1.6 }}>
                "Latest evidence for Vabysmo dosing intervals in nAMD" &middot; "PRP vs anti-VEGF for PDR — long-term outcomes" &middot; "Best management of post-vitrectomy hypotony" &middot; "Pneumatic retinopexy success rates by detachment configuration"
              </div>
            </div>
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
          <div style={{ margin: "-20px", minHeight: "80vh" }}>
            <OpNoteDictator onBack={() => setTab("output")} />
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
            { cat: "Diabetic", code: "H40.89", desc: "Other specified glaucoma (use H40.84x for NVG instead)" },
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
            { cat: "Glaucoma", code: "H40.841", desc: "Neovascular glaucoma (NVG) — secondary angle closure (OD). Code also: underlying condition (H34.81 CRVO, E11.x DM, H35.82 retinal ischemia)" },
            { cat: "Glaucoma", code: "H40.842", desc: "Neovascular glaucoma (NVG) — secondary angle closure (OS). Code also: underlying condition (H34.81 CRVO, E11.x DM, H35.82 retinal ischemia)" },
            { cat: "Glaucoma", code: "H40.843", desc: "Neovascular glaucoma (NVG) — secondary angle closure (OU). Code also: underlying condition (H34.81 CRVO, E11.x DM, H35.82 retinal ischemia)" },
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
            { cat: "Hereditary/Dystrophy", code: "H33.101", desc: "Retinoschisis (OD)" },
            { cat: "Hereditary/Dystrophy", code: "H33.102", desc: "Retinoschisis (OS)" },
            { cat: "Hereditary/Dystrophy", code: "H33.103", desc: "Retinoschisis (OU)" },
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
            { cat: "Z-Codes & Status", code: "Z79.899", desc: "Other long-term drug therapy (Plaquenil, tamoxifen, etc.)" },
            { cat: "Z-Codes & Status", code: "Z03.89", desc: "Encounter for observation for other suspected diseases ruled out — use BEFORE starting Plaquenil/chloroquine (baseline screening OCT)" },
            { cat: "Z-Codes & Status", code: "Z03.823", desc: "Encounter for observation for suspected inserted (injected) foreign body ruled out" },
            { cat: "Z-Codes & Status", code: "Z09", desc: "Encounter for follow-up exam after completed treatment — use with Z79.899 for ongoing Plaquenil/chloroquine monitoring OCT" }
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

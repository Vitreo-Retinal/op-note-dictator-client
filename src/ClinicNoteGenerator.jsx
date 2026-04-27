import { useState, useCallback, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://op-note-dictator-server-production.up.railway.app";

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
];

// ── Default expansion rules ─────────────────────────────────────────
const DEFAULT_INLINE_RULES = [
  { id: "rba", trigger: "RBA", expansion: "RBA discussed: endophthalmitis, RD, VH, IOP elevation, and vision loss", type: "inline", builtin: true },
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

// ── Build system prompt ─────────────────────────────────────────────
function buildSystemPrompt(mode, examples) {
  const examplesBlock = examples.map((ex, i) =>
    `--- Example ${i + 1}: ${ex.label} ---\n${ex.shorthand}`
  ).join("\n\n");

  const baseRules = `You are a retina billing and coding expert AND a clinical note formatter for a retina surgeon.

PHYSICIAN STYLE — learn from these reference notes:

${examplesBlock}

FORMATTING RULES:
- Output ONLY the Assessment/Plan section of a clinic note
- Number each diagnosis (1. 2. 3.)
- List treatment history chronologically with dates when provided
- Place the Plan section at the bottom
- Preserve the physician's exact abbreviations and shorthand (wet AMD, SRF, IRF, nAMD, s/p, f/u, q8, NPDR, etc.)
- Do NOT add exam findings, HPI, or review of systems — only A/P

ABBREVIATION DICTIONARY:
- A = Avastin (bevacizumab), E = Eylea (aflibercept), V = Vabysmo (faricimab), L = Lucentis (ranibizumab)
- "failed A" or "sub-optimal on A" = s/p Avastin with sub-optimal response
- "unable to extend on E" = s/p Eylea, unable to extend
- "on V q8" = on Vabysmo, requires q8 weeks
- NPDR = non-proliferative diabetic retinopathy, PDR = proliferative diabetic retinopathy
- DME = diabetic macular edema, SRF = subretinal fluid, IRF = intraretinal fluid
- FP = fundus photos, SDE = scleral depressed exam, LRP = laser retinopexy
- PPV = pars plana vitrectomy, EL = endolaser, FAX = fluid-air exchange
- HST = horseshoe tear, PVD = posterior vitreous detachment
- cat = cataracts, AT QID = artificial tears four times daily
- POD1 = post-op day 1, POW1 = post-op week 1, POM1/3/6 = post-op month 1/3/6

POST-OP FOLLOW-UP DEFAULTS (use unless physician specifies otherwise):
- POD1 → f/u in 1 week
- POM1 → f/u in 2 months
- POM3 → f/u in 3 months
- POM6 → f/u in 6 months
- POM12+ → yearly
- If PVR or high risk noted → use shorter follow-up

COUNSELING AUTO-FILLS (include in Plan when diagnosis is present):
- AMD → Healthy diet, non-smoking, Amsler grid, AREDS2, UV protection
- RVO (BRVO/CRVO) → Healthy lifestyle, healthy diet, low salt, BP control
- T2DM/DR → BS/BP control emphasized
- GA → Izervay vs. observation discussion
- RD/PVD/HST → RD/RT precautions reviewed; call re: new onset flashes, floaters, or curtain over vision
- Injection → RBA discussed including endophthalmitis/RD/VH`;

  if (mode === "generate") {
    return `${baseRules}

BILLING-COMPLIANT LANGUAGE — insert these where appropriate and mark with [+]:
- After mentioning OCT/imaging findings: [+] "OCT reviewed"
- For injection visits: [+] "Risks, benefits, and alternatives discussed" (if not already present as RBA)
- For complex visits (agent switching, progression, new findings): [+] "Data reviewed including OCT/imaging" and [+] "Treatment options discussed"
- For established patients with chronic conditions on 99215: [+] "Longitudinal managing physician for this patient's [condition]; ongoing complexity given [brief reason]"
- For 99214: note chronic condition with management decision and data reviewed

TASK: The physician will give you shorthand or abbreviated text. Expand it into a properly formatted A/P section in their exact style (matching the reference notes above). Insert billing-compliant language marked with [+]. Then recommend a billing code.

OUTPUT FORMAT — use ONLY these exact delimiters:

---CODE---
one of: 99215 / 99214 / 99213 / 92014 / 92004
---G2211---
YES or NO
---CHANGES---
- each billing addition in plain language (max 5 bullets), or "None needed"
---NOTE---
the full formatted A/P note with [+] before each inserted billing phrase
---END---`;
  }

  // Optimize mode
  return `${baseRules}

TASK: The physician will give you an already-structured A/P note. Your job is to:
1. Recommend the best billing code
2. Insert MINIMUM billing-compliant language to support that code, marked with [+]
3. Do NOT rewrite or restructure the note — only add what's needed

BILLING ADDITIONS to insert where needed (mark with [+]):
- [+] "OCT reviewed" — if imaging mentioned but "reviewed" not stated
- [+] "Data reviewed including OCT/imaging" — for 99214/99215 support
- [+] "Treatment options discussed" — for agent switching or progression visits
- [+] "Longitudinal managing physician for this patient's [condition]; ongoing complexity given [brief reason]" — for G2211
- Do NOT add what's already there

DECISION RULES:
- 92014/92004 (eye code): stable visits, observation only, no complex MDM
- 99213: single chronic condition, straightforward management
- 99214: chronic condition with management decision, data reviewed
- 99215: multiple chronic conditions OR progression requiring complex MDM (agent switch, new treatment)
- G2211: only with 99215 + established patient + serious chronic condition

OUTPUT FORMAT — use ONLY these exact delimiters:

---CODE---
one of: 99215 / 99214 / 99213 / 92014 / 92004
---G2211---
YES or NO
---CHANGES---
- each billing addition in plain language (max 5 bullets), or "None needed"
---NOTE---
the full note with [+] before each inserted billing phrase
---END---`;
}

// ── Response parser ─────────────────────────────────────────────────
function parseResponse(text) {
  const sec = (a, b) => {
    const s = text.indexOf("---" + a + "---");
    const e = text.indexOf("---" + b + "---");
    if (s === -1) return "";
    return (e === -1 ? text.slice(s) : text.slice(s, e))
      .replace("---" + a + "---", "").trim();
  };
  return {
    code: sec("CODE", "G2211"),
    g2211: sec("G2211", "CHANGES").trim() === "YES",
    changes: sec("CHANGES", "NOTE").split("\n").map(s => s.replace(/^[-•]\s*/, "").trim()).filter(Boolean),
    note: sec("NOTE", "END"),
  };
}

// ── Styles ──────────────────────────────────────────────────────────
const S = {
  bg: "#0f172a", card: "#1e293b", border: "#334155", muted: "#64748b",
  text: "#e2e8f0", bright: "#f1f5f9", accent: "#6366f1", accentLight: "#a5b4fc",
  green: "#4ade80", greenDark: "#166534", amber: "#f59e0b",
  font: "Georgia, serif", mono: "monospace",
};

const isEyeCode = (code) => code === "92014" || code === "92004";

// ── Component ───────────────────────────────────────────────────────
export default function ClinicNoteGenerator({ onBack }) {
  const [mode, setMode] = useState("generate"); // generate | optimize
  const [note, setNote] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("input"); // input | output | examples | rules
  const [copied, setCopied] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Examples state
  const [examples, setExamples] = useState(DEFAULT_EXAMPLES);
  const [editingExample, setEditingExample] = useState(null);
  const [showAddExample, setShowAddExample] = useState(false);
  const [newExample, setNewExample] = useState({ label: "", shorthand: "" });

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
        body: JSON.stringify({ examples, inlineRules, planRules }),
      }).catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [examples, inlineRules, planRules, dataLoaded]);

  // ── Copy to clipboard ─────────────────────────────────────────────
  const copyNote = useCallback(async () => {
    if (!result?.note) return;
    const clean = result.note.replace(/\[\+\]\s*/g, "");
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
  async function run() {
    if (!note.trim()) return;
    if (!apiKey.trim()) { setError("Enter your Anthropic API key above."); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const systemPrompt = buildSystemPrompt(mode, examples);
      const userMessage = mode === "generate"
        ? `Expand this shorthand into a formatted A/P note with billing language:\n\n${note}`
        : `Optimize this existing A/P note with minimum billing language:\n\n${note}`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey.trim(),
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 3000,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const text = (data.content || []).map(b => b.text || "").join("");
      if (!text.includes("---CODE---")) throw new Error("Unexpected response format. First 300 chars: " + text.substring(0, 300));
      const parsed = parseResponse(text);
      setResult(parsed);
      setTab("output");
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  // ── Render note with [+] badges ───────────────────────────────────
  function renderNote(text) {
    if (!text) return null;
    return text.split("[+]").map((part, i) => (
      <span key={i}>
        {i > 0 && <span style={{ background: "#fef08a", color: "#713f12", fontWeight: 700, fontSize: "0.6rem", padding: "1px 4px", borderRadius: 3, marginRight: 3, border: "1px solid #eab308", verticalAlign: "middle" }}>+</span>}
        {part}
      </span>
    ));
  }

  const getCodeStyle = (code) => {
    if (code === "99215") return { bg: "#d1fae5", color: "#059669", border: "#059669" };
    if (code === "99214") return { bg: "#dbeafe", color: "#1d4ed8", border: "#1d4ed8" };
    if (code === "99213") return { bg: "#f1f5f9", color: "#475569", border: "#94a3b8" };
    if (isEyeCode(code)) return { bg: "#fdf4ff", color: "#7e22ce", border: "#a855f7" };
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
          <div style={{ fontSize: "1rem", fontWeight: 700, color: S.bright }}>Clinic Note Generator</div>
          <div style={{ fontSize: "0.68rem", color: S.muted, fontFamily: S.mono }}>A/P Notes | Billing Codes | Shorthand Expansion</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${S.card}`, paddingLeft: 24, overflowX: "auto" }}>
        {[["input", "Input"], ["output", "Output"], ["examples", "Examples"], ["rules", "Expansion Rules"]].map(([id, label]) => (
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

      <div style={{ padding: "20px 24px", maxWidth: 800, margin: "0 auto" }}>

        {/* ── INPUT TAB ──────────────────────────────────────────── */}
        {tab === "input" && (
          <div>
            {/* Mode toggle */}
            <div style={{ display: "flex", gap: 0, marginBottom: 16, borderRadius: 8, overflow: "hidden", border: `1px solid ${S.border}` }}>
              {[["generate", "Generate from Shorthand"], ["optimize", "Optimize Existing Note"]].map(([m, label]) => (
                <button key={m} onClick={() => setMode(m)} style={{
                  flex: 1, padding: "10px 12px", background: mode === m ? S.accent : S.card,
                  color: mode === m ? "#fff" : S.muted, border: "none",
                  fontFamily: S.font, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
                }}>
                  {label}
                </button>
              ))}
            </div>

            {/* API key */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: "0.72rem", color: S.muted, display: "block", marginBottom: 4 }}>Anthropic API Key</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  style={inputStyle({ flex: 1 })}
                />
                <button onClick={() => setShowApiKey(!showApiKey)} style={btnStyle("transparent", S.muted, { border: `1px solid ${S.border}`, fontSize: "0.7rem", padding: "6px 10px" })}>
                  {showApiKey ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Hint */}
            <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 14px", fontSize: "0.76rem", color: "#94a3b8", lineHeight: 1.6, marginBottom: 14 }}>
              <span style={{ color: S.amber, fontWeight: 700 }}>No PHI.</span>{" "}
              {mode === "generate"
                ? "Type your shorthand — the tool expands it into a formatted A/P note with billing language."
                : "Paste your structured A/P note — the tool inserts minimum billing-compliant language."}
            </div>

            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={mode === "generate"
                ? "67 yo W, AMD denies Fhx, non-smoker, OD I dry, OS wet AMD failed A and E, on V q8..."
                : "Paste your structured A/P note here..."}
              rows={14}
              style={{ display: "block", width: "100%", background: S.card, border: `1px solid #475569`, borderRadius: 10, padding: 14, color: S.bright, fontFamily: S.mono, fontSize: "0.85rem", lineHeight: 1.8, resize: "vertical", boxSizing: "border-box" }}
            />

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
          </div>
        )}

        {/* ── OUTPUT TAB ─────────────────────────────────────────── */}
        {tab === "output" && (
          <div>
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

                {/* Code badges */}
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ background: cc.bg, color: cc.color, border: `1.5px solid ${cc.border}`, borderRadius: 8, padding: "6px 16px", fontWeight: 700, fontSize: "1rem", fontFamily: S.mono }}>
                    {result.code}
                  </span>
                  {result.g2211 && (
                    <span style={{ background: "#fef3c7", color: "#92400e", border: "1.5px solid #f59e0b", borderRadius: 8, padding: "6px 16px", fontWeight: 700, fontSize: "1rem", fontFamily: S.mono }}>+ G2211</span>
                  )}
                  {isEyeCode(result.code) && (
                    <span style={{ fontSize: "0.76rem", color: "#a855f7", fontStyle: "italic" }}>Eye exam code — no MDM documentation needed</span>
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
              </div>
            )}
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
      </div>
    </div>
  );
}

import { useState, useCallback } from "react";

// ── Default expansion rules ─────────────────────────────────────────
const DEFAULT_INLINE_RULES = [
  { id: "rba", trigger: "RBA", expansion: "RBA discussed: endophthalmitis, RD, VH, IOP elevation, and vision loss", type: "inline", builtin: true },
  { id: "brvo", trigger: "BRVO", expansion: "BRVO — healthy lifestyle: healthy diet, low salt, BP control", type: "inline", builtin: true },
  { id: "crvo", trigger: "CRVO", expansion: "CRVO — healthy lifestyle: healthy diet, low salt, BP control", type: "inline", builtin: true },
  { id: "rvo", trigger: "RVO", expansion: "RVO — healthy lifestyle: healthy diet, low salt, BP control", type: "inline", builtin: true },
  { id: "ga", trigger: "GA", expansion: "GA — Izervay vs. observation discussed; Izervay may slow atrophy progression but may increase risk of wet AMD conversion", type: "inline", builtin: true },
  { id: "t2dm", trigger: "T2DM", expansion: "T2DM — tight BS and BP control counseled", type: "inline", builtin: true },
  { id: "amd", trigger: "AMD", expansion: "AMD — healthy diet, non-smoking, AREDS2 (if intermediate/advanced), Amsler grid, UV protection counseled", type: "inline", builtin: true },
];

const DEFAULT_PLAN_RULES = [
  { id: "rd_pvd_hst", triggers: "RD, PVD, HST", expansion: "RD/RT precautions reviewed; pt instructed to call re: new onset flashes, floaters, or curtain over vision", type: "plan", builtin: true },
];

// ── Expansion engine ────────────────────────────────────────────────
function applyExpansions(note, inlineRules, planRules) {
  let result = note;
  const applied = [];

  // Apply inline expansions
  for (const rule of inlineRules) {
    if (!rule.trigger.trim()) continue;
    const escaped = rule.trigger.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "g");
    const before = result;
    result = result.replace(regex, rule.expansion);
    if (result !== before) applied.push(rule.trigger);
  }

  // Apply plan-appended expansions
  for (const rule of planRules) {
    const triggers = rule.triggers.split(",").map(t => t.trim()).filter(Boolean);
    const noteHasTrigger = triggers.some(t => {
      const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`\\b${escaped}\\b`, "i").test(note);
    });
    if (!noteHasTrigger) continue;
    if (result.includes(rule.expansion)) continue;
    const planMatch = result.match(/\n(Plan|PLAN|plan)\s*\n/);
    if (planMatch) {
      const idx = result.indexOf(planMatch[0]) + planMatch[0].length;
      result = result.slice(0, idx) + rule.expansion + "\n" + result.slice(idx);
    } else {
      result = result.trimEnd() + "\n" + rule.expansion;
    }
    applied.push(triggers.join("/"));
  }

  return { expanded: result, applied };
}

// ── System prompt ───────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a retina billing and coding expert. A physician gives you their clinical note. Your job is to:

1. Recommend the best billing code for this visit
2. Make minimum language additions to support that code
3. Flag if a comprehensive eye exam code (92014 established / 92004 new) would be more appropriate than an E/M code

DECISION RULES:

SUGGEST EYE CODE (92014/92004) when:
- Visit is primarily driven by examination findings (stable post-op, routine monitoring, no new drugs, no complex MDM)
- Plan is observation only or simple follow-up
- No new prescriptions, no treatment changes, no complex management decisions
- Note lacks MDM complexity elements

USE E/M CODE (99213/99214/99215) when:
- Visit involves new drug initiation or change
- Treatment decision requires complex MDM (e.g. switching anti-VEGF, managing progression)
- Multiple chronic conditions with active management
- Intravitreal injection being given (MDM-driven)

G2211 applies only when: 99215 is supported AND established patient with serious chronic condition

ABSOLUTE RULES:
- Never invent clinical findings
- Preserve physician's exact style and abbreviations (wet AMD, SRF, RBA, f/u, q8, nAMD, etc.)
- Insert short phrases only — do not rewrite sentences
- Mark each inserted phrase with [+] immediately before it

MINIMUM ADDITIONS FOR 99215 (if applicable):
- After disease progression finding: "— progression on current therapy; tx options reviewed"
- After OCT/OCT-A if not already stated as reviewed: add "reviewed"
- G2211 sentence at end: "Longitudinal managing physician for this patient's [condition]; ongoing complexity given [brief reason]."

MINIMUM ADDITIONS FOR 99214 (if applicable):
- Note the chronic condition with management decision
- Note any data reviewed

OUTPUT — use ONLY these exact delimiters, absolutely no text outside them:

---CODE---
one of: 99215 / 99214 / 99213 / 92014 / 92004
---G2211---
YES or NO
---EYE_CODE_NOTE---
If suggesting eye code: one sentence explaining why 92014/92004 fits better. If not: NONE
---CHANGES---
- each addition in plain language (max 5 bullets), or "None needed" if eye code
---NOTE---
full note with [+] before each inserted phrase; if eye code recommended, still show note cleaned up with expansions but no coding additions needed
---END---`;

// ── Response parser ─────────────────────────────────────────────────
function parse(text) {
  const sec = (a, b) => {
    const s = text.indexOf("---" + a + "---");
    const e = text.indexOf("---" + b + "---");
    if (s === -1) return "";
    return (e === -1 ? text.slice(s) : text.slice(s, e))
      .replace("---" + a + "---", "").trim();
  };
  return {
    code: sec("CODE", "G2211"),
    g2211: sec("G2211", "EYE_CODE_NOTE").trim() === "YES",
    eyeCodeNote: sec("EYE_CODE_NOTE", "CHANGES"),
    changes: sec("CHANGES", "NOTE").split("\n").map(s => s.replace(/^[-•]\s*/, "").trim()).filter(Boolean),
    note: sec("NOTE", "END"),
  };
}

const isEyeCode = (code) => code === "92014" || code === "92004";

// ── Styles ──────────────────────────────────────────────────────────
const S = {
  bg: "#0f172a", card: "#1e293b", border: "#334155", muted: "#64748b",
  text: "#e2e8f0", bright: "#f1f5f9", accent: "#6366f1", accentLight: "#a5b4fc",
  green: "#4ade80", greenDark: "#166534", amber: "#f59e0b",
  font: "Georgia, serif", mono: "monospace",
};

// ── Component ───────────────────────────────────────────────────────
export default function EmNoteOptimizer({ onBack }) {
  const [note, setNote] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("input"); // input | output | rules
  const [copied, setCopied] = useState(false);

  // Expansion rules state
  const [inlineRules, setInlineRules] = useState(DEFAULT_INLINE_RULES);
  const [planRules, setPlanRules] = useState(DEFAULT_PLAN_RULES);
  const [editingRule, setEditingRule] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRule, setNewRule] = useState({ trigger: "", expansion: "", type: "inline" });

  // ── Copy to clipboard ───────────────────────────────────────────
  const copyNote = useCallback(async () => {
    if (!result?.note) return;
    const clean = result.note.replace(/\[?\+\]?\s*/g, "");
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

  // ── Rule management ─────────────────────────────────────────────
  const addRule = () => {
    if (!newRule.trigger.trim() || !newRule.expansion.trim()) return;
    const id = "custom_" + Date.now();
    if (newRule.type === "inline") {
      setInlineRules(prev => [...prev, { id, trigger: newRule.trigger.trim(), expansion: newRule.expansion.trim(), type: "inline", builtin: false }]);
    } else {
      setPlanRules(prev => [...prev, { id, triggers: newRule.trigger.trim(), expansion: newRule.expansion.trim(), type: "plan", builtin: false }]);
    }
    setNewRule({ trigger: "", expansion: "", type: "inline" });
    setShowAddForm(false);
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

  // ── Run optimization ────────────────────────────────────────────
  async function run() {
    if (!note.trim()) return;
    if (!apiKey.trim()) { setError("Enter your Anthropic API key above."); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const { expanded, applied } = applyExpansions(note, inlineRules, planRules);
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
          max_tokens: 2000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: expanded }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const text = (data.content || []).map(b => b.text || "").join("");
      if (!text.includes("---CODE---")) throw new Error("Unexpected response format. First 300 chars: " + text.substring(0, 300));
      const parsed = parse(text);
      parsed.expansionsApplied = applied;
      setResult(parsed);
      setTab("output");
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  // ── Render note with [+] badges ─────────────────────────────────
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
          <div style={{ fontSize: "1rem", fontWeight: 700, color: S.bright }}>E/M Note Optimizer</div>
          <div style={{ fontSize: "0.68rem", color: S.muted, fontFamily: S.mono }}>99213-99215 | G2211 | Eye Codes</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${S.card}`, paddingLeft: 24 }}>
        {[["input", "Your Note"], ["output", "Optimized"], ["rules", "Expansion Rules"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: "9px 16px", background: "none", border: "none",
            borderBottom: tab === id ? `2px solid ${S.accent}` : "2px solid transparent",
            color: tab === id ? S.accentLight : S.muted,
            fontFamily: S.font, fontSize: "0.83rem", cursor: "pointer", fontWeight: tab === id ? 600 : 400,
          }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 800, margin: "0 auto" }}>

        {/* INPUT TAB */}
        {tab === "input" && (
          <div>
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

            <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 14px", fontSize: "0.76rem", color: "#94a3b8", lineHeight: 1.6, marginBottom: 14 }}>
              <span style={{ color: S.amber, fontWeight: 700 }}>No PHI.</span> Paste your note as-is. The tool picks the right code — E/M or eye exam — and makes minimum additions only.
            </div>

            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Paste your note here..."
              rows={12}
              style={{ display: "block", width: "100%", background: S.card, border: `1px solid #475569`, borderRadius: 10, padding: 14, color: S.bright, fontFamily: S.mono, fontSize: "0.88rem", lineHeight: 1.8, resize: "vertical", boxSizing: "border-box" }}
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
                {loading ? "Analyzing..." : "Optimize →"}
              </button>
            </div>
          </div>
        )}

        {/* OUTPUT TAB */}
        {tab === "output" && (
          <div>
            {loading && (
              <div style={{ textAlign: "center", padding: "60px 0", color: S.muted }}>
                <div style={{ width: 34, height: 34, border: `3px solid ${S.border}`, borderTopColor: S.accent, borderRadius: "50%", animation: "spin .8s linear infinite", margin: "0 auto 12px" }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                Analyzing...
              </div>
            )}
            {!loading && !result && <div style={{ textAlign: "center", padding: "60px 0", color: "#475569" }}>Optimize a note first.</div>}
            {result && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ background: cc.bg, color: cc.color, border: `1.5px solid ${cc.border}`, borderRadius: 8, padding: "6px 16px", fontWeight: 700, fontSize: "1rem", fontFamily: S.mono }}>
                    {result.code}
                  </span>
                  {result.g2211 && (
                    <span style={{ background: "#fef3c7", color: "#92400e", border: "1.5px solid #f59e0b", borderRadius: 8, padding: "6px 16px", fontWeight: 700, fontSize: "1rem", fontFamily: S.mono }}>+ G2211</span>
                  )}
                </div>

                {isEyeCode(result.code) && result.eyeCodeNote && result.eyeCodeNote !== "NONE" && (
                  <div style={{ background: "#2e1065", border: "1px solid #a855f7", borderRadius: 8, padding: "12px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>&#128065;</span>
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "#d8b4fe", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>Eye Exam Code Recommended</div>
                      <div style={{ fontSize: "0.83rem", color: "#e9d5ff", lineHeight: 1.5 }}>{result.eyeCodeNote}</div>
                      <div style={{ fontSize: "0.75rem", color: "#a855f7", marginTop: 6 }}>No MDM documentation needed — exam elements justify this code.</div>
                    </div>
                  </div>
                )}

                {result.expansionsApplied?.length > 0 && (
                  <div style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ fontSize: "0.66rem", color: "#94a3b8", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Auto-expanded</div>
                    <div style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>{result.expansionsApplied.join(", ")} — standard language inserted</div>
                  </div>
                )}

                {result.changes?.filter(c => c && c !== "None needed").length > 0 && (
                  <div style={{ background: "#0f1f14", border: `1px solid ${S.greenDark}`, borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ fontSize: "0.66rem", color: S.green, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 7 }}>Coding additions</div>
                    {result.changes.filter(c => c && c !== "None needed").map((c, i) => (
                      <div key={i} style={{ fontSize: "0.82rem", color: "#86efac", paddingLeft: 12, position: "relative", marginBottom: 3, lineHeight: 1.5 }}>
                        <span style={{ position: "absolute", left: 0, color: "#16a34a" }}>&#10003;</span>{c}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: "0.66rem", color: S.accent, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Your note with additions</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ fontSize: "0.6rem", color: "#94a3b8", fontFamily: S.mono, background: S.bg, padding: "2px 6px", borderRadius: 3 }}>
                        <span style={{ background: "#fef08a", color: "#713f12", padding: "0 3px", borderRadius: 2, fontWeight: 700, marginRight: 3 }}>+</span>= added
                      </div>
                      <button onClick={copyNote} style={btnStyle(copied ? "#059669" : S.bg, copied ? "#fff" : "#94a3b8", { border: `1px solid ${copied ? "#059669" : S.border}`, padding: "3px 10px", fontSize: "0.68rem", transition: "all 0.2s" })}>
                        {copied ? "Copied!" : "Copy note"}
                      </button>
                    </div>
                  </div>
                  <div style={{ fontFamily: S.mono, fontSize: "0.88rem", lineHeight: 1.9, color: S.text, whiteSpace: "pre-wrap" }}>
                    {renderNote(result.note)}
                  </div>
                </div>

                <button onClick={() => { setTab("input"); setResult(null); setNote(""); }} style={btnStyle("none", S.muted, { border: `1px solid ${S.border}`, alignSelf: "flex-start" })}>
                  &#8592; New note
                </button>
              </div>
            )}
          </div>
        )}

        {/* RULES TAB */}
        {tab === "rules" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: S.bright }}>Expansion Rules</div>
                <div style={{ fontSize: "0.72rem", color: S.muted, marginTop: 2 }}>Auto-applied before the AI coding pass. No API call needed.</div>
              </div>
              <button onClick={() => { setShowAddForm(!showAddForm); setNewRule({ trigger: "", expansion: "", type: "inline" }); }} style={btnStyle("linear-gradient(135deg,#6366f1,#8b5cf6)", "#fff", { padding: "7px 16px" })}>
                {showAddForm ? "Cancel" : "+ Add Rule"}
              </button>
            </div>

            {showAddForm && (
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
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "0.66rem", color: S.muted, display: "block", marginBottom: 3 }}>
                      {newRule.type === "inline" ? "Trigger term" : "Trigger terms (comma-separated)"}
                    </label>
                    <input value={newRule.trigger} onChange={e => setNewRule(p => ({ ...p, trigger: e.target.value }))} placeholder={newRule.type === "inline" ? "e.g. DME" : "e.g. RD, PVD"} style={inputStyle()} />
                  </div>
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

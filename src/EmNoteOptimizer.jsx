import { useState, useCallback } from "react";
import { S, T, btn, btnSm, card, field, fieldLabel, secHead, tabStyle } from "./theme.js";
import PageBar, { wrap } from "./PageBar.jsx";
import { AlertIcon, CopyIcon, EyeIcon, CodingIcon, EditLinesIcon } from "./icons.jsx";

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
4. Flag applicable modifiers based on the clinical scenario
5. Flag imaging mutual exclusivity issues if imaging is mentioned
6. Flag documentation opportunities that elevate visit complexity

DECISION RULES:

NEW vs ESTABLISHED PATIENT:
- If the note indicates "new patient", "referral", "initial visit", "consult", or first-time evaluation → use NEW patient codes (99205/99204/99203 or 92004)
- If established → use established codes (99215/99214/99213 or 92014/92012)
- New patient E/M levels map to the SAME MDM complexity as established (99205=high, 99204=moderate, 99203=low)
- G2211 is NEVER reported with new patient codes — it is for established patients only

INTERMEDIATE vs COMPREHENSIVE EYE CODE:
- 92014/92004 (comprehensive) = all 12 exam elements documented + dilation
- 92012/92002 (intermediate) = 3-11 exam elements, used when full comprehensive exam not warranted
- If the note documents fewer than 12 exam elements and no treatment decisions → consider 92012 (established) or 92002 (new)

SUGGEST EYE CODE (92014/92004/92012/92002) when:
- Visit is primarily driven by examination findings (stable post-op, routine monitoring, no new drugs, no complex MDM)
- Plan is observation only or simple follow-up
- No new prescriptions, no treatment changes, no complex management decisions
- Note lacks MDM complexity elements

FORCE E/M (never use Eye code) when:
- Systemic disease drives the visit (lupus, RA, sickle cell, MS — not covered by Eye visit codes)
- High-risk medication monitoring without ocular pathology (Plaquenil screening with Z79.899 as primary — many payers deny Eye codes with Z-code primary)
- Diagnosis doesn't warrant comprehensive eye exam (blepharitis, corneal abrasion, subconjunctival hemorrhage)
- Prolonged services needed (Eye codes cannot report prolonged add-ons 99417/G2212)

E/M LEVEL SHORTCUTS (use as baseline, then adjust per MDM complexity):
- Level 3 (99213): No treatment — observation only (PVD, dry AMD, stable ERM, stable post-op, no Rx changes)
- Level 4 (99214): Rx/injection/surgery decision — new or changed treatment, injection given, surgery planned (wet AMD injection, RVO with anti-VEGF, DME treatment, laser). Also: drug management changes (new Rx, switch drugs), uveitis with intensive immunosuppressive management.
- Level 5 (99215): ER/emergency-level complexity — urgent conditions, multiple complex decisions (endophthalmitis, acute RD, oncology, disease progression requiring therapy switch with extensive risk discussion). PITFALLS: "blinding disease in the future" is NOT Level 5 — must be threat TODAY. "Severe disease" alone is NOT Level 5. Decision for RD surgery is NOT automatically Level 5. Must meet 2 of 3 MDM categories: (1) illness posing threat to body function with near-term treatment, (2) decision regarding emergency major surgery or hospitalization.

G2211 applies only when: E/M code (99213-99215) supported AND established patient with serious chronic condition. Do NOT report G2211 with -25 modifier. NEVER with eye codes (92012/92014). 0.49 RVU / $16.37 (2026 CF $33.40 × 0.49).

SURGERY MODIFIER REIMBURSEMENT:
- -58 (staged/planned): new postop period starts, 100% allowable.
- -78 (unplanned return to OR): NO new postop period, 70% allowable.
- -79 (unrelated procedure in postop): new postop period starts, 100% allowable.

GLOBAL PERIODS — flag when relevant to modifier selection:
- 90-day global: ALL vitrectomy (67036-67043), ALL RD codes (67107-67113), IOL codes, 0810T, focal laser 67210, choroidal photocoag 67220, YAG capsulotomy 66821.
- 10-day global: Injection 67028, prophylactic laser 67145, tear laser 67105, PRP 67228.
- 90-day global ALSO includes: 67015 (vitreous tap/biopsy) — use -57, NOT -25.
- Same-day exam modifier by global: 10-day procedures → use -25 on E/M. 90-day procedures → use -57 on E/M.
- RETINA LASER MODIFIER RULE: 67105 (laser RD), 67145 (prophylactic laser), 67228 (PRP) → all 10-day global → use -25. 67210 (focal/grid macular laser), 67220 (choroidal photocoag), and 66821 (YAG capsulotomy) are 90-day global → use -57.
- YAG POSTOP AWARENESS: If patient is within 90 days of 66821 YAG by another surgeon, injection → 67028-79, E/M → add -24.
- PNEUMATIC RETINOPEXY (RD): 67110 + 65800 (AC tap) — NOT bundled, ALWAYS bill both. E/M: 99215-57. Next-day staged laser: 67105-58.

TRANSFER OF CARE — flag when postop care is split:
- -54 = Surgical care only (surgeon operates, doesn't do postop). CMS now requires for ALL 90-day globals when providing surgery only, even informal transfers.
- -55 = Postop management only. -56 = Preop management only. Only for formal documented transfer.
- G0559 = Add-on for postop follow-up by non-surgeon physician, different specialty, within 90-day global, NO formal transfer. E/M add-on only. Medicare Part B only.

MODIFIER RULES — flag when applicable:
- -25: Significant, separately identifiable E/M on same day as a minor procedure (injection, laser, YAG). Example: wet AMD injection (linked to AMD) + new PVD symptoms evaluated (exam linked to PVD with -25). ONLY flag when there are TWO distinct clinical reasons for the visit. NEVER append -25 to new patient codes (99203/99204/99205, 92002/92004) — new patient visits inherently include decision-making, so -25 is redundant and incorrect.
- -57: Decision for major surgery made at this visit (e.g., scheduling RD repair, PPV, scleral buckle). The E/M note supports the surgical decision. ONLY for 90-day global procedures performed SAME DAY or NEXT DAY. Never use -57 on injection days — injections are 0-day global = always -25.
- -24: Unrelated E/M during a postop global period. Example: patient is 3 weeks post-PPV but presents with new fellow-eye wet AMD. Must document new symptoms or different diagnosis.
- -58: Planned/staged procedure during postop period (e.g., planned second-eye surgery, planned laser after initial PPV). New postop period starts. 100% allowable.
- -78: Unplanned return to OR for complication of original procedure during postop (e.g., re-PPV for recurrent RD within global period). NO new postop period. 70% allowable.
- -79: Unrelated procedure during postop period (e.g., cataract surgery on fellow eye during PPV global period). New postop period starts. 100% allowable.

CRITICAL MODIFIER CONSTRAINTS:
- NEVER append -RT or -LT to E/M codes (99213-99215) or Eye visit codes (92012/92014/92002/92004). Laterality modifiers are ONLY for procedures and diagnostics.
- 99211 is NEVER billable on injection days — 99211 bundles with all testing and cannot coexist with procedures. If an injection is given, the minimum E/M is 99213 (with -25).
- -25 screening rule: If the exam is SOLELY to confirm need for a previously planned injection (no independent E/M decision-making beyond the injection), the E/M is NOT separately billable. -25 requires a separately identifiable evaluation.
- -52 (reduced services): NEVER append to inherently bilateral tests (92133, 92134, 92137, 92250, 92235, 92240, 92242, 92273, 92274, 92083). These are billed once regardless of one or both eyes.
- Modifier order on claims: payment modifiers FIRST (-58, -79, -78, -51), then informational modifiers (-RT, -LT). Example: 67015-78-LT, not 67015-LT-78.

IMAGING MUTUAL EXCLUSIVITY (flag conflicts if imaging mentioned):
- 92250 covers ALL fundus photography modes: color photos, FAF (fundus autofluorescence), NIR, red-free. FAF is NOT a separate code — it is billed as 92250.
- OCT (92134) and fundus photos/FAF (92250): MUTUALLY EXCLUSIVE — cannot bill both same eye same day per NCCI edits
- OCTA (92137) and fundus photos/FAF (92250): MUTUALLY EXCLUSIVE — same NCCI bundling as 92134. For GA patients getting both FAF and OCTA, alternate imaging across visits.
- ICG (92240) and fundus photos/FAF (92250): MUTUALLY EXCLUSIVE
- 92242 (combo FA/ICG): MUTUALLY EXCLUSIVE with 92235, 92240, 92250 — but CAN be billed with 92134 (OCT) or 92137 (OCTA)
- FA (92235) and fundus photos/FAF (92250): NOT mutually exclusive — can bill both same day
- FA (92235) and OCTA (92137): NOT mutually exclusive — can bill both same day
- CPT 92137 (OCTA + retinal OCT combo, new 1/1/2025): Use 92137 instead of 92134 when OCTA is performed. 92134 reimbursement reduced as of 1/1/2025. 92133, 92134, and 92137 are all mutually exclusive with each other.
- APRIL 2026 UPDATE: NCCI removed PTP edits between 92137 and 92235/92240/92242 (retroactive to Oct 2025). OCTA + FA and OCTA + ICG CAN now be billed same day. NCCI edits between 92137 and eye visit codes (92002/92004/92012/92014) were also DELETED (Jan 2026, retroactive to 10/1/2025) — no modifier needed when billing 92137 with eye visit codes.
- OCTA DOCUMENTATION: Flag if OCTA mentioned but medical necessity not documented. Must document WHY OCTA needed instead of OCT alone and how findings influenced treatment.
- BILATERAL INJECTION (67028): MUE = 1, bilateral indicator = 1 (150% payment). Bill single line with -50 modifier. Wet AMD + GA same eye → 1 unit of 67028 only, link both ICD-10 codes.
- 0996T (new 2026): Capsular bag prosthesis + IOL + scleral fixation + vitrectomy. Do NOT bill 66985/66986/67036 separately.

DOCUMENTATION PEARLS — flag opportunities:
- Phone calls with referring/consulting physicians: should be documented (adds to MDM data reviewed)
- Independent historian: if family member provides history (dementia, language barrier, pediatric) — document it, adds complexity
- New prescriptions or drug management changes: elevates to at minimum Level 4 (99214)
- Data reviewed (OCT, photos, labs, outside records): must be explicitly stated as "reviewed" to count for MDM

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
one of: 99215 / 99214 / 99213 / 99205 / 99204 / 99203 / 92014 / 92012 / 92004 / 92002
---G2211---
YES or NO
---EYE_CODE_NOTE---
If suggesting eye code: one sentence explaining why 92014/92004 fits better. If not: NONE
---MODIFIERS---
List any applicable modifiers with one-line explanation each (e.g., "-25: separate E/M for PVD evaluation on same day as AMD injection"). If none apply: NONE
---IMAGING---
List any imaging mutual exclusivity issues or recommendations (e.g., "OCTA performed — bill 92137 instead of 92134"). If no imaging mentioned or no issues: NONE
---DOC_TIPS---
List documentation opportunities to strengthen the note (e.g., "Document phone call with referring MD to add to data reviewed"). If none: NONE
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
    eyeCodeNote: sec("EYE_CODE_NOTE", "MODIFIERS"),
    modifiers: sec("MODIFIERS", "IMAGING").split("\n").map(s => s.replace(/^[-•]\s*/, "").trim()).filter(Boolean),
    imaging: sec("IMAGING", "DOC_TIPS").split("\n").map(s => s.replace(/^[-•]\s*/, "").trim()).filter(Boolean),
    docTips: sec("DOC_TIPS", "CHANGES").split("\n").map(s => s.replace(/^[-•]\s*/, "").trim()).filter(Boolean),
    changes: sec("CHANGES", "NOTE").split("\n").map(s => s.replace(/^[-•]\s*/, "").trim()).filter(Boolean),
    note: sec("NOTE", "END"),
  };
}

const isEyeCode = (code) => ["92014", "92004", "92012", "92002"].includes(code);

// ── Styles ──────────────────────────────────────────────────────────

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
        {i > 0 && <span style={{ background: T.goldSoft, color: T.ink, fontWeight: 600, padding: "0 4px", borderRadius: 3, marginRight: 3 }}>+</span>}
        {part}
      </span>
    ));
  }

  const getCodeStyle = (code) => {
    if (code === "99215") return { bg: T.greenSoft, color: T.green, border: T.green };
    if (code === "99214") return { bg: T.accentSoft, color: T.accent, border: T.accent };
    if (code === "99213") return { bg: T.paper, color: T.muted, border: T.lineStrong };
    if (isEyeCode(code)) return { bg: T.accentSoft, color: T.accent, border: T.accent };
    return { bg: T.paper, color: T.muted, border: T.lineStrong };
  };

  const cc = result ? getCodeStyle(result.code) : {};

  const inputStyle = (extra = {}) => ({
    background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.r,
    padding: "6px 10px", color: T.ink, fontFamily: T.sans, fontSize: 13.5,
    width: "100%", boxSizing: "border-box", outline: "none", ...extra,
  });

  // Small button in the Phase 2 style; solid when bg is a fill color, else secondary.
  const btnStyle = (bg, color, extra = {}) => {
    const solid = bg && bg !== "none" && bg !== "transparent" && bg !== T.paper && bg !== T.surface;
    return btnSm(solid ? "primary" : "secondary", {
      background: solid ? bg : T.surface, borderColor: solid ? bg : T.line, color, ...extra,
    });
  };

  const flagBox = (tone) => {
    const m = {
      amber: [T.amberSoft, T.goldSoft, T.amber],
      accent: [T.accentSoft, T.accentLine, T.accent],
      green: [T.greenSoft, T.green, T.green],
      muted: [T.surface, T.line, T.ink2],
    }[tone];
    return { display: "flex", gap: 10, alignItems: "flex-start", background: m[0], border: `1px solid ${m[1]}`, borderRadius: T.r, padding: "10px 14px", fontSize: 13, color: m[2], lineHeight: 1.5 };
  };

  return (
    <div style={{ minHeight: "100vh", background: T.paper, color: T.ink, fontFamily: T.sans }}>

      {/* Header */}
      <PageBar onBack={onBack} backLabel="Back" title="E/M Note Optimizer" sub="99213-99215 | G2211 | Eye Codes | Modifiers | Imaging" />

      {/* Tabs */}
      <nav style={{ background: T.surface, borderBottom: `1px solid ${T.line}` }}>
        <div className="vra-wrap" style={wrap({ display: "flex", gap: 2, overflowX: "auto" })}>
        {[["input", "Your Note"], ["output", "Optimized"], ["rules", "Expansion Rules"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={tabStyle(tab === id, { fontSize: 13, marginBottom: -1 })}>
            {label}
          </button>
        ))}
        </div>
      </nav>

      <div className="vra-wrap" style={wrap({ paddingTop: 20, paddingBottom: 40 })}>

        {/* INPUT TAB */}
        {tab === "input" && (
          <div>
            <div style={field({ marginBottom: 12 })}>
              <label style={fieldLabel()}>Anthropic API Key</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type={showApiKey ? "text" : "password"}
                  className="vra-input"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  style={inputStyle({ flex: 1, height: 32, padding: "0 10px", fontFamily: T.mono, fontSize: 13 })}
                />
                <button onClick={() => setShowApiKey(!showApiKey)} style={btnStyle("transparent", T.ink2, { height: 32 })}>
                  {showApiKey ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <p style={{ fontSize: 13, color: T.ink2, lineHeight: 1.5, margin: "14px 0 12px" }}>
              <span style={{ color: T.amber, fontWeight: 600 }}>No PHI.</span> Paste your note as-is. The tool picks the right code — E/M or eye exam — and makes minimum additions only.
            </p>

            <div className="vra-editor" style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.rLg, overflow: "hidden" }}>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Paste your note here..."
                rows={12}
                style={{ display: "block", width: "100%", minHeight: 250, border: 0, background: "transparent", padding: "16px 18px", color: T.ink, fontFamily: T.mono, fontSize: 14, lineHeight: 1.65, resize: "vertical", boxSizing: "border-box", outline: "none" }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderTop: `1px solid ${T.line}`, background: T.paper }}>
                <span style={{ fontSize: 12, color: T.muted, flex: 1, minWidth: 0 }}>Expansion rules are applied before the AI coding pass.</span>
                <button onClick={run} disabled={loading || !note.trim()} style={btn("primary", {
                  background: loading || !note.trim() ? T.accentSoft : T.accent,
                  borderColor: loading || !note.trim() ? T.line : T.accent,
                  color: loading || !note.trim() ? T.muted : T.onAccent,
                  fontSize: 13.5, cursor: loading || !note.trim() ? "not-allowed" : "pointer",
                })}>
                  {loading ? "Analyzing..." : "Optimize →"}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", color: T.red, fontSize: 13, background: T.redSoft, padding: "10px 14px", borderRadius: T.r, border: "1px solid #F0C4BF", marginTop: 12, wordBreak: "break-all", maxHeight: 100, overflowY: "auto" }}>
                {error}
              </div>
            )}
          </div>
        )}

        {/* OUTPUT TAB */}
        {tab === "output" && (
          <div>
            {loading && (
              <div style={{ textAlign: "center", padding: "60px 0", color: T.muted, fontSize: 13.5 }}>
                <div style={{ width: 30, height: 30, border: `3px solid ${T.line}`, borderTopColor: T.accent, borderRadius: "50%", animation: "spin .8s linear infinite", margin: "0 auto 12px" }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                Analyzing...
              </div>
            )}
            {!loading && !result && <div style={{ textAlign: "center", padding: "60px 0", color: T.muted, fontSize: 13.5 }}>Optimize a note first.</div>}
            {result && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                {/* Codes */}
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", height: 30, padding: "0 12px", borderRadius: T.r, background: cc.bg, border: `1px solid ${cc.border}`, fontFamily: T.mono, fontWeight: 500, fontSize: 14, color: cc.color }}>
                      {result.code}
                    </span>
                    {result.g2211 && (
                      <span style={{ display: "inline-flex", alignItems: "center", height: 30, padding: "0 12px", borderRadius: T.r, background: T.goldSoft, border: `1px solid ${T.gold}`, fontFamily: T.mono, fontWeight: 500, fontSize: 14, color: T.ink }}>+ G2211</span>
                    )}
                </div>

                {isEyeCode(result.code) && result.eyeCodeNote && result.eyeCodeNote !== "NONE" && (
                  <div style={flagBox("accent")}>
                    <span style={{ marginTop: 1 }}><EyeIcon size={16} /></span>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>Eye Exam Code Recommended</div>
                      <div style={{ color: T.ink2 }}>{result.eyeCodeNote}</div>
                      <div style={{ fontSize: 12.5, marginTop: 4 }}>No MDM documentation needed — exam elements justify this code.</div>
                    </div>
                  </div>
                )}

                {result.modifiers?.filter(m => m && m !== "NONE" && m !== "None").length > 0 && (
                  <div style={flagBox("amber")}>
                    <span style={{ marginTop: 1 }}><AlertIcon /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Modifier Alert</div>
                    {result.modifiers.filter(m => m && m !== "NONE" && m !== "None").map((m, i) => (
                      <div key={i} style={{ paddingLeft: 12, position: "relative", marginBottom: 2 }}>
                        <span style={{ position: "absolute", left: 0 }}>•</span>{m}
                      </div>
                    ))}
                    </div>
                  </div>
                )}

                {result.imaging?.filter(m => m && m !== "NONE" && m !== "None").length > 0 && (
                  <div style={flagBox("accent")}>
                    <span style={{ marginTop: 1 }}><CodingIcon size={16} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Imaging / CPT</div>
                    {result.imaging.filter(m => m && m !== "NONE" && m !== "None").map((m, i) => (
                      <div key={i} style={{ paddingLeft: 12, position: "relative", marginBottom: 2, color: T.ink2 }}>
                        <span style={{ position: "absolute", left: 0, color: T.accent }}>•</span>{m}
                      </div>
                    ))}
                    </div>
                  </div>
                )}

                {result.docTips?.filter(m => m && m !== "NONE" && m !== "None").length > 0 && (
                  <div style={flagBox("accent")}>
                    <span style={{ marginTop: 1 }}><EditLinesIcon size={16} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Documentation Tips</div>
                    {result.docTips.filter(m => m && m !== "NONE" && m !== "None").map((m, i) => (
                      <div key={i} style={{ paddingLeft: 12, position: "relative", marginBottom: 2, color: T.ink2 }}>
                        <span style={{ position: "absolute", left: 0, color: T.accent }}>•</span>{m}
                      </div>
                    ))}
                    </div>
                  </div>
                )}

                <div className="vra-row2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {result.expansionsApplied?.length > 0 && (
                  <div style={field()}>
                    <div style={{ fontSize: 13.5, color: T.ink, fontWeight: 600, marginBottom: 4 }}>Auto-expanded</div>
                    <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.5 }}>{result.expansionsApplied.join(", ")} — standard language inserted</div>
                  </div>
                )}

                {result.changes?.filter(c => c && c !== "None needed").length > 0 && (
                  <div style={field()}>
                    <div style={{ fontSize: 13.5, color: T.ink, fontWeight: 600, marginBottom: 6 }}>Coding additions</div>
                    {result.changes.filter(c => c && c !== "None needed").map((c, i) => (
                      <div key={i} style={{ fontSize: 13, color: T.ink2, paddingLeft: 16, position: "relative", marginBottom: 3, lineHeight: 1.5 }}>
                        <span style={{ position: "absolute", left: 0, color: T.green }}>&#10003;</span>{c}
                      </div>
                    ))}
                  </div>
                )}
                </div>

                {/* The note */}
                <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.rLg }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px 10px 16px", borderBottom: `1px solid ${T.line}`, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 14, color: T.accent, fontWeight: 600 }}>Your note with additions</div>
                    <div style={{ fontSize: 12, color: T.muted, fontFamily: T.sans }}>
                      <span style={{ background: T.goldSoft, color: T.ink, padding: "0 4px", borderRadius: 3, fontWeight: 600, marginRight: 4 }}>+</span>= added
                    </div>
                    <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                      <button onClick={() => { setTab("input"); setResult(null); setNote(""); }} style={btnStyle("none", T.ink, {})}>
                        &#8592; New note
                      </button>
                      <button onClick={copyNote} style={btnStyle(copied ? T.green : T.accent, T.onAccent, { transition: "all .2s" })}>
                        <CopyIcon size={14} />{copied ? "Copied!" : "Copy note"}
                      </button>
                    </div>
                  </div>
                  <div style={{ fontFamily: T.mono, fontSize: 13.5, lineHeight: 1.75, color: T.ink, whiteSpace: "pre-wrap", padding: "16px 18px" }}>
                    {renderNote(result.note)}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* RULES TAB */}
        {tab === "rules" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.accent }}>Expansion Rules</div>
                <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>Auto-applied before the AI coding pass. No API call needed.</div>
              </div>
              <button onClick={() => { setShowAddForm(!showAddForm); setNewRule({ trigger: "", expansion: "", type: "inline" }); }} style={btnStyle(showAddForm ? "transparent" : T.accent, showAddForm ? T.ink : T.onAccent, {})}>
                {showAddForm ? "Cancel" : "+ Add Rule"}
              </button>
            </div>

            {showAddForm && (
              <div style={field({ borderColor: T.accentLine, marginBottom: 16, padding: 16 })}>
                <div style={{ fontSize: 13.5, color: T.ink, fontWeight: 600, marginBottom: 10 }}>New Rule</div>
                <div style={{ display: "flex", gap: 14, marginBottom: 10 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: T.ink, cursor: "pointer" }}>
                    <input type="radio" name="newRuleType" style={{ accentColor: T.accent, margin: 0 }} checked={newRule.type === "inline"} onChange={() => setNewRule(p => ({ ...p, type: "inline" }))} /> Inline
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: T.ink, cursor: "pointer" }}>
                    <input type="radio" name="newRuleType" style={{ accentColor: T.accent, margin: 0 }} checked={newRule.type === "plan"} onChange={() => setNewRule(p => ({ ...p, type: "plan" }))} /> Plan-appended
                  </label>
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={fieldLabel()}>
                      {newRule.type === "inline" ? "Trigger term" : "Trigger terms (comma-separated)"}
                    </label>
                    <input className="vra-input" value={newRule.trigger} onChange={e => setNewRule(p => ({ ...p, trigger: e.target.value }))} placeholder={newRule.type === "inline" ? "e.g. DME" : "e.g. RD, PVD"} style={inputStyle({ fontFamily: T.mono })} />
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={fieldLabel()}>Expansion text</label>
                  <textarea className="vra-input" value={newRule.expansion} onChange={e => setNewRule(p => ({ ...p, expansion: e.target.value }))} rows={2} placeholder="The text that replaces or is appended..." style={inputStyle({ resize: "vertical", lineHeight: 1.5 })} />
                </div>
                <button onClick={addRule} disabled={!newRule.trigger.trim() || !newRule.expansion.trim()} style={btnStyle(!newRule.trigger.trim() || !newRule.expansion.trim() ? T.accentSoft : T.accent, !newRule.trigger.trim() || !newRule.expansion.trim() ? T.muted : T.onAccent, !newRule.trigger.trim() || !newRule.expansion.trim() ? { borderColor: T.line } : {})}>
                  Save Rule
                </button>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <h2 style={secHead({ marginTop: 6, fontSize: 13.5, color: T.ink })}>
                Inline Replacements ({inlineRules.length})
              </h2>
              <div style={card({ overflow: "hidden" })}>
              {inlineRules.map((rule, idx) => (
                <div key={rule.id} style={{ padding: "10px 12px 10px 16px", borderTop: idx === 0 ? "none" : `1px solid ${T.line}` }}>
                  {editingRule?.id === rule.id ? (
                    <div>
                      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                        <input className="vra-input" value={editingRule.trigger} onChange={e => setEditingRule(p => ({ ...p, trigger: e.target.value }))} style={inputStyle({ flex: "0 0 120px", fontFamily: T.mono })} />
                        <input className="vra-input" value={editingRule.expansion} onChange={e => setEditingRule(p => ({ ...p, expansion: e.target.value }))} style={inputStyle({ flex: "1 1 200px", width: "auto" })} />
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={saveEditingRule} style={btnStyle(T.accent, T.onAccent, {})}>Save</button>
                        <button onClick={() => setEditingRule(null)} style={btnStyle("transparent", T.ink2, {})}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontFamily: T.mono, fontWeight: 500, fontSize: 13, color: T.accent }}>{rule.trigger}</span>
                        <div style={{ fontSize: 13, color: T.ink2, marginTop: 3, lineHeight: 1.45, wordBreak: "break-word" }}>{rule.expansion}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button onClick={() => setEditingRule({ ...rule })} style={btnStyle("transparent", T.ink2, {})}>Edit</button>
                        {!rule.builtin && <button onClick={() => deleteRule(rule.id, "inline")} style={btnStyle("transparent", T.red, {})}>Del</button>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              </div>
            </div>

            <div>
              <h2 style={secHead({ marginTop: 6, fontSize: 13.5, color: T.ink })}>
                Plan-Appended ({planRules.length})
              </h2>
              <div style={card({ overflow: "hidden" })}>
              {planRules.map((rule, idx) => (
                <div key={rule.id} style={{ padding: "10px 12px 10px 16px", borderTop: idx === 0 ? "none" : `1px solid ${T.line}` }}>
                  {editingRule?.id === rule.id ? (
                    <div>
                      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                        <input className="vra-input" value={editingRule.triggers} onChange={e => setEditingRule(p => ({ ...p, triggers: e.target.value }))} style={inputStyle({ flex: "0 0 160px", fontFamily: T.mono })} placeholder="RD, PVD, HST" />
                        <input className="vra-input" value={editingRule.expansion} onChange={e => setEditingRule(p => ({ ...p, expansion: e.target.value }))} style={inputStyle({ flex: "1 1 200px", width: "auto" })} />
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={saveEditingRule} style={btnStyle(T.accent, T.onAccent, {})}>Save</button>
                        <button onClick={() => setEditingRule(null)} style={btnStyle("transparent", T.ink2, {})}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontFamily: T.mono, fontWeight: 500, fontSize: 13, color: T.accent }}>{rule.triggers}</span>
                        <span style={{ fontSize: 12, color: T.muted, marginLeft: 6 }}>&#8594; appended under Plan</span>
                        <div style={{ fontSize: 13, color: T.ink2, marginTop: 3, lineHeight: 1.45, wordBreak: "break-word" }}>{rule.expansion}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button onClick={() => setEditingRule({ ...rule })} style={btnStyle("transparent", T.ink2, {})}>Edit</button>
                        {!rule.builtin && <button onClick={() => deleteRule(rule.id, "plan")} style={btnStyle("transparent", T.red, {})}>Del</button>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

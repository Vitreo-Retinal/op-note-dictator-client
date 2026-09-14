import { useState, useCallback } from "react";

// ── Intake CC/HPI — tech-facing tool (Sep 2026, per Mari) ────────────
// WHY: the OCB $3.9M FCA settlement (DOJ, Jul 31 2026) turned modifier-25 on
// injection days into an audit target. Auditors read one note in a vacuum, so a
// chief complaint that describes the APPOINTMENT ("here for injection", "8-week
// visit") reads as an exam that merely confirms a planned procedure — not
// separately identifiable. This tool restates what the tech already knows in
// purpose-neutral language and lints what they wrote.
//
// Techs use this tile. It deliberately shows NO codes, NO RVUs, NO
// reimbursement — only whether the wording is audit-safe.
const API_BASE = import.meta.env.VITE_API_BASE || "https://op-note-dictator-server-production.up.railway.app";

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

// ── Do / Don't cheat sheet (Sep 2026, per Mari) ──────────────────────
// Mirrors the phrase list in server/lib/modifier25-lint.js and the printed
// tech standard (docs/VRA_Injection_Day_Intake_Standard) so the three can't drift.
const DONT_LIST = [
  '"here for injection / here for inj / here for shot"',
  '"8-week visit / q8 visit / 6 wk f/u"',
  '"routine / scheduled / regular / monthly injection"',
  '"due for injection"',
  '"injection visit / IVI visit"',
  '"last injection 6/07/2026"',
  'drug names or regimen ("on Vabysmo q8")',
  "a symptom the patient did not report",
];
const DO_LIST = [
  'the condition and eye ("Wet AMD OD. Dry AMD OS.")',
  'what the patient reports in their words ("Reports mild distortion OD, unchanged." / "No new visual complaints OS.")',
  'any new problem ("New floaters OS x 3 days.")',
  'relevant systemic context if known ("T2DM, last A1c 7.1")',
];

// ── [DOCUMENT: …] placeholder highlighting ───────────────────────────
// Same convention as the drug guard: anything the tool could not source from
// the input comes back as a placeholder the human must fill in. Amber so it is
// impossible to paste past by accident.
function renderWithPlaceholders(text) {
  if (!text) return null;
  const parts = String(text).split(/(\[DOCUMENT:[^\]]*\])/g);
  return parts.map((p, i) =>
    /^\[DOCUMENT:/.test(p)
      ? <span key={i} style={{ background: "#451a03", color: "#fcd34d", border: "1px solid #f59e0b", borderRadius: 4, padding: "0 4px", fontWeight: 700 }}>{p}</span>
      : <span key={i}>{p}</span>
  );
}

// ── Component ───────────────────────────────────────────────────────
export default function IntakeHpi({ onBack }) {
  const [intakeText, setIntakeText] = useState("");
  const [hpi, setHpi] = useState(null);
  const [flags, setFlags] = useState([]);
  const [checkedOnly, setCheckedOnly] = useState(false);
  const [ran, setRan] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showSheet, setShowSheet] = useState(false); // cheat sheet starts collapsed

  // Auth: the global fetch wrapper in main.jsx attaches
  // `Authorization: Bearer <vra_token>` to every API_BASE call, so a plain
  // fetch here carries the same token the rest of the hub uses.
  const run = useCallback(async (checkOnly) => {
    if (!intakeText.trim()) return;
    setLoading(true);
    setError("");
    setHpi(null);
    setFlags([]);
    try {
      const res = await fetch(`${API_BASE}/api/generate-hpi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkOnly ? { intakeText: intakeText.trim(), checkOnly: true } : { intakeText: intakeText.trim() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message || data.error);
      setHpi(data.hpi || null);
      setFlags(Array.isArray(data.flags) ? data.flags : []);
      setCheckedOnly(!!checkOnly);
      setRan(true);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [intakeText]);

  const copyHpi = useCallback(async () => {
    if (!hpi) return;
    try {
      await navigator.clipboard.writeText(hpi);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = hpi;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [hpi]);

  const blockCount = flags.filter(f => f.severity === "block").length;

  return (
    <div style={{ minHeight: "100vh", background: S.bg, fontFamily: S.font, color: S.text }}>
      {/* Header */}
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button onClick={onBack} style={{ background: "none", border: `1px solid ${S.border}`, borderRadius: 8, padding: "6px 14px", color: S.muted, fontFamily: S.font, fontSize: "0.78rem", cursor: "pointer" }}>&larr; Home</button>
        <span style={{ fontSize: "1rem", fontWeight: 700, color: S.bright }}>Intake CC/HPI</span>
        <span style={{ fontSize: "0.74rem", color: S.muted, fontFamily: S.mono }}>Audit-safe chief complaint &amp; HPI for injection-day visits</span>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 20px 56px" }}>

        {/* Input */}
        <div style={{ fontSize: "0.72rem", color: S.muted, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
          Intake notes
        </div>
        <div style={{ fontSize: "0.74rem", color: "#94a3b8", lineHeight: 1.6, marginBottom: 8 }}>
          What you have: age and gender, the condition and which eye, what the patient tells you, and the other eye.
          Describe the <em>problem</em>, never the appointment.
        </div>
        <textarea
          value={intakeText}
          onChange={e => setIntakeText(e.target.value)}
          placeholder="87 yo M wet AMD OD, mild distortion OD, no complaints OS; dry AMD OS"
          rows={7}
          style={{ display: "block", width: "100%", background: S.card, border: "1px solid #475569", borderRadius: 10, padding: 14, color: S.bright, fontFamily: S.mono, fontSize: "0.85rem", lineHeight: 1.8, resize: "vertical", boxSizing: "border-box" }}
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
          <button
            onClick={() => run(false)}
            disabled={loading || !intakeText.trim()}
            style={{
              background: loading || !intakeText.trim() ? S.card : "linear-gradient(135deg,#6366f1,#8b5cf6)",
              color: loading || !intakeText.trim() ? "#475569" : "#fff",
              border: "none", borderRadius: 8, padding: "10px 24px", fontSize: "0.9rem",
              fontFamily: S.font, fontWeight: 600, cursor: loading || !intakeText.trim() ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Working..." : "Generate CC/HPI →"}
          </button>
          <button
            onClick={() => run(true)}
            disabled={loading || !intakeText.trim()}
            title="Paste an HPI you already wrote in NextGen — this checks the wording without rewriting it."
            style={{
              background: S.card,
              color: loading || !intakeText.trim() ? "#475569" : S.text,
              border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 20px", fontSize: "0.85rem",
              fontFamily: S.font, fontWeight: 600, cursor: loading || !intakeText.trim() ? "not-allowed" : "pointer",
            }}
          >
            Check wording only
          </button>
          {intakeText.trim() && !loading && (
            <button
              onClick={() => { setIntakeText(""); setHpi(null); setFlags([]); setRan(false); setError(""); }}
              style={{ marginLeft: "auto", padding: "9px 14px", borderRadius: 8, border: `1px solid ${S.border}`, background: S.card, color: S.muted, fontFamily: S.mono, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
            >✕ Clear</button>
          )}
        </div>

        {error && (
          <div style={{ color: "#f87171", fontSize: "0.74rem", background: "#1a0808", padding: "8px 12px", borderRadius: 6, border: "1px solid #7f1d1d", marginTop: 12, wordBreak: "break-word" }}>
            {error}
          </div>
        )}

        {/* Result */}
        {hpi && (
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: 18, marginTop: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <div style={{ fontSize: "0.66rem", color: S.accent, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                CC / HPI (audit-safe)
              </div>
              <button
                onClick={copyHpi}
                style={{ background: copied ? "#059669" : S.bg, color: copied ? "#fff" : "#94a3b8", border: `1px solid ${copied ? "#059669" : S.border}`, borderRadius: 6, padding: "3px 10px", fontSize: "0.68rem", fontFamily: S.font, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
              >
                {copied ? "Copied!" : "Copy CC/HPI"}
              </button>
            </div>
            <div style={{ fontFamily: S.mono, fontSize: "0.85rem", lineHeight: 1.9, color: S.text, whiteSpace: "pre-wrap" }}>
              {renderWithPlaceholders(hpi)}
            </div>
            {/\[DOCUMENT:/.test(hpi) && (
              <div style={{ fontSize: "0.68rem", color: "#fcd34d", marginTop: 10, lineHeight: 1.5 }}>
                Fill in every amber <span style={{ fontFamily: S.mono }}>[DOCUMENT: …]</span> before pasting — ask the patient, or leave it for the doctor.
              </div>
            )}
            <div style={{ fontSize: "0.68rem", color: S.muted, marginTop: 10, lineHeight: 1.5 }}>
              Paste this into the CC/HPI fields in NextGen.
            </div>
          </div>
        )}

        {/* Flags */}
        {flags.length > 0 && (
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: "14px 18px", marginTop: 14 }}>
            <div style={{ fontSize: "0.66rem", color: S.muted, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
              Wording to fix{blockCount > 0 ? ` — ${blockCount} must be removed` : ""}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {flags.map((f, i) => {
                const isBlock = f.severity === "block";
                return (
                  <div key={i} style={{ background: isBlock ? "#1a0808" : "#1c1206", border: `1px solid ${isBlock ? "#7f1d1d" : "#f59e0b"}`, borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{
                        background: isBlock ? "#7f1d1d" : "#451a03",
                        color: isBlock ? "#fca5a5" : "#fcd34d",
                        border: `1px solid ${isBlock ? "#ef4444" : "#f59e0b"}`,
                        borderRadius: 20, padding: "1px 9px", fontSize: "0.6rem",
                        fontFamily: S.mono, fontWeight: 700, letterSpacing: "0.06em", flexShrink: 0,
                      }}>
                        {isBlock ? "REMOVE" : "REVIEW"}
                      </span>
                      <span style={{ fontFamily: S.mono, fontSize: "0.8rem", color: S.bright, fontWeight: 700 }}>
                        &ldquo;{f.phrase}&rdquo;
                      </span>
                    </div>
                    {f.why && <div style={{ fontSize: "0.76rem", color: "#94a3b8", lineHeight: 1.5 }}>{f.why}</div>}
                    {f.suggest && (
                      <div style={{ fontSize: "0.76rem", color: isBlock ? "#fca5a5" : "#fde68a", lineHeight: 1.5, marginTop: 4 }}>
                        Write instead: {f.suggest}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Clean result for a check-only run */}
        {ran && checkedOnly && flags.length === 0 && !error && (
          <div style={{ background: "#0f1f14", border: "1px solid #166534", borderRadius: 10, padding: "12px 16px", marginTop: 14, fontSize: "0.8rem", color: "#86efac" }}>
            ✓ Nothing flagged — this wording is audit-safe.
          </div>
        )}

        {/* ── Do / Don't cheat sheet (collapsed by default) ─────────── */}
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, marginTop: 22, overflow: "hidden" }}>
          <button
            onClick={() => setShowSheet(v => !v)}
            style={{ width: "100%", background: "none", border: "none", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: S.bright, fontFamily: S.font, fontSize: "0.86rem", fontWeight: 700, textAlign: "left" }}
          >
            <span style={{ color: S.accentLight, fontSize: "0.8rem", width: 12, flexShrink: 0 }}>{showSheet ? "▾" : "▸"}</span>
            Do / Don&rsquo;t cheat sheet
            <span style={{ marginLeft: "auto", fontSize: "0.68rem", color: S.muted, fontFamily: S.mono, fontWeight: 400 }}>
              {showSheet ? "hide" : "show"}
            </span>
          </button>

          {showSheet && (
            <div style={{ borderTop: `1px solid ${S.border}`, padding: "14px 16px" }}>
              {/* DON'T */}
              <div style={{ fontSize: "0.66rem", color: "#fca5a5", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                Don&rsquo;t write
              </div>
              <div style={{ marginBottom: 16 }}>
                {DONT_LIST.map((d, i) => (
                  <div key={i} style={{ fontSize: "0.8rem", color: "#fecaca", lineHeight: 1.6, paddingLeft: 16, position: "relative", marginBottom: 3 }}>
                    <span style={{ position: "absolute", left: 0, color: "#ef4444", fontWeight: 700 }}>✕</span>
                    {d}
                  </div>
                ))}
              </div>

              {/* DO */}
              <div style={{ fontSize: "0.66rem", color: S.green, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                Do write
              </div>
              <div style={{ marginBottom: 16 }}>
                {DO_LIST.map((d, i) => (
                  <div key={i} style={{ fontSize: "0.8rem", color: "#86efac", lineHeight: 1.6, paddingLeft: 16, position: "relative", marginBottom: 3 }}>
                    <span style={{ position: "absolute", left: 0, color: "#16a34a", fontWeight: 700 }}>✓</span>
                    {d}
                  </div>
                ))}
              </div>

              {/* The rule */}
              <div style={{ background: "#451a03", border: `1px solid ${S.amber}`, borderRadius: 8, padding: "10px 14px", fontSize: "0.82rem", color: "#fde68a", lineHeight: 1.6, fontWeight: 700 }}>
                Never write a symptom the patient did not report. If you don&rsquo;t know, leave it for the doctor.
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

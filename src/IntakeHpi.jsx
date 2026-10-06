import { useState, useCallback } from "react";
import { S, T, btn, btnSm, chip, field, secHead } from "./theme.js";
import PageBar, { wrap } from "./PageBar.jsx";
import { AlertIcon, CopyIcon, ChevronRightIcon, ChevronDownIcon } from "./icons.jsx";

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
      ? <span key={i} style={{ background: T.amberSoft, color: T.amber, border: `1px solid ${T.amber}`, borderRadius: 4, padding: "0 4px", fontWeight: 500 }}>{p}</span>
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

  const canRun = !(loading || !intakeText.trim());
  return (
    <div style={{ minHeight: "100vh", background: T.paper, fontFamily: T.sans, color: T.ink }}>
      {/* Header */}
      <PageBar onBack={onBack} title="Intake CC/HPI" sub={<>Audit-safe chief complaint &amp; HPI for injection-day visits</>} />

      <div className="vra-wrap" style={wrap({ paddingTop: 4, paddingBottom: 56 })}>

        {/* Input */}
        <h2 style={secHead({ marginTop: 22, marginBottom: 4 })}>
          Intake notes
        </h2>
        <p style={{ fontSize: 13, color: T.ink2, lineHeight: 1.55, margin: "0 0 12px" }}>
          What you have: age and gender, the condition and which eye, what the patient tells you, and the other eye.
          Describe the <em>problem</em>, never the appointment.
        </p>
        <div className="vra-editor" style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.rLg, overflow: "hidden" }}>
          <textarea
            value={intakeText}
            onChange={e => setIntakeText(e.target.value)}
            placeholder="87 yo M wet AMD OD, mild distortion OD, no complaints OS; dry AMD OS"
            rows={7}
            style={{ display: "block", width: "100%", minHeight: 170, border: 0, background: "transparent", padding: "16px 18px", color: T.ink, fontFamily: T.mono, fontSize: 14, lineHeight: 1.65, resize: "vertical", boxSizing: "border-box", outline: "none" }}
          />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", padding: "10px 12px", borderTop: `1px solid ${T.line}`, background: T.paper }}>
            <button
              onClick={() => run(true)}
              disabled={loading || !intakeText.trim()}
              title="Paste an HPI you already wrote in NextGen — this checks the wording without rewriting it."
              style={btnSm("secondary", {
                color: loading || !intakeText.trim() ? T.muted : T.ink,
                cursor: loading || !intakeText.trim() ? "not-allowed" : "pointer",
              })}
            >
              Check wording only
            </button>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              {intakeText.trim() && !loading && (
                <button
                  onClick={() => { setIntakeText(""); setHpi(null); setFlags([]); setRan(false); setError(""); }}
                  style={btnSm("secondary", { color: T.ink2 })}
                >✕ Clear</button>
              )}
              <button
                onClick={() => run(false)}
                disabled={loading || !intakeText.trim()}
                style={btn("primary", {
                  background: canRun ? T.accent : T.accentSoft,
                  borderColor: canRun ? T.accent : T.line,
                  color: canRun ? T.onAccent : T.muted,
                  fontSize: 13.5, cursor: loading || !intakeText.trim() ? "not-allowed" : "pointer",
                })}
              >
                {loading ? "Working..." : "Generate CC/HPI →"}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", color: T.red, fontSize: 13, background: T.redSoft, padding: "10px 14px", borderRadius: T.r, border: "1px solid #F0C4BF", marginTop: 12, wordBreak: "break-word" }}>
            <span style={{ marginTop: 1 }}><AlertIcon /></span>{error}
          </div>
        )}

        {/* Result */}
        {hpi && (
          <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.rLg, marginTop: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px 10px 16px", borderBottom: `1px solid ${T.line}`, flexWrap: "wrap" }}>
              <div style={{ fontSize: 14, color: T.accent, fontWeight: 600 }}>
                CC / HPI (audit-safe)
              </div>
              <button
                onClick={copyHpi}
                style={btnSm("primary", { marginLeft: "auto", transition: "all .2s", ...(copied ? { background: T.green, borderColor: T.green } : {}) })}
              >
                <CopyIcon size={14} />{copied ? "Copied!" : "Copy CC/HPI"}
              </button>
            </div>
            <div style={{ fontFamily: T.mono, fontSize: 13.5, lineHeight: 1.75, color: T.ink, whiteSpace: "pre-wrap", padding: "16px 18px" }}>
              {renderWithPlaceholders(hpi)}
            </div>
            <div style={{ padding: "10px 16px", borderTop: `1px solid ${T.line}`, background: T.paper, borderRadius: `0 0 ${T.rLg}px ${T.rLg}px`, fontSize: 12.5, lineHeight: 1.5 }}>
              {/\[DOCUMENT:/.test(hpi) && (
                <div style={{ color: T.amber, marginBottom: 4 }}>
                  Fill in every amber <span style={{ fontFamily: T.mono }}>[DOCUMENT: …]</span> before pasting — ask the patient, or leave it for the doctor.
                </div>
              )}
              <div style={{ color: T.muted }}>
                Paste this into the CC/HPI fields in NextGen.
              </div>
            </div>
          </div>
        )}

        {/* Flags */}
        {flags.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 13.5, color: T.ink, fontWeight: 600, marginBottom: 8 }}>
              Wording to fix{blockCount > 0 ? ` — ${blockCount} must be removed` : ""}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {flags.map((f, i) => {
                const isBlock = f.severity === "block";
                return (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: isBlock ? T.redSoft : T.amberSoft, border: `1px solid ${isBlock ? "#F0C4BF" : T.goldSoft}`, borderRadius: T.r, padding: "10px 14px", color: isBlock ? T.red : T.amber }}>
                    <span style={{ marginTop: 2 }}><AlertIcon /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={chip(isBlock ? "red" : "amber", { flexShrink: 0, fontSize: 10.5 })}>
                        {isBlock ? "REMOVE" : "REVIEW"}
                      </span>
                      <span style={{ fontFamily: T.mono, fontSize: 13, color: T.ink, fontWeight: 500 }}>
                        &ldquo;{f.phrase}&rdquo;
                      </span>
                    </div>
                    {f.why && <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.5 }}>{f.why}</div>}
                    {f.suggest && (
                      <div style={{ fontSize: 13, color: isBlock ? T.red : T.amber, lineHeight: 1.5, marginTop: 4 }}>
                        Write instead: {f.suggest}
                      </div>
                    )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Clean result for a check-only run */}
        {ran && checkedOnly && flags.length === 0 && !error && (
          <div style={{ background: T.greenSoft, border: `1px solid ${T.green}`, borderRadius: T.r, padding: "10px 14px", marginTop: 14, fontSize: 13, color: T.green }}>
            ✓ Nothing flagged — this wording is audit-safe.
          </div>
        )}

        {/* ── Do / Don't cheat sheet (collapsed by default) ─────────── */}
        <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.rLg, marginTop: 24, overflow: "hidden" }}>
          <button
            onClick={() => setShowSheet(v => !v)}
            aria-expanded={showSheet}
            style={{ width: "100%", background: "none", border: "none", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: T.ink, fontFamily: T.sans, fontSize: 14, fontWeight: 600, textAlign: "left" }}
          >
            <span style={{ color: T.muted, display: "flex", flexShrink: 0 }}>{showSheet ? <ChevronDownIcon size={15} /> : <ChevronRightIcon size={15} />}</span>
            Do / Don&rsquo;t cheat sheet
            <span style={{ marginLeft: "auto", fontSize: 12.5, color: T.muted, fontFamily: T.sans, fontWeight: 400 }}>
              {showSheet ? "hide" : "show"}
            </span>
          </button>

          {showSheet && (
            <div style={{ borderTop: `1px solid ${T.line}`, padding: "12px 14px 14px", background: T.paper }}>
              <div className="vra-row2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {/* DON'T */}
                <div style={field()}>
                  <div style={{ fontSize: 13.5, color: T.red, fontWeight: 600, marginBottom: 8 }}>
                    Don&rsquo;t write
                  </div>
                  <div>
                    {DONT_LIST.map((d, i) => (
                      <div key={i} style={{ fontSize: 13, color: T.ink2, lineHeight: 1.55, paddingLeft: 18, position: "relative", padding: "5px 0 5px 18px", borderTop: i === 0 ? "none" : `1px solid ${T.line}` }}>
                        <span style={{ position: "absolute", left: 0, color: T.red, fontWeight: 600 }}>✕</span>
                        {d}
                      </div>
                    ))}
                  </div>
                </div>

                {/* DO */}
                <div style={field()}>
                  <div style={{ fontSize: 13.5, color: T.green, fontWeight: 600, marginBottom: 8 }}>
                    Do write
                  </div>
                  <div>
                    {DO_LIST.map((d, i) => (
                      <div key={i} style={{ fontSize: 13, color: T.ink2, lineHeight: 1.55, position: "relative", padding: "5px 0 5px 18px", borderTop: i === 0 ? "none" : `1px solid ${T.line}` }}>
                        <span style={{ position: "absolute", left: 0, color: T.green, fontWeight: 600 }}>✓</span>
                        {d}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* The rule */}
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: T.amberSoft, border: `1px solid ${T.goldSoft}`, borderRadius: T.r, padding: "10px 14px", fontSize: 13, color: T.amber, lineHeight: 1.55, fontWeight: 600, marginTop: 12 }}>
                <span style={{ marginTop: 1 }}><AlertIcon /></span>
                <span>Never write a symptom the patient did not report. If you don&rsquo;t know, leave it for the doctor.</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

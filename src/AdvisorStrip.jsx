// Clinical advisor strip (Oct 29 2026, Mari — approved mockup ird-strip-mockup.html).
// Collapsible strip under the note, above the coverage card. Closed by default:
// one line. Open: the card(s) below it. Nothing here is copied with the note; only
// a line the doctor clicks "+ Add" on goes into the Plan (parent's onAdd).
// Content and rules: src/lib/advisor.js (IRD) and src/lib/trialCard.js (VRA trials, Nov 6 2026).
import { useState } from "react";
import { T, btnSm, chip } from "./theme.js";
import { IRD_PROGRAMS, IRD_COMPARE, IRD_LINKS } from "./lib/advisor.js";

const LANGS = [{ id: "en", label: "English" }, { id: "es", label: "Español" }, { id: "vi", label: "Tiếng Việt" }, { id: "pt", label: "Português" }];

function Line({ line, done, onAdd }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "7px 0", borderTop: `1px dashed ${T.line}` }}>
      <div style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.5, color: T.ink2 }}>
        {line.tag && <span style={chip(line.tag === "If legally blind" ? "amber" : "muted", { fontSize: 10.5, marginRight: 6, verticalAlign: 1 })}>{line.tag}</span>}
        {line.text}
        {line.hint && <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>{line.hint}</div>}
      </div>
      <button
        onClick={() => !done && onAdd(line)}
        disabled={done}
        aria-label={done ? "Added to the Plan" : "Add this line to the Plan"}
        style={btnSm("secondary", { flexShrink: 0, ...(done ? { background: T.greenSoft, borderColor: T.greenLine, color: T.green, cursor: "default" } : {}) })}>
        {done ? "✓ Added" : "+ Add"}
      </button>
    </div>
  );
}

function Section({ sec, added, onAdd, onPrint }) {
  const [open, setOpen] = useState(!!sec.open);
  const [compare, setCompare] = useState(false);
  const [lang, setLang] = useState("en");
  const [printing, setPrinting] = useState(false);
  const [printErr, setPrintErr] = useState(false);
  return (
    <div style={{ borderTop: `1px solid ${T.line}`, padding: "10px 14px" }}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: 0, padding: 0, cursor: "pointer", textAlign: "left", fontFamily: T.sans }}>
        <span style={{ color: T.muted, fontSize: 12, width: 10 }}>{open ? "▾" : "▸"}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{sec.title}</span>
        {!open && <span style={{ fontSize: 12, color: T.muted }}>{sec.lines.length} line{sec.lines.length === 1 ? "" : "s"}</span>}
      </button>
      {open && (
        <div style={{ marginTop: 8 }}>
          {sec.programs && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8, marginBottom: 8 }}>
                {IRD_PROGRAMS.map((p) => (
                  <div key={p.name} style={{ border: `1px solid ${T.line}`, borderRadius: T.r, padding: "8px 10px", background: T.surface }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{p.name}</div>
                    <div style={{ fontSize: 12.5, color: T.ink2, marginTop: 2 }}>{p.cost}</div>
                    <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>{p.detail}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12.5, color: T.ink2, marginBottom: 6 }}>Both are good options. The patient chooses.</div>
              <button onClick={() => setCompare((c) => !c)} style={{ background: "none", border: 0, padding: 0, color: T.accent, fontSize: 12.5, cursor: "pointer", fontFamily: T.sans }}>
                {compare ? "▾" : "▸"} Compare the two programs
              </button>
              {compare && (
                <div style={{ overflowX: "auto", marginTop: 6 }}>
                  <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%", tableLayout: "fixed" }}>
                    <colgroup><col style={{ width: "22%" }} /><col /><col /></colgroup>
                    <thead>
                      <tr>{["", "FFB / PreventionGenetics", "Invitae"].map((h, i) => (
                        <th key={i} style={{ textAlign: "left", padding: "5px 8px", background: T.accent, color: T.onAccent, fontWeight: 600 }}>{h}</th>))}</tr>
                    </thead>
                    <tbody>
                      {IRD_COMPARE.map((r, i) => (
                        <tr key={i} style={{ background: i % 2 ? T.paper : T.surface }}>
                          <td style={{ padding: "5px 8px", fontWeight: 600, color: T.ink, verticalAlign: "top" }}>{r[0]}</td>
                          <td style={{ padding: "5px 8px", color: T.ink2, verticalAlign: "top" }}>{r[1]}</td>
                          <td style={{ padding: "5px 8px", color: T.ink2, verticalAlign: "top" }}>{r[2]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", margin: "8px 0" }}>
                {IRD_LINKS.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: T.accent }}>{l.label} ↗</a>
                ))}
              </div>
              {onPrint && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                  <button disabled={printing} onClick={async () => { setPrinting(true); setPrintErr(false); try { await onPrint(lang); } catch { setPrintErr(true); } finally { setPrinting(false); } }} style={btnSm("secondary")}>
                    {printing ? "Preparing…" : "Print pamphlet"}
                  </button>
                  <select value={lang} onChange={(e) => setLang(e.target.value)} style={{ fontSize: 12.5, padding: "4px 6px", border: `1px solid ${T.line}`, borderRadius: 6, background: T.surface, color: T.ink, fontFamily: T.sans }}>
                    {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                  </select>
                  <span style={{ fontSize: 11.5, color: T.muted }}>One page · "Genetic Testing for Inherited Retinal Disease"</span>
                  {printErr && <span style={{ fontSize: 12, color: T.red }}>Could not create the PDF. Try again, or print it from Patient Education below.</span>}
                </div>
              )}
            </>
          )}
          {sec.lines.map((l) => <Line key={l.id} line={l} done={added.has(l.id)} onAdd={onAdd} />)}
          {sec.source && <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>Sources: {sec.source}</div>}
        </div>
      )}
    </div>
  );
}

// ── VRA trial cards (Nov 6 2026, D15 — src/lib/trialCard.js) ─────────────────
// Quick check = what the note already says. Never "eligible": the coordinator decides.
const MARK = {
  met: { sym: "✓", color: T.green, title: "Met (from the note)" },
  not_met: { sym: "✗", color: T.red, title: "Not met (from the note)" },
  check: { sym: "?", color: T.amber, title: "Check — the note is unclear" },
  none: { sym: "—", color: T.muted, title: "Not in the note" },
};
function Mark({ c }) {
  const m = MARK[c.state] || MARK.none;
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "baseline", minWidth: 0 }} title={m.title}>
      <span aria-label={m.title} style={{ color: m.color, fontWeight: 700, fontSize: 13, width: 12, flexShrink: 0, textAlign: "center" }}>{m.sym}</span>
      {c.detail && <span style={{ fontSize: 11.5, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{c.detail}</span>}
    </div>
  );
}

function TrialChecks({ card: c }) {
  const eyes = c.eyes;
  const cols = `minmax(150px, 1.3fr) ${eyes.map(() => "minmax(110px, 1fr)").join(" ")}`;
  return (
    <div style={{ borderTop: `1px solid ${T.line}`, padding: "10px 14px" }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>Quick check from this note</div>
      <div style={{ fontSize: 11.5, color: T.muted, margin: "2px 0 8px" }}>Approximate — vision is Snellen, not ETDRS. The coordinator decides.</div>
      <div style={{ overflowX: "auto" }}>
        <div role="table" style={{ display: "grid", gridTemplateColumns: cols, minWidth: 150 + 110 * eyes.length, fontSize: 12.5 }}>
          <div role="row" style={{ display: "contents" }}>
            <div style={{ padding: "4px 6px", color: T.muted, fontSize: 11.5 }} />
            {eyes.map((e) => <div key={e} style={{ padding: "4px 6px", color: T.muted, fontSize: 11.5, fontWeight: 600 }}>{e === "?" ? "Eye not stated" : e}</div>)}
          </div>
          {c.checks.map((k, i) => (
            <div role="row" key={k.id} style={{ display: "contents" }}>
              <div style={{ padding: "5px 6px", color: T.ink2, lineHeight: 1.4, borderTop: `1px dashed ${T.line}`, background: i % 2 ? T.paper : "transparent" }}>{k.label}</div>
              {k.cells.all
                ? <div style={{ gridColumn: `span ${eyes.length}`, padding: "5px 6px", borderTop: `1px dashed ${T.line}`, background: i % 2 ? T.paper : "transparent", minWidth: 0 }}><Mark c={k.cells.all} /></div>
                : eyes.map((e) => <div key={e} style={{ padding: "5px 6px", borderTop: `1px dashed ${T.line}`, background: i % 2 ? T.paper : "transparent", minWidth: 0 }}><Mark c={k.cells[e] || { state: "none" }} /></div>)}
            </div>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: T.muted, marginTop: 6 }}>✓ met · ✗ not met · ? check · — not in the note</div>
      {c.coordinator.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: T.ink }}>The coordinator checks</div>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12.5, color: T.ink2, lineHeight: 1.5 }}>
            {c.coordinator.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </div>
      )}
      <div style={{ marginTop: 10, padding: "6px 10px", background: T.amberSoft, borderLeft: `3px solid ${T.gold}`, borderRadius: T.r, fontSize: 12.5, color: T.goldInk }}>
        Flag to: <b style={{ fontWeight: 600, color: T.ink }}>{c.flagTo}</b>
        <span style={{ color: T.muted }}> · Full criteria on the Clinical Trials page{c.nct ? ` · ${c.nct}` : ""}</span>
      </div>
    </div>
  );
}

function StudyReminder({ card: c }) {
  return (
    <div style={{ borderTop: `1px solid ${T.line}`, padding: "10px 14px" }}>
      {c.items.map((it) => (
        <div key={it.slug} style={{ padding: "8px 12px", marginBottom: 6, background: T.amberSoft, border: `1px solid ${T.amberLine}`, borderRadius: T.r, fontSize: 13, lineHeight: 1.45, color: T.ink }}>
          {it.text}
        </div>
      ))}
    </div>
  );
}

function badgeFor(c) {
  if (c.kind === "trial") return <span style={chip("green", { fontSize: 10.5 })}>Enrolling · from Diana's checklist</span>;
  if (c.kind === "trial-reminder") return <span style={chip("amber", { fontSize: 10.5 })}>VRA study patient</span>;
  return <span style={chip("green", { fontSize: 10.5 })}>Reviewed by MR</span>;
}

export default function AdvisorStrip({ cards, added, onAdd, onPrintPamphlet }) {
  const [open, setOpen] = useState(false);
  if (!cards || !cards.length) return null;
  const summary = cards.map((c) => `${c.title} — ${c.summary}`).join(" · ");
  return (
    <div style={{ marginTop: 12, border: `1px solid ${T.line}`, borderRadius: T.rLg, background: T.surface }}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: open ? T.accentSoft : T.surface, border: 0, borderRadius: open ? `${T.rLg}px ${T.rLg}px 0 0` : T.rLg, padding: "10px 14px", cursor: "pointer", textAlign: "left", fontFamily: T.sans, flexWrap: "wrap" }}>
        <span style={{ color: T.accent, fontSize: 12, width: 10 }}>{open ? "▾" : "▸"}</span>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: T.accent }}>Advisor</span>
        <span style={{ fontSize: 12.5, color: T.ink2, flex: 1, minWidth: 160 }}>{summary}</span>
        <span style={chip("muted", { fontSize: 10.5 })}>Not copied with the note</span>
      </button>
      {open && cards.map((c) => (
        <div key={c.id}>
          <div style={{ padding: "10px 14px", borderTop: `1px solid ${T.line}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{c.title}</span>
              {badgeFor(c)}
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{c.why}</div>
          </div>
          {c.kind === "trial" && <TrialChecks card={c} />}
          {c.kind === "trial-reminder" && <StudyReminder card={c} />}
          {c.sections.map((s) => <Section key={s.id} sec={s} added={added} onAdd={onAdd} onPrint={s.programs ? onPrintPamphlet : null} />)}
        </div>
      ))}
    </div>
  );
}

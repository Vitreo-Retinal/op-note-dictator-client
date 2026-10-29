// Clinical advisor strip (Oct 29 2026, Mari — approved mockup ird-strip-mockup.html).
// Collapsible strip under the note, above the coverage card. Closed by default:
// one line. Open: the card(s) below it. Nothing here is copied with the note; only
// a line the doctor clicks "+ Add" on goes into the Plan (parent's onAdd).
// Content and rules: src/lib/advisor.js.
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
              <span style={chip("green", { fontSize: 10.5 })}>Reviewed by MR</span>
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{c.why}</div>
          </div>
          {c.sections.map((s) => <Section key={s.id} sec={s} added={added} onAdd={onAdd} onPrint={s.programs ? onPrintPamphlet : null} />)}
        </div>
      ))}
    </div>
  );
}

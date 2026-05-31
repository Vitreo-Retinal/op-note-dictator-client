import { useState, useMemo, useRef } from "react";
import { HUB_DATA } from "./hubData.js";

// ── Manager's Hub: payer rate comparison (VRA vs Lexington vs Medicare) ──
// Reachable from the Manager's Hub and the Doctor's Hub. Reimbursement-bearing,
// so never exposed on the tech/home portal.

const S = {
  bg: "#0f172a", card: "#1e293b", border: "#334155", muted: "#64748b",
  text: "#e2e8f0", bright: "#f1f5f9", accent: "#6366f1", accentLight: "#a5b4fc",
  green: "#4ade80", amber: "#f59e0b", red: "#f87171", blue: "#60a5fa", gray: "#94a3b8",
  font: "Georgia, serif", mono: "monospace",
};

const PAYERS = {
  BCBS: "Blue Cross Blue Shield MA",
  HPHC: "Harvard Pilgrim",
  TuftsDirect: "Tufts Health Direct",
};

const money = (v) => "$" + Math.round(v).toLocaleString();

function Combo({ label, value, placeholder, items, onPick }) {
  // items: [{ val, label }]
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? items.filter((it) => it.label.toLowerCase().includes(q)) : items;
    return list.slice(0, 60);
  }, [query, items]);

  return (
    <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
      <label style={{ display: "block", fontSize: "0.72rem", color: S.muted, marginBottom: 4, fontFamily: S.mono, textTransform: "uppercase", letterSpacing: 1 }}>{label}</label>
      <input
        ref={inputRef}
        type="text"
        value={open ? query : value}
        placeholder={placeholder}
        onFocus={(e) => { setOpen(true); setQuery(""); e.target.select(); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        style={{ width: "100%", background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, padding: "11px 13px", color: S.text, fontFamily: S.font, fontSize: "0.9rem", boxSizing: "border-box" }}
      />
      {open && (
        <div style={{ position: "absolute", zIndex: 30, left: 0, right: 0, top: "100%", marginTop: 3, background: S.card, border: `1px solid ${S.accent}`, borderRadius: 8, maxHeight: 260, overflowY: "auto" }}>
          {shown.length === 0 && <div style={{ padding: "10px 12px", fontSize: "0.78rem", color: S.muted }}>No matches</div>}
          {shown.map((it) => (
            <div key={it.val}
              onMouseDown={(e) => { e.preventDefault(); onPick(it.val); setQuery(""); setOpen(false); if (inputRef.current) inputRef.current.blur(); }}
              style={{ padding: "9px 12px", fontSize: "0.85rem", color: S.text, cursor: "pointer", borderBottom: `1px solid ${S.border}` }}
              onMouseEnter={(e) => (e.currentTarget.style.background = S.bg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              {it.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Bar({ label, val, max, color, sub }) {
  const w = max > 0 ? Math.max(2, (val / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: 3 }}>
        <span style={{ color: S.gray }}>{label}{sub && <span style={{ color: S.muted }}> {sub}</span>}</span>
        <span style={{ fontWeight: 700, color: S.bright }}>{money(val)}</span>
      </div>
      <div style={{ height: 14, background: S.card, borderRadius: 7, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${w}%`, background: color, borderRadius: 7 }} />
      </div>
    </div>
  );
}

function Card({ label, value, color }) {
  return (
    <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: "0.72rem", color: S.muted, marginBottom: 5, fontFamily: S.mono }}>{label}</div>
      <div style={{ fontSize: "1.4rem", fontWeight: 700, color: color || S.bright }}>{value}</div>
    </div>
  );
}

export default function RateComparison({ onBack, embedded = false }) {
  const [payer, setPayer] = useState("BCBS");
  const [code, setCode] = useState("67028");

  const payerItems = Object.keys(PAYERS).map((k) => ({ val: k, label: PAYERS[k] }));
  const codeItems = useMemo(
    () => HUB_DATA.filter((d) => d.payers[payer]).map((d) => ({ val: d.code, label: d.desc ? `${d.code} — ${d.desc}` : d.code })),
    [payer]
  );

  function pickPayer(k) {
    setPayer(k);
    const d = HUB_DATA.find((x) => x.code === code && x.payers[k]);
    if (!d) { const f = HUB_DATA.find((x) => x.payers[k]); setCode(f ? f.code : ""); }
  }

  const d = HUB_DATA.find((x) => x.code === code);
  const p = d && d.payers[payer];
  const isDrug = d && d.type === "drug";
  const upd = isDrug && d.units_per_dose ? d.units_per_dose : 1;
  const doseNote = upd > 1 ? "/dose" : isDrug ? "/unit" : "";
  const vra = p && p.vra != null ? p.vra * upd : null;
  const lex = p && p.lex != null ? p.lex * upd : null;
  const med = d && d.medicare != null ? d.medicare * upd : null;
  const max = Math.max(vra || 0, lex || 0, med || 0);

  let verdict = null;
  if (vra != null) {
    if (lex == null) {
      verdict = { c: S.blue, t: `Lexington isn't contracted in this plan's network — no peer comparison.${med ? ` You're at ${(vra / med).toFixed(2)}× Medicare.` : ""}` };
    } else {
      const g = (vra / lex - 1) * 100;
      if (g >= -1.5) {
        verdict = { c: S.green, t: g > 1.5 ? `You're contracted ${g.toFixed(0)}% above Lexington — strong position.` : "On par with Lexington — same top-tier rate." };
      } else {
        const gap = -g;
        if (isDrug) verdict = { c: S.amber, t: `Lexington is ${gap.toFixed(0)}% higher on this drug. Drugs aren't geographically adjusted, so this is a real contract gap.` };
        else if (gap <= 11) verdict = { c: S.amber, t: `Lexington is ${gap.toFixed(0)}% higher — within the ~9% Boston-vs-Worcester premium, so largely geographic.` };
        else verdict = { c: S.red, t: `Lexington is ${gap.toFixed(0)}% higher — beyond the ~9% geography premium; ~${(gap - 9).toFixed(0)}% looks like a real contract gap.` };
      }
    }
  }

  return (
    <div style={embedded ? { fontFamily: S.font, color: S.text } : { minHeight: "100vh", background: S.bg, fontFamily: S.font, color: S.text }}>
      {!embedded && (
        <div style={{ padding: "10px 20px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "none", border: `1px solid ${S.border}`, borderRadius: 8, padding: "6px 14px", color: S.muted, fontFamily: S.font, fontSize: "0.78rem", cursor: "pointer" }}>&larr; Back</button>
          <span style={{ fontSize: "1rem", fontWeight: 700, color: S.bright }}>📊 Rate Comparison</span>
          <span style={{ fontSize: "0.72rem", color: S.muted, fontFamily: S.mono }}>VRA vs Lexington vs Medicare</span>
        </div>
      )}

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px 48px" }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
          <Combo label="Payer" value={PAYERS[payer]} placeholder="Search payer…" items={payerItems} onPick={pickPayer} />
          <div style={{ flex: 2, minWidth: 240 }}>
            <Combo label="Procedure or drug" value={d ? (d.desc ? `${d.code} — ${d.desc}` : d.code) : ""} placeholder="Search code or name…" items={codeItems} onPick={setCode} />
          </div>
        </div>

        {!p ? (
          <div style={{ color: S.muted, fontSize: "0.85rem" }}>Pick a payer and code to compare.</div>
        ) : (
          <>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: S.bright }}>{d.code}{isDrug ? " · drug" : ""}</div>
            <div style={{ fontSize: "0.8rem", color: S.gray, marginBottom: 18 }}>{d.desc}</div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 22 }}>
              <Card label="Your rate (VRA)" value={<>{money(vra)}<span style={{ fontSize: "0.75rem", color: S.muted }}>{doseNote}</span></>} color={S.blue} />
              {med != null && <Card label="vs Medicare" value={`${(vra / med).toFixed(2)}×`} />}
              {lex != null ? <Card label="vs Lexington" value={`${vra / lex - 1 >= 0 ? "+" : ""}${((vra / lex - 1) * 100).toFixed(0)}%`} color={vra / lex - 1 < -0.015 ? S.amber : S.green} /> : <Card label="vs Lexington" value="n/a" />}
            </div>

            <Bar label="You (VRA)" val={vra} max={max} color={S.blue} />
            {lex != null && <Bar label="Lexington" val={lex} max={max} color={S.gray} />}
            {med != null && <Bar label="Medicare" val={med} max={max} color={S.amber} />}

            {verdict && (
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: S.card, border: `1px solid ${verdict.c}`, borderRadius: 10, padding: "12px 14px", marginTop: 16 }}>
                <span style={{ color: verdict.c, fontSize: "1.1rem" }}>●</span>
                <span style={{ fontSize: "0.85rem", color: S.text, lineHeight: 1.5 }}>{verdict.t}</span>
              </div>
            )}
          </>
        )}

        <p style={{ fontSize: "0.7rem", color: S.muted, marginTop: 28, lineHeight: 1.6, fontFamily: S.mono }}>
          In-office (POS 11) commercial rates from published MRFs · Medicare = 2026 MPFS / ASP · drugs per standard dose · Lexington = Boston Medicare locality (~9% higher cost basis than Worcester).
        </p>
      </div>
    </div>
  );
}

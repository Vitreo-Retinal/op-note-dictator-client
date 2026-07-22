import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabaseClient.js";

// ── Manager's Hub: rate comparison (VRA vs the MA peer field) ───────────────
// Reads the locked Supabase hub_* functions. Only the signed-in
// mrodriguez@retina-docs.com session can read any rate data.

const S = {
  bg: "#0f172a", card: "#1e293b", border: "#334155", muted: "#64748b",
  text: "#e2e8f0", bright: "#f1f5f9", accent: "#6366f1", accentLight: "#a5b4fc",
  green: "#4ade80", amber: "#f59e0b", red: "#f87171", blue: "#60a5fa", gray: "#94a3b8",
  font: "Georgia, serif", mono: "monospace",
};

const money = (v) => (v == null ? "—" : "$" + Math.round(v).toLocaleString());
const pct = (v) => (v == null ? "—" : Math.round(v) + "%");

function Combo({ label, value, placeholder, items, onPick }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qc = q.replace(/\s+/g, "");
    const list = q ? items.filter((it) => {
      const hay = (it.search || it.label).toLowerCase();
      return hay.includes(q) || (qc.length >= 2 && hay.replace(/\s+/g, "").includes(qc));
    }) : items;
    return list.slice(0, 80);
  }, [query, items]);
  return (
    <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
      <label style={{ display: "block", fontSize: "0.72rem", color: S.muted, marginBottom: 4, fontFamily: S.mono, textTransform: "uppercase", letterSpacing: 1 }}>{label}</label>
      <input ref={inputRef} type="text" value={open ? query : value} placeholder={placeholder}
        onFocus={(e) => { setOpen(true); setQuery(""); e.target.select(); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        style={{ width: "100%", background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, padding: "11px 13px", color: S.text, fontFamily: S.font, fontSize: "0.9rem", boxSizing: "border-box" }} />
      {open && (
        <div style={{ position: "absolute", zIndex: 30, left: 0, right: 0, top: "100%", marginTop: 3, background: S.card, border: `1px solid ${S.accent}`, borderRadius: 8, maxHeight: 280, overflowY: "auto" }}>
          {shown.length === 0 && <div style={{ padding: "10px 12px", fontSize: "0.78rem", color: S.muted }}>No matches</div>}
          {shown.map((it) => (
            <div key={it.val} onMouseDown={(e) => { e.preventDefault(); onPick(it.val); setQuery(""); setOpen(false); if (inputRef.current) inputRef.current.blur(); }}
              style={{ padding: "9px 12px", fontSize: "0.85rem", color: S.text, cursor: "pointer", borderBottom: `1px solid ${S.border}` }}
              onMouseEnter={(e) => (e.currentTarget.style.background = S.bg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>{it.label}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function Bar({ label, val, max, color, sub }) {
  const w = max > 0 && val != null ? Math.max(2, (val / max) * 100) : 0;
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

function Card({ label, value, color, sub }) {
  return (
    <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: "0.72rem", color: S.muted, marginBottom: 5, fontFamily: S.mono }}>{label}</div>
      <div style={{ fontSize: "1.4rem", fontWeight: 700, color: color || S.bright }}>{value}</div>
      {sub && <div style={{ fontSize: "0.72rem", color: S.muted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

export default function RateComparison({ onBack, embedded = false }) {
  const [codes, setCodes] = useState([]);
  const [nets, setNets] = useState([]);
  const [aliasMap, setAliasMap] = useState({}); // hub_payer -> [alias match strings], sourced from insurance_plans
  const [net, setNet] = useState(null); // { payer, network, lob }
  const [code, setCode] = useState("67028");
  const [data, setData] = useState(null);
  const [rvu, setRvu] = useState(null); // hub_rvu(code): work/PE/MP/total RVUs + 2026 conversion factors
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState("field_rest_of_ma");
  const [geoAdj, setGeoAdj] = useState(true);
  const [drugEcon, setDrugEcon] = useState([]); // hub_drug_economics(): per-dose buy-and-bill margins

  useEffect(() => {
    supabase.rpc("hub_drug_economics").then(({ data }) => setDrugEcon(data || []));
    supabase.rpc("hub_codes").then(({ data }) => setCodes((data || []).filter((c) => c.has_market)));
    supabase.rpc("hub_networks").then(({ data }) => {
      const list = data || [];
      setNets(list);
      setNet((cur) => cur || list.find((n) => n.kind === "field") || list[0] || null);
    });
    // Insurance aliases (UHC / United Healthcare / Tufts Direct / MassHealth …) from the shared insurance_plans table
    supabase.rpc("hub_insurance_dict").then(({ data }) => {
      const m = {};
      (data || []).forEach((r) => { (m[r.hub_payer] = m[r.hub_payer] || []).push(r.match_str); });
      setAliasMap(m);
    });
  }, []);

  useEffect(() => {
    if (!code || !net) return;
    setLoading(true);
    supabase.rpc("hub_compare", { p_code: code, p_network: net.network, p_lob: net.lob, p_kind: net.kind }).then(({ data, error }) => {
      setData(error ? null : data); setLoading(false);
    });
  }, [code, net]);

  // RVU breakdown depends only on the code (Medicare component values are national)
  useEffect(() => {
    if (!code) { setRvu(null); return; }
    supabase.rpc("hub_rvu", { p_code: code }).then(({ data, error }) => setRvu(error ? null : data));
  }, [code]);

  // when the selected insurance has no peer field (regional/benchmark), drop field-only targets
  useEffect(() => {
    if (data && !(data.field && data.field.n) && target.startsWith("field_")) {
      const fp = (data.named_peers || []).find((p) => !p.is_self);
      setTarget(fp ? "peer:" + fp.id : "");
    }
  }, [data]);

  const codeItems = useMemo(
    () => codes.map((c) => ({ val: c.code, label: c.description ? `${c.code} — ${c.description}` : c.code, search: `${c.code} ${c.description || ""}` })),
    [codes]
  );
  const netItems = nets.map((n) => ({ val: `${n.kind}|${n.network}|${n.lob}`, label: n.label, search: `${n.label} ${n.payer} ${n.network} ${(aliasMap[n.payer] || []).join(" ")}` }));
  function pickNet(v) {
    const [kind, network, lob] = v.split("|");
    const f = nets.find((n) => n.kind === kind && n.network === network && n.lob === lob);
    if (f) setNet(f);
  }

  const isDrug = data && data.type === "drug";
  const upd = isDrug && data && data.units_per_dose ? Number(data.units_per_dose) : 1;
  const b = data ? data.benchmarks || {} : {};
  const factor = !isDrug && b.mworc && b.mbos ? b.mworc / b.mbos : 1; // metro-Boston → Worcester
  const adj = (rate, locality) => (rate == null ? null : (geoAdj && locality === "metro_boston" && !isDrug ? rate * factor : rate));

  const vra = data ? data.vra_rate : null;
  const peers = (data && data.named_peers) || [];
  const byLoc = (data && data.field_by_locality) || {};
  const fld = (data && data.field) || {};

  // comparison target options
  const hasField = !!(fld && fld.n);
  const targetItems = [
    ...(hasField ? [
      { val: "field_all", label: "Peer field — all Massachusetts" },
      { val: "field_rest_of_ma", label: "Peer field — Rest of MA (your locality)" },
      { val: "field_metro_boston", label: "Peer field — Metro Boston" },
    ] : []),
    ...peers.filter((p) => !p.is_self).map((p) => ({ val: "peer:" + p.id, label: p.name })),
  ];

  let targetVal = null, targetLabel = "", targetLoc = null, crossLoc = false;
  if (data) {
    if (target === "field_all") { targetVal = fld.med; targetLabel = "MA field median"; }
    else if (target === "field_rest_of_ma") { targetVal = byLoc.rest_of_ma && byLoc.rest_of_ma.median; targetLabel = "Rest-of-MA median"; targetLoc = "rest_of_ma"; }
    else if (target === "field_metro_boston") { targetVal = adj(byLoc.metro_boston && byLoc.metro_boston.median, "metro_boston"); targetLabel = "Metro-Boston median"; targetLoc = "metro_boston"; crossLoc = true; }
    else if (target.startsWith("peer:")) {
      const p = peers.find((x) => x.id === target.slice(5));
      if (p) { targetVal = adj(p.rate, p.locality); targetLabel = p.name; targetLoc = p.locality; crossLoc = p.locality === "metro_boston"; }
    }
  }

  // verdict vs target (materiality band ±3%; red if >10% below)
  let verdict = null;
  if (vra != null && targetVal != null && targetVal > 0) {
    const gap = vra / targetVal - 1;
    const adjNote = crossLoc && geoAdj && !isDrug ? " (geography-adjusted to Worcester)" : crossLoc && !isDrug ? " — raw; toggle geography for apples-to-apples" : "";
    if (gap >= -0.03) verdict = { c: S.green, t: `You're at or above ${targetLabel}${adjNote}: ${money(vra)} vs ${money(targetVal)} (${gap >= 0 ? "+" : ""}${Math.round(gap * 100)}%).` };
    else if (gap >= -0.10) verdict = { c: S.amber, t: `Slightly below ${targetLabel}${adjNote}: ${money(vra)} vs ${money(targetVal)} (${Math.round(gap * 100)}%, ${money(targetVal - vra)} per service).` };
    else verdict = { c: S.red, t: `Materially below ${targetLabel}${adjNote}: ${money(vra)} vs ${money(targetVal)} — ${Math.round(-gap * 100)}% under, ${money(targetVal - vra)} per service. Negotiation target.` };
  }

  const medLocal = b.mworc != null ? b.mworc : b.med_nat;
  const vraPctOfMed = vra != null && medLocal ? vra / medLocal : null;
  const maxBar = Math.max(vra || 0, targetVal || 0, medLocal || 0);

  // drug margin
  let margin = null;
  if (isDrug && data.drug_cost && data.drug_cost.acq_cost != null && vra != null) {
    const dc = data.drug_cost;
    const acqPerUnit = dc.cost_basis === "per_billed_unit" ? Number(dc.acq_cost)
      : dc.billed_units_per_vial ? Number(dc.acq_cost) / Number(dc.billed_units_per_vial) : null;
    if (acqPerUnit != null) margin = { perUnit: vra - acqPerUnit, acqPerUnit, perDose: (vra - acqPerUnit) * upd };
  }

  const codeLabel = data ? (data.description ? `${data.code} — ${data.description}` : data.code) : code;

  return (
    <Shell embedded={embedded} onBack={onBack}>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
        <Combo label="Insurance" value={net ? net.label : ""} placeholder="Pick a plan…" items={netItems} onPick={pickNet} />
        <Combo label="Procedure or drug" value={codeLabel} placeholder="Search code or name…" items={codeItems} onPick={setCode} />
        {data && data.kind !== "bench" && (
          <Combo label="Compare against" value={(targetItems.find((t) => t.val === target) || {}).label || ""} placeholder="Pick a peer or group…" items={targetItems.map((t) => ({ ...t, search: t.label }))} onPick={setTarget} />
        )}
      </div>

      <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "0.78rem", color: S.gray, marginBottom: 20, cursor: "pointer" }}>
        <input type="checkbox" checked={geoAdj} onChange={(e) => setGeoAdj(e.target.checked)} />
        Normalize Boston rates to Worcester (remove geography)
      </label>

      {loading || !data ? (
        <div style={{ color: S.muted, padding: 20 }}>{loading ? "Loading…" : "Pick a code."}</div>
      ) : (
        <>
          <div style={{ fontSize: "0.95rem", fontWeight: 700, color: S.bright }}>{data.code}{isDrug ? " · drug" : ""}</div>
          <div style={{ fontSize: "0.8rem", color: S.gray, marginBottom: 18 }}>{data.description} · {net ? net.label : ""}</div>

          {data.note && (
            <div style={{ background: S.card, border: "1px solid #8a6d3b", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: "0.78rem", color: S.gray, lineHeight: 1.5 }}>
              ⓘ {data.note}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
            <Card label={data.kind === "bench" ? "Rate · all providers" : "Your rate (VRA)"} value={money(vra)} color={S.blue} sub={data.vra_pctile != null ? `${ordinal(data.vra_pctile)} percentile of ${fld.n} MA providers` : null} />
            {data.kind !== "bench" && <Card label={targetLabel || "Comparison"} value={money(targetVal)} />}
            {vraPctOfMed != null && data.kind !== "bench" && <Card label="vs local Medicare" value={`${vraPctOfMed.toFixed(2)}×`} sub={`Worcester · Medicare ${money(medLocal)}`} />}
          </div>

          {verdict && (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: S.card, border: `1px solid ${verdict.c}`, borderRadius: 10, padding: "12px 14px", marginBottom: 18 }}>
              <span style={{ color: verdict.c, fontSize: "1.1rem" }}>●</span>
              <span style={{ fontSize: "0.85rem", color: S.text, lineHeight: 1.5 }}>{verdict.t}</span>
            </div>
          )}

          {data.kind === "bench" && (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 18 }}>
              <span style={{ color: S.gray, fontSize: "1.1rem" }}>◆</span>
              <span style={{ fontSize: "0.85rem", color: S.gray, lineHeight: 1.5 }}>{net && net.payer === "MassHealth" ? "MassHealth (Medicaid) — state-set rate, identical for every provider. No negotiation, no peer gap; your reimbursement floor." : "Medicare fee schedule, Worcester locality — federally set, identical for every provider. The benchmark everything else is measured against."}</span>
            </div>
          )}

          <Bar label={data.kind === "bench" ? "Rate" : "You (VRA)"} val={vra} max={maxBar} color={S.blue} />
          {targetVal != null && <Bar label={targetLabel} val={targetVal} max={maxBar} color={S.gray} />}
          {medLocal != null && <Bar label={isDrug ? "Medicare (ASP)" : "Medicare (Worcester)"} val={medLocal} max={maxBar} color={S.amber} />}

          {/* distribution strip */}
          {hasField && (
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: "12px 14px", marginTop: 16 }}>
            <div style={{ fontSize: "0.72rem", color: S.muted, fontFamily: S.mono, marginBottom: 8 }}>MA FIELD ({fld.n} providers)</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: S.gray }}>
              <span>min {money(fld.mn)}</span><span>p25 {money(fld.p25)}</span><span>med {money(fld.med)}</span><span>p75 {money(fld.p75)}</span><span>max {money(fld.mx)}</span>
            </div>
            <div style={{ fontSize: "0.78rem", color: S.gray, marginTop: 8 }}>
              By locality — Rest of MA: <b style={{ color: S.text }}>{money(byLoc.rest_of_ma && byLoc.rest_of_ma.median)}</b> median ·
              Metro Boston: <b style={{ color: S.text }}>{money(byLoc.metro_boston && byLoc.metro_boston.median)}</b> median{geoAdj && factor !== 1 ? ` (→ ${money(adj(byLoc.metro_boston && byLoc.metro_boston.median, "metro_boston"))} adj.)` : ""}
            </div>
          </div>
          )}

          {/* named peers */}
          {peers.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: "0.72rem", color: S.muted, fontFamily: S.mono, marginBottom: 8 }}>{hasField ? "NAMED PEERS" : "VRA vs LEXINGTON"}</div>
            {peers.map((p) => {
              const r = adj(p.rate, p.locality);
              return (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${S.border}` }}>
                  <span style={{ fontSize: "0.84rem", color: p.is_self ? S.blue : S.text, fontWeight: p.is_self ? 700 : 400 }}>
                    {p.name}{p.locality ? <span style={{ color: S.muted, fontSize: "0.72rem" }}> · {p.locality === "metro_boston" ? "Boston" : p.locality === "rest_of_ma" ? "Rest of MA" : "—"}</span> : null}
                  </span>
                  <span style={{ fontSize: "0.84rem", fontWeight: 700, color: S.bright }}>{money(r)}{geoAdj && p.locality === "metro_boston" && !isDrug ? <span style={{ color: S.muted, fontSize: "0.7rem" }}> adj</span> : null}</span>
                </div>
              );
            })}
          </div>
          )}

          {/* benchmarks */}
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 16, fontSize: "0.8rem", color: S.gray }}>
            <span>Medicare (nat'l): <b style={{ color: S.text }}>{money(b.med_nat)}</b></span>
            {!isDrug && <span>Medicare (Worcester): <b style={{ color: S.text }}>{money(b.mworc)}</b> · (Boston {money(b.mbos)})</span>}
            <span>MassHealth: <b style={{ color: S.text }}>{money(b.mh)}</b></span>
          </div>

          {/* RVU breakdown — how the Medicare rate is built (procedures only; drugs are ASP-based) */}
          {!isDrug && rvu && rvu.total_nonfac_rvu > 0 && (
            <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: "12px 14px", marginTop: 16 }}>
              <div style={{ fontSize: "0.72rem", color: S.muted, fontFamily: S.mono, marginBottom: 8 }}>MEDICARE RVU BREAKDOWN · 2026 MPFS (office / non-facility)</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: S.gray, marginBottom: 6 }}>
                <span>Work <b style={{ color: S.text }}>{rvu.work_rvu}</b></span>
                <span>+ Practice exp. <b style={{ color: S.text }}>{rvu.pe_nonfac_rvu}</b></span>
                <span>+ Malpractice <b style={{ color: S.text }}>{rvu.mp_rvu}</b></span>
                <span>= Total <b style={{ color: S.bright }}>{rvu.total_nonfac_rvu}</b></span>
              </div>
              <div style={{ fontSize: "0.8rem", color: S.gray, lineHeight: 1.6 }}>
                {rvu.total_nonfac_rvu} RVU × conversion factor <b style={{ color: S.text }}>${rvu.cf_nonqp}</b> = <b style={{ color: S.amber }}>{money(rvu.medicare_natl_office)}</b> national Medicare
                <span style={{ color: S.muted, fontSize: "0.72rem" }}> (QP-APM CF ${rvu.cf_qp})</span>
              </div>
              {vra != null && (
                <div style={{ fontSize: "0.8rem", color: S.gray, lineHeight: 1.6, marginTop: 4 }}>
                  At your rate of <b style={{ color: S.blue }}>{money(vra)}</b>: <b style={{ color: S.text }}>${(vra / rvu.total_nonfac_rvu).toFixed(2)}/RVU</b> · <b style={{ color: S.text }}>{(vra / rvu.medicare_natl_office).toFixed(2)}×</b> national Medicare
                </div>
              )}
            </div>
          )}

          {/* drug margin */}
          {isDrug && (
            <div style={{ background: S.card, border: `1px solid ${margin ? S.green : S.border}`, borderRadius: 10, padding: "12px 14px", marginTop: 16 }}>
              <div style={{ fontSize: "0.72rem", color: S.muted, fontFamily: S.mono, marginBottom: 6 }}>DRUG MARGIN (BUY &amp; BILL){data.description ? ` · ${data.description}` : ""}</div>
              {margin ? (
                <>
                  <div style={{ fontSize: "0.92rem", fontWeight: 700, color: S.text, lineHeight: 1.6 }}>
                    Reimbursement {money(vra * upd)}/dose − acquisition {money(margin.acqPerUnit * upd)}/dose =
                    <span style={{ color: margin.perDose >= 0 ? S.green : S.red }}> {money(margin.perDose)}/dose</span>
                  </div>
                  <div style={{ fontSize: "0.76rem", color: S.muted, marginTop: 4 }}>
                    {money(margin.perUnit)}/unit · {upd} units/dose
                  </div>
                </>
              ) : (
                <div style={{ fontSize: "0.82rem", color: S.muted }}>No acquisition cost entered yet for this drug — add it in <span style={{ fontFamily: S.mono }}>drug_costs</span> to see margin.</div>
              )}
            </div>
          )}

          <p style={{ fontSize: "0.7rem", color: S.muted, marginTop: 24, lineHeight: 1.6, fontFamily: S.mono }}>
            Office (POS 11) rates. UHC = published Transparency-in-Coverage files (full MA peer field); regional plans = your contracted VRA vs. Lexington rates; Medicare / MassHealth = fee schedules. "Normalize to Worcester" applies the Boston→Worcester Medicare GPCI ratio so cross-locality gaps reflect contract, not geography. Drugs are national ASP (no geographic adjustment).
          </p>
        </>
      )}

      {/* Drug economics overview — all injection drugs by product/dose, always visible */}
      {drugEcon.length > 0 && (
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: "12px 14px", marginTop: 24 }}>
          <div style={{ fontSize: "0.72rem", color: S.muted, fontFamily: S.mono, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>DRUG ECONOMICS · MEDICARE BUY-AND-BILL</div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0 0 6px", borderBottom: `1px solid ${S.border}`, fontSize: "0.68rem", color: S.muted, fontFamily: S.mono, textTransform: "uppercase", letterSpacing: 0.5 }}>
            <span style={{ flex: 3 }}>Drug</span>
            <span style={{ flex: 1, textAlign: "right" }}>Acq</span>
            <span style={{ flex: 1, textAlign: "right" }}>Medicare/dose</span>
            <span style={{ flex: 1, textAlign: "right" }}>Margin/dose</span>
          </div>
          {[...drugEcon].sort((a, b) => Number(b.margin_per_dose) - Number(a.margin_per_dose)).map((d) => (
            <div key={d.code} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "8px 0", borderBottom: `1px solid ${S.border}` }}>
              <span style={{ flex: 3, fontSize: "0.82rem", color: S.text, paddingRight: 8, wordBreak: "break-word" }}>{d.drug_name}</span>
              <span style={{ flex: 1, textAlign: "right", fontSize: "0.82rem", color: S.gray }}>{money(Number(d.acq_cost))}</span>
              <span style={{ flex: 1, textAlign: "right", fontSize: "0.82rem", color: S.gray }}>{money(Number(d.medicare_per_dose))}</span>
              <span style={{ flex: 1, textAlign: "right", fontSize: "0.82rem", fontWeight: 700, color: Number(d.margin_per_dose) >= 0 ? S.green : S.red }}>{money(Number(d.margin_per_dose))}</span>
            </div>
          ))}
          <div style={{ fontSize: "0.7rem", color: S.muted, marginTop: 10, lineHeight: 1.6 }}>
            Acquisition as of {drugEcon[0].acq_as_of} · Medicare ASP+6 as of {drugEcon[0].medicare_as_of}. Buy-and-bill margin before 2% sequestration; commercial payers vary — use the picker above for a specific plan.
          </div>
        </div>
      )}
    </Shell>
  );
}

function ordinal(n) {
  const v = Math.round(n);
  const s = ["th", "st", "nd", "rd"], k = v % 100;
  return v + (s[(k - 20) % 10] || s[k] || s[0]);
}

function Shell({ children, embedded, onBack, onSignOut }) {
  return (
    <div style={embedded ? { fontFamily: S.font, color: S.text } : { minHeight: "100vh", background: S.bg, fontFamily: S.font, color: S.text }}>
      {!embedded && (
        <div style={{ padding: "10px 20px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "none", border: `1px solid ${S.border}`, borderRadius: 8, padding: "6px 14px", color: S.muted, fontFamily: S.font, fontSize: "0.78rem", cursor: "pointer" }}>&larr; Back</button>
          <span style={{ fontSize: "1rem", fontWeight: 700, color: S.bright }}>📊 Rate Comparison</span>
          <span style={{ fontSize: "0.72rem", color: S.muted, fontFamily: S.mono }}>VRA vs the MA peer field</span>
          {onSignOut && <button onClick={onSignOut} style={{ marginLeft: "auto", background: "none", border: `1px solid ${S.border}`, borderRadius: 8, padding: "6px 12px", color: S.muted, fontFamily: S.font, fontSize: "0.72rem", cursor: "pointer" }}>Sign out</button>}
        </div>
      )}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px 48px" }}>{children}</div>
    </div>
  );
}

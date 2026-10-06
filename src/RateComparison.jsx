import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabaseClient.js";
import { S, T, card, field, fieldLabel, btnSm, secHead } from "./theme.js";
import PageBar, { wrap } from "./PageBar.jsx";
import { AlertIcon } from "./icons.jsx";

const numCell = { fontFamily: T.mono, fontSize: 13, textAlign: "right", fontVariantNumeric: "tabular-nums" };
const softOf = (c) => (c === T.green ? [T.greenSoft, T.green] : c === T.red ? [T.redSoft, "#F0C4BF"] : c === T.amber ? [T.amberSoft, T.goldSoft] : [T.surface, T.line]);

// ── Manager's Hub: rate comparison (VRA vs the MA peer field) ───────────────
// Reads the locked Supabase hub_* functions. Only the signed-in
// mrodriguez@retina-docs.com session can read any rate data.


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
    <div style={field({ position: "relative", flex: "1 1 220px", minWidth: 0 })}>
      <label style={fieldLabel()}>{label}</label>
      <input ref={inputRef} type="text" value={open ? query : value} placeholder={placeholder}
        onFocus={(e) => { setOpen(true); setQuery(""); e.target.select(); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="vra-input"
        style={{ width: "100%", height: 32, background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.r, padding: "0 10px", color: T.ink, fontFamily: T.sans, fontSize: 13.5, boxSizing: "border-box", outline: "none", textOverflow: "ellipsis" }} />
      {open && (
        <div style={{ position: "absolute", zIndex: 30, left: 14, right: 14, top: "calc(100% - 8px)", background: T.surface, border: `1px solid ${T.accentLine}`, borderRadius: T.r, maxHeight: 280, overflowY: "auto" }}>
          {shown.length === 0 && <div style={{ padding: "10px 12px", fontSize: 12.5, color: T.muted }}>No matches</div>}
          {shown.map((it) => (
            <div key={it.val} onMouseDown={(e) => { e.preventDefault(); onPick(it.val); setQuery(""); setOpen(false); if (inputRef.current) inputRef.current.blur(); }}
              style={{ padding: "8px 12px", fontSize: 13, color: T.ink, cursor: "pointer", borderBottom: `1px solid ${T.line}` }}
              onMouseEnter={(e) => (e.currentTarget.style.background = T.paper)}
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
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: T.ink2 }}>{label}{sub && <span style={{ color: T.muted }}> {sub}</span>}</span>
        <span style={{ fontWeight: 500, color: T.ink, fontFamily: T.mono, fontVariantNumeric: "tabular-nums" }}>{money(val)}</span>
      </div>
      <div style={{ height: 10, background: T.paper, border: `1px solid ${T.line}`, borderRadius: 999, overflow: "hidden", boxSizing: "border-box" }}>
        <div style={{ height: "100%", width: `${w}%`, background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}

function Card({ label, value, color, sub }) {
  return (
    <div style={field()}>
      <div style={{ fontSize: 12.5, color: T.muted, marginBottom: 4, fontFamily: T.sans }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", color: color || T.ink, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: T.muted, marginTop: 3, lineHeight: 1.4 }}>{sub}</div>}
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
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <Combo label="Insurance" value={net ? net.label : ""} placeholder="Pick a plan…" items={netItems} onPick={pickNet} />
        <Combo label="Procedure or drug" value={codeLabel} placeholder="Search code or name…" items={codeItems} onPick={setCode} />
        {data && data.kind !== "bench" && (
          <Combo label="Compare against" value={(targetItems.find((t) => t.val === target) || {}).label || ""} placeholder="Pick a peer or group…" items={targetItems.map((t) => ({ ...t, search: t.label }))} onPick={setTarget} />
        )}
      </div>

      <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: T.ink2, marginBottom: 20, cursor: "pointer" }}>
        <input type="checkbox" style={{ accentColor: T.accent, width: 15, height: 15, margin: 0 }} checked={geoAdj} onChange={(e) => setGeoAdj(e.target.checked)} />
        Normalize Boston rates to Worcester (remove geography)
      </label>

      {loading || !data ? (
        <div style={{ color: T.muted, padding: "20px 0", fontSize: 13.5 }}>{loading ? "Loading…" : "Pick a code."}</div>
      ) : (
        <>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.accent }}><span style={{ fontFamily: T.mono, fontWeight: 500 }}>{data.code}</span>{isDrug ? " · drug" : ""}</div>
          <div style={{ fontSize: 13, color: T.ink2, marginBottom: 16, marginTop: 2 }}>{data.description} · {net ? net.label : ""}</div>

          {data.note && (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: T.amberSoft, border: `1px solid ${T.goldSoft}`, borderRadius: T.r, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: T.amber, lineHeight: 1.5 }}>
              <span style={{ marginTop: 1 }}><AlertIcon /></span><span>{data.note}</span>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 16 }}>
            <Card label={data.kind === "bench" ? "Rate · all providers" : "Your rate (VRA)"} value={money(vra)} color={S.blue} sub={data.vra_pctile != null ? `${ordinal(data.vra_pctile)} percentile of ${fld.n} MA providers` : null} />
            {data.kind !== "bench" && <Card label={targetLabel || "Comparison"} value={money(targetVal)} />}
            {vraPctOfMed != null && data.kind !== "bench" && <Card label="vs local Medicare" value={`${vraPctOfMed.toFixed(2)}×`} sub={`Worcester · Medicare ${money(medLocal)}`} />}
          </div>

          {verdict && (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: softOf(verdict.c)[0], border: `1px solid ${softOf(verdict.c)[1]}`, borderRadius: T.r, padding: "10px 14px", marginBottom: 18 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: verdict.c, flexShrink: 0, marginTop: 6 }} />
              <span style={{ fontSize: 13, color: verdict.c, lineHeight: 1.5, fontWeight: 500 }}>{verdict.t}</span>
            </div>
          )}

          {data.kind === "bench" && (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: T.accentSoft, border: `1px solid ${T.accentLine}`, borderRadius: T.r, padding: "10px 14px", marginBottom: 18 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: T.accent, flexShrink: 0, marginTop: 6 }} />
              <span style={{ fontSize: 13, color: T.ink2, lineHeight: 1.5 }}>{net && net.payer === "MassHealth" ? "MassHealth (Medicaid) — state-set rate, identical for every provider. No negotiation, no peer gap; your reimbursement floor." : "Medicare fee schedule, Worcester locality — federally set, identical for every provider. The benchmark everything else is measured against."}</span>
            </div>
          )}

          <Bar label={data.kind === "bench" ? "Rate" : "You (VRA)"} val={vra} max={maxBar} color={S.blue} />
          {targetVal != null && <Bar label={targetLabel} val={targetVal} max={maxBar} color={S.gray} />}
          {medLocal != null && <Bar label={isDrug ? "Medicare (ASP)" : "Medicare (Worcester)"} val={medLocal} max={maxBar} color={S.amber} />}

          {/* distribution strip */}
          {hasField && (
          <div style={field({ marginTop: 16 })}>
            <div style={{ fontSize: 13.5, color: T.ink, fontWeight: 600, fontFamily: T.sans, marginBottom: 8 }}>MA field ({fld.n} providers)</div>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "4px 12px", fontSize: 13, color: T.ink2, fontFamily: T.mono, fontVariantNumeric: "tabular-nums" }}>
              <span>min {money(fld.mn)}</span><span>p25 {money(fld.p25)}</span><span>med {money(fld.med)}</span><span>p75 {money(fld.p75)}</span><span>max {money(fld.mx)}</span>
            </div>
            <div style={{ fontSize: 13, color: T.ink2, marginTop: 8, lineHeight: 1.5 }}>
              By locality — Rest of MA: <b style={{ color: S.text }}>{money(byLoc.rest_of_ma && byLoc.rest_of_ma.median)}</b> median ·
              Metro Boston: <b style={{ color: S.text }}>{money(byLoc.metro_boston && byLoc.metro_boston.median)}</b> median{geoAdj && factor !== 1 ? ` (→ ${money(adj(byLoc.metro_boston && byLoc.metro_boston.median, "metro_boston"))} adj.)` : ""}
            </div>
          </div>
          )}

          {/* named peers */}
          {peers.length > 0 && (
          <div className="vra-table" style={card({ marginTop: 16, overflow: "hidden" })}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", background: T.paper, borderBottom: `1px solid ${T.line}`, fontSize: 12.5, color: T.muted, fontWeight: 500 }}>
              <span>{hasField ? "Named peers" : "VRA vs Lexington"}</span><span>Rate</span>
            </div>
            {peers.map((p, i) => {
              const r = adj(p.rate, p.locality);
              return (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "8px 14px", borderTop: i === 0 ? "none" : `1px solid ${T.line}`, background: p.is_self ? T.accentSoft : "transparent" }}>
                  <span style={{ fontSize: 13.5, color: p.is_self ? T.accent : T.ink, fontWeight: p.is_self ? 600 : 400, minWidth: 0 }}>
                    {p.name}{p.locality ? <span style={{ color: T.muted, fontSize: 12, fontWeight: 400 }}> · {p.locality === "metro_boston" ? "Boston" : p.locality === "rest_of_ma" ? "Rest of MA" : "—"}</span> : null}
                  </span>
                  <span style={{ ...numCell, color: T.ink, whiteSpace: "nowrap" }}>{money(r)}{geoAdj && p.locality === "metro_boston" && !isDrug ? <span style={{ color: T.muted, fontSize: 11.5, fontFamily: T.sans }}> adj</span> : null}</span>
                </div>
              );
            })}
          </div>
          )}

          {/* benchmarks */}
          <div style={{ display: "flex", gap: "6px 18px", flexWrap: "wrap", marginTop: 16, fontSize: 13, color: T.ink2 }}>
            <span>Medicare (nat'l): <b style={{ color: S.text }}>{money(b.med_nat)}</b></span>
            {!isDrug && <span>Medicare (Worcester): <b style={{ color: S.text }}>{money(b.mworc)}</b> · (Boston {money(b.mbos)})</span>}
            <span>MassHealth: <b style={{ color: S.text }}>{money(b.mh)}</b></span>
          </div>

          {/* RVU breakdown — how the Medicare rate is built (procedures only; drugs are ASP-based) */}
          {!isDrug && rvu && rvu.total_nonfac_rvu > 0 && (
            <div style={field({ marginTop: 16 })}>
              <div style={{ fontSize: 13.5, color: T.ink, fontWeight: 600, fontFamily: T.sans, marginBottom: 8 }}>Medicare RVU breakdown · 2026 MPFS (office / non-facility)</div>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "4px 12px", fontSize: 13, color: T.ink2, marginBottom: 6 }}>
                <span>Work <b style={{ color: S.text }}>{rvu.work_rvu}</b></span>
                <span>+ Practice exp. <b style={{ color: S.text }}>{rvu.pe_nonfac_rvu}</b></span>
                <span>+ Malpractice <b style={{ color: S.text }}>{rvu.mp_rvu}</b></span>
                <span>= Total <b style={{ color: S.bright }}>{rvu.total_nonfac_rvu}</b></span>
              </div>
              <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.6 }}>
                {rvu.total_nonfac_rvu} RVU × conversion factor <b style={{ color: S.text }}>${rvu.cf_nonqp}</b> = <b style={{ color: S.amber }}>{money(rvu.medicare_natl_office)}</b> national Medicare
                <span style={{ color: T.muted, fontSize: 12 }}> (QP-APM CF ${rvu.cf_qp})</span>
              </div>
              {vra != null && (
                <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.6, marginTop: 4 }}>
                  At your rate of <b style={{ color: S.blue }}>{money(vra)}</b>: <b style={{ color: S.text }}>${(vra / rvu.total_nonfac_rvu).toFixed(2)}/RVU</b> · <b style={{ color: S.text }}>{(vra / rvu.medicare_natl_office).toFixed(2)}×</b> national Medicare
                </div>
              )}
            </div>
          )}

          {/* drug margin */}
          {isDrug && (
            <div style={field({ marginTop: 16, borderColor: margin ? T.green : T.line })}>
              <div style={{ fontSize: 13.5, color: T.ink, fontWeight: 600, fontFamily: T.sans, marginBottom: 6 }}>Drug margin (buy &amp; bill){data.description ? ` · ${data.description}` : ""}</div>
              {margin ? (
                <>
                  <div style={{ fontSize: 14, fontWeight: 500, color: T.ink, lineHeight: 1.6 }}>
                    Reimbursement {money(vra * upd)}/dose − acquisition {money(margin.acqPerUnit * upd)}/dose =
                    <span style={{ color: margin.perDose >= 0 ? S.green : S.red }}> {money(margin.perDose)}/dose</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: T.muted, marginTop: 4, fontFamily: T.mono }}>
                    {money(margin.perUnit)}/unit · {upd} units/dose
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: T.muted }}>No acquisition cost entered yet for this drug — add it in <span style={{ fontFamily: S.mono }}>drug_costs</span> to see margin.</div>
              )}
            </div>
          )}

          <p style={{ fontSize: 12, color: T.muted, marginTop: 24, lineHeight: 1.6, fontFamily: T.sans }}>
            Office (POS 11) rates. UHC = published Transparency-in-Coverage files (full MA peer field); regional plans = your contracted VRA vs. Lexington rates; Medicare / MassHealth = fee schedules. "Normalize to Worcester" applies the Boston→Worcester Medicare GPCI ratio so cross-locality gaps reflect contract, not geography. Drugs are national ASP (no geographic adjustment).
          </p>
        </>
      )}

      {/* Drug economics overview — all injection drugs by product/dose, always visible */}
      {drugEcon.length > 0 && (
        <>
        <h2 style={secHead({ marginTop: 28 })}>Drug economics · Medicare buy-and-bill</h2>
        <div className="vra-table" style={card({ overflow: "hidden" })}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 14px", background: T.paper, borderBottom: `1px solid ${T.line}`, fontSize: 12.5, color: T.muted, fontWeight: 500 }}>
            <span style={{ flex: 3 }}>Drug</span>
            <span style={{ flex: 1, textAlign: "right" }}>Acq</span>
            <span style={{ flex: 1, textAlign: "right" }}>Medicare/dose</span>
            <span style={{ flex: 1, textAlign: "right" }}>Margin/dose</span>
          </div>
          {[...drugEcon].sort((a, b) => Number(b.margin_per_dose) - Number(a.margin_per_dose)).map((d, i) => (
            <div key={d.code} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, padding: "8px 14px", borderTop: i === 0 ? "none" : `1px solid ${T.line}` }}>
              <span style={{ flex: 3, fontSize: 13.5, color: T.ink, paddingRight: 8, wordBreak: "break-word" }}>{d.drug_name}</span>
              <span style={{ flex: 1, ...numCell, color: T.ink2 }}>{money(Number(d.acq_cost))}</span>
              <span style={{ flex: 1, ...numCell, color: T.ink2 }}>{money(Number(d.medicare_per_dose))}</span>
              <span style={{ flex: 1, ...numCell, fontWeight: 500, color: Number(d.margin_per_dose) >= 0 ? T.green : T.red }}>{money(Number(d.margin_per_dose))}</span>
            </div>
          ))}
          <div style={{ fontSize: 12, color: T.muted, padding: "10px 14px", borderTop: `1px solid ${T.line}`, background: T.paper, lineHeight: 1.6 }}>
            Acquisition as of {drugEcon[0].acq_as_of} · Medicare ASP+6 as of {drugEcon[0].medicare_as_of}. Buy-and-bill margin before 2% sequestration; commercial payers vary — use the picker above for a specific plan.
            <br /><span style={{ color: T.amber, fontWeight: 600 }}>Timing:</span> these are <b>forward</b> figures at the current-quarter rate — right for "should I use this drug now" decisions. Payments landing in the bank now are for prior-period claims paid at the <b>prior</b> quarter's ASP rate (Medicare resets quarterly on a ~2-quarter lag), so this month's receipts won't match these margins exactly.
          </div>
        </div>
        </>
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
    <div style={embedded ? { fontFamily: T.sans, color: T.ink } : { minHeight: "100vh", background: T.paper, fontFamily: T.sans, color: T.ink }}>
      {!embedded && (
        <PageBar
          onBack={onBack}
          title="Rate Comparison"
          sub="VRA vs the MA peer field"
          topAccent={T.gold}
          right={onSignOut && <button onClick={onSignOut} style={btnSm("secondary", { color: T.ink2 })}>Sign out</button>}
        />
      )}
      <div className={embedded ? undefined : "vra-wrap"} style={embedded ? { padding: "4px 0 48px" } : wrap({ paddingTop: 22, paddingBottom: 48 })}>{children}</div>
    </div>
  );
}

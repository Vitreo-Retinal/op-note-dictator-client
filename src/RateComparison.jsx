import { useState, useEffect, useMemo, useRef } from "react";
import { hubRpc } from "./lib/hubRpc.js"; // via the hub server, not the public key (security stage 3, Oct 24 2026)
import { searchPlans } from "./lib/planSearch.js";
import { price, hasSingleRate, patternLine, priceSets, eobLine, eobDates, sourceLine, noFileLine, timelineRuns, pctChange, medicarePeriod, monthOptions, monthLabel, dayLabel, ymOf, SEVERAL_PRICES_LINE } from "./lib/rateText.js";
import { S, T, card, field, fieldLabel, btnSm, secHead } from "./theme.js";
import PageBar, { wrap } from "./PageBar.jsx";
import { AlertIcon } from "./icons.jsx";

const numCell = { fontFamily: T.mono, fontSize: 13, textAlign: "right", fontVariantNumeric: "tabular-nums" };
const softOf = (c) => (c === T.green ? [T.greenSoft, T.green] : c === T.red ? [T.redSoft, "#F0C4BF"] : c === T.amber ? [T.amberSoft, T.goldSoft] : [T.surface, T.line]);

// ── Rates (v2, Oct 2026): VRA's own published rate for one plan + one code ──
// Data: hub_rate_plans() (every insurance plan, Retina-Rx-style search) and
// hub_plan_rate_at(plan_key, code, month), both through the hub server (lib/hubRpc.js).
// Date of service (Oct 2026): the month picker asks for that month's file, or the
// nearest earlier one, so a new rate never hides an old one. EOB payments show
// their service and EOB dates — payments lag the service.
// Mari's rules: only VRA's actual rates — never an estimate, never "≈ Medicare",
// never another plan's rate. When the file lists several prices without saying
// which one applies, there is no main number. Peers come from the same file.

const money = (v) => (v == null ? "—" : "$" + Math.round(v).toLocaleString());
const LOCALITY = { metro_boston: "Boston", rest_of_ma: "Rest of MA" };

function Combo({ label, value, placeholder, items, onPick, search }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const shown = useMemo(() => {
    if (search) return search(query).slice(0, 80);
    const q = query.trim().toLowerCase();
    const qc = q.replace(/\s+/g, "");
    const list = q ? items.filter((it) => {
      const hay = (it.search || it.label).toLowerCase();
      return hay.includes(q) || (qc.length >= 2 && hay.replace(/\s+/g, "").includes(qc));
    }) : items;
    return list.slice(0, 80);
  }, [query, items, search]);
  return (
    <div style={field({ position: "relative", flex: "1 1 220px", minWidth: 0 })}>
      <label style={fieldLabel()}>{label}</label>
      <input ref={inputRef} type="text" value={open ? query : value} placeholder={placeholder} aria-label={label}
        onFocus={(e) => { setOpen(true); setQuery(""); e.target.select(); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="vra-input"
        style={{ width: "100%", height: 32, background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.r, padding: "0 10px", color: T.ink, fontFamily: T.sans, fontSize: 13.5, boxSizing: "border-box", outline: "none", textOverflow: "ellipsis" }} />
      {open && (
        <div role="listbox" style={{ position: "absolute", zIndex: 30, left: 14, right: 14, top: "calc(100% - 8px)", background: T.surface, border: `1px solid ${T.accentLine}`, borderRadius: T.r, maxHeight: 280, overflowY: "auto" }}>
          {shown.length === 0 && <div style={{ padding: "10px 12px", fontSize: 12.5, color: T.muted }}>No matches</div>}
          {shown.map((it) => (
            <div key={it.val} role="option" onMouseDown={(e) => { e.preventDefault(); onPick(it.val); setQuery(""); setOpen(false); if (inputRef.current) inputRef.current.blur(); }}
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
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: T.ink2, minWidth: 0 }}>{label}{sub && <span style={{ color: T.muted }}> {sub}</span>}</span>
        <span style={{ fontWeight: 500, color: T.ink, fontFamily: T.mono, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{price(val)}</span>
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

function MonthPick({ value, onPick, options }) {
  return (
    <div style={field({ flex: "0 1 170px", minWidth: 0 })}>
      <label style={fieldLabel()} htmlFor="rates-month">Date of service</label>
      <select id="rates-month" value={value} onChange={(e) => onPick(e.target.value)} className="vra-input"
        style={{ width: "100%", height: 32, background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.r, padding: "0 8px", color: T.ink, fontFamily: T.sans, fontSize: 13.5, boxSizing: "border-box", outline: "none" }}>
        {options.map((o) => <option key={o.val} value={o.val}>{o.label}</option>)}
      </select>
    </div>
  );
}

// "Rate by file month": equal-rate months compressed; changes in percent.
function Timeline({ data }) {
  const runs = timelineRuns(data.timeline);
  if (!runs.length) return null;
  const used = data.vra && data.vra.source_month;
  const isDrug = data.type === "drug";
  return (
    <div style={field({ marginBottom: 12, padding: "10px 14px" })}>
      <div style={{ fontSize: 12.5, color: T.muted, marginBottom: 6 }}>Rate by file month{isDrug ? " (per unit)" : ""}</div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "4px 8px", fontSize: 13, color: T.ink2, lineHeight: 1.5 }}>
        {runs.map((r, i) => {
          const inUse = used && used >= r.from && used <= r.to;
          const c = r.change == null || r.change === 0 ? T.muted : r.change < 0 ? T.red : T.green;
          return (
            <span key={r.from} style={{ whiteSpace: "nowrap" }}>
              {i > 0 && <span style={{ color: T.muted, marginRight: 8 }}>→</span>}
              <span style={{ fontWeight: inUse ? 600 : 400, color: inUse ? T.ink : T.ink2 }}>{r.label} {r.rate == null ? "several prices" : <span style={{ fontFamily: T.mono, fontVariantNumeric: "tabular-nums" }}>{price(r.rate)}</span>}</span>
              {r.change != null && <span style={{ color: c, fontWeight: 600 }}> ({pctChange(r.change)})</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Note({ tone = "amber", children }) {
  const c = tone === "amber" ? { bg: T.amberSoft, line: T.goldSoft, fg: T.amber } : { bg: T.accentSoft, line: T.accentLine, fg: T.ink2 };
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: c.bg, border: `1px solid ${c.line}`, borderRadius: T.r, padding: "10px 14px", marginTop: 10, fontSize: 13, color: c.fg, lineHeight: 1.5 }}>
      {tone === "amber" && <span style={{ marginTop: 1, flexShrink: 0 }}><AlertIcon /></span>}<span style={{ minWidth: 0 }}>{children}</span>
    </div>
  );
}

const PriceList = ({ prices }) => (
  <span style={{ fontFamily: T.mono, fontVariantNumeric: "tabular-nums", color: T.ink, wordBreak: "break-word" }}>{prices.map(price).join(", ")}</span>
);

// The "Your rate (VRA)" card: one rate, several prices, no rate, or no file.
function VraCard({ data }) {
  const plan = data.plan || {};
  const vra = data.vra;
  const isDrug = data.type === "drug";
  const upd = isDrug && data.units_per_dose ? Number(data.units_per_dose) : 1;
  const muted = { fontSize: 12.5, color: T.muted, lineHeight: 1.5, marginTop: 4 };
  const body = { fontSize: 13.5, color: T.ink2, lineHeight: 1.55, marginTop: 8 };

  let content;
  if (plan.source === "none") {
    content = (
      <>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, lineHeight: 1.4 }}>No VRA rate on file for {plan.name}.</div>
        {plan.none_reason && <div style={body}>{plan.none_reason}</div>}
        {(data.eob || []).map((e, i) => (
          <div key={i} style={{ ...body, background: T.paper, border: `1px solid ${T.line}`, borderRadius: T.r, padding: "8px 12px" }}>
            <div>{eobLine(e)}</div>
            <div style={{ fontSize: 12.5, color: T.muted, marginTop: 2 }}>{eobDates(e, data.month)}</div>
          </div>
        ))}
      </>
    );
  } else if (!vra) {
    const noFile = noFileLine(data);
    content = (
      <>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, lineHeight: 1.4 }}>{noFile || `This file does not list ${data.code} for VRA.`}</div>
        {plan.label && <div style={muted}>{plan.label}</div>}
      </>
    );
  } else if (hasSingleRate(vra)) {
    const line = patternLine(vra);
    content = (
      <>
        <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "2px 10px" }}>
          <span style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.01em", color: S.blue, fontVariantNumeric: "tabular-nums" }}>{price(vra.rate)}</span>
          {isDrug && <span style={{ fontSize: 13, color: T.muted }}>per unit{upd > 1 ? ` · ${price(vra.rate * upd)} per dose (${upd} units)` : ""}</span>}
        </div>
        <div style={muted}>{sourceLine(plan, vra, data)}</div>
        {line && <div style={body}>{line}</div>}
        {vra.note && <div style={muted}>{vra.note}</div>}
      </>
    );
  } else {
    content = (
      <>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, lineHeight: 1.4 }}>No single VRA rate</div>
        <div style={muted}>{sourceLine(plan, vra, data)}</div>
        {priceSets(vra).map((s) => (
          <div key={s.label} style={body}>{s.label}: <PriceList prices={s.prices} />.</div>
        ))}
        <div style={body}>{SEVERAL_PRICES_LINE}</div>
        {vra.note && <div style={muted}>{vra.note}</div>}
      </>
    );
  }

  return (
    <div style={field({ marginBottom: 12, borderTop: `3px solid ${S.blue}` })}>
      <div style={{ fontSize: 12.5, color: T.muted, marginBottom: 6, fontFamily: T.sans }}>Your rate (VRA)</div>
      {content}
      {plan.caveat && <Note>{plan.caveat}</Note>}
      {plan.status === "draft" && <div style={{ fontSize: 11.5, color: T.muted, marginTop: 10 }}>Plan mapping under review.</div>}
    </div>
  );
}

export default function RateComparison({ onBack, embedded = false }) {
  const [codes, setCodes] = useState([]);
  const [plans, setPlans] = useState([]);
  const [planKey, setPlanKey] = useState(null); // nothing pre-selected (Mari: "Pick a plan…")
  const [code, setCode] = useState("67028");
  const [month, setMonth] = useState(() => ymOf()); // date of service, 'YYYY-MM' — this month by default
  const months = useMemo(() => monthOptions(), []);
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [rvu, setRvu] = useState(null); // hub_rvu(code): work/PE/MP/total RVUs + 2026 conversion factors
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState("");
  const [geoAdj, setGeoAdj] = useState(true);
  const [drugEcon, setDrugEcon] = useState([]); // hub_drug_economics_v3(): per-dose buy-and-bill margins, current + prior Medicare quarter
  const reqId = useRef(0);

  useEffect(() => {
    hubRpc("hub_drug_economics_v3").then(({ data }) => setDrugEcon(data || []));
    hubRpc("hub_codes").then(({ data }) => setCodes((data || []).filter((c) => c.has_market)));
    hubRpc("hub_rate_plans").then(({ data }) => setPlans(data || []));
  }, []);

  useEffect(() => {
    if (!code || !planKey) { setData(null); return; }
    const id = ++reqId.current;
    setLoading(true); setFailed(false);
    hubRpc("hub_plan_rate_at", { p_plan_key: planKey, p_code: code, p_month: month }).then(({ data, error }) => {
      if (id !== reqId.current) return; // a newer pick is on its way
      setData(error ? null : data); setFailed(!!error || !data); setLoading(false);
    });
  }, [code, planKey, month]);

  // RVU breakdown depends only on the code (Medicare component values are national)
  useEffect(() => {
    if (!code) { setRvu(null); return; }
    hubRpc("hub_rvu", { p_code: code }).then(({ data, error }) => setRvu(error ? null : data));
  }, [code]);

  const peers = (data && data.peers) || [];
  const ratedPeers = peers.filter((p) => p.rate != null);

  // keep the comparison target on a peer that has a rate in this answer
  useEffect(() => {
    if (!ratedPeers.some((p) => "peer:" + p.id === target)) setTarget(ratedPeers.length ? "peer:" + ratedPeers[0].id : "");
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const codeItems = useMemo(
    () => codes.map((c) => ({ val: c.code, label: c.description ? `${c.code} — ${c.description}` : c.code, search: `${c.code} ${c.description || ""}` })),
    [codes]
  );
  const planSearch = useMemo(() => (q) => searchPlans(q, plans).map((p) => ({ val: p.plan_key, label: p.name })), [plans]);
  const plan = plans.find((p) => p.plan_key === planKey) || null;

  const isDrug = data && data.type === "drug";
  const upd = isDrug && data.units_per_dose ? Number(data.units_per_dose) : 1;
  const b = data ? data.benchmarks || {} : {};
  const factor = !isDrug && b.mworc && b.mbos ? b.mworc / b.mbos : 1; // metro-Boston → Worcester
  const adj = (rate, locality) => (rate == null ? null : (geoAdj && locality === "metro_boston" && !isDrug ? rate * factor : rate));

  const vraObj = data ? data.vra : null;
  const vra = hasSingleRate(vraObj) ? Number(vraObj.rate) : null; // only VRA's own single rate — never a fallback
  const src = data && data.plan ? data.plan.source : null;

  const targetItems = ratedPeers.map((p) => ({ val: "peer:" + p.id, label: p.name, search: p.name }));
  let targetVal = null, targetLabel = "", crossLoc = false;
  if (data && target.startsWith("peer:")) {
    const p = ratedPeers.find((x) => x.id === target.slice(5));
    if (p) { targetVal = adj(p.rate, p.locality); targetLabel = p.name; crossLoc = p.locality === "metro_boston"; }
  }

  // verdict vs target (materiality band ±3%; red if >10% below)
  let verdict = null;
  if (vra != null && targetVal != null && targetVal > 0) {
    const gap = vra / targetVal - 1;
    const adjNote = crossLoc && geoAdj && !isDrug ? " (geography-adjusted to Worcester)" : crossLoc && !isDrug ? " — raw; toggle geography for apples-to-apples" : "";
    if (gap >= -0.03) verdict = { c: S.green, t: `You're at or above ${targetLabel}${adjNote}: ${price(vra)} vs ${price(targetVal)} (${gap >= 0 ? "+" : ""}${Math.round(gap * 100)}%).` };
    else if (gap >= -0.10) verdict = { c: S.amber, t: `Slightly below ${targetLabel}${adjNote}: ${price(vra)} vs ${price(targetVal)} (${Math.round(gap * 100)}%, ${price(targetVal - vra)} per service).` };
    else verdict = { c: S.red, t: `Materially below ${targetLabel}${adjNote}: ${price(vra)} vs ${price(targetVal)} — ${Math.round(-gap * 100)}% under, ${price(targetVal - vra)} per service. Negotiation target.` };
  }

  const medLocal = b.mworc != null ? b.mworc : b.med_nat;
  const showVsMed = vra != null && medLocal && src !== "medicare";
  const vraPctOfMed = showVsMed ? vra / medLocal : null;
  const medPer = data ? medicarePeriod(b, isDrug) : null;
  const maxBar = Math.max(vra || 0, targetVal || 0, medLocal || 0);

  // drug margin (VRA rate is per billed unit; × units_per_dose → per dose — same as v1)
  let margin = null;
  if (isDrug && data.drug_cost && data.drug_cost.acq_cost != null && vra != null) {
    const dc = data.drug_cost;
    const acqPerUnit = dc.cost_basis === "per_billed_unit" ? Number(dc.acq_cost)
      : dc.billed_units_per_vial ? Number(dc.acq_cost) / Number(dc.billed_units_per_vial) : null;
    if (acqPerUnit != null) margin = { perUnit: vra - acqPerUnit, acqPerUnit, perDose: (vra - acqPerUnit) * upd };
  }

  const codeLabel = data ? (data.description ? `${data.code} — ${data.description}` : data.code)
    : ((codeItems.find((c) => c.val === code) || {}).label || code);

  return (
    <Shell embedded={embedded} onBack={onBack}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <Combo label="Insurance" value={plan ? plan.name : ""} placeholder="Pick a plan…" items={[]} search={planSearch} onPick={setPlanKey} />
        <Combo label="Procedure or drug" value={codeLabel} placeholder="Search code or name…" items={codeItems} onPick={setCode} />
        <MonthPick value={month} onPick={setMonth} options={months} />
        {vra != null && targetItems.length > 0 && (
          <Combo label="Compare against" value={(targetItems.find((t) => t.val === target) || {}).label || ""} placeholder="Pick a group…" items={targetItems} onPick={setTarget} />
        )}
      </div>

      <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: T.ink2, marginBottom: 20, cursor: "pointer" }}>
        <input type="checkbox" style={{ accentColor: T.accent, width: 15, height: 15, margin: 0, flexShrink: 0 }} checked={geoAdj} onChange={(e) => setGeoAdj(e.target.checked)} />
        Normalize Boston rates to Worcester (remove geography)
      </label>

      {!planKey ? (
        <div style={{ color: T.muted, padding: "20px 0", fontSize: 13.5 }}>Pick a plan to see VRA's rate.</div>
      ) : loading ? (
        <div style={{ color: T.muted, padding: "20px 0", fontSize: 13.5 }}>Loading…</div>
      ) : failed || !data ? (
        <div style={{ color: T.muted, padding: "20px 0", fontSize: 13.5 }}>Could not load this rate. Try again.</div>
      ) : (
        <>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.accent }}><span style={{ fontFamily: T.mono, fontWeight: 500 }}>{data.code}</span>{isDrug ? " · drug" : ""}</div>
          <div style={{ fontSize: 13, color: T.ink2, marginBottom: 16, marginTop: 2 }}>{data.description} · {(data.plan && data.plan.name) || (plan && plan.name)} · service in {monthLabel(data.month || month)}</div>

          <VraCard data={data} />
          {data.plan && data.plan.source === "mrf" && <Timeline data={data} />}

          {vra != null && (targetVal != null || vraPctOfMed != null) && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 16 }}>
              {vra != null && targetVal != null && <Card label={targetLabel} value={price(targetVal)} sub={crossLoc && geoAdj && !isDrug ? "Boston rate, adjusted to Worcester" : null} />}
              {vraPctOfMed != null && <Card label="vs local Medicare" value={`${vraPctOfMed.toFixed(2)}×`} sub={`Medicare ${price(medLocal)}${isDrug ? " per unit" : ""}${medPer ? ` · ${medPer.short}` : ""}`} />}
            </div>
          )}

          {verdict && (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: softOf(verdict.c)[0], border: `1px solid ${softOf(verdict.c)[1]}`, borderRadius: T.r, padding: "10px 14px", marginBottom: 18 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: verdict.c, flexShrink: 0, marginTop: 6 }} />
              <span style={{ fontSize: 13, color: verdict.c, lineHeight: 1.5, fontWeight: 500 }}>{verdict.t}</span>
            </div>
          )}

          {vra != null && (targetVal != null || showVsMed) && (
            <>
              <Bar label="You (VRA)" val={vra} max={maxBar} color={S.blue} />
              {targetVal != null && <Bar label={targetLabel} val={targetVal} max={maxBar} color={S.gray} />}
              {showVsMed && <Bar label={isDrug ? "Medicare (ASP)" : "Medicare (Worcester)"} val={medLocal} max={maxBar} color={S.amber} />}
            </>
          )}

          {/* peers in the same payer network */}
          {peers.length > 0 && (
            <>
              <div className="vra-table" style={card({ marginTop: 16, overflow: "hidden" })}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 14px", background: T.paper, borderBottom: `1px solid ${T.line}`, fontSize: 12.5, color: T.muted, fontWeight: 500 }}>
                  <span>Other groups in the same file{vraObj && monthLabel(vraObj.source_month) ? ` (${monthLabel(vraObj.source_month)})` : ""}</span><span>Rate</span>
                </div>
                {peers.map((p, i) => {
                  const r = adj(p.rate, p.locality);
                  return (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, padding: "8px 14px", borderTop: i === 0 ? "none" : `1px solid ${T.line}` }}>
                      <span style={{ fontSize: 13.5, color: T.ink, minWidth: 0 }}>
                        {p.name}{p.locality ? <span style={{ color: T.muted, fontSize: 12 }}> · {LOCALITY[p.locality] || "—"}</span> : null}
                      </span>
                      {p.rate != null ? (
                        <span style={{ ...numCell, color: T.ink, whiteSpace: "nowrap" }}>{price(r)}{geoAdj && p.locality === "metro_boston" && !isDrug ? <span style={{ color: T.muted, fontSize: 11.5, fontFamily: T.sans }}> adj</span> : null}</span>
                      ) : (
                        <span style={{ fontSize: 12.5, color: T.muted, whiteSpace: "nowrap" }}>several prices</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 6, lineHeight: 1.5 }}>Each group's rate is the median of its doctors' office prices in the same file.</div>
            </>
          )}

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
                  At your rate of <b style={{ color: S.blue }}>{price(vra)}</b>: <b style={{ color: S.text }}>${(vra / rvu.total_nonfac_rvu).toFixed(2)}/RVU</b> · <b style={{ color: S.text }}>{(vra / rvu.medicare_natl_office).toFixed(2)}×</b> national Medicare
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
                    {price(margin.perUnit)}/unit · {upd} units/dose
                  </div>
                  {/* the margin uses today's vial price; flag it for an earlier service month */}
                  {data.drug_cost.as_of && data.month && String(data.drug_cost.as_of).slice(0, 7) > data.month && (
                    <div style={{ fontSize: 12.5, color: T.amber, marginTop: 6, lineHeight: 1.5 }}>
                      Acquisition cost is today's price, as of {dayLabel(data.drug_cost.as_of)}. A vial used in {monthLabel(data.month)} may have cost more or less.
                    </div>
                  )}
                </>
              ) : vra == null ? (
                <div style={{ fontSize: 13, color: T.muted }}>No single VRA rate for this plan, so no margin is shown.</div>
              ) : (
                <div style={{ fontSize: 13, color: T.muted }}>No acquisition cost entered yet for this drug — add it in <span style={{ fontFamily: S.mono }}>drug_costs</span> to see margin.</div>
              )}
            </div>
          )}

          <p style={{ fontSize: 12, color: T.muted, marginTop: 24, lineHeight: 1.6, fontFamily: T.sans }}>
            VRA's own published rates only (office, place of service 11). Medicare and MassHealth from their published fee schedules. No estimates.
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
            <span style={{ flex: 1, textAlign: "right" }}>Prior Q Medicare/dose</span>
            <span style={{ flex: 1, textAlign: "right" }}>Prior Q margin</span>
          </div>
          {[...drugEcon].sort((a, b) => Number(b.margin_per_dose) - Number(a.margin_per_dose)).map((d, i) => (
            <div key={d.code} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, padding: "8px 14px", borderTop: i === 0 ? "none" : `1px solid ${T.line}` }}>
              <span style={{ flex: 3, fontSize: 13.5, color: T.ink, paddingRight: 8, wordBreak: "break-word" }}>{d.drug_name}</span>
              <span style={{ flex: 1, ...numCell, color: T.ink2 }}>{money(Number(d.acq_cost))}</span>
              <span style={{ flex: 1, ...numCell, color: T.ink2 }}>{money(Number(d.medicare_per_dose))}</span>
              <span style={{ flex: 1, ...numCell, fontWeight: 500, color: Number(d.margin_per_dose) >= 0 ? T.green : T.red }}>{money(Number(d.margin_per_dose))}</span>
              <span style={{ flex: 1, ...numCell, color: T.ink2 }}>{d.prior_medicare_per_dose != null ? money(Number(d.prior_medicare_per_dose)) : "—"}</span>
              <span style={{ flex: 1, ...numCell, fontWeight: 500, color: d.prior_margin_per_dose == null ? T.muted : Number(d.prior_margin_per_dose) >= 0 ? T.green : T.red }}>{d.prior_margin_per_dose != null ? money(Number(d.prior_margin_per_dose)) : "—"}</span>
            </div>
          ))}
          <div style={{ fontSize: 12, color: T.muted, padding: "10px 14px", borderTop: `1px solid ${T.line}`, background: T.paper, lineHeight: 1.6 }}>
            Acquisition as of {drugEcon[0].acq_as_of} · Medicare ASP+6 as of {drugEcon[0].medicare_as_of} (current quarter){(() => { const p = drugEcon.find((r) => r.prior_medicare_from && r.prior_medicare_to); return p ? <> · Prior quarter Medicare {p.prior_medicare_from}–{p.prior_medicare_to} (prior Q margin = prior-quarter Medicare minus prior acquisition)</> : null; })()}. Buy-and-bill margin before 2% sequestration; commercial payers vary — use the picker above for a specific plan.
            <br /><span style={{ color: T.amber, fontWeight: 600 }}>Timing:</span> Medicare pays each drug at the rate for the quarter of the <b>injection date</b>, not the date the claim is paid. <b>Margin/dose</b> is the current quarter — use it for injections given now. <b>Prior Q</b> columns are last quarter's rate and margin — use them for last quarter's injections still being paid, so this month's receipts will track the Prior Q margin more closely. A vial bought at last quarter's price but injected this quarter earns the current Medicare rate minus last quarter's price.
          </div>
        </div>
        </>
      )}
    </Shell>
  );
}

function Shell({ children, embedded, onBack, onSignOut }) {
  return (
    <div style={embedded ? { fontFamily: T.sans, color: T.ink } : { minHeight: "100vh", background: T.paper, fontFamily: T.sans, color: T.ink }}>
      {!embedded && (
        <PageBar
          onBack={onBack}
          title="Rate Comparison"
          sub="VRA's published rates, plan by plan"
          topAccent={T.gold}
          right={onSignOut && <button onClick={onSignOut} style={btnSm("secondary", { color: T.ink2 })}>Sign out</button>}
        />
      )}
      <div className={embedded ? undefined : "vra-wrap"} style={embedded ? { padding: "4px 0 48px" } : wrap({ paddingTop: 22, paddingBottom: 48 })}>{children}</div>
    </div>
  );
}

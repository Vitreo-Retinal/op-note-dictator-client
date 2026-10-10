import { useEffect, useState } from "react";
import { T, chip } from "./theme.js";
import PageBar, { wrap } from "./PageBar.jsx";
import { ChevronRightIcon, ChevronDownIcon } from "./icons.jsx";
import { usePhone } from "./phone.jsx";

// ── Clinical Trials page (Oct 2026) ─────────────────────────────────
// Trials we run at VRA (scope "internal"; external trials are filtered out for
// now). One card per trial: acronym + status pill, indication, sponsor/phase/NCT
// line, who to flag candidates to, and collapsible inclusion / exclusion lists.
// Data: GET /api/trials (server lib/clinical-trials.js, Retina-Rx table
// clinical_trials). Trial-level data only — nothing patient-related.
// The auth token is attached by the fetch wrapper in main.jsx.
const API_BASE = import.meta.env.VITE_API_BASE || "https://op-note-dictator-server-production.up.railway.app";

/** GET /api/trials. Never throws — failures come back as { error }. Shared with ResearchHome. */
export async function fetchTrials() {
  try {
    const res = await fetch(`${API_BASE}/api/trials`);
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const data = await res.json();
    if (!data || !Array.isArray(data.trials)) return { error: "bad response" };
    if (data.error) return { error: data.error };
    return data;
  } catch {
    return { error: "network" };
  }
}

const card = { background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.rLg, overflow: "hidden", boxSizing: "border-box" };

// Status enum → label + pill tone. Order = display order on the page.
const STATUS = {
  enrolling: { label: "Enrolling", pill: chip("green") },
  screening_paused: { label: "Screening paused", pill: chip("amber") },
  follow_up_only: { label: "Follow-up only", pill: chip("accent") },
  closed_to_enrollment: { label: "Closed to enrollment", pill: chip("muted", { color: T.amber }) },
  completed: { label: "Completed", pill: chip("muted") },
};
const STATUS_ORDER = Object.keys(STATUS);
const statusRank = (s) => { const i = STATUS_ORDER.indexOf(s); return i === -1 ? STATUS_ORDER.length : i; };
// Unknown status → "some_new_value" → "Some new value".
const statusLabel = (s) => (STATUS[s] ? STATUS[s].label : String(s || "").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()));

const has = (v) => v !== null && v !== undefined && String(v).trim() !== "";
const list = (v) => (Array.isArray(v) ? v.filter(has).map(String) : []);
// "3" → "Phase 3"; "2 (long-term follow-up)" → "Phase 2 (long-term follow-up)"; "Phase 1b" unchanged.
const phaseText = (p) => (has(p) ? (/^\d/.test(String(p).trim()) ? `Phase ${String(p).trim()}` : String(p).trim()) : null);
// "2026-10-10" → "Oct 10, 2026" (read as a calendar date, no time-zone shift).
function reviewedText(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || ""));
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Collapsible criteria list (same disclosure look as the IntakeHpi cheat sheet).
function Criteria({ title, items }) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;
  return (
    <div style={{ borderTop: `1px solid ${T.line}` }}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        style={{ width: "100%", background: "none", border: "none", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: T.ink, fontFamily: T.sans, fontSize: 13.5, fontWeight: 600, textAlign: "left" }}>
        <span style={{ color: T.muted, display: "flex", flexShrink: 0 }}>{open ? <ChevronDownIcon size={15} /> : <ChevronRightIcon size={15} />}</span>
        {title}
        <span style={{ fontWeight: 400, color: T.muted }}>({items.length})</span>
        <span style={{ marginLeft: "auto", fontSize: 12.5, color: T.muted, fontWeight: 400 }}>{open ? "hide" : "show"}</span>
      </button>
      {open && (
        <ul style={{ margin: 0, padding: "10px 16px 12px 40px", background: T.paper, borderTop: `1px solid ${T.line}`, fontSize: 13.5, lineHeight: 1.5, color: T.ink }}>
          {items.map((it, i) => <li key={i} style={{ marginBottom: i === items.length - 1 ? 0 : 4 }}>{it}</li>)}
        </ul>
      )}
    </div>
  );
}

function TrialCard({ trial: t }) {
  const st = STATUS[t.status];
  const nct = has(t.nct_id) ? String(t.nct_id).trim() : null;
  const sep = <span style={{ color: T.lineStrong }}> · </span>;
  const meta = [
    has(t.sponsor) && <span key="s">{t.sponsor}</span>,
    phaseText(t.phase) && <span key="p">{phaseText(t.phase)}</span>,
    nct && <a key="n" href={`https://clinicaltrials.gov/study/${encodeURIComponent(nct)}`} target="_blank" rel="noopener noreferrer" style={{ color: T.accent, fontFamily: T.mono, fontSize: 12, textDecoration: "none" }}>{nct}</a>,
    has(t.site_number) && <span key="site">Site {t.site_number}</span>,
    has(t.pi) && <span key="pi">PI {t.pi}</span>,
  ].filter(Boolean);
  const reviewed = reviewedText(t.last_reviewed);

  return (
    <div style={card}>
      <div style={{ padding: "12px 16px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 16.5, fontWeight: 600, color: T.ink, letterSpacing: "-0.01em" }}>{t.acronym || t.slug}</span>
          <span style={st ? st.pill : chip("muted")}>{statusLabel(t.status)}</span>
          {t.criteria_verified === false && (
            <span style={chip("muted", { fontWeight: 400, fontSize: 11.5 })}>criteria pending coordinator verification</span>
          )}
        </div>
        {has(t.indication) && <div style={{ fontSize: 14, color: T.ink2, lineHeight: 1.45, marginTop: 4 }}>{t.indication}</div>}
        {meta.length > 0 && (
          <div style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.5, marginTop: 4 }}>
            {meta.map((m, i) => <span key={i}>{i > 0 && sep}{m}</span>)}
          </div>
        )}
        {has(t.flag_to) && (
          <div style={{ marginTop: 10, padding: "7px 12px", background: T.amberSoft, borderLeft: `3px solid ${T.gold}`, borderRadius: T.r, fontSize: 13.5, color: T.goldInk }}>
            Flag candidates to: <b style={{ fontWeight: 600, color: T.ink }}>{t.flag_to}</b>
          </div>
        )}
      </div>
      <Criteria title="Inclusion criteria" items={list(t.inclusion)} />
      <Criteria title="Exclusion criteria" items={list(t.exclusion)} />
      {(has(t.notes) || reviewed) && (
        <div style={{ borderTop: `1px solid ${T.line}`, padding: "8px 16px 10px", fontSize: 12, color: T.muted, lineHeight: 1.45 }}>
          {has(t.notes) && <div>{t.notes}</div>}
          {reviewed && <div style={{ marginTop: has(t.notes) ? 4 : 0 }}>Last reviewed {reviewed}</div>}
        </div>
      )}
    </div>
  );
}

/**
 * The trials list itself — intro line, loading / error / empty status, one
 * card per internal trial. Shared by this page and the Research home
 * (ResearchHome.jsx). `data` (optional): an already-fetched GET /api/trials
 * result (null = still loading); when omitted the board fetches its own.
 */
export function TrialsBoard({ data: given }) {
  const external = given !== undefined;
  const [own, setOwn] = useState(null); // null = loading

  useEffect(() => {
    if (external) return undefined;
    let alive = true;
    fetchTrials().then((d) => { if (alive) setOwn(d); });
    return () => { alive = false; };
  }, [external]);
  const data = external ? given : own;

  // Trials we run at VRA only; enrolling first, then by acronym.
  const trials = data && !data.error
    ? data.trials
      .filter((t) => t && t.scope === "internal")
      .sort((a, b) => statusRank(a.status) - statusRank(b.status) || String(a.acronym || "").localeCompare(String(b.acronym || "")))
    : [];

  const status = data === null
    ? <div style={{ fontSize: 13, color: T.muted, padding: "8px 0" }}>Loading…</div>
    : data.error ? <div style={{ fontSize: 13, color: T.muted, padding: "8px 0" }}>Trials unavailable — try again in a minute.</div>
      : !trials.length ? <div style={{ fontSize: 13, color: T.muted, padding: "8px 0" }}>No trials listed right now.</div> : null;

  return (
    <>
      <p style={{ fontSize: 13.5, color: T.ink2, margin: "0 0 14px", lineHeight: 1.45 }}>
        Trials we run at VRA. If a patient might qualify, flag them to the person named on the card.
      </p>
      {status}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {trials.map((t) => <TrialCard key={t.id || t.slug} trial={t} />)}
      </div>
    </>
  );
}

export default function TrialsPage({ onBack, backLabel = "Hub" }) {
  const { phone } = usePhone();
  return (
    <div style={{ minHeight: phone ? undefined : "100vh", background: T.paper, color: T.ink, fontFamily: T.sans }}>
      <PageBar onBack={onBack} backLabel={backLabel} title="Clinical Trials" sub={phone ? undefined : "Studies running at VRA"} />
      <div className="vra-wrap" style={phone ? { padding: "4px 16px 16px" } : wrap({ paddingTop: 20, paddingBottom: 40 })}>
        <TrialsBoard />
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { T, appBar, chip, secHead, SITE_TINTS, RESPONSIVE_CSS } from "./theme.js";
import { wrap } from "./PageBar.jsx";
import { TrialsBoard, fetchTrials } from "./TrialsPage.jsx";
import { fetchSchedule, scheduleOk } from "./lib/vraSchedule.js";
import { researchDays, groupVisits, visitStatus, shortDate, ymdOf, HIDDEN_STATUSES } from "./lib/research.js";
import { BackIcon, ChevronRightIcon } from "./icons.jsx";
import { usePhone } from "./phone.jsx";
import logo from "./vra-logo.png";

// ── Research home (Oct 2026) — the "Research" door on the role picker ─
// Open access (no PIN). Four parts, top to bottom:
//   1. Research today — the coordinators' site / hours for today + the next
//      three clinic days, from Nana's tech sheet via GET /api/schedule (the
//      server parses the sheet's "Research:" line and "research" assignments;
//      see lib/research.js). A day with no research staff says so.
//   2. Trials board — the same TrialsBoard the Clinical Trials page renders.
//   3. Participant visits — GET /api/trial-visits (Retina-Rx trial_visits),
//      grouped by trial. Participant STUDY IDs only — never patient names.
//   4. A muted "coming next" line (trials Ask is not in this build).
// The auth token is attached by the fetch wrapper in main.jsx.
const API_BASE = import.meta.env.VITE_API_BASE || "https://op-note-dictator-server-production.up.railway.app";

/** GET /api/trial-visits?all=1 (every status; the page hides withdrawn / screen-fail by default). Never throws. */
async function fetchTrialVisits() {
  try {
    const res = await fetch(`${API_BASE}/api/trial-visits?all=1`);
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const data = await res.json();
    if (!data || !Array.isArray(data.visits)) return { error: "bad response" };
    if (data.error) return { error: data.error };
    return data;
  } catch {
    return { error: "network" };
  }
}

const card = { background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.rLg, overflow: "hidden", boxSizing: "border-box" };
const muted = { fontSize: 13, color: T.muted };
const siteColor = (site) => (site && site !== "WORC" && SITE_TINTS[site] ? SITE_TINTS[site].text : T.ink2);

// ── 1. Research today ──
function CoordinatorBand({ sched, todayYmd, phone, onOpenSchedule }) {
  const loading = sched === null;
  const ok = scheduleOk(sched);
  const days = ok ? researchDays(sched, todayYmd, 3) : [];
  const [first, ...rest] = days;

  const staffLine = (d, big) => {
    if (d.closed) return <span style={{ color: T.amber, fontWeight: 500 }}>Office closed{d.closureName ? ` (${d.closureName})` : ""}</span>;
    const items = [
      ...d.staff.map((s) => (
        <span key={`s-${s.name}`} style={{ whiteSpace: phone ? "normal" : "nowrap" }}>
          <b style={{ fontWeight: 600, color: T.ink }}>{s.name}</b>
          {s.where && <span style={{ color: siteColor(s.site), fontWeight: 500 }}> · {s.where}</span>}
          {s.hours && <span style={{ color: T.ink2 }}> {s.hours}</span>}
          {s.note && <span style={{ color: T.muted, fontSize: big ? 12.5 : 12 }}> ({s.note})</span>}
        </span>
      )),
      ...d.away.map((a) => (
        <span key={`a-${a.name}`} style={{ whiteSpace: phone ? "normal" : "nowrap", color: T.red }}>{a.name} — {a.text}</span>
      )),
    ];
    if (!items.length) return <span style={{ color: T.muted }}>{d.empty}</span>;
    // Phone: one person per line (no separators to strand at a line start).
    if (phone) return items.map((it, i) => <div key={i} style={{ minWidth: 0, overflowWrap: "anywhere" }}>{it}</div>);
    return items.map((it, i) => <span key={i}>{i > 0 && <span style={{ color: T.lineStrong }}>{"  ·  "}</span>}{it}</span>);
  };

  return (
    <section style={{ ...card, borderTop: `3px solid ${T.accent}`, marginTop: phone ? 4 : 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, padding: phone ? "10px 12px 4px" : "14px 18px 4px", flexWrap: "wrap" }}>
        <h2 style={{ fontSize: phone ? 15 : 16, fontWeight: 600, color: T.accent, margin: 0, letterSpacing: "-0.01em" }}>Research today</h2>
        <span style={{ fontSize: 12.5, color: T.muted }}>From Nana's tech sheet</span>
        {onOpenSchedule && (
          <button type="button" onClick={onOpenSchedule}
            style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 2, background: "none", border: 0, padding: "2px 0", color: T.accent, fontFamily: T.sans, fontSize: 13, cursor: "pointer" }}>
            Full schedule <ChevronRightIcon size={14} />
          </button>
        )}
      </div>
      {!ok ? (
        <div style={{ ...muted, padding: phone ? "4px 12px 12px" : "6px 18px 16px" }}>{loading ? "Loading schedule…" : "Schedule unavailable — try again in a minute."}</div>
      ) : (
        <>
          {first && (
            <div style={{ padding: phone ? "4px 12px 10px" : "6px 18px 14px" }}>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 2 }}>{first.today ? `Today · ${shortDate(first.date)}` : first.label}</div>
              <div style={{ fontSize: phone ? 15 : 16, lineHeight: 1.5, display: "flex", flexDirection: phone ? "column" : "row", flexWrap: "wrap", columnGap: 4, minWidth: 0 }}>{staffLine(first, true)}</div>
              {first.sheetNote && <div style={{ fontSize: 12.5, color: T.muted, marginTop: 2 }}>Sheet: {first.sheetNote}</div>}
            </div>
          )}
          {rest.length > 0 && (
            <div style={{ borderTop: `1px solid ${T.line}`, background: T.paper }}>
              {rest.map((d, i) => (
                <div key={d.date} style={{ display: "flex", alignItems: "baseline", gap: 12, padding: phone ? "7px 12px" : "7px 18px", borderTop: i ? `1px solid ${T.line}` : 0, fontSize: 13.5, minWidth: 0 }}>
                  <span style={{ width: phone ? 76 : 96, flex: "none", fontSize: 12.5, color: T.muted }}>{d.label}</span>
                  <span style={{ flex: 1, minWidth: 0, lineHeight: 1.45, display: "flex", flexDirection: phone ? "column" : "row", flexWrap: "wrap", columnGap: 4 }}>
                    {staffLine(d, false)}
                    {d.sheetNote && <span style={{ color: T.muted, fontSize: 12 }}>{phone ? "" : "  ·  "}Sheet: {d.sheetNote}</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ── 3. Participant visits ──
function VisitRow({ v, todayYmd, phone, first }) {
  const st = visitStatus(v.status);
  const isToday = v.visit_date === todayYmd;
  const date = v.visit_date ? (isToday ? "Today" : shortDate(v.visit_date)) : "Date TBD";
  const dateEl = <span style={{ color: isToday ? T.accent : v.visit_date ? T.ink : T.muted, fontWeight: isToday ? 600 : 400, whiteSpace: "nowrap" }}>{date}</span>;
  const pill = <span style={chip(st.tone)}>{st.label}</span>;
  const id = <span style={{ fontFamily: T.mono, fontSize: 12.5, color: T.ink, whiteSpace: "nowrap" }}>{v.participant_id}</span>;
  const site = v.site ? <span style={{ color: siteColor(v.site), fontWeight: 500 }}>{v.site}</span> : <span style={{ color: T.lineStrong }}>—</span>;
  const border = first ? 0 : `1px solid ${T.line}`;
  if (phone) {
    return (
      <div style={{ padding: "8px 12px", borderTop: border, fontSize: 13.5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {id}<span style={{ color: T.ink2, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.visit_label || "Visit"}</span>
          <span style={{ marginLeft: "auto", flex: "none" }}>{pill}</span>
        </div>
        <div style={{ fontSize: 12.5, color: T.muted, marginTop: 2, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {dateEl}{v.visit_window && <span>· window {v.visit_window}</span>}<span>·</span>{site}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px minmax(0,1.3fr) 110px minmax(0,1fr) 64px 118px", gap: 12, alignItems: "center", padding: "8px 16px", borderTop: border, fontSize: 13.5 }}>
      {id}
      <span style={{ color: T.ink, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.visit_label || <span style={{ color: T.muted }}>Visit</span>}</span>
      {dateEl}
      <span style={{ color: v.visit_window ? T.ink2 : T.lineStrong, fontSize: 13, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.visit_window || "—"}</span>
      {site}
      <span>{pill}</span>
    </div>
  );
}

function ParticipantVisits({ data, trials, todayYmd, phone }) {
  const [showHidden, setShowHidden] = useState(false);
  const loading = data === null;
  const rows = data && !data.error ? data.visits : [];
  const groups = groupVisits(rows, trials, { showHidden });
  const hiddenTotal = rows.filter((v) => v && HIDDEN_STATUSES.includes(v.status)).length;
  const shown = groups.reduce((n, g) => n + g.visits.length, 0);

  let body;
  if (loading) body = <div style={{ ...muted, padding: "8px 0" }}>Loading…</div>;
  else if (data.error) body = <div style={{ ...muted, padding: "8px 0" }}>Visits unavailable — try again in a minute.</div>;
  else if (!rows.length) {
    body = (
      <div style={{ ...card, padding: "14px 16px", fontSize: 13.5, color: T.ink2, lineHeight: 1.45 }}>
        No visits entered yet — forward Nana's or Amy's visit list and they'll appear here.
      </div>
    );
  } else {
    body = (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {groups.map((g) => (
          <div key={g.key || "none"} style={card}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, padding: phone ? "9px 12px" : "10px 16px", background: T.accentSoft, borderBottom: `1px solid ${T.line}` }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: T.ink, letterSpacing: "-0.01em" }}>{g.label}</span>
              <span style={{ fontSize: 12.5, color: T.muted }}>{g.visits.length} visit{g.visits.length === 1 ? "" : "s"}{g.hidden ? ` · ${g.hidden} withdrawn / screen-fail hidden` : ""}</span>
            </div>
            {!phone && g.visits.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "120px minmax(0,1.3fr) 110px minmax(0,1fr) 64px 118px", gap: 12, padding: "6px 16px", fontSize: 11.5, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", color: T.muted, borderBottom: `1px solid ${T.line}` }}>
                <span>Study ID</span><span>Visit</span><span>Date</span><span>Window</span><span>Site</span><span>Status</span>
              </div>
            )}
            {g.visits.map((v, i) => (
              <VisitRow key={v.id || `${v.participant_id}|${v.visit_label}|${v.visit_date}|${i}`} v={v} todayYmd={todayYmd} phone={phone} first={i === 0} />
            ))}
            {!g.visits.length && <div style={{ ...muted, padding: "8px 16px" }}>No active visits.</div>}
          </div>
        ))}
        {!shown && hiddenTotal > 0 && !showHidden && <div style={muted}>Only withdrawn / screen-fail visits on file.</div>}
      </div>
    );
  }

  return (
    <section>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", margin: phone ? "18px 0 4px" : "30px 0 4px" }}>
        <h2 style={secHead({ margin: 0 })}>Participant visits</h2>
        {hiddenTotal > 0 && (
          <button type="button" onClick={() => setShowHidden((x) => !x)} aria-pressed={showHidden}
            style={{ marginLeft: "auto", background: "none", border: 0, padding: "2px 0", color: T.accent, fontFamily: T.sans, fontSize: 13, cursor: "pointer" }}>
            {showHidden ? "Hide withdrawn / screen-fail" : `Show withdrawn / screen-fail (${hiddenTotal})`}
          </button>
        )}
      </div>
      <div style={{ fontSize: 12.5, color: T.muted, margin: "0 0 12px" }}>Participant study IDs only — no patient names in the hub.</div>
      {body}
    </section>
  );
}

/** Props: onSwitch (back to the role picker), onOpenSchedule (Schedule page). */
export default function ResearchHome({ onSwitch, onOpenSchedule }) {
  const { phone } = usePhone();
  const [sched, setSched] = useState(null);   // null = loading
  const [trials, setTrials] = useState(null); // GET /api/trials result, shared with TrialsBoard
  const [visits, setVisits] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchSchedule(14).then((d) => { if (alive) setSched(d); });
    fetchTrials().then((d) => { if (alive) setTrials(d); });
    fetchTrialVisits().then((d) => { if (alive) setVisits(d); });
    return () => { alive = false; };
  }, []);

  const now = new Date();
  const todayYmd = ymdOf(now);
  const todayWords = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const trialRows = trials && !trials.error ? trials.trials : [];

  const changeView = (
    <button type="button" onClick={onSwitch}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, height: phone ? 34 : 32, padding: "0 12px 0 8px", borderRadius: 8, border: `1px solid ${T.line}`, background: T.surface, color: T.accent, fontFamily: T.sans, fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
      <BackIcon /> Change view
    </button>
  );

  return (
    <div style={{ minHeight: phone ? undefined : "100vh", background: T.paper, fontFamily: T.sans, color: T.ink }}>
      <style>{RESPONSIVE_CSS}</style>
      {phone ? (
        <div style={{ padding: "10px 16px 0" }}>
          {changeView}
          <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.25, color: T.ink, margin: "8px 0 0" }}>Research</h1>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 1, marginBottom: 8 }}>{todayWords}</div>
        </div>
      ) : (
        <header className="vra-bar" style={appBar}>
          <img src={logo} alt="Vitreo-Retinal Associates" style={{ height: 48, width: "auto", display: "block" }} />
          <span style={{ width: 1, height: 22, background: T.line, flexShrink: 0 }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, whiteSpace: "nowrap" }}>Research</div>
          <div className="vra-bar-hide" style={{ fontSize: 13, color: T.muted, whiteSpace: "nowrap" }}>Trials, visits, coordinators</div>
          <div style={{ flex: 1 }} />
          <div className="vra-bar-hide" style={{ fontSize: 13, color: T.ink2, whiteSpace: "nowrap" }}>{todayWords}</div>
          {changeView}
        </header>
      )}

      <div className="vra-wrap" style={phone ? { padding: "0 16px 16px" } : wrap({ paddingBottom: 40 })}>
        <CoordinatorBand sched={sched} todayYmd={todayYmd} phone={phone} onOpenSchedule={onOpenSchedule} />

        <h2 style={secHead(phone ? { margin: "18px 0 10px" } : {})}>Trials</h2>
        <TrialsBoard data={trials} />

        <ParticipantVisits data={visits} trials={trialRows} todayYmd={todayYmd} phone={phone} />

        <p style={{ color: T.muted, fontSize: 12.5, margin: phone ? "18px 0 8px" : "32px 0 0", padding: "8px 12px", border: `1px dashed ${T.line}`, borderRadius: T.r }}>
          Ask AI for trials is coming once the seeded criteria are verified.
        </p>
        {!phone && (
          <p style={{ color: T.muted, fontSize: 12, margin: "28px 0 32px" }}>
            Vitreo-Retinal Associates · No patient information is stored by these tools.
          </p>
        )}
      </div>
    </div>
  );
}

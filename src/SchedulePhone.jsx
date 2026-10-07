import { T, SITE_TINTS, TRANSLATOR, doctorColor } from "./theme.js";
import { dateOfYmd, shortDate, sessionsBySite, translatorOf, valedaOf } from "./lib/vraSchedule.js";

// ── Schedule, phone layout (Oct 2026) ───────────────────────────────
// One day at a time (the picked date, default today): on call, doctors per
// site, techs per site, translator + Valeda, then the next five weekdays'
// on-call doctor. Everything comes from GET /api/schedule; nothing is filled
// in when the API has no value.

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SITE_NAME = { WORC: "Worcester", LEOM: "Leominster" };

// Tech rows shown per site card; Imaging only when someone has it.
const ROWS = [
  { key: "back", label: "Back", always: true },
  { key: "workup", label: "Workup", always: true },
  { key: "phone", label: "Phone", always: true },
  { key: "admin", label: "Admin", always: true },
  { key: "imaging", label: "Imaging" },
];

const secH = { display: "flex", alignItems: "baseline", justifyContent: "space-between", fontSize: 11.5, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: T.muted, margin: "14px 0 6px" };
const secNote = { textTransform: "none", letterSpacing: 0, fontWeight: 400, fontSize: 11.5 };
const cardS = { background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.rLg };
const lbl = { fontSize: 11.5, color: T.muted };
const muted = { fontSize: 13, color: T.muted };

export function Pill({ doctor, half }) {
  const c = doctorColor(doctor);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 24, padding: "0 9px", borderRadius: 999, background: c.soft, color: c.fg, fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", flex: "none" }}>
      {doctor}
      {half && <small style={{ fontSize: 10, fontWeight: 500, opacity: 0.8 }}>{half}</small>}
    </span>
  );
}

// "A, B" when AM and PM match; "A / C" otherwise; "—" for an empty half.
function halves(am, pm) {
  const a = (am || []).join(", "), p = (pm || []).join(", ");
  if (!a && !p) return null;
  if (a === p) return a;
  return `${a || "—"} / ${p || "—"}`;
}

function SiteTechs({ site, roles }) {
  const half = roles[site] || { AM: {}, PM: {} };
  const tint = SITE_TINTS[site] || SITE_TINTS.WORC;
  const rows = ROWS.filter((r) => r.always || (half.AM[r.key] || []).length || (half.PM[r.key] || []).length);
  return (
    <div style={{ borderRadius: T.rLg, overflow: "hidden", background: tint.bg, border: `1px solid ${tint.line}`, minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 600, padding: "5px 10px", background: tint.head, color: site === "LEOM" ? tint.text : T.ink2, borderBottom: `1px solid ${tint.line}` }}>
        {site} <span style={{ fontWeight: 400, fontSize: 11, color: T.muted }}>{SITE_NAME[site]}</span>
      </div>
      <div style={{ padding: "3px 0 6px" }}>
        {rows.map((r) => {
          const v = halves(half.AM[r.key], half.PM[r.key]);
          return (
            <div key={r.key} style={{ display: "flex", gap: 6, padding: "3px 10px", fontSize: 12.5, lineHeight: 1.35 }}>
              <b style={{ width: 52, flex: "none", fontWeight: 500, color: T.muted, fontSize: 11.5, paddingTop: 1 }}>{r.label}</b>
              <span style={{ minWidth: 0, color: v ? (r.key === "back" ? T.accent : T.ink) : T.lineStrong, fontWeight: r.key === "back" && v ? 600 : 400, overflowWrap: "anywhere" }}>{v || "—"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SchedulePhone({ sched, day, todayYmd }) {
  const onCall = day.onCall || null;
  const sites = sessionsBySite(day.sessions).filter((x) => x.site !== "VALEDA");
  const t = day.techs || null;
  const tr = translatorOf(t);
  const valeda = valedaOf(day);

  // Next five weekdays after the shown day (weekends only when they carry
  // sessions or a closure, as on desktop).
  const idx = sched.days.indexOf(day);
  const next = sched.days.slice(idx + 1).filter((d) => {
    const w = dateOfYmd(d.date).getDay();
    return (w !== 0 && w !== 6) || d.sessions.length > 0 || d.closed;
  }).slice(0, 5);

  const updated = sched.generatedAt
    ? new Date(sched.generatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <div style={{ padding: "0 16px 20px", fontFamily: T.sans, color: T.ink }}>
      {/* Closure — as on desktop */}
      {day.closed && (
        <div style={{ marginTop: 10, padding: "9px 12px", borderRadius: T.r, background: T.amberSoft, color: T.amber, fontSize: 13.5, fontWeight: 600 }}>
          Closed{day.closureName ? ` — ${day.closureName}` : ""}
        </div>
      )}

      {/* On call */}
      <div style={secH}>On call</div>
      <div style={{ ...cardS, display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ padding: "9px 12px", minHeight: 56, display: "flex", flexDirection: "column", justifyContent: "center", gap: 3 }}>
          <span style={lbl}>Doctor</span>
          {onCall && onCall.doctor ? <span><Pill doctor={onCall.doctor} /></span> : <span style={muted}>—</span>}
          {onCall && onCall.doctorThrough && onCall.doctorThrough !== day.date && <span style={{ ...lbl, fontSize: 11 }}>through {shortDate(onCall.doctorThrough)}</span>}
        </div>
        <div style={{ padding: "9px 12px", minHeight: 56, display: "flex", flexDirection: "column", justifyContent: "center", gap: 3, borderLeft: `1px solid ${T.line}` }}>
          <span style={lbl}>Tech</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: onCall && onCall.tech ? T.ink : T.muted }}>{(onCall && onCall.tech) || "—"}</span>
        </div>
      </div>

      {/* Doctors at each site */}
      <div style={secH}>{day.date === todayYmd ? "Doctors today" : "Doctors"}</div>
      <div style={cardS}>
        {sites.map(({ site, docs }, i) => (
          <div key={site} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", minHeight: 44, borderTop: i ? `1px solid ${T.line}` : 0 }}>
            <span style={{ width: 52, fontSize: 12, fontWeight: 600, color: T.ink2, flex: "none" }}>{site}</span>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {docs.map((d) => <Pill key={d.doctor} doctor={d.doctor} half={d.half} />)}
            </div>
          </div>
        ))}
        {!sites.length && <div style={{ padding: "12px", ...muted }}>{day.closed ? "Office closed" : "No clinic sessions"}</div>}
        {day.vacations.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderTop: `1px solid ${T.line}`, fontSize: 12.5, color: T.muted }}>
            <span style={{ width: 52, fontSize: 12, fontWeight: 600, flex: "none" }}>Out</span>
            <span style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {day.vacations.map((d) => <span key={d} style={{ display: "inline-flex", alignItems: "center", height: 24, padding: "0 9px", borderRadius: 999, background: T.paper, border: `1px solid ${T.line}`, color: T.muted, fontSize: 12.5, fontWeight: 600 }}>{d}</span>)}
            </span>
          </div>
        )}
      </div>

      {/* Techs */}
      <div style={secH}>{day.date === todayYmd ? "Techs today" : "Techs"} <span style={secNote}>AM / PM</span></div>
      {!t && <div style={{ ...cardS, padding: 12, ...muted }}>No tech sheet for this day.</div>}
      {t && t.roles && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
          <SiteTechs site="WORC" roles={t.roles} />
          <SiteTechs site="LEOM" roles={t.roles} />
        </div>
      )}
      {t && !t.roles && (
        // Older server (no structured roles): Back lines only.
        <div style={{ ...cardS, padding: "8px 12px", fontSize: 12.5, lineHeight: 1.6 }}>
          <div><b style={{ fontWeight: 600 }}>WORC Back</b> {halves(t.worcesterBackAM, t.worcesterBackPM) || "—"}</div>
          <div><b style={{ fontWeight: 600 }}>LEOM Back</b> {halves(t.leominsterBackAM, t.leominsterBackPM) || "—"}</div>
        </div>
      )}
      {(tr || valeda) && (
        <div style={{ display: "grid", gridTemplateColumns: tr && valeda ? "1fr 1fr" : "1fr", gap: 8, marginTop: 8 }}>
          {tr && (
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "2px 8px", padding: "7px 12px", minHeight: 36, borderRadius: 8, background: TRANSLATOR.bg, color: TRANSLATOR.fg, fontSize: 12.5 }}>
              <b style={{ fontWeight: 600 }}>Translator</b>
              <span>{tr.raw ? tr.raw : tr.same ? tr.am : `${tr.am} / ${tr.pm}`}</span>
            </div>
          )}
          {valeda && (
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "2px 8px", padding: "6px 12px", minHeight: 36, borderRadius: 8, background: T.surface, border: `1px solid ${T.line}`, color: T.ink2, fontSize: 12.5 }}>
              <b style={{ fontWeight: 600 }}>Valeda</b>
              {valeda.docs.map((d) => <Pill key={d.doctor} doctor={d.doctor} half={d.half} />)}
              {valeda.techs.map((x) => <span key={x.name}>{x.name}{x.half ? <small style={{ fontSize: 10, color: T.muted }}> {x.half}</small> : null}</span>)}
            </div>
          )}
        </div>
      )}
      {t && t.off && t.off.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 12.5, color: T.ink2 }}><b style={{ fontWeight: 600 }}>Off</b> {t.off.join(", ")}</div>
      )}

      {/* Next days */}
      {next.length > 0 && (
        <>
          <div style={secH}>Next days <span style={secNote}>on call</span></div>
          <div style={{ ...cardS, display: "grid", gridTemplateColumns: `repeat(${next.length}, 1fr)` }}>
            {next.map((d, i) => {
              const dt = dateOfYmd(d.date);
              const who = d.onCall && d.onCall.doctor;
              return (
                <div key={d.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, minHeight: 62, padding: "6px 2px", borderLeft: i ? `1px solid ${T.line}` : 0, fontSize: 11.5, color: T.muted, background: d.closed ? T.amberSoft : "transparent" }}>
                  <span><b style={{ color: T.ink, fontWeight: 600, fontSize: 12 }}>{DOW[dt.getDay()]}</b> {dt.getDate()}</span>
                  {d.closed
                    ? <span style={{ fontSize: 11, fontWeight: 600, color: T.amber }}>Closed</span>
                    : who ? <Pill doctor={who} /> : <span>—</span>}
                </div>
              );
            })}
          </div>
        </>
      )}

      <p style={{ color: T.muted, fontSize: 12, margin: "14px 0 0" }}>
        {updated ? `Updated ${updated} · ` : ""}source: VRA Google Calendar
      </p>
    </div>
  );
}

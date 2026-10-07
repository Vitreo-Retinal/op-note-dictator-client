import { T, SITE_TINTS, TRANSLATOR, doctorColor } from "./theme.js";
import { dateOfYmd, shortDate, sessionsBySite, translatorOf, valedaOf, managersOf, frontDeskOf } from "./lib/vraSchedule.js";

// ── Schedule, phone layout (Oct 2026) ───────────────────────────────
// One day at a time, sized to fit one screen: on call (one row), doctors per
// site, techs folded per site (tap opens the role rows), translator + Valeda,
// then five next-day tiles (tap one to show that day). Everything comes from GET /api/schedule; nothing is filled
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

const secH = { display: "flex", alignItems: "baseline", justifyContent: "space-between", fontSize: 11.5, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: T.muted, margin: "10px 0 5px" };
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

// Distinct names in one role across AM and PM.
function roleCount(half, key) {
  return new Set([...(half.AM[key] || []), ...(half.PM[key] || [])]).size;
}

/**
 * Doctors at each site for one day (one row per site, doctor pills, then an
 * "Out" row for vacations). Shared by the phone Schedule and the phone Home.
 */
export function DoctorsCard({ day, style }) {
  const sites = sessionsBySite(day.sessions).filter((x) => x.site !== "VALEDA");
  return (
    <div style={{ ...cardS, ...style }}>
      {sites.map(({ site, docs }, i) => (
        <div key={site} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 12px", minHeight: 36, boxSizing: "border-box", borderTop: i ? `1px solid ${T.line}` : 0 }}>
          <span style={{ width: 52, fontSize: 12, fontWeight: 600, color: T.ink2, flex: "none" }}>{site}</span>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {docs.map((d) => <Pill key={d.doctor} doctor={d.doctor} half={d.half} />)}
          </div>
        </div>
      ))}
      {!sites.length && <div style={{ padding: "8px 12px", ...muted }}>{day.closed ? "Office closed" : "No clinic sessions"}</div>}
      {day.vacations.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 12px", minHeight: 36, boxSizing: "border-box", borderTop: `1px solid ${T.line}`, fontSize: 12.5, color: T.muted }}>
          <span style={{ width: 52, fontSize: 12, fontWeight: 600, flex: "none" }}>Out</span>
          <span style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {day.vacations.map((d) => <span key={d} style={{ display: "inline-flex", alignItems: "center", height: 24, padding: "0 9px", borderRadius: 999, background: T.paper, border: `1px solid ${T.line}`, color: T.muted, fontSize: 12.5, fontWeight: 600 }}>{d}</span>)}
          </span>
        </div>
      )}
    </div>
  );
}

// One folded row (tap to open in place). `children` render when open.
function Fold({ id, open, onToggle, title, summary, tint, children }) {
  const isOpen = open.has(id);
  return (
    <div style={{ borderRadius: T.rLg, overflow: "hidden", background: tint ? tint.bg : T.surface, border: `1px solid ${tint ? tint.line : T.line}`, marginBottom: 8 }}>
      <button type="button" onClick={() => onToggle(id)} aria-expanded={isOpen}
        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", minHeight: 40, padding: "0 12px", background: "transparent", border: 0, fontFamily: T.sans, color: T.ink, textAlign: "left", cursor: "pointer" }}>
        <span style={{ fontSize: 13, fontWeight: 600, flex: "none", color: tint && tint.title ? tint.title : T.ink }}>{title}</span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, lineHeight: 1.3, padding: "4px 0", color: T.muted, textAlign: "right" }}>{summary}</span>
        <span aria-hidden="true" style={{ fontSize: 11, color: T.muted, flex: "none", transform: isOpen ? "rotate(180deg)" : "none" }}>▾</span>
      </button>
      {isOpen && <div style={{ borderTop: `1px solid ${tint ? tint.line : T.line}`, padding: "4px 0 6px" }}>{children}</div>}
    </div>
  );
}

function TechRows({ half }) {
  const rows = ROWS.filter((r) => r.always || (half.AM[r.key] || []).length || (half.PM[r.key] || []).length);
  return rows.map((r) => {
    const v = halves(half.AM[r.key], half.PM[r.key]);
    return (
      <div key={r.key} style={{ display: "flex", gap: 6, padding: "3px 12px", fontSize: 12.5, lineHeight: 1.35 }}>
        <b style={{ width: 62, flex: "none", fontWeight: 500, color: T.muted, fontSize: 11.5, paddingTop: 1 }}>{r.label}</b>
        <span style={{ flex: 1, minWidth: 0, color: v ? (r.key === "back" ? T.accent : T.ink) : T.lineStrong, fontWeight: r.key === "back" && v ? 600 : 400, overflowWrap: "anywhere" }}>{v || "—"}</span>
      </div>
    );
  });
}

const FOLD_TINT = {
  WORC: { bg: SITE_TINTS.WORC.bg, line: SITE_TINTS.WORC.line },
  LEOM: { bg: SITE_TINTS.LEOM.bg, line: SITE_TINTS.LEOM.line, title: SITE_TINTS.LEOM.text },
};

/**
 * Phone schedule, one screen (Oct 2026). Props:
 *  sched, day, todayYmd — the loaded range and the selected day
 *  tiles — next-days tiles [{ date, closed, onCall }] (from the anchor date's load)
 *  selected — selected date (highlights its tile); onPick(ymd) — tile tap
 *  open, onToggle — expanded tech folds (kept by the page)
 */
export default function SchedulePhone({ day, tiles, selected, onPick, open, onToggle }) {
  const onCall = day.onCall || null;
  const t = day.techs || null;
  const tr = translatorOf(t);
  const valeda = valedaOf(day);
  const off = (t && t.off) || [];
  const managers = managersOf(day);
  const frontDesk = frontDeskOf(day);
  const mgrTone = { in: T.ink, vacation: T.amber, out: T.muted };

  const siteSummary = (site) => {
    const half = (t.roles && t.roles[site]) || { AM: {}, PM: {} };
    const parts = ROWS.map((r) => [r.label, roleCount(half, r.key)]).filter(([, n]) => n > 0).map(([l, n]) => `${l}\u00a0${n}`);
    return { half, text: parts.join(" · ") || "—" };
  };

  // Third fold: translator, Valeda, off.
  const extraTitle = [tr && "Translator", valeda && "Valeda", off.length && "Off"].filter(Boolean).join(" · ");
  const extraSummary = [
    tr && (tr.raw ? tr.raw : tr.same ? tr.am : `${tr.am} / ${tr.pm}`),
    valeda && [...valeda.docs.map((d) => d.doctor), ...valeda.techs.map((x) => x.name)].join(", "),
    off.length && `Off ${off.join(", ")}`,
  ].filter(Boolean).join(" · ");

  // Managers / Front desk — compact row card, one person per line.
  const staffCard = (label, people) => people.length > 0 && (
    <div style={{ ...cardS, display: "flex", alignItems: "flex-start", gap: 8, minHeight: 38, padding: "8px 12px", marginTop: 8, boxSizing: "border-box" }}>
      <span style={{ ...lbl, flex: "none", width: 64 }}>{label}</span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2, fontSize: 13 }}>
        {people.map((m) => (
          <span key={m.name} style={{ overflowWrap: "anywhere", color: m.tone === "in" && m.site && m.site !== "WORC" && SITE_TINTS[m.site] ? SITE_TINTS[m.site].text : mgrTone[m.tone] || T.ink, fontWeight: m.tone === "vacation" || (m.site && m.site !== "WORC") ? 600 : 500 }}>{m.text}</span>
        ))}
      </span>
    </div>
  );

  return (
    <div style={{ padding: "0 16px 12px", fontFamily: T.sans, color: T.ink }}>
      {/* Closure — compact */}
      {day.closed && (
        <div style={{ marginBottom: 8, padding: "6px 12px", borderRadius: T.r, background: T.amberSoft, color: T.amber, fontSize: 13, fontWeight: 600 }}>
          Closed{day.closureName ? ` — ${day.closureName}` : ""}
        </div>
      )}

      {/* On call — one row */}
      <div style={{ ...cardS, display: "flex", alignItems: "center", gap: 8, minHeight: 38, padding: "4px 12px", flexWrap: "wrap" }}>
        <span style={lbl}>On call</span>
        {onCall && onCall.doctor ? <Pill doctor={onCall.doctor} /> : <span style={muted}>—</span>}
        {onCall && onCall.doctorThrough && onCall.doctorThrough !== day.date && <span style={{ ...lbl, fontSize: 11.5 }}>through {shortDate(onCall.doctorThrough)}</span>}
        <span style={{ flex: 1 }} />
        <span style={lbl}>Tech</span>
        <b style={{ fontSize: 13.5, fontWeight: 600, color: onCall && onCall.tech ? T.ink : T.muted }}>{(onCall && onCall.tech) || "—"}</b>
      </div>

      {/* Managers, then Front desk — compact row cards */}
      {staffCard("Managers", managers)}
      {staffCard("Front desk", frontDesk)}

      {/* Doctors at each site */}
      <div style={secH}>Doctors</div>
      <DoctorsCard day={day} />

      {/* Techs — one folded row per site */}
      <div style={secH}>Techs {t && t.roles && <span style={secNote}>tap to open · AM / PM</span>}</div>
      {!t && <div style={{ ...cardS, padding: "8px 12px", marginBottom: 8, ...muted }}>No tech sheet for this day.</div>}
      {t && t.roles && ["WORC", "LEOM"].map((site) => {
        const { half, text } = siteSummary(site);
        return (
          <Fold key={site} id={site} open={open} onToggle={onToggle} tint={FOLD_TINT[site]}
            title={<>{site} <span style={{ fontWeight: 600 }}>{SITE_NAME[site]}</span></>} summary={text}>
            <TechRows half={half} />
          </Fold>
        );
      })}
      {t && !t.roles && (
        // Older server (no structured roles): Back lines only.
        <div style={{ ...cardS, padding: "6px 12px", marginBottom: 8, fontSize: 12.5, lineHeight: 1.6 }}>
          <div><b style={{ fontWeight: 600 }}>WORC Back</b> {halves(t.worcesterBackAM, t.worcesterBackPM) || "—"}</div>
          <div><b style={{ fontWeight: 600 }}>LEOM Back</b> {halves(t.leominsterBackAM, t.leominsterBackPM) || "—"}</div>
        </div>
      )}
      {extraTitle && (
        <Fold id="extra" open={open} onToggle={onToggle} title={extraTitle} summary={extraSummary}>
          {tr && (
            <div style={{ display: "flex", gap: 6, padding: "3px 12px", fontSize: 12.5, lineHeight: 1.35 }}>
              <b style={{ width: 62, flex: "none", fontWeight: 500, color: TRANSLATOR.fg, fontSize: 11.5, paddingTop: 1 }}>Translator</b>
              <span style={{ flex: 1, minWidth: 0, color: TRANSLATOR.fg }}>{tr.raw ? tr.raw : tr.same ? tr.am : `${tr.am} / ${tr.pm}`}</span>
            </div>
          )}
          {valeda && (
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px 6px", padding: "3px 12px", fontSize: 12.5, color: T.ink2 }}>
              <b style={{ width: 62, flex: "none", fontWeight: 500, color: T.muted, fontSize: 11.5 }}>Valeda</b>
              {valeda.docs.map((d) => <Pill key={d.doctor} doctor={d.doctor} half={d.half} />)}
              {valeda.techs.map((x) => <span key={x.name}>{x.name}{x.half ? <small style={{ fontSize: 10, color: T.muted }}> {x.half}</small> : null}</span>)}
            </div>
          )}
          {off.length > 0 && (
            <div style={{ display: "flex", gap: 6, padding: "3px 12px", fontSize: 12.5, lineHeight: 1.35 }}>
              <b style={{ width: 62, flex: "none", fontWeight: 500, color: T.muted, fontSize: 11.5, paddingTop: 1 }}>Off</b>
              <span style={{ flex: 1, minWidth: 0, color: T.ink2 }}>{off.join(", ")}</span>
            </div>
          )}
        </Fold>
      )}

      {/* Next days — tap a tile to show that day */}
      {tiles && tiles.length > 0 && (
        <>
          <div style={secH}>Next days <span style={secNote}>on call</span></div>
          <NextDaysStrip tiles={tiles} selected={selected} onPick={onPick} />
        </>
      )}
    </div>
  );
}

/** The five next-day tiles (weekday + on-call doctor). Shared with the Front desk phone Home. */
export function NextDaysStrip({ tiles, selected, onPick, style }) {
  return (
    <div style={{ ...cardS, display: "grid", gridTemplateColumns: `repeat(${tiles.length}, 1fr)`, overflow: "hidden", ...style }}>
      {tiles.map((d, i) => {
        const dt = dateOfYmd(d.date);
        const who = d.onCall && d.onCall.doctor;
        const sel = d.date === selected;
        return (
          <button type="button" key={d.date} onClick={() => onPick(d.date)} aria-pressed={sel}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, minHeight: 48, padding: "4px 2px", border: 0, borderLeft: i ? `1px solid ${T.line}` : 0, boxShadow: sel ? `inset 0 0 0 2px ${T.accent}` : "none", fontFamily: T.sans, fontSize: 12, cursor: "pointer", color: T.ink2, background: sel ? T.accentSoft : "transparent" }}>
            <b style={{ color: sel ? T.accent : T.ink, fontWeight: 600, fontSize: 12.5 }}>{DOW[dt.getDay()]} {dt.getDate()}</b>
            {d.closed
              ? <span style={{ fontSize: 11.5, fontWeight: 500, color: T.amber }}>Closed</span>
              : <span>{who || "—"}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Next five weekdays after `ymd` in a loaded range (weekends only when they carry sessions or a closure). */
export function nextTiles(sched, ymd) {
  return sched.days.filter((d) => {
    if (d.date <= ymd) return false;
    const w = dateOfYmd(d.date).getDay();
    return (w !== 0 && w !== 6) || d.sessions.length > 0 || d.closed;
  }).slice(0, 5).map((d) => ({ date: d.date, closed: d.closed, onCall: d.onCall }));
}

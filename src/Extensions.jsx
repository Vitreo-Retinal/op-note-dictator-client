import { useEffect, useMemo, useState } from "react";
import { T } from "./theme.js";
import PageBar, { wrap, searchInput } from "./PageBar.jsx";
import { SearchIcon } from "./icons.jsx";
import { usePhone } from "./phone.jsx";
import { fetchDirectory, filterDirectory, telHref } from "./lib/vraDirectory.js";

// ── Phone extensions page (Oct 2026) ────────────────────────────────
// Search box (name or number, filters as you type), the office cards with
// tap-to-call phone and fax, then each extension group as compact rows
// "Name (note) — 104". Phone: one column. Desktop: two columns.
// Data: GET /api/directory (server lib/vra-directory.js) — nothing is hard-coded here.

const card = { background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.rLg, overflow: "hidden", boxSizing: "border-box" };
const secH = { fontSize: 11.5, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: T.muted, margin: "0 0 6px" };

function NumberLink({ label, number }) {
  return (
    <a href={telHref(number)}
      style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 1, minHeight: 44, padding: "6px 12px", borderRadius: T.r, border: `1px solid ${T.line}`, background: T.paper, textDecoration: "none", fontFamily: T.sans, flex: 1, minWidth: 0, boxSizing: "border-box" }}>
      <span style={{ fontSize: 11.5, color: T.muted }}>{label}</span>
      <span style={{ fontSize: 14.5, fontWeight: 600, color: T.accent, whiteSpace: "nowrap" }}>{number}</span>
    </a>
  );
}

function OfficeCard({ office }) {
  return (
    <div style={{ ...card, padding: "10px 12px" }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>{office.name}</div>
      {office.address && <div style={{ fontSize: 12.5, color: T.muted, marginTop: 1, lineHeight: 1.35 }}>{office.address}</div>}
      {office.note && <div style={{ fontSize: 12.5, color: T.muted, marginTop: 1 }}>{office.note}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        {office.phone && <NumberLink label="Phone" number={office.phone} />}
        {office.fax && <NumberLink label={office.faxLabel || "Fax"} number={office.fax} />}
      </div>
    </div>
  );
}

function GroupCard({ group }) {
  return (
    <div style={{ breakInside: "avoid", marginBottom: 12 }}>
      <div style={secH}>{group.group}</div>
      <div style={card}>
        {group.items.map((it, i) => (
          <div key={`${it.name}-${it.ext || it.phone}`} style={{ display: "flex", alignItems: "baseline", gap: 8, minHeight: 36, padding: "8px 12px", boxSizing: "border-box", borderTop: i ? `1px solid ${T.line}` : 0, fontSize: 14 }}>
            <span style={{ flex: 1, minWidth: 0, color: T.ink }}>
              {it.name}{it.note && <span style={{ color: T.muted, fontSize: 12.5 }}> ({it.note})</span>}
            </span>
            <span style={{ color: T.lineStrong }}>—</span>
            {it.phone
              ? <a href={`tel:${it.phone.replace(/[^\d+]/g, "")}`} style={{ fontFamily: T.mono, fontWeight: 600, color: T.accent, fontSize: 14, textDecoration: "none" }}>{it.phone}</a>
              : <b style={{ fontFamily: T.mono, fontWeight: 600, color: T.accent, fontSize: 14, minWidth: 30, textAlign: "right" }}>{it.ext}</b>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Extensions({ onBack, backLabel = "Hub" }) {
  const { phone } = usePhone();
  const [dir, setDir] = useState(null); // null = loading
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    fetchDirectory().then((d) => { if (alive) setDir(d); });
    return () => { alive = false; };
  }, []);

  const shown = useMemo(() => filterDirectory(dir, q), [dir, q]);
  const asOf = (dir && dir.asOf) || "Oct 2026";
  const none = dir && !dir.error && q.trim() && !shown.offices.length && !shown.extensions.length;

  const search = (
    <div style={{ position: "relative", marginBottom: 12 }}>
      <span style={{ position: "absolute", left: 13, top: 13, color: T.muted, pointerEvents: "none" }}><SearchIcon /></span>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or number"
        aria-label="Search extensions" className="vra-input" autoComplete="off"
        style={searchInput({ paddingLeft: 38, fontSize: 16 })} />
    </div>
  );

  const status = dir === null
    ? <div style={{ fontSize: 13, color: T.muted, padding: "8px 0" }}>Loading…</div>
    : dir.error ? <div style={{ fontSize: 13, color: T.muted, padding: "8px 0" }}>Extensions unavailable — try again in a minute.</div> : null;

  const footer = (
    <p style={{ fontSize: 12, color: T.muted, margin: "8px 0 4px" }}>
      Extensions as of {asOf} · tell a manager if something changed
    </p>
  );

  const offices = shown.offices.length > 0 && (
    <div style={{ display: "grid", gridTemplateColumns: phone ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 16 }}>
      {shown.offices.map((o) => <OfficeCard key={o.id || o.name} office={o} />)}
    </div>
  );
  const groups = shown.extensions.length > 0 && (
    <div style={phone ? {} : { columns: 2, columnGap: 16 }}>
      {shown.extensions.map((g) => <GroupCard key={g.group} group={g} />)}
    </div>
  );

  return (
    <div style={{ minHeight: phone ? undefined : "100vh", background: T.paper, color: T.ink, fontFamily: T.sans }}>
      <PageBar onBack={onBack} backLabel={backLabel} title="Phone extensions" sub={phone ? undefined : "Offices, fax numbers and extensions"} />
      <div className="vra-wrap" style={phone ? { padding: "4px 16px 16px" } : wrap({ paddingTop: 20, paddingBottom: 40 })}>
        {search}
        {status}
        {none && <div style={{ fontSize: 13.5, color: T.muted, padding: "4px 0 12px" }}>No match for “{q.trim()}”.</div>}
        {offices}
        {groups}
        {dir && !dir.error && footer}
      </div>
    </div>
  );
}

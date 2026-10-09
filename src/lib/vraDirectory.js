// ── VRA offices + phone extensions — client helper (Oct 2026) ───────
// Source: server GET /api/directory (lib/vra-directory.js is the one place
// the data lives). The auth token is attached by the fetch wrapper in main.jsx.
const API_BASE = import.meta.env.VITE_API_BASE || "https://op-note-dictator-server-production.up.railway.app";

/** GET /api/directory. Never throws — failures come back as { error }. */
export async function fetchDirectory() {
  try {
    const res = await fetch(`${API_BASE}/api/directory`);
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const data = await res.json();
    if (!data || !Array.isArray(data.offices) || !Array.isArray(data.extensions)) return { error: "bad response" };
    return data;
  } catch {
    return { error: "network" };
  }
}

// ── Fax guard (Oct 2026, per Mari): a fax number must never be tap-to-call.
// A number is a FAX when it comes from a `fax` field (offices: fax / faxLabel;
// any entry: fax), when the entry says kind/type "fax", or when its label,
// name or note contains the word "fax" (e.g. "ED fax", note "fax"). Every
// number on the page goes through numbersOf() + telHref(), so a new fax entry
// added on the server cannot become a call link by accident.
const FAX_RE = /\bfax\b/i;

/** True when any of the texts names a fax line ("Fax", "ED fax", note "fax"). */
export function isFax(...texts) {
  return texts.some((t) => FAX_RE.test(String(t || "")));
}

/** True when a whole directory entry (office or extension item) is a fax line. */
export function isFaxEntry(it) {
  if (!it) return false;
  return it.kind === "fax" || it.type === "fax" || isFax(it.name, it.note, it.label);
}

/**
 * Every number an entry carries → [{ label, number, fax }], voice first.
 *   office: phone ("Phone") and fax (faxLabel || "Fax")
 *   item:   phone (fax when the item itself is a fax line) and fax
 */
export function numbersOf(it, { phoneLabel = "Phone" } = {}) {
  if (!it) return [];
  const out = [];
  if (it.phone) {
    const fax = isFaxEntry(it);
    out.push({ label: fax ? "Fax" : phoneLabel, number: it.phone, fax });
  }
  if (it.fax) out.push({ label: it.faxLabel || "Fax", number: it.fax, fax: true });
  return out;
}

/**
 * "508-752-1155" → "tel:5087521155" — VOICE numbers only. Returns null for a
 * fax ({ fax: true } or a label containing "fax") or an empty number; callers
 * render plain text when it is null.
 */
export function telHref(n, { fax = false, label = "" } = {}) {
  if (fax || isFax(label)) return null;
  const digits = String(n || "").replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : null;
}

/**
 * Filter by name, note or number as you type. Digits in the query also match
 * phone/fax numbers with the dashes ignored. Empty query → everything.
 */
export function filterDirectory(dir, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!dir || dir.error) return { offices: [], extensions: [] };
  if (!q) return { offices: dir.offices, extensions: dir.extensions };
  const numeric = /^[\d\s()-]+$/.test(q);
  const digits = q.replace(/\D/g, "");
  const hit = (text) => {
    const t = String(text || "");
    return t.toLowerCase().includes(q) || (numeric && !!digits && t.replace(/\D/g, "").includes(digits));
  };
  const offices = dir.offices.filter((o) => [o.name, o.address, o.phone, o.fax, o.note].some(hit));
  const extensions = dir.extensions
    .map((g) => ({ ...g, items: hit(g.group) ? g.items : g.items.filter((it) => [it.name, it.note, it.ext].some(hit)) }))
    .filter((g) => g.items.length);
  return { offices, extensions };
}

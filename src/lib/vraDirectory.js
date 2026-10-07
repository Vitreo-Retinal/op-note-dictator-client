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

/** "508-752-1155" → "tel:5087521155" */
export const telHref = (n) => `tel:${String(n || "").replace(/[^\d+]/g, "")}`;

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

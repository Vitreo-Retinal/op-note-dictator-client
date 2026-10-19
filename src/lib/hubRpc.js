// Hub data through the server (Oct 18 2026).
//
// The Rates screen and the clinic-note schedule used to call the hub_*
// Supabase functions straight from the browser with the publishable key.
// They now go through the hub server's POST /api/hub-data, which checks the
// sign-in token (doctor / manager / LEA doctor only) and calls Supabase with
// its own key. The publishable key no longer reads these functions.
//
// Same shape as supabase.rpc(): resolves to { data, error }, never rejects,
// so existing `.then(({ data, error }) => …)` code works unchanged.
// The auth header is added by the fetch wrapper in main.jsx (railway.app URLs).
const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://op-note-dictator-server-production.up.railway.app";

export async function hubRpc(fn, args) {
  try {
    const resp = await fetch(`${API_BASE}/api/hub-data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fn, args: args || {} }),
    });
    const json = await resp.json().catch(() => null);
    if (!resp.ok || !json) {
      return { data: null, error: (json && json.error) || { message: `HTTP ${resp.status}` } };
    }
    return { data: json.data, error: json.error || null };
  } catch (e) {
    return { data: null, error: { message: (e && e.message) || "network error" } };
  }
}

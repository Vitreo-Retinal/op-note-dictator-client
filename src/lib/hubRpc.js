// ── Hub data through the server (security stage 3, Mari Oct 24 2026) ──
// The Rates screen and the clinic-note calculator used to call eight hub_*
// Supabase functions straight from the browser with the publishable key — a key
// that ships in this public repo, so anyone could read VRA's contracted rates,
// drug costs and the call schedule. Now the browser asks the hub server
// (POST /api/hub-data { fn, args }), which checks the sign-in token (doctor,
// manager or lea-doctor) and calls Supabase with its own secret key. Once this
// is live, EXECUTE on those functions is revoked from the public key.
//
// hubRpc(fn, args) resolves to { data, error } — the same shape supabase.rpc()
// returned — so the calling code did not change. It never rejects; a network or
// permission failure comes back as { data: null, error }.

const API_BASE = (import.meta.env || {}).VITE_API_BASE || "https://op-note-dictator-server-production.up.railway.app";

// The eight functions the server allows (routes/hub-data.js HUB_FUNCTIONS).
export const HUB_RPC_FUNCTIONS = Object.freeze([
  "hub_drug_economics_v3", "hub_codes", "hub_networks", "hub_insurance_dict",
  "hub_compare", "hub_rvu", "hub_surgeon_schedule", "hub_call_schedule",
]);

export async function hubRpc(fn, args = {}, { fetchImpl = (...a) => fetch(...a), base = API_BASE } = {}) {
  try {
    const res = await fetchImpl(`${base}/api/hub-data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fn, args: args || {} }),
    });
    let body = null;
    try { body = await res.json(); } catch { body = null; }
    if (!res.ok || !body) {
      return { data: null, error: (body && body.error) || { message: `HTTP ${res.status}` } };
    }
    return { data: body.data === undefined ? null : body.data, error: body.error || null };
  } catch (e) {
    return { data: null, error: { message: (e && e.message) || "network error" } };
  }
}

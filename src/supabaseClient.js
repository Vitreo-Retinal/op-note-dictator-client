import { createClient } from "@supabase/supabase-js";

// Publishable (anon) key — safe to ship in the browser. Real protection is the
// email-locked hub_* functions: only the signed-in mrodriguez@retina-docs.com
// session can read any rate data; anonymous callers get nothing.
const URL =
  import.meta.env.VITE_SUPABASE_URL || "https://mrfohzuaptrvpctlfsqv.supabase.co";
const KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_TBtYDeX9zCq6FxP0oLv6-A_XQYIkw1U";

export const supabase = createClient(URL, KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

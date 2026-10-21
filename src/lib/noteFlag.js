// "Flag for review" delivery (shadow coder v1 follow-up, Oct 21 2026, per Mari).
//
// WHY: a typed flag reason was thrown away when the doctor pressed Generate,
// Optimize or New note with the flag box still open, and a failed send showed
// only a tiny red line. Now:
//   - an open box with typed text is SENT for the old note before the note is
//     replaced (pendingFlagToSend), without blocking the new action;
//   - a network failure (fetch throws) is retried ONCE after ~1.5 s;
//   - a 4xx/5xx answer is not retried; the server's message is shown;
//   - a failure stays on screen (flagFailures list) until dismissed or a retry works.
//
// PHI-free: the request carries the ledger note id + the typed reason only
// (codes/modifiers), never note text. Same request as the Send button.
// Pure module (no React) so scripts/noteFlag.test.js can test it with node --test.

export const FLAG_REASON_MAX = 140;
export const FLAG_RETRY_DELAY_MS = 1500;

/** The exact /api/note-flag body the Send button posts. */
export function flagPayload(noteId, reason) {
  return { noteId: String(noteId || ""), reason: String(reason || "").trim().slice(0, FLAG_REASON_MAX) };
}

/**
 * The flag that must go out before the current note is replaced, or null.
 * Only an OPEN box with NON-EMPTY text counts (an empty open box is just closed,
 * as before). Nothing when the note has no ledger id, is already flagged, or a
 * send for it is already in flight (no duplicate request).
 */
export function pendingFlagToSend({ noteId, flagOpen, flagReason, flagged = false, sending = false } = {}) {
  if (!noteId || !flagOpen || flagged || sending) return null;
  const p = flagPayload(noteId, flagReason);
  return p.reason ? p : null;
}

const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));

/** Plain-language text for a failed send (shown in the banner). */
export function flagErrorText(failure) {
  if (!failure) return "";
  if (failure.kind === "network") return "Couldn't reach the server. The flag was not saved.";
  const m = failure.message;
  if (m === "lea_session_expired") return "Your session expired. Sign in again, then try again.";
  if (failure.kind === "rejected") return "The server did not save the flag.";
  if (typeof m === "string" && m.trim()) return `The server said: ${m.trim().slice(0, 200)}`;
  return `The server answered with an error${failure.status ? ` (${failure.status})` : ""}. The flag was not saved.`;
}

/**
 * POST the flag. Resolves (never throws):
 *   { ok: true }
 *   { ok: false, kind: "network" }                         — fetch threw twice (one auto-retry)
 *   { ok: false, kind: "http", status, message }           — 4xx/5xx; NOT retried
 *   { ok: false, kind: "rejected", status }                — 200 but { ok: false } (row not updated)
 */
export async function sendNoteFlag(payload, { url, fetchImpl, retryDelayMs = FLAG_RETRY_DELAY_MS, sleep = sleepMs } = {}) {
  const doFetch = fetchImpl || ((...a) => fetch(...a));
  const body = JSON.stringify(flagPayload(payload && payload.noteId, payload && payload.reason));
  // keepalive: the request survives the page being left (the unmount send).
  const attempt = () => doFetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
  let res;
  try {
    res = await attempt();
  } catch {
    await sleep(retryDelayMs);
    try {
      res = await attempt();
    } catch {
      return { ok: false, kind: "network" };
    }
  }
  if (!res) return { ok: false, kind: "network" };
  let data = {};
  try { data = (await res.json()) || {}; } catch { data = {}; }
  if (res.ok === false || (typeof res.status === "number" && res.status >= 400)) {
    const message = typeof data.error === "string" ? data.error : (data.error && typeof data.error.message === "string" ? data.error.message : "");
    return { ok: false, kind: "http", status: res.status, message };
  }
  if (data.ok === true) return { ok: true };
  return { ok: false, kind: "rejected", status: res.status };
}

// ── Failure list (one entry per note id) ──
// Entry: { noteId, reason, message, sending }

/** Add or replace the failure for this note id (latest reason/message wins). */
export function upsertFlagFailure(list, entry) {
  const rest = (list || []).filter((f) => f.noteId !== entry.noteId);
  return [...rest, { sending: false, ...entry }];
}

/** Drop the failure for this note id. */
export function removeFlagFailure(list, noteId) {
  return (list || []).filter((f) => f.noteId !== noteId);
}

/** Mark one failure as re-sending (Try again pressed). */
export function markFlagFailureSending(list, noteId, sending = true) {
  return (list || []).map((f) => (f.noteId === noteId ? { ...f, sending } : f));
}

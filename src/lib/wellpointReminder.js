// Wellpoint audit reminder (Nov 6 2026, owner 1:08 PM; server OWN-RULE-050 — lib/vabysmo-wellpoint.js).
// The server sends data.wellpointReminder (a string) when Vabysmo (J2777) is billed today and the
// primary is traditional Medicare (alone, + supplement, + MassHealth) or no insurance is written.
// HUB ONLY: shown on the Note page under the note, never part of result.note, so copyNote (which
// copies copyableNoteText(result.note)) never copies it. Older servers omit the field → nothing shown.

/** The server's reminder string from the response JSON, or null. */
export function parseWellpointReminder(data) {
  return data && typeof data.wellpointReminder === "string" && data.wellpointReminder.trim() ? data.wellpointReminder : null;
}

/** The reminder to show for this result, or null. */
export function wellpointReminderFor(result) {
  if (!result || typeof result !== "object") return null;
  return typeof result.wellpointReminder === "string" && result.wellpointReminder ? result.wellpointReminder : null;
}

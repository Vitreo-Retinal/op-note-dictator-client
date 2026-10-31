// Ask reply extras (Ask AI Phase B, Mari Oct 31 2026) — pure helpers for the three Ask
// boxes (front desk, tech, doctor; all use AICodingAssistant in CptReference.jsx).
//   - The server may return coverage `cards` (the note's own card JSON) and `copyText`
//     (the ASCII COVERAGE REFERENCE block) with a reply; they ride on the assistant
//     message so the card renders under the reply text.
//   - Only { role, content } ever goes back to the server as history.
//   - "Flag" (thumbs-down) on a reply → POST /api/ask-flag with the question, the reply,
//     its cards and ids, and an optional reason. The server PHI-scrubs the text.
// No React here, so scripts/askReply.test.js can test it with node --test.

export const ASK_FLAG_REASON_MAX = 300;

/** The assistant message the chat keeps for one server reply. */
export function assistantMessage(data) {
  const d = data && typeof data === "object" ? data : {};
  const msg = { role: "assistant", content: typeof d.reply === "string" ? d.reply : "" };
  if (Array.isArray(d.cards) && d.cards.length) msg.cards = d.cards;
  if (typeof d.copyText === "string" && d.copyText.trim()) msg.copyText = d.copyText;
  if (d.meta && typeof d.meta === "object") msg.meta = d.meta;
  return msg;
}

/** A mixed coverage + coding reply → { head, coding }: the card goes between them. */
export const CODING_MARK = "\n\n**Coding**\n";
export function splitCoverageReply(content) {
  const t = typeof content === "string" ? content : "";
  const i = t.indexOf(CODING_MARK);
  return i < 0 ? { head: t, coding: "" } : { head: t.slice(0, i), coding: t.slice(i + 2) };
}

/** History for the next request: role + string content only (no cards, no meta). */
export function historyForServer(messages) {
  return (Array.isArray(messages) ? messages : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content }));
}

/** The user question a reply answers (the nearest earlier user turn). */
export function questionFor(messages, index) {
  const list = Array.isArray(messages) ? messages : [];
  for (let i = Math.min(index, list.length) - 1; i >= 0; i--) {
    if (list[i] && list[i].role === "user" && typeof list[i].content === "string") return list[i].content;
  }
  return "";
}

/** POST /api/ask-flag body for the reply at messages[index]. */
export function askFlagPayload(messages, index, reason) {
  const msg = (Array.isArray(messages) ? messages : [])[index] || {};
  const meta = msg.meta || {};
  const cov = meta.coverage || {};
  const r = typeof reason === "string" ? reason.trim().slice(0, ASK_FLAG_REASON_MAX) : "";
  return {
    question: questionFor(messages, index),
    answer: typeof msg.content === "string" ? msg.content : "",
    cards: Array.isArray(msg.cards) ? msg.cards : [],
    intents: Array.isArray(meta.intents) ? meta.intents : null,
    planId: cov.planId == null ? null : cov.planId,
    drug: cov.drug || null,
    diagnosis: cov.diagnosis || null,
    ruleId: cov.ruleId || null,
    model: typeof meta.model === "string" ? meta.model : null,
    ...(r ? { reason: r } : {}),
  };
}

/** Send a flag. Resolves { ok, error? }; never rejects. */
export async function sendAskFlag(payload, { url, fetchImpl = (...a) => fetch(...a) } = {}) {
  try {
    const res = await fetchImpl(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    let body = null;
    try { body = await res.json(); } catch { body = null; }
    if (res.ok && body && body.ok === true) return { ok: true };
    return { ok: false, error: (body && body.error) || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: "network" };
  }
}

// Under every Ask reply (Ask AI Phase B, Mari Oct 31 2026): the coverage card(s) the
// server built (same CoverageCard as the note), a "Copy coverage reference" button for
// the ASCII block, and a small "Flag" (thumbs-down) control → POST /api/ask-flag with an
// optional reason. Used by AICodingAssistant (front desk, tech and doctor Ask boxes).
import { useState } from "react";
import { T, btnSm } from "./theme.js";
import { CoverageCards } from "./CoverageCard.jsx";
import { askFlagPayload, sendAskFlag, splitCoverageReply, ASK_FLAG_REASON_MAX } from "./lib/askReply.js";

function ThumbDown({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.7a2 2 0 0 0-2 1.7l-1.4 9A2 2 0 0 0 4.3 15H10z" />
      <path d="M17 2h2.7A2.3 2.3 0 0 1 22 4.3v6.4a2.3 2.3 0 0 1-2.3 2.3H17" />
    </svg>
  );
}

export function CopyCoverageButton({ text }) {
  const [state, setState] = useState("");
  if (!text) return null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setState("Copied"); }
    catch { setState("Copy failed — select the text in the note instead"); }
    setTimeout(() => setState(""), 2000);
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
      <button type="button" onClick={copy} data-ask-copy="1" style={btnSm("secondary", { color: T.ink2 })}>Copy coverage reference</button>
      {state && <span style={{ fontSize: 12, color: T.muted }} role="status">{state}</span>}
    </div>
  );
}

export function AskFlag({ messages, index, url }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [state, setState] = useState("idle");   // idle | sending | done | error
  if (state === "done") return <div style={{ fontSize: 12, color: T.muted, marginTop: 8 }} role="status" data-ask-flagged="1">Flagged — thank you</div>;
  const send = async () => {
    setState("sending");
    const out = await sendAskFlag(askFlagPayload(messages, index, reason), { url });
    setState(out.ok ? "done" : "error");
  };
  return (
    <div style={{ marginTop: 8 }}>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} aria-label="Flag this answer" title="Flag this answer as wrong"
          data-ask-flag="1"
          style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", padding: "2px 0", color: T.muted, fontSize: 12, fontFamily: T.sans, cursor: "pointer" }}>
          <ThumbDown /> Flag
        </button>
      ) : (
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", minWidth: 0 }}>
          <input value={reason} onChange={(e) => setReason(e.target.value.slice(0, ASK_FLAG_REASON_MAX))} placeholder="What's wrong? (optional, no names)"
            aria-label="Reason (optional)" data-ask-flag-reason="1"
            style={{ flex: "1 1 160px", minWidth: 0, height: 32, padding: "0 10px", borderRadius: 8, border: `1px solid ${T.line}`, background: T.paper, color: T.ink, fontSize: 13, fontFamily: T.sans, boxSizing: "border-box" }} />
          <button type="button" onClick={send} disabled={state === "sending"} data-ask-flag-send="1" style={btnSm("secondary", { color: T.ink2 })}>
            {state === "sending" ? "Sending..." : "Send flag"}
          </button>
          <button type="button" onClick={() => { setOpen(false); setState("idle"); }} style={{ background: "none", border: "none", color: T.muted, fontSize: 12, cursor: "pointer", fontFamily: T.sans }}>Cancel</button>
          {state === "error" && <span style={{ fontSize: 12, color: T.red, flexBasis: "100%" }}>Could not send — try again.</span>}
        </div>
      )}
    </div>
  );
}

/** The coverage card(s) of messages[index], if any. */
export function AskCards({ messages, index }) {
  const msg = messages[index] || {};
  const cards = Array.isArray(msg.cards) ? msg.cards : [];
  if (!cards.length) return null;
  return (
    <div data-ask-cards={cards.length} style={{ minWidth: 0, marginBottom: 4 }}>
      <CoverageCards cards={cards} footText="From Retina-Rx — copy the coverage reference below" />
    </div>
  );
}

/**
 * One assistant reply: its text, the coverage card(s) right after the coverage line (a mixed
 * coverage + coding reply puts the coding section after the card), then copy + flag.
 * renderText = the chat's own markdown-ish renderer.
 */
export default function AskReply({ messages, index, flagUrl, renderText }) {
  const msg = messages[index] || {};
  const hasCards = Array.isArray(msg.cards) && msg.cards.length > 0;
  const { head, coding } = hasCards ? splitCoverageReply(msg.content) : { head: msg.content, coding: "" };
  return (
    <div data-ask-extras="1" style={{ minWidth: 0 }}>
      {renderText(head)}
      <AskCards messages={messages} index={index} />
      {coding && <div style={{ marginTop: 10 }}>{renderText(coding)}</div>}
      <CopyCoverageButton text={msg.copyText} />
      <AskFlag messages={messages} index={index} url={flagUrl} />
    </div>
  );
}

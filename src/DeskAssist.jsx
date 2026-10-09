import { useEffect } from "react";
import { T } from "./theme.js";
import PageBar from "./PageBar.jsx";
import { PhoneHeading, usePhone } from "./phone.jsx";
import { AICodingAssistant } from "./CptReference.jsx";
import { fetchDirectory } from "./lib/vraDirectory.js";

// ── Front desk "Ask" page (Oct 2026) ────────────────────────────────
// Same chat-first layout as the phone Coding tab (input pinned above the tab
// bar), talking to POST /api/desk-assist: scheduling urgency, triage
// questions, offices, fax numbers and extensions — the practice's sheet only.
// PHI-free: nothing is stored; the server never logs message content.

const EXAMPLES = [
  "Patient calling with flashes and floaters since yesterday",
  "New wet AMD referral — when do we book?",
  "What's Nana's extension?",
  "CRAO referral — what do we tell them?",
];

const NO_PHI = "No PHI — symptoms only, no names";

export default function DeskAssist({ onBack }) {
  const { phone } = usePhone();
  // Load the directory once so every fax number it lists is known to the
  // answer linkifier (lib/phoneText.js) — a fax in an answer is never tappable,
  // even without a "fax" label next to it. Fails soft (office faxes are built in).
  useEffect(() => { fetchDirectory(); }, []);
  const chatProps = {
    endpoint: "/api/desk-assist",
    examples: EXAMPLES,
    suggestions: EXAMPLES,
    sendSuggestions: true,
    emptyText: "Scheduling, triage, fax numbers, extensions",
    placeholder: "Ask a front desk question...",
    desktopTitle: "Front desk assistant",
    desktopIntro: "When to book a referral, what to ask a patient who calls, fax numbers and extensions — from the practice's sheet.",
    desktopPlaceholder: "Ask about scheduling, triage, a fax number or an extension...",
  };

  if (phone) {
    return (
      <div style={{ background: T.paper, fontFamily: T.sans, color: T.ink }}>
        <PhoneHeading title="Ask" sub={NO_PHI} />
        <div style={{ padding: "0 16px" }}>
          <AICodingAssistant phoneLayout {...chatProps} />
        </div>
      </div>
    );
  }
  return (
    <div style={{ minHeight: "100vh", background: T.paper, fontFamily: T.sans, color: T.ink }}>
      <PageBar onBack={onBack} backLabel="Hub" title="Ask" sub={NO_PHI} />
      <div style={{ padding: "0 24px" }}>
        <AICodingAssistant {...chatProps} />
      </div>
    </div>
  );
}

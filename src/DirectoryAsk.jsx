import { useEffect } from "react";
import { T } from "./theme.js";
import PageBar from "./PageBar.jsx";
import { usePhone } from "./phone.jsx";
import { AICodingAssistant } from "./CptReference.jsx";
import { fetchDirectory } from "./lib/vraDirectory.js";

// ── Referral Directory page (Oct 2026) ──────────────────────────────
// Same chat as the front desk "Ask" page (DeskAssist), talking to the shared
// POST /api/ask engine (Ask Phase E — referral directory source). The body is
// just { messages } — no `source`: the server's classifier routes, so a
// billing question typed here still gets a coding answer. Contact visibility
// is tiered server-side by login (personal cells: doctors + managers only);
// the client hides nothing. The auth token is attached by the fetch wrapper
// in main.jsx. PHI-free: nothing is stored.

const EXAMPLES = [
  "Who do we send uveitis to?",
  "What's Dr. Zacharia's number?",
  "Cataract surgeon in Worcester who takes Fallon?",
];

const CAPTION = "Answers come only from the practice's referral directory — numbers are never guessed. Personal cells show for doctors and managers only.";

export default function DirectoryAsk({ onBack, backLabel = "Hub" }) {
  const { phone } = usePhone();
  // Same as DeskAssist: load the office directory once so every known fax
  // number stays un-tappable in answers. Fails soft.
  useEffect(() => { fetchDirectory(); }, []);
  const chatProps = {
    endpoint: "/api/ask",
    sendReimbursementFlag: false,
    examples: EXAMPLES,
    suggestions: EXAMPLES,
    emptyText: "Referral doctors — numbers, locations, insurances",
    placeholder: "Ask the referral directory...",
    desktopTitle: "Referral directory",
    desktopIntro: "Who we refer to and who refers to us — office numbers, locations, and which insurances they take.",
    desktopPlaceholder: "Ask who to refer to, a doctor's number, or who takes a plan...",
    caption: CAPTION,
  };

  if (phone) {
    return (
      <div style={{ background: T.paper, fontFamily: T.sans, color: T.ink }}>
        <PageBar onBack={onBack} backLabel={backLabel} title="Referral Directory" />
        <div style={{ padding: "0 16px" }}>
          <AICodingAssistant phoneLayout {...chatProps} />
        </div>
      </div>
    );
  }
  return (
    <div style={{ minHeight: "100vh", background: T.paper, fontFamily: T.sans, color: T.ink }}>
      <PageBar onBack={onBack} backLabel={backLabel} title="Referral Directory" sub="Who we refer to, and who refers to us" />
      <div style={{ padding: "0 24px" }}>
        <AICodingAssistant {...chatProps} />
      </div>
    </div>
  );
}

import { useState, useMemo } from "react";
import { CPT_CATALOG, CPT_CATEGORIES } from "./cptCatalog";

// ── Styles (shared palette with the rest of the app) ────────────────
const S = {
  bg: "#0f172a", card: "#1e293b", border: "#334155", muted: "#64748b",
  text: "#e2e8f0", bright: "#f1f5f9", accent: "#6366f1", accentLight: "#a5b4fc",
  green: "#22c55e", yellow: "#eab308", red: "#ef4444", orange: "#f97316",
  font: "'Inter','SF Pro Display',-apple-system,sans-serif",
  mono: "'SF Mono','Fira Code',monospace",
};

// ── Category metadata ───────────────────────────────────────────────
const CATEGORIES = [
  { id: "all", label: "All Codes" },
  ...CPT_CATEGORIES.map((c) => ({ id: c, label: c })),
];

// ── AI Coding Assistant ─────────────────────────────────────────────
const AI_API_BASE = import.meta.env.VITE_API_BASE || "https://op-note-dictator-server-production.up.railway.app";

export function AICodingAssistant({ showReimbursement = false }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = { current: null };

  const scrollToBottom = () => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${AI_API_BASE}/api/cpt-assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated, showReimbursement }),
      });
      const data = await res.json();
      if (data.success && data.reply) {
        setMessages([...updated, { role: "assistant", content: data.reply }]);
      } else {
        setMessages([...updated, { role: "assistant", content: "Sorry, something went wrong. Try again." }]);
      }
    } catch (e) {
      setMessages([...updated, { role: "assistant", content: "Network error — check your connection." }]);
    }
    setLoading(false);
    setTimeout(scrollToBottom, 100);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setInput("");
  };

  // Simple markdown-ish rendering: bold (**text**), line breaks, bullet points
  const renderContent = (text) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      // Bold
      let rendered = line.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#f1f5f9">$1</strong>');
      // Bullet points
      const isBullet = /^\s*[-•]\s/.test(line);
      if (isBullet) {
        rendered = rendered.replace(/^\s*[-•]\s*/, "");
        return (
          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 3, paddingLeft: 8 }}>
            <span style={{ color: S.accent, flexShrink: 0 }}>•</span>
            <span dangerouslySetInnerHTML={{ __html: rendered }} />
          </div>
        );
      }
      if (line.trim() === "") return <div key={i} style={{ height: 8 }} />;
      return <div key={i} style={{ marginBottom: 3 }} dangerouslySetInnerHTML={{ __html: rendered }} />;
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 70px)", maxWidth: 800, margin: "0 auto" }}>
      {/* Chat messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", marginTop: 60, color: S.muted }}>
            <div style={{ fontSize: "1.3rem", marginBottom: 12, color: S.accentLight }}>AI Coding Assistant</div>
            <div style={{ fontSize: "0.85rem", lineHeight: 1.6, maxWidth: 500, margin: "0 auto" }}>
              Ask any retina billing question — CPT codes, ICD-10 pairing, modifiers, bundling, E/M, global periods.
            </div>
            <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {[
                "PPV ILM peel gas for mac hole",
                "Can I bill E/M with injection?",
                "PPV + buckle for macula-off RD",
                "How do I code Yamane?",
                "67041 vs 67042 — when to use each?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  style={{
                    padding: "8px 14px", borderRadius: 20, border: `1px solid ${S.border}`,
                    background: S.card, color: S.text, fontSize: "0.75rem", cursor: "pointer",
                    fontFamily: S.font, transition: "border-color 0.2s",
                  }}
                  onMouseOver={(e) => e.target.style.borderColor = S.accent}
                  onMouseOut={(e) => e.target.style.borderColor = S.border}
                >{q}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              marginBottom: 12,
            }}
          >
            <div style={{
              maxWidth: "85%",
              padding: "10px 14px",
              borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: msg.role === "user" ? S.accent : S.card,
              color: msg.role === "user" ? "#fff" : S.text,
              fontSize: "0.85rem",
              lineHeight: 1.5,
              fontFamily: S.font,
              border: msg.role === "user" ? "none" : `1px solid ${S.border}`,
            }}>
              {msg.role === "user" ? msg.content : renderContent(msg.content)}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
            <div style={{
              padding: "10px 14px", borderRadius: "16px 16px 16px 4px",
              background: S.card, border: `1px solid ${S.border}`,
              fontSize: "0.85rem", color: S.muted,
            }}>
              Thinking...
            </div>
          </div>
        )}

        <div ref={(el) => { chatEndRef.current = el; }} />
      </div>

      {/* Input area */}
      <div style={{
        padding: "12px 20px 16px", borderTop: `1px solid ${S.border}`,
        display: "flex", gap: 8, alignItems: "flex-end",
      }}>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            style={{
              background: "none", border: `1px solid ${S.border}`, borderRadius: 8,
              color: S.muted, cursor: "pointer", padding: "10px", fontSize: "0.75rem",
              fontFamily: S.font, flexShrink: 0,
            }}
            title="Clear chat"
          >Clear</button>
        )}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your case or ask a billing question..."
          rows={1}
          style={{
            flex: 1, padding: "10px 14px", background: S.card, border: `1px solid ${S.border}`,
            borderRadius: 12, color: S.bright, fontSize: "0.9rem", fontFamily: S.font,
            outline: "none", resize: "none", lineHeight: 1.4,
            minHeight: 42, maxHeight: 120,
          }}
          onInput={(e) => {
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
          }}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{
            padding: "10px 18px", borderRadius: 12, border: "none",
            background: loading || !input.trim() ? S.border : S.accent,
            color: "#fff", cursor: loading || !input.trim() ? "default" : "pointer",
            fontSize: "0.85rem", fontWeight: 600, fontFamily: S.font, flexShrink: 0,
          }}
        >Send</button>
      </div>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────
// ── Surgical code decision map (Visual tab) ─────────────────────────
const RD_LEAVES = [
  { code: "67110", label: "Pneumatic (office gas)" },
  { code: "67107", label: "Scleral buckle only" },
  { code: "67108", label: "PPV ± buckle" },
  { code: "67113", label: "Complex + membrane peel" },
];
const PPV_LEAVES = [
  { code: "67036", label: "Base: VH, floaters, dropped IOL" },
  { code: "67039", label: "+ focal endolaser" },
  { code: "67040", label: "+ PRP (for PDR)" },
  { code: "67041", label: "+ ERM / pucker peel" },
  { code: "67042", label: "+ ILM peel (MH, DME, VMT)" },
  { code: "67043", label: "+ subretinal membrane (CNVM)" },
];
function SurgicalCodeMap({ onPick }) {
  const [hover, setHover] = useState(null);
  const detail = hover ? CPT_CATALOG.find((c) => c.code === hover) : null;
  const globalLabel = (g) =>
    g === "XXX" ? "no global period" : g === "ZZZ" ? "add-on code" : g === "YYY" ? "carrier-determined" : g + "-day global";
  const Leaf = ({ x, y, leaf, color, light }) => {
    const on = hover === leaf.code;
    return (
      <g style={{ cursor: "pointer" }} onMouseEnter={() => setHover(leaf.code)} onMouseLeave={() => setHover(null)} onClick={() => onPick(leaf.code)}>
        <rect x={x} y={y} width="300" height="34" rx="8" fill={on ? "#273449" : "#1e293b"} stroke={on ? color : "#334155"} />
        <rect x={x} y={y} width="4" height="34" fill={color} />
        <text x={x + 16} y={y + 22} fill="#e2e8f0" fontSize="11.5">{leaf.label}</text>
        <rect x={x + 238} y={y + 6} width="52" height="22" rx="6" fill="#0b1220" stroke={color} />
        <text x={x + 264} y={y + 21} textAnchor="middle" fill={light} fontSize="12" fontFamily="ui-monospace, monospace">{leaf.code}</text>
      </g>
    );
  };
  return (
    <div style={{ padding: "20px", maxWidth: 820, margin: "0 auto" }}>
      <svg viewBox="0 0 760 470" style={{ width: "100%", height: "auto" }} fontFamily="ui-sans-serif, system-ui, sans-serif">
        <text x="24" y="30" fill={S.bright} fontSize="16" fontWeight="700">Surgical Code Selection</text>
        <text x="24" y="49" fill={S.muted} fontSize="12">Vitrectomy &amp; retinal detachment — which 67xxx code?</text>
        <circle cx="566" cy="26" r="5" fill="#ef4444" /><text x="576" y="30" fill={S.muted} fontSize="11">RD repair</text>
        <circle cx="566" cy="45" r="5" fill="#6366f1" /><text x="576" y="49" fill={S.muted} fontSize="11">PPV — other</text>
        <rect x="300" y="70" width="160" height="40" rx="10" fill="#1e293b" stroke="#475569" />
        <text x="380" y="95" textAnchor="middle" fill="#e2e8f0" fontSize="12.5" fontWeight="600">Reason for surgery?</text>
        <path d="M340 110 C 280 124, 230 126, 190 144" fill="none" stroke="#475569" strokeWidth="1.5" />
        <path d="M420 110 C 480 124, 530 126, 570 144" fill="none" stroke="#475569" strokeWidth="1.5" />
        <rect x="90" y="144" width="200" height="30" rx="8" fill="#ef444422" stroke="#ef4444" />
        <text x="190" y="164" textAnchor="middle" fill="#fca5a5" fontSize="12" fontWeight="700">RETINAL DETACHMENT</text>
        <rect x="470" y="144" width="200" height="30" rx="8" fill="#6366f122" stroke="#6366f1" />
        <text x="570" y="164" textAnchor="middle" fill="#a5b4fc" fontSize="12" fontWeight="700">PPV — NON-RD</text>
        {RD_LEAVES.map((l, i) => <Leaf key={l.code} x={40} y={190 + i * 42} leaf={l} color="#ef4444" light="#fca5a5" />)}
        {PPV_LEAVES.map((l, i) => <Leaf key={l.code} x={420} y={190 + i * 42} leaf={l} color="#6366f1" light="#a5b4fc" />)}
        <line x1="40" y1="452" x2="720" y2="452" stroke="#334155" strokeWidth="1" />
      </svg>
      <div style={{ marginTop: 4, padding: "10px 14px", background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, minHeight: 22, fontSize: "0.8rem", color: S.text }}>
        {detail ? (
          <span><span style={{ fontFamily: S.mono, fontWeight: 700, color: S.accentLight }}>{detail.code}</span> {"—"} {detail.desc} <span style={{ color: S.muted }}>({globalLabel(detail.global)})</span>{detail.note ? ` — ${detail.note}` : ""}</span>
        ) : (
          <span style={{ color: S.muted, fontStyle: "italic" }}>Hover a code for its description · click to open it in Browse.</span>
        )}
      </div>
      <div style={{ marginTop: 10, fontSize: "0.78rem", color: S.muted, lineHeight: 1.6 }}>
        <span style={{ color: "#fbbf24", fontWeight: 600 }}>Key rules: </span>
        Multiple techniques, same eye {"→"} bill the single highest code (not stacked). 67113 requires a membrane peel {"—"} without one, complex RD is still 67108.
      </div>
    </div>
  );
}

// ── Modifier decision map (-25 vs -57) ──────────────────────────────
const MINOR_LEAVES = [
  { code: "67028", label: "Intravitreal injection" },
  { code: "67145", label: "Laser retinopexy (tear)" },
  { code: "67228", label: "PRP" },
  { code: "65800", label: "AC tap / paracentesis" },
  { code: "67141", label: "Cryotherapy (tear)" },
];
const MAJOR_LEAVES = [
  { code: "67015", label: "Vitreous tap (tap & inject)" },
  { code: "67108", label: "RD repair — decision today" },
  { code: "66821", label: "YAG capsulotomy — 90-day laser!" },
];
function ModifierMap({ onPick }) {
  const [hover, setHover] = useState(null);
  const detail = hover ? CPT_CATALOG.find((c) => c.code === hover) : null;
  const Leaf = ({ x, y, leaf, color, light }) => {
    const on = hover === leaf.code;
    return (
      <g style={{ cursor: "pointer" }} onMouseEnter={() => setHover(leaf.code)} onMouseLeave={() => setHover(null)} onClick={() => onPick(leaf.code)}>
        <rect x={x} y={y} width="300" height="32" rx="8" fill={on ? "#273449" : "#1e293b"} stroke={on ? color : "#334155"} />
        <rect x={x} y={y} width="4" height="32" fill={color} />
        <text x={x + 16} y={y + 21} fill="#e2e8f0" fontSize="11.5">{leaf.label}</text>
        <rect x={x + 238} y={y + 5} width="52" height="22" rx="6" fill="#0b1220" stroke={color} />
        <text x={x + 264} y={y + 20} textAnchor="middle" fill={light} fontSize="12" fontFamily="ui-monospace, monospace">{leaf.code}</text>
      </g>
    );
  };
  return (
    <div style={{ padding: "20px", maxWidth: 820, margin: "0 auto" }}>
      <svg viewBox="0 0 760 480" style={{ width: "100%", height: "auto" }} fontFamily="ui-sans-serif, system-ui, sans-serif">
        <text x="24" y="30" fill={S.bright} fontSize="16" fontWeight="700">-25 vs -57 — Which modifier goes on the E/M?</text>
        <text x="24" y="49" fill={S.muted} fontSize="12">Decided ONLY by the global period of the procedure billed today — never by how urgent the visit was.</text>
        <rect x="255" y="66" width="250" height="40" rx="10" fill="#1e293b" stroke="#475569" />
        <text x="380" y="91" textAnchor="middle" fill="#e2e8f0" fontSize="12.5" fontWeight="600">Procedure performed at TODAY's visit?</text>
        <path d="M310 106 C 250 118, 210 120, 175 138" fill="none" stroke="#475569" strokeWidth="1.5" />
        <path d="M450 106 C 510 118, 550 120, 585 138" fill="none" stroke="#475569" strokeWidth="1.5" />
        <rect x="80" y="138" width="190" height="30" rx="8" fill="#22c55e22" stroke="#22c55e" />
        <text x="175" y="158" textAnchor="middle" fill="#86efac" fontSize="12" fontWeight="700">NO — E/M alone, no modifier</text>
        <rect x="490" y="138" width="190" height="30" rx="8" fill="#f59e0b22" stroke="#f59e0b" />
        <text x="585" y="158" textAnchor="middle" fill="#fcd34d" fontSize="12" fontWeight="700">YES — check its GLOBAL period</text>
        <path d="M540 168 C 470 184, 330 186, 210 204" fill="none" stroke="#475569" strokeWidth="1.5" />
        <path d="M630 168 C 660 184, 665 186, 640 204" fill="none" stroke="#475569" strokeWidth="1.5" />
        <rect x="60" y="204" width="300" height="34" rx="8" fill="#eab30822" stroke="#eab308" />
        <text x="210" y="226" textAnchor="middle" fill="#fde047" fontSize="13" fontWeight="800">0- or 10-day global → -25</text>
        <rect x="420" y="204" width="300" height="34" rx="8" fill="#ef444422" stroke="#ef4444" />
        <text x="570" y="226" textAnchor="middle" fill="#fca5a5" fontSize="13" fontWeight="800">90-day global → -57</text>
        {MINOR_LEAVES.map((l, i) => <Leaf key={l.code} x={60} y={252 + i * 40} leaf={l} color="#eab308" light="#fde047" />)}
        {MAJOR_LEAVES.map((l, i) => <Leaf key={l.code} x={420} y={252 + i * 40} leaf={l} color="#ef4444" light="#fca5a5" />)}
        <line x1="40" y1="462" x2="720" y2="462" stroke="#334155" strokeWidth="1" />
      </svg>
      <div style={{ marginTop: 4, padding: "10px 14px", background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, minHeight: 22, fontSize: "0.8rem", color: S.text }}>
        {detail ? (
          <span><span style={{ fontFamily: S.mono, fontWeight: 700, color: S.accentLight }}>{detail.code}</span> {"—"} {detail.desc}{detail.note ? ` — ${detail.note}` : ""}</span>
        ) : (
          <span style={{ color: S.muted, fontStyle: "italic" }}>Hover a code for its description · click to open it in Browse.</span>
        )}
      </div>
      <div style={{ marginTop: 10, fontSize: "0.78rem", color: S.muted, lineHeight: 1.6 }}>
        <span style={{ color: "#fbbf24", fontWeight: 600 }}>Key rules: </span>
        An emergency Level-5 visit does NOT change the modifier {"—"} endophthalmitis with only an AC tap (0-day) is still 99215-25.
        A dry vitreous tap is not billable {"—"} the modifier follows the code you actually bill.
        66821 YAG is the exception laser: 90-day {"→"} -57.
        Unrelated E/M during another surgery's global {"→"} -24 instead.
      </div>
    </div>
  );
}

// ── Imaging same-day compatibility map ──────────────────────────────
const OCT_LEAVES = [
  { code: "92134", label: "OCT — macula" },
  { code: "92133", label: "OCT — optic nerve (RNFL)" },
  { code: "92137", label: "OCT-A (angiography)" },
];
const ANGIO_LEAVES = [
  { code: "92235", label: "FA alone" },
  { code: "92240", label: "ICG alone" },
  { code: "92242", label: "FA + ICG same session" },
];
function ImagingMap({ onPick }) {
  const [hover, setHover] = useState(null);
  const detail = hover ? CPT_CATALOG.find((c) => c.code === hover) : null;
  const Leaf = ({ x, y, leaf, color, light, w = 300 }) => {
    const on = hover === leaf.code;
    return (
      <g style={{ cursor: "pointer" }} onMouseEnter={() => setHover(leaf.code)} onMouseLeave={() => setHover(null)} onClick={() => onPick(leaf.code)}>
        <rect x={x} y={y} width={w} height="32" rx="8" fill={on ? "#273449" : "#1e293b"} stroke={on ? color : "#334155"} />
        <rect x={x} y={y} width="4" height="32" fill={color} />
        <text x={x + 16} y={y + 21} fill="#e2e8f0" fontSize="11.5">{leaf.label}</text>
        <rect x={x + w - 62} y={y + 5} width="52" height="22" rx="6" fill="#0b1220" stroke={color} />
        <text x={x + w - 36} y={y + 20} textAnchor="middle" fill={light} fontSize="12" fontFamily="ui-monospace, monospace">{leaf.code}</text>
      </g>
    );
  };
  return (
    <div style={{ padding: "20px", maxWidth: 820, margin: "0 auto" }}>
      <svg viewBox="0 0 760 500" style={{ width: "100%", height: "auto" }} fontFamily="ui-sans-serif, system-ui, sans-serif">
        <text x="24" y="30" fill={S.bright} fontSize="16" fontWeight="700">Imaging — what can share a visit?</text>
        <text x="24" y="49" fill={S.muted} fontSize="12">All of these are inherently bilateral: ONE unit whether one or both eyes — never -RT/-LT/-50.</text>
        <rect x="40" y="70" width="330" height="180" rx="10" fill="#ef444411" stroke="#ef4444" />
        <text x="56" y="94" fill="#fca5a5" fontSize="12.5" fontWeight="700">OCT FAMILY — pick ONE per visit</text>
        <text x="56" y="110" fill={S.muted} fontSize="10.5">92133 / 92134 / 92137 are mutually exclusive</text>
        {OCT_LEAVES.map((l, i) => <Leaf key={l.code} x={56} y={120 + i * 40} leaf={l} color="#ef4444" light="#fca5a5" w={298} />)}
        <rect x="400" y="70" width="330" height="180" rx="10" fill="#6366f111" stroke="#6366f1" />
        <text x="416" y="94" fill="#a5b4fc" fontSize="12.5" fontWeight="700">ANGIOGRAPHY — combined code rule</text>
        <text x="416" y="110" fill={S.muted} fontSize="10.5">Both dyes same session → bill 92242 ONLY, never 92235 + 92240</text>
        {ANGIO_LEAVES.map((l, i) => <Leaf key={l.code} x={416} y={120 + i * 40} leaf={l} color="#6366f1" light="#a5b4fc" w={298} />)}
        <rect x="40" y="270" width="690" height="200" rx="10" fill="#f59e0b11" stroke="#f59e0b" />
        <text x="56" y="294" fill="#fcd34d" fontSize="12.5" fontWeight="700">SAME-DAY WATCH-OUTS</text>
        <text x="70" y="322" fill="#ef4444" fontSize="14" fontWeight="800">✗</text>
        <text x="90" y="322" fill="#e2e8f0" fontSize="11.5">92250 fundus photos + OCT (92133/92134) same eye — generally mutually exclusive (-59 on 92250 only if truly separate &amp; necessary)</text>
        <text x="70" y="352" fill="#ef4444" fontSize="14" fontWeight="800">✗</text>
        <text x="90" y="352" fill="#e2e8f0" fontSize="11.5">92083 visual field + 92133 RNFL OCT same day — LCDs call this not medically necessary. Alternate the visits.</text>
        <text x="70" y="382" fill="#ef4444" fontSize="14" fontWeight="800">✗</text>
        <text x="90" y="382" fill="#e2e8f0" fontSize="11.5">92250 photos with 92242 — photos are BUNDLED into the combined angiography code. Never bill separately.</text>
        <text x="70" y="412" fill="#22c55e" fontSize="14" fontWeight="800">✓</text>
        <text x="90" y="412" fill="#e2e8f0" fontSize="11.5">92083 visual field + 92134 macular OCT same day — both billable (e.g., Plaquenil screening: exam + 10-2 VF + OCT).</text>
        <text x="70" y="442" fill="#22c55e" fontSize="14" fontWeight="800">✓</text>
        <text x="90" y="442" fill="#e2e8f0" fontSize="11.5">One OCT + FA (or 92242) same day — different modality families, both billable when each is medically necessary.</text>
      </svg>
      <div style={{ marginTop: 4, padding: "10px 14px", background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, minHeight: 22, fontSize: "0.8rem", color: S.text }}>
        {detail ? (
          <span><span style={{ fontFamily: S.mono, fontWeight: 700, color: S.accentLight }}>{detail.code}</span> {"—"} {detail.desc}{detail.note ? ` — ${detail.note}` : ""}</span>
        ) : (
          <span style={{ color: S.muted, fontStyle: "italic" }}>Hover a code for its description · click to open it in Browse.</span>
        )}
      </div>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────
export default function CptReference({ onBack }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [view, setView] = useState("search"); // "search" | "diagram" | "ai"
  const [mapView, setMapView] = useState("surgery"); // "surgery" | "modifiers" | "imaging"

  const filtered = useMemo(() => {
    let list = CPT_CATALOG;
    if (category !== "all") {
      list = list.filter((c) => c.cat === category);
    }
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter((c) =>
        `${c.code} ${c.desc} ${c.note}`.toLowerCase().includes(q)
      );
    }
    return list;
  }, [search, category]);

  const globalColor = (g) => {
    if (!g) return S.muted;
    if (g.includes("90")) return "#ef4444";
    if (g.includes("10")) return "#eab308";
    if (g.includes("0 day") || g.includes("XXX")) return "#22c55e";
    return S.muted;
  };

  return (
    <div style={{ minHeight: "100vh", background: S.bg, fontFamily: S.font, color: S.text }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: S.accentLight, cursor: "pointer", fontSize: "0.9rem", fontFamily: S.font }}
        >
          &larr; Back
        </button>
        <div style={{ fontSize: "1.15rem", fontWeight: 700, color: S.bright }}>Retina Surgery CPT Reference</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 3, background: S.bg, borderRadius: 8, padding: 3 }}>
          {[
            { id: "search", label: "Browse", bg: S.accent },
            { id: "ai", label: "Ask AI", bg: "#8b5cf6" },
            { id: "diagram", label: "Visual", bg: "#f59e0b" },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              style={{
                padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: "0.73rem",
                fontFamily: S.font, fontWeight: 600,
                background: view === v.id ? v.bg : "transparent",
                color: view === v.id ? "#fff" : S.muted,
              }}
            >{v.label}</button>
          ))}
        </div>
      </div>

      {view === "ai" && <AICodingAssistant showReimbursement={false} />}
      {view === "diagram" && (() => {
        const pick = (code) => { setSearch(code); setCategory("all"); setExpanded(code); setView("search"); };
        return (
          <div>
            <div style={{ display: "flex", gap: 6, justifyContent: "center", paddingTop: 16 }}>
              {[
                { id: "surgery", label: "Surgery codes" },
                { id: "modifiers", label: "-25 vs -57" },
                { id: "imaging", label: "Imaging rules" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMapView(m.id)}
                  style={{
                    padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontSize: "0.75rem",
                    fontFamily: S.font, fontWeight: 600,
                    border: mapView === m.id ? "1px solid #f59e0b" : `1px solid ${S.border}`,
                    background: mapView === m.id ? "#f59e0b22" : "transparent",
                    color: mapView === m.id ? "#fcd34d" : S.muted,
                  }}
                >{m.label}</button>
              ))}
            </div>
            {mapView === "surgery" && <SurgicalCodeMap onPick={pick} />}
            {mapView === "modifiers" && <ModifierMap onPick={pick} />}
            {mapView === "imaging" && <ImagingMap onPick={pick} />}
          </div>
        );
      })()}

      {view === "search" && <>
      {/* Search */}
      <div style={{ padding: "16px 20px 8px", maxWidth: 800, margin: "0 auto" }}>
        <input
          type="text"
          placeholder="Search by code, name, or keyword — e.g. 67042, ILM peel, injection, OCT"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "14px 18px",
            background: S.card,
            border: `1px solid ${S.border}`,
            borderRadius: 12,
            color: S.bright,
            fontSize: "1.05rem",
            fontFamily: S.font,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <div style={{ fontSize: "0.72rem", color: S.muted, marginTop: 6, fontFamily: S.mono }}>
          Search any retina code by number, description, or note — or browse by category below.
        </div>
      </div>

      {/* Category pills */}
      <div style={{ padding: "8px 20px 12px", display: "flex", flexWrap: "wrap", gap: 6, maxWidth: 800, margin: "0 auto" }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            style={{
              padding: "5px 12px",
              borderRadius: 20,
              border: category === cat.id ? `1px solid ${S.accent}` : `1px solid ${S.border}`,
              background: category === cat.id ? S.accent + "22" : "transparent",
              color: category === cat.id ? S.accentLight : S.muted,
              fontSize: "0.75rem",
              fontFamily: S.font,
              cursor: "pointer",
              fontWeight: category === cat.id ? 600 : 400,
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Results */}
      <div style={{ padding: "0 20px 48px", maxWidth: 800, margin: "0 auto" }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", color: S.muted, padding: "40px 0", fontSize: "0.9rem" }}>
            No codes found. Try a different search or category.
          </div>
        )}
        {filtered.map((cpt) => {
          const isOpen = expanded === cpt.code;
          return (
            <div
              key={cpt.code}
              style={{
                background: S.card,
                border: `1px solid ${isOpen ? S.accent + "66" : S.border}`,
                borderRadius: 10,
                marginBottom: 8,
                overflow: "hidden",
                transition: "border-color 0.2s",
              }}
            >
              {/* Summary row */}
              <button
                onClick={() => setExpanded(isOpen ? null : cpt.code)}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    fontFamily: S.mono,
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: S.accentLight,
                    minWidth: 58,
                    flexShrink: 0,
                    paddingTop: 1,
                  }}
                >
                  {cpt.code}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: S.bright, fontSize: "0.88rem", lineHeight: 1.4 }}>
                    {cpt.desc}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        padding: "2px 8px",
                        borderRadius: 10,
                        background: S.accent + "22",
                        color: S.accentLight,
                        fontFamily: S.mono,
                      }}
                    >
                      {cpt.cat}
                    </span>
                    {cpt.global && cpt.global !== "N/A" && (
                      <span
                        style={{
                          fontSize: "0.68rem",
                          padding: "2px 8px",
                          borderRadius: 10,
                          background: globalColor(cpt.global) + "22",
                          color: globalColor(cpt.global),
                          fontFamily: S.mono,
                        }}
                      >
                        {cpt.global}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ color: S.muted, fontSize: "1rem", flexShrink: 0, paddingTop: 2 }}>
                  {isOpen ? "▲" : "▼"}
                </div>
              </button>

              {/* Expanded details */}
              {isOpen && (
                <div
                  style={{
                    padding: "0 16px 16px",
                    borderTop: `1px solid ${S.border}`,
                    marginTop: 0,
                  }}
                >
                  {cpt.global && (
                    <DetailSection label="Global Period" text={
                      cpt.global === "XXX" ? "N/A — global concept does not apply" :
                      cpt.global === "ZZZ" ? "Add-on code (no separate global)" :
                      cpt.global === "YYY" ? "Carrier-determined" :
                      cpt.global + "-day global"
                    } />
                  )}
                  {cpt.note && (
                    <DetailSection label="Notes" text={cpt.note} color="#eab308" />
                  )}
                  {!cpt.note && !cpt.global && (
                    <div style={{ fontSize: "0.8rem", color: S.muted, marginTop: 12 }}>
                      No additional notes. Ask the AI Coding Assistant for bundling, modifiers, or reimbursement.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      </>}
    </div>
  );
}

function DetailSection({ label, text, color }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          fontSize: "0.7rem",
          fontWeight: 600,
          color: color || S.muted,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "0.82rem", color: S.text, lineHeight: 1.55 }}>{text}</div>
    </div>
  );
}

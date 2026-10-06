import { useState, useMemo, useRef, useEffect } from "react";
import { CPT_CATALOG, CPT_CATEGORIES } from "./cptCatalog";
import { S, T, chip, btnSm, field, fieldLabel } from "./theme.js";
import PageBar, { segWrap, segBtn, wrap, searchInput } from "./PageBar.jsx";
import { SendIcon, ChevronDownIcon, SearchIcon } from "./icons.jsx";

// ── Styles (shared palette with the rest of the app) ────────────────

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

  // Fill from wherever this component sits down to the bottom of the viewport, so the
  // input box is always on-screen without page-scrolling — regardless of how much
  // chrome is above it (the note-generator embed has a taller header than the
  // standalone CPT-reference view, which the old fixed "100vh - 70px" didn't handle).
  const containerRef = useRef(null);
  const [maxH, setMaxH] = useState("calc(100dvh - 70px)");
  useEffect(() => {
    const measure = () => {
      const el = containerRef.current;
      if (el) setMaxH(`calc(100dvh - ${Math.round(el.getBoundingClientRect().top)}px)`);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

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
      let rendered = line.replace(/\*\*(.+?)\*\*/g, `<strong style="color:${T.ink};font-weight:600">$1</strong>`);
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

  const hasInput = !!input.trim();
  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", height: maxH, maxWidth: 880, margin: "0 auto", fontFamily: T.sans }}>
      {/* Chat messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 0 12px" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", marginTop: 48, color: T.muted, padding: "0 8px" }}>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8, color: T.accent }}>AI Coding Assistant</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.6, maxWidth: 500, margin: "0 auto", color: T.ink2 }}>
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
                    padding: "6px 12px", borderRadius: 999, border: `1px solid ${T.line}`,
                    background: T.surface, color: T.ink, fontSize: 12.5, cursor: "pointer",
                    fontFamily: T.sans, transition: "border-color .15s",
                  }}
                  onMouseOver={(e) => e.target.style.borderColor = T.accentLine}
                  onMouseOut={(e) => e.target.style.borderColor = T.line}
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
              borderRadius: msg.role === "user" ? "10px 10px 3px 10px" : "10px 10px 10px 3px",
              background: msg.role === "user" ? T.accentSoft : T.surface,
              color: T.ink,
              fontSize: 13.5,
              lineHeight: 1.55,
              fontFamily: T.sans,
              border: `1px solid ${msg.role === "user" ? T.accentLine : T.line}`,
              overflowWrap: "anywhere",
            }}>
              {msg.role === "user" ? msg.content : renderContent(msg.content)}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
            <div style={{
              padding: "10px 14px", borderRadius: "10px 10px 10px 3px",
              background: T.surface, border: `1px solid ${T.line}`,
              fontSize: 13.5, color: T.muted,
            }}>
              Thinking...
            </div>
          </div>
        )}

        <div ref={(el) => { chatEndRef.current = el; }} />
      </div>

      {/* Input area — editor-footer style bar pinned to the bottom of the panel */}
      <div className="vra-editor" style={{
        background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.rLg,
        overflow: "hidden", marginBottom: 16, flexShrink: 0,
      }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your case or ask a billing question..."
          rows={1}
          style={{
            display: "block", width: "100%", padding: "12px 14px", background: "transparent", border: 0,
            color: T.ink, fontSize: 14, fontFamily: T.sans, boxSizing: "border-box",
            outline: "none", resize: "none", lineHeight: 1.45,
            minHeight: 44, maxHeight: 120,
          }}
          onInput={(e) => {
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderTop: `1px solid ${T.line}`, background: T.paper }}>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              style={btnSm("secondary", { color: T.ink2 })}
              title="Clear chat"
            >Clear</button>
          )}
          <span style={{ fontSize: 12, color: T.muted, flex: 1, minWidth: 0 }}>Enter to send · Shift+Enter for a new line</span>
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={btnSm("primary", {
              background: loading || !hasInput ? T.accentSoft : T.accent,
              borderColor: loading || !hasInput ? T.line : T.accent,
              color: loading || !hasInput ? T.muted : T.onAccent,
              cursor: loading || !hasInput ? "default" : "pointer",
            })}
          >Send<SendIcon size={14} /></button>
        </div>
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
        <rect x={x} y={y} width="300" height="34" rx="8" fill={on ? T.accentSoft : T.surface} stroke={on ? color : T.line} />
        <rect x={x} y={y} width="4" height="34" fill={color} />
        <text x={x + 16} y={y + 22} fill={T.ink} fontSize="11.5">{leaf.label}</text>
        <rect x={x + 238} y={y + 6} width="52" height="22" rx="6" fill={T.paper} stroke={color} />
        <text x={x + 264} y={y + 21} textAnchor="middle" fill={light} fontSize="12" fontFamily={T.mono}>{leaf.code}</text>
      </g>
    );
  };
  return (
    <div style={{ padding: "16px 0 0" }}>
      <svg viewBox="0 0 760 470" style={{ width: "100%", height: "auto" }} fontFamily={T.sans}>
        <text x="24" y="30" fill={T.accent} fontSize="16" fontWeight="600">Surgical Code Selection</text>
        <text x="24" y="49" fill={S.muted} fontSize="12">Vitrectomy &amp; retinal detachment — which 67xxx code?</text>
        <circle cx="566" cy="26" r="5" fill={T.red} /><text x="576" y="30" fill={S.muted} fontSize="11">RD repair</text>
        <circle cx="566" cy="45" r="5" fill={T.accent} /><text x="576" y="49" fill={S.muted} fontSize="11">PPV — other</text>
        <rect x="300" y="70" width="160" height="40" rx="10" fill={T.surface} stroke={T.lineStrong} />
        <text x="380" y="95" textAnchor="middle" fill={T.ink} fontSize="12.5" fontWeight="600">Reason for surgery?</text>
        <path d="M340 110 C 280 124, 230 126, 190 144" fill="none" stroke={T.lineStrong} strokeWidth="1.5" />
        <path d="M420 110 C 480 124, 530 126, 570 144" fill="none" stroke={T.lineStrong} strokeWidth="1.5" />
        <rect x="90" y="144" width="200" height="30" rx="8" fill={T.redSoft} stroke={T.red} />
        <text x="190" y="164" textAnchor="middle" fill={T.red} fontSize="12" fontWeight="700">RETINAL DETACHMENT</text>
        <rect x="470" y="144" width="200" height="30" rx="8" fill={T.accentSoft} stroke={T.accent} />
        <text x="570" y="164" textAnchor="middle" fill={T.accent} fontSize="12" fontWeight="700">PPV — NON-RD</text>
        {RD_LEAVES.map((l, i) => <Leaf key={l.code} x={40} y={190 + i * 42} leaf={l} color={T.red} light={T.red} />)}
        {PPV_LEAVES.map((l, i) => <Leaf key={l.code} x={420} y={190 + i * 42} leaf={l} color={T.accent} light={T.accent} />)}
        <line x1="40" y1="452" x2="720" y2="452" stroke={T.line} strokeWidth="1" />
      </svg>
      <div style={field({ marginTop: 4, padding: "10px 14px", minHeight: 22, fontSize: 13, color: T.ink, fontFamily: T.sans })}>
        {detail ? (
          <span><span style={{ fontFamily: T.mono, fontWeight: 500, color: T.accent }}>{detail.code}</span> {"—"} {detail.desc} <span style={{ color: S.muted }}>({globalLabel(detail.global)})</span>{detail.note ? ` — ${detail.note}` : ""}</span>
        ) : (
          <span style={{ color: S.muted, fontStyle: "italic" }}>Hover a code for its description · click to open it in Browse.</span>
        )}
      </div>
      <div style={{ marginTop: 10, fontSize: 13, color: T.ink2, lineHeight: 1.6, fontFamily: T.sans }}>
        <span style={{ color: T.amber, fontWeight: 600 }}>Key rules: </span>
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
        <rect x={x} y={y} width="300" height="32" rx="8" fill={on ? T.accentSoft : T.surface} stroke={on ? color : T.line} />
        <rect x={x} y={y} width="4" height="32" fill={color} />
        <text x={x + 16} y={y + 21} fill={T.ink} fontSize="11.5">{leaf.label}</text>
        <rect x={x + 238} y={y + 5} width="52" height="22" rx="6" fill={T.paper} stroke={color} />
        <text x={x + 264} y={y + 20} textAnchor="middle" fill={light} fontSize="12" fontFamily={T.mono}>{leaf.code}</text>
      </g>
    );
  };
  return (
    <div style={{ padding: "16px 0 0" }}>
      <svg viewBox="0 0 760 480" style={{ width: "100%", height: "auto" }} fontFamily={T.sans}>
        <text x="24" y="30" fill={T.accent} fontSize="16" fontWeight="600">-25 vs -57 — Which modifier goes on the E/M?</text>
        <text x="24" y="49" fill={S.muted} fontSize="12">Decided ONLY by the global period of the procedure billed today — never by how urgent the visit was.</text>
        <rect x="255" y="66" width="250" height="40" rx="10" fill={T.surface} stroke={T.lineStrong} />
        <text x="380" y="91" textAnchor="middle" fill={T.ink} fontSize="12.5" fontWeight="600">Procedure performed at TODAY's visit?</text>
        <path d="M310 106 C 250 118, 210 120, 175 138" fill="none" stroke={T.lineStrong} strokeWidth="1.5" />
        <path d="M450 106 C 510 118, 550 120, 585 138" fill="none" stroke={T.lineStrong} strokeWidth="1.5" />
        <rect x="80" y="138" width="190" height="30" rx="8" fill={T.greenSoft} stroke={T.green} />
        <text x="175" y="158" textAnchor="middle" fill={T.green} fontSize="12" fontWeight="700">NO — E/M alone, no modifier</text>
        <rect x="490" y="138" width="190" height="30" rx="8" fill={T.amberSoft} stroke={T.amber} />
        <text x="585" y="158" textAnchor="middle" fill={T.amber} fontSize="12" fontWeight="700">YES — check its GLOBAL period</text>
        <path d="M540 168 C 470 184, 330 186, 210 204" fill="none" stroke={T.lineStrong} strokeWidth="1.5" />
        <path d="M630 168 C 660 184, 665 186, 640 204" fill="none" stroke={T.lineStrong} strokeWidth="1.5" />
        <rect x="60" y="204" width="300" height="34" rx="8" fill={T.amberSoft} stroke={T.amber} />
        <text x="210" y="226" textAnchor="middle" fill={T.amber} fontSize="13" fontWeight="800">0- or 10-day global → -25</text>
        <rect x="420" y="204" width="300" height="34" rx="8" fill={T.redSoft} stroke={T.red} />
        <text x="570" y="226" textAnchor="middle" fill={T.red} fontSize="13" fontWeight="800">90-day global → -57</text>
        {MINOR_LEAVES.map((l, i) => <Leaf key={l.code} x={60} y={252 + i * 40} leaf={l} color={T.amber} light={T.amber} />)}
        {MAJOR_LEAVES.map((l, i) => <Leaf key={l.code} x={420} y={252 + i * 40} leaf={l} color={T.red} light={T.red} />)}
        <line x1="40" y1="462" x2="720" y2="462" stroke={T.line} strokeWidth="1" />
      </svg>
      <div style={field({ marginTop: 4, padding: "10px 14px", minHeight: 22, fontSize: 13, color: T.ink, fontFamily: T.sans })}>
        {detail ? (
          <span><span style={{ fontFamily: T.mono, fontWeight: 500, color: T.accent }}>{detail.code}</span> {"—"} {detail.desc}{detail.note ? ` — ${detail.note}` : ""}</span>
        ) : (
          <span style={{ color: S.muted, fontStyle: "italic" }}>Hover a code for its description · click to open it in Browse.</span>
        )}
      </div>
      <div style={{ marginTop: 10, fontSize: 13, color: T.ink2, lineHeight: 1.6, fontFamily: T.sans }}>
        <span style={{ color: T.amber, fontWeight: 600 }}>Key rules: </span>
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
        <rect x={x} y={y} width={w} height="32" rx="8" fill={on ? T.accentSoft : T.surface} stroke={on ? color : T.line} />
        <rect x={x} y={y} width="4" height="32" fill={color} />
        <text x={x + 16} y={y + 21} fill={T.ink} fontSize="11.5">{leaf.label}</text>
        <rect x={x + w - 62} y={y + 5} width="52" height="22" rx="6" fill={T.paper} stroke={color} />
        <text x={x + w - 36} y={y + 20} textAnchor="middle" fill={light} fontSize="12" fontFamily={T.mono}>{leaf.code}</text>
      </g>
    );
  };
  return (
    <div style={{ padding: "16px 0 0" }}>
      <svg viewBox="0 0 760 500" style={{ width: "100%", height: "auto" }} fontFamily={T.sans}>
        <text x="24" y="30" fill={T.accent} fontSize="16" fontWeight="600">Imaging — what can share a visit?</text>
        <text x="24" y="49" fill={S.muted} fontSize="12">All of these are inherently bilateral: ONE unit whether one or both eyes — never -RT/-LT/-50.</text>
        <rect x="40" y="70" width="330" height="180" rx="10" fill={T.redSoft} stroke={T.red} />
        <text x="56" y="94" fill={T.red} fontSize="12.5" fontWeight="700">OCT FAMILY — pick ONE per visit</text>
        <text x="56" y="110" fill={S.muted} fontSize="10.5">92133 / 92134 / 92137 are mutually exclusive</text>
        {OCT_LEAVES.map((l, i) => <Leaf key={l.code} x={56} y={120 + i * 40} leaf={l} color={T.red} light={T.red} w={298} />)}
        <rect x="400" y="70" width="330" height="180" rx="10" fill={T.accentSoft} stroke={T.accent} />
        <text x="416" y="94" fill={T.accent} fontSize="12.5" fontWeight="700">ANGIOGRAPHY — combined code rule</text>
        <text x="416" y="110" fill={S.muted} fontSize="10.5">Both dyes same session → bill 92242 ONLY, never 92235 + 92240</text>
        {ANGIO_LEAVES.map((l, i) => <Leaf key={l.code} x={416} y={120 + i * 40} leaf={l} color={T.accent} light={T.accent} w={298} />)}
        <rect x="40" y="270" width="690" height="200" rx="10" fill={T.amberSoft} stroke={T.amber} />
        <text x="56" y="294" fill={T.amber} fontSize="12.5" fontWeight="700">SAME-DAY WATCH-OUTS</text>
        <text x="70" y="322" fill={T.red} fontSize="14" fontWeight="800">✗</text>
        <text x="90" y="322" fill={T.ink} fontSize="11.5">92250 fundus photos + OCT (92133/92134) same eye — generally mutually exclusive (-59 on 92250 only if truly separate &amp; necessary)</text>
        <text x="70" y="352" fill={T.red} fontSize="14" fontWeight="800">✗</text>
        <text x="90" y="352" fill={T.ink} fontSize="11.5">92083 visual field + 92133 RNFL OCT same day — LCDs call this not medically necessary. Alternate the visits.</text>
        <text x="70" y="382" fill={T.red} fontSize="14" fontWeight="800">✗</text>
        <text x="90" y="382" fill={T.ink} fontSize="11.5">92250 photos with 92242 — photos are BUNDLED into the combined angiography code. Never bill separately.</text>
        <text x="70" y="412" fill={T.green} fontSize="14" fontWeight="800">✓</text>
        <text x="90" y="412" fill={T.ink} fontSize="11.5">92083 visual field + 92134 macular OCT same day — both billable (e.g., Plaquenil screening: exam + 10-2 VF + OCT).</text>
        <text x="70" y="442" fill={T.green} fontSize="14" fontWeight="800">✓</text>
        <text x="90" y="442" fill={T.ink} fontSize="11.5">One OCT + FA (or 92242) same day — different modality families, both billable when each is medically necessary.</text>
      </svg>
      <div style={field({ marginTop: 4, padding: "10px 14px", minHeight: 22, fontSize: 13, color: T.ink, fontFamily: T.sans })}>
        {detail ? (
          <span><span style={{ fontFamily: T.mono, fontWeight: 500, color: T.accent }}>{detail.code}</span> {"—"} {detail.desc}{detail.note ? ` — ${detail.note}` : ""}</span>
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
    if (g.includes("90")) return T.red;
    if (g.includes("10")) return T.amber;
    if (g.includes("0 day") || g.includes("XXX")) return T.green;
    return S.muted;
  };

  return (
    <div style={{ minHeight: "100vh", background: T.paper, fontFamily: T.sans, color: T.ink }}>
      {/* Header */}
      <PageBar onBack={onBack} title="Retina Surgery CPT Reference" />

      {/* View switch — segmented control */}
      <div className="vra-wrap" style={wrap({ paddingTop: 20 })}>
        <div className="vra-seg" role="group" aria-label="View" style={segWrap}>
          {[
            { id: "search", label: "Browse", bg: S.accent },
            { id: "ai", label: "Ask AI", bg: S.accent },
            { id: "diagram", label: "Visual", bg: S.accent },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              aria-pressed={view === v.id}
              style={segBtn(view === v.id, { background: view === v.id ? v.bg : "transparent" })}
            >{v.label}</button>
          ))}
        </div>
      </div>

      {view === "ai" && <div className="vra-wrap" style={wrap()}><AICodingAssistant showReimbursement={false} /></div>}
      {view === "diagram" && (() => {
        const pick = (code) => { setSearch(code); setCategory("all"); setExpanded(code); setView("search"); };
        return (
          <div className="vra-wrap" style={wrap({ paddingBottom: 40 })}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingTop: 16 }}>
              {[
                { id: "surgery", label: "Surgery codes" },
                { id: "modifiers", label: "-25 vs -57" },
                { id: "imaging", label: "Imaging rules" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMapView(m.id)}
                  aria-pressed={mapView === m.id}
                  style={chip(mapView === m.id ? "accent" : "muted", {
                    padding: "5px 12px", fontSize: 12.5, cursor: "pointer",
                    ...(mapView === m.id ? { background: T.accent, color: T.onAccent, borderColor: T.accent } : { background: T.surface, color: T.ink2 }),
                  })}
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
      <div className="vra-wrap" style={wrap({ paddingTop: 16 })}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 13, top: 13, color: T.muted, pointerEvents: "none" }}><SearchIcon /></span>
          <input
            type="text"
            className="vra-input"
            placeholder="Search by code, name, or keyword — e.g. 67042, ILM peel, injection, OCT"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={searchInput({ paddingLeft: 38, textOverflow: "ellipsis" })}
          />
        </div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 6, fontFamily: T.sans }}>
          Search any retina code by number, description, or note — or browse by category below.
        </div>
      </div>

      {/* Category chips */}
      <div className="vra-wrap" style={wrap({ paddingTop: 12, paddingBottom: 14, display: "flex", flexWrap: "wrap", gap: 6 })}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            aria-pressed={category === cat.id}
            style={chip(category === cat.id ? "accent" : "muted", {
              padding: "4px 11px", fontSize: 12.5, cursor: "pointer",
              ...(category === cat.id
                ? { background: T.accent, color: T.onAccent, borderColor: T.accent }
                : { background: T.surface, color: T.ink2, fontWeight: 400 }),
            })}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="vra-wrap" style={wrap({ paddingBottom: 48 })}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", color: T.muted, padding: "40px 0", fontSize: 14 }}>
            No codes found. Try a different search or category.
          </div>
        )}
        {filtered.map((cpt) => {
          const isOpen = expanded === cpt.code;
          return (
            <div
              key={cpt.code}
              style={{
                background: T.surface,
                border: `1px solid ${isOpen ? T.accentLine : T.line}`,
                borderRadius: T.rLg,
                marginBottom: 8,
                overflow: "hidden",
                transition: "border-color .15s",
              }}
            >
              {/* Summary row */}
              <button
                onClick={() => setExpanded(isOpen ? null : cpt.code)}
                aria-expanded={isOpen}
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 16px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  fontFamily: T.sans,
                }}
              >
                <div
                  style={{
                    fontFamily: T.mono,
                    fontSize: 14,
                    fontWeight: 500,
                    color: T.accent,
                    minWidth: 52,
                    flexShrink: 0,
                    paddingTop: 1,
                  }}
                >
                  {cpt.code}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: T.ink, fontSize: 14, lineHeight: 1.45 }}>
                    {cpt.desc}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
                    <span style={chip("accent")}>
                      {cpt.cat}
                    </span>
                    {cpt.global && cpt.global !== "N/A" && (
                      <span
                        style={chip(({ [T.red]: "red", [T.amber]: "amber", [T.green]: "green" }[globalColor(cpt.global)] || "muted"), { fontFamily: T.mono, fontWeight: 500 })}
                      >
                        {cpt.global}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ color: T.muted, flexShrink: 0, paddingTop: 2, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
                  <ChevronDownIcon />
                </div>
              </button>

              {/* Expanded details — field-style sub-card */}
              {isOpen && (
                <div style={{ padding: "0 14px 14px 16px" }}>
                  <div style={field({ background: T.paper, padding: "4px 14px 12px" })}>
                    {cpt.global && (
                      <DetailSection label="Global period" text={
                        cpt.global === "XXX" ? "N/A — global concept does not apply" :
                        cpt.global === "ZZZ" ? "Add-on code (no separate global)" :
                        cpt.global === "YYY" ? "Carrier-determined" :
                        cpt.global + "-day global"
                      } />
                    )}
                    {cpt.note && (
                      <DetailSection label="Notes" text={cpt.note} color={T.amber} />
                    )}
                    {!cpt.note && !cpt.global && (
                      <div style={{ fontSize: 13, color: T.muted, marginTop: 10 }}>
                        No additional notes. Ask the AI Coding Assistant for bundling, modifiers, or reimbursement.
                      </div>
                    )}
                  </div>
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
    <div style={{ marginTop: 10, fontFamily: T.sans }}>
      <div
        style={{
          fontSize: 12.5,
          fontWeight: color ? 600 : 400,
          color: color || T.muted,
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.55 }}>{text}</div>
    </div>
  );
}

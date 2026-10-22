// ── Coverage card (Oct 20 2026, owner decision A — Mari) ─────────────────────
// The hub's coverage card looks like Retina-Rx's result card (retina-rx
// public/index.html .result-card / buildCard): whole card tinted by tier, a solid
// icon circle + status label + headline, requirement tags in Retina-Rx's colors,
// the step-therapy pathway strip (each drug with its real PA status; no rule notes), small Drug / Plan boxes (no patient data), one
// billing-alert box with a single icon, Retina-Rx's dual-insurance banner, and a
// yellow "No Data" card when the plan is not identified or no rule is on file.
// Avastin-only rules (Mari, Oct 22 2026) also show Retina-Rx's note text in one compact
// line right under the status (one line on the phone, the whole text under "More").
// Phone (max-width 600px): Retina-Rx's one-line status, the key requirement and the
// J-code; everything else behind "More". Still at the bottom of the output, and the
// on-screen icons are drawn SVG — the copied note text carries words only.
import { useState } from "react";
import { T } from "./theme.js";
import PhoneText from "./PhoneText.jsx";
import { coverageTier, requirementTags, keyRequirement, jCodeText, cardSteps, paLabel, stepDrugText, stepHeader, isTodayDrug, stepPossibleNote, nextOptionGroups, stripLeadingSymbols, avastinOnlyNoteText, mergedPlanSub } from "./lib/coverageCard.js";

// Tier tone → [solid, soft, line] (Retina-Rx --green/--amber/--orange/--red + -soft/-line).
const TONE = {
  green: [T.green, T.greenSoft, T.greenLine],
  amber: [T.amber, T.amberSoft, T.amberLine],
  orange: [T.orange, T.orangeSoft, T.orangeLine],
  red: [T.red, T.redSoft, T.redLine],
  info: [T.accent, T.accentSoft, T.accentLine],
};
const BANNER_TONE = { info: "info", green: "green", yellow: "amber", orange: "orange", red: "red" };
const BANNER_ICON = { info: "info", green: "check", yellow: "alert", orange: "alert", red: "ban" };

// Retina-Rx buildCard status icons (white strokes on the solid circle) and cbSvg banner icons.
function StatusIcon({ kind }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {kind === "check" && <path d="M5 12l5 5 9-10" />}
      {kind === "alert" && <><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17h.01" /></>}
      {kind === "ban" && <><circle cx="12" cy="12" r="8" /><path d="M6.5 6.5l11 11" /></>}
    </svg>
  );
}
function SmallIcon({ kind, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none", marginTop: 2 }}>
      {kind === "check" && <path d="M5 12l5 5 9-10" />}
      {kind === "alert" && <><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18h.01" /></>}
      {kind === "ban" && <><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></>}
      {kind === "info" && <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5h.01" /></>}
    </svg>
  );
}

// Class-based so the phone layout can swap pieces with a media query (Retina-Rx's @media (max-width: 600px)).
export const COVERAGE_CSS = `
.cov-card{border:1px solid ${T.line};border-radius:12px;overflow:hidden;margin-top:12px;min-width:0;font-family:${T.sans}}
.cov-head{display:flex;align-items:center;gap:14px;padding:14px 18px;border-bottom:1px solid ${T.line}}
.cov-icon{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;flex:none}
.cov-titles{flex:1 1 0;min-width:0}
.cov-label{font-size:12px;font-weight:600;line-height:1.3}
.cov-headline{font-size:18px;font-weight:600;line-height:1.3;color:${T.ink}}
.cov-source{margin-left:auto;font-size:12.5px;color:${T.muted};text-align:right;max-width:45%;overflow-wrap:anywhere}
.cov-body{padding:16px 18px;display:flex;flex-direction:column;gap:12px}
.cov-banner{display:flex;align-items:flex-start;gap:10px;border-radius:8px;padding:10px 14px;font-size:13px;line-height:1.5;border:1px solid;overflow-wrap:anywhere}
.cov-alert{display:flex;gap:10px;align-items:flex-start;background:${T.amberSoft};border:1px solid ${T.goldSoft};color:${T.amber};border-radius:8px;padding:9px 12px;font-size:13px;line-height:1.5;overflow-wrap:anywhere}
.cov-alert-lines>div+div{margin-top:4px}
.cov-ctx{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.cov-chip{background:${T.surface};border:1px solid ${T.line};border-radius:8px;padding:8px 10px;min-width:0}
.cov-chip span:first-child{display:block;font-size:11.5px;color:${T.muted}}
.cov-chip span:last-child{display:block;font-size:13px;font-weight:500;color:${T.ink};overflow-wrap:anywhere}
.cov-tags{display:flex;flex-wrap:wrap;gap:6px}
.cov-tag{font-size:12.5px;padding:3px 10px;border-radius:999px;line-height:1.4;border:1px solid}
.cov-tag.info{background:${T.accentSoft};color:${T.accent};border-color:${T.accentLine}}
.cov-tag.pa-yes{background:${T.amberSoft};color:${T.amber};border-color:${T.amberLine}}
.cov-tag.pa-no{background:${T.greenSoft};color:${T.green};border-color:${T.greenLine}}
.cov-tag.ref-yes{background:${T.plumSoft};color:${T.plum};border-color:${T.plumLine}}
.cov-tag.ref-no{background:${T.surface};color:${T.muted};border-color:${T.line}}
.cov-tag.oon{background:${T.redSoft};color:${T.red};border-color:${T.redLine}}
.rc-pa-yes{color:${T.amber}}.rc-pa-no{color:${T.green}}.rc-ref-yes{color:${T.plum}}.rc-ref-no{color:${T.muted};font-weight:400}.rc-oon{color:${T.red}}.rc-info{color:${T.accent}}
.cov-ao{background:${T.surface};border:1px solid ${T.line};border-radius:8px;padding:8px 12px;font-size:13.5px;line-height:1.5;color:${T.ink};overflow-wrap:anywhere}
.cov-ao b{font-weight:600}
.cov-notes{margin:0;font-size:13.5px;line-height:1.6;color:${T.ink2};overflow-wrap:anywhere}
.cov-plans{display:flex;gap:6px;flex-wrap:wrap}
.cov-plan{font-size:12px;padding:2px 10px;border-radius:999px;background:${T.surface};color:${T.ink2};border:1px solid ${T.line}}
.cov-dualnote{font-size:12px;color:${T.muted};line-height:1.45}
.cov-st{background:${T.surface};border:1px solid ${T.line};border-radius:10px;padding:12px 14px}
.cov-st-title{font-size:12.5px;color:${T.muted};margin-bottom:8px;line-height:1.45}
.cov-st-row{display:flex;align-items:stretch}
.cov-st-step{flex:1 1 0;min-width:0;border-radius:8px;padding:8px 10px;border:1px solid}
.cov-st-pill{display:inline-block;font-size:11px;font-weight:600;line-height:1.5;border-radius:999px;padding:0 8px;margin-bottom:5px;white-space:nowrap;color:#fff}
.cov-st-drugs{display:flex;flex-direction:column;gap:4px}
.cov-st-drugline{display:flex;flex-direction:column}
.cov-st-drug{font-size:13px;font-weight:500;color:${T.ink};line-height:1.35;overflow-wrap:anywhere}
.cov-st-drug.today{font-weight:700}
.cov-st-today{display:inline-block;margin-left:6px;font-size:10.5px;font-weight:600;line-height:1.5;padding:0 6px;border-radius:999px;background:${T.accent};color:#fff;vertical-align:1px;white-space:nowrap}
.cov-st-desc{font-size:11.5px;margin-top:1px;font-weight:500}
.cov-st-arrow{display:flex;align-items:center;color:${T.accentLine};font-size:16px;padding:0 6px}
.cov-st-note{background:${T.surface};border:1px solid ${T.line};border-radius:10px;padding:9px 14px;font-size:13px;color:${T.ink2};line-height:1.45}
.cov-next{background:${T.surface};border:1px solid ${T.line};border-radius:10px;padding:10px 14px}
.cov-next-title{font-size:12.5px;color:${T.muted};margin-bottom:6px;line-height:1.45}
.cov-next-row{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13px;line-height:1.45}
.cov-next-row b{font-weight:600}
.cov-next-row span{color:${T.ink};overflow-wrap:anywhere}
.cov-foot{padding:8px 18px;border-top:1px solid ${T.line};background:${T.surface};font-size:11.5px;color:${T.muted};display:flex;gap:8px;flex-wrap:wrap}
.cov-foot b{font-weight:600;color:${T.ink2}}
.cov-more{display:flex;flex-direction:column;gap:12px}
.cov-phone,.cov-boxes,.cov-more-btn{display:none}
@media (max-width:600px){
  .cov-head{padding:9px 14px;gap:6px;flex-wrap:wrap}
  .cov-icon,.cov-titles,.cov-source{display:none}
  .cov-source.keep{display:block;order:-1;flex-basis:100%;margin:0;text-align:left;max-width:none;font-size:12px}
  .cov-phone{display:block;font-size:14px;line-height:1.35;color:${T.ink2};min-width:0}
  .cov-phone b{font-weight:600;color:${T.ink};white-space:nowrap}
  .cov-dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:8px;vertical-align:1px}
  .cov-body{padding:12px;gap:10px}
  .cov-alert{padding:7px 10px;gap:7px;font-size:12.5px;line-height:1.4}
  .cov-ao{padding:7px 10px;font-size:12.5px;line-height:1.4;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;overflow:hidden}
  .cov-card.more-open .cov-ao{display:block;-webkit-line-clamp:unset;line-clamp:none}
  .cov-alert svg{width:14px;height:14px;margin-top:1px}
  .cov-banner{padding:8px 10px;font-size:12.5px;line-height:1.45}
  .cov-st{padding:10px 12px}
  .cov-st-row{flex-direction:column;gap:6px}
  .cov-st-arrow,.cov-st-word,.cov-st-here{display:none}
  .cov-st-step{display:flex;align-items:center;gap:9px;padding:7px 10px}
  .cov-st-pill{display:grid;place-items:center;flex:none;width:20px;height:20px;padding:0;margin:0;border-radius:50%}
  .cov-st-drugs{flex:1 1 0;min-width:0}
  .cov-st-drugline{flex-direction:row;align-items:baseline;gap:8px}
  .cov-st-drug{flex:1 1 0;min-width:0}
  .cov-st-desc{flex:none;margin:0;text-align:right;max-width:50%}
  .cov-boxes{display:flex;gap:8px}
  .cov-box{flex:1 1 0;min-width:0;background:${T.surface};border:1px solid ${T.line};border-radius:8px;padding:7px 10px}
  .cov-box span:first-child{display:block;font-size:11.5px;color:${T.muted}}
  .cov-box span:last-child{display:block;font-size:13px;font-weight:500;color:${T.ink};line-height:1.35;overflow-wrap:anywhere}
  .cov-more-btn{display:block;width:100%;text-align:left;background:none;border:0;border-top:1px solid ${T.line};padding:9px 2px 0;margin-top:2px;color:${T.accent};font:inherit;font-size:13.5px;font-weight:500;cursor:pointer;min-height:36px}
  .cov-caret{display:inline-block;transition:transform .15s}
  .cov-card.more-open .cov-caret{transform:rotate(180deg)}
  .cov-card:not(.more-open) .cov-more{display:none}
  .cov-foot{padding:7px 12px}
}
`;

// Retina-Rx step colors: no PA = green; each later PA step one yellow deeper; unknown ("check") =
// neutral grey; a step whose drugs differ = white box, each drug in its own color.
const ST_YELLOWS = [
  { bg: "#FDF6DF", line: "#EEDFAE", pill: "#B08A1A", text: "#8A6D0B" },
  { bg: "#F8E7B0", line: "#E2C56A", pill: "#8A6D0B", text: "#6E5608" },
  { bg: "#F3D98A", line: "#D4AF3F", pill: "#725A08", text: "#5A4706" },
];
const GREEN_STEP = { bg: T.greenSoft, line: T.greenLine, pill: T.green, text: T.green };
const GREY_STEP = { bg: T.paper, line: T.line, pill: T.muted, text: T.muted };
const MIXED_STEP = { bg: T.surface, line: T.line, pill: T.accent, text: T.ink2 };
const RED_STEP = { bg: T.redSoft, line: T.redLine, pill: T.red, text: T.red };
const PA_TEXT = { none: T.green, required: T.amber, notcovered: T.red, unknown: T.muted };
function Pathway({ path, drug }) {
  let paSeen = 0;
  const head = stepHeader(path, drug);
  const colors = path.steps.map((s) => {
    if (s.pa === "none") return GREEN_STEP;
    if (s.pa === "required") { const c = ST_YELLOWS[Math.min(paSeen, ST_YELLOWS.length - 1)]; paSeen++; return c; }
    return s.pa === "mixed" ? MIXED_STEP : s.pa === "notcovered" ? RED_STEP : GREY_STEP;
  });
  return (
    <div className="cov-st" data-cov-pathway={path.steps.length}>
      <div className="cov-st-title">
        {/* The plan's WHOLE tree (Mari, Oct 21 2026, 2:55 PM); today's drug is in the outlined box with a "today" tag. */}
        Step Therapy Pathway{head && <> — <span style={head.must ? { color: T.red, fontWeight: 500 } : { color: T.ink2, fontWeight: 500 }}>{head.text}</span></>}
      </div>
      <div className="cov-st-row">
        {path.steps.map((s, i) => (
          <div key={i} style={{ display: "contents" }}>
            <div className="cov-st-step" data-cov-step-pa={s.pa} style={{ background: colors[i].bg, borderColor: colors[i].line, ...(s.active ? { outline: `2px solid ${T.accent}`, outlineOffset: 1 } : {}) }}>
              <div className="cov-st-pill" style={{ background: colors[i].pill }}>
                <span className="cov-st-word">Step </span>{s.n || s.label.replace(/^Step\s*/, "")}{s.active && <span className="cov-st-here"> ←</span>}
              </div>
              {/* Every drug shows its own PA status (Mari, 1:56 PM: "whether a PA is needed for that particular drug or not"). */}
              <div className="cov-st-drugs">
                {s.drugs.map((d, j) => (
                  <div key={j} className="cov-st-drugline" data-cov-drug-pa={d.pa}>
                    <span className={isTodayDrug(d) ? "cov-st-drug today" : "cov-st-drug"} data-cov-today={isTodayDrug(d) ? "1" : undefined}>{stepDrugText(d)}{isTodayDrug(d) && <span className="cov-st-today">today</span>}</span>
                    <span className="cov-st-desc" style={{ color: s.pa === "mixed" ? PA_TEXT[d.pa] || T.muted : colors[i].text }}>{paLabel(d.pa, d.name)}</span>
                  </div>
                ))}
              </div>
            </div>
            {i < path.steps.length - 1 && <div className="cov-st-arrow" aria-hidden="true">→</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// "Next options" (Mari, Oct 21 2026, 9:32 PM): the other anti-VEGF drugs on this plan, grouped by their own rule's
// status, so she knows which drug needs a benefits investigation before a switch. Words, not colors alone.
function NextOptions({ groups }) {
  return (
    <div className="cov-next" data-cov-next={groups.reduce((n, g) => n + g.drugs.length, 0)}>
      <div className="cov-next-title">Next options on this plan</div>
      <div className="cov-next-row">
        {groups.map((g) => (
          <div key={g.pa} data-cov-next-pa={g.pa}><b style={{ color: PA_TEXT[g.pa] || T.muted }}>{g.label}:</b> <span>{g.drugs.join(", ")}</span></div>
        ))}
      </div>
    </div>
  );
}

/** One entry of the server's data.coverage array (routes/notes.js ruleCard / dual cards / ambiguous / biosimilar / invalid / norule). */
export default function CoverageCard({ card, dualNote }) {
  const [open, setOpen] = useState(false);
  const c = card || {};
  const tier = coverageTier(c);
  const [solid, soft, line] = TONE[tier.tone] || TONE.amber;
  const isRule = c.kind === "rule";
  const path = isRule ? cardSteps(c) : null;   // server-built, each drug with its real PA status
  const possible = isRule ? stepPossibleNote(c) : null;   // step wording with no named order: no tree, a neutral note
  const next = isRule ? nextOptionGroups(c) : [];
  const tags = isRule ? requirementTags(c, !!path) : [];
  const keyReq = keyRequirement(tags);
  const jText = jCodeText(c);
  const alerts = isRule ? String(c.billing_alert || "").split("\n").map((s) => stripLeadingSymbols(s.trim())).filter(Boolean) : [];
  const banner = c.banner && typeof c.banner.text === "string" && c.banner.text.trim() ? c.banner : null;

  // Plan wording — names only, never patient data.
  const plan = isRule ? ((c.carrierLevel ? c.carrier : c.insurance) || c.carrier || "")
    : c.kind === "biosimilar" ? (c.label || "") : c.kind === "invalid" ? "" : (c.alias ? (c.kind === "ambiguous" ? `"${c.alias}"` : c.alias) : "");
  const planSub = mergedPlanSub(c);   // "" when the merged plans all give the same answer (Oct 22 2026)
  const aoNote = avastinOnlyNoteText(c);   // Retina-Rx's note, Avastin-only rules only
  const pair = c.primary && c.secondary ? [c.primary, c.secondary]
    : isRule && c.isCombinedRule && c.secondaryInsurance ? [c.insurance, c.secondaryInsurance] : null;
  const source = c.role === "secondary" ? "Secondary insurance" : c.role === "primary" ? "Primary insurance" : (c.title || "");
  const drugLabel = c.kind === "biosimilar" ? `${c.drug} (biosimilar)` : c.drug;
  const message = !isRule && c.message && !(banner && c.message === banner.text) ? c.message : "";
  const noRuleText = c.kind === "norule" ? "No coverage rule entered for this combination. Verify with payer directly." : "";
  const bTone = banner ? (TONE[BANNER_TONE[banner.tone]] || TONE.info) : null;

  const ctx = (
    <div className="cov-ctx">
      <div className="cov-chip"><span>Drug</span><span>{drugLabel || "—"}</span></div>
      {pair ? (
        <>
          <div className="cov-chip"><span>Primary plan</span><span>{pair[0]}</span></div>
          <div className="cov-chip"><span>Secondary plan</span><span>{pair[1]}</span></div>
        </>
      ) : plan ? (
        <div className="cov-chip"><span>Plan</span><span>{plan}{planSub && <span style={{ display: "block", fontSize: 11.5, fontWeight: 400, color: T.muted }}>{planSub}</span>}</span></div>
      ) : null}
      {jText && <div className="cov-chip"><span>J-code</span><span>{jText}</span></div>}
    </div>
  );

  return (
    <div className={`cov-card${open ? " more-open" : ""}`} data-cov-tier={tier.key} data-cov-kind={c.kind || ""}
      style={{ background: soft, borderColor: line }}>
      <div className="cov-head" style={{ borderBottomColor: line }}>
        <div className="cov-icon" style={{ background: solid }}><StatusIcon kind={tier.icon} /></div>
        <div className="cov-titles">
          <div className="cov-label" style={{ color: solid }}>{tier.label}</div>
          <div className="cov-headline">{tier.headline}</div>
        </div>
        <div className={`cov-source${source && c.role === "secondary" ? " keep" : ""}`}>{source || plan}</div>
        <div className="cov-phone"><span className="cov-dot" style={{ background: solid }} /><b>{tier.phone[0]}</b> — {tier.phone[1]}</div>
      </div>
      <div className="cov-body">
        {aoNote && (
          <div className="cov-ao" data-cov-avastin-only="1" title={aoNote}><b>Note:</b> <PhoneText text={aoNote} /></div>
        )}
        {banner && (
          <div className="cov-banner" data-cov-banner={banner.tone} style={{ background: bTone[1], borderColor: bTone[2], color: bTone[0], fontWeight: c.kind === "invalid" ? 600 : 400 }}>
            <SmallIcon kind={BANNER_ICON[banner.tone] || "info"} />
            <div style={{ minWidth: 0 }}><PhoneText text={banner.text} /></div>
          </div>
        )}
        {alerts.length > 0 && (
          <div className="cov-alert" data-cov-alerts={alerts.length}>
            <SmallIcon kind="alert" />
            <div className="cov-alert-lines" style={{ minWidth: 0 }}>
              {alerts.map((a, i) => <div key={i}>{i === 0 && <b style={{ fontWeight: 600 }}>Billing alert: </b>}<PhoneText text={a} /></div>)}
            </div>
          </div>
        )}
        {path && <Pathway path={path} drug={c.drug} />}
        {possible && <div className="cov-st-note" data-cov-step-possible="1">{possible}</div>}
        {next.length > 0 && <NextOptions groups={next} />}
        {message && <div style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.5 }}><PhoneText text={message} /></div>}
        {noRuleText && <p className="cov-notes">{noRuleText}</p>}
        {c.kind === "ambiguous" && Array.isArray(c.plans) && c.plans.length > 0 && (
          <div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 6 }}>Possible plans</div>
            <div className="cov-plans">{c.plans.map((pl, i) => <span key={i} className="cov-plan">{pl}</span>)}</div>
          </div>
        )}
        {/* Phone: key requirement + J-code, the rest behind "More" (Retina-Rx .rc-boxes / .rc-more). */}
        {(keyReq || jText) && (
          <div className="cov-boxes">
            {keyReq && <div className="cov-box"><span>Requirement</span><span className={`rc-${keyReq.cls}`}>{keyReq.text}</span></div>}
            {jText && <div className="cov-box"><span>J-code</span><span>{jText}</span></div>}
          </div>
        )}
        <button type="button" className="cov-more-btn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? "Less" : "More: drug, plan, requirements"} <span className="cov-caret">▾</span>
        </button>
        <div className="cov-more">
          {ctx}
          {tags.length > 0 && (
            <div className="cov-tags">{tags.map((t, i) => <span key={i} className={`cov-tag ${t.cls}`} data-cov-tag={t.cls}><PhoneText text={t.text} /></span>)}</div>
          )}
          {dualNote && <div className="cov-dualnote">{dualNote}</div>}
        </div>
      </div>
      <div className="cov-foot"><b>Coverage check</b><span>Included when you copy the note</span></div>
    </div>
  );
}

/** All cards of one note, with the stylesheet once. */
export function CoverageCards({ cards, notes }) {
  const list = Array.isArray(cards) ? cards : [];
  if (!list.length) return null;
  return (
    <>
      <style>{COVERAGE_CSS}</style>
      {list.map((c, i) => <CoverageCard key={i} card={c} dualNote={notes ? notes[i] : null} />)}
    </>
  );
}

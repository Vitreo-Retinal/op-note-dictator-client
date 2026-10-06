import { useState } from "react";
import { S, T, card, chip, iconBox, btnSm } from "./theme.js";
import PageBar, { wrap } from "./PageBar.jsx";
import { PacketIcon, InjectIcon, EyeIcon, IntakeIcon, FormIcon, ChevronRightIcon } from "./icons.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "https://op-note-dictator-server-production.up.railway.app";


const LANGS = [
  { code: "en", label: "English", short: "EN" },
  { code: "es", label: "Español", short: "ES" },
  { code: "vi", label: "Tiếng Việt", short: "VI" },
  { code: "pt", label: "Português", short: "PT" },
];

// Document catalog. To add a new document later:
// - Set `urlBuilder(lang)` to return the PDF URL for that language, OR
// - Set `comingSoon: true` to render as a placeholder card.
const DOCUMENTS = [
  {
    id: "surgical-package",
    title: "Surgical Package",
    icon: PacketIcon,
    description:
      "5-page (EN) / 6-page (ES, VI, PT) packet: pre-op instructions, face-down recovery, fillable scheduling form, vitrectomy discharge, and Worcester Surgical Center pre-admission.",
    gradient: T.accent,
    languages: ["en", "es", "vi", "pt"],
    urlBuilder: (lang) => `${API_BASE}/api/surgical-package-pdf?lang=${lang}`,
    tags: ["Fillable", "5-6 pages"],
  },
  {
    id: "post-injection",
    title: "Post-Injection Instructions",
    icon: InjectIcon,
    description: "After-care instructions for patients who just received an intravitreal injection. Currently lives in the Patient Education library — tap to open there.",
    gradient: T.accent,
    languages: ["en", "es", "vi", "pt"],
    // For now this points to Patient Education; once Mari wants a standalone PDF we'll add one.
    linkToEducation: "inject-post",
    tags: ["EN", "ES", "VI", "PT", "Education library"],
  },
  {
    id: "post-pneumatic",
    title: "Post-Pneumatic Retinopexy",
    icon: EyeIcon,
    description: "Single-page after-care instructions: 4-day positioning, Ofloxacin QID × 4 days, SF6 gas restrictions, next-day F/U for laser/cryo. Lives in the Patient Education library.",
    gradient: T.accent,
    languages: ["en", "es", "vi", "pt"],
    linkToEducation: "proc-pneumatic-post",
    tags: ["EN", "ES", "VI", "PT", "Education library"],
  },
  {
    id: "new-patient-package",
    title: "New Patient Package",
    icon: IntakeIcon,
    description: "Branded 4-page intake packet for new patients arriving at the office: HIPAA acknowledgement, patient information, medical history, and authorization forms.",
    gradient: T.accent,
    languages: ["en"],
    urlBuilder: () => `${API_BASE}/api/new-patient-package-pdf`,
    tags: ["4 pages", "Branded", "Print + bring"],
  },
  {
    id: "consents",
    title: "Consent Forms",
    icon: FormIcon,
    description: "Coming soon — surgical and procedural consent forms (vitrectomy, intravitreal injection, IV sedation, photography, HIPAA).",
    gradient: T.accent,
    comingSoon: true,
    tags: ["Coming soon"],
  },
];

function LanguageButton({ lang, onClick }) {
  return (
    <button
      onClick={onClick}
      title={lang.label}
      style={btnSm("secondary", { gap: 6, transition: "border-color .15s" })}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = T.accentLine;
        e.currentTarget.style.transform = "none";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = T.line;
        e.currentTarget.style.transform = "none";
      }}
    >
      <span style={{ fontWeight: 600, color: T.accent }}>{lang.short}</span>
      <span style={{ color: T.muted, fontWeight: 400 }}>{lang.label}</span>
    </button>
  );
}

function DocumentCard({ doc, onOpenEducation }) {
  const langs = LANGS.filter((l) => doc.languages && doc.languages.includes(l.code));
  const Icon = doc.icon;

  return (
    <div
      style={card({
        padding: "14px 16px",
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        borderTop: `3px solid ${doc.comingSoon ? T.line : doc.gradient}`,
      })}
    >
      <span style={iconBox(doc.comingSoon ? "muted" : "accent")}><Icon /></span>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: doc.comingSoon ? T.ink2 : T.ink, fontFamily: T.sans, letterSpacing: "-0.01em", marginBottom: 4 }}>{doc.title}</div>
        <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.5, marginBottom: 10 }}>{doc.description}</div>

        {/* Tags */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: doc.comingSoon ? 0 : 12 }}>
          {doc.tags.map((tag) => (
            <span
              key={tag}
              style={chip(doc.comingSoon ? "muted" : "accent", { fontWeight: 400 })}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Action row */}
        {doc.comingSoon ? (
          <div style={{ fontSize: 12.5, color: T.muted, marginTop: 10 }}>Not yet available</div>
        ) : doc.linkToEducation ? (
          <button
            onClick={() => onOpenEducation(doc.linkToEducation)}
            style={btnSm("secondary", { color: T.accent })}
          >
            Open in Patient Education<ChevronRightIcon size={14} />
          </button>
        ) : doc.urlBuilder ? (
          <div>
            <div style={{ fontSize: 12.5, color: T.muted, marginBottom: 6 }}>
              Open / Download (opens in new tab)
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {langs.map((lang) => (
                <LanguageButton
                  key={lang.code}
                  lang={lang}
                  onClick={() => window.open(doc.urlBuilder(lang.code), "_blank")}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function Documents({ onBack, onOpenEducation }) {
  return (
    <div style={{ minHeight: "100vh", background: T.paper, fontFamily: T.sans, color: T.ink, paddingBottom: 60 }}>
      {/* Header */}
      <PageBar onBack={onBack} title="Workflow Documents" />

      <div className="vra-wrap" style={wrap()}>
        <div style={{ margin: "26px 0 16px" }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: T.accent, margin: "0 0 4px" }}>Quick-Access Documents</h2>
          <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.5 }}>Branded VRA forms and packets for staff to download, print, or share with patients. Pick a language per document.</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          {DOCUMENTS.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} onOpenEducation={onOpenEducation} />
          ))}
        </div>
      </div>
    </div>
  );
}

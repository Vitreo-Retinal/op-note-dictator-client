// Unit tests for src/lib/noteHelpers.js parseResponse — shadow coder v1 (Oct 2026).
// The server now applies the same-day-procedure billing rewrite itself
// (server lib/billed-text.js, a verbatim port of the rules below). This file
// proves the client rewrite is an idempotent no-op on server-rewritten text:
// parse(raw) === parse(pre-rewritten), and parse is stable on no-procedure notes.
// Same fixtures as the server's tests/billed-text.test.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseResponse, isIcdWarning, copyableIcdText, copyableNoteText, isDiagnosisHeaderLine, noteDisplayLines, coverageCardNotes } from "../src/lib/noteHelpers.js";
import { readFileSync } from "node:fs";

const note = (code, proc, g2211, body) =>
  `---CODE---\n${code}\n---PROCEDURE---\n${proc}\n---G2211---\n${g2211}\n---DIAGNOSES---\nExudative AMD OD\n---NOTE---\n${body}\n---END---`;
const BODY = "78-year-old lady with wet AMD OD\n1. Exudative AMD OD\nEylea OD today\n[+] Moderate complexity medical decision-making: persistent SRF.";
const LONGITUDINAL = "\n[+] Longitudinal managing physician for this chronic condition (G2211).";
const TAIL = "\nRTC 8 weeks";

// raw model output vs the server's billed text for the same note
const RAW_INJECTION = note("99214", "67028-RT, J0178-JZ x2", "YES", BODY + LONGITUDINAL + TAIL);
const SERVER_INJECTION = note("99214-25", "67028-RT, J0178-JZ x2", "NO", BODY + TAIL);
const NO_PROCEDURE = note("99214", "None", "YES", BODY + LONGITUDINAL + TAIL);

test("same-day injection: parse(raw) equals parse(server-rewritten text)", () => {
  const a = parseResponse(RAW_INJECTION);
  const b = parseResponse(SERVER_INJECTION);
  assert.deepEqual(a, b);
  assert.equal(b.code, "99214-25");
  assert.equal(b.g2211, false);
  assert.ok(!/Longitudinal/.test(b.note));
});

test("idempotent on pre-rewritten text: nothing is added twice", () => {
  const p = parseResponse(SERVER_INJECTION);
  assert.equal(p.code, "99214-25");
  assert.equal(p.procedure, "67028-RT, J0178-JZ x2");
  assert.equal(p.note, BODY + TAIL);
});

test("-57 precedence and POST-OP are left alone", () => {
  assert.equal(parseResponse(note("99215-57", "67028-RT, J0178-JZ x2", "NO", "x")).code, "99215-57");
  assert.equal(parseResponse(note("POST-OP (in global)", "67028-79-RT, J0178-JZ x2", "NO", "x")).code, "POST-OP (in global)");
});

test("no procedure: G2211 and the note stay as written", () => {
  const p = parseResponse(NO_PROCEDURE);
  assert.equal(p.code, "99214");
  assert.equal(p.g2211, true);
  assert.ok(p.note.includes("Longitudinal managing physician"));
});

// ── ---TESTS--- (Oct 12 2026): hub-only diagnostic tests, never a procedure ──
const noteT = (code, proc, tests, g2211, body) =>
  `---CODE---\n${code}\n---PROCEDURE---\n${proc}\n---TESTS---\n${tests}\n---G2211---\n${g2211}\n---DIAGNOSES---\nCME OS\n---NOTE---\n${body}\n---END---`;

test("TESTS: ladder B (99214) + 92201 on TESTS keeps G2211 YES and no -25", () => {
  const p = parseResponse(noteT("99214", "None", "92201", "YES", BODY + LONGITUDINAL + TAIL));
  assert.equal(p.code, "99214");
  assert.equal(p.procedure, "None");
  assert.equal(p.tests, "92201");
  assert.equal(p.g2211, true);
  assert.ok(p.note.includes("Longitudinal managing physician"));
});

test("TESTS: an empty PROCEDURE before TESTS is still 'no procedure'", () => {
  const p = parseResponse(noteT("99214", "", "92134, 92201", "YES", BODY + TAIL));
  assert.equal(p.procedure, "");
  assert.equal(p.tests, "92134, 92201");
  assert.equal(p.g2211, true);
  assert.equal(p.code, "99214");
});

test("TESTS: injection day — PROCEDURE still drives G2211 NO / -25; tests parsed separately", () => {
  const p = parseResponse(noteT("99214", "67028-RT, J0178-JZ x2", "92134", "YES", BODY + LONGITUDINAL + TAIL));
  assert.equal(p.procedure, "67028-RT, J0178-JZ x2");
  assert.equal(p.tests, "92134");
  assert.equal(p.code, "99214-25");
  assert.equal(p.g2211, false);
});

test("TESTS: never part of the copied note text (result.note)", () => {
  const p = parseResponse(noteT("99214", "None", "92201", "YES", BODY + TAIL));
  assert.ok(!/92201|---TESTS---/.test(p.note));
});

test("TESTS: a response without ---TESTS--- parses exactly as before (tests = '')", () => {
  const p = parseResponse(NO_PROCEDURE);
  assert.equal(p.tests, "");
  assert.equal(p.procedure, "None");
  assert.equal(p.g2211, true);
});

// Oct 13 2026: server ICD-10 warning entries are shown as chips but never copied by "Copy codes".
test("copyableIcdText skips ICD-10 warning entries", () => {
  const codes = [
    { code: "H35.3291", description: "Wet AMD, active CNV, unspecified eye", eye: "unspecified", primary: true },
    { code: "⚠ Eye not stated", description: "for Wet AMD — add OD/OS/OU.", eye: "", primary: false, warning: "icd:no-eye" },
    { code: "⚠ ICD-10 check", description: "H16.01 is not a valid FY2027 code — closest: H16.011. Confirm the code.", eye: "", primary: false, warning: "icd:invalid" },
    { code: "T15.01XA", description: "Corneal foreign body, right eye, initial encounter", eye: "OD", primary: false },
    { code: "Z96.1", description: "Pseudophakia", eye: "OU", primary: false },
  ];
  assert.equal(copyableIcdText(codes), "H35.3291 — Wet AMD, active CNV, unspecified eye\nT15.01XA — Corneal foreign body, right eye, initial encounter\nZ96.1 — Pseudophakia");
  assert.deepEqual(codes.map(isIcdWarning), [false, true, true, false, false]);
  // No `warning` flag (older server) but not a code shape → still treated as a warning.
  assert.equal(isIcdWarning({ code: "⚠ ICD-10 check", description: "x" }), true);
  assert.equal(isIcdWarning(null), true);
  assert.equal(copyableIcdText([codes[1]]), "");
  assert.equal(copyableIcdText(undefined), "");
});

// ── Bold diagnosis headers are SCREEN ONLY (owner, Oct 12 2026) ──────────────
// Copy note / phone footer copy / Copy codes must produce byte-identical text to before.
const HEADER_NOTE = [
  "78-year-old lady with wet AMD OS",
  "",
  "1. AMD",
  "OD: Intermediate dry AMD",
  "OS: Wet AMD, new SRF",
  "[+] OCT reviewed demonstrating new SRF OS",
  "",
  "**2. ERM OS**",
  "Mild, observe",
  "",
  "3) Bilateral RDs",
  "s/p SB OU (MR, 2019), attached",
  "",
  "Plan",
  "1. Eylea OS today",
  "[+] RBA discussed including endophthalmitis, RD, VH, IOP elevation and vision loss.",
  "F/u 4 weeks",
].join("\n");
// The Copy note text before this change, written out literally.
const HEADER_NOTE_COPIED = [
  "78-year-old lady with wet AMD OS",
  "",
  "1. AMD",
  "OD: Intermediate dry AMD",
  "OS: Wet AMD, new SRF",
  "OCT reviewed demonstrating new SRF OS",
  "",
  "2. ERM OS",
  "Mild, observe",
  "",
  "3) Bilateral RDs",
  "s/p SB OU (MR, 2019), attached",
  "",
  "Plan",
  "1. Eylea OS today",
  "RBA discussed including endophthalmitis, RD, VH, IOP elevation and vision loss.",
  "F/u 4 weeks",
].join("\n");

test("Copy note: byte-identical to the pre-change expression for a note with headers (no asterisks, no markup)", () => {
  const legacy = (n) => n.replace(/\[\+\]\s*/g, "").replace(/\*\*/g, ""); // copyNote before Oct 17 2026
  assert.equal(copyableNoteText(HEADER_NOTE), legacy(HEADER_NOTE));
  assert.equal(copyableNoteText(HEADER_NOTE), HEADER_NOTE_COPIED);
  assert.ok(!/\*|<\/?strong|<b>/.test(copyableNoteText(HEADER_NOTE)));
  // Same for a parsed server response (the path the button takes: result.note).
  const p = parseResponse(note("99214-25", "67028-LT, J0178-JZ x2", "NO", HEADER_NOTE));
  assert.equal(copyableNoteText(p.note), legacy(p.note));
  for (const n of ["", "plain line", "**bold** mid-line and a stray ** marker", "[+]x\n[+] y"]) assert.equal(copyableNoteText(n), legacy(n), n);
});

test("display: numbered diagnosis headers flagged bold; OD:/OS:, [+], Plan items never; input untouched", () => {
  const before = HEADER_NOTE;
  const lines = noteDisplayLines(HEADER_NOTE);
  assert.equal(HEADER_NOTE, before);
  assert.deepEqual(lines.filter((l) => l.header).map((l) => l.text), ["1. AMD", "2. ERM OS", "3) Bilateral RDs"]);
  for (const t of ["OD: Intermediate dry AMD", "OS: Wet AMD, new SRF", "[+] OCT reviewed demonstrating new SRF OS", "1. Eylea OS today", "Plan", "F/u 4 weeks"])
    assert.equal(lines.find((l) => l.text === t).header, false, t);
  // Non-header lines are passed through exactly; only header lines lose their "**".
  const src = HEADER_NOTE.split("\n");
  lines.forEach((l, i) => assert.equal(l.text, l.header ? src[i].replace(/\*\*/g, "") : src[i]));
  assert.equal(lines.length, src.length);
  // Header shape = server HEADER_RX: "1." / "1)" / "12." + space + title, optional ** wrapper.
  for (const h of ["1. AMD", "2. ERM OS", "3) Bilateral RDs", "**1. AMD**", "  10. Pseudophakia OU", "1. AMD:"]) assert.equal(isDiagnosisHeaderLine(h), true, h);
  for (const h of ["OD: wet AMD", "[+] 1. x", "1.5 mg", "10/10/2025 PPV", "POD1 s/p PPV OD", "1.AMD", ""]) assert.equal(isDiagnosisHeaderLine(h), false, h);
  // "Plan:" with text, and "**Plan**", also start the plan section; "Plan discussed" does not.
  assert.equal(noteDisplayLines("1. AMD\nPlan: Eylea OS\n2. Something").filter((l) => l.header).length, 1);
  assert.equal(noteDisplayLines("1. AMD\n**Plan**\n2. Something").filter((l) => l.header).length, 1);
  assert.equal(noteDisplayLines("1. AMD\nPlan discussed with pt\n2. ERM OS\n\nPlan\n3. x").filter((l) => l.header).length, 2);
  assert.deepEqual(noteDisplayLines(""), []);
});

test("Copy codes: unchanged for a note with headers (real codes only, one per line)", () => {
  const codes = [
    { code: "H35.3221", description: "Wet AMD, active CNV, left eye", eye: "OS", primary: true },
    { code: "H35.372", description: "Puckering of macula (ERM), left eye", eye: "OS", primary: false },
  ];
  assert.equal(copyableIcdText(codes), "H35.3221 — Wet AMD, active CNV, left eye\nH35.372 — Puckering of macula (ERM), left eye");
});

test("source guard: every copy path writes the same text as before; display helper used only for rendering", () => {
  const src = readFileSync(new URL("../src/ClinicNoteGenerator.jsx", import.meta.url), "utf8");
  // copyNote (desktop button + phone footer) → copyableNoteText(result.note), both clipboard and fallback.
  const copyNote = src.slice(src.indexOf("const copyNote = useCallback"), src.indexOf("const copyHpi = useCallback"));
  assert.match(copyNote, /const clean = copyableNoteText\(result\.note\);/);
  assert.match(copyNote, /writeText\(clean\)/); assert.match(copyNote, /ta\.value = clean;/);
  assert.ok(!/noteDisplayLines|renderNote/.test(copyNote));
  assert.equal((src.match(/noteDisplayLines\(/g) || []).length, 1, "only renderNote uses the display lines");
  assert.match(src, /const text = copyableIcdText\(icd10Codes\);/);
  assert.match(src, /writeText\(pbmNote\)/);
  assert.match(src, /phoneFooter\(\(\) => \{ setTab\("input"\); setResult\(null\); \}, "New note", copyNote, copied\)/);
  // Every clipboard write in the component is one of the known, unchanged paths.
  const writes = [...src.matchAll(/writeText\(([^)]*)\)/g)].map((m) => m[1]);
  assert.deepEqual(writes.sort(), ["clean", "clean", "pbmNote", "text"].sort());
});

// ── Dual-coverage note line (Oct 17 2026) — screen only, never copied ────────
const DUAL_NOTE = "No combined primary + secondary rule on file for this pair — each plan's own rule is shown.";
const DUAL_CARDS = [
  { kind: "rule", role: "primary", dual: "separate", drug: "Eylea 2mg", carrier: "Tufts Medicare Advantage", status: "yellow" },
  { kind: "rule", role: "secondary", dual: "separate", drug: "Eylea 2mg", insurance: "Secondary — Mass Health Standard", status: "green", dualNote: DUAL_NOTE },
];

test("coverageCardNotes: the dual note goes under the secondary card, once", () => {
  assert.deepEqual(coverageCardNotes(DUAL_CARDS), [null, DUAL_NOTE]);
  // note carried by the primary card → still shown under its secondary card
  const onPrimary = [{ ...DUAL_CARDS[0], dualNote: DUAL_NOTE }, { ...DUAL_CARDS[1], dualNote: undefined }];
  assert.deepEqual(coverageCardNotes(onPrimary), [null, DUAL_NOTE]);
  // both carry it → shown once
  assert.deepEqual(coverageCardNotes([{ ...DUAL_CARDS[0], dualNote: DUAL_NOTE }, DUAL_CARDS[1]]), [null, DUAL_NOTE]);
});

test("coverageCardNotes: no secondary card → under the card that carries the note; none → all null", () => {
  assert.deepEqual(coverageCardNotes([{ kind: "ambiguous", role: "primary", dual: "partial", dualNote: "Specify plan." }]), ["Specify plan."]);
  assert.deepEqual(coverageCardNotes([{ kind: "rule", status: "green" }, { kind: "ambiguous", alias: "uhc" }]), [null, null]);
  assert.deepEqual(coverageCardNotes([{ kind: "rule", dualNote: "  " }]), [null]);
  assert.deepEqual(coverageCardNotes(null), []);
  assert.deepEqual(coverageCardNotes(undefined), []);
});

test("coverageCardNotes never modifies the cards", () => {
  const before = JSON.stringify(DUAL_CARDS);
  coverageCardNotes(DUAL_CARDS);
  assert.equal(JSON.stringify(DUAL_CARDS), before);
});

test("copy output is byte-identical with or without coverage cards / dualNote (copy reads result.note only)", () => {
  const legacy = (n) => n.replace(/\[\+\]\s*/g, "").replace(/\*\*/g, "");
  const text = note("99214-25", "67028-RT, J0178", "NO", BODY + TAIL);
  const p = parseResponse(text);
  const copied = copyableNoteText(p.note);
  assert.equal(copied, legacy(p.note));
  const withCards = { ...p, coverage: DUAL_CARDS };
  assert.equal(copyableNoteText(withCards.note), copied);
  assert.ok(!copied.includes(DUAL_NOTE));
});

test("dualNote is rendered only inside renderCoverageJsonCard — no copy path reads it", () => {
  const src = readFileSync(new URL("../src/ClinicNoteGenerator.jsx", import.meta.url), "utf8");
  const start = src.indexOf("function renderCoverageJsonCard(");
  const end = src.indexOf("\n  }\n", start);
  assert.ok(start > 0 && end > start);
  const outside = src.slice(0, start) + src.slice(end);
  assert.ok(!/dualNote/.test(outside.replace(/renderCoverageJsonCard\(c, i, notes\[i\]\)/, "")), "dualNote used outside the card renderer");
  for (const fn of ["const copyNote = useCallback", "const copyHpi = useCallback"]) {
    const a = src.indexOf(fn);
    const body = src.slice(a, src.indexOf("}, [", a));
    assert.ok(a > 0 && !/coverage|dualNote/i.test(body), `${fn} must not read coverage`);
  }
});

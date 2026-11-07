// VRA trial cards (Nov 6 2026, Mari — D15). src/lib/trialCard.js
import test from "node:test";
import assert from "node:assert";
import { buildTrialCards, noteVision, snellenLetters, findConcept, lineDates, studyMentions, triggerEyes, planLines } from "../src/lib/trialCard.js";

import fs from "node:fs";
// The real rules (snapshot of the trials table) — so the tests check what the hub will run.
const TRIALS = JSON.parse(fs.readFileSync(new URL("./fixtures/clinical-trials-2026-11-06.json", import.meta.url), "utf8")).trials;

const TODAY = "2026-11-06T12:00:00";
const cards = (note, icd = [], trials = TRIALS) => buildTrialCards(note, icd, trials, { today: TODAY });
const card = (note, slug, icd) => cards(note, icd).find((c) => c.slug === slug);
const cellOf = (c, id, eye = "all") => c.checks.find((k) => k.id === id).cells[eye];

// ── Triggers ─────────────────────────────────────────────────────────────────
test("GA triggers SIENNA; eye from the line and from the ICD code", () => {
  const c = card("78F\n1. Nonexudative AMD OU\nOS: Subfoveal GA\nVA 20/50", "sienna");
  assert.ok(c);
  assert.deepStrictEqual(c.eyes, ["OS"]);
  const d = card("78F\n1. Dry AMD", "sienna", [{ code: "H35.3134", description: "GA OU subfoveal" }]);
  assert.deepStrictEqual(d.eyes, ["OD", "OS"]);
  assert.match(d.why, /H35\.3134/);
});

test("no card: GA negated, no GA, intermediate AMD, wet AMD only", () => {
  assert.strictEqual(card("80F\n1. Dry AMD OU, no GA", "sienna"), undefined);
  assert.strictEqual(card("80F\n1. Intermediate dry AMD OU, drusen", "sienna"), undefined);
  assert.strictEqual(card("80F\n1. Wet AMD OD, Eylea today", "sienna", [{ code: "H35.3211", description: "" }]), undefined);
});

test("moderate / severe NPDR triggers HELIOS-3; 'with DME' on the line does not", () => {
  assert.ok(card("60F\n1. Moderate NPDR OU without DME\nVA 20/25 OD, 20/30 OS", "helios-3"));
  assert.ok(card("60F\n1. Severe nonproliferative diabetic retinopathy OD", "helios-3"));
  assert.ok(card("60F\n1. T2DM", "helios-3", [{ code: "E11.3492", description: "severe NPDR without ME OS" }]));
  assert.strictEqual(card("60F\n1. Severe NPDR OD with DME", "helios-3"), undefined);
  assert.strictEqual(card("60F\n1. Mild NPDR OU", "helios-3"), undefined);
  assert.strictEqual(card("60F\n1. PDR OU s/p PRP", "helios-3"), undefined);
});

test("only ENROLLING trials make a candidate card", () => {
  const paused = TRIALS.map((t) => (t.slug === "sienna" ? { ...t, status: "screening_paused" } : t));
  assert.strictEqual(cards("78F\n1. GA OS\nVA 20/50", [], paused).find((c) => c.slug === "sienna"), undefined);
  const inactive = TRIALS.map((t) => (t.slug === "sienna" ? { ...t, active: false } : t));
  assert.strictEqual(cards("78F\n1. GA OS", [], inactive).length, 0);
});

test("a row without card rules makes no card; unknown check types are skipped", () => {
  const bare = [{ ...TRIALS[0], quick_checks: null }];
  assert.strictEqual(cards("78F\n1. GA OS", [], bare).length, 0);
  const odd = [{ ...TRIALS[0], quick_checks: { checks: [{ id: "x", type: "lab", label: "HbA1c" }, TRIALS[0].quick_checks.checks[0]] } }];
  assert.deepStrictEqual(cards("78F\n1. GA OS", [], odd)[0].checks.map((k) => k.id), ["age"]);
});

// ── Vision ───────────────────────────────────────────────────────────────────
test("Snellen → approximate ETDRS letters", () => {
  assert.strictEqual(snellenLetters("20/20"), 85);
  assert.strictEqual(snellenLetters("20/40"), 70);
  assert.strictEqual(snellenLetters("20/80"), 55);
  assert.strictEqual(snellenLetters("20/200"), 35);
  assert.strictEqual(snellenLetters("20/40-2"), 68);
  assert.strictEqual(snellenLetters("CF 3ft"), 0);
  assert.strictEqual(snellenLetters("blurry"), null);
});

test("vision per eye — the note's usual layouts", () => {
  assert.deepStrictEqual(noteVision("VA 20/40 OD, 20/200 OS"), { OD: "20/40", OS: "20/200" });
  assert.deepStrictEqual(noteVision("VA OD 20/50 OS 20/100"), { OD: "20/50", OS: "20/100" });
  assert.deepStrictEqual(noteVision("VA 20/50 and 20/100"), { OD: "20/50", OS: "20/100" });
  assert.deepStrictEqual(noteVision("1. AMD OU\nOD: drusen\nVA 20/30\nOS: GA\nVA 20/60"), { OD: "20/30", OS: "20/60" });
  assert.deepStrictEqual(noteVision("1. BRVO OD\nVA 20/40, trace SRF"), { OD: "20/40", OS: null });
  assert.deepStrictEqual(noteVision("VA cc 20/20-1 OD, 20/25+2 OS"), { OD: "20/20-1", OS: "20/25+2" });
  assert.deepStrictEqual(noteVision("72F\nVA 20/40"), { OD: null, OS: null }); // no eye → unknown
});

test("vision check: met, borderline → check, below → not met, missing → not in note", () => {
  const met = card("70F\n1. GA OS\nVA 20/40 OD, 20/80 OS", "sienna");
  assert.strictEqual(cellOf(met, "va", "OS").state, "met");
  const border = card("70F\n1. GA OS\nVA 20/40 OD, 20/80-2 OS", "sienna");
  assert.strictEqual(cellOf(border, "va", "OS").state, "check");
  const low = card("70F\n1. GA OS\nVA 20/40 OD, 20/200 OS", "sienna");
  assert.strictEqual(cellOf(low, "va", "OS").state, "not_met");
  const none = card("70F\n1. GA OS", "sienna");
  assert.strictEqual(cellOf(none, "va", "OS").state, "none");
});

// ── Reading the note: negation, eyes ──────────────────────────────────────────
test("negation: 'no', 'without', list members, after-words; 'no change in' is not", () => {
  const pol = (note, key) => findConcept(note, [], key).map((x) => x.polarity);
  assert.deepStrictEqual(pol("No CNV OU", "mnv"), ["negated"]);
  assert.deepStrictEqual(pol("Moderate NPDR OU without DME", "macular_edema"), ["negated"]);
  assert.deepStrictEqual(pol("No NVD/NVE", "pdr_nv_vh"), ["negated", "negated"]);
  assert.deepStrictEqual(pol("no h/o PRP", "prp"), ["negated"]);
  assert.deepStrictEqual(pol("DME: none", "macular_edema"), ["negated"]);
  assert.deepStrictEqual(pol("No change in CNV OD", "mnv"), ["positive"]);
  assert.deepStrictEqual(pol("No GA. CNV OD", "mnv"), ["positive"]);
  assert.deepStrictEqual(pol("r/o CNV OD", "mnv"), ["uncertain"]);
});

test("look-alikes are not findings", () => {
  assert.strictEqual(findConcept("Nonexudative AMD OU; non-exudative", [], "mnv").length, 0);
  assert.strictEqual(findConcept("Moderate non-proliferative diabetic retinopathy", [], "pdr_nv_vh").length, 0);
  assert.strictEqual(findConcept("Seen by Dr. Hong", [], "dr_any").length, 0);
  assert.strictEqual(findConcept("Gas: C3F8 14% OD", [], "anti_vegf").length, 0);
  assert.strictEqual(findConcept("ive been well", [], "anti_vegf").length, 0); // shorthand is UPPERCASE only
  assert.strictEqual(findConcept("C5 OS today", [], "anti_vegf").length, 1);
});

test("eye-scoped checks only use findings in that eye", () => {
  const c = card("70F\n1. GA OS\n2. Wet AMD OD\nOD: CNV, IVE OD today\nOS: GA, VA 20/50\nVA 20/40 OD, 20/50 OS\nPRP OD", "sienna");
  // either-eye rule: the wet OD still counts against SIENNA
  assert.strictEqual(cellOf(c, "no-mnv").state, "not_met");
  // eye rule: nothing in the GA eye
  assert.strictEqual(cellOf(c, "no-comorbid", "OS").state, "none");
  const h = card("61M\n1. Moderate NPDR OS without DME\n2. PDR OD s/p PRP OD", "helios-3");
  assert.deepStrictEqual(h.eyes, ["OS"]);
  assert.strictEqual(cellOf(h, "no-pdr", "OS").state, "none");
  assert.strictEqual(cellOf(h, "no-prp", "OS").state, "none");
});

test("a finding with no eye → 'check' for an eye rule, never a pass", () => {
  const h = card("61M\n1. Moderate NPDR OU\nPlan\n- s/p PRP", "helios-3");
  assert.strictEqual(cellOf(h, "no-prp", "OD").state, "check");
});

test("soft findings (ERM) are 'check', not 'not met'", () => {
  const h = card("61M\n1. Moderate NPDR OS without DME\n2. ERM OS, mild", "helios-3");
  assert.strictEqual(cellOf(h, "no-macular", "OS").state, "check");
});

// ── Drug timing ──────────────────────────────────────────────────────────────
test("dates on a line: full, no year, month name, m/yyyy, 'ago'; never VA or the future", () => {
  const t = new Date(TODAY);
  const iso = (l) => lineDates(l, t).map((d) => d.toISOString().slice(0, 10));
  assert.deepStrictEqual(iso("s/p Eylea 9/17/2026"), ["2026-09-17"]);
  assert.deepStrictEqual(iso("last Eylea 9/17"), ["2026-09-17"]);
  assert.deepStrictEqual(iso("last Eylea 12/1"), ["2025-12-01"]);
  assert.deepStrictEqual(iso("s/p L5 Nov 5, 2026"), ["2026-11-05"]);
  assert.deepStrictEqual(iso("Avastin 3/2026"), ["2026-03-15"]);
  assert.strictEqual(iso("VA 20/40, Eylea").length, 0);
  assert.strictEqual(iso("Eylea 1/5/2027").length, 0);
  assert.strictEqual(lineDates("Eylea 8 weeks ago", t).length, 1);
});

test("recent-drug rule: today / dated within → not met; older → met; undated → check; naive → met", () => {
  const h = (plan) => cellOf(card(`61M\n1. Moderate NPDR OD without DME\nVA 20/30 OD\n${plan}`, "helios-3"), "no-vegf", "OD");
  assert.strictEqual(h("IVE OD today").state, "not_met");
  assert.strictEqual(h("s/p Eylea OD 9/17/2026").state, "not_met");
  assert.strictEqual(h("s/p Avastin OD 1/10/2026").state, "met");
  assert.strictEqual(h("s/p Avastin OD x3").state, "check");
  assert.strictEqual(h("Treatment naive.").state, "met");
  assert.strictEqual(h("Discussed anti-VEGF OD vs observation").state, "none");
  assert.strictEqual(h("").state, "none");
});

test("SIENNA: a fellow-eye injection within 6 months counts; Syfovre talked about does not", () => {
  const c = card("78F\n1. GA OS\nOD: CNV, s/p Eylea 9/17/2026\nOS: GA\nPlan\n- discussed Syfovre OS", "sienna");
  assert.strictEqual(cellOf(c, "no-ivt").state, "not_met");
  const d = card("78F\n1. GA OS\nPlan\n- discussed Syfovre OS", "sienna");
  assert.strictEqual(cellOf(d, "no-ivt").state, "none");
  const e = card("78F\n1. GA OS, on Syfovre now", "sienna");
  assert.strictEqual(cellOf(e, "no-ivt").state, "not_met");
});

test("SIENNA: Valeda in the note → not met (PBM excludes)", () => {
  const c = card("78F\n1. GA OS\nPlan\n- Valeda OS session 3 of 9", "sienna");
  assert.strictEqual(cellOf(c, "no-pbm").state, "not_met");
});

test("age rule reads the note header", () => {
  assert.strictEqual(cellOf(card("88F\n1. GA OS", "sienna"), "age").state, "not_met");
  assert.strictEqual(cellOf(card("1. GA OS", "sienna"), "age").state, "none");
});

// ── Study patients ───────────────────────────────────────────────────────────
test("study patient: named as the patient's trial → reminder; discussed → no reminder", () => {
  const ins = ["SIENNA participant, week 12 visit", "SIENNA pt", "enrolled in CAPRI", "randomized in the ASCENT trial", "Pt is in HELIOS-3", "per SIENNA protocol", "ASCENT study patient OD"];
  const trials = TRIALS;
  for (const s of ins) assert.strictEqual(studyMentions(`70F\n1. ${s}`, trials).length, 1, s);
  const outs = ["Discussed the SIENNA clinical trial for geographic atrophy. Patient interested. Referred to the VRA research coordinator for prescreening.",
    "SIENNA clinical trial discussed. Patient declined.", "May be a candidate for SIENNA", "Screen fail for SIENNA", "Not enrolled in HELIOS-3", "Information on the SIENNA study given"];
  for (const s of outs) assert.strictEqual(studyMentions(`70F\n1. GA OS\n${s}`, trials).length, 0, s);
});

test("study patient: the trial's own card is replaced by the reminder", () => {
  const out = cards("74F\n1. GA OS — SIENNA participant\nVA 20/40 OS");
  assert.deepStrictEqual(out.map((c) => c.kind), ["trial-reminder"]);
  assert.match(out[0].items[0].text, /Check with Diana Báez or Amy Paul before any treatment outside the protocol/);
});

test("terminated trial → close-out wording; no flag name → 'the VRA research coordinator'", () => {
  const out = cards("70M\n1. Wet AMD OD - enrolled in LUCIA");
  assert.match(out[0].items[0].text, /LUCIA was terminated\. Ask the VRA research coordinator about close-out visits/);
});

// ── Wording ──────────────────────────────────────────────────────────────────
test("plan lines name the trial and the condition; nothing says 'eligible'", () => {
  const ls = planLines({ ...TRIALS[0] });
  assert.deepStrictEqual(ls.map((l) => l.text), [
    "Discussed the SIENNA clinical trial for geographic atrophy. Patient interested. Referred to the VRA research coordinator for prescreening.",
    "Discussed the SIENNA clinical trial for geographic atrophy. Patient will consider it.",
    "SIENNA clinical trial discussed. Patient declined.",
  ]);
  const all = JSON.stringify(cards("78F\n1. GA OU\nVA 20/40 OD, 20/50 OS\n2. Moderate NPDR OU without DME"));
  assert.doesNotMatch(all, /\beligible\b/i);
});

test("adding the 'interested' plan line keeps the candidate card (no reminder)", () => {
  const note = "74F\n1. GA OS\nVA 20/40 OS\nPlan\n- " + planLines(TRIALS[0])[0].text;
  const out = cards(note);
  assert.deepStrictEqual(out.map((c) => c.kind), ["trial"]);
});

test("real rules: every check names a known concept and type", async () => {
  const { CONCEPTS } = await import("../src/lib/trialCard.js");
  for (const t of TRIALS) {
    for (const k of (t.card_triggers && t.card_triggers.concepts) || []) assert.ok(CONCEPTS[k], `${t.slug} trigger ${k}`);
    for (const c of (t.quick_checks && t.quick_checks.checks) || []) {
      assert.ok(["age", "va", "absent", "recent_drug"].includes(c.type), `${t.slug} ${c.id} type`);
      for (const k of [].concat(c.concept || [], c.concepts || [], c.drugs || [])) assert.ok(CONCEPTS[k], `${t.slug} ${c.id} ${k}`);
    }
  }
});

test("RGX-314 names don't cross: '3101 participant' is ASCENT, 'RGX-314 LTFU patient' is the follow-up study", () => {
  assert.deepStrictEqual(studyMentions("1. Wet AMD OD, RGX-314-3101 participant", TRIALS).map((x) => x.trial.slug), ["ascent"]);
  assert.deepStrictEqual(studyMentions("1. Wet AMD OD, s/p RGX-314 - RGX-314 LTFU patient", TRIALS).map((x) => x.trial.slug), ["rgx-314-5101"]);
  assert.deepStrictEqual(studyMentions("1. Wet AMD OD, RGX-314 patient", TRIALS).map((x) => x.trial.slug), ["rgx-314-5101"]);
});

test("eye = the eye word nearest the finding ('AMD OU with GA OS' → OS)", () => {
  const eyesOf = (note, key) => findConcept(note, [], key).map((x) => x.eyes.join("+"));
  assert.deepStrictEqual(eyesOf("1. Nonexudative AMD OU with geographic atrophy OS", "ga"), ["OS"]);
  assert.deepStrictEqual(eyesOf("CNV OD and GA OS", "mnv"), ["OD"]);
  assert.deepStrictEqual(eyesOf("OD: CNV", "mnv"), ["OD"]);
  assert.deepStrictEqual(eyesOf("Moderate NPDR OU without DME", "macular_edema"), ["OD+OS"]);
  assert.deepStrictEqual(eyesOf("1. Wet AMD OD\nCNV, active", "mnv"), ["OD", "OD"]);
  const c = card("78F\n1. Nonexudative AMD OU with geographic atrophy OS\nOD: drusen\nVA 20/30\nOS: GA\nVA 20/60", "sienna");
  assert.deepStrictEqual(c.eyes, ["OS"]);
});

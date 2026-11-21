// "December visit?" reminder (Nov 21 2026, owner decision D16; server OWN-RULE-054 —
// lib/december-visit.js): Jan 1-15 2027, a note whose 2027 switch (B1, Auto / Medicare eye code)
// changed the output carries data.decemberVisit; the tap regenerates with december_visit: true;
// the server answers data.decemberSwitch. HUB ONLY — never part of result.note, never copied.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseResponse, copyableNoteText } from "../src/lib/noteHelpers.js";
import {
  parseDecemberVisit, parseDecemberSwitch, decemberRequest, decemberFlagAfter, decemberStripFor,
  DECEMBER_DONE_TEXT, DECEMBER_IGNORED_TEXT,
} from "../src/lib/decemberVisit.js";

// The exact shape the server sends (server tests/december-visit-jan2027.test.js).
const SERVER_DV = {
  window: { from: "2027-01-01", until: "2027-01-15" },
  switched: ["b1"],
  text: "Was this visit in December 2026? This note used the 2027 codes because it was made today.",
  button: "Switch to 2026 codes",
};
const NOTE = ["---CODE---", "99214-B1", "---PROCEDURE---", "None", "---TESTS---", "92134", "---G2211---", "B1",
  "---DIAGNOSES---", "DME | OD | worsening", "---NOTE---", "1. DME OD", "Worse on OCT", "Plan", "Closer monitoring, f/u 4 weeks",
  "[+] Moderate complexity medical decision-making: worsening DME OD, closer monitoring.", "---END---"].join("\n");

test("parseDecemberVisit: the server reminder, validated; older servers and junk → null", () => {
  assert.deepEqual(parseDecemberVisit({ decemberVisit: SERVER_DV }), { text: SERVER_DV.text, button: "Switch to 2026 codes", switched: ["b1"] });
  assert.deepEqual(parseDecemberVisit({ decemberVisit: { ...SERVER_DV, button: "", switched: ["b1", "nope", "auto-eye"] } }).switched, ["b1", "auto-eye"]);
  assert.equal(parseDecemberVisit({ decemberVisit: { ...SERVER_DV, button: "" } }).button, "Switch to 2026 codes");
  for (const d of [{}, null, undefined, { decemberVisit: null }, { decemberVisit: [] }, { decemberVisit: "x" }, { decemberVisit: { text: "  " } }]) {
    assert.equal(parseDecemberVisit(d), null);
  }
});

test("parseDecemberSwitch: honored / ignored / absent", () => {
  assert.deepEqual(parseDecemberSwitch({ decemberSwitch: { honored: true } }), { honored: true });
  assert.deepEqual(parseDecemberSwitch({ decemberSwitch: { honored: false, ignored: "outside-window" } }), { honored: false, ignored: "outside-window" });
  assert.deepEqual(parseDecemberSwitch({ decemberSwitch: { honored: false } }), { honored: false, ignored: "outside-window" });
  for (const d of [{}, null, { decemberSwitch: null }, { decemberSwitch: { honored: "true" } }, { decemberSwitch: [] }]) assert.equal(parseDecemberSwitch(d), null);
});

test("decemberRequest: the flag goes out only after a real tap (JSON true)", () => {
  assert.deepEqual(decemberRequest(true), { december_visit: true });
  for (const v of [false, undefined, null, "true", 1]) assert.deepEqual(decemberRequest(v), {});
  // spread into the request body exactly like ClinicNoteGenerator does
  assert.equal(JSON.stringify({ mode: "generate", ...decemberRequest(false) }), '{"mode":"generate"}');
  assert.equal(JSON.parse(JSON.stringify({ ...decemberRequest(true) })).december_visit, true);
});

test("decemberFlagAfter: keep sending for this note unless the server refused it", () => {
  assert.equal(decemberFlagAfter(true, { honored: true }), true);
  assert.equal(decemberFlagAfter(true, null), true, "an older server / an error keeps the doctor's choice");
  assert.equal(decemberFlagAfter(true, { honored: false, ignored: "outside-window" }), false);
  assert.equal(decemberFlagAfter(false, { honored: true }), false);
  assert.equal(decemberFlagAfter(undefined, null), false);
});

test("decemberStripFor: offer → done → ignored; nothing on ordinary notes", () => {
  const parsed = parseResponse(NOTE);
  assert.equal(decemberStripFor(parsed), null, "no field → no strip");
  parsed.decemberVisit = parseDecemberVisit({ decemberVisit: SERVER_DV });
  parsed.decemberSwitch = null;
  assert.deepEqual(decemberStripFor(parsed), { kind: "offer", text: SERVER_DV.text, button: "Switch to 2026 codes" });
  assert.deepEqual(decemberStripFor({ ...parsed, decemberVisit: null, decemberSwitch: { honored: true } }), { kind: "done", text: DECEMBER_DONE_TEXT });
  assert.deepEqual(decemberStripFor({ ...parsed, decemberSwitch: { honored: false, ignored: "outside-window" } }), { kind: "ignored", text: DECEMBER_IGNORED_TEXT });
  for (const r of [null, undefined, {}, "x"]) assert.equal(decemberStripFor(r), null);
});

test("hub only: the strip text never reaches the copied note", () => {
  const parsed = parseResponse(NOTE);
  parsed.decemberVisit = parseDecemberVisit({ decemberVisit: SERVER_DV });
  const copied = copyableNoteText(parsed.note);
  assert.ok(!copied.includes("December 2026"));
  assert.ok(!copied.includes("2026 codes"));
  for (const t of [DECEMBER_DONE_TEXT, DECEMBER_IGNORED_TEXT, SERVER_DV.text]) assert.ok(!/;/.test(t), "no semicolons (read aloud)");
});

test("ClinicNoteGenerator wiring: request flag, parse, tap handler, New note reset, strip", () => {
  const src = readFileSync(new URL("../src/ClinicNoteGenerator.jsx", import.meta.url), "utf8");
  assert.match(src, /\.\.\.decemberRequest\(decRef\.current\)/);
  assert.match(src, /parsed\.decemberVisit = parseDecemberVisit\(data\)/);
  assert.match(src, /parsed\.decemberSwitch = parseDecemberSwitch\(data\)/);
  assert.match(src, /decRef\.current = decemberFlagAfter\(decRef\.current, parsed\.decemberSwitch\)/);
  const handler = src.slice(src.indexOf("function switchToDecemberAndRegenerate"), src.indexOf("function switchToDecemberAndRegenerate") + 200);
  assert.match(handler, /decRef\.current = true;\s*run\(\);/);
  assert.doesNotMatch(handler, /pickInjFamily/, "the December tap must not touch the injection-day choice");
  const nn = src.slice(src.indexOf("function newNote()"), src.indexOf("function newNote()") + 700);
  assert.match(nn, /decRef\.current = false/);
  assert.match(src, /data-testid="december-visit"/);
});

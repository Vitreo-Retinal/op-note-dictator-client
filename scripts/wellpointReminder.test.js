// Wellpoint audit reminder (Nov 6 2026, owner 1:08 PM; server OWN-RULE-050 — lib/vabysmo-wellpoint.js):
// Vabysmo billed today on traditional Medicare (± supplement / MassHealth) or with no insurance
// written → the server sends data.wellpointReminder; the Note page shows it under the note,
// HUB ONLY — never part of result.note, so never copied. Older servers omit it → nothing shown.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseResponse, copyableNoteText } from "../src/lib/noteHelpers.js";
import { parseWellpointReminder, wellpointReminderFor } from "../src/lib/wellpointReminder.js";
import { applyObservationSwitch } from "../src/lib/observationSwitch.js";

const REM = "Wellpoint audit: Vabysmo claims are being denied for treat-and-extend intervals and for switches without monthly reloading. Document disease activity, the reason for the interval, and the loading plan on a switch.";
const NOTE = ["---CODE---", "99214-25", "---PROCEDURE---", "67028-RT, J2777-JZ x60", "---TESTS---", "92134", "---G2211---", "NO",
  "---DIAGNOSES---", "Wet AMD | OD | active", "---NOTE---", "1. Wet AMD OD", "[+] OCT reviewed demonstrating no SRF or IRF OD", "Plan",
  "Vabysmo 6 mg/0.05 mL OD today",
  "[+] Interval individualized per treat-and-extend based on disease activity: no SRF or IRF on OCT, VA stable 20/30.", "F/u 10 weeks", "---END---"].join("\n");

test("parseWellpointReminder: the server string, else null (older servers / junk)", () => {
  assert.equal(parseWellpointReminder({ wellpointReminder: REM }), REM);
  for (const d of [{}, { wellpointReminder: "" }, { wellpointReminder: "  " }, { wellpointReminder: 5 }, null, undefined]) assert.equal(parseWellpointReminder(d), null);
});

test("wellpointReminderFor: shown when the result carries it; survives on-screen edits that spread the result", () => {
  const parsed = parseResponse(NOTE);
  parsed.wellpointReminder = REM;
  assert.equal(wellpointReminderFor(parsed), REM);
  assert.equal(wellpointReminderFor({ ...parsed, note: parsed.note + "\nx" }), REM);
  assert.equal(wellpointReminderFor(applyObservationSwitch(parsed)), REM, "an edit that does not apply returns the same result");
  for (const r of [null, {}, { wellpointReminder: null }]) assert.equal(wellpointReminderFor(r), null);
});

test("never copied: the copyable note text has none of the reminder; the chart sentence stays", () => {
  const parsed = parseResponse(NOTE);
  parsed.wellpointReminder = REM;
  const copied = copyableNoteText(parsed.note);
  for (const hubOnly of [REM, "Wellpoint", "audit", "being denied"]) assert.ok(!copied.includes(hubOnly), hubOnly);
  assert.ok(copied.includes("Interval individualized per treat-and-extend based on disease activity"));
});

test("Note page wiring: parsed from the response, rendered hub-only under the note, copy reads result.note only", () => {
  const src = readFileSync(new URL("../src/ClinicNoteGenerator.jsx", import.meta.url), "utf8");
  assert.match(src, /import \{ parseWellpointReminder, wellpointReminderFor \} from "\.\/lib\/wellpointReminder\.js";/);
  assert.match(src, /parsed\.wellpointReminder = parseWellpointReminder\(data\);/);
  assert.match(src, /const wp = wellpointReminderFor\(result\);[\s\S]{0,600}data-testid="wellpoint-reminder"[\s\S]{0,700}Hub only — not copied into the note\./);
  assert.match(src, /const clean = copyableNoteText\(result\.note\);/);
  const a = src.indexOf("const copyNote = useCallback");
  const body = src.slice(a, src.indexOf("}, [", a));
  assert.ok(a > 0 && !/wellpoint/i.test(body), "copyNote never reads the reminder");
});

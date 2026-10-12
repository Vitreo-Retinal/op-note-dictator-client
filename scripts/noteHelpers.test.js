// Unit tests for src/lib/noteHelpers.js parseResponse — shadow coder v1 (Oct 2026).
// The server now applies the same-day-procedure billing rewrite itself
// (server lib/billed-text.js, a verbatim port of the rules below). This file
// proves the client rewrite is an idempotent no-op on server-rewritten text:
// parse(raw) === parse(pre-rewritten), and parse is stable on no-procedure notes.
// Same fixtures as the server's tests/billed-text.test.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseResponse } from "../src/lib/noteHelpers.js";

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

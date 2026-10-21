// Unit tests for src/lib/noteFlag.js — "Flag for review" delivery (Mari, Oct 21 2026):
// pending flag on Generate/Optimize/New note, one auto-retry on a network failure,
// no retry on a 4xx/5xx answer, failures kept until dismissed. Run with `npm test`.
// Synthetic note ids and reasons only — no patient data.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FLAG_REASON_MAX, FLAG_RETRY_DELAY_MS, flagPayload, pendingFlagToSend, sendNoteFlag, flagErrorText,
  upsertFlagFailure, removeFlagFailure, markFlagFailureSending,
} from "../src/lib/noteFlag.js";

const URL = "https://example.test/api/note-flag";
const jsonRes = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

/** Scripted fetch: each call takes the next step (a response, or an Error to throw). */
function scriptedFetch(steps) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    const step = steps[calls.length - 1];
    if (step instanceof Error) throw step;
    return step;
  };
  fn.calls = calls;
  return fn;
}
function fakeSleep() {
  const waits = [];
  const fn = async (ms) => { waits.push(ms); };
  fn.waits = waits;
  return fn;
}

// ── flagPayload / pendingFlagToSend ──

test("flagPayload: trims and caps the reason at 140, note id + reason only", () => {
  assert.deepEqual(flagPayload("abcDEF123456", "  units off  "), { noteId: "abcDEF123456", reason: "units off" });
  assert.equal(flagPayload("abcDEF123456", "x".repeat(300)).reason.length, FLAG_REASON_MAX);
  assert.deepEqual(Object.keys(flagPayload("n1", "r")), ["noteId", "reason"]);
});

test("pendingFlagToSend: open box with typed text → the flag for that note", () => {
  assert.deepEqual(
    pendingFlagToSend({ noteId: "abcDEF123456", flagOpen: true, flagReason: " -25 missing " }),
    { noteId: "abcDEF123456", reason: "-25 missing" },
  );
});

test("pendingFlagToSend: empty or blank text → nothing (box is just closed)", () => {
  assert.equal(pendingFlagToSend({ noteId: "abcDEF123456", flagOpen: true, flagReason: "" }), null);
  assert.equal(pendingFlagToSend({ noteId: "abcDEF123456", flagOpen: true, flagReason: "   " }), null);
});

test("pendingFlagToSend: closed box, no note id, already flagged, or in flight → nothing", () => {
  const base = { noteId: "abcDEF123456", flagOpen: true, flagReason: "units" };
  assert.equal(pendingFlagToSend({ ...base, flagOpen: false }), null);
  assert.equal(pendingFlagToSend({ ...base, noteId: null }), null);
  assert.equal(pendingFlagToSend({ ...base, flagged: true }), null);
  assert.equal(pendingFlagToSend({ ...base, sending: true }), null);
  assert.equal(pendingFlagToSend(), null);
});

// ── sendNoteFlag ──

test("sendNoteFlag: 200 { ok: true } → ok, one POST with the Send body", async () => {
  const f = scriptedFetch([jsonRes(200, { ok: true })]);
  const out = await sendNoteFlag({ noteId: "abcDEF123456", reason: " G2211 wrong " }, { url: URL, fetchImpl: f, sleep: fakeSleep() });
  assert.deepEqual(out, { ok: true });
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].url, URL);
  assert.equal(f.calls[0].init.method, "POST");
  assert.equal(f.calls[0].init.headers["Content-Type"], "application/json");
  assert.deepEqual(f.calls[0].body, { noteId: "abcDEF123456", reason: "G2211 wrong" });
});

test("sendNoteFlag: network failure → waits ~1.5 s, retries ONCE, then succeeds", async () => {
  const sleep = fakeSleep();
  const f = scriptedFetch([new TypeError("Failed to fetch"), jsonRes(200, { ok: true })]);
  const out = await sendNoteFlag({ noteId: "abcDEF123456", reason: "x" }, { url: URL, fetchImpl: f, sleep });
  assert.deepEqual(out, { ok: true });
  assert.equal(f.calls.length, 2);
  assert.deepEqual(sleep.waits, [FLAG_RETRY_DELAY_MS]);
  assert.equal(FLAG_RETRY_DELAY_MS, 1500);
});

test("sendNoteFlag: network failure twice → kind network, exactly two tries", async () => {
  const f = scriptedFetch([new TypeError("Failed to fetch"), new TypeError("Failed to fetch"), jsonRes(200, { ok: true })]);
  const out = await sendNoteFlag({ noteId: "abcDEF123456", reason: "x" }, { url: URL, fetchImpl: f, sleep: fakeSleep() });
  assert.deepEqual(out, { ok: false, kind: "network" });
  assert.equal(f.calls.length, 2);
});

test("sendNoteFlag: 401 → no retry, server message kept", async () => {
  const sleep = fakeSleep();
  const f = scriptedFetch([jsonRes(401, { error: "Unauthorized — please log in again." }), jsonRes(200, { ok: true })]);
  const out = await sendNoteFlag({ noteId: "abcDEF123456", reason: "x" }, { url: URL, fetchImpl: f, sleep });
  assert.deepEqual(out, { ok: false, kind: "http", status: 401, message: "Unauthorized — please log in again." });
  assert.equal(f.calls.length, 1);
  assert.deepEqual(sleep.waits, []);
});

test("sendNoteFlag: 400 / 429 / 500 → no retry; body without JSON is fine", async () => {
  for (const [status, body, message] of [[400, { ok: false, error: "Invalid noteId." }, "Invalid noteId."], [429, { error: "Too many requests." }, "Too many requests."], [500, null, ""]]) {
    const res = body === null ? { ok: false, status, json: async () => { throw new SyntaxError("no json"); } } : jsonRes(status, body);
    const f = scriptedFetch([res, jsonRes(200, { ok: true })]);
    const out = await sendNoteFlag({ noteId: "abcDEF123456", reason: "x" }, { url: URL, fetchImpl: f, sleep: fakeSleep() });
    assert.deepEqual(out, { ok: false, kind: "http", status, message });
    assert.equal(f.calls.length, 1, `status ${status}`);
  }
});

test("sendNoteFlag: 200 { ok: false } (row not updated) → rejected, no retry", async () => {
  const f = scriptedFetch([jsonRes(200, { ok: false })]);
  const out = await sendNoteFlag({ noteId: "abcDEF123456", reason: "x" }, { url: URL, fetchImpl: f, sleep: fakeSleep() });
  assert.deepEqual(out, { ok: false, kind: "rejected", status: 200 });
  assert.equal(f.calls.length, 1);
});

// ── flagErrorText ──

test("flagErrorText: readable text for each failure kind", () => {
  assert.match(flagErrorText({ ok: false, kind: "network" }), /Couldn't reach the server/);
  assert.equal(flagErrorText({ ok: false, kind: "http", status: 401, message: "Unauthorized — please log in again." }), "The server said: Unauthorized — please log in again.");
  assert.match(flagErrorText({ ok: false, kind: "http", status: 401, message: "lea_session_expired" }), /session expired/);
  assert.match(flagErrorText({ ok: false, kind: "http", status: 502, message: "" }), /\(502\)/);
  assert.match(flagErrorText({ ok: false, kind: "rejected", status: 200 }), /did not save/);
  assert.equal(flagErrorText(null), "");
});

// ── failure list ──

test("failure list: one entry per note id, latest wins; remove; mark sending", () => {
  let l = upsertFlagFailure([], { noteId: "a1b2c3", reason: "r1", message: "m1" });
  l = upsertFlagFailure(l, { noteId: "d4e5f6", reason: "r2", message: "m2" });
  l = upsertFlagFailure(l, { noteId: "a1b2c3", reason: "r1b", message: "m1b" });
  assert.equal(l.length, 2);
  assert.deepEqual(l.find((f) => f.noteId === "a1b2c3"), { noteId: "a1b2c3", reason: "r1b", message: "m1b", sending: false });
  l = markFlagFailureSending(l, "d4e5f6", true);
  assert.equal(l.find((f) => f.noteId === "d4e5f6").sending, true);
  assert.equal(l.find((f) => f.noteId === "a1b2c3").sending, false);
  // a failed retry replaces the entry and clears "sending"
  l = upsertFlagFailure(l, { noteId: "d4e5f6", reason: "r2", message: "m2 again" });
  assert.equal(l.find((f) => f.noteId === "d4e5f6").sending, false);
  l = removeFlagFailure(l, "a1b2c3");
  assert.deepEqual(l.map((f) => f.noteId), ["d4e5f6"]);
  assert.deepEqual(removeFlagFailure(undefined, "x"), []);
});

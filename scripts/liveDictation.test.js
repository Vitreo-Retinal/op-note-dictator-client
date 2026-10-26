// Unit tests for live dictation (Oct 2026): src/lib/liveDictation.js (pure logic)
// and src/lib/liveDictationSession.js (browser glue, run here against fake
// WebSocket / AudioContext / AudioWorkletNode — no network, no mic). `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LIVE_DICTATION_SURGEONS, LIVE_SAMPLE_RATE, LIVE_FRAME_SAMPLES, LIVE_FINAL_TIMEOUT_MS,
  liveDictationAllowed, liveWsUrl, floatToInt16, createResampler, createFramer, int16ToLEBuffer,
  createTurnReconciler, finalText, chooseDelivery,
} from "../src/lib/liveDictation.js";

// ── Gate ────────────────────────────────────────────────────────────

test("allow-list mirrors the server default (MR) and only the regular Dictate goes live", () => {
  assert.deepEqual([...LIVE_DICTATION_SURGEONS], ["MR"]);
  assert.equal(liveDictationAllowed("MR", "insert"), true);
  assert.equal(liveDictationAllowed("MR", "edit"), false);
  assert.equal(liveDictationAllowed("MR", "pbm"), false);
  for (const id of ["BKH", "FJM", "BJB", "WSF", "MANAGER", "mr", "", null, undefined]) assert.equal(liveDictationAllowed(id, "insert"), false, String(id));
  assert.equal(liveDictationAllowed("BKH", "insert", ["MR", "BKH"]), true);
});

test("WebSocket URL comes from the API base (https→wss, http→ws); no token in it", () => {
  assert.equal(liveWsUrl("https://op-note-dictator-server-production.up.railway.app"), "wss://op-note-dictator-server-production.up.railway.app/api/stt/live");
  assert.equal(liveWsUrl("https://srv.test/"), "wss://srv.test/api/stt/live");
  assert.equal(liveWsUrl("http://localhost:3001"), "ws://localhost:3001/api/stt/live");
  assert.equal(liveWsUrl(""), null);
  assert.equal(liveWsUrl("/relative"), null);
});

// ── PCM ─────────────────────────────────────────────────────────────

test("floatToInt16: full-scale mapping, clamping, NaN → 0", () => {
  const out = floatToInt16(Float32Array.from([0, 1, -1, 0.5, -0.5, 1.7, -3, NaN, 1e-6]));
  assert.deepEqual([...out], [0, 32767, -32768, 16384, -16384, 32767, -32768, 0, 0]);
  assert.ok(out instanceof Int16Array);
});

test("resampler 48 kHz → 24 kHz: half the samples, continuous across uneven blocks", () => {
  const r = createResampler(48000, LIVE_SAMPLE_RATE);
  const src = Float32Array.from({ length: 48000 }, (_, i) => i / 48000); // a ramp
  let total = 0;
  const outs = [];
  for (let i = 0; i < src.length;) {
    const n = [128, 77, 1000, 3][outs.length % 4];
    const o = r.process(src.subarray(i, i + n));
    outs.push(o);
    total += o.length;
    i += n;
  }
  assert.ok(Math.abs(total - 24000) <= 1, `got ${total}`);
  const all = Float32Array.from(outs.flatMap((o) => [...o]));
  for (let k = 0; k < all.length; k++) assert.ok(Math.abs(all[k] - (2 * k) / 48000) < 1e-6, `sample ${k}`);
});

test("resampler 44.1 kHz → 24 kHz: length ≈ N·24000/44100 and linear values on a ramp", () => {
  const r = createResampler(44100);
  const src = Float32Array.from({ length: 44100 }, (_, i) => i / 44100);
  let all = [];
  for (let i = 0; i < src.length; i += 128) all = all.concat([...r.process(src.subarray(i, i + 128))]);
  assert.ok(Math.abs(all.length - 24000) <= 2, `got ${all.length}`);
  const step = 44100 / 24000;
  for (const k of [0, 1, 7, 500, 12345, all.length - 1]) assert.ok(Math.abs(all[k] - (k * step) / 44100) < 1e-5, `sample ${k}`);
});

test("resampler: 24 kHz passes through; empty block; bad rate throws", () => {
  const r = createResampler(24000);
  assert.deepEqual([...r.process(Float32Array.from([0.1, 0.2]))].map((x) => +x.toFixed(3)), [0.1, 0.2]);
  assert.equal(r.process(new Float32Array(0)).length, 0);
  assert.throws(() => createResampler(0));
});

test("framer: exact 2,400-sample (100 ms) frames, remainder on flush", () => {
  assert.equal(LIVE_FRAME_SAMPLES, 2400);
  const f = createFramer();
  const src = Int16Array.from({ length: 6000 }, (_, i) => (i % 2000) - 1000);
  const frames = [...f.push(src.subarray(0, 1000)), ...f.push(src.subarray(1000, 5000)), ...f.push(src.subarray(5000))];
  assert.deepEqual(frames.map((x) => x.length), [2400, 2400]);
  const rest = f.flush();
  assert.equal(rest.length, 1200);
  assert.deepEqual([...frames[0], ...frames[1], ...rest], [...src]);
  assert.equal(f.flush(), null);
});

test("int16ToLEBuffer: little-endian bytes", () => {
  const b = new Uint8Array(int16ToLEBuffer(Int16Array.from([1, -2, 0x1234])));
  assert.deepEqual([...b], [0x01, 0x00, 0xfe, 0xff, 0x34, 0x12]);
});

// ── Preview ordering ────────────────────────────────────────────────

test("reconciler: out-of-order completions shown in commit order; partials italic slot", () => {
  const r = createTurnReconciler();
  r.apply({ type: "committed", item_id: "A", previous_item_id: null });
  r.apply({ type: "committed", item_id: "B", previous_item_id: "A" });
  r.apply({ type: "delta", item_id: "B", text: "sec" });
  r.apply({ type: "delta", item_id: "A", text: "fir" });
  r.apply({ type: "delta", item_id: "A", text: "st" });
  assert.deepEqual(r.segments(), [{ text: "first", done: false }, { text: "sec", done: false }]);
  r.apply({ type: "completed", item_id: "B", text: "second." });
  assert.deepEqual(r.segments(), [{ text: "first", done: false }, { text: "second.", done: true }]);
  r.apply({ type: "completed", item_id: "A", text: "First," });
  r.apply({ type: "delta", item_id: "A", text: "late delta ignored" });
  assert.equal(r.text(), "First, second.");
});

test("reconciler: previous_item_id inserts in place; unknown ids fall back to first-seen", () => {
  const r = createTurnReconciler();
  r.apply({ type: "committed", item_id: "A" });
  r.apply({ type: "committed", item_id: "C", previous_item_id: "A" });
  r.apply({ type: "committed", item_id: "B", previous_item_id: "A" });
  ["A", "B", "C"].forEach((id) => r.apply({ type: "completed", item_id: id, text: id }));
  assert.equal(r.text(), "A B C");
  const u = createTurnReconciler();
  u.apply({ type: "delta", item_id: "x", text: "one" });
  u.apply({ type: "completed", item_id: "y", text: "two" });
  assert.equal(u.text(), "one two");
  assert.equal(u.apply({ type: "status", state: "ready" }), false);
  assert.equal(u.apply(null), false);
  u.apply({ type: "completed", item_id: "z", text: "  " });
  assert.equal(u.segments().length, 2, "empty turns are skipped");
});

// ── Delivery decision ───────────────────────────────────────────────

test("finalText prefers cleaned, falls back to transcript", () => {
  assert.equal(finalText({ type: "final", transcript: "raw", cleaned: "clean" }), "clean");
  assert.equal(finalText({ type: "final", transcript: "raw", cleaned: "" }), "raw");
  assert.equal(finalText({ type: "final", transcript: "raw" }), "raw");
  assert.equal(finalText({ type: "delta", text: "x" }), "");
  assert.equal(finalText(null), "");
});

test("chooseDelivery: live text, else the recording, never both", () => {
  assert.deepEqual(chooseDelivery({ ok: true, text: "hello" }, 5000), { use: "live", text: "hello" });
  assert.deepEqual(chooseDelivery({ ok: true, text: "   " }, 5000), { use: "fallback" });
  assert.deepEqual(chooseDelivery({ ok: false, reason: "final_timeout" }, 5000), { use: "fallback" });
  assert.deepEqual(chooseDelivery({ ok: false, reason: "server_error" }, 5000), { use: "fallback" });
  assert.deepEqual(chooseDelivery(null, 5000), { use: "fallback" });
  assert.deepEqual(chooseDelivery({ ok: false }, 0), { use: "none" });
  assert.deepEqual(chooseDelivery({ ok: true, text: "hi" }, 0), { use: "live", text: "hi" });
  assert.equal(LIVE_FINAL_TIMEOUT_MS, 8000);
});

// ── Session glue with fakes ─────────────────────────────────────────

class FakeWS {
  static last = null;
  constructor(url, protocols) {
    this.url = url;
    this.protocols = protocols;
    this.readyState = 0;
    this.sent = [];
    this.closedWith = null;
    FakeWS.last = this;
  }
  send(d) { this.sent.push(d); }
  close(code) { this.closedWith = code; this.readyState = 3; }
  // test helpers
  open() { this.readyState = 1; this.onopen && this.onopen(); }
  msg(obj) { this.onmessage && this.onmessage({ data: JSON.stringify(obj) }); }
  drop() { this.readyState = 3; this.onclose && this.onclose({ code: 1006 }); }
}
class FakeNode {
  static last = null;
  constructor() { this.port = { postMessage: (m) => { if (m === "flush") setTimeout(() => this.port.onmessage && this.port.onmessage({ data: "flushed" }), 1); } }; FakeNode.last = this; }
  connect() {} disconnect() {}
}
class FakeCtx {
  constructor() { this.sampleRate = 48000; this.state = "running"; this.destination = {}; this.audioWorklet = { addModule: async () => {} }; }
  createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
  createGain() { return { gain: { value: 1 }, connect() {}, disconnect() {} }; }
  resume() { return Promise.resolve(); }
  close() { this.state = "closed"; }
}
FakeCtx.prototype.audioWorklet = null;

globalThis.window = { AudioContext: FakeCtx };
globalThis.WebSocket = FakeWS;
globalThis.AudioWorkletNode = FakeNode;
globalThis.sessionStorage = { getItem: (k) => (k === "vra_token" ? "payload.sig" : null) };
URL.createObjectURL = () => "blob:fake";
URL.revokeObjectURL = () => {};

const { startLiveSession, liveDictationSupported, readHubToken } = await import("../src/lib/liveDictationSession.js");
const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));

function begin(extra = {}) {
  const states = [];
  const previews = [];
  const s = startLiveSession({ stream: {}, wsUrl: "wss://srv.test/api/stt/live", token: "payload.sig", onPreview: (p) => previews.push(p), onState: (x) => states.push(x), ...extra });
  return { s, ws: FakeWS.last, states, previews };
}
// 100 ms of a 48 kHz tone → the worklet's port message
const block = (n = 4800) => Float32Array.from({ length: n }, (_, i) => 0.3 * Math.sin(i / 7));
const feed = (n) => FakeNode.last.port.onmessage({ data: block(n) });

test("session: token as subprotocol, never in the URL; feature check; token read", async () => {
  assert.equal(liveDictationSupported(), true);
  assert.equal(readHubToken(), "payload.sig");
  const { s, ws } = begin();
  assert.equal(ws.url, "wss://srv.test/api/stt/live");
  assert.deepEqual(ws.protocols, ["vra-hub", "payload.sig"]);
  s.abort();
});

test("session: audio queued until open, sent as 4,800-byte frames; stop → final → ok", async () => {
  const { s, ws, states, previews } = begin();
  await tick();
  feed(4800); feed(4800); // 200 ms at 48 kHz → 2 frames at 24 kHz
  assert.equal(ws.sent.length, 0, "queued while connecting");
  ws.open();
  assert.deepEqual(ws.sent.map((b) => b.byteLength), [4800, 4800]);
  ws.msg({ type: "committed", item_id: "A", previous_item_id: null });
  ws.msg({ type: "delta", item_id: "A", text: "hello" });
  assert.deepEqual(previews.at(-1), [{ text: "hello", done: false }]);
  feed(1000); // partial frame → flushed at stop
  const p = s.stop();
  assert.equal(s.stop(), p, "stop is idempotent");
  await tick(20);
  const stopIdx = ws.sent.findIndex((m) => typeof m === "string");
  assert.equal(JSON.parse(ws.sent[stopIdx]).type, "stop");
  assert.equal(ws.sent[stopIdx - 1].byteLength, 1000, "remainder (500 samples) sent before stop");
  ws.msg({ type: "final", transcript: "hello there", cleaned: "Hello there.", timings: { turns: 1 } });
  const out = await p;
  assert.deepEqual(out, { ok: true, text: "Hello there.", timings: { turns: 1 } });
  assert.deepEqual(states, ["connecting", "live", "finishing"]);
  ws.msg({ type: "final", transcript: "again", cleaned: "again" }); // ignored after settle
  assert.deepEqual(await p, out);
});

test("session: server error before Stop → failed state; Stop resolves not-ok at once (fallback)", async () => {
  const { s, ws, states } = begin();
  ws.open();
  ws.msg({ type: "error", message: "x" });
  assert.equal(states.at(-1), "failed");
  const out = await s.stop();
  assert.deepEqual(out, { ok: false, reason: "server_error" });
});

test("session: socket never opens / drops → not ok", async () => {
  const a = begin();
  a.ws.drop();
  assert.deepEqual(await a.s.stop(), { ok: false, reason: "socket_closed" });
  const b = begin();
  b.ws.open();
  const p = b.s.stop();
  await tick(10);
  b.ws.drop(); // closes after stop without a final
  assert.deepEqual(await p, { ok: false, reason: "socket_closed" });
});

test("session: no final within the timeout → not ok; a late final is ignored", async () => {
  const { s, ws } = begin({ finalTimeoutMs: 40 });
  ws.open();
  const t0 = Date.now();
  const out = await s.stop();
  assert.deepEqual(out, { ok: false, reason: "final_timeout" });
  assert.ok(Date.now() - t0 >= 35);
  ws.msg({ type: "final", transcript: "late", cleaned: "late" });
  assert.deepEqual(await s.stop(), out);
});

test("session: empty final → not ok (the recording is used instead)", async () => {
  const { s, ws } = begin();
  ws.open();
  const p = s.stop();
  await tick(10);
  ws.msg({ type: "final", transcript: "", cleaned: "" });
  assert.deepEqual(await p, { ok: false, reason: "empty" });
});

test("session: abort resolves once and closes the socket", async () => {
  const { s, ws } = begin();
  ws.open();
  s.abort();
  assert.deepEqual(await s.stop(), { ok: false, reason: "aborted" });
  assert.equal(ws.closedWith, 1000);
});

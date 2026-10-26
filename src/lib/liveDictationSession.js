// Live dictation — browser glue (Oct 2026). Mic stream → AudioWorklet (inline,
// Blob URL, so Vite needs no config) → resample to 24 kHz PCM16 → 100 ms binary
// frames over WSS /api/stt/live. The pure pieces live in ./liveDictation.js.
//
// The caller keeps its MediaRecorder running on the same stream IN PARALLEL.
// stop() resolves exactly once with { ok:true, text } (the server's final) or
// { ok:false, reason } — on any failure the caller POSTs its recording to
// /api/transcribe as before. After stop() resolves, nothing else is delivered.
//
// The hub token travels as a WebSocket subprotocol (["vra-hub", token]); it is
// never put in the URL.

import {
  LIVE_SAMPLE_RATE, LIVE_FINAL_TIMEOUT_MS, LIVE_SUBPROTOCOL,
  createResampler, createFramer, floatToInt16, int16ToLEBuffer, createTurnReconciler, finalText,
} from "./liveDictation.js";

// Posts mono Float32 blocks (~2,048 samples) to the main thread; flushes on request.
const WORKLET_SRC = `
class VraPcmCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buf = new Float32Array(2048);
    this.len = 0;
    this.port.onmessage = (e) => {
      if (e.data === "flush") {
        if (this.len) this.port.postMessage(this.buf.slice(0, this.len));
        this.len = 0;
        this.port.postMessage("flushed");
      }
    };
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      for (let i = 0; i < ch.length; i++) {
        this.buf[this.len++] = ch[i];
        if (this.len === this.buf.length) {
          this.port.postMessage(this.buf);
          this.buf = new Float32Array(2048);
          this.len = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor("vra-pcm-capture", VraPcmCapture);
`;

const MAX_QUEUED_FRAMES = 300; // 30 s of audio while the socket is still opening

/** The hub token the fetch wrapper (main.jsx) sends as "Authorization: Bearer …". */
export function readHubToken() {
  try { return sessionStorage.getItem("vra_token") || null; } catch { return null; }
}

/** True when this browser has what live dictation needs. */
export function liveDictationSupported() {
  try {
    const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
    return !!(AC && typeof WebSocket !== "undefined" && typeof AudioWorkletNode !== "undefined" && AC.prototype && "audioWorklet" in AC.prototype);
  } catch {
    return false;
  }
}

/**
 * Start a live session on an already-open mic stream.
 * opts: { stream, wsUrl, token, onPreview(segments), onState(state) }
 *   state: "connecting" | "live" | "failed" | "finishing"
 * Returns { stop(): Promise<{ok, text?, reason?, timings?}>, abort() }.
 */
export function startLiveSession({ stream, wsUrl, token, onPreview = () => {}, onState = () => {}, finalTimeoutMs = LIVE_FINAL_TIMEOUT_MS }) {
  let settled = false;
  let resolveResult;
  const result = new Promise((r) => { resolveResult = r; });
  let failReason = null;
  let stopRequested = false;
  let finalTimer = null;
  let ctx = null;
  let node = null;
  let source = null;
  let sink = null;
  let workletUrl = null;
  let ws = null;
  const queue = [];
  const reconciler = createTurnReconciler();
  let resampler = null;
  const framer = createFramer();
  let onFlushed = null;

  const finish = (out) => {
    if (settled) return;
    settled = true;
    clearTimeout(finalTimer);
    teardownAudio();
    try { if (ws && ws.readyState <= 1) ws.close(1000); } catch { /* ignore */ }
    resolveResult(out);
  };
  // A failure before Stop: the preview stops, the parallel recording carries on.
  const fail = (reason) => {
    if (settled || failReason) return;
    failReason = reason;
    onState("failed");
    teardownAudio();
    try { if (ws && ws.readyState <= 1) ws.close(1000); } catch { /* ignore */ }
    if (stopRequested) finish({ ok: false, reason });
  };

  function teardownAudio() {
    try { if (node) { node.port.onmessage = null; node.disconnect(); } } catch { /* ignore */ }
    try { if (source) source.disconnect(); } catch { /* ignore */ }
    try { if (sink) sink.disconnect(); } catch { /* ignore */ }
    try { if (ctx && ctx.state !== "closed") ctx.close(); } catch { /* ignore */ }
    try { if (workletUrl) URL.revokeObjectURL(workletUrl); } catch { /* ignore */ }
    node = source = sink = ctx = null;
    workletUrl = null;
  }

  function sendFrame(int16) {
    const bytes = int16ToLEBuffer(int16);
    if (ws && ws.readyState === 1) {
      try { ws.send(bytes); } catch { fail("send"); }
    } else if (!failReason) {
      if (queue.length >= MAX_QUEUED_FRAMES) return fail("socket_slow");
      queue.push(bytes);
    }
  }

  function onAudio(float32) {
    if (failReason || settled || !resampler) return;
    const pcm = floatToInt16(resampler.process(float32));
    for (const f of framer.push(pcm)) sendFrame(f);
  }

  // ── WebSocket ─────────────────────────────────────────────────────
  try {
    ws = new WebSocket(wsUrl, [LIVE_SUBPROTOCOL, token]);
    ws.binaryType = "arraybuffer";
  } catch {
    ws = null;
  }
  onState("connecting");
  if (!ws) {
    fail("socket_create");
  } else {
    ws.onopen = () => {
      if (failReason) return;
      onState("live");
      while (queue.length) ws.send(queue.shift());
      if (stopRequested) ws.send(JSON.stringify({ type: "stop" }));
    };
    ws.onmessage = (ev) => {
      if (settled || failReason || typeof ev.data !== "string") return;
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.type === "final") {
        const text = finalText(msg);
        return finish(text.trim() ? { ok: true, text, timings: msg.timings } : { ok: false, reason: "empty" });
      }
      if (msg.type === "error") return fail("server_error");
      if (reconciler.apply(msg)) onPreview(reconciler.segments());
    };
    ws.onerror = () => fail("socket_error");
    ws.onclose = () => { if (!settled) fail("socket_closed"); };
  }

  // ── Audio capture ─────────────────────────────────────────────────
  (async () => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      resampler = createResampler(ctx.sampleRate, LIVE_SAMPLE_RATE);
      workletUrl = URL.createObjectURL(new Blob([WORKLET_SRC], { type: "application/javascript" }));
      await ctx.audioWorklet.addModule(workletUrl);
      if (failReason || settled || !ctx) return;
      source = ctx.createMediaStreamSource(stream);
      node = new AudioWorkletNode(ctx, "vra-pcm-capture", { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1, channelCountMode: "explicit" });
      node.port.onmessage = (e) => { if (e.data instanceof Float32Array) onAudio(e.data); else if (e.data === "flushed" && onFlushed) onFlushed(); };
      // A silent sink keeps the graph pulling on every browser.
      sink = ctx.createGain();
      sink.gain.value = 0;
      source.connect(node);
      node.connect(sink);
      sink.connect(ctx.destination);
      if (ctx.state !== "running") await ctx.resume();
    } catch {
      fail("audio");
    }
  })();

  // Ask the worklet for its last partial block (≤ ~40 ms), max 250 ms wait.
  function flushWorklet() {
    return new Promise((resolve) => {
      if (!node) return resolve();
      const t = setTimeout(resolve, 250);
      onFlushed = () => { onFlushed = null; clearTimeout(t); resolve(); };
      try { node.port.postMessage("flush"); } catch { clearTimeout(t); resolve(); }
    });
  }

  let stopPromise = null;
  return {
    /** Idempotent. Resolves once with the outcome (≤ LIVE_FINAL_TIMEOUT_MS after the call). */
    stop() {
      if (stopPromise) return stopPromise;
      stopRequested = true;
      if (failReason) { finish({ ok: false, reason: failReason }); return (stopPromise = result); }
      onState("finishing");
      finalTimer = setTimeout(() => finish({ ok: false, reason: "final_timeout" }), finalTimeoutMs);
      stopPromise = (async () => {
        await flushWorklet();
        const rest = framer.flush();
        if (rest && rest.length) sendFrame(rest);
        teardownAudio();
        if (!settled && !failReason && ws && ws.readyState === 1) {
          try { ws.send(JSON.stringify({ type: "stop" })); } catch { fail("send"); }
        }
        // Still connecting: onopen flushes the queue and sends stop.
        return result;
      })();
      return stopPromise;
    },
    /** Drop everything (unmount / cancelled recording). */
    abort() {
      stopRequested = true;
      finish({ ok: false, reason: "aborted" });
    },
  };
}

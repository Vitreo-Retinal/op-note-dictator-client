// Live dictation — pure logic (Oct 2026, per Mari). No DOM, no React: unit-tested
// in scripts/liveDictation.test.js. The browser glue (mic → AudioWorklet →
// WebSocket) lives in ./liveDictationSession.js.
//
// The server relay (WSS /api/stt/live, server lib/stt-live.js) wants PCM16 mono
// little-endian at 24 kHz in ~100 ms binary frames. Browsers capture Float32 at
// the device rate (48 kHz / 44.1 kHz), so we resample + convert here.

/** Doctors who get live dictation (mirrors the server default STT_LIVE_SURGEONS="MR"). */
export const LIVE_DICTATION_SURGEONS = Object.freeze(["MR"]);

export const LIVE_SAMPLE_RATE = 24000;
export const LIVE_FRAME_SAMPLES = 2400;      // 100 ms at 24 kHz
export const LIVE_FINAL_TIMEOUT_MS = 8000;   // after Stop: no final by then → batch fallback
export const LIVE_SUBPROTOCOL = "vra-hub";

/**
 * Live mode only for the regular Dictate button ("insert") and only for an
 * allow-listed doctor. "edit" (Dictate an Edit) and "pbm" always use the batch path.
 */
export function liveDictationAllowed(surgeonId, purpose, list = LIVE_DICTATION_SURGEONS) {
  return purpose === "insert" && typeof surgeonId === "string" && list.includes(surgeonId);
}

/** https://host → wss://host/api/stt/live (http → ws for local dev). */
export function liveWsUrl(apiBase) {
  const base = String(apiBase || "").replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(base)) return null;
  return base.replace(/^http/i, "ws") + "/api/stt/live";
}

/** Float32 [-1, 1] → Int16, clamped (out-of-range input saturates, never wraps). */
export function floatToInt16(input) {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    let s = input[i];
    if (!(s === s)) s = 0; // NaN → silence
    s = s < -1 ? -1 : s > 1 ? 1 : s;
    out[i] = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff);
  }
  return out;
}

/**
 * Streaming linear-interpolation resampler. process(block) may be called with
 * blocks of any size; continuity is kept across blocks, so N input samples give
 * ≈ N × outRate / inRate output samples in total.
 */
export function createResampler(inRate, outRate = LIVE_SAMPLE_RATE) {
  if (!(inRate > 0) || !(outRate > 0)) throw new Error("bad sample rate");
  const step = inRate / outRate;
  let pos = 0;      // position of the next output sample, relative to the current block (may be in [-1, 0))
  let prev = null;  // last sample of the previous block (index -1)
  return {
    inRate,
    outRate,
    process(input) {
      const n = input.length;
      if (!n) return new Float32Array(0);
      if (inRate === outRate) return Float32Array.from(input);
      const out = [];
      const at = (i) => (i < 0 ? (prev == null ? input[0] : prev) : input[i]);
      while (pos < n - 1) {
        const i = Math.floor(pos);
        const f = pos - i;
        out.push(at(i) * (1 - f) + at(i + 1) * f);
        pos += step;
      }
      pos -= n;
      prev = input[n - 1];
      return Float32Array.from(out);
    },
  };
}

/** Collects Int16 samples and emits fixed-size frames (default 100 ms). */
export function createFramer(frameSamples = LIVE_FRAME_SAMPLES) {
  let buf = new Int16Array(frameSamples);
  let len = 0;
  return {
    push(samples) {
      const frames = [];
      let i = 0;
      while (i < samples.length) {
        const take = Math.min(frameSamples - len, samples.length - i);
        buf.set(samples.subarray(i, i + take), len);
        len += take;
        i += take;
        if (len === frameSamples) {
          frames.push(buf);
          buf = new Int16Array(frameSamples);
          len = 0;
        }
      }
      return frames;
    },
    /** The partial last frame (or null). */
    flush() {
      if (!len) return null;
      const out = buf.slice(0, len);
      buf = new Int16Array(frameSamples);
      len = 0;
      return out;
    },
  };
}

/** Int16Array → little-endian bytes for a WebSocket binary frame. */
export function int16ToLEBuffer(samples) {
  const out = new ArrayBuffer(samples.length * 2);
  const view = new DataView(out);
  for (let i = 0; i < samples.length; i++) view.setInt16(i * 2, samples[i], true);
  return out;
}

/**
 * Preview state from the relay's messages, keyed by item_id. Turns are ordered
 * by commit ("committed" carries previous_item_id); first-seen order otherwise.
 * Completions may arrive out of order — each lands in its own slot.
 */
export function createTurnReconciler() {
  const order = [];
  const items = new Map();
  const item = (id) => {
    let it = items.get(id);
    if (!it) { it = { partial: "", text: null }; items.set(id, it); }
    return it;
  };
  const place = (id, prevId) => {
    if (order.includes(id)) return;
    if (prevId && order.includes(prevId)) order.splice(order.indexOf(prevId) + 1, 0, id);
    else order.push(id);
  };
  return {
    /** Apply one server message; returns true when the preview changed. */
    apply(msg) {
      if (!msg || !msg.item_id) return false;
      const id = String(msg.item_id);
      if (msg.type === "committed") { item(id); place(id, msg.previous_item_id); return true; }
      if (msg.type === "delta") { const it = item(id); place(id, null); if (it.text == null) it.partial += String(msg.text || ""); return true; }
      if (msg.type === "completed") { const it = item(id); place(id, null); it.text = String(msg.text || ""); return true; }
      return false;
    },
    /** [{ text, done }] in turn order (empty turns skipped). */
    segments() {
      return order
        .map((id) => { const it = items.get(id); return it.text != null ? { text: it.text.trim(), done: true } : { text: it.partial.trim(), done: false }; })
        .filter((s) => s.text);
    },
    /** Plain preview text. */
    text() {
      return this.segments().map((s) => s.text).join(" ");
    },
  };
}

/** Text to insert from the server's final message (cleaned first, like /api/transcribe). */
export function finalText(final) {
  if (!final || final.type !== "final") return "";
  const t = typeof final.cleaned === "string" && final.cleaned.trim() ? final.cleaned : final.transcript;
  return typeof t === "string" ? t : "";
}

/**
 * After Stop: which text reaches the note? Exactly one source, never both.
 *   live    — the live session finished with non-empty text
 *   fallback — anything else, if the parallel recording has audio (POST /api/transcribe)
 *   none    — nothing was recorded
 */
export function chooseDelivery(liveResult, blobBytes) {
  if (liveResult && liveResult.ok && typeof liveResult.text === "string" && liveResult.text.trim()) {
    return { use: "live", text: liveResult.text };
  }
  if (blobBytes > 0) return { use: "fallback" };
  return { use: "none" };
}

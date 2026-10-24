// Unit tests for src/lib/hubUnlock.js — day-long doctor unlock (Mari, Oct 24 2026).
// Fake tokens only (unsigned payloads); no secrets, no patient data. Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeUnlockStore, tokenExp, localYmd } from "../src/lib/hubUnlock.js";

const b64url = (s) => Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fakeToken = (body) => `${b64url(JSON.stringify(body))}.sig`;
function memStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m };
}
const NOW = Date.UTC(2026, 9, 24, 18, 30);
const opts = (day = "2026-10-24", now = NOW) => ({ now: () => now, today: () => day });

test("tokenExp reads exp from the payload", () => {
  assert.equal(tokenExp(fakeToken({ role: "doctor", sid: "MR", exp: NOW + 1000 })), NOW + 1000);
  assert.equal(tokenExp("garbage"), 0);
  assert.equal(tokenExp(null), 0);
  assert.equal(tokenExp("bm90IGpzb24.sig"), 0);
});

test("save then read on the same day returns id + token", () => {
  const s = memStorage(); const st = makeUnlockStore(s, "k", opts());
  const t = fakeToken({ role: "doctor", sid: "MR", exp: NOW + 3600e3 });
  st.save("MR", t);
  assert.deepEqual(st.read(), { id: "MR", token: t });
  assert.deepEqual(st.read(["MR", "BKH"]), { id: "MR", token: t });
});

test("next day → dropped and cleared", () => {
  const s = memStorage(); const t = fakeToken({ role: "doctor", exp: NOW + 48 * 3600e3 });
  makeUnlockStore(s, "k", opts("2026-10-24")).save("MR", t);
  assert.equal(makeUnlockStore(s, "k", opts("2026-10-25")).read(), null);
  assert.equal(s.getItem("k"), null);
});

test("expired token → dropped (PIN asked again)", () => {
  const s = memStorage(); const st = makeUnlockStore(s, "k", opts());
  st.save("MR", fakeToken({ role: "doctor", exp: NOW - 1 }));
  assert.equal(st.read(), null);
  assert.equal(s.getItem("k"), null);
});

test("old phone value without a token → no unlock", () => {
  const s = memStorage(); s.setItem("k", JSON.stringify({ id: "MR", day: "2026-10-24" }));
  assert.equal(makeUnlockStore(s, "k", opts()).read(), null);
});

test("unknown doctor id → dropped", () => {
  const s = memStorage(); const st = makeUnlockStore(s, "k", opts());
  st.save("ZZZ", fakeToken({ role: "doctor", exp: NOW + 1000 }));
  assert.equal(st.read(["MR", "BKH"]), null);
});

test("clear() removes it; bad JSON is tolerated", () => {
  const s = memStorage(); const st = makeUnlockStore(s, "k", opts());
  st.save("MR", fakeToken({ exp: NOW + 1000 }));
  st.clear();
  assert.equal(st.read(), null);
  s.setItem("k", "{not json");
  assert.equal(st.read(), null);
});

test("save ignores a missing id or token; storage errors never throw", () => {
  const s = memStorage(); const st = makeUnlockStore(s, "k", opts());
  st.save("", "x"); st.save("MR", null);
  assert.equal(s.getItem("k"), null);
  const broken = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } };
  const bt = makeUnlockStore(broken, "k", opts());
  assert.doesNotThrow(() => bt.save("MR", "a.b"));
  assert.equal(bt.read(), null);
});

test("localYmd formats the local date", () => {
  assert.equal(localYmd(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
});

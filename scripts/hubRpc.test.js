// Unit tests for src/lib/hubRpc.js — hub data through the server (security stage 3,
// Oct 24 2026). Stubbed fetch only; no network, no patient data. Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { hubRpc, HUB_RPC_FUNCTIONS } from "../src/lib/hubRpc.js";

const okFetch = (payload, status = 200) => {
  const calls = [];
  const f = async (url, init) => { calls.push({ url, init }); return { ok: status < 400, status, json: async () => payload }; };
  f.calls = calls;
  return f;
};

test("POSTs { fn, args } to /api/hub-data and returns { data, error }", async () => {
  const f = okFetch({ data: [{ code: "67028" }], error: null });
  const r = await hubRpc("hub_compare", { p_code: "67028", p_network: "X", p_lob: "C", p_kind: "field" }, { fetchImpl: f, base: "https://srv.test" });
  assert.deepEqual(r, { data: [{ code: "67028" }], error: null });
  assert.equal(f.calls[0].url, "https://srv.test/api/hub-data");
  assert.equal(f.calls[0].init.method, "POST");
  assert.deepEqual(JSON.parse(f.calls[0].init.body), { fn: "hub_compare", args: { p_code: "67028", p_network: "X", p_lob: "C", p_kind: "field" } });
});

test("no args → empty object", async () => {
  const f = okFetch({ data: [], error: null });
  await hubRpc("hub_codes", undefined, { fetchImpl: f, base: "https://srv.test" });
  assert.deepEqual(JSON.parse(f.calls[0].init.body), { fn: "hub_codes", args: {} });
});

test("403 from the server → { data: null, error } (never throws)", async () => {
  const f = okFetch({ data: null, error: { message: "Not available in this view." } }, 403);
  const r = await hubRpc("hub_codes", {}, { fetchImpl: f, base: "x" });
  assert.equal(r.data, null);
  assert.equal(r.error.message, "Not available in this view.");
});

test("network failure → { data: null, error }", async () => {
  const r = await hubRpc("hub_codes", {}, { fetchImpl: async () => { throw new Error("offline"); }, base: "x" });
  assert.deepEqual(r, { data: null, error: { message: "offline" } });
});

test("non-JSON error body → HTTP status message", async () => {
  const f = async () => ({ ok: false, status: 502, json: async () => { throw new Error("bad json"); } });
  const r = await hubRpc("hub_codes", {}, { fetchImpl: f, base: "x" });
  assert.deepEqual(r, { data: null, error: { message: "HTTP 502" } });
});

test("the eight functions match the server allow-list", () => {
  assert.deepEqual([...HUB_RPC_FUNCTIONS].sort(), [
    "hub_call_schedule", "hub_codes", "hub_compare", "hub_drug_economics_v3",
    "hub_insurance_dict", "hub_networks", "hub_rvu", "hub_surgeon_schedule",
  ]);
});

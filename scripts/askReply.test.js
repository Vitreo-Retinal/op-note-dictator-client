// Unit tests for src/lib/askReply.js — Ask reply extras (Ask AI Phase B, Mari Oct 31 2026):
// coverage cards + copy block ride on the assistant message, only { role, content } goes back
// to the server, and the "Flag" payload / delivery. Synthetic text only — no patient data.
import { test } from "node:test";
import assert from "node:assert/strict";
import { splitCoverageReply, assistantMessage, historyForServer, questionFor, askFlagPayload, sendAskFlag, ASK_FLAG_REASON_MAX } from "../src/lib/askReply.js";

const CARD = { kind: "rule", drug: "Eylea 2mg", insurance: "BCBS of MA PPO", status: "yellow", requirements: ["PA required"] };
const DATA = { success: true, reply: "Coverage for Eylea 2mg · BCBS of MA PPO · Wet AMD", cards: [CARD], copyText: "COVERAGE REFERENCE - Eylea 2mg / BCBS of MA PPO",
  meta: { intents: ["coverage"], model: null, coverage: { outcome: "card", planId: 578, drug: "Eylea 2mg", diagnosis: "Wet AMD", ruleId: "rs3:d4:g1" } } };

test("assistantMessage keeps cards, copyText and meta; a plain reply stays plain", () => {
  const m = assistantMessage(DATA);
  assert.deepEqual(Object.keys(m).sort(), ["cards", "content", "copyText", "meta", "role"]);
  assert.equal(m.cards[0], CARD);
  assert.deepEqual(assistantMessage({ reply: "Use -50." }), { role: "assistant", content: "Use -50." });
  assert.deepEqual(assistantMessage({ reply: "x", cards: [], copyText: "  " }), { role: "assistant", content: "x" });
});

test("historyForServer sends role + string content only", () => {
  const msgs = [{ role: "user", content: "Eylea on BCBS?" }, assistantMessage(DATA), { role: "user", content: "DME" }, { role: "system", content: "x" }, null];
  assert.deepEqual(historyForServer(msgs), [{ role: "user", content: "Eylea on BCBS?" }, { role: "assistant", content: DATA.reply }, { role: "user", content: "DME" }]);
});

test("askFlagPayload: the question the reply answers, the reply, its cards and ids, optional reason", () => {
  const msgs = [{ role: "user", content: "Does BCBS PPO need PA for Eylea for wet AMD?" }, assistantMessage(DATA)];
  assert.equal(questionFor(msgs, 1), "Does BCBS PPO need PA for Eylea for wet AMD?");
  assert.deepEqual(askFlagPayload(msgs, 1, "  wrong plan  "), {
    question: "Does BCBS PPO need PA for Eylea for wet AMD?", answer: DATA.reply, cards: [CARD], intents: ["coverage"],
    planId: 578, drug: "Eylea 2mg", diagnosis: "Wet AMD", ruleId: "rs3:d4:g1", model: null, reason: "wrong plan" });
  const plain = askFlagPayload([{ role: "user", content: "q" }, { role: "assistant", content: "a" }], 1, "");
  assert.deepEqual(plain, { question: "q", answer: "a", cards: [], intents: null, planId: null, drug: null, diagnosis: null, ruleId: null, model: null });
  assert.equal(askFlagPayload(msgs, 1, "x".repeat(400)).reason.length, ASK_FLAG_REASON_MAX);
});

test("sendAskFlag: ok only on { ok: true }; HTTP and network failures come back, never throw", async () => {
  const sent = [];
  const okFetch = async (url, init) => { sent.push([url, JSON.parse(init.body)]); return { ok: true, status: 200, json: async () => ({ ok: true }) }; };
  assert.deepEqual(await sendAskFlag({ question: "q", answer: "a" }, { url: "https://x.test/api/ask-flag", fetchImpl: okFetch }), { ok: true });
  assert.deepEqual(sent[0], ["https://x.test/api/ask-flag", { question: "q", answer: "a" }]);
  assert.deepEqual(await sendAskFlag({}, { url: "u", fetchImpl: async () => ({ ok: false, status: 400, json: async () => ({ ok: false, error: "Missing question or answer." }) }) }),
    { ok: false, error: "Missing question or answer." });
  assert.deepEqual(await sendAskFlag({}, { url: "u", fetchImpl: async () => { throw new Error("offline"); } }), { ok: false, error: "network" });
});

test("splitCoverageReply: the coverage line, then the coding section (the card goes between)", () => {
  assert.deepEqual(splitCoverageReply("Coverage for Eylea 2mg · X · Wet AMD\n\n**Coding**\nUse -50."), { head: "Coverage for Eylea 2mg · X · Wet AMD", coding: "**Coding**\nUse -50." });
  assert.deepEqual(splitCoverageReply("Which diagnosis — Wet AMD or DME?"), { head: "Which diagnosis — Wet AMD or DME?", coding: "" });
});

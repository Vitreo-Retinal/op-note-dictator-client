// Unit tests for src/lib/phoneText.js — run with `npm test` (node --test).
import { test } from "node:test";
import assert from "node:assert/strict";
import { findPhones, phoneSegments, faxLineFlags, telOf, registerFaxNumbers, isKnownFax, isFax } from "../src/lib/phoneText.js";

// [text, number] pairs → what was found: [{ text, fax }]
const found = (text, opts) => findPhones(text, opts).map((p) => ({ text: p.text, fax: p.fax, href: p.href }));
const voice = (text, number, href) => {
  const f = found(text);
  assert.equal(f.length, 1, `one number in: ${text}`);
  assert.equal(f[0].text, number);
  assert.equal(f[0].fax, false, `voice: ${text}`);
  if (href) assert.equal(f[0].href, href);
};
const fax = (text, number) => {
  const f = found(text);
  assert.equal(f.length, 1, `one number in: ${text}`);
  assert.equal(f[0].text, number);
  assert.equal(f[0].fax, true, `fax: ${text}`);
  assert.equal(f[0].href, null);
};
const none = (text) => assert.deepEqual(found(text), [], `no phone in: ${text}`);

test("voice formats become tel: links", () => {
  voice("Call 508-752-1155 today", "508-752-1155", "tel:+15087521155");
  voice("Main line (508) 752-1155.", "(508) 752-1155", "tel:+15087521155");
  voice("508.752.1155", "508.752.1155", "tel:+15087521155");
  voice("Worcester 508 752 1155", "508 752 1155", "tel:+15087521155");
  voice("+1 508-752-1155", "+1 508-752-1155", "tel:+15087521155");
  voice("+15087521155 is not split but +1 (508) 752-1155 is", "+1 (508) 752-1155");
  voice("Toll free 1-800-555-1234", "1-800-555-1234", "tel:+18005551234");
  voice("1 800 555 1234", "1 800 555 1234", "tel:+18005551234");
  voice("Aundrea (cell 774-279-9043)", "774-279-9043");
  voice("**Worcester:** 508-752-1155", "508-752-1155");
  voice("Phone: 978-786-9600", "978-786-9600");
});

test("fax-labeled numbers are never links", () => {
  fax("Fax: 617-555-0123", "617-555-0123");
  fax("fax 617-555-0123", "617-555-0123");
  fax("Worcester office fax: 617-555-0123", "617-555-0123");
  fax("Fax number 617-555-0123", "617-555-0123");
  fax("Fax No. 617-555-0123", "617-555-0123");
  fax("Send records by fax to 617-555-0123", "617-555-0123");
  fax("F: 617-555-0123", "617-555-0123");
  fax("F. 617-555-0123", "617-555-0123");
  fax("**F:** 617-555-0123", "617-555-0123");
  fax("617-555-0123 (fax)", "617-555-0123");
  fax("617-555-0123 (F)", "617-555-0123");
  fax("617-555-0123 fax", "617-555-0123");
  fax("PA eFax 617-555-0123", "617-555-0123");
  fax("**UMass ED fax:** 617-555-0123", "617-555-0123");
});

test("caller-forced fax context", () => {
  const f = found("617-555-0123", { fax: true });
  assert.equal(f.length, 1);
  assert.equal(f[0].fax, true);
  assert.equal(f[0].href, null);
});

test("known fax numbers stay plain even without a label", () => {
  fax("Worcester: 508-752-4862", "508-752-4862");
  fax("Leominster 978.534.3210", "978.534.3210");
  fax("UMass ED (508) 421-1641", "(508) 421-1641");
  registerFaxNumbers(["(413) 555-0199"]);
  assert.ok(isKnownFax("413-555-0199"));
  fax("Payer line 413-555-0199", "413-555-0199");
});

test("text with both a phone and a fax", () => {
  const f = found("Phone 617-555-0100 · Fax 617-555-0123");
  assert.deepEqual(f.map((x) => [x.text, x.fax]), [["617-555-0100", false], ["617-555-0123", true]]);
  const g = found("P: 617-555-0100 F: 617-555-0123");
  assert.deepEqual(g.map((x) => [x.text, x.fax]), [["617-555-0100", false], ["617-555-0123", true]]);
  const h = found("Fax 617-555-0123 or call 617-555-0100");
  assert.deepEqual(h.map((x) => [x.text, x.fax]), [["617-555-0123", true], ["617-555-0100", false]]);
  const i = found("617-555-0100 (main), 617-555-0123 (fax)");
  assert.deepEqual(i.map((x) => [x.text, x.fax]), [["617-555-0100", false], ["617-555-0123", true]]);
  // A list after one fax label: every number in it is a fax.
  const j = found("Fax 617-555-0123, 617-555-0124 and 617-555-0125");
  assert.deepEqual(j.map((x) => x.fax), [true, true, true]);
  // A "fax" label on the line above does not leak into the next line.
  const k = found("Fax: 617-555-0123\nPhone: 617-555-0100");
  assert.deepEqual(k.map((x) => [x.text, x.fax]), [["617-555-0123", true], ["617-555-0100", false]]);
});

test("extensions: only the main number is linked", () => {
  const segs = phoneSegments("Call 617-555-0100 ext. 104");
  assert.deepEqual(segs, [
    { type: "text", text: "Call " },
    { type: "tel", text: "617-555-0100", href: "tel:+16175550100" },
    { type: "text", text: " ext. 104" },
  ]);
  voice("617-555-0100 x104", "617-555-0100");
  voice("617-555-0100x104", "617-555-0100");
  none("Nana — ext. 138 (mobile)");
  none("Aundrea x104, Brittany ext 105");
});

test("IDs, codes, dates and times are not phones", () => {
  none("NPI 1234567890");
  none("Tax ID 041234567");
  none("5087521155");
  none("Member ID: 234 567 8901");
  none("Group #: 234-567-8901");
  none("Policy 234-567-8901");
  none("CPT 67028, 92134, 92250 and 99214-25");
  none("67028 92134 92250");
  none("ICD-10 H35.3211, E11.3513");
  none("J0178 J2778 Q5124");
  none("Worcester, MA 01605-1234");
  none("Dates 10/09/2026, 2026-10-09, 10-09-2026");
  none("6:30-3:00 · 8:00–close · 10:30-11:45 AM");
  none("Visual acuity 20/40 OD, IOP 15");
  none("Order 123-456-7890"); // area code can't start with 1
  none("ID-508-752-1155");
  none("508-752-1155-2");
  none("12508-752-1155");
});

test("phoneSegments keeps all text and marks fax segments", () => {
  const segs = phoneSegments("Worcester 617-555-0100, fax 617-555-0123.");
  assert.equal(segs.map((s) => s.text).join(""), "Worcester 617-555-0100, fax 617-555-0123.");
  assert.deepEqual(segs.map((s) => s.type), ["text", "tel", "text", "fax", "text"]);
});

test("phoneSegments with matches found on a larger string (markdown tokens)", () => {
  const line = "**Fax:** 617-555-0123 · **Main:** 617-555-0100";
  const phones = findPhones(line);
  // the token after the first bold
  const tail = line.slice(8);
  const segs = phoneSegments(tail, { phones, offset: 8 });
  const types = segs.filter((s) => s.type !== "text").map((s) => [s.type, s.text]);
  assert.deepEqual(types, [["fax", "617-555-0123"], ["tel", "617-555-0100"]]);
});

test("faxLineFlags: fax headings and fax tables", () => {
  const lines = [
    "**Fax numbers:**",
    "- Springfield: 617-555-0123",
    "- Boston: 617-555-0124",
    "",
    "**Phone:**",
    "- Springfield: 617-555-0100",
    "| Office | Phone | Fax |",
    "|---|---|---|",
    "| Springfield | 617-555-0100 | 617-555-0123 |",
    "Call 617-555-0100",
  ];
  assert.deepEqual(faxLineFlags(lines), [true, true, true, false, false, false, true, true, true, false]);
});

test("helpers", () => {
  assert.equal(telOf("(508) 752-1155"), "tel:+15087521155");
  assert.equal(telOf("1-800-555-1234"), "tel:+18005551234");
  assert.equal(telOf("104"), null);
  assert.ok(isFax("ED fax"));
  assert.ok(!isFax("Phone"));
});

// IRD genetic testing pamphlet (cond-ird-genetic-testing) — Oct 29 2026
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { HANDOUTS } from "../src/data/educationContent.js";

const h = HANDOUTS.find((x) => x.id === "cond-ird-genetic-testing");

test("IRD genetic testing handout exists in all four languages", () => {
  assert.ok(h, "handout missing");
  assert.strictEqual(h.category, "condition");
  for (const lang of ["en", "es", "vi", "pt"]) {
    assert.ok(h.title[lang], `title ${lang}`);
    const c = h.content[lang];
    assert.ok(c && c.length > 500, `content ${lang}`);
    // Two tables, balanced markers
    assert.strictEqual((c.match(/^\[TABLE\]$/gm) || []).length, 2, `tables ${lang}`);
    assert.strictEqual((c.match(/^\[\/TABLE\]$/gm) || []).length, 2, `table ends ${lang}`);
    assert.ok(c.includes("508-752-1155"), `phone ${lang}`);
  }
});

// The matcher's IRD rule is shared with the advisor strip (Oct 29 2026): src/lib/advisor.js.
// Check that the matcher still uses it for this handout, then test the regex itself.
import { IRD_RX } from "../src/lib/advisor.js";
const src = fs.readFileSync(new URL("../src/NoteEducationMatcher.jsx", import.meta.url), "utf8");
const rx = /if \(IRD_RX\.test\(combined\)\)[^\n]*\n\s*matched\.add\("cond-ird-genetic-testing"\)/.test(src) ? IRD_RX : null;

test("matcher suggests the IRD handout for inherited retinal diseases", () => {
  assert.ok(rx, "IRD matcher rule not found");
  for (const s of ["retinitis pigmentosa ou", "rp ou, stable", "stargardt disease", "usher syndrome type 2", "cone-rod dystrophy", "h35.52 hereditary retinal dystrophy", "choroideremia", "x-linked retinoschisis"]) {
    assert.ok(rx.test(s), s);
  }
});

test("matcher does not suggest the IRD handout for unrelated notes", () => {
  for (const s of ["prp os for pdr", "rpe atrophy, dry amd", "wet amd od, eylea", "retinal detachment repair", "crvo with cme", "best corrected vision 20/40"]) {
    assert.ok(!rx.test(s), s);
  }
});

// ── Phone numbers in plain text → tap-to-call (Oct 2026, per Mari) ───
// index.html sets <meta name="format-detection" content="telephone=no"> so
// iPhone Safari never auto-links a number (fax numbers must never be
// tappable). That also switched off the automatic links on VOICE numbers, so
// every text that can carry a number goes through this module (rendered by
// src/PhoneText.jsx): voice numbers become tel: links, fax numbers stay plain.
//
// Pure JS, no React, no import.meta — tested with `npm test` (node --test).
//
// What counts as a phone number: a US number, 10 digits after an optional
// +1 / 1, with separators — 508-752-1155, (508) 752-1155, 508.752.1155,
// 508 752 1155, +1 508-752-1155, 1-800-555-1234. Area code and exchange start
// with 2-9 (NANP). NOT matched: 10 digits with no separators (NPI, tax IDs),
// 3–4 digit extensions, dates, times, CPT/ICD/J-codes, zip codes, and any
// number labeled as an ID (member, group, policy, NPI, claim, auth …).
//
// FAX (never a link, rendered as plain selectable text) when:
//   · the caller says so ({ fax: true } — e.g. a directory entry that is a fax line);
//   · "fax"/"facsimile" appears in the ~24 characters before the number on the
//     same line (cut at the previous number and at a table "|"), or the
//     label right before it is "F:" / "F." / "Fx:";
//   · "(fax)" / "(F)" or a bare trailing "fax" follows it ("508-752-4862 fax");
//   · its digits are a KNOWN fax number (office faxes below, plus every fax
//     the hub directory returns — see registerFaxNumbers / vraDirectory.js).
// When in doubt the rules lean to "fax" (plain text): a voice number that
// isn't tappable is an annoyance, a tappable fax is a wrong call.

// "fax" anywhere in a word (fax, faxed, e-fax, eFax) or "facsimile".
export const FAX_WORD_RE = /fax|facsimile/i;
// Directory labels: the word "fax" ("Fax", "ED fax", note "fax").
const FAX_LABEL_RE = /\bfax\b/i;

/** True when any of the texts names a fax line ("Fax", "ED fax", note "fax"). */
export function isFax(...texts) {
  return texts.some((t) => FAX_LABEL_RE.test(String(t || "")));
}

// Office fax numbers (server lib/vra-directory.js, Oct 2026) so they stay
// plain even before /api/directory has loaded. registerFaxNumbers() adds the
// rest at runtime.
const KNOWN_FAX = new Set(["5087524862", "9785343210", "5084211641"]);

const last10 = (s) => String(s || "").replace(/\D/g, "").slice(-10);

/** Remember fax numbers (any format) so they are never linked anywhere. */
export function registerFaxNumbers(numbers) {
  for (const n of numbers || []) {
    const d = last10(n);
    if (d.length === 10) KNOWN_FAX.add(d);
  }
}

/** True when the number's digits belong to a known fax line. */
export const isKnownFax = (n) => KNOWN_FAX.has(last10(n));

/** "(508) 752-1155" → "tel:+15087521155" (null when it is not 10/11 digits). */
export function telOf(n) {
  const d = String(n || "").replace(/\D/g, "");
  if (d.length === 10) return `tel:+1${d}`;
  if (d.length === 11 && d[0] === "1") return `tel:+${d}`;
  return null;
}

// Separators: dash, dot, space or non-breaking space (never a line break).
const PHONE_RE = /(\+1[-.  ]?|\b1[-.  ])?(\([2-9]\d{2}\)[-  ]?|[2-9]\d{2}[-.  ])[2-9]\d{2}[-.  ]\d{4}/g;

// A label that makes the digits an identifier, not a phone ("Member ID: 234 567 8901").
const ID_LABEL_RE = /\b(?:member|group|grp|policy|subscriber|id|npi|tin|ein|tax|ssn|acct|account|claim|ref|reference|auth|authorization|case|confirmation|conf|order|invoice|rx|dob|mrn|chart)\b\.?\s*(?:id|no\.?|number|num|#)?\s*[:#]?[*_\s]*$/i;
// "F: " / "F. " / "Fx: " right before the number (markdown ** allowed).
const F_LABEL_RE = /(?:^|[^A-Za-z])(?:F|Fx|FX)[.:][*_\s]*$/;
// "(fax)" / "(F)" right after, or a bare trailing "fax" ("508-752-4862 fax").
const FAX_AFTER_RE = /^[*_]*\s*(?:\((?:fax|f)\)|[-–—]?\s*fax\s*(?:$|[).;,:\n*]))/i;
const EXT_AFTER_RE = /^(?:x|ext\.?|extension)\s*\d/i;

const isWordChar = (c) => !!c && /[A-Za-z0-9_]/.test(c);
const isDigit = (c) => !!c && c >= "0" && c <= "9";

/**
 * Every US phone number in `text` → [{ start, end, text, fax, href }].
 * `href` is the tel: link for a voice number, null for a fax.
 * Options: fax — every number here is a fax (caller knows the context).
 */
export function findPhones(text, { fax = false } = {}) {
  const s = String(text == null ? "" : text);
  const out = [];
  PHONE_RE.lastIndex = 0;
  let prevEnd = 0;
  let m;
  while ((m = PHONE_RE.exec(s))) {
    const start = m.index;
    const end = start + m[0].length;
    // Boundaries (no lookbehind: older iOS Safari can't parse it).
    const p1 = s[start - 1], p2 = s[start - 2];
    const n1 = s[end], n2 = s[end + 1];
    const badBefore = isWordChar(p1) || ((p1 === "-" || p1 === "." || p1 === "/" || p1 === "+") && isWordChar(p2));
    const badAfter = isDigit(n1)
      || ((n1 === "-" || n1 === "." || n1 === "/") && isDigit(n2))
      || (/[A-Za-z_]/.test(n1 || "") && !EXT_AFTER_RE.test(s.slice(end)));
    if (badBefore || badAfter) { PHONE_RE.lastIndex = start + 1; continue; }

    // Context window: same line, after the previous number, after a table "|".
    const lineStart = s.lastIndexOf("\n", start - 1) + 1;
    let from = Math.max(lineStart, prevEnd, start - 24);
    const bar = s.lastIndexOf("|", start - 1);
    if (bar >= from) from = bar + 1;
    const before = s.slice(from, start);
    const tightBefore = s.slice(Math.max(lineStart, prevEnd), start);
    // "Fax 508-752-4862, 978-534-3210": a number that only continues a fax list is a fax too.
    const prev = out[out.length - 1];
    const continuesFax = !!prev && prev.fax && prevEnd > lineStart && /^[\s,;/&]*(?:(?:and|or)\s+)?$/i.test(tightBefore);
    prevEnd = end;

    if (ID_LABEL_RE.test(tightBefore)) continue; // an ID, not a phone: leave as text

    const isFaxNum = fax
      || continuesFax
      || FAX_WORD_RE.test(before)
      || F_LABEL_RE.test(tightBefore)
      || FAX_AFTER_RE.test(s.slice(end, end + 14))
      || isKnownFax(m[0]);
    out.push({ start, end, text: m[0], fax: isFaxNum, href: isFaxNum ? null : telOf(m[0]) });
  }
  return out;
}

/**
 * Split `text` into segments: { type: "text", text } | { type: "tel", text, href }
 * | { type: "fax", text }. `phones` (optional) are matches found on a larger
 * string that `text` sits in at `offset` (used by the chat markdown renderer so
 * labels in another token — "**Fax:** 508-…" — still count). A phone that
 * straddles the slice is left as text.
 */
export function phoneSegments(text, { fax = false, phones = null, offset = 0 } = {}) {
  const s = String(text == null ? "" : text);
  const list = phones || findPhones(s, { fax });
  const segs = [];
  let at = 0;
  for (const p of list) {
    const a = p.start - offset, b = p.end - offset;
    if (a < at || b > s.length) continue;
    if (a > at) segs.push({ type: "text", text: s.slice(at, a) });
    segs.push(p.fax || !p.href ? { type: "fax", text: s.slice(a, b) } : { type: "tel", text: s.slice(a, b), href: p.href });
    at = b;
  }
  if (at < s.length) segs.push({ type: "text", text: s.slice(at) });
  return segs;
}

/**
 * Multi-line context for chat answers: which lines are fax-only.
 *  · A fax heading ("**Fax numbers:**", "Fax:") with no number on it makes the
 *    lines under it fax until a blank line or the next heading.
 *  · A markdown table whose header row mentions fax: every number in it is
 *    treated as fax (safe side; the chat renders tables as plain lines).
 * Returns an array of booleans, one per line.
 */
export function faxLineFlags(lines) {
  const flags = new Array(lines.length).fill(false);
  let section = false;
  let tableFax = null; // null = not in a table
  for (let i = 0; i < lines.length; i++) {
    const raw = String(lines[i] || "");
    const line = raw.trim();
    const bare = line.replace(/[*_#>`]/g, "").trim();
    const isTable = line.startsWith("|");
    if (isTable) {
      if (tableFax === null) tableFax = FAX_WORD_RE.test(line);
      flags[i] = tableFax || section;
      continue;
    }
    tableFax = null;
    if (!line) { section = false; continue; }
    const heading = /:$/.test(bare) && findPhones(raw).length === 0;
    if (heading) { section = FAX_WORD_RE.test(bare); flags[i] = section; continue; }
    flags[i] = section;
  }
  return flags;
}

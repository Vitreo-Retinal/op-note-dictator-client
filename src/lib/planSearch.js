// Insurance plan search for the Rates screen (v2, Oct 2026).
//
// norm, SYNONYM_GROUPS, expandQueries and smartSearch are a faithful port of
// Retina-Rx public/index.html (the insurance search Mari already uses there), so
// a plan is found the same way in both apps: "UHC" finds "United Healthcare",
// "Mass Health" finds "MassHealth", "HP" finds "Harvard Pilgrim", and so on.
// scripts/planSearch.test.js checks SYNONYM_GROUPS and norm against Retina-Rx
// whenever that repo is on the machine, so the two cannot drift apart silently.
//
// Plans are { name, aliases: [] } (hub_rate_plans rows).
//
// searchPlans is what the Rates combo uses. It starts with exactly what
// smartSearch returns, then adds plans where every word of the query appears in
// the name or an alias. Retina-Rx stops at exact matches, so "bcbs ppo" there
// shows only the out-of-state BlueCard PPO (its alias is literally "BCBS PPO")
// and never "BCBS of MA PPO". In a picker the rest should still be reachable.

// Normalize: strip dashes, extra spaces, dots for flexible matching
export function norm(s) { return s.toLowerCase().replace(/[-./·,]/g, ' ').replace(/\s+/g, ' ').trim(); }

// Bidirectional synonym groups: any term in a group resolves to the others.
// All terms are pre-normalized (lowercase, no punctuation).
export const SYNONYM_GROUPS = [
  ['bcbs', 'blue cross blue shield', 'blue cross', 'blue shield', 'bc bs'],
  ['masshealth', 'mass health'],
  ['hpi', 'health plans inc'],
  ['umr', 'united medical resources'],
  ['uhc', 'united healthcare', 'united health care', 'unitedhealthcare', 'united health'],
  ['cca', 'commonwealth care alliance'],
  ['mgb', 'mass general brigham', 'massachusetts general brigham', 'allways', 'allways health partners', 'mass general brigham health plan'],
  ['hp', 'hphc', 'harvard pilgrim', 'harvard pilgrim health care'],
  ['hne', 'health new england'],
  ['fallon', 'fallon health', 'fallon community'],
  ['wellsense', 'bmc healthnet', 'boston medical center healthnet', 'bmc health net'],
  ['geha', 'government employees health association'],
  ['hap', 'health alliance plan'],
  ['cci', 'connecticare', 'connecticare inc'],
  ['swh', 'senior whole health'],
  ['p32h', 'point32health', 'point 32 health']
];

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Expand a normalized query into all synonym-equivalent variants.
// Matching uses word boundaries so short tokens (hp, hne) don't match inside words.
export function expandQueries(qn) {
  const variants = new Set([qn]);
  for (const group of SYNONYM_GROUPS) {
    for (const term of group) {
      const re = new RegExp('\\b' + escapeRe(term) + '\\b');
      if (re.test(qn)) {
        for (const alt of group) {
          if (alt !== term) variants.add(qn.replace(re, alt).replace(/\s+/g, ' ').trim());
        }
      }
    }
  }
  return [...variants];
}

// Retina-Rx smartSearch, with the plan list passed in (Retina-Rx reads a global).
export function smartSearch(query, plans) {
  const insuranceData = plans || [];
  const q = query.toLowerCase().trim();
  const qn = norm(q);
  const qVariants = expandQueries(qn);
  // Test a plan's name AND aliases against every query variant
  function planMatches(p, pred) {
    const hays = [norm(p.name), ...((p.aliases || []).map(norm))];
    return hays.some(h => qVariants.some(v => v && pred(h, v)));
  }
  const exact    = insuranceData.filter(p => planMatches(p, (h, v) => h === v));
  const starts   = insuranceData.filter(p =>
    planMatches(p, (h, v) => h.startsWith(v)) && !planMatches(p, (h, v) => h === v)
  );
  const contains = insuranceData.filter(p =>
    planMatches(p, (h, v) => v.length >= 3 && h.includes(v)) && !planMatches(p, (h, v) => h.startsWith(v))
  );
  if (exact.length) return exact;
  return [...starts, ...contains].slice(0, 20);
}

// Rates combo search: smartSearch first, then every-word matches.
// Empty query → the whole list (the combo shows everything before typing).
export function searchPlans(query, plans, limit = 80) {
  const list = plans || [];
  const qn = norm(String(query || ''));
  if (!qn) return list.slice(0, limit);
  const first = smartSearch(qn, list);
  const seen = new Set(first);
  const variants = expandQueries(qn).filter(Boolean);
  const words = variants.map((v) => v.split(' ').map((w) => new RegExp('\\b' + escapeRe(w))));
  const more = list.filter((p) => {
    if (seen.has(p)) return false;
    const hays = [norm(p.name), ...((p.aliases || []).map(norm))];
    return hays.some((h) => words.some((ws) => ws.every((re) => re.test(h))));
  });
  return [...first, ...more].slice(0, limit);
}

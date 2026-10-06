# VRA Hub redesign — status (night of Oct 5, 2026)

## What's done (on the `redesign` branch, in your working tree, NOT yet committed)
- **Phase 1** — shared `src/theme.js` (VRA palette from the NEOS deck + logo), all 13 files rethemed light. Styling only.
- **Phase 2** — Hub home + Clinic Note Generator rebuilt to the approved mockup. `src/icons.jsx` added. Styling/layout only; all handlers, state, tabs, API calls verified unchanged.
- **Phase 3** — the other eight tools polished to the same standard (shared `src/PageBar.jsx` header on every page).
- Approved mockup: `client/REDESIGN-MOCKUP.html` (not in src; safe to keep or delete).
- Live site (`main`) is untouched.

## To commit and get the Vercel preview URL — paste this in Terminal
```
cd ~/Documents/Claude/Projects/Robocall\ Dictation\ system/client && rm -f .git/HEAD.lock .git/index.lock && git add -A && git reset -q .redesign-tmp && git commit -m "Redesign phases 1-3: light VRA theme, all pages restyled (styling only)" && git push -u origin redesign
```
Vercel will build the branch and post a preview link (Vercel dashboard → the project → Deployments → the `redesign` one). Log in there with the real app. Nothing goes live until `redesign` is merged into `main`.

## Things to look at on the preview
1. **CC/HPI card moved below the note** on the Output tab (mockup layout). A code comment says it used to sit above because that's the paste order into NextGen. Say the word and it goes back on top.
2. **Call board on-call cell shows initials ("MR")** because the schedule data only stores the surgeon id. Easy to show "Dr. Rodriguez" — just confirm you want surnames there.

## More to settle on the preview
3. Patient Ed / Drop Schedule / Op Note open as tabs inside the Note Generator and now show their own full header bar under the generator's bar (double header). Fix is a small "embedded" flag — needs your OK.
4. A few hard-coded ALL-CAPS headings in Rate Comparison were changed to sentence case ("Named peers", "Drug economics · Medicare buy-and-bill").
5. Pre-existing logic bugs noticed, NOT touched: Drop Schedule shows "x null wk" for ongoing meds; negative dollars render as "$-7". EmNoteOptimizer.jsx is not reachable from any page.

## Oct 6 — Coverage check card (structured)
- Server `routes/notes.js` now ALSO returns `data.coverage` (JSON twins of the text blocks). Note text unchanged, so Copy note is unchanged. Additive and safe for the live client.
- Client `ClinicNoteGenerator.jsx` renders the Coverage check card from the JSON when present, falls back to the text parser otherwise.
- Server commit (deploys to Railway right away — safe):
```
cd ~/Documents/Claude/Projects/Robocall\ Dictation\ system/server && rm -f .git/HEAD.lock .git/index.lock && git add routes/notes.js && git commit -m "Coverage-in-note: also return structured data.coverage for the client card" && git push origin master
```
  (lib/schedule-sync.js has an unrelated uncommitted 1-line change from before — left alone.)

## Next: VRA calendar on the hub (agreed Oct 6)
- Source: the shared "VRA" Google calendar, via its secret ICS address → Railway env var `VRA_CAL_ICS_URL` → server `/api/schedule` (cached) → hub band + Schedule tile (2-week grid). Calendar-only; retire hub_call_schedule.
- Patterns read: `On call: XX`, `Tech on call: Name`, `XX · SITE` half-day sessions, `Techs · …` daily sheet, `VRA CLOSED – …`, `VACATION · XX`.
- Mari's one setup step: Google Calendar → VRA calendar settings → "Secret address in iCal format" → copy → Railway → server service → Variables → add `VRA_CAL_ICS_URL`.

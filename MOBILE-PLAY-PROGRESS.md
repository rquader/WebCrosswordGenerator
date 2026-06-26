# Mobile/Tablet Crossword Play Redesign — Progress

Source of truth: `WebCrosswordGeneratorNotes/Phase 17 - Mobile Play Redesign Spec (Crossword).md`
Resume by: **Obsidian `Index.md` (Session 16 Track A section)** → this file → `git log`.

**Last updated:** 2026-06-25 (session continuation — Steps 4–6 committed, verified green).

## Verified baseline

| Check | Result |
|-------|--------|
| `npm test` | 675 passed (39 files) |
| `npm run build` | exit 0 |
| `npx playwright test` | 32 passed, 13 skipped |
| HEAD (committed) | `83db7d8` (Step 6) |
| Ahead of origin | 11 commits, not pushed |

Scope: mobile/tablet **crossword play only**. Word-search + generation/preview grids untouched.
Gated by `PLAY_COMPACT_QUERY` `(max-width: 1023px)` — spec also mentions `pointer:coarse`; width-only for now.

---

## 8-step spec plan

- [x] **1. Logic (B1+B2)** — `5515c2b`. Unit tests: `nextCellAfterTyping`, `prevCellForBackspace`, `firstEmptyCellOfNextUnfilledClue`. `selectCellWithDirection` in clue lists. `moveSelection` skips black cells.
- [x] **2. Keyboard infra (P4)** — `b564e38`. `index.html` meta, `useVisualViewport.ts`, `useMediaQuery.ts`.
- [x] **3. Play bar** — `ae46421`. `adjacentClueTarget` unit tests added in `0326f0c`. Device check still owed.
- [x] **4. Scroll active cell (P3)** — `0326f0c`. `useEffect` on `selectedCell` (compact) → `gridHandle.scrollCellIntoView` ('nearest', no-op when on-screen). + 5 `adjacentClueTarget` unit tests.
- [x] **5. Tools sheet + P10** — sheet `ae46421`; P10 Check `.note` summary + scroll-first-wrong `0326f0c`. 2 e2e (wrong / all-correct).
- [x] **6. P5 touch cue + P9 completion scroll + hide top strip (P6)** — `83db7d8`. Kbd hint row hidden on compact; one-time touch cue (localStorage); duplicate tools cluster `hidden lg:flex`; completion scroll-into-view. 3 e2e (P5/P6/P9).
- [ ] **7. Tablet** — `PLAY_TABLET_QUERY` still unused; phone UI on tablet; no clue peek / persistent toolbar / larger grid. **Deferred — needs visual/device verification, can't be done blind headless.**
- [ ] **8. Polish** — memo callbacks (parent passes inline lambdas), a11y, jank audit, real-click e2e if z-index holds.

---

## Audit P1–P10 tracker

| ID | Status | Notes |
|----|--------|-------|
| P1 typing | ✅ `5b65a22` | e2e play-mobile |
| P2 fit grid | ✅ `46e5659` | e2e play-grid-fit |
| P3 scroll cell | ✅ `0326f0c` | Wired on `selectedCell` (compact) + scroll-first-wrong on Check |
| P4 keyboard bar | 🟡 partial | Infra + bar lift committed; **device verify** the raise smoothness |
| P5 touch cue | ✅ `83db7d8` | Kbd hint row `hidden lg:flex`; one-time cue; e2e |
| P6 top toolbar | ✅ `83db7d8` | Duplicate tools cluster `hidden lg:flex`; timer/progress kept; e2e |
| P7 direction toggle | ✅ | Across⇄Down chip in bar (`ae46421`); Space hint now hidden on compact (`83db7d8`) |
| P8 clue dispatch | ✅ `5515c2b` | e2e B2 |
| P9 completion scroll | ✅ `83db7d8` | scrollIntoView on earned solve; e2e (on-screen) |
| P10 Check summary | ✅ `0326f0c` | `.note`/`.note-warn` summary + aria-live; e2e |

**All P1–P10 functional items resolved.** Remaining: Step 7 (tablet refinements) +
Step 8 (polish) + the human **device check** (P4 keyboard smoothness, real taps, 3-theme × 375px).

---

## WIP file inventory

**Working tree clean.** Local-only paths gitignored (`.claude/settings.local.json`, `scratchpad/`).

---

## WIP implementation notes

**100vw bar fix:** `left-0 w-screen max-w-[100vw]` not `inset-x-0` — Chromium fixed+right resolves to document scroll width (~436px) when P6 solving-desk strip overflows on 375px phone.

**Portal:** `createPortal(..., document.body)` — escapes `animate-fade-in` stacking.

**Two-row phone bar:** single spec row overflowed at 375px even after 100vw.

**Duplicate mobile chrome:** solving-desk strip (PlayTab:181-283) still shows Hint/Undo/Check/Reveal/Reset — overlaps play bar + sheet purpose; hide on compact in Step 6.

**PlayToolsSheet:** Undo/Redo don't auto-close; Reset has no confirm (same as desktop); panel `inset-x-0` may need 100vw treatment.

**E2e quirk:** bar/sheet backdrop clicks use programmatic DOM `.click()` — headless hit-testing overlap with clue list; **device must verify real taps**.

**E2e gaps (still owed):** tools-close focus return, keyboardOffset on bar, real-device taps.
P10 summary + P9 on-screen now covered by `e2e/play-bar.spec.ts`.

**Step 6 notes:**
- **P5 cue** uses localStorage key `crossword-touch-cue-seen` (same pattern as GenerateTab's
  answers callout). Shows on compact while `filledCount === 0`; retires permanently on first letter.
- **P6** hides only the desktop tools *cluster* (`hidden lg:flex`); the timer + progress meter row
  stays on every width (doubles as the spec's "slim header" progress meter — title not added there).
- **P9** scrolls the completion card with `block:'center'`; only on an earned solve
  (`isComplete && revealedCells.size === 0`), so a full Reveal doesn't trigger it.
- **P3/P10 scroll** both go through `gridHandle.scrollCellIntoView` ('nearest'); a no-op when the
  square is already visible, so normal typing never janks.

---

## Decisions log

| Date | Decision |
|------|----------|
| 2026-06-25 | 100vw bar width (see above) |
| 2026-06-25 | Portal bar/sheet to body |
| 2026-06-25 | Two-row phone bar |
| 2026-06-25 | E2e programmatic clicks for bar (document + device-verify) |
| 2026-06-25 | Width-only compact gate (not `pointer:coarse` yet) |
| 2026-06-25 | P6: keep timer/progress on mobile, hide only the duplicate tools cluster |
| 2026-06-25 | P5 cue retires on first letter (not on a dismiss button) |
| 2026-06-25 | Stop at Step 6 (verified); defer Step 7 tablet redesign — needs visual/device verify, not doable blind headless |

---

## Device-check list

- [ ] Keyboard raises (P1)
- [ ] Bar lifts smoothly, no flicker (iOS especially)
- [ ] Bar width correct with P6 overflow
- [ ] Real taps hit bar not clue list
- [ ] Tools sheet keyboard dismiss/return, no scroll jump
- [ ] Android backspace
- [ ] ‹ › navigation on device

---

## Next steps

1. **Step 7 — tablet** (`PLAY_TABLET_QUERY` = `(min-width:768px) and (max-width:1023px)`):
   single-row play bar (room at ≥768px; bar is two-row today), persistent visible toolbar
   instead of the sheet, clue-list peek, larger grid cell cap. **Do with a dev server + real
   tablet/responsive view — the layout needs eyes, don't change the known-safe two-row bar blind.**
2. **Step 8 — polish:** memoize the play-bar callbacks (parent passes inline lambdas, undermining
   the `memo()`), a11y re-check, reduced-motion/jank audit, flip e2e to real clicks if a z-index fix
   lands so headless hit-testing works without programmatic `.click()`.
3. **Device check** (the v7.1.0 gate — see list above) → push 11 commits → CI deploy → tag v7.1.0.
4. Update [[Release Notes Draft — v7.1.0]] commit map (done through Step 6).

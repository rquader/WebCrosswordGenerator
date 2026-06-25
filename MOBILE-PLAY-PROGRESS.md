# Mobile/Tablet Crossword Play Redesign — Progress

Source of truth: `WebCrosswordGeneratorNotes/Phase 17 - Mobile Play Redesign Spec (Crossword).md`
Resume by: reading the spec + `git log` + this file.

Baseline at start (verified green):
- `npm test` → 662 passed (39 files)
- `npm run build` → exit 0 (known >500 kB chunk warning only)
- `npx playwright test` → 7 passed, 1 skipped (desktop-only fit check)
- HEAD: `0f5a218` (includes P1 hidden-input typing, P2 fit-to-width grid, AI-fill fix)

Scope: mobile/tablet CROSSWORD play ONLY. Do NOT touch word-search or generation/preview grids.
Mobile/tablet bottom UI gated by viewport/`pointer:coarse`; desktop play unchanged.

## Step status

- [x] **1. Logic fixes (B1 + B2)** — DONE. 670 tests (+8), build 0, e2e 7+1skip.
      - B1: `advanceCell`/`retreatCell` rewritten to stay INSIDE the current word (cell run from
        `getWordCellsAt`), never stepping over a black cell into a neighbour. At word end the cursor
        jumps to the first gap of the next unfilled clue (ordered by number, Across-before-Down,
        wrapping). Backspace-on-empty steps back within the word; stays put at the word's first cell.
      - Extracted pure cores `nextCellAfterTyping` / `prevCellForBackspace` /
        `firstEmptyCellOfNextUnfilledClue` (exported) so the rules are unit-tested directly
        (house style: node test env, no renderHook). `enterLetter` now builds the post-keystroke
        grid synchronously and passes it in, so the "is filled" check sees the just-typed letter.
      - B2: added `selectCellWithDirection(x,y,across)` — sets cell AND direction outright (no toggle,
        no stale `isAcross` read). Clue-list taps in PlayTab now use it (was a fragile double-`selectCell`).
      - Files: `src/hooks/usePuzzleState.ts`, `src/components/tabs/PlayTab.tsx`, `tests/unit/playState.test.ts`.
- [x] **2. Keyboard-aware infra** — DONE. 670 tests, build 0, tsc clean, e2e green.
      - `index.html` viewport meta now has `interactive-widget=resizes-content` (kept pinch-zoom;
        the P2 e2e still passes — no `user-scalable=no`/`maximum-scale`).
      - `src/hooks/useVisualViewport.ts`: reports `keyboardOffset` (px the keyboard occludes at the
        layout-viewport bottom = `innerHeight - (vv.height + vv.offsetTop)`), feature-detected,
        rAF-throttled, loop-guarded (only setState on a changed rounded value), 24px jitter floor.
        Step 3 applies it as `translateY(-offset)` — compositor transform, never layout reflow.
      - `src/hooks/useMediaQuery.ts` + `PLAY_COMPACT_QUERY` (max-width 1023 → below desktop `lg`) and
        `PLAY_TABLET_QUERY` (768–1023) so the bar/sheet/tablet-toolbar agree and never mount on desktop.
- [ ] **3. Play bar UI** — clue dock (clue + ‹› + Across⇄Down chip + Check + ⋯Tools), transform-positioned.
- [ ] **4. Active-cell scroll-into-view** (P3) via `cellRefs`, scoped to grid container.
- [ ] **5. Tools bottom sheet** (Reveal/Clear/Undo-Redo; ADR-6 budget) + Check summary note (P10).
- [ ] **6. Touch-aware hints/cue** (P5) + completion scroll-into-view (P9).
- [ ] **7. Tablet breakpoint** refinements (persistent toolbar, clue-list peek, larger grid).
- [ ] **8. Polish + no-flicker/jank audit** — transitions, reduced-motion, a11y, device-check list.

## Decisions log
(none yet)

## Device-check list (headless can't prove these)
(accumulated as steps land)

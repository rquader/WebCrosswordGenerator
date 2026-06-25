# Mobile/Tablet Crossword Play Redesign — Progress

Source of truth: `WebCrosswordGeneratorNotes/Phase 17 - Mobile Play Redesign Spec (Crossword).md`
Resume by: **Obsidian `Index.md` (Session 16 Track A section)** → this file → `git log`.

**Last updated:** 2026-06-25 (meticulous handoff pass — tests re-verified green).

## Verified baseline

| Check | Result |
|-------|--------|
| `npm test` | 670 passed (39 files) |
| `npm run build` | exit 0 |
| `npx playwright test` | 22 passed, 8 skipped |
| HEAD (committed) | `ae46421` (Steps 3 & 5 partial) |
| Ahead of origin | 8 commits, not pushed |

Scope: mobile/tablet **crossword play only**. Word-search + generation/preview grids untouched.
Gated by `PLAY_COMPACT_QUERY` `(max-width: 1023px)` — spec also mentions `pointer:coarse`; width-only for now.

---

## 8-step spec plan

- [x] **1. Logic (B1+B2)** — `5515c2b`. Unit tests: `nextCellAfterTyping`, `prevCellForBackspace`, `firstEmptyCellOfNextUnfilledClue`. `selectCellWithDirection` in clue lists. `moveSelection` skips black cells.
- [x] **2. Keyboard infra (P4)** — `b564e38`. `index.html` meta, `useVisualViewport.ts`, `useMediaQuery.ts`.
- [~] **3. Play bar** — **`ae46421` committed.** Device check still owed. **Owed:** `adjacentClueTarget` unit tests (can land with Step 4).
- [~] **4. Scroll active cell (P3)** — partial in `ae46421`. Grid handle ready; **wire in PlayTab**.
- [~] **5. Tools sheet + P10** — sheet in `ae46421`; **P10 Check `.note` + scroll first wrong cell**.
- [ ] **6. P5 touch cue + P9 completion scroll** + hide top strip on compact (P6 partial).
- [ ] **7. Tablet** — `PLAY_TABLET_QUERY` unused; phone UI on tablet; no clue peek / toolbar / larger grid.
- [ ] **8. Polish** — memo callbacks, a11y, jank audit, real-click e2e if z-index holds.

---

## Audit P1–P10 tracker

| ID | Status | Notes |
|----|--------|-------|
| P1 typing | ✅ `5b65a22` | e2e play-mobile |
| P2 fit grid | ✅ `46e5659` | e2e play-grid-fit |
| P3 scroll cell | 🟡 partial | Not wired in PlayTab |
| P4 keyboard bar | 🟡 partial | Infra committed; bar lift WIP; device verify |
| P5 touch cue | ⬜ Step 6 | Kbd row still at PlayTab:285-298 |
| P6 top toolbar | 🟡 partial | Bar/sheet add thumb reach; **full strip still on mobile** → overflow |
| P7 direction toggle | 🟡 partial | Chip in bar WIP; Space hint still shown |
| P8 clue dispatch | ✅ `5515c2b` | e2e B2 |
| P9 completion scroll | ⬜ Step 6 | |
| P10 Check summary | ⬜ Step 5 | handleCheck shakes only |

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

**E2e gaps (add when built):** P10 summary, P9 scroll, tools-close focus return, keyboardOffset on bar.

---

## Decisions log

| Date | Decision |
|------|----------|
| 2026-06-25 | 100vw bar width (see above) |
| 2026-06-25 | Portal bar/sheet to body |
| 2026-06-25 | Two-row phone bar |
| 2026-06-25 | E2e programmatic clicks for bar (document + device-verify) |
| 2026-06-25 | Width-only compact gate (not `pointer:coarse` yet) |

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

1. Wire `scrollCellIntoView` in PlayTab (Step 4) + `adjacentClueTarget` unit tests
2. P10 Check summary (Step 5 remainder)
3. Steps 6–8 per spec → device check → push when ready

---

## WIP implementation notes

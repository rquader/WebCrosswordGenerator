# Prompt experiment — grid-fill prompt (Variants A→J) — CONCLUDED, Variant J SHIPPED

> Full record (rationale, every variant, raw model outputs, the verbatim Variant J
> text, the 5-model × 5-topic results): Obsidian vault
> **"Phase 17 - Session 14 Prompt Experiment (A-J) + Grid-Fill Redesign.md"**, with raw
> replies in **"\*\*Variant J\*\* Test Results.md"** / **"\*\*Variant I\*\* Test Results.md"**.
> Earlier flat-list experiment (Session 10) archived in the vault too.
>
> This file is the in-repo pointer + the shipped conclusion. The experiment is closed.

## What was tested

The **constrained AI grid-fill prompt** (`buildSkeletonFillPrompt`, used by the
skeleton-first + BYOG "Fill with AI" flows). 10 variants (A→J) × ~5 models × ~5 topics,
interactive with a human pasting into real models. The flagship question started as
"does telling the model the crossing geometry more explicitly help a weak model honor
crossings?" (issue G, the original A/B below) and broadened into the full redesign.

## Conclusion (decided + SHIPPED)

1. **Prompt FORMAT / crossing wording is NOT the lever.** Per-slot length, pattern,
   "crosses X at letter N", or fully-resolved shared-cell facts make no difference —
   weak models can't interlock, and on a dense grid our solver fills from the word bank
   regardless. The crossing-representation A/B (issue G) was a **negative result**.
2. **The dominant risk is FABRICATION** (fake / misspelled / truncated / concatenated
   words). The app has **no dictionary**, so a fake like `REFERE` / `GLACER` / `FREEKKICK`
   passes the parser and can land in a student's puzzle. Asking a weak model to satisfy a
   POSITION constraint is precisely what TRIGGERS fabrication.
3. **Winner = Variant J: a flat POOL of real words bucketed by the grid's distinct slot
   lengths**, placed by our local solver (+ word bank). It plays to the model's one
   reliable strength (topical word recall) and attacks fabrication at the root: headline
   "real words only" rule, the exact observed failure modes named with examples + "OMIT,
   never reshape", "COUNT IS NOT A GOAL", a broader-subject release valve, a final
   "re-read and silently delete" pass, and a machine-readable `# NOTES`
   (`SHORT_LENGTHS` / `COMMENT`) footer.
4. **Model choice is the biggest quality lever a teacher controls.** Top-tier "thinking"
   models (e.g. Opus 4.8 / Gemini 3.1 Pro) were flawless on every topic; lighter/faster
   models (e.g. Flash) still fabricate on some topics despite J's strongest design. So the
   "use the most capable / thinking AI you have" recommendation is **essential, not
   optional** — and the safety net stays (multi-candidate solver, full + topic-aware word
   bank, provenance badges, parser cruft-hardening). Dictionary validation was considered
   and **rejected** (overly limiting for this project's scope).

## Shipped (this session)

- `buildSkeletonFillPrompt` redesigned to Variant J (flat pool by length, setting-aware
  for `allowTwoWords`). Dropped the per-slot enumeration / ASCII grid / `solverAssist`.
- `parseSkeletonFillResponse` cruft + `# NOTES` hardening (shipped earlier, Session 15).
- `SHORT_LENGTHS` / `COMMENT` surfaced in both AI-fill views as an earned, calm note tied
  to the "word bank" provenance badges; model-recommendation `.note` sharpened to nudge a
  top-tier "thinking" model (no hardcoded model names — they date).
- Tests: Variant J prompt-format tests + an **end-to-end proof** that runs verbatim saved
  Opus/Sonnet replies (incl. Sonnet's omission cruft + `SHORT_LENGTHS`) through the real
  parser + solver and asserts no fabricated/cruft word reaches a placed answer.

---

## Appendix — the original issue-G A/B (negative result, kept for the record)

The sample grid was a 5×5 "window-pane" (`#` block, `.` fill, centre locked to **A**),
6 slots × length 5, 9 crossings — crossing-dense to expose a model that ignores crossings.

- **Variant A** = the then-current per-slot prompt (length + pattern + "crosses X at
  letter N", 2–3 options/slot, fenced `{id}-{DIR}: WORD | Clue`).
- **Variant B** = same output contract but every crossing stated as a fully-resolved
  shared-cell fact ("position 1 is the SAME letter as 2-DOWN position 1"), the ASCII grid
  dropped, locked letters restated inline.

**Verdict:** no meaningful difference on the weak model; B was slower. Explicit crossing
representation does not raise parse rate or crossing agreement — it confirmed the
geometry-wording dead end and motivated the flat-pool redesign (Variant J above).

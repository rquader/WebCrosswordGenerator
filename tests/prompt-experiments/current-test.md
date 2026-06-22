# Prompt experiment — crossing representation (Session 14, issue G)

> Prior experiment (Session 10, flat word-list) is archived in the Obsidian vault:
> "Prompt Experiment Results - Session 10.md" + "Prompt Experiment Findings - Session 10.md".
> This file now holds the CURRENT experiment.

**Question:** does stating each crossing as a *fully-resolved shared-cell fact* make a
weaker model honor crossings better than today's implicit "crosses X at letter N"?

This is the #1 untested lever for the constrained AI-fill flows (skeleton-first + BYOG).
The flat word-list task is model-agnostic (Session 10: 1 issue in 54 runs), but the
slot-fill task is much harder, and weak/free models break length + crossing constraints.

## How to run (interactive — needs a human + a real model)

1. Paste **Variant A** into the target model, save the raw reply under "A response".
2. Paste **Variant B** into the SAME model (fresh chat), save under "B response".
3. Repeat per model. The key case is a WEAK/free model — **Gemini 2.x Flash** or a
   small/mini tier. Also try one strong model as a control.
4. Report the raw replies back; they'll be run through the real `parseSkeletonFillResponse`
   + the crossing check below to score each variant.

**Both variants use the identical output contract** (fenced `{id}-{DIR}: WORD | Clue`,
2-3 options/slot), so the only variable is how the grid/crossings are described — a fair A/B.

## Scoring (what to measure per response)
- **Parse rate:** lines the parser accepts vs total (uses the real parser).
- **Crossing agreement:** of the parsed picks, what fraction actually share the SAME letter
  at each crossing (the whole point — a word can be the right length yet break the cross).
- **Length compliance** and **coverage** (all 6 slots, best-first options each).

---

## The sample grid (same for both variants)

A 5×5 "window-pane". `#` = block, `.` = fill, a letter = already fixed. The centre is
locked to **A** (simulates a placed crossing letter). 6 slots, all length 5, 9 crossings —
crossing-dense on purpose so a model that ignores crossings is exposed.

```
. . . . .
. # . # .
. . A . .
. # . # .
. . . . .
```

Slots: `1-ACROSS` (row 1), `5-ACROSS` (row 3, locked A at pos 3), `6-ACROSS` (row 5);
`2-DOWN` (col 1), `3-DOWN` (col 3, locked A at pos 3), `4-DOWN` (col 5).

---

## Variant A — CURRENT prompt (verbatim from `buildSkeletonFillPrompt`)

```
I am building a crossword from a grid I already laid out. Fill the blank slots below with words and clues that fit the grid exactly.

REQUIREMENTS
- Language: English. Every word and every clue must be written in English.
- Each word must fit its slot EXACTLY: the right number of letters, and every locked letter (a capital letter already shown in the pattern) must stay in place.
- Where two slots cross, the shared cell is ONE letter — your across word and your down word must use the SAME letter there. Crossings are listed per slot below.
- Use only the letters A-Z and digits 0-9: no punctuation, no abbreviations, no other symbols. Write accented letters in their plain form ("ELEVE", not "ÉLÈVE").
- Each entry must be a single word — no spaces, no hyphens, no underscores, no multi-word phrases. "goalkeeper" is correct; "goal keeper", "goal-keeper", and "goal_keeper" are not.
- Never combine two separate words into one entry — not with a symbol and not by running them together. "carbon dioxide" must not become CARBONDIOXIDE, "ice cream" must not become ICECREAM, "gas giant" must not become GASGIANT. If a term only works as a phrase, choose a different single-word term instead. (A genuine single-word compound like "sunflower" or "rainbow" is still fine.)
- No proper nouns unless they are directly relevant to the topic.
- Each clue: one sentence, at most 12 words, classroom-appropriate, and it must not contain the answer word or any form of it.

===BEGIN TOPIC CONTEXT===
Animals
===END TOPIC CONTEXT===

THE GRID
Legend: # = blocked square (not part of any word), . = empty cell to fill, a letter = already fixed.

.....
.#.#.
..A..
.#.#.
.....

SLOTS TO FILL
Patterns: each symbol is one cell — an underscore is any letter, a capital letter is already fixed and must stay. Positions are counted from the start, so letter 1 is the first cell.

1-ACROSS: 5 letters, pattern _ _ _ _ _ — crosses 2-DOWN at letter 1 — crosses 3-DOWN at letter 3 — crosses 4-DOWN at letter 5
2-DOWN: 5 letters, pattern _ _ _ _ _ — crosses 1-ACROSS at letter 1 — crosses 5-ACROSS at letter 3 — crosses 6-ACROSS at letter 5
3-DOWN: 5 letters, pattern _ _ A _ _ — crosses 1-ACROSS at letter 1 — crosses 5-ACROSS at letter 3 — crosses 6-ACROSS at letter 5
4-DOWN: 5 letters, pattern _ _ _ _ _ — crosses 1-ACROSS at letter 1 — crosses 5-ACROSS at letter 3 — crosses 6-ACROSS at letter 5
5-ACROSS: 5 letters, pattern _ _ A _ _ — crosses 2-DOWN at letter 1 — crosses 3-DOWN at letter 3 — crosses 4-DOWN at letter 5
6-ACROSS: 5 letters, pattern _ _ _ _ _ — crosses 2-DOWN at letter 1 — crosses 3-DOWN at letter 3 — crosses 4-DOWN at letter 5

OUTPUT FORMAT
Respond with ONLY a fenced code block. Each line is:

{id}-{ACROSS or DOWN}: WORD | Clue text

Rules: the label must match a slot above, WORD in ALL CAPS using only the letters A-Z and digits, a single pipe (|) before the clue, clue in sentence case.
Give 2 or 3 DIFFERENT options for EACH blank slot, best first — one option per line, all reusing that slot's label (same id and direction). Every option must be the right length and respect the slot's locked letters and crossings. List a slot's options together (best first), then move to the next slot. Cover all 6 blank slots. No blank lines, no numbering, no text outside the code block.

Example format (do not copy these words):
3-ACROSS: PLANET | A world that orbits a star.
3-ACROSS: PLASMA | A hot, charged state of matter.
5-DOWN: ORBIT | The path one body takes around another.

Respond with the code block only. Nothing else.
```

---

## Variant B — REDESIGNED (fully-resolved crossings, list-only, locked letters inline)

Under test: (1) every crossing names BOTH positions + the shared letter — no cross-line
positional arithmetic; (2) the ASCII grid is dropped (one authoritative source, not three
coordinate systems); (3) locked letters restated inline.

**When running B, keep Variant A's header + REQUIREMENTS + TOPIC CONTEXT + OUTPUT FORMAT
blocks verbatim** — replace ONLY the "THE GRID" + "SLOTS TO FILL" sections with the block below.

```
SLOTS TO FILL
Each slot lists its length, any letters already fixed, and the exact shared cell for every
crossing. "position 3 = A" means the 3rd letter is already A and must stay. "position 1 is
the SAME letter as 2-DOWN position 1" means your two words must use ONE identical letter there.

1-ACROSS (5 letters):
  - position 1 is the SAME letter as 2-DOWN position 1
  - position 3 is the SAME letter as 3-DOWN position 1
  - position 5 is the SAME letter as 4-DOWN position 1
2-DOWN (5 letters):
  - position 1 is the SAME letter as 1-ACROSS position 1
  - position 3 is the SAME letter as 5-ACROSS position 1
  - position 5 is the SAME letter as 6-ACROSS position 1
3-DOWN (5 letters), position 3 = A (fixed):
  - position 1 is the SAME letter as 1-ACROSS position 3
  - position 5 is the SAME letter as 6-ACROSS position 3
4-DOWN (5 letters):
  - position 1 is the SAME letter as 1-ACROSS position 5
  - position 3 is the SAME letter as 5-ACROSS position 5
  - position 5 is the SAME letter as 6-ACROSS position 5
5-ACROSS (5 letters), position 3 = A (fixed):
  - position 1 is the SAME letter as 2-DOWN position 3
  - position 5 is the SAME letter as 4-DOWN position 3
6-ACROSS (5 letters):
  - position 1 is the SAME letter as 2-DOWN position 5
  - position 3 is the SAME letter as 3-DOWN position 5
  - position 5 is the SAME letter as 4-DOWN position 5
```

> The crossing facts are written by hand for this sample to show the format. If B wins,
> implement it in `buildSkeletonFillPrompt`: for each intersection emit both the slot's own
> position AND the partner's position (already in `intersections`: `acrossPos`/`downPos`),
> restate locked letters inline, and gate the ASCII grid behind a flag so it can be ablated.

---

## Results (fill in as models are run)

### Model: _______  ·  Variant A
```
(paste raw response)
```
Parse rate: __ / __ · Crossings agree: __ / 9 · All 6 slots covered? __

### Model: _______  ·  Variant B
```
(paste raw response)
```
Parse rate: __ / __ · Crossings agree: __ / 9 · All 6 slots covered? __

### Verdict
(A vs B per model — does explicit crossing representation raise parse rate / crossing
agreement on the weak model? Decision: implement B in the builder / iterate / keep A.)

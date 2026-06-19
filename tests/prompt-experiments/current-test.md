# AI Prompt Test — Optimized word-list generation

**What this is.** A structured back-and-forth to measure how well our AI word-list prompt
performs across LLMs (Claude / ChatGPT / Gemini), so we can improve it with evidence instead
of guesses. The prompt is the upstream quality lever: better word lists → denser, more
interesting crosswords from our engine.

**Workflow.**
1. You run the prompt blocks below through each LLM and paste the raw responses into the
   "Responses" section.
2. You send this file back to the next Claude Code session.
3. Claude scores every response on the rubric **and runs each returned word list through the
   real crossword engine** to get an objective fill % — then recommends prompt changes.

---

## How to run it (please read — this keeps the data clean)

- **Fresh chat for EVERY run.** A second prompt in the same chat is contaminated (the model
  anchors on the previous topic/output). One run = one brand-new chat.
- **Paste the prompt block verbatim** — the whole thing, from "Generate a word list…" through
  "Respond with the code block only."
- **Paste the response RAW.** Do *not* tidy it, fix formatting, or delete junk. I need to see
  exactly what the model returned (preamble, numbering, dupes, off-theme words, count misses).
- **Label each run**: which LLM + exact model/version (e.g. "Claude Opus 4.x", "GPT-5",
  "Gemini 2.5 Pro") and the date.
- **Suggested matrix** (scale to your energy): **V1 first**, all 3 LLMs, the 3 cases,
  **2 iterations** each (LLMs are stochastic — repeats show consistency). Then **V2** if you're
  up for it. Minimum useful pass: V1 × 3 LLMs × 1 case × 1 iteration = 3 runs.

---

## Scoring rubric (how Claude will evaluate each response)

| Dimension | What it measures | Scale |
|---|---|---|
| **Format / parseability** | Fenced code block, `WORD | Clue` lines, no numbering/preamble, A–Z only | 0–5 (a gate: 0 ⇒ unusable) |
| **Count adherence** | Returned ≈ the asked count (about 40 / 32) | 0–5 |
| **Theme fit** | Genuinely on-topic, classroom-appropriate | 0–5 |
| **Word quality / interest** | Recognizable + interesting, not obscure padding | 0–5 |
| **Crossing-friendliness** | Mostly 5–8 letters, vowel/common-letter rich, few rare letters | 0–5 |
| **Clean entries** | No duplicates, no multi-word/hyphen/proper-noun violations, clues don't leak the answer | 0–5 |
| **Best-first ordering** | Are the *top* words actually the strongest (interesting AND interlock-friendly)? | 0–5 |
| **Objective fill %** | *Claude computes this* — runs the list through the real engine at the case's grid | measured |

The first dimension is a gate: a list that doesn't parse is useless no matter how good the
words are. Theme/quality/crossing are the substance; ordering matters because rank = the
quality signal our subset selector uses.

---

## Test cases

| Case | Topic | Grid | Target words | Why it's here |
|---|---|---|---|---|
| **A** | Solar System (5th grade) | 13×13 | 11 | Concrete, easy — the happy path |
| **B** | Photosynthesis (7th grade) | 15×15 | 14 | Abstract/process — fewer obvious nouns |
| **C** | Ancient Egypt (6th grade) | 11×11 | 8 | Proper-noun-prone + small grid (4× pool bites here) |

---

## Prompt V1 — the shipping prompt (paste verbatim)

> This is exactly what the app generates today (Optimized mode, default "Densest grid" bias).

### V1 · Case A — Solar System · 13×13 · target 11
````
Generate a word list with clues for a crossword puzzle on the topic described below.

REQUIREMENTS
- Language: English. Every word and every clue must be written in English.
- Number of words: about 40 — give your BEST, most interesting on-topic words, and LIST THEM STRONGEST FIRST. Only the best-fitting subset is used to build the puzzle, so favor quality and variety over hitting an exact number.
- Grid size: 13x13 — no word may be longer than 13 letters.
- Word length: most words 5 to 8 letters. Avoid 3-letter words (they barely cross), and avoid making one word much longer than the rest (it forces an oversized, mostly empty grid).
- Crossing-friendly: favor words rich in vowels and common letters (E, A, R, I, O, T, N, S, L) so they interlock. Avoid words that lean on rare letters (J, Q, X, Z) or are vowel-poor (like "rhythm") — they are hard to cross.
- Use only the letters A-Z and digits 0-9: no punctuation, no abbreviations, no other symbols. Write accented letters in their plain form ("ELEVE", not "ÉLÈVE").
- Each entry must be a single word — no spaces, no hyphens, no underscores, no multi-word phrases. "goalkeeper" is correct; "goal keeper", "goal-keeper", and "goal_keeper" are not.
- Never combine two separate words into one entry — not with a symbol and not by running them together. "carbon dioxide" must not become CARBONDIOXIDE, "ice cream" must not become ICECREAM, "gas giant" must not become GASGIANT. If a term only works as a phrase, choose a different single-word term instead. (A genuine single-word compound like "sunflower" or "rainbow" is still fine.)
- No proper nouns unless they are directly relevant to the topic.
- Each clue: one sentence, at most 12 words, classroom-appropriate, and it must not contain the answer word or any form of it.

===BEGIN TOPIC CONTEXT===
Solar System — planets, moons, and exploring space, for a 5th-grade class.
===END TOPIC CONTEXT===

OUTPUT FORMAT
Respond with ONLY a fenced code block. Inside it, one entry per line:

WORD | Clue text

Rules: WORD in ALL CAPS using only the letters A-Z and digits, a single pipe (|) as the separator, clue in sentence case.
About 40 lines, strongest word first. No blank lines, no numbering, no text outside the code block.

Example format (do not copy these words):
```
EXAMPLE | A thing that shows what the format looks like.
SAMPLE | A small part that represents the whole.
```

Respond with the code block only. Nothing else.
````

### V1 · Case B — Photosynthesis · 15×15 · target 14
````
Generate a word list with clues for a crossword puzzle on the topic described below.

REQUIREMENTS
- Language: English. Every word and every clue must be written in English.
- Number of words: about 40 — give your BEST, most interesting on-topic words, and LIST THEM STRONGEST FIRST. Only the best-fitting subset is used to build the puzzle, so favor quality and variety over hitting an exact number.
- Grid size: 15x15 — no word may be longer than 15 letters.
- Word length: most words 5 to 8 letters. Avoid 3-letter words (they barely cross), and avoid making one word much longer than the rest (it forces an oversized, mostly empty grid).
- Crossing-friendly: favor words rich in vowels and common letters (E, A, R, I, O, T, N, S, L) so they interlock. Avoid words that lean on rare letters (J, Q, X, Z) or are vowel-poor (like "rhythm") — they are hard to cross.
- Use only the letters A-Z and digits 0-9: no punctuation, no abbreviations, no other symbols. Write accented letters in their plain form ("ELEVE", not "ÉLÈVE").
- Each entry must be a single word — no spaces, no hyphens, no underscores, no multi-word phrases. "goalkeeper" is correct; "goal keeper", "goal-keeper", and "goal_keeper" are not.
- Never combine two separate words into one entry — not with a symbol and not by running them together. "carbon dioxide" must not become CARBONDIOXIDE, "ice cream" must not become ICECREAM, "gas giant" must not become GASGIANT. If a term only works as a phrase, choose a different single-word term instead. (A genuine single-word compound like "sunflower" or "rainbow" is still fine.)
- No proper nouns unless they are directly relevant to the topic.
- Each clue: one sentence, at most 12 words, classroom-appropriate, and it must not contain the answer word or any form of it.

===BEGIN TOPIC CONTEXT===
Photosynthesis and plant biology for 7th grade.
===END TOPIC CONTEXT===

OUTPUT FORMAT
Respond with ONLY a fenced code block. Inside it, one entry per line:

WORD | Clue text

Rules: WORD in ALL CAPS using only the letters A-Z and digits, a single pipe (|) as the separator, clue in sentence case.
About 40 lines, strongest word first. No blank lines, no numbering, no text outside the code block.

Example format (do not copy these words):
```
EXAMPLE | A thing that shows what the format looks like.
SAMPLE | A small part that represents the whole.
```

Respond with the code block only. Nothing else.
````

### V1 · Case C — Ancient Egypt · 11×11 · target 8
````
Generate a word list with clues for a crossword puzzle on the topic described below.

REQUIREMENTS
- Language: English. Every word and every clue must be written in English.
- Number of words: about 32 — give your BEST, most interesting on-topic words, and LIST THEM STRONGEST FIRST. Only the best-fitting subset is used to build the puzzle, so favor quality and variety over hitting an exact number.
- Grid size: 11x11 — no word may be longer than 11 letters.
- Word length: most words 5 to 8 letters. Avoid 3-letter words (they barely cross), and avoid making one word much longer than the rest (it forces an oversized, mostly empty grid).
- Crossing-friendly: favor words rich in vowels and common letters (E, A, R, I, O, T, N, S, L) so they interlock. Avoid words that lean on rare letters (J, Q, X, Z) or are vowel-poor (like "rhythm") — they are hard to cross.
- Use only the letters A-Z and digits 0-9: no punctuation, no abbreviations, no other symbols. Write accented letters in their plain form ("ELEVE", not "ÉLÈVE").
- Each entry must be a single word — no spaces, no hyphens, no underscores, no multi-word phrases. "goalkeeper" is correct; "goal keeper", "goal-keeper", and "goal_keeper" are not.
- Never combine two separate words into one entry — not with a symbol and not by running them together. "carbon dioxide" must not become CARBONDIOXIDE, "ice cream" must not become ICECREAM, "gas giant" must not become GASGIANT. If a term only works as a phrase, choose a different single-word term instead. (A genuine single-word compound like "sunflower" or "rainbow" is still fine.)
- No proper nouns unless they are directly relevant to the topic.
- Each clue: one sentence, at most 12 words, classroom-appropriate, and it must not contain the answer word or any form of it.

===BEGIN TOPIC CONTEXT===
Ancient Egypt — pharaohs, pyramids, gods, and daily life, for a 6th-grade unit.
===END TOPIC CONTEXT===

OUTPUT FORMAT
Respond with ONLY a fenced code block. Inside it, one entry per line:

WORD | Clue text

Rules: WORD in ALL CAPS using only the letters A-Z and digits, a single pipe (|) as the separator, clue in sentence case.
About 32 lines, strongest word first. No blank lines, no numbering, no text outside the code block.

Example format (do not copy these words):
```
EXAMPLE | A thing that shows what the format looks like.
SAMPLE | A small part that represents the whole.
```

Respond with the code block only. Nothing else.
````

---

## Prompt V2 — explicit-ranking variant (the hypothesis we're testing)

**Hypothesis:** the shipping prompt says "LIST THEM STRONGEST FIRST" but never says what
"strongest" means — so the rank order (which our subset selector trusts as the quality signal)
may be arbitrary. V2 tells the model the *actual* ranking criteria. Question: does this produce
a better-ordered list (top words both interesting **and** interlock-friendly) without hurting
variety?

**To make V2 from any V1 case above:** keep everything identical, but **replace the single
"Number of words:" bullet** with the two bullets below (same word count — use 40 for A/B, 32 for C):

```
- Number of words: about <N> on-topic words. Give your BEST, most interesting ones.
- Ranking (important): LIST THEM STRONGEST FIRST, where "strongest" means a word that is BOTH (a) interesting/recognizable to a student AND (b) easy to interlock (5-8 letters, rich in vowels and common letters E A R I O T N S L). Put words that score high on BOTH at the very top; trail off into more niche or harder-to-cross words. Only the best-fitting subset is used to build the puzzle.
```

Everything else (grid size, length guidance, charset, output format) stays exactly as V1.

---

## Responses (paste raw — duplicate this block per run)

> Copy the template once per run. Fill the header, paste the **entire raw response** in the
> fenced block. Leave Claude's columns blank — those get filled on evaluation.

```
### RUN — Variant: [V1/V2] · Case: [A/B/C] · LLM: [Claude/ChatGPT/Gemini] · Model: [exact version] · Iter: [1/2] · Date: [YYYY-MM-DD]

<paste the raw response here, verbatim>

--- (Claude fills below) ---
Scores: format _/5 · count _/5 · theme _/5 · quality _/5 · crossing _/5 · clean _/5 · ordering _/5
Engine fill %: __
Notes:
```

<!-- ↓↓↓ paste your runs below this line ↓↓↓ -->


<!-- ↑↑↑ paste your runs above this line ↑↑↑ -->

---

## When you're done

Save this file (it stays at `tests/prompt-experiments/current-test.md`) and tell the next
Claude Code session "evaluate the prompt experiment." Claude will score every run, compute the
objective fill % per list through the real engine, compare V1 vs V2 and LLM-vs-LLM, and
recommend concrete prompt changes (or confirm the current prompt holds up).

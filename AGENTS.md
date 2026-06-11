# CrosswordGen — Puzzle Studio

Fully client-side crossword/word-search generator + player. Ported from a Java Swing app.
TypeScript + React + Vite + Tailwind. Hosted on GitHub Pages. ~13,000 LOC, 240 tests.

Target audience: teachers creating puzzles from their own word lists.
Everything runs in the browser — zero server, zero tracking.

## Commands
```bash
npm run dev          # Dev server at http://localhost:5173
npm run build        # Type-check (tsc) + production build to dist/
npm run test         # Run all Vitest unit tests (240 currently)
npm run test:watch   # Tests in watch mode
npm run deploy       # Build + push to gh-pages branch (GitHub Pages)
```

## Privacy — Non-Negotiable
Zero external network calls. No exceptions.
- No fetch, XHR, WebSocket, or external URLs in application code
- No analytics, tracking, or telemetry
- File uploads parsed locally via FileReader API
- Fonts self-hosted (`@fontsource/inter`, `@fontsource-variable/plus-jakarta-sans`)
- URL sharing uses hash fragments (never sent to server)
- If adding an external dependency, flag it to the team first

## Architecture Overview
```
src/logic/         Pure TS engine — zero DOM dependencies, keep it that way
src/components/    React UI (layout, grid, clues, settings, tabs, skeleton, print)
src/hooks/         useTheme (dark/light/sepia), usePuzzleState (play state)
src/utils/         fileParser, exportUtils, pdfExport, printLayout, puzzleUrl, wordListPrompt
src/data/          blocklist.ts — word search filler profanity filter (standalone)
src/presets/       4 word packs (Biology, US History, Spanish, SAT), ~130 entries
tests/unit/        Vitest tests (19 test files)
```

### Generation Pipeline (read this — it's the novel part)
The generator has three layers that wrap each other:

```
UI (GenerateTab)
  → createSkeletonFromEntries()      # High-level: skeleton-first flow
    → generateSkeleton()             # Decides if skeleton needed (< 70% fill)
      → generateCrosswordWithPriority()  # Three-tier: must-include first, can-include second
        → generateCrossword()        # Core algorithm: intersection-based placement
```

**Always use the top-level entry points** (`createPuzzleFromEntries`, `createSkeletonFromEntries`,
`createPuzzleWithPriority`, `createWordSearchFromEntries`). Never call `generateCrossword()` directly —
the high-level functions bundle word filtering by grid dimensions.

### Three-Tier Priority System
Words are categorized into tiers before generation:
- **Must-include**: placed first, failures reported to user (e.g. "LOVE — no valid intersection")
- **Can-include**: placed after must, silently skipped if they don't fit
- **Don't-include**: excluded entirely

Must-include words are sorted longest-first and placed before any can-include words.
The core generator runs with `presorted: true` to preserve this ordering.

### Behavior Contract (decided 2026-06-11 — see Obsidian Phase 15)
- **Default path** (Force Dimensions unchecked): words in → finished puzzle out.
  Auto-size + auto-grow guarantee every word places. No blank slots, no decisions.
- **Force Dimensions checked**: pinned grid size, blank-slot skeleton when
  under-filled, failures reported with a one-click larger-size suggestion.
- **Empty word list**: "Generate Blank Skeleton" builds a full word-bank skeleton.
- Word search mirrors the crossword: auto-grows by default (`growToFit`),
  pins + reports honestly when forced.

### Skeleton System (`bankFill: true` paths only)
When a user doesn't provide enough words to fill the grid:
1. Priority generator places user words (must + can)
2. If placed words fill < 70% of estimated capacity → skeleton mode activates
3. Word bank words (curated common English words in `wordBank.ts`) fill structural gaps
4. Word bank words are stripped from the grid → blank skeleton slots
5. User fills blank slots manually, with live constraint validation (crossing letters locked)

### Core Generator Algorithm
Classic crossword legality, rebuilt from the Java port —
`tests/unit/placementGuarantee.test.ts` is the behavioral contract:
1. First word centered (configurable offset); 5 candidate layouts ranked by quality score
2. Words place across existing letters; multi-cross allowed, head/tail abutment
   and parallel adjacency forbidden (no junk runs, ever)
3. Best-spot selection (crossings → direction preference → centering), rescue
   passes, swap rescue for stuck must-include words
4. Reversed words exist only in word search (removed from crosswords)

### Word Search Engine (`wordSearchGenerator.ts`)
Separate engine: 8 direction vectors, overlap allowed, random filler letters.
Placed words carry exact `dx`/`dy` unit vectors — always read direction via
`getWordVector`/`getWordCellCoords` (the legacy isHorizontal/isReversed flags
can't express diagonals). Filler is scrubbed against `src/data/blocklist.ts`
in all 8 directions before a grid leaves the generator. Share URLs: v1 =
crossword (still emitted for compatibility), v2 = mode + per-word vectors.

## Key Files
| File | What it does |
|------|-------------|
| `src/logic/generator.ts` | Core crossword algorithm (intersection placement, direction balancing) |
| `src/logic/priorityGenerator.ts` | Three-tier wrapper (must-include first, can-include second) |
| `src/logic/skeletonGenerator.ts` | Adaptive skeleton (word bank fill + strip to blank slots) |
| `src/logic/createPuzzle.ts` | High-level API — all entry points, bundles filtering |
| `src/logic/gridRecommendation.ts` | Grid size recommendation + outlier word detection |
| `src/logic/wordBank.ts` | Curated word bank for skeleton filler (~300 words, lengths 3-12) |
| `src/logic/types.ts` | All shared type definitions |
| `src/logic/wordSearchGenerator.ts` | Word search engine (8-direction vectors, filler filter) |
| `src/data/blocklist.ts` | Profanity blocklist for word search filler (update needs no engine knowledge) |
| `src/utils/wordListPrompt.ts` | AI Words tab — prompt builder + response parser |
| `src/utils/printLayout.ts` | Shared page geometry — browser print and PDF make the same layout call |
| `src/components/tabs/GenerateTab.tsx` | Main generation UI (words-to-puzzle flow) |
| `src/components/skeleton/SkeletonFillView.tsx` | Skeleton fill workspace (constraints, validation) |
| `src/components/grid/PlayableGrid.tsx` | Interactive crossword grid (keyboard, check, reveal) |
| `src/utils/puzzleUrl.ts` | URL sharing (pako compression, base64url, hash fragment) |
| `src/utils/pdfExport.ts` | PDF generation via jsPDF |

## Code Conventions
- **Human-readable and modular** — a person should be able to take over easily
- No clever lambda chains, no overly abstract patterns
- Clear function/variable names; comments only where logic isn't self-evident
- `src/logic/` must stay pure TS — zero DOM, zero React imports
- Prefer editing existing files over creating new ones
- No emojis in code or UI unless explicitly requested

## Testing
Run `npm run test` after any logic changes. All tests must pass.
Tests live in `tests/unit/`. When adding new logic, add tests.
Key test patterns: seed reproducibility, edge cases (empty input, single word, overflow), round-trips.

## UI Rules
- Must look polished and handcrafted — not generic AI output
- Color palette: indigo primary, warm copper accent (see `tailwind.config.js` for full tokens)
- Three theme modes: dark (default), light, sepia — with system preference detection
- Fonts: Fraunces Variable (editorial serif — masthead, headings), Plus Jakarta Sans Variable, Inter
- Design doctrine: "Sunday paper, modern desk" — the grid renders as print in every
  theme (cream cells + ink letters even in dark mode); warm white token (#fdfbf7)
- Tabbed interface: Generate | AI Words | Play | Export | How to Use

## State Management
- React `useState` for UI state, custom hooks for complex state (`useTheme`, `usePuzzleState`)
- localStorage for persistence: wizard state, theme preference, play progress (auto-save)
- No external state library (no Redux, Zustand, etc.)
- Play state auto-saves every 30s with puzzle hash for identification

## Dependencies (production)
react, react-dom, jspdf (PDF export), pako (zlib compression for URL sharing),
@fontsource/inter, @fontsource-variable/plus-jakarta-sans. All run locally, zero network calls.

## Deployment
GitHub Pages via `gh-pages` package. Base path: `/WebCrosswordGenerator/` (set in `vite.config.ts`).
Manual deploy with `npm run deploy`. No CI/CD — tests run locally before deploy.

## Deep Dives (Obsidian — optional, this file is self-contained)
Extended docs live in a separate private repo ([WebCrosswordGeneratorNotes](https://github.com/rquader/WebCrosswordGeneratorNotes)).
Clone it into your Obsidian vault and set the absolute path below.

<!-- UPDATE THIS PATH to your local WebCrosswordGeneratorNotes clone -->
`/Users/<you>/Obsidian/<YourVault>/WebCrosswordGeneratorNotes/`

Read the relevant file when you need more context than what's here. **Update it when you change that area.**

| When you're working on... | Read this |
|---------------------------|-----------|
| Overall architecture, current status | `Index.md` |
| Generation algorithm details, priority logic | `Phase 10/Algorithm Logic.md` |
| Skeleton system, three-tier design decisions | `Phase 10/Three-Tier System.md` |
| Must-include placement bug (first word at 0,0) | `Must-Include Placement Bug.md` |
| Design decisions and why things are the way they are | `Tradeoffs.md` |
| Known bugs, edge cases, code smells | `Known Issues.md` |
| Print/PDF/URL export architecture | `Output Pipeline & Beyond/Phase 11 - Core Output/Architecture.md` |
| UI/UX rationale (why modal, why tabs, etc.) | `Phase 10/UI UX Decisions.md` |
| Future feature ideas (brainstorm, not backlog) | `Feature Ideas.md` |
| Privacy verification | `Privacy Audit.md` |
| File-by-file reference | `File Map.md` |

The vault is the project's long-term brain. Keep it current as the code evolves.

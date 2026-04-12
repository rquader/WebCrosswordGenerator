# CrosswordGen — Puzzle Studio

Fully client-side crossword/word-search generator + player. Ported from a Java Swing app.
TypeScript + React + Vite + Tailwind. Hosted on GitHub Pages. ~11,500 LOC, 156 tests.

Target audience: teachers creating puzzles from their own word lists.
Everything runs in the browser — zero server, zero tracking.

## Commands
```bash
npm run dev          # Dev server at http://localhost:5173
npm run build        # Type-check (tsc) + production build to dist/
npm run test         # Run all Vitest unit tests (156 currently)
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
src/components/    React UI (layout, grid, clues, settings, tabs, skeleton)
src/hooks/         useTheme (dark/light/sepia), usePuzzleState (play state)
src/utils/         fileParser, exportUtils, pdfExport, puzzleUrl
src/presets/       9 word packs (unit_1-8 + english), 920 entries total
tests/unit/        Vitest tests (13 test files)
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

### Skeleton System
When a user doesn't provide enough words to fill the grid:
1. Priority generator places user words (must + can)
2. If placed words fill < 70% of estimated capacity → skeleton mode activates
3. Word bank words (curated common English words in `wordBank.ts`) fill structural gaps
4. Word bank words are stripped from the grid → blank skeleton slots
5. User fills blank slots manually, with live constraint validation (crossing letters locked)

### Core Generator Algorithm
Port of Java's Generator.java. Intersection-based placement:
1. First word placed at (0, 0) — always
2. Each subsequent word finds grid cells where its letters match already-placed letters
3. Tries horizontal then vertical (or vice versa) based on direction balancing
4. A word is valid at an intersection if that row/column segment has exactly 1 occupied cell
5. If placement fails and reverse allowed, tries the word reversed

**Known issue**: First word at (0,0) can block must-include intersections when there's no room
above row 0. See `Must-Include Placement Bug.md` in Obsidian for analysis and proposed fixes.

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
| `src/components/tabs/GenerateTab.tsx` | Main generation UI (skeleton-first flow) |
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
- Fonts: Plus Jakarta Sans Variable (display), Inter (body)
- Tabbed interface: Generate | Play | Export | How to Use

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

## Deep Dives (Obsidian — optional, AGENTS.md is self-contained)
Extended docs live in an Obsidian vault. Path is machine-specific — update for your setup:
`/Users/rafanquader/Obsidian_Local/RafansLocalVault/WebCrosswordGenerator/`
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

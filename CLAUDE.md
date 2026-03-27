# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Maintenance

Keep this file up to date as the project evolves. When adding new classes, changing the build setup, or making architectural changes, update the relevant sections here.

## Build & Run

No build tool (no Maven/Gradle). All source files are in `src/` with no package declarations (default package). Java 21 required.

**Compile manually:**
```bash
javac -source 21 -target 21 src/*.java -d bin/
```

**Run:**
```bash
java -cp bin CrosswordUI
```

There is no test framework configured — testing is done manually through the GUI.

## Architecture

The app is a Java Swing crossword puzzle generator. Entry point is `CrosswordUI.main()`, which launches the GUI.

**Data flow:**
1. User sets grid dimensions (2–10 width/height), selects a category (Unit_1–8 or English), and optionally provides a seed
2. `Database` holds hard-coded word-clue pairs per category; `DatabaseProcessor` filters them by length to fit the grid
3. `Generator` places words on a `char[][]` grid: longest word first at (0,0) horizontally, then subsequent words at intersections; supports reversed words if placement fails
4. `CrosswordUI` renders the grid with `GridLayout` and displays horizontal/vertical clue panels

**Key classes:**
- `CrosswordUI` — Swing GUI, wires everything together
- `Generator` — placement algorithm (uses `Random(seed)` for reproducibility)
- `Database` — ~100+ word-clue pairs per category as static 2D arrays
- `DatabaseProcessor` — filters/maps words and clues
- `DirectionalWord` — placed word with direction, reversal flag, position, and clue
- `Intersection` — where a candidate word matches a letter already on the grid
- `WordCluePair` — temporary word+clue pairing during generation

**Known quirk:** `SimplePoint.equals()` always returns `false` — HashMap lookups on `SimplePoint` keys rely on reference identity, not value equality.

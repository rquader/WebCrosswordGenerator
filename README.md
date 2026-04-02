# CrosswordGen Puzzle Studio

This project is a Vite + React + TypeScript web app for generating and playing crosswords and word searches entirely in the browser.

## Current Features

- Wizard-based puzzle generation flow: `Source -> Parse -> Settings -> Review`
- Modular word sources, currently:
  - Text entry
  - File upload (`.txt`, `.csv`, `.json`)
- Crossword and word search generation with optional seeded reproducibility
- In-browser play mode with autosave, hints, undo/redo, and clue highlighting
- Local export as print/PDF, PNG, and JSON

## Architecture Notes

- Puzzle generation logic lives in `src/logic/`
- Word-source modules live in `src/components/sources/`
- All parsing and generation happen locally; no server is required

## Verification

- Unit tests: `npm test`
- Production build: `npm run build`

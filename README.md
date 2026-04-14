# CrosswordGen Puzzle Studio

This project is a Vite + React + TypeScript web app for generating and playing crosswords and word searches entirely in the browser.

## Authors

- Rafan Quader
- Armaan Saini

## Acknowledgements

This project is a TypeScript/React port and significant expansion of an earlier project implemented in Java.  
The original repository can be found here: https://github.com/s-armaan/CrosswordGenerator and was authored by Armaan Saini, Rafan Quader, Kabir Khan, Atharva Ahir, Anthony Phanh, and Ethan Le.

## Setup

Developer notes (optimized for Obsidian) live in a separate private repo:  
https://github.com/rquader/WebCrosswordGeneratorNotes

Clone it into your Obsidian vault and update the absolute path in `AGENTS.md`.  
AI agents (Claude Code, Cursor, etc.) use that path to access deeper documentation on the codebase.
 
Optimized for Obsidian to give developers a clean frontend UI and thereby understanding of project, but other local notes apps can be used.
 
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

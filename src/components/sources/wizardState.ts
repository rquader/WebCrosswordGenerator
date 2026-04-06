import type { EntryTableDraft } from '../entries/entryTable';
import { createDefaultGenerationSettings, type GenerationSettings } from '../settings/generationSettings';
import { createEmptyEntryRow } from '../entries/entryTable';
import type { TextEntryDraft } from './types';

export const WORD_SOURCE_WIZARD_STORAGE_KEY = 'crossword-word-source-wizard';

export type WizardStep = 'table' | 'text-import' | 'settings' | 'review';

export interface WizardState {
  table: EntryTableDraft;
  textImport: TextEntryDraft;
  settings: GenerationSettings;
  currentStep: WizardStep;
}

function createDefaultTableDraft(): EntryTableDraft {
  return {
    rows: [createEmptyEntryRow()],
    warnings: [],
  };
}

export function createDefaultWizardState(): WizardState {
  return {
    table: createDefaultTableDraft(),
    textImport: { rawText: '' },
    settings: createDefaultGenerationSettings(),
    currentStep: 'table',
  };
}

function sanitizeSettings(raw: Partial<GenerationSettings> | undefined): GenerationSettings {
  const defaults = createDefaultGenerationSettings();
  return {
    width: typeof raw?.width === 'number' ? raw.width : defaults.width,
    height: typeof raw?.height === 'number' ? raw.height : defaults.height,
    seedText: typeof raw?.seedText === 'string' ? raw.seedText : defaults.seedText,
    allowReverseWords: typeof raw?.allowReverseWords === 'boolean' ? raw.allowReverseWords : defaults.allowReverseWords,
    puzzleMode: raw?.puzzleMode === 'wordsearch' ? 'wordsearch' : defaults.puzzleMode,
    wordSearchDirections: {
      horizontal: raw?.wordSearchDirections?.horizontal ?? defaults.wordSearchDirections.horizontal,
      vertical: raw?.wordSearchDirections?.vertical ?? defaults.wordSearchDirections.vertical,
      diagonal: raw?.wordSearchDirections?.diagonal ?? defaults.wordSearchDirections.diagonal,
      reversed: raw?.wordSearchDirections?.reversed ?? defaults.wordSearchDirections.reversed,
      reversedDiagonal: raw?.wordSearchDirections?.reversedDiagonal ?? defaults.wordSearchDirections.reversedDiagonal,
    },
  };
}

/**
 * Hydration tolerates older saved shapes and repairs missing table data.
 */
export function hydrateWizardState(raw: unknown): WizardState {
  const defaults = createDefaultWizardState();
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  const candidate = raw as Partial<WizardState>;
  const rawTable = candidate.table;
  const rawRows = Array.isArray(rawTable?.rows) ? rawTable.rows as unknown[] : [];
  // Always assign fresh IDs on hydration to avoid collisions with the
  // runtime counter. Old localStorage entries may have stale IDs like
  // "entry-row-1" that would collide with newly created rows.
  const rows = rawRows.reduce<Array<{ id: string; word: string; clue: string }>>((acc, row) => {
    if (!row || typeof row !== 'object') {
      return acc;
    }

    const record = row as Record<string, unknown>;
    acc.push({
      id: createEmptyEntryRow().id,
      word: typeof record.word === 'string' ? record.word : '',
      clue: typeof record.clue === 'string' ? record.clue : '',
    });
    return acc;
  }, []);

  const warnings = Array.isArray(rawTable?.warnings)
    ? rawTable.warnings.filter((warning): warning is string => typeof warning === 'string')
    : [];

  const currentStep: WizardStep =
    candidate.currentStep === 'text-import' ||
    candidate.currentStep === 'settings' ||
    candidate.currentStep === 'review'
      ? candidate.currentStep
      : 'table';

  return {
    table: {
      rows: rows.length > 0 ? rows : defaults.table.rows,
      warnings,
    },
    textImport: {
      rawText: typeof candidate.textImport?.rawText === 'string' ? candidate.textImport.rawText : '',
    },
    settings: sanitizeSettings(candidate.settings),
    currentStep,
  };
}

export function loadWizardState(): WizardState {
  try {
    const raw = localStorage.getItem(WORD_SOURCE_WIZARD_STORAGE_KEY);
    if (!raw) return createDefaultWizardState();
    return hydrateWizardState(JSON.parse(raw));
  } catch {
    return createDefaultWizardState();
  }
}

export function saveWizardState(state: WizardState): void {
  try {
    localStorage.setItem(WORD_SOURCE_WIZARD_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // silently fail
  }
}

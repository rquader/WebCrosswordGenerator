import { beforeEach, describe, expect, it } from 'vitest';
import {
  createDefaultWizardState,
  hydrateWizardState,
  loadWizardState,
  saveWizardState,
  WORD_SOURCE_WIZARD_STORAGE_KEY,
} from '../../src/components/sources/wizardState';

function createStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

describe('wizardState', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createStorageMock(),
      configurable: true,
    });
  });

  it('creates table-first defaults', () => {
    const state = createDefaultWizardState();

    expect(state.currentStep).toBe('table');
    expect(state.table.rows).toHaveLength(1);
    expect(state.textImport.rawText).toBe('');
  });

  it('hydrates saved table rows and warnings', () => {
    const state = hydrateWizardState({
      currentStep: 'review',
      table: {
        rows: [
          { id: 'row-1', word: 'react', clue: 'A UI library' },
          { id: 'row-2', word: '', clue: '' },
        ],
        warnings: ['Imported row 3 had no clue'],
      },
      textImport: {
        rawText: 'java: language',
      },
      settings: {
        width: 12,
        height: 10,
        seedText: '1234',
        allowReverseWords: false,
        puzzleMode: 'wordsearch',
        wordSearchDirections: {
          horizontal: true,
          vertical: true,
          diagonal: true,
          reversed: false,
          reversedDiagonal: false,
        },
      },
    });

    expect(state.currentStep).toBe('review');
    expect(state.settings.seedText).toBe('1234');
    expect(state.table.warnings).toEqual(['Imported row 3 had no clue']);
    expect(state.table.rows[0]).toEqual({ id: 'row-1', word: 'react', clue: 'A UI library' });
    expect(state.textImport.rawText).toBe('java: language');
  });

  it('saves and reloads persisted wizard state', () => {
    const state = createDefaultWizardState();
    state.currentStep = 'settings';
    state.table.rows = [{ id: 'row-1', word: 'loop', clue: 'Repeating block' }];
    state.table.warnings = ['Line 2: Empty clue'];

    saveWizardState(state);
    const raw = globalThis.localStorage.getItem(WORD_SOURCE_WIZARD_STORAGE_KEY);
    expect(raw).not.toBeNull();

    const reloaded = loadWizardState();
    expect(reloaded.currentStep).toBe('settings');
    expect(reloaded.table.rows).toEqual([{ id: 'row-1', word: 'loop', clue: 'Repeating block' }]);
    expect(reloaded.table.warnings).toEqual(['Line 2: Empty clue']);
  });
});

import { parseTextInput } from '../../utils/fileParser';
import type { WordRules } from '../../logic/language';
import type { ImportedEntryRows, TextEntryDraft } from './types';

/**
 * Text import is a parser-only step. The table becomes the editable surface after import.
 */
export async function resolveTextEntrySource(draft: TextEntryDraft, rules: WordRules = {}): Promise<ImportedEntryRows> {
  const result = parseTextInput(draft.rawText, rules);
  const entryCount = result.entries.length;
  return {
    entries: result.entries,
    warnings: result.errors,
    sourceLabel: 'Text Import',
    sourceSummary: entryCount === 0
      ? 'No valid rows parsed from pasted text'
      : `${entryCount} valid entr${entryCount === 1 ? 'y' : 'ies'} parsed from pasted text`,
  };
}

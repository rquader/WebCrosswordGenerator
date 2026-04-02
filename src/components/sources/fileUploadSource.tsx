import type { FileUploadDraft, ImportedEntryRows } from './types';

/**
 * File imports are parsed immediately, then normalized into the shared table state.
 */
export async function resolveFileUploadSource(draft: FileUploadDraft): Promise<ImportedEntryRows> {
  const label = draft.fileName ? `File Upload (${draft.fileName})` : 'File Upload';
  const summary = draft.entries.length === 0
    ? (draft.fileName ? `No valid rows found in ${draft.fileName}` : 'No file loaded yet')
    : `${draft.entries.length} valid entr${draft.entries.length === 1 ? 'y' : 'ies'} parsed from ${draft.fileName ?? 'uploaded file'}`;

  return {
    entries: draft.entries,
    warnings: draft.warnings,
    sourceLabel: label,
    sourceSummary: summary,
  };
}

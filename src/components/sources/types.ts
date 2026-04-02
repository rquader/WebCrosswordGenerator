import type { WordCluePair } from '../../logic/types';

export interface TextEntryDraft {
  rawText: string;
}

export interface FileUploadDraft {
  fileName: string | null;
  entries: WordCluePair[];
  warnings: string[];
}

export interface ImportedEntryRows {
  entries: WordCluePair[];
  warnings: string[];
  sourceLabel: string;
  sourceSummary: string;
}

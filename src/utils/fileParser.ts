/**
 * File parsing utilities for custom word-clue input.
 *
 * Supports:
 * - .txt files (one "word: clue" or "word - clue" per line)
 * - .csv files (word,clue per row)
 * - .json files (array of {word, clue} objects)
 *
 * ALL parsing happens locally in the browser.
 * No data is sent anywhere — files are read via FileReader API.
 */

import type { WordCluePair } from '../logic/types';

export interface ParseResult {
  entries: WordCluePair[];
  errors: string[];
}

/**
 * Parse a file into word-clue pairs based on its extension.
 * Reads the file locally using FileReader — no network calls.
 */
export async function parseFile(file: File): Promise<ParseResult> {
  const text = await readFileAsText(file);
  const extension = getFileExtension(file.name);

  switch (extension) {
    case 'txt':
      return parseTxt(text);
    case 'csv':
      return parseCsv(text);
    case 'json':
      return parseJson(text);
    default:
      return {
        entries: [],
        errors: ['Unsupported file type: .' + extension + '. Use .txt, .csv, or .json'],
      };
  }
}

/**
 * Parse plain text input (from textarea or .txt file).
 * Accepts formats:
 *   word: clue
 *   word - clue
 *   word, clue
 *   word | clue
 */
export function parseTextInput(text: string): ParseResult {
  return parseTxt(text);
}

// --- Internal parsing functions ---

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length < 2) return '';
  return parts[parts.length - 1].toLowerCase();
}

/**
 * Strip BOM (byte order mark) from the start of text.
 */
function stripBom(text: string): string {
  if (text.charCodeAt(0) === 0xFEFF) {
    return text.slice(1);
  }
  return text;
}

/**
 * Normalize line endings to \n.
 */
function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Normalize user-entered words to the generator's expected format.
 */
export function normalizeWordInput(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z]/g, '');
}

function parseTxt(text: string): ParseResult {
  const cleaned = normalizeLineEndings(stripBom(text));
  const lines = cleaned.split('\n');
  const entries: WordCluePair[] = [];
  const errors: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '' || line.startsWith('#') || line.startsWith('//')) {
      continue; // Skip empty lines and comments
    }

    // Try different delimiters: colon, dash, comma, pipe
    let word = '';
    let clue = '';
    let found = false;

    // Try ": " first (most common)
    const colonIndex = line.indexOf(': ');
    if (colonIndex > 0) {
      word = line.substring(0, colonIndex);
      clue = line.substring(colonIndex + 2);
      found = true;
    }

    // Try " - "
    if (!found) {
      const dashIndex = line.indexOf(' - ');
      if (dashIndex > 0) {
        word = line.substring(0, dashIndex);
        clue = line.substring(dashIndex + 3);
        found = true;
      }
    }

    // Try ", "
    if (!found) {
      const commaIndex = line.indexOf(', ');
      if (commaIndex > 0) {
        word = line.substring(0, commaIndex);
        clue = line.substring(commaIndex + 2);
        found = true;
      }
    }

    // Try " | "
    if (!found) {
      const pipeIndex = line.indexOf(' | ');
      if (pipeIndex > 0) {
        word = line.substring(0, pipeIndex);
        clue = line.substring(pipeIndex + 3);
        found = true;
      }
    }

    if (!found) {
      errors.push('Line ' + (i + 1) + ': Could not find separator (use "word: clue" or "word - clue")');
      continue;
    }

    const cleanedWord = normalizeWordInput(word);
    const trimmedClue = clue.trim();

    if (cleanedWord.length === 0) {
      errors.push('Line ' + (i + 1) + ': Empty word');
      continue;
    }

    if (trimmedClue.length === 0) {
      errors.push('Line ' + (i + 1) + ': Empty clue for word "' + cleanedWord + '"');
      continue;
    }

    entries.push({ word: cleanedWord, clue: trimmedClue });
  }

  return { entries, errors };
}

function parseCsv(text: string): ParseResult {
  const cleaned = normalizeLineEndings(stripBom(text));
  const lines = cleaned.split('\n');
  const entries: WordCluePair[] = [];
  const errors: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue;

    // Skip header row if it looks like one
    if (i === 0 && (line.toLowerCase().startsWith('word') || line.toLowerCase().startsWith('term'))) {
      continue;
    }

    // Simple CSV parsing (handles quoted fields)
    const fields = parseCSVLine(line);
    if (fields.length < 2) {
      errors.push('Line ' + (i + 1) + ': Expected at least 2 columns (word, clue)');
      continue;
    }

    const cleanedWord = normalizeWordInput(fields[0]);
    const trimmedClue = fields[1].trim();

    if (cleanedWord.length === 0) {
      errors.push('Line ' + (i + 1) + ': Empty word');
      continue;
    }

    if (trimmedClue.length === 0) {
      errors.push('Line ' + (i + 1) + ': Empty clue');
      continue;
    }

    entries.push({ word: cleanedWord, clue: trimmedClue });
  }

  return { entries, errors };
}

/**
 * Parse a single CSV line, handling quoted fields.
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  fields.push(current);

  return fields;
}

function parseJson(text: string): ParseResult {
  const entries: WordCluePair[] = [];
  const errors: string[] = [];

  let data: unknown;
  try {
    data = JSON.parse(stripBom(text));
  } catch {
    return { entries: [], errors: ['Invalid JSON format'] };
  }

  // Accept an array of objects with word/clue fields
  if (!Array.isArray(data)) {
    return { entries: [], errors: ['JSON must be an array of objects like [{"word": "...", "clue": "..."}]'] };
  }

  for (let i = 0; i < data.length; i++) {
    const item = data[i] as Record<string, unknown>;

    // Try common field names
    const word = (item.word || item.term || item.answer || '') as string;
    const clue = (item.clue || item.hint || item.definition || item.description || '') as string;

    const cleanedWord = normalizeWordInput(String(word));
    const trimmedClue = String(clue).trim();

    if (cleanedWord.length === 0) {
      errors.push('Item ' + (i + 1) + ': Missing or empty "word" field');
      continue;
    }

    if (trimmedClue.length === 0) {
      errors.push('Item ' + (i + 1) + ': Missing or empty "clue" field');
      continue;
    }

    entries.push({ word: cleanedWord, clue: trimmedClue });
  }

  return { entries, errors };
}

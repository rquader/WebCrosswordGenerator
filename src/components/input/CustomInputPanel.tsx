/**
 * Custom input panel for user-provided word-clue pairs.
 *
 * Supports:
 * - Text area for manual entry (word: clue format)
 * - File upload via button or drag-and-drop (.txt, .csv, .json)
 * - All parsing happens locally — no data leaves the browser
 *
 * Provides real-time validation feedback with helpful error messages.
 */

import { useState, useRef, useCallback } from 'react';
import { parseFile, parseTextInput } from '../../utils/fileParser';
import type { ParseResult } from '../../utils/fileParser';
import type { WordCluePair } from '../../logic/types';

interface CustomInputPanelProps {
  onEntriesReady: (entries: WordCluePair[]) => void;
}

const PLACEHOLDER_TEXT = `Enter word-clue pairs, one per line.

Supported formats:
  java: A programming language
  array - A collection of elements
  loop, Repeating code block
  method | A function in a class

Lines starting with # are ignored.`;

export function CustomInputPanel({ onEntriesReady }: CustomInputPanelProps) {
  const [textInput, setTextInput] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse text input
  const handleParseText = useCallback(() => {
    if (textInput.trim() === '') {
      setParseResult(null);
      return;
    }
    const result = parseTextInput(textInput);
    setParseResult(result);
    if (result.entries.length > 0) {
      onEntriesReady(result.entries);
    }
  }, [textInput, onEntriesReady]);

  // Handle file selection (from button click)
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setFileName(file.name);

    const result = await parseFile(file);
    setParseResult(result);

    if (result.entries.length > 0) {
      // Also populate the text area so the user can see/edit the data
      const textLines = result.entries.map(e => e.word + ': ' + e.clue);
      setTextInput(textLines.join('\n'));
      onEntriesReady(result.entries);
    }
  }, [onEntriesReady]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const entryCount = parseResult?.entries.length ?? 0;
  const errorCount = parseResult?.errors.length ?? 0;

  return (
    <div className="bg-white dark:bg-surface-dark-alt rounded-xl border border-stone-200 dark:border-stone-700/50 p-5 shadow-card">
      <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-4 uppercase tracking-wider">
        Custom Words
      </h2>

      {/* Text Area */}
      <textarea
        value={textInput}
        onChange={(e) => setTextInput(e.target.value)}
        placeholder={PLACEHOLDER_TEXT}
        rows={8}
        className="w-full rounded-lg border border-stone-300 dark:border-stone-600
                   bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100
                   px-3 py-2 text-sm font-mono
                   placeholder:text-stone-400 dark:placeholder:text-stone-500
                   focus:outline-none focus:ring-2 focus:ring-primary-500
                   resize-y transition-shadow"
      />

      {/* Parse button */}
      <button
        onClick={handleParseText}
        disabled={textInput.trim() === ''}
        className="mt-3 w-full py-2 rounded-lg text-sm font-medium
                   bg-primary-600 hover:bg-primary-700 text-white
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors"
      >
        Use These Words
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-stone-200 dark:bg-stone-700" />
        <span className="text-xs text-stone-400 dark:text-stone-500">or upload a file</span>
        <div className="flex-1 h-px bg-stone-200 dark:bg-stone-700" />
      </div>

      {/* File Upload / Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative rounded-lg border-2 border-dashed p-6 text-center cursor-pointer
          transition-colors duration-150
          ${isDragging
            ? 'border-primary-400 bg-primary-50 dark:bg-primary-950/20'
            : 'border-stone-300 dark:border-stone-600 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-stone-50 dark:hover:bg-stone-800/50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.csv,.json"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        <svg className="w-8 h-8 mx-auto text-stone-400 dark:text-stone-500 mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>

        <p className="text-sm text-stone-500 dark:text-stone-400">
          {isDragging ? 'Drop file here' : 'Drop a file here or click to browse'}
        </p>
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
          Supports .txt, .csv, .json
        </p>

        {fileName && (
          <p className="text-xs text-primary-600 dark:text-primary-400 mt-2 font-medium">
            Loaded: {fileName}
          </p>
        )}
      </div>

      {/* Privacy note */}
      <p className="mt-3 text-xs text-stone-400 dark:text-stone-500 flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
        Files are processed entirely in your browser. Nothing is uploaded.
      </p>

      {/* Validation Results */}
      {parseResult && (
        <div className="mt-4 space-y-2 animate-fade-in">
          {entryCount > 0 && (
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
              {entryCount} word{entryCount !== 1 ? 's' : ''} ready
            </p>
          )}

          {errorCount > 0 && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 p-3">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-1">
                {errorCount} issue{errorCount !== 1 ? 's' : ''} found:
              </p>
              <ul className="text-xs text-red-500 dark:text-red-400 space-y-0.5 max-h-32 overflow-y-auto scrollbar-thin">
                {parseResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Export tab — print, download, and share puzzles.
 *
 * Export options:
 * - Print (browser's native print dialog with clean CSS)
 * - PNG image (canvas-based, no external libraries)
 * - JSON (puzzle data for re-importing)
 * - PDF (via browser print-to-PDF)
 *
 * All exports are generated locally. Nothing is uploaded or shared externally.
 */

import { useState } from 'react';
import type { CrosswordResult } from '../../logic/types';
import { CrosswordGrid } from '../grid/CrosswordGrid';
import { CluePanel } from '../clues/CluePanel';
import { exportAsJson, exportAsPng, printPuzzle } from '../../utils/exportUtils';

interface ExportTabProps {
  puzzle: CrosswordResult;
}

export function ExportTab({ puzzle }: ExportTabProps) {
  const [includeAnswers, setIncludeAnswers] = useState(false);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Export options */}
      <div className="bg-white dark:bg-surface-dark-alt rounded-xl border border-stone-200 dark:border-stone-700/50 p-5 shadow-card">
        <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-4 uppercase tracking-wider">
          Export Options
        </h2>

        {/* Include answers toggle */}
        <label className="flex items-center gap-2 mb-5 cursor-pointer">
          <input
            type="checkbox"
            checked={includeAnswers}
            onChange={(e) => setIncludeAnswers(e.target.checked)}
            className="w-4 h-4 rounded border-stone-300 dark:border-stone-600
                       text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-stone-600 dark:text-stone-400">
            Include answers in export
          </span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Print */}
          <ExportButton
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
              </svg>
            }
            label="Print"
            description="Open print dialog (or save as PDF)"
            onClick={() => printPuzzle()}
          />

          {/* PNG */}
          <ExportButton
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
            }
            label="PNG Image"
            description="Download as image file"
            onClick={() => exportAsPng(puzzle, includeAnswers)}
          />

          {/* JSON */}
          <ExportButton
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              </svg>
            }
            label="JSON"
            description="Puzzle data (re-importable)"
            onClick={() => exportAsJson(puzzle)}
          />

          {/* Answer Key */}
          <ExportButton
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
            }
            label="Answer Key"
            description="PNG with all answers shown"
            onClick={() => exportAsPng(puzzle, true, 'crossword-answers.png')}
          />
        </div>

        <p className="mt-4 text-xs text-stone-400 dark:text-stone-500 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          All exports are generated locally. No data is sent anywhere.
        </p>
      </div>

      {/* Print preview area (visible when printing) */}
      <div className="print-area">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4 print:text-black">
          Preview
        </h2>
        <div className="flex justify-center mb-6">
          <CrosswordGrid puzzle={puzzle} showAnswers={includeAnswers} />
        </div>
        <CluePanel puzzle={puzzle} />
      </div>
    </div>
  );
}

interface ExportButtonProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}

function ExportButton({ icon, label, description, onClick }: ExportButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-stone-200 dark:border-stone-700
                 hover:border-primary-300 dark:hover:border-primary-700
                 hover:bg-primary-50/50 dark:hover:bg-primary-950/20
                 transition-all duration-150 text-center group"
    >
      <div className="text-stone-400 dark:text-stone-500 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
        {icon}
      </div>
      <span className="text-sm font-medium text-stone-700 dark:text-stone-300">{label}</span>
      <span className="text-xs text-stone-400 dark:text-stone-500">{description}</span>
    </button>
  );
}

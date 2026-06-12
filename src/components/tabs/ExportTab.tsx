/**
 * Export tab — print, download, and share puzzles.
 *
 * Export options:
 * - Print Preview (modal with Student Puzzle / Answer Key)
 * - PNG image (canvas-based, no external libraries)
 * - JSON (puzzle data for re-importing)
 *
 * All exports are generated locally. Nothing is uploaded or shared externally.
 */

import { useState } from 'react';
import type { CrosswordResult, PuzzleMode } from '../../logic/types';
import { CrosswordGrid } from '../grid/CrosswordGrid';
import { CluePanel } from '../clues/CluePanel';
import { PrintGrid } from '../print/PrintGrid';
import { PrintWordBank } from '../print/PrintWordBank';
import { WordCircleOverlay } from '../grid/WordCircleOverlay';
import { exportAsJson, exportAsPng } from '../../utils/exportUtils';
import { PrintPreviewModal } from '../print/PrintPreviewModal';
import { copyPuzzleUrlToClipboard } from '../../utils/puzzleUrl';

interface ExportTabProps {
  puzzle: CrosswordResult;
  puzzleMode: PuzzleMode;
}

export function ExportTab({ puzzle, puzzleMode }: ExportTabProps) {
  const [includeAnswers, setIncludeAnswers] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [shareToast, setShareToast] = useState<'idle' | 'copied' | 'error'>('idle');

  const handleShare = async () => {
    const success = await copyPuzzleUrlToClipboard(puzzle, puzzleMode);
    setShareToast(success ? 'copied' : 'error');
    setTimeout(() => setShareToast('idle'), 3000);
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Export options — print is the hero, downloads are a quiet list */}
      <div className="warm-card overflow-hidden">
        <div className="p-5">
          <h2 className="section-label mb-4">Export</h2>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="card-title">Print packet</h3>
              <p className="text-sm text-ink-2 mt-1 max-w-md">
                Student page {puzzleMode === 'wordsearch' ? 'with a word bank' : 'and clues'},
                plus a circled answer key — laid out for US Letter, printed from
                your browser or saved as a PDF.
              </p>
            </div>
            <button
              onClick={() => setShowPrintPreview(true)}
              className="btn-primary flex-shrink-0"
            >
              Open print preview
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer border-t border-line bg-well/60 px-5 py-2.5">
          <input
            type="checkbox"
            checked={includeAnswers}
            onChange={(e) => setIncludeAnswers(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-xs text-ink-2">
            Include answers in the image download and the preview below
          </span>
        </label>

        <ul className="divide-y divide-line border-t border-line">
          <ExportRow
            title="Image (PNG)"
            description="The grid as a picture — drop it into docs or slides"
            action="Download"
            onClick={() => exportAsPng(puzzle, includeAnswers, undefined, puzzleMode)}
          />
          <ExportRow
            title="Answer key (PNG)"
            description="Always shows the answers, whatever the toggle says"
            action="Download"
            onClick={() => exportAsPng(
              puzzle,
              true,
              puzzleMode === 'wordsearch' ? 'word-search-answers.png' : 'crossword-answers.png',
              puzzleMode
            )}
          />
          <ExportRow
            title="Puzzle file (JSON)"
            description="Re-importable data — pass the puzzle to another teacher"
            action="Download"
            onClick={() => exportAsJson(puzzle, puzzleMode)}
          />
          <ExportRow
            title="Solve link"
            description={
              shareToast === 'copied'
                ? 'Copied! Anyone with this link can solve your puzzle.'
                : shareToast === 'error'
                  ? 'Could not copy the link — try again.'
                  : 'The whole puzzle travels inside the link itself'
            }
            descriptionTone={shareToast === 'copied' ? 'rubric' : shareToast === 'error' ? 'error' : 'normal'}
            action="Copy link"
            onClick={handleShare}
          />
        </ul>

        <p className="border-t border-line px-5 py-3 text-xs text-ink-3 flex items-center gap-1.5">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          All exports are generated locally. No data is sent anywhere.
        </p>
      </div>

      {/* Preview area */}
      <div className="warm-card p-5">
        <h2 className="section-label mb-4">
          Preview
        </h2>
        {puzzleMode === 'wordsearch' ? (
          // Word search preview: paper card with the letter grid (letters
          // always — they ARE the puzzle), circles when answers are on,
          // word bank below. Across/Down clue panels don't apply here.
          <div className="flex justify-center">
            <div className="bg-white rounded-lg p-5 max-w-full"
                 style={{ boxShadow: '0 2px 16px -4px rgba(30,25,18,0.12), 0 0 0 1px rgba(30,25,18,0.06)' }}>
              <div className="flex justify-center mb-4">
                <div style={{ border: '1.5px solid #000', padding: '5px', maxWidth: '100%' }}>
                  <div style={{ width: `${Math.min(Math.floor(420 / puzzle.width), 36) * puzzle.width}px`, maxWidth: '100%', position: 'relative' }}>
                    <PrintGrid
                      puzzle={puzzle}
                      showAnswers={true}
                      cellSizePx={Math.min(Math.floor(420 / puzzle.width), 36)}
                      inkSaver={false}
                      wordSearch={true}
                    />
                    {includeAnswers && (
                      <WordCircleOverlay
                        words={puzzle.wordLocations}
                        gridWidth={puzzle.width}
                        gridHeight={puzzle.height}
                      />
                    )}
                  </div>
                </div>
              </div>
              <PrintWordBank puzzle={puzzle} />
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-6">
              <CrosswordGrid puzzle={puzzle} showAnswers={includeAnswers} />
            </div>
            <CluePanel puzzle={puzzle} />
          </>
        )}
      </div>

      {/* Print Preview Modal */}
      <PrintPreviewModal
        puzzle={puzzle}
        puzzleMode={puzzleMode}
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
      />
    </div>
  );
}

interface ExportRowProps {
  title: string;
  description: string;
  action: string;
  onClick: () => void;
  /** Color the description as a status: confirmation in red ink, errors in red. */
  descriptionTone?: 'normal' | 'rubric' | 'error';
}

function ExportRow({ title, description, action, onClick, descriptionTone = 'normal' }: ExportRowProps) {
  const descClass = descriptionTone === 'rubric'
    ? 'text-rubric'
    : descriptionTone === 'error'
      ? 'text-red-600 dark:text-red-400'
      : 'text-ink-3';

  return (
    <li className="flex items-center justify-between gap-4 px-5 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className={`text-xs mt-0.5 ${descClass}`}>{description}</p>
      </div>
      <button onClick={onClick} className="btn-secondary btn-sm flex-shrink-0">
        {action}
      </button>
    </li>
  );
}

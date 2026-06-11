/**
 * Hidden print container — rendered via React portal.
 *
 * This component renders the print-ready layout (grid + clues + title)
 * into a separate DOM node (#print-root) OUTSIDE the main React tree.
 * This is critical: @media print hides #root entirely, so the print
 * content must live in a sibling element that stays visible.
 *
 * On screen: #print-root is hidden via CSS (display: none).
 * On print: #root is hidden, #print-root becomes visible.
 */

import { createPortal } from 'react-dom';
import type { CrosswordResult, PuzzleMode } from '../../logic/types';
import { PrintGrid } from './PrintGrid';
import { PrintClues } from './PrintClues';
import { PrintWordBank } from './PrintWordBank';
import { WordCircleOverlay } from '../grid/WordCircleOverlay';
import { planBothPrintLayout, ptToPx } from '../../utils/printLayout';

interface PrintContainerProps {
  puzzle: CrosswordResult;
  puzzleMode: PuzzleMode;
  title: string;
  showNameDate: boolean;
  /** 'student' = blank grid, 'answerKey' = filled grid, 'both' = two pages */
  printTarget: 'student' | 'answerKey' | 'both';
  /** Blocked squares as light gray instead of solid black. */
  inkSaver: boolean;
}

export function PrintContainer({ puzzle, puzzleMode, title, showNameDate, printTarget, inkSaver }: PrintContainerProps) {
  const printRoot = document.getElementById('print-root');
  if (!printRoot) return null;

  const showStudent = printTarget === 'student' || printTarget === 'both';
  const showAnswerKey = printTarget === 'answerKey' || printTarget === 'both';

  // Word search "Both" is always two pages: the answer key is a full grid
  // with circled words, and shrinking it to a compact appendix (the
  // crossword trick) makes the circles overlap into noise. Student page +
  // key page is the honest layout. The PDF path makes the same call.
  if (puzzleMode === 'wordsearch') {
    return createPortal(
      <div className="print-only" id="print-container">
        {showStudent && (
          <WordSearchPrintPage
            puzzle={puzzle}
            title={title}
            showNameDate={showNameDate}
            withCircles={false}
          />
        )}
        {showAnswerKey && (
          <WordSearchPrintPage
            puzzle={puzzle}
            title={showStudent ? `${title} — Answer Key` : title}
            showNameDate={false}
            withCircles={true}
          />
        )}
      </div>,
      printRoot
    );
  }

  // "Both" fits on one page when the plan allows it: student grid + clues
  // with a compact answer key below. Same decision as the PDF export.
  const plan = planBothPrintLayout(puzzle);
  const singlePageBoth = printTarget === 'both' && plan.singlePage;

  return createPortal(
    <div className="print-only" id="print-container">
      {singlePageBoth ? (
        <PrintPage
          puzzle={puzzle}
          title={title}
          showNameDate={showNameDate}
          showAnswers={false}
          inkSaver={inkSaver}
          answerKeyAppendix={{
            cellPx: ptToPx(plan.keyCellPt),
            showNumbers: plan.keyShowsNumbers,
          }}
        />
      ) : (
        <>
          {showStudent && (
            <PrintPage
              puzzle={puzzle}
              title={title}
              showNameDate={showNameDate}
              showAnswers={false}
              inkSaver={inkSaver}
            />
          )}
          {showAnswerKey && (
            <PrintPage
              puzzle={puzzle}
              title={showStudent ? `${title} — Answer Key` : title}
              showNameDate={false}
              showAnswers={true}
              inkSaver={inkSaver}
            />
          )}
        </>
      )}
    </div>,
    printRoot
  );
}

interface WordSearchPrintPageProps {
  puzzle: CrosswordResult;
  title: string;
  showNameDate: boolean;
  /** Answer key: circle every placed word on the grid. */
  withCircles: boolean;
}

/**
 * A word search print page: full letter grid (the letters ARE the puzzle),
 * word bank below on the student page, circled words on the answer key.
 * No clue columns, no cell numbers, no ink-saver (nothing is blocked).
 */
function WordSearchPrintPage({ puzzle, title, showNameDate, withCircles }: WordSearchPrintPageProps) {
  const maxGridWidth = 480;
  const cellSize = Math.min(Math.floor(maxGridWidth / puzzle.width), 40);
  const gridWidth = cellSize * puzzle.width;

  return (
    <div
      className="print-page"
      style={{
        fontFamily: 'system-ui, -apple-system, Arial, sans-serif',
        color: '#000',
        backgroundColor: '#fff',
        padding: '0.75in',
        pageBreakAfter: 'always',
      }}
    >
      <h1
        style={{
          fontSize: '18px',
          fontWeight: 700,
          textAlign: 'center',
          margin: '0 0 8px 0',
          color: '#000',
        }}
      >
        {title}
      </h1>

      {showNameDate && (
        <div
          style={{
            display: 'flex',
            gap: '32px',
            fontSize: '10px',
            marginBottom: '16px',
            color: '#000',
          }}
        >
          <span>
            Name: <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '200px' }}>&nbsp;</span>
          </span>
          <span>
            Date: <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '140px' }}>&nbsp;</span>
          </span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', breakInside: 'avoid' }}>
        {/* Frame and breathing room live OUT here so the circle overlay's
            inset-0 box is exactly the cell area — circles align per cell. */}
        <div style={{ border: '1.5px solid #000', padding: '6px' }}>
          <div style={{ width: `${gridWidth}px`, position: 'relative' }}>
            <PrintGrid
              puzzle={puzzle}
              showAnswers={true}
              cellSizePx={cellSize}
              inkSaver={false}
              wordSearch={true}
            />
            {withCircles && (
              <WordCircleOverlay
                words={puzzle.wordLocations}
                gridWidth={puzzle.width}
                gridHeight={puzzle.height}
              />
            )}
          </div>
        </div>
      </div>

      {!withCircles && <PrintWordBank puzzle={puzzle} />}
    </div>
  );
}

interface PrintPageProps {
  puzzle: CrosswordResult;
  title: string;
  showNameDate: boolean;
  showAnswers: boolean;
  inkSaver: boolean;
  /** Compact answer-key grid below the clues (single-page "both" layout). */
  answerKeyAppendix?: { cellPx: number; showNumbers: boolean };
}

function PrintPage({ puzzle, title, showNameDate, showAnswers, inkSaver, answerKeyAppendix }: PrintPageProps) {
  const maxGridWidth = 480;
  const cellSize = Math.min(
    Math.floor(maxGridWidth / puzzle.width),
    40
  );
  const gridWidth = cellSize * puzzle.width;

  return (
    <div
      className="print-page"
      style={{
        fontFamily: 'system-ui, -apple-system, Arial, sans-serif',
        color: '#000',
        backgroundColor: '#fff',
        padding: '0.75in',
        pageBreakAfter: 'always',
      }}
    >
      <h1
        style={{
          fontSize: '18px',
          fontWeight: 700,
          textAlign: 'center',
          margin: '0 0 8px 0',
          color: '#000',
        }}
      >
        {title}
      </h1>

      {showNameDate && (
        <div
          style={{
            display: 'flex',
            gap: '32px',
            fontSize: '10px',
            marginBottom: '16px',
            color: '#000',
          }}
        >
          <span>
            Name: <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '200px' }}>&nbsp;</span>
          </span>
          <span>
            Date: <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '140px' }}>&nbsp;</span>
          </span>
        </div>
      )}

      {/* The grid must never be sliced by a page break */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', breakInside: 'avoid' }}>
        <div style={{ width: `${gridWidth}px` }}>
          <PrintGrid puzzle={puzzle} showAnswers={showAnswers} cellSizePx={cellSize} inkSaver={inkSaver} />
        </div>
      </div>

      <PrintClues puzzle={puzzle} />

      {answerKeyAppendix && (
        <div style={{ marginTop: '16px', breakInside: 'avoid' }}>
          <h2
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textAlign: 'center',
              margin: '0 0 6px 0',
              color: '#000',
            }}
          >
            ANSWER KEY
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: `${answerKeyAppendix.cellPx * puzzle.width}px` }}>
              <PrintGrid
                puzzle={puzzle}
                showAnswers={true}
                cellSizePx={answerKeyAppendix.cellPx}
                inkSaver={inkSaver}
                showNumbers={answerKeyAppendix.showNumbers}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

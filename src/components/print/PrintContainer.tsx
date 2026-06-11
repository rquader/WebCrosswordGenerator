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
import type { CrosswordResult } from '../../logic/types';
import { PrintGrid } from './PrintGrid';
import { PrintClues } from './PrintClues';
import { planBothPrintLayout, ptToPx } from '../../utils/printLayout';

interface PrintContainerProps {
  puzzle: CrosswordResult;
  title: string;
  showNameDate: boolean;
  /** 'student' = blank grid, 'answerKey' = filled grid, 'both' = two pages */
  printTarget: 'student' | 'answerKey' | 'both';
  /** Blocked squares as light gray instead of solid black. */
  inkSaver: boolean;
}

export function PrintContainer({ puzzle, title, showNameDate, printTarget, inkSaver }: PrintContainerProps) {
  const printRoot = document.getElementById('print-root');
  if (!printRoot) return null;

  const showStudent = printTarget === 'student' || printTarget === 'both';
  const showAnswerKey = printTarget === 'answerKey' || printTarget === 'both';

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

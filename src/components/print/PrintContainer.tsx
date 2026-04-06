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

interface PrintContainerProps {
  puzzle: CrosswordResult;
  title: string;
  showNameDate: boolean;
  /** 'student' = blank grid, 'answerKey' = filled grid, 'both' = two pages */
  printTarget: 'student' | 'answerKey' | 'both';
}

export function PrintContainer({ puzzle, title, showNameDate, printTarget }: PrintContainerProps) {
  const printRoot = document.getElementById('print-root');
  if (!printRoot) return null;

  const showStudent = printTarget === 'student' || printTarget === 'both';
  const showAnswerKey = printTarget === 'answerKey' || printTarget === 'both';

  return createPortal(
    <div className="print-only" id="print-container">
      {showStudent && (
        <PrintPage
          puzzle={puzzle}
          title={title}
          showNameDate={showNameDate}
          showAnswers={false}
        />
      )}
      {showAnswerKey && (
        <PrintPage
          puzzle={puzzle}
          title={showStudent ? `${title} — Answer Key` : title}
          showNameDate={false}
          showAnswers={true}
        />
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
}

function PrintPage({ puzzle, title, showNameDate, showAnswers }: PrintPageProps) {
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

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <div style={{ width: `${gridWidth}px` }}>
          <PrintGrid puzzle={puzzle} showAnswers={showAnswers} />
        </div>
      </div>

      <PrintClues puzzle={puzzle} />
    </div>
  );
}

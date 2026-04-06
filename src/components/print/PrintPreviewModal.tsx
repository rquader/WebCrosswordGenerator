/**
 * Print Preview Modal.
 *
 * A polished overlay for previewing and printing crossword puzzles.
 * Two views: Student Puzzle (blank grid) and Answer Key (filled grid).
 * Customizable title and Name/Date line.
 *
 * The modal renders:
 * 1. A visual preview (the "paper" area) — always white/B&W
 * 2. Controls below the preview — respects dark mode
 * 3. A hidden PrintContainer that becomes the actual print output
 *
 * Design: editorial/stationery feel. The paper preview is the hero element,
 * floating with a subtle shadow as if sitting on a desk.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { CrosswordResult } from '../../logic/types';
import { PrintGrid } from './PrintGrid';
import { PrintClues } from './PrintClues';
import { PrintContainer } from './PrintContainer';
import { exportAsPdf, exportBothAsPdf } from '../../utils/pdfExport';

interface PrintPreviewModalProps {
  puzzle: CrosswordResult;
  isOpen: boolean;
  onClose: () => void;
}

type PreviewTab = 'student' | 'answerKey';
type PrintTarget = 'student' | 'answerKey' | 'both';

export function PrintPreviewModal({ puzzle, isOpen, onClose }: PrintPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>('student');
  const [title, setTitle] = useState('Crossword Puzzle');
  const [showNameDate, setShowNameDate] = useState(true);
  const [printTarget, setPrintTarget] = useState<PrintTarget>('student');
  const [isPrinting, setIsPrinting] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store focus origin and restore on close
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Small delay so the modal renders before we try to focus
      const timer = setTimeout(() => titleInputRef.current?.select(), 80);
      return () => clearTimeout(timer);
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  // Focus trap: keep Tab within the modal
  useEffect(() => {
    if (!isOpen) return;
    const modal = modalRef.current;
    if (!modal) return;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  const handlePrint = useCallback((target: PrintTarget) => {
    setPrintTarget(target);
    setIsPrinting(true);
    // React needs to flush the portal render before we call window.print().
    // Double-rAF ensures the DOM is fully painted with the new printTarget.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
        setIsPrinting(false);
      });
    });
  }, []);

  if (!isOpen) return null;

  const showAnswersInPreview = activeTab === 'answerKey';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-label="Print preview"
      >
        {/* Overlay */}
        <div
          className="absolute inset-0 bg-stone-900/60 dark:bg-black/70 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal panel */}
        <div
          ref={modalRef}
          className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col
                     bg-surface-light dark:bg-surface-dark-alt
                     rounded-2xl border border-stone-200/60 dark:border-stone-700/40
                     shadow-[0_25px_60px_-12px_rgba(30,25,18,0.25)]
                     dark:shadow-[0_25px_60px_-12px_rgba(0,0,0,0.5)]
                     animate-scale-in overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <h2 className="text-base font-semibold text-stone-800 dark:text-stone-200 tracking-tight">
              Print Preview
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 dark:text-stone-500
                         hover:text-stone-600 dark:hover:text-stone-300
                         hover:bg-stone-100 dark:hover:bg-stone-700/50
                         transition-colors"
              aria-label="Close print preview"
            >
              <svg className="w-4.5 h-4.5" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>

          {/* Tab toggle */}
          <div className="px-5 pb-3">
            <div className="inline-flex rounded-lg bg-stone-100 dark:bg-stone-800/60 p-0.5">
              <TabButton
                active={activeTab === 'student'}
                onClick={() => setActiveTab('student')}
                label="Student Puzzle"
              />
              <TabButton
                active={activeTab === 'answerKey'}
                onClick={() => setActiveTab('answerKey')}
                label="Answer Key"
              />
            </div>
          </div>

          {/* Paper preview area — scrollable */}
          <div className="flex-1 overflow-y-auto px-5 pb-3 scrollbar-thin">
            <div
              className="mx-auto bg-white rounded-lg overflow-hidden"
              style={{
                boxShadow: '0 2px 16px -4px rgba(30,25,18,0.12), 0 0 0 1px rgba(30,25,18,0.06)',
                maxWidth: '520px',
              }}
            >
              {/* Inner paper content with padding */}
              <div className="p-5 sm:p-6">
                {/* Title */}
                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    textAlign: 'center',
                    color: '#000',
                    marginBottom: showNameDate ? '6px' : '12px',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                  }}
                >
                  {title || 'Crossword Puzzle'}
                  {showAnswersInPreview && (
                    <span style={{ fontWeight: 400, fontSize: '12px', color: '#666', marginLeft: '6px' }}>
                      — Answer Key
                    </span>
                  )}
                </h3>

                {/* Name / Date line */}
                {showNameDate && !showAnswersInPreview && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '24px',
                      fontSize: '9px',
                      marginBottom: '14px',
                      color: '#000',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                    }}
                  >
                    <span>
                      Name: <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '140px' }}>&nbsp;</span>
                    </span>
                    <span>
                      Date: <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '100px' }}>&nbsp;</span>
                    </span>
                  </div>
                )}

                {/* Grid */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  <div style={{ width: '100%', maxWidth: '360px' }}>
                    <PrintGrid puzzle={puzzle} showAnswers={showAnswersInPreview} />
                  </div>
                </div>

                {/* Clues */}
                <PrintClues puzzle={puzzle} />
              </div>
            </div>
          </div>

          {/* Controls footer */}
          <div className="border-t border-stone-200/60 dark:border-stone-700/30 px-5 py-4 space-y-3">
            {/* Title input + Name/Date toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">
                  Puzzle title
                </label>
                <input
                  ref={titleInputRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Crossword Puzzle"
                  className="w-full px-3 py-1.5 text-sm rounded-lg
                             bg-white dark:bg-surface-dark
                             border border-stone-200 dark:border-stone-700
                             text-stone-800 dark:text-stone-200
                             placeholder-stone-400 dark:placeholder-stone-500
                             focus:border-primary-400 dark:focus:border-primary-600
                             transition-colors"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none sm:pt-5">
                <input
                  type="checkbox"
                  checked={showNameDate}
                  onChange={(e) => setShowNameDate(e.target.checked)}
                />
                <span className="text-sm text-stone-600 dark:text-stone-400">
                  Name / Date line
                </span>
              </label>
            </div>

            {/* Action buttons — Print row */}
            <div className="flex flex-wrap gap-2">
              <ActionButton
                onClick={() => handlePrint('student')}
                variant="secondary"
                disabled={isPrinting}
              >
                <PrintIcon />
                Print Student
              </ActionButton>
              <ActionButton
                onClick={() => handlePrint('answerKey')}
                variant="secondary"
                disabled={isPrinting}
              >
                <PrintIcon />
                Print Answer Key
              </ActionButton>
              <ActionButton
                onClick={() => handlePrint('both')}
                variant="primary"
                disabled={isPrinting}
              >
                <PrintIcon />
                Print Both
              </ActionButton>
            </div>

            {/* Action buttons — PDF row */}
            <div className="flex flex-wrap gap-2">
              <ActionButton
                onClick={() => exportAsPdf(puzzle, { title: title || 'Crossword Puzzle', showNameDate, showAnswers: false })}
                variant="secondary"
                disabled={false}
              >
                <PdfIcon />
                PDF Student
              </ActionButton>
              <ActionButton
                onClick={() => exportAsPdf(puzzle, { title: title || 'Crossword Puzzle', showNameDate: false, showAnswers: true })}
                variant="secondary"
                disabled={false}
              >
                <PdfIcon />
                PDF Answer Key
              </ActionButton>
              <ActionButton
                onClick={() => exportBothAsPdf(puzzle, { title: title || 'Crossword Puzzle', showNameDate })}
                variant="secondary"
                disabled={false}
              >
                <PdfIcon />
                PDF Both
              </ActionButton>
            </div>

            {/* Privacy note */}
            <p className="text-[11px] text-stone-400 dark:text-stone-500 flex items-center gap-1">
              <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              Printed locally. Nothing is uploaded.
            </p>
          </div>
        </div>
      </div>

      {/* Hidden print container — only visible in @media print */}
      <PrintContainer
        puzzle={puzzle}
        title={title || 'Crossword Puzzle'}
        showNameDate={showNameDate}
        printTarget={isPrinting ? printTarget : 'student'}
      />
    </>
  );
}


/* ── Sub-components ──────────────────────────────────────────────────── */

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
}

function TabButton({ active, onClick, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3.5 py-1.5 text-xs font-medium rounded-md transition-all duration-150
        ${active
          ? 'bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 shadow-sm'
          : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
        }
      `}
    >
      {label}
    </button>
  );
}

interface ActionButtonProps {
  onClick: () => void;
  variant: 'primary' | 'secondary';
  disabled?: boolean;
  children: React.ReactNode;
}

function ActionButton({ onClick, variant, disabled, children }: ActionButtonProps) {
  const base = 'inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl transition-all duration-150 btn-lift';

  const styles = variant === 'primary'
    ? `${base} bg-primary-600 hover:bg-primary-700 text-white shadow-sm`
    : `${base} bg-white dark:bg-surface-dark border border-stone-200 dark:border-stone-700
       text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/60`;

  return (
    <button onClick={onClick} disabled={disabled} className={styles}>
      {children}
    </button>
  );
}

function PrintIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

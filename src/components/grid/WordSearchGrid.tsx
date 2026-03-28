/**
 * Interactive word search grid for the Play tab.
 *
 * Unlike the crossword grid, word search:
 * - Shows ALL letters (placed words + random fill)
 * - Player clicks start cell, then clicks end cell to select a word path
 * - Found words are highlighted with distinct colors
 * - No typing — this is a search, not a fill
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import type { CrosswordResult, DirectionalWord } from '../../logic/types';

// 8 distinct colors for found words (warm, high-contrast)
const WORD_COLORS = [
  { bg: 'rgba(124,200,160,0.25)', text: '#7cc8a0', border: '#7cc8a0' },  // teal
  { bg: 'rgba(180,160,232,0.25)', text: '#b4a0e8', border: '#b4a0e8' },  // purple
  { bg: 'rgba(212,170,96,0.25)',  text: '#d4aa60', border: '#d4aa60' },   // amber
  { bg: 'rgba(200,120,96,0.25)',  text: '#c87860', border: '#c87860' },   // coral
  { bg: 'rgba(104,168,216,0.25)', text: '#68a8d8', border: '#68a8d8' },   // blue
  { bg: 'rgba(200,128,152,0.25)', text: '#c88098', border: '#c88098' },   // rose
  { bg: 'rgba(160,200,112,0.25)', text: '#a0c870', border: '#a0c870' },   // green
  { bg: 'rgba(96,192,192,0.25)',  text: '#60c0c0', border: '#60c0c0' },   // cyan
];

function cellKey(x: number, y: number): string {
  return x + ',' + y;
}

interface WordSearchGridProps {
  puzzle: CrosswordResult;
}

interface FoundWord {
  word: DirectionalWord;
  cells: string[];  // cellKey strings
  colorIndex: number;
}

export function WordSearchGrid({ puzzle }: WordSearchGridProps) {
  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [startCell, setStartCell] = useState<{ x: number; y: number } | null>(null);
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [lastFoundAnim, setLastFoundAnim] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const isComplete = foundWords.length === puzzle.wordLocations.length;

  // Timer
  const startTimer = useCallback(() => {
    if (isTimerRunning || isComplete) return;
    setIsTimerRunning(true);
    timerRef.current = window.setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
  }, [isTimerRunning, isComplete]);

  const stopTimer = useCallback(() => {
    setIsTimerRunning(false);
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Build a map of cellKey -> found word color index
  const foundCellMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const fw of foundWords) {
      for (const ck of fw.cells) {
        map.set(ck, fw.colorIndex);
      }
    }
    return map;
  }, [foundWords]);

  // Build a set of already found word strings
  const foundWordSet = useMemo(() => {
    return new Set(foundWords.map(fw => fw.word.word));
  }, [foundWords]);

  // Compute preview line cells when dragging
  const previewCells = useMemo(() => {
    if (!startCell || !hoverCell) return new Set<string>();
    return getCellsBetween(startCell.x, startCell.y, hoverCell.x, hoverCell.y, puzzle.width, puzzle.height);
  }, [startCell, hoverCell, puzzle.width, puzzle.height]);

  // Check if a selection matches any unfound word
  const checkSelection = useCallback((sx: number, sy: number, ex: number, ey: number) => {
    const selectedCells = getCellsBetween(sx, sy, ex, ey, puzzle.width, puzzle.height);
    if (selectedCells.size === 0) return;

    // Build the selected string from grid
    const cellArr = Array.from(selectedCells);
    // We need ordered cells to build the string
    const orderedCells = getOrderedCells(sx, sy, ex, ey);
    const selectedStr = orderedCells.map(([cx, cy]) => puzzle.grid[cy][cx]).join('');
    const reversedStr = selectedStr.split('').reverse().join('');

    for (const wordLoc of puzzle.wordLocations) {
      if (foundWordSet.has(wordLoc.word)) continue;

      if (wordLoc.word === selectedStr || wordLoc.word === reversedStr) {
        const colorIndex = foundWords.length % WORD_COLORS.length;
        const newFound: FoundWord = {
          word: wordLoc,
          cells: cellArr,
          colorIndex,
        };
        const updated = [...foundWords, newFound];
        setFoundWords(updated);
        setAnnouncement(`Found: ${wordLoc.word.toUpperCase()}, ${puzzle.wordLocations.length - updated.length} remaining`);
        setLastFoundAnim(wordLoc.word);
        setTimeout(() => setLastFoundAnim(null), 500);

        // Check completion
        if (updated.length === puzzle.wordLocations.length) {
          stopTimer();
        }
        return;
      }
    }
  }, [puzzle, foundWords, foundWordSet, stopTimer]);

  function handleCellClick(x: number, y: number) {
    startTimer();

    if (!startCell) {
      setStartCell({ x, y });
    } else {
      // Complete the selection
      checkSelection(startCell.x, startCell.y, x, y);
      setStartCell(null);
      setHoverCell(null);
    }
  }

  function handleCellHover(x: number, y: number) {
    if (startCell) {
      setHoverCell({ x, y });
    }
  }

  // Escape to cancel selection
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape' && startCell) {
      setStartCell(null);
      setHoverCell(null);
    }
  }

  function handleReset() {
    setFoundWords([]);
    setStartCell(null);
    setHoverCell(null);
    setElapsedSeconds(0);
    setIsTimerRunning(false);
    setLastFoundAnim(null);
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function handleReveal() {
    const allFound: FoundWord[] = puzzle.wordLocations.map((wl, i) => {
      const cells = getWordCells(wl);
      return { word: wl, cells, colorIndex: i % WORD_COLORS.length };
    });
    setFoundWords(allFound);
    stopTimer();
  }

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
  };

  return (
    <div className="animate-fade-in">
      {/* Completion banner */}
      {isComplete && (
        <div className="mb-6 p-4 rounded-xl bg-primary-50 dark:bg-primary-d/40 border border-primary-200 dark:border-primary-800/50 text-center animate-slide-up">
          <p className="text-primary-800 dark:text-primary-300 font-semibold text-lg">
            All Words Found!
          </p>
          <p className="text-primary-600 dark:text-primary-400 text-sm mt-1">
            Completed in {formatTime(elapsedSeconds)}
          </p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Grid + Controls */}
        <div className="flex-shrink-0">
          {/* Timer and controls bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-semibold text-stone-700 dark:text-stone-300 tabular-nums">
                {formatTime(elapsedSeconds)}
              </span>
              {isTimerRunning && (
                <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReveal}
                className="px-3 py-1.5 rounded-lg text-xs font-medium
                           border border-accent-300 dark:border-accent-700
                           text-accent-700 dark:text-accent-400
                           hover:bg-accent-50 dark:hover:bg-accent-950/30
                           transition-colors btn-lift"
              >
                Reveal
              </button>
              <button
                onClick={handleReset}
                className="px-3 py-1.5 rounded-lg text-xs font-medium
                           border border-stone-300 dark:border-stone-600
                           text-stone-600 dark:text-stone-400
                           hover:bg-stone-50 dark:hover:bg-surface-dark-hover
                           transition-colors btn-lift"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Selection hint */}
          <div className="mb-3 text-xs text-stone-400 dark:text-stone-500">
            {startCell
              ? <span>Click the <span className="font-medium text-primary-600 dark:text-primary-400">end cell</span> to complete selection</span>
              : <span>Click a cell to <span className="font-medium text-primary-600 dark:text-primary-400">start selecting</span> a word</span>
            }
          </div>

          {/* Grid */}
          <div className="inline-block relative noise-texture rounded-lg" tabIndex={0} onKeyDown={handleKeyDown} style={{ outline: 'none' }}>
            <div
              role="grid"
              aria-label="Word search puzzle grid"
              className="grid gap-0 border-2 border-stone-700 dark:border-stone-500/70 rounded-sm overflow-hidden"
              style={{
                gridTemplateColumns: `repeat(${puzzle.width}, minmax(0, 1fr))`,
              }}
            >
              {puzzle.grid.map((row, y) =>
                row.map((cell, x) => {
                  const key = cellKey(x, y);
                  const foundColorIdx = foundCellMap.get(key);
                  const isFound = foundColorIdx !== undefined;
                  const isStart = startCell !== null && startCell.x === x && startCell.y === y;
                  const isPreview = previewCells.has(key);
                  const color = isFound ? WORD_COLORS[foundColorIdx] : null;

                  return (
                    <div
                      key={key}
                      role="gridcell"
                      aria-label={`Row ${y + 1}, Column ${x + 1}, letter ${cell.toUpperCase()}${isFound ? ', found' : ''}`}
                      onClick={() => handleCellClick(x, y)}
                      onMouseEnter={() => handleCellHover(x, y)}
                      className={`
                        relative w-10 h-10 sm:w-11 sm:h-11
                        border border-grid-border dark:border-grid-border-dark
                        flex items-center justify-center cursor-pointer select-none
                        transition-all duration-100
                        ${isStart ? 'ring-2 ring-primary-500 z-10' : ''}
                        ${isPreview && !isFound ? 'bg-primary-100/60 dark:bg-primary-900/30' : ''}
                        ${!isFound && !isStart && !isPreview ? 'bg-grid-cell dark:bg-grid-cell-dark hover:bg-primary-50/50 dark:hover:bg-primary-950/15' : ''}
                      `}
                      style={isFound ? {
                        backgroundColor: color!.bg,
                        borderColor: color!.border + '40',
                      } : undefined}
                    >
                      <span
                        className={`text-sm sm:text-base font-semibold uppercase
                          ${isFound ? '' : 'text-stone-700 dark:text-stone-300'}
                          ${isPreview && !isFound ? 'text-primary-700 dark:text-primary-300' : ''}
                        `}
                        style={isFound ? { color: color!.text } : undefined}
                      >
                        {cell}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: Word List */}
        <div className="flex-1 min-w-0">
          <WordList
            words={puzzle.wordLocations}
            foundWords={foundWords}
            lastFoundWord={lastFoundAnim}
          />
        </div>
      </div>

      {/* Screen reader announcements */}
      <div aria-live="polite" className="sr-only">{announcement}</div>
    </div>
  );
}

/**
 * Word list showing all words to find, with found words struck through.
 */
function WordList({ words, foundWords, lastFoundWord }: {
  words: DirectionalWord[];
  foundWords: FoundWord[];
  lastFoundWord: string | null;
}) {
  const foundSet = new Set(foundWords.map(fw => fw.word.word));
  const foundMap = new Map(foundWords.map(fw => [fw.word.word, fw]));

  return (
    <div className="warm-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
          Words to Find
        </h3>
        <span className="text-xs font-mono text-stone-400 dark:text-stone-500">
          {foundWords.length} / {words.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-primary-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${words.length > 0 ? (foundWords.length / words.length) * 100 : 0}%` }}
        />
      </div>

      <div className="space-y-3">
        {groupWordsByDirection(words).map(({ label, items }) => (
          <div key={label}>
            <h4 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">{label}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {items.map((wl) => {
                const isFound = foundSet.has(wl.word);
                const fw = foundMap.get(wl.word);
                const color = fw ? WORD_COLORS[fw.colorIndex] : null;
                const isJustFound = lastFoundWord === wl.word;

                return (
                  <div
                    key={wl.word + wl.x + wl.y}
                    className={`
                      flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all duration-200
                      ${isFound ? 'opacity-75' : 'opacity-100'}
                      ${isJustFound ? 'animate-word-found' : ''}
                    `}
                  >
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 transition-all duration-200 ${
                        isFound ? '' : 'bg-stone-300 dark:bg-stone-600'
                      }`}
                      style={isFound && color ? { backgroundColor: color.text } : undefined}
                    />
                    <span className={`text-sm font-medium uppercase tracking-wide ${
                      isFound
                        ? 'line-through text-stone-400 dark:text-stone-500'
                        : 'text-stone-700 dark:text-stone-300'
                    }`}>
                      {wl.word}
                    </span>
                    <span className={`text-xs truncate ${
                      isFound ? 'text-stone-300 dark:text-stone-600' : 'text-stone-400 dark:text-stone-500'
                    }`}>
                      {wl.clue}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Group words by their placement direction for display.
 */
function getDirectionLabel(wl: DirectionalWord): string {
  if (wl.isHorizontal && !wl.isReversed) return 'Across';
  if (wl.isHorizontal && wl.isReversed) return 'Reversed Across';
  if (!wl.isHorizontal && !wl.isReversed) return 'Down';
  return 'Diagonal';
}

function groupWordsByDirection(words: DirectionalWord[]): { label: string; items: DirectionalWord[] }[] {
  const groups = new Map<string, DirectionalWord[]>();
  for (const wl of words) {
    const label = getDirectionLabel(wl);
    const existing = groups.get(label);
    if (existing) {
      existing.push(wl);
    } else {
      groups.set(label, [wl]);
    }
  }
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

/**
 * Get the set of cell keys between two points in a valid line (8 directions).
 * Returns empty set if the line is not a valid 8-direction line.
 */
function getCellsBetween(
  x1: number, y1: number, x2: number, y2: number,
  width: number, height: number
): Set<string> {
  const cells = new Set<string>();
  const dx = x2 - x1;
  const dy = y2 - y1;

  // Must be horizontal, vertical, or 45-degree diagonal
  if (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) return cells;
  if (dx === 0 && dy === 0) {
    cells.add(cellKey(x1, y1));
    return cells;
  }

  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  const stepX = dx === 0 ? 0 : dx / Math.abs(dx);
  const stepY = dy === 0 ? 0 : dy / Math.abs(dy);

  for (let i = 0; i <= steps; i++) {
    const cx = x1 + i * stepX;
    const cy = y1 + i * stepY;
    if (cx < 0 || cx >= width || cy < 0 || cy >= height) return new Set();
    cells.add(cellKey(cx, cy));
  }

  return cells;
}

/**
 * Get ordered array of [x,y] cells between two points.
 */
function getOrderedCells(x1: number, y1: number, x2: number, y2: number): [number, number][] {
  const cells: [number, number][] = [];
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) return cells;

  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  if (steps === 0) {
    cells.push([x1, y1]);
    return cells;
  }

  const stepX = dx / Math.abs(dx || 1);
  const stepY = dy / Math.abs(dy || 1);

  for (let i = 0; i <= steps; i++) {
    cells.push([x1 + i * stepX, y1 + i * stepY]);
  }

  return cells;
}

/**
 * Get all cells occupied by a placed word.
 */
function getWordCells(wl: DirectionalWord): string[] {
  const cells: string[] = [];
  // Determine direction vector from the word's position and the grid
  // We know the word starts at (wl.x, wl.y) and has isHorizontal and isReversed flags
  // But for word search, the actual direction could be any of 8
  // We need to try all 8 directions and find which one matches
  const directions: [number, number][] = [
    [1, 0], [0, 1], [1, 1], [-1, 1],
    [-1, 0], [0, -1], [-1, -1], [1, -1],
  ];

  for (const [dx, dy] of directions) {
    const test: string[] = [];
    for (let i = 0; i < wl.word.length; i++) {
      test.push(cellKey(wl.x + i * dx, wl.y + i * dy));
    }
    // Can't verify without grid, but this is for reveal — just add all 8 and take the one
    // that fits the direction flags
    if (wl.isHorizontal && dy === 0) {
      if ((!wl.isReversed && dx === 1) || (wl.isReversed && dx === -1)) {
        return test;
      }
    } else if (!wl.isHorizontal && dx === 0) {
      if ((!wl.isReversed && dy === 1) || (wl.isReversed && dy === -1)) {
        return test;
      }
    } else {
      // Diagonal — check flags
      const isRev = dx < 0 || (dx === 0 && dy < 0);
      if (wl.isReversed === isRev && Math.abs(dy) > 0) {
        // Could be this direction
        cells.push(...test);
        return cells;
      }
    }
  }

  // Fallback: just use horizontal right
  for (let i = 0; i < wl.word.length; i++) {
    cells.push(cellKey(wl.x + i, wl.y));
  }
  return cells;
}

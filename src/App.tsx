import { useState, useCallback, useEffect } from 'react';
import { useTheme } from './hooks/useTheme';
import { Header } from './components/layout/Header';
import { TabBar } from './components/layout/TabBar';
import type { TabId } from './components/layout/TabBar';
import type { CrosswordResult, PuzzleMode } from './logic/types';
import { decodePuzzleFromUrl, clearPuzzleHash } from './utils/puzzleUrl';

import { GenerateTab } from './components/tabs/GenerateTab';
import { PlayTab } from './components/tabs/PlayTab';
import { ExportTab } from './components/tabs/ExportTab';
import { HelpTab } from './components/tabs/HelpTab';

/**
 * Root application component.
 *
 * Manages:
 * - Theme (dark/light mode)
 * - Tab navigation
 * - Current puzzle state + mode (shared between tabs)
 * - Shared puzzle detection (URL hash)
 */
export function App() {
  const { theme, cycleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>('generate');
  const [puzzle, setPuzzle] = useState<CrosswordResult | null>(null);
  const [puzzleMode, setPuzzleMode] = useState<PuzzleMode>('crossword');
  const [sharedPuzzleLoaded, setSharedPuzzleLoaded] = useState(false);

  const handlePuzzleGenerated = useCallback((result: CrosswordResult, mode: PuzzleMode) => {
    setPuzzle(result);
    setPuzzleMode(mode);
  }, []);

  // Detect shared puzzle in URL hash on mount
  useEffect(() => {
    const shared = decodePuzzleFromUrl();
    if (shared) {
      setPuzzle(shared);
      setPuzzleMode('crossword');
      setActiveTab('play');
      setSharedPuzzleLoaded(true);
      clearPuzzleHash();
      // Auto-dismiss the banner after 5 seconds
      setTimeout(() => setSharedPuzzleLoaded(false), 5000);
    }
  }, []);

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark transition-colors duration-300">
      <Header theme={theme} onCycleTheme={cycleTheme} />
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} hasPuzzle={puzzle !== null} />

      {/* Shared puzzle banner */}
      {sharedPuzzleLoaded && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-3">
          <div className="px-4 py-2.5 rounded-xl bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800/40 flex items-center justify-between animate-slide-down">
            <span className="text-sm text-primary-700 dark:text-primary-300">
              Shared puzzle loaded — solve it!
            </span>
            <button
              onClick={() => setSharedPuzzleLoaded(false)}
              className="text-primary-400 dark:text-primary-600 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <main id="main-content" className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'generate' && (
          <div role="tabpanel" id="tabpanel-generate" aria-labelledby="tab-generate">
            <GenerateTab
              puzzle={puzzle}
              onPuzzleGenerated={handlePuzzleGenerated}
            />
          </div>
        )}
        {activeTab === 'play' && puzzle && (
          <div role="tabpanel" id="tabpanel-play" aria-labelledby="tab-play">
            <PlayTab puzzle={puzzle} puzzleMode={puzzleMode} />
          </div>
        )}
        {activeTab === 'export' && puzzle && (
          <div role="tabpanel" id="tabpanel-export" aria-labelledby="tab-export">
            <ExportTab puzzle={puzzle} />
          </div>
        )}
        {activeTab === 'help' && (
          <div role="tabpanel" id="tabpanel-help" aria-labelledby="tab-help">
            <HelpTab />
          </div>
        )}
      </main>

      <footer className="border-t border-stone-200/40 dark:border-stone-700/20 py-4 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-stone-400 dark:text-stone-500">
          <span>CrosswordGen Puzzle Studio</span>
          <span>v2.3 &middot; 100% offline</span>
        </div>
      </footer>
    </div>
  );
}

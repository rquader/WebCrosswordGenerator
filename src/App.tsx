import { useState, useCallback } from 'react';
import { useTheme } from './hooks/useTheme';
import { Header } from './components/layout/Header';
import { TabBar } from './components/layout/TabBar';
import type { TabId } from './components/layout/TabBar';
import type { CrosswordResult, PuzzleMode } from './logic/types';

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
 */
export function App() {
  const { theme, cycleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>('generate');
  const [puzzle, setPuzzle] = useState<CrosswordResult | null>(null);
  const [puzzleMode, setPuzzleMode] = useState<PuzzleMode>('crossword');

  const handlePuzzleGenerated = useCallback((result: CrosswordResult, mode: PuzzleMode) => {
    setPuzzle(result);
    setPuzzleMode(mode);
  }, []);

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark transition-colors duration-300">
      <Header theme={theme} onCycleTheme={cycleTheme} />
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} hasPuzzle={puzzle !== null} />

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
    </div>
  );
}

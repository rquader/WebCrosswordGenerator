import { useState, useCallback } from 'react';
import { useTheme } from './hooks/useTheme';
import { Header } from './components/layout/Header';
import { TabBar } from './components/layout/TabBar';
import type { TabId } from './components/layout/TabBar';
import type { CrosswordResult } from './logic/types';

// Tab content components — will be built in subsequent phases.
// For now, each is a placeholder that shows the tab name.
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
 * - Current puzzle state (shared between tabs)
 */
export function App() {
  const { isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>('generate');
  const [puzzle, setPuzzle] = useState<CrosswordResult | null>(null);

  const handlePuzzleGenerated = useCallback((result: CrosswordResult) => {
    setPuzzle(result);
  }, []);

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark transition-colors duration-200">
      <Header isDark={isDark} onToggleTheme={toggleTheme} />
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} hasPuzzle={puzzle !== null} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
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
            <PlayTab puzzle={puzzle} />
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
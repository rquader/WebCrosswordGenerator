/**
 * Tab navigation bar with sliding indicator.
 * Warm tones, smooth transitions, ArabicDialectMap-inspired micro-interactions.
 */

export type TabId = 'generate' | 'ai' | 'play' | 'export' | 'help';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  hasPuzzle: boolean;
}

const tabs: Tab[] = [
  {
    id: 'generate',
    label: 'Generate',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
  },
  {
    id: 'ai',
    label: 'AI Words',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
    ),
  },
  {
    id: 'play',
    label: 'Play',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
      </svg>
    ),
  },
  {
    id: 'export',
    label: 'Export',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
  },
  {
    id: 'help',
    label: 'How to Use',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
      </svg>
    ),
  },
];

export function TabBar({ activeTab, onTabChange, hasPuzzle }: TabBarProps) {
  return (
    <nav className="border-b border-line bg-page/90 backdrop-blur-sm transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Newspaper section nav: tracked caps, red-ink mark under the
            open section. Icons only stand in on phones. */}
        <div className="flex gap-0.5 sm:gap-4" role="tablist" aria-label="Application sections">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            const isDisabled = !hasPuzzle && (tab.id === 'play' || tab.id === 'export');

            return (
              <button
                key={tab.id}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => {
                  if (!isDisabled) onTabChange(tab.id);
                }}
                disabled={isDisabled}
                className={`
                  relative flex items-center gap-1.5 px-3 sm:px-1 py-3
                  text-xs font-semibold uppercase tracking-[0.08em]
                  transition-all duration-200 border-b-2 -mb-px
                  ${isActive
                    ? 'text-ink border-rubric'
                    : isDisabled
                      ? 'text-ink-3/50 border-transparent cursor-not-allowed'
                      : 'text-ink-3 border-transparent hover:text-ink-2 hover:border-line-2'
                  }
                  ${!isDisabled && !isActive ? 'active:scale-95' : ''}
                `}
                title={isDisabled ? 'Generate a puzzle first' : tab.label}
              >
                <span className="sm:hidden" aria-hidden="true">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

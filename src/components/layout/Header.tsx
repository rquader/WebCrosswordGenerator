/**
 * App header — distinctive branding, theme cycling (dark/light/sepia).
 */

import type { Theme } from '../../hooks/useTheme';

interface HeaderProps {
  theme: Theme;
  onCycleTheme: () => void;
}

const THEME_LABELS: Record<Theme, string> = {
  dark: 'Dark',
  light: 'Light',
  sepia: 'Sepia',
};

const THEME_NEXT: Record<Theme, string> = {
  dark: 'Switch to light mode',
  light: 'Switch to sepia mode',
  sepia: 'Switch to dark mode',
};

export function Header({ theme, onCycleTheme }: HeaderProps) {
  return (
    <header className="border-b border-stone-200/50 dark:border-stone-700/25 bg-white/85 dark:bg-surface-dark/85 backdrop-blur-md sticky top-0 z-50 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo + Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center relative overflow-hidden glow-teal">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-800" />
            <svg viewBox="0 0 36 36" className="relative z-10 w-5 h-5" fill="none">
              <rect x="2" y="2" width="10" height="10" rx="1.5" fill="white" fillOpacity="0.9" />
              <rect x="13" y="2" width="10" height="10" rx="1.5" fill="white" fillOpacity="0.4" />
              <rect x="24" y="2" width="10" height="10" rx="1.5" fill="white" fillOpacity="0.9" />
              <rect x="2" y="13" width="10" height="10" rx="1.5" fill="white" fillOpacity="0.4" />
              <rect x="13" y="13" width="10" height="10" rx="1.5" fill="white" fillOpacity="0.9" />
              <rect x="24" y="13" width="10" height="10" rx="1.5" fill="white" fillOpacity="0.4" />
              <rect x="2" y="24" width="10" height="10" rx="1.5" fill="white" fillOpacity="0.9" />
              <rect x="13" y="24" width="10" height="10" rx="1.5" fill="white" fillOpacity="0.4" />
              <rect x="24" y="24" width="10" height="10" rx="1.5" fill="white" fillOpacity="0.9" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-stone-900 dark:text-stone-100 leading-none">
              CrosswordGen
            </h1>
            <p className="text-[10px] tracking-widest uppercase text-stone-400 dark:text-stone-500 mt-0.5">
              Puzzle Studio
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2.5">
          {/* Privacy badge */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-500 bg-stone-50 dark:bg-stone-800/40 px-2.5 py-1.5 rounded-full border border-stone-200/50 dark:border-stone-700/30">
            <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
            <span>Offline-ready</span>
          </div>

          {/* Theme cycle button — shows current mode, click to cycle */}
          <button
            onClick={onCycleTheme}
            className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl
                       text-stone-500 dark:text-stone-400
                       hover:bg-stone-100 dark:hover:bg-surface-dark-hover
                       hover:text-stone-700 dark:hover:text-stone-300
                       active:scale-90 border border-stone-200/50 dark:border-stone-700/30
                       transition-all duration-200"
            aria-label={THEME_NEXT[theme]}
            title={THEME_NEXT[theme]}
          >
            <div className="transition-transform duration-300">
              {theme === 'dark' && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              )}
              {theme === 'light' && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              )}
              {theme === 'sepia' && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              )}
            </div>
            <span className="text-xs font-medium hidden sm:inline">{THEME_LABELS[theme]}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

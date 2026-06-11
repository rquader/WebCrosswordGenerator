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
        {/* Masthead — a tiny printed crossword as the mark, editorial wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center" aria-hidden="true">
            {/* 3x3 print-style crossword glyph: paper cells, one ink block, letter A */}
            <svg viewBox="0 0 36 36" className="w-9 h-9">
              <rect x="1.5" y="1.5" width="33" height="33" rx="3"
                className="fill-grid-cell dark:fill-grid-cell-dark stroke-stone-900 dark:stroke-stone-100"
                strokeWidth="2" />
              <line x1="12.5" y1="2.5" x2="12.5" y2="33.5" className="stroke-stone-900/30 dark:stroke-stone-900/40" strokeWidth="1" />
              <line x1="23.5" y1="2.5" x2="23.5" y2="33.5" className="stroke-stone-900/30 dark:stroke-stone-900/40" strokeWidth="1" />
              <line x1="2.5" y1="12.5" x2="33.5" y2="12.5" className="stroke-stone-900/30 dark:stroke-stone-900/40" strokeWidth="1" />
              <line x1="2.5" y1="23.5" x2="33.5" y2="23.5" className="stroke-stone-900/30 dark:stroke-stone-900/40" strokeWidth="1" />
              <rect x="23.5" y="2.5" width="10" height="10" className="fill-stone-900 dark:fill-grid-blocked-dark" />
              <rect x="2.5" y="23.5" width="10" height="10" className="fill-primary-600" />
              <text x="18" y="21.5" textAnchor="middle"
                className="fill-stone-900"
                fontSize="13" fontWeight="700"
                fontFamily="'Fraunces Variable', Georgia, serif">A</text>
            </svg>
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100 leading-none">
              Crossword Generator
            </h1>
            <p className="hidden sm:block text-[10px] tracking-[0.18em] uppercase text-stone-400 dark:text-stone-500 mt-1 leading-none">
              Make · Play · Print — all in your browser
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2.5">
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

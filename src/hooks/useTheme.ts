/**
 * Theme hook — manages light/dark/sepia mode with system preference detection.
 *
 * On first load, checks localStorage for a saved preference.
 * If none, falls back to the OS-level prefers-color-scheme.
 * Cycling saves the choice to localStorage for persistence.
 *
 * All data stays local — no external calls.
 */

import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'sepia';

const STORAGE_KEY = 'crossword-theme';

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'dark' || saved === 'light' || saved === 'sepia') {
    return saved;
  }
  return getSystemTheme();
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.remove('dark', 'sepia');
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'sepia') {
    root.classList.add('sepia');
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    function handleChange() {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        setTheme(mediaQuery.matches ? 'dark' : 'light');
      }
    }
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Cycle: dark -> light -> sepia -> dark
  function cycleTheme() {
    setTheme(current => {
      if (current === 'dark') return 'light';
      if (current === 'light') return 'sepia';
      return 'dark';
    });
  }

  return { theme, cycleTheme, isDark: theme === 'dark', isSepia: theme === 'sepia' };
}

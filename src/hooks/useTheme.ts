/**
 * Theme hook — manages dark/light mode with system preference detection.
 *
 * On first load, checks localStorage for a saved preference.
 * If none, falls back to the OS-level prefers-color-scheme.
 * Toggling saves the choice to localStorage for persistence.
 *
 * All data stays local — no external calls.
 */

import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'crossword-theme';

/**
 * Detect the user's OS-level color scheme preference.
 */
function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Read the saved theme from localStorage, or fall back to system preference.
 */
function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'dark' || saved === 'light') {
    return saved;
  }
  return getSystemTheme();
}

/**
 * Apply the theme class to the document root.
 */
function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  // Apply theme on mount and when it changes
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  // Listen for OS-level theme changes (only when no saved preference)
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

  function toggleTheme() {
    setTheme(current => current === 'dark' ? 'light' : 'dark');
  }

  return { theme, toggleTheme, isDark: theme === 'dark' };
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Custom palette — warm, distinctive, handcrafted feel
        // Primary: deep teal / emerald tones
        primary: {
          50:  '#f0fdf9',
          100: '#ccfbeb',
          200: '#9af5d6',
          300: '#5fe9bf',
          400: '#2dd4a3',
          500: '#14b88a',
          600: '#099470',
          700: '#0b775c',
          800: '#0e5e4a',
          900: '#104d3e',
          950: '#032c24',
        },
        // Accent: warm amber / gold
        accent: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        // Surface colors for dark/light mode
        surface: {
          light: '#fafaf9',
          DEFAULT: '#f5f5f4',
          dark: '#1c1c1e',
          'dark-alt': '#2c2c2e',
        },
        // Grid-specific colors
        grid: {
          cell: '#ffffff',
          'cell-dark': '#2a2a2e',
          blocked: '#1a1a1e',
          'blocked-dark': '#0a0a0e',
          highlight: '#d1fae5',
          'highlight-dark': '#064e3b',
          active: '#a7f3d0',
          'active-dark': '#065f46',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'grid': '2px',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'grid-cell': 'inset 0 0 0 1px rgb(0 0 0 / 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'cell-pop': 'cellPop 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        cellPop: {
          '0%': { transform: 'scale(0.95)' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};

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
        // Primary: deep teal — warm-shifted
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
          // Dark paired variant (ArabicDialectMap pattern)
          'd': '#0c3328',
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
          'd': '#38301c',
        },
        // Surface colors — warm tones, not clinical
        surface: {
          light: '#faf7f2',       // warm paper
          DEFAULT: '#f2ede6',
          dark: '#1c1a17',        // warm dark (ArabicDialectMap)
          'dark-alt': '#242220',  // elevated dark
          'dark-hover': '#2e2b28',
        },
        // Grid-specific colors — warm
        grid: {
          cell: '#ffffff',
          'cell-dark': '#282522',
          blocked: '#1a1815',
          'blocked-dark': '#0f0e0c',
          highlight: '#d1fae5',
          'highlight-dark': '#0c3328',
          active: '#a7f3d0',
          'active-dark': '#0e4a3a',
          border: '#d4cfc8',
          'border-dark': '#3a3730',
        },
        // Word search found-word palette (8 distinct colors)
        ws: {
          teal: '#7cc8a0',
          purple: '#b4a0e8',
          amber: '#d4aa60',
          coral: '#c87860',
          blue: '#68a8d8',
          rose: '#c88098',
          green: '#a0c870',
          cyan: '#60c0c0',
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
        'card': '0 1px 3px 0 rgba(30,25,18,0.06), 0 1px 2px -1px rgba(30,25,18,0.06)',
        'card-hover': '0 4px 12px -2px rgba(30,25,18,0.1), 0 2px 4px -2px rgba(30,25,18,0.06)',
        'card-dark': '0 1px 3px 0 rgba(0,0,0,0.2), 0 1px 2px -1px rgba(0,0,0,0.15)',
        'glow-teal': '0 0 0 2px rgba(9,148,112,0.3)',
        'glow-amber': '0 0 0 2px rgba(245,158,11,0.3)',
        'grid-cell': 'inset 0 0 0 1px rgba(30,25,18,0.12)',
        'lift': '0 4px 12px -2px rgba(30,25,18,0.12)',
        'lift-dark': '0 4px 12px -2px rgba(0,0,0,0.35)',
      },
      animation: {
        'fade-in': 'fadeIn 0.35s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'cell-pop': 'cellPop 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        'grid-reveal': 'gridReveal 0.4s cubic-bezier(0.4,0,0.2,1) both',
        'ripple': 'ripple 0.6s ease-out',
        'breathe': 'breathe 3.5s ease-in-out infinite',
        'tab-slide': 'tabSlide 0.25s ease-out',
        'word-found': 'wordFound 0.5s ease-out',
        'completion-pulse': 'completionPulse 0.8s ease-out',
        'completion-icon': 'completionIcon 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        'bounce-sm': 'bounceSm 0.15s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        'confetti-1': 'confetti1 1s ease-out forwards',
        'confetti-2': 'confetti2 1.1s ease-out forwards',
        'confetti-3': 'confetti3 0.9s ease-out forwards',
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
          '0%': { transform: 'scale(0.92)' },
          '50%': { transform: 'scale(1.04)' },
          '100%': { transform: 'scale(1)' },
        },
        gridReveal: {
          '0%': { opacity: '0', transform: 'scale(0.88)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '0.5' },
          '100%': { transform: 'scale(1)', opacity: '0' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(0)', opacity: '0.25' },
          '50%': { transform: 'scale(1)', opacity: '0' },
        },
        tabSlide: {
          '0%': { transform: 'translateX(var(--tab-from, 0))' },
          '100%': { transform: 'translateX(var(--tab-to, 0))' },
        },
        wordFound: {
          '0%': { filter: 'brightness(1.5)', transform: 'scale(1.02)' },
          '100%': { filter: 'brightness(1)', transform: 'scale(1)' },
        },
        completionPulse: {
          '0%': { boxShadow: '0 0 0 0 rgba(9,148,112,0.4)' },
          '70%': { boxShadow: '0 0 0 12px rgba(9,148,112,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(9,148,112,0)' },
        },
        bounceSm: {
          '0%': { transform: 'scale(1)' },
          '35%': { transform: 'scale(0.94)' },
          '100%': { transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        completionIcon: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        confetti1: {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(-60px) translateX(-20px) rotate(180deg)', opacity: '0' },
        },
        confetti2: {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(-50px) translateX(25px) rotate(-150deg)', opacity: '0' },
        },
        confetti3: {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(-45px) translateX(-10px) rotate(120deg)', opacity: '0' },
        },
      },
      transitionTimingFunction: {
        'bounce-out': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  // The sepia THEME class lives on <html>. Without this, Tailwind's JIT
  // also generates its `sepia` FILTER utility (filter: sepia(100%)) from
  // the same string — which silently yellow-filtered the entire app in
  // sepia mode. The filter utility is unused; the theme class wins.
  corePlugins: {
    sepia: false,
  },
  theme: {
    extend: {
      colors: {
        // Warm white — every bg-white card/input in the app picks this up.
        // Pure #ffffff reads clinical against the warm paper page; print
        // components are untouched (they use inline #fff on purpose).
        white: '#fdfbf7',

        /* ── Semantic theme tokens ─────────────────────────────────────
         * Each reads a CSS variable defined per theme in index.css
         * (:root = light, .dark, .sepia). Components use ONLY these for
         * surfaces, text, borders, and interactive color — switching a
         * theme means changing the variable table, not hunting classes.
         */
        page:  'rgb(var(--page) / <alpha-value>)',   // the desk/page behind everything
        card:  'rgb(var(--card) / <alpha-value>)',   // panels and cards
        well:  'rgb(var(--well) / <alpha-value>)',   // inset areas, hovers, table stripes
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',   // primary text
          2: 'rgb(var(--ink-2) / <alpha-value>)',       // secondary text
          3: 'rgb(var(--ink-3) / <alpha-value>)',       // captions, hints
        },
        line: {
          DEFAULT: 'rgb(var(--line) / <alpha-value>)',  // hairline borders
          2: 'rgb(var(--line-2) / <alpha-value>)',      // strong borders
        },
        // THE interactive color. Light: oxblood (editorial masthead red).
        // Dark: luminous ember. Sepia: stamped brown-black ink.
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          2: 'rgb(var(--accent-2) / <alpha-value>)',      // hover / pressed
          ink: 'rgb(var(--accent-ink) / <alpha-value>)',  // text on accent fills
        },
        // Small editorial marks: step numerals, active ticks, focus rings.
        rubric: 'rgb(var(--rubric) / <alpha-value>)',

        // Primary: warm indigo / slate-blue (legacy — components migrate
        // to the semantic tokens above; grid washes keep their own tokens)
        primary: {
          50:  '#f0f1fe',
          100: '#dde0fc',
          200: '#c3c7fa',
          300: '#9ba2f5',
          400: '#7078ee',
          500: '#5258e4',
          600: '#4340d6',
          700: '#3934b8',
          800: '#302d95',
          900: '#2b2a76',
          950: '#1a1945',
          'd': '#1e1d3d',
        },
        // Copper / terra cotta — warm secondary marks (was `accent`)
        copper: {
          50:  '#fdf5ef',
          100: '#fae8d8',
          200: '#f4cdb0',
          300: '#ecab7e',
          400: '#e2824a',
          500: '#da6628',
          600: '#cc4f1e',
          700: '#a93b1b',
          800: '#87311d',
          900: '#6e2a1b',
          950: '#3b130c',
          'd': '#3a1f14',
        },
        // Surface colors — warm tones, not clinical
        surface: {
          light: '#faf8f5',       // warm paper
          DEFAULT: '#f2ede6',
          dark: '#1c1a17',        // warm dark (ArabicDialectMap)
          'dark-alt': '#242220',  // elevated dark
          'dark-hover': '#2e2b28',
          // Sepia mode
          sepia: '#f4ead5',       // warm parchment
          'sepia-alt': '#ebe0c9', // elevated sepia
          'sepia-hover': '#e2d6bb',
        },
        // Grid-specific colors — the grid is styled like PRINT in every theme.
        // Dark mode uses the "lit paper" treatment: cream cells with ink
        // letters, like a paper puzzle under a desk lamp on a dark desk.
        grid: {
          cell: '#fffdf8',          // paper white (light)
          'cell-dark': '#ece5d4',   // lit paper (dark mode cells stay light!)
          ink: '#221c15',           // letter/number ink on paper cells
          blocked: '#26201a',       // ink block (light)
          'blocked-dark': '#0c0a08',// near-black block (dark)
          highlight: '#e3e4fb',     // selection wash (light)
          'highlight-dark': '#d6d8f6', // selection wash on cream (dark)
          active: '#c3c7fa',        // focused cell (light)
          'active-dark': '#b9bef4', // focused cell on cream (dark)
          border: '#cfc8bb',        // hairlines (light)
          'border-dark': '#8d8270', // hairlines between lit cells (dark)
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
        sans: ['"Plus Jakarta Sans Variable"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
        // Editorial serif — masthead, headings, big moments only
        display: ['"Fraunces Variable"', 'Georgia', 'serif'],
      },
      /* The deliberate type scale — five named steps. Pair `text-title`
       * and up with `font-display` (Fraunces); the rest are Jakarta. */
      fontSize: {
        overline: ['0.6875rem', { lineHeight: '1.2', letterSpacing: '0.09em', fontWeight: '600' }],
        meta:     ['0.75rem',   { lineHeight: '1.45' }],
        body:     ['0.875rem',  { lineHeight: '1.55' }],
        lede:     ['1rem',      { lineHeight: '1.5' }],
        title:    ['1.1875rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
        masthead: ['1.375rem',  { lineHeight: '1.2', letterSpacing: '-0.015em', fontWeight: '650' }],
      },
      borderRadius: {
        'grid': '2px',
        // Editorial shapes: slightly squared, never pills
        'btn': '6px',
        'field': '6px',
        'card': '10px',
      },
      boxShadow: {
        // Theme-aware shadows (CSS vars set per theme in index.css):
        // warm gray on cream, true black at night, brown on parchment.
        'paper': 'var(--shadow-paper)',   // resting cards
        'raise': 'var(--shadow-raise)',   // hover lift
        'float': 'var(--shadow-float)',   // the grid page floating on the desk
        'card': '0 1px 3px 0 rgba(30,25,18,0.06), 0 1px 2px -1px rgba(30,25,18,0.06)',
        'card-hover': '0 4px 12px -2px rgba(30,25,18,0.1), 0 2px 4px -2px rgba(30,25,18,0.06)',
        'card-dark': '0 1px 3px 0 rgba(0,0,0,0.2), 0 1px 2px -1px rgba(0,0,0,0.15)',
        'glow-teal': '0 0 0 2px rgba(82,88,228,0.3)',
        'glow-amber': '0 0 0 2px rgba(245,158,11,0.3)',
        'grid-cell': 'inset 0 0 0 1px rgba(30,25,18,0.12)',
        'lift': '0 4px 12px -2px rgba(30,25,18,0.12)',
        'lift-dark': '0 4px 12px -2px rgba(0,0,0,0.35)',
        // The grid floats like a printed page on the desk
        'page': '0 1px 2px rgba(30,25,18,0.08), 0 12px 40px -12px rgba(30,25,18,0.25)',
        'page-dark': '0 1px 2px rgba(0,0,0,0.4), 0 16px 50px -12px rgba(0,0,0,0.6), 0 0 60px -20px rgba(82,88,228,0.12)',
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
        'cell-shake': 'cellShake 0.3s ease-out',
        'timer-blink': 'timerBlink 1s step-end infinite',
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
          '0%': { boxShadow: '0 0 0 0 rgba(82,88,228,0.4)' },
          '70%': { boxShadow: '0 0 0 12px rgba(82,88,228,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(82,88,228,0)' },
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
        cellShake: {
          '0%':   { transform: 'translateX(0)' },
          '15%':  { transform: 'translateX(-4px)' },
          '30%':  { transform: 'translateX(4px)' },
          '45%':  { transform: 'translateX(-4px)' },
          '60%':  { transform: 'translateX(4px)' },
          '80%':  { transform: 'translateX(-2px)' },
          '100%': { transform: 'translateX(0)' },
        },
        timerBlink: {
          '0%':   { opacity: '1' },
          '50%':  { opacity: '0' },
          '100%': { opacity: '1' },
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

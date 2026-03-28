/**
 * Interactive Help & Instructions page.
 *
 * This is NOT a wall of text. It's a visual, interactive guide:
 * - Step-by-step sections with icons and visual examples
 * - Interactive demo elements (mini grid, sample file formats)
 * - Collapsible sections for advanced features
 * - Visual file format guides with copy-to-clipboard
 *
 * Designed to feel like a mini onboarding experience.
 */

import { useState } from 'react';

export function HelpTab() {
  return (
    <div className="animate-fade-in max-w-3xl mx-auto space-y-8 pb-12">
      {/* Hero */}
      <div className="text-center py-6">
        <div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-950/40 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2">
          How to Use
        </h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm max-w-md mx-auto">
          Everything you need to create, play, and export crossword puzzles.
          No account needed — everything runs in your browser.
        </p>
      </div>

      {/* Quick Start Steps */}
      <section>
        <SectionTitle number={1} title="Generate a Puzzle" />
        <div className="ml-10 space-y-4">
          <StepCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
            }
            title="Choose your settings"
            description="Set grid width and height (2-10), pick a puzzle type (Crossword or Word Search), and select a category from the built-in presets."
          />
          <StepCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
            }
            title="Set a seed (optional)"
            description="Seeds make puzzles reproducible — the same seed + settings will always generate the same puzzle. Leave it blank for a random one."
          />
          <StepCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            }
            title="Hit Generate"
            description="Your puzzle appears instantly. The grid shows numbered cells — each number starts an Across or Down word."
          />
        </div>
      </section>

      {/* Playing */}
      <section>
        <SectionTitle number={2} title="Play the Puzzle" />
        <div className="ml-10 space-y-4">
          {/* Interactive keyboard guide */}
          <div className="bg-white dark:bg-surface-dark-alt rounded-xl border border-stone-200 dark:border-stone-700/50 p-5">
            <h4 className="text-sm font-semibold text-stone-800 dark:text-stone-200 mb-3">Keyboard Controls</h4>
            <div className="grid grid-cols-2 gap-3">
              <KeyboardHint keys={['A', '-', 'Z']} label="Type a letter into the selected cell" />
              <KeyboardHint keys={['Backspace']} label="Delete letter and move back" />
              <KeyboardHint keys={['\u2190', '\u2191', '\u2193', '\u2192']} label="Navigate between cells" />
              <KeyboardHint keys={['Click']} label="Click a cell to select; click again to toggle Across/Down" />
            </div>
          </div>

          <StepCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="Check & Reveal"
            description="Click 'Check' to see which letters are correct (green) or incorrect (red). Click 'Reveal' to show all answers. Click 'Reset' to start over."
          />
        </div>
      </section>

      {/* Custom Words */}
      <section>
        <SectionTitle number={3} title="Use Your Own Words" />
        <div className="ml-10 space-y-4">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Switch to <strong>Custom</strong> mode in the Generate tab to use your own words. You can type them directly or upload a file.
          </p>

          {/* File format examples */}
          <FileFormatGuide />
        </div>
      </section>

      {/* Export */}
      <section>
        <SectionTitle number={4} title="Export & Share" />
        <div className="ml-10 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ExportCard
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                </svg>
              }
              title="Print / PDF"
              description="Opens your browser's print dialog. Choose 'Save as PDF' for a PDF file. Clean, ink-friendly layout."
            />
            <ExportCard
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
              }
              title="PNG Image"
              description="Downloads a clean image of the grid. Great for sharing or embedding in documents."
            />
            <ExportCard
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                </svg>
              }
              title="JSON Data"
              description="Full puzzle data in JSON format. Can be re-imported or used with other tools."
            />
            <ExportCard
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
              }
              title="Answer Key"
              description="PNG image with all answers filled in. Print separately for teachers or puzzle setters."
            />
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section>
        <SectionTitle number={5} title="Privacy" />
        <div className="ml-10">
          <div className="bg-primary-50 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-800/30 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-primary-800 dark:text-primary-300 mb-1">
                  100% Local Processing
                </h4>
                <ul className="text-sm text-primary-700 dark:text-primary-400 space-y-1">
                  <li>All puzzle generation happens in your browser</li>
                  <li>File uploads are read locally — never sent to any server</li>
                  <li>No analytics, no tracking, no cookies (except theme preference)</li>
                  <li>No external API calls, no third-party scripts</li>
                  <li>Even the font is self-hosted — zero requests to Google or anyone else</li>
                  <li>Works offline once the page loads</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// --- Sub-components ---

function SectionTitle({ number, title }: { number: number; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-full bg-primary-600 dark:bg-primary-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
        {number}
      </div>
      <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">{title}</h2>
    </div>
  );
}

function StepCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex gap-3 bg-white dark:bg-surface-dark-alt rounded-xl border border-stone-200 dark:border-stone-700/50 p-4">
      <div className="text-primary-500 flex-shrink-0 mt-0.5">{icon}</div>
      <div>
        <h4 className="text-sm font-semibold text-stone-800 dark:text-stone-200 mb-1">{title}</h4>
        <p className="text-sm text-stone-500 dark:text-stone-400">{description}</p>
      </div>
    </div>
  );
}

function ExportCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex gap-3 bg-white dark:bg-surface-dark-alt rounded-xl border border-stone-200 dark:border-stone-700/50 p-4">
      <div className="text-stone-400 dark:text-stone-500 flex-shrink-0">{icon}</div>
      <div>
        <h4 className="text-sm font-medium text-stone-700 dark:text-stone-300">{title}</h4>
        <p className="text-xs text-stone-400 dark:text-stone-500">{description}</p>
      </div>
    </div>
  );
}

function KeyboardHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {keys.map((key, i) => (
          <kbd
            key={i}
            className="inline-flex items-center justify-center min-w-[28px] h-7 px-1.5
                       bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-600
                       rounded text-xs font-mono font-medium text-stone-700 dark:text-stone-300
                       shadow-sm"
          >
            {key}
          </kbd>
        ))}
      </div>
      <span className="text-xs text-stone-500 dark:text-stone-400">{label}</span>
    </div>
  );
}

/**
 * Interactive file format guide with tabs and copy-to-clipboard.
 */
function FileFormatGuide() {
  const [activeFormat, setActiveFormat] = useState<'txt' | 'csv' | 'json'>('txt');

  const formats = {
    txt: {
      label: '.txt',
      example: `java: A programming language
array - A collection of elements
loop, Repeating code block
method | A function in a class

# Lines starting with # are ignored`,
      description: 'One word-clue pair per line. Supports : or - or , or | as separator.',
    },
    csv: {
      label: '.csv',
      example: `word,clue
java,A programming language
array,A collection of elements
loop,Repeating code block
method,A function in a class`,
      description: 'Standard CSV format. First row can be a header (it will be detected and skipped).',
    },
    json: {
      label: '.json',
      example: `[
  { "word": "java", "clue": "A programming language" },
  { "word": "array", "clue": "A collection of elements" },
  { "word": "loop", "clue": "Repeating code block" },
  { "word": "method", "clue": "A function in a class" }
]`,
      description: 'Array of objects. Accepts "word"/"term"/"answer" for the word field and "clue"/"hint"/"definition" for the clue.',
    },
  };

  const current = formats[activeFormat];

  function handleCopy() {
    navigator.clipboard.writeText(current.example);
  }

  return (
    <div className="bg-white dark:bg-surface-dark-alt rounded-xl border border-stone-200 dark:border-stone-700/50 overflow-hidden">
      <div className="px-4 pt-4 pb-3">
        <h4 className="text-sm font-semibold text-stone-800 dark:text-stone-200 mb-3">Supported File Formats</h4>

        {/* Format tabs */}
        <div className="flex gap-1 bg-stone-100 dark:bg-stone-800 rounded-lg p-1 mb-3">
          {(['txt', 'csv', 'json'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setActiveFormat(fmt)}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all
                ${activeFormat === fmt
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-500 dark:text-stone-400'
                }`}
            >
              {formats[fmt].label}
            </button>
          ))}
        </div>

        <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">{current.description}</p>
      </div>

      {/* Code example with copy button */}
      <div className="relative bg-stone-50 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-700/50">
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1.5 rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-300
                     hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
          title="Copy to clipboard"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
          </svg>
        </button>
        <pre className="px-4 py-3 text-xs font-mono text-stone-700 dark:text-stone-300 overflow-x-auto whitespace-pre">
          {current.example}
        </pre>
      </div>

      {/* Drag and drop hint */}
      <div className="px-4 py-3 bg-stone-50/50 dark:bg-stone-900/50 border-t border-stone-200 dark:border-stone-700/50">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <span className="text-xs text-stone-500 dark:text-stone-400">
            Drag and drop a file onto the upload area, or click to browse
          </span>
        </div>
      </div>
    </div>
  );
}

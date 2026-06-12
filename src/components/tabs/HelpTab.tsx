/**
 * How to Use — an editorial instruction leaflet, not SaaS docs.
 *
 * Content mirrors the REAL flow (words → generate → solve/print, with the
 * skeleton fill and AI Words as side paths). If a flow changes, this page
 * changes with it — it is part of the product, not an afterthought.
 */

import { useState } from 'react';

export function HelpTab() {
  return (
    <div className="animate-fade-in max-w-2xl mx-auto pb-12">
      <header className="pt-2 pb-8">
        <h1 className="view-title">How it works</h1>
        <p className="mt-2 text-sm text-ink-2 leading-relaxed max-w-lg">
          Words in, puzzle out. Type a vocabulary list, generate a crossword or a word
          search, then solve it on screen or print a classroom packet — all of it right
          here in your browser.
        </p>
      </header>

      <div className="space-y-10">
        <HelpSection number={1} title="Add your words">
          <p>
            Everything starts in <UiName>Generate</UiName>. Type words and clues straight
            into the table, or bring a list with you: paste text, upload a file, or load
            one of the built-in word packs. Every word you add is guaranteed a place in
            the finished puzzle.
          </p>
          <p>
            Crosswords want a clue for each word. Word searches don&rsquo;t — there the
            word bank itself is the puzzle, so clues are optional.
          </p>
          <p>
            No list yet? The <UiName>AI Words</UiName> tab builds one with whatever AI
            assistant you already use — more on that below.
          </p>
          <FileFormatGuide />
        </HelpSection>

        <HelpSection number={2} title="Generate">
          <p>
            Press <UiName>Generate puzzle</UiName> and you&rsquo;re done: the grid sizes
            itself to your words and quietly grows if something needs more room, so the
            default path has no decisions in it. A live miniature on the right shows the
            layout your words will get while you&rsquo;re still typing.
          </p>
          <p>
            Need the grid to be an exact size — say, to match a worksheet? Check{' '}
            <UiName>Force dimensions</UiName> in Grid Setup. The grid pins to your size,
            and anything that can&rsquo;t fit is reported honestly, with a one-click
            &ldquo;regenerate larger&rdquo; fix.
          </p>
          <p>
            With a pinned grid (or an empty word list) you may get{' '}
            <em className="text-ink">blank slots</em> to fill by hand. The fill workspace
            shows each slot&rsquo;s crossing letters live, suggests words that fit,
            can auto-fill every blank, and writes a ready-to-paste AI prompt for the
            stubborn ones.
          </p>
          <p className="text-ink-3 text-xs">
            The seed in Grid Setup makes puzzles repeatable — the same words, settings,
            and seed always produce the same grid.
          </p>
        </HelpSection>

        <HelpSection number={3} title="Solve on screen">
          <p>
            The <UiName>Play</UiName> tab is a real solving desk: a timer, progress,
            and the tools along the top — <UiName>Hint</UiName> reveals the selected
            cell (and costs 15 seconds), <UiName>Check</UiName> marks what&rsquo;s right
            and wrong, <UiName>Reveal</UiName> gives up gracefully. Your progress saves
            automatically.
          </p>
          <div className="warm-card p-4">
            <h4 className="sub-label mb-3">Keyboard</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
              <KeyboardHint keys={['A', '–', 'Z']} label="Type into the selected cell" />
              <KeyboardHint keys={['Space']} label="Switch between Across and Down" />
              <KeyboardHint keys={['←', '↑', '↓', '→']} label="Move around the grid" />
              <KeyboardHint keys={['Backspace']} label="Delete and step back" />
              <KeyboardHint keys={['Ctrl', 'Z']} label="Undo (add Shift to redo)" />
              <KeyboardHint keys={['Esc']} label="Deselect" />
            </div>
            <p className="mt-3 text-xs text-ink-3">
              Clicking a cell twice also flips the typing direction.
            </p>
          </div>
          <p>
            In a word search, click the first and last letter of a word to mark it —
            found words get circled in marker colors, just like the printed answer key.
          </p>
        </HelpSection>

        <HelpSection number={4} title="Print, export, share">
          <p>
            <UiName>Export</UiName> is built around the print packet: a student page
            (with clues or a word bank) plus a circled answer key, laid out for US
            Letter. Print it from the browser or save it as a PDF — same layout either
            way. Ink saver keeps blocked squares light gray for shared school printers.
          </p>
          <p>
            You can also download the grid as a PNG for docs and slides, save the
            puzzle as a JSON file another teacher can import, or copy a{' '}
            <em className="text-ink">solve link</em> — the entire puzzle travels inside
            the link itself and opens ready to play.
          </p>
        </HelpSection>

        <HelpSection number={5} title="AI words, no account">
          <p>
            The <UiName>AI Words</UiName> tab writes a precise, ready-to-paste request
            for ChatGPT, Gemini, Claude — any assistant you already use. Describe a
            topic (or paste a unit plan), copy the prompt, get the AI&rsquo;s reply, and
            paste it back. New words merge into your list; anything unreadable is
            flagged line by line instead of silently dropped.
          </p>
          <p className="text-ink-3 text-xs">
            The clipboard is the only transport — this app never contacts an AI service.
          </p>
        </HelpSection>

        <HelpSection number={6} title="Private by design">
          <p>
            There is no server. Generation, solving, printing, and every import happen
            inside your browser; your word lists, files, and puzzles never leave this
            page. No analytics, no tracking, fonts bundled with the app — and once
            loaded, it works offline. Even solve links keep the puzzle in the part of
            the URL that browsers never send anywhere.
          </p>
          <p className="text-ink-3 text-xs">
            One more comfort: the button in the top corner switches between dark, light,
            and sepia — the puzzle stays printed-paper crisp in all three.
          </p>
        </HelpSection>
      </div>
    </div>
  );
}

/* ── Building blocks ─────────────────────────────────────────────────── */

/** Numbered section with a rubric numeral and a hairline — a leaflet heading. */
function HelpSection({ number, title, children }: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline gap-2.5 border-b border-line pb-2 mb-4">
        <span className="font-display text-xl leading-none text-rubric" aria-hidden="true">
          {number}
        </span>
        <h2 className="card-title">{title}</h2>
      </div>
      <div className="space-y-3 text-sm text-ink-2 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

/** An interface name set apart from prose — quiet, not a pill. */
function UiName({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-ink">{children}</strong>;
}

function KeyboardHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1 flex-shrink-0">
        {keys.map((key, i) => (
          <kbd
            key={i}
            className="inline-flex items-center justify-center min-w-[26px] h-6 px-1.5
                       bg-well border border-line-2 rounded
                       text-xs font-mono font-medium text-ink"
          >
            {key}
          </kbd>
        ))}
      </div>
      <span className="text-xs text-ink-2">{label}</span>
    </div>
  );
}

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
      description: 'One word–clue pair per line, separated by : or - or , or |.',
    },
    csv: {
      label: '.csv',
      example: `word,clue
java,A programming language
array,A collection of elements
loop,Repeating code block
method,A function in a class`,
      description: 'Standard CSV. A header row is detected and skipped automatically.',
    },
    json: {
      label: '.json',
      example: `[
  { "word": "java", "clue": "A programming language" },
  { "word": "array", "clue": "A collection of elements" },
  { "word": "loop", "clue": "Repeating code block" }
]`,
      description: 'An array of objects. Accepts "word"/"term"/"answer" and "clue"/"hint"/"definition".',
    },
  };

  const current = formats[activeFormat];

  function handleCopy() {
    navigator.clipboard.writeText(current.example);
  }

  return (
    <div className="warm-card overflow-hidden">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h4 className="sub-label">Files that import cleanly</h4>
          <div className="flex gap-1 bg-well rounded-btn p-0.5">
            {(['txt', 'csv', 'json'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setActiveFormat(fmt)}
                className={`px-2.5 py-1 rounded-[5px] text-xs font-medium transition-all
                  ${activeFormat === fmt
                    ? 'bg-card text-ink shadow-sm'
                    : 'text-ink-2 hover:text-ink'
                  }`}
              >
                {formats[fmt].label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-ink-2">{current.description}</p>
      </div>

      <div className="relative bg-well/70 border-t border-line/50">
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1.5 rounded-btn text-ink-3 hover:text-ink
                     hover:bg-well transition-colors"
          title="Copy example"
          aria-label="Copy example"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
          </svg>
        </button>
        <pre className="px-4 py-3 text-xs font-mono text-ink overflow-x-auto whitespace-pre">
          {current.example}
        </pre>
      </div>
    </div>
  );
}

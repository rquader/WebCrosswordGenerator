/**
 * AI Words tab — get a word list from any AI assistant, copy-paste style.
 *
 * Three linear steps:
 *   1. Describe the topic, pick how many words → Copy Prompt
 *   2. Paste the prompt into any AI (ChatGPT, Gemini, Claude, ...)
 *   3. Paste the AI's response back → words merge into the Generate tab
 *
 * No API, no account, no network calls — the clipboard is the transport.
 * The word list lives in the Generate tab's wizard state (localStorage);
 * tabs unmount on switch, so writing through saveWizardState is enough
 * for Generate to pick the merged list up on its next mount.
 */

import { useMemo, useState } from 'react';
import { buildWordListPrompt, parseWordListResponse, type ParseIssue } from '../../utils/wordListPrompt';
import { loadWizardState, saveWizardState } from '../sources/wizardState';
import { getGenerationEntriesFromRows, createEntryRowsFromEntries, hasMeaningfulRows } from '../entries/entryTable';
import { recommendGridSize, recommendWordSearchGridSize } from '../../logic/gridRecommendation';
import { toGridWord } from '../../logic/language';
import type { EntryValidationOptions } from '../entries/entryTable';
import type { GenerationSettings } from '../settings/generationSettings';

/** Language, two-word option, and clue policy for a settings snapshot. */
function rulesFromSettings(settings: GenerationSettings): EntryValidationOptions {
  return {
    language: settings.language,
    allowTwoWords: settings.allowTwoWords,
    requireClue: settings.puzzleMode === 'crossword',
  };
}

const DRAFT_STORAGE_KEY = 'crossword-ai-builder-draft';
const MIN_WORDS = 1;
const MAX_WORDS = 40;

interface BuilderDraft {
  context: string;
  wordCount: number;
  includeExisting: boolean;
}

function loadDraft(): BuilderDraft {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BuilderDraft>;
      return {
        context: typeof parsed.context === 'string' ? parsed.context : '',
        wordCount: typeof parsed.wordCount === 'number'
          ? Math.min(MAX_WORDS, Math.max(MIN_WORDS, Math.round(parsed.wordCount)))
          : 12,
        includeExisting: typeof parsed.includeExisting === 'boolean' ? parsed.includeExisting : true,
      };
    }
  } catch {
    // fall through to defaults
  }
  return { context: '', wordCount: 12, includeExisting: true };
}

function saveDraft(draft: BuilderDraft): void {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // silently fail (private mode etc.)
  }
}

interface ImportOutcome {
  added: number;
  duplicatesSkipped: number;
  issues: ParseIssue[];
  /** True when parsing produced neither entries nor issues (nothing recognizable). */
  nothingFound: boolean;
}

interface AiBuilderTabProps {
  /** Jump to the Generate tab (shown after a successful import). */
  onGoToGenerate: () => void;
}

export function AiBuilderTab({ onGoToGenerate }: AiBuilderTabProps) {
  const [draft, setDraft] = useState<BuilderDraft>(() => loadDraft());
  const [response, setResponse] = useState('');
  const [copied, setCopied] = useState(false);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);

  // Wizard state is read fresh per mount — Generate writes it on unmount,
  // and this tab can't be open at the same time as Generate.
  const [wizardSnapshot] = useState(() => loadWizardState());

  const existingWords = useMemo(
    () => getGenerationEntriesFromRows(wizardSnapshot.table.rows, rulesFromSettings(wizardSnapshot.settings)).map(e => e.word),
    [wizardSnapshot],
  );

  // Grid dimensions mirror what Generate would use: the recommendation
  // while auto-sizing is on (and words exist), the manual size otherwise.
  const { gridWidth, gridHeight } = useMemo(() => {
    const settings = wizardSnapshot.settings;
    if (settings.autoGridSize && existingWords.length > 0) {
      const lengths = existingWords.map(w => toGridWord(w).length);
      const rec = settings.puzzleMode === 'crossword'
        ? recommendGridSize(lengths)
        : recommendWordSearchGridSize(lengths);
      if (rec.minDimension > 0) {
        return { gridWidth: rec.width, gridHeight: rec.height };
      }
    }
    return { gridWidth: settings.width, gridHeight: settings.height };
  }, [wizardSnapshot, existingWords]);

  const prompt = useMemo(() => buildWordListPrompt({
    context: draft.context,
    wordCount: draft.wordCount,
    existingWords: draft.includeExisting ? existingWords : [],
    gridWidth,
    gridHeight,
    puzzleMode: wizardSnapshot.settings.puzzleMode,
    language: wizardSnapshot.settings.language,
    allowTwoWords: wizardSnapshot.settings.allowTwoWords,
  }), [draft, existingWords, gridWidth, gridHeight, wizardSnapshot]);

  function patchDraft(next: Partial<BuilderDraft>) {
    setDraft(prev => {
      const merged = { ...prev, ...next };
      saveDraft(merged);
      return merged;
    });
  }

  function handleCopyPrompt() {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleImport() {
    // Re-read at import time: cheap, and guards against multiple imports
    // in one visit (each import writes new state).
    const wizard = loadWizardState();
    const rules = rulesFromSettings(wizard.settings);
    const currentWords = getGenerationEntriesFromRows(wizard.table.rows, rules).map(e => e.word);

    const parsed = parseWordListResponse(response, currentWords, {
      language: rules.language,
      allowTwoWords: rules.allowTwoWords,
      // Word search prompts ask for bare words — parse them that way.
      wordsOnly: wizard.settings.puzzleMode === 'wordsearch',
    });

    if (parsed.entries.length > 0) {
      const imported = createEntryRowsFromEntries(parsed.entries, rules);
      const keepExisting = hasMeaningfulRows(wizard.table.rows, rules);
      saveWizardState({
        ...wizard,
        table: {
          ...wizard.table,
          // Merge, never replace — only an empty placeholder table is swapped out.
          rows: keepExisting ? [...wizard.table.rows, ...imported] : imported,
        },
      });
      setResponse(''); // clear so the user can paste the next batch
    }

    setOutcome({
      added: parsed.entries.length,
      duplicatesSkipped: parsed.duplicatesSkipped.length,
      issues: parsed.issues,
      nothingFound: parsed.entries.length === 0 && parsed.issues.length === 0,
    });
  }

  const wordCountLabel = existingWords.length === 1 ? '1 word' : `${existingWords.length} words`;

  return (
    <div className="animate-fade-in max-w-2xl mx-auto space-y-4">
      {/* Heading */}
      <div className="pt-2 pb-1">
        <h2 className="view-title">
          Get words from any AI
        </h2>
        <p className="mt-1 text-sm text-ink-2 leading-relaxed">
          Build a ready-to-paste request, drop it into ChatGPT, Gemini, Claude — any AI you
          already use — and import its answer straight into your word list. Nothing leaves
          your browser except what you copy yourself.
        </p>
      </div>

      {/* ── Step 1: Set up the request ── */}
      <section className="warm-card p-5 space-y-4">
        <StepHeader number={1} title="Set up your request" />

        <div>
          <label htmlFor="ai-context" className="block text-sm font-medium text-ink-2 mb-1.5">
            What should the words be about?
          </label>
          <textarea
            id="ai-context"
            value={draft.context}
            onChange={e => patchDraft({ context: e.target.value })}
            rows={5}
            placeholder={'Anything works here — a topic ("the water cycle"), a unit plan, a textbook excerpt, a list of subtopics. Paste as much or as little as you like.'}
            className="field leading-relaxed focus:outline-none resize-y"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Word count stepper */}
          <div>
            <span className="block text-sm font-medium text-ink-2 mb-1.5">
              New words to ask for
            </span>
            <div className="inline-flex items-center rounded-lg border border-line-2 overflow-hidden">
              <button
                onClick={() => patchDraft({ wordCount: Math.max(MIN_WORDS, draft.wordCount - 1) })}
                className="px-3 py-1.5 text-ink-2 hover:bg-well transition-colors"
                aria-label="Fewer words"
              >
                &minus;
              </button>
              <span className="px-3 py-1.5 text-sm font-mono font-semibold text-ink min-w-[3ch] text-center border-x border-line">
                {draft.wordCount}
              </span>
              <button
                onClick={() => patchDraft({ wordCount: Math.min(MAX_WORDS, draft.wordCount + 1) })}
                className="px-3 py-1.5 text-ink-2 hover:bg-well transition-colors"
                aria-label="More words"
              >
                +
              </button>
            </div>
          </div>

          {/* Include current words */}
          <label className={`flex items-start gap-2 sm:pt-6 ${existingWords.length > 0 ? 'cursor-pointer' : 'opacity-50'}`}>
            <input
              type="checkbox"
              checked={draft.includeExisting && existingWords.length > 0}
              disabled={existingWords.length === 0}
              onChange={e => patchDraft({ includeExisting: e.target.checked })}
              className="mt-0.5 w-4 h-4"
            />
            <span>
              <span className="block text-sm text-ink-2">
                Include my current words ({wordCountLabel})
              </span>
              <span className="block text-xs text-ink-3 mt-0.5">
                Helps the AI avoid repeats and suggest words that fit together.
              </span>
            </span>
          </label>
        </div>

        {/* Collapsible prompt preview */}
        <details className="group rounded-lg border border-line/60">
          <summary className="px-3 py-2 text-xs font-medium text-ink-2 cursor-pointer select-none hover:text-ink transition-colors">
            Preview the exact prompt
          </summary>
          <pre className="px-3 pb-3 pt-1 text-[11px] leading-relaxed text-ink-2 whitespace-pre-wrap break-words max-h-72 overflow-y-auto scrollbar-thin font-mono">
            {prompt}
          </pre>
        </details>

        <div>
          <button
            onClick={handleCopyPrompt}
            className="btn-primary btn-lg w-full sm:w-auto font-semibold"
          >
            {copied ? 'Copied ✓' : 'Copy Prompt'}
          </button>
          {copied && (
            <p className="mt-2 text-sm text-rubric animate-fade-in">
              Now paste it into ChatGPT, Gemini, Claude, or any AI &rarr;
            </p>
          )}
        </div>
      </section>

      {/* ── Step 2: The bridge ── */}
      <section className="rounded-2xl border border-dashed border-line-2/60 px-5 py-4">
        <StepHeader number={2} title="Ask the AI" muted />
        <p className="mt-1.5 text-sm text-ink-2 leading-relaxed">
          Open the AI assistant you normally use, paste the prompt, and send it.
          When it answers with a list of words, copy the whole reply and come back here.
        </p>
      </section>

      {/* ── Step 3: Import ── */}
      <section className="warm-card p-5 space-y-4">
        <StepHeader number={3} title="Import the response" />

        <textarea
          value={response}
          onChange={e => { setResponse(e.target.value); setOutcome(null); }}
          rows={6}
          placeholder="Paste the AI's response here — the whole reply is fine."
          aria-label="AI response to import"
          className="field leading-relaxed font-mono placeholder:font-sans focus:outline-none resize-y"
        />

        <button
          onClick={handleImport}
          disabled={response.trim().length === 0}
          className="btn-primary btn-lg w-full sm:w-auto font-semibold"
        >
          Import Words
        </button>

        {/* Outcome */}
        {outcome && (
          <div className="space-y-2 animate-fade-in">
            {outcome.added > 0 && (
              <div className="rounded-md border border-line border-l-2 border-l-rubric bg-well px-3 py-2.5">
                <p className="text-sm font-medium text-ink">
                  {outcome.added} {outcome.added === 1 ? 'word' : 'words'} added to your list
                  {outcome.duplicatesSkipped > 0 && (
                    <span className="font-normal text-ink-3">
                      {' '}&middot; {outcome.duplicatesSkipped} duplicate{outcome.duplicatesSkipped !== 1 ? 's' : ''} skipped
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-ink-2">
                  Copy the prompt again for more words, or{' '}
                  <button
                    onClick={onGoToGenerate}
                    className="text-rubric underline underline-offset-2 font-medium transition-colors"
                  >
                    open Generate
                  </button>{' '}
                  to build your puzzle.
                </p>
              </div>
            )}

            {outcome.nothingFound && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2.5">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  No words found in that text. Make sure you pasted the AI's reply —
                  it should contain {wizardSnapshot.settings.puzzleMode === 'wordsearch'
                    ? <>one word per line</>
                    : <>lines like <span className="font-mono">WORD | Clue</span></>}.
                </p>
              </div>
            )}

            {outcome.added === 0 && outcome.duplicatesSkipped > 0 && !outcome.nothingFound && outcome.issues.length === 0 && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2.5">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Every word in that response is already in your list.
                </p>
              </div>
            )}

            {outcome.issues.length > 0 && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2.5">
                <p className="text-overline uppercase font-medium text-amber-700 dark:text-amber-300 mb-1.5">
                  {outcome.issues.length} line{outcome.issues.length !== 1 ? 's' : ''} couldn't be read
                </p>
                <ul className="space-y-1">
                  {outcome.issues.map((issue, i) => (
                    <li key={i} className="text-xs text-amber-700/90 dark:text-amber-300/90">
                      {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function StepHeader({ number, title, muted }: { number: number; title: string; muted?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
          ${muted
            ? 'bg-well text-ink-3'
            : 'bg-accent text-accent-ink'}`}
      >
        {number}
      </span>
      <h3 className={`section-label ${muted ? 'text-ink-3' : ''}`}>
        {title}
      </h3>
    </div>
  );
}

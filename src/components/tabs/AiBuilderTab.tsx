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

import { useEffect, useMemo, useState } from 'react';
import { InfoTip } from '../ui/InfoTip';
import { buildWordListPrompt, parseWordListResponse, type ParseIssue } from '../../utils/wordListPrompt';
import { loadWizardState, saveWizardState } from '../sources/wizardState';
import { getGenerationEntriesFromRows, createEntryRowsFromEntries, hasMeaningfulRows } from '../entries/entryTable';
import { recommendGridSize, recommendWordSearchGridSize, recommendedWordCountRange, recommendedWordCountTarget } from '../../logic/gridRecommendation';
import { toGridWord } from '../../logic/language';
import type { EntryValidationOptions } from '../entries/entryTable';
import type { GenerationSettings } from '../settings/generationSettings';

/** How many of its best words the AI is asked for, per target word, in Optimized mode. */
const OPTIMIZED_CANDIDATE_MULTIPLE = 3;

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

/**
 * Target grid for the word-count recommendation when auto-size is on but
 * there are no words yet — the grid is genuinely undetermined, so we base
 * the suggested ask on a representative mid-size classroom puzzle (13×13,
 * the middle of the supported 8–26 range) rather than the bare 8×8 seed.
 */
const DEFAULT_TARGET_GRID = { width: 13, height: 13 };

type CountMode = 'optimized' | 'exact' | 'unlimited';

interface BuilderDraft {
  context: string;
  wordCount: number;
  includeExisting: boolean;
  /**
   * True once the user has tapped the stepper. While false, `wordCount`
   * tracks the algorithm's recommendation for the current grid; once true,
   * the deliberate choice is frozen and never recomputed over.
   */
  userTouchedCount: boolean;
  // Advanced overrides (default off → the optimized, grid-tuned prompt).
  countMode: CountMode;
  allowProperNouns: boolean;
  extraInstructions: string;
}

const DEFAULT_DRAFT: BuilderDraft = {
  context: '',
  // Seeded with the default-grid recommendation so the first paint already
  // shows a sensible number; the sync effect refines it once entries load.
  wordCount: recommendedWordCountTarget(DEFAULT_TARGET_GRID.width, DEFAULT_TARGET_GRID.height),
  includeExisting: true, userTouchedCount: false,
  countMode: 'optimized',
  allowProperNouns: false, extraInstructions: '',
};

function loadDraft(): BuilderDraft {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (raw) {
      // Older drafts may carry anyLength/anyLetters — absent fields are simply
      // ignored, so those drafts migrate gracefully (the bias dropdown replaces them).
      const parsed = JSON.parse(raw) as Partial<BuilderDraft>;
      const countMode: CountMode =
        parsed.countMode === 'exact' || parsed.countMode === 'unlimited' ? parsed.countMode : 'optimized';
      return {
        context: typeof parsed.context === 'string' ? parsed.context : '',
        wordCount: typeof parsed.wordCount === 'number'
          ? Math.min(MAX_WORDS, Math.max(MIN_WORDS, Math.round(parsed.wordCount)))
          : DEFAULT_DRAFT.wordCount,
        includeExisting: typeof parsed.includeExisting === 'boolean' ? parsed.includeExisting : true,
        // Absent in pre-recommendation drafts → false, so a stale hardcoded
        // count (never a deliberate choice) is refreshed to the recommendation.
        userTouchedCount: parsed.userTouchedCount === true,
        countMode,
        allowProperNouns: parsed.allowProperNouns === true,
        extraInstructions: typeof parsed.extraInstructions === 'string' ? parsed.extraInstructions : '',
      };
    }
  } catch {
    // fall through to defaults
  }
  return { ...DEFAULT_DRAFT };
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
  // and this tab can't be open at the same time as Generate. The table/rows
  // are read-only here, but the generation SETTINGS the mode toggle + bias
  // dropdown write (optimizedMode, qualityBias, optimizedTargetCount) must
  // persist so Generate sees them on its next mount, so settings live in state
  // and every change is written straight back through saveWizardState.
  const [wizardSnapshot, setWizardSnapshot] = useState(() => loadWizardState());
  const settings = wizardSnapshot.settings;
  const isCrossword = settings.puzzleMode === 'crossword';
  // Optimized is a crossword-only flagship; never engage it in word search.
  const optimizedOn = isCrossword && settings.optimizedMode;

  /** Patch generation settings and persist the whole wizard state at once. */
  function patchSettings(next: Partial<GenerationSettings>) {
    setWizardSnapshot(prev => {
      const merged = { ...prev, settings: { ...prev.settings, ...next } };
      saveWizardState(merged);
      return merged;
    });
  }

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

  // The grid the count recommendation is based on. Mirrors the grid the user
  // is actually heading toward (the manual/derived grid above), except when
  // auto-sizing with no words yet — then the grid is undetermined, so we base
  // the suggestion on a representative mid-size grid instead of the bare seed.
  // Both the prefilled count and the "plays best with…" hint read from this,
  // so they always agree.
  const { countBasisWidth, countBasisHeight } = useMemo(() => {
    const settings = wizardSnapshot.settings;
    const noBasisYet = settings.autoGridSize && existingWords.length === 0;
    return {
      countBasisWidth: noBasisYet ? DEFAULT_TARGET_GRID.width : gridWidth,
      countBasisHeight: noBasisYet ? DEFAULT_TARGET_GRID.height : gridHeight,
    };
  }, [wizardSnapshot, existingWords, gridWidth, gridHeight]);

  // Centralized via recommendedWordCountTarget so a later Optimized mode can
  // multiply this same number for its candidate pool.
  const recommendedCount = recommendedWordCountTarget(countBasisWidth, countBasisHeight);

  // Keep the prefilled count on the recommendation until the user takes the
  // wheel. A deliberate stepper tap sets userTouchedCount and freezes it.
  useEffect(() => {
    if (draft.userTouchedCount) return;
    if (draft.wordCount === recommendedCount) return;
    patchDraft({ wordCount: recommendedCount });
    // patchDraft is stable (only setDraft + saveDraft); deps cover the inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommendedCount, draft.userTouchedCount, draft.wordCount]);

  // The stepper count IS the Optimized target word count (the pinned canvas is
  // sized for it). Mirror it into persisted settings while Optimized is on so
  // Generate builds at the right canvas; skip the write when already in sync.
  useEffect(() => {
    if (!optimizedOn) return;
    if (settings.optimizedTargetCount === draft.wordCount) return;
    patchSettings({ optimizedTargetCount: draft.wordCount });
    // patchSettings is stable; deps cover the inputs that drive the mirror.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optimizedOn, draft.wordCount, settings.optimizedTargetCount]);

  const prompt = useMemo(() => buildWordListPrompt({
    context: draft.context,
    wordCount: draft.wordCount,
    existingWords: draft.includeExisting ? existingWords : [],
    gridWidth,
    gridHeight,
    puzzleMode: settings.puzzleMode,
    language: settings.language,
    allowTwoWords: settings.allowTwoWords,
    advanced: {
      // In Optimized mode the N× pool ask supersedes the count mode.
      countMode: draft.countMode,
      optimized: optimizedOn,
      candidateMultiple: OPTIMIZED_CANDIDATE_MULTIPLE,
      qualityBias: settings.qualityBias,
      allowProperNouns: draft.allowProperNouns,
      extraInstructions: draft.extraInstructions,
    },
  }), [draft, existingWords, gridWidth, gridHeight, settings, optimizedOn]);

  // The bias dropdown lives in Advanced, so a non-default bias counts as "on".
  const advancedActive = draft.countMode !== 'optimized' || settings.qualityBias !== 'grid'
    || draft.allowProperNouns || draft.extraInstructions.trim().length > 0;

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
      // AI-pasted words are a curated pool (ADR-10): tag them 'ai' so the
      // Optimized build may pick a subset. Existing kept rows stay as-is.
      const imported = createEntryRowsFromEntries(parsed.entries, rules, 'ai');
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

        {/* Generation mode — prominent, crossword-only (Optimized is a
            crossword flagship). Standard = today's behavior; Optimized asks the
            AI for a larger best-first pool and builds a denser puzzle from the
            best words that fit. Persisted to settings so Generate honors it. */}
        {isCrossword && (
          <div>
            <span className="flex items-center gap-1.5 text-sm font-medium text-ink-2 mb-1.5">
              Generation mode
              <InfoTip label="Generation mode">
                Standard uses exactly the words you ask for. Optimized asks the AI for several times
                as many of its best words, then builds a denser, more interlocked puzzle from the ones that fit.
              </InfoTip>
            </span>
            <div className="flex rounded-btn bg-well p-1" role="group" aria-label="Generation mode">
              <button
                type="button"
                onClick={() => patchSettings({ optimizedMode: false })}
                aria-pressed={!optimizedOn}
                className={`flex-1 py-1.5 rounded-[5px] text-sm font-medium transition-all
                  ${!optimizedOn ? 'bg-card text-ink shadow-sm' : 'text-ink-2 hover:text-ink'}`}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => patchSettings({ optimizedMode: true })}
                aria-pressed={optimizedOn}
                className={`flex-1 py-1.5 rounded-[5px] text-sm font-medium transition-all
                  ${optimizedOn ? 'bg-card text-ink shadow-sm' : 'text-ink-2 hover:text-ink'}`}
              >
                Optimized
              </button>
            </div>
            <p className="mt-1.5 text-xs text-ink-3">
              {optimizedOn
                ? 'Asks the AI for a larger pool of its best words, then builds the densest, highest-quality puzzle from the ones that fit.'
                : 'Builds your puzzle from exactly the words you ask for.'}
            </p>
          </div>
        )}

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
            <span className="flex items-center gap-1.5 mb-1.5">
              <span className="text-sm font-medium text-ink-2">
                {optimizedOn ? 'Target words in the puzzle' : 'New words to ask for'}
              </span>
              <InfoTip label={optimizedOn ? 'Target words in the puzzle' : 'New words to ask for'}>
                {optimizedOn
                  ? 'About how many words you want in the finished puzzle — we suggest a count that fills this grid nicely.'
                  : 'How many words to request — the suggested count fills this grid nicely. It is only a starting point; adjust it freely.'}
              </InfoTip>
              {!draft.userTouchedCount && (
                <span className="text-[10px] tracking-wide uppercase text-rubric">
                  Recommended
                </span>
              )}
            </span>
            <div className="inline-flex items-center rounded-lg border border-line-2 overflow-hidden">
              <button
                onClick={() => patchDraft({ wordCount: Math.max(MIN_WORDS, draft.wordCount - 1), userTouchedCount: true })}
                className="px-3 py-1.5 text-ink-2 hover:bg-well transition-colors"
                aria-label="Fewer words"
              >
                &minus;
              </button>
              <span className="px-3 py-1.5 text-sm font-mono font-semibold text-ink min-w-[3ch] text-center border-x border-line">
                {draft.wordCount}
              </span>
              <button
                onClick={() => patchDraft({ wordCount: Math.min(MAX_WORDS, draft.wordCount + 1), userTouchedCount: true })}
                className="px-3 py-1.5 text-ink-2 hover:bg-well transition-colors"
                aria-label="More words"
              >
                +
              </button>
            </div>
            {optimizedOn ? (
              <p className="mt-1.5 text-xs text-ink-3">
                We&rsquo;ll ask the AI for about {OPTIMIZED_CANDIDATE_MULTIPLE * draft.wordCount} of its best
                words and build a denser puzzle from the best ones that fit.
              </p>
            ) : isCrossword && (() => {
              const range = recommendedWordCountRange(countBasisWidth, countBasisHeight);
              return (
                <p className="mt-1.5 text-xs text-ink-3">
                  A {countBasisWidth}&times;{countBasisHeight} grid plays best with{' '}
                  {range.lo}&ndash;{range.hi} words total
                  {existingWords.length > 0 && <> &mdash; you have {existingWords.length}</>}.
                </p>
              );
            })()}
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
              <span className="flex items-center gap-1.5 text-sm text-ink-2">
                Include my current words ({wordCountLabel})
                <InfoTip label="Include my current words">
                  Sends your existing words along so the AI avoids repeats and suggests words that fit with them.
                </InfoTip>
              </span>
              <span className="block text-xs text-ink-3 mt-0.5">
                Helps the AI avoid repeats and suggest words that fit together.
              </span>
            </span>
          </label>
        </div>

        {/* Advanced options — off by default. The defaults are tuned to make
            the densest, most reliable puzzle; these loosen the constraints
            for more variety and give power users direct control. */}
        <details className="group rounded-lg border border-line/60">
          <summary className="px-3 py-2 text-xs font-medium text-ink-2 cursor-pointer select-none hover:text-ink transition-colors flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              Advanced options
              <InfoTip label="Advanced options">
                Looser controls for more variety. The defaults already make the densest, most reliable
                puzzle — open this only if you want to fine-tune what the AI suggests.
              </InfoTip>
            </span>
            {advancedActive
              ? <span className="text-[10px] tracking-wide uppercase text-rubric">On</span>
              : <span className="text-[10px] tracking-wide uppercase text-ink-3 group-open:hidden">Optimized</span>}
          </summary>
          <div className="px-3 pb-4 pt-1 space-y-4">
            <p className="text-xs text-ink-3 leading-relaxed">
              Defaults are tuned for the best puzzle on your grid. These hand more
              control to you (and the AI) — handy for variety, at some cost to grid density.
            </p>

            {/* Word count mode — in Optimized mode the N× pool ask supersedes
                it, so it's hidden there; it stays in Standard mode. */}
            {!optimizedOn && (
              <div>
                <label htmlFor="ai-count-mode" className="block text-xs font-medium text-ink-2 mb-1.5">
                  Word count
                </label>
                <select
                  id="ai-count-mode"
                  value={draft.countMode}
                  onChange={e => patchDraft({ countMode: e.target.value as CountMode })}
                  className="field text-sm focus:outline-none"
                >
                  <option value="optimized">Optimized for this grid (recommended)</option>
                  <option value="exact">Exactly {draft.wordCount} (the number above)</option>
                  <option value="unlimited">Let the AI choose how many</option>
                </select>
              </div>
            )}

            {/* Quality bias (crossword only — word search has no interlock
                constraints to trade against). Replaces the old any-length /
                any-letters toggles: one choice steers the AI's word pool. */}
            {isCrossword && (
              <div>
                <span className="flex items-center gap-1.5 mb-1.5">
                  <label htmlFor="ai-quality-bias" className="text-xs font-medium text-ink-2">
                    Optimize for
                  </label>
                  <InfoTip label="Optimize for">
                    Grid fit gives the densest puzzle. Best words gives the most interesting words,
                    a little less tightly packed.
                  </InfoTip>
                </span>
                <select
                  id="ai-quality-bias"
                  value={settings.qualityBias}
                  onChange={e => patchSettings({ qualityBias: e.target.value as 'grid' | 'words' })}
                  className="field text-sm focus:outline-none"
                >
                  <option value="grid">Grid fit — denser puzzle</option>
                  <option value="words">Best words — most interesting</option>
                </select>
              </div>
            )}

            <AdvToggle
              checked={draft.allowProperNouns}
              onChange={v => patchDraft({ allowProperNouns: v })}
              label="Allow proper nouns"
              hint="Names of people, places, and brands."
            />

            {/* Free-form extra instructions */}
            <div>
              <span className="flex items-center gap-1.5 mb-1.5">
                <label htmlFor="ai-extra" className="text-xs font-medium text-ink-2">
                  Extra instructions for the AI (optional)
                </label>
                <InfoTip label="Extra instructions">
                  Anything else you want the AI to do — focus on a chapter, set a difficulty,
                  avoid certain words. Added to the prompt in your own words.
                </InfoTip>
              </span>
              <textarea
                id="ai-extra"
                value={draft.extraInstructions}
                onChange={e => patchDraft({ extraInstructions: e.target.value })}
                rows={2}
                placeholder="e.g. focus on Chapter 4 vocabulary; make the clues a bit harder"
                className="field text-sm leading-relaxed focus:outline-none resize-y"
              />
            </div>
          </div>
        </details>

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
            className="btn-primary btn-lg w-full sm:w-auto"
          >
            {copied ? 'Copied' : 'Copy prompt'}
          </button>
          {copied && (
            <p className="mt-2 text-sm text-rubric animate-fade-in">
              Now paste it into ChatGPT, Gemini, Claude, or any AI &rarr;
            </p>
          )}
        </div>
      </section>

      {/* ── Step 2: The bridge — dashed because it happens outside the app ── */}
      <section className="rounded-card border border-dashed border-line-2/60 px-5 py-4">
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
          className="btn-primary btn-lg w-full sm:w-auto"
        >
          Import words
        </button>

        {/* Outcome */}
        {outcome && (
          <div className="space-y-2 animate-fade-in">
            {outcome.added > 0 && (
              <div className="note py-2.5">
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
              <div className="note note-warn py-2.5">
                <p className="text-sm text-ink-2">
                  No words found in that text. Make sure you pasted the AI&rsquo;s reply —
                  it should contain {settings.puzzleMode === 'wordsearch'
                    ? <>one word per line</>
                    : <>lines like <span className="font-mono">WORD | Clue</span></>}.
                </p>
              </div>
            )}

            {outcome.added === 0 && outcome.duplicatesSkipped > 0 && !outcome.nothingFound && outcome.issues.length === 0 && (
              <div className="note note-warn py-2.5">
                <p className="text-sm text-ink-2">
                  Every word in that response is already in your list.
                </p>
              </div>
            )}

            {outcome.issues.length > 0 && (
              <div className="note note-warn py-2.5">
                <p className="text-overline uppercase font-medium text-warn mb-1.5">
                  {outcome.issues.length} line{outcome.issues.length !== 1 ? 's' : ''} couldn&rsquo;t be read
                </p>
                <ul className="space-y-1">
                  {outcome.issues.map((issue, i) => (
                    <li key={i} className="text-xs text-ink-2">
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

/** A compact checkbox + label + hint, used in the advanced options panel. */
function AdvToggle({
  checked, onChange, label, hint,
}: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4"
      />
      <span>
        <span className="block text-sm text-ink-2">{label}</span>
        <span className="block text-xs text-ink-3 mt-0.5">{hint}</span>
      </span>
    </label>
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

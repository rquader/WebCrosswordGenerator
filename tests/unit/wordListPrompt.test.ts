/**
 * Tests for the AI word-list prompt builder and response parser.
 *
 * The parser is the safety net of the copy-paste AI workflow — it has to
 * survive real AI behavior: preamble text, numbering, bold words, missing
 * fences, malformed lines. These tests pin that contract.
 */

import { describe, it, expect } from 'vitest';
import { buildWordListPrompt, parseWordListResponse } from '../../src/utils/wordListPrompt';

const baseOptions = {
  context: 'Unit 3: photosynthesis and plant biology for 7th grade.',
  wordCount: 10,
  existingWords: ['leaf', 'stem'],
  gridWidth: 15,
  gridHeight: 15,
  puzzleMode: 'crossword' as const,
};

describe('buildWordListPrompt', () => {
  it('contains all blocks in order', () => {
    const prompt = buildWordListPrompt(baseOptions);

    const params = prompt.indexOf('REQUIREMENTS');
    const topicBegin = prompt.indexOf('===BEGIN TOPIC CONTEXT===');
    const topicEnd = prompt.indexOf('===END TOPIC CONTEXT===');
    const wordsBegin = prompt.indexOf('===BEGIN EXISTING WORDS===');
    const format = prompt.indexOf('OUTPUT FORMAT');
    const closing = prompt.indexOf('Respond with the code block only. Nothing else.');

    expect(params).toBeGreaterThanOrEqual(0);
    expect(topicBegin).toBeGreaterThan(params);
    expect(topicEnd).toBeGreaterThan(topicBegin);
    expect(wordsBegin).toBeGreaterThan(topicEnd);
    expect(format).toBeGreaterThan(wordsBegin);
    expect(closing).toBeGreaterThan(format);
  });

  it('embeds the user context verbatim and the existing words uppercased', () => {
    const prompt = buildWordListPrompt(baseOptions);

    expect(prompt).toContain('Unit 3: photosynthesis and plant biology for 7th grade.');
    expect(prompt).toContain('LEAF, STEM');
    expect(prompt).toContain('15x15');
    expect(prompt).toContain('no word may be longer than 15 letters');
  });

  it('asks for a grid-calibrated count range when the request fits the band', () => {
    // 15x15 plays best with 12-17 words; 2 existing → 10-15 remaining.
    // The default request of 10 sits inside, so the prompt offers a range.
    const prompt = buildWordListPrompt(baseOptions);

    expect(prompt).toContain('Number of words: 10 to 15');
    expect(prompt).toContain('aiming for about 10');
    expect(prompt).toContain('Between 10 and 15 lines.');
    expect(prompt).not.toContain('exactly 10');
  });

  it('keeps an exact count when the request is outside the grid band', () => {
    // 30 words on a 15x15 is a deliberate overshoot — honor it literally.
    const prompt = buildWordListPrompt({ ...baseOptions, wordCount: 30 });

    expect(prompt).toContain('Number of words: exactly 30.');
    expect(prompt).toContain('Exactly 30 lines.');
    expect(prompt).not.toContain('aiming for about');
  });

  it('keeps exact counts in word search mode (no crossword calibration)', () => {
    const prompt = buildWordListPrompt({ ...baseOptions, puzzleMode: 'wordsearch' });

    expect(prompt).toContain('Number of words: exactly 10.');
    expect(prompt).not.toContain('aiming for about');
  });

  it('omits the existing-words block when there are none', () => {
    const prompt = buildWordListPrompt({ ...baseOptions, existingWords: [] });

    expect(prompt).not.toContain('===BEGIN EXISTING WORDS===');
    expect(prompt).not.toContain('Do not repeat');
  });

  it('adapts wording for word search mode', () => {
    const prompt = buildWordListPrompt({ ...baseOptions, puzzleMode: 'wordsearch' });

    expect(prompt).toContain('word search puzzle');
    // Word search is a different regime: no interlock, any length, variety.
    expect(prompt).toContain('do NOT need to share letters or interlock');
    expect(prompt).toContain('mix of short and long words');
    expect(prompt).toContain('circled cleanly'); // substring-avoidance rule
    // Crossword-only interlock/length guidance must NOT leak into word search.
    expect(prompt).not.toContain('Crossing-friendly');
    expect(prompt).not.toContain('barely cross');
  });

  it('gives crossword length + crossing guidance grounded in the engine', () => {
    const prompt = buildWordListPrompt(baseOptions);

    expect(prompt).toContain('most words 5 to 8 letters');
    expect(prompt).toContain('Avoid 3-letter words');
    expect(prompt).toContain('oversized, mostly empty grid'); // outlier guidance
    expect(prompt).toContain('Crossing-friendly');
    expect(prompt).toContain('E, A, R, I, O, T, N, S, L'); // common letters
    // Word-search-only guidance must NOT leak into the crossword prompt.
    expect(prompt).not.toContain('circled cleanly');
    expect(prompt).not.toContain('fun to hunt');
  });

  it('handles empty context with a sensible fallback', () => {
    const prompt = buildWordListPrompt({ ...baseOptions, context: '   ' });

    expect(prompt).toContain('(no specific topic');
  });

  it('demands single words with the goalkeeper example in both modes', () => {
    const crossword = buildWordListPrompt(baseOptions);
    const wordSearch = buildWordListPrompt({ ...baseOptions, puzzleMode: 'wordsearch' });

    for (const prompt of [crossword, wordSearch]) {
      expect(prompt).toContain('must be a single word');
      expect(prompt).toContain('no multi-word phrases');
      expect(prompt).toContain('"goalkeeper" is correct; "goal keeper", "goal-keeper", and "goal_keeper" are not');
    }
  });

  it('forbids symbols and accents but allows digits, in both modes', () => {
    // Real AI deviation: "EXTRA_TIME" came back from a prompt that only
    // banned spaces and hyphens. The prompt must close every join-character
    // loophole and offer the escape hatch (pick a different word).
    const crossword = buildWordListPrompt(baseOptions);
    const wordSearch = buildWordListPrompt({ ...baseOptions, puzzleMode: 'wordsearch' });

    for (const prompt of [crossword, wordSearch]) {
      expect(prompt).toContain('no underscores');
      expect(prompt).toContain('letters A-Z and digits 0-9');
      expect(prompt).toContain('no punctuation, no abbreviations, no other symbols');
      expect(prompt).toContain('accented letters in their plain form');
      expect(prompt).toContain('choose a different single word instead — never join words with a symbol');
      expect(prompt).toContain('ALL CAPS using only the letters A-Z and digits');
    }
  });

  it('states the language for words and clues, with the Spanish charset', () => {
    const english = buildWordListPrompt(baseOptions);
    expect(english).toContain('Language: English. Every word and every clue must be written in English.');

    const spanish = buildWordListPrompt({ ...baseOptions, language: 'spanish' });
    expect(spanish).toContain('Language: Spanish');
    expect(spanish).toContain('Á É Í Ó Ú Ü Ñ');

    const german = buildWordListPrompt({ ...baseOptions, language: 'german' });
    expect(german).toContain('Write umlauts as plain vowels and ß as SS');
  });

  it('switches to underscore-joined phrases when two-word answers are on', () => {
    const prompt = buildWordListPrompt({ ...baseOptions, allowTwoWords: true });

    expect(prompt).toContain('one underscore joining the words: "EXTRA_TIME"');
    expect(prompt).toContain('TWO_WORDS');
    expect(prompt).not.toContain('"goalkeeper" is correct');
  });

  it('asks for bare words with no clues in word search mode', () => {
    const prompt = buildWordListPrompt({ ...baseOptions, puzzleMode: 'wordsearch' });

    expect(prompt).toContain('Words only — no clues or definitions.');
    expect(prompt).toContain('one word per line');
    expect(prompt).not.toContain('WORD | Clue text');
  });
});

describe('parseWordListResponse', () => {
  it('parses a clean fenced response and ignores text outside the block', () => {
    const response = [
      'Here are your words!',
      '```',
      'CHLOROPHYLL | The green pigment that captures sunlight.',
      'GLUCOSE | The sugar plants make for energy.',
      '```',
      'Let me know if you need more.',
    ].join('\n');

    const result = parseWordListResponse(response);

    expect(result.entries).toEqual([
      { word: 'CHLOROPHYLL', clue: 'The green pigment that captures sunlight.' },
      { word: 'GLUCOSE', clue: 'The sugar plants make for energy.' },
    ]);
    expect(result.issues).toHaveLength(0);
  });

  it('tolerates numbering, bullets, bold words, and a language tag on the fence', () => {
    const response = [
      '```text',
      '1. **STOMATA** | Tiny pores that let gases in and out.',
      '2) ROOTS | They anchor the plant and absorb water.',
      '- XYLEM | Tissue that carries water upward.',
      '```',
    ].join('\n');

    const result = parseWordListResponse(response);

    expect(result.entries.map(e => e.word)).toEqual(['STOMATA', 'ROOTS', 'XYLEM']);
    expect(result.issues).toHaveLength(0);
  });

  it('reports malformed lines with absolute line numbers and keeps parsing', () => {
    const response = [
      '```',                                          // line 1
      'PHLOEM | Tissue that moves sugars around.',    // line 2
      'this line has no pipe',                        // line 3
      'TWO WORDS | Clue for an invalid word.',        // line 4
      'NOCLUE |',                                     // line 5
      'CUTICLE | The waxy protective layer.',         // line 6
      '```',
    ].join('\n');

    const result = parseWordListResponse(response);

    expect(result.entries.map(e => e.word)).toEqual(['PHLOEM', 'CUTICLE']);
    expect(result.issues).toHaveLength(3);
    expect(result.issues[0].line).toBe(3);
    expect(result.issues[0].message).toContain('expected: WORD | Clue');
    expect(result.issues[1].line).toBe(4);
    expect(result.issues[1].message).toContain('has a space');
    expect(result.issues[2].line).toBe(5);
    expect(result.issues[2].message).toContain('missing its clue');
  });

  it('rejects multi-word entries with a specific space message', () => {
    const response = [
      '```',                                            // line 1
      'GOALKEEPER | The player who guards the goal.',   // line 2
      'goal keeper | Same thing, written as two words.', // line 3
      '```',
    ].join('\n');

    const result = parseWordListResponse(response);

    expect(result.entries.map(e => e.word)).toEqual(['GOALKEEPER']);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].line).toBe(3);
    expect(result.issues[0].message).toContain('"goal keeper" has a space');
    expect(result.issues[0].message).toContain('must be single words');
  });

  it('flags words joined with underscores or hyphens when phrases are off', () => {
    const response = [
      '```',                                                  // line 1
      'EXTRA_TIME | Additional minutes played after a draw.', // line 2
      'WELL-KNOWN | Familiar to many people.',                // line 3
      'OFFSIDE | A position past the last defender.',         // line 4
      '```',
    ].join('\n');

    const result = parseWordListResponse(response);

    expect(result.entries.map(e => e.word)).toEqual(['OFFSIDE']);
    expect(result.issues).toHaveLength(2);
    expect(result.issues[0].line).toBe(2);
    expect(result.issues[0].message).toContain('"EXTRA_TIME"');
    expect(result.issues[0].message).toContain('letters and digits only');
    expect(result.issues[1].line).toBe(3);
    expect(result.issues[1].message).toContain('"WELL-KNOWN"');
  });

  it('accepts digits in words', () => {
    const response = '```\nCO2 | The gas plants take in.\n```';

    const result = parseWordListResponse(response);

    expect(result.entries).toEqual([{ word: 'CO2', clue: 'The gas plants take in.' }]);
    expect(result.issues).toHaveLength(0);
  });

  it('accepts Spanish letters only when the language is Spanish', () => {
    const response = '```\nJALAPEÑO | Un chile picante.\n```';

    const spanish = parseWordListResponse(response, [], { language: 'spanish' });
    expect(spanish.entries.map(e => e.word)).toEqual(['JALAPEÑO']);

    const english = parseWordListResponse(response, []);
    expect(english.entries).toHaveLength(0);
    expect(english.issues).toHaveLength(1);
  });

  it('converts underscores and spaces to a spaced phrase when two-word answers are on', () => {
    const response = [
      '```',
      'EXTRA_TIME | Minutes added after a draw.',     // underscore: prompt format
      'ICE CREAM | A frozen dessert.',                // literal space also tolerated
      'ONE_TWO_THREE | Too many words.',              // three words: rejected
      '```',
    ].join('\n');

    const result = parseWordListResponse(response, [], { allowTwoWords: true });

    expect(result.entries.map(e => e.word)).toEqual(['EXTRA TIME', 'ICE CREAM']);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].message).toContain('more than two words');
  });

  it('parses bare word lists in words-only mode (word search)', () => {
    const response = [
      'Here are your words!',
      '```',
      '1. STOMATA',
      '**ROOTS**',
      'NOT A WORD LINE !!!',
      'XYLEM | Tissue that carries water upward.',  // stray pipe line still fine
      '```',
    ].join('\n');

    const result = parseWordListResponse(response, [], { wordsOnly: true });

    expect(result.entries.map(e => e.word)).toEqual(['STOMATA', 'ROOTS', 'XYLEM']);
    expect(result.entries[0].clue).toBe('');
    expect(result.entries[2].clue).toBe('Tissue that carries water upward.');
    // the junk line inside the fence is reported, not silently dropped
    expect(result.issues).toHaveLength(1);
  });

  it('words-only mode skips prose silently when the AI omitted the fence', () => {
    const response = [
      'Sure! Here are your words:',
      'NECTAR',
      'POLLEN',
      'Hope this helps!',  // two valid-looking words... but so is this line? no — spaces
    ].join('\n');

    const result = parseWordListResponse(response, [], { wordsOnly: true });

    expect(result.entries.map(e => e.word)).toEqual(['NECTAR', 'POLLEN']);
    expect(result.issues).toHaveLength(0);
  });

  it('skips blank lines silently', () => {
    const response = '```\nALPHA | First letter.\n\n\nBETA | Second letter.\n```';

    const result = parseWordListResponse(response);

    expect(result.entries).toHaveLength(2);
    expect(result.issues).toHaveLength(0);
  });

  it('skips case-insensitive duplicates against existing words and within the response', () => {
    const response = [
      '```',
      'Leaf | Already in the list.',
      'PETAL | A colorful flower part.',
      'petal | Repeated inside the response.',
      '```',
    ].join('\n');

    const result = parseWordListResponse(response, ['LEAF', 'stem']);

    expect(result.entries.map(e => e.word)).toEqual(['PETAL']);
    expect(result.duplicatesSkipped).toEqual(['LEAF', 'PETAL']);
  });

  it('falls back to lenient whole-text parsing when the AI skipped the fence', () => {
    const response = [
      'Sure! Here are your words:',
      'NECTAR | Sweet liquid that attracts pollinators.',
      'POLLEN | The powder that fertilizes flowers.',
      'Hope this helps!',
    ].join('\n');

    const result = parseWordListResponse(response);

    expect(result.entries.map(e => e.word)).toEqual(['NECTAR', 'POLLEN']);
    // prose lines are skipped silently in lenient mode
    expect(result.issues).toHaveLength(0);
  });

  it('picks the fenced block with the actual word list when several exist', () => {
    const response = [
      '```',
      'note to self',
      '```',
      'And the list:',
      '```',
      'SEPAL | A leaf-like flower protector.',
      'ANTHER | The pollen-bearing part of a stamen.',
      '```',
    ].join('\n');

    const result = parseWordListResponse(response);

    expect(result.entries.map(e => e.word)).toEqual(['SEPAL', 'ANTHER']);
  });

  it('returns nothing for empty input', () => {
    const result = parseWordListResponse('   \n  ');

    expect(result.entries).toHaveLength(0);
    expect(result.issues).toHaveLength(0);
  });
});

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
    expect(prompt).toContain('exactly 10');
    expect(prompt).toContain('15x15');
    expect(prompt).toContain('no word may be longer than 15 letters');
  });

  it('omits the existing-words block when there are none', () => {
    const prompt = buildWordListPrompt({ ...baseOptions, existingWords: [] });

    expect(prompt).not.toContain('===BEGIN EXISTING WORDS===');
    expect(prompt).not.toContain('Do not repeat');
  });

  it('adapts wording for word search mode', () => {
    const prompt = buildWordListPrompt({ ...baseOptions, puzzleMode: 'wordsearch' });

    expect(prompt).toContain('word search puzzle');
    expect(prompt).toContain('Longer words are fine');
    expect(prompt).not.toContain('interlock with other words in a crossword grid');
  });

  it('handles empty context with a sensible fallback', () => {
    const prompt = buildWordListPrompt({ ...baseOptions, context: '   ' });

    expect(prompt).toContain('(no specific topic');
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
    expect(result.issues[1].message).toContain("isn't a single word");
    expect(result.issues[2].line).toBe(5);
    expect(result.issues[2].message).toContain('missing its clue');
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

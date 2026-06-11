/**
 * Print-optimized word bank for word search pages.
 *
 * The student page of a word search lists the words to find — no clues,
 * no numbers, alphabetized in columns, the way printed word searches
 * always do it. Pure B&W, inline styles, paper-first like the rest of
 * the print components.
 */

import { useMemo } from 'react';
import type { CrosswordResult } from '../../logic/types';

interface PrintWordBankProps {
  puzzle: CrosswordResult;
}

export function PrintWordBank({ puzzle }: PrintWordBankProps) {
  const words = useMemo(
    () => [...puzzle.wordLocations].map(wl => wl.word).sort((a, b) => a.localeCompare(b)),
    [puzzle]
  );

  return (
    <div style={{ breakInside: 'avoid' }}>
      <h3
        style={{
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '8px',
          paddingBottom: '3px',
          borderBottom: '1px solid #000',
          color: '#000',
        }}
      >
        Word Bank
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          columnGap: '16px',
          rowGap: '4px',
          fontSize: '10.5px',
          letterSpacing: '0.04em',
          color: '#000',
          textTransform: 'uppercase',
        }}
      >
        {words.map((word, i) => (
          <span key={`${word}-${i}`} style={{ breakInside: 'avoid' }}>
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}

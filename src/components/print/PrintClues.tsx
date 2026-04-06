/**
 * Print-optimized clue list.
 *
 * Two-column layout: Across on the left, Down on the right.
 * Pure B&W, compact spacing, designed for paper.
 */

import { useMemo } from 'react';
import type { CrosswordResult } from '../../logic/types';
import { assignNumbers } from '../../logic/numbering';
import type { NumberedClue } from '../../logic/numbering';

interface PrintCluesProps {
  puzzle: CrosswordResult;
}

export function PrintClues({ puzzle }: PrintCluesProps) {
  const { acrossClues, downClues } = useMemo(() => {
    return assignNumbers(puzzle.wordLocations, puzzle.width, puzzle.height);
  }, [puzzle]);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
        fontSize: '10px',
        lineHeight: 1.5,
        color: '#000',
      }}
    >
      <ClueColumn title="Across" clues={acrossClues} />
      <ClueColumn title="Down" clues={downClues} />
    </div>
  );
}

interface ClueColumnProps {
  title: string;
  clues: NumberedClue[];
}

function ClueColumn({ title, clues }: ClueColumnProps) {
  return (
    <div>
      <h3
        style={{
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '6px',
          paddingBottom: '3px',
          borderBottom: '1px solid #000',
          color: '#000',
        }}
      >
        {title}
      </h3>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {clues.map((clue) => (
          <li
            key={`${clue.number}-${clue.isHorizontal ? 'a' : 'd'}`}
            style={{
              display: 'flex',
              gap: '4px',
              marginBottom: '3px',
            }}
          >
            <span style={{ fontWeight: 600, minWidth: '18px', textAlign: 'right', flexShrink: 0 }}>
              {clue.number}.
            </span>
            <span>{clue.clue}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

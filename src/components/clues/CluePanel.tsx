/**
 * Clue panel displaying Across and Down clues with their numbers.
 *
 * Each clue shows its number and text. Reversed words are marked
 * with a small indicator. The panel scrolls independently of the grid.
 */

import { useMemo } from 'react';
import type { CrosswordResult } from '../../logic/types';
import { assignNumbers } from '../../logic/numbering';
import type { NumberedClue } from '../../logic/numbering';

interface CluePanelProps {
  puzzle: CrosswordResult;
}

export function CluePanel({ puzzle }: CluePanelProps) {
  const { acrossClues, downClues } = useMemo(() => {
    return assignNumbers(puzzle.wordLocations, puzzle.width, puzzle.height);
  }, [puzzle]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ClueList title="Across" clues={acrossClues} />
      <ClueList title="Down" clues={downClues} />
    </div>
  );
}

interface ClueListProps {
  title: string;
  clues: NumberedClue[];
}

function ClueList({ title, clues }: ClueListProps) {
  return (
    <div className="bg-white dark:bg-surface-dark-alt rounded-xl border border-stone-200 dark:border-stone-700/50 p-4 shadow-card">
      <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-3 uppercase tracking-wider">
        {title}
      </h3>
      {clues.length === 0 ? (
        <p className="text-sm text-stone-400 dark:text-stone-500 italic">
          No {title.toLowerCase()} clues
        </p>
      ) : (
        <ol className="space-y-2">
          {clues.map((clue) => (
            <li key={clue.number + '-' + (clue.isHorizontal ? 'h' : 'v')} className="flex gap-2">
              <span className="flex-shrink-0 text-sm font-semibold text-primary-700 dark:text-primary-400 w-6 text-right">
                {clue.number}.
              </span>
              <span className="text-sm text-stone-700 dark:text-stone-300">
                {clue.clue}
                {clue.isReversed && (
                  <span className="ml-1 text-xs text-accent-600 dark:text-accent-400" title="This word is placed in reverse">
                    (reversed)
                  </span>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

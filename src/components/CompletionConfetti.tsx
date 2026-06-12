/**
 * Confetti for the completion card — house palette only (rubric, accent,
 * found-word marker hues), staggered delays, varied sizes. Shared by the
 * crossword and word search completion moments so they celebrate alike.
 */

const CONFETTI_PIECES = [
  { left: '12%', cls: 'w-2 h-2 rounded-sm bg-rubric animate-confetti-1', delay: '0s' },
  { left: '22%', cls: 'w-1.5 h-1.5 rounded-full bg-ws-blue animate-confetti-4', delay: '0.05s' },
  { left: '30%', cls: 'w-2 h-2 rounded-full bg-ws-teal animate-confetti-2', delay: '0.1s' },
  { left: '38%', cls: 'w-2.5 h-2.5 rounded-sm bg-accent animate-confetti-5', delay: '0.02s' },
  { left: '46%', cls: 'w-1.5 h-1.5 rounded-sm bg-ws-amber animate-confetti-3', delay: '0.12s' },
  { left: '52%', cls: 'w-2 h-2 rounded-full bg-rubric animate-confetti-4', delay: '0.18s' },
  { left: '58%', cls: 'w-2 h-2 rounded-sm bg-ws-purple animate-confetti-1', delay: '0.08s' },
  { left: '66%', cls: 'w-1.5 h-1.5 rounded-full bg-ws-coral animate-confetti-2', delay: '0.15s' },
  { left: '72%', cls: 'w-2.5 h-2.5 rounded-sm bg-ws-green animate-confetti-5', delay: '0.06s' },
  { left: '78%', cls: 'w-2 h-2 rounded-full bg-accent animate-confetti-3', delay: '0.2s' },
  { left: '86%', cls: 'w-1.5 h-1.5 rounded-sm bg-ws-cyan animate-confetti-4', delay: '0.1s' },
  { left: '92%', cls: 'w-2 h-2 rounded-sm bg-ws-rose animate-confetti-2', delay: '0.04s' },
  { left: '40%', cls: 'w-1.5 h-1.5 rounded-full bg-ws-amber animate-confetti-1', delay: '0.22s' },
];

export function CompletionConfetti() {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {CONFETTI_PIECES.map((piece, i) => (
        <div
          key={i}
          className={`absolute top-1/2 ${piece.cls}`}
          style={{ left: piece.left, animationDelay: piece.delay }}
        />
      ))}
    </div>
  );
}

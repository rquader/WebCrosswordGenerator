/**
 * Seeded pseudo-random number generator.
 *
 * Uses the mulberry32 algorithm — a fast, well-tested 32-bit PRNG.
 * Provides the same API surface as Java's Random (nextInt, nextFloat, shuffle)
 * to make the Generator port straightforward.
 *
 * The seed guarantees reproducible output: same seed = same crossword every time.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    // Ensure the seed is a 32-bit integer
    this.state = seed | 0;
  }

  /**
   * Advance the internal state and return a raw 32-bit value.
   * Mulberry32 algorithm.
   */
  private next(): number {
    this.state = (this.state + 0x6D2B79F5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0);
  }

  /**
   * Returns a random integer in [0, bound).
   * Matches Java's Random.nextInt(bound) behavior (uniform distribution).
   */
  nextInt(bound: number): number {
    if (bound <= 0) {
      throw new Error('Bound must be positive');
    }
    // Scale the 32-bit value to [0, bound)
    return this.next() % bound;
  }

  /**
   * Returns a random float in [0, 1).
   */
  nextFloat(): number {
    return this.next() / 4294967296; // 2^32
  }

  /**
   * Fisher-Yates shuffle using the seeded PRNG.
   * Matches the behavior of Java's Collections.shuffle(list, random).
   */
  shuffle<T>(array: T[]): void {
    // Fisher-Yates from the end, same as Java's Collections.shuffle
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(i + 1);
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
  }
}

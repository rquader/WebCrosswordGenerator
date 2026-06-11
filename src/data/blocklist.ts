/**
 * Blocklist for the word search filler-letter filter.
 *
 * Random filler letters routinely spell profanity and slurs across the
 * 8 scan directions of a word search — a well-known failure mode of word
 * search generators, and this tool is aimed at classrooms. After filler
 * placement the engine scans the finished grid in all 8 directions and
 * re-randomizes filler cells that spell any word below
 * (see sanitizeFillerLetters in src/logic/wordSearchGenerator.ts).
 *
 * Maintaining this file needs no engine knowledge:
 *   - Add entries lowercase, letters a-z only.
 *   - Entries shorter than MIN_BLOCKED_LENGTH are ignored by the scanner
 *     (3-letter strings appear constantly in random fill; scrubbing them
 *     all would fight the RNG forever for little gain).
 *   - Matching is by substring, so inflections are covered by their stem
 *     ("fuck" also catches "fucker", "fucking") — only add a longer form
 *     when the stem alone is too short or too noisy to block.
 *   - Substrings of innocent words WILL match ("anal" in "analysis");
 *     that is fine for filler (cells just re-randomize) and harmless for
 *     placed words (the engine never alters cells of real placed words).
 *
 * The list is deliberately not exhaustive — it covers common English
 * profanity and slurs well. Known gaps and the path to a third-party
 * list are documented in the Obsidian note "Word Search Filter".
 */

/**
 * Minimum match length the grid scanner acts on. Tighten with care:
 * lowering to 3 makes the sanitize loop fight pure chance on every grid.
 */
export const MIN_BLOCKED_LENGTH = 4;

export const BLOCKLIST: string[] = [
  // Profanity
  'arse',
  'arsehole',
  'asshole',
  'bastard',
  'bitch',
  'bollock',
  'boner',
  'bullshit',
  'cock',
  'crap',
  'cunt',
  'damn',
  'dick',
  'dildo',
  'douche',
  'dumbass',
  'fatass',
  'fuck',
  'goddamn',
  'jackass',
  'jizz',
  'piss',
  'prick',
  'pussy',
  'shit',
  'slut',
  'twat',
  'wank',
  'whore',

  // Sexual / anatomical
  'anal',
  'anus',
  'blowjob',
  'boob',
  'breast',
  'clit',
  'cumshot',
  'erotic',
  'handjob',
  'hentai',
  'horny',
  'incest',
  'milf',
  'naked',
  'nude',
  'orgasm',
  'orgy',
  'penis',
  'porn',
  'rape',
  'rapist',
  'rectum',
  'semen',
  'sexy',
  'smut',
  'sodomy',
  'tits',
  'vagina',

  // Slurs and hate terms
  'beaner',
  'chink',
  'coon',
  'darkie',
  'dyke',
  'fags',
  'faggot',
  'golliwog',
  'gook',
  'gringo',
  'heeb',
  'hitler',
  'homo',
  'injun',
  'jigaboo',
  'kike',
  'kraut',
  'lesbo',
  'nazi',
  'negro',
  'nigga',
  'nigger',
  'paki',
  'queer',
  'raghead',
  'retard',
  'spic',
  'squaw',
  'tranny',
  'wetback',

  // Violence / drugs (school context)
  'heroin',
  'meth',
  'molest',
  'murder',
  'pedo',
  'suicide',
];

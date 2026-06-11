/**
 * Blocklists for the word search filler-letter filter, per language.
 *
 * Random filler letters routinely spell profanity and slurs across the
 * 8 scan directions of a word search — a well-known failure mode of word
 * search generators, and this tool is aimed at classrooms. After filler
 * placement the engine scans the finished grid in all 8 directions and
 * re-randomizes filler cells that spell any blocked word
 * (see sanitizeFillerLetters in src/logic/wordSearchGenerator.ts).
 *
 * The scrub always uses EVERY language's list, regardless of the puzzle's
 * language. Classrooms are multilingual — a Spanish-speaking student in an
 * English classroom recognizes Spanish profanity in the filler just fine.
 * This costs nothing content-wise (only random filler is ever altered;
 * placed words are never touched) and keeps the scrub language-independent,
 * so the same seed yields the same grid in every language setting.
 *
 * Maintaining this file needs no engine knowledge:
 *   - Add entries lowercase. Accented letters are fine (Spanish), but
 *     remember filler letters are always plain a-z — accented entries
 *     only ever match through letters of placed words, so include the
 *     unaccented spelling too when it isn't an everyday innocent word.
 *   - Entries shorter than MIN_BLOCKED_LENGTH are ignored by the scanner
 *     (3-letter strings appear constantly in random fill; scrubbing them
 *     all would fight the RNG forever for little gain).
 *   - Matching is by substring, so inflections are covered by their stem
 *     ("fuck" also catches "fucker", "fucking"; "cazz" catches "cazzo",
 *     "cazzata") — only add a longer form when the stem alone is too
 *     short or too noisy to block.
 *   - Substrings of innocent words WILL match ("anal" in "analysis",
 *     "culo" in "vínculo"); that is fine for filler (cells just
 *     re-randomize) and harmless for placed words (the engine never
 *     alters cells of real placed words).
 *
 * The lists are deliberately not exhaustive — they cover common
 * profanity and slurs well. Known gaps and the path to a third-party
 * list are documented in the Obsidian note "Word Search Filter".
 */

import type { PuzzleLanguage } from '../logic/language';

/**
 * Minimum match length the grid scanner acts on. Tighten with care:
 * lowering to 3 makes the sanitize loop fight pure chance on every grid.
 */
export const MIN_BLOCKED_LENGTH = 4;

const ENGLISH: string[] = [
  // Profanity
  'arse',
  'arsehole',
  'asshole',
  'asswipe',
  'bastard',
  'bitch',
  'bollock',
  'boner',
  'bugger',
  'bullshit',
  'choad',
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
  'lardass',
  'piss',
  'prick',
  'pussy',
  'shit',
  'shithead',
  'skank',
  'slut',
  'spunk',
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
  'felch',
  'gangbang',
  'handjob',
  'hentai',
  'hooker',
  'horny',
  'incest',
  'jerkoff',
  'milf',
  'naked',
  'nude',
  'orgasm',
  'orgy',
  'penis',
  'pimp',
  'porn',
  'pube',
  'queef',
  'rape',
  'rapist',
  'rectum',
  'rimjob',
  'semen',
  'sext',
  'sexy',
  'smegma',
  'smut',
  'sodomy',
  'tits',
  'vagina',

  // Slurs and hate terms
  'abbo',
  'beaner',
  'chink',
  'coolie',
  'coon',
  'dago',
  'darkie',
  'darky',
  'dyke',
  'fags',
  'faggot',
  'gimp',
  'golliwog',
  'gook',
  'gringo',
  'gypo',
  'gyppo',
  'heeb',
  'hitler',
  'homo',
  'hymie',
  'injun',
  'jigaboo',
  'kaffir',
  'kafir',
  'kike',
  'kraut',
  'kyke',
  'ladyboy',
  'lesbo',
  'midget',
  'mongoloid',
  'mulatto',
  'nazi',
  'negress',
  'negro',
  'nigga',
  'nigger',
  'paki',
  'pickaninny',
  'polack',
  'queer',
  'raghead',
  'retard',
  'sambo',
  'shemale',
  'spaz',
  'spic',
  'spick',
  'squaw',
  'tranny',
  'wetback',

  // Violence / drugs (school context)
  'bong',
  'cocaine',
  'crackhead',
  'fentanyl',
  'heroin',
  'meth',
  'molest',
  'murder',
  'opium',
  'pedo',
  'suicide',
];

const SPANISH: string[] = [
  // Profanity / insults
  'boludo',
  'caga',
  'cagada',
  'cabron',
  'cabrón',
  'cabrona',
  'capullo',
  'carajo',
  'chinga',
  'chingada',
  'chingar',
  'chupame',
  'cojon',
  'cojones',
  'concha',
  'conchuda',
  'coño',
  'culero',
  'culiado',
  'culo',
  'estupido',
  'estúpido',
  'follad',
  'follar',
  'furcia',
  'gilipollas',
  'hijoputa',
  'hijueputa',
  'huevon',
  'huevón',
  'idiota',
  'imbecil',
  'imbécil',
  'joder',
  'jodido',
  'malparido',
  'mamada',
  'mamon',
  'mamón',
  'mear',
  'mierda',
  'panocha',
  'pelotudo',
  'pendeja',
  'pendejo',
  'pene',
  'perra',
  'pija',
  'pinche',
  'polla',
  'puta',
  'puto',
  'ramera',
  'tetas',
  'verga',
  'weon',
  'zorra',

  // Slurs
  'bollera',
  'marica',
  'maricon',
  'maricón',
  'negrata',
  'sudaca',
];

const FRENCH: string[] = [
  // Profanity / insults
  'batard',
  'bâtard',
  'bite',
  'bordel',
  'branler',
  'branlette',
  'branleur',
  'chier',
  'chieur',
  'chiotte',
  'connard',
  'connasse',
  'conne',
  'couille',
  'encule',
  'enculé',
  'enculer',
  'foutre',
  'garce',
  'merde',
  'nique',
  'niquer',
  'petasse',
  'pétasse',
  'putain',
  'pute',
  'salaud',
  'salopard',
  'salope',
  'suceuse',
  'trouduc',

  // Slurs
  'bougnoule',
  'gouine',
  'negre',
  'nègre',
  'négro',
  'pede',
  'pédé',
  'tapette',
  'tarlouze',
  'youpin',
];

const GERMAN: string[] = [
  // Profanity / insults
  'arsch',
  'bumsen',
  'drecksau',
  'fick',
  'fotze',
  'hure',
  'kacke',
  'moese',
  'muschi',
  'nutte',
  'penner',
  'scheiss',
  'schlampe',
  'schwanz',
  'titten',
  'vogeln',
  'vollidiot',
  'wichs',

  // Slurs
  'itaker',
  'judensau',
  'kanake',
  'kanacke',
  'missgeburt',
  'neger',
  'polacke',
  'schlitzauge',
  'schwuchtel',
  'spast',
  'spasti',
  'untermensch',
];

const ITALIAN: string[] = [
  // Profanity / insults
  'cazz',
  'coglion',
  'cretino',
  'culo',
  'fanculo',
  'fica',
  'figa',
  'imbecill',
  'incul',
  'merda',
  'mignotta',
  'minchia',
  'pirla',
  'pompino',
  'puttan',
  'sborr',
  'stronz',
  'stupido',
  'suca',
  'troia',
  'zoccola',

  // Slurs
  'busone',
  'culattone',
  'frocio',
  'polentone',
  'recchione',
  'ricchione',
  'terrone',
];

const PORTUGUESE: string[] = [
  // Profanity / insults
  'arrombado',
  'babaca',
  'bicha',
  'boquete',
  'bucet',
  'cacete',
  'caralh',
  'corno',
  'cuzao',
  'cuzão',
  'escroto',
  'fode',
  'foder',
  'fodido',
  'fudido',
  'merda',
  'otario',
  'otário',
  'piroca',
  'porra',
  'punheta',
  'puta',
  'viado',
  'xota',
  'xoxota',

  // Slurs
  'boiola',
  'crioulo',
  'macaco',
  'paneleiro',
  'sapatao',
  'sapatão',
  'traveco',
];

/** Per-language lists, kept separate for maintainability. */
export const BLOCKLISTS: Record<PuzzleLanguage, string[]> = {
  english: ENGLISH,
  spanish: SPANISH,
  french: FRENCH,
  german: GERMAN,
  italian: ITALIAN,
  portuguese: PORTUGUESE,
};

/**
 * The scrub list: every language combined, deduped. See module docs for
 * why the filter is deliberately language-independent.
 */
export function getFullBlocklist(): string[] {
  return Array.from(
    new Set(Object.values(BLOCKLISTS).flat().map(w => w.toLowerCase()))
  );
}

/**
 * Back-compat export: the English list under its original name.
 * Existing imports and tests keep working; the engine scrubs with
 * getFullBlocklist.
 */
export const BLOCKLIST: string[] = ENGLISH;

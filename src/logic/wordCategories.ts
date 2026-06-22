/**
 * Topic categories for the word-bank fallback.
 *
 * When the AI can't fill every slot, the solver completes the rest from the
 * generic word bank. Left alone, that filler is off-topic (an "Animals" puzzle
 * gets "bridge", "garden", …). This module lets the solver PREFER bank words
 * related to the teacher's topic — entirely offline, no AI, no network:
 *
 *   1. `detectCategories(topic, placedWords)` reads the topic text and the words
 *      already in the puzzle and returns the categories they imply.
 *   2. `preferredBankWords(categories)` returns the bank words in those
 *      categories — a SOFT preference the solver tries first (it never excludes
 *      other words, so the fill rate is unchanged; only the choice of filler
 *      shifts toward the topic when an on-topic word fits the crossings).
 *
 * Each category is defined by a list of associated words. Those words serve two
 * roles: any of them appearing in the topic/placed words triggers the category
 * (detection), and the ones that also exist in WORD_BANK become its fill members
 * (membership is intersected with the bank at load, so a member is always a word
 * the solver can actually place). Detection-only words (e.g. "zoo", "astronomy")
 * simply don't become members.
 *
 * Pure data + pure functions — no DOM, no network, no Math.random/Date.
 */

import { WORD_BANK } from './wordBank';

/**
 * category -> words associated with it (detection triggers; the subset also in
 * WORD_BANK become fill members). Lowercase, single words. Generous on purpose:
 * unmatched/non-bank entries are harmless (detection-only).
 */
const CATEGORY_DEFS: Record<string, string[]> = {
  animals: [
    'animal', 'animals', 'zoo', 'pet', 'pets', 'wildlife', 'mammal', 'mammals', 'creature', 'beast',
    'ant', 'ape', 'bat', 'bee', 'cat', 'cow', 'cub', 'dog', 'fox', 'hen', 'owl', 'pig', 'rat',
    'bird', 'duck', 'swan', 'hare', 'hawk', 'newt', 'deer', 'frog', 'lion', 'lamb', 'wolf', 'goat',
    'pony', 'seal', 'camel', 'zebra', 'hippo', 'hyena', 'koala', 'otter', 'panda', 'robin', 'tiger',
    'horse', 'mouse', 'snake', 'sheep', 'eagle', 'goose', 'raven', 'beaver', 'donkey', 'rabbit',
    'monkey', 'jaguar', 'falcon', 'ferret', 'walrus', 'possum', 'python', 'kitten', 'gorilla',
    'giraffe', 'pelican', 'penguin', 'leopard', 'panther', 'octopus', 'ostrich', 'raccoon', 'dolphin',
    'elephant', 'flamingo', 'hedgehog', 'tortoise', 'squirrel', 'alligator', 'crocodile', 'butterfly',
  ],
  food: [
    'food', 'foods', 'eat', 'meal', 'meals', 'cooking', 'kitchen', 'recipe', 'snack', 'fruit', 'fruits',
    'vegetable', 'vegetables', 'bread', 'cheese', 'apple', 'bacon', 'bagel', 'candy', 'lemon', 'mango',
    'melon', 'onion', 'pasta', 'peach', 'pizza', 'salad', 'salsa', 'sauce', 'sugar', 'syrup', 'toast',
    'butter', 'carrot', 'celery', 'cereal', 'cookie', 'coffee', 'dinner', 'muffin', 'peanut', 'pepper',
    'potato', 'tomato', 'waffle', 'walnut', 'yogurt', 'cupcake', 'popcorn', 'pancake', 'pudding',
    'biscuit', 'custard', 'sausage', 'sandwich', 'cinnamon', 'lemonade', 'tofu', 'soup', 'corn', 'rice',
  ],
  plants: [
    'plant', 'plants', 'nature', 'garden', 'gardening', 'tree', 'trees', 'flower', 'flowers', 'forest',
    'leaf', 'bark', 'fern', 'herb', 'moss', 'palm', 'pine', 'root', 'rose', 'seed', 'stem', 'twig',
    'vine', 'acorn', 'birch', 'bloom', 'cedar', 'daisy', 'maple', 'petal', 'tulip', 'willow', 'blossom',
    'clover', 'orchid', 'pollen', 'branch', 'lilac', 'ivy', 'oak', 'elm', 'sunflower', 'marigold',
    'magnolia', 'azalea', 'bamboo', 'cactus', 'dahlia', 'zinnia',
  ],
  space: [
    'space', 'planet', 'planets', 'astronomy', 'solar', 'galaxy', 'star', 'stars', 'moon', 'orbit',
    'comet', 'cosmos', 'cosmic', 'rocket', 'meteor', 'eclipse', 'gravity', 'crater', 'asteroid',
    'telescope', 'universe', 'satellite', 'spaceship', 'astronaut', 'mars', 'venus', 'saturn',
    'jupiter', 'mercury', 'neptune',
  ],
  weather: [
    'weather', 'climate', 'rain', 'rainy', 'snow', 'snowy', 'storm', 'stormy', 'wind', 'windy', 'cloud',
    'cloudy', 'sunny', 'fog', 'foggy', 'frost', 'hail', 'thunder', 'lightning', 'breeze', 'drizzle',
    'blizzard', 'rainbow', 'humid', 'season', 'autumn', 'winter', 'summer', 'spring', 'tornado',
    'hurricane', 'temperature',
  ],
  ocean: [
    'ocean', 'sea', 'seas', 'marine', 'beach', 'coast', 'coastal', 'wave', 'waves', 'tide', 'reef',
    'shell', 'shore', 'coral', 'crab', 'fish', 'seal', 'shark', 'whale', 'squid', 'octopus', 'dolphin',
    'lobster', 'oyster', 'sponge', 'starfish', 'seahorse', 'seaweed', 'jellyfish', 'submarine',
    'sailboat', 'anchor', 'harbor', 'island', 'lagoon',
  ],
  sports: [
    'sport', 'sports', 'game', 'games', 'team', 'athletic', 'ball', 'soccer', 'tennis', 'hockey',
    'rugby', 'golf', 'swim', 'swimming', 'runner', 'race', 'racing', 'skate', 'surf', 'coach', 'league',
    'referee', 'stadium', 'jersey', 'helmet', 'goalie', 'marathon', 'gymnast', 'baseball', 'football',
    'basketball', 'volleyball', 'badminton',
  ],
  music: [
    'music', 'musical', 'song', 'songs', 'instrument', 'instruments', 'band', 'melody', 'rhythm',
    'note', 'notes', 'tune', 'piano', 'drum', 'drums', 'flute', 'guitar', 'violin', 'trumpet', 'banjo',
    'cello', 'harp', 'organ', 'tempo', 'chord', 'lyric', 'choir', 'opera', 'concert', 'orchestra',
    'saxophone', 'trombone', 'clarinet', 'xylophone',
  ],
  body: [
    'body', 'human', 'health', 'anatomy', 'arm', 'ear', 'eye', 'jaw', 'leg', 'lip', 'rib', 'toe',
    'bone', 'chin', 'hand', 'hair', 'head', 'heart', 'knee', 'nose', 'skin', 'ankle', 'brain', 'chest',
    'elbow', 'mouth', 'thumb', 'wrist', 'finger', 'muscle', 'kidney', 'throat', 'stomach', 'shoulder',
    'skeleton',
  ],
  transport: [
    'transport', 'vehicle', 'vehicles', 'travel', 'car', 'bus', 'jet', 'van', 'boat', 'ship', 'bike',
    'train', 'truck', 'plane', 'wagon', 'canoe', 'ferry', 'yacht', 'jeep', 'raft', 'sled', 'taxi',
    'tractor', 'scooter', 'trolley', 'bicycle', 'airplane', 'subway', 'helicopter', 'submarine',
    'motorcycle', 'ambulance',
  ],
};

const BANK_SET = new Set(WORD_BANK.map(w => w.toLowerCase()));

/**
 * category -> its fill members (the associated words that exist in WORD_BANK).
 * Built once at load; a member is always a word the solver can actually place.
 */
const CATEGORY_MEMBERS: Map<string, string[]> = (() => {
  const map = new Map<string, string[]>();
  for (const [category, words] of Object.entries(CATEGORY_DEFS)) {
    const members: string[] = [];
    const seen = new Set<string>();
    for (const word of words) {
      const w = word.toLowerCase();
      if (BANK_SET.has(w) && !seen.has(w)) {
        seen.add(w);
        members.push(w);
      }
    }
    map.set(category, members);
  }
  return map;
})();

/** All defined category names (for tests / introspection). */
export const WORD_CATEGORY_NAMES: string[] = Object.keys(CATEGORY_DEFS);

/** Fill members of a single category (bank words associated with it). */
export function categoryMembers(category: string): string[] {
  return CATEGORY_MEMBERS.get(category) ?? [];
}

/**
 * Detect the categories implied by a topic string plus the words already placed
 * in the puzzle. Matching is on whole lowercase tokens (so "cat" matches the word
 * "cat", not the substring in "category"), against each category's associated
 * words and its own name.
 */
export function detectCategories(topic: string, placedWords: string[] = []): string[] {
  const haystack = (topic + ' ' + placedWords.join(' ')).toLowerCase();
  const tokens = new Set(haystack.split(/[^a-z]+/).filter(Boolean));
  if (tokens.size === 0) return [];

  const active: string[] = [];
  for (const [category, words] of Object.entries(CATEGORY_DEFS)) {
    if (tokens.has(category) || words.some(w => tokens.has(w))) {
      active.push(category);
    }
  }
  return active;
}

/**
 * The set of bank words to PREFER as filler, given a list of active categories
 * (their members, unioned). Empty set when no categories are active — the caller
 * then keeps its default behavior.
 */
export function preferredBankWords(categories: string[]): Set<string> {
  const preferred = new Set<string>();
  for (const category of categories) {
    for (const word of categoryMembers(category)) preferred.add(word);
  }
  return preferred;
}

/**
 * Convenience: topic text + placed words -> preferred bank-word set, in one call.
 * Returns an empty set when nothing matches (caller keeps default ordering).
 */
export function topicPreferredWords(topic: string, placedWords: string[] = []): Set<string> {
  return preferredBankWords(detectCategories(topic, placedWords));
}

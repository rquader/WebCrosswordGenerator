/**
 * Curated word bank for skeleton generation.
 *
 * These words are used internally to fill structural gaps in a skeleton
 * crossword. They are placed by the generator to create a connected grid,
 * then stripped — leaving blank slots for the user to fill manually.
 *
 * Requirements:
 *   - Common, inoffensive English words
 *   - No proper nouns, slang, or potentially offensive content
 *   - Good distribution of lengths (3-12)
 *   - Good letter diversity (variety of starting/ending letters)
 *
 * These words are NEVER shown to the end user as puzzle content.
 */

export const WORD_BANK: string[] = [
  // 3-letter words (40)
  'ace', 'add', 'age', 'air', 'ant', 'ape', 'arc', 'arm',
  'art', 'ask', 'ate', 'bag', 'bat', 'bed', 'big', 'bit',
  'box', 'bug', 'bus', 'but', 'cab', 'cap', 'car', 'cat',
  'cup', 'cut', 'day', 'dig', 'dog', 'dot', 'dry', 'dug',
  'ear', 'eat', 'egg', 'elm', 'end', 'eye', 'fan', 'fig',

  // 4-letter words (60)
  'able', 'arch', 'area', 'axis', 'bake', 'band', 'barn', 'base',
  'bell', 'belt', 'bird', 'blue', 'boat', 'bold', 'bone', 'book',
  'calm', 'cape', 'card', 'cart', 'cave', 'chef', 'city', 'clay',
  'coat', 'code', 'cold', 'cone', 'cook', 'cool', 'cord', 'core',
  'dark', 'dart', 'dawn', 'deer', 'desk', 'dial', 'dome', 'door',
  'dove', 'drum', 'dust', 'each', 'east', 'edge', 'face', 'fair',
  'farm', 'fast', 'fern', 'fill', 'fine', 'fish', 'flag', 'flat',
  'foam', 'fold', 'fork', 'frog',

  // 5-letter words (60)
  'above', 'acres', 'admit', 'adopt', 'agree', 'alarm', 'alert', 'alive',
  'angel', 'angle', 'apple', 'arena', 'atlas', 'basic', 'beach', 'begin',
  'bench', 'blade', 'blank', 'blend', 'block', 'board', 'bonus', 'brain',
  'brave', 'bread', 'brick', 'brief', 'bring', 'brush', 'cabin', 'cargo',
  'cedar', 'chain', 'chair', 'charm', 'chase', 'cheap', 'chess', 'chief',
  'chunk', 'claim', 'class', 'clean', 'clear', 'climb', 'clock', 'close',
  'cloud', 'coach', 'coast', 'coral', 'count', 'cover', 'craft', 'crane',
  'cream', 'crown', 'curve', 'dance',

  // 6-letter words (50)
  'absorb', 'access', 'across', 'active', 'adjust', 'affirm', 'anchor', 'animal',
  'annual', 'appeal', 'arched', 'assist', 'basket', 'beacon', 'beside', 'blanch',
  'branch', 'bridge', 'bright', 'bronze', 'bubble', 'button', 'candle', 'canyon',
  'castle', 'center', 'chance', 'chosen', 'circle', 'clever', 'cobalt', 'colony',
  'column', 'common', 'corner', 'covert', 'cradle', 'crafts', 'create', 'custom',
  'danger', 'decode', 'defend', 'design', 'detail', 'dinner', 'dragon', 'driven',
  'enable', 'engine',

  // 7-letter words (40)
  'achieve', 'ancient', 'arrange', 'balance', 'barista', 'blanket', 'blossom', 'cabinet',
  'caliber', 'captain', 'capture', 'catalog', 'central', 'chapter', 'chimney', 'citizen',
  'climate', 'collect', 'combine', 'command', 'compact', 'complex', 'concept', 'conduct',
  'confirm', 'connect', 'consent', 'contain', 'context', 'control', 'convert', 'correct',
  'costume', 'cottage', 'council', 'country', 'courage', 'crystal', 'culture', 'cushion',

  // 8-letter words (30)
  'absolute', 'abstract', 'academic', 'balanced', 'backyard', 'bacteria', 'building', 'calendar',
  'campaign', 'cardinal', 'carousel', 'ceremony', 'champion', 'chapters', 'charcoal', 'children',
  'circular', 'climbing', 'coasting', 'colonies', 'combined', 'compared', 'complete', 'composed',
  'computer', 'concrete', 'consider', 'constant', 'continue', 'contract',

  // 9-letter words (20)
  'adventure', 'afternoon', 'agreement', 'beginning', 'blueprint', 'breakfast', 'broadcast', 'calculate',
  'candidate', 'catalogue', 'celebrate', 'challenge', 'character', 'chemistry', 'chocolate', 'classroom',
  'clockwork', 'community', 'companion', 'condition',

  // 10-letter words (10)
  'accomplish', 'atmosphere', 'background', 'basketball', 'birthplace', 'boundaries', 'california', 'capitalize',
  'changeable', 'collection',

  // 11-letter words (8)
  'comfortable', 'communicate', 'concentrate', 'considerate', 'collaborate', 'celebration', 'calibration', 'countryside',

  // 12-letter words (5)
  'accomplished', 'acknowledged', 'considerable', 'collectively', 'commissioner',
];

/**
 * Get word bank words filtered by maximum length.
 * Returns a new array — does not mutate the bank.
 */
export function getWordBankByMaxLength(maxLength: number): string[] {
  return WORD_BANK.filter(word => word.length <= maxLength);
}

/**
 * Get word bank words filtered to a specific length.
 */
export function getWordBankByExactLength(length: number): string[] {
  return WORD_BANK.filter(word => word.length === length);
}

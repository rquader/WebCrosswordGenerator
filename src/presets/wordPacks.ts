/**
 * Built-in starter word packs.
 *
 * These are the one-click sample lists in the Generate tab — designed as
 * approachable starting points for first-time users to learn the app, and
 * tuned so they produce dense, satisfying puzzles in BOTH crossword and
 * word-search mode. Every word is a single lowercase a-z term; clues are
 * one short classroom-appropriate sentence that never contains the answer.
 *
 * Content is original to this file. To add a pack: define it, then add it
 * to WORD_PACKS. No engine knowledge required.
 */

import type { WordCluePair } from '../logic/types';

export interface WordPack {
  id: string;
  name: string;
  description: string;
  entries: WordCluePair[];
}

const animals: WordPack = {
  id: 'animals',
  name: 'Animals',
  description: 'Common creatures kids know (grades 2-5)',
  entries: [
    { word: 'tiger', clue: 'Big striped cat of the jungle' },
    { word: 'horse', clue: 'Animal you can ride and saddle' },
    { word: 'mouse', clue: 'Tiny rodent that loves cheese' },
    { word: 'snake', clue: 'Long legless reptile that slithers' },
    { word: 'eagle', clue: 'Powerful bird with sharp talons' },
    { word: 'zebra', clue: 'Has black and white stripes' },
    { word: 'panda', clue: 'Black and white bear from China' },
    { word: 'otter', clue: 'Playful furry swimmer in rivers' },
    { word: 'camel', clue: 'Desert animal with a humped back' },
    { word: 'rabbit', clue: 'Hopping pet with long floppy ears' },
    { word: 'monkey', clue: 'Climbs trees and loves bananas' },
    { word: 'turtle', clue: 'Slow reptile carrying a hard shell' },
    { word: 'donkey', clue: 'Sturdy farm cousin of the horse' },
    { word: 'beaver', clue: 'Builds dams with logs and sticks' },
  ],
};

const solarSystem: WordPack = {
  id: 'solar-system',
  name: 'Solar System',
  description: 'Planets, moons, and space basics (grades 3-6)',
  entries: [
    { word: 'venus', clue: 'Second world from our star' },
    { word: 'earth', clue: 'The blue world we live on' },
    { word: 'mars', clue: 'The dusty red neighbor planet' },
    { word: 'comet', clue: 'Icy ball with a glowing tail' },
    { word: 'orbit', clue: 'The looping path around a star' },
    { word: 'lunar', clue: 'Having to do with the moon' },
    { word: 'solar', clue: 'Having to do with the sun' },
    { word: 'meteor', clue: 'A shooting streak in the night sky' },
    { word: 'saturn', clue: 'Famous for its bright icy rings' },
    { word: 'galaxy', clue: 'A huge swirl of billions of stars' },
    { word: 'rocket', clue: 'Vehicle that blasts into space' },
    { word: 'crater', clue: 'A bowl-shaped dent from impact' },
    { word: 'gravity', clue: 'The force that pulls things down' },
    { word: 'eclipse', clue: 'When one body hides another' },
  ],
};

const weather: WordPack = {
  id: 'weather',
  name: 'Weather',
  description: 'Weather and sky phenomena (grades 2-5)',
  entries: [
    { word: 'rain', clue: 'Water falling from gray clouds' },
    { word: 'snow', clue: 'Soft white flakes in winter' },
    { word: 'wind', clue: 'Moving air you can feel but not see' },
    { word: 'cloud', clue: 'Fluffy white shape in the sky' },
    { word: 'storm', clue: 'Wild weather with thunder and gusts' },
    { word: 'frost', clue: 'Thin icy coating on cold mornings' },
    { word: 'sunny', clue: 'Bright and clear with no clouds' },
    { word: 'foggy', clue: 'Hazy and hard to see far ahead' },
    { word: 'breeze', clue: 'A gentle and pleasant moving air' },
    { word: 'shower', clue: 'A brief and light burst of rain' },
    { word: 'hail', clue: 'Hard ice pellets dropping in a storm' },
    { word: 'thunder', clue: 'The loud rumble after a flash' },
    { word: 'drizzle', clue: 'Very fine and light falling mist' },
    { word: 'tornado', clue: 'A spinning funnel that touches ground' },
  ],
};

const oceanLife: WordPack = {
  id: 'ocean-life',
  name: 'Ocean Life',
  description: 'Sea creatures and the deep (grades 2-5)',
  entries: [
    { word: 'whale', clue: 'Huge mammal that spouts water' },
    { word: 'shark', clue: 'Toothy predator of the deep' },
    { word: 'coral', clue: 'Colorful reef built by tiny animals' },
    { word: 'crab', clue: 'Sideways walker with sharp pincers' },
    { word: 'squid', clue: 'Soft creature with many long arms' },
    { word: 'seal', clue: 'Sleek mammal that barks on rocks' },
    { word: 'starfish', clue: 'Five-armed creature on the seabed' },
    { word: 'lobster', clue: 'Red shellfish with heavy front claws' },
    { word: 'octopus', clue: 'Eight-armed master of disguise' },
    { word: 'dolphin', clue: 'Smart leaping mammal that clicks' },
    { word: 'oyster', clue: 'Shellfish that may hide a pearl' },
    { word: 'sponge', clue: 'Simple soft animal full of holes' },
    { word: 'urchin', clue: 'Round spiny ball on the seafloor' },
  ],
};

const instruments: WordPack = {
  id: 'instruments',
  name: 'Musical Instruments',
  description: 'Instruments across families (grades 3-6)',
  entries: [
    { word: 'piano', clue: 'Keyboard with black and white keys' },
    { word: 'flute', clue: 'Slim metal pipe you blow across' },
    { word: 'violin', clue: 'Small string box played with a bow' },
    { word: 'guitar', clue: 'Six strings you strum or pluck' },
    { word: 'cello', clue: 'Large string instrument held upright' },
    { word: 'harp', clue: 'Tall frame of strings you pluck' },
    { word: 'oboe', clue: 'Reed pipe with a thin nasal tone' },
    { word: 'trumpet', clue: 'Brass horn with three valves' },
    { word: 'banjo', clue: 'Round twangy string instrument' },
    { word: 'organ', clue: 'Keyboard powered by rushing air' },
    { word: 'tuba', clue: 'Huge brass horn with deep notes' },
    { word: 'maraca', clue: 'Shaker filled with rattling beads' },
    { word: 'fiddle', clue: 'Folk name for a bowed string box' },
    { word: 'bongo', clue: 'Small twin hand drum from Cuba' },
  ],
};

const kitchen: WordPack = {
  id: 'kitchen',
  name: 'In the Kitchen',
  description: 'Cooking tools and kitchen items (grades 2-5)',
  entries: [
    { word: 'spoon', clue: 'Round scoop for soup and stirring' },
    { word: 'knife', clue: 'Sharp tool for slicing food' },
    { word: 'plate', clue: 'Flat dish you eat your meal from' },
    { word: 'whisk', clue: 'Wire tool for beating eggs' },
    { word: 'grater', clue: 'Rough tool that shreds cheese' },
    { word: 'ladle', clue: 'Deep cup on a handle for serving' },
    { word: 'kettle', clue: 'Pot that whistles when boiling' },
    { word: 'skillet', clue: 'Flat round pan for frying eggs' },
    { word: 'blender', clue: 'Machine that whirls fruit to liquid' },
    { word: 'toaster', clue: 'Slots that brown your bread' },
    { word: 'apron', clue: 'Cloth that keeps your clothes clean' },
    { word: 'colander', clue: 'Bowl with holes to drain pasta' },
    { word: 'spatula', clue: 'Flat blade for flipping pancakes' },
    { word: 'platter', clue: 'Large dish for serving a roast' },
  ],
};

export const WORD_PACKS: WordPack[] = [
  animals,
  solarSystem,
  weather,
  oceanLife,
  instruments,
  kitchen,
];

export function getWordPackById(id: string): WordPack | undefined {
  return WORD_PACKS.find(pack => pack.id === id);
}

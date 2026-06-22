/**
 * Curated word bank.
 *
 * This list serves TWO purposes, and both can show up in a real puzzle:
 *
 *   1. Skeleton generation — words are placed to build a connected grid,
 *      then stripped, leaving blank slots for the user to fill manually.
 *      (Here the words themselves are never seen.)
 *
 *   2. AI-fill fallback (skeleton-first + Build-Your-Own-Grid) — when the
 *      AI cannot fill a slot, a bank word that fits the crossing letters is
 *      placed and KEPT in the grid as a real answer (with a blank clue the
 *      user fills in). In this path the bank word IS shown to the student.
 *
 * Because of (2), the bank must be clean, real, correctly spelled, and
 * broadly distributed: a slot whose crossings force a g-z starting letter,
 * or whose length falls outside the covered range, gets no fallback and
 * goes silently blank. So letter and length diversity are load-bearing.
 *
 * Requirements (every entry must satisfy):
 *   - Common, everyday, inoffensive English a teacher would never object to.
 *   - Lowercase a-z only. No proper nouns, slang, abbreviations, or
 *     potentially offensive content. When in doubt, leave it out.
 *   - Full a-z starting-letter coverage, dense for the common lengths.
 *   - Lengths 3-15 (crossword convention is a minimum length of 3).
 *
 * Plain string literals only — no computed expressions. Invariants
 * (charset, length, no duplicates, a-z coverage, density, safety) are
 * enforced by tests/unit/wordBank.test.ts.
 */

export const WORD_BANK: string[] = [
  // 3-letter words
  'ace', 'air', 'ant', 'arm', 'ash', 'bat', 'bee', 'bud', 'bug', 'cap',
  'cat', 'cow', 'cub', 'cup', 'day', 'dog', 'dot', 'ear', 'egg', 'elf',
  'elm', 'fan', 'fig', 'fox', 'fun', 'fur', 'gap', 'gem', 'gum', 'hat',
  'hay', 'hen', 'hip', 'hop', 'hut', 'ice', 'ink', 'ivy', 'jam', 'jar',
  'jet', 'jog', 'jug', 'key', 'kit', 'lab', 'leg', 'lid', 'log', 'map',
  'mud', 'mug', 'nap', 'net', 'nut', 'oak', 'oar', 'oil', 'owl', 'pen',
  'pet', 'pie', 'pig', 'pot', 'pup', 'rat', 'rib', 'rod', 'rug', 'run',
  'sea', 'set', 'sip', 'ski', 'sky', 'sun', 'tag', 'tea', 'tie', 'tin',
  'toe', 'top', 'toy', 'tub', 'urn', 'use', 'van', 'vet', 'vow', 'wax',
  'web', 'wig', 'win', 'yak', 'yam', 'yes', 'yew', 'zip', 'zoo',

  // 4-letter words
  'able', 'acre', 'arch', 'area', 'army', 'aunt', 'baby', 'bake', 'band', 'barn',
  'base', 'bath', 'bead', 'bean', 'bear', 'bell', 'belt', 'bird', 'blue', 'boat',
  'body', 'bold', 'bone', 'book', 'boot', 'bowl', 'cake', 'calm', 'cape', 'card',
  'cave', 'cell', 'city', 'clay', 'coat', 'code', 'coin', 'cold', 'cone', 'cook',
  'cool', 'corn', 'crew', 'dark', 'dawn', 'deer', 'desk', 'dial', 'dish', 'dome',
  'door', 'dove', 'drum', 'duck', 'dust', 'each', 'east', 'easy', 'echo', 'edge',
  'epic', 'face', 'fair', 'fall', 'farm', 'fast', 'fern', 'fire', 'fish', 'flag',
  'flat', 'foam', 'fold', 'fork', 'frog', 'fuel', 'gate', 'gaze', 'gear', 'gift',
  'girl', 'glad', 'glow', 'goal', 'goat', 'gold', 'golf', 'grab', 'grin', 'gulf',
  'hail', 'hall', 'hand', 'hare', 'harp', 'hawk', 'haze', 'heat', 'herb', 'hero',
  'hill', 'home', 'hood', 'hoof', 'hope', 'horn', 'hour', 'hunt', 'idea', 'inch',
  'iris', 'iron', 'isle', 'item', 'jade', 'jazz', 'jeep', 'join', 'joke', 'jump',
  'jury', 'keen', 'keep', 'kelp', 'kind', 'king', 'kite', 'knee', 'knot', 'lace',
  'lake', 'lamb', 'lamp', 'lava', 'lawn', 'leaf', 'lend', 'lens', 'limb', 'lime',
  'lion', 'list', 'lock', 'loft', 'loop', 'love', 'luck', 'maid', 'mail', 'mane',
  'mask', 'mast', 'maze', 'meal', 'menu', 'mild', 'mile', 'milk', 'mind', 'mint',
  'mist', 'mode', 'monk', 'moon', 'moss', 'moth', 'name', 'nest', 'newt', 'node',
  'noon', 'nose', 'note', 'oboe', 'okra', 'open', 'oval', 'oven', 'pace', 'pack',
  'page', 'pail', 'palm', 'park', 'path', 'pear', 'peak', 'pine', 'pink', 'plan',
  'play', 'plum', 'poem', 'pole', 'pond', 'pony', 'pool', 'pork', 'port', 'pose',
  'puff', 'quay', 'quiz', 'race', 'raft', 'rail', 'rain', 'ramp', 'rank', 'rate',
  'reef', 'rice', 'ring', 'road', 'robe', 'rock', 'role', 'roof', 'room', 'root',
  'rope', 'rose', 'ruby', 'rule', 'rust', 'sage', 'sail', 'salt', 'sand', 'scan',
  'seal', 'seat', 'seed', 'shed', 'ship', 'shoe', 'shop', 'silk', 'sing', 'site',
  'size', 'skin', 'slab', 'sled', 'slip', 'slot', 'snow', 'soap', 'sofa', 'soil',
  'song', 'soup', 'spin', 'star', 'stem', 'step', 'stir', 'stop', 'surf', 'swan',
  'swim', 'tail', 'tale', 'tank', 'tape', 'team', 'tent', 'tide', 'tile', 'time',
  'tofu', 'tone', 'tool', 'tour', 'town', 'tray', 'tree', 'trim', 'trip', 'tube',
  'tuna', 'tune', 'turn', 'twig', 'twin', 'unit', 'vain', 'vase', 'vast', 'veil',
  'vine', 'visa', 'void', 'vote', 'wade', 'wall', 'wand', 'wave', 'weed', 'week',
  'well', 'west', 'wind', 'wing', 'wolf', 'wood', 'wool', 'word', 'work', 'worm',
  'yard', 'yarn', 'yawn', 'yell', 'yoga', 'yolk', 'zero', 'zinc', 'zone', 'zoom',

  // 5-letter words
  'above', 'acorn', 'admit', 'adopt', 'agile', 'agree', 'alarm', 'album', 'alert', 'alive',
  'alley', 'amber', 'angel', 'angle', 'ankle', 'apple', 'apron', 'arena', 'arrow', 'aside',
  'atlas', 'audio', 'avoid', 'award', 'aware', 'bacon', 'badge', 'baker', 'banjo', 'basic',
  'basil', 'basin', 'beach', 'beard', 'beast', 'begin', 'bench', 'berry', 'bingo', 'birch',
  'blade', 'blank', 'blast', 'blaze', 'blend', 'block', 'bloom', 'board', 'bonus', 'boost',
  'booth', 'brain', 'brake', 'brave', 'bread', 'brick', 'bride', 'brief', 'bring', 'brisk',
  'brook', 'broom', 'brown', 'brush', 'bunch', 'cabin', 'cable', 'camel', 'candy', 'canoe',
  'cargo', 'carol', 'catch', 'cedar', 'chain', 'chair', 'chalk', 'charm', 'chart', 'chase',
  'cheap', 'check', 'cheer', 'chess', 'chest', 'chief', 'child', 'chime', 'chord', 'chunk',
  'civic', 'claim', 'clamp', 'class', 'clean', 'clear', 'cliff', 'climb', 'cloak', 'clock',
  'close', 'cloth', 'cloud', 'clove', 'clown', 'coach', 'coast', 'cobra', 'cocoa', 'coral',
  'couch', 'cough', 'count', 'court', 'cover', 'crane', 'crash', 'crawl', 'cream', 'creek',
  'crisp', 'cross', 'crowd', 'crown', 'crust', 'curve', 'daisy', 'dance', 'debut', 'decay',
  'delta', 'depot', 'depth', 'diary', 'diner', 'ditch', 'diver', 'dizzy', 'donor', 'dough',
  'dozen', 'draft', 'drain', 'drama', 'dream', 'dress', 'dried', 'drift', 'drill', 'drink',
  'drive', 'drone', 'dwarf', 'eagle', 'early', 'earth', 'easel', 'eaten', 'ebony', 'elbow',
  'elder', 'elect', 'elite', 'ember', 'empty', 'enjoy', 'enter', 'envoy', 'equal', 'erase',
  'event', 'exact', 'extra', 'fable', 'fancy', 'fence', 'ferry', 'fever', 'field', 'fiery',
  'fifth', 'fight', 'final', 'finch', 'first', 'flame', 'flank', 'flash', 'fleet', 'float',
  'flock', 'flood', 'floor', 'flour', 'fluid', 'flute', 'focus', 'force', 'forge', 'forty',
  'found', 'frame', 'fresh', 'fried', 'front', 'frost', 'fruit', 'fudge', 'funny', 'gauge',
  'gecko', 'genre', 'ghost', 'giant', 'given', 'glade', 'gland', 'glare', 'glass', 'gleam',
  'glide', 'globe', 'gloom', 'glory', 'glove', 'goose', 'gourd', 'grace', 'grade', 'grain',
  'grand', 'grape', 'graph', 'grass', 'grave', 'graze', 'great', 'greed', 'green', 'greet',
  'grill', 'groom', 'group', 'grove', 'guard', 'guess', 'guest', 'guide', 'guild', 'habit',
  'happy', 'hardy', 'haste', 'hatch', 'haven', 'hazel', 'heart', 'heavy', 'hedge', 'hello',
  'hinge', 'hippo', 'hobby', 'hoist', 'honey', 'honor', 'horse', 'hotel', 'house', 'hover',
  'human', 'humid', 'humor', 'hutch', 'hyena', 'igloo', 'image', 'index', 'inlet', 'input',
  'ivory', 'jelly', 'jewel', 'joint', 'jolly', 'judge', 'juice', 'jumbo', 'kayak', 'kebab',
  'khaki', 'kiosk', 'kitty', 'knack', 'kneel', 'knife', 'knock', 'koala', 'label', 'labor',
  'lance', 'lapse', 'large', 'larva', 'laser', 'latch', 'later', 'laugh', 'layer', 'learn',
  'lemon', 'level', 'lever', 'light', 'lilac', 'liner', 'llama', 'lobby', 'local', 'lodge',
  'logic', 'loose', 'lotus', 'lower', 'loyal', 'lucky', 'lunar', 'lunch', 'lyric', 'macro',
  'magic', 'major', 'maker', 'mango', 'manor', 'maple', 'march', 'marsh', 'match', 'medal',
  'melon', 'mercy', 'merit', 'metal', 'meter', 'metro', 'might', 'mince', 'miner', 'minor',
  'minus', 'mixer', 'model', 'money', 'month', 'moral', 'motel', 'motor', 'mound', 'mount',
  'mouse', 'mouth', 'mover', 'movie', 'mulch', 'mural', 'music', 'naval', 'nerve', 'newer',
  'niche', 'niece', 'night', 'noble', 'noise', 'north', 'novel', 'nudge', 'nurse', 'nylon',
  'oasis', 'ocean', 'offer', 'olive', 'onion', 'opera', 'orbit', 'organ', 'otter', 'ought',
  'ounce', 'owner', 'paint', 'panda', 'panel', 'pansy', 'paper', 'party', 'pasta', 'paste',
  'patch', 'patio', 'pause', 'peace', 'peach', 'pearl', 'pedal', 'penny', 'perch', 'petal',
  'phase', 'phone', 'photo', 'piano', 'piece', 'pilot', 'pinch', 'pixel', 'pizza', 'place',
  'plain', 'plane', 'plank', 'plant', 'plate', 'plaza', 'plead', 'plush', 'point', 'polar',
  'porch', 'pouch', 'pound', 'power', 'press', 'price', 'pride', 'prime', 'print', 'prism',
  'prize', 'probe', 'prone', 'proof', 'proud', 'prove', 'prune', 'pulse', 'punch', 'pupil',
  'puppy', 'purse', 'quail', 'quart', 'queen', 'query', 'quest', 'quick', 'quiet', 'quill',
  'quilt', 'quota', 'quote', 'radar', 'radio', 'rainy', 'raise', 'rally', 'ranch', 'range',
  'rapid', 'ratio', 'raven', 'reach', 'react', 'ready', 'realm', 'rebel', 'relax', 'relay',
  'reply', 'rhyme', 'rider', 'ridge', 'rifle', 'rigid', 'rinse', 'river', 'roast', 'robin',
  'robot', 'rocky', 'rodeo', 'roost', 'rotor', 'rough', 'round', 'route', 'royal', 'rugby',
  'ruler', 'rural', 'saber', 'salad', 'salon', 'salsa', 'sandy', 'satin', 'sauce', 'scale',
  'scarf', 'scene', 'scent', 'scoop', 'scope', 'score', 'scout', 'scrap', 'scrub', 'sense',
  'serve', 'seven', 'shade', 'shaft', 'shake', 'shape', 'share', 'shark', 'sharp', 'shear',
  'sheep', 'sheet', 'shelf', 'shell', 'shift', 'shine', 'shiny', 'shirt', 'shock', 'shore',
  'short', 'shout', 'shove', 'shown', 'shrub', 'sight', 'silly', 'siren', 'sixth', 'skate',
  'skill', 'skirt', 'skull', 'slate', 'sleek', 'sleep', 'slice', 'slide', 'slope', 'small',
  'smart', 'smell', 'smile', 'smoke', 'snack', 'snail', 'snake', 'sneak', 'sniff', 'snore',
  'snowy', 'solar', 'solid', 'solve', 'sound', 'south', 'space', 'spade', 'spare', 'spark',
  'speak', 'spear', 'speed', 'spell', 'spend', 'spice', 'spicy', 'spike', 'spine', 'spire',
  'spoke', 'spoon', 'sport', 'spout', 'spray', 'squad', 'stack', 'staff', 'stage', 'stair',
  'stake', 'stalk', 'stall', 'stamp', 'stand', 'stare', 'stark', 'start', 'state', 'steam',
  'steel', 'steep', 'steer', 'stern', 'stick', 'sting', 'stock', 'stone', 'stool', 'store',
  'storm', 'story', 'stout', 'stove', 'strap', 'straw', 'strip', 'study', 'stuff', 'stump',
  'sugar', 'suite', 'sunny', 'super', 'surge', 'swamp', 'swarm', 'sweat', 'sweep', 'sweet',
  'swept', 'swift', 'swing', 'swirl', 'sword', 'syrup', 'table', 'taken', 'tango', 'taste',
  'teach', 'teeth', 'tempo', 'tenor', 'tenth', 'thank', 'theme', 'thick', 'thief', 'thigh',
  'thing', 'thorn', 'three', 'threw', 'throw', 'thumb', 'tidal', 'tiger', 'tight', 'timer',
  'title', 'toast', 'today', 'token', 'tonic', 'tooth', 'topaz', 'topic', 'torch', 'total',
  'touch', 'tough', 'towel', 'tower', 'trace', 'track', 'trade', 'trail', 'train', 'tramp',
  'trash', 'tread', 'treat', 'trend', 'trial', 'tribe', 'trick', 'troop', 'trout', 'truck',
  'truly', 'trunk', 'trust', 'truth', 'tulip', 'tunic', 'turbo', 'tutor', 'twice', 'twine',
  'twist', 'ulcer', 'ultra', 'uncle', 'under', 'unify', 'union', 'unite', 'unity', 'upper',
  'upset', 'urban', 'usage', 'usher', 'usual', 'utter', 'valid', 'value', 'valve', 'vapor',
  'vault', 'venom', 'venue', 'verge', 'verse', 'video', 'vigor', 'villa', 'vinyl', 'viola',
  'viper', 'virus', 'visit', 'visor', 'vital', 'vivid', 'vocal', 'voice', 'voter', 'wafer',
  'wagon', 'waist', 'waltz', 'water', 'wheat', 'wheel', 'where', 'which', 'while', 'white',
  'whole', 'width', 'willow', 'winch', 'windy', 'wiper', 'witch', 'woman', 'world', 'worry',
  'worth', 'would', 'wound', 'woven', 'wrist', 'write', 'wrong', 'xenon', 'xylem', 'yacht',
  'yeast', 'yield', 'young', 'youth', 'zebra', 'zesty',

  // 6-letter words
  'absorb', 'accept', 'access', 'across', 'action', 'active', 'adjust', 'admire', 'advice', 'aerial',
  'afford', 'agency', 'airway', 'alpaca', 'always', 'amount', 'anchor', 'animal', 'answer', 'anthem',
  'antler', 'anyone', 'appeal', 'arcade', 'archer', 'around', 'arrive', 'artist', 'aspect', 'assist',
  'attach', 'attend', 'author', 'autumn', 'avenue', 'awhile', 'azalea', 'bakery', 'ballot', 'bamboo',
  'banana', 'banner', 'barley', 'barrel', 'basket', 'beacon', 'beauty', 'beaver', 'before', 'behave',
  'behind', 'belong', 'beside', 'better', 'beyond', 'biceps', 'bishop', 'bitter', 'blazer', 'blouse',
  'boiler', 'bonnet', 'border', 'borrow', 'bottle', 'bottom', 'bought', 'bounce', 'branch', 'breeze',
  'bridge', 'bright', 'bronze', 'brooch', 'brunch', 'bubble', 'bucket', 'budget', 'buffet', 'bumper',
  'bundle', 'bureau', 'bushel', 'butler', 'button', 'camera', 'campus', 'candle', 'canine', 'canopy',
  'canyon', 'carbon', 'career', 'carpet', 'carrot', 'cashew', 'castle', 'casual', 'cement', 'center',
  'cereal', 'chalet', 'chance', 'change', 'chapel', 'charge', 'cheese', 'cherry', 'choice', 'church',
  'circle', 'circus', 'citrus', 'clever', 'client', 'closet', 'clover', 'cobalt', 'coffee', 'collar',
  'colony', 'column', 'comedy', 'common', 'cookie', 'cooler', 'copper', 'corner', 'cotton', 'county',
  'couple', 'course', 'cousin', 'crater', 'crayon', 'creamy', 'create', 'credit', 'crisis', 'crispy',
  'crouch', 'crunch', 'cuckoo', 'cuddle', 'curfew', 'cursor', 'custom', 'cutter', 'cymbal', 'dahlia',
  'damage', 'dancer', 'danger', 'dazzle', 'debate', 'decade', 'decide', 'decode', 'deduct', 'defeat',
  'defend', 'define', 'degree', 'delete', 'demand', 'dental', 'depart', 'depend', 'deputy', 'desert',
  'design', 'desire', 'detail', 'detect', 'device', 'differ', 'dinner', 'direct', 'divide', 'doctor',
  'dollar', 'domain', 'donate', 'donkey', 'double', 'dragon', 'drawer', 'driver', 'duplex', 'easily',
  'editor', 'effort', 'eighty', 'either', 'eleven', 'embark', 'emblem', 'employ', 'enable', 'ending',
  'endure', 'energy', 'engine', 'enough', 'ensure', 'entire', 'errand', 'escape', 'estate', 'evolve',
  'exceed', 'except', 'excess', 'excite', 'excuse', 'exhale', 'exotic', 'expand', 'expect', 'expert',
  'export', 'expose', 'extend', 'fabric', 'factor', 'fairly', 'falcon', 'family', 'famous', 'fasten',
  'faucet', 'fender', 'fennel', 'ferret', 'figure', 'filter', 'finger', 'finish', 'flavor', 'fleece',
  'flight', 'floral', 'flower', 'fluffy', 'flurry', 'flying', 'follow', 'forbid', 'forest', 'forget',
  'formal', 'format', 'fought', 'fourth', 'friend', 'fringe', 'frozen', 'fungus', 'funnel', 'future',
  'gadget', 'galaxy', 'gallon', 'garage', 'garden', 'garlic', 'gather', 'gazebo', 'geyser', 'ginger',
  'glance', 'global', 'glossy', 'goblet', 'golden', 'gopher', 'gospel', 'govern', 'gravel', 'grease',
  'greasy', 'ground', 'growth', 'guitar', 'gutter', 'hammer', 'hamper', 'handle', 'happen', 'harbor',
  'hardly', 'hatred', 'hazard', 'header', 'health', 'hearth', 'heater', 'heaven', 'hectic', 'helmet',
  'herald', 'hereby', 'hermit', 'hidden', 'hockey', 'hollow', 'honest', 'hoodie', 'horror', 'hostel',
  'humble', 'hunger', 'hunter', 'hurdle', 'hyphen', 'icicle', 'impact', 'import', 'income', 'indeed',
  'indoor', 'infant', 'inform', 'injure', 'insect', 'inside', 'intact', 'intend', 'invent', 'invite',
  'island', 'jacket', 'jaguar', 'jersey', 'jigsaw', 'jingle', 'jockey', 'jovial', 'jumble', 'jungle',
  'junior', 'kennel', 'kidney', 'kindly', 'kitten', 'ladder', 'lagoon', 'laptop', 'lately', 'lather',
  'latter', 'launch', 'lawyer', 'leader', 'league', 'legacy', 'legend', 'legume', 'length', 'lentil',
  'lesson', 'letter', 'lichen', 'likely', 'linear', 'liquid', 'listen', 'litter', 'living', 'lizard',
  'locker', 'locust', 'lonely', 'lotion', 'lounge', 'lovely', 'luxury', 'magnet', 'mallet', 'mammal',
  'manage', 'mantle', 'manual', 'marble', 'margin', 'marina', 'market', 'marrow', 'mascot', 'matter',
  'meadow', 'medium', 'mellow', 'memory', 'mentor', 'method', 'middle', 'minute', 'mirror', 'misery',
  'mitten', 'mobile', 'modern', 'modest', 'moment', 'monkey', 'mosaic', 'mostly', 'mother', 'motion',
  'muffin', 'muscle', 'museum', 'mutual', 'napkin', 'narrow', 'native', 'nature', 'nearby', 'nectar',
  'needle', 'nephew', 'nickel', 'nimble', 'nobody', 'normal', 'notice', 'number', 'nugget', 'nutmeg',
  'oblige', 'occupy', 'office', 'offset', 'online', 'onward', 'orange', 'orchid', 'ordeal', 'origin',
  'osprey', 'outfit', 'outlet', 'output', 'oxygen', 'oyster', 'packet', 'paddle', 'palace', 'pantry',
  'parade', 'parcel', 'pardon', 'parent', 'parlor', 'parrot', 'pastel', 'pastry', 'patrol', 'patron',
  'pebble', 'pencil', 'people', 'pepper', 'permit', 'pewter', 'phrase', 'pickle', 'pigeon', 'pillar',
  'pillow', 'pirate', 'piston', 'planet', 'plasma', 'player', 'please', 'pledge', 'plenty', 'plunge',
  'pocket', 'poetry', 'poison', 'police', 'pollen', 'poncho', 'poodle', 'poplar', 'porter', 'possum',
  'potato', 'powder', 'praise', 'prefer', 'pretty', 'prince', 'prison', 'profit', 'prompt', 'proper',
  'public', 'puddle', 'pulley', 'puppet', 'purple', 'pursue', 'puzzle', 'python', 'quartz', 'quiver',
  'rabbit', 'radish', 'random', 'ranger', 'rather', 'reader', 'really', 'reason', 'recall', 'recent',
  'recipe', 'record', 'reduce', 'reform', 'refuge', 'region', 'relate', 'relief', 'remain', 'remark',
  'remind', 'remote', 'remove', 'rental', 'repair', 'repeat', 'report', 'rescue', 'resist', 'resort',
  'result', 'retail', 'retire', 'return', 'reveal', 'review', 'reward', 'ribbon', 'riddle', 'ripple',
  'rocket', 'roster', 'rotate', 'rubber', 'rubble', 'rustic', 'saddle', 'safari', 'safely', 'salami',
  'salmon', 'sample', 'sandal', 'savory', 'scarce', 'scenic', 'school', 'scrape', 'scroll', 'season',
  'second', 'secret', 'sector', 'secure', 'seldom', 'select', 'senior', 'sensor', 'settle', 'severe',
  'shadow', 'shrimp', 'shrink', 'shrine', 'signal', 'silver', 'simple', 'singer', 'sister', 'sketch',
  'sleeve', 'slogan', 'smooth', 'snappy', 'soccer', 'social', 'socket', 'sodium', 'softly', 'soothe',
  'sorbet', 'source', 'spider', 'spiral', 'sponge', 'spread', 'spring', 'sprint', 'sprout', 'spruce',
  'square', 'squash', 'squeak', 'stable', 'staple', 'statue', 'steady', 'stereo', 'stitch', 'stormy',
  'strain', 'strand', 'streak', 'stream', 'street', 'stress', 'strict', 'stride', 'strike', 'string',
  'stripe', 'stroke', 'stroll', 'strong', 'studio', 'sturdy', 'submit', 'subtle', 'suburb', 'subway',
  'sudden', 'suffix', 'summer', 'summit', 'sunset', 'supper', 'supply', 'survey', 'switch', 'symbol',
  'syntax', 'system', 'tablet', 'tackle', 'talent', 'tandem', 'tangle', 'target', 'tassel', 'tavern',
  'temple', 'tenant', 'tender', 'tennis', 'thirst', 'thread', 'thrill', 'throat', 'throne', 'thrust',
  'ticket', 'timber', 'timing', 'tinsel', 'tissue', 'toggle', 'tomato', 'tongue', 'toward', 'trader',
  'tragic', 'travel', 'treaty', 'trench', 'trophy', 'tropic', 'trough', 'trowel', 'tundra', 'tunnel',
  'turban', 'turkey', 'turnip', 'turtle', 'tuxedo', 'twelve', 'twenty', 'unfold', 'unique', 'unlock',
  'unpack', 'update', 'upload', 'upward', 'urgent', 'useful', 'vacuum', 'vanish', 'velvet', 'vendor',
  'vessel', 'violet', 'violin', 'voyage', 'waffle', 'walnut', 'walrus', 'wander', 'washer', 'weasel',
  'weaver', 'weekly', 'weight', 'window', 'winner', 'winter', 'wisdom', 'wither', 'wonder', 'worker',
  'wrench', 'writer', 'yellow', 'yogurt', 'zenith', 'zigzag', 'zinnia', 'zodiac', 'zombie',

  // 7-letter words
  'abandon', 'ability', 'absence', 'academy', 'account', 'achieve', 'acrobat', 'acrylic', 'address', 'advance',
  'against', 'airline', 'airport', 'alcohol', 'ammonia', 'amplify', 'analyze', 'anatomy', 'ancient', 'android',
  'angular', 'animate', 'another', 'antenna', 'antique', 'anxiety', 'anybody', 'anymore', 'anytime', 'archery',
  'arrange', 'arsenal', 'article', 'artwork', 'asphalt', 'athlete', 'attempt', 'attract', 'auction', 'average',
  'awesome', 'awkward', 'baggage', 'bagpipe', 'balance', 'balcony', 'bandage', 'banquet', 'bargain', 'barrier',
  'bassoon', 'battery', 'because', 'bedroom', 'beehive', 'believe', 'beneath', 'benefit', 'between', 'bicycle',
  'biology', 'biscuit', 'blanket', 'blender', 'blossom', 'bouquet', 'brigade', 'brownie', 'browser', 'buffalo',
  'builder', 'bulldog', 'cabbage', 'cabinet', 'caboose', 'caliber', 'calorie', 'caramel', 'caravan', 'cardiac',
  'careful', 'carrier', 'cartoon', 'cascade', 'cashier', 'catcher', 'ceiling', 'central', 'century', 'ceramic',
  'certain', 'chamber', 'channel', 'chapter', 'charity', 'cheddar', 'cheetah', 'chemist', 'chicken', 'chimney',
  'circuit', 'citizen', 'classic', 'cleaner', 'cleanse', 'climate', 'cluster', 'coastal', 'cobbler', 'coconut',
  'collage', 'collect', 'college', 'combine', 'comfort', 'command', 'comment', 'compact', 'company', 'compare',
  'compass', 'compete', 'compile', 'complex', 'concept', 'concern', 'concert', 'conduct', 'confirm', 'connect',
  'consent', 'console', 'contact', 'contain', 'content', 'contest', 'context', 'control', 'convert', 'cordial',
  'correct', 'costume', 'cottage', 'council', 'counter', 'country', 'courage', 'cracker', 'creator', 'crimson',
  'crochet', 'crumble', 'crystal', 'culture', 'cupcake', 'curious', 'current', 'curtain', 'cushion', 'custard',
  'cyclone', 'decimal', 'declare', 'decline', 'defense', 'deliver', 'dentist', 'deposit', 'dessert', 'develop',
  'diagram', 'diamond', 'dignity', 'diploma', 'discuss', 'disease', 'dismiss', 'display', 'diverse', 'dolphin',
  'drawing', 'drizzle', 'durable', 'eastern', 'economy', 'edition', 'educate', 'elastic', 'element', 'embrace',
  'emerald', 'emotion', 'emperor', 'episode', 'equator', 'eternal', 'evening', 'exactly', 'examine', 'example',
  'exhaust', 'exhibit', 'explain', 'explore', 'express', 'extract', 'extreme', 'factory', 'faculty', 'failure',
  'fantasy', 'fashion', 'feather', 'feature', 'federal', 'feeling', 'fertile', 'fiction', 'finance', 'firefly',
  'fishing', 'fitness', 'fixture', 'flannel', 'flicker', 'florist', 'foliage', 'forever', 'formula', 'fortune',
  'forward', 'fragile', 'freedom', 'freight', 'furnace', 'gallery', 'gateway', 'gelatin', 'general', 'genuine',
  'giraffe', 'glacier', 'glimpse', 'glisten', 'goggles', 'gondola', 'gorilla', 'gourmet', 'grammar', 'granite',
  'graphic', 'gravity', 'grocery', 'gymnast', 'habitat', 'handful', 'harmony', 'harvest', 'heading', 'healthy',
  'hearing', 'herring', 'highway', 'history', 'holiday', 'horizon', 'hostile', 'housing', 'however', 'hundred',
  'iceberg', 'imagine', 'improve', 'include', 'initial', 'insight', 'inspect', 'inspire', 'install', 'janitor',
  'jasmine', 'javelin', 'jealous', 'jewelry', 'journal', 'journey', 'juniper', 'justice', 'ketchup', 'kingdom',
  'kitchen', 'knuckle', 'lantern', 'lattice', 'lecture', 'leisure', 'leopard', 'liberty', 'library', 'lobster',
  'logical', 'lozenge', 'luggage', 'machine', 'magenta', 'magical', 'mailbox', 'mammoth', 'manager', 'mansion',
  'mariner', 'massive', 'maximum', 'measure', 'mention', 'mercury', 'mermaid', 'message', 'migrate', 'mineral',
  'minimum', 'mission', 'mistake', 'mixture', 'monarch', 'monster', 'morning', 'mustard', 'mystery', 'natural',
  'neither', 'nervous', 'network', 'neutral', 'nostril', 'nothing', 'nuclear', 'nursery', 'oatmeal', 'observe',
  'obvious', 'octagon', 'octopus', 'officer', 'operate', 'opinion', 'optical', 'orchard', 'organic', 'origami',
  'ostrich', 'outdoor', 'outline', 'outlook', 'outside', 'overall', 'package', 'painter', 'palette', 'pancake',
  'panther', 'parsley', 'partner', 'passage', 'pasture', 'pattern', 'payment', 'pelican', 'penguin', 'percent',
  'perfect', 'perfume', 'perhaps', 'petunia', 'phoenix', 'picture', 'pioneer', 'pitcher', 'plastic', 'plateau',
  'platter', 'plumber', 'plywood', 'polygon', 'popcorn', 'popular', 'portion', 'pottery', 'poultry', 'precise',
  'predict', 'prepare', 'present', 'pretzel', 'prevent', 'primary', 'printer', 'private', 'problem', 'proceed',
  'process', 'produce', 'product', 'profile', 'program', 'project', 'promise', 'promote', 'protect', 'protein',
  'provide', 'publish', 'pudding', 'pumpkin', 'pyramid', 'quality', 'quarter', 'raccoon', 'rainbow', 'reactor',
  'reading', 'realize', 'rebuild', 'receipt', 'receive', 'recover', 'recycle', 'reflect', 'regular', 'release',
  'reptile', 'request', 'require', 'reserve', 'resolve', 'respect', 'respond', 'restore', 'reverse', 'rhubarb',
  'rooster', 'royalty', 'sardine', 'satchel', 'satisfy', 'sausage', 'scallop', 'scanner', 'scarlet', 'scatter',
  'scholar', 'science', 'scooter', 'scratch', 'seafood', 'service', 'serving', 'session', 'shallow', 'shampoo',
  'shelter', 'silence', 'similar', 'snorkel', 'snuggle', 'society', 'soldier', 'soprano', 'speaker', 'special',
  'species', 'spinach', 'sponsor', 'stadium', 'station', 'stellar', 'stencil', 'storage', 'stomach', 'strange',
  'stretch', 'student', 'subject', 'success', 'suggest', 'summary', 'sunrise', 'support', 'suppose', 'supreme',
  'surface', 'surgeon', 'surplus', 'survive', 'sweater', 'swimmer', 'symptom', 'syringe', 'teacher', 'terrain',
  'texture', 'theater', 'thimble', 'thunder', 'tonight', 'tornado', 'tourism', 'tourist', 'tractor', 'trailer',
  'transit', 'trapeze', 'trolley', 'trumpet', 'twinkle', 'typical', 'unicorn', 'uniform', 'unusual', 'upgrade',
  'vaccine', 'vanilla', 'variety', 'various', 'vehicle', 'venture', 'verdict', 'version', 'veteran', 'victory',
  'village', 'vinegar', 'vintage', 'visible', 'visitor', 'vitamin', 'volcano', 'voltage', 'voucher', 'voyager',
  'vulture', 'wallaby', 'warfare', 'warning', 'washing', 'weather', 'website', 'wedding', 'weekend', 'welcome',
  'welfare', 'whisker', 'whisper', 'whistle', 'wildcat', 'workout', 'worship', 'wrangle', 'wrapper',
  'wrinkle', 'younger', 'zealous', 'zeppelin', 'zoology',

  // 8-letter words
  'absolute', 'abstract', 'academic', 'accurate', 'activity', 'addition', 'adequate', 'adorable', 'advanced', 'aircraft',
  'airfield', 'alphabet', 'announce', 'anything', 'aquarium', 'armchair', 'artistic', 'assemble', 'athletic', 'audience',
  'aviation', 'backyard', 'bacteria', 'baseball', 'birthday', 'blizzard', 'boundary', 'boutique', 'building', 'bulletin',
  'business', 'calendar', 'campaign', 'cardinal', 'carnival', 'category', 'cautious', 'ceremony', 'champion', 'chestnut',
  'children', 'cinnamon', 'circular', 'clothing', 'colorful', 'commerce', 'compound', 'computer', 'concrete', 'congress',
  'consider', 'constant', 'continue', 'contract', 'contrast', 'cookbook', 'corridor', 'creature', 'cucumber', 'cupboard',
  'cylinder', 'daffodil', 'daylight', 'daughter', 'decorate', 'delicate', 'delivery', 'describe', 'designer', 'diameter',
  'dinosaur', 'discount', 'discover', 'dialogue', 'distance', 'district', 'document', 'dragonfly', 'driveway', 'duckling',
  'dumpling', 'dwelling', 'economic', 'eggplant', 'election', 'electric', 'elephant', 'elevator', 'envelope', 'equation',
  'estimate', 'evaluate', 'everyday', 'evidence', 'exchange', 'exciting', 'exercise', 'exterior', 'fabulous', 'familiar',
  'favorite', 'feedback', 'festival', 'flamingo', 'flexible', 'flounder', 'football', 'forecast', 'fortress', 'fountain',
  'fraction', 'fragment', 'freezing', 'frequent', 'friendly', 'function', 'gardener', 'generate', 'generous', 'gigantic',
  'goldfish', 'governor', 'graceful', 'graduate', 'grateful', 'greeting', 'guardian', 'guidance', 'hazelnut', 'headache',
  'heritage', 'hesitate', 'hospital', 'humorous', 'identity', 'increase', 'indicate', 'industry', 'innocent', 'interior',
  'internal', 'interval', 'inventor', 'kindness', 'knapsack', 'language', 'lavender', 'learning', 'lemonade', 'lifetime',
  'location', 'magazine', 'magnetic', 'magnolia', 'mahogany', 'mandarin', 'marigold', 'material', 'mattress', 'medicine',
  'merchant', 'midnight', 'military', 'molecule', 'momentum', 'monument', 'mosquito', 'mountain', 'mushroom', 'mustache',
  'negative', 'neighbor', 'nineteen', 'notebook', 'occasion', 'official', 'offshore', 'operator', 'opposite', 'ordinary',
  'organize', 'original', 'ornament', 'overcome', 'painting', 'parakeet', 'passport', 'password', 'patience', 'pavement',
  'pavilion', 'peaceful', 'pheasant', 'plumbing', 'polished', 'portrait', 'positive', 'possible', 'postcard', 'powerful',
  'practice', 'precious', 'preserve', 'pressure', 'princess', 'printing', 'progress', 'property', 'proposal', 'province',
  'quantity', 'question', 'radiator', 'railroad', 'rainfall', 'reaction', 'reckless', 'register', 'relative', 'reliable',
  'reminder', 'research', 'resemble', 'resident', 'resource', 'response', 'retrieve', 'sandwich', 'sapphire', 'schedule',
  'scissors', 'scorpion', 'seahorse', 'security', 'sediment', 'sentence', 'sequence', 'shoulder', 'skeleton', 'snowball',
  'snowfall', 'software', 'solution', 'somebody', 'sometime', 'songbird', 'spacious', 'splendid', 'sprinkle', 'squadron',
  'squirrel', 'stampede', 'standard', 'starfish', 'straight', 'strategy', 'strength', 'struggle', 'surprise', 'survival',
  'swimming', 'syllable', 'sympathy', 'teaspoon', 'teenager', 'template', 'terrible', 'textbook', 'thousand', 'thriller',
  'titanium', 'together', 'tomorrow', 'tortoise', 'training', 'transfer', 'treasure', 'triangle', 'tropical', 'umbrella',
  'vacation', 'valuable', 'variable', 'vertical', 'vineyard', 'wardrobe', 'wildlife', 'windmill', 'wireless', 'woodland',
  'workshop', 'yearbook', 'yourself',

  // 9-letter words
  'adventure', 'afternoon', 'agreement', 'alligator', 'ambulance', 'apartment', 'astronaut', 'attention', 'avalanche', 'awareness',
  'badminton', 'beautiful', 'beginning', 'blueberry', 'blueprint', 'breakfast', 'broadcast', 'butterfly', 'cafeteria', 'calculate',
  'cardboard', 'celebrate', 'character', 'chemistry', 'chocolate', 'classroom', 'community', 'companion', 'condition', 'conductor',
  'confident', 'continent', 'cranberry', 'crocodile', 'dangerous', 'delicious', 'detective', 'different', 'direction', 'discovery',
  'duplicate', 'education', 'emergency', 'endurance', 'energetic', 'equipment', 'essential', 'evergreen', 'excellent', 'exception',
  'expensive', 'fantastic', 'fireplace', 'flavorful', 'fragrance', 'framework', 'furniture', 'gardening', 'gathering', 'generator',
  'geography', 'gratitude', 'guarantee', 'hamburger', 'happiness', 'harmonica', 'highlight', 'household', 'hurricane', 'important',
  'influence', 'insurance', 'invention', 'invisible', 'jellyfish', 'landscape', 'laughter', 'limestone', 'machinery', 'magnitude',
  'marmalade', 'marvelous', 'meanwhile', 'miniature', 'multiply', 'musician', 'narrative', 'newspaper', 'objective', 'orchestra',
  'parachute', 'paragraph', 'passenger', 'persimmon', 'pineapple', 'porcupine', 'porcelain', 'president', 'principal', 'principle',
  'quotation', 'rectangle', 'remainder', 'sailboat', 'satellite', 'saxophone', 'scarecrow', 'sculpture', 'secretary', 'situation',
  'snowflake', 'something', 'spaceship', 'spotlight', 'statement', 'structure', 'submarine', 'sunflower', 'telephone', 'telescope',
  'therefore', 'tradition', 'transform', 'translate', 'transport', 'turquoise', 'universal', 'vegetable', 'volunteer', 'waterfall',
  'whirlpool', 'wonderful', 'xylophone', 'yesterday',

  // 10-letter words
  'accomplish', 'assignment', 'assistance', 'atmosphere', 'automobile', 'background', 'basketball', 'binoculars', 'blackberry', 'calculator',
  'camouflage', 'cantaloupe', 'chimpanzee', 'collection', 'completely', 'confidence', 'creativity', 'crossroads', 'decoration', 'department',
  'difference', 'discipline', 'elementary', 'employment', 'enthusiasm', 'experiment', 'expression', 'foundation', 'friendship', 'generation',
  'generosity', 'goalkeeper', 'government', 'grapefruit', 'greenhouse', 'helicopter', 'illustrate', 'importance', 'impressive', 'incredible',
  'individual', 'instructor', 'instrument', 'invitation', 'laboratory', 'lighthouse', 'limousine', 'literature', 'management', 'microscope',
  'motorcycle', 'pedestrian', 'peppermint', 'photograph', 'playground', 'population', 'production', 'protection', 'reflection', 'remarkable',
  'restaurant', 'settlement', 'silverware', 'skateboard', 'strawberry', 'suggestion', 'tablespoon', 'tangerine', 'television', 'themselves',
  'toothbrush', 'tournament', 'understand', 'university', 'volleyball', 'watercolor', 'watermelon', 'wheelchair', 'wilderness', 'woodpecker',

  // 11-letter words
  'agriculture', 'application', 'celebration', 'collaborate', 'combination', 'comfortable', 'communicate', 'competition', 'concentrate', 'countryside',
  'development', 'electricity', 'exploration', 'grandfather', 'grandmother', 'imagination', 'information', 'inspiration', 'instruction', 'measurement',
  'partnership', 'personality', 'requirement', 'scholarship', 'spreadsheet', 'temperature', 'thermometer', 'underground', 'workmanship',

  // 12-letter words
  'acknowledge', 'appreciation', 'architecture', 'championship', 'civilization', 'conservation', 'construction', 'conversation', 'encyclopedia', 'headquarters',
  'illustration', 'intelligence', 'introduction', 'kindergarten', 'neighborhood', 'organization', 'photographer', 'refrigerator', 'relationship', 'thanksgiving',

  // 13-letter words
  'communication', 'concentration', 'consideration', 'determination', 'entertainment', 'international', 'mathematician', 'transportation', 'understanding', 'unforgettable',

  // 14-letter words
  'administration', 'classification', 'identification', 'recommendation', 'representative', 'transformation', 'multiplication', 'congratulation', 'characteristic',

  // 15-letter words
  'experimentation', 'responsibility', 'understandings', 'recommendations', 'straightforward', 'electrification', 'disappointments',
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

/**
 * Deterministic, evenly-spread sample of the bank, capped at `perLength`
 * words for each length up to `maxLength`.
 *
 * The skeleton generator places these to build a connected grid and then
 * STRIPS them to blank slots, so it needs only enough words to interlock —
 * not the whole bank. Placement cost scales with the candidate count, so
 * capping keeps generation fast on large grids. (The full bank stays intact
 * for the visible AI-fill fallback, which wants every candidate it can get.)
 *
 * Selection strides evenly across each alphabetically-sorted length bucket,
 * so the sample is varied and identical on every run — generation stays
 * deterministic per seed.
 */
export function getWordBankSample(maxLength: number, perLength: number): string[] {
  const sample: string[] = [];
  for (let length = 3; length <= maxLength; length++) {
    const bucket = getWordBankByExactLength(length);
    if (bucket.length <= perLength) {
      sample.push(...bucket);
      continue;
    }
    for (let i = 0; i < perLength; i++) {
      sample.push(bucket[Math.floor((i * bucket.length) / perLength)]);
    }
  }
  return sample;
}

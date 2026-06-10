/**
 * Word suggestions for skeleton slots.
 *
 * The skeleton fill stage asks the teacher to invent words matching a length
 * and locked crossing letters — a frustrating constraint puzzle to do in your
 * head. This module turns it into a pick-from-a-list step:
 *
 *   - SUGGESTION_WORDS: a curated list of common, school-appropriate English
 *     words organized by length (larger than wordBank.ts, which stays small
 *     because every bank word is fed through the generator).
 *   - suggestWordsForSlot(): words matching a slot's length + constraints.
 *   - planAutoFill(): consistent fills for ALL blank slots at once, honoring
 *     the letters each fill locks into crossing slots.
 *
 * Everything is local and deterministic. No network calls.
 */

import type { SkeletonSlot } from './types';
import { WORD_BANK } from './wordBank';

/** Common English words by length, for slot suggestions. */
const SUGGESTION_WORDS: Record<number, string[]> = {
  3: [
    'act', 'age', 'air', 'ant', 'arm', 'art', 'bag', 'bat', 'bed', 'bee',
    'big', 'box', 'boy', 'bus', 'can', 'cap', 'car', 'cat', 'cow', 'cup',
    'cut', 'day', 'dig', 'dog', 'dry', 'ear', 'eat', 'egg', 'end', 'eye',
    'fan', 'far', 'fig', 'fin', 'fit', 'fly', 'fog', 'fox', 'fun', 'gas',
    'gem', 'get', 'hat', 'hen', 'hot', 'ice', 'ink', 'jar', 'jet', 'job',
    'joy', 'key', 'kid', 'lab', 'leg', 'lid', 'lip', 'log', 'low', 'map',
    'mat', 'mix', 'mud', 'net', 'new', 'nut', 'oak', 'oil', 'old', 'one',
    'owl', 'pan', 'paw', 'pen', 'pet', 'pie', 'pig', 'pin', 'pot', 'rat',
    'raw', 'red', 'rib', 'rim', 'row', 'rug', 'run', 'sea', 'set', 'sit',
    'six', 'sky', 'son', 'sun', 'tan', 'tap', 'tea', 'ten', 'tin', 'tip',
    'toe', 'top', 'toy', 'tub', 'two', 'use', 'van', 'war', 'wax', 'web',
    'wet', 'win', 'yes', 'zoo',
  ],
  4: [
    'acid', 'aged', 'area', 'army', 'atom', 'aunt', 'away', 'baby', 'back', 'ball',
    'band', 'bank', 'barn', 'base', 'bath', 'bean', 'bear', 'bell', 'belt', 'bend',
    'bird', 'blue', 'boat', 'bone', 'book', 'born', 'both', 'bowl', 'bulb', 'burn',
    'cage', 'cake', 'calm', 'camp', 'card', 'care', 'cave', 'cell', 'chin', 'city',
    'clay', 'club', 'coal', 'coat', 'code', 'coin', 'cold', 'cool', 'cope', 'core',
    'corn', 'cost', 'crew', 'crop', 'dark', 'data', 'dawn', 'deep', 'deer', 'desk',
    'dirt', 'dish', 'door', 'down', 'draw', 'drum', 'duck', 'dust', 'duty', 'each',
    'earn', 'east', 'easy', 'edge', 'envy', 'exam', 'face', 'fact', 'fall', 'farm',
    'fast', 'fear', 'fern', 'film', 'fire', 'fish', 'five', 'flag', 'flat', 'flow',
    'food', 'foot', 'fork', 'form', 'fort', 'four', 'free', 'frog', 'fuel', 'full',
    'game', 'gate', 'gear', 'gift', 'girl', 'give', 'glad', 'goal', 'goat', 'gold',
    'good', 'gray', 'grew', 'grow', 'hair', 'half', 'hall', 'hand', 'hang', 'hard',
    'harm', 'heat', 'help', 'herb', 'hero', 'hide', 'high', 'hill', 'hive', 'hold',
    'hole', 'home', 'hope', 'horn', 'hour', 'huge', 'hunt', 'idea', 'iron', 'item',
    'join', 'jump', 'june', 'jury', 'keep', 'kind', 'king', 'kite', 'knee', 'know',
    'lake', 'lamb', 'lamp', 'land', 'last', 'lawn', 'leaf', 'lean', 'left', 'lend',
    'life', 'lift', 'lime', 'line', 'lion', 'list', 'load', 'loaf', 'lock', 'long',
    'loud', 'love', 'luck', 'lung', 'made', 'mail', 'main', 'make', 'mall', 'many',
    'mark', 'mask', 'mast', 'math', 'meal', 'meat', 'milk', 'mill', 'mind', 'mine',
    'mist', 'moon', 'moss', 'most', 'moth', 'move', 'much', 'must', 'nail', 'name',
    'near', 'neck', 'nest', 'news', 'next', 'nice', 'nine', 'noon', 'nose', 'note',
    'noun', 'oven', 'over', 'page', 'pain', 'pair', 'palm', 'park', 'part', 'past',
    'path', 'peak', 'pear', 'pine', 'pink', 'plan', 'play', 'plot', 'plus', 'pond',
    'pool', 'port', 'pour', 'pull', 'pump', 'pure', 'push', 'quiz', 'race', 'rain',
    'rank', 'rare', 'rate', 'read', 'real', 'rest', 'rice', 'rich', 'ride', 'ring',
    'rise', 'risk', 'road', 'rock', 'role', 'roll', 'roof', 'room', 'root', 'rope',
    'rose', 'ruby', 'rule', 'safe', 'sail', 'salt', 'sand', 'save', 'seal', 'seat',
    'seed', 'self', 'sell', 'send', 'ship', 'shop', 'show', 'side', 'sign', 'silk',
    'sing', 'site', 'size', 'skin', 'slow', 'snow', 'soap', 'sock', 'soft', 'soil',
    'song', 'sort', 'soup', 'spin', 'spot', 'star', 'stay', 'stem', 'step', 'stop',
    'such', 'suit', 'sure', 'swim', 'tail', 'take', 'tale', 'talk', 'tall', 'tank',
    'task', 'team', 'tell', 'tent', 'term', 'test', 'text', 'than', 'them', 'then',
    'thin', 'this', 'tide', 'time', 'tiny', 'tone', 'tool', 'town', 'tree', 'trip',
    'true', 'tube', 'tune', 'turn', 'twin', 'unit', 'upon', 'vast', 'verb', 'very',
    'vine', 'vote', 'wage', 'wait', 'walk', 'wall', 'warm', 'wash', 'wave', 'weak',
    'wear', 'week', 'well', 'west', 'what', 'when', 'wide', 'wife', 'wild', 'will',
    'wind', 'wing', 'wire', 'wise', 'wish', 'wolf', 'wood', 'wool', 'word', 'work',
    'worm', 'wrap', 'yard', 'yarn', 'year', 'zero', 'zone',
  ],
  5: [
    'about', 'above', 'actor', 'adapt', 'admit', 'adopt', 'after', 'again', 'agent', 'agree',
    'ahead', 'alarm', 'alike', 'alive', 'allow', 'alone', 'along', 'among', 'angle', 'angry',
    'apple', 'apply', 'arise', 'armor', 'aside', 'asset', 'avoid', 'awake', 'award', 'aware',
    'badge', 'baker', 'basic', 'basin', 'beach', 'beard', 'began', 'begin', 'being', 'below',
    'bench', 'berry', 'birth', 'black', 'blade', 'blank', 'blast', 'blend', 'block', 'blood',
    'bloom', 'board', 'brain', 'brave', 'bread', 'break', 'brick', 'bride', 'brief', 'bring',
    'broad', 'brook', 'brown', 'brush', 'build', 'bunch', 'burst', 'cabin', 'cable', 'camel',
    'candy', 'canoe', 'cargo', 'carry', 'catch', 'cause', 'cease', 'chain', 'chair', 'chalk',
    'charm', 'chart', 'chase', 'cheap', 'check', 'cheek', 'cheer', 'chest', 'chief', 'child',
    'chose', 'civic', 'civil', 'claim', 'class', 'clean', 'clear', 'clerk', 'cliff', 'climb',
    'clock', 'close', 'cloth', 'cloud', 'coach', 'coast', 'color', 'comet', 'comic', 'coral',
    'couch', 'could', 'count', 'court', 'cover', 'crack', 'craft', 'crane', 'crash', 'cream',
    'crime', 'crisp', 'cross', 'crowd', 'crown', 'cycle', 'daily', 'dairy', 'dance', 'death',
    'delta', 'dense', 'depth', 'devil', 'diary', 'dirty', 'dozen', 'draft', 'drain', 'drama',
    'dream', 'dress', 'drift', 'drill', 'drink', 'drive', 'eagle', 'early', 'earth', 'eight',
    'elbow', 'elect', 'empty', 'enemy', 'enjoy', 'enter', 'equal', 'error', 'event', 'every',
    'exact', 'exist', 'extra', 'fable', 'faith', 'false', 'fancy', 'fault', 'favor', 'feast',
    'fence', 'fever', 'fiber', 'field', 'fifth', 'fight', 'final', 'first', 'flame', 'flash',
    'fleet', 'flesh', 'float', 'flock', 'flood', 'floor', 'flour', 'fluid', 'focus', 'force',
    'forge', 'forth', 'forum', 'found', 'frame', 'fresh', 'front', 'frost', 'fruit', 'fully',
    'funny', 'giant', 'given', 'glass', 'globe', 'glory', 'glove', 'grace', 'grade', 'grain',
    'grand', 'grant', 'grape', 'graph', 'grasp', 'grass', 'grave', 'great', 'green', 'greet',
    'group', 'guard', 'guess', 'guest', 'guide', 'habit', 'happy', 'heart', 'heavy', 'hello',
    'hence', 'hobby', 'honey', 'honor', 'horse', 'hotel', 'house', 'human', 'humor', 'ideal',
    'image', 'imply', 'index', 'inner', 'input', 'issue', 'ivory', 'jelly', 'jewel', 'joint',
    'judge', 'juice', 'knife', 'knock', 'label', 'labor', 'large', 'laser', 'later', 'laugh',
    'layer', 'learn', 'lemon', 'level', 'light', 'limit', 'liver', 'local', 'logic', 'loose',
    'lower', 'loyal', 'lucky', 'lunch', 'magic', 'major', 'maple', 'march', 'match', 'maybe',
    'mayor', 'medal', 'media', 'melon', 'mercy', 'merit', 'metal', 'meter', 'might', 'minor',
    'mixed', 'model', 'money', 'month', 'moral', 'motor', 'mount', 'mouse', 'mouth', 'movie',
    'music', 'naval', 'nerve', 'never', 'night', 'noble', 'noise', 'north', 'novel', 'nurse',
    'ocean', 'offer', 'often', 'olive', 'onion', 'orbit', 'order', 'organ', 'other', 'ought',
    'outer', 'owner', 'paint', 'panel', 'paper', 'party', 'pause', 'peace', 'pearl', 'pedal',
    'penny', 'phase', 'phone', 'photo', 'piano', 'piece', 'pilot', 'pitch', 'place', 'plain',
    'plane', 'plant', 'plate', 'plaza', 'point', 'polar', 'pound', 'power', 'press', 'price',
    'pride', 'prime', 'print', 'prize', 'proof', 'proud', 'prove', 'pupil', 'queen', 'quick',
    'quiet', 'quite', 'radar', 'radio', 'raise', 'ranch', 'range', 'rapid', 'ratio', 'reach',
    'ready', 'realm', 'rebel', 'refer', 'reign', 'relax', 'reply', 'ridge', 'right', 'rigid',
    'river', 'robot', 'rocky', 'roman', 'rough', 'round', 'route', 'royal', 'rural', 'salad',
    'scale', 'scene', 'scope', 'score', 'sense', 'serve', 'seven', 'shade', 'shake', 'shall',
    'shape', 'share', 'sharp', 'sheep', 'sheet', 'shelf', 'shell', 'shift', 'shine', 'shirt',
    'shock', 'shore', 'short', 'shout', 'sight', 'silly', 'since', 'sixth', 'skill', 'slope',
    'small', 'smart', 'smile', 'smoke', 'snake', 'solar', 'solid', 'solve', 'sound', 'south',
    'space', 'spare', 'speak', 'speed', 'spend', 'spice', 'spike', 'spite', 'split', 'sport',
    'staff', 'stage', 'stamp', 'stand', 'start', 'state', 'steam', 'steel', 'steep', 'stick',
    'still', 'stock', 'stone', 'stood', 'store', 'storm', 'story', 'stove', 'strip', 'study',
    'stuff', 'style', 'sugar', 'sunny', 'super', 'sweet', 'swift', 'sword', 'table', 'taste',
    'teach', 'thank', 'theme', 'there', 'thick', 'thing', 'think', 'third', 'those', 'three',
    'throw', 'tiger', 'tight', 'title', 'toast', 'today', 'token', 'tooth', 'topic', 'total',
    'touch', 'tough', 'tower', 'trace', 'track', 'trade', 'trail', 'train', 'treat', 'trend',
    'trial', 'tribe', 'trick', 'troop', 'truck', 'truly', 'trunk', 'trust', 'truth', 'twice',
    'uncle', 'under', 'union', 'unite', 'unity', 'until', 'upper', 'urban', 'usage', 'usual',
    'valid', 'value', 'vapor', 'visit', 'vital', 'vivid', 'vocal', 'voice', 'voter', 'wagon',
    'waste', 'watch', 'water', 'weigh', 'whale', 'wheat', 'wheel', 'where', 'which', 'while',
    'white', 'whole', 'whose', 'woman', 'world', 'worry', 'worth', 'would', 'wound', 'write',
    'wrong', 'yield', 'young', 'youth',
  ],
  6: [
    'absorb', 'accept', 'access', 'across', 'action', 'active', 'actual', 'advice', 'advise', 'affect',
    'afford', 'agency', 'agenda', 'almost', 'always', 'amount', 'anchor', 'animal', 'annual', 'answer',
    'anyone', 'anyway', 'appeal', 'appear', 'around', 'arrive', 'artist', 'aspect', 'assess', 'assign',
    'assist', 'assume', 'attach', 'attack', 'attend', 'author', 'autumn', 'avenue', 'backed', 'banana',
    'barrel', 'basket', 'battle', 'beauty', 'became', 'become', 'before', 'behalf', 'behind', 'belief',
    'belong', 'beside', 'better', 'beyond', 'bishop', 'border', 'bottle', 'bottom', 'bounce', 'branch',
    'breath', 'bridge', 'bright', 'broken', 'bronze', 'bubble', 'budget', 'bullet', 'bundle', 'burden',
    'bureau', 'button', 'camera', 'campus', 'cancer', 'candle', 'cannon', 'cannot', 'canvas', 'carbon',
    'career', 'carpet', 'castle', 'casual', 'cattle', 'caught', 'cellar', 'center', 'chance', 'change',
    'charge', 'choice', 'choose', 'chosen', 'church', 'circle', 'client', 'closed', 'closer', 'coffee',
    'column', 'combat', 'comedy', 'common', 'copper', 'corner', 'cotton', 'county', 'couple', 'course',
    'cousin', 'create', 'credit', 'crisis', 'critic', 'custom', 'damage', 'danger', 'debate', 'decade',
    'decide', 'defeat', 'defend', 'define', 'degree', 'demand', 'depend', 'deputy', 'desert', 'design',
    'desire', 'detail', 'detect', 'device', 'dinner', 'direct', 'doctor', 'dollar', 'domain', 'double',
    'dragon', 'drawer', 'driven', 'driver', 'during', 'easily', 'eating', 'editor', 'effect', 'effort',
    'eighth', 'either', 'eleven', 'emerge', 'empire', 'employ', 'enable', 'energy', 'engage', 'engine',
    'enough', 'ensure', 'entire', 'equity', 'escape', 'estate', 'ethnic', 'evolve', 'exceed', 'except',
    'excess', 'expand', 'expect', 'expert', 'export', 'extend', 'extent', 'fabric', 'factor', 'fairly',
    'fallen', 'family', 'famous', 'farmer', 'father', 'fellow', 'female', 'figure', 'finger', 'finish',
    'flight', 'flower', 'flying', 'follow', 'forest', 'forget', 'formal', 'format', 'former', 'fossil',
    'foster', 'fourth', 'freeze', 'french', 'friend', 'frozen', 'future', 'galaxy', 'garage', 'garden',
    'gather', 'gender', 'gentle', 'global', 'golden', 'ground', 'growth', 'guitar', 'handle', 'happen',
    'harbor', 'hardly', 'health', 'height', 'hidden', 'higher', 'highly', 'holder', 'hollow', 'honest',
    'hunger', 'hungry', 'hunter', 'impact', 'import', 'income', 'indeed', 'indoor', 'infant', 'inform',
    'injury', 'insect', 'inside', 'insist', 'intend', 'intent', 'invest', 'invite', 'island', 'itself',
    'jacket', 'jungle', 'junior', 'kernel', 'kidney', 'kitten', 'ladder', 'lately', 'launch', 'lawyer',
    'leader', 'league', 'legacy', 'legend', 'length', 'lesson', 'letter', 'likely', 'liquid', 'listen',
    'little', 'lively', 'living', 'locate', 'lonely', 'longer', 'louder', 'lovely', 'luxury', 'magnet',
    'mainly', 'makeup', 'mammal', 'manage', 'manner', 'marble', 'margin', 'marine', 'marker', 'market',
    'master', 'matter', 'meadow', 'medium', 'member', 'memory', 'mental', 'mentor', 'merely', 'method',
    'middle', 'mighty', 'mirror', 'mobile', 'modern', 'modest', 'module', 'moment', 'monkey', 'mostly',
    'mother', 'motion', 'murder', 'muscle', 'museum', 'mutual', 'myself', 'narrow', 'nation', 'native',
    'nature', 'nearby', 'nearly', 'needle', 'nephew', 'nicely', 'nobody', 'normal', 'notice', 'notion',
    'number', 'object', 'obtain', 'occupy', 'office', 'online', 'option', 'orange', 'origin', 'output',
    'oxygen', 'palace', 'parade', 'parent', 'partly', 'pastel', 'patrol', 'peanut', 'pebble', 'pencil',
    'people', 'pepper', 'period', 'permit', 'person', 'phrase', 'picnic', 'pillow', 'pirate', 'planet',
    'player', 'please', 'plenty', 'pocket', 'poetry', 'police', 'policy', 'pollen', 'portal', 'poster',
    'potato', 'powder', 'praise', 'prayer', 'prefer', 'pretty', 'prince', 'prison', 'profit', 'prompt',
    'proper', 'public', 'puddle', 'puppet', 'purple', 'pursue', 'puzzle', 'rabbit', 'racket', 'random',
    'rarely', 'rather', 'reader', 'really', 'reason', 'recall', 'recent', 'recipe', 'record', 'reduce',
    'reflex', 'reform', 'refuse', 'regard', 'regime', 'region', 'relate', 'relief', 'remain', 'remark',
    'remind', 'remote', 'remove', 'rental', 'repair', 'repeat', 'report', 'rescue', 'resist', 'resort',
    'result', 'retail', 'retain', 'retire', 'return', 'reveal', 'review', 'reward', 'ribbon', 'riddle',
    'rocket', 'rubber', 'sacred', 'saddle', 'safely', 'safety', 'salmon', 'sample', 'saving', 'scheme',
    'school', 'screen', 'script', 'search', 'season', 'second', 'secret', 'sector', 'secure', 'seldom',
    'select', 'senior', 'sentry', 'series', 'sermon', 'settle', 'severe', 'shadow', 'shower', 'shrimp',
    'signal', 'silent', 'silver', 'simple', 'simply', 'singer', 'single', 'sister', 'sketch', 'slight',
    'smooth', 'soccer', 'social', 'sodium', 'solely', 'sphere', 'spider', 'spirit', 'spread', 'spring',
    'square', 'stable', 'statue', 'status', 'steady', 'sticky', 'stolen', 'strain', 'strand', 'stream',
    'street', 'stress', 'strict', 'strike', 'string', 'stroke', 'strong', 'studio', 'submit', 'subtle',
    'suburb', 'sudden', 'suffer', 'summer', 'summit', 'sunset', 'supply', 'surely', 'survey', 'switch',
    'symbol', 'system', 'tackle', 'talent', 'target', 'temple', 'tender', 'tennis', 'theory', 'thirty',
    'though', 'thread', 'threat', 'thrive', 'throne', 'ticket', 'timber', 'tissue', 'toward', 'trauma',
    'travel', 'treaty', 'tunnel', 'turtle', 'twelve', 'twenty', 'unfold', 'unique', 'unless', 'unlike',
    'update', 'upward', 'urgent', 'useful', 'valley', 'velvet', 'vendor', 'verbal', 'versus', 'vessel',
    'victim', 'violet', 'virtue', 'vision', 'visual', 'volume', 'voyage', 'walker', 'wallet', 'walnut',
    'wander', 'wealth', 'weapon', 'weekly', 'weight', 'window', 'winner', 'winter', 'wisdom', 'within',
    'wonder', 'wooden', 'worker', 'writer', 'yellow',
  ],
  7: [
    'ability', 'absence', 'academy', 'account', 'achieve', 'acquire', 'address', 'advance', 'adviser', 'against',
    'airline', 'airport', 'alcohol', 'alleged', 'already', 'amazing', 'ancient', 'anxiety', 'anybody', 'anymore',
    'applied', 'approve', 'arrange', 'arrival', 'article', 'assault', 'athlete', 'attempt', 'attract', 'auction',
    'average', 'backing', 'balance', 'banking', 'barrier', 'battery', 'bedroom', 'believe', 'beneath', 'benefit',
    'besides', 'between', 'bicycle', 'billion', 'biology', 'blanket', 'blossom', 'breathe', 'brother', 'builder',
    'burning', 'cabinet', 'caliber', 'capable', 'capital', 'captain', 'capture', 'careful', 'carrier', 'caution',
    'ceiling', 'central', 'century', 'certain', 'chamber', 'channel', 'chapter', 'charity', 'charter', 'chicken',
    'chimney', 'circuit', 'citizen', 'classic', 'climate', 'clothes', 'cluster', 'coastal', 'collect', 'college',
    'combine', 'comfort', 'command', 'comment', 'company', 'compare', 'compete', 'complex', 'concept', 'concern',
    'concert', 'conduct', 'confirm', 'connect', 'consist', 'contact', 'contain', 'content', 'contest', 'context',
    'control', 'convert', 'cooking', 'correct', 'cottage', 'council', 'counter', 'country', 'courage', 'crystal',
    'culture', 'curious', 'current', 'curtain', 'cushion', 'dancing', 'decline', 'default', 'defense', 'deliver',
    'density', 'deposit', 'desktop', 'despite', 'destroy', 'develop', 'devoted', 'diagram', 'diamond', 'digital',
    'dilemma', 'discuss', 'disease', 'dismiss', 'display', 'distant', 'diverse', 'divorce', 'dolphin', 'drawing',
    'dynamic', 'eastern', 'economy', 'edition', 'element', 'embrace', 'emotion', 'enhance', 'evening', 'exactly',
    'examine', 'example', 'excited', 'exclude', 'exhibit', 'expense', 'explain', 'explore', 'express', 'extreme',
    'factory', 'faculty', 'failure', 'fashion', 'feather', 'feature', 'federal', 'feeling', 'fiction', 'fifteen',
    'finance', 'finding', 'fishing', 'fitness', 'foreign', 'forever', 'formula', 'fortune', 'forward', 'freedom',
    'further', 'gallery', 'garbage', 'general', 'genuine', 'glimpse', 'graphic', 'gravity', 'grocery', 'habitat',
    'hallway', 'harmony', 'harvest', 'heading', 'healthy', 'hearing', 'heavily', 'helpful', 'herself', 'highway',
    'himself', 'history', 'holiday', 'horizon', 'housing', 'however', 'hundred', 'husband', 'iceberg', 'illegal',
    'illness', 'imagine', 'improve', 'include', 'initial', 'inquiry', 'insight', 'install', 'instant', 'instead',
    'intense', 'interim', 'involve', 'jewelry', 'journal', 'journey', 'justice', 'justify', 'kingdom', 'kitchen',
    'lantern', 'largely', 'lasting', 'laundry', 'leather', 'lecture', 'liberal', 'liberty', 'library', 'license',
    'limited', 'machine', 'manager', 'mandate', 'mansion', 'married', 'massive', 'maximum', 'meaning', 'measure',
    'medical', 'meeting', 'mention', 'message', 'million', 'mineral', 'minimum', 'miracle', 'mission', 'mistake',
    'mixture', 'monitor', 'monster', 'morning', 'musical', 'mystery', 'natural', 'neither', 'nervous', 'network',
    'nothing', 'nowhere', 'nuclear', 'nursery', 'obvious', 'offense', 'officer', 'ongoing', 'opening', 'operate',
    'opinion', 'organic', 'outcome', 'outdoor', 'outline', 'outside', 'overall', 'pacific', 'package', 'painter',
    'parking', 'partial', 'partner', 'passage', 'passion', 'patient', 'pattern', 'payment', 'penalty', 'pending',
    'pension', 'percent', 'perfect', 'perform', 'perhaps', 'persist', 'picture', 'pioneer', 'plastic', 'pleased',
    'popular', 'portion', 'poverty', 'precise', 'predict', 'premier', 'prepare', 'present', 'prevent', 'primary',
    'privacy', 'private', 'problem', 'proceed', 'process', 'produce', 'product', 'profile', 'program', 'project',
    'promise', 'promote', 'protect', 'protein', 'protest', 'provide', 'publish', 'purpose', 'pyramid', 'quality',
    'quarter', 'radical', 'rainbow', 'reading', 'reality', 'realize', 'receive', 'recover', 'reflect', 'regular',
    'related', 'release', 'remains', 'replace', 'request', 'require', 'reserve', 'resolve', 'respect', 'respond',
    'restore', 'retreat', 'reverse', 'revenue', 'routine', 'running', 'satisfy', 'science', 'section', 'segment',
    'serious', 'service', 'session', 'setting', 'seventh', 'several', 'shelter', 'sheriff', 'shortly', 'silence',
    'similar', 'sixteen', 'society', 'soldier', 'somehow', 'someone', 'speaker', 'special', 'sponsor', 'stadium',
    'station', 'storage', 'strange', 'stretch', 'student', 'subject', 'succeed', 'success', 'suggest', 'summary',
    'support', 'suppose', 'supreme', 'surface', 'surgery', 'survive', 'suspect', 'sustain', 'teacher', 'theater',
    'therapy', 'thereby', 'thought', 'through', 'thunder', 'tonight', 'totally', 'tourism', 'tourist', 'towards',
    'traffic', 'trainer', 'transit', 'trouble', 'twelfth', 'typical', 'uniform', 'unknown', 'unusual', 'upgrade',
    'usually', 'utility', 'variety', 'various', 'vehicle', 'venture', 'version', 'veteran', 'victory', 'village',
    'vintage', 'violent', 'virtual', 'visible', 'visitor', 'vitamin', 'volcano', 'warning', 'wealthy', 'weather',
    'wedding', 'weekend', 'welcome', 'welfare', 'western', 'whereas', 'whisper', 'willing', 'winning', 'witness',
    'worried',
  ],
  8: [
    'academic', 'accident', 'accurate', 'achieved', 'activity', 'actually', 'addition', 'adequate', 'advanced', 'advocate',
    'aircraft', 'alliance', 'although', 'aluminum', 'analysis', 'announce', 'annually', 'anywhere', 'apparent', 'appendix',
    'approach', 'approval', 'argument', 'artistic', 'assembly', 'athletic', 'attached', 'attitude', 'audience', 'autonomy',
    'aviation', 'bachelor', 'bacteria', 'baseball', 'bathroom', 'becoming', 'birthday', 'boundary', 'breaking', 'building',
    'bulletin', 'business', 'calendar', 'campaign', 'capacity', 'casualty', 'category', 'ceremony', 'chairman', 'champion',
    'chemical', 'children', 'civilian', 'clothing', 'collapse', 'colonial', 'commerce', 'complete', 'compound', 'comprise',
    'computer', 'conclude', 'concrete', 'conflict', 'confront', 'congress', 'consider', 'constant', 'consumer', 'continue',
    'contract', 'contrast', 'convince', 'corridor', 'coverage', 'creation', 'creative', 'criminal', 'critical', 'crossing',
    'cultural', 'currency', 'customer', 'database', 'daughter', 'daylight', 'deadline', 'decision', 'decrease', 'dedicate',
    'delicate', 'delivery', 'describe', 'designer', 'detailed', 'diabetes', 'dialogue', 'diameter', 'directly', 'director',
    'disaster', 'discount', 'discover', 'disorder', 'distance', 'distinct', 'district', 'dividend', 'division', 'doctrine',
    'document', 'domestic', 'dominant', 'dominate', 'doorstep', 'dramatic', 'dressing', 'duration', 'dynamics', 'earnings',
    'economic', 'educated', 'eighteen', 'election', 'electric', 'elephant', 'eligible', 'emphasis', 'employee', 'employer',
    'engineer', 'enormous', 'entirely', 'entrance', 'envelope', 'equation', 'estimate', 'evaluate', 'eventual', 'everyone',
    'evidence', 'exchange', 'exciting', 'exercise', 'explicit', 'exposure', 'external', 'facility', 'familiar', 'favorite',
    'feedback', 'festival', 'fighting', 'firewall', 'flagship', 'flexible', 'football', 'forecast', 'fourteen', 'fraction',
    'frequent', 'friendly', 'frontier', 'function', 'generate', 'generous', 'goodness', 'graduate', 'grateful', 'guidance',
    'handsome', 'hardware', 'heritage', 'highland', 'historic', 'homeless', 'hometown', 'hospital', 'humanity', 'identify',
    'identity', 'ideology', 'imperial', 'incident', 'increase', 'indicate', 'industry', 'informal', 'innocent', 'instance',
    'instinct', 'integral', 'intended', 'interact', 'interest', 'interior', 'internal', 'interval', 'intimate', 'invasion',
    'investor', 'involved', 'isolated', 'judgment', 'junction', 'keyboard', 'landlord', 'language', 'laughter', 'learning',
    'lifetime', 'likewise', 'literacy', 'literary', 'location', 'magazine', 'magnetic', 'mainland', 'maintain', 'majority',
    'marathon', 'marriage', 'material', 'mechanic', 'medicine', 'medieval', 'membrane', 'memorial', 'merchant', 'midnight',
    'military', 'minister', 'minority', 'mobility', 'molecule', 'momentum', 'monument', 'moreover', 'mortgage', 'mountain',
    'movement', 'multiple', 'national', 'negative', 'nineteen', 'northern', 'notebook', 'numerous', 'observer', 'obstacle',
    'occasion', 'offering', 'official', 'operator', 'opponent', 'opposite', 'optimism', 'ordinary', 'organism', 'organize',
    'original', 'outbreak', 'overcome', 'overhead', 'overseas', 'overview', 'painting', 'parallel', 'particle', 'patience',
    'peaceful', 'periodic', 'personal', 'persuade', 'petition', 'physical', 'pipeline', 'platform', 'pleasant', 'pleasure',
    'politics', 'portrait', 'position', 'positive', 'possible', 'powerful', 'practice', 'precious', 'pregnant', 'presence',
    'preserve', 'pressure', 'previous', 'princess', 'priority', 'probable', 'producer', 'profound', 'progress', 'property',
    'proposal', 'prospect', 'protocol', 'provided', 'provider', 'province', 'purchase', 'quantity', 'question', 'rational',
    'reaction', 'recently', 'recovery', 'regional', 'register', 'relation', 'relative', 'relevant', 'reliable', 'religion',
    'remember', 'reporter', 'republic', 'research', 'resident', 'resource', 'response', 'restrict', 'revision', 'rhetoric',
    'romantic', 'sandwich', 'scenario', 'schedule', 'scissors', 'scrutiny', 'seasonal', 'secondly', 'security', 'sentence',
    'separate', 'sequence', 'severely', 'shooting', 'shortage', 'shoulder', 'simplify', 'situated', 'skeleton', 'solution',
    'somebody', 'somewhat', 'southern', 'specific', 'spectrum', 'sporting', 'standard', 'standing', 'starting', 'straight',
    'strategy', 'strength', 'striking', 'struggle', 'stunning', 'suburban', 'suitable', 'sunlight', 'sunshine', 'superior',
    'surgical', 'surprise', 'survival', 'sympathy', 'syndrome', 'taxpayer', 'teaching', 'teenager', 'template', 'terminal',
    'thinking', 'thirteen', 'thousand', 'together', 'tomorrow', 'training', 'transfer', 'transmit', 'treasure', 'triangle',
    'tropical', 'turnover', 'ultimate', 'umbrella', 'universe', 'unlikely', 'vacation', 'validate', 'valuable', 'variable',
    'vertical', 'violence', 'volcanic', 'warranty', 'weakness', 'whatever', 'whenever', 'wherever', 'wildlife', 'workshop',
    'yourself',
  ],
  9: [
    'abandoned', 'accessory', 'according', 'admission', 'adventure', 'advertise', 'aftermath', 'afternoon', 'agreement', 'alignment',
    'allowance', 'ambitious', 'amendment', 'animation', 'anonymous', 'apartment', 'apologize', 'appliance', 'applicant', 'architect',
    'assistant', 'associate', 'assurance', 'astronomy', 'athletics', 'attention', 'attribute', 'authority', 'automatic', 'avalanche',
    'awareness', 'bacterium', 'bandwidth', 'basically', 'beautiful', 'beginning', 'behaviour', 'biography', 'blueprint', 'boulevard',
    'breakfast', 'brilliant', 'broadcast', 'butterfly', 'calculate', 'candidate', 'carefully', 'caretaker', 'cathedral', 'celebrate',
    'celebrity', 'certainly', 'challenge', 'character', 'chemistry', 'childhood', 'chocolate', 'classroom', 'cognitive', 'colleague',
    'collector', 'commander', 'commodity', 'community', 'companion', 'component', 'composite', 'concerned', 'condition', 'confusion',
    'conscious', 'consensus', 'construct', 'container', 'continent', 'criterion', 'crocodile', 'crossroad', 'curiosity', 'dangerous',
    'dashboard', 'deduction', 'defendant', 'delicious', 'departure', 'dependent', 'desperate', 'detective', 'determine', 'developer',
    'diagnosis', 'different', 'difficult', 'dimension', 'direction', 'disappear', 'discharge', 'discourse', 'discovery', 'diversity',
    'editorial', 'education', 'effective', 'efficient', 'elaborate', 'elevation', 'eliminate', 'emergency', 'emotional', 'emphasize',
    'encounter', 'endurance', 'equipment', 'essential', 'establish', 'evolution', 'excellent', 'exception', 'excessive', 'exclusive',
    'execution', 'executive', 'existence', 'expansion', 'expensive', 'explosion', 'extension', 'extensive', 'extremely', 'fascinate',
    'favourite', 'fifteenth', 'financial', 'fireplace', 'following', 'formation', 'framework', 'frequency', 'furniture', 'gathering',
    'generally', 'gentleman', 'gradually', 'guarantee', 'guideline', 'happiness', 'highlight', 'historian', 'household', 'hurricane',
    'identical', 'immediate', 'important', 'incentive', 'inclusion', 'incumbent', 'indicator', 'inflation', 'influence', 'initially',
    'insurance', 'integrate', 'intensity', 'intention', 'interface', 'interpret', 'interview', 'intuition', 'invention', 'inventory',
    'invisible', 'irregular', 'judgement', 'knowledge', 'landscape', 'lifestyle', 'lightning', 'limestone', 'logistics', 'machinery',
    'magnitude', 'mandatory', 'marketing', 'meanwhile', 'mechanism', 'messenger', 'milestone', 'miniature', 'narrative', 'naturally',
    'necessary', 'neighbour', 'nightmare', 'northeast', 'northwest', 'nutrition', 'objection', 'objective', 'obsession', 'obviously',
    'offensive', 'operation', 'orchestra', 'organizer', 'otherwise', 'ourselves', 'overnight', 'paragraph', 'parameter', 'partially',
    'passenger', 'patriotic', 'perfectly', 'permanent', 'personnel', 'physician', 'pollution', 'potential', 'practical', 'precision',
    'prejudice', 'preschool', 'president', 'primarily', 'principal', 'principle', 'privilege', 'procedure', 'processor', 'professor',
    'provision', 'publisher', 'qualified', 'radiation', 'rationale', 'recession', 'recipient', 'recognize', 'recommend', 'recording',
    'reduction', 'redundant', 'reference', 'rehearsal', 'rejection', 'relevance', 'reluctant', 'remainder', 'represent', 'reproduce',
    'reservoir', 'retention', 'satellite', 'sensitive', 'seventeen', 'signature', 'situation', 'sixteenth', 'something', 'sometimes',
    'somewhere', 'sophomore', 'southeast', 'southwest', 'spectacle', 'spokesman', 'stability', 'statement', 'statistic', 'stimulate',
    'strategic', 'structure', 'substance', 'successor', 'supporter', 'surprised', 'technical', 'technique', 'telephone', 'telescope',
    'temporary', 'territory', 'testimony', 'therefore', 'threshold', 'tolerance', 'tradition', 'translate', 'transport', 'treatment',
    'twentieth', 'undermine', 'undertake', 'universal', 'variation', 'vegetable', 'violation', 'voluntary', 'volunteer', 'warehouse',
    'waterfall', 'wonderful', 'workforce', 'yesterday',
  ],
  10: [
    'absolutely', 'acceptance', 'accessible', 'accomplish', 'accounting', 'accurately', 'additional', 'adjustment', 'admiration', 'adolescent',
    'adventures', 'aggressive', 'altogether', 'ambassador', 'apparently', 'appearance', 'appreciate', 'aspiration', 'assessment', 'assignment',
    'assistance', 'assumption', 'atmosphere', 'attachment', 'attraction', 'attractive', 'automobile', 'background', 'basketball', 'beforehand',
    'biological', 'birthplace', 'blacksmith', 'censorship', 'centennial', 'changeable', 'chimpanzee', 'chromosome', 'collection', 'collective',
    'commercial', 'commission', 'commitment', 'comparable', 'comparison', 'competence', 'competitor', 'complexity', 'compliance', 'conclusion',
    'conference', 'confidence', 'connection', 'conscience', 'consistent', 'constraint', 'consultant', 'continuous', 'convention', 'conversion',
    'conviction', 'coordinate', 'creativity', 'curriculum', 'decoration', 'dedication', 'definition', 'democratic', 'department', 'dependence',
    'deployment', 'depression', 'dictionary', 'difference', 'difficulty', 'dimensions', 'diplomatic', 'discipline', 'discussion', 'dishwasher',
    'disorderly', 'disruption', 'efficiency', 'electronic', 'employment', 'engagement', 'enterprise', 'enthusiasm', 'equivalent', 'evaluation',
    'eventually', 'everything', 'excellence', 'excitement', 'exhibition', 'expedition', 'experience', 'experiment', 'expression', 'foundation',
    'friendship', 'generation', 'graduation', 'grandchild', 'grapefruit', 'helicopter', 'highschool', 'historical', 'horsepower', 'hypothesis',
    'illuminate', 'illustrate', 'impression', 'impressive', 'incredible', 'individual', 'industrial', 'initiative', 'innovation', 'inspection',
    'instructor', 'instrument', 'integrated', 'investment', 'invitation', 'journalism', 'journalist', 'laboratory', 'leadership', 'legitimate',
    'lighthouse', 'limitation', 'literature', 'management', 'mechanical', 'membership', 'memorandum', 'millennium', 'motivation', 'motorcycle',
    'navigation', 'newsletter', 'nomination', 'occupation', 'opposition', 'optimistic', 'particular', 'peacefully', 'percentage', 'perception',
    'permission', 'phenomenon', 'philosophy', 'photograph', 'playground', 'population', 'possession', 'prediction', 'preference', 'presidency',
    'prevention', 'production', 'profession', 'proportion', 'protection', 'psychology', 'reasonable', 'reflection', 'regulation', 'reputation',
    'resolution', 'restaurant', 'retirement', 'revolution', 'satisfying', 'screenplay', 'simplicity', 'skyscraper', 'strawberry', 'submission',
    'subsequent', 'successful', 'sufficient', 'suggestion', 'technology', 'television', 'themselves', 'tournament', 'trampoline', 'transition',
    'underneath', 'understand', 'university', 'vegetables', 'vocabulary', 'volleyball', 'waterproof', 'watermelon', 'wilderness', 'windshield',
  ],
  11: [
    'achievement', 'acknowledge', 'alternative', 'anniversary', 'anticipated', 'application', 'appointment', 'appropriate', 'arrangement', 'association',
    'celebration', 'centerpiece', 'certificate', 'cholesterol', 'circulation', 'combination', 'comfortable', 'communicate', 'competition', 'competitive',
    'composition', 'consequence', 'consistency', 'consumption', 'controversy', 'convenience', 'cooperation', 'declaration', 'demonstrate', 'description',
    'destination', 'development', 'distinction', 'distinguish', 'electricity', 'engineering', 'environment', 'established', 'examination', 'expectation',
    'experienced', 'explanation', 'exploration', 'firefighter', 'fundamental', 'grandmother', 'grandfather', 'hummingbird', 'imagination', 'immediately',
    'improvement', 'independent', 'information', 'inheritance', 'inspiration', 'institution', 'instruction', 'integration', 'interaction', 'interesting',
    'investigate', 'maintenance', 'mathematics', 'measurement', 'minneapolis', 'necessarily', 'negotiation', 'observation', 'opportunity', 'orientation',
    'partnership', 'performance', 'perspective', 'photography', 'possibility', 'preparation', 'progressive', 'publication', 'punctuation', 'recognition',
    'reservation', 'restriction', 'significant', 'spectacular', 'sponsorship', 'temperature', 'territorial', 'traditional', 'transaction', 'transparent',
    'underground', 'understands',
  ],
  12: [
    'acceleration', 'accomplished', 'amphitheater', 'announcement', 'anticipation', 'appreciation', 'architecture', 'championship', 'civilization', 'colonization',
    'conservation', 'construction', 'contribution', 'conversation', 'distribution', 'encyclopedia', 'experimental', 'headquarters', 'hippopotamus', 'illustration',
    'independence', 'installation', 'intelligence', 'intermediate', 'introduction', 'kindergarten', 'neighborhood', 'organization', 'photographer', 'presentation',
    'professional', 'refrigerator', 'relationship', 'significance', 'subscription', 'transmission',
  ],
};

/**
 * All suggestion words for a given length: the curated suggestion list
 * merged with the word bank (which is also high-quality but smaller).
 */
export function getSuggestionWordsByLength(length: number): string[] {
  const fromList = SUGGESTION_WORDS[length] ?? [];
  const fromBank = WORD_BANK.filter(w => w.length === length);
  // List first (frequency-ish curation), bank appended minus duplicates
  const seen = new Set(fromList);
  const merged = [...fromList];
  for (const word of fromBank) {
    if (!seen.has(word)) {
      merged.push(word);
      seen.add(word);
    }
  }
  return merged;
}

/**
 * Words matching a slot: exact length, every constrained position agrees,
 * and not already used elsewhere in the puzzle.
 *
 * @param length      Slot length.
 * @param constraints Locked letters: position (0-based) → lowercase letter.
 * @param exclude     Words already used in the puzzle (any slot or edit).
 * @param limit       Maximum suggestions to return.
 */
export function suggestWordsForSlot(
  length: number,
  constraints: Map<number, string>,
  exclude: Set<string>,
  limit: number,
): string[] {
  const candidates = getSuggestionWordsByLength(length);
  const results: string[] = [];

  for (const word of candidates) {
    if (exclude.has(word)) continue;
    if (!matchesConstraints(word, constraints)) continue;
    results.push(word);
    if (results.length >= limit) break;
  }

  return results;
}

function matchesConstraints(word: string, constraints: Map<number, string>): boolean {
  for (const [pos, letter] of constraints) {
    if (word[pos] !== letter) return false;
  }
  return true;
}

/**
 * Plan fills for every blank slot at once.
 *
 * Filling one slot locks letters into the slots crossing it, so fills are
 * chosen sequentially against a virtual grid: most-constrained slots first,
 * each fill immediately written so later choices respect it. Deterministic —
 * the first matching suggestion always wins.
 *
 * Slots that already have an edit are respected as fixed. Returns only the
 * newly planned fills; slots with no matching word are simply absent.
 */
export function planAutoFill(
  slots: SkeletonSlot[],
  existingEdits: Map<number, { word: string }>,
): Map<number, string> {
  // Virtual letter grid: cell key "x,y" → letter
  const letters = new Map<string, string>();

  const writeWord = (slot: SkeletonSlot, word: string) => {
    for (let i = 0; i < word.length; i++) {
      const x = slot.direction === 'across' ? slot.startX + i : slot.startX;
      const y = slot.direction === 'across' ? slot.startY : slot.startY + i;
      letters.set(`${x},${y}`, word[i]);
    }
  };

  const usedWords = new Set<string>();

  // Seed the grid with user words and existing edits
  for (const slot of slots) {
    if (slot.isUserWord && slot.word) {
      writeWord(slot, slot.word);
      usedWords.add(slot.word);
    } else {
      const edit = existingEdits.get(slot.id);
      if (edit && edit.word.length === slot.length) {
        writeWord(slot, edit.word);
        usedWords.add(edit.word);
      }
    }
  }

  // Blank slots, most-constrained first (then longest — harder to fill late)
  const blanks = slots
    .filter(s => !s.isUserWord && (existingEdits.get(s.id)?.word.length ?? 0) !== s.length)
    .sort((a, b) => {
      const constraintDiff = countGridConstraints(b, letters) - countGridConstraints(a, letters);
      if (constraintDiff !== 0) return constraintDiff;
      return b.length - a.length;
    });

  const planned = new Map<number, string>();

  for (const slot of blanks) {
    const constraints = readGridConstraints(slot, letters);
    // Take a batch of matches and pick by slot id — still deterministic,
    // but avoids every fill clustering at the start of the alphabet.
    const candidates = suggestWordsForSlot(slot.length, constraints, usedWords, 24);
    if (candidates.length === 0) continue;
    const choice = candidates[(slot.id * 13) % candidates.length];

    planned.set(slot.id, choice);
    writeWord(slot, choice);
    usedWords.add(choice);
  }

  return planned;
}

function readGridConstraints(slot: SkeletonSlot, letters: Map<string, string>): Map<number, string> {
  const constraints = new Map<number, string>();
  for (let i = 0; i < slot.length; i++) {
    const x = slot.direction === 'across' ? slot.startX + i : slot.startX;
    const y = slot.direction === 'across' ? slot.startY : slot.startY + i;
    const letter = letters.get(`${x},${y}`);
    if (letter) constraints.set(i, letter);
  }
  return constraints;
}

function countGridConstraints(slot: SkeletonSlot, letters: Map<string, string>): number {
  return readGridConstraints(slot, letters).size;
}

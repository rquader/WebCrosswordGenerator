/**
 * Built-in word packs — curated word/clue sets for common classroom subjects.
 *
 * A teacher picks a pack instead of typing or importing a list. All words
 * are lowercase a-z (already normalized), 3-14 letters, clues under
 * 80 characters. Bundled with the app: no fetching, no network calls.
 */

import type { WordCluePair } from '../logic/types';

export interface WordPack {
  id: string;
  name: string;
  description: string;
  entries: WordCluePair[];
}

const biology: WordPack = {
  id: 'biology',
  name: 'Biology',
  description: 'Cells, genetics, and ecosystems (grades 9-10)',
  entries: [
    { word: 'mitosis', clue: 'Cell division producing two identical daughter cells' },
    { word: 'osmosis', clue: 'Water movement across a membrane' },
    { word: 'nucleus', clue: 'Organelle that contains DNA' },
    { word: 'allele', clue: 'One version of a gene' },
    { word: 'protein', clue: 'Molecule built from amino acids' },
    { word: 'enzyme', clue: 'Protein that speeds up a reaction' },
    { word: 'ecosystem', clue: 'Community of organisms and their environment' },
    { word: 'habitat', clue: 'Where an organism naturally lives' },
    { word: 'predator', clue: 'Animal that hunts other animals' },
    { word: 'bacteria', clue: 'Single-celled organisms without a nucleus' },
    { word: 'virus', clue: 'Tiny infectious agent that needs a host' },
    { word: 'evolution', clue: 'Change in species over generations' },
    { word: 'mutation', clue: 'Change in a DNA sequence' },
    { word: 'gene', clue: 'Unit of heredity' },
    { word: 'cell', clue: 'Basic unit of life' },
    { word: 'membrane', clue: 'Boundary that controls what enters a cell' },
    { word: 'ribosome', clue: 'Site of protein synthesis' },
    { word: 'glucose', clue: 'Sugar that cells burn for energy' },
    { word: 'oxygen', clue: 'Gas released by photosynthesis' },
    { word: 'carbon', clue: 'Element in all organic molecules' },
    { word: 'species', clue: 'Group able to breed with each other' },
    { word: 'organism', clue: 'Any living thing' },
    { word: 'tissue', clue: 'Group of similar cells working together' },
    { word: 'organ', clue: 'Body structure made of tissues, like the heart' },
    { word: 'neuron', clue: 'Nerve cell that carries signals' },
    { word: 'hormone', clue: 'Chemical messenger in the blood' },
    { word: 'antibody', clue: 'Immune protein that targets invaders' },
    { word: 'fossil', clue: 'Preserved remains of ancient life' },
    { word: 'genome', clue: 'An organism\'s complete set of DNA' },
    { word: 'heredity', clue: 'Passing of traits from parents to offspring' },
    { word: 'diffusion', clue: 'Particles spreading from high to low concentration' },
    { word: 'symbiosis', clue: 'Two species living closely together' },
  ],
};

const usHistory: WordPack = {
  id: 'us-history',
  name: 'US History',
  description: 'Founding era through civil rights (grade 8 / APUSH)',
  entries: [
    { word: 'constitution', clue: 'Supreme law of the United States' },
    { word: 'amendment', clue: 'Formal change to the Constitution' },
    { word: 'congress', clue: 'Legislative branch of the federal government' },
    { word: 'federalism', clue: 'Power shared between states and nation' },
    { word: 'abolition', clue: 'Movement to end slavery' },
    { word: 'suffrage', clue: 'The right to vote' },
    { word: 'colony', clue: 'Settlement ruled by a distant country' },
    { word: 'revolution', clue: 'War for American independence' },
    { word: 'declaration', clue: 'Document announcing independence in 1776' },
    { word: 'liberty', clue: 'Freedom from oppressive control' },
    { word: 'democracy', clue: 'Government by the people' },
    { word: 'republic', clue: 'Government of elected representatives' },
    { word: 'frontier', clue: 'Edge of settled territory' },
    { word: 'pioneer', clue: 'Early settler of a new region' },
    { word: 'expansion', clue: 'Growth of the nation westward' },
    { word: 'secession', clue: 'Southern states leaving the Union' },
    { word: 'emancipation', clue: 'Lincoln\'s proclamation freeing the enslaved' },
    { word: 'reconstruction', clue: 'Rebuilding the South after the Civil War' },
    { word: 'immigration', clue: 'Moving to a new country to live' },
    { word: 'industry', clue: 'Large-scale manufacturing' },
    { word: 'railroad', clue: 'Transcontinental link completed in 1869' },
    { word: 'progressive', clue: 'Reform movement of the early 1900s' },
    { word: 'depression', clue: 'The Great economic collapse of the 1930s' },
    { word: 'newdeal', clue: 'FDR\'s programs to fight the Depression' },
    { word: 'coldwar', clue: 'US-Soviet rivalry without direct battle' },
    { word: 'segregation', clue: 'Forced separation by race' },
    { word: 'boycott', clue: 'Protest by refusing to buy or use' },
    { word: 'integration', clue: 'Ending separation of races' },
    { word: 'monopoly', clue: 'Company controlling an entire market' },
    { word: 'treaty', clue: 'Formal agreement between nations' },
    { word: 'tariff', clue: 'Tax on imported goods' },
    { word: 'veto', clue: 'President\'s power to reject a bill' },
  ],
};

const spanishBasics: WordPack = {
  id: 'spanish-basics',
  name: 'Spanish Basics',
  description: 'Core vocabulary with English clues (Spanish I/II)',
  entries: [
    { word: 'casa', clue: 'House' },
    { word: 'escuela', clue: 'School' },
    { word: 'libro', clue: 'Book' },
    { word: 'perro', clue: 'Dog' },
    { word: 'gato', clue: 'Cat' },
    { word: 'agua', clue: 'Water' },
    { word: 'comida', clue: 'Food' },
    { word: 'familia', clue: 'Family' },
    { word: 'amigo', clue: 'Friend (male)' },
    { word: 'ciudad', clue: 'City' },
    { word: 'tiempo', clue: 'Time, or weather' },
    { word: 'trabajo', clue: 'Work or job' },
    { word: 'dinero', clue: 'Money' },
    { word: 'ventana', clue: 'Window' },
    { word: 'puerta', clue: 'Door' },
    { word: 'mesa', clue: 'Table' },
    { word: 'silla', clue: 'Chair' },
    { word: 'coche', clue: 'Car' },
    { word: 'verde', clue: 'Green' },
    { word: 'rojo', clue: 'Red' },
    { word: 'azul', clue: 'Blue' },
    { word: 'blanco', clue: 'White' },
    { word: 'negro', clue: 'Black' },
    { word: 'grande', clue: 'Big' },
    { word: 'pequeno', clue: 'Small (sin tilde)' },
    { word: 'feliz', clue: 'Happy' },
    { word: 'triste', clue: 'Sad' },
    { word: 'manzana', clue: 'Apple' },
    { word: 'naranja', clue: 'Orange (fruit or color)' },
    { word: 'leche', clue: 'Milk' },
    { word: 'pan', clue: 'Bread' },
    { word: 'queso', clue: 'Cheese' },
    { word: 'hermano', clue: 'Brother' },
    { word: 'madre', clue: 'Mother' },
    { word: 'padre', clue: 'Father' },
  ],
};

const satVocab: WordPack = {
  id: 'sat-vocab',
  name: 'SAT Vocabulary',
  description: 'High-frequency test prep words (grades 10-12)',
  entries: [
    { word: 'ubiquitous', clue: 'Found everywhere at once' },
    { word: 'ephemeral', clue: 'Lasting a very short time' },
    { word: 'pragmatic', clue: 'Practical rather than idealistic' },
    { word: 'eloquent', clue: 'Fluent and persuasive in speech' },
    { word: 'ambiguous', clue: 'Open to more than one interpretation' },
    { word: 'benevolent', clue: 'Kind and well-meaning' },
    { word: 'candid', clue: 'Truthful and straightforward' },
    { word: 'diligent', clue: 'Showing careful, persistent effort' },
    { word: 'empathy', clue: 'Ability to share another\'s feelings' },
    { word: 'frugal', clue: 'Sparing with money or resources' },
    { word: 'gregarious', clue: 'Fond of company; sociable' },
    { word: 'hypothesis', clue: 'Proposed explanation to be tested' },
    { word: 'innovative', clue: 'Introducing new ideas or methods' },
    { word: 'meticulous', clue: 'Showing great attention to detail' },
    { word: 'novice', clue: 'A beginner' },
    { word: 'obsolete', clue: 'No longer in use; outdated' },
    { word: 'plausible', clue: 'Seeming reasonable or probable' },
    { word: 'resilient', clue: 'Able to recover quickly' },
    { word: 'skeptical', clue: 'Inclined to doubt' },
    { word: 'tenacious', clue: 'Holding firmly; persistent' },
    { word: 'verbose', clue: 'Using more words than needed' },
    { word: 'zealous', clue: 'Filled with intense enthusiasm' },
    { word: 'apathy', clue: 'Lack of interest or concern' },
    { word: 'concise', clue: 'Brief but comprehensive' },
    { word: 'deter', clue: 'Discourage from acting' },
    { word: 'elated', clue: 'Extremely happy' },
    { word: 'feasible', clue: 'Possible to do easily' },
    { word: 'indifferent', clue: 'Having no particular interest' },
    { word: 'lucid', clue: 'Clear and easy to understand' },
    { word: 'mundane', clue: 'Ordinary; lacking excitement' },
    { word: 'prudent', clue: 'Acting with care for the future' },
    { word: 'scrutinize', clue: 'Examine closely and critically' },
  ],
};

export const WORD_PACKS: WordPack[] = [biology, usHistory, spanishBasics, satVocab];

export function getWordPackById(id: string): WordPack | undefined {
  return WORD_PACKS.find(pack => pack.id === id);
}

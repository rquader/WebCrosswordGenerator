/**
 * Central database of all preset word packs.
 *
 * Each unit is stored in its own file under src/presets/ for modularity.
 * This file re-exports them as a single collection with metadata.
 *
 * Original data by Kabir Khan, Armaan Saini, Atharva Ahir, Rafan Quader.
 * Note: usHistory was declared but never initialized in the Java version,
 * so it is intentionally omitted here.
 */

import type { PresetCategory } from './types';
import { unit_1 } from '../presets/unit_1';
import { unit_2 } from '../presets/unit_2';
import { unit_3 } from '../presets/unit_3';
import { unit_4 } from '../presets/unit_4';
import { unit_5 } from '../presets/unit_5';
import { unit_6 } from '../presets/unit_6';
import { unit_7 } from '../presets/unit_7';
import { unit_8 } from '../presets/unit_8';
import { english } from '../presets/english';

/**
 * All available preset categories.
 * Each contains an id (matching the Java category names), a display name,
 * a short description, and the full list of word-clue pairs.
 */
export const presetCategories: PresetCategory[] = [
  {
    id: 'unit_1',
    name: 'Unit 1 — CS Fundamentals',
    description: 'Variables, types, operators, and basic Java syntax',
    entries: unit_1,
  },
  {
    id: 'unit_2',
    name: 'Unit 2 — Object-Oriented Programming',
    description: 'Classes, objects, inheritance, and encapsulation',
    entries: unit_2,
  },
  {
    id: 'unit_3',
    name: 'Unit 3 — Boolean Logic & Conditionals',
    description: 'Boolean expressions, if/else, and switch statements',
    entries: unit_3,
  },
  {
    id: 'unit_4',
    name: 'Unit 4 — Iteration & Loops',
    description: 'For loops, while loops, and iteration patterns',
    entries: unit_4,
  },
  {
    id: 'unit_5',
    name: 'Unit 5 — Writing Classes',
    description: 'Methods, constructors, access modifiers, and scope',
    entries: unit_5,
  },
  {
    id: 'unit_6',
    name: 'Unit 6 — Arrays',
    description: 'Array creation, traversal, and common algorithms',
    entries: unit_6,
  },
  {
    id: 'unit_7',
    name: 'Unit 7 — ArrayList & Collections',
    description: 'ArrayList operations, wrapper classes, and autoboxing',
    entries: unit_7,
  },
  {
    id: 'unit_8',
    name: 'Unit 8 — 2D Arrays & Advanced Topics',
    description: 'Two-dimensional arrays, recursion, and searching/sorting',
    entries: unit_8,
  },
  {
    id: 'english',
    name: 'English — Literary & Grammar Terms',
    description: 'Literary devices, grammar, and writing terminology',
    entries: english,
  },
];

/**
 * Look up a preset category by its id.
 * Matches Java's Database.getUnitByName() behavior.
 */
export function getCategoryById(id: string): PresetCategory | undefined {
  return presetCategories.find(cat => cat.id === id.toLowerCase());
}

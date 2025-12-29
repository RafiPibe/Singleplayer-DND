import { ABILITIES } from './abilities.js';

export const RACES = [
  {
    name: 'Dwarf',
    base: { Constitution: 2 },
    variants: [
      { label: '+2 Strength', boosts: { Strength: 2 } },
      { label: '+1 Strength', boosts: { Strength: 1 } },
      { label: '+1 Intelligence', boosts: { Intelligence: 1 } },
      { label: '+1 Wisdom', boosts: { Wisdom: 1 } },
    ],
  },
  {
    name: 'Elf',
    base: { Dexterity: 2 },
    variants: [
      { label: '+1 Constitution', boosts: { Constitution: 1 } },
      { label: '+1 Intelligence', boosts: { Intelligence: 1 } },
      { label: '+1 Wisdom', boosts: { Wisdom: 1 } },
      { label: '+1 Charisma', boosts: { Charisma: 1 } },
    ],
  },
  {
    name: 'Gnome',
    base: { Intelligence: 2 },
    variants: [
      { label: '+1 Constitution', boosts: { Constitution: 1 } },
      { label: '+1 Dexterity', boosts: { Dexterity: 1 } },
      { label: '+1 Charisma', boosts: { Charisma: 1 } },
    ],
  },
  {
    name: 'Goblin',
    base: { Dexterity: 2, Constitution: 1 },
  },
  {
    name: 'Halfling',
    base: { Dexterity: 2 },
    variants: [
      { label: '+1 Constitution', boosts: { Constitution: 1 } },
      { label: '+1 Wisdom', boosts: { Wisdom: 1 } },
      { label: '+1 Charisma', boosts: { Charisma: 1 } },
    ],
  },
  {
    name: 'Human',
    base: {
      Strength: 1,
      Dexterity: 1,
      Constitution: 1,
      Intelligence: 1,
      Wisdom: 1,
      Charisma: 1,
    },
  },
  {
    name: 'Orc',
    base: { Strength: 2, Constitution: 1 },
  },
  {
    name: 'Hobgoblin',
    base: { Constitution: 2, Intelligence: 1 },
  },
  {
    name: 'Kenku',
    base: { Dexterity: 2, Wisdom: 1 },
  },
  {
    name: 'Kobold',
    base: { Dexterity: 2 },
  },
  {
    name: 'Lizardfolk',
    base: { Constitution: 2, Wisdom: 1 },
  },
  {
    name: 'Tabaxi',
    base: { Dexterity: 2, Charisma: 1 },
  },
  {
    name: 'Triton',
    base: { Strength: 1, Constitution: 1, Charisma: 1 },
  },
  {
    name: 'Aarakocra',
    base: { Dexterity: 2, Wisdom: 1 },
  },
  {
    name: 'Hybrid',
    base: { Constitution: 2 },
    choices: [
      {
        label: '+1 Other',
        amount: 1,
        options: ABILITIES.filter((ability) => ability !== 'Constitution'),
      },
    ],
  },
  {
    name: 'Warforged',
    base: { Constitution: 2 },
    choices: [
      {
        label: '+1 Other',
        amount: 1,
        options: ABILITIES.filter((ability) => ability !== 'Constitution'),
      },
    ],
  },
  {
    name: 'Grung',
    base: { Dexterity: 2, Constitution: 1 },
  },
  {
    name: 'Fairy',
    variants: [
      {
        label: '+2 Any, +1 Other',
        choices: [
          { label: '+2 Any', amount: 2, options: ABILITIES },
          { label: '+1 Other', amount: 1, options: ABILITIES },
        ],
        unique: true,
      },
      {
        label: '+1 Any, +1 Other, +1 Other',
        choices: [
          { label: '+1 Any', amount: 1, options: ABILITIES },
          { label: '+1 Other', amount: 1, options: ABILITIES },
          { label: '+1 Other', amount: 1, options: ABILITIES },
        ],
        unique: true,
      },
    ],
  },
  {
    name: 'Dhampir',
    variants: [
      {
        label: '+2 Any, +1 Other',
        choices: [
          { label: '+2 Any', amount: 2, options: ABILITIES },
          { label: '+1 Other', amount: 1, options: ABILITIES },
        ],
        unique: true,
      },
      {
        label: '+1 Any, +1 Other, +1 Other',
        choices: [
          { label: '+1 Any', amount: 1, options: ABILITIES },
          { label: '+1 Other', amount: 1, options: ABILITIES },
          { label: '+1 Other', amount: 1, options: ABILITIES },
        ],
        unique: true,
      },
    ],
  },
  {
    name: 'Custom',
    choices: [
      {
        label: '+3 Any',
        amount: 3,
        options: ABILITIES,
      },
    ],
  },
];

export const ABILITIES = [
  'Strength',
  'Dexterity',
  'Constitution',
  'Intelligence',
  'Wisdom',
  'Charisma',
];

export const SKILLS_BY_ABILITY = {
  Strength: ['Athletics'],
  Dexterity: ['Acrobatics', 'Sleight of Hand', 'Stealth'],
  Constitution: [],
  Intelligence: ['Arcana', 'History', 'Investigation', 'Nature', 'Religion'],
  Wisdom: ['Animal Handling', 'Insight', 'Medicine', 'Perception', 'Survival'],
  Charisma: ['Deception', 'Intimidation', 'Performance', 'Persuasion'],
};

export const SKILLS = Object.values(SKILLS_BY_ABILITY).flat();

export const getAbilityModifier = (score) => {
  const value = Number.isFinite(score) ? score : 10;
  return Math.floor((value - 10) / 2);
};

export const getSaveModifier = (score) => {
  const value = Number.isFinite(score) ? score : 10;
  const modifier = Math.floor((value - 10) / 2);
  return Math.min(5, Math.max(0, modifier));
};

export const getAbilityRequirement = (score) => {
  const value = Number.isFinite(score) ? score : 10;
  if (value >= 30) return null;
  if (value <= 1) return 2;
  if (value <= 3) return 3;
  if (value <= 5) return 4;
  if (value <= 7) return 5;
  if (value <= 9) return 6;
  if (value <= 11) return 7;
  if (value <= 13) return 8;
  if (value <= 15) return 10;
  if (value <= 17) return 12;
  if (value <= 19) return 14;
  if (value <= 21) return 18;
  if (value <= 23) return 22;
  if (value <= 25) return 28;
  if (value <= 27) return 34;
  if (value <= 29) return 42;
  return 50;
};

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

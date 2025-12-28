export const STATS = [
  'Investigation',
  'Aim',
  'Brawling',
  'One Handed',
  'Acrobatics',
  'Stealth',
  'Deception',
  'Performance',
  'Seduction',
  'Regeneration',
  'Alteration',
  'Illusion',
  'Bartering',
  'Climbing',
  'Beastmastery',
  'Ranged',
  'Two Handed',
  'Sleight Of Hand',
  'Lockpicking',
  'Persuasion',
  'Intimidation',
  'Destruction',
  'Necromancy',
  'Bloodmancy',
  'Soulbinding',
];

export const REPUTATION = ['Honor', 'Bravery', 'Justice', 'Mercy', 'Loyalty', 'Generosity'];

const BASE_STAT = 3;
const CLASS_STATS = 7;
const SECONDARY_STATS = 5;
const LOW_STATS = 2;

export const CLASSES = [
  {
    nickname: 'Vanguard',
    role: 'Knight',
    name: 'Vanguard Knight',
    description: 'Oathbound protector with steel nerves and a banner on their back.',
    hp: 24,
    strengths: ['Two Handed', 'Brawling', 'Intimidation', 'Climbing'],
    secondary: ['One Handed', 'Regeneration', 'Persuasion'],
    weaknesses: ['Stealth', 'Illusion', 'Sleight Of Hand'],
    reputation: { Honor: 5, Bravery: 4, Justice: 4, Mercy: 2, Loyalty: 5, Generosity: 3 },
  },
  {
    nickname: 'Whisper',
    role: 'Rogue',
    name: 'Whisper Rogue',
    description: 'Shadow-hopper who opens locks, pockets, and doors without a sound.',
    hp: 16,
    strengths: ['Stealth', 'Sleight Of Hand', 'Lockpicking', 'Acrobatics'],
    secondary: ['Deception', 'Investigation', 'One Handed'],
    weaknesses: ['Two Handed', 'Brawling', 'Illusion'],
    reputation: { Honor: 2, Bravery: 3, Justice: 2, Mercy: 3, Loyalty: 2, Generosity: 3 },
  },
  {
    nickname: 'Spellweaver',
    role: 'Arcanist',
    name: 'Spellweaver',
    description: 'Arcane scholar who bends reality with careful incantations.',
    hp: 14,
    strengths: ['Alteration', 'Illusion', 'Investigation', 'Soulbinding'],
    secondary: ['Destruction', 'Persuasion', 'Regeneration'],
    weaknesses: ['Brawling', 'Two Handed', 'Climbing'],
    reputation: { Honor: 3, Bravery: 2, Justice: 3, Mercy: 3, Loyalty: 3, Generosity: 2 },
  },
  {
    nickname: 'Bloodbinder',
    role: 'Hexer',
    name: 'Bloodbinder',
    description: 'Forbidden caster who trades vitality for merciless power.',
    hp: 18,
    strengths: ['Bloodmancy', 'Necromancy', 'Destruction', 'Intimidation'],
    secondary: ['Regeneration', 'Soulbinding', 'Deception'],
    weaknesses: ['Persuasion', 'Acrobatics', 'Bartering'],
    reputation: { Honor: 1, Bravery: 4, Justice: 2, Mercy: 1, Loyalty: 2, Generosity: 1 },
  },
  {
    nickname: 'Storm',
    role: 'Ranger',
    name: 'Storm Ranger',
    description: 'Wild hunter who reads wind, tracks beasts, and lives with the bow.',
    hp: 20,
    strengths: ['Ranged', 'Beastmastery', 'Aim', 'Climbing'],
    secondary: ['Stealth', 'Acrobatics', 'Investigation'],
    weaknesses: ['Illusion', 'Necromancy', 'Seduction'],
    reputation: { Honor: 3, Bravery: 4, Justice: 3, Mercy: 3, Loyalty: 4, Generosity: 3 },
  },
  {
    nickname: 'Silver',
    role: 'Bard',
    name: 'Silver Bard',
    description: 'Stage-born storyteller who disarms danger with charm and song.',
    hp: 16,
    strengths: ['Performance', 'Persuasion', 'Seduction', 'Deception'],
    secondary: ['Bartering', 'Illusion', 'Sleight Of Hand'],
    weaknesses: ['Brawling', 'Two Handed', 'Intimidation'],
    reputation: { Honor: 3, Bravery: 2, Justice: 2, Mercy: 4, Loyalty: 3, Generosity: 5 },
  },
  {
    nickname: 'Golem',
    role: 'Fist',
    name: 'Golem Fist',
    description: 'Relentless brawler whose hands hit like stone drums.',
    hp: 26,
    strengths: ['Brawling', 'Regeneration', 'Intimidation', 'Climbing'],
    secondary: ['Two Handed', 'One Handed', 'Aim'],
    weaknesses: ['Illusion', 'Persuasion', 'Lockpicking'],
    reputation: { Honor: 3, Bravery: 5, Justice: 3, Mercy: 2, Loyalty: 4, Generosity: 2 },
  },
  {
    nickname: 'Inquisitor',
    role: 'Judge',
    name: 'Inquisitor',
    description: 'Truth-seeker who reads motives and drags secrets into the light.',
    hp: 18,
    strengths: ['Investigation', 'Persuasion', 'Intimidation', 'One Handed'],
    secondary: ['Destruction', 'Bartering', 'Deception'],
    weaknesses: ['Stealth', 'Sleight Of Hand', 'Seduction'],
    reputation: { Honor: 4, Bravery: 3, Justice: 5, Mercy: 2, Loyalty: 4, Generosity: 2 },
  },
  {
    nickname: 'Shade',
    role: 'Alchemist',
    name: 'Shade Alchemist',
    description: 'Potion-brewer who mutates the battlefield with clever mixtures.',
    hp: 17,
    strengths: ['Alteration', 'Regeneration', 'Deception', 'Bartering'],
    secondary: ['Aim', 'Illusion', 'Investigation'],
    weaknesses: ['Two Handed', 'Climbing', 'Brawling'],
    reputation: { Honor: 3, Bravery: 2, Justice: 3, Mercy: 4, Loyalty: 2, Generosity: 4 },
  },
];

export const CUSTOM_CLASS = {
  nickname: 'Custom',
  role: 'Class',
  name: 'Custom Class',
  description: 'Define your own class fantasy and let the stats adapt.',
  hp: 18,
};

export function buildStats(strengths = [], secondary = [], weaknesses = []) {
  const stats = {};
  STATS.forEach((stat) => {
    stats[stat] = BASE_STAT;
  });
  strengths.forEach((stat) => {
    if (stats[stat] !== undefined) stats[stat] = CLASS_STATS;
  });
  secondary.forEach((stat) => {
    if (stats[stat] !== undefined) stats[stat] = SECONDARY_STATS;
  });
  weaknesses.forEach((stat) => {
    if (stats[stat] !== undefined) stats[stat] = LOW_STATS;
  });
  return stats;
}

export function defaultReputation() {
  const rep = {};
  REPUTATION.forEach((name) => {
    rep[name] = 3;
  });
  return rep;
}

export function classStatsFromDescription(text) {
  const seed = Array.from(text).reduce((acc, char) => acc + char.charCodeAt(0), 0) || 1;
  const stats = {};
  STATS.forEach((stat, index) => {
    const value = ((seed + index * 17) % 7) + 2;
    stats[stat] = value;
  });
  const reputation = {};
  REPUTATION.forEach((rep, index) => {
    const value = ((seed + index * 23) % 5) + 1;
    reputation[rep] = value;
  });
  return { stats, reputation, hp: 16 + (seed % 8) };
}

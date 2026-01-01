export const REPUTATION = ['Honor', 'Bravery', 'Justice', 'Mercy', 'Loyalty', 'Generosity'];

export const HP_RANGE = { min: 10, max: 20 };

export const CLASSES = [
  {
    nickname: 'Artificer',
    role: 'Artificer',
    name: 'Artificer',
    description: 'Inventor who fuses arcane craft with ingenious devices.',
    hp: 14,
    reputation: defaultReputation(),
    saveProficiencies: ['Constitution', 'Intelligence'],
  },
  {
    nickname: 'Barbarian',
    role: 'Barbarian',
    name: 'Barbarian',
    description: 'Fury-driven warrior who shrugs off pain in battle.',
    hp: 20,
    reputation: defaultReputation(),
    saveProficiencies: ['Strength', 'Constitution'],
  },
  {
    nickname: 'Bard',
    role: 'Bard',
    name: 'Bard',
    description: 'Storyteller who inspires allies with song and charm.',
    hp: 14,
    reputation: defaultReputation(),
    saveProficiencies: ['Dexterity', 'Charisma'],
  },
  {
    nickname: 'Cleric',
    role: 'Cleric',
    name: 'Cleric',
    description: 'Divine wielder who heals and shields the faithful.',
    hp: 16,
    reputation: defaultReputation(),
    saveProficiencies: ['Wisdom', 'Charisma'],
  },
  {
    nickname: 'Druid',
    role: 'Druid',
    name: 'Druid',
    description: 'Warden of the wild who bends nature to their will.',
    hp: 16,
    reputation: defaultReputation(),
    saveProficiencies: ['Intelligence', 'Wisdom'],
  },
  {
    nickname: 'Fighter',
    role: 'Fighter',
    name: 'Fighter',
    description: 'Versatile combatant who thrives in every skirmish.',
    hp: 18,
    reputation: defaultReputation(),
    saveProficiencies: ['Strength', 'Constitution'],
  },
  {
    nickname: 'Monk',
    role: 'Monk',
    name: 'Monk',
    description: 'Disciplined martial artist who strikes with precision.',
    hp: 16,
    reputation: defaultReputation(),
    saveProficiencies: ['Strength', 'Dexterity'],
  },
  {
    nickname: 'Paladin',
    role: 'Paladin',
    name: 'Paladin',
    description: 'Holy champion sworn to protect the innocent.',
    hp: 18,
    reputation: defaultReputation(),
    saveProficiencies: ['Wisdom', 'Charisma'],
  },
  {
    nickname: 'Ranger',
    role: 'Ranger',
    name: 'Ranger',
    description: 'Wilderness scout who tracks foes with ruthless focus.',
    hp: 16,
    reputation: defaultReputation(),
    saveProficiencies: ['Strength', 'Dexterity'],
  },
  {
    nickname: 'Rogue',
    role: 'Rogue',
    name: 'Rogue',
    description: 'Shadow-walker who slips past defenses and strikes fast.',
    hp: 14,
    reputation: defaultReputation(),
    saveProficiencies: ['Dexterity', 'Intelligence'],
  },
  {
    nickname: 'Sorcerer',
    role: 'Sorcerer',
    name: 'Sorcerer',
    description: 'Innate caster who channels raw magic through will.',
    hp: 14,
    reputation: defaultReputation(),
    saveProficiencies: ['Constitution', 'Charisma'],
  },
  {
    nickname: 'Warlock',
    role: 'Warlock',
    name: 'Warlock',
    description: 'Binder of forbidden pacts who wields dark gifts.',
    hp: 14,
    reputation: defaultReputation(),
    saveProficiencies: ['Wisdom', 'Charisma'],
  },
  {
    nickname: 'Wizard',
    role: 'Wizard',
    name: 'Wizard',
    description: 'Arcane scholar who commands spells through study.',
    hp: 12,
    reputation: defaultReputation(),
    saveProficiencies: ['Intelligence', 'Wisdom'],
  },
];

export const CUSTOM_CLASS = {
  nickname: 'Custom Class',
  role: 'Custom',
  name: 'Custom Class',
  description: 'Define your own class fantasy and let the stats adapt.',
  hp: 15,
  saveProficiencies: [],
};

export function defaultReputation() {
  const rep = {};
  REPUTATION.forEach((name) => {
    rep[name] = 0;
  });
  return rep;
}

const makeId = (prefix) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

const BASE_INVENTORY = {
  summary: {
    crowns: 0,
    ac: 0,
    damage: '',
    weaponType: '',
  },
  equipped: {
    weapons: [null, null],
    armor: {
      Head: null,
      Body: null,
      Arms: null,
      Leggings: null,
      Cloak: null,
    },
  },
  sections: {
    weapons: [],
    armor: [],
    consumables: [],
    misc: [],
  },
};

const HEALING_POTION = {
  name: 'Healing Potion',
  rarity: 'Common',
  effect: 'Health',
  potency: '5 HP',
  heal: 5,
};

const RANDOM_POTIONS = [
  { name: 'Ironbark Draught', rarity: 'Uncommon', effect: 'Strength', potency: '+1d4' },
  { name: 'Nightveil Tonic', rarity: 'Uncommon', effect: 'Stealth', potency: '+2 XP', skill: 'Stealth', skillXp: 2 },
  { name: 'Stormstep Elixir', rarity: 'Rare', effect: 'Dexterity', potency: '+1d4' },
  { name: 'Soulglow Phial', rarity: 'Uncommon', effect: 'Soul', potency: '+1d4' },
  { name: 'Focus Tincture', rarity: 'Uncommon', effect: 'Investigation', potency: '+2 XP', skill: 'Investigation', skillXp: 2 },
];

const STARTING_KITS = {
  Artificer: {
    weapon: { name: "Tinkerer's Hammer", rarity: 'Common', weaponType: 'Melee (One-Handed)', type: 'Melee', damage: '1d6' },
    armor: [
      { slot: 'Body', name: 'Workshop Coat', rarity: 'Common', ac: 1 },
      { slot: 'Leggings', name: 'Reinforced Work Trousers', rarity: 'Common', ac: 1 },
    ],
    misc: [{ name: 'Tool Satchel', rarity: 'Common', note: 'Packed with spare parts.' }],
  },
  Barbarian: {
    weapon: { name: 'Bone Greataxe', rarity: 'Uncommon', weaponType: 'Melee (Two-Handed)', type: 'Melee', damage: '1d12' },
    armor: [
      { slot: 'Body', name: 'Hide Harness', rarity: 'Common', ac: 2 },
      { slot: 'Leggings', name: 'Fur Wraps', rarity: 'Common', ac: 1 },
    ],
    misc: [{ name: 'Totem Charm', rarity: 'Common', note: 'A rough-hewn spirit token.' }],
  },
  Bard: {
    weapon: { name: 'Traveling Guitar', rarity: 'Common', weaponType: 'Lute (One-Handed)', type: 'Instrument', damage: '1d6' },
    armor: [
      { slot: 'Body', name: 'Green Shirt', rarity: 'Common', ac: 1 },
      { slot: 'Leggings', name: 'Green Trousers', rarity: 'Common', ac: 1 },
    ],
    misc: [{ name: 'Songbook', rarity: 'Common', note: 'Ink-stained pages of melodies.' }],
  },
  Cleric: {
    weapon: { name: 'Blessed Mace', rarity: 'Common', weaponType: 'Melee (One-Handed)', type: 'Melee', damage: '1d6' },
    armor: [
      { slot: 'Body', name: 'Sanctified Robe', rarity: 'Common', ac: 1 },
      { slot: 'Cloak', name: 'Prayer Cloak', rarity: 'Common', ac: 1 },
    ],
    misc: [{ name: 'Holy Symbol', rarity: 'Common', note: 'Worn close to the heart.' }],
  },
  Druid: {
    weapon: { name: 'Oak Staff', rarity: 'Common', weaponType: 'Melee (Two-Handed)', type: 'Melee', damage: '1d8' },
    armor: [
      { slot: 'Body', name: 'Leafwoven Tunic', rarity: 'Common', ac: 1 },
      { slot: 'Cloak', name: 'Moss Cloak', rarity: 'Common', ac: 1 },
    ],
    misc: [{ name: 'Herbal Satchel', rarity: 'Common', note: 'Packed with dried herbs.' }],
  },
  Fighter: {
    weapon: { name: 'Steel Longsword', rarity: 'Common', weaponType: 'Melee (One-Handed)', type: 'Melee', damage: '1d8' },
    armor: [
      { slot: 'Body', name: 'Reinforced Vest', rarity: 'Uncommon', ac: 2 },
      { slot: 'Arms', name: 'Guarded Bracers', rarity: 'Common', ac: 1 },
    ],
    misc: [{ name: 'Whetstone Kit', rarity: 'Common', note: 'Keeps blades keen.' }],
  },
  Monk: {
    weapon: { name: 'Bamboo Staff', rarity: 'Common', weaponType: 'Melee (Two-Handed)', type: 'Melee', damage: '1d8' },
    armor: [
      { slot: 'Body', name: 'Monk Wraps', rarity: 'Common', ac: 1 },
      { slot: 'Leggings', name: 'Training Pants', rarity: 'Common', ac: 1 },
    ],
    misc: [{ name: 'Prayer Beads', rarity: 'Common', note: 'Calms the breath.' }],
  },
  Paladin: {
    weapon: { name: 'Sunforged Blade', rarity: 'Uncommon', weaponType: 'Melee (One-Handed)', type: 'Melee', damage: '1d8' },
    armor: [
      { slot: 'Body', name: 'Crusader Mail', rarity: 'Uncommon', ac: 3 },
      { slot: 'Cloak', name: 'Oathkeeper Cloak', rarity: 'Common', ac: 1 },
    ],
    misc: [{ name: 'Oath Scroll', rarity: 'Common', note: 'A vow sealed in wax.' }],
  },
  Ranger: {
    weapon: { name: 'Hunting Bow', rarity: 'Common', weaponType: 'Ranged (Two-Handed)', type: 'Ranged', damage: '1d8' },
    armor: [
      { slot: 'Body', name: 'Trail Leathers', rarity: 'Common', ac: 2 },
      { slot: 'Cloak', name: 'Camo Cloak', rarity: 'Common', ac: 1 },
    ],
    misc: [{ name: "Tracker's Map", rarity: 'Common', note: 'Notched with travel routes.' }],
  },
  Rogue: {
    weapon: { name: 'Shadow Dagger', rarity: 'Common', weaponType: 'Melee (One-Handed)', type: 'Melee', damage: '1d6' },
    armor: [
      { slot: 'Body', name: 'Nightweave Tunic', rarity: 'Common', ac: 1 },
      { slot: 'Cloak', name: 'Hooded Cloak', rarity: 'Common', ac: 1 },
    ],
    misc: [{ name: 'Lockpick Roll', rarity: 'Common', note: 'Always within reach.' }],
  },
  Sorcerer: {
    weapon: { name: 'Arcane Focus Wand', rarity: 'Common', weaponType: 'Arcane Focus (One-Handed)', type: 'Focus', damage: '1d6' },
    armor: [
      { slot: 'Body', name: 'Emberweave Tunic', rarity: 'Common', ac: 1 },
      { slot: 'Cloak', name: 'Silk Mantle', rarity: 'Common', ac: 1 },
    ],
    misc: [{ name: 'Focus Crystals', rarity: 'Common', note: 'Hum with latent power.' }],
  },
  Warlock: {
    weapon: { name: 'Pact Dagger', rarity: 'Uncommon', weaponType: 'Melee (One-Handed)', type: 'Melee', damage: '1d6' },
    armor: [
      { slot: 'Body', name: 'Shadow Mantle', rarity: 'Common', ac: 1 },
      { slot: 'Cloak', name: 'Pact Cloak', rarity: 'Common', ac: 1 },
    ],
    misc: [{ name: 'Sealed Grimoire', rarity: 'Uncommon', note: 'Whispers when opened.' }],
  },
  Wizard: {
    weapon: { name: 'Runed Staff', rarity: 'Common', weaponType: 'Arcane Focus (Two-Handed)', type: 'Focus', damage: '1d8' },
    armor: [
      { slot: 'Body', name: 'Scholar Robe', rarity: 'Common', ac: 1 },
      { slot: 'Cloak', name: 'Inkthread Cloak', rarity: 'Common', ac: 1 },
    ],
    misc: [{ name: 'Spell Notes', rarity: 'Common', note: 'Margin-scribbled formulae.' }],
  },
  Adventurer: {
    weapon: { name: 'Traveler Sword', rarity: 'Common', weaponType: 'Melee (One-Handed)', type: 'Melee', damage: '1d6' },
    armor: [
      { slot: 'Body', name: 'Travel Tunic', rarity: 'Common', ac: 1 },
      { slot: 'Leggings', name: 'Road Worn Pants', rarity: 'Common', ac: 1 },
    ],
    misc: [{ name: 'Trail Pack', rarity: 'Common', note: 'Enough for the road.' }],
  },
};

const HEALING_SPELLS = [
  { name: 'Mend Wounds', roll: '1d8', description: 'Close wounds with a surge of steady light.', category: 'Healing' },
  { name: 'Restorative Hymn', roll: '1d6', description: 'A calming chant that restores vigor.', category: 'Healing' },
  { name: 'Verdant Renewal', roll: '1d4', description: 'Wrap allies in a faint green glow of relief.', category: 'Healing' },
];

const RANDOM_SPELLS = [
  { name: 'Arcane Spark', roll: '1d6', description: 'Loose a crackling bolt of arcane energy.', category: 'Magic' },
  { name: 'Windstep', roll: '1d4', description: 'Glide across the ground with quickened steps.', category: 'Utility' },
  { name: 'Shadow Veil', roll: '1d6', description: 'Dim the light around you for a heartbeat.', category: 'Shadow' },
  { name: 'Briar Grasp', roll: '1d6', description: 'Vines lash out to slow a foe.', category: 'Nature' },
  { name: 'Storm Lance', roll: '1d8', description: 'A spear of lightning streaks forward.', category: 'Storm' },
  { name: 'Mirror Flicker', roll: '1d4', description: 'Split into brief mirrored afterimages.', category: 'Illusion' },
  { name: 'Valor Surge', roll: '1d6', description: 'Bolster resolve with a ringing shout.', category: 'Valor' },
  { name: 'Sanctuary Pulse', roll: '1d6', description: 'A warded pulse softens incoming blows.', category: 'Protection' },
];

const pickUnique = (list, count) => {
  const pool = [...list];
  const picked = [];
  while (pool.length && picked.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked;
};

const slugify = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const buildStartingInventory = (className) => {
  const kit = STARTING_KITS[className] ?? STARTING_KITS.Adventurer;
  const inventory = JSON.parse(JSON.stringify(BASE_INVENTORY));

  if (kit.weapon) {
    inventory.equipped.weapons[0] = { id: makeId('weapon'), ...kit.weapon };
  }

  if (Array.isArray(kit.armor)) {
    kit.armor.forEach((piece) => {
      const slotKey = piece.slot ?? 'Body';
      inventory.equipped.armor[slotKey] = { id: makeId('armor'), ...piece };
    });
  }

  if (Array.isArray(kit.misc)) {
    inventory.sections.misc = kit.misc.map((item) => ({ id: makeId('misc'), ...item }));
  }

  const randomPotion = pickUnique(RANDOM_POTIONS, 1)[0] ?? RANDOM_POTIONS[0];
  inventory.sections.consumables = [
    { id: makeId('potion'), ...HEALING_POTION },
    { id: makeId('potion'), ...randomPotion },
  ];

  return inventory;
};

export const buildStartingSpellbook = () => {
  const healing = pickUnique(HEALING_SPELLS, 1);
  const randoms = pickUnique(RANDOM_SPELLS, 2);
  const selections = [...healing, ...randoms].map((spell) => ({
    id: makeId('spell'),
    name: spell.name,
    roll: spell.roll,
    description: spell.description,
    rank: 1,
    category: spell.category,
  }));

  const categories = new Map();
  selections.forEach((spell) => {
    const label = spell.category ?? 'Magic';
    const id = slugify(label) || 'magic';
    if (!categories.has(id)) {
      categories.set(id, { id, label, spells: [] });
    }
    categories.get(id).spells.push({
      id: spell.id,
      name: spell.name,
      roll: spell.roll,
      description: spell.description,
      rank: spell.rank,
    });
  });

  return Array.from(categories.values());
};

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { supabase } from '../lib/supabase.js';
import { getValueStyle } from '../lib/valueStyle.js';
import { getAbilityModifier, getAbilityRequirement, getSaveModifier } from '../data/abilities.js';
import { useGameData } from '../lib/gameData.js';

const SAMPLE_LOCATION = "Pibe's Tavern | Common room | Night";
const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value ?? ''
  );

const sampleQuests = [];
const sampleBounties = [];
const sampleRumors = [];

const EMPTY_EQUIPPED = {
  weapons: [null, null],
  armor: {
    Head: null,
    Body: null,
    Arms: null,
    Leggings: null,
    Cloak: null,
  },
};

const EMPTY_INVENTORY = {
  summary: {
    crowns: 0,
    ac: 0,
    damage: '',
    weaponType: '',
  },
  equipped: EMPTY_EQUIPPED,
  sections: {
    weapons: [],
    armor: [],
    consumables: [],
    misc: [],
  },
};

const normalizeInventory = (inventory) => {
  const base = inventory && !Array.isArray(inventory) ? inventory : EMPTY_INVENTORY;
  return {
    ...base,
    summary: {
      ...EMPTY_INVENTORY.summary,
      ...(base.summary ?? {}),
    },
    equipped: {
      weapons: Array.isArray(base?.equipped?.weapons)
        ? [...base.equipped.weapons, null, null].slice(0, 2)
        : [...EMPTY_EQUIPPED.weapons],
      armor: {
        ...EMPTY_EQUIPPED.armor,
        ...(base?.equipped?.armor ?? {}),
      },
    },
    sections: {
      weapons: base?.sections?.weapons ?? [],
      armor: base?.sections?.armor ?? [],
      consumables: base?.sections?.consumables ?? [],
      misc: base?.sections?.misc ?? [],
    },
  };
};

const stripHtml = (value) => {
  if (!value) return '';
  return String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

const TOOL_LEAK_PATTERNS = [
  /\bdefault_api\b/i,
  /\bfunction_call\b/i,
  /\btool_call\b/i,
  /^print\(/i,
  /\badd_npc\s*\(/i,
  /\bupdate_npc\s*\(/i,
  /\badd_ossuary_item\s*\(/i,
  /\badd_quest\s*\(/i,
  /\bupdate_quest\s*\(/i,
  /\badd_bounty\s*\(/i,
  /\bupdate_bounty\s*\(/i,
  /\badd_rumor\s*\(/i,
  /\bupdate_rumor\s*\(/i,
  /\badd_spell\s*\(/i,
  /\badd_inventory_item\s*\(/i,
  /\bconsume_inventory_item\s*\(/i,
  /\brecord_saving_throw\s*\(/i,
  /\bupdate_reputation\s*\(/i,
  /\badjust_xp\s*\(/i,
  /\badjust_hp\s*\(/i,
  /\badd_journal_entry\s*\(/i,
  /\bupdate_journal_entry\s*\(/i,
];

const scrubToolLeaks = (value) => {
  if (!value) return value;
  const lines = String(value).split('\n');
  const filtered = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return true;
    return !TOOL_LEAK_PATTERNS.some((pattern) => pattern.test(trimmed));
  });
  return filtered.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};

const renderMessageContent = (content) => {
  if (!content) return null;
  const text = scrubToolLeaks(String(content));
  if (!text) return null;
  const regex = /<dm-entity>(.*?)<\/dm-entity>/gi;
  const output = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      output.push(text.slice(lastIndex, match.index));
    }
    output.push(
      <span key={`dm-entity-${match.index}`} className="dm-entity">
        {match[1]}
      </span>
    );
    lastIndex = regex.lastIndex;
  }

  if (!output.length) return text;
  if (lastIndex < text.length) {
    output.push(text.slice(lastIndex));
  }
  return output;
};

const normalizeJournalEntries = (entries) => {
  if (!Array.isArray(entries)) return [];
  const stamp = Date.now();
  return entries.map((entry, index) => {
    const content = entry?.content ?? entry?.text ?? '';
    const title = entry?.title ?? entry?.date ?? 'Untitled Note';
    const rawCategory = entry?.category ?? '';
    const matchedCategory =
      JOURNAL_CATEGORIES.find(
        (category) => category !== 'All' && category.toLowerCase() === String(rawCategory).toLowerCase()
      ) ?? 'Personal';
    const createdAt = entry?.createdAt ?? entry?.date ?? new Date().toISOString();
    return {
      id: entry?.id ?? `jrnl-${stamp}-${index}`,
      title,
      category: matchedCategory,
      content,
      createdAt,
    };
  });
};

const JOURNAL_CATEGORIES = ['All', 'NPC', 'Location', 'Quest', 'Personal'];

const JOURNAL_CATEGORY_STYLES = {
  NPC: 'border-pink-500/40 text-pink-200 bg-pink-500/10',
  Location: 'border-sky-400/40 text-sky-200 bg-sky-400/10',
  Quest: 'border-amber-400/40 text-amber-200 bg-amber-400/10',
  Personal: 'border-purple-400/40 text-purple-200 bg-purple-400/10',
};

const JOURNAL_MODULES = {
  toolbar: {
    container: '#journal-toolbar',
  },
};

const JOURNAL_FORMATS = ['bold', 'italic', 'underline', 'strike', 'list', 'bullet', 'align'];

const EMPTY_JOURNAL_ENTRY = {
  title: '',
  category: 'Personal',
  content: '',
};

const buildMapFromKeys = (keys, initialValue = 0) => {
  const base = {};
  (keys ?? []).forEach((key) => {
    base[key] = initialValue;
  });
  return base;
};

const sampleJournalEntries = [
  {
    id: 'jrnl-1',
    title: 'River Crest Letter',
    category: 'Quest',
    content: 'The courier left a letter with a river crest. Something about a creator in the docks.',
    createdAt: new Date().toISOString(),
  },
];

const EMPTY_OSSUARY = [];

const DEFAULT_SPELLBOOK = [
  {
    id: 'healing',
    label: 'Healing',
    spells: [
      {
        id: 'heal-1',
        name: 'Mend Wounds',
        roll: '1d8',
        description: 'Restore vitality to a wounded ally and close superficial cuts.',
      },
      {
        id: 'heal-2',
        name: 'Soothing Light',
        roll: '1d4',
        description: 'Calm nerves and dull pain, granting a brief reprieve.',
      },
    ],
  },
  {
    id: 'magic',
    label: 'Magic',
    spells: [
      {
        id: 'magic-1',
        name: 'Arcane Spark',
        roll: '1d6',
        description: 'Loose a crackling bolt of arcane energy at a target within sight.',
      },
      {
        id: 'magic-2',
        name: 'Sigil Burst',
        roll: '1d8',
        description: 'Etch a sigil that erupts with force when triggered.',
      },
    ],
  },
  {
    id: 'utility',
    label: 'Utility',
    spells: [
      {
        id: 'util-1',
        name: 'Veil of Silence',
        roll: '1d4',
        description: 'Muffle sound around you for a short stretch of time.',
      },
    ],
  },
];

const CLASS_SPELLBOOKS = {
  Artificer: [
    {
      id: 'alchemy',
      label: 'Alchemy',
      spells: [
        {
          id: 'art-1',
          name: 'Voltaic Brew',
          roll: '1d6',
          description: 'Unleash a charged concoction that crackles on impact.',
        },
        {
          id: 'art-2',
          name: 'Quickseal Tonic',
          roll: '1d4',
          description: 'Seal fractures in armor and restore cohesion.',
        },
      ],
    },
    {
      id: 'utility',
      label: 'Utility',
      spells: [
        {
          id: 'art-3',
          name: 'Arcane Toolkit',
          roll: '1d8',
          description: 'Conjure spectral tools to dismantle wards or locks.',
        },
        {
          id: 'art-4',
          name: 'Glyph Beacon',
          roll: '1d4',
          description: 'Drop a beacon that guides allies through danger.',
        },
      ],
    },
  ],
  Barbarian: [
    {
      id: 'valor',
      label: 'Valor',
      spells: [
        {
          id: 'bar-1',
          name: 'Rage Surge',
          roll: '1d8',
          description: 'Ignite a primal surge that shakes the battlefield.',
        },
        {
          id: 'bar-2',
          name: 'Warhowl',
          roll: '1d6',
          description: 'A thunderous howl that unsettles enemies.',
        },
      ],
    },
    {
      id: 'earth',
      label: 'Earth',
      spells: [
        {
          id: 'bar-3',
          name: 'Groundsplit',
          roll: '1d10',
          description: 'Cleave the earth with a brutal strike.',
        },
      ],
    },
  ],
  Bard: [
    {
      id: 'inspiration',
      label: 'Inspiration',
      spells: [
        {
          id: 'brd-1',
          name: 'Harmonic Lift',
          roll: '1d6',
          description: 'A soaring verse that fortifies weary hearts.',
        },
        {
          id: 'brd-2',
          name: 'Encore',
          roll: '1d4',
          description: 'Repeat a triumph to rekindle momentum.',
        },
      ],
    },
    {
      id: 'charm',
      label: 'Charm',
      spells: [
        {
          id: 'brd-3',
          name: 'Charmed Phrase',
          roll: '1d8',
          description: 'A honeyed line that softens even hardened foes.',
        },
      ],
    },
  ],
  Cleric: [
    {
      id: 'healing',
      label: 'Healing',
      spells: [
        {
          id: 'clr-1',
          name: 'Radiant Mend',
          roll: '1d8',
          description: 'Restore life with a surge of holy light.',
        },
        {
          id: 'clr-2',
          name: 'Purify',
          roll: '1d4',
          description: 'Cleanse poisons and ailments from the body.',
        },
      ],
    },
    {
      id: 'sacred',
      label: 'Sacred',
      spells: [
        {
          id: 'clr-3',
          name: 'Sanctuary',
          roll: '1d6',
          description: 'A protective ward that dulls incoming harm.',
        },
      ],
    },
  ],
  Druid: [
    {
      id: 'nature',
      label: 'Nature',
      spells: [
        {
          id: 'dru-1',
          name: 'Briar Grasp',
          roll: '1d6',
          description: 'Vines ensnare and slow an advancing foe.',
        },
        {
          id: 'dru-2',
          name: 'Wildgrowth',
          roll: '1d8',
          description: 'Summon a surge of flora to reshape the terrain.',
        },
      ],
    },
    {
      id: 'healing',
      label: 'Healing',
      spells: [
        {
          id: 'dru-3',
          name: 'Verdant Renewal',
          roll: '1d4',
          description: 'Channel life energy to restore strength.',
        },
      ],
    },
  ],
  Fighter: [
    {
      id: 'valor',
      label: 'Valor',
      spells: [
        {
          id: 'fig-1',
          name: 'Battle Rhythm',
          roll: '1d6',
          description: 'Find the cadence of battle and strike true.',
        },
        {
          id: 'fig-2',
          name: 'Steel Focus',
          roll: '1d4',
          description: 'Narrow focus to shrug off distractions.',
        },
      ],
    },
    {
      id: 'protection',
      label: 'Protection',
      spells: [
        {
          id: 'fig-3',
          name: 'Guard Stance',
          roll: '1d8',
          description: 'Brace for impact and absorb a heavy blow.',
        },
      ],
    },
  ],
  Monk: [
    {
      id: 'fortitude',
      label: 'Fortitude',
      spells: [
        {
          id: 'mnk-1',
          name: 'Inner Stillness',
          roll: '1d6',
          description: 'Center your breath to resist pain.',
        },
        {
          id: 'mnk-2',
          name: 'Iron Palm',
          roll: '1d8',
          description: 'Channel ki into a devastating focused strike.',
        },
      ],
    },
    {
      id: 'utility',
      label: 'Utility',
      spells: [
        {
          id: 'mnk-3',
          name: 'Windstep',
          roll: '1d4',
          description: 'Glide across the battlefield with light feet.',
        },
      ],
    },
  ],
  Paladin: [
    {
      id: 'sacred',
      label: 'Sacred',
      spells: [
        {
          id: 'pal-1',
          name: 'Oathfire',
          roll: '1d8',
          description: 'Imbue a strike with sacred fire.',
        },
        {
          id: 'pal-2',
          name: 'Blessed Ground',
          roll: '1d6',
          description: 'Consecrate the ground to guard allies.',
        },
      ],
    },
    {
      id: 'protection',
      label: 'Protection',
      spells: [
        {
          id: 'pal-3',
          name: 'Guardian Aura',
          roll: '1d4',
          description: 'A shimmering aura that lessens incoming harm.',
        },
      ],
    },
  ],
  Ranger: [
    {
      id: 'nature',
      label: 'Nature',
      spells: [
        {
          id: 'rng-1',
          name: 'Marked Trail',
          roll: '1d6',
          description: 'Reveal a hunter’s path through the wilderness.',
        },
        {
          id: 'rng-2',
          name: 'Feral Sense',
          roll: '1d4',
          description: 'Heighten senses to track hidden movement.',
        },
      ],
    },
    {
      id: 'storm',
      label: 'Storm',
      spells: [
        {
          id: 'rng-3',
          name: 'Tempest Shot',
          roll: '1d8',
          description: 'Loose a charged arrow wreathed in thunder.',
        },
      ],
    },
  ],
  Rogue: [
    {
      id: 'shadow',
      label: 'Shadow',
      spells: [
        {
          id: 'rog-1',
          name: 'Silent Drift',
          roll: '1d6',
          description: 'Slip through darkness without a sound.',
        },
        {
          id: 'rog-2',
          name: 'Blackout',
          roll: '1d4',
          description: 'Snuff a torch’s glow and move unseen.',
        },
      ],
    },
    {
      id: 'trickery',
      label: 'Trickery',
      spells: [
        {
          id: 'rog-3',
          name: 'Feign Step',
          roll: '1d8',
          description: 'Misdirect a foe with a sudden feint.',
        },
      ],
    },
  ],
  Sorcerer: [
    {
      id: 'magic',
      label: 'Magic',
      spells: [
        {
          id: 'sor-1',
          name: 'Wild Bolt',
          roll: '1d8',
          description: 'Release a surge of raw, untamed power.',
        },
        {
          id: 'sor-2',
          name: 'Flux Shield',
          roll: '1d6',
          description: 'A volatile ward that flares on impact.',
        },
      ],
    },
    {
      id: 'storm',
      label: 'Storm',
      spells: [
        {
          id: 'sor-3',
          name: 'Storm Lance',
          roll: '1d10',
          description: 'Pierce the air with a spear of lightning.',
        },
      ],
    },
  ],
  Warlock: [
    {
      id: 'necrotic',
      label: 'Necrotic',
      spells: [
        {
          id: 'war-1',
          name: 'Grave Leash',
          roll: '1d8',
          description: 'Bind a target with spectral chains.',
        },
        {
          id: 'war-2',
          name: 'Soul Rend',
          roll: '1d10',
          description: 'Tear at the spirit with forbidden power.',
        },
      ],
    },
    {
      id: 'magic',
      label: 'Magic',
      spells: [
        {
          id: 'war-3',
          name: 'Eldritch Bolt',
          roll: '1d6',
          description: 'A crack of pact energy that scorches the air.',
        },
      ],
    },
  ],
  Wizard: [
    {
      id: 'arcane',
      label: 'Arcane',
      spells: [
        {
          id: 'wiz-1',
          name: 'Runic Burst',
          roll: '1d8',
          description: 'Release stored runes in a focused detonation.',
        },
        {
          id: 'wiz-2',
          name: 'Aether Bind',
          roll: '1d6',
          description: 'Clamp an enemy with arcing sigils.',
        },
      ],
    },
    {
      id: 'illusion',
      label: 'Illusion',
      spells: [
        {
          id: 'wiz-3',
          name: 'Veil of Mirrors',
          roll: '1d4',
          description: 'Split your outline into phantom echoes.',
        },
      ],
    },
  ],
};

const REP_ORDER = ['Honor', 'Mercy', 'Bravery', 'Loyalty', 'Justice', 'Generosity'];

const REP_ICONS = {
  Honor: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3l7 4v6c0 4-3 6-7 8-4-2-7-4-7-8V7l7-4Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Mercy: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 20s-7-4.4-7-9.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 7 4.5C19 15.6 12 20 12 20Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Bravery: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3l2 5 5 .7-4 3.6 1 5.7-4-2.3-4 2.3 1-5.7-4-3.6 5-.7 2-5Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Loyalty: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 11l6-6 4 4 6-3v11l-6 2-4-4-6 3V11Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Justice: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 4v16M6 7h12M7 7l-3 5h6l-3-5Zm10 0l-3 5h6l-3-5Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Generosity: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5 11h14v8H5v-8Zm2-4h10v4H7V7Zm2-3h6v3H9V4Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const REP_LABELS = {
  Honor: {
    left: 'Dishonorable',
    right: 'Exalted',
    tiers: [
      'Dishonored',
      'Shamed',
      'Tainted',
      'Questioned',
      'Neutral',
      'Resolved',
      'Honored',
      'Exalted',
      'Legendary',
    ],
  },
  Mercy: {
    left: 'Cruel',
    right: 'Saintly',
    tiers: [
      'Cruel',
      'Severe',
      'Harsh',
      'Reserved',
      'Neutral',
      'Kind',
      'Merciful',
      'Benevolent',
      'Saintly',
    ],
  },
  Bravery: {
    left: 'Cowardly',
    right: 'Fearless',
    tiers: [
      'Cowardly',
      'Timid',
      'Wary',
      'Steady',
      'Neutral',
      'Bold',
      'Brave',
      'Valiant',
      'Fearless',
    ],
  },
  Loyalty: {
    left: 'Treacherous',
    right: 'Unbreakable',
    warn: 'Unreliable',
    tiers: [
      'Treacherous',
      'Fickle',
      'Unreliable',
      'Wavering',
      'Neutral',
      'Committed',
      'Loyal',
      'Devoted',
      'Unbreakable',
    ],
  },
  Justice: {
    left: 'Corrupt',
    right: 'Virtuous',
    warn: 'Compromised',
    tiers: [
      'Corrupt',
      'Biased',
      'Compromised',
      'Uneven',
      'Neutral',
      'Principled',
      'Just',
      'Righteous',
      'Virtuous',
    ],
  },
  Generosity: {
    left: 'Greedy',
    right: 'Selfless',
    tiers: [
      'Greedy',
      'Hoarding',
      'Guarded',
      'Selective',
      'Neutral',
      'Giving',
      'Generous',
      'Bountiful',
      'Selfless',
    ],
  },
};

const SAVE_PROFICIENCIES = {
  Artificer: ['Constitution', 'Intelligence'],
  Barbarian: ['Strength', 'Constitution'],
  Bard: ['Dexterity', 'Charisma'],
  Cleric: ['Wisdom', 'Charisma'],
  Druid: ['Intelligence', 'Wisdom'],
  Fighter: ['Strength', 'Constitution'],
  Monk: ['Strength', 'Dexterity'],
  Paladin: ['Wisdom', 'Charisma'],
  Ranger: ['Strength', 'Dexterity'],
  Rogue: ['Dexterity', 'Intelligence'],
  Sorcerer: ['Constitution', 'Charisma'],
  Warlock: ['Wisdom', 'Charisma'],
  Wizard: ['Intelligence', 'Wisdom'],
};

const SAVE_PROFICIENCY_BONUS = 2;
const getLevelRequirement = (level) => getAbilityRequirement(level);

const SPELL_CATEGORY_ICONS = {
  Healing: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 20s-7-4.4-7-9.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 7 4.5C19 15.6 12 20 12 20Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Magic: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3v6m0 6v6M5 12h6m6 0h6M7 7l4 4m2 2 4 4M17 7l-4 4m-2 2-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Utility: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Shadow: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M20 14.5A7.5 7.5 0 1 1 9.5 4a6 6 0 0 0 10.5 10.5Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Trickery: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 15c2 2 5 3 8 3s6-1 8-3M5 9c2 1 4 1 6 0m2 0c2 1 4 1 6 0" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 9a2 2 0 1 1 2-2M15 9a2 2 0 1 1 2-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Arcane: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Illusion: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 12a3 3 0 0 0 6 0 3 3 0 0 0-6 0Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Blood: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3s6 6 6 10a6 6 0 0 1-12 0c0-4 6-10 6-10Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Necrotic: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 12h5M10 9h.01M14 9h.01M10 15h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Nature: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5 21c7 0 14-6 14-14-6 0-14 3-14 14Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Storm: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Inspiration: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M9 18V6l10-2v12" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="16" r="2" />
    </svg>
  ),
  Charm: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 20s-7-4.4-7-9.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 7 4.5C19 15.6 12 20 12 20Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Earth: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 20h18L14 4 3 20Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Fortitude: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3l7 4v6c0 4-3 6-7 8-4-2-7-4-7-8V7l7-4Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Judgement: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 4v16M6 7h12M7 7l-3 5h6l-3-5Zm10 0l-3 5h6l-3-5Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Alchemy: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M10 2h4M10 2v5l-5 9a4 4 0 0 0 3.5 6h7a4 4 0 0 0 3.5-6l-5-9V2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Transmutation: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3v4m0 10v4M4 12h4m8 0h4M7 7l3 3m4 4 3 3M17 7l-3 3m-4 4-3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Protection: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3l7 4v6c0 4-3 6-7 8-4-2-7-4-7-8V7l7-4Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Valor: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 2v20M8 6h8M9 6l-4 4 4 4m6-8 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Sacred: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3v18M6 9h12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const SPELL_CATEGORY_STYLES = {
  Healing: {
    text: 'text-emerald-300',
    border: 'border-l-emerald-400/70',
    pill: 'border-emerald-400/40 text-emerald-200',
    badge: 'border-emerald-400/60 text-emerald-200 bg-emerald-400/10',
    icon: 'border-emerald-400/70 text-emerald-200 shadow-[0_0_16px_rgba(52,211,153,0.25)]',
  },
  Magic: {
    text: 'text-amber-300',
    border: 'border-l-amber-400/70',
    pill: 'border-amber-400/40 text-amber-200',
    badge: 'border-amber-400/60 text-amber-200 bg-amber-400/10',
    icon: 'border-amber-400/70 text-amber-200 shadow-[0_0_16px_rgba(251,191,36,0.25)]',
  },
  Utility: {
    text: 'text-sky-300',
    border: 'border-l-sky-400/70',
    pill: 'border-sky-400/40 text-sky-200',
    badge: 'border-sky-400/60 text-sky-200 bg-sky-400/10',
    icon: 'border-sky-400/70 text-sky-200 shadow-[0_0_16px_rgba(56,189,248,0.25)]',
  },
  Shadow: {
    text: 'text-violet-300',
    border: 'border-l-violet-400/70',
    pill: 'border-violet-400/40 text-violet-200',
    badge: 'border-violet-400/60 text-violet-200 bg-violet-400/10',
    icon: 'border-violet-400/70 text-violet-200 shadow-[0_0_16px_rgba(167,139,250,0.25)]',
  },
  Trickery: {
    text: 'text-rose-300',
    border: 'border-l-rose-400/70',
    pill: 'border-rose-400/40 text-rose-200',
    badge: 'border-rose-400/60 text-rose-200 bg-rose-400/10',
    icon: 'border-rose-400/70 text-rose-200 shadow-[0_0_16px_rgba(251,113,133,0.25)]',
  },
  Arcane: {
    text: 'text-indigo-300',
    border: 'border-l-indigo-400/70',
    pill: 'border-indigo-400/40 text-indigo-200',
    badge: 'border-indigo-400/60 text-indigo-200 bg-indigo-400/10',
    icon: 'border-indigo-400/70 text-indigo-200 shadow-[0_0_16px_rgba(129,140,248,0.25)]',
  },
  Illusion: {
    text: 'text-fuchsia-300',
    border: 'border-l-fuchsia-400/70',
    pill: 'border-fuchsia-400/40 text-fuchsia-200',
    badge: 'border-fuchsia-400/60 text-fuchsia-200 bg-fuchsia-400/10',
    icon: 'border-fuchsia-400/70 text-fuchsia-200 shadow-[0_0_16px_rgba(232,121,249,0.25)]',
  },
  Blood: {
    text: 'text-red-300',
    border: 'border-l-red-400/70',
    pill: 'border-red-400/40 text-red-200',
    badge: 'border-red-400/60 text-red-200 bg-red-400/10',
    icon: 'border-red-400/70 text-red-200 shadow-[0_0_16px_rgba(248,113,113,0.25)]',
  },
  Necrotic: {
    text: 'text-purple-300',
    border: 'border-l-purple-400/70',
    pill: 'border-purple-400/40 text-purple-200',
    badge: 'border-purple-400/60 text-purple-200 bg-purple-400/10',
    icon: 'border-purple-400/70 text-purple-200 shadow-[0_0_16px_rgba(192,132,252,0.25)]',
  },
  Nature: {
    text: 'text-green-300',
    border: 'border-l-green-400/70',
    pill: 'border-green-400/40 text-green-200',
    badge: 'border-green-400/60 text-green-200 bg-green-400/10',
    icon: 'border-green-400/70 text-green-200 shadow-[0_0_16px_rgba(74,222,128,0.25)]',
  },
  Storm: {
    text: 'text-cyan-300',
    border: 'border-l-cyan-400/70',
    pill: 'border-cyan-400/40 text-cyan-200',
    badge: 'border-cyan-400/60 text-cyan-200 bg-cyan-400/10',
    icon: 'border-cyan-400/70 text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.25)]',
  },
  Inspiration: {
    text: 'text-yellow-300',
    border: 'border-l-yellow-400/70',
    pill: 'border-yellow-400/40 text-yellow-200',
    badge: 'border-yellow-400/60 text-yellow-200 bg-yellow-400/10',
    icon: 'border-yellow-400/70 text-yellow-200 shadow-[0_0_16px_rgba(250,204,21,0.25)]',
  },
  Charm: {
    text: 'text-pink-300',
    border: 'border-l-pink-400/70',
    pill: 'border-pink-400/40 text-pink-200',
    badge: 'border-pink-400/60 text-pink-200 bg-pink-400/10',
    icon: 'border-pink-400/70 text-pink-200 shadow-[0_0_16px_rgba(244,114,182,0.25)]',
  },
  Earth: {
    text: 'text-orange-300',
    border: 'border-l-orange-400/70',
    pill: 'border-orange-400/40 text-orange-200',
    badge: 'border-orange-400/60 text-orange-200 bg-orange-400/10',
    icon: 'border-orange-400/70 text-orange-200 shadow-[0_0_16px_rgba(251,146,60,0.25)]',
  },
  Fortitude: {
    text: 'text-lime-300',
    border: 'border-l-lime-400/70',
    pill: 'border-lime-400/40 text-lime-200',
    badge: 'border-lime-400/60 text-lime-200 bg-lime-400/10',
    icon: 'border-lime-400/70 text-lime-200 shadow-[0_0_16px_rgba(163,230,53,0.25)]',
  },
  Judgement: {
    text: 'text-amber-200',
    border: 'border-l-amber-300/70',
    pill: 'border-amber-300/40 text-amber-200',
    badge: 'border-amber-300/60 text-amber-200 bg-amber-300/10',
    icon: 'border-amber-300/70 text-amber-200 shadow-[0_0_16px_rgba(252,211,77,0.25)]',
  },
  Alchemy: {
    text: 'text-teal-300',
    border: 'border-l-teal-400/70',
    pill: 'border-teal-400/40 text-teal-200',
    badge: 'border-teal-400/60 text-teal-200 bg-teal-400/10',
    icon: 'border-teal-400/70 text-teal-200 shadow-[0_0_16px_rgba(45,212,191,0.25)]',
  },
  Transmutation: {
    text: 'text-blue-300',
    border: 'border-l-blue-400/70',
    pill: 'border-blue-400/40 text-blue-200',
    badge: 'border-blue-400/60 text-blue-200 bg-blue-400/10',
    icon: 'border-blue-400/70 text-blue-200 shadow-[0_0_16px_rgba(96,165,250,0.25)]',
  },
  Protection: {
    text: 'text-slate-200',
    border: 'border-l-slate-300/70',
    pill: 'border-slate-300/40 text-slate-200',
    badge: 'border-slate-300/60 text-slate-100 bg-slate-300/10',
    icon: 'border-slate-300/70 text-slate-200 shadow-[0_0_16px_rgba(203,213,225,0.25)]',
  },
  Valor: {
    text: 'text-amber-400',
    border: 'border-l-amber-500/70',
    pill: 'border-amber-500/40 text-amber-300',
    badge: 'border-amber-500/60 text-amber-300 bg-amber-500/10',
    icon: 'border-amber-500/70 text-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.25)]',
  },
  Sacred: {
    text: 'text-emerald-200',
    border: 'border-l-emerald-300/70',
    pill: 'border-emerald-300/40 text-emerald-200',
    badge: 'border-emerald-300/60 text-emerald-200 bg-emerald-300/10',
    icon: 'border-emerald-300/70 text-emerald-200 shadow-[0_0_16px_rgba(110,231,183,0.25)]',
  },
};

export default function Campaign() {
  const { id } = useParams();
  const { abilities, skills, skillsByAbility } = useGameData();
  const [campaign, setCampaign] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [questLog, setQuestLog] = useState([]);
  const [bounties, setBounties] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [messageError, setMessageError] = useState('');
  const [messageSending, setMessageSending] = useState(false);
  const [introRequested, setIntroRequested] = useState(false);
  const messageListRef = useRef(null);
  const [rolls, setRolls] = useState([]);
  const [leftTab, setLeftTab] = useState(1);
  const [logTab, setLogTab] = useState('quests');
  const [inventoryTab, setInventoryTab] = useState('inventory');
  const [rumors, setRumors] = useState([]);
  const [journalEntries, setJournalEntries] = useState(() =>
    normalizeJournalEntries(sampleJournalEntries)
  );
  const [journalQuery, setJournalQuery] = useState('');
  const [journalFilter, setJournalFilter] = useState('All');
  const [journalMode, setJournalMode] = useState('list');
  const [journalDraft, setJournalDraft] = useState(EMPTY_JOURNAL_ENTRY);
  const [journalEditingId, setJournalEditingId] = useState(null);
  const [playerInfoOpen, setPlayerInfoOpen] = useState(false);
  const [inventoryData, setInventoryData] = useState(() => normalizeInventory(null));
  const [ossuaryLoot, setOssuaryLoot] = useState(EMPTY_OSSUARY);
  const [hpCurrent, setHpCurrent] = useState(0);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [playerXp, setPlayerXp] = useState(0);
  const [activeBuffs, setActiveBuffs] = useState([]);
  const [abilityScores, setAbilityScores] = useState({});
  const [abilityProgress, setAbilityProgress] = useState({});
  const [skillLevels, setSkillLevels] = useState({});
  const [skillProgress, setSkillProgress] = useState({});

  useEffect(() => {
    if (!abilities.length) return;
    setAbilityScores((prev) => {
      const next = buildMapFromKeys(abilities, 10);
      abilities.forEach((ability) => {
        if (Number.isFinite(prev?.[ability])) next[ability] = prev[ability];
      });
      return next;
    });
    setAbilityProgress((prev) => {
      const next = buildMapFromKeys(abilities, 0);
      abilities.forEach((ability) => {
        if (Number.isFinite(prev?.[ability])) next[ability] = prev[ability];
      });
      return next;
    });
  }, [abilities]);

  useEffect(() => {
    if (!skills.length) return;
    setSkillLevels((prev) => {
      const next = buildMapFromKeys(skills, 0);
      skills.forEach((skill) => {
        if (Number.isFinite(prev?.[skill])) next[skill] = prev[skill];
      });
      return next;
    });
    setSkillProgress((prev) => {
      const next = buildMapFromKeys(skills, 0);
      skills.forEach((skill) => {
        if (Number.isFinite(prev?.[skill])) next[skill] = prev[skill];
      });
      return next;
    });
  }, [skills]);
  const [skillPoints, setSkillPoints] = useState(0);
  const [saveRolls, setSaveRolls] = useState({});
  const [spellCategory, setSpellCategory] = useState('');
  const [uidCopied, setUidCopied] = useState(false);

  const applyCampaignData = (data) => {
    if (!data) return;
    setCampaign(data);
    const fallbackHp = Number.isFinite(data.hp) ? data.hp : 20;
    const currentHp = Number.isFinite(data.hp_current) ? data.hp_current : Math.min(12, fallbackHp);
    setHpCurrent(currentHp);
    setPlayerLevel(Number.isFinite(data.level) ? data.level : 1);
    setPlayerXp(Number.isFinite(data.level_xp) ? data.level_xp : 0);
    setActiveBuffs(Array.isArray(data.buffs) ? data.buffs : []);
    setAbilityScores(data.ability_scores ?? data.stats ?? {});
    setAbilityProgress(data.ability_progress ?? {});
    setSkillLevels(data.skills ?? {});
    setSkillProgress(data.skill_progress ?? {});
    setSkillPoints(Number.isFinite(data.skill_points) ? data.skill_points : 0);
    setSaveRolls(data.saving_throws ?? {});
    setMessages(Array.isArray(data.messages) ? data.messages : []);
    setQuestLog(Array.isArray(data.quests) ? data.quests : []);
    setBounties(Array.isArray(data.bounties) ? data.bounties : []);
    setRumors(Array.isArray(data.rumors) ? data.rumors : []);
    if (Array.isArray(data.journal) && data.journal.length) {
      setJournalEntries(normalizeJournalEntries(data.journal));
    } else {
      setJournalEntries(normalizeJournalEntries(sampleJournalEntries));
    }
    if (data.inventory && !Array.isArray(data.inventory)) {
      setInventoryData(normalizeInventory(data.inventory));
    } else {
      setInventoryData(normalizeInventory(null));
    }
    if (Array.isArray(data.ossuary) && data.ossuary.length) {
      setOssuaryLoot(data.ossuary);
    } else {
      setOssuaryLoot(EMPTY_OSSUARY);
    }
  };

  useEffect(() => {
    const loadCampaign = async () => {
      setLoading(true);
      setError('');
      if (!supabase) {
        setError('Missing Supabase configuration. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
        setLoading(false);
        return;
      }

      const lookupKey = isUuid(id) ? 'id' : 'access_key';
      const { data, error: fetchError } = await supabase
        .from('campaigns')
        .select('*')
        .eq(lookupKey, id)
        .single();

      if (fetchError) {
        setError(fetchError.message);
        setCampaign(null);
      } else {
        applyCampaignData(data);
      }
      setLoading(false);
    };

    if (id) {
      loadCampaign();
    }
  }, [id]);

  useEffect(() => {
    setIntroRequested(false);
  }, [campaign?.id]);

  useEffect(() => {
    if (!messageListRef.current) return;
    messageListRef.current.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior: messages.length > 1 ? 'smooth' : 'auto',
    });
  }, [messages.length]);

  useEffect(() => {
    if (!campaign?.id || introRequested || !supabase) return;
    if (messages.length) return;
    setIntroRequested(true);

    const runIntro = async () => {
      setMessageError('');
      try {
        const { data, error: introError, response } = await supabase.functions.invoke('dm-chat', {
          body: {
            campaignId: campaign.id,
            accessKey: campaign.access_key,
            intro: true,
            location: SAMPLE_LOCATION,
          },
        });

        if (introError || data?.error) {
          let detail = data?.error ?? introError?.message ?? 'Unable to reach the Dungeon Master.';
          if (response) {
            try {
              const textBody = await response.text();
              if (textBody) {
                const parsed = JSON.parse(textBody);
                detail = parsed?.error ?? textBody;
              }
            } catch (_error) {
              // Ignore parsing failures, keep original detail.
            }
          }
          setMessageError(detail);
          return;
        }

        if (data?.campaign) {
          applyCampaignData(data.campaign);
        } else if (data?.messages) {
          setMessages(data.messages);
        }
      } catch (error) {
        setMessageError(error?.message ?? 'Unable to reach the Dungeon Master.');
      }
    };

    runIntro();
  }, [campaign, introRequested, messages.length]);

  const savePatch = async (patch) => {
    if (!supabase || !campaign?.id) return;
    await supabase.from('campaigns').update(patch).eq('id', campaign.id);
  };

  const campaignUid = campaign?.access_key || (id && !isUuid(id) ? id : '');

  const handleCopyUid = () => {
    if (!campaignUid || !navigator?.clipboard) return;
    navigator.clipboard.writeText(campaignUid).then(() => {
      setUidCopied(true);
      setTimeout(() => setUidCopied(false), 1500);
    });
  };

  const abilityScoresByName = abilityScores;
  const skillLevelsByName = skillLevels;
  const skillProgressByName = skillProgress;
  const reputationByName = campaign?.reputation ?? {};
  const hpMax = campaign?.hp ?? 20;
  const levelRequirement = getLevelRequirement(playerLevel);
  const levelProgress = levelRequirement ? Math.min(playerXp, levelRequirement) : 0;
  const levelPercent = levelRequirement
    ? Math.min(100, (levelProgress / levelRequirement) * 100)
    : 100;
  const levelLabel = levelRequirement
    ? `Lvl ${playerLevel} • ${levelProgress}/${levelRequirement}`
    : `Lvl ${playerLevel} • MAX`;
  const npcList = useMemo(() => {
    if (Array.isArray(campaign?.npcs) && campaign.npcs.length) {
      return campaign.npcs;
    }
    return [];
  }, [campaign]);
  const classKey = useMemo(() => {
    const raw = campaign?.class_name ?? '';
    return raw.replace(/\s*\(.+\)\s*$/, '').trim();
  }, [campaign]);
  const saveProficiencies = useMemo(() => {
    if (Array.isArray(campaign?.save_proficiencies) && campaign.save_proficiencies.length) {
      return campaign.save_proficiencies;
    }
    if (SAVE_PROFICIENCIES[classKey]) return SAVE_PROFICIENCIES[classKey];
    const sorted = [...abilities].sort((a, b) => {
      const aScore = abilityScoresByName[a] ?? 10;
      const bScore = abilityScoresByName[b] ?? 10;
      return bScore - aScore;
    });
    return sorted.slice(0, 2);
  }, [campaign, classKey, abilityScoresByName, abilities]);
  const spellbook = useMemo(() => {
    const stored = campaign?.spellbook ?? campaign?.spells;
    if (Array.isArray(stored)) return stored;
    return CLASS_SPELLBOOKS[classKey] ?? DEFAULT_SPELLBOOK;
  }, [campaign, classKey]);

  useEffect(() => {
    if (!spellbook.length) {
      setSpellCategory('');
      return;
    }
    if (!spellbook.some((category) => category.id === spellCategory)) {
      setSpellCategory(spellbook[0].id);
    }
  }, [spellbook, spellCategory]);

  const filteredJournalEntries = useMemo(() => {
    const normalizedQuery = journalQuery.trim().toLowerCase();
    const activeCategory = journalFilter === 'All' ? '' : journalFilter;
    const filtered = journalEntries.filter((entry) => {
      if (activeCategory && entry.category !== activeCategory) return false;
      if (!normalizedQuery) return true;
      const haystack = `${entry.title} ${stripHtml(entry.content)} ${entry.category}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
    return filtered.sort((a, b) => {
      const aTime = new Date(a.createdAt ?? 0).getTime();
      const bTime = new Date(b.createdAt ?? 0).getTime();
      return bTime - aTime;
    });
  }, [journalEntries, journalQuery, journalFilter]);

  const getAbilityProgress = (ability) => {
    const score = Math.max(1, Math.min(30, abilityScoresByName[ability] ?? 10));
    const required = getAbilityRequirement(score);
    const progress = Math.max(0, Math.min(required ?? 0, abilityProgress[ability] ?? 0));
    return { score, required, progress };
  };

  const getSkillRequirement = (level) => Math.max(2, level + 2);

  const getSkillProgress = (skill) => {
    const level = Math.max(0, skillLevelsByName[skill] ?? 0);
    const required = getSkillRequirement(level);
    const progress = Math.max(0, Math.min(required, skillProgressByName[skill] ?? 0));
    return { level, required, progress };
  };

  const getRepStatus = (rep, value) => {
    const labels = REP_LABELS[rep] ?? { left: 'Negative', right: 'Positive' };
    const safeValue = Number.isFinite(value) ? value : 0;
    const tierLabel = (() => {
      const tiers = labels.tiers;
      if (!tiers || tiers.length < 9) return null;
      const index = Math.max(0, Math.min(8, Math.floor((safeValue + 20) / 5)));
      return tiers[index];
    })();
    if (safeValue >= 10) {
      return { label: tierLabel ?? labels.right, tone: 'positive' };
    }
    if (safeValue <= -10) {
      return { label: tierLabel ?? labels.left, tone: 'negative' };
    }
    if (safeValue <= -5 && labels.warn) {
      return { label: tierLabel ?? labels.warn, tone: 'warning' };
    }
    return { label: tierLabel ?? 'Neutral', tone: 'neutral' };
  };

  const getRepPosition = (value) => {
    const clamped = Math.max(-20, Math.min(20, value));
    return ((clamped + 20) / 40) * 100;
  };

  const resolveArmorSlot = (slot) => {
    if (!slot) return 'Body';
    const normalized = slot.toLowerCase();
    if (['head', 'helm', 'helmet'].includes(normalized)) return 'Head';
    if (['body', 'chest', 'torso'].includes(normalized)) return 'Body';
    if (['arms', 'arm', 'gloves'].includes(normalized)) return 'Arms';
    if (['legs', 'leg', 'leggings'].includes(normalized)) return 'Leggings';
    if (['cloak', 'cape'].includes(normalized)) return 'Cloak';
    return 'Body';
  };

  const isTwoHandedWeapon = (item) =>
    (item?.weaponType ?? item?.type ?? '').toLowerCase().includes('two');

  const getWeaponAbility = (item) => {
    const type = (item?.weaponType ?? item?.type ?? '').toLowerCase();
    if (type.includes('grimoire')) return 'Intelligence';
    if (type.includes('ocarina')) return 'Charisma';
    if (type.includes('ranged')) return 'Dexterity';
    if (type.includes('melee') || type.includes('one-handed') || type.includes('two-handed')) {
      return 'Dexterity';
    }
    return 'Strength';
  };

  const normalizeDice = (value) => {
    if (!value) return null;
    const match = String(value).trim().match(/^(\d+)d(\d+)$/i);
    if (!match) return null;
    return { count: Number(match[1]), sides: Number(match[2]) };
  };

  const formatDamageLabel = (weapons, bonus) => {
    if (!weapons.length) {
      return bonus ? `d4${bonus > 0 ? `+${bonus}` : bonus}` : 'd4';
    }
    const dice = weapons.map((weapon) => normalizeDice(weapon.damage)).filter(Boolean);
    if (!dice.length) {
      return bonus ? `d4${bonus > 0 ? `+${bonus}` : bonus}` : 'd4';
    }
    const allSameSides = dice.every((roll) => roll.sides === dice[0].sides);
    const baseLabel = allSameSides
      ? `${dice.reduce((sum, roll) => sum + roll.count, 0)}d${dice[0].sides}`
      : dice.map((roll) => `${roll.count}d${roll.sides}`).join('+');
    if (!bonus) return baseLabel;
    return `${baseLabel}${bonus > 0 ? `+${bonus}` : bonus}`;
  };

  const formatWeaponLabel = (weapons) => {
    if (!weapons.length) return 'Unarmed';
    if (weapons.some(isTwoHandedWeapon)) return 'Two-Handed';
    if (weapons.length > 1) return 'Dual One-Handed';
    return 'One-Handed';
  };

  const getArmorSlotLabel = (slotKey) => {
    switch (slotKey) {
      case 'Head':
        return 'Head';
      case 'Body':
        return 'Chest';
      case 'Arms':
        return 'Arms';
      case 'Leggings':
        return 'Legs';
      case 'Cloak':
        return 'Cloak';
      default:
        return 'Chest';
    }
  };

  const getNpcDisposition = (value) => {
    const safeValue = Number.isFinite(value) ? value : 0;
    if (safeValue >= 15) return { label: 'Trusted', tone: 'positive' };
    if (safeValue >= 5) return { label: 'Friendly', tone: 'positive' };
    if (safeValue <= -15) return { label: 'Hostile', tone: 'negative' };
    if (safeValue <= -5) return { label: 'Wary', tone: 'warning' };
    return { label: 'Neutral', tone: 'neutral' };
  };

  const repChart = useMemo(() => {
    const radius = 36;
    const center = 50;
    const pointsForRadius = (scale) =>
      REP_ORDER.map((_, index) => {
        const angle = ((-90 + index * 60) * Math.PI) / 180;
        const r = radius * scale;
        const x = center + Math.cos(angle) * r;
        const y = center + Math.sin(angle) * r;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');

    const values = REP_ORDER.map((key) => {
      const raw = reputationByName[key] ?? 0;
      const clamped = Math.max(-20, Math.min(20, raw));
      return 0.2 + ((clamped + 20) / 40) * 0.8;
    });

    const dataPoints = values
      .map((scale, index) => {
        const angle = ((-90 + index * 60) * Math.PI) / 180;
        const r = radius * scale;
        const x = center + Math.cos(angle) * r;
        const y = center + Math.sin(angle) * r;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    return {
      outer: pointsForRadius(1),
      mid: pointsForRadius(0.66),
      inner: pointsForRadius(0.33),
      data: dataPoints,
    };
  }, [reputationByName]);

  const handleSendMessage = async (event) => {
    event.preventDefault();
    const text = messageInput.trim();
    if (!text || !campaign) return;
    if (!supabase) {
      setMessageError('Missing Supabase configuration. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }

    const entry = {
      id: `player-${Date.now()}`,
      sender: campaign.name || 'You',
      location: SAMPLE_LOCATION,
      content: text,
    };
    const next = [...messages, entry];
    setMessages(next);
    setMessageInput('');
    setMessageError('');
    setMessageSending(true);

    try {
      const { data, error: sendError, response } = await supabase.functions.invoke('dm-chat', {
        body: {
          campaignId: campaign.id,
          accessKey: campaign.access_key,
          message: text,
          location: SAMPLE_LOCATION,
        },
      });

      if (sendError || data?.error) {
        let detail = data?.error ?? sendError?.message ?? 'Unable to reach the Dungeon Master.';
        if (response) {
          try {
            const textBody = await response.text();
            if (textBody) {
              const parsed = JSON.parse(textBody);
              detail = parsed?.error ?? textBody;
            }
          } catch (_error) {
            // Ignore parsing failures, keep original detail.
          }
        }
        setMessageError(detail);
        return;
      }

      if (data?.campaign) {
        applyCampaignData(data.campaign);
      } else if (data?.messages) {
        setMessages(data.messages);
      }
    } catch (error) {
      setMessageError(error?.message ?? 'Unable to reach the Dungeon Master.');
    } finally {
      setMessageSending(false);
    }
  };

  const handleStartJournalEntry = () => {
    setJournalDraft(EMPTY_JOURNAL_ENTRY);
    setJournalEditingId(null);
    setJournalMode('edit');
  };

  const handleEditJournalEntry = (entry) => {
    setJournalDraft({
      title: entry.title ?? '',
      category: entry.category ?? 'Personal',
      content: entry.content ?? '',
    });
    setJournalEditingId(entry.id);
    setJournalMode('edit');
  };

  const handleCancelJournalEntry = () => {
    setJournalDraft(EMPTY_JOURNAL_ENTRY);
    setJournalEditingId(null);
    setJournalMode('list');
  };

  const handleSaveJournalEntry = async () => {
    const trimmedTitle = journalDraft.title.trim();
    const plainText = stripHtml(journalDraft.content);
    if (!trimmedTitle && !plainText) {
      handleCancelJournalEntry();
      return;
    }
    const normalizedCategory =
      JOURNAL_CATEGORIES.includes(journalDraft.category) && journalDraft.category !== 'All'
        ? journalDraft.category
        : 'Personal';
    const existing = journalEntries.find((entry) => entry.id === journalEditingId);
    const entryId = journalEditingId ?? `jrnl-${Date.now()}`;
    const createdAt = existing?.createdAt ?? new Date().toISOString();
    const nextEntry = {
      id: entryId,
      title: trimmedTitle || 'Untitled Note',
      category: normalizedCategory,
      content: journalDraft.content ?? '',
      createdAt,
    };
    const nextEntries = journalEditingId
      ? journalEntries.map((entry) => (entry.id === journalEditingId ? nextEntry : entry))
      : [nextEntry, ...journalEntries];
    setJournalEntries(nextEntries);
    setJournalMode('list');
    setJournalEditingId(null);
    setJournalDraft(EMPTY_JOURNAL_ENTRY);
    await savePatch({ journal: nextEntries });
  };

  const rollDice = (sides) => {
    const result = Math.floor(Math.random() * sides) + 1;
    const entry = { id: `roll-${Date.now()}-${sides}`, sides, result };
    setRolls((prev) => [entry, ...prev]);
  };

  const removeInventoryItem = (items, item) => {
    const key = item?.id ?? item?.name;
    return items.filter((entry) => (entry.id ?? entry.name) !== key);
  };

  const addLootToInventory = (items, baseInventory) => {
    const sectionMap = {
      Weapon: 'weapons',
      Armor: 'armor',
      Consumable: 'consumables',
      Item: 'misc',
    };
    return items.reduce((nextInventory, item) => {
      const section = sectionMap[item.type] ?? 'misc';
      const newItem = {
        id: item.id ?? `loot-${Date.now()}`,
        name: item.name,
        rarity: item.rarity,
        weaponType: item.weaponType,
        damage: item.damage,
        slot: item.slot,
        ac: item.ac,
        effect: item.effect,
        potency: item.potency,
        heal: item.heal,
        ability: item.ability,
        abilityScoreBoost: item.abilityScoreBoost,
        abilityXp: item.abilityXp,
        skill: item.skill,
        skillXp: item.skillXp,
        playerXp: item.playerXp,
        note: item.note,
      };
      return {
        ...nextInventory,
        sections: {
          ...nextInventory.sections,
          [section]: [...(nextInventory.sections?.[section] ?? []), newItem],
        },
      };
    }, baseInventory);
  };

  const handleClaimLoot = async (item) => {
    const nextOssuary = ossuaryLoot.filter((loot) => loot.id !== item.id);
    const nextInventory = addLootToInventory([item], normalizeInventory(inventoryData));
    setOssuaryLoot(nextOssuary);
    setInventoryData(normalizeInventory(nextInventory));
    await savePatch({ ossuary: nextOssuary, inventory: nextInventory });
  };

  const handleClaimAllLoot = async () => {
    if (!ossuaryLoot.length) return;
    const nextInventory = addLootToInventory(ossuaryLoot, normalizeInventory(inventoryData));
    setOssuaryLoot([]);
    setInventoryData(normalizeInventory(nextInventory));
    await savePatch({ ossuary: [], inventory: nextInventory });
  };

  const uniqueItemsById = (items) => {
    const seen = new Set();
    return items.filter((item) => {
      const key = item?.id ?? item?.name;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const handleEquipWeapon = async (item) => {
    const baseInventory = normalizeInventory(inventoryData);
    const nextWeaponSlots = [...baseInventory.equipped.weapons];
    const equippedWeapon = {
      ...item,
      type: item.type ?? item.weaponType ?? 'Weapon',
    };
    const weaponsList = removeInventoryItem(baseInventory.sections.weapons, item);
    if (isTwoHandedWeapon(item)) {
      const currentEquipped = uniqueItemsById(nextWeaponSlots.filter(Boolean));
      if (currentEquipped.length) {
        weaponsList.push(
          ...currentEquipped.map((weapon) => ({
            ...weapon,
            weaponType: weapon.weaponType ?? weapon.type ?? 'Weapon',
          }))
        );
      }
      nextWeaponSlots[0] = equippedWeapon;
      nextWeaponSlots[1] = equippedWeapon;
    } else {
      const twoHandedEquipped = nextWeaponSlots.find(isTwoHandedWeapon);
      if (twoHandedEquipped) {
        weaponsList.push({
          ...twoHandedEquipped,
          weaponType: twoHandedEquipped.weaponType ?? twoHandedEquipped.type ?? 'Weapon',
        });
        nextWeaponSlots[0] = null;
        nextWeaponSlots[1] = null;
      }
      const targetIndex = nextWeaponSlots.findIndex((slot) => !slot);
      const slotIndex = targetIndex === -1 ? 0 : targetIndex;
      const replaced = nextWeaponSlots[slotIndex];
      nextWeaponSlots[slotIndex] = equippedWeapon;
      if (replaced) {
        weaponsList.push({
          ...replaced,
          weaponType: replaced.weaponType ?? replaced.type ?? 'Weapon',
        });
      }
    }

    const nextInventory = normalizeInventory({
      ...baseInventory,
      equipped: {
        ...baseInventory.equipped,
        weapons: nextWeaponSlots,
      },
      sections: {
        ...baseInventory.sections,
        weapons: weaponsList,
      },
    });

    setInventoryData(nextInventory);
    await savePatch({ inventory: nextInventory });
  };

  const handleEquipArmor = async (item) => {
    const baseInventory = normalizeInventory(inventoryData);
    const slotKey = resolveArmorSlot(item.slot);
    const replaced = baseInventory.equipped.armor?.[slotKey];
    const armorList = removeInventoryItem(baseInventory.sections.armor, item);

    if (replaced) {
      armorList.push({
        ...replaced,
        slot: getArmorSlotLabel(slotKey),
      });
    }

    const nextInventory = normalizeInventory({
      ...baseInventory,
      equipped: {
        ...baseInventory.equipped,
        armor: {
          ...baseInventory.equipped.armor,
          [slotKey]: item,
        },
      },
      sections: {
        ...baseInventory.sections,
        armor: armorList,
      },
    });

    setInventoryData(nextInventory);
    await savePatch({ inventory: nextInventory });
  };

  const handleUnequipWeapon = async (index) => {
    const baseInventory = normalizeInventory(inventoryData);
    const nextWeaponSlots = [...baseInventory.equipped.weapons];
    const removed = nextWeaponSlots[index];
    if (!removed) return;
    const shouldClearBoth = isTwoHandedWeapon(removed);
    nextWeaponSlots[index] = null;
    if (shouldClearBoth) {
      const otherIndex = index === 0 ? 1 : 0;
      nextWeaponSlots[otherIndex] = null;
    }

    const weaponsList = [
      ...baseInventory.sections.weapons,
      {
        ...removed,
        weaponType: removed.weaponType ?? removed.type ?? 'Weapon',
      },
    ];

    const nextInventory = normalizeInventory({
      ...baseInventory,
      equipped: {
        ...baseInventory.equipped,
        weapons: nextWeaponSlots,
      },
      sections: {
        ...baseInventory.sections,
        weapons: weaponsList,
      },
    });

    setInventoryData(nextInventory);
    await savePatch({ inventory: nextInventory });
  };

  const handleUnequipArmor = async (slotKey) => {
    const baseInventory = normalizeInventory(inventoryData);
    const removed = baseInventory.equipped.armor?.[slotKey];
    if (!removed) return;
    const nextArmor = {
      ...baseInventory.equipped.armor,
      [slotKey]: null,
    };

    const armorList = [
      ...baseInventory.sections.armor,
      {
        ...removed,
        slot: getArmorSlotLabel(slotKey),
      },
    ];

    const nextInventory = normalizeInventory({
      ...baseInventory,
      equipped: {
        ...baseInventory.equipped,
        armor: nextArmor,
      },
      sections: {
        ...baseInventory.sections,
        armor: armorList,
      },
    });

    setInventoryData(nextInventory);
    await savePatch({ inventory: nextInventory });
  };

  const buffFromConsumable = (item, healAmount) => {
    const effect = item.effect ?? item.name ?? 'Potion';
    const potency = item.potency ? ` ${item.potency}` : '';
    const abilityTarget = item.ability ?? (abilities.includes(item.effect) ? item.effect : null);
    const skillTarget = item.skill ?? (skills.includes(item.effect) ? item.effect : null);
    if (abilityTarget) {
      const boost = item.abilityScoreBoost ?? item.abilityBoost;
      if (Number.isFinite(boost)) {
        return {
          id: `buff-${Date.now()}`,
          name: abilityTarget,
          detail: item.abilityScoreBoost ? `+${boost} ${abilityTarget} (permanent)` : `+${boost} ${abilityTarget} (temporary)`,
        };
      }
      const detail = potency ? `${abilityTarget}${potency}` : `${abilityTarget} empowered`;
      return {
        id: `buff-${Date.now()}`,
        name: abilityTarget,
        detail,
      };
    }
    if (skillTarget) {
      const statAmount = item.skillXp ?? Number.parseInt(item.potency, 10);
      const detail = Number.isFinite(statAmount) ? `+${statAmount} XP to ${skillTarget}` : `${skillTarget} boosted`;
      return {
        id: `buff-${Date.now()}`,
        name: skillTarget,
        detail,
      };
    }
    if (effect.toLowerCase().includes('health')) {
      return {
        id: `buff-${Date.now()}`,
        name: 'Regeneration',
        detail: `Healed +${healAmount} HP`,
      };
    }
    if (effect.toLowerCase().includes('strength')) {
      return {
        id: `buff-${Date.now()}`,
        name: 'Strength',
        detail: `${potency || '+1d4'} on next roll`,
      };
    }
    if (effect.toLowerCase().includes('soul')) {
      return {
        id: `buff-${Date.now()}`,
        name: 'Soul',
        detail: `${potency || '+1d4'} on next roll`,
      };
    }
    return {
      id: `buff-${Date.now()}`,
      name: effect,
      detail: potency ? `${potency} effect` : 'Empowered for the next roll',
    };
  };

  const applyAbilityProgress = (score, progress, amount) => {
    const safeScore = Math.max(1, Math.min(30, Number.isFinite(score) ? score : 10));
    if (!Number.isFinite(amount) || amount <= 0) {
      return { score: safeScore, progress: Math.max(0, progress ?? 0) };
    }
    let nextScore = safeScore;
    let remaining = (progress ?? 0) + amount;
    let required = getAbilityRequirement(nextScore);

    while (required && remaining >= required && nextScore < 30) {
      remaining -= required;
      nextScore += 1;
      required = getAbilityRequirement(nextScore);
    }

    return {
      score: nextScore,
      progress: nextScore >= 30 || !required ? 0 : Math.max(0, remaining),
    };
  };

  const applySkillProgress = (level, progress, amount) => {
    const safeLevel = Math.max(0, Number.isFinite(level) ? level : 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { level: safeLevel, progress: Math.max(0, progress ?? 0), gainedPoints: 0 };
    }
    let nextLevel = safeLevel;
    let remaining = (progress ?? 0) + amount;
    let required = getSkillRequirement(nextLevel);
    let gainedPoints = 0;
    let tier = Math.floor(nextLevel / 3);

    while (remaining >= required) {
      remaining -= required;
      nextLevel += 1;
      const nextTier = Math.floor(nextLevel / 3);
      if (nextTier > tier) {
        gainedPoints += nextTier - tier;
        tier = nextTier;
      }
      required = getSkillRequirement(nextLevel);
    }

    return {
      level: nextLevel,
      progress: Math.max(0, remaining),
      gainedPoints,
    };
  };

  const applyLevelProgress = (level, xp, amount) => {
    const safeLevel = Math.max(1, Number.isFinite(level) ? level : 1);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { level: safeLevel, xp: Math.max(0, xp ?? 0), gainedLevels: 0 };
    }
    let nextLevel = safeLevel;
    let remaining = (xp ?? 0) + amount;
    let required = getLevelRequirement(nextLevel);
    let gainedLevels = 0;

    while (required && remaining >= required && nextLevel < 30) {
      remaining -= required;
      nextLevel += 1;
      gainedLevels += 1;
      required = getLevelRequirement(nextLevel);
    }

    return {
      level: nextLevel,
      xp: nextLevel >= 30 || !required ? 0 : Math.max(0, remaining),
      gainedLevels,
    };
  };

  const handleSpendSkillPoint = async (ability) => {
    if (skillPoints <= 0) return;
    const currentScore = abilityScoresByName[ability] ?? 10;
    if (currentScore >= 30) return;
    const nextScore = currentScore + 1;
    const nextScores = {
      ...abilityScoresByName,
      [ability]: nextScore,
    };
    const nextProgress = {
      ...abilityProgress,
      [ability]: 0,
    };
    const nextPoints = skillPoints - 1;

    setAbilityScores(nextScores);
    setAbilityProgress(nextProgress);
    setSkillPoints(nextPoints);
    await savePatch({
      stats: nextScores,
      ability_scores: nextScores,
      ability_progress: nextProgress,
      skill_points: nextPoints,
    });
  };

  const handleUseConsumable = async (item) => {
    const effect = item.effect ?? '';
    if (effect.toLowerCase().includes('health') && hpCurrent >= hpMax) {
      return;
    }
    const rawHeal = Number.isFinite(item.heal) ? item.heal : Number.parseInt(item.potency, 10);
    const healValue = Number.isFinite(rawHeal) ? rawHeal : 5;
    const healAmount = effect.toLowerCase().includes('health') ? Math.min(healValue, hpMax - hpCurrent) : 0;
    const nextHp = healAmount ? Math.min(hpMax, hpCurrent + healAmount) : hpCurrent;
    const nextConsumables = removeInventoryItem(inventoryData.sections.consumables, item);
    const nextInventory = normalizeInventory({
      ...inventoryData,
      sections: {
        ...inventoryData.sections,
        consumables: nextConsumables,
      },
    });
    const nextBuff = buffFromConsumable(item, healAmount);
    const nextBuffs = [nextBuff, ...activeBuffs].slice(0, 5);
    const abilityTarget = item.ability ?? (abilities.includes(item.effect) ? item.effect : null);
    const skillTarget = item.skill ?? (skills.includes(item.effect) ? item.effect : null);
    const abilityScoreBoost = item.abilityScoreBoost ?? item.abilityBoost;
    const abilityXp = Number.isFinite(item.abilityXp)
      ? item.abilityXp
      : Number.parseInt(item.potency, 10) || 0;
    const skillXp = Number.isFinite(item.skillXp)
      ? item.skillXp
      : Number.parseInt(item.potency, 10) || 0;
    const playerXpGain = Number.isFinite(item.playerXp)
      ? item.playerXp
      : effect.toLowerCase().includes('experience')
        ? Number.parseInt(item.potency, 10) || 0
        : 0;

    let nextAbilityScores = abilityScoresByName;
    let nextAbilityProgress = abilityProgress;
    let nextSkillLevels = skillLevelsByName;
    let nextSkillProgress = skillProgressByName;
    let nextSkillPoints = skillPoints;
    let nextPlayerLevel = playerLevel;
    let nextPlayerXp = playerXp;

    if (abilityTarget && abilities.includes(abilityTarget)) {
      if (Number.isFinite(abilityScoreBoost)) {
        const currentScore = abilityScoresByName?.[abilityTarget] ?? 10;
        const boostedScore = Math.min(30, currentScore + abilityScoreBoost);
        nextAbilityScores = {
          ...abilityScoresByName,
          [abilityTarget]: boostedScore,
        };
        nextAbilityProgress = {
          ...abilityProgress,
          [abilityTarget]: 0,
        };
      } else if (abilityXp > 0) {
        const currentScore = abilityScoresByName?.[abilityTarget] ?? 10;
        const currentProgress = abilityProgress?.[abilityTarget] ?? 0;
        const updated = applyAbilityProgress(currentScore, currentProgress, abilityXp);
        nextAbilityScores = {
          ...abilityScoresByName,
          [abilityTarget]: updated.score,
        };
        nextAbilityProgress = {
          ...abilityProgress,
          [abilityTarget]: updated.progress,
        };
      }
    }

    if (skillTarget && skills.includes(skillTarget) && skillXp > 0) {
      const currentLevel = skillLevelsByName?.[skillTarget] ?? 0;
      const currentProgress = skillProgressByName?.[skillTarget] ?? 0;
      const updated = applySkillProgress(currentLevel, currentProgress, skillXp);
      nextSkillLevels = {
        ...skillLevelsByName,
        [skillTarget]: updated.level,
      };
      nextSkillProgress = {
        ...skillProgressByName,
        [skillTarget]: updated.progress,
      };
      if (updated.gainedPoints) {
        nextSkillPoints += updated.gainedPoints;
      }
    }

    if (playerXpGain > 0) {
      const updated = applyLevelProgress(playerLevel, playerXp, playerXpGain);
      nextPlayerLevel = updated.level;
      nextPlayerXp = updated.xp;
      if (updated.gainedLevels) {
        nextSkillPoints += updated.gainedLevels;
      }
    }

    setHpCurrent(nextHp);
    setInventoryData(nextInventory);
    setActiveBuffs(nextBuffs);
    setAbilityScores(nextAbilityScores);
    setAbilityProgress(nextAbilityProgress);
    setSkillLevels(nextSkillLevels);
    setSkillProgress(nextSkillProgress);
    setSkillPoints(nextSkillPoints);
    setPlayerLevel(nextPlayerLevel);
    setPlayerXp(nextPlayerXp);
    await savePatch({
      inventory: nextInventory,
      hp_current: nextHp,
      buffs: nextBuffs,
      stats: nextAbilityScores,
      ability_scores: nextAbilityScores,
      ability_progress: nextAbilityProgress,
      skills: nextSkillLevels,
      skill_progress: nextSkillProgress,
      skill_points: nextSkillPoints,
      level: nextPlayerLevel,
      level_xp: nextPlayerXp,
    });
  };

  const leftMenu = [
    {
      id: 1,
      label: 'Quest',
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M5 6h14M5 12h14M5 18h10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: 2,
      label: 'Player',
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path
            d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 8a7 7 0 0 1 14 0"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      id: 3,
      label: 'Stats',
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M5 20V10M12 20V4M19 20v-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: 4,
      label: 'Inv',
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path
            d="M6 7h12l1 13H5L6 7Zm2-3h8v3H8V4Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      id: 5,
      label: 'NPC',
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path
            d="M8 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3ZM3 20a5 5 0 0 1 10 0m2 0a5 5 0 0 1 6 0"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      id: 6,
      label: 'Ossuary',
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M7 20V9a5 5 0 0 1 10 0v11H7Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: 7,
      label: 'Spell',
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path
            d="M4 5h12a3 3 0 0 1 3 3v11H7a3 3 0 0 0-3 3V5Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      id: 8,
      label: 'Saves',
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 3l7 4v6c0 4-3 6-7 8-4-2-7-4-7-8V7l7-4Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  const rarityStyles = {
    Common: 'border-white/20 text-[var(--soft)]',
    Uncommon: 'border-emerald-400/40 text-emerald-300',
    Rare: 'border-sky-400/40 text-sky-300',
    Epic: 'border-purple-400/40 text-purple-300',
    Legendary: 'border-amber-400/60 text-amber-300',
    Divine: 'border-blue-300/60 text-blue-200',
    Hellforged: 'border-red-400/60 text-red-300',
  };

  const getRarityClass = (rarity) => rarityStyles[rarity] ?? rarityStyles.Common;

  return (
    <div className="relative min-h-screen">
      <div className="starfield" aria-hidden="true"></div>
      <div className="glow" aria-hidden="true"></div>

      <main className="relative z-10 grid h-screen box-border gap-6 px-[clamp(16px,3vw,40px)] py-6 max-[800px]:grid-cols-1 min-[801px]:grid-cols-[minmax(260px,320px)_minmax(320px,1fr)_minmax(240px,320px)]">
        <aside className="flex max-h-[calc(100vh-140px)] flex-col gap-4">
          <div className="flex min-h-0 flex-1 flex-col rounded-[20px] border border-white/10 bg-[linear-gradient(140deg,rgba(13,18,28,0.9),rgba(8,10,16,0.95))] p-4 shadow-[0_24px_60px_rgba(2,6,18,0.55)] backdrop-blur">
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[clamp(1.2rem,1.8vw,1.8rem)]">{campaign?.name ?? 'Campaign'}</h2>
                  <p className="m-0 text-xs text-[var(--soft)]">{campaign?.class_name ?? 'Loading...'}</p>
                </div>
                <Link
                  className="rounded-full border border-white/20 bg-transparent px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-white/40"
                  to="/"
                >
                  Back
                </Link>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {leftMenu.map((item) => {
                  const isActive = leftTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setLeftTab(item.id)}
                      className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[0.55rem] uppercase tracking-[0.2em] transition ${
                        isActive
                          ? 'border-[rgba(214,179,106,0.6)] bg-[rgba(214,179,106,0.12)] text-[var(--accent)] shadow-[0_0_0_1px_rgba(214,179,106,0.35)]'
                          : 'border-white/10 text-[var(--soft)] hover:border-white/30'
                      }`}
                    >
                      <span className="text-[0.9rem]">{item.icon}</span>
                      <span className="leading-tight">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 min-h-0 min-w-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {leftTab === 1 && (
                <div className="grid gap-3">
                  <div className="flex flex-wrap gap-2">
                    {['quests', 'bounties', 'rumors'].map((tab) => {
                      const isActive = logTab === tab;
                      const label =
                        tab === 'quests'
                          ? `Quest Log (${questLog.length})`
                          : tab === 'bounties'
                            ? `Bounties (${bounties.length})`
                            : `Rumors (${rumors.length})`;
                      return (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setLogTab(tab)}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                            isActive
                              ? 'border-[rgba(214,179,106,0.6)] text-[var(--accent)]'
                              : 'border-white/15 text-[var(--soft)] hover:border-white/40'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {logTab === 'quests' && (
                    <div className="grid gap-3">
                      {questLog.length === 0 && (
                        <p className="m-0 text-sm text-[var(--soft)]">No active quests.</p>
                      )}
                      {questLog.map((quest) => (
                        <div
                          key={quest.id}
                          className="grid gap-1.5 rounded-[14px] border border-white/10 bg-white/5 p-3"
                        >
                          <details className="group" open>
                            <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                              <div className="grid gap-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold">{quest.title}</span>
                                  <span className="text-[var(--soft)] transition group-open:rotate-180">
                                    <svg
                                      viewBox="0 0 24 24"
                                      className="h-4 w-4"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.6"
                                    >
                                      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  </span>
                                </div>
                                <span className="inline-flex w-fit items-center rounded-full border border-[rgba(116,199,194,0.7)] px-2 py-0.5 text-xs font-semibold leading-none text-[var(--accent-2)]">
                                  {quest.status}
                                </span>
                              </div>
                            </summary>
                            <div className="mt-2 grid gap-1.5">
                              <p className="m-0 text-sm text-[var(--soft)]">{quest.description}</p>
                              <span className="text-sm font-semibold text-[var(--accent)]">{quest.xp} XP</span>
                            </div>
                          </details>
                        </div>
                      ))}
                    </div>
                  )}
                  {logTab === 'bounties' && (
                    <div className="grid gap-3">
                      {bounties.map((bounty) => (
                        <div
                          key={bounty.id}
                          className="grid gap-1.5 rounded-[14px] border border-white/10 bg-white/5 p-3"
                        >
                          <div className="grid gap-1">
                            <span className="font-semibold">{bounty.title}</span>
                            <span className="inline-flex w-fit items-center rounded-full border border-[rgba(116,199,194,0.7)] px-2 py-0.5 text-xs font-semibold leading-none text-[var(--accent-2)]">
                              {bounty.status}
                            </span>
                          </div>
                          <p className="m-0 text-sm text-[var(--soft)]">Reward: {bounty.reward}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {logTab === 'rumors' && (
                    <div className="grid gap-3">
                      {rumors.map((rumor) => (
                        <div
                          key={rumor.id}
                          className="grid gap-2 rounded-[14px] border border-[rgba(214,179,106,0.3)] bg-[rgba(14,11,3,0.6)] p-3"
                        >
                          <details className="group" open>
                            <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold">{rumor.title}</span>
                                <span className="text-[var(--soft)] transition group-open:rotate-180">
                                  <svg
                                    viewBox="0 0 24 24"
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                  >
                                    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </span>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 font-semibold">
                                <span className="rounded-full border border-[rgba(116,199,194,0.7)] px-2 py-0.5 text-xs text-[var(--accent-2)]">
                                  Lvl {rumor.level}
                                </span>
                                <span className="rounded-full border border-white/20 px-2 py-0.5 text-xs text-[var(--soft)]">
                                  {rumor.xp} XP
                                </span>
                              </div>
                            </summary>
                            <div className="mt-2 grid gap-2">
                              <p className="m-0 text-sm text-[var(--soft)]">{rumor.summary}</p>
                              {rumor.notes?.length ? (
                                <ul className="m-0 list-disc pl-5 text-xs text-[var(--soft)]">
                                  {rumor.notes.map((note) => (
                                    <li key={note}>{note}</li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          </details>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {leftTab === 2 && (
                <div className="grid gap-3 text-sm">
                  <div className="rounded-[14px] border border-white/10 bg-white/5 p-3">
                    <div className="flex items-start justify-between gap-2 text-xs uppercase tracking-[0.16em] text-[var(--soft)]">
                      <span>Player Info</span>
                      <div className="grid justify-items-end gap-1">
                        <span className="text-red-300">HP {hpCurrent}/{hpMax}</span>
                        <span className="text-sky-300/70">{levelLabel}</span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="mt-1 h-1.5 rounded-full bg-white/10">
                        <div
                          className="h-1.5 rounded-full bg-sky-300/40"
                          style={{ width: `${levelPercent}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setPlayerInfoOpen((prev) => !prev)}
                        className="flex w-full items-center justify-between rounded-full border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.16em] text-[var(--soft)] transition hover:border-white/30"
                        aria-expanded={playerInfoOpen}
                      >
                        <span>Details</span>
                        <span className="text-base">{playerInfoOpen ? '−' : '+'}</span>
                      </button>
                      <div
                        className={`grid transition-[grid-template-rows,opacity,margin-top] duration-300 ${
                          playerInfoOpen ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                        }`}
                      >
                        <div className="grid min-h-0 gap-2 overflow-hidden">
                          <p className="m-0 text-base font-semibold text-[var(--ink)]">
                            {campaign?.name ?? 'Unknown Adventurer'}
                          </p>
                          <p className="m-0 text-xs text-[var(--soft)]">
                            {campaign?.class_name ?? 'Class'}
                          </p>
                        <p className="m-0 text-xs text-[var(--soft)]">
                          <span className="font-semibold text-[var(--ink)]">Gender:</span>{' '}
                          {campaign?.gender ?? 'Unknown'}
                        </p>
                        <p className="m-0 text-xs text-[var(--soft)]">
                          <span className="font-semibold text-[var(--ink)]">Race:</span>{' '}
                          {campaign?.race ?? 'Unknown'}
                        </p>
                        <p className="m-0 text-xs text-[var(--soft)]">
                          <span className="font-semibold text-[var(--ink)]">Alignment:</span>{' '}
                          {campaign?.alignment ?? 'Unknown'}
                        </p>
                          <p className="m-0 text-xs text-[var(--soft)]">
                            <span className="font-semibold text-[var(--ink)]">Appearance:</span>{' '}
                            {campaign?.look ?? '---'}
                          </p>
                          <p className="m-0 text-xs text-[var(--soft)]">
                            <span className="font-semibold text-[var(--ink)]">Backstory:</span>{' '}
                            {campaign?.backstory ?? '---'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[14px] border border-white/10 bg-white/5 p-3">
                    <h4 className="m-0 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                      Reputation
                    </h4>
                    <div className="mt-3 flex justify-center">
                      <div className="relative h-36 w-36">
                        <svg
                          viewBox="0 0 100 100"
                          className="h-full w-full"
                          aria-hidden="true"
                        >
                          <polygon
                            points={repChart.outer}
                            fill="none"
                            stroke="rgba(255,255,255,0.08)"
                            strokeWidth="1"
                          />
                          <polygon
                            points={repChart.mid}
                            fill="none"
                            stroke="rgba(255,255,255,0.06)"
                            strokeWidth="1"
                          />
                          <polygon
                            points={repChart.inner}
                            fill="none"
                            stroke="rgba(255,255,255,0.05)"
                            strokeWidth="1"
                          />
                          <polygon
                            points={repChart.data}
                            fill="rgba(214,179,106,0.35)"
                            stroke="rgba(214,179,106,0.8)"
                            strokeWidth="1.2"
                          />
                          {REP_ORDER.map((rep, index) => {
                            const angle = ((-90 + index * 60) * Math.PI) / 180;
                            const x = 50 + Math.cos(angle) * 36;
                            const y = 50 + Math.sin(angle) * 36;
                            return (
                              <g key={`rep-node-${rep}`}>
                                <circle
                                  cx={x}
                                  cy={y}
                                  r="4.4"
                                  fill="rgba(5,6,7,0.95)"
                                  stroke="rgba(255,255,255,0.25)"
                                  strokeWidth="1"
                                />
                              </g>
                            );
                          })}
                        </svg>
                        {REP_ORDER.map((rep, index) => {
                          const angle = ((-90 + index * 60) * Math.PI) / 180;
                          const x = 50 + Math.cos(angle) * 52;
                          const y = 50 + Math.sin(angle) * 52;
                          return (
                            <div
                              key={`rep-icon-${rep}`}
                              className="absolute -translate-x-1/2 -translate-y-1/2 text-[var(--accent)]"
                              style={{ left: `${x}%`, top: `${y}%` }}
                            >
                              {REP_ICONS[rep]}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="mt-6 grid gap-4">
                      {Object.keys(reputationByName).length === 0 && (
                        <p className="m-0 text-xs text-[var(--soft)]">No reputation recorded.</p>
                      )}
                      {Object.entries(reputationByName).map(([rep, value]) => {
                        const safeValue = Number.isFinite(value) ? value : 0;
                        const displayValue = safeValue > 0 ? `+${safeValue}` : safeValue;
                        const tiers = REP_LABELS[rep]?.tiers ?? [];
                        const leftLabel = tiers[0] ?? REP_LABELS[rep]?.left ?? 'Negative';
                        const rightLabel = tiers[8] ?? tiers[tiers.length - 1] ?? REP_LABELS[rep]?.right ?? 'Positive';
                        const { label, tone } = getRepStatus(rep, safeValue);
                        const position = getRepPosition(safeValue);
                        const knobPosition = Math.min(94, Math.max(6, position));
                        const fillLeft = safeValue >= 0 ? 50 : position;
                        const fillWidth = (Math.abs(safeValue) / 20) * 50;
                        const tickValues = [-15, -10, -5, 0, 5, 10, 15];
                        const toneClass =
                          tone === 'positive'
                            ? 'border-emerald-400/40 text-emerald-200'
                            : tone === 'negative'
                              ? 'border-amber-500/40 text-amber-200'
                              : tone === 'warning'
                                ? 'border-orange-500/40 text-orange-200'
                                : 'border-white/20 text-[var(--soft)]';
                        return (
                          <div key={rep} className="grid gap-2 rounded-[14px] border border-white/10 bg-white/5 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2 text-sm">
                                <span className="rounded-full border border-[rgba(214,179,106,0.4)] p-1 text-[var(--accent)]">
                                  {REP_ICONS[rep]}
                                </span>
                                <span className="font-semibold uppercase tracking-[0.1em] text-[var(--accent)]">
                                  {rep}
                                </span>
                              </div>
                              <span className={`rounded-full border px-3 py-1 text-[0.7rem] uppercase tracking-[0.16em] ${toneClass}`}>
                                {label}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-[var(--soft)]">
                              <span>{leftLabel}</span>
                              <span>{rightLabel}</span>
                            </div>
                            <div className="relative h-2 rounded-full bg-white/10">
                              <div
                                className="absolute top-0 h-2 rounded-full bg-[var(--accent)]"
                                style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
                              ></div>
                              {tickValues.map((tick) => (
                                <span
                                  key={`${rep}-${tick}`}
                                  className={`absolute top-0 h-2 w-px ${
                                    tick === 0 ? 'bg-white/30' : 'bg-white/15'
                                  }`}
                                  style={{ left: `${getRepPosition(tick)}%` }}
                                ></span>
                              ))}
                              <div
                                className="absolute -top-2 h-6 w-6 -translate-x-1/2 rounded-full border border-white/20 bg-[rgba(15,17,22,0.95)] text-[var(--accent)] shadow-[0_0_0_4px_rgba(15,17,22,0.6)]"
                                style={{ left: `${knobPosition}%` }}
                              >
                                <div className="flex h-full w-full items-center justify-center text-[0.7rem]">
                                  {REP_ICONS[rep]}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-[var(--soft)]">
                              <span style={getValueStyle(safeValue, 20)}>{displayValue}</span>
                              <span>{Math.min(20, Math.abs(safeValue))}/20</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {leftTab === 3 && (
                <div className="grid gap-3">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--soft)]">
                    <span>Ability Scores</span>
                    <span>Skill Points: {skillPoints}</span>
                  </div>
                  {abilities.map((ability) => {
                    const { score, required, progress } = getAbilityProgress(ability);
                    const modifier = getAbilityModifier(score);
                    const width = required ? (progress / required) * 100 : 100;
                    const abilitySkills = skillsByAbility[ability] ?? [];
                    return (
                      <div
                        key={ability}
                        className="rounded-[14px] border border-[rgba(214,179,106,0.35)] bg-[rgba(14,11,3,0.5)] p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                              {ability}
                            </div>
                            <div className="mt-1 text-xs text-[var(--soft)]">
                              Modifier {modifier >= 0 ? `+${modifier}` : modifier}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-[var(--ink)]">{score}</span>
                            {skillPoints > 0 && score < 30 ? (
                              <button
                                type="button"
                                onClick={() => handleSpendSkillPoint(ability)}
                                className="rounded-full border border-[rgba(214,179,106,0.6)] px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--accent)] transition hover:-translate-y-0.5 hover:border-[rgba(214,179,106,0.9)]"
                              >
                                +1
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-xs text-[var(--soft)]">
                          <div className="h-1.5 flex-1 rounded-full bg-white/10">
                            <div
                              className="h-1.5 rounded-full bg-[var(--accent)]"
                              style={{ width: `${width}%` }}
                            ></div>
                          </div>
                          <span>{required ? `${progress}/${required}` : 'MAX'}</span>
                        </div>
                        {skills.length ? (
                          <div className="mt-3 grid gap-2 text-sm">
                          {abilitySkills.map((skill) => {
                              const { level, required: skillRequired, progress: skillProgressValue } =
                                getSkillProgress(skill);
                              const skillWidth = (skillProgressValue / skillRequired) * 100;
                              const displayValue = level > 0 ? `+${level}` : level;
                              return (
                                <div key={skill} className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="w-8 text-right font-semibold"
                                      style={getValueStyle(level, 10)}
                                    >
                                      {displayValue}
                                    </span>
                                    <span>{skill}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-[var(--soft)]">
                                    <div className="h-1.5 w-20 rounded-full bg-white/10">
                                      <div
                                        className="h-1.5 rounded-full bg-[var(--accent)]"
                                        style={{ width: `${skillWidth}%` }}
                                      ></div>
                                    </div>
                                    <span>
                                      {skillProgressValue}/{skillRequired}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="mt-3 text-xs text-[var(--soft)]">No skills tied to this ability.</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {leftTab === 4 && (
                <div className="grid gap-3">
                  <div className="flex gap-2">
                    {['inventory', 'journal'].map((tab) => {
                      const isActive = inventoryTab === tab;
                      return (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setInventoryTab(tab)}
                          className={`flex-1 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                            isActive
                              ? 'border-[rgba(214,179,106,0.6)] text-[var(--accent)]'
                              : 'border-white/15 text-[var(--soft)] hover:border-white/40'
                          }`}
                        >
                          {tab === 'inventory' ? 'Inventory' : 'Journal'}
                        </button>
                      );
                    })}
                  </div>
                  {inventoryTab === 'inventory' ? (
                    <div className="grid gap-3">
                      <div className="grid grid-cols-2 gap-2 text-center text-sm">
                        {(() => {
                          const equippedWeapons = (inventoryData?.equipped?.weapons ?? []).filter(Boolean);
                          const twoHandedEquipped = equippedWeapons.find(isTwoHandedWeapon);
                          const weaponsForDamage = twoHandedEquipped ? [twoHandedEquipped] : equippedWeapons;
                          const weaponLabel = formatWeaponLabel(weaponsForDamage);
                          const abilityForWeapon = weaponsForDamage.length
                            ? getWeaponAbility(weaponsForDamage[0])
                            : null;
                          const bonusStat = abilityForWeapon
                            ? getAbilityModifier(abilityScoresByName[abilityForWeapon] ?? 10)
                            : 0;
                          const damageLabel = formatDamageLabel(weaponsForDamage, bonusStat);
                          const totalAc = Object.values(inventoryData?.equipped?.armor ?? {}).reduce(
                            (sum, item) => sum + (item?.ac ?? 0),
                            0
                          );
                          const buffPrimary = activeBuffs[0];
                          const buffValue = buffPrimary?.name ?? 'None';
                          const buffDetail = buffPrimary?.detail ?? 'No active effects';
                          const summaryCards = [
                            {
                              label: 'Buff',
                              value: buffValue,
                              detail: buffDetail,
                              tone: 'text-[var(--soft)]',
                              icon: (
                                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                                  <path d="M12 3v6m0 0 4-4m-4 4-4-4M5 13h14M7 21h10" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              ),
                            },
                            {
                              label: 'AC',
                              value: totalAc,
                              tone: 'text-[var(--accent-2)]',
                              icon: (
                                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                                  <path d="M12 3l7 4v6c0 4-3 6-7 8-4-2-7-4-7-8V7l7-4Z" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              ),
                            },
                            {
                              label: 'Damage',
                              value: damageLabel,
                              tone: 'text-[var(--accent)]',
                              icon: (
                                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                                  <path d="M4 20l6-6m0 0 4-4 4 4-4 4-4-4Zm0 0-4-4 2-2 4 4" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              ),
                            },
                            {
                              label: 'Weapon',
                              value: weaponLabel,
                              tone: 'text-[var(--soft)]',
                              icon: (
                                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                                  <path d="M6 18 18 6m0 0h-4m4 0v4M6 18l-2 2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              ),
                            },
                          ];
                          return summaryCards.map((item) => (
                            <div key={item.label} className="rounded-xl border border-white/10 bg-white/5 px-2 py-3">
                              <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--soft)]">
                                <span className="text-[var(--accent)]">{item.icon}</span>
                                <span>{item.label}</span>
                              </div>
                              <p className={`m-0 mt-1 text-base font-semibold ${item.tone}`}>{item.value}</p>
                              {item.detail ? (
                                <p className="m-0 mt-1 text-[0.7rem] text-[var(--soft)]">{item.detail}</p>
                              ) : null}
                            </div>
                          ));
                        })()}
                      </div>
                      <div className="rounded-[14px] border border-white/10 bg-white/5 p-3">
                        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                          Equipped
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {inventoryData.equipped.weapons.map((item, index) => (
                            <div
                              key={`weapon-${index}`}
                              className={`relative rounded-xl border p-2 text-xs ${
                                item ? 'border-[rgba(214,179,106,0.4)]' : 'border-dashed border-white/10 text-[var(--soft)]'
                              }`}
                            >
                              {item ? (
                                <button
                                  type="button"
                                  onClick={() => handleUnequipWeapon(index)}
                                  className="absolute -right-2 -top-2 h-5 w-5 rounded-full border border-red-500/60 bg-[rgba(10,12,16,0.9)] text-[0.6rem] font-semibold text-red-300 shadow-[0_4px_10px_rgba(0,0,0,0.35)] transition hover:border-red-400 hover:text-red-200"
                                  aria-label="Unequip weapon"
                                >
                                  ×
                                </button>
                              ) : null}
                              <p className="m-0 font-semibold">{item ? item.name : 'Empty Slot'}</p>
                              <p className="m-0 text-[var(--soft)]">
                                {item ? `${item.type} • ${item.damage}` : 'Weapon'}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {Object.entries(inventoryData.equipped.armor).map(([slot, item]) => (
                            <div
                              key={slot}
                              className={`relative rounded-xl border p-2 text-xs ${
                                item ? 'border-[rgba(116,199,194,0.4)]' : 'border-dashed border-white/10 text-[var(--soft)]'
                              }`}
                            >
                              {item ? (
                                <button
                                  type="button"
                                  onClick={() => handleUnequipArmor(slot)}
                                  className="absolute -right-2 -top-2 h-5 w-5 rounded-full border border-red-500/60 bg-[rgba(10,12,16,0.9)] text-[0.6rem] font-semibold text-red-300 shadow-[0_4px_10px_rgba(0,0,0,0.35)] transition hover:border-red-400 hover:text-red-200"
                                  aria-label={`Unequip ${slot}`}
                                >
                                  ×
                                </button>
                              ) : null}
                              <p className="m-0 font-semibold">{item ? item.name : slot}</p>
                              <p className="m-0 text-[var(--soft)]">
                                {item ? `+${item.ac} AC` : 'Armor Slot'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {['weapons', 'armor', 'consumables', 'misc'].map((section) => (
                        <div key={section} className="rounded-[14px] border border-white/10 bg-white/5 p-3">
                          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                            {section}
                          </div>
                          <div className="grid gap-2">
                            {inventoryData.sections[section].map((item) => {
                              const potencyText = (() => {
                                if (section !== 'consumables') return null;
                                if (item.potency) return item.potency;
                                const effect = item.effect?.toLowerCase() ?? '';
                                if (effect.includes('health')) return '5 HP';
                                if (effect.includes('strength') || effect.includes('soul')) return '+1d4';
                                return null;
                              })();
                              const description =
                                section === 'consumables'
                                  ? item.note || item.effect || 'Consumable'
                                  : item.weaponType || item.slot || item.note || item.effect || 'Item';
                              return (
                                <div
                                  key={item.id}
                                  className="rounded-xl border border-white/10 bg-black/20 p-2 text-xs"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <p className="m-0 font-semibold">{item.name}</p>
                                    <p className="m-0 text-[var(--soft)]">{description}</p>
                                  </div>
                                  <div className="text-right">
                                    {item.damage && (
                                      <p className="m-0 text-[var(--accent)]">{item.damage}</p>
                                    )}
                                    {item.ac && (
                                      <p className="m-0 text-[var(--accent-2)]">+{item.ac} AC</p>
                                    )}
                                    {section === 'consumables' && potencyText && (
                                      <p
                                        className={`m-0 ${
                                          item.effect?.toLowerCase().includes('health')
                                            ? 'text-red-300'
                                            : 'text-[var(--accent)]'
                                        }`}
                                      >
                                        {potencyText}
                                      </p>
                                    )}
                                    {(section === 'weapons' || section === 'armor') && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          section === 'weapons'
                                            ? handleEquipWeapon(item)
                                            : handleEquipArmor(item)
                                        }
                                        className="mt-1 rounded-full border border-[rgba(214,179,106,0.6)] px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] transition hover:-translate-y-0.5 hover:border-[rgba(214,179,106,0.9)]"
                                      >
                                        Equip
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <span
                                    className={`rounded-full border px-2 py-0.5 text-[0.7rem] ${getRarityClass(
                                      item.rarity
                                    )}`}
                                  >
                                    {item.rarity}
                                  </span>
                                  {item.effect && (
                                    <span
                                      className={`rounded-full border px-2 py-0.5 text-[0.7rem] ${
                                        item.effect.toLowerCase().includes('health')
                                          ? 'border-red-500/40 text-red-300'
                                          : 'border-white/20 text-[var(--soft)]'
                                      }`}
                                    >
                                      {item.effect}
                                    </span>
                                  )}
                                  {section === 'consumables' && (
                                    <button
                                      type="button"
                                      onClick={() => handleUseConsumable(item)}
                                      disabled={
                                        (item.effect ?? '')
                                          .toLowerCase()
                                          .includes('health') && hpCurrent >= hpMax
                                      }
                                      className="rounded-full border border-emerald-400/50 px-2 py-0.5 text-[0.7rem] font-semibold text-emerald-200 transition hover:-translate-y-0.5 hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      Use
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {journalMode === 'list' ? (
                        <>
                          <div className="flex items-center gap-2">
                            <input
                              type="search"
                              value={journalQuery}
                              onChange={(event) => setJournalQuery(event.target.value)}
                              placeholder="Search notes..."
                              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--soft)] focus:border-[var(--accent)] focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={handleStartJournalEntry}
                              className="rounded-xl border border-[rgba(214,179,106,0.6)] px-3 py-2 text-base font-semibold text-[var(--accent)] transition hover:-translate-y-0.5 hover:border-[rgba(214,179,106,0.9)]"
                              aria-label="Add journal note"
                            >
                              +
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2 text-[0.7rem]">
                            {JOURNAL_CATEGORIES.map((category) => {
                              const isActive = journalFilter === category;
                              const accentClass = JOURNAL_CATEGORY_STYLES[category] ?? 'border-white/20 text-[var(--soft)]';
                              return (
                                <button
                                  key={category}
                                  type="button"
                                  onClick={() => setJournalFilter(category)}
                                  className={`rounded-full border px-3 py-1 font-semibold uppercase tracking-[0.16em] transition ${
                                    isActive
                                      ? `${accentClass} shadow-[0_0_12px_rgba(214,179,106,0.12)]`
                                      : 'border-white/10 text-[var(--soft)] hover:border-white/30'
                                  }`}
                                >
                                  {category}
                                </button>
                              );
                            })}
                          </div>
                          <div className="grid gap-2">
                            {filteredJournalEntries.length === 0 ? (
                              <div className="rounded-[14px] border border-white/10 bg-white/5 p-4 text-center text-sm text-[var(--soft)]">
                                No notes yet. Add one to get started.
                              </div>
                            ) : (
                              filteredJournalEntries.map((entry) => (
                                <button
                                  key={entry.id}
                                  type="button"
                                  onClick={() => handleEditJournalEntry(entry)}
                                  className="rounded-[14px] border border-white/10 bg-white/5 p-3 text-left text-sm transition hover:border-[rgba(214,179,106,0.4)]"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="m-0 font-semibold">{entry.title}</p>
                                    <span
                                      className={`rounded-full border px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.14em] ${
                                        JOURNAL_CATEGORY_STYLES[entry.category] ?? 'border-white/20 text-[var(--soft)]'
                                      }`}
                                    >
                                      {entry.category}
                                    </span>
                                  </div>
                                  <p className="m-0 mt-1 text-xs text-[var(--soft)] line-clamp-2">
                                    {stripHtml(entry.content) || 'No content yet.'}
                                  </p>
                                  <p className="m-0 mt-2 text-[0.65rem] uppercase tracking-[0.16em] text-[var(--soft)]">
                                    {new Date(entry.createdAt ?? Date.now()).toLocaleDateString()}
                                  </p>
                                </button>
                              ))
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="grid gap-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={journalDraft.title}
                              onChange={(event) =>
                                setJournalDraft((prev) => ({ ...prev, title: event.target.value }))
                              }
                              placeholder="Note title..."
                              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[var(--ink)] placeholder:text-[var(--soft)] focus:border-[var(--accent)] focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={handleSaveJournalEntry}
                              className="rounded-xl border border-[rgba(214,179,106,0.6)] px-2.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--accent)] transition hover:-translate-y-0.5 hover:border-[rgba(214,179,106,0.9)]"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelJournalEntry}
                              className="rounded-xl border border-white/10 px-2.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--soft)] transition hover:border-white/30 hover:text-[var(--ink)]"
                            >
                              Back
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5 text-[0.6rem]">
                            {JOURNAL_CATEGORIES.filter((category) => category !== 'All').map((category) => {
                              const isActive = journalDraft.category === category;
                              const accentClass = JOURNAL_CATEGORY_STYLES[category] ?? 'border-white/20 text-[var(--soft)]';
                              return (
                                <button
                                  key={category}
                                  type="button"
                                  onClick={() =>
                                    setJournalDraft((prev) => ({ ...prev, category }))
                                  }
                                  className={`rounded-full border px-2.5 py-0.5 font-semibold uppercase tracking-[0.16em] transition ${
                                    isActive
                                      ? `${accentClass} shadow-[0_0_12px_rgba(214,179,106,0.12)]`
                                      : 'border-white/10 text-[var(--soft)] hover:border-white/30'
                                  }`}
                                >
                                  {category}
                                </button>
                              );
                            })}
                          </div>
                          <div id="journal-toolbar" className="ql-toolbar ql-snow journal-toolbar">
                            <span className="ql-formats">
                              <button type="button" className="ql-bold"></button>
                              <button type="button" className="ql-italic"></button>
                              <button type="button" className="ql-underline"></button>
                              <button type="button" className="ql-strike"></button>
                            </span>
                            <span className="ql-formats">
                              <button type="button" className="ql-list" value="ordered"></button>
                              <button type="button" className="ql-list" value="bullet"></button>
                            </span>
                            <span className="ql-formats">
                              <select className="ql-align"></select>
                            </span>
                            <span className="ql-formats">
                              <button type="button" className="ql-clean"></button>
                            </span>
                          </div>
                          <ReactQuill
                            theme="snow"
                            value={journalDraft.content}
                            onChange={(value) =>
                              setJournalDraft((prev) => ({ ...prev, content: value }))
                            }
                            modules={JOURNAL_MODULES}
                            formats={JOURNAL_FORMATS}
                            className="journal-quill"
                            placeholder="Write your note here..."
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {leftTab === 5 && (
                <div className="grid gap-3">
                  {npcList.length === 0 && (
                    <p className="m-0 text-sm text-[var(--soft)]">No NPCs recorded yet.</p>
                  )}
                  {npcList.map((npc) => {
                    const safeValue = Number.isFinite(npc.reputation) ? npc.reputation : 0;
                    const position = getRepPosition(safeValue);
                    const fillLeft = safeValue >= 0 ? 50 : position;
                    const fillWidth = (Math.abs(safeValue) / 20) * 50;
                    const { label, tone } = getNpcDisposition(safeValue);
                    const toneClass =
                      tone === 'positive'
                        ? 'border-emerald-400/40 text-emerald-200'
                        : tone === 'negative'
                          ? 'border-amber-500/40 text-amber-200'
                          : tone === 'warning'
                            ? 'border-orange-500/40 text-orange-200'
                            : 'border-white/20 text-[var(--soft)]';
                    return (
                      <div
                        key={npc.id ?? npc.name}
                        className="grid gap-2 rounded-[14px] border border-white/10 bg-white/5 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="m-0 text-base font-semibold">{npc.name}</p>
                            <p className="m-0 text-xs text-[var(--soft)]">
                              {npc.role}
                              {npc.gender ? ` • ${npc.gender}` : ''}
                            </p>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-[0.7rem] uppercase tracking-[0.16em] ${toneClass}`}>
                            {label}
                          </span>
                        </div>
                        <p className="m-0 text-sm text-[var(--soft)]">{npc.summary}</p>
                        <div className="text-xs text-[var(--soft)]">
                          Last seen: <span className="text-[var(--ink)]">{npc.lastSeen ?? 'Unknown'}</span>
                        </div>
                        <div className="grid gap-2">
                          <div className="flex items-center justify-between text-xs text-[var(--soft)]">
                            <span>Reputation</span>
                            <span>{safeValue > 0 ? `+${safeValue}` : safeValue}/20</span>
                          </div>
                          <div className="relative h-2 rounded-full bg-white/10">
                            <div
                              className="absolute top-0 h-2 rounded-full bg-[var(--accent)]"
                              style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
                            ></div>
                            <div
                              className="absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full border border-white/20 bg-[rgba(15,17,22,0.95)]"
                              style={{ left: `${position}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {leftTab === 6 && (
                <div className="grid gap-3">
                  <div className="rounded-[14px] border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="m-0 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                        Ossuary
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--soft)]">{ossuaryLoot.length} drops</span>
                        <button
                          type="button"
                          onClick={handleClaimAllLoot}
                          disabled={!ossuaryLoot.length}
                          className="rounded-full border border-[rgba(214,179,106,0.6)] px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--accent)] transition hover:-translate-y-0.5 hover:border-[rgba(214,179,106,0.9)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Claim All
                        </button>
                      </div>
                    </div>
                  </div>
                  {ossuaryLoot.length === 0 ? (
                    <p className="m-0 text-sm text-[var(--soft)]">No drops to claim yet.</p>
                  ) : (
                    <div className="grid gap-3">
                      {ossuaryLoot.map((item) => (
                        <div
                          key={item.id ?? item.name}
                          className="grid gap-2 rounded-[14px] border border-white/10 bg-white/5 p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="m-0 font-semibold">{item.name}</p>
                              <p className="m-0 text-xs text-[var(--soft)]">{item.type}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[0.7rem] ${getRarityClass(
                                  item.rarity
                                )}`}
                              >
                                {item.rarity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleClaimLoot(item)}
                                className="rounded-full border border-[rgba(214,179,106,0.6)] px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--accent)] transition hover:-translate-y-0.5 hover:border-[rgba(214,179,106,0.9)]"
                              >
                                Claim
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--soft)]">
                            {item.type === 'Consumable' ? (
                              (() => {
                                const potency =
                                  item.potency ||
                                  (item.effect?.toLowerCase().includes('health')
                                    ? '5 HP'
                                    : item.effect
                                      ? '+1d4'
                                      : null);
                                return (
                                  <>
                                    <span>{item.effect ?? 'Consumable'}</span>
                                    {potency && (
                                      <span
                                        className={
                                          item.effect?.toLowerCase().includes('health')
                                            ? 'text-red-300'
                                            : 'text-[var(--accent)]'
                                        }
                                      >
                                        {potency}
                                      </span>
                                    )}
                                  </>
                                );
                              })()
                            ) : (
                              <>
                                {item.weaponType && <span>{item.weaponType}</span>}
                                {item.damage && <span className="text-[var(--accent)]">{item.damage}</span>}
                                {item.slot && <span>{item.slot}</span>}
                                {item.ac && <span className="text-[var(--accent-2)]">+{item.ac} AC</span>}
                              </>
                            )}
                          </div>
                          {item.note && <p className="m-0 text-xs text-[var(--soft)]">{item.note}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {leftTab === 7 && (
                <div className="grid gap-3">
                  <div className="rounded-full border border-[rgba(214,179,106,0.6)] bg-[rgba(14,11,3,0.45)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">
                    Spellbook
                  </div>
                  {spellbook.length === 0 ? (
                    <p className="m-0 text-sm text-[var(--soft)]">No spells recorded yet.</p>
                  ) : (
                    <div className="grid items-start gap-4 min-[460px]:grid-cols-[auto_1fr]">
                      <div className="grid content-start gap-2">
                        {spellbook.map((category) => {
                          const isActive = spellCategory === category.id;
                          const icon = SPELL_CATEGORY_ICONS[category.label] ?? SPELL_CATEGORY_ICONS.Magic;
                          const style = SPELL_CATEGORY_STYLES[category.label] ?? SPELL_CATEGORY_STYLES.Magic;
                          return (
                            <button
                              key={category.id ?? category.label}
                              type="button"
                              onClick={() => setSpellCategory(category.id)}
                              className={`grid h-11 w-11 place-items-center rounded-full border transition ${
                                isActive
                                  ? style.icon
                                  : 'border-white/15 text-[var(--soft)] hover:border-white/40'
                              }`}
                            >
                              {icon}
                            </button>
                          );
                        })}
                      </div>
                      <div className="grid content-start gap-3">
                        <div
                          className={`text-xs uppercase tracking-[0.2em] ${
                            SPELL_CATEGORY_STYLES[
                              spellbook.find((category) => category.id === spellCategory)?.label ?? 'Magic'
                            ]?.text ?? 'text-[var(--soft)]'
                          }`}
                        >
                          {spellbook.find((category) => category.id === spellCategory)?.label ?? 'Spells'}
                        </div>
                        {(spellbook.find((category) => category.id === spellCategory)?.spells ?? []).map(
                          (spell) => {
                            const categoryLabel =
                              spellbook.find((category) => category.id === spellCategory)?.label ??
                              'Spell';
                            const rankSource = Number.isFinite(spell.rank) ? spell.rank : spell.level;
                            const rank = Number.isFinite(rankSource) ? rankSource : 0;
                            const tags = [categoryLabel].filter((tag) => tag);
                            const style = SPELL_CATEGORY_STYLES[categoryLabel] ?? SPELL_CATEGORY_STYLES.Magic;

                            return (
                              <details
                                key={spell.id ?? spell.name}
                                className={`group rounded-[16px] border border-white/10 border-l-4 ${style.border} bg-[linear-gradient(145deg,rgba(17,21,30,0.85),rgba(10,12,18,0.95))] px-4 py-3 shadow-[0_18px_40px_rgba(2,6,18,0.5)]`}
                              >
                                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="grid gap-1">
                                      <span className="text-base font-semibold">{spell.name}</span>
                                      <span className={`text-xs uppercase tracking-[0.2em] ${style.text}`}>
                                        {categoryLabel} • {spell.roll}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`grid h-7 w-7 place-items-center rounded-full border text-xs font-semibold ${style.badge}`}
                                      >
                                        {rank}
                                      </span>
                                      <span className={`${style.text} transition group-open:rotate-180`}>
                                        <svg
                                          viewBox="0 0 24 24"
                                          className="h-4 w-4"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="1.6"
                                        >
                                          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                      </span>
                                    </div>
                                  </div>
                                </summary>
                                <div className="mt-3 grid gap-2 border-t border-white/10 pt-3 text-sm text-[var(--soft)]">
                                  <div className="flex flex-wrap gap-2">
                                    {tags.map((tag) => (
                                      <span
                                        key={`${spell.name}-${tag}`}
                                        className={`rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] ${style.pill}`}
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                  <p className="m-0 text-sm text-[var(--soft)]">{spell.description}</p>
                                </div>
                              </details>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {leftTab === 8 && (
                <div className="grid gap-3">
                  <div className="rounded-[14px] border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="m-0 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                        Saving Throws
                      </h4>
                      <span className="rounded-full border border-white/20 px-3 py-1 text-[0.7rem] font-semibold text-[var(--soft)]">
                        Proficiency +{SAVE_PROFICIENCY_BONUS}
                      </span>
                    </div>
                    <p className="m-0 mt-2 text-xs text-[var(--soft)]">
                      Roll d20 and add the listed modifier. Proficient saves include your proficiency bonus.
                    </p>
                  </div>
                  <div className="grid gap-3">
                    {abilities.map((ability) => {
                      const roll = Number.isFinite(saveRolls?.[ability]) ? saveRolls[ability] : null;
                      const mod = roll ? getSaveModifier(roll) : 0;
                      const proficient = saveProficiencies.includes(ability);
                      const total =
                        roll === null ? null : mod + (proficient ? SAVE_PROFICIENCY_BONUS : 0);
                      return (
                        <div
                          key={ability}
                          className="grid gap-2 rounded-[14px] border border-white/10 bg-white/5 p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="m-0 text-sm font-semibold">{ability}</p>
                              <p className="m-0 text-xs text-[var(--soft)]">
                                d20 + {mod >= 0 ? `+${mod}` : mod}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {proficient && (
                                <span className="rounded-full border border-[rgba(214,179,106,0.6)] px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                                  Proficient
                                </span>
                              )}
                              <span className="text-base font-semibold text-[var(--ink)]">
                                {total === null ? '--' : total >= 0 ? `+${total}` : total}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-[var(--soft)]">
                            <span>
                              Roll {roll ?? '--'} · Save mod {mod >= 0 ? `+${mod}` : mod}
                            </span>
                            <span>
                              {proficient
                                ? `Includes +${SAVE_PROFICIENCY_BONUS} proficiency`
                                : 'Not proficient'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          {loading && <p className="m-0 text-sm text-[var(--soft)]">Loading campaign...</p>}
          {error && <p className="m-0 font-semibold text-[var(--danger)]">{error}</p>}
        </aside>

        <section className="grid min-h-[70vh] grid-rows-[auto_1fr_auto] gap-4">
          <header className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-[clamp(1.4rem,2vw,2rem)]">Campaign Narration</h2>
              <p className="m-0 text-sm text-[var(--soft)]">
                {campaign?.name ? `Now playing | ${campaign.name}` : 'Awaiting adventurer'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="grid justify-items-end text-xs uppercase tracking-[0.16em] text-[var(--soft)]">
                <span className="text-red-300">
                  HP {hpCurrent}/{hpMax}
                </span>
                <span className="text-sky-300/70">{levelLabel}</span>
              </div>
              <div className="rounded-full border border-[rgba(214,179,106,0.6)] px-3 py-1 text-[0.75rem] uppercase tracking-[0.12em]">
                Live Session
              </div>
            </div>
          </header>

          <div
            ref={messageListRef}
            className="grid max-h-[calc(100vh-280px)] gap-3 overflow-y-auto rounded-2xl bg-[rgba(7,9,14,0.7)] p-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {messages.length === 0 ? (
              <div className="grid gap-2 rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-[var(--soft)]">
                <span className="font-semibold text-[var(--accent)]">Awaiting the Dungeon Master</span>
                <span>The first scene is about to begin...</span>
              </div>
            ) : null}
            {messages.map((message) => {
              const isPlayer =
                message.sender === campaign?.name ||
                message.sender === 'You' ||
                message.sender === (campaign?.name ?? '');
              return (
                <div key={message.id} className={`flex ${isPlayer ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`grid max-w-[min(620px,100%)] gap-2 rounded-2xl bg-[rgba(28,20,12,0.65)] p-4 ${
                      isPlayer ? 'text-right' : 'text-left'
                    }`}
                  >
                    <div
                      className={`flex items-center gap-3 text-sm ${
                        isPlayer ? 'justify-end' : 'justify-between'
                      }`}
                    >
                      <span className="font-bold tracking-[0.02em] text-[var(--accent)]">
                        {message.sender}
                      </span>
                      <span className="text-sm text-[var(--soft)]">{message.location}</span>
                    </div>
                    <p className="m-0 whitespace-pre-wrap">{renderMessageContent(message.content)}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <form className="sticky bottom-4 z-10 grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-white/10 bg-[rgba(6,8,13,0.85)] p-3 shadow-[0_18px_40px_rgba(2,6,18,0.6)] backdrop-blur" onSubmit={handleSendMessage}>
            <input
              className="rounded-xl border border-white/15 bg-[rgba(6,8,13,0.7)] px-3.5 py-3 text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none focus:ring-2 focus:ring-[rgba(214,179,106,0.4)]"
              type="text"
              value={messageInput}
              onChange={(event) => {
                setMessageInput(event.target.value);
                if (messageError) setMessageError('');
              }}
              placeholder="Describe your next move..."
              disabled={messageSending}
            />
            <button
              className="rounded-full bg-[var(--accent)] px-4 py-2 font-semibold text-[#111] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={messageSending}
            >
              {messageSending ? 'Sending...' : 'Send'}
            </button>
          </form>
          {messageError ? (
            <p className="m-0 text-sm text-[var(--danger)]">{messageError}</p>
          ) : null}
        </section>

        <aside className="grid max-h-[calc(100vh-140px)] gap-[18px] overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="rounded-[20px] border border-white/10 bg-[linear-gradient(140deg,rgba(13,18,28,0.9),rgba(8,10,16,0.95))] p-6 shadow-[0_24px_60px_rgba(2,6,18,0.55)] backdrop-blur">
            <h3 className="text-lg">Dice Tray</h3>
            <div className="my-4 grid grid-cols-[repeat(auto-fit,minmax(90px,1fr))] gap-2.5">
              {[4, 6, 8, 10, 12, 20, 100].map((sides) => (
                <button
                  key={sides}
                  className="rounded-xl border border-white/20 bg-white/10 p-3 font-bold text-[var(--ink)] transition hover:-translate-y-0.5"
                  onClick={() => rollDice(sides)}
                  type="button"
                >
                  d{sides}
                </button>
              ))}
            </div>
            <div className="grid max-h-[200px] gap-2 overflow-y-auto pr-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {rolls.map((roll) => (
                <div className="flex justify-between rounded-xl bg-white/5 px-3 py-2 text-sm" key={roll.id}>
                  <span>d{roll.sides}</span>
                  <span>{roll.result}</span>
                </div>
              ))}
              {rolls.length === 0 && (
                <p className="m-0 text-sm text-[var(--soft)]">Roll a die to log results here.</p>
              )}
            </div>
          </div>
        </aside>
      </main>
      {campaignUid ? (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full border border-white/15 bg-[rgba(6,8,13,0.8)] px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[var(--soft)] shadow-[0_18px_40px_rgba(2,6,18,0.6)] backdrop-blur">
          <span>UID {campaignUid}</span>
          <button
            type="button"
            className="rounded-full border border-white/20 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-white/40"
            onClick={handleCopyUid}
          >
            {uidCopied ? 'Copied' : 'Copy'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

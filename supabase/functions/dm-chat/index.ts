import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.0-flash";
const MODEL_ID = MODEL.replace(/^models\//, "");
const DEFAULT_LOCATION = "Pibe's Tavern | Common room | Night";

const ensureArray = (value: unknown) => (Array.isArray(value) ? value : []);
const ensureObject = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const asNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

const QUEST_XP_DEFAULT = 15;
const RUMOR_XP_DEFAULT = 5;
const XP_MIN = 5;
const XP_MAX = 50;
const NPC_REP_MIN = -20;
const NPC_REP_MAX = 20;
const MAX_LEVEL = 30;

const DEFAULT_ABILITIES = [
  "Strength",
  "Dexterity",
  "Constitution",
  "Intelligence",
  "Wisdom",
  "Charisma",
];

const DEFAULT_SKILLS_BY_ABILITY = {
  Strength: ["Athletics"],
  Dexterity: ["Acrobatics", "Sleight of Hand", "Stealth"],
  Constitution: [],
  Intelligence: ["Arcana", "History", "Investigation", "Nature", "Religion"],
  Wisdom: ["Animal Handling", "Insight", "Medicine", "Perception", "Survival"],
  Charisma: ["Deception", "Intimidation", "Performance", "Persuasion"],
};

const DEFAULT_LOOT_CONFIG = {
  rarity_rolls: [
    { rarity: "Common", min: 1, max: 500 },
    { rarity: "Uncommon", min: 501, max: 800 },
    { rarity: "Rare", min: 801, max: 940 },
    { rarity: "Epic", min: 941, max: 990 },
    { rarity: "Legendary", min: 991, max: 999 },
    {
      rarity: "Divine/Hellforged",
      min: 1000,
      max: 1000,
      variants: ["Divine", "Hellforged"],
    },
  ],
  kind_weights: {
    potion: 40,
    weapon: 30,
    armor: 20,
    item: 10,
  },
  equipment_scaling: {
    Common: { weaponBonus: 0, dieBonus: "", acBonus: 0, doubleDie: false, extraDice: "" },
    Uncommon: { weaponBonus: 1, dieBonus: "", acBonus: 0, doubleDie: false, extraDice: "" },
    Rare: { weaponBonus: 1, dieBonus: "1d4", acBonus: 1, doubleDie: false, extraDice: "" },
    Epic: { weaponBonus: 2, dieBonus: "1d8", acBonus: 2, doubleDie: false, extraDice: "" },
    Legendary: { weaponBonus: 3, dieBonus: "", acBonus: 3, doubleDie: true, extraDice: "" },
    Divine: { weaponBonus: 3, dieBonus: "", acBonus: 4, doubleDie: true, extraDice: "2d10" },
    Hellforged: {
      weaponBonus: 3,
      dieBonus: "",
      acBonus: 4,
      doubleDie: true,
      extraDice: "2d10",
    },
  },
  potion_min_rarity: {
    xp: "Epic",
    health: "Common",
    ability: "Uncommon",
    skill: "Rare",
  },
  potion_potency: {
    Common: { heal: "2d4+2" },
    Uncommon: { heal: "4d4+4" },
    Rare: { heal: "8d4+8", skillLevels: 1 },
    Epic: { heal: "10d4+20", xp: 2, skillLevels: 2 },
    Legendary: { heal: "Full", xp: 5, skillLevels: 5 },
    Divine: { heal: "Full+25", xp: 10, skillLevels: 10, mastery: true },
    Hellforged: { heal: "Full+25", xp: 10, skillLevels: 10, mastery: true },
  },
  ability_skill_potions: {
    Uncommon: { abilityBonus: "+1d4", skillEffect: "", duration: "1 turn" },
    Rare: { abilityBonus: "+1d6", skillEffect: "Advantage on skill", duration: "1 turn" },
    Epic: { abilityBonus: "+1d8", skillEffect: "Advantage +1d4", duration: "2 turns" },
    Legendary: { abilityBonus: "+1d10", skillEffect: "Advantage +1d8", duration: "4 turns" },
    Divine: { abilityBonus: "+1d12", skillEffect: "Auto-success (1/turn)", duration: "Until DM says" },
    Hellforged: { abilityBonus: "+1d12", skillEffect: "Auto-success (1/turn)", duration: "Until DM says" },
  },
};

const DEFAULT_WEAPON_BASES = [
  { name: "Steel Longsword", damage: "1d8", weaponType: "Melee" },
  { name: "Iron Shortsword", damage: "1d6", weaponType: "Melee" },
  { name: "Oak Longbow", damage: "1d8", weaponType: "Ranged" },
  { name: "Ash Staff", damage: "1d6", weaponType: "Melee" },
  { name: "Bronze Dagger", damage: "1d4", weaponType: "Melee" },
];

const DEFAULT_ARMOR_BASES = [
  { name: "Leather Vest", slot: "Body", ac: 2 },
  { name: "Iron Helm", slot: "Head", ac: 1 },
  { name: "Chain Bracers", slot: "Arms", ac: 1 },
  { name: "Reinforced Greaves", slot: "Leggings", ac: 1 },
  { name: "Traveler Cloak", slot: "Cloak", ac: 1 },
];

const DEFAULT_ITEM_BASES = [
  { name: "Ancient Bone Charm", description: "A faint hum lingers within the marrow." },
  { name: "Runed Copper Ring", description: "Warm to the touch, etched with tiny sigils." },
  { name: "Weathered Satchel", description: "Stitched leather with a forgotten crest." },
];

const COPPER_PER_SILVER = 100;
const COPPER_PER_GOLD = 100 * COPPER_PER_SILVER;
const COPPER_PER_PLATINUM = 100 * COPPER_PER_GOLD;

const CLASS_HP_DICE: Record<string, number> = {
  Artificer: 8,
  Barbarian: 12,
  Bard: 8,
  Cleric: 8,
  Druid: 8,
  Fighter: 10,
  Monk: 8,
  Paladin: 10,
  Ranger: 10,
  Rogue: 8,
  Sorcerer: 6,
  Warlock: 8,
  Wizard: 6,
};

const BACKSTORY_WEAPON_KEYWORDS = [
  { key: "sword", damage: "1d8", weaponType: "Melee" },
  { key: "dagger", damage: "1d4", weaponType: "Melee" },
  { key: "axe", damage: "1d12", weaponType: "Melee" },
  { key: "mace", damage: "1d6", weaponType: "Melee" },
  { key: "bow", damage: "1d8", weaponType: "Ranged" },
  { key: "staff", damage: "1d6", weaponType: "Melee" },
  { key: "spear", damage: "1d6", weaponType: "Melee" },
  { key: "hammer", damage: "1d8", weaponType: "Melee" },
  { key: "club", damage: "1d6", weaponType: "Melee" },
  { key: "rapier", damage: "1d8", weaponType: "Melee" },
  { key: "halberd", damage: "1d10", weaponType: "Melee" },
  { key: "scythe", damage: "1d10", weaponType: "Melee" },
];

const stripHtml = (value: unknown) => {
  if (!value) return "";
  return String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
};

const normalizeCrowns = (value: unknown) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const raw = value as Record<string, unknown>;
    const platinum = Math.max(0, Math.floor(asNumber(raw.platinum)));
    const gold = Math.max(0, Math.floor(asNumber(raw.gold)));
    const silver = Math.max(0, Math.floor(asNumber(raw.silver)));
    const copper = Math.max(0, Math.floor(asNumber(raw.copper)));
    const totalCopper =
      platinum * COPPER_PER_PLATINUM +
      gold * COPPER_PER_GOLD +
      silver * COPPER_PER_SILVER +
      copper;
    const nextPlatinum = Math.floor(totalCopper / COPPER_PER_PLATINUM);
    const platinumRemainder = totalCopper - nextPlatinum * COPPER_PER_PLATINUM;
    const nextGold = Math.floor(platinumRemainder / COPPER_PER_GOLD);
    const goldRemainder = platinumRemainder - nextGold * COPPER_PER_GOLD;
    const nextSilver = Math.floor(goldRemainder / COPPER_PER_SILVER);
    const nextCopper = goldRemainder - nextSilver * COPPER_PER_SILVER;
    return {
      platinum: nextPlatinum,
      gold: nextGold,
      silver: nextSilver,
      copper: nextCopper,
    };
  }
  const legacyGold = Math.max(0, Math.floor(asNumber(value)));
  return {
    platinum: Math.floor(legacyGold / 100),
    gold: legacyGold % 100,
    silver: 0,
    copper: 0,
  };
};

const crownsToCopper = (value: unknown) => {
  const crowns = normalizeCrowns(value);
  return (
    crowns.platinum * COPPER_PER_PLATINUM +
    crowns.gold * COPPER_PER_GOLD +
    crowns.silver * COPPER_PER_SILVER +
    crowns.copper
  );
};

const formatCrowns = (value: unknown) => {
  const crowns = normalizeCrowns(value);
  return `${crowns.platinum}p ${crowns.gold}g ${crowns.silver}s ${crowns.copper}c`;
};

const TOOL_LEAK_PATTERNS = [
  /\bdefault_api\b/i,
  /\bfunction_call\b/i,
  /\btool_call\b/i,
  /^print\(/i,
  /\badd_npc\s*\(/i,
  /\bupdate_npc\s*\(/i,
  /\badd_ossuary_item\s*\(/i,
  /\bgenerate_loot\s*\(/i,
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
  /\badjust_crowns\s*\(/i,
  /\bresolve_level_hp\s*\(/i,
  /\bupdate_location\s*\(/i,
  /\badd_journal_entry\s*\(/i,
  /\bupdate_journal_entry\s*\(/i,
];

const scrubToolLeaks = (value: string) => {
  if (!value) return value;
  const withoutFences = value.replace(/```[\s\S]*?```/g, "").trim();
  const lines = withoutFences.split("\n");
  const filtered = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return true;
    return !TOOL_LEAK_PATTERNS.some((pattern) => pattern.test(trimmed));
  });
  return filtered.join("\n").replace(/\n{3,}/g, "\n\n").trim();
};

const countWords = (value: unknown) => {
  const text = stripHtml(value);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
};

const normalizeInventory = (value: unknown) => {
  const base = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const summary = ensureObject((base as any).summary);
  const equipped = ensureObject((base as any).equipped);
  const sections = ensureObject((base as any).sections);

  return {
    summary: {
      crowns: normalizeCrowns((summary as any).crowns),
      ac: asNumber((summary as any).ac),
      damage: (summary as any).damage ?? "",
      weaponType: (summary as any).weaponType ?? "",
    },
    equipped: {
      weapons: Array.isArray((equipped as any).weapons)
        ? [...(equipped as any).weapons, null, null].slice(0, 2)
        : [null, null],
      armor: {
        Head: (equipped as any)?.armor?.Head ?? null,
        Body: (equipped as any)?.armor?.Body ?? null,
        Arms: (equipped as any)?.armor?.Arms ?? null,
        Leggings: (equipped as any)?.armor?.Leggings ?? null,
        Cloak: (equipped as any)?.armor?.Cloak ?? null,
      },
    },
    sections: {
      weapons: ensureArray((sections as any).weapons),
      armor: ensureArray((sections as any).armor),
      consumables: ensureArray((sections as any).consumables),
      misc: ensureArray((sections as any).misc),
    },
  };
};

const updateListItem = <T extends { id?: string }>(
  list: T[],
  match: { id?: string; name?: string; title?: string },
  patch: Partial<T>
) => {
  return list.map((item) => {
    const normalizedName = match.name ? normalizeName(match.name) : "";
    const normalizedTitle = match.title ? normalizeName(match.title) : "";
    const isMatch =
      (match.id && item.id === match.id) ||
      (match.name && normalizeName((item as any).name) === normalizedName) ||
      (match.title && normalizeName((item as any).title) === normalizedTitle);
    return isMatch ? { ...item, ...patch } : item;
  });
};

const sanitizeText = (value: unknown) => stripHtml(value ?? "");

const dedupeByTitle = (list: any[]) => {
  const seen = new Set<string>();
  return list.filter((item) => {
    const key = normalizeName(item?.title);
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const dedupeNpcs = (list: any[]) => {
  const seen = new Map<string, any>();
  list.forEach((npc) => {
    const key = normalizeName(npc?.name);
    if (!key) return;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, npc);
      return;
    }
    const merged = {
      ...existing,
      ...npc,
      name: existing?.name || npc?.name,
      role: npc?.role || existing?.role || "",
      summary: npc?.summary || existing?.summary || "",
      gender: npc?.gender || existing?.gender || "",
      lastSeen: npc?.lastSeen || existing?.lastSeen || "",
      reputation: Number.isFinite(npc?.reputation)
        ? clampNpcReputation(npc.reputation, existing?.reputation ?? 0)
        : clampNpcReputation(existing?.reputation, 0),
      feeling: npc?.feeling || existing?.feeling || "",
    };
    seen.set(key, merged);
  });
  return Array.from(seen.values());
};

const removeRumorByTitle = (rumors: any[], title: string) => {
  const key = normalizeName(title);
  if (!key) return rumors;
  return rumors.filter((rumor) => normalizeName(rumor?.title) !== key);
};

const normalizeName = (value: unknown) => stripHtml(value).trim().toLowerCase();
const isPibe = (value: unknown) => normalizeName(value) === "pibe";

const getClassKey = (value: unknown) => String(value ?? "").replace(/\s*\(.+\)\s*$/, "").trim();

const getHpGainPerLevel = (className: unknown) => {
  const key = getClassKey(className);
  const die = CLASS_HP_DICE[key] ?? 8;
  return Math.max(1, Math.ceil((die + 1) / 2));
};

const normalizePendingHp = (value: unknown, className: unknown) => {
  const base = ensureArray(value);
  return base
    .map((entry: any) => {
      const die = Math.max(1, asNumber(entry?.die, CLASS_HP_DICE[getClassKey(className)] ?? 8));
      const average = Math.max(1, asNumber(entry?.average, Math.ceil((die + 1) / 2)));
      const count = Math.max(1, Math.floor(asNumber(entry?.count, 1)));
      return { die, average, count };
    })
    .filter((entry: any) => entry.count > 0);
};

const cleanWeaponName = (value: unknown) =>
  String(value ?? "")
    .replace(/^(?:have|has|had|wields?|carry|carries|brandish(?:es)?|hold(?:s|ing)?|use(?:s|d|ing)?)\s+(?:a|an|the)\s+/i, "")
    .replace(/^(?:a|an|the|my|your|his|her|their|our)\s+/i, "")
    .replace(
      /^(?:(?:common|uncommon|rare|epic|legendary|divine|hellforged|mythic|masterwork|ancient|cursed|blessed|fine|ornate)\s+)+/i,
      ""
    )
    .replace(/[.,;:]+$/g, "")
    .trim();

const normalizeWeaponKey = (value: unknown) => normalizeName(cleanWeaponName(value));

const extractBackstoryWeapons = (value: unknown) => {
  const story = stripHtml(value);
  if (!story) return [];
  const results = new Map<string, any>();
  const keywordPattern = BACKSTORY_WEAPON_KEYWORDS.map((entry) => entry.key).join("|");
  const explicit = new RegExp(
    `([A-Z][\\w'’\\-]*(?:\\s+[A-Z][\\w'’\\-]*)*\\s+(?:${keywordPattern}))`,
    "g"
  );
  const fallback = new RegExp(
    `(\\b[\\w'’\\-]+(?:\\s+[\\w'’\\-]+){0,2}\\s+(?:${keywordPattern})\\b)`,
    "gi"
  );

  const addMatch = (match: string) => {
    const name = cleanWeaponName(match);
    if (!name) return;
    const lower = normalizeName(name);
    const weaponKey = BACKSTORY_WEAPON_KEYWORDS.find((entry) => lower.includes(entry.key));
    if (!weaponKey) return;
    results.set(lower, {
      id: makeId("weapon"),
      name,
      rarity: "Unique",
      weaponType: weaponKey.weaponType,
      type: "Weapon",
      damage: weaponKey.damage,
      note: "Backstory item",
    });
  };

  let match;
  while ((match = explicit.exec(story)) !== null) {
    addMatch(match[1]);
  }
  if (!results.size) {
    while ((match = fallback.exec(story)) !== null) {
      addMatch(match[1]);
    }
  }

  return Array.from(results.values());
};

const seedBackstoryInventory = (campaign: any) => {
  const items = extractBackstoryWeapons(campaign?.backstory);
  if (!items.length) return campaign;
  const backstoryKeys = new Set(items.map((item: any) => normalizeWeaponKey(item?.name)));
  const inventory = normalizeInventory(campaign?.inventory);
  const existing = new Set<string>();
  const cleanedEquipped = inventory.equipped.weapons.map((item: any) =>
    item?.name ? { ...item, name: cleanWeaponName(item.name) || item.name } : item
  );
  const cleanedWeapons = inventory.sections.weapons.map((item: any) =>
    item?.name ? { ...item, name: cleanWeaponName(item.name) || item.name } : item
  );
  cleanedEquipped.forEach((item: any) => {
    if (item?.name) existing.add(normalizeWeaponKey(item.name));
  });
  const nextWeapons: any[] = [];
  cleanedWeapons.forEach((item: any) => {
    const key = item?.name ? normalizeWeaponKey(item.name) : "";
    if (key && backstoryKeys.has(key)) {
      if (existing.has(key)) return;
      existing.add(key);
    }
    nextWeapons.push(item);
  });
  items.forEach((item: any) => {
    const key = normalizeWeaponKey(item?.name);
    if (!key || existing.has(key)) return;
    nextWeapons.push(item);
    existing.add(key);
  });
  const weaponsChanged = nextWeapons.length !== inventory.sections.weapons.length;
  const equippedChanged = cleanedEquipped.some((item: any, index: number) => {
    const original = inventory.equipped.weapons[index];
    return item?.name && item.name !== original?.name;
  });
  if (!weaponsChanged && !equippedChanged) return campaign;
  return {
    ...campaign,
    inventory: {
      ...inventory,
      sections: {
        ...inventory.sections,
        weapons: nextWeapons,
      },
      equipped: {
        ...inventory.equipped,
        weapons: cleanedEquipped,
      },
    },
  };
};

const clampNpcReputation = (value: unknown, fallback = 0) => {
  const parsed = asNumber(value, fallback);
  return clamp(parsed, NPC_REP_MIN, NPC_REP_MAX);
};

const enforcePibeGender = (list: any[]) =>
  list.map((npc: any) => {
    if (!npc) return npc;
    const repValue = npc?.reputation;
    const nextNpc = {
      ...npc,
      reputation: Number.isFinite(Number(repValue))
        ? clampNpcReputation(repValue, 0)
        : repValue,
    };
    if (!isPibe(npc?.name)) return nextNpc;
    return { ...nextNpc, gender: "Male" };
  });

const pickRandom = <T>(values: T[]) => values[Math.floor(Math.random() * values.length)];

const normalizeRarityName = (value: unknown) => {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.includes("hell")) return "Hellforged";
  if (raw.includes("divine")) return "Divine";
  if (raw.includes("legendary")) return "Legendary";
  if (raw.includes("epic")) return "Epic";
  if (raw.includes("rare")) return "Rare";
  if (raw.includes("uncommon")) return "Uncommon";
  if (raw.includes("common")) return "Common";
  return "";
};

const resolveRarity = (value: unknown, config: any) => {
  const normalized = normalizeRarityName(value);
  if (normalized) return normalized;
  const roll = Math.floor(Math.random() * 1000) + 1;
  const ranges = Array.isArray(config?.rarity_rolls) ? config.rarity_rolls : DEFAULT_LOOT_CONFIG.rarity_rolls;
  const match = ranges.find((range: any) => roll >= range.min && roll <= range.max);
  if (match?.variants?.length) {
    return pickRandom(match.variants);
  }
  return match?.rarity ?? "Common";
};

const resolveLootKind = (value: unknown, config: any) => {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw.includes("weapon")) return "weapon";
  if (raw.includes("armor")) return "armor";
  if (raw.includes("potion") || raw.includes("consumable")) return "potion";
  if (raw.includes("item")) return "item";
  const weights = config?.kind_weights ?? DEFAULT_LOOT_CONFIG.kind_weights;
  const entries = Object.entries(weights).filter(([, weight]) => Number(weight) > 0);
  if (!entries.length) return "item";
  const total = entries.reduce((sum, [, weight]) => sum + Number(weight), 0);
  let roll = Math.random() * total;
  for (const [kind, weight] of entries) {
    roll -= Number(weight);
    if (roll <= 0) return String(kind);
  }
  return String(entries[0][0]);
};

const parseDice = (value: string) => {
  const match = String(value ?? "").match(/^(\d+)d(\d+)$/i);
  if (!match) return null;
  return { count: Number(match[1]), sides: Number(match[2]) };
};

const rollDiceExpression = (value: string, hpMax: number) => {
  const text = String(value ?? "").trim();
  if (!text) return { total: 0, label: "" };
  if (/^full\b/i.test(text)) {
    const bonus = text.match(/\+(\d+)/);
    const temp = bonus ? Number(bonus[1]) : 0;
    return { total: hpMax, label: temp ? `Full + ${temp} Temp` : "Full" };
  }
  const match = text.match(/(\d+)d(\d+)(?:\s*\+\s*(\d+))?/i);
  if (!match) return { total: 0, label: text };
  const count = Number(match[1]);
  const sides = Number(match[2]);
  const bonus = match[3] ? Number(match[3]) : 0;
  let total = bonus;
  for (let index = 0; index < count; index += 1) {
    total += Math.floor(Math.random() * sides) + 1;
  }
  const label = bonus ? `${count}d${sides}+${bonus}` : `${count}d${sides}`;
  return { total, label };
};

const formatDamage = (base: string, bonus: number, dieBonus?: string, extraDice?: string) => {
  const parts = [];
  if (base) parts.push(base);
  if (dieBonus) parts.push(dieBonus);
  if (extraDice) parts.push(extraDice);
  if (bonus) parts.push(String(bonus));
  return parts.join("+");
};

const scaleWeaponDamage = (baseDamage: string, rarity: string, config: any) => {
  const scaling = config?.equipment_scaling?.[rarity] ?? DEFAULT_LOOT_CONFIG.equipment_scaling[rarity] ?? {};
  const parsed = parseDice(baseDamage);
  if (!parsed) {
    return { damage: baseDamage, bonus: scaling.weaponBonus ?? 0 };
  }
  const count = scaling.doubleDie ? parsed.count * 2 : parsed.count;
  const base = `${count}d${parsed.sides}`;
  const damage = formatDamage(base, scaling.weaponBonus ?? 0, scaling.dieBonus, scaling.extraDice);
  return { damage, bonus: scaling.weaponBonus ?? 0 };
};

const scaleArmorAc = (baseAc: number, rarity: string, config: any) => {
  const scaling = config?.equipment_scaling?.[rarity] ?? DEFAULT_LOOT_CONFIG.equipment_scaling[rarity] ?? {};
  return Math.max(0, asNumber(baseAc) + (scaling.acBonus ?? 0));
};

const getLevelRequirement = (level: number) => {
  const value = Math.max(1, Math.floor(level));
  if (value >= MAX_LEVEL) return null;
  if (value <= 1) return 50;
  if (value <= 3) return 55;
  if (value <= 5) return 100;
  if (value <= 7) return 200;
  if (value <= 9) return 300;
  if (value <= 11) return 400;
  if (value <= 13) return 500;
  if (value <= 15) return 600;
  if (value <= 17) return 800;
  if (value <= 19) return 1000;
  if (value <= 21) return 1200;
  if (value <= 23) return 1600;
  if (value <= 25) return 2000;
  if (value <= 27) return 2400;
  if (value <= 29) return 2800;
  return 5000;
};

const applyLevelProgress = (level: number, xp: number, amount: number) => {
  const safeLevel = Math.max(1, Number.isFinite(level) ? level : 1);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { level: safeLevel, xp: Math.max(0, xp ?? 0), gainedLevels: 0 };
  }
  let nextLevel = safeLevel;
  let remaining = (xp ?? 0) + amount;
  let required = getLevelRequirement(nextLevel);
  let gainedLevels = 0;

  while (required && remaining >= required && nextLevel < MAX_LEVEL) {
    remaining -= required;
    nextLevel += 1;
    gainedLevels += 1;
    required = getLevelRequirement(nextLevel);
  }

  return {
    level: nextLevel,
    xp: nextLevel >= MAX_LEVEL || !required ? 0 : Math.max(0, remaining),
    gainedLevels,
  };
};

const normalizeLevelProgress = (level: number, xp: number) => {
  const safeLevel = Math.max(1, Number.isFinite(level) ? level : 1);
  let nextLevel = safeLevel;
  let remaining = Math.max(0, xp ?? 0);
  let required = getLevelRequirement(nextLevel);
  let gainedLevels = 0;

  while (required && remaining >= required && nextLevel < MAX_LEVEL) {
    remaining -= required;
    nextLevel += 1;
    gainedLevels += 1;
    required = getLevelRequirement(nextLevel);
  }

  return {
    level: nextLevel,
    xp: nextLevel >= MAX_LEVEL || !required ? 0 : Math.max(0, remaining),
    gainedLevels,
  };
};

const queueLevelHpGain = (campaign: any, gainedLevels: number) => {
  if (!Number.isFinite(gainedLevels) || gainedLevels <= 0) return campaign;
  const perLevel = getHpGainPerLevel(campaign?.class_name);
  const die = CLASS_HP_DICE[getClassKey(campaign?.class_name)] ?? 8;
  const pending = normalizePendingHp(campaign?.pending_hp, campaign?.class_name);
  pending.push({ count: gainedLevels, die, average: perLevel });
  return {
    ...campaign,
    pending_hp: pending,
  };
};

const normalizeQuestStatus = (value: unknown) => String(value ?? "").trim().toLowerCase();
const isQuestCompleted = (value: unknown) => {
  const status = normalizeQuestStatus(value);
  return status === "completed" || status === "complete" || status === "done" || status === "resolved";
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const updateNpcLastSeenFromText = (campaign: any, text: string, location: string) => {
  if (!text || !location) return campaign;
  const npcs = ensureArray(campaign?.npcs);
  if (!npcs.length) return campaign;
  let changed = false;
  const updated = npcs.map((npc: any) => {
    const name = String(npc?.name ?? "").trim();
    if (name.length < 3) return npc;
    const pattern = new RegExp(`\\b${escapeRegExp(name)}(?:'s)?\\b`, "i");
    if (!pattern.test(text)) return npc;
    if (npc.lastSeen === location) return npc;
    changed = true;
    return { ...npc, lastSeen: location };
  });
  return changed ? { ...campaign, npcs: updated } : campaign;
};

const normalizeLocationParts = (location: string) => {
  const raw = String(location ?? "").trim();
  if (!raw) return "";
  const parts = raw
    .split("|")
    .map((part) => sanitizeText(part))
    .filter(Boolean);
  if (parts.length >= 3) {
    return `${parts[0]} | ${parts[1]} | ${parts[2]}`;
  }
  if (parts.length === 2) {
    return `${parts[0]} | ${parts[1]} | Unknown`;
  }
  if (parts.length === 1) {
    return `${parts[0]} | Unknown | Unknown`;
  }
  return "";
};

const removePlayerFromNpcs = (campaign: any, playerName: string) => {
  const name = String(playerName ?? "").trim();
  if (!name) return campaign;
  const npcs = ensureArray(campaign?.npcs);
  if (!npcs.length) return campaign;
  const filtered = npcs.filter(
    (npc: any) => normalizeName(npc?.name ?? "") !== normalizeName(name)
  );
  return filtered.length === npcs.length ? campaign : { ...campaign, npcs: filtered };
};

const ensureNpcPersistence = (nextCampaign: any, previousCampaign: any, playerName: string) => {
  const nextNpcs = ensureArray(nextCampaign?.npcs);
  if (nextNpcs.length) return nextCampaign;
  const previousNpcs = ensureArray(previousCampaign?.npcs).filter(
    (npc: any) => normalizeName(npc?.name ?? "") !== normalizeName(playerName ?? "")
  );
  if (!previousNpcs.length) return nextCampaign;
  return { ...nextCampaign, npcs: previousNpcs };
};

const QUEST_EXTRACTION_ALLOWED = new Set([
  "add_quest",
  "update_quest",
  "add_rumor",
  "update_rumor",
  "add_bounty",
  "update_bounty",
]);
const NPC_EXTRACTION_ALLOWED = new Set(["add_npc", "update_npc"]);
const LOCATION_EXTRACTION_ALLOWED = new Set(["update_location"]);
const REPUTATION_EXTRACTION_ALLOWED = new Set(["update_reputation"]);

const applyQuestRewards = (campaign: any) => {
  let next = { ...campaign };
  let totalXp = 0;
  const nextQuests = ensureArray(next.quests).map((quest: any) => {
    if (!quest || quest.rewarded || !isQuestCompleted(quest.status)) return quest;
    const xpValue = clamp(asNumber(quest.xp, QUEST_XP_DEFAULT), XP_MIN, XP_MAX);
    totalXp += xpValue;
    return {
      ...quest,
      rewarded: true,
      completed_at: quest.completed_at ?? new Date().toISOString(),
    };
  });
  next.quests = nextQuests;

  if (totalXp > 0) {
    const currentLevel = Math.max(1, asNumber(next.level, 1));
    const currentXp = Math.max(0, asNumber(next.level_xp));
    const updated = applyLevelProgress(currentLevel, currentXp, totalXp);
    next.level = updated.level;
    next.level_xp = updated.xp;
    const currentSkillPoints = Math.max(0, asNumber(next.skill_points));
    next.skill_points = currentSkillPoints + updated.gainedLevels;
    next = queueLevelHpGain(next, updated.gainedLevels);
  }

  return next;
};

const RARITY_ORDER = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Divine", "Hellforged"];

const isRarityAtLeast = (rarity: string, minimum: string) => {
  const currentIndex = RARITY_ORDER.indexOf(rarity);
  const minIndex = RARITY_ORDER.indexOf(minimum);
  if (currentIndex === -1 || minIndex === -1) return false;
  return currentIndex >= minIndex;
};

const selectPotionType = (rarity: string, config: any, requested?: string) => {
  const minRarity = config?.potion_min_rarity ?? DEFAULT_LOOT_CONFIG.potion_min_rarity;
  const options = [
    { key: "health", min: minRarity.health ?? "Common" },
    { key: "xp", min: minRarity.xp ?? "Epic" },
    { key: "ability", min: minRarity.ability ?? "Uncommon" },
    { key: "skill", min: minRarity.skill ?? "Rare" },
  ].filter((entry) => isRarityAtLeast(rarity, entry.min));

  if (requested) {
    const normalized = String(requested).trim().toLowerCase();
    const match = options.find((entry) => entry.key === normalized);
    if (match) return match.key;
  }

  if (!options.length) return "health";
  return pickRandom(options).key;
};

const buildPotion = (args: any, rarity: string, context: any) => {
  const config = context.lootConfig ?? DEFAULT_LOOT_CONFIG;
  const potionType = selectPotionType(rarity, config, args.potionType ?? args.effect ?? args.type);
  const potency = config?.potion_potency?.[rarity] ?? DEFAULT_LOOT_CONFIG.potion_potency[rarity] ?? {};
  const abilitySkill = config?.ability_skill_potions?.[rarity] ?? DEFAULT_LOOT_CONFIG.ability_skill_potions[rarity] ?? {};
  const abilities = context.abilities ?? DEFAULT_ABILITIES;
  const skills = context.skills ?? Object.values(DEFAULT_SKILLS_BY_ABILITY).flat();

  const base = {
    id: makeId("ossuary"),
    type: "Consumable",
    rarity,
    description: args.description ?? "",
  };

  if (potionType === "health") {
    const healRule = potency.heal ?? "2d4+2";
    const roll = rollDiceExpression(String(healRule), context.hpMax ?? 20);
    const note = String(healRule).toLowerCase().includes("full+25")
      ? "Grants 25 temporary HP."
      : "";
    return {
      ...base,
      name: args.name ?? `${rarity} Healing Potion`,
      effect: "Health",
      potency: roll.label,
      heal: roll.total,
      note,
    };
  }

  if (potionType === "xp") {
    return {
      ...base,
      name: args.name ?? `${rarity} Elixir of Experience`,
      effect: "Experience",
      playerXp: potency.xp ?? 2,
      note: potency.xp ? `Grants ${potency.xp} XP.` : "",
    };
  }

  if (potionType === "ability") {
    const ability = args.ability ?? pickRandom(abilities);
    const bonus = abilitySkill.abilityBonus ?? "+1d4";
    const duration = abilitySkill.duration ? `Duration: ${abilitySkill.duration}.` : "";
    return {
      ...base,
      name: args.name ?? `${rarity} ${ability} Tonic`,
      effect: ability,
      ability,
      rollBonus: `${bonus} ${ability} checks`,
      note: duration,
    };
  }

  const skill = args.skill ?? pickRandom(skills);
  const bonus = abilitySkill.abilityBonus ?? "";
  const skillEffect = abilitySkill.skillEffect ? `${abilitySkill.skillEffect}. ` : "";
  const duration = abilitySkill.duration ? `Duration: ${abilitySkill.duration}.` : "";
  const masteryNote = potency.mastery ? "Instant mastery." : "";
  return {
    ...base,
    name: args.name ?? `${rarity} ${skill} Draught`,
    effect: skill,
    skill,
    skillLevelBoost: potency.skillLevels ?? 1,
    rollBonus: bonus ? `${bonus} ${skill} checks` : "",
    note: `${skillEffect}${duration}${masteryNote}`.trim(),
  };
};

const buildWeapon = (args: any, rarity: string, context: any) => {
  const base = args.name ? { name: args.name, damage: args.damage, weaponType: args.weaponType } : pickRandom(DEFAULT_WEAPON_BASES);
  const damageValue = args.damage ?? base.damage ?? "1d6";
  const scaled = scaleWeaponDamage(damageValue, rarity, context.lootConfig);
  return {
    id: makeId("ossuary"),
    type: "Weapon",
    rarity,
    name: args.name ?? base.name,
    weaponType: args.weaponType ?? base.weaponType ?? "Melee",
    damage: scaled.damage,
    description: args.description ?? "",
  };
};

const buildArmor = (args: any, rarity: string, context: any) => {
  const base = args.name ? { name: args.name, slot: args.slot, ac: args.ac } : pickRandom(DEFAULT_ARMOR_BASES);
  const baseAc = Number.isFinite(args.ac) ? args.ac : base.ac ?? 1;
  return {
    id: makeId("ossuary"),
    type: "Armor",
    rarity,
    name: args.name ?? base.name,
    slot: args.slot ?? base.slot ?? "Body",
    ac: scaleArmorAc(baseAc, rarity, context.lootConfig),
    description: args.description ?? "",
  };
};

const buildItem = (args: any, rarity: string) => {
  const base = args.name ? { name: args.name, description: args.description } : pickRandom(DEFAULT_ITEM_BASES);
  return {
    id: makeId("ossuary"),
    type: "Item",
    rarity,
    name: args.name ?? base.name,
    description: args.description ?? base.description ?? "",
    note: args.note ?? "",
  };
};

const buildLootItem = (args: any, context: any) => {
  const rarity = resolveRarity(args.rarity, context.lootConfig);
  const kind = resolveLootKind(args.kind ?? args.type, context.lootConfig);
  if (kind === "weapon") return buildWeapon(args, rarity, context);
  if (kind === "armor") return buildArmor(args, rarity, context);
  if (kind === "potion") return buildPotion(args, rarity, context);
  return buildItem(args, rarity);
};

const mergeLootItem = (generated: any, args: any) => {
  const noteParts = [generated?.note, args?.note].filter(Boolean);
  return {
    ...generated,
    ...args,
    id: generated?.id ?? args?.id ?? makeId("ossuary"),
    type: generated?.type ?? args?.type ?? "Item",
    rarity: generated?.rarity ?? args?.rarity ?? "Common",
    damage: generated?.damage ?? args?.damage,
    ac: generated?.ac ?? args?.ac,
    heal: generated?.heal ?? args?.heal,
    playerXp: generated?.playerXp ?? args?.playerXp,
    skillLevelBoost: generated?.skillLevelBoost ?? args?.skillLevelBoost,
    rollBonus: generated?.rollBonus ?? args?.rollBonus,
    note: noteParts.length ? noteParts.join(" ").trim() : "",
  };
};

const tools = [
  {
    type: "function",
    function: {
      name: "add_quest",
      description: "Add a quest to the quest log.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          status: { type: "string" },
          xp: { type: "number" },
        },
        required: ["title", "description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_quest",
      description: "Update a quest by id or title.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          patch: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              status: { type: "string" },
              xp: { type: "number" },
            },
          },
        },
        required: ["patch"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_bounty",
      description: "Add a bounty to the bounty board.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          reward: { type: "string" },
          status: { type: "string" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_bounty",
      description: "Update a bounty by id or title.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          patch: {
            type: "object",
            properties: {
              title: { type: "string" },
              reward: { type: "string" },
              status: { type: "string" },
            },
          },
        },
        required: ["patch"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_rumor",
      description: "Add a rumor to the rumor board.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          level: { type: "number" },
          xp: { type: "number" },
          notes: { type: "array", items: { type: "string" } },
        },
        required: ["title", "summary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_rumor",
      description: "Update a rumor by id or title.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          patch: {
            type: "object",
            properties: {
              title: { type: "string" },
              summary: { type: "string" },
              level: { type: "number" },
              xp: { type: "number" },
              notes: { type: "array", items: { type: "string" } },
            },
          },
        },
        required: ["patch"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_reputation",
      description: "Adjust reputation values by delta.",
      parameters: {
        type: "object",
        properties: {
          changes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                delta: { type: "number" },
              },
              required: ["name", "delta"],
            },
          },
        },
        required: ["changes"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "adjust_xp",
      description: "Adjust player XP (level_xp) by amount.",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number" },
          set: { type: "number" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "adjust_hp",
      description: "Adjust current HP by amount.",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number" },
          set: { type: "number" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "adjust_crowns",
      description: "Adjust inventory crowns by delta or set.",
      parameters: {
        type: "object",
        properties: {
          platinum: { type: "number" },
          gold: { type: "number" },
          silver: { type: "number" },
          copper: { type: "number" },
          set: {
            type: "object",
            properties: {
              platinum: { type: "number" },
              gold: { type: "number" },
              silver: { type: "number" },
              copper: { type: "number" },
            },
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "resolve_level_hp",
      description: "Resolve pending level-up HP gain by average or roll results.",
      parameters: {
        type: "object",
        properties: {
          method: { type: "string", enum: ["average", "roll"] },
          roll: { type: "number" },
          rolls: { type: "array", items: { type: "number" } },
          total: { type: "number" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_journal_entry",
      description: "Add a journal entry.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          category: { type: "string" },
          content: { type: "string" },
        },
        required: ["title", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_journal_entry",
      description: "Update a journal entry by id or title.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          patch: {
            type: "object",
            properties: {
              title: { type: "string" },
              category: { type: "string" },
              content: { type: "string" },
            },
          },
        },
        required: ["patch"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_npc",
      description: "Add an NPC.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          role: { type: "string" },
          summary: { type: "string" },
          gender: { type: "string" },
          lastSeen: { type: "string" },
          reputation: { type: "number" },
          feeling: { type: "string" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_npc",
      description: "Update an NPC by id or name.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          patch: {
            type: "object",
            properties: {
              name: { type: "string" },
              role: { type: "string" },
              summary: { type: "string" },
              gender: { type: "string" },
              lastSeen: { type: "string" },
              reputation: { type: "number" },
              feeling: { type: "string" },
            },
          },
        },
        required: ["patch"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_loot",
      description: "Generate a loot drop using rarity tables and add it to the ossuary.",
      parameters: {
        type: "object",
        properties: {
          kind: { type: "string" },
          rarity: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          weaponType: { type: "string" },
          damage: { type: "string" },
          slot: { type: "string" },
          ac: { type: "number" },
          potionType: { type: "string" },
          ability: { type: "string" },
          skill: { type: "string" },
          note: { type: "string" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_ossuary_item",
      description: "Add an ossuary item drop.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          type: { type: "string" },
          rarity: { type: "string" },
          description: { type: "string" },
          weaponType: { type: "string" },
          damage: { type: "string" },
          slot: { type: "string" },
          ac: { type: "number" },
          effect: { type: "string" },
          potency: { type: "string" },
          heal: { type: "number" },
          ability: { type: "string" },
          abilityScoreBoost: { type: "number" },
          abilityXp: { type: "number" },
          skill: { type: "string" },
          skillXp: { type: "number" },
          skillLevelBoost: { type: "number" },
          playerXp: { type: "number" },
          note: { type: "string" },
          rollBonus: { type: "string" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_spell",
      description: "Add a spell to the spellbook.",
      parameters: {
        type: "object",
        properties: {
          categoryId: { type: "string" },
          categoryLabel: { type: "string" },
          spell: {
            type: "object",
            properties: {
              name: { type: "string" },
              level: { type: "number" },
              description: { type: "string" },
              roll: { type: "string" },
            },
            required: ["name", "description"],
          },
        },
        required: ["spell"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_inventory_item",
      description: "Add an item to inventory sections (weapons, armor, consumables, misc).",
      parameters: {
        type: "object",
        properties: {
          section: { type: "string" },
          item: { type: "object" },
        },
        required: ["section", "item"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consume_inventory_item",
      description: "Consume or remove an inventory item by id or name.",
      parameters: {
        type: "object",
        properties: {
          section: { type: "string" },
          id: { type: "string" },
          name: { type: "string" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "record_saving_throw",
      description: "Record the latest saving throw roll for an ability.",
      parameters: {
        type: "object",
        properties: {
          ability: { type: "string" },
          roll: { type: "number" },
        },
        required: ["ability", "roll"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_location",
      description: "Update the current location and time string for the campaign.",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string" },
        },
        required: ["location"],
      },
    },
  },
];

const applyToolCalls = (campaign: any, toolCalls: any[], lootContext?: any) => {
  let next = { ...campaign };
  const lootContextSafe = {
    lootConfig: lootContext?.lootConfig ?? DEFAULT_LOOT_CONFIG,
    abilities: lootContext?.abilities ?? DEFAULT_ABILITIES,
    skills: lootContext?.skills ?? Object.values(DEFAULT_SKILLS_BY_ABILITY).flat(),
    hpMax: lootContext?.hpMax ?? asNumber(next.hp, 20),
  };

  const handlers: Record<string, (args: any) => void> = {
    add_quest: (args) => {
      const quests = ensureArray(next.quests);
      const title = sanitizeText(args.title ?? "Untitled Quest");
      if (title) {
        const exists = quests.some((quest: any) => normalizeName(quest?.title) === normalizeName(title));
        if (exists) return;
      }
      const xpValue = clamp(asNumber(args.xp, QUEST_XP_DEFAULT), XP_MIN, XP_MAX);
      quests.push({
        id: makeId("quest"),
        title: title || "Untitled Quest",
        description: sanitizeText(args.description ?? ""),
        status: sanitizeText(args.status ?? "Active") || "Active",
        xp: xpValue,
      });
      next.quests = dedupeByTitle(quests);
      next.rumors = removeRumorByTitle(ensureArray(next.rumors), title || "");
    },
    update_quest: (args) => {
      const quests = ensureArray(next.quests);
      const patch = { ...(args.patch ?? {}) };
      if (patch.xp !== undefined) {
        patch.xp = clamp(asNumber(patch.xp, QUEST_XP_DEFAULT), XP_MIN, XP_MAX);
      }
      if (patch.title !== undefined) patch.title = sanitizeText(patch.title);
      if (patch.description !== undefined) patch.description = sanitizeText(patch.description);
      if (patch.status !== undefined) patch.status = sanitizeText(patch.status);
      const matchById = args.id;
      const matchByTitle = args.title ? sanitizeText(args.title) : "";
      const matchTitleKey = matchByTitle ? normalizeName(matchByTitle) : "";
      let awardXp = 0;
      let shouldAward = false;

      const nextQuests = quests.map((quest: any) => {
        const isMatch =
          (matchById && quest.id === matchById) ||
          (matchByTitle && normalizeName(quest.title) === matchTitleKey);
        if (!isMatch) return quest;
        const prevStatus = quest.status;
        const nextStatus = patch.status ?? quest.status;
        const alreadyRewarded = Boolean(quest.rewarded);
        const xpValue =
          patch.xp !== undefined
            ? patch.xp
            : clamp(asNumber(quest.xp, QUEST_XP_DEFAULT), XP_MIN, XP_MAX);
        const updated = { ...quest, ...patch };
        if (!alreadyRewarded && !isQuestCompleted(prevStatus) && isQuestCompleted(nextStatus)) {
          awardXp = xpValue;
          shouldAward = true;
          updated.rewarded = true;
          updated.completed_at = new Date().toISOString();
        }
        return updated;
      });

      next.quests = dedupeByTitle(nextQuests);
      const questTitle = patch.title ?? nextQuests.find((quest: any) => quest.id === matchById)?.title ?? matchByTitle;
      if (questTitle) {
        next.rumors = removeRumorByTitle(ensureArray(next.rumors), questTitle);
      }

      if (shouldAward && awardXp > 0) {
        const currentLevel = Math.max(1, asNumber(next.level, 1));
        const currentXp = Math.max(0, asNumber(next.level_xp));
        const updated = applyLevelProgress(currentLevel, currentXp, awardXp);
        next.level = updated.level;
        next.level_xp = updated.xp;
        const currentSkillPoints = Math.max(0, asNumber(next.skill_points));
        next.skill_points = currentSkillPoints + updated.gainedLevels;
        next = queueLevelHpGain(next, updated.gainedLevels);
      }
    },
    add_bounty: (args) => {
      const bounties = ensureArray(next.bounties);
      bounties.push({
        id: makeId("bounty"),
        title: args.title ?? "Untitled Bounty",
        reward: args.reward ?? "",
        status: args.status ?? "Open",
      });
      next.bounties = bounties;
    },
    update_bounty: (args) => {
      const bounties = ensureArray(next.bounties);
      next.bounties = updateListItem(bounties, { id: args.id, title: args.title }, args.patch ?? {});
    },
    add_rumor: (args) => {
      const rumors = ensureArray(next.rumors);
      const title = sanitizeText(args.title ?? "Untitled Rumor");
      if (title) {
        const exists = rumors.some((rumor: any) => normalizeName(rumor?.title) === normalizeName(title));
        if (exists) return;
      }
      const xpValue = clamp(asNumber(args.xp, RUMOR_XP_DEFAULT), XP_MIN, XP_MAX);
      rumors.push({
        id: makeId("rumor"),
        title: title || "Untitled Rumor",
        summary: sanitizeText(args.summary ?? ""),
        level: asNumber(args.level, 1),
        xp: xpValue,
        notes: ensureArray(args.notes).map((note: any) => sanitizeText(note)),
      });
      next.rumors = dedupeByTitle(rumors);
    },
    update_rumor: (args) => {
      const rumors = ensureArray(next.rumors);
      const patch = { ...(args.patch ?? {}) };
      if (patch.xp !== undefined) {
        patch.xp = clamp(asNumber(patch.xp, RUMOR_XP_DEFAULT), XP_MIN, XP_MAX);
      }
      if (patch.title !== undefined) patch.title = sanitizeText(patch.title);
      if (patch.summary !== undefined) patch.summary = sanitizeText(patch.summary);
      if (patch.notes !== undefined) patch.notes = ensureArray(patch.notes).map((note: any) => sanitizeText(note));
      next.rumors = dedupeByTitle(updateListItem(rumors, { id: args.id, title: args.title }, patch));
    },
    update_reputation: (args) => {
      const rep = { ...ensureObject(next.reputation) } as Record<string, number>;
      if (Array.isArray(args.changes)) {
        args.changes.forEach((change: any) => {
          const key = change?.name ?? "";
          if (!key) return;
          const current = asNumber(rep[key]);
          const nextValue = clamp(current + asNumber(change?.delta), -20, 20);
          rep[key] = nextValue;
        });
      } else {
        const changes = ensureObject(args.changes) as Record<string, number>;
        Object.entries(changes).forEach(([key, delta]) => {
          const current = asNumber(rep[key]);
          const nextValue = clamp(current + asNumber(delta), -20, 20);
          rep[key] = nextValue;
        });
      }
      next.reputation = rep;
      const repEntries = Object.entries(rep);
      if (repEntries.length) {
        const npcs = ensureArray(next.npcs);
        if (npcs.length) {
          const nextNpcs = npcs.map((npc: any) => {
            const name = String(npc?.name ?? "").trim();
            if (!name) return npc;
            const repMatch = repEntries.find(
              ([repName]) => normalizeName(repName) === normalizeName(name)
            );
            if (!repMatch) return npc;
            return { ...npc, reputation: clampNpcReputation(repMatch[1], npc.reputation ?? 0) };
          });
          next.npcs = nextNpcs;
        }
      }
    },
    adjust_xp: (args) => {
      const currentLevel = Math.max(1, asNumber(next.level, 1));
      const currentXp = Math.max(0, asNumber(next.level_xp));
      const setValue = Number.isFinite(args.set) ? Number(args.set) : null;
      const targetXp = setValue === null ? currentXp + asNumber(args.amount) : setValue;
      const diff = targetXp - currentXp;
      if (diff > 0) {
        const updated = applyLevelProgress(currentLevel, currentXp, diff);
        next.level = updated.level;
        next.level_xp = updated.xp;
        const currentSkillPoints = Math.max(0, asNumber(next.skill_points));
        next.skill_points = currentSkillPoints + updated.gainedLevels;
        next = queueLevelHpGain(next, updated.gainedLevels);
      } else {
        next.level = currentLevel;
        next.level_xp = Math.max(0, targetXp);
      }
    },
    adjust_hp: (args) => {
      const current = Number.isFinite(next.hp_current) ? Number(next.hp_current) : asNumber(next.hp, 20);
      const maxHp = Math.max(1, asNumber(next.hp, 20));
      const setValue = Number.isFinite(args.set) ? Number(args.set) : null;
      const nextValue = setValue === null ? current + asNumber(args.amount) : setValue;
      next.hp_current = clamp(nextValue, 0, maxHp);
    },
    adjust_crowns: (args) => {
      const inventory = normalizeInventory(next.inventory);
      const setValue =
        args.set && typeof args.set === "object" && !Array.isArray(args.set) ? args.set : null;
      if (setValue) {
        inventory.summary.crowns = normalizeCrowns(setValue);
      } else {
        const currentCopper = crownsToCopper(inventory.summary.crowns);
        const deltaCopper =
          asNumber(args.copper) +
          asNumber(args.silver) * COPPER_PER_SILVER +
          asNumber(args.gold) * COPPER_PER_GOLD +
          asNumber(args.platinum) * COPPER_PER_PLATINUM;
        const nextCopper = Math.max(0, currentCopper + deltaCopper);
        inventory.summary.crowns = normalizeCrowns({ copper: nextCopper });
      }
      next.inventory = inventory;
    },
    resolve_level_hp: (args) => {
      const pending = normalizePendingHp(next.pending_hp, next.class_name);
      if (!pending.length) return;
      const entry = pending[0];
      const method = String(args.method ?? "").toLowerCase();
      let gain = 0;

      if (method === "average") {
        gain = entry.average * entry.count;
      } else {
        if (Array.isArray(args.rolls) && args.rolls.length) {
          const rolls = args.rolls.slice(0, entry.count).map((value: any) => asNumber(value));
          gain = rolls.reduce((sum, value) => sum + value, 0);
          if (rolls.length < entry.count) {
            gain += entry.average * (entry.count - rolls.length);
          }
        } else if (Number.isFinite(args.total)) {
          gain = asNumber(args.total);
        } else if (Number.isFinite(args.roll)) {
          gain = asNumber(args.roll);
          if (entry.count > 1) {
            gain += entry.average * (entry.count - 1);
          }
        } else {
          gain = entry.average * entry.count;
        }
      }

      if (gain > 0) {
        const currentMax = Math.max(1, asNumber(next.hp, 20));
        const nextMax = currentMax + gain;
        const current = Number.isFinite(next.hp_current) ? Number(next.hp_current) : currentMax;
        next.hp = nextMax;
        next.hp_current = clamp(current + gain, 0, nextMax);
      }

      pending.shift();
      next.pending_hp = pending;
    },
    update_location: (args) => {
      const location = sanitizeText(args.location ?? "");
      if (!location) return;
      next.current_location = normalizeLocationParts(location);
    },
    add_journal_entry: (args) => {
      const journal = ensureArray(next.journal);
      journal.unshift({
        id: makeId("journal"),
        title: args.title ?? "Untitled Note",
        category: args.category ?? "Personal",
        content: args.content ?? "",
        createdAt: new Date().toISOString(),
      });
      next.journal = journal;
    },
    update_journal_entry: (args) => {
      const journal = ensureArray(next.journal);
      next.journal = updateListItem(journal, { id: args.id, title: args.title }, args.patch ?? {});
    },
    add_npc: (args) => {
      const npcs = ensureArray(next.npcs);
      const rawName = sanitizeText(args.name ?? "Unknown");
      if (!rawName) return;
      const lastSeen = sanitizeText(args.lastSeen ?? next.current_location ?? "");
      const npcPatch = {
        id: makeId("npc"),
        name: rawName || "Unknown",
        role: sanitizeText(args.role ?? ""),
        summary: sanitizeText(args.summary ?? ""),
        gender: isPibe(rawName) ? "Male" : sanitizeText(args.gender ?? ""),
        lastSeen,
        reputation: clampNpcReputation(args.reputation, 0),
        feeling: sanitizeText(args.feeling ?? ""),
      };
      const index = npcs.findIndex((npc: any) => normalizeName(npc?.name) === normalizeName(rawName));
      if (index >= 0) {
        npcs[index] = {
          ...npcPatch,
          ...npcs[index],
          ...npcPatch,
          id: npcs[index]?.id ?? npcPatch.id,
          gender: isPibe(rawName) ? "Male" : npcPatch.gender,
          reputation: Number.isFinite(npcPatch.reputation)
            ? npcPatch.reputation
            : clampNpcReputation(npcs[index]?.reputation, 0),
        };
      } else {
        npcs.push(npcPatch);
      }
      next.npcs = dedupeNpcs(npcs);
    },
    update_npc: (args) => {
      const npcs = ensureArray(next.npcs);
      const patch = { ...(args.patch ?? {}) };
      if (patch.name !== undefined) patch.name = sanitizeText(patch.name);
      if (patch.role !== undefined) patch.role = sanitizeText(patch.role);
      if (patch.summary !== undefined) patch.summary = sanitizeText(patch.summary);
      if (patch.gender !== undefined) patch.gender = sanitizeText(patch.gender);
      if (patch.lastSeen !== undefined) patch.lastSeen = sanitizeText(patch.lastSeen);
      if (patch.feeling !== undefined) patch.feeling = sanitizeText(patch.feeling);
      if (patch.reputation !== undefined) {
        patch.reputation = clampNpcReputation(patch.reputation, 0);
      }
      if (isPibe(args.name ?? patch.name)) {
        patch.gender = "Male";
      }
      const matchName = args.name ? sanitizeText(args.name) : patch.name;
      const matchKey = matchName ? normalizeName(matchName) : "";
      const index = args.id
        ? npcs.findIndex((npc: any) => npc.id === args.id)
        : npcs.findIndex((npc: any) => matchKey && normalizeName(npc?.name) === matchKey);
      if (index >= 0) {
        const updated = {
          ...npcs[index],
          ...patch,
        };
        updated.gender = isPibe(updated.name) ? "Male" : updated.gender ?? "";
        if (updated.reputation !== undefined) {
          updated.reputation = clampNpcReputation(updated.reputation, npcs[index]?.reputation ?? 0);
        }
        npcs[index] = updated;
      } else if (matchName) {
        npcs.push({
          id: makeId("npc"),
          name: matchName,
          role: patch.role ?? "",
          summary: patch.summary ?? "",
          gender: isPibe(matchName) ? "Male" : patch.gender ?? "",
          lastSeen: patch.lastSeen ?? "",
          reputation: clampNpcReputation(patch.reputation, 0),
          feeling: patch.feeling ?? "",
        });
      }
      next.npcs = dedupeNpcs(npcs);
    },
    generate_loot: (args) => {
      const ossuary = ensureArray(next.ossuary);
      const generated = buildLootItem(args ?? {}, lootContextSafe);
      ossuary.push(generated);
      next.ossuary = ossuary;
    },
    add_ossuary_item: (args) => {
      const ossuary = ensureArray(next.ossuary);
      const generated = buildLootItem(args ?? {}, lootContextSafe);
      const merged = mergeLootItem(generated, args ?? {});
      ossuary.push({
        ...merged,
        name: merged.name ?? "Unnamed Item",
        weaponType: merged.weaponType ?? "",
        damage: merged.damage ?? "",
        slot: merged.slot ?? "",
        ac: Number.isFinite(merged.ac) ? merged.ac : asNumber(merged.ac),
        effect: merged.effect ?? "",
        potency: merged.potency ?? "",
        heal: Number.isFinite(merged.heal) ? merged.heal : asNumber(merged.heal),
        ability: merged.ability ?? "",
        abilityScoreBoost: Number.isFinite(merged.abilityScoreBoost)
          ? merged.abilityScoreBoost
          : asNumber(merged.abilityScoreBoost),
        abilityXp: Number.isFinite(merged.abilityXp) ? merged.abilityXp : asNumber(merged.abilityXp),
        skill: merged.skill ?? "",
        skillXp: Number.isFinite(merged.skillXp) ? merged.skillXp : asNumber(merged.skillXp),
        skillLevelBoost: Number.isFinite(merged.skillLevelBoost)
          ? merged.skillLevelBoost
          : asNumber(merged.skillLevelBoost),
        playerXp: Number.isFinite(merged.playerXp) ? merged.playerXp : asNumber(merged.playerXp),
      });
      next.ossuary = ossuary;
    },
    add_spell: (args) => {
      const spellbook = ensureArray(next.spellbook);
      const categoryId = args.categoryId ?? null;
      const categoryLabel = args.categoryLabel ?? "Spells";
      const spell = args.spell ?? {};
      let category = spellbook.find((entry: any) =>
        categoryId ? entry.id === categoryId : entry.label === categoryLabel
      );
      if (!category) {
        category = { id: categoryId ?? makeId("spell"), label: categoryLabel, spells: [] };
        spellbook.push(category);
      }
      category.spells = ensureArray(category.spells);
      category.spells.push({
        id: makeId("spell"),
        name: spell.name ?? "Unknown Spell",
        rank: asNumber(spell.level ?? spell.rank, 1),
        description: spell.description ?? "",
        roll: spell.roll ?? "",
      });
      next.spellbook = spellbook;
    },
    add_inventory_item: (args) => {
      const inventory = normalizeInventory(next.inventory);
      const rawSection = typeof args.section === "string" ? args.section.toLowerCase() : "";
      const section = ["weapons", "armor", "consumables", "misc"].includes(rawSection)
        ? rawSection
        : "misc";
      const rawItem = { ...(args.item ?? {}) };
      const itemName = sanitizeText(rawItem.name ?? "");
      const item = {
        id: makeId("item"),
        ...rawItem,
        name: itemName || rawItem.name,
        description: sanitizeText(rawItem.description ?? rawItem.note ?? ""),
        note: sanitizeText(rawItem.note ?? ""),
      };
      const nameKey = itemName ? normalizeName(itemName) : "";
      const exists = nameKey
        ? inventory.sections[section].some((entry: any) => normalizeName(entry?.name) === nameKey)
        : false;
      if (!exists) {
        inventory.sections[section].push(item);
      }
      next.inventory = inventory;
    },
    consume_inventory_item: (args) => {
      const inventory = normalizeInventory(next.inventory);
      const knownSections = ["weapons", "armor", "consumables", "misc"];
      const rawSection = typeof args.section === "string" ? args.section.toLowerCase() : "";
      const sectionKeys = knownSections.includes(rawSection) ? [rawSection] : knownSections;
      sectionKeys.forEach((key: string) => {
        const list = ensureArray((inventory.sections as any)[key]);
        const nextList = list.flatMap((item: any) => {
          const matches =
            (args.id && item.id === args.id) ||
            (args.name && item.name === args.name) ||
            (!args.id && !args.name ? false : false);
          if (!matches) return [item];
          const quantity = asNumber(item.quantity, 1);
          if (quantity > 1) {
            return [{ ...item, quantity: quantity - 1 }];
          }
          return [];
        });
        (inventory.sections as any)[key] = nextList;
      });
      next.inventory = inventory;
    },
    record_saving_throw: (args) => {
      const saves = { ...ensureObject(next.saving_throws) } as Record<string, number>;
      if (args.ability) {
        saves[args.ability] = asNumber(args.roll, 0);
      }
      next.saving_throws = saves;
    },
  };

  toolCalls.forEach((call) => {
    const name = call?.name ?? call?.function?.name;
    if (!name || !handlers[name]) return;
    let args = call?.args ?? {};
    if (!Object.keys(args).length && call?.function?.arguments) {
      try {
        args = JSON.parse(call.function.arguments);
      } catch (_error) {
        args = {};
      }
    }
    handlers[name](args);
  });

  next.quests = dedupeByTitle(ensureArray(next.quests));
  next.rumors = dedupeByTitle(ensureArray(next.rumors));
  next.npcs = dedupeNpcs(ensureArray(next.npcs));

  return next;
};

const flattenSpellbook = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  const flattened: any[] = [];
  value.forEach((entry: any) => {
    if (entry && Array.isArray(entry.spells)) {
      entry.spells.forEach((spell: any) => {
        flattened.push({
          ...spell,
          category: entry.label ?? spell.category ?? "",
        });
      });
    } else if (entry) {
      flattened.push(entry);
    }
  });
  return flattened;
};

const buildContext = (campaign: any) => {
  const quests = ensureArray(campaign.quests).slice(0, 6);
  const bounties = ensureArray(campaign.bounties).slice(0, 6);
  const rumors = ensureArray(campaign.rumors).slice(0, 6);
  const journal = ensureArray(campaign.journal).slice(0, 6).map((entry: any) => ({
    title: entry.title,
    category: entry.category,
    content: stripHtml(entry.content),
  }));
  const npcs = ensureArray(campaign.npcs).slice(0, 6);
  const buffs = ensureArray(campaign.buffs)
    .slice(0, 6)
    .map((buff: any) => ({
      name: buff?.name ?? "",
      detail: buff?.detail ?? "",
    }));
  const inventory = normalizeInventory(campaign.inventory);
  const spellEntries = flattenSpellbook(campaign.spellbook ?? campaign.spells);
  const spellbook = ensureArray(spellEntries)
    .slice(0, 12)
    .map((spell: any) => ({
      name: spell?.name ?? spell?.title ?? "",
      description: stripHtml(spell?.description ?? ""),
      roll: spell?.roll ?? spell?.dice ?? "",
      level: spell?.level ?? spell?.rank ?? 1,
      category: spell?.category ?? "",
    }));
  const inventoryItems = {
    weapons: ensureArray(inventory.sections?.weapons)
      .map((item: any) => item?.name)
      .filter(Boolean)
      .slice(0, 6),
    armor: ensureArray(inventory.sections?.armor)
      .map((item: any) => item?.name)
      .filter(Boolean)
      .slice(0, 6),
    consumables: ensureArray(inventory.sections?.consumables)
      .map((item: any) => item?.name)
      .filter(Boolean)
      .slice(0, 6),
    misc: ensureArray(inventory.sections?.misc)
      .map((item: any) => item?.name)
      .filter(Boolean)
      .slice(0, 6),
  };
  const ossuary = ensureArray(campaign.ossuary)
    .slice(0, 6)
    .map((item: any) => ({
      name: item?.name ?? "",
      type: item?.type ?? "",
      rarity: item?.rarity ?? "",
    }));

  return {
    name: campaign.name,
    race: campaign.race,
    alignment: campaign.alignment,
    class_name: campaign.class_name,
    appearance: campaign.look,
    gender: campaign.gender,
    backstory: campaign.backstory,
    reputation: campaign.reputation ?? {},
    level: campaign.level,
    level_xp: campaign.level_xp,
    hp: campaign.hp,
    hp_current: campaign.hp_current,
    quests,
    bounties,
    rumors,
    journal,
    npcs,
    buffs,
    spellbook,
    ossuary,
    pending_hp: normalizePendingHp(campaign.pending_hp, campaign.class_name),
    current_location: campaign.current_location ?? DEFAULT_LOCATION,
    inventory: {
      summary: inventory.summary,
      equipped: inventory.equipped,
      items: inventoryItems,
      crowns: formatCrowns(inventory.summary.crowns),
    },
  };
};

const loadGameData = async (supabase: any) => {
  const { data } = await supabase
    .from("game_data")
    .select("key,value")
    .in("key", ["loot_config", "abilities", "skills_by_ability"]);
  const map: Record<string, any> = {};
  (data ?? []).forEach((row: any) => {
    map[row.key] = row.value;
  });
  const abilities = Array.isArray(map.abilities) ? map.abilities : DEFAULT_ABILITIES;
  const skillsByAbility =
    map.skills_by_ability && typeof map.skills_by_ability === "object"
      ? map.skills_by_ability
      : DEFAULT_SKILLS_BY_ABILITY;
  const skills = Object.values(skillsByAbility).flat().filter(Boolean);
  const lootConfig =
    map.loot_config && typeof map.loot_config === "object"
      ? map.loot_config
      : DEFAULT_LOOT_CONFIG;
  return { abilities, skillsByAbility, skills, lootConfig };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const message = typeof payload?.message === "string" ? payload.message.trim() : "";
    const campaignId = payload?.campaignId ?? "";
    const accessKey = payload?.accessKey ?? "";
    const baseLocation = normalizeLocationParts(payload?.location ?? DEFAULT_LOCATION);
    const isIntro = Boolean(payload?.intro);

    console.log("dm-chat request", {
      hasMessage: Boolean(message),
      messageLength: message.length,
      campaignId: campaignId ? String(campaignId).slice(0, 8) : null,
      hasAccessKey: Boolean(accessKey),
      model: MODEL_ID,
    });

    if (!message && !isIntro) {
      return new Response(JSON.stringify({ error: "Message is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!campaignId && !accessKey) {
      return new Response(JSON.stringify({ error: "Campaign identifier is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey =
      Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    if (!supabaseUrl || !supabaseKey || !geminiKey) {
      console.error("dm-chat env missing", {
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasServiceRoleKey: Boolean(supabaseKey),
        hasGeminiKey: Boolean(geminiKey),
      });
      return new Response(
        JSON.stringify({
          error: "Missing SUPABASE_URL, SERVICE_ROLE_KEY, or GEMINI_API_KEY.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const lookupKey = accessKey ? "access_key" : "id";
    const lookupValue = accessKey || campaignId;
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq(lookupKey, lookupValue)
      .single();

    if (campaignError || !campaign) {
      return new Response(JSON.stringify({ error: campaignError?.message ?? "Campaign not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const seededCampaign = seedBackstoryInventory(campaign);
    const playerName = String(campaign.name ?? "").trim();
    const playerNameLabel =
      playerName && playerName.toLowerCase() !== "you" ? playerName : "the adventurer";
    const gameData = await loadGameData(supabase);
    const lootContext = {
      lootConfig: gameData.lootConfig,
      abilities: gameData.abilities,
      skills: gameData.skills,
      hpMax: asNumber(seededCampaign.hp, 20),
    };

    const history = ensureArray(seededCampaign.messages)
      .slice(-10)
      .map((entry: any) => ({
        role: entry.sender === seededCampaign.name || entry.sender === "You" ? "user" : "model",
        content: entry.content ?? "",
      }));

    const needsIntro = isIntro || ensureArray(seededCampaign.messages).length === 0;
    const pibeLine = needsIntro
      ? "This is the first DM message. You must introduce <dm-entity>Pibe</dm-entity> (male tavern owner, a big adult man not old with a big belly, and have a glasses. his hair is black and relatively short) and call add_npc for Pibe if not already listed."
      : "If <dm-entity>Pibe</dm-entity> is introduced and not yet in the NPC list, call add_npc for Pibe. Pibe is male.";

    const systemPrompt =
      "You are the Dungeon Master for a single-player DnD campaign. " +
      "Write immersive, story-forward responses with sensory detail and occasional dialogue. " +
      "Aim for 2-4 paragraphs per reply and avoid one-liners. " +
      "Never respond under 120 words unless the player explicitly requests brevity. " +
      "Include at least one spoken line in quotes when an NPC is present if possible and fit in the story. " +
      "Never show tool calls, function names, debug text, or code in the response. " +
      "Never include JSON, code blocks, or serialized data in the response. " +
      "Do not mention UI or meta systems (quest log, rumor list, bounty board, XP totals, tool calls). " +
      "When a new quest or rumor emerges, present it as an in-world request, lead, or notice without labeling it. " +
      "Only mention XP or rewards if the player asks. " +
      "Wrap important names, items, spells, locations, and factions in <dm-entity> tags. Tag single-word names too (ex: <dm-entity>Scarlett</dm-entity>, <dm-entity>Oakhaven</dm-entity>). " +
      "When the player attacks or uses a spell/weapon, instruct them to roll the correct dice based on equipped weapon damage (inventory.equipped.weapons) or spell roll, and mention any buff/potion modifiers from buffs. " +
      "When you ask for any ability check, skill check, or saving throw, explicitly say to roll d20 and name the ability/skill; if unsure, default to roll d20. " +
      "If a buff grants a roll bonus (ex: +1d4), include it in the roll instruction. " +
      "When the player casts a spell from their spellbook, acknowledge it and use its roll; if it heals or harms the player, call adjust_hp with the amount once the roll is known. " +
      "If you describe the player taking damage or healing, call adjust_hp with the numeric change. " +
      "If pending_hp is non-empty, the player has level-up HP to resolve; ask them to roll the class die (example: d8) or take the listed average, and call resolve_level_hp with their choice. " +
      "When the scene shifts to a new place or time, call update_location with a short 'Place | Area | Time' string (always include 3 parts separated by |). " +
      "When loot appears, describe it in-world (no UI mentions) and call generate_loot with the item type so it is added to the ossuary. " +
      "Use the player's backstory and appearance to seed fitting items; when relevant, call add_inventory_item and avoid duplicates already in inventory. " +
      "When the player gains or spends money, call adjust_crowns to update their currency. " +
      "When adding NPCs, include their gender when known. " +
      "Whenever a new named person appears, call add_npc with a brief summary and set lastSeen to the current location. " +
      "When an existing NPC appears again, call update_npc to refresh lastSeen. " +
      "If an NPC asks the player to do something or a clear lead appears, call add_quest or add_rumor automatically. " +
      "When the player accepts a quest, call update_quest to set status to Active. " +
      "When a rumor turns into a concrete objective, add a quest and optionally resolve the rumor. " +
      "When the player completes a quest, mark it Completed and call adjust_xp with a balanced amount. " +
      "Assign balanced XP for quests/rumors (5-50 range, scale to difficulty and importance). " +
      pibeLine +
      " Whenever the story changes quests, rumors, bounties, reputation, XP, HP, inventory, journal, NPCs, ossuary items, spells, or saving throws, call the relevant tool to update state. " +
      "End with a short question about what the player does next, phrased in third person using the player's name.";

    const context = buildContext(seededCampaign);

    const systemInstruction = `${systemPrompt}\nCampaign context: ${JSON.stringify(context)}`;

    const introPrompt =
      "Begin the campaign by greeting the player in Pibe's Tavern and introducing <dm-entity>Pibe</dm-entity>. " +
      "Write at least 140 words, split into 2-4 paragraphs, and include a line of dialogue in quotes. " +
      `End with a short question about what ${playerNameLabel} does next.`;
    const userPrompt = isIntro ? introPrompt : message;

    const contents = [
      ...history.map((entry: any) => ({
        role: entry.role,
        parts: [{ text: entry.content }],
      })),
      { role: "user", parts: [{ text: userPrompt }] },
    ];

    const functionDeclarations = tools.map((tool) => tool.function);
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          tools: [{ function_declarations: functionDeclarations }],
          system_instruction: { parts: [{ text: systemInstruction }] },
          generationConfig: { temperature: 0.7 },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error("dm-chat gemini error", {
        status: geminiResponse.status,
        body: errorBody,
      });
      return new Response(JSON.stringify({ error: errorBody }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiData = await geminiResponse.json();
    const firstCandidate = geminiData?.candidates?.[0]?.content ?? { role: "model", parts: [] };
    const parts = Array.isArray(firstCandidate.parts) ? firstCandidate.parts : [];
    const toolCalls = parts
      .filter((part: any) => part.functionCall)
      .map((part: any) => ({
        name: part.functionCall.name,
        args: part.functionCall.args ?? {},
      }));
    let dmText = parts
      .filter((part: any) => typeof part.text === "string")
      .map((part: any) => part.text)
      .join("");

    let updatedCampaign = { ...seededCampaign };

    if (toolCalls.length) {
      updatedCampaign = applyToolCalls(updatedCampaign, toolCalls, lootContext);

      const functionResponses = toolCalls.map((call: any) => ({
        functionResponse: {
          name: call.name,
          response: { ok: true },
        },
      }));

      const followup = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [...contents, firstCandidate, { role: "function", parts: functionResponses }],
            tools: [{ function_declarations: functionDeclarations }],
            system_instruction: { parts: [{ text: systemInstruction }] },
            generationConfig: { temperature: 0.7 },
          }),
        }
      );

      if (followup.ok) {
        const followupData = await followup.json();
        const followupCandidate = followupData?.candidates?.[0]?.content ?? {};
        const followupParts = Array.isArray(followupCandidate.parts) ? followupCandidate.parts : [];
        const followupText = followupParts
          .filter((part: any) => typeof part.text === "string")
          .map((part: any) => part.text)
          .join("");
        dmText = followupText || dmText;
      }
    }

    const hasQuestExtractionCall = toolCalls.some((call: any) => {
      const name = String(call?.name ?? "");
      return QUEST_EXTRACTION_ALLOWED.has(name);
    });

    if (!hasQuestExtractionCall && dmText) {
      const questTitles = ensureArray(updatedCampaign.quests)
        .map((quest: any) => quest?.title)
        .filter(Boolean)
        .join(" | ");
      const rumorTitles = ensureArray(updatedCampaign.rumors)
        .map((rumor: any) => rumor?.title)
        .filter(Boolean)
        .join(" | ");
      const bountyTitles = ensureArray(updatedCampaign.bounties)
        .map((bounty: any) => bounty?.title)
        .filter(Boolean)
        .join(" | ");

      const extractionInstruction =
        "You are a tool-routing assistant. Use function calls ONLY when needed to keep quests, rumors, and bounties in sync. " +
        "Create a rumor when NPCs share hearsay, reports, or local talk. " +
        "Create a quest when an NPC asks for help, the player accepts a task, or an objective is clearly offered. " +
        "When the player agrees to help with a quest, update that quest to status Active. " +
        "If a rumor becomes a concrete objective, create a quest with the same or similar title so the rumor can be cleared. " +
        "Update a quest to Completed only when the player clearly finishes it. " +
        "Avoid duplicates by matching existing titles. If nothing should change, make no function calls.";

      const extractionPrompt =
        `Player message: ${message || "(none)"}\n` +
        `DM message: ${dmText}\n` +
        `Existing quests: ${questTitles || "none"}\n` +
        `Existing rumors: ${rumorTitles || "none"}\n` +
        `Existing bounties: ${bountyTitles || "none"}`;

      const extractionResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: extractionPrompt }] }],
            tools: [{ function_declarations: functionDeclarations }],
            system_instruction: { parts: [{ text: extractionInstruction }] },
            generationConfig: { temperature: 0.2 },
          }),
        }
      );

      if (extractionResponse.ok) {
        const extractionData = await extractionResponse.json();
        const extractionCandidate = extractionData?.candidates?.[0]?.content ?? {};
        const extractionParts = Array.isArray(extractionCandidate.parts) ? extractionCandidate.parts : [];
        const extractedCalls = extractionParts
          .filter((part: any) => part.functionCall)
          .map((part: any) => ({
            name: part.functionCall.name,
            args: part.functionCall.args ?? {},
          }))
          .filter((call: any) => QUEST_EXTRACTION_ALLOWED.has(String(call?.name ?? "")));

        if (extractedCalls.length) {
          updatedCampaign = applyToolCalls(updatedCampaign, extractedCalls, lootContext);
        }
      } else {
        const extractionError = await extractionResponse.text();
        console.warn("dm-chat extraction error", extractionError);
      }
    }

    const hasNpcExtractionCall = toolCalls.some((call: any) =>
      NPC_EXTRACTION_ALLOWED.has(String(call?.name ?? ""))
    );

    if (!hasNpcExtractionCall && dmText) {
      const npcNames = ensureArray(updatedCampaign.npcs)
        .map((npc: any) => npc?.name)
        .filter(Boolean)
        .join(" | ");
      const npcLocation = updatedCampaign.current_location ?? baseLocation;
      const npcExtractionInstruction =
        "You are a tool-routing assistant. Use function calls ONLY when needed to keep NPCs in sync. " +
        "Add an NPC when a named person appears in the DM message. " +
        "Update an NPC when they appear again or new details (role, summary, gender, reputation, feeling) are mentioned. " +
        "Set lastSeen to the current location when the NPC appears. " +
        "Do not add the player as an NPC. Do not add locations, factions, items, monsters, or groups as NPCs. " +
        "Avoid duplicates by matching existing NPC names. If nothing should change, make no function calls.";

      const npcExtractionPrompt =
        `Player name: ${playerNameLabel}\n` +
        `Current location: ${npcLocation}\n` +
        `DM message: ${dmText}\n` +
        `Known NPCs: ${npcNames || "none"}`;

      const npcExtractionResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: npcExtractionPrompt }] }],
            tools: [{ function_declarations: functionDeclarations }],
            system_instruction: { parts: [{ text: npcExtractionInstruction }] },
            generationConfig: { temperature: 0.2 },
          }),
        }
      );

      if (npcExtractionResponse.ok) {
        const npcExtractionData = await npcExtractionResponse.json();
        const npcExtractionCandidate = npcExtractionData?.candidates?.[0]?.content ?? {};
        const npcExtractionParts = Array.isArray(npcExtractionCandidate.parts)
          ? npcExtractionCandidate.parts
          : [];
        const extractedNpcCalls = npcExtractionParts
          .filter((part: any) => part.functionCall)
          .map((part: any) => ({
            name: part.functionCall.name,
            args: part.functionCall.args ?? {},
          }))
          .filter((call: any) => NPC_EXTRACTION_ALLOWED.has(String(call?.name ?? "")));

        if (extractedNpcCalls.length) {
          updatedCampaign = applyToolCalls(updatedCampaign, extractedNpcCalls, lootContext);
        }
      } else {
        const npcExtractionError = await npcExtractionResponse.text();
        console.warn("dm-chat npc extraction error", npcExtractionError);
      }
    }

    const hasLocationExtractionCall = toolCalls.some((call: any) =>
      LOCATION_EXTRACTION_ALLOWED.has(String(call?.name ?? ""))
    );

    if (!hasLocationExtractionCall && dmText) {
      const currentLocation = updatedCampaign.current_location ?? baseLocation;
      const locationInstruction =
        "You are a tool-routing assistant. Use function calls ONLY when needed to keep the scene location in sync. " +
        "If the DM message clearly shifts to a new place or time, call update_location with a short 'Place | Area | Time' string. " +
        "Always include exactly 3 parts separated by ' | ' (Place, Area, Time), even if you must infer a reasonable area or time. " +
        "Use specific place names mentioned in the DM text (towns, forests, roads, buildings). " +
        "If the DM text stays in the same scene, make no function calls.";

      const locationPrompt =
        `Current location: ${currentLocation}\n` +
        `DM message: ${dmText}\n` +
        "If a new location is clear, return update_location. Otherwise, return no tool call.";

      const locationResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: locationPrompt }] }],
            tools: [{ function_declarations: functionDeclarations }],
            system_instruction: { parts: [{ text: locationInstruction }] },
            generationConfig: { temperature: 0.2 },
          }),
        }
      );

      if (locationResponse.ok) {
        const locationData = await locationResponse.json();
        const locationCandidate = locationData?.candidates?.[0]?.content ?? {};
        const locationParts = Array.isArray(locationCandidate.parts) ? locationCandidate.parts : [];
        const extractedLocationCalls = locationParts
          .filter((part: any) => part.functionCall)
          .map((part: any) => ({
            name: part.functionCall.name,
            args: part.functionCall.args ?? {},
          }))
          .filter((call: any) => LOCATION_EXTRACTION_ALLOWED.has(String(call?.name ?? "")));

        if (extractedLocationCalls.length) {
          updatedCampaign = applyToolCalls(updatedCampaign, extractedLocationCalls, lootContext);
        }
      } else {
        const locationError = await locationResponse.text();
        console.warn("dm-chat location extraction error", locationError);
      }
    }

    const hasReputationExtractionCall = toolCalls.some((call: any) =>
      REPUTATION_EXTRACTION_ALLOWED.has(String(call?.name ?? ""))
    );

    if (!hasReputationExtractionCall && dmText) {
      const npcNames = ensureArray(updatedCampaign.npcs)
        .map((npc: any) => npc?.name)
        .filter(Boolean)
        .join(" | ");
      const repInstruction =
        "You are a tool-routing assistant. Use function calls ONLY when needed to keep NPC reputation in sync. " +
        "Look for clear signals that an NPC's attitude toward the player improved or worsened (gratitude, trust, suspicion, offense, anger, warmth). " +
        "Call update_reputation with small deltas (±1 or ±2; ±3 only for major shifts). " +
        "Only update for named NPCs and never for the player. If nothing changes, make no function calls.";

      const repPrompt =
        `Player name: ${playerNameLabel}\n` +
        `DM message: ${dmText}\n` +
        `Known NPCs: ${npcNames || "none"}`;

      const repResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: repPrompt }] }],
            tools: [{ function_declarations: functionDeclarations }],
            system_instruction: { parts: [{ text: repInstruction }] },
            generationConfig: { temperature: 0.2 },
          }),
        }
      );

      if (repResponse.ok) {
        const repData = await repResponse.json();
        const repCandidate = repData?.candidates?.[0]?.content ?? {};
        const repParts = Array.isArray(repCandidate.parts) ? repCandidate.parts : [];
        const extractedRepCalls = repParts
          .filter((part: any) => part.functionCall)
          .map((part: any) => ({
            name: part.functionCall.name,
            args: part.functionCall.args ?? {},
          }))
          .filter((call: any) => REPUTATION_EXTRACTION_ALLOWED.has(String(call?.name ?? "")));

        if (extractedRepCalls.length) {
          updatedCampaign = applyToolCalls(updatedCampaign, extractedRepCalls, lootContext);
        }
      } else {
        const repError = await repResponse.text();
        console.warn("dm-chat reputation extraction error", repError);
      }
    }

    updatedCampaign = updateNpcLastSeenFromText(
      updatedCampaign,
      dmText || "",
      updatedCampaign.current_location ?? baseLocation
    );

    updatedCampaign = removePlayerFromNpcs(updatedCampaign, campaign?.name ?? "");
    updatedCampaign = ensureNpcPersistence(updatedCampaign, campaign, campaign?.name ?? "");

    updatedCampaign = applyQuestRewards(updatedCampaign);
    {
      const currentLevel = Math.max(1, asNumber(updatedCampaign.level, 1));
      const currentXp = Math.max(0, asNumber(updatedCampaign.level_xp));
      const normalized = normalizeLevelProgress(currentLevel, currentXp);
      updatedCampaign.level = normalized.level;
      updatedCampaign.level_xp = normalized.xp;
      if (normalized.gainedLevels > 0) {
        const currentSkillPoints = Math.max(0, asNumber(updatedCampaign.skill_points));
        updatedCampaign.skill_points = currentSkillPoints + normalized.gainedLevels;
        updatedCampaign = queueLevelHpGain(updatedCampaign, normalized.gainedLevels);
      }
    }

    const introFallback =
      "You push through the heavy door of <dm-entity>Pibe's Tavern</dm-entity> and feel a wave of warmth wash over you. " +
      "Rain patters against the shutters, and the air is thick with cedar smoke, fresh bread, and the iron tang of a nearby forge. " +
      "Patrons murmur over half-full mugs while a fiddler worries a slow tune in the corner. " +
      "Behind the bar, <dm-entity>Pibe</dm-entity> polishes a glass with deliberate care, watching the room without missing a beat.\n\n" +
      "He lifts his chin toward you and smiles. \"New face, old eyes,\" he says, voice low and friendly. " +
      "\"If you're looking for trouble, it found this place long before you did.\" " +
      "A courier brushes past, dropping a sealed note on the counter beside you, its wax still warm. " +
      "The hearth pops and throws a spark that lands at your feet like a warning.\n\n" +
      "Pibe sets the glass down and nods toward an empty table near the fire. " +
      `"Sit, warm up, and tell me what brings you to <dm-entity>Pibe's Tavern</dm-entity>." What does ${playerNameLabel} do?`;

    if (isIntro) {
      let npcs = ensureArray(updatedCampaign.npcs);
      const hasPibe = npcs.some(
        (npc: any) => String(npc?.name ?? "").trim().toLowerCase() === "pibe"
      );
      if (!hasPibe) {
        npcs.push({
          id: makeId("npc"),
          name: "Pibe",
          role: "Tavern Owner",
          summary: "Keeps the hearth warm, the rooms steady, and the gossip flowing.",
          gender: "Male",
          lastSeen: "Pibe's Tavern",
          reputation: 6,
          feeling: "Welcoming",
        });
      }
      updatedCampaign.npcs = enforcePibeGender(npcs);
      if (!/pibe/i.test(dmText) || countWords(dmText) < 120) {
        dmText = introFallback;
      }
    } else if (countWords(dmText) > 0 && countWords(dmText) < 80) {
      dmText =
        `${dmText}\n\nThe atmosphere settles around you as the moment stretches on, inviting a choice. ` +
        `You can press forward, ask for details, or change the scene entirely. What does ${playerNameLabel} do?`;
    }

    dmText = scrubToolLeaks(dmText || "");
    updatedCampaign.npcs = enforcePibeGender(ensureArray(updatedCampaign.npcs));
    if (isIntro && !dmText) {
      dmText = introFallback;
    }

    const dmLocation = normalizeLocationParts(updatedCampaign.current_location ?? baseLocation);
    const dmMessage = {
      id: makeId("dm"),
      sender: "Dungeon Master",
      location: dmLocation,
      content: dmText || "The tavern is quiet for a moment...",
    };

    if (isIntro) {
      updatedCampaign.messages = [...ensureArray(campaign.messages), dmMessage];
    } else {
      const playerMessage = {
        id: makeId("player"),
        sender: campaign.name ?? "You",
        location: normalizeLocationParts(campaign.current_location ?? baseLocation),
        content: message,
      };
      updatedCampaign.messages = [...ensureArray(campaign.messages), playerMessage, dmMessage];
    }

    const { data: savedCampaign, error: saveError } = await supabase
      .from("campaigns")
      .update({
        ...updatedCampaign,
        id: undefined,
        created_at: undefined,
        updated_at: undefined,
      })
      .eq("id", campaign.id)
      .select("*")
      .single();

    if (saveError) {
      console.error("dm-chat save error", saveError);
      return new Response(JSON.stringify({ error: saveError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ campaign: savedCampaign }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("dm-chat crash", error);
    return new Response(JSON.stringify({ error: error?.message ?? "Unknown error." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

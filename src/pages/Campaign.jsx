import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { getValueStyle } from '../lib/valueStyle.js';

const SAMPLE_LOCATION = "Old Greg's Tavern | Upper tower room | Night";

const sampleMessages = (characterName) => [
  {
    id: 'dm-1',
    sender: 'Dungeon Master',
    location: SAMPLE_LOCATION,
    content:
      "The firelight dances across the table as the tavern hushes. A courier slides a sealed letter toward you, its wax stamped with a river crest.",
  },
  {
    id: 'dm-2',
    sender: 'Dungeon Master',
    location: SAMPLE_LOCATION,
    content:
      "Outside, thunder mutters over the city. The letter promises gold, answers, and a name you've never heard spoken aloud.",
  },
  {
    id: 'player-1',
    sender: characterName || 'You',
    location: SAMPLE_LOCATION,
    content: 'I break the seal and read it carefully, watching the room for anyone who flinches.',
  },
];

const sampleQuests = [
  {
    id: 'quest-1',
    title: 'The Witch-Marked Creator',
    status: 'Active',
    xp: 50,
    description: 'Track the artisan rumored to wield three schools of magic at once.',
  },
  {
    id: 'quest-2',
    title: 'River Crest Courier',
    status: 'Rumor',
    xp: 20,
    description: 'Follow the courier trail to the docks before the storm hits.',
  },
];

const sampleBounties = [
  {
    id: 'bounty-1',
    title: 'Crimson Wraith',
    reward: '120 gold',
    status: 'Open',
  },
];

const sampleRumors = [
  {
    id: 'rumor-1',
    title: 'The Witch-Marked Creator',
    level: 1,
    xp: 50,
    summary:
      'Old Greg mentions a creator whose gifts blur the lines between the three magical traditions.',
    notes: ['Old Greg, the innkeeper', 'Master Aldwin at the Scriptorium'],
  },
];

const sampleInventoryData = {
  summary: {
    crowns: 15,
    ac: 4,
    damage: '1d6',
    weaponType: 'One-Handed +2',
  },
  equipped: {
    weapons: [
      { name: 'Sprouting Dagger', type: 'One-Handed', damage: '1d6', rarity: 'Common' },
      null,
    ],
    armor: {
      Head: null,
      Body: { name: 'Verdant Tunic', ac: 3, rarity: 'Uncommon' },
      Arms: null,
      Leggings: { name: 'Twig Leggings', ac: 1, rarity: 'Common' },
      Cloak: null,
    },
  },
  sections: {
    weapons: [
      {
        id: 'wpn-1',
        name: 'Sprouting Dagger',
        rarity: 'Common',
        weaponType: 'One-Handed',
        damage: '1d6',
      },
    ],
    armor: [
      { id: 'arm-1', name: 'Verdant Tunic', rarity: 'Uncommon', slot: 'Chest', ac: 3 },
      { id: 'arm-2', name: 'Twig Leggings', rarity: 'Common', slot: 'Legs', ac: 1 },
    ],
    consumables: [
      { id: 'con-1', name: 'Pale Verdant Draught', rarity: 'Common', effect: 'Health' },
      { id: 'con-2', name: 'Pale Wraith Essence', rarity: 'Uncommon', effect: 'Soul' },
    ],
    misc: [
      { id: 'misc-1', name: 'Tavern Crest Token', rarity: 'Common', note: 'Quest item' },
    ],
  },
};

const sampleJournalEntries = [
  {
    id: 'jrnl-1',
    date: new Date().toLocaleDateString(),
    text: 'The courier left a letter with a river crest. Something about a creator in the docks.',
  },
];

const STAT_CATEGORIES = {
  ADVENTURER: ['Investigation', 'Climbing', 'Aim', 'Beastmastery'],
  BRUTE: ['Brawling', 'Ranged', 'One Handed', 'Two Handed'],
  THIEF: ['Acrobatics', 'Sleight Of Hand', 'Stealth', 'Lockpicking'],
  MAGICIAN: ['Destruction', 'Regeneration', 'Necromancy', 'Alteration', 'Bloodmancy', 'Illusion', 'Soulbinding'],
  'SILVER TONGUE': ['Deception', 'Persuasion', 'Performance', 'Intimidation', 'Seduction', 'Bartering'],
};

const STAT_REQUIREMENTS = {
  Investigation: 4,
  Climbing: 2,
  Aim: 2,
  Beastmastery: 2,
  Brawling: 2,
  Ranged: 2,
  'One Handed': 2,
  'Two Handed': 2,
  Acrobatics: 4,
  'Sleight Of Hand': 6,
  Stealth: 2,
  Lockpicking: 2,
  Destruction: 6,
  Regeneration: 2,
  Necromancy: 2,
  Alteration: 12,
  Bloodmancy: 2,
  Illusion: 10,
  Soulbinding: 2,
  Deception: 8,
  Persuasion: 4,
  Performance: 10,
  Intimidation: 2,
  Seduction: 2,
  Bartering: 2,
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

export default function Campaign() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [questLog, setQuestLog] = useState([]);
  const [bounties, setBounties] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [rolls, setRolls] = useState([]);
  const [leftTab, setLeftTab] = useState(1);
  const [logTab, setLogTab] = useState('quests');
  const [inventoryTab, setInventoryTab] = useState('inventory');
  const [rumors, setRumors] = useState(sampleRumors);
  const [journalEntries, setJournalEntries] = useState(sampleJournalEntries);
  const [playerInfoOpen, setPlayerInfoOpen] = useState(false);

  useEffect(() => {
    const loadCampaign = async () => {
      setLoading(true);
      setError('');
      if (!supabase) {
        setError('Missing Supabase configuration. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        setError(fetchError.message);
        setCampaign(null);
      } else {
        setCampaign(data);
        setMessages(Array.isArray(data.messages) && data.messages.length ? data.messages : sampleMessages(data.name));
        setQuestLog(Array.isArray(data.quests) && data.quests.length ? data.quests : sampleQuests);
        setBounties(Array.isArray(data.bounties) && data.bounties.length ? data.bounties : sampleBounties);
        if (Array.isArray(data.rumors) && data.rumors.length) {
          setRumors(data.rumors);
        } else {
          setRumors(sampleRumors);
        }
        if (Array.isArray(data.journal) && data.journal.length) {
          setJournalEntries(data.journal);
        } else {
          setJournalEntries(sampleJournalEntries);
        }
      }
      setLoading(false);
    };

    if (id) {
      loadCampaign();
    }
  }, [id]);

  const savePatch = async (patch) => {
    if (!supabase || !campaign?.id) return;
    await supabase.from('campaigns').update(patch).eq('id', campaign.id);
  };

  const statsByName = campaign?.stats ?? {};
  const reputationByName = campaign?.reputation ?? {};
  const hpMax = campaign?.hp ?? 0;
  const hpCurrent = campaign?.hp_current ?? hpMax;
  const inventoryData = useMemo(() => {
    if (campaign?.inventory && !Array.isArray(campaign.inventory) && campaign.inventory.summary) {
      return campaign.inventory;
    }
    return sampleInventoryData;
  }, [campaign]);

  const getStatRequirement = (stat) => STAT_REQUIREMENTS[stat] ?? 4;
  const getStatProgress = (stat, value) => {
    const required = getStatRequirement(stat);
    const normalized = Math.max(0, Math.min(required, Math.round(((value + 5) / 10) * required)));
    return { progress: normalized, required };
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
    if (!text) return;
    const entry = {
      id: `player-${Date.now()}`,
      sender: campaign?.name || 'You',
      location: SAMPLE_LOCATION,
      content: text,
    };
    const next = [...messages, entry];
    setMessages(next);
    setMessageInput('');
    await savePatch({ messages: next });
  };

  const rollDice = (sides) => {
    const result = Math.floor(Math.random() * sides) + 1;
    const entry = { id: `roll-${Date.now()}-${sides}`, sides, result };
    setRolls((prev) => [entry, ...prev]);
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
      label: 'Boons',
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path
            d="M12 3l2.5 5 5.5.8-4 3.9.9 5.7-4.9-2.6-4.9 2.6.9-5.7-4-3.9 5.5-.8L12 3Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
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

      <main className="relative z-10 grid h-screen box-border gap-6 px-[5vw] py-6 max-[800px]:grid-cols-1 min-[801px]:grid-cols-[minmax(260px,320px)_minmax(320px,1fr)_minmax(240px,320px)]">
        <aside className="grid max-h-[calc(100vh-140px)] gap-4 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="rounded-[20px] border border-white/10 bg-[linear-gradient(140deg,rgba(13,18,28,0.9),rgba(8,10,16,0.95))] p-4 shadow-[0_24px_60px_rgba(2,6,18,0.55)] backdrop-blur">
            <div className="mb-3 flex items-center justify-between gap-3">
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
            <div className="mt-4">
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
                          <div className="flex justify-between gap-2 font-semibold">
                            <span>{quest.title}</span>
                            <span className="inline-flex items-center rounded-full border border-[rgba(116,199,194,0.7)] px-2 py-0.5 text-xs text-[var(--accent-2)]">
                              {quest.status}
                            </span>
                          </div>
                          <p className="m-0 text-sm text-[var(--soft)]">{quest.description}</p>
                          <span className="text-sm font-semibold text-[var(--accent)]">{quest.xp} XP</span>
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
                          <div className="flex justify-between gap-2 font-semibold">
                            <span>{bounty.title}</span>
                            <span className="inline-flex items-center rounded-full border border-[rgba(116,199,194,0.7)] px-2 py-0.5 text-xs text-[var(--accent-2)]">
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
                          <div className="flex flex-wrap items-center justify-between gap-2 font-semibold">
                            <span>{rumor.title}</span>
                            <div className="flex gap-2">
                              <span className="rounded-full border border-[rgba(116,199,194,0.7)] px-2 py-0.5 text-xs text-[var(--accent-2)]">
                                Lvl {rumor.level}
                              </span>
                              <span className="rounded-full border border-white/20 px-2 py-0.5 text-xs text-[var(--soft)]">
                                {rumor.xp} XP
                              </span>
                            </div>
                          </div>
                          <p className="m-0 text-sm text-[var(--soft)]">{rumor.summary}</p>
                          {rumor.notes?.length ? (
                            <ul className="m-0 list-disc pl-5 text-xs text-[var(--soft)]">
                              {rumor.notes.map((note) => (
                                <li key={note}>{note}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {leftTab === 2 && (
                <div className="grid gap-3 text-sm">
                  <div className="rounded-[14px] border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-[0.16em] text-[var(--soft)]">
                      <span>Player Info</span>
                      <span>HP {hpCurrent}/{hpMax}</span>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-[var(--soft)]">
                        <span>Lvl 1</span>
                        <span>0/15</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-white/10">
                        <div className="h-1.5 w-[0%] rounded-full bg-[var(--accent-2)]"></div>
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
                    <div className="mt-3 grid gap-4">
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
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 text-sm">
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
                                style={{ left: `${position}%` }}
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
                  {Object.entries(STAT_CATEGORIES).map(([category, stats]) => (
                    <div
                      key={category}
                      className="rounded-[14px] border border-[rgba(214,179,106,0.35)] bg-[rgba(14,11,3,0.5)] p-3"
                    >
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                        {category}
                      </div>
                      <div className="mt-3 grid gap-2">
                        {stats.map((stat) => {
                          const value = statsByName[stat] ?? 0;
                          const { progress, required } = getStatProgress(stat, value);
                          const width = required ? (progress / required) * 100 : 0;
                          const displayValue = value > 0 ? `+${value}` : value;
                          return (
                            <div key={stat} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-8 text-right font-semibold"
                                  style={getValueStyle(value, 5)}
                                >
                                  {displayValue}
                                </span>
                                <span>{stat}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-[var(--soft)]">
                                <div className="h-1.5 w-20 rounded-full bg-white/10">
                                  <div
                                    className="h-1.5 rounded-full bg-[var(--accent)]"
                                    style={{ width: `${width}%` }}
                                  ></div>
                                </div>
                                <span>{progress}/{required}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
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
                        {[
                          { label: 'Crowns', value: inventoryData.summary.crowns, tone: 'text-[var(--accent)]' },
                          { label: 'AC', value: inventoryData.summary.ac, tone: 'text-[var(--accent-2)]' },
                          { label: 'Damage', value: inventoryData.summary.damage, tone: 'text-[var(--accent)]' },
                          { label: 'Weapon', value: inventoryData.summary.weaponType, tone: 'text-[var(--soft)]' },
                        ].map((item) => (
                          <div key={item.label} className="rounded-xl border border-white/10 bg-white/5 px-2 py-3">
                            <p className="m-0 text-xs uppercase tracking-[0.2em] text-[var(--soft)]">
                              {item.label}
                            </p>
                            <p className={`m-0 text-base font-semibold ${item.tone}`}>{item.value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-[14px] border border-white/10 bg-white/5 p-3">
                        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                          Equipped
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {inventoryData.equipped.weapons.map((item, index) => (
                            <div
                              key={`weapon-${index}`}
                              className={`rounded-xl border p-2 text-xs ${
                                item ? 'border-[rgba(214,179,106,0.4)]' : 'border-dashed border-white/10 text-[var(--soft)]'
                              }`}
                            >
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
                              className={`rounded-xl border p-2 text-xs ${
                                item ? 'border-[rgba(116,199,194,0.4)]' : 'border-dashed border-white/10 text-[var(--soft)]'
                              }`}
                            >
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
                            {inventoryData.sections[section].map((item) => (
                              <div
                                key={item.id}
                                className="rounded-xl border border-white/10 bg-black/20 p-2 text-xs"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <p className="m-0 font-semibold">{item.name}</p>
                                    <p className="m-0 text-[var(--soft)]">
                                      {item.weaponType || item.slot || item.note || item.effect || 'Item'}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    {item.damage && (
                                      <p className="m-0 text-[var(--accent)]">{item.damage}</p>
                                    )}
                                    {item.ac && (
                                      <p className="m-0 text-[var(--accent-2)]">+{item.ac} AC</p>
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
                                    <span className="rounded-full border border-white/20 px-2 py-0.5 text-[0.7rem] text-[var(--soft)]">
                                      {item.effect}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {journalEntries.length === 0 && (
                        <p className="m-0 text-sm text-[var(--soft)]">No journal entries yet.</p>
                      )}
                      {journalEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-[14px] border border-white/10 bg-white/5 p-3 text-sm"
                        >
                          <div className="flex justify-between gap-2 font-semibold">
                            <span>{entry.date}</span>
                          </div>
                          <p className="m-0 text-[var(--soft)]">{entry.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {leftTab >= 5 && (
                <div className="rounded-[14px] border border-white/10 bg-white/5 p-4 text-center text-sm text-[var(--soft)]">
                  Coming soon.
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
            <div className="rounded-full border border-[rgba(214,179,106,0.6)] px-3 py-1 text-[0.75rem] uppercase tracking-[0.12em]">
              Live Session
            </div>
          </header>

          <div className="grid max-h-[calc(100vh-280px)] gap-3 overflow-y-auto rounded-2xl border border-white/10 bg-[rgba(7,9,14,0.7)] p-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {messages.map((message) => (
              <div key={message.id} className="grid gap-2 rounded-2xl bg-white/5 p-4">
                <div className="grid gap-1">
                  <span className="font-bold tracking-[0.02em] text-[var(--accent)]">
                    {message.sender}
                  </span>
                  <span className="text-sm text-[var(--soft)]">{message.location}</span>
                </div>
                <p className="m-0">{message.content}</p>
              </div>
            ))}
          </div>

          <form className="sticky bottom-4 z-10 grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-white/10 bg-[rgba(6,8,13,0.85)] p-3 shadow-[0_18px_40px_rgba(2,6,18,0.6)] backdrop-blur" onSubmit={handleSendMessage}>
            <input
              className="rounded-xl border border-white/15 bg-[rgba(6,8,13,0.7)] px-3.5 py-3 text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none focus:ring-2 focus:ring-[rgba(214,179,106,0.4)]"
              type="text"
              value={messageInput}
              onChange={(event) => setMessageInput(event.target.value)}
              placeholder="Describe your next move..."
            />
            <button
              className="rounded-full bg-[var(--accent)] px-4 py-2 font-semibold text-[#111] transition hover:-translate-y-0.5"
              type="submit"
            >
              Send
            </button>
          </form>
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
    </div>
  );
}

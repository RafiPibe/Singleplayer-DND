import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useGameData } from '../lib/gameData.js';
import { LOOT_CONFIG } from '../data/loot.js';

const clone = (value) => {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value));
};

const buildMapFromKeys = (keys, initialValue = 0) => {
  const base = {};
  (keys ?? []).forEach((key) => {
    base[key] = initialValue;
  });
  return base;
};

const asNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const safeParseJson = (value) => {
  try {
    return { ok: true, value: JSON.parse(value) };
  } catch (error) {
    return { ok: false, error: error?.message ?? 'Invalid JSON' };
  }
};

const MapEditor = ({ label, keys, value, onChange, step = 1 }) => {
  const mapValue = value ?? {};
  return (
    <div className="grid gap-2">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--soft)]">
        {label}
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {keys.map((key) => (
          <label key={key} className="flex items-center justify-between gap-3 text-sm">
            <span>{key}</span>
            <input
              type="number"
              step={step}
              className="w-24 rounded-full border border-white/15 bg-[rgba(6,8,13,0.7)] px-3 py-1 text-right text-xs text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
              value={mapValue[key] ?? 0}
              onChange={(event) => {
                const next = { ...mapValue, [key]: asNumber(event.target.value) };
                onChange(next);
              }}
            />
          </label>
        ))}
      </div>
    </div>
  );
};

const ListEditor = ({ label, items, fields, onChange, makeNew }) => {
  const list = Array.isArray(items) ? items : [];

  const updateItem = (index, key, value) => {
    const next = list.map((entry, entryIndex) => {
      if (entryIndex !== index) return entry;
      return { ...entry, [key]: value };
    });
    onChange(next);
  };

  const removeItem = (index) => {
    const next = list.filter((_, entryIndex) => entryIndex !== index);
    onChange(next);
  };

  const addItem = () => {
    const entry = typeof makeNew === 'function' ? makeNew() : {};
    onChange([...list, entry]);
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--soft)]">
          {label}
        </div>
        <button
          type="button"
          onClick={addItem}
          className="rounded-full border border-white/20 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-white/40"
        >
          Add
        </button>
      </div>
      <div className="grid gap-2">
        {list.length === 0 && (
          <p className="m-0 text-xs text-[var(--soft)]">No entries yet.</p>
        )}
        {list.map((entry, index) => (
          <div key={entry.id ?? `${label}-${index}`} className="rounded-[14px] border border-white/10 bg-white/5 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--soft)]">
                Entry {index + 1}
              </span>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="rounded-full border border-white/20 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--soft)] transition hover:-translate-y-0.5 hover:border-white/40"
              >
                Remove
              </button>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {fields.map((field) => {
                const inputValue = entry?.[field.key] ?? '';
                const commonProps = {
                  className:
                    'rounded-xl border border-white/15 bg-[rgba(6,8,13,0.7)] px-3 py-2 text-xs text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none',
                  value: inputValue,
                  placeholder: field.placeholder ?? '',
                  onChange: (event) => {
                    const raw = event.target.value;
                    const nextValue = field.type === 'number' ? asNumber(raw) : raw;
                    updateItem(index, field.key, nextValue);
                  },
                };

                return (
                  <label key={`${label}-${index}-${field.key}`} className="grid gap-1 text-xs">
                    <span className="uppercase tracking-[0.16em] text-[var(--soft)]">
                      {field.label}
                    </span>
                    {field.multiline ? (
                      <textarea rows={3} {...commonProps} />
                    ) : (
                      <input type={field.type ?? 'text'} {...commonProps} />
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AbilityToggleGroup = ({ abilities, value, onChange }) => {
  const selected = Array.isArray(value) ? value : [];
  return (
    <div className="flex flex-wrap gap-2">
      {abilities.map((ability) => {
        const isActive = selected.includes(ability);
        return (
          <button
            key={ability}
            type="button"
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition hover:-translate-y-0.5 ${
              isActive
                ? 'border-[rgba(214,179,106,0.7)] text-[var(--accent)]'
                : 'border-white/20 text-[var(--ink)] hover:border-white/40'
            }`}
            onClick={() => {
              const next = isActive
                ? selected.filter((entry) => entry !== ability)
                : [...selected, ability];
              onChange(next);
            }}
          >
            {ability}
          </button>
        );
      })}
    </div>
  );
};

const RaceChoicesEditor = ({ label, choices, abilities, onChange }) => {
  const list = Array.isArray(choices) ? choices : [];

  const updateChoice = (index, patch) => {
    const next = list.map((entry, entryIndex) => {
      if (entryIndex !== index) return entry;
      return { ...entry, ...patch };
    });
    onChange(next);
  };

  const addChoice = () => {
    onChange([
      ...list,
      {
        label: '',
        amount: 1,
        options: [],
      },
    ]);
  };

  const removeChoice = (index) => {
    onChange(list.filter((_, entryIndex) => entryIndex !== index));
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--soft)]">
          {label}
        </div>
        <button
          type="button"
          onClick={addChoice}
          className="rounded-full border border-white/20 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-white/40"
        >
          Add
        </button>
      </div>
      {list.length === 0 ? (
        <p className="m-0 text-xs text-[var(--soft)]">No choices yet.</p>
      ) : null}
      <div className="grid gap-2">
        {list.map((choice, index) => (
          <div key={`${label}-${index}`} className="rounded-[14px] border border-white/10 bg-white/5 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--soft)]">
                Choice {index + 1}
              </span>
              <button
                type="button"
                onClick={() => removeChoice(index)}
                className="rounded-full border border-white/20 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-[var(--soft)] transition hover:-translate-y-0.5 hover:border-white/40"
              >
                Remove
              </button>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <label className="grid gap-1 text-xs">
                <span className="uppercase tracking-[0.16em] text-[var(--soft)]">Label</span>
                <input
                  className="rounded-xl border border-white/15 bg-[rgba(6,8,13,0.7)] px-3 py-2 text-xs text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                  value={choice?.label ?? ''}
                  onChange={(event) => updateChoice(index, { label: event.target.value })}
                />
              </label>
              <label className="grid gap-1 text-xs">
                <span className="uppercase tracking-[0.16em] text-[var(--soft)]">Amount</span>
                <input
                  type="number"
                  className="rounded-xl border border-white/15 bg-[rgba(6,8,13,0.7)] px-3 py-2 text-xs text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                  value={choice?.amount ?? 0}
                  onChange={(event) =>
                    updateChoice(index, { amount: asNumber(event.target.value) })
                  }
                />
              </label>
            </div>
            <div className="mt-2 grid gap-2 text-xs">
              <span className="uppercase tracking-[0.16em] text-[var(--soft)]">Options</span>
              <AbilityToggleGroup
                abilities={abilities}
                value={choice?.options ?? []}
                onChange={(next) => updateChoice(index, { options: next })}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const RaceVariantsEditor = ({ variants, abilities, onChange }) => {
  const list = Array.isArray(variants) ? variants : [];

  const updateVariant = (index, patch) => {
    const next = list.map((entry, entryIndex) => {
      if (entryIndex !== index) return entry;
      return { ...entry, ...patch };
    });
    onChange(next);
  };

  const addVariant = () => {
    onChange([
      ...list,
      {
        label: '',
        boosts: {},
        choices: [],
        unique: false,
      },
    ]);
  };

  const removeVariant = (index) => {
    onChange(list.filter((_, entryIndex) => entryIndex !== index));
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--soft)]">
          Variants
        </div>
        <button
          type="button"
          onClick={addVariant}
          className="rounded-full border border-white/20 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-white/40"
        >
          Add
        </button>
      </div>
      {list.length === 0 ? (
        <p className="m-0 text-xs text-[var(--soft)]">No variants yet.</p>
      ) : null}
      <div className="grid gap-3">
        {list.map((variant, index) => (
          <div key={`variant-${index}`} className="rounded-[14px] border border-white/10 bg-white/5 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--soft)]">
                Variant {index + 1}
              </span>
              <button
                type="button"
                onClick={() => removeVariant(index)}
                className="rounded-full border border-white/20 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-[var(--soft)] transition hover:-translate-y-0.5 hover:border-white/40"
              >
                Remove
              </button>
            </div>
            <label className="grid gap-1 text-xs">
              <span className="uppercase tracking-[0.16em] text-[var(--soft)]">Label</span>
              <input
                className="rounded-xl border border-white/15 bg-[rgba(6,8,13,0.7)] px-3 py-2 text-xs text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                value={variant?.label ?? ''}
                onChange={(event) => updateVariant(index, { label: event.target.value })}
              />
            </label>
            <label className="mt-2 flex items-center gap-2 text-xs text-[var(--soft)]">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={Boolean(variant?.unique)}
                onChange={(event) => updateVariant(index, { unique: event.target.checked })}
              />
              Unique choices
            </label>
            <div className="mt-3 grid gap-3">
              <MapEditor
                label="Boosts"
                keys={abilities}
                value={variant?.boosts ?? {}}
                onChange={(next) => updateVariant(index, { boosts: next })}
              />
              <RaceChoicesEditor
                label="Variant Choices"
                choices={variant?.choices ?? []}
                abilities={abilities}
                onChange={(next) => updateVariant(index, { choices: next })}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function Admin() {
  const { abilities, skills, skillsByAbility, classes, races, reputation, lootConfig } = useGameData();
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecking, setAdminChecking] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const [activeTab, setActiveTab] = useState('campaigns');

  const [campaigns, setCampaigns] = useState([]);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [campaignError, setCampaignError] = useState('');
  const [campaignDraft, setCampaignDraft] = useState(null);
  const [campaignIsNew, setCampaignIsNew] = useState(false);
  const [campaignSaving, setCampaignSaving] = useState(false);
  const [jsonDrafts, setJsonDrafts] = useState({});

  const [abilitiesDraft, setAbilitiesDraft] = useState([]);
  const [skillsByAbilityDraft, setSkillsByAbilityDraft] = useState({});
  const [classesDraft, setClassesDraft] = useState([]);
  const [selectedClassIndex, setSelectedClassIndex] = useState(0);
  const [racesDraft, setRacesDraft] = useState([]);
  const [selectedRaceIndex, setSelectedRaceIndex] = useState(0);
  const [lootConfigDraft, setLootConfigDraft] = useState(LOOT_CONFIG);
  const [lootConfigJson, setLootConfigJson] = useState(JSON.stringify(LOOT_CONFIG, null, 2));
  const [lootConfigError, setLootConfigError] = useState('');
  const [gameDataError, setGameDataError] = useState('');
  const [gameDataSaving, setGameDataSaving] = useState(false);

  const adminEmail = session?.user?.email ?? '';

  const campaignMapKeys = useMemo(() => abilities, [abilities]);

  const buildCampaignDefaults = () => {
    const abilityBase = buildMapFromKeys(campaignMapKeys, 10);
    const abilityZero = buildMapFromKeys(campaignMapKeys, 0);
    const skillBase = buildMapFromKeys(skills, 0);
    const reputationBase = buildMapFromKeys(reputation, 0);
    return {
      name: 'New Campaign',
      race: '',
      alignment: '',
      race_boosts: abilityZero,
      look: '---',
      gender: 'Unknown',
      class_name: 'Unassigned',
      class_description: '---',
      stats: abilityBase,
      ability_scores: abilityBase,
      ability_progress: abilityZero,
      skills: skillBase,
      skill_progress: skillBase,
      skill_points: 0,
      saving_throws: abilityZero,
      save_proficiencies: [],
      level: 1,
      level_xp: 0,
      reputation: reputationBase,
      hp: 10,
      hp_current: 10,
      backstory: '---',
      messages: [],
      quests: [],
      bounties: [],
      inventory: [],
      buffs: [],
      relationships: [],
      journal: [],
      npcs: [],
      ossuary: [],
      spellbook: [],
    };
  };

  useEffect(() => {
    if (!supabase) return undefined;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
      setAuthLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase) return;
    if (!adminEmail) {
      setIsAdmin(false);
      return;
    }

    const checkAdmin = async () => {
      setAdminChecking(true);
      setAuthError('');
      const { data, error } = await supabase
        .from('admin_emails')
        .select('email')
        .eq('email', adminEmail)
        .maybeSingle();

      if (error) {
        setAuthError(error.message);
        setIsAdmin(false);
      } else {
        setIsAdmin(Boolean(data?.email));
      }
      setAdminChecking(false);
    };

    checkAdmin();
  }, [adminEmail]);

  useEffect(() => {
    setAbilitiesDraft(abilities);
  }, [abilities]);

  useEffect(() => {
    setSkillsByAbilityDraft(clone(skillsByAbility));
  }, [skillsByAbility]);


  useEffect(() => {
    setClassesDraft(clone(classes));
    setSelectedClassIndex(0);
  }, [classes]);

  useEffect(() => {
    setRacesDraft(clone(races));
    setSelectedRaceIndex(0);
  }, [races]);

  useEffect(() => {
    const nextConfig = clone(lootConfig ?? LOOT_CONFIG);
    setLootConfigDraft(nextConfig);
    setLootConfigJson(JSON.stringify(nextConfig, null, 2));
    setLootConfigError('');
  }, [lootConfig]);

  useEffect(() => {
    if (!campaignDraft) return;
    setJsonDrafts({
      inventory: JSON.stringify(campaignDraft.inventory ?? [], null, 2),
      buffs: JSON.stringify(campaignDraft.buffs ?? [], null, 2),
      spellbook: JSON.stringify(campaignDraft.spellbook ?? [], null, 2),
    });
  }, [campaignDraft]);

  useEffect(() => {
    if (!isAdmin || activeTab !== 'campaigns') return;
    loadCampaigns();
  }, [isAdmin, activeTab]);

  const loadCampaigns = async () => {
    if (!supabase) return;
    setCampaignLoading(true);
    setCampaignError('');

    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      setCampaignError(error.message);
      setCampaigns([]);
    } else {
      setCampaigns(data ?? []);
    }
    setCampaignLoading(false);
  };

  const handleSelectCampaign = (campaign) => {
    setCampaignDraft(clone(campaign));
    setCampaignIsNew(false);
  };

  const handleNewCampaign = () => {
    setCampaignDraft(buildCampaignDefaults());
    setCampaignIsNew(true);
  };

  const updateCampaignField = (field, value) => {
    setCampaignDraft((prev) => ({ ...prev, [field]: value }));
  };

  const updateCampaignMap = (field, nextMap) => {
    updateCampaignField(field, nextMap);
  };

  const handleSaveCampaign = async () => {
    if (!supabase || !campaignDraft) return;
    setCampaignSaving(true);
    setCampaignError('');

    const inventoryParsed = safeParseJson(jsonDrafts.inventory ?? '[]');
    if (!inventoryParsed.ok) {
      setCampaignError(`Inventory JSON error: ${inventoryParsed.error}`);
      setCampaignSaving(false);
      return;
    }

    const buffsParsed = safeParseJson(jsonDrafts.buffs ?? '[]');
    if (!buffsParsed.ok) {
      setCampaignError(`Buffs JSON error: ${buffsParsed.error}`);
      setCampaignSaving(false);
      return;
    }

    const spellbookParsed = safeParseJson(jsonDrafts.spellbook ?? '[]');
    if (!spellbookParsed.ok) {
      setCampaignError(`Spellbook JSON error: ${spellbookParsed.error}`);
      setCampaignSaving(false);
      return;
    }

    const payload = {
      ...campaignDraft,
      inventory: inventoryParsed.value,
      buffs: buffsParsed.value,
      spellbook: spellbookParsed.value,
    };

    let result;
    if (campaignIsNew) {
      const { id, created_at, updated_at, ...insertPayload } = payload;
      result = await supabase.from('campaigns').insert(insertPayload).select('*').single();
    } else {
      result = await supabase
        .from('campaigns')
        .update(payload)
        .eq('id', payload.id)
        .select('*')
        .single();
    }

    if (result.error) {
      setCampaignError(result.error.message);
      setCampaignSaving(false);
      return;
    }

    setCampaignDraft(clone(result.data));
    setCampaignIsNew(false);
    await loadCampaigns();
    setCampaignSaving(false);
  };

  const handleDeleteCampaign = async () => {
    if (!supabase || !campaignDraft?.id) return;
    const shouldDelete = window.confirm('Delete this campaign? This cannot be undone.');
    if (!shouldDelete) return;
    setCampaignSaving(true);
    setCampaignError('');
    const { error } = await supabase.from('campaigns').delete().eq('id', campaignDraft.id);
    if (error) {
      setCampaignError(error.message);
      setCampaignSaving(false);
      return;
    }
    setCampaignDraft(null);
    await loadCampaigns();
    setCampaignSaving(false);
  };

  const saveGameData = async (key, value) => {
    if (!supabase) return;
    setGameDataSaving(true);
    setGameDataError('');

    const { error } = await supabase
      .from('game_data')
      .upsert({ key, value }, { onConflict: 'key' });

    if (error) {
      setGameDataError(error.message);
    }
    setGameDataSaving(false);
  };

  const handleSaveAbilities = () => saveGameData('abilities', abilitiesDraft);

  const handleSaveSkills = () => saveGameData('skills_by_ability', skillsByAbilityDraft);


  const handleSaveClasses = () => saveGameData('classes', classesDraft);

  const handleSaveRaces = () => saveGameData('races', racesDraft);

  const handleSaveLootConfig = () => saveGameData('loot_config', lootConfigDraft);

  const handleSignIn = async (event) => {
    event.preventDefault();
    if (!supabase) return;
    setAuthError('');
    setMagicLinkSent(false);

    if (!email.trim()) {
      setAuthError('Enter an email address.');
      return;
    }

    if (password.trim()) {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) setAuthError(error.message);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
      },
    });
    if (error) {
      setAuthError(error.message);
    } else {
      setMagicLinkSent(true);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setCampaignDraft(null);
    setCampaigns([]);
  };

  const updateArrayItem = (array, index, value) => {
    const next = [...array];
    next[index] = value;
    return next;
  };

  if (!supabase) {
    return (
      <div className="relative min-h-screen px-[6vw] py-12 text-[var(--ink)]">
        <div className="starfield" aria-hidden="true"></div>
        <div className="glow" aria-hidden="true"></div>
        <div className="relative z-10 mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl">Admin</h1>
          <p className="mt-2 text-sm text-[var(--soft)]">
            Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
          </p>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="relative min-h-screen px-[6vw] py-12 text-[var(--ink)]">
        <div className="starfield" aria-hidden="true"></div>
        <div className="glow" aria-hidden="true"></div>
        <div className="relative z-10 mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-[var(--soft)]">Checking session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="relative min-h-screen px-[6vw] py-12 text-[var(--ink)]">
        <div className="starfield" aria-hidden="true"></div>
        <div className="glow" aria-hidden="true"></div>
        <div className="relative z-10 mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_24px_60px_rgba(2,6,18,0.55)]">
          <h1 className="text-2xl">Admin Sign In</h1>
          <p className="mt-2 text-sm text-[var(--soft)]">
            Sign in with your Supabase account to access admin tools.
          </p>
          <form className="mt-6 grid gap-4" onSubmit={handleSignIn}>
            <label className="grid gap-2 text-sm">
              <span className="uppercase tracking-[0.18em] text-[var(--soft)]">Email</span>
              <input
                className="rounded-full border border-white/15 bg-[rgba(6,8,13,0.7)] px-4 py-2 text-sm text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="uppercase tracking-[0.18em] text-[var(--soft)]">Password (optional)</span>
              <input
                className="rounded-full border border-white/15 bg-[rgba(6,8,13,0.7)] px-4 py-2 text-sm text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Leave empty for magic link"
              />
            </label>
            <button
              type="submit"
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#111] transition hover:-translate-y-0.5"
            >
              {password.trim() ? 'Sign in' : 'Send magic link'}
            </button>
            {magicLinkSent ? (
              <p className="text-sm text-emerald-300">Magic link sent. Check your email.</p>
            ) : null}
            {authError ? <p className="text-sm text-[var(--danger)]">{authError}</p> : null}
          </form>
        </div>
      </div>
    );
  }

  if (adminChecking) {
    return (
      <div className="relative min-h-screen px-[6vw] py-12 text-[var(--ink)]">
        <div className="starfield" aria-hidden="true"></div>
        <div className="glow" aria-hidden="true"></div>
        <div className="relative z-10 mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-[var(--soft)]">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="relative min-h-screen px-[6vw] py-12 text-[var(--ink)]">
        <div className="starfield" aria-hidden="true"></div>
        <div className="glow" aria-hidden="true"></div>
        <div className="relative z-10 mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl">Access denied</h1>
          <p className="mt-2 text-sm text-[var(--soft)]">
            Your account ({adminEmail}) is not on the admin allow list.
          </p>
          {authError ? <p className="mt-2 text-sm text-[var(--danger)]">{authError}</p> : null}
          <button
            type="button"
            className="mt-4 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-white/40"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen px-[6vw] py-10 text-[var(--ink)]">
      <div className="starfield" aria-hidden="true"></div>
      <div className="glow" aria-hidden="true"></div>
      <div className="relative z-10 mx-auto grid max-w-6xl gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl">Admin Console</h1>
            <p className="text-sm text-[var(--soft)]">Signed in as {adminEmail}</p>
          </div>
          <button
            type="button"
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-white/40"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </header>

        <div className="flex flex-wrap gap-2">
          {[
            { key: 'campaigns', label: 'Campaigns' },
            { key: 'classes', label: 'Classes' },
            { key: 'abilities', label: 'Abilities & Skills' },
            { key: 'races', label: 'Races' },
            { key: 'loot', label: 'Loot & Drops' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 ${
                activeTab === tab.key
                  ? 'border-[rgba(214,179,106,0.7)] text-[var(--accent)]'
                  : 'border-white/20 text-[var(--ink)] hover:border-white/40'
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'campaigns' && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
            <aside className="rounded-[20px] border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg">Campaigns</h2>
                <button
                  type="button"
                  onClick={handleNewCampaign}
                  className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-white/40"
                >
                  New
                </button>
              </div>
              {campaignLoading ? (
                <p className="text-xs text-[var(--soft)]">Loading...</p>
              ) : null}
              {campaignError ? <p className="text-xs text-[var(--danger)]">{campaignError}</p> : null}
              <div className="grid gap-2">
                {campaigns.map((campaign) => (
                  <button
                    key={campaign.id}
                    type="button"
                    className={`rounded-xl border px-3 py-2 text-left text-sm transition hover:-translate-y-0.5 ${
                      campaignDraft?.id === campaign.id
                        ? 'border-[rgba(214,179,106,0.6)] bg-white/10'
                        : 'border-white/10 bg-white/5'
                    }`}
                    onClick={() => handleSelectCampaign(campaign)}
                  >
                    <div className="font-semibold">{campaign.name}</div>
                    <div className="text-xs text-[var(--soft)]">
                      {campaign.class_name} · HP {campaign.hp}
                    </div>
                    {campaign.access_key ? (
                      <div className="text-xs text-[var(--soft)]">UID {campaign.access_key}</div>
                    ) : null}
                  </button>
                ))}
                {campaigns.length === 0 && !campaignLoading ? (
                  <p className="text-xs text-[var(--soft)]">No campaigns found.</p>
                ) : null}
              </div>
            </aside>

            <section className="rounded-[20px] border border-white/10 bg-white/5 p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl">Campaign Editor</h2>
                <div className="flex flex-wrap gap-2">
                  {campaignDraft?.id ? (
                    <button
                      type="button"
                      onClick={handleDeleteCampaign}
                      className="rounded-full border border-red-400/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-red-200 transition hover:-translate-y-0.5"
                    >
                      Delete
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleSaveCampaign}
                    disabled={!campaignDraft || campaignSaving}
                    className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#111] transition hover:-translate-y-0.5 disabled:opacity-60"
                  >
                    {campaignSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>

              {!campaignDraft ? (
                <p className="text-sm text-[var(--soft)]">Select a campaign to edit or create a new one.</p>
              ) : (
                <div className="grid gap-6">
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-1 text-sm">
                      <span className="uppercase tracking-[0.18em] text-[var(--soft)]">UID</span>
                      <input
                        className="rounded-full border border-white/15 bg-[rgba(6,8,13,0.45)] px-4 py-2 text-sm text-[var(--soft)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                        value={campaignDraft.access_key ?? 'Generated on save'}
                        readOnly
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="uppercase tracking-[0.18em] text-[var(--soft)]">Name</span>
                      <input
                        className="rounded-full border border-white/15 bg-[rgba(6,8,13,0.7)] px-4 py-2 text-sm text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                        value={campaignDraft.name ?? ''}
                        onChange={(event) => updateCampaignField('name', event.target.value)}
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="uppercase tracking-[0.18em] text-[var(--soft)]">Class</span>
                      <input
                        className="rounded-full border border-white/15 bg-[rgba(6,8,13,0.7)] px-4 py-2 text-sm text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                        value={campaignDraft.class_name ?? ''}
                        onChange={(event) => updateCampaignField('class_name', event.target.value)}
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="uppercase tracking-[0.18em] text-[var(--soft)]">Race</span>
                      <input
                        className="rounded-full border border-white/15 bg-[rgba(6,8,13,0.7)] px-4 py-2 text-sm text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                        value={campaignDraft.race ?? ''}
                        onChange={(event) => updateCampaignField('race', event.target.value)}
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="uppercase tracking-[0.18em] text-[var(--soft)]">Alignment</span>
                      <input
                        className="rounded-full border border-white/15 bg-[rgba(6,8,13,0.7)] px-4 py-2 text-sm text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                        value={campaignDraft.alignment ?? ''}
                        onChange={(event) => updateCampaignField('alignment', event.target.value)}
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="uppercase tracking-[0.18em] text-[var(--soft)]">Gender</span>
                      <input
                        className="rounded-full border border-white/15 bg-[rgba(6,8,13,0.7)] px-4 py-2 text-sm text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                        value={campaignDraft.gender ?? ''}
                        onChange={(event) => updateCampaignField('gender', event.target.value)}
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="uppercase tracking-[0.18em] text-[var(--soft)]">HP</span>
                      <input
                        type="number"
                        className="rounded-full border border-white/15 bg-[rgba(6,8,13,0.7)] px-4 py-2 text-sm text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                        value={campaignDraft.hp ?? 0}
                        onChange={(event) => updateCampaignField('hp', asNumber(event.target.value))}
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="uppercase tracking-[0.18em] text-[var(--soft)]">Current HP</span>
                      <input
                        type="number"
                        className="rounded-full border border-white/15 bg-[rgba(6,8,13,0.7)] px-4 py-2 text-sm text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                        value={campaignDraft.hp_current ?? 0}
                        onChange={(event) => updateCampaignField('hp_current', asNumber(event.target.value))}
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="uppercase tracking-[0.18em] text-[var(--soft)]">Level</span>
                      <input
                        type="number"
                        className="rounded-full border border-white/15 bg-[rgba(6,8,13,0.7)] px-4 py-2 text-sm text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                        value={campaignDraft.level ?? 1}
                        onChange={(event) => updateCampaignField('level', asNumber(event.target.value))}
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="uppercase tracking-[0.18em] text-[var(--soft)]">Level XP</span>
                      <input
                        type="number"
                        className="rounded-full border border-white/15 bg-[rgba(6,8,13,0.7)] px-4 py-2 text-sm text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                        value={campaignDraft.level_xp ?? 0}
                        onChange={(event) => updateCampaignField('level_xp', asNumber(event.target.value))}
                      />
                    </label>
                  </div>

                  <label className="grid gap-2 text-sm">
                    <span className="uppercase tracking-[0.18em] text-[var(--soft)]">Class Description</span>
                    <textarea
                      rows={3}
                      className="rounded-2xl border border-white/15 bg-[rgba(6,8,13,0.7)] px-4 py-3 text-sm text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                      value={campaignDraft.class_description ?? ''}
                      onChange={(event) => updateCampaignField('class_description', event.target.value)}
                    />
                  </label>

                  <label className="grid gap-2 text-sm">
                    <span className="uppercase tracking-[0.18em] text-[var(--soft)]">Appearance</span>
                    <textarea
                      rows={3}
                      className="rounded-2xl border border-white/15 bg-[rgba(6,8,13,0.7)] px-4 py-3 text-sm text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                      value={campaignDraft.look ?? ''}
                      onChange={(event) => updateCampaignField('look', event.target.value)}
                    />
                  </label>

                  <label className="grid gap-2 text-sm">
                    <span className="uppercase tracking-[0.18em] text-[var(--soft)]">Backstory</span>
                    <textarea
                      rows={3}
                      className="rounded-2xl border border-white/15 bg-[rgba(6,8,13,0.7)] px-4 py-3 text-sm text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                      value={campaignDraft.backstory ?? ''}
                      onChange={(event) => updateCampaignField('backstory', event.target.value)}
                    />
                  </label>

                  <MapEditor
                    label="Race Boosts"
                    keys={abilities}
                    value={campaignDraft.race_boosts}
                    onChange={(next) => updateCampaignMap('race_boosts', next)}
                  />

                  <MapEditor
                    label="Ability Scores"
                    keys={abilities}
                    value={campaignDraft.ability_scores}
                    onChange={(next) => updateCampaignMap('ability_scores', next)}
                  />

                  <MapEditor
                    label="Stats"
                    keys={abilities}
                    value={campaignDraft.stats}
                    onChange={(next) => updateCampaignMap('stats', next)}
                  />

                  <MapEditor
                    label="Ability Progress"
                    keys={abilities}
                    value={campaignDraft.ability_progress}
                    onChange={(next) => updateCampaignMap('ability_progress', next)}
                  />

                  <MapEditor
                    label="Saving Throws"
                    keys={abilities}
                    value={campaignDraft.saving_throws}
                    onChange={(next) => updateCampaignMap('saving_throws', next)}
                  />

                  <MapEditor
                    label="Reputation"
                    keys={reputation}
                    value={campaignDraft.reputation}
                    onChange={(next) => updateCampaignMap('reputation', next)}
                    step={1}
                  />

                  <div className="grid gap-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--soft)]">
                      Save Proficiencies
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {abilities.map((ability) => {
                        const selected = (campaignDraft.save_proficiencies ?? []).includes(ability);
                        return (
                          <button
                            key={ability}
                            type="button"
                            className={`rounded-full border px-3 py-1 text-xs font-semibold transition hover:-translate-y-0.5 ${
                              selected
                                ? 'border-[rgba(214,179,106,0.7)] text-[var(--accent)]'
                                : 'border-white/20 text-[var(--ink)] hover:border-white/40'
                            }`}
                            onClick={() => {
                              const existing = campaignDraft.save_proficiencies ?? [];
                              const next = selected
                                ? existing.filter((entry) => entry !== ability)
                                : [...existing, ability];
                              updateCampaignField('save_proficiencies', next);
                            }}
                          >
                            {ability}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <MapEditor
                    label="Skills"
                    keys={skills}
                    value={campaignDraft.skills}
                    onChange={(next) => updateCampaignMap('skills', next)}
                  />

                  <MapEditor
                    label="Skill Progress"
                    keys={skills}
                    value={campaignDraft.skill_progress}
                    onChange={(next) => updateCampaignMap('skill_progress', next)}
                  />

                  <label className="grid gap-1 text-sm">
                    <span className="uppercase tracking-[0.18em] text-[var(--soft)]">Skill Points</span>
                    <input
                      type="number"
                      className="rounded-full border border-white/15 bg-[rgba(6,8,13,0.7)] px-4 py-2 text-sm text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                      value={campaignDraft.skill_points ?? 0}
                      onChange={(event) => updateCampaignField('skill_points', asNumber(event.target.value))}
                    />
                  </label>

                  <ListEditor
                    label="Messages"
                    items={campaignDraft.messages}
                    onChange={(next) => updateCampaignField('messages', next)}
                    makeNew={() => ({
                      id: `msg-${Date.now()}`,
                      sender: 'Narrator',
                      location: '',
                      content: '',
                    })}
                    fields={[
                      { key: 'id', label: 'ID' },
                      { key: 'sender', label: 'Sender' },
                      { key: 'location', label: 'Location' },
                      { key: 'content', label: 'Content', multiline: true },
                    ]}
                  />

                  <ListEditor
                    label="Quests"
                    items={campaignDraft.quests}
                    onChange={(next) => updateCampaignField('quests', next)}
                    makeNew={() => ({
                      id: `quest-${Date.now()}`,
                      title: '',
                      status: 'Active',
                      xp: 0,
                      description: '',
                    })}
                    fields={[
                      { key: 'id', label: 'ID' },
                      { key: 'title', label: 'Title' },
                      { key: 'status', label: 'Status' },
                      { key: 'xp', label: 'XP', type: 'number' },
                      { key: 'description', label: 'Description', multiline: true },
                    ]}
                  />

                  <ListEditor
                    label="Bounties"
                    items={campaignDraft.bounties}
                    onChange={(next) => updateCampaignField('bounties', next)}
                    makeNew={() => ({
                      id: `bounty-${Date.now()}`,
                      title: '',
                      status: 'Open',
                      reward: '',
                    })}
                    fields={[
                      { key: 'id', label: 'ID' },
                      { key: 'title', label: 'Title' },
                      { key: 'status', label: 'Status' },
                      { key: 'reward', label: 'Reward' },
                    ]}
                  />

                  <ListEditor
                    label="Relationships"
                    items={campaignDraft.relationships}
                    onChange={(next) => updateCampaignField('relationships', next)}
                    makeNew={() => ({
                      id: `npc-${Date.now()}`,
                      name: '',
                      status: 'Neutral',
                      note: '',
                    })}
                    fields={[
                      { key: 'id', label: 'ID' },
                      { key: 'name', label: 'Name' },
                      { key: 'status', label: 'Status' },
                      { key: 'note', label: 'Note', multiline: true },
                    ]}
                  />

                  <ListEditor
                    label="Journal"
                    items={campaignDraft.journal}
                    onChange={(next) => updateCampaignField('journal', next)}
                    makeNew={() => ({
                      id: `jrnl-${Date.now()}`,
                      title: 'New Entry',
                      category: 'Personal',
                      content: '',
                      createdAt: new Date().toISOString(),
                    })}
                    fields={[
                      { key: 'id', label: 'ID' },
                      { key: 'title', label: 'Title' },
                      { key: 'category', label: 'Category' },
                      { key: 'createdAt', label: 'Created At' },
                      { key: 'content', label: 'Content', multiline: true },
                    ]}
                  />

                  <div className="grid gap-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--soft)]">
                      Inventory (JSON)
                    </div>
                    <textarea
                      rows={6}
                      className="rounded-2xl border border-white/15 bg-[rgba(6,8,13,0.7)] px-4 py-3 text-xs text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                      value={jsonDrafts.inventory ?? '[]'}
                      onChange={(event) =>
                        setJsonDrafts((prev) => ({ ...prev, inventory: event.target.value }))
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--soft)]">
                      Spellbook (JSON)
                    </div>
                    <textarea
                      rows={6}
                      className="rounded-2xl border border-white/15 bg-[rgba(6,8,13,0.7)] px-4 py-3 text-xs text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                      value={jsonDrafts.spellbook ?? '[]'}
                      onChange={(event) =>
                        setJsonDrafts((prev) => ({ ...prev, spellbook: event.target.value }))
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--soft)]">
                      Buffs (JSON)
                    </div>
                    <textarea
                      rows={4}
                      className="rounded-2xl border border-white/15 bg-[rgba(6,8,13,0.7)] px-4 py-3 text-xs text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                      value={jsonDrafts.buffs ?? '[]'}
                      onChange={(event) =>
                        setJsonDrafts((prev) => ({ ...prev, buffs: event.target.value }))
                      }
                    />
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'classes' && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
            <aside className="rounded-[20px] border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg">Classes</h2>
                <button
                  type="button"
                  onClick={() => {
                    const next = [...classesDraft, {
                      name: 'New Class',
                      nickname: 'New Class',
                      role: 'Class',
                      description: '',
                      hp: 10,
                      strengths: [],
                      secondary: [],
                      weaknesses: [],
                      reputation: buildMapFromKeys(reputation, 0),
                      saveProficiencies: [],
                    }];
                    setClassesDraft(next);
                    setSelectedClassIndex(next.length - 1);
                  }}
                  className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-white/40"
                >
                  New
                </button>
              </div>
              <div className="grid gap-2">
                {classesDraft.map((entry, index) => (
                  <button
                    key={`${entry.name}-${index}`}
                    type="button"
                    className={`rounded-xl border px-3 py-2 text-left text-sm transition hover:-translate-y-0.5 ${
                      selectedClassIndex === index
                        ? 'border-[rgba(214,179,106,0.6)] bg-white/10'
                        : 'border-white/10 bg-white/5'
                    }`}
                    onClick={() => setSelectedClassIndex(index)}
                  >
                    <div className="font-semibold">{entry.nickname ?? entry.name}</div>
                    <div className="text-xs text-[var(--soft)]">{entry.role ?? 'Class'}</div>
                  </button>
                ))}
              </div>
            </aside>

            <section className="rounded-[20px] border border-white/10 bg-white/5 p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl">Class Editor</h2>
                <button
                  type="button"
                  onClick={handleSaveClasses}
                  disabled={gameDataSaving}
                  className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#111] transition hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {gameDataSaving ? 'Saving...' : 'Save Classes'}
                </button>
              </div>
              {gameDataError ? <p className="text-sm text-[var(--danger)]">{gameDataError}</p> : null}
              {classesDraft.length === 0 ? (
                <p className="text-sm text-[var(--soft)]">No classes found.</p>
              ) : (
                <div className="grid gap-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-1 text-sm">
                      <span className="uppercase tracking-[0.18em] text-[var(--soft)]">Name</span>
                      <input
                        className="rounded-full border border-white/15 bg-[rgba(6,8,13,0.7)] px-4 py-2 text-sm text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                        value={classesDraft[selectedClassIndex]?.name ?? ''}
                        onChange={(event) => {
                          setClassesDraft((prev) =>
                            updateArrayItem(prev, selectedClassIndex, {
                              ...prev[selectedClassIndex],
                              name: event.target.value,
                            })
                          );
                        }}
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="uppercase tracking-[0.18em] text-[var(--soft)]">Nickname</span>
                      <input
                        className="rounded-full border border-white/15 bg-[rgba(6,8,13,0.7)] px-4 py-2 text-sm text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                        value={classesDraft[selectedClassIndex]?.nickname ?? ''}
                        onChange={(event) => {
                          setClassesDraft((prev) =>
                            updateArrayItem(prev, selectedClassIndex, {
                              ...prev[selectedClassIndex],
                              nickname: event.target.value,
                            })
                          );
                        }}
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="uppercase tracking-[0.18em] text-[var(--soft)]">Role</span>
                      <input
                        className="rounded-full border border-white/15 bg-[rgba(6,8,13,0.7)] px-4 py-2 text-sm text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                        value={classesDraft[selectedClassIndex]?.role ?? ''}
                        onChange={(event) => {
                          setClassesDraft((prev) =>
                            updateArrayItem(prev, selectedClassIndex, {
                              ...prev[selectedClassIndex],
                              role: event.target.value,
                            })
                          );
                        }}
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="uppercase tracking-[0.18em] text-[var(--soft)]">HP</span>
                      <input
                        type="number"
                        className="rounded-full border border-white/15 bg-[rgba(6,8,13,0.7)] px-4 py-2 text-sm text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                        value={classesDraft[selectedClassIndex]?.hp ?? 0}
                        onChange={(event) => {
                          setClassesDraft((prev) =>
                            updateArrayItem(prev, selectedClassIndex, {
                              ...prev[selectedClassIndex],
                              hp: asNumber(event.target.value),
                            })
                          );
                        }}
                      />
                    </label>
                  </div>

                  <label className="grid gap-2 text-sm">
                    <span className="uppercase tracking-[0.18em] text-[var(--soft)]">Description</span>
                    <textarea
                      rows={3}
                      className="rounded-2xl border border-white/15 bg-[rgba(6,8,13,0.7)] px-4 py-3 text-sm text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                      value={classesDraft[selectedClassIndex]?.description ?? ''}
                      onChange={(event) => {
                        setClassesDraft((prev) =>
                          updateArrayItem(prev, selectedClassIndex, {
                            ...prev[selectedClassIndex],
                            description: event.target.value,
                          })
                        );
                      }}
                    />
                  </label>

                  <MapEditor
                    label="Reputation"
                    keys={reputation}
                    value={classesDraft[selectedClassIndex]?.reputation ?? {}}
                    onChange={(next) => {
                      setClassesDraft((prev) =>
                        updateArrayItem(prev, selectedClassIndex, {
                          ...prev[selectedClassIndex],
                          reputation: next,
                        })
                      );
                    }}
                  />

                  <div className="grid gap-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--soft)]">
                      Save Proficiencies
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {abilities.map((ability) => {
                        const selected = (classesDraft[selectedClassIndex]?.saveProficiencies ?? []).includes(ability);
                        return (
                          <button
                            key={`save-${ability}`}
                            type="button"
                            className={`rounded-full border px-3 py-1 text-xs font-semibold transition hover:-translate-y-0.5 ${
                              selected
                                ? 'border-[rgba(214,179,106,0.7)] text-[var(--accent)]'
                                : 'border-white/20 text-[var(--ink)] hover:border-white/40'
                            }`}
                            onClick={() => {
                              const existing = classesDraft[selectedClassIndex]?.saveProficiencies ?? [];
                              const next = selected
                                ? existing.filter((entry) => entry !== ability)
                                : [...existing, ability];
                              setClassesDraft((prev) =>
                                updateArrayItem(prev, selectedClassIndex, {
                                  ...prev[selectedClassIndex],
                                  saveProficiencies: next,
                                })
                              );
                            }}
                          >
                            {ability}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'abilities' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-[20px] border border-white/10 bg-white/5 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl">Abilities</h2>
                <button
                  type="button"
                  onClick={handleSaveAbilities}
                  disabled={gameDataSaving}
                  className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#111] transition hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {gameDataSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
              <div className="grid gap-2">
                {abilitiesDraft.map((ability, index) => (
                  <div key={`ability-${index}`} className="flex items-center gap-2">
                    <input
                      className="flex-1 rounded-full border border-white/15 bg-[rgba(6,8,13,0.7)] px-4 py-2 text-sm text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                      value={ability}
                      onChange={(event) =>
                        setAbilitiesDraft((prev) => updateArrayItem(prev, index, event.target.value))
                      }
                    />
                    <button
                      type="button"
                      className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--soft)] transition hover:-translate-y-0.5 hover:border-white/40"
                      onClick={() =>
                        setAbilitiesDraft((prev) => prev.filter((_, entryIndex) => entryIndex !== index))
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="rounded-full border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-white/40"
                  onClick={() => setAbilitiesDraft((prev) => [...prev, 'New Ability'])}
                >
                  Add ability
                </button>
              </div>
            </section>

            <section className="rounded-[20px] border border-white/10 bg-white/5 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl">Skills By Ability</h2>
                <button
                  type="button"
                  onClick={handleSaveSkills}
                  disabled={gameDataSaving}
                  className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#111] transition hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {gameDataSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
              <div className="grid gap-3">
                {abilitiesDraft.map((ability) => {
                  const skillList = skillsByAbilityDraft?.[ability] ?? [];
                  return (
                    <label key={`skills-${ability}`} className="grid gap-1 text-sm">
                      <span className="uppercase tracking-[0.18em] text-[var(--soft)]">{ability}</span>
                      <input
                        className="rounded-full border border-white/15 bg-[rgba(6,8,13,0.7)] px-4 py-2 text-sm text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                        value={skillList.join(', ')}
                        onChange={(event) => {
                          const entries = event.target.value
                            .split(',')
                            .map((entry) => entry.trim())
                            .filter(Boolean);
                          setSkillsByAbilityDraft((prev) => ({
                            ...prev,
                            [ability]: entries,
                          }));
                        }}
                      />
                    </label>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'races' && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
            <aside className="rounded-[20px] border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg">Races</h2>
                <button
                  type="button"
                  onClick={() => {
                    const next = [
                      ...racesDraft,
                      {
                        name: 'New Race',
                        base: {},
                        variants: [],
                        choices: [],
                      },
                    ];
                    setRacesDraft(next);
                    setSelectedRaceIndex(next.length - 1);
                  }}
                  className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-white/40"
                >
                  New
                </button>
              </div>
              <div className="grid gap-2">
                {racesDraft.map((entry, index) => (
                  <button
                    key={`${entry.name}-${index}`}
                    type="button"
                    className={`rounded-xl border px-3 py-2 text-left text-sm transition hover:-translate-y-0.5 ${
                      selectedRaceIndex === index
                        ? 'border-[rgba(214,179,106,0.6)] bg-white/10'
                        : 'border-white/10 bg-white/5'
                    }`}
                    onClick={() => setSelectedRaceIndex(index)}
                  >
                    <div className="font-semibold">{entry.name}</div>
                    <div className="text-xs text-[var(--soft)]">
                      {entry?.variants?.length ? `${entry.variants.length} variants` : 'No variants'}
                    </div>
                  </button>
                ))}
                {racesDraft.length === 0 ? (
                  <p className="text-xs text-[var(--soft)]">No races defined.</p>
                ) : null}
              </div>
            </aside>

            <section className="rounded-[20px] border border-white/10 bg-white/5 p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl">Race Editor</h2>
                <div className="flex flex-wrap gap-2">
                  {racesDraft.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        const next = racesDraft.filter((_, index) => index !== selectedRaceIndex);
                        setRacesDraft(next);
                        setSelectedRaceIndex(Math.max(0, selectedRaceIndex - 1));
                      }}
                      className="rounded-full border border-red-400/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-red-200 transition hover:-translate-y-0.5"
                    >
                      Remove
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleSaveRaces}
                    disabled={gameDataSaving}
                    className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#111] transition hover:-translate-y-0.5 disabled:opacity-60"
                  >
                    {gameDataSaving ? 'Saving...' : 'Save Races'}
                  </button>
                </div>
              </div>
              {gameDataError ? <p className="text-sm text-[var(--danger)]">{gameDataError}</p> : null}
              {racesDraft.length === 0 ? (
                <p className="text-sm text-[var(--soft)]">Create a race to begin editing.</p>
              ) : (
                <div className="grid gap-4">
                  <label className="grid gap-1 text-sm">
                    <span className="uppercase tracking-[0.18em] text-[var(--soft)]">Name</span>
                    <input
                      className="rounded-full border border-white/15 bg-[rgba(6,8,13,0.7)] px-4 py-2 text-sm text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                      value={racesDraft[selectedRaceIndex]?.name ?? ''}
                      onChange={(event) => {
                        setRacesDraft((prev) =>
                          updateArrayItem(prev, selectedRaceIndex, {
                            ...prev[selectedRaceIndex],
                            name: event.target.value,
                          })
                        );
                      }}
                    />
                  </label>

                  <MapEditor
                    label="Base Boosts"
                    keys={abilities}
                    value={racesDraft[selectedRaceIndex]?.base ?? {}}
                    onChange={(next) => {
                      setRacesDraft((prev) =>
                        updateArrayItem(prev, selectedRaceIndex, {
                          ...prev[selectedRaceIndex],
                          base: next,
                        })
                      );
                    }}
                  />

                  <RaceChoicesEditor
                    label="Race Choices"
                    abilities={abilities}
                    choices={racesDraft[selectedRaceIndex]?.choices ?? []}
                    onChange={(next) => {
                      setRacesDraft((prev) =>
                        updateArrayItem(prev, selectedRaceIndex, {
                          ...prev[selectedRaceIndex],
                          choices: next,
                        })
                      );
                    }}
                  />

                  <RaceVariantsEditor
                    abilities={abilities}
                    variants={racesDraft[selectedRaceIndex]?.variants ?? []}
                    onChange={(next) => {
                      setRacesDraft((prev) =>
                        updateArrayItem(prev, selectedRaceIndex, {
                          ...prev[selectedRaceIndex],
                          variants: next,
                        })
                      );
                    }}
                  />
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'loot' && (
          <section className="rounded-[20px] border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl">Loot & Drop Config</h2>
                <p className="m-0 text-xs text-[var(--soft)]">
                  Edit the rarity table, item scaling, and potion rules.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveLootConfig}
                disabled={gameDataSaving || Boolean(lootConfigError)}
                className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#111] transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                {gameDataSaving ? 'Saving...' : 'Save Loot Config'}
              </button>
            </div>
            {gameDataError ? <p className="text-sm text-[var(--danger)]">{gameDataError}</p> : null}
            {lootConfigError ? <p className="text-sm text-[var(--danger)]">{lootConfigError}</p> : null}
            <textarea
              rows={18}
              className="w-full rounded-2xl border border-white/15 bg-[rgba(6,8,13,0.7)] px-4 py-3 text-xs text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
              value={lootConfigJson}
              onChange={(event) => {
                const next = event.target.value;
                setLootConfigJson(next);
                const parsed = safeParseJson(next);
                if (!parsed.ok) {
                  setLootConfigError(parsed.error);
                  return;
                }
                setLootConfigError('');
                setLootConfigDraft(parsed.value);
              }}
            />
          </section>
        )}
      </div>
    </div>
  );
}

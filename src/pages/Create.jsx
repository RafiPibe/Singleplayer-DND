import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CLASSES, CUSTOM_CLASS, REPUTATION, HP_RANGE } from '../data/classes.js';
import { ABILITIES, STANDARD_ARRAY, SKILLS, getAbilityModifier } from '../data/abilities.js';
import { RACES } from '../data/races.js';
import { supabase } from '../lib/supabase.js';
import { getValueStyle } from '../lib/valueStyle.js';

const TOTAL_STEPS = 6;
const rollDie = (sides) => Math.floor(Math.random() * sides) + 1;
const rollInRange = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const rollHpValue = () => rollInRange(HP_RANGE.min, HP_RANGE.max);
const rollAbilityScore = () => {
  const rolls = Array.from({ length: 4 }, () => rollDie(6)).sort((a, b) => a - b);
  return rolls.slice(1).reduce((sum, value) => sum + value, 0);
};

const ALIGNMENTS = [
  'Lawful Good',
  'Neutral Good',
  'Chaotic Good',
  'Lawful Neutral',
  'True Neutral',
  'Chaotic Neutral',
  'Lawful Evil',
  'Neutral Evil',
  'Chaotic Evil',
];

export default function Create() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [race, setRace] = useState('');
  const [customRaceName, setCustomRaceName] = useState('');
  const [raceVariantIndex, setRaceVariantIndex] = useState(0);
  const [raceChoices, setRaceChoices] = useState([]);
  const [alignment, setAlignment] = useState('');
  const [look, setLook] = useState('');
  const [gender, setGender] = useState('Male');
  const [genderCustom, setGenderCustom] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [customNickname, setCustomNickname] = useState('');
  const [customClassName, setCustomClassName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [abilityMethod, setAbilityMethod] = useState('roll');
  const [abilityScores, setAbilityScores] = useState(() => {
    const base = {};
    ABILITIES.forEach((ability) => {
      base[ability] = 0;
    });
    return base;
  });
  const [customReputation, setCustomReputation] = useState(() => {
    const base = {};
    REPUTATION.forEach((rep) => {
      base[rep] = 0;
    });
    return base;
  });
  const [classReputation, setClassReputation] = useState(() => ({}));
  const [rolledHp, setRolledHp] = useState(() => rollHpValue());
  const [hpDisplay, setHpDisplay] = useState(() => rollHpValue());
  const [rollingAbilities, setRollingAbilities] = useState({});
  const [rollingReputation, setRollingReputation] = useState({});
  const [rollingClassReputation, setRollingClassReputation] = useState({});
  const [rollingHp, setRollingHp] = useState(false);
  const [backstory, setBackstory] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const timersRef = useRef({ intervals: new Set(), timeouts: new Set() });

  const classOptions = useMemo(() => [...CLASSES, CUSTOM_CLASS], []);
  const raceConfig = useMemo(() => RACES.find((entry) => entry.name === race), [race]);
  const activeRaceVariant = raceConfig?.variants?.[raceVariantIndex] ?? null;
  const raceChoiceConfig = activeRaceVariant?.choices ?? raceConfig?.choices ?? [];
  const raceHasUniqueChoices = activeRaceVariant?.unique ?? false;

  const raceBoosts = useMemo(() => {
    const boosts = { ...(raceConfig?.base ?? {}) };
    if (activeRaceVariant?.boosts) {
      Object.entries(activeRaceVariant.boosts).forEach(([ability, amount]) => {
        boosts[ability] = (boosts[ability] ?? 0) + amount;
      });
    }
    raceChoiceConfig.forEach((choice, index) => {
      const pick = raceChoices[index];
      if (!pick) return;
      boosts[pick] = (boosts[pick] ?? 0) + choice.amount;
    });
    return boosts;
  }, [raceConfig, activeRaceVariant, raceChoiceConfig, raceChoices]);

  const baseAbilityScores = useMemo(() => {
    const base = {};
    ABILITIES.forEach((ability) => {
      const value =
        abilityMethod === 'roll'
          ? rollingAbilities[ability] ?? abilityScores[ability]
          : abilityScores[ability];
      base[ability] = Number.isFinite(value) ? value : 0;
    });
    return base;
  }, [abilityMethod, abilityScores, rollingAbilities]);

  const finalAbilityScores = useMemo(() => {
    const withBoosts = { ...baseAbilityScores };
    Object.entries(raceBoosts).forEach(([ability, amount]) => {
      withBoosts[ability] = (withBoosts[ability] ?? 0) + amount;
    });
    return withBoosts;
  }, [baseAbilityScores, raceBoosts]);

  const getDisplayName = (cls) => {
    const nickname = cls.nickname ?? cls.name;
    const role = cls.role ?? 'Class';
    return `${nickname} (${role})`;
  };

  const rollRepValue = () => rollInRange(-20, 20);

  const trackInterval = (id) => {
    timersRef.current.intervals.add(id);
  };

  const trackTimeout = (id) => {
    timersRef.current.timeouts.add(id);
  };

  const clearTrackedInterval = (id) => {
    clearInterval(id);
    timersRef.current.intervals.delete(id);
  };

  const clearTrackedTimeout = (id) => {
    clearTimeout(id);
    timersRef.current.timeouts.delete(id);
  };

  useEffect(() => {
    return () => {
      timersRef.current.intervals.forEach((id) => clearInterval(id));
      timersRef.current.timeouts.forEach((id) => clearTimeout(id));
    };
  }, []);

  useEffect(() => {
    setRaceVariantIndex(0);
    setRaceChoices([]);
    if (race !== 'Custom') {
      setCustomRaceName('');
    }
  }, [race]);

  useEffect(() => {
    if (!raceChoiceConfig.length) {
      setRaceChoices([]);
      return;
    }
    setRaceChoices(Array.from({ length: raceChoiceConfig.length }, () => ''));
  }, [race, raceVariantIndex, raceChoiceConfig.length]);

  useEffect(() => {
    if (abilityMethod === 'standard') {
      setRollingAbilities({});
      setAbilityScores((prev) => {
        const reset = {};
        ABILITIES.forEach((ability) => {
          reset[ability] = 0;
        });
        return reset;
      });
    }
  }, [abilityMethod]);

  const animateRollSet = (keys, randomFn, setRollingMap, applyFinal) => {
    const intervalId = setInterval(() => {
      setRollingMap((prev) => {
        const next = { ...prev };
        keys.forEach((key) => {
          next[key] = randomFn();
        });
        return next;
      });
    }, 80);
    trackInterval(intervalId);

    const timeoutId = setTimeout(() => {
      clearTrackedInterval(intervalId);
      const final = {};
      keys.forEach((key) => {
        final[key] = randomFn();
      });
      applyFinal(final);
      setRollingMap((prev) => {
        const next = { ...prev };
        keys.forEach((key) => {
          delete next[key];
        });
        return next;
      });
      clearTrackedTimeout(timeoutId);
    }, 1000);
    trackTimeout(timeoutId);
  };

  const rerollHp = () => {
    setRollingHp(true);
    const intervalId = setInterval(() => {
      setHpDisplay(rollHpValue());
    }, 80);
    trackInterval(intervalId);

    const timeoutId = setTimeout(() => {
      clearTrackedInterval(intervalId);
      const final = rollHpValue();
      setRolledHp(final);
      setHpDisplay(final);
      setRollingHp(false);
      clearTrackedTimeout(timeoutId);
    }, 1000);
    trackTimeout(timeoutId);
  };

  const rollAllAbilities = () => {
    animateRollSet(ABILITIES, rollAbilityScore, setRollingAbilities, (final) => {
      setAbilityScores(final);
    });
  };

  const rollAllReputation = () => {
    animateRollSet(REPUTATION, rollRepValue, setRollingReputation, (final) => {
      setCustomReputation(final);
    });
  };

  const rollReputationSet = () => {
    if (selectedClass === CUSTOM_CLASS.name) {
      rollAllReputation();
    } else {
      rollClassReputation();
    }
  };

  const rollSingleAbility = (ability) => {
    animateRollSet([ability], rollAbilityScore, setRollingAbilities, (final) => {
      setAbilityScores((prev) => ({ ...prev, ...final }));
    });
  };

  const rollSingleReputation = (rep) => {
    animateRollSet([rep], rollRepValue, setRollingReputation, (final) => {
      setCustomReputation((prev) => ({ ...prev, ...final }));
    });
  };

  const rollClassReputation = () => {
    if (!selectedClass || selectedClass === CUSTOM_CLASS.name) return;
    animateRollSet(REPUTATION, rollRepValue, setRollingClassReputation, (final) => {
      setClassReputation((prev) => ({
        ...prev,
        [selectedClass]: final,
      }));
    });
  };

  useEffect(() => {
    if (selectedClass === CUSTOM_CLASS.name) {
      setError('');
    }
  }, [selectedClass, customNickname, customClassName, customDescription]);

  useEffect(() => {
    if (!selectedClass) return;
    const nextHp = rollHpValue();
    setRolledHp(nextHp);
    setHpDisplay(nextHp);
    setRollingHp(false);
    setRollingReputation({});
    setRollingClassReputation({});
  }, [selectedClass]);

  const currentClassDetails = useMemo(() => {
    if (selectedClass === CUSTOM_CLASS.name) {
      const nickname = customNickname.trim() || CUSTOM_CLASS.nickname;
      const role = customClassName.trim() || CUSTOM_CLASS.role;
      const description = customDescription.trim() || CUSTOM_CLASS.description;
      return {
        name: CUSTOM_CLASS.name,
        nickname,
        role,
        displayName: `${nickname} (${role})`,
        description,
        hp: rolledHp,
        reputation: customReputation,
      };
    }

    const selected = CLASSES.find((cls) => cls.name === selectedClass);
    if (!selected) return null;

    const reputation = classReputation[selected.name] ?? selected.reputation;

    return {
      name: selected.name,
      nickname: selected.nickname ?? selected.name,
      role: selected.role ?? 'Class',
      displayName: getDisplayName(selected),
      description: selected.description,
      hp: rolledHp,
      reputation,
    };
  }, [
    selectedClass,
    customNickname,
    customClassName,
    customDescription,
    customReputation,
    rolledHp,
    classReputation,
  ]);

  const getRepValue = (rep) => {
    if (!currentClassDetails) return 0;
    if (selectedClass === CUSTOM_CLASS.name) {
      return rollingReputation[rep] ?? customReputation[rep];
    }
    return rollingClassReputation[rep] ?? currentClassDetails.reputation[rep];
  };

  const validateStep = () => {
    if (step === 1 && name.trim().length < 2) {
      return 'Please enter a character name.';
    }
    if (step === 2) {
      if (!race) {
        return 'Choose a race to continue.';
      }
      if (race === 'Custom' && customRaceName.trim().length < 2) {
        return 'Enter a custom race name.';
      }
      if (raceChoiceConfig.length) {
        const missing = raceChoices.some((choice) => !choice);
        if (missing) {
          return 'Select all race bonuses before continuing.';
        }
      }
    }
    if (step === 3) {
      if (!alignment) {
        return 'Pick an alignment to continue.';
      }
    }
    if (step === 4) {
      if (look.trim().length < 10) {
        return 'Tell us a bit more about your character appearance.';
      }
      if (gender === 'Custom' && !genderCustom.trim()) {
        return 'Please enter a custom gender or pick Male/Female.';
      }
    }
    if (step === 5) {
      if (!selectedClass) {
        return 'Choose a class to continue.';
      }
      if (selectedClass === CUSTOM_CLASS.name) {
        if (customNickname.trim().length < 2 || customClassName.trim().length < 2) {
          return 'Add a nickname and class name for your custom class.';
        }
        if (customDescription.trim().length < 10) {
          return 'Describe your custom class (at least 10 characters).';
        }
      }
      const missingAbilities = ABILITIES.some((ability) => (baseAbilityScores[ability] ?? 0) <= 0);
      if (missingAbilities) {
        return 'Assign all ability scores before continuing.';
      }
    }
    if (step === 6 && backstory.trim().length < 20) {
      return 'Give a short backstory (20 characters or more).';
    }
    return '';
  };

  const isStepComplete = (stepNumber) => {
    if (stepNumber === 1) return name.trim().length >= 2;
    if (stepNumber === 2) {
      if (!race) return false;
      if (race === 'Custom' && customRaceName.trim().length < 2) return false;
      if (raceChoiceConfig.length) {
        return raceChoices.every((choice) => Boolean(choice));
      }
      return true;
    }
    if (stepNumber === 3) {
      return Boolean(alignment);
    }
    if (stepNumber === 4) {
      const hasLook = look.trim().length >= 10;
      const hasGender = gender === 'Custom' ? genderCustom.trim().length > 0 : true;
      return hasLook && hasGender;
    }
    if (stepNumber === 5) {
      if (!selectedClass) return false;
      if (selectedClass === CUSTOM_CLASS.name) {
        if (
          customNickname.trim().length < 2 ||
          customClassName.trim().length < 2 ||
          customDescription.trim().length < 10
        ) {
          return false;
        }
      }
      return ABILITIES.every((ability) => (baseAbilityScores[ability] ?? 0) > 0);
    }
    if (stepNumber === 6) return backstory.trim().length >= 20;
    return false;
  };

  const maxCompletedStep = Math.max(
    0,
    ...[1, 2, 3, 4, 5, 6].filter((stepNumber) => isStepComplete(stepNumber))
  );

  const nextStep = () => {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    setError('');
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  };

  const prevStep = () => {
    setError('');
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }

    if (!currentClassDetails) {
      setError('Choose a class before saving.');
      return;
    }
    if (!supabase) {
      setError('Missing Supabase configuration. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }

    setSaving(true);
    setError('');

    const genderValue = gender === 'Custom' ? genderCustom.trim() : gender;
    const raceValue = race === 'Custom' ? customRaceName.trim() : race;
    const abilityProgress = {};
    ABILITIES.forEach((ability) => {
      abilityProgress[ability] = 0;
    });
    const skills = {};
    const skillProgress = {};
    SKILLS.forEach((skill) => {
      skills[skill] = 0;
      skillProgress[skill] = 0;
    });

    const payload = {
      name: name.trim(),
      race: raceValue,
      alignment,
      race_boosts: raceBoosts,
      look: look.trim(),
      gender: genderValue,
      class_name: currentClassDetails.displayName ?? currentClassDetails.name,
      class_description: currentClassDetails.description,
      stats: finalAbilityScores,
      ability_scores: finalAbilityScores,
      ability_progress: abilityProgress,
      skills,
      skill_progress: skillProgress,
      skill_points: 0,
      reputation: currentClassDetails.reputation,
      hp: currentClassDetails.hp,
      hp_current: currentClassDetails.hp,
      backstory: backstory.trim(),
    };

    const { data, error: insertError } = await supabase
      .from('campaigns')
      .insert(payload)
      .select('id')
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    navigate(`/campaign/${data.id}`);
  };

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter') return;
    if (event.target.tagName === 'TEXTAREA') {
      if (step === 4 && !event.shiftKey) {
        event.preventDefault();
        if (step < TOTAL_STEPS) {
          nextStep();
        }
      }
      return;
    }
    event.preventDefault();
    if (step < TOTAL_STEPS) {
      nextStep();
    }
  };

  return (
    <div className="relative min-h-screen">
      <div className="starfield" aria-hidden="true"></div>
      <div className="glow" aria-hidden="true"></div>

      <header className="sticky top-0 z-20 flex items-center justify-between bg-gradient-to-b from-[#050607]/95 to-[#050607]/0 px-[6vw] pt-7 pb-2 backdrop-blur">
        <Link
          className="font-['Cinzel'] text-sm font-bold uppercase tracking-[0.16em] text-[var(--accent-2)]"
          to="/"
        >
          Pibe's Tavern
        </Link>
      </header>

      <main className="relative z-10 grid min-h-screen place-items-center gap-4 px-[6vw] pb-24">
        <section className="grid w-full max-w-[1120px] gap-4 pt-[18px] animate-[float-in_0.5s_ease]">

          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
            {step === 1 && (
              <label className="mb-5 grid gap-2.5 text-center">
                <span className="font-['Cinzel'] text-[1.5rem]">What is your character name?</span>
                <input
                  className="min-w-[min(520px,90vw)] border-0 bg-transparent px-0 py-3 text-center text-base text-[var(--ink)] focus:outline-none"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={40}
                  required
                />
              </label>
            )}

            {step === 2 && (
              <div className="grid gap-5 text-center">
                <div className="grid gap-2.5">
                  <span className="font-['Cinzel'] text-[1.5rem]">Choose your race</span>
                  <div className="grid gap-3 max-[800px]:grid-cols-2 min-[801px]:grid-cols-4">
                    {RACES.map((entry) => {
                      const isActive = race === entry.name;
                      return (
                        <button
                          key={entry.name}
                          type="button"
                          className={`rounded-full border bg-transparent px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 ${
                            isActive
                              ? 'border-[rgba(214,179,106,0.7)] text-[var(--accent)]'
                              : 'border-white/20 text-[var(--ink)] hover:border-white/40'
                          }`}
                          onClick={() => setRace(entry.name)}
                        >
                          {entry.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {race === 'Custom' && (
                  <input
                    className="min-w-[min(520px,90vw)] border-0 bg-transparent px-0 py-3 text-center text-base text-[var(--ink)] focus:outline-none"
                    type="text"
                    value={customRaceName}
                    onChange={(event) => setCustomRaceName(event.target.value)}
                    maxLength={32}
                    placeholder="Enter custom race name"
                  />
                )}
                {raceConfig?.variants?.length ? (
                  <div className="grid gap-2.5 text-center">
                    <span className="text-xs uppercase tracking-[0.2em] text-[var(--soft)]">
                      Subrace bonus
                    </span>
                    <div className="flex flex-wrap justify-center gap-2">
                      {raceConfig.variants.map((variant, index) => {
                        const isActive = raceVariantIndex === index;
                        return (
                          <button
                            key={variant.label}
                            type="button"
                            className={`rounded-full border bg-transparent px-4 py-2 text-xs font-semibold transition hover:-translate-y-0.5 ${
                              isActive
                                ? 'border-[rgba(214,179,106,0.7)] text-[var(--accent)]'
                                : 'border-white/20 text-[var(--ink)] hover:border-white/40'
                            }`}
                            onClick={() => setRaceVariantIndex(index)}
                          >
                            {variant.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                {raceChoiceConfig.length ? (
                  <div className="grid gap-3">
                    {raceChoiceConfig.map((choice, index) => {
                      const current = raceChoices[index];
                      const used = raceChoices.filter(Boolean);
                      const options = choice.options.filter((option) => {
                        if (!raceHasUniqueChoices) return true;
                        if (option === current) return true;
                        return !used.includes(option);
                      });
                      return (
                        <label key={`${choice.label}-${index}`} className="grid gap-2 text-center">
                          <span className="text-xs uppercase tracking-[0.2em] text-[var(--soft)]">
                            {choice.label ?? 'Choose ability'}
                          </span>
                          <select
                            className="rounded-full border border-white/20 bg-[rgba(6,8,13,0.7)] px-4 py-2 text-sm text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                            value={current || ''}
                            onChange={(event) => {
                              const next = [...raceChoices];
                              next[index] = event.target.value;
                              setRaceChoices(next);
                            }}
                          >
                            <option value="" disabled>
                              Select ability
                            </option>
                            {options.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>
                      );
                    })}
                  </div>
                ) : null}
                {race && (
                  <p className="m-0 text-sm text-[var(--soft)]">
                    Boosts:{' '}
                    {Object.keys(raceBoosts).length
                      ? Object.entries(raceBoosts)
                          .map(([ability, amount]) => `+${amount} ${ability}`)
                          .join(', ')
                      : 'None'}
                  </p>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-4 text-center">
                <span className="font-['Cinzel'] text-[1.5rem]">Choose your alignment</span>
                <div className="grid grid-cols-3 gap-3">
                  {ALIGNMENTS.map((entry) => {
                    const isActive = alignment === entry;
                    return (
                      <button
                        key={entry}
                        type="button"
                        className={`rounded-xl border px-3 py-3 text-xs font-semibold uppercase tracking-[0.16em] transition hover:-translate-y-0.5 ${
                          isActive
                            ? 'border-[rgba(214,179,106,0.7)] text-[var(--accent)]'
                            : 'border-white/20 text-[var(--ink)] hover:border-white/40'
                        }`}
                        onClick={() => setAlignment(entry)}
                      >
                        {entry}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 4 && (
              <>
                <label className="mb-5 grid gap-2.5 text-center">
                  <span className="font-['Cinzel'] text-[1.5rem]">
                    What does your character look like?
                  </span>
                  <textarea
                    className="min-w-[min(520px,90vw)] resize-none border-0 bg-transparent px-0 py-3 text-center text-base text-[var(--ink)] focus:outline-none"
                    rows={4}
                    value={look}
                    onChange={(event) => setLook(event.target.value)}
                    maxLength={200}
                    required
                  />
                </label>
                <div className="mb-5 grid gap-2.5 text-center">
                  <span className="font-['Cinzel'] text-[1.5rem]">Gender</span>
                  <div className="mt-2 flex flex-wrap justify-center gap-3">
                    {['Male', 'Female', 'Custom'].map((option) => {
                      const isActive = gender === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          className={`rounded-full border bg-transparent px-5 py-2 text-sm font-semibold transition hover:-translate-y-0.5 ${
                            isActive
                              ? 'border-[rgba(214,179,106,0.7)] text-[var(--accent)]'
                              : 'border-white/20 text-[var(--ink)] hover:border-white/40'
                          }`}
                          onClick={() => setGender(option)}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  <div
                    className={`mt-3 overflow-hidden transition-[max-height,opacity] duration-300 ${
                      gender === 'Custom' ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <input
                      className="min-w-[min(520px,90vw)] border-0 bg-transparent px-0 py-3 text-center text-base text-[var(--ink)] focus:outline-none"
                      type="text"
                      value={genderCustom}
                      onChange={(event) => setGenderCustom(event.target.value)}
                      maxLength={24}
                      disabled={gender !== 'Custom'}
                      placeholder="Enter custom gender"
                    />
                  </div>
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <div className="mb-4 grid gap-2.5 text-center">
                  <span className="font-['Cinzel'] text-[1.5rem]">
                    What is your character's class?
                  </span>
                </div>
                <div className="grid gap-4 max-[800px]:grid-cols-1 min-[801px]:grid-cols-[minmax(560px,1.4fr)_minmax(420px,1fr)]">
                  <div className="grid gap-3 min-[801px]:grid-cols-2">
                    {classOptions.map((cls) => {
                      const isActive = selectedClass === cls.name;
                      return (
                        <button
                          key={cls.name}
                          type="button"
                          className={`rounded-[14px] border bg-white/5 p-3 text-left transition hover:-translate-y-0.5 ${
                            isActive
                              ? 'border-[rgba(214,179,106,0.6)] -translate-y-0.5'
                              : 'border-white/10'
                          }`}
                          onClick={() => setSelectedClass(cls.name)}
                        >
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="mb-0.5 font-['Cinzel'] text-[0.9rem] uppercase tracking-[0.04em]">
                              {cls.nickname ?? cls.name}
                            </div>
                            <div className="flex flex-wrap justify-end gap-1.5">
                              <span className="whitespace-nowrap rounded-full border border-[rgba(214,179,106,0.5)] px-2.5 py-1 text-[0.72rem] text-[var(--accent)]">
                                {cls.role ?? 'Class'}
                              </span>
                            </div>
                          </div>
                          <p className="m-0 text-[0.85rem] leading-tight text-[var(--soft)] line-clamp-2">
                            {cls.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  <div className="min-h-full rounded-2xl border border-white/10 bg-white/5 p-4">
                    {currentClassDetails ? (
                      <>
                        {selectedClass === CUSTOM_CLASS.name ? (
                          <div className="grid gap-3">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <h3 className="text-lg">{currentClassDetails.nickname ?? currentClassDetails.name}</h3>
                              <span className="whitespace-nowrap rounded-full border border-[rgba(214,179,106,0.5)] px-2.5 py-1 text-[0.72rem] text-[var(--accent)]">
                                {currentClassDetails.role ?? 'Class'}
                              </span>
                            </div>
                            <label className="mb-3.5 grid gap-2.5">
                              <span className="font-semibold">Nickname</span>
                              <input
                                className="rounded-xl border border-white/20 bg-[rgba(6,8,13,0.7)] px-3.5 py-3 text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none focus:ring-2 focus:ring-[rgba(214,179,106,0.4)]"
                                type="text"
                                value={customNickname}
                                onChange={(event) => setCustomNickname(event.target.value)}
                                maxLength={32}
                                placeholder="e.g., Silver Tongue"
                              />
                            </label>
                            <label className="mb-3.5 grid gap-2.5">
                              <span className="font-semibold">Class name</span>
                              <input
                                className="rounded-xl border border-white/20 bg-[rgba(6,8,13,0.7)] px-3.5 py-3 text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none focus:ring-2 focus:ring-[rgba(214,179,106,0.4)]"
                                type="text"
                                value={customClassName}
                                onChange={(event) => setCustomClassName(event.target.value)}
                                maxLength={32}
                                placeholder="e.g., Bard"
                              />
                            </label>
                            <label className="mb-3.5 grid gap-2.5">
                              <span className="font-semibold">Description</span>
                              <textarea
                                className="rounded-xl border border-white/20 bg-[rgba(6,8,13,0.7)] px-3.5 py-3 text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none focus:ring-2 focus:ring-[rgba(214,179,106,0.4)]"
                                rows={3}
                                value={customDescription}
                                onChange={(event) => setCustomDescription(event.target.value)}
                                maxLength={200}
                              />
                            </label>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-wrap items-center gap-2.5">
                              <h3 className="text-lg">{currentClassDetails.nickname ?? currentClassDetails.name}</h3>
                              <span className="whitespace-nowrap rounded-full border border-[rgba(214,179,106,0.5)] px-2.5 py-1 text-[0.72rem] text-[var(--accent)]">
                                {currentClassDetails.role ?? 'Class'}
                              </span>
                            </div>
                            <p className="m-0 text-sm text-[var(--soft)]">{currentClassDetails.description}</p>
                          </>
                        )}

                        <div className="mt-4 rounded-[14px] border border-white/10 bg-white/5 p-4">
                          <div className="mb-1.5 flex items-center justify-between gap-3">
                            <strong>Starting HP</strong>
                            <button
                              type="button"
                              className="rounded-full border border-white/20 bg-transparent px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-white/40"
                              onClick={rerollHp}
                            >
                              Reroll
                            </button>
                          </div>
                          <p className="m-0 text-lg">{rollingHp ? hpDisplay : currentClassDetails.hp}</p>
                        </div>

                        <div className="mt-1.5 grid gap-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <h4 className="text-sm">Ability Scores</h4>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5 ${
                                  abilityMethod === 'roll'
                                    ? 'border-[rgba(214,179,106,0.6)] text-[var(--accent)]'
                                    : 'border-white/20 text-[var(--ink)] hover:border-white/40'
                                }`}
                                onClick={() => setAbilityMethod('roll')}
                              >
                                Roll 4d6
                              </button>
                              <button
                                type="button"
                                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5 ${
                                  abilityMethod === 'standard'
                                    ? 'border-[rgba(214,179,106,0.6)] text-[var(--accent)]'
                                    : 'border-white/20 text-[var(--ink)] hover:border-white/40'
                                }`}
                                onClick={() => setAbilityMethod('standard')}
                              >
                                Standard Array
                              </button>
                              {abilityMethod === 'roll' && (
                                <button
                                  type="button"
                                  className="rounded-full border border-white/20 bg-transparent px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-white/40"
                                  onClick={rollAllAbilities}
                                >
                                  Roll all
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="grid gap-2">
                            {ABILITIES.map((ability) => {
                              const baseValue = baseAbilityScores[ability] ?? 0;
                              const boostValue = raceBoosts[ability] ?? 0;
                              const finalValue = finalAbilityScores[ability] ?? 0;
                              const mod = getAbilityModifier(finalValue);
                              const assigned = Object.entries(abilityScores)
                                .filter(([key]) => key !== ability)
                                .map(([, value]) => value)
                                .filter(Boolean);
                              const options = STANDARD_ARRAY.filter(
                                (value) => !assigned.includes(value) || value === abilityScores[ability]
                              );

                              return (
                                <div key={ability} className="flex items-center justify-between text-sm">
                                  <span>{ability}</span>
                                  <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-[var(--soft)]">
                                    {abilityMethod === 'standard' ? (
                                      <select
                                        className="rounded-full border border-white/20 bg-[rgba(6,8,13,0.7)] px-3 py-1 text-xs text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                                        value={abilityScores[ability] || ''}
                                        onChange={(event) => {
                                          const nextValue =
                                            event.target.value === '' ? 0 : Number(event.target.value);
                                          setAbilityScores((prev) => ({
                                            ...prev,
                                            [ability]: nextValue,
                                          }));
                                        }}
                                      >
                                        <option value="">--</option>
                                        {options.map((value) => (
                                          <option key={`${ability}-${value}`} value={value}>
                                            {value}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <span className="w-6 text-right text-[var(--ink)]">
                                        {baseValue || '--'}
                                      </span>
                                    )}
                                    {boostValue ? (
                                      <span className="text-[var(--accent)]">+{boostValue}</span>
                                    ) : null}
                                    <span className="text-[var(--ink)]">
                                      {finalValue || '--'} ({mod >= 0 ? `+${mod}` : mod})
                                    </span>
                                    {abilityMethod === 'roll' ? (
                                      <button
                                        type="button"
                                        className="rounded-full border border-white/20 bg-transparent px-2.5 py-1 text-[0.7rem] font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-white/40"
                                        onClick={() => rollSingleAbility(ability)}
                                      >
                                        Roll
                                      </button>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="mt-1.5 flex items-center justify-between gap-3">
                          <h4 className="text-sm">Starting Reputation</h4>
                          <button
                            type="button"
                            className="rounded-full border border-white/20 bg-transparent px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-white/40"
                            onClick={rollReputationSet}
                          >
                            Roll all
                          </button>
                        </div>
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-x-3 gap-y-2">
                          {REPUTATION.map((rep) => (
                            <div className="flex justify-between text-sm" key={rep}>
                              <span>{rep}</span>
                              <span style={getValueStyle(getRepValue(rep), 20)}>
                                {getRepValue(rep)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg">Class details</h3>
                        <p className="m-0 text-sm text-[var(--soft)]">
                          Select a class to see its description, HP, and reputation.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {step === 6 && (
              <label className="mb-5 grid gap-2.5 text-center">
                <span className="font-['Cinzel'] text-[1.5rem]">Tell us your backstory</span>
                <textarea
                  className="min-w-[min(520px,90vw)] resize-none border-0 bg-transparent px-0 py-3 text-center text-base text-[var(--ink)] focus:outline-none"
                  rows={5}
                  value={backstory}
                  onChange={(event) => setBackstory(event.target.value)}
                  required
                />
              </label>
            )}

            <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-between px-6">
              <button
                type="button"
                className="pointer-events-auto h-11 w-11 rounded-full border border-white/20 bg-[rgba(5,6,7,0.55)] text-lg font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-[rgba(214,179,106,0.8)] hover:shadow-[0_0_14px_rgba(214,179,106,0.35)] disabled:cursor-default disabled:opacity-40 disabled:shadow-none disabled:translate-y-0"
                onClick={prevStep}
                disabled={step === 1}
                aria-label="Previous step"
              >
                &lt;
              </button>
              <button
                type={step === TOTAL_STEPS ? 'submit' : 'button'}
                className="pointer-events-auto h-11 w-11 rounded-full border border-white/20 bg-[rgba(5,6,7,0.55)] text-lg font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-[rgba(214,179,106,0.8)] hover:shadow-[0_0_14px_rgba(214,179,106,0.35)] disabled:cursor-default disabled:opacity-40 disabled:shadow-none disabled:translate-y-0"
                onClick={step < TOTAL_STEPS ? nextStep : undefined}
                disabled={step === TOTAL_STEPS && saving}
                aria-label="Next step"
              >
                &gt;
              </button>
            </div>

            {step === TOTAL_STEPS && (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="submit"
                  className="rounded-full bg-[var(--accent)] px-4 py-2 font-semibold text-[#111] transition hover:-translate-y-0.5 disabled:cursor-default disabled:opacity-70"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Create Campaign'}
                </button>
              </div>
            )}
            {error && <p className="mt-3 text-center font-semibold text-[var(--danger)]">{error}</p>}

            <div className="fixed bottom-0 left-0 right-0 z-20 flex flex-wrap justify-center gap-4 border-t border-white/10 bg-[rgba(5,6,7,0.78)] px-[6vw] py-4 backdrop-blur">
              {['Name', 'Race', 'Alignment', 'Looks', 'Class', 'Backstory'].map((label, index) => {
                const stepNumber = index + 1;
                const isActive = step === stepNumber;
                const isCompleted = isStepComplete(stepNumber) && stepNumber !== step;
                const canJump = isActive || stepNumber <= maxCompletedStep;
                return (
                  <button
                    key={label}
                    type="button"
                    className={`group relative z-10 flex items-center gap-2 bg-transparent px-1.5 py-1 text-[0.85rem] tracking-[0.04em] transition ${
                      isActive || isCompleted ? 'text-[var(--accent)]' : 'text-[var(--soft)]'
                    } enabled:hover:text-[var(--accent)] disabled:cursor-default disabled:opacity-50`}
                    onClick={() => {
                      if (!canJump) return;
                      setError('');
                      setStep(stepNumber);
                    }}
                    disabled={!canJump}
                  >
                    <span
                      className={`grid h-[26px] w-[26px] place-items-center rounded-full border bg-[var(--bg)] text-xs font-semibold transition group-hover:border-[rgba(214,179,106,0.9)] group-hover:shadow-[0_0_12px_rgba(214,179,106,0.45)] ${
                        isActive
                          ? 'border-[rgba(214,179,106,0.7)] text-[var(--accent)]'
                          : isCompleted
                            ? 'border-[rgba(214,179,106,0.5)] text-[var(--accent)]'
                            : 'border-white/20'
                      }`}
                    >
                      {stepNumber}
                    </span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

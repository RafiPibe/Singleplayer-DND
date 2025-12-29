import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CLASSES,
  CUSTOM_CLASS,
  REPUTATION,
  STATS,
  HP_RANGE,
  buildStats,
} from '../data/classes.js';
import { supabase } from '../lib/supabase.js';
import { getValueStyle } from '../lib/valueStyle.js';

const TOTAL_STEPS = 4;
const rollDie = (sides) => Math.floor(Math.random() * sides) + 1;
const rollWithOpposedDice = (sides) => rollDie(sides) - rollDie(sides);
const rollInRange = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const rollHpValue = () => rollInRange(HP_RANGE.min, HP_RANGE.max);

export default function Create() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [look, setLook] = useState('');
  const [gender, setGender] = useState('Male');
  const [genderCustom, setGenderCustom] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [customNickname, setCustomNickname] = useState('');
  const [customClassName, setCustomClassName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customStats, setCustomStats] = useState(() => {
    const base = {};
    STATS.forEach((stat) => {
      base[stat] = 0;
    });
    return base;
  });
  const [classStats, setClassStats] = useState(() => ({}));
  const [customReputation, setCustomReputation] = useState(() => {
    const base = {};
    REPUTATION.forEach((rep) => {
      base[rep] = 0;
    });
    return base;
  });
  const [classReputation, setClassReputation] = useState(() => ({}));
  const [rolledHp, setRolledHp] = useState(() => rollHpValue());
  const [backstory, setBackstory] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const classOptions = useMemo(() => [...CLASSES, CUSTOM_CLASS], []);

  const getDisplayName = (cls) => {
    const nickname = cls.nickname ?? cls.name;
    const role = cls.role ?? 'Class';
    return `${nickname} (${role})`;
  };

  const rollStatValue = () => rollWithOpposedDice(6);
  const rollRepValue = () => rollWithOpposedDice(20);
  const rerollHp = () => setRolledHp(rollHpValue());

  const rollStatsSet = () => {
    const rolled = {};
    STATS.forEach((stat) => {
      rolled[stat] = rollStatValue();
    });
    return rolled;
  };

  const rollReputationSet = () => {
    const rolled = {};
    REPUTATION.forEach((rep) => {
      rolled[rep] = rollRepValue();
    });
    return rolled;
  };

  const rollAllStats = () => {
    setCustomStats(rollStatsSet());
  };

  const rollAllReputation = () => {
    setCustomReputation(rollReputationSet());
  };

  const rollClassReputation = () => {
    if (!selectedClass || selectedClass === CUSTOM_CLASS.name) return;
    setClassReputation((prev) => ({
      ...prev,
      [selectedClass]: rollReputationSet(),
    }));
  };

  const rollClassStats = () => {
    if (!selectedClass || selectedClass === CUSTOM_CLASS.name) return;
    setClassStats((prev) => ({
      ...prev,
      [selectedClass]: rollStatsSet(),
    }));
  };

  useEffect(() => {
    if (selectedClass === CUSTOM_CLASS.name) {
      setError('');
    }
  }, [selectedClass, customNickname, customClassName, customDescription]);

  useEffect(() => {
    if (selectedClass !== CUSTOM_CLASS.name) return;
    setCustomStats((prev) => {
      if (prev) return prev;
      const base = {};
      STATS.forEach((stat) => {
        base[stat] = 0;
      });
      return base;
    });
  }, [selectedClass]);

  useEffect(() => {
    if (!selectedClass) return;
    setRolledHp(rollHpValue());
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
        stats: customStats,
        reputation: customReputation,
      };
    }

    const selected = CLASSES.find((cls) => cls.name === selectedClass);
    if (!selected) return null;

    const reputation = classReputation[selected.name] ?? selected.reputation;

    const baseStats = buildStats(selected.strengths, selected.secondary, selected.weaknesses);
    const stats = classStats[selected.name] ?? baseStats;

    return {
      name: selected.name,
      nickname: selected.nickname ?? selected.name,
      role: selected.role ?? 'Class',
      displayName: getDisplayName(selected),
      description: selected.description,
      hp: rolledHp,
      stats,
      reputation,
    };
  }, [
    selectedClass,
    customNickname,
    customClassName,
    customDescription,
    customStats,
    customReputation,
    rolledHp,
    classReputation,
    classStats,
  ]);

  const validateStep = () => {
    if (step === 1 && name.trim().length < 2) {
      return 'Please enter a character name.';
    }
    if (step === 2) {
      if (look.trim().length < 10) {
        return 'Tell us a bit more about your character appearance.';
      }
      if (gender === 'Custom' && !genderCustom.trim()) {
        return 'Please enter a custom gender or pick Male/Female.';
      }
    }
    if (step === 3) {
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
    }
    if (step === 4 && backstory.trim().length < 20) {
      return 'Give a short backstory (20 characters or more).';
    }
    return '';
  };

  const isStepComplete = (stepNumber) => {
    if (stepNumber === 1) return name.trim().length >= 2;
    if (stepNumber === 2) {
      const hasLook = look.trim().length >= 10;
      const hasGender = gender === 'Custom' ? genderCustom.trim().length > 0 : true;
      return hasLook && hasGender;
    }
    if (stepNumber === 3) {
      if (!selectedClass) return false;
      if (selectedClass === CUSTOM_CLASS.name) {
        return (
          customNickname.trim().length >= 2 &&
          customClassName.trim().length >= 2 &&
          customDescription.trim().length >= 10
        );
      }
      return true;
    }
    if (stepNumber === 4) return backstory.trim().length >= 20;
    return false;
  };

  const maxCompletedStep = Math.max(
    0,
    ...[1, 2, 3, 4].filter((stepNumber) => isStepComplete(stepNumber))
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

    const payload = {
      name: name.trim(),
      look: look.trim(),
      gender: genderValue,
      class_name: currentClassDetails.displayName ?? currentClassDetails.name,
      class_description: currentClassDetails.description,
      stats: currentClassDetails.stats,
      reputation: currentClassDetails.reputation,
      hp: currentClassDetails.hp,
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
      if (step === 2 && !event.shiftKey) {
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

            {step === 3 && (
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
                            <div className="rounded-[14px] border border-white/10 bg-white/5 p-4">
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
                              <p className="m-0 text-lg">{currentClassDetails.hp}</p>
                            </div>
                            <div className="mt-1.5 flex items-center justify-between gap-3">
                              <h4 className="text-sm">Starting Stats</h4>
                              <button
                                type="button"
                                className="rounded-full border border-white/20 bg-transparent px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-white/40"
                                onClick={rollAllStats}
                              >
                                Roll all
                              </button>
                            </div>
                            <div className="grid grid-cols-1 gap-x-3 gap-y-2 min-[801px]:grid-cols-2">
                              {STATS.map((stat) => (
                                <div className="flex justify-between text-sm" key={stat}>
                                  <span>{stat}</span>
                                  <span style={getValueStyle(customStats[stat], 5)}>
                                    {customStats[stat]}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="mt-1.5 flex items-center justify-between gap-3">
                              <h4 className="text-sm">Starting Reputation</h4>
                              <button
                                type="button"
                                className="rounded-full border border-white/20 bg-transparent px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-white/40"
                                onClick={rollAllReputation}
                              >
                                Roll all
                              </button>
                            </div>
                            <div className="grid grid-cols-1 gap-x-3 gap-y-2 min-[801px]:grid-cols-2">
                              {REPUTATION.map((rep) => (
                                <div className="flex justify-between text-sm" key={rep}>
                                  <span>{rep}</span>
                                  <span style={getValueStyle(customReputation[rep], 20)}>
                                    {customReputation[rep]}
                                  </span>
                                </div>
                              ))}
                            </div>
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
                            <div className="rounded-[14px] border border-white/10 bg-white/5 p-4">
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
                              <p className="m-0 text-lg">{currentClassDetails.hp}</p>
                            </div>
                            <div className="mt-1.5 flex items-center justify-between gap-3">
                              <h4 className="text-sm">Starting Stats</h4>
                              <button
                                type="button"
                                className="rounded-full border border-white/20 bg-transparent px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-white/40"
                                onClick={rollClassStats}
                              >
                                Roll all
                              </button>
                            </div>
                            <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-x-3 gap-y-2">
                              {STATS.map((stat) => (
                                <div className="flex justify-between text-sm" key={stat}>
                                  <span>{stat}</span>
                                  <span style={getValueStyle(currentClassDetails.stats[stat], 5)}>
                                    {currentClassDetails.stats[stat]}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="mt-1.5 flex items-center justify-between gap-3">
                              <h4 className="text-sm">Starting Reputation</h4>
                              <button
                                type="button"
                                className="rounded-full border border-white/20 bg-transparent px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-white/40"
                                onClick={rollClassReputation}
                              >
                                Roll all
                              </button>
                            </div>
                            <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-x-3 gap-y-2">
                              {REPUTATION.map((rep) => (
                                <div className="flex justify-between text-sm" key={rep}>
                                  <span>{rep}</span>
                                  <span style={getValueStyle(currentClassDetails.reputation[rep], 20)}>
                                    {currentClassDetails.reputation[rep]}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg">Class details</h3>
                        <p className="m-0 text-sm text-[var(--soft)]">
                          Select a class to see its stats, HP, and reputation.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {step === 4 && (
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
              {['Name', 'Looks', 'Class', 'Backstory'].map((label, index) => {
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

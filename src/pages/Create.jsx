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
    if (event.target.tagName === 'TEXTAREA') return;
    event.preventDefault();
    if (step < TOTAL_STEPS) {
      nextStep();
    }
  };

  return (
    <div className="page">
      <div className="starfield" aria-hidden="true"></div>
      <div className="glow" aria-hidden="true"></div>

      <header className="page-topbar">
        <Link className="brand" to="/">Pibe's Tavern</Link>
      </header>

      <main className="content create-layout">
        <section className="builder create-panel">
          <div className="create-header" aria-hidden="true"></div>

          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
            {step === 1 && (
              <label className="field center-field">
                <span>What is your character name?</span>
                <input
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
                <label className="field center-field">
                  <span>What does your character look like?</span>
                  <textarea
                    rows={4}
                    value={look}
                    onChange={(event) => setLook(event.target.value)}
                    maxLength={200}
                    required
                  />
                </label>
                <div className="field center-field">
                  <span>Gender</span>
                  <div className="gender-buttons">
                    {['Male', 'Female', 'Custom'].map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`btn ghost ${gender === option ? 'active' : ''}`}
                        onClick={() => setGender(option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <div className={`gender-custom ${gender === 'Custom' ? 'open' : ''}`}>
                    <input
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
                <div className="field center-field">
                  <span>What is your character's class?</span>
                </div>
                <div className="class-layout">
                  <div className="class-grid">
                    {classOptions.map((cls) => (
                      <button
                        key={cls.name}
                        type="button"
                        className={`class-card ${selectedClass === cls.name ? 'active' : ''}`}
                        onClick={() => setSelectedClass(cls.name)}
                      >
                        <div className="class-card-header">
                          <div className="class-title">{cls.nickname ?? cls.name}</div>
                          <div className="class-pill-group">
                            <span className="class-pill role-pill">{cls.role ?? 'Class'}</span>
                          </div>
                        </div>
                        <p>{cls.description}</p>
                      </button>
                    ))}
                  </div>
                  <div className="class-details">
                    {currentClassDetails ? (
                      <>
                        {selectedClass === CUSTOM_CLASS.name ? (
                          <div className="custom-class-form">
                            <div className="class-details-header">
                              <h3>{currentClassDetails.nickname ?? currentClassDetails.name}</h3>
                              <span className="class-pill role-pill">
                                {currentClassDetails.role ?? 'Class'}
                              </span>
                            </div>
                            <label className="field">
                              <span>Nickname</span>
                              <input
                                type="text"
                                value={customNickname}
                                onChange={(event) => setCustomNickname(event.target.value)}
                                maxLength={32}
                                placeholder="e.g., Silver Tongue"
                              />
                            </label>
                            <label className="field">
                              <span>Class name</span>
                              <input
                                type="text"
                                value={customClassName}
                                onChange={(event) => setCustomClassName(event.target.value)}
                                maxLength={32}
                                placeholder="e.g., Bard"
                              />
                            </label>
                            <label className="field">
                              <span>Description</span>
                              <textarea
                                rows={3}
                                value={customDescription}
                                onChange={(event) => setCustomDescription(event.target.value)}
                                maxLength={200}
                              />
                            </label>
                            <div className="detail-card">
                              <div className="detail-card-header">
                                <strong>Starting HP</strong>
                                <button type="button" className="btn ghost" onClick={rerollHp}>
                                  Reroll
                                </button>
                              </div>
                              <p>{currentClassDetails.hp}</p>
                            </div>
                            <div className="custom-stats-header">
                              <h4>Starting Stats</h4>
                              <button type="button" className="btn ghost" onClick={rollAllStats}>
                                Roll all
                              </button>
                            </div>
                            <div className="stat-grid custom-stat-grid">
                              {STATS.map((stat) => (
                                <div className="stat" key={stat}>
                                  <span>{stat}</span>
                                  <span>{customStats[stat]}</span>
                                </div>
                              ))}
                            </div>
                            <div className="custom-stats-header">
                              <h4>Starting Reputation</h4>
                              <button type="button" className="btn ghost" onClick={rollAllReputation}>
                                Roll all
                              </button>
                            </div>
                            <div className="stat-grid custom-stat-grid">
                              {REPUTATION.map((rep) => (
                                <div className="stat" key={rep}>
                                  <span>{rep}</span>
                                  <span>{customReputation[rep]}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="class-details-header">
                              <h3>{currentClassDetails.nickname ?? currentClassDetails.name}</h3>
                              <span className="class-pill role-pill">
                                {currentClassDetails.role ?? 'Class'}
                              </span>
                            </div>
                            <p className="subtle">{currentClassDetails.description}</p>
                            <div className="detail-card">
                              <div className="detail-card-header">
                                <strong>Starting HP</strong>
                                <button type="button" className="btn ghost" onClick={rerollHp}>
                                  Reroll
                                </button>
                              </div>
                              <p>{currentClassDetails.hp}</p>
                            </div>
                            <div className="custom-stats-header">
                              <h4>Starting Stats</h4>
                              <button type="button" className="btn ghost" onClick={rollClassStats}>
                                Roll all
                              </button>
                            </div>
                            <div className="stat-grid">
                              {STATS.map((stat) => (
                                <div className="stat" key={stat}>
                                  <span>{stat}</span>
                                  <span>{currentClassDetails.stats[stat]}</span>
                                </div>
                              ))}
                            </div>
                            <div className="custom-stats-header">
                              <h4>Starting Reputation</h4>
                              <button
                                type="button"
                                className="btn ghost"
                                onClick={rollClassReputation}
                              >
                                Roll all
                              </button>
                            </div>
                            <div className="stat-grid">
                              {REPUTATION.map((rep) => (
                                <div className="stat" key={rep}>
                                  <span>{rep}</span>
                                  <span>{currentClassDetails.reputation[rep]}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <h3>Class details</h3>
                        <p className="subtle">Select a class to see its stats, HP, and reputation.</p>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {step === 4 && (
              <label className="field center-field">
                <span>Tell us your backstory</span>
                <textarea
                  rows={5}
                  value={backstory}
                  onChange={(event) => setBackstory(event.target.value)}
                  maxLength={500}
                  required
                />
              </label>
            )}

            <div className="chevron-nav">
              <button
                type="button"
                className="chevron-btn"
                onClick={prevStep}
                disabled={step === 1}
                aria-label="Previous step"
              >
                &lt;
              </button>
              <button
                type={step === TOTAL_STEPS ? 'submit' : 'button'}
                className="chevron-btn"
                onClick={step < TOTAL_STEPS ? nextStep : undefined}
                disabled={step === TOTAL_STEPS && saving}
                aria-label="Next step"
              >
                &gt;
              </button>
            </div>

            {step === TOTAL_STEPS && (
              <div className="builder-actions center-actions">
                <button type="submit" className="btn primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Create Campaign'}
                </button>
              </div>
            )}
            {error && <p className="error error-inline">{error}</p>}

            <div className="stepper">
              {['Name', 'Looks', 'Class', 'Backstory'].map((label, index) => {
                const stepNumber = index + 1;
                const isActive = step === stepNumber;
                const isCompleted = isStepComplete(stepNumber) && stepNumber !== step;
                const canJump = isActive || stepNumber <= maxCompletedStep;
                return (
                  <button
                    key={label}
                    type="button"
                    className={`stepper-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                    onClick={() => {
                      if (!canJump) return;
                      setError('');
                      setStep(stepNumber);
                    }}
                    disabled={!canJump}
                  >
                    <span className="stepper-circle">{stepNumber}</span>
                    <span className="stepper-label">{label}</span>
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

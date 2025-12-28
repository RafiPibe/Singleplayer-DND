import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CLASSES,
  CUSTOM_CLASS,
  REPUTATION,
  STATS,
  buildStats,
  classStatsFromDescription,
  defaultReputation,
} from '../data/classes.js';
import { supabase } from '../lib/supabase.js';

const TOTAL_STEPS = 4;

export default function Create() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [look, setLook] = useState('');
  const [gender, setGender] = useState('Male');
  const [genderCustom, setGenderCustom] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [customClassText, setCustomClassText] = useState('');
  const [backstory, setBackstory] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const classOptions = useMemo(() => [...CLASSES, CUSTOM_CLASS], []);

  useEffect(() => {
    if (selectedClass === CUSTOM_CLASS.name && customClassText.trim().length > 10) {
      setError('');
    }
  }, [selectedClass, customClassText]);

  const currentClassDetails = useMemo(() => {
    if (selectedClass === CUSTOM_CLASS.name) {
      const text = customClassText.trim();
      if (text.length >= 10) {
        const generated = classStatsFromDescription(text);
        return {
          name: CUSTOM_CLASS.name,
          description: text,
          hp: generated.hp,
          stats: generated.stats,
          reputation: generated.reputation,
        };
      }
      return {
        name: CUSTOM_CLASS.name,
        description: 'Describe your class to generate stats.',
        hp: CUSTOM_CLASS.hp,
        stats: buildStats(),
        reputation: defaultReputation(),
      };
    }

    const selected = CLASSES.find((cls) => cls.name === selectedClass);
    if (!selected) return null;

    return {
      name: selected.name,
      description: selected.description,
      hp: selected.hp,
      stats: buildStats(selected.strengths, selected.secondary, selected.weaknesses),
      reputation: selected.reputation,
    };
  }, [selectedClass, customClassText]);

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
      if (selectedClass === CUSTOM_CLASS.name && customClassText.trim().length < 10) {
        return 'Describe your custom class (at least 10 characters).';
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
      if (selectedClass === CUSTOM_CLASS.name) return customClassText.trim().length >= 10;
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
      class_name: currentClassDetails.name,
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
                          <div>
                            <div className="class-title">{cls.nickname ?? cls.name}</div>
                            <div className="class-role">{cls.role ?? 'Class'}</div>
                          </div>
                          <span className="class-pill">HP {cls.hp ?? '--'}</span>
                        </div>
                        <p>{cls.description}</p>
                      </button>
                    ))}
                  </div>
                  <div className="class-details">
                    {currentClassDetails ? (
                      <>
                        <h3>{currentClassDetails.name}</h3>
                        <p className="subtle">{currentClassDetails.description}</p>
                        <div className="detail-card">
                          <strong>Starting HP</strong>
                          <p>{currentClassDetails.hp}</p>
                        </div>
                        <h4>Starting Stats</h4>
                        <div className="stat-grid">
                          {STATS.map((stat) => (
                            <div className="stat" key={stat}>
                              <span>{stat}</span>
                              <span>{currentClassDetails.stats[stat]}</span>
                            </div>
                          ))}
                        </div>
                        <h4>Starting Reputation</h4>
                        <div className="stat-grid">
                          {REPUTATION.map((rep) => (
                            <div className="stat" key={rep}>
                              <span>{rep}</span>
                              <span>{currentClassDetails.reputation[rep]}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <h3>Class details</h3>
                        <p className="subtle">Select a class to see its stats, HP, and reputation.</p>
                      </>
                    )}
                  </div>
                </div>
                {selectedClass === CUSTOM_CLASS.name && (
                  <label className="field">
                    <span>Create your own class (200 character max)</span>
                    <textarea
                      rows={4}
                      value={customClassText}
                      onChange={(event) => setCustomClassText(event.target.value)}
                      maxLength={200}
                    />
                  </label>
                )}
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

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

  return (
    <div className="page">
      <div className="starfield" aria-hidden="true"></div>
      <div className="glow" aria-hidden="true"></div>

      <main className="content">
        <section className="panel builder">
          <div className="panel-header">
            <h2>New Campaign</h2>
            <span className="subtle">Step {step} of {TOTAL_STEPS}</span>
          </div>

          {error && <p className="error">{error}</p>}

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <label className="field">
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
                <label className="field">
                  <span>What does your character look like?</span>
                  <textarea
                    rows={4}
                    value={look}
                    onChange={(event) => setLook(event.target.value)}
                    maxLength={200}
                    required
                  />
                </label>
                <div className="field inline">
                  <label>
                    <span>Gender</span>
                    <select value={gender} onChange={(event) => setGender(event.target.value)}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </label>
                  <label>
                    <span>Custom gender</span>
                    <input
                      type="text"
                      value={genderCustom}
                      onChange={(event) => setGenderCustom(event.target.value)}
                      maxLength={24}
                      disabled={gender !== 'Custom'}
                      placeholder="Enter if custom"
                    />
                  </label>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="class-layout">
                  <div className="class-grid">
                    {classOptions.map((cls) => (
                      <button
                        key={cls.name}
                        type="button"
                        className={`class-card ${selectedClass === cls.name ? 'active' : ''}`}
                        onClick={() => setSelectedClass(cls.name)}
                      >
                        <h4>{cls.name}</h4>
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
              <label className="field">
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

            <div className="builder-actions">
              <button type="button" className="btn ghost" onClick={prevStep} disabled={step === 1}>
                Back
              </button>
              {step < TOTAL_STEPS && (
                <button type="button" className="btn ghost" onClick={nextStep}>
                  Next
                </button>
              )}
              {step === TOTAL_STEPS && (
                <button type="submit" className="btn primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Create Campaign'}
                </button>
              )}
              <button
                type="button"
                className="btn link"
                onClick={() => navigate('/')}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

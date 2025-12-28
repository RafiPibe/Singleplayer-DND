import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

export default function Campaign() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [rolls, setRolls] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCampaign = async () => {
      setLoading(true);
      setError('');

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
      }
      setLoading(false);
    };

    if (id) {
      loadCampaign();
    }
  }, [id]);

  const rollDice = (sides) => {
    const result = Math.floor(Math.random() * sides) + 1;
    const entry = {
      id: Date.now() + Math.random(),
      sides,
      result,
    };
    setRolls((prev) => [entry, ...prev]);
  };

  const statEntries = useMemo(() => {
    if (!campaign?.stats) return [];
    return Object.entries(campaign.stats);
  }, [campaign]);

  const repEntries = useMemo(() => {
    if (!campaign?.reputation) return [];
    return Object.entries(campaign.reputation);
  }, [campaign]);

  return (
    <div className="page">
      <div className="starfield" aria-hidden="true"></div>
      <div className="glow" aria-hidden="true"></div>

      <main className="content">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>{campaign?.name ?? 'Campaign'}</h2>
              <p className="subtle">{campaign?.class_name ?? 'Loading...'}</p>
            </div>
            <Link className="btn ghost" to="/">
              Back to ledger
            </Link>
          </div>

          {loading && <p className="subtle">Loading campaign...</p>}
          {error && <p className="error">{error}</p>}

          {campaign && (
            <div className="campaign-details">
              <div className="detail-card">
                <h3>Character</h3>
                <p><strong>Name:</strong> {campaign.name}</p>
                <p><strong>Gender:</strong> {campaign.gender}</p>
                <p><strong>Appearance:</strong> {campaign.look}</p>
              </div>
              <div className="detail-card">
                <h3>Class</h3>
                <p><strong>{campaign.class_name}</strong></p>
                <p>{campaign.class_description}</p>
                <p><strong>HP:</strong> {campaign.hp}</p>
              </div>
              <div className="detail-card">
                <h3>Backstory</h3>
                <p>{campaign.backstory}</p>
              </div>
              <div className="detail-card">
                <h3>Starting Stats</h3>
                <div className="stat-grid">
                  {statEntries.map(([stat, value]) => (
                    <div className="stat" key={stat}>
                      <span>{stat}</span>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="detail-card">
                <h3>Starting Reputation</h3>
                <div className="stat-grid">
                  {repEntries.map(([rep, value]) => (
                    <div className="stat" key={rep}>
                      <span>{rep}</span>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="panel dice-panel">
          <div className="dice-header">
            <h3>Dice Tray</h3>
            <button className="btn ghost" onClick={() => setRolls([])}>
              Clear
            </button>
          </div>
          <div className="dice-grid">
            {[4, 6, 8, 10, 12, 20, 100].map((sides) => (
              <button key={sides} className="dice" onClick={() => rollDice(sides)}>
                d{sides}
              </button>
            ))}
          </div>
          <div className="roll-log">
            {rolls.map((roll) => (
              <div className="roll" key={roll.id}>
                <span>d{roll.sides}</span>
                <span>{roll.result}</span>
              </div>
            ))}
            {rolls.length === 0 && (
              <p className="subtle">Roll a die to log results here.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

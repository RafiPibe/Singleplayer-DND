import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

export default function Home() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadCampaigns = async () => {
      setLoading(true);
      setError('');
      const { data, error: fetchError } = await supabase
        .from('campaigns')
        .select('*')
        .order('updated_at', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        setCampaigns([]);
      } else {
        setCampaigns(data ?? []);
      }
      setLoading(false);
    };

    loadCampaigns();
  }, []);

  return (
    <div className="page">
      <div className="starfield" aria-hidden="true"></div>
      <div className="glow" aria-hidden="true"></div>

      <header className="site-header">
        <p className="eyebrow">Singleplayer DnD</p>
        <h1>Welcome to the tavern, friend</h1>
        <p className="lede">
          Keep your stories alive, roll the dice, and step back into any campaign.
        </p>
        <div className="header-actions">
          <button className="btn primary" onClick={() => navigate('/create')}>
            Start a New Campaign
          </button>
          <Link className="btn ghost" to="/create">
            Character Creator
          </Link>
        </div>
      </header>

      <main className="content">
        <section className="panel">
          <div className="panel-header">
            <h2>Campaign Ledger</h2>
            <span className="subtle">{campaigns.length} saved campaigns</span>
          </div>

          {loading && <p className="subtle">Loading campaigns...</p>}
          {error && <p className="error">{error}</p>}

          <div className="campaign-grid">
            {campaigns.map((campaign) => (
              <article key={campaign.id} className="card">
                <div>
                  <h3>{campaign.name}</h3>
                  <p className="card-meta">
                    {campaign.class_name} • HP {campaign.hp}
                  </p>
                  <p className="card-meta">
                    Last played: {new Date(campaign.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="card-actions">
                  <Link className="btn primary" to={`/campaign/${campaign.id}`}>
                    Continue
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {!loading && campaigns.length === 0 && (
            <div className="empty-state">
              <p>No campaigns yet. Your story begins when you create one.</p>
            </div>
          )}
        </section>
      </main>

      <footer className="site-footer">
        <p>Stories are stored in Supabase.</p>
      </footer>
    </div>
  );
}

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
      if (!supabase) {
        setError('Missing Supabase configuration. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
        setLoading(false);
        return;
      }
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
    <div className="page home-page">
      <div className="starfield" aria-hidden="true"></div>
      <div className="glow" aria-hidden="true"></div>

      <header className="page-topbar">
        <Link className="brand" to="/">Pibe's Tavern</Link>
      </header>

      <main className="home-hero">
        <div className="hero-center">
          <p className="welcome">Welcome to the tavern, friend</p>
          <p className="lede">
            Your quests await. Create a new adventure or continue your journey.
          </p>
        </div>

        <section className="panel home-panel">
          <div className="panel-header">
            <div>
              <h2>Campaign Ledger</h2>
              <span className="subtle">{campaigns.length} saved campaigns</span>
            </div>
            <div className="header-actions">
              <button className="btn ghost" onClick={() => navigate('/create')}>
                New Campaign
              </button>
            </div>
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
    </div>
  );
}

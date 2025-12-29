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

      <main className="relative z-10 grid min-h-[75vh] place-items-center gap-7 px-[6vw] pb-10">
        <div className="grid gap-2.5 text-center">
          <p className="m-0 font-['Cinzel'] text-[clamp(1.6rem,2.4vw,2.6rem)] text-[var(--accent-2)]">
            Welcome to the tavern, friend
          </p>
          <p className="m-0 max-w-[520px] text-[var(--soft)]">
            Your quests await. Create a new adventure or continue your journey.
          </p>
        </div>

        <section className="w-[min(960px,90vw)] rounded-[20px] border border-white/10 bg-[linear-gradient(140deg,rgba(13,18,28,0.9),rgba(8,10,16,0.95))] p-6 shadow-[0_24px_60px_rgba(2,6,18,0.55)] backdrop-blur">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <h2 className="text-[clamp(1.4rem,2vw,2rem)]">Campaign Ledger</h2>
              <span className="text-sm text-[var(--soft)]">
                {campaigns.length} saved campaigns
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-full border border-white/15 bg-transparent px-4 py-2 text-[0.85rem] font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-white/30"
                onClick={() => navigate('/create')}
              >
                New Campaign
              </button>
            </div>
          </div>

          {loading && <p className="m-0 text-sm text-[var(--soft)]">Loading campaigns...</p>}
          {error && <p className="m-0 font-semibold text-[var(--danger)]">{error}</p>}

          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
            {campaigns.map((campaign) => (
              <article
                key={campaign.id}
                className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div>
                  <h3 className="text-lg">{campaign.name}</h3>
                  <p className="m-0 text-sm text-[var(--soft)]">
                    {campaign.class_name} • HP {campaign.hp}
                  </p>
                  <p className="m-0 text-sm text-[var(--soft)]">
                    Last played: {new Date(campaign.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <Link
                    className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-4 py-2 font-semibold text-[#111] transition hover:-translate-y-0.5"
                    to={`/campaign/${campaign.id}`}
                  >
                    Continue
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {!loading && campaigns.length === 0 && (
            <div className="py-4 text-[var(--soft)]">
              <p className="m-0">No campaigns yet. Your story begins when you create one.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

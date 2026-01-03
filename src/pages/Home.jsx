import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

export default function Home() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uidInput, setUidInput] = useState('');
  const [uidError, setUidError] = useState('');
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
        .select('id,name,class_name,level,level_xp,updated_at')
        .order('level', { ascending: false })
        .order('level_xp', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(12);

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

  const handleJoin = () => {
    const trimmed = uidInput.trim();
    if (!trimmed) {
      setUidError('Enter a campaign UID to continue.');
      return;
    }
    setUidError('');
    navigate(`/campaign/${trimmed}`);
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

      <main className="relative z-10 grid min-h-[75vh] place-items-center gap-7 px-[6vw] pb-10">
        <div className="grid gap-2.5 text-center">
          <p className="m-0 font-['Cinzel'] text-[clamp(1.6rem,2.4vw,2.6rem)] text-[var(--accent-2)]">
            Welcome to the tavern, friend
          </p>
          <p className="m-0 max-w-[520px] text-[var(--soft)]">
            Your Journey begins here. Create a new campaign or enter your UID to continue your story.
          </p>
        </div>

        <section className="w-[min(760px,90vw)] rounded-[20px] border border-white/10 bg-[linear-gradient(140deg,rgba(13,18,28,0.9),rgba(8,10,16,0.95))] p-6 shadow-[0_24px_60px_rgba(2,6,18,0.55)] backdrop-blur">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <h2 className="text-[clamp(1.4rem,2vw,2rem)]">Start your journey</h2>
              <span className="text-sm text-[var(--soft)]">
                Make a new campaign or enter your UID to rejoin your story.
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

          <div className="grid gap-3">
            <label className="grid gap-2 text-sm">
              <span className="uppercase tracking-[0.18em] text-[var(--soft)]">Campaign UID</span>
              <input
                className="rounded-2xl border border-white/15 bg-[rgba(6,8,13,0.7)] px-4 py-3 text-base text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none"
                value={uidInput}
                onChange={(event) => {
                  setUidInput(event.target.value);
                  if (uidError) setUidError('');
                }}
                placeholder="UID 808899375"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleJoin();
                  }
                }}
              />
            </label>
            {uidError ? <p className="m-0 text-sm text-[var(--danger)]">{uidError}</p> : null}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-4 py-2 font-semibold text-[#111] transition hover:-translate-y-0.5"
                onClick={handleJoin}
              >
                Enter Campaign
              </button>
              <button
                type="button"
                className="rounded-full border border-white/15 bg-transparent px-4 py-2 text-[0.85rem] font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-white/30"
                onClick={() => navigate('/create')}
              >
                Create New
              </button>
            </div>
          </div>
        </section>

        <section className="w-[min(960px,90vw)] rounded-[20px] border border-white/10 bg-[linear-gradient(140deg,rgba(13,18,28,0.9),rgba(8,10,16,0.95))] p-6 shadow-[0_24px_60px_rgba(2,6,18,0.55)] backdrop-blur">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <h2 className="text-[clamp(1.4rem,2vw,2rem)]">Leaderboard</h2>
              <span className="text-sm text-[var(--soft)]">
                Top {campaigns.length} highest-level campaigns
              </span>
            </div>
          </div>

          {loading && <p className="m-0 text-sm text-[var(--soft)]">Loading leaderboard...</p>}
          {error && <p className="m-0 font-semibold text-[var(--danger)]">{error}</p>}

          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
            {campaigns.map((campaign, index) => {
              const rankClass =
                index === 0
                  ? 'border-yellow-400/80 bg-yellow-300/15 ring-1 ring-yellow-400/40 shadow-[0_12px_30px_rgba(234,179,8,0.25)]'
                  : index === 1
                    ? 'border-slate-300/80 bg-slate-200/15 ring-1 ring-slate-200/40 shadow-[0_12px_30px_rgba(203,213,225,0.18)]'
                    : index === 2
                      ? 'border-orange-400/80 bg-orange-300/15 ring-1 ring-orange-300/40 shadow-[0_12px_30px_rgba(251,146,60,0.2)]'
                      : '';
              return (
                <article
                  key={campaign.id}
                  className={`grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 ${rankClass}`}
                >
                <div>
                  <p className="m-0 text-xs uppercase tracking-[0.2em] text-[var(--soft)]">
                    Rank #{index + 1}
                  </p>
                  <h3 className="text-lg">{campaign.name}</h3>
                  <p className="m-0 text-sm text-[var(--soft)]">
                    {campaign.class_name} • Lvl {campaign.level ?? 1} • XP {campaign.level_xp ?? 0}
                  </p>
                </div>
              </article>
              );
            })}
          </div>

          {!loading && campaigns.length === 0 && (
            <div className="py-4 text-[var(--soft)]">
              <p className="m-0">No campaigns yet. The leaderboard will fill as adventures begin.</p>
            </div>
          )}
        </section>
      </main>

    </div>
  );
}

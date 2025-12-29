import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { getValueStyle } from '../lib/valueStyle.js';

const SAMPLE_LOCATION = "Old Greg's Tavern | Upper tower room | Night";

const sampleMessages = (characterName) => [
  {
    id: 'dm-1',
    sender: 'Dungeon Master',
    location: SAMPLE_LOCATION,
    content:
      "The firelight dances across the table as the tavern hushes. A courier slides a sealed letter toward you, its wax stamped with a river crest.",
  },
  {
    id: 'dm-2',
    sender: 'Dungeon Master',
    location: SAMPLE_LOCATION,
    content:
      "Outside, thunder mutters over the city. The letter promises gold, answers, and a name you've never heard spoken aloud.",
  },
  {
    id: 'player-1',
    sender: characterName || 'You',
    location: SAMPLE_LOCATION,
    content: 'I break the seal and read it carefully, watching the room for anyone who flinches.',
  },
];

const sampleQuests = [
  {
    id: 'quest-1',
    title: 'The Witch-Marked Creator',
    status: 'Active',
    xp: 50,
    description: 'Track the artisan rumored to wield three schools of magic at once.',
  },
  {
    id: 'quest-2',
    title: 'River Crest Courier',
    status: 'Rumor',
    xp: 20,
    description: 'Follow the courier trail to the docks before the storm hits.',
  },
];

const sampleBounties = [
  {
    id: 'bounty-1',
    title: 'Crimson Wraith',
    reward: '120 gold',
    status: 'Open',
  },
];

const sampleInventory = [
  { id: 'inv-1', name: 'Iron Dagger', qty: 1, note: 'Dull but reliable.' },
  { id: 'inv-2', name: 'Travelers Cloak', qty: 1, note: 'Still smells like rain.' },
];

const sampleRelations = [
  { id: 'npc-1', name: 'Old Greg', status: 'Friendly', note: 'Owes you a favor.' },
  { id: 'npc-2', name: 'Courier Lysa', status: 'Unknown', note: 'River crest envoy.' },
];

export default function Campaign() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [questLog, setQuestLog] = useState([]);
  const [bounties, setBounties] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [journal, setJournal] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [questInput, setQuestInput] = useState('');
  const [inventoryInput, setInventoryInput] = useState('');
  const [journalInput, setJournalInput] = useState('');
  const [rolls, setRolls] = useState([]);

  useEffect(() => {
    const loadCampaign = async () => {
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
        .eq('id', id)
        .single();

      if (fetchError) {
        setError(fetchError.message);
        setCampaign(null);
      } else {
        setCampaign(data);
        setMessages(Array.isArray(data.messages) && data.messages.length ? data.messages : sampleMessages(data.name));
        setQuestLog(Array.isArray(data.quests) && data.quests.length ? data.quests : sampleQuests);
        setBounties(Array.isArray(data.bounties) && data.bounties.length ? data.bounties : sampleBounties);
        setInventory(Array.isArray(data.inventory) && data.inventory.length ? data.inventory : sampleInventory);
        setRelationships(
          Array.isArray(data.relationships) && data.relationships.length ? data.relationships : sampleRelations
        );
        setJournal(Array.isArray(data.journal) && data.journal.length ? data.journal : []);
      }
      setLoading(false);
    };

    if (id) {
      loadCampaign();
    }
  }, [id]);

  const savePatch = async (patch) => {
    if (!supabase || !campaign?.id) return;
    await supabase.from('campaigns').update(patch).eq('id', campaign.id);
  };

  const statEntries = useMemo(() => {
    if (!campaign?.stats) return [];
    return Object.entries(campaign.stats);
  }, [campaign]);

  const repEntries = useMemo(() => {
    if (!campaign?.reputation) return [];
    return Object.entries(campaign.reputation);
  }, [campaign]);

  const handleSendMessage = async (event) => {
    event.preventDefault();
    const text = messageInput.trim();
    if (!text) return;
    const entry = {
      id: `player-${Date.now()}`,
      sender: campaign?.name || 'You',
      location: SAMPLE_LOCATION,
      content: text,
    };
    const next = [...messages, entry];
    setMessages(next);
    setMessageInput('');
    await savePatch({ messages: next });
  };

  const handleAddQuest = async () => {
    const title = questInput.trim();
    if (!title) return;
    const entry = {
      id: `quest-${Date.now()}`,
      title,
      status: 'Active',
      xp: 25,
      description: 'New lead recorded in the quest log.',
    };
    const next = [entry, ...questLog];
    setQuestLog(next);
    setQuestInput('');
    await savePatch({ quests: next });
  };

  const handleAddInventory = async () => {
    const name = inventoryInput.trim();
    if (!name) return;
    const entry = {
      id: `inv-${Date.now()}`,
      name,
      qty: 1,
      note: 'Recently acquired.',
    };
    const next = [entry, ...inventory];
    setInventory(next);
    setInventoryInput('');
    await savePatch({ inventory: next });
  };

  const handleAddJournal = async () => {
    const text = journalInput.trim();
    if (!text) return;
    const entry = {
      id: `journal-${Date.now()}`,
      date: new Date().toLocaleDateString(),
      text,
    };
    const next = [entry, ...journal];
    setJournal(next);
    setJournalInput('');
    await savePatch({ journal: next });
  };

  const rollDice = (sides) => {
    const result = Math.floor(Math.random() * sides) + 1;
    const entry = { id: `roll-${Date.now()}-${sides}`, sides, result };
    setRolls((prev) => [entry, ...prev]);
  };

  return (
    <div className="relative min-h-screen">
      <div className="starfield" aria-hidden="true"></div>
      <div className="glow" aria-hidden="true"></div>

      <main className="relative z-10 grid gap-6 px-[5vw] pt-6 pb-12 max-[800px]:grid-cols-1 min-[801px]:grid-cols-[minmax(260px,320px)_minmax(320px,1fr)_minmax(240px,320px)]">
        <aside className="grid gap-[18px]">
          <div className="rounded-[20px] border border-white/10 bg-[linear-gradient(140deg,rgba(13,18,28,0.9),rgba(8,10,16,0.95))] p-[18px] shadow-[0_24px_60px_rgba(2,6,18,0.55)] backdrop-blur">
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <h2 className="text-[clamp(1.4rem,2vw,2rem)]">{campaign?.name ?? 'Campaign'}</h2>
                <p className="m-0 text-sm text-[var(--soft)]">
                  {campaign?.class_name ?? 'Loading...'}
                </p>
              </div>
              <Link
                className="rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-white/40"
                to="/"
              >
                Back
              </Link>
            </div>
            {loading && <p className="m-0 text-sm text-[var(--soft)]">Loading campaign...</p>}
            {error && <p className="m-0 font-semibold text-[var(--danger)]">{error}</p>}
          </div>

          <div className="rounded-[20px] border border-white/10 bg-[linear-gradient(140deg,rgba(13,18,28,0.9),rgba(8,10,16,0.95))] p-[18px] shadow-[0_24px_60px_rgba(2,6,18,0.55)] backdrop-blur">
            <h3 className="text-lg">Quest Log</h3>
            <div className="my-3 flex gap-2">
              <span className="rounded-full border border-[rgba(214,179,106,0.6)] px-2.5 py-1 text-xs text-[var(--accent)]">
                Quests ({questLog.length})
              </span>
              <span className="rounded-full border border-white/20 px-2.5 py-1 text-xs text-[var(--soft)]">
                Bounties ({bounties.length})
              </span>
            </div>
            <div className="grid gap-3">
              {questLog.map((quest) => (
                <div
                  key={quest.id}
                  className="grid gap-1.5 rounded-[14px] border border-white/10 bg-white/5 p-3"
                >
                  <div className="flex justify-between gap-2 font-semibold">
                    <span>{quest.title}</span>
                    <span className="rounded-full border border-[rgba(116,199,194,0.7)] px-2 py-0.5 text-xs text-[var(--accent-2)]">
                      {quest.status}
                    </span>
                  </div>
                  <p className="m-0 text-sm text-[var(--soft)]">{quest.description}</p>
                  <span className="text-sm font-semibold text-[var(--accent)]">{quest.xp} XP</span>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2.5">
              <input
                className="rounded-xl border border-white/15 bg-[rgba(6,8,13,0.7)] px-3.5 py-3 text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none focus:ring-2 focus:ring-[rgba(214,179,106,0.4)]"
                type="text"
                value={questInput}
                onChange={(event) => setQuestInput(event.target.value)}
                placeholder="Add a new quest..."
              />
              <button
                className="rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-white/40"
                type="button"
                onClick={handleAddQuest}
              >
                Add
              </button>
            </div>
          </div>

          <div className="rounded-[20px] border border-white/10 bg-[linear-gradient(140deg,rgba(13,18,28,0.9),rgba(8,10,16,0.95))] p-[18px] shadow-[0_24px_60px_rgba(2,6,18,0.55)] backdrop-blur">
            <h3 className="text-lg">Bounties</h3>
            <div className="grid gap-3">
              {bounties.map((bounty) => (
                <div
                  key={bounty.id}
                  className="grid gap-1.5 rounded-[14px] border border-white/10 bg-white/5 p-3"
                >
                  <div className="flex justify-between gap-2 font-semibold">
                    <span>{bounty.title}</span>
                    <span className="rounded-full border border-[rgba(116,199,194,0.7)] px-2 py-0.5 text-xs text-[var(--accent-2)]">
                      {bounty.status}
                    </span>
                  </div>
                  <p className="m-0 text-sm text-[var(--soft)]">Reward: {bounty.reward}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[20px] border border-white/10 bg-[linear-gradient(140deg,rgba(13,18,28,0.9),rgba(8,10,16,0.95))] p-[18px] shadow-[0_24px_60px_rgba(2,6,18,0.55)] backdrop-blur">
            <h3 className="text-lg">Inventory</h3>
            <div className="grid gap-3">
              {inventory.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-1.5 rounded-[14px] border border-white/10 bg-white/5 p-3"
                >
                  <div className="flex justify-between gap-2 font-semibold">
                    <span>
                      {item.name} x{item.qty}
                    </span>
                  </div>
                  <p className="m-0 text-sm text-[var(--soft)]">{item.note}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2.5">
              <input
                className="rounded-xl border border-white/15 bg-[rgba(6,8,13,0.7)] px-3.5 py-3 text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none focus:ring-2 focus:ring-[rgba(214,179,106,0.4)]"
                type="text"
                value={inventoryInput}
                onChange={(event) => setInventoryInput(event.target.value)}
                placeholder="Add inventory item..."
              />
              <button
                className="rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-white/40"
                type="button"
                onClick={handleAddInventory}
              >
                Add
              </button>
            </div>
          </div>

          <div className="rounded-[20px] border border-white/10 bg-[linear-gradient(140deg,rgba(13,18,28,0.9),rgba(8,10,16,0.95))] p-[18px] shadow-[0_24px_60px_rgba(2,6,18,0.55)] backdrop-blur">
            <h3 className="text-lg">NPC Relationships</h3>
            <div className="grid gap-3">
              {relationships.map((npc) => (
                <div
                  key={npc.id}
                  className="grid gap-1.5 rounded-[14px] border border-white/10 bg-white/5 p-3"
                >
                  <div className="flex justify-between gap-2 font-semibold">
                    <span>{npc.name}</span>
                    <span className="rounded-full border border-[rgba(116,199,194,0.7)] px-2 py-0.5 text-xs text-[var(--accent-2)]">
                      {npc.status}
                    </span>
                  </div>
                  <p className="m-0 text-sm text-[var(--soft)]">{npc.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[20px] border border-white/10 bg-[linear-gradient(140deg,rgba(13,18,28,0.9),rgba(8,10,16,0.95))] p-[18px] shadow-[0_24px_60px_rgba(2,6,18,0.55)] backdrop-blur">
            <h3 className="text-lg">Stats</h3>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-x-3 gap-y-2">
              {statEntries.map(([stat, value]) => (
                <div className="flex justify-between text-sm" key={stat}>
                  <span>{stat}</span>
                  <span style={getValueStyle(value, 5)}>{value}</span>
                </div>
              ))}
            </div>
            <h4 className="mt-4 mb-2.5 text-sm">Reputation</h4>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-x-3 gap-y-2">
              {repEntries.map(([rep, value]) => (
                <div className="flex justify-between text-sm" key={rep}>
                  <span>{rep}</span>
                  <span style={getValueStyle(value, 20)}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="grid min-h-[70vh] grid-rows-[auto_1fr_auto] gap-4">
          <header className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-[clamp(1.4rem,2vw,2rem)]">Campaign Narration</h2>
              <p className="m-0 text-sm text-[var(--soft)]">
                {campaign?.name ? `Now playing | ${campaign.name}` : 'Awaiting adventurer'}
              </p>
            </div>
            <div className="rounded-full border border-[rgba(214,179,106,0.6)] px-3 py-1 text-[0.75rem] uppercase tracking-[0.12em]">
              Live Session
            </div>
          </header>

          <div className="grid max-h-[70vh] gap-3 overflow-y-auto rounded-2xl border border-white/10 bg-[rgba(7,9,14,0.7)] p-4">
            {messages.map((message) => (
              <div key={message.id} className="grid gap-2 rounded-2xl bg-white/5 p-4">
                <div className="grid gap-1">
                  <span className="font-bold tracking-[0.02em] text-[var(--accent)]">
                    {message.sender}
                  </span>
                  <span className="text-sm text-[var(--soft)]">{message.location}</span>
                </div>
                <p className="m-0">{message.content}</p>
              </div>
            ))}
          </div>

          <form className="grid grid-cols-[1fr_auto] items-center gap-3" onSubmit={handleSendMessage}>
            <input
              className="rounded-xl border border-white/15 bg-[rgba(6,8,13,0.7)] px-3.5 py-3 text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none focus:ring-2 focus:ring-[rgba(214,179,106,0.4)]"
              type="text"
              value={messageInput}
              onChange={(event) => setMessageInput(event.target.value)}
              placeholder="Describe your next move..."
            />
            <button
              className="rounded-full bg-[var(--accent)] px-4 py-2 font-semibold text-[#111] transition hover:-translate-y-0.5"
              type="submit"
            >
              Send
            </button>
          </form>
        </section>

        <aside className="grid gap-[18px]">
          <div className="rounded-[20px] border border-white/10 bg-[linear-gradient(140deg,rgba(13,18,28,0.9),rgba(8,10,16,0.95))] p-6 shadow-[0_24px_60px_rgba(2,6,18,0.55)] backdrop-blur">
            <h3 className="text-lg">Character Card</h3>
            {campaign ? (
              <div className="grid gap-3">
                <p className="m-0 text-sm text-[var(--soft)]">{campaign.class_name}</p>
                <p className="m-0">
                  <strong>HP:</strong> {campaign.hp}
                </p>
                <p className="m-0">
                  <strong>Backstory:</strong> {campaign.backstory}
                </p>
              </div>
            ) : (
              <p className="m-0 text-sm text-[var(--soft)]">Loading character...</p>
            )}
          </div>

          <div className="rounded-[20px] border border-white/10 bg-[linear-gradient(140deg,rgba(13,18,28,0.9),rgba(8,10,16,0.95))] p-6 shadow-[0_24px_60px_rgba(2,6,18,0.55)] backdrop-blur">
            <h3 className="text-lg">Journal</h3>
            <div className="grid gap-3">
              {journal.length === 0 && (
                <p className="m-0 text-sm text-[var(--soft)]">No journal entries yet.</p>
              )}
              {journal.map((entry) => (
                <div
                  key={entry.id}
                  className="grid gap-1.5 rounded-[14px] border border-white/10 bg-white/5 p-3"
                >
                  <div className="flex justify-between gap-2 font-semibold">
                    <span>{entry.date}</span>
                  </div>
                  <p className="m-0 text-sm text-[var(--soft)]">{entry.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2.5">
              <input
                className="rounded-xl border border-white/15 bg-[rgba(6,8,13,0.7)] px-3.5 py-3 text-[var(--ink)] focus:border-[rgba(214,179,106,0.6)] focus:outline-none focus:ring-2 focus:ring-[rgba(214,179,106,0.4)]"
                type="text"
                value={journalInput}
                onChange={(event) => setJournalInput(event.target.value)}
                placeholder="Add journal entry..."
              />
              <button
                className="rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-white/40"
                type="button"
                onClick={handleAddJournal}
              >
                Add
              </button>
            </div>
          </div>

          <div className="rounded-[20px] border border-white/10 bg-[linear-gradient(140deg,rgba(13,18,28,0.9),rgba(8,10,16,0.95))] p-6 shadow-[0_24px_60px_rgba(2,6,18,0.55)] backdrop-blur">
            <h3 className="text-lg">Dice Tray</h3>
            <div className="my-4 grid grid-cols-[repeat(auto-fit,minmax(90px,1fr))] gap-2.5">
              {[4, 6, 8, 10, 12, 20, 100].map((sides) => (
                <button
                  key={sides}
                  className="rounded-xl border border-white/20 bg-white/10 p-3 font-bold text-[var(--ink)] transition hover:-translate-y-0.5"
                  onClick={() => rollDice(sides)}
                  type="button"
                >
                  d{sides}
                </button>
              ))}
            </div>
            <div className="grid max-h-[200px] gap-2 overflow-y-auto pr-2">
              {rolls.map((roll) => (
                <div className="flex justify-between rounded-xl bg-white/5 px-3 py-2 text-sm" key={roll.id}>
                  <span>d{roll.sides}</span>
                  <span>{roll.result}</span>
                </div>
              ))}
              {rolls.length === 0 && (
                <p className="m-0 text-sm text-[var(--soft)]">Roll a die to log results here.</p>
              )}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

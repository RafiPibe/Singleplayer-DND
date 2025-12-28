import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

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
    <div className="page">
      <div className="starfield" aria-hidden="true"></div>
      <div className="glow" aria-hidden="true"></div>

      <main className="campaign-shell">
        <aside className="sidebar">
          <div className="panel panel-tight">
            <div className="panel-header">
              <div>
                <h2>{campaign?.name ?? 'Campaign'}</h2>
                <p className="subtle">{campaign?.class_name ?? 'Loading...'}</p>
              </div>
              <Link className="btn ghost" to="/">
                Back
              </Link>
            </div>
            {loading && <p className="subtle">Loading campaign...</p>}
            {error && <p className="error">{error}</p>}
          </div>

          <div className="panel panel-tight">
            <h3>Quest Log</h3>
            <div className="tag-row">
              <span className="tag active">Quests ({questLog.length})</span>
              <span className="tag">Bounties ({bounties.length})</span>
            </div>
            <div className="stack">
              {questLog.map((quest) => (
                <div key={quest.id} className="mini-card">
                  <div className="mini-title">
                    <span>{quest.title}</span>
                    <span className="pill">{quest.status}</span>
                  </div>
                  <p className="subtle">{quest.description}</p>
                  <span className="xp">{quest.xp} XP</span>
                </div>
              ))}
            </div>
            <div className="input-row">
              <input
                type="text"
                value={questInput}
                onChange={(event) => setQuestInput(event.target.value)}
                placeholder="Add a new quest..."
              />
              <button className="btn ghost" type="button" onClick={handleAddQuest}>
                Add
              </button>
            </div>
          </div>

          <div className="panel panel-tight">
            <h3>Bounties</h3>
            <div className="stack">
              {bounties.map((bounty) => (
                <div key={bounty.id} className="mini-card">
                  <div className="mini-title">
                    <span>{bounty.title}</span>
                    <span className="pill">{bounty.status}</span>
                  </div>
                  <p className="subtle">Reward: {bounty.reward}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel panel-tight">
            <h3>Inventory</h3>
            <div className="stack">
              {inventory.map((item) => (
                <div key={item.id} className="mini-card">
                  <div className="mini-title">
                    <span>
                      {item.name} x{item.qty}
                    </span>
                  </div>
                  <p className="subtle">{item.note}</p>
                </div>
              ))}
            </div>
            <div className="input-row">
              <input
                type="text"
                value={inventoryInput}
                onChange={(event) => setInventoryInput(event.target.value)}
                placeholder="Add inventory item..."
              />
              <button className="btn ghost" type="button" onClick={handleAddInventory}>
                Add
              </button>
            </div>
          </div>

          <div className="panel panel-tight">
            <h3>NPC Relationships</h3>
            <div className="stack">
              {relationships.map((npc) => (
                <div key={npc.id} className="mini-card">
                  <div className="mini-title">
                    <span>{npc.name}</span>
                    <span className="pill">{npc.status}</span>
                  </div>
                  <p className="subtle">{npc.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel panel-tight">
            <h3>Stats</h3>
            <div className="stat-grid">
              {statEntries.map(([stat, value]) => (
                <div className="stat" key={stat}>
                  <span>{stat}</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
            <h4 className="section-title">Reputation</h4>
            <div className="stat-grid">
              {repEntries.map(([rep, value]) => (
                <div className="stat" key={rep}>
                  <span>{rep}</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="chat-panel">
          <header className="chat-header">
            <div>
              <h2>Campaign Narration</h2>
              <p className="subtle">{campaign?.name ? `Now playing | ${campaign.name}` : 'Awaiting adventurer'}</p>
            </div>
            <div className="status-pill">Live Session</div>
          </header>

          <div className="chat-body">
            {messages.map((message) => (
              <div key={message.id} className="chat-message">
                <div className="message-meta">
                  <span className="name-highlight">{message.sender}</span>
                  <span className="location">{message.location}</span>
                </div>
                <p>{message.content}</p>
              </div>
            ))}
          </div>

          <form className="chat-input" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={messageInput}
              onChange={(event) => setMessageInput(event.target.value)}
              placeholder="Describe your next move..."
            />
            <button className="btn primary" type="submit">
              Send
            </button>
          </form>
        </section>

        <aside className="support-panel">
          <div className="panel">
            <h3>Character Card</h3>
            {campaign ? (
              <div className="stack">
                <p className="subtle">{campaign.class_name}</p>
                <p><strong>HP:</strong> {campaign.hp}</p>
                <p><strong>Backstory:</strong> {campaign.backstory}</p>
              </div>
            ) : (
              <p className="subtle">Loading character...</p>
            )}
          </div>

          <div className="panel">
            <h3>Journal</h3>
            <div className="stack">
              {journal.length === 0 && <p className="subtle">No journal entries yet.</p>}
              {journal.map((entry) => (
                <div key={entry.id} className="mini-card">
                  <div className="mini-title">
                    <span>{entry.date}</span>
                  </div>
                  <p className="subtle">{entry.text}</p>
                </div>
              ))}
            </div>
            <div className="input-row">
              <input
                type="text"
                value={journalInput}
                onChange={(event) => setJournalInput(event.target.value)}
                placeholder="Add journal entry..."
              />
              <button className="btn ghost" type="button" onClick={handleAddJournal}>
                Add
              </button>
            </div>
          </div>

          <div className="panel">
            <h3>Dice Tray</h3>
            <div className="dice-grid">
              {[4, 6, 8, 10, 12, 20, 100].map((sides) => (
                <button key={sides} className="dice" onClick={() => rollDice(sides)} type="button">
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
              {rolls.length === 0 && <p className="subtle">Roll a die to log results here.</p>}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

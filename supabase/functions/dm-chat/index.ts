import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";
const DEFAULT_LOCATION = "Old Greg's Tavern | Upper tower room | Night";

const ensureArray = (value: unknown) => (Array.isArray(value) ? value : []);
const ensureObject = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const asNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

const stripHtml = (value: unknown) => {
  if (!value) return "";
  return String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
};

const normalizeInventory = (value: unknown) => {
  const base = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const summary = ensureObject((base as any).summary);
  const equipped = ensureObject((base as any).equipped);
  const sections = ensureObject((base as any).sections);

  return {
    summary: {
      crowns: asNumber((summary as any).crowns),
      ac: asNumber((summary as any).ac),
      damage: (summary as any).damage ?? "",
      weaponType: (summary as any).weaponType ?? "",
    },
    equipped: {
      weapons: Array.isArray((equipped as any).weapons)
        ? [...(equipped as any).weapons, null, null].slice(0, 2)
        : [null, null],
      armor: {
        Head: (equipped as any)?.armor?.Head ?? null,
        Body: (equipped as any)?.armor?.Body ?? null,
        Arms: (equipped as any)?.armor?.Arms ?? null,
        Leggings: (equipped as any)?.armor?.Leggings ?? null,
        Cloak: (equipped as any)?.armor?.Cloak ?? null,
      },
    },
    sections: {
      weapons: ensureArray((sections as any).weapons),
      armor: ensureArray((sections as any).armor),
      consumables: ensureArray((sections as any).consumables),
      misc: ensureArray((sections as any).misc),
    },
  };
};

const updateListItem = <T extends { id?: string }>(
  list: T[],
  match: { id?: string; name?: string; title?: string },
  patch: Partial<T>
) => {
  return list.map((item) => {
    const isMatch =
      (match.id && item.id === match.id) ||
      (match.name && (item as any).name === match.name) ||
      (match.title && (item as any).title === match.title);
    return isMatch ? { ...item, ...patch } : item;
  });
};

const tools = [
  {
    type: "function",
    function: {
      name: "add_quest",
      description: "Add a quest to the quest log.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          status: { type: "string" },
          xp: { type: "number" },
        },
        required: ["title", "description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_quest",
      description: "Update a quest by id or title.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          patch: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              status: { type: "string" },
              xp: { type: "number" },
            },
          },
        },
        required: ["patch"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_bounty",
      description: "Add a bounty to the bounty board.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          reward: { type: "string" },
          status: { type: "string" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_bounty",
      description: "Update a bounty by id or title.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          patch: {
            type: "object",
            properties: {
              title: { type: "string" },
              reward: { type: "string" },
              status: { type: "string" },
            },
          },
        },
        required: ["patch"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_rumor",
      description: "Add a rumor to the rumor board.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          level: { type: "number" },
          xp: { type: "number" },
          notes: { type: "array", items: { type: "string" } },
        },
        required: ["title", "summary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_rumor",
      description: "Update a rumor by id or title.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          patch: {
            type: "object",
            properties: {
              title: { type: "string" },
              summary: { type: "string" },
              level: { type: "number" },
              xp: { type: "number" },
              notes: { type: "array", items: { type: "string" } },
            },
          },
        },
        required: ["patch"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_reputation",
      description: "Adjust reputation values by delta.",
      parameters: {
        type: "object",
        properties: {
          changes: { type: "object", additionalProperties: { type: "number" } },
        },
        required: ["changes"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "adjust_xp",
      description: "Adjust player XP (level_xp) by amount.",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number" },
          set: { type: "number" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "adjust_hp",
      description: "Adjust current HP by amount.",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number" },
          set: { type: "number" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_journal_entry",
      description: "Add a journal entry.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          category: { type: "string" },
          content: { type: "string" },
        },
        required: ["title", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_journal_entry",
      description: "Update a journal entry by id or title.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          patch: {
            type: "object",
            properties: {
              title: { type: "string" },
              category: { type: "string" },
              content: { type: "string" },
            },
          },
        },
        required: ["patch"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_npc",
      description: "Add an NPC.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          role: { type: "string" },
          summary: { type: "string" },
          lastSeen: { type: "string" },
          reputation: { type: "number" },
          feeling: { type: "string" },
        },
        required: ["name", "summary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_npc",
      description: "Update an NPC by id or name.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          patch: {
            type: "object",
            properties: {
              name: { type: "string" },
              role: { type: "string" },
              summary: { type: "string" },
              lastSeen: { type: "string" },
              reputation: { type: "number" },
              feeling: { type: "string" },
            },
          },
        },
        required: ["patch"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_ossuary_item",
      description: "Add an ossuary item drop.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          type: { type: "string" },
          rarity: { type: "string" },
          description: { type: "string" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_spell",
      description: "Add a spell to the spellbook.",
      parameters: {
        type: "object",
        properties: {
          categoryId: { type: "string" },
          categoryLabel: { type: "string" },
          spell: {
            type: "object",
            properties: {
              name: { type: "string" },
              level: { type: "number" },
              description: { type: "string" },
              roll: { type: "string" },
            },
            required: ["name", "description"],
          },
        },
        required: ["spell"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_inventory_item",
      description: "Add an item to inventory sections (weapons, armor, consumables, misc).",
      parameters: {
        type: "object",
        properties: {
          section: { type: "string" },
          item: { type: "object" },
        },
        required: ["section", "item"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consume_inventory_item",
      description: "Consume or remove an inventory item by id or name.",
      parameters: {
        type: "object",
        properties: {
          section: { type: "string" },
          id: { type: "string" },
          name: { type: "string" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "record_saving_throw",
      description: "Record the latest saving throw roll for an ability.",
      parameters: {
        type: "object",
        properties: {
          ability: { type: "string" },
          roll: { type: "number" },
        },
        required: ["ability", "roll"],
      },
    },
  },
];

const applyToolCalls = (campaign: any, toolCalls: any[]) => {
  let next = { ...campaign };

  const handlers: Record<string, (args: any) => void> = {
    add_quest: (args) => {
      const quests = ensureArray(next.quests);
      quests.push({
        id: makeId("quest"),
        title: args.title ?? "Untitled Quest",
        description: args.description ?? "",
        status: args.status ?? "Active",
        xp: asNumber(args.xp),
      });
      next.quests = quests;
    },
    update_quest: (args) => {
      const quests = ensureArray(next.quests);
      next.quests = updateListItem(quests, { id: args.id, title: args.title }, args.patch ?? {});
    },
    add_bounty: (args) => {
      const bounties = ensureArray(next.bounties);
      bounties.push({
        id: makeId("bounty"),
        title: args.title ?? "Untitled Bounty",
        reward: args.reward ?? "",
        status: args.status ?? "Open",
      });
      next.bounties = bounties;
    },
    update_bounty: (args) => {
      const bounties = ensureArray(next.bounties);
      next.bounties = updateListItem(bounties, { id: args.id, title: args.title }, args.patch ?? {});
    },
    add_rumor: (args) => {
      const rumors = ensureArray(next.rumors);
      rumors.push({
        id: makeId("rumor"),
        title: args.title ?? "Untitled Rumor",
        summary: args.summary ?? "",
        level: asNumber(args.level, 1),
        xp: asNumber(args.xp),
        notes: ensureArray(args.notes),
      });
      next.rumors = rumors;
    },
    update_rumor: (args) => {
      const rumors = ensureArray(next.rumors);
      next.rumors = updateListItem(rumors, { id: args.id, title: args.title }, args.patch ?? {});
    },
    update_reputation: (args) => {
      const rep = { ...ensureObject(next.reputation) } as Record<string, number>;
      const changes = ensureObject(args.changes) as Record<string, number>;
      Object.entries(changes).forEach(([key, delta]) => {
        const current = asNumber(rep[key]);
        const nextValue = clamp(current + asNumber(delta), -20, 20);
        rep[key] = nextValue;
      });
      next.reputation = rep;
    },
    adjust_xp: (args) => {
      const current = asNumber(next.level_xp);
      const setValue = Number.isFinite(args.set) ? Number(args.set) : null;
      next.level_xp = setValue === null ? current + asNumber(args.amount) : setValue;
    },
    adjust_hp: (args) => {
      const current = asNumber(next.hp_current);
      const maxHp = Math.max(1, asNumber(next.hp, 20));
      const setValue = Number.isFinite(args.set) ? Number(args.set) : null;
      const nextValue = setValue === null ? current + asNumber(args.amount) : setValue;
      next.hp_current = clamp(nextValue, 0, maxHp);
    },
    add_journal_entry: (args) => {
      const journal = ensureArray(next.journal);
      journal.unshift({
        id: makeId("journal"),
        title: args.title ?? "Untitled Note",
        category: args.category ?? "Personal",
        content: args.content ?? "",
        createdAt: new Date().toISOString(),
      });
      next.journal = journal;
    },
    update_journal_entry: (args) => {
      const journal = ensureArray(next.journal);
      next.journal = updateListItem(journal, { id: args.id, title: args.title }, args.patch ?? {});
    },
    add_npc: (args) => {
      const npcs = ensureArray(next.npcs);
      npcs.push({
        id: makeId("npc"),
        name: args.name ?? "Unknown",
        role: args.role ?? "",
        summary: args.summary ?? "",
        lastSeen: args.lastSeen ?? "",
        reputation: asNumber(args.reputation),
        feeling: args.feeling ?? "",
      });
      next.npcs = npcs;
    },
    update_npc: (args) => {
      const npcs = ensureArray(next.npcs);
      next.npcs = updateListItem(npcs, { id: args.id, name: args.name }, args.patch ?? {});
    },
    add_ossuary_item: (args) => {
      const ossuary = ensureArray(next.ossuary);
      ossuary.push({
        id: makeId("ossuary"),
        name: args.name ?? "Unnamed Item",
        type: args.type ?? "",
        rarity: args.rarity ?? "",
        description: args.description ?? "",
      });
      next.ossuary = ossuary;
    },
    add_spell: (args) => {
      const spellbook = ensureArray(next.spellbook);
      const categoryId = args.categoryId ?? null;
      const categoryLabel = args.categoryLabel ?? "Spells";
      const spell = args.spell ?? {};
      let category = spellbook.find((entry: any) =>
        categoryId ? entry.id === categoryId : entry.label === categoryLabel
      );
      if (!category) {
        category = { id: categoryId ?? makeId("spell"), label: categoryLabel, spells: [] };
        spellbook.push(category);
      }
      category.spells = ensureArray(category.spells);
      category.spells.push({
        id: makeId("spell"),
        name: spell.name ?? "Unknown Spell",
        level: asNumber(spell.level),
        description: spell.description ?? "",
        roll: spell.roll ?? "",
      });
      next.spellbook = spellbook;
    },
    add_inventory_item: (args) => {
      const inventory = normalizeInventory(next.inventory);
      const rawSection = typeof args.section === "string" ? args.section.toLowerCase() : "";
      const section = ["weapons", "armor", "consumables", "misc"].includes(rawSection)
        ? rawSection
        : "misc";
      const item = { id: makeId("item"), ...(args.item ?? {}) };
      inventory.sections[section].push(item);
      next.inventory = inventory;
    },
    consume_inventory_item: (args) => {
      const inventory = normalizeInventory(next.inventory);
      const knownSections = ["weapons", "armor", "consumables", "misc"];
      const rawSection = typeof args.section === "string" ? args.section.toLowerCase() : "";
      const sectionKeys = knownSections.includes(rawSection) ? [rawSection] : knownSections;
      sectionKeys.forEach((key: string) => {
        const list = ensureArray((inventory.sections as any)[key]);
        const nextList = list.flatMap((item: any) => {
          const matches =
            (args.id && item.id === args.id) ||
            (args.name && item.name === args.name) ||
            (!args.id && !args.name ? false : false);
          if (!matches) return [item];
          const quantity = asNumber(item.quantity, 1);
          if (quantity > 1) {
            return [{ ...item, quantity: quantity - 1 }];
          }
          return [];
        });
        (inventory.sections as any)[key] = nextList;
      });
      next.inventory = inventory;
    },
    record_saving_throw: (args) => {
      const saves = { ...ensureObject(next.saving_throws) } as Record<string, number>;
      if (args.ability) {
        saves[args.ability] = asNumber(args.roll, 0);
      }
      next.saving_throws = saves;
    },
  };

  toolCalls.forEach((call) => {
    const name = call?.function?.name;
    if (!name || !handlers[name]) return;
    let args = {};
    if (call?.function?.arguments) {
      try {
        args = JSON.parse(call.function.arguments);
      } catch (_error) {
        args = {};
      }
    }
    handlers[name](args);
  });

  return next;
};

const buildContext = (campaign: any) => {
  const quests = ensureArray(campaign.quests).slice(0, 6);
  const bounties = ensureArray(campaign.bounties).slice(0, 6);
  const rumors = ensureArray(campaign.rumors).slice(0, 6);
  const journal = ensureArray(campaign.journal).slice(0, 6).map((entry: any) => ({
    title: entry.title,
    category: entry.category,
    content: stripHtml(entry.content),
  }));
  const npcs = ensureArray(campaign.npcs).slice(0, 6);
  const inventory = normalizeInventory(campaign.inventory);

  return {
    name: campaign.name,
    race: campaign.race,
    alignment: campaign.alignment,
    class_name: campaign.class_name,
    appearance: campaign.look,
    gender: campaign.gender,
    backstory: campaign.backstory,
    reputation: campaign.reputation ?? {},
    level: campaign.level,
    level_xp: campaign.level_xp,
    hp: campaign.hp,
    hp_current: campaign.hp_current,
    quests,
    bounties,
    rumors,
    journal,
    npcs,
    inventory: {
      summary: inventory.summary,
      equipped: inventory.equipped,
    },
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const message = typeof payload?.message === "string" ? payload.message.trim() : "";
    const campaignId = payload?.campaignId ?? "";
    const accessKey = payload?.accessKey ?? "";
    const location = payload?.location ?? DEFAULT_LOCATION;

    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!campaignId && !accessKey) {
      return new Response(JSON.stringify({ error: "Campaign identifier is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey =
      Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !supabaseKey || !openaiKey) {
      return new Response(
        JSON.stringify({
          error: "Missing SUPABASE_URL, SERVICE_ROLE_KEY, or OPENAI_API_KEY.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const lookupKey = accessKey ? "access_key" : "id";
    const lookupValue = accessKey || campaignId;
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq(lookupKey, lookupValue)
      .single();

    if (campaignError || !campaign) {
      return new Response(JSON.stringify({ error: campaignError?.message ?? "Campaign not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const history = ensureArray(campaign.messages)
      .slice(-10)
      .map((entry: any) => ({
        role:
          entry.sender === campaign.name || entry.sender === "You" ? "user" : "assistant",
        content: entry.content ?? "",
      }));

    const systemPrompt =
      "You are the Dungeon Master for a single-player DnD campaign. " +
      "Stay concise, cinematic, and responsive to the player. " +
      "Wrap important names, items, spells, locations, and factions in <dm-entity> tags. " +
      "Whenever the story changes quests, rumors, bounties, reputation, XP, HP, inventory, journal, NPCs, ossuary items, spells, or saving throws, call the relevant tool to update state.";

    const context = buildContext(campaign);

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "system", content: `Campaign context: ${JSON.stringify(context)}` },
      ...history,
      { role: "user", content: message },
    ];

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errorBody = await openaiResponse.text();
      return new Response(JSON.stringify({ error: errorBody }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiData = await openaiResponse.json();
    const firstMessage = openaiData?.choices?.[0]?.message ?? {};
    const toolCalls = firstMessage.tool_calls ?? [];

    let updatedCampaign = { ...campaign };

    if (toolCalls.length) {
      updatedCampaign = applyToolCalls(updatedCampaign, toolCalls);

      const toolResponses = toolCalls.map((call: any) => ({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify({ ok: true }),
      }));

      const followup = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [...messages, firstMessage, ...toolResponses],
          temperature: 0.7,
        }),
      });

      if (followup.ok) {
        const followupData = await followup.json();
        const followupMessage = followupData?.choices?.[0]?.message ?? {};
        firstMessage.content = followupMessage.content ?? firstMessage.content;
      }
    }

    const playerMessage = {
      id: makeId("player"),
      sender: campaign.name ?? "You",
      location,
      content: message,
    };

    const dmMessage = {
      id: makeId("dm"),
      sender: "Dungeon Master",
      location,
      content: firstMessage.content ?? "The tavern is quiet for a moment...",
    };

    updatedCampaign.messages = [...ensureArray(campaign.messages), playerMessage, dmMessage];

    const { data: savedCampaign, error: saveError } = await supabase
      .from("campaigns")
      .update({
        ...updatedCampaign,
        id: undefined,
        created_at: undefined,
        updated_at: undefined,
      })
      .eq("id", campaign.id)
      .select("*")
      .single();

    if (saveError) {
      return new Response(JSON.stringify({ error: saveError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ campaign: savedCampaign }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message ?? "Unknown error." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

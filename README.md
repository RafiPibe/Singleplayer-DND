# Singleplayer DnD Campaign (WIP)

Single-player, story-driven DnD campaigns with a Gemini-powered Dungeon Master, Supabase storage, and a fully editable admin console.

## Features
- Campaign creation wizard with races, classes, stats, backstory, and starting gear.
- AI Dungeon Master via Supabase Edge Functions (Gemini API).
- Campaign UI with quests, rumors, bounties, NPCs, inventory, journal, spellbook, and dice tools.
- Leaderboard on the home page.
- Admin console to edit campaigns and game data (classes, races, abilities, loot tables).
- Optional background music from Supabase Storage.

## Tech stack
- Vite + React
- Tailwind CSS
- Supabase (Postgres, Auth, Storage, Edge Functions)
- Gemini API

## Setup
1) Install dependencies
```
npm install
```

2) Create Supabase tables and policies
- Create a Supabase project.
- Run `supabase.sql` in the Supabase SQL editor.
- This creates `campaigns`, `admin_emails`, and `game_data` plus RLS policies.

3) Connect Google AI Studio

4) Configure environment
```
cp .env.example .env
```
Fill:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

(local Edge Functions or custom tooling):
- `SUPABASE_URL`
- `SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (defaults to `gemini-2.0-flash`)

5) Start dev server
```
npm run dev
```

## Security note
- `supabase.sql` currently allows public read/write on `campaigns` and public read on `game_data`.
- The `dm-chat` Edge Function runs with `verify_jwt = false` by default.
- Lock these down before production if you need authenticated or private data access.

## Usage
- `/` Home. Enter a campaign UID to continue or create a new campaign.
- `/create` Character creation wizard.
- `/campaign/:id` Campaign view (accepts `access_key` UID or UUID).
- `/admin` Admin console (Supabase Auth + allow list).

## Admin setup
- Add your email to the allow list:
```
insert into public.admin_emails (email) values ('you@example.com');
```
- Enable email auth in Supabase.
- Sign in at `/admin` using password or magic link.

The admin console can:
- Edit campaign data directly.
- Override `classes`, `races`, `abilities`, `skills_by_ability`, and `loot_config` via the `game_data` table.
- When no rows exist in `game_data`, the app falls back to `src/data/*`.

## AI DM setup (Edge Function)
- Deploy the edge function in `supabase/functions/dm-chat`:
```
supabase functions deploy dm-chat --no-verify-jwt
```
- Deploy through CLI if there is any changes towards the dm chat by doing below in supabase CLI
```
supabase functions deploy dm-chat --no-verify-jwt
```
- Set these function secrets in Supabase:
  - GEMINI_API_KEY (from Google AI Studio)
  - SERVICE_ROLE_KEY (service_role key from Supabase)
  - Optional: GEMINI_MODEL (defaults to gemini-2.0-flash)

Notes:
- Supabase injects `SUPABASE_URL` automatically inside Edge Functions.
- `dm-chat` is configured with `verify_jwt = false` to allow UID-only access. Adjust if you want authenticated access only.

## Optional: music storage
- Create a public bucket named `dnd-bucket`.
- Upload audio files under `music/` (e.g. `music/TavernMusic.mp3`).
- The campaign page auto-loads tracks from that folder and falls back to `music/TavernMusic.mp3`.

## Scripts
- `npm run dev` Run Vite dev server
- `npm run build` Production build
- `npm run preview` Preview build locally

## Item & Drops Rarity distribution and stats
| **Rarity**              | **Weight** | **Probability** |
| ----------------------- | ---------- | --------------- |
| **Common**              | 500        | 50%             |
| **Uncommon**            | 300        | 30%             |
| **Rare**                | 140        | 14%             |
| **Epic**                | 50         | 5%              |
| **Legendary**           | 9          | 0.9%            |
| **Unique (Backstory)**  | 0          | 0%              |
| **Divine / Hellforged** | 1          | 0.1%            |

## Equipment Scaling (Weapons & Armor)

| **Rarity**        | **Weapon Bonus (Damage increase)** | **Damage Die Scaling** | **Armor Class (AC)** |
| ----------------- | ---------------------------------- | ---------------------- | -------------------- |
| **Common**        | +0                                 | Base Die               | Base AC              |
| **Uncommon**      | +1                                 | Base Die               | Base AC              |
| **Rare**          | +1                                 | +1d4                   | +1 AC                |
| **Epic**          | +2                                 | +1d8                   | +2 AC                |
| **Legendary**     | +3                                 | **Double** Base Die    | +3 AC                |
| **Divine / Hell** | +3                                 | **Double** Die + 2d10  | +4 AC                |

## Potion Potency & Minimum Rarities
| **Rarity**      | **HP Recovery** | **XP Granted** | **Skill XP (Training)** | **Duration** |
| --------------- | --------------- | -------------- | ----------------------- | ------------ |
| **Common**      | 2d4 + 2         | —              | —                       | Instant      |
| **Uncommon**    | 4d4 + 4         | —              | —                       | Instant      |
| **Rare**        | 8d4 + 8         | —              | +1 Skill Point          | Instant      |
| **Epic**        | 10d4 + 20       | **2 XP**       | +2 Skill Points         | Instant      |
| **Legendary**   | Full Heal       | **5 XP**       | +5 Skill Points         | Instant      |
| **Divine/Hell** | Full + 25 Temp  | **10 XP**      | Instant Mastery         | Instant      |

## Ability & Skill Potions (Buffs)
| **Rarity**      | **Ability Check Buff** | **Skill Performance** | **Duration**     |
| --------------- | ---------------------- | --------------------- | ---------------- |
| **Uncommon**    | +1d4 to checks         | —                     | 1 Turns          |
| **Rare**        | +1d6 to checks         | Advantage on Skill    | 1 Turns          |
| **Epic**        | +1d8 to checks         | Advantage + 1d4       | 2 Turns          |
| **Legendary**   | +1d10 to checks        | Advantage + 1d8       | 4 Turns          |
| **Divine/Hell** | +1d12 to checks        | Auto-Success (1/turn) | Until DM said so |

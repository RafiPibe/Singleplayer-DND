# Singleplayer DnD Campaign (WIP)

(Built with React + Supabase)

Setup
- Install dependencies: npm install
- Copy env: cp .env.example .env and fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
- Create the table: run the SQL in supabase.sql in your Supabase SQL editor
- Start dev server: npm run dev

Pages
- /: homepage with UID access
- /create: character creation wizard
- /campaign/:id: campaign view + dice tray (accepts UID or UUID)
- /admin: admin console (Supabase auth + admin email allowlist)

Admin setup
- Run the latest SQL in supabase.sql to create admin_emails and game_data tables.
- Add your admin email in Supabase:
  insert into public.admin_emails (email) values ('you@example.com');

AI DM setup
- Deploy the edge function in `supabase/functions/dm-chat`.
- Deploy through cli if there is any changes towards the dm chat by doing `supabase functions deploy dm-chat --no-verify-jwt` in supabase CLI
- Set these function secrets in Supabase:
  - GEMINI_API_KEY (from Google AI Studio)
  - SERVICE_ROLE_KEY (service_role key from Supabase)
  - Optional: GEMINI_MODEL (defaults to gemini-2.0-flash)
- Note: Supabase provides `SUPABASE_URL` automatically inside Edge Functions.
- The `dm-chat` function is configured with `verify_jwt = false` to allow UID-only access.

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

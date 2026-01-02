Singleplayer DnD Campaign (WIP)

(Built with React + Supabase)

Setup
- Install deps: npm install
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
- Set these function secrets in Supabase:
  - GEMINI_API_KEY (from Google AI Studio)
  - SERVICE_ROLE_KEY (service_role key from Supabase)
  - Optional: GEMINI_MODEL (defaults to gemini-2.0-flash)
- Note: Supabase provides `SUPABASE_URL` automatically inside Edge Functions.
- The `dm-chat` function is configured with `verify_jwt = false` to allow UID-only access.

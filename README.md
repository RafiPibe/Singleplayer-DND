Singleplayer DnD Campaign (React + Supabase)

Setup
- Install deps: npm install
- Copy env: cp .env.example .env and fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
- Create the table: run the SQL in supabase.sql in your Supabase SQL editor
- Start dev server: npm run dev

Pages
- /: homepage with campaign list
- /create: character creation wizard
- /campaign/:id: campaign view + dice tray

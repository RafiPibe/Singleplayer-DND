create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  race text,
  alignment text,
  race_boosts jsonb not null default '{}'::jsonb,
  look text not null,
  gender text not null,
  class_name text not null,
  class_description text not null,
  stats jsonb not null,
  ability_scores jsonb not null default '{}'::jsonb,
  ability_progress jsonb not null default '{}'::jsonb,
  skills jsonb not null default '{}'::jsonb,
  skill_progress jsonb not null default '{}'::jsonb,
  skill_points integer not null default 0,
  saving_throws jsonb not null default '{}'::jsonb,
  save_proficiencies jsonb not null default '[]'::jsonb,
  level integer not null default 1,
  level_xp integer not null default 0,
  reputation jsonb not null,
  hp integer not null,
  hp_current integer,
  backstory text not null,
  messages jsonb not null default '[]'::jsonb,
  quests jsonb not null default '[]'::jsonb,
  bounties jsonb not null default '[]'::jsonb,
  rumors jsonb not null default '[]'::jsonb,
  inventory jsonb not null default '[]'::jsonb,
  buffs jsonb not null default '[]'::jsonb,
  relationships jsonb not null default '[]'::jsonb,
  journal jsonb not null default '[]'::jsonb,
  npcs jsonb not null default '[]'::jsonb,
  ossuary jsonb not null default '[]'::jsonb,
  spellbook jsonb not null default '[]'::jsonb,
  access_key text not null default lpad((floor(random() * 1000000000))::text, 9, '0') unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.campaigns add column if not exists race text;
alter table public.campaigns add column if not exists alignment text;
alter table public.campaigns add column if not exists race_boosts jsonb not null default '{}'::jsonb;
alter table public.campaigns add column if not exists ability_scores jsonb not null default '{}'::jsonb;
alter table public.campaigns add column if not exists ability_progress jsonb not null default '{}'::jsonb;
alter table public.campaigns add column if not exists skills jsonb not null default '{}'::jsonb;
alter table public.campaigns add column if not exists skill_progress jsonb not null default '{}'::jsonb;
alter table public.campaigns add column if not exists skill_points integer not null default 0;
alter table public.campaigns add column if not exists saving_throws jsonb not null default '{}'::jsonb;
alter table public.campaigns add column if not exists save_proficiencies jsonb not null default '[]'::jsonb;
alter table public.campaigns add column if not exists level integer not null default 1;
alter table public.campaigns add column if not exists level_xp integer not null default 0;
alter table public.campaigns add column if not exists hp_current integer;
alter table public.campaigns add column if not exists buffs jsonb not null default '[]'::jsonb;
alter table public.campaigns add column if not exists messages jsonb not null default '[]'::jsonb;
alter table public.campaigns add column if not exists quests jsonb not null default '[]'::jsonb;
alter table public.campaigns add column if not exists bounties jsonb not null default '[]'::jsonb;
alter table public.campaigns add column if not exists rumors jsonb not null default '[]'::jsonb;
alter table public.campaigns add column if not exists inventory jsonb not null default '[]'::jsonb;
alter table public.campaigns add column if not exists relationships jsonb not null default '[]'::jsonb;
alter table public.campaigns add column if not exists journal jsonb not null default '[]'::jsonb;
alter table public.campaigns add column if not exists npcs jsonb not null default '[]'::jsonb;
alter table public.campaigns add column if not exists ossuary jsonb not null default '[]'::jsonb;
alter table public.campaigns add column if not exists spellbook jsonb not null default '[]'::jsonb;
alter table public.campaigns add column if not exists access_key text;

update public.campaigns
set npcs = (
  select coalesce(
    jsonb_agg(
      case
        when (npc->>'name') ilike 'pibe' then
          jsonb_set(npc, '{gender}', to_jsonb('Male'::text), true)
        else npc
      end
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(npcs) as npc
)
where jsonb_typeof(npcs) = 'array';

update public.campaigns
set access_key = lpad((floor(random() * 1000000000))::text, 9, '0')
where access_key is null;

alter table public.campaigns
  alter column access_key set default lpad((floor(random() * 1000000000))::text, 9, '0');

create unique index if not exists campaigns_access_key_idx on public.campaigns(access_key);

alter table public.campaigns
  alter column access_key set not null;

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on public.campaigns;

create trigger set_updated_at
before update on public.campaigns
for each row execute function public.touch_updated_at();

create table if not exists public.admin_emails (
  email text primary key
);

alter table public.admin_emails enable row level security;

drop policy if exists "Admin emails self read" on public.admin_emails;
create policy "Admin emails self read" on public.admin_emails
  for select
  using ((auth.jwt() ->> 'email') = email);

create table if not exists public.game_data (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists set_game_data_updated_at on public.game_data;

create trigger set_game_data_updated_at
before update on public.game_data
for each row execute function public.touch_updated_at();

alter table public.game_data enable row level security;

drop policy if exists "Game data public read" on public.game_data;
create policy "Game data public read" on public.game_data
  for select
  using (true);

drop policy if exists "Game data admin write" on public.game_data;
create policy "Game data admin write" on public.game_data
  for all
  using (
    exists (
      select 1
      from public.admin_emails
      where admin_emails.email = (auth.jwt() ->> 'email')
    )
  )
  with check (
    exists (
      select 1
      from public.admin_emails
      where admin_emails.email = (auth.jwt() ->> 'email')
    )
  );

alter table public.campaigns enable row level security;

drop policy if exists "Public campaigns read" on public.campaigns;
create policy "Public campaigns read" on public.campaigns
  for select
  using (true);

drop policy if exists "Public campaigns write" on public.campaigns;
create policy "Public campaigns write" on public.campaigns
  for insert
  with check (true);

drop policy if exists "Public campaigns update" on public.campaigns;
create policy "Public campaigns update" on public.campaigns
  for update
  using (true)
  with check (true);

drop policy if exists "Public campaigns delete" on public.campaigns;
create policy "Public campaigns delete" on public.campaigns
  for delete
  using (true);

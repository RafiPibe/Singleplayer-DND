create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  look text not null,
  gender text not null,
  class_name text not null,
  class_description text not null,
  stats jsonb not null,
  reputation jsonb not null,
  hp integer not null,
  backstory text not null,
  messages jsonb not null default '[]'::jsonb,
  quests jsonb not null default '[]'::jsonb,
  bounties jsonb not null default '[]'::jsonb,
  inventory jsonb not null default '[]'::jsonb,
  relationships jsonb not null default '[]'::jsonb,
  journal jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.campaigns add column if not exists messages jsonb not null default '[]'::jsonb;
alter table public.campaigns add column if not exists quests jsonb not null default '[]'::jsonb;
alter table public.campaigns add column if not exists bounties jsonb not null default '[]'::jsonb;
alter table public.campaigns add column if not exists inventory jsonb not null default '[]'::jsonb;
alter table public.campaigns add column if not exists relationships jsonb not null default '[]'::jsonb;
alter table public.campaigns add column if not exists journal jsonb not null default '[]'::jsonb;

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

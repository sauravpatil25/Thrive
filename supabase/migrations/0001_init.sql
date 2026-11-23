-- Thrive: initial schema.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Every table has row-level security, so each signed-in user can only read and
-- write their own rows. The publishable key used by the app cannot bypass this.

create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  name              text        not null check (char_length(name) between 1 and 60),
  units             text        not null default 'metric' check (units in ('metric', 'imperial')),
  height_cm         numeric(5,1)          check (height_cm between 50 and 260),
  start_weight_kg   numeric(5,2)          check (start_weight_kg between 20 and 400),
  target_weight_kg  numeric(5,2)          check (target_weight_kg between 20 and 400),
  cigs_per_day      smallint    not null default 0 check (cigs_per_day between 0 and 100),
  drinks_per_week   smallint    not null default 0 check (drinks_per_week between 0 and 200),
  sleep_hours       numeric(3,1)          check (sleep_hours between 0 and 16),
  bedtime           time        not null default '23:00',
  goals             text[]      not null default '{}',
  smoke_mode        text        not null default 'quit' check (smoke_mode in ('quit', 'taper')),
  alcohol_mode      text        not null default 'quit' check (alcohol_mode in ('quit', 'taper')),
  pace              text        not null default 'steady' check (pace in ('gentle', 'steady', 'aggressive')),
  why               text        not null default '' check (char_length(why) <= 280),
  custom_habits     jsonb       not null default '[]'::jsonb,
  start_date        date        not null default current_date,
  onboarded         boolean     not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.daily_entries (
  user_id      uuid        not null references auth.users (id) on delete cascade,
  date         date        not null,
  completed    text[]      not null default '{}',
  mood         smallint             check (mood between 1 and 5),
  energy       smallint             check (energy between 1 and 5),
  sleep_hours  numeric(3,1)         check (sleep_hours between 0 and 24),
  cigarettes   smallint             check (cigarettes between 0 and 200),
  drinks       smallint             check (drinks between 0 and 100),
  note         text        not null default '' check (char_length(note) <= 500),
  logged       boolean     not null default false,
  updated_at   timestamptz not null default now(),
  primary key (user_id, date)
);

create table if not exists public.weight_entries (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  date        date        not null,
  weight_kg   numeric(5,2) not null check (weight_kg between 20 and 400),
  created_at  timestamptz not null default now()
);

create index if not exists weight_entries_user_date on public.weight_entries (user_id, date);

-- Keep updated_at current.
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists daily_entries_touch on public.daily_entries;
create trigger daily_entries_touch before update on public.daily_entries
  for each row execute function public.touch_updated_at();

-- Row-level security: owner-only access.
alter table public.profiles       enable row level security;
alter table public.daily_entries  enable row level security;
alter table public.weight_entries enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "own entries" on public.daily_entries;
create policy "own entries" on public.daily_entries
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own weights" on public.weight_entries;
create policy "own weights" on public.weight_entries
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

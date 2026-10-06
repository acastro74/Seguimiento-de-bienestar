-- Bitácora de Bienestar — esquema inicial
-- Ejecutar en Supabase → SQL Editor (o con `supabase db push`).
-- Cada tabla tiene Row Level Security: cada persona solo puede ver y editar sus propios datos.

create table if not exists public.profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  name         text not null default '',
  track_weight boolean not null default false,
  track_cycle  boolean not null default false,
  goals        jsonb not null default '{"waterGlasses":8,"sleepHours":7,"sleepEfficiency":85,"exerciseMinWeek":150,"vegMealsDay":2}',
  onboarded    boolean not null default false,
  updated_at   timestamptz not null default now()
);

create table if not exists public.habits (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name       text not null,
  emoji      text not null default '✨',
  active     boolean not null default true,
  sort       int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists habits_user_idx on public.habits (user_id);

create table if not exists public.medications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name       text not null,
  dose       text not null default '',
  sleep_aid  boolean not null default false,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists medications_user_idx on public.medications (user_id);

-- Un registro por persona y día. El sueño corresponde a la noche ANTERIOR a `date`.
-- Comidas, ejercicio, consumos y hábitos se guardan como listas JSON dentro del día
-- para que cada guardado sea atómico (un solo upsert).
create table if not exists public.day_logs (
  user_id        uuid not null references auth.users (id) on delete cascade default auth.uid(),
  date           date not null,
  mood           smallint check (mood between 1 and 10),
  energy         smallint check (energy between 1 and 10),
  stress         smallint check (stress between 1 and 10),
  water          smallint not null default 0 check (water >= 0),
  note           text not null default '',
  weight_kg      numeric(5, 1),
  waist_cm       numeric(5, 1),
  cycle_period   boolean,
  cycle_flow     text check (cycle_flow in ('leve', 'medio', 'abundante')),
  cycle_symptoms text[] not null default '{}',
  -- Diario del sueño
  bed_time       time,
  lights_off     time,
  latency_min    smallint,
  awakenings     smallint,
  awake_min      smallint,
  final_wake     time,
  woke_early_min smallint,
  out_of_bed     time,
  hours_reported numeric(4, 2),
  sleep_quality  smallint check (sleep_quality between 1 and 5),
  rested         smallint check (rested between 1 and 5),
  nap_min        smallint,
  nap_start      time,
  sleep_comment  text not null default '',
  -- Listas
  meals          jsonb not null default '[]',
  exercise       jsonb not null default '[]',
  intakes        jsonb not null default '[]',
  habit_ids      uuid[] not null default '{}',
  updated_at     timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.profiles    enable row level security;
alter table public.habits      enable row level security;
alter table public.medications enable row level security;
alter table public.day_logs    enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'habits', 'medications', 'day_logs'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
drop trigger if exists day_logs_touch on public.day_logs;
create trigger day_logs_touch before update on public.day_logs
  for each row execute function public.touch_updated_at();

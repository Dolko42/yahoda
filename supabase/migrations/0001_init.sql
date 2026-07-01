-- Yahoda — Phase 2 initial schema.
-- Hybrid normalization: tokens & components are first-class rows (stable UUIDs, queryable);
-- component internals (variants/bindings/a11y/aiRules) live in a jsonb `spec` column;
-- patterns/docs/draft ride in design_systems.extras; commits are immutable snapshots.
-- Single-user MVP: every row is owned via design_systems.owner_id, enforced by RLS.

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- auto-create a profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- design_systems
-- ---------------------------------------------------------------------------
create table if not exists public.design_systems (
  id text primary key,                       -- stable in-model id (e.g. ds.seed) or uuid
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  schema_version text not null,
  current_published_commit_id text,
  extras jsonb not null default '{}'::jsonb,  -- { patterns, docs, draft }
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists design_systems_owner_idx on public.design_systems (owner_id);

-- ---------------------------------------------------------------------------
-- tokens
-- ---------------------------------------------------------------------------
create table if not exists public.tokens (
  id text primary key,                       -- stable in-model token id
  design_system_id text not null references public.design_systems (id) on delete cascade,
  name text not null,
  type text not null,
  tier text not null,
  "group" text,
  value jsonb not null,
  usage text,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (design_system_id, name)
);
create index if not exists tokens_ds_idx on public.tokens (design_system_id);
create index if not exists tokens_type_idx on public.tokens (design_system_id, type);

-- ---------------------------------------------------------------------------
-- components
-- ---------------------------------------------------------------------------
create table if not exists public.components (
  id text primary key,                       -- stable in-model component id
  design_system_id text not null references public.design_systems (id) on delete cascade,
  name text not null,
  status text not null,
  description text,
  intent text,
  spec jsonb not null,                       -- variants/states/slots/bindings/a11y/aiRules/code/docs/examples
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (design_system_id, name)
);
create index if not exists components_ds_idx on public.components (design_system_id);

-- ---------------------------------------------------------------------------
-- commits (immutable published history)
-- ---------------------------------------------------------------------------
create table if not exists public.commits (
  id text primary key,
  design_system_id text not null references public.design_systems (id) on delete cascade,
  author_id uuid references auth.users (id),
  message text not null,
  version_label text,
  snapshot jsonb,                            -- full working set at publish (null for legacy)
  affected jsonb not null default '{}'::jsonb,
  changes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists commits_ds_idx on public.commits (design_system_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — owner-only access to everything.
-- ---------------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.design_systems enable row level security;
alter table public.tokens         enable row level security;
alter table public.components     enable row level security;
alter table public.commits        enable row level security;

-- `drop policy if exists` before each create keeps this migration re-runnable (Postgres
-- has no `create policy if not exists`).
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "own design systems" on public.design_systems;
create policy "own design systems" on public.design_systems
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- child tables: owned via their design system
drop policy if exists "own tokens" on public.tokens;
create policy "own tokens" on public.tokens
  for all using (
    design_system_id in (select id from public.design_systems where owner_id = auth.uid())
  ) with check (
    design_system_id in (select id from public.design_systems where owner_id = auth.uid())
  );

drop policy if exists "own components" on public.components;
create policy "own components" on public.components
  for all using (
    design_system_id in (select id from public.design_systems where owner_id = auth.uid())
  ) with check (
    design_system_id in (select id from public.design_systems where owner_id = auth.uid())
  );

drop policy if exists "own commits" on public.commits;
create policy "own commits" on public.commits
  for all using (
    design_system_id in (select id from public.design_systems where owner_id = auth.uid())
  ) with check (
    design_system_id in (select id from public.design_systems where owner_id = auth.uid())
  );

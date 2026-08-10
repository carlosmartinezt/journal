-- Journal — initial schema, indexes, RLS, and profile provisioning.
--
-- Data model notes:
--  * Primary keys are client-generated UUIDs so entries can be created fully
--    offline; server-side upserts on the PK are therefore idempotent.
--  * created_at / updated_at are supplied by the client and stored as-is. The
--    sync engine uses updated_at for last-write-wins and as the pull cursor,
--    so we intentionally do NOT override it with a server-side trigger.
--  * Deletion is soft (deleted_at) to keep sync safe (no resurrection).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- journal_entries
-- ---------------------------------------------------------------------------
create table if not exists public.journal_entries (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  content jsonb not null default '{}'::jsonb,
  plain_text text not null default '',
  journal_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists journal_entries_user_updated_idx
  on public.journal_entries (user_id, updated_at desc);
create index if not exists journal_entries_user_date_idx
  on public.journal_entries (user_id, journal_date desc);

-- ---------------------------------------------------------------------------
-- journal_photos
-- ---------------------------------------------------------------------------
create table if not exists public.journal_photos (
  id uuid primary key,
  entry_id uuid not null references public.journal_entries (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  mime_type text not null default 'image/jpeg',
  width integer not null default 0,
  height integer not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists journal_photos_user_updated_idx
  on public.journal_photos (user_id, updated_at desc);
create index if not exists journal_photos_entry_idx
  on public.journal_photos (entry_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — every row is private to its owner.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_photos enable row level security;

-- profiles: a user can see/manage only their own profile row.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (auth.uid() = id);
drop policy if exists profiles_upsert on public.profiles;
create policy profiles_upsert on public.profiles
  for insert with check (auth.uid() = id);

-- journal_entries: full CRUD restricted to the owner.
drop policy if exists entries_select on public.journal_entries;
create policy entries_select on public.journal_entries
  for select using (auth.uid() = user_id);
drop policy if exists entries_insert on public.journal_entries;
create policy entries_insert on public.journal_entries
  for insert with check (auth.uid() = user_id);
drop policy if exists entries_update on public.journal_entries;
create policy entries_update on public.journal_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists entries_delete on public.journal_entries;
create policy entries_delete on public.journal_entries
  for delete using (auth.uid() = user_id);

-- journal_photos: full CRUD restricted to the owner.
drop policy if exists photos_select on public.journal_photos;
create policy photos_select on public.journal_photos
  for select using (auth.uid() = user_id);
drop policy if exists photos_insert on public.journal_photos;
create policy photos_insert on public.journal_photos
  for insert with check (auth.uid() = user_id);
drop policy if exists photos_update on public.journal_photos;
create policy photos_update on public.journal_photos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists photos_delete on public.journal_photos;
create policy photos_delete on public.journal_photos
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Auto-provision a profile row when a new auth user is created.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

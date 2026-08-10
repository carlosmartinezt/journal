-- Decouple the sync pull cursor from the entry's logical timestamp.
--
-- Problem: the client's `updated_at` is the entry's own last-modified time,
-- which for imports (e.g. Day One) can be years in the past. Using it as the
-- incremental-pull cursor means a device that has already synced (cursor ≈ now)
-- never pulls freshly-imported-but-old-dated rows.
--
-- Fix: a server-managed `server_updated_at` set to the wall-clock time of every
-- write. The sync engine pulls/orders by THIS column, so any row written to the
-- server after a device's cursor is fetched — regardless of its historical
-- date. `updated_at` remains the logical clock for last-write-wins.

-- clock_timestamp() (not now()) advances within a statement, giving existing
-- rows distinct values so (server_updated_at, id) is a stable pagination order.
alter table public.journal_entries add column if not exists server_updated_at timestamptz;
update public.journal_entries set server_updated_at = clock_timestamp() where server_updated_at is null;
alter table public.journal_entries alter column server_updated_at set not null;
alter table public.journal_entries alter column server_updated_at set default now();

alter table public.journal_photos add column if not exists server_updated_at timestamptz;
update public.journal_photos set server_updated_at = clock_timestamp() where server_updated_at is null;
alter table public.journal_photos alter column server_updated_at set not null;
alter table public.journal_photos alter column server_updated_at set default now();

create or replace function public.touch_server_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.server_updated_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists set_server_updated_at on public.journal_entries;
create trigger set_server_updated_at
  before insert or update on public.journal_entries
  for each row execute function public.touch_server_updated_at();

drop trigger if exists set_server_updated_at on public.journal_photos;
create trigger set_server_updated_at
  before insert or update on public.journal_photos
  for each row execute function public.touch_server_updated_at();

-- Pagination-friendly index for the pull query.
create index if not exists journal_entries_user_server_updated_idx
  on public.journal_entries (user_id, server_updated_at, id);
create index if not exists journal_photos_user_server_updated_idx
  on public.journal_photos (user_id, server_updated_at, id);

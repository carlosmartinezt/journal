# Journal

**Live:** https://journal.carlosmartinezt.com/ · **Demo:** https://journal.carlosmartinezt.com/demo

A calm, **offline-first** personal journaling PWA. Write, format, and attach
photos with or without a connection; everything is stored locally first and
synced to Supabase in the background when you're online. Installable to the
home screen and fully usable in airplane mode.

Built with React + TypeScript + Vite, TipTap, Dexie (IndexedDB), Tailwind, and
Supabase (Auth, Postgres, Storage).

**Ways to navigate your journal** (all offline, reading from IndexedDB):

- **Timeline** — reverse-chronological with sticky month separators and a
  per-day date rail; rendered progressively for large histories.
- **Calendar** — a scrolling month grid with entry-days highlighted; tap a day
  to see its entries.
- **On This Day** — everything written on today's calendar day across all years.
- **Search** — instant full-text search over titles and body text.

---

## Demo

The login screen has a **See a demo** link (or go straight to
[`/demo`](https://journal.carlosmartinezt.com/demo)) which opens a fictional
two-year journal — no account, no sign-up.

The demo is deliberately **local-only**: it seeds sample entries straight into
IndexedDB and never configures the sync engine, so there is no shared account to
vandalise and no backend quota to burn. Visitors can write, edit and delete
freely; everything is erased when they leave. Sample photos are small hand-built
SVG scenes, so the demo stays offline-capable and adds nothing to the network.

Its content lives in [`src/demo/entries.ts`](src/demo/entries.ts) with dates
expressed relative to today, so the demo always looks current and **On This Day**
always has something to show. See [Demo mode](#demo-mode) for the details.

---

## Table of contents

- [Architecture](#architecture)
- [Demo mode](#demo-mode)
- [Project structure](#project-structure)
- [Requirements](#requirements)
- [Environment variables](#environment-variables)
- [Supabase setup](#supabase-setup)
- [Running database migrations](#running-database-migrations)
- [Running locally](#running-locally)
- [Building for production](#building-for-production)
- [Testing](#testing)
- [Testing PWA + offline behavior](#testing-pwa--offline-behavior)
- [Synchronization architecture](#synchronization-architecture)
- [Conflict handling](#conflict-handling)
- [Photos](#photos)
- [Developer tools](#developer-tools)
- [Platform abstraction (native-ready)](#platform-abstraction-native-ready)
- [Deployment](#deployment)
- [Known PWA limitations on iOS / Safari](#known-pwa-limitations-on-ios--safari)
- [Security & data safety](#security--data-safety)

---

## Architecture

The client is the source of truth for the working data model. The UI reads and
writes **IndexedDB** (via Dexie + liveQuery), so online and offline behavior are
identical — no screen waits on the network. A React-independent **sync engine**
reconciles IndexedDB with Supabase in the background.

```
                 ┌──────────── React UI (pages, editor, components) ───────────┐
                 │  reads/writes ONLY through hooks + repositories             │
                 └───────────────┬─────────────────────────────┬──────────────┘
                                 │ liveQuery (reactive reads)   │ mutations
                                 ▼                              ▼
                        ┌──────────────── IndexedDB (Dexie) ────────────────┐
                        │  entries · photos · syncQueue · conflicts · meta   │
                        └───────────────┬───────────────────────────────────┘
                                        │ push queue / pull cursor
                                        ▼
                        ┌──────────────── SyncEngine ───────────────────────┐
                        │  push (idempotent upsert) · pull (cursor) · LWW    │
                        └───────────────┬───────────────────────────────────┘
                                        │ RemoteGateway interface
                                        ▼
                        ┌──────── Supabase (Auth · Postgres · Storage) ──────┐
                        │  RLS: every row/object scoped to auth.uid()        │
                        └───────────────────────────────────────────────────┘
```

**Data models**

- IndexedDB (`src/db/local/db.ts`): `entries`, `photos`, `syncQueue`,
  `conflicts`, `appMeta`. Primary keys are **client-generated UUIDs** so
  records can be created fully offline.
- Supabase (`supabase/migrations/`): `profiles`, `journal_entries` (content as
  JSONB), `journal_photos`; a private `journal-photos` Storage bucket.

## Project structure

```
src/
  auth/          AuthContext — Supabase auth + offline-cached session
  components/    UI: AppLayout, BottomNav, EntryCard, PhotoGrid, SaveIndicator, DevPanel…
  db/
    local/       Dexie database + typed repositories (entries, photos, queue, meta)
    remote/      SupabaseGateway (implements the sync RemoteGateway port)
  demo/          Public demo: sample journal, SVG scenes, local-only session
  editor/        TipTap editor hook + compact mobile toolbar
  hooks/         useTimeline, useEntry, usePhotos, useOnline, useSyncState, useCreateEntry…
  lib/           env, supabase client, content (TipTap↔text), date, id, logger
  pages/         LoginPage, TimelinePage, EntryEditorPage, SettingsPage
  platform/      Capability PORTS + web adapters (connectivity, lifecycle, media, image, secure storage)
  sync/          SyncEngine, RemoteGateway interface, conflict log, dev fault injection
  types/         Domain types shared across UI / local / remote / sync
supabase/migrations/   SQL: schema, indexes, RLS, storage policies
scripts/               Migration runner, icon generator, test-user helper
deploy/                Caddy site block
ops/                   deploy.sh
test/                  Vitest suites + in-memory fakes
```

## Demo mode

`src/demo/` contains everything the public demo needs:

| File         | Role                                                                    |
| ------------ | ----------------------------------------------------------------------- |
| `user.ts`    | The demo identity, kept tiny so auth can import it without the content   |
| `entries.ts` | The sample journal — prose plus relative dates                           |
| `scenes.ts`  | Hand-built SVG "photos" stored as blobs, like any other photo            |
| `session.ts` | Seed / enter / exit, loaded on demand (its own ~12 kB gzipped chunk)     |

**How a date is chosen.** Every sample entry is placed relative to *today*, so
the demo never goes stale:

- `d` — N days ago. The default; keeps recent weeks dense.
- `yearsAgo` — the same month + day N years ago. This is what fills **On This Day**.
- `md` — the most recent occurrence of a calendar date (`"12-06"`), so entries
  that mention frost or blossom stay in the right season. Never resolves into
  the future.
- `w` — additionally snap backwards to a weekday, for entries whose text names
  one ("The market, Saturday").

The entry list is written newest-first, the way the timeline shows it —
including inside a cluster such as a trip, so its last day appears above its
first. `test/demo.test.ts` enforces that ordering, which is what catches a
"second day" accidentally dated before its arrival.

**Safety properties**, all covered by tests:

- Sample data is written with `syncStatus: 'synced'` and **queues nothing**, so
  the demo never shows phantom pending changes.
- The sync engine is **never configured** during a demo session — no network
  calls are made at all.
- Re-entering re-seeds **in place** (stable ids), refreshing dates without
  duplicating entries.
- Exiting deletes the sample entries, whatever the visitor wrote, *and any sync
  ops those edits queued* — so nothing can follow them into a real account.

## Requirements

- **Node ≥ 20** (developed on Node 22). npm ≥ 10.
- A Supabase project (free tier is fine).

## Environment variables

Copy `.env.example` → `.env` and set:

| Variable                 | Purpose                                             |
| ------------------------ | --------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Supabase project URL (public)                       |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon / publishable key (public)            |
| `VITE_APP_VERSION`       | Shown on the Settings screen (optional)             |

Admin scripts (migrations, test user) additionally read `DATABASE_URL` (the
Postgres connection string containing the **secret** DB password) and optionally
`PGSSLROOTCERT`. These are **never** bundled into the app and must not be
committed.

If `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are absent the app still runs
in **local-only** mode (offline store works; remote sync is disabled).

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Copy the **Project URL** and **anon/publishable key** into `.env`.
3. Run the migrations (below) to create tables, RLS policies, and the private
   Storage bucket.
4. **Auth:** by default this project keeps *Confirm email* ON — new users get a
   confirmation email and the app shows a "check your email, then log in"
   notice. To make signup → first use instant, disable it in
   **Authentication → Sign In / Providers → Email → Confirm email**.

## Running database migrations

Migrations live in `supabase/migrations/` and are applied by an idempotent
runner that tracks applied files in `public.schema_migrations`.

```bash
export DATABASE_URL="postgresql://postgres:<DB_PASSWORD>@db.<ref>.supabase.co:5432/postgres"
# TLS is verified. Supabase's direct host uses its own CA; pin it:
#   openssl s_client -showcerts -starttls postgres -connect db.<ref>.supabase.co:5432 </dev/null
# save the LAST cert in the chain to scripts/.supabase-ca.pem, then:
export PGSSLROOTCERT="./scripts/.supabase-ca.pem"

npm run migrate
```

This creates `profiles`, `journal_entries`, `journal_photos`, all indexes, RLS
policies, the profile-provisioning trigger, and the `journal-photos` Storage
bucket + per-user object policies.

## Running locally

```bash
npm install
cp .env.example .env   # then fill in your Supabase values
npm run dev            # http://localhost:5173
```

## Building for production

```bash
npm run build          # tsc + vite build → dist/ (includes service worker)
npm run preview        # serve the production build locally (SW enabled)
```

## Testing

```bash
npm test               # Vitest: sync engine, repositories, content utils
npm run typecheck      # strict TypeScript, no emit
```

The suite (`test/sync.test.ts`) covers the required scenarios against an
in-memory fake gateway + `fake-indexeddb`:

- **Offline creation** — created offline, persists across restart, syncs exactly
  once, no duplicates on repeated sync.
- **Offline editing** — edits made offline reach the server after reconnect.
- **Offline photo** — blob stored locally, survives restart, uploads on
  reconnect, no re-upload on repeat.
- **Deletion** — a synced entry deleted offline is removed server-side and does
  not resurrect on pull; a never-synced entry deleted offline never reaches the
  server.
- **Duplicate prevention** — many edits + repeated syncs → exactly one row.
- **Conflicts** — last-write-wins in both directions, always logging the losing
  version.

## Testing PWA + offline behavior

1. `npm run build && npm run preview`, open the URL, and log in once (online).
2. Open DevTools → Application → Service Workers and confirm the SW is
   **activated** and controlling the page; the precache holds `index.html`, JS,
   CSS, icons, and the manifest.
3. Go offline (DevTools → Network → Offline, or airplane mode) and **reload** —
   the app shell loads from cache and your entries render from IndexedDB. You
   should never see the browser's offline error page.
4. Create/edit entries and attach photos offline; watch the editor show
   *Saved offline*. Go back online and watch it become *Syncing… → Saved*.

The in-app **Dev tools** panel (dev builds only) can simulate offline / inject
sync failures without touching Wi-Fi.

## Synchronization architecture

- **Triggers:** app start, after auth, when connectivity returns, on return to
  foreground, and (debounced) after local mutations while online. A periodic
  safety-net sync also runs while online.
- **Push:** drains the `syncQueue` in order. Because primary keys are
  client-generated UUIDs and writes are **upserts**, pushing is idempotent —
  running sync any number of times never creates duplicates. If an entry is
  edited during its network round-trip, it stays pending and isn't marked
  synced.
- **Pull:** fetches rows with `server_updated_at` greater than a stored cursor,
  paged past the API row cap. The cursor tracks `server_updated_at` — a
  server-managed write time — NOT the entry's logical `updated_at`, so imported
  entries with old dates (e.g. a Day One archive back to 2019) still propagate
  to devices whose cursor is already recent. A small overlap window avoids
  missing concurrent writes; re-pulling is harmless (idempotent upserts).
  Settings → "Reload everything from server" clears the cursor for a full
  re-pull if a device ever drifts.
- **Soft deletes:** deletions are tombstones (`deleted_at`), so a pull can't
  resurrect a deleted entry.
- **Decoupling:** the engine depends only on a `RemoteGateway` interface
  (`src/sync/gateway.ts`), implemented by `SupabaseGateway` in production and by
  a fake in tests — the sync logic is independently testable and has no React
  or Supabase coupling.

## Conflict handling

Single-user, so no CRDTs. Strategy is **last-write-wins** by `updated_at`:

- Local has no pending changes → the server version is authoritative.
- Both changed → newer `updated_at` wins, and the **losing version is written to
  a local `conflicts` table** (never silently discarded). The comparison base is
  refreshed so a subsequent push is measured against the latest server version.

The resolution lives in `SyncEngine.mergeRemoteEntry`, isolated so a more
sophisticated strategy could be introduced later.

## Photos

Picked/captured images are resized (longest edge ≤ 2048px, ~85% quality — not
aggressive) and stored as a **Blob in IndexedDB immediately**, rendered from a
local object URL, and marked pending upload. When online they upload to the
private `journal-photos` bucket at `\<userId>/\<entryId>/\<photoId>.\<ext>` and the
row records the storage path. The user is never asked to retry — failed uploads
stay queued and retry automatically. On another device, pulled photos download
their bytes lazily so they're available offline thereafter.

## Day One import / export

Settings → **Day One** moves your journal in and out of Day One, including
photos (`src/lib/dayone/`).

- **Import** accepts a Day One **JSON export** — either the raw `.json`
  (text-only) or the `.zip` (with a `photos/` folder). Entries are converted
  from Markdown to TipTap JSON, dates/timezones are preserved, and each entry's
  photos are stored locally then queued for upload. Import is **offline-first**
  (writes locally, syncs when online) and **idempotent** — re-importing the same
  export upserts by id instead of duplicating (Day One UUIDs become the record
  ids).
- **Export** produces a Day One-compatible `.zip`: `Journal.json` plus
  `photos/<md5>.<ext>` files with inline `dayone-moment://` references, so it
  re-imports into Day One (or back here) cleanly.

**Storage limits (important for large photo libraries).** The Supabase **free
tier allows 1 GB of Storage** (500 MB DB, 5 GB/mo egress). Text/entries are tiny
(JSONB) and fit easily, but a large Day One photo archive can exceed 1 GB. Also,
a multi-GB `.zip` can't be imported in the browser (the archive is read into
memory). For big libraries: import the **text-only JSON** here, and either keep
photos in Day One, upgrade Supabase (Pro = 100 GB) and import photos in smaller
batches, or store photos locally only.

## Developer tools

In dev builds a floating **🛠 dev** panel (bottom-left) can:

- simulate offline / online (via the web connectivity adapter),
- inject the next N push failures (to exercise retry/queue),
- force a sync now, and
- inspect the pending queue, sync phase, and conflict count.

It is gated by `import.meta.env.DEV` and never ships to production.

## Platform abstraction (native-ready)

All browser-specific capabilities are behind **ports** in `src/platform/ports.ts`
— `ConnectivityPort`, `LifecyclePort`, `MediaPickerPort`, `ImageProcessorPort`,
`SecureStoragePort`. The UI, domain logic, and sync engine never touch
`navigator`, `document`, `localStorage`, or file inputs directly; they call
`getPlatform()`. The web adapters live in `src/platform/web/`. To ship a native
(Capacitor) build, add a `platform/native/` adapter set (Camera plugin, Network
plugin, secure storage, app lifecycle) and call `setPlatform()` at bootstrap —
nothing above the boundary changes. Local persistence uses Dexie/IndexedDB,
which also runs inside a Capacitor WebView.

## Deployment

The frontend is a static SPA — deploy `dist/` to any static host
(Vercel, Netlify, Cloudflare Pages) or serve it directly. No server-side runtime
is required; Supabase is the backend.

**This project (journal.carlosmartinezt.com), served by Caddy on the host:**

```bash
./ops/deploy.sh        # npm ci + build → dist/
```

One-time wiring (needs sudo + DNS):

1. Add a DNS record for `journal.carlosmartinezt.com` pointing at the server.
2. Append the site block and reload Caddy:
   ```bash
   sudo sh -c 'cat deploy/journal.Caddyfile >> /etc/caddy/Caddyfile'
   sudo systemctl reload caddy
   ```

Caddy serves the SPA directly from `dist/` with a client-side-routing fallback,
long-cache for fingerprinted assets, and no-cache for the service worker + shell
so updates roll out immediately. Auto-HTTPS activates once DNS resolves.

## Known PWA limitations on iOS / Safari

- **Install:** iOS has no install prompt — use Share → *Add to Home Screen*.
- **Storage eviction:** iOS may evict IndexedDB/Cache for PWAs after ~7 days of
  no use. Anything already synced is safe on the server and re-pulls on next
  launch; unsynced local-only data could be lost — sync when you can.
- **Camera capture** relies on `<input capture>`; behavior varies by iOS
  version. Library selection always works.
- **Background sync** (Web Periodic Background Sync) isn't available on iOS, so
  syncing happens while the app is foregrounded/open, not in the background.
- Standalone PWAs on iOS get their own storage partition; logging in via Safari
  first then installing may require logging in again inside the installed app.

## Security & data safety

- **Row Level Security** on every table (`auth.uid() = user_id`) and on Storage
  objects (first path segment must equal the user's id) — a user can never read
  or write another user's entries or photos. Verified with cross-user
  insert/upload denial tests.
- Only the **public** Supabase URL + anon key ship in the frontend. The DB
  password / service role never leave admin scripts.
- No analytics, tracking, or third-party ad code. Journal content is never
  logged to the console in production.
- The auth session persists through the `SecureStoragePort` (localStorage on
  web; swappable for the OS keychain on native).
```

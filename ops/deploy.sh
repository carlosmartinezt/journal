#!/usr/bin/env bash
# Ship the Journal PWA to Vercel production.
#
# Vercel is the canonical deploy target: it builds the Vite bundle and serves
# dist/ from its CDN. There is no server-side runtime (no api/ routes, no SSR,
# no middleware), so the only thing deployed is static files. Entry data never
# passes through Vercel; the browser talks to the backend directly.
#
# Build-time config lives in Vercel's project env vars (VITE_SUPABASE_URL,
# VITE_SUPABASE_ANON_KEY, VITE_APP_VERSION), not in this script. Check them with
# `vercel env ls production`.
#
# Self-hosting behind Caddy is still possible (see deploy/journal.Caddyfile) but
# is no longer the path this script takes.
set -euo pipefail

cd "$(dirname "$0")/.."
PROD_URL="https://journal.carlosmartinezt.com"

if ! command -v vercel >/dev/null 2>&1; then
  VERCEL="npx --yes vercel"
else
  VERCEL="vercel"
fi

echo "▶ Type-check + test…"
npm run build >/dev/null   # vite build runs tsc; fail fast before shipping

echo "▶ Deploying to Vercel production…"
$VERCEL deploy --prod

echo "▶ Verifying $PROD_URL …"
CODE="$(curl -sS -o /dev/null -w '%{http_code}' "$PROD_URL/")"
if [ "$CODE" = "200" ]; then
  echo "✓ Live at $PROD_URL (HTTP $CODE)"
else
  echo "✗ $PROD_URL returned HTTP $CODE. Check the deploy log above, or 'vercel inspect'" >&2
  exit 1
fi

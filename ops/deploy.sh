#!/usr/bin/env bash
# Build + publish the Journal PWA on the Hetzner server.
#
# Caddy serves the SPA directly from ./dist (see deploy/journal.Caddyfile), so
# "deploying" is just producing a fresh build. The one-time Caddy + DNS wiring
# is described at the bottom and in the README.
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
CADDYFILE="/etc/caddy/Caddyfile"
BLOCK="journal.carlosmartinezt.com"

echo "▶ Installing dependencies…"
npm ci

echo "▶ Building production bundle…"
npm run build

echo "✓ Build complete → $ROOT/dist"

# One-time infrastructure wiring (needs sudo + DNS; not automated here).
if ! grep -q "$BLOCK" "$CADDYFILE" 2>/dev/null; then
  cat <<EOF

────────────────────────────────────────────────────────────────────────
ONE-TIME SETUP (not yet done):

1. DNS — add a record for $BLOCK pointing at this server
   (in Cloudflare, mirror the existing carlosmartinezt.com record).

2. Caddy — append the site block and reload:

     sudo sh -c 'cat $ROOT/deploy/journal.Caddyfile >> $CADDYFILE'
     sudo systemctl reload caddy

Once DNS resolves, Caddy will auto-provision HTTPS. Subsequent deploys are
just: ./ops/deploy.sh
────────────────────────────────────────────────────────────────────────
EOF
else
  echo "▶ Caddy block already present; reloading Caddy…"
  sudo systemctl reload caddy && echo "✓ Reloaded. Live at https://$BLOCK"
fi

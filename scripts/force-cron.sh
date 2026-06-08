#!/usr/bin/env bash
# Force-trigger a staging or production cron route for smoke testing.
#
# Usage:
#   bash scripts/force-cron.sh <route> <submissionId>            # staging (default)
#   bash scripts/force-cron.sh <route> <submissionId> --prod     # production
#
# <route>: one of the directories under src/app/api/cron/ (e.g. email-day-7-deliver, email-day-7, cleanup, reconcile).
# <submissionId>: appended as ?force=<id> for routes that support single-record force-mode.
#
# Auth: cloudflared access token (clears CF Access) + Bearer CRON_SECRET from .env.<env>.
# Prereq: `brew install cloudflared` + `cloudflared access login https://staging.withjosephine.com` (one-time per host).
set -euo pipefail

ROUTE="${1:-}"
ID="${2:-}"
MODE="${3:-staging}"

if [ -z "$ROUTE" ] || [ -z "$ID" ]; then
  echo "usage: $0 <route> <submissionId> [--prod]" >&2
  exit 2
fi

if [ "$MODE" = "--prod" ]; then
  HOST="withjosephine.com"
  ENV_FILE=".env.production"
else
  HOST="staging.withjosephine.com"
  ENV_FILE=".env.staging"
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_PATH="$ROOT_DIR/$ENV_FILE"

if [ ! -f "$ENV_PATH" ]; then
  echo "missing $ENV_PATH" >&2
  exit 2
fi

CRON_SECRET="$(grep -E "^CRON_SECRET=" "$ENV_PATH" | head -1 | sed -E 's/^CRON_SECRET=//; s/^"//; s/"$//')"
if [ -z "$CRON_SECRET" ]; then
  echo "CRON_SECRET not found in $ENV_PATH" >&2
  exit 2
fi

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared not installed. Run: brew install cloudflared" >&2
  exit 2
fi

TOK="$(cloudflared access token --app="https://$HOST")"
if [ -z "$TOK" ]; then
  echo "cloudflared access token empty. Run: cloudflared access login https://$HOST" >&2
  exit 2
fi

URL="https://$HOST/api/cron/$ROUTE?force=$ID"
echo "POST $URL"
curl -sS -X POST \
  -H "cf-access-token: $TOK" \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$URL"
echo

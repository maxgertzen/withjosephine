#!/usr/bin/env bash
set -u

waits_between_attempts=(30 90)
build_log=$(mktemp)
trap 'rm -f "$build_log"' EXIT

font_fetch_failure="internal/font/google/font|Failed to fetch .* from Google Fonts"

attempt=1
while true; do
  "$@" 2>&1 | tee "$build_log"
  status=${PIPESTATUS[0]}
  if [ "$status" -eq 0 ]; then
    exit 0
  fi
  if ! grep -qE "$font_fetch_failure" "$build_log"; then
    exit "$status"
  fi
  if [ "$attempt" -gt "${#waits_between_attempts[@]}" ]; then
    exit "$status"
  fi
  wait_seconds=${waits_between_attempts[$((attempt - 1))]}
  echo "::warning::A Google Fonts download failed, retrying in ${wait_seconds}s (attempt $attempt)"
  sleep "$wait_seconds"
  attempt=$((attempt + 1))
done

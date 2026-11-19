#!/bin/sh
# Renders the SearXNG settings template with the runtime-injected secret and then
# hands control to the stock upstream entrypoint.
#
# SearXNG reads configuration only from SEARXNG_SETTINGS_PATH (there is no per-key
# env override), so the rendered file must live on a writable path. /etc/searxng is
# read-only here because the template ships in the image layer.
set -eu

if [ -z "${SEARXNG_SECRET:-}" ]; then
  echo "ERROR: SEARXNG_SECRET is required. Generate one with: openssl rand -hex 32" >&2
  exit 1
fi

RUNTIME_DIR=/run/searxng
mkdir -p "$RUNTIME_DIR"

# The secret is substituted with awk rather than sed so the token can contain any
# character (including sed's own delimiters) without breaking the render.
awk -v secret="$SEARXNG_SECRET" '{gsub(/\$\{SEARXNG_SECRET\}/, secret); print}' \
  /etc/searxng/settings.yml.template > "$RUNTIME_DIR/settings.yml"

if grep -q '\${SEARXNG_SECRET}' "$RUNTIME_DIR/settings.yml"; then
  echo "ERROR: secret placeholder survived rendering" >&2
  exit 1
fi

export SEARXNG_SETTINGS_PATH="$RUNTIME_DIR/settings.yml"

exec /usr/local/searxng/entrypoint.sh

# TruckFull SearXNG container image for Cloudflare Containers.
#
# The container is never exposed directly: the Worker in worker/searxng.mjs is the
# only path in, and it authenticates every request before waking the container.
#
# The SearXNG secret_key is deliberately NOT baked into this image. SearXNG has no
# per-key environment override (only SEARXNG_SETTINGS_PATH), so render-settings.sh
# injects the secret into a writable copy of the template at container start.
FROM searxng/searxng:2026.9.25-12f8b6515@sha256:5286edb35782454ab8a102c5eff6b54bff745853191b46aeead95f225aa6dfb6

COPY --chmod=0755 render-settings.sh /usr/local/bin/render-settings.sh
COPY settings.yml /etc/searxng/settings.yml.template

ENTRYPOINT ["/usr/local/bin/render-settings.sh"]

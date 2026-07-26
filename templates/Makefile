# learno study workspace.
#
# Copied here by `make install-workspace DEST=...` from the learno engine.
# Assumes the engine lives at skill/ (submodule or vendored copy).

PORT       ?= 9990
SERVER_DIR := skill/server

.PHONY: help start local stop

help:
	@echo "  make start   server + public Cloudflare URL (open lessons on your phone)"
	@echo "  make local   server on localhost only"
	@echo "  make stop    kill whatever holds :$(PORT)"

# Server + a public Cloudflare quick tunnel, so the lessons open on a phone.
# Ctrl-C tears both down.
#
# The printed *.trycloudflare.com hostname is random per run and
# UNAUTHENTICATED — anyone holding it reaches this workspace's files and the
# /api routes, which spend your Gemini key. Use `make local` when you are at
# the desk and don't need the phone.
start:
	@command -v cloudflared >/dev/null || { echo "cloudflared not installed: brew install cloudflared"; exit 1; }
	@set -m; \
	(cd $(SERVER_DIR) && exec node --watch index.js) & srv=$$!; \
	trap 'kill $$srv 2>/dev/null; exit 0' INT TERM EXIT; \
	until curl -sf http://localhost:$(PORT)/api/health >/dev/null 2>&1; do sleep 0.3; done; \
	echo "learno-server up on :$(PORT) — opening Cloudflare tunnel…"; \
	cloudflared tunnel --no-autoupdate --url http://localhost:$(PORT)

# Localhost only, no public exposure.
local:
	cd $(SERVER_DIR) && exec node --watch index.js

stop:
	@lsof -ti :$(PORT) 2>/dev/null | while read p; do kill $$p; done; \
	pkill -f "cloudflared tunnel --no-autoupdate --url http://localhost:$(PORT)" 2>/dev/null; \
	echo "stopped"

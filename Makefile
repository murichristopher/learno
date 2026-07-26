# learno — engine development.
#
# This Makefile is for working ON the engine. The Makefile a study workspace
# uses is templates/Makefile, which `make install-workspace` copies out.
#
# The sandbox runs with no MongoDB and no Gemini key: LEARNO_MODE=sandbox swaps
# in an in-memory store seeded from sandbox/fixtures/seed.json and a stubbed
# validator. State resets on every restart, so the starting point is always the
# same and a visual diff means a real regression.

PORT      ?= 9991
SANDBOX   := $(CURDIR)/sandbox
SERVER    := $(CURDIR)/server
RUN        = LEARNO_MODE=sandbox LEARNO_WORKSPACE=$(SANDBOX) PORT=$(PORT)

.PHONY: help sandbox tunnel stop check deps install-workspace

# The engine repo ships no node_modules; install on first run so a fresh clone
# goes straight to `make sandbox` without a separate setup step.
deps:
	@test -d $(SERVER)/node_modules || (cd $(SERVER) && npm install --silent)

help:
	@echo "learno engine"
	@echo "  make sandbox            serve the sandbox workspace on :$(PORT) (no DB, no API key)"
	@echo "  make tunnel             same, plus a public Cloudflare URL for phone testing"
	@echo "  make check              syntax-check the server and validate the seed fixture"
	@echo "  make stop               kill whatever holds :$(PORT)"
	@echo "  make install-workspace DEST=../my-study   copy the workspace Makefile into a study repo"

# Kitchen-sink lesson + dashboard, wired to the stubbed backend.
sandbox: deps
	@echo "sandbox → http://localhost:$(PORT)/lessons/0001-kitchen-sink.html"
	@echo "        → http://localhost:$(PORT)/reference/my-learning.html"
	@$(RUN) node --watch $(SERVER)/index.js

# Same, exposed publicly so the layout can be checked on a real phone.
# The *.trycloudflare.com hostname is random per run and unauthenticated — it is
# only ever pointed at the sandbox, which holds fixtures rather than real data.
tunnel: deps
	@command -v cloudflared >/dev/null || { echo "cloudflared not installed: brew install cloudflared"; exit 1; }
	@set -m; \
	$(RUN) node --watch $(SERVER)/index.js & srv=$$!; \
	trap 'kill $$srv 2>/dev/null; exit 0' INT TERM EXIT; \
	until curl -sf http://localhost:$(PORT)/api/health >/dev/null 2>&1; do sleep 0.3; done; \
	echo "sandbox up on :$(PORT) — opening Cloudflare tunnel…"; \
	cloudflared tunnel --no-autoupdate --url http://localhost:$(PORT)

check: deps
	@for f in $(SERVER)/index.js $(SERVER)/db.js $(SERVER)/memdb.js \
	          $(SERVER)/sandbox-validator.js $(SERVER)/routes/*.js; do \
	  node --check $$f || exit 1; \
	done
	@node -e "JSON.parse(require('fs').readFileSync('$(SANDBOX)/fixtures/seed.json','utf8'))" \
	  && echo "ok — server parses, seed.json is valid"

stop:
	@lsof -ti :$(PORT) 2>/dev/null | while read p; do kill $$p; done; \
	pkill -f "cloudflared tunnel --no-autoupdate --url http://localhost:$(PORT)" 2>/dev/null; \
	echo "stopped"

# Study workspaces need their own Makefile (its paths point at skill/server).
install-workspace:
	@test -n "$(DEST)" || { echo "usage: make install-workspace DEST=../my-study"; exit 1; }
	@test -d "$(DEST)" || { echo "no such directory: $(DEST)"; exit 1; }
	@if [ -e "$(DEST)/Makefile" ]; then \
	  echo "$(DEST)/Makefile already exists — diff and merge by hand:"; \
	  diff -u "$(DEST)/Makefile" templates/Makefile || true; \
	else \
	  cp templates/Makefile "$(DEST)/Makefile" && echo "wrote $(DEST)/Makefile"; \
	fi

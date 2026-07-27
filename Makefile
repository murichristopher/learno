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

.PHONY: help sandbox local stop check deps install-workspace build lesson check-errors

# Neither the engine nor the build ships node_modules; install on first run so a
# fresh clone goes straight to `make sandbox` without a separate setup step.
deps:
	@test -d $(SERVER)/node_modules || (cd $(SERVER) && npm install --silent)
	@test -d $(CURDIR)/node_modules || npm install --silent

help:
	@echo "learno engine"
	@echo "  make build              render every lesson from its .json + .yml"
	@echo "  make lesson SRC=...     render one (SRC=lessons/0011-name)"
	@echo "  make check-errors       show the build refusing four broken lessons"
	@echo "  make sandbox            serve the sandbox + a public Cloudflare URL (no DB, no API key)"
	@echo "  make local              same, localhost only — no tunnel"
	@echo "  make check              syntax-check the server and validate the seed fixture"
	@echo "  make stop               kill whatever holds :$(PORT)"
	@echo "  make install-workspace DEST=../my-study   copy the workspace Makefile into a study repo"

# ── build ────────────────────────────────────────────────────────────────────

build: deps
	@node build/render.js --all

lesson: deps
	@test -n "$(SRC)" || { echo "usage: make lesson SRC=lessons/0011-name"; exit 1; }
	@node build/render.js $(SRC)

# The failure paths matter as much as the happy one: a lesson that renders
# half-way still looks finished. Each of these must fail, so the target inverts
# the exit code and complains if one of them ever succeeds.
check-errors: deps
	@for f in unknown-component dangling-ref coloured-svg missing-prop bad-lang; do \
	  echo "──────── $$f ────────"; \
	  out=$$(node build/render.js sandbox/broken/$$f 2>&1); rc=$$?; \
	  echo "$$out" | grep -v 'assets/components.css'; \
	  if [ $$rc -eq 0 ]; then \
	    echo "  ✗ FALHOU: essa lição deveria ter sido recusada"; exit 1; \
	  fi; \
	  if [ -f sandbox/broken/$$f.html ]; then \
	    echo "  ✗ FALHOU: escreveu HTML apesar do erro"; exit 1; \
	  fi; \
	done; \
	echo; echo "ok — as $$(echo unknown-component dangling-ref coloured-svg missing-prop bad-lang | wc -w | tr -d " ") lições quebradas foram recusadas, nenhum HTML escrito"

# Kitchen-sink lesson + dashboard, wired to the stubbed backend and exposed
# through a Cloudflare quick tunnel so the layout can be checked on a real phone.
# Ctrl-C tears both down.
#
# The *.trycloudflare.com hostname is random per run and unauthenticated. That is
# acceptable here in a way it is not for a study workspace: this only ever serves
# sandbox/, which is fixtures about a fake subject, backed by an in-memory store
# and a stubbed validator — no real progress, no database, no API key to spend.
sandbox: deps
	@command -v cloudflared >/dev/null || { echo "cloudflared not installed: brew install cloudflared (or use: make local)"; exit 1; }
	@set -m; \
	$(RUN) node --watch $(SERVER)/index.js & srv=$$!; \
	trap 'kill $$srv 2>/dev/null; exit 0' INT TERM EXIT; \
	until curl -sf http://localhost:$(PORT)/api/health >/dev/null 2>&1; do sleep 0.3; done; \
	echo "sandbox up on :$(PORT) — opening Cloudflare tunnel…"; \
	echo "  local → http://localhost:$(PORT)/lessons/0001-kitchen-sink.html"; \
	cloudflared tunnel --no-autoupdate --url http://localhost:$(PORT)

# Localhost only — for when cloudflared is unavailable or you're offline.
local: deps
	@echo "sandbox → http://localhost:$(PORT)/lessons/0001-kitchen-sink.html"
	@echo "        → http://localhost:$(PORT)/reference/my-learning.html"
	@$(RUN) node --watch $(SERVER)/index.js

check: deps
	@for f in $(SERVER)/index.js $(SERVER)/db.js $(SERVER)/memdb.js \
	          $(SERVER)/sandbox-validator.js $(SERVER)/workspace.js $(SERVER)/routes/*.js; do \
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

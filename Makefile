# learno
#
# The repo is the workspace: you fork it and study inside the fork. Your lessons,
# reviews and notes sit at the root beside the engine — there is no skill/
# subdirectory and nothing is vendored.
#
# Two things can be served, and they are different jobs:
#
#   make start     your study workspace  (repo root, port 9990)
#   make sandbox   the engine's fixtures (sandbox/,   port 9991)
#
# The sandbox needs no MongoDB and no Gemini key: LEARNO_MODE=sandbox swaps in an
# in-memory store and a stubbed validator, so its state resets on every restart
# and a visual difference means a real regression.

PORT      ?= 9990
SBX_PORT  ?= 9991
ROOT      := $(CURDIR)
SANDBOX   := $(CURDIR)/sandbox
SERVER    := $(CURDIR)/server
SBX_RUN    = LEARNO_MODE=sandbox LEARNO_WORKSPACE=$(SANDBOX) PORT=$(SBX_PORT)

.PHONY: help start local sandbox sandbox-local stop check deps build lesson catalog check-errors compare

deps:
	@test -d $(SERVER)/node_modules || (cd $(SERVER) && npm install --silent)
	@test -d $(ROOT)/node_modules   || npm install --silent

help:
	@echo "learno"
	@echo
	@echo "  study"
	@echo "    make start            serve your workspace + a public Cloudflare URL  (:$(PORT))"
	@echo "    make local            same, localhost only"
	@echo
	@echo "  authoring"
	@echo "    make build            render every lesson from its .json + .yml"
	@echo "    make lesson SRC=...   render one (SRC=lessons/0011-name)"
	@echo "    make catalog          regenerate COMPONENTS.md and the component gallery"
	@echo "    make compare HAND=... SRC=...   measure authored size against hand-written lessons"
	@echo
	@echo "  engine development"
	@echo "    make sandbox          serve the fixtures + a public URL  (:$(SBX_PORT))"
	@echo "    make sandbox-local    same, localhost only"
	@echo "    make check            syntax-check the server, the build and the seed"
	@echo "    make check-errors     show the build refusing broken lessons"
	@echo
	@echo "    make stop             kill whatever holds :$(PORT) and :$(SBX_PORT)"

# ── study ────────────────────────────────────────────────────────────────────

# Your workspace, plus a Cloudflare quick tunnel so lessons open on a phone.
# The *.trycloudflare.com hostname is random per run and UNAUTHENTICATED —
# anyone holding it reaches your workspace and the /api routes, which spend your
# Gemini key. Use `make local` when you are at the desk.
start: deps
	@command -v cloudflared >/dev/null || { echo "cloudflared not installed: brew install cloudflared (or use: make local)"; exit 1; }
	@set -m; \
	PORT=$(PORT) node --watch $(SERVER)/index.js & srv=$$!; \
	trap 'kill $$srv 2>/dev/null; exit 0' INT TERM EXIT; \
	until curl -sf http://localhost:$(PORT)/api/health >/dev/null 2>&1; do sleep 0.3; done; \
	echo "workspace up on :$(PORT) — opening Cloudflare tunnel…"; \
	cloudflared tunnel --no-autoupdate --url http://localhost:$(PORT)

local: deps
	@echo "workspace → http://localhost:$(PORT)/"
	@PORT=$(PORT) node --watch $(SERVER)/index.js

# ── authoring ────────────────────────────────────────────────────────────────

# The catalog runs first: both artifacts come from the component files, so a
# build always ships a registry and a gallery matching the vocabulary it used.
build: deps catalog
	@node build/render.js --all

catalog: deps
	@node build/catalog.js

lesson: deps
	@test -n "$(SRC)" || { echo "usage: make lesson SRC=lessons/0011-name"; exit 1; }
	@node build/render.js $(SRC)

# What the pipeline actually bought. HAND is a glob of hand-written lessons to
# measure against — they live in a study workspace, not here.
#   make compare HAND='../system-design/lessons/*.html' SRC=lessons/0011-async-jobs
compare: deps
	@test -n "$(HAND)" || { echo "usage: make compare HAND='../study/lessons/*.html' SRC=lessons/0011-name"; exit 1; }
	@test -n "$(SRC)"  || { echo "usage: make compare HAND='../study/lessons/*.html' SRC=lessons/0011-name"; exit 1; }
	@node build/compare.js $(HAND) --against $(SRC)

# ── engine development ───────────────────────────────────────────────────────

sandbox: deps
	@command -v cloudflared >/dev/null || { echo "cloudflared not installed: brew install cloudflared (or use: make sandbox-local)"; exit 1; }
	@set -m; \
	$(SBX_RUN) node --watch $(SERVER)/index.js & srv=$$!; \
	trap 'kill $$srv 2>/dev/null; exit 0' INT TERM EXIT; \
	until curl -sf http://localhost:$(SBX_PORT)/api/health >/dev/null 2>&1; do sleep 0.3; done; \
	echo "sandbox up on :$(SBX_PORT) — opening Cloudflare tunnel…"; \
	cloudflared tunnel --no-autoupdate --url http://localhost:$(SBX_PORT)

sandbox-local: deps
	@echo "sandbox → http://localhost:$(SBX_PORT)/components.html"
	@$(SBX_RUN) node --watch $(SERVER)/index.js

check: deps
	@for f in $(SERVER)/index.js $(SERVER)/db.js $(SERVER)/memdb.js \
	          $(SERVER)/sandbox-validator.js $(SERVER)/workspace.js \
	          $(SERVER)/routes/*.js $(ROOT)/build/*.js; do \
	  node --check $$f || exit 1; \
	done
	@node -e "JSON.parse(require('fs').readFileSync('$(SANDBOX)/fixtures/seed.json','utf8'))" \
	  && echo "ok — server and build parse, seed.json is valid"

# The failure paths matter as much as the happy one: a lesson that renders
# half-way still looks finished. Each of these must fail, so the target inverts
# the exit code and complains if one of them ever succeeds.
check-errors: deps
	@for f in unknown-component dangling-ref coloured-svg overflow-svg missing-prop bad-lang bad-icon wrong-shape; do \
	  echo "──────── $$f ────────"; \
	  out=$$(node build/render.js sandbox/broken/$$f 2>&1); rc=$$?; \
	  echo "$$out" | grep -v 'assets/components.css'; \
	  if [ $$rc -eq 0 ]; then \
	    echo "  ✗ FAILED: this lesson should have been refused"; exit 1; \
	  fi; \
	  if [ -f sandbox/broken/$$f.html ]; then \
	    echo "  ✗ FAILED: wrote HTML despite the error"; exit 1; \
	  fi; \
	done; \
	echo; echo "ok — every broken lesson was refused, no HTML written"

stop:
	@for p in $(PORT) $(SBX_PORT); do \
	  lsof -ti :$$p 2>/dev/null | while read pid; do kill $$pid; done; \
	  pkill -f "cloudflared tunnel --no-autoupdate --url http://localhost:$$p" 2>/dev/null; \
	done; \
	echo "stopped"

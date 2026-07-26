# learno — working agreement

This is a **learno** study workspace (the `learno` tutoring engine, in `skill/`).

## Ground every learning answer in REAL data

In any interaction touching the user's **progress, answers, mastery, what to review, or what to learn next**, consult the **`learno-analyst`** agent FIRST — never assert a score, mastery state, due review, struggle, or "you got X right/wrong" from memory or assumption. Pull it from MongoDB (`lessons`, `concepts`, `section_results`, `conversations`) and the workspace files. The agent's full query protocol and schema live in `skill/agents/learno-analyst.md`.

Apply this every time the user says things like:
- *"valida minhas respostas"* / *"como fui na lição X"* → analyst reads `section_results` (per-section scores + misconceptions).
- *"como estou / meu progresso"* → analyst summarizes `concepts` + `lessons`.
- *"o que revisar / o que estudo agora"* → analyst checks SM-2 due + recurring misconceptions; then the tutor decides.

Bring **data + insight** (real scores, dates, recurring misconceptions, what's due), not generic encouragement. If there's no record, say so — don't fabricate.

Routine non-learning requests (fix a typo, tweak CSS, run the server) don't need the analyst — use judgment. But the moment the answer would make a claim about how the user is doing, the data comes first.

## Every feature ships with a validation script

A feature is not delivered until the user can **check it themselves**. "I ran a
curl and it returned 200" is your evidence, not theirs — they need steps they
can perform in the browser.

So end every feature with a numbered script of scenarios, **written out as text
in the delivery message**. Do not put it in the page, in a file, or anywhere the
user has to go looking — it goes in the reply, where they are already reading.

Each scenario is:

1. **the action** — what to click, type, or open, concretely (not "test the quiz")
2. **the expected result** — precise enough that a wrong outcome is unambiguous
3. **the failure it catches** — one line on what breaks if it doesn't hold

Cover the **unhappy paths too**: empty state, offline, a wrong answer, a missing
file, the smallest viewport. A script that only walks the happy path proves
nothing worth proving.

State plainly which scenarios you verified yourself and which only the user can
close — never present a curl as though it were a browser, and never imply they
confirmed something they have not yet looked at.

## Setup (per workspace)
- Install the agent so it's discoverable: symlink or copy `skill/agents/learno-analyst.md` into `.claude/agents/` (project) or `~/.claude/agents/` (all studies).
- To inherit this agreement at the workspace root, add `@skill/CLAUDE.md` to the workspace's own `CLAUDE.md`.

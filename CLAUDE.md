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

## Everything you write about the code is in English

Pull requests, commit messages, code, comments and documentation: English,
always, regardless of the language the conversation is happening in.

The one exception is **lesson content** — `MISSION.md`, the `.yml` files, prose,
questions, feedback. That follows the learner's language, because it is the
material being studied rather than something written about the code.

## Comments are the exception

A comment is worth writing when it explains **why the code is not the obvious
way**: a browser bug being worked around, an ordering that looks arbitrary but is
load-bearing, an attribute whose absence fails silently. Someone will otherwise
"fix" it back.

Not worth writing:

- what the code already says
- the justification for a choice nobody would question
- the history of what was tried before — that is what git is for
- a paragraph above a component explaining its purpose, when `meta.purpose` and
  `LESSON-FORMAT.md` already carry it

If a paragraph is needed to make code understandable, the code is usually the
problem. Prefer a clearer name.

## Pull request structure

Every PR uses these sections, in this order:

```markdown
## Motivation
Why this exists. The problem, not the solution — and measured wherever a number
is available.

## Technical details
- Bullet points. What changed and, where it is not obvious, why that way.
- Decisions someone might reasonably have made differently belong here, stated
  as decisions rather than smuggled in as facts.

## Test scenarios
Numbered, step by step, each one something the reviewer can SEE. Give the exact
URL, the exact input to type, and the exact thing that should appear on screen.

## Problems this PR may introduce
Honest risks: what could break, what was not covered, what you could not test.
"None" is only acceptable when it is true.
```

**If a change cannot be seen or exercised easily, it is not ready to be a PR.**
Split it, or add the thing that makes it visible — a fixture, a page, a command
whose output is the evidence. A reviewer should never have to take your word for
it.

Say plainly which scenarios you ran yourself and which only the reviewer can
close. Never present a curl as though it were a browser.

## Setup (per workspace)
- Install the agent so it's discoverable: symlink or copy `skill/agents/learno-analyst.md` into `.claude/agents/` (project) or `~/.claude/agents/` (all studies).
- To inherit this agreement at the workspace root, add `@skill/CLAUDE.md` to the workspace's own `CLAUDE.md`.

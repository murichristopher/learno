# sandbox/

A throwaway study workspace used to develop the engine itself.

Everything here is fixture data about a fake subject ("Widgets Distribuídos").
Nothing in this directory is real learning content, and nothing written here
while clicking around survives a restart.

## Running it

```sh
make sandbox          # http://localhost:9991
make tunnel           # same, plus a public URL for testing on a phone
```

No `MONGODB_URI` and no `GEMINI_API_KEY` are needed — that is the point. A
client can clone the engine and see a lesson render without provisioning
anything.

- **Store** — in-memory, seeded from `fixtures/seed.json` at boot.
  `routes/progress.js` runs against it unmodified, so the real SM-2 scheduling
  code is genuinely exercised rather than stubbed.
- **Validator** — `server/sandbox-validator.js` replaces the Gemini call with a
  deterministic verdict, so scoring is free, instant, and repeatable.

## Forcing each score band

Prefix an answer with one of these to pin the verdict; without a token the score
comes from the answer's length.

| Prefix | Score | State                     |
|--------|-------|---------------------------|
| `!0`   | 22    | concept not understood    |
| `!p`   | 61    | partial understanding     |
| `!ok`  | 82    | solid                     |
| `!m`   | 95    | mastery                   |

## What to check after changing the format or the styles

`lessons/0001-kitchen-sink.html` contains one instance of every block
`LESSON-FORMAT.md` defines, each labelled with the component name — so a layout
regression shows up on one page instead of across ten real lessons.

`fixtures/seed.json` is shaped to light up every dashboard branch at once:
mastered and not-mastered concepts, one review overdue, one due today, one
scheduled ahead, a concept mastered by conversation rather than by a lesson, and
a lesson with mixed section scores including recorded misconceptions. Dates are
written as `{ "$daysFromNow": N }` and resolved at load, so "due today" stays
true forever instead of rotting.

## Adding to it

When you add a block to `LESSON-FORMAT.md`, add an instance of it to the
kitchen-sink lesson in the same commit. The fixture is only worth having if it
stays exhaustive.

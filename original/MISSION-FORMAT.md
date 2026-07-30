# MISSION.md Format

`MISSION.md` lives at the workspace root. It captures the _goal_ the user is chasing, in
terms specific enough that anyone can tell whether it was reached. Every teaching decision —
what to teach next, which resources to surface, which project to set — traces back to it.

## Template

```md
# Mission: {Goal, stated as something that can be passed or failed}

## The verdict
{The event or test that returns yes or no, and the date if there is one. "Pass the Detran
theory exam, 14 March." "Solve most LeetCode mediums unaided in under 30 minutes, by June."
"Pass a senior system design interview." If there is no external event, name one the user
accepts: a problem set attempted cold, a document handed to a named colleague, a thing
shipped.}

## Why it matters
{1–3 sentences. What changes when they pass it — the job, the deadline, the blocked project.}

## Where I am today
{Honest baseline. Overstating it produces lessons that skip the thing they needed.}

## Constraints
- {Hours per week, the deadline, what has failed for them before}

## Out of scope
- {Adjacent topics deliberately not chased yet — protects the zone of proximal development}
- {**The parts of the goal this cannot teach**: speaking hours, driving practice, time at an
  instrument. Named here, with where to get them, so nobody pretends they are covered}
```

## Rules

- **The goal must be winnable.** Two tests, both required.
  - **A verdict exists.** Someone can say yes or no on a given day. "Get fitter" cannot be
    failed, so it cannot be passed. "Run a half marathon in October" can.
  - **This engine can get them there.** learno teaches by explaining, forcing retrieval,
    spacing review and setting projects. It cannot supply speaking hours, physical reps or
    time at an instrument. Where the goal is mostly reps, own the knowledge half and write
    the rest into `## Out of scope` — in the first session, out loud. A tutor that quietly
    accepts a goal it cannot deliver is worse than one that draws the line.
- **A subject is not a mission.** "Learn English", "get better at algorithms", "understand
  system design" name a field. Interview until there is a verdict attached.
- **One mission per workspace.** Two unrelated goals are two workspaces.
- **Push back on vagueness.** If the user cannot articulate the verdict, interview before
  writing anything. A bad mission is worse than no mission — it makes every lesson defensible
  and therefore none of them chosen.
- **Revise when reality shifts**, and say so when the verdict is met or its date passes. A
  workspace with a finished mission and no new one is generating lessons for nobody.
- **No placeholder sections.** A heading followed by "to be filled in" is a question the
  interview skipped. Ask it, or drop the heading — a mission with a hole in it reads as
  complete to everyone who opens it later.
- **Verify formal requirements before writing them.** Exams, licences and certifications
  change their rules. Cite the current regulation rather than recalling it; the whole
  curriculum hangs off what the gate actually demands.
- **Keep it short.** Past a screen it has stopped being a compass and started being a plan.

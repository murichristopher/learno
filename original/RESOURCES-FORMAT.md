# RESOURCES.md Format

`RESOURCES.md` is the curated, **tiered** set of trusted sources for this topic. Lesson **Knowledge** is drawn from the canonical tier — never from parametric guesses. **Wisdom** comes from the communities at the bottom.

The user usually does NOT know the canonical texts of a new field — discovering them is the skill's job. See **Source Discovery & Curation** in [SKILL.md](./SKILL.md): the agent searches for the field's authoritative sources, asks the user what they already own, proposes a ranked list, and (after the user confirms) writes it here.

## Tiers

- **Tier 1 — Canonical (Knowledge):** the field's reference texts, seminal papers, primary/official docs. **Lessons must be grounded in these.** Prefer primary over derivative.
- **Tier 2 — Orientation:** high-quality videos, primers, and long-form by recognised experts — good for quick framing before going deep. Not the basis of a lesson on their own.
- **Tier 3 — Wisdom (Communities):** high-signal, well-moderated communities for real-world trade-offs and sanity checks. Never the source of a factual explanation.

## Structure

```md
# {Topic} Resources

## Tier 1 — Canonical (Knowledge)

- [Book: _The Science and Practice of Strength Training_ — Zatsiorsky & Kraemer]  ·  owned: file:///Users/me/Books/zatsiorsky.pdf
  The reference text on programming and adaptation. Use for: periodisation, recovery, intensity zones.
- [Paper: "Resistance Training Volume & Hypertrophy" — Schoenfeld et al.](https://doi.org/xxxx)  ·  not owned (open access)
  Primary, peer-reviewed evidence. Use for: weekly set targets per muscle group.

## Tier 2 — Orientation

- [Article: "How Much Should I Train?" — Greg Nuckols (Stronger By Science)](https://example.com)
  Evidence-based summary by a recognised expert. Use for: quick orientation before the primary papers.

## Tier 3 — Wisdom (Communities)

- [r/weightroom](https://reddit.com/r/weightroom)
  Well-moderated, anti-bro-science. Use for: programme critique, plateau troubleshooting.

## Gaps

- No strong primary source yet for {area the mission needs}. Drives the next Source Discovery pass.
```

## Rules

- **Canonical first.** Every lesson anchors in a Tier 1 source and cites it in the footer. Tier 3 never grounds an explanation — it's for real-world feeling only.
- **High-trust only.** Primary sources, recognised experts, peer-reviewed work, well-moderated communities. If a resource is marketing dressed as education, leave it out.
- **Mark possession.** Tag each Tier 1 entry `owned: file://…` or `not owned`. Owned sources unlock deep grounding — `Read` the chapter before writing the lesson. For not-owned, note a legitimate way to obtain it (publisher, library, official site); **never link or suggest piracy.**
- **Annotate every entry.** A bare link is useless in three months. One line: what it covers and when to reach for it.
- **Surface gaps explicitly.** A `## Gaps` section lists what's missing for the mission; it drives the next Source Discovery pass.
- **Prune ruthlessly.** A source that turned out wrong, shallow, or off-mission is removed, not buried. Five sharp sources beat thirty mediocre ones.
- **Record community preferences.** If the user has opted out of communities, note it here so future sessions don't keep proposing them.

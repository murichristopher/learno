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

## Setup (per workspace)
- Install the agent so it's discoverable: symlink or copy `skill/agents/learno-analyst.md` into `.claude/agents/` (project) or `~/.claude/agents/` (all studies).
- To inherit this agreement at the workspace root, add `@skill/CLAUDE.md` to the workspace's own `CLAUDE.md`.

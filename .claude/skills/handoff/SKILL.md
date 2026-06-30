---
name: handoff
description: Write an end-of-session handoff entry into docs/session-log.md so the next session can pick up cleanly. Use when wrapping up a working session, when the user says "handoff", "wrap up", "log this session", "prepare the next session", or before stopping work for the day.
---

# Session handoff

Produce a concise, high-signal handoff entry and prepend it to `docs/session-log.md`. The
goal is that a fresh session — with none of this conversation's context — can read the top
entry and immediately know the state of the world and what to do next.

## Steps

1. **Gather the facts (don't guess):**
   - `git log --oneline -10` and `git status --short` to see what changed and whether it's committed/pushed.
   - Read the current top entry of `docs/session-log.md` so you know the previous baseline and don't repeat it.
   - Note the actual verification state: did typecheck / tests / build run, and did they pass? If you didn't run them this session, say so — don't claim green you didn't observe.

2. **Write the entry** using the template at the top of `docs/session-log.md`. Prepend it directly under the `TEMPLATE` comment block (newest on top). Keep it to the five fields:
   - **Branch / commits** — branch, short hashes, pushed or not.
   - **State** — green/red in one line: tests/typecheck/build, and anything currently broken or half-done.
   - **Done this session** — 2–5 bullets of *outcomes*, not narration.
   - **Next / open questions** — what the next session should pick up; decisions still owed to the user.
   - **Gotchas / non-obvious context** — traps the diff won't reveal (build ordering, env quirks, snapshot coupling, etc.).

3. **Keep durable docs current** — if this session changed architecture, scope, or a contract, update the relevant `docs/*.md` (or CLAUDE.md) rather than only logging it. The log is for transient state; lasting facts belong in the design docs.

4. **Optionally record a memory** — for a durable, project-level fact the next session must not miss (a hard constraint, a standing user preference), also write it to the memory store and add a line to `MEMORY.md`. Don't duplicate what the log or design docs already say.

5. **Commit** — stage `docs/session-log.md` (and any docs you touched) and commit with a `chore: session handoff` message. Push only if the user's workflow is to push (this project commits to `main`). Confirm before pushing if unsure.

## Rules

- Be honest about unfinished or unverified work — a handoff that overstates "done" is worse than none.
- Short beats complete. Link to commits and docs instead of restating them.
- Never fabricate test/build results. Only report verification you actually ran.

# Session log

Append-only handoff log so each working session prepares the next. **Newest entry on
top.** Write a new entry at the end of a session with the `/handoff` skill (or by hand
using the template below). Read the top entry at the start of a session to catch up.

Keep entries short and high-signal. The git history records *what changed*; this log
records *why, what state it's in, and what to do next* — the things a fresh session can't
infer from the diff.

<!--
TEMPLATE — copy for a new entry, put it at the TOP, under this comment:

## YYYY-MM-DD — <short title>

- **Branch / commits:** <branch> · <hash1>, <hash2> (pushed? yes/no)
- **State:** green | red — <one line: tests/typecheck/build status, anything broken>
- **Done this session:** <2-5 bullets, outcomes not narration>
- **Next / open questions:** <what the next session should pick up; decisions still owed>
- **Gotchas / non-obvious context:** <traps, env quirks, things the diff won't tell you>
-->

## 2026-06-30 — Phase 2: Design System Engine & Persistence

- **Branch / commits:** main · `67a4031`, `73a9a7a` (pushed)
- **State:** green — core 111 tests pass; `pnpm -r typecheck` and `pnpm --filter @yahoda/web build` clean. App runs local-first with **no** Supabase env (verified live in browser).
- **Done this session:**
  - Generic token CRUD; component **recipe editor** with variant/state inheritance + reset; safe delete-with-reassignment (`reassignToken`/`deleteTokenSafely`).
  - Core helpers `recipe.ts` + `propertySpec.ts`; reseeded Button with real variant/state overrides + `color.transparent`.
  - Toolbox sidebar (Colors/Typography/Spacing/Radius/Effects/Motion/Components).
  - Supabase: hybrid schema + RLS (`supabase/migrations/0001_init.sql`), magic-link auth, declarative cloud-mirror repo with local-first fallback. Plan in [phase-2-plan.md](phase-2-plan.md); setup in [supabase-setup.md](supabase-setup.md).
- **Next / open questions:**
  - **Phase 3 = Typography** (full system: font families, base→semantic styles, fluid sizing, rich preview). Draft prompt is in the Phase 2 final report; current typography editing is a read-only scaffold only.
  - Supabase wiring is **untested against a live project** (couldn't provision one here) — first real sign-in should validate load/seed/sync round-trip.
  - Cloud sync is last-write-wins, single design system per user; no multi-system switcher UI yet.
  - Component creation is a disabled placeholder ("+ New Component").
- **Gotchas / non-obvious context:**
  - `@yahoda/core` is consumed via **`dist/`** — run `pnpm --filter @yahoda/core build` after editing core or the web app won't see new exports.
  - `exactOptionalPropertyTypes: true` is on — optional props need `| undefined` tolerance in helper signatures.
  - Changing the seed shifts golden snapshots (`ai`, `export`) and the hardcoded `graph.test.ts` dependency list — update both.
  - Preview screenshot tool times out in this env; use `preview_snapshot` / `preview_eval` to verify UI instead.

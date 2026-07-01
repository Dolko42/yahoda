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

## 2026-07-01 — Live Supabase connection (Phase 2 finalization)

- **Branch / commits:** main · `6cb71f4` — **pushed**
- **State:** green — `pnpm -r typecheck` clean; **124 tests** pass (122 core + 2 new web mapping). Live DB **connected and verified**: all 4 tables reachable, publishable key valid, RLS active (unauth → `200 []`), email auth enabled. The authenticated round-trip (sign in → seed push → cloud load) is **not yet human-verified** — email-gated, left for the user.
- **Done this session:**
  - Rebuilt stale core `dist/` — the Phase-3 pull left `@yahoda/core` missing `fluidToCss`/`isFluidValue`/`fontFamily`, red-typechecking the web app until rebuilt.
  - **Cloud serializer now round-trip-tested**: `apps/web/src/lib/supabase/mapping.test.ts` JSON-clones the jsonb payloads (simulating the wire) and re-`parseDesignSystem`s the seed. Wired **vitest into `apps/web`** (`test` script + `vitest.config.ts`) so CI covers it.
  - Fixed first-sign-in seeding in `Workspace.tsx`: `loadWorkspace()` masked an empty cloud with the local copy, so `pushToCloud` never ran and a new account stayed empty until the first edit. Now checks the cloud directly.
  - `client.ts` accepts the new `sb_publishable_…` key (via `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) as well as the legacy anon JWT.
  - Made `0001_init.sql` re-runnable (`drop policy if exists` before each `create policy`).
  - Real project provisioned by user; creds in gitignored `apps/web/.env.local`; `.env.example` restored to placeholders.
- **Next / open questions:**
  - **Do the human auth round-trip**: sign in via magic link → confirm `design_systems` (1 row) + `tokens` (~35) populate → reload loads from cloud → edit mirrors within ~1s. If the user signs in *inside the preview browser*, the next session can read the authed session and verify the rows.
  - Still single design system per user, last-write-wins, no multi-system switcher; component creation still a disabled placeholder (unchanged). Recipe-editor Typography property still not re-verified live (carried from Phase 3).
- **Gotchas / non-obvious context:**
  - **`NEXT_PUBLIC_*` env is inlined at dev-server start** — after editing `.env.local` you must restart `next dev` (stop + `preview_start`), not just reload. `.env.local` is gitignored (`.gitignore:19`).
  - Supabase's new API keys are `sb_publishable_…`, not the legacy JWT — both work as the client's public key; `client.ts` reads either var name.
  - Same trap as Phase 3: `dist/` is gitignored, so **rebuild `@yahoda/core` after every pull** or the web app won't see new exports.

## 2026-07-01 — Phase 3: Typography System

- **Branch / commits:** main · `0ab908b` (typography feature) — **not pushed**
- **State:** green — core **122 tests** pass; `pnpm -r typecheck` and `pnpm --filter @yahoda/web build` clean. Live UI round-trip verified via preview (category routing, fluid clamp, cascade re-resolution, family/size/style specimens, no console errors).
- **Done this session:**
  - **Font families are first-class**: new `fontFamily` TokenType (font stacks); semantic text styles reference a family + a `fontSize.*` scale primitive via **nested `$ref`** (base→semantic).
  - **Fluid sizing**: new `FluidDimensionValue` → `fluidToCss()` emits deterministic `clamp()`. Seed `fontSize.xl` is fluid.
  - Shared **`collectRefs`** nested-ref collector now feeds the dependency **graph** and **validator** (previously only top-level aliases were tracked — latent gap fixed).
  - Exporters (css/tailwind/markdown/ai) emit families, clamp, and `var()` refs; snapshots + graph test updated.
  - App: rich **TypographyEditor** (family picker · size scale/fixed/fluid toggle · weight · line-height · letter-spacing) with live clamp preview; Sidebar Typography grouping (Families/Sizes/Text styles) + 3 create actions; `TokenPreview` specimens for families/sizes/fluid.
- **Next / open questions:**
  - **Recipe editor** (component Properties → Typography property) was *not* re-verified live — the picker filters by `type === "typography"` so new styles should appear, but confirm.
  - Supabase live verification **still deferred** (carried from Phase 2 — see below). New fluid/fontFamily values ride through the existing jsonb mapping unchanged.
  - Component creation still a disabled placeholder; no multi-system switcher (unchanged).
- **Gotchas / non-obvious context:**
  - **Never run `pnpm --filter @yahoda/web build` while the preview `next dev` server is running** — it clobbers `.next` and the running app 404s its chunks (clicks silently do nothing). Stop the dev server or `rm -rf apps/web/.next` + restart. (Hit this exact trap this session.) Saved as a memory.
  - `@yahoda/core` is consumed via **`dist/`** — rebuild core after edits.
  - `fluidToCss` rounds to 4dp and assumes a 16px rem base — keep deterministic for golden snapshots.
  - Typography `fontFamily`/`fontSize` are `string|$ref` / `dimension|fluid|$ref` unions — `isRefValue` can't take a bare string; guard with `typeof x === "string"` for family.
  - The editor edits **`resolved.token`** (raw, refs intact) not `resolved.value` (nested-resolved), so the family/size pickers show the referenced token, not a flattened string.

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

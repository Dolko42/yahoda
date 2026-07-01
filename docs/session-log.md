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

## 2026-07-01 — Colors subsystem: primitive/semantic editor

- **Branch / commits:** main · working tree only at handoff time — this `chore: session handoff` commit is the first for the work (will be pushed).
- **State:** green — `@yahoda/core` rebuilt; **124 core tests** pass (13 new in `color/color.test.ts`), **2 web tests** pass, web typecheck (`tsc --noEmit`) clean. Verified live in preview: primitive/semantic grouped sidebar, typed creation form, scale generation, source rebind cascade — no console errors. (Screenshots time out in this env; verified via `preview_snapshot`/`preview_eval` DOM checks instead.)
- **Done this session:**
  - **Core:** new `packages/core/src/color/` module — `scale.ts` (`generateColorScale` + HSL helpers, deterministic, no AI) and `color.ts` (`isPrimitiveColor`/`isSemanticColor`, `parseColorName`, `getColorFamily`/`getColorStep`, `getPrimitiveSourceForSemantic`, `getSemanticUsagesOfPrimitive`, `groupPrimitiveColorsByFamily`, `resolveColorToken`). Exported from `src/index.ts`.
  - **Web:** `ColorsSidebar.tsx` (primitives grouped into collapsible family palettes + separate semantic list w/ source labels + primitive/semantic typed creation form with stacked labeled fields); `edit/ColorTokenExtras.tsx` (semantic "Source primitive" binder + primitive family/shade + "Generate scale"); enriched color `TokenPreview` (source chain, family scale, dependent semantics). `Sidebar` branches to `ColorsSidebar` for the colors category. `tokens.ts` gained `makePrimitiveColor`/`makeSemanticColor`; store gained `createTokens` batch action.
- **Next / open questions:**
  - Possible follow-ups (not requested): OKLCH/contrast-aware scale, optional 50/950 steps, "regenerate & overwrite existing shades" (currently existing shades are always skipped).
  - Colors category `creates`/`match` in `lib/categories.ts` are now dead for colors (ColorsSidebar owns creation/filtering) but harmless — left in place.
- **Gotchas / non-obvious context:**
  - **Semantic→primitive reference is the native `$ref` alias, NOT a metadata field.** Deliberately rejected `metadata.sourceTokenId` (would violate the one-model law). So resolution, cascade, dependency graph, exports, and Supabase persistence all work unchanged — no schema migration.
  - **Rebinding a semantic uses `patchToken(id, {value:{$ref}})`, never `patchTokenValue`** — the latter redirects edits to the *resolved source* token, so it would mutate the primitive instead of the semantic's own ref.
  - Primitive names follow the existing seed convention `palette.<family>.<shade>` (not `primitive.…` from the prompt) to avoid renaming seed tokens / breaking golden export snapshots. Family parsing is prefix-agnostic.
  - **Scale monotonicity:** `generateColorScale` pins the ramp to the anchor's *own* lightness and interpolates toward near-white/near-black — keeps the anchor exact AND the L ramp monotonic even when the anchor is atypically dark/light for its step (a naive per-step lightness table breaks this; there's a test for it).
  - After editing core you must **rebuild `@yahoda/core`** for the web app to see new exports (`pnpm --filter @yahoda/core build`).

## 2026-07-01 — Revert Phase 3 typography (to be redone as a new phase)

- **Branch / commits:** main · (this commit) — user was unhappy with Phase 3 typography and wants to redo it fresh. **Phase 3 is preserved in history at `0ab908b`** — recover from there when redoing.
- **State:** green — `@yahoda/core` rebuilt; **111 core tests** pass (back to the Phase-2 count), **2 web tests** pass, web typecheck clean. Verified live in preview: Colors + Typography sections render, tab bar works, no console errors. Seed reverted (e.g. `color.primary` back to `#2448B8`).
- **Done this session:**
  - Reverted all `packages/core/src` typography changes to the pre-Phase-3 baseline (`d064f79`): removed the `fontFamily` TokenType, fluid `clamp()` values, nested-`$ref` graph/validator generalization, and the seed's family/size/fluid tokens. Deleted `model/fluid.*` and `schema/refs.*`. Exporters + golden snapshots back to Phase-2 form.
  - Web: restored `TokenValueEditor`, `TokenPreview`, `format.ts`, `style.ts`, `tokens.ts`; deleted `TypographyEditor.tsx`.
  - `lib/categories.ts`: typography stripped to a single "Text style" create, no families/sizes/groups (kept the generic `creates[]`/`groups` shape so today's inline tab bar keeps working).
- **Next / open questions:**
  - **Redo typography as a new phase** — cleaner than Phase 3. Reference the old impl at `0ab908b` for what to keep/drop. The `typography` composite type (family string + `fontSize` dimension/ref) still exists from Phase 2.
  - Supabase live auth round-trip still deferred (carried, unaffected by this revert — mapping is generic).
- **Gotchas / non-obvious context:**
  - **After reverting core you must rebuild `@yahoda/core` AND restart `next dev`** (stop → `rm -rf apps/web/.next` → start) — the running dev server had cached the old `dist` and threw `isFluidValue is not exported` until restarted. The rebuilt `dist` itself was clean; the error was purely stale bundler cache.
  - Only `categories.ts` + `Sidebar.tsx` were hand-reconciled (today's tab-bar commit rebuilt on the Phase-3 sidebar shape); everything else was a clean `git checkout d064f79 --`.

## 2026-07-01 — UI: section tabs above canvas, cleaner navbar/sidebar

- **Branch / commits:** main · working tree only — **not committed** (this handoff commit will be the first). Changed: `Navbar`, `Sidebar`, `Workspace`, `store/workspace.ts`; new `SectionTabs.tsx`, `lib/categories.ts`.
- **State:** green — `pnpm --filter @yahoda/web typecheck` (`tsc --noEmit`) clean. Verified live in preview: tab switch drives sidebar search/list/"+ New", token select still updates canvas + inspector, no console errors. Tests **not run** this session (no logic touched — pure UI/layout move).
- **Done this session:**
  - Moved the system category nav **out of the left sidebar** into an inline underline tab bar (`SectionTabs`) sitting above the canvas (Unplain-style; active tab = primary-blue underline).
  - Lifted the active-category state into the workspace store (`category` + `setCategory`), so the tab bar and sidebar share one source; extracted the `CATEGORIES` definitions to `lib/categories.ts` (was inline in `Sidebar`).
  - Sidebar now renders only the active section (search + grouped items + "+ New"); a `useEffect` resets local search/create when `category` changes.
  - Removed the "Acme UI" design-system selector (+ its divider) from the navbar — logo only, no replacement picker.
- **Next / open questions:**
  - Active category is **not persisted** — reload returns to `colors` (same as before). If last-viewed section should survive reloads, add it to persistence.
  - Navbar has no system picker now; that's the natural home for a real switcher when multi-design-system support lands (still single-system, unchanged).
- **Gotchas / non-obvious context:**
  - `category` sits in the Zustand store alongside `selection`/`tab`/`canvasView` (the established UI-state pattern) — not in a context/prop. No data-model, Supabase, or binding changes.
  - `lib/categories.ts` is the **single source** for category `match`/`creates`/`groups`; edit there, not in `Sidebar`. Both `SectionTabs` and `Sidebar` import it.

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

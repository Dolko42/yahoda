# Phase 2 Plan — Design System Engine & Persistence

> Planning document. No code is written until the gating decisions at the end are
> confirmed. Read alongside `architecture.md`, `data-model.md`, `versioning-strategy.md`.

## 1. Current architecture summary

- **Monorepo**: `packages/core` (zero React — the brain) + `apps/web` (Next.js 14 App
  Router, Tailwind, Zustand). Boundary is enforced by `boundary.test.ts`.
- **Schema** (`packages/core/src/schema`) is Zod-first; TS types inferred. Already models:
  - `Token` — id, dotted `name`, `type` (color/dimension/typography/shadow/border/
    duration/easing/opacity/zIndex), `tier` (primitive/semantic/component), `value`
    (raw **or** `{$ref}` alias), `group`, `usage`, `description`, `deprecated`, `meta`.
  - `Component` — variants, states, slots, **`bindings: TokenBinding[]`**, accessibility,
    aiRules, code, docs, examples.
  - **`TokenBinding`** = `{ property, tokenId, appliesTo?: {variant?, state?} }`. This is
    the property→token edge **and** the override mechanism.
  - `DesignSystem` — working set arrays + `published` snapshot + `draft` overlay + `history`.
- **Core engine already implemented and tested**:
  - `resolve.ts` → `resolveTokenValue` (alias chains + nested refs) and
    **`resolveComponent(ds, c, {variant, state})`** which picks the most specific applicable
    binding per property (base → variant → state). **Inheritance/override already works.**
  - `graph.ts` → `getDependencies`, `getDependents`, **`getBlastRadius`** (transitive).
  - `diff.ts` + `version.ts` → `publishSummary`, **`commit`**, `revertToPublished`.
  - `validate.ts` → invariants incl. **`PROPERTY_TOKEN_TYPE`** (property→required token type)
    and binding type-mismatch / dangling-ref / cycle checks.
  - `export/json.ts` → `exportJson` round-trips; also css/tailwind/markdown/shadcn exist.
  - `crud.ts` → `addToken/updateToken/removeToken` (+ component/pattern/doc) — pure.
- **Store** (`store/workspace.ts`) wires up `patchToken`, `patchTokenValue` (alias-aware),
  `patchComponent`, `deleteToken`, `publish`, `discardDraft`. **Does not expose `addToken`,
  binding edits, variant overrides, or reassignment.**
- **Persistence** (`lib/persist.ts`) = IndexedDB, whole-document, best-effort, validates on
  load via `parseDesignSystem`. No backend.
- **UI**: `Sidebar` renders a file-tree from `buildTree`; `Inspector` has all 7 tabs but
  Properties is mostly read-only for components (shows counts, not editable bindings);
  `ComponentElement` renders representative previews from `componentStyle` (which maps
  resolved bindings → inline CSS, incl. `paddingX`/`paddingY` already).

## 2. Current data-model limitations (the real gaps)

The engine is ahead of the UI. Actual gaps:

1. **No token creation** — `addToken` exists in core but no store action / UI.
2. **No safe reassignment** — `DeleteTokenButton` offers "Delete anyway", which **leaves
   broken refs** (violates the contract). No `reassignToken` helper.
3. **No binding editing UI** — can't choose which token powers `background`, `paddingY`,
   etc.; can't add/remove a binding; can't scope one to a variant/state.
4. **Variants don't visibly inherit/override** — the *engine* supports it, but the **seed
   never authored variant-scoped bindings** (Button's primary/secondary/ghost are
   identical) and there's **no recipe UI** to view "inherited vs overridden" or reset.
5. **No per-component property catalog** — nothing declares "a Button has background,
   textColor, paddingX, paddingY, radius, …". Properties are implicit in whatever
   bindings happen to exist.
6. **Sidebar is a document tree**, not a toolbox; no per-section "+ New".
7. **Persistence is local-only**; no stable cloud identity, no auth, no multi-system.
8. **Typography token value editing** is stubbed ("arrives in a later phase") — acceptable,
   Phase 2 only needs typography tokens to exist in generic CRUD.

## 3. Supabase schema proposal

Goal: stable UUIDs for every object, queryable, canonical-JSON export stays trivial,
editing stays manageable, **without** a giant single blob and **without** breaking the
local-first prototype.

**Design choice — hybrid normalization.** Normalize the entities that are independently
listed/created/deleted and need stable addressable IDs (`design_systems`, `tokens`,
`components`, `commits`). Keep each component's *internals* (variants, states, slots,
**bindings**, accessibility, aiRules, code, docs, examples) as JSONB **on the component
row**, because they are always loaded with the component and dependency queries are
computed in-core from the loaded model (not in SQL). This matches how the engine already
works and avoids a brittle binding/override table that would duplicate `resolveComponent`.

```sql
-- profiles: 1:1 with auth.users
profiles ( id uuid pk references auth.users, display_name text, created_at, updated_at )

design_systems (
  id uuid pk default gen_random_uuid(),
  owner_id uuid references auth.users not null,
  name text not null,
  description text,
  schema_version text not null,
  current_published_commit_id uuid,        -- nullable; set on publish
  created_at timestamptz, updated_at timestamptz
)

tokens (                                   -- normalized: listed/created/deleted often
  id uuid pk,                              -- == in-model Token.id (stable)
  design_system_id uuid references design_systems on delete cascade,
  name text not null,                      -- dotted path, unique per system
  type text not null, tier text not null,
  "group" text, unit text,
  value jsonb not null,                    -- raw value or {$ref}
  usage text, description text,
  metadata jsonb, created_at, updated_at,
  unique (design_system_id, name)
)

components (
  id uuid pk,                              -- == in-model Component.id
  design_system_id uuid references design_systems on delete cascade,
  name text not null, status text not null,
  description text, intent text,
  spec jsonb not null,                     -- variants/states/slots/bindings/a11y/aiRules/code/docs/examples
  metadata jsonb, created_at, updated_at,
  unique (design_system_id, name)
)

commits (                                  -- immutable history
  id uuid pk,
  design_system_id uuid references design_systems on delete cascade,
  author_id uuid references auth.users,
  message text not null, version_label text,
  snapshot jsonb not null,                 -- full working set at publish (tokens+components+patterns+docs)
  affected jsonb not null,                 -- {tokens:[], components:[], patterns:[]}
  changes jsonb not null,                  -- change records
  created_at timestamptz
)
```

- **Drafts/autosave**: the live working set lives in normalized `tokens` + `components`
  rows (autosaved on edit). `commits.snapshot` is the immutable published copy. "Unpublished
  changes" = diff(latest commit snapshot, current rows) — already computed by `diff.ts`.
- **RLS**: every table `owner_id = auth.uid()` (via `design_systems` join). Single-user safe.
- **Patterns/docs**: small and few; store on a `design_systems.extras jsonb` column (or
  their own tables later). Not on the Phase-2 critical path.
- **Mapping layer** (`apps/web/src/lib/supabase/*`): `rowToDesignSystem` / serialize. The
  app keeps operating on the in-memory `DesignSystem`; the repository translates.

**Why not fully normalize bindings/variants** (the spec's `component_variants` /
`component_properties` tables)? Dependency queries are pure functions over the loaded model
(`graph.ts`), not SQL — so normalizing buys nothing now and forces us to re-derive
`resolveComponent`'s precedence in two places. Documented as the Approach-C alternative if
server-side queries are ever needed.

## 4. Canonical design-system JSON

Already exists and round-trips: `exportJson(ds)` serializes the full `DesignSystem`
(metadata, tokens, components+variants+states+bindings, patterns, docs, accessibility,
aiRules, published/draft/history). Phase 2 work is only to **formalize + expose**:

- Keep `DesignSystem` JSON as the canonical contract (it already is the source for
  css/tailwind/markdown/shadcn exporters).
- Add a download action in the existing `ExportMenu` for JSON (others already wired).
- The Supabase `commits.snapshot` column stores exactly this shape → cloud history is the
  same canonical format. No second format anywhere.

## 5. Approaches considered

**A — Minimal patch.** Add token CRUD + a token-picker on bindings; bolt Supabase save
onto `persist.ts`. Leave variant/recipe model as-is.

**B — Generic token CRUD + property references, preserving current structure.** Add: store
actions for `addToken`/binding edits/reassign; a per-component **PropertySpec** catalog (in
core, generic, reusing `PROPERTY_TOKEN_TYPE`); recipe helpers
(`getInheritedProperty`/`getOverrideProperty`/`resetOverride`/`listAffectedVariants`) that
sit *on top of* the existing `bindings[]` + `resolveComponent`; reseed components with real
variant overrides; toolbox sidebar; token-picker popover with inline create; safe
reassign-on-delete; Supabase as a swappable repository behind the persist interface with
local-first fallback.

**C — Larger recipe/inheritance refactor.** Replace `bindings[]` with normalized
base-recipe + per-variant/per-state override tables (in model *and* DB), new resolution
engine, migration of all seed data and tests.

### 6. Pros / cons

| | A | B | C |
|---|---|---|---|
| Speed | Fast | Medium | Slow |
| Meets Phase-2 scope | ✗ (variants stay rigid) | ✓ | ✓ |
| Reuses working engine | Partial | **Fully** | Rebuilds it |
| Risk to working preview | Low | Low–med | High |
| Future extensibility | Low | High | High |
| Overengineering risk | — | Low | **High** |

A leaves the headline feature (variant inheritance) unmet. C rebuilds an engine that
already passes tests and re-implements `resolveComponent` precedence in SQL — exactly the
"abstract engine that delays the MVP" the brief warns against.

## 7. Recommended approach — **B**

The schema and pure-function core already express recipes, overrides, dependencies, and
versioning. Phase 2 is a **UI + thin-helper + persistence** phase, not an engine rewrite.
B preserves every passing test and working preview, fills the real gaps, and leaves a clean
path to C only if server-side normalization is ever justified.

### Core additions (packages/core)
- `model/crud.ts`: `addComponent` already exists; add **`reassignToken(ds, fromId, toId)`**
  (rewrites bindings, token `$ref`s, contrast rules, aiRules links) and a safe
  **`deleteTokenSafely`** that refuses if used unless a reassignment target is given.
- `model/recipe.ts` (new): generic helpers over `bindings[]`:
  - `getRecipe(component, {variant?, state?})` → property → `{tokenId, source: 'base'|'variant'|'state'}`.
  - `setBinding(component, {property, tokenId, appliesTo?})`, `removeBinding`, `resetOverride`.
  - `listAffectedVariants(component, property)`.
- `model/propertySpec.ts` (new): per-archetype ordered property catalog (Button, Card,
  Input, Badge, Alert, Dialog) → `{key, label, tokenType, group}`, `tokenType` sourced from
  `PROPERTY_TOKEN_TYPE`. Generic lookup `propertiesFor(component)`; raw-value escape hatch flagged.
- `seed/seed.ts`: author **real variant overrides** (Button primary/secondary/ghost +
  hover/disabled) so inheritance is visible. Split Button padding into paddingX/paddingY
  (already is). Keep deterministic timestamps (golden tests).
- New unit tests: reassignment, recipe resolution per scope, resetOverride, propertySpec.

### App additions (apps/web)
- **Store**: `createToken`, `updateBinding`, `removeBinding`, `resetOverride`,
  `reassignAndDeleteToken`, plus `recipeScope` UI state (selected variant/state).
- **Sidebar → Toolbox**: category tabs (Colors, Typography, Spacing, Radius, Effects,
  Motion, Components) with search, grouped sections, and per-section **"+ New"**.
- **Token-picker popover** (`PropertyTokenPicker`): for a property of token-type T, lists
  compatible tokens grouped by tier/group + **"+ Create new <type> token"** that creates
  and immediately binds. UI language: "Background / Text color / Padding Y" — never "binding".
- **Recipe editor** in the Properties tab for components: per property, show resolved token
  with inherited-vs-overridden state, variant/state scope switcher, and **Reset to inherited**.
- **Safe delete**: `DeleteTokenButton` becomes reassign-or-cancel when the token is used.
- **Supabase repository** behind the `persist` interface (see §3); local-first fallback.
- **ExportMenu**: add JSON download.

## 8. Migration strategy from seeded data

- Keep `createSeedDesignSystem()` as the **offline/first-run fallback** and the test fixture.
- On first authenticated load with an empty cloud account, **seed the cloud** by writing the
  seed's tokens/components rows + an initial commit (mirrors current `c_seed` behavior).
- In-model IDs (`t.color.primary`, `c.button`) are valid `Id` strings and become the row
  PKs — **no ID churn**, so existing AI references / exports stay stable. (New objects get
  `crypto.randomUUID()`.)
- IndexedDB documents already on disk are loaded, validated, and (if authed) pushed to cloud
  once; otherwise they keep working locally.

## 9. UI redesign plan

- Left rail becomes a **toolbox**: vertical category list → filtered content panel with
  search + grouped tokens/components + "+ New". Patterns marked "future". Components get
  "+ New Component" (disabled/coming-soon unless trivial).
- Component Properties tab becomes the **recipe editor** (scope switcher + property rows +
  token-picker + reset). Typography rows render disabled "coming soon" sub-fields (Font
  Family, Size, Weight, Line Height, Letter Spacing) to reserve space without building it.
- Navbar keeps unpublished-count + Publish (commit message required) — already present; wire
  to the new draft computation and Supabase.
- App chrome stays neutral steel; preview colors stay isolated (unchanged invariant).

## 10. Edge cases (handled or documented)

- Delete token used by component / used by another token → reassign-or-cancel; never leave
  broken refs (`reassignToken` + blast-radius preview).
- Rename token → name is editable; uniqueness enforced (`validateInvariants` DUPLICATE_NAME).
- Duplicate token names / invalid values → Zod + invariant validation blocks publish; inline
  error in picker.
- Incompatible token assignment → picker only lists compatible types;
  `BINDING_TYPE_MISMATCH` is the backstop.
- Missing token reference → `resolve` returns typed failure; preview shows "Unresolved".
- Failed Supabase save → keep working set in IndexedDB, surface a non-blocking toast, retry.
- Offline → local-first fallback continues; sync on reconnect.
- Unpublished draft vs published snapshot → existing diff/commit machinery.
- Reset variant override → `resetOverride` removes the scoped binding; property falls back to base.
- Component property without token → allowed; shows "Choose a token"; raw-value escape hatch.
- Contrast warning after color change → existing `evaluateComponentContrast` re-runs live.

## 11. Testing checklist

- Core (Vitest): reassignment rewrites every ref kind; recipe resolution per
  base/variant/state; resetOverride; propertySpec compatibility; JSON round-trip after CRUD;
  seed still validates; golden snapshots updated for the reseed.
- Boundary test still green (no React in core).
- App: create token from picker binds immediately; delete-with-usages forces reassignment;
  variant switch shows inherited vs overridden; publish requires message and clears draft;
  Supabase save/load round-trips and falls back offline.
- `pnpm typecheck && pnpm test && pnpm build` clean (CI already runs these).
```

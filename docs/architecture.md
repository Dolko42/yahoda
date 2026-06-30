# Architecture

## Guiding law

The **design system data model comes first**. UI, exports, docs, and AI context are all
projections of that single model. See `CLAUDE.md` and `data-model.md`.

## Recommended stack

| Concern | Choice | Why |
|--------|--------|-----|
| Framework | **Next.js (App Router) + React + TypeScript (strict)** | One codebase for app today, API/MCP routes later. Familiar, deployable. |
| Styling | **Tailwind CSS** + CSS variables for app chrome | Chrome theme as CSS vars (see `ui-system.md`); utility classes for layout. |
| Components | **shadcn/ui as a starting point, heavily customized** | Own the code; restyle to neutral steel chrome. Not used raw. |
| State | **Zustand** (UI/session state) + core model store | Simple, no boilerplate. Model logic lives in core, not in the store. |
| Schema/validation | **Zod** (source of truth) → inferred TS types | One definition for runtime validation + static types. |
| Persistence (MVP) | **Local-first**: JSON document + IndexedDB (via `idb`) and file import/export | No backend needed to prove the thesis. Portable JSON. |
| Persistence (later) | Postgres + Prisma or Supabase | Add when teams/sync are needed; model already serializable. |
| Graph view | lightweight force/graph lib (e.g. react-flow or a custom canvas) | Visualize relationships; not on the MVP critical path. |
| Testing | **Vitest** (core, exports, a11y, diff) + Playwright (later, app flows) | Pure-function core is heavily unit-tested. |
| Monorepo | pnpm workspaces (optional but recommended) | Clean boundary between `core` and `app`. |

> If a simpler single-package Next.js app is preferred for speed, keep the **logical**
> separation (a `src/core` directory with zero React imports) even without a monorepo.

## Module boundaries

```
repo/
├─ packages/
│  └─ core/                     # ZERO react/next imports. Pure TS. The brain.
│     ├─ schema/                # Zod schemas + inferred types (the contract)
│     ├─ model/                 # DesignSystem ops: CRUD on nodes, validation
│     ├─ graph/                 # dependency resolution, reverse deps, blast radius
│     ├─ resolve/               # token alias resolution, value computation
│     ├─ diff/                  # draft vs published diffing
│     ├─ version/               # commit/publish history operations
│     ├─ a11y/                  # contrast math, target-size checks (WCAG)
│     ├─ export/                # json | css | tailwind | markdown | shadcn | ai-context
│     │   └─ <one pure fn per target>
│     └─ ai/                    # structured AI context projection
│  
└─ apps/
   └─ web/                      # Next.js app. Renders FROM core. Holds no design data.
      ├─ app/                   # routes, layouts
      ├─ components/            # chrome: navbar, sidebar, canvas, inspector
      ├─ preview/               # contextual preview renderers (read-only)
      ├─ store/                 # Zustand: selection, draft overlay, UI state
      └─ styles/                # neutral chrome theme (CSS variables)
```

### The dependency rule
`apps/web` depends on `packages/core`. **`core` never depends on `apps`.** Core has no
React, no DOM, no Next. If you need React in core, the design is wrong.

## State strategy

Two layers, kept distinct:

1. **Model state** — the canonical `DesignSystem` (published) + a **draft overlay** of
   uncommitted changes. Mutations go through `core/model` functions that validate and
   return new state. The overlay is what makes "drafts are safe, publishing is
   deliberate" cheap to implement (see `versioning-strategy.md`).

2. **UI/session state** (Zustand) — current selection, active inspector tab, graph
   view toggle, panel sizes. No design data here.

Rendering = `resolve(model + overlay)` → typed view objects → React. The preview never
reads raw tokens; it reads *resolved* values so aliasing and overrides are already
applied.

## Data flow

```
user edits in inspector
        │ typed action
        ▼
core/model mutation (validate via Zod) ──► new draft overlay
        │
        ├─► core/graph recompute reverse deps / blast radius
        ├─► core/a11y recheck affected contrast rules
        ▼
selectors resolve(model+overlay) ──► preview + inspector re-render
        │
   (on Publish)
        ▼
core/diff(draft, published) ──► core/version.commit(message) ──► new published snapshot
```

## Persistence model (MVP)

- Canonical document = one serializable `DesignSystem` JSON (the published state) +
  a history of commits + the current draft overlay.
- Stored in IndexedDB; importable/exportable as a `.json` file.
- Autosave the draft overlay; published snapshots are immutable once committed.

## Why this holds the line

- Exports and AI context are *pure functions of the model* → they can never drift.
- The neutral chrome is just CSS variables, fully separate from previewed token values.
- Because core is framework-free, the same brain can power a future MCP server, a CLI,
  or a backend without rewriting business logic.

## Key risks & mitigations

| Risk | Mitigation |
|------|-----------|
| Business logic leaks into React | Enforced `core` boundary + lint rule banning react imports in core |
| Two sources of truth creep in | Code review checklist item; exports/docs/AI must be pure projections |
| Draft/publish complexity | Model it as an overlay + immutable snapshots, not in-place edits |
| Cascade/perf on big systems | Reverse-dep index computed once per change, memoized selectors |
| Preview colors leak into chrome | Chrome uses fixed CSS vars; preview renders in an isolated scope |

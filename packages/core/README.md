# @yahoda/core

The **framework-free brain** of Yahoda. Zero React/Next/DOM imports (enforced by
`src/boundary.test.ts`). Zod schemas are the single source of truth; TS types are
inferred from them. UI, exports, docs, and AI context are all projections of this model.

## What's here (Phases 1-2)

- `schema/` — Zod schemas + inferred types for Token, Component, Pattern, DocNode,
  versioning nodes, and the `DesignSystem` root (the data contract).
- `model/` — `parseDesignSystem`, `validateInvariants`, `assertPublishable`, and
  immutable CRUD over the working set.
- `resolve/` — alias (`$ref`) resolution, nested composite resolution, `resolveColor`,
  and component binding resolution with variant/state overrides.
- `graph/` — dependency index, `getDependencies` / `getDependents` (reverse deps), and
  `getBlastRadius` (transitive impact).
- `a11y/` — WCAG contrast math (`contrastRatio`, `parseColor`), rule evaluation, and
  target-size checks. All results are derived, never stored.
- `diff/` — structured field-level diff, `computeAffected` (blast radius), change records.
- `version/` — `publishSummary`, `commit` (snapshot + history), `revertToPublished`.
- `export/` — pure exporters: `exportJson` (round-trips), `exportCss` (aliasing via
  `var()`), `exportTailwind` (semantic keys), `exportMarkdown`, `exportShadcn`, plus the
  `exportTargets` registry. Each preserves semantic names and is golden-tested.
- `seed/` — the MVP seed design system (tokens, 6 components, 4 patterns).

## Scripts

```bash
pnpm --filter @yahoda/core test        # vitest run
pnpm --filter @yahoda/core test:watch  # vitest watch
pnpm --filter @yahoda/core typecheck   # tsc --noEmit
pnpm --filter @yahoda/core build       # tsc -> dist/
```

## Usage

```ts
import {
  parseDesignSystem,
  validateInvariants,
  createSeedDesignSystem,
} from "@yahoda/core";

const ds = createSeedDesignSystem();
const report = validateInvariants(ds); // { errors, warnings, ok }
```

## Coming next

Phase 8 adds `ai/` — the structured AI-context projection (JSON + Markdown) with
provenance + content hash and stale-rule detection. See `docs/implementation-phases.md`.

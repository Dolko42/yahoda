# Design System Data Contract

The **stable interface** that the UI, exports, docs, and AI context all depend on. If
you change anything here, bump `schemaVersion` and provide a migration. Treat this as
public API even while internal.

## Why a contract doc separate from the data model

`data-model.md` explains the design. This file is the **promise**: the field names,
shapes, invariants, and versioning rules that other layers may rely on. Exporters and
the AI projection import from `packages/core/schema` only — never from app code.

## Source of truth

- Schemas defined once with **Zod** in `packages/core/schema`.
- TS types are `z.infer<>` from those schemas. Do not hand-write parallel interfaces.
- All external input (file import, paste, future API) is parsed through the Zod schema
  at the boundary. Internal code may assume validated data.

## Versioning the contract

- `schemaVersion` is semver. The document stores the version it was written with.
- **Patch**: docs/typo, no shape change. **Minor**: additive optional fields. **Major**:
  removal/rename/retype of any field → requires a migration function in
  `core/schema/migrations` and a fixture proving old → new.
- Loaders run migrations to bring any older document up to the current version before
  use. Never read an unmigrated document.

## Invariants (must always hold; validated pre-publish)

1. **Unique ids** across all nodes; **unique names** within each node kind.
2. **No dangling references**: every `$ref`, `tokenId`, `componentId`, doc `target.id`
   resolves to an existing node.
3. **No alias cycles**: token `$ref` chains terminate at a raw value.
4. **Type agreement**: a `$ref` only points at a token of a compatible type (a color
   token can't alias a dimension token).
5. **Binding validity**: a binding's `tokenId` type matches the property it feeds
   (e.g. `radius` property → `dimension` token).
6. **Deprecated nodes** may still be referenced, but referencing one raises a *warning*
   surfaced in the inspector and pre-publish check (not a hard error).
7. **Contrast rules** reference two color tokens that resolve to concrete colors.

## Stable enums

- `TokenType`, `Variant/State` naming conventions, `status`, `tier`, export target ids
  (`json|css-vars|tailwind|markdown|shadcn|ai-context`) are part of the contract.

## What is NOT part of the contract

- Derived data (reverse deps, blast radius, contrast results) — recomputed, never
  persisted, free to change.
- UI/session state (selection, tabs, panel sizes).
- The exact text of generated Markdown/AI prose (the *structure* is contractual; the
  wording can improve).

## Consumer rules

- **UI**: reads resolved view models from `core`, dispatches typed actions. Must handle
  the "unresolved/broken reference" state.
- **Exporters**: each is `(DesignSystem) => string|object`, pure, deterministic, with a
  golden-file test. Must preserve semantic names where the target format allows.
- **AI context**: `(DesignSystem) => AIContext`, pure, includes `schemaVersion` and a
  content hash for staleness detection.

## Validation entry points

```ts
parseDesignSystem(input: unknown): DesignSystem          // Zod parse + migrate
validateInvariants(ds: DesignSystem): ValidationReport   // graph-level checks (1–7)
assertPublishable(ds: DesignSystem): void                // throws on hard errors
```

`ValidationReport` distinguishes `errors` (block publish) from `warnings` (deprecations,
contrast failures below target) so the UI can show both.

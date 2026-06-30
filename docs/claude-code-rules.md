# Claude Code Rules (coding standards for AI agents)

Read with `CLAUDE.md`. These are non-negotiable rules for any code written in this repo.

## The prime directives
1. **Model first.** Never add design data the model can't represent. Extend the schema,
   then build on it. UI/exports/docs/AI are projections — never alternate stores.
2. **Core is framework-free.** `packages/core` imports no React/Next/DOM. If you reach
   for them there, the design is wrong — move logic, not frameworks.
3. **Derive, don't duplicate.** Reverse deps, blast radius, contrast results are computed.
4. **No silent fallbacks.** Unresolved references render an explicit state and report an
   error; they never quietly default.

## TypeScript
- `strict: true`. No `any` in committed code (`unknown` + narrowing is fine).
- Types are **inferred from Zod** (`z.infer`). Don't hand-maintain parallel interfaces.
- Exhaustive `switch` on unions (use a `never` assertion in the default).
- Prefer pure functions and immutable updates in core.

## Validation
- Parse all external input through Zod at the boundary (`parseDesignSystem`).
- Internal code may assume validated data; don't re-validate defensively everywhere.
- Run `validateInvariants` before publish/export of published systems.

## State & UI
- Business logic lives in `core`. Components read selectors and dispatch typed actions.
- No `useState` holding design data — that belongs in the model/overlay.
- Chrome uses only `--app-*` CSS variables. Preview uses `--ds-*` in an isolated scope.
- Handle empty/loading/error/unresolved states explicitly.

## Exports & AI
- Each exporter/AI projection is a **pure** `(DesignSystem) => Output`, deterministic
  (stable ordering), with a golden-file test. JSON export must round-trip.
- Preserve semantic names and aliasing where the format allows.

## Testing
- Vitest for core (model, graph, resolve, diff, a11y, export, ai).
- Every new exporter: golden fixture. Every new invariant: a failing fixture.
- Contrast math: WCAG reference fixtures. Don't ship a11y math without tests.

## Contract changes
- Any change to schema shape = `schemaVersion` bump + migration + fixture proving
  old→new. Treat the schema as public API.

## Git / workflow
- This repo starts without git; if initialized, branch off the default branch before
  committing. Commit/push only when the user asks.
- Keep changes scoped to the current phase (`implementation-phases.md`). Don't build a
  downstream consumer before its upstream model fact exists.
- Match surrounding code style; keep comment density consistent with neighbors.

## Definition of done
A change is done when: it compiles under strict TS, tests pass, the relevant items in
`quality-review-checklist.md` are satisfied, and (for UI) `ui-quality-review.md` passes.

## Anti-patterns (reject in review)
- Storing the same fact in two places.
- React imports in `core`.
- Hard-coded hex in chrome, or preview colors leaking into chrome.
- Hand-written types that duplicate Zod schemas.
- Exporters that flatten semantic names to raw values.
- Static AI rules with no link to the nodes they describe.
- Any drift toward a freeform canvas / app generator.

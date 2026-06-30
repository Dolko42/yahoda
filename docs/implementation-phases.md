# Implementation Phases

Safe, ordered build phases. Each phase has a **goal**, **deliverables**, and **exit
criteria**. The ordering enforces the architectural law: build the model and its pure
logic before any UI that renders it, and any consumer (export/AI/docs) only after the
model fact it needs exists.

> Rule of thumb: if a phase would require building a downstream consumer before its
> upstream model fact, the phases are out of order.

---

## Phase 0 — Foundation & tooling
**Goal:** a buildable, typed, tested skeleton with the core boundary in place.

Deliverables:
- Repo scaffold: Next.js (App Router) + TS strict, Tailwind, Vitest.
- Workspace layout with `packages/core` (zero React) and `apps/web`.
- Lint rule / boundary check: no React/Next imports in `core`.
- CI: typecheck + unit tests run on every change.

Exit criteria: `pnpm test` and `pnpm build` pass on an empty-but-wired project; a lint
error fires if `core` imports React.

---

## Phase 1 — Core data model (the keystone) ⭐ start here for code
**Goal:** the model exists, validates, and round-trips. No UI.

Deliverables (`packages/core`):
- `schema/` — Zod schemas for Token, Component, Pattern, DocNode, DesignSystem, version
  nodes; inferred TS types (per `data-model.md` / `design-system-data-contract.md`).
- `model/` — typed CRUD operations returning new state.
- `parseDesignSystem`, `validateInvariants`, `assertPublishable`.
- A **seed system** fixture (the MVP tokens, 6 components, 4 patterns).
- Tests: schema parse, invariants (unique ids, dangling refs, alias cycles, type
  agreement, binding validity), round-trip serialize/parse.

Exit criteria: seed system parses, validates clean, and round-trips; invalid fixtures
fail with precise errors.

---

## Phase 2 — Graph, resolution, a11y math (pure brain)
**Goal:** everything derivable is derived and tested. Still no UI.

Deliverables (`packages/core`):
- `resolve/` — alias resolution (`$ref` chains), composite token resolution, binding →
  resolved value, override application (variant/state).
- `graph/` — reverse dependencies, blast radius (transitive closure), broken-ref report.
- `a11y/` — WCAG contrast ratio, target-size checks, unified validation report.
- Tests: resolution incl. cycle rejection; reverse-dep correctness on the seed; contrast
  against known WCAG fixtures; blast radius on a token-delete scenario.

Exit criteria: given the seed, "what uses `color.primary`?" and "blast radius of
deleting `radius.md`?" return correct sets; contrast numbers match WCAG references.

---

## Phase 3 — Workspace shell (read-only)
**Goal:** see the system. Renders entirely from core; no editing yet.

Deliverables (`apps/web`):
- Neutral chrome per `ui-system.md` (CSS variables, layout: navbar/sidebar/canvas/
  inspector).
- Sidebar tree from the model; selection state (Zustand).
- Inspector tabs in read-only mode (Properties, Dependencies, Code, AI Rules,
  Accessibility, Documentation, Version) populated from core selectors.
- Preview/chrome CSS isolation (`--app-*` vs `--ds-*`).

Exit criteria: load seed, browse every node, see correct read-only details + dependency
lists; chrome colors and preview colors provably don't bleed.

---

## Phase 4 — Contextual preview canvas
**Goal:** the canvas becomes a real contextual projection of the selection.

Deliverables:
- Preview renderers per selection type (color, radius, spacing, typography, shadow,
  motion, component, pattern) per `ui-system.md`.
- Component preview: variants × states grid, examples, responsive sizes.
- Spacing rulers, motion play/replay (reduced-motion aware), unresolved-token state.

Exit criteria: each selection type shows its specified preview; previews read *resolved*
values so aliasing/overrides already apply.

---

## Phase 5 — Editing + cascade (draft overlay)
**Goal:** edit in the inspector; changes cascade live; drafts stay safe.

Deliverables:
- Draft overlay in state; typed edit actions through `core/model`.
- Editable Properties / AI Rules / Accessibility / Documentation tabs.
- Live cascade: editing a token re-resolves all dependents and re-runs a11y.
- Delete with blast-radius guard (block or force+reassign).
- "Unpublished changes" indicator; discard-draft.

Exit criteria: change `color.primary` → every dependent preview updates and contrast
re-evaluates; deleting a depended-on token is guarded with a visible blast radius.

---

## Phase 6 — Versioning & publish
**Goal:** GitHub-commit / Figma-publish feel.

Deliverables:
- `core/diff`, `core/version.commit`; local history persistence (IndexedDB).
- Publish flow: diff → publish summary (affected + blast radius + errors/warnings) →
  required commit message → flatten overlay → new snapshot.
- Version inspector tab: changes since publish, commit log.

Exit criteria: make several edits, publish with a message, see an accurate summary and a
new immutable snapshot; history shows the commit; discard works before publish.

---

## Phase 7 — Exports
**Goal:** generate consumable artifacts from the model.

Deliverables (`core/export`, each pure + golden-tested):
- JSON (round-trip), CSS variables (aliasing preserved), Tailwind theme (semantic names),
  Markdown docs, shadcn registry-prep notes.
- Export menu in the app; draft exports flagged.

Exit criteria: all five exporters produce valid, deterministic output matching golden
fixtures; Tailwind/CSS retain semantic names + aliasing.

---

## Phase 8 — AI context export
**Goal:** structured AI context from the model.

Deliverables:
- `core/ai` projection → `ai-context.json` + `ai-context.md` (per
  `ai-context-strategy.md`), with provenance + content hash.
- Stale-rule flagging via `linked*` ids surfaced in inspector + publish summary.

Exit criteria: AI context regenerates from current state, is system-specific (real
names/values/rules), and flags a rule as stale when its linked node changes.

---

## Phase 9 — Graph view (optional MVP) & polish
**Goal:** visualize relationships; tighten UX/a11y of the chrome itself.

Deliverables:
- Graph view of a node's neighborhood (uses / used-by), impact highlighting.
- App-chrome accessibility pass (keyboard, focus, contrast of neutral palette).
- Empty/error states, performance pass on cascade/memoization.

Exit criteria: graph view reflects the model; chrome passes its own a11y checklist;
MVP exit criteria in `mvp-scope.md` are fully met.

---

## Dependency graph of phases

```
0 ─► 1 ─► 2 ─► 3 ─► 4 ─► 5 ─► 6
                         └► 7 ─► 8
3..6 ─────────────────────────► 9
```

Phases 7 and 8 depend on the model (1/2) and benefit from versioning (6) for provenance,
but can begin once 5 is stable. Phase 9 is the closing polish.

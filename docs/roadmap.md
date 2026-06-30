# Roadmap

A phased arc from local-first MVP to a collaborative, AI-native design system platform.
Detailed build steps for the early phases are in `implementation-phases.md`.

## Horizon 1 — MVP (local-first workspace)
Prove the thesis: a connected, model-driven design system beats scattered tools.
- Core model (Zod), graph (deps/reverse-deps/blast radius), resolution, diff, a11y math
- Workspace shell (navbar, sidebar, canvas, inspector)
- Tokens, 6 components, 4 patterns, contextual previews
- Draft/publish + local history
- Exports: JSON, CSS vars, Tailwind, Markdown, shadcn notes
- AI context export (JSON + Markdown)
- Optional graph view

**Done when** the MVP exit criteria in `mvp-scope.md` are met.

## Horizon 2 — Depth & polish
- Richer graph view (filtering, focus, impact highlighting)
- More components & patterns; component composition authoring
- Better docs generation (templated, per-audience)
- Revert / time-travel UI on history
- Theming/multi-brand (token sets / modes)
- Import: DTCG tokens, existing Tailwind config

## Horizon 3 — Make it real for teams
- Backend (Postgres + Prisma or Supabase): hosted systems, auth
- Multi-writer with optimistic concurrency on snapshots
- Roles/permissions, review/approval before publish (PR-like flow)
- Comments & change requests on nodes

## Horizon 4 — AI-native
- **MCP server** exposing the live system to agents (same core projection)
- Stale-rule detection workflows; "AI rule review" inbox
- Assistant that *queries* the system (never generates apps) to answer
  "what should I use here?"

## Horizon 5 — Ecosystem & sync
- Figma plugin two-way variable sync
- Storybook story generation
- Style Dictionary export
- npm package publishing (tokens + components)
- CI integration (validate design-system PRs, block on a11y regressions)

## Sequencing principles
- Never build a downstream consumer (export/AI/docs) before the model fact it needs.
- Backend only after the local model + flows are proven; the model is already portable.
- Each horizon must keep all prior exports/tests green (the contract holds).

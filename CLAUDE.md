# CLAUDE.md — Project Guidance for AI Coding Agents

> Read this first. Then read `/docs/claude-code-rules.md` before writing any code.

## What this project is

**Yahoda** (working name) is a **design system workspace**: a single source of
truth for AI-friendly, designer-friendly, and developer-friendly UI systems.

It treats a design system as a **living knowledge graph** where tokens, components,
patterns, documentation, accessibility rules, and AI usage rules are all connected
nodes. The app helps designers *define and maintain* the system; developers and AI
tools *consume* it.

## What this project is NOT

- ❌ NOT a Figma replacement / freeform design canvas
- ❌ NOT an AI app/website/page builder (no v0 / Lovable / Framer / Bolt behavior)
- ❌ NOT just documentation (Zeroheight)
- ❌ NOT just a component explorer (Storybook)
- ❌ NOT just a token exporter (Style Dictionary)

It is the connective layer *between* all of those. If a feature starts to look like a
freeform pixel editor or a "generate me an app" feature, stop and re-read
`/docs/product-vision.md`.

## The one architectural law

**The data model comes first. Everything renders from the data model.**

```
                ┌──────────────────────┐
                │  Design System Model  │  ← single source of truth (typed, validated)
                └──────────┬───────────┘
        ┌──────────┬───────┼────────┬───────────┐
        ▼          ▼       ▼        ▼           ▼
    UI render   Previews  Exports  Docs gen   AI context
```

- The UI **renders from** the model. It never holds design data that isn't in the model.
- Exports **generate from** the model. No bespoke export-only data.
- Docs **generate from** the model. No hand-maintained parallel copy.
- AI context **generates from** the model. Same source, different serialization.

If you are tempted to store the same fact in two places, you are creating a bug.

## Documentation map

| File | Purpose |
|------|---------|
| `docs/product-vision.md` | The why, the philosophy, the long arc |
| `docs/design-principles.md` | Product + engineering principles that constrain decisions |
| `docs/mvp-scope.md` | Exactly what's in / out of the MVP |
| `docs/architecture.md` | Stack, module boundaries, state strategy |
| `docs/data-model.md` | The core schemas (the most important doc) |
| `docs/design-system-data-contract.md` | The stable contract exports/AI/UI depend on |
| `docs/ui-system.md` | App chrome layout, neutral palette, preview behavior |
| `docs/export-strategy.md` | JSON / CSS / Tailwind / Markdown / shadcn / MCP |
| `docs/ai-context-strategy.md` | How we produce structured AI context, anti-staleness |
| `docs/versioning-strategy.md` | Draft vs published, commits, diffs, history |
| `docs/accessibility-strategy.md` | Contrast, keyboard, ARIA, validation |
| `docs/roadmap.md` | Phased plan beyond the MVP |
| `docs/implementation-phases.md` | Safe, ordered build phases with exit criteria |
| `docs/quality-review-checklist.md` | The bar every change must clear |
| `docs/ui-quality-review.md` | Visual/UX review rubric for the app chrome |
| `docs/claude-code-rules.md` | Coding standards & rules for AI agents |

## Coding standards (summary — full version in `docs/claude-code-rules.md`)

- TypeScript strict. No `any` in committed code.
- The model is defined with **Zod**; TS types are inferred from Zod. One source.
- Pure functions for: dependency resolution, diffing, exports, AI serialization,
  contrast math. These live in `/packages/core` and have **no React imports**.
- UI is dumb: it reads from the store and dispatches typed actions. No business logic
  in components.
- App chrome stays neutral steel-grey (see `docs/ui-system.md`). The previewed design
  system has its own colors — never let preview colors leak into the chrome.
- Every new exporter must round-trip-test against a known fixture.
- Accessibility math (contrast) is tested with known WCAG fixtures.

## Status

Planning phase complete. No application code yet. See `docs/implementation-phases.md`
for what to build first (Phase 0 → core model package).

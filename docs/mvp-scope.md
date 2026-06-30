# MVP Scope

## Goal of the MVP

Prove the core thesis: a design system modeled as a **connected graph** is more useful
than the same system spread across Figma + Storybook + docs. Do this with a
local-first workspace that renders everything from one typed model and can export it.

## In scope

### 1. Workspace shell
- Global navbar (workspace name, version/publish status, Publish action, export menu)
- Left sidebar (navigation tree of the system)
- Center preview canvas (contextual, read-only)
- Right inspector panel (tabbed: DevTools-for-UI-knowledge)
- Optional graph view (relationships visualization)

### 2. Left sidebar sections
Design Tokens → Colors, Typography, Spacing, Radius, Shadows/Elevation, Motion, Icons,
Accessibility · Components · Patterns · Documentation.

### 3. Token model
Structured token objects (not raw values) with: name, type, value (raw or alias),
description, usage guidance, dependencies, created/updated metadata. Token tiers
(primitive → semantic) via aliasing. Multiple tokens per type. Changing a token
cascades to every consumer. See `data-model.md`.

Seed tokens include: `color.primary`, `color.surface`, `color.text`, `radius.sm/md/lg`,
`spacing.1/2/...`, `typography.heading.lg`.

### 4. Component model
Components as executable knowledge objects: visual definition, variants, states, token
dependencies (bindings), accessibility rules, AI usage rules, developer code,
documentation, examples. Each renders in the preview canvas.

MVP components: **Button, Card, Input, Badge, Alert, Dialog/Modal.**

### 5. Patterns
Composed usage examples built from components, with usage guidance + AI rules.
MVP patterns: **Auth form, Pricing card, Settings section, Empty state.**

### 6. Center canvas (contextual preview)
Large rounded grey area. Read-only. Content changes with selection:
- Color token → swatch + contrast pairs + components using it
- Radius token → cards/buttons/inputs/dialogs at that radius
- Spacing token → card/form/navbar spacing examples
- Typography token → hero/card/label/caption specimens
- Component → variants, states, responsive previews
- Pattern → the composed layout

### 7. Right inspector tabs
Properties (editable) · Dependencies (uses / used-by) · Code (React/Tailwind) ·
AI Rules (editable do/avoid) · Accessibility (contrast/keyboard/ARIA/focus/min-size) ·
Documentation (generated Markdown preview) · Version (changes, last edited, notes).

### 8. Versioning / publishing
Local draft changes → unpublished until **Publish** (requires commit message). Publish
shows affected tokens/components/patterns. History stored locally. Feels like GitHub
commits + Figma library publishing. See `versioning-strategy.md`.

### 9. Exports (MVP set)
JSON design system · Markdown docs · CSS variables · Tailwind theme config · shadcn
registry-prep notes. See `export-strategy.md`.

### 10. AI friendliness (MVP set)
Generate structured AI context (tokens, components, variants, do-rules, avoid-rules,
a11y rules, code examples, patterns) as JSON + Markdown. MCP server is later.

## Out of scope (explicitly NOT in the MVP)

- App / page / website generator of any kind
- Figma-like freeform canvas, vector tools, infinite canvas
- Drag-and-drop layout/design editing
- Real-time multiplayer collaboration
- Hosted backend / auth / teams (local-first only for MVP)
- Figma plugin sync, Storybook export, Style Dictionary export, npm publishing
- Live MCP server (we export AI-context files instead)
- Icon authoring (we reference/preview icons; we don't draw them)

## MVP exit criteria

The MVP is "done" when a user can, locally and end-to-end:

1. Browse a seeded design system in the shell.
2. Select any token/component/pattern and see a meaningful contextual preview.
3. Edit a token value and watch every dependent preview update.
4. See blast radius before deleting a token (and be blocked or warned).
5. Edit AI rules, accessibility notes, and docs for a component.
6. Make draft changes, then Publish with a message and view the diff/history.
7. Export valid JSON, CSS variables, a Tailwind theme, Markdown docs, and AI context —
   all generated from the same model and all passing their tests.

# Product Vision

## One sentence

A single source of truth for AI-friendly, designer-friendly, and developer-friendly UI
systems — a workspace where a design system behaves like a living knowledge graph.

## The problem

Design systems today are fragmented across tools that don't share a brain:

- **Figma variables** know the values but not the code, the rules, or the rationale.
- **Storybook** shows components but not why they exist or when not to use them.
- **Zeroheight / Notion** hold the prose but drift out of sync with reality.
- **Style Dictionary / token exporters** ship values but lose semantic meaning.
- **shadcn registries** ship code but not the surrounding usage knowledge.
- **AI tools** get none of this in a structured way, so they hallucinate UI that
  violates the system.

The result: the "design system" is actually 6 partial copies, each stale in a
different way, and nobody can answer simple questions with confidence.

## The questions this product answers

- What is the approved UI language?
- Why does this component exist?
- When should I use it — and when should I *not*?
- What token does it depend on?
- **What will break if I change this token?**
- How should AI use this component?
- How should developers implement it?
- What changed between versions?
- What documentation should be published?

## The core idea

A modern UI system should describe far more than appearance. For every token,
component, and pattern it should capture:

- what tokens exist and how they relate
- where components are used (and what uses them)
- how and when components should / should not be used
- accessibility requirements
- developer implementation
- AI usage rules ("do" and "avoid")
- documentation
- dependencies and reverse-dependencies
- version & publish history

Everything is **connected**. Example chain:

```
color.primary
  → used by Button, Badge, Toast
  → referenced by an accessibility contrast rule
  → exported to Tailwind theme + CSS variables
  → documented in generated Markdown
  → exposed to AI via structured JSON / (later) MCP
```

Change `color.primary` and the system tells you, before you publish, every node that
moves and every contrast rule that might break.

## Philosophy: relationships first, pixels last

The app **starts from relationships, not pixels**. Pixels are only previews of the
underlying system. The center canvas is a *contextual preview of the data*, never a
freeform drawing surface.

This is the line that keeps us from becoming a Figma clone or an app builder:

> We model the *system of decisions* behind a UI. We render previews of those
> decisions. We never become the place you push pixels around freehand.

## What it should feel like

Storybook + Figma Variables + GitHub + Obsidian's graph + shadcn registry + an AI
context layer — collapsed into one calm, technical, premium workspace.

## Who it's for

- **Designers / design system maintainers** — define and maintain the system.
- **Developers** — consume code, tokens, and implementation guidance.
- **AI tools / agents** — consume structured context so generated UI obeys the system.

## The long arc

1. Local-first workspace that models tokens → components → patterns as a graph.
2. Rich exports (JSON, CSS, Tailwind, Markdown, shadcn notes).
3. Versioning that feels like GitHub commits + Figma library publishing.
4. An **MCP server** so AI agents query the live system instead of guessing.
5. Team collaboration, sync to Figma/Storybook, npm package publishing.

The MVP is step 1 + the first slice of step 2 & 3. See `mvp-scope.md`.

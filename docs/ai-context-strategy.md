# AI Context Strategy

The app does **not** generate apps. It generates **structured context** so AI tools and
agents produce UI that obeys the system. AI context is a pure projection of the model.

## What we produce

A serializable `AIContext` document (JSON + a Markdown rendering) containing:

- **tokens** — name, type, tier, resolved value, usage guidance
- **components** — intent, variants, states, prop surface, token bindings
- **usage rules** — `do` (when/how to use)
- **avoid rules** — when NOT to use
- **accessibility rules** — contrast/keyboard/ARIA/focus/min-size (with computed results)
- **code examples** — generated React/Tailwind per component/variant
- **patterns** — composed examples with their own do/avoid rules

```ts
AIContext = {
  schemaVersion: string
  system: { name; commitId; generatedAt: ISO; contentHash: string }
  tokens: AITokenSummary[]
  components: AIComponentSummary[]
  patterns: AIPatternSummary[]
}
```

## Delivery

- **MVP**: export `ai-context.json` + `ai-context.md`. These can be dropped into a repo,
  a prompt, or a tool's knowledge base.
- **Later**: an **MCP server** exposing the live system as tools/resources so an agent
  queries current truth instead of a stale file. Because `core` is framework-free, the
  MCP server reuses the exact same projection function.

## Anti-staleness (the hard part)

AI rules (and docs) rot when the system changes underneath them. Mitigations:

1. **Link rules to nodes, not prose.** `AIRules.linkedTokens` / `linkedComponents` tie a
   rule to specific ids. When a linked node changes materially, the rule is flagged
   "review needed" in the inspector and in the pre-publish check.
2. **Generated facts vs authored intent.** Token values, variant lists, prop surfaces,
   contrast results are **always generated** from the model — never typed by hand, so
   they can't be stale. Humans only author *intent* (do/avoid/why), which changes less.
3. **Content hash + provenance.** `AIContext` carries `contentHash` + `commitId`. A
   consumer can detect "the system moved since this context was generated."
4. **Staleness surfacing.** Each rule shows `lastReviewedCommit`. If the linked node has
   changed since, the UI marks it stale and it appears in the publish summary.
5. **No orphan rules.** A rule whose `linked*` ids no longer exist is reported as broken
   (same machinery as dangling references).
6. **Regenerate on export.** AI context is regenerated at export time from current state;
   we never ship a cached copy.

## Avoiding generic output

The goal is context that is *specific to this system*, not boilerplate:

- Pull real token names, real values, real variant names, real examples from the model.
- Include the **why** (intent) and the **avoid** rules — the parts generic advice lacks.
- Reference concrete a11y results ("text on `color.primary` is 4.8:1, passes AA").
- Cross-link: each component lists the exact tokens it binds and the patterns it's used
  in. Each token lists its consumers. This relational specificity is the differentiator.

## Example (abridged `ai-context.json`)

```jsonc
{
  "schemaVersion": "1.0.0",
  "system": { "name": "Acme UI", "commitId": "c_0192", "contentHash": "sha256:…" },
  "components": [{
    "name": "Button",
    "intent": "Trigger a single, clear action.",
    "variants": ["primary", "secondary", "ghost"],
    "states": ["default", "hover", "focus", "disabled", "loading"],
    "tokens": { "background": "color.primary", "radius": "radius.md" },
    "do": ["Use one primary Button per view for the main action."],
    "avoid": ["Don't use Button for navigation — use Link.",
              "Don't place two primary Buttons side by side."],
    "accessibility": { "contrast": "text on color.primary = 4.8:1 (AA pass)",
                       "keyboard": ["Enter/Space activate"], "focusVisible": true },
    "code": "<Button variant=\"primary\">Save</Button>"
  }]
}
```

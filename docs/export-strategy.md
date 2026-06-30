# Export Strategy

Every export is a **pure function of the model**: `(DesignSystem) => Output`. No
export-only data, no manual steps. Each exporter is deterministic and golden-file
tested. Exports must **preserve semantic meaning** wherever the target format allows.

## MVP exports

### 1. JSON design system
- Canonical serialization of the model (the contract, see
  `design-system-data-contract.md`). Includes `schemaVersion`.
- Round-trip test: `parse(serialize(ds))` deep-equals `ds`.
- This is the portable file users import/export.

### 2. CSS variables
- Emit semantic tokens as CSS custom properties under a scope.
```css
:root {
  /* primitives */
  --palette-blue-600: #2448B8;
  /* semantic (reference primitives via var()) */
  --color-primary: var(--palette-blue-600);
  --radius-md: 8px;
}
```
- **Preserve aliasing**: semantic vars reference primitive vars with `var()`, so the
  tier structure survives. Composite tokens (typography, shadow) expand to the con
  conventional CSS properties or grouped vars.

### 3. Tailwind theme config
- Map semantic tokens into `theme.extend` keeping **semantic names**, not raw hex.
```ts
export default {
  theme: { extend: {
    colors:       { primary: "var(--color-primary)", surface: "var(--color-surface)" },
    borderRadius: { sm: "var(--radius-sm)", md: "var(--radius-md)", lg: "var(--radius-lg)" },
    spacing:      { 1: "var(--spacing-1)", 2: "var(--spacing-2)" },
    fontSize:     { "heading-lg": ["2rem", { lineHeight: "2.4rem" }] },
  } }
}
```
- Default mode references the CSS variables (so runtime theme swaps work). A "static"
  mode can inline resolved values for users who don't want CSS vars.
- **No losing semantic meaning**: keys are the semantic token names; we never flatten to
  anonymous `colors: { '2448b8': ... }`.

### 4. Markdown documentation
- Generate per-node and index docs from the model: token tables (name, value, usage,
  used-by), component pages (variants, states, props, a11y, do/avoid, code, examples).
- Generated sections are clearly delimited so authored prose can sit alongside without
  being overwritten (see anti-staleness in `ai-context-strategy.md`).

### 5. shadcn-compatible component notes / registry prep
- For each component, emit a registry-style descriptor: name, dependencies, the token
  bindings it needs, variant/prop surface, and the generated code snippet — shaped to be
  turn-key for a future `registry.json`. MVP outputs notes + a draft registry item; full
  registry publishing is later.

## Later exports

- **Figma plugin sync** — push/pull variables to a Figma file.
- **Storybook** — generate stories from components + examples.
- **Style Dictionary** — emit a `tokens.json` in DTCG/Style-Dictionary format.
- **MCP server** — live AI access (see `ai-context-strategy.md`).
- **npm package** — publish tokens + component code as an installable package.

## Cross-cutting rules

1. **Semantic preservation** — names like `color.primary` survive into every format that
   has names. Resolved hex appears only where the format forces it (and even then we
   keep the name as a comment/metadata).
2. **Aliasing preservation** — where the format supports references (CSS `var()`,
   Tailwind), semantic → primitive links are kept, not flattened.
3. **Determinism** — stable ordering (by name) so diffs are clean and golden tests hold.
4. **Validation gate** — `assertPublishable` must pass before export of a published
   system; draft exports are allowed but flagged "draft".
5. **Provenance** — every export header includes `schemaVersion`, system name, and the
   source commit id so consumers know exactly what they got.
6. **One transform, one test** — each target has a golden fixture; output changes are
   reviewed as fixture diffs.

## DTCG alignment

Where reasonable, align our token JSON with the **Design Tokens Community Group** format
(types, `$value`, `$type`, aliasing) so Style Dictionary / Figma interop is cheap later.
Our internal model is richer (usage, a11y, AI rules); the DTCG export is a subset.

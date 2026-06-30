# UI System (app chrome)

> Working product name: **Yahoda**.

The app chrome is **neutral, steel-grey, quiet, almost industrial**. It must never
compete with the user's previewed design system, which is the only place color lives.

## Tone

Calm · technical · premium · slightly futuristic · designer/developer hybrid. Not
playful SaaS, not a bright colorful AI app.

## Palette (app chrome only — fixed CSS variables)

| Role | Value | Token |
|------|-------|-------|
| Page background | `#ECEEF1` | `--app-page` |
| Surface | `#E3E6EA` | `--app-surface` |
| Canvas | `#D7DBE0` | `--app-canvas` |
| Border | `#C4C9D1` | `--app-border` |
| Text strong | `#181A1D` | `--app-text-strong` |
| Text muted | `#50555D` | `--app-text-muted` |
| Text faint | `#7C828B` | `--app-text-faint` |
| Primary blue | `#1F4FD8` (or `#2448B8`) | `--app-primary` |

Rules:
- Chrome uses **only** these variables. No arbitrary colors in chrome components.
- The **previewed design system has its own tokens/colors**. Preview content renders in
  an isolated scope so its tokens cannot bleed into the chrome (and vice versa).
- A dark theme can come later by swapping the variable set; build chrome against the
  variables, never hard-coded hex.

## Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ NAVBAR  [Yahoda]     workspace ▾      ● 3 unpublished   [Export ▾] [Publish] │
├───────────┬──────────────────────────────────────────┬───────────────┤
│ SIDEBAR   │           CENTER CANVAS                   │  INSPECTOR    │
│           │  large rounded grey contextual preview    │  (tabbed)     │
│ Tokens    │                                           │  Properties   │
│  Colors   │  content changes with selection           │  Dependencies │
│  Type     │  (read-only previews/specimens)           │  Code         │
│  Spacing  │                                           │  AI Rules     │
│  Radius   │                                           │  Accessibility│
│  Shadows  │                                           │  Documentation│
│  Motion   │                                           │  Version      │
│  Icons    │                                           │               │
│  A11y     │                                           │               │
│ Components │                                          │               │
│ Patterns  │                                           │               │
│ Docs      │                                           │               │
├───────────┴──────────────────────────────────────────┴───────────────┤
│ (optional) GRAPH VIEW toggle — relationships of the selected node      │
└──────────────────────────────────────────────────────────────────────┘
```

- **Navbar**: workspace name + placeholder brand, workspace switcher, unpublished-change
  indicator, Export menu, Publish button. Compact pill navigation aesthetic.
- **Sidebar**: navigation tree of the system (sections from `mvp-scope.md`). Selecting a
  node drives the canvas + inspector. Search/filter at top.
- **Center canvas**: large rounded grey area (`--app-canvas`), generous padding, subtle
  inner depth. **Read-only contextual preview**, never a freeform editor.
- **Inspector**: right panel (can also be a floating card). Tabbed; DevTools-for-UI-
  knowledge. Tabs per `mvp-scope.md`.
- **Graph view** (optional MVP): visualize the selected node's neighborhood.

## Visual language

- Soft steel surfaces, subtle depth (1–2 elevation levels, low-contrast shadows).
- Large corner radius on the canvas; medium radius on cards/controls in chrome.
- Compact, pill-shaped nav/segmented controls.
- Minimal color: blue only for primary actions/active state; everything else greyscale.
- Typography: one clean technical sans; clear size hierarchy; tabular numerals for
  values; monospace for code/values in the inspector.

## Contextual preview behavior (the heart of the canvas)

The canvas is a **projection of the selected node**, read-only:

| Selection | Canvas shows |
|-----------|--------------|
| Color token | Swatch, resolved value, contrast pairs (pass/fail badges), components using it |
| Radius token | Cards, buttons, inputs, dialogs rendered at that radius |
| Spacing token | Layout examples: card spacing, form spacing, navbar spacing |
| Typography token | Hero text, card text, form labels, captions specimens |
| Shadow/elevation | Surfaces at each elevation side by side |
| Motion token | Playable animation demo (see below) |
| Component | Variants × states grid, responsive preview, examples |
| Pattern | The composed layout |

### Showing spacing
Render real layout fragments (card, form, navbar) and overlay measured gaps/insets as
thin labeled rulers that use the selected spacing token. Toggle "measurements" on/off.

### Showing motion
Provide a play/replay control and a small stage where an element animates using the
token's duration + easing. Show the easing curve graph and the numeric values. Respect
`prefers-reduced-motion`: default to a static "before/after" with an explicit play.

### Unresolved/broken state
If a previewed node references a missing/deprecated token, render a clear placeholder
("Unresolved token: …") instead of crashing or silently defaulting.

## Isolation requirement

Preview content is rendered inside a scoped boundary (separate CSS variable namespace,
e.g. `--ds-*`, applied to a container). Chrome `--app-*` variables and preview `--ds-*`
variables never mix. This is what lets the previewed system be loud while the app stays
quiet.

See `ui-quality-review.md` for the visual QA rubric.

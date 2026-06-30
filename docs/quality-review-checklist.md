# Quality Review Checklist

The bar every change must clear before it's considered done. Also encodes how we handle
the tricky edge cases.

## Architecture
- [ ] No design data stored outside the model (single source of truth).
- [ ] `packages/core` has zero React/Next/DOM imports.
- [ ] Derived data (reverse deps, blast radius, contrast) is computed, not stored.
- [ ] Exports/docs/AI context are pure functions of the model.
- [ ] New/changed shapes are reflected in Zod schema; TS types inferred, not hand-written.
- [ ] Contract change → `schemaVersion` bump + migration + fixture.

## Correctness & tests
- [ ] New core logic has unit tests (happy + failure paths).
- [ ] New exporter has a golden-file test; round-trip holds for JSON.
- [ ] Contrast/a11y math tested against known WCAG fixtures.
- [ ] Invalid model input fails loudly with a precise error.

## UI
- [ ] Chrome uses only `--app-*` variables; no arbitrary hex.
- [ ] Preview content is CSS-isolated (`--ds-*`); no bleed either direction.
- [ ] Unresolved/broken references render an explicit placeholder, not a crash.
- [ ] Components contain no business logic; they read selectors + dispatch typed actions.
- [ ] See `ui-quality-review.md` for the visual rubric.

## Accessibility (of our app)
- [ ] Keyboard reachable; visible focus; sensible ARIA.
- [ ] Neutral palette meets contrast for text/UI roles.
- [ ] Motion respects `prefers-reduced-motion`.

## Versioning
- [ ] Edits go through the draft overlay; `published` is never mutated in place.
- [ ] Publish requires a message and shows an accurate affected-nodes summary.

---

## Edge cases — how we handle each

**Token deleted but components depend on it**
Block the delete by default; show blast radius (the dependent components/patterns). Offer
"force delete + reassign" which requires choosing a replacement token for each binding.
Never leave dangling refs (invariant #2). Pre-publish check would also catch it.

**Token value change breaks contrast**
`core/a11y` recomputes affected contrast rules on every change. Failing ratios surface
immediately in the Accessibility tab and as **warnings** in the publish summary (not a
hard block — the user may intend it, but they must see it).

**Draft vs published changes**
Edits live in the draft overlay; `published` is an immutable snapshot. Exports from draft
are flagged `draft`. Publishing flattens the overlay into a new snapshot. Discard drops
the overlay. (See `versioning-strategy.md`.)

**How dependencies are tracked**
Explicitly, by id: token `$ref` (aliasing), component `TokenBinding.tokenId`, pattern
`componentId`, doc `target.id`. These edges are the only dependency source.

**How reverse dependencies are shown**
`core/graph` inverts all edges to produce `usedBy` per node; the Dependencies inspector
tab shows both "uses" and "used by", and the graph view highlights the neighborhood.

**Components inheriting globals but overriding specifics**
A component inherits semantic tokens via bindings. An override is a binding with
`appliesTo: { variant?, state? }` pointing at a *different* token — it never mutates the
global. Resolution applies the most specific matching binding.

**Multiple radius/spacing/type tokens**
First-class: many tokens per type, each with a unique name. Bindings point at a specific
token, so Button=`radius.md`, Card=`radius.lg` coexist naturally.

**Preventing stale AI rules**
Rules link to node ids (`linkedTokens`/`linkedComponents`); material changes flag the
rule "review needed" in the inspector + publish summary. Facts (values/variants/contrast)
are always generated, never authored. Content hash + commit id detect drift.
(See `ai-context-strategy.md`.)

**Generating docs without them becoming generic**
Generated sections pull real names/values/used-by/examples + the authored *intent* and
*avoid* rules. Generic boilerplate is avoided by sourcing specifics from the model and
foregrounding the "why/when-not".

**Exporting Tailwind without losing semantic meaning**
Theme keys are semantic token names; values reference CSS variables (`var(--color-
primary)`) preserving aliasing. We never flatten to anonymous hex keys.
(See `export-strategy.md`.)

**Representing component variants**
`Variant[]` (named prop sets) × `State[]` (interaction states); bindings can be scoped to
a variant/state via `appliesTo`. Previews render the variants × states grid.

**Handling deprecated components/tokens**
`status: "deprecated"` / `deprecated: { reason, replacedBy }`. Still referenceable, but
referencing one is a **warning** in inspector + publish summary, with a suggested
replacement. Not auto-deleted.

**Showing spacing in preview**
Render real layout fragments (card/form/navbar) with thin labeled rulers measuring the
selected spacing token; toggle measurements on/off. (See `ui-system.md`.)

**Showing motion in preview**
Play/replay stage animating with the token's duration + easing, plus the easing curve
graph and numeric values; respects `prefers-reduced-motion`.

**Validating accessibility**
Computed, not asserted: WCAG contrast math, target-size checks, declared keyboard/ARIA/
focus specs; unified report drives the Accessibility tab + publish warnings.
(See `accessibility-strategy.md`.)

**Avoiding becoming a Figma clone**
Hard line: the canvas is **read-only contextual preview**, never freeform editing. No
vector tools, no infinite canvas, no drag-to-design. We model the system of decisions;
pixels are only projections. (See `product-vision.md` / `design-principles.md`.)

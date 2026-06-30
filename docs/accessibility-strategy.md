# Accessibility Strategy

Accessibility is **validated, not asserted**. Contrast and target-size claims are
computed from the model and checked against WCAG fixtures. This applies both to the
*previewed design system* and to the *app chrome itself*.

## Two layers of a11y

1. **The app chrome** — Yahoda must itself be accessible (keyboard nav, focus, ARIA,
   contrast of the neutral palette). Held to the same bar we ask of users.
2. **The previewed system** — we *validate the user's* tokens/components and report
   results; we don't silently fix them.

## Contrast

- `ContrastRule { foregroundTokenId, backgroundTokenId, level: "AA"|"AAA", role: "text"|"ui" }`
- `core/a11y` resolves both tokens to concrete colors and computes the WCAG 2.x contrast
  ratio. Pass thresholds:
  - text AA: 4.5:1 (large text 3:1); text AAA: 7:1 (large 4.5:1)
  - non-text/UI (role `"ui"`): 3:1
- Results are **derived**, never stored. Each component's Accessibility tab shows
  ratio + pass/fail badge per rule.
- A value change that drops a ratio below its target surfaces as a **publish warning**.
- Contrast math is unit-tested against known WCAG color pairs.
- (Roadmap) APCA as an alternative algorithm once stable in our tooling.

## Keyboard

- Components declare expected keyboard interactions (`A11ySpec.keyboard`), e.g. Button:
  Enter/Space; Dialog: Esc closes, focus trap, return focus on close.
- Preview renders interactive examples so keyboard behavior is demonstrable.
- MVP validates *presence* of declared interactions in the spec + generated code notes;
  automated runtime keyboard testing is a later (Playwright) addition.

## ARIA & roles

- `A11ySpec.aria` captures intended role + attributes + notes. Generated code and docs
  surface these. Patterns inherit/aggregate component roles.
- The inspector flags components that lack any aria/role guidance as incomplete.

## Focus

- `A11ySpec.focus.visible` must be true for interactive components; the preview shows the
  focus state explicitly (it's a first-class `State`). Focus indicators in the previewed
  system are themselves contrast-checked against their background (role `"ui"`).

## Minimum target size

- `A11ySpec.minTargetSize` (default guidance: 24×24 CSS px per WCAG 2.2, 44×44 for
  comfortable touch). `core/a11y` checks a component's resolved size bindings against the
  declared minimum and warns if smaller.

## Validation surface

`validateInvariants` + `core/a11y` feed a unified report:
- **errors** (block publish): broken contrast-rule references, unresolved tokens.
- **warnings** (don't block, but shown): contrast below target, target size below
  minimum, missing focus-visible on an interactive component, missing aria guidance.

The Accessibility inspector tab and the publish summary both read this report.

## Reduced motion

- Motion previews respect `prefers-reduced-motion`; motion guidance encourages reduced-
  motion alternatives. (See motion preview in `ui-system.md`.)

## What's MVP vs later

| Capability | MVP | Later |
|-----------|-----|-------|
| Contrast computation + badges | ✅ | APCA option |
| Target-size check | ✅ | |
| Declared keyboard/ARIA/focus specs | ✅ | |
| Publish-time a11y warnings | ✅ | |
| Automated runtime keyboard/AT testing | — | ✅ (Playwright/axe) |
| Screen-reader transcript previews | — | ✅ |

# UI Quality Review

Visual/UX rubric for the **app chrome**. The previewed design system has its own quality;
this is about Yahoda itself looking and feeling: calm, technical, premium, steel-grey.

## Identity & restraint
- [ ] Chrome is neutral steel-grey; color (blue) appears only on primary actions/active
      state. No decorative color.
- [ ] The previewed system is the only place vivid color lives; chrome never competes.
- [ ] Preview content is visually contained (the large rounded canvas) and clearly
      separated from chrome.

## Palette & theming
- [ ] Only `--app-*` variables used in chrome (no hard-coded hex).
- [ ] Surfaces map correctly: page `#ECEEF1`, surface `#E3E6EA`, canvas `#D7DBE0`,
      border `#C4C9D1`.
- [ ] Text hierarchy uses strong/muted/faint correctly; values use tabular numerals.

## Layout & depth
- [ ] Navbar / sidebar / canvas / inspector match `ui-system.md`.
- [ ] Large radius on the canvas; consistent medium radius on chrome cards/controls.
- [ ] Subtle depth only (1–2 elevation levels, low-contrast shadows). Nothing glossy.
- [ ] Compact pill navigation / segmented controls where appropriate.
- [ ] Comfortable, consistent spacing rhythm; nothing cramped or floaty.

## Preview behavior
- [ ] Canvas content changes correctly with selection (color/radius/spacing/type/shadow/
      motion/component/pattern).
- [ ] Spacing previews show labeled rulers; motion previews have play/replay.
- [ ] Unresolved-token state renders a clear placeholder, never blank or broken.
- [ ] Previews read resolved values (aliasing/overrides already applied).

## Inspector
- [ ] Tabs present and correct; reads like DevTools for UI knowledge.
- [ ] Editable fields are obviously editable; read-only data is obviously not.
- [ ] Dependencies tab shows both "uses" and "used by".
- [ ] Code tab shows real generated React/Tailwind for the selection.

## States
- [ ] Empty states (no system loaded, empty section) are designed, not blank.
- [ ] Loading and error states are handled and on-brand.
- [ ] "Unpublished changes" indicator is visible and accurate.

## Interaction & a11y
- [ ] Full keyboard navigation; visible focus rings (contrast-checked).
- [ ] Hit targets ≥ minimum size; hover/active/focus states present.
- [ ] Respects `prefers-reduced-motion`.
- [ ] Resizing panels / responsive behavior is graceful.

## Performance feel
- [ ] Selection → preview/inspector update feels instant (memoized selectors).
- [ ] Editing a token cascades without jank on the seed system.

## Reviewer prompt
> Does this screen feel like a calm, premium, technical instrument a design-systems team
> would trust — or like a generic SaaS dashboard? If the latter, it fails.

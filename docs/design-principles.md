# Design Principles

These are the constraints we use to settle arguments. When two approaches both "work,"
pick the one that honors more of these principles.

## Product principles

1. **Relationships first, pixels last.** The graph is the product. Previews are
   read-only renderings of the graph. We never add a freeform editing surface.

2. **One source of truth.** A fact lives in exactly one place — the model. UI, exports,
   docs, and AI context are all *projections* of that fact. No parallel copies.

3. **Make consequences visible.** Before any destructive or cascading action (delete a
   token, change a value), show the blast radius: what depends on it, what breaks.

4. **Drafts are safe; publishing is deliberate.** You can experiment freely in a draft.
   Nothing is "real" until you publish with a message. Publishing is the commit.

5. **Knowledge over decoration.** Every component carries *why it exists, when to use
   it, when not to*. A component without usage rules is incomplete, not just unstyled.

6. **Neutral chrome, vivid system.** The app is quiet steel-grey so the user's design
   system is the only color on screen. The chrome must never compete with the preview.

7. **AI is a consumer, not an author.** We generate *structured context* for AI. We do
   not generate apps. AI rules are first-class, editable data — not an afterthought.

8. **Semantic meaning survives export.** Exports keep semantic names (`color.primary`),
   not just resolved values. A Tailwind theme should read like the system, not like a
   hex dump.

## Engineering principles

9. **The core is framework-free.** Model, validation, dependency resolution, diffing,
   exporters, contrast math, and AI serialization live in pure TypeScript with zero
   React/Next imports. They are unit-testable in isolation.

10. **Schema is the contract.** Zod schemas define the model; TS types are *inferred*
    from them. Validation happens at every boundary (load, import, pre-publish).

11. **Derive, don't duplicate.** Reverse dependencies, blast radius, contrast results,
    and "used by" lists are *computed* from references, not hand-maintained fields.

12. **Pure, testable transforms.** Every export and every AI projection is a pure
    function `(DesignSystem) => Output`. Each has a round-trip or golden-file test.

13. **Local-first, sync-later.** The MVP persists locally (JSON + IndexedDB/file). The
    model is serializable and portable so a backend can be added without a rewrite.

14. **Typed actions, dumb UI.** Components read from the store and dispatch typed
    actions. No business logic in JSX. State mutations go through the core layer.

15. **Fail loud in dev, degrade gracefully in preview.** Invalid model data throws in
    development; previews render a clear "unresolved token" state rather than crashing.

16. **Accessibility is validated, not asserted.** Contrast and target-size claims are
    computed and checked against WCAG fixtures, never just written in prose.

## Anti-goals (say no to these)

- A freeform/infinite canvas or vector editing.
- "Generate a landing page / app from a prompt."
- A WYSIWYG component builder with drag-and-drop layout.
- Storing design data anywhere other than the model.
- Export formats that drop semantic naming.
- AI rules that are static text with no link to the components they describe.

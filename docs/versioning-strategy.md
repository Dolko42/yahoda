# Versioning Strategy

Inspired by **GitHub commits** + **Figma library publishing**. Designers experiment in a
draft; nothing is real until they Publish with a message.

## Model: published baseline + draft overlay

- `published` — the immutable canonical `Snapshot` (last committed state).
- `draft` — a `DraftOverlay`: an ordered set of `Change`s on top of `published`.
- The **working set** the app renders = `published` with `draft` applied.

```
published (immutable) ──apply──► working set (what you see/edit)
        ▲                              │ edits append/merge changes
        │ publish (flatten draft)      ▼
   new Snapshot ◄──── commit(message) ── draft overlay
```

This makes "drafts are safe" cheap: discard = drop the overlay; nothing in `published`
was ever mutated.

## Change tracking

Every edit produces a `Change { op, kind, id, before, after }`. Changes to the same node
are coalesced (last-write-wins per field) so the overlay stays compact. The overlay is
autosaved continuously (local-first).

## Draft vs published — the differences

| | Draft | Published |
|--|------|-----------|
| Visibility | Only in this workspace | The "official" system consumers see |
| Mutability | Freely editable | Immutable snapshot |
| Exports | Allowed, flagged `draft` | Canonical, carry `commitId` |
| Validation | Warnings shown live | `assertPublishable` must pass |
| AI context | Regenerated, marked draft | Stamped with `commitId` + hash |

## Publishing flow

1. User clicks **Publish**.
2. App computes the diff (`core/diff`) between working set and `published`.
3. **Publish summary** shows affected nodes grouped by kind, plus:
   - new / changed / removed tokens, components, patterns
   - **blast radius** of each change (what else is impacted)
   - validation **errors** (block) and **warnings** (deprecations, contrast failures,
     stale AI rules)
4. `assertPublishable` runs; hard errors block publishing.
5. User enters a **commit message** (required) and confirms.
6. `core/version.commit(message)` flattens the overlay into a new `Snapshot`, appends a
   `Commit` to `history`, clears the overlay.

## Diffing

`core/diff(working, published)` returns a structured diff:
```ts
Diff = {
  tokens:     { added: Node[]; updated: FieldDiff[]; removed: Node[] }
  components: { … }
  patterns:   { … }
  docs:       { … }
  affected:   { tokens: id[]; components: id[]; patterns: id[] }  // incl. blast radius
}
```
Field-level diffs power the Version inspector tab and the publish summary.

## History

- `history: Commit[]` — ordered, immutable. Each `Commit` stores its message, author,
  timestamp, the changes, and the affected/blast-radius node ids.
- The Version tab shows: last edited, changes since last publish, and the commit log.
- MVP stores history locally (in the document / IndexedDB). A backend can later store
  snapshots server-side without changing the model.

## Revert / time travel (MVP-light, later-full)

- MVP: view any past commit's summary; "discard draft" to reset to `published`.
- Later: check out a past snapshot, revert a specific commit, branch a draft. The
  snapshot+overlay model already supports this; it's a UI/affordance question.

## Concurrency (later)

Local-first MVP is single-writer. When a backend arrives: optimistic concurrency on the
`published` snapshot (compare base commit id; reject/merge on conflict). The overlay
model maps cleanly onto a server-side draft branch per user.

## Edge cases handled here

- **Deleting a token with dependents** — diff/publish summary shows blast radius; the
  delete is blocked (or requires explicit "force + reassign") if anything binds it.
  See `quality-review-checklist.md` and `mvp-scope.md`.
- **Contrast broken by a value change** — surfaced as a warning in the publish summary,
  tied to the affected contrast rule.
- **Stale AI rules** — linked-node changes flag affected rules in the summary.

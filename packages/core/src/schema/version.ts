import { z } from "zod";
import { Component } from "./components.js";
import { DocNode } from "./docs.js";
import { Id, ISODate, JsonValue, NodeKind } from "./common.js";
import { Pattern } from "./patterns.js";
import { Token } from "./tokens.js";

/**
 * Versioning nodes. Inspired by GitHub commits + Figma library publishing.
 * Model: published baseline + draft overlay. See docs/versioning-strategy.md.
 */

export const Change = z
  .object({
    op: z.enum(["add", "update", "remove"]),
    kind: NodeKind,
    id: Id,
    before: JsonValue.optional(),
    after: JsonValue.optional(),
  })
  .strict();
export type Change = z.infer<typeof Change>;

export const DraftOverlay = z
  .object({ changes: z.array(Change).default([]) })
  .strict();
export type DraftOverlay = z.infer<typeof DraftOverlay>;

/** An immutable point-in-time copy of the working set, captured on publish. */
export const Snapshot = z
  .object({
    tokens: z.array(Token),
    components: z.array(Component),
    patterns: z.array(Pattern),
    docs: z.array(DocNode),
    takenAt: ISODate,
    commitId: Id,
  })
  .strict();
export type Snapshot = z.infer<typeof Snapshot>;

export const Commit = z
  .object({
    id: Id,
    message: z.string().min(1),
    author: z.string().optional(),
    createdAt: ISODate,
    changes: z.array(Change).default([]),
    affected: z
      .object({
        tokens: z.array(Id).default([]),
        components: z.array(Id).default([]),
        patterns: z.array(Id).default([]),
      })
      .strict(),
  })
  .strict();
export type Commit = z.infer<typeof Commit>;

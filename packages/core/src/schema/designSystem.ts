import { z } from "zod";
import { Component } from "./components.js";
import { DocNode } from "./docs.js";
import { ISODate } from "./common.js";
import { Pattern } from "./patterns.js";
import { Token } from "./tokens.js";
import { Commit, DraftOverlay, Snapshot } from "./version.js";

/** The contract version this document is written against (semver). */
export const SCHEMA_VERSION = "1.0.0";

/**
 * Root document. The top-level arrays are the canonical WORKING SET (what you edit
 * and see). `published` is the immutable last-published baseline (null = never
 * published yet). `draft` tracks uncommitted changes; `history` is the commit log.
 *
 * NOTE (Phase 1): working set is authoritative; the apply/flatten machinery that
 * keeps `published` + `draft` reconciled with the working set lands in Phase 6.
 */
export const DesignSystem = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    schemaVersion: z.string().min(1),
    meta: z
      .object({
        description: z.string().optional(),
        createdAt: ISODate,
        updatedAt: ISODate,
      })
      .strict(),

    tokens: z.array(Token).default([]),
    components: z.array(Component).default([]),
    patterns: z.array(Pattern).default([]),
    docs: z.array(DocNode).default([]),

    published: Snapshot.nullable().default(null),
    draft: DraftOverlay.default({ changes: [] }),
    history: z.array(Commit).default([]),
  })
  .strict();
export type DesignSystem = z.infer<typeof DesignSystem>;

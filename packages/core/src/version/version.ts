import type { Commit, DesignSystem, Snapshot } from "../schema/index.js";
import {
  type Diff,
  type WorkingSet,
  changeRecords,
  computeAffected,
  diff,
  totalChanges,
} from "../diff/index.js";
import { type ValidationReport, validateInvariants } from "../model/index.js";

/**
 * Versioning operations: published baseline + draft overlay. Publishing flattens the
 * working set into a new immutable snapshot and appends a commit to history.
 * See docs/versioning-strategy.md.
 */

const EMPTY: WorkingSet = { tokens: [], components: [], patterns: [], docs: [] };

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function generateId(): string {
  return `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** The reference baseline a draft is measured against (last published, or empty). */
export function publishedBaseline(ds: DesignSystem): WorkingSet {
  return ds.published ?? EMPTY;
}

export interface PublishSummary {
  diff: Diff;
  affected: { tokens: string[]; components: string[]; patterns: string[] };
  validation: ValidationReport;
  totalChanges: number;
  /** safe to publish: has changes AND no validation errors */
  publishable: boolean;
}

/** Everything the publish dialog needs: what changed, what's impacted, what's wrong. */
export function publishSummary(ds: DesignSystem): PublishSummary {
  const d = diff(publishedBaseline(ds), ds);
  const affected = computeAffected(ds, d);
  const validation = validateInvariants(ds);
  const total = totalChanges(d);
  return {
    diff: d,
    affected,
    validation,
    totalChanges: total,
    publishable: total > 0 && validation.ok,
  };
}

export interface CommitOptions {
  author?: string;
  now?: string;
  id?: string;
}

/**
 * Flatten the working set into a new published snapshot + commit. Pure: returns a new
 * DesignSystem with `published` replaced, `draft` cleared, and the commit appended.
 */
export function commit(
  ds: DesignSystem,
  message: string,
  opts: CommitOptions = {},
): DesignSystem {
  if (!message.trim()) throw new Error("commit: a non-empty message is required");

  const d = diff(publishedBaseline(ds), ds);
  const commitId = opts.id ?? generateId();
  const createdAt = opts.now ?? new Date().toISOString();
  const affected = computeAffected(ds, d);

  const snapshot: Snapshot = {
    tokens: clone(ds.tokens),
    components: clone(ds.components),
    patterns: clone(ds.patterns),
    docs: clone(ds.docs),
    takenAt: createdAt,
    commitId,
  };

  const newCommit: Commit = {
    id: commitId,
    message: message.trim(),
    createdAt,
    changes: changeRecords(d),
    affected,
    ...(opts.author ? { author: opts.author } : {}),
  };

  return {
    ...ds,
    published: snapshot,
    draft: { changes: [] },
    history: [...ds.history, newCommit],
  };
}

/** Discard the draft: reset the working set to the last published snapshot. No-op if never published. */
export function revertToPublished(ds: DesignSystem): DesignSystem {
  if (!ds.published) return ds;
  const p = ds.published;
  return {
    ...ds,
    tokens: clone(p.tokens),
    components: clone(p.components),
    patterns: clone(p.patterns),
    docs: clone(p.docs),
    draft: { changes: [] },
  };
}

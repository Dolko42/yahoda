import type {
  Change,
  Component,
  DesignSystem,
  DocNode,
  Pattern,
  Token,
} from "../schema/index.js";
import { type GraphSource, getBlastRadius } from "../graph/index.js";

/**
 * Structured diff between two working sets (e.g. last published snapshot vs current
 * draft). Field-level for updates. `meta` is ignored so a pure timestamp bump is not
 * reported as a change. See docs/versioning-strategy.md.
 */

export type WorkingSet = Pick<
  DesignSystem,
  "tokens" | "components" | "patterns" | "docs"
>;

export interface Updated<T> {
  before: T;
  after: T;
  fields: string[];
}

export interface NodeDiff<T> {
  added: T[];
  removed: T[];
  updated: Updated<T>[];
}

export interface Diff {
  tokens: NodeDiff<Token>;
  components: NodeDiff<Component>;
  patterns: NodeDiff<Pattern>;
  docs: NodeDiff<DocNode>;
  changedIds: {
    tokens: string[];
    components: string[];
    patterns: string[];
    docs: string[];
  };
  isEmpty: boolean;
}

const IGNORED_FIELDS = new Set(["meta"]);

function changedFields<T extends Record<string, unknown>>(a: T, b: T): string[] {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const fields: string[] = [];
  for (const k of keys) {
    if (IGNORED_FIELDS.has(k)) continue;
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) fields.push(k);
  }
  return fields.sort();
}

function diffArray<T extends { id: string }>(
  base: readonly T[],
  cur: readonly T[],
): { diff: NodeDiff<T>; changedIds: string[] } {
  const baseById = new Map(base.map((n) => [n.id, n]));
  const curById = new Map(cur.map((n) => [n.id, n]));
  const added: T[] = [];
  const removed: T[] = [];
  const updated: Updated<T>[] = [];
  const changedIds: string[] = [];

  for (const n of cur) {
    const prev = baseById.get(n.id);
    if (!prev) {
      added.push(n);
      changedIds.push(n.id);
    } else {
      const fields = changedFields(
        prev as unknown as Record<string, unknown>,
        n as unknown as Record<string, unknown>,
      );
      if (fields.length) {
        updated.push({ before: prev, after: n, fields });
        changedIds.push(n.id);
      }
    }
  }
  for (const n of base) {
    if (!curById.has(n.id)) {
      removed.push(n);
      changedIds.push(n.id);
    }
  }
  return { diff: { added, removed, updated }, changedIds };
}

export function diff(base: WorkingSet, cur: WorkingSet): Diff {
  const t = diffArray(base.tokens, cur.tokens);
  const c = diffArray(base.components, cur.components);
  const p = diffArray(base.patterns, cur.patterns);
  const d = diffArray(base.docs, cur.docs);
  const isEmpty =
    t.changedIds.length === 0 &&
    c.changedIds.length === 0 &&
    p.changedIds.length === 0 &&
    d.changedIds.length === 0;
  return {
    tokens: t.diff,
    components: c.diff,
    patterns: p.diff,
    docs: d.diff,
    changedIds: {
      tokens: t.changedIds,
      components: c.changedIds,
      patterns: p.changedIds,
      docs: d.changedIds,
    },
    isEmpty,
  };
}

/** Total number of changed nodes across all kinds. */
export function totalChanges(d: Diff): number {
  return (
    d.changedIds.tokens.length +
    d.changedIds.components.length +
    d.changedIds.patterns.length +
    d.changedIds.docs.length
  );
}

/**
 * Nodes impacted by a diff: the changed nodes plus the transitive blast radius of each,
 * computed against the current graph. Grouped by kind (tokens/components/patterns).
 */
export function computeAffected(
  source: GraphSource,
  d: Diff,
): { tokens: string[]; components: string[]; patterns: string[] } {
  const changed = [
    ...d.changedIds.tokens,
    ...d.changedIds.components,
    ...d.changedIds.patterns,
    ...d.changedIds.docs,
  ];
  const impacted = new Set<string>(changed);
  for (const id of changed) {
    for (const ref of getBlastRadius(source, id)) impacted.add(ref.id);
  }

  const tokenIds = new Set(source.tokens.map((n) => n.id));
  const componentIds = new Set(source.components.map((n) => n.id));
  const patternIds = new Set(source.patterns.map((n) => n.id));

  const group = (ids: Set<string>, member: Set<string>) =>
    [...ids].filter((id) => member.has(id)).sort();

  return {
    tokens: group(impacted, tokenIds),
    components: group(impacted, componentIds),
    patterns: group(impacted, patternIds),
  };
}

/** Flatten a diff into Change records for a commit. */
export function changeRecords(d: Diff): Change[] {
  const records: Change[] = [];
  const push = <T extends { id: string }>(kind: Change["kind"], nd: NodeDiff<T>) => {
    for (const n of nd.added)
      records.push({ op: "add", kind, id: n.id, after: n as never });
    for (const u of nd.updated)
      records.push({ op: "update", kind, id: u.after.id, before: u.before as never, after: u.after as never });
    for (const n of nd.removed)
      records.push({ op: "remove", kind, id: n.id, before: n as never });
  };
  push("token", d.tokens);
  push("component", d.components);
  push("pattern", d.patterns);
  push("doc", d.docs);
  return records;
}

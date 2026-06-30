import type { DesignSystem } from "@yahoda/core";

/** The node arrays needed to diff — satisfied by both DesignSystem and a Snapshot. */
type WorkingSet = Pick<DesignSystem, "tokens" | "components" | "patterns" | "docs">;

export interface ChangeCounts {
  added: number;
  updated: number;
  removed: number;
  total: number;
}

interface HasId {
  id: string;
}

function diffArray(base: readonly HasId[], cur: readonly HasId[]) {
  const baseById = new Map(base.map((n) => [n.id, n]));
  const curById = new Map(cur.map((n) => [n.id, n]));
  let added = 0;
  let updated = 0;
  let removed = 0;
  for (const n of cur) {
    const prev = baseById.get(n.id);
    if (!prev) added++;
    else if (JSON.stringify(prev) !== JSON.stringify(n)) updated++;
  }
  for (const n of base) if (!curById.has(n.id)) removed++;
  return { added, updated, removed };
}

/**
 * Lightweight node-level change count between the baseline and the working set.
 * The full structured diff (field-level, for the publish summary) lands in Phase 6.
 */
export function countChanges(baseline: WorkingSet, ds: WorkingSet): ChangeCounts {
  const parts = [
    diffArray(baseline.tokens, ds.tokens),
    diffArray(baseline.components, ds.components),
    diffArray(baseline.patterns, ds.patterns),
    diffArray(baseline.docs, ds.docs),
  ];
  const added = parts.reduce((a, p) => a + p.added, 0);
  const updated = parts.reduce((a, p) => a + p.updated, 0);
  const removed = parts.reduce((a, p) => a + p.removed, 0);
  return { added, updated, removed, total: added + updated + removed };
}

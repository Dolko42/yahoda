import type { DesignSystem, NodeKind, Pattern, PatternNodeShape } from "../schema/index.js";
import { isRefValue } from "../schema/index.js";

/**
 * Dependency graph derived from references in the model. Reverse dependencies and
 * blast radius are COMPUTED here, never stored. Node ids are globally unique
 * (invariant #1), so a single id keyspace is safe.
 */

/** The node arrays the graph needs — satisfied by both DesignSystem and Snapshot. */
export type GraphSource = Pick<
  DesignSystem,
  "tokens" | "components" | "patterns" | "docs"
>;

export interface NodeRef {
  kind: NodeKind;
  id: string;
}

export interface DependencyIndex {
  /** node id -> kind */
  kindOf: Map<string, NodeKind>;
  /** node id -> ids it depends on (uses) */
  uses: Map<string, Set<string>>;
  /** node id -> ids that depend on it (used by) */
  usedBy: Map<string, Set<string>>;
}

function add(map: Map<string, Set<string>>, from: string, to: string): void {
  (map.get(from) ?? map.set(from, new Set()).get(from)!).add(to);
}

export function buildDependencyIndex(ds: GraphSource): DependencyIndex {
  const kindOf = new Map<string, NodeKind>();
  const uses = new Map<string, Set<string>>();
  const usedBy = new Map<string, Set<string>>();

  for (const t of ds.tokens) kindOf.set(t.id, "token");
  for (const c of ds.components) kindOf.set(c.id, "component");
  for (const p of ds.patterns) kindOf.set(p.id, "pattern");
  for (const d of ds.docs) kindOf.set(d.id, "doc");

  const edge = (from: string, to: string) => {
    // only record edges to nodes that exist; broken refs are a validation concern
    if (!kindOf.has(to)) return;
    add(uses, from, to);
    add(usedBy, to, from);
  };

  for (const t of ds.tokens) {
    if (isRefValue(t.value)) edge(t.id, t.value.$ref);
    // typography composites reference other tokens from inside the value:
    // the parent style (extends), the font family, and the font size
    if ("typography" in t.value) {
      const ty = t.value.typography;
      if (ty.extends) edge(t.id, ty.extends.$ref);
      if (ty.fontFamily && isRefValue(ty.fontFamily)) edge(t.id, ty.fontFamily.$ref);
      if (ty.fontSize && isRefValue(ty.fontSize)) edge(t.id, ty.fontSize.$ref);
    }
  }

  for (const c of ds.components) {
    for (const b of c.bindings) edge(c.id, b.tokenId);
    for (const rule of c.accessibility.contrast) {
      edge(c.id, rule.foregroundTokenId);
      edge(c.id, rule.backgroundTokenId);
    }
    for (const id of c.aiRules.linkedTokens ?? []) edge(c.id, id);
    for (const id of c.aiRules.linkedComponents ?? []) edge(c.id, id);
  }

  const walk = (p: Pattern, node: PatternNodeShape) => {
    if (node.componentId) edge(p.id, node.componentId);
    if (node.layout?.gap) edge(p.id, node.layout.gap);
    for (const child of node.children ?? []) walk(p, child);
  };
  for (const p of ds.patterns) {
    for (const node of p.composition) walk(p, node);
    for (const id of p.aiRules.linkedComponents ?? []) edge(p.id, id);
  }

  for (const d of ds.docs) {
    if (d.target?.id) edge(d.id, d.target.id);
  }

  return { kindOf, uses, usedBy };
}

const toRefs = (index: DependencyIndex, ids: Iterable<string>): NodeRef[] =>
  [...ids]
    .map((id) => ({ kind: index.kindOf.get(id)!, id }))
    .sort((a, b) => a.id.localeCompare(b.id));

/** Direct dependencies of a node (what it uses). */
export function getDependencies(ds: GraphSource, nodeId: string): NodeRef[] {
  const index = buildDependencyIndex(ds);
  return toRefs(index, index.uses.get(nodeId) ?? []);
}

/** Direct reverse dependencies of a node (what uses it). */
export function getDependents(ds: GraphSource, nodeId: string): NodeRef[] {
  const index = buildDependencyIndex(ds);
  return toRefs(index, index.usedBy.get(nodeId) ?? []);
}

/**
 * Blast radius: the transitive closure of everything that (directly or indirectly)
 * depends on the given node. This is what would be impacted by changing/deleting it.
 */
export function getBlastRadius(ds: GraphSource, nodeId: string): NodeRef[] {
  const index = buildDependencyIndex(ds);
  const impacted = new Set<string>();
  const queue: string[] = [...(index.usedBy.get(nodeId) ?? [])];
  while (queue.length) {
    const id = queue.shift()!;
    if (impacted.has(id)) continue;
    impacted.add(id);
    for (const dep of index.usedBy.get(id) ?? []) if (!impacted.has(dep)) queue.push(dep);
  }
  return toRefs(index, impacted);
}

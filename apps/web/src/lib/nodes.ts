import type {
  Component,
  DesignSystem,
  DocNode,
  NodeKind,
  Pattern,
  Token,
} from "@yahoda/core";
import type { Selection } from "@/store/workspace";

export const findToken = (ds: DesignSystem, id: string): Token | undefined =>
  ds.tokens.find((t) => t.id === id);
export const findComponent = (ds: DesignSystem, id: string): Component | undefined =>
  ds.components.find((c) => c.id === id);
export const findPattern = (ds: DesignSystem, id: string): Pattern | undefined =>
  ds.patterns.find((p) => p.id === id);
export const findDoc = (ds: DesignSystem, id: string): DocNode | undefined =>
  ds.docs.find((d) => d.id === id);

/** Human label for any node id (used by dependency lists, breadcrumbs, etc.). */
export function labelFor(ds: DesignSystem, kind: NodeKind, id: string): string {
  switch (kind) {
    case "token":
      return findToken(ds, id)?.name ?? id;
    case "component":
      return findComponent(ds, id)?.name ?? id;
    case "pattern":
      return findPattern(ds, id)?.name ?? id;
    case "doc":
      return findDoc(ds, id)?.title ?? id;
  }
}

export type ResolvedNode =
  | { kind: "token"; node: Token }
  | { kind: "component"; node: Component }
  | { kind: "pattern"; node: Pattern }
  | { kind: "doc"; node: DocNode };

/** Resolve the current selection to a concrete node (or undefined if it's gone). */
export function resolveSelection(
  ds: DesignSystem,
  selection: Selection | null,
): ResolvedNode | undefined {
  if (!selection) return undefined;
  switch (selection.kind) {
    case "token": {
      const node = findToken(ds, selection.id);
      return node ? { kind: "token", node } : undefined;
    }
    case "component": {
      const node = findComponent(ds, selection.id);
      return node ? { kind: "component", node } : undefined;
    }
    case "pattern": {
      const node = findPattern(ds, selection.id);
      return node ? { kind: "pattern", node } : undefined;
    }
    case "doc": {
      const node = findDoc(ds, selection.id);
      return node ? { kind: "doc", node } : undefined;
    }
  }
}

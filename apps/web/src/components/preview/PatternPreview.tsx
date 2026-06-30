"use client";

import type { CSSProperties } from "react";
import {
  type DesignSystem,
  type Pattern,
  type PatternNodeShape,
  resolveTokenValue,
} from "@yahoda/core";
import { findComponent } from "@/lib/nodes";
import { ComponentElement } from "./ComponentElement";

function gapPx(ds: DesignSystem, tokenId: string | undefined): string | undefined {
  if (!tokenId) return undefined;
  const r = resolveTokenValue(ds, tokenId);
  if (r.ok && "dimension" in r.value) return `${r.value.dimension}${r.value.unit}`;
  return undefined;
}

function PatternNodeView({ ds, node }: { ds: DesignSystem; node: PatternNodeShape }) {
  const component = node.componentId ? findComponent(ds, node.componentId) : undefined;

  const children = node.children ?? [];
  const layoutStyle: CSSProperties = {
    display: "flex",
    flexDirection: node.layout?.direction === "row" ? "row" : "column",
    gap: gapPx(ds, node.layout?.gap) ?? "12px",
    alignItems: node.layout?.align ?? "stretch",
  };

  return (
    <div style={children.length > 0 ? layoutStyle : undefined}>
      {component && <ComponentElement ds={ds} component={component} />}
      {children.map((child) => (
        <PatternNodeView key={child.id} ds={ds} node={child} />
      ))}
    </div>
  );
}

export function PatternPreview({ ds, pattern }: { ds: DesignSystem; pattern: Pattern }) {
  return (
    <div className="ds-scope mx-auto max-w-md rounded-xl bg-white p-8 shadow-app-1">
      {pattern.composition.map((node) => (
        <PatternNodeView key={node.id} ds={ds} node={node} />
      ))}
    </div>
  );
}

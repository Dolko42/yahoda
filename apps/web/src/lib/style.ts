import type { CSSProperties } from "react";
import {
  type Component,
  type DesignSystem,
  type ResolveScope,
  type TokenValue,
  resolveComponent,
} from "@yahoda/core";

const dimToCss = (v: TokenValue): string | null =>
  "dimension" in v ? `${v.dimension}${v.unit}` : null;
const colorToCss = (v: TokenValue): string | null => ("color" in v ? v.color : null);

function shadowToCss(v: TokenValue): string | null {
  if (!("shadow" in v)) return null;
  return v.shadow
    .map((l) => {
      const px = (d: { dimension: number; unit: string }) => `${d.dimension}${d.unit}`;
      const color = "color" in l.color ? l.color.color : "rgba(0,0,0,0.1)";
      return `${l.inset ? "inset " : ""}${px(l.x)} ${px(l.y)} ${px(l.blur)} ${px(l.spread)} ${color}`;
    })
    .join(", ");
}

export interface ComponentStyle {
  style: CSSProperties;
  unresolved: string[];
}

/** Translate a component's resolved token bindings into inline CSS for previewing. */
export function componentStyle(
  ds: DesignSystem,
  component: Component,
  scope: ResolveScope = {},
): ComponentStyle {
  const style: CSSProperties = {};
  const unresolved: string[] = [];

  for (const b of resolveComponent(ds, component, scope)) {
    if (!b.resolved.ok) {
      unresolved.push(b.property);
      continue;
    }
    const v = b.resolved.value;
    switch (b.property) {
      case "background":
        if (colorToCss(v)) style.backgroundColor = colorToCss(v)!;
        break;
      case "color":
        if (colorToCss(v)) style.color = colorToCss(v)!;
        break;
      case "borderColor":
        if (colorToCss(v)) {
          style.borderColor = colorToCss(v)!;
          style.borderStyle = "solid";
          style.borderWidth = style.borderWidth ?? 1;
        }
        break;
      case "radius":
      case "borderRadius":
        if (dimToCss(v)) style.borderRadius = dimToCss(v)!;
        break;
      case "padding":
        if (dimToCss(v)) style.padding = dimToCss(v)!;
        break;
      case "paddingX":
        if (dimToCss(v)) {
          style.paddingLeft = dimToCss(v)!;
          style.paddingRight = dimToCss(v)!;
        }
        break;
      case "paddingY":
        if (dimToCss(v)) {
          style.paddingTop = dimToCss(v)!;
          style.paddingBottom = dimToCss(v)!;
        }
        break;
      case "gap":
        if (dimToCss(v)) style.gap = dimToCss(v)!;
        break;
      case "shadow":
      case "elevation":
        if (shadowToCss(v)) style.boxShadow = shadowToCss(v)!;
        break;
      case "font":
      case "typography":
        if ("typography" in v) {
          const t = v.typography;
          style.fontFamily = t.fontFamily;
          if ("dimension" in t.fontSize)
            style.fontSize = `${t.fontSize.dimension}${t.fontSize.unit}`;
          style.lineHeight = t.lineHeight;
          style.fontWeight = t.fontWeight;
        }
        break;
      default:
        break;
    }
  }

  return { style, unresolved };
}

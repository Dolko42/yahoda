import type { CSSProperties } from "react";
import {
  type Component,
  type DesignSystem,
  type ResolveScope,
  type TokenValue,
  resolveComponent,
  resolveTypographyToken,
} from "@yahoda/core";

/** Resolved typography token → inline CSS (defaults like "normal"/"none" are omitted). */
export function typographyCss(ds: DesignSystem, tokenId: string): CSSProperties {
  const { style: s } = resolveTypographyToken(ds, tokenId);
  const css: CSSProperties = {
    fontFamily: s.fontFamily,
    fontSize: s.fontSize,
    fontWeight: s.fontWeight,
    lineHeight: s.lineHeight,
  };
  if (s.letterSpacing !== "normal") css.letterSpacing = s.letterSpacing;
  if (s.textTransform !== "none") css.textTransform = s.textTransform;
  if (s.fontStyle !== "normal") css.fontStyle = s.fontStyle;
  return css;
}

/** The typography CSS a component binds to a given property (e.g. titleTypography), or null. */
export function slotTypography(
  ds: DesignSystem,
  component: Component,
  property: string,
  scope: ResolveScope = {},
): CSSProperties | null {
  const binding = resolveComponent(ds, component, scope).find((b) => b.property === property);
  if (!binding || !binding.resolved.ok) return null;
  return typographyCss(ds, binding.tokenId);
}

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
        if ("typography" in v) Object.assign(style, typographyCss(ds, b.tokenId));
        break;
      default:
        break;
    }
  }

  return { style, unresolved };
}
